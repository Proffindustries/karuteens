<script lang="ts">
	import { page } from '$app/stores';
	import { user } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase/client';
	import { onMount, onDestroy } from 'svelte';
	import { Send, Image, Smile, Reply, Trash2, Users, Settings, LogOut, AlertCircle } from 'lucide-svelte';
	
	let groupId = $page.params.id as string;
	let group: any = null;
	let messages: any[] = [];
	let members: any[] = [];
	let messageText = '';
	let loading = true;
	let sending = false;
	let uploadingMedia = false;
	let replyTo: any = null;
	let showEmojiPicker = false;
	let isMember = false;
	let userRole = '';
	let messageSubscription: any = null;
	let reactionSubscription: any = null;
	
	const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];
	
	onMount(async () => {
		await loadGroup();
		await checkMembership();
		if (isMember) {
			await loadMessages();
			await loadMembers();
			subscribeToMessages();
			subscribeToReactions();
		}
		loading = false;
	});
	
	onDestroy(() => {
		if (messageSubscription) messageSubscription.unsubscribe();
		if (reactionSubscription) reactionSubscription.unsubscribe();
	});
	
	async function loadGroup() {
		const { data, error } = await supabase
			.from('groups')
			.select('*, profiles!groups_creator_id_fkey(username, avatar_url)')
			.eq('id', groupId)
			.single();
		
		if (data) group = data;
	}
	
	async function checkMembership() {
		if (!$user) return;
		
		const { data } = await supabase
			.from('group_members')
			.select('role')
			.eq('group_id', groupId)
			.eq('user_id', $user.id)
			.single();
		
		if (data) {
			isMember = true;
			userRole = data.role;
		}
	}
	
	async function loadMessages() {
		const { data } = await supabase
			.from('group_messages')
			.select(`
				*,
				profiles!group_messages_sender_id_fkey(username, avatar_url),
				message_reactions(emoji, user_id)
			`)
			.eq('group_id', groupId)
			.eq('is_deleted', false)
			.order('created_at', { ascending: true })
			.limit(100);
		
		if (data) messages = data;
		setTimeout(scrollToBottom, 100);
	}
	
	async function loadMembers() {
		const { data } = await supabase
			.from('group_members')
			.select('*, profiles(username, avatar_url)')
			.eq('group_id', groupId);
		
		if (data) members = data;
	}
	
	function subscribeToMessages() {
		messageSubscription = supabase
			.channel(`group-${groupId}-messages`)
			.on(
				'postgres_changes',
				{ 
					event: 'INSERT', 
					schema: 'public', 
					table: 'group_messages', 
					filter: `group_id=eq.${groupId}` 
				},
				async (payload) => {
					console.log('New message received:', payload);
					
					// Remove all temp messages before adding real one
					messages = messages.filter(m => !m.id.toString().startsWith('temp'));
					
					// Fetch the full message with joined data
					const { data } = await supabase
						.from('group_messages')
						.select(`
							*,
							profiles!group_messages_sender_id_fkey(username, avatar_url),
							message_reactions(emoji, user_id)
						`)
						.eq('id', payload.new.id)
						.single();
					
					if (data && !data.is_deleted) {
						messages = [...messages, data];
						setTimeout(scrollToBottom, 100);
					}
				}
			)
			.on(
				'postgres_changes',
				{ 
					event: 'UPDATE', 
					schema: 'public', 
					table: 'group_messages', 
					filter: `group_id=eq.${groupId}` 
				},
				(payload) => {
					console.log('Message updated:', payload);
					// Remove deleted messages
					if (payload.new.is_deleted) {
						messages = messages.filter(m => m.id !== payload.new.id);
					}
				}
			)
			.subscribe((status) => {
				console.log('Message subscription status:', status);
			});
	}
	
	function subscribeToReactions() {
		reactionSubscription = supabase
			.channel(`group-${groupId}-reactions`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'message_reactions' },
				() => {
					console.log('Reactions changed, reloading messages');
					loadMessages();
				}
			)
			.subscribe((status) => {
				console.log('Reaction subscription status:', status);
			});
	}
	
	async function sendMessage() {
		if (!messageText.trim() && !replyTo) return;
		
		const content = messageText.trim();
		const replyToId = replyTo?.id || null;
		
		sending = true;
		
		// Optimistic update - add message immediately
		const tempMessage = {
			id: 'temp-' + Date.now(),
			group_id: groupId,
			sender_id: $user?.id,
			content: content,
			reply_to_id: replyToId,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			is_deleted: false,
			profiles: {
				username: $user?.user_metadata?.username || $user?.email?.split('@')[0],
				avatar_url: null
			},
			message_reactions: []
		};
		
		messages = [...messages, tempMessage];
		setTimeout(scrollToBottom, 100);
		
		// Clear form immediately
		messageText = '';
		replyTo = null;
		
		const { error } = await supabase
			.from('group_messages')
			.insert({
				group_id: groupId,
				sender_id: $user?.id,
				content: content,
				reply_to_id: replyToId
			});
		
		if (error) {
			console.error('Send message error:', error);
			// Remove temp message on error
			messages = messages.filter(m => m.id !== tempMessage.id);
			alert('Failed to send message');
		}
		
		sending = false;
	}
	
	async function uploadMedia(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !$user || !groupId) return;
		
		uploadingMedia = true;
		const formData = new FormData();
		formData.append('file', file);
		formData.append('groupId', groupId as string);
		
		const response = await fetch('/api/groups/upload-media', {
			method: 'POST',
			body: formData
		});
		
		if (response.ok) {
			const { url, mediaType } = await response.json();
			
			// Optimistic update - show media immediately
			const tempMessage = {
				id: 'temp-media-' + Date.now(),
				group_id: groupId,
				sender_id: $user.id,
				content: null,
				media_url: url,
				media_type: mediaType,
				reply_to_id: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				is_deleted: false,
				profiles: {
					username: $user.user_metadata?.username || $user.email?.split('@')[0],
					avatar_url: null
				},
				message_reactions: []
			};
			
			messages = [...messages, tempMessage];
			setTimeout(scrollToBottom, 100);
			
			await supabase.from('group_messages').insert({
				group_id: groupId,
				sender_id: $user.id,
				media_url: url,
				media_type: mediaType
			});
		}
		
		uploadingMedia = false;
		input.value = '';
	}
	
	async function addReaction(messageId: string, emoji: string) {
		const { error } = await supabase
			.from('message_reactions')
			.insert({
				message_id: messageId,
				user_id: $user?.id,
				emoji
			});
		
		if (error?.code === '23505') {
			await supabase
				.from('message_reactions')
				.delete()
				.eq('message_id', messageId)
				.eq('user_id', $user?.id)
				.eq('emoji', emoji);
		}
	}
	
	async function deleteMessage(messageId: string) {
		await supabase
			.from('group_messages')
			.update({ is_deleted: true })
			.eq('id', messageId);
		
		messages = messages.filter(m => m.id !== messageId);
	}
	
	async function joinGroup() {
		const response = await fetch(`/api/groups/${groupId}/membership`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'join' })
		});
		
		if (response.ok) {
			isMember = true;
			userRole = 'member';
			await loadMessages();
			await loadMembers();
			subscribeToMessages();
			subscribeToReactions();
		}
	}
	
	async function leaveGroup() {
		if (!confirm('Are you sure you want to leave this group?')) return;
		
		const response = await fetch(`/api/groups/${groupId}/membership`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'leave' })
		});
		
		if (response.ok) {
			window.location.href = '/groups';
		}
	}
	
	async function deleteGroup() {
		if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
		
		const { error } = await supabase
			.from('groups')
			.delete()
			.eq('id', groupId);
		
		if (!error) {
			window.location.href = '/groups';
		}
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
	
	function groupReactions(reactions: any[]) {
		const grouped: Record<string, number> = {};
		reactions?.forEach(r => {
			grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
		});
		return grouped;
	}
	
	function hasUserReacted(reactions: any[], emoji: string) {
		return reactions?.some(r => r.emoji === emoji && r.user_id === $user?.id);
	}
</script>

<main class="flex flex-col h-[calc(100vh-4rem)]">
	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<div class="animate-spin size-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
		</div>
	{:else if !group}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-foreground/60">Group not found</p>
		</div>
	{:else}
		<!-- Header -->
		<div class="border-b bg-white px-4 py-3">
			<div class="max-w-screen-lg mx-auto flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="size-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
						{group.name.charAt(0).toUpperCase()}
					</div>
					<div>
						<h1 class="font-bold text-lg">{group.name}</h1>
						<p class="text-sm text-foreground/60">{members.length} members</p>
					</div>
				</div>
				
				<div class="flex items-center gap-2">
					{#if isMember}
						<button class="p-2 rounded-lg hover:bg-gray-100" title="Members">
							<Users class="size-5" />
						</button>
						{#if userRole === 'creator'}
							<button class="p-2 rounded-lg hover:bg-gray-100" on:click={deleteGroup} title="Delete Group">
								<Trash2 class="size-5 text-red-600" />
							</button>
						{:else}
							<button class="p-2 rounded-lg hover:bg-gray-100" on:click={leaveGroup} title="Leave Group">
								<LogOut class="size-5" />
							</button>
						{/if}
					{/if}
				</div>
			</div>
		</div>
		
		{#if !isMember}
			<!-- Join Prompt -->
			<div class="flex-1 flex items-center justify-center bg-gray-50">
				<div class="text-center space-y-4 p-8">
					<AlertCircle class="size-16 text-blue-600 mx-auto" />
					<h2 class="text-2xl font-bold">Join {group.name}</h2>
					<p class="text-foreground/60 max-w-md">{group.description}</p>
					<button 
						class="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all"
						on:click={joinGroup}
					>
						Join Group
					</button>
				</div>
			</div>
		{:else}
			<!-- Messages -->
			<div id="messages-container" class="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
				<div class="max-w-screen-lg mx-auto space-y-4">
					{#each messages as message (message.id)}
						<div class="flex gap-3 group">
							<img 
								src={message.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${message.profiles?.username}`} 
								alt={message.profiles?.username}
								class="size-10 rounded-full"
							/>
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<span class="font-semibold text-sm">{message.profiles?.username}</span>
									<span class="text-xs text-foreground/40">{formatTime(message.created_at)}</span>
								</div>
								
								{#if message.reply_to_id}
									<div class="text-xs text-foreground/60 mb-1 italic">Replying to a message</div>
								{/if}
								
								{#if message.content}
									<div class="bg-white rounded-lg px-4 py-2 inline-block shadow-sm">
										<p class="text-sm">{message.content}</p>
									</div>
								{/if}
								
								{#if message.media_url}
									<div class="mt-2">
										{#if message.media_type === 'image'}
											<img src={message.media_url} alt="Shared media" class="max-w-sm rounded-lg shadow-md" />
										{:else if message.media_type === 'video'}
											<video src={message.media_url} controls class="max-w-sm rounded-lg shadow-md"></video>
										{:else}
											<a href={message.media_url} target="_blank" class="text-blue-600 text-sm hover:underline">View file</a>
										{/if}
									</div>
								{/if}
								
								<!-- Reactions -->
								{#if message.message_reactions && message.message_reactions.length > 0}
									<div class="flex flex-wrap gap-1 mt-2">
										{#each Object.entries(groupReactions(message.message_reactions)) as [emoji, count]}
											<button 
												class="px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-xs flex items-center gap-1 {hasUserReacted(message.message_reactions, emoji) ? 'ring-2 ring-blue-500' : ''}"
												on:click={() => addReaction(message.id, emoji)}
											>
												<span>{emoji}</span>
												<span class="font-semibold">{count}</span>
											</button>
										{/each}
									</div>
								{/if}
								
								<!-- Quick Actions -->
								<div class="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button class="text-xs text-foreground/60 hover:text-foreground" on:click={() => replyTo = message}>
										<Reply class="size-3 inline" /> Reply
									</button>
									<button class="text-xs text-foreground/60 hover:text-foreground relative" on:click={() => showEmojiPicker = message.id}>
										<Smile class="size-3 inline" /> React
									</button>
									{#if message.sender_id === $user?.id}
										<button class="text-xs text-red-600 hover:text-red-700" on:click={() => deleteMessage(message.id)}>
											<Trash2 class="size-3 inline" /> Delete
										</button>
									{/if}
								</div>
								
								<!-- Emoji Picker -->
								{#if showEmojiPicker === message.id}
									<div class="mt-2 flex gap-1 bg-white p-2 rounded-lg shadow-lg inline-flex">
										{#each emojis as emoji}
											<button 
												class="hover:bg-gray-100 p-1 rounded text-lg"
												on:click={() => { addReaction(message.id, emoji); showEmojiPicker = false; }}
											>
												{emoji}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
			
			<!-- Reply Preview -->
			{#if replyTo}
				<div class="border-t bg-blue-50 px-4 py-2">
					<div class="max-w-screen-lg mx-auto flex items-center justify-between">
						<div class="text-sm">
							<span class="text-foreground/60">Replying to</span>
							<span class="font-semibold ml-1">{replyTo.profiles?.username}</span>
						</div>
						<button class="text-sm text-foreground/60 hover:text-foreground" on:click={() => replyTo = null}>Cancel</button>
					</div>
				</div>
			{/if}
			
			<!-- Input -->
			<div class="border-t bg-white px-4 py-3">
				<div class="max-w-screen-lg mx-auto flex items-end gap-2">
					<label class="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
						<input type="file" class="hidden" accept="image/*,video/*" on:change={uploadMedia} disabled={uploadingMedia} />
						<Image class="size-5 {uploadingMedia ? 'animate-pulse' : ''}" />
					</label>
					
					<div class="flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
						<input 
							type="text" 
							placeholder="Type a message..." 
							class="flex-1 outline-none"
							bind:value={messageText}
							on:keypress={(e) => e.key === 'Enter' && sendMessage()}
							disabled={sending}
						/>
					</div>
					
					<button 
						class="p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
						on:click={sendMessage}
						disabled={sending || (!messageText.trim() && !replyTo)}
					>
						<Send class="size-5" />
					</button>
				</div>
			</div>
		{/if}
	{/if}
</main>
