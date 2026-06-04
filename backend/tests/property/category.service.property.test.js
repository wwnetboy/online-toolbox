/**
 * Property-Based Tests for Category Service
 * Feature: backend-api
 * Tests category sorting consistency and system category protection
 */

const fc = require('fast-check');

/**
 * Property 10: Category Sort Consistency
 * For any category list request, the returned categories should be sorted
 * by the sort field in ascending order.
 * 
 * Validates: Requirements 7.1
 */
describe('Property 10: Category Sort Consistency', () => {
  // Simulated database for category sorting testing
  class MockCategoryDatabase {
    constructor() {
      this.categories = new Map();
      this.nextId = 1;
    }

    createCategory(categoryData) {
      const category = {
        id: this.nextId++,
        identifier: categoryData.identifier,
        name: categoryData.name,
        icon: categoryData.icon || null,
        sort: categoryData.sort !== undefined ? categoryData.sort : 0,
        enabled: categoryData.enabled !== undefined ? categoryData.enabled : true,
        isSystem: categoryData.isSystem || false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.categories.set(category.id, category);
      return { success: true, data: category };
    }

    getCategories() {
      const activeCategories = Array.from(this.categories.values())
        .filter(cat => cat.deletedAt === null);
      
      // Sort by sort field ascending, then by createdAt ascending
      activeCategories.sort((a, b) => {
        if (a.sort !== b.sort) {
          return a.sort - b.sort;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      return {
        success: true,
        data: activeCategories,
      };
    }

    updateCategorySort(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return { success: false, error: 'INVALID_SORT_DATA' };
      }

      for (const item of items) {
        const category = this.categories.get(item.id);
        if (category && category.deletedAt === null) {
          category.sort = item.sort;
          category.updatedAt = new Date();
        }
      }

      return { success: true, message: '排序更新成功' };
    }

    softDelete(id) {
      const category = this.categories.get(id);
      if (category) {
        category.deletedAt = new Date();
        return true;
      }
      return false;
    }
  }

  it('should return categories sorted by sort field ascending', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            identifier: fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            sort: fc.integer({ min: 0, max: 1000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (categoryDataList) => {
          const db = new MockCategoryDatabase();
          
          // Create categories with unique identifiers
          const usedIdentifiers = new Set();
          categoryDataList.forEach((catData, index) => {
            let identifier = catData.identifier;
            while (usedIdentifiers.has(identifier)) {
              identifier = `${catData.identifier}_${index}`;
            }
            usedIdentifiers.add(identifier);
            db.createCategory({ ...catData, identifier });
          });

          // Get categories
          const result = db.getCategories();
          expect(result.success).toBe(true);

          // Property: categories should be sorted by sort field ascending
          const categories = result.data;
          for (let i = 1; i < categories.length; i++) {
            expect(categories[i].sort).toBeGreaterThanOrEqual(categories[i - 1].sort);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain sort order after batch sort update', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }), // number of categories
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 3, maxLength: 10 }), // new sort values
        (categoryCount, sortValues) => {
          const db = new MockCategoryDatabase();
          
          // Create categories
          const categoryIds = [];
          for (let i = 0; i < categoryCount; i++) {
            const result = db.createCategory({
              identifier: `cat_${i}`,
              name: `Category ${i}`,
              sort: i * 10, // Initial sort values
            });
            categoryIds.push(result.data.id);
          }

          // Update sort order with new values
          const sortItems = categoryIds.map((id, index) => ({
            id,
            sort: sortValues[index % sortValues.length],
          }));
          db.updateCategorySort(sortItems);

          // Get categories
          const result = db.getCategories();
          expect(result.success).toBe(true);

          // Property: categories should still be sorted by sort field ascending
          const categories = result.data;
          for (let i = 1; i < categories.length; i++) {
            expect(categories[i].sort).toBeGreaterThanOrEqual(categories[i - 1].sort);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude soft-deleted categories from sorted list', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 15 }), // total categories
        fc.integer({ min: 1, max: 5 }),  // categories to delete
        (totalCategories, deleteCount) => {
          const db = new MockCategoryDatabase();
          
          // Create categories
          const categoryIds = [];
          for (let i = 0; i < totalCategories; i++) {
            const result = db.createCategory({
              identifier: `cat_${i}`,
              name: `Category ${i}`,
              sort: i,
            });
            categoryIds.push(result.data.id);
          }

          // Soft delete some categories
          const actualDeleteCount = Math.min(deleteCount, totalCategories);
          for (let i = 0; i < actualDeleteCount; i++) {
            db.softDelete(categoryIds[i]);
          }

          // Get categories
          const result = db.getCategories();
          expect(result.success).toBe(true);

          // Property: deleted categories should not appear in the list
          expect(result.data.length).toBe(totalCategories - actualDeleteCount);

          // Property: remaining categories should still be sorted
          const categories = result.data;
          for (let i = 1; i < categories.length; i++) {
            expect(categories[i].sort).toBeGreaterThanOrEqual(categories[i - 1].sort);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle categories with same sort value using secondary sort', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // number of categories with same sort
        fc.integer({ min: 0, max: 100 }), // shared sort value
        (categoryCount, sharedSort) => {
          const db = new MockCategoryDatabase();
          
          // Create categories with the same sort value
          for (let i = 0; i < categoryCount; i++) {
            db.createCategory({
              identifier: `cat_${i}`,
              name: `Category ${i}`,
              sort: sharedSort,
            });
          }

          // Get categories
          const result = db.getCategories();
          expect(result.success).toBe(true);

          // Property: all categories should have the same sort value
          const categories = result.data;
          categories.forEach(cat => {
            expect(cat.sort).toBe(sharedSort);
          });

          // Property: categories with same sort should be ordered by createdAt
          for (let i = 1; i < categories.length; i++) {
            expect(categories[i].createdAt.getTime())
              .toBeGreaterThanOrEqual(categories[i - 1].createdAt.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no categories exist', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // no input needed
        () => {
          const db = new MockCategoryDatabase();
          
          // Get categories from empty database
          const result = db.getCategories();
          
          // Property: should return success with empty array
          expect(result.success).toBe(true);
          expect(result.data).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 11: System Category Protection
 * For any delete request on a system built-in category, it should return
 * an error and the system category should not be deleted.
 * 
 * Validates: Requirements 7.6
 */
describe('Property 11: System Category Protection', () => {
  // System built-in category identifiers
  const SYSTEM_CATEGORIES = ['image', 'pdf', 'document', 'video', 'utils'];

  // Simulated database for system category protection testing
  class MockCategoryDatabase {
    constructor() {
      this.categories = new Map();
      this.tools = new Map();
      this.nextCategoryId = 1;
      this.nextToolId = 1;
    }

    createCategory(categoryData) {
      const category = {
        id: this.nextCategoryId++,
        identifier: categoryData.identifier,
        name: categoryData.name,
        icon: categoryData.icon || null,
        sort: categoryData.sort !== undefined ? categoryData.sort : 0,
        enabled: categoryData.enabled !== undefined ? categoryData.enabled : true,
        isSystem: categoryData.isSystem || SYSTEM_CATEGORIES.includes(categoryData.identifier),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.categories.set(category.id, category);
      return { success: true, data: category };
    }

    createTool(toolData) {
      const tool = {
        id: this.nextToolId++,
        name: toolData.name,
        categoryId: toolData.categoryId,
        deletedAt: null,
        createdAt: new Date(),
      };
      this.tools.set(tool.id, tool);
      return { success: true, data: tool };
    }

    getToolsByCategory(categoryId) {
      return Array.from(this.tools.values())
        .filter(tool => tool.categoryId === categoryId && tool.deletedAt === null);
    }

    deleteCategory(id) {
      const category = this.categories.get(id);
      
      if (!category || category.deletedAt !== null) {
        return { success: false, error: 'CATEGORY_NOT_FOUND', message: '分类不存在' };
      }

      // Check if it's a system category
      if (category.isSystem || SYSTEM_CATEGORIES.includes(category.identifier)) {
        return {
          success: false,
          error: 'SYSTEM_CATEGORY_PROTECTED',
          message: '系统内置分类不可删除',
        };
      }

      // Check for associated tools
      const tools = this.getToolsByCategory(id);
      if (tools.length > 0) {
        return {
          success: false,
          error: 'CATEGORY_HAS_TOOLS',
          message: `该分类下有 ${tools.length} 个工具，无法删除`,
        };
      }

      // Soft delete
      category.deletedAt = new Date();
      category.updatedAt = new Date();
      return { success: true, message: '分类删除成功' };
    }

    isSystemCategory(id) {
      const category = this.categories.get(id);
      if (!category) {
        return { success: false, error: 'CATEGORY_NOT_FOUND' };
      }
      return {
        success: true,
        data: {
          isSystem: category.isSystem || SYSTEM_CATEGORIES.includes(category.identifier),
        },
      };
    }
  }

  it('should prevent deletion of system categories by isSystem flag', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SYSTEM_CATEGORIES),
        fc.string({ minLength: 1, maxLength: 30 }),
        (identifier, name) => {
          const db = new MockCategoryDatabase();
          
          // Create a system category
          const createResult = db.createCategory({
            identifier,
            name,
            isSystem: true,
          });
          expect(createResult.success).toBe(true);
          const categoryId = createResult.data.id;

          // Try to delete the system category
          const deleteResult = db.deleteCategory(categoryId);

          // Property: deletion should fail for system categories
          expect(deleteResult.success).toBe(false);
          expect(deleteResult.error).toBe('SYSTEM_CATEGORY_PROTECTED');
          
          // Property: category should still exist (not deleted)
          const category = db.categories.get(categoryId);
          expect(category.deletedAt).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent deletion of categories with system identifiers', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SYSTEM_CATEGORIES),
        fc.string({ minLength: 1, maxLength: 30 }),
        (identifier, name) => {
          const db = new MockCategoryDatabase();
          
          // Create a category with system identifier (even without isSystem flag)
          const createResult = db.createCategory({
            identifier,
            name,
            isSystem: false, // Explicitly set to false
          });
          expect(createResult.success).toBe(true);
          const categoryId = createResult.data.id;

          // Try to delete the category
          const deleteResult = db.deleteCategory(categoryId);

          // Property: deletion should fail for categories with system identifiers
          expect(deleteResult.success).toBe(false);
          expect(deleteResult.error).toBe('SYSTEM_CATEGORY_PROTECTED');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow deletion of non-system categories without tools', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => 
          /^[a-zA-Z0-9_]+$/.test(s) && !SYSTEM_CATEGORIES.includes(s)
        ),
        fc.string({ minLength: 1, maxLength: 30 }),
        (identifier, name) => {
          const db = new MockCategoryDatabase();
          
          // Create a non-system category
          const createResult = db.createCategory({
            identifier,
            name,
            isSystem: false,
          });
          expect(createResult.success).toBe(true);
          const categoryId = createResult.data.id;

          // Try to delete the non-system category
          const deleteResult = db.deleteCategory(categoryId);

          // Property: deletion should succeed for non-system categories without tools
          expect(deleteResult.success).toBe(true);
          
          // Property: category should be soft deleted
          const category = db.categories.get(categoryId);
          expect(category.deletedAt).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify system categories', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SYSTEM_CATEGORIES),
        fc.string({ minLength: 1, maxLength: 30 }),
        (identifier, name) => {
          const db = new MockCategoryDatabase();
          
          // Create a category with system identifier
          const createResult = db.createCategory({
            identifier,
            name,
          });
          const categoryId = createResult.data.id;

          // Check if it's identified as system category
          const checkResult = db.isSystemCategory(categoryId);

          // Property: categories with system identifiers should be identified as system
          expect(checkResult.success).toBe(true);
          expect(checkResult.data.isSystem).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify non-system categories', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => 
          /^[a-zA-Z0-9_]+$/.test(s) && !SYSTEM_CATEGORIES.includes(s)
        ),
        fc.string({ minLength: 1, maxLength: 30 }),
        (identifier, name) => {
          const db = new MockCategoryDatabase();
          
          // Create a non-system category
          const createResult = db.createCategory({
            identifier,
            name,
            isSystem: false,
          });
          const categoryId = createResult.data.id;

          // Check if it's identified as non-system category
          const checkResult = db.isSystemCategory(categoryId);

          // Property: categories without system identifiers should not be identified as system
          expect(checkResult.success).toBe(true);
          expect(checkResult.data.isSystem).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent deletion of non-system categories with associated tools', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => 
          /^[a-zA-Z0-9_]+$/.test(s) && !SYSTEM_CATEGORIES.includes(s)
        ),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.integer({ min: 1, max: 5 }), // number of tools
        (identifier, name, toolCount) => {
          const db = new MockCategoryDatabase();
          
          // Create a non-system category
          const createResult = db.createCategory({
            identifier,
            name,
            isSystem: false,
          });
          const categoryId = createResult.data.id;

          // Create tools associated with the category
          for (let i = 0; i < toolCount; i++) {
            db.createTool({
              name: `Tool ${i}`,
              categoryId,
            });
          }

          // Try to delete the category
          const deleteResult = db.deleteCategory(categoryId);

          // Property: deletion should fail when category has associated tools
          expect(deleteResult.success).toBe(false);
          expect(deleteResult.error).toBe('CATEGORY_HAS_TOOLS');
          expect(deleteResult.message).toContain(String(toolCount));
          
          // Property: category should still exist
          const category = db.categories.get(categoryId);
          expect(category.deletedAt).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should protect all five system categories', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(SYSTEM_CATEGORIES, { minLength: 1, maxLength: 5 }),
        (selectedCategories) => {
          const db = new MockCategoryDatabase();
          
          // Create all selected system categories
          const categoryIds = [];
          selectedCategories.forEach((identifier, index) => {
            const result = db.createCategory({
              identifier,
              name: `System Category ${index}`,
              isSystem: true,
            });
            categoryIds.push(result.data.id);
          });

          // Try to delete each system category
          categoryIds.forEach(id => {
            const deleteResult = db.deleteCategory(id);
            
            // Property: all system categories should be protected
            expect(deleteResult.success).toBe(false);
            expect(deleteResult.error).toBe('SYSTEM_CATEGORY_PROTECTED');
          });

          // Property: all system categories should still exist
          categoryIds.forEach(id => {
            const category = db.categories.get(id);
            expect(category.deletedAt).toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
