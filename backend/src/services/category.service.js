/**
 * Category Service
 * Handles category CRUD operations, sorting, and system category protection
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

const { Op } = require('sequelize');
const { Category, Tool, sequelize } = require('../models');

// System built-in category identifiers that cannot be deleted
const SYSTEM_CATEGORIES = ['image', 'pdf', 'document', 'video', 'utils'];

class CategoryService {
  /**
   * Get enabled categories for public access
   * @returns {Promise<Object>} Enabled category list
   */
  static async getEnabledCategories() {
    try {
      const categories = await Category.findAll({
        where: {
          enabled: true,
          deletedAt: null,
        },
        order: [['sort', 'ASC'], ['createdAt', 'ASC']],
      });

      return {
        success: true,
        data: categories.map(cat => this.formatCategoryResponse(cat)),
      };
    } catch (err) {
      console.error('getEnabledCategories error:', err);
      return {
        success: false,
        message: '查询分类列表失败',
      };
    }
  }

  /**
   * Get all categories sorted by sort field ascending
   * Requirement: 7.1
   * @returns {Promise<Object>} Category list
   */
  static async getCategories() {
    const categories = await Category.findAll({
      where: {
        deletedAt: null,
      },
      order: [['sort', 'ASC'], ['createdAt', 'ASC']],
    });

    return {
      success: true,
      data: categories.map(cat => this.formatCategoryResponse(cat)),
    };
  }

  /**
   * Get category by ID
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Category data
   */
  static async getCategoryById(id) {
    const category = await Category.findOne({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!category) {
      return {
        success: false,
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      };
    }

    return {
      success: true,
      data: this.formatCategoryResponse(category),
    };
  }


  /**
   * Create a new category
   * Requirement: 7.2
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
   */
  static async createCategory(categoryData) {
    const { identifier, name, icon, enabled = true } = categoryData;

    // Check for existing identifier
    const existingCategory = await Category.findOne({
      where: { identifier, deletedAt: null },
    });
    if (existingCategory) {
      return {
        success: false,
        error: 'CATEGORY_IDENTIFIER_EXISTS',
        message: '分类标识已存在',
      };
    }

    // Get max sort value for new category
    const maxSort = await Category.max('sort', {
      where: { deletedAt: null },
    }) || 0;

    const category = await Category.create({
      identifier,
      name,
      icon,
      enabled,
      sort: maxSort + 1,
      isSystem: false,
    });

    return {
      success: true,
      data: this.formatCategoryResponse(category),
    };
  }

  /**
   * Update category
   * Requirement: 7.3
   * @param {number} id - Category ID
   * @param {Object} categoryData - Category data to update
   * @returns {Promise<Object>} Updated category
   */
  static async updateCategory(id, categoryData) {
    const category = await Category.findOne({
      where: { id, deletedAt: null },
    });

    if (!category) {
      return {
        success: false,
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      };
    }

    const { identifier, name, icon, enabled } = categoryData;

    // Check identifier uniqueness if being updated
    if (identifier && identifier !== category.identifier) {
      const existingCategory = await Category.findOne({
        where: {
          identifier,
          id: { [Op.ne]: id },
          deletedAt: null,
        },
      });
      if (existingCategory) {
        return {
          success: false,
          error: 'CATEGORY_IDENTIFIER_EXISTS',
          message: '分类标识已存在',
        };
      }
    }

    // Build update data
    const updateData = {};
    if (identifier !== undefined) updateData.identifier = identifier;
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (enabled !== undefined) updateData.enabled = enabled;

    await category.update(updateData);

    return this.getCategoryById(id);
  }


  /**
   * Update category sort order (batch update)
   * Requirement: 7.4
   * @param {Array<Object>} items - Array of { id, sort } objects
   * @returns {Promise<Object>} Update result
   */
  static async updateCategorySort(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        error: 'INVALID_SORT_DATA',
        message: '排序数据无效',
      };
    }

    const transaction = await sequelize.transaction();
    try {
      for (const item of items) {
        await Category.update(
          { sort: item.sort },
          {
            where: { id: item.id, deletedAt: null },
            transaction,
          }
        );
      }

      await transaction.commit();

      return {
        success: true,
        message: '排序更新成功',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete category (soft delete)
   * Requirements: 7.5, 7.6
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Delete result
   */
  static async deleteCategory(id) {
    const category = await Category.findOne({
      where: { id, deletedAt: null },
      include: [
        {
          model: Tool,
          as: 'tools',
          attributes: ['id'],
          where: { deletedAt: null },
          required: false,
        },
      ],
    });

    if (!category) {
      return {
        success: false,
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      };
    }

    // Check if it's a system category (Requirement: 7.6)
    if (category.isSystem || SYSTEM_CATEGORIES.includes(category.identifier)) {
      return {
        success: false,
        error: 'SYSTEM_CATEGORY_PROTECTED',
        message: '系统内置分类不可删除',
      };
    }

    // Check if category has associated tools (Requirement: 7.5)
    if (category.tools && category.tools.length > 0) {
      return {
        success: false,
        error: 'CATEGORY_HAS_TOOLS',
        message: `该分类下有 ${category.tools.length} 个工具，无法删除`,
      };
    }

    // Soft delete by setting deletedAt
    await category.update({
      deletedAt: new Date(),
    });

    return {
      success: true,
      message: '分类删除成功',
    };
  }


  /**
   * Reset categories to default configuration
   * Requirement: 7.7
   * @returns {Promise<Object>} Reset result
   */
  static async resetCategories() {
    const defaultCategories = [
      { identifier: 'image', name: '图片处理', icon: 'ri:image-line', sort: 1, isSystem: true },
      { identifier: 'pdf', name: 'PDF工具', icon: 'ri:file-pdf-line', sort: 2, isSystem: true },
      { identifier: 'document', name: '文档工具', icon: 'ri:file-text-line', sort: 3, isSystem: true },
      { identifier: 'video', name: '视频工具', icon: 'ri:video-line', sort: 4, isSystem: true },
      { identifier: 'utils', name: '实用工具', icon: 'ri:tools-line', sort: 5, isSystem: true },
    ];

    const transaction = await sequelize.transaction();
    try {
      // Soft delete all non-system categories
      await Category.update(
        { deletedAt: new Date() },
        {
          where: {
            isSystem: false,
            deletedAt: null,
          },
          transaction,
        }
      );

      // Upsert default categories
      for (const catData of defaultCategories) {
        const existing = await Category.findOne({
          where: { identifier: catData.identifier },
          paranoid: false,
        });

        if (existing) {
          await existing.update(
            {
              name: catData.name,
              icon: catData.icon,
              sort: catData.sort,
              isSystem: true,
              enabled: true,
              deletedAt: null,
            },
            { transaction }
          );
        } else {
          await Category.create(
            {
              ...catData,
              enabled: true,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();

      return {
        success: true,
        message: '分类数据已重置为默认配置',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Check if category identifier exists
   * @param {string} identifier - Category identifier to check
   * @param {number} excludeId - Category ID to exclude from check
   * @returns {Promise<boolean>} True if identifier exists
   */
  static async isIdentifierExists(identifier, excludeId = null) {
    const where = { identifier, deletedAt: null };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const category = await Category.findOne({ where });
    return !!category;
  }

  /**
   * Check if category is a system category
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Result with isSystem flag
   */
  static async isSystemCategory(id) {
    const category = await Category.findOne({
      where: { id, deletedAt: null },
    });

    if (!category) {
      return {
        success: false,
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      };
    }

    return {
      success: true,
      data: {
        isSystem: category.isSystem || SYSTEM_CATEGORIES.includes(category.identifier),
      },
    };
  }

  /**
   * Check if category has associated tools
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Result with tool count
   */
  static async hasAssociatedTools(id) {
    const category = await Category.findOne({
      where: { id, deletedAt: null },
      include: [
        {
          model: Tool,
          as: 'tools',
          attributes: ['id'],
          where: { deletedAt: null },
          required: false,
        },
      ],
    });

    if (!category) {
      return {
        success: false,
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      };
    }

    const toolCount = category.tools ? category.tools.length : 0;
    return {
      success: true,
      data: {
        hasTools: toolCount > 0,
        toolCount,
      },
    };
  }

  /**
   * Format category response
   * Requirement: 7.8
   * @param {Object} category - Category model instance
   * @returns {Object} Formatted category data
   */
  static formatCategoryResponse(category) {
    const catData = category.toJSON ? category.toJSON() : category;
    return {
      id: catData.id,
      identifier: catData.identifier,
      name: catData.name,
      icon: catData.icon,
      sort: catData.sort,
      enabled: catData.enabled,
      isSystem: catData.isSystem,
      createdAt: catData.createdAt,
      updatedAt: catData.updatedAt,
    };
  }

  /**
   * Get system category identifiers
   * @returns {Array<string>} System category identifiers
   */
  static getSystemCategoryIdentifiers() {
    return [...SYSTEM_CATEGORIES];
  }
}

module.exports = CategoryService;
