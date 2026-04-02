'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pool = require('./src/config/db');
const eventBus = require('../../shared/event-bus');
const { initSubscribers } = require('./src/events/subscriber');

const messageRoutes = require('./src/routes/messages');

const app = express();
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'messaging-service' }));

const PORT = process.env.PORT || 3005;

const start = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connected to PostgreSQL');
    await eventBus.connect(process.env.RABBITMQ_URL);
    await initSubscribers();
    app.listen(PORT, () => console.log(`[Server] messaging-service listening on port ${PORT}`));
  } catch (err) {
    console.error('[Start] Failed to start service:', err.message);
    process.exit(1);
  }
};

start();
