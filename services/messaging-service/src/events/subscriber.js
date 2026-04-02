'use strict';

const eventBus = require('../../../../shared/event-bus');
const EVENTS = require('../../../../shared/event-bus/events');
const pool = require('../config/db');

const initSubscribers = async () => {
  await eventBus.subscribeToEvent(EVENTS.CLAIM_APPROVED, async (data) => {
    try {
      const systemMessage = "Your request was approved! Let's coordinate pickup.";
      await pool.query(
        `INSERT INTO Messages (Post_ID, Sender_ID, Receiver_ID, Content)
         VALUES ($1, $2, $3, $4)`,
        [data.postId, data.donorId, data.claimerId, systemMessage]
      );
      console.log(`[Subscriber] ClaimApproved: inserted system message for post ${data.postId}`);
    } catch (err) {
      console.error('[Subscriber] ClaimApproved error:', err.message);
    }
  });

  console.log('[Subscriber] messaging-service subscribers initialized');
};

module.exports = { initSubscribers };
