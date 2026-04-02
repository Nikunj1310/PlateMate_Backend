'use strict';

const eventBus = require('../../../../shared/event-bus');
const EVENTS = require('../../../../shared/event-bus/events');
const pool = require('../config/db');
const { publishEvent } = require('./publisher');

const initSubscribers = async () => {
  await eventBus.subscribeToEvent(EVENTS.POST_EXPIRED, async (data) => {
    try {
      const result = await pool.query(
        "UPDATE Claims SET Status = 'Rejected', Responded_At = NOW() WHERE Post_ID = $1 AND Status = 'Pending' RETURNING *",
        [data.postId]
      );
      for (const claim of result.rows) {
        await publishEvent(EVENTS.CLAIM_REJECTED, {
          claimId: claim.claim_id,
          postId: claim.post_id,
          claimerId: claim.claimer_id,
          donorId: claim.donor_id,
        });
      }
      console.log(`[Subscriber] PostExpired: rejected ${result.rows.length} pending claims for post ${data.postId}`);
    } catch (err) {
      console.error('[Subscriber] PostExpired error:', err.message);
    }
  });

  console.log('[Subscriber] claim-service subscribers initialized');
};

module.exports = { initSubscribers };
