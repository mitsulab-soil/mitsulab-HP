// 足もとの高さ（2026-11-19 本人 ok「一つの場所・一つの瞬間・一つの感覚・一つの問い」）
// いま立っている所が周り（半径 150 m）より高いか低いかを、低い音の深さと、足もとの振動の重さ（Android）で感じる。
// 歩いている間は静かに続く音と振動だけ。数字と出典は「＋」の中だけ。地点の問いは kit/kaoage.js の data-pts に置く。
// データ：kit/chikei.json＝国土地理院 標高タイル（DEM5A）を mitsulab が 25 m 格子に間引き、周りとの差を計算したもの（地形図は使わない・焼き込まない）。
// 位置は window.__qw.camera から読むだけ。記録しない・どこにも送らない。
// 使い方：<script src="kit/chikei.js" data-left="12" data-bottom="272" defer></script>
(function () {
  var me = document.currentScript; if (!me) return;
  var d = me.dataset, base = me.src.replace(/[^/]*$/, ""), G = null, ac = null, osc = null, gn = null, lp = null, rel = 0, lastV = 0, lastP = null;
  function px(v, def) { var n = parseInt(v, 10); return isNaN(n) ? def : n; }
  var st = document.createElement("style");
  st.textContent = ".qck{all:unset;position:fixed;left:calc(" + px(d.left, 12) + "px + env(safe-area-inset-left));bottom:calc(" + px(d.bottom, 272) + "px + env(safe-area-inset-bottom));z-index:50;box-sizing:border-box;min-width:44px;height:44px;padding:0 12px;border-radius:22px;cursor:pointer;display:none;align-items:center;gap:6px;background:rgba(18,26,32,.55);border:1px solid rgba(190,220,235,.28);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#eef3f6;opacity:.72;font:400 12px/1 'Shippori Mincho B1','Hiragino Mincho ProN',serif;letter-spacing:.04em}" +
    "body[data-mode=walk] .qck.ok{display:inline-flex}.qck:focus-visible{outline:2px solid #bfe3f0;outline-offset:2px}" +
    ".qckp{position:fixed;left:calc(" + (px(d.left, 12) + 52) + "px + env(safe-area-inset-left));bottom:calc(" + (px(d.bottom, 272) + 52) + "px + env(safe-area-inset-bottom));z-index:51;max-width:min(300px,calc(100vw - 150px));box-sizing:border-box;padding:12px 14px;border-radius:12px;background:rgba(12,18,24,.86);border:1px solid rgba(190,220,235,.22);color:#e8f0f3;font:400 12px/1.7 'Hiragino Sans',sans-serif;display:none}.qckp.on{display:block}.qckp b{font:500 14px/1.6 'Shippori Mincho B1','Hiragino Mincho ProN',serif;font-weight:500}.qckp small{display:block;margin-top:6px;color:rgba(220,232,238,.62);font-size:11px;line-height:1.6}" +
    "body:not([data-mode=walk]) .qckp{display:none!important}@media print{.qck,.qckp{display:none!important}}";
  document.head.appendChild(st);
  var b = document.createElement("button"); b.type = "button"; b.className = "qck"; b.textContent = "＋ 足もとの高さ";
  b.setAttribute("aria-expanded", "false");
  var p = document.createElement("div"); p.className = "qckp"; p.setAttribute("role", "note");
  b.addEventListener("click", function (e) { e.stopPropagation(); var on = !p.classList.contains("on"); p.classList.toggle("on", on); b.setAttribute("aria-expanded", on); if (on) fill(); });
  ["pointerdown", "touchstart"].forEach(function (k) { b.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); p.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); });
  function at(x, z, key) {
    if (!G) return null;
    var fx = (x - G.x0) / G.s, fz = (z - G.z0) / G.s, i = Math.floor(fz), j = Math.floor(fx);
    if (i < 0 || j < 0 || i >= G.nz - 1 || j >= G.nx - 1) return null;
    var A = G[key], a = A[i][j], c = A[i][j + 1], e = A[i + 1][j], f = A[i + 1][j + 1];
    if (a == null || c == null || e == null || f == null) return null;
    var u = fx - j, v = fz - i;
    return ((a * (1 - u) + c * u) * (1 - v) + (e * (1 - u) + f * u) * v) / 10;
  }
  function pos() { var c = window.__qw && window.__qw.camera; return c ? c.position : null; }
  function fill() {
    var q = pos(), h = q && at(q.x, q.z, "abs"), r = q && at(q.x, q.z, "rel");
    p.innerHTML = (!q ? "<b>歩きはじめると、足もとの高さが分かります。</b>" : h == null ? "<b>この辺りの高さは、データの範囲の外です。</b>" :
      "<b>" + (r > 1 ? "周りより、少し高い所" : r < -1 ? "周りより、少し低い所" : "周りと、ほぼ同じ高さ") + "</b><br>標高 およそ " + h.toFixed(1) + " m ／ 周り（半径 150 m）との差 " + (r >= 0 ? "+" : "") + r.toFixed(1) + " m") +
      "<small>音が深いほど、振動が重いほど低い所。<br>出典：<a href=\"https://maps.gsi.go.jp/development/ichiran.html\" target=\"_blank\" rel=\"noopener\" style=\"color:inherit\">国土地理院 標高タイル（DEM5A）</a>を mitsulab が加工（25 m 格子・周りとの差）。</small>";
  }
  function soundOn() { var s = document.getElementById("qSnd"); return !s || s.getAttribute("aria-pressed") !== "false"; }
  function walking() { return document.body.dataset.mode === "walk" && !document.hidden; }
  function startAudio() {
    if (ac) return; var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    try {
      ac = new C(); osc = ac.createOscillator(); lp = ac.createBiquadFilter(); gn = ac.createGain();
      osc.type = "triangle"; osc.frequency.value = 82; lp.type = "lowpass"; lp.frequency.value = 220; gn.gain.value = 0;
      osc.connect(lp); lp.connect(gn); gn.connect(ac.destination); osc.start();
    } catch (_) { ac = null; }
  }
  function tick() {
    if (!G) return;
    var q = pos(), on = walking() && q, r = on ? at(q.x, q.z, "rel") : null;
    if (r != null) rel += (r - rel) * .35;
    var k = Math.max(-1, Math.min(1, rel / 3)); // -1＝周りより 3 m 低い … +1＝3 m 高い
    if (ac && osc) {
      var t = ac.currentTime, g = on && r != null && soundOn() ? .028 + .022 * (1 - k) / 2 : 0;
      osc.frequency.setTargetAtTime(82 * Math.pow(2, k * .75), t, .8); // 低い所ほど深い（高い所で約 1.7 倍、低い所で約 0.6 倍）
      lp.frequency.setTargetAtTime(160 + 120 * (k + 1), t, .8);
      gn.gain.setTargetAtTime(g, t, .6);
    }
    if (on && r != null && navigator.vibrate && Date.now() - lastV > 1600) {
      var moved = lastP && Math.hypot(q.x - lastP.x, q.z - lastP.z) > .8;
      lastP = { x: q.x, z: q.z };
      if (moved) { lastV = Date.now(); try { navigator.vibrate(Math.round(14 + 26 * (1 - k) / 2)); } catch (_) {} }
    }
    if (p.classList.contains("on")) fill();
  }
  function load() {
    fetch(base + "chikei.json").then(function (r) { return r.json(); }).then(function (j) { G = j; b.classList.add("ok"); }).catch(function () {});
  }
  function init() {
    document.body.appendChild(b); document.body.appendChild(p);
    addEventListener("pointerdown", startAudio, { once: true, capture: true });
    addEventListener("keydown", startAudio, { once: true, capture: true });
    document.addEventListener("visibilitychange", function () { if (ac) { if (document.hidden) ac.suspend(); else ac.resume(); } });
    setTimeout(load, 2500);
    setInterval(tick, 500);
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
