<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import { supabase } from '$lib/supabase/client';
  import { Search, Users, MessageCircle, UserPlus, MapPin, Book, Sparkles } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  
  let searchQuery = '';
  let allUsers: any[] = [];
  let loading = true;
  let selectedFilter = 'All';
  
  const filters = ['All', 'Students', 'Tutors', 'Online', 'Nearby'];
  
  onMount(async () => {
    await loadUsers();
    loading = false;
  });
  
  async function loadUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', $user?.id || '')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (data) {
      allUsers = data;
    }
  }
  
  async function startConversation(otherUserId: string) {
    if (!$user) {
      goto('/login');
      return;
    }
    
    // Check if conversation already exists
    const { data: existingParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', $user.id);
    
    if (existingParticipants) {
      for (const p of existingParticipants) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', p.conversation_id)
          .eq('user_id', otherUserId)
          .single();
        
        if (otherParticipant) {
          // Conversation exists, redirect
          goto('/messenger');
          return;
        }
      }
    }
    
    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();
    
    if (newConv) {
      // Add both participants
      await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: $user.id },
          { conversation_id: newConv.id, user_id: otherUserId }
        ]);
      
      goto('/messenger');
    }
  }
  
  $: filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });
  
  $: suggestedUsers = allUsers.slice(0, 5);
</script>

<main class="min-h-screen bg-gray-50 pb-20">
  <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
    <!-- Header -->
    <div class="text-center space-y-3">
      <h1 class="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Discover Students</h1>
      <p class="text-gray-600">Find and connect with students from around the world</p>
    </div>

    <!-- Search Bar -->
    <div class="max-w-2xl mx-auto">
      <div class="relative">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Search by name, username, or interests..."
          class="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-lg"
          bind:value={searchQuery}
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap justify-center gap-2">
      {#each filters as filter}
        <button 
          class="px-6 py-2 rounded-full text-sm font-medium transition-all {selectedFilter === filter ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105' : 'bg-white text-gray-700 hover:bg-gray-100 border'}"
          on:click={() => selectedFilter = filter}
        >
          {filter}
        </button>
      {/each}
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    {:else}
      <!-- Suggested Users -->
      {#if !searchQuery && suggestedUsers.length > 0}
        <section class="space-y-4">
          <div class="flex items-center gap-2">
            <Sparkles class="size-5 text-yellow-500" />
            <h2 class="text-xl font-bold">Suggested For You</h2>
          </div>
          <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {#each suggestedUsers as suggestedUser}
              <div class="bg-white rounded-2xl p-4 text-center shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <img 
                  src={suggestedUser.avatar_url || `https://ui-avatars.com/api/?name=${suggestedUser.username}&size=128`}
                  alt={suggestedUser.username}
                  class="size-20 rounded-full mx-auto mb-3 border-4 border-blue-100"
                />
                <h3 class="font-bold truncate">{suggestedUser.username}</h3>
                {#if suggestedUser.full_name}
                  <p class="text-sm text-gray-500 truncate">{suggestedUser.full_name}</p>
                {/if}
                <button 
                  class="mt-3 w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                  on:click={() => startConversation(suggestedUser.id)}
                >
                  <MessageCircle class="size-4 inline mr-1" />
                  Message
                </button>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- All Users Grid -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">All Students</h2>
          <span class="text-sm text-gray-500">{filteredUsers.length} users</span>
        </div>
        
        {#if filteredUsers.length === 0}
          <div class="bg-white rounded-2xl p-12 text-center">
            <div class="inline-flex p-4 rounded-full bg-gray-100 mb-4">
              <Users class="size-8 text-gray-400" />
            </div>
            <h3 class="text-lg font-semibold mb-2">No users found</h3>
            <p class="text-gray-600">Try adjusting your search query</p>
          </div>
        {:else}
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {#each filteredUsers as otherUser}
              <div class="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <!-- Cover gradient -->
                <div class="h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                
                <div class="p-6 -mt-12">
                  <!-- Avatar -->
                  <img 
                    src={otherUser.avatar_url || `https://ui-avatars.com/api/?name=${otherUser.username}&size=128`}
                    alt={otherUser.username}
                    class="size-24 rounded-full mx-auto border-4 border-white shadow-lg"
                  />
                  
                  <!-- User Info -->
                  <div class="text-center mt-4">
                    <h3 class="text-xl font-bold">{otherUser.username}</h3>
                    {#if otherUser.full_name}
                      <p class="text-gray-600">{otherUser.full_name}</p>
                    {/if}
                  </div>
                  
                  <!-- Bio -->
                  {#if otherUser.bio}
                    <p class="text-sm text-gray-600 mt-3 line-clamp-2 text-center">{otherUser.bio}</p>
                  {/if}
                  
                  <!-- Meta Info -->
                  <div class="mt-4 space-y-2">
                    {#if otherUser.location}
                      <div class="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin class="size-4" />
                        <span>{otherUser.location}</span>
                      </div>
                    {/if}
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <Book class="size-4" />
                      <span>Member since {new Date(otherUser.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  
                  <!-- Actions -->
                  <div class="mt-6 flex gap-2">
                    <button 
                      class="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                      on:click={() => startConversation(otherUser.id)}
                    >
                      <MessageCircle class="size-4 inline mr-1" />
                      Message
                    </button>
                    <a 
                      href="/profile?id={otherUser.id}"
                      class="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
                    >
                      View Profile
                    </a>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  </div>
</main>
