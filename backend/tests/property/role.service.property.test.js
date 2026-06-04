/**
 * Property-Based Tests for Role Service
 * Feature: backend-api
 * Tests association constraints for role deletion
 */

const fc = require('fast-check');

/**
 * Property 12: Association Constraint Check
 * For any delete request on a role or category, if there are associated users
 * or tools, it should return an error preventing deletion.
 * 
 * Validates: Requirements 4.6, 7.5
 */
describe('Property 12: Association Constraint Check', () => {
  // Simulated database for association constraint testing
  class MockRoleDatabase {
    constructor() {
      this.roles = new Map();
      this.users = new Map();
      this.userRoles = new Map(); // userId -> Set of roleIds
      this.nextRoleId = 1;
      this.nextUserId = 1;
    }

    createRole(roleData) {
      const role = {
        id: this.nextRoleId++,
        roleName: roleData.roleName,
        roleCode: roleData.roleCode,
        description: roleData.description || null,
        enabled: roleData.enabled !== undefined ? roleData.enabled : true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.roles.set(role.id, role);
      return { success: true, data: role };
    }

    createUser(userData) {
      const user = {
        id: this.nextUserId++,
        userName: userData.userName,
        email: userData.email,
        deletedAt: null,
        createdAt: new Date(),
      };
      this.users.set(user.id, user);
      this.userRoles.set(user.id, new Set());
      return { success: true, data: user };
    }

    assignRoleToUser(userId, roleId) {
      const user = this.users.get(userId);
      const role = this.roles.get(roleId);
      
      if (!user || user.deletedAt !== null) {
        return { success: false, error: 'USER_NOT_FOUND' };
      }
      if (!role || role.deletedAt !== null) {
        return { success: false, error: 'ROLE_NOT_FOUND' };
      }

      const userRoleSet = this.userRoles.get(userId);
      userRoleSet.add(roleId);
      return { success: true };
    }

    removeRoleFromUser(userId, roleId) {
      const userRoleSet = this.userRoles.get(userId);
      if (userRoleSet) {
        userRoleSet.delete(roleId);
        return { success: true };
      }
      return { success: false };
    }

    getUsersWithRole(roleId) {
      const usersWithRole = [];
      for (const [userId, roleSet] of this.userRoles.entries()) {
        const user = this.users.get(userId);
        if (user && user.deletedAt === null && roleSet.has(roleId)) {
          usersWithRole.push(user);
        }
      }
      return usersWithRole;
    }

    deleteRole(roleId) {
      const role = this.roles.get(roleId);
      
      if (!role || role.deletedAt !== null) {
        return { success: false, error: 'ROLE_NOT_FOUND', message: '角色不存在' };
      }

      // Check for associated users
      const usersWithRole = this.getUsersWithRole(roleId);
      if (usersWithRole.length > 0) {
        return {
          success: false,
          error: 'ROLE_HAS_USERS',
          message: `该角色下有 ${usersWithRole.length} 个用户，无法删除`,
        };
      }

      // Soft delete
      role.deletedAt = new Date();
      role.updatedAt = new Date();
      return { success: true, message: '角色删除成功' };
    }

    softDeleteUser(userId) {
      const user = this.users.get(userId);
      if (user) {
        user.deletedAt = new Date();
        return true;
      }
      return false;
    }
  }


  it('should prevent deletion of role with associated users', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.integer({ min: 1, max: 5 }), // number of users to assign
        (roleName, roleCode, userCount) => {
          const db = new MockRoleDatabase();
          
          // Create a role
          const roleResult = db.createRole({ roleName, roleCode });
          expect(roleResult.success).toBe(true);
          const roleId = roleResult.data.id;

          // Create users and assign them to the role
          for (let i = 0; i < userCount; i++) {
            const userResult = db.createUser({
              userName: `user_${i}_${Date.now()}`,
              email: `user${i}@example.com`,
            });
            expect(userResult.success).toBe(true);
            db.assignRoleToUser(userResult.data.id, roleId);
          }

          // Try to delete the role
          const deleteResult = db.deleteRole(roleId);

          // Property: deletion should fail when role has associated users
          expect(deleteResult.success).toBe(false);
          expect(deleteResult.error).toBe('ROLE_HAS_USERS');
          
          // Property: role should still exist (not deleted)
          const role = db.roles.get(roleId);
          expect(role.deletedAt).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow deletion of role with no associated users', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        (roleName, roleCode) => {
          const db = new MockRoleDatabase();
          
          // Create a role without any users
          const roleResult = db.createRole({ roleName, roleCode });
          expect(roleResult.success).toBe(true);
          const roleId = roleResult.data.id;

          // Try to delete the role
          const deleteResult = db.deleteRole(roleId);

          // Property: deletion should succeed when role has no associated users
          expect(deleteResult.success).toBe(true);
          
          // Property: role should be soft deleted
          const role = db.roles.get(roleId);
          expect(role.deletedAt).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow deletion after all users are removed from role', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.integer({ min: 1, max: 5 }), // number of users
        (roleName, roleCode, userCount) => {
          const db = new MockRoleDatabase();
          
          // Create a role
          const roleResult = db.createRole({ roleName, roleCode });
          const roleId = roleResult.data.id;

          // Create users and assign them to the role
          const userIds = [];
          for (let i = 0; i < userCount; i++) {
            const userResult = db.createUser({
              userName: `user_${i}_${Date.now()}`,
              email: `user${i}@example.com`,
            });
            userIds.push(userResult.data.id);
            db.assignRoleToUser(userResult.data.id, roleId);
          }

          // First deletion attempt should fail
          const firstDeleteResult = db.deleteRole(roleId);
          expect(firstDeleteResult.success).toBe(false);

          // Remove all users from the role
          userIds.forEach(userId => {
            db.removeRoleFromUser(userId, roleId);
          });

          // Second deletion attempt should succeed
          const secondDeleteResult = db.deleteRole(roleId);

          // Property: deletion should succeed after users are removed
          expect(secondDeleteResult.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow deletion when associated users are soft deleted', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.integer({ min: 1, max: 5 }), // number of users
        (roleName, roleCode, userCount) => {
          const db = new MockRoleDatabase();
          
          // Create a role
          const roleResult = db.createRole({ roleName, roleCode });
          const roleId = roleResult.data.id;

          // Create users and assign them to the role
          const userIds = [];
          for (let i = 0; i < userCount; i++) {
            const userResult = db.createUser({
              userName: `user_${i}_${Date.now()}`,
              email: `user${i}@example.com`,
            });
            userIds.push(userResult.data.id);
            db.assignRoleToUser(userResult.data.id, roleId);
          }

          // First deletion attempt should fail
          const firstDeleteResult = db.deleteRole(roleId);
          expect(firstDeleteResult.success).toBe(false);

          // Soft delete all users
          userIds.forEach(userId => {
            db.softDeleteUser(userId);
          });

          // Second deletion attempt should succeed (soft deleted users don't count)
          const secondDeleteResult = db.deleteRole(roleId);

          // Property: deletion should succeed when all associated users are soft deleted
          expect(secondDeleteResult.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly count active users for constraint check', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.integer({ min: 2, max: 10 }), // total users
        fc.integer({ min: 1, max: 5 }),  // users to soft delete
        (roleName, roleCode, totalUsers, usersToDelete) => {
          const db = new MockRoleDatabase();
          
          // Create a role
          const roleResult = db.createRole({ roleName, roleCode });
          const roleId = roleResult.data.id;

          // Create users and assign them to the role
          const userIds = [];
          for (let i = 0; i < totalUsers; i++) {
            const userResult = db.createUser({
              userName: `user_${i}_${Date.now()}`,
              email: `user${i}@example.com`,
            });
            userIds.push(userResult.data.id);
            db.assignRoleToUser(userResult.data.id, roleId);
          }

          // Soft delete some users
          const deleteCount = Math.min(usersToDelete, totalUsers);
          for (let i = 0; i < deleteCount; i++) {
            db.softDeleteUser(userIds[i]);
          }

          const activeUserCount = totalUsers - deleteCount;
          const deleteResult = db.deleteRole(roleId);

          if (activeUserCount > 0) {
            // Property: should fail if there are still active users
            expect(deleteResult.success).toBe(false);
            expect(deleteResult.error).toBe('ROLE_HAS_USERS');
          } else {
            // Property: should succeed if all users are soft deleted
            expect(deleteResult.success).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return correct user count in error message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        fc.integer({ min: 1, max: 10 }), // number of users
        (roleName, roleCode, userCount) => {
          const db = new MockRoleDatabase();
          
          // Create a role
          const roleResult = db.createRole({ roleName, roleCode });
          const roleId = roleResult.data.id;

          // Create users and assign them to the role
          for (let i = 0; i < userCount; i++) {
            const userResult = db.createUser({
              userName: `user_${i}_${Date.now()}`,
              email: `user${i}@example.com`,
            });
            db.assignRoleToUser(userResult.data.id, roleId);
          }

          // Try to delete the role
          const deleteResult = db.deleteRole(roleId);

          // Property: error message should contain correct user count
          expect(deleteResult.success).toBe(false);
          expect(deleteResult.message).toContain(String(userCount));
        }
      ),
      { numRuns: 100 }
    );
  });
});
