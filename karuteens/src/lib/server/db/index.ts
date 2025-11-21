import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const client = env.DATABASE_URL ? postgres(env.DATABASE_URL, { 
  max: 20, 
  idle_timeout: 20, 
  connect_timeout: 10 
}) : null;

export const db = client ? drizzle(client, { schema }) : null;