import crypto from 'crypto';
import { query } from '../config/database.js';
import { createLogger } from '@platform/logger';

const logger = createLogger('auth-service:password-reset-model');

const TOKEN_EXPIRY_HOURS = parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS) || 1;

class PasswordReset {
  /**
   * Create a password reset token
   * @param {string} userId
   * @returns {Promise<object>}
   */
  static async create(userId) {
    try {
      // Invalidate any existing tokens for this user
      await this.invalidateForUser(userId);

      // Generate a secure random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

      const result = await query(
        `INSERT INTO auth_password_resets (user_id, token, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id, token, expires_at, created_at`,
        [userId, token, expiresAt]
      );

      logger.info('Password reset token created', { userId, expiresAt });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating password reset token', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Find password reset by token
   * @param {string} token
   * @returns {Promise<object|null>}
   */
  static async findByToken(token) {
    try {
      const result = await query(
        `SELECT pr.id, pr.user_id, pr.token, pr.expires_at, pr.used, pr.created_at,
                u.email
         FROM auth_password_resets pr
         JOIN auth_users u ON pr.user_id = u.id
         WHERE pr.token = $1`,
        [token]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding password reset by token', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate a password reset token
   * @param {string} token
   * @returns {Promise<object>} - Returns { valid: boolean, reason?: string, userId?: string }
   */
  static async validateToken(token) {
    try {
      const resetToken = await this.findByToken(token);

      if (!resetToken) {
        return { valid: false, reason: 'Token not found' };
      }

      if (resetToken.used) {
        return { valid: false, reason: 'Token has already been used' };
      }

      if (new Date(resetToken.expires_at) < new Date()) {
        return { valid: false, reason: 'Token has expired' };
      }

      return {
        valid: true,
        userId: resetToken.user_id,
        email: resetToken.email,
      };
    } catch (error) {
      logger.error('Error validating password reset token', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark token as used
   * @param {string} token
   * @returns {Promise<void>}
   */
  static async markAsUsed(token) {
    try {
      await query(
        'UPDATE auth_password_resets SET used = TRUE WHERE token = $1',
        [token]
      );

      logger.info('Password reset token marked as used', { token: token.substring(0, 8) + '...' });
    } catch (error) {
      logger.error('Error marking password reset token as used', { error: error.message });
      throw error;
    }
  }

  /**
   * Invalidate all tokens for a user
   * @param {string} userId
   * @returns {Promise<number>} - Number of invalidated tokens
   */
  static async invalidateForUser(userId) {
    try {
      const result = await query(
        'UPDATE auth_password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE',
        [userId]
      );

      if (result.rowCount > 0) {
        logger.info('Password reset tokens invalidated for user', { userId, count: result.rowCount });
      }

      return result.rowCount;
    } catch (error) {
      logger.error('Error invalidating password reset tokens', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Delete expired tokens
   * @returns {Promise<number>} - Number of deleted tokens
   */
  static async deleteExpired() {
    try {
      const result = await query(
        'DELETE FROM auth_password_resets WHERE expires_at < CURRENT_TIMESTAMP'
      );

      if (result.rowCount > 0) {
        logger.info('Expired password reset tokens deleted', { count: result.rowCount });
      }

      return result.rowCount;
    } catch (error) {
      logger.error('Error deleting expired password reset tokens', { error: error.message });
      throw error;
    }
  }

  /**
   * Get recent password reset requests for a user (for rate limiting)
   * @param {string} userId
   * @param {number} withinMinutes - Time window to check
   * @returns {Promise<number>}
   */
  static async getRecentRequestCount(userId, withinMinutes = 60) {
    try {
      const result = await query(
        `SELECT COUNT(*) as count
         FROM auth_password_resets
         WHERE user_id = $1
         AND created_at > NOW() - INTERVAL '${withinMinutes} minutes'`,
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting recent password reset count', { error: error.message, userId });
      throw error;
    }
  }
}

export default PasswordReset;
