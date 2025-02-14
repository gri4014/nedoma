import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { JWTPayload, JWTValidationResult } from '../../types/jwt';

type ExpiresIn = string | number;

/**
 * Service for handling JWT token operations
 */
export class JWTService {
  private readonly secret: Secret;
  private readonly expiresIn: ExpiresIn;

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    this.secret = secret;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  /**
   * Generate a JWT token for a user
   * @param payload The data to be encoded in the token
   * @returns The generated JWT token
   */
  public generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      const options: SignOptions = {
        expiresIn: this.expiresIn
      } as SignOptions;
      return jwt.sign(payload as object, this.secret, options);
    } catch (error: any) {
      throw new Error(`Failed to generate token: ${error.message}`);
    }
  }

  /**
   * Validate a JWT token and extract its payload
   * @param token The JWT token to validate
   * @returns The validation result containing either the payload or an error
   */
  /**
   * Decode a JWT token without verifying
   */
  public decodeToken(token: string): JWTPayload {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded) {
      throw new Error('Failed to decode token');
    }
    return decoded;
  }

  /**
   * Validate a JWT token and extract its payload
   */
  public validateToken(token: string): JWTValidationResult {
    try {
      const payload = jwt.verify(token, this.secret) as JWTPayload;
      return {
        valid: true,
        payload
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: {
            code: 'expired_token',
            message: 'Token has expired'
          }
        };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: {
            code: 'invalid_token',
            message: 'Invalid token'
          }
        };
      }
      return {
        valid: false,
        error: {
          code: 'malformed_token',
          message: `Token validation failed: ${(error as Error).message}`
        }
      };
    }
  }

  /**
   * Extract token from Authorization header
   * @param authHeader The Authorization header value
   * @returns The extracted token or null if not found/invalid
   */
  public extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }
}

// Export singleton instance
export const jwtService = new JWTService();
