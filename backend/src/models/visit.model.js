const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Visit = sequelize.define('Visit', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  visitorId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'visitor_id',
  },
  pagePath: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'page_path',
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'user_agent',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
  },
}, {
  tableName: 'visits',
  paranoid: false, // No soft delete for visit records
  updatedAt: false, // No updated_at for visit records
  indexes: [
    { fields: ['visitor_id'] },
    { fields: ['page_path'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Visit;
