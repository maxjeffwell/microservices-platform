import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { asyncHandler } from '@platform/errors';
import { UserProfile, SocialLinks } from '../models/index.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/v1/profiles/:authUserId/social-links - Get all social links
router.get(
  '/:authUserId/social-links',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId } = req.params;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const links = await SocialLinks.findByProfileId(profile.id);

    res.json({
      success: true,
      data: links
    });
  })
);

// POST /api/v1/profiles/:authUserId/social-links - Add social link
router.post(
  '/:authUserId/social-links',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    body('platform')
      .notEmpty()
      .withMessage('Platform is required')
      .isIn(['github', 'linkedin', 'twitter', 'facebook', 'instagram', 'website'])
      .withMessage('Invalid platform'),
    body('url')
      .notEmpty()
      .withMessage('URL is required')
      .isURL()
      .withMessage('Invalid URL'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId } = req.params;
    const { platform, url } = req.body;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const link = await SocialLinks.create(profile.id, platform, url);

    res.status(201).json({
      success: true,
      data: link
    });
  })
);

// PUT /api/v1/profiles/:authUserId/social-links/:id - Update social link
router.put(
  '/:authUserId/social-links/:id',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    param('id').isInt().withMessage('Link ID must be an integer'),
    body('url')
      .notEmpty()
      .withMessage('URL is required')
      .isURL()
      .withMessage('Invalid URL'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId, id } = req.params;
    const { url } = req.body;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const link = await SocialLinks.update(parseInt(id), profile.id, url);

    res.json({
      success: true,
      data: link
    });
  })
);

// DELETE /api/v1/profiles/:authUserId/social-links/:id - Delete social link
router.delete(
  '/:authUserId/social-links/:id',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    param('id').isInt().withMessage('Link ID must be an integer'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId, id } = req.params;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    await SocialLinks.delete(parseInt(id), profile.id);

    res.json({
      success: true,
      message: 'Social link deleted successfully'
    });
  })
);

export default router;
