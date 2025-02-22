import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3002;


// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3004',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}));
app.use(express.json());
app.use((req, res, next) => {
  if (req.path === '/api/admin/login') {
    console.log('Login request body:', req.body);
  }
  next();
});
app.use(express.urlencoded({ extended: true }));

// Log static file requests
app.use('/storage/qrcodes', (req, _res, next) => {
  const fullPath = path.join(process.cwd(), 'storage/qrcodes', req.path);
  console.log('QR code request:', {
    path: req.path,
    fullPath,
    fullUrl: req.url,
    method: req.method,
    headers: req.headers,
    exists: require('fs').existsSync(fullPath)
  });
  next();
});

// Serve uploaded files
app.use('/uploads/events', express.static(path.join(process.cwd(), 'uploads/events'), {
  fallthrough: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
const eventsDir = path.join(uploadsDir, 'events');
const tempDir = path.join(uploadsDir, 'temp');

try {
  // Create main uploads directory
  if (!require('fs').existsSync(uploadsDir)) {
    require('fs').mkdirSync(uploadsDir);
  }
  
  // Create events directory for permanent storage
  if (!require('fs').existsSync(eventsDir)) {
    require('fs').mkdirSync(eventsDir);
  }
  
  // Create temp directory for formidable
  if (!require('fs').existsSync(tempDir)) {
    require('fs').mkdirSync(tempDir);
  }
} catch (error) {
  console.error('Failed to create upload directories:', error);
}

// Log static file requests
app.use('/storage/qrcodes', (req, _res, next) => {
  console.log('QR code request:', {
    url: req.url,
    path: req.path,
    method: req.method,
    headers: req.headers
  });
  next();
});

// Serve QR code files
app.use('/storage/qrcodes', express.static(path.join(process.cwd(), 'storage/qrcodes'), {
  index: false,
  fallthrough: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'image/png');
  }
}));

// Basic route for testing
app.get('/', (_req, res) => {
  res.json({ message: 'NEDOMA API is running' });
});

// Import main router
import routes from '../routes';

// Mount all routes under /api
app.use('/api', routes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const startServer = () => {
  try {
    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log('Server initialized');
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

export { app, startServer };
