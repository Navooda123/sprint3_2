const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { v4: uuidv4 } = require('uuid');

router.use(auth);
router.use(roleCheck(['outlet']));

const logActivity = async (userId, description) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (id, user_id, role, action_description) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, 'outlet', description]
    );
  } catch (e) {}
};

// GET /dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [ordersRes, alertsRes, invoicesRes, overdueRes] = await Promise.all([
      db.query("SELECT COUNT(*) as count FROM orders WHERE outlet_id=? AND status='pending'", [req.user.id]),
      db.query("SELECT COUNT(*) as count FROM notifications WHERE recipient_id=? AND is_read=false", [req.user.id]),
      db.query("SELECT COUNT(*) as count FROM invoices WHERE outlet_id=? AND status='unpaid'", [req.user.id]),
      db.query("SELECT COUNT(*) as count FROM invoices WHERE outlet_id=? AND status='overdue'", [req.user.id])
    ]);
    res.json({
      incomingOrders: ordersRes.rows[0].count,
      alerts: alertsRes.rows[0].count,
      pendingInvoices: invoicesRes.rows[0].count,
      overdueInvoices: overdueRes.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /inventory
router.get('/inventory', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT i.*, p.name as product_name, p.category FROM inventory i JOIN products p ON i.product_id=p.id WHERE i.owner_id=?',
      [req.user.id]
    );
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

// GET /orders
router.get('/orders', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT o.*, u.name as retailer_name FROM orders o JOIN users u ON o.retailer_id=u.id WHERE o.outlet_id=? ORDER BY o.created_at DESC',
      [req.user.id]
    );
    for (let order of result.rows) {
      const itemsRes = await db.query(
        'SELECT oi.*, p.name as product_name FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?',
        [order.id]
      );
      order.items = itemsRes.rows;
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /available-transporters — transporters in this outlet's province that are free
router.get('/available-transporters', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.province, t.vehicle_number
      FROM users u
      JOIN transporters t ON t.user_id=u.id
      WHERE u.role='transporter' AND u.province=? AND t.account_status='active'
      AND u.id NOT IN (
        SELECT transporter_id FROM journeys WHERE status IN ('assigned','departed','in_transit','arrived') AND transporter_id IS NOT NULL
      )
    `, [req.user.province]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /orders/:id/dispatch — with optional transporter assignment
router.put('/orders/:id/dispatch', async (req, res) => {
  const { id } = req.params;
  const { transporter_id } = req.body;
  try {
    const orderRes = await db.query('SELECT * FROM orders WHERE id=? AND outlet_id=?', [id, req.user.id]);
    if (!orderRes.rows[0]) return res.status(404).json({ error: 'Order not found' });
    const order = orderRes.rows[0];

    await db.query(
      "UPDATE orders SET status='dispatched', transporter_id=? WHERE id=?",
      [transporter_id || null, id]
    );

    // Create invoice (7-day term for credit)
    const invoiceId = uuidv4();
    await db.query(
      "INSERT INTO invoices (id, order_id, outlet_id, retailer_id, amount, payment_type, due_date) VALUES (?, ?, ?, ?, ?, 'credit', DATE_ADD(NOW(), INTERVAL 7 DAY))",
      [invoiceId, id, req.user.id, order.retailer_id, order.total_amount]
    );

    // If transporter assigned, create a journey for outlet→retailer delivery
    let journeyId = null;
    if (transporter_id) {
      journeyId = uuidv4();
      const outletName = (await db.query('SELECT name FROM users WHERE id=?', [req.user.id])).rows[0]?.name;
      const retailerName = (await db.query('SELECT name FROM users WHERE id=?', [order.retailer_id])).rows[0]?.name;
      await db.query(
        `INSERT INTO journeys (id, transporter_id, assigned_by_role, assigned_by_id, from_location, to_location, origin, destination, outlet_id, order_id, payment_amount) 
         VALUES (?, ?, 'outlet', ?, ?, ?, ?, ?, ?, ?, 3500)`,
        [journeyId, transporter_id, req.user.id, outletName, retailerName, outletName, retailerName, req.user.id, id]
      );
      // Notify transporter
      req.io.to(`user_${transporter_id}`).emit('transporter:assigned', {
        journeyId, from_location: outletName, to_location: retailerName, payment_amount: 3500
      });
    }

    req.io.to(`user_${order.retailer_id}`).emit('order:dispatched', { orderId: id, hasTracking: !!transporter_id });

    const retailerName = (await db.query('SELECT name FROM users WHERE id=?', [order.retailer_id])).rows[0]?.name;
    await logActivity(req.user.id, `Dispatched order to ${retailerName} — Invoice LKR ${order.total_amount} created`);

    res.json({ message: 'Order dispatched, invoice created', invoiceId, journeyId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /invoices
router.get('/invoices', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT i.*, u.name as retailer_name FROM invoices i JOIN users u ON i.retailer_id=u.id WHERE i.outlet_id=? ORDER BY i.created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /low-stock-alerts
router.get('/low-stock-alerts', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM notifications WHERE recipient_id=? ORDER BY created_at DESC LIMIT 20",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /retailer-health — health scores for all retailers in this province
router.get('/retailer-health', async (req, res) => {
  try {
    const retailers = await db.query(
      "SELECT id, name, email FROM users WHERE role='retailer' AND province=?",
      [req.user.province]
    );

    const healthData = [];
    for (const retailer of retailers.rows) {
      const [totalInv, paidOnTime, overdueCount, cashCount, totalOrders] = await Promise.all([
        db.query("SELECT COUNT(*) as count FROM invoices WHERE retailer_id=?", [retailer.id]),
        db.query("SELECT COUNT(*) as count FROM invoices WHERE retailer_id=? AND status='paid' AND paid_at <= due_date", [retailer.id]),
        db.query("SELECT COUNT(*) as count FROM invoices WHERE retailer_id=? AND status='overdue'", [retailer.id]),
        db.query("SELECT COUNT(*) as count FROM invoices WHERE retailer_id=? AND payment_type='cash'", [retailer.id]),
        db.query("SELECT COUNT(*) as count FROM orders WHERE retailer_id=?", [retailer.id])
      ]);

      const total = parseInt(totalInv.rows[0].count);
      const paid = parseInt(paidOnTime.rows[0].count);
      const overdue = parseInt(overdueCount.rows[0].count);
      const cash = parseInt(cashCount.rows[0].count);
      const orders = parseInt(totalOrders.rows[0].count);
      const paymentReliability = total > 0 ? Math.round((paid / total) * 100) : 100;
      const cashRatio = orders > 0 ? Math.round((cash / orders) * 100) : 0;

      let healthBadge = 'Good';
      if (overdue >= 3 || paymentReliability < 50) healthBadge = 'At Risk';
      else if (overdue >= 1 || paymentReliability < 80) healthBadge = 'Fair';

      healthData.push({
        id: retailer.id,
        name: retailer.name,
        paymentReliability,
        cashRatio,
        overdueCount: overdue,
        healthBadge
      });
    }
    res.json(healthData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /demand-forecast — predict when each retailer will run low on each product
router.get('/demand-forecast', async (req, res) => {
  try {
    const retailers = await db.query(
      "SELECT id, name FROM users WHERE role='retailer' AND province=?",
      [req.user.province]
    );

    const forecast = [];
    for (const retailer of retailers.rows) {
      const inventory = await db.query(
        'SELECT i.*, p.name as product_name FROM inventory i JOIN products p ON i.product_id=p.id WHERE i.owner_id=?',
        [retailer.id]
      );
      for (const inv of inventory.rows) {
        // avg daily consumption from last 30 days of delivered orders
        const avgRes = await db.query(`
          SELECT COALESCE(SUM(oi.quantity),0)/30 as avg_daily
          FROM order_items oi
          JOIN orders o ON oi.order_id=o.id
          WHERE o.retailer_id=? AND oi.product_id=? AND o.status='delivered'
          AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [retailer.id, inv.product_id]);
        const avgDaily = parseFloat(avgRes.rows[0].avg_daily) || 1;
        const daysUntilEmpty = Math.round(inv.quantity / avgDaily);
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + daysUntilEmpty);

        if (daysUntilEmpty <= 30) {
          forecast.push({
            retailer_name: retailer.name,
            product_name: inv.product_name,
            days_until_empty: daysUntilEmpty,
            predicted_date: predictedDate.toISOString().split('T')[0],
            current_stock: inv.quantity
          });
        }
      }
    }
    forecast.sort((a, b) => a.days_until_empty - b.days_until_empty);
    res.json(forecast.slice(0, 20));
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
