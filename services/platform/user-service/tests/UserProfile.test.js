import { UserProfile } from '../models/UserProfile.js';
import { query, getClient } from '../config/database.js';

// Mock the database functions
jest.mock('../config/database.js');

describe('UserProfile Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user profile', async () => {
      const mockProfile = {
        id: 1,
        auth_user_id: 123,
        username: 'testuser',
        display_name: 'Test User',
        role: 'USER',
        created_at: new Date()
      };

      query.mockResolvedValueOnce({ rows: [mockProfile] }); // Profile insert
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Preferences insert

      const result = await UserProfile.create({
        authUserId: 123,
        username: 'testuser',
        displayName: 'Test User'
      });

      expect(result).toEqual(mockProfile);
      expect(query).toHaveBeenCalledTimes(2);
    });

    it('should throw ValidationError for duplicate auth_user_id', async () => {
      const dbError = new Error('Unique violation');
      dbError.code = '23505';
      dbError.constraint = 'user_profiles_auth_user_id_key';

      query.mockRejectedValueOnce(dbError);

      await expect(
        UserProfile.create({ authUserId: 123, username: 'test' })
      ).rejects.toThrow('Profile already exists for this user');
    });

    it('should throw ValidationError for duplicate username', async () => {
      const dbError = new Error('Unique violation');
      dbError.code = '23505';
      dbError.constraint = 'user_profiles_username_key';

      query.mockRejectedValueOnce(dbError);

      await expect(
        UserProfile.create({ authUserId: 123, username: 'taken' })
      ).rejects.toThrow('Username already taken');
    });
  });

  describe('findByAuthUserId', () => {
    it('should find profile by auth user ID', async () => {
      const mockProfile = {
        id: 1,
        auth_user_id: 123,
        username: 'testuser'
      };

      query.mockResolvedValueOnce({ rows: [mockProfile] });

      const result = await UserProfile.findByAuthUserId(123);

      expect(result).toEqual(mockProfile);
      expect(query).toHaveBeenCalledWith(
        'SELECT * FROM user_profiles WHERE auth_user_id = $1',
        [123]
      );
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await expect(
        UserProfile.findByAuthUserId(999)
      ).rejects.toThrow('User profile not found');
    });
  });

  describe('update', () => {
    it('should update user profile', async () => {
      const mockUpdated = {
        id: 1,
        auth_user_id: 123,
        username: 'newusername',
        updated_at: new Date()
      };

      query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await UserProfile.update(123, { username: 'newusername' });

      expect(result).toEqual(mockUpdated);
      expect(query).toHaveBeenCalled();
    });

    it('should throw ValidationError for no valid fields', async () => {
      await expect(
        UserProfile.update(123, { invalidField: 'value' })
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('delete', () => {
    it('should delete user profile', async () => {
      const mockDeleted = {
        id: 1,
        auth_user_id: 123
      };

      query.mockResolvedValueOnce({ rows: [mockDeleted] });

      const result = await UserProfile.delete(123);

      expect(result).toEqual(mockDeleted);
      expect(query).toHaveBeenCalledWith(
        'DELETE FROM user_profiles WHERE auth_user_id = $1 RETURNING *',
        [123]
      );
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await expect(
        UserProfile.delete(999)
      ).rejects.toThrow('User profile not found');
    });
  });

  describe('search', () => {
    it('should search public profiles', async () => {
      const mockProfiles = [
        { id: 1, username: 'john', display_name: 'John Doe' },
        { id: 2, username: 'jane', display_name: 'Jane Doe' }
      ];

      query.mockResolvedValueOnce({ rows: mockProfiles });

      const result = await UserProfile.search('doe', 20, 0);

      expect(result).toEqual(mockProfiles);
      expect(query).toHaveBeenCalled();
    });
  });
});
