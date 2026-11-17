// 次の一歩（共通部品・2026-11-11）
// 作品の終わり近くで、つながる作品を一つだけ小さく示す札。画面の右下に小さく出て、操作をさまたげない。
// 使い方：<script src="kit/tsugi.js" data-href="../36/" data-name="Qualia/scale" data-line="大きさを 10 のべき乗で移る" defer></script>
// 出る時：最初の操作から 40 秒後（触らなければ出ない）。× で閉じたら、その回は出さない。何も記録しない。
(function () {
  var me = document.currentScript; if (!me) return;
  var href = me.dataset.href, name = me.dataset.name, line = me.dataset.line || "";
  if (!href || !name) return;
  var bot = parseInt(me.dataset.bottom || "76", 10) || 76; // 作品の下の操作の列より上に置く
  var rgt = parseInt(me.dataset.right || "12", 10) || 12; // 右端に縦の操作がある作品は空ける
  var shown = false, timer = 0;
  function show() {
    if (shown) return; shown = true;
    var st = document.createElement("style");
    st.textContent = ".tsg{position:fixed;right:calc(" + rgt + "px + env(safe-area-inset-right));bottom:calc(" + bot + "px + env(safe-area-inset-bottom));z-index:50;display:flex;align-items:center;gap:2px;max-width:min(78vw,300px);font:13px/1.4 'Shippori Mincho','Hiragino Mincho ProN',serif;color:#eef3f6;background:rgba(18,26,32,.62);border:1px solid rgba(190,220,235,.28);border-radius:22px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transform:translateY(6px);transition:opacity .6s,transform .6s}" +
      ".tsg.on{opacity:1;transform:none}.tsg a{color:inherit;text-decoration:none;padding:10px 4px 10px 14px;min-height:44px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center}" +
      ".tsg small{font-size:11px;opacity:.72}.tsg button{all:unset;cursor:pointer;width:44px;height:44px;text-align:center;line-height:44px;opacity:.6;font-size:15px}" +
      "@media (prefers-reduced-motion:reduce){.tsg{transition:none}}";
    document.head.appendChild(st);
    var b = document.createElement("div"); b.className = "tsg"; b.setAttribute("role", "complementary"); b.setAttribute("aria-label", "次の作品");
    var a = document.createElement("a"); a.href = href;
    a.innerHTML = "<span>次へ ── " + esc(name) + "</span>" + (line ? "<small>" + esc(line) + "</small>" : "");
    var x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-label", "閉じる"); x.textContent = "×";
    x.onclick = function () { b.remove(); };
    b.appendChild(a); b.appendChild(x); document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add("on"); });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function first() {
    if (timer) return; timer = setTimeout(show, 40000);
    ["pointerdown", "keydown", "wheel"].forEach(function (t) { removeEventListener(t, first); });
  }
  ["pointerdown", "keydown", "wheel"].forEach(function (t) { addEventListener(t, first, { passive: true }); });
})();
