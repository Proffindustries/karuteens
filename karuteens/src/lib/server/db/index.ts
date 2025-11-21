import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

if (!env.DATABASE_URL) {
	console.warn('DATABASE_URL not set - using for schema checks/migrations only, Supabase for runtime');
	const { drizzle } = await import('drizzle-orm/postgres-js');
	const postgres = await import('postgres');
	export const db = null as any; // Mock for build/prod without direct DB
	return;
}

// Configure postgres client with options that work with Supabase
const client = postgres(env.DATABASE_URL, {
  // Add connection pooling options
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });