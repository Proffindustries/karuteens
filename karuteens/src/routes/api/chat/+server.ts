import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const lastCall = new Map<string, number>();
const THROTTLE_MS = 2500;

function genId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function fetchWithRetry(input: string, init: RequestInit, attempts = 7, timeoutMs = 25000): Promise<Response> {
  let lastErr: any;
  let lastRateLimitMs: number | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(input, { ...init, signal: ctrl.signal });
      clearTimeout(id);
      if (!res.ok) {
        // Handle rate limiting with Retry-After
        if (res.status === 429) {
          const ra = res.headers.get('retry-after');
          let waitMs = 0;
          if (ra) {
            const sec = Number(ra);
            if (!Number.isNaN(sec) && sec > 0) waitMs = sec * 1000;
            else {
              const d = Date.parse(ra);
              if (!Number.isNaN(d)) waitMs = Math.max(0, d - Date.now());
            }
          }
          // fallback exponential backoff with jitter if header missing
          if (!waitMs) waitMs = Math.min(10000, 500 * (i + 1)) + Math.random() * 300;
          lastRateLimitMs = waitMs;
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        const txt = await res.text().catch(() => '');
        // Return non-retryable errors to caller
        return new Response(txt || '', { status: res.status, headers: res.headers });
      }
      return res;
    } catch (e) {
      lastErr = e;
      const jitter = Math.random() * 200;
      await new Promise((r) => setTimeout(r, 500 * (i + 1) + jitter));
    }
  }
  if (lastRateLimitMs != null) {
    return new Response(JSON.stringify({ error: 'rate_limited', retry_after_ms: lastRateLimitMs }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }
  throw lastErr;
}

function cleanContent(raw: string): string {
  let s = raw ?? '';
  // Keep code fences and inline code; we'll render on client
  // Bold/italic markers
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/_([^_]+)_/g, '$1');
  // Headings: strip leading #'s but keep text
  s = s.replace(/^#{1,6}\s+/gm, '');
  // Unordered list markers: convert to dot bullets; keep ordered lists as-is
  s = s.replace(/^\s*[-*+]\s+/gm, '• ');
  // Excess spaces/newlines
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

export const POST: RequestHandler = async ({ request, url, cookies }) => {
  try {
    // Per-user throttle via cookie id
    let uid = cookies.get('kt_uid');
    if (!uid) {
      uid = genId();
      cookies.set('kt_uid', uid, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    }
    const now = Date.now();
    const last = lastCall.get(uid) || 0;
    if (now - last < THROTTLE_MS) {
      const waitMs = THROTTLE_MS - (now - last);
      return new Response(JSON.stringify({ error: 'rate_limited', retry_after_ms: waitMs, source: 'throttle' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
    lastCall.set(uid, now);

    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'missing_api_key' }), { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { model, messages, images } = body as { model?: string; messages?: any[]; images?: string[] };

    if (!model || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'invalid_request', details: 'Provide model and messages[]' }), { status: 400 });
    }

    // Transform messages if images provided: attach to last user message
    let outMessages = messages;
    try {
      if (Array.isArray(images) && images.length > 0 && Array.isArray(messages) && messages.length > 0) {
        const lastIdx = messages.length - 1;
        const last = messages[lastIdx] || {};
        if (last.role === 'user') {
          const text = typeof last.content === 'string' ? last.content : '';
          const parts: any[] = [];
          if (text) parts.push({ type: 'text', text });
          for (const url of images) {
            if (typeof url !== 'string') continue;
            if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
              parts.push({ type: 'image_url', image_url: { url } });
            }
          }
          const patched = { role: 'user', content: parts } as any;
          outMessages = [...messages.slice(0, lastIdx), patched, ...messages.slice(lastIdx + 1)];
        }
      }
    } catch {}

    const started = Date.now();
    const res = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'identity',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': url.origin,
        'X-Title': 'KaruTeens'
      },
      body: JSON.stringify({ model, messages: outMessages, stream: false })
    }, 5, Array.isArray(images) && images.length > 0 ? 35000 : 25000);

    const text = await res.text();
    if (!res.ok) {
      if (res.status === 429) {
        // pass through rate limit info if present
        try {
          const j = JSON.parse(text);
          return new Response(JSON.stringify({ error: 'rate_limited', retry_after_ms: j.retry_after_ms ?? null, details: j }), { status: 429 });
        } catch {
          return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
        }
      }
      return new Response(JSON.stringify({ error: 'openrouter_error', details: text }), { status: res.status });
    }

    let data: any;
    try { data = JSON.parse(text); } catch (e) {
      // Retry once more on invalid JSON by recursively calling (bounded by attempts above)
      if (/protocol error|incomplete envelope|connection reset/i.test(text || '')) {
        throw new Error('protocol error');
      }
      return new Response(JSON.stringify({ error: 'invalid_json', details: text?.slice(0, 500) }), { status: 500 });
    }

    const contentRaw = data?.choices?.[0]?.message?.content ?? '';
    const content = cleanContent(contentRaw);
    const usage = data?.usage || data?.choices?.[0]?.usage || null;
    const elapsedMs = Date.now() - started;
    return new Response(JSON.stringify({ content, usage, elapsedMs, raw: data }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'chat_error', message: e?.message || String(e) }), { status: 500 });
  }
};
