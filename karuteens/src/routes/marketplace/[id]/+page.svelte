<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { MapPin, Eye, MessageCircle, Edit, Trash2, ChevronLeft, ChevronRight, Share2, X } from 'lucide-svelte';
  
  let listingId = $page.params.id;
  let listing: any = null;
  let loading = true;
  let isSeller = false;
  let currentImageIndex = 0;
  let showMessageModal = false;
  let message = '';
  let sending = false;
  
  onMount(async () => {
    await loadListing();
    await incrementViews();
  });
  
  async function loadListing() {
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*, profiles!marketplace_listings_seller_id_fkey(id, username, avatar_url)')
      .eq('id', listingId)
      .single();
    
    if (data) {
      listing = data;
      isSeller = $user?.id === data.seller_id;
    }
    loading = false;
  }
  
  async function incrementViews() {
    if (!listing || isSeller) return;
    await supabase
      .from('marketplace_listings')
      .update({ views: (listing.views || 0) + 1 })
      .eq('id', listingId);
  }
  
  async function deleteListing() {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    
    const { error } = await supabase
      .from('marketplace_listings')
      .delete()
      .eq('id', listingId);
    
    if (!error) {
      window.location.href = '/marketplace';
    }
  }
  
  async function sendMessage() {
    if (!message.trim() || !$user || !listing) return;
    sending = true;
    
    const { error } = await supabase
      .from('listing_messages')
      .insert({
        listing_id: listingId,
        sender_id: $user.id,
        receiver_id: listing.seller_id,
        message: message.trim()
      });
    
    if (error) {
      alert(error.message);
      sending = false;
      return;
    }
    
    showMessageModal = false;
    message = '';
    sending = false;
    alert('Message sent to seller!');
  }
  
  function formatPrice(cents: number) {
    return (cents / 100).toFixed(2);
  }
  
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  
  function nextImage() {
    if (!listing?.images) return;
    currentImageIndex = (currentImageIndex + 1) % listing.images.length;
  }
  
  function prevImage() {
    if (!listing?.images) return;
    currentImageIndex = (currentImageIndex - 1 + listing.images.length) % listing.images.length;
  }
  
  function shareListing() {
    if (navigator.share) {
      navigator.share({
        title: listing.title,
        text: listing.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  }
  
  function contactSeller() {
    if (!$user) {
      window.location.href = '/auth/sign-in';
      return;
    }
    showMessageModal = true;
  }
</script>

<main class="min-h-screen bg-gray-50">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-orange-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !listing}
    <div class="max-w-screen-md mx-auto px-4 py-12 text-center">
      <h1 class="text-2xl font-bold mb-2">Listing Not Found</h1>
      <p class="text-foreground/60">This item doesn't exist or has been removed.</p>
      <a href="/marketplace" class="mt-4 inline-block px-4 py-2 rounded-lg bg-orange-600 text-white">Browse Marketplace</a>
    </div>
  {:else}
    <div class="max-w-screen-xl mx-auto px-4 py-8">
      <a href="/marketplace" class="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground mb-6">
        <ChevronLeft class="size-4" />
        Back to Marketplace
      </a>
      
      <div class="grid lg:grid-cols-2 gap-8">
        <!-- Images ---->
        <div class="space-y-4">
          <div class="relative aspect-square rounded-2xl overflow-hidden bg-gray-200">
            {#if listing.images && listing.images.length > 0}
              <img src={listing.images[currentImageIndex]} alt={listing.title} class="w-full h-full object-cover" />
              
              {#if listing.images.length > 1}
                <button class="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white" on:click={prevImage}>
                  <ChevronLeft class="size-5" />
                </button>
                <button class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white" on:click={nextImage}>
                  <ChevronRight class="size-5" />
                </button>
                
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {#each listing.images as _, i}
                    <button 
                      class="size-2 rounded-full transition-all {i === currentImageIndex ? 'bg-white' : 'bg-white/50'}"
                      on:click={() => currentImageIndex = i}
                    />
                  {/each}
                </div>
              {/if}
            {:else}
              <div class="w-full h-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <span class="text-white/50 text-xl">No Image</span>
              </div>
            {/if}
          </div>
          
          {#if listing.images && listing.images.length > 1}
            <div class="grid grid-cols-4 gap-2">
              {#each listing.images as img, i}
                <button 
                  class="aspect-square rounded-lg overflow-hidden border-2 transition-all {i === currentImageIndex ? 'border-orange-600' : 'border-transparent'}"
                  on:click={() => currentImageIndex = i}
                >
                  <img src={img} alt="Thumbnail" class="w-full h-full object-cover" />
                </button>
              {/each}
            </div>
          {/if}
        </div>
        
        <!-- Details -->
        <div class="space-y-6">
          <div class="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">{listing.category}</span>
                  <span class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 capitalize">{listing.condition.replace('_', ' ')}</span>
                </div>
                <h1 class="text-3xl font-black mb-2">{listing.title}</h1>
                <p class="text-4xl font-black text-orange-600">${formatPrice(listing.price)}</p>
              </div>
              
              <div class="flex gap-2">
                <button class="p-2 rounded-lg border hover:bg-gray-100" on:click={shareListing} title="Share">
                  <Share2 class="size-5" />
                </button>
                {#if isSeller}
                  <a href="/marketplace/product/{listingId}/edit" class="p-2 rounded-lg border hover:bg-gray-100" title="Edit">
                    <Edit class="size-5" />
                  </a>
                  <button class="p-2 rounded-lg border hover:bg-red-50 text-red-600" on:click={deleteListing} title="Delete">
                    <Trash2 class="size-5" />
                  </button>
                {/if}
              </div>
            </div>
            
            {#if listing.description}
              <div class="pt-4 border-t">
                <h2 class="font-bold mb-2">Description</h2>
                <p class="text-foreground/80 whitespace-pre-wrap">{listing.description}</p>
              </div>
            {/if}
            
            <div class="pt-4 border-t space-y-3">
              {#if listing.location}
                <div class="flex items-center gap-2 text-foreground/70">
                  <MapPin class="size-5" />
                  <span>{listing.location}</span>
                </div>
              {/if}
              
              <div class="flex items-center gap-2 text-foreground/70">
                <Eye class="size-5" />
                <span>{listing.views || 0} views</span>
              </div>
              
              <div class="text-sm text-foreground/60">
                Listed on {formatDate(listing.created_at)}
              </div>
            </div>
            
            <!-- Seller Info -->
            <div class="pt-4 border-t">
              <h2 class="font-bold mb-3">Seller</h2>
              <div class="flex items-center gap-3">
                <img 
                  src={listing.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${listing.profiles?.username}`} 
                  alt={listing.profiles?.username}
                  class="size-12 rounded-full"
                />
                <div>
                  <p class="font-semibold">{listing.profiles?.username}</p>
                  <a href="/profile/{listing.profiles?.id}" class="text-sm text-orange-600 hover:underline">View Profile</a>
                </div>
              </div>
            </div>
            
            {#if !isSeller}
              <button 
                class="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                on:click={contactSeller}
              >
                <MessageCircle class="size-6" />
                Contact Seller
              </button>
            {:else}
              <div class="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <p class="text-sm font-medium text-blue-700">This is your listing</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Message Modal -->
  {#if showMessageModal}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" on:click={() => showMessageModal = false}>
      <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" on:click|stopPropagation>
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Contact Seller</h2>
          <button class="p-2 hover:bg-gray-100 rounded-lg" on:click={() => showMessageModal = false}>
            <X class="size-5" />
          </button>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Your Message</label>
          <textarea 
            class="w-full rounded-lg border px-4 py-3 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
            rows="5"
            bind:value={message}
            placeholder="Hi, is this item still available?"
          />
        </div>
        
        <div class="flex gap-3">
          <button class="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100" on:click={() => showMessageModal = false}>Cancel</button>
          <button 
            class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 text-white disabled:opacity-50" 
            on:click={sendMessage}
            disabled={sending || !message.trim()}
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>
