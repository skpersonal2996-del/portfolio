import { Ambient } from "./ambient.js";
import { Particles } from "./particles.js";
import { Jewels } from "./jewels.js";
import { createEmbers } from "./embers.js";
import { createLife } from "./life.js";
import { heroGirl } from "./hero-girl.js";
import { skills, jumpIn } from "./skills.js";
import { setup, landOnHash, reading, contact, params, $, $$ } from "./shared.js";

const { gsap, ScrollTrigger, SplitText } = window;
const html = document.documentElement;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
};


boot();

function boot() {
  clearTimeout(window.__introFailsafe);
  if (!gsap || !ScrollTrigger) {
    html.classList.remove("is-intro");
    return;
  }
  const { reduced, lenis } = setup();

  // Reduced motion: the composed page, still. No intro, no pin, no glitch,
  // the reading text arrives already white and the work simply stacks.
  if (reduced) {
    html.classList.remove("is-intro");
    fitName();
    const girl = $("[data-hero-girl]");
    skills({ reduced: true, heroGirl: girl ? heroGirl(girl, true) : null });
    made(true);
    roles(true);
    life(true);
    contact(true);
    landOnHash(null);
    return;
  }
  // In page order: each pin changes where everything after it starts.
  const sitting = hero();
  skills({ reduced: false, heroGirl: sitting });
  reading();
  // ambient(); // the 3D form behind the story, off for now at her request
  made(false);
  me(false);
  roles(false);
  life(false);
  contact(false);
  navCurrent(); // after the pins, so it knows where each section really starts
  landOnHash(lenis);
}

/* ---------- Outside of work: tiny pixel Shruti ---------- */

// The heading arrives like the other section titles; the scene itself lives
// in life.js.
function life(reduced) {
  const section = $("[data-life]");
  if (!section) return;
  // On wide screens tiny Shruti from the page hops into the box first, and
  // the scene's own Shruti appears when she lands.
  const box = $("[data-life-box]", section);
  let scene = null;
  const waiting = !reduced && jumpIn({ box, onLand: () => scene?.appear?.() });
  scene = createLife(section, { gsap, ScrollTrigger, reduced, manual: waiting });
  if (reduced) return;
  gsap
    .timeline({ scrollTrigger: { trigger: section, start: "top 72%", once: true } })
    .from(".life__head .eyebrow__dot", { scale: 0, duration: 0.6, ease: "back.out(2.4)" })
    .from(".life__title-in", { yPercent: 110, duration: 1.1, ease: "expo.out" }, 0.1);
}

/* ---------- About me ---------- */

// The heading and paragraphs rise in once; the portrait fades up behind.
function me(reduced) {
  const section = $("[data-me]");
  if (!section || reduced) return;
  gsap.timeline({ scrollTrigger: { trigger: section, start: "top 60%", once: true } })
    .from(".me__photo", { opacity: 0, x: 40, duration: 1.6, ease: "power3.out" }, 0)
    .from("[data-me-in]", { y: 28, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.12 }, 0.15);
}


/* ---------- Things I've made ---------- */

// Each name fills in from the left as its row scrolls up the screen. On
// fine pointers a small picture of the project trails the pointer while
// it's over the list, swapping as you move between rows.
function made(reduced) {
  const section = $("[data-made]");
  if (!section) return;
  const rows = $$("[data-made-row]", section);
  if (reduced) return;

  gsap.from(".made__title", { y: 24, opacity: 0, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 80%", end: "top 45%", scrub: 0.6 } });
  for (const row of rows) {
    gsap.fromTo($("[data-made-fill]", row), { "--rest": "100%" }, {
      "--rest": "0%",
      ease: "none",
      scrollTrigger: { trigger: row, start: "top 92%", end: "top 50%", scrub: 0.4 },
    });
  }

  const thumb = $("[data-made-thumb]", section);
  if (!thumb || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const imgs = $$("[data-thumb-img]", thumb);
  const x = gsap.quickTo(thumb, "x", { duration: 0.6, ease: "power3.out" });
  const y = gsap.quickTo(thumb, "y", { duration: 0.6, ease: "power3.out" });
  const tilt = gsap.quickTo(thumb, "rotation", { duration: 0.8, ease: "power3.out" });
  let lastX = 0;
  addEventListener("pointermove", (e) => {
    // Up and to the right of the pointer, leaning with the movement.
    x(e.clientX + 28);
    y(e.clientY - thumb.offsetHeight - 20);
    tilt(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.4));
    lastX = e.clientX;
  }, { passive: true });
  for (const row of rows) {
    row.addEventListener("pointerenter", () => {
      imgs.forEach((img) => img.classList.toggle("is-on", img.dataset.thumbImg === row.dataset.thumb));
      thumb.classList.add("is-on");
    });
  }
  $(".made__list", section).addEventListener("pointerleave", () => thumb.classList.remove("is-on"));
  addEventListener("scroll", () => thumb.classList.contains("is-on") && !$(".made__list:hover") && thumb.classList.remove("is-on"), { passive: true });
}

/* ---------- What I do: three roles, each arriving from its side ---------- */

// As the section rises, the roles come in one after another, left, right,
// then the last one's two lines together, and each glass shape turns into
// view as its line lands. While the section leaves they keep drifting a
// little the way they came, and the glow behind them moves slower than the page.
function roles(reduced) {
  const section = $("[data-roles]");
  if (!section) return;
  const canvas = $("[data-roles-jewels]", section);
  const glass = canvas && Jewels.supported() ? new Jewels(canvas) : null;
  if (glass?.ready) html.classList.add("has-jewels");

  // Each shape has an entrance (appear, spin) and a pose that follows scroll,
  // a slow turn of its own and a slight tilt towards the pointer.
  const J = $$("[data-jewel]", section).map((slot) => ({ slot, shape: Number(slot.dataset.jewel), appear: reduced ? 1 : 0, spin: 0 }));
  const POSES = [
    (a, j) => [a + j.spin * 2.6, 1.05 + Math.sin(a * 0.7) * 0.22], // ring, tipped so its hole shows
    (a, j) => [0.78 + a * 0.8 + j.spin * 2.6, 0.62 + Math.sin(a * 0.5) * 0.18], // cube, three faces showing
    (a, j) => [a * 0.6 + j.spin * 2, 0.35], // pebble, rolling slowly
  ];
  const items = (a, tilt) => {
    const c = canvas.getBoundingClientRect();
    return J.map((j) => {
      const s = j.slot.getBoundingClientRect();
      const [ry, rx] = POSES[j.shape](a, j);
      return {
        center: [s.left + s.width / 2 - c.left, s.top + s.height / 2 - c.top],
        size: s.height * 0.62,
        shape: j.shape,
        rot: [ry + tilt.x * 0.7, rx + tilt.y * 0.5],
        phase: a * 0.8,
        appear: j.appear,
      };
    });
  };

  // Reduced motion: the words in place and the shapes drawn once, still.
  if (reduced) {
    if (!glass?.ready) return;
    const still = () => glass.draw(items(0.6, { x: 0, y: 0 }));
    document.fonts.ready.then(still);
    addEventListener("resize", still);
    return;
  }

  const side = (el) => (el.dataset.from === "left" ? -1 : 1);
  const arrive = gsap.timeline({
    scrollTrigger: { trigger: section, start: "top 68%", end: "top top", scrub: true, invalidateOnRefresh: true },
  });
  $$(".roles__role", section).forEach((role, i) => {
    $$(".roles__in", role).forEach((el, n) => {
      const at = i * 0.3 + n * 0.06;
      arrive.fromTo(el, { x: () => side(el) * innerWidth * 0.5, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "power2.out" }, at);
      const j = J.find((j) => el.contains(j.slot));
      if (j) arrive.fromTo(j, { appear: 0, spin: -1 }, { appear: 1, spin: 0, duration: 0.24, ease: "power2.out" }, at + 0.16);
    });
  });

  const leave = gsap.timeline({
    scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true, invalidateOnRefresh: true },
  });
  for (const el of $$(".roles__in", section)) {
    leave.to(el.parentElement, { x: () => -side(el) * innerWidth * 0.04, ease: "none" }, 0);
  }

  gsap.fromTo(
    section,
    { "--roles-glow": "-7vh" },
    { "--roles-glow": "7vh", ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true } }
  );

  createEmbers(section, $("[data-roles-sparks]", section));
  if (!glass?.ready) return;

  // The shapes are drawn while the section is on screen, where their brackets
  // are that frame, so they ride along with the sliding words.
  const pass = ScrollTrigger.create({ trigger: section, start: "top bottom", end: "bottom top" });
  const T = { x: 0, y: 0, tx: 0, ty: 0, clock: 0, key: "" };
  if (params.has("debug")) window.__roles = { J, T, pass };
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    addEventListener(
      "pointermove",
      (e) => {
        T.tx = e.clientX / innerWidth - 0.5;
        T.ty = e.clientY / innerHeight - 0.5;
      },
      { passive: true }
    );
  }
  gsap.ticker.add((time, deltaMs) => {
    if (!pass.isActive) return;
    T.x += (T.tx - T.x) * 0.06;
    T.y += (T.ty - T.y) * 0.06;
    const shown = J.some((j) => j.appear > 0.002);
    if (shown) T.clock += Math.min(64, deltaMs || 16) / 1000;
    const list = items(pass.progress * 5 + T.clock * 0.3, T);
    const key = shown
      ? list.map((it) => [...it.center, it.size, ...it.rot, it.appear].map((n) => n.toFixed(3)).join()).join("|")
      : "none";
    if (key === T.key) return;
    T.key = key;
    glass.draw(list);
  });
}

/* ---------- Ambient: the glow and the glass form behind the reading ---------- */

// Scroll through the story and the form is precise, sitting opposite the text.
// As "How I think" rises in, it crosses to the other side and turns organic.
// Everything is set by scroll, plus a little pointer tilt.
// Two looks share this: particles (default) and ?ambient=glass.
function ambient() {
  const canvas = $("[data-ambient]");
  const story = $("[data-story]");
  const think = $("[data-think]");
  const Look = params.get("ambient") === "glass" ? Ambient : Particles;
  if (!canvas || !story || !Look.supported()) return;
  html.classList.add("has-ambient");
  const amb = new Look(canvas, Look === Particles ? { freq: innerWidth < 768 ? 16 : 22 } : {});
  if (!amb.ready) {
    html.classList.remove("has-ambient");
    return;
  }

  // s and k: how far each section has travelled through the screen, 0..1.
  const A = { s: 0, k: 0, par: { x: 0, y: 0 }, parTo: { x: 0, y: 0 }, key: "" };
  if (params.has("debug")) window.__ambient = A;
  const track = (el, prop) =>
    ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => (A[prop] = self.progress),
      onRefresh: (self) => (A[prop] = self.progress),
    });
  track(story, "s");
  if (think) track(think, "k");

  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    addEventListener(
      "pointermove",
      (e) => (A.parTo = { x: e.clientX / innerWidth - 0.5, y: e.clientY / innerHeight - 0.5 }),
      { passive: true }
    );
  }

  gsap.ticker.add(() => {
    A.par.x += (A.parTo.x - A.par.x) * 0.05;
    A.par.y += (A.parTo.y - A.par.y) * 0.05;
    const { s, k } = A;
    const W = innerWidth, H = innerHeight;
    const narrow = W < 768;
    // With no "How I think" after it, the form fades out as the story leaves.
    const fade = smooth(0, 0.25, s) * (think ? 1 - smooth(0.82, 1, k) : 1 - smooth(0.8, 1, s));
    // Nothing to show and already cleared: skip the frame.
    const key = fade <= 0 ? "off" : [s, k, A.par.x, A.par.y, W, H].map((n) => n.toFixed(4)).join();
    if (key === A.key) return;
    A.key = key;

    // It crosses in the gap between the two passages, dipping and shrinking a
    // little on the way so it never passes under either one.
    const travel = smooth(0.0, 0.34, k);
    const arc = Math.sin(Math.PI * travel);
    amb.draw({
      // On a phone the text takes the full width, so the form stays small and
      // faint, tucked into a top corner where lines only pass briefly.
      center: [
        lerp(narrow ? 0.95 : 0.78, narrow ? 0.05 : 0.2, travel) * W,
        H * (narrow ? 0.17 : 0.5 + 0.08 * arc) + Math.sin((s + k) * 3) * H * 0.03,
      ],
      size: (narrow ? 0.24 * W : 0.18 * H) * lerp(0.75, 1, smooth(0.1, 0.45, s)) * (1 - 0.25 * arc),
      appear: smooth(0.12, 0.42, s) * (1 - smooth(0.6, 0.86, k)) * (narrow ? 0.5 : 1),
      morph: smooth(0.06, 0.4, k),
      rot: [s * 2.2 + k * 2.4 + A.par.x * 0.5, s * 0.8 - k * 0.6 + A.par.y * 0.35],
      phase: (s + k) * 2.6,
      drift: (s + k) * 2.2,
      fade,
    });
  });
}

/* ---------- Hero ---------- */

// Type only: the headline rises line by line on the first visit, then the
// label, the line under it, the button and the nav fade up.
function hero() {
  fitName();
  document.fonts.ready.then(fitName);
  addEventListener("resize", fitName);
  const girl = $("[data-hero-girl]");
  const name = $("[data-hero-name]");
  if (name) {
    kinetic(name);
    intro(name);
  }
  return girl ? heroGirl(girl, false) : null;
}

// Both lines of her name at one size: the longer fills about four fifths of
// the width at rest (leaving its letters room to widen near the pointer),
// and never taller than the screen allows.
function fitName() {
  const name = $("[data-hero-name]");
  if (!name) return;
  const lines = $$("[data-fit]", name);
  lines.forEach((line) => line.style.setProperty("--fit", "100px"));
  const widest = Math.max(...lines.map((line) => {
    const range = document.createRange();
    range.selectNodeContents(line);
    return range.getBoundingClientRect().width;
  }));
  if (!widest) return;
  const room = name.clientWidth * (innerWidth < 768 ? 0.92 : 0.8);
  const size = Math.min((room / widest) * 100, innerHeight * 0.3);
  lines.forEach((line) => line.style.setProperty("--fit", `${size.toFixed(2)}px`));
}

/* ---------- The name's letters stretch toward the pointer ---------- */

// Every letter near the pointer (within R) eases toward wide and light;
// further ones settle back to narrow and heavy. Each line is held to the
// width it has, so the stretch is scaled down if it would run over.
// After mikewilcockdesign.com's hero.
function fvs(t) {
  return `"wdth" ${(75 + 50 * t).toFixed(1)}, "wght" ${Math.round(800 - 540 * t)}`;
}

function kinetic(name) {
  const R = 420;
  const lines = $$("[data-fit]", name).map((line) => {
    const word = line.textContent.trim();
    line.setAttribute("aria-hidden", "true");
    line.textContent = "";
    const letters = [...word].map((ch) => {
      const span = document.createElement("span");
      span.className = "hero__letter";
      span.textContent = ch;
      line.append(span);
      return { el: span, t: 0, v: 0 };
    });
    return { line, letters };
  });
  name.setAttribute("aria-label", "Shruti Kale");
  if (!matchMedia("(pointer: fine)").matches) return;

  // Each letter's width at five steps from narrow to wide (it doesn't grow
  // evenly, as it thins while it widens), and its centre on the page.
  const STEPS = [0, 0.25, 0.5, 0.75, 1];
  const measure = () => {
    for (const ln of lines) {
      const w = STEPS.map((t) => {
        for (const l of ln.letters) l.el.style.fontVariationSettings = fvs(t);
        return ln.letters.map((l) => l.el.getBoundingClientRect().width);
      });
      ln.letters.forEach((l, i) => {
        l.el.style.fontVariationSettings = fvs(0);
        l.w = w.map((row) => row[i]);
        const r = l.el.getBoundingClientRect();
        l.x = r.left + r.width / 2;
        l.y = r.top + r.height / 2 + scrollY;
        l.v = 0;
      });
      ln.room = ln.line.clientWidth - 4;
    }
  };
  const widthAt = (l, v) => {
    const f = v * 4;
    const i = Math.min(3, Math.floor(f));
    return l.w[i] + (l.w[i + 1] - l.w[i]) * (f - i);
  };
  // How much of each letter's stretch the line has room for.
  const fit = (ln) => {
    const total = (s) => ln.letters.reduce((a, l) => a + widthAt(l, l.t * s), 0);
    if (total(1) <= ln.room) return 1;
    let lo = 0;
    let hi = 1;
    for (let n = 0; n < 12; n++) {
      const mid = (lo + hi) / 2;
      if (total(mid) <= ln.room) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  const p = { x: -9999, y: -9999, inside: false };
  addEventListener("pointermove", (e) => Object.assign(p, { x: e.clientX, y: e.clientY, inside: true }), { passive: true });
  document.addEventListener("pointerleave", () => (p.inside = false));
  addEventListener("resize", () => requestAnimationFrame(measure));
  document.fonts.ready.then(measure);
  measure();

  gsap.ticker.add((_, dt) => {
    const k = 1 - Math.pow(1 - 0.12, (dt || 16) / 16.7);
    for (const ln of lines) {
      let near = false;
      for (const l of ln.letters) {
        let h = 0;
        const dy = l.y - scrollY;
        if (p.inside && dy > -R && dy < innerHeight + R) {
          const d = Math.hypot(p.x - l.x, p.y - dy);
          if (d < R) h = 1 - d / R, h = h * h * (3 - 2 * h);
        }
        l.t += (h - l.t) * k;
        if (l.t > 0.001) near = true;
      }
      if (!near && ln.letters.every((l) => l.v === 0)) continue;
      const s = fit(ln);
      for (const l of ln.letters) {
        const v = l.t * s;
        if (Math.abs(v - l.v) < 0.002) continue;
        l.v = v < 0.002 ? 0 : v;
        l.el.style.fontVariationSettings = fvs(l.v);
      }
    }
  });
}

// The nav lights the section you're in.
function navCurrent() {
  $$(".nav__links a[data-scroll-to]").forEach((a) => {
    const target = $(a.getAttribute("href"));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target,
      start: "top 50%",
      end: "bottom 50%",
      onToggle: (self) => (self.isActive ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")),
    });
  });
}

/* ---------- Intro: ~1.5s, once per visit, skipped by any input ---------- */

async function intro(title) {
  if (!html.classList.contains("is-intro")) return;
  await Promise.race([document.fonts.ready, wait(1200)]);
  clearTimeout(window.__introFailsafe);
  const letters = $$(".hero__letter", title);
  const ins = $$("[data-hero-in]");

  const skipOn = ["wheel", "touchstart", "keydown", "pointerdown"];
  const skip = () => tl.progress(1);
  const tl = gsap.timeline({
    defaults: { ease: "expo.out" },
    onComplete() {
      skipOn.forEach((e) => removeEventListener(e, skip));
      html.classList.remove("is-intro");
      gsap.set(letters, { clearProps: "transform" });
      dispatchEvent(new Event("resize")); // the letters' places, now they're in
      gsap.set([title, ".nav", ...ins], { clearProps: "opacity,visibility,transform" });
      store.set("sk:intro", "1");
    },
  });
  gsap.set(title, { visibility: "visible" });
  tl.to(ins[0], { opacity: 1, y: 0, duration: 0.9 }, 0);
  tl.fromTo(letters, { yPercent: 115 }, { yPercent: 0, duration: 1.3, stagger: 0.055 }, 0.1);
  tl.to(ins.slice(1), { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.7)
    .to(".nav", { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.75);

  skipOn.forEach((e) => addEventListener(e, skip, { passive: true }));
  if (params.has("debug")) window.__intro = tl;
}
