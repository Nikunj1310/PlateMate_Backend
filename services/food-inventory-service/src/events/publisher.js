'use strict';

const eventBus = require('../../../../shared/event-bus');

const publishEvent = async (routingKey, data) => {
  try {
    await eventBus.publishEvent(routingKey, data);
  } catch (err) {
    console.error('[Publisher] Failed to publish event:', err.message);
  }
};

module.exports = { publishEvent };
