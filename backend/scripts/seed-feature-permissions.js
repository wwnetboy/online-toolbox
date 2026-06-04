/**
 * Seed Feature Permissions Script
 * 
 * This script inserts all 40 feature permissions into the database.
 * Feature IDs must match the tool IDs in the frontend.
 * Usage: node scripts/seed-feature-permissions.js
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sequelize } = require('../src/config/database');
const { FeaturePermission } = require('../src/models');

const featurePermissions = [
  // ========== 图片工具 (8个) ==========
  { featureId: 'image-compress', featureName: '图片压缩', category: 'image', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-convert', featureName: '格式转换', category: 'image', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-crop', featureName: '图片裁剪', category: 'image', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-rotate', featureName: '图片旋转', category: 'image', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-resize', featureName: '尺寸调整', category: 'image', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-splice', featureName: '长图拼接', category: 'image', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-watermark', featureName: '图片水印', category: 'image', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-remove-watermark', featureName: '图片去水印', category: 'image', requireMember: false, freeTrialCount: 0, enabled: true },

  // ========== PDF基础操作 (9个) ==========
  { featureId: 'pdf-merge', featureName: 'PDF合并', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-split', featureName: 'PDF拆分', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-compress', featureName: 'PDF压缩', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-extract', featureName: '页面提取', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-delete', featureName: '页面删除', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-rotate', featureName: '页面旋转', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-reorder', featureName: '页面重排', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-watermark', featureName: 'PDF水印', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-encrypt', featureName: 'PDF加密', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },

  // ========== PDF格式转换 (10个) ==========
  { featureId: 'pdf-from-image', featureName: '图片转PDF', category: 'pdf-convert', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-to-image', featureName: 'PDF转图片', category: 'pdf-convert', requireMember: false, freeTrialCount: 5, enabled: true },
  { featureId: 'pdf-from-word', featureName: 'Word转PDF', category: 'pdf-convert', requireMember: true, freeTrialCount: 3, enabled: true },
  { featureId: 'pdf-to-word', featureName: 'PDF转Word', category: 'pdf-convert', requireMember: true, freeTrialCount: 3, enabled: true },
  { featureId: 'pdf-from-ppt', featureName: 'PPT转PDF', category: 'pdf-convert', requireMember: true, freeTrialCount: 3, enabled: true },
  { featureId: 'pdf-to-ppt', featureName: 'PDF转PPT', category: 'pdf-convert', requireMember: true, freeTrialCount: 3, enabled: true },
  { featureId: 'pdf-from-excel', featureName: 'Excel转PDF', category: 'pdf-convert', requireMember: true, freeTrialCount: 3, enabled: true },
  { featureId: 'pdf-to-excel', featureName: 'PDF转Excel', category: 'pdf-convert', requireMember: true, freeTrialCount: 3, enabled: true },
  { featureId: 'pdf-from-html', featureName: 'HTML转PDF', category: 'pdf-convert', requireMember: true, freeTrialCount: 3, enabled: true },
  { featureId: 'pdf-to-pdfa', featureName: 'PDF转PDF/A', category: 'pdf-convert', requireMember: true, freeTrialCount: 2, enabled: true },

  // ========== PDF高级编辑 (5个) ==========
  { featureId: 'pdf-page-number', featureName: '添加页码', category: 'pdf-edit', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-crop', featureName: '裁剪PDF', category: 'pdf-edit', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-edit', featureName: 'PDF编辑', category: 'pdf-edit', requireMember: true, freeTrialCount: 1, enabled: true },
  { featureId: 'pdf-repair', featureName: 'PDF修复', category: 'pdf-edit', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-ocr', featureName: 'OCR文字识别', category: 'pdf-edit', requireMember: true, freeTrialCount: 2, enabled: true },

  // ========== PDF安全功能 (4个) ==========
  { featureId: 'pdf-signature', featureName: 'PDF签名', category: 'pdf-security', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-redact', featureName: 'PDF密文标记', category: 'pdf-security', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-compare', featureName: 'PDF比较', category: 'pdf-security', requireMember: true, freeTrialCount: 2, enabled: true },

  // ========== 视频工具 (2个) ==========
  { featureId: 'screen-record', featureName: '在线录屏', category: 'video', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'video-to-gif', featureName: '视频转GIF', category: 'video', requireMember: false, freeTrialCount: 5, enabled: true },

  // ========== 实用工具 (2个) ==========
  { featureId: 'qrcode-generator', featureName: '二维码生成', category: 'utils', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'base64-converter', featureName: 'Base64转换', category: 'utils', requireMember: false, freeTrialCount: 0, enabled: true },
];

async function seedFeaturePermissions() {
  console.log('Starting feature permissions seeding...\n');
  console.log(`Total permissions to seed: ${featurePermissions.length}\n`);

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.\n');

    let created = 0;
    let updated = 0;

    for (const permission of featurePermissions) {
      const [instance, wasCreated] = await FeaturePermission.findOrCreate({
        where: { featureId: permission.featureId },
        defaults: permission,
      });

      if (wasCreated) {
        console.log(`  ✓ Created: ${permission.featureId} - ${permission.featureName}`);
        created++;
      } else {
        // Update existing record
        await instance.update(permission);
        console.log(`  ↻ Updated: ${permission.featureId} - ${permission.featureName}`);
        updated++;
      }
    }

    console.log(`\n========================================`);
    console.log(`Feature permissions seeding completed!`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Total: ${featurePermissions.length}`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error('Seeding failed:', error.message);
    if (error.original) {
      console.error('Database error:', error.original.message);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run seed
seedFeaturePermissions();
