<script lang="ts">
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';

	let password = '';
	let confirmPassword = '';
	let error = '';
	let loading = false;

	async function onSubmit() {
		if (!password || !confirmPassword) return;
		
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;
		error = '';
		try {
			const { error: updateError } = await supabase.auth.updateUser({
				password
			});
			if (updateError) throw updateError;
			
			alert('Password updated successfully!');
			goto('/');
		} catch (e: any) {
			error = e?.message || 'Failed to update password';
		} finally {
			loading = false;
		}
	}
</script>

<main class="mx-auto max-w-md px-4 py-10">
	<h1 class="text-xl font-semibold mb-4">Set new password</h1>
	{#if error}
		<div class="mb-3 text-sm text-red-500">{error}</div>
	{/if}
	<form class="space-y-3" on:submit|preventDefault={onSubmit}>
		<input 
			class="w-full rounded border px-3 py-2 text-sm" 
			type="password" 
			placeholder="New password" 
			bind:value={password} 
			required 
			autocomplete="new-password" 
		/>
		<input 
			class="w-full rounded border px-3 py-2 text-sm" 
			type="password" 
			placeholder="Confirm password" 
			bind:value={confirmPassword} 
			required 
			autocomplete="new-password" 
		/>
		<button 
			type="submit" 
			class="w-full inline-flex items-center justify-center gap-2 rounded bg-blue-600 text-white px-3 py-2 text-sm disabled:opacity-50" 
			disabled={loading}
		>
			{#if loading}
				<svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<circle class="opacity-25" cx="12" cy="12" r="10"/>
					<path class="opacity-75" d="M4 12a8 8 0 0 1 8-8"/>
				</svg>
				<span>Updating…</span>
			{:else}
				<span>Update password</span>
			{/if}
		</button>
	</form>
</main>
