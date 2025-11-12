import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const { name, description, category, isPrivate, maxMembers } = await request.json();

		if (!name || !description || !category) {
			throw error(400, 'Missing required fields');
		}

		const { supabase } = locals;

		// Create group
		const { data: group, error: groupError } = await supabase
			.from('groups')
			.insert({
				name,
				description,
				category,
				creator_id: user.id,
				is_private: isPrivate || false,
				max_members: maxMembers || 100
			})
			.select()
			.single();

		if (groupError) throw groupError;

		// Add creator as first member with 'creator' role
		const { error: memberError } = await supabase
			.from('group_members')
			.insert({
				group_id: group.id,
				user_id: user.id,
				role: 'creator'
			});

		if (memberError) throw memberError;

		return json({ group });
	} catch (err: any) {
		console.error('Create group error:', err);
		throw error(500, err.message || 'Failed to create group');
	}
};
