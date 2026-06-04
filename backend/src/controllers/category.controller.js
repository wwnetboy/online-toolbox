/**
 * Category Controller
 * Handles category management endpoints
 * Requirements: 7.1-7.8
 */

const CategoryService = require('../services/category.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

class CategoryController {
  /**
   * Get enabled categories for public access (no auth required)
   * GET /api/category/public/list
   */
  static async getPublicCategories(req, res) {
    try {
      const result = await CategoryService.getEnabledCategories();

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '查询分类列表成功');
    } catch (err) {
      logger.error('Get public categories error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询分类列表失败');
    }
  }

  /**
   * Get all categories sorted by sort field
   * GET /api/category/list
   * Requirement: 7.1
   */
  static async getCategories(req, res) {
    try {
      const result = await CategoryService.getCategories();

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '查询分类列表成功');
    } catch (err) {
      logger.error('Get categories error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询分类列表失败');
    }
  }

  /**
   * Get category by ID
   * GET /api/category/:id
   * Requirement: 7.1
   */
  static async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const result = await CategoryService.getCategoryById(parseInt(id, 10));

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '获取分类信息成功');
    } catch (err) {
      logger.error('Get category by ID error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取分类信息失败');
    }
  }


  /**
   * Create new category
   * POST /api/category
   * Requirement: 7.2
   */
  static async createCategory(req, res) {
    try {
      const { identifier, name, icon, enabled } = req.body;

      const result = await CategoryService.createCategory({
        identifier,
        name,
        icon,
        enabled,
      });

      if (!result.success) {
        if (result.error === 'CATEGORY_IDENTIFIER_EXISTS') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Category created: ${identifier}`, { createdBy: req.user?.userId });
      return success(res, result.data, '创建分类成功', 201);
    } catch (err) {
      logger.error('Create category error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '创建分类失败');
    }
  }

  /**
   * Update category
   * PUT /api/category/:id
   * Requirement: 7.3
   */
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { identifier, name, icon, enabled } = req.body;

      const result = await CategoryService.updateCategory(parseInt(id, 10), {
        identifier,
        name,
        icon,
        enabled,
      });

      if (!result.success) {
        if (result.error === 'CATEGORY_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        if (result.error === 'CATEGORY_IDENTIFIER_EXISTS') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Category updated: ${id}`, { updatedBy: req.user?.userId });
      return success(res, result.data, '更新分类成功');
    } catch (err) {
      logger.error('Update category error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '更新分类失败');
    }
  }

  /**
   * Update category sort order (batch update)
   * PUT /api/category/sort
   * Requirement: 7.4
   */
  static async updateCategorySort(req, res) {
    try {
      const { items } = req.body;

      const result = await CategoryService.updateCategorySort(items);

      if (!result.success) {
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info('Category sort updated', { updatedBy: req.user?.userId });
      return success(res, null, '排序更新成功');
    } catch (err) {
      logger.error('Update category sort error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '排序更新失败');
    }
  }


  /**
   * Delete category (soft delete)
   * DELETE /api/category/:id
   * Requirements: 7.5, 7.6
   */
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const result = await CategoryService.deleteCategory(parseInt(id, 10));

      if (!result.success) {
        if (result.error === 'CATEGORY_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        if (result.error === 'SYSTEM_CATEGORY_PROTECTED') {
          return error(res, ErrorCodes.FORBIDDEN, result.message);
        }
        if (result.error === 'CATEGORY_HAS_TOOLS') {
          return error(res, ErrorCodes.CONFLICT, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Category deleted: ${id}`, { deletedBy: req.user?.userId });
      return success(res, null, '删除分类成功');
    } catch (err) {
      logger.error('Delete category error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '删除分类失败');
    }
  }

  /**
   * Reset categories to default configuration
   * POST /api/category/reset
   * Requirement: 7.7
   */
  static async resetCategories(req, res) {
    try {
      const result = await CategoryService.resetCategories();

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      logger.info('Categories reset to default', { resetBy: req.user?.userId });
      return success(res, null, '分类数据已重置为默认配置');
    } catch (err) {
      logger.error('Reset categories error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '重置分类失败');
    }
  }

  /**
   * Check if category identifier exists
   * GET /api/category/check-identifier
   * Requirement: 7.2
   */
  static async checkIdentifier(req, res) {
    try {
      const { identifier, excludeId } = req.query;

      if (!identifier) {
        return error(res, ErrorCodes.BAD_REQUEST, '分类标识不能为空');
      }

      const exists = await CategoryService.isIdentifierExists(
        identifier,
        excludeId ? parseInt(excludeId, 10) : null
      );

      return success(res, { exists }, exists ? '分类标识已存在' : '分类标识可用');
    } catch (err) {
      logger.error('Check identifier error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '检查分类标识失败');
    }
  }

  /**
   * Check if category is a system category
   * GET /api/category/:id/is-system
   * Requirement: 7.6
   */
  static async checkIsSystem(req, res) {
    try {
      const { id } = req.params;

      const result = await CategoryService.isSystemCategory(parseInt(id, 10));

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '查询成功');
    } catch (err) {
      logger.error('Check is system error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询系统分类失败');
    }
  }

  /**
   * Check if category has associated tools
   * GET /api/category/:id/tools
   * Requirement: 7.5
   */
  static async checkCategoryTools(req, res) {
    try {
      const { id } = req.params;

      const result = await CategoryService.hasAssociatedTools(parseInt(id, 10));

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '查询成功');
    } catch (err) {
      logger.error('Check category tools error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询分类工具失败');
    }
  }
}

module.exports = CategoryController;
