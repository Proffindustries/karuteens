<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import { page } from '$app/stores';
	import { goto, invalidate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { supabase } from '$lib/supabase/client';
	import { onMount } from 'svelte';

	let { children, data } = $props();
	let initializing = $state(true);
	let fontsLoaded = $state(false);

	// Preload critical fonts
	onMount(() => {
		if (browser) {
			// Preload fonts
			document.fonts.ready.then(() => {
				fontsLoaded = true;
			});
		}
	});

	function isAuthPath(p: string) {
		return p.startsWith('/auth');
	}

	function isPublicPath(p: string) {
		const publicPaths = new Set([
			'/',
			'/auth/sign-in',
			'/auth/sign-up',
			'/auth/reset'
		]);
		if (isAuthPath(p)) return true;
		return publicPaths.has(p);
	}

	if (browser) {
		const safety = setTimeout(() => {
			initializing = false;
		}, 2000);

		supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
				invalidate('supabase:auth');
			}

			const path = $page.url.pathname;
			const search = $page.url.search;
			const isPublic = isPublicPath(path);

			if (!session && !isPublic) {
				const redirectTo = encodeURIComponent(path + search);
				goto(`/auth/sign-in?redirectTo=${redirectTo}`);
			}

			if (session && isAuthPath(path)) {
				const qs = new URLSearchParams(search);
				const dest = qs.get('redirectTo') || '/';
				goto(dest);
			}

			initializing = false;
			clearTimeout(safety);
		});
	}
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" />
</svelte:head>

{#if initializing}
  <div class="min-h-[100svh] bg-auth-animated">
    <div class="sticky top-0 z-50 bg-white/70 backdrop-blur border-b">
      <div class="mx-auto max-w-screen-lg px-4 min-h-16 py-2 flex items-center justify-between">
        <div class="h-8 w-32 rounded bg-gray-200 animate-pulse"></div>
        <div class="hidden md:flex items-center gap-4">
          <div class="h-4 w-16 rounded bg-gray-200 animate-pulse"></div>
          <div class="h-4 w-14 rounded bg-gray-200 animate-pulse"></div>
          <div class="h-8 w-24 rounded bg-gray-200 animate-pulse"></div>
        </div>
        <div class="md:hidden h-10 w-10 rounded bg-gray-200 animate-pulse"></div>
      </div>
    </div>
    <main class="mx-auto max-w-sm px-4 py-10">
      <div class="rounded-xl bg-white/90 shadow p-6 space-y-4">
        <div class="h-6 w-2/3 rounded bg-gray-200 animate-pulse"></div>
        <div class="space-y-2">
          <div class="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
          <div class="h-10 w-full rounded bg-gray-200 animate-pulse"></div>
        </div>
        <div class="space-y-2">
          <div class="h-4 w-1/2 rounded bg-gray-200 animate-pulse"></div>
          <div class="h-10 w-full rounded bg-gray-200 animate-pulse"></div>
        </div>
        <div class="h-10 w-full rounded bg-gray-200 animate-pulse"></div>
      </div>
    </main>
  </div>
{:else}
  {#if !$page.url.pathname.startsWith('/auth')}
    <Navbar />
  {/if}
  {@render children()}
{/if}
