'use strict';

const pool = require('../config/db');

const getWatchlists = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Watchlists WHERE User_ID = $1', [req.user.id]);
    return res.json({ watchlists: result.rows });
  } catch (err) {
    console.error('getWatchlists error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const createWatchlist = async (req, res) => {
  try {
    const { keyword, category, radius_km, ref_latitude, ref_longitude } = req.body;
    if (ref_latitude == null || ref_longitude == null) {
      return res.status(400).json({ error: 'ref_latitude and ref_longitude required' });
    }
    const result = await pool.query(
      `INSERT INTO Watchlists (User_ID, Keyword, Category, Radius_KM, Ref_Latitude, Ref_Longitude)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, keyword || null, category || null, radius_km || 5, ref_latitude, ref_longitude]
    );
    return res.status(201).json({ watchlist: result.rows[0] });
  } catch (err) {
    console.error('createWatchlist error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteWatchlist = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM Watchlists WHERE Watch_ID = $1 AND User_ID = $2 RETURNING Watch_ID',
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Watchlist not found' });
    return res.json({ message: 'Watchlist deleted' });
  } catch (err) {
    console.error('deleteWatchlist error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getWatchlists, createWatchlist, deleteWatchlist };
