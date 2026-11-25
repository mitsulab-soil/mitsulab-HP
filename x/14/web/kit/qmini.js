/* Qualia/omiya・kawagoe・shibuya 共通：左上の「足もとの地図」（2026-11-24 本人「shibuya の左側の地図がいい感じなので、omiya・kawagoe も同じ意匠に」）
   shibuya の「時間の層」の窓（kit/jidai.js の左上の板）と同じ意匠：角の丸い細い枠・まん中の点＝いまいる所・上＝進む向き・下に小さく出典。
   中身はそのアプリの地面に貼っている空中写真（国土地理院 シームレス空中写真を mitsulab が位置合わせ・加工）をそのまま使う。新しい通信はしない。
   位置は window.__qw.camera から読むだけ。記録はしない・どこにも送らない。歩いているときだけ出す。shibuya で昔の写真の窓（body.jdB）が出ているあいだは隠して、窓にゆずる。
   使い方：<script src="web/kit/qmini.js?v=1" defer></script>（地面のメッシュは __qw.terrain、なければ地図の写真を貼った一番大きい地面を探す） */
(function () {
  var WIDE = innerWidth > 700, BW = WIDE ? 348 : 132, BH = WIDE ? 156 : 60, BX = WIDE ? 24 : 14, BY = WIDE ? 124 : 116, SPAN = WIDE ? 56 : 56;   // 板の大きさ・位置は shibuya の窓と同じ。SPAN＝板の縦の半分が写す距離（m）
  var wrap, cv, cx, src = null, map = null, t0 = performance.now(), on = 0, last = 0;
  function css() {
    var s = document.createElement("style"); s.id = "qmini-css";
    s.textContent = "#qMini{position:fixed;left:calc(" + BX + "px + env(safe-area-inset-left));" + (WIDE ? "top:calc(" + BY + "px + env(safe-area-inset-top));" : "bottom:calc(196px + env(safe-area-inset-bottom));") + "width:" + BW + "px;z-index:19;pointer-events:none;opacity:0;transition:opacity .6s}" +
      "#qMini canvas{display:block;width:" + BW + "px;height:" + BH + "px;border-radius:" + (WIDE ? 10 : 6) + "px;box-shadow:0 0 0 1px rgba(128,227,247,.62),0 6px 22px rgba(0,0,0,.35);background:#0b1a30}" +
      "#qMini small{display:block;margin-top:4px;font:400 10px/1.5 'Hiragino Sans',sans-serif;color:rgba(225,236,241,.82);text-shadow:0 0 2px #000,0 0 6px rgba(0,0,0,.8);letter-spacing:.02em}" +
      "body.jdB #qMini,body.ikOpen #qMini,body:has(#menu:not([hidden])) #qMini{opacity:0!important}" +
      "@media (max-width:700px){#qMini small{display:none}body[data-aoi=\"l\"] #qMini{left:auto;right:calc(14px + env(safe-area-inset-right))}}";
    document.head.appendChild(s);
  }
  function findGround(q) {
    if (q.terrain && q.terrain.material && q.terrain.material.map) return q.terrain;
    var best = null, ba = 0; (q.scene || q.world).traverse(function (o) {
      if (!o.isMesh || !o.material || !o.material.map || !o.material.map.image || !o.geometry) return; var im = o.material.map.image; if ((im.width || 0) < 500) return;
      o.geometry.computeBoundingBox && !o.geometry.boundingBox && o.geometry.computeBoundingBox(); var b = o.geometry.boundingBox; if (!b) return; var a = (b.max.x - b.min.x) * (b.max.z - b.min.z) * (o.scale ? o.scale.x * o.scale.z : 1); if (a > ba) { ba = a; best = o; } });
    return best;
  }
  function fit(mesh) {   // 地面の uv が x・z に沿って一様に貼られている前提で、世界の x・z → 写真の画素 を求める
    var g = mesh.geometry, P = g.attributes.position, U = g.attributes.uv; if (!P || !U) return null; mesh.updateWorldMatrix(true, false);
    var M = mesh.matrixWorld, n = P.count, A = null, B = null, C = null;
    function w(i) { var p = mesh.position.clone().set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(M); return { x: p.x, z: p.z, u: U.getX(i), v: U.getY(i) }; }
    A = w(0); var bx = 0, bz = 0; for (var i = 1; i < n; i += Math.max(1, Math.floor(n / 4000))) { var q = w(i); if (Math.abs(q.x - A.x) > bx && Math.abs(q.u - A.u) > 1e-4) { bx = Math.abs(q.x - A.x); B = q; } if (Math.abs(q.z - A.z) > bz && Math.abs(q.v - A.v) > 1e-4) { bz = Math.abs(q.z - A.z); C = q; } }
    if (!B || !C) return null; var ax = (B.u - A.u) / (B.x - A.x), bu = A.u - ax * A.x, cz = (C.v - A.v) / (C.z - A.z), dv = A.v - cz * A.z;
    var tex = mesh.material.map, im = tex.image, W = im.width, H = im.height, fy = tex.flipY !== false && !(typeof ImageBitmap !== "undefined" && im instanceof ImageBitmap);
    return { im: im, W: W, H: H, px: function (x) { return (ax * x + bu) * W; }, py: function (z) { var vv = cz * z + dv; return (fy ? 1 - vv : vv) * H; }, mpp: 1 / Math.abs(ax * W) };
  }
  function draw(q) {
    var cam = q.camera, p = cam.position, f = cam.position.clone(); cam.getWorldDirection(f); var yaw = Math.atan2(f.x, -f.z);
    var dpr = Math.min(2, devicePixelRatio || 1), Wc = BW * dpr, Hc = BH * dpr; if (cv.width !== Wc) { cv.width = Wc; cv.height = Hc; }
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = "#0b1a30"; cx.fillRect(0, 0, Wc, Hc);
    var s = (Hc / 2) / SPAN * map.mpp;   // 画素 → 板の画素
    cx.save(); cx.translate(Wc / 2, Hc / 2); cx.rotate(-yaw); cx.scale(s * Math.sign(map.px(1) - map.px(0) || 1), s * Math.sign(map.py(1) - map.py(0) || 1)); cx.translate(-map.px(p.x), -map.py(p.z));
    cx.filter = "saturate(.55) brightness(1.05) contrast(1.05)"; try { cx.drawImage(map.im, 0, 0); } catch (e) {} cx.restore(); cx.filter = "none";
    var r = 4 * dpr; cx.fillStyle = "rgba(128,227,247,.95)"; cx.beginPath(); cx.arc(Wc / 2, Hc / 2, r, 0, 7); cx.fill();
    cx.strokeStyle = "rgba(128,227,247,.9)"; cx.lineWidth = 1.5 * dpr; cx.beginPath(); cx.moveTo(Wc / 2 - 4 * dpr, Hc / 2 - r - 3 * dpr); cx.lineTo(Wc / 2, Hc / 2 - r - 9 * dpr); cx.lineTo(Wc / 2 + 4 * dpr, Hc / 2 - r - 3 * dpr); cx.stroke();
  }
  function loop() {
    var q = window.__qw, now = performance.now();
    var want = q && q.mode === "walk" && !document.hidden && map; if (!!want !== !!on) { on = want ? 1 : 0; wrap.style.opacity = on ? 1 : 0; }
    if (on && now - last > 80) { last = now; if (!WIDE) { var tp = innerHeight; ['.qck', '#qfBtn', '#qS6', '.icm'].forEach(function (sel) { var e = document.querySelector(sel); if (e && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden') { var r = e.getBoundingClientRect(); if (r.height && r.left < BW + 20) tp = Math.min(tp, r.top); } }); wrap.style.bottom = Math.round(innerHeight - tp + 10) + 'px'; } try { draw(q); } catch (e) { on = 0; wrap.style.opacity = 0; map = null; } }
    if (now - t0 > 1500 && q && q.ready) { t0 = now; var m = findGround(q), mi = m && m.material.map && m.material.map.image; if (mi && mi.width >= 500 && (!map || map.im !== mi)) map = fit(m); }
    requestAnimationFrame(loop);
  }
  function start() {
    css(); wrap = document.createElement("div"); wrap.id = "qMini"; wrap.setAttribute("aria-hidden", "true"); cv = document.createElement("canvas"); cx = cv.getContext("2d");
    var sm = document.createElement("small"); sm.textContent = "国土地理院 空中写真を加工"; wrap.append(cv, sm); document.body.appendChild(wrap); requestAnimationFrame(loop);
  }
  var h = setInterval(function () { var q = window.__qw; if (q && q.ready && q.camera) { clearInterval(h); setTimeout(start, 1200); } }, 500);
})();
