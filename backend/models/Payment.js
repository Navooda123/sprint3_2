const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payment = sequelize.define('Payment', {
  type: {
    type: DataTypes.ENUM('Incoming', 'Outgoing'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  bankName: {
    type: DataTypes.STRING,
  },
  accountNumber: {
    type: DataTypes.STRING,
  },
  accountHolder: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Paid', 'Overdue'),
    defaultValue: 'Pending',
  },
  dueDate: {
    type: DataTypes.DATE,
  },
  paidDate: {
    type: DataTypes.DATE,
  }
}, { timestamps: true });

module.exports = Payment;
