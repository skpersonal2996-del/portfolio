// Tiny pixel Shruti in the hero's corner: sitting cross-legged, typing on
// her laptop, a mug of coffee steaming beside her. She types in bursts,
// blinks, and now and then looks up from the screen. Paused off screen.
//
// As you scroll away (skills.js calls leave(p) with 0 to 1) she shuts the
// laptop, stands up with it under her arm, and the coffee vanishes; from
// there the walker in skills.js takes her down the page.

import { PALETTE, OUTFITS, FRONT, SQUAT } from "./life-sprites.js";

const COLS = 21;
const ROWS = 20;
const pad = (rows, top) => [...Array(top).fill(".".repeat(COLS)), ...rows.map((r) => r.padEnd(COLS, "."))];

// Sitting, 15 wide, four rows down so there's room to stand; the mug in the
// last five columns. A is the laptop's lid (its back to us), o the glowing
// dot on it, k the keyboard's edge.
const MUG = ["mmm..", "mmmmm", "mmm.m", "mmmm."];
const SIT = pad([
  "....HHHHHHH....",
  "...HHHHHHHHH...",
  "..HHHHHHHHHhH..",
  "..HHSSSSHHHHH..",
  "..HHSSSSSSHHH..",
  "..HHSSSSSSSHH..",
  "..HHSESSSESHH..",
  "..HHbSSSSSbHH..",
  "..HHHSSSSSHHH..",
  "..HHHHSSSHHHH..",
  ".HHHTTTTTTTHHH.",
  ".HHTAAAAAAATHH.",
  ".HSAAAAoAAAASH.",
  "..SAAAAAAAAAS..",
  ".LLkkkkkkkkkLL.",
  "KLLLLLLLLLLLLLK",
], 4);

// Overlays: a row index (in the 20-row frame) and the 15 columns of her that
// change. The mug columns are drawn separately.
const at = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [Number(k) + 4, v]));
const TAP_L = at({ 13: "...AAAAAAAAAS..", 14: ".LSkkkkkkkkkLL." });
const TAP_R = at({ 13: "..SAAAAAAAAA...", 14: ".LLkkkkkkkkkSL." });
const BLINK = at({ 6: "..HHSsSSSsSHH.." });
const UP = at({ 5: "..HHSESSSESHH..", 6: "..HHSSSSSSSHH.." });
// Shutting the lid: halfway, then shut flat on her lap, and she looks up.
const LID_HALF = at({ 11: ".HHTTTTTTTTTHH.", 12: ".HSAAAAoAAAASH.", 13: "..SAAAAAAAAAS.." });
const LID_SHUT = at({ 5: "..HHSESSSESHH..", 6: "..HHSSSSSSSHH..", 11: ".HHTTTTTTTTTHH.", 12: ".HSTTTTTTTTTSH.", 13: "..STTTTTTTTTS..", 14: ".LLAAAAAAAAALL." });

// Standing (and halfway up), the shut laptop held at her side. These rows
// count from the top of the standing sprite; skills.js uses them too.
export const HELD = {
  12: ".HSTPTTTTTPTAA.",
  13: "..STTTTTTTTTAA.",
  14: "..S.JJJJJJJ.AA.",
  15: "....JJJJJJJ.AA.",
};
// Walking toward you: one foot lifted, then the other.
export const WALK_L = { 16: "....LLL.LLL....", 17: "....LLL.KKK....", 18: "....KKK........" };
export const WALK_R = { 16: "....LLL.LLL....", 17: "....KKK.LLL....", 18: "........KKK...." };
const shift = (o, by) => Object.fromEntries(Object.entries(o).map(([k, v]) => [Number(k) + by, v]));
const STAND = pad(FRONT, 1);
const RISE = pad(SQUAT, 1);
const HELD_STAND = shift(HELD, 1);
const HELD_RISE = shift(HELD, 3); // the squat is two rows lower

// The coffee going: a puff of sparkles, then a smaller one, then nothing.
const POOF_1 = [".Z.Z.", "Z.m.Z", ".Z.Z.", "....."];
const POOF_2 = ["Z...Z", ".....", "Z...Z", "....."];

export const COLORS = {
  ...PALETTE,
  T: OUTFITS[0].T,
  P: OUTFITS[0].P,
  J: OUTFITS[0].J,
  L: OUTFITS[0].L,
  K: OUTFITS[0].K,
  A: "#4A4440",
  k: "#6E6A66",
  o: "#F5853F",
  m: "#F5853F",
};

// Three wisps of steam over the mug, drifting up.
const STEAM = [
  [[17, 15], [18, 13], [17, 11]],
  [[18, 14], [17, 12], [18, 10]],
  [[17, 14], [18, 12], [17, 10]],
];

export function heroGirl(canvas, reduced) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  let px = 1;

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    px = Math.max(1, Math.round((canvas.clientWidth / COLS) * dpr));
    canvas.width = COLS * px;
    canvas.height = ROWS * px;
  };

  const cell = (c, x, y) => {
    const color = COLORS[c];
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(x * px, y * px, px, px);
  };

  // One frame: her (a base and overlays), the mug (or its puff, or nothing),
  // steam, and the screen's glow on her face while the laptop's open.
  const draw = ({ base = SIT, over = [], mug = MUG, steam = null, glow = false }) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (glow) {
      const g = ctx.createRadialGradient(7.5 * px, 12 * px, 0, 7.5 * px, 12 * px, 7 * px);
      g.addColorStop(0, "rgba(150, 175, 255, .16)");
      g.addColorStop(1, "rgba(150, 175, 255, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    base.forEach((row, y) => {
      let her = row.slice(0, 15);
      for (const o of over) if (o[y]) her = o[y];
      [...her].forEach((c, x) => cell(c, x, y));
    });
    mug?.forEach((row, i) => [...row].forEach((c, x) => cell(c, 16 + x, 16 + i)));
    steam?.forEach(([x, y], i) => {
      ctx.fillStyle = `rgba(237, 232, 224, ${0.5 - i * 0.15})`;
      ctx.fillRect(x * px, y * px, px, px);
    });
  };

  // Leaving: each stretch of the scroll is one beat of it.
  let leaving = 0;
  const leaveFrame = (p, t) => {
    const steam = STEAM[Math.floor(t / 420) % STEAM.length];
    if (p < 0.06) return draw({ over: [LID_HALF], steam });
    if (p < 0.1) return draw({ over: [LID_SHUT], steam });
    if (p < 0.13) return draw({ base: RISE, over: [HELD_RISE], steam });
    if (p < 0.18) return draw({ base: STAND, over: [HELD_STAND], steam });
    if (p < 0.21) return draw({ base: STAND, over: [HELD_STAND], mug: POOF_1 });
    if (p < 0.24) return draw({ base: STAND, over: [HELD_STAND], mug: POOF_2 });
    draw({ base: [], mug: null }); // she's the walker's now
  };

  const api = {
    leave(p) {
      leaving = p;
      if (reduced || !raf) leaveFrame(p, performance.now());
    },
  };

  size();
  if (reduced) {
    draw({ glow: true, steam: STEAM[0] });
    return api;
  }

  let visible = true;
  let t0 = performance.now();
  let raf = 0;
  // Her rhythm: a burst of typing, a pause, sometimes a look up.
  let mode = "type";
  let modeEnd = 2600;
  let blinkAt = 2200;

  const frame = (now) => {
    raf = 0;
    if (!visible) return;
    const t = now - t0;
    if (leaving >= 0.03) {
      leaveFrame(leaving, t);
      raf = requestAnimationFrame(frame);
      return;
    }
    if (t > modeEnd) {
      const r = Math.random();
      mode = mode !== "type" ? "type" : r < 0.3 ? "look" : "pause";
      modeEnd = t + (mode === "type" ? 1800 + Math.random() * 2200 : mode === "look" ? 1400 : 900 + Math.random() * 700);
    }
    const over = [];
    if (mode === "type") over.push(Math.floor(t / 130) % 2 ? TAP_L : TAP_R);
    if (mode === "look") over.push(UP);
    if (t > blinkAt) {
      over.push(mode === "look" ? { 9: BLINK[10] } : BLINK);
      if (t > blinkAt + 140) blinkAt = t + 2600 + Math.random() * 2600;
    }
    draw({ over, glow: true, steam: STEAM[Math.floor(t / 420) % STEAM.length] });
    raf = requestAnimationFrame(frame);
  };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(canvas);
  addEventListener("resize", size);
  return api;
}
