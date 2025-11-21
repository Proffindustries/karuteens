<script lang="ts">
	import { page } from '$app/stores';
	import { user } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase/client';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let open = false;
	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/feed', label: 'Feed' },
		{ href: '/notes', label: 'Notes' },
		{ href: '/profile', label: 'Profile' },
		{ href: '/groups', label: 'Groups' },
		{ href: '/resources', label: 'Resources' },
		{ href: '/study-buddy', label: 'Study Buddy' },
		{ href: '/notifications', label: 'Notifications' },
		{ href: '/wallet', label: 'Wallet' },
		{ href: '/settings', label: 'Settings' },
		{ href: '/map', label: 'Site Map' }
	];

	// Prefetch critical routes
	onMount(() => {
		// Preload critical routes for faster navigation
		if (typeof window !== 'undefined') {
			const prefetchLinks = ['/feed', '/profile', '/groups'];
			prefetchLinks.forEach(href => {
				const link = document.createElement('link');
				link.rel = 'prefetch';
				link.href = href;
				document.head.appendChild(link);
			});
		}
	});

	function toggle() {
		open = !open;
	}

	function isActive(href: string) {
		const path = $page.url.pathname;
		return path === href || (href !== '/' && path.startsWith(href + '/'));
	}

	async function doSignOut() {
		try {
			await supabase.auth.signOut();
			goto('/auth/sign-in');
		} catch (e) {
			console.error('Sign out failed:', e);
		}
	}
</script>

<nav class="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
  <div class="mx-auto max-w-screen-lg px-4 min-h-16 py-2 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 text-lg font-semibold text-foreground">
      <img src="/logo.svg" alt="KaruTeens logo" class="h-14 md:h-16 w-auto" />
      KaruTeens
    </a>
    <!-- Desktop nav -->
    <div class="hidden md:flex items-center gap-4">
      {#each links as l}
        <a href={l.href} class="text-sm hover:text-foreground {isActive(l.href) ? 'text-foreground font-medium' : 'text-foreground/80'}">{l.label}</a>
      {/each}
      {#if $user}
        <button class="px-3 py-1.5 rounded-md border hover:bg-muted" on:click={doSignOut}>Sign out</button>
      {:else}
        <a href="/auth/sign-in" class="px-3 py-1.5 rounded-md border hover:bg-muted">Sign in</a>
        <a href="/auth/sign-up" class="px-3 py-1.5 rounded-md bg-blue-600 text-white">Get started</a>
      {/if}
    </div>
    <!-- Mobile menu button -->
    <button class="md:hidden inline-flex items-center justify-center rounded-md border px-3 py-2" aria-expanded={open} on:click={toggle} aria-label="Toggle menu">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5"><path d="M3.75 6.75h16.5v1.5H3.75v-1.5Zm0 4.5h16.5v1.5H3.75v-1.5Zm0 4.5h16.5v1.5H3.75v-1.5Z"/></svg>
    </button>
  </div>
  
  <!-- Mobile menu overlay -->
  {#if open}
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-black/50 z-40 md:hidden" 
      on:click={toggle}
      role="presentation"
    ></div>
    
    <!-- Menu panel -->
    <div class="fixed top-[72px] left-0 right-0 z-50 md:hidden bg-white border-t shadow-2xl max-h-[calc(100vh-72px)] overflow-y-auto">
      <div class="px-4 py-2 grid gap-1">
        {#each links as l}
          <a href={l.href} class="block rounded-md px-3 py-2 text-sm hover:bg-muted {isActive(l.href) ? 'bg-muted' : ''}" on:click={() => open = false}>{l.label}</a>
        {/each}
        {#if $user}
          <div class="px-1 py-2">
            <button class="w-full text-center rounded-md border px-3 py-2" on:click={() => { doSignOut(); open = false; }}>Sign out</button>
          </div>
        {:else}
          <div class="flex gap-2 px-1 py-2">
            <a href="/auth/sign-in" class="flex-1 text-center rounded-md border px-3 py-2" on:click={() => open = false}>Sign in</a>
            <a href="/auth/sign-up" class="flex-1 text-center rounded-md bg-blue-600 text-white px-3 py-2" on:click={() => open = false}>Get started</a>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</nav>
