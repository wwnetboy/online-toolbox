const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'user_name',
    validate: {
      notEmpty: { msg: '用户名不能为空' },
      len: { args: [2, 50], msg: '用户名长度应在2-50个字符之间' },
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: '密码不能为空' },
    },
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: '邮箱格式不正确' },
      notEmpty: { msg: '邮箱不能为空' },
    },
  },
  nickName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'nick_name',
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: { args: /^1[3-9]\d{9}$|^$/, msg: '手机号格式不正确' },
    },
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'unknown'),
    defaultValue: 'unknown',
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  backgroundImage: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'background_image',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  intro: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Audit fields
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by',
  },
  // Soft delete field
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at',
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { fields: ['user_name'] },
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['deleted_at'] },
  ],
});

module.exports = User;
