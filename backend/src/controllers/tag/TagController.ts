import { Response } from 'express';
import { TagModel } from '../../models/entities/TagModel';
import { AuthenticatedRequest } from '../../types/auth';
import { logger } from '../../utils/logger';

export class TagController {
  private tagModel: TagModel;

  constructor() {
    this.tagModel = new TagModel();
  }

  /**
   * Get all tags
   */
  async getTags(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await this.tagModel.findAll();
      if (!result.success) {
        res.status(500).json({ 
          success: false,
          error: `Failed to fetch tags: ${result.error}` 
        });
        return;
      }

      res.json({
        success: true,
        data: result.data?.map(tag => ({
          ...tag,
          created_at: new Date(tag.created_at),
          updated_at: new Date(tag.updated_at)
        })) || []
      });
    } catch (error) {
      logger.error('Error in getTags:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error 
          ? `Failed to fetch tags: ${error.message}` 
          : 'Failed to fetch tags due to an unknown error'
      });
    }
  }

  /**
   * Create a new tag
   */
  async createTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      logger.info('Creating tag with payload:', req.body);
      
      // Validate required fields
      if (!req.body.name) {
        res.status(400).json({ 
          success: false,
          error: 'Введите название тега' 
        });
        return;
      }

      if (!req.body.possible_values || !Array.isArray(req.body.possible_values) || req.body.possible_values.length === 0) {
        res.status(400).json({ 
          success: false,
          error: 'Добавьте хотя бы одно возможное значение для тега' 
        });
        return;
      }

      if (!req.body.subcategories || !Array.isArray(req.body.subcategories) || req.body.subcategories.length === 0) {
        res.status(400).json({ 
          success: false,
          error: 'Выберите хотя бы одну подкатегорию для тега' 
        });
        return;
      }
      
      const result = await this.tagModel.create(req.body);
      logger.info('Create tag result:', result);
      
      if (!result.success) {
        logger.error('Failed to create tag:', result.error);
        res.status(500).json({ 
          success: false,
          error: `Failed to create tag: ${result.error}` 
        });
        return;
      }
      
      logger.info('Tag created successfully:', result.data);
      res.status(201).json({
        success: true,
        data: result.data ? {
          ...result.data,
          created_at: new Date(result.data.created_at),
          updated_at: new Date(result.data.updated_at)
        } : null
      });
    } catch (error) {
      logger.error('Error in createTag:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error 
          ? `Failed to create tag: ${error.message}` 
          : 'Failed to create tag due to an unknown error' 
      });
    }
  }

  /**
   * Update a tag
   */
  async updateTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate possible values if provided
      if (req.body.possible_values !== undefined) {
        if (!Array.isArray(req.body.possible_values) || req.body.possible_values.length === 0) {
          res.status(400).json({ 
            success: false,
            error: 'Добавьте хотя бы одно возможное значение для тега' 
          });
          return;
        }
      }

      // Validate subcategories if provided
      if (req.body.subcategories !== undefined) {
        if (!Array.isArray(req.body.subcategories) || req.body.subcategories.length === 0) {
          res.status(400).json({ 
            success: false,
            error: 'Выберите хотя бы одну подкатегорию для тега' 
          });
          return;
        }
      }

      const result = await this.tagModel.update(id, req.body);
      if (!result.success) {
        res.status(500).json({ 
          success: false,
          error: `Failed to update tag: ${result.error}` 
        });
        return;
      }
      if (!result.data) {
        res.status(404).json({ 
          success: false,
          error: `Tag with ID ${id} not found` 
        });
        return;
      }
      res.json({
        success: true,
        data: result.data ? {
          ...result.data,
          created_at: new Date(result.data.created_at),
          updated_at: new Date(result.data.updated_at)
        } : null
      });
    } catch (error) {
      logger.error('Error in updateTag:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error 
          ? `Failed to update tag: ${error.message}` 
          : 'Failed to update tag due to an unknown error'
      });
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.tagModel.delete(id);
      if (!result.success) {
        res.status(500).json({ 
          success: false,
          error: `Failed to delete tag: ${result.error}` 
        });
        return;
      }

      res.json({
        success: true,
        message: 'Tag deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteTag:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error 
          ? `Failed to delete tag: ${error.message}` 
          : 'Failed to delete tag due to an unknown error'
      });
    }
  }

  /**
   * Get events by tag values with stats
   */
  async getEventsByTag(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { tagId } = req.params;
      const values = Array.isArray(req.query.values) 
        ? req.query.values as string[]
        : [req.query.values as string];

      if (!values || values.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Необходимо указать значения тега'
        });
        return;
      }

      // First validate the tag values
      const validationResult = await this.tagModel.isValidTagValues(tagId, values);
      if (!validationResult.success) {
        res.status(500).json({
          success: false,
          error: validationResult.error
        });
        return;
      }

      if (!validationResult.data) {
        res.status(400).json({
          success: false,
          error: 'Недопустимые значения тега'
        });
        return;
      }

      // Get events and tag stats in parallel
      const [eventsResult, statsResult] = await Promise.all([
        this.tagModel.getEventsByTag(tagId, values),
        this.tagModel.getTagStats(tagId)
      ]);

      if (!eventsResult.success) {
        res.status(500).json({
          success: false,
          error: eventsResult.error
        });
        return;
      }

      res.json({
        success: true,
        data: {
          events: eventsResult.data,
          stats: statsResult.success ? statsResult.data : null
        }
      });
    } catch (error) {
      logger.error('Error in getEventsByTag:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error
          ? `Failed to get events by tag: ${error.message}`
          : 'Failed to get events by tag due to an unknown error'
      });
    }
  }

  /**
   * Get tag statistics and trends
   */
  async getTagStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type } = req.query;

      if (type === 'trends') {
        const result = await this.tagModel.getTagTrends();
        if (!result.success) {
          res.status(500).json({
            success: false,
            error: result.error
          });
          return;
        }

        res.json({
          success: true,
          data: {
            trends: result.data
          }
        });
        return;
      }

      const [statsResult, trendsResult] = await Promise.all([
        this.tagModel.getTagsWithEventCounts(),
        this.tagModel.getTagTrends(5)
      ]);

      if (!statsResult.success) {
        res.status(500).json({
          success: false,
          error: statsResult.error
        });
        return;
      }

      res.json({
        success: true,
        data: {
          stats: statsResult.data,
          top_trends: trendsResult.success ? trendsResult.data : []
        }
      });
    } catch (error) {
      logger.error('Error in getTagStats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error
          ? `Failed to get tag statistics: ${error.message}`
          : 'Failed to get tag statistics due to an unknown error'
      });
    }
  }

  /**
   * Get tags for an event
   */
  async getEventTags(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const result = await this.tagModel.getEventTags(eventId);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data?.map(tag => ({
          ...tag,
          created_at: new Date(tag.created_at),
          updated_at: new Date(tag.updated_at)
        }))
      });
    } catch (error) {
      logger.error('Error in getEventTags:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error
          ? `Failed to get event tags: ${error.message}`
          : 'Failed to get event tags due to an unknown error'
      });
    }
  }

  /**
   * Get tags by subcategories
   */
  async getTagsBySubcategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const categoryIds = Array.isArray(req.query.categoryIds)
        ? req.query.categoryIds as string[]
        : [req.query.categoryIds as string];

      if (!categoryIds || categoryIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Необходимо указать ID подкатегорий'
        });
        return;
      }

      const result = await this.tagModel.getTagsBySubcategories(categoryIds);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data?.map(tag => ({
          ...tag,
          created_at: new Date(tag.created_at),
          updated_at: new Date(tag.updated_at)
        }))
      });
    } catch (error) {
      logger.error('Error in getTagsBySubcategories:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error
          ? `Failed to get tags by subcategories: ${error.message}`
          : 'Failed to get tags by subcategories due to an unknown error'
      });
    }
  }
}

// Export singleton instance
export const tagController = new TagController();
