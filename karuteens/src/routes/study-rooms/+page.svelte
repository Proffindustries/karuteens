<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Search, Plus, Users, CalendarDays, BookOpen, X } from 'lucide-svelte';
  import type { StudyRoom } from '$lib/types/study-room';
  import { goto } from '$app/navigation';
  
  interface RoomFormData {
    title: string;
    subject: string;
    description: string;
    isPublic: boolean;
    scheduledAt: string;
    maxMembers: number;
  }
  
  let loading = true;
  let rooms: StudyRoom[] = [];
  let searchQuery = '';
  let showCreateModal = false;
  let creating = false;
  
  let form: RoomFormData = {
    title: '',
    subject: '',
    description: '',
    isPublic: true,
    scheduledAt: '',
    maxMembers: 10
  };
  
  onMount(async () => {
    await loadRooms();
    loading = false;
  });
  
  async function loadRooms() {
    const { data } = await supabase
      .from('study_rooms')
      .select('*')
      .eq('is_public', true)
      .order('scheduled_at', { ascending: true });
    
    if (data) {
      const withCounts = await Promise.all(
        data.map(async (r: StudyRoom) => {
          const { count } = await supabase
            .from('study_room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', r.id);
          return { ...r, member_count: count || 0 };
        })
      );
      rooms = withCounts;
    }
  }
  
  $: filteredRooms = rooms.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  async function createRoom() {
    creating = true;
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { data: room, error } = await supabase
        .from('study_rooms')
        .insert([
          {
            title: form.title,
            subject: form.subject,
            description: form.description || null,
            is_public: form.isPublic,
            scheduled_at: form.scheduledAt || null,
            max_members: form.maxMembers,
            host_id: currentUser.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Add creator as a member with host role
      const { error: memberError } = await supabase
        .from('study_room_members')
        .insert([
          {
            room_id: room.id,
            user_id: currentUser.id,
            role: 'host'
          }
        ]);

      if (memberError) throw memberError;

      // Reset form and close modal
      showCreateModal = false;
      form = {
        title: '',
        subject: '',
        description: '',
        isPublic: true,
        scheduledAt: '',
        maxMembers: 10
      };
      
      // Redirect to the new room
      goto(`/study-rooms/${room.id}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      creating = false;
    }
  }
  
  async function joinRoom(roomId: string) {
    if (!$user) { goto('/login'); return; }
    
    const { data: existing } = await supabase
      .from('study_room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', $user.id)
      .single();
    
    if (!existing) {
      const { error } = await supabase
        .from('study_room_members')
        .insert({ room_id: roomId, user_id: $user.id, role: 'member' });
      if (error) { alert(error.message); return; }
    }
    goto(`/study-rooms/${roomId}`);
  }
</script>

<main class="max-w-screen-lg mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <h1 class="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Study Rooms</h1>
    <p class="text-foreground/70">Create or join virtual rooms to study together</p>
  </div>

  
  <!-- Search + Create -->
  <section class="rounded-2xl border bg-white shadow-lg p-6 space-y-4">
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
        <input 
          class="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
          placeholder="Search rooms by title or subject..."
          bind:value={searchQuery}
        />
      </div>
      <button class="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 justify-center" on:click={() => showCreateModal = true}>
        <Plus class="size-5" />
        Create Room
      </button>
    </div>
  </section>
  
  <!-- Rooms Grid -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else}
    <section class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each filteredRooms as room}
        <div class="rounded-2xl border bg-white p-6 space-y-3 hover:shadow-xl hover:-translate-y-1 transition-all">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-bold text-lg">{room.title}</h3>
              <p class="text-sm text-foreground/60">{room.subject}</p>
            </div>
            <span class="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium">{room.is_public ? 'Public' : 'Private'}</span>
          </div>
          {#if room.description}
            <p class="text-sm text-foreground/70">{room.description}</p>
          {/if}
          <div class="flex items-center justify-between text-sm text-foreground/60">
            <div class="flex items-center gap-2">
              <Users class="size-4" />
              <span>{room.member_count || 0} / {room.max_members}</span>
            </div>
            {#if room.scheduled_at}
              <div class="flex items-center gap-2">
                <CalendarDays class="size-4" />
                <span>{new Date(room.scheduled_at).toLocaleString()}</span>
              </div>
            {/if}
          </div>
          <div class="flex gap-2">
            <a href={`/study-rooms/${room.id}`} class="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100 transition">View</a>
            <button class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white" on:click={() => joinRoom(room.id)}>Join</button>
          </div>
        </div>
      {/each}
    </section>
  {/if}
  
<!-- Modal for creating a new room -->
{#if showCreateModal}
  <div 
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-room-title"
    tabindex="-1"
    on:click|self={() => showCreateModal = false}
    on:keydown|self={(e) => e.key === 'Escape' && (showCreateModal = false)}
    class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
  >
    <div
      class="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
      role="document"
    >
      <div class="flex justify-between items-center mb-6">
        <h2 id="create-room-title" class="text-2xl font-bold">Create Study Room</h2>
        <button 
          type="button"
          on:click={() => showCreateModal = false}
          class="text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <form on:submit|preventDefault={createRoom} class="space-y-4">
        <div class="space-y-4">
          <div>
            <label for="room-title" class="block text-sm font-medium mb-1">Room Title</label>
            <input
              id="room-title"
              type="text"
              class="w-full rounded-lg border px-4 py-2"
              bind:value={form.title}
              required
              placeholder="Enter room title"
            />
          </div>
          <div>
            <label for="room-subject" class="block text-sm font-medium mb-1">Subject</label>
            <input
              id="room-subject"
              type="text"
              class="w-full rounded-lg border px-4 py-2"
              bind:value={form.subject}
              required
              placeholder="e.g., Mathematics, Physics"
            />
          </div>
          <div>
            <label for="room-description" class="block text-sm font-medium mb-1">Description</label>
            <textarea
              id="room-description"
              rows="3"
              class="w-full rounded-lg border px-4 py-2"
              bind:value={form.description}
              placeholder="Optional description..."
            ></textarea>
          </div>
          <div class="flex items-center space-x-2">
            <input
              id="room-public"
              type="checkbox"
              class="rounded border-gray-300"
              bind:value={form.isPublic}
            />
            <label for="room-public" class="text-sm font-medium">Public Room (anyone can join)</label>
          </div>
          <div>
            <label for="room-scheduled" class="block text-sm font-medium mb-1">Scheduled Start (optional)</label>
            <input
              id="room-scheduled"
              type="datetime-local"
              class="w-full rounded-lg border px-4 py-2"
              bind:value={form.scheduledAt}
            />
          </div>
          <div>
            <label for="room-max-members" class="block text-sm font-medium mb-1">Max Members</label>
            <input
              id="room-max-members"
              type="number"
              min="1"
              max="100"
              class="w-full rounded-lg border px-4 py-2"
              bind:value={form.maxMembers}
              required
            />
          </div>
        </div>
        
        <div class="flex gap-3 pt-2">
          <button 
            type="button"
            on:click={() => showCreateModal = false}
            class="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white disabled:opacity-50" 
            disabled={creating || !form.title || !form.subject}
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
</main>