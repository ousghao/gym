# Supabase Setup Guide for Gym Management App

## 🚀 Getting Your Supabase Database URL

### Step 1: Get Your Connection String from Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll down to **Connection String**
5. Select **URI** tab
6. Copy the connection string (it looks like this):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Step 2: Update Your .env File

Replace the `DATABASE_URL` in your `.env` file with your Supabase connection string:

```env
# Database Configuration - Supabase
DATABASE_URL=postgresql://postgres:your_password@db.your_project_ref.supabase.co:5432/postgres

# AI Configuration
GEMINI_API_KEY=AIzaSyBw3dvIId3FcAtDhJXfhXnI6VaWAEsss1Y

# Server Configuration
NODE_ENV=development
PORT=5000
```

### Step 3: Create Database Schema

Run this command to create your tables in Supabase:

```bash
npm run db:push
```

### Step 4: Test the Connection

Start your development server:

```bash
npm run dev
```

If everything is configured correctly, you should see:
```
✅ Server running on http://localhost:5000
```

## 🔧 Troubleshooting

### Common Issues:

1. **Connection Refused**: 
   - Make sure your Supabase project is active
   - Check if the DATABASE_URL is correct

2. **SSL Connection Error**:
   - This is already handled in the code with SSL configuration

3. **Password Issues**:
   - Make sure you're using the correct database password
   - You can reset it in Supabase Settings → Database

### Testing Database Connection:

You can test your connection by visiting: `http://localhost:5000/api/clients`

If it returns `[]` (empty array), the connection is working!

## 🌐 Production Deployment

For Railway deployment, add these environment variables:

```env
DATABASE_URL=your_supabase_connection_string
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=production
PORT=5000
```

## 💡 Supabase Benefits

- ✅ Free tier with 500MB database
- ✅ Built-in authentication (if needed later)
- ✅ Real-time subscriptions
- ✅ Auto-generated APIs
- ✅ Global CDN
- ✅ SSL by default
