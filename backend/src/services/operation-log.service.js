/**
 * Operation Log Service
 * Handles sensitive operation logging for audit purposes
 * Requirements: 11.6
 */

const { Op } = require('sequelize');
const { OperationLog, User } = require('../models');

/**
 * Sensitive operation types that should be logged
 */
const SENSITIVE_ACTIONS = {
  // User operations
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_BATCH_DELETE: 'user.batch_delete',
  USER_PASSWORD_CHANGE: 'user.password_change',
  
  // Role operations
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_PERMISSION_UPDATE: 'role.permission_update',
  
  // Menu operations
  MENU_CREATE: 'menu.create',
  MENU_UPDATE: 'menu.update',
  MENU_DELETE: 'menu.delete',
  
  // Category operations
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',
  CATEGORY_RESET: 'category.reset',
  
  // Tool operations
  TOOL_CREATE: 'tool.create',
  TOOL_UPDATE: 'tool.update',
  TOOL_DELETE: 'tool.delete',
  TOOL_STATUS_CHANGE: 'tool.status_change',
  TOOL_RESET: 'tool.reset',
  
  // Auth operations
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_TOKEN_REFRESH: 'auth.token_refresh',
};

/**
 * Resource types for categorization
 */
const RESOURCES = {
  USER: 'user',
  ROLE: 'role',
  MENU: 'menu',
  CATEGORY: 'category',
  TOOL: 'tool',
  AUTH: 'auth',
  FEEDBACK: 'feedback',
};

class OperationLogService {
  /**
   * Create an operation log entry
   * Requirement: 11.6
   * @param {Object} logData - Log data
   * @param {number} logData.userId - User ID performing the action
   * @param {string} logData.action - Action type (from SENSITIVE_ACTIONS)
   * @param {string} logData.resource - Resource type (from RESOURCES)
   * @param {string|number} logData.resourceId - ID of the affected resource
   * @param {Object} logData.details - Additional details about the operation
   * @param {string} logData.ipAddress - IP address of the request
   * @returns {Promise<Object>} Created log entry
   */
  static async createLog(logData) {
    const { userId, action, resource, resourceId, details, ipAddress } = logData;

    try {
      const log = await OperationLog.create({
        userId: userId || null,
        action,
        resource,
        resourceId: resourceId ? String(resourceId) : null,
        details: details || null,
        ipAddress: ipAddress || null,
      });

      return {
        success: true,
        data: this.formatLogResponse(log),
      };
    } catch (error) {
      // Log creation should not fail silently but also not break the main operation
      console.error('Failed to create operation log:', error.message);
      return {
        success: false,
        error: 'LOG_CREATE_FAILED',
        message: '操作日志创建失败',
      };
    }
  }

  /**
   * Log a user creation operation
   * @param {number} operatorId - ID of the user performing the action
   * @param {number} createdUserId - ID of the created user
   * @param {Object} userData - User data (excluding password)
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logUserCreate(operatorId, createdUserId, userData, ipAddress) {
    const { password, ...safeUserData } = userData;
    return this.createLog({
      userId: operatorId,
      action: SENSITIVE_ACTIONS.USER_CREATE,
      resource: RESOURCES.USER,
      resourceId: createdUserId,
      details: { userData: safeUserData },
      ipAddress,
    });
  }

  /**
   * Log a user update operation
   * @param {number} operatorId - ID of the user performing the action
   * @param {number} updatedUserId - ID of the updated user
   * @param {Object} changes - Changed fields
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logUserUpdate(operatorId, updatedUserId, changes, ipAddress) {
    const { password, ...safeChanges } = changes;
    return this.createLog({
      userId: operatorId,
      action: SENSITIVE_ACTIONS.USER_UPDATE,
      resource: RESOURCES.USER,
      resourceId: updatedUserId,
      details: { changes: safeChanges },
      ipAddress,
    });
  }

  /**
   * Log a user deletion operation
   * @param {number} operatorId - ID of the user performing the action
   * @param {number} deletedUserId - ID of the deleted user
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logUserDelete(operatorId, deletedUserId, ipAddress) {
    return this.createLog({
      userId: operatorId,
      action: SENSITIVE_ACTIONS.USER_DELETE,
      resource: RESOURCES.USER,
      resourceId: deletedUserId,
      details: null,
      ipAddress,
    });
  }

  /**
   * Log a batch user deletion operation
   * @param {number} operatorId - ID of the user performing the action
   * @param {Array<number>} deletedUserIds - IDs of the deleted users
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logUserBatchDelete(operatorId, deletedUserIds, ipAddress) {
    return this.createLog({
      userId: operatorId,
      action: SENSITIVE_ACTIONS.USER_BATCH_DELETE,
      resource: RESOURCES.USER,
      resourceId: null,
      details: { deletedUserIds },
      ipAddress,
    });
  }

  /**
   * Log a password change operation
   * @param {number} userId - ID of the user changing password
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logPasswordChange(userId, ipAddress) {
    return this.createLog({
      userId,
      action: SENSITIVE_ACTIONS.USER_PASSWORD_CHANGE,
      resource: RESOURCES.USER,
      resourceId: userId,
      details: null,
      ipAddress,
    });
  }

  /**
   * Log a role creation operation
   * @param {number} operatorId - ID of the user performing the action
   * @param {number} createdRoleId - ID of the created role
   * @param {Object} roleData - Role data
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logRoleCreate(operatorId, createdRoleId, roleData, ipAddress) {
    return this.createLog({
      userId: operatorId,
      action: SENSITIVE_ACTIONS.ROLE_CREATE,
      resource: RESOURCES.ROLE,
      resourceId: createdRoleId,
      details: { roleData },
      ipAddress,
    });
  }

  /**
   * Log a role update operation
   * @param {number} operatorId - ID of the user performing the action
   * @param {number} updatedRoleId - ID of the updated role
   * @param {Object} changes - Changed fields
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logRoleUpdate(operatorId, updatedRoleId, changes, ipAddress) {
    return this.createLog({
      userId: operatorId,
      action: SENSITIVE_ACTIONS.ROLE_UPDATE,
      resource: RESOURCES.ROLE,
      resourceId: updatedRoleId,
      details: { changes },
      ipAddress,
    });
  }

  /**
   * Log a role deletion operation
   * @param {number} operatorId - ID of the user performing the action
   * @param {number} deletedRoleId - ID of the deleted role
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logRoleDelete(operatorId, deletedRoleId, ipAddress) {
    return this.createLog({
      userId: operatorId,
      action: SENSITIVE_ACTIONS.ROLE_DELETE,
      resource: RESOURCES.ROLE,
      resourceId: deletedRoleId,
      details: null,
      ipAddress,
    });
  }

  /**
   * Log a role permission update operation
   * @param {number} operatorId - ID of the user performing the action
   * @param {number} roleId - ID of the role
   * @param {Array<number>} menuIds - New menu IDs
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logRolePermissionUpdate(operatorId, roleId, menuIds, ipAddress) {
    return this.createLog({
      userId: operatorId,
      action: SENSITIVE_ACTIONS.ROLE_PERMISSION_UPDATE,
      resource: RESOURCES.ROLE,
      resourceId: roleId,
      details: { menuIds },
      ipAddress,
    });
  }

  /**
   * Log a login operation
   * @param {number} userId - ID of the user logging in
   * @param {string} userName - Username
   * @param {boolean} success - Whether login was successful
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logLogin(userId, userName, success, ipAddress) {
    return this.createLog({
      userId: success ? userId : null,
      action: SENSITIVE_ACTIONS.AUTH_LOGIN,
      resource: RESOURCES.AUTH,
      resourceId: userId,
      details: { userName, success },
      ipAddress,
    });
  }

  /**
   * Log a logout operation
   * @param {number} userId - ID of the user logging out
   * @param {string} ipAddress - IP address
   * @returns {Promise<Object>} Log result
   */
  static async logLogout(userId, ipAddress) {
    return this.createLog({
      userId,
      action: SENSITIVE_ACTIONS.AUTH_LOGOUT,
      resource: RESOURCES.AUTH,
      resourceId: userId,
      details: null,
      ipAddress,
    });
  }

  /**
   * Get operation logs with pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated log list
   */
  static async getLogs(params = {}) {
    const {
      current = 1,
      size = 10,
      userId,
      action,
      resource,
      startDate,
      endDate,
    } = params;

    const where = {};

    if (userId) {
      where.userId = userId;
    }
    if (action) {
      where.action = { [Op.like]: `%${action}%` };
    }
    if (resource) {
      where.resource = resource;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const offset = (current - 1) * size;

    const { count, rows } = await OperationLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'userName', 'nickName'],
        },
      ],
      offset,
      limit: size,
      order: [['createdAt', 'DESC']],
    });

    const records = rows.map(log => this.formatLogResponse(log));

    return {
      success: true,
      data: {
        records,
        current: parseInt(current, 10),
        size: parseInt(size, 10),
        total: count,
      },
    };
  }

  /**
   * Get logs by resource
   * @param {string} resource - Resource type
   * @param {string|number} resourceId - Resource ID
   * @returns {Promise<Object>} Log list
   */
  static async getLogsByResource(resource, resourceId) {
    const logs = await OperationLog.findAll({
      where: {
        resource,
        resourceId: String(resourceId),
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'userName', 'nickName'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return {
      success: true,
      data: logs.map(log => this.formatLogResponse(log)),
    };
  }

  /**
   * Format log response
   * @param {Object} log - Log model instance
   * @returns {Object} Formatted log data
   */
  static formatLogResponse(log) {
    const logData = log.toJSON ? log.toJSON() : log;
    return {
      id: logData.id,
      userId: logData.userId,
      userName: logData.user ? logData.user.userName || logData.user.nickName : null,
      action: logData.action,
      resource: logData.resource,
      resourceId: logData.resourceId,
      details: logData.details,
      ipAddress: logData.ipAddress,
      createdAt: logData.createdAt,
    };
  }

  /**
   * Clean up old logs (older than specified days)
   * @param {number} days - Number of days to keep logs
   * @returns {Promise<number>} Number of deleted logs
   */
  static async cleanupOldLogs(days = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await OperationLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate },
      },
    });

    return result;
  }
}

// Export constants for use in other modules
OperationLogService.SENSITIVE_ACTIONS = SENSITIVE_ACTIONS;
OperationLogService.RESOURCES = RESOURCES;

module.exports = OperationLogService;
