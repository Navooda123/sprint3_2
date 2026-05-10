const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Inventory = require('../models/Inventory');
const { protect, authorize } = require('../middleware/authMiddleware');
const { logActivity } = require('../utils/logger');

router.use(protect);

router.get('/', authorize('Retailer', 'Outlet'), async (req, res) => {
  try {
    let inventory = await Inventory.findAll({ 
      where: { userId: req.user.id },
      include: [{ model: Product, as: 'product' }]
    });
    
    if (inventory.length === 0) {
      const allProducts = await Product.findAll();
      if (allProducts.length > 0) {
        const initialInventory = allProducts.map(p => ({
          userId: req.user.id,
          productId: p.id,
          quantity: Math.floor(Math.random() * 100) + 10
        }));
        await Inventory.bulkCreate(initialInventory);
        inventory = await Inventory.findAll({ 
          where: { userId: req.user.id },
          include: [{ model: Product, as: 'product' }]
        });
      }
    }

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Retailer manual reorder — routes to their assigned Distributor (province-based)
router.post('/manual-reorder', authorize('Retailer'), async (req, res) => {
  try {
    const { productId, quantity, totalAmount } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    // Find Distributor in the Retailer's province
    const distributor = await User.findOne({ 
      where: { role: 'Distributor', province: req.user.province } 
    });

    if (!distributor) {
      return res.status(400).json({ message: `No Distributor found for your province (${req.user.province || 'Not Assigned'}). Please contact Admin.` });
    }

    const order = await Order.create({
      orderNumber: 'MAN-' + Math.floor(Math.random() * 1000000),
      recipientId: req.user.id,
      supplierId: distributor ? distributor.id : null,
      distributorId: distributor ? distributor.id : null,
      totalAmount,
      status: 'Pending',
      paymentStatus: 'Paid',
      sender_type: 'Distributor',
      receiver_type: 'Retailer'
    });

    await OrderItem.create({
      orderId: order.id,
      productId,
      quantity,
      price: totalAmount / quantity
    });

    if (distributor) {
      req.io.to(`user_${distributor.id}`).emit('retailer:auto_reorder', {
        message: `Manual reorder from ${req.user.name}: ${quantity}x product. Payment confirmed.`
      });
      req.io.to(`user_${distributor.id}`).emit('notification', {
        type: 'New Retailer Order',
        message: `${req.user.name} placed a manual reorder (${quantity} units). Order: ${order.orderNumber}`
      });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/alert', authorize('Retailer', 'Outlet'), async (req, res) => {
  try {
    const { productId, currentQuantity } = req.body;
    const product = await Product.findByPk(productId);
    
    if (req.user.role === 'Retailer') {
      const distributor = await User.findOne({ where: { role: 'Distributor', province: req.user.province } });
      if (distributor) {
        req.io.to(`user_${distributor.id}`).emit('notification', {
          type: 'Low Stock Alert',
          message: `Your retailer ${req.user.name} is low on ${product.name} (${currentQuantity} left).`
        });
      }
    } else {
      req.io.to('Admin').emit('notification', {
        type: 'Low Stock',
        message: `Low stock alert from ${req.user.name}: ${product.name} is down to ${currentQuantity} units!`
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/adjust', authorize('Retailer', 'Outlet'), async (req, res) => {
  try {
    const { productId, adjustAmount, reason } = req.body;
    const inventory = await Inventory.findOne({
      where: { userId: req.user.id, productId }
    });

    if (!inventory) return res.status(404).json({ message: 'Inventory item not found' });

    const product = await Product.findByPk(productId);
    inventory.quantity = Math.max(0, inventory.quantity + adjustAmount);
    await inventory.save();

    // Auto-reorder if stock goes to 25 or below
    if (inventory.quantity <= 25) {
      const reorderQuantity = 50;
      const totalAmount = reorderQuantity * product.price;

      let supplierId = null;
      let orderLabel = 'AUTO';

      if (req.user.role === 'Retailer') {
        // Retailer auto-reorders from their assigned Distributor (province-based)
        const distributor = await User.findOne({
          where: { role: 'Distributor', province: req.user.province }
        });

        if (!distributor) {
          console.warn(`[Auto-Reorder] No distributor found for Retailer ${req.user.name} in province ${req.user.province}. Skipping.`);
        } else {
          supplierId = distributor.id;
          orderLabel = 'RETAILER-AUTO';

          // Emit retailer:auto_reorder to the Distributor
          req.io.to(`user_${distributor.id}`).emit('retailer:auto_reorder', {
            message: `Auto-reorder generated for ${req.user.name} (${reorderQuantity}x ${product.name}) due to low stock.`
          });
          req.io.to(`user_${distributor.id}`).emit('notification', {
            type: 'Auto-Reorder',
            message: `Retailer ${req.user.name} needs ${reorderQuantity}x ${product.name} - auto-reorder triggered.`
          });
        }
      } else if (req.user.role === 'Outlet') {
        // Outlet auto-reorders from Factory (Admin)
        const factory = await User.findOne({ where: { role: 'Admin' } });
        if (factory) {
          supplierId = factory.id;
          orderLabel = 'OUTLET-AUTO';

          req.io.to('Admin').emit('outlet:auto_reorder', {
            message: `Auto-reorder from Outlet ${req.user.name}: ${reorderQuantity}x ${product.name} (stock at ${inventory.quantity} units).`
          });
          req.io.to('Admin').emit('notification', {
            type: 'Low Stock Auto-Reorder',
            message: `${req.user.name} is critically low on ${product.name} (${inventory.quantity} left). Auto-reorder generated.`
          });
        }
      }

      if (supplierId) {
        const order = await Order.create({
          orderNumber: orderLabel + '-' + Math.floor(Math.random() * 1000000),
          recipientId: req.user.id,
          supplierId: supplierId,
          distributorId: req.user.role === 'Retailer' ? supplierId : null,
          totalAmount,
          status: 'Pending',
          paymentStatus: 'Pending',
          sender_type: req.user.role === 'Retailer' ? 'Distributor' : 'Factory',
          receiver_type: req.user.role
        });

        await OrderItem.create({
          orderId: order.id,
          productId,
          quantity: reorderQuantity,
          price: product.price
        });
      }
    }

    res.json({ success: true, inventory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch Reorders for Retailer
router.get('/orders', authorize('Retailer', 'Outlet'), async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { recipientId: req.user.id },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: User, as: 'Distributor', attributes: ['name', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete Order (Accept Delivery)
router.put('/orders/:id/complete', authorize('Retailer', 'Outlet'), async (req, res) => {
  try {
    const order = await Order.findOne({ 
      where: { id: req.params.id, recipientId: req.user.id },
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) return res.status(404).json({ message: 'Order not found.' });

    for (const item of order.items) {
      const invItem = await Inventory.findOne({ where: { userId: req.user.id, productId: item.productId } });
      if (invItem) {
        await invItem.update({ quantity: invItem.quantity + item.quantity });
      }
    }

    order.status = 'Completed';
    order.received_confirmed_at = new Date();
    await order.save();

    // The sender is the Distributor (or Outlet for Outlet auto-reorders)
    if (order.distributorId) {
      req.io.to(`user_${order.distributorId}`).emit('delivery:received', {
        orderId: order.id,
        message: `Order ${order.orderNumber} confirmed as received.`
      });
    } else if (order.supplierId) {
      req.io.to(`user_${order.supplierId}`).emit('delivery:received', {
        orderId: order.id,
        message: `Order ${order.orderNumber} confirmed as received.`
      });
    }

    res.json({ message: 'Order completed and inventory updated.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
