import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PUT /api/events/[id]/comments/[commentId] - Update a comment
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const { id: eventId, commentId } = params;
		
		if (!eventId || !commentId) {
			throw error(400, 'Event ID and Comment ID are required');
		}

		// Use the supabase client from locals
		const supabase = locals.supabase;

		// Check if comment exists and user is the author
		const { data: existingComment, error: fetchError } = await supabase
			.from('event_comments')
			.select('id')
			.eq('id', commentId)
			.eq('user_id', user.id)
			.maybeSingle();

		if (fetchError) {
			throw new Error(fetchError.message);
		}
		
		if (!existingComment) {
			throw error(404, 'Comment not found or unauthorized');
		}

		// Parse request body
		const body = await request.json();
		
		// Validate required fields
		if (!body.content) {
			throw error(400, 'Content is required');
		}

		// Update comment
		const { data, error: updateError } = await supabase
			.from('event_comments')
			.update({
				content: body.content,
				updated_at: new Date()
			})
			.eq('id', commentId)
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
		console.error('Error updating comment:', err);
		throw error(500, err.message || 'Failed to update comment');
	}
};

// DELETE /api/events/[id]/comments/[commentId] - Delete a comment
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const { id: eventId, commentId } = params;
		
		if (!eventId || !commentId) {
			throw error(400, 'Event ID and Comment ID are required');
		}

		// Use the supabase client from locals
		const supabase = locals.supabase;

		// Check if comment exists and user is the author
		const { data: existingComment, error: fetchError } = await supabase
			.from('event_comments')
			.select('id')
			.eq('id', commentId)
			.eq('user_id', user.id)
			.maybeSingle();

		if (fetchError) {
			throw new Error(fetchError.message);
		}
		
		if (!existingComment) {
			throw error(404, 'Comment not found or unauthorized');
		}

		// Delete comment
		const { error: deleteError } = await supabase
			.from('event_comments')
			.delete()
			.eq('id', commentId);

		if (deleteError) {
			throw new Error(deleteError.message);
		}

		return json({
			success: true,
			message: 'Comment deleted successfully'
		});
	} catch (err: any) {
		console.error('Error deleting comment:', err);
		throw error(500, err.message || 'Failed to delete comment');
	}
};