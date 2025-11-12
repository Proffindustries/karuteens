<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { user } from '$lib/stores/auth';
  import { Send, Image as ImageIcon, Eraser, Pencil, Share2 } from 'lucide-svelte';
  
  export let params: { id: string };
  let roomId = params.id;
  
  let room: any = null;
  let members: any[] = [];
  let messages: any[] = [];
  let messageText = '';
  let sending = false;
  let uploading = false;
  let subscription: any = null;
  
  // Board state
  let activeTab: 'board' | 'meeting' | 'chat' = 'board';
  let boardChannel: any = null;
  let sharedCanvas: HTMLCanvasElement | null = null;
  let sharedCtx: CanvasRenderingContext2D | null = null;
  let personalCanvas: HTMLCanvasElement | null = null;
  let personalCtx: CanvasRenderingContext2D | null = null;
  let isDrawing = false;
  let currentPath: Array<{ x: number; y: number }> = [];
  let penColor = '#1d4ed8';
  let penSize = 3;
  
  onMount(async () => {
    await loadRoom();
    await loadMembers();
    await loadMessages();
    subscribeMessages();
    setupBoardChannel();
    setupRtcChannel();
    attachCanvases();
    window.addEventListener('resize', resizeCanvases);
  });
  
  onDestroy(() => {
    if (subscription) subscription.unsubscribe();
    if (boardChannel) boardChannel.unsubscribe();
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
    boardChannel = supabase
      .channel(`study-room-${roomId}-board`)
      .on('broadcast', { event: 'draw' }, (payload: any) => {
        const stroke = payload?.payload as { color: string; size: number; points: Array<{ x: number; y: number }> };
        if (!sharedCtx || !stroke) return;
        drawStroke(sharedCtx, stroke);
      })
      .on('broadcast', { event: 'clear' }, () => {
        clearCanvas(sharedCtx);
      })
      .subscribe();
  }

  // Meeting (WebRTC) state
  let rtcChannel: any = null;
  let pc: RTCPeerConnection | null = null;
  let localStream: MediaStream | null = null;
  let remoteStream: MediaStream | null = null;

  function setupRtcChannel() {
    rtcChannel = supabase
      .channel(`study-room-${roomId}-rtc`)
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        try {
          if (payload?.from === $user?.id) return;
          await ensurePeer();
          await pc!.setRemoteDescription(payload.sdp);
          if (!localStream) {
            try {
              localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
              const lv = document.getElementById('localVideo') as HTMLVideoElement;
              if (lv && localStream) lv.srcObject = localStream;
              localStream.getTracks().forEach((t) => pc!.addTrack(t, localStream!));
            } catch (e) {
              console.error('getUserMedia failed', e);
            }
          }
          const answer = await pc!.createAnswer();
          await pc!.setLocalDescription(answer);
          rtcChannel?.send({ type: 'broadcast', event: 'answer', payload: { sdp: answer, to: payload.from, from: $user?.id } });
        } catch (err) {
          console.error('handle offer error', err);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        try {
          if (payload?.to !== $user?.id) return;
          if (!pc) return;
          await pc.setRemoteDescription(payload.sdp);
        } catch (err) {
          console.error('handle answer error', err);
        }
      })
      .on('broadcast', { event: 'candidate' }, async ({ payload }) => {
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
            <video id="remoteVideo" autoplay playsinline class="w-full rounded-lg bg-black h-[30vh]"></video>
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
