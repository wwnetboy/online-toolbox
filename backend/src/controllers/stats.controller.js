/**
 * Stats Controller
 * Handles statistics data endpoints
 * Requirements: 9.1-9.7
 */

const StatsService = require('../services/stats.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

class StatsController {
  /**
   * Get aggregated statistics
   * GET /api/stats
   * Requirements: 9.1, 9.2, 9.6, 9.7
   */
  static async getStats(req, res) {
    try {
      const { timeRange = 'today' } = req.query;

      // Validate time range
      const validRanges = ['today', 'week', 'month', 'year'];
      if (!validRanges.includes(timeRange)) {
        return error(res, ErrorCodes.BAD_REQUEST, '无效的时间范围，支持: today, week, month, year');
      }

      const result = await StatsService.getStats(timeRange);

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '获取统计数据成功');
    } catch (err) {
      logger.error('Get stats error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取统计数据失败');
    }
  }

  /**
   * Get online visitors count
   * GET /api/stats/online-visitors
   * Requirement: 9.3
   */
  static async getOnlineVisitors(req, res) {
    try {
      const result = await StatsService.getOnlineVisitorsStats();

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '获取在线访客数成功');
    } catch (err) {
      logger.error('Get online visitors error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取在线访客数失败');
    }
  }

  /**
   * Record a page visit
   * POST /api/stats/visit
   * Requirement: 9.4
   */
  static async recordVisit(req, res) {
    try {
      const { visitorId, pagePath } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection?.remoteAddress;

      const result = await StatsService.recordVisit({
        visitorId,
        pagePath,
        userAgent,
        ipAddress,
      });

      if (!result.success) {
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      return success(res, result.data, '访问记录成功', 201);
    } catch (err) {
      logger.error('Record visit error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '访问记录失败');
    }
  }

  /**
   * Record a click event
   * POST /api/stats/click
   * Requirement: 9.5
   */
  static async recordClick(req, res) {
    try {
      const { visitorId, elementId, pagePath } = req.body;

      const result = await StatsService.recordClick({
        visitorId,
        elementId,
        pagePath,
      });

      if (!result.success) {
        return error(res, ErrorCodes.BAD_REQUEST, result.message);
      }

      return success(res, result.data, '点击记录成功', 201);
    } catch (err) {
      logger.error('Record click error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '点击记录失败');
    }
  }

  /**
   * Get visit records with pagination
   * GET /api/stats/visits
   * Requirement: 9.4
   */
  static async getVisits(req, res) {
    try {
      const { current, size, startDate, endDate, pagePath } = req.query;

      const result = await StatsService.getVisits({
        current,
        size,
        startDate,
        endDate,
        pagePath,
      });

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '获取访问记录成功');
    } catch (err) {
      logger.error('Get visits error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取访问记录失败');
    }
  }

  /**
   * Get click records with pagination
   * GET /api/stats/clicks
   * Requirement: 9.5
   */
  static async getClicks(req, res) {
    try {
      const { current, size, startDate, endDate, elementId } = req.query;

      const result = await StatsService.getClicks({
        current,
        size,
        startDate,
        endDate,
        elementId,
      });

      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }

      return success(res, result.data, '获取点击记录成功');
    } catch (err) {
      logger.error('Get clicks error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取点击记录失败');
    }
  }

  /**
   * Get monthly visit trend for current year
   * GET /api/stats/visit-trend
   */
  static async getVisitTrend(req, res) {
    try {
      const result = await StatsService.getVisitTrend();
      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }
      return success(res, result.data, '获取访问趋势成功');
    } catch (err) {
      logger.error('Get visit trend error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取访问趋势失败');
    }
  }

  /**
   * Get user overview stats
   * GET /api/stats/user-overview
   */
  static async getUserOverview(req, res) {
    try {
      const result = await StatsService.getUserOverview();
      if (!result.success) {
        return error(res, ErrorCodes.INTERNAL_ERROR, result.message);
      }
      return success(res, result.data, '获取用户概述成功');
    } catch (err) {
      logger.error('Get user overview error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取用户概述失败');
    }
  }

  /**
   * Get total usage count
   * GET /api/stats/total-usage
   */
  static async getTotalUsage(req, res) {
    try {
      const count = await StatsService.getTotalUsageCount();
      return success(res, { totalUsage: count }, '获取总使用次数成功');
    } catch (err) {
      logger.error('Get total usage error:', err);
      return error(res, ErrorCodes.INTERNAL_ERROR, '获取总使用次数失败');
    }
  }
}

module.exports = StatsController;
