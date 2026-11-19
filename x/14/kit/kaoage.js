// 顔を上げる間（共通部品・2026-11-20 本人「スマホを見つめるだけでなく、現実世界の捉え方が変わるように」）
// 歩く場面で、ときどき画面を暗く静め、碧が「実際の〇〇を見てみて」と一つだけ問いを置く。
// 触れるか 12 秒で戻る。歩く場面を離れたとき一度だけ、いつもの景色へ戻す一言。
// 使い方：<script src="kit/kaoage.js" data-q="問い1|問い2|…" data-end="終わりの一言" defer></script>
// 記録はしない・どこにも送らない。
(function () {
  var me = document.currentScript; if (!me) return;
  var d = me.dataset, Q = (d.q || "").split("|").filter(Boolean), END = d.end || "";
  var FIRST = +(d.first || 60) * 1000, GAP = +(d.gap || 150) * 1000, HOLD = 12000;
  if (!Q.length) return;
  var st = document.createElement("style");
  st.textContent = "#qKao{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:rgba(3,6,12,.86);opacity:0;pointer-events:none;transition:opacity 1.2s ease}" +
    "#qKao.on{opacity:1;pointer-events:auto}#qKao div{max-width:420px;text-align:center;color:#eef4f6;font:500 17px/1.9 'Shippori Mincho B1','Hiragino Mincho ProN',serif;letter-spacing:.05em}" +
    "#qKao small{display:block;margin-top:14px;font:400 12px/1.6 'Hiragino Sans',sans-serif;color:rgba(220,232,238,.62);letter-spacing:.04em}" +
    "#qKao i{display:block;height:1px;margin:18px auto 0;background:rgba(127,227,247,.5);width:0;transition:width 12s linear}#qKao.on i{width:60%}";
  document.head.appendChild(st);
  var el = document.createElement("div"); el.id = "qKao"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
  el.innerHTML = "<div><span></span><small></small><i></i></div>";
  var tm = 0, back = 0, n = 0, walked = 0, endShown = 0, safe = 0;
  function body() { return document.body; }
  function show(txt, sub) {
    if (!document.body) return;
    if (!el.parentNode) document.body.appendChild(el);
    el.querySelector("span").textContent = txt; el.querySelector("small").textContent = sub || "";
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
    clearTimeout(back); back = setTimeout(hide, HOLD);
  }
  function hide() { el.classList.remove("on"); }
  el.addEventListener("click", hide);
  function walking() { return body() && body().dataset.mode === "walk" && !document.hidden; }
  function plan(ms) { clearTimeout(tm); tm = setTimeout(tick, ms); }
  function tick() {
    if (!walking()) return;
    if (el.classList.contains("on")) return plan(GAP);
    show("碧：" + Q[n % Q.length], safe++ ? "見たら、画面に触れて戻る。" : "立ち止まってから、顔を上げて。画面に触れると戻ります。");
    n++; plan(GAP);
  }
  function onMode() {
    if (walking()) { if (!walked) { walked = 1; plan(FIRST); } else if (!tm) plan(GAP); }
    else if (walked && END && !endShown && body().dataset.mode === "sky") { endShown = 1; clearTimeout(tm); tm = 0; show("碧：" + END, "画面に触れると戻ります。"); }
  }
  function init() {
    new MutationObserver(onMode).observe(document.body, { attributes: true, attributeFilter: ["data-mode"] });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && walked) plan(GAP); });
    onMode();
    window.mitsuKaoage = { now: tick };
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
