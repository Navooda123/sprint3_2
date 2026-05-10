const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DistributorAccount = sequelize.define('DistributorAccount', {
  province_id: {
    type: DataTypes.STRING,
  },
  account_status: {
    type: DataTypes.ENUM('active', 'blocked'),
    defaultValue: 'active',
  },
  blocked_at: {
    type: DataTypes.DATE,
  },
  blocked_reason: {
    type: DataTypes.STRING,
  }
}, { timestamps: true });

module.exports = DistributorAccount;
