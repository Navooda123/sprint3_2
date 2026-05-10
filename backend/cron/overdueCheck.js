const cron = require('node-cron');
const db = require('../db');
const uuidv4 = () => require('crypto').randomUUID();

const startOverdueCheckCron = (io) => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily check for overdue invoices...');
    try {
      const invoicesRes = await db.query(`
        SELECT i.*, u.id as retailer_id, u.name as retailer_name
        FROM invoices i
        JOIN users u ON i.retailer_id = u.id
        WHERE i.status = 'unpaid' 
        AND i.due_date < DATE_SUB(NOW(), INTERVAL 14 DAY)
        AND u.is_blocked = false
      `);

      for (const invoice of invoicesRes.rows) {
        // Block retailer
        await db.query(`UPDATE users SET is_blocked = true, blocked_reason = 'Overdue payment > 14 days' WHERE id = ?`, [invoice.retailer_id]);
        // Update invoice
        await db.query(`UPDATE invoices SET status = 'overdue' WHERE id = ?`, [invoice.id]);

        const adminRes = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminRes.rows.length > 0) {
          const adminId = adminRes.rows[0].id;
          
          const notif1 = uuidv4();
          await db.query(`
            INSERT INTO notifications (id, recipient_id, title, message, type)
            VALUES (?, ?, 'Retailer Account Blocked', ?, 'Account Block')
          `, [notif1, adminId, `${invoice.retailer_name} blocked due to 14-day overdue invoice`]);
        }

        const notif2 = uuidv4();
        await db.query(`
          INSERT INTO notifications (id, recipient_id, title, message, type)
          VALUES (?, ?, 'Account Blocked', 'Your account has been blocked due to overdue payment. Contact admin to unblock.', 'Account Block')
        `, [notif2, invoice.retailer_id]);

        if (io) {
          io.to(`user_${invoice.retailer_id}`).emit('account_blocked');
        }
      }
      console.log(`Blocked ${invoicesRes.rows.length} accounts due to overdue invoices.`);
    } catch (err) {
      console.error('Error in overdue invoices cron job:', err);
    }
  });
};

module.exports = startOverdueCheckCron;
