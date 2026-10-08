// A small cursor for mouse users. It swells over links; over the portrait it
// opens into a ring that asks the question the headline is about; over a
// project card it becomes a disc saying where the click goes.
// Touch and pen keep their native behaviour.

let instance = null;

// Safe to call from more than one section: there is only ever one cursor.
export function createCursor(gsap) {
  if (instance !== null) return instance;
  const el = document.querySelector(".cursor");
  if (!el || !matchMedia("(hover: hover) and (pointer: fine)").matches) return (instance = undefined);

  const html = document.documentElement;
  const cta = el.querySelector(".cursor__cta");
  html.classList.add("has-cursor");

  const xTo = gsap.quickTo(el, "x", { duration: 0.28, ease: "power3" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.28, ease: "power3" });
  let placed = false;
  let onPhoto = false;
  let flashing = 0;

  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      if (!placed) {
        gsap.set(el, { x: e.clientX, y: e.clientY });
        placed = true;
      }
      xTo(e.clientX);
      yTo(e.clientY);
      html.classList.add("cursor-on");
      const target = e.target instanceof Element ? e.target : null;
      const card = target?.closest("[data-cursor]");
      // Over the pixel scene the dot stays small; the brackets show the hover.
      const onLink = !card && !!target?.closest("a, button") && !target.closest("[data-cursor-plain]");
      if (card && !flashing) cta.textContent = card.dataset.cursor;
      el.classList.toggle("is-card", !!card);
      el.classList.toggle("is-link", onLink);
      el.classList.toggle("is-photo", onPhoto && !onLink && !card);
      el.classList.toggle("on-orange", !!target?.closest('[data-cursor-tone="orange"]'));
    },
    { passive: true }
  );

  const hide = () => html.classList.remove("cursor-on");
  html.addEventListener("mouseleave", hide);
  addEventListener("blur", hide);

  return (instance = {
    setPhoto(on) {
      if (on === onPhoto) return;
      onPhoto = on;
      el.classList.toggle("is-photo", on && !el.classList.contains("is-link") && !el.classList.contains("is-card"));
    },
    // Swap the disc's words for a moment, e.g. "Coming soon".
    flash(text, ms = 1400) {
      const before = cta.textContent;
      cta.textContent = text;
      clearTimeout(flashing);
      flashing = setTimeout(() => {
        flashing = 0;
        cta.textContent = before;
      }, ms);
    },
  });
}
