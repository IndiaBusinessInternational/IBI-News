/**
 * IBI News — RSS Proxy + Multi-Provider AI Summariser
 * Gemini Key 1 → auto-rotates to Key 2 on 429 quota exhaustion
 */

const ALLOWED_HOSTS = [
  'news.google.com','www.google.com',
  'feeds.bbci.co.uk','feeds.reuters.com',
  'economictimes.indiatimes.com','timesofindia.indiatimes.com',
  'www.thehindu.com','feeds.feedburner.com','www.ndtv.com',
  'www.aljazeera.com','rss.cnn.com',
  'techcrunch.com','feeds.techcrunch.com',
  'www.who.int','news.un.org',
  'indianexpress.com','www.livemint.com',
  'www.business-standard.com','www.aninews.in'
];

const GEMINI_MODEL = 'gemini-2.5-flash';

const PROVIDERS = {
  gemini1:  { name: 'Gemini 2.5 Flash (Key 1)', secretKey: 'GEMINI_API_KEY_1', call: callGemini },
  gemini2:  { name: 'Gemini 2.5 Flash (Key 2)', secretKey: 'GEMINI_API_KEY_2', call: callGemini },
  openai:   { name: 'ChatGPT GPT-4o mini',       secretKey: 'OPENAI_API_KEY',    call: callOpenAI },
  claude:   { name: 'Claude Haiku',               secretKey: 'CLAUDE_API_KEY',    call: callClaude  },
  deepseek: { name: 'DeepSeek Chat',              secretKey: 'DEEPSEEK_API_KEY',  call: callDeepSeek }
};

// Auto-fallback chain: if primary hits quota, try these in order
const FALLBACK_CHAIN = {
  gemini1:  ['gemini1', 'gemini2'],  // Key1 → Key2
  gemini2:  ['gemini2', 'gemini1'],  // Key2 → Key1
  openai:   ['openai'],
  claude:   ['claude'],
  deepseek: ['deepseek']
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    const url = new URL(request.url);

    if (url.pathname === '/summarise' && request.method === 'POST') {
      return handleSummarise(request, env);
    }

    const target = url.searchParams.get('url');
    if (!target) return jsonError('Missing ?url= parameter', 400);
    let targetUrl;
    try { targetUrl = new URL(target); }
    catch { return jsonError('Invalid url parameter', 400); }
    if (!ALLOWED_HOSTS.some(h => targetUrl.hostname === h || targetUrl.hostname.endsWith('.' + h))) {
      return jsonError(`Host not allowed: ${targetUrl.hostname}`, 403);
    }
    try {
      const upstream = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IBINewsBot/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        // Cache successful feeds at the edge for 5 min, but NEVER cache error
        // responses (e.g. Google's 503 "Sorry" anti-bot page) — caching those
        // would keep serving the outage even after the upstream recovers.
        cf: { cacheTtlByStatus: { '200-299': 300, '400-599': 0 }, cacheEverything: true }
      });
      const body = await upstream.text();
      const ct = upstream.headers.get('content-type') || 'application/xml; charset=utf-8';
      return new Response(body, { status: upstream.status, headers: { ...corsHeaders(), 'Content-Type': ct, 'Cache-Control': 'public, max-age=300' } });
    } catch (e) {
      return jsonError('Upstream fetch failed: ' + e.message, 502);
    }
  }
};

async function handleSummarise(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return jsonError('Invalid JSON body', 400); }

  const { headlines = [], section = 'News', provider = 'gemini1' } = body;
  if (!headlines.length) return jsonError('No headlines provided', 400);

  const prompt = buildPrompt(section, headlines);
  const chain = FALLBACK_CHAIN[provider] || [provider];

  let lastError = '';
  for (const pKey of chain) {
    const cfg = PROVIDERS[pKey];
    if (!cfg) continue;
    const apiKey = env[cfg.secretKey];
    if (!apiKey) { lastError = `${cfg.secretKey} not set`; continue; }

    try {
      const result = await cfg.call(apiKey, prompt);
      if (!Array.isArray(result.summary)) throw new Error('Bad format');
      // Tell client which key actually served (useful for debugging)
      result._provider = cfg.name;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    } catch (e) {
      lastError = `${cfg.name}: ${e.message.substring(0, 200)}`;
      // Only retry on quota/rate errors — stop on auth or format errors
      const isQuota = e.message.includes('429') || e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('quota');
      if (!isQuota) break;
      // else: quota error → continue to next key in chain
    }
  }
  return jsonError(lastError || 'All providers failed', 500);
}

function buildPrompt(section, headlines) {
  return `You are a senior news analyst for IBI News (India Business International).
Analyse these ${section} news items and write a crisp 5-point executive summary.
Rules: Exactly 5 lines. English only. Each line = one key insight (max 25 words). Neutral, factual. No repetition.

News items:
${headlines.map((h, i) => `${i + 1}. "${h.title}" — ${h.source}`).join('\n')}

Respond ONLY with valid JSON (no markdown):
{"summary":["Line 1.","Line 2.","Line 3.","Line 4.","Line 5."],"references":["Source 1","Source 2","Source 3"]}`;
}

async function callGemini(apiKey, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      // gemini-2.5-flash is a "thinking" model: thinking tokens count against
      // maxOutputTokens, so a low cap (500) was being consumed by thinking and the
      // JSON came back truncated ("Unterminated string in JSON"). Disable thinking
      // for this simple JSON task and give the output ample room.
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } }) }
  );
  if (!res.ok) { const e = await res.text(); throw new Error(e.substring(0, 300)); }
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

async function callOpenAI(apiKey, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 500, temperature: 0.2, response_format: { type: 'json_object' } })
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e.substring(0, 300)); }
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

async function callClaude(apiKey, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e.substring(0, 300)); }
  const data = await res.json();
  return JSON.parse((data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim());
}

async function callDeepSeek(apiKey, prompt) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      // 'deepseek-chat' was retired on 2026-07-24 — calls naming it now fail.
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      // Non-thinking mode. v4 defaults to THINKING at high effort, and its
      // reasoning tokens are drawn from this same 500-token budget — so with it
      // on, the call can spend the whole allowance reasoning and come back with
      // no content. Scoring a headline for relevance needs no reasoning pass.
      thinking: { type: 'disabled' }
    })
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e.substring(0, 300)); }
  const data = await res.json();
  return JSON.parse((data.choices?.[0]?.message?.content || '{}').replace(/```json|```/g, '').trim());
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function jsonError(msg, status) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } });
}
