// Quick test script to verify database and Supabase connection
import { db } from './src/lib/server/db/index.js';
import { profiles } from './src/lib/server/db/schema.js';
import { count } from 'drizzle-orm';

async function testConnection() {
	try {
		console.log('🔍 Testing database connection...');
		const result = await db.select({ count: count() }).from(profiles);
		console.log('✅ Database connected successfully!');
		console.log(`📊 Profiles table has ${result[0].count} records`);
		process.exit(0);
	} catch (error) {
		console.error('❌ Database connection failed:');
		console.error(error);
		console.log('\n💡 Make sure DATABASE_URL is set correctly in .env.local');
		process.exit(1);
	}
}

testConnection();
