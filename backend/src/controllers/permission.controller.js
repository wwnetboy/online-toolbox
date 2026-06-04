const PermissionService = require('../services/permission.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Permission Controller
 * Handles feature permission checking and usage tracking
 * Requirements: 1.1, 1.2, 1.3
 */
class PermissionController {
  /**
   * Get feature configuration
   * GET /api/permission/config/:featureId
   * Requirement: 1.1
   */
  static async getFeatureConfig(req, res) {
    try {
      const { featureId } = req.params;

      const result = await PermissionService.getFeatureConfig(featureId);

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '获取功能配置成功');
    } catch (err) {
      logger.error('Get feature config error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取功能配置失败');
    }
  }

  /**
   * Get all feature configurations
   * GET /api/permission/configs
   * Requirement: 1.1
   */
  static async getAllFeatureConfigs(req, res) {
    try {
      const { category, enabled } = req.query;

      const result = await PermissionService.getAllFeatureConfigs({
        category,
        enabled: enabled !== undefined ? enabled === 'true' : undefined,
      });

      return success(res, result.data, '获取功能配置列表成功');
    } catch (err) {
      logger.error('Get all feature configs error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取功能配置列表失败');
    }
  }

  /**
   * Check permission for a feature
   * POST /api/permission/check
   * Requirement: 1.2, 1.3
   */
  static async checkPermission(req, res) {
    try {
      const { featureId, visitorId } = req.body;
      const userId = req.user?.userId || null;

      if (!featureId) {
        return error(res, ErrorCodes.BAD_REQUEST, '功能标识不能为空');
      }

      const result = await PermissionService.checkPermission(
        featureId,
        userId,
        visitorId
      );

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, '权限检查失败');
      }

      return success(res, result.data, '权限检查完成');
    } catch (err) {
      logger.error('Check permission error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '权限检查失败');
    }
  }

  /**
   * Record feature usage
   * POST /api/permission/record
   * Requirement: 1.3
   */
  static async recordUsage(req, res) {
    try {
      const { featureId, visitorId } = req.body;
      const userId = req.user?.userId || null;
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!featureId) {
        return error(res, ErrorCodes.BAD_REQUEST, '功能标识不能为空');
      }

      const result = await PermissionService.recordUsage(
        featureId,
        userId,
        visitorId,
        ipAddress
      );

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, null, '使用记录已保存');
    } catch (err) {
      logger.error('Record usage error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '记录使用失败');
    }
  }

  /**
   * Get remaining count for a feature
   * POST /api/permission/remaining
   * Requirement: 1.6
   */
  static async getRemainingCount(req, res) {
    try {
      const { featureId, visitorId } = req.body;
      const userId = req.user?.userId || null;

      if (!featureId) {
        return error(res, ErrorCodes.BAD_REQUEST, '功能标识不能为空');
      }

      const result = await PermissionService.getRemainingCount(
        featureId,
        userId,
        visitorId
      );

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '获取剩余次数成功');
    } catch (err) {
      logger.error('Get remaining count error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取剩余次数失败');
    }
  }

  /**
   * Get member info for current user
   * GET /api/permission/member
   * Requirement: 1.2
   */
  static async getMemberInfo(req, res) {
    try {
      const userId = req.user?.userId || null;

      const result = await PermissionService.getMemberInfo(userId);

      return success(res, result, '获取会员信息成功');
    } catch (err) {
      logger.error('Get member info error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取会员信息失败');
    }
  }

  /**
   * Update feature configuration (Admin only)
   * PUT /api/permission/config/:featureId
   * Requirement: 1.4, 1.5
   */
  static async updateFeatureConfig(req, res) {
    try {
      const { featureId } = req.params;
      const updates = req.body;

      const result = await PermissionService.updateFeatureConfig(featureId, updates);

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      logger.info(`Feature config updated: ${featureId}`, { updates });
      return success(res, result.data, '功能配置更新成功');
    } catch (err) {
      logger.error('Update feature config error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '更新功能配置失败');
    }
  }

  /**
   * Batch update feature configurations by category (Admin only)
   * PUT /api/permission/batch/:category
   * Requirement: 1.9
   */
  static async batchUpdateByCategory(req, res) {
    try {
      const { category } = req.params;
      const updates = req.body;

      const result = await PermissionService.batchUpdateByCategory(category, updates);

      logger.info(`Batch update for category: ${category}`, { updates, affectedCount: result.data.affectedCount });
      return success(res, result.data, '批量更新成功');
    } catch (err) {
      logger.error('Batch update error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '批量更新失败');
    }
  }
}

module.exports = PermissionController;
