/**
 * Feedback Service
 * Handles feedback CRUD operations, status updates, replies, and batch operations
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

const { Op } = require('sequelize');
const { Feedback, Tool, sequelize } = require('../models');

class FeedbackService {
  /**
   * Get feedbacks with pagination and filtering
   * Requirement: 8.2, 8.7
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated feedback list
   */
  static async getFeedbacks(params = {}) {
    const {
      current = 1,
      size = 10,
      type,
      status,
      toolName,
    } = params;

    const where = { deletedAt: null };

    // Filter by type (Requirement: 8.7)
    if (type) {
      where.type = type;
    }

    // Filter by status (Requirement: 8.7)
    if (status) {
      where.status = status;
    }

    const offset = (current - 1) * size;
    
    // Build include options for tool association
    const includeOptions = [
      {
        model: Tool,
        as: 'tool',
        attributes: ['id', 'name'],
        required: false,
      },
    ];

    // If filtering by tool name, we need to filter on the associated tool
    if (toolName) {
      includeOptions[0].where = {
        name: { [Op.like]: `%${toolName}%` },
      };
      includeOptions[0].required = true;
    }

    const { count, rows } = await Feedback.findAndCountAll({
      where,
      include: includeOptions,
      order: [['createdAt', 'DESC']],
      limit: parseInt(size, 10),
      offset,
    });

    return {
      success: true,
      data: {
        records: rows.map(feedback => this.formatFeedbackResponse(feedback)),
        current: parseInt(current, 10),
        size: parseInt(size, 10),
        total: count,
      },
    };
  }


  /**
   * Get feedback by ID
   * @param {number} id - Feedback ID
   * @returns {Promise<Object>} Feedback data
   */
  static async getFeedbackById(id) {
    const feedback = await Feedback.findOne({
      where: { id, deletedAt: null },
      include: [
        {
          model: Tool,
          as: 'tool',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    if (!feedback) {
      return {
        success: false,
        error: 'FEEDBACK_NOT_FOUND',
        message: '反馈不存在',
      };
    }

    return {
      success: true,
      data: this.formatFeedbackResponse(feedback),
    };
  }

  /**
   * Create a new feedback
   * Requirement: 8.1
   * @param {Object} feedbackData - Feedback data
   * @returns {Promise<Object>} Created feedback with ID
   */
  static async createFeedback(feedbackData) {
    const {
      type,
      toolId,
      content,
      contact,
    } = feedbackData;

    // Validate tool exists if provided
    if (toolId) {
      const tool = await Tool.findOne({
        where: { id: toolId, deletedAt: null },
      });
      if (!tool) {
        return {
          success: false,
          error: 'TOOL_NOT_FOUND',
          message: '工具不存在',
        };
      }
    }

    const feedback = await Feedback.create({
      type,
      toolId: toolId || null,
      content,
      contact: contact || null,
      status: 'pending',
    });

    return {
      success: true,
      data: { id: feedback.id },
      message: '反馈提交成功',
    };
  }

  /**
   * Update feedback status (mark as processing)
   * Requirement: 8.3
   * @param {number} id - Feedback ID
   * @returns {Promise<Object>} Updated feedback
   */
  static async updateFeedbackStatus(id, status) {
    const feedback = await Feedback.findOne({
      where: { id, deletedAt: null },
    });

    if (!feedback) {
      return {
        success: false,
        error: 'FEEDBACK_NOT_FOUND',
        message: '反馈不存在',
      };
    }

    await feedback.update({ status });

    return this.getFeedbackById(id);
  }

  /**
   * Resolve feedback with optional reply
   * Requirement: 8.3
   * @param {number} id - Feedback ID
   * @param {string} reply - Optional reply content
   * @returns {Promise<Object>} Updated feedback
   */
  static async resolveFeedback(id, reply = null) {
    const feedback = await Feedback.findOne({
      where: { id, deletedAt: null },
    });

    if (!feedback) {
      return {
        success: false,
        error: 'FEEDBACK_NOT_FOUND',
        message: '反馈不存在',
      };
    }

    const updateData = { status: 'resolved' };
    if (reply !== null && reply !== undefined) {
      updateData.reply = reply;
    }

    await feedback.update(updateData);

    return this.getFeedbackById(id);
  }


  /**
   * Delete feedback (soft delete)
   * Requirement: 8.5
   * @param {number} id - Feedback ID
   * @returns {Promise<Object>} Delete result
   */
  static async deleteFeedback(id) {
    const feedback = await Feedback.findOne({
      where: { id, deletedAt: null },
    });

    if (!feedback) {
      return {
        success: false,
        error: 'FEEDBACK_NOT_FOUND',
        message: '反馈不存在',
      };
    }

    // Soft delete by setting deletedAt
    await feedback.update({ deletedAt: new Date() });

    return {
      success: true,
      message: '反馈删除成功',
    };
  }

  /**
   * Batch resolve feedbacks
   * Requirement: 8.4
   * @param {Array<number>} ids - Feedback IDs to resolve
   * @param {string} reply - Optional reply content for all
   * @returns {Promise<Object>} Batch resolve result
   */
  static async batchResolveFeedbacks(ids, reply = null) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        error: 'INVALID_IDS',
        message: '反馈ID列表无效',
      };
    }

    const updateData = { status: 'resolved' };
    if (reply !== null && reply !== undefined) {
      updateData.reply = reply;
    }

    const result = await Feedback.update(
      updateData,
      {
        where: {
          id: { [Op.in]: ids },
          deletedAt: null,
        },
      }
    );

    return {
      success: true,
      message: `成功解决 ${result[0]} 条反馈`,
      data: { resolvedCount: result[0] },
    };
  }

  /**
   * Batch delete feedbacks (soft delete)
   * Requirement: 8.6
   * @param {Array<number>} ids - Feedback IDs to delete
   * @returns {Promise<Object>} Batch delete result
   */
  static async batchDeleteFeedbacks(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        error: 'INVALID_IDS',
        message: '反馈ID列表无效',
      };
    }

    const result = await Feedback.update(
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
      message: `成功删除 ${result[0]} 条反馈`,
      data: { deletedCount: result[0] },
    };
  }

  /**
   * Batch update feedback status
   * Requirement: 8.4
   * @param {Array<number>} ids - Feedback IDs
   * @param {string} status - New status
   * @returns {Promise<Object>} Batch update result
   */
  static async batchUpdateStatus(ids, status) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        error: 'INVALID_IDS',
        message: '反馈ID列表无效',
      };
    }

    const result = await Feedback.update(
      { status },
      {
        where: {
          id: { [Op.in]: ids },
          deletedAt: null,
        },
      }
    );

    return {
      success: true,
      message: `成功更新 ${result[0]} 条反馈状态`,
      data: { updatedCount: result[0] },
    };
  }


  /**
   * Format feedback response
   * Requirement: 8.8
   * @param {Object} feedback - Feedback model instance
   * @returns {Object} Formatted feedback data
   */
  static formatFeedbackResponse(feedback) {
    const feedbackData = feedback.toJSON ? feedback.toJSON() : feedback;
    return {
      id: feedbackData.id,
      type: feedbackData.type,
      toolId: feedbackData.toolId,
      toolName: feedbackData.tool ? feedbackData.tool.name : null,
      content: feedbackData.content,
      contact: feedbackData.contact,
      status: feedbackData.status,
      reply: feedbackData.reply,
      createdAt: feedbackData.createdAt,
      updatedAt: feedbackData.updatedAt,
    };
  }
}

module.exports = FeedbackService;
