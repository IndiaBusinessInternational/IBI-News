# IBI-News — v7.7

v7.7 (13 Oct 2026): every story at most 24 hours old (CEO: "all news should be of 24 hours" / "no delayed news should appear": the widenTo 72 h / 1-week escalation is gone, feedWindow capped at 24 h, cache key v4). One story, one appearance (CEO: "no repetition of news" / "in case of many sources saying same news. use standard reliable sources only"): same link or headlines sharing 3+ content-word roots (60% of the shorter) = one story; the most reliable source is kept (tier 1 public broadcasters / papers of record, tier 2 major commercial, state media last); a story shown in a higher section is not repeated lower down. Measured: 143 stories, 0 repeats, oldest 24.0 h.


v7.6.2 (13 Oct 2026, CEO: "World news - politics & government repeats 2 times" / "combine into under 1"): the Politics › World tab is removed; its sources (BBC World, The Guardian, Al Jazeera) now feed World › All. One World place only.


v7.6.1 (13 Oct 2026, CEO: "fix the Politics summary too"): Politics opens on Tamil Nadu when Kanyakumari has no story in its window (the empty default tab was why Politics never had a summary); a tabbed section only paints its shared grid/summary for the tab on screen (a slow feed from a tab the reader left could overwrite the current one). Laptop gateway per-visitor limit raised 30 -> 60 new summaries an hour.


v7.6 (13 Oct 2026): new section 4 **World — including China & Russia** with tabs All · China · Russia · Europe · Asia-Pacific · Africa & Americas (CEO: "update reliable news sources worldwide, including from China and Russia"). 18 new publishers, each probed live: SCMP, CGTN*, Global Times*, TASS*, RT*, Sputnik*, The Moscow Times, Meduza, DW, France 24, Euronews, The Straits Times, CNA, The Japan Times, ABC Australia, Africanews, PBS NewsHour, MercoPress (* = state media, shown with a "State media · China/Russia" label). Global Times dates shifted -8 h (Beijing time labelled GMT); RSS 1.0 <dc:date> now read (DW). Tabbed sections only summarise and show the tab on screen. Worker v7.6.0 allows the new hosts (41).


v7.5.2 (13 Oct 2026): when the office laptop is off (or the AI is busy), the page stays SILENT — no summary box and no note (CEO: "do not expose it… Just keep quiet"); the "Writing summary…" box appears only once the laptop has taken the job. start-local.vbs serves this folder permanently on http://localhost:9122/ (office laptop only), started by the IBI SocialFlow Keep Alive task.


v7.5.1 (13 Oct 2026): IBI News is now a PUBLIC site (CEO: "Make it public."). Footer carries the copyright & fair dealing notice (Section 52(1)(a)(iii) of the Copyright Act, 1957 (India) first, then US Section 107) and the corrections/grievances contact (acknowledged within 24 hours, resolved within 15 days); AI summaries are labelled as written from headlines only.


v7.5 (13 Oct 2026): no AI API keys anywhere. Section summaries are written by IBI's own AI on the office laptop (gateway route /news/summary on ai-local.indiabusinessinternational.online: headlines in, fixed prompt, 30-minute shared cache, rate-limited); between 10 PM and 6 AM the page says summaries resume at 6 AM. Old keys saved in browsers are wiped on load; the Settings (API keys) window is gone.

IBI News
