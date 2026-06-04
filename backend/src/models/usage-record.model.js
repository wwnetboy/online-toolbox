const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Usage Record Model
 * Tracks feature usage for rate limiting
 * Requirements: 1.3, 1.6
 */
const UsageRecord = sequelize.define('UsageRecord', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
  },
  visitorId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'visitor_id',
  },
  featureId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'feature_id',
    validate: {
      notEmpty: { msg: '功能标识不能为空' },
    },
  },
  usedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'used_at',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
  },
}, {
  tableName: 'usage_records',
  timestamps: false, // Using usedAt instead
  paranoid: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['visitor_id'] },
    { fields: ['feature_id'] },
    { fields: ['used_at'] },
  ],
});

module.exports = UsageRecord;
