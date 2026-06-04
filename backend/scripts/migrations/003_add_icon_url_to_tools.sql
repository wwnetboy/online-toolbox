-- ============================================
-- Toolbox Backend Database Migration Script
-- Version: 003
-- Description: Add icon_url field to tools table for custom icon uploads
-- Requirements: 3.1, 3.2
-- ============================================

-- Set character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================
-- Add icon_url column to tools table
-- This field stores the URL path of uploaded custom icons
-- The existing icon field is retained for backward compatibility with Iconify icons
-- ============================================
ALTER TABLE tools 
ADD COLUMN icon_url VARCHAR(255) NULL AFTER icon;

-- ============================================
-- Migration Complete
-- ============================================
