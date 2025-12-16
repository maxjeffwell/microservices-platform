import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { asyncHandler } from '@platform/errors';
import { UserProfile, AppPermissions } from '../models/index.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/v1/profiles/:authUserId/permissions - Get all app permissions
router.get(
  '/:authUserId/permissions',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId } = req.params;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const permissions = await AppPermissions.findAllByProfile(profile.id);

    res.json({
      success: true,
      data: permissions
    });
  })
);

// GET /api/v1/profiles/:authUserId/permissions/:appName - Get app permissions
router.get(
  '/:authUserId/permissions/:appName',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    param('appName').notEmpty().withMessage('App name is required'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId, appName } = req.params;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const permissions = await AppPermissions.findByProfileAndApp(profile.id, appName);

    res.json({
      success: true,
      data: permissions
    });
  })
);

// PUT /api/v1/profiles/:authUserId/permissions/:appName - Update app permissions
router.put(
  '/:authUserId/permissions/:appName',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    param('appName').notEmpty().withMessage('App name is required'),
    body('permissions')
      .isArray()
      .withMessage('Permissions must be an array'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId, appName } = req.params;
    const { permissions } = req.body;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const updated = await AppPermissions.upsert(profile.id, appName, permissions);

    res.json({
      success: true,
      data: updated
    });
  })
);

// DELETE /api/v1/profiles/:authUserId/permissions/:appName - Delete app permissions
router.delete(
  '/:authUserId/permissions/:appName',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    param('appName').notEmpty().withMessage('App name is required'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId, appName } = req.params;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    await AppPermissions.delete(profile.id, appName);

    res.json({
      success: true,
      message: 'Permissions deleted successfully'
    });
  })
);

export default router;
