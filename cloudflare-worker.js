/**
 * IBI News RSS Proxy — Cloudflare Worker
 * ----------------------------------------
 * Free 100,000 requests/day on Cloudflare's global network.
 * No rate limits, no third-party trust, fast everywhere.
 *
 * USAGE: ?url=<TARGET_URL>
 * Example: https://ibi-news-proxy.YOUR-ACCOUNT.workers.dev/?url=https%3A%2F%2Fnews.google.com%2Frss
 *
 * SECURITY: Only allows fetching from a hard-coded allowlist of news domains
 * so this Worker can't be abused to proxy arbitrary websites.
 */

// Domains that this proxy is allowed to fetch from. Add more if needed.
const ALLOWED_HOSTS = [
  // Google News (for location-specific search queries)
  'news.google.com',
  'www.google.com',
  // BBC News — Breaking, World, Business, Health, Science
  'feeds.bbci.co.uk',
  // Reuters
  'feeds.reuters.com',
  // Economic Times — Indian Markets
  'economictimes.indiatimes.com',
  // Times of India
  'timesofindia.indiatimes.com',
  // The Hindu
  'www.thehindu.com',
  // NDTV
  'feeds.feedburner.com',
  'www.ndtv.com',
  // TechCrunch — Technology & AI
  'techcrunch.com',
  'feeds.techcrunch.com',
  // CNN
  'rss.cnn.com',
  // Al Jazeera
  'www.aljazeera.com'
];

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return jsonError('Missing ?url= parameter', 400);
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch (e) {
      return jsonError('Invalid url parameter', 400);
    }

    // Allowlist check — only news domains
    if (!ALLOWED_HOSTS.some(host => targetUrl.hostname === host || targetUrl.hostname.endsWith('.' + host))) {
      return jsonError(`Host not allowed: ${targetUrl.hostname}`, 403);
    }

    // Fetch the upstream feed
    try {
      const upstream = await fetch(target, {
        headers: {
          // Some feeds give better/different output to a real browser UA
          'User-Agent': 'Mozilla/5.0 (compatible; IBINewsBot/1.0; +https://indiabusinessinternational.online)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        cf: {
          // Cache on Cloudflare edge for 5 minutes — saves Worker invocations
          // and gives users near-instant responses for popular feeds
          cacheTtl: 300,
          cacheEverything: true
        }
      });

      const body = await upstream.text();
      const contentType = upstream.headers.get('content-type') || 'application/xml; charset=utf-8';

      return new Response(body, {
        status: upstream.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300',
          'X-Proxy-By': 'IBI-News-Worker'
        }
      });
    } catch (e) {
      return jsonError('Upstream fetch failed: ' + e.message, 502);
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
  });
}
