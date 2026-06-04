/**
 * Stats Service
 * Handles visit recording, statistics aggregation, and trend calculation
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

const { Op, fn, col, literal } = require('sequelize');
const { Visit, Click, User, sequelize } = require('../models');

class StatsService {
  /**
   * Get time range boundaries based on the specified range type
   * @param {string} timeRange - Time range type: 'today', 'week', 'month', 'year'
   * @returns {Object} Object containing start and end dates for current and previous periods
   */
  static getTimeRangeBoundaries(timeRange) {
    const now = new Date();
    let currentStart, currentEnd, previousStart, previousEnd;

    switch (timeRange) {
      case 'today':
        // Current period: today (00:00:00 to 23:59:59)
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        // Previous period: yesterday
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = new Date(currentEnd);
        previousEnd.setDate(previousEnd.getDate() - 1);
        break;

      case 'week':
        // Current period: this week (Monday to Sunday)
        const dayOfWeek = now.getDay() || 7; // Convert Sunday (0) to 7
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        // Previous period: last week
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(currentStart);
        previousEnd.setMilliseconds(-1);
        break;

      case 'month':
        // Current period: this month
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        // Previous period: last month
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        previousEnd = new Date(currentStart);
        previousEnd.setMilliseconds(-1);
        break;

      case 'year':
        // Current period: this year
        currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        // Previous period: last year
        previousStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
        previousEnd = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        previousEnd.setMilliseconds(-1);
        break;

      default:
        // Default to today
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = new Date(currentEnd);
        previousEnd.setDate(previousEnd.getDate() - 1);
    }

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  /**
   * Calculate trend percentage between current and previous values
   * Requirement: 9.2
   * @param {number} currentValue - Current period value
   * @param {number} previousValue - Previous period value
   * @returns {number} Trend percentage (positive for increase, negative for decrease)
   */
  static calculateTrend(currentValue, previousValue) {
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }

  /**
   * Record a page visit
   * Requirement: 9.4
   * @param {Object} visitData - Visit data
   * @returns {Promise<Object>} Created visit record
   */
  static async recordVisit(visitData) {
    const { visitorId, pagePath, userAgent, ipAddress } = visitData;

    if (!visitorId || !pagePath) {
      return {
        success: false,
        error: 'INVALID_DATA',
        message: '访客ID和页面路径不能为空',
      };
    }

    const visit = await Visit.create({
      visitorId,
      pagePath,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    });

    return {
      success: true,
      data: { id: visit.id },
      message: '访问记录成功',
    };
  }

  /**
   * Record a click event
   * Requirement: 9.5
   * @param {Object} clickData - Click data
   * @returns {Promise<Object>} Created click record
   */
  static async recordClick(clickData) {
    const { visitorId, elementId, pagePath } = clickData;

    if (!visitorId || !pagePath) {
      return {
        success: false,
        error: 'INVALID_DATA',
        message: '访客ID和页面路径不能为空',
      };
    }

    const click = await Click.create({
      visitorId,
      elementId: elementId || null,
      pagePath,
    });

    return {
      success: true,
      data: { id: click.id },
      message: '点击记录成功',
    };
  }

  /**
   * Get total visits count for a time range
   * Requirement: 9.1
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Total visits count
   */
  static async getTotalVisits(startDate, endDate) {
    const count = await Visit.count({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
    });
    return count;
  }

  /**
   * Get unique visitors count for a time range
   * Requirement: 9.1
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Unique visitors count
   */
  static async getUniqueVisitors(startDate, endDate) {
    const result = await Visit.count({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      distinct: true,
      col: 'visitorId',
    });
    return result;
  }

  /**
   * Get click count for a time range
   * Requirement: 9.1
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Click count
   */
  static async getClickCount(startDate, endDate) {
    const count = await Click.count({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
    });
    return count;
  }

  /**
   * Get new users count for a time range
   * Requirement: 9.1
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} New users count
   */
  static async getNewUsers(startDate, endDate) {
    const count = await User.count({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
        deletedAt: null,
      },
    });
    return count;
  }

  /**
   * Get online visitors count (active in last 5 minutes)
   * Requirement: 9.3
   * @returns {Promise<number>} Online visitors count
   */
  static async getOnlineVisitors() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const result = await Visit.count({
      where: {
        createdAt: {
          [Op.gte]: fiveMinutesAgo,
        },
      },
      distinct: true,
      col: 'visitorId',
    });
    return result;
  }

  /**
   * Get aggregated statistics for a time range
   * Requirement: 9.1, 9.2, 9.6, 9.7
   * @param {string} timeRange - Time range: 'today', 'week', 'month', 'year'
   * @returns {Promise<Object>} Aggregated statistics with trends
   */
  static async getStats(timeRange = 'today') {
    const { currentStart, currentEnd, previousStart, previousEnd } = 
      this.getTimeRangeBoundaries(timeRange);
    const timestamp = Date.now();

    // Get current period stats
    const [
      currentTotalVisits,
      currentUniqueVisitors,
      currentClickCount,
      currentNewUsers,
    ] = await Promise.all([
      this.getTotalVisits(currentStart, currentEnd),
      this.getUniqueVisitors(currentStart, currentEnd),
      this.getClickCount(currentStart, currentEnd),
      this.getNewUsers(currentStart, currentEnd),
    ]);

    // Get previous period stats for trend calculation
    const [
      previousTotalVisits,
      previousUniqueVisitors,
      previousClickCount,
      previousNewUsers,
    ] = await Promise.all([
      this.getTotalVisits(previousStart, previousEnd),
      this.getUniqueVisitors(previousStart, previousEnd),
      this.getClickCount(previousStart, previousEnd),
      this.getNewUsers(previousStart, previousEnd),
    ]);

    // Get online visitors (real-time)
    const onlineVisitors = await this.getOnlineVisitors();

    // Calculate trends (Requirement: 9.2)
    return {
      success: true,
      data: {
        totalVisits: {
          value: currentTotalVisits,
          trend: this.calculateTrend(currentTotalVisits, previousTotalVisits),
          timestamp,
        },
        uniqueVisitors: {
          value: currentUniqueVisitors,
          trend: this.calculateTrend(currentUniqueVisitors, previousUniqueVisitors),
          timestamp,
        },
        onlineVisitors: {
          value: onlineVisitors,
          trend: 0, // Online visitors don't have a trend
          timestamp,
        },
        clickCount: {
          value: currentClickCount,
          trend: this.calculateTrend(currentClickCount, previousClickCount),
          timestamp,
        },
        newUsers: {
          value: currentNewUsers,
          trend: this.calculateTrend(currentNewUsers, previousNewUsers),
          timestamp,
        },
      },
    };
  }

  /**
   * Get online visitors with trend
   * Requirement: 9.3
   * @returns {Promise<Object>} Online visitors data
   */
  static async getOnlineVisitorsStats() {
    const onlineVisitors = await this.getOnlineVisitors();
    
    return {
      success: true,
      data: {
        value: onlineVisitors,
        trend: 0, // Real-time data doesn't have a trend
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Get visit records with pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated visit records
   */
  static async getVisits(params = {}) {
    const { current = 1, size = 10, startDate, endDate, pagePath } = params;

    const where = {};

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (pagePath) {
      where.pagePath = { [Op.like]: `%${pagePath}%` };
    }

    const offset = (current - 1) * size;

    const { count, rows } = await Visit.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(size, 10),
      offset,
    });

    return {
      success: true,
      data: {
        records: rows.map(visit => ({
          id: visit.id,
          visitorId: visit.visitorId,
          pagePath: visit.pagePath,
          userAgent: visit.userAgent,
          ipAddress: visit.ipAddress,
          createdAt: visit.createdAt,
        })),
        current: parseInt(current, 10),
        size: parseInt(size, 10),
        total: count,
      },
    };
  }

  /**
   * Get monthly visit trend for the current year
   * @returns {Promise<Object>} Monthly visit data and growth info
   */
  static async getVisitTrend() {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Monthly visits for current year (use raw SQL to avoid field mapping issues)
    const [monthlyVisits] = await sequelize.query(
      `SELECT MONTH(created_at) AS \`month\`, COUNT(*) AS \`count\`
       FROM visits
       WHERE created_at BETWEEN ? AND ?
       GROUP BY MONTH(created_at)
       ORDER BY MONTH(created_at) ASC`,
      {
        replacements: [
          new Date(currentYear, 0, 1),
          new Date(currentYear, 11, 31, 23, 59, 59, 999),
        ],
      }
    );

    // Build 12-month array
    const data = Array(12).fill(0);
    monthlyVisits.forEach((row) => {
      data[row.month - 1] = parseInt(row.count, 10);
    });

    // Calculate year-over-year growth
    const [lastYearResult] = await sequelize.query(
      `SELECT COUNT(*) AS \`count\` FROM visits WHERE created_at BETWEEN ? AND ?`,
      {
        replacements: [
          new Date(currentYear - 1, 0, 1),
          new Date(currentYear - 1, 11, 31, 23, 59, 59, 999),
        ],
      }
    );
    const lastYearTotal = parseInt(lastYearResult[0].count, 10);

    const currentYearTotal = data.reduce((sum, v) => sum + v, 0);
    const growth = this.calculateTrend(currentYearTotal, lastYearTotal);

    return {
      success: true,
      data: {
        data,
        xAxisData: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        totalThisYear: currentYearTotal,
        growth,
      },
    };
  }

  /**
   * Get user overview stats for bar chart
   * @returns {Promise<Object>} User overview data with monthly stats and summary
   */
  static async getUserOverview() {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Monthly active users (unique visitors) for last 9 months
    const nineMonthsAgo = new Date(currentYear, now.getMonth() - 8, 1);
    const [monthlyActiveUsers] = await sequelize.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS \`month\`, COUNT(DISTINCT visitor_id) AS \`count\`
       FROM visits
       WHERE created_at >= ?
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC`,
      { replacements: [nineMonthsAgo] }
    );

    // Build last 9 months labels and data
    const labels = [];
    const chartData = [];
    for (let i = 8; i >= 0; i--) {
      const d = new Date(currentYear, now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(`${d.getMonth() + 1}月`);
      const found = monthlyActiveUsers.find((row) => row.month === key);
      chartData.push(found ? parseInt(found.count, 10) : 0);
    }

    // Summary stats
    const totalUsers = await User.count({ where: { deletedAt: null } });
    const totalVisits = await Visit.count();

    // Today's visits
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailyVisits = await Visit.count({
      where: { createdAt: { [Op.gte]: todayStart } },
    });

    // Week-over-week trend
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - (now.getDay() || 7) + 1);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setMilliseconds(-1);

    const [thisWeekVisits, lastWeekVisits] = await Promise.all([
      Visit.count({ where: { createdAt: { [Op.between]: [weekStart, now] } } }),
      Visit.count({ where: { createdAt: { [Op.between]: [prevWeekStart, prevWeekEnd] } } }),
    ]);
    const weekTrend = this.calculateTrend(thisWeekVisits, lastWeekVisits);

    return {
      success: true,
      data: {
        chartData,
        xAxisLabels: labels,
        totalUsers,
        totalVisits,
        dailyVisits,
        weekTrend,
      },
    };
  }

  /**
   * Get total usage count (all time)
   * @returns {Promise<number>} Total usage count
   */
  static async getTotalUsageCount() {
    const { UsageRecord } = require('../models');
    const count = await UsageRecord.count();
    return count;
  }

  /**
   * Get click records with pagination
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated click records
   */
  static async getClicks(params = {}) {
    const { current = 1, size = 10, startDate, endDate, elementId } = params;

    const where = {};

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (elementId) {
      where.elementId = { [Op.like]: `%${elementId}%` };
    }

    const offset = (current - 1) * size;

    const { count, rows } = await Click.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(size, 10),
      offset,
    });

    return {
      success: true,
      data: {
        records: rows.map(click => ({
          id: click.id,
          visitorId: click.visitorId,
          elementId: click.elementId,
          pagePath: click.pagePath,
          createdAt: click.createdAt,
        })),
        current: parseInt(current, 10),
        size: parseInt(size, 10),
        total: count,
      },
    };
  }
}

module.exports = StatsService;
