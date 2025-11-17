import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function createTestAttendee() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Get the event ID we just created
    const eventResult = await client.query('SELECT id FROM events ORDER BY created_at DESC LIMIT 1;');
    const eventId = eventResult.rows[0].id;
    
    // Get another profile ID (different from organizer)
    const profileResult = await client.query('SELECT id FROM profiles WHERE id != (SELECT organizer_id FROM events WHERE id = $1) LIMIT 1;', [eventId]);
    const userId = profileResult.rows[0].id;
    
    console.log(`Using event ID: ${eventId}`);
    console.log(`Using user ID: ${userId}`);
    
    // Create a test attendee
    const attendeeResult = await client.query(`
      INSERT INTO event_attendees (
        event_id, 
        user_id, 
        status
      ) VALUES (
        $1, 
        $2, 
        $3
      ) RETURNING id, status;
    `, [
      eventId,
      userId,
      'going'
    ]);
    
    console.log('✅ Attendee created successfully:');
    console.log(`  - ID: ${attendeeResult.rows[0].id}`);
    console.log(`  - Status: ${attendeeResult.rows[0].status}`);
    
    await client.end();
  } catch (error) {
    console.error('❌ Error creating attendee:', error.message);
    await client.end();
  }
}

createTestAttendee();