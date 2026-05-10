const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
  },
  userName: {
    type: DataTypes.STRING,
  },
  role: {
    type: DataTypes.STRING,
  },
  details: {
    type: DataTypes.TEXT,
  }
}, { timestamps: true });

module.exports = AuditLog;
