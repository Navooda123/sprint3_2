const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  full_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discounted_amount: {
    type: DataTypes.DECIMAL(10, 2),
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  payment_type: {
    type: DataTypes.ENUM('immediate', 'credit'),
    allowNull: false,
  },
  discount_applied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'paid_discounted', 'paid_pending_verification', 'overdue'),
    defaultValue: 'pending',
  },
  due_date: {
    type: DataTypes.DATE,
  },
  paid_at: {
    type: DataTypes.DATE,
  }
}, { timestamps: true });

module.exports = Invoice;
