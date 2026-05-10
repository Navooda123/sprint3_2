const { Op } = require('sequelize');
const Invoice = require('../models/Invoice');
const DistributorAccount = require('../models/DistributorAccount');

const checkOverdueInvoices = async (io) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all pending invoices where due_date < today
    const overdueInvoices = await Invoice.findAll({
      where: {
        status: 'pending',
        due_date: { [Op.lt]: today }
      }
    });

    for (let invoice of overdueInvoices) {
      invoice.status = 'overdue';
      await invoice.save();

      // Block distributor account
      let account = await DistributorAccount.findOne({ where: { distributor_id: invoice.distributor_id } });
      if (!account) {
        account = await DistributorAccount.create({ distributor_id: invoice.distributor_id, account_status: 'active' });
      }

      if (account.account_status !== 'blocked') {
        account.account_status = 'blocked';
        account.blocked_at = new Date();
        account.blocked_reason = `Overdue invoice #${invoice.id}`;
        await account.save();

        if (io) {
          io.to(`user_${invoice.distributor_id}`).emit('distributor:blocked', {
            message: 'Your account has been blocked due to overdue invoices. Please settle your outstanding balance.'
          });
          io.to('Admin').emit('invoice:overdue', {
            message: `Invoice #${invoice.id} for Distributor ${invoice.distributor_id} is overdue. Account blocked.`
          });
        }
      }
    }
    
    if (overdueInvoices.length > 0) {
      console.log(`[Cron] Marked ${overdueInvoices.length} invoices as overdue and blocked respective accounts.`);
    }
  } catch (error) {
    console.error('[Cron] Error checking overdue invoices:', error);
  }
};

const startInvoiceCron = (io) => {
  // Check immediately on startup
  checkOverdueInvoices(io);
  
  // Then check every hour
  setInterval(() => {
    checkOverdueInvoices(io);
  }, 60 * 60 * 1000); // 1 hour
};

module.exports = startInvoiceCron;
