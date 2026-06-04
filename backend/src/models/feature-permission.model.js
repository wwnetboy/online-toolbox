const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Feature Permission Model
 * Stores configuration for each feature's permission settings
 * Requirements: 1.1, 1.5
 */
const FeaturePermission = sequelize.define('FeaturePermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  featureId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'feature_id',
    validate: {
      notEmpty: { msg: '功能标识不能为空' },
    },
  },
  featureName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'feature_name',
    validate: {
      notEmpty: { msg: '功能名称不能为空' },
    },
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: '分类不能为空' },
    },
  },
  requireMember: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'require_member',
  },
  freeTrialCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'free_trial_count',
    validate: {
      min: { args: [0], msg: '免费次数不能为负数' },
    },
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'feature_permissions',
  timestamps: true,
  paranoid: false, // No soft delete for feature permissions
  indexes: [
    { fields: ['feature_id'], unique: true },
    { fields: ['category'] },
    { fields: ['enabled'] },
  ],
});

module.exports = FeaturePermission;
