/**
 * 批量更新数据库中的图片URL格式
 * 将 /api/uploads/ 改为 /uploads/
 */

const path = require('path');
const fs = require('fs');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Sequelize } = require('sequelize');

// 创建数据库连接
const sequelize = new Sequelize(
  process.env.DB_NAME || 'toolbox',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: console.log,
  }
);

async function updateImageUrls() {
  try {
    console.log('🔗 连接数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');

    // 更新工具图标 URL
    console.log('📝 更新工具图标 URL...');
    const [toolsResult] = await sequelize.query(`
      UPDATE tools 
      SET icon_url = REPLACE(icon_url, '/api/uploads/', '/uploads/') 
      WHERE icon_url LIKE '/api/uploads/%'
    `);
    console.log(`✅ 更新了 ${toolsResult.affectedRows} 条工具记录\n`);

    // 更新用户头像 URL
    console.log('📝 更新用户头像 URL...');
    const [avatarResult] = await sequelize.query(`
      UPDATE users 
      SET avatar = REPLACE(avatar, '/api/uploads/', '/uploads/') 
      WHERE avatar LIKE '/api/uploads/%'
    `);
    console.log(`✅ 更新了 ${avatarResult.affectedRows} 条用户头像记录\n`);

    // 更新用户背景图 URL
    console.log('📝 更新用户背景图 URL...');
    const [bgResult] = await sequelize.query(`
      UPDATE users 
      SET background_image = REPLACE(background_image, '/api/uploads/', '/uploads/') 
      WHERE background_image LIKE '/api/uploads/%'
    `);
    console.log(`✅ 更新了 ${bgResult.affectedRows} 条用户背景图记录\n`);

    // 查看更新结果
    console.log('📊 查看更新结果：\n');
    
    console.log('=== 工具图标（前10条）===');
    const [tools] = await sequelize.query(`
      SELECT id, name, icon_url 
      FROM tools 
      WHERE icon_url IS NOT NULL 
      ORDER BY id 
      LIMIT 10
    `);
    console.table(tools);

    console.log('\n=== 用户头像（前10条）===');
    const [users] = await sequelize.query(`
      SELECT id, user_name, avatar 
      FROM users 
      WHERE avatar IS NOT NULL 
      ORDER BY id 
      LIMIT 10
    `);
    console.table(users);

    console.log('\n=== 统计信息 ===');
    const [stats] = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM tools WHERE icon_url LIKE '/uploads/%') as tools_count,
        (SELECT COUNT(*) FROM users WHERE avatar LIKE '/uploads/%') as avatar_count,
        (SELECT COUNT(*) FROM users WHERE background_image LIKE '/uploads/%') as bg_count
    `);
    console.table(stats);

    console.log('\n✅ 数据库更新完成！');
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// 执行更新
updateImageUrls();
