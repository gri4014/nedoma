import { Response } from 'express';
import bcrypt from 'bcrypt';
import { RestaurantAdminModel } from '../../models/entities/RestaurantAdminModel';
import { RestaurantModel } from '../../models/entities/RestaurantModel';
import { createRestaurantAdminSchema, updateRestaurantAdminSchema } from '../../models/schemas/auth';
import { AuthenticatedRequest } from '../../middleware/auth';

export class RestaurantAdminController {
  private restaurantAdminModel: RestaurantAdminModel;
  private restaurantModel: RestaurantModel;

  constructor() {
    this.restaurantAdminModel = new RestaurantAdminModel();
    this.restaurantModel = new RestaurantModel();
  }

  /**
   * Create a new restaurant admin
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { restaurantId } = req.params;

      // Verify restaurant exists
      const restaurant = await this.restaurantModel.findById(restaurantId);
      if (!restaurant.success || !restaurant.data) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }


      console.log('[RestaurantAdminController] Creating admin with data:', {
        ...req.body,
        password: '[REDACTED]'
      });

      // Stage 1: Schema Validation
      const validationResult = createRestaurantAdminSchema.safeParse({
        ...req.body,
        restaurant_id: restaurantId
      });

      if (!validationResult.success) {
        console.error('[RestaurantAdminController] Schema validation failed:', validationResult.error);
        return res.status(400).json({
          success: false,
          error: validationResult.error.errors.map(err => err.message).join(', '),
          stage: 'schema_validation'
        });
      }

      // Stage 2: Permissions Array Validation
      if (!req.body.permissions || !Array.isArray(req.body.permissions)) {
        console.error('[RestaurantAdminController] Invalid permissions format:', req.body.permissions);
        return res.status(400).json({
          success: false,
          error: 'Permissions must be provided as an array',
          stage: 'permissions_format'
        });
      }

      if (req.body.permissions.length === 0) {
        console.error('[RestaurantAdminController] Empty permissions array');
        return res.status(400).json({
          success: false,
          error: 'At least one permission must be selected',
          stage: 'permissions_empty'
        });
      }

      // Stage 3: Permissions Values Validation
      const validPermissions = ['MENU', 'ORDER', 'TABLE', 'ADMIN', 'THEME'] as const;
      type ValidPermission = typeof validPermissions[number];
      const invalidPermissions = req.body.permissions.filter((p: string) => !validPermissions.includes(p as ValidPermission));
      if (invalidPermissions.length > 0) {
        console.error('[RestaurantAdminController] Invalid permission values:', invalidPermissions);
        return res.status(400).json({
          success: false,
          error: `Invalid permissions: ${invalidPermissions.join(', ')}`,
          stage: 'permissions_values'
        });
      }

      // Stage 4: Create Admin Account
      try {
        const { password, permissions, is_admin, ...adminData } = validationResult.data;
        
        // Generate request ID for tracking
        const requestId = Math.random().toString(36).substring(7);
        const timestamp = new Date().toISOString();
        
        // Log creation attempt with context
        const context = {
          requestId,
          timestamp,
          restaurantId,
          login: adminData.login,
          permissions,
          is_admin
        };
        
        console.log('[RestaurantAdminController] Creating admin:', {
          ...context,
          password: '[REDACTED]'
        });

        // Create admin account
        const result = await this.restaurantAdminModel.createRestaurantAdmin(
          restaurantId,
          adminData.login,
          password,
          permissions,
          is_admin
        );

        if (!result.success) {
          // Handle specific error types
          if (result.error instanceof Error) {
            const dbError = result.error as any; // Type assertion for error properties
            
            // Determine error type and status code
            let statusCode = 400;
            let errorStage = 'database_creation';
            
            if (dbError.type === 'VALIDATION') {
              errorStage = 'validation';
              if (dbError.message.includes('Login already exists')) {
                errorStage = 'login_validation';
              }
            } else if (dbError.type === 'DATABASE') {
              statusCode = 500;
              errorStage = 'database_error';
            }

            const errorInfo = {
              ...context,
              errorType: dbError.type,
              errorDetails: dbError.details,
              stack: dbError.stack
            };

            console.error(`[RestaurantAdminController][${requestId}] Admin creation failed:`, errorInfo);

            return res.status(statusCode).json({
              success: false,
              error: dbError.message,
              stage: errorStage,
              details: errorInfo
            });
          }

          // Handle generic errors
          console.error(`[RestaurantAdminController][${requestId}] Admin creation failed:`, {
            ...context,
            error: result.error
          });

          return res.status(400).json({
            success: false,
            error: result.error,
            stage: 'database_creation',
            details: context
          });
        }

        // Log successful creation
        console.log(`[RestaurantAdminController][${requestId}] Admin created successfully:`, {
          ...context,
          adminId: result.data?.id
        });

        return res.status(201).json(result);
      } catch (error) {
        const errorInfo = {
          requestId: Math.random().toString(36).substring(7),
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          type: error instanceof Error ? error.constructor.name : 'UnknownError'
        };
        
        console.error('[RestaurantAdminController] Unexpected error during admin creation:', errorInfo);
        
        return res.status(500).json({
          success: false,
          error: errorInfo.message,
          stage: 'unexpected',
          details: errorInfo
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }

  /**
   * List all admins for a restaurant
   */
  async list(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { restaurantId } = req.params;

      // Verify restaurant exists
      const restaurant = await this.restaurantModel.findById(restaurantId);
      if (!restaurant.success || !restaurant.data) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }


      // Get all admins for the restaurant
      const result = await this.restaurantAdminModel.findByRestaurant(restaurantId);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }

  /**
   * Get a specific admin
   */
  async getById(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { restaurantId, adminId } = req.params;

      // Verify restaurant exists
      const restaurant = await this.restaurantModel.findById(restaurantId);
      if (!restaurant.success || !restaurant.data) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }


      // Get admin
      const result = await this.restaurantAdminModel.findById(adminId);
      if (!result.success || !result.data) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      // Verify admin belongs to this restaurant
      if (result.data.restaurant_id !== restaurantId) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found in this restaurant'
        });
      }

      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }

  /**
   * Update an admin
   */
  async update(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { restaurantId, adminId } = req.params;

      // Verify restaurant exists
      const restaurant = await this.restaurantModel.findById(restaurantId);
      if (!restaurant.success || !restaurant.data) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }


      // Verify admin exists and belongs to this restaurant
      const admin = await this.restaurantAdminModel.findById(adminId);
      if (!admin.success || !admin.data) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      if (admin.data.restaurant_id !== restaurantId) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found in this restaurant'
        });
      }

      // Validate update data
      const validationResult = updateRestaurantAdminSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.message
        });
      }

      const { password, ...initialUpdateData } = validationResult.data;
      let updateData = initialUpdateData;

      // Handle password update if provided
      if (password) {
        // For developer admin panel, we skip current password verification
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        const result = await this.restaurantAdminModel.update(adminId, {
          ...updateData,
          password_hash
        });
        if (!result.success) {
          return res.status(400).json(result);
        }
      }

      // Update other fields if any
      if (Object.keys(updateData).length > 0) {
        const result = await this.restaurantAdminModel.update(adminId, updateData);
        if (!result.success) {
          return res.status(400).json(result);
        }
      }

      // Get updated admin data
      const updatedAdmin = await this.restaurantAdminModel.findById(adminId);
      return res.json(updatedAdmin);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }

  /**
   * Delete (deactivate) an admin
   */
  async delete(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { restaurantId, adminId } = req.params;

      // Verify restaurant exists
      const restaurant = await this.restaurantModel.findById(restaurantId);
      if (!restaurant.success || !restaurant.data) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found'
        });
      }


      // Verify admin exists and belongs to this restaurant
      const admin = await this.restaurantAdminModel.findById(adminId);
      if (!admin.success || !admin.data) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      if (admin.data.restaurant_id !== restaurantId) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found in this restaurant'
        });
      }

      // Deactivate admin
      const result = await this.restaurantAdminModel.deactivateAdmin(adminId);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
}
