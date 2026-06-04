/**
 * Property-Based Tests for Password Change Security
 * Feature: backend-api, Property 8: Password Change Security
 * 
 * For any password change request, only when the provided current password
 * is correct can the password be successfully changed; after change, the new
 * password should be able to login successfully, and the old password should
 * not be able to login.
 * 
 * Validates: Requirements 3.3
 */

const fc = require('fast-check');
const bcrypt = require('bcryptjs');

// Use lower salt rounds for testing to speed up bcrypt operations
const TEST_SALT_ROUNDS = 4;

/**
 * Simulated User Database for Password Change Testing
 * Mimics the behavior of UserService.updatePassword
 */
class MockUserDatabase {
  constructor() {
    this.users = new Map();
    this.nextId = 1;
  }

  async createUser(userName, password) {
    const hashedPassword = await bcrypt.hash(password, TEST_SALT_ROUNDS);
    const user = {
      id: this.nextId++,
      userName,
      password: hashedPassword,
      deletedAt: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  findById(id) {
    const user = this.users.get(id);
    if (!user || user.deletedAt !== null) {
      return null;
    }
    return user;
  }

  /**
   * Update password - mimics UserService.updatePassword
   * Requirement: 3.3
   */
  async updatePassword(userId, currentPassword, newPassword) {
    const user = this.findById(userId);
    
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      };
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'INVALID_PASSWORD',
        message: '当前密码错误',
      };
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, TEST_SALT_ROUNDS);
    user.password = hashedPassword;

    return {
      success: true,
      message: '密码修改成功',
    };
  }

  /**
   * Verify login - checks if password matches
   */
  async verifyLogin(userId, password) {
    const user = this.findById(userId);
    if (!user) {
      return false;
    }
    return bcrypt.compare(password, user.password);
  }
}

describe('Property 8: Password Change Security', () => {
  // Increase timeout for bcrypt operations
  jest.setTimeout(120000);

  /**
   * Property: Only correct current password allows password change
   */
  it('should only allow password change when current password is correct', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 6, maxLength: 50 }), // current password
        fc.string({ minLength: 6, maxLength: 50 }), // new password
        fc.string({ minLength: 6, maxLength: 50 }), // wrong current password attempt
        async (currentPassword, newPassword, wrongPassword) => {
          // Ensure wrong password is actually different
          fc.pre(wrongPassword !== currentPassword);

          const db = new MockUserDatabase();
          const user = await db.createUser('testuser', currentPassword);

          // Attempt to change password with wrong current password
          const wrongResult = await db.updatePassword(user.id, wrongPassword, newPassword);
          
          // Property: should fail with INVALID_PASSWORD error
          expect(wrongResult.success).toBe(false);
          expect(wrongResult.error).toBe('INVALID_PASSWORD');

          // Verify original password still works
          const canLoginWithOriginal = await db.verifyLogin(user.id, currentPassword);
          expect(canLoginWithOriginal).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: After successful password change, new password works and old doesn't
   */
  it('should allow login with new password and reject old password after change', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 6, maxLength: 50 }), // old password
        fc.string({ minLength: 6, maxLength: 50 }), // new password
        async (oldPassword, newPassword) => {
          // Ensure passwords are different
          fc.pre(oldPassword !== newPassword);

          const db = new MockUserDatabase();
          const user = await db.createUser('testuser', oldPassword);

          // Change password with correct current password
          const result = await db.updatePassword(user.id, oldPassword, newPassword);
          
          // Property: password change should succeed
          expect(result.success).toBe(true);

          // Property: new password should work for login
          const canLoginWithNew = await db.verifyLogin(user.id, newPassword);
          expect(canLoginWithNew).toBe(true);

          // Property: old password should NOT work for login
          const canLoginWithOld = await db.verifyLogin(user.id, oldPassword);
          expect(canLoginWithOld).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: Password change should fail for non-existent user
   */
  it('should fail password change for non-existent user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 9999 }), // non-existent user ID
        fc.string({ minLength: 6, maxLength: 50 }), // current password
        fc.string({ minLength: 6, maxLength: 50 }), // new password
        async (nonExistentId, currentPassword, newPassword) => {
          const db = new MockUserDatabase();

          // Attempt to change password for non-existent user
          const result = await db.updatePassword(nonExistentId, currentPassword, newPassword);
          
          // Property: should fail with USER_NOT_FOUND error
          expect(result.success).toBe(false);
          expect(result.error).toBe('USER_NOT_FOUND');
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Property: Multiple password changes should work correctly
   */
  it('should handle multiple consecutive password changes correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 6, maxLength: 30 }),
          { minLength: 3, maxLength: 5 }
        ), // sequence of passwords
        async (passwords) => {
          // Ensure all passwords are unique
          const uniquePasswords = [...new Set(passwords)];
          fc.pre(uniquePasswords.length === passwords.length);
          fc.pre(passwords.length >= 2);

          const db = new MockUserDatabase();
          const user = await db.createUser('testuser', passwords[0]);

          // Change password through the sequence
          for (let i = 1; i < passwords.length; i++) {
            const currentPassword = passwords[i - 1];
            const newPassword = passwords[i];

            const result = await db.updatePassword(user.id, currentPassword, newPassword);
            
            // Property: each password change should succeed
            expect(result.success).toBe(true);

            // Property: new password should work
            const canLoginWithNew = await db.verifyLogin(user.id, newPassword);
            expect(canLoginWithNew).toBe(true);

            // Property: previous password should not work
            const canLoginWithPrevious = await db.verifyLogin(user.id, currentPassword);
            expect(canLoginWithPrevious).toBe(false);
          }

          // Property: only the final password should work
          const finalPassword = passwords[passwords.length - 1];
          const canLoginWithFinal = await db.verifyLogin(user.id, finalPassword);
          expect(canLoginWithFinal).toBe(true);

          // Property: all previous passwords should not work
          for (let i = 0; i < passwords.length - 1; i++) {
            const canLogin = await db.verifyLogin(user.id, passwords[i]);
            expect(canLogin).toBe(false);
          }
        }
      ),
      { numRuns: 50 } // Fewer runs due to multiple bcrypt operations
    );
  }, 120000);

  /**
   * Property: Changing to same password should still work
   */
  it('should allow changing password to the same value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 6, maxLength: 50 }), // password
        async (password) => {
          const db = new MockUserDatabase();
          const user = await db.createUser('testuser', password);

          // Change password to the same value
          const result = await db.updatePassword(user.id, password, password);
          
          // Property: should succeed
          expect(result.success).toBe(true);

          // Property: password should still work
          const canLogin = await db.verifyLogin(user.id, password);
          expect(canLogin).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);
});
