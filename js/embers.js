// Embers behind the cursor, for the roles section: small warm sparks that
// leave the pointer with a little of its momentum, rise, cool from pale amber
// to deep orange and fade out. A 2D canvas over the section, drawn only while
// there are embers alive. Mouse only.

// Hot to cool: pale amber, the accent orange, a deep ember red-orange.
const HOT = [255, 204, 150];
const WARM = [245, 133, 63];
const COOL = [214, 72, 30];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const tone = (t) => (t < 0.35 ? mix(HOT, WARM, t / 0.35) : mix(WARM, COOL, (t - 0.35) / 0.65)).join(",");

const MAX = 240;

export function createEmbers(area, canvas) {
  if (!canvas || !matchMedia("(hover: hover) and (pointer: fine)").matches) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const embers = [];
  let last = null;
  let raf = 0;
  let prev = 0;
  let k = 1;

  const fit = () => {
    k = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * k);
    const h = Math.round(canvas.clientHeight * k);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const spawn = (x, y, dx, dy) => {
    if (embers.length >= MAX) embers.shift();
    embers.push({
      x,
      y,
      // px per ms: a share of the pointer's own motion, plus a little scatter
      vx: dx * 0.004 + (Math.random() - 0.5) * 0.05,
      vy: dy * 0.004 - 0.015 - Math.random() * 0.04,
      age: 0,
      life: 800 + Math.random() * 900,
      size: 0.9 + Math.random() * 1.8,
      seed: Math.random() * 6.283,
    });
  };

  const frame = (now) => {
    const dt = Math.min(48, now - prev);
    prev = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    const drag = Math.exp(-dt / 420);
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.age += dt;
      if (e.age >= e.life) {
        embers.splice(i, 1);
        continue;
      }
      const t = e.age / e.life;
      e.vx *= drag;
      e.vy = e.vy * drag - 0.00005 * dt; // warm air: they rise as they slow
      e.x += (e.vx + Math.sin(e.seed + e.age * 0.007) * 0.01) * dt;
      e.y += e.vy * dt;
      const fade = (1 - t) * (1 - t);
      const flicker = 0.75 + 0.25 * Math.sin(e.seed * 3 + e.age * 0.03);
      const c = tone(t);
      ctx.fillStyle = `rgba(${c},${0.13 * fade})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * 5, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = `rgba(${c},${0.95 * fade * flicker})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * (1 - 0.45 * t), 0, 6.283);
      ctx.fill();
    }
    raf = embers.length ? requestAnimationFrame(frame) : 0;
  };

  area.addEventListener(
    "pointermove",
    (ev) => {
      if (ev.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      const from = last || { x, y };
      const dx = x - from.x;
      const dy = y - from.y;
      last = { x, y };
      // Along the path since the last event, so a fast sweep leaves a line of
      // embers rather than a few clumps; a still pointer leaves none.
      const n = Math.min(6, Math.floor(Math.hypot(dx, dy) / 14) + (Math.random() < 0.5 ? 1 : 0));
      if (!n) return;
      for (let i = 1; i <= n; i++) spawn(from.x + (dx * i) / n, from.y + (dy * i) / n, dx, dy);
      if (!raf) {
        fit();
        prev = performance.now();
        raf = requestAnimationFrame(frame);
      }
    },
    { passive: true }
  );
  area.addEventListener("pointerleave", () => (last = null));
  addEventListener("resize", () => raf && fit());

  return { count: () => embers.length };
}
