/* yokei.js — 余景を数える一問と「この続きを」（2026-11-25 本人承認）
   読み方：<script src="kit/yokei.js" data-tool="sight" data-next-url="" data-next-label="この続きを"></script>（qgui.css のあとで）
   - 問い「景色は、少し違って見えましたか」に はい／少し／まだ の 3 つ。答えは端末の中（localStorage）だけで数え、外へは送らない。個人の情報は取らない。
   - 出すのは 1 回だけ。出る時：道具を 90 秒以上使ってから、PC で画面の上の端へ手が離れたとき／スマホで 150 秒たったとき／終わりの画面から window.qYokei.show() を呼んだとき。
   - 数を見る：アドレスの末尾に ?yokei=1 を付けて開くと、この端末で数えた数が左下に出る。
   - data-next-url が空なら「この続きを」は出さない（記事が公開されたら URL を入れる）。 */
(function () {
  var me = document.currentScript, tool = (me && me.dataset.tool) || location.pathname;
  var nextUrl = (me && me.dataset.nextUrl) || '', nextLabel = (me && me.dataset.nextLabel) || 'この続きを';
  var KEY = 'qyokei.v1', ASKED = 'qyokei.asked.' + tool;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function counts() { try { return JSON.parse(get(KEY) || '{}') || {}; } catch (e) { return {}; } }
  var css = '.qyk{position:fixed;right:var(--qg-edge,16px);top:calc(max(8px,env(safe-area-inset-top)) + 64px);z-index:60;max-width:min(300px,calc(100vw - 32px));padding:10px 12px;border:1px solid var(--qg-line,rgba(170,226,236,.55));border-radius:14px;background:var(--qg-ground,rgba(6,34,38,.38));-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:var(--qg-ink,#e9f6f5);font:400 13px/1.5 var(--qg-font,serif);opacity:0;transform:translateY(-4px);transition:opacity .3s,transform .3s}' +
    '.qyk.on{opacity:1;transform:none}.qyk p{margin:0 0 8px;letter-spacing:.04em}.qyk .r{display:flex;gap:6px;flex-wrap:wrap}' +
    '.qyk button,.qyk a{min-width:44px;min-height:44px;padding:0 12px;border:1px solid var(--qg-line,rgba(170,226,236,.55));border-radius:999px;background:transparent;color:inherit;font:inherit;text-decoration:none;display:inline-grid;place-items:center;transition:box-shadow 80ms,transform 80ms}' +
    '.qyk button:active,.qyk a:active{transform:scale(.95);box-shadow:var(--qg-glow,0 0 12px rgba(120,220,235,.4))}.qyk{padding-right:44px}.qyk .x{position:absolute;right:0;top:0;border:0;min-width:44px;min-height:44px;font-size:16px;opacity:.7}' +
    '.qyk-n{position:fixed;left:16px;bottom:16px;z-index:61;padding:8px 12px;border-radius:10px;background:rgba(0,0,0,.7);color:#fff;font:12px/1.5 monospace;white-space:pre}';
  var shown = false, t0 = Date.now(), box;
  function addCss() { if (document.getElementById('qyk-css')) return; var s = document.createElement('style'); s.id = 'qyk-css'; s.textContent = css; document.head.appendChild(s); }
  function close() { if (!box) return; box.classList.remove('on'); var b = box; setTimeout(function () { b.remove(); }, 320); box = null; }
  function answer(k) {
    var c = counts(); c[tool] = c[tool] || { yes: 0, little: 0, notyet: 0 }; c[tool][k] = (c[tool][k] || 0) + 1; set(KEY, JSON.stringify(c));
    var links = [];
    if (k === 'yes') links.push(['/x/39/?from=yokei', '地図に一言を置く']);   // 2026-11-26 余景を Qualia/map へ（投稿は端末の中・位置は約 250 m に丸める）
    if (nextUrl) links.push([nextUrl, nextLabel]);
    if (!links.length) { box.innerHTML = '<p>ありがとう。画面を閉じて、いつもの景色へ。</p>'; setTimeout(close, 2600); return; }
    box.innerHTML = '<button class="x" aria-label="閉じる">×</button><p>ありがとう。</p><div class="r"></div>';
    links.forEach(function (l) { var a = document.createElement('a'); a.href = l[0]; a.textContent = l[1]; if (/^https?:/.test(l[0])) { a.target = '_blank'; a.rel = 'noopener'; } box.querySelector('.r').appendChild(a); });
    setTimeout(close, 15000); return;
  }
  function show() {
    if (shown || get(ASKED)) return; shown = true; set(ASKED, '1'); addCss();
    box = document.createElement('div'); box.className = 'qyk'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '一問');
    box.innerHTML = '<button class="x" aria-label="閉じる">×</button><p>景色は、少し違って見えましたか</p><div class="r"><button data-k="yes">はい</button><button data-k="little">少し</button><button data-k="notyet">まだ</button></div>';
    box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.classList.contains('x')) close(); else if (b.dataset.k) answer(b.dataset.k); });
    document.body.appendChild(box); requestAnimationFrame(function () { box && box.classList.add('on'); });
    setTimeout(function () { if (box && !box.querySelector('a')) close(); }, 30000);
  }
  window.qYokei = { show: show, counts: counts };
  if (/[?&]yokei=1/.test(location.search)) {
    addEventListener('load', function () { addCss(); var c = counts(), d = document.createElement('div'); d.className = 'qyk-n'; var lines = ['余景（この端末で数えた数）']; Object.keys(c).forEach(function (k) { var v = c[k]; lines.push(k + '  はい ' + (v.yes || 0) + ' ／ 少し ' + (v.little || 0) + ' ／ まだ ' + (v.notyet || 0)); }); if (lines.length < 2) lines.push('まだありません'); d.textContent = lines.join('\n'); document.body.appendChild(d); });
  }
  var used = function () { return Date.now() - t0; };
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0 && used() > 90000) show(); });
  setTimeout(function () { if (matchMedia('(pointer:coarse)').matches) show(); }, 150000);
})();
