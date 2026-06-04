const AuthService = require('../services/auth.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Authentication Controller
 * Handles registration, login, token refresh, and logout endpoints
 * Requirements: 1.1, 1.6, 1.7
 */
class AuthController {
  /**
   * User registration
   * POST /api/auth/register
   */
  static async register(req, res) {
    try {
      const { userName, email, password, nickName, phone, gender } = req.body;

      const result = await AuthService.register({
        userName,
        email,
        password,
        nickName,
        phone,
        gender
      });

      if (!result.success) {
        logger.warn(`Registration failed for user: ${userName}`, { error: result.error });
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`New user registered: ${userName}`);
      return success(res, result.data, result.message || '注册成功');
    } catch (err) {
      logger.error('Registration error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '注册失败，请稍后重试');
    }
  }

  /**
   * User login
   * POST /api/auth/login
   * Requirement: 1.1
   */
  static async login(req, res) {
    try {
      const { userName, password } = req.body;

      const result = await AuthService.login(userName, password);

      if (!result.success) {
        logger.warn(`Login failed for user: ${userName}`, { error: result.error });
        return error(res, ErrorCodes.UNAUTHORIZED, result.message);
      }

      logger.info(`User logged in: ${userName}`);
      return success(res, result.data, '登录成功');
    } catch (err) {
      logger.error('Login error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '登录失败，请稍后重试');
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   * Requirement: 1.6
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return error(res, ErrorCodes.BAD_REQUEST, '刷新令牌不能为空');
      }

      const result = await AuthService.refreshAccessToken(refreshToken);

      if (!result.success) {
        logger.warn('Token refresh failed', { error: result.error });
        return error(res, ErrorCodes.UNAUTHORIZED, result.message);
      }

      return success(res, result.data, '令牌刷新成功');
    } catch (err) {
      logger.error('Token refresh error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '令牌刷新失败，请稍后重试');
    }
  }

  /**
   * User logout
   * POST /api/auth/logout
   * Requirement: 1.7
   */
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.userId;

      const result = await AuthService.logout(refreshToken, userId);

      if (!result.success) {
        logger.warn('Logout failed', { userId, error: result.error });
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      logger.info(`User logged out: ${userId}`);
      return success(res, null, '登出成功');
    } catch (err) {
      logger.error('Logout error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '登出失败，请稍后重试');
    }
  }

  /**
   * Get current user info
   * GET /api/user/info
   * Requirement: 1.3
   */
  static async getUserInfo(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return error(res, ErrorCodes.UNAUTHORIZED, '未授权，请先登录');
      }

      const result = await AuthService.getUserInfo(userId);

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '获取用户信息成功');
    } catch (err) {
      logger.error('Get user info error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取用户信息失败');
    }
  }
}

module.exports = AuthController;
