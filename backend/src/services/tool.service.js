/**
 * Tool Service
 * Handles tool CRUD operations, status toggle, and search filtering
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

const { Op } = require('sequelize');
const { Tool, Category, sequelize } = require('../models');
const { IconUploadService } = require('./icon-upload.service');

class ToolService {
  /**
   * Get enabled tools for public access
   * @returns {Promise<Object>} Enabled tool list
   */
  static async getEnabledTools() {
    try {
      const tools = await Tool.findAll({
        where: { 
          enabled: true,
          deletedAt: null,
        },
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'identifier', 'name', 'enabled'],
            where: { deletedAt: null },
            required: false,
          },
        ],
        order: [['sort', 'ASC'], ['createdAt', 'DESC']],
      });

      // 过滤掉分类被禁用的工具
      const filteredTools = tools.filter(tool => {
        if (!tool.category) return true; // 没有分类的工具保留
        return tool.category.enabled !== false;
      });

      return {
        success: true,
        data: {
          records: filteredTools.map(tool => this.formatToolResponse(tool)),
          total: filteredTools.length,
        },
      };
    } catch (err) {
      console.error('getEnabledTools error:', err);
      return {
        success: false,
        message: '查询工具列表失败',
      };
    }
  }

  /**
   * Get tools with pagination and filtering
   * Requirement: 6.1, 6.6
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated tool list
   */
  static async getTools(params = {}) {
    const {
      current = 1,
      size = 10,
      name,
      category,
      enabled,
    } = params;

    const where = { deletedAt: null };

    // Search by name (Requirement: 6.6)
    if (name) {
      where.name = { [Op.like]: `%${name}%` };
    }

    // Filter by category (Requirement: 6.6)
    if (category) {
      where.categoryId = category;
    }

    // Filter by enabled status (Requirement: 6.6)
    if (enabled !== undefined && enabled !== null && enabled !== '') {
      where.enabled = enabled === true || enabled === 'true' || enabled === 1;
    }

    const offset = (current - 1) * size;
    const { count, rows } = await Tool.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'identifier', 'name'],
          required: false,
        },
      ],
      order: [['sort', 'ASC'], ['createdAt', 'DESC']],
      limit: parseInt(size, 10),
      offset,
    });

    return {
      success: true,
      data: {
        records: rows.map(tool => this.formatToolResponse(tool)),
        current: parseInt(current, 10),
        size: parseInt(size, 10),
        total: count,
      },
    };
  }


  /**
   * Get tool by ID
   * @param {number} id - Tool ID
   * @returns {Promise<Object>} Tool data
   */
  static async getToolById(id) {
    const tool = await Tool.findOne({
      where: { id, deletedAt: null },
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
        error: 'TOOL_NOT_FOUND',
        message: '工具不存在',
      };
    }

    return {
      success: true,
      data: this.formatToolResponse(tool),
    };
  }

  /**
   * Create a new tool
   * Requirement: 6.2
   * @param {Object} toolData - Tool data
   * @returns {Promise<Object>} Created tool
   */
  static async createTool(toolData) {
    const {
      name,
      description,
      icon,
      iconUrl,
      color,
      categoryId,
      route,
      badge,
      enabled = true,
      requireMember = false,
      freeTrialCount = 0,
    } = toolData;

    // Auto-generate featureId from route if not provided
    const featureId = toolData.featureId || route
      .replace('/toolbox-', '')
      .replace(/^\//, '')
      .replace(/\//g, '-');

    // Validate category exists if provided
    if (categoryId) {
      const category = await Category.findOne({
        where: { id: categoryId, deletedAt: null },
      });
      if (!category) {
        return {
          success: false,
          error: 'CATEGORY_NOT_FOUND',
          message: '分类不存在',
        };
      }
    }

    // Get max sort value for new tool
    const maxSort = await Tool.max('sort', {
      where: { deletedAt: null },
    }) || 0;

    const tool = await Tool.create({
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
      sort: maxSort + 1,
    });

    return this.getToolById(tool.id);
  }


  /**
   * Update tool
   * Requirement: 6.3, 2.3 (icon cleanup on update)
   * @param {number} id - Tool ID
   * @param {Object} toolData - Tool data to update
   * @returns {Promise<Object>} Updated tool
   */
  static async updateTool(id, toolData) {
    const tool = await Tool.findOne({
      where: { id, deletedAt: null },
    });

    if (!tool) {
      return {
        success: false,
        error: 'TOOL_NOT_FOUND',
        message: '工具不存在',
      };
    }

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
    } = toolData;

    // Validate category exists if being updated
    if (categoryId !== undefined && categoryId !== null) {
      const category = await Category.findOne({
        where: { id: categoryId, deletedAt: null },
      });
      if (!category) {
        return {
          success: false,
          error: 'CATEGORY_NOT_FOUND',
          message: '分类不存在',
        };
      }
    }

    // Check if iconUrl is being changed and delete old icon file
    // Requirement: 2.3 - When a tool's icon is updated with a new upload, delete the previous icon file
    const oldIconUrl = tool.iconUrl;
    if (iconUrl !== undefined && oldIconUrl && oldIconUrl !== iconUrl) {
      // Delete the old icon file asynchronously (don't block the update)
      IconUploadService.deleteIcon(oldIconUrl).catch(() => {
        // Silently ignore deletion errors - the old file may not exist
      });
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
    if (color !== undefined) updateData.color = color;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (route !== undefined) updateData.route = route;
    if (badge !== undefined) updateData.badge = badge;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (sort !== undefined) updateData.sort = sort;
    if (requireMember !== undefined) updateData.requireMember = requireMember;
    if (freeTrialCount !== undefined) updateData.freeTrialCount = freeTrialCount;

    await tool.update(updateData);

    return this.getToolById(id);
  }

  /**
   * Toggle tool enabled status
   * Requirement: 6.4
   * @param {number} id - Tool ID
   * @returns {Promise<Object>} Updated tool
   */
  static async toggleToolStatus(id) {
    const tool = await Tool.findOne({
      where: { id, deletedAt: null },
    });

    if (!tool) {
      return {
        success: false,
        error: 'TOOL_NOT_FOUND',
        message: '工具不存在',
      };
    }

    await tool.update({ enabled: !tool.enabled });

    return this.getToolById(id);
  }


  /**
   * Delete tool (soft delete)
   * Requirement: 6.5, 2.4 (icon cleanup on delete)
   * @param {number} id - Tool ID
   * @returns {Promise<Object>} Delete result
   */
  static async deleteTool(id) {
    const tool = await Tool.findOne({
      where: { id, deletedAt: null },
    });

    if (!tool) {
      return {
        success: false,
        error: 'TOOL_NOT_FOUND',
        message: '工具不存在',
      };
    }

    // Delete associated icon file if exists
    // Requirement: 2.4 - When a tool is deleted, delete the associated icon file
    if (tool.iconUrl) {
      IconUploadService.deleteIcon(tool.iconUrl).catch(() => {
        // Silently ignore deletion errors - the file may not exist
      });
    }

    // Soft delete by setting deletedAt
    await tool.update({ deletedAt: new Date() });

    return {
      success: true,
      message: '工具删除成功',
    };
  }

  /**
   * Reset tools to default configuration
   * Requirement: 6.7
   * @returns {Promise<Object>} Reset result
   */
  static async resetTools() {
    const defaultTools = [
      // ========== 图片工具 ==========
      { name: '图片压缩', description: '压缩图片文件大小，支持JPG、PNG、WEBP等格式', icon: 'ri:file-reduce-fill', color: '#ff6b6b', categoryIdentifier: 'image', route: '/toolbox-image/compress', sort: 1 },
      { name: '格式转换', description: '转换图片格式（JPG/PNG/WEBP/GIF等）', icon: 'ri:arrow-left-right-fill', color: '#4ecdc4', categoryIdentifier: 'image', route: '/toolbox-image/convert', sort: 2 },
      { name: '图片裁剪', description: '裁剪图片到指定尺寸，支持证件照裁剪', icon: 'ri:crop-fill', color: '#95e1d3', categoryIdentifier: 'image', route: '/toolbox-image/crop', sort: 3 },
      { name: '图片旋转', description: '旋转或翻转图片，支持90度、180度旋转', icon: 'ri:clockwise-fill', color: '#f38181', categoryIdentifier: 'image', route: '/toolbox-image/rotate', sort: 4 },
      { name: '尺寸调整', description: '调整图片宽度和高度，支持等比缩放', icon: 'ri:aspect-ratio-fill', color: '#aa96da', categoryIdentifier: 'image', route: '/toolbox-image/resize', sort: 5 },
      { name: '长图拼接', description: '将多张图片拼接成长图，适合截图拼接', icon: 'ri:merge-cells-vertical', color: '#fcbad3', categoryIdentifier: 'image', route: '/toolbox-image/splice', sort: 6 },
      { name: '图片水印', description: '为图片添加文字或图片水印，保护版权', icon: 'ri:copyright-fill', color: '#5c9eff', categoryIdentifier: 'image', route: '/toolbox-image/watermark', sort: 7 },
      { name: '图片去水印', description: '智能去除图片中的水印，基于 WebGPU 技术', icon: 'ri:eraser-fill', color: '#74b9ff', categoryIdentifier: 'image', route: '/toolbox-image/remove-watermark', sort: 8 },

      // ========== PDF工具 ==========
      { name: 'PDF合并', description: '将多个PDF文件合并为一个文件', icon: 'ri:file-add-fill', color: '#e74c3c', categoryIdentifier: 'pdf', route: '/toolbox-pdf/merge', sort: 9 },
      { name: 'PDF拆分', description: '将PDF文件拆分成多个部分', icon: 'ri:scissors-2-fill', color: '#3498db', categoryIdentifier: 'pdf', route: '/toolbox-pdf/split', sort: 10 },
      { name: 'PDF压缩', description: '压缩PDF文件大小，方便传输和存储', icon: 'ri:file-zip-fill', color: '#2ecc71', categoryIdentifier: 'pdf', route: '/toolbox-pdf/compress', sort: 11 },
      { name: '页面提取', description: '从PDF中提取指定页面', icon: 'ri:file-download-fill', color: '#f39c12', categoryIdentifier: 'pdf', route: '/toolbox-pdf/extract', sort: 12 },
      { name: '页面删除', description: '删除PDF中不需要的页面', icon: 'ri:file-forbid-fill', color: '#e67e22', categoryIdentifier: 'pdf', route: '/toolbox-pdf/delete', sort: 13 },
      { name: '页面旋转', description: '旋转PDF页面方向', icon: 'ri:rotate-lock-fill', color: '#16a085', categoryIdentifier: 'pdf', route: '/toolbox-pdf/rotate', sort: 14 },
      { name: '页面重排', description: '调整PDF页面顺序', icon: 'ri:order-play-fill', color: '#27ae60', categoryIdentifier: 'pdf', route: '/toolbox-pdf/reorder', sort: 15 },
      { name: 'PDF水印', description: '为PDF添加文字或图片水印', icon: 'ri:mark-pen-fill', color: '#2980b9', categoryIdentifier: 'pdf', route: '/toolbox-pdf/watermark', sort: 16 },
      { name: 'PDF加解密', description: '为PDF设置密码保护或移除密码', icon: 'ri:shield-keyhole-fill', color: '#8e44ad', categoryIdentifier: 'pdf', route: '/toolbox-pdf/encrypt', sort: 17 },

      // ========== 文档转换工具 ==========
      { name: '图片转PDF', description: '将多张图片合并转换为PDF文档', icon: 'ri:gallery-fill', color: '#9b59b6', categoryIdentifier: 'document', route: '/toolbox-pdf/image-to-pdf', sort: 18 },
      { name: 'PDF转图片', description: '将PDF页面转换为JPG/PNG图片', icon: 'ri:image-2-fill', color: '#1abc9c', categoryIdentifier: 'document', route: '/toolbox-pdf/pdf-to-image', sort: 19 },
      { name: 'Word转PDF', description: '将Word文档转换为PDF格式', icon: 'ri:file-word-2-fill', color: '#2b5797', categoryIdentifier: 'document', route: '/toolbox-pdf/word-to-pdf', sort: 20 },
      { name: 'PDF转Word', description: '将PDF文档转换为可编辑的Word格式', icon: 'ri:file-word-fill', color: '#2b5797', categoryIdentifier: 'document', route: '/toolbox-pdf/pdf-to-word', sort: 21 },
      { name: 'PPT转PDF', description: '将PowerPoint演示文稿转换为PDF格式', icon: 'ri:file-ppt-2-fill', color: '#d24726', categoryIdentifier: 'document', route: '/toolbox-pdf/ppt-to-pdf', sort: 22 },
      { name: 'PDF转PPT', description: '将PDF文档转换为PowerPoint格式', icon: 'ri:file-ppt-fill', color: '#d24726', categoryIdentifier: 'document', route: '/toolbox-pdf/pdf-to-ppt', sort: 23 },
      { name: 'Excel转PDF', description: '将Excel电子表格转换为PDF格式', icon: 'ri:file-excel-2-fill', color: '#217346', categoryIdentifier: 'document', route: '/toolbox-pdf/excel-to-pdf', sort: 24 },
      { name: 'PDF转Excel', description: '从PDF中提取表格数据到Excel', icon: 'ri:file-excel-fill', color: '#217346', categoryIdentifier: 'document', route: '/toolbox-pdf/pdf-to-excel', sort: 25 },
      { name: 'HTML转PDF', description: '将网页或HTML内容转换为PDF文档', icon: 'ri:html5-fill', color: '#e34c26', categoryIdentifier: 'document', route: '/toolbox-pdf/html-to-pdf', sort: 26 },
      { name: 'PDF转PDF/A', description: '将PDF转换为长期归档格式PDF/A', icon: 'ri:archive-drawer-fill', color: '#607d8b', categoryIdentifier: 'document', route: '/toolbox-pdf/pdf-to-pdfa', sort: 27 },

      // ========== PDF高级编辑 ==========
      { name: '添加页码', description: '为PDF文档添加页码，支持多种格式', icon: 'ri:list-ordered-2', color: '#795548', categoryIdentifier: 'pdf', route: '/toolbox-pdf/page-number', sort: 28 },
      { name: '裁剪PDF', description: '裁剪PDF页面，移除不需要的边距', icon: 'ri:crop-2-fill', color: '#ff9800', categoryIdentifier: 'pdf', route: '/toolbox-pdf/crop', sort: 29 },
      { name: 'PDF编辑', description: '直接编辑PDF内容，添加文字、图片和批注', icon: 'ri:edit-2-fill', color: '#673ab7', categoryIdentifier: 'pdf', route: '/toolbox-pdf/edit', sort: 30 },
      { name: 'PDF修复', description: '修复损坏的PDF文件，恢复文档内容', icon: 'ri:hammer-fill', color: '#009688', categoryIdentifier: 'pdf', route: '/toolbox-pdf/repair', sort: 31 },
      { name: 'OCR文字识别', description: '识别扫描版PDF中的文字，生成可搜索PDF', icon: 'ri:scan-2-fill', color: '#00bcd4', categoryIdentifier: 'pdf', route: '/toolbox-pdf/ocr', sort: 32 },

      // ========== PDF安全功能 ==========
      { name: 'PDF签名', description: '为PDF添加电子签名，支持手写和图片签名', icon: 'ri:pen-nib-fill', color: '#3f51b5', categoryIdentifier: 'pdf', route: '/toolbox-pdf/signature', sort: 34 },
      { name: 'PDF密文标记', description: '永久移除PDF中的敏感信息', icon: 'ri:eye-off-fill', color: '#f44336', categoryIdentifier: 'pdf', route: '/toolbox-pdf/redact', sort: 35 },
      { name: 'PDF比较', description: '比较两个PDF文档，高亮显示差异', icon: 'ri:git-merge-fill', color: '#ff5722', categoryIdentifier: 'pdf', route: '/toolbox-pdf/compare', sort: 36 },

      // ========== 视频工具 ==========
      { name: '在线录屏', description: '在浏览器中直接录制屏幕，快速制作演示视频', icon: 'ri:record-circle-fill', color: '#e74c3c', categoryIdentifier: 'video', route: '/toolbox-video/screen-record', sort: 37 },
      { name: '视频转GIF', description: '将视频片段转换为GIF动图', icon: 'ri:file-gif-fill', color: '#9b59b6', categoryIdentifier: 'video', route: '/toolbox-video/video-to-gif', sort: 38 },

      // ========== 实用工具 ==========
      { name: '二维码生成', description: '生成各种内容的二维码，支持自定义样式和Logo', icon: 'ri:qr-code-fill', color: '#1abc9c', categoryIdentifier: 'utils', route: '/toolbox-utils/qrcode', sort: 39 },
      { name: 'Base64转换', description: '图片与Base64编码互相转换，方便开发使用', icon: 'ri:code-box-fill', color: '#34495e', categoryIdentifier: 'utils', route: '/toolbox-utils/base64', sort: 40 },
    ];

    const transaction = await sequelize.transaction();
    try {
      // Soft delete all existing tools
      await Tool.update(
        { deletedAt: new Date() },
        {
          where: { deletedAt: null },
          transaction,
        }
      );

      // Create default tools
      for (const toolData of defaultTools) {
        // Find category by identifier
        const category = await Category.findOne({
          where: { identifier: toolData.categoryIdentifier, deletedAt: null },
        });

        // Auto-generate featureId from route
        const featureId = toolData.route
          .replace('/toolbox-', '')
          .replace(/^\//, '')
          .replace(/\//g, '-');

        await Tool.create(
          {
            name: toolData.name,
            description: toolData.description,
            icon: toolData.icon,
            color: toolData.color,
            categoryId: category ? category.id : null,
            route: toolData.route,
            badge: toolData.badge || null,
            enabled: true,
            sort: toolData.sort,
            featureId,
          },
          { transaction }
        );
      }

      await transaction.commit();

      return {
        success: true,
        message: '工具数据已重置为默认配置',
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  /**
   * Update tool sort order (batch update)
   * @param {Array<Object>} items - Array of { id, sort } objects
   * @returns {Promise<Object>} Update result
   */
  static async updateToolSort(items) {
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
        await Tool.update(
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
   * Batch delete tools (soft delete)
   * Requirement: 2.4 (icon cleanup on delete)
   * @param {Array<number>} ids - Tool IDs to delete
   * @returns {Promise<Object>} Delete result
   */
  static async batchDeleteTools(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        error: 'INVALID_IDS',
        message: '工具ID列表无效',
      };
    }

    // Find tools to get their iconUrls before deletion
    const tools = await Tool.findAll({
      where: {
        id: { [Op.in]: ids },
        deletedAt: null,
      },
      attributes: ['id', 'iconUrl'],
    });

    // Delete associated icon files
    // Requirement: 2.4 - When a tool is deleted, delete the associated icon file
    for (const tool of tools) {
      if (tool.iconUrl) {
        IconUploadService.deleteIcon(tool.iconUrl).catch(() => {
          // Silently ignore deletion errors
        });
      }
    }

    const result = await Tool.update(
      { deletedAt: new Date() },
      {
        where: {
          id: { [Op.in]: ids },
          deletedAt: null,
        },
      }
    );

    return {
      success: true,
      message: `成功删除 ${result[0]} 个工具`,
      data: { deletedCount: result[0] },
    };
  }

  /**
   * Batch toggle tool status
   * @param {Array<number>} ids - Tool IDs
   * @param {boolean} enabled - New enabled status
   * @returns {Promise<Object>} Update result
   */
  static async batchToggleStatus(ids, enabled) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        error: 'INVALID_IDS',
        message: '工具ID列表无效',
      };
    }

    const result = await Tool.update(
      { enabled },
      {
        where: {
          id: { [Op.in]: ids },
          deletedAt: null,
        },
      }
    );

    return {
      success: true,
      message: `成功更新 ${result[0]} 个工具状态`,
      data: { updatedCount: result[0] },
    };
  }

  /**
   * Format tool response
   * Requirement: 6.8, 3.5
   * @param {Object} tool - Tool model instance
   * @returns {Object} Formatted tool data
   */
  static formatToolResponse(tool) {
    const toolData = tool.toJSON ? tool.toJSON() : tool;
    return {
      id: toolData.id,
      name: toolData.name,
      description: toolData.description,
      icon: toolData.icon,
      iconUrl: toolData.iconUrl,
      color: toolData.color,
      categoryId: toolData.categoryId,
      category: toolData.category ? {
        id: toolData.category.id,
        identifier: toolData.category.identifier,
        name: toolData.category.name,
      } : null,
      route: toolData.route,
      badge: toolData.badge,
      enabled: toolData.enabled,
      sort: toolData.sort,
      featureId: toolData.featureId,
      requireMember: toolData.requireMember,
      freeTrialCount: toolData.freeTrialCount,
      createdAt: toolData.createdAt,
      updatedAt: toolData.updatedAt,
    };
  }
}

module.exports = ToolService;
