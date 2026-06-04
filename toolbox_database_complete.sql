-- ============================================
-- 工具箱完整数据库初始化脚本
-- Toolbox Complete Database Initialization Script
-- ============================================
-- 说明：此文件合并了所有迁移脚本，用于生产环境部署
-- 使用方法：在服务器上执行此文件即可完成数据库初始化
-- ============================================

-- Set character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================
-- 第一部分：创建所有数据库表
-- ============================================

-- ============================================
-- 1. Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_name VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL,
  nick_name VARCHAR(50),
  phone VARCHAR(20),
  gender ENUM('male', 'female', 'unknown') DEFAULT 'unknown',
  avatar VARCHAR(255),
  status ENUM('active', 'inactive') DEFAULT 'active',
  address VARCHAR(255),
  intro TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  updated_by INT,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uk_user_name (user_name),
  UNIQUE KEY uk_email (email),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. Roles Table
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uk_role_code (role_code),
  INDEX idx_enabled (enabled),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. User-Role Association Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Menus Table
-- ============================================
CREATE TABLE IF NOT EXISTS menus (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_id INT DEFAULT NULL,
  path VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  component VARCHAR(255),
  redirect VARCHAR(255),
  icon VARCHAR(100),
  sort INT DEFAULT 0,
  hidden BOOLEAN DEFAULT FALSE,
  meta JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_parent_id (parent_id),
  INDEX idx_sort (sort),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_menus_parent FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Role-Menu Association Table
-- ============================================
CREATE TABLE IF NOT EXISTS role_menus (
  role_id INT NOT NULL,
  menu_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, menu_id),
  CONSTRAINT fk_role_menus_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_menus_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. Categories Table
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  identifier VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(100),
  sort INT DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uk_identifier (identifier),
  INDEX idx_sort (sort),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. Tools Table
-- ============================================
CREATE TABLE IF NOT EXISTS tools (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  icon_url VARCHAR(255) NULL,
  color VARCHAR(20),
  category_id INT,
  route VARCHAR(255) NOT NULL,
  badge ENUM('hot', 'new') NULL,
  enabled BOOLEAN DEFAULT TRUE,
  sort INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_category_id (category_id),
  INDEX idx_enabled (enabled),
  INDEX idx_sort (sort),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_tools_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. Feedbacks Table
-- ============================================
CREATE TABLE IF NOT EXISTS feedbacks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('suggestion', 'bug', 'other') NOT NULL,
  tool_id INT,
  content TEXT NOT NULL,
  contact VARCHAR(255),
  status ENUM('pending', 'processing', 'resolved') DEFAULT 'pending',
  reply TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at),
  CONSTRAINT fk_feedbacks_tool FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. Visits Table
-- ============================================
CREATE TABLE IF NOT EXISTS visits (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visitor_id VARCHAR(64) NOT NULL,
  page_path VARCHAR(255) NOT NULL,
  user_agent VARCHAR(500),
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_page_path (page_path),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. Clicks Table
-- ============================================
CREATE TABLE IF NOT EXISTS clicks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visitor_id VARCHAR(64) NOT NULL,
  element_id VARCHAR(100),
  page_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. Refresh Tokens Table
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token(255)),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. Operation Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(50),
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_operation_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 13. Site Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Add Foreign Key for User Audit Fields
-- ============================================
ALTER TABLE users
  ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- 第二部分：权限控制表
-- ============================================

-- ============================================
-- 14. Feature Permissions Table
-- ============================================
CREATE TABLE IF NOT EXISTS feature_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feature_id VARCHAR(50) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  require_member BOOLEAN DEFAULT FALSE,
  free_trial_count INT DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_feature_id (feature_id),
  INDEX idx_category (category),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 15. Usage Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS usage_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  visitor_id VARCHAR(64) NULL,
  feature_id VARCHAR(50) NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  INDEX idx_user_id (user_id),
  INDEX idx_visitor_id (visitor_id),
  INDEX idx_feature_id (feature_id),
  INDEX idx_used_at (used_at),
  INDEX idx_user_feature_date (user_id, feature_id, used_at),
  INDEX idx_visitor_feature_date (visitor_id, feature_id, used_at),
  CONSTRAINT fk_usage_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 16. Members Table
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  level ENUM('basic', 'pro', 'enterprise') DEFAULT 'basic',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date),
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 第三部分：添加 background_image 字段
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS background_image VARCHAR(255) NULL
COMMENT '用户背景图片URL';

-- ============================================
-- 第四部分：初始化权限数据
-- ============================================

-- Image tools (图片工具) - 7个
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('image-compress', '图片压缩', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-convert', '格式转换', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-crop', '图片裁剪', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-rotate', '图片旋转', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-resize', '尺寸调整', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-splice', '长图拼接', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-watermark', '图片水印', 'image', FALSE, 0, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- PDF basic operations (PDF基础操作) - 9个
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('pdf-merge', 'PDF合并', 'pdf-basic', FALSE, 0, TRUE, NOW(), NOW()),
('pdf-split', 'PDF拆分', 'pdf-basic', FALSE, 0, TRUE, NOW(), NOW()),
('pdf-compress', 'PDF压缩', 'pdf-basic', FALSE, 0, TRUE, NOW(), NOW()),
('pdf-extract', '页面提取', 'pdf-basic', FALSE, 0, TRUE, NOW(), NOW()),
('pdf-delete', '页面删除', 'pdf-basic', FALSE, 0, TRUE, NOW(), NOW()),
('pdf-rotate', '页面旋转', 'pdf-basic', FALSE, 0, TRUE, NOW(), NOW()),
('pdf-reorder', '页面重排', 'pdf-basic', FALSE, 0, TRUE, NOW(), NOW()),
('pdf-watermark', 'PDF水印', 'pdf-basic', FALSE, 0, TRUE, NOW(), NOW()),
('pdf-encrypt', 'PDF加密', 'pdf-basic', FALSE, 0, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- PDF format conversion (PDF格式转换) - 10个
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('pdf-from-image', '图片转PDF', 'pdf-convert', FALSE, 0, TRUE, NOW(), NOW()),
('pdf-to-image', 'PDF转图片', 'pdf-convert', FALSE, 5, TRUE, NOW(), NOW()),
('pdf-from-word', 'Word转PDF', 'pdf-convert', TRUE, 3, TRUE, NOW(), NOW()),
('pdf-to-word', 'PDF转Word', 'pdf-convert', TRUE, 3, TRUE, NOW(), NOW()),
('pdf-from-ppt', 'PPT转PDF', 'pdf-convert', TRUE, 3, TRUE, NOW(), NOW()),
('pdf-to-ppt', 'PDF转PPT', 'pdf-convert', TRUE, 3, TRUE, NOW(), NOW()),
('pdf-from-excel', 'Excel转PDF', 'pdf-convert', TRUE, 3, TRUE, NOW(), NOW()),
('pdf-to-excel', 'PDF转Excel', 'pdf-convert', TRUE, 3, TRUE, NOW(), NOW()),
('pdf-from-html', 'HTML转PDF', 'pdf-convert', TRUE, 3, TRUE, NOW(), NOW()),
('pdf-to-pdfa', 'PDF转PDF/A', 'pdf-convert', TRUE, 2, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- PDF advanced editing (PDF高级编辑) - 5个
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('pdf-page-number', '添加页码', 'pdf-edit', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-crop', '裁剪PDF', 'pdf-edit', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-edit', 'PDF编辑', 'pdf-edit', TRUE, 1, TRUE, NOW(), NOW()),
('pdf-repair', 'PDF修复', 'pdf-edit', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-ocr', 'OCR文字识别', 'pdf-edit', TRUE, 2, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- PDF security (PDF安全功能) - 4个
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('pdf-unlock', 'PDF解锁', 'pdf-security', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-signature', 'PDF签名', 'pdf-security', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-redact', 'PDF密文标记', 'pdf-security', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-compare', 'PDF比较', 'pdf-security', TRUE, 2, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Video tools (视频工具) - 2个
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('screen-record', '在线录屏', 'video', FALSE, 0, TRUE, NOW(), NOW()),
('video-to-gif', '视频转GIF', 'video', FALSE, 5, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Utility tools (实用工具) - 2个
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('qrcode-generator', '二维码生成', 'utils', FALSE, 0, TRUE, NOW(), NOW()),
('base64-converter', 'Base64转换', 'utils', FALSE, 0, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Clean up old/duplicate permissions
DELETE FROM feature_permissions WHERE feature_id = 'document-image-to-pdf';

-- ============================================
-- 数据库初始化完成
-- Database Initialization Complete
-- ============================================
