'use strict';

const pool = require('../config/db');

const getMessages = async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await pool.query(
      `SELECT * FROM Messages
       WHERE Post_ID = $1 AND (Sender_ID = $2 OR Receiver_ID = $2)
       ORDER BY Sent_At ASC`,
      [postId, req.user.id]
    );
    return res.json({ messages: result.rows });
  } catch (err) {
    console.error('getMessages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { post_id, receiver_id, content, image_url } = req.body;
    if (!post_id || !receiver_id) return res.status(400).json({ error: 'post_id and receiver_id required' });
    if (!content && !image_url) return res.status(400).json({ error: 'content or image_url required' });
    const result = await pool.query(
      `INSERT INTO Messages (Post_ID, Sender_ID, Receiver_ID, Content, Image_URL)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [post_id, req.user.id, receiver_id, content || null, image_url || null]
    );
    return res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const markMessagesRead = async (req, res) => {
  try {
    const { postId } = req.params;
    await pool.query(
      'UPDATE Messages SET Is_Read = TRUE WHERE Post_ID = $1 AND Receiver_ID = $2 AND Is_Read = FALSE',
      [postId, req.user.id]
    );
    return res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('markMessagesRead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getConversations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (Post_ID, CASE WHEN Sender_ID = $1 THEN Receiver_ID ELSE Sender_ID END)
        Post_ID, Sender_ID, Receiver_ID, Content, Image_URL, Sent_At, Is_Read
      FROM Messages
      WHERE Sender_ID = $1 OR Receiver_ID = $1
      ORDER BY Post_ID, CASE WHEN Sender_ID = $1 THEN Receiver_ID ELSE Sender_ID END, Sent_At DESC`,
      [req.user.id]
    );
    return res.json({ conversations: result.rows });
  } catch (err) {
    console.error('getConversations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getMessages, getConversations, sendMessage, markMessagesRead };
