'use strict';

const pool = require('../config/db');
const { publishEvent } = require('../events/publisher');
const EVENTS = require('../../../../shared/event-bus/events');

const getClaims = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM Claims WHERE Claimer_ID = $1 OR Donor_ID = $1 ORDER BY Requested_At DESC',
      [req.user.id]
    );
    return res.json({ claims: result.rows });
  } catch (err) {
    console.error('getClaims error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const createClaim = async (req, res) => {
  try {
    const { post_id, donor_id } = req.body;
    if (!post_id || !donor_id) return res.status(400).json({ error: 'post_id and donor_id required' });
    if (parseInt(donor_id, 10) === req.user.id) return res.status(400).json({ error: 'Cannot claim your own post' });
    const result = await pool.query(
      `INSERT INTO Claims (Post_ID, Claimer_ID, Donor_ID) VALUES ($1, $2, $3) RETURNING *`,
      [post_id, req.user.id, donor_id]
    );
    const claim = result.rows[0];
    await publishEvent(EVENTS.CLAIM_REQUESTED, {
      claimId: claim.claim_id,
      postId: claim.post_id,
      claimerId: claim.claimer_id,
      donorId: claim.donor_id,
    });
    return res.status(201).json({ claim });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Claim already exists for this post' });
    console.error('createClaim error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getClaim = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Claims WHERE Claim_ID = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });
    const claim = result.rows[0];
    if (claim.claimer_id !== req.user.id && claim.donor_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ claim });
  } catch (err) {
    console.error('getClaim error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const approveClaim = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    const check = await client.query('SELECT * FROM Claims WHERE Claim_ID = $1', [id]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Claim not found' });
    }
    const claim = check.rows[0];
    if (claim.donor_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (claim.status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Claim is not pending' });
    }
    // Acquire row-level locks on all claims for this post to prevent race conditions
    await client.query('SELECT * FROM Claims WHERE Post_ID = $1 FOR UPDATE', [claim.post_id]);
    await client.query(
      "UPDATE Claims SET Status = 'Approved', Responded_At = NOW() WHERE Claim_ID = $1",
      [id]
    );
    await client.query(
      "UPDATE Claims SET Status = 'Rejected', Responded_At = NOW() WHERE Post_ID = $1 AND Claim_ID != $2 AND Status = 'Pending'",
      [claim.post_id, id]
    );
    await client.query('COMMIT');
    await publishEvent(EVENTS.CLAIM_APPROVED, {
      claimId: claim.claim_id,
      postId: claim.post_id,
      claimerId: claim.claimer_id,
      donorId: claim.donor_id,
    });
    return res.json({ message: 'Claim approved' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('approveClaim error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

const rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT * FROM Claims WHERE Claim_ID = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });
    const claim = check.rows[0];
    if (claim.donor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (claim.status !== 'Pending') return res.status(400).json({ error: 'Claim is not pending' });
    await pool.query(
      "UPDATE Claims SET Status = 'Rejected', Responded_At = NOW() WHERE Claim_ID = $1",
      [id]
    );
    await publishEvent(EVENTS.CLAIM_REJECTED, {
      claimId: claim.claim_id,
      postId: claim.post_id,
      claimerId: claim.claimer_id,
      donorId: claim.donor_id,
    });
    return res.json({ message: 'Claim rejected' });
  } catch (err) {
    console.error('rejectClaim error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getClaimsForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await pool.query(
      'SELECT * FROM Claims WHERE Post_ID = $1 AND Donor_ID = $2 ORDER BY Requested_At DESC',
      [postId, req.user.id]
    );
    return res.json({ claims: result.rows });
  } catch (err) {
    console.error('getClaimsForPost error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getClaims, createClaim, getClaim, approveClaim, rejectClaim, getClaimsForPost };
