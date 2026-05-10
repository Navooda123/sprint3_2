const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { v4: uuidv4 } = require('uuid');

router.use(auth);
router.use(roleCheck(['admin']));

// ---- Helper: log activity ----
const logActivity = async (userId, role, description) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (id, user_id, role, action_description) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, role, description]
    );
  } catch (e) { /* non-blocking */ }
};

// GET /dashboard - KPIs + greeting data
router.get('/dashboard', async (req, res) => {
  try {
    const [totalOrders, activeJourneys, overdueInvoices, lowStockAlerts, blockedRetailers] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM orders'),
      db.query("SELECT COUNT(*) as count FROM journeys WHERE status IN ('assigned','departed','in_transit')"),
      db.query("SELECT COUNT(*) as count FROM invoices WHERE status = 'overdue'"),
      db.query("SELECT COUNT(*) as count FROM notifications WHERE type LIKE '%Low Stock%' AND is_read = false"),
      db.query("SELECT COUNT(*) as count FROM users WHERE role='retailer' AND is_blocked = true")
    ]);

    const ordersPerProvince = await db.query(`
      SELECT u.province, COUNT(o.id) as count 
      FROM orders o 
      JOIN users u ON o.retailer_id = u.id 
      GROUP BY u.province
    `);

    res.json({
      kpis: {
        totalOrders: totalOrders.rows[0].count,
        activeTransporters: activeJourneys.rows[0].count,
        overdueInvoices: overdueInvoices.rows[0].count,
        lowStockAlerts: lowStockAlerts.rows[0].count,
        blockedRetailers: blockedRetailers.rows[0].count
      },
      charts: { ordersPerProvince: ordersPerProvince.rows }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /province-health - Province heatmap data
router.get('/province-health', async (req, res) => {
  try {
    const provinces = ['Western', 'Central', 'Southern', 'Northern', 'Eastern'];
    const healthData = [];

    for (const province of provinces) {
      const [outletRes, overdueRes, activeJourneyRes, lowStockRes] = await Promise.all([
        db.query("SELECT id FROM users WHERE role='outlet' AND province=? LIMIT 1", [province]),
        db.query("SELECT COUNT(*) as count FROM invoices i JOIN users u ON i.retailer_id=u.id WHERE u.province=? AND i.status='overdue'", [province]),
        db.query("SELECT COUNT(*) as count FROM journeys j JOIN users u ON j.transporter_id=u.id WHERE u.province=? AND j.status IN ('departed','in_transit')", [province]),
        db.query("SELECT COUNT(*) as count FROM inventory inv JOIN users u ON inv.owner_id=u.id WHERE u.province=? AND u.role='outlet' AND inv.quantity <= inv.low_stock_threshold * 0.25", [province])
      ]);

      const outletId = outletRes.rows[0]?.id;
      let stockPct = 75;
      if (outletId) {
        const stockRes = await db.query(
          'SELECT AVG((quantity / low_stock_threshold) * 100) as pct FROM inventory WHERE owner_id=?',
          [outletId]
        );
        stockPct = Math.round(stockRes.rows[0]?.pct || 75);
      }

      const overdueCount = parseInt(overdueRes.rows[0].count);
      const lowStockCount = parseInt(lowStockRes.rows[0].count);

      let health = 'green';
      if (stockPct < 25 || overdueCount >= 3 || lowStockCount > 0) health = 'red';
      else if (stockPct < 50 || overdueCount >= 1) health = 'amber';

      healthData.push({
        province,
        health,
        stockPct,
        activeDeliveries: parseInt(activeJourneyRes.rows[0].count),
        overdueInvoices: overdueCount
      });
    }

    res.json(healthData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /transporters/live
router.get('/transporters/live', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t1.*, u.name as transporter_name 
      FROM gps_logs t1
      INNER JOIN (
        SELECT transporter_id, MAX(logged_at) as max_time
        FROM gps_logs GROUP BY transporter_id
      ) t2 ON t1.transporter_id = t2.transporter_id AND t1.logged_at = t2.max_time
      JOIN users u ON t1.transporter_id = u.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /available-transporters?province=X
router.get('/available-transporters', async (req, res) => {
  try {
    const { province } = req.query;
    let query = `
      SELECT u.id, u.name, u.province, t.vehicle_number, t.account_status
      FROM users u
      JOIN transporters t ON t.user_id = u.id
      WHERE u.role = 'transporter' AND t.account_status = 'active'
      AND u.id NOT IN (
        SELECT transporter_id FROM journeys WHERE status IN ('assigned','departed','in_transit','arrived') AND transporter_id IS NOT NULL
      )
    `;
    const params = [];
    if (province) {
      query += ' AND u.province = ?';
      params.push(province);
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /journeys/assign — Admin assigns transporter to a factory→outlet shipment
router.post('/journeys/assign', async (req, res) => {
  const { transporter_id, from_location, to_location, outlet_id, payment_amount } = req.body;
  try {
    // Check transporter is free
    const activeCheck = await db.query(
      "SELECT id FROM journeys WHERE transporter_id=? AND status IN ('assigned','departed','in_transit','arrived')",
      [transporter_id]
    );
    if (activeCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Transporter already has an active journey' });
    }

    const id = uuidv4();
    await db.query(
      `INSERT INTO journeys (id, transporter_id, assigned_by_role, assigned_by_id, from_location, to_location, origin, destination, outlet_id, payment_amount) 
       VALUES (?, ?, 'admin', ?, ?, ?, ?, ?, ?, ?)`,
      [id, transporter_id, req.user.id, from_location, to_location, from_location, to_location, outlet_id, payment_amount || 5000]
    );

    const transporterUser = await db.query('SELECT name FROM users WHERE id=?', [transporter_id]);
    req.io.to(`user_${transporter_id}`).emit('transporter:assigned', {
      journeyId: id, from_location, to_location, payment_amount: payment_amount || 5000
    });

    await logActivity(req.user.id, 'admin', `Assigned ${transporterUser.rows[0]?.name} for delivery from ${from_location} to ${to_location}`);
    res.status(201).json({ message: 'Transporter assigned', journeyId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /bids
router.post('/bids', async (req, res) => {
  const { material_name, quantity, unit, bid_amount, bid_type } = req.body;
  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO bids (id, admin_id, material_name, quantity, unit, bid_amount, bid_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, material_name, quantity, unit, bid_amount, bid_type]
    );
    const newBid = (await db.query('SELECT * FROM bids WHERE id = ?', [id])).rows[0];
    req.io.emit('new_bid', newBid);
    await logActivity(req.user.id, 'admin', `Published bid for ${quantity}${unit} of ${material_name} — LKR ${bid_amount}`);
    res.status(201).json(newBid);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /bids
router.get('/bids', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.*, u.name as farmer_name 
      FROM bids b 
      LEFT JOIN users u ON b.accepted_by = u.id 
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /bids/:id/confirm-delivery — Admin confirms receipt and releases payment
router.put('/bids/:id/confirm-delivery', async (req, res) => {
  const { id } = req.params;
  try {
    const bid = (await db.query('SELECT * FROM bids WHERE id = ?', [id])).rows[0];
    if (!bid) return res.status(404).json({ error: 'Bid not found' });
    if (bid.status !== 'delivered') return res.status(400).json({ error: 'Bid must be in delivered status' });

    await db.query(
      "UPDATE bids SET status='paid', delivery_confirmed_by=?, delivery_confirmed_at=NOW(), farmer_payment_released=true WHERE id=?",
      [req.user.id, id]
    );

    const paymentId = uuidv4();
    await db.query(
      "INSERT INTO payments (id, payer_id, payee_id, amount, payment_type, reference_id, status) VALUES (?, ?, ?, ?, 'farmer_delivery', ?, 'completed')",
      [paymentId, req.user.id, bid.accepted_by, bid.bid_amount, id]
    );

    const farmer = (await db.query('SELECT name FROM users WHERE id=?', [bid.accepted_by])).rows[0];
    req.io.to(`user_${bid.accepted_by}`).emit('farmer:payment_released', {
      amount: bid.bid_amount, material: bid.material_name
    });

    await logActivity(req.user.id, 'admin', `Released LKR ${bid.bid_amount} payment to ${farmer?.name} for ${bid.material_name} delivery`);
    res.json({ message: 'Delivery confirmed and payment released' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /trending-products
router.get('/trending-products', async (req, res) => {
  try {
    const provinces = ['Western', 'Central', 'Southern', 'Northern', 'Eastern'];
    const result = {};

    for (const province of provinces) {
      const topProducts = await db.query(`
        SELECT p.name, p.category, SUM(oi.quantity) as total_sold
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        JOIN users u ON o.retailer_id = u.id
        WHERE u.province = ? AND o.status = 'delivered'
        GROUP BY p.id, p.name, p.category
        ORDER BY total_sold DESC
        LIMIT 3
      `, [province]);

      // Fallback if no orders yet: show trending-flagged products
      if (topProducts.rows.length === 0) {
        const fallback = await db.query(
          "SELECT name, category FROM products WHERE is_trending=true ORDER BY created_at LIMIT 3"
        );
        result[province] = fallback.rows.map((p, i) => ({
          rank: i + 1,
          name: p.name,
          category: p.category,
          demand: i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low'
        }));
      } else {
        result[province] = topProducts.rows.map((p, i) => ({
          rank: i + 1,
          name: p.name,
          category: p.category,
          total_sold: p.total_sold,
          demand: i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low'
        }));
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /blocked-retailers
router.get('/blocked-retailers', async (req, res) => {
  try {
    const result = await db.query("SELECT id, name, email, province, blocked_reason FROM users WHERE role='retailer' AND is_blocked=true");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /retailers/:id/unblock — Admin only
router.put('/retailers/:id/unblock', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE users SET is_blocked=false, blocked_reason=NULL WHERE id=? AND role='retailer'", [id]);
    req.io.to(`user_${id}`).emit('unblock:approved');
    await logActivity(req.user.id, 'admin', `Unblocked Retailer account (ID: ${id.substring(0,8)})`);
    res.json({ message: 'Retailer unblocked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /payments
router.get('/payments', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, u1.name as payer_name, u2.name as payee_name 
      FROM payments p 
      JOIN users u1 ON p.payer_id = u1.id 
      JOIN users u2 ON p.payee_id = u2.id 
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /activity-logs — last 10 admin actions
router.get('/activity-logs', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM activity_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 10",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /products
router.get('/products', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY is_trending DESC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /outlets — to populate dropdown for dispatching products
router.get('/outlets', async (req, res) => {
  try {
    const result = await db.query("SELECT id, name, province FROM users WHERE role='outlet' ORDER BY province");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /dispatch-to-outlet — Admin sends stock to a specific outlet
router.post('/dispatch-to-outlet', async (req, res) => {
  const { product_id, outlet_id, quantity } = req.body;
  try {
    if (!product_id || !outlet_id || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qtyNum = parseInt(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    // Check if the outlet already has this product in inventory
    const checkInv = await db.query(
      'SELECT id FROM inventory WHERE product_id=? AND owner_id=?',
      [product_id, outlet_id]
    );

    if (checkInv.rows.length > 0) {
      // Update existing
      await db.query(
        'UPDATE inventory SET quantity = quantity + ? WHERE id=?',
        [qtyNum, checkInv.rows[0].id]
      );
    } else {
      // Insert new
      const id = uuidv4();
      await db.query(
        'INSERT INTO inventory (id, product_id, owner_id, quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?)',
        [id, product_id, outlet_id, qtyNum, 100]
      );
    }

    // Optionally notify the outlet
    req.io.to(`user_${outlet_id}`).emit('inventory:replenished', { product_id, quantity: qtyNum });

    const outletName = (await db.query('SELECT name FROM users WHERE id=?', [outlet_id])).rows[0]?.name;
    const productName = (await db.query('SELECT name FROM products WHERE id=?', [product_id])).rows[0]?.name;

    await logActivity(req.user.id, 'admin', `Dispatched ${qtyNum} units of ${productName} to ${outletName}`);

    res.json({ message: 'Stock dispatched successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /journeys — all journeys for admin view
router.get('/journeys', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT j.*, u.name as transporter_name, u.province as transporter_province, t.vehicle_number
      FROM journeys j
      JOIN users u ON j.transporter_id = u.id
      LEFT JOIN transporters t ON t.user_id = u.id
      ORDER BY j.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
