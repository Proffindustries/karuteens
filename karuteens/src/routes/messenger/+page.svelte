<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { user } from '$lib/stores/auth';
  import { supabase } from '$lib/supabase/client';
  import { Send, Image as ImageIcon, Search, ArrowLeft, MoreVertical, Phone, Video, Smile, UserPlus, X, FileText, Music, Trash2 } from 'lucide-svelte';
  
  let conversations: any[] = [];
  let selectedConversation: any = null;
  let messages: any[] = [];
  let messageText = '';
  let loading = true;
  let sending = false;
  let uploadingMedia = false;
  let messageSubscription: any = null;
  let searchQuery = '';
  let showNewMessageModal = false;
  let allUsers: any[] = [];
  let newMessageSearch = '';
  let selectedFile: File | null = null;
  let filePreview: string | null = null;
  
  // Real-time features
  let typingUsers: string[] = []; // Users currently typing
  let typingTimeout: any = null;
  let isTyping = false;
  
  onMount(async () => {
    await loadConversations();
    await loadAllUsers();
    loading = false;
  });
  
  onDestroy(() => {
    if (messageSubscription) messageSubscription.unsubscribe();
    if (typingTimeout) clearTimeout(typingTimeout);
  });
  
  async function loadConversations() {
    if (!$user) return;
    
    const { data: participantData } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations(
          id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', $user.id);
    
    if (participantData) {
      const convos = await Promise.all(
        participantData.map(async (p: any) => {
          const convId = p.conversation_id;
          
          // Get other participants
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id, profiles(id, username, avatar_url)')
            .eq('conversation_id', convId)
            .neq('user_id', $user!.id);
          
          // Get last message
          const { data: lastMsg } = await supabase
            .from('direct_messages')
            .select('content, created_at, is_read')
            .eq('conversation_id', convId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          // Count unread messages
          const { count: unreadCount } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('is_read', false)
            .neq('sender_id', $user!.id);
          
          return {
            id: convId,
            ...p.conversations,
            otherUser: participants?.[0]?.profiles,
            lastMessage: lastMsg,
            unreadCount: unreadCount || 0
          };
        })
      );
      
      conversations = convos.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }
  }
  
  async function loadAllUsers() {
    if (!$user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, full_name')
      .neq('id', $user.id)
      .order('username');
    
    if (data) allUsers = data;
  }
  
  async function startNewConversation(otherUserId: string) {
    if (!$user) return;
    
    console.log('Starting conversation with user:', otherUserId);
    
    // Check if conversation already exists
    const { data: existingParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', $user.id);
    
    console.log('My conversations:', existingParticipants);
    
    if (existingParticipants && existingParticipants.length > 0) {
      for (const p of existingParticipants) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id, conversation_id')
          .eq('conversation_id', p.conversation_id)
          .eq('user_id', otherUserId)
          .single();
        
        if (otherParticipant) {
          console.log('Found existing conversation:', p.conversation_id);
          // Conversation exists, reload and select it
          await loadConversations();
          const existingConv = conversations.find(c => c.id === p.conversation_id);
          if (existingConv) {
            selectConversation(existingConv);
          }
          showNewMessageModal = false;
          return;
        }
      }
    }
    
    console.log('Creating new conversation...');
    
    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();
    
    if (convError) {
      console.error('Error creating conversation:', convError);
      alert('Failed to create conversation: ' + convError.message);
      return;
    }
    
    console.log('Created conversation:', newConv);
    
    if (newConv) {
      // Add both participants
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: $user.id },
          { conversation_id: newConv.id, user_id: otherUserId }
        ]);
      
      if (participantError) {
        console.error('Error adding participants:', participantError);
        alert('Failed to add participants: ' + participantError.message);
        return;
      }
      
      console.log('Added participants successfully');
      
      showNewMessageModal = false;
      
      // Reload conversations to get the new one
      await loadConversations();
      
      console.log('Loaded conversations, count:', conversations.length);
      
      // Select the new conversation
      const conv = conversations.find(c => c.id === newConv.id);
      console.log('Found new conversation:', conv);
      
      if (conv) {
        selectConversation(conv);
      } else {
        console.error('Could not find newly created conversation');
      }
    }
  }
  
  async function selectConversation(conv: any) {
    selectedConversation = conv;
    await loadMessages(conv.id);
    subscribeToMessages(conv.id);
    markAsRead(conv.id);
    
    // Subscribe to typing indicators
    subscribeToTyping(conv.id);
  }
  
  async function loadMessages(conversationId: string) {
    const { data } = await supabase
      .from('direct_messages')
      .select('*, profiles!direct_messages_sender_id_fkey(username, avatar_url)')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    
    if (data) messages = data;
    setTimeout(scrollToBottom, 100);
  }
  
  function subscribeToMessages(conversationId: string) {
    if (messageSubscription) messageSubscription.unsubscribe();
    
    messageSubscription = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const { data } = await supabase
            .from('direct_messages')
            .select('*, profiles!direct_messages_sender_id_fkey(username, avatar_url)')
            .eq('id', payload.new.id)
            .single();
          
          if (data && !data.is_deleted) {
            messages = [...messages, data];
            setTimeout(scrollToBottom, 100);
            
            if (data.sender_id !== $user?.id) {
              markAsRead(conversationId);
            }
          }
        }
      )
      .subscribe();
  }
  
  function subscribeToTyping(conversationId: string) {
    // Clear existing typing indicators
    typingUsers = [];
    
    // Subscribe to conversation participants changes for typing indicators
    supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_participants' },
        (payload) => {
          const { user_id, typing, typing_updated_at } = payload.new;
          
          // Only show typing for other users
          if (user_id !== $user?.id) {
            if (typing && typing_updated_at) {
              // Check if typing indicator is recent (within 5 seconds)
              const updateTime = new Date(typing_updated_at).getTime();
              const now = Date.now();
              if (now - updateTime < 5000) {
                if (!typingUsers.includes(user_id)) {
                  typingUsers = [...typingUsers, user_id];
                }
              }
            } else {
              // Remove user from typing list
              typingUsers = typingUsers.filter(id => id !== user_id);
            }
          }
        }
      )
      .subscribe();
  }
  
  function sendTypingIndicator(isTyping: boolean) {
    if (!selectedConversation || !$user) return;
    
    // Clear any existing timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Send typing indicator to server
    fetch('/api/messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: selectedConversation.id,
        isTyping: isTyping
      })
    });
    
    // If typing, set timeout to clear typing indicator after 5 seconds
    if (isTyping) {
      typingTimeout = setTimeout(() => {
        sendTypingIndicator(false);
      }, 5000);
    }
  }
  
  async function markAsRead(conversationId: string) {
    if (!$user) return;
    
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', $user.id)
      .eq('is_read', false);
    
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', $user.id);
  }
  
  async function sendMessage() {
    if ((!messageText.trim() && !selectedFile) || !selectedConversation || !$user) return;
    
    sending = true;
    
    // Clear typing indicator when sending message
    sendTypingIndicator(false);
    
    let mediaUrl = null;
    let mediaType = null;
    
    // Upload media if selected
    if (selectedFile) {
      uploadingMedia = true;
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', $user.id);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const { url } = await response.json();
        mediaUrl = url;
        
        // Determine media type
        if (selectedFile.type.startsWith('image/')) mediaType = 'image';
        else if (selectedFile.type.startsWith('video/')) mediaType = 'video';
        else if (selectedFile.type.startsWith('audio/')) mediaType = 'audio';
        else mediaType = 'file';
      }
      
      uploadingMedia = false;
    }
    
    const { error } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: $user.id,
        content: messageText.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType
      });
    
    if (!error) {
      messageText = '';
      selectedFile = null;
      filePreview = null;
      
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);
    }
    
    sending = false;
  }
  
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
      }
      
      selectedFile = file;
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          filePreview = (e.target as FileReader).result as string;
        };
        reader.readAsDataURL(file);
      } else {
        filePreview = file.name;
      }
    }
  }
  
  function removeFile() {
    selectedFile = null;
    filePreview = null;
  }
  
  function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
  
  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  function formatDate(date: string) {
    const now = new Date();
    const msgDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - msgDate.getTime()) / 86400000);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return msgDate.toLocaleDateString('en-US', { weekday: 'long' });
    return msgDate.toLocaleDateString();
  }
  
  $: filteredConversations = conversations.filter(c => 
    c.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  $: filteredNewMessageUsers = allUsers.filter(u =>
    u.username?.toLowerCase().includes(newMessageSearch.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(newMessageSearch.toLowerCase())
  );
</script>

<main class="flex h-[calc(100vh-4rem)] bg-gray-50">
  <!-- Conversations List -->
  <div class="{selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r bg-white flex-col">
    <!-- Header -->
    <div class="p-4 border-b">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Messages</h1>
        <button 
          class="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          on:click={() => showNewMessageModal = true}
          title="New Message"
        >
          <UserPlus class="size-5" />
        </button>
      </div>
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Search conversations..."
          class="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          bind:value={searchQuery}
        />
      </div>
    </div>
    
    <!-- Conversations -->
    <div class="flex-1 overflow-y-auto">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin size-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      {:else if filteredConversations.length === 0}
        <div class="p-8 text-center">
          <p class="text-gray-500">No conversations yet</p>
        </div>
      {:else}
        {#each filteredConversations as conv (conv.id)}
          <button
            class="w-full p-4 flex items-center gap-3 hover:bg-gray-50 border-b {selectedConversation?.id === conv.id ? 'bg-blue-50' : ''}"
            on:click={() => selectConversation(conv)}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectConversation(conv)}
          >
            <img 
              src={conv.otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${conv.otherUser?.username}`}
              alt={conv.otherUser?.username}
              class="size-12 rounded-full"
            />
            <div class="flex-1 text-left">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">{conv.otherUser?.username || 'Unknown'}</h3>
                {#if conv.lastMessage}
                  <span class="text-xs text-gray-500">{formatTime(conv.lastMessage.created_at)}</span>
                {/if}
              </div>
              <div class="flex items-center justify-between">
                <p class="text-sm text-gray-600 truncate">{conv.lastMessage?.content || 'No messages yet'}</p>
                {#if conv.unreadCount > 0}
                  <span class="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">{conv.unreadCount}</span>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
  
  <!-- Chat Area -->
  {#if selectedConversation}
    <div class="flex-1 flex flex-col bg-gray-100">
      <!-- Chat Header -->
      <div class="bg-white border-b p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button class="md:hidden" on:click={() => selectedConversation = null} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (selectedConversation = null)}>
            <ArrowLeft class="size-6" />
          </button>
          <img 
            src={selectedConversation.otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${selectedConversation.otherUser?.username}`}
            alt={selectedConversation.otherUser?.username}
            class="size-10 rounded-full"
          />
          <div>
            <h2 class="font-bold">{selectedConversation.otherUser?.username || 'Unknown'}</h2>
            <p class="text-xs text-gray-500">Active now</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="p-2 hover:bg-gray-100 rounded-lg" on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.currentTarget.click()}>
            <Phone class="size-5" />
          </button>
          <button class="p-2 hover:bg-gray-100 rounded-lg" on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.currentTarget.click()}>
            <Video class="size-5" />
          </button>
          <button class="p-2 hover:bg-gray-100 rounded-lg" on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.currentTarget.click()}>
            <MoreVertical class="size-5" />
          </button>
        </div>
      </div>
      
      <!-- Messages -->
      <div id="messages-container" class="flex-1 overflow-y-auto p-4 space-y-4">
        {#each messages as message (message.id)}
          <div class="flex {message.sender_id === $user?.id ? 'justify-end' : 'justify-start'}">
            {#if message.sender_id !== $user?.id}
              <img 
                src={message.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${message.profiles?.username}`}
                alt={message.profiles?.username}
                class="size-8 rounded-full mr-2"
              />
            {/if}
            <div class="max-w-xs lg:max-w-md">
              <div class="{message.sender_id === $user?.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'} rounded-2xl px-4 py-2 shadow">
                {#if message.content}
                  <p class="text-sm">{message.content}</p>
                {/if}
                {#if message.media_url}
                  {#if message.media_type === 'image'}
                    <img src={message.media_url} alt="Media" class="mt-2 rounded-lg max-w-full" />
                  {:else if message.media_type === 'video'}
                    <video src={message.media_url} controls class="mt-2 rounded-lg max-w-full"><track kind="captions" /></video>
                  {:else if message.media_type === 'audio'}
                    <audio src={message.media_url} controls class="mt-2 w-full"></audio>
                  {:else}
                    <a href={message.media_url} target="_blank" class="mt-2 flex items-center gap-2 text-sm underline">
                      <FileText class="size-4" /> View file
                    </a>
                  {/if}
                {/if}
              </div>
              <p class="text-xs text-gray-500 mt-1 {message.sender_id === $user?.id ? 'text-right' : 'text-left'}">
                {formatTime(message.created_at)}
              </p>
            </div>
          </div>
        {/each}
        
        <!-- Typing indicators -->
        {#if typingUsers.length > 0}
          <div class="flex justify-start">
            <img 
              src={selectedConversation?.otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${selectedConversation?.otherUser?.username}`}
              alt={selectedConversation?.otherUser?.username}
              class="size-8 rounded-full mr-2"
            />
            <div class="bg-white text-gray-800 rounded-2xl px-4 py-2 shadow">
              <div class="flex space-x-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
              </div>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Input -->
      <div class="bg-white border-t p-4">
        <div class="flex items-center gap-2">
          <label class="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <input 
              type="file"
              class="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              on:change={handleFileSelect}
              disabled={uploadingMedia}
            />
            <ImageIcon class="size-5 {uploadingMedia ? 'animate-pulse' : ''}" />
          </label>
          
          {#if filePreview}
            <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
              {#if selectedFile?.type.startsWith('image/')}
                <span class="text-xs">Image selected</span>
              {:else if selectedFile?.type.startsWith('video/')}
                <span class="text-xs">Video selected</span>
              {:else if selectedFile?.type.startsWith('audio/')}
                <span class="text-xs">Audio selected</span>
              {:else}
                <span class="text-xs">{selectedFile?.name}</span>
              {/if}
              <button class="p-1 hover:bg-gray-200 rounded-full" on:click={removeFile} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && removeFile()}>
                <Trash2 class="size-4" />
              </button>
            </div>
          {/if}
          
          <input 
            type="text"
            placeholder="Type a message..."
            class="flex-1 px-4 py-2 rounded-full border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            bind:value={messageText}
            on:keypress={(e) => e.key === 'Enter' && sendMessage()}
            on:focusout={() => sendTypingIndicator(false)}
            on:input={() => sendTypingIndicator(true)}
            disabled={sending}
          />
          <button 
            class="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
            on:click={sendMessage}
            disabled={sending || (!messageText.trim() && !selectedFile)}
          >
            <Send class="size-5" />
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="hidden md:flex flex-1 items-center justify-center bg-gray-100">
      <div class="text-center">
        <div class="inline-flex p-6 rounded-full bg-gray-200 mb-4">
          <Send class="size-12 text-gray-400" />
        </div>
        <h2 class="text-xl font-bold text-gray-700 mb-2">Your Messages</h2>
        <p class="text-gray-500">Select a conversation to start messaging</p>
      </div>
    </div>
  {/if}
</main>

<!-- New Message Modal -->
{#if showNewMessageModal}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-message-title" tabindex="-1">
    <div class="bg-white rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col">
      <div class="p-4 border-b flex items-center justify-between">
        <h2 id="new-message-title" class="text-xl font-bold">New Message</h2>
        <button class="p-2 hover:bg-gray-100 rounded-lg" on:click={() => showNewMessageModal = false} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (showNewMessageModal = false)}>
          <X class="size-5" />
        </button>
      </div>
      
      <div class="p-4 border-b">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search users..."
            class="w-full pl-9 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            bind:value={newMessageSearch}
          />
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        {#if filteredNewMessageUsers.length === 0}
          <div class="p-8 text-center">
            <p class="text-gray-500">No users found</p>
          </div>
        {:else}
          {#each filteredNewMessageUsers as otherUser}
            <button
              class="w-full p-4 flex items-center gap-3 hover:bg-gray-50 border-b"
              on:click={() => startNewConversation(otherUser.id)}
              on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && startNewConversation(otherUser.id)}
            >
              <img 
                src={otherUser.avatar_url || `https://ui-avatars.com/api/?name=${otherUser.username}`}
                alt={otherUser.username}
                class="size-12 rounded-full"
              />
              <div class="flex-1 text-left">
                <h3 class="font-semibold">{otherUser.username}</h3>
                {#if otherUser.full_name}
                  <p class="text-sm text-gray-500">{otherUser.full_name}</p>
                {/if}
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}