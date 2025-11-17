import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function createTestComment() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Get the event ID we created earlier
    const eventResult = await client.query('SELECT id FROM events ORDER BY created_at DESC LIMIT 1;');
    const eventId = eventResult.rows[0].id;
    
    // Get the user ID we used for the attendee
    const userResult = await client.query('SELECT user_id FROM event_attendees ORDER BY joined_at DESC LIMIT 1;');
    const userId = userResult.rows[0].user_id;
    
    console.log(`Using event ID: ${eventId}`);
    console.log(`Using user ID: ${userId}`);
    
    // Create a test comment
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
      userId,
      'This is a test comment on the event!'
    ]);
    
    console.log('✅ Comment created successfully:');
    console.log(`  - ID: ${commentResult.rows[0].id}`);
    console.log(`  - Content: ${commentResult.rows[0].content}`);
    
    await client.end();
  } catch (error) {
    console.error('❌ Error creating comment:', error.message);
    await client.end();
  }
}

createTestComment();