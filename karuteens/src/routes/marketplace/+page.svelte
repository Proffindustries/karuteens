<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Search, Plus, X, Image as ImageIcon, DollarSign, MapPin, Eye, Tag, Filter, Trash2 } from 'lucide-svelte';

  type Listing = {
    id: string;
    seller_id: string;
    title: string;
    description?: string;
    category: string;
    price: number;
    condition: string;
    images?: string[];
    location?: string;
    is_available: boolean;
    views: number;
    created_at: string;
    profiles?: any;
  };

  let loading = true;
  let listings: Listing[] = [];
  let searchQuery = '';
  let selectedCategory = 'all';
  let selectedCondition = 'all';
  let showCreate = false;
  let creating = false;
  let uploading = false;
  let imageFiles: File[] = [];
  let imagePreviews: string[] = [];

  const categories = ['Books', 'Electronics', 'Furniture', 'Clothing', 'Stationery', 'Sports', 'Other'];
  const conditions = ['new', 'like_new', 'good', 'fair'];

  let form = {
    title: '',
    description: '',
    category: 'Books',
    price: '',
    condition: 'good',
    location: ''
  };

  onMount(async () => {
    await loadListings();
    loading = false;
  });

  async function loadListings() {
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*, profiles!marketplace_listings_seller_id_fkey(username, avatar_url)')
      .eq('is_available', true)
      .order('created_at', { ascending: false });
    listings = data || [];
  }

  function handleImageSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (imageFiles.length + files.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      imageFiles = [...imageFiles, file];
      const reader = new FileReader();
      reader.onload = (ev) => {
        imagePreviews = [...imagePreviews, ev.target?.result as string];
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index: number) {
    imageFiles = imageFiles.filter((_, i) => i !== index);
    imagePreviews = imagePreviews.filter((_, i) => i !== index);
  }

  async function createListing() {
    if (!form.title.trim() || !form.price) return;
    if (!$user) { window.location.href = '/auth/sign-in'; return; }
    creating = true;

    let imageUrls: string[] = [];
    if (imageFiles.length > 0) {
      uploading = true;
      for (const file of imageFiles) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('userId', $user.id);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const { url } = await res.json();
          imageUrls.push(url);
        }
      }
      uploading = false;
    }

    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({
        seller_id: $user.id,
        title: form.title.trim(),
        description: form.description || null,
        category: form.category,
        price: Math.round(parseFloat(form.price) * 100), // convert to cents
        condition: form.condition,
        images: imageUrls.length > 0 ? imageUrls : null,
        location: form.location || null
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      creating = false;
      return;
    }

    showCreate = false;
    form = { title: '', description: '', category: 'Books', price: '', condition: 'good', location: '' };
    imageFiles = [];
    imagePreviews = [];
    await loadListings();
    window.location.href = `/marketplace/${data.id}`;
  }

  function formatPrice(cents: number) {
    return (cents / 100).toFixed(2);
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

  $: filteredListings = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || l.category === selectedCategory;
    const matchesCondition = selectedCondition === 'all' || l.condition === selectedCondition;
    return matchesSearch && matchesCategory && matchesCondition;
  });
</script>

<main class="max-w-screen-xl mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <h1 class="text-4xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Marketplace</h1>
    <p class="text-foreground/70">Buy and sell items with other students</p>
  </div>

  <!-- Search & Filters -->
  <section class="rounded-2xl border bg-white shadow-lg p-6 space-y-4">
    <div class="flex flex-col lg:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
        <input 
          class="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" 
          placeholder="Search marketplace..."
          bind:value={searchQuery}
        />
      </div>
      
      <div class="flex gap-3">
        <select class="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white" bind:value={selectedCategory}>
          <option value="all">All Categories</option>
          {#each categories as cat}
            <option value={cat}>{cat}</option>
          {/each}
        </select>
        
        <select class="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white" bind:value={selectedCondition}>
          <option value="all">All Conditions</option>
          {#each conditions as cond}
            <option value={cond} class="capitalize">{cond.replace('_', ' ')}</option>
          {/each}
        </select>
        
        <button class="px-6 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 whitespace-nowrap" on:click={() => showCreate = true}>
          <Plus class="size-5" />
          Sell Item
        </button>
      </div>
    </div>
  </section>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-orange-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if filteredListings.length === 0}
    <div class="text-center py-12">
      <Tag class="size-16 mx-auto mb-4 text-foreground/30" />
      <h3 class="text-xl font-semibold mb-2">No items found</h3>
      <p class="text-foreground/60">Be the first to list an item for sale!</p>
    </div>
  {:else}
    <section class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each filteredListings as listing}
        <a href={`/marketplace/${listing.id}`} class="rounded-2xl border bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group">
          {#if listing.images && listing.images.length > 0}
            <img src={listing.images[0]} alt={listing.title} class="w-full h-48 object-cover group-hover:scale-105 transition-transform" />
          {:else}
            <div class="w-full h-48 bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Tag class="size-20 text-white/30" />
            </div>
          {/if}
          
          <div class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-bold text-lg line-clamp-2 flex-1">{listing.title}</h3>
            </div>
            
            <div class="flex items-center justify-between">
              <p class="text-2xl font-black text-orange-600">${formatPrice(listing.price)}</p>
              <span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">{listing.condition.replace('_', ' ')}</span>
            </div>
            
            {#if listing.description}
              <p class="text-sm text-foreground/60 line-clamp-2">{listing.description}</p>
            {/if}
            
            <div class="flex items-center justify-between pt-2 border-t text-xs text-foreground/60">
              <div class="flex items-center gap-2">
                <img 
                  src={listing.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${listing.profiles?.username}`} 
                  alt={listing.profiles?.username}
                  class="size-5 rounded-full"
                />
                <span>{listing.profiles?.username}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <Eye class="size-3" /> {listing.views}
                </span>
                <span>{timeAgo(listing.created_at)}</span>
              </div>
            </div>
            
            <span class="inline-block px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{listing.category}</span>
          </div>
        </a>
      {/each}
    </section>
  {/if}

  {#if showCreate}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" on:click={() => showCreate = false}>
      <div class="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8" on:click|stopPropagation>
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">List Item for Sale</h2>
          <button class="p-2 hover:bg-gray-100 rounded-lg" on:click={() => showCreate = false}>
            <X class="size-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Title *</label>
            <input class="w-full rounded-lg border px-4 py-2" bind:value={form.title} placeholder="e.g. Calculus Textbook" />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <textarea class="w-full rounded-lg border px-4 py-2 resize-none" rows="3" bind:value={form.description} placeholder="Describe your item" />
          </div>

          <div class="grid md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Category *</label>
              <select class="w-full rounded-lg border px-4 py-2" bind:value={form.category}>
                {#each categories as cat}
                  <option value={cat}>{cat}</option>
                {/each}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1">Price ($) *</label>
              <input type="number" step="0.01" class="w-full rounded-lg border px-4 py-2" bind:value={form.price} placeholder="0.00" />
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1">Condition *</label>
              <select class="w-full rounded-lg border px-4 py-2" bind:value={form.condition}>
                {#each conditions as cond}
                  <option value={cond} class="capitalize">{cond.replace('_', ' ')}</option>
                {/each}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Location</label>
            <input class="w-full rounded-lg border px-4 py-2" bind:value={form.location} placeholder="Optional" />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium">Images (Max 5)</label>
            
            {#if imagePreviews.length > 0}
              <div class="grid grid-cols-3 gap-3">
                {#each imagePreviews as preview, i}
                  <div class="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={preview} alt="Preview" class="w-full h-full object-cover" />
                    <button class="absolute top-1 right-1 p-1 bg-red-600 text-white rounded" on:click={() => removeImage(i)}>
                      <X class="size-3" />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
            
            {#if imagePreviews.length < 5}
              <label class="px-3 py-2 rounded-lg border hover:bg-gray-100 cursor-pointer inline-flex items-center gap-2">
                <input type="file" class="hidden" accept="image/*" multiple on:change={handleImageSelect} />
                <ImageIcon class="size-5" />
                <span class="text-sm">Add Images</span>
              </label>
            {/if}
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button class="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100" on:click={() => showCreate = false}>Cancel</button>
          <button class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white disabled:opacity-50" on:click={createListing} disabled={creating || !form.title || !form.price}>
            {creating ? (uploading ? 'Uploading...' : 'Creating...') : 'List Item'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>
