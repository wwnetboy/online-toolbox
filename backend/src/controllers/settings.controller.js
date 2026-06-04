/**
 * Site Settings Controller
 * Handles HTTP requests for system settings
 */

const settingsService = require('../services/settings.service');
const { success, error, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Get all settings
 * @route GET /api/settings
 */
const getAllSettings = async (req, res) => {
  try {
    const settings = await settingsService.getAllSettings();
    return success(res, settings, '获取设置成功');
  } catch (err) {
    logger.error('Get settings error:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, '获取设置失败');
  }
};

/**
 * Get setting by key
 * @route GET /api/settings/:key
 */
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await settingsService.getSettingByKey(key);

    if (setting === null) {
      return error(res, ErrorCodes.NOT_FOUND, '设置项不存在');
    }

    return success(res, setting, '获取设置成功');
  } catch (err) {
    logger.error('Get setting by key error:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, '获取设置失败');
  }
};

/**
 * Update all settings
 * @route PUT /api/settings
 */
const updateAllSettings = async (req, res) => {
  try {
    const newSettings = req.body;
    const settings = await settingsService.updateAllSettings(newSettings);
    return success(res, settings, '保存设置成功');
  } catch (err) {
    logger.error('Update settings error:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, '保存设置失败');
  }
};

/**
 * Update setting by key
 * @route PUT /api/settings/:key
 */
const updateSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const value = req.body.value !== undefined ? req.body.value : req.body;

    const setting = await settingsService.updateSettingByKey(key, value);
    return success(res, setting, '保存设置成功');
  } catch (err) {
    logger.error('Update setting by key error:', err);
    if (err.message.includes('Invalid setting key')) {
      return error(res, ErrorCodes.BAD_REQUEST, err.message);
    }
    return error(res, ErrorCodes.INTERNAL_ERROR, '保存设置失败');
  }
};

/**
 * Reset settings to default
 * @route POST /api/settings/reset
 */
const resetToDefault = async (req, res) => {
  try {
    const settings = await settingsService.resetToDefault();
    return success(res, settings, '重置设置成功');
  } catch (err) {
    logger.error('Reset settings error:', err);
    return error(res, ErrorCodes.INTERNAL_ERROR, '重置设置失败');
  }
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  updateAllSettings,
  updateSettingByKey,
  resetToDefault
};
