const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Alert = sequelize.define('Alert', {
  type: {
    type: DataTypes.ENUM('Low Stock', 'Payment Confirmed', 'Dispatch', 'Delivery Update', 'Bid Status', 'General'),
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  link: {
    type: DataTypes.STRING,
  }
}, { timestamps: true });

module.exports = Alert;
