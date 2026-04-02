'use strict';

const pool = require('../config/db');

const createReport = async (req, res) => {
  try {
    const { reported_user_id, reported_post_id, reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason is required' });
    if (!reported_user_id && !reported_post_id) {
      return res.status(400).json({ error: 'reported_user_id or reported_post_id required' });
    }
    const result = await pool.query(
      `INSERT INTO Reports (Reporter_ID, Reported_User_ID, Reported_Post_ID, Reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, reported_user_id || null, reported_post_id || null, reason]
    );
    return res.status(201).json({ report: result.rows[0] });
  } catch (err) {
    console.error('createReport error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createReport };
