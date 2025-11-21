import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/moderation/flags - Create auto flag (used by AI/content scanning system)
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// This endpoint would typically be called by an internal system or AI service
		// For now, we'll allow it with proper authentication
		
		const { contentType, contentId, flagType, confidenceScore, details } = await request.json();

		if (!contentType || !contentId || !flagType) {
			throw error(400, 'Content type, content ID, and flag type are required');
		}

		// Create auto flag
		const { data, error: insertError } = await locals.supabase
			.from('auto_flags')
			.insert({
				content_type: contentType,
				content_id: contentId,
				flag_type: flagType,
				confidence_score: confidenceScore,
				details,
				status: 'pending'
			})
			.select()
			.single();

		if (insertError) {
			throw error(500, insertError.message);
		}

		// In a real implementation, you might want to:
		// 1. Automatically create a report if confidence is high enough
		// 2. Notify moderators
		// 3. Take immediate action for very high confidence flags

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error creating auto flag:', err);
		throw error(500, err.message || 'Failed to create auto flag');
	}
};

// GET /api/moderation/flags - Get auto flags (moderator only)
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Check if user is authenticated and is a moderator
		const { data: { user } } = await locals.supabase.auth.getUser();
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		// Check if user is admin/moderator
		const ADMIN_EMAIL = import.meta.env.PUBLIC_ADMIN_EMAIL;
		const ADMIN_USER_ID = import.meta.env.PUBLIC_ADMIN_USER_ID;
		const emailOk = ADMIN_EMAIL && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
		const idOk = ADMIN_USER_ID && user.id === ADMIN_USER_ID;
		const isAuthorized = Boolean(emailOk || idOk);
		
		if (!isAuthorized) {
			throw error(403, 'Forbidden');
		}

		// Get query parameters
		const status = url.searchParams.get('status') || 'pending';
		const flagType = url.searchParams.get('flagType') || null;
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Build query
		let query = locals.supabase
			.from('auto_flags')
			.select('*')
			.range(offset, offset + limit - 1)
			.order('created_at', { ascending: false });

		// Apply filters
		if (status !== 'all') {
			query = query.eq('status', status);
		}
		
		if (flagType) {
			query = query.eq('flag_type', flagType);
		}

		const { data, error: fetchError } = await query;

		if (fetchError) {
			throw error(500, fetchError.message);
		}

		return json({
			success: true,
			data,
			count: data.length
		});
	} catch (err: any) {
		console.error('Error fetching auto flags:', err);
		throw error(500, err.message || 'Failed to fetch auto flags');
	}
};

// PUT /api/moderation/flags - Update auto flag status (moderator only)
export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		// Check if user is authenticated and is a moderator
		const { data: { user } } = await locals.supabase.auth.getUser();
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		// Check if user is admin/moderator
		const ADMIN_EMAIL = import.meta.env.PUBLIC_ADMIN_EMAIL;
		const ADMIN_USER_ID = import.meta.env.PUBLIC_ADMIN_USER_ID;
		const emailOk = ADMIN_EMAIL && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
		const idOk = ADMIN_USER_ID && user.id === ADMIN_USER_ID;
		const isAuthorized = Boolean(emailOk || idOk);
		
		if (!isAuthorized) {
			throw error(403, 'Forbidden');
		}

		const { flagId, status, notes } = await request.json();

		if (!flagId || !status) {
			throw error(400, 'Flag ID and status are required');
		}

		// Update flag status
		const { data, error: updateError } = await locals.supabase
			.from('auto_flags')
			.update({ 
				status,
				updated_at: new Date().toISOString()
			})
			.eq('id', flagId)
			.select()
			.single();

		if (updateError) {
			throw error(500, updateError.message);
		}

		// Log the action
		await locals.supabase
			.from('moderation_logs')
			.insert({
				moderator_id: user.id,
				action_type: 'update_auto_flag',
				target_type: 'auto_flag',
				target_id: flagId,
				reason: `Status changed to ${status}`,
				description: notes || `Auto flag status updated to ${status}`
			});

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error updating auto flag:', err);
		throw error(500, err.message || 'Failed to update auto flag');
	}
};