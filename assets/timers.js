/* AION 2 timers page (2026-10-08): live countdowns from the app's own schedule (schedule.js + a2-time.js, copied from
   kit/shared by site/publish.mjs so the site and the app never disagree). Without JS the static table on the page stays.
   The server region is the app's: guessed from this PC's time zone, changeable in the select, kept in localStorage. */
(function () {
  "use strict";
  var list = document.querySelector("[data-timers]");
  var T = window.A2Time, S = window.A2_SCHEDULE;
  if (!list || !T || !S) return;

  var RESETS = [
    { id: "daily-reset", label: "Daily reset", icon: "hourglass", rule: S.resets.daily },
    { id: "weekly-reset", label: "Weekly reset", icon: "alarm-clock", rule: S.resets.weekly }
  ];
  var ICONS = { "skeleton-key": 1, "crossed-swords": 1, "portal": 1, "castle": 1, "podium": 1, "hourglass": 1, "alarm-clock": 1 };

  function rows(now) {
    var seen = {};
    var events = T.events(now).filter(function (e) {           // one row per event: the next of its kind
      if (seen[e.label]) return false;
      seen[e.label] = true;
      return true;
    });
    var resets = RESETS.map(function (r) {
      var at = T.next(r.rule, now), diff = at - now.getTime();
      return { id: r.id, label: r.label, icon: r.icon, at: at, diff: diff, in: T.countdown(diff),
        soon: diff < T.SOON_MS, progress: Math.max(0, Math.min(1, 1 - diff / T.span(r.rule))),
        server: T.hhmmServer(at) + " " + T.tzLabel(at), local: T.hhmmLocal(at) + " local" };
    });
    return events.concat(resets).sort(function (a, b) { return a.diff - b.diff; });
  }

  function item(e) {
    var li = document.createElement("li");
    li.className = "timer";
    var ic = document.createElement("i");
    ic.className = "ic i-" + (ICONS[e.icon] ? e.icon : "hourglass");
    ic.setAttribute("aria-hidden", "true");
    var name = document.createElement("b");
    var when = document.createElement("small");
    var out = document.createElement("output");
    var bar = document.createElement("span");
    bar.className = "bar";
    bar.setAttribute("aria-hidden", "true");
    li.append(ic, name, when, out, bar);
    return li;
  }

  var items = {};
  function render(now) {
    var data = rows(now);
    data.forEach(function (e, i) {
      var li = items[e.id] || (items[e.id] = item(e));
      li.querySelector("b").textContent = e.label;
      li.querySelector("small").textContent = e.server + " · " + e.local;
      li.querySelector("output").textContent = e.in;
      li.classList.toggle("timer--soon", e.soon);
      li.style.setProperty("--p", e.progress.toFixed(4));
      if (list.children[i] !== li) list.insertBefore(li, list.children[i] || null);
    });
    while (list.children.length > data.length) list.removeChild(list.lastChild);
    var server = document.querySelector("[data-server-clock]"), local = document.querySelector("[data-local-clock]");
    if (server) server.textContent = T.serverClock(now) + " " + T.tzLabel(now);
    if (local) local.textContent = T.localClock(now);
  }

  var select = document.querySelector("[data-region]");
  if (select) {
    T.regions().forEach(function (r) {
      var o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.label;
      select.appendChild(o);
    });
    select.value = T.region();
    select.addEventListener("change", function () { T.setRegion(select.value); render(new Date()); });
  }

  var live = document.querySelectorAll("[data-live]");
  for (var i = 0; i < live.length; i++) live[i].hidden = false;
  T.tick(render);
})();
