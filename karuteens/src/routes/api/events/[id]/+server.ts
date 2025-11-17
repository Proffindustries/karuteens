import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/events/[id] - Get a specific event
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const { id } = params;
		
		if (!id) {
			throw error(400, 'Event ID is required');
		}

		// Use the supabase client from locals
		const supabase = locals.supabase;

		// Fetch event
		const { data, error: fetchError } = await supabase
			.from('events')
			.select('*')
			.eq('id', id)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				// No rows returned
				throw error(404, 'Event not found');
			}
			throw new Error(fetchError.message);
		}

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error fetching event:', err);
		throw error(500, err.message || 'Failed to fetch event');
	}
};

// PUT /api/events/[id] - Update a specific event
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const { id } = params;
		
		if (!id) {
			throw error(400, 'Event ID is required');
		}

		// Use the supabase client from locals
		const supabase = locals.supabase;

		// Check if event exists and user is the organizer
		const { data: existingEvent, error: fetchError } = await supabase
			.from('events')
			.select('organizer_id')
			.eq('id', id)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				// No rows returned
				throw error(404, 'Event not found');
			}
			throw new Error(fetchError.message);
		}

		if (existingEvent.organizer_id !== user.id) {
			throw error(403, 'Forbidden: You are not the organizer of this event');
		}

		// Parse request body
		const body = await request.json();

		// Update event
		const { data, error: updateError } = await supabase
			.from('events')
			.update({
				title: body.title,
				description: body.description,
				location: body.location,
				is_online: body.isOnline,
				meeting_url: body.meetingUrl,
				cover_url: body.coverUrl,
				category: body.category,
				start_time: body.startTime ? new Date(body.startTime) : undefined,
				end_time: body.endTime ? new Date(body.endTime) : undefined,
				max_attendees: body.maxAttendees,
				is_public: body.isPublic,
				updated_at: new Date()
			})
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			throw new Error(updateError.message);
		}

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error updating event:', err);
		throw error(500, err.message || 'Failed to update event');
	}
};

// DELETE /api/events/[id] - Delete a specific event
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const { id } = params;
		
		if (!id) {
			throw error(400, 'Event ID is required');
		}

		// Use the supabase client from locals
		const supabase = locals.supabase;

		// Check if event exists and user is the organizer
		const { data: existingEvent, error: fetchError } = await supabase
			.from('events')
			.select('organizer_id')
			.eq('id', id)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				// No rows returned
				throw error(404, 'Event not found');
			}
			throw new Error(fetchError.message);
		}

		if (existingEvent.organizer_id !== user.id) {
			throw error(403, 'Forbidden: You are not the organizer of this event');
		}

		// Delete event
		const { error: deleteError } = await supabase
			.from('events')
			.delete()
			.eq('id', id);

		if (deleteError) {
			throw new Error(deleteError.message);
		}

		return json({
			success: true,
			message: 'Event deleted successfully'
		});
	} catch (err: any) {
		console.error('Error deleting event:', err);
		throw error(500, err.message || 'Failed to delete event');
	}
};