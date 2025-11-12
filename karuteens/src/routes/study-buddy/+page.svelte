<script lang="ts">
  import { onMount, afterUpdate, tick } from 'svelte';

  type Msg = { role: 'user' | 'assistant'; content: string; meta?: { usage?: any; elapsedMs?: number; images?: string[] } };
  type Model = { id: string; name: string; context_length: number | null; vision?: boolean };

  let prompt = '';
  let messages: Msg[] = [];
  let models: Model[] = [];
  let model = '';
  let loading = false;
  let error = '';
  let lastFailedIndex: number | null = null;
  let listEl: HTMLElement | null = null;
  let toast = '';
  let toastVisible = false;
  let mouthOn = false;
  let hljsReady = false;
  let images: string[] = [];
  let fileEl: HTMLInputElement | null = null;
  let showModels = false;
  let rateLimitSeconds = 0;
  let rateTimer: any = null;
  const MAX_IMAGES = 3;
  const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // ~4MB
  const MAX_DIM = 1280;
  const JPEG_QUALITY = 0.7;
  const expertiseHints: Record<string, string> = {
    venice: 'Reasoning • Generalist',
    deepseek: 'Math • Reasoning',
    minimax: 'Long context • Summarization',
    llama: 'Open weights • Generalist',
    qwen: 'Coding • Reasoning',
    mixtral: 'Speed • Generalist'
  };
  function modelExpertise(name: string): string | null {
    const n = name.toLowerCase();
    for (const key of Object.keys(expertiseHints)) {
      if (n.includes(key)) return expertiseHints[key];
    }
    return null;
  }

  type Block = { kind: 'code'; lang: string | null; code: string } | { kind: 'text'; parts: Array<{ t: string; code?: boolean }> };
  function parseContent(s: string): Block[] {
    const blocks: Block[] = [];
    const fence = /```([a-zA-Z0-9+-_]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = fence.exec(s)) !== null) {
      const before = s.slice(lastIndex, m.index);
      if (before.trim().length) blocks.push({ kind: 'text', parts: splitInlineCode(before) });
      const lang = m[1] ? m[1] : null;
      const code = m[2].replace(/\n+$/,'');
      blocks.push({ kind: 'code', lang, code });
      lastIndex = fence.lastIndex;
    }
    const tail = s.slice(lastIndex);
    if (tail.trim().length) blocks.push({ kind: 'text', parts: splitInlineCode(tail) });
    return blocks;
  }
  function splitInlineCode(text: string): Array<{ t: string; code?: boolean }> {
    const parts: Array<{ t: string; code?: boolean }> = [];
    const re = /`([^`]+)`/g;
    let last = 0; let mm: RegExpExecArray | null;
    while ((mm = re.exec(text)) !== null) {
      if (mm.index > last) parts.push({ t: text.slice(last, mm.index) });
      parts.push({ t: mm[1], code: true });
      last = re.lastIndex;
    }
    if (last < text.length) parts.push({ t: text.slice(last) });
    return parts;
  }
  async function copyText(s: string) {
    try {
      await navigator.clipboard.writeText(s);
      showToast('Copied to clipboard');
    } catch {
      showToast('Copy failed');
    }
  }
  function collectAllCode(blocks: Block[]): string {
    return blocks.filter(b => b.kind === 'code').map(b => (b as any).code).join('\n\n');
  }
  function smoothScrollToBottom(duration = 6750) {
    if (!listEl) return;
    const start = listEl.scrollTop;
    const end = listEl.scrollHeight - listEl.clientHeight;
    const dist = end - start;
    const startTime = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; // easeInOut
      listEl!.scrollTop = start + dist * eased;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function showToast(msg: string) {
    toast = msg;
    toastVisible = true;
    setTimeout(() => { toastVisible = false; }, 1600);
  }

  function startRateCountdown(ms: number) {
    if (!ms || ms < 0) ms = 3000;
    if (rateTimer) clearInterval(rateTimer);
    rateLimitSeconds = Math.max(1, Math.ceil(ms / 1000));
    rateTimer = setInterval(() => {
      rateLimitSeconds = Math.max(0, rateLimitSeconds - 1);
      if (rateLimitSeconds === 0) {
        clearInterval(rateTimer);
        rateTimer = null;
      }
    }, 1000);
  }

  async function onPickImages(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files; if (!files) return;
    const chosen = Array.from(files).filter(f => f.type.startsWith('image/'));
    const compressed: string[] = [];
    for (const f of chosen) {
      try {
        const url = await compressToDataUrl(f, MAX_DIM, JPEG_QUALITY);
        compressed.push(url);
      } catch {}
    }
    // Merge and cap by count
    images = [...images, ...compressed].slice(0, MAX_IMAGES);
    // Cap by total size
    while (totalBytes(images) > MAX_TOTAL_BYTES && images.length > 0) {
      images.pop();
    }
    if (fileEl) fileEl.value = '';
    const mb = (totalBytes(images) / (1024*1024)).toFixed(2);
    showToast(`${images.length} image${images.length===1?'':'s'} • ${mb} MB`);
  }

  function totalBytes(urls: string[]): number {
    let sum = 0;
    for (const u of urls) {
      const i = u.indexOf('base64,');
      const b64 = i >= 0 ? u.slice(i + 7) : '';
      sum += Math.floor(b64.length * 0.75);
    }
    return sum;
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function compressToDataUrl(file: File, maxDim: number, quality: number): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const img = await loadImage(dataUrl);
    const { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  }

  onMount(async () => {
    // Load highlight.js theme and script once on client
    try {
      const themeId = 'hljs-theme-dark';
      if (!document.getElementById(themeId)) {
        const link = document.createElement('link');
        link.id = themeId;
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
        document.head.appendChild(link);
      }
      if (!(window as any).hljs) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
          s.onload = () => resolve();
          s.onerror = () => reject();
          document.body.appendChild(s);
        });

  afterUpdate(() => {
    try {
      if (hljsReady && typeof window !== 'undefined') {
        document.querySelectorAll('pre code').forEach((el) => {
          (window as any).hljs?.highlightElement(el as HTMLElement);
        });
      }
    } catch {}
  });
      }
      hljsReady = !!(window as any).hljs;
    } catch {}
    try {
      const r = await fetch('/api/models');
      const j = await r.json();
      models = (j.models || []) as Model[];
      // Reorder so preferred defaults are first: venice, deepseek, minimax
      const priority = ['venice', 'deepseek', 'minimax'];
      models.sort((a, b) => {
        const ai = priority.findIndex((p) => a.name.toLowerCase().includes(p));
        const bi = priority.findIndex((p) => b.name.toLowerCase().includes(p));
        const av = ai === -1 ? Infinity : ai;
        const bv = bi === -1 ? Infinity : bi;
        if (av !== bv) return av - bv;
        return 0;
      });
      const saved = localStorage.getItem('studyModel');
      if (saved && models.find((m) => m.id === saved)) {
        model = saved;
      } else if (models.length) {
        model = models[0].id; // default to venice if present
      }
    } catch (e) {
      error = 'Failed to load models';
    }
  });

  function eatPrompt() {
    if (!prompt) return;
    mouthOn = true;
    const original = prompt;
    const steps = Math.min(24, Math.max(8, Math.ceil(original.length / 12)));
    let i = 0;
    const timer = setInterval(() => {
      i++;
      const remain = Math.max(0, original.length - Math.ceil((original.length * i) / steps));
      prompt = original.slice(0, remain);
      if (i >= steps) {
        clearInterval(timer);
        mouthOn = false;
        prompt = '';
      }
    }, 20);
  }

  async function ask() {
    if (!prompt.trim() || !model) return;
    const toSend = prompt;
    const user: Msg = { role: 'user', content: toSend, meta: images.length ? { images: [...images] } : undefined };
    messages = [...messages, user];
    loading = true;
    error = '';
    lastFailedIndex = null;
    eatPrompt();
    try {
      let sendImages: string[] | undefined = undefined;
      if (images.length) {
        try {
          const up = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images }) });
          const uj = await up.json();
          if (!up.ok || uj.error) throw new Error(uj.error || 'Upload failed');
          sendImages = uj.urls as string[];
        } catch (ue: any) {
          showToast('Image upload failed');
          sendImages = undefined;
        }
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, images: sendImages ?? images })
      });
      const j = await res.json();
      if (!res.ok || j.error) {
        if (res.status === 429 || j.error === 'rate_limited') {
          const waitMs = Number(j.retry_after_ms) > 0 ? Number(j.retry_after_ms) : 3500;
          startRateCountdown(waitMs);
          await new Promise((r) => setTimeout(r, waitMs));
          // Retry once after countdown
          const resRL = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, images: sendImages ?? images })
          });
          const jRL = await resRL.json();
          if (!resRL.ok || jRL.error) throw new Error(jRL.error || 'Chat error');
          const contentRL = jRL.content || '';
          messages = [...messages, { role: 'assistant', content: contentRL, meta: { usage: jRL.usage, elapsedMs: jRL.elapsedMs } }];
          await tick();
          smoothScrollToBottom();
          images = [];
          return;
        }
        throw new Error(j.error || 'Chat error');
      }
      const content = j.content || '';
      messages = [...messages, { role: 'assistant', content, meta: { usage: j.usage, elapsedMs: j.elapsedMs } }];
      await tick();
      smoothScrollToBottom();
      images = [];
    } catch (e: any) {
      // One auto-retry before marking as failed
      try {
        let sendImages2: string[] | undefined = undefined;
        if (images.length) {
          try {
            const up2 = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images }) });
            const uj2 = await up2.json();
            if (!up2.ok || uj2.error) throw new Error(uj2.error || 'Upload failed');
            sendImages2 = uj2.urls as string[];
          } catch {}
        }
        // Slight delay before second try to avoid hammering
        await new Promise((r) => setTimeout(r, 1500));
        const res2 = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, images: sendImages2 ?? images })
        });
        const j2 = await res2.json();
        if (!res2.ok || j2.error) {
          if (res2.status === 429 || j2.error === 'rate_limited') {
            const waitMs2 = Number(j2.retry_after_ms) > 0 ? Number(j2.retry_after_ms) : 4000;
            startRateCountdown(waitMs2);
            await new Promise((r) => setTimeout(r, waitMs2));
            const res3 = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model, messages, images: sendImages2 ?? images })
            });
            const j3 = await res3.json();
            if (!res3.ok || j3.error) throw new Error(j3.error || 'Chat error');
            const content3 = j3.content || '';
            messages = [...messages, { role: 'assistant', content: content3, meta: { usage: j3.usage, elapsedMs: j3.elapsedMs } }];
            await tick();
            smoothScrollToBottom();
            return;
          }
          throw new Error(j2.error || 'Chat error');
        }
        const content2 = j2.content || '';
        messages = [...messages, { role: 'assistant', content: content2, meta: { usage: j2.usage, elapsedMs: j2.elapsedMs } }];
        await tick();
        smoothScrollToBottom();
        return;
      } catch (ee: any) {
        error = ee?.message || e?.message || 'Something went wrong';
        messages = [...messages, { role: 'assistant', content: '(failed to respond)' }];
        lastFailedIndex = messages.length - 1;
      }
    } finally {
      loading = false;
    }
  }

  function selectModel(v: string) {
    model = v;
    localStorage.setItem('studyModel', model);
  }

  async function retryLast() {
    if (lastFailedIndex == null) return;
    // remove the failed placeholder
    messages = messages.slice(0, lastFailedIndex);
    lastFailedIndex = null;
    // re-ask with same history
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, images })
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || 'Chat error');
      const content = j.content || '';
      messages = [...messages, { role: 'assistant', content }];
      await tick();
      smoothScrollToBottom();
    } catch (e: any) {
      error = e?.message || 'Something went wrong';
      messages = [...messages, { role: 'assistant', content: '(failed to respond again)' }];
      lastFailedIndex = messages.length - 1;
    } finally {
      loading = false;
    }
  }

  function resetConversation() {
    messages = [];
    error = '';
    lastFailedIndex = null;
    prompt = '';
  }
</script>

<main class="min-h-[100svh] bg-neutral-950 text-neutral-50">
  <div class="max-w-screen-sm mx-auto h-[100svh] flex flex-col">
    <header class="px-4 py-3"><h1 class="text-lg font-semibold">AI Study Buddy</h1></header>
    <section class="flex-1 overflow-y-auto px-4 space-y-2" bind:this={listEl}>
      {#each messages as m, i}
        {#if m.role === 'assistant'}
          <div class="flex">
            <div class="relative max-w-[85%] rounded-2xl rounded-tl-md bg-neutral-800 px-3 py-2 text-sm whitespace-pre-wrap break-words">
              {#each parseContent(m.content) as b}
                {#if b.kind === 'code'}
                  <div class="group relative mt-2">
                    <pre class="rounded-md bg-neutral-900/90 border border-neutral-700 overflow-x-auto p-3 text-xs"><code class={b.lang ? `language-${b.lang}` : ''}>{b.code}</code></pre>
                    <button class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition rounded-md border border-neutral-700 bg-neutral-900/80 px-2 py-1 text-[10px]" on:click={() => copyText(b.code)}>Copy code</button>
                  </div>
                {:else}
                  <p>{#each b.parts as p}{#if p.code}<code class="px-1 rounded bg-neutral-900/60 border border-neutral-700">{p.t}</code>{:else}{p.t}{/if}{/each}</p>
                {/if}
              {/each}
              {#if m.meta?.elapsedMs || m.meta?.usage}
                <div class="mt-2 text-[10px] text-neutral-400">
                  {#if m.meta?.elapsedMs}<span>{Math.round(m.meta.elapsedMs)} ms</span>{/if}
                  {#if m.meta?.usage}
                    {#if m.meta.usage.total_tokens != null}
                      <span> • {m.meta.usage.total_tokens} tokens</span>
                    {:else}
                      <span> • {m.meta.usage.prompt_tokens ?? '?'} in / {m.meta.usage.completion_tokens ?? '?'} out</span>
                    {/if}
                  {/if}
                </div>
              {/if}
              <div class="mt-2 flex gap-2 text-[10px] text-neutral-400">
                <button class="rounded-md border border-neutral-700 px-2 py-1" on:click={() => copyText(m.content)}>Copy all</button>
                {#if parseContent(m.content).some(b => b.kind==='code')}
                  <button class="rounded-md border border-neutral-700 px-2 py-1" on:click={() => copyText(collectAllCode(parseContent(m.content)))}>Copy codes</button>
                {/if}
              </div>
              {#if lastFailedIndex === i}
                <div class="mt-2 flex gap-2 text-xs text-neutral-400">
                  <button class="rounded-md border border-neutral-700 px-2 py-1" on:click={retryLast} disabled={loading}>Retry</button>
                  {#if loading}<span>Retrying…</span>{/if}
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="flex justify-end">
            <div class="max-w-[85%] rounded-2xl rounded-tr-md bg-blue-600 text-white px-3 py-2 text-sm whitespace-pre-wrap break-words">
              {m.content}
              {#if m.meta?.images?.length}
                <div class="mt-2 flex gap-2 flex-wrap">
                  {#each m.meta.images as img}
                    <img src={img} alt="uploaded" class="h-16 w-16 object-cover rounded border border-white/20" />
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
      {#if loading}
        <div class="flex">
          <div class="mt-1 inline-flex gap-1 text-neutral-400 text-xs px-2 py-1">Typing<span class="animate-pulse">…</span></div>
        </div>
      {/if}
    </section>
    {#if error}
      <div class="px-4 py-1 text-xs text-red-400">{error}</div>
    {/if}
    <footer class="sticky bottom-0 px-4 py-3 bg-neutral-950 border-t border-neutral-800">
      <div class="flex items-end gap-2">
        <div class="relative flex-1">
          <textarea rows={3} bind:value={prompt} class="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-3 text-base pr-36" placeholder="Ask a question..." on:keydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}></textarea>
          <!-- Inline controls inside the input on the right -->
          <div class="absolute right-2 bottom-2 flex items-center gap-2">
            <div class="relative">
              <button class="rounded-md border border-neutral-700 p-2 text-neutral-200 hover:bg-neutral-800" on:click={() => showModels = !showModels} aria-expanded={showModels} aria-label="Select model">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="6" rx="2" stroke="currentColor" stroke-width="2"/>
                  <rect x="3" y="14" width="18" height="6" rx="2" stroke="currentColor" stroke-width="2"/>
                  <circle cx="8" cy="7" r="1" fill="currentColor"/>
                  <circle cx="8" cy="17" r="1" fill="currentColor"/>
                </svg>
              </button>
              {#if showModels}
                <div class="absolute bottom-10 right-0 z-30 w-64 max-h-60 overflow-auto rounded-md border border-neutral-700 bg-neutral-900 shadow">
                  {#if models.length === 0}
                    <div class="px-3 py-2 text-xs text-neutral-400">Loading…</div>
                  {:else}
                    {#each models as m}
                      <button class="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-800 text-left {m.id===model ? 'bg-neutral-800' : ''}" on:click={() => { selectModel(m.id); showModels = false; }}>
                        <span class="truncate">{m.name}</span>
                        <span class="ml-2 text-[10px] text-neutral-400">{m.vision ? 'Vision' : ''}</span>
                      </button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
            {#if models.find(mm => mm.id === model)?.vision}
              <div class="flex items-center">
                <input class="hidden" bind:this={fileEl} type="file" accept="image/*" multiple on:change={onPickImages} />
                <button class="rounded-md border border-neutral-700 p-2 text-neutral-200 hover:bg-neutral-800" on:click={() => fileEl?.click()} title="Upload images" aria-label="Upload images">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H12M13.5 3L19 8.625M13.5 3V7.625C13.5 8.17728 13.9477 8.625 14.5 8.625H19M19 8.625V11.8125" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M17.5 21L17.5 15M17.5 15L20 17.5M17.5 15L15 17.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            {/if}
            {#if images.length}
              <div class="text-[10px] text-neutral-400">{images.length}/{MAX_IMAGES} • {(totalBytes(images)/(1024*1024)).toFixed(2)} MB</div>
            {/if}
            {#if mouthOn}
              <div class="pointer-events-none h-6 w-8">
                <div class="mouth h-full w-full">
                  <div class="top"></div>
                  <div class="bottom"></div>
                </div>
              </div>
            {/if}
          </div>
        </div>
        <button class="rounded-md bg-blue-600 text-white px-4 py-3 text-sm disabled:opacity-50" on:click={ask} disabled={loading || !model}>Send</button>
      </div>
      {#if toastVisible}
        <div class="absolute right-4 -top-2 translate-y-[-100%] rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-xs text-neutral-100 shadow">{toast}</div>
      {/if}
    </footer>
  </div>
</main>

<style>
  .mouth { position: relative; }
  .mouth .top, .mouth .bottom {
    position: absolute;
    left: 0; right: 0;
    height: 50%;
    background: #111827; /* neutral-900 */
    border: 1px solid #374151; /* neutral-700 */
    border-radius: 10px;
    transition: transform 120ms ease;
  }
  .mouth .top { top: 0; border-bottom: none; border-top-left-radius: 12px; border-top-right-radius: 12px; transform-origin: bottom; animation: mouthTop 420ms ease-in-out infinite alternate; }
  .mouth .bottom { bottom: 0; border-top: none; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; transform-origin: top; animation: mouthBottom 420ms ease-in-out infinite alternate; }
  @keyframes mouthTop { from { transform: translateY(0); } to { transform: translateY(-2px); } }
  @keyframes mouthBottom { from { transform: translateY(0); } to { transform: translateY(2px); } }
</style>
