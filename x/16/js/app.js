/* Qualia/sound ── 聴こえない音（仮）・v1・2026-10-27
   写実の地（樹皮・土・岩の CC0 の質感）に、音を「波・粒・光」のデジタルの層として重ねる。
   音はすべて再現音（js/synth.js）。押すまで鳴らない。碧は 3D で立ち、指して見せる（声の録音はまだ無いので字幕で語る）。 */
import * as THREE from "three";
import { SOURCES } from "../data/sources.js";
import { Synth } from "./synth.js";

const $ = s => document.querySelector(s);
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = () => innerWidth < 760;

// ---------- 描画の土台 ----------
const cv = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.25 : 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.75;
renderer.shadowMap.enabled = false;   // 起動 5 秒のため影の地図は使わない（光と霧で形を出す） renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const BG = new THREE.Color(0x13202e); scene.background = BG; scene.fog = new THREE.FogExp2(0x16222f, .035);
const camera = new THREE.PerspectiveCamera(42, 1, .05, 200);
const hemi = new THREE.HemisphereLight(0xb8d4e4, 0x3a2c1c, 1.6); scene.add(hemi);
const key = new THREE.DirectionalLight(0xffe2c0, 1.6); key.position.set(4, 7, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 30 }); scene.add(key);
const rim = new THREE.DirectionalLight(0x5cc8e0, .9); rim.position.set(-5, 3, -4); scene.add(rim);

// 質感（CC0・Poly Haven。台帳 M-0899）
const TL = new THREE.TextureLoader();
const tex = (u, rep = 1, srgb = true) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const soilT = tex("tex/soil_forest.webp", 6), barkT = tex("tex/bark_zelkova.webp"), barkN = tex("tex/bark_zelkova_n.webp", 1, false), rockT = tex("tex/rock_surface.webp", 2), rockN = tex("tex/rock_surface_n.webp", 2, false);
const barkR = tex("tex/bark_zelkova_r.webp", 1, false), rockR = tex("tex/rock_surface_r.webp", 2, false);
const leafG = tex("tex/leaves_ground.webp", 14), leafGN = tex("tex/leaves_ground_n.webp", 14, false), leafGR = tex("tex/leaves_ground_r.webp", 14, false);
const fsT = tex("tex/farm_soil.webp", 1), fsN = tex("tex/farm_soil_n.webp", 1, false), mossT = tex("tex/moss_wood.webp", 1), mossN = tex("tex/moss_wood_n.webp", 1, false);
barkT.repeat.set(2, 3); barkN.repeat.set(2, 3); barkR.repeat.set(2, 3);
// 幹の形：まっすぐな筒でなく、根張り・ゆるい凹凸・わずかな曲がりのある形（v7）
function trunkGeo(rTop, rBot, h, seg = 40, hs = 24, seed = 1) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, hs), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = (y + h / 2) / h, r = Math.hypot(x, z); if (r < 1e-4) continue;
    const flare = 1 + Math.pow(Math.max(0, .18 - t) / .18, 2) * (.55 + .25 * Math.sin(a * 5 + seed)), bump = 1 + .045 * Math.sin(a * 7 + t * 9 + seed) + .03 * Math.sin(a * 13 - t * 17 + seed * 2);
    const k = flare * bump; p.setX(i, x * k + Math.sin(t * 3 + seed) * .04 * h * t); p.setZ(i, z * k + Math.cos(t * 2.3 + seed) * .025 * h * t); }
  g.computeVertexNormals(); return g;
}

// 地面（森の地面の写真の質感・ゆるい起伏）
const ground = (() => {
  const g = new THREE.PlaneGeometry(60, 60, 120, 120); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, (Math.sin(x * 2.1 + z * 1.7) * .018 + Math.sin(x * 4.3 - z * 3.1) * .009) + (r < 3 ? 0 : (Math.sin(x * .35) * Math.cos(z * .3) * .25 + Math.sin(x * .9 + z * .7) * .06) * Math.min(1, (r - 3) / 4))); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: leafG, normalMap: leafGN, normalScale: new THREE.Vector2(1.3, 1.3), roughnessMap: leafGR, roughness: 1, color: 0x9a8c7c })); m.receiveShadow = true; scene.add(m); return m;
})();

// 遠くの木立（樹皮の質感の幹・写実の地）
const barkMat = new THREE.MeshStandardMaterial({ map: barkT, normalMap: barkN, normalScale: new THREE.Vector2(1.5, 1.5), roughnessMap: barkR, roughness: 1, color: 0xb8a898 });
const mossMat = new THREE.MeshStandardMaterial({ map: mossT, normalMap: mossN, roughness: 1, color: 0xa0a890, transparent: true, opacity: .85 });
{
  const r = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = 9 + r() * 22, h = 7 + r() * 9, rad = .14 + r() * .28, X = Math.cos(a) * d, Z = Math.sin(a) * d - 4;
    if ([[0, 0], [14, -6], [-14, -5], [-6, -16], [7, -18], [0, 14], [0, 26], [20, 2], [-12, 0], [-4, -13], [10, -10], [4, 8]].some(([u, w]) => Math.hypot(X - u, Z - w) < 6.5)) continue;
    const m = new THREE.Mesh(trunkGeo(rad * .7, rad, h, 14, 10, i), barkMat); m.position.set(X, h / 2 - .1, Z); m.rotation.z = (r() - .5) * .05; m.castShadow = false; scene.add(m);
  }
}

// ---------- デジタルの層の共通部品 ----------
const AOI = 0x5cc8e0;
const additive = (color, op = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
// 輪の波（広がって消える）
const waves = [];
const AMBER = 0xf2cf8c;   // 輪は一種類＝「音の出た所（再現）」・色は琥珀一色
function ring(pos, _c, { r0 = .05, r1 = 2, life = 1.4, axis = "y", width = .012, op = .9 } = {}) {
  const m = new THREE.Mesh(new THREE.RingGeometry(1 - width * 8, 1, 64), additive(AMBER, op));
  if (axis === "y") m.rotation.x = -Math.PI / 2; else if (axis === "z") {} else if (axis instanceof THREE.Quaternion) m.quaternion.copy(axis);
  m.position.copy(pos); m.scale.setScalar(r0); scene.add(m); waves.push({ m, r0, r1, life, t: 0, op }); return m;
}
// 球の殻の波（立体で広がる）
function shell() { return; }   // 網目の殻は使わない（v5）
function _shellOld(pos, color, { r1 = 1, life = 1, op = .35 } = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true }));
  m.position.copy(pos); m.scale.setScalar(.01); scene.add(m); waves.push({ m, r0: .01, r1, life, t: 0, op });
}
// 粒（光の点が昇る・散る）
const PN = 900, pPos = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pCol = new Float32Array(PN * 3);
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
const dot = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.3, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .06, map: dot, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
pts.frustumCulled = false; scene.add(pts); let pi = 0; for (let i = 0; i < PN; i++) pPos[i * 3 + 1] = -99;
function burst(pos, color, n = 20, { speed = .6, up = .4, life = 1.2, spread = 1 } = {}) {
  const c = new THREE.Color(color);
  for (let k = 0; k < n; k++) { const i = pi = (pi + 1) % PN, a = Math.random() * Math.PI * 2, e = (Math.random() - .5) * Math.PI * spread, s = speed * (.3 + Math.random());
    pPos.set([pos.x, pos.y, pos.z], i * 3); pVel.set([Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + up, Math.sin(a) * Math.cos(e) * s], i * 3); pLife[i] = life * (.5 + Math.random() * .5); pCol.set([c.r, c.g, c.b], i * 3); }
}
// 葉の板（キャンバスに描いた葉の形の切り抜き。樹冠を葉の群れで作る）
const leafTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  for (let i = 0; i < 7; i++) { x.save(); x.translate(64 + (Math.random() - .5) * 50, 64 + (Math.random() - .5) * 50); x.rotate(Math.random() * 6.3); const g = x.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, "#5d7444"); g.addColorStop(1, "#2f4426"); x.fillStyle = g;
    x.beginPath(); x.moveTo(0, -30); x.quadraticCurveTo(14, -6, 0, 30); x.quadraticCurveTo(-14, -6, 0, -30); x.fill(); x.strokeStyle = "rgba(20,30,15,.6)"; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -28); x.lineTo(0, 28); x.stroke(); x.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function leafCloud(n, rx, ry, rz, tint = 0xffffff) {
  const g = new THREE.PlaneGeometry(.55, .55), m = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: .5, side: THREE.DoubleSide, roughness: .7, color: tint });
  const im = new THREE.InstancedMesh(g, m, n), d = new THREE.Object3D();
  for (let i = 0; i < n; i++) { let v; do { v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1); } while (v.length() > 1); v.multiply(new THREE.Vector3(rx, ry, rz)); d.position.copy(v); d.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); d.scale.setScalar(.6 + Math.random() * .7); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  im.castShadow = true; return im;
}
// 札（明朝の小さな字。3D の中の注記）
function label(text, color = "#9bdcf0", w = 512) {
  const c = document.createElement("canvas"); c.width = w; c.height = 96; const x = c.getContext("2d");
  x.font = '500 40px "Shippori Mincho","Hiragino Mincho ProN",serif'; x.fillStyle = color; x.textBaseline = "middle"; x.fillText(text, 8, 48);
  x.fillStyle = "rgba(155,220,240,.5)"; x.fillRect(8, 86, Math.min(w - 16, x.measureText(text).width), 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(w / 96 * .14, .14, 1); s.center.set(0, .5); s.visible = false; return s;   // 3D の中に小さな字は浮かべない（数値は板と字幕に書く）
}

// ---------- 六つの場面 ----------
const V = {}; // id → { group, cam:[pos,target], aoi:[x,z], focus:v3, on(kind,v), tick(t,dt,lv) }
const stageAt = new THREE.Vector3(0, 0, 0);

// 1. 導管が切れる音：幹と、浮かぶ拡大した断面（年輪と導管）
V.ae = (() => {
  const G = new THREE.Group(); scene.add(G);
  const trunk = new THREE.Mesh(trunkGeo(.42, .5, 3.2, 64, 32, 3), barkMat); trunk.position.y = 1.6; trunk.castShadow = true; G.add(trunk);
  // 断面の板（年輪をキャンバスに描く・木口の写実）
  const c = document.createElement("canvas"); c.width = c.height = 1024; const x = c.getContext("2d");
  const gr = x.createRadialGradient(512, 512, 0, 512, 512, 512); gr.addColorStop(0, "#b48a5e"); gr.addColorStop(.85, "#c9a273"); gr.addColorStop(.93, "#6b4a30"); gr.addColorStop(1, "#3a281a"); x.fillStyle = gr; x.beginPath(); x.arc(512, 512, 510, 0, 7); x.fill();
  for (let r = 18; r < 470; r += 14 + Math.random() * 16) { x.strokeStyle = `rgba(90,58,30,${.25 + Math.random() * .3})`; x.lineWidth = 2 + Math.random() * 4; x.beginPath(); for (let a = 0; a <= 6.3; a += .05) { const rr = r + Math.sin(a * 3 + r) * 3 + Math.sin(a * 7) * 1.5; a ? x.lineTo(512 + Math.cos(a) * rr, 512 + Math.sin(a) * rr) : x.moveTo(512 + Math.cos(a) * rr, 512 + Math.sin(a) * rr); } x.closePath(); x.stroke(); }
  for (let i = 0; i < 2600; i++) { const a = Math.random() * 6.3, r = Math.random() * 470; x.fillStyle = `rgba(70,45,25,${Math.random() * .35})`; x.fillRect(512 + Math.cos(a) * r, 512 + Math.sin(a) * r, 2, 2); }
  const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace;
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .08, 96), [new THREE.MeshStandardMaterial({ map: barkT, color: 0x6b5848, roughness: .9 }), new THREE.MeshStandardMaterial({ map: ct, roughness: .7 }), new THREE.MeshStandardMaterial({ map: ct, roughness: .7 })]);
  disk.position.set(0, 2.25, .9); disk.rotation.x = Math.PI / 2 - .25; disk.castShadow = true; G.add(disk);
  // 拡大の線（幹から断面へ）
  const lm = new THREE.LineBasicMaterial({ color: AOI, transparent: true, opacity: .35 });
  for (const s of [-1, 1]) G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.42 * s, 2.2, .2), new THREE.Vector3(1 * s, 2.25, .9)]), lm));
  // 導管（断面の上の小さな穴・光るもの）
  const vessels = []; const VN = 140, im = new THREE.InstancedMesh(new THREE.CircleGeometry(.018, 10), additive(0x8fe3ff, .55), VN);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.25, 0, 0)), dm = new THREE.Matrix4();
  for (let i = 0; i < VN; i++) { const a = Math.random() * 6.3, r = .12 + Math.sqrt(Math.random()) * .8, lp = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, .045).applyQuaternion(q).add(disk.position); vessels.push({ p: lp, s: 1, f: 0 }); }
  const upd = () => { vessels.forEach((v, i) => { dm.compose(v.p, q, new THREE.Vector3(v.s, v.s, v.s)); im.setMatrixAt(i, dm); }); im.instanceMatrix.needsUpdate = true; };
  upd(); G.add(im); im.frustumCulled = false;
  const L = label("断面（拡大）：導管", "#9bdcf0"); L.position.set(-1.9, 3.3, .7); G.add(L);
  const nrm = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  return { group: G, cam: [[2.6, 2.4, 4.6], [0, 2, .5]], camM: [[1.8, 2.6, 6.6], [0, 2, .4]], aoi: [-1.7, 1.3], focus: disk.position.clone(),
    on(k, v) { const t = vessels[Math.random() * VN | 0]; t.f = 1; const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
      ring(t.p.clone().addScaledVector(nrm, .01), 0x8fe3ff, { r0: .02, r1: .35 + v * .4, life: .9, axis: qq, width: .02 });
      if (k === "ae") { burst(t.p, 0xbff2ff, 10 + v * 16 | 0, { speed: .35, up: .25, life: 1.3 }); shell(new THREE.Vector3(0, 2.0, 0), 0x5cc8e0, { r1: 1.6 + v, life: 1.1, op: .12 }); } },
    tick(t, dt) { for (const v of vessels) { v.f = Math.max(0, v.f - dt * 2.5); v.s = 1 + v.f * 2.6; } upd(); im.material.opacity = .45 + .1 * Math.sin(t * 2); } };
})();

// 2. 幹のゆれ：高い木がゆれ、根もとから輪がゆっくり広がる。ゆれの線を描く
V.sway = (() => {
  const G = new THREE.Group(); G.position.set(14, 0, -6); scene.add(G);
  const pivot = new THREE.Group(); G.add(pivot);
  const h = 7.5, tr = new THREE.Mesh(trunkGeo(.16, .34, h, 32, 24, 5), barkMat); tr.position.y = h / 2; tr.castShadow = true; pivot.add(tr);
  // 枝ぶり（簡単な枝と葉の塊は、写実を損なわない暗い影として）
  const leafM = new THREE.MeshStandardMaterial({ color: 0x31402c, roughness: 1, transparent: true, opacity: .92 });
  const crown = new THREE.Group(); crown.position.y = h; pivot.add(crown);
  for (let i = 0; i < 6; i++) { const a = i * 1.05, br = new THREE.Mesh(new THREE.CylinderGeometry(.03, .08, 1.8, 8), barkMat); br.position.set(Math.cos(a) * .6, -.4 + i * .12, Math.sin(a) * .6); br.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); crown.add(br); }
  crown.add(leafCloud(mobile() ? 700 : 1400, 2.1, 1.3, 2.1));
  const N = 160, tp = new Float32Array(N * 3), tline = new THREE.BufferGeometry(); tline.setAttribute("position", new THREE.BufferAttribute(tp, 3));
  const trace = new THREE.Line(tline, new THREE.LineBasicMaterial({ color: 0x9fd6a8, transparent: true, opacity: .8 })); trace.position.set(-3.2, 4.2, 0); G.add(trace);
  const L = label("ゆれ（樹冠の左右）0.3 Hz 前後", "#bfe8c4"); L.position.set(-3.2, 5.1, 0); G.add(L);
  let amp = .02, hist = [];
  return { group: G, cam: [[14 + 7, 3.2, -6 + 11], [14, 4.2, -6]], camM: [[14 + 7, 3.4, -6 + 16], [14, 4.4, -6]], aoi: [12, -3.5], focus: new THREE.Vector3(14, 6, -6),
    on(k, v) { amp = .03 + v * .07; for (let i = 0; i < 2; i++) setTimeout(() => ring(new THREE.Vector3(14, .03, -6), 0x9fd6a8, { r0: .4, r1: 5 + v * 3, life: 3.5, width: .004, op: .45 }), i * 700); burst(new THREE.Vector3(14 + (Math.random() - .5) * 2, h, -6), 0xcfe8b0, 14, { speed: .5, up: -.1, life: 2.2 }); },
    tick(t, dt, lv) { amp += (.012 - amp) * dt * .25; const a = Math.sin(t * 2 * Math.PI * .32) * amp + Math.sin(t * 1.3) * amp * .2; pivot.rotation.z = a; pivot.rotation.x = Math.sin(t * .7) * amp * .3;
      hist.push(a); if (hist.length > N) hist.shift(); for (let i = 0; i < N; i++) { const y = (hist[i] ?? 0) * 18; tp[i * 3] = i / N * 2.8; tp[i * 3 + 1] = y; tp[i * 3 + 2] = 0; } tline.attributes.position.needsUpdate = true; } };
})();

// 3. 土の中の生き物：切り取った土の塊（層位）・根・はう生き物の光
V.soil = (() => {
  const G = new THREE.Group(); G.position.set(-14, 0, -5); scene.add(G);
  const layers = [[.25, 0x6a5038, "A0 落ち葉の層"], [.75, 0x8a6a4c, "A 黒い土"], [1.0, 0xc09a70, "B 下の土"]]; let y = 0;
  for (const [hh, col, nm] of layers) { const m = new THREE.Mesh(new THREE.BoxGeometry(3, hh, 2.2), new THREE.MeshStandardMaterial({ map: (hh < .3 ? leafG : fsT).clone(), normalMap: (hh < .3 ? leafGN : fsN).clone(), normalScale: new THREE.Vector2(1.4, 1.4), color: col, roughness: 1 })); for (const t of [m.material.map, m.material.normalMap]) { t.repeat.set(3, hh * 2.2); t.needsUpdate = true; } y -= hh; m.position.set(0, 1.7 + y + hh / 2, 0); m.castShadow = true; m.receiveShadow = true; G.add(m);
    const L = label(nm, "#e8cfa8", 384); L.position.set(1.62, 1.7 + y + hh / 2, 1.12); L.scale.multiplyScalar(.75); G.add(L); }
  // 石（岩の質感）
  const rm = new THREE.MeshStandardMaterial({ map: rockT, normalMap: rockN, roughnessMap: rockR, roughness: 1, color: 0x9a948a });
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(.05 + Math.random() * .09, 1), rm); s.position.set((Math.random() - .5) * 2.8, .05 + Math.random() * 1.2, 1.1 + Math.random() * .02); G.add(s); }
  // 根（前の面から見える細い管）
  const rootM = new THREE.MeshStandardMaterial({ color: 0xd8c3a0, roughness: .7 });
  const rootPts = [];
  for (let k = 0; k < 6; k++) { let p = new THREE.Vector3((k - 2.5) * .45, 1.72, 1.11); const arr = [p.clone()]; for (let i = 0; i < 7; i++) { p = p.clone().add(new THREE.Vector3((Math.random() - .5) * .25, -.2 - Math.random() * .08, 0)); p.z = 1.11; arr.push(p); } rootPts.push(arr);
    G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arr), 40, .012 + Math.random() * .01, 6), rootM)); }
  // はう生き物（小さな光る楕円・前の面の少し奥）
  const bugs = []; for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(.012, .05, 4, 8), new THREE.MeshStandardMaterial({ color: 0xc89a7a, emissive: 0x6a3a20, roughness: .5 })); m.rotation.z = Math.PI / 2; const b = { m, x: (Math.random() - .5) * 2.6, y: .2 + Math.random() * 1.4, a: Math.random() * 6.3, v: .05 + Math.random() * .1 }; G.add(m); bugs.push(b); }
  { const lg = label("輪＝音の出た所（模式）", "#c3cce0", 520); lg.position.set(-1.5, 2.0, 1.1); lg.scale.multiplyScalar(.7); G.add(lg); }
  const lab = label("針（接触マイク）", "#9bdcf0", 420); const probe = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0xc8d2dc, metalness: .9, roughness: .3 })); probe.position.set(.9, 1.6, .7); G.add(probe); lab.position.set(.95, 2.45, .7); lab.scale.multiplyScalar(.8); G.add(lab);
  return { aoiSide: -.75, group: G, cam: [[-14 + 1.4, 1.8, -5 + 5], [-14, 1.1, -5 + .6]], camM: [[-14 + 1, 2.2, -5 + 7.4], [-14, 1.2, -5 + .6]], aoi: [-16.6, -3.6], focus: new THREE.Vector3(-14, 1, -4),
    on(k, v) { const b = bugs[Math.random() * bugs.length | 0]; const wp = new THREE.Vector3(b.x - 14, b.y, -5 + 1.13);
      if (k === "dig") { ring(wp, 0xffd9a0, { r0: .02, r1: .25 + v * .5, life: .8, axis: "z", width: .02 }); burst(wp, 0xe8b880, 6, { speed: .15, up: 0, life: .7 }); b.v = .2; }
      else { ring(new THREE.Vector3(.9 - 14, 1.0, -5 + .7), AOI, { r0: .02, r1: .3, life: .5, axis: "z" }); } },
    tick(t, dt) { for (const b of bugs) { b.a += (Math.random() - .5) * dt * 3; b.v += (.06 - b.v) * dt; b.x = THREE.MathUtils.clamp(b.x + Math.cos(b.a) * b.v * dt, -1.4, 1.4); b.y = THREE.MathUtils.clamp(b.y + Math.sin(b.a) * b.v * dt, .1, 1.55); b.m.position.set(b.x, b.y, 1.125); b.m.rotation.z = b.a; } } };
})();

// 4. 茎をつたう虫の声：茎と葉・小さな虫・振動の光が茎を走る
V.vib = (() => {
  const G = new THREE.Group(); G.position.set(-6, 0, -16); scene.add(G);
  const pts = []; for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector3(Math.sin(i * .5) * .12, i * .2, Math.cos(i * .4) * .06));
  const curve = new THREE.CatmullRomCurve3(pts), stemM = new THREE.MeshStandardMaterial({ color: 0x6e8a4a, roughness: .6 });
  { const tg = new THREE.TubeGeometry(curve, 80, .025, 12), tp = tg.attributes.position, nrm = tg.attributes.normal; for (let i = 0; i < tp.count; i++) { const seg = Math.floor(i / 13) / 80, k = .55 - .5 * seg; tp.setXYZ(i, tp.getX(i) - nrm.getX(i) * .025 * (1 - k - .45) , tp.getY(i) - nrm.getY(i) * .025 * (1 - k - .45), tp.getZ(i) - nrm.getZ(i) * .025 * (1 - k - .45)); } tg.computeVertexNormals(); G.add(new THREE.Mesh(tg, stemM)); }
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(.16, .22, 0, .55); leafShape.quadraticCurveTo(-.16, .22, 0, 0);
  const leafM = new THREE.MeshStandardMaterial({ color: 0x55743c, roughness: .55, side: THREE.DoubleSide });
  for (let i = 2; i < 10; i += 1.3) { const p = curve.getPoint(i / 10), lg = new THREE.ShapeGeometry(leafShape, 16), lp = lg.attributes.position; for (let j = 0; j < lp.count; j++) { const x = lp.getX(j), y = lp.getY(j); lp.setZ(j, x * x * 3.2 + Math.sin(y / .55 * Math.PI) * .03); } lg.computeVertexNormals(); const l = new THREE.Mesh(lg, leafM); l.position.copy(p); l.rotation.set(-.6, i * 2.1, (i % 2 ? 1 : -1) * .9); G.add(l); }
  const bugAt = curve.getPoint(.62), bug = new THREE.Group(); { const cm = new THREE.MeshPhysicalMaterial({ color: 0x4a3c22, roughness: .35, clearcoat: .8, clearcoatRoughness: .3 }); const ab = new THREE.Mesh(new THREE.SphereGeometry(.03, 20, 14), cm); ab.scale.set(1, .75, 1.7); ab.position.z = -.03; bug.add(ab); const th = new THREE.Mesh(new THREE.SphereGeometry(.022, 16, 12), cm); th.position.z = .025; bug.add(th); const hd = new THREE.Mesh(new THREE.SphereGeometry(.014, 14, 10), cm); hd.position.z = .05; bug.add(hd); const lm2 = new THREE.MeshStandardMaterial({ color: 0x2a2014, roughness: .6 }); for (const sx of [-1, 1]) for (const zz of [-.01, .015, .035]) { const lgm = new THREE.Mesh(new THREE.CylinderGeometry(.0025, .002, .05, 5), lm2); lgm.position.set(sx * .028, -.012, zz); lgm.rotation.set(0, 0, sx * 1.1); bug.add(lgm); } for (const sx of [-1, 1]) { const an = new THREE.Mesh(new THREE.CylinderGeometry(.0012, .0012, .05, 4), lm2); an.position.set(sx * .008, .01, .075); an.rotation.set(1.1, 0, sx * .3); bug.add(an); } } bug.position.copy(bugAt).add(new THREE.Vector3(.05, 0, .03)); G.add(bug);
  const beads = []; for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), additive(0xd8f09a, 0)); G.add(m); beads.push({ m, u: 0, dir: 1, life: 0 }); }
  const L = label("振動は茎をつたう（空気へはほとんど出ない）", "#d8f09a", 760); L.position.set(.3, 2.25, 0); L.scale.multiplyScalar(.8); G.add(L);
  let bi = 0;
  return { group: G, cam: [[-6 + 1.6, 1.5, -16 + 2.4], [-6, 1.1, -16]], camM: [[-6 + 1.3, 1.7, -16 + 3.6], [-6, 1.15, -16]], aoi: [-7.4, -14.6], focus: bug.getWorldPosition(new THREE.Vector3()),
    on(k, v) { for (const d of [1, -1]) { const b = beads[bi = (bi + 1) % beads.length]; b.u = .62; b.dir = d; b.life = 1; } bug.scale.setScalar(1.08); setTimeout(() => bug.scale.setScalar(1), 40); },
    tick(t, dt) { for (const b of beads) { if (b.life <= 0) { b.m.material.opacity = 0; continue; } b.u += b.dir * dt * .9; b.life -= dt * 1.1; if (b.u < 0 || b.u > 1) b.life = 0; else { b.m.position.copy(curve.getPoint(b.u)); b.m.material.opacity = b.life; b.m.scale.setScalar(1 + (1 - b.life) * 1.2); } } } };
})();

// 5. コウモリの声：夜の屋根の上を回るコウモリ・前へ開く音の円錐
V.bat = (() => {
  const G = new THREE.Group(); G.position.set(7, 0, -18); scene.add(G);
  // 家の屋根（漆喰ではなく、岩の質感の重い屋根の影）
  // 家は置かず、夜の木立の上を飛ぶ（展示の余白）
  const bat = new THREE.Group(); bat.scale.setScalar(5.5); const batLight = new THREE.PointLight(0xc8bcff, 3, 4, 1.5); bat.add(batLight); G.add(bat); const lamp = new THREE.PointLight(0xffc98a, 6, 8, 1.6); lamp.position.set(.6, 1.6, 2.6); G.add(lamp);
  const wm = new THREE.MeshStandardMaterial({ color: 0x5a4840, emissive: 0x2a201a, roughness: .55, side: THREE.DoubleSide });
  // 翼：腕と指の骨のあいだに膜。左右対称（右を作って鏡に写す）。座標は翼の面（x＝外へ・y＝前へ）
  const SH = [.02, .03], WR = [.15, .07], TIPS = [[.33, .02], [.29, -.08], [.19, -.115]], FOOT = [.045, -.075];
  const ws = new THREE.Shape(); ws.moveTo(SH[0], SH[1]); ws.lineTo(WR[0], WR[1]); ws.lineTo(TIPS[0][0], TIPS[0][1]);
  ws.quadraticCurveTo(.28, -.02, TIPS[1][0], TIPS[1][1]); ws.quadraticCurveTo(.22, -.06, TIPS[2][0], TIPS[2][1]); ws.quadraticCurveTo(.1, -.06, FOOT[0], FOOT[1]); ws.lineTo(.02, -.05); ws.lineTo(SH[0], SH[1]);
  const bm = new THREE.MeshStandardMaterial({ color: 0x241a16, roughness: .6 }), up = new THREE.Vector3(0, 1, 0);
  const bone = (a, b, r) => { const A = new THREE.Vector3(a[0], a[1], .002), B = new THREE.Vector3(b[0], b[1], .002), d = B.clone().sub(A), m = new THREE.Mesh(new THREE.CylinderGeometry(r * .7, r, 1, 6), bm); m.scale.y = d.length(); m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(up, d.normalize()); return m; };
  const wing = () => { const w = new THREE.Group(), f = new THREE.Group(); f.rotation.x = -Math.PI / 2; w.add(f); { const mg2 = new THREE.ShapeGeometry(ws, 32), mp2 = mg2.attributes.position; for (let j = 0; j < mp2.count; j++) { const x = mp2.getX(j), y = mp2.getY(j); mp2.setZ(j, -.022 * Math.sin(Math.min(1, x / .33) * Math.PI) * Math.max(0, .1 - Math.abs(y - .0)) * 10); } mg2.computeVertexNormals(); f.add(new THREE.Mesh(mg2, wm)); } f.add(bone(SH, WR, .005)); for (const tp of TIPS) f.add(bone(WR, tp, .0028)); f.add(bone(WR, [.17, .1], .003)); return w; };
  const wrg = wing(), wlg = wing(); wlg.scale.x = -1; bat.add(wrg, wlg);
  { const fur = new THREE.MeshStandardMaterial({ map: soilT, color: 0x8a6a52, roughness: 1 }); const body = new THREE.Mesh(new THREE.SphereGeometry(.035, 14, 10), fur); body.scale.set(1.1, 1, 1.7); bat.add(body);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.022, 14, 10), fur); hd.position.set(0, .005, .058); bat.add(hd);
    for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.014, .045, 10), wm); ear.position.set(.014 * sx, .032, .06); ear.rotation.z = -.35 * sx; bat.add(ear);   // 耳
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.0035, 8, 6), new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: .2 })); eye.position.set(.009 * sx, .012, .078); bat.add(eye);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(.0025, .003, .05, 6), bm); leg.position.set(.03 * sx, 0, -.065); leg.rotation.set(Math.PI / 2, 0, .5 * sx); bat.add(leg); }   // 後ろ脚
    const snout = new THREE.Mesh(new THREE.SphereGeometry(.011, 10, 8), fur); snout.position.set(0, .004, .078); snout.scale.set(1, .8, 1.1); bat.add(snout);
    const moon = new THREE.PointLight(0xdfe6ff, 5, 3, 1.4); moon.position.set(0, -.4, 0); bat.add(moon); }
  const L = label("87→43 kHz の一声（数ミリ秒）", "#cbbfff", 560); L.position.set(-1.8, 5.6, 0); L.scale.multiplyScalar(.85); G.add(L);
  let a = 0;
  return { group: G, cam: [[7 + 2.5, 3.6, -18 + 8.5], [7, 4.6, -18]], camM: [[7 + 3, 3.6, -18 + 10], [7, 4.3, -18]], aoi: [5.0, -14], focus: new THREE.Vector3(7, 4.8, -18),
    on() { const fw = new THREE.Vector3(0, 0, 1).applyQuaternion(bat.quaternion), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), fw), p = bat.getWorldPosition(new THREE.Vector3());
      for (let i = 0; i < 1; i++) setTimeout(() => { const m = ring(p.clone().addScaledVector(fw, .9), 0xb4a2ff, { r0: .1, r1: .7, life: .6, axis: q, width: .01, op: .35 }); m.userData.vel = fw.clone().multiplyScalar(2.4); }, i * 25); },
    tick(t, dt) { a += dt * .5; bat.position.set(Math.sin(a) * 1.3, 4.8 + Math.sin(a * 2) * .25, Math.cos(a) * .4);   // 前でゆっくり八の字に舞う
      bat.lookAt(camera.position); bat.rotateX(-1.05); bat.rotateZ(Math.sin(a) * .18);   // 正面寄り：翼を広げた形がこちらへ向く
      const f = Math.sin(t * 14) * .42; wlg.rotation.z = f; wrg.rotation.z = -f; } };
})();

// 6. ゾウの低い声：遠い林の向こうから、地面と空気を大きな輪がゆっくり渡る
V.ele = (() => {
  const G = new THREE.Group(); G.position.set(0, 0, 14); scene.add(G);
  // 遠景の丘（岩の質感の低い起伏）
  const hill = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: rockT, color: 0x5a5448, roughness: 1 })); hill.scale.set(1.8, .4, 1); hill.position.set(0, -.2, 14); G.add(hill);
  // 圧力の面（空気の濃い薄いを示す、縦に並んだ薄い面）
  const planes = []; for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.2, 1, 1), additive(0xf2cf8c, 0)); m.position.set(0, 1.6, 10 - i * 1.6); G.add(m); planes.push(m); }
  const L = label("14〜24 Hz・一声 10〜15 秒（波長はおよそ 14〜25 m）", "#f2cf8c", 900); L.position.set(-3.6, 3.6, 4); L.scale.multiplyScalar(.85); G.add(L);
  // アジアゾウ（自作の形。肌は岩の質感でしわを出す。肩の高さ約 2.6 m）
  const eT = rockT.clone(), eN = rockN.clone(); eT.repeat.set(5, 5); eN.repeat.set(5, 5); eT.needsUpdate = eN.needsUpdate = true;
  const eM = new THREE.MeshStandardMaterial({ map: eT, normalMap: eN, normalScale: new THREE.Vector2(1.6, 1.6), color: 0x4a443e, roughness: .95 });   // 夕暮れの逆光で、形（影絵）で読ませる
  const ele = new THREE.Group(); ele.position.set(.5, 0, 2.6); ele.rotation.y = 2.63; G.add(ele);   // 横向きに近い 3/4：鼻・耳・背の丸みが影絵で分かる
  const part = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, eM); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, 0, rz); m.castShadow = true; ele.add(m); return m; };
  // アジアゾウの横顔の影絵（肩の高さ約 2.6 m・背の中ほどがいちばん高い・額の二つの山・小さめの耳・地面近くまで垂れる鼻）。厚みのある板に縁の丸みを付け、夕明かりの線で輪郭をなぞる
  const P = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));
  const es = new THREE.Shape(); es.moveTo(-.78, 0); es.lineTo(-1.32, 0); es.lineTo(-1.36, .55);
  es.splineThru(P([[-1.42, 1.15], [-1.56, 1.7], [-1.45, 2.25], [-1.0, 2.55], [-.4, 2.68], [.15, 2.7], [.6, 2.58], [.92, 2.44], [1.12, 2.7], [1.3, 2.82], [1.45, 2.8], [1.6, 2.62], [1.72, 2.25], [1.78, 1.85], [1.82, 1.2], [1.88, .6], [1.98, .22], [2.1, .16], [2.06, .06]]));
  es.splineThru(P([[1.9, .1], [1.74, .45], [1.66, 1.0], [1.6, 1.5], [1.48, 1.62], [1.28, 1.52], [1.12, 1.3]]));
  es.lineTo(1.06, .7); es.lineTo(1.1, 0); es.lineTo(.5, 0); es.lineTo(.52, .55); es.splineThru(P([[.48, .95], [.1, 1.02], [-.4, 1.0], [-.74, .95]])); es.lineTo(-.78, 0);
  const eg = new THREE.ExtrudeGeometry(es, { depth: .7, bevelEnabled: true, bevelThickness: .28, bevelSize: .12, bevelSegments: 6, curveSegments: 24 }); eg.translate(0, 0, -.35);
  const body = new THREE.Mesh(eg, new THREE.MeshStandardMaterial({ map: eT, normalMap: eN, color: 0x6a5e52, emissive: 0x3a2412, roughness: .9, transparent: true, opacity: .38, depthWrite: false })); ele.add(body);   // 半透明の層＝実物ではなく、声の主の影を重ねた像
  const ear = new THREE.Shape(); ear.moveTo(.98, 2.42); ear.splineThru(P([[1.18, 2.46], [1.3, 2.3], [1.26, 1.98], [1.12, 1.72], [1.0, 1.82], [.94, 2.1], [.98, 2.42]]));
  const earM = new THREE.Mesh(new THREE.ExtrudeGeometry(ear, { depth: .04, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 3 }), new THREE.MeshStandardMaterial({ map: eT, normalMap: eN, color: 0x8a7a68, emissive: 0x3a2412, roughness: .9, transparent: true, opacity: .45, depthWrite: false })); earM.position.z = .66; ele.add(earM);
  { const tk = new THREE.Mesh(new THREE.ConeGeometry(.045, .42, 10), new THREE.MeshStandardMaterial({ color: 0xe8dfcc, roughness: .5 })); tk.position.set(1.66, 1.55, .3); tk.rotation.z = 2.3; ele.add(tk); }   // 短い牙
  const rim = new THREE.LineBasicMaterial({ color: 0xffd7a0, transparent: true, opacity: .95 });
  const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(es.getPoints(40).map(v => new THREE.Vector3(v.x, v.y, .66))), rim); ele.add(outline);
  ele.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ear.getPoints(20).map(v => new THREE.Vector3(v.x, v.y, .72))), rim));
  part(new THREE.CylinderGeometry(.03, .05, .8, 8), -1.62, 1.55, 0, 1, 1, 1, 0, -.35);          // 尾
  const head = new THREE.Object3D(); head.position.set(1.4, 2.3, 0); ele.add(head);
  const chest = new THREE.PointLight(0xffc98a, 0, 3, 1.6); chest.position.set(0, 1.6, 1.3); ele.add(chest);
  // 空気の粒（低い声が来ると、前後に大きくゆっくり揺れる＝空気の濃い薄い）
  const MN = 420, mp = new Float32Array(MN * 3), base = new Float32Array(MN * 3);
  for (let i = 0; i < MN; i++) { base.set([(Math.random() - .5) * 12, .1 + Math.random() * 3.2, Math.random() * 12 - 2], i * 3); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ size: .05, map: dot, color: 0xf2cf8c, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); motes.frustumCulled = false; G.add(motes);
  { const sp = new THREE.SpotLight(0xffd7a0, 26, 18, .5, .6, 1.5); sp.position.set(4, 1.2, -2); sp.target = ele; G.add(sp); const rimL = new THREE.SpotLight(0x9bdcf0, 30, 16, .6, .7, 1.5); rimL.position.set(-3, 3.5, 8); rimL.target = ele; G.add(rimL);
    const back = new THREE.SpotLight(0xffc27a, 55, 22, .7, .5, 1.2); back.position.set(-2.5, 3.2, 9); back.target = ele; G.add(back);   // 向こうの夕焼けからの縁の光
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(26, 7), new THREE.MeshBasicMaterial({ color: 0x6a4a34, transparent: true, opacity: .55, depthWrite: false, fog: false })); glow.position.set(0, 2.6, 13); G.add(glow); }   // 地平の夕明かり（影絵の地）
  let pulse = 0;
  return { group: G, cam: [[0 + 4.5, 2.6, 14 - 6.5], [0, 1.4, 14 + 4]], camM: [[0 + 4, 3, 14 - 9], [0, 1.4, 14 + 4]], aoi: [-2.2, 11.2], focus: new THREE.Vector3(-.6, 1.8, 16.6),
    on() { pulse = 1; const hp = head.getWorldPosition(new THREE.Vector3()); for (let i = 0; i < 3; i++) setTimeout(() => shell(hp, 0xf2cf8c, { r1: 6, life: 3.2, op: .07 }), i * 450); for (let i = 0; i < 4; i++) setTimeout(() => ring(new THREE.Vector3(-.6, .05, 16.6), 0xf2cf8c, { r0: 1, r1: 18, life: 4.2, width: .004, op: .45 }), i * 380); },
    tick(t, dt) { pulse = Math.max(0, pulse - dt * .45); chest.intensity = pulse * 6 * (.6 + .4 * Math.sin(t * 9)); for (let i = 0; i < MN; i++) { const z = base[i * 3 + 2]; mp[i * 3] = base[i * 3]; mp[i * 3 + 1] = base[i * 3 + 1]; mp[i * 3 + 2] = z + Math.sin(t * 2.4 - z * .45) * (.03 + pulse * .35); } mg.attributes.position.needsUpdate = true; motes.material.opacity = .25 + pulse * .5;
      planes.forEach((m, i) => { m.material.opacity = .015 + pulse * .16 * (.5 + .5 * Math.sin(t * 2.2 - i * .8)); }); } };
})();
// 波長の確かめ：音速 343 m/s ÷ 14 Hz ≒ 24.5 m、÷ 24 Hz ≒ 14.3 m

// ---------- 音の環（スペクトルを碧の色の点の輪で） ----------
const SPN = 96, spec = new Uint8Array(512), spGeo = new THREE.BufferGeometry(), spP = new Float32Array(SPN * 2 * 3);
spGeo.setAttribute("position", new THREE.BufferAttribute(spP, 3));
const specLines = new THREE.LineSegments(spGeo, new THREE.LineBasicMaterial({ color: 0xf2cf8c, transparent: true, opacity: .55, blending: THREE.AdditiveBlending })); specLines.frustumCulled = false; scene.add(specLines);

// ---------- 碧 ----------
let aoi = null;
async function loadAoiLater() {
  try {
    const { loadAoi } = await import("../kit/aoi.js");
    aoi = await loadAoi("aoi.vrm", { scene, reducedMotion: RM, wind: .25, quality: mobile() ? "mid" : "auto" });
    placeAoi(true);
  } catch (e) { console.warn("碧を読めませんでした", e); }
}

// ---------- 画面 ----------
let cur = SOURCES[0].id, playing = false;
const synth = new Synth();
synth.onEvent = (k, v) => V[cur]?.on(k, v);
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantTgt = new THREE.Vector3();
function camFor(id) { const s = V[id], c = mobile() ? s.camM : s.cam; wantPos.set(...c[0]); wantTgt.set(...c[1]); }
function placeAoi(snap) {
  if (!aoi) return; const s = V[cur];
  // 見る人から見て、焦点の左手前に立つ（どの画面の幅でも枠に入る）
  const dx0 = wantTgt.x - wantPos.x, dz0 = wantTgt.z - wantPos.z, L0 = Math.hypot(dx0, dz0), ux = dx0 / L0, uz = dz0 / L0;
  const k = Math.max(3.4, L0 * (mobile() ? .62 : .78)), side = Math.tan(camera.fov * Math.PI / 360) * k * camera.aspect * (mobile() ? .55 : .62);
  const sg = s.aoiSide ?? 1, x = wantPos.x + ux * k + uz * side * sg, z = wantPos.z + uz * k - ux * side * sg;
  const yaw = Math.atan2(wantPos.x - x, wantPos.z - z);
  if (snap) aoi.motion.teleport ? aoi.motion.teleport(x, z, yaw) : aoi.place(x, z, yaw); else aoi.motion.teleport(x, z, yaw);
  aoi.motion.lookAt?.(s.focus);
  setTimeout(() => { aoi?.motion.point?.(s.focus, 2.2); aoi?.motion.express?.("curious", .5, 2.5); }, 900);
  setTimeout(() => aoi?.motion.lookAt?.(null), 3600);
}
function select(id, first) {
  if (playing) togglePlay(false);
  cur = id; const S = SOURCES.find(s => s.id === id);
  document.querySelectorAll(".src").forEach(b => b.setAttribute("aria-pressed", b.dataset.id === id));
  $("#p-group").textContent = S.group; $("#p-title").textContent = S.title; $("#p-sub").textContent = S.sub;
  $("#p-band").textContent = S.band; $("#p-human").textContent = S.human; $("#p-how").textContent = S.how; $("#p-kit").textContent = S.kit;
  $("#p-what").textContent = S.what; $("#p-note").textContent = S.note;
  $("#p-refs").innerHTML = S.refs.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t.replace(/</g, "&lt;")}</a></li>`).join("");
  $("#cap").innerHTML = `<span class="who">碧</span>${S.aoi}`; $("#cap2").innerHTML = `<span>碧</span>${S.aoi}`; $("#cap").classList.remove("show"); void $("#cap").offsetWidth; $("#cap").classList.add("show");
  document.documentElement.style.setProperty("--src", "#" + S.color.toString(16).padStart(6, "0"));
  camFor(id); if (first) { camPos.copy(wantPos); camTgt.copy(wantTgt); }
  setTimeout(() => placeAoi(false), first ? 0 : 700);
}
function togglePlay(on = !playing) {
  playing = on; const b = $("#play");
  if (on) { synth.start(cur); b.textContent = "止める"; b.setAttribute("aria-pressed", "true"); }
  else { synth.stop(); b.textContent = "訳した音を聴く"; b.setAttribute("aria-pressed", "false"); }
}
// 一覧
$("#list").innerHTML = SOURCES.map(s => `<button class="src" data-id="${s.id}" aria-pressed="false" style="--c:#${s.color.toString(16).padStart(6, "0")}"><span class="g">${s.group}</span><span class="t">${s.title}</span><span class="s">${s.short}</span></button>`).join("");
document.querySelectorAll(".src").forEach(b => b.addEventListener("click", () => select(b.dataset.id)));
$("#play").addEventListener("click", () => togglePlay());
$("#vol").addEventListener("input", e => synth.setVolume(+e.target.value));
$("#more").addEventListener("click", () => { const p = $("#panel"); const o = p.classList.toggle("open"); $("#more").setAttribute("aria-expanded", o); $("#more").textContent = o ? "閉じる" : "くわしく"; });
addEventListener("keydown", e => { if (e.key === " " && e.target === document.body) { e.preventDefault(); togglePlay(); } });
document.addEventListener("visibilitychange", () => { if (document.hidden && playing) togglePlay(false); });

// ---------- 回す ----------
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 760 ? 52 : 42;
  // 板（右の説明・スマホの下の説明）に隠れないよう、絵の中心をずらす
  if (w < 760) camera.setViewOffset(w, h, 0, h * .2, w, h); else camera.setViewOffset(w, h, w * .1, 0, w, h);
  camera.updateProjectionMatrix(); camFor(cur); }
addEventListener("resize", resize); resize();
select(cur, true);
const clock = new THREE.Clock(); let t = 0, drag = 0, dx = 0;
cv.addEventListener("pointerdown", e => { drag = 1; dx = e.clientX; }); addEventListener("pointerup", () => drag = 0);
let orbit = 0; cv.addEventListener("pointermove", e => { if (drag) { orbit = THREE.MathUtils.clamp(orbit + (e.clientX - dx) * .004, -.6, .6); dx = e.clientX; } });
const tmp = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), .05); t += dt;
  const lv = synth.level();
  for (const id in V) V[id].tick(t, dt, lv);
  // 波
  for (let i = waves.length - 1; i >= 0; i--) { const w = waves[i]; w.t += dt; const k = w.t / w.life; if (k >= 1) { scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); waves.splice(i, 1); continue; }
    const e = 1 - Math.pow(1 - k, 2.2); w.m.scale.setScalar(w.r0 + (w.r1 - w.r0) * e); w.m.material.opacity = w.op * (1 - k); if (w.m.userData.vel) w.m.position.addScaledVector(w.m.userData.vel, dt); }
  // 粒
  for (let i = 0; i < PN; i++) { if (pLife[i] <= 0) continue; pLife[i] -= dt; if (pLife[i] <= 0) { pPos[i * 3 + 1] = -99; continue; } for (let j = 0; j < 3; j++) pPos[i * 3 + j] += pVel[i * 3 + j] * dt; pVel[i * 3 + 1] -= dt * .05; pVel[i * 3] *= .985; pVel[i * 3 + 2] *= .985; }
  pGeo.attributes.position.needsUpdate = true;
  // スペクトルの輪（いまの場面の焦点のまわり）
  synth.spectrum(spec); const f = V[cur].focus, R = cur === "ele" ? 3 : cur === "sway" ? 2.2 : cur === "soil" ? 1.9 : 1.25;
  for (let i = 0; i < SPN; i++) { const a = i / SPN * Math.PI * 2, m = playing ? spec[2 + i * 2] / 255 : 0, r0 = R, r1 = R + .02 + m * .6;
    spP.set([f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0 * .0 + (cur === "ele" ? 2.4 : 0), f.z + Math.sin(a) * r0], i * 6); spP.set([f.x + Math.cos(a) * r1, f.y + (cur === "ele" ? 2.4 : 0) + m * .25, f.z + Math.sin(a) * r1], i * 6 + 3); }
  spGeo.attributes.position.needsUpdate = true; specLines.material.opacity = playing ? .32 : .06;
  // カメラ（ゆっくり寄る・指で少し回る）
  const kk = 1 - Math.pow(.06, dt); camPos.lerp(wantPos, kk); camTgt.lerp(wantTgt, kk);
  tmp.copy(camPos).sub(camTgt); tmp.applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit + (RM ? 0 : Math.sin(t * .1) * .04));
  camera.position.copy(camTgt).add(tmp); camera.lookAt(camTgt);
  if (aoi) aoi.tick(dt, camera);
  renderer.render(scene, camera);
  if (!frame.done) { frame.done = 1; setTimeout(() => window.MLLoader?.done(), 120); }
  requestAnimationFrame(frame);
}
window.MLLoader?.progress(.3);
requestAnimationFrame(frame);
// 碧は場面が出てから読む（起動を待たせない）
setTimeout(loadAoiLater, 900);   // 場面が出て落ち着いてから（起動 5 秒のため）
window.__U = { V, SOURCES, select, togglePlay, synth, renderer };
