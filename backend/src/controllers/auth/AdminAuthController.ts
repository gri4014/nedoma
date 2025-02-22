import { Request, Response } from 'express';
import { AdminModel } from '../../models/entities/AdminModel';
import { jwtService } from '../../services/auth/JWTService';
import { RoleType } from '../../types/rbac';

export class AdminAuthController {
  private adminModel: AdminModel;

  constructor() {
    this.adminModel = new AdminModel();
  }

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { login, password } = req.body;
      console.log('Admin login attempt:', login);

      const result = await this.adminModel.validateCredentials({ login, password });
      console.log('Login validation result:', { success: result.success, error: result.error });
      if (!result.success || !result.data) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const admin = result.data;
      const token = jwtService.generateToken({
        id: admin.id,
        role: RoleType.ADMIN
      });

      // Include admin data in response
      res.status(200).json({
        token,
        admin: {
          id: admin.id,
          login: admin.login,
          last_login: admin.last_login
        }
      });
    } catch (error) {
      console.error('Admin login error:', error instanceof Error ? error.message : error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export const adminAuthController = new AdminAuthController();
