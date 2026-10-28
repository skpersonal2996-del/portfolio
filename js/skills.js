// How I make products better. On wide screens, as you scroll out of the
// hero, tiny Shruti shuts her laptop, stands up with it, her coffee vanishes,
// and she walks straight down the page while the heading rises in. When she
// reaches her spot (bottom right) the section pins: Product design appears,
// then a line draws a loop around it, each skill appearing as the line
// reaches it, until the loop closes. Then she walks on, down and to the
// left, into "But there's more", where a line draws across and its three
// points appear. On phones: lists, with a line drawn down the side.

import { FRONT, SIDE, STEP_A, STEP_B, BLINK, LOOK_L, LOOK_R } from "./life-sprites.js";
import { COLORS, HELD, WALK_L, WALK_R } from "./hero-girl.js";
import { $, $$ } from "./shared.js";

const { gsap, ScrollTrigger, SplitText } = window;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

const WIDE = "(min-width: 900px) and (min-height: 640px)";
const W = 15;
const H = 19;
// The beat at which she's up, laptop in hand and coffee gone, and the
// walker takes over from the hero's canvas (see hero-girl.js).
const SET_OFF = 0.24;

// Side on, the shut laptop tucked under her arm in front of her.
const HELD_SIDE = { 11: "..HHPPPTTTAA...", 12: "...HPPPTTSAA...", 13: "....PPPTTSAA..." };

// Draws tiny Shruti standing or walking, with overlays, optionally facing left.
function sprite(canvas) {
  const ctx = canvas.getContext("2d");
  let px = 1;
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    px = Math.max(1, Math.round((canvas.clientWidth / W) * dpr));
    canvas.width = W * px;
    canvas.height = H * px;
  };
  const draw = (rows, over = [], flip = false) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    rows.forEach((row, y) => {
      for (const o of over) if (o[y]) row = o[y];
      [...row].forEach((c, x) => {
        const color = COLORS[c];
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect((flip ? W - 1 - x : x) * px, y * px, px, px);
      });
    });
  };
  size();
  addEventListener("resize", size);
  return draw;
}

export function skills({ reduced, heroGirl }) {
  const section = $("[data-skills]");
  if (!section || !gsap) return;
  const ring = $("[data-skills-ring]", section);
  const svg = $(".skills__loop", section);
  const path = $("[data-skills-path]", section);
  const items = $$("[data-skill]", section);
  const core = $(".skill--core .skill__text", section);
  const title = $(".skills__title", section);
  const girl = $("[data-skills-girl]", section);
  const walker = $("[data-walker]");
  const more = $("[data-more]");
  const heroCanvas = $("[data-hero-girl]");

  const mm = gsap.matchMedia();

  /* ---------- Wide: the walk and the loop ---------- */

  mm.add(WIDE, () => {
    let length = 0;
    let drawn = 0;

    // The loop, drawn in the ring's own pixels: a soft, slightly uneven
    // ellipse that starts just before the first skill, goes clockwise and
    // runs a little past where it began, like a line drawn by hand. Each
    // skill sits at its angle on it; its share of the length is when the
    // line reaches it.
    const build = () => {
      const w = ring.clientWidth;
      const h = ring.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const at = (deg) => {
        const t = (deg * Math.PI) / 180;
        const r = 1 + 0.025 * Math.sin(3 * t + 0.6);
        return [w / 2 + (w / 2) * r * Math.cos(t), h / 2 + (h / 2) * r * Math.sin(t)];
      };
      const START = 166;
      const END = 552;
      const pts = [];
      const lens = [];
      let total = 0;
      for (let deg = START; deg <= END; deg += 2) {
        const p = at(deg);
        if (pts.length) total += Math.hypot(p[0] - pts.at(-1)[0], p[1] - pts.at(-1)[1]);
        pts.push(p);
        lens.push(total);
      }
      path.setAttribute("d", "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L"));
      length = total;
      path.style.strokeDasharray = `${length} ${length}`;
      items.forEach((item) => {
        const deg = Number(item.dataset.angle);
        const [x, y] = at(deg);
        item.style.setProperty("--x", `${x}px`);
        item.style.setProperty("--y", `${y}px`);
        item.share = lens[Math.round((deg - START) / 2)] / total;
      });
    };

    const draw = (f) => {
      path.style.strokeDashoffset = `${length * (1 - f)}`;
      items.forEach((item) => item.classList.toggle("is-on", f >= item.share - 0.002));
    };

    build();
    draw(0);
    const onResize = () => (build(), draw(drawn));
    addEventListener("resize", onResize);

    const idle = idleGirl(girl, reduced);

    if (reduced) {
      draw((drawn = 1));
      idle.show(true);
      if (more) moreWide({ more, reduced });
      return () => removeEventListener("resize", onResize);
    }

    // The heading rises in word by word while she walks down to it.
    const split = SplitText?.create(title, { type: "words", mask: "words" });
    const heading = gsap.fromTo(split ? split.words : title, { yPercent: 110, opacity: 0 }, {
      yPercent: 0,
      opacity: 1,
      stagger: 0.12,
      ease: "power2.out",
      scrollTrigger: { trigger: section, start: "top 80%", end: "top 25%", scrub: 0.6 },
    });

    // Pinned from the moment she arrives: Product design comes up first,
    // then the loop draws all the way round.
    // (CSS's own scale, so it doesn't fight the centring transform.)
    const showCore = (c) => {
      core.style.opacity = c;
      core.style.scale = lerp(0.9, 1, 1 - (1 - c) ** 3);
    };
    showCore(0);
    const pin = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=200%",
      pin: true,
      onUpdate(self) {
        showCore(clamp(self.progress / 0.14));
        draw((drawn = clamp((self.progress - 0.18) / 0.78)));
      },
    });

    const walkDraw = walker ? sprite(walker) : null;
    const walk = walkIn({ walker, draw: walkDraw, heroCanvas, girl, section, heroGirl, idle });
    const next = more ? moreWide({ more, reduced, walker, draw: walkDraw, idle, girl, after: pin }) : null;

    return () => {
      removeEventListener("resize", onResize);
      pin.kill();
      walk.kill();
      next?.();
      heading.scrollTrigger?.kill();
      split?.revert();
      core.style.opacity = core.style.scale = "";
      idle.show(false);
      heroGirl?.leave(0);
      items.forEach((item) => item.classList.remove("is-on"));
    };
  });

  /* ---------- Phones: the list ---------- */

  mm.add(`not all and ${WIDE}`, () => {
    const list = $(".skills__list", section);
    if (reduced) return;
    const draw = gsap.fromTo(list, { "--draw": 0 }, {
      "--draw": 1,
      ease: "none",
      scrollTrigger: { trigger: list, start: "top 80%", end: "bottom 65%", scrub: true },
    });
    const rises = [...$$(".skill", section), ...$$("[data-more-item]")].map((el) =>
      gsap.from(el, { y: 20, opacity: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } }),
    );
    return () => [draw, ...rises].forEach((t) => t.scrollTrigger?.kill());
  });
}

/* ---------- The walk down from the hero ---------- */

// From the top of the page to the moment the section pins. The first beats
// play in the hero's own canvas (laptop shut, standing, coffee gone); then
// she's drawn on a canvas fixed to the screen, walking toward you, moving
// from where she stood to her spot in the section while the page scrolls up
// past her, so she walks straight down it. Scroll back and it all reverses.
function walkIn({ walker, draw, heroCanvas, girl, section, heroGirl, idle }) {
  if (!walker || !heroCanvas || !girl) return { kill() {} };
  let from = null;
  let to = null;
  let distance = 1;

  // Where she sets off (on the screen, at the scroll she sets off) and
  // where she stops (her spot once the section has pinned).
  const measure = () => {
    const a = heroCanvas.getBoundingClientRect();
    const b = girl.getBoundingClientRect();
    const s = section.getBoundingClientRect();
    const px = heroCanvas.clientWidth / 21;
    const startScroll = SET_OFF * distance;
    from = { x: a.left, y: a.top + scrollY + px - startScroll };
    to = { x: b.left, y: b.top - s.top };
  };

  const place = (p) => {
    heroGirl?.leave(p);
    const walking = p >= SET_OFF && p < 1;
    walker.classList.toggle("is-on", walking);
    idle.show(p >= 1);
    if (!walking) return;
    if (!from) measure();
    const q = (p - SET_OFF) / (1 - SET_OFF);
    walker.style.transform = `translate3d(${lerp(from.x, to.x, q).toFixed(1)}px, ${lerp(from.y, to.y, q).toFixed(1)}px, 0)`;
    const step = Math.floor(scrollY / 26) % 2;
    draw(FRONT, [HELD, step ? WALK_L : WALK_R]);
  };

  const st = ScrollTrigger.create({
    trigger: document.body,
    start: 0,
    endTrigger: section,
    end: "top top",
    onUpdate: (self) => place(self.progress),
    onRefresh: (self) => {
      distance = self.end - self.start;
      from = null;
      place(self.progress);
    },
  });
  distance = st.end - st.start;
  place(st.progress);
  return st;
}

/* ---------- But there's more (wide screens) ---------- */

// Its heading rises while she walks to it; once she's there it pins, and a
// line draws across with the three points appearing as it reaches each.
function moreWide({ more, reduced, walker, draw, idle, girl, after }) {
  const line = $("[data-more-line]", more);
  const items = $$("[data-more-item]", more);
  const spot = $("[data-more-girl]", more);
  const here = idleGirl(spot, reduced);
  const reach = (f) => {
    line.style.setProperty("--draw", f);
    // Each point sits at the start of its column, so the line reaches it there.
    const row = line.getBoundingClientRect();
    items.forEach((item) => {
      const at = (item.getBoundingClientRect().left - row.left) / row.width;
      item.classList.toggle("is-on", f > 0 && f >= at);
    });
  };
  if (reduced) {
    reach(1);
    here.show(true);
    return () => {};
  }
  reach(0);

  const title = $(".more__title", more);
  const split = SplitText?.create(title, { type: "words", mask: "words" });
  const heading = gsap.fromTo(split ? split.words : title, { yPercent: 110, opacity: 0 }, {
    yPercent: 0,
    opacity: 1,
    stagger: 0.12,
    ease: "power2.out",
    scrollTrigger: { trigger: more, start: "top 80%", end: "top 25%", scrub: 0.6 },
  });
  const pin = ScrollTrigger.create({
    trigger: more,
    start: "top top",
    end: "+=120%",
    pin: true,
    onUpdate: (self) => reach(clamp(self.progress / 0.8)),
  });
  const walk = walkOn({ walker, draw, from: girl, fromIdle: idle, to: spot, toIdle: here, section: more, after });
  const exit = walkOff({ walker, draw, spot, idle: here, section: more, after: pin });

  return () => {
    pin.kill();
    walk.kill();
    exit.kill();
    heading.scrollTrigger?.kill();
    split?.revert();
    here.show(false);
    reach(0);
  };
}

// From her spot in the skills (bottom right) to her spot in "But there's
// more" (bottom left): after the skills unpin, she walks toward you while
// the page scrolls up past her, then turns and walks left across the screen,
// arriving as the next section pins.
function walkOn({ walker, draw, from, fromIdle, to, toIdle, section, after }) {
  if (!walker || !draw || !from || !to) return { kill() {} };
  let a = null;
  let b = null;
  const measure = () => {
    // Both spots as they are on the screen while their section is pinned.
    const fs = from.closest("section").getBoundingClientRect();
    const fr = from.getBoundingClientRect();
    const tr = to.getBoundingClientRect();
    const ts = section.getBoundingClientRect();
    a = { x: fr.left, y: fr.top - fs.top };
    b = { x: tr.left, y: tr.top - ts.top };
  };
  const place = (p) => {
    const walking = p > 0 && p < 1;
    fromIdle.show(p <= 0);
    toIdle.show(p >= 1);
    walker.classList.toggle("is-on", walking);
    if (!walking) return;
    if (!a) measure();
    const step = Math.floor(scrollY / 26) % 2;
    let x;
    let y;
    if (p < 0.45) {
      // Down: she stays put on the screen as the page passes, facing you.
      x = a.x;
      y = lerp(a.y, b.y, p / 0.45);
      draw(FRONT, [HELD, step ? WALK_L : WALK_R]);
    } else {
      // Left: side on, across the screen.
      x = lerp(a.x, b.x, (p - 0.45) / 0.55);
      y = b.y;
      draw(SIDE, [step ? STEP_A : STEP_B, HELD_SIDE], b.x < a.x);
    }
    walker.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };
  const st = ScrollTrigger.create({
    start: () => after.end,
    endTrigger: section,
    end: "top top",
    onUpdate: (self) => place(self.progress),
    onRefresh: (self) => {
      a = null;
      place(self.progress);
    },
  });
  place(st.progress);
  return st;
}

// Once the three points are out, she turns left and walks off the screen,
// before "Things I've made" comes up.
function walkOff({ walker, draw, spot, idle, section, after }) {
  if (!walker || !draw || !spot) return { kill() {} };
  let a = null;
  const place = (p) => {
    const walking = p > 0 && p < 1;
    idle.show(p <= 0);
    walker.classList.toggle("is-on", walking);
    if (!walking) return;
    if (!a) {
      const r = spot.getBoundingClientRect();
      a = { x: r.left, y: r.top - section.getBoundingClientRect().top };
    }
    const x = lerp(a.x, -walker.clientWidth - 24, p);
    walker.style.transform = `translate3d(${x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
    draw(SIDE, [Math.floor(scrollY / 26) % 2 ? STEP_A : STEP_B, HELD_SIDE], true);
  };
  const st = ScrollTrigger.create({
    start: () => after.end,
    end: () => after.end + innerHeight * 0.4,
    onUpdate: (self) => place(self.progress),
    onRefresh: (self) => {
      a = null;
      place(self.progress);
    },
  });
  place(st.progress);
  return st;
}

/* ---------- Standing in the section ---------- */

// Once she's there: standing with her laptop, blinking, glancing at the
// skills now and then.
function idleGirl(canvas, reduced) {
  if (!canvas) return { show() {} };
  const draw = sprite(canvas);
  let on = false;
  let tween = null;
  const glance = [null, null, LOOK_L, null, LOOK_R, null];
  let i = 0;
  const pose = (...over) => draw(FRONT, [HELD, ...over]);
  const frame = () => {
    const look = glance[i++ % glance.length];
    look ? pose(look) : pose();
  };
  return {
    show(v) {
      if (v === on) return;
      on = v;
      canvas.classList.toggle("is-here", v);
      tween?.kill();
      tween = null;
      if (!v) return;
      pose();
      if (reduced) return;
      // A blink every few seconds, a glance every other beat.
      tween = gsap.timeline({ repeat: -1, repeatDelay: 1.6 })
        .call(frame)
        .call(() => pose(BLINK), null, 2.4)
        .call(() => pose(), null, 2.55);
    },
  };
}

/* ---------- Into "Outside of work" ---------- */

// Eyes down, at the box below her.
const LOOK_DOWN = { 5: "..HHSSSSSSSHH..", 6: "..HHSESSSESHH.." };

// After the roles, she walks in from the left a little above the section's
// heading, stops over the box's middle, looks down into it and hops in,
// dropping past the heading. As she drops through the edge she's hidden below it, and the box's
// own tiny Shruti appears inside (onLand). Wide screens only; once she's
// in, she stays in.
export function jumpIn({ box, onLand }) {
  const walker = $("[data-walker]");
  if (!walker || !box || !gsap || !matchMedia(WIDE).matches) return false;
  const draw = sprite(walker);
  let jumping = false;
  let landed = false;

  const at = (x, y, cut = 0) => {
    walker.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    walker.style.clipPath = cut > 0 ? `inset(0 0 ${cut.toFixed(1)}px 0)` : "";
  };
  // Her spot: a clear gap above the heading ("Pick something around her"),
  // over the box's middle; edge is the box's top, where she drops out of view.
  const head = box.closest("section")?.querySelector(".life__head") || box;
  const GAP = 36;
  const spot = () => {
    const r = box.getBoundingClientRect();
    const h = head.getBoundingClientRect();
    return { x: r.left + r.width / 2 - walker.clientWidth / 2, y: h.top - GAP - walker.clientHeight, edge: r.top };
  };

  const jump = () => {
    jumping = true;
    const s = spot();
    const hop = { y: 0 };
    const fall = (y) => {
      const now = spot();
      const top = now.y + y;
      at(s.x, top, top + walker.clientHeight - now.edge);
    };
    gsap.timeline({
      onComplete() {
        jumping = false;
        landed = true;
        walker.classList.remove("is-on");
        at(0, 0);
        onLand?.();
      },
    })
      .add(() => draw(FRONT, [HELD, LOOK_DOWN]))
      .to(hop, { y: -walker.clientHeight * 0.35, duration: 0.3, ease: "power2.out", onUpdate: () => fall(hop.y) }, 0.12)
      .to(hop, { y: () => s.edge - s.y + walker.clientHeight * 0.2, duration: 0.55, ease: "power2.in", onUpdate: () => fall(hop.y) });
  };

  const place = (p) => {
    if (landed || jumping) return;
    walker.classList.toggle("is-on", p > 0);
    if (p <= 0) return;
    const s = spot();
    if (p < 0.6) {
      // Walking in from the left, side on.
      const x = lerp(-walker.clientWidth - 24, s.x, p / 0.6);
      draw(SIDE, [Math.floor(scrollY / 26) % 2 ? STEP_A : STEP_B, HELD_SIDE]);
      return at(x, s.y);
    }
    // Stopped over the middle, looking down into the box.
    at(s.x, s.y);
    draw(FRONT, [HELD, LOOK_DOWN]);
    if (p >= 0.8) jump();
  };

  ScrollTrigger.create({
    trigger: box,
    start: "top 92%",
    end: "top 40%",
    onUpdate: (self) => place(self.progress),
    onLeave: () => place(1),
  });
  return true;
}
