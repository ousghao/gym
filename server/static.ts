import express, { Express, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, '..', 'dist', 'public');
  
  console.log(`📁 Looking for static files in: ${distPath}`);
  
  if (!existsSync(distPath)) {
    console.warn(`⚠️  Static files directory not found: ${distPath}`);
    console.warn('📦 Make sure to run "npm run build" before starting the production server');
  }

  // Serve static files from the dist/public directory
  app.use(express.static(distPath, {
    maxAge: '1d', // Cache static assets for 1 day
    setHeaders: (res, path) => {
      // Cache HTML files for a shorter time
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400');
      }
    }
  }));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req: Request, res: Response) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return res.status(404).json({ message: 'Route not found' });
    }

    const indexPath = path.join(distPath, 'index.html');
    
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`❌ index.html not found at: ${indexPath}`);
      res.status(500).json({ 
        message: 'Application not built. Run npm run build first.',
        path: indexPath
      });
    }
  });

  console.log('✅ Static file serving configured');
}
