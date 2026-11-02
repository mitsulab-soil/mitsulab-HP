/* © mitsulab. 碧の層（2026-11-02 本人「碧の層の説明…これもアプリを作成してください」）
   1 画面で完結：碧が庭に立ち、下の札で「人の感覚では届かない世界」を一つずつ訳して見せる。
   碧は共通部品（kit/aoi.js・AoiMotion）、依代（しずく・石）は kit/yorishiro/。色や線は「置きかえた模式」と画面に書く。
   事実の範囲：多くの鳥・虫は紫外線を見る／紫外の模様を持つ花がある／コウモリは超音波の反響で位置をつかむ／多くの植物の根は菌根菌とつながり水・養分と糖をやりとりする／地名に昔の川や道が残ることがある。 */
import * as THREE from "three";
import { loadAoi } from "./kit/aoi.js";

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const cv = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03060f);
scene.fog = new THREE.FogExp2(0x03060f, .06);
const camera = new THREE.PerspectiveCamera(36, 1, .05, 80);

// 光
scene.add(new THREE.HemisphereLight(0xb9d4ee, 0x1a1f1a, 1.5));
const key = new THREE.DirectionalLight(0xfff1dc, 2.4); key.position.set(1.8, 4, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0x7fd8ef, .9); rim.position.set(-3, 2.5, -4); scene.add(rim);

// 地面：土の円と、上品な等高線の輪
const TL = new THREE.TextureLoader(), tex = (u, rep, srgb = true) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const groundMat = new THREE.MeshStandardMaterial({ map: tex("tex/soil_forest.webp", 9), color: 0x8f9a86, roughness: .95, transparent: true, opacity: 1 });
const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 72), groundMat); ground.rotation.x = -Math.PI / 2; scene.add(ground);
const contourMat = new THREE.LineBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: .16 });
for (let r = 1.5; r < 11; r += 1.1) {
  const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, w = 1 + .05 * Math.sin(a * 3 + r) + .03 * Math.sin(a * 5 - r * 2); pts.push(new THREE.Vector3(Math.cos(a) * r * w, .004, Math.sin(a) * r * w)); }
  scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), contourMat));
}
// 草（板の束・軽く）
{
  const g = new THREE.BufferGeometry(); { const P = [-.012, 0, 0, .012, 0, 0, -.008, .07, .004, .008, .07, .004, -.003, .13, .012, .003, .13, .012, 0, .17, .022], C = []; for (let i = 0; i < P.length; i += 3) { const k = P[i + 1] / .17; C.push(.12 + k * .2, .2 + k * .3, .1 + k * .12); } g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]); g.computeVertexNormals(); }
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: THREE.DoubleSide });
  const N = innerWidth < 700 ? 2600 : 5200, im = new THREE.InstancedMesh(g, m, N), o = new THREE.Object3D();
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) { const a = rnd() * 6.283, r = 1 + Math.sqrt(rnd()) * 7; o.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); if (o.position.z > 2.2 && Math.abs(o.position.x) < 2.5) o.position.z -= 4; o.rotation.set((rnd() - .5) * .4, rnd() * 6.28, (rnd() - .5) * .4); o.scale.setScalar(.6 + rnd() * .9); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  scene.add(im);
}
// 木（幹と、点の樹冠）
const tree = new THREE.Group(); tree.position.set(innerWidth < 700 ? -1.7 : -2.6, 0, -2.4); scene.add(tree);
{
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.11, .2, 3.2, 10), new THREE.MeshStandardMaterial({ map: tex("tex/bark_zelkova.webp", 1), normalMap: tex("tex/bark_zelkova_n.webp", 1, false), roughness: .95 })); trunk.material.map.repeat.set(2, 3); trunk.material.normalMap.repeat.set(2, 3); trunk.position.y = 1.6; tree.add(trunk);
  const P = [], C = []; let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) { const u = rnd() * 6.283, v = Math.acos(2 * rnd() - 1), r = Math.cbrt(rnd()) * 1.4; P.push(Math.sin(v) * Math.cos(u) * r * 1.2, 3.3 + Math.cos(v) * r * .8, Math.sin(v) * Math.sin(u) * r * 1.2); const k = .5 + rnd() * .5; C.push(.25 * k, .5 * k, .3 * k); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
  tree.add(new THREE.Points(g, new THREE.PointsMaterial({ size: .06, vertexColors: true, transparent: true, opacity: .9 })));
}

// 遠くの木立の影（霧の向こう）と、まばらな星
{
  const g = new THREE.SphereGeometry(1, 10, 6); const m = new THREE.MeshBasicMaterial({ color: 0x0a131d, fog: false });
  const N = 70, im = new THREE.InstancedMesh(g, m, N), o = new THREE.Object3D(); let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) { const a = Math.PI * (1.1 + rnd() * .8), r = 16 + rnd() * 5, h = 3 + rnd() * 4; o.position.set(Math.cos(a) * r, h / 2 - .2, Math.sin(a) * r); o.scale.set(1.6 + rnd() * 1.6, h * .55, 1.6 + rnd() * 1.6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  scene.add(im);
  const P = []; for (let i = 0; i < 260; i++) { const a = rnd() * 6.283, e = .08 + rnd() * .9; P.push(Math.cos(a) * Math.cos(e) * 40, Math.sin(e) * 40, Math.sin(a) * Math.cos(e) * 40); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, color: 0xc8d4e6, transparent: true, opacity: .75, fog: false })));
}
// 花（ふつうの色 ⇄ 紫外の模様の置きかえ）
function petalTex(uv) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  if (uv) { g.addColorStop(0, "#1a0b2e"); g.addColorStop(.42, "#2a1450"); g.addColorStop(.48, "#d9c8ff"); g.addColorStop(1, "#f4eeff"); }
  else { g.addColorStop(0, "#e0a21c"); g.addColorStop(.5, "#f7cf3c"); g.addColorStop(1, "#fff0a0"); }
  x.fillStyle = g; x.beginPath(); x.moveTo(64, 126); x.bezierCurveTo(10, 90, 22, 10, 56, 4); x.quadraticCurveTo(64, 12, 72, 4); x.bezierCurveTo(106, 10, 118, 90, 64, 126); x.fill();
  x.strokeStyle = uv ? "rgba(40,20,80,.35)" : "rgba(150,90,10,.35)"; x.lineWidth = 1.2; for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(64, 124); x.quadraticCurveTo(64 + k * 9, 70, 64 + k * 7, 14); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const PT = { vis: petalTex(false), uv: petalTex(true) };
const petalMat = new THREE.MeshStandardMaterial({ map: PT.vis, transparent: true, alphaTest: .3, side: THREE.DoubleSide, roughness: .7 });
const flowers = new THREE.Group(); scene.add(flowers);
[[1.5, .9], [2.0, -.2], [1.1, 1.6], [2.4, .7], [-1.6, 1.2], [-2.1, .2], [-1.2, 1.9], [.65, 1.25], [-.7, 1.45], [.35, 2.1], [-.3, 2.4]].forEach(([x, z], i) => {
  const f = new THREE.Group(); f.position.set(x, 0, z);
  const h = .32 + (i % 3) * .06;
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.006, .008, h, 5), new THREE.MeshStandardMaterial({ color: 0x3f6a34 })); st.position.y = h / 2; f.add(st);
  const head = new THREE.Group(); head.position.y = h; head.rotation.x = -1.1; f.add(head);
  for (let k = 0; k < 8; k++) { const pg = new THREE.PlaneGeometry(.045, .1, 1, 3); { const a = pg.attributes.position; for (let i = 0; i < a.count; i++) { const yy = a.getY(i); a.setZ(i, -Math.pow(yy + .05, 2) * 1.6); } pg.computeVertexNormals(); } const p = new THREE.Mesh(pg, petalMat); p.position.set(Math.cos(k / 8 * 6.283) * .05, Math.sin(k / 8 * 6.283) * .05, 0); p.rotation.z = k / 8 * 6.283 - Math.PI / 2; p.rotation.x = .25; head.add(p); }
  const ctr = new THREE.Mesh(new THREE.SphereGeometry(.022, 12, 8), new THREE.MeshStandardMaterial({ color: 0x7a4a12, roughness: 1 })); ctr.scale.z = .5; ctr.position.z = .002; head.add(ctr);
  flowers.add(f);
});

// 札（3D の小さな字）
function label(text, color = "#c3cce0") {
  const c = document.createElement("canvas"), x = c.getContext("2d"), fs = 44; x.font = `${fs}px "Hiragino Mincho ProN","Yu Mincho",serif`;
  c.width = Math.ceil(x.measureText(text).width) + 24; c.height = fs + 20; x.font = `${fs}px "Hiragino Mincho ProN","Yu Mincho",serif`;
  x.fillStyle = color; x.textBaseline = "middle"; x.fillText(text, 12, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 })); s.scale.set(c.width / c.height * .1, .1, 1); return s;
}

// コウモリと反響の輪
const bat = new THREE.Group(); bat.visible = false; bat.scale.setScalar(2.6); scene.add(bat);
{
  const m = new THREE.MeshStandardMaterial({ color: 0x7a6e7e, emissive: 0x2a3444, roughness: .8, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), m); body.scale.set(1, .9, 1.6); bat.add(body);
  const sh = new THREE.Shape(); sh.moveTo(0, -.03); sh.lineTo(.08, -.05); sh.lineTo(.17, -.03); sh.quadraticCurveTo(.14, .0, .15, .03); sh.quadraticCurveTo(.11, .02, .1, .05); sh.quadraticCurveTo(.06, .03, .04, .06); sh.quadraticCurveTo(.02, .03, 0, .04); const wg = new THREE.ExtrudeGeometry(sh, { depth: .004, bevelEnabled: false }); wg.rotateX(Math.PI / 2);
  const wl = new THREE.Mesh(wg, m), wr = new THREE.Mesh(wg, m); wr.scale.x = -1; bat.add(wl, wr); bat.userData.w = [wl, wr];
}
const moth = new THREE.Mesh(new THREE.SphereGeometry(.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0xe8e0c8 })); moth.visible = false; scene.add(moth);
const rings = []; const ringGeo = new THREE.RingGeometry(.96, 1, 48);
function ping(from, color, back = false) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false })); m.position.copy(from); m.lookAt(camera.position); m.scale.setScalar(.02); scene.add(m); rings.push({ m, t: 0, back }); }

// 土の中：根と菌糸のつながり、行き来する粒
const under = new THREE.Group(); under.visible = false; scene.add(under);
const flowCurves = [];
{
  const rootMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: .9, emissive: 0x2a2010, transparent: true, opacity: .95 });
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const tips = [];
  const grow = (x0, z0, n, len, depth) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, pts = [new THREE.Vector3(x0, -.02, z0)]; let p = pts[0].clone(); for (let k = 0; k < 5; k++) { p = p.clone().add(new THREE.Vector3(Math.cos(a + (rnd() - .5)) * len * .22, -depth * (.2 + rnd() * .12), Math.sin(a + (rnd() - .5)) * len * .22)); pts.push(p); } const c = new THREE.CatmullRomCurve3(pts); under.add(new THREE.Mesh(new THREE.TubeGeometry(c, 20, .012 + rnd() * .012, 5), rootMat)); tips.push(...pts.slice(2)); } };
  grow(tree.position.x, tree.position.z, 9, 3.2, 1.6);
  flowers.children.forEach(f => grow(f.position.x, f.position.z, 2, .6, .4));
  const hyMat = new THREE.LineBasicMaterial({ color: 0xf2efe0, transparent: true, opacity: .35 });
  for (let i = 0; i < 70; i++) {
    const a = tips[Math.floor(rnd() * tips.length)], b = tips[Math.floor(rnd() * tips.length)]; if (!a || !b || a.distanceTo(b) > 2.6 || a.distanceTo(b) < .3) continue;
    const mid = a.clone().lerp(b, .5).add(new THREE.Vector3((rnd() - .5) * .4, -.15 * rnd(), (rnd() - .5) * .4));
    const c = new THREE.QuadraticBezierCurve3(a, mid, b); under.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(14)), hyMat)); flowCurves.push(c);
  }
}
const NP = 160, flowGeo = new THREE.BufferGeometry(), flowPos = new Float32Array(NP * 3), flowCol = new Float32Array(NP * 3), flowState = [];
for (let i = 0; i < NP; i++) { flowState.push({ c: i % Math.max(1, flowCurves.length), t: Math.random(), v: (.08 + Math.random() * .12) * (i % 2 ? 1 : -1) }); const sugar = i % 2 === 0; flowCol.set(sugar ? [1, .82, .45] : [.55, .85, 1], i * 3); }
flowGeo.setAttribute("position", new THREE.BufferAttribute(flowPos, 3)); flowGeo.setAttribute("color", new THREE.BufferAttribute(flowCol, 3));
under.add(new THREE.Points(flowGeo, new THREE.PointsMaterial({ size: .05, vertexColors: true, transparent: true, opacity: .95, depthWrite: false })));

// 昔の道と川の線（模式）
const past = new THREE.Group(); past.visible = false; scene.add(past);
const pastMats = [];
function trail(pts, color, w) { const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, .012, z))); const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }); pastMats.push([m, .85]); const g = new THREE.TubeGeometry(c, 80, w, 4); const mesh = new THREE.Mesh(g, m); mesh.scale.y = .05; mesh.position.y = .03; past.add(mesh); return c; }
const roadCurve = trail([[-7, 4], [-3, 2.4], [-.6, .6], [1.6, -1.4], [4, -2.8], [7.5, -3.6]], 0xe8c48a, .1);
trail([[-7, -1.5], [-4, -2.6], [-1, -3.4], [2.5, -4.6], [7, -5.5]], 0x78d6ec, .22);
const roadLab = label("昔の道（模式）", "#e8c48a"); roadLab.position.set(-3.2, .35, 2.6); past.add(roadLab);
const riverLab = label("昔の川（模式）", "#78d6ec"); riverLab.position.set(-1.2, .35, -3.6); past.add(riverLab);
const uvLab = { material: {} };
const batLab = { material: {} };
const soilLab = { material: {} };

// 依代
let yo = null, yoReady = null;
async function ensureYori() {
  if (yoReady) return yoReady;
  yoReady = (async () => {
    const Y = await import("./kit/yorishiro/yorishiro.js");
    yo = new Y.Yorishiro({ scene, camera, groundAt: () => 0 });
    const a = await yo.add("shizuku", { x: -.55, z: .2, yaw: .25, scale: .55, onTouch: () => say([{ t: "しずくの姿。水の層へ案内するときの、わたしです。" }]) });
    const b = await yo.add("ishi", { x: .6, z: .25, yaw: -.3, scale: .55, onTouch: () => say([{ t: "石の姿。長い時間をかけて積もった層へ案内するときの、わたしです。" }]) });
    for (const it of [a, b]) { it.root.visible = false; }
    return [a, b];
  })().catch(e => { console.warn("依代を読めませんでした", e); return []; });
  return yoReady;
}

// 字幕と碧の話
const cap = document.getElementById("cap");
let aoi = null, sayId = 0;
function say(lines, note = "") {
  const id = ++sayId;
  (async () => {
    for (const ln of lines) {
      if (id !== sayId) return;
      const dur = Math.max(1.8, ln.t.length * .14 + .5);
      cap.innerHTML = `<span class="${ln.q ? "q" : ""}"></span>${note ? `<span class="note"></span>` : ""}`;
      cap.firstChild.textContent = ln.t; if (note) cap.lastChild.textContent = note;
      if (aoi && aoi.root.visible) { aoi.motion.speak({ text: ln.t, dur: dur - .3, ref: ln.ref || null, gesture: ln.give ? [{ t: .4, type: "metaphoric", shape: "present" }] : null }); if (ln.express) aoi.motion.express(ln.express, .8, 2.5); }
      await new Promise(r => setTimeout(r, dur * 1000));
    }
  })();
}
const WORLDS = {
  uv: { on: () => {}, target: new THREE.Vector3(1.6, .3, .9), lines: [
    { t: "多くの鳥や虫には、紫外線の色も見えています。", give: 1 },
    { t: "花びらには、人には見えない紫外の模様を持つものがあります。" },
    { t: "いつもの花壇は、鳥の目にはどう映っているでしょう。", q: 1, express: "curious" }], note: "色は、見える色に置きかえた模式です" },
  bat: { target: new THREE.Vector3(0, 2.4, -1.4), lines: [
    { t: "多くのコウモリは、人には聴こえない高い声を出します。", give: 1 },
    { t: "はね返る音で、虫や枝の位置をつかみます。" },
    { t: "夕方の空。静かに見えて、本当に静かでしょうか。", q: 1, express: "curious" }], note: "輪と音は、聴こえる高さに下げた模式です" },
  soil: { target: new THREE.Vector3(-1.2, -.4, -.8), lines: [
    { t: "多くの植物の根は、菌根菌の細い糸とつながっています。", give: 1 },
    { t: "その糸を通して、水や養分と、植物がつくった糖がやりとりされます。" },
    { t: "足もとの土の中で、いま何が行き来しているでしょう。", q: 1, express: "curious" }], note: "根と糸の形、粒の動きは模式です" },
  road: { target: new THREE.Vector3(-2, 0, 2), lines: [
    { t: "地名や坂の名に、昔の川や道が残っていることがあります。", give: 1 },
    { t: "いまの道の下に、前の道が重なっている場所もあります。" },
    { t: "いつも歩く道の名前は、どこから来たのでしょう。", q: 1, express: "curious" }], note: "道と川の線は模式です" },
  yori: { lines: [
    { t: "Qualium の中で、わたしは姿を変えます。" },
    { t: "しずくや石の姿で、その場所の層へ案内します。", give: 1 },
    { t: "触れてみてください。", q: 1 }] },
};
const INTRO = [{ t: "わたしは碧。ビットとアトムのあわいに立ち、" }, { t: "この場所の記憶をたどり、五感をひらいて、" }, { t: "目の前の風景に層を重ねます。", express: "warm" }];

// 音（コウモリ：聴こえる高さに下げた短い声）
let ac = null;
function chirp() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(5200, t); o.frequency.exponentialRampToValueAtTime(2100, t + .05);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .005); g.gain.exponentialRampToValueAtTime(.0005, t + .07);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .08);
  } catch (e) {}
}

// 切りかえ
let mode = null; const fadeT = { uv: 0, bat: 0, soil: 0, road: 0, yori: 0 };
const btns = [...document.querySelectorAll(".dock button")];
function setMode(m) {
  mode = mode === m ? null : m;
  btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.w === mode)));
  if (!mode) { say([{ t: "いつもの庭に戻りました。" }]); aoi?.motion.lookAt(null); return; }
  if (mode === "yori") ensureYori();
  const W = WORLDS[mode];
  if (aoi && W.target) { aoi.motion.lookAt(W.target); setTimeout(() => aoi?.motion.point(W.target, 2.0), 400); setTimeout(() => aoi?.motion.lookAt(null), 1600); }
  say(W.lines, W.note || "");
}
btns.forEach(b => b.addEventListener("click", () => setMode(b.dataset.w)));

// 触れる：碧（名乗り）・依代
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
let down = null;
cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, yaw: camYaw }; });
cv.addEventListener("pointermove", e => { if (down && e.buttons) camYawT = THREE.MathUtils.clamp(down.yaw - (e.clientX - down.x) * .004, -.5, .5); });
cv.addEventListener("pointerup", e => {
  const moved = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8; down = null; if (moved) return;
  if (mode === "yori" && yo && yo.pick(e.clientX, e.clientY, cv)) return;
  if (!aoi || !aoi.root.visible) return;
  const r = cv.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(v2, camera);
  if (ray.intersectObject(aoi.root, true).length) { aoi.motion.bow("eshaku"); say(INTRO); }
});

// カメラ
let camYaw = 0, camYawT = 0;
function layout() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  const narrow = w / h < .8; camera.fov = narrow ? 46 : 34; camera.updateProjectionMatrix(); camera.userData.d = narrow ? 6.0 : 5.6; camera.userData.y = narrow ? 2.0 : 1.8; camera.userData.ly = narrow ? .95 : .85;
}
addEventListener("resize", layout); layout();

// 碧を読む（読み込み画面は碧が立つか 5 秒で消える）
loadAoi("aoi.vrm", { scene, posture: "natural", quality: innerWidth < 700 ? "mid" : "auto" }).then(a => {
  aoi = a; a.place(0, 0, 0);
  setTimeout(() => { if (!mode && sayId === 0) say([{ t: "こんばんは、碧です。下の札から、ひとつ選んでみてください。", q: 1 }]); }, 900);
}).catch(e => { console.warn("碧を読めませんでした", e); window.MLLoader?.done?.(); say([{ t: "下の札を押すと、届かない世界がひらきます。" }]); });

// 毎こま
const clock = new THREE.Clock(); let batT = 0, pingT = 0, t = 0;
const tmp = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), .05); t += dt;
  for (const k in fadeT) fadeT[k] += ((mode === k ? 1 : 0) - fadeT[k]) * Math.min(1, dt * (RM ? 20 : 3));
  // カメラ
  camYaw += (camYawT - camYaw) * Math.min(1, dt * 4);
  const d = camera.userData.d + fadeT.soil * .6, cy = camera.userData.y + fadeT.bat * .25 - fadeT.soil * .2;
  camera.position.set(Math.sin(camYaw) * d, cy + (RM ? 0 : Math.sin(t * .2) * .02), Math.cos(camYaw) * d);
  camera.lookAt(0, camera.userData.ly - fadeT.soil * .35 + fadeT.bat * .25, 0);
  // 鳥の目
  petalMat.map = fadeT.uv > .5 ? PT.uv : PT.vis; uvLab.material.opacity = Math.max(0, fadeT.uv * 2 - 1);
  // コウモリ
  bat.visible = moth.visible = fadeT.bat > .02; batLab.material.opacity = fadeT.bat;
  if (bat.visible) {
    batT += dt * (RM ? .2 : .55); const a = batT; const BR = camera.aspect < .8 ? 1.1 : 2.2; bat.position.set(Math.cos(a) * BR, 2.1 + Math.sin(a * 2.3) * .2, -1.2 + Math.sin(a) * 1.0);
    tmp.set(Math.cos(a + .05) * BR, 2.1, -1.2 + Math.sin(a + .05) * 1.0); bat.lookAt(tmp);
    bat.rotateX(-.9); const f = Math.sin(t * 9) * .55; bat.userData.w[0].rotation.z = f; bat.userData.w[1].rotation.z = -f;
    moth.position.set(Math.cos(a + .9) * BR * .8, 2.0 + Math.sin(t * 3) * .1, -1.2 + Math.sin(a + .9) * 1.1);
    if (mode === "bat" && (pingT -= dt) < 0) { pingT = .42; ping(bat.position, 0x8fb6dc); setTimeout(() => moth.visible && ping(moth.position, 0xe8e0c8, true), 220); chirp(); }
  }
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const s = .05 + r.t * (r.back ? .9 : 1.6); r.m.scale.setScalar(s); r.m.lookAt(camera.position); r.m.material.opacity = Math.max(0, (r.back ? .45 : .55) * (1 - r.t / 1.1)); if (r.t > 1.1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); } }
  // 土の中
  under.visible = fadeT.soil > .02; groundMat.opacity = 1 - fadeT.soil * .72; groundMat.depthWrite = fadeT.soil < .5; soilLab.material.opacity = fadeT.soil;
  if (under.visible && flowCurves.length) { for (let i = 0; i < NP; i++) { const s = flowState[i]; s.t += s.v * dt * (RM ? .2 : 1); if (s.t > 1) s.t -= 1; if (s.t < 0) s.t += 1; flowCurves[s.c].getPoint(s.t, tmp); flowPos[i * 3] = tmp.x; flowPos[i * 3 + 1] = tmp.y; flowPos[i * 3 + 2] = tmp.z; } flowGeo.attributes.position.needsUpdate = true; }
  // 昔の道
  past.visible = fadeT.road > .02; for (const [m, o] of pastMats) m.opacity = fadeT.road * o * (RM ? 1 : .8 + .2 * Math.sin(t * 1.2)); roadLab.material.opacity = riverLab.material.opacity = fadeT.road;
  // 依代：碧が姿を変える
  if (aoi) { const show = fadeT.yori < .5; aoi.root.visible = show; }
  if (yo) { for (const it of yo.items) { it.root.visible = fadeT.yori >= .5; it.root.scale.setScalar(.55 * Math.min(1, Math.max(.01, fadeT.yori * 2 - 1))); } yo.update(dt); }
  aoi?.tick(dt, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
  if (!frame.done) { frame.done = 1; window.MLLoader?.done?.(); }
}
requestAnimationFrame(frame);
