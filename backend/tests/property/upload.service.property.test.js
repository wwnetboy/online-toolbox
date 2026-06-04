/**
 * Property-Based Tests for Upload Service
 * Feature: backend-api
 * Tests file upload validation properties
 */

const fc = require('fast-check');
const {
  isValidFileType,
  isValidFileSize,
  generateUniqueFilename,
  getAllowedMimeTypes,
  getAllowedExtensions,
  ALLOWED_TYPES,
} = require('../../src/services/upload.service');
const config = require('../../src/config');

describe('UploadService Properties', () => {
  /**
   * Property 13: File Upload Type Validation
   * For any file upload request, only allowed file types (JPG, JPEG, PNG, GIF, WebP)
   * should be accepted; disallowed types should return false.
   * 
   * Validates: Requirements 13.1, 13.5
   */
  describe('Property 13: File Upload Type Validation', () => {
    const allowedMimeTypes = getAllowedMimeTypes();
    
    it('should accept all allowed MIME types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allowedMimeTypes),
          (mimetype) => {
            const result = isValidFileType(mimetype);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-allowed MIME types', () => {
      // Common disallowed MIME types
      const disallowedTypes = [
        'application/pdf',
        'application/json',
        'text/plain',
        'text/html',
        'application/javascript',
        'application/xml',
        'video/mp4',
        'audio/mpeg',
        'application/zip',
        'application/octet-stream',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...disallowedTypes),
          (mimetype) => {
            const result = isValidFileType(mimetype);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject arbitrary non-image MIME types', () => {
      fc.assert(
        fc.property(
          // Generate random MIME types that are not in allowed list
          fc.tuple(
            fc.constantFrom('application', 'text', 'video', 'audio'),
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9-]+$/.test(s))
          ),
          ([type, subtype]) => {
            const mimetype = `${type}/${subtype}`;
            // Only test if it's not accidentally an allowed type
            if (!allowedMimeTypes.includes(mimetype)) {
              const result = isValidFileType(mimetype);
              expect(result).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty or invalid MIME type strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant(null),
            fc.constant(undefined),
            fc.string({ maxLength: 5 }).filter(s => !s.includes('/'))
          ),
          (mimetype) => {
            const result = isValidFileType(mimetype);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify allowed types match configuration', () => {
      // Verify that our allowed types match the expected image types
      const expectedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      expectedTypes.forEach(type => {
        expect(isValidFileType(type)).toBe(true);
      });
    });
  });

  /**
   * Property 14: File Upload Size Limit
   * For any file upload request, files exceeding 5MB should return false;
   * files within the limit should return true.
   * 
   * Validates: Requirements 13.4, 13.6
   */
  describe('Property 14: File Upload Size Limit', () => {
    const maxSize = config.upload.maxFileSize; // 5MB

    it('should accept files within size limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: maxSize }),
          (size) => {
            const result = isValidFileSize(size);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject files exceeding size limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: maxSize + 1, max: maxSize * 10 }),
          (size) => {
            const result = isValidFileSize(size);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept files at exactly the size limit', () => {
      const result = isValidFileSize(maxSize);
      expect(result).toBe(true);
    });

    it('should reject files just over the size limit', () => {
      const result = isValidFileSize(maxSize + 1);
      expect(result).toBe(false);
    });

    it('should accept zero-byte files', () => {
      const result = isValidFileSize(0);
      expect(result).toBe(true);
    });
  });

  /**
   * Property 15: Filename Uniqueness
   * For any two uploads with the same original filename, the generated
   * storage filenames should be different.
   * 
   * Validates: Requirements 13.3
   */
  describe('Property 15: Filename Uniqueness', () => {
    it('should generate unique filenames for same original name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9._-]+$/.test(s)),
          (originalName) => {
            const filename1 = generateUniqueFilename(originalName);
            const filename2 = generateUniqueFilename(originalName);
            
            // Property: generated filenames should be different
            expect(filename1).not.toBe(filename2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve file extension', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
            fc.constantFrom('.jpg', '.jpeg', '.png', '.gif', '.webp')
          ),
          ([baseName, ext]) => {
            const originalName = baseName + ext;
            const generatedName = generateUniqueFilename(originalName);
            
            // Property: generated filename should end with same extension
            expect(generatedName.toLowerCase()).toMatch(new RegExp(`${ext.toLowerCase()}$`));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate filenames with timestamp and random component', () => {
      fc.assert(
        fc.property(
          // Generate filenames with valid extensions
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
            fc.constantFrom('.jpg', '.jpeg', '.png', '.gif', '.webp')
          ),
          ([baseName, ext]) => {
            const originalName = baseName + ext;
            const generatedName = generateUniqueFilename(originalName);
            
            // Property: generated filename should contain timestamp pattern
            // Format: timestamp-randomhex.ext
            expect(generatedName).toMatch(/^\d+-[a-f0-9]+\.[a-z]+$/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate many unique filenames without collision', () => {
      const originalName = 'test.jpg';
      const generatedNames = new Set();
      
      // Generate 1000 filenames and check for uniqueness
      for (let i = 0; i < 1000; i++) {
        const filename = generateUniqueFilename(originalName);
        expect(generatedNames.has(filename)).toBe(false);
        generatedNames.add(filename);
      }
      
      expect(generatedNames.size).toBe(1000);
    });

    it('should handle filenames with multiple dots', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'file.name.jpg',
            'my.photo.2024.png',
            'image.v1.0.gif',
            'test...webp'
          ),
          (originalName) => {
            const generatedName = generateUniqueFilename(originalName);
            const originalExt = originalName.substring(originalName.lastIndexOf('.'));
            
            // Property: should preserve the last extension
            expect(generatedName.toLowerCase()).toMatch(new RegExp(`${originalExt.toLowerCase()}$`));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
