<script lang="ts">
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;

	function friendlyError(e: any): string {
		const msg = e?.message || '';
		if (msg.includes('Invalid login credentials')) {
			return 'Incorrect email or password.';
		}
		if (msg.includes('Email not confirmed')) {
			return 'Please confirm your email address.';
		}
		if (msg.includes('Invalid email')) {
			return 'Please enter a valid email address.';
		}
		return 'Sign in failed. Please try again.';
	}

	function targetAfterLogin() {
		const qs = new URLSearchParams($page.url.search);
		return qs.get('redirectTo') || '/';
	}

	async function onSubmit() {
		if (!email || !password) return;
		loading = true;
		error = '';
		try {
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password
			});
			if (signInError) throw signInError;
			goto(targetAfterLogin());
		} catch (e: any) {
			error = friendlyError(e);
			loading = false;
		}
	}

	async function onGoogle() {
		loading = true;
		error = '';
		try {
			const { error: signInError } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback`
				}
			});
			if (signInError) throw signInError;
		} catch (e: any) {
			error = e?.message || 'Sign in failed';
			loading = false;
		}
	}
</script>

<main class="min-h-[100svh] grid place-items-center bg-auth-animated px-4">
  <h1 class="sr-only">Sign in</h1>
  {#if error}
    <div class="mb-3 text-sm text-red-500">{error}</div>
  {/if}
  <form class="card-auth space-y-4" on:submit|preventDefault={onSubmit}>
    <input class="input" type="email" placeholder="Email" bind:value={email} required autocomplete="email" />
    <input class="input" type="password" placeholder="Password" bind:value={password} required autocomplete="current-password" />
    <button type="submit" class="btn btn-primary w-full disabled:opacity-50" disabled={loading}>
      {#if loading}
        <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10"/><path class="opacity-75" d="M4 12a8 8 0 0 1 8-8"/></svg>
        <span>Signing in…</span>
      {:else}
        <span>Sign in</span>
      {/if}
    </button>
  </form>
  <div class="my-3 text-center text-xs text-neutral-600">or</div>
  <button class="btn w-full border disabled:opacity-50" on:click|preventDefault={onGoogle} disabled={loading}>
    {#if loading}
      <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10"/><path class="opacity-75" d="M4 12a8 8 0 0 1 8-8"/></svg>
      <span>Working…</span>
    {:else}
      <span>Continue with Google</span>
    {/if}
  </button>
  <div class="mt-4 text-xs">
    <a class="link-fancy" href="/auth/reset">Forgot password?</a>
    <span class="text-neutral-500"> · </span>
    <a class="link-fancy" href="/auth/sign-up">Create an account</a>
  </div>
</main>
