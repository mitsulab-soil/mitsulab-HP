/* lens-m.js ── M（意味づけ）のレンズ 6 つ：はじまりの森の 3D を、意味づけの道具の切り分け方で見直す（2026-11-27）
   carve・kigo・koyomi・role は、道具の単体版の app.js と mcam.js をそのまま読み、その枠（modes）を森の画に当てる（単体版は変えない）。
   civil・oldmap は、単体版が実在の場所の記録（標高・昔の地図）を使うので、森では森の模型の中で確かめられることだけを読む形にした。
   森は特定の実在の場所ではない。実在の地名・昔の地図・標高は重ねない。森の「北」は、この森の模型の上での向き（−Z）。
   口：ctx に renderer・scene・camera が無くても、window.__um（sight）から取る。選んだときだけ読む。 */
(function () {
  'use strict';
  function abs(p) { return new URL(QLens.base() + p, document.baseURI).href; }
  var scripts = {};
  function script(p) {
    return scripts[p] || (scripts[p] = new Promise(function (ok, ng) { var s = document.createElement('script'); s.src = abs(p); s.onload = ok; s.onerror = ng; document.head.appendChild(s); }));
  }
  /* 単体版の app.js を読み、MCam.start に渡す設定を受けとる（単体版の画面は作らない） */
  var caps = {};
  function capture(tool) {
    if (caps[tool]) return caps[tool];
    return caps[tool] = script('m/mcam.js?v=3').then(function () {
      return new Promise(function (ok, ng) {
        var M = window.MCam, start0 = M.start, got = null, f0 = window.fetch, dummy = null;
        M.start = function (c) { got = c; };
        M.mode = function () { return window.__qlensM && window.__qlensM.mode(); };
        M.say = function () { if (window.__qlensM && window.__qlensM.say) window.__qlensM.say(); };
        window.fetch = function (u, o) { if (typeof u === 'string' && /kit\/k72\.json$/.test(u)) u = abs('m/k72.json'); return f0.call(window, u, o); };
        if (!document.getElementById('sub')) { dummy = document.createElement('div'); dummy.id = 'sub'; dummy.hidden = true; document.body.appendChild(dummy); }
        var s = document.createElement('script'); s.src = abs('m/' + tool + '.js?v=3');
        s.onload = function () { M.start = start0; window.fetch = f0; got ? ok(got) : ng(new Error('no config ' + tool)); };
        s.onerror = function (e) { M.start = start0; window.fetch = f0; ng(e); };
        document.head.appendChild(s);
      });
    });
  }

  /* ── 森の上で枠を回す仕組み（mcam.js の frame と同じ順：縮めた画 → fx → 拡げる → over） ── */
  var CSS = '.qlm-cv{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:6;opacity:0;transition:opacity .35s}' +
    '.qlm{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 92px);z-index:24;width:min(560px,calc(100vw - 32px));box-sizing:border-box;font:500 14px/1.6 "Shippori Mincho","Hiragino Mincho ProN",serif;color:#eef5f2}' +
    '.qlm-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:0 0 8px;justify-content:center;flex-wrap:wrap}.qlm-row::-webkit-scrollbar{display:none}' +
    '.qlm-row button{flex:0 0 auto;min-height:44px;padding:0 14px;border:1px solid rgba(170,226,236,.4);border-radius:22px;background:rgba(6,24,28,.55);color:#e9f6f5;font:inherit;font-size:13px;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
    '.qlm-row button[aria-pressed=true]{background:rgba(155,220,240,.24);border-color:rgba(190,236,246,.9)}' +
    '.qlm-sub{display:block;width:100%;text-align:left;margin:0;padding:10px 14px;border:0;border-radius:10px;background:rgba(6,16,18,.62);color:inherit;font:inherit;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);cursor:pointer}' +
    '.qlm-sub small{display:block;margin-top:4px;font-size:11px;opacity:.75}.qlm-sub a{color:inherit}' +
    '@media (max-width:767px){.qlm{bottom:calc(env(safe-area-inset-bottom,0px) + 132px);font-size:13px}.qlm-row{gap:6px}.qlm-row button{padding:0 10px;min-height:44px;font-size:12px}}';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function runner(C) {
    var U = window.__um, R = U && U.renderer, cam = U && U.camera, cv, cx, small, sx, box, row, sub, mode = C.modes[0], noteI = -1, last = 0, on = true, r0 = null, S = { heading: 0, beta: 0, gamma: 0, pos: null, now: new Date(), cam: false, forest: true };
    var dpr = Math.min(devicePixelRatio || 1, 2);
    function notes() { var L = mode.notes; return typeof L === 'function' ? L(S) : (L || []); }
    function say() {
      var L = notes(), a = typeof mode.ask === 'function' ? mode.ask(S) : mode.ask;
      if (noteI < 0 || noteI >= L.length) { noteI = -1; sub.innerHTML = esc(a || '') + (L.length ? '<small>' + esc(C.tapHint || C.more || 'ひらく') + ' ›</small>' : ''); return; }
      var n = L[noteI], s = n.src && C.sources && C.sources[n.src];
      sub.innerHTML = esc(n.text) + (s ? '<small><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a></small>' : '') + '<small>' + (noteI + 1) + ' / ' + L.length + '　次へ ›</small>';
    }
    function setMode(m) {
      mode = m; noteI = -1; m.enter && m.enter(S);
      row.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === m.id)); });
      say(); try { navigator.vibrate && navigator.vibrate(10); } catch (e) { }
    }
    function sense() {
      var e = cam.matrixWorld.elements, fx = -e[8], fz = -e[10], fy = -e[9];
      S.heading = (Math.atan2(fx, -fz) * 180 / Math.PI + 360) % 360;       // 森の模型の −Z を北とした向き
      S.beta = 90 + Math.asin(Math.max(-1, Math.min(1, fy))) * 180 / Math.PI; // スマホを立てて前を見る傾き（90°＝水平）に合わせる
      S.gamma = 0; S.now = new Date(); S.cam3 = cam; S.um = U;
    }
    function after() {
      if (!on) return; var t = performance.now(); if (t - last < (C.every || 55)) return; last = t;
      var W = innerWidth, H = innerHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); sense();
      if (mode.fx) {
        var sw = Math.min(360, Math.round(W * .6)), sh = Math.round(sw * H / W);
        if (small.width !== sw || small.height !== sh) { small.width = sw; small.height = sh; }
        sx.drawImage(R.domElement, 0, 0, sw, sh);                             // 描いたすぐあとの森の画（同じ処理の中なので読める）
        S.w = sw; S.h = sh; S.W = W; S.H = H; S.t = t;
        var d = sx.getImageData(0, 0, sw, sh); mode.fx(d.data, sw, sh, S); sx.putImageData(d, 0, 0);
        cx.imageSmoothingEnabled = true; cx.drawImage(small, 0, 0, W, H);
      } else cx.clearRect(0, 0, W, H);
      S.W = W; S.H = H; S.t = t;
      if (mode.over) { cx.save(); try { mode.over(cx, W, H, S, t); } catch (e) { } cx.restore(); }
    }
    return {
      apply: function () {
        if (!R || !cam) return;
        var st = document.createElement('style'); st.textContent = CSS; st.id = 'qlmCss'; if (!document.getElementById('qlmCss')) document.head.appendChild(st);
        cv = document.createElement('canvas'); cv.className = 'qlm-cv'; cx = cv.getContext('2d'); document.body.appendChild(cv);
        small = document.createElement('canvas'); sx = small.getContext('2d', { willReadFrequently: true });
        box = document.createElement('div'); box.className = 'qlm'; box.setAttribute('aria-label', C.name);
        row = document.createElement('div'); row.className = 'qlm-row'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', '切り分け方');
        C.modes.forEach(function (m) { var b = document.createElement('button'); b.type = 'button'; b.dataset.id = m.id; b.textContent = m.label; b.onclick = function () { setMode(m); }; row.appendChild(b); });
        sub = document.createElement('button'); sub.type = 'button'; sub.className = 'qlm-sub';
        sub.addEventListener('click', function (e) { if (e.target.closest('a')) return; var L = notes(); if (C.onTap) { C.onTap(mode); noteI = -1; say(); return; } if (!L.length) return; noteI = noteI + 1 >= L.length ? -1 : noteI + 1; say(); });
        box.appendChild(row); box.appendChild(sub); document.body.appendChild(box);
        window.__qlensM = { say: say, C: C, mode: function () { return mode; }, S: S };
        r0 = R.render; var self = R;
        R.render = function (s, c) { r0.apply(self, arguments); if (c === cam) { try { after(); } catch (e) { console.warn('lens-m', e); } } };
        setMode(C.first ? C.modes.filter(function (m) { return m.id === C.first; })[0] || C.modes[0] : C.modes[0]);
        requestAnimationFrame(function () { cv.style.opacity = 1; });
      },
      dispose: function () {
        on = false; if (r0 && R) R.render = r0;
        if (cv) cv.remove(); if (box) box.remove(); if (window.__qlensM && window.__qlensM.C === C) window.__qlensM = null;
      }
    };
  }

  /* ── 森の模型の中で確かめられること（civil・oldmap で使う） ── */
  var POND = { x: -8, z: -7, r: 4.8 }, RIVER = [[-8, -7], [-5, -13], [1, -15], [9, -12], [18, -7], [30, -2], [44, 4]];   // forest.js と同じ値
  function V(x, y, z) { var c = window.__um.camera.position.constructor; return new c(x, y, z); }
  function proj(c, W, H, x, y, z) { var v = V(x, y, z).project(window.__um.camera); return v.z < 1 && v.z > -1 ? [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H] : null; }
  function line3(c, W, H, pts, y) { var p = null; c.beginPath(); for (var i = 0; i < pts.length; i++) { var q = proj(c, W, H, pts[i][0], y, pts[i][1]); if (q && p) c.lineTo(q[0], q[1]); else if (q) c.moveTo(q[0], q[1]); p = q; } c.stroke(); }
  function segD(px, pz, a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz); }
  function riverD(x, z) { var d = 1e9; for (var i = 0; i < RIVER.length - 1; i++) d = Math.min(d, segD(x, z, RIVER[i], RIVER[i + 1])); return d; }
  function pondPts() { var L = []; for (var i = 0; i <= 48; i++) { var a = i / 48 * Math.PI * 2; L.push([POND.x + Math.cos(a) * POND.r, POND.z + Math.sin(a) * POND.r]); } return L; }
  function font(c, px) { c.font = px + 'px "Shippori Mincho","Hiragino Mincho ProN",serif'; }
  function label(c, s, x, y, px) { font(c, px || 13); c.textAlign = 'center'; c.shadowColor = '#000'; c.shadowBlur = 8; c.fillStyle = '#eef5f2'; c.fillText(s, x, y); c.shadowBlur = 0; }
  function me() { return window.__um.camera.position; }
  function dim(px, k) { for (var i = 0; i < px.length; i += 4) { px[i] *= k; px[i + 1] *= k; px[i + 2] *= k; } }

  var CIVIL = {
    name: 'Qualia/civil ── 土木の目（はじまりの森）', more: 'この読み方',
    sources: { kozo: { title: '道路構造令 第24条（横断勾配）e-Gov 法令検索', url: 'https://laws.e-gov.go.jp/law/345CO0000000320' } },
    modes: [
      { id: 'line', label: '線で読む', fx: function (px, w, h) { MCam.edges(px, w, h); },
        ask: '幹の線、岸の線、踏み跡の縁。線は、どちらへ続いていますか。',
        notes: [{ text: '土木の目は、まず線を読みます。森の中でも、岸の線と踏み跡の縁が、水と人の通り道を分けています。' }, { text: '画面を閉じたら、いつもの道で、縁石や溝の線を一本たどってみてください。' }] },
      { id: 'level', label: '水平をはかる', fx: function (px) { MCam.tone(px, [.5, .55, .6], [6, 10, 14]); },
        over: function (c, W, H, S) {
          var e = S.cam3.matrixWorld.elements, f = [-e[8], -e[9], -e[10]], p = me(), hz = proj(c, W, H, p.x + f[0] * 30, p.y, p.z + f[2] * 30);
          var pitch = Math.asin(Math.max(-1, Math.min(1, f[1]))) * 180 / Math.PI;
          if (hz) { c.strokeStyle = 'rgba(243,214,150,.9)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, hz[1]); c.lineTo(W, hz[1]); c.stroke(); label(c, '目の高さの水平', W / 2, hz[1] - 10, 13); }
          label(c, '目線の傾き ' + (pitch >= 0 ? '上へ ' : '下へ ') + Math.abs(pitch).toFixed(0) + '°', W / 2, H * .2, 20);
        },
        ask: '目の高さの水平の線より、上にある物と、下にある物を一つずつ。',
        notes: [{ text: '黄色の線は、いまの目の高さの水平です。見上げると下へ、見下ろすと上へ動きます。' }, { text: '舗装した車道には、雨水を端へ流すため、1.5〜2% の横の傾きを付けることが標準とされています。1 m で 1.5〜2 cm です。', src: 'kozo' }, { text: 'この森の地面は、平らに作った模型です。いつもの道では、水平の線と地面の線のずれが、傾きです。' }] },
      { id: 'water', label: '水の集まる所', fx: function (px) { dim(px, .55); },
        over: function (c, W, H) {
          var p = me(), dR = riverD(p.x, p.z), dP = Math.max(0, Math.hypot(p.x - POND.x, p.z - POND.z) - POND.r);
          c.lineWidth = 2; c.strokeStyle = 'rgba(143,200,230,.95)'; line3(c, W, H, pondPts(), .05);
          c.setLineDash([8, 6]); line3(c, W, H, RIVER, .05); c.setLineDash([]);
          var q = proj(c, W, H, POND.x, .3, POND.z); if (q) label(c, '池', q[0], q[1], 15);
          label(c, '川まで およそ ' + Math.max(0, dR - 1).toFixed(0) + ' m ・ 池まで およそ ' + dP.toFixed(0) + ' m', W / 2, H * .2, W < 768 ? 15 : 18);
        },
        ask: '雨が降ったら、この森の水は、どこに集まりそうですか。',
        notes: [{ text: '青い線は、この森の模型の池の岸と、川の筋です。数字は、いまいる所からの、およその距離です。' }, { text: '画面を閉じたら、いつもの道で、雨の水が向かう溝や低い所を一つ探してみてください。' }] }
    ]
  };

  function mini(c, W, H, S, grid) {
    var p = me(), sz = Math.min(W - 32, H * .4, 300), x0 = W < 768 ? (W - sz) / 2 : 24, y0 = H * (W < 768 ? .12 : .14), k = sz / 70, cxm = x0 + sz / 2, cym = y0 + sz / 2;   // 70 m 四方
    function m2s(x, z) { return [cxm + (x - p.x) * k, cym + (z - p.z) * k]; }
    c.save(); c.beginPath(); c.rect(x0, y0, sz, sz); c.clip();
    c.fillStyle = 'rgba(14,22,20,.82)'; c.fillRect(x0, y0, sz, sz);
    c.strokeStyle = 'rgba(236,246,244,.12)'; c.lineWidth = 1;
    for (var g = -60; g <= 60; g += 10) { var a = m2s(Math.round(p.x / 10) * 10 + g, 0), b = m2s(0, Math.round(p.z / 10) * 10 + g); c.beginPath(); c.moveTo(a[0], y0); c.lineTo(a[0], y0 + sz); c.moveTo(x0, b[1]); c.lineTo(x0 + sz, b[1]); c.stroke(); }
    c.strokeStyle = 'rgba(143,200,230,.9)'; c.lineWidth = 3; c.beginPath(); RIVER.forEach(function (r, i) { var s = m2s(r[0], r[1]); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }); c.stroke();
    c.fillStyle = 'rgba(143,200,230,.55)'; var pc = m2s(POND.x, POND.z); c.beginPath(); c.arc(pc[0], pc[1], POND.r * k, 0, 7); c.fill();
    var hd = S.heading * Math.PI / 180, fx = Math.sin(hd), fz = -Math.cos(hd);
    c.fillStyle = 'rgba(243,214,150,.25)'; c.beginPath(); c.moveTo(cxm, cym); c.arc(cxm, cym, 14 * k, Math.atan2(fz, fx) - .55, Math.atan2(fz, fx) + .55); c.closePath(); c.fill();
    c.fillStyle = '#f3d696'; c.beginPath(); c.arc(cxm, cym, 4, 0, 7); c.fill();
    c.restore(); c.strokeStyle = 'rgba(236,246,244,.45)'; c.strokeRect(x0, y0, sz, sz);
    label(c, '北', x0 + sz - 14, y0 + 18, 13);
    c.strokeStyle = '#eef5f2'; c.beginPath(); c.moveTo(x0 + 12, y0 + sz - 12); c.lineTo(x0 + 12 + 10 * k, y0 + sz - 12); c.stroke(); font(c, 11); c.textAlign = 'left'; c.fillStyle = '#eef5f2'; c.fillText('10 m', x0 + 12, y0 + sz - 18);
  }
  var OLDMAP = {
    name: 'Qualia/oldmap ── 地図で読む（はじまりの森）', more: 'この読み方',
    sources: {},
    modes: [
      { id: 'map', label: '上から見る', fx: function (px) { dim(px, .5); }, over: function (c, W, H, S) { mini(c, W, H, S); },
        ask: '地図の上の自分と、目の前の景色。池はどちらにありますか。',
        notes: [{ text: '地図は、景色を上から見た記号に置きかえる枠です。歩く人の目には一度に見えない、池と川のつながりが見えます。' }, { text: 'この森は、特定の場所ではない模型です。単体の道具では、いまいる所の昔の地図を重ねます。' }, { text: '画面を閉じたら、いつもの道で、地図にすると一本の線になる物を一つ探してみてください。' }] },
      { id: 'grid', label: '方眼で測る', fx: function (px) { dim(px, .7); },
        over: function (c, W, H) {
          var p = me(), gx = Math.round(p.x / 5) * 5, gz = Math.round(p.z / 5) * 5; c.strokeStyle = 'rgba(243,214,150,.55)'; c.lineWidth = 1;
          for (var i = -6; i <= 6; i++) { line3(c, W, H, [[gx + i * 5, gz - 30], [gx + i * 5, gz + 30]], .02); line3(c, W, H, [[gx - 30, gz + i * 5], [gx + 30, gz + i * 5]], .02); }
          label(c, '方眼は 5 m ごと', W / 2, H * .2, 18);
        },
        ask: '5 m の方眼で、いちばん近い木までは、いくつ分ですか。',
        notes: [{ text: '地図の方眼は、地面に同じ大きさの升目を引いて、遠さを数に置きかえます。遠くの升目ほど、小さく見えます。' }] }
    ]
  };

  var TOOLS = {
    'm-carve': { app: 'carve', first: 'two', drop: ['none'] },
    'm-civil': { own: CIVIL },
    'm-kigo': { app: 'kigo' },
    'm-koyomi': { app: 'koyomi', drop: ['sun'] },                 // 太陽の高さは実在の緯度と経度が要るので、森では出さない
    'm-oldmap': { own: OLDMAP },
    'm-role': { app: 'role' }
  };
  Object.keys(TOOLS).forEach(function (id) {
    QLens.define({ id: id, make: function () {
      var T = TOOLS[id], r = null, alive = true;
      return {
        apply: function (ctx) {
          var p = T.own ? script('m/mcam.js?v=3').then(function () { return T.own; }) : capture(T.app).then(function (c) {
            var o = {}; for (var k in c) o[k] = c[k];
            o.modes = c.modes.filter(function (m) { return (T.drop || []).indexOf(m.id) < 0; }); o.first = T.first;
            if (T.app === 'kigo') o.onTap = function (m) { document.getElementById('sub') && document.getElementById('sub').dispatchEvent(new MouseEvent('click')); };
            return o;
          });
          p.then(function (C) { if (!alive) return; r = runner(C); r.apply(ctx); window.__qlensMId = id; }).catch(function (e) { console.warn('lens-m', id, e); });
        },
        dispose: function () { alive = false; if (r) r.dispose(); }
      };
    } });
  });
})();
