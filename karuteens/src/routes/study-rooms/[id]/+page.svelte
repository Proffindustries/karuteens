<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Send, Image as ImageIcon, Eraser, Pencil, Share2 } from 'lucide-svelte';
  import type { StudyRoom } from '$lib/types/study-room';
  import type { StudyRoomMember, StudyRoomMessage, WebRTCMessage, DrawStroke } from '$lib/types/study-room-detail';
  
  export let params: { id: string };
  const roomId = params.id;
  
  let room: StudyRoom | null = null;
  let members: StudyRoomMember[] = [];
  let messages: StudyRoomMessage[] = [];
  let messageText = '';
  let sending = false;
  let uploading = false;
  let subscription: ReturnType<typeof supabase.channel> | null = null;
  
  // Board state
  let activeTab: 'board' | 'meeting' | 'chat' = 'board';
  let boardChannel: ReturnType<typeof supabase.channel> | null = null;
  let rtcChannel: ReturnType<typeof supabase.channel> | null = null;
  let sharedCanvas: HTMLCanvasElement | null = null;
  let sharedCtx: CanvasRenderingContext2D | null = null;
  let personalCanvas: HTMLCanvasElement | null = null;
  let personalCtx: CanvasRenderingContext2D | null = null;
  let isDrawing = false;
  let currentPath: Array<{ x: number; y: number }> = [];
  let penColor = '#1d4ed8';
  let penSize = 3;
  
  // WebRTC state
  let localStream: MediaStream | null = null;
  let remoteStream: MediaStream | null = null;
  let peerConnection: RTCPeerConnection | null = null;
  const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  
  onMount(async () => {
    try {
      await Promise.all([
        loadRoom(),
        loadMembers(),
        loadMessages()
      ]);
      
      subscribeMessages();
      setupBoardChannel();
      setupRtcChannel();
      attachCanvases();
      window.addEventListener('resize', resizeCanvases);
    } catch (error) {
      console.error('Error initializing study room:', error);
    }
  });
  
  onDestroy(() => {
    // Cleanup subscriptions
    if (subscription) subscription.unsubscribe();
    if (boardChannel) boardChannel.unsubscribe();
    if (rtcChannel) rtcChannel.unsubscribe();
    
    // Cleanup WebRTC
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    
    // Cleanup media streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      remoteStream = null;
    }
    
    window.removeEventListener('resize', resizeCanvases);
  });
  
  async function loadRoom() {
    const { data } = await supabase
      .from('study_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    room = data;
  }
  
  async function loadMembers() {
    const { data } = await supabase
      .from('study_room_members')
      .select('*, profiles(username, avatar_url)')
      .eq('room_id', roomId);
    members = data || [];
  }
  
  async function loadMessages() {
    const { data } = await supabase
      .from('study_room_messages')
      .select('*, profiles!study_room_messages_sender_id_fkey(username, avatar_url)')
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(200);
    messages = data || [];
    setTimeout(scrollToBottom, 100);
  }
  
  function subscribeMessages() {
    subscription = supabase
      .channel(`study-room-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_room_messages', filter: `room_id=eq.${roomId}` }, async (payload) => {
        const { data } = await supabase
          .from('study_room_messages')
          .select('*, profiles!study_room_messages_sender_id_fkey(username, avatar_url)')
          .eq('id', payload.new.id)
          .single();
        if (data && !data.is_deleted) {
          messages = [...messages, data];
          setTimeout(scrollToBottom, 100);
        }
      })
      .subscribe();
  }
  
  function setupBoardChannel() {
    if (!roomId) return;
    
    boardChannel = supabase
      .channel(`study-room-${roomId}-board`)
      .on('broadcast', { event: 'draw' }, (payload: { payload: DrawStroke }) => {
        if (!sharedCtx || !payload?.payload) return;
        drawStroke(sharedCtx, payload.payload);
      })
      .on('broadcast', { event: 'clear' }, () => {
        if (sharedCtx) clearCanvas(sharedCtx);
      });
      
    boardChannel.subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to board channel');
      }
    });
  }

  function setupRtcChannel() {
    if (!roomId) return;
    
    rtcChannel = supabase.channel(`study-room-${roomId}-rtc`);
    
    rtcChannel
      .on('broadcast', { event: 'offer' }, async ({ payload }: { payload: WebRTCMessage }) => {
        if (!rtcChannel || !payload.sender || payload.sender === $user?.id) return;
        
        try {
          if (!peerConnection) {
            await createPeerConnection();
          }
          
          if (payload.sdp) {
            await peerConnection?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await peerConnection?.createAnswer();
            await peerConnection?.setLocalDescription(answer);
            
            // Send the answer back to the sender
            rtcChannel?.send({
              type: 'broadcast',
              event: 'answer',
              payload: {
                type: 'answer',
                sdp: peerConnection?.localDescription,
                target: payload.sender,
                sender: $user?.id
              } as WebRTCMessage
            });
          }
        } catch (error) {
          console.error('Error handling offer:', error);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }: { payload: WebRTCMessage }) => {
        if (!rtcChannel || !payload.sender || payload.sender === $user?.id) return;
        
        try {
          if (payload.sdp && peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      })
      .on('broadcast', { event: 'candidate' }, async ({ payload }: { payload: WebRTCMessage }) => {
        if (!rtcChannel || !payload.sender || payload.sender === $user?.id || !peerConnection) return;
        
        try {
          if (payload.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        } catch (error) {
          console.error('Error handling ICE candidate:', error);
        }
      });
      
    rtcChannel.subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to RTC channel');
      }
    });
  }
  
  async function createPeerConnection() {
    if (peerConnection) return;
    
    peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks if available
    if (localStream) {
      localStream.getTracks().forEach(track => {
        if (localStream) {
          peerConnection?.addTrack(track, localStream);
        }
      });
    }
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      if (!remoteStream) {
        remoteStream = new MediaStream();
      }
      event.streams[0].getTracks().forEach(track => {
        remoteStream?.addTrack(track);
      });
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        rtcChannel?.send({
          type: 'broadcast',
          event: 'candidate',
          payload: {
            type: 'candidate',
            candidate: event.candidate,
            sender: $user?.id
          } as WebRTCMessage
        });
      }
    };
    
    return peerConnection;
  }
  async function startLocalStream() {
    try {
      if (localStream) return;
      
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
      if (localVideo) {
        localVideo.srcObject = localStream;
      }
      
      // Add local stream tracks to peer connection if it exists
      if (peerConnection) {
        localStream.getTracks().forEach(track => {
          peerConnection?.addTrack(track, localStream!);
        });
      }
      
      return localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }
  
  async function stopLocalStream() {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
      
      const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
      if (localVideo) {
        localVideo.srcObject = null;
      }
    }
  }
  
  async function startScreenShare() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Stop existing screen share if any
      if (localStream) {
        await stopLocalStream();
      }
      
      localStream = stream;
      
      // Handle when user stops screen sharing
      stream.getVideoTracks()[0].onended = () => {
        stopLocalStream();
      };
      
      // Update local video element
      const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
      if (localVideo) {
        localVideo.srcObject = stream;
      }
      
      // Add tracks to peer connection if it exists
      if (peerConnection) {
        stream.getTracks().forEach(track => {
          peerConnection?.addTrack(track, stream);
        });
      }
      
      return stream;
    } catch (error) {
      console.error('Error sharing screen:', error);
      throw error;
    }
  }

  async function startMeeting() {
    try {
      await startLocalStream();
      await createPeerConnection();
      
      // Create and send offer
      if (peerConnection) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        rtcChannel?.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            type: 'offer',
            sdp: peerConnection.localDescription,
            sender: $user?.id
          } as WebRTCMessage
        });
      }
    } catch (error) {
      console.error('Error starting meeting:', error);
    }
  }
  
  async function stopMeeting() {
    try {
      await stopLocalStream();
      
      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
      }
      
      if (rtcChannel) {
        await rtcChannel.send({
          type: 'broadcast',
          event: 'leave',
          payload: {
            type: 'leave',
            sender: $user?.id
          } as WebRTCMessage
        });
      }
      
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (remoteVideo) {
        remoteVideo.srcObject = null;
      }
      
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
      }
    } catch (error) {
      console.error('Error stopping meeting:', error);
    }
  }
  
  // Handle WebRTC events
  function setupRtcEventHandlers() {
    if (!rtcChannel) return;
    
    rtcChannel
      .on('broadcast', { event: 'answer' }, async ({ payload }: { payload: WebRTCMessage }) => {
        try {
          if (!payload.sender || payload.sender === $user?.id || !peerConnection) return;
          if (payload.sdp) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      })
      .on('broadcast', { event: 'candidate' }, async ({ payload }: { payload: WebRTCMessage }) => {
        try {
          if (!pc) return;
          await pc.addIceCandidate(payload.candidate);
        } catch (err) {
          console.error('handle candidate error', err);
        }
      })
      .subscribe();
  }

  async function ensurePeer() {
    if (pc) return;
    pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.ontrack = (e) => {
      const rv = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (rv) rv.srcObject = e.streams[0];
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) rtcChannel?.send({ type: 'broadcast', event: 'candidate', payload: { candidate: e.candidate } });
    };
  }

  async function startMeeting() {
    try {
      await ensurePeer();
      if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const lv = document.getElementById('localVideo') as HTMLVideoElement;
        if (lv) lv.srcObject = localStream;
        localStream.getTracks().forEach((t) => pc!.addTrack(t, localStream!));
      }
      const offer = await pc!.createOffer();
      await pc!.setLocalDescription(offer);
      rtcChannel?.send({ type: 'broadcast', event: 'offer', payload: { sdp: offer, from: $user?.id } });
      activeTab = 'meeting';
    } catch (err) {
      alert('Failed to start meeting');
      console.error(err);
    }
  }

  function stopMeeting() {
    try {
      pc?.getSenders().forEach((s) => s.track?.stop());
      localStream?.getTracks().forEach((t) => t.stop());
      pc?.close();
      pc = null;
      localStream = null;
      const lv = document.getElementById('localVideo') as HTMLVideoElement;
      const rv = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (lv) lv.srcObject = null;
      if (rv) rv.srcObject = null;
    } catch (e) {
      console.error('stop meeting error', e);
    }
  }

  function attachCanvases() {
    sharedCanvas = document.getElementById('shared-board') as HTMLCanvasElement;
    personalCanvas = document.getElementById('personal-board') as HTMLCanvasElement;
    if (sharedCanvas) sharedCtx = sharedCanvas.getContext('2d');
    if (personalCanvas) personalCtx = personalCanvas.getContext('2d');
    resizeCanvases();
    bindCanvasEvents(sharedCanvas, sharedCtx, true);
    bindCanvasEvents(personalCanvas, personalCtx, false);
  }
  
  function resizeCanvases() {
    [sharedCanvas, personalCanvas].forEach((c) => {
      if (!c) return;
      const parent = c.parentElement as HTMLElement;
      const rect = parent.getBoundingClientRect();
      c.width = Math.floor(rect.width);
      c.height = Math.floor(Math.max(400, rect.height - 20));
    });
  }
  
  function bindCanvasEvents(canvas: HTMLCanvasElement | null, ctx: CanvasRenderingContext2D | null, isShared: boolean) {
    if (!canvas || !ctx) return;
    canvas.onpointerdown = (e) => {
      isDrawing = true;
      currentPath = [{ x: e.offsetX, y: e.offsetY }];
    };
    canvas.onpointermove = (e) => {
      if (!isDrawing) return;
      const pt = { x: e.offsetX, y: e.offsetY };
      const last = currentPath[currentPath.length - 1];
      currentPath.push(pt);
      // Draw segment immediately
      drawStroke(ctx, { color: penColor, size: penSize, points: [last, pt] });
    };
    canvas.onpointerup = () => finishPath(isShared, ctx);
    canvas.onpointerleave = () => finishPath(isShared, ctx);
  }
  
  function finishPath(isShared: boolean, ctx: CanvasRenderingContext2D) {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentPath.length < 2) return;
    const stroke = { color: penColor, size: penSize, points: currentPath };
    if (isShared && boardChannel) {
      boardChannel.send({ type: 'broadcast', event: 'draw', payload: stroke });
    }
    currentPath = [];
  }
  
  function drawStroke(ctx: CanvasRenderingContext2D, stroke: { color: string; size: number; points: Array<{ x: number; y: number }> }) {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    const pts = stroke.points;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  
  function clearCanvas(ctx: CanvasRenderingContext2D | null) {
    if (!ctx) return;
    const c = ctx.canvas;
    ctx.clearRect(0, 0, c.width, c.height);
  }
  
  async function sharePersonalBoard() {
    if (!personalCanvas || !$user) return;
    const blob: Blob = await new Promise((resolve) => personalCanvas!.toBlob((b) => resolve(b as Blob), 'image/png'));
    const form = new FormData();
    form.append('file', new File([blob], `board-${Date.now()}.png`, { type: 'image/png' }));
    form.append('userId', $user.id);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (res.ok) {
      const { url } = await res.json();
      await supabase.from('study_room_messages').insert({ room_id: roomId, sender_id: $user.id, media_url: url, media_type: 'image' });
      activeTab = 'chat';
      setTimeout(scrollToBottom, 100);
    } else {
      alert('Failed to share board image');
    }
  }
  
  async function sendMessage() {
    if (!messageText.trim() || !$user) return;
    sending = true;
    await supabase
      .from('study_room_messages')
      .insert({ room_id: roomId, sender_id: $user.id, content: messageText.trim() });
    messageText = '';
    sending = false;
  }
  
  function scrollToBottom() {
    const el = document.getElementById('messages');
    if (el) el.scrollTop = el.scrollHeight;
  }
</script>

<main class="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
  {#if !room}
    <p class="text-foreground/70">Loading room...</p>
  {:else}
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{room.title}</h1>
        <p class="text-sm text-foreground/60">{room.subject}</p>
      </div>
      <div class="text-sm text-foreground/60">{members.length} members</div>
    </header>

    <!-- Tabs -->
    <div class="flex gap-2 border-b">
      <button class="px-4 py-2 {activeTab === 'board' ? 'border-b-2 border-blue-600 font-semibold' : ''}" on:click={() => activeTab = 'board'}>Board</button>
      <button class="px-4 py-2 {activeTab === 'meeting' ? 'border-b-2 border-blue-600 font-semibold' : ''}" on:click={() => activeTab = 'meeting'}>Meeting</button>
      <button class="px-4 py-2 {activeTab === 'chat' ? 'border-b-2 border-blue-600 font-semibold' : ''}" on:click={() => activeTab = 'chat'}>Chat</button>
    </div>

    {#if activeTab === 'board'}
      <!-- Shared Board -->
      <section class="rounded-2xl border bg-white p-4 space-y-3">
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2">
            <Pencil class="size-4" />
            <input type="color" bind:value={penColor} />
          </label>
          <label class="flex items-center gap-2">
            <span class="text-sm">Size</span>
            <input type="range" min="1" max="12" bind:value={penSize} />
          </label>
          <button class="px-3 py-2 rounded-lg border hover:bg-gray-100" on:click={() => { clearCanvas(sharedCtx); boardChannel?.send({ type: 'broadcast', event: 'clear', payload: {} }); }}>Clear</button>
        </div>
        <div class="rounded-lg border bg-gray-50">
          <canvas id="shared-board" class="w-full h-[50vh]"></canvas>
        </div>
      </section>

      <!-- Personal Board -->
      <section class="rounded-2xl border bg-white p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2">
              <Pencil class="size-4" />
              <input type="color" bind:value={penColor} />
            </label>
            <label class="flex items-center gap-2">
              <span class="text-sm">Size</span>
              <input type="range" min="1" max="12" bind:value={penSize} />
            </label>
          </div>
          <button class="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2" on:click={sharePersonalBoard}>
            <Share2 class="size-4" /> Share to Chat
          </button>
        </div>
        <div class="rounded-lg border bg-gray-50">
          <canvas id="personal-board" class="w-full h-[40vh]"></canvas>
        </div>
      </section>
    {:else if activeTab === 'meeting'}
      <!-- Meeting -->
      <section class="rounded-2xl border bg-white p-4 space-y-3">
        <div class="flex items-center gap-2">
          <button class="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" on:click={startMeeting}>Start Meeting</button>
          <button class="px-3 py-2 rounded-lg border hover:bg-gray-100" on:click={stopMeeting}>End</button>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-foreground/60 mb-2">Your video</p>
            <video id="localVideo" autoplay playsinline muted class="w-full rounded-lg bg-black h-[30vh]"></video>
          </div>
          <div>
            <p class="text-sm text-foreground/60 mb-2">Remote</p>
            <video 
  id="remoteVideo" 
  autoplay 
  playsinline 
  class="w-full rounded-lg bg-black h-[30vh]"
  aria-label="Remote participant video"
  controls
>
  <track kind="captions" src="" label="English" srclang="en" default>
</video>
          </div>
        </div>
      </section>
    {:else}
      <!-- Messages Chat -->
      <section id="messages" class="rounded-2xl border bg-white h-[60vh] overflow-y-auto p-4 space-y-3">
        {#each messages as m}
          <div class="flex items-start gap-3">
            <img src={m.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${m.profiles?.username}`} alt="avatar" class="size-8 rounded-full" />
            <div>
              <div class="text-sm"><span class="font-semibold">{m.profiles?.username}</span> <span class="text-foreground/50">• {new Date(m.created_at).toLocaleTimeString()}</span></div>
              {#if m.content}<p>{m.content}</p>{/if}
              {#if m.media_url}
                <img src={m.media_url} alt="media" class="rounded-lg max-w-sm mt-2" />
              {/if}
            </div>
          </div>
        {/each}
      </section>
      
      <section class="rounded-2xl border bg-white p-3 flex items-center gap-2">
        <label class="p-2 rounded-lg hover:bg-gray-100">
          <input type="file" class="hidden" disabled={uploading} />
          <ImageIcon class="size-5" />
        </label>
        <input type="text" class="flex-1 rounded-lg border px-3 py-2" placeholder="Type a message..." bind:value={messageText} on:keypress={(e) => e.key === 'Enter' && sendMessage()} />
        <button class="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" on:click={sendMessage} disabled={sending || !messageText.trim()}>
          <Send class="size-5" />
        </button>
      </section>
    {/if}
  {/if}
</main>
