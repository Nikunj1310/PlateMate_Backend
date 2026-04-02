'use strict';

const amqp = require('amqplib');

const EXCHANGE = 'platemate_events';
const EXCHANGE_TYPE = 'topic';

let connection = null;
let channel = null;

async function connect(url) {
  const RABBITMQ_URL = url || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  let retries = 10;
  while (retries > 0) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });
      console.log('[EventBus] Connected to RabbitMQ');

      connection.on('close', () => {
        console.error('[EventBus] Connection closed, reconnecting...');
        setTimeout(() => connect(RABBITMQ_URL), 5000);
      });
      connection.on('error', (err) => {
        console.error('[EventBus] Connection error:', err.message);
      });

      return channel;
    } catch (err) {
      retries -= 1;
      console.error(`[EventBus] Failed to connect (${retries} retries left): ${err.message}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw new Error('[EventBus] Could not connect to RabbitMQ after multiple retries');
}

async function publishEvent(routingKey, data) {
  if (!channel) throw new Error('[EventBus] Not connected. Call connect() first.');
  const payload = Buffer.from(JSON.stringify(data));
  channel.publish(EXCHANGE, routingKey, payload, { persistent: true });
  console.log(`[EventBus] Published ${routingKey}`);
}

async function subscribeToEvent(routingKey, handler) {
  if (!channel) throw new Error('[EventBus] Not connected. Call connect() first.');
  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE, routingKey);
  channel.consume(q.queue, async (msg) => {
    if (msg !== null) {
      try {
        const data = JSON.parse(msg.content.toString());
        await handler(data);
        channel.ack(msg);
      } catch (err) {
        console.error(`[EventBus] Error handling ${routingKey}:`, err.message);
        channel.nack(msg, false, false);
      }
    }
  });
  console.log(`[EventBus] Subscribed to ${routingKey}`);
}

module.exports = { connect, publishEvent, subscribeToEvent };
