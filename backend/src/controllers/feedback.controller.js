/**
 * Feedback Controller
 * Handles feedback management endpoints
 * Requirements: 8.1-8.8
 */

const FeedbackService = require('../services/feedback.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

class FeedbackController {
  /**
   * Get feedbacks with pagination and filtering
   * GET /api/feedback/list
   * Requirements: 8.2, 8.7
   */
  static async getFeedbacks(req, res) {
    try {
      const { current, size, type, status, toolName } = req.query;

      const result = await FeedbackService.getFeedbacks({
        current,
        size,
        type,
        status,
        toolName,
      });

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '查询反馈列表成功');
    } catch (err) {
      logger.error('Get feedbacks error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '查询反馈列表失败');
    }
  }

  /**
   * Get feedback by ID
   * GET /api/feedback/:id
   * Requirement: 8.2
   */
  static async getFeedbackById(req, res) {
    try {
      const { id } = req.params;

      const result = await FeedbackService.getFeedbackById(parseInt(id, 10));

      if (!result.success) {
        return error(res, ErrorCodes.NOT_FOUND, result.message);
      }

      return success(res, result.data, '获取反馈信息成功');
    } catch (err) {
      logger.error('Get feedback by ID error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取反馈信息失败');
    }
  }


  /**
   * Create new feedback
   * POST /api/feedback
   * Requirement: 8.1
   */
  static async createFeedback(req, res) {
    try {
      const {
        type,
        toolId,
        content,
        contact,
      } = req.body;

      const result = await FeedbackService.createFeedback({
        type,
        toolId,
        content,
        contact,
      });

      if (!result.success) {
        if (result.error === 'TOOL_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Feedback created: ${result.data.id}`);
      return success(res, result.data, '反馈提交成功', 201);
    } catch (err) {
      logger.error('Create feedback error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '反馈提交失败');
    }
  }

  /**
   * Update feedback status
   * PUT /api/feedback/:id/status
   * Requirement: 8.3
   */
  static async updateFeedbackStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await FeedbackService.updateFeedbackStatus(parseInt(id, 10), status);

      if (!result.success) {
        if (result.error === 'FEEDBACK_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Feedback status updated: ${id}`, { updatedBy: req.user?.userId });
      return success(res, result.data, '反馈状态更新成功');
    } catch (err) {
      logger.error('Update feedback status error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '反馈状态更新失败');
    }
  }

  /**
   * Resolve feedback with optional reply
   * PUT /api/feedback/:id/resolve
   * Requirement: 8.3
   */
  static async resolveFeedback(req, res) {
    try {
      const { id } = req.params;
      const { reply } = req.body;

      const result = await FeedbackService.resolveFeedback(parseInt(id, 10), reply);

      if (!result.success) {
        if (result.error === 'FEEDBACK_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Feedback resolved: ${id}`, { resolvedBy: req.user?.userId });
      return success(res, result.data, '反馈已解决');
    } catch (err) {
      logger.error('Resolve feedback error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '解决反馈失败');
    }
  }


  /**
   * Delete feedback (soft delete)
   * DELETE /api/feedback/:id
   * Requirement: 8.5
   */
  static async deleteFeedback(req, res) {
    try {
      const { id } = req.params;

      const result = await FeedbackService.deleteFeedback(parseInt(id, 10));

      if (!result.success) {
        if (result.error === 'FEEDBACK_NOT_FOUND') {
          return error(res, ErrorCodes.NOT_FOUND, result.message);
        }
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Feedback deleted: ${id}`, { deletedBy: req.user?.userId });
      return success(res, null, '反馈删除成功');
    } catch (err) {
      logger.error('Delete feedback error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '删除反馈失败');
    }
  }

  /**
   * Batch resolve feedbacks
   * PUT /api/feedback/batch/resolve
   * Requirement: 8.4
   */
  static async batchResolveFeedbacks(req, res) {
    try {
      const { ids, reply } = req.body;

      const result = await FeedbackService.batchResolveFeedbacks(ids, reply);

      if (!result.success) {
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Feedbacks batch resolved: ${ids.join(', ')}`, { resolvedBy: req.user?.userId });
      return success(res, result.data, result.message);
    } catch (err) {
      logger.error('Batch resolve feedbacks error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '批量解决反馈失败');
    }
  }

  /**
   * Batch delete feedbacks (soft delete)
   * DELETE /api/feedback/batch
   * Requirement: 8.6
   */
  static async batchDeleteFeedbacks(req, res) {
    try {
      const { ids } = req.body;

      const result = await FeedbackService.batchDeleteFeedbacks(ids);

      if (!result.success) {
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Feedbacks batch deleted: ${ids.join(', ')}`, { deletedBy: req.user?.userId });
      return success(res, result.data, result.message);
    } catch (err) {
      logger.error('Batch delete feedbacks error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '批量删除反馈失败');
    }
  }

  /**
   * Batch update feedback status
   * PUT /api/feedback/batch/status
   * Requirement: 8.4
   */
  static async batchUpdateStatus(req, res) {
    try {
      const { ids, status } = req.body;

      const result = await FeedbackService.batchUpdateStatus(ids, status);

      if (!result.success) {
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      logger.info(`Feedbacks batch status updated: ${ids.join(', ')}`, { updatedBy: req.user?.userId });
      return success(res, result.data, result.message);
    } catch (err) {
      logger.error('Batch update status error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '批量更新反馈状态失败');
    }
  }
}

module.exports = FeedbackController;
