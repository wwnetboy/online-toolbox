/**
 * Update Icons Script
 * 
 * This script updates the icon format in the database from short format to full format.
 * 
 * Usage: node scripts/update-icons.js
 */

const { sequelize } = require('../src/config/database');
const { Category, Tool } = require('../src/models');

// Icon mapping for categories
const categoryIconMap = {
  'image': 'ri:image-line',
  'pdf': 'ri:file-pdf-line',
  'document': 'ri:file-text-line',
  'video': 'ri:video-line',
  'utils': 'ri:tools-line',
};

// Icon mapping for tools (by name, since routes may vary)
const toolIconMapByName = {
  '图片压缩': 'ri:file-reduce-line',
  '格式转换': 'ri:exchange-line',
  '图片格式转换': 'ri:exchange-line',
  '图片裁剪': 'ri:crop-line',
  '图片旋转': 'ri:anticlockwise-line',
  '尺寸调整': 'ri:aspect-ratio-line',
  '长图拼接': 'ri:layout-row-line',
  '图片水印': 'ri:drop-line',
  'PDF合并': 'ri:merge-cells-horizontal',
  'PDF拆分': 'ri:scissors-cut-line',
  'PDF压缩': 'ri:file-reduce-line',
  '页面提取': 'ri:file-copy-line',
  '页面删除': 'ri:delete-bin-line',
  '页面旋转': 'ri:refresh-line',
  '页面重排': 'ri:sort-asc',
  'PDF水印': 'ri:drop-line',
  'PDF加密': 'ri:lock-line',
  '图片转PDF': 'ri:image-2-line',
  '在线录屏': 'ri:record-circle-line',
  '屏幕录制': 'ri:record-circle-line',
  '视频转GIF': 'ri:file-gif-line',
  '二维码生成': 'ri:qr-code-line',
  'Base64转换': 'ri:code-s-slash-line',
  'JSON格式化': 'ri:braces-line',
};

async function updateIcons() {
  console.log('Starting icon update...\n');

  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established.\n');

    // Update category icons
    console.log('Updating category icons...');
    const categories = await Category.findAll({ where: { deletedAt: null } });
    
    for (const category of categories) {
      const newIcon = categoryIconMap[category.identifier];
      if (newIcon) {
        await category.update({ icon: newIcon });
        console.log(`  ✓ Updated ${category.identifier}: -> ${newIcon}`);
      }
    }

    // Update tool icons
    console.log('\nUpdating tool icons...');
    const tools = await Tool.findAll({ where: { deletedAt: null } });
    
    for (const tool of tools) {
      const newIcon = toolIconMapByName[tool.name];
      if (newIcon) {
        await tool.update({ icon: newIcon });
        console.log(`  ✓ Updated ${tool.name}: -> ${newIcon}`);
      } else {
        console.log(`  - No mapping for: ${tool.name}`);
      }
    }

    console.log('\n✓ Icon update completed successfully!');
  } catch (error) {
    console.error('Update failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

updateIcons();
