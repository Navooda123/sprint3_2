const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const User = require('../models/User');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Message = require('../models/Message');
const { Op } = require('sequelize');
const { protect, authorize } = require('../middleware/authMiddleware');
const Invoice = require('../models/Invoice');
const UnblockRequest = require('../models/UnblockRequest');
const DistributorAccount = require('../models/DistributorAccount');
const DeliveryConfirmation = require('../models/DeliveryConfirmation');
const Payment = require('../models/Payment');

router.use(protect);
router.use(authorize('Distributor'));

// Get payments from Retailers
router.get('/retailer-payments', async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [
        {
          model: Order,
          where: {
            [Op.or]: [
              { distributorId: req.user.id },
              { supplierId: req.user.id }
            ],
            receiver_type: 'Retailer'
          },
          include: [{ model: User, as: 'Recipient', attributes: ['name', 'district'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/deliveries', async (req, res) => {
  try {
    const deliveries = await Order.findAll({ 
      where: { 
        [Op.or]: [
          { distributorId: req.user.id },
          // Also include retailer auto-reorders directed to this distributor as supplier
          { supplierId: req.user.id, receiver_type: 'Retailer' }
        ],
        status: ['Approved', 'Accepted', 'In Transit', 'Delivered', 'Pending']
      },
      include: [
        { model: User, as: 'Recipient', attributes: ['name', 'email', 'address', 'district', 'role', 'province'] },
        { 
          model: OrderItem, 
          as: 'items',
          include: [{ model: Product, attributes: ['name', 'sku'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/deliveries/:id/accept', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Auth check: Is this distributor assigned as distributorId OR supplierId?
    if (order.distributorId !== req.user.id && order.supplierId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    order.status = 'Accepted';
    if (!order.distributorId) order.distributorId = req.user.id; // Ensure distributorId is set on acceptance
    await order.save();

    req.io.to(`user_${order.recipientId}`).emit('notification', {
      type: 'Delivery Update',
      message: `Your delivery ${order.orderNumber} has been accepted by distributor ${req.user.name}.`
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/deliveries/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.distributorId = null;
    order.status = 'Pending';
    await order.save();

    req.io.to('Admin').emit('notification', {
      type: 'Delivery Rejected',
      message: `Distributor ${req.user.name} rejected delivery ${order.orderNumber}. Reason: ${reason}`
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/deliveries/:id/transit', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = 'In Transit';
    await order.save();

    // Notify recipient (Retailer or Farmer/Factory)
    req.io.to(`user_${order.recipientId}`).emit('order:dispatched', {
      orderId: order.id,
      message: `Your order ${order.orderNumber} is now in transit.`
    });

    // Send Auto-Message
    const msg = await Message.create({
      senderId: req.user.id,
      senderName: req.user.name,
      recipientId: order.recipientId,
      text: `Your delivery ${order.orderNumber} is on the way.`
    });
    req.io.to(`user_${order.recipientId}`).emit('new_message', msg);
    req.io.to(`user_${order.recipientId}`).emit('notification', {
      type: 'Delivery Update',
      message: `Your delivery ${order.orderNumber} is on the way.`
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/deliveries/:id/deliver', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = 'Delivered';
    await order.save();

    // Send Auto-Message
    const msg = await Message.create({
      senderId: req.user.id,
      senderName: req.user.name,
      recipientId: order.recipientId,
      text: `Your delivery ${order.orderNumber} has been completed.`
    });
    req.io.to(`user_${order.recipientId}`).emit('new_message', msg);
    req.io.to(`user_${order.recipientId}`).emit('notification', {
      type: 'Delivery Update',
      message: `Your delivery ${order.orderNumber} has arrived!`
    });
    req.io.to('Admin').emit('notification', {
      type: 'Delivery Update',
      message: `Delivery ${order.orderNumber} was marked as Delivered by ${req.user.name}.`
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    // Find all users (Retailers) in the Distributor's province
    const recipients = await User.findAll({
      where: {
        role: 'Retailer',
        province: req.user.province
      },
      attributes: ['id', 'name', 'district', 'province']
    });

    const recipientIds = recipients.map(r => r.id);

    // Get low inventory for those users
    const alerts = await Inventory.findAll({
      where: {
        userId: { [Op.in]: recipientIds },
        quantity: { [Op.lte]: 25 }
      },
      include: [
        { model: Product, as: 'product', attributes: ['name', 'sku'] },
        { model: User, as: 'user', attributes: ['name', 'district', 'role'] }
      ],
      order: [['quantity', 'ASC']]
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/deliveries/:id/location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.currentLat = lat;
    order.currentLng = lng;
    await order.save();

    req.io.to(`user_${order.recipientId}`).emit('delivery_update', {
      orderId: order.id,
      lat,
      lng
    });
    req.io.to('Admin').emit('delivery_update', {
      orderId: order.id,
      lat,
      lng
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create an order from Distributor to their Provincial Outlet
router.post('/orders', async (req, res) => {
  try {
    const { items, paymentOption } = req.body; // items: [{ productId, quantity, price }]
    
    // Check if blocked
    const account = await DistributorAccount.findOne({ where: { distributor_id: req.user.id } });
    if (account && account.account_status === 'blocked') {
      return res.status(403).json({ message: 'Account is blocked due to overdue invoices.' });
    }

    // Find Outlet for this province
    const outlet = await User.findOne({ where: { role: 'Outlet', province: req.user.province } });
    if (!outlet) {
      return res.status(404).json({ message: 'No Outlet found for your province.' });
    }

    let totalAmount = 0;
    items.forEach(i => { totalAmount += (i.quantity * parseFloat(i.price)); });

    const order = await Order.create({
      orderNumber: 'DIST-' + Math.floor(Math.random() * 1000000),
      recipientId: req.user.id,
      supplierId: outlet.id,
      totalAmount,
      status: 'Pending',
      paymentStatus: 'Pending',
      sender_type: 'Outlet',
      receiver_type: 'Distributor'
    });

    for (const item of items) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      });
    }

    // Payment Logic
    let invoiceStatus = 'pending';
    let discountedAmount = null;
    let dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days from now

    if (paymentOption === 'immediate') {
      invoiceStatus = 'paid_discounted';
      discountedAmount = totalAmount * 0.90;
      order.paymentStatus = 'Paid';
      await order.save();
    }

    const invoice = await Invoice.create({
      distributor_id: req.user.id,
      outlet_id: outlet.id,
      order_id: order.id,
      full_amount: totalAmount,
      discounted_amount: discountedAmount,
      amount_paid: paymentOption === 'immediate' ? discountedAmount : 0,
      payment_type: paymentOption,
      discount_applied: paymentOption === 'immediate',
      status: invoiceStatus,
      due_date: paymentOption === 'credit' ? dueDate : null,
      paid_at: paymentOption === 'immediate' ? new Date() : null,
      province_id: req.user.province // Track province for scoping
    });

    // Create delivery confirmation record placeholder
    await DeliveryConfirmation.create({
      order_id: order.id,
      tier: 'distributor',
      stock_updated: false
    });

    req.io.to(`user_${outlet.id}`).emit('notification', {
      type: 'New Order',
      message: `Distributor ${req.user.name} placed an order.`
    });

    res.status(201).json({ order, invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Distributor's invoices
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      where: { distributor_id: req.user.id },
      include: [
        { model: Order, include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }] },
        { model: User, as: 'Outlet', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pay an invoice & request unblock
router.post('/invoices/:id/pay', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, distributor_id: req.user.id } });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

    invoice.status = 'paid_pending_verification';
    invoice.amount_paid = invoice.discount_applied ? (invoice.discounted_amount || invoice.full_amount) : invoice.full_amount;
    invoice.paid_at = new Date();
    await invoice.save();

    const order = await Order.findByPk(invoice.order_id);
    if (order) {
      order.paymentStatus = 'Paid';
      await order.save();
    }

    const account = await DistributorAccount.findOne({ where: { distributor_id: req.user.id } });
    if (account && account.account_status === 'blocked') {
      await UnblockRequest.create({
        distributor_id: req.user.id,
        invoice_id: invoice.id,
        amount_paid: invoice.full_amount
      });

      req.io.to('Admin').emit('unblock:requested', {
        message: `Unblock request from Dist. ${req.user.name} — payment submitted for Invoice #${invoice.id}.`
      });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get account status
router.get('/account-status', async (req, res) => {
  try {
    let account = await DistributorAccount.findOne({ where: { distributor_id: req.user.id } });
    if (!account) {
      account = await DistributorAccount.create({ distributor_id: req.user.id, province_id: req.user.province });
    }
    res.json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
