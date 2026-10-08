/* ==========================================================================
   schedule.js — AION 2 GLOBAL (EU, NA East, NA West, South America, Japan).
   CLOCKS (2026-10-05, checked against aion2timers.com, which reads the Global client build 25650019 and in-game reports):
   the game does not keep one server clock, and the Global servers do NOT move with daylight saving for resets.
     clock "KR" = UTC+9, no DST (Asia/Seoul): the client's "Time Standard UTC+9:00". Daily reset 16:00 = 07:00 UTC, weekly
                  Wednesday 16:00, the same moment on every Global server (in game 2026-10-04: NA "02:00 Central" daily;
                  "weekly recharge in 2d 2h 45min" = Wed 07:00 UTC).
     clock "TW" = UTC+8, no DST (Asia/Taipei): Spacetime Rifts (NA East seen in game at the TW 05:00 rift, 2026-10-01).
     no clock   = the server region's own wall clock with DST (regions[].tz, chosen in Settings): Shugo, Invasion,
                  Artifact Conquest, Battlefield.
   Until 2026-10-05 everything was Europe/Berlin 09:00 — right in summer, one hour late after the 2026-10-25 switch.
   Od (not a rule here): +15 every 3 h on the UTC+9 grid (01, 04 … 22 KST = 00, 03 … 21 CEST in summer); the companion
   sends od.nextAt (OdGrid.cs), reminders in a2-reminders.js. Daily Dungeon: 14 entries per week with membership.
   Not listed (aion2timers.com shows them only once confirmed for Europe): Rift Domination, Abyss Rift Zone,
   post-Conquest Abyss bosses, Kaira, Nahma. Field/world bosses come live from the companion bridge (0x9101).
   Everything still marked VERIFY is an assumption from KR/TW schedules and fan trackers.
   Sources: A2Naki Companion data/checklist.json + research (docs/widgets.md) + aion2timers.com (2026-10-05).
   Rule types (optional clock: "KR" | "TW" on any of them):
     { type:"daily",  at:"05:00" }
     { type:"weekly", dow:3, at:"05:00" }            // 0=Sun … 6=Sat
     { type:"every",  hours:3, anchor:"02:00" }       // or minutes:30
     { type:"once",   at:"2026-10-05T13:00:00Z" }
   Icons = file names in shared/icons (game-icons.net, CC BY 3.0).
   Duties: "max" makes a counter (tap +1, undo −1). max ≤ 10 → pips, > 10 → meter line.
   Field/world bosses are NOT listed: their timers come live from the companion bridge (0x9101).
   ========================================================================== */
window.A2_SCHEDULE = {
  serverTimeZone: "Europe/Berlin",   // only when no region is known (A2Time.region() always finds one while regions exist)
  serverUtcOffset: 1,                // fallback only, used if the time zone above is unsupported
  serverTzLabel: null,               // null = automatic ("CEST", "EDT" …)

  clocks: { KR: "Asia/Seoul", TW: "Asia/Taipei" },   // fixed game clocks, no daylight saving (see the header)

  // Global server regions (Settings → Server; guessed from this PC's time zone until chosen). tz = the region's server clock.
  regions: [
    { id: "EU",  label: "Europe",        tz: "Europe/Berlin" },        // VERIFIED 2026-10-01 (in game, Shugo + Attendance in ST)
    { id: "NAE", label: "NA East",       tz: "America/New_York" },
    { id: "NAW", label: "NA West",       tz: "America/Los_Angeles" },
    { id: "SA",  label: "South America", tz: "America/Sao_Paulo" },
    { id: "JP",  label: "Japan",         tz: "Asia/Tokyo" }
  ],

  dungeons: {                        // id (from the bridge) → label + icon for party clear badges. VERIFY ids.
    "krao-cave":     { label: "Krao Cave",     icon: "dungeon-gate" },
    "urugugu":       { label: "Urugugu",       icon: "portal" },
    "fire-temple":   { label: "Fire Temple",   icon: "flame" },
    "draupnir-cave": { label: "Draupnir Cave", icon: "dungeon-gate" }
  },

  resets: {
    // 16:00 UTC+9 = 07:00 UTC = 09:00 CEST / 08:00 CET. VERIFIED 2026-10-01 (EU, 09:00 CEST) and 2026-10-04 (NA, 02:00 CDT)
    daily:  { type: "daily",  at: "16:00", clock: "KR" },
    weekly: { type: "weekly", dow: 3, at: "16:00", clock: "KR" }   // Wednesday 16:00 UTC+9 = Wed 07:00 UTC
  },

  events: [
    { id: "shugo",      label: "Shugo Festival",       icon: "skeleton-key",   rule: { type: "every", hours: 1, anchor: "00:00" } }, // VERIFIED 2026-10-01: in-game timeline every full hour (ST); over within 30 min
    { id: "invasion",   label: "Dimensional Invasion", icon: "crossed-swords", rule: { type: "every", hours: 1, anchor: "00:30" } }, // :30 every hour (aion2timers.com)
    { id: "rift",       label: "Spacetime Rift",       icon: "portal",         rule: { type: "every", hours: 3, anchor: "02:00", clock: "TW" } }, // 02, 05 … 23 Taiwan time (Lv45; confirmed on Global 2026-10-01, aion2timers.com)
    { id: "artifact-w", label: "Artifact Conquest",    icon: "castle",         rule: { type: "weekly", dow: 3, at: "21:30" } },    // Wed 21:30 server (aion2timers.com; was 22:00). VERIFY in game
    { id: "artifact-s", label: "Artifact Conquest",    icon: "castle",         rule: { type: "weekly", dow: 6, at: "21:30" } },    // Sat 21:30 server. VERIFY in game
    { id: "arena-am",   label: "Arena of Tactics",     icon: "podium",         rule: { type: "daily", at: "11:00" } },             // Battlefield matchmaking 11:00–14:00 server (in game on EU 2026-10-04, aion2timers.com)
    { id: "arena-pm",   label: "Arena of Tactics",     icon: "podium",         rule: { type: "daily", at: "19:00" } }              // and 19:00–21:00
  ],

  // max = completions per period; unlock = level gate (from data/checklist.json)
  duties: {
    daily: [
      { id: "duty-missions",        label: "Duty Missions",        icon: "scroll-unfurled", max: 5, unlock: 0 },
      { id: "supply-daily",         label: "Supply Requests",      icon: "anvil",           max: 1, unlock: 0 },
      { id: "shugo-festival",       label: "Shugo Festival",       icon: "skeleton-key",    max: 3, unlock: 0 },
      { id: "nightmare",            label: "Nightmare",            icon: "dragon-head",     max: 2, unlock: 45 },
      { id: "expedition-conquest",  label: "Expedition: Conquest", icon: "portal",          max: 3, unlock: 45 },
      { id: "transcendence",        label: "Transcendence",        icon: "medal",           max: 1, unlock: 45 },
      { id: "dimensional-invasion", label: "Dimensional Invasion", icon: "crossed-swords",  max: 1, unlock: 45 },
      { id: "spacetime-rift",       label: "Spacetime Rift",       icon: "portal",          max: 1, unlock: 45 }
    ],
    weekly: [
      { id: "daily-dungeon",          label: "Daily Dungeons",          icon: "dungeon-gate",    max: 14, unlock: 0 },   // VERIFIED 2026-10-01: 14 entries/week (+ up to 30 recharge tickets, not counted here)
      { id: "command-missions",       label: "Command Missions",        icon: "flying-flag",     max: 12, unlock: 0 },
      { id: "expedition-exploration", label: "Expedition: Exploration", icon: "scroll-unfurled", max: 7,  unlock: 20 },
      { id: "ascension-test",         label: "Ascension Test",          icon: "medal",           max: 3,  unlock: 45 },
      { id: "raid",                   label: "Raid",                    icon: "dragon-head",     max: 3,  unlock: 45 },
      { id: "sanctuary",              label: "Sanctuary",               icon: "castle",          max: 1,  unlock: 45 },
      { id: "odyle-morph",            label: "Odyle Energy Morph",      icon: "crystal-shine",   max: 7,  unlock: 0 },
      { id: "abyss",                  label: "Abyss",                   icon: "angel-wings",     max: 7,  unlock: 45 }
    ]
  }
};
