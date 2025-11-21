import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/marketplace/[id] - Get a specific listing
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const { id } = params;
		
		if (!id) {
			throw error(400, 'Listing ID is required');
		}
		
		const supabase = locals.supabase;
		
		// Fetch listing with seller info
		const { data, error: fetchError } = await supabase
			.from('marketplace_listings')
			.select('*, profiles!marketplace_listings_seller_id_fkey(username, avatar_url)')
			.eq('id', id)
			.single();
		
		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				// No rows returned
				throw error(404, 'Listing not found');
			}
			throw new Error(fetchError.message);
		}
		
		// Increment view count
		await supabase
			.from('marketplace_listings')
			.update({ views: data.views + 1 })
			.eq('id', id);
		
		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error fetching listing:', err);
		throw error(500, err.message || 'Failed to fetch listing');
	}
};

// PUT /api/marketplace/[id] - Update a listing
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}
		
		const { id } = params;
		
		if (!id) {
			throw error(400, 'Listing ID is required');
		}
		
		const supabase = locals.supabase;
		
		// Check if listing exists and user is the seller
		const { data: existingListing, error: fetchError } = await supabase
			.from('marketplace_listings')
			.select('id, seller_id')
			.eq('id', id)
			.eq('seller_id', user.id)
			.maybeSingle();
		
		if (fetchError) {
			throw new Error(fetchError.message);
		}
		
		if (!existingListing) {
			throw error(404, 'Listing not found or unauthorized');
		}
		
		// Parse request body
		const body = await request.json();
		
		// Update listing
		const { data, error: updateError } = await supabase
			.from('marketplace_listings')
			.update({
				title: body.title,
				description: body.description,
				category: body.category,
				price: body.price ? Math.round(parseFloat(body.price) * 100) : undefined, // convert to cents
				condition: body.condition,
				images: body.images,
				location: body.location,
				is_available: body.is_available,
				updated_at: new Date()
			})
			.eq('id', id)
			.select('*, profiles!marketplace_listings_seller_id_fkey(username, avatar_url)')
			.single();
		
		if (updateError) {
			throw new Error(updateError.message);
		}
		
		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error updating listing:', err);
		throw error(500, err.message || 'Failed to update listing');
	}
};

// DELETE /api/marketplace/[id] - Delete a listing
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}
		
		const { id } = params;
		
		if (!id) {
			throw error(400, 'Listing ID is required');
		}
		
		const supabase = locals.supabase;
		
		// Check if listing exists and user is the seller
		const { data: existingListing, error: fetchError } = await supabase
			.from('marketplace_listings')
			.select('id, seller_id')
			.eq('id', id)
			.eq('seller_id', user.id)
			.maybeSingle();
		
		if (fetchError) {
			throw new Error(fetchError.message);
		}
		
		if (!existingListing) {
			throw error(404, 'Listing not found or unauthorized');
		}
		
		// Delete listing
		const { error: deleteError } = await supabase
			.from('marketplace_listings')
			.delete()
			.eq('id', id);
		
		if (deleteError) {
			throw new Error(deleteError.message);
		}
		
		return json({
			success: true,
			message: 'Listing deleted successfully'
		});
	} catch (err: any) {
		console.error('Error deleting listing:', err);
		throw error(500, err.message || 'Failed to delete listing');
	}
};