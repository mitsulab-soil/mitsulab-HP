// 持ち帰りの一枚（共通部品・2026-11-11）
// 押したときだけ、いまの画面（3D の絵）を一枚の画像にして手元に保存する。位置・端末の情報は入れず、何も記録しない・どこにも送らない。
// 使い方：<script src="kit/ichimai.js" data-name="Qualia/time" data-bottom="128" data-right="12" defer></script>
//   data-left を書くと左に寄せる。data-top を書くと上から測る。
// 描画の負担：ふだんは何もしない（押したときに次のコマの直後で一度だけ写す。preserveDrawingBuffer は要らない）。
(function () {
  var me = document.currentScript; if (!me) return;
  var d = me.dataset, name = d.name || document.title.split(/[ ─｜|／]/)[0] || "mitsulab";
  function px(v, def) { var n = parseInt(v, 10); return isNaN(n) ? def : n; }
  var pos = (d.left != null ? "left:calc(" + px(d.left, 12) + "px + env(safe-area-inset-left));" : "right:calc(" + px(d.right, 12) + "px + env(safe-area-inset-right));") +
    (d.top != null ? "top:calc(" + px(d.top, 12) + "px + env(safe-area-inset-top));" : "bottom:calc(" + px(d.bottom, 128) + "px + env(safe-area-inset-bottom));");
  var st = document.createElement("style");
  st.textContent = ".icm{all:unset;position:fixed;" + pos + "z-index:50;box-sizing:border-box;width:44px;height:44px;border-radius:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;background:rgba(18,26,32,.55);border:1px solid rgba(190,220,235,.28);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#eef3f6;opacity:.78;transition:opacity .3s}" +
    ".icm:hover,.icm:focus-visible{opacity:1}.icm:focus-visible{outline:2px solid #bfe3f0;outline-offset:2px}.icm svg{width:20px;height:20px}" +
    ".icm-t{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:51;font:12px/1.4 'Shippori Mincho','Hiragino Mincho ProN',serif;color:#eef3f6;background:rgba(18,26,32,.7);padding:8px 14px;border-radius:16px;pointer-events:none;opacity:0;transition:opacity .4s}.icm-t.on{opacity:1}" +
    "@media (prefers-reduced-motion:reduce){.icm,.icm-t{transition:none}}@media print{.icm{display:none}}";
  var b = document.createElement("button"); b.type = "button"; b.className = "icm";
  b.setAttribute("aria-label", "この画面を一枚の画像で保存"); b.title = "この画面を一枚の画像で保存";
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3.5" y="6.5" width="17" height="12" rx="2"/><circle cx="12" cy="12.5" r="3.4"/><path d="M8.5 6.5l1.3-2h4.4l1.3 2"/></svg>';
  var busy = false;
  function toast(s) {
    var t = document.createElement("div"); t.className = "icm-t"; t.textContent = s; document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("on"); });
    setTimeout(function () { t.classList.remove("on"); setTimeout(function () { t.remove(); }, 500); }, 1600);
  }
  function grab() {
    var W = innerWidth, H = innerHeight, r = Math.min(devicePixelRatio || 1, 2);
    var c = document.createElement("canvas"); c.width = Math.round(W * r); c.height = Math.round(H * r);
    var g = c.getContext("2d"); g.fillStyle = "#0d1418"; g.fillRect(0, 0, c.width, c.height);
    var n = 0;
    Array.prototype.forEach.call(document.querySelectorAll("canvas"), function (cv) {
      if (cv === c || !cv.width || !cv.height) return;
      var q = cv.getBoundingClientRect(); if (q.width < 40 || q.height < 40 || q.bottom <= 0 || q.right <= 0 || q.left >= W || q.top >= H) return;
      var cs = getComputedStyle(cv); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return;
      try { g.globalAlpha = +cs.opacity || 1; g.drawImage(cv, q.left * r, q.top * r, q.width * r, q.height * r); n++; } catch (e) { /* 写せない絵は飛ばす */ }
    });
    g.globalAlpha = 1;
    var f = Math.round(12 * r), pad = Math.round(14 * r);
    g.font = f + "px 'Shippori Mincho','Hiragino Mincho ProN',serif"; g.textBaseline = "bottom";
    var s = name + " ── mitsulab";
    g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 4 * r; g.fillStyle = "rgba(238,243,246,.86)";
    g.fillText(s, pad, c.height - pad);
    return n ? c : null;
  }
  function save(c) {
    c.toBlob(function (blob) {
      busy = false;
      if (!blob) { toast("保存できませんでした"); return; }
      var fn = "mitsulab_" + name.replace(/[^\w぀-ヿ一-鿿-]+/g, "-").replace(/^-|-$/g, "") + ".png";
      var file = null; try { file = new File([blob], fn, { type: "image/png" }); } catch (e) {}
      var coarse = matchMedia && matchMedia("(pointer:coarse)").matches;
      if (coarse && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).catch(function () {});
        return;
      }
      var u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = fn; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      toast("一枚を保存しました");
    }, "image/png");
  }
  b.addEventListener("click", function (e) {
    e.stopPropagation(); if (busy) return; busy = true;
    // 作品の描画（前のコマで予約済み）が終わった直後に写す
    requestAnimationFrame(function () {
      var c = null; try { c = grab(); } catch (er) {}
      if (!c) { busy = false; toast("いまは写せる絵がありません"); return; }
      save(c);
    });
  });
  ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"].forEach(function (t) { b.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
  function mount() { document.head.appendChild(st); document.body.appendChild(b); }
  if (document.body) mount(); else addEventListener("DOMContentLoaded", mount);
})();
