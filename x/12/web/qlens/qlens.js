/* qlens.js ── P（と後で M）のレンズを、どの道具でも同じ口で差す部品（2026-11-27）
   設計＝01_経営/01_経営/03_資料/EにPを読み込む設計_2026-11-27.md
   レンズの口：{ id, name, tool, apply(ctx), dispose() }
     ctx = { renderer, scene, camera, canvas, mount, say(text) }   ← three.js の道具ならどれでも作れる
   レンズの中身は lens-<tool>.js にあり、選んだときにだけ読む（起動を重くしない）。
   使い方（E の道具）：
     <script src="web/kit/qlens/qlens.js"></script>
     <script>QLens.mountE({ base:'web/kit/qlens/', ctx:()=>({ renderer:__qw.renderer, scene:__qw.scene, camera:__qw.camera, say:t=>__qw.speak&&__qw.speak(t) }), drawer:'#q3Drawer' })</script>
   P の道具の単体でも：QLens.use('sight-bee', ctx) で同じ部品を読む。 */
(function (g) {
  'use strict';
  /* 目録（中身は読まない）。M のレンズも同じ形で一行足す */
  var LIST = [
    { id: 'none',       name: 'そのまま', tool: '' },
    { id: 'sight-bee',  name: 'ミツバチ', tool: 'sight' },
    { id: 'sight-papilio', name: 'アゲハ', tool: 'sight' },
    { id: 'hear-bat',   name: 'コウモリ', tool: 'hear' },
    { id: 'touch-ground', name: '手ざわり', tool: 'touch' },
    { id: 'magnet-field', name: '地磁気', tool: 'magnet' }
  ];
  var defs = {}, loading = {}, cur = null, curId = 'none', base = '';
  function define(d) { defs[d.id] = d; }
  function load(tool) {
    if (!tool) return Promise.resolve();
    if (loading[tool]) return loading[tool];
    return loading[tool] = new Promise(function (ok, ng) {
      var s = document.createElement('script'); s.src = base + 'lens-' + tool + '.js?v=4'; s.onload = ok; s.onerror = ng; document.head.appendChild(s);
    });
  }
  function use(id, ctx) {
    var it = LIST.filter(function (x) { return x.id === id; })[0] || LIST[0];
    if (cur) { try { cur.dispose(); } catch (e) { } cur = null; }
    curId = it.id;
    if (it.id === 'none') return Promise.resolve(null);
    return load(it.tool).then(function () {
      if (curId !== it.id) return null;          // 読むあいだに別のレンズが選ばれた
      var d = defs[it.id]; if (!d) return null;
      cur = d.make(ctx || {}); cur.apply(ctx || {}); return cur;
    });
  }
  /* E の ≡ の板に「レンズ」の札の並びを足す */
  function mountE(o) {
    base = o.base || base;
    var css = document.createElement('style');
    css.textContent = '.qlens{grid-column:1/-1;flex:0 0 100%;width:100%;box-sizing:border-box;position:static;margin:0 0 10px;padding:0 0 10px;border-bottom:1px solid rgba(170,226,236,.18)}.qlens b{display:block;font:500 12px/1.4 "Shippori Mincho","Hiragino Mincho ProN",serif;letter-spacing:.1em;opacity:.72;margin:0 0 8px}.qlens div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.qlens button{position:static;width:100%;min-width:0;min-height:44px;overflow:hidden;padding:4px 6px;border:1px solid rgba(170,226,236,.4);border-radius:22px;background:rgba(6,34,38,.3);color:#e9f6f5;font:500 12px/1.25 "Shippori Mincho","Hiragino Mincho ProN",serif}.qlens button[aria-pressed=true]{background:rgba(155,220,240,.22);border-color:rgba(190,236,246,.9)}';
    css.textContent += 'html body #q3Drawer>.qlens{grid-column:1/-1!important;display:block!important;width:100%!important}html body #q3Drawer .qlens>div{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}html body #q3Drawer .qlens button{min-width:0!important;width:100%!important;padding:0 4px!important;font-size:12px!important;letter-spacing:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis}html body #q3Drawer .qlens b{display:block!important;margin:0 0 8px!important}';
    document.head.appendChild(css);
    var box = document.createElement('section'); box.className = 'qlens'; box.setAttribute('aria-label', '知覚のレンズ');
    box.innerHTML = '<b>知覚のレンズ</b><div></div>';
    var row = box.lastChild;
    LIST.forEach(function (it) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = it.name; b.dataset.lens = it.id;
      b.setAttribute('aria-pressed', it.id === curId ? 'true' : 'false');
      b.addEventListener('click', function () {
        row.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        use(it.id, o.ctx()).catch(function (e) { console.warn('qlens', e); });
      });
      row.appendChild(b);
    });
    function put() { var d = document.querySelector(o.drawer || '#q3Drawer'); if (d && !d.contains(box)) d.insertBefore(box, d.firstChild); }
    var t0 = Date.now(), iv = setInterval(function () { put(); if (Date.now() - t0 > 30000) clearInterval(iv); }, 400);
    /* ≡ を押したときにも差し込む（引き出しを押してから作る道具・遅く作る道具でも出る） */
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest(o.menu || '#q3Menu, #qgBar [data-k=menu]')) { put(); setTimeout(put, 0); setTimeout(put, 120); } }, true);
    return { box: box };
  }
  g.QLens = { list: LIST, define: define, use: use, mountE: mountE, current: function () { return curId; }, setBase: function (b) { base = b; } };
})(window);
