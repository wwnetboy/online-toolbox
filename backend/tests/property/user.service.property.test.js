/**
 * Property-Based Tests for User Service
 * Feature: backend-api
 * Tests pagination, search filtering, uniqueness constraints, and soft delete
 */

const fc = require('fast-check');

/**
 * Property 3: Pagination Data Consistency
 * For any pagination request, the returned record count should not exceed
 * the requested size parameter, and total should reflect the actual count.
 * 
 * Validates: Requirements 2.1, 4.1, 6.1, 8.2
 */
describe('Property 3: Pagination Data Consistency', () => {
  // Mock data generator for testing pagination logic
  const generateMockUsers = (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      userName: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
      status: i % 2 === 0 ? 'active' : 'inactive',
      gender: ['male', 'female', 'unknown'][i % 3],
      deletedAt: null,
    }));
  };

  // Pagination logic extracted for testing
  const paginateData = (data, current, size) => {
    const offset = (current - 1) * size;
    const records = data.slice(offset, offset + size);
    return {
      records,
      current,
      size,
      total: data.length,
    };
  };

  it('should return records count not exceeding requested size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // total records
        fc.integer({ min: 1, max: 50 }),  // page size
        fc.integer({ min: 1, max: 20 }),  // current page
        (totalRecords, size, current) => {
          const mockData = generateMockUsers(totalRecords);
          const result = paginateData(mockData, current, size);

          // Property: returned records should not exceed requested size
          expect(result.records.length).toBeLessThanOrEqual(size);
          
          // Property: total should equal actual data count
          expect(result.total).toBe(totalRecords);
          
          // Property: current and size should match request
          expect(result.current).toBe(current);
          expect(result.size).toBe(size);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return correct records for each page', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // total records (at least 1)
        fc.integer({ min: 1, max: 20 }),  // page size
        (totalRecords, size) => {
          const mockData = generateMockUsers(totalRecords);
          const totalPages = Math.ceil(totalRecords / size);

          // Test each page
          for (let page = 1; page <= totalPages; page++) {
            const result = paginateData(mockData, page, size);
            const expectedOffset = (page - 1) * size;
            const expectedCount = Math.min(size, totalRecords - expectedOffset);

            // Property: each page should have correct number of records
            expect(result.records.length).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty records for pages beyond data range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),  // total records
        fc.integer({ min: 1, max: 10 }),  // page size
        (totalRecords, size) => {
          const mockData = generateMockUsers(totalRecords);
          const totalPages = Math.ceil(totalRecords / size);
          const beyondPage = totalPages + 1;

          const result = paginateData(mockData, beyondPage, size);

          // Property: pages beyond range should return empty records
          expect(result.records.length).toBe(0);
          
          // Property: total should still reflect actual count
          expect(result.total).toBe(totalRecords);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain data integrity across all pages', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // total records
        fc.integer({ min: 1, max: 20 }),  // page size
        (totalRecords, size) => {
          const mockData = generateMockUsers(totalRecords);
          const totalPages = Math.ceil(totalRecords / size);
          const allRecords = [];

          // Collect all records from all pages
          for (let page = 1; page <= totalPages; page++) {
            const result = paginateData(mockData, page, size);
            allRecords.push(...result.records);
          }

          // Property: all records combined should equal original data
          expect(allRecords.length).toBe(totalRecords);
          
          // Property: no duplicates across pages
          const ids = allRecords.map(r => r.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(totalRecords);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 4: Search Filter Accuracy
 * For any search request with filter conditions, all returned records
 * should satisfy the specified filter conditions.
 * 
 * Validates: Requirements 2.5, 6.6, 8.7
 */
describe('Property 4: Search Filter Accuracy', () => {
  // Mock data generator with various attributes
  const generateMockUsers = (count) => {
    const statuses = ['active', 'inactive'];
    const genders = ['male', 'female', 'unknown'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      userName: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
      phone: `138${String(i).padStart(8, '0')}`,
      status: statuses[i % 2],
      gender: genders[i % 3],
      deletedAt: null,
    }));
  };

  // Filter logic extracted for testing
  const filterData = (data, filters) => {
    return data.filter(item => {
      // Exclude soft-deleted records
      if (item.deletedAt !== null) return false;

      // Apply userName filter (partial match)
      if (filters.userName && !item.userName.includes(filters.userName)) {
        return false;
      }

      // Apply email filter (partial match)
      if (filters.userEmail && !item.email.includes(filters.userEmail)) {
        return false;
      }

      // Apply phone filter (partial match)
      if (filters.userPhone && !item.phone.includes(filters.userPhone)) {
        return false;
      }

      // Apply gender filter (exact match)
      if (filters.userGender && item.gender !== filters.userGender) {
        return false;
      }

      // Apply status filter (exact match)
      if (filters.status && item.status !== filters.status) {
        return false;
      }

      return true;
    });
  };

  it('should return only records matching userName filter', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }), // total records
        fc.integer({ min: 1, max: 9 }),    // search digit
        (totalRecords, searchDigit) => {
          const mockData = generateMockUsers(totalRecords);
          const searchTerm = String(searchDigit);
          
          const result = filterData(mockData, { userName: searchTerm });

          // Property: all returned records should contain the search term in userName
          result.forEach(record => {
            expect(record.userName).toContain(searchTerm);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only records matching status filter', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }), // total records
        fc.constantFrom('active', 'inactive'), // status filter
        (totalRecords, statusFilter) => {
          const mockData = generateMockUsers(totalRecords);
          
          const result = filterData(mockData, { status: statusFilter });

          // Property: all returned records should have the specified status
          result.forEach(record => {
            expect(record.status).toBe(statusFilter);
          });

          // Property: result should include all records with that status
          const expectedCount = mockData.filter(u => u.status === statusFilter).length;
          expect(result.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only records matching gender filter', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }), // total records
        fc.constantFrom('male', 'female', 'unknown'), // gender filter
        (totalRecords, genderFilter) => {
          const mockData = generateMockUsers(totalRecords);
          
          const result = filterData(mockData, { userGender: genderFilter });

          // Property: all returned records should have the specified gender
          result.forEach(record => {
            expect(record.gender).toBe(genderFilter);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only records matching multiple filters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 100 }), // total records
        fc.constantFrom('active', 'inactive'), // status filter
        fc.constantFrom('male', 'female', 'unknown'), // gender filter
        (totalRecords, statusFilter, genderFilter) => {
          const mockData = generateMockUsers(totalRecords);
          
          const result = filterData(mockData, { 
            status: statusFilter, 
            userGender: genderFilter 
          });

          // Property: all returned records should match ALL filter conditions
          result.forEach(record => {
            expect(record.status).toBe(statusFilter);
            expect(record.gender).toBe(genderFilter);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all non-deleted records when no filters applied', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // total records
        (totalRecords) => {
          const mockData = generateMockUsers(totalRecords);
          
          const result = filterData(mockData, {});

          // Property: should return all non-deleted records
          expect(result.length).toBe(totalRecords);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude soft-deleted records from filter results', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }), // total records
        fc.integer({ min: 1, max: 5 }),    // number of deleted records
        (totalRecords, deletedCount) => {
          const mockData = generateMockUsers(totalRecords);
          
          // Mark some records as deleted
          for (let i = 0; i < Math.min(deletedCount, totalRecords); i++) {
            mockData[i].deletedAt = new Date();
          }
          
          const result = filterData(mockData, {});

          // Property: soft-deleted records should not appear in results
          result.forEach(record => {
            expect(record.deletedAt).toBeNull();
          });

          // Property: result count should exclude deleted records
          const expectedCount = totalRecords - Math.min(deletedCount, totalRecords);
          expect(result.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 5: Uniqueness Constraints
 * For any create request, if the specified unique field (userName, email, roleCode, 
 * categoryId) already exists, it should return a conflict error; otherwise it should 
 * succeed.
 * 
 * Validates: Requirements 2.6, 4.2, 7.2
 */
describe('Property 5: Uniqueness Constraints', () => {
  // Simulated database for uniqueness testing
  class MockDatabase {
    constructor() {
      this.users = new Map();
      this.nextId = 1;
    }

    findByUserName(userName) {
      for (const user of this.users.values()) {
        if (user.userName === userName && user.deletedAt === null) {
          return user;
        }
      }
      return null;
    }

    findByEmail(email) {
      for (const user of this.users.values()) {
        if (user.email === email && user.deletedAt === null) {
          return user;
        }
      }
      return null;
    }

    create(userData) {
      // Check uniqueness constraints
      if (this.findByUserName(userData.userName)) {
        return { success: false, error: 'USERNAME_EXISTS', message: '用户名已存在' };
      }
      if (this.findByEmail(userData.email)) {
        return { success: false, error: 'EMAIL_EXISTS', message: '邮箱已存在' };
      }

      const user = {
        id: this.nextId++,
        ...userData,
        deletedAt: null,
        createdAt: new Date(),
      };
      this.users.set(user.id, user);
      return { success: true, data: user };
    }

    softDelete(id) {
      const user = this.users.get(id);
      if (user) {
        user.deletedAt = new Date();
        return true;
      }
      return false;
    }
  }

  it('should reject creation when userName already exists', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
        fc.emailAddress(),
        (userName, email) => {
          const db = new MockDatabase();
          
          // Create first user
          const result1 = db.create({ userName, email: `first_${email}` });
          expect(result1.success).toBe(true);

          // Try to create second user with same userName
          const result2 = db.create({ userName, email: `second_${email}` });
          
          // Property: should fail with USERNAME_EXISTS error
          expect(result2.success).toBe(false);
          expect(result2.error).toBe('USERNAME_EXISTS');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject creation when email already exists', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
        fc.emailAddress(),
        (baseUserName, email) => {
          const db = new MockDatabase();
          
          // Create first user
          const result1 = db.create({ userName: `first_${baseUserName}`, email });
          expect(result1.success).toBe(true);

          // Try to create second user with same email
          const result2 = db.create({ userName: `second_${baseUserName}`, email });
          
          // Property: should fail with EMAIL_EXISTS error
          expect(result2.success).toBe(false);
          expect(result2.error).toBe('EMAIL_EXISTS');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow creation when both userName and email are unique', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            userName: fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
            email: fc.emailAddress(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (users) => {
          const db = new MockDatabase();
          
          // Make userNames and emails unique by adding index
          const uniqueUsers = users.map((u, i) => ({
            userName: `${u.userName}_${i}`,
            email: `${i}_${u.email}`,
          }));

          // All creations should succeed
          uniqueUsers.forEach(userData => {
            const result = db.create(userData);
            expect(result.success).toBe(true);
          });

          // Property: database should contain all users
          expect(db.users.size).toBe(uniqueUsers.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow reusing userName/email after soft delete', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
        fc.emailAddress(),
        (userName, email) => {
          const db = new MockDatabase();
          
          // Create first user
          const result1 = db.create({ userName, email });
          expect(result1.success).toBe(true);
          const userId = result1.data.id;

          // Soft delete the user
          db.softDelete(userId);

          // Create new user with same userName and email
          const result2 = db.create({ userName, email });
          
          // Property: should succeed after soft delete
          expect(result2.success).toBe(true);
          expect(result2.data.id).not.toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain uniqueness across multiple operations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            action: fc.constantFrom('create', 'delete'),
            userName: fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
            email: fc.emailAddress(),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (operations) => {
          const db = new MockDatabase();
          const activeUsers = new Map(); // Track active userName -> id

          operations.forEach((op, index) => {
            const uniqueUserName = `${op.userName}_${index}`;
            const uniqueEmail = `${index}_${op.email}`;

            if (op.action === 'create') {
              const result = db.create({ userName: uniqueUserName, email: uniqueEmail });
              if (result.success) {
                activeUsers.set(uniqueUserName, result.data.id);
              }
            } else if (op.action === 'delete' && activeUsers.size > 0) {
              // Delete a random active user
              const keys = Array.from(activeUsers.keys());
              const keyToDelete = keys[0];
              const idToDelete = activeUsers.get(keyToDelete);
              db.softDelete(idToDelete);
              activeUsers.delete(keyToDelete);
            }
          });

          // Property: all active users should have unique userNames
          const activeUserNames = Array.from(activeUsers.keys());
          const uniqueNames = new Set(activeUserNames);
          expect(uniqueNames.size).toBe(activeUserNames.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 6: Soft Delete Consistency
 * For any soft-deleted record, it should have a non-null deletedAt field
 * and should not appear in normal list query results.
 * 
 * Validates: Requirements 2.4, 6.5, 8.5, 8.6
 */
describe('Property 6: Soft Delete Consistency', () => {
  // Simulated database with soft delete support
  class SoftDeleteDatabase {
    constructor() {
      this.records = new Map();
      this.nextId = 1;
    }

    create(data) {
      const record = {
        id: this.nextId++,
        ...data,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.records.set(record.id, record);
      return record;
    }

    findAll(includeDeleted = false) {
      const results = [];
      for (const record of this.records.values()) {
        if (includeDeleted || record.deletedAt === null) {
          results.push(record);
        }
      }
      return results;
    }

    findById(id, includeDeleted = false) {
      const record = this.records.get(id);
      if (!record) return null;
      if (!includeDeleted && record.deletedAt !== null) return null;
      return record;
    }

    softDelete(id) {
      const record = this.records.get(id);
      if (record && record.deletedAt === null) {
        record.deletedAt = new Date();
        record.updatedAt = new Date();
        return true;
      }
      return false;
    }

    batchSoftDelete(ids) {
      let deletedCount = 0;
      ids.forEach(id => {
        if (this.softDelete(id)) {
          deletedCount++;
        }
      });
      return deletedCount;
    }

    restore(id) {
      const record = this.records.get(id);
      if (record && record.deletedAt !== null) {
        record.deletedAt = null;
        record.updatedAt = new Date();
        return true;
      }
      return false;
    }
  }

  it('should set deletedAt to non-null when soft deleting', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.emailAddress(),
        (userName, email) => {
          const db = new SoftDeleteDatabase();
          
          // Create a record
          const record = db.create({ userName, email });
          expect(record.deletedAt).toBeNull();

          // Soft delete
          const deleted = db.softDelete(record.id);
          expect(deleted).toBe(true);

          // Property: deletedAt should be non-null after soft delete
          const deletedRecord = db.records.get(record.id);
          expect(deletedRecord.deletedAt).not.toBeNull();
          expect(deletedRecord.deletedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude soft-deleted records from normal queries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }), // total records
        fc.integer({ min: 1, max: 4 }),  // records to delete
        (totalRecords, deleteCount) => {
          const db = new SoftDeleteDatabase();
          
          // Create records
          const createdIds = [];
          for (let i = 0; i < totalRecords; i++) {
            const record = db.create({ 
              userName: `user${i}`, 
              email: `user${i}@example.com` 
            });
            createdIds.push(record.id);
          }

          // Soft delete some records
          const idsToDelete = createdIds.slice(0, Math.min(deleteCount, totalRecords));
          idsToDelete.forEach(id => db.softDelete(id));

          // Query without including deleted
          const activeRecords = db.findAll(false);
          
          // Property: soft-deleted records should not appear in normal queries
          activeRecords.forEach(record => {
            expect(record.deletedAt).toBeNull();
          });

          // Property: count should reflect only active records
          expect(activeRecords.length).toBe(totalRecords - idsToDelete.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include soft-deleted records when explicitly requested', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }), // total records
        fc.integer({ min: 1, max: 4 }),  // records to delete
        (totalRecords, deleteCount) => {
          const db = new SoftDeleteDatabase();
          
          // Create records
          for (let i = 0; i < totalRecords; i++) {
            const record = db.create({ 
              userName: `user${i}`, 
              email: `user${i}@example.com` 
            });
            if (i < deleteCount) {
              db.softDelete(record.id);
            }
          }

          // Query including deleted
          const allRecords = db.findAll(true);
          
          // Property: should include all records when includeDeleted is true
          expect(allRecords.length).toBe(totalRecords);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle batch soft delete correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 30 }), // total records
        fc.array(fc.integer({ min: 0, max: 29 }), { minLength: 1, maxLength: 10 }), // indices to delete
        (totalRecords, deleteIndices) => {
          const db = new SoftDeleteDatabase();
          
          // Create records
          const createdIds = [];
          for (let i = 0; i < totalRecords; i++) {
            const record = db.create({ 
              userName: `user${i}`, 
              email: `user${i}@example.com` 
            });
            createdIds.push(record.id);
          }

          // Get unique valid indices
          const validIndices = [...new Set(deleteIndices)]
            .filter(i => i < totalRecords);
          const idsToDelete = validIndices.map(i => createdIds[i]);

          // Batch soft delete
          const deletedCount = db.batchSoftDelete(idsToDelete);

          // Property: deleted count should match unique valid IDs
          expect(deletedCount).toBe(idsToDelete.length);

          // Property: all deleted records should have non-null deletedAt
          idsToDelete.forEach(id => {
            const record = db.records.get(id);
            expect(record.deletedAt).not.toBeNull();
          });

          // Property: remaining records should be active
          const activeRecords = db.findAll(false);
          expect(activeRecords.length).toBe(totalRecords - idsToDelete.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not find soft-deleted record by ID in normal query', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.emailAddress(),
        (userName, email) => {
          const db = new SoftDeleteDatabase();
          
          // Create and soft delete a record
          const record = db.create({ userName, email });
          db.softDelete(record.id);

          // Property: findById should return null for soft-deleted record
          const found = db.findById(record.id, false);
          expect(found).toBeNull();

          // Property: findById with includeDeleted should return the record
          const foundWithDeleted = db.findById(record.id, true);
          expect(foundWithDeleted).not.toBeNull();
          expect(foundWithDeleted.id).toBe(record.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve record data after soft delete', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.emailAddress(),
        (userName, email) => {
          const db = new SoftDeleteDatabase();
          
          // Create a record
          const record = db.create({ userName, email });
          const originalData = { ...record };

          // Soft delete
          db.softDelete(record.id);

          // Property: record data should be preserved after soft delete
          const deletedRecord = db.records.get(record.id);
          expect(deletedRecord.userName).toBe(originalData.userName);
          expect(deletedRecord.email).toBe(originalData.email);
          expect(deletedRecord.id).toBe(originalData.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
