import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Database connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT version();');
    console.log('✅ Query executed successfully:', result.rows[0]);
    
    await client.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    await client.end();
  }
}

testConnection();