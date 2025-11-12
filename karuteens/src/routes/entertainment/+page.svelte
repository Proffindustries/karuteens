<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Play, Eye, Heart, Radio, Music, Video, Plus, Search, Filter, Clock } from 'lucide-svelte';

  type Content = {
    id: string;
    creator_id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    video_url?: string;
    stream_url?: string;
    category: string;
    tags?: string[];
    duration?: number;
    is_live: boolean;
    views: number;
    likes: number;
    created_at: string;
    profiles?: any;
  };

  let loading = true;
  let contents: Content[] = [];
  let searchQuery = '';
  let selectedCategory = 'all';
  let selectedFilter = 'trending'; // 'trending', 'latest', 'live'

  const categories = ['video', 'stream', 'music', 'podcast'];
  const categoryIcons: Record<string, any> = {
    video: Video,
    stream: Radio,
    music: Music,
    podcast: Play
  };

  onMount(async () => {
    await loadContent();
    loading = false;
  });

  async function loadContent() {
    let query = supabase
      .from('entertainment_content')
      .select('*, profiles!entertainment_content_creator_id_fkey(username, avatar_url)');

    if (selectedFilter === 'live') {
      query = query.eq('is_live', true);
    }

    if (selectedFilter === 'latest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('views', { ascending: false });
    }

    const { data } = await query.limit(50);
    contents = data || [];
  }

  function formatDuration(seconds?: number) {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatViews(views: number) {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  }

  function timeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  $: filteredContents = contents.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  $: {
    if (selectedFilter) loadContent();
  }
</script>

<main class="max-w-screen-xl mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <h1 class="text-4xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">Entertainment Arena</h1>
    <p class="text-foreground/70">Watch videos, join live streams, and enjoy music</p>
  </div>

  <!-- Search & Filters -->
  <section class="rounded-2xl border bg-white shadow-lg p-6 space-y-4">
    <div class="flex flex-col lg:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
        <input 
          class="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" 
          placeholder="Search entertainment..."
          bind:value={searchQuery}
        />
      </div>
      
      <div class="flex gap-3">
        <select class="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none bg-white" bind:value={selectedCategory}>
          <option value="all">All Types</option>
          {#each categories as cat}
            <option value={cat} class="capitalize">{cat}</option>
          {/each}
        </select>
        
        <div class="flex rounded-lg border border-gray-300 overflow-hidden">
          <button 
            class="px-4 py-3 text-sm font-medium transition-all {selectedFilter === 'trending' ? 'bg-pink-600 text-white' : 'bg-white hover:bg-gray-50'}"
            on:click={() => selectedFilter = 'trending'}
          >
            Trending
          </button>
          <button 
            class="px-4 py-3 text-sm font-medium transition-all border-x {selectedFilter === 'latest' ? 'bg-pink-600 text-white' : 'bg-white hover:bg-gray-50'}"
            on:click={() => selectedFilter = 'latest'}
          >
            Latest
          </button>
          <button 
            class="px-4 py-3 text-sm font-medium transition-all {selectedFilter === 'live' ? 'bg-pink-600 text-white' : 'bg-white hover:bg-gray-50'}"
            on:click={() => selectedFilter = 'live'}
          >
            🔴 Live
          </button>
        </div>
      </div>
    </div>
  </section>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-pink-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if filteredContents.length === 0}
    <div class="text-center py-12">
      <Video class="size-16 mx-auto mb-4 text-foreground/30" />
      <h3 class="text-xl font-semibold mb-2">No content found</h3>
      <p class="text-foreground/60">Try adjusting your search or filters</p>
    </div>
  {:else}
    <section class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each filteredContents as content}
        <a href={`/entertainment/${content.id}`} class="rounded-2xl overflow-hidden hover:shadow-xl transition-all group">
          <div class="relative aspect-video bg-gray-200">
            {#if content.thumbnail_url}
              <img src={content.thumbnail_url} alt={content.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            {:else}
              <div class="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <svelte:component this={categoryIcons[content.category] || Video} class="size-16 text-white/30" />
              </div>
            {/if}
            
            {#if content.is_live}
              <div class="absolute top-2 left-2 px-2 py-1 rounded bg-red-600 text-white text-xs font-bold flex items-center gap-1">
                <span class="size-2 rounded-full bg-white animate-pulse"></span>
                LIVE
              </div>
            {/if}
            
            {#if content.duration}
              <div class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-medium">
                {formatDuration(content.duration)}
              </div>
            {/if}
            
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <Play class="size-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          
          <div class="bg-white p-4 space-y-2">
            <div class="flex items-start gap-3">
              <img 
                src={content.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${content.profiles?.username}`} 
                alt={content.profiles?.username}
                class="size-10 rounded-full flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <h3 class="font-bold line-clamp-2 mb-1">{content.title}</h3>
                <p class="text-sm text-foreground/60">{content.profiles?.username}</p>
                <div class="flex items-center gap-3 text-xs text-foreground/60 mt-1">
                  <span class="flex items-center gap-1">
                    <Eye class="size-3" />
                    {formatViews(content.views)}
                  </span>
                  <span class="flex items-center gap-1">
                    <Heart class="size-3" />
                    {formatViews(content.likes)}
                  </span>
                  <span>{timeAgo(content.created_at)}</span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700 capitalize">{content.category}</span>
            </div>
          </div>
        </a>
      {/each}
    </section>
  {/if}
</main>
