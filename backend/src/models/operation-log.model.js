const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OperationLog = sequelize.define('OperationLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  resource: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  resourceId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'resource_id',
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
  },
}, {
  tableName: 'operation_logs',
  paranoid: false, // No soft delete for logs
  updatedAt: false, // No updated_at for logs
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['created_at'] },
  ],
});

module.exports = OperationLog;
