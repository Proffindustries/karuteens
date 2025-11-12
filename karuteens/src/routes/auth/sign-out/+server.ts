import { redirect, type RequestEvent } from '@sveltejs/kit';

export const POST = async ({ locals }: RequestEvent) => {
	await locals.supabase.auth.signOut();
	throw redirect(303, '/auth/sign-in');
};
