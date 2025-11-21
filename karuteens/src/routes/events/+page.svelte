<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Calendar, MapPin, Users, Clock, Video, Plus, X, Image as ImageIcon, Globe, Search, Filter } from 'lucide-svelte';

  type Event = {
    id: string;
    organizer_id: string;
    title: string;
    description?: string;
    location?: string;
    is_online: boolean;
    meeting_url?: string;
    cover_url?: string;
    category: string;
    start_time: string;
    end_time?: string;
    max_attendees?: number;
    is_public: boolean;
    created_at: string;
    attendee_count?: number;
  };

  let loading = true;
  let events: Event[] = [];
  let searchQuery = '';
  let selectedCategory = 'all';
  let showCreate = false;
  let creating = false;
  let uploading = false;
  let coverFile: File | null = null;
  let coverPreview: string | null = null;
  
  // Pagination variables
  let page = 1;
  let pageSize = 12;
  let hasMore = true;
  let loadingMore = false;

  const categories = ['Academic', 'Social', 'Sports', 'Workshop', 'Career', 'Other'];

  let form = {
    title: '',
    description: '',
    location: '',
    isOnline: false,
    meetingUrl: '',
    category: 'Academic',
    startTime: '',
    endTime: '',
    maxAttendees: '',
    isPublic: true
  };

  onMount(async () => {
    await loadEvents();
    loading = false;
  });

  async function loadEvents() {
    try {
      // Use our API instead of Supabase directly
      const response = await fetch(`/api/events?limit=${pageSize}&offset=${(page - 1) * pageSize}`);
      const result = await response.json();
      
      if (result.success) {
        const newEvents = result.data.map((e: any) => ({
          ...e,
          attendee_count: 0 // We'll need to get this from our API or add it later
        }));
        
        // If we're loading more events, append them to existing events
        if (page > 1) {
          events = [...events, ...newEvents];
        } else {
          events = newEvents;
        }
        
        // Check if we have more events to load
        hasMore = result.data.length === pageSize;
      }
    } catch (error) {
      console.error('Error loading events:', error);
      // Fallback to Supabase if API fails
      const { data } = await supabase
        .from('events')
        .select('*, event_attendees(count)')
        .eq('is_public', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      if (data) {
        const newEvents = data.map(e => ({
          ...e,
          attendee_count: e.event_attendees?.[0]?.count || 0
        }));
        
        // If we're loading more events, append them to existing events
        if (page > 1) {
          events = [...events, ...newEvents];
        } else {
          events = newEvents;
        }
        
        // Check if we have more events to load
        hasMore = data.length === pageSize;
      }
    }
    
    loadingMore = false;
  }

  async function loadMoreEvents() {
    if (!hasMore || loadingMore) return;
    
    loadingMore = true;
    page++;
    await loadEvents();
  }

  function handleCoverSelect(e: any) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    coverFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      coverPreview = (ev.target as FileReader).result as string;
    };
    reader.readAsDataURL(file);
  }

  function clearCover() {
    coverFile = null;
    coverPreview = null;
  }

  async function createEvent() {
    if (!form.title.trim() || !form.startTime) return;
    if (!$user) { window.location.href = '/auth/sign-in'; return; }
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

    // Use our API instead of Supabase directly
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description || null,
          location: form.location || null,
          isOnline: form.isOnline,
          meetingUrl: form.meetingUrl || null,
          coverUrl: coverUrl,
          category: form.category,
          startTime: form.startTime,
          endTime: form.endTime || null,
          maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : null,
          isPublic: form.isPublic
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Auto-add organizer as attendee using our API
        await fetch(`/api/events/${result.data.id}/attendees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'going'
          })
        });

        showCreate = false;
        form = { title: '', description: '', location: '', isOnline: false, meetingUrl: '', category: 'Academic', startTime: '', endTime: '', maxAttendees: '', isPublic: true };
        coverFile = null; coverPreview = null;
        await loadEvents();
        window.location.href = `/events/${result.data.id}`;
      } else {
        alert(result.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    }

    creating = false;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  $: filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
</script>

<main class="max-w-screen-xl mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <h1 class="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Events</h1>
    <p class="text-foreground/70">Discover and join upcoming events in your community</p>
  </div>

  <section class="rounded-2xl border bg-white shadow-lg p-6 space-y-4">
    <div class="flex flex-col lg:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
        <input 
          class="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
          placeholder="Search events..."
          bind:value={searchQuery}
        />
      </div>
      
      <div class="flex gap-3">
        <div class="relative">
          <Filter class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
          <select class="rounded-lg border border-gray-300 pl-10 pr-8 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white" bind:value={selectedCategory}>
            <option value="all">All Categories</option>
            {#each categories as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
        </div>
        
        <button class="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2" on:click={() => showCreate = true}>
          <Plus class="size-5" />
          Create Event
        </button>
      </div>
    </div>
  </section>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-purple-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if filteredEvents.length === 0}
    <div class="text-center py-12">
      <Calendar class="size-16 mx-auto mb-4 text-foreground/30" />
      <h3 class="text-xl font-semibold mb-2">No events found</h3>
      <p class="text-foreground/60">Be the first to create an event!</p>
    </div>
  {:else}
    <section class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each filteredEvents as event}
        <a href={`/events/${event.id}`} class="rounded-2xl border bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group">
          {#if event.cover_url}
            <img src={event.cover_url} alt="Cover" class="w-full h-48 object-cover group-hover:scale-105 transition-transform" />
          {:else}
            <div class="w-full h-48 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"></div>
          {/if}
          
          <div class="p-5 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-bold text-lg line-clamp-2 flex-1">{event.title}</h3>
              <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{event.category}</span>
            </div>
            
            {#if event.description}
              <p class="text-sm text-foreground/60 line-clamp-2">{event.description}</p>
            {/if}
            
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-foreground/70">
                <Calendar class="size-4" />
                <span>{formatDate(event.start_time)} at {formatTime(event.start_time)}</span>
              </div>
              
              {#if event.is_online}
                <div class="flex items-center gap-2 text-foreground/70">
                  <Video class="size-4" />
                  <span>Online Event</span>
                </div>
              {:else if event.location}
                <div class="flex items-center gap-2 text-foreground/70">
                  <MapPin class="size-4" />
                  <span class="line-clamp-1">{event.location}</span>
                </div>
              {/if}
              
              <div class="flex items-center gap-2 text-foreground/70">
                <Users class="size-4" />
                <span>{event.attendee_count || 0} {event.max_attendees ? `/ ${event.max_attendees}` : ''} attending</span>
              </div>
            </div>
          </div>
        </a>
      {/each}
    </section>
    
    <!-- Load More Button -->
    {#if hasMore}
      <div class="flex justify-center py-6">
        <button 
          class="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
          on:click={loadMoreEvents}
          disabled={loadingMore}
        >
          {#if loadingMore}
            <div class="animate-spin size-5 border-2 border-white border-t-transparent rounded-full"></div>
            Loading...
          {:else}
            Load More Events
          {/if}
        </button>
      </div>
    {/if}
  {/if}

  {#if showCreate}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="create-event-title" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && (showCreate = false)}>
      <div class="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8" role="document">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Create Event</h2>
          <button class="p-2 hover:bg-gray-100 rounded-lg" on:click={() => showCreate = false}>
            <X class="size-5" />
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label for="event-title" class="block text-sm font-medium mb-1">Event Title *</label>
            <input id="event-title" class="w-full rounded-lg border px-4 py-2" bind:value={form.title} placeholder="e.g. Study Group Session" />
          </div>
          
          <div>
            <label for="event-description" class="block text-sm font-medium mb-1">Description</label>
            <textarea id="event-description" class="w-full rounded-lg border px-4 py-2 resize-none" rows="3" bind:value={form.description} placeholder="Describe your event"></textarea>
          </div>

          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label for="event-category" class="block text-sm font-medium mb-1">Category *</label>
              <select id="event-category" class="w-full rounded-lg border px-4 py-2" bind:value={form.category}>
                {#each categories as cat}
                  <option value={cat}>{cat}</option>
                {/each}
              </select>
            </div>
            
            <div>
              <label for="max-attendees" class="block text-sm font-medium mb-1">Max Attendees</label>
              <input type="number" id="max-attendees" class="w-full rounded-lg border px-4 py-2" bind:value={form.maxAttendees} placeholder="Optional" />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" id="online" class="rounded" bind:checked={form.isOnline} />
            <label for="online" class="text-sm font-medium">Online Event</label>
          </div>

          {#if form.isOnline}
            <div>
              <label for="meeting-url" class="block text-sm font-medium mb-1">Meeting URL</label>
              <input id="meeting-url" class="w-full rounded-lg border px-4 py-2" bind:value={form.meetingUrl} placeholder="https://..." />
            </div>
          {:else}
            <div>
              <label for="event-location" class="block text-sm font-medium mb-1">Location</label>
              <input id="event-location" class="w-full rounded-lg border px-4 py-2" bind:value={form.location} placeholder="Enter venue or address" />
            </div>
          {/if}

          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label for="start-time" class="block text-sm font-medium mb-1">Start Time *</label>
              <input type="datetime-local" id="start-time" class="w-full rounded-lg border px-4 py-2" bind:value={form.startTime} />
            </div>
            
            <div>
              <label for="end-time" class="block text-sm font-medium mb-1">End Time</label>
              <input type="datetime-local" id="end-time" class="w-full rounded-lg border px-4 py-2" bind:value={form.endTime} />
            </div>
          </div>

          <div class="space-y-2">
            <label for="cover-image" class="block text-sm font-medium">Cover Image</label>
            {#if coverPreview}
              <div class="relative w-full h-40 rounded-lg overflow-hidden border">
                <img src={coverPreview} alt="Cover" class="w-full h-full object-cover" />
                <button class="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg" on:click={clearCover}>
                  <X class="size-4" />
                </button>
              </div>
            {/if}
            <label for="cover-image" class="px-3 py-2 rounded-lg border hover:bg-gray-100 cursor-pointer inline-flex items-center gap-2">
              <input type="file" id="cover-image" class="hidden" accept="image/*" on:change={handleCoverSelect} />
              <ImageIcon class="size-5" />
              <span class="text-sm">{coverPreview ? 'Change' : 'Upload'} Cover</span>
            </label>
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" id="public" class="rounded" bind:checked={form.isPublic} />
            <label for="public" class="text-sm">Public (visible to everyone)</label>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button class="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100" on:click={() => showCreate = false}>Cancel</button>
          <button class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white disabled:opacity-50" on:click={createEvent} disabled={creating || !form.title || !form.startTime}>
            {creating ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>