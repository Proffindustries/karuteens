<script lang="ts">
	import { supabase } from '$lib/supabase/client';

	let email = '';
	let error = '';
	let msg = '';
	let loading = false;

	async function onSubmit() {
		if (!email) return;
		loading = true;
		error = '';
		msg = '';
		try {
			const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/update-password`
			});
			if (resetError) throw resetError;
			msg = 'Check your email for a reset link.';
		} catch (e: any) {
			error = e?.message || 'Failed to send reset email';
		} finally {
			loading = false;
		}
	}
</script>

<main class="mx-auto max-w-md px-4 py-10">
  <h1 class="text-xl font-semibold mb-4">Reset password</h1>
  {#if msg}
    <div class="mb-3 text-sm text-green-600">{msg}</div>
  {/if}
  {#if error}
    <div class="mb-3 text-sm text-red-500">{error}</div>
  {/if}
  <form class="space-y-3" on:submit|preventDefault={onSubmit}>
    <input class="w-full rounded border px-3 py-2 text-sm" type="email" placeholder="Email" bind:value={email} required autocomplete="email" />
    <button type="submit" class="w-full inline-flex items-center justify-center gap-2 rounded bg-blue-600 text-white px-3 py-2 text-sm disabled:opacity-50" disabled={loading}>
      {#if loading}
        <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10"/><path class="opacity-75" d="M4 12a8 8 0 0 1 8-8"/></svg>
        <span>Sending…</span>
      {:else}
        <span>Send reset link</span>
      {/if}
    </button>
  </form>
  <div class="mt-4 text-xs">
    <a class="text-blue-600" href="/auth/sign-in">Back to sign in</a>
  </div>
</main>
