/* © mitsulab. Qualium 大宮 ── 歩く体験に足す三つ（2026-11-12）
   ① 画面を見ない時間：歩いているとき、ときどき碧が「顔を上げて」と促し、画面を暗くして、音と振動（振動できない端末では音だけ）で道を伝える。触れると戻る。
   ② その日・その時刻の光：実際の時刻の太陽の高さ（app.js の QW.sunAE）と季節から、光の色・強さ・空気の澄み方を決める。天気は外から取らず、時刻と季節だけで決める模式。
   ④ 足もとの土の中：立ち止まって下を向くと、足もとに根・菌糸・土の中の生き物の層が重なる。音は「聴こえる高さに移した模式」（録った音ではない）。
   軽さ：DOM の膜 1 枚・光の数を変えるだけ・土の層は一度だけ作り、見ているときだけ描く。毎こまの計算は数行。 */
import * as THREE from "three";
import { sunAzEl } from "./sunpos.js?v=2";

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const Q = new URLSearchParams(location.search);
const ON = new Set(["up", "light", "soil"]);   // 足した順に一つずつ公開する（up・light・soil）

export function attachWalk4(QW) {
  const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 700;
  const canVib = typeof navigator.vibrate === "function" && MOBILE;
  const vib = p => { if (!canVib) return; try { navigator.vibrate(p); } catch { } };
  const css = document.createElement("style"); css.id = "walk4";
  css.textContent = `#w4up{position:fixed;inset:0;z-index:3;background:rgba(3,6,10,.93);opacity:0;transition:opacity 1.4s ease;pointer-events:auto;cursor:pointer}
#w4up.on{opacity:1}#w4up p{position:absolute;left:0;right:0;top:44%;margin:0;text-align:center;font:400 12px/1.6 var(--ml-serif,"Shippori Mincho","Hiragino Mincho ProN",serif);letter-spacing:.08em;color:rgba(230,238,242,.55)}
body.w4up #qS6,body.w4up #qIK,body.w4up #qIKsrc,body.w4up #walkUI,body.w4up #w4src,body.w4up header,body.w4up #topbar,body.w4up button:not(#w4src button){opacity:.12!important}
#w4up p{transition:opacity 1.5s ease 4s}#w4up.on p{opacity:.0}#w4up.on.fresh p{opacity:1}
#w4src{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:calc(max(12px,env(safe-area-inset-bottom)) + 250px);z-index:7;max-width:min(240px,calc(100vw - 140px));font:400 11.5px/1.55 var(--ml-serif,"Shippori Mincho","Hiragino Mincho ProN",serif);color:#eef3f6;text-shadow:0 1px 3px rgba(0,0,0,.85)}
#w4src[hidden]{display:none}#w4src button{all:unset;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;padding:0 12px;border-radius:22px;background:rgba(8,13,22,.5);border:1px solid rgba(225,235,242,.22);font-size:12px;letter-spacing:.04em}
#w4src ul{margin:6px 0 0;padding:6px 10px 6px 20px;font-size:10.5px;line-height:1.45;max-height:30vh;overflow:auto;background:rgba(8,13,22,.62);border-radius:10px}#w4src li{margin:2px 0}
@media (min-width:641px){#w4src{bottom:calc(max(16px,env(safe-area-inset-bottom)) + 210px);left:24px}}`;
  document.head.appendChild(css);

  /* ---------- 出典の札（「＋ 出典」を押すとその場に開く。一段だけ） ---------- */
  const srcBox = document.createElement("div"); srcBox.id = "w4src"; srcBox.hidden = true;
  srcBox.innerHTML = '<button type="button" aria-expanded="false">＋ 出典</button><ul hidden></ul>'; document.body.appendChild(srcBox);
  const sBtn = srcBox.querySelector("button"), sUl = srcBox.querySelector("ul"); let srcOwner = null, srcT = 0, srcLab = "出典";
  sBtn.addEventListener("click", e => { e.stopPropagation(); const op = sUl.hidden; sUl.hidden = !op; sBtn.textContent = (op ? "− " : "＋ ") + srcLab; sBtn.setAttribute("aria-expanded", String(op)); srcT = op ? 30 : 8; });
  srcBox.addEventListener("pointerdown", e => e.stopPropagation());
  function showSrc(owner, items, sec = 9, lab = "出典") { srcOwner = owner; srcLab = lab; sUl.innerHTML = items.map(t => `<li>${t}</li>`).join(""); sUl.hidden = true; sBtn.textContent = "＋ " + lab; sBtn.setAttribute("aria-expanded", "false"); srcBox.hidden = false; srcT = sec; }
  function hideSrc(owner) { if (owner && srcOwner !== owner) return; srcBox.hidden = true; srcOwner = null; }

  /* ---------- 音（app.js の音の出口へ。鳴らせないときは何もしない） ---------- */
  const ac = () => { const a = QW.sndOut?.() ? QW.sndCtx?.() : null; return a && a.state === "running" && QW.soundOn?.() !== false ? a : null; };
  const out = () => QW.sndOut?.() || null;
  function tone(f, pan = 0, dur = .16, vol = .12, f2 = null) {
    const a = ac(), o = out(); if (!a || !o) return false; const t = a.currentTime + .01, osc = a.createOscillator(), g = a.createGain(), p = a.createStereoPanner ? a.createStereoPanner() : null;
    osc.type = "sine"; osc.frequency.setValueAtTime(f, t); if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    osc.connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(o); } else g.connect(o); osc.start(t); osc.stop(t + dur + .05); return true;
  }

  /* =====================================================================
     ① 画面を見ない時間
     ===================================================================== */
  const UP = { walkT: 0, next: Q.get("w4up") === "1" ? 3 : 45, on: false, el: null, prevAuto: false, yaws: [], cueT: 0, beatT: 0, stopT: 0, saidEnd: false };
  function upEnter() {
    if (UP.on) return; UP.on = true; UP.prevAuto = !!QW.WALK.auto;
    { const t = canVib ? "顔を上げて。しばらく、道は音と振動で伝えます。" : "顔を上げて。しばらく、道は音で伝えます。"; QW.speak?.([{ t, tc: t }]); }
    const el = UP.el = document.createElement("div"); el.id = "w4up"; el.setAttribute("role", "button"); el.setAttribute("aria-label", "画面に戻る（触れると戻ります）");
    el.innerHTML = `<p>${MOBILE ? "触れると戻ります" : "クリックかキーで戻ります"}</p>`; document.body.appendChild(el); document.body.classList.add("w4up");
    requestAnimationFrame(() => el.classList.add("on", "fresh")); setTimeout(() => el.classList.remove("fresh"), 100);
    el.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); upExit(true); }, { once: true });
    QW.WALK.goal = null; QW.WALK.auto = true; QW.syncAuto?.(); UP.yaws = []; UP.cueT = 1.5; UP.beatT = 2; UP.stopT = 0; UP.saidEnd = false;
    vib([18, 80, 18]); tone(660, 0, .22, .1, 880);
  }
  function upExit(touched) {
    if (!UP.on) return; UP.on = false; const el = UP.el; UP.el = null; document.body.classList.remove("w4up");
    if (el) { el.classList.remove("on"); setTimeout(() => el.remove(), 700); }
    QW.syncAuto?.();   // 歩きつづけのまま戻る（止めるのは「止まる」） UP.walkT = 0; UP.next = 150;
    if (touched) { tone(880, 0, .18, .08, 660); QW.speak?.([{ t: "おかえり。", tc: "おかえり。" }]); }
  }
  function upStep(dt) {
    const W = QW.WALK, walking = QW.mode === "walk" && (W.moving || W.auto) && !QW.ikimono?.state?.id;
    if (!UP.on) {
      if (walking && !document.hidden && document.getElementById("panel")?.hidden !== false) UP.walkT += dt;
      if (UP.walkT > UP.next && ac()) upEnter();   // 音が出せる（押したあと）ときだけ。音が出せないのに画面だけ暗くはしない
      return;
    }
    if (QW.mode !== "walk") { upExit(false); return; }
    // 道の曲がりを、体の向き（歩きつづける＝参道に沿う）の変わり方から読む。曲がる側から音、振動は曲がるときだけ
    const yaw = QW.CAM.yaw; UP.yaws.push([performance.now(), yaw]); while (UP.yaws.length && performance.now() - UP.yaws[0][0] > 1500) UP.yaws.shift();
    const d = UP.yaws.length > 2 ? Math.atan2(Math.sin(yaw - UP.yaws[0][1]), Math.cos(yaw - UP.yaws[0][1])) : 0;
    UP.cueT -= dt; UP.beatT -= dt;
    if (Math.abs(d) > .12 && UP.cueT <= 0) { const side = d > 0 ? -1 : 1; tone(side < 0 ? 520 : 620, side * .85, .2, .13); vib(28); UP.cueT = 1.3; UP.beatT = 3.5; }   // 左へ曲がる＝左から
    else if (UP.beatT <= 0) { tone(440, 0, .09, .045); UP.beatT = 3.5; }   // まっすぐ続く＝真ん中で小さく
    if (!W.moving) { UP.stopT += dt; if (UP.stopT > 20) { upExit(false); return; } if (UP.stopT > 2.5 && !UP.saidEnd) { UP.saidEnd = true; tone(392, 0, .3, .1); vib([30, 60, 30]); QW.speak?.([{ t: "ここで止まりました。触れると、画面に戻ります。", tc: "ここで止まりました。触れると、画面に戻ります。" }]); } }
    else UP.stopT = 0;
  }
  // 画面のどこかに触れた（膜の外の札を含む）ら戻る
  addEventListener("pointerdown", e => { if (UP.on && !e.target.closest?.("#w4up")) { e.preventDefault(); e.stopPropagation(); UP.swallow = performance.now(); upExit(true); } }, true);   // 最初のひと触れは「戻る」だけ（下の札は押さない）
  addEventListener("click", e => { if (UP.swallow && performance.now() - UP.swallow < 700) { e.preventDefault(); e.stopPropagation(); UP.swallow = 0; } }, true);
  addEventListener("keydown", () => { if (UP.on) upExit(true); }, true);

  /* =====================================================================
     ② その日・その時刻の光（天気は時刻と季節だけで決める模式）
     ===================================================================== */
  const now0 = () => { const o = Q.get("w4t"); return o ? new Date(o) : new Date(); };   // ?w4t=2026-08-01T17:30 で時刻を試せる（確かめ用）
  const SEASON = [   // 月ごとの空の光（半球の光の上・下の色）と、空気の澄み方（霞の遠さの倍率）。季節の一般的な傾向の模式
    null, ["#dde7f4", "#6e6a5e", 1.22], ["#dfe8f4", "#6f6b5e", 1.18], ["#e4eefc", "#757258", 1.0], ["#e4f0ff", "#727658", .95], ["#e2f0ff", "#6f7a54", .92],
    ["#e0ecf6", "#6c7652", .82], ["#e2eefa", "#6f7a52", .8], ["#e4eef8", "#727852", .84], ["#e6ecf2", "#777452", .95], ["#ece9de", "#7d7052", 1.08], ["#ebe7dc", "#7a6e54", 1.15], ["#dfe7f2", "#6f6a5e", 1.22]];
  const L = { t: 0, base: null, mine: null, said: false, cS: new THREE.Color(), cH: new THREE.Color(), cG: new THREE.Color(), k: 1, sun0: QW.sun?.intensity ?? 2.6 };
  function lightTarget() {
    const d = now0(), el = sunAzEl(35.90725, 139.631, d).el,   /* 知らせの時刻と同じ日時から太陽の高さを出す（食い違わない） */ m = d.getMonth() + 1, h = d.getHours() + d.getMinutes() / 60, S = SEASON[m];
    const low = 1 - sm(1, 14, el);   // 赤みは太陽が 14° を切ってから（夕方・朝の低い光）   // 太陽が低いほど、光は赤みに・弱く
    L.cS.set("#fff4e0").lerp(new THREE.Color("#ffa060"), low * .5);
    const I = L.sun0 * (.22 + .78 * sm(-4, 32, el));
    L.cH.set(S[0]).lerp(new THREE.Color("#f2c9a4"), low * .3); L.cG.set(S[1]).lerp(new THREE.Color("#6a5240"), low * .4);   // 低い太陽のときは空の光も暖かく
    // 空気：季節の倍率に、朝の早い時間（日の出のあと 2 時間ほど）の水けの霞を足す（9〜11 月と 3〜5 月の朝）。夕方はそのまま
    let air = S[2]; if (h >= 5 && h < 8.5 && (m >= 9 && m <= 11 || m >= 3 && m <= 5)) air *= .72;
    return { I, air, low, el: Math.round(el), m, day: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
  }
  function lightStep(dt) {
    if (!QW.sun || !QW.hemi) return; L.t -= dt; if (L.t > 0) return; L.t = .5;
    const T = lightTarget(), a = .25;
    QW.sun.color.lerp(L.cS, a); QW.sun.intensity += (T.I - QW.sun.intensity) * a; QW.hemi.color.lerp(L.cH, a); QW.hemi.groundColor.lerp(L.cG, a);
    if (!L.veil) { L.veil = document.createElement("div"); L.veil.setAttribute("aria-hidden", "true"); L.veil.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;transition:opacity 2s linear;mix-blend-mode:soft-light;background:linear-gradient(to bottom,rgba(255,150,80,.9),rgba(255,170,110,.55) 45%,rgba(255,190,140,0) 75%)"; document.body.appendChild(L.veil); }
    { const o = QW.mode === "walk" ? (T.low * .55).toFixed(2) : "0"; if (L.veil.style.opacity !== o) L.veil.style.opacity = o; }   // 低い太陽のとき、空の上の方を夕方の色に（膜 1 枚）
    const f = QW.scene?.fog;
    if (f && QW.mode === "walk") { if (L.mine == null || Math.abs(f.far - L.mine) > .5) L.base = f.far; L.mine = L.base * T.air; f.far = L.mine; }   // app.js が霞を置きなおしたら、それを新しい元にする
    else L.mine = null;
    if (!L.said && QW.mode === "walk" && QW.walked !== false) { L.waitT = (L.waitT || 0) + .5; if (L.waitT > 14 && !UP.on && !(SO.k > .01)) { L.said = true; sayLight(T); } }
  }
  function sayLight(T) {
    const e = document.getElementById("toast"); if (!e) return;
    const tm = T.el > 0 ? `太陽の高さ ${T.el}°` : T.h < 12 ? "日の出の前" : "日の入りのあと";
    e.textContent = `${T.m}月${T.day}日 ${T.h}時${String(T.mi).padStart(2, "0")}分の光（${tm}・日時から計算）。`; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => { e.hidden = true; }, 5200);
    showSrc("light", ["太陽の高さ：日時と緯度・経度から計算（NOAA「General Solar Position Calculations」・誤差約 1°）", "光の色・霞・雲の絵は模式（いまの天気ではない）"], 8, "光の出典");
  }

  /* =====================================================================
     ④ 足もとの土の中
     ===================================================================== */
  const SO = { g: null, k: 0, want: 0, stillT: 0, last: new THREE.Vector3(), said: false, mats: [], worm: null, wormP: null, crT: 0 };
  addEventListener("pointerdown", () => { SO.drag = true; }, true); addEventListener("pointerup", () => { SO.drag = false; SO.p0 = QW.CAM.pitch; }, true); addEventListener("pointercancel", () => { SO.drag = false; }, true);
  function rnd(i) { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
  function strataTex() {
    const c = document.createElement("canvas"); c.width = 64; c.height = 256; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#2a2119"); g.addColorStop(.22, "#33271c"); g.addColorStop(.32, "#4d3826"); g.addColorStop(.62, "#6a4a2e"); g.addColorStop(1, "#5a3f28");   // 黒い表土（腐植）の下に褐色の土（模式）
    x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 900; i++) { const y = rnd(i) * 256, s = 1 + rnd(i + 3) * 2.2; x.fillStyle = `rgba(${rnd(i + 5) > .5 ? "210,190,160" : "20,14,10"},${.08 + rnd(i + 7) * .18})`; x.fillRect(rnd(i + 1) * 64, y, s, s * .8); }   // 粒（砂・団粒）
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(4, 1); return t;
  }
  async function soilBuild() {
    const g = new THREE.Group(), R = .95, H = .75, op = m => { m.transparent = true; m.opacity = 0; m.depthTest = false; m.depthWrite = false; m.fog = false; SO.mats.push(m); return m; };
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R * .92, H, 40, 1, true), op(new THREE.MeshBasicMaterial({ map: strataTex(), side: THREE.BackSide })));
    wall.position.y = -H / 2; wall.renderOrder = 20; g.add(wall);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R * .92, 40).rotateX(-Math.PI / 2), op(new THREE.MeshBasicMaterial({ color: "#4a3422" }))); floor.position.y = -H; floor.renderOrder = 19; g.add(floor);
    const rim = new THREE.Mesh(new THREE.RingGeometry(R, R + .09, 48).rotateX(-Math.PI / 2), op(new THREE.MeshBasicMaterial({ color: "#1c1510" }))); rim.position.y = .005; rim.renderOrder = 21; g.add(rim);
    // 根：上から斜めに入り、細く分かれる（褐色の管）。数と形は模式
    const rootM = op(new THREE.MeshStandardMaterial({ color: "#7a5636", roughness: .85 })), fineM = op(new THREE.MeshStandardMaterial({ color: "#a07a52", roughness: .9 }));
    const tubes = [], fine = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * 6.283 + rnd(i) * .8, r0 = .25 + rnd(i + 2) * .5, P = [];
      let x = Math.cos(a) * (R + .3), z = Math.sin(a) * (R + .3), y = -.04 - rnd(i + 4) * .08;
      for (let k = 0; k < 6; k++) { P.push(new THREE.Vector3(x, y, z)); x += (Math.cos(a + Math.PI) * .32 + (rnd(i * 9 + k) - .5) * .18); z += (Math.sin(a + Math.PI) * .32 + (rnd(i * 7 + k) - .5) * .18); y -= .06 + rnd(i * 3 + k) * .08; }
      const cu = new THREE.CatmullRomCurve3(P); tubes.push(new THREE.TubeGeometry(cu, 24, .022 * (1 - i * .08), 6, false));
      for (let b = 0; b < 4; b++) { const s = cu.getPoint(.3 + b * .17), Q2 = [s]; let q = s.clone(); for (let k = 0; k < 4; k++) { q = q.clone().add(new THREE.Vector3((rnd(i * 31 + b * 5 + k) - .5) * .22, -.05 - rnd(b + k) * .06, (rnd(i * 17 + b * 3 + k) - .5) * .22)); Q2.push(q); } fine.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Q2), 10, .006, 4, false)); }
    }
    const { mergeGeometries } = await import("three/addons/utils/BufferGeometryUtils.js");
    const rootMesh = new THREE.Mesh(mergeGeometries(tubes), rootM); rootMesh.renderOrder = 22; g.add(rootMesh);
    const fineMesh = new THREE.Mesh(mergeGeometries(fine), fineM); fineMesh.renderOrder = 22; g.add(fineMesh);
    // 菌糸：根の先から土の中へ網のように広がる白い細い線（模式）
    const pts = []; for (let i = 0; i < 160; i++) { let px = (rnd(i) - .5) * 1.5, py = -.1 - rnd(i + 9) * .5, pz = (rnd(i + 19) - .5) * 1.5; if (Math.hypot(px, pz) > R * .85) continue; for (let k = 0; k < 5; k++) { const nx = px + (rnd(i * 7 + k) - .5) * .12, ny = py + (rnd(i * 3 + k) - .5) * .08, nz = pz + (rnd(i * 5 + k + 2) - .5) * .12; pts.push(px, py, pz, nx, ny, nz); px = nx; py = ny; pz = nz; } }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const hy = new THREE.LineSegments(lg, op(new THREE.LineBasicMaterial({ color: "#efe8da" }))); hy.renderOrder = 23; g.add(hy);
    // 土の中の生き物：ミミズ（Qualia/sight と同じ写実の体）と、小さな粒の生き物（トビムシなどの大きさの点・模式）
    try { const C = await import("./creatures_sight.js?v=5"); const w = C.makeWorm(); w.scale.setScalar(.12); w.position.set(.2, -.42, -.1); w.rotation.y = .7; w.traverse(o => { if (o.isMesh) { o.renderOrder = 24; for (const m of [].concat(o.material)) op(m); } }); g.add(w); SO.worm = w; } catch (e) { console.warn("walk4 worm", e); }
    const dp = []; for (let i = 0; i < 70; i++) { const r = rnd(i + 40) * R * .85, a = rnd(i + 50) * 6.283; dp.push(Math.cos(a) * r, -.06 - rnd(i + 60) * .6, Math.sin(a) * r); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
    const dots = new THREE.Points(dg, op(new THREE.PointsMaterial({ color: "#e6dccb", size: MOBILE ? 2.2 : 2.6, sizeAttenuation: false }))); dots.renderOrder = 24; g.add(dots); SO.dots = dots;
    const amb = new THREE.PointLight("#ffe7c8", 1.6, 3, 1.4); amb.position.set(0, .4, 0); g.add(amb);
    g.visible = false; QW.world.add(g); SO.g = g;
    try { if (QW.renderer?.compileAsync) { g.visible = true; for (const m of SO.mats) m.opacity = .001; await QW.renderer.compileAsync(g, QW.camera, QW.scene); g.visible = false; } } catch { }
  }
  function crackle() {   // 土の中の小さな動きを、聴こえる高さへ移した模式の音（短いこすれと、ゆっくりした低いふるえ）
    const a = ac(), o = out(); if (!a || !o) return; const t = a.currentTime + .01, n = Math.floor(a.sampleRate * .05), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(), p = a.createStereoPanner ? a.createStereoPanner() : null; s.buffer = b; bp.type = "bandpass"; bp.frequency.value = 1400 + Math.random() * 1600; bp.Q.value = 4; g.gain.value = .06 + Math.random() * .05;
    s.connect(bp); bp.connect(g); if (p) { p.pan.value = Math.random() * 1.4 - .7; g.connect(p); p.connect(o); } else g.connect(o); s.start(t);
  }
  function soilStep(dt) {
    const cam = QW.camera.position, walk = QW.mode === "walk" && !UP.on && !QW.ikimono?.state?.id;
    const mv = cam.distanceTo(SO.last) / Math.max(dt, 1e-3); SO.last.copy(cam);
    // 足もとを見ているあいだは、見下ろした向きをそのまま保つ（水平へ自動で戻る動きで土の層が閉じないように）。自分で見上げたら閉じる
    if ((SO.k > .5 || SO.stillT > 0) && !SO.drag && SO.p0 < -.55 && QW.CAM.pitch > SO.p0 && QW.CAM.pitch < -.3) QW.CAM.pitch = SO.p0;
    const down = QW.CAM.pitch < -.55; if (down && !SO.drag) SO.p0 = Math.min(SO.p0 ?? 0, QW.CAM.pitch); if (!down && SO.k < .01) SO.p0 = 0;
    SO.stillT = walk && mv < .08 && !QW.WALK.auto && !QW.WALK.goal ? SO.stillT + dt : 0;
    SO.want = walk && down && SO.stillT > .8 ? 1 : 0;
    if (SO.want && !SO.g && !SO.p) SO.p = soilBuild().catch(e => console.warn("walk4 soil", e));
    if (!SO.g) return;
    if (SO.want && SO.k < .01) {   // ひらく所：見ている先の足もと（1 m ほど前）
      const yaw = QW.CAM.yaw + QW.CAM.look, x = cam.x - Math.sin(yaw) * 1.6, z = cam.z - Math.cos(yaw) * 1.6;
      SO.g.position.set(x, (QW.groundAt ? QW.groundAt(x, z) : 0) + .01, z);
    }
    SO.k += Math.sign(SO.want - SO.k) * Math.min(Math.abs(SO.want - SO.k), dt / (SO.want ? .6 : .35));
    SO.g.visible = SO.k > .005;
    if (!SO.g.visible) { hideSrc("soil"); return; }
    const k = SO.k; for (const m of SO.mats) m.opacity = (m.isLineBasicMaterial ? .55 : m.isPointsMaterial ? .7 : .97) * k;
    const t = performance.now() / 1000;
    if (SO.worm) { SO.worm.position.x = .2 + Math.sin(t * .25) * .12; SO.worm.rotation.y = .7 + Math.sin(t * .25) * .6; SO.worm.userData.animate?.(t, true); }
    if (SO.dots) SO.dots.rotation.y = t * .03;
    if (k > .9) { SO.crT -= dt; if (SO.crT <= 0) { crackle(); SO.crT = .25 + Math.random() * 1.2; } }
    if (k > .9 && !SO.layered) { SO.layered = true; try { window.mitsuIchimai?.layer?.("土の中"); } catch { } }   // 持ち帰りの一枚に層の名を
    if (k > .9 && !SO.said) {
      SO.said = true;
      QW.speak?.([{ t: "足もとの土の中。根と、そこから広がる菌糸と、土の生き物の層。音は、小さな動きを聴こえる高さに移した模式です。", tc: "足もとの土の中。根と菌糸と、土の生き物の層（模式）。音は、聴こえる高さに移した模式。" }]);
      showSrc("soil", ["根・菌糸・生き物・土の層の形と数は模式（この場所で掘ったものではない）。音は端末で組み立てた模式", "菌根菌の菌糸は根から土へ伸び、水と養分のやりとりにかかわる：Smith & Read (2008) Mycorrhizal Symbiosis, 3rd ed."], 14, "土の出典");
    }
  }

  /* ---------- まわす ---------- */
  let tl = performance.now();
  (function loop(t) { const dt = Math.min(.1, (t - tl) / 1000); tl = t;
    try { if (ON.has("up")) upStep(dt); if (ON.has("light")) lightStep(dt); if (ON.has("soil")) soilStep(dt); if (srcT > 0 && (srcT -= dt) <= 0 && sUl.hidden) hideSrc(); } catch (e) { console.warn("walk4", e); }
    requestAnimationFrame(loop); })(tl);
  QW.walk4 = { up: UP, light: L, soil: SO, upEnter, upExit, lightTarget };
  return QW.walk4;
}
