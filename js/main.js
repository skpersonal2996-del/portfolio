import { PortraitGL } from "./portrait-gl.js";
import { Ambient } from "./ambient.js";
import { Particles } from "./particles.js";
import { Jewels } from "./jewels.js";
import { createCursor } from "./cursor.js";
import { createEmbers } from "./embers.js";
import { createLife } from "./life.js";
import { setup, landOnHash, reading, contact, params, $, $$ } from "./shared.js";

const { gsap, ScrollTrigger } = window;
const html = document.documentElement;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
};

// The hero's pinned scroll, in viewport heights: the photo grows to full
// screen, holds for a moment, then the stage scrolls away.
const GROW_VH = 1.08;
const STAGE_VH = 1.4;

const FOCUS = [0.64, 0.38]; // where her face sits in the photo
const INLINE_ZOOM = 1.38; // tighter crop while the photo sits in the sentence

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
    roles(true);
    life(true);
    contact(true);
    landOnHash(null);
    return;
  }
  // In page order: each pin changes where everything after it starts.
  hero();
  reading();
  ambient();
  work();
  roles(false);
  life(false);
  contact(false);
  landOnHash(lenis);
}

/* ---------- Outside of work: tiny pixel Shruti ---------- */

// The heading arrives like the other section titles; the scene itself lives
// in life.js.
function life(reduced) {
  const section = $("[data-life]");
  if (!section) return;
  createLife(section, { gsap, ScrollTrigger, reduced });
  if (reduced) return;
  gsap
    .timeline({ scrollTrigger: { trigger: section, start: "top 72%", once: true } })
    .from(".life__head .eyebrow__dot", { scale: 0, duration: 0.6, ease: "back.out(2.4)" })
    .from(".life__title-in", { yPercent: 110, duration: 1.1, ease: "expo.out" }, 0.1);
}

/* ---------- Selected work: the projects move sideways as you scroll ---------- */

function work() {
  const section = $("[data-work]");
  const track = $("[data-work-track]");
  if (!section || !track) return;
  const progress = $("[data-work-progress]");

  // The heading arrives like the hero's: the rule draws, the title rises.
  gsap
    .timeline({ scrollTrigger: { trigger: section, start: "top 70%", once: true } })
    .from(".work__intro .eyebrow__dot", { scale: 0, duration: 0.6, ease: "back.out(2.4)" })
    .from(".work__title-in", { yPercent: 110, duration: 1.1, ease: "expo.out" }, 0.1)
    .from(".work__lede", { opacity: 0, y: 16, duration: 0.9, ease: "power3.out" }, 0.35);

  const mm = gsap.matchMedia();

  // Wide screens: pin the section and move the track by exactly its overflow.
  mm.add("(min-width: 768px)", () => {
    html.classList.add("has-hscroll");
    const distance = () => Math.max(0, track.scrollWidth - innerWidth);
    const move = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => progress && (progress.style.transform = `scaleX(${self.progress})`),
      },
    });
    // Inside each panel the screenshot drifts a little against the card's travel.
    for (const shot of $$(".card__shot", track)) {
      gsap.fromTo(
        shot,
        { xPercent: 4 },
        {
          xPercent: -4,
          ease: "none",
          scrollTrigger: { trigger: shot.closest(".card"), containerAnimation: move, start: "left right", end: "right left", scrub: true },
        }
      );
    }
    return () => html.classList.remove("has-hscroll");
  });

  // Phones: the cards stack and each rises in as it arrives.
  mm.add("(max-width: 767px)", () => {
    for (const card of $$(".card", track)) {
      gsap.from(card, { y: 40, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 88%", once: true } });
    }
  });
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
  if (!canvas || !story || !think || !Look.supported()) return;
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
  track(think, "k");

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
    const fade = smooth(0, 0.25, s) * (1 - smooth(0.82, 1, k));
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

function hero() {
  const stageEl = $("[data-stage]");
  const canvas = $("[data-stage-canvas]");
  const slot = $("[data-slot]");
  const slotImg = $(".slot__img", slot);
  const title = $(".hero__title");
  const lineIns = $$(".line__in", title);
  const wordL = $('[data-word="left"]');
  const wordR = $('[data-word="right"]');
  const tops = $$("[data-hero-top]");
  const bottoms = $$("[data-hero-bottom]");
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const S = {
    d: 0, // pinned scroll so far, in viewport heights
    reveal: html.classList.contains("is-intro") ? 0 : 1,
    introDone: !html.classList.contains("is-intro"),
    introGlitch: 0,
    pointerGlitch: 0,
    scrollGlitch: 0,
    client: { x: -1e4, y: -1e4 },
    hasPointer: false,
    over: false,
    rect: null, // the photo, in viewport px
    par: { x: 0, y: 0 },
    parTo: { x: 0, y: 0 },
    textKey: "",
    drawKey: "",
  };
  // ?debug exposes the state; ?debug&glitch=0.5 holds the glitch on for inspection.
  if (params.has("debug")) {
    window.__hero = S;
    S.debugGlitch = Number(params.get("glitch")) || 0;
  }

  const gl = PortraitGL.supported() ? new PortraitGL(canvas, { focus: FOCUS }) : null;
  const ready = gl ? gl.load(slotImg.currentSrc || slotImg.src).catch(() => false) : Promise.resolve(false);
  const cursor = createCursor(gsap);
  if (gl) html.classList.add("has-stage");

  let slotRadius = 0;
  const measure = () => {
    slotRadius = parseFloat(getComputedStyle(slot).borderTopLeftRadius) || 0;
    S.textKey = S.drawKey = "";
  };
  measure();
  addEventListener("resize", measure);

  canvas.addEventListener("portrait:lost", () => html.classList.remove("gl-ready"));
  canvas.addEventListener("portrait:restored", () => {
    S.drawKey = "";
    html.classList.add("gl-ready");
  });

  /* ---------- Pointer: glitch on speed, a little depth on position ---------- */

  let last = { x: 0, y: 0, t: 0 };
  addEventListener(
    "pointermove",
    (e) => {
      const now = performance.now();
      const speed = Math.hypot(e.clientX - last.x, e.clientY - last.y) / Math.max(8, now - last.t);
      last = { x: e.clientX, y: e.clientY, t: now };
      S.client = { x: e.clientX, y: e.clientY };
      S.hasPointer = true;
      if (S.over) S.pointerGlitch = Math.max(S.pointerGlitch, Math.min(0.5, speed * 0.16));
      if (fine) S.parTo = { x: e.clientX / innerWidth - 0.5, y: e.clientY / innerHeight - 0.5 };
    },
    { passive: true }
  );
  // A tap on the photo (touch included) gives it a small jolt.
  addEventListener(
    "pointerdown",
    (e) => {
      const r = S.rect;
      if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        S.pointerGlitch = Math.max(S.pointerGlitch, 0.5);
      }
    },
    { passive: true }
  );
  html.addEventListener("mouseleave", () => {
    S.hasPointer = false;
    S.parTo = { x: 0, y: 0 };
  });

  /* ---------- Every frame: lay out the text around the photo, then draw it ---------- */

  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.min(64, deltaMs || 16);
    const decay = (v, tau) => (v > 0.002 ? v * Math.exp(-dt / tau) : 0);
    S.pointerGlitch = decay(S.pointerGlitch, 170);
    S.scrollGlitch = decay(S.scrollGlitch, 240);
    S.par.x += (S.parTo.x - S.par.x) * 0.06;
    S.par.y += (S.parTo.y - S.par.y) * 0.06;

    // Read.
    const st = stageEl.getBoundingClientRect();
    if (st.bottom <= 0 || st.top >= innerHeight) {
      S.rect = null;
      if (S.over) cursor?.setPhoto((S.over = false));
      return;
    }
    const sl = slot.getBoundingClientRect();
    const sx = sl.left - st.left, sy = sl.top - st.top;

    const g = easeInOut(clamp(S.d / GROW_VH));
    const hold = clamp((S.d - GROW_VH) / (STAGE_VH - GROW_VH));
    // Once the pin lets go, the photo trails the page and darkens as it leaves.
    const exit = clamp(-st.top / st.height);
    const rect = {
      x: lerp(sx, 0, g),
      y: lerp(sy, 0, g) + exit * st.height * 0.4,
      w: lerp(sl.width, st.width, g),
      h: lerp(sl.height, st.height, g),
    };

    // Write. The words ride the photo's edges out of frame as it grows.
    const px = S.par.x * (1 - g), py = S.par.y * (1 - g);
    if (S.introDone) {
      const key = `${rect.x.toFixed(1)},${rect.y.toFixed(1)},${rect.w.toFixed(1)},${rect.h.toFixed(1)},${px.toFixed(3)},${py.toFixed(3)}`;
      if (key !== S.textKey) {
        S.textKey = key;
        const mid = rect.y + rect.h / 2 - (sy + sl.height / 2);
        wordL.style.transform = `translate3d(${rect.x - sx}px, ${mid}px, 0)`;
        wordR.style.transform = `translate3d(${rect.x + rect.w - (sx + sl.width)}px, ${mid}px, 0)`;
        wordL.style.opacity = wordR.style.opacity = String(1 - smooth(0.6, 1, g));
        for (const el of tops) {
          el.style.transform = `translate3d(0, ${rect.y - sy}px, 0)`;
          el.style.opacity = String(1 - smooth(0.18, 0.5, g));
        }
        for (const el of bottoms) {
          el.style.transform = `translate3d(0, ${rect.y + rect.h - (sy + sl.height)}px, 0)`;
          el.style.opacity = String(1 - smooth(0, 0.3, g));
        }
        title.style.transform = `translate3d(${-px * 12}px, ${-py * 8}px, 0)`;
      }
    }

    const mouse = { x: S.client.x - st.left, y: S.client.y - st.top };
    const inPhoto = mouse.x >= rect.x && mouse.x <= rect.x + rect.w && mouse.y >= rect.y && mouse.y <= rect.y + rect.h;
    const over = S.hasPointer && S.reveal > 0.5 && inPhoto;
    if (over && !S.over) S.pointerGlitch = Math.max(S.pointerGlitch, 0.3);
    if (over !== S.over) cursor?.setPhoto((S.over = over));
    S.rect = { left: st.left + rect.x, top: st.top + rect.y, right: st.left + rect.x + rect.w, bottom: st.top + rect.y + rect.h };

    if (!gl?.ready) return;
    const glitch = clamp(Math.max(S.introGlitch, S.pointerGlitch, S.scrollGlitch, S.debugGlitch || 0));
    const state = {
      rect,
      radius: lerp(slotRadius, 0, g),
      zoom: lerp(INLINE_ZOOM, 1, g) + 0.05 * hold,
      focus: [FOCUS[0] + px * 0.04, FOCUS[1] + py * 0.04],
      glitch,
      spread: S.scrollGlitch > S.pointerGlitch ? 1 : 0,
      reveal: S.reveal,
      dim: 0.55 * smooth(0.2, 1, g) + 0.12 * hold,
      fade: exit * 0.85,
      mouse,
      time: time % 1000,
    };
    const key = [...Object.values(rect), state.reveal, glitch, ...state.focus, state.zoom, state.dim, state.fade]
      .map((n) => n.toFixed(4))
      .join();
    if (glitch > 0 || key !== S.drawKey) {
      S.drawKey = key;
      gl.draw(state);
      if (!html.classList.contains("gl-ready") && S.reveal > 0) html.classList.add("gl-ready");
    }
  });

  /* ---------- Scroll: pin the stage while the photo grows ---------- */

  // Pin straight away so an early scroll never meets a layout jump; if the
  // photo can't be drawn after all, drop the pin and keep the still layout.
  const pin =
    gl &&
    ScrollTrigger.create({
      trigger: stageEl,
      start: "top top",
      end: () => `+=${Math.round(innerHeight * STAGE_VH)}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate(self) {
        S.d = self.progress * STAGE_VH;
        if (S.d > 0 && S.d < GROW_VH + 0.1) {
          S.scrollGlitch = Math.max(S.scrollGlitch, Math.min(0.45, Math.abs(self.getVelocity()) / 4200));
        }
      },
    });

  ready.then((ok) => {
    if (ok) {
      if (S.reveal > 0) html.classList.add("gl-ready");
    } else if (pin) {
      pin.kill(true);
      html.classList.remove("has-stage");
      S.d = 0;
      ScrollTrigger.refresh();
    }
  });

  intro(S, { ready, lineIns, slotImg });
}

/* ---------- Intro: ~1.5s, once per visit, skipped by any input ---------- */

async function intro(S, { ready, lineIns, slotImg }) {
  if (!html.classList.contains("is-intro")) return;
  await Promise.race([Promise.all([document.fonts.ready, ready]), wait(1600)]);
  const glOK = await Promise.race([ready, wait(0).then(() => false)]);

  const skipOn = ["wheel", "touchstart", "keydown", "pointerdown"];
  const skip = () => tl.progress(1);
  const tl = gsap.timeline({
    defaults: { ease: "expo.out" },
    onComplete() {
      skipOn.forEach((e) => removeEventListener(e, skip));
      html.classList.remove("is-intro");
      gsap.set([".hero__dot", ".hero__eyebrow-text", ".hero__sub", ".nav", slotImg, ...lineIns], { clearProps: "opacity,visibility,transform" });
      S.reveal = 1;
      S.introGlitch = 0;
      S.introDone = true;
      store.set("sk:intro", "1");
    },
  });

  tl.fromTo(".hero__dot", { scale: 0 }, { scale: 1, duration: 0.6, ease: "back.out(2.4)" }, 0.1)
    .to(".hero__eyebrow-text", { opacity: 1, x: 0, duration: 0.8 }, 0.38)
    .fromTo(lineIns, { y: 0, yPercent: 140 }, { yPercent: 0, duration: 1.1, stagger: 0.12 }, 0.08);
  if (glOK) {
    tl.to(S, { reveal: 1, duration: 0.8, ease: "power3.out" }, 0.55)
      .fromTo(S, { introGlitch: 0.85 }, { introGlitch: 0, duration: 1.1, ease: "power2.out" }, 0.55);
  } else {
    tl.fromTo(slotImg, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: "power2.out" }, 0.55);
  }
  tl.to(".hero__sub", { opacity: 1, y: 0, duration: 0.9 }, 0.75)
    .to(".nav", { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.85);

  skipOn.forEach((e) => addEventListener(e, skip, { passive: true }));
  if (params.has("debug")) S.intro = tl;
}
