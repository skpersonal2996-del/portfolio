// Bridge's hero: a road at night behind the laptop. The lane markings run
// away to a point behind the screen, where the light is warm, and the dashes
// drift towards you: slowly on their own, a little faster while you scroll.
// Drawn on a canvas, so the lines stay sharp at any size.

const HORIZON = 0.16; // where the road meets the sky (about the laptop's top edge), as a share of the hero's height
const NEAR = 0.55; // just past the bottom edge (depths are in camera heights)
const FAR = 44; // where the road fades into the dark
const DASH = 0.5; // dash and gap lengths along the road
const GAP = 0.75;
const DRIFT = 0.3; // how fast the dashes come towards you, per second
const SCROLL = 4; // and how much further they come over the hero's scroll
// Across the road, in camera heights from the middle: three lanes each way,
// dashed between them, solid at the edges. (No centre line: the laptop
// stands on it, and below the laptop it would read as a stand.)
const LINES = [
  { x: -3.6, w: 0.075 },
  { x: -2.4, w: 0.06, dash: true },
  { x: -1.2, w: 0.06, dash: true },
  { x: 1.2, w: 0.06, dash: true },
  { x: 2.4, w: 0.06, dash: true },
  { x: 3.6, w: 0.075 },
];
const LIGHT = [238, 228, 214]; // the paint up close: warm white
const WARM = [245, 133, 63]; // and far off, in the light: the accent

export function road(canvas, reduced) {
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  if (!ctx || !hero) return;
  const { gsap, ScrollTrigger } = window;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let drift = 0;
  let scrolled = 0;
  let hidden = false;

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const vx = w / 2;
    const vy = h * HORIZON;
    const k = h - vy; // depth 1 lands on the bottom edge
    const spread = Math.max(1, w / h) * 0.55; // a wider window shows a wider road
    const sx = (x, z) => vx + (x * spread * k) / z;
    const sy = (z) => vy + k / z;
    // Paint fades into the dark far away, and warms as it nears the light.
    const fade = (z) => Math.min(1, (z - NEAR) / 0.5) * Math.pow(Math.max(0, 1 - z / FAR), 1.7);
    const tone = (z, a) => {
      const t = Math.min(1, Math.max(0, (z - 1.5) / 12));
      const [r, g, b] = LIGHT.map((v, i) => Math.round(v + (WARM[i] - v) * t));
      return `rgba(${r},${g},${b},${(a * fade(z)).toFixed(3)})`;
    };
    const strip = (line, z0, z1) => {
      const half = line.w / 2;
      ctx.beginPath();
      ctx.moveTo(sx(line.x - half, z0), sy(z0));
      ctx.lineTo(sx(line.x + half, z0), sy(z0));
      ctx.lineTo(sx(line.x + half, z1), sy(z1));
      ctx.lineTo(sx(line.x - half, z1), sy(z1));
      ctx.closePath();
      ctx.fill();
    };
    const period = DASH + GAP;
    const offset = (drift + scrolled) % period;
    for (const line of LINES) {
      if (line.dash) {
        // Each dash in one colour, taken at its middle.
        for (let z = NEAR - offset; z < FAR; z += period) {
          const z0 = Math.max(NEAR, z);
          const z1 = Math.min(FAR, z + DASH);
          if (z1 <= z0) continue;
          ctx.fillStyle = tone((z0 + z1) / 2, 0.42);
          strip(line, z0, z1);
        }
      } else {
        // The edges in one piece, shaded down their length (no seams).
        const top = sy(FAR);
        const bottom = sy(NEAR);
        const shade = ctx.createLinearGradient(0, bottom, 0, top);
        for (const z of [NEAR, 0.7, 1, 1.4, 2, 3, 4.5, 7, 11, 17, 26, FAR]) {
          shade.addColorStop((bottom - sy(z)) / (bottom - top), tone(z, 0.5));
        }
        ctx.fillStyle = shade;
        strip(line, NEAR, FAR);
      }
    }
  };

  const size = () => {
    const r = hero.getBoundingClientRect();
    if (!r.width || !r.height) return;
    w = r.width;
    h = r.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw();
  };
  new ResizeObserver(size).observe(hero);
  size();

  // Reduced motion: the road, still.
  if (reduced || !gsap || !ScrollTrigger) return;
  ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "bottom top",
    onUpdate: (self) => {
      scrolled = self.progress * SCROLL;
      hidden = self.progress > 0.995; // the sheet covers it: stop drawing
    },
  });
  gsap.ticker.add((time, deltaTime) => {
    if (hidden || document.hidden) return;
    drift += (Math.min(deltaTime, 50) / 1000) * DRIFT;
    draw();
  });
}
