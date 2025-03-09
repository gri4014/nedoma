import { Response } from 'express';
import { EventModel } from '../../models/entities/EventModel';
import { ICreateEvent, IUpdateEvent } from '../../models/interfaces/event';
import { eventFiltersSchema, createEventSchema, updateEventSchema } from '../../models/schemas/event';
import { ImageStorageService } from '../../services/image/ImageStorageService';
import { logger } from '../../utils/logger';
import fs from 'fs/promises';
import { AuthenticatedRequest } from '../../types/auth';

class EventController {
  private eventModel: EventModel;
  private imageStorageService: ImageStorageService;

  constructor() {
    this.eventModel = new EventModel();
    this.imageStorageService = new ImageStorageService();
  }

  /**
   * Get a single event by ID
   */
  getEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;

      const result = await this.eventModel.findEventById(eventId);

      if (!result.success || !result.data) {
        res.status(404).json({
          success: false,
          error: 'Event not found'
        });
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getEvent:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Create a new event
   */
  createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let imageUrls: string[] = [];
    try {
      // Get form fields and files
      const fields = req.body;
      const files = (req as any).files?.images || [];
      const existingImageUrls = fields.image_urls ? JSON.parse(fields.image_urls) : [];

      // Check image limit
      if (files.length > 8) {
        res.status(400).json({
          success: false,
          error: 'Maximum 8 images allowed'
        });
        return;
      }

      // Parse form data
      const data: ICreateEvent = {
        name: fields.name || '',
        short_description: fields.short_description,
        // If long_description is not provided, use short_description
        long_description: fields.long_description || fields.short_description,
        links: (() => {
          try {
            if (!fields.links) return [];
            if (Array.isArray(fields.links)) {
              return fields.links;
            }
            return JSON.parse(fields.links);
          } catch (error) {
            logger.error('Failed to parse links:', error);
            return [];
          }
        })(),
        event_dates: (() => {
          try {
            if (!fields.event_dates) return [];
            if (Array.isArray(fields.event_dates)) {
              return fields.event_dates.map((date: string) => new Date(date));
            }
            return JSON.parse(fields.event_dates).map((date: string) => new Date(date));
          } catch (error) {
            logger.error('Failed to parse event_dates:', error);
            return [];
          }
        })(),
        display_dates: fields.display_dates === 'true',
        address: fields.address,
        is_active: fields.is_active === 'true',
        is_free: fields.is_free === 'true',
        price_range: fields.is_free === 'true' ? null : {
          min: parseFloat(fields.price_min || '0'),
          max: parseFloat(fields.price_max || '0')
        },
        subcategories: (() => {
          try {
            if (!fields.subcategories) return [];
            if (Array.isArray(fields.subcategories)) {
              return fields.subcategories;
            }
            return JSON.parse(fields.subcategories);
          } catch (error) {
            logger.error('Failed to parse subcategories:', error);
            return [];
          }
        })(),
        tags: (() => {
          try {
            if (!fields.tags) return {};
            if (Array.isArray(fields.tags)) {
              return fields.tags.length > 0 ? JSON.parse(fields.tags[0]) : {};
            }
            return JSON.parse(fields.tags);
          } catch (error) {
            logger.error('Failed to parse tags:', error);
            return {};
          }
        })(),
        image_urls: []
      };

      // Initialize image URLs with any existing ones
      imageUrls = existingImageUrls;
      data.image_urls = imageUrls;

      // Add any newly uploaded images
      if (files.length > 0) {
        try {
          const newImageUrls = await this.imageStorageService.saveImages(files);
          imageUrls = [...imageUrls, ...newImageUrls];
          data.image_urls = imageUrls;
        } catch (error) {
          logger.error('Failed to process uploaded images:', error);
          // Clean up any temp files
          for (const file of files) {
            try {
              await fs.unlink(file.filepath);
            } catch (cleanupError) {
              logger.error('Failed to clean up temp file:', cleanupError);
            }
          }
          res.status(500).json({
            success: false,
            error: 'Failed to process uploaded images'
          });
          return;
        }
      }

      // Log raw data for debugging
      logger.info('Raw form fields:', fields);
      logger.info('Parsed data:', data);

      // Validate using Zod schema
      const validation = createEventSchema.safeParse(data);
      if (!validation.success) {
        // If validation fails, clean up any uploaded images
        if (imageUrls.length > 0) {
          await this.imageStorageService.deleteImages(imageUrls).catch((error: Error) => {
            logger.error('Failed to clean up images after validation failure:', error);
          });
        }
        res.status(400).json({
          success: false,
          error: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
        });
        return;
      }

      const result = await this.eventModel.createEvent(data);

      if (!result.success) {
        // If event creation fails, clean up uploaded images
        if (imageUrls.length > 0) {
          await this.imageStorageService.deleteImages(imageUrls).catch((error: Error) => {
            logger.error('Failed to clean up images after failed event creation:', error);
          });
        }
        
        logger.error('Failed to create event:', result.error);
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      // Clean up any uploaded images if data processing fails
      if (imageUrls.length > 0) {
        await this.imageStorageService.deleteImages(imageUrls).catch((error: Error) => {
          logger.error('Failed to clean up images after error:', error);
        });
      }
      logger.error('Error in createEvent:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get events with filters
   */
  getEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate and parse filters
      const filterValidation = eventFiltersSchema.safeParse(req.query);
      if (!filterValidation.success) {
        res.status(400).json({
          success: false,
          error: filterValidation.error.message
        });
        return;
      }

      const result = await this.eventModel.findWithFilters(filterValidation.data);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch events'
        });
        return;
      }

      if (!result.data) {
        res.json({
          success: true,
          data: [],
          hasMore: false,
          page: filterValidation.data.page || 1
        });
        return;
      }

      res.json({
        success: true,
        data: result.data.events,
        hasMore: result.data.hasMore,
        page: filterValidation.data.page || 1
      });
    } catch (error) {
      logger.error('Error in getEvents:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Update an event
   */
  updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;

      // Verify the event exists
      const event = await this.eventModel.findEventById(eventId);
      if (!event.success || !event.data) {
        res.status(404).json({
          success: false,
          error: 'Event not found'
        });
        return;
      }

      // Handle image update
      let imageUrls: string[] = [];
      const files = (req as any).files?.images || [];
      if (files.length > 8) {
        res.status(400).json({
          success: false,
          error: 'Maximum 8 images allowed'
        });
        return;
      }

      if (files.length > 0) {
        try {
          // Save new images first
          imageUrls = await this.imageStorageService.saveImages(files);
          
          // Only delete old images if new ones are successfully saved
          if (event.data.image_urls?.length) {
            await this.imageStorageService.deleteImages(event.data.image_urls);
          }
        } catch (error) {
          // Clean up any temp files
          for (const file of files) {
            try {
              await fs.unlink(file.filepath);
            } catch (cleanupError) {
              logger.error('Failed to clean up temp file:', cleanupError);
            }
          }
          // If something fails during image update, clean up any new images
          if (imageUrls.length > 0) {
            await this.imageStorageService.deleteImages(imageUrls).catch(error => {
              logger.error('Failed to clean up images after error:', error);
            });
          }
          logger.error('Failed to process images during update:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to process images'
          });
          return;
        }
      }

      // Parse form data
      const fields = req.body;
      logger.info('Raw update request fields:', fields);

      const data: IUpdateEvent = {};

      // Process name
      if (fields.name) data.name = fields.name;

      // Process descriptions
      if (fields.short_description) data.short_description = fields.short_description;
      if (fields.long_description) data.long_description = fields.long_description;

      // Process links
      if (fields.links) {
        try {
          data.links = Array.isArray(fields.links) ? fields.links : JSON.parse(fields.links);
        } catch (error) {
          logger.error('Failed to parse links:', error);
        }
      }

      // Process dates
      if (fields.event_dates) {
        try {
          data.event_dates = Array.isArray(fields.event_dates) 
            ? fields.event_dates.map((date: string) => new Date(date))
            : JSON.parse(fields.event_dates).map((date: string) => new Date(date));
        } catch (error) {
          logger.error('Failed to parse event_dates:', error);
        }
      }
      
      // Process display_dates
      if (fields.display_dates !== undefined) {
        data.display_dates = fields.display_dates === 'true';
      }

      // Process address
      if (fields.address) data.address = fields.address;

      // Process active status
      if (fields.is_active !== undefined) {
        data.is_active = fields.is_active === 'true';
      }

      // Process pricing
      if (fields.is_free !== undefined) {
        data.is_free = fields.is_free === 'true';
        if (!data.is_free && fields.price_min && fields.price_max) {
          data.price_range = {
            min: parseFloat(fields.price_min),
            max: parseFloat(fields.price_max)
          };
        }
      }

      // Process subcategories
      if (fields.subcategories) {
        try {
          data.subcategories = Array.isArray(fields.subcategories)
            ? fields.subcategories
            : JSON.parse(fields.subcategories);
        } catch (error) {
          logger.error('Failed to parse subcategories:', error);
        }
      }

      // Process tags - only include if explicitly provided and valid
      if (fields.tags !== undefined) {
        try {
          if (fields.tags && fields.tags !== '') {
            const parsedTags = Array.isArray(fields.tags) && fields.tags.length > 0
              ? JSON.parse(fields.tags[0])
              : JSON.parse(fields.tags);
            
            // Only include tags in update data if there are actual tags
            if (Object.keys(parsedTags).length > 0) {
              data.tags = parsedTags;
            }
          }
          // If tags is empty or invalid, don't include in update data at all
        } catch (error) {
          logger.error('Failed to parse tags:', error);
          // Don't include tags in update data if parsing fails
        }
      }

      // Add image URLs if any were uploaded
      if (imageUrls.length > 0) {
        data.image_urls = imageUrls;
      }

      // Validate using Zod schema
      const validation = updateEventSchema.safeParse(data);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
        });
        return;
      }

      const result = await this.eventModel.updateEvent(eventId, data);

      if (!result.success) {
        logger.error('Failed to update event:', result.error);
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in updateEvent:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Delete an event (hard delete)
   */
  deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;

      // Verify the event exists and get its images
      const event = await this.eventModel.findEventById(eventId);
      if (!event.success || !event.data) {
        res.status(404).json({
          success: false,
          error: 'Event not found'
        });
        return;
      }

      // Delete the event and its related records
      const result = await this.eventModel.delete(eventId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // Delete all images if they exist
      if (event.data.image_urls?.length) {
        await this.imageStorageService.deleteImages(event.data.image_urls);
      }

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteEvent:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get events with category details
   */
  getEventsWithCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await this.eventModel.getEventsWithCategories();

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getEventsWithCategories:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };
}

// Export singleton instance with type information
export const eventController: EventController = new EventController();
export type { EventController };
