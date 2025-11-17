import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/events - List all events
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Use the supabase client from locals
		const supabase = locals.supabase;
		
		// Get query parameters for filtering
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const category = url.searchParams.get('category');
		const isPublic = url.searchParams.get('isPublic');

		// Build query
		let query = supabase
			.from('events')
			.select('*');
		
		// Apply filters
		if (category) {
			query = query.eq('category', category);
		}
		
		if (isPublic !== null) {
			query = query.eq('is_public', isPublic === 'true');
		}

		// Apply pagination
		const { data, error } = await query
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(error.message);
		}

		return json({
			success: true,
			data,
			limit,
			offset
		});
	} catch (error) {
		console.error('Error fetching events:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch events'
			},
			{ status: 500 }
		);
	}
};

// POST /api/events - Create a new event
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		// Use the supabase client from locals
		const supabase = locals.supabase;

		// Parse request body
		const body = await request.json();
		
		// Validate required fields
		if (!body.title || !body.category || !body.startTime) {
			throw error(400, 'Title, category, and startTime are required');
		}

		// Create event
		const { data, error } = await supabase
			.from('events')
			.insert({
				organizer_id: user.id,
				title: body.title,
				description: body.description,
				location: body.location,
				is_online: body.isOnline || false,
				meeting_url: body.meetingUrl,
				cover_url: body.coverUrl,
				category: body.category,
				start_time: new Date(body.startTime),
				end_time: body.endTime ? new Date(body.endTime) : undefined,
				max_attendees: body.maxAttendees,
				is_public: body.isPublic !== undefined ? body.isPublic : true
			})
			.select()
			.single();

		if (error) {
			throw new Error(error.message);
		}

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error creating event:', err);
		throw error(500, err.message || 'Failed to create event');
	}
};