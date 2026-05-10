const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('Admin', 'Farmer', 'Outlet', 'Distributor', 'Retailer'),
    allowNull: false,
  },
  lat: {
    type: DataTypes.DECIMAL(10, 8),
  },
  lng: {
    type: DataTypes.DECIMAL(11, 8),
  },
  address: {
    type: DataTypes.STRING,
  },
  nic: {
    type: DataTypes.STRING,
  },
  province: {
    type: DataTypes.STRING,
  },
  district: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  bankName: {
    type: DataTypes.STRING,
  },
  bankAccount: {
    type: DataTypes.STRING,
  },
  accountHolder: {
    type: DataTypes.STRING,
  },
  farmType: {
    type: DataTypes.STRING,
  },
  vehicleRegistration: {
    type: DataTypes.STRING,
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password && !user.password.startsWith('$2a$')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && !user.password.startsWith('$2a$')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
