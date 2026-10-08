# Shruti Kale — Portfolio

The portfolio of Shruti Kale, product designer: a hand-built static site with
three case studies (Leucine, Bridge and Nestwise).

## What's inside

- `index.html` — the home page
- `work/leucine/`, `work/bridge/`, `work/nestwise/` — the case studies
- `css/` — styles (`main.css` for the whole site, `case.css` for case studies)
- `js/` — scripts as ES modules (`main.js` for the home page, `case.js` for case
  studies, `shared.js` for both)
- `assets/` — fonts and images
- `vendor/` — GSAP (with ScrollTrigger and SplitText) and Lenis

No build step and no dependencies to install.

## Preview locally

The scripts are ES modules, so the site has to be served over HTTP rather than
opened as a file. From this folder:

```bash
python3 -m http.server 4610
```

Then open http://localhost:4610.
