# Sumit Chandorkar, portfolio

Plain HTML, CSS and JavaScript. No build step, no framework.

## Structure

```
index.html              Homepage
dream-money.html        Dream Money case study
resume.pdf              Add this before launch (both pages link to it)
assets/
  css/main.css          Shared styles (both pages)
  css/case-study.css    Case study only, loads after main.css
  js/main.js            Shared scripts (scribble, nav, footer dots, tenure dates, copy email)
  js/case-study.js      Case study only (coin calculator, steppers, locked figures)
  img/                  Logos, screens and favicon
```

## Notes

- The locked figures are encrypted inside `dream-money.html` (the `locked-data` block). Changing the password means re-encrypting them.
- To add a screen, put the image in `assets/img/` and point the placeholder at it.
- New case study: copy `dream-money.html`, keep both CSS and both JS files linked.

## Go live

Drag the whole folder onto Netlify (app.netlify.com/drop), or push it to a GitHub repo and turn on GitHub Pages. Hard-refresh after each update.
