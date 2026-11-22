// 顔を上げる間（共通部品・2026-11-20 本人「スマホを見つめるだけでなく、現実世界の捉え方が変わるように」）
// 同日 本人の直し：時間で出さず、ポイントとなる地点に着いたときに、その場所の実物を見る問いを一つ出す。
// 歩く場面で地点の近く（data-r m 以内）に来たら画面を暗く静め、碧が問いを置く。触れるか 12 秒で戻る。一つの地点は一度だけ。
// 地図に戻るとき一度だけ、いつもの景色へ戻す一言。
// 使い方：<script src="kit/kaoage.js" data-pts="x,z,問い;x,z,問い" data-end="終わりの一言" defer></script>
//   x・z は各町の places.json と同じ座標（m）。位置は window.__qw.camera から読むだけ。記録はしない・どこにも送らない。
(function () {
  var me = document.currentScript; if (!me) return;
  var d = me.dataset, END = d.end || "", R = +(d.r || 28), HOLD = 12000, GAP = 30000;
  var P = (d.pts || "").split(";").map(function (s) { var a = s.split(","); return { x: +a[0], z: +a[1], q: a.slice(2).join(","), done: 0 }; })
    .filter(function (p) { return p.q && isFinite(p.x) && isFinite(p.z); });
  if (!P.length) return;
  var st = document.createElement("style");
  st.textContent = "#qKao{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-start;justify-content:center;padding:calc(env(safe-area-inset-top) + 13vh) 16px 24px;background:none;opacity:0;pointer-events:none;transition:opacity 1.2s ease}" +
    "#qKao.on{opacity:1;pointer-events:auto}#qKao div{max-width:420px;text-align:center;background:rgba(3,6,12,.86);padding:14px 18px;border-radius:10px;color:#eef4f6;font:500 17px/1.9 'Shippori Mincho B1','Hiragino Mincho ProN',serif;letter-spacing:.05em}" +
    "#qKao{text-shadow:0 0 3px #000,0 0 12px rgba(0,0,0,.9),0 0 26px rgba(0,0,0,.7)}#qKao small{display:block;margin-top:14px;font:400 12px/1.6 'Hiragino Sans',sans-serif;color:rgba(220,232,238,.62);letter-spacing:.04em}" +
    "#qKao i{display:block;height:1px;margin:18px auto 0;background:rgba(127,227,247,.5);width:0;transition:width 12s linear}#qKao.on i{width:60%}";
  document.head.appendChild(st);
  var el = document.createElement("div"); el.id = "qKao"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
  el.innerHTML = "<div><span></span><small></small><i></i></div>";
  var back = 0, last = -1e9, walked = 0, t1 = 0, endShown = 0, safe = 0;
  function show(txt, sub) {
    if (!el.parentNode) document.body.appendChild(el);
    el.querySelector("span").textContent = txt; el.querySelector("small").textContent = sub || "";
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
    clearTimeout(back); back = setTimeout(hide, HOLD); last = Date.now();
  }
  function hide() { el.classList.remove("on"); }
  el.addEventListener("click", hide);
  function walking() { return document.body.dataset.mode === "walk" && !document.hidden; }
  function ask(p) {
    p.done = 1;
    show("碧：" + p.q, safe++ ? "見たら、画面に触れて戻る。" : "立ち止まってから、顔を上げて。画面に触れると戻ります。");
  }
  function check() {
    if (!walking()) return;
    var c = window.__qw && window.__qw.camera; if (!c) return;
    var x = c.position.x, z = c.position.z, best = null, bd = R;
    // 2026-11-23 本人の芯（短い問いで導き、画面を見続けさせない）は保ち、歩いている最中には急に出さない：2 秒立ち止まってから出す
    var mv = check.px == null ? 0 : Math.hypot(x - check.px, z - check.pz); check.px = x; check.pz = z; check.still = mv < .15 ? (check.still || 0) + 1 : 0;
    // 歩きはじめの地点にいる間は出さない。一度離れて（R＋10 m より外へ）からまた着いたら出す
    if (!walked) { walked = 1; t1 = Date.now(); P.forEach(function (p) { if (Math.hypot(p.x - x, p.z - z) < R) p.wait = 1; }); }
    P.forEach(function (p) { if (p.wait && Math.hypot(p.x - x, p.z - z) > R + 10) p.wait = 0; });
    if (Date.now() - t1 < 15000) return; // 歩きはじめは景色に慣れる間をおく
    if (el.classList.contains("on") || Date.now() - last < GAP) return;
    for (var i = 0; i < P.length; i++) { if (P[i].done || P[i].wait) continue; var dd = Math.hypot(P[i].x - x, P[i].z - z); if (dd < bd) { bd = dd; best = P[i]; } }
    if (best && check.still >= 2) ask(best);
  }
  function onMode() {
    if (walked && END && !endShown && document.body.dataset.mode === "sky") { endShown = 1; show("碧：" + END, "画面に触れると戻ります。"); }
  }
  function init() {
    new MutationObserver(onMode).observe(document.body, { attributes: true, attributeFilter: ["data-mode"] });
    setInterval(check, 1000);
    window.mitsuKaoage = { check: check, near: function (i) { last = -1e9; ask(P[i || 0]); } };
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
