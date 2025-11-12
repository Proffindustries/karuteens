import { writable } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabase/client';

export const user = writable<User | null>(null);
export const session = writable<Session | null>(null);
export const authReady = writable(false);

if (browser) {
	supabase.auth.getSession().then(({ data }) => {
		session.set(data.session);
		user.set(data.session?.user ?? null);
		authReady.set(true);
	});

	supabase.auth.onAuthStateChange((_event, newSession) => {
		session.set(newSession);
		user.set(newSession?.user ?? null);
		authReady.set(true);
	});
}
