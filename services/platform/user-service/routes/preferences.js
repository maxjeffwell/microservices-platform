import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { asyncHandler } from '@platform/errors';
import { UserProfile, UserPreferences } from '../models/index.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/v1/profiles/:authUserId/preferences - Get preferences
router.get(
  '/:authUserId/preferences',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId } = req.params;

    // Get profile to get profile ID
    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const preferences = await UserPreferences.findByProfileId(profile.id);

    res.json({
      success: true,
      data: preferences
    });
  })
);

// PUT /api/v1/profiles/:authUserId/preferences - Update preferences
router.put(
  '/:authUserId/preferences',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    body('theme')
      .optional()
      .isIn(['light', 'dark', 'auto'])
      .withMessage('Theme must be light, dark, or auto'),
    body('emailNotifications')
      .optional()
      .isBoolean()
      .withMessage('emailNotifications must be a boolean'),
    body('pushNotifications')
      .optional()
      .isBoolean()
      .withMessage('pushNotifications must be a boolean'),
    body('preferencesJson')
      .optional()
      .isObject()
      .withMessage('preferencesJson must be an object'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId } = req.params;
    const updates = {};

    // Map camelCase to snake_case
    if (req.body.theme !== undefined) updates.theme = req.body.theme;
    if (req.body.emailNotifications !== undefined) updates.email_notifications = req.body.emailNotifications;
    if (req.body.pushNotifications !== undefined) updates.push_notifications = req.body.pushNotifications;
    if (req.body.preferencesJson !== undefined) updates.preferences_json = req.body.preferencesJson;

    // Get profile to get profile ID
    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const preferences = await UserPreferences.update(profile.id, updates);

    res.json({
      success: true,
      data: preferences
    });
  })
);

export default router;
