'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pool = require('./src/config/db');
const eventBus = require('../../shared/event-bus');
const { initSubscribers } = require('./src/events/subscriber');

const postRoutes = require('./src/routes/posts');
const watchlistRoutes = require('./src/routes/watchlists');

const app = express();
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/api/posts', postRoutes);
app.use('/api/watchlists', watchlistRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'food-inventory-service' }));

const PORT = process.env.PORT || 3002;

const start = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connected to PostgreSQL');
    await eventBus.connect(process.env.RABBITMQ_URL);
    await initSubscribers();
    app.listen(PORT, () => console.log(`[Server] food-inventory-service listening on port ${PORT}`));
  } catch (err) {
    console.error('[Start] Failed to start service:', err.message);
    process.exit(1);
  }
};

start();
