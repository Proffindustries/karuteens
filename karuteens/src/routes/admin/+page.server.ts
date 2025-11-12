import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { env as priv } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';

// Only allow a single admin account. Configure via env:
// - PRIVATE_ADMIN_USER_ID (recommended, server-only)
// - PUBLIC_ADMIN_EMAIL (fallback)
export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();

  if (!user) {
    throw redirect(303, '/auth/sign-in?redirectTo=%2Fadmin');
  }

  const ADMIN_USER_ID = priv.PRIVATE_ADMIN_USER_ID;
  const ADMIN_EMAIL = pub.PUBLIC_ADMIN_EMAIL;

  const idOk = ADMIN_USER_ID && user.id === ADMIN_USER_ID;
  const emailOk = ADMIN_EMAIL && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!(idOk || emailOk)) {
    throw error(403, 'Forbidden');
  }

  return {};
};
