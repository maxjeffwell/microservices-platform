import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler } from '@platform/errors';
import { UserProfile } from '../models/index.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST /api/v1/profiles - Create profile (called by auth-service)
router.post(
  '/',
  [
    body('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    body('username')
      .optional()
      .isLength({ min: 3, max: 25 })
      .withMessage('Username must be 3-25 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('displayName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Display name must be max 100 characters'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId, username, displayName, email } = req.body;

    const profile = await UserProfile.create({
      authUserId,
      username,
      displayName,
      email
    });

    res.status(201).json({
      success: true,
      data: profile
    });
  })
);

// GET /api/v1/profiles/:authUserId - Get profile by auth user ID
router.get(
  '/:authUserId',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId } = req.params;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));

    res.json({
      success: true,
      data: profile
    });
  })
);

// GET /api/v1/profiles/username/:username - Get profile by username
router.get(
  '/username/:username',
  [
    param('username')
      .isLength({ min: 3, max: 25 })
      .withMessage('Username must be 3-25 characters'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { username } = req.params;

    const profile = await UserProfile.findByUsername(username);

    // Don't expose private profiles
    if (!profile.is_public) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  })
);

// PUT /api/v1/profiles/:authUserId - Update profile
router.put(
  '/:authUserId',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    body('username')
      .optional()
      .isLength({ min: 3, max: 25 })
      .withMessage('Username must be 3-25 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('displayName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Display name must be max 100 characters'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio must be max 500 characters'),
    body('avatarUrl')
      .optional()
      .isURL()
      .withMessage('Invalid avatar URL'),
    body('timezone')
      .optional()
      .isString()
      .withMessage('Timezone must be a string'),
    body('language')
      .optional()
      .isLength({ min: 2, max: 10 })
      .withMessage('Language code must be 2-10 characters'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId } = req.params;
    const updates = {};

    // Map camelCase to snake_case
    if (req.body.username !== undefined) updates.username = req.body.username;
    if (req.body.displayName !== undefined) updates.display_name = req.body.displayName;
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.body.avatarUrl !== undefined) updates.avatar_url = req.body.avatarUrl;
    if (req.body.timezone !== undefined) updates.timezone = req.body.timezone;
    if (req.body.language !== undefined) updates.language = req.body.language;
    if (req.body.isPublic !== undefined) updates.is_public = req.body.isPublic;

    const profile = await UserProfile.update(parseInt(authUserId), updates);

    res.json({
      success: true,
      data: profile
    });
  })
);

// DELETE /api/v1/profiles/:authUserId - Delete profile
router.delete(
  '/:authUserId',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId } = req.params;

    await UserProfile.delete(parseInt(authUserId));

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  })
);

// GET /api/v1/profiles/search - Search public profiles
router.get(
  '/search',
  [
    query('q').notEmpty().withMessage('Search query is required'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a positive integer'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { q, limit = 20, offset = 0 } = req.query;

    const profiles = await UserProfile.search(q, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: profiles,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: profiles.length
      }
    });
  })
);

// GET /api/v1/profiles - List public profiles
router.get(
  '/',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a positive integer'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { limit = 20, offset = 0 } = req.query;

    const profiles = await UserProfile.listPublic(parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: profiles,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: profiles.length
      }
    });
  })
);

export default router;
