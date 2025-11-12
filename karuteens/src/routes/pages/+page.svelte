<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Search, Plus, Image as ImageIcon, X, Users } from 'lucide-svelte';

  type Page = {
    id: string;
    author_id: string;
    title: string;
    slug: string;
    description?: string;
    content?: string;
    cover_url?: string;
    is_published: boolean;
    created_at: string;
  };

  let loading = true;
  let pages: Page[] = [];
  let searchQuery = '';
  let showCreate = false;
  let creating = false;
  let uploading = false;
  let coverFile: File | null = null;
  let coverPreview: string | null = null;

  let form = {
    title: '',
    description: '',
    isPublished: true
  };

  onMount(async () => {
    await loadPages();
    loading = false;
  });

  async function loadPages() {
    const { data } = await supabase
      .from('pages')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    pages = data || [];
  }

  function slugify(str: string) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function handleCoverSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    coverFile = file;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        coverPreview = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      coverPreview = file.name;
    }
  }

  function clearCover() {
    coverFile = null;
    coverPreview = null;
  }

  async function createPage() {
    if (!form.title.trim()) return;
    if (!$user) { window.location.href = '/login'; return; }
    creating = true;

    let coverUrl: string | null = null;
    if (coverFile) {
      uploading = true;
      const fd = new FormData();
      fd.append('file', coverFile);
      fd.append('userId', $user.id);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const { url } = await res.json();
        coverUrl = url;
      }
      uploading = false;
    }

    const slug = slugify(form.title);

    const { data, error } = await supabase
      .from('pages')
      .insert({
        author_id: $user.id,
        title: form.title.trim(),
        slug,
        description: form.description || null,
        cover_url: coverUrl,
        is_published: form.isPublished
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      creating = false;
      return;
    }

    showCreate = false;
    form = { title: '', description: '', isPublished: true };
    coverFile = null; coverPreview = null;
    await loadPages();
    window.location.href = `/pages/${data.slug}`;
  }

  $: filteredPages = pages.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
</script>

<main class="max-w-screen-lg mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <h1 class="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Pages</h1>
    <p class="text-foreground/70">Create and discover public or business pages</p>
  </div>

  <section class="rounded-2xl border bg-white shadow-lg p-6 space-y-4">
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
        <input 
          class="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
          placeholder="Search pages by name or description..."
          bind:value={searchQuery}
        />
      </div>
      <button class="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 justify-center" on:click={() => showCreate = true}>
        <Plus class="size-5" />
        Create Page
      </button>
    </div>
  </section>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else}
    <section class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each filteredPages as page}
        <a href={`/pages/${page.slug}`} class="rounded-2xl border bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
          {#if page.cover_url}
            <img src={page.cover_url} alt="Cover" class="w-full h-40 object-cover" />
          {:else}
            <div class="w-full h-40 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          {/if}
          <div class="p-4 space-y-2">
            <h3 class="font-bold text-lg">{page.title}</h3>
            {#if page.description}
              <p class="text-sm text-foreground/60 line-clamp-2">{page.description}</p>
            {/if}
            <div class="flex items-center gap-2 text-xs text-foreground/50">
              <Users class="size-4" />
              <span>Published {new Date(page.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </a>
      {/each}
    </section>
  {/if}

  {#if showCreate}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" on:click={() => showCreate = false}>
      <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" on:click|stopPropagation>
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Create Page</h2>
          <button class="p-2 hover:bg-gray-100 rounded-lg" on:click={() => showCreate = false}>
            <X class="size-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Title *</label>
            <input class="w-full rounded-lg border px-4 py-2" bind:value={form.title} placeholder="e.g. Karu Math Club" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea class="w-full rounded-lg border px-4 py-2 resize-none" rows="3" bind:value={form.description} placeholder="Describe your page" />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium">Cover</label>
            <div class="flex items-center gap-3">
              <label class="px-3 py-2 rounded-lg border hover:bg-gray-100 cursor-pointer inline-flex items-center gap-2">
                <input type="file" class="hidden" accept="image/*" on:change={handleCoverSelect} />
                <ImageIcon class="size-5" />
                <span class="text-sm">Upload</span>
              </label>
              {#if coverPreview}
                <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
                  <span class="text-sm">{coverFile?.name || 'Image selected'}</span>
                  <button class="p-1 hover:bg-gray-200 rounded" on:click={clearCover}><X class="size-4" /></button>
                </div>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" id="published" class="rounded" bind:checked={form.isPublished} />
            <label for="published" class="text-sm">Publish immediately</label>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button class="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100" on:click={() => showCreate = false}>Cancel</button>
          <button class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white disabled:opacity-50" on:click={createPage} disabled={creating || !form.title}>{creating ? 'Creating...' : 'Create Page'}</button>
        </div>
      </div>
    </div>
  {/if}
</main>