import { query } from '../config/database.js';
import { NotFoundError, ValidationError } from '@platform/errors';

export class UserProfile {
  /**
   * Create a new user profile
   */
  static async create({ authUserId, username = null, displayName = null, email = null }) {
    try {
      const result = await query(
        `INSERT INTO user_profiles (auth_user_id, username, display_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [authUserId, username, displayName, 'USER']
      );

      // Create default preferences
      await query(
        `INSERT INTO user_preferences (user_profile_id)
         VALUES ($1)`,
        [result.rows[0].id]
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        if (error.constraint === 'user_profiles_auth_user_id_key') {
          throw new ValidationError('Profile already exists for this user');
        }
        if (error.constraint === 'user_profiles_username_key') {
          throw new ValidationError('Username already taken');
        }
      }
      throw error;
    }
  }

  /**
   * Find profile by auth user ID
   */
  static async findByAuthUserId(authUserId) {
    const result = await query(
      'SELECT * FROM user_profiles WHERE auth_user_id = $1',
      [authUserId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    return result.rows[0];
  }

  /**
   * Find profile by username
   */
  static async findByUsername(username) {
    const result = await query(
      'SELECT * FROM user_profiles WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    return result.rows[0];
  }

  /**
   * Find profile by ID
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM user_profiles WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    return result.rows[0];
  }

  /**
   * Update user profile
   */
  static async update(authUserId, updates) {
    const allowedFields = ['username', 'display_name', 'bio', 'avatar_url', 'timezone', 'language', 'is_public'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (fields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [authUserId, ...fields.map(field => updates[field])];

    try {
      const result = await query(
        `UPDATE user_profiles
         SET ${setClause}, updated_at = NOW()
         WHERE auth_user_id = $1
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User profile not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'user_profiles_username_key') {
        throw new ValidationError('Username already taken');
      }
      throw error;
    }
  }

  /**
   * Delete user profile and all related data
   */
  static async delete(authUserId) {
    const result = await query(
      'DELETE FROM user_profiles WHERE auth_user_id = $1 RETURNING *',
      [authUserId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    return result.rows[0];
  }

  /**
   * Search public profiles
   */
  static async search(searchTerm, limit = 20, offset = 0) {
    const result = await query(
      `SELECT id, auth_user_id, username, display_name, bio, avatar_url, created_at
       FROM user_profiles
       WHERE is_public = true
         AND (username ILIKE $1 OR display_name ILIKE $1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${searchTerm}%`, limit, offset]
    );

    return result.rows;
  }

  /**
   * List public profiles
   */
  static async listPublic(limit = 20, offset = 0) {
    const result = await query(
      `SELECT id, auth_user_id, username, display_name, bio, avatar_url, created_at
       FROM user_profiles
       WHERE is_public = true
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  /**
   * Update user role (admin only)
   */
  static async updateRole(authUserId, role) {
    const validRoles = ['USER', 'ADMIN', 'MODERATOR'];
    if (!validRoles.includes(role)) {
      throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const result = await query(
      `UPDATE user_profiles
       SET role = $2, updated_at = NOW()
       WHERE auth_user_id = $1
       RETURNING *`,
      [authUserId, role]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    return result.rows[0];
  }
}
