<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Save, X, Image as ImageIcon, Trash2 } from 'lucide-svelte';
  
  let slug = $page.params.slug;
  let pageData: any = null;
  let loading = true;
  let saving = false;
  let uploading = false;
  
  let form = {
    title: '',
    description: '',
    content: '',
    isPublished: true
  };
  
  let coverFile: File | null = null;
  let coverPreview: string | null = null;
  let removeCover = false;
  
  onMount(async () => {
    await loadPage();
  });
  
  async function loadPage() {
    const { data } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (data) {
      if ($user?.id !== data.author_id) {
        window.location.href = `/pages/${slug}`;
        return;
      }
      pageData = data;
      form.title = data.title;
      form.description = data.description || '';
      form.content = data.content || '';
      form.isPublished = data.is_published;
      coverPreview = data.cover_url;
    }
    loading = false;
  }
  
  function handleCoverSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    coverFile = file;
    removeCover = false;
    const reader = new FileReader();
    reader.onload = (ev) => {
      coverPreview = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
  
  function clearCover() {
    coverFile = null;
    coverPreview = null;
    removeCover = true;
  }
  
  function slugify(str: string) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  
  async function savePage() {
    if (!form.title.trim() || !$user) return;
    saving = true;
    
    let coverUrl: string | null = pageData.cover_url;
    
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
    } else if (removeCover) {
      coverUrl = null;
    }
    
    const newSlug = slugify(form.title);
    
    const { error } = await supabase
      .from('pages')
      .update({
        title: form.title.trim(),
        slug: newSlug,
        description: form.description || null,
        content: form.content || null,
        cover_url: coverUrl,
        is_published: form.isPublished,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageData.id);
    
    if (error) {
      alert(error.message);
      saving = false;
      return;
    }
    
    window.location.href = `/pages/${newSlug}`;
  }
</script>

<main class="min-h-screen bg-gray-50 py-8">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !pageData}
    <div class="max-w-screen-md mx-auto px-4 text-center">
      <h1 class="text-2xl font-bold">Page Not Found</h1>
    </div>
  {:else}
    <div class="max-w-screen-lg mx-auto px-4">
      <div class="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-black">Edit Page</h1>
          <a href="/pages/{slug}" class="p-2 hover:bg-gray-100 rounded-lg">
            <X class="size-5" />
          </a>
        </div>
        
        <div class="space-y-5">
          <!-- Title -->
          <div>
            <label class="block text-sm font-semibold mb-2">Title *</label>
            <input 
              class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              bind:value={form.title} 
              placeholder="Page title"
            />
          </div>
          
          <!-- Description -->
          <div>
            <label class="block text-sm font-semibold mb-2">Description</label>
            <textarea 
              class="w-full rounded-lg border border-gray-300 px-4 py-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              rows="3"
              bind:value={form.description} 
              placeholder="Brief description of your page"
            />
          </div>
          
          <!-- Content -->
          <div>
            <label class="block text-sm font-semibold mb-2">Content</label>
            <textarea 
              class="w-full rounded-lg border border-gray-300 px-4 py-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm" 
              rows="12"
              bind:value={form.content} 
              placeholder="Write your page content here..."
            />
          </div>
          
          <!-- Cover Image -->
          <div class="space-y-3">
            <label class="block text-sm font-semibold">Cover Image</label>
            
            {#if coverPreview}
              <div class="relative w-full h-48 rounded-lg overflow-hidden border">
                <img src={coverPreview} alt="Cover" class="w-full h-full object-cover" />
                <button 
                  class="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  on:click={clearCover}
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
            {/if}
            
            <label class="px-4 py-2 rounded-lg border hover:bg-gray-100 cursor-pointer inline-flex items-center gap-2">
              <input type="file" class="hidden" accept="image/*" on:change={handleCoverSelect} />
              <ImageIcon class="size-5" />
              <span class="text-sm font-medium">{coverPreview ? 'Change Cover' : 'Upload Cover'}</span>
            </label>
          </div>
          
          <!-- Published Toggle -->
          <div class="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="published" 
              class="rounded w-5 h-5" 
              bind:checked={form.isPublished} 
            />
            <label for="published" class="text-sm font-medium">Published (visible to everyone)</label>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex gap-3 pt-4 border-t">
          <a 
            href="/pages/{slug}" 
            class="flex-1 px-6 py-3 rounded-lg border hover:bg-gray-100 text-center font-semibold"
          >
            Cancel
          </a>
          <button 
            class="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            on:click={savePage}
            disabled={saving || !form.title}
          >
            <Save class="size-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>
