import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/moderation - Get reports queue
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Check if user is authenticated and is a moderator
		const { data: { user } } = await locals.supabase.auth.getUser();
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		// Check if user is admin/moderator (in a real app, you'd have proper RBAC)
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
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const reportType = url.searchParams.get('reportType') || null;

		// Build query
		let query = locals.supabase
			.from('reports')
			.select(`
				*,
				reporter:profiles!reports_reporter_id_fkey(id, username, avatar_url),
				enforcement_actions(*)
			`)
			.range(offset, offset + limit - 1)
			.order('created_at', { ascending: false });

		// Apply filters
		if (status !== 'all') {
			query = query.eq('status', status);
		}
		
		if (reportType) {
			query = query.eq('report_type', reportType);
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
		console.error('Error fetching reports:', err);
		throw error(500, err.message || 'Failed to fetch reports');
	}
};

// PUT /api/moderation - Update report status
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

		const { reportId, status, notes } = await request.json();

		if (!reportId || !status) {
			throw error(400, 'Report ID and status are required');
		}

		// Update report status
		const { data, error: updateError } = await locals.supabase
			.from('reports')
			.update({ 
				status,
				updated_at: new Date().toISOString()
			})
			.eq('id', reportId)
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
				action_type: 'update_report_status',
				target_type: 'report',
				target_id: reportId,
				reason: `Status changed to ${status}`,
				description: notes || `Report status updated to ${status}`
			});

		return json({
			success: true,
			data
		});
	} catch (err: any) {
		console.error('Error updating report:', err);
		throw error(500, err.message || 'Failed to update report');
	}
};