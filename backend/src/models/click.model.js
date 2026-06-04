const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Click = sequelize.define('Click', {
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
  elementId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'element_id',
  },
  pagePath: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'page_path',
  },
}, {
  tableName: 'clicks',
  paranoid: false, // No soft delete for click records
  updatedAt: false, // No updated_at for click records
  indexes: [
    { fields: ['visitor_id'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Click;
