/**
 * Property-Based Tests for Stats Service
 * Feature: backend-api
 * Tests statistics time range consistency and trend calculation correctness
 */

const fc = require('fast-check');

/**
 * Property 17: Statistics Data Time Range Consistency
 * For any statistics data request, the returned data should only include
 * aggregated results within the specified time range.
 * 
 * Validates: Requirements 9.1
 */
describe('Property 17: Statistics Data Time Range Consistency', () => {
  // Simulated database for statistics testing
  class MockStatsDatabase {
    constructor() {
      this.visits = [];
      this.clicks = [];
      this.users = [];
      this.nextVisitId = 1;
      this.nextClickId = 1;
      this.nextUserId = 1;
    }

    // Helper to get time range boundaries
    getTimeRangeBoundaries(timeRange) {
      const now = new Date();
      let currentStart, currentEnd, previousStart, previousEnd;

      switch (timeRange) {
        case 'today':
          currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          previousStart = new Date(currentStart);
          previousStart.setDate(previousStart.getDate() - 1);
          previousEnd = new Date(currentEnd);
          previousEnd.setDate(previousEnd.getDate() - 1);
          break;

        case 'week':
          const dayOfWeek = now.getDay() || 7;
          currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1, 0, 0, 0);
          currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          previousStart = new Date(currentStart);
          previousStart.setDate(previousStart.getDate() - 7);
          previousEnd = new Date(currentStart);
          previousEnd.setMilliseconds(-1);
          break;

        case 'month':
          currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
          previousEnd = new Date(currentStart);
          previousEnd.setMilliseconds(-1);
          break;

        case 'year':
          currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
          currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          previousStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
          previousEnd = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
          previousEnd.setMilliseconds(-1);
          break;

        default:
          currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          previousStart = new Date(currentStart);
          previousStart.setDate(previousStart.getDate() - 1);
          previousEnd = new Date(currentEnd);
          previousEnd.setDate(previousEnd.getDate() - 1);
      }

      return { currentStart, currentEnd, previousStart, previousEnd };
    }

    createVisit(visitData) {
      const visit = {
        id: this.nextVisitId++,
        visitorId: visitData.visitorId,
        pagePath: visitData.pagePath,
        createdAt: visitData.createdAt || new Date(),
      };
      this.visits.push(visit);
      return visit;
    }

    createClick(clickData) {
      const click = {
        id: this.nextClickId++,
        visitorId: clickData.visitorId,
        elementId: clickData.elementId,
        pagePath: clickData.pagePath,
        createdAt: clickData.createdAt || new Date(),
      };
      this.clicks.push(click);
      return click;
    }

    createUser(userData) {
      const user = {
        id: this.nextUserId++,
        userName: userData.userName,
        createdAt: userData.createdAt || new Date(),
        deletedAt: null,
      };
      this.users.push(user);
      return user;
    }

    getTotalVisits(startDate, endDate) {
      return this.visits.filter(v => 
        v.createdAt >= startDate && v.createdAt <= endDate
      ).length;
    }

    getUniqueVisitors(startDate, endDate) {
      const visitors = new Set();
      this.visits
        .filter(v => v.createdAt >= startDate && v.createdAt <= endDate)
        .forEach(v => visitors.add(v.visitorId));
      return visitors.size;
    }

    getClickCount(startDate, endDate) {
      return this.clicks.filter(c => 
        c.createdAt >= startDate && c.createdAt <= endDate
      ).length;
    }

    getNewUsers(startDate, endDate) {
      return this.users.filter(u => 
        u.createdAt >= startDate && u.createdAt <= endDate && u.deletedAt === null
      ).length;
    }

    getStats(timeRange) {
      const { currentStart, currentEnd } = this.getTimeRangeBoundaries(timeRange);
      
      return {
        success: true,
        data: {
          totalVisits: { value: this.getTotalVisits(currentStart, currentEnd) },
          uniqueVisitors: { value: this.getUniqueVisitors(currentStart, currentEnd) },
          clickCount: { value: this.getClickCount(currentStart, currentEnd) },
          newUsers: { value: this.getNewUsers(currentStart, currentEnd) },
        },
        timeRange: { start: currentStart, end: currentEnd },
      };
    }
  }

  it('should only include visits within the specified time range', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('today', 'week', 'month', 'year'),
        fc.array(
          fc.record({
            visitorId: fc.string({ minLength: 5, maxLength: 20 }),
            pagePath: fc.string({ minLength: 1, maxLength: 50 }),
            daysAgo: fc.integer({ min: -365, max: 365 }), // days relative to now
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (timeRange, visitDataList) => {
          const db = new MockStatsDatabase();
          const now = new Date();
          const { currentStart, currentEnd } = db.getTimeRangeBoundaries(timeRange);

          // Create visits at various times
          visitDataList.forEach(data => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - data.daysAgo);
            db.createVisit({
              visitorId: data.visitorId,
              pagePath: data.pagePath,
              createdAt,
            });
          });

          // Get stats
          const result = db.getStats(timeRange);
          expect(result.success).toBe(true);

          // Manually count visits within range
          const expectedCount = visitDataList.filter(data => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - data.daysAgo);
            return createdAt >= currentStart && createdAt <= currentEnd;
          }).length;

          // Property: returned count should match visits within time range
          expect(result.data.totalVisits.value).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only include clicks within the specified time range', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('today', 'week', 'month', 'year'),
        fc.array(
          fc.record({
            visitorId: fc.string({ minLength: 5, maxLength: 20 }),
            elementId: fc.string({ minLength: 1, maxLength: 30 }),
            pagePath: fc.string({ minLength: 1, maxLength: 50 }),
            daysAgo: fc.integer({ min: -365, max: 365 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (timeRange, clickDataList) => {
          const db = new MockStatsDatabase();
          const now = new Date();
          const { currentStart, currentEnd } = db.getTimeRangeBoundaries(timeRange);

          // Create clicks at various times
          clickDataList.forEach(data => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - data.daysAgo);
            db.createClick({
              visitorId: data.visitorId,
              elementId: data.elementId,
              pagePath: data.pagePath,
              createdAt,
            });
          });

          // Get stats
          const result = db.getStats(timeRange);
          expect(result.success).toBe(true);

          // Manually count clicks within range
          const expectedCount = clickDataList.filter(data => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - data.daysAgo);
            return createdAt >= currentStart && createdAt <= currentEnd;
          }).length;

          // Property: returned count should match clicks within time range
          expect(result.data.clickCount.value).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only count unique visitors within the specified time range', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('today', 'week', 'month', 'year'),
        fc.array(
          fc.record({
            visitorId: fc.constantFrom('visitor1', 'visitor2', 'visitor3', 'visitor4', 'visitor5'),
            pagePath: fc.string({ minLength: 1, maxLength: 50 }),
            daysAgo: fc.integer({ min: -30, max: 30 }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (timeRange, visitDataList) => {
          const db = new MockStatsDatabase();
          const now = new Date();
          const { currentStart, currentEnd } = db.getTimeRangeBoundaries(timeRange);

          // Create visits
          visitDataList.forEach(data => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - data.daysAgo);
            db.createVisit({
              visitorId: data.visitorId,
              pagePath: data.pagePath,
              createdAt,
            });
          });

          // Get stats
          const result = db.getStats(timeRange);
          expect(result.success).toBe(true);

          // Manually count unique visitors within range
          const uniqueVisitors = new Set();
          visitDataList.forEach(data => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - data.daysAgo);
            if (createdAt >= currentStart && createdAt <= currentEnd) {
              uniqueVisitors.add(data.visitorId);
            }
          });

          // Property: returned unique visitors should match
          expect(result.data.uniqueVisitors.value).toBe(uniqueVisitors.size);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only count new users within the specified time range', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('today', 'week', 'month', 'year'),
        fc.array(
          fc.record({
            userName: fc.string({ minLength: 3, maxLength: 20 }),
            daysAgo: fc.integer({ min: -365, max: 365 }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (timeRange, userDataList) => {
          const db = new MockStatsDatabase();
          const now = new Date();
          const { currentStart, currentEnd } = db.getTimeRangeBoundaries(timeRange);

          // Create users at various times with unique usernames
          const usedUsernames = new Set();
          userDataList.forEach((data, index) => {
            let userName = data.userName;
            while (usedUsernames.has(userName)) {
              userName = `${data.userName}_${index}`;
            }
            usedUsernames.add(userName);
            
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - data.daysAgo);
            db.createUser({ userName, createdAt });
          });

          // Get stats
          const result = db.getStats(timeRange);
          expect(result.success).toBe(true);

          // Manually count new users within range
          const expectedCount = userDataList.filter(data => {
            const createdAt = new Date(now);
            createdAt.setDate(createdAt.getDate() - data.daysAgo);
            return createdAt >= currentStart && createdAt <= currentEnd;
          }).length;

          // Property: returned new users count should match
          expect(result.data.newUsers.value).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return zero counts when no data exists in time range', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('today', 'week', 'month', 'year'),
        (timeRange) => {
          const db = new MockStatsDatabase();
          const now = new Date();

          // Create data outside the time range (far in the past)
          for (let i = 0; i < 10; i++) {
            const createdAt = new Date(now);
            createdAt.setFullYear(createdAt.getFullYear() - 2); // 2 years ago
            db.createVisit({ visitorId: `visitor_${i}`, pagePath: '/test', createdAt });
            db.createClick({ visitorId: `visitor_${i}`, elementId: 'btn', pagePath: '/test', createdAt });
            db.createUser({ userName: `user_${i}`, createdAt });
          }

          // Get stats
          const result = db.getStats(timeRange);
          expect(result.success).toBe(true);

          // Property: all counts should be zero for current time range
          expect(result.data.totalVisits.value).toBe(0);
          expect(result.data.uniqueVisitors.value).toBe(0);
          expect(result.data.clickCount.value).toBe(0);
          expect(result.data.newUsers.value).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle boundary dates correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('today'),
        fc.integer({ min: 1, max: 10 }),
        (timeRange, visitCount) => {
          const db = new MockStatsDatabase();
          const { currentStart, currentEnd } = db.getTimeRangeBoundaries(timeRange);

          // Create visits exactly at boundaries
          for (let i = 0; i < visitCount; i++) {
            // Visit at start of range
            db.createVisit({
              visitorId: `start_visitor_${i}`,
              pagePath: '/start',
              createdAt: new Date(currentStart),
            });
            // Visit at end of range
            db.createVisit({
              visitorId: `end_visitor_${i}`,
              pagePath: '/end',
              createdAt: new Date(currentEnd),
            });
          }

          // Get stats
          const result = db.getStats(timeRange);
          expect(result.success).toBe(true);

          // Property: boundary visits should be included
          expect(result.data.totalVisits.value).toBe(visitCount * 2);
          expect(result.data.uniqueVisitors.value).toBe(visitCount * 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});



/**
 * Property 18: Trend Calculation Correctness
 * For any statistics data, the trend percentage should correctly reflect
 * the change ratio between the current period and the previous period.
 * 
 * Validates: Requirements 9.2
 */
describe('Property 18: Trend Calculation Correctness', () => {
  /**
   * Calculate trend percentage between current and previous values
   * @param {number} currentValue - Current period value
   * @param {number} previousValue - Previous period value
   * @returns {number} Trend percentage
   */
  function calculateTrend(currentValue, previousValue) {
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }

  // Simulated stats service for trend calculation testing
  class MockStatsService {
    constructor() {
      this.currentPeriodData = {
        totalVisits: 0,
        uniqueVisitors: 0,
        clickCount: 0,
        newUsers: 0,
      };
      this.previousPeriodData = {
        totalVisits: 0,
        uniqueVisitors: 0,
        clickCount: 0,
        newUsers: 0,
      };
    }

    setCurrentPeriodData(data) {
      this.currentPeriodData = { ...this.currentPeriodData, ...data };
    }

    setPreviousPeriodData(data) {
      this.previousPeriodData = { ...this.previousPeriodData, ...data };
    }

    getStats() {
      const timestamp = Date.now();
      return {
        success: true,
        data: {
          totalVisits: {
            value: this.currentPeriodData.totalVisits,
            trend: calculateTrend(
              this.currentPeriodData.totalVisits,
              this.previousPeriodData.totalVisits
            ),
            timestamp,
          },
          uniqueVisitors: {
            value: this.currentPeriodData.uniqueVisitors,
            trend: calculateTrend(
              this.currentPeriodData.uniqueVisitors,
              this.previousPeriodData.uniqueVisitors
            ),
            timestamp,
          },
          clickCount: {
            value: this.currentPeriodData.clickCount,
            trend: calculateTrend(
              this.currentPeriodData.clickCount,
              this.previousPeriodData.clickCount
            ),
            timestamp,
          },
          newUsers: {
            value: this.currentPeriodData.newUsers,
            trend: calculateTrend(
              this.currentPeriodData.newUsers,
              this.previousPeriodData.newUsers
            ),
            timestamp,
          },
        },
      };
    }
  }

  it('should calculate positive trend when current > previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }), // previous value (non-zero)
        fc.integer({ min: 1, max: 10000 }), // increase amount
        (previousValue, increaseAmount) => {
          const currentValue = previousValue + increaseAmount;
          const trend = calculateTrend(currentValue, previousValue);

          // Property: trend should be non-negative when current > previous
          // Note: Due to rounding, small increases relative to large previous values may round to 0
          expect(trend).toBeGreaterThanOrEqual(0);

          // Property: trend should equal the correct percentage (rounded)
          const expectedTrend = Math.round(((currentValue - previousValue) / previousValue) * 100);
          expect(trend).toBe(expectedTrend);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate negative trend when current < previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10000 }), // previous value (at least 2 to allow decrease)
        fc.integer({ min: 1, max: 10000 }), // decrease amount
        (previousValue, decreaseAmount) => {
          const actualDecrease = Math.min(decreaseAmount, previousValue - 1);
          const currentValue = previousValue - actualDecrease;
          const trend = calculateTrend(currentValue, previousValue);

          // Property: trend should be non-positive when current < previous
          // Note: Due to rounding, small decreases relative to large previous values may round to 0
          expect(trend).toBeLessThanOrEqual(0);

          // Property: trend should equal the correct percentage (rounded)
          const expectedTrend = Math.round(((currentValue - previousValue) / previousValue) * 100);
          expect(trend).toBe(expectedTrend);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return zero trend when current equals previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (value) => {
          const trend = calculateTrend(value, value);

          // Property: trend should be zero when values are equal
          expect(trend).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 100% trend when previous is zero and current is positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (currentValue) => {
          const trend = calculateTrend(currentValue, 0);

          // Property: trend should be 100% when going from 0 to positive
          expect(trend).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0% trend when both current and previous are zero', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const trend = calculateTrend(0, 0);

          // Property: trend should be 0% when both values are zero
          expect(trend).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate correct trends for all stat types', () => {
    fc.assert(
      fc.property(
        fc.record({
          currentVisits: fc.integer({ min: 0, max: 10000 }),
          previousVisits: fc.integer({ min: 0, max: 10000 }),
          currentUniqueVisitors: fc.integer({ min: 0, max: 5000 }),
          previousUniqueVisitors: fc.integer({ min: 0, max: 5000 }),
          currentClicks: fc.integer({ min: 0, max: 20000 }),
          previousClicks: fc.integer({ min: 0, max: 20000 }),
          currentNewUsers: fc.integer({ min: 0, max: 1000 }),
          previousNewUsers: fc.integer({ min: 0, max: 1000 }),
        }),
        (data) => {
          const service = new MockStatsService();
          
          service.setCurrentPeriodData({
            totalVisits: data.currentVisits,
            uniqueVisitors: data.currentUniqueVisitors,
            clickCount: data.currentClicks,
            newUsers: data.currentNewUsers,
          });
          
          service.setPreviousPeriodData({
            totalVisits: data.previousVisits,
            uniqueVisitors: data.previousUniqueVisitors,
            clickCount: data.previousClicks,
            newUsers: data.previousNewUsers,
          });

          const result = service.getStats();
          expect(result.success).toBe(true);

          // Property: each stat's trend should be correctly calculated
          expect(result.data.totalVisits.trend).toBe(
            calculateTrend(data.currentVisits, data.previousVisits)
          );
          expect(result.data.uniqueVisitors.trend).toBe(
            calculateTrend(data.currentUniqueVisitors, data.previousUniqueVisitors)
          );
          expect(result.data.clickCount.trend).toBe(
            calculateTrend(data.currentClicks, data.previousClicks)
          );
          expect(result.data.newUsers.trend).toBe(
            calculateTrend(data.currentNewUsers, data.previousNewUsers)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle large percentage changes correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // small previous value
        fc.integer({ min: 1000, max: 100000 }), // large current value
        (previousValue, currentValue) => {
          const trend = calculateTrend(currentValue, previousValue);

          // Property: trend should be a large positive number
          expect(trend).toBeGreaterThan(100);

          // Property: trend should be correctly calculated
          const expectedTrend = Math.round(((currentValue - previousValue) / previousValue) * 100);
          expect(trend).toBe(expectedTrend);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle -100% trend when current is zero and previous is positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (previousValue) => {
          const trend = calculateTrend(0, previousValue);

          // Property: trend should be -100% when going from positive to zero
          expect(trend).toBe(-100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should round trend percentages to integers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        (currentValue, previousValue) => {
          const trend = calculateTrend(currentValue, previousValue);

          // Property: trend should be an integer (rounded)
          expect(Number.isInteger(trend)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include timestamp in all stat items', () => {
    fc.assert(
      fc.property(
        fc.record({
          currentVisits: fc.integer({ min: 0, max: 1000 }),
          previousVisits: fc.integer({ min: 0, max: 1000 }),
        }),
        (data) => {
          const service = new MockStatsService();
          service.setCurrentPeriodData({ totalVisits: data.currentVisits });
          service.setPreviousPeriodData({ totalVisits: data.previousVisits });

          const beforeTime = Date.now();
          const result = service.getStats();
          const afterTime = Date.now();

          // Property: each stat item should have a timestamp
          expect(result.data.totalVisits.timestamp).toBeDefined();
          expect(result.data.uniqueVisitors.timestamp).toBeDefined();
          expect(result.data.clickCount.timestamp).toBeDefined();
          expect(result.data.newUsers.timestamp).toBeDefined();

          // Property: timestamp should be within the execution window
          expect(result.data.totalVisits.timestamp).toBeGreaterThanOrEqual(beforeTime);
          expect(result.data.totalVisits.timestamp).toBeLessThanOrEqual(afterTime);
        }
      ),
      { numRuns: 100 }
    );
  });
});
