import { db } from './db';
import { eq } from 'drizzle-orm';
import { sessions } from './db/schema';

// Real auth utilities implementation

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
  
  // Insert session into database
  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt
  });
  
  return { token, userId, expiresAt };
}

export function setSessionTokenCookie(event: any, token: string, expiresAt: Date) {
  event.cookies?.set?.('session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt
  });
}

export function deleteSessionTokenCookie(event: any) {
  event.cookies?.delete?.('session', { path: '/' });
}

// Validate session - returns session object if valid, null otherwise
export async function validateSession(locals: any): Promise<Session | null> {
  try {
    // Get the user from the session
    const { user } = await locals.safeGetSession();
    
    if (!user) {
      return null;
    }
    
    // Return a session object with the user ID
    return {
      userId: user.id,
      token: 'session-token', // This is a placeholder, in a real implementation you'd get the actual token
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days from now
    };
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}