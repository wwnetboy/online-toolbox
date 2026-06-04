const { sequelize } = require('../config/database');

// Import all models
const User = require('./user.model');
const Role = require('./role.model');
const Menu = require('./menu.model');
const Category = require('./category.model');
const Tool = require('./tool.model');
const Feedback = require('./feedback.model');
const Visit = require('./visit.model');
const Click = require('./click.model');
const RefreshToken = require('./refresh-token.model');
const OperationLog = require('./operation-log.model');
const FeaturePermission = require('./feature-permission.model');
const UsageRecord = require('./usage-record.model');
const Member = require('./member.model');

// ============================================
// User-Role Many-to-Many Association
// ============================================
User.belongsToMany(Role, {
  through: 'user_roles',
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'roles',
});

Role.belongsToMany(User, {
  through: 'user_roles',
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'users',
});

// ============================================
// Role-Menu Many-to-Many Association
// ============================================
Role.belongsToMany(Menu, {
  through: 'role_menus',
  foreignKey: 'role_id',
  otherKey: 'menu_id',
  as: 'menus',
});

Menu.belongsToMany(Role, {
  through: 'role_menus',
  foreignKey: 'menu_id',
  otherKey: 'role_id',
  as: 'roles',
});

// ============================================
// Category-Tool One-to-Many Association
// ============================================
Category.hasMany(Tool, {
  foreignKey: 'categoryId',
  as: 'tools',
});

Tool.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});

// ============================================
// Tool-Feedback One-to-Many Association
// ============================================
Tool.hasMany(Feedback, {
  foreignKey: 'toolId',
  as: 'feedbacks',
});

Feedback.belongsTo(Tool, {
  foreignKey: 'toolId',
  as: 'tool',
});

// ============================================
// User-RefreshToken One-to-Many Association
// ============================================
User.hasMany(RefreshToken, {
  foreignKey: 'userId',
  as: 'refreshTokens',
});

RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ============================================
// User-OperationLog One-to-Many Association
// ============================================
User.hasMany(OperationLog, {
  foreignKey: 'userId',
  as: 'operationLogs',
});

OperationLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ============================================
// User Self-Reference for Audit Fields
// ============================================
User.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

User.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater',
});

// ============================================
// User-Member One-to-Many Association
// ============================================
User.hasMany(Member, {
  foreignKey: 'userId',
  as: 'memberships',
});

Member.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ============================================
// User-UsageRecord One-to-Many Association
// ============================================
User.hasMany(UsageRecord, {
  foreignKey: 'userId',
  as: 'usageRecords',
});

UsageRecord.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Sync all models with database
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('Database synchronized successfully.');
    return true;
  } catch (error) {
    console.error('Error synchronizing database:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  User,
  Role,
  Menu,
  Category,
  Tool,
  Feedback,
  Visit,
  Click,
  RefreshToken,
  OperationLog,
  FeaturePermission,
  UsageRecord,
  Member,
};
