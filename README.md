# IBI-News — v7.9

v7.9 (13 Oct 2026): (1) international news-site design (CEO: "clean, neat and professional - as per current international industry standards for news"): slim masthead, section titles with a rule (red for Breaking) instead of coloured bars and number badges, borderless stories with hairlines, serif headlines, uppercase source line, side-ruled AI summary panel; phones edge to edge (pictures full width, text 10 px in). (2) Read aloud (CEO: "add a text to voice aloud feature" / "add maximum voices - both male and female. let the reader select the voice. Keep indian sharp male voice as default"): Listen on every story and every AI summary, bottom player with Pause/Resume, Stop, every English voice on the device (tagged Male/Female) and speed 0.8-1.5x, remembered; default = Indian (en-IN) male (Prabhat/Rishi/Ravi/Hemant), else Indian, else UK/US male. Free (browser speechSynthesis), no key.


v7.8 (13 Oct 2026): every story free to read in full (CEO: "avoid those news that if opened for reading - say The Hindu, stops mid way and ask for subscription" / "all news should be fully read by anyone"). Removed: The Hindu (metered), SCMP (all paid), The Japan Times (metered; blocks checks); their hosts are blocked even in old caches. Added free: Hong Kong Free Press (China), Indian Express Chennai/Health, Business Today, Guardian Environment, Mongabay. Mixed publishers (Indian Express, Times of India, Straits Times, Hindustan Times, Mint): each article is checked by the Worker (/free reads schema.org isAccessibleForFree, edge-cached 24 h) and paid ones are removed; premium-looking addresses never show. The Federal was tried and dropped (403 to Cloudflare and every public relay). Measured: 143 stories, 47 checked, 2 paid removed, 0 paid/paywalled on page. Worker v7.8.0 (45 hosts).


v7.7.1 (13 Oct 2026, CEO: "Why do we need to click each time to expand the news. Do expand it by default."): every story in a section shows; no "Show more stories" button.


v7.7 (13 Oct 2026): every story at most 24 hours old (CEO: "all news should be of 24 hours" / "no delayed news should appear": the widenTo 72 h / 1-week escalation is gone, feedWindow capped at 24 h, cache key v4). One story, one appearance (CEO: "no repetition of news" / "in case of many sources saying same news. use standard reliable sources only"): same link or headlines sharing 3+ content-word roots (60% of the shorter) = one story; the most reliable source is kept (tier 1 public broadcasters / papers of record, tier 2 major commercial, state media last); a story shown in a higher section is not repeated lower down. Measured: 143 stories, 0 repeats, oldest 24.0 h.


v7.6.2 (13 Oct 2026, CEO: "World news - politics & government repeats 2 times" / "combine into under 1"): the Politics › World tab is removed; its sources (BBC World, The Guardian, Al Jazeera) now feed World › All. One World place only.


v7.6.1 (13 Oct 2026, CEO: "fix the Politics summary too"): Politics opens on Tamil Nadu when Kanyakumari has no story in its window (the empty default tab was why Politics never had a summary); a tabbed section only paints its shared grid/summary for the tab on screen (a slow feed from a tab the reader left could overwrite the current one). Laptop gateway per-visitor limit raised 30 -> 60 new summaries an hour.


v7.6 (13 Oct 2026): new section 4 **World — including China & Russia** with tabs All · China · Russia · Europe · Asia-Pacific · Africa & Americas (CEO: "update reliable news sources worldwide, including from China and Russia"). 18 new publishers, each probed live: SCMP, CGTN*, Global Times*, TASS*, RT*, Sputnik*, The Moscow Times, Meduza, DW, France 24, Euronews, The Straits Times, CNA, The Japan Times, ABC Australia, Africanews, PBS NewsHour, MercoPress (* = state media, shown with a "State media · China/Russia" label). Global Times dates shifted -8 h (Beijing time labelled GMT); RSS 1.0 <dc:date> now read (DW). Tabbed sections only summarise and show the tab on screen. Worker v7.6.0 allows the new hosts (41).


v7.5.2 (13 Oct 2026): when the office laptop is off (or the AI is busy), the page stays SILENT — no summary box and no note (CEO: "do not expose it… Just keep quiet"); the "Writing summary…" box appears only once the laptop has taken the job. start-local.vbs serves this folder permanently on http://localhost:9122/ (office laptop only), started by the IBI SocialFlow Keep Alive task.


v7.5.1 (13 Oct 2026): IBI News is now a PUBLIC site (CEO: "Make it public."). Footer carries the copyright & fair dealing notice (Section 52(1)(a)(iii) of the Copyright Act, 1957 (India) first, then US Section 107) and the corrections/grievances contact (acknowledged within 24 hours, resolved within 15 days); AI summaries are labelled as written from headlines only.


v7.5 (13 Oct 2026): no AI API keys anywhere. Section summaries are written by IBI's own AI on the office laptop (gateway route /news/summary on ai-local.indiabusinessinternational.online: headlines in, fixed prompt, 30-minute shared cache, rate-limited); between 10 PM and 6 AM the page says summaries resume at 6 AM. Old keys saved in browsers are wiped on load; the Settings (API keys) window is gone.

IBI News
