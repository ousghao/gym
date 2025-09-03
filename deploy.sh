#!/bin/bash

# Quick deployment script for Railway
echo "🚀 Deploying Gym Management App to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Build the project
echo "📦 Building the project..."
npm run build

# Login to Railway (if not already logged in)
echo "🔐 Please login to Railway..."
railway login

# Create new project or use existing
echo "🏗️  Setting up Railway project..."
if [ ! -f "railway.toml" ]; then
    echo "No railway.toml found, this shouldn't happen as it exists in your project."
fi

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete! Check your Railway dashboard for the URL."
echo "📋 Don't forget to:"
echo "   1. Add PostgreSQL service in Railway dashboard"
echo "   2. Set environment variables (DATABASE_URL, GEMINI_API_KEY)"
echo "   3. Run database migrations if needed"
