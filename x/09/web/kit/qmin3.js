/* Qualia/omiya・kawagoe・shibuya 共通：常に出すボタンを 3 つに（2026-11-26 ボタンを減らす案）
   常に出す＝≡（PC は右下・スマホは左下）／主な操作 1 つ（「歩く」と「歩きつづける」を一つに。押すたびに 歩く→止まる→歩きつづける と切りかえる）／生き物の列（‹›）。
   ≡ の中＝← mitsulab・メニュー・地図・AR・音・＋ 足もとの高さ・持ち帰りの一枚・重ね・説・五感の 5 つ。元のボタンをそのまま移すので、働きは変わらない。
   位置・記録は扱わない。使い方：<script src="web/kit/qmin3.js?v=1" defer></script> */
(function () {
  var WIDE = innerWidth > 700, menu, main, dr, moved = 0;
  var css = document.createElement('style'); css.id = 'qmin3-css';
  css.textContent =
    '#q3Menu,#q3Main{position:fixed;z-index:40;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 0px);height:48px;border-radius:24px;border:1px solid rgba(128,227,247,.45);background:rgba(6,12,18,.72);color:#eef4f6;font:500 15px/1 "Shippori Mincho B1","Hiragino Mincho ProN",serif;letter-spacing:.08em;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);cursor:pointer}' +
    '#q3Menu{width:48px;font-size:20px;' + (WIDE ? 'right:24px' : 'left:16px') + '}' +
    '#q3Main{min-width:148px;padding:0 22px;' + (WIDE ? 'right:84px' : 'right:16px') + '}' +
    '#q3Menu[aria-expanded=true]{background:rgba(20,40,52,.92);border-color:rgba(128,227,247,.85)}' +
    '#q3Drawer{position:fixed;z-index:41;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 60px);' + (WIDE ? 'right:24px;width:360px' : 'left:12px;right:12px') + ';max-height:70vh;overflow:auto;padding:12px;border-radius:12px;background:rgba(6,12,18,.9);border:1px solid rgba(128,227,247,.3);display:none;flex-wrap:wrap;gap:8px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}' +
    '#q3Drawer.on{display:flex}' +
    '#q3Drawer>*{position:static!important;inset:auto!important;transform:none!important;translate:none!important;margin:0!important;opacity:1!important;visibility:visible!important;display:flex!important;pointer-events:auto!important}' +
    '#q3Drawer>a,#q3Drawer>button{min-height:44px;flex:1 1 40%;align-items:center;justify-content:center;padding:0 12px!important;border-radius:8px!important;background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.14)!important;color:#eef4f6!important;font:500 14px/1.3 "Hiragino Sans",sans-serif!important;text-decoration:none;width:auto!important;height:auto!important;box-shadow:none!important}' +
    '#q3Drawer>#qS6{flex:1 1 100%;justify-content:space-between;background:none!important;border:0!important;box-shadow:none!important;width:auto!important;padding:4px 0 0!important}' +
    '#q3Drawer #qS6 span{opacity:.9!important}' +
    '#q3Drawer .q3h{flex:1 1 100%;font:400 11px/1.4 "Hiragino Sans",sans-serif;color:rgba(220,232,238,.62);letter-spacing:.06em;display:block!important}' +
    /* 常に出す列から外すもの（≡ の中へ移すまでのあいだもちらつかないように） */
    'html body #modeWalk,html body #autoBtn{display:none!important}' +
    'html body #hud .seg{background:none!important;border:0!important;box-shadow:none!important}' +
    'body:has(#q3Drawer.on) #qKao{display:none}' +
    /* 字幕と問いを景色の上でも読めるように：淡い下地・1 行 */
    /* 字幕は下の中央（主な操作の上）。どの道具の古い置き場より強く */
    'html body #caption#caption{top:auto!important;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 70px)!important;left:0!important;right:0!important;translate:none!important;transform:none!important;text-align:center!important}' +
    'html body #caption#caption #capText#capText{background:rgba(4,10,16,.66)!important;padding:4px 12px!important;border-radius:4px!important;white-space:nowrap!important;display:inline-block!important;max-width:calc(100vw - 32px)!important;overflow:hidden!important;text-overflow:ellipsis!important}' +
    /* 次の地点への向きと距離（押せない印）は淡く小さく */
    'html body #qDir{opacity:.38!important;pointer-events:none!important;transform:scale(.8)}' +
    /* 生き物の列はいつも見える */
    'html body:not(:has(#qKao.on)) #qRing{opacity:1!important;visibility:visible!important}' +
    'html body #capText:empty{display:none!important}' +
    /* 生き物の名前はいつも出し、景色に溶けないよう影を付ける */
    'html body #qRing .rg-it span{opacity:1!important;text-shadow:0 0 2px #000,0 0 6px rgba(0,0,0,.9)!important}' +
    /* 窓は一度に 1 つ：昔の写真の窓（渋谷）か問いの窓が出ているあいだは、字幕と年代の札をしまう */
    'body.jdB #caption,body:has(#qKao.on) #caption,body:has(#qKao.on) #qJidaiTag,body:has(#qKao.on) #sndTag{visibility:hidden!important}' +
    /* 音の出典の札は左下（≡ の上）へ。生き物の列と重ねない */
    'html body #sndTag{top:auto!important;right:auto!important;left:16px!important;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 120px)!important;max-width:min(360px,60vw)!important;text-align:left!important;transform:none!important;translate:none!important}' +
    'html body #qRing .rg-row{padding-left:44px!important;padding-right:44px!important;box-sizing:border-box}' +
    'html body #qKao div{background:rgba(3,6,12,.92)!important;opacity:1!important}';
  document.head.appendChild(css);
  function btnByText(re, root) { return [].slice.call((root || document).querySelectorAll('a,button')).filter(function (e) { return re.test((e.getAttribute('aria-label') || '') + ' ' + (e.textContent || '')) && !e.closest('#q3Drawer'); })[0]; }
  function walking() { var a = document.getElementById('autoBtn'); return !!(a && /止ま/.test(a.textContent)); }
  function label() {
    if (!main) return; var walk = document.body.dataset.mode === 'walk' || (window.__qw && __qw.mode === 'walk');
    main.textContent = walk && walking() ? '止まる' : '歩く';
  }
  function take(el, h) { if (!el || el.closest('#q3Drawer')) return; if (h) { var t = document.createElement('span'); t.className = 'q3h'; t.textContent = h; dr.appendChild(t); } dr.appendChild(el); moved++; }
  function build() {
    if (menu) return;
    menu = document.createElement('button'); menu.id = 'q3Menu'; menu.type = 'button'; menu.textContent = '≡'; menu.setAttribute('aria-label', 'メニュー（地図・音・五感ほか）'); menu.setAttribute('aria-expanded', 'false');
    main = document.createElement('button'); main.id = 'q3Main'; main.type = 'button';
    dr = document.createElement('div'); dr.id = 'q3Drawer'; dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-label', 'メニュー');
    document.body.appendChild(dr); document.body.appendChild(menu); document.body.appendChild(main);
    var hud = document.getElementById('hud');
    take(btnByText(/mitsulab/, hud) || btnByText(/^\s*←?\s*mitsulab/));
    var mb = document.getElementById('menuBtn'); if (mb) { mb.textContent = '声・出典'; take(mb); }
    take(document.getElementById('modeSky')); take(document.getElementById('modeAR'));
    take(document.getElementById('qSnd'));
    take(btnByText(/足もとの高さ/)); take(btnByText(/歩いた道のりと受/));
    var qf = document.getElementById('qfBtn'), qx = document.getElementById('qxBtn'); if (qf) qf.textContent = '層を重ねる'; if (qx) qx.textContent = '説明の文字'; take(qf); take(qx);
    take(document.getElementById('qS6'), '五感');
    menu.addEventListener('click', function (e) { e.stopPropagation(); var on = !dr.classList.contains('on'); dr.classList.toggle('on', on); menu.setAttribute('aria-expanded', on); });
    dr.addEventListener('click', function (e) { if (e.target.closest('#qS6')) return; setTimeout(function () { dr.classList.remove('on'); menu.setAttribute('aria-expanded', 'false'); label(); }, 120); });
    addEventListener('pointerdown', function (e) { if (dr.classList.contains('on') && !e.target.closest('#q3Drawer,#q3Menu')) { dr.classList.remove('on'); menu.setAttribute('aria-expanded', 'false'); } }, true);
    main.addEventListener('click', function (e) {
      e.stopPropagation(); var walk = document.body.dataset.mode === 'walk' || (window.__qw && __qw.mode === 'walk');
      if (!walk) { var w = document.getElementById('modeWalk'); w && w.click(); }
      else { var a = document.getElementById('autoBtn'); if (a) a.click(); else if (window.__qw && __qw.autoWalk) __qw.autoWalk(!walking()); }
      setTimeout(label, 60); setTimeout(label, 600);
    });
    new MutationObserver(label).observe(document.body, { attributes: true, attributeFilter: ['data-mode', 'class'] });
    var a = document.getElementById('autoBtn'); a && new MutationObserver(label).observe(a, { childList: true, characterData: true, subtree: true });
    function cap() { var c = document.getElementById('caption'); if (!c) return; var b = 'calc(max(16px, env(safe-area-inset-bottom)) + 70px)';
      if (c.style.getPropertyValue('bottom') !== b) { c.style.setProperty('top', 'auto', 'important'); c.style.setProperty('bottom', b, 'important'); c.style.setProperty('translate', 'none', 'important'); c.style.setProperty('transform', 'none', 'important'); }
      var g = document.getElementById('sndTag'); if (g && g.style.getPropertyValue('left') !== '16px') { [['top', 'auto'], ['right', 'auto'], ['left', '16px'], ['bottom', 'calc(max(16px, env(safe-area-inset-bottom)) + 120px)'], ['text-align', 'left'], ['max-width', 'min(340px, 60vw)'], ['transform', 'none']].forEach(function (p) { g.style.setProperty(p[0], p[1], 'important'); }); }
      var t = document.getElementById('capText'); c.style.setProperty('visibility', t && t.textContent.trim() ? 'visible' : 'hidden', 'important'); }
    label(); cap(); setInterval(function () { label(); cap(); var s = document.getElementById('qS6'); if (s && !s.closest('#q3Drawer')) take(s, '五感'); }, 1000);
  }
  var h = setInterval(function () { var q = window.__qw; if (q && q.ready && document.getElementById('hud')) { clearInterval(h); setTimeout(build, 1600); } }, 200);
})();
