/* A2Naki Companion site — theme toggle (Elyos / Asmodian) + gentle scroll reveal.
   No dependencies. Everything works without JS (default theme Elyos, all content visible). */
(function () {
  "use strict";
  var KEY = "a2site.theme";
  var THEMES = ["elyos", "asmodian"];
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode / blocked storage: the toggle still works for this page */ }
  }
  function apply(v) {
    var theme = THEMES.indexOf(v) >= 0 ? v : "elyos";
    root.setAttribute("data-theme", theme);
    var other = theme === "elyos" ? "Asmodian" : "Elyos";
    var btns = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-label", "Switch to the " + other + " look");
      btns[i].setAttribute("title", "Switch to the " + other + " look");
    }
    return theme;
  }

  apply(read());

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-theme-toggle]") : null;
    if (!btn) return;
    var next = root.getAttribute("data-theme") === "asmodian" ? "elyos" : "asmodian";
    write(apply(next));
  });

  // Labels need the buttons, which exist once the DOM is parsed.
  document.addEventListener("DOMContentLoaded", function () { apply(root.getAttribute("data-theme")); });

  // Moving demos: each [data-motion] holds a muted looping <video> whose sources wait in data-src. A clip loads only when it
  // is near the screen and in the current faction look (the other look's copy is display:none, so never intersecting), and
  // autoplays only without prefers-reduced-motion; otherwise its still poster shows with a Play button. The button always
  // pauses / resumes (moving content longer than 5 s needs a pause, WCAG 2.2.2). Without JS the poster is all you see.
  var motionStill = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function motionLoad(box) {
    if (box.hasAttribute("data-loaded")) return;
    box.setAttribute("data-loaded", "");
    var v = box.querySelector("video"), srcs = v.querySelectorAll("source[data-src]");
    for (var i = 0; i < srcs.length; i++) srcs[i].setAttribute("src", srcs[i].getAttribute("data-src"));
    v.preload = "auto";
    v.load();
  }
  function motionLabel(box, playing) {
    var btn = box.querySelector("[data-motion-btn]");
    if (playing) box.setAttribute("data-playing", ""); else box.removeAttribute("data-playing");
    btn.querySelector(".motion__txt").textContent = playing ? "Pause" : "Play";
    btn.setAttribute("aria-label", (playing ? "Pause" : "Play") + " the moving demo");
  }
  function motionPlay(box) {
    var v = box.querySelector("video");
    motionLoad(box);
    box.removeAttribute("data-idle");
    var p = v.play();
    if (p && p.catch) p.catch(function () { motionLabel(box, false); });   // autoplay blocked: the poster and Play stay
  }
  function motionSetup() {
    var boxes = document.querySelectorAll("[data-motion]");
    if (!boxes.length || !("IntersectionObserver" in window)) return;   // no observer: posters only
    var still = !!(motionStill && motionStill.matches);
    boxes.forEach(function (box) {
      var v = box.querySelector("video"), btn = box.querySelector("[data-motion-btn]");
      btn.hidden = false;
      if (still) box.setAttribute("data-idle", "");
      v.addEventListener("play", function () { motionLabel(box, true); });
      v.addEventListener("pause", function () { motionLabel(box, false); });
      btn.addEventListener("click", function () {
        if (v.paused) { box.setAttribute("data-wanted", ""); motionPlay(box); }
        else { box.removeAttribute("data-wanted"); boxes.forEach(function (b) { b.setAttribute("data-stopped", ""); b.removeAttribute("data-wanted"); b.querySelector("video").pause(); }); }   // a pause stops every clip and holds
      });
      motionLabel(box, false);
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var box = en.target, v = box.querySelector("video");
        if (!en.isIntersecting) { if (!v.paused) v.pause(); return; }
        // autoplay unless the visitor prefers less motion or paused it; a clip the visitor started plays on
        if (box.hasAttribute("data-wanted") || (!still && !box.hasAttribute("data-stopped"))) motionPlay(box);
      });
    }, { rootMargin: "200px 0px" });
    boxes.forEach(function (box) { io.observe(box); });
  }
  document.addEventListener("DOMContentLoaded", motionSetup);

  // Scroll reveal — only when motion is welcome and the browser can observe.
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || !("IntersectionObserver" in window)) return;
  root.classList.add("js");
  document.addEventListener("DOMContentLoaded", function () {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  });
})();
