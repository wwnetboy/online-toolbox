/**
 * Tool Controller
 * Handles tool management endpoints
 * Requirements: 6.1-6.8
 */

const ToolService = require('../services/tool.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

class ToolController {
  /**
   * Get enabled tools for public access (no auth required)
   * GET /api/tool/public/list
   */
  static async getPublicTools(req, res) {
    try {
      const result = await ToolService.getEnabledTools();

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '查询工具列表成功');
    } catch (err) {
      logger.error('Get public tools error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询工具列表失败');
    }
  }

  /**
   * Get tools with pagination and filtering
   * GET /api/tool/list
   * Requirements: 6.1, 6.6
   */
  static async getTools(req, res) {
    try {
      const { current, size, name, category, enabled } = req.query;

      const result = await ToolService.getTools({
        current,
        size,
        name,
        category,
        enabled,
      });

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '查询工具列表成功');
    } catch (err) {
      logger.error('Get tools error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询工具列表失败');
    }
  }

  /**
   * Get tool by ID
   * GET /api/tool/:id
   * Requirement: 6.1
   */
  static async getToolById(req, res) {
    try {
      const { id } = req.params;

      const result = await ToolService.getToolById(parseInt(id, 10));

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '获取工具信息成功');
    } catch (err) {
      logger.error('Get tool by ID error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取工具信息失败');
    }
  }


  /**
   * Create new tool
   * POST /api/tool
   * Requirement: 6.2
   */
  static async createTool(req, res) {
    try {
      const {
        name,
        description,
        icon,
        iconUrl,
        color,
        categoryId,
        route,
        badge,
        enabled,
        featureId,
        requireMember,
        freeTrialCount,
      } = req.body;

      const result = await ToolService.createTool({
        name,
        description,
        icon,
        iconUrl,
        color,
        categoryId,
        route,
        badge,
        enabled,
        featureId,
        requireMember,
        freeTrialCount,
      });

      if (!result.success) {
        if (result.error === 'CATEGORY_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Tool created: ${name}`, { createdBy: req.user?.userId });
      return success(res, result.data, '创建工具成功', 201);
    } catch (err) {
      logger.error('Create tool error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '创建工具失败');
    }
  }

  /**
   * Update tool
   * PUT /api/tool/:id
   * Requirement: 6.3
   */
  static async updateTool(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        icon,
        iconUrl,
        color,
        categoryId,
        route,
        badge,
        enabled,
        sort,
        requireMember,
        freeTrialCount,
      } = req.body;

      const result = await ToolService.updateTool(parseInt(id, 10), {
        name,
        description,
        icon,
        iconUrl,
        color,
        categoryId,
        route,
        badge,
        enabled,
        sort,
        requireMember,
        freeTrialCount,
      });

      if (!result.success) {
        if (result.error === 'TOOL_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        if (result.error === 'CATEGORY_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Tool updated: ${id}`, { updatedBy: req.user?.userId });
      return success(res, result.data, '更新工具成功');
    } catch (err) {
      logger.error('Update tool error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '更新工具失败');
    }
  }


  /**
   * Toggle tool enabled status
   * PUT /api/tool/:id/toggle
   * Requirement: 6.4
   */
  static async toggleToolStatus(req, res) {
    try {
      const { id } = req.params;

      const result = await ToolService.toggleToolStatus(parseInt(id, 10));

      if (!result.success) {
        if (result.error === 'TOOL_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Tool status toggled: ${id}`, { updatedBy: req.user?.userId });
      return success(res, result.data, '工具状态切换成功');
    } catch (err) {
      logger.error('Toggle tool status error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '工具状态切换失败');
    }
  }

  /**
   * Delete tool (soft delete)
   * DELETE /api/tool/:id
   * Requirement: 6.5
   */
  static async deleteTool(req, res) {
    try {
      const { id } = req.params;

      const result = await ToolService.deleteTool(parseInt(id, 10));

      if (!result.success) {
        if (result.error === 'TOOL_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Tool deleted: ${id}`, { deletedBy: req.user?.userId });
      return success(res, null, '删除工具成功');
    } catch (err) {
      logger.error('Delete tool error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '删除工具失败');
    }
  }

  /**
   * Reset tools to default configuration
   * POST /api/tool/reset
   * Requirement: 6.7
   */
  static async resetTools(req, res) {
    try {
      const result = await ToolService.resetTools();

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      logger.info('Tools reset to default', { resetBy: req.user?.userId });
      return success(res, null, '工具数据已重置为默认配置');
    } catch (err) {
      logger.error('Reset tools error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '重置工具失败');
    }
  }


  /**
   * Update tool sort order (batch update)
   * PUT /api/tool/sort
   * Requirement: 6.3
   */
  static async updateToolSort(req, res) {
    try {
      const { items } = req.body;

      const result = await ToolService.updateToolSort(items);

      if (!result.success) {
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info('Tool sort updated', { updatedBy: req.user?.userId });
      return success(res, null, '排序更新成功');
    } catch (err) {
      logger.error('Update tool sort error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '排序更新失败');
    }
  }

  /**
   * Batch delete tools (soft delete)
   * DELETE /api/tool/batch
   * Requirement: 6.5
   */
  static async batchDeleteTools(req, res) {
    try {
      const { ids } = req.body;

      const result = await ToolService.batchDeleteTools(ids);

      if (!result.success) {
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Tools batch deleted: ${ids.join(', ')}`, { deletedBy: req.user?.userId });
      return success(res, result.data, result.message);
    } catch (err) {
      logger.error('Batch delete tools error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '批量删除工具失败');
    }
  }

  /**
   * Batch toggle tool status
   * PUT /api/tool/batch/status
   * Requirement: 6.4
   */
  static async batchToggleStatus(req, res) {
    try {
      const { ids, enabled } = req.body;

      const result = await ToolService.batchToggleStatus(ids, enabled);

      if (!result.success) {
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Tools batch status updated: ${ids.join(', ')}`, { updatedBy: req.user?.userId });
      return success(res, result.data, result.message);
    } catch (err) {
      logger.error('Batch toggle status error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '批量更新工具状态失败');
    }
  }
}

module.exports = ToolController;
