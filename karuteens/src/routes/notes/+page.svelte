<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Plus, Search, Edit, Trash2, Eye, EyeOff, Calendar, User } from 'lucide-svelte';
  import { supabase } from '$lib/supabase/client';
  
  // State variables with explicit types
  let userNotes = /** @type {any[]} */ ([]);
  let publicNotes = /** @type {any[]} */ ([]);
  let loading = true;
  let searchQuery = '';
  let user = /** @type {any} */ (null);
  
  // Load user and notes on mount
  onMount(async () => {
    const { data: { user: userData } } = await supabase.auth.getUser();
    user = userData;
    
    if (user) {
      await loadNotes();
    }
    loading = false;
  });
  
  // Load notes from database
  async function loadNotes() {
    // Load user's notes
    const { data: userNotesData, error: userNotesError } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!userNotesError) {
      userNotes = userNotesData || [];
    }
    
    // Load public notes from other users
    const { data: publicNotesData, error: publicNotesError } = await supabase
      .from('notes')
      .select(`
        *,
        profiles(username, full_name, avatar_url)
      `)
      .neq('user_id', user.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (!publicNotesError) {
      publicNotes = publicNotesData || [];
    }
  }
  
  // Create a new note
  async function createNewNote() {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: 'Untitled Note',
        content: '',
        is_public: false
      })
      .select()
      .single();
    
    if (!error && data) {
      goto(`/notes/${data.id}`);
    }
  }
  
  // Delete a note
  /** @param {string} noteId */
  async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);
    
    if (!error) {
      // Refresh the notes list
      await loadNotes();
    }
  }
  
  // Filter notes based on search query
  $: filteredUserNotes = userNotes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.description && note.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  $: filteredPublicNotes = publicNotes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.description && note.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (note.profiles && note.profiles.full_name && note.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (note.profiles && note.profiles.username && note.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );
</script>

<main class="max-w-screen-xl mx-auto px-4 py-6">
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
    <div>
      <h1 class="text-3xl font-bold">Notes</h1>
      <p class="text-foreground/70">Create, organize, and share your study notes</p>
    </div>
    
    <button 
      class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
      on:click={createNewNote}
    >
      <Plus size={20} />
      New Note
    </button>
  </div>
  
  <!-- Search bar -->
  <div class="mb-6">
    <div class="relative">
      <input
        type="text"
        placeholder="Search notes..."
        bind:value={searchQuery}
        class="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
    </div>
  </div>
  
  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  {:else if !user}
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <p class="text-yellow-800">Please log in to create and view your notes.</p>
    </div>
  {:else}
    <!-- User's Notes Section -->
    <section class="mb-12">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-semibold">Your Notes</h2>
        <span class="text-sm text-foreground/70">{filteredUserNotes.length} notes</span>
      </div>
      
      {#if filteredUserNotes.length === 0}
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p class="text-foreground/70 mb-4">You don't have any notes yet.</p>
          <button 
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors mx-auto"
            on:click={createNewNote}
          >
            <Plus size={20} />
            Create Your First Note
          </button>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each filteredUserNotes as note}
            <div class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div class="p-5">
                <div class="flex justify-between items-start mb-3">
                  <h3 class="font-semibold text-lg line-clamp-2">{note.title || 'Untitled Note'}</h3>
                  <div class="flex gap-1">
                    {#if note.is_public}
                      <div class="cursor-help" title="Public"><Eye size={16} class="text-green-600" /></div>
                    {:else}
                      <div class="cursor-help" title="Private"><EyeOff size={16} class="text-gray-400" /></div>
                    {/if}
                  </div>
                </div>
                
                {#if note.description}
                  <p class="text-foreground/70 text-sm mb-4 line-clamp-2">{note.description}</p>
                {:else if note.content}
                  <p class="text-foreground/70 text-sm mb-4 line-clamp-2">{note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}</p>
                {/if}
                
                <div class="flex items-center text-xs text-foreground/60 mb-4">
                  <Calendar size={14} class="mr-1" />
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
                
                <div class="flex justify-between items-center">
                  <div class="flex gap-2">
                    <button 
                      class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      on:click={() => goto(`/notes/${note.id}`)}
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                    <button 
                      class="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                      on:click={() => deleteNote(note.id)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
    
    <!-- Public Notes Section -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-semibold">Community Notes</h2>
        <span class="text-sm text-foreground/70">{filteredPublicNotes.length} public notes</span>
      </div>
      
      {#if filteredPublicNotes.length === 0}
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p class="text-foreground/70">No public notes available yet.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each filteredPublicNotes as note}
            <div class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div class="p-5">
                <div class="flex justify-between items-start mb-3">
                  <h3 class="font-semibold text-lg line-clamp-2">{note.title || 'Untitled Note'}</h3>
                  <div class="cursor-help" title="Public"><Eye size={16} class="text-green-600" /></div>
                </div>
                
                {#if note.description}
                  <p class="text-foreground/70 text-sm mb-4 line-clamp-2">{note.description}</p>
                {:else if note.content}
                  <p class="text-foreground/70 text-sm mb-4 line-clamp-2">{note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}</p>
                {/if}
                
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center text-xs text-foreground/60">
                    <User size={14} class="mr-1" />
                    <span>{note.profiles?.full_name || note.profiles?.username || 'Unknown'}</span>
                  </div>
                  <div class="flex items-center text-xs text-foreground/60">
                    <Calendar size={14} class="mr-1" />
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <button 
                  class="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-foreground px-3 py-2 rounded-lg transition-colors"
                  on:click={() => goto(`/notes/${note.id}`)}
                >
                  <Eye size={16} />
                  View Note
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</main>