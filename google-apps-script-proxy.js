/**
 * IBI News — Google Apps Script RSS Proxy
 * ========================================
 * A free, unlimited, reliable replacement for the Cloudflare Worker.
 * Runs on Google's servers (same infrastructure as your other IBI tools).
 *
 * WHY THIS IS BETTER THAN THE CLOUDFLARE WORKER:
 *  - No 503 errors, no daily request cap that exhausts
 *  - No CORS-proxy dependency (corsproxy.io, allorigins, etc.)
 *  - Same Google Apps Script backend you already use everywhere
 *  - UrlFetchApp has generous quotas (20,000 calls/day on free Google account)
 *
 * HOW TO DEPLOY (5 minutes):
 *  1. Go to https://script.google.com  →  New Project
 *  2. Delete the default code, paste THIS entire file
 *  3. Click "Deploy" → "New deployment"
 *  4. Type: "Web app"
 *  5. Execute as: "Me"
 *  6. Who has access: "Anyone"   ← IMPORTANT, must be Anyone
 *  7. Click "Deploy" → authorize when prompted
 *  8. Copy the Web App URL (ends in /exec)
 *  9. Paste that URL into index.html as GAS_PROXY_URL
 *
 * USAGE: <web-app-url>?url=<encoded RSS url>
 * Returns: the raw RSS XML with CORS headers
 */

function doGet(e) {
  // Health check / no url provided
  if (!e || !e.parameter || !e.parameter.url) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'IBI News RSS Proxy is running', usage: '?url=<rss-url>' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var targetUrl = e.parameter.url;

  // Security: only allow known news domains
  var ALLOWED = [
    'news.google.com', 'feeds.bbci.co.uk', 'feeds.reuters.com',
    'economictimes.indiatimes.com', 'timesofindia.indiatimes.com',
    'thehindu.com', 'feeds.feedburner.com', 'ndtv.com',
    'aljazeera.com', 'cnn.com', 'techcrunch.com',
    'who.int', 'un.org', 'indianexpress.com', 'livemint.com',
    'business-standard.com', 'aninews.in', 'hindustantimes.com',
    'thenewsminute.com', 'dinamalar.com', 'dailythanthi.com'
  ];

  var isAllowed = false;
  for (var i = 0; i < ALLOWED.length; i++) {
    if (targetUrl.indexOf(ALLOWED[i]) !== -1) { isAllowed = true; break; }
  }
  if (!isAllowed) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Domain not allowed' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var response = UrlFetchApp.fetch(targetUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IBINewsBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    var content = response.getContentText();

    // Return raw XML. ContentService automatically sends
    // Access-Control-Allow-Origin: * so the browser can read it.
    return ContentService
      .createTextOutput(content)
      .setMimeType(ContentService.MimeType.XML);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
