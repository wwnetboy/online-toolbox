const { Op } = require('sequelize');
const { Tool, Category, UsageRecord, Member } = require('../models');

/**
 * Permission Service
 * Handles feature permission checking, usage tracking, and member validation
 * Requirements: 1.1, 1.2, 1.3, 1.6
 */
class PermissionService {
  /**
   * Get feature configuration by feature ID
   * Requirement: 1.1
   * @param {string} featureId - Feature identifier
   * @returns {Promise<Object>} Feature configuration
   */
  static async getFeatureConfig(featureId) {
    const tool = await Tool.findOne({
      where: { featureId, deletedAt: null },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'identifier', 'name'],
          required: false,
        },
      ],
    });

    if (!tool) {
      return {
        success: false,
        error: 'FEATURE_NOT_FOUND',
        message: '功能不存在',
      };
    }

    return {
      success: true,
      data: {
        featureId: tool.featureId,
        featureName: tool.name,
        category: tool.category?.identifier || '',
        requireMember: tool.requireMember,
        freeTrialCount: tool.freeTrialCount,
        enabled: tool.enabled,
      },
    };
  }

  /**
   * Get all feature configurations
   * Requirement: 1.1
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of feature configurations
   */
  static async getAllFeatureConfigs(options = {}) {
    const { category, enabled } = options;
    const where = {};
    const categoryWhere = {};

    if (enabled !== undefined) {
      where.enabled = enabled;
    }
    // Exclude soft-deleted tools (paranoid is off for Tool model)
    where.deletedAt = null;

    const include = [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'identifier', 'name'],
        required: !!category,
      },
    ];

    if (category) {
      categoryWhere.identifier = category;
      include[0].where = categoryWhere;
    }

    const tools = await Tool.findAll({
      where,
      include,
      order: [[{ model: Category, as: 'category' }, 'identifier', 'ASC'], ['sort', 'ASC']],
    });

    // Filter out tools without featureId (not yet configured as features)
    const featureTools = tools.filter(t => t.featureId);

    return {
      success: true,
      data: featureTools.map(t => ({
        featureId: t.featureId,
        featureName: t.name,
        category: t.category?.identifier || '',
        requireMember: t.requireMember,
        freeTrialCount: t.freeTrialCount,
        enabled: t.enabled,
      })),
    };
  }

  /**
   * Check if user is a valid member
   * Requirement: 1.2
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if user is an active member
   */
  static async isActiveMember(userId) {
    if (!userId) return false;

    const today = new Date().toISOString().split('T')[0];
    const member = await Member.findOne({
      where: {
        userId,
        status: 'active',
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today },
      },
    });

    return !!member;
  }

  /**
   * Get member info for a user
   * Requirement: 1.2
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Member information
   */
  static async getMemberInfo(userId) {
    if (!userId) {
      return { isMember: false };
    }

    const today = new Date().toISOString().split('T')[0];
    const member = await Member.findOne({
      where: {
        userId,
        status: 'active',
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today },
      },
    });

    if (!member) {
      return { isMember: false };
    }

    return {
      isMember: true,
      level: member.level,
      startDate: member.startDate,
      endDate: member.endDate,
    };
  }

  /**
   * Get today's usage count for a user/visitor on a feature
   * Requirement: 1.6
   * @param {string} featureId - Feature identifier
   * @param {number|null} userId - User ID (null for visitors)
   * @param {string|null} visitorId - Visitor ID (for non-logged-in users)
   * @returns {Promise<number>} Usage count for today
   */
  static async getTodayUsageCount(featureId, userId, visitorId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      featureId,
      usedAt: {
        [Op.gte]: today,
        [Op.lt]: tomorrow,
      },
    };

    // Use userId if available, otherwise use visitorId
    if (userId) {
      where.userId = userId;
    } else if (visitorId) {
      where.visitorId = visitorId;
    } else {
      // No identifier provided, cannot track usage
      return 0;
    }

    const count = await UsageRecord.count({ where });
    return count;
  }

  /**
   * Get remaining free trial count for a feature
   * Requirement: 1.6
   * @param {string} featureId - Feature identifier
   * @param {number|null} userId - User ID
   * @param {string|null} visitorId - Visitor ID
   * @returns {Promise<Object>} Remaining count info
   */
  static async getRemainingCount(featureId, userId, visitorId) {
    const configResult = await this.getFeatureConfig(featureId);
    if (!configResult.success) {
      return configResult;
    }

    const config = configResult.data;

    // If feature doesn't require member, unlimited usage
    if (!config.requireMember) {
      return {
        success: true,
        data: {
          unlimited: true,
          remaining: -1,
          total: -1,
        },
      };
    }

    // If user is a member, unlimited usage
    const isMember = await this.isActiveMember(userId);
    if (isMember) {
      return {
        success: true,
        data: {
          unlimited: true,
          remaining: -1,
          total: -1,
          isMember: true,
        },
      };
    }

    // For non-members, check free trial count
    const usedCount = await this.getTodayUsageCount(featureId, userId, visitorId);
    const remaining = Math.max(0, config.freeTrialCount - usedCount);

    return {
      success: true,
      data: {
        unlimited: false,
        remaining,
        total: config.freeTrialCount,
        used: usedCount,
        isMember: false,
      },
    };
  }

  /**
   * Check permission for a feature
   * Requirement: 1.2, 1.3, 1.6
   * @param {string} featureId - Feature identifier
   * @param {number|null} userId - User ID
   * @param {string|null} visitorId - Visitor ID
   * @returns {Promise<Object>} Permission check result
   */
  static async checkPermission(featureId, userId, visitorId) {
    // Get feature configuration
    const configResult = await this.getFeatureConfig(featureId);
    if (!configResult.success) {
      return {
        success: true,
        data: {
          allowed: false,
          reason: 'feature_disabled',
          message: '功能不存在或已禁用',
        },
      };
    }

    const config = configResult.data;

    // Check if feature is enabled
    if (!config.enabled) {
      return {
        success: true,
        data: {
          allowed: false,
          reason: 'feature_disabled',
          message: '该功能已禁用',
        },
      };
    }

    // If feature doesn't require member, allow access
    if (!config.requireMember) {
      return {
        success: true,
        data: {
          allowed: true,
          requireMember: false,
        },
      };
    }

    // Check if user is a member
    const isMember = await this.isActiveMember(userId);
    if (isMember) {
      return {
        success: true,
        data: {
          allowed: true,
          isMember: true,
        },
      };
    }

    // For non-members, check free trial count
    if (config.freeTrialCount > 0) {
      const usedCount = await this.getTodayUsageCount(featureId, userId, visitorId);
      const remaining = config.freeTrialCount - usedCount;

      if (remaining > 0) {
        return {
          success: true,
          data: {
            allowed: true,
            isMember: false,
            remainingCount: remaining,
            requireMember: true,
          },
        };
      }

      // Free trial exhausted
      return {
        success: true,
        data: {
          allowed: false,
          reason: 'limit_exceeded',
          message: '今日免费次数已用完，请开通会员继续使用',
          remainingCount: 0,
          requireMember: true,
        },
      };
    }

    // No free trial available, member required
    return {
      success: true,
      data: {
        allowed: false,
        reason: 'not_member',
        message: '该功能需要会员权限',
        requireMember: true,
      },
    };
  }

  /**
   * Record feature usage
   * Requirement: 1.3, 1.6
   * @param {string} featureId - Feature identifier
   * @param {number|null} userId - User ID
   * @param {string|null} visitorId - Visitor ID
   * @param {string|null} ipAddress - IP address
   * @returns {Promise<Object>} Record result
   */
  static async recordUsage(featureId, userId, visitorId, ipAddress) {
    // Verify feature exists
    const configResult = await this.getFeatureConfig(featureId);
    if (!configResult.success) {
      return {
        success: false,
        error: 'FEATURE_NOT_FOUND',
        message: '功能不存在',
      };
    }

    // Create usage record
    await UsageRecord.create({
      userId: userId || null,
      visitorId: visitorId || null,
      featureId,
      usedAt: new Date(),
      ipAddress: ipAddress || null,
    });

    return {
      success: true,
      message: '使用记录已保存',
    };
  }

  /**
   * Update feature permission configuration
   * Requirement: 1.4, 1.5
   * @param {string} featureId - Feature identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  static async updateFeatureConfig(featureId, updates) {
    const tool = await Tool.findOne({
      where: { featureId, deletedAt: null },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'identifier', 'name'],
          required: false,
        },
      ],
    });

    if (!tool) {
      return {
        success: false,
        error: 'FEATURE_NOT_FOUND',
        message: '功能不存在',
      };
    }

    // Map incoming field names to Tool model fields
    const fieldMapping = {
      featureName: 'name',
      requireMember: 'requireMember',
      freeTrialCount: 'freeTrialCount',
      enabled: 'enabled',
    };
    const updateData = {};

    for (const [key, mappedField] of Object.entries(fieldMapping)) {
      if (updates[key] !== undefined) {
        updateData[mappedField] = updates[key];
      }
    }

    await tool.update(updateData);

    // Reload to get category association
    await tool.reload();

    return {
      success: true,
      data: {
        featureId: tool.featureId,
        featureName: tool.name,
        category: tool.category?.identifier || '',
        requireMember: tool.requireMember,
        freeTrialCount: tool.freeTrialCount,
        enabled: tool.enabled,
      },
    };
  }

  /**
   * Batch update feature permissions by category
   * Requirement: 1.9
   * @param {string} category - Category to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  static async batchUpdateByCategory(category, updates) {
    // Find category by identifier
    const categoryRecord = await Category.findOne({
      where: { identifier: category, deletedAt: null },
    });

    if (!categoryRecord) {
      return {
        success: false,
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      };
    }

    const allowedFields = ['requireMember', 'freeTrialCount', 'enabled'];
    const updateData = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    const [affectedCount] = await Tool.update(updateData, {
      where: { categoryId: categoryRecord.id },
    });

    return {
      success: true,
      data: {
        affectedCount,
      },
    };
  }
}

module.exports = PermissionService;
