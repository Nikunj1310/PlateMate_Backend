'use strict';

const eventBus = require('../../../../shared/event-bus');
const EVENTS = require('../../../../shared/event-bus/events');
const pool = require('../config/db');
const { recalculatePoints } = require('../controllers/reviewController');

const upsertReputation = async (userId) => {
  await pool.query(
    `INSERT INTO User_Reputation (User_ID) VALUES ($1) ON CONFLICT (User_ID) DO NOTHING`,
    [userId]
  );
};

const initSubscribers = async () => {
  await eventBus.subscribeToEvent(EVENTS.POST_CREATED, async (data) => {
    try {
      await upsertReputation(data.donorId);
      console.log(`[Subscriber] PostCreated: upserted reputation for donor ${data.donorId}`);
    } catch (err) {
      console.error('[Subscriber] PostCreated error:', err.message);
    }
  });

  await eventBus.subscribeToEvent(EVENTS.DONATION_COMPLETED, async (data) => {
    try {
      await upsertReputation(data.donorId);
      await pool.query(
        'UPDATE User_Reputation SET Shares_Cnt = Shares_Cnt + 1 WHERE User_ID = $1',
        [data.donorId]
      );
      await recalculatePoints(data.donorId);
      console.log(`[Subscriber] DonationCompleted: incremented Shares_Cnt for donor ${data.donorId}`);
    } catch (err) {
      console.error('[Subscriber] DonationCompleted error:', err.message);
    }
  });

  await eventBus.subscribeToEvent(EVENTS.CLAIM_APPROVED, async (data) => {
    try {
      await upsertReputation(data.claimerId);
      await pool.query(
        'UPDATE User_Reputation SET Claims_Cnt = Claims_Cnt + 1 WHERE User_ID = $1',
        [data.claimerId]
      );
      await recalculatePoints(data.claimerId);
      console.log(`[Subscriber] ClaimApproved: incremented Claims_Cnt for claimer ${data.claimerId}`);
    } catch (err) {
      console.error('[Subscriber] ClaimApproved error:', err.message);
    }
  });

  await eventBus.subscribeToEvent(EVENTS.POST_FAILED, async (data) => {
    try {
      await upsertReputation(data.donorId);
      await pool.query(
        'UPDATE User_Reputation SET Failed_Posts_Cnt = Failed_Posts_Cnt + 1 WHERE User_ID = $1',
        [data.donorId]
      );
      await recalculatePoints(data.donorId);
      console.log(`[Subscriber] PostFailed: incremented Failed_Posts_Cnt for donor ${data.donorId}`);
    } catch (err) {
      console.error('[Subscriber] PostFailed error:', err.message);
    }
  });

  console.log('[Subscriber] reputation-service subscribers initialized');
};

module.exports = { initSubscribers };
