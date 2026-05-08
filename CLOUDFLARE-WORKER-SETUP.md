# IBI News — Cloudflare Worker Proxy Setup

This guide deploys your own dedicated news proxy on Cloudflare's free tier. Once deployed, your IBI News app stops depending on flaky public proxies and gets **100,000 free requests/day** with **zero rate limits**.

**Time required:** ~5 minutes
**Cost:** ₹0 (free tier is more than enough)

---

## Step 1 — Open Cloudflare Workers

1. Log into your existing Cloudflare account at https://dash.cloudflare.com
2. In the left sidebar, click **Workers & Pages**
3. Click the **Create** button → choose **Create Worker**

## Step 2 — Name your Worker

1. In the "Subdomain" field, enter: `ibi-news-proxy`
2. Click **Deploy** (it will deploy a default "Hello World" Worker first — that's fine)

After deploy, you'll see a URL like:
`https://ibi-news-proxy.YOUR-ACCOUNT.workers.dev`

**Copy this URL — you'll need it in Step 5.**

## Step 3 — Edit the Worker code

1. On the deployed Worker page, click **Edit code** (top-right)
2. The editor opens with the default Hello World code on the left
3. **Delete everything** in the editor
4. Open `cloudflare-worker.js` from this download (the file next to your `index.html`)
5. Copy ALL contents and **paste into the Cloudflare editor**
6. Click **Deploy** (top-right, blue button)

## Step 4 — Test the Worker

In your browser, visit this URL (replace `YOUR-ACCOUNT` with your actual Cloudflare subdomain):

```
https://ibi-news-proxy.YOUR-ACCOUNT.workers.dev/?url=https%3A%2F%2Fnews.google.com%2Frss%2Fsearch%3Fq%3DKanyakumari%26hl%3Den-IN
```

You should see raw RSS XML output starting with `<?xml ...><rss ...>`. **If you see that, the Worker works.** ✓

If you see an error like `{"error":"Host not allowed..."}`, that means the URL test failed — paste the error to me and I'll diagnose.

## Step 5 — Connect IBI News to your Worker

1. Open your `index.html` file in a text editor
2. Find this line (around line 760, near the top of the JavaScript):
   ```js
   const OWN_PROXY_URL = null;
   ```
3. Replace `null` with your Worker URL **in quotes**:
   ```js
   const OWN_PROXY_URL = 'https://ibi-news-proxy.YOUR-ACCOUNT.workers.dev';
   ```
4. Save the file
5. Push to your GitHub repo (or upload via GitHub web UI)
6. Wait ~1 min for GitHub Pages to rebuild
7. **Purge Cloudflare cache** for `news.indiabusinessinternational.online` (Cloudflare → Caching → Purge Everything)
8. Hard-reload your news site (Ctrl+Shift+R)

## Step 6 — Verify it's using your Worker

1. Open the news site
2. Press F12 → Console tab
3. Wait for feeds to load
4. You should see lines like:
   ```
   [IBI News] ✓ breaking via own-worker (10 items)
   [IBI News] ✓ politics_kanyakumari via own-worker (8 items)
   ```

If you see `via own-worker`, **your proxy is working**. The public proxies are now just emergency fallbacks.

---

## What this gives you

- **No more rate limits.** corsproxy.io HTTP 429 errors are gone.
- **No CORS-blocker issues.** Cloudflare Workers are not on adblock lists.
- **Faster.** Cloudflare's edge cache delivers feeds in ~50ms after the first request.
- **You're not dependent on third parties.** No more "service is down" surprises.
- **100K req/day free.** You'd need ~3,500 page loads in a day to exhaust the quota — way beyond normal usage.

## Troubleshooting

**"Host not allowed" error:**
The Worker has an allowlist of news domains. If you see this, the URL you're trying to fetch isn't on the list. Edit the Worker, find `ALLOWED_HOSTS`, add the new hostname, redeploy.

**Worker URL gives 522/523 errors:**
Cloudflare-side issue, usually transient. Wait a few minutes.

**Your IBI News still uses public proxies:**
Check that you actually changed `OWN_PROXY_URL` from `null` to your Worker URL (with quotes). Hard-reload after deploying the change. The footer build version should match what was deployed.

**You want to delete the Worker:**
Cloudflare → Workers & Pages → click the Worker → Settings → Delete. The IBI News app will automatically fall back to public proxies.
