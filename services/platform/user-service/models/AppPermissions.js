import { query } from '../config/database.js';
import { NotFoundError } from '@platform/errors';

export class AppPermissions {
  /**
   * Get permissions for a specific app
   */
  static async findByProfileAndApp(userProfileId, appName) {
    const result = await query(
      'SELECT * FROM app_permissions WHERE user_profile_id = $1 AND app_name = $2',
      [userProfileId, appName]
    );

    if (result.rows.length === 0) {
      // Return default permissions if none exist
      return {
        user_profile_id: userProfileId,
        app_name: appName,
        permissions: ['read']
      };
    }

    return result.rows[0];
  }

  /**
   * Get all app permissions for a user
   */
  static async findAllByProfile(userProfileId) {
    const result = await query(
      'SELECT * FROM app_permissions WHERE user_profile_id = $1',
      [userProfileId]
    );

    return result.rows;
  }

  /**
   * Set permissions for an app
   */
  static async upsert(userProfileId, appName, permissions) {
    const result = await query(
      `INSERT INTO app_permissions (user_profile_id, app_name, permissions)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_profile_id, app_name)
       DO UPDATE SET permissions = $3, created_at = NOW()
       RETURNING *`,
      [userProfileId, appName, JSON.stringify(permissions)]
    );

    return result.rows[0];
  }

  /**
   * Check if user has specific permission for an app
   */
  static async hasPermission(userProfileId, appName, permission) {
    const result = await query(
      `SELECT permissions @> $3::jsonb as has_permission
       FROM app_permissions
       WHERE user_profile_id = $1 AND app_name = $2`,
      [userProfileId, appName, JSON.stringify([permission])]
    );

    if (result.rows.length === 0) {
      // Default to read-only if no permissions set
      return permission === 'read';
    }

    return result.rows[0].has_permission;
  }

  /**
   * Delete app permissions
   */
  static async delete(userProfileId, appName) {
    const result = await query(
      'DELETE FROM app_permissions WHERE user_profile_id = $1 AND app_name = $2 RETURNING *',
      [userProfileId, appName]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('App permissions not found');
    }

    return result.rows[0];
  }
}
