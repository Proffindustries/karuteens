import { writable } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabase/client';

export const user = writable<User | null>(null);
export const session = writable<Session | null>(null);
export const authReady = writable(false);

// Cache user data to reduce redundant calls
let cachedUser: User | null = null;
let cachedSession: Session | null = null;

if (browser) {
	// Use cached data if available
	if (cachedSession) {
		session.set(cachedSession);
		user.set(cachedUser);
		authReady.set(true);
	} else {
		supabase.auth.getSession().then(({ data }) => {
			cachedSession = data.session;
			cachedUser = data.session?.user ?? null;
			session.set(cachedSession);
			user.set(cachedUser);
			authReady.set(true);
		});
	}

	// Optimize auth state change listener
	const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
		cachedSession = newSession;
		cachedUser = newSession?.user ?? null;
		session.set(newSession);
		user.set(newSession?.user ?? null);
		authReady.set(true);
	});

	// Clean up listener on unload
	if (browser) {
		window.addEventListener('beforeunload', () => {
			authListener?.subscription.unsubscribe();
		});
	}
}
