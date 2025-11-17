import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';

// Skip authentication for this test endpoint
export const prerender = false;

// GET /api/test-db - Test database connection
export const GET: RequestHandler = async () => {
	try {
		// Try to query the events table
		const result = await db.select().from(events).limit(1);
		
		return json({
			success: true,
			message: 'Database connection successful',
			data: result
		});
	} catch (error) {
		console.error('Database connection error:', error);
		return json(
			{
				success: false,
				error: 'Database connection failed',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};