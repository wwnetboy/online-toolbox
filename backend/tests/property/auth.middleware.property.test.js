/**
 * Property-based tests for authentication middleware
 * Feature: backend-api, Property 2: 认证令牌有效性
 * Validates: Requirements 1.1, 1.3, 11.1, 11.5
 */

const fc = require('fast-check');
const jwt = require('jsonwebtoken');
const { authenticate, optionalAuth, authorize } = require('../../src/middlewares/auth.middleware');
const config = require('../../src/config');

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
const createMockReq = (authHeader = null) => ({
  headers: authHeader ? { authorization: authHeader } : {},
  user: null,
});

// Generate valid user payload
const validUserPayloadArb = fc.record({
  userId: fc.integer({ min: 1, max: 100000 }),
  userName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  roles: fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 0, maxLength: 5 }),
});

describe('Authentication Middleware Property Tests', () => {
  /**
   * Property 2: 认证令牌有效性
   * For any valid user credentials, the access token returned after login 
   * should successfully access protected endpoints; invalid or missing tokens 
   * should return 401 error.
   */
  describe('Property 2: Token Validity', () => {
    test('valid tokens should authenticate successfully', () => {
      fc.assert(
        fc.property(validUserPayloadArb, (payload) => {
          // Generate a valid token
          const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
          
          const req = createMockReq(`Bearer ${token}`);
          const res = createMockRes();
          let nextCalled = false;
          const next = () => { nextCalled = true; };

          authenticate(req, res, next);

          // Should call next and attach user info
          expect(nextCalled).toBe(true);
          expect(req.user).toBeDefined();
          expect(req.user.userId).toBe(payload.userId);
          expect(req.user.userName).toBe(payload.userName);
        }),
        { numRuns: 100 }
      );
    });

    test('missing tokens should return 401', () => {
      const req = createMockReq(null);
      const res = createMockRes();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      authenticate(req, res, next);

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe(401);
    });

    test('invalid token format should return 401', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.startsWith('Bearer ')),
          (invalidHeader) => {
            const req = createMockReq(invalidHeader);
            const res = createMockRes();
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            authenticate(req, res, next);

            expect(nextCalled).toBe(false);
            expect(res.statusCode).toBe(401);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('tokens with wrong secret should return 401', () => {
      fc.assert(
        fc.property(
          validUserPayloadArb,
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => s !== config.jwt.secret),
          (payload, wrongSecret) => {
            // Generate token with wrong secret
            const token = jwt.sign(payload, wrongSecret, { expiresIn: '1h' });
            
            const req = createMockReq(`Bearer ${token}`);
            const res = createMockRes();
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            authenticate(req, res, next);

            expect(nextCalled).toBe(false);
            expect(res.statusCode).toBe(401);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('expired tokens should return 401 with expiration message', () => {
      fc.assert(
        fc.property(validUserPayloadArb, (payload) => {
          // Generate an expired token
          const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '-1s' });
          
          const req = createMockReq(`Bearer ${token}`);
          const res = createMockRes();
          let nextCalled = false;
          const next = () => { nextCalled = true; };

          authenticate(req, res, next);

          expect(nextCalled).toBe(false);
          expect(res.statusCode).toBe(401);
          expect(res.body.message).toContain('过期');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Optional Authentication', () => {
    test('should continue without user when no token provided', () => {
      const req = createMockReq(null);
      const res = createMockRes();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      optionalAuth(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.user).toBeNull();
    });

    test('should attach user when valid token provided', () => {
      fc.assert(
        fc.property(validUserPayloadArb, (payload) => {
          const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
          
          const req = createMockReq(`Bearer ${token}`);
          const res = createMockRes();
          let nextCalled = false;
          const next = () => { nextCalled = true; };

          optionalAuth(req, res, next);

          expect(nextCalled).toBe(true);
          expect(req.user).toBeDefined();
          expect(req.user.userId).toBe(payload.userId);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Role-based Authorization', () => {
    test('should allow access when user has required role', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
          (roles) => {
            const req = { user: { userId: 1, userName: 'test', roles } };
            const res = createMockRes();
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            // Pick one of the user's roles as required
            const requiredRole = roles[0];
            authorize([requiredRole])(req, res, next);

            expect(nextCalled).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should deny access when user lacks required role', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          (userRoles, requiredRole) => {
            // Ensure required role is not in user's roles
            fc.pre(!userRoles.includes(requiredRole));
            
            const req = { user: { userId: 1, userName: 'test', roles: userRoles } };
            const res = createMockRes();
            let nextCalled = false;
            const next = () => { nextCalled = true; };

            authorize([requiredRole])(req, res, next);

            expect(nextCalled).toBe(false);
            expect(res.statusCode).toBe(403);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return 401 when no user attached', () => {
      const req = { user: null };
      const res = createMockRes();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      authorize(['admin'])(req, res, next);

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
    });
  });
});
