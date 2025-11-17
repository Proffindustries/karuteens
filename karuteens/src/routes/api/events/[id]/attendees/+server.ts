import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/events/[id]/attendees - List attendees for an event
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const { id: eventId } = params;
		
		if (!eventId) {
			throw error(400, 'Event ID is required');
		}

		// Use the supabase client from locals
		const supabase = locals.supabase;

		// Fetch attendees
		const { data, error: fetchError } = await supabase
			.from('event_attendees')
			.select(`
				*,
				profiles:user_id(id, first_name, last_name, avatar_url)
			`)
			.eq('event_id', eventId);

		if (fetchError) {
			throw new Error(fetchError.message);
		}

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error fetching attendees:', err);
		throw error(500, err.message || 'Failed to fetch attendees');
	}
};

// POST /api/events/[id]/attendees - RSVP to an event
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
		const status = body.status || 'going'; // Default to 'going'

		// Check if user is already attending
		const { data: existingAttendance, error: fetchError } = await supabase
			.from('event_attendees')
			.select('id')
			.eq('event_id', eventId)
			.eq('user_id', user.id)
			.maybeSingle();

		if (fetchError) {
			throw new Error(fetchError.message);
		}

		if (existingAttendance) {
			// Update existing attendance
			const { data, error: updateError } = await supabase
				.from('event_attendees')
				.update({
					status,
					joined_at: new Date()
				})
				.eq('id', existingAttendance.id)
				.select()
				.single();

			if (updateError) {
				throw new Error(updateError.message);
			}

			return json({
				success: true,
				data,
				message: 'Attendance updated successfully'
			});
		} else {
			// Create new attendance
			const { data, error: insertError } = await supabase
				.from('event_attendees')
				.insert({
					event_id: eventId,
					user_id: user.id,
					status
				})
				.select()
				.single();

			if (insertError) {
				throw new Error(insertError.message);
			}

			return json({
				success: true,
				data,
				message: 'RSVP successful'
			});
		}
	} catch (err: any) {
		console.error('Error RSVPing to event:', err);
		throw error(500, err.message || 'Failed to RSVP to event');
	}
};

// DELETE /api/events/[id]/attendees - Cancel attendance
export const DELETE: RequestHandler = async ({ params, locals }) => {
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

		// Delete attendance
		const { error: deleteError } = await supabase
			.from('event_attendees')
			.delete()
			.eq('event_id', eventId)
			.eq('user_id', user.id);

		if (deleteError) {
			throw new Error(deleteError.message);
		}

		return json({
			success: true,
			message: 'Attendance cancelled successfully'
		});
	} catch (err: any) {
		console.error('Error cancelling attendance:', err);
		throw error(500, err.message || 'Failed to cancel attendance');
	}
};