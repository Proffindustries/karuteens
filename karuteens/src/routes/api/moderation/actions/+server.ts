import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/moderation/actions - Create enforcement action
export const POST: RequestHandler = async ({ request, locals }) => {
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

		const { reportId, actionType, targetType, targetId, reason, description, duration } = await request.json();

		if (!actionType || !targetType || !targetId || !reason) {
			throw error(400, 'Action type, target type, target ID, and reason are required');
		}

		// Create enforcement action
		const { data, error: insertError } = await locals.supabase
			.from('enforcement_actions')
			.insert({
				report_id: reportId,
				moderator_id: user.id,
				action_type: actionType,
				target_type: targetType,
				target_id: targetId,
				reason,
				description,
				duration
			})
			.select()
			.single();

		if (insertError) {
			throw error(500, insertError.message);
		}

		// Update report status if provided
		if (reportId) {
			await locals.supabase
				.from('reports')
				.update({ 
					status: 'resolved',
					updated_at: new Date().toISOString()
				})
				.eq('id', reportId);
		}

		// Log the action
		await locals.supabase
			.from('moderation_logs')
			.insert({
				moderator_id: user.id,
				action_type: actionType,
				target_type: targetType,
				target_id: targetId,
				reason,
				description: description || `Enforcement action: ${actionType}`
			});

		// Perform the actual enforcement action based on type
		switch (actionType) {
			case 'delete_content':
				// Delete the content (implementation depends on content type)
				break;
			case 'hide_content':
				// Hide the content (implementation depends on content type)
				break;
			case 'suspend':
				// Suspend user account
				break;
			case 'ban':
				// Ban user account
				break;
			case 'warn':
				// Send warning to user
				break;
		}

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error creating enforcement action:', err);
		throw error(500, err.message || 'Failed to create enforcement action');
	}
};

// GET /api/moderation/actions - Get enforcement actions
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
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const targetType = url.searchParams.get('targetType') || null;
		const actionType = url.searchParams.get('actionType') || null;

		// Build query
		let query = locals.supabase
			.from('enforcement_actions')
			.select(`
				*,
				moderator:profiles!enforcement_actions_moderator_id_fkey(id, username, avatar_url),
				report:reports!enforcement_actions_report_id_fkey(id, reason, description)
			`)
			.range(offset, offset + limit - 1)
			.order('created_at', { ascending: false });

		// Apply filters
		if (targetType) {
			query = query.eq('target_type', targetType);
		}
		
		if (actionType) {
			query = query.eq('action_type', actionType);
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
		console.error('Error fetching enforcement actions:', err);
		throw error(500, err.message || 'Failed to fetch enforcement actions');
	}
};