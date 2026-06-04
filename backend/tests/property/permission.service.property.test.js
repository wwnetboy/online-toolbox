/**
 * Property-Based Tests for Permission Service
 * Feature: pdf-advanced-tools, Property 1: Permission Check Consistency
 * Feature: pdf-advanced-tools, Property 2: Usage Count Limit Correctness
 * Validates: Requirements 1.2, 1.3, 1.6
 */

const fc = require('fast-check');

// Mock the database models
const mockFeaturePermission = {
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
};

const mockUsageRecord = {
  count: jest.fn(),
  create: jest.fn(),
};

const mockMember = {
  findOne: jest.fn(),
};

// Mock sequelize Op
jest.mock('sequelize', () => ({
  Op: {
    lte: Symbol('lte'),
    gte: Symbol('gte'),
    lt: Symbol('lt'),
  },
}));

// Mock the models module
jest.mock('../../src/models', () => ({
  FeaturePermission: mockFeaturePermission,
  UsageRecord: mockUsageRecord,
  Member: mockMember,
}));

// Import the service after mocking
const PermissionService = require('../../src/services/permission.service');

describe('PermissionService Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: Permission Check Consistency
   * For any feature configuration and user state combination, permission check results
   * should be consistent with configuration rules:
   * - If feature is free, any user should get allowed=true
   * - If feature requires member and user is member, should get allowed=true
   * - If feature requires member and user is non-member with remaining free trials, should get allowed=true
   * - If feature requires member and user is non-member with no remaining trials, should get allowed=false
   * 
   * Validates: Requirements 1.2, 1.3, 1.6
   */
  describe('Property 1: Permission Check Consistency', () => {
    it('should allow access to free features for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate feature ID
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          // Generate optional user ID (null for visitors)
          fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
          // Generate visitor ID
          fc.string({ minLength: 10, maxLength: 64 }),
          async (featureId, userId, visitorId) => {
            // Setup: Feature is free (requireMember = false)
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: false,
              freeTrialCount: 0,
              enabled: true,
            });

            const result = await PermissionService.checkPermission(featureId, userId, visitorId);

            // Property: Free features should always allow access
            expect(result.success).toBe(true);
            expect(result.data.allowed).toBe(true);
            expect(result.data.requireMember).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow access to paid features for active members', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 0, max: 10 }),
          async (featureId, userId, freeTrialCount) => {
            // Setup: Feature requires member
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: true,
              freeTrialCount,
              enabled: true,
            });

            // Setup: User is an active member
            mockMember.findOne.mockResolvedValue({
              userId,
              level: 'basic',
              status: 'active',
            });

            const result = await PermissionService.checkPermission(featureId, userId, null);

            // Property: Active members should always have access to paid features
            expect(result.success).toBe(true);
            expect(result.data.allowed).toBe(true);
            expect(result.data.isMember).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow access to paid features for non-members with remaining free trials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 10, maxLength: 64 }),
          fc.integer({ min: 1, max: 10 }), // freeTrialCount > 0
          fc.integer({ min: 0, max: 9 }),  // usedCount
          async (featureId, visitorId, freeTrialCount, usedCount) => {
            // Ensure there are remaining trials
            fc.pre(usedCount < freeTrialCount);

            // Setup: Feature requires member with free trials
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: true,
              freeTrialCount,
              enabled: true,
            });

            // Setup: User is not a member
            mockMember.findOne.mockResolvedValue(null);

            // Setup: Usage count is less than free trial count
            mockUsageRecord.count.mockResolvedValue(usedCount);

            const result = await PermissionService.checkPermission(featureId, null, visitorId);

            // Property: Non-members with remaining trials should have access
            expect(result.success).toBe(true);
            expect(result.data.allowed).toBe(true);
            expect(result.data.isMember).toBe(false);
            expect(result.data.remainingCount).toBe(freeTrialCount - usedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access to paid features for non-members with exhausted free trials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 10, maxLength: 64 }),
          fc.integer({ min: 1, max: 10 }), // freeTrialCount > 0
          async (featureId, visitorId, freeTrialCount) => {
            // Setup: Feature requires member with free trials
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: true,
              freeTrialCount,
              enabled: true,
            });

            // Setup: User is not a member
            mockMember.findOne.mockResolvedValue(null);

            // Setup: Usage count equals or exceeds free trial count
            mockUsageRecord.count.mockResolvedValue(freeTrialCount);

            const result = await PermissionService.checkPermission(featureId, null, visitorId);

            // Property: Non-members with exhausted trials should be denied
            expect(result.success).toBe(true);
            expect(result.data.allowed).toBe(false);
            expect(result.data.reason).toBe('limit_exceeded');
            expect(result.data.remainingCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access to paid features for non-members with no free trials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 10, maxLength: 64 }),
          async (featureId, visitorId) => {
            // Setup: Feature requires member with no free trials
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: true,
              freeTrialCount: 0,
              enabled: true,
            });

            // Setup: User is not a member
            mockMember.findOne.mockResolvedValue(null);

            const result = await PermissionService.checkPermission(featureId, null, visitorId);

            // Property: Non-members with no free trials should be denied
            expect(result.success).toBe(true);
            expect(result.data.allowed).toBe(false);
            expect(result.data.reason).toBe('not_member');
            expect(result.data.requireMember).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access to disabled features', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
          fc.string({ minLength: 10, maxLength: 64 }),
          async (featureId, userId, visitorId) => {
            // Setup: Feature is disabled
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: false,
              freeTrialCount: 0,
              enabled: false,
            });

            const result = await PermissionService.checkPermission(featureId, userId, visitorId);

            // Property: Disabled features should always be denied
            expect(result.success).toBe(true);
            expect(result.data.allowed).toBe(false);
            expect(result.data.reason).toBe('feature_disabled');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Usage Count Limit Correctness
   * For any feature with trial count N, a non-member user should be denied
   * access after using the feature N times in a day.
   * 
   * Validates: Requirements 1.6
   */
  describe('Property 2: Usage Count Limit Correctness', () => {
    it('should correctly track remaining count based on usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 10, maxLength: 64 }),
          fc.integer({ min: 1, max: 20 }), // freeTrialCount
          fc.integer({ min: 0, max: 20 }),  // usedCount
          async (featureId, visitorId, freeTrialCount, usedCount) => {
            // Setup: Feature with free trials
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: true,
              freeTrialCount,
              enabled: true,
            });

            // Setup: User is not a member
            mockMember.findOne.mockResolvedValue(null);

            // Setup: Current usage count
            mockUsageRecord.count.mockResolvedValue(usedCount);

            const result = await PermissionService.getRemainingCount(featureId, null, visitorId);

            // Property: Remaining count should be max(0, freeTrialCount - usedCount)
            const expectedRemaining = Math.max(0, freeTrialCount - usedCount);
            expect(result.success).toBe(true);
            expect(result.data.remaining).toBe(expectedRemaining);
            expect(result.data.total).toBe(freeTrialCount);
            expect(result.data.used).toBe(usedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return unlimited for free features', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 10, maxLength: 64 }),
          async (featureId, visitorId) => {
            // Setup: Free feature
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: false,
              freeTrialCount: 0,
              enabled: true,
            });

            const result = await PermissionService.getRemainingCount(featureId, null, visitorId);

            // Property: Free features should have unlimited usage
            expect(result.success).toBe(true);
            expect(result.data.unlimited).toBe(true);
            expect(result.data.remaining).toBe(-1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return unlimited for members on paid features', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10 }),
          async (featureId, userId, freeTrialCount) => {
            // Setup: Paid feature
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: true,
              freeTrialCount,
              enabled: true,
            });

            // Setup: User is an active member
            mockMember.findOne.mockResolvedValue({
              userId,
              level: 'pro',
              status: 'active',
            });

            const result = await PermissionService.getRemainingCount(featureId, userId, null);

            // Property: Members should have unlimited usage on paid features
            expect(result.success).toBe(true);
            expect(result.data.unlimited).toBe(true);
            expect(result.data.isMember).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly deny access at exactly N+1 usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 10, maxLength: 64 }),
          fc.integer({ min: 1, max: 10 }), // freeTrialCount N
          async (featureId, visitorId, freeTrialCount) => {
            // Setup: Feature with N free trials
            mockFeaturePermission.findOne.mockResolvedValue({
              featureId,
              featureName: 'Test Feature',
              category: 'test',
              requireMember: true,
              freeTrialCount,
              enabled: true,
            });

            // Setup: User is not a member
            mockMember.findOne.mockResolvedValue(null);

            // Setup: User has used exactly N times (exhausted)
            mockUsageRecord.count.mockResolvedValue(freeTrialCount);

            const result = await PermissionService.checkPermission(featureId, null, visitorId);

            // Property: After N uses, the N+1th request should be denied
            expect(result.success).toBe(true);
            expect(result.data.allowed).toBe(false);
            expect(result.data.reason).toBe('limit_exceeded');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
