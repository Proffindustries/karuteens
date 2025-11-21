import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { sequence } from '@sveltejs/kit/hooks';
import { supabaseHandle } from '$lib/supabase/server';
import { scanUserProfile, scanPostContent, scanCommentContent, submitFlag } from '$lib/services/moderation';

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

const handleContentModeration: Handle = async ({ event, resolve }) => {
	// Auto-scan content on creation/update
	if (event.request.method === 'POST' || event.request.method === 'PUT') {
		try {
			// Get request body
			const contentType = event.request.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				const body = await event.request.clone().json();
				
				// Scan user profiles
				if (event.url.pathname === '/api/users/profile') {
					const result = await scanUserProfile(body);
					if (result.flagged) {
						// Submit flag for moderation review
						await submitFlag('user_profile', body.userId, result.flagType!, result.confidenceScore!, result.details, event.locals.supabase);
					}
				}
				
				// Scan posts
				if (event.url.pathname === '/api/posts') {
					const result = await scanPostContent(body);
					if (result.flagged) {
						// Submit flag for moderation review
						await submitFlag('post', body.id || 'unknown', result.flagType!, result.confidenceScore!, result.details, event.locals.supabase);
					}
				}
				
				// Scan comments
				if (event.url.pathname === '/api/comments') {
					const result = await scanCommentContent(body);
					if (result.flagged) {
						// Submit flag for moderation review
						await submitFlag('comment', body.id || 'unknown', result.flagType!, result.confidenceScore!, result.details, event.locals.supabase);
					}
				}
			}
		} catch (error) {
			// Log error but don't block the request
			console.error('Error scanning content:', error);
		}
	}
	
	return resolve(event);
};

export const handle: Handle = sequence(supabaseHandle, handleAuth, handleContentModeration, handleParaglide);