import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

if (!env.DATABASE_URL) {
	throw new Error(
		'DATABASE_URL is not set. Please add it to your .env.local file.'
	);
}

// Configure postgres client with options that work with Supabase
const client = postgres(env.DATABASE_URL, {
  // Add connection pooling options
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });