import { neon } from '@neondatabase/serverless';

export async function ensureDatabaseReady(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL is required');
  }

  console.log('🔗 Checking database connection...');
  
  try {
    const sql = neon(databaseUrl);
    
    // Test basic connectivity
    const result = await sql`SELECT 1 as test`;
    
    if (result && result[0]?.test === 1) {
      console.log('✅ Database connection successful');
    } else {
      throw new Error('Unexpected database response');
    }

    // Check if tables exist (basic health check)
    try {
      await sql`SELECT COUNT(*) FROM clients LIMIT 1`;
      console.log('✅ Database tables accessible');
    } catch (tableError) {
      console.warn('⚠️  Database tables may not exist yet. Run migrations if needed.');
      console.warn('💡 You can run: npm run db:push');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('🔧 Please check your DATABASE_URL and ensure the database is accessible');
    
    // In production, we should fail fast, but for development/testing, we can continue
    if (process.env.NODE_ENV === 'production' && !process.env.SKIP_DB_CHECK) {
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } else {
      console.warn('⚠️  Skipping database check (set SKIP_DB_CHECK=false to enforce)');
      console.warn('🚀 Starting server without database verification...');
    }
  }
}
