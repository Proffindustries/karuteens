<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Save, X, Image as ImageIcon, Trash2 } from 'lucide-svelte';
  
  let eventId = $page.params.id;
  let event: any = null;
  let loading = true;
  let saving = false;
  let uploading = false;
  
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
  
  let coverFile: File | null = null;
  let coverPreview: string | null = null;
  let removeCover = false;
  
  onMount(async () => {
    await loadEvent();
  });
  
  async function loadEvent() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();
    
    if (data) {
      if ($user?.id !== data.organizer_id) {
        window.location.href = `/events/${eventId}`;
        return;
      }
      event = data;
      form.title = data.title;
      form.description = data.description || '';
      form.location = data.location || '';
      form.isOnline = data.is_online;
      form.meetingUrl = data.meeting_url || '';
      form.category = data.category;
      form.startTime = data.start_time?.slice(0, 16) || '';
      form.endTime = data.end_time?.slice(0, 16) || '';
      form.maxAttendees = data.max_attendees?.toString() || '';
      form.isPublic = data.is_public;
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
  
  async function saveEvent() {
    if (!form.title.trim() || !form.startTime || !$user) return;
    saving = true;
    
    let coverUrl: string | null = event.cover_url;
    
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
    
    const { error } = await supabase
      .from('events')
      .update({
        title: form.title.trim(),
        description: form.description || null,
        location: form.location || null,
        is_online: form.isOnline,
        meeting_url: form.meetingUrl || null,
        cover_url: coverUrl,
        category: form.category,
        start_time: form.startTime,
        end_time: form.endTime || null,
        max_attendees: form.maxAttendees ? parseInt(form.maxAttendees) : null,
        is_public: form.isPublic,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId);
    
    if (error) {
      alert(error.message);
      saving = false;
      return;
    }
    
    window.location.href = `/events/${eventId}`;
  }
</script>

<main class="min-h-screen bg-gray-50 py-8">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-purple-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !event}
    <div class="max-w-screen-md mx-auto px-4 text-center">
      <h1 class="text-2xl font-bold">Event Not Found</h1>
    </div>
  {:else}
    <div class="max-w-screen-lg mx-auto px-4">
      <div class="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-black">Edit Event</h1>
          <a href="/events/{eventId}" class="p-2 hover:bg-gray-100 rounded-lg">
            <X class="size-5" />
          </a>
        </div>
        
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-semibold mb-2">Event Title *</label>
            <input 
              class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
              bind:value={form.title} 
              placeholder="Event title"
            />
          </div>
          
          <div>
            <label class="block text-sm font-semibold mb-2">Description</label>
            <textarea 
              class="w-full rounded-lg border border-gray-300 px-4 py-3 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
              rows="4"
              bind:value={form.description} 
              placeholder="Describe your event"
            />
          </div>
          
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-2">Category *</label>
              <select class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent" bind:value={form.category}>
                {#each categories as cat}
                  <option value={cat}>{cat}</option>
                {/each}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-semibold mb-2">Max Attendees</label>
              <input 
                type="number" 
                class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                bind:value={form.maxAttendees} 
                placeholder="Optional"
              />
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="online" 
              class="rounded w-5 h-5" 
              bind:checked={form.isOnline} 
            />
            <label for="online" class="text-sm font-medium">Online Event</label>
          </div>
          
          {#if form.isOnline}
            <div>
              <label class="block text-sm font-semibold mb-2">Meeting URL</label>
              <input 
                class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                bind:value={form.meetingUrl} 
                placeholder="https://..."
              />
            </div>
          {:else}
            <div>
              <label class="block text-sm font-semibold mb-2">Location</label>
              <input 
                class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                bind:value={form.location} 
                placeholder="Enter venue or address"
              />
            </div>
          {/if}
          
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-2">Start Time *</label>
              <input 
                type="datetime-local" 
                class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                bind:value={form.startTime}
              />
            </div>
            
            <div>
              <label class="block text-sm font-semibold mb-2">End Time</label>
              <input 
                type="datetime-local" 
                class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                bind:value={form.endTime}
              />
            </div>
          </div>
          
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
          
          <div class="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="public" 
              class="rounded w-5 h-5" 
              bind:checked={form.isPublic} 
            />
            <label for="public" class="text-sm font-medium">Public (visible to everyone)</label>
          </div>
        </div>
        
        <div class="flex gap-3 pt-4 border-t">
          <a 
            href="/events/{eventId}" 
            class="flex-1 px-6 py-3 rounded-lg border hover:bg-gray-100 text-center font-semibold"
          >
            Cancel
          </a>
          <button 
            class="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            on:click={saveEvent}
            disabled={saving || !form.title || !form.startTime}
          >
            <Save class="size-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>
