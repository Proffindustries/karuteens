import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/marketplace/listings - Get all listings with optional filters
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const supabase = locals.supabase;
		
		// Get query parameters
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const category = url.searchParams.get('category');
		const condition = url.searchParams.get('condition');
		const search = url.searchParams.get('search');
		const sellerId = url.searchParams.get('seller_id');
		
		// Build query
		let query = supabase
			.from('marketplace_listings')
			.select('*, profiles!marketplace_listings_seller_id_fkey(username, avatar_url)')
			.eq('is_available', true)
			.range(offset, offset + limit - 1)
			.order('created_at', { ascending: false });
		
		// Apply filters
		if (category && category !== 'all') {
			query = query.eq('category', category);
		}
		
		if (condition && condition !== 'all') {
			query = query.eq('condition', condition);
		}
		
		if (search) {
			query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
		}
		
		if (sellerId) {
			query = query.eq('seller_id', sellerId);
		}
		
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
		console.error('Error fetching listings:', err);
		throw error(500, err.message || 'Failed to fetch listings');
	}
};

// POST /api/marketplace/listings - Create a new listing
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
		
		// Validate required fields
		if (!body.title || !body.category || !body.price || !body.condition) {
			throw error(400, 'Title, category, price, and condition are required');
		}
		
		// Create listing
		const { data, error: insertError } = await supabase
			.from('marketplace_listings')
			.insert({
				seller_id: user.id,
				title: body.title,
				description: body.description || null,
				category: body.category,
				price: Math.round(parseFloat(body.price) * 100), // convert to cents
				condition: body.condition,
				images: body.images || null,
				location: body.location || null
			})
			.select('*, profiles!marketplace_listings_seller_id_fkey(username, avatar_url)')
			.single();
		
		if (insertError) {
			throw new Error(insertError.message);
		}
		
		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error creating listing:', err);
		throw error(500, err.message || 'Failed to create listing');
	}
};