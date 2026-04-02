'use strict';

const pool = require('../config/db');

const getReputation = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM User_Reputation WHERE User_ID = $1', [userId]);
    if (result.rows.length === 0) {
      return res.json({
        reputation: {
          user_id: parseInt(userId, 10),
          shares_cnt: 0,
          claims_cnt: 0,
          failed_posts_cnt: 0,
          avg_response_mins: 0,
          rating: 5.0,
          total_points: 0,
        },
      });
    }
    return res.json({ reputation: result.rows[0] });
  } catch (err) {
    console.error('getReputation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = await pool.query(
      'SELECT * FROM User_Reputation ORDER BY Total_Points DESC LIMIT $1',
      [limit]
    );
    return res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('getLeaderboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getReputation, getLeaderboard };
