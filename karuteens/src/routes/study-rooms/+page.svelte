<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Search, Plus, Users, CalendarDays, BookOpen, X } from 'lucide-svelte';
  import type { StudyRoom } from '$lib/types/study-room';
  
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
            user_id: currentUser.id
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
      window.location.href = `/study-rooms/${room.id}`;
    } catch (error) {
      console.error('Error creating room:', error);
      alert(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      creating = false;
    }
  }
  
  async function joinRoom(roomId: string) {
    if (!$user) { window.location.href = '/login'; return; }
    
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
    window.location.href = `/study-rooms/${roomId}`;
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
  
  <!-- Create Modal -->
  {#if showCreateModal}
    <div role="dialog" aria-modal="true" aria-labelledby="create-room-title" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" on:click={() => showCreateModal = false}>
      <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" on:click|stopPropagation>
        <div class="flex items-center justify-between">
          <h2 id="create-room-title" class="text-2xl font-bold">Create Study Room</h2>
          <button class="p-2 hover:bg-gray-100 rounded-lg" on:click={() => showCreateModal = false}>
            <X class="size-5" />
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label for="room-title" class="block text-sm font-medium mb-1">Title *</label>
            <input 
              id="room-title"
              class="w-full rounded-lg border px-4 py-2" 
              bind:value={form.title} 
              placeholder="e.g. Calculus Revision"
              required
            />
          </div>
          <div>
            <label for="room-subject" class="block text-sm font-medium mb-1">Subject *</label>
            <input 
              id="room-subject"
              class="w-full rounded-lg border px-4 py-2" 
              bind:value={form.subject} 
              placeholder="e.g. MTH101"
              required
            />
          </div>
          <div>
            <label for="room-description" class="block text-sm font-medium mb-1">Description</label>
            <textarea 
              id="room-description"
              class="w-full rounded-lg border px-4 py-2 resize-none" 
              rows={3} 
              bind:value={form.description} 
              placeholder="What will be covered?"
            ></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="room-schedule" class="block text-sm font-medium mb-1">Scheduled Time</label>
              <input 
                id="room-schedule"
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
                min="2" 
                max="50" 
                class="w-full rounded-lg border px-4 py-2" 
                bind:value={form.maxMembers} 
              />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="public-room" 
                class="rounded" 
                bind:checked={form.isPublic} 
              />
              <label for="public-room" class="text-sm">Public room</label>
            </div>
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <button class="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100" on:click={() => showCreateModal = false}>Cancel</button>
          <button class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white disabled:opacity-50" on:click={createRoom} disabled={creating || !form.title || !form.subject}>{creating ? 'Creating...' : 'Create Room'}</button>
        </div>
      </div>
    </div>
  {/if}
</main>
