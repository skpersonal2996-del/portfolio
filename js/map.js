// Nestwise's hero: a city map at night behind the phones. Faint streets and
// a metro line; about 500 listings as faint dots; the commute rings around
// where you work, with the five right homes lit inside them ("from 500
// listings to 5 right homes"). The map is drawn once to an offscreen
// canvas; each frame only adds a ring pulsing out and the five homes'
// glow. Same seed every time, so the city never rearranges itself.

const SEED = 20251005;
const LISTINGS = 500;
const HOMES = 5;
const RINGS = [0.15, 0.25, 0.36]; // commute radii, as shares of the width
const TEAL = "90, 170, 175";
const PAPER = "237, 232, 224";

// A small seeded random generator (mulberry32).
function random(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function commuteMap(canvas, reduced) {
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  if (!ctx || !hero) return;
  const { gsap, ScrollTrigger } = window;
  const base = document.createElement("canvas");
  const bctx = base.getContext("2d");
  let w = 0;
  let h = 0;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let rings = [];
  let homes = [];
  let hidden = false;

  // Where the phones are, so the five homes are lit where you can see them.
  const phonesBox = () => {
    const phones = hero.querySelector("[data-map-avoid]");
    if (!phones) return null;
    const a = phones.getBoundingClientRect();
    const b = canvas.getBoundingClientRect();
    return { x0: a.left - b.left - 28, y0: a.top - b.top - 28, x1: a.right - b.left + 28, y1: a.bottom - b.top + 28 };
  };

  const drawBase = () => {
    const rand = random(SEED);
    base.width = Math.round(w * dpr);
    base.height = Math.round(h * dpr);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, w, h);
    bctx.lineCap = "round";
    bctx.lineJoin = "round";

    // A river, wide and faint.
    bctx.strokeStyle = `rgba(${TEAL}, .06)`;
    bctx.lineWidth = Math.max(18, w * 0.02);
    bctx.beginPath();
    bctx.moveTo(-w * 0.05, h * 0.82);
    bctx.bezierCurveTo(w * 0.25, h * 0.62, w * 0.42, h * 1.02, w * 0.68, h * 0.78);
    bctx.bezierCurveTo(w * 0.86, h * 0.62, w * 0.95, h * 0.7, w * 1.05, h * 0.58);
    bctx.stroke();

    // The street grid, a little turned, with gaps where blocks join.
    const step = Math.min(64, Math.max(38, w / 28));
    const turn = -0.2;
    const reach = Math.hypot(w, h);
    bctx.save();
    bctx.translate(w / 2, h / 2);
    bctx.rotate(turn);
    bctx.strokeStyle = `rgba(${PAPER}, .045)`;
    bctx.lineWidth = 1;
    for (const across of [false, true]) {
      for (let p = -reach / 2; p <= reach / 2; p += step) {
        let s = -reach / 2;
        while (s < reach / 2) {
          const len = step * (1 + Math.floor(rand() * 4));
          if (rand() > 0.22) {
            bctx.beginPath();
            if (across) {
              bctx.moveTo(s, p);
              bctx.lineTo(s + len, p);
            } else {
              bctx.moveTo(p, s);
              bctx.lineTo(p, s + len);
            }
            bctx.stroke();
          }
          s += len;
        }
      }
    }
    bctx.restore();

    // A few main roads, sweeping across.
    bctx.strokeStyle = `rgba(${PAPER}, .085)`;
    bctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      const fromLeft = i % 2 === 0;
      const y0 = h * (0.08 + rand() * 0.84);
      const y1 = h * (0.08 + rand() * 0.84);
      bctx.beginPath();
      if (fromLeft) {
        bctx.moveTo(-20, y0);
        bctx.quadraticCurveTo(w * (0.3 + rand() * 0.4), h * (0.2 + rand() * 0.6), w + 20, y1);
      } else {
        bctx.moveTo(w * (0.1 + rand() * 0.8), -20);
        bctx.quadraticCurveTo(w * (0.2 + rand() * 0.6), h * 0.5, w * (0.1 + rand() * 0.8), h + 20);
      }
      bctx.stroke();
    }

    // A metro line with its stations.
    bctx.strokeStyle = `rgba(${TEAL}, .32)`;
    bctx.lineWidth = 2;
    bctx.setLineDash([10, 7]);
    const metro = [
      [-20, h * 0.3],
      [w * 0.24, h * 0.36],
      [w * 0.43, h * 0.58],
      [w * 0.64, h * 0.62],
      [w * 0.86, h * 0.44],
      [w + 20, h * 0.4],
    ];
    bctx.beginPath();
    metro.forEach(([x, y], i) => (i ? bctx.lineTo(x, y) : bctx.moveTo(x, y)));
    bctx.stroke();
    bctx.setLineDash([]);
    bctx.fillStyle = "#0C0B0A";
    for (const [x, y] of metro.slice(1, -1)) {
      bctx.beginPath();
      bctx.arc(x, y, 3.5, 0, Math.PI * 2);
      bctx.fill();
      bctx.stroke();
    }

    // Every listing in the city, faint.
    bctx.fillStyle = `rgba(${PAPER}, .15)`;
    for (let i = 0; i < LISTINGS; i++) {
      bctx.beginPath();
      bctx.arc(rand() * w, rand() * h, 1.4, 0, Math.PI * 2);
      bctx.fill();
    }

    // The commute rings; the middle one, dashed, is the one you'd pick.
    rings.forEach((r, i) => {
      bctx.strokeStyle = `rgba(${TEAL}, ${i === 1 ? 0.3 : 0.12})`;
      bctx.lineWidth = i === 1 ? 1.5 : 1;
      bctx.setLineDash(i === 1 ? [4, 7] : []);
      bctx.beginPath();
      bctx.arc(cx, cy, r, 0, Math.PI * 2);
      bctx.stroke();
    });
    bctx.setLineDash([]);

    // The five right homes: inside the chosen ring, where the phones don't cover them.
    const box = phonesBox();
    const clear = (x, y) => !box || x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1;
    homes = [];
    for (let tries = 0; homes.length < HOMES && tries < 400; tries++) {
      const a = rand() * Math.PI * 2;
      const r = rings[1] * (0.45 + rand() * 0.5);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (x < 24 || x > w - 24 || y < 24 || y > h - 24 || !clear(x, y)) continue;
      if (homes.some((p) => Math.hypot(p.x - x, p.y - y) < 60)) continue;
      homes.push({ x, y, phase: rand() * Math.PI * 2 });
    }
  };

  const draw = (time = 0) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // A ring pulsing out from where you work.
    if (!reduced) {
      const t = (time % 4.2) / 4.2;
      const eased = 1 - Math.pow(1 - t, 2);
      const r = rings[0] * 0.4 + (rings[2] - rings[0] * 0.4) * eased;
      ctx.strokeStyle = `rgba(${TEAL}, ${(0.32 * (1 - t)).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The five homes, glowing softly.
    for (const home of homes) {
      const breathe = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time * 1.6 + home.phase);
      const glow = ctx.createRadialGradient(home.x, home.y, 0, home.x, home.y, 18);
      glow.addColorStop(0, `rgba(124, 210, 190, ${(0.28 + 0.22 * breathe).toFixed(3)})`);
      glow.addColorStop(1, "rgba(124, 210, 190, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(home.x, home.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#9FE0CF";
      ctx.beginPath();
      ctx.arc(home.x, home.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
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
    cx = w / 2;
    cy = h * 0.47;
    rings = RINGS.map((k) => k * Math.max(w, h * 1.1));
    drawBase();
    draw(performance.now() / 1000);
  };
  new ResizeObserver(size).observe(hero);
  size();
  // The phones settle in after the first draw: place the homes again once
  // they're where they'll stay.
  setTimeout(size, 1800);

  if (reduced || !gsap || !ScrollTrigger) return;
  ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "bottom top",
    onUpdate: (self) => (hidden = self.progress > 0.995),
  });
  gsap.ticker.add((time) => {
    if (hidden || document.hidden) return;
    draw(time);
  });
}
