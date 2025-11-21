import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/events/[id]/comments - Get all comments for an event
export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		const { id: eventId } = params;
		
		if (!eventId) {
			throw error(400, 'Event ID is required');
		}

		// Use the supabase client from locals
		const supabase = locals.supabase;

		// Get query parameters for pagination
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Fetch comments
		const { data, error: fetchError } = await supabase
			.from('event_comments')
			.select(`
				*,
				profiles:user_id(id, first_name, last_name, avatar_url)
			`)
			.eq('event_id', eventId)
			.range(offset, offset + limit - 1)
			.order('created_at', { ascending: true });

		if (fetchError) {
			throw new Error(fetchError.message);
		}

		return json({
			success: true,
			data,
			limit,
			offset
		});
	} catch (err: any) {
		console.error('Error fetching comments:', err);
		throw error(500, err.message || 'Failed to fetch comments');
	}
};

// POST /api/events/[id]/comments - Add a comment to an event
export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const { id: eventId } = params;
		
		if (!eventId) {
			throw error(400, 'Event ID is required');
		}

		// Use the supabase client from locals
		const supabase = locals.supabase;

		// Check if event exists
		const { data: event, error: eventError } = await supabase
			.from('events')
			.select('id')
			.eq('id', eventId)
			.single();

		if (eventError) {
			if (eventError.code === 'PGRST116') {
				// No rows returned
				throw error(404, 'Event not found');
			}
			throw new Error(eventError.message);
		}

		// Parse request body
		const body = await request.json();
		
		// Validate required fields
		if (!body.content) {
			throw error(400, 'Content is required');
		}

		// Create comment
		const { data, error: insertError } = await supabase
			.from('event_comments')
			.insert({
				event_id: eventId,
				user_id: user.id,
				content: body.content
			})
			.select()
			.single();

		if (insertError) {
			throw new Error(insertError.message);
		}

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error adding comment:', err);
		throw error(500, err.message || 'Failed to add comment');
	}
};