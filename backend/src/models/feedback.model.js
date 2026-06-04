const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Feedback = sequelize.define('Feedback', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.ENUM('suggestion', 'bug', 'other'),
    allowNull: false,
    validate: {
      notEmpty: { msg: '反馈类型不能为空' },
    },
  },
  toolId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tool_id',
    references: {
      model: 'tools',
      key: 'id',
    },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: '反馈内容不能为空' },
    },
  },
  contact: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'resolved'),
    defaultValue: 'pending',
  },
  reply: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'feedbacks',
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Feedback;
