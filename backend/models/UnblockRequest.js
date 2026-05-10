const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UnblockRequest = sequelize.define('UnblockRequest', {
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payment_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('awaiting_review', 'approved', 'rejected'),
    defaultValue: 'awaiting_review',
  },
  reviewed_at: {
    type: DataTypes.DATE,
  }
}, { timestamps: true });

module.exports = UnblockRequest;
