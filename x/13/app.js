/* Qualia/nature ── 一本のケヤキと足もとの土と水に、自然の記録を層として重ねる。© 2026 mitsulab. All rights reserved.
   2026-10-26 本人「Qualia/nature もアプリを作って公開してください。」
   中身＝Qualium 氷川の自然の層（116 件・nature.json）。文と声（VOICEVOX：冥鳴ひまり・読みは Qualium 氷川の公開時に確かめ済み）はそのまま使う。
   3D＝写実の地（木の形は mitsulab・質感 CC0）に、事実の線（層の色の細い線と点）。木の形・土の層の厚さ・点の位置・季節の色は模式。
   起動：木と土を描いた時点で読み込み画面を閉じる。碧（1.2 秒後）とかさねっこ（2 秒後）はあとから。 */
import * as THREE from "three";

const $ = s => document.querySelector(s);
const MOBILE = Math.min(innerWidth, innerHeight) < 700;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const HUD = new THREE.Color("#88b68f"), BODY = "#6c8d71";
const LAYERS = [
  { id: "tree", name: "木", sub: "並木の樹種と見分け" },
  { id: "soil", name: "土", sub: "台地・ローム・黒い土" },
  { id: "water", name: "水", sub: "湧水と池" },
  { id: "life", name: "生きもの", sub: "鳥・虫・土の中" },
  { id: "season", name: "季節", sub: "葉の一年（模式）" },
];
const on = { tree: true, soil: true, water: true, life: true, season: true };
const POND = { x: 4.1, z: 2.9, r: 1.55 }, R = 7.2, DEPTH = 2.6, TREE_H = 10.5;

// ---- 描く土台
const cv = $("#cv"), stage = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !MOBILE || devicePixelRatio < 2.5, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.autoClear = false;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x03060f); scene.fog = new THREE.Fog(0x03060f, 30, 62);
const camera = new THREE.PerspectiveCamera(MOBILE ? 46 : 38, 1, .1, 200);
const hemi = new THREE.HemisphereLight(0xc8d6e8, 0x1a1408, .9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 2.6); sun.position.set(-9, 16, 8); sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 14, bottom: -6, near: 2, far: 50 }); sun.shadow.bias = -.0006; scene.add(sun);
const rim = new THREE.DirectionalLight(0x8fb6dc, .5); rim.position.set(8, 6, -10); scene.add(rim);

// ---- 土の断面（地層の模式：黒い土 → 赤土〈関東ローム〉→ 凝灰質の粘土。典拠＝n_fushoku・x_loam_nisou）
function strataTex() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const g = c.getContext("2d"), H = 256;
  const bands = [[0, .12, [38, 30, 24]], [.12, .17, [70, 48, 34]], [.17, .66, [128, 74, 44]], [.66, .72, [118, 84, 62]], [.72, 1, [104, 100, 92]]];
  for (const [a, b, [r, gg, bb]] of bands) { g.fillStyle = `rgb(${r},${gg},${bb})`; g.fillRect(0, a * H, 1024, (b - a) * H + 1); }
  const rnd = mulberry(7);
  for (let i = 0; i < 9000; i++) { const y = rnd() * H, x = rnd() * 1024, d = y / H, k = (rnd() - .5) * 46; g.fillStyle = `rgba(${k > 0 ? 255 : 0},${k > 0 ? 240 : 0},${k > 0 ? 220 : 0},${Math.abs(k) / 300})`; g.fillRect(x, y, 1 + rnd() * 3, 1 + rnd() * 2 * (1 - d)); }
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(20,14,8,${.15 + rnd() * .2})`; g.lineWidth = .6 + rnd(); g.beginPath(); let x = rnd() * 1024, y = rnd() * H * .45; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - .5) * 14; y += 4 + rnd() * 10; g.lineTo(x, y); } g.stroke(); }   // 細い根
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); t.anisotropy = 4; return t;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const side = new THREE.Mesh(new THREE.CylinderGeometry(R, R * .97, DEPTH, 128, 1, true), new THREE.MeshStandardMaterial({ map: strataTex(), roughness: .95 }));
side.position.y = -DEPTH / 2; side.receiveShadow = true; scene.add(side);
const bottom = new THREE.Mesh(new THREE.CircleGeometry(R * .97, 96), new THREE.MeshStandardMaterial({ color: 0x3c3a36, roughness: 1 })); bottom.rotation.x = Math.PI / 2; bottom.position.y = -DEPTH; scene.add(bottom);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: .96 });
const ground = new THREE.Mesh(new THREE.CircleGeometry(R, 128), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
new THREE.TextureLoader().load("tex/leaves.jpg", t => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.2, 3.2); t.anisotropy = 8; groundMat.map = t; groundMat.color.set(0x9c9a90); groundMat.needsUpdate = true; });
// 断面の縁の細い線（事実の線：層の境）
{ const m = new THREE.LineBasicMaterial({ color: HUD, transparent: true, opacity: .55 });
  for (const y of [0, -.12 * DEPTH, -.17 * DEPTH, -.66 * DEPTH, -.72 * DEPTH]) { const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2, r = R * (1 + y / DEPTH * .03) + .015; pts.push(new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m); l.userData.cat = "soil"; scene.add(l); } }
// 池（典拠＝池の水の来歴・湧水から生まれた池ほか。形と位置は模式）
const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 64), new THREE.MeshStandardMaterial({ color: 0x1a3a44, roughness: .08, metalness: .2, transparent: true, opacity: .94 }));
pond.rotation.x = -Math.PI / 2; pond.position.set(POND.x, .012, POND.z); scene.add(pond);
const pondEdge = new THREE.Mesh(new THREE.RingGeometry(POND.r, POND.r + .22, 64), new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 1 })); pondEdge.rotation.x = -Math.PI / 2; pondEdge.position.set(POND.x, .014, POND.z); pondEdge.receiveShadow = true; scene.add(pondEdge);

// ---- ケヤキ（形＝mitsulab・質感 CC0）
let leafMat = null, leaves = null, tree = null;
async function loadTree() {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js")]);
  const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
  const g = await ld.loadAsync("keyaki.glb"); tree = g.scene;
  const bx = new THREE.Box3().setFromObject(tree), h = bx.max.y - bx.min.y, s = TREE_H / h; tree.scale.setScalar(s);
  const c = bx.getCenter(new THREE.Vector3()); tree.position.set(-c.x * s, -bx.min.y * s - .05, -c.z * s);
  tree.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; if (/leaf|leaves/i.test(o.material.name + o.name)) { leafMat = o.material; leaves = o; leafMat.userData.base = leafMat.color.clone(); } });
  scene.add(tree); applySeason();
}

// ---- 記録の点と線
let items = [];
const groups = {};   // cat → { pts:[], mesh, line }
function cat(x) { if (x.sub === "trees") return "tree"; if (x.sub === "life") return "life"; return /池|泉|湧水|水/.test(x.title) ? "water" : "soil"; }
function place(x, i, rnd) {
  const t = x.title + (x.lines[0]?.t || "") + (x.more[0] || ""), c = x.cat, a = () => (rnd() - .5) * 2;
  const ring = (r0, r1, y) => { const ang = rnd() * Math.PI * 2, r = r0 + rnd() * (r1 - r0); return new THREE.Vector3(Math.sin(ang) * r, y, Math.cos(ang) * r); };
  if (c === "water" || /池の|水鳥|カメ/.test(x.title)) { const ang = rnd() * Math.PI * 2, r = rnd() * POND.r * .8; return new THREE.Vector3(POND.x + Math.cos(ang) * r, .5 + rnd() * 1.4, POND.z + Math.sin(ang) * r); }
  if (c === "soil" || /土壌|ダニ|かみくだく|根もとの土|キノコ/.test(x.title)) {   // 断面の前の側（深さは中身の手がかりで）
    let y = -.3 - rnd() * .3; if (/ローム|赤土|台地|段丘|地質/.test(t)) y = -.6 - rnd() * 1.0; if (/粘土|埋|谷|下り|低地|帯/.test(t)) y = -1.4 - rnd() * .9; if (/黒い|腐植|ダニ|かみくだく|土壌動物|キノコ|根/.test(t)) y = -.08 - rnd() * .22;
    const ang = (rnd() - .5) * 1.9; return new THREE.Vector3(Math.sin(ang) * (R + .25), y, Math.cos(ang) * (R + .25));
  }
  if (c === "life") { if (/蝶|チョウ|アゲハ|ゼミ|ヒグラシ|ボウシ|鳥|カラス|カラ|コゲラ|バト|セキレイ|タキ|タカ|ムクドリ|種/.test(t)) return ring(2.2, 5.2, 4 + rnd() * 6); return ring(1.4, 5.5, .35 + rnd() * .8); }
  if (/幹|樹皮|皮目|苔|地衣|太さ|網目|短冊|横筋|なめらか|固結|根元|支え/.test(t)) { const ang = rnd() * Math.PI * 2, r = .8 + rnd() * .5; return new THREE.Vector3(Math.sin(ang) * r, .5 + rnd() * 3, Math.cos(ang) * r); }
  const ang = rnd() * Math.PI * 2, r = 2.2 + rnd() * 2.6; return new THREE.Vector3(Math.sin(ang) * r, 5.5 + rnd() * 4.5 - r * .25, Math.cos(ang) * r);
}
function buildMarks() {
  const rnd = mulberry(26);
  const geo = new THREE.OctahedronGeometry(.1, 0);
  for (const L of ["tree", "soil", "water", "life"]) {
    const list = items.filter(x => x.cat === L); if (!list.length) continue;
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: HUD.clone().multiplyScalar(1.1), toneMapped: false, transparent: true, opacity: .8 }), list.length);
    const seg = [], M = new THREE.Matrix4();
    list.forEach((x, i) => { const p = x.pos; M.makeTranslation(p.x, p.y, p.z); m.setMatrixAt(i, M);
      if (p.y > .2) seg.push(p.x, p.y - .14, p.z, p.x, 0, p.z); else { const k = 1 + .5 / R; seg.push(p.x, p.y, p.z, p.x / k * .985, p.y, p.z / k * .985); } });
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
    const line = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: HUD, transparent: true, opacity: .34 }));
    scene.add(m, line); groups[L] = { list, mesh: m, line };
  }
  const halo = new THREE.Mesh(new THREE.RingGeometry(.2, .26, 40), new THREE.MeshBasicMaterial({ color: 0xeef5fb, transparent: true, opacity: .9, side: THREE.DoubleSide, toneMapped: false }));
  halo.visible = false; scene.add(halo); groups.halo = halo;
  void rnd;
}
function setLayer(id, v) {
  on[id] = v; const g = groups[id]; if (g) { g.mesh.visible = g.line.visible = v; }
  if (id === "soil") scene.children.forEach(o => { if (o.userData.cat === "soil") o.visible = v; });
  if (id === "season") applySeason();
  document.querySelectorAll(`.grp[data-cat="${id}"]`).forEach(e => e.hidden = !v);
  const b = document.querySelector(`.lay[data-l="${id}"]`); if (b) b.setAttribute("aria-pressed", String(v));
}

// ---- 季節（模式）：ケヤキは冬に葉を落とす。秋は、都市では黄色がかった茶色から茶色が多い（s_tr8_keyaki_koyo）
const MONTH_TINT = { 1: null, 2: null, 3: null, 4: [1.25, 1.35, .8, .8], 5: [1.1, 1.2, .85, .95], 6: [.92, 1, .9, 1], 7: [.85, .95, .85, 1], 8: [.85, .95, .85, 1], 9: [.95, 1, .8, 1], 10: [1.35, 1.1, .5, .95], 11: [2.4, 1.25, .3, .8], 12: [2.1, .95, .3, .45] };
let month = new Date().getMonth() + 1;
function applySeason() {
  $("#monthT").textContent = month + " 月";
  if (!leafMat) return;
  const t = on.season ? MONTH_TINT[month] : [1, 1, 1, 1];
  leaves.visible = !!t;
  if (t) { leafMat.color.copy(leafMat.userData.base).multiply(new THREE.Color(t[0], t[1], t[2])); }
  groundMat.color.set(on.season && (month >= 11 || month <= 2) ? 0xa8a090 : 0x9c9a90);
}
$("#month").value = month;
$("#month").addEventListener("input", e => { month = +e.target.value; if (!on.season) setLayer("season", true); applySeason(); });
$("#seasonNote").addEventListener("click", () => { const x = items.find(x => x.id === "s_tr8_keyaki_koyo"); if (x) openCard(x, "季節（色の移りは模式）"); });

// ---- 見る向き（ドラッグで回す・ピンチ／ホイールで寄る）
const view = { az: .35, el: .2, dist: MOBILE ? 27 : 23, tgt: new THREE.Vector3(0, MOBILE ? 3.6 : 3.9, 0), vaz: 0, auto: !RM };
function placeCam() { const c = Math.cos(view.el); camera.position.set(view.tgt.x + Math.sin(view.az) * c * view.dist, view.tgt.y + Math.sin(view.el) * view.dist, view.tgt.z + Math.cos(view.az) * c * view.dist); camera.lookAt(view.tgt); }
const ptrs = new Map(); let drag = null, moved = 0, pinch0 = 0;
cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); view.auto = false; moved = 0; drag = { x: e.clientX, y: e.clientY }; cv.classList.add("grabbing"); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } });
cv.addEventListener("pointermove", e => {
  if (!ptrs.has(e.pointerId)) { hover(e); return; }
  const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) view.dist = clamp(view.dist * pinch0 / d, 9, 40); pinch0 = d; return; }
  view.az -= dx * .006; view.el = clamp(view.el + dy * .004, -.12, 1.15); view.vaz = -dx * .006;
});
const up = e => { ptrs.delete(e.pointerId); cv.classList.remove("grabbing"); if (ptrs.size < 2) pinch0 = 0; if (drag && moved < 8 && ptrs.size === 0) tap(e.clientX, e.clientY); if (!ptrs.size) drag = null; };
cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", e => { ptrs.delete(e.pointerId); drag = null; cv.classList.remove("grabbing"); });
cv.addEventListener("wheel", e => { e.preventDefault(); view.auto = false; view.dist = clamp(view.dist * (1 + Math.sign(e.deltaY) * .08), 9, 40); }, { passive: false });
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---- 触れる：画面の上で近い点を選ぶ
const _v = new THREE.Vector3();
function nearest(cx, cy, maxPx) {
  const o = cv.getBoundingClientRect(); let best = null, bd = maxPx;
  for (const L of ["tree", "soil", "water", "life"]) { const g = groups[L]; if (!g || !on[L]) continue;
    for (const x of g.list) { _v.copy(x.pos).project(camera); if (_v.z > 1) continue; const sx = o.left + (_v.x * .5 + .5) * o.width, sy = o.top + (-_v.y * .5 + .5) * o.height, d = Math.hypot(sx - cx, sy - cy); if (d < bd) { bd = d; best = x; } } }
  return best;
}
function hover(e) { if (MOBILE) return; cv.classList.toggle("hot", !!nearest(e.clientX, e.clientY, 18)); }
function tap(x, y) { if (KASA.tap(x, y)) return; const r = nearest(x, y, MOBILE ? 30 : 22); if (r) openCard(r); }

// ---- 札と声
const NAME = { tree: "木", soil: "土", water: "水", life: "生きもの" };
let audio = null, reading = null, soundOn = true, first = null;
function openCard(x, kick) {
  stopVoice(); reading = x;
  $("#cardK").textContent = "Qualia/nature ／ " + (kick || NAME[x.cat]);
  $("#cardT").textContent = x.title;
  const b = $("#cardB"); b.textContent = "";
  x.lines.forEach((l, i) => { const p = document.createElement("p"); p.textContent = l.t; p.dataset.i = i; b.appendChild(p); });
  for (const m of x.more) { const p = document.createElement("p"); p.className = "more"; p.textContent = m; b.appendChild(p); }
  if (x.note) { const p = document.createElement("p"); p.className = "more"; p.textContent = x.note; b.appendChild(p); }
  const s = $("#cardS"); s.textContent = "";
  for (const r of x.src) { const li = document.createElement("li"); if (r.u) { const a = document.createElement("a"); a.href = r.u; a.target = "_blank"; a.rel = "noopener"; a.textContent = r.t; li.appendChild(a); } else li.textContent = r.t; s.appendChild(li); }
  $("#bListen").hidden = !x.lines.length;
  const g = groups.halo; g.visible = true; g.position.copy(x.pos);
  aoi?.motion.lookAt(x.pos); aoi?.motion.express("curious", .5, 2);
  $("#card").showModal(); $("#cardT").focus();
  if (soundOn && x.lines.length) playLines(x, 0);
}
function playLines(x, i) {
  if (reading !== x || i >= x.lines.length) { stopVoice(false); return; }
  const l = x.lines[i]; document.querySelectorAll("#cardB p").forEach(p => p.classList.toggle("now", p.dataset.i == i));
  audio = new Audio(l.f); audio.play().catch(() => {});
  aoi?.speak({ kana: l.kana || "", text: l.t, dur: l.dur, clock: () => audio ? audio.currentTime : 99 });
  audio.onended = () => setTimeout(() => playLines(x, i + 1), 260);
  $("#bListen").textContent = "声を止める";
}
function stopVoice(clear = true) { if (audio) { audio.onended = null; audio.pause(); audio = null; } aoi?.motion.stopSpeaking(); $("#bListen").textContent = "碧の声で聴く"; document.querySelectorAll("#cardB p.now").forEach(p => p.classList.remove("now")); if (clear) reading = reading; }
$("#bListen").addEventListener("click", () => { if (audio) stopVoice(); else if (reading) playLines(reading, 0); });
$("#card").addEventListener("close", () => { stopVoice(); reading = null; groups.halo && (groups.halo.visible = false); first = null; aoi?.motion.lookAt(null); if (KASA.cur) { KASA.herd?.release(KASA.cur); KASA.cur = null; } });
for (const d of document.querySelectorAll("dialog")) { d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) d.close(); }); }
$("#bAbout").addEventListener("click", () => $("#about").showModal());
$("#bSound").addEventListener("click", e => { soundOn = !soundOn; e.target.setAttribute("aria-pressed", String(soundOn)); e.target.textContent = soundOn ? "声 入" : "声 切"; if (!soundOn) stopVoice(); });

// ---- 字幕（碧の名乗りは字だけ）
let capT = 0;
function say(t, ms) { const c = $("#cap"); c.textContent = t; c.classList.add("on"); clearTimeout(capT); capT = setTimeout(() => c.classList.remove("on"), ms); }

// ---- 碧（右上の小さな窓）
const aoiScene = new THREE.Scene();
{ const k = new THREE.DirectionalLight(0xfff1e2, 2.0); k.position.set(-1, 1.4, 1.2); aoiScene.add(k); aoiScene.add(new THREE.HemisphereLight(0xb8c4da, 0x0a0f1a, .9)); }
const aoiCam = new THREE.PerspectiveCamera(26, .74, .1, 20); aoiCam.position.set(0, 1.3, 1.95); aoiCam.lookAt(0, 1.2, 0);
let aoi = null;
const AOI_URL = location.pathname.includes("/x/") ? "../../img/hero/aoi.vrm" : "aoi.vrm";
async function loadAoi() {
  try { const K = await import("./kit/aoi.js"); aoi = await K.loadAoi(AOI_URL, { scene: aoiScene, wind: .15, posture: "upright", quality: MOBILE ? "mid" : "auto" }); aoi.place(0, 0, 0); }
  catch (e) { console.warn("碧：", e?.message ?? e); }
}

// ---- かさねっこ「このは」（自然の層・老竹の群れ）。触れると記録を一つ運んでくる
const KASA = { herd: null, loading: false, t0: performance.now(), cur: null,
  okAt(x, z) { const r = Math.hypot(x, z); return r > 1.5 && r < R - .5 && Math.hypot(x - POND.x, z - POND.z) > POND.r + .45; },
  async load() {
    this.loading = true;
    try {
      const M = await import("./kit/envAgents/kasane.js?v=20261025");
      const h = new M.KasaneHerd({ scene, camera, groundAt: () => 0, walkable: (x, z) => this.okAt(x, z), scale: MOBILE ? 6.5 : 6, mobile: MOBILE, maxDist: 60, max: MOBILE ? 9 : 14, shadow: true, upright: true, screenMargin: 14, view: () => false, items: true, muted: () => !soundOn });
      const life = items.filter(x => x.cat === "life" || x.cat === "tree"), rnd = mulberry(11);
      const mk = n => Array.from({ length: n }, () => ({ layer: "nature", data: life[Math.floor(rnd() * life.length)] }));
      const P = MOBILE ? [[-3.4, 3.4, 3], [2.4, 4.6, 3], [-4, -1.5, 3]] : [[-3.6, 3.2, 4], [2.2, 4.8, 4], [-4.2, -1.6, 3], [4.6, -.8, 3]];
      for (const [x, z, n] of P) h.addGroup(mk(n), { x, z, radius: 1.1, role: "watch" });
      h.setLayers(["nature"]); await h.load(); this.herd = h;
    } catch (err) { console.warn("かさねっこ：", err?.message ?? err); }
  },
  tick(dt) {
    if (!this.herd) { if (!this.loading && performance.now() - this.t0 > 2000) this.load(); return; }
    this.herd.update(Math.min(dt, .05), { active: true, busy: !!document.querySelector("dialog[open]") });
    const cx = camera.position.x, cz = camera.position.z, d = Math.min(dt, .05);
    for (const a of this.herd.agents) if (!a.react && a.state !== "focus" && a.state !== "walk") a.faceTo?.(cx, cz, d, 14);
  },
  tap(x, y) {
    if (!this.herd) return false; const o = cv.getBoundingClientRect();
    const k = this.herd.pick((x - o.left) / o.width * innerWidth, (y - o.top) / o.height * innerHeight, MOBILE ? 34 : 28); if (!k) return false;
    this.nameTag(k); this.cur = k;
    this.herd.touch(k, () => { if (k.data) setTimeout(() => openCard(k.data, "このはが運んできた記録"), 700); else setTimeout(() => this.herd.release(k), 1600); });
    return true;
  },
  nameTag(k) {
    let el = this.tagEl; if (!el) { el = this.tagEl = document.createElement("div"); el.className = "kasa-tag"; el.setAttribute("aria-hidden", "true"); el.innerHTML = "このは<small>Qualia/nature</small>"; stage.appendChild(el); }
    _v.set(k.pos.x, .9, k.pos.y).project(camera); const W = stage.clientWidth, H = stage.clientHeight;
    el.style.left = clamp((_v.x * .5 + .5) * W, 50, W - 50) + "px"; el.style.top = clamp((-_v.y * .5 + .5) * H - 10, 60, H - 40) + "px"; el.style.display = "block"; el.classList.remove("off");
    clearTimeout(this.tagT); this.tagT = setTimeout(() => el.classList.add("off"), 2600);
  },
};

// ---- 層の札と記録の一覧
function buildUI() {
  const box = $("#layers");
  for (const L of LAYERS) {
    const n = L.id === "season" ? "" : items.filter(x => x.cat === L.id).length;
    const b = document.createElement("button"); b.type = "button"; b.className = "lay"; b.dataset.l = L.id; b.setAttribute("aria-pressed", "true"); b.title = L.sub;
    b.innerHTML = `<i></i><span>${L.name}</span>${n ? `<small>${n}</small>` : ""}`;
    b.addEventListener("click", () => setLayer(L.id, !on[L.id])); box.appendChild(b);
  }
  const list = $("#list");
  for (const L of LAYERS.filter(l => l.id !== "season")) {
    const its = items.filter(x => x.cat === L.id); const g = document.createElement("section"); g.className = "grp"; g.dataset.cat = L.id;
    g.innerHTML = `<h2>${L.name}<small>${its.length} 件 ／ ${L.sub}</small></h2>`; const w = document.createElement("div"); w.className = "items";
    for (const x of its) { const b = document.createElement("button"); b.type = "button"; b.className = "it"; b.innerHTML = `${esc(x.title)}<small>${x.lines.length ? "声あり ・ " : ""}典拠 ${x.src.length}</small>`; b.addEventListener("click", () => openCard(x)); w.appendChild(b); }
    g.appendChild(w); list.appendChild(g);
  }
}
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---- 大きさ・毎こま
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener("resize", resize);
let last = performance.now(), t = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000); last = now; t += dt;
  if (document.hidden) return;
  QN.frames++;
  if (view.auto) view.az += dt * .05; else if (!drag) { view.az += view.vaz; view.vaz *= .9; }
  placeCam();
  if (first && groups.halo && !reading) { groups.halo.visible = true; groups.halo.position.copy(first.pos); groups.halo.material.opacity = .6 + Math.sin(t * 3) * .35; }
  if (groups.halo?.visible) { groups.halo.quaternion.copy(camera.quaternion); groups.halo.scale.setScalar(1 + Math.sin(t * 4) * .08); }
  for (const L of ["tree", "soil", "water", "life"]) { const g = groups[L]; if (g) g.line.material.opacity = .09 + Math.sin(t * 1.3 + L.length) * .04; }
  KASA.tick(dt);
  const W = stage.clientWidth, H = stage.clientHeight;
  renderer.setViewport(0, 0, W, H); renderer.setScissorTest(false); renderer.clear(); renderer.render(scene, camera);
  if (aoi) {
    aoi.tick(dt, aoiCam);
    const b = $("#aoiBox").getBoundingClientRect(), s = cv.getBoundingClientRect(), x = b.left - s.left, y = s.bottom - b.bottom;
    renderer.setScissorTest(true); renderer.setScissor(x, y, b.width, b.height); renderer.setViewport(x, y, b.width, b.height);
    aoiCam.aspect = b.width / b.height; aoiCam.updateProjectionMatrix(); renderer.setClearColor(0x070d1a, 1); renderer.clear(); renderer.render(aoiScene, aoiCam);
    renderer.setScissorTest(false); renderer.setClearColor(0x03060f, 1);
  }
}

// ---- 起動
const QN = window.__qn = { frames: 0, ready: false, tree: () => !!tree, aoi: () => !!aoi, kasa: () => KASA.herd?.agents.length || 0, items: () => items.length, proj: id => { const x = items.find(x => x.id === id) || items[0]; _v.copy(x.pos).project(camera); const o = cv.getBoundingClientRect(); return { x: o.left + (_v.x * .5 + .5) * o.width, y: o.top + (-_v.y * .5 + .5) * o.height, id: x.id }; } };
(async () => {
  resize(); placeCam(); requestAnimationFrame(frame);
  try {
    const d = await (await fetch("nature.json")).json();
    items = d.items.map(x => ({ ...x, cat: cat(x) }));
    const rnd = mulberry(2026); items.forEach((x, i) => x.pos = place(x, i, rnd));
    buildMarks(); buildUI(); applySeason(); first = items.find(x => x.id === "n_keyaki");
  } catch (e) { console.error("記録を読めませんでした", e); }
  const tr = loadTree().catch(e => console.warn("木：", e?.message ?? e));
  await Promise.race([tr, new Promise(r => setTimeout(r, 2500))]);
  window.MLLoader?.done();
  QN.ready = true;
  setTimeout(loadAoi, 1200);
  setTimeout(() => say("わたしは碧。ビットとアトムのあわいに立ち、この場所の記憶をたどり、五感をひらいて、目の前の風景に層を重ねます。", 8600), 900);
  setTimeout(() => say(MOBILE ? "まず、白い輪の点に触れてみてください。記録がひらきます。" : "まず、白い輪の点に触れてみてください。記録がひらき、碧が読みます。ドラッグで回り、ホイールで寄れます。", 7000), 9800);
})();
