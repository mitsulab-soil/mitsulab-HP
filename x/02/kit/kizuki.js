/* kizuki.js ── 3D の景色に「気づいた」痕跡を淡く残す部品（trace.js を使う）。2026-11-26
   「気づいた」を押す → 見ている先（画面の中央の先）に痕跡を置く。同じ所は重なって濃く、約 3 日で半分に薄れる。
   端末の中だけ（localStorage）。送信しない。
   使い方（three の側で project と aim を用意する）：
     Kizuki.start({
       key:'sight.kizuki', mount: document.getElementById('qgEdge'),
       place: () => 'forest',                         // 場所ごとに分ける
       aim: () => ({x,y,z}),                          // 見ている先の点（世界座標）
       project: p => ({x,y,d,ok}),                    // 画面の px・距離・前にあるか
       visible: () => true, color:'#9bdcf0', cell: 2  // 升目 m
     });
*/
(function (g) {
  'use strict';
  function start(o) {
    if (!g.Trace) return null;
    var T = Trace.create({ key: o.key, halfLife: o.halfLife || 3 * 864e5, cap: 4 }), cell = o.cell || 2, col = o.color || '#9bdcf0';
    var cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + (o.z || 2);
    document.body.appendChild(cv); var ctx = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 1.5);
    function size() { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
    size(); addEventListener('resize', size);
    var flash = null, last = 0;
    function frame(t) {
      requestAnimationFrame(frame);
      if (t - last < 50) return; last = t;             // 20 こま/秒で十分（軽く）
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      if (o.visible && !o.visible()) return;
      var pl = o.place ? o.place() : '', list = [];
      T.all().forEach(function (e) { if (e.m && e.m.pl === pl) list.push(e); });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var k = flash ? Math.max(0, 1 - (t - flash.t) / 1400) : 0;
      var rings = [];
      Trace.paint(ctx, list, function (e) {
        var p = o.project(e.m); if (!p || !p.ok) return null;
        var r = Math.max(16, Math.min(90, 420 / Math.max(p.d, .5)));
        if (flash && flash.id === e.id) r *= 1 + .6 * k;
        rings.push([p.x, p.y, r * .38, Math.min(1, e.w / 4)]);
        return { x: p.x, y: p.y, r: r, c: col, cap: 4 };
      }, .75, 'source-over');
      /* 芯に細い輪：にじみだけだと景色に溶けて見落とすので、印として読める線を一本 */
      /* 明るい景色でも読めるよう、暗いふちの上に色の輪（2026-11-26 夕） */
      rings.forEach(function (q) { var al = .45 + .5 * q[3];
        ctx.globalAlpha = al * .7; ctx.strokeStyle = 'rgb(8,22,28)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, Math.PI * 2); ctx.stroke(); });
      ctx.globalAlpha = 1;
      if (k === 0) flash = null;
    }
    requestAnimationFrame(frame);
    var tip = document.createElement('div'); tip.setAttribute('role', 'status');
    tip.style.cssText = 'position:fixed;left:50%;top:calc(76px + env(safe-area-inset-top));transform:translateX(-50%);max-width:min(340px,calc(100vw - 32px));padding:8px 14px;border-radius:18px;background:rgba(8,13,12,.72);color:#e8f1ee;font:13px/1.6 "Hiragino Mincho ProN",serif;letter-spacing:.04em;text-align:center;opacity:0;transition:opacity .4s;pointer-events:none;z-index:70';
    document.body.appendChild(tip); var tt = 0;
    function say(m) { tip.textContent = m; tip.style.opacity = 1; clearTimeout(tt); tt = setTimeout(function () { tip.style.opacity = 0; }, 3600); }
    var b = document.createElement('button'); b.type = 'button'; b.className = o.btnClass || 'qg-btn'; b.textContent = '気づいた';
    b.setAttribute('aria-label', '気づいた：見ている先に痕跡を残す（この端末の中だけ・数日で薄れる）');
    b.style.cssText = 'width:auto;min-width:44px;min-height:44px;padding:0 14px;border-radius:22px;white-space:nowrap;font-size:13px;letter-spacing:.06em';
    b.onclick = function () {
      var a = o.aim(); if (!a) return;
      var q = { x: Math.round(a.x / cell) * cell, y: Math.round(a.y / cell) * cell, z: Math.round(a.z / cell) * cell }, pl = o.place ? o.place() : '';
      var id = pl + ':' + q.x + ',' + q.y + ',' + q.z, was = T.strength(id);
      T.put(id, 1, { pl: pl, x: q.x, y: q.y, z: q.z }); flash = { id: id, t: performance.now() };
      say(was > .3 ? '前に気づいた所に重なり、痕跡が濃くなりました。数日で薄れます。' : '見ている先に、気づいた痕跡を残しました。数日で薄れます。');
    };
    if (o.mount) o.mount.appendChild(b);
    return { trace: T, button: b };
  }
  g.Kizuki = { start: start };
})(window);
