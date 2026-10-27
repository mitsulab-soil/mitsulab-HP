/* Qualia/nature ── 一本のケヤキと足もとの土と水に、自然の記録を層として重ねる。© 2026 mitsulab. All rights reserved.
   2026-10-26 本人「Qualia/nature もアプリを作って公開してください。」
   中身＝Qualium 氷川の自然の層（116 件・nature.json）。文と声（VOICEVOX：冥鳴ひまり・読みは Qualium 氷川の公開時に確かめ済み）はそのまま使う。
   3D＝写実の地（木の形は mitsulab・質感 CC0）に、事実の線（層の色の細い線と点）。木の形・土の層の厚さ・点の位置・季節の色は模式。
   起動：木と土を描いた時点で読み込み画面を閉じる。碧（1.2 秒後）はあとから。
   2026-10-26 本人「Qualium 以外には、碧だけで、かさねっこは入れないでください」→ かさねっこ（このは）を外した。 */
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
function tap(x, y) { const h = nearestActor(x, y, MOBILE ? 36 : 28); if (h) { pickActor(h); return; } const r = nearest(x, y, MOBILE ? 30 : 22); if (r) openCard(r); }

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
$("#card").addEventListener("close", () => { stopVoice(); reading = null; groups.halo && (groups.halo.visible = false); first = null; aoi?.motion.lookAt(null); });
for (const d of document.querySelectorAll("dialog")) { d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) d.close(); }); }
$("#bAbout").addEventListener("click", () => $("#about").showModal());
// 目録：3D の上に重なる透けた板（2026-10-27 全アプリ 3D 化。一覧を下の平らなページから、3D の空間の上の板へ）
const setList = open => { $("#panel").hidden = !open; document.body.classList.toggle("list-open", open); $("#bList").setAttribute("aria-expanded", open); };
$("#bList").addEventListener("click", () => setList($("#panel").hidden));
$("#bListX").addEventListener("click", () => setList(false));
$("#bSound").addEventListener("click", e => { soundOn = !soundOn; e.target.setAttribute("aria-pressed", String(soundOn)); e.target.textContent = soundOn ? "声 入" : "声 切"; if (!soundOn) stopVoice(); });

// ---- 自然のアクターとつながり（2026-10-27 本人「自然のアクターを増やし、関係性を体感できるように」）
// どのつながりも、nature.json の典拠つきの記録（rec）から。記録に書いてあることだけを線にする。風は典拠のある記録がまだ無いので置かない。
const ACTORS = [
  { id: "tree", name: "木", p: [0, 4.2, 0] },
  { id: "bird", name: "鳥", p: [3.2, 8.6, 1.6] },
  { id: "insect", name: "虫", p: [-3.1, 5.2, 1.8] },
  { id: "fungi", name: "菌", p: [1.2, .7, 1.3] },
  { id: "soilife", name: "土の生きもの", p: [-3.0, .2, 4.6] },
  { id: "soil", name: "土", p: [4.8, .2, 1.2] },
  { id: "water", name: "水", p: [4.1, .5, 2.9] },
];
const RELS = [
  { a: "insect", b: "tree", t: "チョウの幼虫が、エノキの葉や、スダジイなどブナ科の常緑の木の葉を食べる（とされる）", rec: ["s_lf_z_enoki", "s_lf_z_shii"] },
  { a: "insect", b: "tree", t: "ニイニイゼミが、サクラなどの木に集まる", rec: ["s_lf_z_niinii"], bend: -1 },
  { a: "bird", b: "tree", t: "鳥が実を食べ、木の種を別の場所へ運ぶ", rec: ["s_lf_z_seed", "s_lf_z_muku"] },
  { a: "bird", b: "tree", t: "サクラが咲くと、メジロやヒヨドリが花に集まる", rec: ["s_lf_z_sakura"], bend: -1 },
  { a: "tree", b: "soilife", t: "落ち葉が、土の中の小さな生きものの食べものになる", rec: ["s_tr9_ochiba", "s_lf_z_dojou"] },
  { a: "soilife", b: "fungi", t: "ササラダニが落ち葉をかみくだくことで、菌による分解も進むと考えられている", rec: ["s_lf_z_bunkai"] },
  { a: "soil", b: "tree", t: "分解で放たれた養分を、木がまた吸い上げる", rec: ["s_tr9_ochiba"] },
  { a: "soilife", b: "soil", t: "ミミズが穴を掘り、昆虫やダニが土のすき間にすむ", rec: ["s_lf_z_root", "s_lf_z_sasara"] },
  { a: "fungi", b: "tree", t: "菌が藻と共生した地衣類が、幹に付く", rec: ["n_chii"] },
  { a: "fungi", b: "tree", t: "林の木に、キノコが生える（伐られた木との関係は分かっていない）", rec: ["x_kinoko"], bend: -1 },
  { a: "soil", b: "water", t: "台地から低地へ移る所に水が湧き、池になる", rec: ["x_yusui_ikegike"] },
  { a: "water", b: "bird", t: "冬から春の池で、水鳥が記録されている", rec: ["x_mizutori"] },
];
const WEB_C = { tree: 0x88b68f, bird: 0xa8d8f0, insect: 0xf2cf8c, fungi: 0xe0c8f0, soilife: 0xd8a888, soil: 0xc89870, water: 0x78d6ec };
const web = { hubs: [], rels: [], sel: null };
const CYC = new Set(["tree", "soilife", "fungi", "soil"]);   // 落ち葉 → 土の生きもの → 菌 → 土 → 木（ひとまわりの循環として一緒に光らせる）
function webSprite(text) {
  const c = document.createElement("canvas"), g = c.getContext("2d"), f = '600 44px "Shippori Mincho","Hiragino Mincho ProN",serif'; g.font = f; const w = Math.ceil(g.measureText(text).width) + 36; c.width = w; c.height = 64;
  g.font = f; g.fillStyle = "rgba(3,6,15,.62)"; g.fillRect(0, 6, w, 52); g.fillStyle = "#eef5fb"; g.textBaseline = "middle"; g.fillText(text, 18, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, toneMapped: false })); s.scale.set(.56 * w / 64, .56, 1); s.renderOrder = 5; return s;
}
function buildWeb() {
  const byId = Object.fromEntries(items.map(x => [x.id, x]));
  for (const A of ACTORS) {
    if (MOBILE && A.id !== "water") A.p = [A.p[0] * .55, A.p[1], A.p[2] * .8];   /* 水は池の上のまま */   /* スマホは印を内側へ（画面の端で札が切れない） */
    const g = new THREE.Group(); g.position.set(...A.p); const col = WEB_C[A.id];
    const core = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .345, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .7, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
    const lab = webSprite(A.name); lab.position.y = .62; g.add(core, ring, lab); scene.add(g);
    web.hubs.push({ ...A, g, ring, core, lab, v: new THREE.Vector3(...A.p) });
  }
  const H = Object.fromEntries(web.hubs.map(h => [h.id, h]));
  for (const R0 of RELS) {
    const a = H[R0.a].v, b = H[R0.b].v, mid = a.clone().lerp(b, .5), off = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar((R0.bend || 1) * a.distanceTo(b) * .18);
    mid.add(off).y += a.distanceTo(b) * .15;
    const cur = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone()), pts = cur.getPoints(40);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: WEB_C[R0.a], transparent: true, opacity: .16, depthWrite: false, toneMapped: false }));
    const NF = 10, fp = new Float32Array(NF * 3), flow = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(fp, 3)), new THREE.PointsMaterial({ color: WEB_C[R0.a], size: .12, transparent: true, opacity: .35, depthWrite: false, toneMapped: false }));
    flow.frustumCulled = false; scene.add(line, flow);
    web.rels.push({ ...R0, cur, line, flow, fp, NF, ph: Math.random(), recs: R0.rec.map(id => byId[id]).filter(Boolean) });
  }
  // 目録に「つながり」の節（それぞれの典拠の記録をひらく）
  const list = $("#list"), sec = document.createElement("section"); sec.className = "grp"; sec.dataset.cat = "web";
  sec.innerHTML = `<h2>つながり<small>${RELS.length} 本 ／ 木・鳥・虫・菌・土の生きもの・土・水</small></h2>`; const w = document.createElement("div"); w.className = "items";
  for (const r of web.rels) for (const x of r.recs.slice(0, 1)) { const b = document.createElement("button"); b.type = "button"; b.className = "it"; b.innerHTML = `${esc(r.t)}<small>${H[r.a].name} ─ ${H[r.b].name} ・ 典拠の記録：${esc(x.title)}</small>`; b.addEventListener("click", () => { pickActor(H[r.a]); openCard(x, "つながり"); }); w.appendChild(b); }
  sec.appendChild(w); list.prepend(sec);
}
window.__qnWeb = id => { const h = web.hubs.find(x => x.id === id); if (!h) return null; _v.copy(h.v).project(camera); const o = cv.getBoundingClientRect(); return [o.left + (_v.x * .5 + .5) * o.width, o.top + (-_v.y * .5 + .5) * o.height]; };
function nearestActor(cx, cy, maxPx) {
  const o = cv.getBoundingClientRect(); let best = null, bd = maxPx;
  for (const h of web.hubs) { _v.copy(h.v).project(camera); if (_v.z > 1) continue; const d = Math.hypot(o.left + (_v.x * .5 + .5) * o.width - cx, o.top + (-_v.y * .5 + .5) * o.height - cy); if (d < bd) { bd = d; best = h; } }
  return best;
}
function pickActor(h) {
  web.sel = web.sel === h ? null : h;
  if (!web.sel) { say("つながりの表示を戻しました。", 2500); return; }
  const mine = web.rels.filter(r => r.a === h.id || r.b === h.id);
  say(MOBILE ? `${h.name} ── ${mine[0].t}。ほか ${mine.length - 1} 本（目録の「つながり」に典拠）` : `${h.name} ── ` + mine.map(r => r.t).join("。 ") + "。（目録の「つながり」から、それぞれの典拠をひらけます）", 9000 + mine.length * 1500);
  if (aoi) { const g = new THREE.Vector3(h.v.x, 0, h.v.z), d = g.length(); if (d > 1.5) g.multiplyScalar(Math.min(R - 1, d) / d); g.multiplyScalar(.72); g.x += .6; aoi.walkTo(g); } /* アクターと中心のあいだ（札の手前に立たない） */   // 触れたアクターのそばへ歩いて、指す
  aoi?.motion.point?.(h.v, 3.2); aoi?.motion.lookAt(h.v); aoi?.motion.express("curious", .5, 2);
}
function webTick(dt) {
  const s = web.sel;
  for (const h of web.hubs) { h.ring.quaternion.copy(camera.quaternion); const k = s ? (s === h ? 1.3 : .85) : 1, kk = k + Math.sin(performance.now() / 600 + h.v.x) * .04; h.core.scale.setScalar(kk); h.ring.scale.setScalar(kk); h.lab.material.opacity = s && s !== h ? .55 : 1; /* 札の大きさは変えない（碧と字幕に重ならない） */ }
  for (const r of web.rels) {
    const hot = s && (r.a === s.id || r.b === s.id || (CYC.has(s.id) && CYC.has(r.a) && CYC.has(r.b))), dim = s && !hot;
    r.line.material.opacity = hot ? .8 : dim ? .06 : .3; r.flow.material.opacity = hot ? 1 : dim ? .08 : .55;
    r.ph = (r.ph + dt * (hot ? .35 : .12)) % 1;
    for (let i = 0; i < r.NF; i++) { const p = r.cur.getPoint((r.ph + i / r.NF) % 1); r.fp[i * 3] = p.x; r.fp[i * 3 + 1] = p.y; r.fp[i * 3 + 2] = p.z; }
    r.flow.geometry.attributes.position.needsUpdate = true;
  }
}

// ---- 字幕（碧の名乗りは字だけ）
let capT = 0;
function say(t, ms, force = true) { if (!force && web.sel) return; const c = $("#cap"); c.textContent = t; c.classList.add("on"); clearTimeout(capT); capT = setTimeout(() => c.classList.remove("on"), ms); }

// ---- 碧（右上の小さな窓）
const aoiScene = new THREE.Scene();
{ const k = new THREE.DirectionalLight(0xfff1e2, 2.0); k.position.set(-1, 1.4, 1.2); aoiScene.add(k); aoiScene.add(new THREE.HemisphereLight(0xb8c4da, 0x0a0f1a, .9)); }
const aoiCam = new THREE.PerspectiveCamera(26, .74, .1, 20); aoiCam.position.set(0, 1.3, 1.95); aoiCam.lookAt(0, 1.2, 0);
let aoi = null;
const AOI_URL = location.pathname.includes("/x/") ? "../../img/hero/aoi.vrm" : "aoi.vrm";
async function loadAoi() {
  try { const K = await import("./kit/aoi.js"); aoi = await K.loadAoi(AOI_URL, { scene, wind: .15, posture: "upright", quality: MOBILE ? "mid" : "auto" }); aoi.place(-2.6, 4.3, .5); aoi.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); }   // 2026-10-27 本人「碧はどのアプリでも 3D 空間の中に 3D で」：木の手前の地面に立つ
  catch (e) { console.warn("碧：", e?.message ?? e); }
}

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
  webTick(dt);
  const W = stage.clientWidth, H = stage.clientHeight;
  renderer.setViewport(0, 0, W, H); renderer.setScissorTest(false); renderer.clear(); renderer.render(scene, camera);
  if (aoi) {
    aoi.tick(dt, camera);
  }
}

// ---- 起動
const QN = window.__qn = { frames: 0, ready: false, tree: () => !!tree, aoi: () => !!aoi, items: () => items.length, proj: id => { const x = items.find(x => x.id === id) || items[0]; _v.copy(x.pos).project(camera); const o = cv.getBoundingClientRect(); return { x: o.left + (_v.x * .5 + .5) * o.width, y: o.top + (-_v.y * .5 + .5) * o.height, id: x.id }; } };
(async () => {
  resize(); placeCam(); requestAnimationFrame(frame);
  try {
    const d = await (await fetch("nature.json")).json();
    items = d.items.map(x => ({ ...x, cat: cat(x) }));
    const rnd = mulberry(2026); items.forEach((x, i) => x.pos = place(x, i, rnd));
    buildMarks(); buildWeb(); buildUI(); applySeason(); first = items.find(x => x.id === "n_keyaki");
  } catch (e) { console.error("記録を読めませんでした", e); }
  const tr = loadTree().catch(e => console.warn("木：", e?.message ?? e));
  await Promise.race([tr, new Promise(r => setTimeout(r, 2500))]);
  window.MLLoader?.done();
  QN.ready = true;
  setTimeout(loadAoi, 1200);
  setTimeout(() => say("わたしは碧。ビットとアトムのあわいに立ち、この場所の記憶をたどり、五感をひらいて、目の前の風景に層を重ねます。", 8600), 900);
  setTimeout(() => say(MOBILE ? "まず、白い輪の点に触れてみてください。記録がひらきます。" : "まず、白い輪の点に触れてみてください。記録がひらき、碧が読みます。ドラッグで回り、ホイールで寄れます。", 7000, false), 9800);
})();
