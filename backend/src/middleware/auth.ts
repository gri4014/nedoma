import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/auth/JWTService';
import { RoleType } from '../types/rbac';
import { AuthenticatedAdminRequest, AuthenticatedUserRequest } from '../types/auth';

/**
 * Middleware to verify admin JWT token
 */
export const verifyAdminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const tokenValidation = jwtService.validateToken(token);
    if (!tokenValidation.valid) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    (req as AuthenticatedAdminRequest).user = {
      id: tokenValidation.payload.id,
      role: RoleType.ADMIN
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to verify user JWT token
 */
export const verifyUserAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const tokenValidation = jwtService.validateToken(token);
    if (!tokenValidation.valid) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    (req as AuthenticatedUserRequest).user = {
      id: tokenValidation.payload.id,
      role: RoleType.USER
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication error' });
  }
};

export const authenticateAdmin = [verifyAdminAuth];
export const authenticateUser = [verifyUserAuth];
