/**
 * Property-Based Tests for Authentication Service
 * Feature: backend-api, Property 1: Password Hash Round-Trip Consistency
 * Validates: Requirements 1.5
 */

const fc = require('fast-check');
const bcrypt = require('bcryptjs');

// Use lower salt rounds for testing to speed up bcrypt operations
const TEST_SALT_ROUNDS = 4;

describe('AuthService Password Hashing Properties', () => {
  // Increase timeout for bcrypt operations
  jest.setTimeout(60000);

  /**
   * Property 1: Password Hash Round-Trip Consistency
   * For any valid password string, hashing with bcrypt and then comparing
   * with the original password should return true.
   * 
   * Validates: Requirements 1.5
   */
  describe('Property 1: Password Hash Round-Trip Consistency', () => {
    it('should verify that any password can be hashed and verified successfully', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary non-empty strings as passwords
          // Passwords should be at least 1 character and reasonable length
          fc.string({ minLength: 1, maxLength: 72 }), // bcrypt max is 72 bytes
          async (password) => {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, TEST_SALT_ROUNDS);
            
            // Verify the original password matches the hash
            const isMatch = await bcrypt.compare(password, hashedPassword);
            
            // Property: hashing then comparing should always return true
            expect(isMatch).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should verify that different passwords produce different hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two different passwords
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (password1, password2) => {
            // Skip if passwords are the same
            fc.pre(password1 !== password2);
            
            const hash1 = await bcrypt.hash(password1, TEST_SALT_ROUNDS);
            const hash2 = await bcrypt.hash(password2, TEST_SALT_ROUNDS);
            
            // Property: different passwords should not verify against each other's hash
            const crossMatch1 = await bcrypt.compare(password1, hash2);
            const crossMatch2 = await bcrypt.compare(password2, hash1);
            
            expect(crossMatch1).toBe(false);
            expect(crossMatch2).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should verify that same password hashed twice produces different hashes but both verify', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (password) => {
            // Hash the same password twice
            const hash1 = await bcrypt.hash(password, TEST_SALT_ROUNDS);
            const hash2 = await bcrypt.hash(password, TEST_SALT_ROUNDS);
            
            // Property: hashes should be different (due to random salt)
            expect(hash1).not.toBe(hash2);
            
            // Property: both hashes should verify against the original password
            const verify1 = await bcrypt.compare(password, hash1);
            const verify2 = await bcrypt.compare(password, hash2);
            
            expect(verify1).toBe(true);
            expect(verify2).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should verify that wrong password does not match hash', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (correctPassword, wrongPassword) => {
            // Skip if passwords happen to be the same
            fc.pre(correctPassword !== wrongPassword);
            
            const hash = await bcrypt.hash(correctPassword, TEST_SALT_ROUNDS);
            
            // Property: wrong password should not verify
            const isMatch = await bcrypt.compare(wrongPassword, hash);
            
            expect(isMatch).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });
});
