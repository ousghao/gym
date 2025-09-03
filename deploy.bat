@echo off
echo 🚀 Deploying Gym Management App to Railway...

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Railway CLI...
    npm install -g @railway/cli
)

REM Build the project
echo 📦 Building the project...
call npm run build

REM Login to Railway
echo 🔐 Please login to Railway...
call railway login

REM Deploy
echo 🚀 Deploying to Railway...
call railway up

echo ✅ Deployment complete! Check your Railway dashboard for the URL.
echo 📋 Don't forget to:
echo    1. Add PostgreSQL service in Railway dashboard
echo    2. Set environment variables (DATABASE_URL, GEMINI_API_KEY)
echo    3. Run database migrations if needed

pause
