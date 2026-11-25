/* qsite-quiet.js（2026-11-26 本人「字幕が多い。風景がメイン」）omiya・kawagoe・shibuya 共通。
   字幕（#capText）に長い文が入ったら、句読点で 1 行ずつに区切り、読む速さ（1 字 約 0.13 秒）で順に出す。字幕の中身そのものはアプリが決める。 */
(function () {
  var el = document.getElementById('capText'); if (!el) return;
  var mine = false, timers = [];
  function max() { var w = (document.getElementById('caption') || el).clientWidth || innerWidth - 32; return Math.max(10, Math.floor(w / 14) - 1); }
  function chunks(t) {
    var m = max(), out = [], cur = '';
    t.split(/(?<=[。、！？」])/).forEach(function (p) {
      if ((cur + p).length > m && cur) { out.push(cur); cur = ''; }
      cur += p; while (cur.length > m + 2) { out.push(cur.slice(0, m)); cur = cur.slice(m); }
    });
    if (cur) out.push(cur); return out;
  }
  function put(t) { mine = true; el.textContent = t; mine = false; }
  new MutationObserver(function () {
    if (mine) return; var t = el.textContent || ''; timers.forEach(clearTimeout); timers = [];
    var cs = chunks(t); if (cs.length < 2) return;
    var at = 0; put(cs[0]);
    cs.forEach(function (c, i) { if (i) timers.push(setTimeout(function () { put(c); }, at)); at += 700 + c.length * 130; });
  }).observe(el, { childList: true, characterData: true, subtree: true });
})();
