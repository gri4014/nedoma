import path from 'path';
import fs from 'fs/promises';

// Create upload directories if they don't exist
const createUploadDirs = async () => {
  const uploadDir = path.join(__dirname, '../../uploads');
  const eventsDir = path.join(uploadDir, 'events');
  const tempDir = path.join(uploadDir, 'temp');
  
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(eventsDir, { recursive: true });
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error: any) {
    console.error('Failed to create upload directories:', error);
  }
};

// Initialize directories
createUploadDirs().catch((error: any) => {
  console.error('Failed to create upload directories:', error);
});

export const storageConfig = {
  events: {
    uploadDir: path.join(__dirname, '../../uploads/events'),
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    urlPrefix: '/uploads/events'
  }
};
