'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { publishEvent } = require('../events/publisher');
const EVENTS = require('../../../../shared/event-bus/events');

const SALT_ROUNDS = 10;

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const existing = await pool.query('SELECT User_ID FROM Users WHERE Email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO Users (Name, Email, Password_Hash) VALUES ($1, $2, $3) RETURNING User_ID, Name, Email, Join_Date, Status`,
      [name, email, password_hash]
    );
    const user = result.rows[0];
    await publishEvent(EVENTS.USER_REGISTERED, { userId: user.user_id, name: user.name, email: user.email });
    return res.status(201).json({ user });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const result = await pool.query('SELECT * FROM Users WHERE Email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    if (user.status === 'Banned') {
      return res.status(403).json({ error: 'Account is banned' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const payload = { id: user.user_id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    await pool.query('UPDATE Users SET Refresh_Token = $1 WHERE User_ID = $2', [refreshToken, user.user_id]);
    return res.json({ accessToken, refreshToken, userId: user.user_id });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
    const result = await pool.query('SELECT User_ID, Email, Refresh_Token FROM Users WHERE User_ID = $1', [decoded.id]);
    if (result.rows.length === 0 || result.rows[0].refresh_token !== refreshToken) {
      return res.status(403).json({ error: 'Refresh token mismatch' });
    }
    const user = result.rows[0];
    const accessToken = generateAccessToken({ id: user.user_id, email: user.email });
    return res.json({ accessToken });
  } catch (err) {
    console.error('refresh error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    await pool.query('UPDATE Users SET Refresh_Token = NULL WHERE User_ID = $1', [req.user.id]);
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('logout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT User_ID, Name, Email, Auth_Provider, Device_Token, Join_Date, Status FROM Users WHERE User_ID = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const result = await pool.query('SELECT User_ID FROM Users WHERE Email = $1', [email]);
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }
    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      'UPDATE Users SET Reset_Token = $1, Reset_Token_Expiry = $2 WHERE User_ID = $3',
      [tokenHash, expiry, user.user_id]
    );
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset token for ${email}: ${token}`);
    }
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword required' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      'SELECT User_ID FROM Users WHERE Reset_Token = $1 AND Reset_Token_Expiry > NOW()',
      [tokenHash]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset token' });
    const user = result.rows[0];
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query(
      'UPDATE Users SET Password_Hash = $1, Reset_Token = NULL, Reset_Token_Expiry = NULL WHERE User_ID = $2',
      [password_hash, user.user_id]
    );
    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { register, login, refresh, logout, getMe, forgotPassword, resetPassword };
