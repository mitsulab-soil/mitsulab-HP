// 最初のひと目（共通部品・2026-11-12）
// 開いてから何も触らなくても、数秒のうちに一度だけ「見え方が変わる」瞬間を置く：
//   いまの景色の色を、ミツバチの目（紫外・青・緑の三色型）の模式へ寄せ、少しして人の目へ戻す。
// 数は kit/umwelt_lens.js の hachi と同じ（Peitsch et al. 1992 の感度の山からの近似。主観の再現ではない＝模式）。混ぜ方も henshin の hachi（mix .55）にそろえた。
// 音は鳴らさない。触る・キーを押すと、その場でやめて元に戻す。一度だけ。動きを減らす設定のときは出さない。
// 軽さ：いちばん大きな canvas に CSS の色の行列 1 つ（class と !important の規則で付け外し）。動かすのは行列の数だけ（約 4 秒・そのあと外す）。
// 使い方：<script src="kit/hajime.js" data-delay="2200" defer></script>（data-top で字幕の高さ〔px〕・data-mix で寄せる強さ 0〜1〔既定 .55〕・data-sat で彩度 1〜1.6〔既定 1〕）
(function () {
  var me = document.currentScript; if (!me) return;
  if (matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  var d = me.dataset, delay = +d.delay || 2200, top = d.top != null ? +d.top : null;
  var H = [.08, .85, .10, 0, .15, .85, 0, .1, .55], MIX = Math.min(1, +d.mix || .55), I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  // 目標の行列 T ＝ 彩度（data-sat・既定 1）×（人の目と hachi を MIX で混ぜたもの）。灰色の多い町並みでも差が分かるように彩度だけ足せる
  var SAT = Math.max(1, Math.min(1.6, +d.sat || 1)), W3 = [.2126, .7152, .0722], T = [];
  for (var r0 = 0; r0 < 3; r0++) for (var c0 = 0; c0 < 3; c0++) { var v0 = 0; for (var q = 0; q < 3; q++) { var sm = (r0 === q ? SAT : 0) + (1 - SAT) * W3[q]; v0 += sm * (I[q * 3 + c0] + (H[q * 3 + c0] - I[q * 3 + c0]) * MIX); } T.push(v0); }
  var touched = false, run = null, tries = 0;
  function stop() { touched = true; if (run) run(true); }
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (t) { addEventListener(t, stop, { passive: true, capture: true, once: true }); });
  function biggest() {
    var best = null, A = 0;
    Array.prototype.forEach.call(document.querySelectorAll("canvas"), function (c) {
      var q = c.getBoundingClientRect(), a = q.width * q.height;
      if (a > A && getComputedStyle(c).display !== "none") { A = a; best = c; }
    });
    return A > innerWidth * innerHeight * .4 ? best : null;
  }
  function begin() {
    if (touched || document.hidden) return;
    var cv = biggest(); if (!cv) { if (++tries < 12) setTimeout(begin, 500); return; }
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true"); svg.style.position = "absolute";
    svg.innerHTML = '<filter id="hjF" color-interpolation-filters="linearRGB"><feColorMatrix id="hjM" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter>';
    document.body.appendChild(svg);
    var fm = svg.querySelector("#hjM"), css = document.createElement("style");
    css.textContent = "canvas.hj-on{filter:url(#hjF)!important}"; document.head.appendChild(css);   // 作品が毎コマ canvas.style.filter を書きかえても負けないように（!important の規則）
    var cap = document.createElement("div");
    cap.setAttribute("role", "status");
    cap.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);" + (top != null ? "top:calc(" + top + "px + env(safe-area-inset-top));" : "top:22%;") +
      "z-index:6;pointer-events:none;font:600 15px/1.6 'Shippori Mincho','Hiragino Mincho ProN',serif;letter-spacing:.08em;color:#fff;text-align:center;white-space:normal;width:max-content;max-width:calc(100vw - 150px);word-break:keep-all;overflow-wrap:anywhere;" +
      "text-shadow:0 0 1px #000,0 0 2px #000,0 0 4px rgba(0,0,0,.9),0 0 12px rgba(0,0,0,.75),0 0 24px rgba(0,0,0,.5);opacity:0;transition:opacity .6s";
    cap.innerHTML = "ミツバチの目の色<br><span style=\"font-size:12.5px;font-weight:400\">紫外・青・緑の三色。紫外は近い色に置きかえた模式</span>";
    document.body.appendChild(cap);
    var e = 0, lt = performance.now(), IN = 900, HOLD = 2600, OUT = 1100, raf = 0, done = false;
    function set(k) {
      var s = [];
      for (var r = 0; r < 3; r++) { for (var c = 0; c < 3; c++) { var n = r * 3 + c; s.push((I[n] + (T[n] - I[n]) * k).toFixed(4)); } s.push(0, 0); }
      fm.setAttribute("values", s.join(" ") + " 0 0 0 1 0");
    }
    run = function (now) {
      if (done) return; done = true; cancelAnimationFrame(raf);
      cv.classList.remove("hj-on"); glow.forEach(function (el) { el.classList.remove("hj-glow"); }); css.remove(); svg.remove(); cap.style.opacity = "0"; setTimeout(function () { cap.remove(); }, 700);
    };
    cv.classList.add("hj-on");
    // 画面の中の「ミツバチ」の札を、寄せているあいだ淡く光らせる（何が起きたかの合図）
    var glow = [];
    Array.prototype.some.call(document.querySelectorAll("button,[role=button]"), function (el) {
      var r = el.getBoundingClientRect();
      if (r.width > 0 && r.width < 160 && r.height < 120 && /^[^ぁ-んァ-ヶ一-龠]*ミツバチ\s*$/.test(el.textContent || "")) { glow.push(el.closest("button,[role=button],a") || el); return true; }
    });
    css.textContent += ".hj-glow{box-shadow:0 0 0 2px rgba(191,227,240,.9),0 0 18px rgba(191,227,240,.7)!important;transition:box-shadow .5s}";
    glow.forEach(function (el) { el.classList.add("hj-glow"); });
    function step(t) {
      if (done) return;
      e += Math.min(50, Math.max(0, t - lt)); lt = t; var k;   // 重いコマが続いても一瞬で終わらないよう、一コマで進む時間に上限

      if (e < IN) k = e / IN; else if (e < IN + HOLD) k = 1; else if (e < IN + HOLD + OUT) k = 1 - (e - IN - HOLD) / OUT; else { run(); return; }
      k = k * k * (3 - 2 * k); set(k);
      if (e > IN * .5 && e < IN + HOLD) cap.style.opacity = "1"; else if (e >= IN + HOLD) cap.style.opacity = "0";
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }
  function arm() { setTimeout(function () { requestAnimationFrame(begin); }, delay); }
  if (document.readyState !== "loading") arm(); else addEventListener("DOMContentLoaded", arm, { once: true });
})();
