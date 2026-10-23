/* Qualium 川越（旧 Qualia/walk 川越）── （2026-10-22 初版・10-23 公開）
   3D 地図（上空）から始める場所を選ぶ → 降りて歩く（見回しながら）／鳥になって飛ぶ／生きもの（Qualia/sight）になる。
   左の層の一覧：Qualia/sight・touch・sound（sho を含む）・nature・culture（歴史を含む）の 5 つ。触れると重ねる／外す（既定は全部重ねる）。
   建物は OpenStreetMap の平面を、電脳の HUD のような半透明の薄いグラフィックに（高さは模式）。一番街の店蔵の型と時の鐘だけ写実の 3D。
   座標：x＝東 m・y＝標高 m・z＝南 m（原点＝時の鐘 35.92348N 139.48334E）。
   walk 氷川（web/lite/app.js）の作りを写して、川越の中身で組み直した（氷川のファイルは触っていない）。 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { QLAYERS, makeMarker, makeLabel } from "./layers.js?v=k1";
import { kuraMats, kuraGeos, machiGeos, bellGeos, W0, D0 } from "./kura.js?v=k3";
import { BellSynth } from "./bell.js?v=k1";

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 820;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const T0 = performance.now();
const QW = window.__qw = { ready: false, mode: "boot" }; QW.THREE = THREE;
const VER = "20261023k";
const status = t => { const e = $("#bootStatus"); if (e) e.textContent = t; };

/* ---------- 描画 ---------- */
const canvas = $("#gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance" });
const PR_MAX = MOBILE ? Math.min(devicePixelRatio, 1.6) : Math.min(devicePixelRatio, 1.5);
let pr = PR_MAX; renderer.setPixelRatio(pr);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
QW.renderer = renderer;
const scene = new THREE.Scene(), world = new THREE.Group(); scene.add(world); QW.scene = scene;
const camera = new THREE.PerspectiveCamera(MOBILE ? 62 : 55, innerWidth / innerHeight, .08, 7000); scene.add(camera); QW.camera = camera;
const FOG = new THREE.Color("#b9c8d6");   // walk 氷川と同じ空の色
scene.fog = new THREE.Fog(FOG, 900, 3800);
const hemi = new THREE.HemisphereLight("#dbe6f4", "#5a5246", 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight("#ffeedd", 2.4); sun.position.set(-420, 380, 160); scene.add(sun, sun.target);   // 午後の西日（一番街の東側の店蔵の正面を照らす向き）
function skyTex() { const c = document.createElement("canvas"); c.width = 4; c.height = 256; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#6f8fb4"); g.addColorStop(.42, "#a9bfd4"); g.addColorStop(.5, "#c3cdd6"); g.addColorStop(1, "#c8ccc9"); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t; }
scene.background = skyTex();
{ const pm = new THREE.PMREMGenerator(renderer); const e = new THREE.Scene(); e.background = scene.background; scene.environment = pm.fromScene(e, .04).texture; pm.dispose(); }
// 雲のある空（walk 氷川と同じ写し：Poly Haven「Kloofendal 48d Partly Cloudy (Pure Sky)」CC0）。読めたら差し替える
const NAVY = new THREE.Color("#03060f"); QW.skyBg = scene.background;   // 2026-10-23 夜：3D 地図は暗い地（電脳の地図・氷川と同じ）
const CYBER = { v: { value: 1 }, scan: { value: 0 } };   // 3D 地図の地面：暗い地に細い格子・等高線・ゆっくり流れる光の走査（1＝地図・0＝歩く）
const cyberize = sh => { sh.uniforms.uCy = CYBER.v; sh.uniforms.uScan = CYBER.scan;
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vCw;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvCw=(modelMatrix*vec4(transformed,1.)).xyz;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uCy; uniform float uScan; varying vec3 vCw;\nfloat gridL(vec2 p, float s){ vec2 q=abs(fract(p/s+.5)-.5)*s; vec2 w=fwidth(p)*1.3; vec2 l=1.-smoothstep(vec2(0.),w,q); return max(l.x,l.y); }")
    .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\nif(uCy>.001){ vec2 p=vCw.xz; float fw=length(fwidth(p)); float g1=gridL(p,100.), g2=gridL(p,20.)*(1.-smoothstep(1.5,5.,fw)); float hh=vCw.y; float cq=abs(fract(hh+.5)-.5); float cl=1.-smoothstep(0.,fwidth(hh)*1.3,cq); float sc=exp(-pow((p.y-uScan)/60.,2.)); vec3 ln=vec3(.32,.78,.9); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.01,.025,.045),uCy); totalEmissiveRadiance+=uCy*(ln*(g1*.32+g2*.1+cl*.18)+ln*sc*(.05+g1*.4+cl*.3)); }"); };
new THREE.TextureLoader().load("web/tex/sky.webp", t => { t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; QW.skyBg = t; if (CYBER.v.value < .5) scene.background = t; const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(t).texture; pm.dispose(); });
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

/* ---------- データ ---------- */
let G = null, C = null, DEM = null;
const groundY = (x, z) => {
  if (!DEM) return 19.6; const g = G.dem;
  const c = Math.min(Math.max((x - g.x0) / g.cell, 0), g.nx - 1.001), r = Math.min(Math.max((z - g.z0) / g.cell, 0), g.nz - 1.001);
  const i = c | 0, j = r | 0, fx = c - i, fz = r - j, k = j * g.nx + i;
  return (DEM[k] * (1 - fx) * (1 - fz) + DEM[k + 1] * fx * (1 - fz) + DEM[k + g.nx] * (1 - fx) * fz + DEM[k + g.nx + 1] * fx * fz) / 100;
};
function atD(d) { const L = G.lineD, P = G.line; d = Math.max(0, Math.min(L[L.length - 1], d)); let lo = 0, hi = L.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= d) lo = m; else hi = m; }
  const t = (d - L[lo]) / Math.max(1e-6, L[hi] - L[lo]), a = P[lo], b = P[hi], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / len, tz: (b[1] - a[1]) / len }; }
function nearestOnLine(x, z) { const P = G.line, L = G.lineD; let best = 1e18, bd = 0, bs = 0;
  for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz || 1e-9; let t = ((x - a[0]) * vx + (z - a[1]) * vz) / l2; t = Math.max(0, Math.min(1, t));
    const px = a[0] + vx * t, pz = a[1] + vz * t, dd = (x - px) ** 2 + (z - pz) ** 2; if (dd < best) { best = dd; bd = L[i] + t * Math.sqrt(l2); bs = (vx * (z - a[1]) - vz * (x - a[0])) / Math.sqrt(l2); } }
  return { d: bd, s: bs, dist: Math.sqrt(best) }; }
const yawAlong = d => { const a = atD(d); return Math.atan2(-a.tx, -a.tz); };   // 道のりの増える向き（北へ）を向く

const TL = new THREE.TextureLoader();
const texP = (u, srgb = true) => new Promise((res, rej) => TL.load(u, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 2 : 8; res(t); }, undefined, rej));

/* ---------- 地形（標高 5 m 格子・空中写真） ---------- */
const DESAT = { value: 0 };   // 2026-10-23 公開前：鳥の高さで見ると、空中写真の粗い所が青緑の水面のように見えたので、sight では写真の色みを抜いて灰にする
const desat = m => { m.onBeforeCompile = (sh => { const prev = m._obc; return s => { prev && prev(s); s.uniforms.uDesat = DESAT; s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uDesat;").replace("#include <map_fragment>", "#include <map_fragment>\n { float lu=dot(diffuseColor.rgb,vec3(.299,.587,.114)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(lu*1.03,lu,lu*.95),uDesat); }"); }; })(); return m; };
async function buildBase() {
  status("地形を読み込んでいます");
  const [g, c, dem] = await Promise.all([fetch("web/geo/geo.json?v=" + VER).then(r => r.json()), fetch("web/app/content.json?v=" + VER).then(r => r.json()), fetch("web/geo/dem.bin?v=" + VER).then(r => r.arrayBuffer())]);
  G = g; C = c; DEM = new Int16Array(dem); QW.G = G; QW.C = C;
  const d = G.dem, st = MOBILE ? 2 : 1, nx = Math.floor((d.nx - 1) / st) + 1, nz = Math.floor((d.nz - 1) / st) + 1;
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), idx = [];
  const ph = G.photo;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = d.x0 + i * st * d.cell, z = d.z0 + j * st * d.cell;
    pos[k * 3] = x; pos[k * 3 + 1] = DEM[(j * st) * d.nx + i * st] / 100; pos[k * 3 + 2] = z; uv[k * 2] = (x - ph.x0) / (ph.x1 - ph.x0); uv[k * 2 + 1] = 1 - (z - ph.z0) / (ph.z1 - ph.z0); }
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c2 = a + nx, e = c2 + 1; idx.push(a, c2, b, b, c2, e); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, color: "#55534e" });   // 2026-10-23 本人「舗装が白くて眩しい」→ 明度を下げ、少し暖かい灰へ（写真が来たら #9c968c）
  mat._obc = cyberize; desat(mat);   // 2026-10-23 夜：空中写真は 3D 地図では使わない（電脳の地図に）。歩くときの地面のためだけに、起動のあとで読む
  setTimeout(() => texP(MOBILE ? "web/geo/photo_1k.webp" : "web/geo/photo_2k.webp").then(photo => { mat.map = photo; mat.color.set("#9c968c"); mat.needsUpdate = true; }).catch(() => { }), 1800); const terrain = new THREE.Mesh(geo, mat); terrain.name = "terrain"; world.add(terrain); QW.terrain = terrain;
  buildRoute(); buildRoads(); buildWater();
  if (G.near) setTimeout(() => texP(MOBILE ? "web/geo/near_lo.webp" : "web/geo/near_hi.webp").then(t => {   // 道筋のまわりだけ、細かい写真（約 0.5 m）を上に重ねる
    const n = G.near, d2 = G.dem, i0 = Math.max(0, Math.floor((n.x0 - d2.x0) / d2.cell)), i1 = Math.min(d2.nx - 1, Math.ceil((n.x1 - d2.x0) / d2.cell)), j0 = Math.max(0, Math.floor((n.z0 - d2.z0) / d2.cell)), j1 = Math.min(d2.nz - 1, Math.ceil((n.z1 - d2.z0) / d2.cell));
    const w = i1 - i0 + 1, h = j1 - j0 + 1, P = new Float32Array(w * h * 3), U = new Float32Array(w * h * 2), I = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i, x = d2.x0 + (i0 + i) * d2.cell, z = d2.z0 + (j0 + j) * d2.cell; P[k * 3] = x; P[k * 3 + 1] = DEM[(j0 + j) * d2.nx + i0 + i] / 100 + .02; P[k * 3 + 2] = z; U[k * 2] = (x - n.x0) / (n.x1 - n.x0); U[k * 2 + 1] = 1 - (z - n.z0) / (n.z1 - n.z0); }
    for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) { const a = j * w + i; I.push(a, a + w, a + 1, a + 1, a + w, a + w + 1); }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.BufferAttribute(P, 3)); g2.setAttribute("uv", new THREE.BufferAttribute(U, 2)); g2.setIndex(I); g2.computeVertexNormals();
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m2 = new THREE.MeshStandardMaterial({ map: t, roughness: 1, color: "#8f8a82", polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    m2.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n float eg=min(min(vMapUv.x,1.-vMapUv.x),min(vMapUv.y,1.-vMapUv.y)); if(eg<0.) discard;"); };
    m2._obc = m2.onBeforeCompile; desat(m2);
    const near = new THREE.Mesh(g2, m2); near.renderOrder = 1; world.add(near); QW.near = near;
  }).catch(() => { }), 2200);
}
/* 道：OSM の道を地面に沿った帯に（道筋 A は HUD の光る線を重ねる） */
let ASPH = null;
function roadMat() {   // 道の面：Poly Haven「Asphalt 04」（CC0）の色・法線・粗さ。3 m ごとに繰り返し、大きなむら（補修跡・踏まれた筋）を重ねて繰り返しを目立たせない
  if (ASPH) return ASPH;
  const ld = (u, srgb) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 4 : 12; return t; };
  const m = new THREE.MeshStandardMaterial({ map: ld("web/tex/asphalt_c.webp", true), normalMap: ld("web/tex/asphalt_n.webp"), normalScale: new THREE.Vector2(.9, .9), roughnessMap: ld("web/tex/asphalt_r.webp"), roughness: 1, color: "#7d7a76", metalness: 0, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vWxz;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWxz=(modelMatrix*vec4(transformed,1.)).xz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vWxz;\nfloat n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5),b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5),c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5),d=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}")
      .replace("#include <map_fragment>", "#include <map_fragment>\n float big=n2(vWxz*.07)*.6+n2(vWxz*.23)*.4; float pch=smoothstep(.62,.66,n2(vWxz*.045+3.1)); diffuseColor.rgb*=mix(.86,1.1,big); diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.78,pch*.8);");
  };
  return ASPH = m;
}
function ribbon(pts, w, lift = .05, uvScale = 3) {
  const P = [], U = [], I = []; let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    if (i) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const nx = -tz * w / 2, nz = tx * w / 2, p = pts[i];
    P.push(p[0] + nx, groundY(p[0] + nx, p[1] + nz) + lift, p[1] + nz, p[0] - nx, groundY(p[0] - nx, p[1] - nz) + lift, p[1] - nz); U.push(0, acc / uvScale, w / uvScale, acc / uvScale);
    if (i) { const k = i * 2; I.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
}
function densify(pts, step = 3) { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return out; }
function buildRoads() {
  const gs = []; const cp = [0, 0];
  for (const r of G.roads) { if (r.w < 2.5 && !MOBILE) { } const near = r.p.some(p => Math.hypot(p[0] - cp[0], p[1] - cp[1]) < 1400); if (!near) continue; gs.push(ribbon(densify(r.p, 4), r.w, .04 + r.w * .002)); }
  const m = new THREE.Mesh(mergeIdx(gs), roadMat()); m.name = "roads"; world.add(m); QW.roads = m;
  // 歩道（模式）：車の通る道の両わきに、コンクリートの舗装の帯を道の下に敷く（Poly Haven「Concrete Pavement」CC0）
  const sw = []; for (const r of G.roads) { if (r.w < 7) continue; if (!r.p.some(p => Math.hypot(p[0], p[1] - 400) < 900)) continue; sw.push(ribbon(densify(r.p, 4), r.w + 4.6, .03, 1.2)); }
  if (sw.length) { const ld = (u, srgb) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 4 : 8; return t; };
    const pm = new THREE.MeshStandardMaterial({ map: ld("web/tex/pave_c.webp", true), normalMap: ld("web/tex/pave_n.webp"), color: "#8e8981", roughness: 1, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -1.5 });
    const pv = new THREE.Mesh(mergeIdx(sw), pm); pv.name = "walkway"; world.add(pv); QW.pave = pv; }
}
function mergeIdx(gs) { let n = 0; const P = [], U = [], N = [], I = []; for (const g of gs) { const p = g.attributes.position.array, u = g.attributes.uv.array, nn = g.attributes.normal.array, ix = g.index.array; for (let i = 0; i < p.length; i++) P.push(p[i]); for (let i = 0; i < u.length; i++) U.push(u[i]); for (let i = 0; i < nn.length; i++) N.push(nn[i]); for (let i = 0; i < ix.length; i++) I.push(ix[i] + n); n += p.length / 3; g.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1)); return g; }
function buildWater() {
  const gs = G.water.filter(w => w.k === "river").map(w => ribbon(densify(w.p, 4), 14, .3));
  if (!gs.length) return; const m = new THREE.Mesh(mergeIdx(gs), new THREE.MeshStandardMaterial({ color: "#3d5560", roughness: .15, metalness: .1, transparent: true, opacity: .9 })); world.add(m);
}
let ROUTE = null;
function buildRoute() {   // 道筋 A：上空では光る線、歩くときは足もとの細い目盛り
  const pts = G.line.map(p => new THREE.Vector3(p[0], groundY(p[0], p[1]) + .35, p[1]));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  ROUTE = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#7fe3f7", transparent: true, opacity: .95, depthTest: false, fog: false })); ROUTE.renderOrder = 4; world.add(ROUTE);
}

/* ---------- 建物：OSM の平面＋模式の高さ → 半透明の薄いグラフィック（面はごく薄く・輪郭の線・階の線・上へ抜ける走査の帯） ---------- */
const BLDU = { t: { value: 0 } };
async function buildBuildings() {
  const buf = await fetch("web/geo/bld.bin?v=" + VER).then(r => r.arrayBuffer()), a = new Int16Array(buf);
  const P = [], Y0 = [], E = [], F = [], LIM = MOBILE ? 700 : 1600;
  let i = 0, nb = 0;
  while (i < a.length) {
    const n = a[i], hRaw = a[i + 1], low = (hRaw & 0x4000) !== 0, h = (hRaw & 0x3fff) / 10, y = a[i + 2] / 10; i += 3;
    const ring = []; for (let k = 0; k < n; k++) { ring.push(new THREE.Vector2(a[i] / 10, a[i + 1] / 10)); i += 2; }
    const cx = ring[0].x, cz = ring[0].y; if (Math.hypot(cx, cz - 400) > LIM) continue; nb++;
    const top = low ? y + .06 : y + h, far = Math.hypot(cx, cz - 400) > 600;   // 型を置いた所は、地面の地割の線だけ
    for (let k = 0; k < n; k++) { const p = ring[k], q = ring[(k + 1) % n];
      P.push(p.x, y, p.y, q.x, y, q.y, q.x, top, q.y, p.x, y, p.y, q.x, top, q.y, p.x, top, p.y); for (let m = 0; m < 6; m++) Y0.push(y);
      if (!far || low) { E.push(p.x, top, p.y, q.x, top, q.y); if (!low) E.push(p.x, y, p.y, p.x, top, p.y); } }
    if (low) { P.length -= n * 18; Y0.length -= n * 6; }   // 店蔵の型を置いた所は、面を描かず地割の線だけ
    { const tri = THREE.ShapeUtils.triangulateShape(ring, []); for (const [u, v, w] of tri) for (const t of [u, w, v]) { if (!low) { P.push(ring[t].x, top, ring[t].y); Y0.push(y); } if (!far) F.push(ring[t].x, groundY(ring[t].x, ring[t].y) + .05, ring[t].y); } }   // 屋根の面と、足もとの覆い（空中写真の屋根が地面に写るのを隠す）
    if (nb % 600 === 0) await new Promise(r => setTimeout(r, 0));   // 区切って作る（読み込みのあいだも画を止めない）
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("y0", new THREE.Float32BufferAttribute(Y0, 1)); g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: BLDU.t, amul: { value: 1 }, c: { value: new THREE.Color("#9ad8ea") }, fogColor: { value: scene.fog.color }, fogNear: { value: 0 }, fogFar: { value: 0 } },
    vertexShader: `attribute float y0; varying float vY, vH, vUp; varying float vFogDepth; varying vec3 vN;
      void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vY=position.y; vH=position.y-y0; vN=normal; vFogDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float t; uniform float amul; uniform vec3 c; uniform vec3 fogColor; uniform float fogNear, fogFar; varying float vY, vH, vUp; varying float vFogDepth; varying vec3 vN;
      void main(){ float side=1.-abs(normalize(vN).y); float a=.022+.05*side; float near=smoothstep(6.,40.,vFogDepth); a*=mix(.35,1.,near);
        float fl=smoothstep(.06,0.,abs(fract(vH/3.2)-.5)*2.-.94); a+=fl*.08*side*near;             // 階の線（3.2 m ごと・模式）
        float sc=exp(-pow((fract(vH*.05-t*.12)-.5)*9.,2.)); a+=sc*.05*side;                     // 上へ抜ける走査の帯
        float f=smoothstep(fogNear,fogFar,vFogDepth); gl_FragColor=vec4(c,a*amul*(1.-f*.9)); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(g, mat); m.renderOrder = 2; m.name = "bld"; world.add(m);
  const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.Float32BufferAttribute(E, 3));
  const em = new THREE.LineBasicMaterial({ color: "#9fe6f8", transparent: true, opacity: .42, depthWrite: false });
  const lines = new THREE.LineSegments(eg, em); lines.renderOrder = 3; world.add(lines);
  const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(F, 3)); fg.computeVertexNormals();
  const foot = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: "#45474a", roughness: .96, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); foot.renderOrder = 1; world.add(foot); BLD.foot = foot;
  BLD.mesh = m; BLD.lines = lines; BLD.mat = mat; QW.nBld = nb;
}
const BLD = {}; QW.BLD = BLD;

/* ---------- 写実の 3D：店蔵の型（模式）と時の鐘 ---------- */
const KURA = { meshes: [] };
function buildKura() {
  const M = kuraMats(TL, MOBILE), byType = {};
  for (const k of G.kura) (byType[k.type] ||= []).push(k);
  for (const t in byType) {
    const { geos } = kuraGeos(t), list = byType[t];
    for (const mk in geos) {
      const mat = mk === "oni" ? M.tile : M[mk]; const im = new THREE.InstancedMesh(geos[mk], mat, list.length);
      const o = new THREE.Object3D();
      list.forEach((k, i) => { o.position.set(k.x, k.y - .05, k.z); o.rotation.set(0, k.yaw, 0); o.scale.set(k.w / W0, 1, k.dp / D0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.computeBoundingSphere(); world.add(im); KURA.meshes.push(im);
    }
  }
  // 町家の型（模式）：型の蔵を置かなかった沿道の低い建物。瓦屋根の連なりと通りの狭さ
  const byM = {}; (G.machi || []).filter(k => !(G.bell && Math.hypot(k.x - G.bell.x, k.z - G.bell.z) < Math.hypot(k.w, k.dp) / 2 + 3.5)).forEach((k, i) => { k.type = "MNGK"[(i * 3 + Math.floor(k.w)) % 4]; (byM[k.type] ||= []).push(k); });   // 4 つの型を混ぜ、同じ並びが続かないように
  for (const t in byM) { const { geos } = machiGeos(t), list = byM[t];
    for (const mk in geos) { const im = new THREE.InstancedMesh(geos[mk], M[mk], list.length), o = new THREE.Object3D();
      list.forEach((k, i) => { o.position.set(k.x, k.y - .05, k.z); o.rotation.set(0, k.yaw, 0); o.scale.set(k.w / W0, 1, k.dp / D0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.computeBoundingSphere(); world.add(im); KURA.meshes.push(im); } }
  // 型の札（HUD の流儀・画面の部品）：近づくと「KURA TYPE A ／店蔵の型・模式」。どの建物が蔵造りかを写したものではないことを、画面の中で示す。層の一覧には重ねない
  KURA.tags = [...G.kura.map(k => ({ k, code: "KURA TYPE " + k.type, name: "店蔵の型 " + k.type })), ...(G.machi || []).map(k => ({ k, code: "MACHIYA TYPE " + k.type, name: "町家の型 " + k.type }))];
  // 時の鐘：OSM の輪郭の中心に、輪郭のいちばん長い辺の向きで
  const b = G.bell; if (!b) return;
  let best = 0, ang = 0; for (let i = 0; i < b.ring.length; i++) { const p = b.ring[i], q = b.ring[(i + 1) % b.ring.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > best) { best = l; ang = Math.atan2(q[0] - p[0], q[1] - p[1]); } }
  const { geos, bellY } = bellGeos(), grp = new THREE.Group();
  for (const mk in geos) { const m = new THREE.Mesh(geos[mk], M[mk]); grp.add(m); if (mk === "bronze") KURA.bell = m; }
  grp.position.set(b.x, b.y - .05, b.z); grp.rotation.y = ang; world.add(grp); KURA.tower = grp; KURA.bellY = b.y + bellY;
}

/* ---------- Qualia Layer：記録の 3 層と、Qualia/sight・sound・sho・touch ---------- */
let ALL = [], GL = {};
const LAYER = { worn: [], objs: [] };
/* 2026-10-23 本人「sight, touch, sound, nature, culture です」→ 層は 5 つ。Qualia/sho は sound の中、歴史は culture の中（中身はそのまま・どの層で重ねるかだけを付け替える） */
const PARENT = { sho: "sound", history: "culture" }, SUBNAME = { sho: "sho", history: "history" };
const top5 = id => PARENT[id] || id;
const COLOR5 = { sight: "#c9abe0", touch: "#f0d19d", sound: "#8fb6dc", nature: "#88b68f", culture: "#e79592" };   // 2026-10-23 本人「案１０で採用」：層の 5 色＝案 10（体の色：藤鼠 #a59fc3・砥粉 #d6c09b・藍鉄 #3a4360・老竹 #6c8d71・小豆 #864e4c）の、夜の地の HUD の線と字の列。sight と sound は夜の地で色相が近かったので、HUD の色だけ紫と青へ少し離した（体の色は変えない）
function layerNo(id) { return ALL.findIndex(l => l.id === top5(id)) + 1; }
function buildObjs() {
  const rec = Object.fromEntries(C.layers.map(l => [l.id, l])), q = Object.fromEntries(QLAYERS.map(l => [l.id, { ...l, lead: C.ql[l.id] || l.lead }]));
  // 下から 01：記録の層（culture・nature）の上に、五感の層（sound・touch・sight）を重ねる。上から読むと sight・touch・sound・nature・culture
  ALL = [rec.culture, rec.nature, q.sound, q.touch, q.sight].map(l => ({ ...l, color: COLOR5[l.id] || l.color })); GL = Object.fromEntries(ALL.map(l => [l.id, l]));
  for (const [sub, par] of Object.entries(PARENT)) { const b = rec[sub] || q[sub] || { id: sub }; GL[sub] = { ...b, color: GL[par].color, name: `${GL[par].name} ／ ${SUBNAME[sub]}` }; }
  const add = (o, layer, kind) => {
    const L = GL[layer], m = makeMarker(layer, L.color, o.h || 1.8, MOBILE), y = o.bell ? groundY(o.x, o.z) : groundY(o.x, o.z);
    m.root.position.set(o.x, y, o.z); world.add(m.root);
    const lb = makeLabel(layerNo(layer), L.name, o.title, L.color); lb.position.set(o.x + .25, y + (o.h || 1.8) + .35, o.z); world.add(lb);
    LAYER.objs.push({ ...m, o, layer, kind, lb, show: 0 });
  };
  for (const o of C.objs) add(o, o.layer, "rec");
  for (const s of C.sound) add({ ...s, h: 2.2 }, "sound", "sound");
  for (const t of C.touch) add({ ...t, h: 1.3 }, "touch", "touch");
  for (const s of C.sho) add({ ...s, h: .7, title: "《" + s.title + "》" }, "sho", "sho");
  LAYER.worn = ALL.map(l => l.id);   // 既定は全部重ねる
}
function wearLayer(id) { if (id === null) LAYER.worn = []; else if (LAYER.worn.includes(id)) LAYER.worn = LAYER.worn.filter(x => x !== id); else LAYER.worn.push(id); syncTray(); KASA.herd?.setLayers(LAYER.worn); }
const _v = new THREE.Vector3();
function stepLayer(dt) {
  const cp = camera.position, t = performance.now() / 1000, sky = QW.mode === "sky" || QW.mode === "descend";
  for (const L of LAYER.objs) {
    const on = LAYER.worn.includes(top5(L.layer)) && QW.mode !== "sight", d = Math.hypot(L.o.x - cp.x, L.o.z - cp.z);
    const want = on ? (sky ? 1 : d < 140 ? 1 : 0) : 0; L.show += (want - L.show) * Math.min(1, dt * 4);
    const vis = L.show > .02; L.root.visible = vis; L.lb.visible = vis && (sky ? false : d < 34);
    if (!vis) continue;
    const k = sky ? Math.min(14, Math.max(2.5, camera.position.distanceTo(L.root.position) / 60)) : 1;
    L.root.scale.setScalar(k * (.4 + .6 * L.show)); L.glyph.rotation.y = t * .6; L.glyph.position.y = (L.o.h || 1.8) + Math.sin(t * 1.4 + L.o.x) * .05;
    for (const m of L.mats) m.opacity = (m === L.fm ? .1 : m === L.bm ? .55 : .9) * L.show;
    if (L.lb.visible) { L.lb.material.opacity = Math.min(1, (34 - d) / 8) * L.show; const ls = Math.max(1, d / 9); L.lb.scale.set(1.6 * ls, .4 * ls, 1); }   // 遠くても字が小さくなりすぎない
  }
  declutter();
}
/* 札どうしを重ねない：近い札から順に置き、先に置いた札と重なる遠い札は出さない（層の一覧の上にも出さない） */
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const DC = { t: 0, ls: null };
function declutter() {
  const vis = LAYER.objs.filter(L => L.lb.visible).map(L => ({ L, d: L.lb.position.distanceTo(camera.position) })).sort((p, q) => p.d - q.d), put = [];
  const now = performance.now(); if (!DC.ls || now - DC.t > 500) { DC.t = now; DC.ls = $("#lstack").getBoundingClientRect(); }   // 画面の部品の位置は 0.5 秒ごとに読む（毎こま読むと重い）
  const ls = DC.ls, lr = ls.width ? ls.right : 0, lb = ls.bottom;
  for (const { L } of vis) {
    _a.copy(L.lb.position).project(camera); _b.copy(L.lb.position); _b.y += L.lb.scale.y; _b.project(camera);
    if (_a.z > 1) continue; const x = (_a.x + 1) / 2 * innerWidth, y = (1 - _a.y) / 2 * innerHeight, h = Math.max(8, y - (1 - _b.y) / 2 * innerHeight), r = { x0: x, x1: x + h * 4, y0: y - h * 1.35, y1: y + h * .35 };   // 上下に少し余白（柱が上の札にかからない）
    if (r.x0 < lr + 14 && r.y0 < lb + 14 || put.some(q => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0)) { L.lb.visible = false; continue; }
    put.push(r);
  }
}
function pickObj(x, y) {
  const r = new THREE.Raycaster(), p = new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); r.setFromCamera(p, camera);
  let best = null, bd = 1e9; const tol = MOBILE ? 46 : 32;
  for (const L of LAYER.objs) { if (!L.root.visible) continue; L.glyph.getWorldPosition(_v); const s = _v.clone().project(camera); if (s.z > 1) continue;
    const sx = (s.x + 1) / 2 * innerWidth, sy = (1 - s.y) / 2 * innerHeight, dpx = Math.hypot(sx - x, sy - y); if (dpx < tol && dpx < bd) { bd = dpx; best = L; } }
  return best;
}

/* ---------- 開いた中身 ---------- */
const PANEL = { cur: null };
function openPanel({ color, layer, title, lines = [], more = [], how, note, src = [], ll, buttons = [], pad = null }) {
  const p = $("#panel"); p.style.setProperty("--lc", color); $("#pLayer").textContent = layer; $("#pTitle").textContent = title;
  const b = $("#pBody"); b.innerHTML = "";
  lines.forEach((l, i) => { const e = document.createElement("p"); e.className = "line"; e.dataset.i = i; e.textContent = l.t; b.appendChild(e); });
  for (const m of more) { const e = document.createElement("p"); e.textContent = m; b.appendChild(e); }
  const ex = $("#pExp"); ex.innerHTML = ""; ex.hidden = !pad && !buttons.length;
  if (pad) ex.appendChild(pad);
  for (const bt of buttons) { const e = document.createElement("button"); e.className = "ml-btn" + (bt.primary ? " ml-btn--primary" : ""); e.textContent = bt.label; e.addEventListener("click", bt.run); ex.appendChild(e); }
  $("#pHow").textContent = how ? "確かさ：" + how : ""; $("#pNote").textContent = note || "";
  const ul = $("#pSrc"); ul.innerHTML = ""; for (const s of src) { const li = document.createElement("li"); if (s.u) { const a = document.createElement("a"); a.href = s.u; a.target = "_blank"; a.rel = "noopener"; a.textContent = s.t; li.appendChild(a); } else li.textContent = s.t; ul.appendChild(li); }
  $("#pPos").textContent = ll ? `位置：${ll[1].toFixed(5)}N ${ll[0].toFixed(5)}E` : "";
  p.hidden = false; document.body.classList.add("pOpen");
}
function hidePanel() { if (KASA.cur) { KASA.herd?.release(KASA.cur); KASA.cur = null; } if ($("#panel").hidden) return; $("#panel").hidden = true; document.body.classList.remove("pOpen"); PANEL.cur = null; stopVoice(); TOUCH.stop?.(); }
$("#pClose").addEventListener("click", hidePanel);
function openObj(L) {
  PANEL.cur = L; const g = GL[L.layer], no = `${String(layerNo(L.layer)).padStart(2, "0")}　${g.name}`;
  if (L.kind === "sound") return openSound(L, no);
  if (L.kind === "touch") return openTouch(L, no);
  if (L.kind === "sho") return openSho(L, no);
  openPanel({ color: g.color, layer: no, title: L.o.title, lines: L.o.lines, more: L.o.more || [], how: L.o.how, src: L.o.src, ll: L.o.ll });
  speakLines(L.o.lines, L);
}

/* ---------- 声（碧） ---------- */
const audio = $("#voice"); let soundOn = true, voiceQ = null, LIP = {};
function stopVoice() { voiceQ = null; try { audio.pause(); } catch { } AOI.m?.stopSpeaking(); document.querySelectorAll("#pBody .line.now").forEach(e => e.classList.remove("now")); hideCaption(); }
function speakLines(lines, L, opt = {}) {
  stopVoice(); voiceQ = { q: lines, i: 0, L, talk: opt.talk || null, done: opt.done || null };
  if (L && AOI.m) { const p = L.glyph.getWorldPosition(new THREE.Vector3()); AOI.m.lookAt(p); AOI.focus = p; }
  playNext();
}
function playNext() {
  const v = voiceQ; if (!v) return; const l = v.q[v.i];
  if (!l) { voiceQ = null; AOI.focus = null; hideCaption(1200); v.done?.(); return; }
  document.querySelectorAll("#pBody .line").forEach(e => e.classList.toggle("now", +e.dataset.i === v.i && !!v.L));
  if (!v.L || $("#panel").hidden) caption(l.tc || l.t, v.talk);
  const next = gap => setTimeout(() => { if (voiceQ === v) { v.i++; playNext(); } }, gap);
  if (!soundOn || !l.f) { next(Math.max(2400, l.t.length * 150 + 600)); return; }
  audio.src = l.f; audio.currentTime = 0;
  if (AOI.m && v.i === 0) AOI.m.express?.("warm", .5, Math.min(6, (l.dur || 3) + 1));
  audio.play().then(() => { AOI.m?.speak({ timeline: LIP[l.id] || null, text: l.t, dur: l.dur, clock: () => audio.currentTime }); }).catch(() => next(1500));
  audio.onended = () => { if (voiceQ !== v) return; AOI.m?.stopSpeaking(); next(420); };
}
let capT = 0;
function caption(t, talk) { const c = $("#caption"); $("#capText").textContent = t; const tag = $("#capTag");
  if (talk) { const g = GL[talk.layer]; tag.hidden = false; tag.style.setProperty("--c", g?.color || "#9bdcf0"); tag.textContent = `${String(layerNo(talk.layer)).padStart(2, "0")}　${g?.name || ""}　出典`; c.dataset.talk = talk.o.id; }
  else { tag.hidden = true; delete c.dataset.talk; }
  c.hidden = false; clearTimeout(capT); }
function hideCaption(after = 0) { clearTimeout(capT); capT = setTimeout(() => { $("#caption").hidden = true; }, after); }
$("#caption").addEventListener("click", () => { const id = $("#caption").dataset.talk, L = LAYER.objs.find(x => x.o.id === id); if (!L) return; const keep = voiceQ; const g = GL[L.layer];
  openPanel({ color: g.color, layer: `${String(layerNo(L.layer)).padStart(2, "0")}　${g.name}`, title: L.o.title, lines: L.o.lines, more: L.o.more || [], how: L.o.how, src: L.o.src, ll: L.o.ll }); voiceQ = keep; });

/* ---------- 碧の語り：いまいる所の近くの記録を、とぎれずに（同じ話はくり返さない） ---------- */
const TALK = { on: true, spoken: new Set(), nextT: 0 };
function stepTalk() {
  if (!TALK.on || QW.mode !== "walk" || voiceQ || !$("#panel").hidden || performance.now() < TALK.nextT || !AOI.greeted) return;
  const cp = camera.position; let best = null, bd = 30;
  for (const L of LAYER.objs) { if (L.kind !== "rec" || TALK.spoken.has(L.o.id) || !LAYER.worn.includes(L.layer)) continue; const d = Math.hypot(L.o.x - cp.x, L.o.z - cp.z); if (d < bd) { bd = d; best = L; } }
  if (!best) return; TALK.spoken.add(best.o.id); TALK.nextT = performance.now() + 2500;
  speakLines(best.o.lines, null, { talk: best, done: () => { TALK.nextT = performance.now() + 3500; } });
}
function syncTalkBtn() { const b = $("#talkBtn"); b.setAttribute("aria-pressed", String(TALK.on)); b.querySelector("span").textContent = TALK.on ? "碧の話：止める" : "碧の話：続ける"; }
$("#talkBtn").addEventListener("click", () => { TALK.on = !TALK.on; if (!TALK.on) stopVoice(); syncTalkBtn(); });

/* ---------- 碧（共通部品 AoiMotion） ---------- */
const AOI = { root: null, m: null, ready: false, pos: new THREE.Vector3(), focus: null, greeted: false, loading: null, v: 0 };
QW.AOI = AOI;
function loadAoi() {
  if (AOI.loading) return AOI.loading;
  return AOI.loading = (async () => {
    const [V, buf, Mot, Robe] = await Promise.all([import("@pixiv/three-vrm"), fetch("web/aoi.vrm").then(r => r.arrayBuffer()), import("../kit/aoi_motion.js"), import("../kit/aoi_robe.js").catch(() => null)]);
    const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); ld.register(p => new V.VRMLoaderPlugin(p));
    const gl = await ld.parseAsync(buf, ""); const v = gl.userData.vrm;
    V.VRMUtils.removeUnnecessaryVertices(gl.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(gl.scene); V.VRMUtils.rotateVRM0(v);
    v.scene.traverse(o => { o.frustumCulled = false; });
    const root = new THREE.Group(); root.add(v.scene); root.visible = false; world.add(root);
    for (const j of v.springBoneManager?.joints ?? []) j.center = root;
    v.humanoid.resetNormalizedPose(); v.update(0); v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(v.scene), h = box.max.y - box.min.y, sc = h > .5 && Math.abs(h - 1.67) / 1.67 > .02 ? 1.67 / h : 1;
    v.scene.scale.setScalar(sc); v.scene.position.y = -box.min.y * sc;
    try { Robe?.hideCoveredLegs?.(v, { keep: .12 }); } catch { }
    AOI.m = new Mot.AoiMotion(v, { root, posture: "natural", reducedMotion: RM, wind: 0, groundAt: (x, z) => groundY(x, z), quality: MOBILE ? "mid" : "auto" });
    if (AOI.m.robe) AOI.m.robe.wind = .2;
    AOI.root = root; AOI.ready = true;
    try { root.visible = true; await renderer.compileAsync(root, camera, scene); } catch { } root.visible = QW.mode === "walk";
  })().catch(e => console.warn("碧の姿を読み込めませんでした：", e?.message ?? e));
}
function aoiSpot(out) {
  const f = MOBILE ? 4.0 : 2.4, s = MOBILE ? .62 : 1.1, fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw);
  const n = nearestOnLine(CAM.pos.x, CAM.pos.z), a = atD(n.d), rx = -fz, rz = fx;
  const side = !$("#panel").hidden && !MOBILE ? -1 : ((a.x - CAM.pos.x) * rx + (a.z - CAM.pos.z) * rz) >= 0 ? 1 : -1;
  out.set(CAM.pos.x + fx * f + rx * s * side, 0, CAM.pos.z + fz * f + rz * s * side); out.y = groundY(out.x, out.z); return out;
}
function aoiArrive() {
  loadAoi().then(() => {
    if (!AOI.m || QW.mode !== "walk") return;
    aoiSpot(AOI.pos); AOI.m.teleport(AOI.pos.x, AOI.pos.z, Math.atan2(CAM.pos.x - AOI.pos.x, CAM.pos.z - AOI.pos.z)); AOI.root.visible = true;
    if (!AOI.greeted) { setTimeout(() => { if (QW.mode === "walk") speakLines([C.intro], null, { done: () => { AOI.greeted = true; TALK.nextT = performance.now() + 2500; } }); else AOI.greeted = true; }, 900); }
  });
}
const _ap = new THREE.Vector3();
function stepAoi(dt) {
  if (!AOI.m || !AOI.root.visible) return;
  aoiSpot(_ap); const P = AOI.m.pos, dx = _ap.x - P.x, dz = _ap.z - P.z, dist = Math.hypot(dx, dz);
  if (dist > 18) { AOI.m.teleport(_ap.x, _ap.z, CAM.yaw + Math.PI); AOI.v = 0; }
  else {
    const go = WALK.moving ? dist > .25 : dist > (AOI.v > .1 ? .3 : 1.3), want = go ? Math.min(1.6, dist * 1.4 + (WALK.moving ? WALK.speed * .6 : 0)) : 0;
    AOI.v += Math.max(-1.8 * dt, Math.min(1.0 * dt, want - AOI.v));
    if ((AOI.v > .02 || want > 0) && dist > .01) { const st = Math.min(dist, AOI.v * dt); AOI.m.drive(P.x + dx / dist * st, P.z + dz / dist * st); }
    else { if (AOI.v !== 0 || AOI.m.driven) AOI.m.walkTo(null); AOI.v = 0; AOI.m.faceTo(Math.atan2(CAM.pos.x - P.x, CAM.pos.z - P.z)); }
  }
  AOI.gT = (AOI.gT ?? 5) - dt;
  if (!AOI.focus && AOI.gT <= 0) { if (AOI.glance) { AOI.glance = null; AOI.gT = 5 + Math.random() * 6; } else { AOI.glance = KURA.tower && Math.hypot(KURA.tower.position.x - P.x, KURA.tower.position.z - P.z) < 60 ? new THREE.Vector3(KURA.tower.position.x, KURA.bellY, KURA.tower.position.z) : new THREE.Vector3(P.x - Math.sin(CAM.yaw) * 12, P.y + 6, P.z - Math.cos(CAM.yaw) * 12); AOI.gT = 1.6 + Math.random() * 1.4; } }
  AOI.m.lookAt(AOI.focus || AOI.glance || null);
  AOI.m.update(dt, camera);
}

/* ---------- カメラと動き ---------- */
const EYE = 1.55;
const CAM = { pos: new THREE.Vector3(), yaw: 0, look: 0, pitch: -.05, lastDrag: 0 };
const SKY = { az: -.35, el: .95, dist: 1100, tAz: -.35, tEl: .95, tDist: 1100, c: new THREE.Vector3(-40, 20, 420) };
const WALK = { speed: 1.35, moving: false, auto: false, hold: false, goal: null, ring: null };
const FLY = { up: false, down: false, v: 12 };
const KEYS = new Set();
const FOGS = { sky: { n: 1200, f: 5200 }, walk: { n: 160, f: 1100 }, fly: { n: 500, f: 3200 }, sight: { n: 90, f: 800 } };
function applyFog(f) { scene.fog.near = f.n; scene.fog.far = f.f; if (BLD.mat) { BLD.mat.uniforms.fogNear.value = f.n * .4; BLD.mat.uniforms.fogFar.value = f.f; } }
function setMode(m) { QW.mode = m; document.body.dataset.mode = m;
  $("#modeSky").setAttribute("aria-pressed", String(m === "sky" || m === "descend")); $("#modeWalk").setAttribute("aria-pressed", String(m === "walk" || m === "sight")); $("#modeFly").setAttribute("aria-pressed", String(m === "fly"));
  applyFog(FOGS[m === "descend" ? "sky" : m] || FOGS.walk);
  if (ROUTE) { ROUTE.material.opacity = m === "sky" || m === "descend" ? .95 : m === "fly" ? .7 : .0; ROUTE.visible = ROUTE.material.opacity > 0; }
  if (AOI.root) AOI.root.visible = m === "walk";
}
function skyCam() { const c = SKY.c, x = c.x + Math.sin(SKY.az) * Math.cos(SKY.el) * SKY.dist, z = c.z + Math.cos(SKY.az) * Math.cos(SKY.el) * SKY.dist, y = c.y + Math.sin(SKY.el) * SKY.dist; camera.position.set(x, y, z); camera.lookAt(c); }
let TW = null;
function tweenTo(pos, yaw, pitch, dur, done) { TW = { p0: camera.position.clone(), q0: camera.quaternion.clone(), p1: pos.clone(), q1: new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ")), t: 0, dur, done }; }
function stepTween(dt) { if (!TW) return false; TW.t += dt / TW.dur; const k = Math.min(1, TW.t), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(TW.p0, TW.p1, e); const arc = Math.sin(e * Math.PI) * TW.p0.distanceTo(TW.p1) * .12; camera.position.y += arc; camera.quaternion.slerpQuaternions(TW.q0, TW.q1, e);
  if (k >= 1) { const d = TW.done; TW = null; d?.(); } return true; }
/* 始める場所（道筋 A の 7 地点） */
const PICK = "#ffb648";   // 選んでいる場所の色（地図のしるし・ボタンと同じ）
const START = { sel: 3, pins: [], labels: [] };   // 2026-10-23 はじめは蔵造りの一番街（仲町交差点）から
function buildStarts() {
  const box = $("#starts"); box.innerHTML = ""; const pl = $("#pinLabels");
  C.starts.forEach((s, i) => {
    const b = document.createElement("button"); b.className = "stBtn"; b.type = "button"; b.setAttribute("aria-pressed", "false"); b.innerHTML = `<span class="no">${String(i + 1).padStart(2, "0")}</span><span class="nm">${s.name}</span>`;
    b.addEventListener("click", () => selectStart(i)); box.appendChild(b);
    const a = atD(s.d), y = groundY(a.x, a.z), g = new THREE.Group(); g.position.set(a.x, y, a.z);
    const ring = new THREE.Mesh(new THREE.RingGeometry(5, 6.4, 48), new THREE.MeshBasicMaterial({ color: "#7fe3f7", transparent: true, opacity: .9, depthTest: false, side: THREE.DoubleSide, fog: false, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .6; ring.renderOrder = 5;
    const head = new THREE.Object3D(); head.position.y = 26; g.add(ring, head);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 26, 6, 1, true), new THREE.MeshBasicMaterial({ color: "#7fe3f7", transparent: true, opacity: .35, depthTest: false, fog: false, toneMapped: false })); beam.position.y = 13; beam.renderOrder = 5; g.add(beam);
    world.add(g); START.pins.push({ g, ring, head, beam });
    const l = document.createElement("button"); l.className = "pinLabel"; l.type = "button"; l.dataset.full = `${String(i + 1).padStart(2, "0")} ${s.name}`; l.dataset.short = String(i + 1).padStart(2, "0"); l.textContent = MOBILE ? l.dataset.short : l.dataset.full; l.addEventListener("click", () => selectStart(i)); pl.appendChild(l); START.labels.push(l);
  });
}
/* 始める場所の列：横にずらせることを、目盛りと「ほかの n 地点」で示す（列が全部見えるときは出さない） */
function syncStMeter() {
  const box = $("#starts"), m = $("#stMeter"); if (!box || !m) return;
  const W = box.scrollWidth, V = box.clientWidth; if (W <= V + 4) { m.classList.add("all"); return; } m.classList.remove("all");
  const th = m.querySelector("i"); th.style.width = (V / W * 100).toFixed(1) + "%"; th.style.left = (box.scrollLeft / W * 100).toFixed(1) + "%";
  let hid = 0; const r = box.getBoundingClientRect(); box.querySelectorAll(".stBtn").forEach(b => { const q = b.getBoundingClientRect(); if (q.right > r.right - 20 || q.left < r.left - 4) hid++; });
  $("#stHint").textContent = hid ? `横にずらすと、ほかに ${hid} 地点` : `全 ${C.starts.length} 地点`;
}
function selectStart(i) { START.sel = i; document.querySelectorAll(".stBtn").forEach((b, k) => b.setAttribute("aria-pressed", String(k === i))); START.labels.forEach((l, k) => { l.classList.toggle("on", k === i); if (MOBILE) l.textContent = k === i ? l.dataset.full.replace(/（.*）/, "") : l.dataset.short; }); $("#goDown").disabled = false;
  START.pins.forEach((p, k) => { const on = k === i; p.ring.material.color.set(on ? PICK : "#7fe3f7"); p.ring.material.opacity = on ? 1 : .4; p.ring.scale.setScalar(on ? 1.8 : .8); p.beam.material.color.set(on ? PICK : "#7fe3f7"); p.beam.material.opacity = on ? .9 : .18; p.beam.scale.set(on ? 1.8 : 1, 1, on ? 1.8 : 1); });   // 選んでいる所は濃く、ほかは薄く
  setTimeout(() => { const box = $("#starts"), bb = box?.querySelectorAll(".stBtn")[i]; if (bb && START.sel === i) { box.scrollLeft = Math.max(0, bb.offsetLeft - box.offsetLeft - 8); syncStMeter(); } }, 400);   // 選んだ場所のボタンを列の中に見せる
  const a = atD(C.starts[i].d); SKY.c.set(a.x, groundY(a.x, a.z), a.z); SKY.tDist = MOBILE ? 520 : 420; }
function descendTo(i) {
  const s = C.starts[i], d = Math.min(s.d, G.lineD[G.lineD.length - 1] - 3), a = atD(d), y = groundY(a.x, a.z) + EYE;
  hideSkyUI(); exitSight(true); hideFlyUI(); setMode("descend"); hidePanel();
  CAM.pos.set(a.x, y, a.z); CAM.yaw = i === C.starts.length - 1 ? yawAlong(d) + Math.PI : yawAlong(d); CAM.look = 0; CAM.pitch = -.04;
  if (/時の鐘/.test(s.name) && G.bell) { const b = atD(1196); CAM.pos.set(b.x, groundY(b.x, b.z) + EYE, b.z); CAM.yaw = Math.atan2(-(G.bell.x - b.x), -(G.bell.z - b.z)); CAM.pitch = .12; }   // 鐘つき通りの入口から、鐘を見上げる
  tweenTo(CAM.pos, CAM.yaw, CAM.pitch, 2.6, () => { setMode("walk"); showWalkUI(); aoiArrive(); });
}
function corridorClamp(p) { const n = nearestOnLine(p.x, p.z); if (n.dist > 14) { const a = atD(n.d), k = 14 / n.dist; p.x = a.x + (p.x - a.x) * k; p.z = a.z + (p.z - a.z) * k; } solids(p); }
function solids(p, r = .35) {   // 店蔵の型と時の鐘には入らない（向きのある箱から押し出す）
  const push = (cx, cz, yaw, hw, hd) => { const c = Math.cos(yaw), s = Math.sin(yaw), dx = p.x - cx, dz = p.z - cz, lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) < hw + r && Math.abs(lz) < hd + r) { const ox = hw + r - Math.abs(lx), oz = hd + r - Math.abs(lz); let nx = lx, nz = lz; if (ox < oz) nx = Math.sign(lx || 1) * (hw + r); else nz = Math.sign(lz || 1) * (hd + r); p.x = cx + nx * c + nz * s; p.z = cz - nx * s + nz * c; } };
  for (const k of G.kura) if (Math.abs(k.x - p.x) < 12 && Math.abs(k.z - p.z) < 12) push(k.x, k.z, k.yaw, k.w / 2, k.dp / 2 + .9);
  for (const k of G.machi || []) if (Math.abs(k.x - p.x) < 12 && Math.abs(k.z - p.z) < 12) push(k.x, k.z, k.yaw, k.w / 2, k.dp / 2 + .6);
  if (KURA.tower) push(KURA.tower.position.x, KURA.tower.position.z, KURA.tower.rotation.y, 2.4, 2.4);
}
function stepWalk(dt, eye = EYE, speed = WALK.speed) {
  const f = KEYS.has("w") || KEYS.has("arrowup") || WALK.auto || WALK.hold ? 1 : KEYS.has("s") || KEYS.has("arrowdown") ? -1 : 0;
  const turn = (KEYS.has("a") || KEYS.has("arrowleft") ? 1 : 0) - (KEYS.has("d") || KEYS.has("arrowright") ? 1 : 0);
  CAM.yaw += turn * dt * 1.3;
  let mx = 0, mz = 0;
  if (f) { const yaw = CAM.yaw + CAM.look; mx = -Math.sin(yaw) * f * speed * dt; mz = -Math.cos(yaw) * f * speed * dt; }
  else if (WALK.goal) { const dx = WALK.goal.x - CAM.pos.x, dz = WALK.goal.z - CAM.pos.z, dd = Math.hypot(dx, dz); if (dd < .4) { WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; } else { mx = dx / dd * Math.min(dd, speed * dt); mz = dz / dd * Math.min(dd, speed * dt); const ty = Math.atan2(-dx, -dz); CAM.yaw += wrap(ty - CAM.yaw - CAM.look) * Math.min(1, dt * 2.2); } }
  WALK.moving = Math.abs(mx) + Math.abs(mz) > 1e-5;
  CAM.pos.x += mx; CAM.pos.z += mz; corridorClamp(CAM.pos);
  if (!KURA.blockBell) { }
  const gy = groundY(CAM.pos.x, CAM.pos.z) + eye + (eye < .5 ? .1 : 0);   // 低い目（ハクセキレイ）は、道の面（地形より約 10 cm 上）から測る CAM.pos.y += (gy - CAM.pos.y) * Math.min(1, dt * 8);
  if (performance.now() - CAM.lastDrag > 2600 && WALK.moving) CAM.look *= Math.pow(.25, dt);   // 歩きだすと、見回した向きがゆっくり前へ戻る
  camera.position.copy(CAM.pos); camera.quaternion.setFromEuler(new THREE.Euler(CAM.pitch, CAM.yaw + CAM.look, 0, "YXZ"));
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
function startFly() {
  hidePanel(); stopVoice(); hideSkyUI(); hideWalkUI();
  const from = QW.mode === "walk" ? CAM.pos.clone() : (() => { const a = atD(C.starts[Math.max(0, START.sel)].d); return new THREE.Vector3(a.x, groundY(a.x, a.z), a.z); })();
  const yaw = QW.mode === "walk" ? CAM.yaw + CAM.look : yawAlong(C.starts[Math.max(0, START.sel)].d);
  CAM.pos.set(from.x, groundY(from.x, from.z) + 38, from.z); CAM.yaw = yaw; CAM.look = 0; CAM.pitch = -.22;
  setMode("descend"); tweenTo(CAM.pos, CAM.yaw, CAM.pitch, 1.8, () => { setMode("fly"); showFlyUI(); });
}
function stepFly(dt) {
  const f = KEYS.has("w") || KEYS.has("arrowup") ? 1 : KEYS.has("s") || KEYS.has("arrowdown") ? -.4 : .35;
  const turn = (KEYS.has("a") || KEYS.has("arrowleft") ? 1 : 0) - (KEYS.has("d") || KEYS.has("arrowright") ? 1 : 0); CAM.yaw += turn * dt * .9;
  const yaw = CAM.yaw + CAM.look; CAM.pos.x += -Math.sin(yaw) * f * FLY.v * dt; CAM.pos.z += -Math.cos(yaw) * f * FLY.v * dt;
  const up = (FLY.up || KEYS.has("r") ? 1 : 0) - (FLY.down || KEYS.has("f") ? 1 : 0); CAM.pos.y += up * 8 * dt;
  const g = groundY(CAM.pos.x, CAM.pos.z); CAM.pos.y = Math.max(g + 8, Math.min(g + 260, CAM.pos.y));
  const bx = G.dem, lim = 30; CAM.pos.x = Math.max(bx.x0 + lim, Math.min(bx.x0 + bx.cell * (bx.nx - 1) - lim, CAM.pos.x)); CAM.pos.z = Math.max(bx.z0 + lim, Math.min(bx.z0 + bx.cell * (bx.nz - 1) - lim, CAM.pos.z));
  camera.position.copy(CAM.pos); camera.quaternion.setFromEuler(new THREE.Euler(CAM.pitch, yaw, 0, "YXZ"));
}
function landFromFly() { const n = nearestOnLine(CAM.pos.x, CAM.pos.z), a = atD(n.d); hideFlyUI(); setMode("descend"); const y = CAM.yaw + CAM.look; CAM.pos.set(a.x, groundY(a.x, a.z) + EYE, a.z); CAM.yaw = y; CAM.look = 0; CAM.pitch = -.04; tweenTo(CAM.pos, CAM.yaw, CAM.pitch, 2.0, () => { setMode("walk"); showWalkUI(); aoiArrive(); }); }
function toSky() { hidePanel(); stopVoice(); exitSight(true); hideWalkUI(); hideFlyUI(); setMode("descend");
  const tmp = new THREE.PerspectiveCamera(); const keep = camera.position.clone(); const kq = camera.quaternion.clone(); skyCam(); const p = camera.position.clone(), q = camera.quaternion.clone(); camera.position.copy(keep); camera.quaternion.copy(kq);
  TW = { p0: keep, q0: kq, p1: p, q1: q, t: 0, dur: 2.2, done: () => { setMode("sky"); showSkyUI(); } }; }

/* ---------- 入力 ---------- */
let drag = null;
canvas.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), id: e.pointerId }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (QW.mode === "sky") { SKY.tAz -= dx * .005; SKY.tEl = Math.max(.25, Math.min(1.45, SKY.tEl + dy * .004)); }
  else if (QW.mode === "walk" || QW.mode === "fly" || QW.mode === "sight") { CAM.look += dx * .0042; CAM.pitch = Math.max(-1.2, Math.min(1.1, CAM.pitch + dy * .0032)); CAM.lastDrag = performance.now(); } });
canvas.addEventListener("pointerup", e => { if (!drag) return; const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0), dt = performance.now() - drag.t; drag = null; if (moved < 8 && dt < 500) tap(e.clientX, e.clientY); });
canvas.addEventListener("wheel", e => { if (QW.mode === "sky") { SKY.tDist = Math.max(160, Math.min(2600, SKY.tDist * (1 + e.deltaY * .001))); e.preventDefault(); } }, { passive: false });
addEventListener("keydown", e => { if (e.target.closest?.("input,textarea")) return; const k = e.key.toLowerCase(); KEYS.add(k); if (k === "escape") hidePanel(); });
addEventListener("keyup", e => KEYS.delete(e.key.toLowerCase()));
addEventListener("blur", () => KEYS.clear());
function tap(x, y) {
  if (QW.mode === "sky") { let bi = -1, bd = 60; START.pins.forEach((p, i) => { p.head.getWorldPosition(_v); _v.project(camera); const sx = (_v.x + 1) / 2 * innerWidth, sy = (1 - _v.y) / 2 * innerHeight, d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; bi = i; } }); if (bi >= 0) selectStart(bi); return; }
  if (QW.mode !== "walk") return;
  if (KASA.herd) { const k = KASA.herd.pick(x, y); if (k) { touchKasane(k); return; } }   // かさねっこに触れる
  const L = pickObj(x, y); if (L) { openObj(L); return; }
  const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  const hit = r.intersectObject(QW.terrain, false)[0]; if (hit && hit.distance < 60) { WALK.goal = hit.point.clone(); corridorClamp(WALK.goal); showGoal(WALK.goal); }
}
function showGoal(p) { if (!WALK.ring) { WALK.ring = new THREE.Mesh(new THREE.RingGeometry(.28, .36, 40), new THREE.MeshBasicMaterial({ color: "#7fe3f7", transparent: true, opacity: .85, depthWrite: false })); WALK.ring.rotation.x = -Math.PI / 2; world.add(WALK.ring); } WALK.ring.position.set(p.x, groundY(p.x, p.z) + .06, p.z); WALK.ring.visible = true; }

/* ---------- かさねっこ（小さな環境エージェント）：層の地点のそばに、その層の色の子がいる（2026-10-23 本人「かさねっこを、川越と氷川にたくさん入れてください」）
   触れると、点の吹き出しで応え、碧がその地点の典拠つきの記録を訳して読む（いまの札と声の仕組み）。蔵や町家の角から覗く・層の地点へ案内する（一度したら、しばらく来ない）。
   歩くのは通りの上だけ（店蔵・町家・時の鐘の中には入らない）。遠くは描かず、起動のあと（降りてから）読む。部品＝web/kit/envAgents/kasane.js */
const KASA = { herd: null, p: null, cur: null, n: 0 };
function kasaBox(x, z, r = .25) {   // 店蔵・町家・時の鐘の箱の中か
  const inb = (cx, cz, yaw, hw, hd) => { const c = Math.cos(yaw), s = Math.sin(yaw), dx = x - cx, dz = z - cz, lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < hw + r && Math.abs(lz) < hd + r; };
  for (const k of G.kura) if (Math.abs(k.x - x) < 14 && Math.abs(k.z - z) < 14 && inb(k.x, k.z, k.yaw, k.w / 2, k.dp / 2 + .9)) return true;
  for (const k of G.machi || []) if (Math.abs(k.x - x) < 14 && Math.abs(k.z - z) < 14 && inb(k.x, k.z, k.yaw, k.w / 2, k.dp / 2 + .6)) return true;
  if (KURA.tower && inb(KURA.tower.position.x, KURA.tower.position.z, KURA.tower.rotation.y, 2.4, 2.4)) return true;
  return false;
}
function kasaOk(x, z) { return nearestOnLine(x, z).dist < 5 && !kasaBox(x, z); }   // 通りの中ほど（両側の建物の前まで出ない）
function kasaPeek(x, z) { return nearestOnLine(x, z).dist < 11 && !kasaBox(x, z, .02); }   // 覗く所：建物の角のすぐ脇
function loadKasane() {
  if (KASA.p) return KASA.p;
  return KASA.p = (async () => {
    const M = await import("../kit/envAgents/kasane.js?v=20261023m");
    const herd = KASA.herd = new M.KasaneHerd({ scene: world, camera, groundAt: (x, z) => groundY(x, z) + .06, walkable: kasaOk, walkSurface: kasaPeek, hud: COLOR5, avoid: () => AOI.root?.visible ? AOI.root.position : null, scale: MOBILE ? 3.2 : 2.9, mobile: MOBILE, maxDist: MOBILE ? 32 : 40, max: 28 });
    const near = (x, z, Rm = 9) => { if (kasaOk(x, z)) return [x, z]; for (let r = .5; r <= Rm; r += .5) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + r, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (kasaOk(px, pz)) return [px, pz]; } return null; };
    // 物陰：通りに面した店蔵・町家の角（角から 0.35 m 内側を物陰の中心とみなす）
    const covers = [];
    for (const k of [...G.kura, ...(G.machi || [])]) { const c = Math.cos(k.yaw), s = Math.sin(k.yaw), hw = k.w / 2 - .35, hd = k.dp / 2 - .35;
      for (const [lx, lz] of [[hw, hd], [-hw, hd], [hw, -hd], [-hw, -hd]]) { const x = k.x + lx * c + lz * s, z = k.z - lx * s + lz * c; if (nearestOnLine(x, z).dist < 10) covers.push({ x, z, r: .38 }); } }
    const coverNear = (x, z) => { let best = null, bd = 16; for (const c of covers) { const d = Math.hypot(c.x - x, c.z - z); if (d < bd && d > 2 && [0, 1, 2, 3, 4, 5, 6, 7].filter(i => kasaPeek(c.x + Math.cos(i * .785) * (c.r + .1), c.z + Math.sin(i * .785) * (c.r + .1))).length >= 2) { bd = d; best = c; } } return best; };
    const usedC = new Set(); let k = 0; const crowd = (x, z) => herd.agents.filter(a => Math.hypot(a.anchor.x - x, a.anchor.y - z) < 11).length >= 5;   // 時の鐘のまわりのように地点が集まる所は、5 体まで
    const objs = LAYER.objs.filter(L => L.kind !== "sho" || true).map(L => ({ L, d: nearestOnLine(L.o.x, L.o.z).d })).sort((a, b) => a.d - b.d);
    // 2026-10-23 本人「一人より、群れでわちゃわちゃしている方が可愛い」＝地点ごとに 3〜5 体の群れ（近くの地点の層の子も混ざる）。地点が集まる所は 12 m に一つの群れまで
    const centers = [];
    for (const { L } of objs) {
      k++; const p = near(L.o.x, L.o.z); if (!p || centers.some(c => Math.hypot(c[0] - p[0], c[1] - p[1]) < 12)) continue; centers.push(p);
      const n = 3 + (k % 3), others = objs.map(o => o.L).filter(o => o !== L && Math.hypot(o.o.x - L.o.x, o.o.z - L.o.z) < 30), mem = [{ layer: top5(L.layer), data: L, target: { x: L.o.x, z: L.o.z } }];
      for (let m = 1; m < n; m++) { const O = others.length && m % 2 ? others[(k + m) % others.length] : L; mem.push({ layer: top5(O.layer), data: O, target: { x: O.o.x, z: O.o.z } }); }
      const G = herd.addGroup(mem, { x: p[0], z: p[1], radius: 2.6, role: k % 3 === 0 ? "watch" : "" }); for (const a of G.members) a.d = nearestOnLine(p[0], p[1]).d;
    }
    // 地点のない区間（本川越駅から夢通りなど）にも：通り全体の記録（台地の上の通り）の子と、生きもの（Qualia/sight）へ誘う子の群れを 34 m ごとに
    const daichi = LAYER.objs.find(L => L.o.id === "n_daichi"), endD = G.lineD[G.lineD.length - 1]; let g = 0;
    for (let d = 15; d < endD - 6 && daichi; d += 34) {
      if (herd.agents.some(a => a.d != null && Math.abs(a.d - d) < 22)) continue;
      const c = atD(d), side = (g % 2 ? 1 : -1) * 1.5, p = near(c.x + c.tz * side, c.z - c.tx * side, 4); if (!p) continue; g++;
      const mem = [{ layer: "nature", data: daichi }, { layer: "sight", data: { sightPick: true } }, { layer: "nature", data: daichi }]; if (g % 2) mem.push({ layer: "sight", data: { sightPick: true } });
      const G2 = herd.addGroup(mem, { x: p[0], z: p[1], radius: 2.6, role: g % 3 === 0 ? "watch" : "" }); for (const a of G2.members) a.d = d;
    }
    KASA.n = herd.agents.length; QW.KASA = KASA; herd.setLayers(LAYER.worn);
    await herd.load();
  })().catch(e => console.warn("かさねっこ：", e?.message ?? e));
}
function touchKasane(a) {
  KASA.cur = a; KASA.herd.touch(a, () => { if (KASA.cur !== a || QW.mode !== "walk") return; if (a.data?.sightPick) { KASA.herd.release(a); KASA.cur = null; openSightChooser(); return; } openObj(a.data); KASA.cur = a; a.state = "focus"; a.focusTo = new THREE.Vector2(camera.position.x, camera.position.z);
    if (AOI.m) { const p = a.center(new THREE.Vector3()); AOI.focus = p; AOI.m.lookAt(p); setTimeout(() => { if (AOI.focus === p) { AOI.focus = null; AOI.m?.lookAt(camera.position.clone()); } }, 1600); } });
}

/* ---------- Qualia/sight：いまいる所で、生きものの身体に入れ替わる（動くのは見る人の操作だけ） ---------- */
const SIGHT = { sp: null, post: null, fwd: false };
function openSightChooser() {
  const box = $("#sightList"); box.innerHTML = "";
  for (const sp of C.sight) { const b = document.createElement("button"); b.className = "spBtn"; b.type = "button"; b.innerHTML = `<span class="sk">${sp.en}</span><span class="sn">${sp.name}</span><span class="sl">${sp.lead}</span>`; b.addEventListener("click", () => { $("#sightBox").hidden = true; enterSight(sp); }); box.appendChild(b); }
  $("#sightBox").hidden = false;
}
function enterSight(sp) {
  if (QW.mode === "sky" || QW.mode === "descend") { const a = atD(C.starts[Math.max(0, START.sel)].d); CAM.pos.set(a.x, groundY(a.x, a.z) + EYE, a.z); CAM.yaw = yawAlong(C.starts[Math.max(0, START.sel)].d); hideSkyUI(); }
  hidePanel(); stopVoice(); hideWalkUI(); hideFlyUI(); exitSight(true);
  SIGHT.sp = sp; const p = CAM.pos.clone(); p.y = groundY(p.x, p.z) + sp.eye + (sp.eye < .5 ? .1 : 0); CAM.look = 0; CAM.pitch = sp.move === "fly" ? -.25 : .05;
  setMode("descend"); tweenTo(p, CAM.yaw, CAM.pitch, 1.6, () => { CAM.pos.copy(p); setMode("sight"); setupSightLook(sp); showSightUI(sp); showBody(sp); camera.fov = sp.fov; camera.updateProjectionMatrix(); speakLines(sp.lines, null); });
}
/* 生きものの後ろ姿（walk 氷川と同じ見せ方）：肩越しに、斜め後ろの少し上から。見え方の置きかえ（色の差）の外に、くっきり重ねる。
   3D は mitsulab の自作（_dev/sight_models/：形と色は図鑑の記録で確かめた・遠く用の形） */
const BODY = QW.BODY = { id: null, m: null, scene: null, mixer: null, acts: {}, cur: null, last: new THREE.Vector3(), spd: 0 };
const BODY_D = { isohiyo: { f: "isohiyodori", dd: .5, dn: .26, dy: .8, main: "fly" }, hakusekirei: { f: "hakusekirei", dd: .34, dn: .08, dy: .65, main: "walk", idle: "perch" } };
function showBody(sp) {
  hideBody(); const D = BODY_D[sp.id]; if (!D) return; BODY.id = sp.id; const id = sp.id;
  fetch(`web/sight/${D.f}_far.glb?v=2`).then(r => r.arrayBuffer()).then(buf => { const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); return ld.parseAsync(buf, "web/sight/"); }).then(g => {
    if (BODY.id !== id) return;
    if (!BODY.scene) { BODY.scene = new THREE.Scene(); BODY.scene.add(new THREE.HemisphereLight("#dfe9ff", "#4d4636", 1.4)); const s = new THREE.DirectionalLight("#fff1dc", 2.4); s.position.set(-.6, 1, .3); BODY.scene.add(s); }
    BODY.scene.environment = scene.environment;
    const o = g.scene; o.traverse(m => { if (m.isMesh) m.frustumCulled = false; }); BODY.scene.add(o); BODY.m = o;
    BODY.mixer = new THREE.AnimationMixer(o); BODY.acts = {}; for (const c of g.animations) BODY.acts[c.name] = BODY.mixer.clipAction(c);
    BODY.cur = null; playBody(D.main, 0); BODY.last.copy(camera.position);
  }).catch(e => console.warn("body", e));
}
function playBody(n, fade = .35) { const a = BODY.acts[n]; if (!a || BODY.cur === a) return; a.reset().play(); if (BODY.cur) BODY.cur.crossFadeTo(a, fade, false); BODY.cur = a; }
function hideBody() { BODY.id = null; if (BODY.m) { BODY.mixer?.stopAllAction(); BODY.m.traverse(m => { if (m.isMesh) { m.geometry.dispose(); for (const mt of [].concat(m.material)) { for (const k in mt) if (mt[k]?.isTexture) mt[k].dispose(); mt.dispose(); } } }); BODY.m.removeFromParent(); BODY.m = null; } }
function stepBody(dt) {
  const sp = SIGHT.sp, D = sp && BODY_D[sp.id]; if (!BODY.m || !D || QW.mode !== "sight") return;
  const vyaw = CAM.yaw + CAM.look, cp = camera.position, o = BODY.m, fx = -Math.sin(vyaw), fz = -Math.cos(vyaw);
  o.position.set(cp.x + fx * D.dd, cp.y - D.dn, cp.z + fz * D.dd);
  if (sp.move === "walk") o.position.y = groundY(o.position.x, o.position.z) + .1;   // 道の面（地形より少し上）に立つ
  o.rotation.set(0, vyaw + Math.PI + D.dy, 0);
  const spd = cp.distanceTo(BODY.last) / Math.max(dt, 1e-3); BODY.last.copy(cp); BODY.spd += (spd - BODY.spd) * Math.min(1, dt * 4);
  playBody(D.idle && BODY.spd < .12 ? D.idle : D.main); BODY.mixer.update(dt);
}
function renderBody() { if (!BODY.m || !BODY.scene || QW.mode !== "sight") return; const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth(); renderer.render(BODY.scene, camera); renderer.autoClear = ac; }
function exitSight(quiet = false) {
  if (!SIGHT.sp) return; teardownSightLook(); hideBody(); SIGHT.sp = null; camera.fov = MOBILE ? 62 : 55; camera.updateProjectionMatrix(); $("#sightUI").hidden = true; $("#sUpDn").hidden = true;
  if (quiet) return; stopVoice(); setMode("descend"); const p = CAM.pos.clone(); p.y = groundY(p.x, p.z) + EYE; corridorClamp(p);
  tweenTo(p, CAM.yaw + CAM.look, -.04, 1.4, () => { CAM.pos.copy(p); CAM.yaw += CAM.look; CAM.look = 0; CAM.pitch = -.04; setMode("walk"); showWalkUI(); aoiArrive(); speakLines([C.back], null); });
}
function setupSightLook(sp) {
  const s = renderer.getDrawingBufferSize(new THREE.Vector2()), rt = new THREE.WebGLRenderTarget(s.x, s.y, { type: THREE.HalfFloatType, samples: MOBILE ? 0 : 4 });
  const mat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: rt.texture }, mode: { value: sp.mode } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform int mode; varying vec2 vUv;
      void main(){ vec2 uv=vUv; vec3 c;
        if(mode==1){ vec2 q=uv-.5; uv=.5+q*(1.-.06*dot(q,q)); c=texture2D(tDiffuse,uv).rgb; float l=dot(c,vec3(.2126,.7152,.0722)); float sat=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b)); c=max(vec3(0.),mix(vec3(l),c,1.+.35*smoothstep(.06,.22,sat))); }   // 色の差の広げ方：色みのある所だけ（灰色の屋根を青緑にしない）   // 鳥：色どうしの差を広げる（四種類の単錐体の模式＝人の目への置きかえ）
        else c=texture2D(tDiffuse,uv).rgb;
        float v=smoothstep(.95,.35,length(vUv-.5)); c*=mix(.74,1.,v); gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, depthTest: false, depthWrite: false });
  mat.toneMapped = true; const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; const ps = new THREE.Scene(); ps.add(quad);
  SIGHT.post = { rt, mat, ps, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
}
function teardownSightLook() { if (SIGHT.post) { SIGHT.post.rt.dispose(); SIGHT.post.mat.dispose(); SIGHT.post = null; } }
function resizePost() { if (!SIGHT.post) return; const s = renderer.getDrawingBufferSize(new THREE.Vector2()); SIGHT.post.rt.setSize(s.x, s.y); }
function stepSight(dt) {
  const sp = SIGHT.sp; if (!sp) return;
  if (sp.move === "fly") {
    const f = SIGHT.fwd || KEYS.has("w") || KEYS.has("arrowup") ? 1 : 0, turn = (KEYS.has("a") || KEYS.has("arrowleft") ? 1 : 0) - (KEYS.has("d") || KEYS.has("arrowright") ? 1 : 0); CAM.yaw += turn * dt * 1.1;
    const yaw = CAM.yaw + CAM.look; CAM.pos.x += -Math.sin(yaw) * f * sp.speed * dt; CAM.pos.z += -Math.cos(yaw) * f * sp.speed * dt;
    const up = (FLY.up || KEYS.has("r") ? 1 : 0) - (FLY.down || KEYS.has("f") ? 1 : 0); const g = groundY(CAM.pos.x, CAM.pos.z); CAM.pos.y = Math.max(g + 3, Math.min(g + 40, CAM.pos.y + up * 4 * dt));
    const n = nearestOnLine(CAM.pos.x, CAM.pos.z); if (n.dist > 90) { const a = atD(n.d), k = 90 / n.dist; CAM.pos.x = a.x + (CAM.pos.x - a.x) * k; CAM.pos.z = a.z + (CAM.pos.z - a.z) * k; }
    camera.position.copy(CAM.pos); camera.quaternion.setFromEuler(new THREE.Euler(CAM.pitch, yaw, 0, "YXZ"));
  } else { WALK.hold = SIGHT.fwd; stepWalk(dt, sp.eye, sp.speed); }
}
function showSightUI(sp) { $("#sEn").textContent = sp.en; $("#sName").textContent = sp.name; $("#sLead").textContent = sp.lead; $("#sightUI").hidden = false; $("#sUpDn").hidden = false; $("#sUp").hidden = $("#sDown").hidden = sp.move !== "fly"; }
$("#sWhy").addEventListener("click", () => { const sp = SIGHT.sp; if (!sp) return; openPanel({ color: GL.sight.color, layer: `${String(layerNo("sight")).padStart(2, "0")}　Qualia/sight`, title: sp.name + "の手がかり", lines: sp.lines, more: sp.body, note: sp.note, src: sp.src, how: "研究の一般論と記録（模式）" }); });
$("#sBack").addEventListener("click", () => exitSight());

/* ---------- Qualia/sound：記録から組み立てた時の鐘（③ 再現音・④ 詩の音） ---------- */
let BELL = null;
function bell() { if (!BELL) BELL = new BellSynth(); BELL.resume(); return BELL; }
function openSound(L, no) {
  const it = L.o, g = GL.sound;
  const run = () => { if (!soundOn) { toast("声と音がオフです（メニュー）"); return; } stopVoice(); const b = bell(); const dist = KURA.tower ? Math.hypot(KURA.tower.position.x - camera.position.x, KURA.tower.position.z - camera.position.z) : 0;
    if (it.kind === "kokonotsu") b.sequence(Array.from({ length: 9 }, (_, i) => i * 5), { dist });
    else if (it.kind === "hayagane") b.sequence([0, 1.1, 2.2, 4.4, 5.5, 6.6, 8.8, 11, 11.6, 12.2, 12.8, 13.4, 14, 14.6, 15.2, 15.8], { dist, hard: true });
    else { b.sequence([0, 7, 14], { dist }); WAVE.start(); }
    showTag(it.label, it.kind === "kokonotsu" ? 44 : it.kind === "hayagane" ? 20 : 22); };
  openPanel({ color: g.color, layer: no, title: it.title, lines: it.lines, more: [it.label, it.how], src: it.src, ll: it.ll, how: it.label.split("（")[0], buttons: [{ label: "鳴らす", primary: true, run }, { label: "止める", run: () => { BELL?.stop(); WAVE.stop(); } }] });
  speakLines(it.lines, L, { done: run });
}
function showTag(t, sec) { const e = $("#sndTag"); e.textContent = t; e.dataset.k = t.startsWith("④") ? "poem" : t.startsWith("③") ? "re" : "rec"; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => { e.hidden = true; }, sec * 1000); }
const WAVE = { rings: [], on: false, t0: 0,
  start() { this.stop(); this.on = true; this.t0 = performance.now() / 1000; },
  stop() { this.on = false; for (const r of this.rings) world.remove(r); this.rings.length = 0; },
  step() { if (!this.on || !KURA.tower) return; const t = performance.now() / 1000 - this.t0;
    for (const k of [0, 7, 14]) { const age = t - k; let r = this.rings[k / 7]; if (age < 0) continue;
      if (!r) { r = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 128), new THREE.MeshBasicMaterial({ color: "#8fb6dc", transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })); r.rotation.x = -Math.PI / 2; r.position.set(KURA.tower.position.x, KURA.bellY - 2, KURA.tower.position.z); world.add(r); this.rings[k / 7] = r; }
      const R = age * 340 * .25 + 1; r.scale.setScalar(R); r.material.opacity = Math.max(0, .7 * (1 - age / 8)); }
    if (t > 24) this.stop(); } };

/* ---------- Qualia/touch：触れると、振動と音で手ざわり（iPhone は震えないので、光の輪と音） ---------- */
const TOUCH = { stop: null };
function openTouch(L, no) {
  const it = L.o, g = GL.touch, M = kuraMats(TL, MOBILE);
  const pad = document.createElement("div"); pad.className = "tpad"; pad.style.cssText = "position:relative;height:180px;border:1px solid var(--ml-line-2);margin:8px 0;touch-action:none;overflow:hidden;background-size:cover";
  const img = it.tex === "kawara" ? M.tileCanvas.toDataURL() : `web/tex/${it.tex === "plaster" ? "plaster_c" : it.tex === "bronze" ? "bronze_c" : "wood_c"}.webp`;
  pad.style.backgroundImage = `url(${img})`; if (it.tex === "plaster") pad.style.filter = "brightness(.28) contrast(1.4)";
  pad.innerHTML = `<span style="position:absolute;left:10px;bottom:8px;font-size:12px;color:#d4edf4;text-shadow:0 1px 3px #000">指でなぞる</span>`;
  let ac = null, src = null, flt = null, gn = null, last = null;
  const start = () => { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (src) return; const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src = ac.createBufferSource(); src.buffer = b; src.loop = true; flt = ac.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = { plaster: 2600, kawara: 900, bronze: 3800, wood: 1300 }[it.tex]; flt.Q.value = it.tex === "bronze" ? 6 : 1.2; gn = ac.createGain(); gn.gain.value = 0; src.connect(flt).connect(gn).connect(ac.destination); src.start(); };
  const move = e => { if (!soundOn) return; start(); const r = pad.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; const sp = last ? Math.hypot(x - last[0], y - last[1]) : 0; last = [x, y];
    const bump = it.tex === "kawara" ? Math.abs(Math.sin(x / r.width * Math.PI * 2 * 4)) : it.tex === "wood" ? Math.abs(Math.sin(y / r.height * Math.PI * 8)) : .5;
    gn.gain.setTargetAtTime(Math.min(.5, sp * .02) * (it.tex === "plaster" ? .5 : 1) * (.5 + bump * .5), ac.currentTime, .02);
    if (sp > 3) try { navigator.vibrate?.(it.tex === "plaster" ? 4 : it.tex === "bronze" ? 2 : Math.round(4 + bump * 10)); } catch { } };
  const up = () => { last = null; if (gn) gn.gain.setTargetAtTime(0, ac.currentTime, .05); if (it.tex === "bronze" && soundOn) { stopVoice(); bell().strike(0, { gain: .5 }); } };
  pad.addEventListener("pointerdown", e => { pad.setPointerCapture(e.pointerId); move(e); }); pad.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "touch") move(e); }); pad.addEventListener("pointerup", up); pad.addEventListener("pointercancel", up);
  TOUCH.stop = () => { try { src?.stop(); ac?.close(); } catch { } src = null; TOUCH.stop = null; };
  openPanel({ color: g.color, layer: no, title: it.title, lines: it.lines, more: (it.more || []).concat(it.tex === "bronze" ? ["指を離すと、組み立てた鐘の音が一つ鳴ります（③ 再現音。録音ではありません）。"] : []), src: it.src, ll: it.ll, how: "記録と模式（手ざわりと音は、その場で組み立てたもの）", pad });
  speakLines(it.lines, L);
}

/* ---------- Qualia/sho：上原光瑛の書を通りに浮かべる（共通部品 sho3d.js）。近づくと粒にほどけ、音が鳴る ---------- */
const SHO = { mod: null, loading: null, live: {} };
function loadShoMod() { return SHO.loading ||= import("../sho/sho3d.js").then(m => { SHO.mod = m; return m; }).catch(e => console.warn("sho", e)); }
function stepSho(dt) {
  const on = LAYER.worn.includes("sound") && (QW.mode === "walk" || QW.mode === "fly"), cp = camera.position, t = performance.now() / 1000;
  for (const it of C.sho) {
    const dist = Math.hypot(it.x - cp.x, it.z - cp.z), want = on && dist < 60, S = SHO.live[it.id];
    if (want && !S) { if (!SHO.mod) { loadShoMod(); continue; }
      if (SHO.live[it.id] === undefined) { SHO.live[it.id] = null; SHO.mod.loadShoMap(it.src).then(map => {
        const sho = SHO.mod.createSho(THREE, map, { width: 2.2, particleMode: "ink", mobile: MOBILE }); const n = nearestOnLine(it.x, it.z), a = atD(n.d);
        sho.group.position.set(it.x, groundY(it.x, it.z) + 1.9, it.z); sho.group.rotation.y = Math.atan2(a.x - it.x, a.z - it.z) || 0; sho.setScale(innerHeight * renderer.getPixelRatio() * .9); world.add(sho.group);
        SHO.live[it.id] = { sho, snd: null, it, hold: 0 }; }).catch(e => console.warn("sho map", e)); }
      continue; }
    if (!S) continue;
    S.sho.group.visible = want; if (!want) { S.snd?.stop(); continue; }
    if (!S.snd && BELL?.ac && soundOn) S.snd = SHO.mod.createShoSound(it.preset, { context: BELL.ac, destination: BELL.ac.destination, volume: .4 });
    if (S.snd && soundOn && !S.snd.running && BELL.ac.state === "running") S.snd.start();
    if (S.snd && !soundOn && S.snd.running) S.snd.stop();
    S.hold = Math.max(0, S.hold - dt); S.sho.target = S.hold > 0 ? 1 : dist < 7 ? .85 : 0;
    S.sho.update(dt, t); if (S.snd) { S.snd.update(S.sho.state, dt); S.sho.setLevel(S.snd.level); S.snd.gain(Math.max(0, 1 - dist / 40) * (voiceQ ? .4 : 1)); }
  }
}
function openSho(L, no) {
  const it = L.o, g = GL.sho; bell();
  openPanel({ color: g.color, layer: no, title: `《${it.title}》`, more: ["上原光瑛の書。墨の形を 3D の起伏にし、近づくと筆の向きに沿って粒にほどけ、また集まります。音は、ほどける速さに合わせて、その場で組み立てています。", "置いた場所：" + it.why + "（題と場所の結びつけは、mitsulab の解釈です。事実の説明ではありません）"],
    src: [{ t: "書：上原光瑛（© mitsulab. All rights reserved.）" }], ll: it.ll, how: "作品（mitsulab）", buttons: [{ label: "ほどく・集める", primary: true, run: () => { const S = SHO.live[it.id]; try { navigator.vibrate?.([18, 50, 30, 60, 14]); } catch { } if (S) S.hold = S.hold > 0 ? 0 : 4.5; } }] });
  const S = SHO.live[it.id]; if (S) S.hold = 4.5;
}

/* ---------- 画面の部品 ---------- */
function toast(t) { const e = $("#toast"); e.textContent = t; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => { e.hidden = true; }, 5200); }
const showSkyUI = () => { $("#skyUI").hidden = false; $("#pinLabels").hidden = false; requestAnimationFrame(syncStMeter); };
const hideSkyUI = () => { $("#skyUI").hidden = true; $("#pinLabels").hidden = true; };
const showWalkUI = () => { $("#walkUI").hidden = false; syncAutoBtn(); };
const hideWalkUI = () => { $("#walkUI").hidden = true; };
const showFlyUI = () => { $("#flyUI").hidden = false; };
const hideFlyUI = () => { $("#flyUI").hidden = true; };
function syncAutoBtn() { const b = $("#autoBtn"); b.setAttribute("aria-pressed", String(WALK.auto)); b.querySelector("span").textContent = WALK.auto ? "止まる" : "歩きつづける"; }
$("#autoBtn").addEventListener("click", () => { WALK.auto = !WALK.auto; WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; syncAutoBtn(); });
$("#sightX").addEventListener("click", () => { $("#sightBox").hidden = true; });
$("#lsHead").addEventListener("click", () => { const c = $("#lstack").classList.toggle("closed"); $("#lsHead").setAttribute("aria-expanded", String(!c)); });
$("#lsAll").addEventListener("click", () => { LAYER.worn = ALL.map(l => l.id); syncTray(); KASA.herd?.setLayers(LAYER.worn); });
$("#lsNone").addEventListener("click", () => wearLayer(null));
if (innerWidth < 640) { $("#lstack").classList.add("closed"); $("#lsHead").setAttribute("aria-expanded", "false"); }
let unlocked = false;
function unlockAudio() { if (unlocked || !C) return; unlocked = true; try { bell(); audio.muted = true; audio.src = C.intro.f; const p = audio.play(); p?.then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false; }).catch(() => { audio.muted = false; unlocked = false; }); } catch { audio.muted = false; } }
addEventListener("pointerup", () => unlockAudio(), true);
$("#goDown").addEventListener("click", () => { unlockAudio(); descendTo(Math.max(0, START.sel)); });
$("#skyFly").addEventListener("click", () => { unlockAudio(); startFly(); });
$("#skySight").addEventListener("click", () => { unlockAudio(); openSightChooser(); });
$("#modeSky").addEventListener("click", () => { if (QW.mode !== "sky") toSky(); });
$("#modeWalk").addEventListener("click", () => { if (QW.mode === "fly") landFromFly(); else if (QW.mode === "sky") descendTo(Math.max(0, START.sel)); else if (QW.mode === "sight") exitSight(); });
$("#modeFly").addEventListener("click", () => { if (QW.mode !== "fly") { exitSight(true); startFly(); } });
const holdBtn = (el, on, off) => { el.addEventListener("pointerdown", e => { e.preventDefault(); on(); el.setPointerCapture(e.pointerId); }); for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, off); };
holdBtn($("#flyUp"), () => FLY.up = true, () => FLY.up = false); holdBtn($("#flyDown"), () => FLY.down = true, () => FLY.down = false);
holdBtn($("#sUp"), () => FLY.up = true, () => FLY.up = false); holdBtn($("#sDown"), () => FLY.down = true, () => FLY.down = false);
holdBtn($("#sFwd"), () => { SIGHT.fwd = true; }, () => { SIGHT.fwd = false; });
$("#land").addEventListener("click", landFromFly);
$("#menuBtn").addEventListener("click", () => { const m = $("#menu"); m.hidden = !m.hidden; $("#menuBtn").setAttribute("aria-expanded", String(!m.hidden)); });
$("#menuX").addEventListener("click", () => { $("#menu").hidden = true; $("#menuBtn").setAttribute("aria-expanded", "false"); });
$("#sndBtn").addEventListener("click", () => { soundOn = !soundOn; $("#sndBtn").setAttribute("aria-pressed", String(soundOn)); $("#sndBtn").textContent = soundOn ? "声と音 オン" : "声と音 オフ"; if (!soundOn) { try { audio.pause(); } catch { } BELL?.stop(); } });
function fillMenu() { $("#about").textContent = C.about; $("#credit").textContent = C.credit; }
function buildTray() {
  const a = $("#layersAll"); a.innerHTML = "";
  const mk = (L, i) => {
    const n = L.id === "sight" ? C.sight.length : L.id === "sound" ? C.sound.length + C.sho.length : L.id === "touch" ? C.touch.length : C.objs.filter(o => top5(o.layer) === L.id).length;
    const li = document.createElement("li"); li.className = "ly"; const b = document.createElement("button"); b.type = "button"; b.className = "lyBtn" + (L.q ? " q" : ""); b.dataset.id = L.id; b.style.setProperty("--gc", L.color); b.title = L.lead; b.setAttribute("aria-label", `${L.name}（${L.lead}）`);
    b.innerHTML = `<span class="tk" aria-hidden="true"></span><span class="no">L${String(i + 1).padStart(2, "0")}</span><span class="nm"><b>${L.name}</b><small>${L.en}</small></span><span class="ct">${String(n).padStart(2, "0")}</span>`;
    b.addEventListener("click", () => wearLayer(L.id)); li.appendChild(b);
    if (L.id === "sight") { const g = document.createElement("button"); g.type = "button"; g.className = "lyGo hb"; g.style.setProperty("--gc", L.color); g.textContent = "入る"; g.setAttribute("aria-label", "生きものの身体に入る"); g.addEventListener("click", e => { e.stopPropagation(); openSightChooser(); }); li.appendChild(g); }
    a.appendChild(li); };
  ALL.slice(0, 2).forEach((L, i) => mk(L, i));
  const sep = document.createElement("li"); sep.className = "lySep"; sep.setAttribute("aria-hidden", "true"); sep.textContent = "五感 · SENSES"; a.appendChild(sep);
  ALL.slice(2).forEach((L, i) => mk(L, 2 + i));
  syncTray();
}
function syncTray() { document.querySelectorAll(".lyBtn").forEach(b => b.setAttribute("aria-pressed", LAYER.worn.includes(b.dataset.id) ? "true" : "false")); const c = $("#lsCount"); if (c) c.textContent = `${LAYER.worn.length} / ${ALL.length}`; }
QW.dbg = () => ({ mode: QW.mode, cam: [CAM.pos.x, CAM.pos.y, CAM.pos.z], worn: [...LAYER.worn], aoi: !!AOI.root?.visible, talk: voiceQ?.talk?.o?.id || null, spoken: TALK.spoken.size, nBld: QW.nBld, sight: SIGHT.sp?.id || null });
QW.goto = d => { const a = atD(d); CAM.pos.set(a.x, groundY(a.x, a.z) + EYE, a.z); CAM.yaw = yawAlong(d + 5); CAM.look = 0; if (AOI.m) { aoiSpot(AOI.pos); AOI.m.teleport(AOI.pos.x, AOI.pos.z, CAM.yaw + Math.PI); } };
QW.place = (x, z, tx, tz, p = -.08) => { CAM.pos.set(x, groundY(x, z) + EYE, z); CAM.yaw = Math.atan2(-(tx - x), -(tz - z)); CAM.look = 0; CAM.pitch = p; };
QW.open = id => { const L = LAYER.objs.find(l => l.o.id === id); if (L) openObj(L); return !!L; };
QW.sight = id => { const sp = C.sight.find(s => s.id === id); if (sp) enterSight(sp); };
QW.wear = wearLayer; QW.sky = SKY; QW.descend = i => descendTo(i); QW.fly = () => startFly();
QW.autoWalk = on => { WALK.auto = !!on; syncAutoBtn(); };

/* 型の札：いちばん近い一棟の正面の上に、画面の部品として。層の一覧・字幕・右の札の上には出さない */
const TAG = { el: null, cur: null, a: 0, avT: 0, av: null };
const _tp = new THREE.Vector3();
function stepTag() {
  const el = TAG.el || (TAG.el = $("#kuraTag")); if (!el) return;
  const cp = camera.position, on = QW.mode === "walk" && $("#panel").hidden; let best = null, bd = 16;
  if (on) for (const T of KURA.tags) { const d = Math.hypot(T.k.x - cp.x, T.k.z - cp.z); if (d < bd) { bd = d; best = T; } }
  let show = false;
  if (best) { const k = best.k, fx = Math.sin(k.yaw), fz = Math.cos(k.yaw); _tp.set(k.x + fx * (k.dp / 2 + .8), k.y + 3.4, k.z + fz * (k.dp / 2 + .8)).project(camera);
    if (_tp.z < 1 && Math.abs(_tp.x) < 1.1 && Math.abs(_tp.y) < 1.1) {
      const now = performance.now(); if (!TAG.av || now - TAG.avT > 400) { TAG.avT = now; const l = $("#lstack").getBoundingClientRect(), c = $("#caption"), cr = c.hidden ? null : c.getBoundingClientRect(), top = cr && cr.top < innerHeight / 2;
        TAG.av = { lx: l.width ? l.right + 14 : 16, ly: l.height ? l.bottom : 0, cy: cr && !top ? cr.top - 8 : innerHeight - 90, ty: top ? cr.bottom + 10 : 70 }; }   // 字幕が上にあるとき（スマホ）は、その下に
      if (TAG.cur !== best) { TAG.cur = best; el.querySelector(".c").textContent = best.code + "  //  MODEL"; el.querySelector(".n").textContent = best.name; }
      const w = el.offsetWidth || 260, h = el.offsetHeight || 52; let x = (_tp.x + 1) / 2 * innerWidth - w / 2, y = (1 - _tp.y) / 2 * innerHeight - h;
      x = Math.max(TAG.av.lx, Math.min(innerWidth - w - 16, x)); y = Math.max(TAG.av.ty, Math.min(TAG.av.cy - h, y));
      if (x < TAG.av.lx + 1 && y < TAG.av.ly) x = TAG.av.lx;
      el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`; show = true; TAG.a = Math.min(1, (16 - bd) / 5); } }
  el.style.opacity = show ? TAG.a.toFixed(2) : "0"; el.hidden = !show;
}

/* ---------- まわす ---------- */
const clock = new THREE.Clock(); let fpsAcc = 0, fpsN = 0, prT = 0; const GEO = { t: 0, last: "" };
function frame() {
  const dt = Math.min(.05, clock.getDelta());
  if (!stepTween(dt)) {
    if (QW.mode === "sky") { SKY.az += (SKY.tAz - SKY.az) * Math.min(1, dt * 5); SKY.el += (SKY.tEl - SKY.el) * Math.min(1, dt * 5); SKY.dist += (SKY.tDist - SKY.dist) * Math.min(1, dt * 5); if (!drag && !RM) SKY.tAz += dt * .02; skyCam(); }
    else if (QW.mode === "walk") stepWalk(dt);
    else if (QW.mode === "fly") stepFly(dt);
    else if (QW.mode === "sight") stepSight(dt);
  }
  if (QW.mode === "sky") { const nw = performance.now(); if (!DC.sk || nw - DC.skT > 500) { DC.skT = nw; DC.sk = [$("#skyUI .card").getBoundingClientRect(), $("#lstack").getBoundingClientRect()]; } const [card, ls] = DC.sk, put = [];
    const order = START.pins.map((p, i) => i).sort((a, b) => (b === START.sel) - (a === START.sel));   // 選んだ点の札を先に置く
    for (const i of order) { const p = START.pins[i]; p.head.getWorldPosition(_v); _v.project(camera); const l = START.labels[i]; if (_v.z > 1) { l.style.display = "none"; continue; }
      const w = l.offsetWidth || 60, h = l.offsetHeight || 22; let x = Math.min(innerWidth - w - 8, Math.max(8, (_v.x + 1) / 2 * innerWidth)), y = (1 - _v.y) / 2 * innerHeight;
      for (let k = 0; k < 4; k++) { const r = { x0: x + 10, x1: x + 10 + w, y0: y - 34, y1: y - 34 + h }; const hit = put.find(q => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0); if (!hit) break; y = hit.y1 + 34 + 3; }   // 重なるときは下へずらす
      const r = { x0: x + 10, x1: x + 10 + w, y0: y - 34, y1: y - 34 + h };
      const under = (c) => c.width && r.x0 < c.right && r.x1 > c.left && r.y0 < c.bottom && r.y1 > c.top;
      if (under(card) || under(ls)) { l.style.display = "none"; continue; }   // 始める場所の欄・層の一覧の下には出さない
      l.style.display = ""; put.push(r); l.style.transform = `translate(${x}px,${y}px)`; }
    START.pins.forEach((p, i) => { const s = Math.max(1, SKY.dist / 300); p.ring.scale.setScalar((i === START.sel ? 1.5 : 1) * s); p.beam.scale.set(s, 1, s); }); }
  for (const p of START.pins) p.g.visible = QW.mode === "sky" || QW.mode === "descend";
  { const low = camera.position.y - groundY(camera.position.x, camera.position.z) < 160; if (QW.roads) QW.roads.visible = low; if (QW.pave) QW.pave.visible = low; if (BLD.foot) BLD.foot.visible = low; }   // 上空では写真の道を見せる（帯は地上の近くだけ）
  if ((GEO.t -= dt) < 0 && QW.mode !== "boot") { GEO.t = .25; const g = GEO.el || (GEO.el = $("#lsGeo")), cp = camera.position, la = G.origin[0] - cp.z / G.ky, lo = G.origin[1] + cp.x / G.kx, h = Math.max(0, cp.y - groundY(cp.x, cp.z));
    const txt = `POS <b>${la.toFixed(4)}N ${lo.toFixed(4)}E</b>\nALT ${Math.round(h)}m  ${QW.mode.toUpperCase()}`; if (g && txt !== GEO.last) { g.innerHTML = txt; GEO.last = txt; } }
  if (!RM) BLDU.t.value += dt;
  if (BLD.lines) BLD.lines.material.opacity = QW.mode === "sight" ? .16 : .42;
  if (BLD.mat) BLD.mat.uniforms.amul.value += ((QW.mode === "fly" ? .7 : QW.mode === "sight" ? .06 : 1) - BLD.mat.uniforms.amul.value) * Math.min(1, dt * 3); DESAT.value += ((QW.mode === "sight" ? .8 : 0) - DESAT.value) * Math.min(1, dt * 3); if (BLD.lines) BLD.lines.material.opacity += ((QW.mode === "sight" ? .2 : .42) - BLD.lines.material.opacity) * Math.min(1, dt * 3);   // 2026-10-23 公開前：鳥の高さから見ると半透明の面が重なって町の外が水面に見えたので、sight では面をほとんど消し線を薄く   // 上から見ると面が重なって濃くなるので、面を薄く（線は残す）
  { const m = QW.mode, want = m === "sky" || m === "boot" ? 1 : m === "descend" ? CYBER.v.value : 0; CYBER.v.value += (want - CYBER.v.value) * Math.min(1, dt * 2.2); CYBER.scan.value = (performance.now() / 1000 * 70) % 2600 - 900;
    const bg = CYBER.v.value > .5 ? NAVY : QW.skyBg; if (scene.background !== bg) scene.background = bg; scene.fog.color.copy(FOG).lerp(NAVY, CYBER.v.value); if (QW.near) QW.near.visible = CYBER.v.value < .5; }   // 3D 地図の電脳の地面（氷川と同じ）
  stepLayer(dt); stepSho(dt); stepTalk(); WAVE.step(); KASA.herd?.update(dt, { active: QW.mode === "walk", busy: !$("#panel").hidden });
  if (KURA.tags) stepTag();
  if (QW.mode === "walk") stepAoi(dt);
  if (QW.mode === "sight") stepBody(dt);
  if (SIGHT.post && QW.mode === "sight") { renderer.setRenderTarget(SIGHT.post.rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(SIGHT.post.ps, SIGHT.post.cam); renderBody(); }
  else renderer.render(scene, camera);
  if (QW.mode === "sky" || QW.mode === "descend" || QW.mode === "walk" || QW.mode === "fly") renderer.toneMappingExposure += ((QW.mode === "sky" ? .55 : 1) - renderer.toneMappingExposure) * Math.min(1, dt * 3);   // 3D 地図は暗めに（白すぎないように）
  fpsAcc += dt; fpsN++; prT += dt;
  if (prT > 1.5) { const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0; prT = 0; const lim = MOBILE ? 1 / 32 : 1 / 52;
    if (avg > lim && pr > .9) { pr = Math.max(.9, pr - .15); renderer.setPixelRatio(pr); resize(); resizePost(); }
    else if (avg < lim * .62 && pr < PR_MAX) { pr = Math.min(PR_MAX, pr + .1); renderer.setPixelRatio(pr); resize(); resizePost(); } }
  QW.fps = 1 / dt;
}
addEventListener("resize", resizePost);
addEventListener("resize", () => { for (const k in SHO.live) SHO.live[k]?.sho.setScale(innerHeight * renderer.getPixelRatio() * .9); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { renderer.setAnimationLoop(null); try { audio.pause(); } catch { } } else { clock.getDelta(); renderer.setAnimationLoop(frame); } });

(async () => {
  try {
    await buildBase();
    buildObjs(); fillMenu(); buildTray(); buildStarts(); syncTalkBtn();
    $("#starts").addEventListener("scroll", syncStMeter, { passive: true }); addEventListener("resize", syncStMeter);
    setMode("sky"); selectStart(START.sel); requestAnimationFrame(syncStMeter); SKY.dist = SKY.tDist = MOBILE ? 1500 : 1150; SKY.c.set(-30, 20, 420); skyCam(); showSkyUI();
    renderer.setAnimationLoop(frame);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    document.body.classList.add("ready"); QW.ready = true; QW.tReady = performance.now() - T0;
    setTimeout(() => { buildBuildings().catch(e => console.warn("bld", e)); buildKura(); }, 60);
    setTimeout(loadKasane, 3000);
    setTimeout(() => { loadAoi(); fetch("web/app/lip.json?v=" + VER).then(r => r.json()).then(j => { LIP = j; }).catch(() => { }); }, 500);
    const s0 = Q.get("start"); if (s0 != null && C.starts[+s0]) { selectStart(+s0); descendTo(+s0); }
  } catch (e) { console.error(e); status("読み込めませんでした。ページを開きなおしてください。"); }
})();
