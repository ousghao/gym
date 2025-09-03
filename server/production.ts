import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes.js';
import { serveStatic } from './static.js';
import { ensureDatabaseReady } from './database-check.js';
import { DbStorage } from './db-storage.js';
import { createServer } from 'http';

const app = express();
const httpServer = createServer(app);
const storage = new DbStorage();

// Production server without Vite dependencies
console.log('🚀 Starting production server...');

// Ensure database is ready before starting
await ensureDatabaseReady();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware for API calls
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + '…';
      console.log(`[${new Date().toLocaleTimeString()}] ${logLine}`);
    }
  });

  next();
});

// Register API routes
await registerRoutes(app, storage);

// Health check endpoint for Railway
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Serve static files (built React app)
serveStatic(app);

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  
  console.error('🚨 Unhandled error:', {
    status,
    message,
    stack: err.stack,
    url: _req.url,
    method: _req.method
  });
  
  res.status(status).json({ message: process.env.NODE_ENV === 'development' ? message : 'Internal Server Error' });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const port = parseInt(process.env.PORT || '5000', 10);
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`✅ Production server running on port ${port}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📊 Database connected: ${process.env.DATABASE_URL ? '✅' : '❌'}`);
});
