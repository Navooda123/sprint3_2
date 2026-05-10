const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { v4: uuidv4 } = require('uuid');

router.use(auth);
router.use(roleCheck(['transporter']));

const logActivity = async (userId, description) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (id, user_id, role, action_description) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, 'transporter', description]
    );
  } catch (e) {}
};

// GET /journeys — all journeys for this transporter
router.get('/journeys', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM journeys WHERE transporter_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /journeys/active
router.get('/journeys/active', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM journeys WHERE transporter_id=? AND status IN ('assigned','departed','in_transit','arrived') LIMIT 1",
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /journeys/:id/depart
router.put('/journeys/:id/depart', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "UPDATE journeys SET status='departed', departed_at=NOW() WHERE id=? AND transporter_id=?",
      [id, req.user.id]
    );
    const journey = (await db.query('SELECT * FROM journeys WHERE id=?', [id])).rows[0];
    
    // Notify admin and destination outlet
    req.io.emit('journey:departed', {
      journeyId: id,
      transporter: req.user.name,
      from: journey.from_location,
      to: journey.to_location
    });
    if (journey.outlet_id) {
      req.io.to(`user_${journey.outlet_id}`).emit('journey:departed', {
        journeyId: id, transporter: req.user.name, from: journey.from_location
      });
    }

    await logActivity(req.user.id, `Departed from ${journey.from_location} heading to ${journey.to_location}`);
    res.json(journey);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /journeys/:id/gps
router.post('/journeys/:id/gps', async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, speed } = req.body;
  try {
    const logId = uuidv4();
    await db.query(
      'INSERT INTO gps_logs (id, journey_id, transporter_id, latitude, longitude, speed) VALUES (?, ?, ?, ?, ?, ?)',
      [logId, id, req.user.id, latitude, longitude, speed]
    );
    req.io.emit('gps_update', { transporter_id: req.user.id, latitude, longitude, speed, journeyId: id });
    res.status(201).json({ message: 'GPS logged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /journeys/:id/breakdown
router.put('/journeys/:id/breakdown', async (req, res) => {
  const { id } = req.params;
  const { description, latitude, longitude, estimated_repair_time } = req.body;
  try {
    await db.query(
      "UPDATE journeys SET status='breakdown', breakdown_reported=true, breakdown_description=?, breakdown_lat=?, breakdown_lng=? WHERE id=? AND transporter_id=?",
      [description, latitude, longitude, id, req.user.id]
    );

    const journey = (await db.query('SELECT * FROM journeys WHERE id=?', [id])).rows[0];
    const transporter = (await db.query('SELECT name, province FROM users WHERE id=?', [req.user.id])).rows[0];
    const transporterMeta = (await db.query('SELECT vehicle_number FROM transporters WHERE user_id=?', [req.user.id])).rows[0];

    const alertPayload = {
      journeyId: id,
      transporter: transporter.name,
      vehicle: transporterMeta?.vehicle_number || 'N/A',
      province: transporter.province,
      location: `${latitude}, ${longitude}`,
      estimated_repair_time,
      destination: journey.to_location
    };

    // Notify admin (broadcast)
    req.io.emit('journey:breakdown', alertPayload);

    // Only notify outlet in the SAME province
    const outletRes = await db.query(
      "SELECT id FROM users WHERE role='outlet' AND province=? LIMIT 1",
      [transporter.province]
    );
    if (outletRes.rows[0]) {
      req.io.to(`user_${outletRes.rows[0].id}`).emit('journey:breakdown', alertPayload);
    }

    // If outlet→retailer journey, also notify the retailer via the order
    if (journey.order_id) {
      const orderRes = await db.query('SELECT retailer_id FROM orders WHERE id=?', [journey.order_id]);
      if (orderRes.rows[0]) {
        req.io.to(`user_${orderRes.rows[0].retailer_id}`).emit('journey:breakdown', {
          ...alertPayload,
          message: 'Your delivery may be delayed due to a vehicle breakdown.'
        });
      }
    }

    await logActivity(req.user.id, `Reported breakdown near (${latitude}, ${longitude}): ${description}`);
    res.json({ message: 'Breakdown reported' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /journeys/:id/arrive
router.put('/journeys/:id/arrive', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "UPDATE journeys SET status='arrived', arrived_at=NOW() WHERE id=? AND transporter_id=?",
      [id, req.user.id]
    );
    const journey = (await db.query('SELECT * FROM journeys WHERE id=?', [id])).rows[0];
    req.io.emit('journey:arrived', { journeyId: id, destination: journey.to_location });
    if (journey.outlet_id) {
      req.io.to(`user_${journey.outlet_id}`).emit('journey:arrived', { journeyId: id });
    }
    await logActivity(req.user.id, `Arrived at ${journey.to_location}`);
    res.json(journey);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /journeys/:id/complete — triggers payment
router.put('/journeys/:id/complete', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "UPDATE journeys SET status='completed', completed_at=NOW(), payment_status='paid', payment_released_at=NOW() WHERE id=? AND transporter_id=?",
      [id, req.user.id]
    );
    const journey = (await db.query('SELECT * FROM journeys WHERE id=?', [id])).rows[0];

    // Create transporter payment record
    const tpId = uuidv4();
    await db.query(
      "INSERT INTO transporter_payments (id, journey_id, transporter_id, amount, paid_by) VALUES (?, ?, ?, ?, ?)",
      [tpId, id, req.user.id, journey.payment_amount, journey.assigned_by_id]
    );

    // Also create payments record
    const payId = uuidv4();
    await db.query(
      "INSERT INTO payments (id, payer_id, payee_id, amount, payment_type, reference_id, status) VALUES (?, ?, ?, ?, 'transporter_journey', ?, 'completed')",
      [payId, journey.assigned_by_id || req.user.id, req.user.id, journey.payment_amount, id]
    );

    req.io.emit('journey:ended', { journeyId: id });
    req.io.to(`user_${req.user.id}`).emit('payment_received', { amount: journey.payment_amount });

    await logActivity(req.user.id, `Completed journey from ${journey.from_location} to ${journey.to_location}. Payment LKR ${journey.payment_amount} received.`);
    res.json({ message: 'Journey completed and payment processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /earnings
router.get('/earnings', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT p.*, j.from_location, j.to_location FROM payments p LEFT JOIN journeys j ON p.reference_id=j.id WHERE p.payee_id=? AND p.payment_type='transporter_journey' ORDER BY p.created_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /activity-logs
router.get('/activity-logs', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM activity_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 10',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
