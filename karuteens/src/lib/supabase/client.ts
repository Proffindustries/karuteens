import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';

// Cache the Supabase client instance
let cachedSupabase: ReturnType<typeof createBrowserClient> | null = null;

if (typeof window !== 'undefined') {
	if (!cachedSupabase) {
		cachedSupabase = createBrowserClient(
			env.PUBLIC_SUPABASE_URL!,
			env.PUBLIC_SUPABASE_ANON_KEY!,
			{
				global: {
					headers: {
						'X-Client-Info': 'karuteens-web'
					}
				},
				auth: {
					autoRefreshToken: true,
					persistSession: true,
					detectSessionInUrl: false
				}
			}
		);
	}
}

export const supabase = cachedSupabase || createBrowserClient(
	env.PUBLIC_SUPABASE_URL!,
	env.PUBLIC_SUPABASE_ANON_KEY!,
	{
		global: {
			headers: {
				'X-Client-Info': 'karuteens-web'
			}
		},
		auth: {
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false
		}
	}
);