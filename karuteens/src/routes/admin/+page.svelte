<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { env as pub } from '$env/dynamic/public';
  import { goto } from '$app/navigation';
  import { Shield } from 'lucide-svelte';

  let loading = true;
  let isAuthorized = false;
  let user: any = null;

  // Admin identification (provide one of these via env)
  const ADMIN_EMAIL = pub.PUBLIC_ADMIN_EMAIL;
  const ADMIN_USER_ID = pub.PUBLIC_ADMIN_USER_ID;

  // Upload form state
  let bucket = '';
  let prefix = '';
  let makePublic = true;
  let files: FileList | null = null;

  type UploadResult = { file: string; path: string; publicUrl?: string; error?: string };
  let results: UploadResult[] = [];
  let uploading = false;

  onMount(async () => {
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (!user) {
      // Not logged in; rely on app layout redirect, but guard here too
      loading = false;
      return;
    }

    // Check authorization against configured admin identifier
    const emailOk = ADMIN_EMAIL && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const idOk = ADMIN_USER_ID && user.id === ADMIN_USER_ID;
    isAuthorized = Boolean(emailOk || idOk);
    loading = false;
  });

  function validateInputs() {
    if (!bucket) return 'Bucket is required';
    if (!files || files.length === 0) return 'Please choose at least one file';
    return null;
  }

  function joinPath(a: string, b: string) {
    const left = a.replace(/^\/+|\/+$/g, '');
    const right = b.replace(/^\/+/, '');
    return left && right ? `${left}/${right}` : (left || right);
  }

  async function handleUpload() {
    const err = validateInputs();
    if (err) {
      results = [{ file: '', path: '', error: err }];
      return;
    }

    uploading = true;
    results = [];

    try {
      const list = Array.from(files!);
      for (const f of list) {
        const path = joinPath(prefix, f.name);
        const { error } = await supabase.storage.from(bucket).upload(path, f, {
          cacheControl: '3600',
          upsert: true,
          contentType: f.type || undefined
        });

        if (error) {
          results = [...results, { file: f.name, path, error: error.message }];
          continue;
        }

        let publicUrl: string | undefined;
        if (makePublic) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          publicUrl = data.publicUrl;
        }
        results = [...results, { file: f.name, path: `${bucket}/${path}`, publicUrl }];
      }
    } finally {
      uploading = false;
    }
  }

  function copy(text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
  }
</script>

<main class="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
  <h1 class="text-2xl font-semibold">Admin Dashboard</h1>

  {#if loading}
    <p class="text-foreground/70">Loading…</p>
  {:else if !isAuthorized}
    <div class="rounded-lg border p-4 bg-red-50 border-red-200">
      <p class="text-red-700 font-medium">Access denied</p>
      <p class="text-sm text-red-700/80">This page is restricted to the designated admin account.</p>
      {#if !ADMIN_EMAIL && !ADMIN_USER_ID}
        <p class="mt-2 text-sm">Set <code>PUBLIC_ADMIN_EMAIL</code> or <code>PUBLIC_ADMIN_USER_ID</code> in your env to enable access.</p>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section class="bg-white rounded-xl shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Media Uploads</h2>
        <p class="text-sm text-foreground/70 mb-4">Upload images, videos, and other files to Supabase Storage.</p>

        <div class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="block space-y-1">
              <span class="text-sm">Bucket</span>
              <input class="input" placeholder="e.g. public, media, assets" bind:value={bucket} />
            </label>

            <label class="block space-y-1">
              <span class="text-sm">Destination path/prefix (optional)</span>
              <input class="input" placeholder="e.g. uploads/2025/11" bind:value={prefix} />
            </label>
          </div>

          <div class="flex items-center gap-4">
            <label class="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" bind:checked={makePublic} />
              Make public (generate public URLs)
            </label>
          </div>

          <div class="space-y-2">
            <input type="file" multiple on:change={(e: Event) => { files = (e.target as HTMLInputElement).files; }} />
            <button class="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50" on:click={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>

          {#if results.length}
            <div class="space-y-2">
              <h3 class="font-medium">Results</h3>
              <ul class="space-y-2">
                {#each results as r}
                  <li class="rounded border p-3 bg-white">
                    {#if r.error}
                      <div class="text-red-600 text-sm">{r.file}: {r.error}</div>
                    {:else}
                      <div class="text-sm">
                        <div><span class="text-foreground/60">Stored at:</span> <code>{r.path}</code></div>
                        {#if r.publicUrl}
                          <div class="flex items-center gap-2 break-all">
                            <span class="text-foreground/60">Public URL:</span>
                            <a class="text-blue-600 hover:underline" href={r.publicUrl} target="_blank" rel="noreferrer">{r.publicUrl}</a>
                            <button class="px-2 py-1 text-xs rounded border" on:click={() => copy(r.publicUrl!)}>Copy</button>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      </section>

      <section class="bg-white rounded-xl shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Moderation</h2>
        <p class="text-sm text-foreground/70 mb-4">Manage reports, content flags, and user appeals.</p>
        
        <div class="space-y-4">
          <a 
            href="/admin/moderation" 
            class="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-red-100 rounded-lg">
                <Shield class="size-6 text-red-600"></Shield>
              </div>
              <div>
                <h3 class="font-medium">Moderation Dashboard</h3>
                <p class="text-sm text-gray-600">Review reports, flags, and appeals</p>
              </div>
            </div>
          </a>
          
          <div class="grid grid-cols-2 gap-4">
            <a 
              href="/admin/moderation#reports" 
              class="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <h4 class="font-medium text-sm">Reports</h4>
              <p class="text-xs text-gray-600 mt-1">User submitted reports</p>
            </a>
            
            <a 
              href="/admin/moderation#flags" 
              class="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <h4 class="font-medium text-sm">Auto Flags</h4>
              <p class="text-xs text-gray-600 mt-1">AI detected content</p>
            </a>
          </div>
        </div>
      </section>
    </div>

    <div class="text-xs text-foreground/60">
      Tip: For stronger security, enforce admin-only access in server code and Supabase RLS, and ensure the admin account uses a 72-character password.
    </div>
  {/if}
</main>
