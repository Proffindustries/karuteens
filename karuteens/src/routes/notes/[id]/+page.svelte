<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Save, Eye, EyeOff, User, Calendar, Trash2, Edit } from 'lucide-svelte';
  import { supabase } from '$lib/supabase/client';
  
  // State variables with explicit types
  /** @type {any} */
  let note = null;
  /** @type {any} */
  let user = null;
  let loading = true;
  let isEditing = false;
  let title = '';
  let description = '';
  let content = '';
  let isPublic = false;
  /** @type {any} */
  let author = null;
  let isAuthor = false;
  
  // Get note ID from URL
  const noteId = $page.params.id;
  
  onMount(async () => {
    const { data: { user: userData } } = await supabase.auth.getUser();
    user = userData;
    
    if (noteId) {
      await loadNote();
    }
    loading = false;
  });
  
  // Load note from database
  async function loadNote() {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        profiles(username, full_name, avatar_url)
      `)
      .eq('id', noteId)
      .single();
    
    if (!error && data) {
      note = data;
      title = data.title;
      description = data.description || '';
      content = data.content || '';
      isPublic = data.is_public;
      author = data.profiles;
      
      // Check if current user is the author
      isAuthor = user && user.id === data.user_id;
      
      // If user is not the author, they can only view (not edit)
      if (!isAuthor) {
        isEditing = false;
      }
    } else {
      // Note not found
      goto('/notes');
    }
  }
  
  // Save note changes
  async function saveNote() {
    if (!isAuthor || !note) return;
    
    const { error } = await supabase
      .from('notes')
      .update({
        title: title,
        description: description || null,
        content: content || null,
        is_public: isPublic,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId);
    
    if (!error) {
      // Update local note data
      note.title = title;
      note.description = description || null;
      note.content = content || null;
      note.is_public = isPublic;
      isEditing = false;
    }
  }
  
  // Delete note
  async function deleteNote() {
    if (!isAuthor) return;
    
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) return;
    
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);
    
    if (!error) {
      goto('/notes');
    }
  }
  
  // Toggle edit mode
  function toggleEditMode() {
    if (!isAuthor || !note) return;
    
    if (isEditing) {
      // Cancel editing - revert changes
      title = note.title;
      description = note.description || '';
      content = note.content || '';
      isPublic = note.is_public;
    }
    isEditing = !isEditing;
  }
</script>

<main class="max-w-4xl mx-auto px-4 py-6">
  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  {:else if !note}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p class="text-red-800">Note not found.</p>
      <button 
        class="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-800"
        on:click={() => goto('/notes')}
      >
        <ArrowLeft size={20} />
        Back to Notes
      </button>
    </div>
  {:else}
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <button 
        class="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        on:click={() => goto('/notes')}
      >
        <ArrowLeft size={20} />
        Back to Notes
      </button>
      
      {#if isAuthor}
        <div class="flex gap-2">
          <button 
            class="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            on:click={toggleEditMode}
          >
            {#if isEditing}
              Cancel
            {:else}
              <Edit size={20} />
              Edit
            {/if}
          </button>
          
          {#if isEditing}
            <button 
              class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              on:click={saveNote}
            >
              <Save size={20} />
              Save
            </button>
          {:else}
            <button 
              class="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
              on:click={deleteNote}
            >
              <Trash2 size={20} />
              Delete
            </button>
          {/if}
        </div>
      {/if}
    </div>
    
    <!-- Note Content -->
    <article class="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <!-- Note Header -->
      <div class="p-6 border-b border-gray-200">
        {#if isEditing && isAuthor}
          <input
            type="text"
            bind:value={title}
            placeholder="Note title"
            class="w-full text-2xl font-bold mb-2 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          <textarea
            bind:value={description}
            placeholder="Description (optional)"
            class="w-full text-foreground/70 mb-4 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="2"
          />
          
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="flex items-center">
                <span class="text-sm text-foreground/70 mr-2">Privacy:</span>
                <button 
                  class="flex items-center gap-1 text-sm {isPublic ? 'text-green-600' : 'text-gray-400'}"
                  on:click={() => isPublic = !isPublic}
                >
                  {#if isPublic}
                    <Eye size={16} />
                    Public
                  {:else}
                    <EyeOff size={16} />
                    Private
                  {/if}
                </button>
              </div>
            </div>
            
            <div class="flex items-center text-sm text-foreground/60">
              <Calendar size={16} class="mr-1" />
              <span>Created {new Date(note.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        {:else}
          <h1 class="text-2xl font-bold mb-2">{note.title || 'Untitled Note'}</h1>
          
          {#if note.description}
            <p class="text-foreground/70 mb-4">{note.description}</p>
          {/if}
          
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="flex items-center text-sm text-foreground/60">
                <User size={16} class="mr-1" />
                <span>{author?.full_name || author?.username || 'Unknown'}</span>
              </div>
              
              <div class="flex items-center text-sm text-foreground/60">
                <Calendar size={16} class="mr-1" />
                <span>Created {new Date(note.created_at).toLocaleDateString()}</span>
              </div>
              
              {#if note.is_public}
                <div class="flex items-center text-sm text-green-600">
                  <Eye size={16} class="mr-1" />
                  <span>Public</span>
                </div>
              {:else}
                <div class="flex items-center text-sm text-gray-400">
                  <EyeOff size={16} class="mr-1" />
                  <span>Private</span>
                </div>
              {/if}
            </div>
            
            {#if note.updated_at !== note.created_at}
              <div class="text-sm text-foreground/60">
                Updated {new Date(note.updated_at).toLocaleDateString()}
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Note Content -->
      <div class="p-6">
        {#if isEditing && isAuthor}
          <textarea
            bind:value={content}
            placeholder="Start writing your note here..."
            class="w-full min-h-[400px] p-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        {:else}
          <div class="prose max-w-none">
            {#if note.content}
              {@html note.content.replace(/\n/g, '<br />')}
            {:else}
              <p class="text-foreground/50 italic">This note is empty.</p>
            {/if}
          </div>
        {/if}
      </div>
    </article>
  {/if}
</main>