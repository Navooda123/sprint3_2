const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Inventory = require('../models/Inventory');
const Bid = require('../models/Bid');
const Payment = require('../models/Payment');
const RawMaterialRequest = require('../models/RawMaterialRequest');
const AuditLog = require('../models/AuditLog');
const Invoice = require('../models/Invoice');
const UnblockRequest = require('../models/UnblockRequest');
const DistributorAccount = require('../models/DistributorAccount');
const { Op } = require('sequelize');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('Admin'));

router.get('/kpis', async (req, res) => {
  try {
    const totalOrders = await Order.count({
      where: {
        receiver_type: { [Op.in]: ['Outlet', 'Distributor', 'Farmer'] }
      }
    });
    const activeDeliveries = await Order.count({ 
      where: { 
        status: ['Dispatched', 'In Transit'],
        receiver_type: { [Op.in]: ['Outlet', 'Distributor', 'Farmer'] }
      } 
    });
    
    const paidOrders = await Order.findAll({ 
      where: { 
        paymentStatus: 'Paid',
        receiver_type: { [Op.in]: ['Outlet', 'Distributor', 'Farmer'] }
      } 
    });
    const revenue = paidOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

    const pendingBids = await Bid.count({ where: { status: 'Pending' } });

    res.json({
      totalOrders,
      activeDeliveries,
      revenue,
      pendingBids
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// RAW MATERIAL REQUESTS
router.get('/raw-material-requests', async (req, res) => {
  try {
    const requests = await RawMaterialRequest.findAll({
      order: [['createdAt', 'DESC']],
      include: [{
        model: Bid,
        as: 'Bids',
        include: [{ model: User, as: 'farmer', attributes: ['id', 'name', 'district'] }]
      }]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/raw-material-requests', async (req, res) => {
  try {
    const request = await RawMaterialRequest.create({
      ...req.body,
      factoryId: req.user.id
    });
    
    req.io.emit('notification', {
      type: 'New Request',
      message: `Factory posted a new request for ${req.body.quantityNeeded} ${req.body.unit} of ${req.body.materialName}`
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/stock', async (req, res) => {
  try {
    const stock = await Inventory.findAll({
      include: [
        { model: Product, as: 'product' },
        { model: User, where: { role: 'Outlet' }, attributes: ['id', 'name', 'role', 'district'] }
      ]
    });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reorder', async (req, res) => {
  try {
    const { recipientId, productId, quantity } = req.body;
    
    const product = await Product.findByPk(productId);
    const totalAmount = (parseFloat(product.price) || 0) * quantity;

    const order = await Order.create({
      orderNumber: 'ORD-' + Math.floor(Math.random() * 1000000),
      recipientId,
      totalAmount,
      status: 'Dispatched',
      paymentStatus: 'Pending'
    });

    await OrderItem.create({
      orderId: order.id,
      productId,
      quantity,
      price: totalAmount / quantity
    });

    const distributor = await User.findOne({ where: { role: 'Distributor' } });
    if (distributor) {
      order.distributorId = distributor.id;
      order.currentLat = 6.9271;
      order.currentLng = 79.8612;
      await order.save();

      req.io.to(`user_${distributor.id}`).emit('notification', {
        type: 'Dispatch',
        message: `New auto-dispatch delivery assigned: ${order.orderNumber}`
      });
    }

    req.io.to(`user_${recipientId}`).emit('notification', {
      type: 'Order Dispatched',
      message: `Factory has dispatched ${quantity} units of ${product.name} to you due to low stock.`
    });

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          { sender_type: 'Factory' },
          { sender_type: 'Outlet' },
          { supplierId: req.user.id }
        ],
        receiver_type: { [Op.ne]: 'Retailer' }
      },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'Recipient', attributes: ['name', 'district', 'province', 'role'] },
        { model: User, as: 'Distributor', attributes: ['name'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['name'] }] }
      ]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dispatch an order (Factory approves & dispatches to Outlet)
router.put('/orders/:id/dispatch', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: User, as: 'Recipient', attributes: ['id', 'name'] }]
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = 'Dispatched';
    order.currentLat = 7.8731; // Kurunegala factory lat
    order.currentLng = 80.6517;
    await order.save();

    req.io.to(`user_${order.recipientId}`).emit('order:dispatched', {
      orderId: order.id,
      message: `Order ${order.orderNumber} has been dispatched from the Factory. Track it on the map.`
    });
    req.io.to(`user_${order.recipientId}`).emit('notification', {
      type: 'Order Dispatched',
      message: `Your order ${order.orderNumber} is on its way!`
    });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: [
        { model: User, as: 'Distributor', attributes: ['name', 'province'] },
        { model: User, as: 'Outlet', attributes: ['name'] },
        { model: Order, attributes: ['orderNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/unblock-requests', async (req, res) => {
  try {
    const requests = await UnblockRequest.findAll({
      where: { status: 'awaiting_review' },
      include: [
        { model: User, as: 'Distributor', attributes: ['name', 'province'] },
        { model: Invoice, attributes: ['id', 'full_amount', 'due_date'] }
      ],
      order: [['createdAt', 'ASC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/unblock-requests/:id/approve', async (req, res) => {
  try {
    const request = await UnblockRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'approved';
    request.reviewed_by = req.user.id;
    request.reviewed_at = new Date();
    await request.save();

    const invoice = await Invoice.findByPk(request.invoice_id);
    if (invoice) {
      invoice.status = 'paid';
      await invoice.save();
    }

    const account = await DistributorAccount.findOne({ where: { distributor_id: request.distributor_id } });
    if (account) {
      account.account_status = 'active';
      account.blocked_at = null;
      account.blocked_reason = null;
      await account.save();
    }

    req.io.to(`user_${request.distributor_id}`).emit('unblock:approved', {
      message: 'Your account has been verified and unblocked by Nestlé Lanka Admin. You can now place new orders.'
    });

    if (invoice && invoice.outlet_id) {
      req.io.to(`user_${invoice.outlet_id}`).emit('unblock:approved', {
        message: `Distributor account has been unblocked. Orders can resume.`
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/unblock-requests/:id/reject', async (req, res) => {
  try {
    const request = await UnblockRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'rejected';
    request.reviewed_by = req.user.id;
    request.reviewed_at = new Date();
    await request.save();

    req.io.to(`user_${request.distributor_id}`).emit('unblock:rejected', {
      message: 'Your unblock request was not approved. Please contact Nestlé Lanka Admin directly to resolve your account status.'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { 
          model: Order, 
          where: { receiver_type: { [Op.ne]: 'Retailer' } },
          include: [{ model: User, as: 'Recipient', attributes: ['name', 'district'] }] 
        },
        { model: Bid, include: [{ model: User, as: 'farmer', attributes: ['name', 'district'] }] }
      ]
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/bids', async (req, res) => {
  try {
    const bids = await Bid.findAll({
      include: [{ model: User, as: 'farmer', attributes: ['name', 'email'] }]
    });
    res.json(bids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/bids/:id', async (req, res) => {
  try {
    const { status, reason } = req.body;
    const bid = await Bid.findByPk(req.params.id, {
      include: [{ model: User, as: 'farmer', attributes: ['id', 'name'] }]
    });

    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    bid.status = status;
    bid.reason = reason;
    await bid.save();

    req.io.to(`user_${bid.farmerId}`).emit('notification', {
      type: 'Bid Status',
      message: `Your bid for ${bid.productType} has been ${status}. ${reason ? 'Reason: ' + reason : ''}`
    });

    res.json(bid);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/bids/:id/pay', async (req, res) => {
  try {
    const bid = await Bid.findByPk(req.params.id, {
      include: [{ model: User, as: 'farmer' }]
    });

    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    bid.status = 'Delivered & Paid';
    await bid.save();

    await Payment.create({
      type: 'Outgoing',
      amount: bid.quantity * bid.pricePerUnit,
      status: 'Paid',
      bidId: bid.id,
      paidDate: new Date()
    });

    // Increment raw material inventory logic
    let inventory = await Inventory.findOne({ 
      where: { userId: req.user.id },
      include: [{ model: Product, as: 'product', where: { name: bid.productType } }]
    });

    if (inventory) {
      inventory.quantity += bid.quantity;
      await inventory.save();
    } else {
      // If no product exists for this raw material, we might need to create it or just assume it exists
      const product = await Product.findOne({ where: { name: bid.productType } });
      if (product) {
        await Inventory.create({
          userId: req.user.id,
          productId: product.id,
          quantity: bid.quantity
        });
      }
    }

    req.io.to(`user_${bid.farmerId}`).emit('farmer:payment_released', {
      amount: bid.quantity * bid.pricePerUnit,
      message: `Payment of Rs. ${(bid.quantity * bid.pricePerUnit).toFixed(2)} has been credited to your account by Nestlé Lanka Factory`
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/unblock-requests', async (req, res) => {
  try {
    const requests = await UnblockRequest.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, as: 'Distributor', attributes: ['id', 'name', 'province'] },
        { model: Invoice, attributes: ['id', 'full_amount', 'status'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/unblock-requests/:id/approve', async (req, res) => {
  try {
    const request = await UnblockRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'approved';
    request.reviewed_by = req.user.id;
    request.reviewed_at = new Date();
    await request.save();

    // Update Distributor Account status
    const account = await DistributorAccount.findOne({ where: { distributor_id: request.distributor_id } });
    if (account) {
      account.account_status = 'active';
      await account.save();
    }

    // Update Invoice status to verified paid
    const invoice = await Invoice.findByPk(request.invoice_id);
    if (invoice) {
      invoice.status = 'paid';
      await invoice.save();
    }

    req.io.to(`user_${request.distributor_id}`).emit('unblock:approved', {
      message: 'Admin has verified your payment and unblocked your account. You can now place new orders.'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/unblock-requests/:id/reject', async (req, res) => {
  try {
    const request = await UnblockRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'rejected';
    request.reviewed_by = req.user.id;
    request.reviewed_at = new Date();
    await request.save();

    req.io.to(`user_${request.distributor_id}`).emit('unblock:rejected', {
      message: 'Your unblock request was rejected. Admin could not verify your payment. Please contact support.'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
