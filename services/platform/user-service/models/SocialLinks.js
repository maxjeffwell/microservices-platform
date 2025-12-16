import { query } from '../config/database.js';
import { NotFoundError, ValidationError } from '@platform/errors';

export class SocialLinks {
  /**
   * Get all social links for a user
   */
  static async findByProfileId(userProfileId) {
    const result = await query(
      'SELECT * FROM social_links WHERE user_profile_id = $1 ORDER BY created_at DESC',
      [userProfileId]
    );

    return result.rows;
  }

  /**
   * Add a social link
   */
  static async create(userProfileId, platform, url) {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }

    const validPlatforms = ['github', 'linkedin', 'twitter', 'facebook', 'instagram', 'website'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      throw new ValidationError(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
    }

    const result = await query(
      `INSERT INTO social_links (user_profile_id, platform, url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userProfileId, platform.toLowerCase(), url]
    );

    return result.rows[0];
  }

  /**
   * Update a social link
   */
  static async update(id, userProfileId, url) {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }

    const result = await query(
      `UPDATE social_links
       SET url = $3
       WHERE id = $1 AND user_profile_id = $2
       RETURNING *`,
      [id, userProfileId, url]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Social link not found');
    }

    return result.rows[0];
  }

  /**
   * Delete a social link
   */
  static async delete(id, userProfileId) {
    const result = await query(
      'DELETE FROM social_links WHERE id = $1 AND user_profile_id = $2 RETURNING *',
      [id, userProfileId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Social link not found');
    }

    return result.rows[0];
  }
}
