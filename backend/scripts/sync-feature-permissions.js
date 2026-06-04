/**
 * Sync Feature Permissions Script
 * 
 * This script synchronizes feature permissions with the 39 tools.
 * All tools are categorized into 4 groups:
 * - pdf-basic: PDF基础操作 + 图片工具
 * - pdf-convert: PDF格式转换
 * - pdf-edit: PDF高级编辑 + 视频工具 + 实用工具
 * - pdf-security: PDF安全功能
 * 
 * Usage: node scripts/sync-feature-permissions.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sequelize } = require('../src/config/database');
const { FeaturePermission } = require('../src/models');

const featurePermissions = [
  // ========== PDF基础操作 (9个 PDF + 7个图片 = 16个) ==========
  // PDF基础
  { featureId: 'pdf-merge', featureName: 'PDF合并', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-split', featureName: 'PDF拆分', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-compress', featureName: 'PDF压缩', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-extract', featureName: '页面提取', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-delete', featureName: '页面删除', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-rotate', featureName: '页面旋转', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-reorder', featureName: '页面重排', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-watermark', featureName: 'PDF水印', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'pdf-encrypt', featureName: 'PDF加密', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  // 图片工具归入基础操作
  { featureId: 'image-compress', featureName: '图片压缩', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-convert', featureName: '格式转换', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-crop', featureName: '图片裁剪', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-rotate', featureName: '图片旋转', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-resize', featureName: '尺寸调整', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-splice', featureName: '长图拼接', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'image-watermark', featureName: '图片水印', category: 'pdf-basic', requireMember: false, freeTrialCount: 0, enabled: true },

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

  // ========== PDF高级编辑 (5个 PDF + 2个视频 + 2个实用 = 9个) ==========
  // PDF高级编辑
  { featureId: 'pdf-page-number', featureName: '添加页码', category: 'pdf-edit', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-crop', featureName: '裁剪PDF', category: 'pdf-edit', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-edit', featureName: 'PDF编辑', category: 'pdf-edit', requireMember: true, freeTrialCount: 1, enabled: true },
  { featureId: 'pdf-repair', featureName: 'PDF修复', category: 'pdf-edit', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-ocr', featureName: 'OCR文字识别', category: 'pdf-edit', requireMember: true, freeTrialCount: 2, enabled: true },
  // 视频工具归入高级编辑
  { featureId: 'screen-record', featureName: '在线录屏', category: 'pdf-edit', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'video-to-gif', featureName: '视频转GIF', category: 'pdf-edit', requireMember: false, freeTrialCount: 5, enabled: true },
  // 实用工具归入高级编辑
  { featureId: 'qrcode-generator', featureName: '二维码生成', category: 'pdf-edit', requireMember: false, freeTrialCount: 0, enabled: true },
  { featureId: 'base64-converter', featureName: 'Base64转换', category: 'pdf-edit', requireMember: false, freeTrialCount: 0, enabled: true },

  // ========== PDF安全功能 (4个) ==========
  { featureId: 'pdf-unlock', featureName: 'PDF解锁', category: 'pdf-security', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-signature', featureName: 'PDF签名', category: 'pdf-security', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-redact', featureName: 'PDF密文标记', category: 'pdf-security', requireMember: true, freeTrialCount: 2, enabled: true },
  { featureId: 'pdf-compare', featureName: 'PDF比较', category: 'pdf-security', requireMember: true, freeTrialCount: 2, enabled: true },
];

// IDs to remove (obsolete)
const obsoleteIds = ['document-image-to-pdf', 'pdf-unlock'];

async function syncFeaturePermissions() {
  console.log('Syncing feature permissions...\n');
  console.log(`Target: ${featurePermissions.length} permissions\n`);

  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Remove obsolete permissions
    for (const id of obsoleteIds) {
      const deleted = await FeaturePermission.destroy({ where: { featureId: id } });
      if (deleted) {
        console.log(`  ✗ Removed obsolete: ${id}`);
      }
    }

    let created = 0;
    let updated = 0;

    // Sync permissions
    for (const permission of featurePermissions) {
      const [instance, wasCreated] = await FeaturePermission.findOrCreate({
        where: { featureId: permission.featureId },
        defaults: permission,
      });

      if (wasCreated) {
        console.log(`  ✓ Created: ${permission.featureId}`);
        created++;
      } else {
        await instance.update(permission);
        console.log(`  ↻ Updated: ${permission.featureId}`);
        updated++;
      }
    }

    // Count by category
    const categories = ['pdf-basic', 'pdf-convert', 'pdf-edit', 'pdf-security'];
    console.log('\n分组统计:');
    for (const cat of categories) {
      const count = featurePermissions.filter(p => p.category === cat).length;
      console.log(`  ${cat}: ${count} 个`);
    }

    // Count total in database
    const total = await FeaturePermission.count();

    console.log(`\n========================================`);
    console.log(`Sync completed!`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Total in DB: ${total}`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

syncFeaturePermissions();
