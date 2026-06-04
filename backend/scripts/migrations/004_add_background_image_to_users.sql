-- Migration: Add background_image column to users table
-- Date: 2026-01-19
-- Description: Add background_image field to support user custom background images

-- Add background_image column to users table
ALTER TABLE users 
ADD COLUMN background_image VARCHAR(255) NULL 
COMMENT '用户背景图片URL';

-- Add index for better query performance (optional)
CREATE INDEX idx_users_background_image ON users(background_image);
