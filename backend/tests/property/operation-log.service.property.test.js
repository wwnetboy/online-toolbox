/**
 * Property-Based Tests for Operation Log Service
 * Feature: backend-api, Property 20: Operation Log Completeness
 * Validates: Requirements 11.6
 * 
 * For any sensitive operation (user creation, deletion, permission changes),
 * a corresponding log record should be created in the operation logs table.
 */

const fc = require('fast-check');
const OperationLogService = require('../../src/services/operation-log.service');

// Mock the models
jest.mock('../../src/models', () => {
  const mockLogs = [];
  let logIdCounter = 1;

  return {
    OperationLog: {
      create: jest.fn(async (data) => {
        const log = {
          id: logIdCounter++,
          ...data,
          createdAt: new Date(),
          toJSON: function() { return { ...this }; },
        };
        mockLogs.push(log);
        return log;
      }),
      findAndCountAll: jest.fn(async ({ where, offset, limit }) => {
        let filtered = [...mockLogs];
        
        if (where) {
          if (where.userId) {
            filtered = filtered.filter(l => l.userId === where.userId);
          }
          if (where.resource) {
            filtered = filtered.filter(l => l.resource === where.resource);
          }
          if (where.action && where.action[Symbol.for('like')]) {
            const pattern = where.action[Symbol.for('like')].replace(/%/g, '');
            filtered = filtered.filter(l => l.action.includes(pattern));
          }
        }
        
        const count = filtered.length;
        const rows = filtered.slice(offset || 0, (offset || 0) + (limit || 10));
        
        return { count, rows };
      }),
      findAll: jest.fn(async ({ where }) => {
        let filtered = [...mockLogs];
        
        if (where) {
          if (where.resource) {
            filtered = filtered.filter(l => l.resource === where.resource);
          }
          if (where.resourceId) {
            filtered = filtered.filter(l => l.resourceId === where.resourceId);
          }
        }
        
        return filtered;
      }),
      destroy: jest.fn(async () => 0),
      _mockLogs: mockLogs,
      _resetMocks: () => {
        mockLogs.length = 0;
        logIdCounter = 1;
      },
    },
    User: {
      findOne: jest.fn(async () => null),
    },
  };
});

const { OperationLog } = require('../../src/models');

describe('OperationLogService Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    OperationLog._resetMocks();
  });

  /**
   * Property 20: Operation Log Completeness
   * For any sensitive operation (user creation, deletion, permission changes),
   * a corresponding log record should be created in the operation logs table.
   * 
   * Validates: Requirements 11.6
   */
  describe('Property 20: Operation Log Completeness', () => {
    it('should create a log entry for any user creation operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // operatorId
          fc.integer({ min: 1, max: 10000 }), // createdUserId
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            nickName: fc.string({ minLength: 0, maxLength: 50 }),
          }),
          fc.ipV4(),
          async (operatorId, createdUserId, userData, ipAddress) => {
            const initialCount = OperationLog._mockLogs.length;
            
            const result = await OperationLogService.logUserCreate(
              operatorId,
              createdUserId,
              userData,
              ipAddress
            );
            
            // Property: A log entry should be created
            expect(result.success).toBe(true);
            expect(OperationLog._mockLogs.length).toBe(initialCount + 1);
            
            // Property: Log should contain correct action and resource
            const lastLog = OperationLog._mockLogs[OperationLog._mockLogs.length - 1];
            expect(lastLog.action).toBe(OperationLogService.SENSITIVE_ACTIONS.USER_CREATE);
            expect(lastLog.resource).toBe(OperationLogService.RESOURCES.USER);
            expect(lastLog.userId).toBe(operatorId);
            expect(lastLog.resourceId).toBe(String(createdUserId));
            expect(lastLog.ipAddress).toBe(ipAddress);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create a log entry for any user deletion operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // operatorId
          fc.integer({ min: 1, max: 10000 }), // deletedUserId
          fc.ipV4(),
          async (operatorId, deletedUserId, ipAddress) => {
            const initialCount = OperationLog._mockLogs.length;
            
            const result = await OperationLogService.logUserDelete(
              operatorId,
              deletedUserId,
              ipAddress
            );
            
            // Property: A log entry should be created
            expect(result.success).toBe(true);
            expect(OperationLog._mockLogs.length).toBe(initialCount + 1);
            
            // Property: Log should contain correct action
            const lastLog = OperationLog._mockLogs[OperationLog._mockLogs.length - 1];
            expect(lastLog.action).toBe(OperationLogService.SENSITIVE_ACTIONS.USER_DELETE);
            expect(lastLog.resource).toBe(OperationLogService.RESOURCES.USER);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create a log entry for any role permission update operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // operatorId
          fc.integer({ min: 1, max: 10000 }), // roleId
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 0, maxLength: 20 }), // menuIds
          fc.ipV4(),
          async (operatorId, roleId, menuIds, ipAddress) => {
            const initialCount = OperationLog._mockLogs.length;
            
            const result = await OperationLogService.logRolePermissionUpdate(
              operatorId,
              roleId,
              menuIds,
              ipAddress
            );
            
            // Property: A log entry should be created
            expect(result.success).toBe(true);
            expect(OperationLog._mockLogs.length).toBe(initialCount + 1);
            
            // Property: Log should contain correct action and details
            const lastLog = OperationLog._mockLogs[OperationLog._mockLogs.length - 1];
            expect(lastLog.action).toBe(OperationLogService.SENSITIVE_ACTIONS.ROLE_PERMISSION_UPDATE);
            expect(lastLog.resource).toBe(OperationLogService.RESOURCES.ROLE);
            expect(lastLog.details).toEqual({ menuIds });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create a log entry for any password change operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // userId
          fc.ipV4(),
          async (userId, ipAddress) => {
            const initialCount = OperationLog._mockLogs.length;
            
            const result = await OperationLogService.logPasswordChange(userId, ipAddress);
            
            // Property: A log entry should be created
            expect(result.success).toBe(true);
            expect(OperationLog._mockLogs.length).toBe(initialCount + 1);
            
            // Property: Log should contain correct action
            const lastLog = OperationLog._mockLogs[OperationLog._mockLogs.length - 1];
            expect(lastLog.action).toBe(OperationLogService.SENSITIVE_ACTIONS.USER_PASSWORD_CHANGE);
            expect(lastLog.resource).toBe(OperationLogService.RESOURCES.USER);
            expect(lastLog.userId).toBe(userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create a log entry for any login operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // userName
          fc.boolean(), // success
          fc.ipV4(),
          async (userId, userName, success, ipAddress) => {
            const initialCount = OperationLog._mockLogs.length;
            
            const result = await OperationLogService.logLogin(
              userId,
              userName,
              success,
              ipAddress
            );
            
            // Property: A log entry should be created
            expect(result.success).toBe(true);
            expect(OperationLog._mockLogs.length).toBe(initialCount + 1);
            
            // Property: Log should contain correct action and details
            const lastLog = OperationLog._mockLogs[OperationLog._mockLogs.length - 1];
            expect(lastLog.action).toBe(OperationLogService.SENSITIVE_ACTIONS.AUTH_LOGIN);
            expect(lastLog.resource).toBe(OperationLogService.RESOURCES.AUTH);
            expect(lastLog.details).toEqual({ userName, success });
            
            // Property: userId should be set only for successful logins
            if (success) {
              expect(lastLog.userId).toBe(userId);
            } else {
              expect(lastLog.userId).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include password in user creation logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          fc.record({
            userName: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }), // Include password
          }),
          fc.ipV4(),
          async (operatorId, createdUserId, userData, ipAddress) => {
            await OperationLogService.logUserCreate(
              operatorId,
              createdUserId,
              userData,
              ipAddress
            );
            
            const lastLog = OperationLog._mockLogs[OperationLog._mockLogs.length - 1];
            
            // Property: Password should never be logged
            expect(lastLog.details.userData).not.toHaveProperty('password');
            expect(JSON.stringify(lastLog.details)).not.toContain(userData.password);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create log entries with all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // userId
          fc.constantFrom(...Object.values(OperationLogService.SENSITIVE_ACTIONS)),
          fc.constantFrom(...Object.values(OperationLogService.RESOURCES)),
          fc.string({ minLength: 1, maxLength: 50 }), // resourceId
          fc.option(fc.object(), { nil: null }), // details
          fc.ipV4(),
          async (userId, action, resource, resourceId, details, ipAddress) => {
            const result = await OperationLogService.createLog({
              userId,
              action,
              resource,
              resourceId,
              details,
              ipAddress,
            });
            
            // Property: Log creation should succeed
            expect(result.success).toBe(true);
            
            // Property: Log should have all required fields
            const log = result.data;
            expect(log).toHaveProperty('id');
            expect(log).toHaveProperty('userId');
            expect(log).toHaveProperty('action');
            expect(log).toHaveProperty('resource');
            expect(log).toHaveProperty('resourceId');
            expect(log).toHaveProperty('ipAddress');
            expect(log).toHaveProperty('createdAt');
            
            // Property: Values should match input
            expect(log.userId).toBe(userId);
            expect(log.action).toBe(action);
            expect(log.resource).toBe(resource);
            expect(log.resourceId).toBe(resourceId);
            expect(log.ipAddress).toBe(ipAddress);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle batch user deletion logging', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // operatorId
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 50 }), // deletedUserIds
          fc.ipV4(),
          async (operatorId, deletedUserIds, ipAddress) => {
            const initialCount = OperationLog._mockLogs.length;
            
            const result = await OperationLogService.logUserBatchDelete(
              operatorId,
              deletedUserIds,
              ipAddress
            );
            
            // Property: A log entry should be created
            expect(result.success).toBe(true);
            expect(OperationLog._mockLogs.length).toBe(initialCount + 1);
            
            // Property: Log should contain all deleted user IDs
            const lastLog = OperationLog._mockLogs[OperationLog._mockLogs.length - 1];
            expect(lastLog.action).toBe(OperationLogService.SENSITIVE_ACTIONS.USER_BATCH_DELETE);
            expect(lastLog.details.deletedUserIds).toEqual(deletedUserIds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
