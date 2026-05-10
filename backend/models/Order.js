const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Order = sequelize.define('Order', {
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Accepted', 'Dispatched', 'In Transit', 'Delivered', 'Completed'),
    defaultValue: 'Pending',
  },
  paymentStatus: {
    type: DataTypes.ENUM('Pending', 'Paid'),
    defaultValue: 'Pending',
  },
  sender_type: {
    type: DataTypes.ENUM('Factory', 'Outlet', 'Distributor', 'Farmer', 'Retailer'),
  },
  receiver_type: {
    type: DataTypes.ENUM('Factory', 'Outlet', 'Distributor', 'Farmer', 'Retailer'),
  },
  received_confirmed_at: {
    type: DataTypes.DATE,
  },
  currentLat: {
    type: DataTypes.DECIMAL(10, 8),
  },
  currentLng: {
    type: DataTypes.DECIMAL(11, 8),
  },
  estimatedDelivery: {
    type: DataTypes.DATE,
  }
}, { timestamps: true });

module.exports = Order;
