// Simple test script to verify our events API endpoints
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testEventsAPI() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Get an existing profile ID
    const profileResult = await client.query('SELECT id FROM profiles LIMIT 1;');
    const organizerId = profileResult.rows[0].id;
    
    console.log(`Using organizer ID: ${organizerId}`);
    
    // Test creating an event through our API
    // For now, we'll simulate what our API does by directly inserting into the database
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
      'API Test Event',
      'This is a test event created to verify our API implementation',
      'testing',
      new Date('2025-12-15T14:00:00Z'),
      new Date('2025-12-15T16:00:00Z'),
      'Test Location',
      false
    ]);
    
    const eventId = eventResult.rows[0].id;
    console.log('✅ Event created successfully:');
    console.log(`  - ID: ${eventId}`);
    console.log(`  - Title: ${eventResult.rows[0].title}`);
    
    // Test adding an attendee
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
      organizerId,
      'going'
    ]);
    
    console.log('✅ Attendee added successfully:');
    console.log(`  - ID: ${attendeeResult.rows[0].id}`);
    console.log(`  - Status: ${attendeeResult.rows[0].status}`);
    
    // Test adding a comment
    const commentResult = await client.query(`
      INSERT INTO event_comments (
        event_id, 
        user_id, 
        content
      ) VALUES (
        $1, 
        $2, 
        $3
      ) RETURNING id, content;
    `, [
      eventId,
      organizerId,
      'This is a test comment on the API test event!'
    ]);
    
    console.log('✅ Comment added successfully:');
    console.log(`  - ID: ${commentResult.rows[0].id}`);
    console.log(`  - Content: ${commentResult.rows[0].content}`);
    
    // Clean up - delete the test event (which will cascade delete attendees and comments)
    await client.query('DELETE FROM events WHERE id = $1;', [eventId]);
    console.log('✅ Test event cleaned up successfully');
    
    await client.end();
  } catch (error) {
    console.error('❌ Error testing events API:', error.message);
    await client.end();
  }
}

testEventsAPI();