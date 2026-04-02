'use strict';

const pool = require('../config/db');

const getLocations = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM Locations WHERE User_ID = $1 ORDER BY Is_Active DESC, Loc_ID',
      [req.user.id]
    );
    return res.json({ locations: result.rows });
  } catch (err) {
    console.error('getLocations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const addLocation = async (req, res) => {
  try {
    const { address, latitude, longitude, is_active } = req.body;
    if (!address || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'address, latitude, longitude are required' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (is_active) {
        await client.query('UPDATE Locations SET Is_Active = FALSE WHERE User_ID = $1', [req.user.id]);
      }
      const result = await client.query(
        `INSERT INTO Locations (User_ID, Address, Latitude, Longitude, Is_Active)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.user.id, address, latitude, longitude, is_active || false]
      );
      await client.query('COMMIT');
      return res.status(201).json({ location: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('addLocation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const activateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const check = await client.query('SELECT * FROM Locations WHERE Loc_ID = $1 AND User_ID = $2', [id, req.user.id]);
      if (check.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Location not found' });
      }
      await client.query('UPDATE Locations SET Is_Active = FALSE WHERE User_ID = $1', [req.user.id]);
      const result = await client.query(
        'UPDATE Locations SET Is_Active = TRUE WHERE Loc_ID = $1 RETURNING *',
        [id]
      );
      await client.query('COMMIT');
      return res.json({ location: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('activateLocation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM Locations WHERE Loc_ID = $1 AND User_ID = $2 RETURNING Loc_ID',
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    return res.json({ message: 'Location deleted' });
  } catch (err) {
    console.error('deleteLocation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getLocations, addLocation, activateLocation, deleteLocation };
