const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Member Model
 * Stores membership information
 * Requirements: 1.2, 1.7
 */
const Member = sequelize.define('Member', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
  },
  level: {
    type: DataTypes.ENUM('basic', 'pro', 'enterprise'),
    defaultValue: 'basic',
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date',
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date',
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'cancelled'),
    defaultValue: 'active',
  },
}, {
  tableName: 'members',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['end_date'] },
  ],
});

module.exports = Member;
