import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/notifications/clear - Clear all notifications
export const POST: RequestHandler = async ({ locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		// Use Supabase client directly
		const supabase = locals.supabase;

		// Delete all notifications for the user
		const { data, error: deleteError } = await supabase
			.from('notifications')
			.delete()
			.eq('user_id', user.id);

		if (deleteError) {
			throw new Error(deleteError.message);
		}

		return json({
			success: true,
			message: 'Cleared all notifications'
		});
	} catch (err: any) {
		console.error('Error clearing notifications:', err);
		throw error(500, err.message || 'Failed to clear notifications');
	}
};