const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DeliveryConfirmation = sequelize.define('DeliveryConfirmation', {
  tier: {
    type: DataTypes.ENUM('retailer', 'outlet', 'factory', 'distributor'),
    allowNull: false,
  },
  confirmed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  stock_updated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
}, { timestamps: true });

module.exports = DeliveryConfirmation;
