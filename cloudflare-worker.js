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
const WORKER_VERSION = 'v7.6.0';
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
  'africanews.com','pbs.org','mercopress.com'
];

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    const url = new URL(request.url);

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
