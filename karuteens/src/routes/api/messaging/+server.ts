import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/messaging/typing - Send typing indicator
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
		const { conversationId, isTyping } = body;
		
		if (!conversationId) {
			throw error(400, 'Conversation ID is required');
		}
		
		// In a real implementation, we would use WebSocket/Socket.io to broadcast typing status
		// For now, we'll store typing status in a temporary table or use Supabase real-time
		
		// Update typing status in conversation participants
		const { error: updateError } = await supabase
			.from('conversation_participants')
			.update({ 
				typing: isTyping,
				typing_updated_at: isTyping ? new Date().toISOString() : null
			})
			.eq('conversation_id', conversationId)
			.eq('user_id', user.id);
		
		if (updateError) {
			throw new Error(updateError.message);
		}
		
		return json({
			success: true,
			message: 'Typing status updated'
		});
	} catch (err: any) {
		console.error('Error updating typing status:', err);
		throw error(500, err.message || 'Failed to update typing status');
	}
};

// GET /api/messaging/delivery-status - Get message delivery status
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}
		
		const supabase = locals.supabase;
		
		// Get query parameters
		const messageId = url.searchParams.get('message_id');
		
		if (!messageId) {
			throw error(400, 'Message ID is required');
		}
		
		// Get message with delivery status
		const { data, error: fetchError } = await supabase
			.from('direct_messages')
			.select('id, is_read, created_at')
			.eq('id', messageId)
			.single();
		
		if (fetchError) {
			throw new Error(fetchError.message);
		}
		
		return json({
			success: true,
			data: {
				message_id: data.id,
				delivered: true, // Assuming delivered if we can fetch it
				read: data.is_read,
				delivered_at: data.created_at,
				read_at: data.is_read ? data.created_at : null
			}
		});
	} catch (err: any) {
		console.error('Error fetching delivery status:', err);
		throw error(500, err.message || 'Failed to fetch delivery status');
	}
};