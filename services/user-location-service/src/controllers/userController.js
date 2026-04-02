'use strict';

const pool = require('../config/db');

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT User_ID, Name, Email, Auth_Provider, Join_Date, Status FROM Users WHERE User_ID = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('getUserById error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id, 10) !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { name, device_token } = req.body;
    const result = await pool.query(
      `UPDATE Users SET
        Name = COALESCE($1, Name),
        Device_Token = COALESCE($2, Device_Token)
       WHERE User_ID = $3
       RETURNING User_ID, Name, Email, Device_Token, Join_Date, Status`,
      [name, device_token, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getUserById, updateUser };
