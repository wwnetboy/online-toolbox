/**
 * Site Setting Model
 * Stores system configuration as key-value pairs with JSON values
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SiteSetting = sequelize.define('SiteSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  settingKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'setting_key',
  },
  settingValue: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'setting_value',
  },
}, {
  tableName: 'site_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: false,  // Disable soft delete for settings table
});

module.exports = SiteSetting;
