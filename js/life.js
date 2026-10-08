// "Outside of work": tiny pixel Shruti in a box, with five things floating
// around her. Pick one (hover, click, tap or keyboard) and she does it while
// her line appears in a speech bubble:
//   camera    she takes a photo, and it drops to the floor
//   book      she sits down and reads
//   clothes   she spins into another outfit, and keeps it
//   pencil    she draws something terrible on an easel
//   suitcase  she walks somewhere new; the world scrolls past
// Everything is drawn on one canvas in chunky pixels at 12 frames a second,
// and only while the box is on screen and something changes.

import * as P from "./life-sprites.js";

const TICK = 1000 / 12;
const GROUND = "#2E2824";
const PEBBLE = "#221E1A";
const SPRITE_W = 15;

const blank = (w) => ".".repeat(w);
// A well-mixed integer hash, 0..1: which pixels arrive first, where pebbles lie.
const hash = (i, j) => {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const POSE = {
  front: P.FRONT,
  breathe: [blank(SPRITE_W), ...P.FRONT.slice(0, 13), ...P.FRONT.slice(14)],
  blink: P.withRows(P.FRONT, P.BLINK),
  lookL: P.withRows(P.FRONT, P.LOOK_L),
  lookR: P.withRows(P.FRONT, P.LOOK_R),
  back: P.BACK,
  side: P.SIDE,
  sideL: P.mirror(P.SIDE),
  walkL1: P.mirror(P.withRows(P.SIDE, P.STEP_A)),
  walkL2: P.mirror(P.withRows(P.SIDE, P.STEP_B)),
  pull: P.withRows(P.SIDE, P.PULL),
  pullA: P.withRows(P.withRows(P.SIDE, P.STEP_A), P.PULL),
  pullB: P.withRows(P.withRows(P.SIDE, P.STEP_B), P.PULL),
  camera: P.over(P.FRONT, P.CAMERA),
  snap: P.withRows(P.over(P.FRONT, P.CAMERA), { 4: "......ZZ......." }),
  squat: P.SQUAT,
  sit: P.SIT,
  page1: P.withRows(P.SIT, P.PAGE_1),
  page2: P.withRows(P.SIT, P.PAGE_2),
  sitNext: P.withRows(P.SIT, P.PAGE_NEXT),
  draw: P.withRows(P.SIDE, P.DRAW),
  drawUp: P.withRows(P.SIDE, P.DRAW_UP),
};
const COLORS = P.OUTFITS.map((o) => ({ ...P.PALETTE, ...o }));

// The places she passes, in order: [sprite, spacing before it]. Mountains sit
// further back and move slower.
const NEAR = [P.PALM, P.TOWER, P.CACTUS, P.LIGHTHOUSE];
const NEAR_GAP = 46;
const FAR_GAP = 88;

export function createLife(section, { gsap, ScrollTrigger, reduced = false }) {
  const html = document.documentElement;
  const box = section.querySelector("[data-life-box]");
  const canvas = section.querySelector("[data-life-scene]");
  const bubble = section.querySelector("[data-life-bubble]");
  const say = section.querySelector("[data-life-say]");
  const flashEl = section.querySelector("[data-life-flash]");
  const items = [...section.querySelectorAll("[data-thing]")];
  const ctx = canvas?.getContext("2d");
  if (!box || !ctx || !bubble || !say || !items.length) return null;
  html.classList.add("has-life");

  const LINES = Object.fromEntries(items.map((li) => [li.dataset.thing, li.querySelector(".life__line").textContent.trim()]));

  /* ---------- Layout: the art grid and its pixel size ---------- */

  // p is one art pixel in device pixels, always a whole number so the art
  // stays crisp; gw × gh is the grid, and floor is the row she stands on.
  const L = { k: 1, p: 6, gw: 0, gh: 0, ox: 0, oy: 0, cx: 0, floor: 0 };
  const layout = () => {
    const w = box.clientWidth;
    const h = box.clientHeight;
    const s = w >= 1100 ? 8 : w >= 700 ? 6 : 5;
    L.k = Math.min(window.devicePixelRatio || 1, 2);
    L.p = Math.max(2, Math.round(s * L.k));
    canvas.width = Math.round(w * L.k);
    canvas.height = Math.round(h * L.k);
    L.gw = Math.floor(canvas.width / L.p);
    L.gh = Math.floor(canvas.height / L.p);
    L.ox = Math.floor((canvas.width - L.gw * L.p) / 2);
    L.oy = Math.floor((canvas.height - L.gh * L.p) / 2);
    L.cx = Math.floor(L.gw / 2);
    L.floor = L.gh - Math.ceil(((h < 560 ? 64 : 84) * L.k) / L.p);
    box.style.setProperty("--px", `${L.p / L.k}px`);
    for (const li of items) {
      const icon = li.querySelector(".life__icon");
      const rows = P.ICONS[li.dataset.thing];
      if (!icon || !rows) continue;
      icon.width = 12 * L.p;
      icon.height = rows.length * L.p;
      icon.style.width = `${(12 * L.p) / L.k}px`;
      icon.style.height = `${(rows.length * L.p) / L.k}px`;
      P.paint(icon.getContext("2d"), rows, 0, 0, L.p, P.PALETTE);
    }
    dirty = true;
  };

  /* ---------- State ---------- */

  const S = {
    on: false,
    appeared: false,
    reveal: reduced ? 1 : 0,
    act: null, // { name, f }
    pose: "front",
    y: 0, // a small hop
    dx: 0, // her offset from the centre, in art pixels
    outfit: 0,
    photos: [], // { x, y, vx, vy, rest }, x from the centre, y from the floor
    easel: null, // { x, drawn }
    bag: null, // "pull" while walking, "stand" once she's arrived
    world: 0, // how far she has walked, in ground pixels
    sparkles: [],
    flash: 0,
    pageAlt: false,
    idle: { f: 0, blink: 30, look: 70, lookEnd: 0, dir: 1 },
    last: { name: "", at: 0 },
  };
  let dirty = true;
  // ?debug: inspect the state, hold the clock, and step frames by hand.
  if (new URLSearchParams(location.search).has("debug")) {
    window.__life = S;
    window.__lifeStep = (n = 1) => {
      for (let i = 0; i < n; i++) step();
      render();
    };
  }

  const set = (pose) => {
    if (S.pose !== pose) {
      S.pose = pose;
      dirty = true;
    }
  };

  /* ---------- What she does ---------- */

  const end = () => {
    S.act = null;
    S.y = 0;
    Object.assign(S.idle, { f: 0, blink: 24, look: 60, lookEnd: 0 });
    set("front");
  };

  const ACTIONS = {
    camera(f) {
      if (f === 1) set("camera");
      if (f === 6) {
        set("snap");
        S.flash = 3;
        if (flashEl) gsap.fromTo(flashEl, { opacity: 0.16 }, { opacity: 0, duration: 0.4, ease: "power2.out" });
      }
      if (f === 8) {
        set("camera");
        const side = S.photos.length % 2 ? 1 : -1;
        S.photos.push({ x: S.dx + side, y: -17, vx: side * 1.2, vy: -1.6, rest: false });
        if (S.photos.length > 3) S.photos.shift();
      }
      if (f >= 24) end();
    },
    book(f) {
      if (f === 1) set("squat");
      if (f === 2) set("sit");
      for (const at of [16, 32]) {
        if (f === at) set("page1");
        if (f === at + 1) set("page2");
        if (f === at + 2) {
          S.pageAlt = !S.pageAlt;
          set(S.pageAlt ? "sitNext" : "sit");
        }
      }
      if (f === 48) set("squat");
      if (f >= 49) end();
    },
    clothes(f) {
      const spin = ["side", "back", "sideL", "front"];
      if (f === 2) S.outfit = (S.outfit + 1) % P.OUTFITS.length;
      if (f <= 4) set(spin[f - 1]);
      if (f === 4) sparkle(7);
      if (f === 5) S.y = -1;
      if (f === 7) S.y = 0;
      dirty = true;
      if (f >= 16) end();
    },
    pencil(f) {
      // A few steps to the left, to make room for the easel.
      if (f <= 4) {
        set(f % 2 ? "walkL1" : "walkL2");
        S.dx = Math.max(-8, S.dx - 2);
      }
      if (f === 5) {
        set("side");
        S.easel = { x: S.dx + 7, drawn: 0 };
      }
      if (f >= 7 && f <= 36) {
        set(f % 4 < 2 ? "draw" : "drawUp");
        S.easel.drawn = Math.min(P.DOODLE.length, Math.round((f - 6) * 1.2));
        dirty = true;
      }
      if (f === 37) set("side");
      if (f === 41) set("lookR"); // turns round, glancing at it
      if (f === 50) set("front");
      if (f >= 52) end();
    },
    suitcase(f) {
      if (f === 1) {
        set("pull");
        S.bag = "pull";
      }
      if (f >= 3 && f <= 58) {
        const a = f % 4 < 2;
        set(a ? "pullA" : "pullB");
        S.y = a ? 0 : -1;
        S.world += 2;
        for (const ph of S.photos) ph.x -= 2;
        if (S.easel) S.easel.x -= 2;
        S.photos = S.photos.filter((ph) => ph.x > -L.gw);
        if (S.easel && S.easel.x < -L.gw) S.easel = null;
        dirty = true;
      }
      if (f === 59) {
        set("pull");
        S.y = 0;
      }
      if (f === 62) {
        set("front");
        S.bag = "stand";
      }
      if (f >= 64) end();
    },
  };

  // Reduced motion: no animation, just the moment that sums it up.
  const STILL = {
    camera() {
      set("camera");
      S.photos = [{ x: S.dx - 10, y: -6, rest: true }];
    },
    book() {
      set("sit");
    },
    clothes() {
      S.outfit = (S.outfit + 1) % P.OUTFITS.length;
      set("front");
    },
    pencil() {
      S.dx = -8;
      S.easel = { x: -1, drawn: P.DOODLE.length };
      set("draw");
    },
    suitcase() {
      S.world += 112;
      S.photos = [];
      S.easel = null;
      S.bag = "pull";
      set("pull");
    },
  };

  const sparkle = (n) => {
    for (let i = 0; i < n; i++) {
      S.sparkles.push({ x: S.dx + Math.round((Math.random() - 0.5) * 26), y: -Math.round(3 + Math.random() * 20), age: -Math.floor(Math.random() * 3) });
    }
  };

  function play(name, force = false) {
    if (!ACTIONS[name]) return;
    if (!S.appeared) appear(true);
    const now = performance.now();
    // Hover then click on the same thing counts once.
    if (S.last.name === name && now - S.last.at < 450) return;
    if (S.act?.name === name && !force) return;
    S.last = { name, at: now };

    if (name !== "pencil" && name !== "suitcase") {
      S.dx = 0;
      S.easel = null;
    }
    if (name !== "suitcase") S.bag = null;
    S.y = 0;
    for (const li of items) li.classList.toggle("is-active", li.dataset.thing === name);
    speak(LINES[name]);
    if (reduced) {
      S.act = null;
      STILL[name]();
      dirty = true;
      render();
      return;
    }
    S.act = { name, f: 0 };
    dirty = true;
  }

  function idle() {
    if (reduced) return;
    const I = S.idle;
    I.f++;
    let pose = I.f % 30 >= 20 ? "breathe" : "front";
    if (I.f >= I.look && I.f < I.lookEnd) pose = I.dir < 0 ? "lookL" : "lookR";
    if (I.f === I.look) {
      I.lookEnd = I.look + 8 + Math.floor(Math.random() * 8);
      I.dir = Math.random() < 0.5 ? -1 : 1;
      pose = I.dir < 0 ? "lookL" : "lookR";
    }
    if (I.f >= I.lookEnd && I.lookEnd) {
      I.look = I.f + 50 + Math.floor(Math.random() * 60);
      I.lookEnd = 0;
    }
    if (I.f === I.blink || I.f === I.blink + 1) pose = "blink";
    if (I.f > I.blink + 1) I.blink = I.f + 26 + Math.floor(Math.random() * 40);
    set(pose);
  }

  function step() {
    if (S.reveal < 1) {
      S.reveal = Math.min(1, S.reveal + 0.08);
      dirty = true;
      if (S.reveal >= 1) arrived();
      return;
    }
    // Things in flight: photos falling, sparkles, the flash.
    for (const ph of S.photos) {
      if (ph.rest) continue;
      ph.vy += 0.45;
      ph.x += ph.vx;
      ph.y += ph.vy;
      if (ph.y >= -6) {
        ph.y = -6;
        ph.rest = true;
      }
      dirty = true;
    }
    if (S.sparkles.length) {
      for (const sp of S.sparkles) sp.age++;
      S.sparkles = S.sparkles.filter((sp) => sp.age < 6);
      dirty = true;
    }
    if (S.flash > 0) {
      S.flash--;
      dirty = true;
    }
    const a = S.act;
    if (!a) return idle();
    a.f++;
    ACTIONS[a.name](a.f);
  }

  /* ---------- Drawing ---------- */

  const easelRows = (n) => {
    const rows = P.EASEL.map((r) => [...r]);
    for (let i = 0; i < n; i++) {
      const [x, y] = P.DOODLE[i];
      rows[y][x] = "X";
    }
    return rows.map((r) => r.join(""));
  };

  function render() {
    dirty = false;
    const { p, ox, oy, gw, cx, floor } = L;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const colors = COLORS[S.outfit];
    const put = (rows, x, y, opts = {}) => P.paint(ctx, rows, x, y, p, opts.colors || colors, { ox, oy, ...opts });

    // Far away: mountains, slow. Nearer: the places she passes.
    const far = S.world / 4;
    for (let i = Math.max(0, Math.floor((far - gw) / FAR_GAP)); ; i++) {
      const x = Math.round(gw + 30 + i * FAR_GAP - far);
      if (x > gw) break;
      put(P.MOUNTAINS, x, floor - P.MOUNTAINS.length, { colors: P.LAND_COLORS });
    }
    const near = S.world / 2;
    for (let i = Math.max(0, Math.floor((near - gw) / NEAR_GAP)); ; i++) {
      const x = Math.round(gw + 8 + i * NEAR_GAP - near);
      if (x > gw) break;
      const art = NEAR[i % NEAR.length];
      put(art, x, floor - art.length, { colors: P.LAND_COLORS });
    }

    // The ground, and pebbles that pass under her feet as she walks.
    ctx.fillStyle = GROUND;
    ctx.fillRect(ox, oy + floor * p, gw * p, p);
    ctx.fillStyle = PEBBLE;
    const first = Math.floor(S.world / 6);
    for (let n = first; n < first + gw / 6 + 2; n++) {
      const x = Math.round(n * 6 + hash(n, 1) * 4 - S.world);
      if (x < 0 || x >= gw) continue;
      ctx.fillRect(ox + x * p, oy + (floor + 1 + (hash(n, 2) > 0.6 ? 1 : 0)) * p, p, p);
    }

    for (const ph of S.photos) put(P.PHOTO, Math.round(cx + ph.x) - 2, floor + Math.round(ph.y));
    if (S.easel) put(easelRows(S.easel.drawn), cx + S.easel.x, floor - P.EASEL.length);

    const rows = POSE[S.pose];
    const hx = cx + S.dx - 7;
    const hy = floor - rows.length + S.y;
    if (S.bag === "pull") put(P.SUITCASE, hx - 3, floor - P.SUITCASE.length);
    if (S.bag === "stand") put(P.SUITCASE_UP, hx - 6, floor - P.SUITCASE_UP.length);
    put(rows, hx, hy, {
      stripes: P.OUTFITS[S.outfit].stripes,
      keep: S.reveal < 1 ? (i, j) => hash(i, j) < S.reveal : null,
    });

    // The camera's flash: a few rays from its top.
    if (S.flash > 0) {
      const fx = hx + 6;
      const fy = hy + 4;
      const rays = S.flash > 1 ? [[-2, -2], [-3, -3], [3, -2], [4, -3], [0, -2], [1, -3], [-3, 0], [4, 0]] : [[-2, -2], [3, -2], [0, -2]];
      ctx.fillStyle = P.PALETTE.Z;
      for (const [dx, dy] of rays) ctx.fillRect(ox + (fx + dx) * p, oy + (fy + dy) * p, p, p);
    }
    // Sparkles: a dot, a small plus, a dot.
    ctx.fillStyle = P.PALETTE.Z;
    for (const sp of S.sparkles) {
      if (sp.age < 0) continue;
      const x = cx + sp.x;
      const y = floor + sp.y;
      ctx.fillRect(ox + x * p, oy + y * p, p, p);
      if (sp.age >= 2 && sp.age < 4) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillRect(ox + (x + dx) * p, oy + (y + dy) * p, p, p);
      }
    }

    S.head = [hx, hy];
    placeBubble();
  }

  // The bubble rides just above her head, kept inside the box; its tail still
  // points at her if it has to shift.
  function placeBubble() {
    if (!S.head) return;
    const [hx, hy] = S.head;
    const head = (L.ox + (hx + 7.5) * L.p) / L.k;
    const half = bubble.offsetWidth / 2;
    const left = Math.min(Math.max(head, half + 12), box.clientWidth - half - 12);
    bubble.style.left = `${left}px`;
    bubble.style.top = `${(L.oy + (hy - 2) * L.p) / L.k}px`;
    bubble.style.setProperty("--tail", `${Math.round(head - left)}px`);
  }

  /* ---------- The speech bubble ---------- */

  let typing = 0;
  function speak(text) {
    clearInterval(typing);
    bubble.classList.add("is-on");
    bubble.classList.toggle("is-ask", text === "?");
    if (reduced) {
      say.textContent = text;
      placeBubble();
      return;
    }
    // The full line is laid out from the start, so the bubble never resizes
    // while the letters type in.
    const shown = document.createElement("span");
    const rest = document.createElement("span");
    rest.className = "life__ghost";
    rest.textContent = text;
    say.replaceChildren(shown, rest);
    placeBubble();
    let i = 0;
    typing = setInterval(() => {
      i = Math.min(text.length, i + 2);
      shown.textContent = text.slice(0, i);
      rest.textContent = text.slice(i);
      if (i >= text.length) clearInterval(typing);
    }, 28);
    gsap.fromTo(bubble, { scale: 0.86 }, { scale: 1, duration: 0.22, ease: "steps(3)" });
  }

  /* ---------- Arriving ---------- */

  // She materialises pixel by pixel as the box scrolls in; picking something
  // before she's done finishes it at once.
  let appearing = false;
  function appear(now = false) {
    appearing = true;
    if (now || reduced) {
      S.reveal = 1;
      arrived();
    }
  }
  function arrived() {
    if (S.appeared) return;
    S.appeared = true;
    dirty = true;
    if (!reduced) {
      gsap.to(items, { opacity: 1, y: 0, duration: 0.3, ease: "steps(3)", stagger: 0.09, overwrite: true });
    }
    gsap.delayedCall(reduced ? 0 : 0.6, () => {
      if (!S.last.name) speak("?");
    });
  }

  /* ---------- Wiring ---------- */

  for (const li of items) {
    const btn = li.querySelector(".life__btn");
    const name = li.dataset.thing;
    let hover = 0;
    btn.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      hover = setTimeout(() => play(name), 120);
    });
    btn.addEventListener("pointerleave", () => clearTimeout(hover));
    btn.addEventListener("click", () => {
      clearTimeout(hover);
      play(name, true);
    });
    btn.addEventListener("focus", () => {
      if (btn.matches(":focus-visible")) play(name);
    });
  }

  layout();
  let resizeRaf = 0;
  addEventListener("resize", () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      layout();
      render();
    });
  });

  if (reduced) {
    appear(true);
    render();
    return S;
  }

  // Before she arrives, the things wait just above their places, unseen
  // (still focusable, so keyboard users can reach them straight away).
  gsap.set(items, { opacity: 0, y: () => -3 * (L.p / L.k) });
  ScrollTrigger.create({
    trigger: box,
    start: "top 80%",
    end: "bottom top",
    onEnter: () => appear(),
    onToggle: (self) => (S.on = self.isActive),
  });

  let acc = 0;
  gsap.ticker.add((time, deltaMs) => {
    if (!S.on || !appearing || S.hold) return;
    acc += Math.min(deltaMs || 16, 100);
    while (acc >= TICK) {
      acc -= TICK;
      step();
    }
    if (dirty) render();
  });
  return S;
}
