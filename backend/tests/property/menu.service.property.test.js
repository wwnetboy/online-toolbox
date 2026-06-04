/**
 * Property-Based Tests for Menu Service
 * Feature: backend-api
 * Tests menu permission filtering
 */

const fc = require('fast-check');

/**
 * Property 9: Menu Permission Filter
 * For any user requesting menu list, the returned menu items should only
 * include menus that the user's roles have permission to access.
 * 
 * Validates: Requirements 5.1
 */
describe('Property 9: Menu Permission Filter', () => {
  // Simulated database for menu permission testing
  class MockMenuDatabase {
    constructor() {
      this.menus = new Map();
      this.roles = new Map();
      this.roleMenus = new Map(); // roleId -> Set of menuIds
      this.nextMenuId = 1;
      this.nextRoleId = 1;
    }

    createMenu(menuData) {
      const menu = {
        id: this.nextMenuId++,
        parentId: menuData.parentId || null,
        path: menuData.path,
        name: menuData.name,
        component: menuData.component || null,
        icon: menuData.icon || null,
        sort: menuData.sort || 0,
        hidden: menuData.hidden || false,
        meta: menuData.meta || null,
        deletedAt: null,
      };
      this.menus.set(menu.id, menu);
      return { success: true, data: menu };
    }

    createRole(roleData) {
      const role = {
        id: this.nextRoleId++,
        roleName: roleData.roleName,
        roleCode: roleData.roleCode,
        enabled: roleData.enabled !== undefined ? roleData.enabled : true,
        deletedAt: null,
      };
      this.roles.set(role.id, role);
      this.roleMenus.set(role.id, new Set());
      return { success: true, data: role };
    }

    assignMenuToRole(roleId, menuId) {
      const role = this.roles.get(roleId);
      const menu = this.menus.get(menuId);
      
      if (!role || role.deletedAt !== null || !role.enabled) {
        return { success: false, error: 'ROLE_NOT_FOUND' };
      }
      if (!menu || menu.deletedAt !== null) {
        return { success: false, error: 'MENU_NOT_FOUND' };
      }

      const roleMenuSet = this.roleMenus.get(roleId);
      roleMenuSet.add(menuId);
      return { success: true };
    }


    /**
     * Get menus for user based on their role IDs
     * This simulates the MenuService.getUserMenus behavior
     */
    getUserMenus(roleIds) {
      if (!roleIds || roleIds.length === 0) {
        return { success: true, data: [] };
      }

      // Collect menu IDs from all enabled roles
      const menuIdSet = new Set();
      roleIds.forEach(roleId => {
        const role = this.roles.get(roleId);
        if (role && role.enabled && role.deletedAt === null) {
          const roleMenuSet = this.roleMenus.get(roleId);
          if (roleMenuSet) {
            roleMenuSet.forEach(menuId => {
              const menu = this.menus.get(menuId);
              if (menu && menu.deletedAt === null) {
                menuIdSet.add(menuId);
              }
            });
          }
        }
      });

      // Get menu data for permitted menus
      const menus = [];
      menuIdSet.forEach(menuId => {
        const menu = this.menus.get(menuId);
        if (menu) {
          menus.push({ ...menu });
        }
      });

      // Sort by sort field
      menus.sort((a, b) => a.sort - b.sort);

      return { success: true, data: menus };
    }

    /**
     * Get all menus (for admin)
     */
    getAllMenus() {
      const menus = [];
      this.menus.forEach(menu => {
        if (menu.deletedAt === null) {
          menus.push({ ...menu });
        }
      });
      menus.sort((a, b) => a.sort - b.sort);
      return { success: true, data: menus };
    }

    /**
     * Check if a menu is permitted for given role IDs
     */
    isMenuPermitted(menuId, roleIds) {
      for (const roleId of roleIds) {
        const role = this.roles.get(roleId);
        if (role && role.enabled && role.deletedAt === null) {
          const roleMenuSet = this.roleMenus.get(roleId);
          if (roleMenuSet && roleMenuSet.has(menuId)) {
            return true;
          }
        }
      }
      return false;
    }

    softDeleteMenu(menuId) {
      const menu = this.menus.get(menuId);
      if (menu) {
        menu.deletedAt = new Date();
        return true;
      }
      return false;
    }

    disableRole(roleId) {
      const role = this.roles.get(roleId);
      if (role) {
        role.enabled = false;
        return true;
      }
      return false;
    }
  }


  it('should only return menus that user roles have permission to access', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }), // total menus
        fc.integer({ min: 1, max: 3 }),  // number of roles
        fc.integer({ min: 1, max: 5 }),  // menus per role
        (totalMenus, roleCount, menusPerRole) => {
          const db = new MockMenuDatabase();
          
          // Create menus
          const menuIds = [];
          for (let i = 0; i < totalMenus; i++) {
            const result = db.createMenu({
              path: `/menu${i}`,
              name: `Menu ${i}`,
              sort: i,
            });
            menuIds.push(result.data.id);
          }

          // Create roles and assign some menus to each
          const roleIds = [];
          for (let i = 0; i < roleCount; i++) {
            const roleResult = db.createRole({
              roleName: `Role ${i}`,
              roleCode: `role_${i}`,
            });
            roleIds.push(roleResult.data.id);

            // Assign random menus to this role
            const assignCount = Math.min(menusPerRole, totalMenus);
            for (let j = 0; j < assignCount; j++) {
              const menuIndex = (i + j) % totalMenus;
              db.assignMenuToRole(roleResult.data.id, menuIds[menuIndex]);
            }
          }

          // Get user menus
          const result = db.getUserMenus(roleIds);
          expect(result.success).toBe(true);

          // Property: All returned menus should be permitted for the user's roles
          result.data.forEach(menu => {
            const isPermitted = db.isMenuPermitted(menu.id, roleIds);
            expect(isPermitted).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not return menus that user roles do not have permission to access', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 15 }), // total menus
        fc.integer({ min: 1, max: 3 }),  // number of user roles
        fc.integer({ min: 1, max: 3 }),  // menus per role
        (totalMenus, roleCount, menusPerRole) => {
          const db = new MockMenuDatabase();
          
          // Create menus
          const menuIds = [];
          for (let i = 0; i < totalMenus; i++) {
            const result = db.createMenu({
              path: `/menu${i}`,
              name: `Menu ${i}`,
              sort: i,
            });
            menuIds.push(result.data.id);
          }

          // Create roles and assign only some menus
          const roleIds = [];
          const permittedMenuIds = new Set();
          for (let i = 0; i < roleCount; i++) {
            const roleResult = db.createRole({
              roleName: `Role ${i}`,
              roleCode: `role_${i}`,
            });
            roleIds.push(roleResult.data.id);

            // Assign only first few menus to this role
            const assignCount = Math.min(menusPerRole, totalMenus);
            for (let j = 0; j < assignCount; j++) {
              const menuIndex = j % totalMenus;
              db.assignMenuToRole(roleResult.data.id, menuIds[menuIndex]);
              permittedMenuIds.add(menuIds[menuIndex]);
            }
          }

          // Get user menus
          const result = db.getUserMenus(roleIds);
          const returnedMenuIds = new Set(result.data.map(m => m.id));

          // Property: No unpermitted menus should be returned
          menuIds.forEach(menuId => {
            if (!permittedMenuIds.has(menuId)) {
              expect(returnedMenuIds.has(menuId)).toBe(false);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should return empty list when user has no roles', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // total menus
        (totalMenus) => {
          const db = new MockMenuDatabase();
          
          // Create menus
          for (let i = 0; i < totalMenus; i++) {
            db.createMenu({
              path: `/menu${i}`,
              name: `Menu ${i}`,
              sort: i,
            });
          }

          // Get user menus with empty role list
          const result = db.getUserMenus([]);
          
          // Property: Should return empty list
          expect(result.success).toBe(true);
          expect(result.data).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not return menus from disabled roles', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }), // total menus
        fc.integer({ min: 2, max: 4 }),  // number of roles
        (totalMenus, roleCount) => {
          const db = new MockMenuDatabase();
          
          // Create menus
          const menuIds = [];
          for (let i = 0; i < totalMenus; i++) {
            const result = db.createMenu({
              path: `/menu${i}`,
              name: `Menu ${i}`,
              sort: i,
            });
            menuIds.push(result.data.id);
          }

          // Create roles and assign menus
          const roleIds = [];
          for (let i = 0; i < roleCount; i++) {
            const roleResult = db.createRole({
              roleName: `Role ${i}`,
              roleCode: `role_${i}`,
            });
            roleIds.push(roleResult.data.id);

            // Assign unique menu to each role
            if (i < totalMenus) {
              db.assignMenuToRole(roleResult.data.id, menuIds[i]);
            }
          }

          // Disable the first role
          db.disableRole(roleIds[0]);

          // Get user menus
          const result = db.getUserMenus(roleIds);
          const returnedMenuIds = new Set(result.data.map(m => m.id));

          // Property: Menu from disabled role should not be returned
          // (unless another enabled role also has access)
          if (roleCount > 1 && totalMenus > 0) {
            // First menu was only assigned to first (disabled) role
            // It should not appear in results
            const firstMenuId = menuIds[0];
            const hasOtherRoleAccess = roleIds.slice(1).some(roleId => {
              const roleMenuSet = db.roleMenus.get(roleId);
              return roleMenuSet && roleMenuSet.has(firstMenuId);
            });
            
            if (!hasOtherRoleAccess) {
              expect(returnedMenuIds.has(firstMenuId)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not return soft-deleted menus', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }), // total menus
        fc.integer({ min: 1, max: 3 }),  // menus to delete
        (totalMenus, menusToDelete) => {
          const db = new MockMenuDatabase();
          
          // Create menus
          const menuIds = [];
          for (let i = 0; i < totalMenus; i++) {
            const result = db.createMenu({
              path: `/menu${i}`,
              name: `Menu ${i}`,
              sort: i,
            });
            menuIds.push(result.data.id);
          }

          // Create a role with all menus
          const roleResult = db.createRole({
            roleName: 'Admin',
            roleCode: 'admin',
          });
          menuIds.forEach(menuId => {
            db.assignMenuToRole(roleResult.data.id, menuId);
          });

          // Soft delete some menus
          const deleteCount = Math.min(menusToDelete, totalMenus);
          const deletedMenuIds = new Set();
          for (let i = 0; i < deleteCount; i++) {
            db.softDeleteMenu(menuIds[i]);
            deletedMenuIds.add(menuIds[i]);
          }

          // Get user menus
          const result = db.getUserMenus([roleResult.data.id]);
          const returnedMenuIds = new Set(result.data.map(m => m.id));

          // Property: Soft-deleted menus should not be returned
          deletedMenuIds.forEach(deletedId => {
            expect(returnedMenuIds.has(deletedId)).toBe(false);
          });

          // Property: Non-deleted menus should be returned
          menuIds.forEach(menuId => {
            if (!deletedMenuIds.has(menuId)) {
              expect(returnedMenuIds.has(menuId)).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should combine menus from multiple roles without duplicates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 15 }), // total menus
        fc.integer({ min: 2, max: 4 }),  // number of roles
        (totalMenus, roleCount) => {
          const db = new MockMenuDatabase();
          
          // Create menus
          const menuIds = [];
          for (let i = 0; i < totalMenus; i++) {
            const result = db.createMenu({
              path: `/menu${i}`,
              name: `Menu ${i}`,
              sort: i,
            });
            menuIds.push(result.data.id);
          }

          // Create roles with overlapping menu assignments
          const roleIds = [];
          for (let i = 0; i < roleCount; i++) {
            const roleResult = db.createRole({
              roleName: `Role ${i}`,
              roleCode: `role_${i}`,
            });
            roleIds.push(roleResult.data.id);

            // Assign overlapping menus (each role gets menus i to i+3)
            for (let j = 0; j < 4 && (i + j) < totalMenus; j++) {
              db.assignMenuToRole(roleResult.data.id, menuIds[i + j]);
            }
          }

          // Get user menus
          const result = db.getUserMenus(roleIds);
          const returnedMenuIds = result.data.map(m => m.id);

          // Property: No duplicate menu IDs should be returned
          const uniqueIds = new Set(returnedMenuIds);
          expect(uniqueIds.size).toBe(returnedMenuIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return menus sorted by sort field', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 3, maxLength: 10 }), // sort values
        (sortValues) => {
          const db = new MockMenuDatabase();
          
          // Create menus with random sort values
          const menuIds = [];
          sortValues.forEach((sortValue, i) => {
            const result = db.createMenu({
              path: `/menu${i}`,
              name: `Menu ${i}`,
              sort: sortValue,
            });
            menuIds.push(result.data.id);
          });

          // Create a role with all menus
          const roleResult = db.createRole({
            roleName: 'Admin',
            roleCode: 'admin',
          });
          menuIds.forEach(menuId => {
            db.assignMenuToRole(roleResult.data.id, menuId);
          });

          // Get user menus
          const result = db.getUserMenus([roleResult.data.id]);

          // Property: Menus should be sorted by sort field
          for (let i = 1; i < result.data.length; i++) {
            expect(result.data[i].sort).toBeGreaterThanOrEqual(result.data[i - 1].sort);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
