import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { asyncHandler } from '@platform/errors';
import { UserProfile, ProductMetadata } from '../models/index.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/v1/profiles/:authUserId/metadata - Get all product metadata
router.get(
  '/:authUserId/metadata',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId } = req.params;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const metadata = await ProductMetadata.findAllByProfile(profile.id);

    res.json({
      success: true,
      data: metadata
    });
  })
);

// GET /api/v1/profiles/:authUserId/metadata/:productName - Get product metadata
router.get(
  '/:authUserId/metadata/:productName',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    param('productName').notEmpty().withMessage('Product name is required'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId, productName } = req.params;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    const metadata = await ProductMetadata.findByProfileAndProduct(profile.id, productName);

    res.json({
      success: true,
      data: metadata
    });
  })
);

// PUT /api/v1/profiles/:authUserId/metadata/:productName - Update product metadata
router.put(
  '/:authUserId/metadata/:productName',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    param('productName').notEmpty().withMessage('Product name is required'),
    body('metadata')
      .isObject()
      .withMessage('Metadata must be an object'),
    body('merge')
      .optional()
      .isBoolean()
      .withMessage('Merge must be a boolean'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId, productName } = req.params;
    const { metadata, merge = false } = req.body;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));

    const updated = merge
      ? await ProductMetadata.merge(profile.id, productName, metadata)
      : await ProductMetadata.upsert(profile.id, productName, metadata);

    res.json({
      success: true,
      data: updated
    });
  })
);

// DELETE /api/v1/profiles/:authUserId/metadata/:productName - Delete product metadata
router.delete(
  '/:authUserId/metadata/:productName',
  [
    param('authUserId').isInt().withMessage('Auth user ID must be an integer'),
    param('productName').notEmpty().withMessage('Product name is required'),
    handleValidationErrors
  ],
  asyncHandler(async (req, res) => {
    const { authUserId, productName } = req.params;

    const profile = await UserProfile.findByAuthUserId(parseInt(authUserId));
    await ProductMetadata.delete(profile.id, productName);

    res.json({
      success: true,
      message: 'Product metadata deleted successfully'
    });
  })
);

export default router;
