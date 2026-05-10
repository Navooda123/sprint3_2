const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

router.use(protect);

router.get('/contacts', async (req, res) => {
  try {
    let contacts = [];
    
    if (req.user.role === 'Distributor') {
      const coveredDistricts = req.user.district ? req.user.district.split(',').map(d => d.trim()) : [];
      contacts = await User.findAll({
        where: {
          [Op.or]: [
            { role: 'Admin' },
            { role: ['Retailer', 'Outlet'], district: { [Op.in]: coveredDistricts } }
          ]
        },
        attributes: ['id', 'name', 'role', 'district']
      });
    } else {
      contacts = await User.findAll({
        where: {
          role: { [Op.in]: ['Admin', 'Distributor'] }
        },
        attributes: ['id', 'name', 'role']
      });
      // Add virtual group contact for non-distributor (Outlet/Retailer)
      contacts.push({ id: 0, name: 'Factory & Distributor Group', role: 'Group' });
    }
    
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const recipientId = parseInt(req.params.userId);
    let whereClause;

    if (recipientId === 0) {
      // Group chat messages
      whereClause = { recipientId: 0 };
    } else {
      whereClause = {
        [Op.or]: [
          { senderId: req.user.id, recipientId },
          { senderId: recipientId, recipientId: req.user.id }
        ]
      };
    }

    const messages = await Message.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { recipientId, text } = req.body;
    const message = await Message.create({
      senderId: req.user.id,
      senderName: req.user.name,
      recipientId,
      text
    });

    if (recipientId === 0) {
      req.io.emit('new_message', message); // Broadcast to all
    } else {
      req.io.to(`user_${recipientId}`).emit('new_message', message);
    }
    
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
