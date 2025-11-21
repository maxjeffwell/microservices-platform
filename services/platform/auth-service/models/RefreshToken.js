import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { createLogger } from '@platform/logger';

const logger = createLogger('auth-service:refresh-token-model');

class RefreshToken {
  /**
   * Create a refresh token
   * @param {string} userId
   * @param {number} expiresInDays - Days until expiration
   * @returns {Promise<object>}
   */
  static async create(userId, expiresInDays = 30) {
    try {
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const result = await query(
        'INSERT INTO auth_refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id, token, expires_at',
        [userId, token, expiresAt]
      );

      logger.info('Refresh token created', { userId, expiresAt });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating refresh token', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Find refresh token by token string
   * @param {string} token
   * @returns {Promise<object|null>}
   */
  static async findByToken(token) {
    try {
      const result = await query(
        `SELECT rt.id, rt.user_id, rt.token, rt.expires_at, rt.revoked, rt.created_at,
                u.email
         FROM auth_refresh_tokens rt
         JOIN auth_users u ON rt.user_id = u.id
         WHERE rt.token = $1`,
        [token]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding refresh token', { error: error.message });
      throw error;
    }
  }

  /**
   * Revoke a refresh token
   * @param {string} token
   * @returns {Promise<void>}
   */
  static async revoke(token) {
    try {
      await query(
        'UPDATE auth_refresh_tokens SET revoked = TRUE WHERE token = $1',
        [token]
      );

      logger.info('Refresh token revoked', { token: token.substring(0, 8) + '...' });
    } catch (error) {
      logger.error('Error revoking refresh token', { error: error.message });
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} userId
   * @returns {Promise<void>}
   */
  static async revokeAllForUser(userId) {
    try {
      const result = await query(
        'UPDATE auth_refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
        [userId]
      );

      logger.info('All refresh tokens revoked for user', { userId, count: result.rowCount });
    } catch (error) {
      logger.error('Error revoking all tokens for user', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Delete expired refresh tokens
   * @returns {Promise<number>} - Number of deleted tokens
   */
  static async deleteExpired() {
    try {
      const result = await query(
        'DELETE FROM auth_refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP'
      );

      logger.info('Expired refresh tokens deleted', { count: result.rowCount });
      return result.rowCount;
    } catch (error) {
      logger.error('Error deleting expired tokens', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user's active refresh tokens
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  static async findByUserId(userId) {
    try {
      const result = await query(
        `SELECT id, token, expires_at, created_at
         FROM auth_refresh_tokens
         WHERE user_id = $1 AND revoked = FALSE AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding tokens by user ID', { error: error.message, userId });
      throw error;
    }
  }
}

export default RefreshToken;
