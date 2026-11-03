/* © mitsulab. 変身 ── 見る人の視点が依代（生き物）の中へ入る。碧はそのまま歩き続ける（2026-11-02 試作 v2・未公開）
   設計＝01_経営/01_経営/03_資料/設計_変身と拡張可能な環世界_2026-11-02.md
   操作（本人 11-02「長押しでなく、3D グラフィックの GUI に」）：碧の足もとの細い光の輪の上に、変身できる依代の小さな 3D の姿が
   ゆっくり回る。押すとその依代の視点へ入る。依代の視点のあいだは、碧の足もとに碧の小さな姿が出て、押すと人の視点へ戻る。
   メニュー・一覧は出さない。押せる範囲は画面で 44px 以上。
   軽さ：色は canvas の CSS フィルタ（色の行列）1 つ・紫外と周辺は淡い面 1 枚。小さな姿は低ポリ。視点は描く直前にだけ差しかえて描いたあと戻す
   （本体の歩く処理には触らない＝碧も人の位置もそのまま進む）。 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { PROFILES } from "./umwelt_profiles.js?v=3";
import { LENS } from "./umwelt_lens.js";
const BASE = new URL("./", import.meta.url).href;
const HAIR = 0x5fa7a0;   // 碧の髪の色（依代の差し色）
export function attachHenshin(QW, opt = {}) {
  const { camera, scene } = QW, canvas = opt.canvas || document.getElementById("gl"), say = opt.say || (() => { });
  const ORDER = (opt.order || ["hiyodori", "suzume", "hachi", "tanuki", "ishi", "ki"]).filter(id => PROFILES[id] && (PROFILES[id].field?.ok !== false || opt.dev));   // 場所の出典のない種は出さない
  const S = { cur: PROFILES.hito, k: 0, target: 0, pose: null, saved: null };
  /* ---- 画面の色（模式） ---- */
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
  svg.innerHTML = '<filter id="hsF" color-interpolation-filters="linearRGB"><feColorMatrix id="hsM" type="matrix"/></filter>';
  document.body.appendChild(svg); const fm = svg.querySelector("#hsM");
  const veil = document.createElement("div"); veil.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0";
  document.body.appendChild(veil);
  const tag = document.createElement("div");
  tag.style.cssText = "position:fixed;left:max(16px,env(safe-area-inset-left));top:calc(max(16px,env(safe-area-inset-top)) + 46px);z-index:5;pointer-events:none;font:11px/1 var(--ml-serif,serif);letter-spacing:.12em;line-height:1.5;text-shadow:0 0 2px rgba(0,0,0,.95),0 0 8px rgba(0,0,0,.75),0 0 16px rgba(0,0,0,.5);color:rgba(245,248,255,.95);max-width:min(260px,70vw);opacity:0;transition:opacity .6s";
  document.body.appendChild(tag);
  /* ---- 3D の GUI：碧の足もとの細い光の輪と、小さな姿 ---- */
  const gui = new THREE.Group(); gui.name = "henshinGUI"; scene.add(gui);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .312, 72), new THREE.MeshBasicMaterial({ color: 0xdfeaf2, transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; gui.add(ring);
  const matW = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: .85 }), matH = new THREE.MeshStandardMaterial({ color: HAIR, roughness: .8 });
  const icons = [];   // { id, g, label, profile }
  const mkLabel = t => { const e = document.createElement("div"); e.textContent = t; e.style.cssText = "position:fixed;left:0;top:0;z-index:4;pointer-events:none;font:12px/1 var(--ml-serif,'Shippori Mincho B1',serif);letter-spacing:.12em;color:#f4f6f8;text-shadow:0 0 2px #000,0 0 6px rgba(0,0,0,.85);white-space:nowrap;display:none"; document.body.appendChild(e); return e; };
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  async function iconBody(P) {
    const b = P.body3d || {};
    if (b.glb) { const g = (await loader.loadAsync(BASE + b.glb)).scene; const box = new THREE.Box3().setFromObject(g), s = .15 / Math.max(.001, box.getSize(new THREE.Vector3()).y);   /* 輪の上の姿は小さく（風景の依代と見まちがえない） */ g.scale.setScalar(s); g.position.y = -box.min.y * s; return g; }
    if (b.make === "bee") { const { makeBee } = await import("./creatures.js"); const g = makeBee(undefined, { state: "fly" }); g.scale.setScalar(.16); const w = new THREE.Group(); w.add(g); g.position.y = .1; w.userData.anim = t => g.userData.animate?.(t, true); return w; }
    return new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), matW);
  }
  function markAoi() {   // 碧へ戻る印：碧の髪の色の細い光の輪と、葉の房（碧の髪の一房と同じ意匠）。小さく、ゆっくり回る
    const g = new THREE.Group(), mh = new THREE.MeshBasicMaterial({ color: HAIR, transparent: true, opacity: .95 }), mw = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.05, .0028, 8, 64), mh); g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(.058, .0012, 6, 64), mw); g.add(ring2);
    const ml = new THREE.MeshStandardMaterial({ color: HAIR, roughness: .45, metalness: 0, emissive: HAIR, emissiveIntensity: .35 });   // 葉の房は陰影のある材質（平らな絵に見えない）
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.012, 16, 12), ml); l.scale.set(.55, 1.6, .3); l.position.set((i - 1) * .011, .004 + (i === 1 ? .004 : 0), 0); l.rotation.z = (1 - i) * .38; g.add(l); }
    g.userData.spin = ring; g.userData.leaf = g.children.slice(2); return g; }
  function miniAoi() {   // 碧の小さな姿（低ポリ・白い体に髪の色の房）
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .12, 3, 10), matW); body.position.y = .105; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.045, 14, 10), matW); head.position.y = .235; g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10, 0, Math.PI * 2, 0, Math.PI * .55), matH); hair.position.y = .24; g.add(hair);
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(.018, .09, 8), matH); tuft.position.set(.03, .2, .035); tuft.rotation.z = .5; g.add(tuft);
    return g;
  }
  const back = { id: "hito", g: markAoi(), label: mkLabel("碧へ戻る"), profile: PROFILES.hito }; back.g.visible = false;  back.label.style.cssText += ";font-size:13px;padding:13px 16px;border:1.5px solid rgba(255,255,255,.9);border-radius:22px;background:rgba(22,48,52,.5);text-shadow:0 0 4px rgba(0,0,0,.7);min-height:44px;box-sizing:border-box;display:none";   /* 押せると分かる細い縁（板は敷かない） */ scene.add(back.g); back.g.traverse(o => { o.frustumCulled = false; o.renderOrder = 10; });   /* 戻る台は、依代の視点のカメラの右下に置く（碧や幹に重ねない） */
  ORDER.forEach(async (id, i) => {
    const P = PROFILES[id]; if (!P) return; const it = { id, g: new THREE.Group(), label: mkLabel(P.name), profile: P, i };
    icons.push(it); gui.add(it.g);
    try { it.g.add(await iconBody(P)); } catch (e) { console.warn("henshin icon", id, e); it.g.add(new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), matW)); }
  });
  /* ---- 依代の体（世界の中。変身の入りと戻りに見える） ---- */
  const bodies = {};
  async function worldBody(P) {
    if (bodies[P.id]) return bodies[P.id]; const b = P.body3d || {}; let g;
    if (b.glb) { g = (await loader.loadAsync(BASE + b.glb)).scene; const box = new THREE.Box3().setFromObject(g), s = b.size / Math.max(.001, box.getSize(new THREE.Vector3()).y); g.scale.setScalar(s); }
    else if (b.make === "bee") { const { makeBee } = await import("./creatures.js"); g = makeBee(undefined, { state: "fly" }); g.scale.setScalar(b.size * 4); }   // 4 倍＝見つけられる大きさの模式
    else return null;
    { const bx = new THREE.Box3().setFromObject(g); g.userData.top = bx.max.y; g.userData.len = Math.max(bx.max.z - bx.min.z, bx.max.x - bx.min.x); }
    g.visible = false; scene.add(g); g.traverse(o => { o.frustumCulled = false; }); return (bodies[P.id] = g);
  }
  /* ---- 依代の動き（碧のそばで、その生き物の動き方） ---- */
  const V = new THREE.Vector3(), V2 = new THREE.Vector3(), rnd = (a, b) => a + Math.random() * (b - a);
  const P_EYE = () => S.cur?.body?.eye;
  function aoiPos() { const r = QW.AOI?.root; if (r) return r.getWorldPosition(V); const m = QW.AOI?.m; return m?.pos ? V.set(m.pos.x, m.pos.y, m.pos.z) : null; }   // 碧のいまの体の位置（行き先ではなく）
  /* 木の視点の置き場所：幹のまわり 12 方向 × 距離 1.1〜2.4 m を試し、①その点のまわり 0.6 m に物がない ②その点から碧の頭まで遮るものがない、の両方を満たす所。
     光線は変身のときに一度だけ。見つからなければ人の目の位置のまま（樹冠や柱の中には入らない）。 */
  const RC = new THREE.Raycaster(), D3 = new THREE.Vector3(), O3 = new THREE.Vector3();
  function hitWithin(o, d, far) { RC.set(o, d); RC.far = far; RC.camera = camera; const hs = RC.intersectObjects(scene.children, true); return hs.some(h => h.object.visible && !gui.getObjectById(h.object.id) && h.object.type !== "Points" && h.object.type !== "Sprite" && !(h.object.material && h.object.material.transparent && h.object.material.opacity < .3)); }
  function clearSpot(T, a, eye) {
    const head = new THREE.Vector3(a.x, a.y + 1.4, a.z), base = Math.atan2(a.z - T.z, a.x - T.x);
    for (const r of [1.1, 1.6, 2.4]) for (let k = 0; k < 12; k++) { const ang = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6;
      O3.set(T.x + Math.cos(ang) * r, T.y + eye, T.z + Math.sin(ang) * r);
      let bad = false; for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) if (hitWithin(O3, D3.set(...d), .6)) { bad = true; break; }
      if (bad) continue; D3.subVectors(head, O3); const L = D3.length(); if (hitWithin(O3, D3.normalize(), L - .5)) continue; return O3.clone(); }
    return camera.position.clone();
  }
  function newGoal(M, a) { if (!M.r) return new THREE.Vector3(a.x, a.y + (P_EYE() || 1.5), a.z);
    let g = null; for (let k = 0; k < 4; k++) { const ang = rnd(0, Math.PI * 2), r = rnd(M.r[0], M.r[1]); g = new THREE.Vector3(a.x + Math.cos(ang) * r, a.y + rnd(M.h[0], M.h[1]), a.z + Math.sin(ang) * r);
      if (!hitWithin(g, D3.set(0, 1, 0), M.h[1] < .6 ? .9 : .4) && !hitWithin(g, D3.set(a.x - g.x, 0, a.z - g.z).normalize(), Math.max(.1, Math.hypot(a.x - g.x, a.z - g.z) - .6))) return g; }   // 植え込み・物の中や陰に入らない
    return S.pose?.home ? S.pose.home.clone() : g; }   // どこも塞がっていたら、人の立っていた所（開けていると分かっている）
  function stepPose(dt, t) {
    const a = aoiPos(); if (!a) return; const P = S.cur, M = P.motion; if (!M) return;
    const p = S.pose ||= { pos: camera.position.clone(), goal: null, wait: 0, look: new THREE.Vector3(), yawJ: 0 };
    if (!p.goal || (M.r && M.kind !== "still" && p.goal.distanceTo(a) > M.r[1] * 2.2)) { p.goal = newGoal(M, a); p.wait = 0; }
    if (M.kind === "perch" || M.kind === "hop") {   // 止まる → 素早く飛び移る。止まっているあいだも首を小刻みに動かす
      const d = p.pos.distanceTo(p.goal);
      if (d > .05) { const sp = Math.max(d / M.dart, 3); p.pos.lerp(p.goal, Math.min(1, sp * dt / Math.max(d, .001))); }
      else if ((p.wait += dt) > (p.dw ||= rnd(...M.dwell))) { p.goal = newGoal(M, a); p.wait = 0; p.dw = 0; }
      if (Math.random() < dt * 1.4) p.yawJ = rnd(-.35, .35);
    } else if (M.kind === "tree") { if (!p.set) { const T = nearTree(a, M.species); p.tree = T; p.goal.copy(clearSpot(T, a, P.body.eye));   /* 幹に寄りそう位置（幹の中に入らない） */ p.set = 1; } p.pos.lerp(p.goal, Math.min(1, dt * 2)); p.yawJ = 0;   // 木：幹のそば・枝の下の高さ
    } else if (M.kind === "still") { if (!p.set) { camera.getWorldDirection(V2); V2.y = 0; V2.normalize(); p.goal.set(a.x + V2.x * 4.5 + V2.z * 1.2, a.y + M.h[0], a.z + V2.z * 4.5 - V2.x * 1.2); p.set = 1;   /* 碧の 4.5 m 先・道の脇。碧がこちらへ歩いて来て通り過ぎる */ } p.pos.lerp(p.goal, Math.min(1, dt * 2)); p.yawJ = 0;   // 石：動かない（碧が歩いて離れていく）
    } else {   // ホバリング：ゆれながら、花から花のように小さく移る
      p.pos.lerp(p.goal, Math.min(1, dt * .9 * M.speed)); p.pos.y += Math.sin(t * 9.1) * .004; p.pos.x += Math.sin(t * 6.3) * .006;
      if (p.pos.distanceTo(p.goal) < .25) p.goal = newGoal(M, a); p.yawJ = Math.sin(t * 2.3) * .25;
    }
    if (M.kind === "tree" && p.tree) V2.set(a.x * .3 + p.tree.x * .7, a.y + 2.4, a.z * .3 + p.tree.z * .7);   /* 幹の流れと碧が、どちらも視野に入る向き */   /* 碧の方を、少し見上げる（枝先の粒が視野の上に入る） */ else V2.set(a.x, a.y + (M.kind === "still" || P.body.eye < .6 ? 1.0 : 1.1), a.z); p.look.lerp(V2, Math.min(1, dt * 3));   // 碧の方を見る
  }
  /* ---- 描く直前：視点を依代へ（k で人の視点と混ぜる）・描いたあと戻す ---- */
  const Q0 = new THREE.Quaternion(), Q1 = new THREE.Quaternion(), M4 = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
  const pb = scene.onBeforeRender, pa = scene.onAfterRender;
  /* 腕のゆとり（採点「腕が体にぴったり付いて硬い」）：描く直前にだけ、上腕を体から少し離し肘をわずかに曲げ、描いたあと戻す（AoiMotion の動きはそのまま） */
  const ARM = { on: true, saved: [] }, QA = new THREE.Quaternion(), EZ = new THREE.Vector3(0, 0, 1), EY = new THREE.Vector3(0, 1, 0);
  function armsOn() { const h = QW.AOI?.vrm?.humanoid; if (!h || !ARM.on || QW.mode !== "walk") return; ARM.saved.length = 0;
    const tt = performance.now() / 1000, sway = Math.sin(tt * .9) * .02;
    for (const [n, ax, ang] of [["leftUpperArm", EZ, .13 + sway], ["rightUpperArm", EZ, -.13 - sway], ["leftLowerArm", EY, -.22], ["rightLowerArm", EY, .22]]) {
      const b = h.getNormalizedBoneNode?.(n); if (!b) continue; ARM.saved.push([b, b.quaternion.clone()]); b.quaternion.multiply(QA.setFromAxisAngle(ax, ang)); }
    if (ARM.saved.length) { h.update?.(); QW.AOI.vrm.scene.updateMatrixWorld(true); } }
  function armsOff() { if (!ARM.saved.length) return; for (const [b, q] of ARM.saved) b.quaternion.copy(q); ARM.saved.length = 0; QW.AOI.vrm.humanoid.update?.(); }
  scene.onBeforeRender = function (...a) {
    pb && pb.apply(this, a); armsOn(); if (S.k < .002 || !S.pose) return;
    const k = S.k * S.k * (3 - 2 * S.k), P = S.cur;
    S.saved = { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov };
    M4.lookAt(S.pose.pos, S.pose.look, UP); Q1.setFromRotationMatrix(M4); Q1.multiply(Q0.setFromAxisAngle(UP, S.pose.yawJ * .4));
    camera.position.lerp(S.pose.pos, k); camera.quaternion.slerp(Q1, k);
    if (P.sight?.fov) camera.fov += (P.sight.fov - camera.fov) * k;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  };
  scene.onAfterRender = function (...a) { pa && pa.apply(this, a); armsOff(); const s = S.saved; if (s) { camera.position.copy(s.p); camera.quaternion.copy(s.q); camera.fov = s.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); S.saved = null; } };
  /* ---- 押す（画面で 44px 以上の範囲） ---- */
  const P3 = new THREE.Vector3(), PC = new THREE.PerspectiveCamera(60, 1, .05, 50);
  function screenOf(o) { o.getWorldPosition(P3); P3.y += .1; P3.project(camera); if (P3.z > 1 || Math.abs(P3.x) > 1.1 || Math.abs(P3.y) > 1.1) return null; return [(P3.x + 1) / 2 * innerWidth, (1 - P3.y) / 2 * innerHeight]; }
  let swallow = false;
  canvas.addEventListener("pointerdown", e => {   // 依代の視点のとき：碧に触れると人の目へ戻る
    if (S.target === 1 && S.pose && QW.mode === "walk") { const a = aoiPos(); if (a) { PC.position.copy(S.pose.pos); PC.fov = S.cur.sight?.fov || camera.fov; PC.aspect = camera.aspect; PC.updateProjectionMatrix(); PC.lookAt(S.pose.look); PC.updateMatrixWorld(); P3.set(a.x, a.y + 1, a.z).project(PC);
      const sx = (P3.x + 1) / 2 * innerWidth, sy = (1 - P3.y) / 2 * innerHeight; if (P3.z < 1 && Math.abs(e.clientX - sx) < 60 && Math.abs(e.clientY - sy) < 140) { e.stopImmediatePropagation(); e.preventDefault(); swallow = true; go("hito"); return; } } }
  }, true);
  canvas.addEventListener("pointerdown", e => {
    if (QW.mode !== "walk" || !gui.visible) return; const R = 26;
    for (const it of [back, ...icons]) { if (!it.g.visible) continue; const s = it.sc; if (s && Math.hypot(e.clientX - s[0], e.clientY - s[1]) < R) { e.stopImmediatePropagation(); e.preventDefault(); swallow = true; go(it.id); return; } }
  }, true);
  for (const ev of ["pointerup", "click"]) addEventListener(ev, e => { if (swallow) { e.stopImmediatePropagation(); e.preventDefault(); if (ev === "pointerup") setTimeout(() => swallow = false, 80); } }, true);
  async function go(id) {
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(10);
    if (id === "hito") { if (S.yb) S.yb.visible = true; if (!opt.xOnly) nextYori(); document.body.classList.remove("hen"); S.target = 0; tag.style.opacity = 0; S.ts = null; tsBox.style.opacity = 0; QW.stopSpeak?.(); return; }
    const P = PROFILES[id];
    S.cur = P; S.pose = null; S.body = await worldBody(P).catch(() => null);
    const a = aoiPos(); if (a) { const home = new THREE.Vector3(camera.position.x, a.y + (P.body?.eye || .3), camera.position.z); const yb = QW.YO?.y?.items?.find(i => i.kind === P.yori)?.root; const from = yb ? yb.getWorldPosition(new THREE.Vector3()).setY(yb.getWorldPosition(new THREE.Vector3()).y + (P.body?.eye || .3) * .6) : home.clone(); if (yb) yb.visible = false; S.yb = yb; S.pose = { home, pos: from, goal: null, wait: 0, look: camera.position.clone(), yawJ: 0 }; }
    S.ts = P.timescale ? { i: -1, t: 0 } : null; if (S.ts) tsBox.style.opacity = 0;
    if (P.cycle) setTimeout(() => S.pose?.tree && S.cur === P && !CY && buildCycle(P, S.pose.tree), 60);
    document.body.classList.add("hen"); S.target = 1; tag.textContent = (P.label || "").split("（")[0] || "模式";   /* 11-03 何の模式か分かる言い方（例：スズメの受けとり方に寄せた模式）。詳しい置きかえは title に */ tag.title = P.label; tag.style.opacity = 1; narrate(P);
  }
  /* ---- 時間の尺度（石）：札を一枚ずつ、時代をさかのぼる。中身は opt.lookup(id) で、アプリのデータ（出典つき）から引く ---- */
  const tsBox = document.createElement("div");
  tsBox.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(max(16px,env(safe-area-inset-bottom)) + " + (innerWidth <= 640 ? 104 : 200) + "px);z-index:5;pointer-events:none;font:300 11px/1 var(--ml-mono,monospace);letter-spacing:.18em;color:rgba(238,242,248,.9);text-shadow:0 0 6px rgba(0,0,0,.6);opacity:0;transition:opacity 1.2s";
  document.body.appendChild(tsBox);
  const esc = x => String(x || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  /* 碧の語り：声＋下の小さな字幕（アプリの speak）。中身の文は henshin_voice.json（_dev/build_voice_henshin.py で作る・読みは確かめ済み） */
  let VO = null; fetch(BASE + "henshin_voice.json?v=2").then(r => r.json()).then(j => VO = j).catch(() => { });
  const speak = (lines, done) => QW.speak ? QW.speak(lines, done) : (say(lines.map(l => l.t).join(" ")), done?.());
  function narrate(P) {
    const v = VO?.[P.id] || []; if (!v.length) return;
    if (!P.timescale) { speak(v); return; }
    const E = P.timescale.entries, lines = [v[0]], marks = [];   // 石：はじめの一言 → 時代ごとにアプリのデータの一行（出典つき・声は既にある）→ 問い
    for (const e of E) { const o = opt.lookup?.(e.id, e.re); if (o) { marks.push([lines.length, e]); lines.push(o); } }
    lines.push(v[v.length - 1]);
    let tt = 0; const T0 = S.ts.tok = Symbol();
    lines.forEach((l, i) => { const m = marks.find(x => x[0] === i); if (m) setTimeout(() => { if (S.ts?.tok !== T0) return; tsBox.textContent = m[1].when; tsBox.style.opacity = 1; S.ts.old = (marks.indexOf(m) + 1) / marks.length; S.ts.sea = m[1].tint === "sea"; lastK = -1; }, tt * 1000); tt += Math.max(3.2, (l.dur || 3) + 1.2); });
    setTimeout(() => { if (S.ts?.tok === T0) tsBox.style.opacity = 0; }, tt * 1000);
    speak(lines);
  }
  /* ---- 循環（木）：細い粒の流れ。粒は 1 つの Points（数百個まで）・CPU で位置だけ動かす ---- */
  function nearTree(a, sp) { const L = opt.trees?.() || []; let b = null, bd = 1e9; for (const t of L) { if (sp && t[3] !== sp) continue; const d = (t[0] - a.x) ** 2 + (t[2] - a.z) ** 2; if (d < bd) { bd = d; b = t; } } return b ? { x: b[0], y: b[1], z: b[2] } : { x: a.x + 4, y: a.y, z: a.z + 2 }; }
  let DOT = null; const dotTex = () => DOT ||= (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.45, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();   // 粒は丸く淡く（四角い点はデジタルに見える）
  let CY = null;
  function buildCycle(P, T) {
    const mon = new Date().getMonth() + 1, flows = P.cycle.flows.filter(f => !f.hold && (!f.months || f.months.includes(mon)));
    const N = flows.reduce((s, f) => s + f.n, 0), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seed = new Float32Array(N), fi = new Uint8Array(N), C = new THREE.Color();
    let i = 0; flows.forEach((f, k) => { C.setHex(f.color); for (let j = 0; j < f.n; j++, i++) { seed[i] = Math.random(); fi[i] = k; col.set([C.r, C.g, C.b], i * 3); } });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex(), alphaTest: .02, size: .2, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true }));
    pts.frustumCulled = false; scene.add(pts);
    CY = { pts, flows, seed, fi, T, N, t: 0 };
  }
  function stepCycle(dt) {
    if (!CY) return; const op = S.target === 1 ? Math.min(.9, S.k) : S.k * .9; CY.pts.material.opacity = op;
    if (S.k < .01 && S.target === 0) { scene.remove(CY.pts); CY.pts.geometry.dispose(); CY = null; return; }
    CY.t += dt; const el = QW.sunAE ? QW.sunAE[1] : 30, sunK = Math.max(0, Math.sin(Math.max(0, el) * Math.PI / 180)), p = CY.pts.geometry.attributes.position.array, T = CY.T, t = CY.t;
    for (let i = 0; i < CY.N; i++) { const f = CY.flows[CY.fi[i]], s = CY.seed[i], a = s * 40 + t * .05, r0 = .12 + s * .1; let x, y, z;
      const u = (s + t * (f.dir === "down" ? .035 : f.dir === "fall" ? .02 : .06)) % 1;
      if (f.sun && sunK < .02) { p[i * 3 + 1] = -1e4; continue; }
      if (f.dir === "up") { x = Math.cos(a) * r0; z = Math.sin(a) * r0; y = -.4 + u * 9; }
      else if (f.dir === "down") { x = Math.cos(a) * (r0 + .05); z = Math.sin(a) * (r0 + .05); y = 8.6 - u * 9; }
      else if (f.dir === "out") { const ca = s * 6.28, cr = 1.5 + (s * 7 % 1) * 3; x = Math.cos(ca) * cr; z = Math.sin(ca) * cr; y = 6 + (s * 13 % 1) * 4 + u * 2.5 * sunK; }
      else if (f.dir === "in") { const ca = s * 6.28, cr = (1.5 + (s * 5 % 1) * 3) * (1.6 - u * .6); x = Math.cos(ca) * cr; z = Math.sin(ca) * cr; y = 6 + (s * 11 % 1) * 4; }
      else { const ca = s * 6.28, cr = 1 + (s * 3 % 1) * 3.5; x = Math.cos(ca) * cr + Math.sin(t * .7 + s * 9) * .2; z = Math.sin(ca) * cr; y = 9 - u * 9; }
      p[i * 3] = T.x + x; p[i * 3 + 1] = T.y + y; p[i * 3 + 2] = T.z + z; }
    CY.pts.geometry.attributes.position.needsUpdate = true;
  }
  /* ---- 縁の光（本人「碧ともっと近づいて、ドラマティックに」）：碧の材質の縁の明るさだけを少し上げる。新しい光源・後処理は足さない ---- */
  let ROBE = false;
  function robeOnce() { const v = QW.AOI?.vrm?.scene; if (!v || ROBE) return; ROBE = true;   // 11-02 採点「衣の下半分が白く飛んで平ら」：自己発光が強く（#858585）陰が消えていた
    v.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) if (/Tops_01_CLOTH/.test(m.name || "")) {
      m.color?.setHex(0xdfe2e4); m.emissive?.setHex(0x1c1f22); m.shadeColorFactor?.setHex(0x7f8a90); if ("shadingToonyFactor" in m) m.shadingToonyFactor = .3; if ("shadingShiftFactor" in m) m.shadingShiftFactor = -.32; m.parametricRimColorFactor?.multiplyScalar(.5); } }); }
  let RIM = false;
  function rimOnce() { const v = QW.AOI?.vrm?.scene || QW.AOI?.root; if (!v || RIM) return; RIM = true;
    v.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) {
      if (m.isMToonMaterial || m.parametricRimColorFactor) { m.parametricRimColorFactor?.setRGB(.42, .46, .5); if ("parametricRimFresnelPowerFactor" in m) m.parametricRimFresnelPowerFactor = 3.2; if ("parametricRimLiftFactor" in m) m.parametricRimLiftFactor = .06; if ("rimLightingMixFactor" in m) m.rimLightingMixFactor = .7; }
    } }); }
  /* ---- 風景に現れる一体（本人「選択式で一体だけ」）：時刻で一体を選び、人の目へ戻るたびに次の一体へ入れ替わる。触れるとそのまま入る ---- */
  let YI = -1, YSHOWN = false;
  function nextYori() { const day = (QW.sunAE ? QW.sunAE[1] : 30) > 0, list = ORDER.filter(id => PROFILES[id]?.yori && (id !== "tanuki" || !day || YI >= 0));
    if (!list.length) return; YI = YI < 0 ? (day ? 0 : Math.max(0, list.indexOf("tanuki"))) : (YI + 1) % list.length; const id = list[YI]; S.offer = id; QW.yoShow?.(PROFILES[id].yori); }
  QW.onYoTouch = kind => { const id = Object.keys(PROFILES).find(k => PROFILES[k].yori === kind); if (id && S.target === 0) { go(id); return true; } return false; };
  /* ---- まいこま ---- */
  let lastK = -1, t = 0, t0 = performance.now();
  function update(dt) {
    t += dt; const walk = QW.mode === "walk", a = aoiPos(); if (walk && a && YSHOWN && S.target === 0 && S.offer && (t - (S.reT || 0)) > 2) { S.reT = t; const yb = QW.YO?.y?.items?.[0]?.root; if (yb && yb.position.distanceTo(a) > 6) QW.yoShow?.(PROFILES[S.offer].yori); }   /* 碧が歩いて離れたら、その一体を碧のそばへ置き直す（ついて来る動きはしない） */ if (walk && a && !YSHOWN && !opt.xOnly && QW.yoShow && QW.YO?.y) { YSHOWN = true; nextYori(); if (!sessionStorage.getItem?.('hs_inv')) { try { sessionStorage.setItem('hs_inv', '1'); } catch { } setTimeout(() => QW.speak?.([{ t: 'そばにいる生き物にふれると、その目で、この道を見られます。' }]), 9000); } } if (!ROBE && walk) robeOnce(); 
    gui.visible = false;   // 11-02 本人「もっと直感的なインターフェイスで」：輪は使わず、風景の中の依代に触れる
    if (gui.visible) {
      camera.getWorldDirection(V2); gui.position.set(a.x + V2.z * .55 - V2.x * .35, a.y + 1.0, a.z - V2.x * .55 - V2.z * .35);   /* 碧の腰の高さ・左横の少し手前（目の高さに置くと遠くの並木と重なって見えた） */   /* 碧の手もとの高さ・碧の体の横（画面の空いた側）に。体と重ならない */   /* 碧の手もとの高さ（下の楕円 GUI・字幕と重ならない） */
      const inC = S.target === 1;
      icons.forEach((it, i) => { it.g.visible = !inC; const ang = t * .12 + i * Math.PI * 2 / Math.max(1, icons.length) + Math.PI * .5; it.front = Math.sin(ang - Math.atan2(camera.position.z - gui.position.z, camera.position.x - gui.position.x) + Math.PI / 2) > .5; it.g.position.set(Math.cos(ang) * .3, .03 + Math.sin(t * 1.3 + i) * .015, Math.sin(ang) * .5); it.g.rotation.y = -ang; it.g.children[0]?.userData.anim?.(t); });
      back.g.visible = false;
      ring.material.opacity = .32 + .1 * Math.sin(t * 1.1);
      for (const it of [back, ...icons]) { it.sc = it.g.visible ? screenOf(it.g) : null; const L = it.label; if (it.sc && S.k < .02 && it.front !== false || it === back && it.sc) { L.style.display = ""; L.style.transform = `translate(${Math.max(8, Math.min(innerWidth - L.offsetWidth - 8, it.sc[0] - L.offsetWidth / 2)) | 0}px,${(it.sc[1] - 30) | 0}px)`; } else L.style.display = "none"; }
    } else for (const it of [back, ...icons]) { it.label.style.display = "none"; it.sc = null; }
    S.k += (S.target - S.k) * Math.min(1, dt * 1.5);   // 約 2 秒でなめらかに移る（光らせない）
    if (S.target === 1 || S.k > .01) stepPose(dt, t); stepCycle(dt);
    if (S.body && S.pose) { const own = !!opt.ownBody && !!S.cur.body3d && opt.ownBody(S.cur.id) !== false;   /* 11-03 大宮 opt.ownBody：X 感で入った生き物の体の先（写実の 3D）を視野の下端に */   /* 自分の体の先は、リアルな部分の 3D（別の担当が用意中）が届くまで出さない（依代の形では何の生き物か分からなかった） */ S.body.visible = own;
      if (own) { D3.subVectors(S.pose.look, S.pose.pos).normalize(); const sz = S.cur.body3d.size || .2; const dd = Math.max(.08, (S.body.userData.len || sz) * .35), tip = S.pose.pos.y - dd * .95 - (S.body.userData.top || sz); S.body.position.set(S.pose.pos.x + D3.x * dd, tip, S.pose.pos.z + D3.z * dd); /* 頭の先だけが視野の下端にのぞく（体の後ろ姿で画面を塞がない） */ S.body.lookAt(S.pose.look.x, S.body.position.y, S.pose.look.z); S.body.userData.animate?.(t, true); } }   /* 自分の体の前の端（頭・嘴・鼻先）が視野の下端に入る位置。体の内側が見えないよう、目より前・下に置く */
    { const on = S.target === 1 && S.k > .6 && S.pose && walk; back.g.visible = on;   /* 戻る印＝髪の色の細い光の輪と葉の房（11 回目の採点：小さな碧の人形は安っぽい→やめた） */
      if (on) { const P0 = S.pose.pos; D3.subVectors(S.pose.look, P0).normalize(); const rx = -D3.z, rz = D3.x, rl = Math.hypot(rx, rz) || 1;
        PC.position.copy(P0); PC.fov = S.cur.sight?.fov || camera.fov; PC.aspect = camera.aspect; PC.updateProjectionMatrix(); PC.lookAt(S.pose.look); PC.quaternion.multiply(Q0.setFromAxisAngle(UP, S.pose.yawJ * .4)); PC.updateMatrixWorld();   /* 描くときと同じ首の振れを入れる（スズメで印がボタンより右にずれた） */
        { const nx = innerWidth < 560 ? .55 : .7, ny = .16;   /* 少し上へ（石の視点で、ボタンの後ろに地面の依代が隠れた） */ P3.set(nx, ny, .5).unproject(PC).sub(P0).normalize(); back.g.position.copy(P0).addScaledVector(P3, .7); back.g.lookAt(P0); back.g.scale.setScalar(64 * 2 * .7 * Math.tan(PC.fov * Math.PI / 360) / (innerHeight * .116));   /* 画面の上でいつも直径およそ 64pt */ back.g.userData.spin.rotation.z = t * .5; for (const [i, l] of back.g.userData.leaf.entries()) l.rotation.y = Math.sin(t * .8 + i) * .5;   /* 葉の房はゆっくり揺れて立体に見える */   /* 印は画面の同じ所（右の中ほど）にいつも全部入る：画面の点から逆に置く */
          back.sc = [(nx + 1) / 2 * innerWidth, (1 - ny) / 2 * innerHeight]; }   /* 依代の視点のカメラで画面の位置を出す */ const L = back.label; if (back.sc) { L.style.display = ""; L.style.transform = `translate(${Math.max(8, Math.min(innerWidth - L.offsetWidth - 8, back.sc[0] - L.offsetWidth / 2)) | 0}px,${(back.sc[1] + 40) | 0}px)`; } } else if (!gui.visible || S.target !== 1) back.label.style.display = back.g.visible ? "" : "none"; }
    { const its = QW.YO?.y?.items || [], sc = back.g.visible && back.sc;   /* 11-02 依代の視点で、地面の依代が「碧へ戻る」の後ろに隠れない：重なる間だけ見えなくする */
      for (const it of its) { const r = it.root; if (!r) continue; let hide = false;
        if (sc) for (const hh of [.15, .6, 1.1, 1.6]) { r.getWorldPosition(P3); P3.y += hh; P3.project(camera); const x = (P3.x + 1) / 2 * innerWidth, y = (1 - P3.y) / 2 * innerHeight; if (P3.z < 1 && Math.abs(x - sc[0]) < 110 && y > sc[1] - 70 && y < sc[1] + 110) { hide = true; break; } }
        if (hide) { if (r.visible) { r.visible = false; r.userData.hsHid = 1; } } else if (r.userData.hsHid) { r.visible = true; r.userData.hsHid = 0; } } }
    if (Math.abs(S.k - lastK) < .004) return; lastK = S.k;
    const k = S.k, P = S.cur;
    if (k < .01 || !(P.sight?.mix ?? 1)) { canvas.style.filter = ""; veil.style.opacity = 0; if (S.target === 0) S.pose = null; return; }
    let m = LENS[P.sight?.lens || "hito"]?.m || LENS.hito.m; if (S.ts?.old) { const o = S.ts.old * .7, w = [.2126, .7152, .0722], sep = [1.07, 1, .82]; m = [0, 1, 2].flatMap(i => [0, 1, 2].map(j => ((i === j ? 1 - o : 0) + o * w[j]) * (1 - o * .3 + o * .3 * sep[i]))); }   // さかのぼるほど色が褪せる（模式）
    const I = [1, 0, 0, 0, 1, 0, 0, 0, 1], km = k * (P.sight?.mix ?? 1), r = m.map((v, i) => I[i] + (v - I[i]) * km);
    fm.setAttribute("values", `${r[0]} ${r[1]} ${r[2]} 0 0 ${r[3]} ${r[4]} ${r[5]} 0 0 ${r[6]} ${r[7]} ${r[8]} 0 0 0 0 0 1 0`); canvas.style.filter = "url(#hsF)";
    const uv = P.sight?.uv || 0, ed = P.sight?.edge || 0;
    veil.style.background = `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(150,120,255,${(.08 * uv).toFixed(3)}) 0%, rgba(150,120,255,${(.18 * uv).toFixed(3)}) 60%, rgba(10,12,24,${(.5 * ed).toFixed(3)}) 100%)` + (S.ts?.sea ? ",linear-gradient(rgba(90,150,170,.28),rgba(60,120,150,.34))" : "") + (P.sight?.dark ? `,linear-gradient(rgba(4,6,14,${P.sight.dark}),rgba(4,6,14,${P.sight.dark}))` : "");   // 夜に動く生き物：暗さの模式   // 浅い海の底だったころ（模式） veil.style.opacity = k.toFixed(3);
  }
  (function loop(tt) { try { update(Math.min(.05, (tt - t0) / 1000)); } catch (e) { if (!loop.w) { loop.w = 1; console.warn("henshin", e); } } t0 = tt; requestAnimationFrame(loop); })(t0);
  QW.henshin = { go, state: S, profiles: PROFILES, gui, back };
  return QW.henshin;
}
