'use strict';

const pool = require('../config/db');

const recalculatePoints = async (userId) => {
  const rep = await pool.query('SELECT * FROM User_Reputation WHERE User_ID = $1', [userId]);
  if (rep.rows.length === 0) return;
  const r = rep.rows[0];
  const base = (r.shares_cnt * 50) + (r.claims_cnt * 10) + (parseFloat(r.rating) * 20);
  const penalty = r.failed_posts_cnt * 100;
  const speedBonus = r.avg_response_mins <= 30 ? 30 : r.avg_response_mins <= 120 ? 10 : 0;
  const total = Math.round(base - penalty + speedBonus);
  await pool.query('UPDATE User_Reputation SET Total_Points = $1 WHERE User_ID = $2', [total, userId]);
};

const submitReview = async (req, res) => {
  try {
    const { reviewed_user_id, claim_id, rating_score, comment } = req.body;
    if (!reviewed_user_id || !claim_id || !rating_score) {
      return res.status(400).json({ error: 'reviewed_user_id, claim_id, rating_score required' });
    }
    if (rating_score < 1 || rating_score > 5) {
      return res.status(400).json({ error: 'rating_score must be 1-5' });
    }
    const result = await pool.query(
      `INSERT INTO Reviews (Reviewer_ID, Reviewed_User_ID, Claim_ID, Rating_Score, Comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, reviewed_user_id, claim_id, rating_score, comment || null]
    );
    const avgResult = await pool.query(
      'SELECT AVG(Rating_Score)::DECIMAL(3,2) as avg_rating FROM Reviews WHERE Reviewed_User_ID = $1',
      [reviewed_user_id]
    );
    const avgRating = avgResult.rows[0].avg_rating || 5.0;
    await pool.query(
      'UPDATE User_Reputation SET Rating = $1 WHERE User_ID = $2',
      [avgRating, reviewed_user_id]
    );
    await recalculatePoints(reviewed_user_id);
    return res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Review already submitted for this claim' });
    console.error('submitReview error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getReviewsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM Reviews WHERE Reviewed_User_ID = $1 ORDER BY Created_At DESC',
      [userId]
    );
    return res.json({ reviews: result.rows });
  } catch (err) {
    console.error('getReviewsForUser error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { submitReview, getReviewsForUser, recalculatePoints };
