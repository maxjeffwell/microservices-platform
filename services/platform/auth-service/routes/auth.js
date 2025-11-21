import express from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '@platform/errors';
import { handleValidationErrors } from '@platform/middleware';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { generateAccessToken, generateTokenPayload, verifyAccessToken } from '../utils/jwt.js';
import { createLogger } from '@platform/logger';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from '@platform/errors';

const router = express.Router();
const logger = createLogger('auth-service:routes');

/**
 * POST /auth/signup
 * Register a new user
 */
router.post(
  '/signup',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create user
    const user = await User.create(email, password);

    // Generate tokens
    const tokenPayload = generateTokenPayload(user);
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = await RefreshToken.create(user.id);

    logger.info('User signed up', { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  })
);

/**
 * POST /auth/signin
 * Login user
 */
router.post(
  '/signin',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload = generateTokenPayload(user);
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = await RefreshToken.create(user.id);

    logger.info('User signed in', { userId: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
      },
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  })
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { refreshToken: tokenString } = req.body;

    // Find refresh token
    const refreshToken = await RefreshToken.findByToken(tokenString);
    if (!refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if revoked
    if (refreshToken.revoked) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    // Check if expired
    if (new Date(refreshToken.expires_at) < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Generate new access token
    const tokenPayload = {
      userId: refreshToken.user_id,
      email: refreshToken.email,
    };
    const accessToken = generateAccessToken(tokenPayload);

    logger.info('Access token refreshed', { userId: refreshToken.user_id });

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  })
);

/**
 * POST /auth/verify
 * Verify access token
 */
router.post(
  '/verify',
  [
    body('token').notEmpty().withMessage('Token is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user to ensure they still exist
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  })
);

/**
 * POST /auth/signout
 * Sign out user (revoke refresh token)
 */
router.post(
  '/signout',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    // Revoke refresh token
    await RefreshToken.revoke(refreshToken);

    logger.info('User signed out');

    res.json({
      message: 'Signed out successfully',
    });
  })
);

/**
 * POST /auth/signout-all
 * Sign out from all devices (revoke all refresh tokens)
 */
router.post(
  '/signout-all',
  [
    body('userId').isUUID().withMessage('Valid user ID is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { userId } = req.body;

    // Revoke all refresh tokens for user
    await RefreshToken.revokeAllForUser(userId);

    logger.info('User signed out from all devices', { userId });

    res.json({
      message: 'Signed out from all devices successfully',
    });
  })
);

export default router;
