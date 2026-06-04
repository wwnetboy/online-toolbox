const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tool = sequelize.define('Tool', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: '工具名称不能为空' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  icon: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '图标名称（Iconify，向后兼容）',
  },
  iconUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'icon_url',
    comment: '上传图标的 URL 路径',
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '图标颜色（向后兼容）',
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'category_id',
    references: {
      model: 'categories',
      key: 'id',
    },
  },
  route: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: '路由不能为空' },
    },
  },
  badge: {
    type: DataTypes.ENUM('hot', 'new'),
    allowNull: true,
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  sort: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at',
  },
  featureId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'feature_id',
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
  },
}, {
  tableName: 'tools',
  paranoid: false, // We handle soft delete manually in service
  indexes: [
    { fields: ['category_id'] },
    { fields: ['enabled'] },
    { fields: ['sort'] },
    { fields: ['deleted_at'] },
  ],
});

module.exports = Tool;
