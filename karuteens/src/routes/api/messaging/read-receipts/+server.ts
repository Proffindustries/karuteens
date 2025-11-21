import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/messaging/read-receipts - Mark messages as read
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}
		
		const supabase = locals.supabase;
		
		// Parse request body
		const body = await request.json();
		const { conversationId, messageIds } = body;
		
		if (!conversationId) {
			throw error(400, 'Conversation ID is required');
		}
		
		// Mark specific messages as read
		let updateQuery = supabase
			.from('direct_messages')
			.update({ is_read: true })
			.eq('conversation_id', conversationId)
			.eq('is_read', false)
			.neq('sender_id', user.id);
		
		// If specific message IDs are provided, filter by them
		if (Array.isArray(messageIds) && messageIds.length > 0) {
			updateQuery = updateQuery.in('id', messageIds);
		}
		
		const { error: updateError } = await updateQuery;
		
		if (updateError) {
			throw new Error(updateError.message);
		}
		
		// Update participant's last read timestamp
		const { error: participantError } = await supabase
			.from('conversation_participants')
			.update({ last_read_at: new Date().toISOString() })
			.eq('conversation_id', conversationId)
			.eq('user_id', user.id);
		
		if (participantError) {
			throw new Error(participantError.message);
		}
		
		return json({
			success: true,
			message: 'Messages marked as read'
		});
	} catch (err: any) {
		console.error('Error marking messages as read:', err);
		throw error(500, err.message || 'Failed to mark messages as read');
	}
};