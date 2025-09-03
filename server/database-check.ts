import { neon } from '@neondatabase/serverless';

export async function ensureDatabaseReady(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.warn('⚠️  Starting server without database - some features may not work');
    return;
  }

  console.log('🔗 Checking database connection...');
  
  try {
    const sql = neon(databaseUrl);
    
    // Test basic connectivity with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database connection timeout')), 5000);
    });
    
    const connectPromise = sql`SELECT 1 as test`;
    
    const result = await Promise.race([connectPromise, timeoutPromise]);
    
    if (Array.isArray(result) && result[0]?.test === 1) {
      console.log('✅ Database connection successful');
      
      // Check if tables exist (basic health check)
      try {
        await sql`SELECT COUNT(*) FROM clients LIMIT 1`;
        console.log('✅ Database tables accessible');
      } catch (tableError) {
        console.warn('⚠️  Database tables may not exist yet. Run migrations if needed.');
        console.warn('💡 You can run: npm run db:push');
      }
    } else {
      throw new Error('Unexpected database response');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('🔧 Please check your DATABASE_URL and ensure the database is accessible');
    
    // In production, be more lenient to allow Railway to start the service
    // The database might become available after the service starts
    console.warn('⚠️  Production mode: Starting server despite database connection failure');
    console.warn('🚀 Server will attempt to reconnect when requests are made');
    console.warn('� Ensure DATABASE_URL is correct in your Railway environment variables');
  }
}
