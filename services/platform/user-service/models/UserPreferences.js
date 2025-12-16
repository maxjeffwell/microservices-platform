import { query } from '../config/database.js';
import { NotFoundError, ValidationError } from '@platform/errors';

export class UserPreferences {
  /**
   * Get user preferences by profile ID
   */
  static async findByProfileId(userProfileId) {
    const result = await query(
      'SELECT * FROM user_preferences WHERE user_profile_id = $1',
      [userProfileId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User preferences not found');
    }

    return result.rows[0];
  }

  /**
   * Update user preferences
   */
  static async update(userProfileId, updates) {
    const allowedFields = ['theme', 'email_notifications', 'push_notifications', 'preferences_json'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (fields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Validate theme if provided
    if (updates.theme) {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(updates.theme)) {
        throw new ValidationError(`Invalid theme. Must be one of: ${validThemes.join(', ')}`);
      }
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [userProfileId, ...fields.map(field => updates[field])];

    const result = await query(
      `UPDATE user_preferences
       SET ${setClause}, updated_at = NOW()
       WHERE user_profile_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User preferences not found');
    }

    return result.rows[0];
  }

  /**
   * Get specific preference from JSON field
   */
  static async getPreference(userProfileId, key) {
    const result = await query(
      `SELECT preferences_json->$2 as preference
       FROM user_preferences
       WHERE user_profile_id = $1`,
      [userProfileId, key]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User preferences not found');
    }

    return result.rows[0].preference;
  }

  /**
   * Set specific preference in JSON field
   */
  static async setPreference(userProfileId, key, value) {
    const result = await query(
      `UPDATE user_preferences
       SET preferences_json = COALESCE(preferences_json, '{}'::jsonb) || jsonb_build_object($2, $3),
           updated_at = NOW()
       WHERE user_profile_id = $1
       RETURNING *`,
      [userProfileId, key, JSON.stringify(value)]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User preferences not found');
    }

    return result.rows[0];
  }
}
