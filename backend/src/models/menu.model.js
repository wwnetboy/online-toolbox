const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Menu = sequelize.define('Menu', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'parent_id',
    references: {
      model: 'menus',
      key: 'id',
    },
  },
  path: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: '路径不能为空' },
    },
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: '名称不能为空' },
    },
  },
  component: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  redirect: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  icon: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  sort: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  hidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  meta: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'menus',
  indexes: [
    { fields: ['parent_id'] },
    { fields: ['sort'] },
  ],
});

// Self-referencing association for parent-child relationship
Menu.hasMany(Menu, { as: 'children', foreignKey: 'parentId' });
Menu.belongsTo(Menu, { as: 'parent', foreignKey: 'parentId' });

module.exports = Menu;
