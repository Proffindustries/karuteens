<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Heart, Eye, MessageCircle, Share2, ThumbsUp, Send } from 'lucide-svelte';
  
  let contentId = $page.params.id;
  let content: any = null;
  let loading = true;
  let hasLiked = false;
  let likeCount = 0;
  let comments: any[] = [];
  let newComment = '';
  let sending = false;
  
  onMount(async () => {
    await loadContent();
    await loadComments();
    await checkLike();
    await incrementViews();
  });
  
  async function loadContent() {
    const { data } = await supabase
      .from('entertainment_content')
      .select('*, profiles!entertainment_content_creator_id_fkey(id, username, avatar_url)')
      .eq('id', contentId)
      .single();
    
    if (data) {
      content = data;
      likeCount = data.likes || 0;
    }
    loading = false;
  }
  
  async function loadComments() {
    const { data } = await supabase
      .from('content_comments')
      .select('*, profiles!content_comments_user_id_fkey(username, avatar_url)')
      .eq('content_id', contentId)
      .order('created_at', { ascending: false });
    comments = data || [];
  }
  
  async function checkLike() {
    if (!$user) return;
    const { data } = await supabase
      .from('content_likes')
      .select('*')
      .eq('content_id', contentId)
      .eq('user_id', $user.id)
      .single();
    hasLiked = !!data;
  }
  
  async function incrementViews() {
    if (!content) return;
    await supabase
      .from('entertainment_content')
      .update({ views: (content.views || 0) + 1 })
      .eq('id', contentId);
  }
  
  async function toggleLike() {
    if (!$user) {
      window.location.href = '/auth/sign-in';
      return;
    }
    
    if (hasLiked) {
      await supabase.from('content_likes').delete().eq('content_id', contentId).eq('user_id', $user.id);
      await supabase.from('entertainment_content').update({ likes: likeCount - 1 }).eq('id', contentId);
      hasLiked = false;
      likeCount--;
    } else {
      await supabase.from('content_likes').insert({ content_id: contentId, user_id: $user.id });
      await supabase.from('entertainment_content').update({ likes: likeCount + 1 }).eq('id', contentId);
      hasLiked = true;
      likeCount++;
    }
  }
  
  async function addComment() {
    if (!newComment.trim() || !$user) return;
    sending = true;
    
    const { error } = await supabase
      .from('content_comments')
      .insert({
        content_id: contentId,
        user_id: $user.id,
        comment: newComment.trim()
      });
    
    if (!error) {
      newComment = '';
      await loadComments();
    }
    sending = false;
  }
  
  function formatViews(views: number) {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  }
  
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  
  function timeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }
  
  function shareContent() {
    if (navigator.share) {
      navigator.share({
        title: content.title,
        text: content.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  }
  </script>

<main class="min-h-screen bg-gray-50">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin size-12 border-4 border-pink-600 border-t-transparent rounded-full"></div>
    </div>
  {:else if !content}
    <div class="max-w-screen-md mx-auto px-4 py-12 text-center">
      <h1 class="text-2xl font-bold mb-2">Content Not Found</h1>
      <p class="text-foreground/60">This content doesn't exist or has been removed.</p>
      <a href="/entertainment" class="mt-4 inline-block px-4 py-2 rounded-lg bg-pink-600 text-white">Browse Entertainment</a>
    </div>
  {:else}
    <div class="max-w-screen-xl mx-auto px-4 py-8">
      <div class="grid lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Video Player -->
          <div class="bg-black rounded-2xl overflow-hidden aspect-video">
            {#if content.video_url}
              <video controls class="w-full h-full" poster={content.thumbnail_url}>
                <source src={content.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            {:else if content.stream_url}
              <iframe src={content.stream_url} class="w-full h-full" allowfullscreen title={content.title}></iframe>
            {:else if content.thumbnail_url}
              <img src={content.thumbnail_url} alt={content.title} class="w-full h-full object-cover" />
            {:else}
              <div class="w-full h-full flex items-center justify-center text-white/50">
                <p>No video available</p>
              </div>
            {/if}
          </div>
          
          <!-- Content Info -->
          <div class="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-700 capitalize">{content.category}</span>
                {#if content.is_live}
                  <span class="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 flex items-center gap-1">
                    <span class="size-2 rounded-full bg-red-600 animate-pulse"></span>
                    LIVE
                  </span>
                {/if}
              </div>
              <h1 class="text-3xl font-black mb-2">{content.title}</h1>
              <div class="flex items-center gap-4 text-sm text-foreground/60">
                <span class="flex items-center gap-1">
                  <Eye class="size-4" />
                  {formatViews(content.views || 0)} views
                </span>
                <span>{formatDate(content.created_at)}</span>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-3 pt-4 border-t">
              <button 
                class="flex-1 px-4 py-2 rounded-lg border font-medium transition-all flex items-center justify-center gap-2"
                class:bg-pink-50={hasLiked}
                class:border-pink-600={hasLiked}
                class:text-pink-600={hasLiked}
                on:click={toggleLike}
              >
                <Heart class={`size-5 ${hasLiked ? 'fill-current' : ''}`} />
                {formatViews(likeCount)}
              </button>
              <button class="px-4 py-2 rounded-lg border hover:bg-gray-50" on:click={shareContent}>
                <Share2 class="size-5" />
              </button>
            </div>
            
            <!-- Creator Info -->
            <div class="pt-4 border-t">
              <div class="flex items-center gap-3">
                <img 
                  src={content.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${content.profiles?.username}`} 
                  alt={content.profiles?.username}
                  class="size-12 rounded-full"
                />
                <div class="flex-1">
                  <p class="font-bold">{content.profiles?.username}</p>
                  <p class="text-sm text-foreground/60">Creator</p>
                </div>
                <a href={`/profile/${content.profiles?.id}`} class="px-4 py-2 rounded-lg border hover:bg-gray-50 text-sm font-medium">
                  View Profile
                </a>
              </div>
            </div>
            
            {#if content.description}
              <div class="pt-4 border-t">
                <h2 class="font-bold mb-2">Description</h2>
                <p class="text-foreground/80 whitespace-pre-wrap">{content.description}</p>
              </div>
            {/if}
            
            {#if content.tags && content.tags.length > 0}
              <div class="pt-4 border-t">
                <div class="flex flex-wrap gap-2">
                  {#each content.tags as tag}
                    <span class="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">#{tag}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Comments Sidebar -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-2xl shadow-lg p-6 space-y-4 sticky top-4">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <MessageCircle class="size-5" />
              Comments ({comments.length})
            </h2>
            
            <!-- Add Comment -->
            {#if $user}
              <div class="flex gap-2">
                <input 
                  class="flex-1 rounded-lg border px-3 py-2 text-sm" 
                  placeholder="Add a comment..."
                  bind:value={newComment}
                  on:keydown={(e) => e.key === 'Enter' && addComment()}
                />
                <button 
                  class="p-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50"
                  on:click={addComment}
                  disabled={sending || !newComment.trim()}
                >
                  <Send class="size-5" />
                </button>
              </div>
            {:else}
              <a href="/auth/sign-in" class="block text-center py-3 rounded-lg border hover:bg-gray-50 text-sm">
                Sign in to comment
              </a>
            {/if}
            
            <!-- Comments List -->
            <div class="space-y-4 max-h-[600px] overflow-y-auto">
              {#each comments as comment}
                <div class="space-y-2">
                  <div class="flex items-start gap-2">
                    <img 
                      src={comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${comment.profiles?.username}`} 
                      alt={comment.profiles?.username}
                      class="size-8 rounded-full"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="font-semibold text-sm">{comment.profiles?.username}</p>
                        <span class="text-xs text-foreground/50">{timeAgo(comment.created_at)}</span>
                      </div>
                      <p class="text-sm text-foreground/80">{comment.comment}</p>
                    </div>
                  </div>
                </div>
              {/each}
              
              {#if comments.length === 0}
                <div class="text-center py-8 text-foreground/50 text-sm">
                  <MessageCircle class="size-12 mx-auto mb-2 opacity-30" />
                  No comments yet. Be the first!
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</main>
