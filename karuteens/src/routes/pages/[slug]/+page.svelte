<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Edit, Trash2, Eye } from 'lucide-svelte';
  
  let slug = $page.params.slug;
  let pageData: any = null;
  let loading = true;
  let isOwner = false;
  
  onMount(async () => {
    await loadPage();
  });
  
  async function loadPage() {
    const { data } = await supabase
      .from('pages')
      .select('*, profiles!pages_author_id_fkey(username, avatar_url)')
      .eq('slug', slug)
      .single();
    
    if (data) {
      pageData = data;
      isOwner = $user?.id === data.author_id;
    }
    loading = false;
  }
  
  async function deletePage() {
    if (!confirm('Delete this page? This cannot be undone.')) return;
    
    const { error } = await supabase
      .from('pages')
      .delete()
      .eq('id', pageData.id);
    
    if (!error) {
      window.location.href = '/pages';
    }
  }
</script>

<main class="min-h-screen bg-gray-50">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !pageData}
    <div class="max-w-screen-md mx-auto px-4 py-12 text-center">
      <h1 class="text-2xl font-bold mb-2">Page Not Found</h1>
      <p class="text-foreground/60">This page doesn't exist or has been removed.</p>
      <a href="/pages" class="mt-4 inline-block px-4 py-2 rounded-lg bg-blue-600 text-white">Browse Pages</a>
    </div>
  {:else}
    <!-- Cover Image -->
    {#if pageData.cover_url}
      <div class="w-full h-64 bg-cover bg-center" style="background-image: url({pageData.cover_url})"></div>
    {:else}
      <div class="w-full h-64 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
    {/if}
    
    <!-- Content -->
    <div class="max-w-screen-lg mx-auto px-4 -mt-20">
      <div class="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <!-- Header -->
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h1 class="text-4xl font-black mb-2">{pageData.title}</h1>
            {#if pageData.description}
              <p class="text-lg text-foreground/70">{pageData.description}</p>
            {/if}
          </div>
          
          {#if isOwner}
            <div class="flex gap-2">
              <a href="/pages/{slug}/edit" class="p-2 rounded-lg border hover:bg-gray-100" title="Edit">
                <Edit class="size-5" />
              </a>
              <button class="p-2 rounded-lg border hover:bg-red-50 text-red-600" on:click={deletePage} title="Delete">
                <Trash2 class="size-5" />
              </button>
            </div>
          {/if}
        </div>
        
        <!-- Author Info -->
        <div class="flex items-center gap-3 pt-4 border-t">
          <img 
            src={pageData.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${pageData.profiles?.username}`} 
            alt={pageData.profiles?.username}
            class="size-12 rounded-full"
          />
          <div>
            <p class="font-semibold">{pageData.profiles?.username}</p>
            <p class="text-sm text-foreground/60">Created {new Date(pageData.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
        
        <!-- Content -->
        {#if pageData.content}
          <div class="prose max-w-none pt-6 border-t">
            <div class="whitespace-pre-wrap">{pageData.content}</div>
          </div>
        {:else}
          <div class="py-12 text-center text-foreground/50 border-t">
            <Eye class="size-12 mx-auto mb-3 opacity-50" />
            <p>No content yet. {isOwner ? 'Click Edit to add content.' : ''}</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</main>
