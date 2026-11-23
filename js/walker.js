// Tiny Shruti off the page's canvases. As you scroll out of the hero she
// shuts her laptop, stands up with it, her coffee vanishes (hero-girl.js
// draws those beats), and she walks off the right of the screen. Her room
// poses are here too (room.js).

import { FRONT, BACK, SIDE, STEP_A, STEP_B } from "./life-sprites.js";
import { COLORS, HELD } from "./hero-girl.js";
import { $ } from "./shared.js";

const { gsap, ScrollTrigger } = window;
const lerp = (a, b, t) => a + (b - a) * t;

const W = 15;
const H = 19;
// The beat at which she's up, laptop in hand and coffee gone, and the
// walker takes over from the hero's canvas (see hero-girl.js).
const SET_OFF = 0.24;

// Side on, the shut laptop tucked under her arm in front of her.
const HELD_SIDE = { 11: "..HHPPPTTTAA...", 12: "...HPPPTTSAA...", 13: "....PPPTTSAA..." };
// Side on, looking up (at a picture on the wall).
const LOOK_UP_SIDE = { 4: "..HHHHHHHSSES..", 5: "..HHHHHHHSSSS.." };
// From behind, the laptop at her side, and walking away: one foot, then the other.
const HELD_BACK = { 12: ".AATPPPPPPPTSH.", 13: ".AATTPPPPPTTS..", 14: ".AA.JJJJJJJ.S..", 15: ".AA.JJJJJJJ...." };
const AWAY_L = { 16: "....LLL.LLL....", 17: "....LLL.KKK....", 18: "....KKK........" };
const AWAY_R = { 16: "....LLL.LLL....", 17: "....KKK.LLL....", 18: "........KKK...." };

// Her poses, for the room (room.js): walking (side on or away from you),
// looking up at a picture to her left or right, and standing facing you.
export function pose(name, t = 0) {
  const step = Math.floor(t) % 2;
  switch (name) {
    case "walk-right": return [SIDE, [step ? STEP_A : STEP_B, HELD_SIDE], false];
    case "walk-left": return [SIDE, [step ? STEP_A : STEP_B, HELD_SIDE], true];
    case "walk-away": return [BACK, [HELD_BACK, step ? AWAY_L : AWAY_R], false];
    case "look-left": return [SIDE, [HELD_SIDE, LOOK_UP_SIDE], true];
    case "look-right": return [SIDE, [HELD_SIDE, LOOK_UP_SIDE], false];
    default: return [FRONT, [HELD], false];
  }
}

// Draws tiny Shruti standing or walking, with overlays, optionally facing
// left. It re-measures if the canvas has changed size.
export function sprite(canvas) {
  const ctx = canvas.getContext("2d");
  let px = 1;
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    px = Math.max(1, Math.round((canvas.clientWidth / W) * dpr));
    canvas.width = W * px;
    canvas.height = H * px;
  };
  let measured = 0;
  const draw = (rows, over = [], flip = false) => {
    if (!ctx) return;
    if (canvas.clientWidth !== measured) {
      measured = canvas.clientWidth;
      size();
    }
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

/* ---------- Out of the hero ---------- */

// Over the first three quarters of a screen of scrolling: the hero's canvas
// plays her getting up, then she's drawn on a canvas fixed to the screen,
// walking right along the hero's floor until she's off the edge. Scroll
// back and she walks back and sits down again.
export function heroExit({ heroGirl, reduced }) {
  const walker = $("[data-walker]");
  const seat = $("[data-hero-girl]");
  if (!walker || !seat || !heroGirl || reduced || !gsap) return;
  // The same pixel size as the hero's canvas, so she doesn't change size.
  const match = () => walker.style.setProperty("--px", `${seat.clientWidth / 21}px`);
  match();
  addEventListener("resize", match);
  const draw = sprite(walker);

  const place = (p) => {
    heroGirl.leave(p);
    const walking = p >= SET_OFF && p < 1;
    walker.classList.toggle("is-on", walking);
    if (!walking) return;
    const r = seat.getBoundingClientRect();
    const q = (p - SET_OFF) / (1 - SET_OFF);
    const x = lerp(r.left, innerWidth + 24, q);
    const y = r.top + r.width / 21; // standing in the hero's canvas starts one row down
    walker.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    draw(SIDE, [Math.floor(scrollY / 26) % 2 ? STEP_A : STEP_B, HELD_SIDE]);
  };

  ScrollTrigger.create({
    start: 0,
    end: () => innerHeight * 0.75,
    onUpdate: (self) => place(self.progress),
    onRefresh: (self) => place(self.progress),
  });
}
