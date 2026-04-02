'use strict';

const pool = require('../config/db');
const { publishEvent } = require('../events/publisher');
const EVENTS = require('../../../../shared/event-bus/events');

const checkWatchlists = async (post) => {
  try {
    if (post.pickup_lat == null || post.pickup_lng == null) return;
    const result = await pool.query(
      `SELECT w.* FROM Watchlists w
       WHERE
         (w.Category IS NULL OR LOWER(w.Category) = LOWER($3))
         AND (w.Keyword IS NULL OR LOWER($4) LIKE '%' || LOWER(w.Keyword) || '%')
         AND (6371 * acos(
           LEAST(1.0,
             cos(radians($1::float)) * cos(radians(w.Ref_Latitude::float))
             * cos(radians(w.Ref_Longitude::float) - radians($2::float))
             + sin(radians($1::float)) * sin(radians(w.Ref_Latitude::float))
           )
         )) <= w.Radius_KM`,
      [post.pickup_lat, post.pickup_lng, post.category, post.food_name]
    );
    for (const wl of result.rows) {
      await publishEvent(EVENTS.PUSH_NOTIFICATION_REQUESTED, {
        userId: wl.user_id,
        message: `New food post matching your watchlist: ${post.food_name}`,
        postId: post.post_id,
      });
    }
  } catch (err) {
    console.error('checkWatchlists error:', err.message);
  }
};

const listPosts = async (req, res) => {
  try {
    const { category, keyword, lat, lng, radius } = req.query;
    let query = `SELECT * FROM Food_Posts WHERE Status = 'Active'`;
    const params = [];
    let paramIdx = 1;

    if (category) {
      query += ` AND LOWER(Category) = LOWER($${paramIdx++})`;
      params.push(category);
    }
    if (keyword) {
      query += ` AND (Food_Name ILIKE $${paramIdx} OR Description ILIKE $${paramIdx})`;
      params.push(`%${keyword}%`);
      paramIdx++;
    }
    if (lat && lng && radius) {
      query += ` AND Pickup_Lat IS NOT NULL AND Pickup_Lng IS NOT NULL AND (6371 * acos(LEAST(1.0,
        cos(radians($${paramIdx}::float)) * cos(radians(Pickup_Lat::float))
        * cos(radians(Pickup_Lng::float) - radians($${paramIdx + 1}::float))
        + sin(radians($${paramIdx}::float)) * sin(radians(Pickup_Lat::float))
      ))) <= $${paramIdx + 2}`;
      params.push(parseFloat(lat), parseFloat(lng), parseFloat(radius));
      paramIdx += 3;
    }
    query += ' ORDER BY Created_At DESC';
    const result = await pool.query(query, params);
    return res.json({ posts: result.rows });
  } catch (err) {
    console.error('listPosts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const createPost = async (req, res) => {
  try {
    const {
      pickup_loc_id, food_name, category, tags, image_urls,
      quantity, description, best_before_date, status,
      pickup_lat, pickup_lng
    } = req.body;
    if (!food_name || !category || !quantity || !best_before_date) {
      return res.status(400).json({ error: 'food_name, category, quantity, best_before_date required' });
    }
    const postStatus = status === 'Draft' ? 'Draft' : 'Active';
    const result = await pool.query(
      `INSERT INTO Food_Posts
        (Donor_ID, Pickup_Loc_ID, Food_Name, Category, Tags, Image_URLs, Quantity, Description, Best_Before_Date, Status, Pickup_Lat, Pickup_Lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        req.user.id, pickup_loc_id || null, food_name, category,
        tags || [], image_urls || [], quantity, description || null,
        best_before_date, postStatus, pickup_lat || null, pickup_lng || null
      ]
    );
    const post = result.rows[0];
    if (post.status === 'Active') {
      await publishEvent(EVENTS.POST_CREATED, { postId: post.post_id, donorId: post.donor_id, category: post.category });
      await checkWatchlists(post);
    }
    return res.status(201).json({ post });
  } catch (err) {
    console.error('createPost error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getPost = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Food_Posts WHERE Post_ID = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post: result.rows[0] });
  } catch (err) {
    console.error('getPost error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT Donor_ID FROM Food_Posts WHERE Post_ID = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    if (check.rows[0].donor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { food_name, category, tags, image_urls, quantity, description, best_before_date, pickup_lat, pickup_lng } = req.body;
    const result = await pool.query(
      `UPDATE Food_Posts SET
        Food_Name = COALESCE($1, Food_Name),
        Category = COALESCE($2, Category),
        Tags = COALESCE($3, Tags),
        Image_URLs = COALESCE($4, Image_URLs),
        Quantity = COALESCE($5, Quantity),
        Description = COALESCE($6, Description),
        Best_Before_Date = COALESCE($7, Best_Before_Date),
        Pickup_Lat = COALESCE($8, Pickup_Lat),
        Pickup_Lng = COALESCE($9, Pickup_Lng),
        Updated_At = NOW()
       WHERE Post_ID = $10 RETURNING *`,
      [food_name, category, tags, image_urls, quantity, description, best_before_date, pickup_lat, pickup_lng, id]
    );
    return res.json({ post: result.rows[0] });
  } catch (err) {
    console.error('updatePost error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT Donor_ID FROM Food_Posts WHERE Post_ID = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    if (check.rows[0].donor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await pool.query("UPDATE Food_Posts SET Status = 'Deleted', Updated_At = NOW() WHERE Post_ID = $1", [id]);
    return res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('deletePost error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const publishPost = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT * FROM Food_Posts WHERE Post_ID = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    const post = check.rows[0];
    if (post.donor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (post.status !== 'Draft') return res.status(400).json({ error: 'Post is not a draft' });
    const result = await pool.query(
      "UPDATE Food_Posts SET Status = 'Active', Updated_At = NOW() WHERE Post_ID = $1 RETURNING *",
      [id]
    );
    const updatedPost = result.rows[0];
    await publishEvent(EVENTS.POST_CREATED, { postId: updatedPost.post_id, donorId: updatedPost.donor_id, category: updatedPost.category });
    await checkWatchlists(updatedPost);
    return res.json({ post: updatedPost });
  } catch (err) {
    console.error('publishPost error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { listPosts, createPost, getPost, updatePost, deletePost, publishPost };
