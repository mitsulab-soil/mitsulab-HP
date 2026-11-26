/* mcam.js ── M（意味づけ）の道具の共通部品。2026-11-27
   いまの景色（カメラ。使えないときは例の景色）を、枠（mode）ごとに描き直し、字幕に「景色へ目を戻す一問」を出す。
   どの場所でも働く：場所の記録に頼らず、カメラ・向き・傾き・位置・日時から、その場で組む。
   使い方：MCam.start({ name, modes:[{id,label,ask,notes:[{text,src}], fx(px,w,h,S), over(ctx,W,H,S,t), enter(S)}], sources:{key:{title,url}}, about:'html' })
   GUI は共通の決まり（右下に［枠 ▾］［カメラ］［≡］）。qgui-unify は index.html の側で読む。 */
(function (g) {
  'use strict';
  var C, cv, ctx, dpr = Math.min(g.devicePixelRatio || 1, 2), small, sx, still = new Image(), video = null, useCam = false;
  var mode = null, noteI = -1, from = null, fadeT = 0, last = 0, t0 = performance.now();
  var S = { heading: null, beta: null, gamma: null, pos: null, now: new Date(), cam: false };
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ── 色の計算（sRGB → Lab。枠ごとの色の切り分けに使う） ── */
  function lin(c) { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
  function lab(r, g, b) {
    r = lin(r); g = lin(g); b = lin(b);
    var x = (r * .4124 + g * .3576 + b * .1805) / .95047, y = r * .2126 + g * .7152 + b * .0722, z = (r * .0193 + g * .1192 + b * .9505) / 1.08883;
    function f(t) { return t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    var fx = f(x), fy = f(y), fz = f(z); return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  /* 色の区分けの表（32 段の立方体）を一度だけ作る。pal＝[{name, c:'#rrggbb', at:'#代表点'}] */
  function lut(pal) {
    var P = pal.map(function (p, i) { var a = hex(p.at || p.c); return { L: lab(a[0], a[1], a[2]), rgb: hex(p.c), w: p.w || 1, g: p.g == null ? i : p.g }; });
    var T = new Uint8Array(32768);
    for (var r = 0; r < 32; r++) for (var gg = 0; gg < 32; gg++) for (var b = 0; b < 32; b++) {
      var L = lab(r * 8 + 4, gg * 8 + 4, b * 8 + 4), bi = 0, bd = 1e9;
      for (var i = 0; i < P.length; i++) { var d = (L[0] - P[i].L[0]) * (L[0] - P[i].L[0]) * .6 + (L[1] - P[i].L[1]) * (L[1] - P[i].L[1]) + (L[2] - P[i].L[2]) * (L[2] - P[i].L[2]); d /= P[i].w; if (d < bd) { bd = d; bi = i; } }
      T[(r << 10) | (gg << 5) | b] = bi;
    }
    return { T: T, P: P };
  }
  /* 景色をその区分けで塗り分け、区分けの境に細い線を引く（「区切り方」が見える） */
  function blur(px, w, h, r) { /* 区切りの前に細かいざらつきをならす（横・縦の箱型） */
    var q = new Float32Array(px.length), i, x, y, c, s, o;
    for (y = 0; y < h; y++) for (c = 0; c < 3; c++) { s = 0; for (x = -r; x <= r; x++) s += px[(y * w + Math.min(w - 1, Math.max(0, x))) * 4 + c]; for (x = 0; x < w; x++) { q[(y * w + x) * 4 + c] = s / (2 * r + 1); s += px[(y * w + Math.min(w - 1, x + r + 1)) * 4 + c] - px[(y * w + Math.max(0, x - r)) * 4 + c]; } }
    o = new Uint8ClampedArray(px.length);
    for (x = 0; x < w; x++) for (c = 0; c < 3; c++) { s = 0; for (y = -r; y <= r; y++) s += q[(Math.min(h - 1, Math.max(0, y)) * w + x) * 4 + c]; for (y = 0; y < h; y++) { o[(y * w + x) * 4 + c] = s / (2 * r + 1); s += q[(Math.min(h - 1, y + r + 1) * w + x) * 4 + c] - q[(Math.max(0, y - r) * w + x) * 4 + c]; } }
    return o;
  }
  function carve(px, w, h, Lt, mix) {
    var n = w * h, id = new Uint8Array(n), i, k, bp = blur(px, w, h, 3);
    for (i = 0, k = 0; i < n; i++, k += 4) id[i] = Lt.T[((bp[k] >> 3) << 10) | ((bp[k + 1] >> 3) << 5) | (bp[k + 2] >> 3)];
    /* 小さな島をならす（まわり 8 つの多数に合わせる） */
    var id2 = id.slice(0);
    for (var yy = 1; yy < h - 1; yy++) for (var xx = 1; xx < w - 1; xx++) { var j = yy * w + xx, cnt = {}, best = id[j], bc = 0; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var v = id[j + dy * w + dx]; cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] > bc) { bc = cnt[v]; best = v; } } if (bc >= 5) id2[j] = best; }
    id = id2;
    mix = mix == null ? .66 : mix;
    for (i = 0, k = 0; i < n; i++, k += 4) {
      var c = Lt.P[id[i]].rgb, x = i % w, gi = Lt.P[id[i]].g, edge = (x < w - 1 && gi !== Lt.P[id[i + 1]].g) || (i + w < n && gi !== Lt.P[id[i + w]].g);
      if (edge) { px[k] = px[k] * .3 + 165; px[k + 1] = px[k + 1] * .3 + 172; px[k + 2] = px[k + 2] * .3 + 171; continue; }
      px[k] = px[k] * (1 - mix) + c[0] * mix; px[k + 1] = px[k + 1] * (1 - mix) + c[1] * mix; px[k + 2] = px[k + 2] * (1 - mix) + c[2] * mix;
    }
    return id;
  }
  /* 線（明るさの差の大きい所）だけを浮かべる */
  function edges(px, w, h, col, keep) {
    var n = w * h, Y = new Float32Array(n), i, k; col = col || [155, 220, 240]; keep = keep == null ? .28 : keep;
    for (i = 0, k = 0; i < n; i++, k += 4) Y[i] = px[k] * .3 + px[k + 1] * .59 + px[k + 2] * .11;
    for (i = 0, k = 0; i < n; i++, k += 4) {
      var x = i % w, e = 0;
      if (x > 0 && x < w - 1 && i > w && i < n - w) { var gx = Y[i + 1] - Y[i - 1], gy = Y[i + w] - Y[i - w]; e = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 70); }
      var y = Y[i] * keep; px[k] = y + (col[0] - y) * e; px[k + 1] = y + (col[1] - y) * e; px[k + 2] = y + (col[2] - y) * e;
    }
  }
  function tone(px, m, a) { for (var k = 0; k < px.length; k += 4) { px[k] = px[k] * m[0] + a[0]; px[k + 1] = px[k + 1] * m[1] + a[1]; px[k + 2] = px[k + 2] * m[2] + a[2]; } }

  /* ── 太陽（低精度の式。二十四節気・七十二候は太陽の黄経で決まる） ── */
  function sun(d, lat, lon) {
    var JD = d.getTime() / 864e5 + 2440587.5, n = JD - 2451545, Lm = (280.46 + .9856474 * n) % 360, gm = (357.528 + .9856003 * n) % 360, rad = Math.PI / 180;
    var lam = (Lm + 1.915 * Math.sin(gm * rad) + .02 * Math.sin(2 * gm * rad) + 360) % 360, eps = 23.439 - 4e-7 * n;
    var ra = Math.atan2(Math.cos(eps * rad) * Math.sin(lam * rad), Math.cos(lam * rad)), dec = Math.asin(Math.sin(eps * rad) * Math.sin(lam * rad));
    var o = { lambda: lam, dec: dec / rad };
    if (lat != null) {
      var gmst = (280.46061837 + 360.98564736629 * n) % 360, ha = ((gmst + lon) * rad - ra), la = lat * rad;
      var alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha));
      var az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(ha));
      o.alt = alt / rad; o.az = (az / rad + 360) % 360;
    }
    return o;
  }

  /* ── 景色の源 ── */
  function source() { return useCam && video && video.readyState >= 2 ? video : (still.complete && still.naturalWidth ? still : null); }
  function sizeOf(s) { return s === video ? [video.videoWidth, video.videoHeight] : [s.naturalWidth, s.naturalHeight]; }
  function frame(t) {
    requestAnimationFrame(frame);
    if (t - last < 30) return; last = t; S.now = new Date();
    var W = innerWidth, H = innerHeight; if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (C.render) { C.render(ctx, W, H, S, mode, t); if (mode.over) { ctx.save(); mode.over(ctx, W, H, S, t); ctx.restore(); } return; }
    var s = source(); if (!s) return;
    var sw = Math.min(360, Math.round(W * .6)), sh = Math.round(sw * H / W);
    if (small.width !== sw || small.height !== sh) { small.width = sw; small.height = sh; }
    var z = sizeOf(s), k = Math.max(sw / z[0], sh / z[1]), dw = z[0] * k, dh = z[1] * k;
    sx.drawImage(s, (sw - dw) / 2, (sh - dh) * (s === still ? .4 : .5), dw, dh);
    S.w = sw; S.h = sh; S.W = W; S.H = H; S.t = t;
    if (mode.fx) { var d = sx.getImageData(0, 0, sw, sh); mode.fx(d.data, sw, sh, S); sx.putImageData(d, 0, 0); }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(small, 0, 0, W, H);
    var f = from ? Math.min(1, (t - fadeT) / 500) : 1;
    if (from && f < 1) { ctx.globalAlpha = 1 - f; ctx.drawImage(from, 0, 0, W, H); ctx.globalAlpha = 1; } else from = null;
    if (mode.over) { ctx.save(); mode.over(ctx, W, H, S, t); ctx.restore(); }
  }

  /* ── 字幕 ── */
  function srcLine(n) { var s = n.src && C.sources[n.src]; return s ? '<small><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a></small>' : ''; }
  function notes() { var L = mode.notes; return typeof L === 'function' ? L(S) : (L || []); }
  function say() {
    var L = notes(), el = $('#sub');
    if (noteI < 0 || noteI >= L.length) { noteI = -1; var a = typeof mode.ask === 'function' ? mode.ask(S) : mode.ask; el.innerHTML = esc(a) + (L.length ? '<small class="nx">' + (C.more || 'ひらく') + ' ›</small>' : ''); return; }
    var n = L[noteI]; el.innerHTML = esc(n.text) + srcLine(n) + '<small class="nx">' + (noteI + 1) + ' / ' + L.length + '　次へ ›</small>';
  }
  function drawer() {
    var used = {}, L = [];
    C.modes.forEach(function (m) { (typeof m.notes === 'function' ? [] : (m.notes || [])).forEach(function (n) { if (n.src) used[n.src] = 1; }); });
    Object.keys(C.sources).forEach(function (k) { L.push('<li><a href="' + esc(C.sources[k].url) + '" target="_blank" rel="noopener">' + esc(C.sources[k].title) + '</a></li>'); });
    $('#dr').innerHTML = '<h2>' + esc(C.name) + '</h2>' + (C.about || '') + (L.length ? '<h3>出典</h3><ol class="src">' + L.join('') + '</ol>' : '') +
      '<p class="cr">例の景色の写真：<a href="https://commons.wikimedia.org/wiki/File:Hikawa_Jinja_Ninotorii_110221.jpg" target="_blank" rel="noopener">Umako（CC0）</a>。カメラの映像は端末の中で描き直すだけで、保存も送信もしません。© mitsulab.</p>' +
      '<p class="cr"><a href="https://mitsulab.jp/">← mitsulab</a></p>';
  }
  function setMode(id) {
    var m = C.modes.filter(function (x) { return x.id === id; })[0]; if (!m || m === mode) return;
    if (mode) { from = document.createElement('canvas'); from.width = cv.width; from.height = cv.height; from.getContext('2d').drawImage(cv, 0, 0); fadeT = performance.now(); }
    mode = m; noteI = -1; m.enter && m.enter(S);
    document.querySelectorAll('#modes button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === id)); });
    say(); navigator.vibrate && navigator.vibrate(10);
  }

  /* ── センサー（押したときに許可をとる） ── */
  var sensorsOn = false;
  function sensors() {
    if (sensorsOn) return; sensorsOn = true;
    function on(e) {
      if (e.webkitCompassHeading != null) S.heading = e.webkitCompassHeading; else if (e.absolute && e.alpha != null) S.heading = (360 - e.alpha) % 360;
      S.beta = e.beta; S.gamma = e.gamma;
    }
    try {
      if (g.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') addEventListener('deviceorientation', on); }).catch(function () {});
      else { addEventListener('deviceorientationabsolute', on); addEventListener('deviceorientation', on); }
    } catch (e) {}
  }
  function locate() {
    return new Promise(function (res) {
      if (S.pos) return res(S.pos); if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(function (p) { S.pos = { lat: p.coords.latitude, lon: p.coords.longitude }; res(S.pos); }, function () { res(null); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
    });
  }
  function camera() {
    sensors();
    if (useCam) { useCam = false; S.cam = false; $('#cam').textContent = 'カメラ'; $('#cam').setAttribute('aria-pressed', 'false'); return; }
    if (video) { useCam = true; S.cam = true; $('#cam').textContent = '例の景色'; $('#cam').setAttribute('aria-pressed', 'true'); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#sub').textContent = 'この端末ではカメラを開けません。例の景色で続けます。'; return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false }).then(function (st) {
      video = document.createElement('video'); video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.srcObject = st; video.play();
      useCam = true; S.cam = true; $('#cam').textContent = '例の景色'; $('#cam').setAttribute('aria-pressed', 'true');
    }).catch(function () { $('#sub').textContent = 'カメラが許可されませんでした。例の景色で続けます。'; });
  }

  g.MCam = {
    S: S, lut: lut, carve: carve, edges: edges, tone: tone, sun: sun, locate: locate, sensors: sensors, esc: esc, lab: lab,
    say: function () { say(); }, mode: function () { return mode; },
    start: function (c) {
      C = c; cv = $('#scene'); ctx = cv.getContext('2d'); small = document.createElement('canvas'); sx = small.getContext('2d', { willReadFrequently: true });
      still.src = c.still || (document.querySelector('link[rel=preload][as=image]') || {}).href || 'kit/rei.webp';
      var nav = $('#modes');
      c.modes.forEach(function (m, i) { var b = document.createElement('button'); b.type = 'button'; b.dataset.id = m.id; b.textContent = m.label; b.setAttribute('aria-pressed', String(i === 0)); b.onclick = function () { setMode(m.id); }; nav.appendChild(b); });
      mode = c.modes[0]; mode.enter && mode.enter(S);
      if (c.main) { $('#cam').textContent = c.main.label; $('#cam').onclick = function () { sensors(); c.main.go(S); }; } else $('#cam').onclick = camera;
      $('#sub').addEventListener('click', function (e) { if (e.target.closest('a')) return; var L = notes(); if (!L.length) return; noteI = noteI + 1 >= L.length ? -1 : noteI + 1; say(); });
      $('#menu').addEventListener('click', function () { var o = !$('#dr').classList.contains('on'); $('#dr').classList.toggle('on', o); this.setAttribute('aria-expanded', String(o)); });
      say(); drawer();
      var go = function () { requestAnimationFrame(frame); g.__ready = Math.round(performance.now() - t0); };
      if (still.decode) still.decode().then(go, go); else still.onload = go;
    }
  };
})(window);
