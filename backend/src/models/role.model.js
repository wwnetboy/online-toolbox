const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  roleName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'role_name',
    validate: {
      notEmpty: { msg: '角色名称不能为空' },
    },
  },
  roleCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'role_code',
    validate: {
      notEmpty: { msg: '角色编码不能为空' },
    },
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'roles',
  indexes: [
    { fields: ['role_code'] },
    { fields: ['enabled'] },
  ],
});

module.exports = Role;
