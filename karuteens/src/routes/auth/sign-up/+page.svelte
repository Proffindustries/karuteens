<script lang="ts">
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let username = '';
	let error = '';
	let loading = false;

	async function onSubmit() {
		if (!email || !password || !username) return;
		loading = true;
		error = '';
		try {
			const { data, error: signUpError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						username
					}
				}
			});
			if (signUpError) throw signUpError;

			// Check if email confirmation is required
			if (data?.user && !data.session) {
				error = 'Please check your email to confirm your account.';
				loading = false;
				return;
			}

			goto('/');
		} catch (e: any) {
			error = e?.message || 'Sign up failed';
			loading = false;
		}
	}
</script>

<main class="mx-auto max-w-md px-4 py-10">
  <h1 class="text-xl font-semibold mb-4">Create account</h1>
  {#if error}
    <div class="mb-3 text-sm text-red-500">{error}</div>
  {/if}
  <form class="space-y-3" on:submit|preventDefault={onSubmit}>
    <input class="w-full rounded border px-3 py-2 text-sm" type="text" placeholder="Username" bind:value={username} required autocomplete="username" />
    <input class="w-full rounded border px-3 py-2 text-sm" type="email" placeholder="Email" bind:value={email} required autocomplete="email" />
    <input class="w-full rounded border px-3 py-2 text-sm" type="password" placeholder="Password" bind:value={password} required autocomplete="new-password" />
    <button type="submit" class="w-full inline-flex items-center justify-center gap-2 rounded bg-blue-600 text-white px-3 py-2 text-sm disabled:opacity-50" disabled={loading}>
      {#if loading}
        <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10"/><path class="opacity-75" d="M4 12a8 8 0 0 1 8-8"/></svg>
        <span>Creating…</span>
      {:else}
        <span>Sign up</span>
      {/if}
    </button>
  </form>
  <div class="mt-4 text-xs">
    <a class="text-blue-600" href="/auth/sign-in">Already have an account? Sign in</a>
  </div>
</main>
