import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

function parseHumanTokens(name?: string): number | null {
  if (!name) return null;
  // Matches like "4.24B", "3.1M", "250K" optionally followed by ' tokens'
  const m = name.match(/([0-9]+(?:\.[0-9]+)?)([KMB])\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  const mult = unit === 'B' ? 1e9 : unit === 'M' ? 1e6 : 1e3;
  return n * mult;
}

async function fetchWithRetry(input: string, init: RequestInit, attempts = 3, timeoutMs = 15000): Promise<Response> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(input, { ...init, signal: ctrl.signal });
      clearTimeout(id);
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

function isVisionCapable(m: any): boolean {
  const hay = `${m?.name || ''} ${m?.id || ''} ${m?.description || ''}`.toLowerCase();
  // Heuristics for common open vision model names
  const keys = [
    'vision', 'vl', '4o', '4.1', 'gpt-4o', 'qwen-vl', 'qwen2.5-vl', 'llava', 'llava-v', 'minicpm-v', 'phi-3.5-vision', 'phi-vision', 'grok-vision', 'yi-vl', 'paligemma', 'internvl', 'blip'
  ];
  return keys.some(k => hay.includes(k));
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const apiKey = env.OPENROUTER_API_KEY;
    const res = await fetchWithRetry('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        'HTTP-Referer': url.origin,
        'X-Title': 'KaruTeens'
      }
    });

    const text = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'failed_to_fetch_models', details: text }), { status: 500 });
    }

    let data: any;
    try { data = JSON.parse(text); } catch {
      return new Response(JSON.stringify({ error: 'invalid_json', details: text?.slice(0, 500) }), { status: 500 });
    }

    const models = Array.isArray(data.data) ? data.data : [];

    // Filter likely-free models: pricing prompt/completion 0 or missing pricing
    const free = models.filter((m: any) => {
      const p = m.pricing || {};
      const prompt = p.prompt ?? 0;
      const completion = p.completion ?? 0;
      return Number(prompt) === 0 && Number(completion) === 0;
    });

    // Sort by human-visible token count inside name like "4.24B tokens"; fallback to context_length
    free.sort((a: any, b: any) => {
      const ta = parseHumanTokens(a.name) ?? (a.context_length ?? 0);
      const tb = parseHumanTokens(b.name) ?? (b.context_length ?? 0);
      return tb - ta;
    });

    // Map minimal fields for client (id, name, and vision flag)
    const mapped = free.map((m: any) => ({ id: m.id, name: m.name ?? m.id, vision: isVisionCapable(m) }));

    if (mapped.length === 0) {
      const fallback = [{ id: 'openrouter/auto', name: 'OpenRouter Auto' }];
      return new Response(JSON.stringify({ models: fallback, source: 'fallback' }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ models: mapped }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'models_error', message: e?.message || String(e) }), { status: 500 });
  }
};
