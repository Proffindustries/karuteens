import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/marketplace/[id]/messages - Get messages for a listing
export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}
		
		const { id: listingId } = params;
		
		if (!listingId) {
			throw error(400, 'Listing ID is required');
		}
		
		const supabase = locals.supabase;
		
		// Check if user is either the seller or has sent/received messages for this listing
		const { data: listing, error: listingError } = await supabase
			.from('marketplace_listings')
			.select('seller_id')
			.eq('id', listingId)
			.single();
		
		if (listingError) {
			if (listingError.code === 'PGRST116') {
				throw error(404, 'Listing not found');
			}
			throw new Error(listingError.message);
		}
		
		// Get query parameters for pagination
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		
		// Build query for messages
		let query = supabase
			.from('listing_messages')
			.select(`
				*,
				sender:profiles!listing_messages_sender_id_fkey(username, avatar_url),
				receiver:profiles!listing_messages_receiver_id_fkey(username, avatar_url)
			`)
			.eq('listing_id', listingId)
			.range(offset, offset + limit - 1)
			.order('created_at', { ascending: true });
		
		const { data, error: fetchError } = await query;
		
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
		console.error('Error fetching messages:', err);
		throw error(500, err.message || 'Failed to fetch messages');
	}
};

// POST /api/marketplace/[id]/messages - Send a message for a listing
export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}
		
		const { id: listingId } = params;
		
		if (!listingId) {
			throw error(400, 'Listing ID is required');
		}
		
		const supabase = locals.supabase;
		
		// Check if listing exists
		const { data: listing, error: listingError } = await supabase
			.from('marketplace_listings')
			.select('seller_id')
			.eq('id', listingId)
			.single();
		
		if (listingError) {
			if (listingError.code === 'PGRST116') {
				throw error(404, 'Listing not found');
			}
			throw new Error(listingError.message);
		}
		
		// Parse request body
		const body = await request.json();
		
		// Validate required fields
		if (!body.message) {
			throw error(400, 'Message content is required');
		}
		
		// Determine receiver (seller if user is not seller, otherwise we'd need to specify)
		const receiverId = listing.seller_id === user.id ? listing.seller_id : listing.seller_id;
		
		// Create message
		const { data, error: insertError } = await supabase
			.from('listing_messages')
			.insert({
				listing_id: listingId,
				sender_id: user.id,
				receiver_id: receiverId,
				message: body.message
			})
			.select(`
				*,
				sender:profiles!listing_messages_sender_id_fkey(username, avatar_url),
				receiver:profiles!listing_messages_receiver_id_fkey(username, avatar_url)
			`)
			.single();
		
		if (insertError) {
			throw new Error(insertError.message);
		}
		
		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error sending message:', err);
		throw error(500, err.message || 'Failed to send message');
	}
};