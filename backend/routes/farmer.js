const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const uuidv4 = () => require('crypto').randomUUID();

router.use(auth);
router.use(roleCheck(['farmer']));

const logActivity = async (userId, description) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (id, user_id, role, action_description) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, 'farmer', description]
    );
  } catch (e) {}
};

// GET /bids — open bids + my accepted bids
router.get('/bids', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT b.* FROM bids b WHERE b.status = 'open' OR b.accepted_by = ? ORDER BY b.created_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /bids/:id/accept
router.put('/bids/:id/accept', async (req, res) => {
  const { id } = req.params;
  try {
    const check = await db.query("SELECT * FROM bids WHERE id=? AND status='open'", [id]);
    if (!check.rows[0]) return res.status(400).json({ message: 'Bid already accepted or not found' });

    await db.query(
      "UPDATE bids SET status='accepted', accepted_by=? WHERE id=?",
      [req.user.id, id]
    );
    const bid = (await db.query('SELECT * FROM bids WHERE id=?', [id])).rows[0];
    req.io.emit('bid_accepted', { bidId: id, farmerName: req.user.name, material: bid.material_name });
    await logActivity(req.user.id, `Accepted bid for ${bid.quantity}${bid.unit} of ${bid.material_name} — LKR ${bid.bid_amount}`);
    res.json(bid);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /bids/:id/mark-delivered — farmer marks delivery done, admin must confirm
router.put('/bids/:id/mark-delivered', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "UPDATE bids SET status='delivered' WHERE id=? AND accepted_by=?",
      [id, req.user.id]
    );
    const bid = (await db.query('SELECT * FROM bids WHERE id=?', [id])).rows[0];
    // Notify admin to confirm delivery
    req.io.emit('delivery_confirmed', { bidId: id, farmerName: req.user.name, material: bid.material_name });
    await logActivity(req.user.id, `Marked ${bid.material_name} delivery as dispatched — awaiting admin confirmation`);
    res.json(bid);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /payment-history
router.get('/payment-history', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT p.*, b.material_name FROM payments p LEFT JOIN bids b ON p.reference_id = b.id WHERE p.payee_id=? AND p.payment_type='farmer_delivery' ORDER BY p.created_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /win-rate — bid stats for win rate panel
router.get('/win-rate', async (req, res) => {
  try {
    const total = await db.query("SELECT COUNT(*) as count FROM bids WHERE accepted_by=?", [req.user.id]);
    const accepted = await db.query("SELECT COUNT(*) as count FROM bids WHERE accepted_by=? AND status IN ('accepted','delivered','paid')", [req.user.id]);
    const paid = await db.query("SELECT COUNT(*) as count FROM bids WHERE accepted_by=? AND status='paid'", [req.user.id]);

    // By material
    const byMaterial = await db.query(
      "SELECT material_name, COUNT(*) as count FROM bids WHERE accepted_by=? GROUP BY material_name",
      [req.user.id]
    );

    res.json({
      total: total.rows[0].count,
      accepted: accepted.rows[0].count,
      paid: paid.rows[0].count,
      byMaterial: byMaterial.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /earnings-summary — monthly breakdown
router.get('/earnings-summary', async (req, res) => {
  try {
    const thisMonth = await db.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE payee_id=? AND payment_type='farmer_delivery' AND MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())",
      [req.user.id]
    );
    const lastMonth = await db.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE payee_id=? AND payment_type='farmer_delivery' AND MONTH(created_at)=MONTH(NOW()-INTERVAL 1 MONTH) AND YEAR(created_at)=YEAR(NOW()-INTERVAL 1 MONTH)",
      [req.user.id]
    );
    const thisYear = await db.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE payee_id=? AND payment_type='farmer_delivery' AND YEAR(created_at)=YEAR(NOW())",
      [req.user.id]
    );
    const byMaterial = await db.query(
      "SELECT b.material_name, COALESCE(SUM(p.amount),0) as total FROM payments p JOIN bids b ON p.reference_id=b.id WHERE p.payee_id=? AND p.payment_type='farmer_delivery' GROUP BY b.material_name",
      [req.user.id]
    );

    res.json({
      thisMonth: parseFloat(thisMonth.rows[0].total),
      lastMonth: parseFloat(lastMonth.rows[0].total),
      thisYear: parseFloat(thisYear.rows[0].total),
      byMaterial: byMaterial.rows
    });
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
