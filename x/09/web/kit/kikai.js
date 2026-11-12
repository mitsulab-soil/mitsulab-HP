/* © mitsulab. 2026-11-12 ほかの受けとり方を三つ足す（Qualium 大宮）。右の生き物の目の列（#qIK）に二つだけ足し、三つめは既にある「鳥の声を聞く」に重ねる。
   ・マムシ＝手のひらの温度：頬のピット器官（赤外線を熱として受けとる器官）の模式。景色を熱の色にし、端末の傾きと揺れで手のぬくもりの色が動く。カメラは使わない。温度は測っていない。
     出典：Bullock TH & Diecke FPJ (1956) J. Physiol. 134:47–87／Gracheva EO et al. (2010) Nature 464:1006–1011
   ・機械＝押すたびに 点群（LiDAR）→ 赤外線カメラ → 等高線（GIS）→ 人の目。機械は「受けとり方」と呼ぶ（Qualia と言わない）。センサーは置いていない＝すべて模式。
     等高線は、描いている地面の高さ（国土地理院 基盤地図情報 数値標高モデル 5 m〔DEM5A〕を mitsulab が加工）から 20 cm ごと（太い線は 1 m）。
   ・鳥の声で地図：既にある Perch の聞き分け（kit/birdear）が 0.6 以上で聞き分けたとき、聞いたときに向いていた方の木の高さに小さな光の印を置く（マイク一つでは向きは測れない）。
     音は birdear の中で捨てられ、ここでは種の名と似ている度合いしか見ない。印は 2 分で消え、何も残さない。
   軽さ：色は canvas の CSS フィルタ一つ。点と線は 2D の重ね板に、近く（60 m）だけ。 */
import * as THREE from "three";

const SRC_PIT = "マムシの頬のピット器官＝赤外線を熱として受ける：Bullock & Diecke (1956) J. Physiol. 134:47–87／Gracheva et al. (2010) Nature 464:1006–1011";
const MODES = {
  pit: { say: ["マムシの頬のくぼみ、ピット器官は、赤外線を熱として感じる。その模式で、景色を熱の色に。色の明るさから作った絵で、測った温度ではないよ。", "端末を傾けたり揺らしたりすると、手のぬくもりの色が動くよ。"] },
  lidar: { n: "点群", say: ["機械の受けとり方。LiDAR の点群の模式。光が返るまでの時間で、距離を点にする。ここにセンサーは置いていないよ。"] },
  ir: { n: "赤外線", say: ["赤外線カメラの模式。白いほど温かいと見なす描き方。色の明るさから作った絵で、測ってはいないよ。"] },
  gis: { n: "等高線", say: ["地図の受けとり方。地形の高さの記録から、20 センチごとの等高線。5 メートルの格子のあいだを補って引いた線だよ。太い線は 1 メートルごと。"] },
};
const CYCLE = [null, "lidar", "ir", "gis"];   // 11-13：機械のどの受けとり方でも、すぐ下に出る「人の目」を一度押せば戻る（マムシ・生き物の目を押しても戻る）

export function attachKikai(QW, opt = {}) {
  const speak = opt.speak || (l => QW.speak?.(l)), cam = QW.camera, gl = document.getElementById("gl") || QW.renderer?.domElement;
  const gY = (x, z) => QW.groundAt ? QW.groundAt(x, z) : 0;
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
  // 熱の値＝赤と緑を足し、青（空・影）を引いた模式。マムシは暖色の帯、赤外線カメラは白が温かい灰色
  const heat = '<feColorMatrix type="matrix" values=".62 .55 -.62 0 .16  .62 .55 -.62 0 .16  .62 .55 -.62 0 .16  0 0 0 1 0"/>';
  svg.innerHTML = `<filter id="kkPit" color-interpolation-filters="sRGB">${heat}<feComponentTransfer><feFuncR type="table" tableValues="0 .08 .45 .85 1 1"/><feFuncG type="table" tableValues="0 0 .04 .3 .7 .97"/><feFuncB type="table" tableValues=".12 .32 .5 .18 .08 .75"/></feComponentTransfer></filter>
<filter id="kkIR" color-interpolation-filters="sRGB">${heat}<feComponentTransfer><feFuncR type="gamma" amplitude="1.15" exponent="1.4" offset="0"/><feFuncG type="gamma" amplitude="1.15" exponent="1.4" offset="0"/><feFuncB type="gamma" amplitude="1.15" exponent="1.4" offset="0"/></feComponentTransfer></filter>`;
  document.body.appendChild(svg);
  const css = document.createElement("style"); css.id = "qualium-kikai";
  css.textContent = `#qIK button[hidden]{display:none!important}#qKK{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2}#qKK[hidden]{display:none}body:not([data-mode="walk"]) #qKK{display:none}`;
  document.head.appendChild(css);
  const cv = document.createElement("canvas"); cv.id = "qKK"; cv.hidden = true; cv.setAttribute("aria-hidden", "true");
  (gl?.parentNode || document.body).insertBefore(cv, gl?.nextSibling || null); const g2 = cv.getContext("2d");
  const ik = document.getElementById("qIK"), st = { m: null, filt: "" };
  const icon = { pit: '<path d="M4 15c2-4 5-5.6 8-5.6 2.4 0 4.2 1 5.4 2.6l2.6.4-2.4 1.4c-1 1.8-3 2.8-5.2 2.8"/><path d="M12.4 16.6c-1.6.6-3.2.4-4.4-.6M4 15c-.6 1.6 0 3 1.8 3.6"/><circle cx="15.8" cy="12" r=".55" class="f"/><path d="M13.6 13.6a1.1 1.1 0 0 0 1 .6" opacity=".7"/>',
    hito: '<path d="M3 12c2.4-3.9 5.5-5.9 9-5.9s6.6 2 9 5.9c-2.4 3.9-5.5 5.9-9 5.9S5.4 15.9 3 12z"/><circle cx="12" cy="12" r="2.7"/>',
    kikai: '<rect x="5" y="8" width="14" height="9" rx="2"/><circle cx="12" cy="12.5" r="2.6"/><circle cx="12" cy="12.5" r=".7" class="f"/><path d="M8.5 8l1-2h5l1 2"/>' };
  const mk = (k, n, lab) => { const b = document.createElement("button"); b.type = "button"; b.dataset.kk = k; b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", lab); b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon[k]}</svg><span>${n}</span>`; ik?.appendChild(b); return b; };
  const bPit = mk("pit", "マムシ", "マムシの熱の感じ方の模式（もう一度押すと人の目へ）"), bKi = mk("kikai", "機械", "機械の受けとり方：押すたびに点群・赤外線・等高線・人の目");
  const bHu = mk("hito", "人の目", "人の目にもどる"); bHu.hidden = true;
  function paintBtn() { bHu.hidden = !st.m; bPit.setAttribute("aria-pressed", String(st.m === "pit")); const on = st.m && st.m !== "pit"; bKi.setAttribute("aria-pressed", String(!!on)); bKi.querySelector("span").textContent = on ? MODES[st.m].n : "機械"; }
  function filterOf(m) { return m === "pit" ? "url(#kkPit)" : m === "ir" ? "url(#kkIR) contrast(1.1)" : m === "lidar" ? "grayscale(1) brightness(.22)" : m === "gis" ? "grayscale(.75) brightness(.6)" : ""; }
  async function motionOk() { try { if (typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) await DeviceMotionEvent.requestPermission(); } catch { } }
  async function set(m) {
    if (m && QW.ikimono?.state?.id) { try { await QW.S6?.pickIk?.(QW.ikimono.state.id); } catch { } }   // 生き物の目から入ったら、先に人の目へ（重ねない）
    st.m = m; st.filt = filterOf(m); if (gl) gl.style.filter = st.filt; cv.hidden = !m; geo.at = null; paintBtn(); navigator.vibrate?.(8);
    if (m) try { window.mitsuIchimai?.layer?.(m === "pit" ? "マムシの熱" : m ? MODES[m].n + "（機械の受けとり方）" : ""); } catch { }
    speak(m ? MODES[m].say.map(t => ({ t, tc: t, src: m === "pit" ? SRC_PIT : "" })) : [{ t: "人の目に、もどります。" }]);
  }
  bPit.addEventListener("click", async e => { e.stopPropagation(); if (st.m !== "pit") await motionOk(); set(st.m === "pit" ? null : "pit"); });
  bHu.addEventListener("click", e => { e.stopPropagation(); set(null); });
  bKi.addEventListener("click", e => { e.stopPropagation(); const i = CYCLE.indexOf(st.m); set(CYCLE[(Math.max(0, i) + 1) % CYCLE.length]); });
  ik?.addEventListener("click", e => { const b = e.target.closest("button[data-id]"); if (b && st.m) set(null); }, true);   // 生き物の目を押したら、こちらは外す

  /* 手のぬくもり：傾き（左右）で位置、揺れの強さで明るさ。PC はマウスの動きで代える */
  const hand = { x: .5, e: 0, raw: 0 };
  addEventListener("devicemotion", e => { const a = e.accelerationIncludingGravity, b = e.acceleration; if (a && a.x != null) hand.x = Math.min(.9, Math.max(.1, .5 - a.x / 18)); if (b && b.x != null) hand.raw = Math.max(hand.raw, Math.hypot(b.x, b.y || 0, b.z || 0)); }, { passive: true });
  addEventListener("pointermove", e => { if (e.pointerType !== "mouse") return; hand.x = e.clientX / innerWidth; hand.raw = Math.max(hand.raw, Math.hypot(e.movementX || 0, e.movementY || 0) / 6); }, { passive: true });

  /* 点群と等高線：45 m 以内を、8 m 動いたら作り直す */
  const geo = { at: null, pts: null, seg: null };
  function buildPts(cx, cz) { const R = 60, P = [], rnd = mulberry(Math.round(cx * 7 + cz * 13));
    const N = innerWidth < 641 ? 1600 : 3200; for (let i = 0; i < N; i++) { const r = R * Math.sqrt(rnd()), a = rnd() * 6.283, x = cx + r * Math.cos(a), z = cz + r * Math.sin(a); P.push(x, gY(x, z) + .03, z, 0); }
    const SPH = { keyaki: 19, enoki: 15, shii: 13, kashi: 12, kusu: 17, sugi: 22, sakura: 9, hinoki: 16 };
    for (const t of window.__TREE?.list || []) { const d = Math.hypot(t.x - cx, t.z - cz); if (d > R) continue; const H = (SPH[t.sp] || 14) * (t.s || 1), y0 = gY(t.x, t.z);
      for (let k = 0; k < 14; k++) { const a = rnd() * 6.283; P.push(t.x + .35 * Math.cos(a), y0 + rnd() * H * .45, t.z + .35 * Math.sin(a), 1); }
      for (let k = 0; k < 30; k++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, q = Math.sqrt(1 - u * u), rr = H * .28 * (.75 + .25 * rnd()); P.push(t.x + rr * q * Math.cos(a), y0 + H * .68 + rr * .7 * u, t.z + rr * q * Math.sin(a), 2); } }
    return new Float32Array(P); }
  function buildSeg(cx, cz) { const n = 71, s = 2, o = -(n - 1) * s / 2, h = new Float32Array(n * n), S = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = gY(cx + o + i * s, cz + o + j * s);
    let lo = Infinity, hi = -Infinity; for (const v of h) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (let k = Math.ceil(lo / .2); k * .2 <= hi; k++) { const L = k * .2, bold = k % 5 === 0 ? 1 : 0;
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const c = [h[j * n + i], h[j * n + i + 1], h[(j + 1) * n + i + 1], h[(j + 1) * n + i]], X = [0, 1, 1, 0], Z = [0, 0, 1, 1], e = [];
        for (let k = 0; k < 4; k++) { const a = c[k], b = c[(k + 1) % 4]; if ((a < L) !== (b < L)) { const t = (L - a) / (b - a), k2 = (k + 1) % 4; e.push(cx + o + (i + X[k] + (X[k2] - X[k]) * t) * s, cz + o + (j + Z[k] + (Z[k2] - Z[k]) * t) * s); } }
        if (e.length >= 4) S.push(e[0], L + .06, e[1], e[2], L + .06, e[3], bold); } }
    return new Float32Array(S); }
  const M = new THREE.Matrix4(), me = M.elements;
  function proj(x, y, z, out) { const w = me[3] * x + me[7] * y + me[11] * z + me[15]; if (w < .2) return false; out[0] = ((me[0] * x + me[4] * y + me[8] * z + me[12]) / w * .5 + .5) * cv.width; out[1] = (-(me[1] * x + me[5] * y + me[9] * z + me[13]) / w * .5 + .5) * cv.height; out[2] = w; return true; }
  const BK = [[], [], [], [], []], A = [0, 0, 0], B = [0, 0, 0], COL = ["#3fa7ff", "#5fe0b0", "#d8f27a", "#ffd36a"];
  let t0 = performance.now();
  function frame(t) { requestAnimationFrame(frame); const dt = Math.min(.1, (t - t0) / 1000); t0 = t;
    if (gl && st.filt && (t - (st.ft || 0) > 500)) { st.ft = t; if (gl.style.filter !== st.filt) gl.style.filter = st.filt; }   // 生き物の目の切りかえのあとにも、こちらの色を保つ
    updateBirds(dt);
    if (!st.m || QW.mode !== "walk" || cv.hidden) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    g2.clearRect(0, 0, W, H); const p = cam.position; cam.updateMatrixWorld(); M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    if (st.m === "pit" || st.m === "ir") {   // 空は赤外線では冷たい（散乱光の明るさとは逆）＝地平より上を冷たい色へ寄せる模式
      const f = new THREE.Vector3(); cam.getWorldDirection(f); f.y = 0; f.normalize(); let hy = proj(p.x + f.x * 600, p.y, p.z + f.z * 600, A) ? A[1] : H * .5; hy = Math.max(0, Math.min(H, hy));
      const he = Math.min(H, hy + H * .08), sg = g2.createLinearGradient(0, 0, 0, he), cc = st.m === "pit" ? "22,4,60" : "0,0,0"; sg.addColorStop(0, `rgba(${cc},.85)`); sg.addColorStop(Math.max(.01, hy / Math.max(1, he)) * .8, `rgba(${cc},.45)`); sg.addColorStop(1, `rgba(${cc},0)`); g2.fillStyle = sg; g2.fillRect(0, 0, W, he); }
    if (st.m === "ir") return;
    if (st.m === "pit") { hand.e += (Math.min(1, hand.raw / 6) - hand.e) * Math.min(1, dt * (hand.raw > hand.e ? 6 : 1.2)); hand.raw *= .85;
      const r = H * (.32 + .1 * hand.e), x = hand.x * W, y = H * 1.04, gr = g2.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(255,${200 + 40 * hand.e | 0},140,${.5 + .4 * hand.e})`); gr.addColorStop(.35, `rgba(240,90,30,${.35 + .3 * hand.e})`); gr.addColorStop(.75, "rgba(110,20,90,.16)"); gr.addColorStop(1, "rgba(30,0,60,0)");
      g2.globalCompositeOperation = "screen"; g2.fillStyle = gr; g2.fillRect(0, 0, W, H); g2.globalCompositeOperation = "source-over"; return; }
    if (!geo.at || Math.hypot(p.x - geo.at[0], p.z - geo.at[1]) > 8) { geo.at = [p.x, p.z]; if (st.m === "lidar") geo.pts = buildPts(p.x, p.z); else geo.seg = buildSeg(p.x, p.z); }
    if (st.m === "lidar" && geo.pts) { const P = geo.pts, sw = (t / 1000 * 3.1) % 6.283, y0 = p.y - 1.6;
      const buckets = BK, hot = BK[4]; for (const b of BK) b.length = 0;
      for (let i = 0; i < P.length; i += 4) { if (!proj(P[i], P[i + 1], P[i + 2], A)) continue; if (A[0] < 0 || A[1] < 0 || A[0] > W || A[1] > H || A[2] > 62) continue;
        const hh = P[i + 1] - y0, c = hh < .4 ? 0 : hh < 4 ? 1 : hh < 12 ? 2 : 3, a = Math.atan2(P[i + 2] - p.z, P[i] - p.x) + 3.1416, da = Math.abs(((a - sw + 9.42) % 6.283) - 3.1416);
        const s = Math.max(1, 3.4 * dpr / Math.max(1, A[2] * .22)); (da > 2.9 ? hot : buckets[c]).push(A[0], A[1], s); }
      for (let c = 0; c < 4; c++) { g2.fillStyle = COL[c]; g2.globalAlpha = .82; const b = buckets[c]; for (let i = 0; i < b.length; i += 3) g2.fillRect(b[i], b[i + 1], b[i + 2], b[i + 2]); }
      g2.fillStyle = "#ffffff"; g2.globalAlpha = 1; for (let i = 0; i < hot.length; i += 3) g2.fillRect(hot[i], hot[i + 1], hot[i + 2] * 1.3, hot[i + 2] * 1.3); g2.globalAlpha = 1; }
    else if (st.m === "gis" && geo.seg) { const S = geo.seg; for (const bold of [0, 1]) { g2.beginPath(); g2.strokeStyle = bold ? "rgba(255,226,150,.95)" : "rgba(170,230,255,.6)"; g2.lineWidth = (bold ? 1.8 : 1) * dpr;
        for (let i = 0; i < S.length; i += 7) { if (S[i + 6] !== bold) continue; if (!proj(S[i], S[i + 1], S[i + 2], A) || !proj(S[i + 3], S[i + 4], S[i + 5], B)) continue; if (A[2] > 75) continue; g2.moveTo(A[0], A[1]); g2.lineTo(B[0], B[1]); } g2.stroke(); } }
  }
  requestAnimationFrame(frame);

  /* 鳥の声で地図：birdear の Worker の結果だけを見る（音は受けとらない） */
  const birds = [], tex = glow(); let toldBird = false;
  addEventListener("qualium:bird", e => { const d = e.detail; if (d?.ja && d.p >= .6) placeBird(d); });   // birdear.js が知らせる種の名と度合いだけ
  function placeBird(r) { if (QW.mode !== "walk" || !QW.world) return; const last = birds.find(b => b.ja === r.ja); if (last && last.age < 20) return;
    const d = new THREE.Vector3(); cam.getWorldDirection(d); d.y = 0; d.normalize(); const ang = (Math.random() - .5) * .5; d.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    const dist = 12 + Math.random() * 8, x = cam.position.x + d.x * dist, z = cam.position.z + d.z * dist, y = gY(x, z) + 5 + Math.random() * 4;
    const hue = [...r.ja].reduce((a, c) => a + c.charCodeAt(0), 0) % 360, col = new THREE.Color().setHSL(hue / 360, .55, .72);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(1.1); sp.position.set(x, y, z);
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y - .5, z), new THREE.Vector3(x, gY(x, z), z)]), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .35, depthWrite: false }));
    QW.world.add(sp, ln); birds.push({ ja: r.ja, sp, ln, age: 0, y }); while (birds.length > 8) drop(birds.shift());
    if (!toldBird) { toldBird = true; setTimeout(() => speak([{ t: "聞いたとき向いていた方に、小さな光を置いたよ。マイク一つでは、向きまでは測れないけれど。" }]), 4500); } }
  function drop(b) { QW.world.remove(b.sp, b.ln); b.sp.material.dispose(); b.ln.geometry.dispose(); b.ln.material.dispose(); }
  function updateBirds(dt) { for (let i = birds.length - 1; i >= 0; i--) { const b = birds[i]; b.age += dt; const f = b.age < 1 ? b.age : b.age > 100 ? Math.max(0, (120 - b.age) / 20) : 1;
      b.sp.material.opacity = f * (.75 + .25 * Math.sin(b.age * 2.4)); b.ln.material.opacity = .35 * f; b.sp.position.y = b.y + .15 * Math.sin(b.age * 1.3); if (b.age > 120) { drop(b); birds.splice(i, 1); } } }
  paintBtn();
  QW.KIKAI = { set, state: st, birds, placeBird };
  return QW.KIKAI;
}
function glow() { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.25, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
