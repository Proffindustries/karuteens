import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/marketplace/search - Search listings
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const supabase = locals.supabase;
		
		// Get query parameters
		const query = url.searchParams.get('q');
		const category = url.searchParams.get('category');
		const condition = url.searchParams.get('condition');
		const minPrice = url.searchParams.get('min_price');
		const maxPrice = url.searchParams.get('max_price');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		
		if (!query) {
			throw error(400, 'Search query is required');
		}
		
		// Build search query
		let dbQuery = supabase
			.from('marketplace_listings')
			.select('*, profiles!marketplace_listings_seller_id_fkey(username, avatar_url)')
			.eq('is_available', true)
			.range(offset, offset + limit - 1)
			.order('created_at', { ascending: false });
		
		// Apply text search
		if (query) {
			dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
		}
		
		// Apply category filter
		if (category && category !== 'all') {
			dbQuery = dbQuery.eq('category', category);
		}
		
		// Apply condition filter
		if (condition && condition !== 'all') {
			dbQuery = dbQuery.eq('condition', condition);
		}
		
		// Apply price range filters
		if (minPrice) {
			dbQuery = dbQuery.gte('price', Math.round(parseFloat(minPrice) * 100));
		}
		
		if (maxPrice) {
			dbQuery = dbQuery.lte('price', Math.round(parseFloat(maxPrice) * 100));
		}
		
		const { data, error: fetchError } = await dbQuery;
		
		if (fetchError) {
			throw new Error(fetchError.message);
		}
		
		return json({
			success: true,
			data,
			query,
			limit,
			offset
		});
	} catch (err: any) {
		console.error('Error searching listings:', err);
		throw error(500, err.message || 'Failed to search listings');
	}
};

// POST /api/marketplace/search - Alternative search method
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const supabase = locals.supabase;
		
		// Parse request body
		const body = await request.json();
		
		const { 
			query, 
			category, 
			condition, 
			minPrice, 
			maxPrice, 
			limit = 20, 
			offset = 0 
		} = body;
		
		if (!query) {
			throw error(400, 'Search query is required');
		}
		
		// Build search query
		let dbQuery = supabase
			.from('marketplace_listings')
			.select('*, profiles!marketplace_listings_seller_id_fkey(username, avatar_url)')
			.eq('is_available', true)
			.range(offset, offset + limit - 1)
			.order('created_at', { ascending: false });
		
		// Apply text search
		if (query) {
			dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
		}
		
		// Apply category filter
		if (category && category !== 'all') {
			dbQuery = dbQuery.eq('category', category);
		}
		
		// Apply condition filter
		if (condition && condition !== 'all') {
			dbQuery = dbQuery.eq('condition', condition);
		}
		
		// Apply price range filters
		if (minPrice) {
			dbQuery = dbQuery.gte('price', Math.round(parseFloat(minPrice) * 100));
		}
		
		if (maxPrice) {
			dbQuery = dbQuery.lte('price', Math.round(parseFloat(maxPrice) * 100));
		}
		
		const { data, error: fetchError } = await dbQuery;
		
		if (fetchError) {
			throw new Error(fetchError.message);
		}
		
		return json({
			success: true,
			data,
			query,
			limit,
			offset
		});
	} catch (err: any) {
		console.error('Error searching listings:', err);
		throw error(500, err.message || 'Failed to search listings');
	}
};