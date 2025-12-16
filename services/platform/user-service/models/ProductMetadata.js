import { query } from '../config/database.js';
import { NotFoundError } from '@platform/errors';

export class ProductMetadata {
  /**
   * Get metadata for a specific product
   */
  static async findByProfileAndProduct(userProfileId, productName) {
    const result = await query(
      'SELECT * FROM product_metadata WHERE user_profile_id = $1 AND product_name = $2',
      [userProfileId, productName]
    );

    if (result.rows.length === 0) {
      // Return empty metadata if none exists
      return {
        user_profile_id: userProfileId,
        product_name: productName,
        metadata_json: {}
      };
    }

    return result.rows[0];
  }

  /**
   * Get all product metadata for a user
   */
  static async findAllByProfile(userProfileId) {
    const result = await query(
      'SELECT * FROM product_metadata WHERE user_profile_id = $1',
      [userProfileId]
    );

    return result.rows;
  }

  /**
   * Set or update metadata for a product
   */
  static async upsert(userProfileId, productName, metadata) {
    const result = await query(
      `INSERT INTO product_metadata (user_profile_id, product_name, metadata_json)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_profile_id, product_name)
       DO UPDATE SET metadata_json = $3, updated_at = NOW()
       RETURNING *`,
      [userProfileId, productName, JSON.stringify(metadata)]
    );

    return result.rows[0];
  }

  /**
   * Merge new metadata with existing metadata
   */
  static async merge(userProfileId, productName, metadata) {
    const result = await query(
      `INSERT INTO product_metadata (user_profile_id, product_name, metadata_json)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_profile_id, product_name)
       DO UPDATE SET
         metadata_json = product_metadata.metadata_json || $3::jsonb,
         updated_at = NOW()
       RETURNING *`,
      [userProfileId, productName, JSON.stringify(metadata)]
    );

    return result.rows[0];
  }

  /**
   * Get specific metadata field
   */
  static async getField(userProfileId, productName, field) {
    const result = await query(
      `SELECT metadata_json->$3 as field_value
       FROM product_metadata
       WHERE user_profile_id = $1 AND product_name = $2`,
      [userProfileId, productName, field]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].field_value;
  }

  /**
   * Set specific metadata field
   */
  static async setField(userProfileId, productName, field, value) {
    const result = await query(
      `INSERT INTO product_metadata (user_profile_id, product_name, metadata_json)
       VALUES ($1, $2, jsonb_build_object($3, $4))
       ON CONFLICT (user_profile_id, product_name)
       DO UPDATE SET
         metadata_json = product_metadata.metadata_json || jsonb_build_object($3, $4),
         updated_at = NOW()
       RETURNING *`,
      [userProfileId, productName, field, JSON.stringify(value)]
    );

    return result.rows[0];
  }

  /**
   * Delete product metadata
   */
  static async delete(userProfileId, productName) {
    const result = await query(
      'DELETE FROM product_metadata WHERE user_profile_id = $1 AND product_name = $2 RETURNING *',
      [userProfileId, productName]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Product metadata not found');
    }

    return result.rows[0];
  }
}
