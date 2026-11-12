// 置いた層・ふたりで歩く（Qualium 大宮・2026-11-12）
// ① 置いた層：押したときだけ、いまの地点の札・受けとり方の種類・1 時間に丸めた時刻を、この端末の中（localStorage）に置く。
//    30 日で消え、一地点 20 件まで、1 時間に 5 件まで。外へは何も送らない。自分の層は消せる。
// ② ふたりで歩く：二台の端末を QR で直接つなぐ（WebRTC。STUN・TURN・中継のサーバーは使わない＝同じ Wi-Fi かテザリングでつながる）。
//    送るのは受けとり方の種類と向き（8 方位）だけ。位置・会話・映像は送らない。カメラは QR を読むあいだだけ使う。
// QR の部品：qrcode-generator 1.4.4（MIT・Kazuhiko Arase）・jsQR 1.4.0（Apache-2.0）＝kit/vendor/。
(function () {
  "use strict";
  var me = document.currentScript, base = me ? me.src.replace(/[^/]*$/, "") : "kit/";
  var KEY = "qualium-omiya-layers-v1", MINE = "qualium-omiya-mine-v1", DAY = 864e5, HOUR = 36e5;
  var QW = function () { return window.__qw || {}; };
  var $ = function (s) { return document.querySelector(s); };
  var load = function (k) { try { var v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : []; } catch (_) { return []; } };
  var save = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  var rid = function () { var a = new Uint8Array(8); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join(""); };
  var hourT = function () { var d = new Date(); d.setMinutes(0, 0, 0); return d.toISOString(); };

  var has = function (o, k) { return typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k); };
  // 受けとり方の種類（決めた型だけ）
  function eyes() { var L = (QW().ikimono && QW().ikimono.list) || {}, o = { hito: "人" }; for (var k in L) o[k] = L[k].name; return o; }
  function eyeNow() { var s = QW().ikimono && QW().ikimono.state; return (s && s.id) || "hito"; }
  var COL = { hito: "255,214,170", hachi: "190,150,255", chou: "230,150,255", tori: "150,190,255", suzume: "170,205,240", tanuki: "200,170,130" };
  var col = function (e) { return COL[e] || "170,220,230"; };

  // 地点の札：いちばん近い印（40 m 以内）。座標は持たない・残さない
  function spotNow() {
    var q = QW(), sp = q.START && q.START.sp, c = q.camera; if (!sp || !c || !sp.pins) return null;
    var x = c.position.x, z = c.position.z, best = null, bd = 40;
    sp.pins.forEach(function (p) { var it = p.it; if (!it || it.kind === "here" || !it.name) return; var d = Math.hypot(it.x - x, it.z - z); if (d < bd) { bd = d; best = it.name; } });
    return best;
  }
  function heading8() { var c = QW().camera; if (!c || !c.matrixWorld) return 0; var e = c.matrixWorld.elements, a = Math.atan2(-e[8], e[10]); return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }
  var DIR = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];

  function layers() {
    var lim = Date.now() - 30 * DAY, E = eyes(), by = {}, out = [];
    load(KEY).forEach(function (l) { if (l && typeof l.s === "string" && has(E, l.e) && Date.parse(l.t) > lim) (by[l.s] = by[l.s] || []).push(l); });
    for (var s in by) out = out.concat(by[s].slice(-20));
    return out;
  }
  var purge = setInterval(function () { if (QW().ikimono && QW().ikimono.list) { clearInterval(purge); save(KEY, layers()); } }, 1000);   // 生き物の一覧がそろってから、起動のたびに、30 日を過ぎた層と 20 件を超えた分を端末から消す
  function put() {
    var s = spotNow(); if (!s) return say("印の近くで置けます。");
    var h = hourT(), lim = Date.now() - 30 * DAY, mine = load(MINE).filter(function (m) { return m && Date.parse(m.t) > lim; });
    if (mine.filter(function (m) { return m.t === h; }).length >= 5) return say("置けるのは 1 時間に 5 つまで。");
    var id = rid(), all = layers(); all.push({ id: id, s: s, e: eyeNow(), t: h });
    save(KEY, all); mine.push({ id: id, t: h }); save(MINE, mine); last = ""; paint(true);
    say(s + "に、" + eyes()[eyeNow()] + "の目の層を置きました。");
  }
  function clearMine() {
    var ids = {}; load(MINE).forEach(function (m) { ids[m.id] = 1; });
    var n = 0, keep = layers().filter(function (l) { if (ids[l.id]) { n++; return false; } return true; });
    save(KEY, keep); save(MINE, []); last = ""; paint(true); say(n ? "置いた層を消しました。" : "消す層はありません。");
  }

  // 見た目
  var css = document.createElement("style");
  css.textContent =
    "#qfBtn{position:fixed;left:12px;bottom:calc(320px + env(safe-area-inset-bottom));z-index:58;width:44px;height:44px;border-radius:22px;border:1px solid rgba(220,240,245,.35);background:rgba(8,16,22,.55);color:#e9f6f8;font:400 12px/1 'Shippori Mincho','Hiragino Mincho ProN',serif;letter-spacing:.04em;display:none;align-items:center;justify-content:center;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);cursor:pointer}" +
    "body[data-mode=walk] #qfBtn{display:flex}#qfBtn.peer{box-shadow:0 0 0 2px rgba(var(--pc),.8)}" +
    "#qfSheet{position:fixed;left:12px;bottom:calc(372px + env(safe-area-inset-bottom));z-index:41;width:min(300px,calc(100vw - 24px));max-height:calc(100vh - 400px);overflow:auto;padding:12px;border-radius:14px;background:rgba(8,16,22,.86);color:#e9f6f8;border:1px solid rgba(220,240,245,.18);font:400 13px/1.6 'Shippori Mincho','Hiragino Mincho ProN',serif;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}" +
    "#qfSheet.big{top:50%;left:50%;bottom:auto;transform:translate(-50%,-50%);width:min(380px,calc(100vw - 16px));max-height:calc(100vh - 32px);z-index:60}#qfSheet[hidden]{display:none}#qfSheet .r{display:flex;gap:8px;flex-wrap:wrap}#qfSheet button{min-height:44px;flex:1 1 120px;padding:0 10px;border-radius:22px;border:1px solid rgba(220,240,245,.3);background:rgba(30,60,68,.6);color:inherit;font:inherit;cursor:pointer}" +
    "#qfSheet .hd{display:flex;justify-content:space-between;align-items:center;margin:-4px 0 6px 2px;font-size:12px;opacity:.85}#qfSheet .hd .x{flex:0 0 44px;min-height:44px;padding:0;border:0;background:transparent;font-size:20px}#qfSheet .sub{font-size:12px;opacity:.75;margin:8px 2px 4px}#qfSheet details{margin-top:8px;font-size:12px;opacity:.85}#qfSheet summary{min-height:44px;display:flex;align-items:center;cursor:pointer;list-style:none}#qfSheet summary::-webkit-details-marker{display:none}" +
    "#qfQR{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:8px}#qfQR button{flex:0 0 auto!important}#qfSheet.big #qfPair{display:none}#qfQR canvas,#qfQR video{width:min(340px,100%);aspect-ratio:1;border-radius:8px;background:#fff;object-fit:cover}#qfQR video{background:#000}" +
    "#qfHaze{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 1.2s}#qfHaze.on{opacity:1}" +
    "#qfPeer{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .8s}#qfPeer.on{opacity:1}" +
    "body:not([data-mode=walk]) #qfHaze,body:not([data-mode=walk]) #qfPeer{display:none}";
  document.head.appendChild(css);
  var btn = document.createElement("button"); btn.id = "qfBtn"; btn.type = "button"; btn.textContent = "重ね"; btn.setAttribute("aria-label", "層を置く・ふたりで歩く");
  var sh = document.createElement("div"); sh.id = "qfSheet"; sh.hidden = true;
  sh.innerHTML =
    '<div class="hd"><span>重ねる</span><button type="button" data-a="close" class="x" aria-label="閉じる">×</button></div><div class="r"><button type="button" data-a="put">この場に層を置く</button><button type="button" data-a="clr">自分の層を消す</button></div>' +
    '<div class="sub">ふたりで歩く（二台の QR を互いに読む）</div>' +
    '<div class="r" id="qfPair"><button type="button" data-a="show">QR を出す</button><button type="button" data-a="scan">QR を読む</button></div>' +
    '<div id="qfMsg" class="sub" aria-live="polite"></div><div id="qfQR"></div>' +
    '<details><summary>＋ 残すもの・残さないもの</summary>残すのは、この端末の中に、置いた地点の札・受けとり方の種類・時刻（1 時間単位）だけ。30 日で消えます。外へは送りません。<br>ふたりで歩くときは、受けとり方の種類と向きだけを相手の端末へ直接送ります。位置・会話・映像は送らず、残しません。カメラは QR を読むあいだだけ使います。<br>同じ Wi-Fi か、どちらかのテザリングでつながります。</details>';
  var haze = document.createElement("div"); haze.id = "qfHaze";
  var pv = document.createElement("div"); pv.id = "qfPeer";
  document.body.append(haze, pv, btn, sh);
  ["pointerdown", "touchstart", "mousedown", "click", "wheel"].forEach(function (k) { [btn, sh].forEach(function (el) { el.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); }); });
  function toggle() { sh.hidden = !sh.hidden; if (sh.hidden) { stopCam(); if (!pc || pc.connectionState !== "connected") { $("#qfQR").innerHTML = ""; sh.classList.remove("big"); } } }
  btn.addEventListener("click", toggle);
  sh.addEventListener("click", function (e) { var b = e.target.closest("button[data-a]"); if (!b) return; var a = b.dataset.a; if (a === "close") toggle(); else if (a === "put") put(); else if (a === "clr") clearMine(); else if (a === "show") startOffer(); else if (a === "scan") scan(); else if (a === "scan2") scan(); else if (a === "end") hang(); });
  var msg = function (t) { $("#qfMsg").textContent = t || ""; };

  // 碧の字幕（下に小さく）。アプリの字幕が出ていないときだけ借りる
  var sayT = 0;
  function say(t) {
    if (!sh.hidden) msg(t);
    var c = $("#caption"), x = $("#capText"); if (!c || !x) return;
    if (!c.hidden && c.dataset.qf !== "1" && x.textContent) return;
    x.textContent = t; c.dataset.qf = "1"; c.hidden = false; clearTimeout(sayT);
    sayT = setTimeout(function () { if (c.dataset.qf === "1" && x.textContent === t) { c.hidden = true; c.dataset.qf = ""; } }, 4200);
  }

  // 置いた層を霞として重ねる（近くの印だけ）
  var last = "";
  function paint(force) {
    var s = spotNow(), key = s || "";
    if (!force && key === last) return; last = key;
    if (!s) { haze.classList.remove("on"); return; }
    var here = layers().filter(function (l) { return l.s === s; });
    if (!here.length) { haze.classList.remove("on"); return; }
    var g = here.slice(-6).map(function (l, i) { var a = Math.min(.16, .05 + here.length * .008); return "radial-gradient(ellipse 60% 22% at " + (20 + (i * 37) % 60) + "% " + (86 - (i % 3) * 5) + "%,rgba(" + col(l.e) + "," + a.toFixed(3) + "),transparent 70%)"; });
    haze.style.background = g.join(","); haze.classList.add("on");
    var cnt = {}; here.forEach(function (l) { cnt[l.e] = (cnt[l.e] || 0) + 1; });
    var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
    if (!force) say("ここには置かれた層が " + here.length + " つ。" + eyes()[top] + "の目が多い。");
  }
  setInterval(function () { if (document.body.dataset.mode === "walk") paint(false); }, 1000);

  // ── ふたりで歩く（WebRTC・サーバーなし）
  var pc = null, dc = null, peer = null, peerAt = 0, role = "", tmo = 0;
  function b64(u8) { var s = ""; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  async function pack(type, sdp) {
    var keep = sdp.split(/\r?\n/).filter(function (l) { return l && !/^a=(extmap-allow-mixed|msid-semantic|ice-options)/.test(l); }).join("\n");
    var txt = (type === "offer" ? "o" : "a") + keep;
    if (window.CompressionStream) { var st = new Blob([txt]).stream().pipeThrough(new CompressionStream("deflate-raw")); return "Q1" + b64(new Uint8Array(await new Response(st).arrayBuffer())); }
    return "Q0" + b64(new TextEncoder().encode(txt));
  }
  async function unpack(code) {
    var v = code.slice(0, 2), u = unb64(code.slice(2)), txt;
    if (v === "Q1") { var st = new Blob([u]).stream().pipeThrough(new DecompressionStream("deflate-raw")); txt = await new Response(st).text(); }
    else if (v === "Q0") txt = new TextDecoder().decode(u); else throw new Error("not ours");
    return { type: txt[0] === "o" ? "offer" : "answer", sdp: txt.slice(1).split("\n").join("\r\n") + "\r\n" };
  }
  function gathered(p) { return new Promise(function (res) { if (p.iceGatheringState === "complete") return res(); var t = setTimeout(res, 8000), q = 0, done = function () { clearTimeout(t); clearTimeout(q); res(); }; p.addEventListener("icecandidate", function (e) { if (!e.candidate) return done(); clearTimeout(q); q = setTimeout(done, 500); }); p.addEventListener("icegatheringstatechange", function () { if (p.iceGatheringState === "complete") done(); }); }); }
  function newPC() {
    hang(true); var p = pc = new RTCPeerConnection({ iceServers: [] });
    p.addEventListener("connectionstatechange", function () {
      if (p !== pc) return; var s = p.connectionState;
      if (s === "connected") { clearTimeout(tmo); $("#qfQR").innerHTML = ""; sh.classList.remove("big"); msg("つながりました。"); paired(true); say("となりの人の受けとり方が、視界の端に重なります。"); }
      else if (s === "failed") fail(); else if (s === "disconnected" || s === "closed") { paired(false); }
    });
    p.addEventListener("datachannel", function (e) { if (p === pc) wire(e.channel); });
    return p;
  }
  function fail() { clearTimeout(tmo); msg("つながりませんでした。お店や公共の Wi-Fi ではつながらないことがあります。どちらかのテザリングにつないで、もう一度。"); paired(false); }
  function wire(ch) {
    dc = ch; ch.onmessage = function (e) { try { var m = JSON.parse(e.data), E = eyes(); if (has(E, m.e) && m.h >= 0 && m.h < 8 && (m.h | 0) === m.h) { peer = { e: m.e, h: m.h }; peerAt = Date.now(); } } catch (_) {} };
    ch.onopen = function () { sendMe(); };
  }
  function sendMe() { if (dc && dc.readyState === "open") dc.send(JSON.stringify({ e: eyeNow(), h: heading8() })); }
  setInterval(sendMe, 1000);
  async function startOffer() {
    if (!window.RTCPeerConnection) return msg("この端末では、ふたりで歩けません。");
    role = "o"; msg("QR をつくっています…"); var p = newPC(); wire(p.createDataChannel("q", { ordered: false, maxRetransmits: 0 }));
    await p.setLocalDescription(await p.createOffer()); await gathered(p);
    if (!hasCand(p.localDescription.sdp)) await gathered(p);
    if (!hasCand(p.localDescription.sdp)) return fail();
    showQR(await pack("offer", p.localDescription.sdp), "相手にこの QR を読んでもらい、出てきた QR を読みます。", true);
  }
  function hasCand(sdp) { return /a=candidate:/.test(sdp); }
  async function accept(code) {
    var d; try { d = await unpack(code); } catch (_) { return msg("Qualium の QR ではありません。"); }
    try {
      if (d.type === "offer") {
        role = "a"; var p = newPC(); await p.setRemoteDescription(d); await p.setLocalDescription(await p.createAnswer()); await gathered(p); if (!hasCand(p.localDescription.sdp)) await gathered(p);
        showQR(await pack("answer", p.localDescription.sdp), "この QR を相手に読んでもらいます。", false);
      } else {
        if (!pc || role !== "o" || pc.signalingState !== "have-local-offer") return msg("先に「QR を出す」を押してください。");
        await pc.setRemoteDescription(d); msg("つないでいます…");
      }
      if (d.type === "answer") { clearTimeout(tmo); tmo = setTimeout(function () { if (!pc || pc.connectionState !== "connected") fail(); }, 20000); }
    } catch (e) { fail(); }
  }
  async function showQR(code, line, needScan) {
    try { await lib("vendor/qrcode.min.js", "qrcode"); } catch (_) { return msg("QR をつくる部品を読み込めませんでした。"); }
    var box = $("#qfQR"); box.innerHTML = "";
    try {
      var q = window.qrcode(0, "L"); q.addData(code, "Byte"); q.make();
      var n = q.getModuleCount(), m = 4, s = Math.max(2, Math.floor(480 / (n + m * 2))), cv = document.createElement("canvas"), x = cv.getContext("2d");
      cv.width = cv.height = (n + m * 2) * s; x.fillStyle = "#fff"; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = "#000";
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect((c + m) * s, (r + m) * s, s, s);
      cv.setAttribute("aria-label", "つなぐための QR"); box.appendChild(cv);
    } catch (_) { return msg("QR をつくれませんでした。"); }
    box.dataset.code = code; sh.classList.add("big");
    if (needScan) { var b = document.createElement("button"); b.type = "button"; b.dataset.a = "scan2"; b.textContent = "相手の QR を読む"; b.style.width = "100%"; box.appendChild(b); }
    msg(line);
  }
  function lib(src, name) { return window[name] ? Promise.resolve() : new Promise(function (res, rej) { var s = document.createElement("script"); s.src = base + src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  var cam = null, camT = 0;
  function stopCam() { clearInterval(camT); if (cam) { cam.getTracks().forEach(function (t) { t.stop(); }); cam = null; } var v = $("#qfQR video"); if (v) v.remove(); }
  async function scan() {
    stopCam();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return msg("この端末ではカメラが使えません。");
    try { cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }); } catch (_) { return msg("カメラが使えません。設定でカメラを許可してください。"); }
    var box = $("#qfQR"); box.innerHTML = ""; var v = document.createElement("video"); v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.srcObject = cam; box.appendChild(v); v.play().catch(function () {}); sh.classList.add("big");
    msg("相手の QR を、枠に入れてください。");
    var det = null; try { if ("BarcodeDetector" in window) det = new window.BarcodeDetector({ formats: ["qr_code"] }); } catch (_) {}
    if (!det) { try { await lib("vendor/jsqr.min.js", "jsQR"); } catch (_) { stopCam(); return msg("QR を読む部品を読み込めませんでした。"); } }
    var cv = document.createElement("canvas"), x = cv.getContext("2d", { willReadFrequently: true }), busy = false;
    camT = setInterval(async function () {
      if (busy || !v.videoWidth) return; busy = true;
      try {
        var code = null;
        if (det) { var r = await det.detect(v); code = r[0] && r[0].rawValue; }
        else { var w = 360, h = Math.round(360 * v.videoHeight / v.videoWidth); cv.width = w; cv.height = h; x.drawImage(v, 0, 0, w, h); var d = window.jsQR(x.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" }); code = d && d.data; }
        if (code && /^Q[01]/.test(code)) { stopCam(); box.innerHTML = ""; await accept(code); }
      } catch (_) {}
      busy = false;
    }, 250);
  }
  function hang(quiet) { clearTimeout(tmo); try { dc && dc.close(); } catch (_) {} try { pc && pc.close(); } catch (_) {} dc = pc = null; peer = null; paired(false); sh.classList.remove("big"); if (!quiet) { $("#qfQR").innerHTML = ""; msg("ふたり歩きを終えました。"); } }
  function paired(on) {
    var r = $("#qfPair");
    r.innerHTML = on ? '<button type="button" data-a="end">ふたり歩きを終える</button>' : '<button type="button" data-a="show">QR を出す</button><button type="button" data-a="scan">QR を読む</button>';
    if (!on) { pv.classList.remove("on"); btn.classList.remove("peer"); }
  }
  // 相手の受けとり方を、視界の両端から薄く重ねる（3 秒途絶えたら消える）
  var lastPeer = "";
  setInterval(function () {
    var live = peer && Date.now() - peerAt < 3000;
    if (!live) { pv.classList.remove("on"); btn.classList.remove("peer"); lastPeer = ""; return; }
    var c = col(peer.e);
    if (peer.e !== lastPeer) pv.style.background = "linear-gradient(90deg,rgba(" + c + ",.16),transparent 16%,transparent 84%,rgba(" + c + ",.16))";
    pv.classList.add("on"); btn.classList.add("peer"); btn.style.setProperty("--pc", c);
    if (peer.e !== lastPeer) { lastPeer = peer.e; say("となりの人は" + eyes()[peer.e] + "の目で、" + DIR[peer.h] + "を見ている。"); }
  }, 500);
  addEventListener("pagehide", function () { stopCam(); hang(true); });

  // 試験用の口（画面の操作と同じ流れを、カメラなしで渡す）
  window.mitsuFutari = { accept: accept, code: function () { return $("#qfQR").dataset.code || ""; }, state: function () { return pc ? pc.connectionState : "none"; }, peer: function () { return peer; }, layers: layers, put: put, clear: clearMine, offer: startOffer };
})();
