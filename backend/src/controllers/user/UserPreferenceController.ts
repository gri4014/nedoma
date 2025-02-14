import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { z } from 'zod';
import { userCategoryPreferenceModel } from '../../models/entities/UserCategoryPreferenceModel';
import { userTagPreferenceModel } from '../../models/entities/UserTagPreferenceModel';
import { DbError, ErrorType } from '../../utils/errors';
import { CategoryPreference } from '../../types/categoryPreference';
import { TagPreference } from '../../types/tagPreference';

const tagPreferenceSchema = z.object({
  preferences: z.array(z.object({
    tagId: z.string().uuid(),
    value: z.union([z.boolean(), z.string()])
  }))
});

const InterestLevel = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3)
]);

const categoryPreferenceSchema = z.object({
  preferences: z.array(z.object({
    categoryId: z.string().uuid(),
    interestLevel: InterestLevel
  }))
});

export class UserPreferenceController {
  /**
   * Get user's tag preferences
   */
  public async getUserTagPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await userTagPreferenceModel.getUserTagPreferences(userId);
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to get user tag preferences'
        });
        return;
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Error in getUserTagPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Set user's tag preferences
   */
  public async setUserTagPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const validationResult = tagPreferenceSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid preferences data',
          details: validationResult.error.errors
        });
        return;
      }

      const result = await userTagPreferenceModel.setUserTagPreferences(
        userId,
        validationResult.data.preferences as TagPreference[]
      );

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to set user tag preferences'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Tag preferences updated successfully'
      });
    } catch (error) {
      console.error('Error in setUserTagPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete user's tag preferences
   */
  public async deleteUserTagPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await userTagPreferenceModel.deleteUserTagPreferences(userId);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to delete user tag preferences'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Tag preferences deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteUserTagPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get user's category preferences
   */
  public async getUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await userCategoryPreferenceModel.getUserPreferences(userId);
      
      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to get user preferences'
        });
        return;
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Set user's category preferences
   */
  public async setUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const validationResult = categoryPreferenceSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid preferences data',
          details: validationResult.error.errors
        });
        return;
      }

      const result = await userCategoryPreferenceModel.setUserPreferences(
        userId,
        validationResult.data.preferences as CategoryPreference[]
      );

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to set user preferences'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      console.error('Error in setUserPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete user's category preferences
   */
  public async deleteUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }

      const result = await userCategoryPreferenceModel.deleteUserPreferences(userId);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to delete user preferences'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Preferences deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteUserPreferences:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const userPreferenceController = new UserPreferenceController();
