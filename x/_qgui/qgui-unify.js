/* qgui-unify.js — 全道具の GUI を一つの決まりにそろえる（2026-11-26）。決まり＝README.md
   使い方：ページの最後に <script src="kit/qgui-unify.js"></script><script>qgUnify({...})</script>
   menu: その道具の ≡（押すと元の引き出しが開く。列のいちばん右下に動かす）
   main: 主な操作 1 つ ／ sw: 切りかえ 1 つ（任意）
   group: 選ぶものの入れ物（中のボタンを ▾ の札 1 つにたたむ。いま選んでいるものの名を出す）。item: 中のボタンの選び方（既定 'button'）
   hide: 列があれば要らなくなるもの（‹ › など。働きは group が持つ）
   drawer: 引き出しの中身の入れ物 ／ toDrawer: 引き出しに移すもの（戻るリンク・現在地など）
   sp: スマホ（幅 768 未満）だけの上書き（例 {main:'#walk', toDrawer:['#ar']}）
   cycle: 押すたびに次へ送るボタン（候補の一覧を持たない道具。札は「名前 ↻」）
   labels: { セレクタ: 列での名前 }（記号だけのボタンに名前を付ける）
   pickClass: 押す前に元の入れ物へ付けるクラス（元の列が「開いてから選ぶ」作りのとき）
   name: 道具名の札 ／ sub: 字幕
   後から作られる部品にも当てるため、30 秒のあいだ見張ってからやめる。 */
(function () {
  function $(s) { if (typeof s !== 'string') return s; if (s.indexOf('text:') === 0) { var t = s.slice(5); return Array.prototype.filter.call(document.querySelectorAll('button,a,summary,[role=button]'), function (e) { return e.textContent.trim() === t && !e.closest('#qgBar'); })[0] || null; } return document.querySelector(s); }
  var ONS = ['[aria-pressed="true"]', '[aria-selected="true"]', '[aria-current="true"]', '.on'];
  function isOn(g) { for (var i = 0; i < ONS.length; i++) { var e = g.querySelector(ONS[i]); if (e) return e; } return null; }
  var ARW = { '‹': '← 前', '›': '次 →' };
  function lbl(b) { var t0 = (b.textContent || '').trim(); if (ARW[t0]) return ARW[t0]; return (b.getAttribute('data-qu-label') || b.textContent || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().replace(/[▾⌄]$/, '').trim(); }
  window.qgUnify = function (c) {
    if (c.sp && innerWidth < 768) { for (var k in c.sp) c[k] = c.sp[k]; }
    var bar = document.getElementById('qgBar'), pop = document.getElementById('qgPop');
    if (!bar) { bar = document.createElement('div'); bar.id = 'qgBar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', '操作'); document.body.appendChild(bar); }
    var slots = { sw: null, grp: null, main: null, menu: null }, done = {}, pill = null;
    function place() {
      bar.textContent = '';
      ['sw', 'grp', 'main', 'menu'].forEach(function (k) { if (slots[k]) bar.appendChild(slots[k]); });
    }
    function take(key, sel, cls) {
      if (done[key]) return; var e = $(sel); if (!e) return; done[key] = 1;
      var par = e.parentElement; e.classList.add('qg-u', cls); slots[key] = e; place();
      if (par && par !== document.body && par !== bar && !par.querySelector('button:not(.qu-gone),a,input,summary,[role=button],select')) par.classList.add('qu-gone');
    }
    function group() {
      if (done.grp || !c.group) return; var g = $(c.group); if (!g) return;
      var items = g.querySelectorAll(c.item || 'button'); if (!items.length) return; done.grp = 1;
      if (!pop) { pop = document.createElement('div'); pop.id = 'qgPop'; pop.setAttribute('role', 'menu'); document.body.appendChild(pop); }
      pill = document.createElement('button'); pill.type = 'button'; pill.className = 'qg-u qu-grp'; pill.setAttribute('aria-haspopup', 'true'); pill.setAttribute('aria-expanded', 'false');
      function cur() { if (c.groupLabel) { pill.textContent = c.groupLabel + ' ▾'; pill.setAttribute('aria-label', c.groupLabel + 'を選ぶ'); return; } var on = (c.labelFrom && $(c.labelFrom)) || isOn(g) || items[0]; pill.textContent = lbl(on) + (c.cycle ? ' ↻' : ' ▾'); pill.setAttribute('aria-label', (c.groupName || '選ぶ') + '：' + lbl(on)); }
      function set(o) { if (o) build(); pop.classList.toggle('on', o); document.body.classList.toggle('qu-popon', o); pill.setAttribute('aria-expanded', String(o)); }
      // 選ぶものは、元のボタンを押す代わりの札を列に並べる（元のボタンの働きはそのまま。元の入れ物は隠す）
      g.classList.add('qu-gone');
      function sel() { return Array.prototype.filter.call(g.querySelectorAll(c.item || 'button'), function (b) { return !b.closest('.qu-hide') && lbl(b); }); }
      function build() {
        pop.textContent = ''; sel().forEach(function (b) {
          var x = document.createElement('button'); x.type = 'button'; x.className = 'qg-u'; x.textContent = lbl(b); x.setAttribute('role', 'menuitemradio');
          var on = isOn(g) === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on));
          x.addEventListener('click', function () { if (c.pickClass) g.classList.add(c.pickClass); b.click(); setTimeout(function () { cur(); build(); if (!c.keepOpen) set(false); }, 80); });
          pop.appendChild(x); });
      }
      pill.addEventListener('click', function () { if (c.cycle) { var n = $(c.cycle); n && n.click(); setTimeout(cur, 80); return; } set(!pop.classList.contains('on')); });
            addEventListener('pointerdown', function (e) { if (pop.classList.contains('on') && !pop.contains(e.target) && !pill.contains(e.target)) set(false); }, true);
      addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
      new MutationObserver(function () { cur(); if (pop.classList.contains('on')) build(); }).observe(g, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'aria-pressed', 'aria-selected'] });
      cur(); slots.grp = pill; place();
    }
    function rest() {
      (c.hide || []).forEach(function (s) { Array.prototype.forEach.call(document.querySelectorAll(s), function (e) { e.classList.add('qu-gone'); }); });
      var d = $(c.drawer);
      (c.toDrawer || []).forEach(function (s) { var e = $(s); if (!e || e.classList.contains('qu-indrawer')) return; if (d) { e.classList.add('qu-indrawer'); e.style.cssText += ';position:static;transform:none;inset:auto;margin:8px 0 0'; d.appendChild(e); } else e.classList.add('qu-gone'); });
      if (c.name) { var n = $(c.name); n && n.classList.add('qu-name'); }
      (c.fit || []).forEach(function (s) { Array.prototype.forEach.call(document.querySelectorAll(s), function (e) { e.classList.add('qu-fit'); }); });
      (c.panel || []).forEach(function (s) { Array.prototype.forEach.call(document.querySelectorAll(s), function (e) { e.classList.add('qu-panel'); }); });
      if (c.sub) { var s = $(c.sub); if (s && !s.classList.contains('qu-sub')) { s.classList.add('qu-sub'); var H = innerWidth < 768 ? 16 : 24, st = { position: 'fixed', left: '50%', right: 'auto', top: 'auto', transform: 'translateX(-50%)', bottom: 'calc(env(safe-area-inset-bottom,0px) + ' + (H + 62) + 'px)', 'max-width': 'min(620px,calc(100vw - ' + (2 * H) + 'px))', width: 'max-content', 'text-align': 'center', background: 'rgba(4,12,14,.66)', 'border-radius': '10px', padding: '6px 12px', 'z-index': '39', margin: '0' };
          for (var k in st) s.style.setProperty(k, st[k], 'important'); } }
    }
    function names() { var L = c.labels || {}; for (var k in L) { var e = $(k); if (e && !e.dataset.quL) { e.dataset.quL = 1; e.setAttribute('aria-label', L[k]); e.textContent = L[k]; } } }
    function run() { names(); take('menu', c.menu, 'qu-menu'); take('main', c.main, 'qu-main'); if (c.sw) take('sw', c.sw, 'qu-sw'); group(); rest(); }
    run(); var mo = new MutationObserver(run); mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); run(); }, 30000);
  };
})();
