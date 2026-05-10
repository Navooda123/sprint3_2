const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Bid = sequelize.define('Bid', {
  productType: {
    type: DataTypes.STRING,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pricePerUnit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  availabilityDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Accepted', 'Rejected'),
    defaultValue: 'Pending',
  },
  reason: {
    type: DataTypes.STRING,
  },
  qualityNotes: {
    type: DataTypes.TEXT,
  },
  certificateUrl: {
    type: DataTypes.STRING,
  }
}, { timestamps: true });

module.exports = Bid;
