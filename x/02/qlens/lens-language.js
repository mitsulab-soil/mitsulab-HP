/* lens-language.js ── Qualia/language：言語ごとの名前の切り分け方で、景色の物のまとまりを見直す M のレンズ（2026-11-27）
   同じ名前でまとまる物は同じ色の輪郭でまとまり、別の名前に分かれる物は分かれる。訳語の一覧は出さない。
   色（青・緑の範囲、ロシア語の明るい青・濃い青）は画の色の幅で、蝶と蛾は景色の中を飛ぶ 3D で示す。
   carve（色と方位の文化の区切り）とは別に、「名前による物のまとまり方」だけを扱う。
   口：ctx = { renderer, camera, scene }。無ければ window.__um（はじまりの森）から取る。単体版 x/62 も同じ部品を読む。 */
(function () {
  'use strict';
  function abs(p) { return new URL(QLens.base() + p, document.baseURI).href; }
  var SRC = [
    { t: 'デジタル大辞泉「青」（小学館・コトバンク）', u: 'https://kotobank.jp/word/%E9%9D%92' },
    { t: 'デジタル大辞泉「蛾」（小学館・コトバンク）', u: 'https://kotobank.jp/word/%E8%9B%BE' },
    { t: 'Larousse, dictionnaire de français « papillon »', u: 'https://www.larousse.fr/dictionnaires/francais/papillon' },
    { t: 'Winawer ほか（2007）Russian blues…, PNAS 104(19)', u: 'https://doi.org/10.1073/pnas.0701644104' }
  ];
  /* 画の色の幅：b1＝明るい青、b2＝濃い青、g＝緑。虫：bf＝蝶、mo＝蛾。各言語で、どの幅をどの名前に入れるか */
  var LANGS = [
    { id: 'ja', label: '日本語', col: { b1: '青', b2: '青', g: '緑' }, bug: { bf: '蝶', mo: '蛾' }, water: '青',
      ask: '空も、緑がかった池の水も「青」。葉は「緑」。蝶と蛾は、別の名前に分かれます。',
      notes: ['辞書は「青」を、藍の系統から緑の系統までを総称する色としています。青信号の「青」もその一つです。', '辞書は「蛾」を、鱗翅目のうちチョウの類を除いたものとしています。'] },
    { id: 'en', label: 'English', col: { b1: 'blue', b2: 'blue', g: 'green' }, bug: { bf: 'butterfly', mo: 'moth' },
      ask: '明るい空も濃い青も、ひとつの blue。蝶と蛾は butterfly と moth に分かれます。', notes: [] },
    { id: 'fr', label: 'français', col: { b1: 'bleu', b2: 'bleu', g: 'vert' }, bug: { bf: 'papillon', mo: 'papillon' },
      ask: '昼の蝶も夜の蛾も、ひとつの papillon にまとまります。',
      notes: ['辞書は papillon を、鱗翅目の成虫（イガやヒロズコガなどの小さな蛾を除く）としています。夜の蛾は papillon de nuit と言います。'] },
    { id: 'ru', label: 'русский', col: { b1: 'голубой', b2: 'синий', g: 'зелёный' }, bug: null,
      ask: '明るい青は голубой、濃い青は синий。この森の空は голубой。見上げた高い空や深い水の濃い青を探してみてください。',
      notes: ['ロシア語では、明るい青（голубой）と濃い青（синий）を別の基本の色の名前で呼び分けます。'] }
  ];
  var PAL = ['#8fd0f0', '#f3d696', '#9fe0a8', '#e8a0c8', '#c0b0f0'];
  var CSS = '.qll-cv{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:6}' +
    '.qll{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 92px);z-index:24;width:min(560px,calc(100vw - 32px));box-sizing:border-box;font:500 14px/1.6 Georgia,"Shippori Mincho","Hiragino Mincho ProN",serif;color:#eef5f2}' +
    '.qll-row{display:flex;gap:8px;padding:0 0 8px;justify-content:center;flex-wrap:wrap}' +
    '.qll-row button{flex:0 0 auto;min-height:44px;padding:0 14px;border:1px solid rgba(170,226,236,.4);border-radius:22px;background:rgba(6,24,28,.55);color:#e9f6f5;font:inherit;font-size:13px;letter-spacing:.04em;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);cursor:pointer}' +
    '.qll-row button[aria-pressed=true]{background:rgba(155,220,240,.24);border-color:rgba(190,236,246,.9)}' +
    '.qll-sub{display:block;width:100%;text-align:left;margin:0;padding:10px 14px;border:0;border-radius:10px;background:rgba(6,16,18,.62);color:inherit;font:inherit;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);cursor:pointer}.qll-sub small{display:block;margin-top:4px;font-size:11px;opacity:.75}' +
    '.qll-src{grid-column:1/-1;width:100%;margin:0 0 10px;padding:0 0 10px;border-bottom:1px solid rgba(170,226,236,.18);font:500 12px/1.7 "Shippori Mincho",serif;color:#e9f6f5}.qll-src b{display:block;opacity:.72;margin-bottom:4px}.qll-src a{color:inherit;display:block}' +
    '@media (max-width:767px){.qll{bottom:calc(env(safe-area-inset-bottom,0px) + 132px);font-size:13px}.qll-row{gap:6px}.qll-row button{padding:0 11px;font-size:12px}}';

  function make() {
    var R, cam, root, cv, cx, small, sx, box, row, sub, srcBox, L = LANGS[0], noteI = -1, last = 0, on = true, r0 = null, bugs = [], t0 = performance.now();
    var dpr = Math.min(devicePixelRatio || 1, 2), grp = new Uint8Array(1), K = 4;
    function nameColor(nm) { var all = []; Object.keys(L.col).forEach(function (k) { if (all.indexOf(L.col[k]) < 0) all.push(L.col[k]); }); if (L.bug) Object.keys(L.bug).forEach(function (k) { if (all.indexOf(L.bug[k]) < 0) all.push(L.bug[k]); }); return PAL[all.indexOf(nm) % PAL.length]; }
    function say() {
      if (noteI < 0 || noteI >= L.notes.length) { noteI = -1; sub.innerHTML = L.ask + (L.notes.length ? '<small>ひらく ›</small>' : ''); return; }
      sub.innerHTML = L.notes[noteI] + '<small>' + (noteI + 1) + ' / ' + L.notes.length + '　出典は ≡ の中 ›</small>';
    }
    function setLang(l) { L = l; noteI = -1; row.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === l.id)); }); say(); }
    /* 画の一点を、色の幅に分ける（0＝どれでもない 1＝明るい青 2＝濃い青 3＝緑） */
    function cls(r, g, b) {
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, s = mx ? (mx - mn) / mx : 0; if (s < .06 || v < .14 || mx === mn) return 0;
      var h; if (mx === r) h = ((g - b) / (mx - mn)) * 60; else if (mx === g) h = (2 + (b - r) / (mx - mn)) * 60; else h = (4 + (r - g) / (mx - mn)) * 60; if (h < 0) h += 360;
      if (h >= 180 && h < 255) return (v > .55 && s < .62) ? 1 : (s >= .16 ? 2 : 0);
      if (h >= 70 && h < 170 && s >= .16) return 3;
      return 0;
    }
    function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    function after() {
      if (!on) return; var t = performance.now(); if (t - last < 60) return; last = t;
      var W = innerWidth, H = innerHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
      var sw = Math.min(240, Math.round(W / K)), sh = Math.round(sw * H / W); if (small.width !== sw || small.height !== sh) { small.width = sw; small.height = sh; grp = new Uint8Array(sw * sh); }
      sx.drawImage(R.domElement, 0, 0, sw, sh); var d = sx.getImageData(0, 0, sw, sh), px = d.data, keys = ['', 'b1', 'b2', 'g'];
      /* 言語の名前ごとに番号を振る（同じ名前＝同じ番号） */
      var names = [], gid = [0, 0, 0, 0]; for (var k = 1; k < 4; k++) { var nm = L.col[keys[k]], i0 = names.indexOf(nm); if (i0 < 0) { names.push(nm); i0 = names.length - 1; } gid[k] = i0 + 1; }
      var cnt = new Array(names.length + 1).fill(0), sxs = cnt.slice(), sys = cnt.slice();
      for (var y = 0, p = 0; y < sh; y++) for (var x = 0; x < sw; x++, p++) { var c = gid[cls(px[p * 4], px[p * 4 + 1], px[p * 4 + 2])]; grp[p] = c; if (c) { cnt[c]++; sxs[c] += x; sys[c] += y; } }
      var A = window.__aoi && window.__aoi.aoi;   /* 碧の体（服の色）は景色の物に数えない */
      if (A && A.visible) { var ap = A.getWorldPosition(new cam.position.constructor()), a0 = ap.clone().project(cam), a1 = ap.clone().setY(ap.y + 1.75).project(cam);
        if (a0.z < 1 && a1.z < 1) { var ay0 = (1 - a1.y) / 2 * sh, ay1 = (1 - a0.y) / 2 * sh, acx = (a0.x + 1) / 2 * sw, arx = Math.max(3, (ay1 - ay0) * .36);
          for (y = Math.max(0, ay0 | 0); y < Math.min(sh, ay1 + 2); y++) for (x = Math.max(0, (acx - arx) | 0); x < Math.min(sw, acx + arx); x++) grp[y * sw + x] = 0; } }
      var g2 = new Uint8Array(sw * sh), hc = new Uint16Array(8);   /* 3×3 の多数決でならし、葉のちらつきを抑える */
      for (y = 1; y < sh - 1; y++) for (x = 1; x < sw - 1; x++) { hc.fill(0); var best = 0, bc = 0; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var v2 = grp[(y + dy) * sw + x + dx]; if (++hc[v2] > bc) { bc = hc[v2]; best = v2; } } g2[y * sw + x] = bc >= 5 ? best : 0; }
      for (x = 0; x < sw; x++) { g2[x] = g2[sw + x]; g2[(sh - 1) * sw + x] = g2[(sh - 2) * sw + x]; } for (y = 0; y < sh; y++) { g2[y * sw] = g2[y * sw + 1]; g2[y * sw + sw - 1] = g2[y * sw + sw - 2]; }
      grp = g2; cnt.fill(0); sxs.fill(0); sys.fill(0); for (p = 0; p < sw * sh; p++) { var c2 = grp[p]; if (c2) { cnt[c2]++; sxs[c2] += p % sw; sys[c2] += (p / sw) | 0; } }
      var out = cx.createImageData(sw, sh), o = out.data, cols = names.map(function (n) { return hex(nameColor(n)); });
      for (y = 0, p = 0; y < sh; y++) for (x = 0; x < sw; x++, p++) {
        var a = grp[p]; if (!a) continue; var q = o, j = p * 4, cc = cols[a - 1];
        var edge = (x > 0 && grp[p - 1] !== a) || (x < sw - 1 && grp[p + 1] !== a) || (y > 0 && grp[p - sw] !== a) || (y < sh - 1 && grp[p + sw] !== a);
        q[j] = cc[0]; q[j + 1] = cc[1]; q[j + 2] = cc[2]; q[j + 3] = edge ? 150 : 40;
      }
      sx.putImageData(out, 0, 0); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.filter = 'blur(' + (W / sw * .6).toFixed(1) + 'px)'; cx.drawImage(small, 0, 0, W, H); cx.filter = 'none';
      cx.font = (W < 768 ? 16 : 19) + 'px Georgia,"Shippori Mincho","Hiragino Mincho ProN",serif'; cx.textAlign = 'center';
      var GX = 8, GY = 8, cell = new Uint32Array((names.length + 1) * GX * GY);   /* 名前は、その色がいちばん濃く集まる升に置く */
      for (p = 0; p < sw * sh; p++) if (grp[p]) cell[grp[p] * GX * GY + Math.min(GY - 1, ((p / sw | 0) * GY / sh) | 0) * GX + Math.min(GX - 1, ((p % sw) * GX / sw) | 0)]++;
      for (var n = 1; n <= names.length; n++) if (cnt[n] > sw * sh * .006) { var bi = 0, bv = -1; for (var ci = 0; ci < GX * GY; ci++) { var cv2 = cell[n * GX * GY + ci] * (((ci / GX | 0) < GY - 2) ? 1 : .3) * ((ci % GX === 0 || ci % GX === GX - 1) ? .5 : 1); if (cv2 > bv) { bv = cv2; bi = ci; } } if (bv > 0) tag(names[n - 1], ((bi % GX) + .5) * W / GX, Math.max(((bi / GX | 0) + .5) * H / GY, W < 768 ? 128 : 116)); }
      /* 虫：同じ名前の虫は同じ色の輪で囲み、細い線でつなぐ */
      if (L.water) {   /* 池と川の水面にも名前を付ける（森の模型の池＝-8,-7） */
        var wc = nameColor(L.water), U2 = window.__um || {}; if (U2.forest) var done = 0; [[-8, -7], [-5, -13], [1, -15]].forEach(function (w) { if (done) return;
          var v = new cam.position.constructor(w[0], .05, w[1]).project(cam); if (v.z > 1 || v.z < -1 || Math.abs(v.x) > .95 || Math.abs(v.y) > .9) return;
          tag(L.water + '（水）', (v.x + 1) / 2 * W, (1 - v.y) / 2 * H, wc); done = 1; });
      }
      if (L.bug && bugs.length) {
        var pos = {}; bugs.forEach(function (b) {
          var v = b.o.getWorldPosition(new b.o.position.constructor()).project(cam); if (v.z > 1 || v.z < -1) return;
          var X = (v.x + 1) / 2 * W, Y = (1 - v.y) / 2 * H, nm = L.bug[b.k]; if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) return; (pos[nm] = pos[nm] || []).push([X, Y]);
        });
        Object.keys(pos).forEach(function (nm) {
          var P = pos[nm], c = nameColor(nm); cx.strokeStyle = c; cx.lineWidth = 1.5;
          if (P.length > 1) { cx.setLineDash([4, 5]); cx.beginPath(); P.forEach(function (q, i) { i ? cx.lineTo(q[0], q[1]) : cx.moveTo(q[0], q[1]); }); cx.stroke(); cx.setLineDash([]); }
          P.forEach(function (q) { cx.beginPath(); cx.arc(q[0], q[1], W < 768 ? 22 : 28, 0, 7); cx.stroke(); });
          var mx = 0, my = 1e9; P.forEach(function (q) { mx += q[0] / P.length; my = Math.min(my, q[1]); }); tag(nm, mx, my - (W < 768 ? 30 : 36), c);
        });
      }
    }
    function tag(s, x, y, c) { var hw = cx.measureText(s).width / 2 + 12; x = Math.max(hw, Math.min(innerWidth - hw, x)); y = Math.max(innerWidth < 768 ? 124 : 108, y); cx.shadowColor = '#000'; cx.shadowBlur = 8; cx.fillStyle = c || '#eef5f2'; cx.fillText(s, x, y); cx.shadowBlur = 0; }
    /* 景色の中を、蝶 2 と蛾 2 がゆっくり舞う（目の前 3〜4 m。体の大きさは実寸） */
    function spawn() {
      return import(abs('../creatures.js')).then(function (C) {
        if (!on) return; var T = cam.position.constructor;
        [['bf', 'ageha', .1], ['bf', 'monshiro-f', .05], ['mo', 'moth', .045], ['mo', 'moth', .045]].forEach(function (a, i) {
          var o = C.makeButterfly(a[1]); o.scale.setScalar(a[2]); o.userData.ph = i * 1.9; root.add(o); bugs.push({ o: o, k: a[0], i: i });
        });
      }).catch(function (e) { console.warn('lens-language', e); });
    }
    function fly() {
      if (!bugs.length) return; var t = (performance.now() - t0) / 1000, e = cam.matrixWorld.elements, f = [-e[8], 0, -e[10]], l = Math.hypot(f[0], f[2]) || 1; f[0] /= l; f[2] /= l;
      var rgt = [-f[2], 0, f[0]];
      bugs.forEach(function (b) {
        var ph = t * .35 + b.i * 1.6, side = (b.i - 1.5) * .9 + Math.sin(ph) * .4, dist = 3.2 + Math.sin(ph * .7) * .5, up = (b.k === 'mo' ? -.15 : .25) + Math.sin(ph * 1.3) * .25;
        b.o.position.set(cam.position.x + f[0] * dist + rgt[0] * side, cam.position.y + up, cam.position.z + f[2] * dist + rgt[2] * side);
        b.o.rotation.y = Math.atan2(rgt[0], rgt[2]) + Math.sin(ph) * .6; b.o.userData.flap && b.o.userData.flap(t + b.i);
      });
    }
    var pond = null;   /* 池の水面（濃い青）：森の模型の池（中心 -8,-7・半径 4.8 m）に重ねる */
    function pondOn() {
      var U = window.__um || {}; if (!U.forest) return; import('three').then(function (T) { if (!on) return; var y = 0;
      try { var rc = new T.Raycaster(new T.Vector3(-8, 20, -7), new T.Vector3(0, -1, 0)), h = rc.intersectObject(U.forest, true); if (h.length) y = h[h.length - 1].point.y; } catch (e) { }
      pond = new T.Mesh(new T.CircleGeometry(4.3, 48), new T.MeshBasicMaterial({ color: 0x173a66, transparent: true, opacity: .72, depthWrite: false }));
      pond.rotation.x = -Math.PI / 2; pond.position.set(-8, y + .03, -7); pond.renderOrder = 2; root.add(pond); }).catch(function () { });
    }
    return {
      apply: function (ctx) {
        var U = window.__um || {}; R = (ctx && ctx.renderer) || U.renderer; cam = (ctx && ctx.camera) || U.camera; root = (ctx && ctx.scene) || (U.forest && U.forest.parent) || U.forest; if (!R || !cam || !root) return;
        if (!document.getElementById('qllCss')) { var st = document.createElement('style'); st.id = 'qllCss'; st.textContent = CSS; document.head.appendChild(st); }
        cv = document.createElement('canvas'); cv.className = 'qll-cv'; cx = cv.getContext('2d'); document.body.appendChild(cv);
        small = document.createElement('canvas'); sx = small.getContext('2d', { willReadFrequently: true });
        box = document.createElement('div'); box.className = 'qll'; box.setAttribute('aria-label', 'Qualia/language');
        row = document.createElement('div'); row.className = 'qll-row'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'ことば');
        LANGS.forEach(function (l) { var b = document.createElement('button'); b.type = 'button'; b.dataset.id = l.id; b.lang = l.id; b.textContent = l.label; b.onclick = function () { setLang(l); try { navigator.vibrate && navigator.vibrate(10); } catch (e) { } }; row.appendChild(b); });
        sub = document.createElement('button'); sub.type = 'button'; sub.className = 'qll-sub'; sub.onclick = function () { if (!L.notes.length) return; noteI = noteI + 1 >= L.notes.length ? -1 : noteI + 1; say(); };
        box.appendChild(row); box.appendChild(sub); document.body.appendChild(box);
        srcBox = document.createElement('section'); srcBox.className = 'qll-src'; srcBox.innerHTML = '<b>Qualia/language の出典</b>' + SRC.map(function (s) { return '<a href="' + s.u + '" target="_blank" rel="noopener">' + s.t + '</a>'; }).join('');
        var dr = document.querySelector((ctx && ctx.drawer) || '#qgDrawer'); if (dr) dr.appendChild(srcBox);
        r0 = R.render; var self = R; R.render = function (s, c) { if (c === cam) fly(); r0.apply(self, arguments); if (c === cam) { try { after(); } catch (e) { console.warn('lens-language', e); } } };
        setLang(LANGS[0]); spawn(); pondOn();
        window.__qll = { set: function (id) { setLang(LANGS.filter(function (l) { return l.id === id; })[0] || LANGS[0]); }, langs: LANGS, src: SRC };
      },
      dispose: function () {
        on = false; if (r0 && R) R.render = r0; bugs.forEach(function (b) { b.o.parent && b.o.parent.remove(b.o); }); bugs = []; if (pond) { pond.parent && pond.parent.remove(pond); pond.geometry.dispose(); pond.material.dispose(); pond = null; }
        [cv, box, srcBox].forEach(function (e) { e && e.remove(); }); window.__qll = null;
      }
    };
  }
  QLens.define({ id: 'language', make: make });
  QLens.sources = QLens.sources || {}; QLens.sources.language = SRC;
})();
