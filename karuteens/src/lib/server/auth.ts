// Minimal auth utilities to satisfy build and basic demo flows.
// Replace with real implementation as needed.

export type Session = {
  userId: string;
  token: string;
  expiresAt: Date;
};

export function generateSessionToken(): string {
  // 32 bytes hex token
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function createSession(token: string, userId: string): Promise<Session> {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  // TODO: persist session to DB if needed
  return { token, userId, expiresAt };
}

export function setSessionTokenCookie(event: any, token: string, expiresAt: Date) {
  event.cookies?.set?.('session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    expires: expiresAt
  });
}

export function deleteSessionTokenCookie(event: any) {
  event.cookies?.delete?.('session', { path: '/' });
}
