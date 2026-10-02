/* Written in ES5 with feature checks, so it runs in old browsers and fails quietly if something is missing. */
(function () {
  var doc = document, root = doc.documentElement, win = window;
  var mq = function (q) { return win.matchMedia ? win.matchMedia(q) : { matches: false }; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var dark = mq('(prefers-color-scheme: dark)');
  var raf = win.requestAnimationFrame || function (f) { return setTimeout(function () { f(+new Date()); }, 33); };
  var caf = win.cancelAnimationFrame || clearTimeout;
  var now = function () { return win.performance && performance.now ? performance.now() : +new Date(); };
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function onChange(m, fn) { if (!m) return; if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); }
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : !!dark.matches; }

  /* ---------- The scribble: a pen scribbles over one word, then the line is drawn down into an underline beneath another ----------
     Phase 1 (2.4s): the pen moves left to right in looping strokes, with slight changes in speed and pressure like a real hand.
     Phase 2 (0.6s): a pause, so the eye registers the mess.
     Phase 3 (1.9s): the thread is pulled down into place from its starting end, following a curve rather than a straight jump. */
  function Knot(el, opts) {
    var svg = el.querySelector('.knot'), path = svg && svg.querySelector('path');
    var from = el.querySelector('.w-from'), to = el.querySelector('.w-to');
    if (!path || !from || !to || !el.getBoundingClientRect) return;
    var N = 220, A = [], B = [], state = 'idle', t0 = 0, id = 0, seed = opts.seed || 0, len = 0;
    var T_DRAW = 2400, T_HOLD = 600, T_PULL = 1900;
    function rel(r, e) { return { l: r.left - e.left, t: r.top - e.top, w: r.width, h: r.height, b: r.bottom - e.top }; }
    function noise(x) { return Math.sin(x * 1.7 + seed) * 0.6 + Math.sin(x * 3.1 + seed * 2.3) * 0.4; }
    function geometry() {
      var e = el.getBoundingClientRect(), f = rel(from.getBoundingClientRect(), e), g = rel(to.getBoundingClientRect(), e);
      var fs = parseFloat((win.getComputedStyle ? getComputedStyle(el).fontSize : '') || 48) || 48;
      var loops = Math.max(5, Math.round(f.w / (fs * 0.42)));          /* loop count scales with the word, so it looks hand-made at any size */
      var cy = f.t + f.h * 0.52, ay = f.h * 0.26, ax = f.w / loops * 0.55;
      var uy = g.b + fs * 0.05;
      A = []; B = [];
      for (var i = 0; i < N; i++) {
        var t = i / (N - 1), ph = t * Math.PI * 2 * loops;
        var x = f.l - fs * 0.04 + t * (f.w + fs * 0.08) + ax * Math.sin(ph);   /* forward motion plus a loop */
        var y = cy + ay * Math.cos(ph) * (0.85 + 0.15 * noise(t * 6)) + fs * 0.05 * noise(t * 2.2); /* uneven like a hand */
        A.push([x, y]);
        B.push([g.l + t * g.w, uy + Math.sin(t * Math.PI) * fs * 0.012]);
      }
    }
    function d(pts) {
      var s = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var i = 1; i < pts.length - 1; i++) {
        var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        s += 'Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
      }
      var l = pts[pts.length - 1]; return s + 'L' + l[0].toFixed(1) + ' ' + l[1].toFixed(1);
    }
    function sine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
    function cubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function pulled(k) {
      var out = [];
      for (var i = 0; i < N; i++) {
        var lag = (i / (N - 1)) * 0.45, e = cubic(clamp((k - lag) / 0.55));
        var ax = A[i][0], ay = A[i][1], bx = B[i][0], by = B[i][1];
        var cx = ax + (bx - ax) * 0.15, cy = by + (ay - by) * 0.1;        /* curve: drop first, then settle sideways */
        var u = 1 - e;
        out.push([u * u * ax + 2 * u * e * cx + e * e * bx, u * u * ay + 2 * u * e * cy + e * e * by]);
      }
      return out;
    }
    function setDash(on) {
      if (on) { len = path.getTotalLength ? path.getTotalLength() : 2000; path.style.strokeDasharray = len + ' ' + len; }
      else { path.style.strokeDasharray = ''; path.style.strokeDashoffset = ''; }
    }
    function frame() {
      var e = now() - t0;
      if (state === 'draw') {
        var k = clamp(e / T_DRAW); k = clamp(k + 0.025 * Math.sin(k * Math.PI * 2 * 5));  /* small speed changes, still always moving forward */
        path.style.strokeDashoffset = (len * (1 - sine(k))).toFixed(1);
        if (e >= T_DRAW + T_HOLD) { setDash(false); state = 'pull'; t0 = now(); }
      } else if (state === 'pull') {
        path.setAttribute('d', d(pulled(clamp(e / T_PULL))));
        if (e >= T_PULL) { state = 'done'; path.setAttribute('d', d(B)); return; }
      } else return;
      id = raf(frame);
    }
    function play() {
      geometry(); caf(id);
      if (reduce.matches) { state = 'done'; setDash(false); path.setAttribute('d', d(B)); return; }
      path.setAttribute('d', d(A)); setDash(true); path.style.strokeDashoffset = len;
      state = 'draw'; t0 = now(); id = raf(frame);
    }
    this.play = play;
    var rt = 0;
    win.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (state !== 'done') return; geometry(); path.setAttribute('d', d(B)); }, 120); });
    if (mq('(hover: hover) and (pointer: fine)').matches) {
      from.addEventListener('mouseenter', function () { if (state === 'done' && !reduce.matches) play(); });
    }
  }

  try {
    var heroKnot = doc.querySelector('.intro .knotted'), footKnot = doc.querySelector('.contact-line.knotted');
    var whenFonts = function (fn) { if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fn, fn); else setTimeout(fn, 400); };
    if (heroKnot) { var k1 = new Knot(heroKnot, { seed: 0 }); whenFonts(function () { setTimeout(function () { k1.play && k1.play(); }, 600); }); }
    if (footKnot) {
      var k2 = new Knot(footKnot, { seed: 1.7 });
      if (win.IntersectionObserver) {
        var fio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { fio.disconnect(); whenFonts(function () { k2.play && k2.play(); }); } }, { threshold: 0.6 });
        fio.observe(footKnot);
      } else whenFonts(function () { k2.play && k2.play(); });
    }
  } catch (e) {}

  /* ---------- Greeting: hello in the languages of the places I'd like to work. One full round, then it rests. ---------- */
  var hello = doc.querySelector('.hello'), hw = hello && hello.querySelector('.hello-word');
  var words = [['नमस्ते', 'Hindi'], ['Hello', 'English'], ['Grüezi', 'Swiss German'], ['नमस्कार', 'Marathi'], ['Bonjour', 'French'],
    ['مرحبا', 'Arabic'], ['Servus', 'Austrian German'], ['ನಮಸ್ಕಾರ', 'Kannada'], ['Ciao', 'Italian'], ['నమస్కారం', 'Telugu'], ['Allegra', 'Romansh'], ['नमस्ते', 'Hindi']];
  var wi = 0, wt = 0, paused = false;
  function showWord(i) {
    hello.className = 'hello out';
    setTimeout(function () {
      hw.textContent = words[i][0];
      if (words[i][1] === 'Arabic') hw.setAttribute('dir', 'rtl'); else hw.removeAttribute('dir');
      hello.className = 'hello pre'; void hello.offsetWidth; hello.className = 'hello';
    }, 260);
  }
  function step() {
    if (paused || doc.hidden) { wt = setTimeout(step, 600); return; }
    wi++; if (wi >= words.length) return;
    showWord(wi); wt = setTimeout(step, 1900);
  }
  if (hello && hw && !reduce.matches) {
    wt = setTimeout(step, 6400); /* starts after the scribble has settled */
    hello.addEventListener('mouseenter', function () { if (wi >= words.length - 1) { wi = 0; clearTimeout(wt); wt = setTimeout(step, 300); } });
  }

  function Field(canvas, opts) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d'), pts = [], w = 0, h = 0, run = false, id = 0, last = 0, mx = -9999, my = -9999, active = false, settled = false, t0 = now(), visible = true;
    var lowPower = (navigator.hardwareConcurrency || 4) <= 2;
    function colors() {
      if (opts.onDark) return { dot: '#C7D2EC', acc: '#7C98FF' };
      return isDark() ? { dot: '#B9C3DA', acc: '#7C98FF' } : { dot: '#0E1A33', acc: '#2F5BFF' };
    }
    var col = colors();
    function build() {
      var dpr = Math.min(win.devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var gap = w < 700 ? 22 : 28; if (lowPower) gap += 6;
      pts = [];
      var cols = Math.ceil(w / gap) + 1, rows = Math.ceil(h / gap) + 1, scatter = opts.scatter && !reduce.matches;
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var hx = x * gap + gap / 2, hy = y * gap + gap / 2, f = opts.fade(hx, hy, w, h);
        if (f <= 0.02) continue;
        var p = { hx: hx, hy: hy, f: f, acc: ((x * 7 + y * 13) % 23) === 0, k: 0.03 + Math.random() * 0.04 };
        p.x = scatter ? hx + (Math.random() - 0.5) * 260 : hx;
        p.y = scatter ? hy + (Math.random() - 0.5) * 200 : hy;
        pts.push(p);
      }
      settled = !scatter; t0 = now();
      measure();
    }
    var rects = [], PAD = 22, FALL = 44;
    function measure() {
      rects = [];
      if (!opts.avoid) return;
      var c = canvas.getBoundingClientRect();
      each(doc.querySelectorAll(opts.avoid), function (el) {
        var r = el.getBoundingClientRect();
        if (r.width) rects.push({ l: r.left - c.left - PAD, r: r.right - c.left + PAD, t: r.top - c.top - PAD, b: r.bottom - c.top + PAD });
      });
    }
    function clearOf(x, y) {
      var m = 1;
      for (var i = 0; i < rects.length; i++) {
        var q = rects[i], dx = Math.max(q.l - x, 0, x - q.r), dy = Math.max(q.t - y, 0, y - q.b);
        var d = Math.sqrt(dx * dx + dy * dy) / FALL; if (d < m) m = d;
      }
      return m;
    }
    function scatterNow() { for (var i = 0; i < pts.length; i++) { pts[i].x = pts[i].hx + (Math.random() - 0.5) * 260; pts[i].y = pts[i].hy + (Math.random() - 0.5) * 200; } settled = false; t0 = now(); }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      var wave = opts.wave && settled && !reduce.matches, s = (t - t0) / 1000, R = 120, moving = false;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (!reduce.matches) {
          p.x += (p.hx - p.x) * p.k; p.y += (p.hy - p.y) * p.k;
          if (active) {
            var dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy);
            if (d < R && d > 0.01) { var push = (1 - d / R) * 9; p.x += dx / d * push; p.y += dy / d * push; }
          }
          if (Math.abs(p.hx - p.x) > 0.15 || Math.abs(p.hy - p.y) > 0.15) moving = true;
        }
        var off = Math.sqrt((p.x - p.hx) * (p.x - p.hx) + (p.y - p.hy) * (p.y - p.hy));
        var a = opts.alpha * p.f * (1 - Math.min(off / 260, 0.6)) * clearOf(p.x, p.y);
        if (a < 0.004) continue;
        var rad = 1.25;
        if (wave) { var wv = Math.sin(p.hx * 0.006 + p.hy * 0.004 - s * 0.9); if (wv > 0.75) { a *= 1 + (wv - 0.75) * 5; rad += (wv - 0.75) * 1.6; } }
        ctx.globalAlpha = Math.min(a * (p.acc ? 2.4 : 1), 0.9);
        ctx.fillStyle = p.acc ? col.acc : col.dot;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!moving && !active) settled = true;
      return moving || active || wave;
    }
    function loop(t) {
      if (!run) return;
      if (t - last > 30) { last = t; if (!draw(t)) { run = false; return; } }
      id = raf(loop);
    }
    function start() { if (run || !visible || doc.hidden) return; run = true; id = raf(loop); }
    function stop() { run = false; caf(id); }
    build(); draw(now()); if (!reduce.matches && !opts.scatterOnView) start();
    setTimeout(function () { measure(); if (!run) draw(now()); }, 1100);
    var rt = 0;
    win.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { opts.scatter = false; build(); draw(now()); start(); }, 150); });
    if (opts.interactive) {
      var host = opts.interactHost || canvas.parentNode;
      host.addEventListener('mousemove', function (e) { var r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; active = true; start(); });
      host.addEventListener('mouseleave', function () { active = false; mx = my = -9999; });
      var touch = function (e) { var t = e.touches && e.touches[0]; if (!t) return; var r = canvas.getBoundingClientRect(); mx = t.clientX - r.left; my = t.clientY - r.top; active = true; start(); };
      host.addEventListener('touchstart', touch, { passive: true });
      host.addEventListener('touchmove', touch, { passive: true });
      host.addEventListener('touchend', function () { active = false; mx = my = -9999; });
    }
    var seen = false;
    if (win.IntersectionObserver) new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible && opts.scatterOnView && !seen && !reduce.matches) { seen = true; measure(); scatterNow(); }
      if (visible) start(); else stop();
    }, { threshold: 0.25 }).observe(canvas);
    else if (opts.scatterOnView && !reduce.matches) start();
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) stop(); else start(); });
    onChange(reduce, function () { stop(); draw(now()); if (!reduce.matches) start(); });
    onChange(dark, function () { col = colors(); draw(now()); });
  }

  try {
    var ff = doc.getElementById('foot-field');
    if (ff && ff.offsetWidth) {
      new Field(ff, {
        scatter: false, scatterOnView: true, interactive: true, wave: true, alpha: 0.42, onDark: true,
        interactHost: doc.querySelector('.site-footer'),
        fade: function (x, y, w, h) { return Math.min(1, y / (h * 0.25)) * Math.min(1, (h - y) / (h * 0.2)); }
      });
    }
  } catch (e) {}

  /* ---------- Sticky header: hide on scroll down, show on scroll up, progress line, active section ---------- */
  var header = doc.querySelector('.site-header'), bar = doc.querySelector('.progress'), dot = doc.querySelector('.nav-dot');
  var links = doc.querySelectorAll('.site-nav a'), lastY = 0, ticking = false;
  function visibleLinks() { var out = []; each(links, function (a) { if (a.offsetWidth) out.push(a); }); return out; }
  function update() {
    ticking = false;
    var y = win.pageYOffset || root.scrollTop, max = (doc.body.scrollHeight - win.innerHeight) || 1;
    if (header) {
      if (y > 8) header.classList.add('scrolled'); else header.classList.remove('scrolled');
      var focusIn = header.contains && header.contains(doc.activeElement) && doc.activeElement !== doc.body;
      if (y > lastY + 4 && y > 500 && !focusIn) header.classList.add('hidden');
      else if (y < lastY - 4 || y < 500) header.classList.remove('hidden');
    }
    lastY = y;
    if (bar) { var p = Math.min(1, y / max); bar.style.transform = 'scaleX(' + p + ')'; }
    var current = null, mark = win.innerHeight * 0.4;
    each(visibleLinks(), function (a) {
      var el = doc.getElementById(a.getAttribute('href').slice(1));
      if (el && el.getBoundingClientRect().top < mark) current = a;
    });
    if (y + win.innerHeight >= doc.body.scrollHeight - 4) { var v = visibleLinks(); current = v[v.length - 1]; }
    each(links, function (a) { if (a === current) a.classList.add('active'); else a.classList.remove('active'); });
    if (dot) {
      if (current) { dot.style.opacity = 1; dot.style.width = current.offsetWidth + 'px'; dot.style.transform = 'translateX(' + current.offsetLeft + 'px)'; }
      else dot.style.opacity = 0;
    }
  }
  function onScroll() { if (!ticking) { ticking = true; raf(update); } }
  win.addEventListener('scroll', onScroll);
  win.addEventListener('resize', onScroll);
  update();

  /* ---------- Case covers: cursor chip and dot reveal follow the pointer ---------- */
  var fine = mq('(hover: hover) and (pointer: fine)').matches;
  each(doc.querySelectorAll('.case-link'), function (card) {
    var cover = card.querySelector('.cover');
    if (!cover || !fine) return;
    var chip = doc.createElement('span'); chip.className = 'chip'; chip.setAttribute('aria-hidden', 'true');
    chip.appendChild(doc.createTextNode(card.getAttribute('data-chip') || 'View case study'));
    cover.appendChild(chip);
    cover.addEventListener('mousemove', function (e) {
      var r = cover.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      cover.style.setProperty('--mx', x + 'px'); cover.style.setProperty('--my', y + 'px');
      chip.style.left = x + 'px'; chip.style.top = y + 'px';
    });
  });

  /* ---------- Reveals: covers wipe in, glyphs play once in view and again on hover ---------- */
  var habits = doc.querySelectorAll('.habit');
  function play(el) { el.classList.remove('play'); void el.offsetWidth; el.classList.add('play'); }
  each(habits, function (h) { h.addEventListener('mouseenter', function () { if (!reduce.matches) play(h); }); });
  if (win.IntersectionObserver && !reduce.matches) {
    root.classList.add('reveal-on');
    var io = new IntersectionObserver(function (entries) {
      each(entries, function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.classList.contains('case')) el.classList.add('in'); else play(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    each(doc.querySelectorAll('.case'), function (c) { io.observe(c); });
    each(habits, function (h, i) { setTimeout(function () { io.observe(h); }, i * 120); });
  }

  /* ---------- How I work on phones: the dots follow the swipe ---------- */
  var hs = doc.querySelector('.habits'), hd = doc.querySelectorAll('.habit-dots span');
  if (hs && hd.length) {
    var hTick = false;
    hs.addEventListener('scroll', function () {
      if (hTick) return; hTick = true;
      raf(function () {
        hTick = false;
        var first = hs.querySelector('.habit'); if (!first) return;
        var step = first.offsetWidth + 14, i = Math.round(hs.scrollLeft / step);
        each(hd, function (d, k) { if (k === i) d.classList.add('on'); else d.classList.remove('on'); });
      });
    });
  }

  /* ---------- Copy email, with a fallback for browsers without the Clipboard API ---------- */
  var btn = doc.querySelector('.copy'), status = doc.getElementById('copy-status'), email = 'sumitchandorkar1995@gmail.com', ct = 0;
  if (btn) {
    btn.removeAttribute('hidden'); btn.hidden = false;
    var done = function (ok) {
      clearTimeout(ct);
      btn.setAttribute('data-tip', ok ? 'Copied' : 'Press Ctrl+C');
      if (ok) btn.classList.add('done');
      if (status) status.textContent = ok ? 'Email address copied' : '';
      ct = setTimeout(function () { btn.classList.remove('done'); btn.setAttribute('data-tip', 'Copy email'); if (status) status.textContent = ''; }, 2000);
    };
    var legacy = function () {
      var ta = doc.createElement('textarea'); ta.value = email; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.left = '-9999px';
      doc.body.appendChild(ta); ta.select(); var ok = false; try { ok = doc.execCommand('copy'); } catch (e) {} doc.body.removeChild(ta); done(ok);
    };
    btn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(email).then(function () { done(true); }, legacy);
      else legacy();
    });
  }

  /* ---------- Years of experience, worked out from real dates so they grow on their own ----------
     DESIGN_START: the month you started at Dreamscape Media (your first design role). Replace with the exact month. */
  var DESIGN_START = '2018-12';
  function parseYM(v) { var p = (v || '').split('-'); return p.length === 2 ? { y: +p[0], m: +p[1] } : null; }
  function monthsBetween(from, to) {
    var a = parseYM(from); if (!a) return null;
    var d = new Date(), b = parseYM(to) || { y: d.getFullYear(), m: d.getMonth() + 1 };
    return (b.y - a.y) * 12 + (b.m - a.m) + 1; /* counted the way LinkedIn does: both end months included */
  }
  function shortDur(n) {
    var y = Math.floor(n / 12), m = n % 12, out = [];
    if (y) out.push(y + (y === 1 ? ' yr' : ' yrs'));
    if (m) out.push(m + (m === 1 ? ' mo' : ' mos'));
    return out.join(' ');
  }
  each(doc.querySelectorAll('.tenure[data-from]'), function (el) {
    var n = monthsBetween(el.getAttribute('data-from'), el.getAttribute('data-to'));
    if (n) el.textContent = shortDur(n);
  });
  var total = monthsBetween(DESIGN_START);
  if (total) {
    var ty = Math.floor(total / 12), tm = total % 12;
    each(doc.querySelectorAll('[data-years="exact"]'), function (el) {
      el.textContent = ty + ' years' + (tm ? ' ' + tm + (tm === 1 ? ' month' : ' months') : '');
    });
    var nums = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    each(doc.querySelectorAll('[data-since]'), function (el) { var n = Math.floor((monthsBetween(el.getAttribute('data-since')) || 0) / 12); if (n > 0) el.textContent = nums[n] || n; });
    each(doc.querySelectorAll('[data-years="short"]'), function (el) { el.textContent = tm >= 9 ? 'Nearly ' + (ty + 1) + ' years' : ty + (tm ? '+' : '') + ' years'; });
    each(doc.querySelectorAll('[data-years="phrase"]'), function (el) {
      el.textContent = tm >= 9 ? 'nearly ' + (ty + 1) + ' years' : tm >= 1 ? 'over ' + ty + ' years' : ty + ' years';
    });
  }
})();
