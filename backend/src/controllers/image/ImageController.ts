import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/auth';
import { ImageStorageService } from '../../services/image/ImageStorageService';
import { logger } from '../../utils/logger';
import fs from 'fs/promises';

export class ImageController {
  private imageStorageService: ImageStorageService;

  constructor() {
    this.imageStorageService = new ImageStorageService();
  }

  /**
   * Upload images for an event
   */
  uploadImages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const files = (req as any).files?.images || [];
      
      // Validate number of images (0-8 allowed)
      if (files.length > 8) {
        res.status(400).json({
          success: false,
          error: 'Maximum 8 images allowed'
        });
        return;
      }

      try {
        // Move files from temp to permanent storage
        const imageUrls = await this.imageStorageService.saveImages(files);

        res.status(201).json({
          success: true,
          data: {
            imageUrls
          }
        });
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
        throw error;
      }
    } catch (error) {
      logger.error('Error in uploadImages:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Delete images
   */
  deleteImages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { imageUrls } = req.body;

      if (!Array.isArray(imageUrls)) {
        res.status(400).json({
          success: false,
          error: 'imageUrls must be an array'
        });
        return;
      }

      await this.imageStorageService.deleteImages(imageUrls);

      res.json({
        success: true,
        message: 'Images deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteImages:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Delete a single image
   */
  deleteImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { imageUrl } = req.body;

      if (typeof imageUrl !== 'string') {
        res.status(400).json({
          success: false,
          error: 'imageUrl must be a string'
        });
        return;
      }

      await this.imageStorageService.deleteImage(imageUrl);

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteImage:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };
}

// Export singleton instance
export const imageController = new ImageController();
