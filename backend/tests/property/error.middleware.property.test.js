/**
 * Property-based tests for error handling middleware
 * Feature: backend-api, Property 19: 错误响应格式一致性
 * Validates: Requirements 12.1
 */

const fc = require('fast-check');
const { AppError, errorHandler, notFoundHandler } = require('../../src/middlewares/error.middleware');
const { ErrorCodes } = require('../../src/utils/response');

// Mock response object factory
const createMockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

// Mock request object factory
const createMockReq = (method = 'GET', path = '/test') => ({
  method,
  path,
  originalUrl: path,
  body: {},
  user: null,
});

// Valid error codes from the design document
const validErrorCodes = [
  ErrorCodes.SUCCESS,
  ErrorCodes.BAD_REQUEST,
  ErrorCodes.UNAUTHORIZED,
  ErrorCodes.FORBIDDEN,
  ErrorCodes.NOT_FOUND,
  ErrorCodes.CONFLICT,
  ErrorCodes.VALIDATION_ERROR,
  ErrorCodes.TOO_MANY_REQUESTS,
  ErrorCodes.INTERNAL_ERROR,
];

// Arbitrary for error codes
const errorCodeArb = fc.constantFrom(...validErrorCodes.filter(c => c !== ErrorCodes.SUCCESS));

// Arbitrary for error messages
const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0);

describe('Error Middleware Property Tests', () => {
  /**
   * Property 19: 错误响应格式一致性
   * For any error response, it should contain code, message, data fields,
   * and code should be one of the predefined error codes.
   */
  describe('Property 19: Error Response Format Consistency', () => {
    test('AppError should produce consistent response format', () => {
      fc.assert(
        fc.property(
          errorCodeArb,
          errorMessageArb,
          (code, message) => {
            const err = new AppError(code, message);
            const req = createMockReq();
            const res = createMockRes();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            // Response should have required fields
            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('data');
            
            // Code should match the error code
            expect(res.body.code).toBe(code);
            
            // Message should be the provided message
            expect(res.body.message).toBe(message);
            
            // HTTP status should match error code
            expect(res.statusCode).toBe(code);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('AppError with data should include data in response', () => {
      fc.assert(
        fc.property(
          errorCodeArb,
          errorMessageArb,
          fc.jsonValue(),
          (code, message, data) => {
            const err = new AppError(code, message, data);
            const req = createMockReq();
            const res = createMockRes();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('unknown errors should return 500 with generic message', () => {
      fc.assert(
        fc.property(
          errorMessageArb,
          (message) => {
            // Create a non-operational error
            const err = new Error(message);
            const req = createMockReq();
            const res = createMockRes();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            // Should return 500 internal error
            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('data');
            expect(res.body.code).toBe(ErrorCodes.INTERNAL_ERROR);
            expect(res.statusCode).toBe(500);
            
            // Should NOT expose the original error message
            expect(res.body.message).not.toBe(message);
            expect(res.body.message).toBe('服务器内部错误');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('notFoundHandler should return 404 with consistent format', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
          fc.string({ minLength: 1, maxLength: 100 }).map(s => '/' + s.replace(/[^a-zA-Z0-9/]/g, '')),
          (method, path) => {
            const req = createMockReq(method, path);
            const res = createMockRes();
            const next = jest.fn();

            notFoundHandler(req, res, next);

            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('data');
            expect(res.body.code).toBe(ErrorCodes.NOT_FOUND);
            expect(res.statusCode).toBe(404);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Sequelize validation errors should return 422 with consistent format', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (errors) => {
            const err = {
              name: 'SequelizeValidationError',
              errors: errors,
            };
            const req = createMockReq();
            const res = createMockRes();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('data');
            expect(res.body.code).toBe(ErrorCodes.VALIDATION_ERROR);
            expect(res.statusCode).toBe(422);
            expect(res.body.data).toHaveProperty('errors');
            expect(Array.isArray(res.body.data.errors)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Sequelize unique constraint errors should return 409 with consistent format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (fieldName) => {
            const err = {
              name: 'SequelizeUniqueConstraintError',
              errors: [{ path: fieldName }],
            };
            const req = createMockReq();
            const res = createMockRes();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('data');
            expect(res.body.code).toBe(ErrorCodes.CONFLICT);
            expect(res.statusCode).toBe(409);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('database errors should hide details and return 500', () => {
      fc.assert(
        fc.property(
          errorMessageArb,
          (sensitiveMessage) => {
            const err = {
              name: 'SequelizeDatabaseError',
              message: sensitiveMessage,
            };
            const req = createMockReq();
            const res = createMockRes();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(res.body).toHaveProperty('code');
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('data');
            expect(res.body.code).toBe(ErrorCodes.INTERNAL_ERROR);
            expect(res.statusCode).toBe(500);
            
            // Should NOT expose database error details
            expect(res.body.message).not.toBe(sensitiveMessage);
            expect(res.body.message).toBe('服务器内部错误');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
