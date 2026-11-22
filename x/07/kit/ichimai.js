// 持ち帰りの一枚（共通部品・2026-11-11／11-12 道のりと層をまとめる一枚に）
// 押したときだけ、いまの画面（3D の絵）に「歩いた道のりの形」と「受けとった層」を添えた一枚の画像を手元に保存する。
// 道のりは画面の中で押した・動かした所の形だけ（緯度経度・GPS は使わない）。記録はこのページを開いている間のメモリの中だけで、保存しない・どこにも送らない。
// 使い方：<script src="kit/ichimai.js" data-name="Qualia/time" data-bottom="128" data-right="12" defer></script>
//   data-left を書くと左に寄せる。data-top を書くと上から測る。
//   data-wide-bottom（と data-wide-right）を書くと、幅 768px 以上（PC）のときだけその位置にする。
// 作品からの知らせ（どれも任意）：
//   window.mitsuIchimai.step(x, y)   … 0〜1 の画面の中の座標で、道のりに一点を足す（地図の上の自分の位置を画面の形で渡すときなど）
//   window.mitsuIchimai.layer("紫外") … 受けとった層の名前を足す（同じ名前は一度だけ）
//   document.dispatchEvent(new CustomEvent("mitsu:layer", {detail:{name:"紫外"}})) でも同じ
// 描画の負担：押す・動かすときに点を間引いて覚えるだけ。写すのは押したときの一度だけ。
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
    "@media (prefers-reduced-motion:reduce){.icm,.icm-t{transition:none}}@media print{.icm{display:none}}" +
    (d.wideBottom != null || d.wideRight != null ? "@media (min-width:768px){.icm{" + (d.wideRight != null ? "left:auto;right:calc(" + px(d.wideRight, 12) + "px + env(safe-area-inset-right));" : "") + (d.wideBottom != null ? "top:auto;bottom:calc(" + px(d.wideBottom, 128) + "px + env(safe-area-inset-bottom));" : "") + "}}" : "");
  var b = document.createElement("button"); b.type = "button"; b.className = "icm";
  b.setAttribute("aria-label", "歩いた道のりと受けとった層を一枚の画像で保存"); b.title = "持ち帰りの一枚（道のりと層）";
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3.5" y="6.5" width="17" height="12" rx="2"/><circle cx="12" cy="12.5" r="3.4"/><path d="M8.5 6.5l1.3-2h4.4l1.3 2"/></svg>';

  // ── 道のり（画面の中の形だけ）と層。メモリの中だけ ──
  var path = [], layers = [], MAXP = 600, last = null, t0 = Date.now();
  function addPt(x, y) {
    if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return;
    if (last && Math.abs(last[0] - x) + Math.abs(last[1] - y) < 0.012) return;
    last = [x, y]; path.push(last);
    if (path.length > MAXP) { var k = []; for (var i = 0; i < path.length; i += 2) k.push(path[i]); path = k; }
  }
  function addLayer(s) {
    s = String(s || "").trim().slice(0, 24); if (!s) return;
    if (layers.indexOf(s) < 0) { layers.push(s); if (layers.length > 60) layers.splice(1, 1); }   // 最初の一つは残す
  }
  var down = false;
  addEventListener("pointerdown", function (e) { if (b.contains(e.target)) return; down = true; addPt(e.clientX / innerWidth, e.clientY / innerHeight); }, { passive: true, capture: true });
  addEventListener("pointermove", function (e) { if (down) addPt(e.clientX / innerWidth, e.clientY / innerHeight); }, { passive: true, capture: true });
  addEventListener("pointerup", function () { down = false; }, { passive: true, capture: true });
  addEventListener("pointercancel", function () { down = false; }, { passive: true, capture: true });
  // 札・ボタンに書かれた層の名前を拾う（押したものの短い字だけ）
  addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("[data-layer],[aria-pressed]");
    if (!el || b.contains(el)) return;
    var s = el.getAttribute("data-layer") || el.getAttribute("aria-label") || el.textContent || "";
    s = s.replace(/\s+/g, " ").trim();
    if (s && s.length <= 14 && !/保存|閉じ|戻る|もどる|音|一枚|設定|メニュー|ヘルプ|×|✕/.test(s)) addLayer(s);
  }, { passive: true, capture: true });
  document.addEventListener("mitsu:layer", function (e) { addLayer(e.detail && e.detail.name); });
  window.mitsuIchimai = { step: addPt, layer: addLayer };

  var busy = false, pending = null;
  // 作品の rAF の後ろに一度だけ写す処理をつなぐ（ふだんは何もしない）
  var raf0 = window.requestAnimationFrame;
  // 押したあとだけ、WebGL の描く命令を見張り、作品がそのコマで実際に描いた直後に写す（間引いて描く作品でも空の絵を写さない）
  var drew = false, hooks = [], made = new WeakMap();
  // これから作られる WebGL の context を覚えておく（作り方は変えない）
  try { var gc0 = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t) { var x = gc0.apply(this, arguments); if (x && /webgl/.test(t)) made.set(this, x); return x; }; } catch (e) {}
  function hookGL() {
    Array.prototype.forEach.call(document.querySelectorAll("canvas"), function (cv) {
      // 新しく context を作らないよう、記録した context を使う。記録のないものは、すでに画面に大きく出ている canvas だけ問い合わせる（2D なら null が返るだけ）
      var gl = made.get(cv) || null;
      if (!gl) { var q = cv.getBoundingClientRect(); if (q.width < 40 || q.height < 40 || !cv.width) return; try { gl = cv.getContext("webgl2") || cv.getContext("webgl"); } catch (e) {} }
      if (gl && !(gl.drawArrays)) gl = null;
      if (!gl || gl.__icm) return; gl.__icm = 1;
      ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "drawRangeElements"].forEach(function (k) {
        var o = gl[k]; if (typeof o !== "function") return;
        gl[k] = function () { drew = true; return o.apply(this, arguments); }; hooks.push([gl, k, o]);
      });
    });
  }
  function unhookGL() { hooks.forEach(function (h) { h[0][h[1]] = h[2]; delete h[0].__icm; }); hooks = []; }
  if (raf0) window.requestAnimationFrame = function (cb) { return raf0.call(window, function (t) { drew = false; try { cb(t); } finally { if (pending && drew) { var f = pending; f(); } } }); };
  function toast(s) {
    var t = document.createElement("div"); t.className = "icm-t"; t.textContent = s; document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("on"); });
    setTimeout(function () { t.classList.remove("on"); setTimeout(function () { t.remove(); }, 500); }, 1600);
  }
  function shot(W, H, r) {
    var c = document.createElement("canvas"); c.width = Math.round(W * r); c.height = Math.round(H * r);
    var g = c.getContext("2d"), n = 0;
    Array.prototype.forEach.call(document.querySelectorAll("canvas"), function (cv) {
      if (cv === c || !cv.width || !cv.height) return;
      var q = cv.getBoundingClientRect(); if (q.width < 40 || q.height < 40 || q.bottom <= 0 || q.right <= 0 || q.left >= W || q.top >= H) return;
      var cs = getComputedStyle(cv); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return;
      try { g.globalAlpha = +cs.opacity || 1; g.drawImage(cv, q.left * r, q.top * r, q.width * r, q.height * r); n++; } catch (e) {}
    });
    return n ? c : null;
  }
  function grab() {
    var W = innerWidth, H = innerHeight, sc = shot(W, H, Math.min(devicePixelRatio || 1, 2));
    if (!sc) return null;
    // 一枚の形：縦 4:5（1080×1350）。上に画面、下に道のりと層。
    var CW = 1080, CH = 1350, IH = 900, c = document.createElement("canvas"); c.width = CW; c.height = CH;
    var g = c.getContext("2d");
    g.fillStyle = "#0d1418"; g.fillRect(0, 0, CW, CH);
    var s = Math.max(CW / sc.width, IH / sc.height), dw = sc.width * s, dh = sc.height * s;
    g.save(); g.beginPath(); g.rect(0, 0, CW, IH); g.clip();
    g.drawImage(sc, (CW - dw) / 2, (IH - dh) / 2, dw, dh);
    var gr = g.createLinearGradient(0, IH - 160, 0, IH); gr.addColorStop(0, "rgba(13,20,24,0)"); gr.addColorStop(1, "rgba(13,20,24,1)");
    g.fillStyle = gr; g.fillRect(0, IH - 160, CW, 160);
    var serif = "'Shippori Mincho','Hiragino Mincho ProN','Yu Mincho',serif";
    // 道のり：写した画面の上にも重ね、下の枠にも形だけを描く
    var P = path.slice(); if (last && P.length === 0) P.push(last);
    function line(ox, oy, w, h, a, lw) {
      if (P.length < 2) return;
      g.save(); g.lineJoin = g.lineCap = "round"; g.strokeStyle = "rgba(191,227,240," + a + ")"; g.lineWidth = lw;
      g.shadowColor = "rgba(191,227,240,.5)"; g.shadowBlur = lw * 2; g.beginPath();
      P.forEach(function (p, i) { var x = ox + p[0] * w, y = oy + p[1] * h; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke(); g.restore();
      var e = P[P.length - 1]; g.fillStyle = "rgba(238,243,246," + a + ")"; g.beginPath(); g.arc(ox + e[0] * w, oy + e[1] * h, lw * 1.6, 0, 7); g.fill();
    }
    g.restore();
    var asp = H / W, bx = 64, by = IH + 30, bh = 290, bw = Math.max(170, Math.min(400, bh / asp));
    if (P.length < 2) bw = -64;   // 道のりがないときは枠ごと出さず、層を左から
    if (P.length >= 2) {
      g.strokeStyle = "rgba(190,220,235,.22)"; g.lineWidth = 1; g.strokeRect(bx, by, bw, bh);
      var Q = P, R = P.map(function (p) { return [p[0] * W, p[1] * H]; }), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      R.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
      var sw = Math.max(x1 - x0, 20), sh = Math.max(y1 - y0, 20), k = Math.min((bw - 40) / sw, (bh - 40) / sh);
      P = R.map(function (p) { return [((p[0] - x0) * k + (bw - sw * k) / 2) / bw, ((p[1] - y0) * k + (bh - sh * k) / 2) / bh]; });
      line(bx, by, bw, bh, 0.95, 2.5); P = Q;
      g.textBaseline = "alphabetic"; g.fillStyle = "rgba(238,243,246,.55)"; g.font = "20px " + serif;
      g.fillText("道のり（画面の中の形）", bx, by + bh + 32);
    }
    g.textBaseline = "alphabetic";
    // 層
    var lx = bx + bw + 64, ly = by + 8;
    g.fillStyle = "rgba(238,243,246,.55)"; g.font = "20px " + serif; g.fillText("受けとった層", lx, ly + 20);
    g.font = "28px " + serif; ly += 64;
    var L = layers.length ? layers : ["いまの景色"];
    if (L.length > 6) L = [L[0], "…"].concat(L.slice(-4));   // 上限を超えたら最初と最後を残し、間を省く
    L.forEach(function (s) {
      if (s !== "…") { g.fillStyle = "rgba(191,227,240,.9)"; g.beginPath(); g.arc(lx + 8, ly - 10, 5, 0, 7); g.fill(); }
      g.fillStyle = "rgba(238,243,246,.92)"; g.fillText(s, lx + 28, ly); ly += 44;
    });
    var mins = Math.max(1, Math.round((Date.now() - t0) / 60000));
    g.fillStyle = "rgba(238,243,246,.55)"; g.font = "20px " + serif; g.fillText(mins + " 分", lx, ly + 6);
    // 名前
    g.fillStyle = "rgba(238,243,246,.86)"; g.font = "26px " + serif; g.textBaseline = "bottom";
    g.textAlign = "right"; g.fillText(name + " ── mitsulab", CW - 64, CH - 36); g.textAlign = "left";
    return c;
  }
  function save(c) {
    try { c.toBlob(function (blob) {
      busy = false;
      if (!blob) { toast("保存できませんでした"); return; }
      var fn = "mitsulab_" + name.replace(/[^\w぀-ヿ一-鿿-]+/g, "-").replace(/^-|-$/g, "") + ".png";
      var file = null; try { file = new File([blob], fn, { type: "image/png" }); } catch (e) {}
      var coarse = matchMedia && matchMedia("(pointer:coarse)").matches;
      if (coarse && file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file] }).catch(function () {}); return; }
      var u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = fn; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      toast("一枚を保存しました");
    }, "image/png"); } catch (e) { busy = false; toast("保存できませんでした"); }
  }
  b.addEventListener("click", function (e) {
    e.stopPropagation(); if (busy) return; busy = true; toast("保存しています");
    // 作品の描画の直後に写す：作品の rAF の処理が終わった直後に一度だけ写す（WebGL の絵が消される前）。描かない作品のために 250ms で写す控えもある
    var fired = false;
    function shotNow() {
      if (fired) return; fired = true; pending = null; unhookGL();
      var c = null; try { c = grab(); } catch (er) {}
      if (!c) { busy = false; toast("いまは写せる絵がありません"); return; }
      save(c);
    }
    hookGL(); pending = shotNow;
    // 描かない作品（2D だけ・止まっている）のための控え：0.6 秒たっても描かれなければ、そのまま写す
    setTimeout(function () { if (pending === shotNow) shotNow(); }, 600);
  });
  ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"].forEach(function (t) { b.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
  function mount() { document.head.appendChild(st); document.body.appendChild(b); }
  if (document.body) mount(); else addEventListener("DOMContentLoaded", mount);
})();
