const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
}, {
  tableName: 'refresh_tokens',
  paranoid: false, // No soft delete for tokens
  updatedAt: false, // No updated_at for tokens
  indexes: [
    { fields: ['token'], length: 255 },
    { fields: ['user_id'] },
    { fields: ['expires_at'] },
  ],
});

module.exports = RefreshToken;
