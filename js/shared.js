// What every page shares: smooth scrolling, in-page links, links to case
// studies that aren't written yet, the reading effect, the contact footer,
// and the fade between pages.

import { createCursor } from "./cursor.js";

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
const html = document.documentElement;

export const params = new URLSearchParams(location.search);
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;

// Reading colours: unread, the edge where you are, read.
const UNREAD = "#3A3632";
const EDGE = "#F4A06A";
const READ = "#EDE8E0";

// Plugins, smooth scrolling, the cursor and the links every page has.
export function setup() {
  gsap.registerPlugin(...[ScrollTrigger, SplitText].filter(Boolean));
  ScrollTrigger.config({ ignoreMobileResize: true });
  const reduced = html.classList.contains("rm");
  const lenis = !reduced && Lenis ? new Lenis({ lerp: 0.085 }) : null;
  if (lenis) {
    if (params.has("debug")) window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const cursor = reduced ? null : createCursor(gsap);
  anchors(lenis);
  soon(cursor);
  veil(reduced);
  return { reduced, lenis, cursor };
}

function anchors(lenis) {
  if (!lenis) return;
  for (const a of $$("[data-scroll-to]")) {
    a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href");
      const target = hash === "#top" ? 0 : $(hash);
      if (target == null) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.6 });
      if (target !== 0) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });
  }
}

// Arriving with a #hash (say, back from a case study to #work): once every
// pin has taken its space, go straight there.
export function landOnHash(lenis) {
  const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!target) return;
  const go = () => {
    ScrollTrigger.refresh();
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else target.scrollIntoView();
  };
  if (document.fonts) document.fonts.ready.then(() => requestAnimationFrame(go));
  else go();
}

// Case studies that aren't written yet say so instead of leading to a
// missing page: the cursor reads "Coming soon", screen readers hear it.
function soon(cursor) {
  let status = $("[data-soon-status]");
  for (const a of $$("[data-soon]")) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      cursor?.flash("Coming soon");
      if (!status) {
        status = document.createElement("p");
        status.className = "sr-only";
        status.setAttribute("aria-live", "polite");
        document.body.append(status);
      }
      const name = a.dataset.soon || a.textContent.trim();
      status.textContent = "";
      requestAnimationFrame(() => (status.textContent = `The ${name} case study is coming soon.`));
    });
  }
}

// Between pages of the site the screen dims to the page colour and comes
// back up on the other side. Other sites, new tabs, same-page anchors,
// mail links and modified clicks behave as usual.
function veil(reduced) {
  if (html.classList.contains("veil-in")) {
    requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove("veil-in")));
  }
  addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    e.preventDefault();
    try {
      sessionStorage.setItem("sk:veil", "1");
    } catch {}
    html.classList.add("is-leaving");
    setTimeout(() => location.assign(url.href), reduced ? 0 : 380);
  });
  // Back from a page kept in memory: lift the veil again.
  addEventListener("pageshow", (e) => e.persisted && html.classList.remove("is-leaving", "veil-in"));
}

/* ---------- Reading: lines rise into view, then warm to white as you read ---------- */

// Unread lines are dark grey. As you scroll, an edge moves down the
// paragraph: the line it's on turns light orange, and the lines behind it white.
export function reading() {
  const texts = $$("[data-reading-text]");
  if (!texts.length || !SplitText) return;
  const toEdge = gsap.utils.interpolate(UNREAD, EDGE);
  const toRead = gsap.utils.interpolate(EDGE, READ);
  html.classList.add("has-lines");

  for (const text of texts) {
    let lines = [];
    let progress = 0;

    const paint = () => {
      const edge = lerp(-1, lines.length + 1, progress); // measured in lines
      lines.forEach((line, i) => {
        const d = edge - i;
        line.style.color = d <= -0.5 ? UNREAD : d <= 0.5 ? toEdge(d + 0.5) : d <= 1.5 ? toRead(d - 0.5) : READ;
      });
    };

    SplitText.create(text, {
      type: "lines",
      mask: "lines",
      aria: "none", // the lines stay real text, in order, so it still reads as one paragraph
      autoSplit: true, // re-split after fonts load and on resize
      onSplit(self) {
        lines = self.lines;
        paint();
        // Each line rises out of its own mask, once, as the paragraph arrives.
        return gsap.from(lines, {
          yPercent: 110,
          duration: 1,
          ease: "expo.out",
          stagger: 0.09,
          scrollTrigger: { trigger: text, start: "top 82%", once: true },
        });
      },
    });

    ScrollTrigger.create({
      trigger: text,
      start: "top 70%",
      end: "bottom 38%",
      onUpdate(self) {
        progress = self.progress;
        paint();
      },
    });
  }
}

/* ---------- The nav over orange ---------- */

// The nav inverts what's under it, which turns it blue over the accent. While
// any orange block is under the nav's middle, tint it so it reads near-black.
// Created last on each page, after every pin, so the positions are right.
function navTone() {
  const zones = $$('[data-cursor-tone="orange"]');
  if (!zones.length) return;
  const under = new Set();
  const line = () => Math.round(($(".nav")?.offsetHeight || 0) / 2);
  // Measure everything made so far in one pass first. Otherwise creating
  // these refreshes the earlier triggers one by one, and on a reload halfway
  // down the page the one-shot reveals already scrolled past remove
  // themselves mid-count, which makes ScrollTrigger throw.
  ScrollTrigger.refresh();
  for (const zone of zones) {
    ScrollTrigger.create({
      trigger: zone,
      start: () => `top ${line()}px`,
      end: () => `bottom ${line()}px`,
      onToggle(self) {
        if (self.isActive) under.add(zone);
        else under.delete(zone);
        html.classList.toggle("nav-on-orange", under.size > 0);
      },
    });
  }
}

/* ---------- Contact: the end, in colour ---------- */

// "Get in touch" sits on two lines, each fitted to the full width. As the
// section arrives its content slides out from under the page above, the small
// row fades up and the big letters rise one by one. On hover the letters
// nearest the pointer lift a little.
export function contact(reduced) {
  navTone();
  const section = $("[data-contact]");
  const title = section && $(".contact__title", section);
  const cta = section && $("[data-contact-cta]", section);
  if (!title || !cta) return;
  const lines = $$(".contact__line", cta);

  // Each line as wide as the page, unless that would make the footer taller
  // than the screen below the nav (short screens): then all a bit smaller.
  const inner = $("[data-contact-inner]", section);
  const row = $(".contact__row", section);
  const fit = () => {
    const avail = title.clientWidth;
    title.style.fontSize = "100px"; // measure at a known size, then scale
    const sizes = lines.map((line) => {
      line.style.fontSize = "";
      return (100 * avail) / line.getBoundingClientRect().width;
    });
    lines.forEach((line, i) => (line.style.fontSize = `${sizes[i]}px`));
    const cs = getComputedStyle(inner);
    const nav = $(".nav")?.offsetHeight || 0;
    const room = innerHeight - nav - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.rowGap) - row.offsetHeight;
    const k = Math.min(1, room / title.offsetHeight);
    lines.forEach((line, i) => (line.style.fontSize = `${Math.floor(sizes[i] * k * 10) / 10}px`));
  };
  // Phones resize as their address bar comes and goes; only refit for a
  // real change, so the words don't jump while scrolling.
  let raf = 0;
  let seen = [innerWidth, innerHeight];
  addEventListener("resize", () => {
    if (innerWidth === seen[0] && Math.abs(innerHeight - seen[1]) < 120) return;
    seen = [innerWidth, innerHeight];
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fit);
  });
  // Fitted again once the font is in; the page gets a little longer or
  // shorter, so the scroll positions are measured again too.
  document.fonts?.ready.then(() => {
    fit();
    ScrollTrigger.refresh();
  });

  if (reduced || !SplitText) {
    fit();
    return;
  }
  const split = SplitText.create(cta, { type: "chars", mask: "chars" });
  fit();

  gsap.fromTo(
    inner,
    { yPercent: -18 },
    { yPercent: 0, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom bottom", scrub: true } }
  );
  gsap.from($$(".contact__row > *", section), {
    y: 14,
    opacity: 0,
    duration: 0.9,
    ease: "power3.out",
    stagger: 0.06,
    scrollTrigger: { trigger: section, start: "top 70%", once: true },
  });
  gsap.from(split.chars, {
    yPercent: 110,
    duration: 1.1,
    ease: "expo.out",
    stagger: 0.035,
    scrollTrigger: { trigger: title, start: "top bottom-=6%", once: true },
  });

  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const masks = split.masks;
  const lift = masks.map((m) => gsap.quickTo(m, "yPercent", { duration: 0.5, ease: "power3" }));
  let centers = [];
  let reach = 1;
  cta.addEventListener("pointerenter", () => {
    centers = masks.map((m) => {
      const r = m.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    reach = lines[lines.length - 1].getBoundingClientRect().height * 0.85;
  });
  cta.addEventListener("pointermove", (e) => {
    masks.forEach((m, i) => {
      const d = Math.hypot(e.clientX - centers[i][0], e.clientY - centers[i][1]);
      lift[i](-14 * Math.exp(-((d / reach) ** 2)));
    });
  });
  cta.addEventListener("pointerleave", () => lift.forEach((to) => to(0)));
}
