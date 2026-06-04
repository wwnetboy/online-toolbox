/**
 * Site Settings Routes
 * @route /api/settings
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Public route - get settings (for frontend display)
router.get('/', settingsController.getAllSettings);
router.get('/:key', settingsController.getSettingByKey);

// Protected routes - require admin role
router.put('/', authenticate, authorize(['super_admin', 'admin']), settingsController.updateAllSettings);
router.put('/:key', authenticate, authorize(['super_admin', 'admin']), settingsController.updateSettingByKey);
router.post('/reset', authenticate, authorize(['super_admin']), settingsController.resetToDefault);

module.exports = router;
