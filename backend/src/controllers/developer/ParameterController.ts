import { Response } from 'express';
import { ItemParameterModel } from '../../models/entities/ItemParameterModel';
import { AuthenticatedRequest } from '../../middleware/auth';

const parameterModel = new ItemParameterModel();

export class ParameterController {
  async getParameters(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ 
          success: false,
          error: 'You must be authenticated to view parameters' 
        });
        return;
      }

      const result = await parameterModel.findAll();
      if (!result.success) {
        res.status(500).json({ 
          success: false,
          error: `Failed to fetch parameters: ${result.error}` 
        });
        return;
      }

      res.json({
        success: true,
        data: result.data || []
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error instanceof Error 
          ? `Failed to fetch parameters: ${error.message}` 
          : 'Failed to fetch parameters due to an unknown error'
      });
    }
  }

  async createParameter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('Creating parameter with payload:', req.body);
      
      if (!req.user) {
        console.log('No user found in request');
        res.status(401).json({ 
          success: false,
          error: 'You must be authenticated to create parameters' 
        });
        return;
      }

      // Validate required fields
      if (!req.body.name) {
        res.status(400).json({ 
          success: false,
          error: 'Parameter name is required' 
        });
        return;
      }

      if (!req.body.data_type) {
        res.status(400).json({ 
          success: false,
          error: 'Parameter type is required' 
        });
        return;
      }

      // Validate numeric values if present
      if (req.body.min_value !== undefined && isNaN(Number(req.body.min_value))) {
        res.status(400).json({ 
          success: false,
          error: 'Minimum value must be a valid number' 
        });
        return;
      }

      if (req.body.max_value !== undefined && isNaN(Number(req.body.max_value))) {
        res.status(400).json({ 
          success: false,
          error: 'Maximum value must be a valid number' 
        });
        return;
      }

      if (req.body.min_value !== undefined && req.body.max_value !== undefined) {
        const min = Number(req.body.min_value);
        const max = Number(req.body.max_value);
        if (min >= max) {
          res.status(400).json({ 
            success: false,
            error: 'Minimum value must be less than maximum value' 
          });
          return;
        }
      }
      
      const result = await parameterModel.create(req.body);
      console.log('Create parameter result:', result);
      
      if (!result.success) {
        console.error('Failed to create parameter:', result.error);
        res.status(500).json({ 
          success: false,
          error: `Failed to create parameter: ${result.error}` 
        });
        return;
      }
      
      console.log('Parameter created successfully:', result.data);
      res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Error creating parameter:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error 
          ? `Failed to create parameter: ${error.message}` 
          : 'Failed to create parameter due to an unknown error' 
      });
    }
  }

  async updateParameter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate numeric values if present
      if (req.body.min_value !== undefined && isNaN(Number(req.body.min_value))) {
        res.status(400).json({ 
          success: false,
          error: 'Minimum value must be a valid number' 
        });
        return;
      }

      if (req.body.max_value !== undefined && isNaN(Number(req.body.max_value))) {
        res.status(400).json({ 
          success: false,
          error: 'Maximum value must be a valid number' 
        });
        return;
      }

      if (req.body.min_value !== undefined && req.body.max_value !== undefined) {
        const min = Number(req.body.min_value);
        const max = Number(req.body.max_value);
        if (min >= max) {
          res.status(400).json({ 
            success: false,
            error: 'Minimum value must be less than maximum value' 
          });
          return;
        }
      }

      const result = await parameterModel.update(id, req.body);
      if (!result.success) {
        res.status(500).json({ 
          success: false,
          error: `Failed to update parameter: ${result.error}` 
        });
        return;
      }
      if (!result.data) {
        res.status(404).json({ 
          success: false,
          error: `Parameter with ID ${id} not found` 
        });
        return;
      }
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error instanceof Error 
          ? `Failed to update parameter: ${error.message}` 
          : 'Failed to update parameter due to an unknown error'
      });
    }
  }

  async deleteParameter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.user) {
        res.status(401).json({ 
          success: false,
          error: 'You must be authenticated to delete parameters' 
        });
        return;
      }

      const result = await parameterModel.delete(id);
      if (!result.success) {
        res.status(500).json({ 
          success: false,
          error: `Failed to delete parameter: ${result.error}` 
        });
        return;
      }
      if (!result.data) {
        res.status(404).json({ 
          success: false,
          error: `Parameter with ID ${id} not found` 
        });
        return;
      }
      res.json({
        success: true,
        message: 'Parameter deleted successfully'
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error instanceof Error 
          ? `Failed to delete parameter: ${error.message}` 
          : 'Failed to delete parameter due to an unknown error'
      });
    }
  }
}
