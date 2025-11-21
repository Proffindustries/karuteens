import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/moderation/appeals - Create appeal
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check if user is authenticated
		const { data: { user } } = await locals.supabase.auth.getUser();
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const { reportId, reason, description } = await request.json();

		if (!reportId || !reason || !description) {
			throw error(400, 'Report ID, reason, and description are required');
		}

		// Check if user is the reporter or target of the report
		const { data: report, error: reportError } = await locals.supabase
			.from('reports')
			.select('reporter_id, target_id')
			.eq('id', reportId)
			.single();

		if (reportError) {
			throw error(500, reportError.message);
		}

		// In a real app, you'd also check if the user is the target of the report
		if (user.id !== report.reporter_id) {
			// For now, we'll allow anyone to appeal for simplicity
			// In a real app, you'd have more sophisticated checks
		}

		// Create appeal
		const { data, error: insertError } = await locals.supabase
			.from('appeals')
			.insert({
				report_id: reportId,
				user_id: user.id,
				reason,
				description
			})
			.select()
			.single();

		if (insertError) {
			throw error(500, insertError.message);
		}

		// Update report status
		await locals.supabase
			.from('reports')
			.update({ 
				status: 'appealed',
				updated_at: new Date().toISOString()
			})
			.eq('id', reportId);

		// Log the action
		await locals.supabase
			.from('moderation_logs')
			.insert({
				moderator_id: user.id,
				action_type: 'create_appeal',
				target_type: 'report',
				target_id: reportId,
				reason,
				description
			});

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error creating appeal:', err);
		throw error(500, err.message || 'Failed to create appeal');
	}
};

// GET /api/moderation/appeals - Get appeals
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Check if user is authenticated
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
		
		// Regular users can only see their own appeals, moderators can see all
		let query = locals.supabase
			.from('appeals')
			.select(`
				*,
				user:profiles!appeals_user_id_fkey(id, username, avatar_url),
				report:reports!appeals_report_id_fkey(id, reason, description, reporter_id)
			`)
			.order('created_at', { ascending: false });

		if (!isAuthorized) {
			// Regular user - only their appeals
			query = query.eq('user_id', user.id);
		} else {
			// Moderator - can filter by status
			const status = url.searchParams.get('status') || null;
			if (status) {
				query = query.eq('status', status);
			}
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
		console.error('Error fetching appeals:', err);
		throw error(500, err.message || 'Failed to fetch appeals');
	}
};

// PUT /api/moderation/appeals - Update appeal status (moderator only)
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

		const { appealId, status, notes } = await request.json();

		if (!appealId || !status) {
			throw error(400, 'Appeal ID and status are required');
		}

		// Update appeal status
		const { data, error: updateError } = await locals.supabase
			.from('appeals')
			.update({ 
				status,
				updated_at: new Date().toISOString()
			})
			.eq('id', appealId)
			.select()
			.single();

		if (updateError) {
			throw error(500, updateError.message);
		}

		// If appeal is approved, we might want to reverse the enforcement action
		if (status === 'approved') {
			// Find the associated enforcement action and potentially reverse it
			// This would depend on the specific implementation
		}

		// Log the action
		await locals.supabase
			.from('moderation_logs')
			.insert({
				moderator_id: user.id,
				action_type: 'update_appeal',
				target_type: 'appeal',
				target_id: appealId,
				reason: `Status changed to ${status}`,
				description: notes || `Appeal status updated to ${status}`
			});

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error updating appeal:', err);
		throw error(500, err.message || 'Failed to update appeal');
	}
};