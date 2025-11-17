import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/notifications/read - Mark all notifications as read
export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		// Use Supabase client directly
		const supabase = locals.supabase;

		// Parse request body
		const body = await request.json();
		const { ids } = body;

		// If specific IDs are provided, mark those as read
		if (ids && Array.isArray(ids)) {
			const { data, error: updateError } = await supabase
				.from('notifications')
				.update({
					read: true,
					updated_at: new Date()
				})
				.in('id', ids)
				.eq('user_id', user.id);

			if (updateError) {
				throw new Error(updateError.message);
			}

			return json({
				success: true,
				message: `Marked ${ids.length} notifications as read`
			});
		} else {
			// Otherwise, mark all unread notifications as read
			const { data, error: updateError } = await supabase
				.from('notifications')
				.update({
					read: true,
					updated_at: new Date()
				})
				.eq('user_id', user.id)
				.eq('read', false);

			if (updateError) {
				throw new Error(updateError.message);
			}

			return json({
				success: true,
				message: 'Marked all unread notifications as read'
			});
		}
	} catch (err: any) {
		console.error('Error marking notifications as read:', err);
		throw error(500, err.message || 'Failed to mark notifications as read');
	}
};