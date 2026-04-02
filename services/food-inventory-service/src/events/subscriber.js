'use strict';

const eventBus = require('../../../../shared/event-bus');
const EVENTS = require('../../../../shared/event-bus/events');
const pool = require('../config/db');
const { publishEvent } = require('./publisher');

const initSubscribers = async () => {
  await eventBus.subscribeToEvent(EVENTS.CLAIM_REQUESTED, async (data) => {
    try {
      await pool.query(
        'UPDATE Food_Posts SET Pending_Claims_Cnt = Pending_Claims_Cnt + 1 WHERE Post_ID = $1',
        [data.postId]
      );
      console.log(`[Subscriber] ClaimRequested: incremented Pending_Claims_Cnt for post ${data.postId}`);
    } catch (err) {
      console.error('[Subscriber] ClaimRequested error:', err.message);
    }
  });

  await eventBus.subscribeToEvent(EVENTS.CLAIM_APPROVED, async (data) => {
    try {
      const result = await pool.query(
        `UPDATE Food_Posts
         SET Status = 'Claimed', Pending_Claims_Cnt = GREATEST(0, Pending_Claims_Cnt - 1), Updated_At = NOW()
         WHERE Post_ID = $1 RETURNING *`,
        [data.postId]
      );
      if (result.rows.length > 0) {
        await publishEvent(EVENTS.DONATION_COMPLETED, {
          postId: data.postId,
          donorId: result.rows[0].donor_id,
          claimerId: data.claimerId,
        });
      }
      console.log(`[Subscriber] ClaimApproved: post ${data.postId} set to Claimed`);
    } catch (err) {
      console.error('[Subscriber] ClaimApproved error:', err.message);
    }
  });

  await eventBus.subscribeToEvent(EVENTS.USER_BANNED, async (data) => {
    try {
      await pool.query(
        "UPDATE Food_Posts SET Status = 'Hidden', Updated_At = NOW() WHERE Donor_ID = $1 AND Status = 'Active'",
        [data.userId]
      );
      console.log(`[Subscriber] UserBanned: hidden posts for user ${data.userId}`);
    } catch (err) {
      console.error('[Subscriber] UserBanned error:', err.message);
    }
  });

  console.log('[Subscriber] food-inventory-service subscribers initialized');
};

module.exports = { initSubscribers };
