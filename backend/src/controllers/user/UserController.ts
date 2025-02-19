import { Request, Response } from 'express';
import { UserModel } from '../../models/entities/UserModel';
import { jwtService } from '../../services/auth/JWTService';
import { RoleType } from '../../types/rbac';

interface CreateUserRequest extends Request {
  body: {
    telegram_id: string;
  };
}

interface SetPreferencesRequest extends Request {
  body: {
    preferences: Array<{
      subcategoryId: string;
      level: number;
    }>;
  };
}

class UserController {
  async createUser(req: CreateUserRequest, res: Response): Promise<void> {
    try {
      const { telegram_id } = req.body;

      if (!telegram_id) {
        res.status(400).json({ error: 'Telegram ID is required' });
        return;
      }

      // Check if user already exists
      const existingUser = await UserModel.getUserByTelegramId(telegram_id);
      if (existingUser) {
        const token = jwtService.generateToken({ 
          id: existingUser.id.toString(),
          role: RoleType.USER
        });
        res.status(200).json({ user: existingUser, token });
        return;
      }

      // Create new user and generate token
      const user = await UserModel.createUser(telegram_id);
      const token = jwtService.generateToken({ 
        id: user.id.toString(),
        role: RoleType.USER
      });
      res.status(201).json({ user, token });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async setUserPreferences(req: SetPreferencesRequest, res: Response): Promise<void> {
    try {
      const { preferences } = req.body;
      const userId = (req as any).user?.id; // Set by auth middleware

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!Array.isArray(preferences)) {
        res.status(400).json({ error: 'Invalid preferences format' });
        return;
      }

      // Validate preferences
      for (const pref of preferences) {
        if (typeof pref.level !== 'number' || pref.level < 0 || pref.level > 2) {
          res.status(400).json({ error: 'Invalid preference level' });
          return;
        }
        if (!pref.subcategoryId) {
          res.status(400).json({ error: 'Missing subcategory ID' });
          return;
        }
      }

      console.log('Setting preferences for user:', {
        userId,
        preferences,
        preferenceTypes: preferences.map(p => ({
          subcategoryId: `${p.subcategoryId} (${typeof p.subcategoryId})`,
          level: `${p.level} (${typeof p.level})`
        }))
      });

      // Convert subcategoryId strings to UUIDs and ensure level is a number
      const validatedPreferences = preferences.map(pref => ({
        subcategoryId: pref.subcategoryId,
        level: parseInt(pref.level.toString(), 10)
      }));

      await UserModel.setUserCategoryPreferences(userId, validatedPreferences);
      res.status(200).json({ message: 'Preferences updated successfully' });
    } catch (error) {
      console.error('Error setting preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const preferences = await UserModel.getUserCategoryPreferences(userId);
      res.status(200).json(preferences);
    } catch (error) {
      console.error('Error getting preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const userController = new UserController();
