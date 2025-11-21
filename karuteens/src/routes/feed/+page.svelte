<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { user } from '$lib/stores/auth';
  import { supabase } from '$lib/supabase/client';
  import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, Trash2, MoreVertical, FileText, Music, Video, Reply, Smile } from 'lucide-svelte';
  
  let posts: any[] = [];
  let draft = '';
  let loading = true;
  let posting = false;
  let uploadingImage = false;
  let selectedImage: File | null = null;
  let imagePreview: string | null = null;
  let commentText: Record<string, string> = {};
  let showComments: Record<string, boolean> = {};
  let likesCount: Record<string, number> = {};
  let likedByMe: Record<string, boolean> = {};
  let comments: Record<string, any[]> = {};
  let commentsLoading: Record<string, boolean> = {};
  let replies: Record<string, Record<string, any[]>> = {}; // postId -> commentId -> replies[]
  let replyText: Record<string, Record<string, string>> = {}; // postId -> commentId -> text
  let showReplyForm: Record<string, Record<string, boolean>> = {}; // postId -> commentId -> boolean
  let commentReactions: Record<string, Record<string, { count: number, reacted: boolean }>> = {}; // postId -> commentId -> reactions
  
  // Pagination variables
  let page = 1;
  let pageSize = 10;
  let hasMore = true;
  let loadingMore = false;
  
  // Real-time subscription
  let postsChannel: any = null;
  
  onMount(async () => {
    await loadPosts();
    await loadReactionsForPosts();
    subscribeToNewPosts();
    loading = false;
    
    // Add scroll listener for infinite scroll
    window.addEventListener('scroll', handleScroll);
  });
  
  onDestroy(() => {
    // Clean up subscription
    if (postsChannel) {
      supabase.removeChannel(postsChannel);
    }
    
    // Remove scroll listener
    window.removeEventListener('scroll', handleScroll);
  });
  
  async function loadPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_author_id_fkey(id, username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    if (data) {
      // If we're loading more posts, append them to existing posts
      if (page > 1) {
        posts = [...posts, ...data];
      } else {
        posts = data;
      }
      
      // Check if we have more posts to load
      hasMore = data.length === pageSize;
    }
    
    loadingMore = false;
  }

  async function loadMorePosts() {
    if (!hasMore || loadingMore) return;
    
    loadingMore = true;
    page++;
    await loadPosts();
  }

  function handleScroll() {
    // Check if user has scrolled to bottom of page
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // If user is near bottom of page, load more posts
    if (scrollTop + windowHeight >= documentHeight - 1000) {
      loadMorePosts();
    }
  }

  async function loadReactionsForPosts() {
    if (!posts.length) return;
    const postIds = posts.map((p) => p.id);
    // Load counts
    const { data: reactionsData } = await supabase
      .from('post_reactions')
      .select('post_id')
      .in('post_id', postIds);
    if (reactionsData) {
      const counts: Record<string, number> = {};
      for (const r of reactionsData as any[]) {
        counts[r.post_id] = (counts[r.post_id] || 0) + 1;
      }
      likesCount = counts;
    }
    // Load my likes
    if ($user) {
      const { data: myReactions } = await supabase
        .from('post_reactions')
        .select('post_id')
        .eq('user_id', $user.id)
        .in('post_id', postIds);
      if (myReactions) {
        const mine: Record<string, boolean> = {};
        for (const r of myReactions as any[]) mine[r.post_id] = true;
        likedByMe = mine;
      }
    }
  }
  
  function subscribeToNewPosts() {
    postsChannel = supabase
      .channel('posts-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const { data } = await supabase
            .from('posts')
            .select('*, profiles!posts_author_id_fkey(id, username, avatar_url)')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            // Only add to beginning if we're on the first page
            if (page === 1) {
              posts = [data, ...posts];
            }
          }
        }
      )
      .subscribe();
  }
  
  async function uploadImage() {
    if (!selectedImage || !$user) return null;
    
    const formData = new FormData();
    formData.append('file', selectedImage);
    formData.append('userId', $user.id);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const { url } = await response.json();
      return url;
    }
    
    return null;
  }
  
  async function publish() {
    if (!draft.trim() && !selectedImage) return;
    if (!$user) {
      window.location.href = '/login';
      return;
    }
    
    posting = true;
    
    let imageUrl = null;
    if (selectedImage) {
      uploadingImage = true;
      imageUrl = await uploadImage();
      uploadingImage = false;
    }
    
    const { error } = await supabase
      .from('posts')
      .insert({
        author_id: $user.id,
        content: draft.trim(),
        image_url: imageUrl
      });
    
    if (!error) {
      draft = '';
      selectedImage = null;
      imagePreview = null;
    }
    
    posting = false;
  }
  
  function handleImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
      }
      
      selectedImage = file;
      
      // Only create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        // For non-images, just show filename
        imagePreview = file.name;
      }
    }
  }
  
  function removeImage() {
    selectedImage = null;
    imagePreview = null;
  }
  
  async function deletePost(postId: string) {
    if (!confirm('Delete this post?')) return;
    
    await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    
    posts = posts.filter(p => p.id !== postId);
  }
  
  function formatTime(date: string) {
    const now = new Date();
    const posted = new Date(date);
    const diffMs = now.getTime() - posted.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return posted.toLocaleDateString();
  }
  
  function toggleComments(postId: string) {
    showComments[postId] = !showComments[postId];
    if (showComments[postId] && !comments[postId]) {
      void loadComments(postId);
    }
  }

  async function reloadLikeState(postId: string) {
    const { data: all } = await supabase
      .from('post_reactions')
      .select('user_id')
      .eq('post_id', postId);
    likesCount[postId] = (all || []).length;
    if ($user) {
      const { data: mine } = await supabase
        .from('post_reactions')
        .select('user_id')
        .eq('post_id', postId)
        .eq('user_id', $user.id)
        .limit(1);
      likedByMe[postId] = (mine || []).length > 0;
    }
  }

  async function toggleLike(postId: string) {
    if (!$user) {
      window.location.href = '/login';
      return;
    }
    const liked = !!likedByMe[postId];
    try {
      if (liked) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', $user.id);
      } else {
        // Insert; if unique conflict occurs, state will be corrected by reload below
        await supabase
          .from('post_reactions')
          .insert({ post_id: postId, user_id: $user.id, reaction_type: 'like' });
      }
    } finally {
      await reloadLikeState(postId);
    }
  }

  async function loadComments(postId: string) {
    commentsLoading[postId] = true;
    const { data } = await supabase
      .from('comments')
      .select(`
        id, 
        post_id, 
        user_id, 
        content, 
        created_at,
        parentId,
        profiles!comments_user_id_fkey(id, username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (data) {
      // Separate top-level comments from replies
      const topLevelComments = data.filter(c => !c.parentId);
      const replyComments = data.filter(c => c.parentId);
      
      comments[postId] = topLevelComments;
      
      // Group replies by parent comment
      const groupedReplies: Record<string, any[]> = {};
      replyComments.forEach(reply => {
        if (reply.parentId) {
          if (!groupedReplies[reply.parentId]) {
            groupedReplies[reply.parentId] = [];
          }
          groupedReplies[reply.parentId].push(reply);
        }
      });
      
      replies[postId] = groupedReplies;
      
      // Load reactions for all comments
      await loadCommentReactions(postId, data.map(c => c.id));
    }
    
    commentsLoading[postId] = false;
  }

  async function loadCommentReactions(postId: string, commentIds: string[]) {
    if (commentIds.length === 0) return;
    
    // Load counts
    const { data: reactionsData } = await supabase
      .from('comment_reactions')
      .select('comment_id')
      .in('comment_id', commentIds);
    
    if (reactionsData) {
      const counts: Record<string, number> = {};
      for (const r of reactionsData as any[]) {
        counts[r.comment_id] = (counts[r.comment_id] || 0) + 1;
      }
      
      // Initialize reactions object for this post if not exists
      if (!commentReactions[postId]) {
        commentReactions[postId] = {};
      }
      
      // Set counts
      commentIds.forEach(commentId => {
        if (!commentReactions[postId][commentId]) {
          commentReactions[postId][commentId] = { count: 0, reacted: false };
        }
        commentReactions[postId][commentId].count = counts[commentId] || 0;
      });
    }
    
    // Load my reactions
    if ($user) {
      const { data: myReactions } = await supabase
        .from('comment_reactions')
        .select('comment_id')
        .eq('user_id', $user.id)
        .in('comment_id', commentIds);
      
      if (myReactions) {
        // Initialize reactions object for this post if not exists
        if (!commentReactions[postId]) {
          commentReactions[postId] = {};
        }
        
        // Set reacted status
        myReactions.forEach((r: any) => {
          if (!commentReactions[postId][r.comment_id]) {
            commentReactions[postId][r.comment_id] = { count: 0, reacted: false };
          }
          commentReactions[postId][r.comment_id].reacted = true;
        });
      }
    }
  }

  async function addComment(postId: string) {
    const text = (commentText[postId] || '').trim();
    if (!text) return;
    if (!$user) {
      window.location.href = '/login';
      return;
    }
    const optimistic = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      user_id: $user.id,
      content: text,
      created_at: new Date().toISOString(),
      parentId: null,
      profiles: {
        username: $user.user_metadata?.username || $user.email,
        avatar_url: $user.user_metadata?.avatar_url
      }
    };
    comments[postId] = [...(comments[postId] || []), optimistic];
    commentText[postId] = '';
    const { error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: $user.id, content: text });
    if (error) {
      // rollback optimistic
      comments[postId] = (comments[postId] || []).filter((c) => c.id !== optimistic.id);
      commentText[postId] = text;
      alert('Failed to add comment');
    } else {
      // reload to get server IDs and normalized rows
      void loadComments(postId);
    }
  }

  function toggleReplyForm(postId: string, commentId: string) {
    if (!showReplyForm[postId]) {
      showReplyForm[postId] = {};
    }
    showReplyForm[postId][commentId] = !showReplyForm[postId][commentId];
    
    // Initialize replyText if not exists
    if (!replyText[postId]) {
      replyText[postId] = {};
    }
    if (!replyText[postId][commentId]) {
      replyText[postId][commentId] = '';
    }
  }

  async function addReply(postId: string, commentId: string) {
    const text = (replyText[postId]?.[commentId] || '').trim();
    if (!text) return;
    if (!$user) {
      window.location.href = '/login';
      return;
    }
    
    const optimistic = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      user_id: $user.id,
      content: text,
      created_at: new Date().toISOString(),
      parentId: commentId,
      profiles: {
        username: $user.user_metadata?.username || $user.email,
        avatar_url: $user.user_metadata?.avatar_url
      }
    };
    
    // Add to replies
    if (!replies[postId]) {
      replies[postId] = {};
    }
    if (!replies[postId][commentId]) {
      replies[postId][commentId] = [];
    }
    replies[postId][commentId] = [...replies[postId][commentId], optimistic];
    
    // Clear input
    if (replyText[postId]) {
      replyText[postId][commentId] = '';
    }
    
    const { error } = await supabase
      .from('comments')
      .insert({ 
        post_id: postId, 
        user_id: $user.id, 
        content: text,
        parent_id: commentId
      });
      
    if (error) {
      // rollback optimistic
      replies[postId][commentId] = replies[postId][commentId].filter((c) => c.id !== optimistic.id);
      if (replyText[postId]) {
        replyText[postId][commentId] = text;
      }
      alert('Failed to add reply');
    } else {
      // reload to get server IDs and normalized rows
      void loadComments(postId);
    }
  }

  async function toggleCommentReaction(postId: string, commentId: string) {
    if (!$user) {
      window.location.href = '/login';
      return;
    }
    
    // Initialize reactions object for this post if not exists
    if (!commentReactions[postId]) {
      commentReactions[postId] = {};
    }
    if (!commentReactions[postId][commentId]) {
      commentReactions[postId][commentId] = { count: 0, reacted: false };
    }
    
    const reacted = commentReactions[postId][commentId].reacted;
    
    try {
      if (reacted) {
        await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', $user.id);
      } else {
        await supabase
          .from('comment_reactions')
          .insert({ comment_id: commentId, user_id: $user.id, reaction_type: 'like' });
      }
    } finally {
      // Reload reactions for this comment
      await loadCommentReactions(postId, [commentId]);
    }
  }

  function getAvatarUrl(profile: any) {
    return profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username || 'U'}`;
  }
</script>

<main class="min-h-screen bg-gray-50 pb-20">
  <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Feed</h1>
      {#if $user}
        <div class="flex items-center gap-2">
          <img 
            src={$user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${$user.email}`} 
            alt="You"
            class="size-10 rounded-full border-2 border-blue-500"
          />
        </div>
      {/if}
    </div>

    <!-- Create Post Card -->
    <div class="bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <div class="flex gap-3">
        {#if $user}
          <img 
            src={$user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${$user.email}`} 
            alt="You"
            class="size-12 rounded-full"
          />
        {:else}
          <div class="size-12 rounded-full bg-gray-200"></div>
        {/if}
        <div class="flex-1">
          <textarea 
            bind:value={draft} 
            rows={3} 
            placeholder="What's on your mind?"
            class="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          ></textarea>
        </div>
      </div>
      
      {#if imagePreview}
        <div class="relative inline-block">
          {#if selectedImage?.type.startsWith('image/')}
            <img src={imagePreview} alt="Preview" class="max-w-xs rounded-lg" />
          {:else}
            <div class="px-4 py-3 bg-gray-100 rounded-lg flex items-center gap-3">
              {#if selectedImage?.type.startsWith('video/')}
                <Video class="size-5 text-blue-600" />
              {:else if selectedImage?.type.startsWith('audio/')}
                <Music class="size-5 text-purple-600" />
              {:else}
                <FileText class="size-5 text-gray-600" />
              {/if}
              <span class="text-sm font-medium">{selectedImage?.name}</span>
            </div>
          {/if}
          <button 
            class="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            on:click={removeImage}
          >
            <Trash2 class="size-4" />
          </button>
        </div>
      {/if}
      
      <div class="flex items-center justify-between pt-2 border-t">
        <label class="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
          <input 
            type="file" 
            class="hidden" 
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" 
            on:change={handleImageSelect} 
            disabled={uploadingImage} 
          />
          <ImageIcon class="size-5 {uploadingImage ? 'animate-pulse text-blue-600' : 'text-gray-600'}" />
          <span class="text-sm font-medium text-gray-700">Media</span>
        </label>
        
        <button 
          class="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
          on:click={publish}
          disabled={posting || (!draft.trim() && !selectedImage)}
        >
          {posting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>

    <!-- Posts Feed -->
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin size-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    {:else if posts.length === 0}
      <div class="bg-white rounded-2xl p-12 text-center">
        <div class="inline-flex p-4 rounded-full bg-gray-100 mb-4">
          <MessageCircle class="size-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-semibold mb-2">No posts yet</h3>
        <p class="text-gray-600">Be the first to share something!</p>
      </div>
    {:else}
      <div class="space-y-6">
        {#each posts as post (post.id)}
          <article class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <!-- Post Header -->
            <div class="p-6 pb-4">
              <div class="flex items-start justify-between">
                <div class="flex gap-3">
                  <img 
                    src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username}`} 
                    alt={post.profiles?.username}
                    class="size-12 rounded-full"
                  />
                  <div>
                    <h3 class="font-bold text-lg">{post.profiles?.username || 'Unknown'}</h3>
                    <p class="text-sm text-gray-500">{formatTime(post.created_at)}</p>
                  </div>
                </div>
                
                {#if $user && post.author_id === $user.id}
                  <button 
                    class="p-2 hover:bg-gray-100 rounded-lg"
                    on:click={() => deletePost(post.id)}
                  >
                    <Trash2 class="size-5 text-red-600" />
                  </button>
                {/if}
              </div>
              
              <!-- Post Content -->
              {#if post.content}
                <p class="mt-4 text-gray-800 text-lg leading-relaxed">{post.content}</p>
              {/if}
            </div>
            
            <!-- Post Image/Media -->
            {#if post.image_url}
              {#if post.image_url.includes('/images/')}
                <img src={post.image_url} alt="Post" class="w-full max-h-[500px] object-cover" />
              {:else if post.image_url.includes('/videos/')}
                <video src={post.image_url} controls class="w-full max-h-[500px]">
                  <track kind="captions" />
                </video>
              {:else if post.image_url.includes('/audio/')}
                <div class="p-6 bg-gradient-to-r from-purple-100 to-pink-100">
                  <audio src={post.image_url} controls class="w-full"></audio>
                </div>
              {:else if post.image_url.includes('/documents/')}
                <a 
                  href={post.image_url} 
                  target="_blank"
                  class="flex items-center gap-3 p-6 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <FileText class="size-8 text-blue-600" />
                  <div>
                    <p class="font-medium text-blue-600">View Document</p>
                    <p class="text-sm text-gray-600">Click to open</p>
                  </div>
                </a>
              {:else}
                <a 
                  href={post.image_url} 
                  target="_blank"
                  class="flex items-center gap-3 p-6 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <FileText class="size-8 text-gray-600" />
                  <div>
                    <p class="font-medium text-gray-800">View File</p>
                    <p class="text-sm text-gray-600">Click to open</p>
                  </div>
                </a>
              {/if}
            {/if}
            
            <!-- Post Actions -->
            <div class="p-6 pt-4 border-t">
              <div class="flex items-center gap-6">
                <button 
                  class="flex items-center gap-2 transition-colors {likedByMe[post.id] ? 'text-red-600' : 'text-gray-600 hover:text-red-500'}"
                  on:click={() => toggleLike(post.id)}
                >
                  <Heart class="size-5" />
                  <span class="text-sm font-medium">{likedByMe[post.id] ? 'Liked' : 'Like'}</span>
                  <span class="text-xs text-gray-500">{likesCount[post.id] || 0}</span>
                </button>
                
                <button 
                  class="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors"
                  on:click={() => toggleComments(post.id)}
                >
                  <MessageCircle class="size-5" />
                  <span class="text-sm font-medium">Comment</span>
                </button>
                
                <button class="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
                  <Share2 class="size-5" />
                  <span class="text-sm font-medium">Share</span>
                </button>
              </div>
            </div>
            
            {#if showComments[post.id]}
              <div class="px-6 pb-6 space-y-4">
                {#if commentsLoading[post.id]}
                  <div class="flex items-center gap-2 text-sm text-gray-500">
                    <div class="animate-spin size-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    Loading comments...
                  </div>
                {:else}
                  <!-- Comments list -->
                  <div class="space-y-3">
                    {#each (comments[post.id] || []) as c (c.id)}
                      <div class="flex items-start gap-3">
                        <img src={c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${c.profiles?.username || 'U'}`} alt={c.profiles?.username} class="size-8 rounded-full" />
                        <div class="flex-1">
                          <div class="bg-gray-50 rounded-xl px-4 py-2">
                            <div class="text-sm font-semibold">{c.profiles?.username || 'Unknown'}</div>
                            <div class="text-sm text-gray-800">{c.content}</div>
                            <div class="text-xs text-gray-500 mt-1">{formatTime(c.created_at)}</div>
                          </div>
                          
                          <!-- Comment actions -->
                          <div class="flex items-center gap-4 mt-2 ml-4">
                            <button 
                              class="flex items-center gap-1 text-xs {commentReactions[post.id]?.[c.id]?.reacted ? 'text-red-600' : 'text-gray-500 hover:text-red-500'}"
                              on:click={() => toggleCommentReaction(post.id, c.id)}
                            >
                              <Heart class="size-4" />
                              <span>{commentReactions[post.id]?.[c.id]?.count || 0}</span>
                            </button>
                            <button 
                              class="text-xs text-gray-500 hover:text-blue-500"
                              on:click={() => toggleReplyForm(post.id, c.id)}
                            >
                              <Reply class="size-4 inline mr-1" />
                              Reply
                            </button>
                          </div>
                          
                          <!-- Reply form -->
                          {#if showReplyForm[post.id]?.[c.id]}
                            <div class="mt-2 ml-4 flex items-center gap-2">
                              <input 
                                type="text" 
                                value={replyText[post.id]?.[c.id] || ''}
                                placeholder="Write a reply..."
                                class="flex-1 rounded-full border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                on:input={(e) => {
                                  const target = e.target as HTMLInputElement;
                                  if (!replyText[post.id]) replyText[post.id] = {};
                                  replyText[post.id][c.id] = target.value;
                                }}
                                on:keydown={(e) => {
                                  if (e.key === 'Enter') {
                                    addReply(post.id, c.id);
                                  }
                                }}
                              />
                              <button 
                                class="p-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                on:click={() => addReply(post.id, c.id)}
                                disabled={!replyText[post.id]?.[c.id] || !replyText[post.id]?.[c.id].trim()}
                              >
                                <Send class="size-3" />
                              </button>
                            </div>
                          {/if}
                          
                          <!-- Replies -->
                          {#if replies[post.id]?.[c.id] && replies[post.id][c.id].length > 0}
                            <div class="mt-2 ml-4 space-y-2 border-l-2 border-gray-200 pl-3">
                              {#each replies[post.id][c.id] as reply (reply.id)}
                                <div class="flex items-start gap-2">
                                  <img src={reply.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${reply.profiles?.username || 'U'}`} alt={reply.profiles?.username} class="size-6 rounded-full" />
                                  <div class="flex-1">
                                    <div class="bg-gray-100 rounded-lg px-3 py-1">
                                      <div class="text-xs font-semibold">{reply.profiles?.username || 'Unknown'}</div>
                                      <div class="text-xs text-gray-800">{reply.content}</div>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">{formatTime(reply.created_at)}</div>
                                  </div>
                                </div>
                              {/each}
                            </div>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                  
                  <!-- Add comment input -->
                  <div class="flex items-center gap-2 pt-2">
                    <input 
                      type="text" 
                      bind:value={commentText[post.id]}
                      placeholder="Write a comment..."
                      class="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button 
                      class="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      on:click={() => addComment(post.id)}
                      disabled={!commentText[post.id] || !commentText[post.id].trim()}
                    >
                      <Send class="size-4" />
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          </article>
        {/each}
      </div>
      
      <!-- Load More Button -->
      {#if hasMore}
        <div class="flex justify-center py-6">
          <button 
            class="px-6 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            on:click={loadMorePosts}
            disabled={loadingMore}
          >
            {#if loadingMore}
              <div class="animate-spin size-5 border-2 border-white border-t-transparent rounded-full"></div>
              Loading...
            {:else}
              Load More Posts
            {/if}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</main>