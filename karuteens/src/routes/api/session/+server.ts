import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import {
  generateSessionToken,
  createSession,
  setSessionTokenCookie,
  deleteSessionTokenCookie
} from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
  // DEV-ONLY: expects { userId } from client (e.g., Firebase uid). In production, verify ID token server-side.
  const body = await event.request.json().catch(() => null) as { userId?: string } | null;
  const userId = body?.userId;
  if (!userId) {
    return json({ error: 'Missing userId' }, { status: 400 });
  }

  const token = generateSessionToken();
  const session = await createSession(token, userId);
  setSessionTokenCookie(event, token, session.expiresAt);
  return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
  deleteSessionTokenCookie(event);
  return json({ ok: true });
};
