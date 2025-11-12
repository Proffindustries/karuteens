import { redirect, type RequestEvent } from '@sveltejs/kit';

export const GET = async ({ url, locals }: RequestEvent) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') || '/';

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			throw redirect(303, `/${next.slice(1)}`);
		}
	}

	// Return the user to an error page with some instructions
	throw redirect(303, '/auth/auth-code-error');
};
