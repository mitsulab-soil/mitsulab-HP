/* © mitsulab. 碧の層（2026-11-02 本人「碧の層の説明…これもアプリを作成してください」）
   1 画面で完結：碧が庭に立ち、下の札で「人の感覚では届かない世界」を一つずつ訳して見せる。
   碧は共通部品（kit/aoi.js・AoiMotion）。依代（しずく・石）は kit/yorishiro/。札ごとに碧がしぐさで応える（AoiMotion の cue）。色や線は「置きかえた模式」と画面に書く。
   事実の範囲：多くの鳥・虫は紫外線を見る／紫外の模様を持つ花がある／コウモリは超音波の反響で位置をつかむ／多くの植物の根は菌根菌とつながり水・養分と糖をやりとりする／地名に昔の川や道が残ることがある。 */
import * as THREE from "three";

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const cv = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2c423c);
scene.fog = new THREE.FogExp2(0x2c423c, .062);   // 2026-11-10 第5周：霧を少し薄く・明るくし、奥の木立が段になって見えるように
const camera = new THREE.PerspectiveCamera(36, 1, .05, 80);

// 光
scene.add(new THREE.HemisphereLight(0xc4d9e2, 0x625a43, 1.8));
const key = new THREE.DirectionalLight(0xfff1dc, 2.4); key.position.set(1.8, 4, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0xcbd9d5, .65); rim.position.set(-3, 2.5, -4); scene.add(rim);

// 地面：土の円と、上品な等高線の輪
const TL = new THREE.TextureLoader(), tex = (u, rep, srgb = true) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const groundMat = new THREE.MeshStandardMaterial({ map: tex("tex/soil_forest.webp", 5), color: 0x8c7c64, roughness: .95, transparent: true, opacity: 1 });
{ const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, "#fff"); g.addColorStop(.55, "#fff"); g.addColorStop(.92, "#000"); x.fillStyle = g; x.fillRect(0, 0, 256, 256); groundMat.alphaMap = new THREE.CanvasTexture(c); groundMat.depthWrite = true; }
const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 72), groundMat); ground.rotation.x = -Math.PI / 2; scene.add(ground);
const contourMat = new THREE.LineBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: .07 });
for (let r = 1.5; r < 11; r += 1.1) {
  const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, w = 1 + .05 * Math.sin(a * 3 + r) + .03 * Math.sin(a * 5 - r * 2); pts.push(new THREE.Vector3(Math.cos(a) * r * w, .004, Math.sin(a) * r * w)); }
  scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), contourMat));
}
const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: THREE.DoubleSide, transparent: true, opacity: 1 });
// 草（板の束・軽く）
{
  const g = new THREE.BufferGeometry(); { const P = [-.009, 0, 0, .009, 0, 0, -.007, .05, .006, .007, .05, .006, -.005, .1, .016, .005, .1, .016, -.0025, .145, .032, .0025, .145, .032, 0, .18, .052], C = []; for (let i = 0; i < P.length; i += 3) { const k = P[i + 1] / .18; C.push(.07 + k * .09, .13 + k * .15, .07 + k * .05); } g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6, 5, 7, 6, 6, 7, 8]); g.computeVertexNormals(); }
  const m = grassMat;
  const N = innerWidth < 700 ? 2600 : 5200, im = new THREE.InstancedMesh(g, m, N), o = new THREE.Object3D();
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) { const a = rnd() * 6.283, r = 1 + Math.sqrt(rnd()) * 7; o.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); if (o.position.z > 2.2 && Math.abs(o.position.x) < 2.5) o.position.z -= 4; o.rotation.set((rnd() - .5) * .4, rnd() * 6.28, (rnd() - .5) * .4); { const sc = .6 + rnd() * .9; o.scale.set(sc * (.7 + rnd() * .6), sc, sc); } o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, new THREE.Color().setHSL(.2 + rnd() * .08, .35 + rnd() * .2, .45 + rnd() * .3)); }
  scene.add(im);
}
// 木（幹と、点の樹冠）
const tree = new THREE.Group(); tree.position.set(innerWidth < 700 ? -1.7 : -2.6, 0, -2.4); scene.add(tree);
{
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.11, .24, 3.6, 12), new THREE.MeshStandardMaterial({ map: tex("tex/bark_zelkova.webp", 1), normalMap: tex("tex/bark_zelkova_n.webp", 1, false), roughness: .95 })); trunk.material.map.repeat.set(2, 3); trunk.material.normalMap.repeat.set(2, 3); trunk.position.y = 1.4; tree.add(trunk);
  const P = [], C = []; let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) { const u = rnd() * 6.283, v = Math.acos(2 * rnd() - 1), r = Math.cbrt(rnd()) * 1.4; P.push(Math.sin(v) * Math.cos(u) * r * 1.2, 3.3 + Math.cos(v) * r * .8, Math.sin(v) * Math.sin(u) * r * 1.2); const k = .5 + rnd() * .5; C.push(.25 * k, .5 * k, .3 * k); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
  // 点を四角い画素でなく、葉の細い輪郭に。既存の1ドローを維持する。
  const leaf = document.createElement("canvas"); leaf.width = leaf.height = 32;
  const lx = leaf.getContext("2d"); lx.fillStyle = "white"; lx.beginPath(); lx.ellipse(16, 16, 7, 14, -.4, 0, Math.PI * 2); lx.fill();
  const leafMap = new THREE.CanvasTexture(leaf);
  tree.add(new THREE.Points(g, new THREE.PointsMaterial({ size: .075, map: leafMap, alphaTest: .45, vertexColors: true, transparent: false })));
}

// 2026-11-10 第5周：中ほどと奥に幹を立て、霧で段をつける（1 回の描画・三角形は約 2 千）
{ const bm = new THREE.MeshStandardMaterial({ map: tex("tex/bark_zelkova.webp", 1), color: 0x8a8070, roughness: .95 });
  const N = 34, im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.09, .2, 7, 8, 1, true), bm, N), o = new THREE.Object3D(); let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) { const a = Math.PI * (1.05 + rnd() * .9), r = 5 + rnd() * 9; o.position.set(Math.cos(a) * r, 3.3, Math.sin(a) * r); const k = .8 + rnd() * .9; o.scale.set(k, 1, k); o.rotation.y = rnd() * 6; o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  /* 第7周：幹ごとに樹皮の明るさと色みを変える */{ const cc = new THREE.Color(); for (let i = 0; i < N; i++) { const l = .75 + rnd() * .5; cc.setRGB(l * 1.05, l, l * (.86 + rnd() * .1)); im.setColorAt(i, cc); } }
  scene.add(im); }
// 遠くの木立の影（霧の向こう）と、まばらな星
{
  const g = new THREE.SphereGeometry(1, 10, 6); const m = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  const N = 70, im = new THREE.InstancedMesh(g, m, N), o = new THREE.Object3D(); let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) { const a = Math.PI * (1.1 + rnd() * .8), r = 16 + rnd() * 5, h = 3 + rnd() * 4; o.position.set(Math.cos(a) * r, h / 2 - .2, Math.sin(a) * r); o.scale.set(1.6 + rnd() * 1.6, h * .55, 1.6 + rnd() * 1.6); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  { const cc = new THREE.Color(), pal = [0x14251e, 0x1d2a1c, 0x24261b, 0x172320, 0x2a2a20]; for (let i = 0; i < N; i++) { cc.setHex(pal[(rnd() * pal.length) | 0]); cc.multiplyScalar(.85 + rnd() * .35); im.setColorAt(i, cc); } }   /* 第7周：単色の緑をやめ、深緑・苔・枯れ色の木立を混ぜる */
  scene.add(im);
  const P = []; for (let i = 0; i < 260; i++) { const a = rnd() * 6.283, e = .08 + rnd() * .9; P.push(Math.cos(a) * Math.cos(e) * 40, Math.sin(e) * 40, Math.sin(a) * Math.cos(e) * 40); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, color: 0xc8d4e6, transparent: true, opacity: .75, fog: false })));
}
// 花（ふつうの色 ⇄ 紫外の模様の置きかえ）
function petalTex(uv) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  const g = x.createLinearGradient(64, 126, 64, 2);   // 第8周：付け根から先へ（一色の円い塗りをやめる）
  if (uv) { g.addColorStop(0, "#1a0b2e"); g.addColorStop(.42, "#2a1450"); g.addColorStop(.48, "#d9c8ff"); g.addColorStop(1, "#f4eeff"); }
  else { g.addColorStop(0, "#9c6a12"); g.addColorStop(.18, "#d49a1e"); g.addColorStop(.55, "#e9bd36"); g.addColorStop(.9, "#efcf62"); g.addColorStop(1, "#d9b24a"); }
  x.fillStyle = g; x.beginPath(); x.moveTo(64, 126); x.bezierCurveTo(10, 90, 22, 10, 56, 4); x.quadraticCurveTo(64, 12, 72, 4); x.bezierCurveTo(106, 10, 118, 90, 64, 126); x.fill();
  x.strokeStyle = uv ? "rgba(40,20,80,.35)" : "rgba(120,72,8,.22)"; x.lineWidth = uv ? 1.2 : .8; for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(64, 124); x.quadraticCurveTo(64 + k * 9, 70, 64 + k * 7, 14); x.stroke(); }
  if (!uv) { x.globalCompositeOperation = "source-atop"; for (let i = 0; i < 900; i++) { const px = Math.random() * 128, py = Math.random() * 128, l = Math.random(); x.fillStyle = l < .5 ? "rgba(90,50,0,.07)" : "rgba(255,246,210,.08)"; x.fillRect(px, py, 1 + Math.random(), 3 + Math.random() * 5); }   // 花びらの細かなむら（写真のような一色の面にしない）
    const e = x.createRadialGradient(64, 40, 30, 64, 64, 70); e.addColorStop(0, "rgba(0,0,0,0)"); e.addColorStop(1, "rgba(70,40,0,.22)"); x.fillStyle = e; x.fillRect(0, 0, 128, 128); x.globalCompositeOperation = "source-over"; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const PT = { vis: petalTex(false), uv: petalTex(true) };
const petalMat = new THREE.MeshStandardMaterial({ map: PT.vis, transparent: true, alphaTest: .3, side: THREE.DoubleSide, roughness: .62 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x46703a, roughness: .8, side: THREE.DoubleSide });   // 第8周：茎に葉
const rnd = (() => { let a = 7; return () => (a = (a * 16807) % 2147483647) / 2147483647; })();   // 毎回同じ並び（決まった乱数）
const flowers = new THREE.Group(); scene.add(flowers);
[[1.5, .9], [2.0, -.2], [1.1, 1.6], [2.4, .7], [-1.6, 1.2], [-2.1, .2], [-1.2, 1.9], [.65, 1.25], [-.7, 1.45], [.35, 2.1], [-.3, 2.4]].forEach(([x, z], i) => {
  const f = new THREE.Group(); f.position.set(x, 0, z);
  const h = .32 + (i % 3) * .06;
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.006, .008, h, 5), new THREE.MeshStandardMaterial({ color: 0x3f6a34 })); st.position.y = h / 2; f.add(st);
  const head = new THREE.Group(); head.position.y = h; head.rotation.x = -1.1 + (rnd() - .5) * .45; head.rotation.z = (rnd() - .5) * .5; f.add(head);
  st.rotation.z = (rnd() - .5) * .14;
  for (let j = 0; j < 2; j++) { const lg = new THREE.PlaneGeometry(.028, .11, 1, 2); { const a = lg.attributes.position; for (let q = 0; q < a.count; q++) { const yy = a.getY(q); a.setX(q, a.getX(q) * (1 - Math.abs(yy) * 7)); a.setZ(q, -Math.pow(yy + .055, 2) * 3); } lg.computeVertexNormals(); } const lf = new THREE.Mesh(lg, leafMat); lf.position.set(0, h * (.25 + j * .22), 0); lf.rotation.set(-.9, j * 2.6 + rnd(), 0); lf.translateY(.05); f.add(lf); }
  const NP = 8 + (i % 3) * 2;
  for (let k = 0; k < NP; k++) { const pg = new THREE.PlaneGeometry(.045, .1, 1, 3); { const a = pg.attributes.position; for (let i = 0; i < a.count; i++) { const yy = a.getY(i); a.setZ(i, -Math.pow(yy + .05, 2) * 1.6); } pg.computeVertexNormals(); } const p = new THREE.Mesh(pg, petalMat); const an = (k + (rnd() - .5) * .35) / NP * 6.283; p.position.set(Math.cos(an) * .05, Math.sin(an) * .05, 0); p.rotation.z = an - Math.PI / 2; p.rotation.x = .12 + rnd() * .3; p.scale.set(.75 + rnd() * .3, .85 + rnd() * .25, 1); head.add(p); }
  const ctr = new THREE.Mesh(new THREE.SphereGeometry(.022, 12, 8), new THREE.MeshStandardMaterial({ color: 0x7a4a12, roughness: 1 })); ctr.scale.z = .5; ctr.position.z = .002; head.add(ctr);
  flowers.add(f);
});
flowers.children[7].scale.setScalar(1.6);   // 第5周：光る花を大きく（子どもが見つけやすく）

// 2026-11-10 第4周：場の中の物に触れて選ぶ。手前の花を一つ、淡く光らせて誘う（押すと「鳥の目」）
const invite = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(240,232,250,.8)"); gr.addColorStop(.3, "rgba(206,190,226,.32)"); gr.addColorStop(1, "rgba(206,190,226,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, opacity: .45 })); sp.position.set(.65, .61, 1.25); sp.scale.setScalar(.5); scene.add(sp); return sp; })();

// 札（3D の小さな字）
function label(text, color = "#c3cce0") {
  const c = document.createElement("canvas"), x = c.getContext("2d"), fs = 44; x.font = `${fs}px "Hiragino Mincho ProN","Yu Mincho",serif`;
  c.width = Math.ceil(x.measureText(text).width) + 24; c.height = fs + 20; x.font = `${fs}px "Hiragino Mincho ProN","Yu Mincho",serif`;
  x.fillStyle = color; x.textBaseline = "middle"; x.fillText(text, 12, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 })); s.scale.set(c.width / c.height * .1, .1, 1); return s;
}

// コウモリと反響の輪
const bat = new THREE.Group(); bat.visible = false; bat.scale.setScalar(3.2); scene.add(bat);
{
  const fur = new THREE.MeshStandardMaterial({ color: 0x5a4636, emissive: 0x1a1d2a, roughness: .95 });
  const mem = new THREE.MeshStandardMaterial({ color: 0x3e3034, emissive: 0x141a26, roughness: .7, side: THREE.DoubleSide, transparent: true, opacity: .92 });
  const bone = new THREE.LineBasicMaterial({ color: 0x8a7a70 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8), fur); body.scale.set(.9, .8, 1.9); bat.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.013, 10, 8), fur); head.position.set(0, .004, .036); bat.add(head);
  for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.007, .022, 6), fur); ear.position.set(sx * .007, .017, .038); ear.rotation.z = -sx * .25; bat.add(ear); }
  // 翼：腕から 3 本の指の骨が広がり、そのあいだの膜が後ろへ弧を描く（翼手目の模式）
  const F = [[.05, .012], [.13, .03], [.19, .0], [.16, -.05], [.09, -.06]];
  const sh = new THREE.Shape(); sh.moveTo(0, .01); sh.lineTo(F[0][0], F[0][1]); sh.lineTo(F[1][0], F[1][1]); sh.lineTo(F[2][0], F[2][1]);
  sh.quadraticCurveTo(.16, -.015, F[3][0], F[3][1]); sh.quadraticCurveTo(.12, -.035, F[4][0], F[4][1]); sh.quadraticCurveTo(.04, -.035, 0, -.04);
  const wg = new THREE.ShapeGeometry(sh, 6); wg.rotateX(-Math.PI / 2);
  const bg = new THREE.BufferGeometry().setFromPoints([[F[0], F[1]], [F[0], F[2]], [F[0], F[3]], [F[0], F[4]], [[0, .01], F[0]]].flatMap(([a, b]) => [new THREE.Vector3(a[0], .001, -a[1]), new THREE.Vector3(b[0], .001, -b[1])]));
  const mk = sx => { const w = new THREE.Group(); w.add(new THREE.Mesh(wg, mem), new THREE.LineSegments(bg, bone)); w.scale.set(sx * 1.35, 1, 1.35); w.position.x = sx * .008; bat.add(w); return w; };
  bat.userData.w = [mk(1), mk(-1)];
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
  const grow = (x0, z0, n, len, depth) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, pts = [new THREE.Vector3(x0, -.1, z0)]; let p = pts[0].clone(); for (let k = 0; k < 5; k++) { p = p.clone().add(new THREE.Vector3(Math.cos(a + (rnd() - .5)) * len * .22, -depth * (.2 + rnd() * .12), Math.sin(a + (rnd() - .5)) * len * .22)); pts.push(p); } const c = new THREE.CatmullRomCurve3(pts); under.add(new THREE.Mesh(new THREE.TubeGeometry(c, 20, .005 + rnd() * .006, 5), rootMat)); tips.push(...pts.slice(2)); } };
  grow(tree.position.x, tree.position.z, 9, 3.2, 1.6);
  flowers.children.forEach(f => grow(f.position.x, f.position.z, 2, .6, .4));
  const hyMat = new THREE.LineBasicMaterial({ color: 0xf2efe0, transparent: true, opacity: .22 });
  for (let i = 0; i < 160; i++) {
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
function trail(pts, color, w) { const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, .012, z))); const m = new THREE.PointsMaterial({ color, size: .075, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }); pastMats.push([m, .9]); const L = c.getLength(), N = Math.round(L / .05) * Math.max(1, Math.round(w / .05)), P = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const u = (i % Math.round(L / .05)) / Math.round(L / .05), q = c.getPointAt(u), tg = c.getTangentAt(u), off = (Math.random() - .5) * w * 2; P.set([q.x - tg.z * off, .02 + Math.random() * .015, q.z + tg.x * off], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); past.add(new THREE.Points(g, m)); return c; }
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


// アプリ内だけで HP の碧と光を揃える。VRM の造形・色の地図・共通kitは変更しない。
const clothFade = [];
function harmonizeAoi(a) {
  const treated = new Set(), cloth = new Map();
  a.root.traverse(o => { if (!o.isMesh) return;
    const convert = m => {
      if (!m) return m;
      if (!treated.has(m)) {
        treated.add(m);
        if (m.matcapFactor) m.matcapFactor.multiplyScalar(/SKIN/.test(m.name) ? .10 : .025);
        if (m.parametricRimColorFactor) m.parametricRimColorFactor.multiplyScalar(.15);
        if (m.emissive) m.emissive.multiplyScalar(.2);
        if (m.shadingToonyFactor != null) m.shadingToonyFactor = Math.min(m.shadingToonyFactor, .25);
        if (m.giEqualizationFactor != null) m.giEqualizationFactor = Math.min(m.giEqualizationFactor, .3);
        m.needsUpdate = true;
      }
      if (!/CLOTH/.test(m.name) || m.isOutline) return m;
      if (cloth.has(m)) return cloth.get(m);
      const n = new THREE.MeshPhysicalMaterial({ name: m.name + ' / garden cloth', map: m.map,
        color: m.color?.clone() || 0xffffff, normalMap: m.normalMap || null,
        roughness: .94, metalness: 0, sheen: .3, sheenRoughness: .85, sheenColor: new THREE.Color(0xb8c8c0),
        side: m.side, alphaTest: m.alphaTest, transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite });
      cloth.set(m, n); clothFade.push([m, n]); return n;
    };
    o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
  });
}

// 字幕と碧の話
const cap = document.getElementById("cap");
let aoi = null, sayId = 0, srcOpen = false;
function say(lines, note = null) {
  const id = ++sayId;
  (async () => {
    for (const ln of lines) {
      if (id !== sayId) return; const first = ln === lines[0];
      const dur = Math.max(1.8, ln.t.length * .14 + .5);
      cap.innerHTML = `<span class="${ln.q ? "q" : ""}"></span>${note ? `<details class="src"${srcOpen ? " open" : ""}><summary aria-label="出典と模式について">＋</summary><p class="n1"></p><p class="n2"></p></details>` : ""}`;
      cap.firstChild.textContent = ln.t; if (first && note?.k) { const k = document.createElement("div"); k.className = "note"; k.textContent = (note.k === "mitsulab の創作" ? "創作" : "模式・出典：" + note.k); cap.insertBefore(k, cap.firstChild.nextSibling); }   /* 11-10 第3周：札の最初の字幕に、模式と出典を短く */ if (ln.link) { const a = document.createElement("a"); a.href = "https://mitsulab.jp/x/09/"; a.target = "_blank"; a.rel = "noopener"; a.className = "go"; a.textContent = "Qualium 大宮をひらく ↗"; cap.appendChild(a); } if (note) { const d = cap.querySelector(".src"); d.querySelector(".n1").textContent = note.m; d.querySelector(".n2").textContent = note.s ? "出典：" + note.s : ""; d.addEventListener("toggle", () => { srcOpen = d.open; }); }
      if (aoi && aoi.root.visible) { aoi.motion.speak({ text: ln.t, dur: dur - .3, ref: ln.ref || null, gesture: ln.g ? ln.g.map(x => x.type === "deictic" && !x.target ? { ...x, target: WORLDS[mode]?.target } : x) : ln.give ? [{ t: .4, type: "metaphoric", shape: "present" }] : null }); if (ln.express) aoi.motion.express(ln.express, .8, 2.5); }
      await new Promise(r => setTimeout(r, dur * 1000));
    }
  })();
}
const WORLDS = {
  uv: { on: () => {}, target: new THREE.Vector3(1.6, .3, .9), lines: [
    { t: "鳥には、花がどう見えているのだろう？", q: 1 },
    { t: "多くの鳥や虫には、紫外線の色も見えています。", g: [{ t: .9, type: "cue", shape: "lookup", hold: 1.5 }] },
    { t: "鳥の目で見ると、花びらに紫外の模様が浮かぶ花があります。", g: [{ t: .9, type: "deictic" }] }], note: { k: "Cuthill ほか 2000", m: "色は、見える色に置きかえた模式です。", s: "Cuthill, I. C. et al. (2000) Ultraviolet vision in birds. Advances in the Study of Behavior 29: 159–214." } },
  bat: { target: new THREE.Vector3(0, 2.4, -1.4), lines: [
    { t: "夕方の空は、本当に静かなのだろう？", q: 1 },
    { t: "多くのコウモリは、人には聴こえない高い声を出します。", g: [{ t: .9, type: "cue", shape: "lookup", hold: 1.5 }] },
    { t: "はね返る音で、虫や枝の位置をつかみます。", g: [{ t: .9, type: "cue", shape: "listen", hold: 1.5 }] }], note: { k: "Griffin 1958", m: "輪と音は、聴こえる高さに下げた模式です。", s: "Griffin, D. R. (1958) Listening in the Dark. Yale University Press." } },
  soil: { target: new THREE.Vector3(-1.2, -.4, -.8), lines: [
    { t: "足もとの土の中では、何が行き来しているのだろう？", q: 1 },
    { t: "多くの植物の根は、菌根菌の細い糸とつながっています。", g: [{ t: .9, type: "cue", shape: "below", hold: 1.5 }] },
    { t: "その糸を通して、水や養分と、植物がつくった糖がやりとりされます。", give: 1 }], note: { k: "Smith & Read 2008", m: "根と糸の形、粒の動きは模式です。", s: "Smith, S. E. & Read, D. J. (2008) Mycorrhizal Symbiosis, 3rd ed. Academic Press." } },
  road: { target: new THREE.Vector3(-2, 0, 2), lines: [
    { t: "いつもの道の名前は、どこから来たのだろう？", q: 1 },
    { t: "地名や坂の名に、昔の川や道が残っていることがあります。", g: [{ t: .9, type: "cue", shape: "far", hold: 1.5 }] },
    { t: "いまの道の下に、前の道が重なっている場所もあります。", g: [{ t: .6, type: "deictic" }] }], note: { k: "国土地理院 旧版地図", m: "道と川の線は模式です（特定の場所の線ではありません）。", s: "国土地理院「地理院地図」の旧版地図・治水地形分類図で、場所ごとに確かめられます。" } },
  yori: { lines: [
    { t: "碧がしずくや石の姿になったら、何が見えるだろう？", q: 1 },
    { t: "これは、姿を変えたわたしです。" },
    { t: "Qualium の中で、わたしは姿を変えます。" },
    { t: "しずくや石の姿で、その場所の層へ案内します。" },
    { t: "触れてみてください。", q: 1 }], note: { k: "mitsulab の創作", m: "姿を変えた碧は mitsulab の創作です。" } },
};
/* 2026-11-10 第7周：名乗りは本人の確定文を一度に全文で（途中で切れて見えないように） */const INTRO = [{ t: "わたしは碧。ビットとアトムのあわいに立ち、この場所の記憶をたどり、五感をひらいて、目の前の風景に層を重ねます。", express: "warm" }];

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
function setMode(m) { document.body.classList.add("picked");
  mode = mode === m ? null : m;
  btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.w === mode)));
  if (!mode) { say([{ t: "いつもの庭に戻りました。" }]); aoi?.motion.lookAt(null); return; }
  const W = WORLDS[mode];
  if (mode === "yori") ensureYori();
  if (aoi && W.target) { aoi.motion.lookAt(W.target); setTimeout(() => aoi?.motion.lookAt(null), 900); }   // 指す・見上げる・耳を澄ますは、一行めのしぐさ（cue）に任せる
  say(W.lines, W.note || null);
}
btns.forEach(b => b.addEventListener("click", () => setMode(b.dataset.w)));

// 画面内の人物と、見えるボタンの Enter / Space は同じ名乗りへ。
function introduceAoi() {
  if (mode) setMode(mode);
  aoi?.motion.bow("eshaku"); say(INTRO);
}
document.getElementById("meetAoi").addEventListener("click", introduceAoi);
window.__bound = 1; if (window.__early) { const e0 = window.__early; window.__early = null; e0 === "meet" ? introduceAoi() : setMode(e0); }
setTimeout(() => window.MLLoader?.done?.(), 0);   // 2026-11-09 札は先に押せるように、最初のこまを待たずに読み込み画面を外す
// 触れる：碧（名乗り）・依代
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
let down = null;
cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, yaw: camYaw }; });
cv.addEventListener("pointermove", e => { if (down && e.buttons) camYawT = THREE.MathUtils.clamp(down.yaw - (e.clientX - down.x) * .005, -1.1, 1.1); });
cv.addEventListener("pointerup", e => {
  const moved = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8; down = null; if (moved) return;
  if (mode === "yori" && yo && yo.pick(e.clientX, e.clientY, cv)) return;
  { const r = cv.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(v2, camera);
    const pr = invite.position.clone().project(camera), near = Math.hypot((pr.x - v2.x) * r.width / 2, (pr.y - v2.y) * r.height / 2) < 46;
    if (mode !== "uv" && (near || ray.intersectObject(flowers, true).length)) { setMode("uv"); return; } }
  if (!aoi || !aoi.root.visible) return;
  const r = cv.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(v2, camera);
  if (ray.intersectObject(aoi.root, true).length) { introduceAoi(); }
});

// カメラ
let camYaw = 0, camYawT = 0;
function layout() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  const narrow = w / h < .8; camera.fov = narrow ? 46 : 34; camera.updateProjectionMatrix(); camera.userData.d = narrow ? 5.3 : 4.7; camera.userData.y = narrow ? 2.0 : 1.8; camera.userData.ly = narrow ? .95 : .85;
}
addEventListener("resize", layout); layout();

// 碧を読む（読み込み画面は碧が立つか 5 秒で消える）
// 2026-11-09：草地と札を先に見せ、碧は最初のこまのあとで読む
new Promise(r => setTimeout(r, 400)).then(() => import("./kit/aoi.js")).then(m => m.loadAoi("aoi.vrm", { scene, posture: "natural", quality: innerWidth < 700 ? "mid" : "auto" })).then(a => {
  aoi = a; window.__aoiModelLoaded = performance.now(); a.place(0, 0, 0); harmonizeAoi(a); try { renderer.compile(scene, camera); } catch { } a.t0 = performance.now();
  setTimeout(() => { if (!mode && sayId === 0) say([{ t: "こんばんは、碧です。光っている花に、触れてみてください。", q: 1 }]); }, 900);
}).catch(e => { console.warn("碧を読めませんでした", e); window.MLLoader?.done?.(); say([{ t: "下の札から、ひとつ選んでみてください。" }]); });

// Qualium の札：庭から遠くの町へ続く、光の粒の道
const way = (() => { const c = new THREE.CatmullRomCurve3([[.5, 1.4], [.9, -.4], [.6, -3], [1.3, -6.5], [.7, -11], [1.6, -18]].map(([x, z]) => new THREE.Vector3(x, .05, z))); const N = 700, P = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const q = c.getPoint(i / N); P.set([q.x + (Math.random() - .5) * .25, .12 + Math.random() * .25, q.z + (Math.random() - .5) * .25], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); const m = new THREE.PointsMaterial({ color: 0xa8f2f6, size: .05, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }); const pts = new THREE.Points(g, m); pts.visible = false; scene.add(pts); return { pts, m, c }; })();
// 世界の色（札ごと）
const TINT = { none: [0x31483f, 0xd2e4ea, 2.3], uv: [0x0b0618, 0xc6a8f0, 1.7], bat: [0x010309, 0x6f86b0, .8], soil: [0x060504, 0xc9a77a, 1.2], road: [0x0d0904, 0xe8c48a, 1.3], yori: [0x03080e, 0xa8f2f6, 1.6] };
const hemi = scene.children.find(o => o.isHemisphereLight), cA = new THREE.Color(), cB = new THREE.Color();
let glanceT = 4;
// 毎こま
const clock = new THREE.Clock(); let batT = 0, pingT = 0, t = 0;
const tmp = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), .05); t += dt;
  for (const k in fadeT) fadeT[k] += ((mode === k ? 1 : 0) - fadeT[k]) * Math.min(1, dt * (RM ? 20 : 3));
  { const T = TINT[mode || "none"], k = Math.min(1, dt * 2.5); cA.setHex(T[0]); scene.background.lerp(cA, k); scene.fog.color.copy(scene.background); cB.setHex(T[1]); hemi.color.lerp(cB, k); hemi.intensity += (T[2] - hemi.intensity) * k; }
  // 碧の目線：ときどき庭の何かへ目を向ける
  if (aoi && !RM && (glanceT -= dt) < 0) { glanceT = 5 + Math.random() * 4; const W = mode && WORLDS[mode].target; const p = W ? W.clone().add(new THREE.Vector3((Math.random() - .5) * .8, Math.random() * .3, 0)) : new THREE.Vector3((Math.random() - .5) * 4, .2 + Math.random() * 1.2, 1.5 + Math.random() * 2); aoi.motion.lookAt(p); setTimeout(() => aoi?.motion.lookAt(null), 1400 + Math.random() * 900); }
  if (aoi && !aoi.shown && aoi.t0 && (clothFade.length && clothFade.every(([s]) => s.opacity >= .98) || performance.now() - aoi.t0 > 1100)) aoi.shown = true;   /* 透けて現れる途中は、暗い背景に衣が黒く透けて見える→透けが終わってから出す */
  if (aoi) aoi.root.visible = fadeT.yori < .5 && !!aoi.shown;   /* 11-10 第3周：375 の初回に衣が黒く見えた＝材質を組み終えるまで出さない */
  invite.visible = !mode && fadeT.yori < .5; if (invite.visible) { const k = RM ? .5 : .38 + .14 * Math.sin(t * 1.3); invite.material.opacity = k; invite.scale.setScalar(.34 + (RM ? 0 : .04 * Math.sin(t * 1.3)));   /* 2026-11-10 第6周：光る花を風景になじませる（小さく・淡く・ゆっくり） */ }
  { const idle = mode ? 0 : (RM ? .14 : .1 + .07 * Math.sin(t * .6)); frame.idle = idle; if (idle) { if (!RM && (frame.hintT = (frame.hintT ?? 2.5) - dt) < 0) { frame.hintT = 3.8; /* 第5周：空の大きな輪は意味が伝わらないので出さない */ } } }   /* 11-10 第3周：札を押す前から、層の気配（昔の道の淡い線・空の輪）を背景に */
  if (yo) { for (const it of yo.items) { it.root.visible = fadeT.yori >= .5; it.root.scale.setScalar(.55 * Math.min(1, Math.max(.01, fadeT.yori * 2 - 1))); } yo.update(dt); }
  way.pts.visible = false; way.m.opacity = fadeT.yori * (RM ? .8 : .6 + .25 * Math.sin(t * 1.5)); way.m.size = .11 + .02 * Math.sin(t * 2);
  // カメラ
  camYaw += (camYawT - camYaw) * Math.min(1, dt * 4);
  const d = camera.userData.d + fadeT.soil * .6, cy = camera.userData.y + fadeT.bat * .25 + fadeT.soil * 1.1;
  camera.position.set(Math.sin(camYaw) * d, cy + (RM ? 0 : Math.sin(t * .2) * .02), Math.cos(camYaw) * d);
  camera.lookAt(0, camera.userData.ly - fadeT.soil * .75 + fadeT.bat * .25, 0);
  // 鳥の目
  petalMat.map = fadeT.uv > .5 ? PT.uv : PT.vis; uvLab.material.opacity = Math.max(0, fadeT.uv * 2 - 1);
  // コウモリ
  bat.visible = moth.visible = fadeT.bat > .02; batLab.material.opacity = fadeT.bat;
  if (bat.visible) {
    batT += dt * (RM ? .2 : .55); const a = batT; const BR = camera.aspect < .8 ? .8 : 1.6; bat.position.set(Math.cos(a) * BR, (BR < 2 ? 1.75 : 2.1) + Math.sin(a * 2.3) * .2, -1.2 + Math.sin(a) * 1.0);
    tmp.set(Math.cos(a + .05) * BR, 2.1, -1.2 + Math.sin(a + .05) * 1.0); bat.lookAt(tmp);
    bat.rotateX(.75); bat.rotateZ(Math.sin(a * 2) * .35); const f = Math.sin(t * 9) * .6; bat.userData.w[0].rotation.z = f; bat.userData.w[1].rotation.z = -f;
    moth.position.set(Math.cos(a + .9) * BR * .8, 2.0 + Math.sin(t * 3) * .1, -1.2 + Math.sin(a + .9) * 1.1);
    if (mode === "bat" && (pingT -= dt) < 0) { pingT = .42; ping(bat.position, 0x8fb6dc); setTimeout(() => moth.visible && ping(moth.position, 0xe8e0c8, true), 220); chirp(); }
  }
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const s = .05 + r.t * (r.back ? .6 : 1.0); r.m.scale.setScalar(s); r.m.lookAt(camera.position); r.m.material.opacity = Math.max(0, (r.back ? .45 : .55) * (1 - r.t / 1.1)); if (r.t > 1.1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); } }
  // 土の中
  under.visible = fadeT.soil > .02; groundMat.opacity = 1 - fadeT.soil * .72; groundMat.depthWrite = fadeT.soil < .5; soilLab.material.opacity = fadeT.soil; grassMat.opacity = 1 - fadeT.soil * .8; grassMat.depthWrite = fadeT.soil < .5; flowers.visible = fadeT.soil < .9;
  if (under.visible && flowCurves.length) { for (let i = 0; i < NP; i++) { const s = flowState[i]; s.t += s.v * dt * (RM ? .2 : 1); if (s.t > 1) s.t -= 1; if (s.t < 0) s.t += 1; flowCurves[s.c].getPoint(s.t, tmp); flowPos[i * 3] = tmp.x; flowPos[i * 3 + 1] = tmp.y; flowPos[i * 3 + 2] = tmp.z; } flowGeo.attributes.position.needsUpdate = true; }
  // 昔の道
  past.visible = fadeT.road > .02 || !mode; for (const [m, o] of pastMats) m.opacity = Math.max(fadeT.road * o * (RM ? 1 : .8 + .2 * Math.sin(t * 1.2)), (frame.idle || 0) * o); roadLab.material.opacity = riverLab.material.opacity = fadeT.road;
  // 依代：碧が姿を変える
  aoi?.tick(dt, camera);
  // kit が元材質に適用する登場のフェードを、衣服の物理材質へ引き継ぐ。
  for (const [source, cloth] of clothFade) {
    if (cloth.transparent !== source.transparent || cloth.depthWrite !== source.depthWrite) cloth.needsUpdate = true;
    cloth.opacity = source.opacity; cloth.transparent = source.transparent; cloth.depthWrite = source.depthWrite;
  }
  renderer.render(scene, camera);
  if (aoi && !window.__aoiLayerReady && (!clothFade.length || clothFade.every(([source]) => source.opacity >= 1))) window.__aoiLayerReady = performance.now();
  requestAnimationFrame(frame);
  if (!frame.done) { frame.done = 1; window.MLLoader?.done?.(); }
}
requestAnimationFrame(frame);
