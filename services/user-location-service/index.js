'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pool = require('./src/config/db');
const eventBus = require('../../shared/event-bus');
const { initSubscribers } = require('./src/events/subscriber');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const locationRoutes = require('./src/routes/locations');
const blockRoutes = require('./src/routes/blocks');
const reportRoutes = require('./src/routes/reports');

const app = express();
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-location-service' }));

const PORT = process.env.PORT || 3001;

const start = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connected to PostgreSQL');
    await eventBus.connect(process.env.RABBITMQ_URL);
    await initSubscribers();
    app.listen(PORT, () => console.log(`[Server] user-location-service listening on port ${PORT}`));
  } catch (err) {
    console.error('[Start] Failed to start service:', err.message);
    process.exit(1);
  }
};

start();
