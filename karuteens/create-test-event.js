import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function createTestEvent() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Get an existing profile ID
    const profileResult = await client.query('SELECT id FROM profiles LIMIT 1;');
    const organizerId = profileResult.rows[0].id;
    
    console.log(`Using organizer ID: ${organizerId}`);
    
    // Create a test event
    const eventResult = await client.query(`
      INSERT INTO events (
        organizer_id, 
        title, 
        description, 
        category, 
        start_time, 
        end_time, 
        location, 
        is_online
      ) VALUES (
        $1, 
        $2, 
        $3, 
        $4, 
        $5, 
        $6, 
        $7, 
        $8
      ) RETURNING id, title;
    `, [
      organizerId,
      'Test Event',
      'This is a test event created from script',
      'social',
      new Date('2025-12-01T10:00:00Z'),
      new Date('2025-12-01T12:00:00Z'),
      'Karatu University',
      false
    ]);
    
    console.log('✅ Event created successfully:');
    console.log(`  - ID: ${eventResult.rows[0].id}`);
    console.log(`  - Title: ${eventResult.rows[0].title}`);
    
    await client.end();
  } catch (error) {
    console.error('❌ Error creating event:', error.message);
    await client.end();
  }
}

createTestEvent();