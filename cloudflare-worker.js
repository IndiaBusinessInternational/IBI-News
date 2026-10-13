/**
 * IBI News — RSS Proxy
 * v7.5 (13 Oct 2026): the AI summariser and every AI key were removed (CEO: "Delete all API keys").
 * Section summaries are now written by IBI's own AI on the office laptop (gateway /news/summary).
 */

/* ⚠ BUMP THESE TWO WHENEVER YOU EDIT THIS FILE.
   This Worker is deployed by hand from the Cloudflare dashboard, and nothing
   about a running Worker tells you which build is live — the RSS path answers
   identically on every version, so a smoke test proves it is alive, not that
   your new code shipped. GET /version reports these, so confirming a deploy
   is opening one URL instead of comparing version IDs in the dashboard. */
const WORKER_VERSION = 'v7.8.0';
const WORKER_BUILT   = '2026-10-13';

// NOTE: matching is `hostname === h || hostname.endsWith('.' + h)`, so a bare
// domain here also covers every subdomain of it.
//
// Verified 14 Aug 2026 — do not bother re-adding these, they have no public RSS:
//   feeds.reuters.com  → DNS no longer resolves; Reuters retired RSS in 2020
//   www.aninews.in     → 404 on every RSS path, no <link rel=alternate> anywhere
//   ptinews.com        → HTML app shell only; PTI is a subscription wire
//   rss.cnn.com        → ZOMBIE: answers 200 with 50-69 items whose newest pubDate
//                        is from 2022-2023. Kept in the list only so a future
//                        reader sees this note; nothing points at it any more.
//   moneycontrol       → same zombie pattern, newest item ~2.3 years old
const ALLOWED_HOSTS = [
  'news.google.com','www.google.com',
  'feeds.bbci.co.uk',
  'economictimes.indiatimes.com','timesofindia.indiatimes.com',
  'www.thehindu.com','feeds.feedburner.com','www.ndtv.com',
  'www.aljazeera.com','rss.cnn.com',
  'techcrunch.com','feeds.techcrunch.com',
  'www.who.int','news.un.org',
  'indianexpress.com','www.livemint.com',
  'www.business-standard.com',
  // added v7.3 — mainstream broadcasters/dailies, each verified to be publishing
  // within the last 24h on 14 Aug 2026 (not just returning HTTP 200)
  'theguardian.com','feeds.abcnews.com','abcnews.go.com',
  'www.hindustantimes.com',
  'feeds.npr.org','feeds.skynews.com',
  // added v7.6 (13 Oct 2026, CEO: "reliable news sources worldwide, including from China and Russia") —
  // each probed live that day: HTTP 200, 10-100 items, newest story < 24 h (CGTN 12.5 h; the rest < 5 h).
  // China: CGTN + Global Times (state media, labelled on the page), SCMP (Hong Kong, independent).
  // Russia: TASS, RT, Sputnik (state media, labelled), The Moscow Times + Meduza (independent).
  'cgtn.com','globaltimes.cn','scmp.com',
  'tass.com','rt.com','sputnikglobe.com','themoscowtimes.com','meduza.io',
  'dw.com','france24.com','euronews.com',
  'japantimes.co.jp','channelnewsasia.com','straitstimes.com','abc.net.au',
  'africanews.com','pbs.org','mercopress.com',
  // added v7.8 (13 Oct 2026, CEO: "all news should be fully read by anyone") - free-to-read replacements
  // for The Hindu / SCMP / The Japan Times, each probed free (no paywall marker) and fresh that day.
  'hongkongfp.com','thefederal.com','businesstoday.in','mongabay.com'
];

/* v7.8 - FREE-TO-READ CHECK. Publishers that mix free and subscriber-only articles mark the paid ones
   for Google with schema.org "isAccessibleForFree": false. GET /free?url=<article> opens the article once
   and answers {free:true|false}; the answer is kept at the edge for a day, so each article is fetched at
   most once a day however many readers see it. Only these hosts may be checked. */
const FREE_CHECK_HOSTS = ['indianexpress.com','timesofindia.indiatimes.com','straitstimes.com','hindustantimes.com','livemint.com'];

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    const url = new URL(request.url);

    if (url.pathname === '/free') {
      const target = url.searchParams.get('url') || '';
      let t;
      try { t = new URL(target); } catch { return jsonError('Invalid url parameter', 400); }
      if (t.protocol !== 'https:' || !FREE_CHECK_HOSTS.some(h => t.hostname === h || t.hostname.endsWith('.' + h))) {
        return jsonError('Host not checked: ' + t.hostname, 403);
      }
      const key = new Request('https://free-check.ibi-news.invalid/' + encodeURIComponent(t.href));
      const cache = caches.default;
      const hit = await cache.match(key);
      if (hit) return hit;
      let free = true, status = 0;
      try {
        const r = await fetch(t.href, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept': 'text/html' } });
        status = r.status;
        const html = (await r.text()).slice(0, 3000000);
        free = !/"isAccessibleForFree"\s*:\s*"?false"?/i.test(html);
      } catch (e) { free = true; status = -1; }   // unreachable article: not proven paid, so not hidden
      const res = new Response(JSON.stringify({ free, status }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' }
      });
      if (ctx && status > 0) ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    }

    // GET /version — "which build is actually live?" (v7.5: this Worker holds no AI keys at all)
    if (url.pathname === '/version') {
      return new Response(JSON.stringify({
        worker:       'ibi-news-proxy',
        version:      WORKER_VERSION,
        built:        WORKER_BUILT,
        allowedHosts: ALLOWED_HOSTS.length,
        aiKeys:       'none'
      }, null, 2), {
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
          // Never cache this one — a stale answer would defeat its whole
          // purpose, and the feed path above deliberately caches at the edge.
          'Cache-Control': 'no-store'
        }
      });
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

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function jsonError(msg, status) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } });
}
