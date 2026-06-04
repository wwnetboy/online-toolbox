-- ============================================
-- Feature Permissions Seed Data
-- Total: 40 permissions (matching 40 tools)
-- ============================================

-- ============================================
-- Image tools (图片工具) - 8个
-- ============================================
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('image-compress', '图片压缩', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-convert', '格式转换', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-crop', '图片裁剪', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-rotate', '图片旋转', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-resize', '尺寸调整', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-splice', '长图拼接', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-watermark', '图片水印', 'image', FALSE, 0, TRUE, NOW(), NOW()),
('image-remove-watermark', '图片去水印', 'image', FALSE, 0, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- PDF basic operations (PDF基础操作) - 9个
-- ============================================
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

-- ============================================
-- PDF format conversion (PDF格式转换) - 10个
-- ============================================
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

-- ============================================
-- PDF advanced editing (PDF高级编辑) - 5个
-- ============================================
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('pdf-page-number', '添加页码', 'pdf-edit', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-crop', '裁剪PDF', 'pdf-edit', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-edit', 'PDF编辑', 'pdf-edit', TRUE, 1, TRUE, NOW(), NOW()),
('pdf-repair', 'PDF修复', 'pdf-edit', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-ocr', 'OCR文字识别', 'pdf-edit', TRUE, 2, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- PDF security (PDF安全功能) - 4个
-- ============================================
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('pdf-signature', 'PDF签名', 'pdf-security', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-redact', 'PDF密文标记', 'pdf-security', TRUE, 2, TRUE, NOW(), NOW()),
('pdf-compare', 'PDF比较', 'pdf-security', TRUE, 2, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Video tools (视频工具) - 2个
-- ============================================
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('screen-record', '在线录屏', 'video', FALSE, 0, TRUE, NOW(), NOW()),
('video-to-gif', '视频转GIF', 'video', FALSE, 5, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Utility tools (实用工具) - 2个
-- ============================================
INSERT INTO feature_permissions (feature_id, feature_name, category, require_member, free_trial_count, enabled, created_at, updated_at) VALUES
('qrcode-generator', '二维码生成', 'utils', FALSE, 0, TRUE, NOW(), NOW()),
('base64-converter', 'Base64转换', 'utils', FALSE, 0, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Clean up old/duplicate permissions
-- ============================================
DELETE FROM feature_permissions WHERE feature_id = 'document-image-to-pdf';
