<script lang="ts">
  import { Users, Search, Plus, TrendingUp, BookOpen, Code, Palette, Music, Globe, X } from 'lucide-svelte';
  import { user } from '$lib/stores/auth';
  import { supabase } from '$lib/supabase/client';
  import { onMount } from 'svelte';
  
  type Group = { 
    id: string; 
    name: string; 
    description: string;
    category: string;
    avatar_url?: string;
    creator_id: string;
    is_private: boolean;
    max_members: number;
    created_at: string;
    member_count?: number;
  };
  
  let searchQuery = '';
  let selectedCategory = 'All';
  let showCreateModal = false;
  let creating = false;
  let loading = true;
  
  let createForm = {
    name: '',
    description: '',
    category: 'Study',
    isPrivate: false,
    maxMembers: 100
  };
  
  const categories = ['All', 'Study', 'Tech', 'Arts', 'Music', 'Language', 'Science'];
  const createCategories = ['Study', 'Tech', 'Arts', 'Music', 'Language', 'Science'];
  
  let groups: Group[] = [];
  
  onMount(async () => {
    await loadGroups();
    loading = false;
  });
  
  async function loadGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      const groupsWithCounts = await Promise.all(
        data.map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          return {
            ...group,
            member_count: count || 0
          };
        })
      );
      
      groups = groupsWithCounts;
    }
  }
  
  $: filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         g.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  $: trendingGroups = [...groups]
    .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
    .slice(0, 3);
  
  async function createGroup() {
    if (!$user) {
      window.location.href = '/login';
      return;
    }
    
    if (!createForm.name || !createForm.description) return;
    
    creating = true;
    
    const response = await fetch('/api/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm)
    });
    
    if (response.ok) {
      const { group } = await response.json();
      window.location.href = `/groups/${group.id}`;
    } else {
      alert('Failed to create group');
    }
    
    creating = false;
  }
  
  function getCategoryIcon(category: string) {
    const icons: Record<string, any> = {
      'Study': BookOpen,
      'Tech': Code,
      'Arts': Palette,
      'Music': Music,
      'Language': Globe,
      'Science': TrendingUp
    };
    return icons[category] || Users;
  }
  
  function getCategoryColor(category: string) {
    const colors: Record<string, string> = {
      'Study': 'from-blue-500 to-cyan-500',
      'Tech': 'from-purple-500 to-pink-500',
      'Arts': 'from-orange-500 to-red-500',
      'Music': 'from-green-500 to-teal-500',
      'Language': 'from-indigo-500 to-blue-500',
      'Science': 'from-cyan-500 to-blue-500'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  }
</script>

<main class="max-w-screen-lg mx-auto px-4 py-8 space-y-8">
  <div class="text-center space-y-3">
    <h1 class="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Study Groups</h1>
    <p class="text-foreground/70 max-w-2xl mx-auto">Join communities of learners, share knowledge, and grow together</p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  {:else}
    {#if trendingGroups.length > 0}
      <section class="space-y-4">
        <div class="flex items-center gap-2">
          <TrendingUp class="size-5 text-orange-500" />
          <h2 class="text-xl font-bold">Trending Now</h2>
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          {#each trendingGroups as group}
            <a 
              href="/groups/{group.id}" 
              class="group relative rounded-2xl border bg-gradient-to-br {getCategoryColor(group.category)} p-[2px] hover:scale-105 transition-all duration-300"
            >
              <div class="rounded-2xl bg-white p-4 space-y-3 h-full">
                <div class="flex items-start justify-between">
                  <div class="p-3 rounded-xl bg-gradient-to-br {getCategoryColor(group.category)} text-white">
                    <svelte:component this={getCategoryIcon(group.category)} class="size-6" />
                  </div>
                  <div class="px-2 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold flex items-center gap-1">
                    <TrendingUp class="size-3" />
                    Trending
                  </div>
                </div>
                <div>
                  <h3 class="font-bold text-lg">{group.name}</h3>
                  <p class="text-sm text-foreground/60 mt-1">{group.description}</p>
                </div>
                <div class="flex items-center gap-2 text-sm text-foreground/60">
                  <Users class="size-4" />
                  <span>{group.member_count?.toLocaleString() || 0} members</span>
                </div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <section class="rounded-2xl border bg-white shadow-lg p-6 space-y-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40" />
          <input 
            class="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
            placeholder="Search groups by name or topic..."
            bind:value={searchQuery}
          />
        </div>
        <button class="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 justify-center" on:click={() => showCreateModal = true}>
          <Plus class="size-5" />
          Create Group
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        {#each categories as category}
          <button 
            class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 {selectedCategory === category ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-foreground/70 hover:bg-gray-200'}" 
            on:click={() => selectedCategory = category}
          >
            {category}
          </button>
        {/each}
      </div>
    </section>

    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">All Groups</h2>
        <span class="text-sm text-foreground/60">{filteredGroups.length} groups</span>
      </div>
      
      {#if filteredGroups.length === 0}
        <div class="rounded-2xl border bg-white p-12 text-center">
          <div class="inline-flex p-4 rounded-full bg-gray-100 mb-4">
            <Search class="size-8 text-foreground/40" />
          </div>
          <h3 class="text-lg font-semibold mb-2">No groups found</h3>
          <p class="text-foreground/60">Try adjusting your search or filters</p>
        </div>
      {:else}
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {#each filteredGroups as group}
            <a 
              href="/groups/{group.id}" 
              class="group rounded-2xl border bg-white p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div class="space-y-4">
                <div class="flex items-start justify-between">
                  <div class="p-3 rounded-xl bg-gradient-to-br {getCategoryColor(group.category)} text-white group-hover:scale-110 transition-transform">
                    <svelte:component this={getCategoryIcon(group.category)} class="size-6" />
                  </div>
                </div>
                
                <div>
                  <h3 class="font-bold text-lg group-hover:text-blue-600 transition-colors">{group.name}</h3>
                  <p class="text-sm text-foreground/60 mt-1 line-clamp-2">{group.description}</p>
                </div>
                
                <div class="flex items-center justify-between pt-2 border-t">
                  <div class="flex items-center gap-2 text-sm text-foreground/60">
                    <Users class="size-4" />
                    <span>{group.member_count?.toLocaleString() || 0}</span>
                  </div>
                  <span class="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-foreground/70">
                    {group.category}
                  </span>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</main>

{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" on:click={() => showCreateModal = false}>
    <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" on:click|stopPropagation>
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">Create New Group</h2>
        <button class="p-2 hover:bg-gray-100 rounded-lg" on:click={() => showCreateModal = false}>
          <X class="size-5" />
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Group Name *</label>
          <input 
            type="text" 
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter group name"
            bind:value={createForm.name}
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Description *</label>
          <textarea 
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="3"
            placeholder="What's this group about?"
            bind:value={createForm.description}
          ></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Category *</label>
          <select 
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            bind:value={createForm.category}
          >
            {#each createCategories as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">Max Members</label>
          <input 
            type="number" 
            class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="2"
            max="500"
            bind:value={createForm.maxMembers}
          />
        </div>
        
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="private-group" 
            class="rounded"
            bind:checked={createForm.isPrivate}
          />
          <label for="private-group" class="text-sm">Make this group private</label>
        </div>
      </div>
      
      <div class="flex gap-3 pt-4">
        <button 
          class="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-100"
          on:click={() => showCreateModal = false}
          disabled={creating}
        >
          Cancel
        </button>
        <button 
          class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg disabled:opacity-50"
          on:click={createGroup}
          disabled={creating || !createForm.name || !createForm.description}
        >
          {creating ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </div>
  </div>
{/if}
