const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { v4: uuidv4 } = require('uuid');

router.use(auth);
router.use(roleCheck(['retailer']));

const logActivity = async (userId, description) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (id, user_id, role, action_description) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, 'retailer', description]
    );
  } catch (e) {}
};

// GET /dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [orders, invoices, lowStock] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM orders WHERE retailer_id=? AND status IN ('pending','dispatched','in_transit')", [req.user.id]),
      db.query("SELECT COUNT(*) as count FROM invoices WHERE retailer_id=? AND status='unpaid'", [req.user.id]),
      db.query("SELECT COUNT(*) as count FROM inventory WHERE owner_id=? AND quantity <= low_stock_threshold * 0.25", [req.user.id])
    ]);
    const cashSavings = await db.query(
      "SELECT COALESCE(SUM(discount_amount),0) as total FROM orders WHERE retailer_id=? AND payment_type='cash' AND YEAR(created_at)=YEAR(NOW())",
      [req.user.id]
    );
    res.json({
      inTransitOrders: orders.rows[0].count,
      unpaidInvoices: invoices.rows[0].count,
      lowStockItems: lowStock.rows[0].count,
      cashSavings: parseFloat(cashSavings.rows[0].total)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /products
router.get('/products', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY is_trending DESC, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /trending — top 3 in this province
router.get('/trending', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id, p.name, p.category, COALESCE(SUM(oi.quantity),0) as total_sold
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id=p.id
      LEFT JOIN orders o ON oi.order_id=o.id AND o.status='delivered'
      LEFT JOIN users u ON o.retailer_id=u.id AND u.province=?
      GROUP BY p.id, p.name, p.category
      ORDER BY total_sold DESC
      LIMIT 3
    `, [req.user.province]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /last-order — for one-tap reorder pre-fill
router.get('/last-order', async (req, res) => {
  try {
    const lastOrder = await db.query(
      'SELECT * FROM orders WHERE retailer_id=? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    if (!lastOrder.rows[0]) return res.json(null);
    const orderId = lastOrder.rows[0].id;
    const items = await db.query(
      'SELECT oi.*, p.name as product_name, p.price_per_unit FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?',
      [orderId]
    );
    res.json({ order: lastOrder.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /orders
router.post('/orders', async (req, res) => {
  const { items, payment_type } = req.body;
  try {
    // Retailer can only order from their linked outlet
    const userRes = await db.query('SELECT outlet_id, province FROM users WHERE id=?', [req.user.id]);
    const user = userRes.rows[0];
    
    let outletId = user.outlet_id;
    if (!outletId) {
      // Fallback: find by province
      const outletRes = await db.query("SELECT id FROM users WHERE role='outlet' AND province=? LIMIT 1", [user.province]);
      if (!outletRes.rows[0]) return res.status(400).json({ message: 'No outlet found for your province' });
      outletId = outletRes.rows[0].id;
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = payment_type === 'cash' ? totalAmount * 0.10 : 0;
    const finalAmount = totalAmount - discountAmount;

    const orderId = uuidv4();
    await db.query(
      "INSERT INTO orders (id, retailer_id, outlet_id, total_amount, discount_amount, payment_type, order_type) VALUES (?, ?, ?, ?, ?, ?, 'manual')",
      [orderId, req.user.id, outletId, finalAmount, discountAmount, payment_type || 'credit']
    );

    for (const item of items) {
      await db.query(
        'INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), orderId, item.productId, item.quantity, item.unitPrice]
      );
    }

    req.io.to(`user_${outletId}`).emit('new_order', { orderId, retailerName: req.user.name });

    await logActivity(req.user.id, `Placed order of LKR ${finalAmount.toFixed(2)} (${payment_type === 'cash' ? '10% cash discount applied' : 'credit term'}) — ${items.length} product(s)`);
    res.status(201).json({ message: 'Order placed', orderId, discount: discountAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /orders
router.get('/orders', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT o.*, j.status as journey_status FROM orders o LEFT JOIN journeys j ON j.order_id=o.id WHERE o.retailer_id=? ORDER BY o.created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /orders/:id/tracking — live GPS for outlet→retailer delivery
router.get('/orders/:id/tracking', async (req, res) => {
  const { id } = req.params;
  try {
    const journeyRes = await db.query(
      "SELECT j.*, u.name as transporter_name, t.vehicle_number FROM journeys j JOIN users u ON j.transporter_id=u.id LEFT JOIN transporters t ON t.user_id=u.id WHERE j.order_id=? AND j.status IN ('departed','in_transit','arrived')",
      [id]
    );
    if (!journeyRes.rows[0]) return res.json(null);
    const journey = journeyRes.rows[0];
    const gps = await db.query(
      'SELECT * FROM gps_logs WHERE journey_id=? ORDER BY logged_at DESC LIMIT 1',
      [journey.id]
    );
    res.json({ journey, gps: gps.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /invoices
router.get('/invoices', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM invoices WHERE retailer_id=? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /invoices/:id/pay
router.put('/invoices/:id/pay', async (req, res) => {
  const { id } = req.params;
  try {
    const invRes = await db.query('SELECT * FROM invoices WHERE id=? AND retailer_id=?', [id, req.user.id]);
    if (!invRes.rows[0]) return res.status(404).json({ message: 'Invoice not found' });
    const invoice = invRes.rows[0];

    await db.query("UPDATE invoices SET status='paid', paid_at=NOW() WHERE id=?", [id]);

    // Unblock if account was blocked
    await db.query("UPDATE users SET is_blocked=false, blocked_reason=NULL WHERE id=? AND is_blocked=true", [req.user.id]);

    const payId = uuidv4();
    await db.query(
      "INSERT INTO payments (id, payer_id, payee_id, amount, payment_type, reference_id, status) VALUES (?, ?, ?, ?, 'retailer_invoice', ?, 'completed')",
      [payId, req.user.id, invoice.outlet_id, invoice.amount, id]
    );

    req.io.to(`user_${invoice.outlet_id}`).emit('invoice:paid', { invoiceId: id, retailer: req.user.name, amount: invoice.amount });
    await logActivity(req.user.id, `Paid invoice LKR ${invoice.amount} via PayHere`);
    res.json({ message: 'Invoice paid successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /inventory — with burn rate
router.get('/inventory', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT i.*, p.name as product_name, p.category FROM inventory i JOIN products p ON i.product_id=p.id WHERE i.owner_id=?',
      [req.user.id]
    );

    // Calculate burn rate (days until empty)
    for (const inv of result.rows) {
      const avgRes = await db.query(`
        SELECT COALESCE(SUM(oi.quantity),0)/30 as avg_daily
        FROM order_items oi
        JOIN orders o ON oi.order_id=o.id
        WHERE o.retailer_id=? AND oi.product_id=? AND o.status='delivered'
        AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [req.user.id, inv.product_id]);
      const avgDaily = parseFloat(avgRes.rows[0].avg_daily) || 0.5;
      inv.days_until_empty = Math.round(inv.quantity / avgDaily);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /inventory/:id/adjust — manual stock adjustment
router.put('/inventory/:id/adjust', async (req, res) => {
  const { id } = req.params;
  const { new_quantity } = req.body;
  try {
    const invRes = await db.query('SELECT * FROM inventory WHERE id=? AND owner_id=?', [id, req.user.id]);
    if (!invRes.rows[0]) return res.status(404).json({ message: 'Inventory item not found' });
    
    await db.query('UPDATE inventory SET quantity=? WHERE id=?', [new_quantity, id]);
    await logActivity(req.user.id, `Manually adjusted stock for ${invRes.rows[0].product_id} to ${new_quantity}`);
    
    res.json({ message: 'Stock adjusted successfully' });
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
