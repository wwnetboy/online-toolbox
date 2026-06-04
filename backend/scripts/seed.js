/**
 * Database Seed Script
 * 
 * This script creates default data for the application:
 * - Default admin user
 * - Default roles
 * - Default menus
 * - Default categories (system categories)
 * - Default tools
 * 
 * Usage: node scripts/seed.js
 * 
 * ⚠️ 安全提示: 
 * - 生产环境部署前，请务必修改默认用户密码
 * - 建议通过环境变量配置初始管理员密码
 * - 首次登录后立即修改所有默认账户密码
 * 
 * Requirements: 7.6
 */

const bcrypt = require('bcryptjs');
const { sequelize } = require('../src/config/database');
const { User, Role, Menu, Category, Tool } = require('../src/models');

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Seed default roles
 */
async function seedRoles() {
  console.log('Seeding roles...');
  
  const roles = [
    {
      roleName: '超级管理员',
      roleCode: 'super_admin',
      description: '拥有系统所有权限',
      enabled: true,
    },
    {
      roleName: '管理员',
      roleCode: 'admin',
      description: '拥有大部分管理权限',
      enabled: true,
    },
    {
      roleName: '普通用户',
      roleCode: 'user',
      description: '普通用户权限',
      enabled: true,
    },
  ];

  for (const role of roles) {
    const [, created] = await Role.findOrCreate({
      where: { roleCode: role.roleCode },
      defaults: role,
    });
    
    if (created) {
      console.log(`  ✓ Created role: ${role.roleName}`);
    } else {
      console.log(`  - Role already exists: ${role.roleName}`);
    }
  }
}

/**
 * Seed default admin user
 * 
 * ⚠️ 重要安全提示:
 * - 默认密码仅用于开发环境初始化
 * - 生产环境部署前必须修改所有默认账户密码
 * - 建议使用环境变量 ADMIN_DEFAULT_PASSWORD 覆盖默认密码
 */
async function seedAdminUser() {
  console.log('Seeding admin users...');
  
  // 从环境变量获取默认密码，如未设置则使用开发环境默认值
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || '123456';
  
  const users = [
    {
      userName: 'Super',
      password: defaultPassword,
      email: 'super@toolbox.com',
      nickName: '超级管理员',
      roleCode: 'super_admin',
    },
    {
      userName: 'Admin',
      password: defaultPassword,
      email: 'admin@toolbox.com',
      nickName: '管理员',
      roleCode: 'admin',
    },
    {
      userName: 'User',
      password: defaultPassword,
      email: 'user@toolbox.com',
      nickName: '普通用户',
      roleCode: 'user',
    },
  ];

  for (const userData of users) {
    const hashedPassword = await hashPassword(userData.password);
    
    const [user, created] = await User.findOrCreate({
      where: { userName: userData.userName },
      defaults: {
        userName: userData.userName,
        password: hashedPassword,
        email: userData.email,
        nickName: userData.nickName,
        gender: 'unknown',
        status: 'active',
      },
    });

    if (created) {
      // 不输出具体用户名，避免泄露账户信息
      console.log(`  ✓ Created user account`);
      
      // Assign role to user
      const role = await Role.findOne({ where: { roleCode: userData.roleCode } });
      if (role) {
        await user.addRole(role);
        console.log(`  ✓ Assigned role to user`);
      }
    } else {
      console.log(`  - User account already exists`);
    }
  }
}


/**
 * Seed default menus
 */
async function seedMenus() {
  console.log('Seeding menus...');
  
  // Top-level menus
  const topMenus = [
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: 'Layout',
      redirect: '/dashboard/console',
      icon: 'ri:dashboard-line',
      sort: 1,
      hidden: false,
      meta: JSON.stringify({ title: '仪表盘', icon: 'ri:dashboard-line' }),
    },
    {
      path: '/toolbox',
      name: 'Toolbox',
      component: 'Layout',
      redirect: '/toolbox/index',
      icon: 'ri:tools-line',
      sort: 2,
      hidden: false,
      meta: JSON.stringify({ title: '工具箱', icon: 'ri:tools-line' }),
    },
    {
      path: '/system',
      name: 'System',
      component: 'Layout',
      redirect: '/system/user',
      icon: 'ri:settings-3-line',
      sort: 3,
      hidden: false,
      meta: JSON.stringify({ title: '系统管理', icon: 'ri:settings-3-line' }),
    },
    {
      path: '/admin',
      name: 'Admin',
      component: 'Layout',
      redirect: '/admin/overview',
      icon: 'ri:admin-line',
      sort: 4,
      hidden: false,
      meta: JSON.stringify({ title: '管理后台', icon: 'ri:admin-line' }),
    },
  ];

  const createdTopMenus = {};
  
  for (const menu of topMenus) {
    const [, created] = await Menu.findOrCreate({
      where: { path: menu.path, parentId: null },
      defaults: menu,
    });
    createdTopMenus[menu.name] = await Menu.findOne({ where: { path: menu.path, parentId: null } });
    
    if (created) {
      console.log(`  ✓ Created menu: ${menu.name}`);
    } else {
      console.log(`  - Menu already exists: ${menu.name}`);
    }
  }

  // Child menus
  const childMenus = [
    // Dashboard children
    {
      parentName: 'Dashboard',
      path: '/dashboard/console',
      name: 'Console',
      component: '/dashboard/console/index',
      icon: 'ri:computer-line',
      sort: 1,
      meta: JSON.stringify({ title: '控制台', icon: 'ri:computer-line' }),
    },
    {
      parentName: 'Dashboard',
      path: '/dashboard/analysis',
      name: 'Analysis',
      component: '/dashboard/analysis/index',
      icon: 'ri:line-chart-line',
      sort: 2,
      meta: JSON.stringify({ title: '分析页', icon: 'ri:line-chart-line' }),
    },
    // Toolbox children
    {
      parentName: 'Toolbox',
      path: '/toolbox/index',
      name: 'ToolboxIndex',
      component: '/toolbox/index/index',
      icon: 'ri:apps-line',
      sort: 1,
      meta: JSON.stringify({ title: '工具首页', icon: 'ri:apps-line' }),
    },
    // System children
    {
      parentName: 'System',
      path: '/system/user',
      name: 'UserManage',
      component: '/system/user/index',
      icon: 'ri:user-line',
      sort: 1,
      meta: JSON.stringify({ title: '用户管理', icon: 'ri:user-line' }),
    },
    {
      parentName: 'System',
      path: '/system/role',
      name: 'RoleManage',
      component: '/system/role/index',
      icon: 'ri:shield-user-line',
      sort: 2,
      meta: JSON.stringify({ title: '角色管理', icon: 'ri:shield-user-line' }),
    },
    {
      parentName: 'System',
      path: '/system/menu',
      name: 'MenuManage',
      component: '/system/menu/index',
      icon: 'ri:menu-line',
      sort: 3,
      meta: JSON.stringify({ title: '菜单管理', icon: 'ri:menu-line' }),
    },
    {
      parentName: 'System',
      path: '/system/tool-manage',
      name: 'ToolManage',
      component: '/system/tool-manage/index',
      icon: 'ri:tools-fill',
      sort: 4,
      meta: JSON.stringify({ title: '工具管理', icon: 'ri:tools-fill' }),
    },
    {
      parentName: 'System',
      path: '/system/feedback',
      name: 'FeedbackManage',
      component: '/system/feedback/index',
      icon: 'ri:feedback-line',
      sort: 5,
      meta: JSON.stringify({ title: '反馈管理', icon: 'ri:feedback-line' }),
    },
    // Admin children
    {
      parentName: 'Admin',
      path: '/admin/overview',
      name: 'AdminOverview',
      component: '/admin/overview/index',
      icon: 'ri:dashboard-2-line',
      sort: 1,
      meta: JSON.stringify({ title: '概览', icon: 'ri:dashboard-2-line' }),
    },
    {
      parentName: 'Admin',
      path: '/admin/category-manage',
      name: 'CategoryManage',
      component: '/admin/category-manage/index',
      icon: 'ri:folder-line',
      sort: 2,
      meta: JSON.stringify({ title: '分类管理', icon: 'ri:folder-line' }),
    },
    {
      parentName: 'Admin',
      path: '/admin/settings',
      name: 'AdminSettings',
      component: '/admin/settings/index',
      icon: 'ri:settings-line',
      sort: 3,
      meta: JSON.stringify({ title: '系统设置', icon: 'ri:settings-line' }),
    },
  ];

  for (const menu of childMenus) {
    const parent = createdTopMenus[menu.parentName];
    if (!parent) continue;

    const { parentName, ...menuData } = menu;
    menuData.parentId = parent.id;

    const [, created] = await Menu.findOrCreate({
      where: { path: menuData.path, parentId: parent.id },
      defaults: menuData,
    });
    
    if (created) {
      console.log(`  ✓ Created child menu: ${menu.name}`);
    } else {
      console.log(`  - Child menu already exists: ${menu.name}`);
    }
  }

  // Assign all menus to super_admin role
  const superAdminRole = await Role.findOne({ where: { roleCode: 'super_admin' } });
  if (superAdminRole) {
    const allMenus = await Menu.findAll();
    await superAdminRole.setMenus(allMenus);
    console.log('  ✓ Assigned all menus to super_admin role');
  }
}


/**
 * Seed default categories (system categories)
 * Requirement: 7.6 - System categories cannot be deleted
 */
async function seedCategories() {
  console.log('Seeding categories...');
  
  const categories = [
    {
      identifier: 'image',
      name: '图片处理',
      icon: 'ri:image-line',
      sort: 1,
      enabled: true,
      isSystem: true,
    },
    {
      identifier: 'pdf',
      name: 'PDF工具',
      icon: 'ri:file-pdf-line',
      sort: 2,
      enabled: true,
      isSystem: true,
    },
    {
      identifier: 'document',
      name: '文档工具',
      icon: 'ri:file-text-line',
      sort: 3,
      enabled: true,
      isSystem: true,
    },
    {
      identifier: 'video',
      name: '视频工具',
      icon: 'ri:video-line',
      sort: 4,
      enabled: true,
      isSystem: true,
    },
    {
      identifier: 'utils',
      name: '实用工具',
      icon: 'ri:tools-line',
      sort: 5,
      enabled: true,
      isSystem: true,
    },
  ];

  for (const category of categories) {
    const [instance, created] = await Category.findOrCreate({
      where: { identifier: category.identifier },
      defaults: category,
    });
    
    if (created) {
      console.log(`  ✓ Created category: ${category.name}`);
    } else {
      // Update isSystem flag if category exists but isn't marked as system
      if (!instance.isSystem) {
        await instance.update({ isSystem: true });
        console.log(`  ✓ Updated category to system: ${category.name}`);
      } else {
        console.log(`  - Category already exists: ${category.name}`);
      }
    }
  }
}

/**
 * Seed default tools
 */
async function seedTools() {
  console.log('Seeding tools...');
  
  // Get category IDs
  const categories = await Category.findAll();
  const categoryMap = {};
  categories.forEach(c => {
    categoryMap[c.identifier] = c.id;
  });

  const tools = [
    // ========== 图片工具 ==========
    {
      name: '图片压缩',
      description: '压缩图片文件大小，支持JPG、PNG、WEBP等格式',
      icon: 'ri:file-reduce-fill',
      color: '#ff6b6b',
      categoryId: categoryMap['image'],
      route: '/toolbox-image/compress',
      badge: 'hot',
      enabled: true,
      sort: 1,
    },
    {
      name: '格式转换',
      description: '转换图片格式（JPG/PNG/WEBP/GIF等）',
      icon: 'ri:arrow-left-right-fill',
      color: '#4ecdc4',
      categoryId: categoryMap['image'],
      route: '/toolbox-image/convert',
      enabled: true,
      sort: 2,
    },
    {
      name: '图片裁剪',
      description: '裁剪图片到指定尺寸，支持证件照裁剪',
      icon: 'ri:crop-fill',
      color: '#95e1d3',
      categoryId: categoryMap['image'],
      route: '/toolbox-image/crop',
      enabled: true,
      sort: 3,
    },
    {
      name: '图片旋转',
      description: '旋转或翻转图片，支持90度、180度旋转',
      icon: 'ri:clockwise-fill',
      color: '#f38181',
      categoryId: categoryMap['image'],
      route: '/toolbox-image/rotate',
      enabled: true,
      sort: 4,
    },
    {
      name: '尺寸调整',
      description: '调整图片宽度和高度，支持等比缩放',
      icon: 'ri:aspect-ratio-fill',
      color: '#aa96da',
      categoryId: categoryMap['image'],
      route: '/toolbox-image/resize',
      enabled: true,
      sort: 5,
    },
    {
      name: '长图拼接',
      description: '将多张图片拼接成长图，适合截图拼接',
      icon: 'ri:merge-cells-vertical',
      color: '#fcbad3',
      categoryId: categoryMap['image'],
      route: '/toolbox-image/splice',
      enabled: true,
      sort: 6,
    },
    {
      name: '图片水印',
      description: '为图片添加文字或图片水印，保护版权',
      icon: 'ri:copyright-fill',
      color: '#5c9eff',
      categoryId: categoryMap['image'],
      route: '/toolbox-image/watermark',
      enabled: true,
      sort: 7,
    },
    {
      name: '图片去水印',
      description: '智能去除图片中的水印，基于 WebGPU 技术',
      icon: 'ri:eraser-fill',
      color: '#74b9ff',
      categoryId: categoryMap['image'],
      route: '/toolbox-image/remove-watermark',
      badge: 'hot',
      enabled: true,
      sort: 8,
    },

    // ========== PDF工具 ==========
    {
      name: 'PDF合并',
      description: '将多个PDF文件合并为一个文件',
      icon: 'ri:file-add-fill',
      color: '#e74c3c',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/merge',
      badge: 'hot',
      enabled: true,
      sort: 9,
    },
    {
      name: 'PDF拆分',
      description: '将PDF文件拆分成多个部分',
      icon: 'ri:scissors-2-fill',
      color: '#3498db',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/split',
      enabled: true,
      sort: 10,
    },
    {
      name: 'PDF压缩',
      description: '压缩PDF文件大小，方便传输和存储',
      icon: 'ri:file-zip-fill',
      color: '#2ecc71',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/compress',
      enabled: true,
      sort: 11,
    },
    {
      name: '页面提取',
      description: '从PDF中提取指定页面',
      icon: 'ri:file-download-fill',
      color: '#f39c12',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/extract',
      enabled: true,
      sort: 12,
    },
    {
      name: '页面删除',
      description: '删除PDF中不需要的页面',
      icon: 'ri:file-forbid-fill',
      color: '#e67e22',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/delete',
      enabled: true,
      sort: 13,
    },
    {
      name: '页面旋转',
      description: '旋转PDF页面方向',
      icon: 'ri:rotate-lock-fill',
      color: '#16a085',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/rotate',
      enabled: true,
      sort: 14,
    },
    {
      name: '页面重排',
      description: '调整PDF页面顺序',
      icon: 'ri:order-play-fill',
      color: '#27ae60',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/reorder',
      enabled: true,
      sort: 15,
    },
    {
      name: 'PDF水印',
      description: '为PDF添加文字或图片水印',
      icon: 'ri:mark-pen-fill',
      color: '#2980b9',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/watermark',
      enabled: true,
      sort: 16,
    },
    {
      name: 'PDF加密',
      description: '为PDF设置密码保护',
      icon: 'ri:shield-keyhole-fill',
      color: '#8e44ad',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/encrypt',
      enabled: true,
      sort: 17,
    },
    // ========== PDF格式转换 ==========
    {
      name: '图片转PDF',
      description: '将多张图片合并转换为PDF文档',
      icon: 'ri:gallery-fill',
      color: '#9b59b6',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/image-to-pdf',
      enabled: true,
      sort: 18,
    },
    {
      name: 'PDF转图片',
      description: '将PDF页面转换为JPG/PNG图片',
      icon: 'ri:image-2-fill',
      color: '#1abc9c',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/pdf-to-image',
      enabled: true,
      sort: 19,
    },
    {
      name: 'Word转PDF',
      description: '将Word文档转换为PDF格式',
      icon: 'ri:file-word-2-fill',
      color: '#2b5797',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/word-to-pdf',
      enabled: true,
      sort: 20,
    },
    {
      name: 'PDF转Word',
      description: '将PDF文档转换为可编辑的Word格式',
      icon: 'ri:file-word-fill',
      color: '#2b5797',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/pdf-to-word',
      enabled: true,
      sort: 21,
    },
    {
      name: 'PPT转PDF',
      description: '将PowerPoint演示文稿转换为PDF格式',
      icon: 'ri:file-ppt-2-fill',
      color: '#d24726',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/ppt-to-pdf',
      enabled: true,
      sort: 22,
    },
    {
      name: 'PDF转PPT',
      description: '将PDF文档转换为PowerPoint格式',
      icon: 'ri:file-ppt-fill',
      color: '#d24726',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/pdf-to-ppt',
      enabled: true,
      sort: 23,
    },
    {
      name: 'Excel转PDF',
      description: '将Excel电子表格转换为PDF格式',
      icon: 'ri:file-excel-2-fill',
      color: '#217346',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/excel-to-pdf',
      enabled: true,
      sort: 24,
    },
    {
      name: 'PDF转Excel',
      description: '从PDF中提取表格数据到Excel',
      icon: 'ri:file-excel-fill',
      color: '#217346',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/pdf-to-excel',
      enabled: true,
      sort: 25,
    },
    {
      name: 'HTML转PDF',
      description: '将网页或HTML内容转换为PDF文档',
      icon: 'ri:html5-fill',
      color: '#e34c26',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/html-to-pdf',
      enabled: true,
      sort: 26,
    },
    {
      name: 'PDF转PDF/A',
      description: '将PDF转换为长期归档格式PDF/A',
      icon: 'ri:archive-drawer-fill',
      color: '#607d8b',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/pdf-to-pdfa',
      enabled: true,
      sort: 27,
    },
    // ========== PDF高级编辑 ==========
    {
      name: '添加页码',
      description: '为PDF文档添加页码，支持多种格式',
      icon: 'ri:list-ordered-2',
      color: '#795548',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/page-number',
      enabled: true,
      sort: 28,
    },
    {
      name: '裁剪PDF',
      description: '裁剪PDF页面，移除不需要的边距',
      icon: 'ri:crop-2-fill',
      color: '#ff9800',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/crop',
      enabled: true,
      sort: 29,
    },
    {
      name: 'PDF编辑',
      description: '直接编辑PDF内容，添加文字、图片和批注',
      icon: 'ri:edit-2-fill',
      color: '#673ab7',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/edit',
      enabled: true,
      sort: 30,
    },
    {
      name: 'PDF修复',
      description: '修复损坏的PDF文件，恢复文档内容',
      icon: 'ri:hammer-fill',
      color: '#009688',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/repair',
      enabled: true,
      sort: 31,
    },
    {
      name: 'OCR文字识别',
      description: '识别扫描版PDF中的文字，生成可搜索PDF',
      icon: 'ri:scan-2-fill',
      color: '#00bcd4',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/ocr',
      badge: 'new',
      enabled: true,
      sort: 32,
    },
    // ========== PDF安全功能 ==========
    {
      name: 'PDF签名',
      description: '为PDF添加电子签名，支持手写和图片签名',
      icon: 'ri:pen-nib-fill',
      color: '#3f51b5',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/signature',
      enabled: true,
      sort: 34,
    },
    {
      name: 'PDF密文标记',
      description: '永久移除PDF中的敏感信息',
      icon: 'ri:eye-off-fill',
      color: '#f44336',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/redact',
      enabled: true,
      sort: 35,
    },
    {
      name: 'PDF比较',
      description: '比较两个PDF文档，高亮显示差异',
      icon: 'ri:git-merge-fill',
      color: '#ff5722',
      categoryId: categoryMap['pdf'],
      route: '/toolbox-pdf/compare',
      enabled: true,
      sort: 36,
    },

    // ========== 视频工具 ==========
    {
      name: '在线录屏',
      description: '在浏览器中直接录制屏幕，快速制作演示视频',
      icon: 'ri:record-circle-fill',
      color: '#e74c3c',
      categoryId: categoryMap['video'],
      route: '/toolbox-video/screen-record',
      badge: 'new',
      enabled: true,
      sort: 37,
    },
    {
      name: '视频转GIF',
      description: '将视频片段转换为GIF动图',
      icon: 'ri:file-gif-fill',
      color: '#9b59b6',
      categoryId: categoryMap['video'],
      route: '/toolbox-video/video-to-gif',
      enabled: true,
      sort: 38,
    },

    // ========== 实用工具 ==========
    {
      name: '二维码生成',
      description: '生成各种内容的二维码，支持自定义样式和Logo',
      icon: 'ri:qr-code-fill',
      color: '#1abc9c',
      categoryId: categoryMap['utils'],
      route: '/toolbox-utils/qrcode',
      enabled: true,
      sort: 39,
    },
    {
      name: 'Base64转换',
      description: '图片与Base64编码互相转换，方便开发使用',
      icon: 'ri:code-box-fill',
      color: '#34495e',
      categoryId: categoryMap['utils'],
      route: '/toolbox-utils/base64',
      enabled: true,
      sort: 40,
    },
  ];

  for (const tool of tools) {
    const [instance, created] = await Tool.findOrCreate({
      where: { route: tool.route },
      defaults: tool,
    });
    
    if (created) {
      console.log(`  ✓ Created tool: ${tool.name}`);
    } else {
      // Update existing tool with new icon
      await instance.update({ icon: tool.icon });
      console.log(`  ✓ Updated tool icon: ${tool.name}`);
    }
  }
}


/**
 * Main seed function
 */
async function seed() {
  console.log('Starting database seeding...\n');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.\n');

    // Run seed functions in order
    await seedRoles();
    console.log('');
    
    await seedAdminUser();
    console.log('');
    
    await seedMenus();
    console.log('');
    
    await seedCategories();
    console.log('');
    
    await seedTools();
    console.log('');

    console.log('Database seeding completed successfully!');
    console.log('\n⚠️ 安全提示: 请在首次登录后立即修改默认账户密码！');
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
seed();
