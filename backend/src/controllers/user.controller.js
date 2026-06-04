const UserService = require('../services/user.service');
const { success, error, paginated, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * User Controller
 * Handles user management endpoints
 * Requirements: 2.1-2.7, 3.1
 */
class UserController {
  /**
   * Get user list with pagination and filters
   * GET /api/user/list
   * Requirement: 2.1, 2.5
   */
  static async getUsers(req, res) {
    try {
      const { current, size, userName, userEmail, userPhone, userGender, status } = req.query;

      const result = await UserService.getUsers({
        current: parseInt(current, 10) || 1,
        size: parseInt(size, 10) || 10,
        userName,
        userEmail,
        userPhone,
        userGender,
        status,
      });

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      const { records, current: page, size: pageSize, total } = result.data;
      return paginated(res, records, page, pageSize, total, '查询用户列表成功');
    } catch (err) {
      logger.error('Get users error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询用户列表失败');
    }
  }

  /**
   * Get user by ID
   * GET /api/user/:id
   * Requirement: 2.1
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const result = await UserService.getUserById(parseInt(id, 10));

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '获取用户信息成功');
    } catch (err) {
      logger.error('Get user by ID error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取用户信息失败');
    }
  }


  /**
   * Create new user
   * POST /api/user
   * Requirement: 2.2, 2.6
   */
  static async createUser(req, res) {
    try {
      const { userName, password, email, nickName, phone, gender, roleIds, avatar, status } = req.body;
      const createdBy = req.user?.userId;

      const result = await UserService.createUser(
        { userName, password, email, nickName, phone, gender, roleIds, avatar, status },
        createdBy
      );

      if (!result.success) {
        if (result.error === 'USERNAME_EXISTS' || result.error === 'EMAIL_EXISTS') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`User created: ${userName}`, { createdBy });
      return success(res, result.data, '创建用户成功', 201);
    } catch (err) {
      logger.error('Create user error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '创建用户失败');
    }
  }

  /**
   * Update user
   * PUT /api/user/:id
   * Requirement: 2.3
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { nickName, email, phone, gender, status, roleIds, avatar, address, intro } = req.body;
      const updatedBy = req.user?.userId;

      const result = await UserService.updateUser(
        parseInt(id, 10),
        { nickName, email, phone, gender, status, roleIds, avatar, address, intro },
        updatedBy
      );

      if (!result.success) {
        if (result.error === 'USER_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        if (result.error === 'EMAIL_EXISTS') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`User updated: ${id}`, { updatedBy });
      return success(res, result.data, '更新用户成功');
    } catch (err) {
      logger.error('Update user error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '更新用户失败');
    }
  }

  /**
   * Delete user (soft delete)
   * DELETE /api/user/:id
   * Requirement: 2.4
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const deletedBy = req.user?.userId;

      const result = await UserService.deleteUser(parseInt(id, 10), deletedBy);

      if (!result.success) {
        if (result.error === 'USER_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`User deleted: ${id}`, { deletedBy });
      return success(res, null, '删除用户成功');
    } catch (err) {
      logger.error('Delete user error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '删除用户失败');
    }
  }

  /**
   * Batch delete users (soft delete)
   * DELETE /api/user/batch
   * Requirement: 2.4
   */
  static async batchDeleteUsers(req, res) {
    try {
      const { ids } = req.body;
      const deletedBy = req.user?.userId;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return error(res, ErrorCodes.BAD_REQUEST, '请选择要删除的用户');
      }

      const result = await UserService.batchDeleteUsers(ids, deletedBy);

      logger.info(`Users batch deleted: ${ids.join(',')}`, { deletedBy });
      return success(res, result.data, result.message);
    } catch (err) {
      logger.error('Batch delete users error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '批量删除用户失败');
    }
  }


  /**
   * Get current user info
   * GET /api/user/info
   * Requirement: 3.1
   */
  static async getCurrentUserInfo(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return error(res, ErrorCodes.UNAUTHORIZED, '未授权，请先登录');
      }

      const result = await UserService.getUserById(userId);

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '获取个人信息成功');
    } catch (err) {
      logger.error('Get current user info error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取个人信息失败');
    }
  }

  /**
   * Update current user profile
   * PUT /api/user/profile
   * Requirement: 3.2
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return error(res, ErrorCodes.UNAUTHORIZED, '未授权，请先登录');
      }

      const { nickName, email, phone, gender, avatar, address, intro, backgroundImage } = req.body;

      const result = await UserService.updateProfile(userId, {
        nickName,
        email,
        phone,
        gender,
        avatar,
        address,
        intro,
        backgroundImage,
      });

      if (!result.success) {
        if (result.error === 'EMAIL_EXISTS') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`User profile updated: ${userId}`);
      return success(res, result.data, '更新个人信息成功');
    } catch (err) {
      logger.error('Update profile error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '更新个人信息失败');
    }
  }

  /**
   * Update current user password
   * PUT /api/user/password
   * Requirement: 3.3
   */
  static async updatePassword(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return error(res, ErrorCodes.UNAUTHORIZED, '未授权，请先登录');
      }

      const { currentPassword, newPassword } = req.body;

      const result = await UserService.updatePassword(userId, currentPassword, newPassword);

      if (!result.success) {
        if (result.error === 'INVALID_PASSWORD') {
          return error(res, ErrorCodes.BAD_REQUEST, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`User password updated: ${userId}`);
      return success(res, null, '密码修改成功');
    } catch (err) {
      logger.error('Update password error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '密码修改失败');
    }
  }

  /**
   * Check if username exists
   * GET /api/user/check-username
   * Requirement: 2.6
   */
  static async checkUserName(req, res) {
    try {
      const { userName, excludeId } = req.query;

      if (!userName) {
        return error(res, ErrorCodes.BAD_REQUEST, '用户名不能为空');
      }

      const exists = await UserService.isUserNameExists(
        userName,
        excludeId ? parseInt(excludeId, 10) : null
      );

      return success(res, { exists }, exists ? '用户名已存在' : '用户名可用');
    } catch (err) {
      logger.error('Check username error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '检查用户名失败');
    }
  }

  /**
   * Check if email exists
   * GET /api/user/check-email
   * Requirement: 2.6
   */
  static async checkEmail(req, res) {
    try {
      const { email, excludeId } = req.query;

      if (!email) {
        return error(res, ErrorCodes.BAD_REQUEST, '邮箱不能为空');
      }

      const exists = await UserService.isEmailExists(
        email,
        excludeId ? parseInt(excludeId, 10) : null
      );

      return success(res, { exists }, exists ? '邮箱已存在' : '邮箱可用');
    } catch (err) {
      logger.error('Check email error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '检查邮箱失败');
    }
  }
}

module.exports = UserController;
