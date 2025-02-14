import { Request, Response, NextFunction } from 'express';
import formidable from 'formidable';
import path from 'path';
import { storageConfig } from '../config/storage';
import { logger } from '../utils/logger';

export const imageUpload = async (req: Request, res: Response, next: NextFunction) => {
  const form = formidable({
    maxFiles: 8,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    multiples: true,
    uploadDir: path.join(process.cwd(), 'uploads/temp'),
    filter: ({ mimetype }) => {
      // Allow only image files
      if (!mimetype) {
        logger.warn('No mimetype provided for uploaded file');
        return false;
      }
      const isValid = ['image/jpeg', 'image/png', 'image/gif'].includes(mimetype);
      if (!isValid) {
        logger.warn(`Invalid file type attempted: ${mimetype}. Allowed types: jpeg, png, gif`);
      }
      return isValid;
    },
    filename: (_name, _ext, part) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const filename = `${uniqueSuffix}${path.extname(part.originalFilename || '')}`;
      return filename;
    }
  });

  try {
    const [fields, files] = await form.parse(req);
    const imageFiles = Array.isArray(files.images) ? files.images : files.images ? [files.images] : [];

    // Add files to request for controller access
    (req as any).files = { images: imageFiles };
    (req as any).body = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value
      ])
    );

    next();
  } catch (error) {
    logger.error('Error processing file upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'File upload failed';
    logger.error('Error in imageUpload middleware:', { error: errorMessage });
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};
