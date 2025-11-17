import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { sequence } from '@sveltejs/kit/hooks';
import { supabaseHandle } from '$lib/supabase/server';

const handleAuth: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const path = event.url.pathname;
	const publicPaths = new Set<string>([
		'/',
		'/auth/sign-in',
		'/auth/sign-up',
		'/auth/reset',
		'/api/test-db'  // Add our test endpoint to public paths
	]);

	const isAuthPath = path.startsWith('/auth');
	const isPublic = isAuthPath || publicPaths.has(path);

	if (!user && !isPublic) {
		const redirectTo = encodeURIComponent(event.url.pathname + event.url.search);
		return new Response(null, {
			status: 303,
			headers: { location: `/auth/sign-in?redirectTo=${redirectTo}` }
		});
	}

	if (user && isAuthPath) {
		const dest = event.url.searchParams.get('redirectTo') || '/';
		return new Response(null, {
			status: 303,
			headers: { location: dest }
		});
	}

	return resolve(event);
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

export const handle: Handle = sequence(supabaseHandle, handleAuth, handleParaglide);