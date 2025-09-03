# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies that might be needed
RUN apk add --no-cache python3 make g++

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --silent

# Copy all source files
COPY . .

# Build the application
RUN npm run build

# Remove development dependencies to reduce image size
RUN npm prune --production --silent

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set environment to production
ENV NODE_ENV=production

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Health check with proper error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e " \
    const http = require('http'); \
    const options = { \
      hostname: 'localhost', \
      port: process.env.PORT || 5000, \
      path: '/health', \
      method: 'GET', \
      timeout: 8000 \
    }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# Start the production server
CMD ["node", "dist/production.js"]
