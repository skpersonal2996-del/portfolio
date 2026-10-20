// DocFit's hero: the spreadsheet, the blank format and the finished pile.
// One row at a time lights up, a pulse runs along the wire, the format's
// places fill with that row, and the filled ticket slides onto the pile.
// Then the format empties and the next row goes. Paused while off screen.

import { $, $$ } from "./shared.js";

const { gsap, ScrollTrigger } = window;

export function merge(root, reduced) {
  const rows = $$("[data-merge-row]", root);
  const fields = $$("[data-merge-field]", $("[data-merge-format]", root));
  const top = $("[data-merge-top]", root);
  const fly = $("[data-merge-fly]", root);
  const format = $("[data-merge-format]", root);
  const [wireIn, wireOut] = $$("[data-merge-pulse]", root);
  if (!rows.length || !fields.length || !top || !fly || !format) return;

  // Each row's values, in the order of the format's places.
  const values = rows.map((row) => $$("td", row).map((td) => td.textContent.trim()));
  const fill = (doc, v) => $$("[data-merge-field]", doc).forEach((dd, k) => (dd.textContent = v[k] ?? ""));
  const light = (i) => rows.forEach((row, k) => row.classList.toggle("is-on", k === i));

  // Still: the first row, already in the format and on the pile.
  light(0);
  fill(format, values[0]);
  fields.forEach((dd) => dd.classList.add("is-filled"));
  fill(top, values[0]);
  if (reduced || !gsap) return;

  fields.forEach((dd) => {
    dd.textContent = "";
    dd.classList.remove("is-filled");
  });
  gsap.set(fly, { autoAlpha: 0 });

  // Where the format sits, measured from the pile, so the ticket can start there.
  const from = () => {
    const a = format.getBoundingClientRect();
    const b = top.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, scale: a.width / b.width };
  };

  let visible = true;
  let waiting = null;
  let current = null;

  const run = (i) => {
    const v = values[i % values.length];
    const tl = gsap.timeline({ onComplete: () => next(i + 1) });
    current = tl;
    tl.add(() => light(i % values.length));
    if (wireIn) tl.fromTo(wireIn, { left: "0%", autoAlpha: 1 }, { left: "100%", duration: 0.6, ease: "power1.inOut" }, 0.25).set(wireIn, { autoAlpha: 0 });
    fields.forEach((dd, k) => {
      tl.add(() => {
        dd.textContent = v[k] ?? "";
        dd.classList.add("is-filled");
      }, 0.85 + k * 0.14);
      tl.fromTo(dd, { "--fill": 0 }, { "--fill": 1, duration: 0.3, ease: "power2.out" }, 0.85 + k * 0.14);
    });
    tl.add(() => fill(fly, v), ">+0.35");
    if (wireOut) tl.fromTo(wireOut, { left: "0%", autoAlpha: 1 }, { left: "100%", duration: 0.5, ease: "power1.inOut" }, "<").set(wireOut, { autoAlpha: 0 });
    tl.fromTo(
      fly,
      { x: () => from().x, y: () => from().y, scale: () => from().scale, rotation: 0, autoAlpha: 1 },
      { x: 0, y: 0, scale: 1, rotation: -1.5, duration: 0.85, ease: "power3.inOut", immediateRender: false },
      "<0.1",
    );
    tl.add(() => {
      fill(top, v);
      gsap.set(fly, { autoAlpha: 0 });
      fields.forEach((dd) => {
        dd.textContent = "";
        dd.classList.remove("is-filled");
      });
    });
    tl.to({}, { duration: 0.7 });
  };

  const next = (i) => {
    current = null;
    if (visible) run(i);
    else waiting = i;
  };

  // Only while the hero is on screen.
  ScrollTrigger?.create({
    trigger: root,
    start: "top bottom",
    end: "bottom top",
    onToggle(self) {
      visible = self.isActive;
      if (current) current.paused(!visible);
      if (visible && waiting != null) {
        const i = waiting;
        waiting = null;
        run(i);
      }
    },
  });
  gsap.delayedCall(1.1, () => run(1));
}
