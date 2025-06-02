import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes.js';
import { setupVite, serveStatic, log } from './vite.js';
import { DbStorage } from './db-storage.js';
import { createServer } from 'http';

const app = express();
const httpServer = createServer(app);
const storage = new DbStorage();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging
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
      log(logLine);
    }
  });

  next();
});

// Routes
await registerRoutes(app, storage);

app.get('/', (_req, res) => {
  res.send('✅ API is up and running');
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error("Unhandled error:", err);
});

// Vite setup or static
if (app.get("env") === "development") {
  await setupVite(app, httpServer);
} else {
  serveStatic(app);
}

// ✅ Correct usage of httpServer
const port = parseInt(process.env.PORT || '5000', 10);
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
