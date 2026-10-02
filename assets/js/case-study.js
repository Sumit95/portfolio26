/* Case study only: coin calculator, steppers, locked figures and copy buttons. Shared helpers repeated so this file stands alone. */
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

  /* ---------- Locked figures: encrypted in the page, unlocked with a password.
     Written in plain JavaScript (SHA-256, HMAC, PBKDF2) so it works everywhere, including previews and http. ---------- */
  (function () {
    var blobEl = doc.getElementById('locked-data'), dlg = doc.getElementById('unlock');
    if (!blobEl || !dlg) return;
    var blob; try { blob = JSON.parse(blobEl.textContent); } catch (e) { return; }
    var input = doc.getElementById('unlock-pw'), msg = dlg.querySelector('.unlock-msg'), go = dlg.querySelector('.unlock-go'), lastFocus = null;

    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    function sha256(bytes) {
      var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
      var l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n), i, j, W = new Array(64);
      m.set(bytes); m[l] = 0x80; var bits = l * 8;
      m[n - 4] = (bits >>> 24) & 255; m[n - 3] = (bits >>> 16) & 255; m[n - 2] = (bits >>> 8) & 255; m[n - 1] = bits & 255;
      m[n - 5] = Math.floor(l / 0x20000000) & 255;
      for (i = 0; i < n; i += 64) {
        for (j = 0; j < 16; j++) W[j] = (m[i + 4 * j] << 24) | (m[i + 4 * j + 1] << 16) | (m[i + 4 * j + 2] << 8) | m[i + 4 * j + 3];
        for (j = 16; j < 64; j++) {
          var a = W[j - 15], b = W[j - 2];
          var s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
          var s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
          W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0;
        }
        var A = H[0], B = H[1], C = H[2], D = H[3], E = H[4], F = H[5], G = H[6], Hh = H[7];
        for (j = 0; j < 64; j++) {
          var S1 = ((E >>> 6) | (E << 26)) ^ ((E >>> 11) | (E << 21)) ^ ((E >>> 25) | (E << 7));
          var t1 = (Hh + S1 + ((E & F) ^ (~E & G)) + K[j] + W[j]) | 0;
          var S0 = ((A >>> 2) | (A << 30)) ^ ((A >>> 13) | (A << 19)) ^ ((A >>> 22) | (A << 10));
          var t2 = (S0 + ((A & B) ^ (A & C) ^ (B & C))) | 0;
          Hh = G; G = F; F = E; E = (D + t1) | 0; D = C; C = B; B = A; A = (t1 + t2) | 0;
        }
        H[0] = (H[0] + A) | 0; H[1] = (H[1] + B) | 0; H[2] = (H[2] + C) | 0; H[3] = (H[3] + D) | 0;
        H[4] = (H[4] + E) | 0; H[5] = (H[5] + F) | 0; H[6] = (H[6] + G) | 0; H[7] = (H[7] + Hh) | 0;
      }
      var out = new Uint8Array(32);
      for (i = 0; i < 8; i++) { out[4 * i] = H[i] >>> 24; out[4 * i + 1] = (H[i] >>> 16) & 255; out[4 * i + 2] = (H[i] >>> 8) & 255; out[4 * i + 3] = H[i] & 255; }
      return out;
    }
    function cat(a, b) { var o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; }
    function hmac(key, data) {
      if (key.length > 64) key = sha256(key);
      var k = new Uint8Array(64); k.set(key);
      var ip = new Uint8Array(64), op = new Uint8Array(64);
      for (var i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
      return sha256(cat(op, sha256(cat(ip, data))));
    }
    function pbkdf2(pw, salt, iter, blocks) {
      var out = new Uint8Array(32 * blocks);
      for (var b = 1; b <= blocks; b++) {
        var u = hmac(pw, cat(salt, new Uint8Array([0, 0, 0, b]))), t = new Uint8Array(u);
        for (var i = 1; i < iter; i++) { u = hmac(pw, u); for (var j = 0; j < 32; j++) t[j] ^= u[j]; }
        out.set(t, 32 * (b - 1));
      }
      return out;
    }
    function utf8(s) { var e = unescape(encodeURIComponent(s)), o = new Uint8Array(e.length); for (var i = 0; i < e.length; i++) o[i] = e.charCodeAt(i); return o; }
    function fromUtf8(b) { var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return decodeURIComponent(escape(s)); }
    function b64(s) { var bin = atob(s), o = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }
    function decrypt(pw) {
      var salt = b64(blob.salt), iv = b64(blob.iv), ct = b64(blob.ct), tag = b64(blob.tag);
      var keys = pbkdf2(utf8(pw), salt, blob.iter, 2), ek = keys.subarray(0, 32), mk = keys.subarray(32, 64);
      var check = hmac(mk, cat(iv, ct)), diff = 0;
      for (var i = 0; i < 32; i++) diff |= check[i] ^ tag[i];
      if (diff) return null;
      var pt = new Uint8Array(ct.length);
      for (var off = 0, n = 0; off < ct.length; off += 32, n++) {
        var ks = hmac(ek, cat(iv, new Uint8Array([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])));
        for (var j = 0; j < 32 && off + j < ct.length; j++) pt[off + j] = ct[off + j] ^ ks[j];
      }
      try { return JSON.parse(fromUtf8(pt)); } catch (e) { return null; }
    }

    function fill(data) {
      each(doc.querySelectorAll('.locked'), function (el) {
        var v = data[el.getAttribute('data-k')]; if (!v) return;
        var m = el.querySelector('.mask'); if (m) m.textContent = v;
        el.classList.add('is-open'); el.classList.remove('locked');
        el.setAttribute('aria-label', v); el.setAttribute('tabindex', '-1');
      });
      var note = doc.querySelector('.lock-note');
      if (note) { note.className = 'lock-note done'; note.textContent = 'Unlocked. Thank you for keeping these figures private.'; }
    }
    function open() { lastFocus = doc.activeElement; dlg.hidden = false; dlg.removeAttribute('hidden'); msg.textContent = ''; setTimeout(function () { input.focus(); }, 30); }
    function close() { dlg.hidden = true; dlg.setAttribute('hidden', ''); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function attempt() {
      var pw = input.value; if (!pw) return;
      msg.textContent = 'Checking…'; go.disabled = true;
      setTimeout(function () {
        var data = null; try { data = decrypt(pw); } catch (e) {}
        go.disabled = false;
        if (!data) { msg.textContent = "That password didn't work. Try again, or ask me for it."; return; }
        fill(data); close(); input.value = '';
      }, 30);
    }
    each(doc.querySelectorAll('.lk, .lock-link'), function (el) { el.addEventListener('click', function () { if (!el.classList.contains('is-open')) open(); }); });
    go.addEventListener('click', attempt);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); attempt(); } });
    dlg.querySelector('.unlock-close').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    doc.addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.keyCode === 27) && !dlg.hidden) close(); });
    /* Nothing is remembered: every reload starts locked again. */
    try { sessionStorage.removeItem('dm-pw'); } catch (x) {}
  })();

  /* ---------- Coin calculator: save X a day for Y years, see the grams stack up ---------- */
  (function () {
    var box = doc.getElementById('coins'); if (!box) return;
    var pile = box.querySelector('.coins-pile'), outG = box.querySelector('.coins-g'), outV = box.querySelector('.coins-v');
    var PRICE = 8000, amt = 10, yrs = 1, shown = 0;
    function inr(n) { var s = String(Math.round(n)), last = s.slice(-3), rest = s.slice(0, -3); return '₹' + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' : '') + last; }
    function draw(animate) {
      var saved = amt * 365 * yrs, grams = saved / PRICE;
      var coins = Math.max(1, Math.min(24, Math.round(Math.sqrt(grams) * 2.2)));
      outG.textContent = (grams < 10 ? grams.toFixed(2) : grams < 100 ? grams.toFixed(1) : Math.round(grams)) + ' g';
      outV.textContent = 'of gold, from ' + inr(saved) + ' saved';
      var cols = coins <= 8 ? 1 : coins <= 16 ? 2 : 3, per = Math.ceil(coins / cols);
      pile.innerHTML = '';
      for (var c = 0, made = 0; c < cols; c++) {
        var st = doc.createElement('div'); st.className = 'stack';
        for (var i = 0; i < per && made < coins; i++, made++) {
          var co = doc.createElement('span'); co.className = 'coin';
          if (animate && made >= shown && !reduce.matches) { co.className += ' drop'; co.style.animationDelay = ((made - shown) * 45) + 'ms'; }
          st.appendChild(co);
        }
        pile.appendChild(st);
      }
      shown = coins;
    }
    each(box.querySelectorAll('.chips'), function (group) {
      var set = group.getAttribute('data-set');
      each(group.querySelectorAll('button'), function (btn) {
        btn.addEventListener('click', function () {
          each(group.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
          var v = +btn.getAttribute('data-v'); if (set === 'amt') amt = v; else yrs = v;
          draw(true);
        });
      });
    });
    draw(false);
  })();

  /* ---------- Steppers (onboarding and Gold Rush): steps light up in turn, the phone slides to each step's screen ---------- */
  each(doc.querySelectorAll('[data-stepper]'), function (root) {
    var list = root.querySelector('.steps'), track = root.querySelector('.track'), viewer = root.querySelector('.viewer');
    if (!list || !track) return;
    var items = list.querySelectorAll('li'), n = items.length, conf = root.querySelector('.confetti'), hasConf = root.hasAttribute('data-confetti');
    var STEP = 3200, cur = 0, auto = !reduce.matches, hov = false, off = true, paused = true, t = 0, startT = 0, remaining = STEP;
    root.style.setProperty('--step', (STEP / 1000) + 's');
    if (!auto) root.classList.add('is-manual');

    function burst() {
      if (!conf || reduce.matches) return;
      conf.innerHTML = '';
      var cols = ['#FFD24A', '#FFB547', '#FFFFFF', '#8EA6FF', '#F2B632'];
      for (var i = 0; i < 26; i++) {
        var p = doc.createElement('i'), ang = Math.random() * Math.PI - Math.PI, dist = 50 + Math.random() * 70;
        p.style.background = cols[i % cols.length];
        p.style.setProperty('--x', (Math.cos(ang) * dist).toFixed(0) + 'px');
        p.style.setProperty('--y', (Math.sin(ang) * dist + 60).toFixed(0) + 'px');
        p.style.setProperty('--r', (Math.random() * 540 - 270).toFixed(0) + 'deg');
        p.style.animationDelay = (Math.random() * 120).toFixed(0) + 'ms';
        conf.appendChild(p);
      }
      setTimeout(function () { conf.innerHTML = ''; }, 1900);
    }
    function keepInView(li) {
      if (list.scrollWidth <= list.clientWidth + 2) return;            /* only when the steps scroll sideways (phones) */
      var pad = parseFloat(getComputedStyle(list).paddingLeft) || 0;
      var left = list.scrollLeft + (li.getBoundingClientRect().left - list.getBoundingClientRect().left) - pad;  /* line the box up with the page's text edge */
      left = Math.max(0, Math.min(left, list.scrollWidth - list.clientWidth));
      if (list.scrollTo) { try { list.scrollTo({ left: left, behavior: reduce.matches ? 'auto' : 'smooth' }); return; } catch (e) {} }
      list.scrollLeft = left;
    }
    function go(i) {
      cur = (i + n) % n;
      each(items, function (li, k) {
        li.classList.remove('run');
        if (k === cur) li.classList.add('on'); else li.classList.remove('on');
      });
      track.style.transform = 'translateX(' + (-100 * cur) + '%)';
      if (auto) { void items[cur].offsetWidth; items[cur].classList.add('run'); }
      keepInView(items[cur]);
      if (cur === n - 1 && hasConf) burst();
    }
    function schedule(ms) { clearTimeout(t); startT = now(); remaining = ms; t = setTimeout(function () { go(cur + 1); schedule(STEP); }, ms); }
    function update() {
      var should = auto && !hov && !off;
      if (should && paused) { paused = false; root.classList.remove('is-paused'); schedule(Math.max(150, remaining)); }
      else if (!should && !paused) { paused = true; root.classList.add('is-paused'); clearTimeout(t); remaining -= now() - startT; }
    }
    function manual() { auto = false; clearTimeout(t); root.classList.add('is-manual'); each(items, function (li) { li.classList.remove('run'); }); }

    each(items, function (li, k) { li.querySelector('button').addEventListener('click', function () { manual(); go(k); }); });
    list.addEventListener('mouseenter', function () { hov = true; update(); });
    list.addEventListener('mouseleave', function () { hov = false; update(); });
    if (viewer) {
      viewer.addEventListener('mouseenter', function () { hov = true; update(); });
      viewer.addEventListener('mouseleave', function () { hov = false; update(); });
      var x0 = null;
      viewer.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      viewer.addEventListener('touchend', function (e) {
        if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) { manual(); go(cur + (dx < 0 ? 1 : -1)); }
      });
    }
    list.addEventListener('touchstart', function () { if (auto) manual(); }, { passive: true });

    go(0);
    root.classList.add('is-paused');
    if (win.IntersectionObserver) new IntersectionObserver(function (en) { off = !en[0].isIntersecting; update(); }, { threshold: 0.3 }).observe(root);
    else { off = false; update(); }
  });

  /* ---------- Copy email buttons ---------- */
  each(doc.querySelectorAll('.copy-inline'), function (btn) {
    var label = btn.querySelector('span'), text = btn.getAttribute('data-copy'), tm = 0;
    function done(ok) { clearTimeout(tm); if (label) label.textContent = ok ? 'Copied' : 'Press Ctrl+C'; btn.classList.toggle('done', !!ok); tm = setTimeout(function () { if (label) label.textContent = 'Copy'; btn.classList.remove('done'); }, 1800); }
    function legacy() { var ta = doc.createElement('textarea'); ta.value = text; ta.style.position = 'absolute'; ta.style.left = '-9999px'; doc.body.appendChild(ta); ta.select(); var ok = false; try { ok = doc.execCommand('copy'); } catch (e) {} doc.body.removeChild(ta); done(ok); }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, legacy); else legacy();
    });
  });

})();
