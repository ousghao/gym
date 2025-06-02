import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import 'dotenv/config'; // Loads .env


const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  console.error('Please create a .env file with DATABASE_URL=postgresql://username:password@localhost:5432/gym_assistant');
  process.exit(1);
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema }); 