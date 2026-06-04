-- ============================================
-- Toolbox Backend Database Migration Script
-- Version: 002
-- Description: Create permission control tables for PDF advanced tools
-- Requirements: 1.1, 1.5
-- ============================================

-- Set character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================
-- 1. Feature Permissions Table
-- Stores configuration for each feature's permission settings
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
  INDEX idx_feature_id (feature_id),
  INDEX idx_category (category),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. Usage Records Table
-- Tracks feature usage for rate limiting
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
-- 3. Members Table
-- Stores membership information
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

