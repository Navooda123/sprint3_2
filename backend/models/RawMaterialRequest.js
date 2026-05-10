const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RawMaterialRequest = sequelize.define('RawMaterialRequest', {
  materialName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantityNeeded: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  requiredByDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  qualitySpecs: {
    type: DataTypes.TEXT,
  },
  minPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  maxPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Open', 'Closed', 'Fulfilled'),
    defaultValue: 'Open',
  }
}, { timestamps: true });

module.exports = RawMaterialRequest;
