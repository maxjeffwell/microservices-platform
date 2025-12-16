import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/database.js';
import { createLogger } from '@platform/logger';

const logger = createLogger('auth-service:user-model');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 15;
const EMAIL_VERIFICATION_EXPIRY_HOURS = parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_HOURS) || 24;

class User {
  /**
   * Create a new user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>}
   */
  static async create(email, password) {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const result = await query(
        'INSERT INTO auth_users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email.toLowerCase(), passwordHash]
      );

      logger.info('User created', { userId: result.rows[0].id, email });
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      logger.error('Error creating user', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  static async findByEmail(email) {
    try {
      const result = await query(
        'SELECT id, email, password_hash, created_at, updated_at FROM auth_users WHERE email = $1',
        [email.toLowerCase()]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  static async findById(userId) {
    try {
      const result = await query(
        'SELECT id, email, created_at, updated_at FROM auth_users WHERE id = $1',
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Verify password
   * @param {string} password
   * @param {string} passwordHash
   * @returns {Promise<boolean>}
   */
  static async verifyPassword(password, passwordHash) {
    try {
      return await bcrypt.compare(password, passwordHash);
    } catch (error) {
      logger.error('Error verifying password', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user password
   * @param {string} userId
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  static async updatePassword(userId, newPassword) {
    try {
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await query(
        'UPDATE auth_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, userId]
      );

      logger.info('User password updated', { userId });
    } catch (error) {
      logger.error('Error updating password', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Delete user
   * @param {string} userId
   * @returns {Promise<void>}
   */
  static async delete(userId) {
    try {
      await query('DELETE FROM auth_users WHERE id = $1', [userId]);
      logger.info('User deleted', { userId });
    } catch (error) {
      logger.error('Error deleting user', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user count
   * @returns {Promise<number>}
   */
  static async count() {
    try {
      const result = await query('SELECT COUNT(*) as count FROM auth_users');
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting auth_users', { error: error.message });
      throw error;
    }
  }

  // ==========================================
  // Email Verification Methods
  // ==========================================

  /**
   * Generate email verification token
   * @param {string} userId
   * @returns {Promise<string>} - The verification token
   */
  static async generateEmailVerificationToken(userId) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

      await query(
        `UPDATE auth_users
         SET email_verification_token = $1,
             email_verification_expires = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [token, expiresAt, userId]
      );

      logger.info('Email verification token generated', { userId, expiresAt });
      return token;
    } catch (error) {
      logger.error('Error generating email verification token', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Verify email with token
   * @param {string} token
   * @returns {Promise<object>} - { success: boolean, reason?: string, userId?: string }
   */
  static async verifyEmail(token) {
    try {
      const result = await query(
        `SELECT id, email, email_verified, email_verification_expires
         FROM auth_users
         WHERE email_verification_token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return { success: false, reason: 'Invalid verification token' };
      }

      const user = result.rows[0];

      if (user.email_verified) {
        return { success: false, reason: 'Email already verified' };
      }

      if (new Date(user.email_verification_expires) < new Date()) {
        return { success: false, reason: 'Verification token has expired' };
      }

      // Mark email as verified and clear token
      await query(
        `UPDATE auth_users
         SET email_verified = TRUE,
             email_verification_token = NULL,
             email_verification_expires = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [user.id]
      );

      logger.info('Email verified successfully', { userId: user.id, email: user.email });
      return { success: true, userId: user.id, email: user.email };
    } catch (error) {
      logger.error('Error verifying email', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if user's email is verified
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  static async isEmailVerified(userId) {
    try {
      const result = await query(
        'SELECT email_verified FROM auth_users WHERE id = $1',
        [userId]
      );

      return result.rows[0]?.email_verified ?? false;
    } catch (error) {
      logger.error('Error checking email verification', { error: error.message, userId });
      throw error;
    }
  }

  // ==========================================
  // Account Lockout Methods
  // ==========================================

  /**
   * Check if account is locked
   * @param {string} userId
   * @returns {Promise<object>} - { locked: boolean, lockedUntil?: Date, remainingMinutes?: number }
   */
  static async isAccountLocked(userId) {
    try {
      const result = await query(
        'SELECT locked_until FROM auth_users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0] || !result.rows[0].locked_until) {
        return { locked: false };
      }

      const lockedUntil = new Date(result.rows[0].locked_until);
      const now = new Date();

      if (lockedUntil > now) {
        const remainingMinutes = Math.ceil((lockedUntil - now) / (1000 * 60));
        return { locked: true, lockedUntil, remainingMinutes };
      }

      return { locked: false };
    } catch (error) {
      logger.error('Error checking account lock status', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Record failed login attempt
   * @param {string} userId
   * @returns {Promise<object>} - { locked: boolean, attemptsRemaining?: number, lockedUntil?: Date }
   */
  static async recordFailedLoginAttempt(userId) {
    try {
      // Increment failed attempts
      const result = await query(
        `UPDATE auth_users
         SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING failed_login_attempts`,
        [userId]
      );

      const attempts = result.rows[0].failed_login_attempts;

      // Lock account if max attempts exceeded
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);

        await query(
          `UPDATE auth_users
           SET locked_until = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [lockedUntil, userId]
        );

        logger.warn('Account locked due to failed login attempts', { userId, lockedUntil });
        return { locked: true, lockedUntil };
      }

      const attemptsRemaining = MAX_LOGIN_ATTEMPTS - attempts;
      logger.info('Failed login attempt recorded', { userId, attempts, attemptsRemaining });
      return { locked: false, attemptsRemaining };
    } catch (error) {
      logger.error('Error recording failed login attempt', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Reset failed login attempts (call on successful login)
   * @param {string} userId
   * @returns {Promise<void>}
   */
  static async resetFailedLoginAttempts(userId) {
    try {
      await query(
        `UPDATE auth_users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
      );

      logger.debug('Failed login attempts reset', { userId });
    } catch (error) {
      logger.error('Error resetting failed login attempts', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Manually unlock an account (admin function)
   * @param {string} userId
   * @returns {Promise<void>}
   */
  static async unlockAccount(userId) {
    try {
      await query(
        `UPDATE auth_users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
      );

      logger.info('Account manually unlocked', { userId });
    } catch (error) {
      logger.error('Error unlocking account', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get full user info including verification and lockout status
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  static async getFullUserInfo(userId) {
    try {
      const result = await query(
        `SELECT id, email, email_verified, failed_login_attempts, locked_until, created_at, updated_at
         FROM auth_users
         WHERE id = $1`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting full user info', { error: error.message, userId });
      throw error;
    }
  }
}

export default User;
