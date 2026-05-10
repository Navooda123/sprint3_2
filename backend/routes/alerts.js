const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      where: { recipientId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const alert = await Alert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    
    alert.isRead = true;
    await alert.save();
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
