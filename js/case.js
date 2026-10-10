// A case study page: the hero and the sheet that slides up over it, the
// project name, chapter reveals, the chapter index, the nav while reading,
// the before/after slider, the numbers and the screens of the work.
// Scrolling, links and the footer come from shared.js; Bridge's road from
// road.js.

import { setup, contact, $, $$ } from "./shared.js";
import { road } from "./road.js";
import { commuteMap } from "./map.js";

const { gsap, ScrollTrigger, SplitText } = window;
const html = document.documentElement;

boot();

function boot() {
  if (!gsap || !ScrollTrigger) {
    html.classList.remove("case-enter");
    return;
  }
  const { reduced, lenis } = setup();
  const roadEl = $("[data-road]");
  if (roadEl) road(roadEl, reduced);
  const mapEl = $("[data-map]");
  if (mapEl) commuteMap(mapEl, reduced);
  compare(reduced);
  chapters();
  // Reduced motion: the page as it is, still; the slider still works.
  if (reduced) {
    html.classList.remove("case-enter");
    name(true);
    contact(true);
    return;
  }
  enter();
  hero();
  name(false);
  reveals();
  screens();
  phoneScroll();
  icons();
  count();
  contact(false);
  if (lenis) lenis.resize();
}

/* ---------- The project name, as wide as the column ---------- */

// Measured at a known size and scaled to fit; refitted when the font arrives
// and when the window changes width. The letters rise in once.
function name(reduced) {
  const word = $("[data-case-name]");
  const box = word?.parentElement;
  if (!word || !box) return;
  const split = !reduced && SplitText ? SplitText.create(word, { type: "chars", mask: "chars" }) : null;
  const fit = () => {
    box.style.fontSize = "100px";
    const size = (100 * box.clientWidth) / word.getBoundingClientRect().width;
    box.style.fontSize = `${Math.floor(size * 10) / 10}px`;
  };
  fit();
  let width = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === width) return;
    width = innerWidth;
    requestAnimationFrame(fit);
  });
  document.fonts?.ready.then(() => {
    fit();
    ScrollTrigger.refresh();
  });
  if (split) {
    gsap.from(split.chars, {
      yPercent: 105,
      duration: 1.2,
      ease: "expo.out",
      stagger: 0.04,
      scrollTrigger: { trigger: box, start: "top 92%", once: true },
    });
  }
}

/* ---------- The nav while reading ---------- */

/* ---------- Arriving: the device settles, the sheet rises into place ---------- */

function enter() {
  const img = $("[data-case-shot]");
  const sheet = $("[data-case-sheet]");
  // Everything on the sheet was measured while it sat lower; measure again
  // once it has settled.
  sheet?.addEventListener("transitionend", (e) => e.target === sheet && e.propertyName === "translate" && ScrollTrigger.refresh());
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    requestAnimationFrame(() => html.classList.remove("case-enter"));
  };
  if (!img || img.complete) go();
  else {
    img.addEventListener("load", go, { once: true });
    setTimeout(go, 1200);
  }
}

/* ---------- The hero: the tablet tips back as the sheet covers it ---------- */

function hero() {
  const heroEl = $("[data-case-hero]");
  const stage = $("[data-case-hero-frame]");
  const shade = $("[data-case-hero-shade]");
  // The tilt goes on a wrapper: the tablet itself has the CSS entrance, and
  // the two would fight over one element's transform.
  const tilt = $("[data-case-tilt]");
  if (!heroEl || !stage || !shade) return;
  gsap
    .timeline({ scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: true } })
    .to(shade, { opacity: 0.72, ease: "none" }, 0)
    .to(stage, { y: () => -innerHeight * 0.06, scale: 0.94, rotationX: 8, transformPerspective: 1800, ease: "none" }, 0);

  // With a mouse, it leans a few degrees towards the pointer.
  if (!tilt || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  gsap.set(tilt, { transformPerspective: 1800 });
  const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.9, ease: "power3" });
  const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.9, ease: "power3" });
  heroEl.addEventListener("pointermove", (e) => {
    const r = heroEl.getBoundingClientRect();
    ry(((e.clientX - r.left) / r.width - 0.5) * 5);
    rx(-((e.clientY - r.top) / r.height - 0.5) * 4);
  });
  heroEl.addEventListener("pointerleave", () => {
    rx(0);
    ry(0);
  });
}

/* ---------- Reveals ---------- */

function reveals() {
  // Headings rise line by line out of their own masks.
  if (SplitText) {
    for (const el of $$("[data-split]")) {
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "split-line", // its mask gets room for descenders in CSS
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }),
      });
    }
  }
  // Blocks of text fade up.
  for (const el of $$("[data-reveal]")) {
    gsap.from(el, { y: 28, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  }
  // Images open upwards and settle.
  for (const el of $$("[data-reveal-media]")) {
    const trigger = { trigger: el, start: "top 88%", once: true };
    gsap.fromTo(el, { clipPath: "inset(12% 0% 0% 0% round 20px)" }, { clipPath: "inset(0% 0% 0% 0% round 20px)", duration: 1.4, ease: "expo.out", scrollTrigger: trigger, clearProps: "clipPath" });
    const img = $("img", el);
    if (img) gsap.from(img, { scale: 1.08, duration: 1.8, ease: "expo.out", scrollTrigger: { ...trigger } });
  }
  // Panels of screens open upwards; what's on them moves on its own (below).
  for (const el of $$("[data-reveal-panel]")) {
    gsap.fromTo(el, { clipPath: "inset(10% 0% 0% 0% round 20px)" }, { clipPath: "inset(0% 0% 0% 0% round 20px)", duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true }, clearProps: "clipPath" });
  }
  // The impact block opens out from its middle, then its contents rise. (A
  // clip, not a move, so the block's position stays true for the nav tint.)
  for (const el of $$("[data-reveal-block]")) {
    const trigger = { trigger: el, start: "top 85%", once: true };
    gsap.fromTo(el, { clipPath: "inset(10% 6% 10% 6% round 40px)" }, { clipPath: "inset(0% 0% 0% 0% round 40px)", duration: 1.4, ease: "expo.out", scrollTrigger: trigger, clearProps: "clipPath" });
    gsap.from(el.children, { y: 36, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.1, delay: 0.15, scrollTrigger: { ...trigger } });
  }
}

/* ---------- The screens of the work move with the scroll ---------- */

// Browser windows tip up to face you as they arrive, the admission steps
// deal out from the first one, and the three lists fan out from behind the
// middle one. Each tween moves an element the CSS leaves untransformed (the
// tilts live on wrappers inside), so the two never fight over a transform.
function screens() {
  for (const el of $$("[data-rise]")) {
    gsap.fromTo(
      el,
      { rotationX: 16, y: 40, transformPerspective: 1600, transformOrigin: "50% 100%" },
      { rotationX: 0, y: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top 30%", scrub: true } },
    );
  }
  for (const el of $$("[data-deal]")) {
    const [first, ...rest] = $$("[data-deal-step]", el);
    if (!first) continue;
    gsap.from(rest, {
      x: (i, step) => first.offsetLeft - step.offsetLeft,
      y: (i, step) => first.offsetTop - step.offsetTop,
      ease: "none",
      stagger: 0.06,
      scrollTrigger: { trigger: el, start: "top 90%", end: "center 55%", scrub: true, invalidateOnRefresh: true },
    });
  }
  for (const el of $$("[data-fan]")) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 90%", end: "center 55%", scrub: true } });
    for (const item of $$("[data-fan-item]", el)) {
      const inward = item.classList.contains("trio__item--l") ? 1 : -1;
      tl.from(item, { xPercent: inward * 34, ease: "none" }, 0);
      tl.from($(".trio__tilt", item), { "--ry": "0deg", ease: "none" }, 0);
    }
  }
}

/* ---------- Long screens scroll inside their phones ---------- */

// As a phone passes through the window, its screen scrolls from the top of
// the page shown in it to the bottom.
function phoneScroll() {
  for (const img of $$("[data-phone-scroll]")) {
    const screen = img.parentElement;
    gsap.to(img, {
      y: () => -Math.max(0, img.offsetHeight - screen.clientHeight),
      ease: "none",
      scrollTrigger: { trigger: screen, start: "top 75%", end: "bottom 25%", scrub: true, invalidateOnRefresh: true },
    });
  }
}

/* ---------- Line icons draw themselves in ---------- */

// Each stroke is drawn from its start as the icon arrives; dotted lines and
// small filled accents (which can't be drawn) fade in after.
function icons() {
  for (const svg of $$(".case-icon")) {
    const extras = $$(".acc, .dot", svg);
    const lines = $$("path, rect, circle, line, polyline", svg).filter((el) => !extras.includes(el));
    for (const el of lines) {
      const length = el.getTotalLength();
      el.style.strokeDasharray = `${length} ${length}`;
      el.style.strokeDashoffset = String(length);
    }
    gsap.set(extras, { opacity: 0 });
    gsap
      .timeline({ scrollTrigger: { trigger: svg, start: "top 90%", once: true } })
      .to(lines, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.08 })
      .to(extras, { opacity: 1, duration: 0.5, ease: "power1.out" }, "-=0.4");
  }
}

/* ---------- Numbers count up as they arrive ---------- */

function count() {
  for (const el of $$("[data-count]")) {
    const end = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = "0";
    gsap.to(o, {
      v: end,
      duration: 1.8,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => (el.textContent = String(Math.round(o.v))),
    });
  }
}

/* ---------- The chapter index and the progress bar ---------- */

function chapters() {
  const nav = $("[data-case-index]");
  const sheet = $("[data-case-sheet]");
  const bar = $("[data-case-progress]");
  if (!nav || !sheet) return;
  const links = $$("a", nav);
  const setActive = (i) =>
    links.forEach((a, k) => {
      a.classList.toggle("is-active", k === i);
      if (k === i) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  links.forEach((a, i) => {
    const chapter = $(a.getAttribute("href"));
    if (!chapter) return;
    ScrollTrigger.create({
      trigger: chapter,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => self.isActive && setActive(i),
    });
  });
  // Only while there's a chapter on screen, not over the hero or the footer.
  ScrollTrigger.create({
    trigger: sheet,
    start: "top 45%",
    end: "bottom 55%",
    onToggle: (self) => nav.classList.toggle("is-on", self.isActive),
  });
  if (bar) {
    ScrollTrigger.create({
      trigger: sheet,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => (bar.style.transform = `scaleX(${self.progress})`),
    });
  }
}

/* ---------- Before and after ---------- */

// Drag across (mouse straight away; touch once the finger moves sideways, so
// up and down still scroll the page), or use the arrow keys on the range.
function compare(reduced) {
  for (const fig of $$("[data-compare]")) {
    const frame = $(".compare__frame", fig);
    const range = $(".compare__range", fig);
    if (!frame || !range) continue;
    const set = (v) => {
      const pos = Math.min(100, Math.max(0, v));
      frame.style.setProperty("--pos", `${pos}%`);
      range.value = String(Math.round(pos));
      range.setAttribute("aria-valuetext", `${Math.round(pos)}% before, ${100 - Math.round(pos)}% after`);
    };
    const at = (x) => {
      const r = frame.getBoundingClientRect();
      return ((x - r.left) / r.width) * 100;
    };
    let drag = null;
    let sweep = null;
    const take = (e) => {
      drag.on = true;
      frame.setPointerCapture(e.pointerId);
      fig.classList.add("is-dragging");
      sweep?.kill();
    };
    frame.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      drag = { id: e.pointerId, x0: e.clientX, on: false };
      if (e.pointerType === "mouse") {
        e.preventDefault(); // no text selection, no image drag: only the handle moves
        take(e);
        set(at(e.clientX));
      }
    });
    // Never let the browser start its own drag or selection here.
    frame.addEventListener("dragstart", (e) => e.preventDefault());
    frame.addEventListener("selectstart", (e) => e.preventDefault());
    frame.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) {
        if (Math.abs(e.clientX - drag.x0) < 4) return;
        take(e);
      }
      set(at(e.clientX));
    });
    const stop = () => {
      drag = null;
      fig.classList.remove("is-dragging");
    };
    frame.addEventListener("pointerup", stop);
    frame.addEventListener("pointercancel", stop);
    frame.addEventListener("lostpointercapture", stop);
    range.addEventListener("input", () => {
      sweep?.kill();
      set(Number(range.value));
    });
    set(50);

    // The first time it comes into view, the handle sweeps once to show it moves.
    if (reduced) continue;
    const o = { v: 50 };
    ScrollTrigger.create({
      trigger: frame,
      start: "top 65%",
      once: true,
      onEnter: () => {
        if (drag) return;
        sweep = gsap
          .timeline({ onUpdate: () => set(o.v) })
          .to(o, { v: 30, duration: 0.9, ease: "power2.inOut" })
          .to(o, { v: 66, duration: 1.2, ease: "power2.inOut" })
          .to(o, { v: 50, duration: 0.8, ease: "power2.out" });
      },
    });
  }
}
