import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/notifications - Get user notifications
export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		// Use Supabase client directly
		const supabase = locals.supabase;

		// Get query parameters
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

		// Build query
		let query = supabase
			.from('notifications')
			.select('*')
			.eq('user_id', user.id);

		// Apply unread filter if requested
		if (unreadOnly) {
			query = query.eq('read', false);
		}

		// Apply ordering and pagination
		const { data, error: fetchError } = await query
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (fetchError) {
			throw new Error(fetchError.message);
		}

		// Get total count for pagination
		let countQuery = supabase
			.from('notifications')
			.select('id', { count: 'exact' })
			.eq('user_id', user.id);
			
		if (unreadOnly) {
			countQuery = countQuery.eq('read', false);
		}
		
		const { count, error: countError } = await countQuery;
		
		if (countError) {
			throw new Error(countError.message);
		}

		return json({
			success: true,
			data,
			count: count || 0,
			limit,
			offset
		});
	} catch (err: any) {
		console.error('Error fetching notifications:', err);
		throw error(500, err.message || 'Failed to fetch notifications');
	}
};

// PUT /api/notifications/[id] - Update notification (mark as read)
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const { id } = params;
		
		if (!id) {
			throw error(400, 'Notification ID is required');
		}

		// Use Supabase client directly
		const supabase = locals.supabase;

		// Parse request body
		const body = await request.json();
		const { read } = body;

		// Update notification
		const { data, error: updateError } = await supabase
			.from('notifications')
			.update({
				read,
				updated_at: new Date()
			})
			.eq('id', id)
			.eq('user_id', user.id)
			.select()
			.single();

		if (updateError) {
			if (updateError.code === 'PGRST116') {
				// No rows returned
				throw error(404, 'Notification not found');
			}
			throw new Error(updateError.message);
		}

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error updating notification:', err);
		throw error(500, err.message || 'Failed to update notification');
	}
};

// DELETE /api/notifications/[id] - Delete notification
export const DELETE: RequestHandler = async ({ locals, params }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const { id } = params;
		
		if (!id) {
			throw error(400, 'Notification ID is required');
		}

		// Use Supabase client directly
		const supabase = locals.supabase;

		// Delete notification
		const { error: deleteError } = await supabase
			.from('notifications')
			.delete()
			.eq('id', id)
			.eq('user_id', user.id);

		if (deleteError) {
			throw new Error(deleteError.message);
		}

		return json({
			success: true,
			message: 'Notification deleted successfully'
		});
	} catch (err: any) {
		console.error('Error deleting notification:', err);
		throw error(500, err.message || 'Failed to delete notification');
	}
};