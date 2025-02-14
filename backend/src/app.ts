import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import { app, startServer } from './config/server';
import './config/database';

// Start the server
startServer();

export default app;
