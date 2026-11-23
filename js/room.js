// "Selected work" as a room you walk through, after regisgrumberg.com's
// tunnel. Under the heading there's a door; the section pins, and scrolling
// walks you through it, past three projects framed on the walls (turning
// toward each as you pass, the path bending gently), and out of the far
// door into the dark. Tiny Shruti walks it with you, stopping to look up at
// each picture, and stays behind in the room. Drawn in CSS 3D: grey walls,
// darker floor and ceiling, the projects hung as framed cards. Wide screens
// only.

import { $, $$ } from "./shared.js";
import { sprite, pose } from "./walker.js";

const { gsap, ScrollTrigger } = window;
const WIDE = "(min-width: 900px) and (min-height: 640px)";

// The room, in units of the screen's height: the eye sits at the middle,
// the perspective is one unit, the room 1.8 wide, 1.3 tall and 5.2 deep.
const W = 1.8;
const H = 1.3;
const D = 5.2;
const SEGMENTS = 12;
const FRAME = 0.8; // a frame's width

// The walk, as keyframes over the pinned scroll: how far in (z), how far
// across (x, + is toward the right wall) and the turn (yaw, + looks right).
// It waits outside the door while she walks up to it.
// Frames: left at 1.7, right at 2.9, left at 4.1; the far door at 5.2. Her
// stretches of walking get scroll in proportion to their length, so she
// keeps one easy pace, and the view moves with her.
const PATH = [
  { p: 0, z: -1, x: 0, yaw: 0 },
  { p: 0.12, z: -1, x: 0, yaw: 0 },
  { p: 0.24, z: 1.1, x: 0, yaw: 0 },
  { p: 0.3, z: 1.75, x: 0.2, yaw: -34 },
  { p: 0.38, z: 1.8, x: 0.2, yaw: -34 },
  { p: 0.47, z: 2.95, x: -0.2, yaw: 34 },
  { p: 0.59, z: 3.0, x: -0.2, yaw: 34 },
  { p: 0.68, z: 4.15, x: 0.2, yaw: -34 },
  { p: 0.8, z: 4.2, x: 0.2, yaw: -34 },
  { p: 0.94, z: 6.2, x: 0, yaw: 0 },
  { p: 1, z: 6.2, x: 0, yaw: 0 },
];

// Tiny Shruti's own walk (in the same units; the floor is at H / 2): in
// from off the left of the screen to the door while you wait outside, then
// through it ahead of you. A few quick steps take her to each picture, so
// she's already looking up at it when you turn to it. She stays at the last
// one, looking up, as you walk on past her and out of the far door.
const GIRL = [
  { p: 0, x: -1.6, z: -0.05, pose: "walk-right" },
  { p: 0.12, x: 0, z: -0.05, pose: "walk-away" },
  { p: 0.26, x: -0.4, z: 2, pose: "look-left" },
  { p: 0.38, x: -0.4, z: 2, pose: "walk-away" },
  { p: 0.47, x: 0.4, z: 3.2, pose: "look-right" },
  { p: 0.59, x: 0.4, z: 3.2, pose: "walk-away" },
  { p: 0.68, x: -0.4, z: 4.4, pose: "look-left" },
  { p: 1, x: -0.4, z: 4.4, pose: "look-left" },
];
const GIRL_H = 0.32; // her height
const GIRL_W = (GIRL_H * 15) / 19;

const ease = (t) => t * t * (3 - 2 * t);
function at(p) {
  let i = 0;
  while (i < PATH.length - 2 && p > PATH[i + 1].p) i++;
  const a = PATH[i];
  const b = PATH[i + 1];
  const t = ease(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
  return { z: a.z + (b.z - a.z) * t, x: a.x + (b.x - a.x) * t, yaw: a.yaw + (b.yaw - a.yaw) * t };
}

// Each stretch of her walk: how far it goes, and how far she has walked
// before it, so her steps can follow the ground she covers.
const STRETCH = [];
let walked = 0;
for (let i = 0; i < GIRL.length - 1; i++) {
  const a = GIRL[i];
  const b = GIRL[i + 1];
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  STRETCH.push({ len, before: walked });
  walked += len;
}
const STRIDE = 0.07; // ground covered per step

// Where she is at p and how she stands. Moving, she faces the way she goes
// (side on when crossing, from behind when walking ahead), her feet stepping
// with the distance covered and a slight bob; still, she takes the stop's
// own pose. Eased like the walk, so she keeps a step ahead of you.
function girlAt(p) {
  let i = 0;
  while (i < GIRL.length - 2 && p > GIRL[i + 1].p) i++;
  const a = GIRL[i];
  const b = GIRL[i + 1];
  const t = ease(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const moving = STRETCH[i].len > 0.01 && t > 0 && t < 1;
  const dist = STRETCH[i].before + STRETCH[i].len * t;
  let name = a.pose;
  if (moving) name = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? "walk-right" : "walk-left") : "walk-away";
  const bob = moving ? Math.abs(Math.sin((dist / STRIDE) * Math.PI)) * 0.006 : 0;
  return { x: a.x + dx * t, z: a.z + dz * t, pose: name, steps: dist / STRIDE, bob };
}

export function room(reduced) {
  const section = $("[data-room]");
  const view = $("[data-room-view]", section);
  const world = $("[data-room-world]", section);
  if (!section || !world || !gsap || reduced) return;

  const mm = gsap.matchMedia();
  mm.add(WIDE, () => {
    section.classList.add("is-room");
    section.closest(".made")?.classList.add("has-room");
    let u = innerHeight;
    const items = [];

    // The side walls, floor and ceiling, in segments, so a piece behind you
    // can be hidden (a plane through the eye draws wrong in CSS 3D).
    const segs = [];
    for (let i = 0; i < SEGMENTS; i++) {
      for (const kind of ["left", "right", "floor", "ceiling"]) {
        const el = document.createElement("span");
        el.className = `room__side room__side--${kind}`;
        el.setAttribute("aria-hidden", "true");
        world.prepend(el);
        segs.push({ el, kind, z0: (i * D) / SEGMENTS, z1: ((i + 1) * D) / SEGMENTS });
      }
    }

    // Her, a canvas standing on the floor that always turns to face you.
    const girl = document.createElement("canvas");
    girl.className = "room__girl";
    girl.setAttribute("aria-hidden", "true");
    world.append(girl);
    const drawGirl = sprite(girl);

    const place = (el, x, y, z, ry = 0, rx = 0) => {
      el.style.transform = `translate(-50%, -50%) translate3d(${x * u}px, ${y * u}px, ${-z * u}px) rotateY(${ry}deg) rotateX(${rx}deg)`;
    };

    const layout = () => {
      u = innerHeight;
      view.style.setProperty("--p", `${u}px`);
      world.style.setProperty("--u", `${u}px`);
      items.length = 0;
      girl.style.width = `${GIRL_W * u}px`;
      girl.style.height = `${GIRL_H * u}px`;
      for (const s of segs) {
        const len = s.z1 - s.z0;
        const mid = (s.z0 + s.z1) / 2;
        if (s.kind === "left" || s.kind === "right") {
          const side = s.kind === "left" ? -1 : 1;
          s.el.style.width = `${len * u + 1}px`;
          s.el.style.height = `${H * u}px`;
          place(s.el, (side * W) / 2, 0, mid, side * -90);
        } else {
          const side = s.kind === "floor" ? 1 : -1;
          s.el.style.width = `${W * u}px`;
          s.el.style.height = `${len * u + 1}px`;
          place(s.el, 0, (side * H) / 2, mid, 0, 90);
        }
        items.push({ el: s.el, near: s.z1 }); // hidden only once it's wholly behind you
      }
      for (const el of $$("[data-room-item]", world)) {
        const z = Number(el.dataset.z);
        if (el.dataset.wall) {
          el.style.width = `${W * u}px`;
          el.style.height = `${H * u}px`;
          place(el, 0, 0, z);
          items.push({ el, near: z });
        } else {
          const side = el.dataset.side === "left" ? -1 : 1;
          el.style.width = `${FRAME * u}px`;
          place(el, side * (W / 2 - 0.004), -0.04, z, side * -90);
          items.push({ el, near: z - FRAME / 2 });
        }
      }
    };

    const render = (p) => {
      const c = at(p);
      const g = girlAt(p);
      girl.style.transform = `translate(-50%, -100%) translate3d(${g.x * u}px, ${(H / 2 - g.bob) * u}px, ${-g.z * u}px) rotateY(${-c.yaw}deg)`;
      // She steps out of view a little before you'd pass right by her.
      girl.style.visibility = g.z < c.z - 0.55 ? "hidden" : "";
      const [rows, over, flip] = pose(g.pose, g.steps);
      drawGirl(rows, over, flip);
      world.style.transform = `rotateY(${c.yaw}deg) translate3d(${-c.x * u}px, 0, ${c.z * u}px)`;
      // Anything level with the eye or behind it is hidden.
      for (const it of items) it.el.style.visibility = it.near < c.z - 0.9 ? "hidden" : "";
    };

    // The room eases toward where the scroll is, so the walk glides.
    let st = null;
    let target = 0;
    let now = 0;
    const tick = (_, dt) => {
      if (Math.abs(target - now) < 0.00005) return;
      now += (target - now) * (1 - Math.pow(1 - 0.14, (dt || 16) / 16.7));
      render(now);
    };

    // Coming back from a case study (#work-leucine and so on): straight to
    // the moment you're standing at that project's frame, without the walk.
    const STOPS = { "work-leucine": 0.34, "work-bridge": 0.53, "work-docfit": 0.74 };
    section.goTo = (id, lenis) => {
      const at = STOPS[id];
      if (at == null || !st) return false;
      const y = st.start + (st.end - st.start) * at;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else scrollTo(0, y);
      target = now = at;
      render(now);
      return true;
    };

    layout();
    render(0);
    const onResize = () => (layout(), render(now));
    addEventListener("resize", onResize);
    gsap.ticker.add(tick);
    st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=1200%",
      pin: true,
      onUpdate: (self) => (target = self.progress),
      onRefresh: (self) => {
        target = now = self.progress;
        render(now);
      },
    });

    return () => {
      st.kill();
      delete section.goTo;
      gsap.ticker.remove(tick);
      removeEventListener("resize", onResize);
      segs.forEach((s) => s.el.remove());
      girl.remove();
      section.classList.remove("is-room");
      section.closest(".made")?.classList.remove("has-room");
    };
  });
}
