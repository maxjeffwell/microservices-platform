import express from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '@platform/errors';
import { handleValidationErrors } from '@platform/middleware';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import PasswordReset from '../models/PasswordReset.js';
import { generateAccessToken, generateTokenPayload, verifyAccessToken } from '../utils/jwt.js';
import { sendPasswordResetEmail, sendEmailVerificationEmail, sendAccountLockedEmail } from '../utils/email.js';
import { createLogger } from '@platform/logger';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  TooManyRequestsError,
} from '@platform/errors';

const router = express.Router();
const logger = createLogger('auth-service:routes');

const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 15;

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

    // Generate email verification token and send email
    const verificationToken = await User.generateEmailVerificationToken(user.id);
    await sendEmailVerificationEmail(email, verificationToken);

    // Generate tokens
    const tokenPayload = generateTokenPayload(user);
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = await RefreshToken.create(user.id);

    logger.info('User signed up', { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: false,
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

    // Check if account is locked
    const lockStatus = await User.isAccountLocked(user.id);
    if (lockStatus.locked) {
      throw new TooManyRequestsError(
        `Account is locked. Try again in ${lockStatus.remainingMinutes} minutes.`
      );
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      // Record failed attempt
      const attemptResult = await User.recordFailedLoginAttempt(user.id);

      if (attemptResult.locked) {
        // Send account locked notification email
        await sendAccountLockedEmail(email, LOCKOUT_DURATION_MINUTES);
        throw new TooManyRequestsError(
          `Account locked due to too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
        );
      }

      throw new UnauthorizedError(
        `Invalid email or password. ${attemptResult.attemptsRemaining} attempts remaining.`
      );
    }

    // Reset failed attempts on successful login
    await User.resetFailedLoginAttempts(user.id);

    // Generate tokens
    const tokenPayload = generateTokenPayload(user);
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = await RefreshToken.create(user.id);

    // Get email verification status
    const emailVerified = await User.isEmailVerified(user.id);

    logger.info('User signed in', { userId: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        emailVerified,
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

// ==========================================
// Password Reset Routes
// ==========================================

/**
 * POST /auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      logger.info('Password reset requested for non-existent email', { email });
      res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
      return;
    }

    // Check rate limiting - max 3 requests per hour
    const recentRequests = await PasswordReset.getRecentRequestCount(user.id, 60);
    if (recentRequests >= 3) {
      logger.warn('Too many password reset requests', { userId: user.id, email });
      res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
      return;
    }

    // Create password reset token
    const resetToken = await PasswordReset.create(user.id);

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken.token);

    logger.info('Password reset email sent', { userId: user.id, email });

    res.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  })
);

/**
 * POST /auth/reset-password
 * Reset password using token
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    // Validate token
    const validation = await PasswordReset.validateToken(token);
    if (!validation.valid) {
      throw new BadRequestError(validation.reason);
    }

    // Update password
    await User.updatePassword(validation.userId, password);

    // Mark token as used
    await PasswordReset.markAsUsed(token);

    // Revoke all refresh tokens for security
    await RefreshToken.revokeAllForUser(validation.userId);

    // Reset any failed login attempts
    await User.resetFailedLoginAttempts(validation.userId);

    logger.info('Password reset successfully', { userId: validation.userId });

    res.json({
      message: 'Password has been reset successfully. Please sign in with your new password.',
    });
  })
);

/**
 * POST /auth/validate-reset-token
 * Validate a password reset token (for frontend validation before showing form)
 */
router.post(
  '/validate-reset-token',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const validation = await PasswordReset.validateToken(token);

    res.json({
      valid: validation.valid,
      reason: validation.valid ? undefined : validation.reason,
    });
  })
);

// ==========================================
// Email Verification Routes
// ==========================================

/**
 * POST /auth/verify-email
 * Verify email address using token
 */
router.post(
  '/verify-email',
  [
    body('token').notEmpty().withMessage('Verification token is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const result = await User.verifyEmail(token);

    if (!result.success) {
      throw new BadRequestError(result.reason);
    }

    logger.info('Email verified', { userId: result.userId, email: result.email });

    res.json({
      message: 'Email verified successfully.',
      email: result.email,
    });
  })
);

/**
 * POST /auth/resend-verification
 * Resend email verification email
 */
router.post(
  '/resend-verification',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Find user
    const user = await User.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({
        message: 'If an account exists with this email, a verification link has been sent.',
      });
      return;
    }

    // Check if already verified
    const isVerified = await User.isEmailVerified(user.id);
    if (isVerified) {
      res.json({
        message: 'Email is already verified.',
        alreadyVerified: true,
      });
      return;
    }

    // Generate new verification token and send email
    const verificationToken = await User.generateEmailVerificationToken(user.id);
    await sendEmailVerificationEmail(email, verificationToken);

    logger.info('Verification email resent', { userId: user.id, email });

    res.json({
      message: 'If an account exists with this email, a verification link has been sent.',
    });
  })
);

/**
 * GET /auth/verification-status
 * Check email verification status (requires valid access token)
 */
router.post(
  '/verification-status',
  [
    body('token').notEmpty().withMessage('Access token is required'),
    handleValidationErrors,
  ],
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    // Verify access token
    const decoded = verifyAccessToken(token);

    // Get verification status
    const isVerified = await User.isEmailVerified(decoded.userId);

    res.json({
      emailVerified: isVerified,
    });
  })
);

export default router;
