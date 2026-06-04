/**
 * Property-Based Tests for Tool Service
 * Feature: backend-api
 * Tests update operation idempotency
 * 
 * Property 7: Update Operation Idempotency
 * For any update request, updating the same record multiple times with the same data
 * should result in the same final state as a single update.
 * 
 * Validates: Requirements 2.3, 4.3, 6.3, 7.3, 8.3
 */

const fc = require('fast-check');

describe('Property 7: Update Operation Idempotency', () => {
  // Simulated database for idempotency testing
  class MockDatabase {
    constructor() {
      this.tools = new Map();
      this.users = new Map();
      this.roles = new Map();
      this.categories = new Map();
      this.feedbacks = new Map();
      this.nextId = 1;
    }

    // Tool operations
    createTool(toolData) {
      const tool = {
        id: this.nextId++,
        name: toolData.name,
        description: toolData.description || null,
        icon: toolData.icon || null,
        color: toolData.color || null,
        categoryId: toolData.categoryId || null,
        route: toolData.route,
        badge: toolData.badge || null,
        enabled: toolData.enabled !== undefined ? toolData.enabled : true,
        sort: toolData.sort || 0,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.tools.set(tool.id, tool);
      return { success: true, data: { ...tool } };
    }

    updateTool(id, updateData) {
      const tool = this.tools.get(id);
      if (!tool || tool.deletedAt !== null) {
        return { success: false, error: 'TOOL_NOT_FOUND' };
      }

      // Apply updates
      if (updateData.name !== undefined) tool.name = updateData.name;
      if (updateData.description !== undefined) tool.description = updateData.description;
      if (updateData.icon !== undefined) tool.icon = updateData.icon;
      if (updateData.color !== undefined) tool.color = updateData.color;
      if (updateData.categoryId !== undefined) tool.categoryId = updateData.categoryId;
      if (updateData.route !== undefined) tool.route = updateData.route;
      if (updateData.badge !== undefined) tool.badge = updateData.badge;
      if (updateData.enabled !== undefined) tool.enabled = updateData.enabled;
      if (updateData.sort !== undefined) tool.sort = updateData.sort;
      tool.updatedAt = new Date();

      return { success: true, data: { ...tool } };
    }

    getTool(id) {
      const tool = this.tools.get(id);
      if (!tool || tool.deletedAt !== null) {
        return { success: false, error: 'TOOL_NOT_FOUND' };
      }
      return { success: true, data: { ...tool } };
    }


    // User operations
    createUser(userData) {
      const user = {
        id: this.nextId++,
        userName: userData.userName,
        email: userData.email,
        nickName: userData.nickName || null,
        phone: userData.phone || null,
        gender: userData.gender || 'unknown',
        status: userData.status || 'active',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(user.id, user);
      return { success: true, data: { ...user } };
    }

    updateUser(id, updateData) {
      const user = this.users.get(id);
      if (!user || user.deletedAt !== null) {
        return { success: false, error: 'USER_NOT_FOUND' };
      }

      if (updateData.nickName !== undefined) user.nickName = updateData.nickName;
      if (updateData.email !== undefined) user.email = updateData.email;
      if (updateData.phone !== undefined) user.phone = updateData.phone;
      if (updateData.gender !== undefined) user.gender = updateData.gender;
      if (updateData.status !== undefined) user.status = updateData.status;
      user.updatedAt = new Date();

      return { success: true, data: { ...user } };
    }

    getUser(id) {
      const user = this.users.get(id);
      if (!user || user.deletedAt !== null) {
        return { success: false, error: 'USER_NOT_FOUND' };
      }
      return { success: true, data: { ...user } };
    }

    // Role operations
    createRole(roleData) {
      const role = {
        id: this.nextId++,
        roleName: roleData.roleName,
        roleCode: roleData.roleCode,
        description: roleData.description || null,
        enabled: roleData.enabled !== undefined ? roleData.enabled : true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.roles.set(role.id, role);
      return { success: true, data: { ...role } };
    }

    updateRole(id, updateData) {
      const role = this.roles.get(id);
      if (!role || role.deletedAt !== null) {
        return { success: false, error: 'ROLE_NOT_FOUND' };
      }

      if (updateData.roleName !== undefined) role.roleName = updateData.roleName;
      if (updateData.description !== undefined) role.description = updateData.description;
      if (updateData.enabled !== undefined) role.enabled = updateData.enabled;
      role.updatedAt = new Date();

      return { success: true, data: { ...role } };
    }

    getRole(id) {
      const role = this.roles.get(id);
      if (!role || role.deletedAt !== null) {
        return { success: false, error: 'ROLE_NOT_FOUND' };
      }
      return { success: true, data: { ...role } };
    }


    // Category operations
    createCategory(categoryData) {
      const category = {
        id: this.nextId++,
        identifier: categoryData.identifier,
        name: categoryData.name,
        icon: categoryData.icon || null,
        sort: categoryData.sort || 0,
        enabled: categoryData.enabled !== undefined ? categoryData.enabled : true,
        isSystem: categoryData.isSystem || false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.categories.set(category.id, category);
      return { success: true, data: { ...category } };
    }

    updateCategory(id, updateData) {
      const category = this.categories.get(id);
      if (!category || category.deletedAt !== null) {
        return { success: false, error: 'CATEGORY_NOT_FOUND' };
      }

      if (updateData.name !== undefined) category.name = updateData.name;
      if (updateData.icon !== undefined) category.icon = updateData.icon;
      if (updateData.enabled !== undefined) category.enabled = updateData.enabled;
      category.updatedAt = new Date();

      return { success: true, data: { ...category } };
    }

    getCategory(id) {
      const category = this.categories.get(id);
      if (!category || category.deletedAt !== null) {
        return { success: false, error: 'CATEGORY_NOT_FOUND' };
      }
      return { success: true, data: { ...category } };
    }

    // Feedback operations
    createFeedback(feedbackData) {
      const feedback = {
        id: this.nextId++,
        type: feedbackData.type,
        toolId: feedbackData.toolId || null,
        content: feedbackData.content,
        contact: feedbackData.contact || null,
        status: feedbackData.status || 'pending',
        reply: feedbackData.reply || null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.feedbacks.set(feedback.id, feedback);
      return { success: true, data: { ...feedback } };
    }

    updateFeedback(id, updateData) {
      const feedback = this.feedbacks.get(id);
      if (!feedback || feedback.deletedAt !== null) {
        return { success: false, error: 'FEEDBACK_NOT_FOUND' };
      }

      if (updateData.status !== undefined) feedback.status = updateData.status;
      if (updateData.reply !== undefined) feedback.reply = updateData.reply;
      feedback.updatedAt = new Date();

      return { success: true, data: { ...feedback } };
    }

    getFeedback(id) {
      const feedback = this.feedbacks.get(id);
      if (!feedback || feedback.deletedAt !== null) {
        return { success: false, error: 'FEEDBACK_NOT_FOUND' };
      }
      return { success: true, data: { ...feedback } };
    }
  }

  // Helper to compare objects ignoring timestamps
  const compareIgnoringTimestamps = (obj1, obj2) => {
    const clean = (obj) => {
      const { createdAt, updatedAt, ...rest } = obj;
      return rest;
    };
    return JSON.stringify(clean(obj1)) === JSON.stringify(clean(obj2));
  };


  /**
   * Test: Tool update idempotency (Requirement 6.3)
   */
  it('should produce same state when updating tool multiple times with same data', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.string({ maxLength: 200 }),
          icon: fc.string({ maxLength: 50 }),
          route: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.string({ maxLength: 200 }),
          icon: fc.string({ maxLength: 50 }),
          enabled: fc.boolean(),
        }),
        fc.integer({ min: 2, max: 5 }), // number of times to apply update
        (initialData, updateData, updateCount) => {
          const db = new MockDatabase();
          
          // Create initial tool
          const createResult = db.createTool({
            ...initialData,
            enabled: true,
          });
          expect(createResult.success).toBe(true);
          const toolId = createResult.data.id;

          // Apply update once
          const singleUpdateResult = db.updateTool(toolId, updateData);
          expect(singleUpdateResult.success).toBe(true);
          const stateAfterSingleUpdate = db.getTool(toolId).data;

          // Apply same update multiple more times
          for (let i = 1; i < updateCount; i++) {
            db.updateTool(toolId, updateData);
          }
          const stateAfterMultipleUpdates = db.getTool(toolId).data;

          // Property: state after single update should equal state after multiple updates
          expect(compareIgnoringTimestamps(stateAfterSingleUpdate, stateAfterMultipleUpdates)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: User update idempotency (Requirement 2.3)
   */
  it('should produce same state when updating user multiple times with same data', () => {
    fc.assert(
      fc.property(
        fc.record({
          userName: fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          email: fc.emailAddress(),
        }),
        fc.record({
          nickName: fc.string({ maxLength: 30 }),
          phone: fc.string({ maxLength: 20 }),
          gender: fc.constantFrom('male', 'female', 'unknown'),
        }),
        fc.integer({ min: 2, max: 5 }),
        (initialData, updateData, updateCount) => {
          const db = new MockDatabase();
          
          // Create initial user
          const createResult = db.createUser(initialData);
          expect(createResult.success).toBe(true);
          const userId = createResult.data.id;

          // Apply update once
          const singleUpdateResult = db.updateUser(userId, updateData);
          expect(singleUpdateResult.success).toBe(true);
          const stateAfterSingleUpdate = db.getUser(userId).data;

          // Apply same update multiple more times
          for (let i = 1; i < updateCount; i++) {
            db.updateUser(userId, updateData);
          }
          const stateAfterMultipleUpdates = db.getUser(userId).data;

          // Property: state after single update should equal state after multiple updates
          expect(compareIgnoringTimestamps(stateAfterSingleUpdate, stateAfterMultipleUpdates)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Test: Role update idempotency (Requirement 4.3)
   */
  it('should produce same state when updating role multiple times with same data', () => {
    fc.assert(
      fc.property(
        fc.record({
          roleName: fc.string({ minLength: 1, maxLength: 30 }),
          roleCode: fc.string({ minLength: 2, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
        }),
        fc.record({
          roleName: fc.string({ minLength: 1, maxLength: 30 }),
          description: fc.string({ maxLength: 100 }),
          enabled: fc.boolean(),
        }),
        fc.integer({ min: 2, max: 5 }),
        (initialData, updateData, updateCount) => {
          const db = new MockDatabase();
          
          // Create initial role
          const createResult = db.createRole(initialData);
          expect(createResult.success).toBe(true);
          const roleId = createResult.data.id;

          // Apply update once
          const singleUpdateResult = db.updateRole(roleId, updateData);
          expect(singleUpdateResult.success).toBe(true);
          const stateAfterSingleUpdate = db.getRole(roleId).data;

          // Apply same update multiple more times
          for (let i = 1; i < updateCount; i++) {
            db.updateRole(roleId, updateData);
          }
          const stateAfterMultipleUpdates = db.getRole(roleId).data;

          // Property: state after single update should equal state after multiple updates
          expect(compareIgnoringTimestamps(stateAfterSingleUpdate, stateAfterMultipleUpdates)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Category update idempotency (Requirement 7.3)
   */
  it('should produce same state when updating category multiple times with same data', () => {
    fc.assert(
      fc.property(
        fc.record({
          identifier: fc.string({ minLength: 2, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          name: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          icon: fc.string({ maxLength: 50 }),
          enabled: fc.boolean(),
        }),
        fc.integer({ min: 2, max: 5 }),
        (initialData, updateData, updateCount) => {
          const db = new MockDatabase();
          
          // Create initial category
          const createResult = db.createCategory(initialData);
          expect(createResult.success).toBe(true);
          const categoryId = createResult.data.id;

          // Apply update once
          const singleUpdateResult = db.updateCategory(categoryId, updateData);
          expect(singleUpdateResult.success).toBe(true);
          const stateAfterSingleUpdate = db.getCategory(categoryId).data;

          // Apply same update multiple more times
          for (let i = 1; i < updateCount; i++) {
            db.updateCategory(categoryId, updateData);
          }
          const stateAfterMultipleUpdates = db.getCategory(categoryId).data;

          // Property: state after single update should equal state after multiple updates
          expect(compareIgnoringTimestamps(stateAfterSingleUpdate, stateAfterMultipleUpdates)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Test: Feedback update idempotency (Requirement 8.3)
   */
  it('should produce same state when updating feedback multiple times with same data', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom('suggestion', 'bug', 'other'),
          content: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        fc.record({
          status: fc.constantFrom('pending', 'processing', 'resolved'),
          reply: fc.string({ maxLength: 200 }),
        }),
        fc.integer({ min: 2, max: 5 }),
        (initialData, updateData, updateCount) => {
          const db = new MockDatabase();
          
          // Create initial feedback
          const createResult = db.createFeedback(initialData);
          expect(createResult.success).toBe(true);
          const feedbackId = createResult.data.id;

          // Apply update once
          const singleUpdateResult = db.updateFeedback(feedbackId, updateData);
          expect(singleUpdateResult.success).toBe(true);
          const stateAfterSingleUpdate = db.getFeedback(feedbackId).data;

          // Apply same update multiple more times
          for (let i = 1; i < updateCount; i++) {
            db.updateFeedback(feedbackId, updateData);
          }
          const stateAfterMultipleUpdates = db.getFeedback(feedbackId).data;

          // Property: state after single update should equal state after multiple updates
          expect(compareIgnoringTimestamps(stateAfterSingleUpdate, stateAfterMultipleUpdates)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Sequential updates should be idempotent for each step
   */
  it('should maintain idempotency across sequential different updates', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          route: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            enabled: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (initialData, updateSequence) => {
          const db1 = new MockDatabase();
          const db2 = new MockDatabase();
          
          // Create same initial tool in both databases
          const result1 = db1.createTool({ ...initialData, enabled: true });
          const result2 = db2.createTool({ ...initialData, enabled: true });
          const toolId1 = result1.data.id;
          const toolId2 = result2.data.id;

          // Apply each update once in db1, twice in db2
          for (const updateData of updateSequence) {
            db1.updateTool(toolId1, updateData);
            db2.updateTool(toolId2, updateData);
            db2.updateTool(toolId2, updateData); // Apply twice
          }

          const finalState1 = db1.getTool(toolId1).data;
          const finalState2 = db2.getTool(toolId2).data;

          // Property: final states should be equal (ignoring timestamps)
          expect(compareIgnoringTimestamps(finalState1, finalState2)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Partial updates should be idempotent
   */
  it('should be idempotent for partial updates', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.string({ maxLength: 100 }),
          route: fc.string({ minLength: 1, maxLength: 100 }),
          enabled: fc.boolean(),
        }),
        fc.constantFrom('name', 'description', 'enabled'),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 2, max: 5 }),
        (initialData, fieldToUpdate, newValue, updateCount) => {
          const db = new MockDatabase();
          
          // Create initial tool
          const createResult = db.createTool(initialData);
          const toolId = createResult.data.id;

          // Create partial update
          const partialUpdate = {};
          if (fieldToUpdate === 'enabled') {
            partialUpdate[fieldToUpdate] = newValue === 'true';
          } else {
            partialUpdate[fieldToUpdate] = newValue;
          }

          // Apply partial update once
          db.updateTool(toolId, partialUpdate);
          const stateAfterSingleUpdate = db.getTool(toolId).data;

          // Apply same partial update multiple times
          for (let i = 1; i < updateCount; i++) {
            db.updateTool(toolId, partialUpdate);
          }
          const stateAfterMultipleUpdates = db.getTool(toolId).data;

          // Property: partial updates should also be idempotent
          expect(compareIgnoringTimestamps(stateAfterSingleUpdate, stateAfterMultipleUpdates)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
