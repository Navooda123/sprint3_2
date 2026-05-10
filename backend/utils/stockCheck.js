const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const checkLowStock = async (ownerId, productId, io) => {
  try {
    const invRes = await db.query(`
      SELECT i.*, p.name as product_name 
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.owner_id = ? AND i.product_id = ?
    `, [ownerId, productId]);

    if (invRes.rows.length === 0) return;
    const inv = invRes.rows[0];

    const pct = (inv.quantity / inv.low_stock_threshold) * 100;
    
    if (pct <= 25) {
      const userRes = await db.query('SELECT * FROM users WHERE id = ?', [ownerId]);
      const user = userRes.rows[0];

      if (user.role === 'retailer') {
        const outletRes = await db.query("SELECT id FROM users WHERE role = 'outlet' AND province = ? LIMIT 1", [user.province]);
        if (outletRes.rows.length > 0) {
          const outletId = outletRes.rows[0].id;
          const notifId = uuidv4();
          await db.query(`
            INSERT INTO notifications (id, recipient_id, title, message, type)
            VALUES (?, ?, 'Low Stock Alert', ?, 'Low Stock Alert')
          `, [notifId, outletId, `Retailer ${user.name} is low on ${inv.product_name} (${pct.toFixed(0)}% remaining)`]);
          
          if (io) {
            io.to(`user_${outletId}`).emit('low_stock_alert', { retailer: user.name, product: inv.product_name, pct });
          }
        }
      } else if (user.role === 'outlet') {
        const adminRes = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminRes.rows.length > 0) {
          const adminId = adminRes.rows[0].id;
          const notifId = uuidv4();
          await db.query(`
            INSERT INTO notifications (id, recipient_id, title, message, type)
            VALUES (?, ?, 'Outlet Low Stock', ?, 'Outlet Low Stock')
          `, [notifId, adminId, `${user.name} is low on ${inv.product_name} (${pct.toFixed(0)}% remaining)`]);

          if (io) {
            io.to(`user_${adminId}`).emit('outlet_low_stock', { outlet: user.name, product: inv.product_name, pct });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error checking low stock:', err);
  }
};

module.exports = { checkLowStock };
