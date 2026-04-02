'use strict';

const pool = require('../config/db');

const blockUser = async (req, res) => {
  try {
    const { blocked_id } = req.body;
    if (!blocked_id) return res.status(400).json({ error: 'blocked_id required' });
    if (blocked_id === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });
    await pool.query(
      'INSERT INTO Blocks (Blocker_ID, Blocked_ID) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, blocked_id]
    );
    return res.status(201).json({ message: 'User blocked' });
  } catch (err) {
    console.error('blockUser error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { blockedId } = req.params;
    await pool.query(
      'DELETE FROM Blocks WHERE Blocker_ID = $1 AND Blocked_ID = $2',
      [req.user.id, blockedId]
    );
    return res.json({ message: 'User unblocked' });
  } catch (err) {
    console.error('unblockUser error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { blockUser, unblockUser };
