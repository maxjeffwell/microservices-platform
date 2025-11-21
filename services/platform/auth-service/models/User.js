import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { createLogger } from '@platform/logger';

const logger = createLogger('auth-service:user-model');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

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
}

export default User;
