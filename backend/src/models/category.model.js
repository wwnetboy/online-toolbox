const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  identifier: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: '分类标识不能为空' },
    },
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: '分类名称不能为空' },
    },
  },
  icon: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  sort: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_system',
  },
}, {
  tableName: 'categories',
  indexes: [
    { fields: ['identifier'] },
    { fields: ['sort'] },
  ],
});

module.exports = Category;
