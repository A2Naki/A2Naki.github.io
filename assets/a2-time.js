/* ==========================================================================
   a2-time.js — server time ⇄ local, schedule rules, countdowns, tick
   Clocks (2026-10-05, compared with aion2timers.com and the Global client): the game does not run on one clock.
   Resets are 16:00 on the client's UTC+9 clock (= 07:00 UTC, no daylight saving), rifts follow the Taiwan clock (UTC+8),
   other events run on the server region's own clock (Europe/Berlin, America/New_York …, with daylight saving).
   A rule picks its clock with `clock: "KR" | "TW"` (A2_SCHEDULE.clocks); without one it uses the server region's zone.
   Server region: A2_SCHEDULE.regions, chosen in Settings (localStorage "a2.region", shared as "region"), else guessed
   from this PC's time zone, else serverTimeZone. Fallback: serverUtcOffset (hours). Label: serverTzLabel or automatic.
   Daylight saving always comes from Intl and the IANA zone — never by hand.
   Depends on window.A2_SCHEDULE (schedule.js).
   ========================================================================== */
(function () {
  const SOON_MS = 20 * 60 * 1000;
  const DAY = 86400000;
  const REGION_KEY = "a2.region";
  const pad = n => String(n).padStart(2, "0");
  const cfg = () => window.A2_SCHEDULE || {};
  const fallbackMin = () => (Number.isFinite(+cfg().serverUtcOffset) ? +cfg().serverUtcOffset : 0) * 60;
  const fmts = {};
  const partsFmt = tz => fmts[tz] || (fmts[tz] = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"
  }));
  /** UTC offset in minutes of zone tz at instant t (throws for an unknown zone) */
  function zoneOffsetMin(t, tz) {
    const p = {};
    partsFmt(tz).formatToParts(new Date(t)).forEach(x => { p[x.type] = x.value; });
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUTC - Math.floor(t / 1000) * 1000) / 60000);
  }

  /* ---------- server region ---------- */
  const regions = () => (Array.isArray(cfg().regions) ? cfg().regions : []);
  const regionById = id => regions().find(r => r.id === id) || null;
  const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; } };
  const SOUTH_AMERICA = /^America\/(Argentina\/|Sao_Paulo|Buenos_Aires|Santiago|Punta_Arenas|Lima|Bogota|Montevideo|Asuncion|La_Paz|Caracas|Guayaquil|Manaus|Belem|Fortaleza|Recife|Bahia|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Santarem|Noronha|Paramaribo|Cayenne|Guyana)/;
  /** the Global region a PC in time zone `zone` most likely plays on; null when there is no good guess */
  function guessRegion(zone = deviceZone()) {
    const z = String(zone || "");
    if (z === "Asia/Tokyo") return "JP";
    if (/^(Europe|Africa)\//.test(z) || /^Atlantic\/(Reykjavik|Canary|Madeira|Faroe|Azores)$/.test(z)) return "EU";
    if (SOUTH_AMERICA.test(z)) return "SA";
    if (/^(America|US|Canada)\//.test(z) || z === "Pacific/Honolulu") {
      // Mountain time and west (standard time 7 h or more behind UTC) → NA West
      try { return zoneOffsetMin(Date.UTC(2026, 0, 15, 12), z) <= -420 ? "NAW" : "NAE"; } catch (e) { return "NAE"; }
    }
    return null;
  }
  /* next()/prev() ask for the zone several times per event every second (code review 2026-10-05): the stored choice is
     read at most once a second (another tab may change it), the guess once per page; setRegion refreshes at once. */
  const CACHE_MS = 1000;
  let cached = null, cachedAt = 0, guessed;
  const storedRegion = () => {
    const now = Date.now();
    if (cachedAt && now >= cachedAt && now - cachedAt < CACHE_MS) return cached;   // a clock set back reads again
    let v = null;
    try { v = localStorage.getItem(REGION_KEY); } catch (e) {}
    cached = regionById(v) ? v : null; cachedAt = now;
    return cached;
  };
  /** the chosen region id, else the guess, else EU / the first region; null when the schedule has no regions */
  function region() {
    if (!regions().length) return null;
    const stored = storedRegion();
    if (stored) return stored;
    if (guessed === undefined) guessed = guessRegion();
    return regionById(guessed) ? guessed : regionById("EU") ? "EU" : regions()[0].id;
  }
  /** has the user picked a region (Settings, welcome card or another widget through the app)? */
  const regionChosen = () => storedRegion() !== null;
  /** a choice in Settings or from the app; false for an unknown region */
  function setRegion(id) {
    if (!regionById(id)) return false;
    try { localStorage.setItem(REGION_KEY, id); } catch (e) {}
    cached = id; cachedAt = Date.now();
    return true;
  }
  /** IANA zone of the server region (DST-aware) */
  function serverZone() { const r = regionById(region()); return (r && r.tz) || cfg().serverTimeZone || ""; }
  /** IANA zone a rule is written in: its own clock (KR, TW), else the server region's */
  function zoneOf(rule) { const c = rule && rule.clock && (cfg().clocks || {})[rule.clock]; return c || serverZone(); }

  /** UTC offset in minutes of zone tz (default: the server region) at instant t */
  function offsetMin(t, tz = serverZone()) {
    if (!tz) return fallbackMin();
    try { return zoneOffsetMin(t, tz); } catch (e) { return fallbackMin(); }
  }
  /** Date whose getUTC* fields = the wall clock of zone tz (default: the server region) */
  function serverNow(now = new Date(), tz = serverZone()) { const t = +now; return new Date(t + offsetMin(t, tz) * 60000); }
  /** wall clock in zone tz → real epoch ms (DST-safe) */
  function wall(y, mo, d, h, mi, tz) { const w = Date.UTC(y, mo, d, h, mi); let t = w - offsetMin(w, tz) * 60000; t = w - offsetMin(t, tz) * 60000; return t; }
  function hm(s) { const [h, m] = String(s || "00:00").split(":").map(Number); return [h || 0, m || 0]; }
  const stepMs = r => ((+r.hours || 0) * 60 + (+r.minutes || 0)) * 60000;
  function parts(now, tz) { const s = serverNow(now, tz); return { Y: s.getUTCFullYear(), M: s.getUTCMonth(), D: s.getUTCDate(), dow: s.getUTCDay() }; }

  /** next occurrence (epoch ms) of a rule, evaluated on the rule's clock */
  function next(rule, now = new Date()) {
    const tz = zoneOf(rule), w = (y, mo, d, h, mi) => wall(y, mo, d, h, mi, tz);
    const n = +now, { Y, M, D, dow } = parts(now, tz);
    if (rule.type === "daily") { const [h, m] = hm(rule.at); let t = w(Y, M, D, h, m); if (t <= n) t = w(Y, M, D + 1, h, m); return t; }
    if (rule.type === "weekly") { const [h, m] = hm(rule.at), add = (rule.dow - dow + 7) % 7; let t = w(Y, M, D + add, h, m); if (t <= n) t = w(Y, M, D + add + 7, h, m); return t; }
    if (rule.type === "every") {
      const step = stepMs(rule); if (!step) return NaN;
      const [h, m] = hm(rule.anchor); let a = w(Y, M, D, h, m); if (a > n) a = w(Y, M, D - 1, h, m);
      return a + (Math.floor((n - a) / step) + 1) * step;
    }
    if (rule.type === "once") return new Date(rule.at).getTime();
    return NaN;
  }
  /** most recent past occurrence (reset periods) */
  function prev(rule, now = new Date()) {
    const tz = zoneOf(rule), w = (y, mo, d, h, mi) => wall(y, mo, d, h, mi, tz);
    const n = +now, { Y, M, D, dow } = parts(now, tz);
    if (rule.type === "daily") { const [h, m] = hm(rule.at); let t = w(Y, M, D, h, m); if (t > n) t = w(Y, M, D - 1, h, m); return t; }
    if (rule.type === "weekly") { const [h, m] = hm(rule.at), back = (dow - rule.dow + 7) % 7; let t = w(Y, M, D - back, h, m); if (t > n) t = w(Y, M, D - back - 7, h, m); return t; }
    if (rule.type === "every") return next(rule, now) - stepMs(rule);
    return next(rule, now);
  }
  const span = r => r.type === "daily" ? DAY : r.type === "weekly" ? 7 * DAY : r.type === "every" ? (stepMs(r) || DAY) : DAY;

  /** "02:14:36" or "3d 04:12" */
  function countdown(ms) {
    if (!Number.isFinite(ms)) return "--:--:--";
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return d > 0 ? `${d}d ${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}:${pad(x)}`;
  }
  const hhmmLocal = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const hhmmServer = t => { const d = serverNow(new Date(t)); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
  /** "CEST", "EDT", or the configured label, or "UTC+1" */
  const labels = new Map();   // "zone|offset" → label: the name only changes with the offset (DST), so one Intl call per change
  const tzFmts = {};
  function zoneName(tz, t) {
    // en-GB knows CET/CEST, en-US knows EDT/PDT; a zone neither names (Tokyo, São Paulo) reads "UTC+9", not "GMT+9"
    let label = "";
    for (const loc of ["en-GB", "en-US"]) {
      try {
        const f = tzFmts[loc + tz] || (tzFmts[loc + tz] = new Intl.DateTimeFormat(loc, { timeZone: tz, timeZoneName: "short" }));
        const p = f.formatToParts(new Date(t)).find(x => x.type === "timeZoneName");
        if (p && p.value) { label = p.value; if (!/^(GMT|UTC)/.test(label)) return label; }
      } catch (e) {}
    }
    // one minus sign everywhere: "UTC−3" (U+2212), as the fallback below writes it
    return /^GMT[+−-]\d/.test(label) ? "UTC" + label.slice(3).replace("-", "−") : label;
  }
  function tzLabel(now = new Date()) {
    const c = cfg(), tz = serverZone(), t = +now;
    if (c.serverTzLabel) return c.serverTzLabel;
    if (tz) {
      const key = `${tz}|${offsetMin(t, tz)}`;
      if (!labels.has(key)) labels.set(key, zoneName(tz, t));
      if (labels.get(key)) return labels.get(key);
    }
    const o = offsetMin(t) / 60; return `UTC${o >= 0 ? "+" : "−"}${Math.abs(o)}`;
  }
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  /** when an occurrence is on the server region's clock: "Sat 22:00" for weekly rules, "22:00" otherwise
      (a rule on the KR or TW clock is shown in server time too, so every row reads on one clock) */
  function serverWhen(rule, t) { return rule.type === "weekly" ? `${DOW[serverNow(new Date(t)).getUTCDay()]} ${hhmmServer(t)}` : hhmmServer(t); }

  /** schedule events → sorted view models */
  function events(now = new Date(), ids) {
    const list = (cfg().events || []).filter(e => !ids || ids.includes(e.id));
    return list.map(e => {
      const t = next(e.rule, now), diff = t - now.getTime();
      return {
        ...e, at: t, diff, in: countdown(diff), soon: diff < SOON_MS,
        progress: Math.max(0, Math.min(1, 1 - diff / span(e.rule))),
        server: Number.isFinite(t) ? `${serverWhen(e.rule, t)} ${tzLabel(t)}` : "",
        local: `${hhmmLocal(t)} local`
      };
    }).filter(e => Number.isFinite(e.at)).sort((a, b) => a.diff - b.diff);
  }

  /** 1 Hz tick aligned to the second; pauses when hidden */
  function tick(fn) {
    let id = null;
    const run = () => { fn(new Date()); id = setTimeout(run, 1000 - (Date.now() % 1000)); };
    const onVis = () => { clearTimeout(id); if (document.visibilityState !== "hidden") run(); };
    document.addEventListener("visibilitychange", onVis); run();
    return () => { clearTimeout(id); document.removeEventListener("visibilitychange", onVis); };
  }

  window.A2Time = { SOON_MS, serverNow, next, prev, span, countdown, hhmmLocal, hhmmServer, tzLabel, offsetMin, events, tick,
    regions, region, regionChosen, setRegion, guessRegion, serverZone,
    serverClock: (now = new Date()) => hhmmServer(+now),
    localClock: (now = new Date()) => hhmmLocal(+now),
    serverDate: (now = new Date()) => { const s = serverNow(now); return `${DOW[s.getUTCDay()]} ${s.getUTCDate()}/${s.getUTCMonth() + 1}`; }
  };
})();
