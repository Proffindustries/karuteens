import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const { user } = await locals.safeGetSession();
	
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const { action } = await request.json(); // 'join' or 'leave'
		const groupId = params.id;

		const { supabase } = locals;

		if (action === 'join') {
			// Check if already a member
			const { data: existing } = await supabase
				.from('group_members')
				.select('id')
				.eq('group_id', groupId)
				.eq('user_id', user.id)
				.single();

			if (existing) {
				throw error(400, 'Already a member');
			}

			// Check group capacity
			const { count } = await supabase
				.from('group_members')
				.select('*', { count: 'exact', head: true })
				.eq('group_id', groupId);

			const { data: group } = await supabase
				.from('groups')
				.select('max_members')
				.eq('id', groupId)
				.single();

			if (count && group && count >= group.max_members) {
				throw error(400, 'Group is full');
			}

			// Join group
			const { error: joinError } = await supabase
				.from('group_members')
				.insert({
					group_id: groupId,
					user_id: user.id,
					role: 'member'
				});

			if (joinError) throw joinError;

			return json({ message: 'Joined group successfully' });
		} else if (action === 'leave') {
			// Cannot leave if creator
			const { data: group } = await supabase
				.from('groups')
				.select('creator_id')
				.eq('id', groupId)
				.single();

			if (group?.creator_id === user.id) {
				throw error(400, 'Creator cannot leave group. Delete the group instead.');
			}

			// Leave group
			const { error: leaveError } = await supabase
				.from('group_members')
				.delete()
				.eq('group_id', groupId)
				.eq('user_id', user.id);

			if (leaveError) throw leaveError;

			return json({ message: 'Left group successfully' });
		}

		throw error(400, 'Invalid action');
	} catch (err: any) {
		console.error('Group membership error:', err);
		throw error(err.status || 500, err.message || 'Failed to update membership');
	}
};
