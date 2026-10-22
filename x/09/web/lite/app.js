/* Qualia/walk 氷川 ── 軽い版（2026-10-20）／層を重ねる版（2026-10-22）
   3D 地図（上空）から始める場所を選ぶ → 降りて歩く（見回しながら）／鳥になって飛ぶ／生きもの（Qualia/sight）になる。
   Qualia Layer：記録の 9 層と、Qualia/sight・Qualia/sound の層を重ねると、その層の物（3D）が地図の座標に固定されて重なる（Qualium の構想）。
   碧は、いまいる所に結びついた記録を話しつづける（出典は字幕から開く）。層は、見る人が選んだときだけ変わる。
   座標：x＝東 m・y＝標高 m・z＝南 m（原点 経度 139.631・緯度 35.90725）。 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { QLAYERS, makeMarker, makeLabel, glowTex } from "./layers.js?v=2";

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 820;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const T0 = performance.now();
const QW = window.__qw = { ready: false, mode: "boot", renderer: null };
const BASE = "web/lite/", VER = "20261022n";   // データの版の印（公開直後に古いデータが出ないように）
const status = t => { const e = $("#bootStatus"); if (e) e.textContent = t; };

/* ---------- 描画 ---------- */
const canvas = $("#gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance", alpha: false, stencil: true });   // 道の上に地形が出ないよう、道の画素に印を付ける（下の ROAD_STENCIL）
QW.renderer = renderer;
const PR_MAX = MOBILE ? Math.min(devicePixelRatio, 1.6) : Math.min(devicePixelRatio, 1.5);
let pr = PR_MAX; renderer.setPixelRatio(pr);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(MOBILE ? 62 : 55, innerWidth / innerHeight, .08, 6000);
scene.add(camera);
const FOG_SKY = new THREE.Color("#b9c8d6"), NAVY = new THREE.Color("#03060f");
scene.fog = new THREE.Fog(FOG_SKY, 900, 3600);
scene.background = FOG_SKY.clone();
const hemi = new THREE.HemisphereLight("#d6e6ff", "#4d4636", 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight("#fff1dc", 2.3); sun.position.set(320, 520, 260); scene.add(sun); scene.add(sun.target);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

/* ---------- データ ---------- */
let D = null, DEM = null;
const groundY = (x, z) => {
  if (!DEM) return 13;
  const g = D.dem, c = Math.min(Math.max((x - g.x0) / g.cell, 0), g.nx - 1.001), r = Math.min(Math.max((z - g.z0) / g.cell, 0), g.nz - 1.001);
  const c0 = c | 0, r0 = r | 0, fc = c - c0, fr = r - r0, n = g.nx, h = i => DEM[i] / 100;
  return (h(r0 * n + c0) * (1 - fc) + h(r0 * n + c0 + 1) * fc) * (1 - fr) + (h((r0 + 1) * n + c0) * (1 - fc) + h((r0 + 1) * n + c0 + 1) * fc) * fr;
};
// 中心線：道のり d → 位置と向き、位置 → いちばん近い d と横のずれ s
function atD(d) {
  const L = D.cl; let lo = 0, hi = L.length - 1; d = Math.min(Math.max(d, L[0][3]), L[hi][3]);
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m][3] <= d) lo = m; else hi = m; }
  const a = L[lo], b = L[hi], t = (d - a[3]) / ((b[3] - a[3]) || 1), tx = b[0] - a[0], tz = b[2] - a[2], l = Math.hypot(tx, tz) || 1;
  return { x: a[0] + tx * t, y: a[1] + (b[1] - a[1]) * t, z: a[2] + tz * t, tx: tx / l, tz: tz / l };
}
function nearestOnLine(x, z) {
  const L = D.cl; let best = 1e18, bi = 0;
  for (let i = 0; i < L.length; i += 4) { const e = (L[i][0] - x) ** 2 + (L[i][2] - z) ** 2; if (e < best) { best = e; bi = i; } }
  let bd = L[bi][3], bs = 1e18;
  for (let i = Math.max(0, bi - 6); i < Math.min(L.length - 1, bi + 6); i++) {
    const a = L[i], b = L[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], l2 = dx * dx + dz * dz || 1, t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[2]) * dz) / l2));
    const ex = a[0] + dx * t - x, ez = a[2] + dz * t - z, e = ex * ex + ez * ez; if (e < bs) { bs = e; bd = a[3] + (b[3] - a[3]) * t; }
  }
  return { d: bd, dist: Math.sqrt(bs) };
}

/* ---------- 読み込み ---------- */
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const TL = new THREE.TextureLoader();
const tex = (u, srgb = true, rep = true) => { const t = TL.load(u); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MOBILE ? 2 : 4; return t; };
const glb = u => new Promise((res, rej) => loader.load(u, res, undefined, rej));
const texP = (u, srgb = true) => new Promise((res, rej) => TL.load(u, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));

const pData = fetch(BASE + "data.json?v=" + VER).then(r => r.json());
const pDem = fetch(BASE + "dem.bin").then(r => r.arrayBuffer());
const pTerrain = glb("web/lite/terrain.glb");
const pPhoto = texP(BASE + "tex/" + (MOBILE ? "photo_1k.webp" : "photo_2k.webp"));
const pSky = texP(BASE + "tex/sky.webp");
const pBld = glb(BASE + "buildings.glb");

const world = new THREE.Group(); scene.add(world); QW.scene = scene; QW.world = world; QW.TREE = null;
let terrainMesh = null, roadGroup = null, structGroup = null;
const pickables = [];   // 地面を押して歩くときに当たる面

async function buildBase() {
  status("参道の地形を読み込んでいます");
  const [data, dem, tg, photo, sky] = await Promise.all([pData, pDem, pTerrain, pPhoto, pSky]);
  D = data; DEM = new Int16Array(dem);
  sky.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = sky; QW.skyTex = sky;
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(sky).texture; pm.dispose();
  scene.environment = env; QW.env = env;
  photo.anisotropy = MOBILE ? 4 : 8; photo.flipY = false; photo.needsUpdate = true;
  const grass = tex(BASE + "tex/grass5.webp");
  terrainMesh = tg.scene.getObjectByProperty("isMesh", true); if (!terrainMesh.geometry.attributes.normal) terrainMesh.geometry.computeVertexNormals();
  const tm = new THREE.MeshStandardMaterial({ map: photo, roughness: 1, metalness: 0, envMapIntensity: .35 });
  tm.onBeforeCompile = sh => {   // 近くだけ、草と土の細かい絵を重ねる（遠くは写真のまま）
    sh.uniforms.detail = { value: grass };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D detail; varying vec3 vWp;")
      .replace("#include <map_fragment>", "#include <map_fragment>\n{ float dist=length(vWp-cameraPosition); float k=1.-smoothstep(25.,140.,dist); vec3 dt=texture2D(detail,vWp.xz*.33).rgb; float l=dot(dt,vec3(.333)); diffuseColor.rgb*=mix(1.,.55+l*1.1,k*.85); float l0=dot(diffuseColor.rgb,vec3(.333)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(l0),.45)*vec3(.86,.83,.76); float lu=dot(diffuseColor.rgb,vec3(.333)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.37,.36,.34)*(.8+lu*.25),smoothstep(.28,.52,lu)*.92); }");
  };
  tm.customProgramCacheKey = () => "terrainDetail";
  // 軽くした地形は参道の路面より数十 cm 高い所があり、降りた所の路面にふちの鋭い黒い形として出ていた。道を先に描いて印を付け、印のある画素には地形を描かない
  tm.stencilWrite = true; tm.stencilRef = 1; tm.stencilFunc = THREE.NotEqualStencilFunc; tm.stencilFail = tm.stencilZFail = tm.stencilZPass = THREE.KeepStencilOp;
  terrainMesh.material = tm;
  world.add(tg.scene); pickables.push(terrainMesh);
  buildPath(); buildPonds(env); buildSkirt(); buildStarts();
  // 木と建物（並行して届いたものから）
  buildCrowns();
  pBld.then(buildBuildings).catch(e => console.warn("buildings", e));
}

/* 地形の外：同じ色の地面を遠くまで続け、霞に溶かす（3D 地図や飛ぶときに、地形の板の縁と黒い空が見えないように） */
function buildSkirt() {
  const [x0, x1, z0, z1] = D.extent, R = 26000, sh = new THREE.Shape([new THREE.Vector2(-R, -R), new THREE.Vector2(R, -R), new THREE.Vector2(R, R), new THREE.Vector2(-R, R)]);
  sh.holes.push(new THREE.Path([new THREE.Vector2(x0 + 2, -z0 - 2), new THREE.Vector2(x0 + 2, -z1 + 2), new THREE.Vector2(x1 - 2, -z1 + 2), new THREE.Vector2(x1 - 2, -z0 - 2)]));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "#8d8a83", roughness: 1, metalness: 0, envMapIntensity: .3 }));
  m.position.y = 9.2; m.renderOrder = -2; world.add(m); QW.skirt = m;
}
/* 参道の線（上空からの地図で、歩ける道を示す） */
let pathLine = null;
function buildPath() {
  const pts = D.cl.map(p => new THREE.Vector3(p[0], groundY(p[0], p[2]) + 1.2, p[2]));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  pathLine = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#9bdcf0", transparent: true, opacity: .9, depthTest: false, fog: false }));
  pathLine.renderOrder = 5; world.add(pathLine);
}
function buildPonds(env) {
  const m = new THREE.MeshStandardMaterial({ color: "#2a3c40", roughness: .06, metalness: .0, envMap: env, envMapIntensity: 1.2 });
  for (const p of D.ponds) {
    const s = new THREE.Shape(p.poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
    let y = 1e9; for (const [x, z] of p.poly) y = Math.min(y, groundY(x, z));
    const mesh = new THREE.Mesh(g, m); mesh.position.y = y + .12; world.add(mesh);
    // 池の縁：自然の石を積んだ護岸とみられる（写真から）→ 石積みの質感の低い壁を、池の形にそって
    const P = [], U = [], I = []; let acc = 0;
    for (let i = 0; i < p.poly.length; i++) { const [x0, z0] = p.poly[i], [x1, z1] = p.poly[(i + 1) % p.poly.length], L = Math.hypot(x1 - x0, z1 - z0), b = P.length / 3;
      P.push(x0, y - .7, z0, x1, y - .7, z1, x1, y + .3, z1, x0, y + .3, z0); U.push(acc / 1.6, 0, (acc + L) / 1.6, 0, (acc + L) / 1.6, .72, acc / 1.6, .72); I.push(b, b + 1, b + 2, b, b + 2, b + 3); acc += L; }
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); rg.setIndex(I); rg.computeVertexNormals();
    world.add(new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/japanese_stone_wall_c5.webp"), normalMap: MOBILE ? null : tex(BASE + "tex/japanese_stone_wall_n5.webp", false), color: "#b8b2a6", roughness: .95, side: THREE.DoubleSide, envMapIntensity: .4 })));
    const bot = new THREE.Mesh(g.clone(), new THREE.MeshStandardMaterial({ color: "#2b3326", roughness: 1 })); bot.position.y = y - .75; world.add(bot);   // 池の底（もぐったときに見える）
  }
}

/* 建物：区画ごと（見えない区画は描かない） */
let bldGroup = null; const BLD = [], ROOF = { x0: -680, z0: -1360, cell: 20, nx: 68, nz: 136, h: new Float32Array(68 * 136) };
function roofAt(x, z, r = 1) {   // まわり r 区画の、いちばん高い屋根
  const R = ROOF, c0 = Math.floor((x - R.x0) / R.cell), r0 = Math.floor((z - R.z0) / R.cell); let m = 0;
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const c = c0 + i, rr = r0 + j; if (c >= 0 && rr >= 0 && c < R.nx && rr < R.nz) m = Math.max(m, R.h[rr * R.nx + c]); }
  return m;
}
function buildBuildings(g) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, color: "#a7a196", roughness: .92, metalness: 0, flatShading: true, envMapIntensity: .35 });
  const wallTex = tex(BASE + "tex/concrete_pavement_c5.webp");
  m.onBeforeCompile = sh => {   // 壁に階と窓の並び（模式）、屋根は少し暗く。PLATEAU の形と高さはそのまま
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.uniforms.wallTex = { value: wallTex };
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; uniform sampler2D wallTex;")
      .replace("#include <color_fragment>", `#include <color_fragment>
      { vec3 fn = normalize(cross(dFdx(vWp), dFdy(vWp))); float dist = length(vWp - cameraPosition);
        // 壁と屋根の肌（コンクリートの写真・CC0）を近くだけ重ね、足もとを暗く（地面との接し方）、遠くは空の色へ溶かす（大気の遠近）
        vec2 tuv = abs(fn.y) > .6 ? vWp.xz * .12 : vec2(dot(vWp.xz, vec2(-fn.z, fn.x)), vWp.y) * .12; float tl = dot(texture2D(wallTex, tuv).rgb, vec3(.333));
        float kn = 1. - smoothstep(40., 160., dist); diffuseColor.rgb *= mix(1., .7 + tl * .75, kn * .85);
        diffuseColor.rgb *= .78 + .22 * smoothstep(13., 17.5, vWp.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.70,.74,.78), smoothstep(120., 520., dist) * .45);
        if (abs(fn.y) > .6) { diffuseColor.rgb *= vec3(.74,.73,.71); }
        else { float u = dot(vWp.xz, vec2(-fn.z, fn.x)); float fy = (vWp.y - 13.2) / 3.15;
          float k = 1. - smoothstep(70., 230., dist);
          vec2 c = vec2(fract(u / 2.8), fract(fy)); vec2 w = fwidth(vec2(u / 2.8, fy)) * 1.5;
          float win = smoothstep(.22 - w.x, .22 + w.x, c.x) * (1. - smoothstep(.78 - w.x, .78 + w.x, c.x)) * smoothstep(.34 - w.y, .34 + w.y, c.y) * (1. - smoothstep(.82 - w.y, .82 + w.y, c.y)) * step(1., fy);
          float shop = (1. - step(1., fy)) * step(.1, fy);
          float r = fract(sin(floor(u / 2.8) * 12.9 + floor(fy) * 78.2) * 437.5);
          vec3 glass = mix(vec3(.2,.23,.26), vec3(.34,.39,.44), r * .5);
          diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * k * .7);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .55, shop * k * .8);
          diffuseColor.rgb *= mix(1., .95 + .05 * smoothstep(.0, .06, c.y), k); } }`);
  };
  m.customProgramCacheKey = () => "facade2";
  g.scene.updateMatrixWorld(true);
  g.scene.traverse(o => { if (o.isMesh) { o.material = m; o.geometry.computeBoundingSphere(); o.userData.ws = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); } });
  bldGroup = g.scene; world.add(bldGroup); BLD.length = 0; bldGroup.traverse(o => { if (o.isMesh) BLD.push(o); });
  // 屋根の高さの粗い地図（20 m 四方ごとの最も高い所）。飛ぶとき、建物にもぐらないように
  const v = new THREE.Vector3(), R = ROOF;
  for (const b of BLD) { const P = b.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(b.matrixWorld);
    const c = Math.floor((v.x - R.x0) / R.cell), r = Math.floor((v.z - R.z0) / R.cell); if (c >= 0 && r >= 0 && c < R.nx && r < R.nz) { const k = r * R.nx + c; if (v.y > R.h[k]) R.h[k] = v.y; } } }
}

/* 木：近くは樹種の形、遠くは軽い樹冠。一本ずつの位置と樹種ではない模式（並木の数と樹種の割合は樹木調査にならう） */
const TREE = window.__TREE = { protos: {}, near: {}, crown: null, trunk: null, list: [], lastPos: new THREE.Vector3(1e9, 0, 0), lastMode: "" };
const SPH = { keyaki: 19, enoki: 15, shii: 13, kashi: 12, kusu: 17, sugi: 22, sakura: 9, hinoki: 16 };
const SPC = { keyaki: "#56683a", enoki: "#526638", shii: "#3b4f2d", kashi: "#3a4c2e", kusu: "#4a5f33", sugi: "#34452b", sakura: "#5a6a3c", hinoki: "#36482b" };
function toFloat(src) {   // 量子化された頂点（Int16 など）を、変換できる Float32 に
  const g = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(src.attributes)) { const n = a.count, s = a.itemSize, f = new Float32Array(n * s);
    for (let i = 0; i < n; i++) for (let j = 0; j < s; j++) f[i * s + j] = a.getComponent(i, j);
    g.setAttribute(k, new THREE.BufferAttribute(f, s)); }
  if (src.index) g.setIndex(src.index.clone());
  return g;
}
function thinLeaves(geo, every = 3, grow = 1.5) {   // 葉の札を 3 枚に 1 枚へ減らし、残した札を少し大きく（中くらいの距離の形）
  const idx = geo.index ? geo.index.array : null; if (!idx) return geo;
  const P = geo.attributes.position, keep = [], nT = idx.length / 3;
  for (let t = 0; t + 1 < nT; t += 2) if (((t / 2) | 0) % every === 0) keep.push(t);
  const map = new Map(), outIdx = [], attrs = Object.fromEntries(Object.entries(geo.attributes).map(([k, a]) => [k, { a, v: [] }]));
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (const t of keep) {
    const vs = new Set([idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2], idx[t * 3 + 3], idx[t * 3 + 4], idx[t * 3 + 5]]); c.set(0, 0, 0);
    for (const i of vs) c.add(v.fromBufferAttribute(P, i)); c.divideScalar(vs.size);
    for (let j = 0; j < 6; j++) { const i = idx[t * 3 + j]; let n = map.get(i);
      if (n === undefined) { n = map.size; map.set(i, n);
        for (const [k, o] of Object.entries(attrs)) { if (k === "position") { v.fromBufferAttribute(P, i).sub(c).multiplyScalar(grow).add(c); o.v.push(v.x, v.y, v.z); } else for (let q = 0; q < o.a.itemSize; q++) o.v.push(o.a.getComponent(i, q)); } }
      outIdx.push(n); }
  }
  const g = new THREE.BufferGeometry(); for (const [k, o] of Object.entries(attrs)) g.setAttribute(k, new THREE.Float32BufferAttribute(o.v, o.a.itemSize)); g.setIndex(outIdx); return g;
}
function buildTrees([g, kg]) {
  const get = n => (n.startsWith("keyaki_") && kg ? kg.scene.getObjectByName(n === "keyaki_s8_far_bark" ? "keyaki_bark" : n === "keyaki_s8_near_leaves" ? "keyaki_leaves" : n) : null) || g.scene.getObjectByName(n);
  if (!TREE.crown) buildCrowns();
  const pairs = { keyaki: "keyaki_s8_far", enoki: "enoki_far", shii: "shii_far", kashi: "kashi_far", kusu: "kusu_far", sugi: "sugi_far", sakura: "sakura_far", hinoki: "hinoki_far" };
  const count = {}; for (const t of D.trees) count[t[3]] = (count[t[3]] || 0) + 1;
  for (const [sp, base] of Object.entries(pairs)) {
    const bark = get(base + "_bark"), leaves = get(base.replace("_far", "_near") + "_leaves") || get(base + "_leaves"); if (!bark || !leaves) continue;
    const box = new THREE.Box3().setFromObject(leaves).union(new THREE.Box3().setFromObject(bark));
    const h = box.max.y - box.min.y, k = SPH[sp] / h;
    const parts = [];
    for (const o of [bark, leaves]) {
      o.updateWorldMatrix(true, false); const geo = toFloat(o.geometry).applyMatrix4(o.matrixWorld); geo.translate(0, -box.min.y, 0); geo.scale(k, k, k);
      const mat = o.material; if (mat.map) mat.map.anisotropy = 2; mat.envMapIntensity = .45;
      if (o === leaves) { mat.alphaTest = Math.max(mat.alphaTest || 0, .45); mat.transparent = false; mat.side = THREE.DoubleSide; }
      const g2 = o === leaves && MOBILE && sp === "keyaki" ? thinLeaves(geo, 2, 1.3) : geo;   // スマホの近くのケヤキは、葉の札を半分に
      const im = new THREE.InstancedMesh(g2, mat, count[sp] || 1); im.count = 0; im.frustumCulled = false; world.add(im); parts.push(im);
    }
    // 中くらいの距離：幹は遠景の形、葉は札を減らした形
    const fb = g.scene.getObjectByName(base + "_bark") || bark; fb.updateWorldMatrix(true, false);
    const bgeo = toFloat(fb.geometry).applyMatrix4(fb.matrixWorld); bgeo.translate(0, -box.min.y, 0); bgeo.scale(k, k, k);
    const lgeo = thinLeaves(parts[1].geometry, MOBILE ? 5 : 4, MOBILE ? 1.85 : 1.7);
    const lm2 = parts[1].material.clone(); lm2.side = THREE.DoubleSide;
    const mid = [new THREE.InstancedMesh(bgeo, fb.material, count[sp] || 1), new THREE.InstancedMesh(lgeo, lm2, count[sp] || 1)];
    for (const im of mid) { im.count = 0; im.frustumCulled = false; world.add(im); }
    const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * k;
    TREE.protos[sp] = { parts, mid, w, h: SPH[sp] };
  }
  try { buildImpostors(); } catch (e) { console.warn("impostor", e); }
  { const lm = TREE.protos.keyaki?.parts[1]?.material; if (lm?.map && TREE.leafU) { lm.map.wrapS = lm.map.wrapT = THREE.RepeatWrapping; lm.map.needsUpdate = true; TREE.leafU.value = lm.map; } }
  TREE.lastPos.set(1e9, 0, 0); updateTrees(true);
}
/* 遠くの木：中くらいの形を一度だけ横から写した絵を、十字に組んだ 2 枚の板に貼る（1 本 4 三角形）。歩くときの遠景だけに使う */
function buildImpostors() {
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight("#d6e6ff", "#4d4636", 1.15)); const dl = new THREE.DirectionalLight("#fff1dc", 2.3); dl.position.set(.6, 1, .8); sc.add(dl);
  const old = renderer.getRenderTarget(), oc = new THREE.Color(), oa = renderer.getClearAlpha(); renderer.getClearColor(oc);
  const count = {}; for (const t of D.trees) count[t[3]] = (count[t[3]] || 0) + 1;
  for (const [sp, P] of Object.entries(TREE.protos)) {
    const W = P.w * 1.04, H = P.h * 1.04, R = 256, rt = new THREE.WebGLRenderTarget(R, Math.round(R * H / W), { samples: 0 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
    const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H, 0, -100, 100); cam.position.set(0, 0, 50); cam.lookAt(0, 0, 0);
    const g = new THREE.Group(); for (const im of P.mid) g.add(new THREE.Mesh(im.geometry, im.material)); sc.add(g);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam); sc.remove(g);
    const geo = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
    for (let k = 0; k < 2; k++) { const a = k * Math.PI / 2, cx = Math.cos(a) * W / 2, cz = Math.sin(a) * W / 2, b = pos.length / 3;
      pos.push(-cx, 0, -cz, cx, 0, cz, cx, H, cz, -cx, H, -cz); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ map: rt.texture, alphaTest: .45, side: THREE.DoubleSide, color: "#e2e6e0" });
    const im = new THREE.InstancedMesh(geo, mat, count[sp] || 1); im.count = 0; im.frustumCulled = false; world.add(im); P.imp = im;
  }
  renderer.setRenderTarget(old); renderer.setClearColor(oc, oa);
}
function buildCrowns() {
  // 軽い樹冠（20 面体を少しつぶして、葉の量を感じる程度に）と幹
  const cg = new THREE.IcosahedronGeometry(1, 2); const pa = cg.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), n = Math.sin(x * 6.1 + y * 2.3) * Math.cos(z * 5.3 - y * 1.7) * .1 + Math.sin(x * 13.7 + z * 11.1) * .04; pa.setXYZ(i, x * (1 + n), y * (.8 + n) - (y < -.4 ? (y + .4) * .45 : 0), z * (1 + n)); }
  cg.computeVertexNormals();
  const cm = new THREE.MeshStandardMaterial({ roughness: .96, metalness: 0, envMapIntensity: .35 });
  const leafU = { value: new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1) }; leafU.value.needsUpdate = true; TREE.leafU = leafU;
  cm.onBeforeCompile = sh => {   // 葉のかたまりの濃淡（下ほど暗く、ところどころ影）。葉の絵が届いたら、その明暗を三方向から重ねる
    sh.uniforms.leafMap = leafU;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; varying float vLy;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz; vLy=position.y;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; varying float vLy; uniform sampler2D leafMap; float hh(vec3 p){return fract(sin(dot(p,vec3(12.99,78.23,37.71)))*43758.5);} float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hh(i),hh(i+vec3(1,0,0)),f.x),mix(hh(i+vec3(0,1,0)),hh(i+vec3(1,1,0)),f.x),f.y),mix(mix(hh(i+vec3(0,0,1)),hh(i+vec3(1,0,1)),f.x),mix(hh(i+vec3(0,1,1)),hh(i+vec3(1,1,1)),f.x),f.y),f.z);}")
      .replace("#include <color_fragment>", "#include <color_fragment>\n{ float n = vn(vWp*.9)*.6 + vn(vWp*2.7)*.4; vec3 an = abs(normalize(cross(dFdx(vWp), dFdy(vWp)))); an /= (an.x+an.y+an.z); vec4 lx = texture2D(leafMap, vWp.zy*.45), ly = texture2D(leafMap, vWp.xz*.45), lz = texture2D(leafMap, vWp.xy*.45); vec4 lf = lx*an.x + ly*an.y + lz*an.z; float lv = mix(.35, 1.25, lf.a * dot(lf.rgb, vec3(.6))); diffuseColor.rgb *= (.66 + .45*n) * lv * (.72 + .28*smoothstep(-.9,.8,vLy)); }");
  };
  cm.customProgramCacheKey = () => "crown2";
  TREE.crown = new THREE.InstancedMesh(cg, cm, D.trees.length);
  TREE.crown.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(D.trees.length * 3), 3);
  const tgeo = new THREE.CylinderGeometry(.12, .2, 1, 5, 1, true); tgeo.translate(0, .5, 0);
  TREE.trunk = new THREE.InstancedMesh(tgeo, new THREE.MeshStandardMaterial({ color: "#4a3f35", roughness: 1 }), D.trees.length);
  for (const im of [TREE.crown, TREE.trunk]) { im.count = 0; im.frustumCulled = false; world.add(im); }
  TREE.list = D.trees.map(t => ({ x: t[0], y: groundY(t[0], t[2]), z: t[2], sp: t[3], s: t[4], r: t[5] }));
  { const L = TREE.list; for (const t of L) t.lone = !L.some(u => u !== t && (u.x - t.x) ** 2 + (u.z - t.z) ** 2 < 144); }   // 12 m 以内にほかの木がない
  TREE.lastPos.set(1e9, 0, 0); updateTrees(true);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _up = new THREE.Vector3(0, 1, 0);
function updateTrees(force = false) {
  if (!TREE.crown) return;
  const cp = camera.position, alt = cp.y - groundY(cp.x, cp.z), mode = QW.mode === "descend" || QW.mode === "boot" || QW.mode === "sight" ? (alt < 30 ? "walk" : alt < 260 ? "fly" : "sky") : QW.mode;   // 生きものの身体は、高さで木の細かさを選ぶ
  if (!force && TREE.lastMode === mode && TREE.lastPos.distanceToSquared(cp) < (mode === "walk" ? 16 : 400)) return;
  TREE.lastPos.copy(cp); TREE.lastMode = mode;
  const nearR = mode === "walk" ? (MOBILE ? 32 : 40) : 0;   // 飛ぶときも、遠くの木は横から写した絵（丸い塊にしない）
  const farR = mode === "walk" ? (MOBILE ? 300 : 400) : 1e9;
  const midR = mode === "walk" ? (MOBILE ? 85 : 120) : mode === "fly" ? (MOBILE ? 70 : 140) : 0;
  const nr2 = nearR * nearR, fr2 = farR * farR, mr2 = midR * midR;
  for (const p of Object.values(TREE.protos)) [...p.parts, ...p.mid, ...(p.imp ? [p.imp] : [])].forEach(im => im.count = 0);
  let nc = 0; const useImp = mode === "walk" || mode === "fly";
  for (const t of TREE.list) {
    const d2 = (t.x - cp.x) ** 2 + (t.z - cp.z) ** 2;
    if (d2 > fr2) continue;
    const P = TREE.protos[t.sp];
    if (d2 < nr2 && P) {
      _q.setFromAxisAngle(_up, t.r); _m.compose(_p.set(t.x, t.y - .15, t.z), _q, _s.setScalar(t.s));
      for (const im of P.parts) im.setMatrixAt(im.count++, _m);
    } else if ((d2 < mr2 || (t.lone && mode === "fly" && d2 < 62500)) && P) {   // 一本だけ立つ木（10 本ほど）は、飛ぶときも 250 m までは中くらいの形、その先は横から写した絵で（丸い樹冠だと粗く見える）
      _q.setFromAxisAngle(_up, t.r); _m.compose(_p.set(t.x, t.y - .15, t.z), _q, _s.setScalar(t.s));
      for (const im of P.mid) im.setMatrixAt(im.count++, _m);
    } else if ((useImp || (t.lone && mode === "fly")) && P?.imp) {   // 真上から見る上空では板が細く暗く写るので、丸い樹冠のまま
      _q.setFromAxisAngle(_up, t.r); _m.compose(_p.set(t.x, t.y - .15, t.z), _q, _s.setScalar(t.s)); P.imp.setMatrixAt(P.imp.count++, _m);
    } else {
      const h = (SPH[t.sp] || 14) * t.s, w = (P ? P.w : h * .7) * .5 * t.s;
      _m.compose(_p.set(t.x, t.y + h * .6, t.z), _q.setFromAxisAngle(_up, t.r), _s.set(w, h * .42, w)); TREE.crown.setMatrixAt(nc, _m);
      TREE.crown.instanceColor.setXYZ(nc, ...(_c.set(SPC[t.sp] || "#4d6a34").toArray()));
      _m.compose(_p.set(t.x, t.y, t.z), _q, _s.set(t.s, h * .45, t.s)); TREE.trunk.setMatrixAt(nc, _m); nc++;
    }
  }
  TREE.crown.count = TREE.trunk.count = nc;
  TREE.crown.instanceMatrix.needsUpdate = TREE.trunk.instanceMatrix.needsUpdate = TREE.crown.instanceColor.needsUpdate = true;
  for (const p of Object.values(TREE.protos)) [...p.parts, ...p.mid, ...(p.imp ? [p.imp] : [])].forEach(im => { im.instanceMatrix.needsUpdate = true; });
}

/* 道（舗装の材ごと）と構造物は、歩きはじめる前に後から読む */
const ROAD_MATS = { asphalt_dark: ["Asphalt023S", [1, 1, 1], 1, .8], asphalt_light: ["asphalt_04", [1, 1, 1], 1, .8], sidewalk: ["concrete_pavers_02", [1, 1, 1], 1, 1], granite_light: ["concrete_pavement", [1, 1, 1], .9, 1],
  granite_plaza: ["granite_tile_04", [1, 1, 1], 1, 1], granite_black: ["granite_tile", [1, 1, 1], .85, .7], washed: ["gravel_embedded_concrete", [1, 1, 1], 1, 1], granite_band: ["PavingStones133", [1, 1, 1], .95, 1],
  stone: ["japanese_stone_wall", [1, 1, 1], 1, 1], sand: ["gravelly_sand", [1, 1, 1], 1, .9], roots: ["roots", [1, 1, 1], 1, 1.2], bed: ["Ground047", [1, 1, 1], 1, 1], lawn: ["Ground047", [.78, 1.05, .62], 1, 1],
  gravel: ["Gravel023", [.8, .79, .76], 1, 1.2], concrete: ["asphalt_04", [1.25, 1.25, 1.22], .9, .5], paint: ["Asphalt023S", [2.3, 2.3, 2.25], .6, .4] };
let lateP = null; const STONES = [];
function loadLate() {
  if (lateP) return lateP;
  const road = glb("web/road.glb").then(g => {
    const mats = {};
    for (const [k, [t, c, r, n]] of Object.entries(ROAD_MATS)) mats[k] = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/" + t + "_c5.webp"), normalMap: MOBILE ? null : tex(BASE + "tex/" + t + "_n5.webp", false), normalScale: new THREE.Vector2(n, -n), color: new THREE.Color(...c), roughness: r, metalness: 0, envMapIntensity: .5 });
    for (const m of Object.values(mats)) { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp; }   // ROAD_STENCIL
    g.scene.traverse(o => { if (o.isMesh) { const k = o.name.split("|")[0]; if (mats[k]) o.material = mats[k]; o.renderOrder = -1; o.userData.stone = k === "stone"; pickables.push(o); } });
    roadGroup = g.scene; world.add(roadGroup); roadGroup.updateMatrixWorld(true);
    roadGroup.traverse(o => { if (o.isMesh && o.userData.stone) { o.geometry.computeBoundingSphere(); o.userData.ws = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); STONES.push(o); } });
  });
  const st = glb(BASE + "structures.glb").then(g => {
    structGroup = new THREE.Group(); world.add(structGroup);
    for (const s of D.structs) {
      const src = g.scene.getObjectByName(s.m); if (!src) continue;
      const o = src.clone(true); o.position.set(s.p[0], s.p[1], s.p[2]); o.rotation.set(0, s.r, 0); o.scale.setScalar(1);
      o.traverse(n => { if (n.isMesh && n.material) { n.material.envMapIntensity = .6;
        if (n.material.name === "black") { n.material = n.material.clone(); n.material.color.set("#1c1a19"); n.material.roughness = .38; n.material.metalness = .05; n.material.envMapIntensity = 1.25; }   // 根巻と笠木の黒：漆のような艶（平らな黒い箱に見えないように）
        if (n.material.name === "granite") { n.material = n.material.clone(); n.material.roughness = .82; n.material.envMapIntensity = .8; } } });
      o.name = s.id; structGroup.add(o);
      if (QW.mode === "sky" && /^torii_|^romon$|^shinkyo$/.test(s.id)) o.visible = false;
    }
    try { buildBigStructs(g.scene); } catch (e) { console.warn("bigstructs", e); }
  });
  const tr = Promise.all([glb(BASE + "trees.glb"), glb(BASE + "keyaki.glb").catch(() => null)]).then(buildTrees);
  lateP = Promise.allSettled([road, st, tr]).then(r => { try { renderer.compileAsync(scene, camera).catch(() => { }); } catch { } return r; });   // 降りる前に、道・木・構造物の描き方を用意しておく（初めて見えたときに止まらない）
  return lateP;
}


/* ---------- 3D 地図（上空）：始める場所・道と地名・等高線・鳥居の 3D・いまの地点 ---------- */
const START = { pins: [], sel: -1, labels: [] };
const MAP = { group: null, labels: [], big: [], here: null, data: null };
function buildStarts() {
  const g = new THREE.Group(); world.add(g); START.group = g;
  const colG = new THREE.CylinderGeometry(.6, .6, 1, 8, 1, true); colG.translate(0, .5, 0);
  const ringG = new THREE.RingGeometry(9, 10.5, 48); ringG.rotateX(-Math.PI / 2);
  D.starts.forEach((s, i) => {
    const y = groundY(s.x, s.z);
    const m = new THREE.MeshBasicMaterial({ color: "#9bdcf0", transparent: true, opacity: .55, depthWrite: false, fog: false });
    const col = new THREE.Mesh(colG, m); col.position.set(s.x, y, s.z); col.scale.y = 46;
    const ring = new THREE.Mesh(ringG, m.clone()); ring.position.set(s.x, y + .8, s.z); ring.material.opacity = .8;
    const head = new THREE.Mesh(new THREE.OctahedronGeometry(3.2), new THREE.MeshBasicMaterial({ color: "#e8fbff", fog: false }));
    head.position.set(s.x, y + 50, s.z); head.scale.y = 1.5;
    g.add(col, ring, head); START.pins.push({ s, col, ring, head, y });
  });
  const box = $("#starts"); box.innerHTML = "";
  D.starts.forEach((s, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "stBtn"; b.dataset.i = i;
    b.innerHTML = `<span class="no">${String(i + 1).padStart(2, "0")}</span><span class="nm">${s.name}</span>`;
    b.addEventListener("click", () => selectStart(i)); box.appendChild(b);
    const lb = document.createElement("div"); lb.className = "pinLabel"; lb.textContent = s.short; lb.dataset.i = i; $("#pinLabels").appendChild(lb); START.labels.push(lb);
    lb.addEventListener("click", () => selectStart(i));
  });
}
function selectStart(i) {
  START.sel = i;
  START.pins.forEach((p, k) => { const on = k === i; p.col.material.opacity = on ? .95 : .4; p.ring.scale.setScalar(on ? 1.6 : 1); p.head.material.color.set(on ? "#ffffff" : "#bfe9f5"); });
  document.querySelectorAll(".stBtn").forEach((b, k) => b.setAttribute("aria-pressed", k === i ? "true" : "false"));
  START.labels.forEach((l, k) => l.classList.toggle("on", k === i));
  $("#goDown").disabled = false; $("#goDown").setAttribute("aria-label", D.starts[i].name + "から歩く");
  $("#starts").querySelectorAll(".stBtn")[i]?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
/* 地図の線と名前（map.json は上空にいるあいだに後から読む） */
function buildMap(M) {
  MAP.data = M; const g = new THREE.Group(); g.name = "map"; world.add(g); MAP.group = g;
  const lift = (x, z, h = 1.6) => new THREE.Vector3(x, groundY(x, z) + h, z);
  // 道：幹線は太め（2 本の線で）・一般は細く
  const main = [], minor = [];
  for (const [nm, k, pts] of M.roads) { const arr = k === "幹線" ? main : minor; for (let i = 0; i + 1 < pts.length; i++) arr.push(lift(pts[i][0], pts[i][1]), lift(pts[i + 1][0], pts[i + 1][1])); }
  const rl = (P, c, o) => { const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(P), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, fog: true })); l.renderOrder = 3; g.add(l); return l; };
  rl(main, "#ffe7b8", .85); rl(minor, "#e9eef5", .42);
  // 等高線：1 m ごと。低い所は青く、高い所は砂色に（標高 6〜16 m）
  const cp = [], cc = [], ca = new THREE.Color("#5fb7e6"), cb = new THREE.Color("#e8c98f"), _cl = new THREE.Color();
  for (const [h, pts] of M.contour) { _cl.copy(ca).lerp(cb, Math.min(1, Math.max(0, (h - 6) / 10))); for (let i = 0; i + 1 < pts.length; i++) { cp.push(pts[i][0], h + .6, pts[i][1], pts[i + 1][0], h + .6, pts[i + 1][1]); cc.push(_cl.r, _cl.g, _cl.b, _cl.r, _cl.g, _cl.b); } }
  const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3)); cg.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
  const cl = new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, depthWrite: false, fog: true })); cl.renderOrder = 2; g.add(cl);
  // 公園・池・社寺の輪郭
  const ap = []; for (const [nm, k, pts] of M.areas) for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; ap.push(lift(a[0], a[1], 1.2), lift(b[0], b[1], 1.2)); }
  rl(ap, "#bfe8c9", .6);
  // 名前（HTML の札。上空のときだけ）
  const box = $("#mapLabels"); box.innerHTML = "";
  for (const [nm, k, x, z] of M.labels) { const e = document.createElement("div"); e.className = "mapLabel k-" + ({ "道": "road", "公園": "park", "池": "water", "社": "shrine", "寺": "shrine", "駅": "station" }[k] || "road"); e.textContent = nm; box.appendChild(e); MAP.labels.push({ e, p: lift(x, z, 3) }); }
  for (const s of D.structs) if (/^torii_|^romon$|^shinkyo$/.test(s.id)) { const e = document.createElement("div"); e.className = "mapLabel k-torii"; e.textContent = s.name; box.appendChild(e); MAP.labels.push({ e, p: new THREE.Vector3(s.p[0], s.p[1] + (s.id === "romon" ? 120 : 90), s.p[2]), big: true }); }
  // いまの地点
  const hg = new THREE.Group(), hr = new THREE.RingGeometry(5.5, 7, 48); hr.rotateX(-Math.PI / 2);
  const hm = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: .9, depthWrite: false, fog: false });
  hg.add(new THREE.Mesh(hr, hm)); const hb = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 60, 8, 1, true).translate(0, 30, 0), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: .55, depthWrite: false, fog: false })); hg.add(hb);
  hg.visible = false; world.add(hg); MAP.here = hg;
  const he = document.createElement("div"); he.className = "mapLabel k-here"; he.textContent = "いま"; box.appendChild(he); MAP.hereLabel = { e: he, p: new THREE.Vector3() };
  g.visible = QW.mode === "sky";
}
/* 上空の地図の鳥居・楼門・神橋：実物の形（structures.glb）を 7 倍にして、同じ位置に立てる。歩くときは実寸のものだけ */
function buildBigStructs(src) {
  const K = 7;
  for (const s of D.structs) {
    if (!/^torii_|^romon$|^shinkyo$/.test(s.id)) continue;
    const m = src.getObjectByName(s.m); if (!m) continue;
    const o = m.clone(true); o.position.set(s.p[0], s.p[1], s.p[2]); o.rotation.set(0, s.r, 0); o.scale.setScalar(K);
    o.traverse(n => { if (n.isMesh) { n.material = n.material.clone(); n.material.envMapIntensity = .9; n.material.fog = false; } });
    o.visible = QW.mode === "sky"; world.add(o); MAP.big.push(o);
  }
}
function showMapLayer(on) {
  if (MAP.group) MAP.group.visible = on; for (const o of MAP.big) o.visible = on;
  if (structGroup) for (const c of structGroup.children) if (/^torii_|^romon$|^shinkyo$/.test(c.name)) c.visible = !on;
  $("#mapLabels").hidden = !on;
  if (MAP.here) { MAP.here.visible = on && QW.walked; if (on && QW.walked) { MAP.here.position.set(CAM.pos.x, groundY(CAM.pos.x, CAM.pos.z) + .6, CAM.pos.z); MAP.hereLabel.p.set(CAM.pos.x, groundY(CAM.pos.x, CAM.pos.z) + 64, CAM.pos.z); } }
}
function stepMapLabels() {
  if (QW.mode !== "sky" || !MAP.labels.length) return;
  const placed = [], W = innerWidth, H = innerHeight, all = MAP.here?.visible ? [...MAP.labels, MAP.hereLabel] : MAP.labels;
  for (const L of all) {
    _v3.copy(L.p).project(camera); const x = (_v3.x + 1) / 2 * W; let y = (1 - _v3.y) / 2 * H; if (L === MAP.hereLabel && _v3.z < 1) y = Math.max(96, y);   // 「いま」の札は上の端で切らない
    let ok = _v3.z < 1 && x > (MOBILE ? 72 : -40) && x < W - 20 && y > 70 && y < H - 40;
    if (ok && L !== MAP.hereLabel) for (const q of placed) if (Math.abs(q[0] - x) < (MOBILE ? 96 : 70) && Math.abs(q[1] - y) < (MOBILE ? 22 : 18)) { ok = false; break; }   // 重なる名札は出さない（大きな鳥居の名札も）
    if (!ok) { if (L.vis !== false) { L.e.style.display = "none"; L.vis = false; } continue; }
    placed.push([x, y]); if (L.vis !== true) { L.e.style.display = ""; L.vis = true; }
    L.e.style.transform = `translate(${x | 0}px,${y | 0}px)`;
  }
}

/* ---------- カメラと動き ---------- */
// CAM.yaw＝体（歩く）の向き、CAM.look＝見回す向き（体からの差）、CAM.pitch＝上下。カメラの向き＝yaw＋look
const CAM = { yaw: 0, look: 0, pitch: 0, pos: new THREE.Vector3(), vy: 0, lastDrag: 0 };
const SKY = { az: .3, el: .98, dist: MOBILE ? 1750 : 1550, tx: -20, tz: MOBILE ? 120 : 40, tAz: .3, tEl: .98, tDist: MOBILE ? 1750 : 1550 };
const EYE = 1.55;
let tween = null, TWFOG = null;
// どの見方も、空と霞は同じ色。切りかえのあいだも、霞の近さ・遠さだけが連続して変わる（黒い画面にしない）
const FOGS = { sky: () => ({ c: FOG_SKY, n: 2600, f: 9000 }), walk: () => ({ c: FOG_SKY, n: 70, f: MOBILE ? 340 : 480 }), fly: () => ({ c: FOG_SKY, n: 260, f: MOBILE ? 1100 : 1700 }), mid: () => ({ c: FOG_SKY, n: 400, f: 2600 }) };
function applyFog(f) { scene.fog.color.copy(f.c); scene.fog.near = f.n; scene.fog.far = f.f; }
function setMode(m) {
  const prev = QW.mode; QW.mode = m; document.body.dataset.mode = m;
  const walk = m === "walk", fly = m === "fly", sky = m === "sky", sight = m === "sight";
  if (m !== "descend" && !sight) applyFog(walk ? FOGS.walk() : fly ? FOGS.fly() : FOGS.sky());
  camera.near = walk || sight ? .03 : 1; camera.far = walk ? 700 : sight ? 1400 : 9000; camera.updateProjectionMatrix();
  if (pathLine) { pathLine.visible = sky || fly; pathLine.material.depthTest = !sky; }
  if (START.group) START.group.visible = sky;
  showMapLayer(sky);
  if (QW.skyTex && !sight) scene.background = QW.skyTex;
  updateTrees(true);
  $("#modeWalk").setAttribute("aria-pressed", walk || sight); $("#modeFly").setAttribute("aria-pressed", fly); $("#modeSky").setAttribute("aria-pressed", sky);
  if (AOI.root) AOI.root.visible = walk && AOI.ready;
  if (walk || fly) QW.walked = true;
  updateStack();
}
QW.setMode = m => { if (m === "fly") startFly(); else if (m === "sky") toSky(); else setMode(m); };
function skyCam() {
  const c = Math.cos(SKY.el), x = SKY.tx + Math.sin(SKY.az) * c * SKY.dist, z = SKY.tz + Math.cos(SKY.az) * c * SKY.dist, y = 14 + Math.sin(SKY.el) * SKY.dist;
  camera.position.set(x, y, z); camera.lookAt(SKY.tx, 14, SKY.tz);
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function tweenTo(pos, yaw, pitch, dur, done, arc = 0) {
  const p0 = camera.position.clone(), q0 = camera.quaternion.clone();
  const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  tween = { p0, q0, p1: pos.clone(), q1, t: 0, dur: RM ? .01 : dur, done, fog: TWFOG, arc }; TWFOG = null;
}
const _fa = { c: new THREE.Color(), n: 0, f: 0 };
function stepTween(dt) {
  if (!tween) return false; tween.t += dt / tween.dur; const k = ease(Math.min(1, tween.t));
  if (tween.fog) { const [a, b] = tween.fog; _fa.c.copy(a.c).lerp(b.c, k); _fa.n = a.n + (b.n - a.n) * k; _fa.f = a.f + (b.f - a.f) * k; applyFog(_fa); }
  camera.position.lerpVectors(tween.p0, tween.p1, k); camera.position.y += Math.sin(k * Math.PI) * tween.arc;   // 弧を描いて動く（まっすぐ落ちない）
  camera.quaternion.slerpQuaternions(tween.q0, tween.q1, Math.min(1, k * 1.1));
  if (tween.t >= 1) { const d = tween.done; tween = null; d?.(); }
  return true;
}
function yawAlong(d) { const a = atD(d); return Math.atan2(-a.tx, -a.tz); }   // 道のりの増える向き（北の社へ）を向く
function descendTo(i) {
  const s = D.starts[i]; if (!s) return;
  hideSkyUI(); loadLate();
  const a = atD(s.d), yaw = yawAlong(Math.min(s.d + 6, 1985)), y = groundY(a.x, a.z) + EYE;
  setMode("descend");
  // まず斜め上空へ寄り、そこから目の高さへ（道と木が届くまでは、斜め上空でゆっくり回りながら待つ）
  const mid = new THREE.Vector3(a.x + Math.sin(yaw) * 140, y + 120, a.z + Math.cos(yaw) * 140);
  TWFOG = [FOGS.sky(), FOGS.mid()];
  tweenTo(mid, yaw, -.62, 1.2, () => {
    let ready = false; const wait = setTimeout(() => { if (!ready) toast("参道の道と木を読み込んでいます。"); }, 500);
    WAITORBIT = { c: new THREE.Vector3(a.x, y, a.z), r: 140 * Math.SQRT2 / Math.SQRT2, yaw, t: 0 };
    lateP.then(() => { ready = true; clearTimeout(wait); WAITORBIT = null; TWFOG = [FOGS.mid(), FOGS.walk()]; tweenTo(new THREE.Vector3(a.x, y, a.z), yaw, -.04, 1.4, () => { CAM.pos.set(a.x, y, a.z); CAM.yaw = yaw; CAM.look = 0; CAM.pitch = -.04; enterWalk(); }); });
  });
}
let WAITORBIT = null;
function stepWaitOrbit(dt) {   // 待つあいだも画は止めない
  const W = WAITORBIT; if (!W || tween) return; W.t += dt; const a = W.yaw + W.t * .05;
  camera.position.set(W.c.x + Math.sin(a) * 140, W.c.y + 120, W.c.z + Math.cos(a) * 140); camera.lookAt(W.c.x, W.c.y, W.c.z);
}
QW.startAt = i => { if (QW.mode === "sky") descendTo(i ?? 0); };

/* 歩く：体は道に沿って進み、目は自由に見回せる */
const WALK = { goal: null, keys: new Set(), hold: false, auto: false, speed: 1.35, ring: null, moving: false };
function enterWalk() {
  setMode("walk"); showWalkUI();
  aoiArrive();
  if (!sessionStorageGet("hk_tip2")) { toast(MOBILE ? "なぞると見回せます。「歩きつづける」で参道を進み、地面に触れるとそこへ歩きます。" : "ドラッグで見回し、W で見ている方へ、「歩きつづける」で参道に沿って進みます。地面を押すとそこへ歩きます。"); sessionStorageSet("hk_tip2", 1); }
}
function corridorClamp(p) {
  const n = nearestOnLine(p.x, p.z), lim = n.d > 1878 ? 70 : n.d < -20 ? 30 : 13;
  if (n.dist > lim) { const a = atD(n.d), dx = p.x - a.x, dz = p.z - a.z, l = Math.hypot(dx, dz) || 1; p.x = a.x + dx / l * lim; p.z = a.z + dz / l * lim; }
  if (n.d > 2010) { const a = atD(2010); p.x += (a.x - p.x) * .2; p.z += (a.z - p.z) * .2; }
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _eu = new THREE.Euler(0, 0, 0, "YXZ");
function stepWalk(dt, eye = EYE, speed = WALK.speed, bob = 0) {
  const K = WALK.keys;
  const fwd = K.has("w") || K.has("arrowup") || WALK.hold, back = K.has("s") || K.has("arrowdown");
  if (K.has("a") || K.has("arrowleft")) CAM.yaw += dt * 1.5; if (K.has("d") || K.has("arrowright")) CAM.yaw -= dt * 1.5;
  const sp = speed * (K.has("shift") ? 2.2 : 1);
  let moving = false;
  if (fwd || back) {   // 見ている方へ：体が目の向きへ回りこむ
    WALK.goal = null; if (WALK.ring) WALK.ring.visible = false;
    if (fwd) { const k = Math.min(1, dt * 3.2); CAM.yaw += CAM.look * k; CAM.look -= CAM.look * k; }
    _f.set(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw)); CAM.pos.addScaledVector(_f, (fwd ? 1 : -.6) * sp * dt); moving = true;
  } else if (WALK.goal) {
    const dx = WALK.goal.x - CAM.pos.x, dz = WALK.goal.z - CAM.pos.z, l = Math.hypot(dx, dz);
    if (l < .25) { WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; }
    else { const st = Math.min(l, sp * dt); CAM.pos.x += dx / l * st; CAM.pos.z += dz / l * st; moving = true;
      const want = Math.atan2(-dx, -dz), dy = wrap(want - CAM.yaw), k = Math.min(1, dt * 2.2); CAM.yaw += dy * k; CAM.look -= dy * k * (performance.now() - CAM.lastDrag < 2500 ? 1 : 0); }   // 見回している最中は、目の向きはそのまま
  } else if (WALK.auto) {   // 歩きつづける：参道の向き（いま進んでいる側）へ体をそろえて進む
    const n = nearestOnLine(CAM.pos.x, CAM.pos.z), a = atD(n.d), ty = Math.atan2(-a.tx, -a.tz), dir = Math.cos(wrap(ty - CAM.yaw)) >= 0 ? ty : ty + Math.PI;
    // 道の中心へ少しずつ寄る（端を歩きつづけない）
    const off = (CAM.pos.x - a.x) * -a.tz + (CAM.pos.z - a.z) * a.tx, pull = Math.max(-.25, Math.min(.25, off * .04)) * (dir === ty ? 1 : -1);
    const dy = wrap(dir + pull - CAM.yaw), k = Math.min(1, dt * 1.6); CAM.yaw += dy * k; CAM.look -= dy * k;
    _f.set(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw)); CAM.pos.addScaledVector(_f, sp * dt); moving = true;
    if ((n.d > 1990 && dir === ty) || (n.d < -15 && dir !== ty)) { WALK.auto = false; syncAutoBtn(); }
  }
  // 見回したあと、しばらく触れずに歩いていると、目はゆっくり進む向きへ戻る
  if (moving && !GYRO.on && performance.now() - CAM.lastDrag > 3500) CAM.look -= wrap(CAM.look) * Math.min(1, dt * .5);
  CAM.look = wrap(CAM.look);
  corridorClamp(CAM.pos);
  const gy = groundY(CAM.pos.x, CAM.pos.z) + eye;
  CAM.pos.y += (gy - CAM.pos.y) * Math.min(1, dt * 8);
  camera.position.copy(CAM.pos); if (bob && moving) camera.position.y += bob;
  if (GYRO.on && GYRO.q) { camera.quaternion.copy(GYRO.q); _eu.setFromQuaternion(camera.quaternion); CAM.look = wrap(_eu.y - CAM.yaw); CAM.pitch = _eu.x; }
  else camera.quaternion.setFromEuler(_eu.set(CAM.pitch, CAM.yaw + CAM.look, 0));
  WALK.moving = moving;
}

/* 端末の向きで見回す（スマホ・任意。許可を求める） */
const GYRO = { on: false, q: null, y0: 0, base: null, have: false };
const _zee = new THREE.Vector3(0, 0, 1), _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(-Math.sqrt(.5), 0, 0, Math.sqrt(.5)), _ge = new THREE.Euler(), _qy = new THREE.Quaternion();
function onOrient(e) {
  if (e.alpha == null) return; GYRO.have = true;
  const al = THREE.MathUtils.degToRad(e.alpha), be = THREE.MathUtils.degToRad(e.beta), ga = THREE.MathUtils.degToRad(e.gamma), or = THREE.MathUtils.degToRad(screen.orientation?.angle || window.orientation || 0);
  const q = new THREE.Quaternion().setFromEuler(_ge.set(be, al, -ga, "YXZ")).multiply(_q1).multiply(_q0.setFromAxisAngle(_zee, -or));
  if (GYRO.base === null) { const e2 = new THREE.Euler().setFromQuaternion(q, "YXZ"); GYRO.base = (CAM.yaw + CAM.look) - e2.y; }
  GYRO.q = _qy.setFromAxisAngle(_up, GYRO.base).clone().multiply(q);
}
async function toggleGyro() {
  if (GYRO.on) { GYRO.on = false; removeEventListener("deviceorientation", onOrient); syncGyroBtn(); return; }
  try { if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== "granted") { toast("端末の向きを使う許可がありませんでした。なぞって見回せます。"); return; } } } catch { toast("端末の向きを使えませんでした。なぞって見回せます。"); return; }
  GYRO.base = null; GYRO.q = null; GYRO.on = true; addEventListener("deviceorientation", onOrient); syncGyroBtn();
  setTimeout(() => { if (GYRO.on && !GYRO.have) { GYRO.on = false; removeEventListener("deviceorientation", onOrient); syncGyroBtn(); toast("この端末では、向きの知らせが届きませんでした。なぞって見回せます。"); } }, 1500);
}
function syncGyroBtn() { const b = $("#gyroBtn"); if (b) { b.setAttribute("aria-pressed", String(GYRO.on)); b.textContent = GYRO.on ? "向きで見回す：入" : "端末の向きで見回す"; } }
function syncAutoBtn() { const b = $("#autoBtn"); if (b) { b.setAttribute("aria-pressed", String(WALK.auto)); b.querySelector("span").textContent = WALK.auto ? "止まる" : "歩きつづける"; } }

/* 鳥になって飛ぶ（ゆっくり・高さは控えめ・地面と木にもぐらない） */
const FLY = { yawRate: 0, climb: 0, roll: 0, speed: 9, up: false, down: false, drag: null };
function startFly() {
  hideSkyUI(); hideWalkUI(); hidePanel(); stopVoice(); loadLate();
  let p, yaw;
  if (QW.mode === "walk" || QW.mode === "sight") { p = CAM.pos.clone(); yaw = CAM.yaw + CAM.look; if (QW.mode === "sight") exitSight(true); }
  else { const s = D.starts[Math.max(0, START.sel)]; const a = atD(s.d); p = new THREE.Vector3(a.x, 0, a.z); yaw = yawAlong(s.d + 5); }
  const y = Math.max(groundY(p.x, p.z) + 48, roofAt(p.x, p.z, 2) + 16);
  TWFOG = [QW.mode === "sky" ? FOGS.sky() : FOGS.walk(), FOGS.fly()]; const from = QW.mode; setMode("descend");
  tweenTo(new THREE.Vector3(p.x, y, p.z), yaw, -.2, from === "sky" ? 2.2 : 1.7, () => { CAM.pos.set(p.x, y, p.z); CAM.yaw = yaw; CAM.look = 0; CAM.pitch = -.2; FLY.roll = 0; setMode("fly"); showFlyUI(); if (!sessionStorageGet("hk_fly")) { toast(MOBILE ? "なぞった向きへ曲がります。右の「上へ」「下へ」で高さを変えます。" : "ドラッグか A D で曲がり、W S で高さを変えます。"); sessionStorageSet("hk_fly", 1); } }, from === "sky" ? 0 : 18);
}
function stepFly(dt) {
  const K = WALK.keys;
  let turn = (K.has("a") || K.has("arrowleft") ? 1 : 0) - (K.has("d") || K.has("arrowright") ? 1 : 0);
  let climb = (K.has("w") || K.has("arrowup") || FLY.up ? 1 : 0) - (K.has("s") || K.has("arrowdown") || FLY.down ? 1 : 0);
  if (FLY.drag) { turn += -FLY.drag.dx * 2.2; climb += -FLY.drag.dy * 2.2; }
  turn = Math.max(-1, Math.min(1, turn)); climb = Math.max(-1, Math.min(1, climb));
  FLY.yawRate += (turn * .55 - FLY.yawRate) * Math.min(1, dt * 2.5);
  FLY.climb += (climb * 6 - FLY.climb) * Math.min(1, dt * 2);
  CAM.yaw += FLY.yawRate * dt;
  const sp = FLY.speed * (K.has("shift") ? 1.8 : 1);
  CAM.pos.x += -Math.sin(CAM.yaw) * sp * dt; CAM.pos.z += -Math.cos(CAM.yaw) * sp * dt; CAM.pos.y += FLY.climb * dt;
  const n = nearestOnLine(CAM.pos.x, CAM.pos.z);
  if (n.dist > 260 || n.d < -120 || n.d > 2120) { const a = atD(Math.min(1980, Math.max(0, n.d))), want = Math.atan2(-(a.x - CAM.pos.x), -(a.z - CAM.pos.z)); CAM.yaw += wrap(want - CAM.yaw) * Math.min(1, dt * .8); }
  const g = groundY(CAM.pos.x, CAM.pos.z), lo = Math.max(g + 30, roofAt(CAM.pos.x + -Math.sin(CAM.yaw) * 20, CAM.pos.z + -Math.cos(CAM.yaw) * 20, 1) + 14), hi = Math.max(g + 140, lo + 30);
  if (CAM.pos.y < lo) { CAM.pos.y += (lo - CAM.pos.y) * Math.min(1, dt * 3); FLY.climb = Math.max(FLY.climb, 0); }
  if (CAM.pos.y > hi) { CAM.pos.y += (hi - CAM.pos.y) * Math.min(1, dt * 3); FLY.climb = Math.min(FLY.climb, 0); }
  FLY.roll += (-FLY.yawRate * .22 - FLY.roll) * Math.min(1, dt * 2);
  const pitch = -.2 + FLY.climb * .012;
  camera.position.copy(CAM.pos); camera.quaternion.setFromEuler(_eu.set(pitch, CAM.yaw, FLY.roll));
}
function landFromFly() {
  const n = nearestOnLine(CAM.pos.x, CAM.pos.z), d = Math.min(1985, Math.max(-20, n.d)), a = atD(d), y = groundY(a.x, a.z) + EYE, ya = yawAlong(d), yb = ya + Math.PI;
  const yaw = Math.abs(wrap(ya - CAM.yaw)) < Math.PI / 2 ? ya : yb;
  setMode("descend"); hideFlyUI();
  lateP.then(() => (TWFOG = [FOGS.fly(), FOGS.walk()], tweenTo(new THREE.Vector3(a.x, y, a.z), yaw, -.04, 2.2, () => { CAM.pos.set(a.x, y, a.z); CAM.yaw = yaw; CAM.look = 0; CAM.pitch = -.04; enterWalk(); }, 10)));
}
function toSky() {
  hidePanel(); hideWalkUI(); hideFlyUI(); stopVoice(); if (QW.mode === "sight") exitSight(true);
  const c = Math.cos(SKY.el), x = SKY.tx + Math.sin(SKY.az) * c * SKY.dist, z = SKY.tz + Math.cos(SKY.az) * c * SKY.dist, y = 14 + Math.sin(SKY.el) * SKY.dist;
  const tmp = new THREE.Object3D(); tmp.position.set(x, y, z); tmp.lookAt(SKY.tx, 14, SKY.tz); const e = new THREE.Euler().setFromQuaternion(tmp.quaternion, "YXZ");
  TWFOG = [QW.mode === "fly" ? FOGS.fly() : FOGS.walk(), FOGS.sky()]; setMode("descend"); if (AOI.root) AOI.root.visible = false;
  tweenTo(tmp.position, e.y, e.x, 2.0, () => { setMode("sky"); showSkyUI(); });
}

/* ---------- 入力 ---------- */
const ptr = { down: false, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: 0, id: null, pinch: null, pts: new Map() };
canvas.addEventListener("pointerdown", e => {
  ptr.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.pts.size === 2) { const [a, b] = [...ptr.pts.values()]; ptr.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: SKY.tDist }; return; }
  ptr.down = true; ptr.id = e.pointerId; ptr.x = ptr.sx = e.clientX; ptr.y = ptr.sy = e.clientY; ptr.t = performance.now(); ptr.moved = 0;
  canvas.setPointerCapture(e.pointerId);
  if (QW.mode === "fly" || (QW.mode === "sight" && SIGHT.sp?.move !== "trot" && SIGHT.sp?.move !== "crawl")) FLY.drag = { dx: 0, dy: 0 };
});
canvas.addEventListener("pointermove", e => {
  if (ptr.pts.has(e.pointerId)) ptr.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.pinch && ptr.pts.size === 2) { const [a, b] = [...ptr.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); SKY.tDist = Math.min(2800, Math.max(380, ptr.pinch.dist * ptr.pinch.d / d)); return; }
  if (!ptr.down || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY; ptr.moved += Math.abs(dx) + Math.abs(dy);
  if (QW.mode === "walk" || (QW.mode === "sight" && !FLY.drag)) { const k = MOBILE ? .0042 : .0032; if (GYRO.on) GYRO.base += dx * k; else { CAM.look += dx * k; CAM.pitch = Math.max(-1.1, Math.min(.9, CAM.pitch + dy * k)); } CAM.lastDrag = performance.now(); }
  else if (QW.mode === "sky") { SKY.tAz -= dx * .0042; SKY.tEl = Math.max(.42, Math.min(1.42, SKY.tEl + dy * .003)); }
  else if (FLY.drag) { FLY.drag.dx = (e.clientX - ptr.sx) / (innerWidth * .5); FLY.drag.dy = (e.clientY - ptr.sy) / (innerHeight * .5); }
});
const endPtr = e => {
  ptr.pts.delete(e.pointerId); if (ptr.pts.size < 2) ptr.pinch = null;
  if (!ptr.down || e.pointerId !== ptr.id) return; ptr.down = false; FLY.drag = null;
  if (ptr.moved < 10 && performance.now() - ptr.t < 600) tap(e.clientX, e.clientY);
};
canvas.addEventListener("pointerup", endPtr); canvas.addEventListener("pointercancel", endPtr);
canvas.addEventListener("wheel", e => { if (QW.mode === "sky") { SKY.tDist = Math.min(2800, Math.max(380, SKY.tDist * (1 + e.deltaY * .0012))); e.preventDefault(); } }, { passive: false });
addEventListener("keydown", e => { if (e.target.closest?.("input,textarea")) return; const k = e.key.toLowerCase(); WALK.keys.add(k); if (k === "escape") { if (!$("#panel").hidden) hidePanel(); } if (k === " " && QW.mode === "walk") { WALK.auto = !WALK.auto; syncAutoBtn(); e.preventDefault(); } });
addEventListener("keyup", e => WALK.keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => WALK.keys.clear());

const ray = new THREE.Raycaster(), _v2 = new THREE.Vector2(), _v3 = new THREE.Vector3();
function tap(x, y) {
  if (QW.mode === "sky") {   // 地図の点を選ぶ
    let best = -1, bd = 46 * 46;
    START.pins.forEach((p, i) => { for (const h of [p.head.position, p.ring.position]) { _v3.copy(h).project(camera); const sx = (_v3.x + 1) / 2 * innerWidth, sy = (1 - _v3.y) / 2 * innerHeight, d = (sx - x) ** 2 + (sy - y) ** 2; if (_v3.z < 1 && d < bd) { bd = d; best = i; } } });
    if (best >= 0) selectStart(best); return;
  }
  if (QW.mode !== "walk" && QW.mode !== "sight") return;
  const o = pickObj(x, y); if (o) { openObj(o); return; }
  if (QW.mode !== "walk") return;
  _v2.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(_v2, camera); ray.far = 60;
  const hit = ray.intersectObjects(pickables.filter(m => m.visible !== false), false)[0];
  if (hit) { WALK.goal = hit.point.clone(); corridorClamp(WALK.goal); showGoalRing(WALK.goal); }
}
function showGoalRing(p) {
  if (!WALK.ring) { const g = new THREE.RingGeometry(.28, .34, 40); g.rotateX(-Math.PI / 2); WALK.ring = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: "#9bdcf0", transparent: true, opacity: .85, depthWrite: false })); world.add(WALK.ring); }
  WALK.ring.position.set(p.x, groundY(p.x, p.z) + .04, p.z); WALK.ring.visible = true; WALK.ringT = 0;
}

/* ---------- Qualia Layer：層を重ねる（記録の 9 層と、Qualia/sight・Qualia/sound） ---------- */
let ALL = [], GL = {};
const LAYER = { worn: [], objs: [], ripple: null, rippleR: 0, wear: null, thumbs: null };
function layerNo(id) { return ALL.findIndex(l => l.id === id) + 1; }
function buildObjs() {
  ALL = [...D.layers, ...QLAYERS]; GL = Object.fromEntries(ALL.map(l => [l.id, l]));
  const list = [...D.objs, ...D.sound.map(s => ({ id: s.id, x: s.x, y: s.y, z: s.z, ll: s.ll, layer: "sound", title: s.title, h: 2.0, lines: [], snd: s })), ...D.touch.map(t => ({ id: t.id, x: t.x, y: t.y, z: t.z, ll: t.ll, layer: "touch", title: t.title, h: 1.25, lines: [], tch: t })), ...(D.sho || []).map(t => ({ id: t.id, x: t.x, y: t.y, z: t.z, ll: t.ll, layer: "sho", title: t.title, h: .7, lines: [], sho: t }))];
  for (const o of list) {
    const L0 = GL[o.layer]; if (!L0) continue;
    const m = makeMarker(o.sub || o.layer, L0.color, o.h, MOBILE);   // 形は細かい分類（樹木・鳥居と石…）、色はまとめた層の色 m.root.position.set(o.x, o.y, o.z); m.root.visible = false; m.root.name = o.id;
    world.add(m.root); LAYER.objs.push({ o, ...m, k: 0, show: 0, open: 0, label: null });
  }
  // はじめから、すべての層を重ねておく（2026-10-22 本人「デフォルトで全て on に」）。外すのは見る人が選んだときだけ
  LAYER.worn = ALL.map(l => l.id); for (const L of LAYER.objs) { L.want = true; L.arr = true; }
  document.body.classList.add("wearing"); document.body.style.setProperty("--lc", ALL[ALL.length - 1].color); document.body.style.setProperty("--lc2", ALL[ALL.length - 1].color);
  const rg = new THREE.RingGeometry(.97, 1, 96); rg.rotateX(-Math.PI / 2);
  LAYER.ripple = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false })); LAYER.ripple.visible = false; world.add(LAYER.ripple);
}
function wearLayer(id, opts = {}) {   // 層は重ねられる（重ねた順に 1 層目・2 層目…）。同じ層をもう一度選ぶと外れる
  const W = LAYER.worn; let g = null;
  if (!id) W.length = 0; else if (W.includes(id)) W.splice(W.indexOf(id), 1); else { W.push(id); g = GL[id]; }
  if (!opts.keepPanel) hidePanel();
  syncTray();
  const top = W.length ? GL[W[W.length - 1]] : null;
  document.body.style.setProperty("--lc", top ? top.color : "transparent"); document.body.classList.toggle("wearing", !!top); document.body.style.setProperty("--lc2", top ? top.color : "");

  // 層が重なる：見る人の足もとから輪がひろがり、届いた所から物が現れる
  if (g) { LAYER.rippleR = 0; LAYER.ripple.visible = QW.mode !== "sky"; LAYER.ripple.material.color.set(g.color); LAYER.ripple.position.set(camera.position.x, groundY(camera.position.x, camera.position.z) + .06, camera.position.z); LAYER.rippleLayer = g.id; }
  for (const L of LAYER.objs) { L.want = W.includes(L.o.layer); if (!L.want) L.arr = false; if (L.label) { L.glyph.remove(L.label); L.label.material.map.dispose(); L.label.material.dispose(); L.label = null; } }
  if (g) putOnAnim(g);
  if (!W.includes("sight") && SIGHT.sp) exitSight();
  updateStack();
}
function putOnAnim() { }   // 2026-10-22 本人「グラスで分ける案はやめて」→ 層は左の板で切りかえる
const LABEL_R = MOBILE ? 22 : 28;
function stepLayer(dt) {
  if (LAYER.wear) {
    const w = LAYER.wear; w.t += dt / .9; const k = ease(Math.min(1, w.t));
    w.m.position.set(0, -.16 + k * .16, -.42 + k * .3); w.m.rotation.set(.5 * (1 - k), 0, 0);
    for (const mt of w.m.userData.mats) { mt.transparent = true; mt.opacity = mt === w.m.userData.mats[1] ? .32 * (1 - k) : 1 - Math.max(0, k - .6) / .4; }
    if (w.t >= 1) { camera.remove(w.m); w.m.traverse(o => o.geometry?.dispose()); LAYER.wear = null; }
  }
  if (LAYER.ripple?.visible) { LAYER.rippleR += dt * 55; const r = LAYER.rippleR; LAYER.ripple.scale.setScalar(Math.max(.01, r)); LAYER.ripple.material.opacity = Math.max(0, .7 * (1 - r / 260)); if (r > 260) LAYER.ripple.visible = false; }
  const cp = camera.position, t = performance.now() / 1000, M = QW.mode, sky = M === "sky", flyish = M === "fly" || (M === "sight" && SIGHT.sp && SIGHT.sp.eye > 3);
  const far = sky ? 1e9 : flyish ? (MOBILE ? 600 : 900) : M === "walk" || M === "sight" || M === "descend" ? (MOBILE ? 200 : 300) : 0, lod = sky || flyish ? 0 : MOBILE ? 50 : 70;
  for (const L of LAYER.objs) {
    const dx = L.o.x - cp.x, dz = L.o.z - cp.z, dist = Math.hypot(dx, dz);
    if (L.want && !L.arr && (!LAYER.ripple.visible || L.o.layer !== LAYER.rippleLayer || dist < LAYER.rippleR - 10)) L.arr = true;
    const target = L.want && L.arr && dist < far ? 1 : 0;
    L.show += (target - L.show) * Math.min(1, dt * (target ? 3 : 6));
    const vis = L.show > .01; L.root.visible = vis; if (!vis) continue;
    // 遠くでも見つけられるように、少しだけ大きく（位置は動かさない）
    const s = sky ? Math.min(46, Math.max(10, Math.hypot(cp.x - L.o.x, cp.y - L.o.y, cp.z - L.o.z) / 38)) : Math.min(flyish ? 26 : 3.2, Math.max(1, dist / (flyish ? 9 : 16))) * (1 + L.open * .35);
    L.glyph.scale.setScalar(s * (.6 + .4 * L.show));
    L.glyph.position.y = sky ? Math.max(L.o.h, 2.2 * s) : flyish ? Math.max(L.o.h, 2.5 * s) : L.o.h;
    L.beam.scale.y = Math.max(.05, L.glyph.position.y - .25 * s); L.base.scale.setScalar(sky ? s * .9 : 1 + L.open * 1.4);
    const detail = !sky && dist < lod; if (L.det !== detail) { L.det = detail; L.base.visible = detail; for (const f of L.faces) f.visible = detail; }   // 遠くは線と光だけ（描く数を減らす）
    L.open += ((PANEL.cur === L ? 1 : 0) - L.open) * Math.min(1, dt * 5);
    L.base.rotation.y = t * .18;
    if (L.orb) L.orb.rotation.y = t * 1.6;
    if (L.open > .01) L.glyph.rotation.y += dt * 1.2 * L.open;
    else L.glyph.rotation.y = Math.atan2(cp.x - L.o.x, cp.z - L.o.z);   // 見る人へ正面を向ける（その場で回るだけ）
    const op = L.show * (PANEL.cur && PANEL.cur !== L ? .35 : 1);
    L.lm.opacity = .95 * op; L.fm.opacity = .12 * op; L.bm.opacity = .5 * op * (sky ? 1 : Math.min(1, Math.max(0, (dist - 1.5) / 4))); L.tm.opacity = .75 * op;   // すぐそばでは光の柱を消す（目の前をふさがない）
    L.glow.material.opacity = (.42 + .14 * Math.sin(t * 1.6 + L.o.x)) * op; L.glow.scale.setScalar(.5 + L.open * .3);
    // 名札：近くに来たら（歩く・生きものの高さ）
    const near = !sky && !flyish && dist < LABEL_R;
    if (near && !L.label) { L.label = makeLabel(layerNo(L.o.layer), GL[L.o.layer].name, L.o.title, GL[L.o.layer].color); L.label.position.set(.36, .05, 0); L.glyph.add(L.label); }
    if (L.label) { L.label.visible = near; L.label.material.opacity = Math.min(1, (LABEL_R - dist) / 6) * op; const k = Math.max(.55, Math.min(2.2, dist / 9)) / s; L.label.scale.set(1.6 * k, .4 * k, 1); }
  }
}
function pickObj(x, y) {
  let best = null, bd = (MOBILE ? 40 : 30) ** 2;
  for (const L of LAYER.objs) {
    if (!L.root.visible || L.show < .5) continue;
    L.glyph.getWorldPosition(_v3); const dist = _v3.distanceTo(camera.position); _v3.project(camera); if (_v3.z > 1) continue;
    const sx = (_v3.x + 1) / 2 * innerWidth, sy = (1 - _v3.y) / 2 * innerHeight, d = (sx - x) ** 2 + (sy - y) ** 2;
    const rad = Math.max(bd, (420 / Math.max(1, dist)) ** 2);
    if (d < rad && (!best || d < best.d)) best = { L, d };
  }
  return best?.L || null;
}
function updateStack() { syncTray(); }

/* ---------- 開いた中身 ---------- */
const PANEL = { cur: null };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const srcList = src => src.map(s => s.u ? `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>` : `<li>${esc(s.t)}</li>`).join("");
function openPanel({ color, layer, title, lines = [], more = [], how, note, src = [], ll, figs = "", buttons = [] }) {
  closeTray(); const p = $("#panel"); p.hidden = false; p.style.setProperty("--pc", color);
  $("#pLayer").textContent = layer; $("#pTitle").textContent = title;
  const body = $("#pBody"); body.innerHTML = "";
  lines.forEach((l, i) => { const e = document.createElement("p"); e.className = "line"; e.dataset.i = i; e.textContent = l.t; body.appendChild(e); });
  for (const m of more) { const e = document.createElement("p"); e.className = "more"; e.textContent = m; body.appendChild(e); }
  const ex = $("#pExp"); ex.innerHTML = figs ? `<figure class="fig">${figs}</figure>` : ""; ex.hidden = !figs && !buttons.length;
  for (const b of buttons) { const e = document.createElement("button"); e.type = "button"; e.className = "ml-btn expBtn" + (b.primary ? " ml-btn--primary" : ""); e.textContent = b.label; e.addEventListener("click", b.run); ex.appendChild(e); }
  $("#pHow").textContent = how || ""; $("#pHow").hidden = !how;
  $("#pNote").textContent = note || ""; $("#pNote").hidden = !note;
  $("#pSrc").innerHTML = srcList(src);
  $("#pPos").textContent = ll ? `この物の位置：北緯 ${ll[1].toFixed(5)}°・東経 ${ll[0].toFixed(5)}°（地図の座標に固定）` : "";
  $("#pFold").open = false; $("#pFold").hidden = !src.length && !note && !how; p.scrollTop = 0;
}
function openObj(L) {
  const o = L.o, g = GL[o.layer]; PANEL.cur = L;
  if (o.snd) return openSound(L);
  if (o.tch) return openTouch(L);
  if (o.sho) return openSho(L);
  const sp = o.sp ? D.sight.find(s => s.id === o.sp) : null;
  openPanel({ color: g.color, layer: `${String(layerNo(o.layer)).padStart(2, "0")}　${g.name}`, title: o.title, lines: o.lines, more: o.more, src: o.src, ll: o.ll, note: o.note,
    how: o.how === "研究の知見" ? "研究の知見（ほかの場所で調べられたこと）" : "記録（公的な資料・神社の由緒・樹木調査など）",
    figs: sp ? EXP_FIG[sp.fig] || "" : "", buttons: sp ? [{ label: `${sp.name}になる`, primary: true, run: () => enterSight(sp, L) }] : [] });
  if (o.seg) TALK.spoken.add(o.seg);
  speakLines(o.lines, L);
}
function hidePanel() { if ($("#panel").hidden) return; $("#panel").hidden = true; PANEL.cur = null; TCH.cur = null; stopVoice(); stopSound(); }
$("#pClose").addEventListener("click", hidePanel);

/* ---------- 声（碧） ---------- */
const audio = $("#voice"); let soundOn = true, voiceQ = null;
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { } }
function stopVoice() { voiceQ = null; try { audio.pause(); } catch { } AOI.m?.stopSpeaking(); document.querySelectorAll("#pBody .line.now").forEach(e => e.classList.remove("now")); hideCaption(); }
function speakLines(lines, L, opt = {}) {
  stopVoice(); const q = lines.filter(l => l.f || !soundOn); voiceQ = { q, i: 0, L, talk: opt.talk || null, done: opt.done || null };
  if (L && AOI.m) { const p = L.glyph.getWorldPosition(new THREE.Vector3()); AOI.m.lookAt(p); AOI.focus = p; }   // 指さず、目と体を半分だけ物へ向ける
  playNext();
}
function playNext() {
  const v = voiceQ; if (!v) return; const l = v.q[v.i];
  if (!l) { voiceQ = null; AOI.focus = null; hideCaption(1200); v.done?.(); return; }
  const idx = v.L ? v.L.o.lines.indexOf(l) : -1;
  document.querySelectorAll("#pBody .line").forEach(e => e.classList.toggle("now", +e.dataset.i === idx));
  if (!v.L) caption(l.tc || l.t, v.talk);
  const next = gap => setTimeout(() => { if (voiceQ === v) { v.i++; playNext(); } }, gap);
  if (!soundOn || !l.f) { next(Math.max(2200, (l.dur || l.t.length * .16) * 1000 + 600)); return; }
  audio.src = l.f; audio.currentTime = 0;
  if (AOI.m && v.i === 0) AOI.m.express(v.talk ? (Math.random() < .5 ? "warm" : "curious") : "warm", .55, Math.min(6, (l.dur || 3) + 1));
  audio.play().then(() => { AOI.m?.speak({ timeline: D.lip[l.id] || null, text: l.t, dur: l.dur, clock: () => audio.currentTime }); }).catch(() => next(1500));
  audio.onended = () => { if (voiceQ !== v) return; AOI.m?.stopSpeaking(); next(420); };
}
let capT = 0;
function caption(t, talk) {
  const c = $("#caption"); $("#capText").textContent = t;
  const tag = $("#capTag");
  if (talk) { const g = GL[talk.k]; tag.hidden = false; tag.style.setProperty("--c", g?.color || "#9bdcf0"); tag.textContent = `${String(layerNo(talk.k)).padStart(2, "0")}　${g?.name || ""}　出典`; c.dataset.talk = talk.id; }
  else { tag.hidden = true; delete c.dataset.talk; }
  c.hidden = false; clearTimeout(capT);
}
function hideCaption(after = 0) { clearTimeout(capT); capT = setTimeout(() => { $("#caption").hidden = true; }, after); }
$("#caption").addEventListener("click", () => {   // 字幕の「出典」から、いま話している区切りを開く
  const id = $("#caption").dataset.talk, s = TALK.byId[id]; if (!s) return; const g = GL[s.k] || ALL[0];
  const keep = voiceQ; openPanel({ color: g.color, layer: g.name, title: "碧の話の出典", lines: s.lines, src: s.src, how: "記録（公的な資料・神社の由緒・樹木調査など）" }); voiceQ = keep;
});

/* ---------- 碧の語り：いまいる所に結びついた話を、とぎれずに（同じ話はくり返さない） ---------- */
const TALK = { on: true, segs: [], byId: {}, spoken: new Set(), nextT: 0, idleSince: 0, loaded: false };
try { for (const k of JSON.parse(sessionStorage.getItem("hk_spoken") || "[]")) TALK.spoken.add(k); } catch { }
function loadTalk() {
  if (TALK.loading) return TALK.loading;
  return TALK.loading = Promise.all([fetch(BASE + "talk.json?v=" + VER).then(r => r.json()), fetch(BASE + "lip.json?v=" + VER).then(r => r.json()).catch(() => ({}))]).then(([t, lip]) => {
    TALK.segs = t.segs; for (const s of t.segs) TALK.byId[s.id] = s; Object.assign(D.lip, lip); TALK.loaded = true;
  }).catch(e => console.warn("talk", e));
}
function talkDir() { return Math.cos(wrap(CAM.yaw - yawAlong(nearestOnLine(CAM.pos.x, CAM.pos.z).d))) >= 0 ? 1 : -1; }
function pickTalk() {
  const M = QW.mode, n = nearestOnLine(CAM.pos.x, CAM.pos.z), d = n.d, air = M === "fly" || (M === "sight" && SIGHT.sp && SIGHT.sp.eye > 3);
  if (!air && n.dist > 90) return null;
  const dir = talkDir(), pad = air ? 120 : 14, now = performance.now(), quiet = now - TALK.idleSince;
  let best = null, bs = -1e9;
  for (const s of TALK.segs) {
    if (TALK.spoken.has(s.id)) continue;
    let ok;
    if (s.a && !air) { const rel = (s.d0 + 24 - d) * dir; ok = rel > -8 && rel < 34; }   // 地点の話：歩く先 34 m から、すぐうしろ 8 m まで
    else ok = d >= s.d0 - pad && d <= s.d1 + pad;
    if (!ok && quiet > 16000) ok = Math.abs((s.d0 + s.d1) / 2 - d) < (air ? 260 : 120);   // しばらく話すことがないときは、少し離れた話も
    if (!ok) continue;
    let sc = s.p + (LAYER.worn.includes(s.k) ? 5 : 0) + (s.a && !air ? 2 : 0) - Math.abs((s.d0 + s.d1) / 2 - d) / 150;
    if (air) sc -= s.lines.length > 3 ? 1 : 0;
    if (sc > bs) { bs = sc; best = s; }
  }
  return best;
}
function stepTalk() {
  if (!TALK.on || !TALK.loaded || !AOI.greeted) return;
  const M = QW.mode; if (M !== "walk" && M !== "fly" && M !== "sight") return;
  if (voiceQ || PANEL.cur || !$("#sightBox").hidden) { TALK.idleSince = performance.now(); return; }
  const now = performance.now(); if (now < TALK.nextT) return;
  const s = pickTalk(); if (!s) { TALK.nextT = now + 1500; return; }
  const air = M !== "walk";
  const lines = s.lines.filter(l => !(air && (l.r === "do" || l.r === "see")));
  TALK.spoken.add(s.id); try { sessionStorage.setItem("hk_spoken", JSON.stringify([...TALK.spoken])); } catch { }
  if (!lines.length) return;
  speakLines(lines, null, { talk: s, done: () => { TALK.nextT = performance.now() + 2200 + Math.random() * 2600; TALK.idleSince = performance.now(); } });
}
function syncTalkBtn() { const b = $("#talkBtn"); b.setAttribute("aria-pressed", String(TALK.on)); b.querySelector("span").textContent = TALK.on ? "碧の話：止める" : "碧の話：続ける"; }
$("#talkBtn").addEventListener("click", () => { TALK.on = !TALK.on; syncTalkBtn(); if (!TALK.on && voiceQ?.talk) stopVoice(); else TALK.nextT = performance.now() + 400; });

/* ---------- 碧（共通部品 AoiMotion） ---------- */
const AOI = { root: null, m: null, ready: false, vrm: null, pos: new THREE.Vector3(), focus: null, low: false, greeted: false, loading: null };
function loadAoi() {
  if (AOI.loading) return AOI.loading;
  return AOI.loading = (async () => {
    const [V, buf, Mot, Robe] = await Promise.all([import("@pixiv/three-vrm"), fetch("web/aoi.vrm").then(r => r.arrayBuffer()), import("../kit/aoi_motion.js?v=20261022h"), import("../kit/aoi_robe.js").catch(() => null)]);
    const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); ld.register(p => new V.VRMLoaderPlugin(p));
    const gl = await ld.parseAsync(buf, ""); const v = gl.userData.vrm;
    V.VRMUtils.removeUnnecessaryVertices(gl.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(gl.scene); V.VRMUtils.rotateVRM0(v);
    v.scene.traverse(o => { o.frustumCulled = false; });
    const root = new THREE.Group(); root.name = "aoi"; root.add(v.scene); root.visible = false; world.add(root);
    for (const j of v.springBoneManager?.joints ?? []) j.center = root;
    v.humanoid.resetNormalizedPose(); v.update(0); v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(v.scene), h = box.max.y - box.min.y, sc = h > .5 && Math.abs(h - 1.67) / 1.67 > .02 ? 1.67 / h : 1;
    v.scene.scale.setScalar(sc); v.scene.position.y = -box.min.y * sc;
    try { Robe?.hideCoveredLegs?.(v, { keep: .12 }); } catch { }
    AOI.m = new Mot.AoiMotion(v, { root, posture: "natural", reducedMotion: RM, wind: 0, groundAt: (x, z) => groundY(x, z), quality: MOBILE ? "mid" : "auto" });
    if (AOI.m.robe) AOI.m.robe.wind = .25;
    AOI.root = root; AOI.vrm = v; AOI.ready = true;
    try { root.visible = true; await renderer.compileAsync(root, camera, scene); } catch { } root.visible = QW.mode === "walk";
    window.__aoi = AOI;
  })().catch(e => { console.warn("碧の姿を読み込めませんでした：", e?.message ?? e); });
}
function aoiSpot(out) {   // 見る人の斜め前（道の中心の側）。体の向き（歩く向き）を基準にするので、見回しても碧は動かない
  const f = MOBILE ? 4.0 : 2.4, s = MOBILE ? .62 : 1.1;   // スマホは少し離れて、全身が画面の右寄りに入るように   // 視界のまんなかをあけて、斜め前の端寄りに
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), n = nearestOnLine(CAM.pos.x, CAM.pos.z), a = atD(n.d);
  const rx = -fz, rz = fx, side = PANEL.cur && !MOBILE ? -1 : ((a.x - CAM.pos.x) * rx + (a.z - CAM.pos.z) * rz) >= 0 ? 1 : -1;   // PC で右に札を開いているあいだは、碧は左寄りに（札に隠れない）
  out.set(CAM.pos.x + fx * f + rx * s * side, 0, CAM.pos.z + fz * f + rz * s * side); out.y = groundY(out.x, out.z); return out;
}
function aoiArrive() {
  loadAoi().then(() => {
    if (!AOI.m || QW.mode !== "walk") return;
    aoiSpot(AOI.pos); AOI.m.teleport(AOI.pos.x, AOI.pos.z, Math.atan2(CAM.pos.x - AOI.pos.x, CAM.pos.z - AOI.pos.z)); AOI.root.visible = true;
    if (!AOI.greeted) { AOI.greeted = true; TALK.nextT = performance.now() + 7000; setTimeout(() => { if (QW.mode === "walk" && !PANEL.cur) { speakLines([D.intro], null); setTimeout(() => hintQ(), 5200); } }, 900); }
  });
}
function hintQ() { }
const _ap = new THREE.Vector3();
function stepAoi(dt) {
  if (!AOI.m || !AOI.root.visible) return;
  aoiSpot(_ap);
  const P = AOI.m.pos, dx = _ap.x - P.x, dz = _ap.z - P.z, dist = Math.hypot(dx, dz);
  if (dist > 18) { AOI.m.teleport(_ap.x, _ap.z, CAM.yaw + Math.PI); AOI.v = 0; }
  else {
    const go = WALK.moving ? dist > .25 : dist > (AOI.v > .1 ? .3 : 1.3);
    const want = go ? Math.min(1.6, dist * 1.4 + (WALK.moving ? WALK.speed * .6 : 0)) : 0;
    AOI.v = (AOI.v || 0) + Math.max(-1.8 * dt, Math.min(1.0 * dt, want - (AOI.v || 0)));
    if ((AOI.v > .02 || want > 0) && dist > .01) { const st = Math.min(dist, AOI.v * dt); AOI.m.drive(P.x + dx / dist * st, P.z + dz / dist * st); }
    else { if (AOI.v !== 0 || AOI.m.driven) AOI.m.walkTo(null); AOI.v = 0; AOI.m.faceTo(AOI.focus ? Math.atan2(AOI.focus.x - P.x, AOI.focus.z - P.z) * .4 + Math.atan2(CAM.pos.x - P.x, CAM.pos.z - P.z) * .6 : Math.atan2(CAM.pos.x - P.x, CAM.pos.z - P.z)); }
  }
  // 話していないときは、ときどき近くの物（層の目じるし・木）へ目をやり、また見る人へ戻す（ずっと正面で立ちつくさない）
  AOI.gT = (AOI.gT ?? 5) - dt;
  if (!AOI.focus && AOI.gT <= 0) {
    if (AOI.glance) { AOI.glance = null; AOI.gT = 5 + Math.random() * 6; }
    else { let best = null, bd = 1e9; for (const L of LAYER.objs) { if (!L.root.visible) continue; const d = Math.hypot(L.o.x - P.x, L.o.z - P.z); if (d > 3 && d < 22 && d < bd) { bd = d; best = L; } }
      AOI.glance = best ? best.glyph.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(P.x - Math.sin(CAM.yaw) * 12, P.y + 6 + Math.random() * 4, P.z - Math.cos(CAM.yaw) * 12); AOI.gT = 1.6 + Math.random() * 1.4; }
  }
  if (!AOI.focus) AOI.m.lookAt(AOI.glance || null);
  AOI.m.update(dt, camera);
}

/* ---------- Qualia/sight：生きものを選んで、その身体へ ---------- */
const EXP_FIG = {
  echo: `<figcaption>はね返ってくる音だけで、まわりの形をとらえる。押すたびに前へ音がひろがり、木と地面と建物に当たって戻るまでの時間の順に、点が灯ります。音の速さ（秒速 343 m）で計算し、時間を 16 倍に引きのばした模式です。鳴る音も 16 倍に引きのばした模式の音です。</figcaption>`,
  cones: `<svg viewBox="0 0 320 120" role="img" aria-label="人の三種類と鳥の四種類の錐体の、感じる光の範囲の模式"><defs><linearGradient id="spg" x1="0" x2="1"><stop offset="0" stop-color="#6b4bd8"/><stop offset=".18" stop-color="#5a5cf0"/><stop offset=".38" stop-color="#3fb4e0"/><stop offset=".58" stop-color="#7fe08a"/><stop offset=".78" stop-color="#f2cf5c"/><stop offset="1" stop-color="#ef6a4a"/></linearGradient></defs>
    <rect x="20" y="96" width="280" height="4" fill="url(#spg)" opacity=".85"/><text x="20" y="114" class="t">紫外</text><text x="300" y="114" class="t" text-anchor="end">赤</text>
    <text x="20" y="20" class="t">人：3 種類</text>${[.42, .62, .72].map(c => `<path d="M${20 + 280 * (c - .16)} 52 Q${20 + 280 * c} 18 ${20 + 280 * (c + .16)} 52" class="cu h"/>`).join("")}
    <text x="20" y="66" class="t">鳥：4 種類</text>${[.12, .36, .56, .72].map(c => `<path d="M${20 + 280 * (c - .1)} 92 Q${20 + 280 * c} 64 ${20 + 280 * (c + .1)} 92" class="cu b"/>`).join("")}</svg>
    <figcaption>錐体の数と、感じる光の帯のならび方の模式。山の位置は種や環境で違います（Hart 2001）。画面の色は、人の目への置きかえです。</figcaption>`,
  eye15: `<svg viewBox="0 0 320 70" role="img" aria-label="アオスジアゲハの15種類の光受容細胞が6群に分かれる模式"><defs><linearGradient id="spg2" x1="0" x2="1"><stop offset="0" stop-color="#6b4bd8"/><stop offset=".3" stop-color="#3fb4e0"/><stop offset=".55" stop-color="#7fe08a"/><stop offset=".78" stop-color="#f2cf5c"/><stop offset="1" stop-color="#ef6a4a"/></linearGradient></defs>
    <rect x="20" y="50" width="280" height="4" fill="url(#spg2)" opacity=".85"/>${[[0, 2], [1, 2], [2, 3], [3, 4], [4, 2], [5, 2]].map(([g, n]) => Array.from({ length: n }, (_, k) => `<circle cx="${34 + g * 50 + k * 8}" cy="${32 - (k % 2) * 8}" r="3" class="dt"/>`).join("") + `<text x="${34 + g * 50}" y="66" class="t">${["紫外", "紫", "青", "緑", "橙", "赤"][g]}</text>`).join("")}</svg>
    <figcaption>15 種類の細胞を 6 つの群に分けた、という報告の模式（Chen ほか 2016）。15 の色を見分けるという意味ではありません。複眼の六角の目の並びも模式です。</figcaption>`,
};
const SIGHT = { sp: null, t: 0, pulse: 0, echo: [], post: null, kusu: null, prevExp: 1.02, flap: 0 };
function openSightChooser() {
  const box = $("#sightList"); if (!box.childElementCount) for (const sp of D.sight) {
    const b = document.createElement("button"); b.type = "button"; b.className = "spBtn"; b.dataset.id = sp.id;
    b.innerHTML = `<span class="sk">${sp.en}</span><span class="sn">${sp.name}</span><span class="sl">${sp.lead}</span>`;
    b.addEventListener("click", () => { const L = LAYER.objs.find(l => l.o.sp === sp.id); enterSight(sp, null); });
    box.appendChild(b);
  }
  $("#sightBox").hidden = false;
}
function enterSight(sp, L) {
  hidePanel(); closeTray(); stopVoice(); stopEcho(); WALK.auto = false; syncAutoBtn();
  if (SIGHT.sp) exitSight(true);   // 別の生きものへ：前の見え方を戻してから
  if (!LAYER.worn.includes("sight")) wearLayer("sight", { noChooser: true });
  // その生きものがいる所へ（記録の区間）。犬は見る人のそばで
  let px = CAM.pos.x, pz = CAM.pos.z, yaw = CAM.yaw + CAM.look;
  if (sp.x != null && (sp.move === "swim" || QW.mode === "sky" || !QW.walked || Math.hypot(sp.x - CAM.pos.x, sp.z - CAM.pos.z) > 160)) { px = sp.x; pz = sp.z; yaw = yawAlong(sp.d + 5); }
  if (QW.mode === "sky" && sp.x == null) { const s = D.starts[Math.max(0, START.sel)], a = atD(s.d); px = a.x; pz = a.z; yaw = yawAlong(s.d + 5); }
  let y = groundY(px, pz) + sp.eye; if (sp.move === "swim") { let m = 1e9, far = null, fd = 0; for (const [x, z] of sp.pond) { m = Math.min(m, groundY(x, z)); const d = Math.hypot(x - px, z - pz); if (d > fd) { fd = d; far = [x, z]; } } y = m + .24; const rm = D.structs.find(q => q.id === "romon"); yaw = rm ? Math.atan2(-(rm.p[0] - px), -(rm.p[2] - pz)) : Math.atan2(-(far[0] - px), -(far[1] - pz)); }   // 楼門と社叢の方を向いて浮かぶ
  hideSkyUI(); hideFlyUI(); loadLate(); if (AOI.root) AOI.root.visible = false;
  const from = QW.mode; TWFOG = [from === "sky" ? FOGS.sky() : from === "fly" ? FOGS.fly() : FOGS.walk(), FOGS.walk()]; setMode("descend");
  SIGHT.pending = sp;
  lateP.then(() => tweenTo(new THREE.Vector3(px, y, pz), yaw, sp.move === "crawl" ? -.08 : -.05, from === "sky" ? 2.4 : 1.6, () => {
    CAM.pos.set(px, y, pz); CAM.yaw = yaw; CAM.look = 0; CAM.pitch = sp.move === "crawl" ? -.08 : -.05; SIGHT.sp = sp; SIGHT.t = 0; SIGHT.pending = null;
    setMode("sight"); document.body.dataset.sp = sp.id; showSightUI(sp);
    camera.fov = sp.fov; camera.updateProjectionMatrix();
    setupSightLook(sp);
    if (sp.lines?.length) speakLines(sp.lines, null, { done: () => { TALK.nextT = performance.now() + 3000; } });
  }, from === "sky" ? 0 : 3));
}
function exitSight(quiet = false) {
  const sp = SIGHT.sp; if (!sp) return; SIGHT.sp = null; SIGHT.surf = null; delete document.body.dataset.sp; hideSightUI(); stopEcho();
  teardownSightLook(); camera.fov = MOBILE ? 62 : 55; camera.updateProjectionMatrix();
  if (quiet) return;
  const n = nearestOnLine(CAM.pos.x, CAM.pos.z), d = Math.min(1985, Math.max(-20, n.d)), a = atD(d), y = groundY(a.x, a.z) + EYE;
  TWFOG = [FOGS.walk(), FOGS.walk()]; setMode("descend");
  tweenTo(new THREE.Vector3(a.x, y, a.z), CAM.yaw, -.04, 1.4, () => { CAM.pos.set(a.x, y, a.z); CAM.look = 0; CAM.pitch = -.04; enterWalk(); if (D.say?.back) speakLines([D.say.back], null); }, 2);
}
/* 見え方の模式（人の目への置きかえ）：画面を一度べつの面へ描き、色・ぼけ・明るさだけを置きかえる */
function setupSightLook(sp) {
  const mode = { hiyo: 1, aosuji: 3, mimizu: 4, inu: 5, kaitsuburi: 6 }[sp.id] || 0;   // コウモリは夕方の暗さと反響の点だけ（画面の置きかえはしない）
  if (sp.id === "koumori") {   // 夕方の暗さ：目の手がかりはほとんど使わない模式
    renderer.toneMappingExposure = .24; scene.background = new THREE.Color("#0b1226"); applyFog({ c: new THREE.Color("#0b1226"), n: 20, f: 160 });
  } else if (sp.id === "mimizu") { applyFog({ c: FOG_SKY, n: 4, f: 60 }); }
  else applyFog(FOGS.walk());
  if (sp.id === "aosuji") showKusu(true);
  if (!mode) return;
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(s.x, s.y, { type: THREE.HalfFloatType, samples: MOBILE ? 0 : 4 });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, mode: { value: mode }, res: { value: s.clone() }, time: { value: 0 }, under: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform int mode; uniform vec2 res; uniform float time; uniform float under; varying vec2 vUv;
      vec3 blur(vec2 uv, float r){ vec3 c=vec3(0.); float w=0.; for(int i=-2;i<=2;i++) for(int j=-2;j<=2;j++){ float k=1.-length(vec2(i,j))/3.2; c+=texture2D(tDiffuse, uv+vec2(i,j)*r/res).rgb*k; w+=k; } return c/w; }
      void main(){
        vec2 uv=vUv; vec3 c;
        if(mode==1){   // 鳥：四種類の錐体と油球で色の帯が細くしぼられる、の模式＝色どうしの差を広げる（人の目への置きかえ）
          vec2 q=uv-.5; uv=.5+q*(1.-.06*dot(q,q)); c=texture2D(tDiffuse,uv).rgb; float l=dot(c,vec3(.2126,.7152,.0722)); c=max(vec3(0.),mix(vec3(l),c,1.45));
        } else if(mode==3){   // 蝶：複眼の六角の並び（模式）と、人よりあらい像
          vec2 p=uv*res/ (res.y/90.); vec2 r=vec2(1.,1.732), h=r*.5; vec2 a=mod(p,r)-h, b=mod(p-h,r)-h; vec2 g=dot(a,a)<dot(b,b)?a:b; vec2 cell=(p-g)*(res.y/90.)/res;
          c=blur(cell, 3.); float e=smoothstep(.36,.5,length(g)); c*=1.-.35*e; c=mix(vec3(dot(c,vec3(.333))),c,1.25);
        } else if(mode==4){   // ミミズ：目はない。皮ふで受けとる明るさだけの模式（形はほとんど分からない）
          c=blur(uv, 22.); c=mix(c, blur(uv, 40.), .5); float l=dot(c,vec3(.2126,.7152,.0722)); l=smoothstep(.05,.9,l);   // 形は分からず、明暗のむらだけ c=vec3(l*l*1.1)*vec3(1.,.95,.88);
        } else if(mode==5){   // 犬：二種類の錐体（二色型）の模式。赤と緑の差がなくなる。像は人よりあらい
          c=blur(uv, 1.6); c=max(vec3(0.),vec3(dot(vec3(.367,.861,-.228),c),dot(vec3(.280,.673,.047),c),dot(vec3(-.012,.043,.969),c)));   // Machado ほか（2009）の二色型の置きかえ
        } else if(mode==6){   // カイツブリ：水面と水の中。もぐると、水の色と濁りと、ゆれる光（模式）
          vec2 w=uv+under*vec2(sin(uv.y*40.+time*2.)*.004,cos(uv.x*36.+time*1.7)*.004); c=mix(texture2D(tDiffuse,w).rgb, blur(w,5.), under*.8);
          float l=dot(c,vec3(.33)); c=mix(c, vec3(.05,.16,.14)+l*vec3(.25,.42,.36), under*.85); c+=under*.05*smoothstep(.6,1.,sin(uv.x*30.+time*1.3+sin(uv.y*9.+time))*.5+.5)*(1.-uv.y*.6);
        } else c=texture2D(tDiffuse,uv).rgb;
        float v=smoothstep(.95,.35,length(vUv-.5)); c*=mix(.72,1.,v);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, depthTest: false, depthWrite: false });
  mat.toneMapped = true;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const ps = new THREE.Scene(); ps.add(quad);
  SIGHT.post = { rt, mat, ps, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
}
function teardownSightLook() {
  if (SIGHT.post) { SIGHT.post.rt.dispose(); SIGHT.post.mat.dispose(); SIGHT.post = null; }
  renderer.toneMappingExposure = 1.02; if (QW.skyTex) scene.background = QW.skyTex; applyFog(FOGS.walk()); showKusu(false);
}
function resizePost() { if (!SIGHT.post) return; const s = renderer.getDrawingBufferSize(new THREE.Vector2()); SIGHT.post.rt.setSize(s.x, s.y); SIGHT.post.mat.uniforms.res.value.copy(s); }
/* アオスジアゲハ：幼虫が葉を食べるクスノキに、目じるし（記録の事実＝食べる木。光って見えるのは模式） */
function showKusu(on) {
  if (!on) { if (SIGHT.kusu) SIGHT.kusu.visible = false; return; }
  if (!SIGHT.kusu) {
    const L = TREE.list.filter(t => t.sp === "kusu"), g = new THREE.Group();
    const m = new THREE.SpriteMaterial({ map: glowTex(), color: "#a8f0c8", transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending });
    for (const t of L) { const s = new THREE.Sprite(m); const h = (SPH.kusu || 17) * t.s; s.position.set(t.x, t.y + h * .62, t.z); s.scale.setScalar(h * .55); g.add(s); }
    world.add(g); SIGHT.kusu = g;
  }
  SIGHT.kusu.visible = true;
}
function stepSight(dt) {
  const sp = SIGHT.sp; if (!sp) return; SIGHT.t += dt; const t = SIGHT.t, K = WALK.keys;
  if (sp.move === "trot" || sp.move === "crawl") {   // 歩く身体：見回し・歩きつづける・押した所へ、は人と同じ。目の高さと速さと揺れがちがう
    const bob = sp.move === "trot" ? Math.abs(Math.sin(t * 9.5)) * .03 : 0;
    stepWalk(dt, sp.eye, sp.speed, bob);
    if (sp.move === "crawl") camera.position.y = groundY(camera.position.x, camera.position.z) + sp.eye + Math.sin(t * 2.2) * .004;
    return;
  }
  if (sp.move === "swim") { stepSwim(dt, sp); return; }
  // 飛ぶ身体：参道に沿って前へ。なぞると曲がり、上下する
  let turn = (K.has("a") || K.has("arrowleft") ? 1 : 0) - (K.has("d") || K.has("arrowright") ? 1 : 0), climb = (K.has("w") || K.has("arrowup") || FLY.up ? 1 : 0) - (K.has("s") || K.has("arrowdown") || FLY.down ? 1 : 0);
  if (FLY.drag) { turn += -FLY.drag.dx * 2.4; climb += -FLY.drag.dy * 2.4; }
  const n = nearestOnLine(CAM.pos.x, CAM.pos.z), a = atD(n.d), ty = Math.atan2(-a.tx, -a.tz), dir = Math.cos(wrap(ty - CAM.yaw)) >= 0 ? ty : ty + Math.PI;
  if (!FLY.drag && !turn) turn = Math.max(-1, Math.min(1, wrap(dir - CAM.yaw) * 1.2 - n.dist * .01 * Math.sign(((CAM.pos.x - a.x) * -a.tz + (CAM.pos.z - a.z) * a.tx) * (dir === ty ? 1 : -1))));   // 触れていなければ、参道の上へ寄って進む
  if (sp.move === "echo") turn += Math.sin(t * 1.7) * .3 + Math.sin(t * 4.3) * .2;   // ジグザグに、急に向きを変えて虫を追う
  if (sp.move === "flutter") { turn += Math.sin(t * 2.3) * .5; climb += Math.sin(t * 3.1) * .6; }
  turn = Math.max(-1.4, Math.min(1.4, turn)); climb = Math.max(-1, Math.min(1, climb));
  const rate = sp.move === "echo" ? 1.5 : sp.move === "flutter" ? 1.1 : .7;
  FLY.yawRate += (turn * rate - FLY.yawRate) * Math.min(1, dt * 3); CAM.yaw += FLY.yawRate * dt;
  FLY.climb += (climb * (sp.move === "fly" ? 3 : 1.6) - FLY.climb) * Math.min(1, dt * 2);
  // 羽ばたき：ヒヨドリは羽ばたきと翼を閉じる時間をくり返して波のように飛ぶ（模式）／蝶は小刻み
  let bob = 0, sp2 = sp.speed;
  if (sp.move === "fly") { const ph = (t % 1.9) / 1.9, flap = ph < .55; SIGHT.flap += ((flap ? 1 : 0) - SIGHT.flap) * Math.min(1, dt * 6); bob = flap ? Math.sin(ph / .55 * Math.PI * 7) * .05 : 0; FLY.climb += (flap ? .9 : -1.2) * dt * 2; sp2 *= flap ? 1.05 : .95; }
  if (sp.move === "flutter") bob = Math.sin(t * 52) * .012 + Math.sin(t * 7) * .05;
  if (sp.move === "echo") bob = Math.sin(t * 24) * .02;
  CAM.pos.x += -Math.sin(CAM.yaw) * sp2 * dt; CAM.pos.z += -Math.cos(CAM.yaw) * sp2 * dt; CAM.pos.y += FLY.climb * dt;
  const g = groundY(CAM.pos.x, CAM.pos.z), hi0 = g + sp.eye * 1.7 + 2, lo = Math.max(g + Math.max(.8, sp.eye * .45), sp.move === "flutter" ? 0 : roofAt(CAM.pos.x - Math.sin(CAM.yaw) * 10, CAM.pos.z - Math.cos(CAM.yaw) * 10, 0) + 4), hi = Math.max(hi0, lo + 3);   // 建物にはもぐらない
  if (CAM.pos.y < lo) { CAM.pos.y += (lo - CAM.pos.y) * Math.min(1, dt * 3); FLY.climb = Math.max(FLY.climb, 0); }
  if (CAM.pos.y > hi) { CAM.pos.y += (hi - CAM.pos.y) * Math.min(1, dt * 3); FLY.climb = Math.min(FLY.climb, 0); }
  if (sp.move === "echo" && n.dist > 3) CAM.yaw += wrap(Math.atan2(-(a.x + a.tx * 12 - CAM.pos.x), -(a.z + a.tz * 12 - CAM.pos.z)) * 0 + (Math.atan2(-((a.x + (dir === ty ? 1 : -1) * a.tx * 14) - CAM.pos.x), -((a.z + (dir === ty ? 1 : -1) * a.tz * 14) - CAM.pos.z))) - CAM.yaw) * Math.min(1, dt * .9);   // 並木の幹のあいだ（参道の上の空）を飛ぶ
  if (n.dist > (sp.move === "flutter" ? 24 : 40)) { CAM.yaw += wrap(Math.atan2(-(a.x - CAM.pos.x), -(a.z - CAM.pos.z)) - CAM.yaw) * Math.min(1, dt * 1.2); }
  if (n.d > 2005 || n.d < -30) CAM.yaw += wrap(Math.atan2(-(atD(1000).x - CAM.pos.x), -(atD(1000).z - CAM.pos.z)) - CAM.yaw) * Math.min(1, dt * 1.5);
  FLY.roll += (-FLY.yawRate * (sp.move === "fly" ? .35 : .2) - FLY.roll) * Math.min(1, dt * 3);
  camera.position.copy(CAM.pos); camera.position.y += bob;
  camera.quaternion.setFromEuler(_eu.set(-.06 + FLY.climb * .03, CAM.yaw, FLY.roll));
  if (sp.move === "echo") stepEcho(dt);
}
/* カイツブリ：神池の水面を泳ぎ、「下へ」でもぐる（池の形から出ない） */
function inPoly(x, z, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / ((b[1] - a[1]) || 1e-9) + a[0]) c = !c; } return c; }
function stepSwim(dt, sp) {
  const P = sp.pond, K = WALK.keys; if (SIGHT.surf == null) { let y = 1e9; for (const [x, z] of P) y = Math.min(y, groundY(x, z)); SIGHT.surf = y + .12; SIGHT.dive = 0; }
  let turn = (K.has("a") || K.has("arrowleft") ? 1 : 0) - (K.has("d") || K.has("arrowright") ? 1 : 0); if (FLY.drag) turn += -FLY.drag.dx * 2;
  turn += Math.sin(SIGHT.t * .7) * .25; FLY.yawRate += (Math.max(-1, Math.min(1, turn)) * .8 - FLY.yawRate) * Math.min(1, dt * 2); CAM.yaw += FLY.yawRate * dt;
  const want = FLY.down || K.has("s") || K.has("arrowdown") ? 1 : FLY.up || K.has("w") || K.has("arrowup") ? 0 : SIGHT.dive > .5 && SIGHT.t - (SIGHT.dT || 0) > 6 ? 0 : SIGHT.dive;
  if (want > SIGHT.dive && SIGHT.dive < .05) SIGHT.dT = SIGHT.t; SIGHT.dive += (want - SIGHT.dive) * Math.min(1, dt * 1.6);
  const sp2 = sp.speed * (1 + SIGHT.dive * .6), nx = CAM.pos.x - Math.sin(CAM.yaw) * sp2 * dt, nz = CAM.pos.z - Math.cos(CAM.yaw) * sp2 * dt;
  if (inPoly(nx, nz, P)) { CAM.pos.x = nx; CAM.pos.z = nz; } else CAM.yaw += Math.PI * .6 * dt * 3;
  if (!inPoly(CAM.pos.x, CAM.pos.z, P)) { CAM.pos.x += (sp.x - CAM.pos.x) * dt; CAM.pos.z += (sp.z - CAM.pos.z) * dt; }
  CAM.pos.y = SIGHT.surf + .12 - SIGHT.dive * .85 + Math.sin(SIGHT.t * 2.4) * .01 * (1 - SIGHT.dive);
  camera.position.copy(CAM.pos); camera.quaternion.setFromEuler(_eu.set(-.04 - SIGHT.dive * .25, CAM.yaw, FLY.yawRate * .05));
  if (SIGHT.post) SIGHT.post.mat.uniforms.under.value = Math.min(1, Math.max(0, (SIGHT.surf - CAM.pos.y) / .2));
}
/* コウモリ：前へ音を出し、はね返りの点が戻る時間の順に灯る（16 倍に引きのばした模式） */
function emitEcho() {
  const src = camera.position.clone(), fw = camera.getWorldDirection(new THREE.Vector3()), N = MOBILE ? 260 : 520, hits = [];
  const near = TREE.list.filter(t => (t.x - src.x) ** 2 + (t.z - src.z) ** 2 < 45 * 45);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i + .5) / N * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996, dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    if (dir.dot(fw) < .35) continue;   // 声は前へ向けて出す
    let best = 45;
    if (dir.y < -.02) { const tt = (groundY(src.x, src.z) - src.y) / dir.y; if (tt > 0) best = Math.min(best, tt); }
    for (const t of near) { const h = (SPH[t.sp] || 14) * t.s, c = _v3.set(t.x, t.y + h * .62, t.z), rad = (TREE.protos[t.sp]?.w || h * .7) * .45 * t.s, oc = src.clone().sub(c), b = oc.dot(dir), cc = oc.lengthSq() - rad * rad, disc = b * b - cc; if (disc > 0) { const tt = -b - Math.sqrt(disc); if (tt > .5 && tt < best) best = tt; } }
    for (let s = 4; s < best; s += 4) { const p = src.clone().addScaledVector(dir, s); if (p.y < roofAt(p.x, p.z, 0) && roofAt(p.x, p.z, 0) > groundY(p.x, p.z) + 2) { best = s; break; } }
    if (best < 45) hits.push({ p: src.clone().addScaledVector(dir, best), d: best });
  }
  hits.sort((a, b) => a.d - b.d);
  const pos = new Float32Array(hits.length * 3); hits.forEach((h, i) => pos.set([h.p.x, h.p.y, h.p.z], i * 3));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setDrawRange(0, 0);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex(), color: "#ece6ff", size: MOBILE ? 1.0 : .8, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  world.add(pts); SIGHT.echo.push({ pts, hits, t: 0 }); chirp();
}
function stepEcho(dt) {
  SIGHT.pulse -= dt; if (SIGHT.pulse <= 0) { SIGHT.pulse = .85; emitEcho(); }
  const c = 343 / 16;
  for (const E of SIGHT.echo) {
    E.t += dt; const back = E.t * c / 2; let n = 0; while (n < E.hits.length && E.hits[n].d < back) n++; E.pts.geometry.setDrawRange(0, n);
    E.pts.material.opacity = Math.max(0, 1 - Math.max(0, E.t - 3.2) / 1.6);
  }
  while (SIGHT.echo.length && SIGHT.echo[0].t > 4.8) { const E = SIGHT.echo.shift(); world.remove(E.pts); E.pts.geometry.dispose(); E.pts.material.dispose(); }
}
function stopEcho() { for (const E of SIGHT.echo) { world.remove(E.pts); E.pts.geometry.dispose(); E.pts.material.dispose(); } SIGHT.echo.length = 0; }
let AC = null;
function chirp() {   // 9〜11 ミリ秒の、高さがゆるやかに変わる音を、16 倍に引きのばして耳に届く高さにした模式の音
  if (!soundOn) return;
  try { const ac = AC ||= new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = "sine"; o.frequency.setValueAtTime(3000, t); o.frequency.exponentialRampToValueAtTime(2600, t + .16);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + .17); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .2); } catch { }
}
function showSightUI(sp) {
  $("#sightUI").hidden = false; $("#sName").textContent = sp.name; $("#sEn").textContent = sp.en; $("#sLead").textContent = sp.lead;
  $("#walkUI").hidden = !(sp.move === "trot" || sp.move === "crawl"); $("#flyUI").hidden = true; $("#sUpDn").hidden = sp.move === "trot" || sp.move === "crawl";
  $("#sUp").textContent = sp.move === "swim" ? "水面へ" : "上へ"; $("#sDown").textContent = sp.move === "swim" ? "もぐる" : "下へ";
}
function hideSightUI() { $("#sightUI").hidden = true; $("#sUpDn").hidden = true; }
$("#sBack").addEventListener("click", () => exitSight());
$("#sWhy").addEventListener("click", () => {
  const sp = SIGHT.sp; if (!sp) return; const g = GL.sight;
  openPanel({ color: g.color, layer: `${String(layerNo("sight")).padStart(2, "0")}　Qualia/sight`, title: sp.name + "の手がかり", lines: [], more: [...sp.body, ...(sp.place?.length ? ["── この参道とのつながり", ...sp.place] : [])], src: [...sp.src, ...(sp.psrc || []).filter(x => !sp.src.some(y => y.t === x.t))], note: sp.note, how: "研究の知見（ほかの場所で調べられたこと）", figs: EXP_FIG[sp.fig] || "" });
});

/* ---------- Qualia/sound：参道の時代ごとの音を、その場所に重ね、形にする ----------
   どの音も、この作品の中で組み立てる（録音は使わない）。葉ずれと神池のしずくは近づくと小さく鳴り、境内では一歩ごとに玉砂利が鳴る。
   元往還の人と馬・中の区間の車は、物に触れたときに、その時代の音として鳴る。碧が話しているあいだは小さくする。 */
const SND = { ac: null, out: null, an: null, live: {}, viz: null, step: 0, freq: null, wave: null, seq: [], buf: {}, loading: {}, tag: null, tagUntil: 0 };
function sndBuf(it) {   // 録音（ほかの場所で録った同じ種類の音）は、近づいたときに一本ずつ読む
  if (SND.buf[it.id] || SND.loading[it.id]) return SND.buf[it.id] || null; const ac = sndCtx(); if (!ac) return null;
  SND.loading[it.id] = fetch(it.f).then(r => r.arrayBuffer()).then(ab => new Promise((ok, ng) => ac.decodeAudioData(ab, ok, ng))).then(b => { SND.buf[it.id] = b; return b; }).catch(e => console.warn("snd", it.id, e));
  return null;
}
function showTag(it, sec) { SND.tag = it; SND.tagUntil = performance.now() + sec * 1000; }
function sndCtx() {
  if (SND.ac) { if (SND.ac.state !== "running") SND.ac.resume().catch(() => { }); return SND.ac; }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
  const ac = SND.ac = AC = AC || new C(); SND.out = ac.createGain(); SND.out.gain.value = .9;
  SND.an = ac.createAnalyser(); SND.an.fftSize = 512; SND.an.smoothingTimeConstant = .7;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6;
  SND.out.connect(comp); comp.connect(SND.an); SND.an.connect(ac.destination);
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { }
  return ac;
}
let NOISE = null;
function noise() { const ac = SND.ac; if (!NOISE) { NOISE = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(); s.buffer = NOISE; s.loop = true; return s; }
function burst(dest, t, f, q, a, dec, len = .04) { const ac = SND.ac, s = noise(), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .002); g.gain.exponentialRampToValueAtTime(.0005, t + dec); s.connect(bp).connect(g).connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + Math.max(len, dec) + .02); }
function sndOn() { return soundOn && LAYER.worn.includes("sound") && (QW.mode === "walk" || QW.mode === "sight"); }
function stepSoundscape(dt) {
  const on = sndOn(), cp = camera.position, vy = CAM.yaw + CAM.look, duck = voiceQ ? .35 : 1;
  for (const it of D.sound) {
    if (!it.r) continue;
    const dist = Math.hypot(it.x - cp.x, it.z - cp.z), near = on && dist < it.r, L = SND.live[it.id];
    if (near && !L) {
      const ac = sndCtx(); if (!ac || ac.state !== "running") continue;
      const g = ac.createGain(); g.gain.value = 0; const pn = ac.createStereoPanner ? ac.createStereoPanner() : null; (pn ? (g.connect(pn), pn) : g).connect(SND.out);
      const L2 = SND.live[it.id] = { g, pn, it, next: 0 };
      if (it.kind === "rec") { const b = sndBuf(it); if (!b) { g.disconnect(); delete SND.live[it.id]; continue; } const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.connect(g); s.start(); L2.s = s; }
      if (it.kind === "leaves") { const s = noise(), hp = ac.createBiquadFilter(), bp = ac.createBiquadFilter(), am = ac.createGain(); hp.type = "highpass"; hp.frequency.value = 1400; bp.type = "peaking"; bp.frequency.value = 4200; bp.gain.value = 6; am.gain.value = .0; s.connect(hp).connect(bp).connect(am).connect(g); s.start(); L2.s = s; L2.am = am; L2.gust = 0; }
    } else if (L && !near) {
      const t = SND.ac.currentTime; L.g.gain.setTargetAtTime(0, t, .25); setTimeout(() => { try { L.s?.stop(); L.g.disconnect(); } catch { } }, 1200); delete SND.live[it.id];
    }
    const L2 = SND.live[it.id]; if (!L2) continue;
    const k = Math.max(0, 1 - dist / it.r), ang = Math.atan2(it.x - cp.x, it.z - cp.z), t = SND.ac.currentTime;
    L2.g.gain.setTargetAtTime((it.kind === "rec" ? .6 : .75) * k * k * duck, t, .3); if (k > .25) showTag(it, .5);
    if (L2.pn) L2.pn.pan.setTargetAtTime(Math.max(-.9, Math.min(.9, -Math.sin(ang - vy - Math.PI) * .9)), t, .1);
    if (it.kind === "water") { L2.next -= dt; if (L2.next <= 0) { drop(L2.g); L2.next = .12 + Math.random() * .7; } }
    if (it.kind === "leaves") { L2.next -= dt; if (L2.next <= 0) { L2.gust = .25 + Math.random() * .75; L2.next = 1.5 + Math.random() * 3.5; } L2.am.gain.setTargetAtTime(.05 + .32 * L2.gust, t, .9); L2.gust *= Math.exp(-dt * .5); SND.pulse = Math.max(SND.pulse || 0, L2.gust * .5); }
  }
  if (on && WALK.moving && QW.mode === "walk") { const n = nearestOnLine(cp.x, cp.z); if (n.d > 1897) { SND.step += dt; if (SND.step > .56) { SND.step = 0; gravelStep(); SND.stepRing = { x: CAM.pos.x, z: CAM.pos.z, t: 0 }; } } }
  stepViz(dt);
  const tg = $("#sndTag"), show = SND.tag && performance.now() < SND.tagUntil && LAYER.worn.includes("sound") && QW.mode !== "sight";   // 生きものの身体のあいだは、音の札を出さない
  if (show) { if (tg.dataset.id !== SND.tag.id) { tg.dataset.id = SND.tag.id; tg.textContent = SND.tag.label || ""; tg.dataset.k = SND.tag.kind === "rec" ? "rec" : /^poem/.test(SND.tag.kind) ? "poem" : "re"; } tg.hidden = false; } else if (!tg.hidden) { tg.hidden = true; tg.dataset.id = ""; }
}
function drop(dest, big = 1) {   // しずく：泡がふるえて鳴る音（Minnaert の共鳴 f≈3.26/半径。半径 1〜4 mm で 0.8〜3.3 kHz）。泡が水面へ上がるにつれて高さが少し上がる
  const ac = SND.ac, t = ac.currentTime + .01, r = (1 + Math.random() * 3) / 1000, f = 3.26 / r, o = ac.createOscillator(), g = ac.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + .05);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25 * big, t + .003); g.gain.exponentialRampToValueAtTime(.0005, t + .04 + r * 12);
  o.connect(g).connect(dest); o.start(t); o.stop(t + .12); SND.pulse = Math.max(SND.pulse || 0, .6 * big);
}
function gravelStep(gain = .5, dest) {   // 玉砂利：たくさんの小石がぶつかる短い音の粒を、一歩の 0.12 秒に重ねる（PhISM の考え方）
  const ac = sndCtx(); if (!ac || ac.state !== "running") return;
  const t0 = ac.currentTime + .01, N = 18 + (Math.random() * 10 | 0), vg = ac.createGain(); vg.gain.value = gain * (voiceQ ? .5 : 1); vg.connect(dest || SND.out);
  for (let i = 0; i < N; i++) burst(vg, t0 + Math.pow(Math.random(), 1.6) * .13, 1800 + Math.random() * 4200, 2 + Math.random() * 4, .3 + Math.random() * .7, .006 + Math.random() * .012, .03);
  SND.pulse = 1;
}
function hoof(t, dest, a = .5) {   // 土の道の蹄：低いどすっ（120〜200 Hz）と、砂のこすれ
  const ac = SND.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(95, t + .07);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .004); g.gain.exponentialRampToValueAtTime(.0005, t + .12); o.connect(g).connect(dest); o.start(t); o.stop(t + .15);
  burst(dest, t, 900, 1.2, a * .5, .06);
}
function step(t, dest, a = .35) { burst(dest, t, 500, .9, a, .08); burst(dest, t + .03, 1600, 1.5, a * .35, .05); }
function playItem(it) {   // 物に触れたとき：その音を、はっきり（鳴るあいだ、音の札を出す）
  const ac = sndCtx(); if (!ac) return; stopSound(); const bus = ac.createGain(); bus.gain.value = 1; bus.connect(SND.out); SND.bus = bus; const t0 = ac.currentTime + .05;
  showTag(it, { ourai: 8.5, kuruma: 13, rec: 9, poem: 10, poem2: 10 }[it.kind] || 5);
  if (it.kind === "rec") { const go = b => { if (!b || SND.bus !== bus) return; const s = ac.createBufferSource(); s.buffer = b; s.connect(bus); s.start(); }; const b = SND.buf[it.id]; if (b) go(b); else { sndBuf(it); SND.loading[it.id]?.then(go); } return; }
  if (it.kind === "poem") {   // 詩の音：山の千年が、参道に立っている音（木の胴の響き＝ゆっくり減る低い倍音と、高い所の風）
    const base = 98; for (let k = 0; k < 5; k++) { const t = t0 + k * 1.7; for (const [m, a] of [[1, .22], [2.76, .1], [5.4, .05], [8.9, .025]]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = base * m * (1 + k * .002); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + 3.5 / m + .4); o.connect(g).connect(bus); o.start(t); o.stop(t + 4); } }
    const s = noise(), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = "bandpass"; bp.frequency.value = 3600; bp.Q.value = .7; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.08, t0 + 3); g.gain.linearRampToValueAtTime(0, t0 + 9.5); s.connect(bp).connect(g).connect(bus); s.start(t0); s.stop(t0 + 9.6);
    SND.seq.push(setInterval(() => { SND.pulse = 1; }, 1700)); setTimeout(() => SND.seq.forEach(clearInterval), 9000); return;
  }
  if (it.kind === "poem2") {   // 詩の音：台地の水が、見沼へ向かっていた音（湧くしずくが、低い流れへ集まり、右へ流れていく）
    const pn = ac.createStereoPanner ? ac.createStereoPanner() : null; const dst = pn ? (pn.connect(bus), pn) : bus; if (pn) { pn.pan.setValueAtTime(-.8, t0); pn.pan.linearRampToValueAtTime(.8, t0 + 9); }
    for (let i = 0; i < 22; i++) SND.seq.push(setTimeout(() => drop(dst, .8), i * 260 + Math.random() * 200));
    const s = noise(), lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = "lowpass"; lp.frequency.setValueAtTime(300, t0); lp.frequency.linearRampToValueAtTime(900, t0 + 6); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.18, t0 + 5); g.gain.linearRampToValueAtTime(0, t0 + 9.5); s.connect(lp).connect(g).connect(dst); s.start(t0); s.stop(t0 + 9.6); return;
  }
  if (it.kind === "gravel") { for (let i = 0; i < 6; i++) SND.seq.push(setTimeout(() => gravelStep(.6, bus), i * 560)); return; }
  if (it.kind === "water") { for (let i = 0; i < 16; i++) SND.seq.push(setTimeout(() => drop(bus, 1), i * 180 + Math.random() * 120)); return; }
  if (it.kind === "leaves") { const s = noise(), hp = ac.createBiquadFilter(), g = ac.createGain(); hp.type = "highpass"; hp.frequency.value = 1400; g.gain.setValueAtTime(0, t0); for (let k = 0; k < 6; k++) g.gain.linearRampToValueAtTime(.12 + .3 * Math.random(), t0 + .8 + k * 1.1); g.gain.linearRampToValueAtTime(0, t0 + 8); s.connect(hp).connect(g).connect(bus); s.start(t0); s.stop(t0 + 8.2); SND.pulse = 1; return; }
  if (it.kind === "ourai") {   // 人の歩み（およそ 1.8 歩／秒）と、馬の並足（四拍子・一周およそ 1.1 秒）
    for (let k = 0; k < 14; k++) step(t0 + k * .55, bus, .3);
    for (let c = 0; c < 7; c++) for (let j = 0; j < 4; j++) hoof(t0 + .3 + c * 1.1 + j * .275 + (Math.random() - .5) * .02, bus, j % 2 ? .38 : .45);
    SND.seq.push(setInterval(() => { SND.pulse = 1; }, 275)); setTimeout(() => SND.seq.forEach(clearInterval), 8200); return;
  }
  if (it.kind === "kuruma") {   // およそ 19 秒に 1 台を、6 倍に縮めて（約 3.2 秒に 1 台）。近づいて遠ざかる音
    for (let k = 0; k < 4; k++) { const t = t0 + k * 3.2, s = noise(), lp = ac.createBiquadFilter(), g = ac.createGain(), o = ac.createOscillator(), og = ac.createGain();
      lp.type = "lowpass"; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2200, t + 1.2); lp.frequency.linearRampToValueAtTime(400, t + 2.6);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 2.7); s.connect(lp).connect(g).connect(bus); s.start(t); s.stop(t + 2.8);
      o.type = "sawtooth"; o.frequency.setValueAtTime(62, t); o.frequency.linearRampToValueAtTime(58, t + 1.2); o.frequency.linearRampToValueAtTime(48, t + 2.6); og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(.05, t + 1.2); og.gain.linearRampToValueAtTime(0, t + 2.7); o.connect(og).connect(bus); o.start(t); o.stop(t + 2.8); }
    SND.seq.push(setInterval(() => { SND.pulse = .8; }, 400)); setTimeout(() => SND.seq.forEach(clearInterval), 13000); return;
  }
}
/* 音の形：いちばん近い鳴っている所のまわりに、64 本の光の柱（周波数ごとの大きさ）と、音の大きさでひろがる輪 */
const _sm = new THREE.Matrix4(), _sq = new THREE.Quaternion(), _ss = new THREE.Vector3(), _sp = new THREE.Vector3();
function ensureViz() {
  if (SND.viz) return SND.viz; const g = new THREE.Group(), N = 64, c = new THREE.Color(GL.sound.color);
  const bar = new THREE.BoxGeometry(.035, 1, .035); bar.translate(0, .5, 0);
  const im = new THREE.InstancedMesh(bar, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }), N); im.frustumCulled = false; g.add(im);
  const rings = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.98, 1, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false })); g.add(r); rings.push({ r, k: i / 3 }); }
  const step = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false })); world.add(step);
  g.visible = false; world.add(g); return SND.viz = { g, im, rings, N, step };
}
function stepViz(dt) {
  if (!SND.an || !LAYER.worn.includes("sound")) { if (SND.viz) SND.viz.g.visible = SND.viz.step.visible = false; return; }
  const V = ensureViz(), cp = camera.position;
  let tgt = null, bd = 1e9; for (const id in SND.live) { const it = SND.live[id].it, d = Math.hypot(it.x - cp.x, it.z - cp.z); if (d < bd) { bd = d; tgt = it; } }
  if (PANEL.cur?.o.snd) tgt = PANEL.cur.o.snd;
  SND.pulse = Math.max(0, (SND.pulse || 0) - dt * 2.5);
  const f = SND.freq ||= new Uint8Array(SND.an.frequencyBinCount), w = SND.wave ||= new Uint8Array(SND.an.fftSize); SND.an.getByteFrequencyData(f); SND.an.getByteTimeDomainData(w);
  let s2 = 0; for (let i = 0; i < w.length; i++) { const v = (w[i] - 128) / 128; s2 += v * v; } const lv = Math.min(1, Math.sqrt(s2 / w.length) * 7 + SND.pulse * .4);
  V.g.visible = !!tgt;
  if (tgt) {
    V.g.position.set(tgt.x, tgt.y + .05, tgt.z); V.g.rotation.y += dt * .2;
    for (let i = 0; i < V.N; i++) { const b = Math.floor(Math.pow(i / V.N, 1.8) * f.length * .7) + 1, v = f[b] / 255, a = i / V.N * Math.PI * 2, r = 1.25;
      _sm.compose(_sp.set(Math.cos(a) * r, 0, Math.sin(a) * r), _sq.setFromAxisAngle(_up, -a), _ss.set(1, .04 + v * 2.8, 1)); V.im.setMatrixAt(i, _sm); }
    V.im.instanceMatrix.needsUpdate = true;
    for (const R of V.rings) { R.k = (R.k + dt * .4) % 1; R.r.scale.setScalar(1.3 + R.k * 9); R.r.material.opacity = (1 - R.k) * .5 * lv; }
  }
  const S = SND.stepRing; if (S) { S.t += dt; V.step.visible = S.t < 1; V.step.position.set(S.x, groundY(S.x, S.z) + .04, S.z); V.step.scale.setScalar(.3 + S.t * 3.2); V.step.material.opacity = Math.max(0, .7 * (1 - S.t)); }
}
function openSound(L) {
  const it = L.o.snd, g = GL.sound;
  openPanel({ color: g.color, layer: `${String(layerNo("sound")).padStart(2, "0")}　Qualia/sound　${it.era}`, title: it.title, lines: it.lines, more: [it.label, it.how], src: it.src, ll: it.ll,
    how: it.kind === "rec" ? "ほかの場所で録った同じ種類の音（録音の出どころは下）" : /^poem/.test(it.kind) ? "詩の音（実在の音ではありません）" : "再現音（記録にもとづいて組み立てた音）",
    buttons: [{ label: "もう一度鳴らす", primary: true, run: () => playItem(it) }] });
  speakLines(it.lines, L); playItem(it);
}
function stopSound() { SND.seq.forEach(x => { clearTimeout(x); clearInterval(x); }); SND.seq.length = 0; if (SND.bus) { try { SND.bus.gain.setTargetAtTime(0, SND.ac.currentTime, .1); const b = SND.bus; setTimeout(() => b.disconnect(), 600); } catch { } SND.bus = null; } }

/* ---------- Qualia/touch：参道の足もとと物に触れる（振動と音で手ざわり。iPhone は光の輪と音） ----------
   面の写真の凹凸（法線の地図）を指でなぞり、凹凸が変わるところで震え、その物らしい音の粒が鳴る。手ざわりの値は模式。 */
const TMAT = {   // 硬さ（音の高さと短さ）・粒（小石のかちかち）・強さ
  gravel: { f: 3200, q: 3, dec: .012, grain: .8, gain: 1.2, tap: "click" }, granite: { f: 4200, q: 2, dec: .008, grain: .05, gain: .7, tap: "stone" },
  pervious: { f: 3600, q: 2.5, dec: .01, grain: .45, gain: 1, tap: "stone" }, stone: { f: 2600, q: 2, dec: .012, grain: .15, gain: .9, tap: "stone" },
  soil: { f: 700, q: .8, dec: .04, grain: .1, gain: .9, tap: "thud" }, bark: { f: 1600, q: 1.2, dec: .025, grain: .2, gain: 1, tap: "wood" }, leaves: { f: 5200, q: .9, dec: .03, grain: .9, gain: 1.1, tap: "crackle" } };
const TCH = { cur: null, map: null };
function loadNormal(it) {
  const N = 128, use = (src, lum) => new Promise(res => { const im = new Image(); im.onload = () => { const cv = document.createElement("canvas"); cv.width = cv.height = N; const x = cv.getContext("2d"); x.drawImage(im, 0, 0, N, N); const d = x.getImageData(0, 0, N, N).data, h = new Float32Array(N * N);
      for (let i = 0; i < N * N; i++) h[i] = lum ? (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 765 : Math.hypot(d[i * 4] - 128, d[i * 4 + 1] - 128) / 128; res({ N, h }); }; im.onerror = () => res(null); im.src = src; });
  return it.tex === "leaves" ? use(BASE + "touch/leaves_c.webp", true) : use(BASE + "touch/" + it.tex + "_n.webp", false);
}
function openTouch(L) {
  const it = L.o.tch, g = GL.touch;
  openPanel({ color: g.color, layer: `${String(layerNo("touch")).padStart(2, "0")}　Qualia/touch`, title: it.title, lines: it.lines, src: it.src, ll: it.ll,
    how: "手ざわり（硬さ・凹凸・粒）と音は、面の写真の凹凸から、この作品の中で組み立てた模式です" });
  const ex = $("#pExp"); ex.hidden = false;
  ex.insertAdjacentHTML("afterbegin", `<div class="tpad" id="tpad" style="background-image:url(${BASE}touch/${it.tex}_c.webp)"><span>指（マウス）でなでる・押す</span><i id="tring"></i></div>`);
  TCH.cur = it; speakLines(it.lines, L); loadNormal(it).then(m => { if (TCH.cur === it) { TCH.map = m; bindPad(it); } });
}
function bindPad(it) {
  const pad = $("#tpad"), M = TMAT[it.m] || TMAT.stone; if (!pad) return; let last = null, down = false, prevH = 0, lastPulse = 0;
  const vib = ms => { try { navigator.vibrate?.(ms); } catch { } };
  const hAt = (u, v) => { const m = TCH.map; if (!m) return 0; const N = m.N, i = ((u * 2 % 1 + 1) % 1 * (N - 1)) | 0, j = ((v * 2 % 1 + 1) % 1 * (N - 1)) | 0; return m.h[j * N + i]; };
  const grain = (amp, spd) => { const ac = sndCtx(); if (!ac || !soundOn) return; const t = ac.currentTime + .005, f = M.f * (.75 + Math.min(1, spd / 600) * .6) * (.9 + Math.random() * .2);
    burst(SND.out, t, f, M.q, Math.min(.9, amp * M.gain * .7), M.dec * (1.4 - Math.min(1, spd / 800) * .5));
    if (Math.random() < M.grain) burst(SND.out, t + Math.random() * .02, f * 1.4, 4, amp * .5, .006); };
  const tap = () => { const ac = sndCtx(); if (!ac || !soundOn) return; const t = ac.currentTime + .005;
    if (M.tap === "stone" || M.tap === "click") { for (const [f, a, d] of [[1900, .4, .05], [3100, .25, .03], [4700, .15, .02]]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f * (.9 + Math.random() * .2); g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(g).connect(SND.out); o.start(t); o.stop(t + d + .02); } if (M.tap === "click") gravelStep(.5); }
    else if (M.tap === "wood") { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(260, t + .08); g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.0005, t + .12); o.connect(g).connect(SND.out); o.start(t); o.stop(t + .14); burst(SND.out, t, 1500, 1, .2, .03); }
    else if (M.tap === "thud") { hoof(t, SND.out, .4); }
    else { for (let i = 0; i < 12; i++) burst(SND.out, t + Math.random() * .12, 3000 + Math.random() * 4000, 1.5, .3, .01); } };
  const pos = e => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, performance.now()]; };
  pad.addEventListener("pointerdown", e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); sndCtx(); down = true; last = pos(e); prevH = hAt(last[0], last[1]); vib(14); tap(); touchRing(.9, last); });
  pad.addEventListener("pointermove", e => { if (!down || !last) return; const p = pos(e), dt = Math.max(1, p[2] - last[2]), px = Math.hypot(p[0] - last[0], p[1] - last[1]) * pad.clientWidth, spd = px / dt * 1000;
    let acc = 0; const n = Math.min(12, Math.max(1, px / 3 | 0)); for (let k = 1; k <= n; k++) { const h = hAt(last[0] + (p[0] - last[0]) * k / n, last[1] + (p[1] - last[1]) * k / n); acc += Math.abs(h - prevH); prevH = h; }
    const amp = Math.min(1, acc * 2.2 * (.4 + Math.min(1, spd / 400)));
    if (amp > .05 && p[2] - lastPulse > 42) { lastPulse = p[2]; vib(Math.round(6 + 26 * amp)); grain(amp, spd); touchRing(amp, p); }
    last = p; });
  const up = () => { down = false; try { navigator.vibrate?.(0); } catch { } };
  pad.addEventListener("pointerup", up); pad.addEventListener("pointercancel", up);
}
function touchRing(amp, p) { const r = $("#tring"); if (!r) return; if (p) { r.style.left = (p[0] * 100) + "%"; r.style.top = (p[1] * 100) + "%"; } r.style.opacity = Math.min(1, .3 + amp); r.style.transform = `translate(-50%,-50%) scale(${.6 + amp * 1.4})`; clearTimeout(r._t); r._t = setTimeout(() => { r.style.opacity = 0; }, 160); }

/* ---------- Qualia/sho：上原光瑛の書を参道に浮かべる（共通部品 sho3d.js）。近づくと粒にほどけ、音が鳴り、触れると震える ----------
   書は層を重ねていて、60 m 以内に来たときにだけ読む・描く（遠い書は描かない）。題と場所の結びつけは作品としての解釈。 */
const SHO = { mod: null, loading: null, live: {}, near: null };
function loadShoMod() { return SHO.loading ||= import("./sho/sho3d.js").then(m => { SHO.mod = m; return m; }).catch(e => console.warn("sho", e)); }
function stepSho(dt) {
  const list = D.sho || [], on = LAYER.worn.includes("sho") && (QW.mode === "walk" || QW.mode === "sight" || QW.mode === "fly"), cp = camera.position, t = performance.now() / 1000;
  for (const it of list) {
    const dist = Math.hypot(it.x - cp.x, it.z - cp.z), want = on && dist < 60, S = SHO.live[it.id];
    if (want && !S) {
      if (!SHO.mod) { loadShoMod(); continue; }
      if (SHO.live[it.id] === undefined) { SHO.live[it.id] = null; SHO.mod.loadShoMap(it.src).then(map => {
        const sho = SHO.mod.createSho(THREE, map, { width: 2.2, particleMode: "ink", mobile: MOBILE });
        const n = nearestOnLine(it.x, it.z), a = atD(n.d); sho.group.position.set(it.x, it.y + 1.6, it.z); sho.group.rotation.y = Math.atan2(a.x - it.x, a.z - it.z);   // 参道の方を向く
        sho.setScale(innerHeight * renderer.getPixelRatio() * .9); world.add(sho.group);
        const ac = sndCtx(); const snd = ac ? SHO.mod.createShoSound(it.preset, { context: ac, destination: SND.out, volume: .45 }) : null;
        SHO.live[it.id] = { sho, snd, it, hold: 0 };
      }).catch(e => console.warn("sho map", e)); }
      continue;
    }
    if (!S) continue;
    S.sho.group.visible = want;
    if (!want) { S.snd?.stop(); continue; }
    if (S.snd && soundOn && !S.snd.running && SND.ac?.state === "running") S.snd.start();
    if (S.snd && !soundOn && S.snd.running) S.snd.stop();
    S.hold = Math.max(0, S.hold - dt);
    S.sho.target = S.hold > 0 ? 1 : dist < 7 ? .85 : 0;   // 近づくとほどける
    S.sho.update(dt, t); if (S.snd) { S.snd.update(S.sho.state, dt); S.sho.setLevel(S.snd.level); S.snd.gain(Math.max(0, 1 - dist / 40) * (voiceQ ? .4 : 1)); }
  }
}
function openSho(L) {
  const it = L.o.sho, g = GL.sho;
  openPanel({ color: g.color, layer: `${String(layerNo("sho")).padStart(2, "0")}　Qualia/sho`, title: `《${it.title}》`, lines: [],
    more: ["上原光瑛の書。墨の形を 3D の起伏にし、近づくと筆の向きに沿って粒にほどけ、また集まります。音は、ほどける速さに合わせて、その場で組み立てています。", "置いた場所：" + it.why + "（題と場所の結びつけは、作品としての解釈です）"],
    src: [{ t: "書：上原光瑛（© mitsulab. All rights reserved.）" }], ll: it.ll, how: "作品（mitsulab）",
    buttons: [{ label: "ほどく・集める", primary: true, run: () => touchSho(it) }] });
  touchSho(it);
}
function touchSho(it) {   // 触れる：書がほどけ、端末が震える（iPhone は震えない）
  const S = SHO.live[it.id]; sndCtx(); try { navigator.vibrate?.([18, 50, 30, 60, 14]); } catch { }
  if (S) S.hold = S.hold > 0 ? 0 : 4.5;
}
addEventListener("resize", () => { for (const k in SHO.live) SHO.live[k]?.sho.setScale(innerHeight * renderer.getPixelRatio() * .9); });

/* ---------- 画面の部品 ---------- */
function toast(t) { const e = $("#toast"); e.textContent = t; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => { e.hidden = true; }, 5200); }
const showSkyUI = () => { $("#skyUI").hidden = false; $("#pinLabels").hidden = false; };
const hideSkyUI = () => { $("#skyUI").hidden = true; $("#pinLabels").hidden = true; };
const showWalkUI = () => { $("#walkUI").hidden = false; $("#hud").hidden = false; syncAutoBtn(); };
const hideWalkUI = () => { $("#walkUI").hidden = true; };
const showFlyUI = () => { $("#flyUI").hidden = false; $("#hud").hidden = false; };
const hideFlyUI = () => { $("#flyUI").hidden = true; };
function closeTray() { $("#sightBox").hidden = true; }
$("#sightX").addEventListener("click", closeTray);
$("#lsHead").addEventListener("click", () => { const c = $("#lstack").classList.toggle("closed"); $("#lsHead").setAttribute("aria-expanded", String(!c)); });
$("#lsAll").addEventListener("click", () => { for (const L of ALL) if (!LAYER.worn.includes(L.id)) wearLayer(L.id, { noChooser: true }); });
$("#lsNone").addEventListener("click", () => wearLayer(null));
if (MOBILE || innerWidth < 640) { $("#lstack").classList.add("closed"); $("#lsHead").setAttribute("aria-expanded", "false"); }
let unlocked = false;
function unlockAudio() {   // スマホのブラウザは、押した操作の中で一度鳴らしておかないと、あとで声が出ない
  if (unlocked || !D) return; unlocked = true;
  try { audio.muted = true; audio.src = D.intro.f; const p = audio.play(); p?.then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false; }).catch(() => { audio.muted = false; unlocked = false; }); } catch { audio.muted = false; }
}
addEventListener("pointerup", () => unlockAudio(), true);
$("#goDown").addEventListener("click", () => { unlockAudio(); descendTo(Math.max(0, START.sel)); });
$("#skyFly").addEventListener("click", () => { unlockAudio(); startFly(); });
$("#skySight").addEventListener("click", () => { unlockAudio(); openSightChooser(); });
$("#modeSky").addEventListener("click", () => { if (QW.mode !== "sky") toSky(); });
$("#modeWalk").addEventListener("click", () => { if (QW.mode === "fly") landFromFly(); else if (QW.mode === "sky") descendTo(Math.max(0, START.sel)); else if (QW.mode === "sight") exitSight(); });
$("#modeFly").addEventListener("click", () => { if (QW.mode !== "fly") startFly(); });
const holdBtn = (el, on, off) => { el.addEventListener("pointerdown", e => { e.preventDefault(); on(); el.setPointerCapture(e.pointerId); }); for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, off); };
holdBtn($("#flyUp"), () => FLY.up = true, () => FLY.up = false);
holdBtn($("#flyDown"), () => FLY.down = true, () => FLY.down = false);
holdBtn($("#sUp"), () => FLY.up = true, () => FLY.up = false);
holdBtn($("#sDown"), () => FLY.down = true, () => FLY.down = false);
$("#autoBtn").addEventListener("click", () => { WALK.auto = !WALK.auto; WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; syncAutoBtn(); });
$("#gyroBtn").addEventListener("click", toggleGyro);
if (!MOBILE || typeof DeviceOrientationEvent === "undefined") $("#gyroBtn").hidden = true;
$("#land").addEventListener("click", landFromFly);
$("#menuBtn").addEventListener("click", () => { const m = $("#menu"); m.hidden = !m.hidden; $("#menuBtn").setAttribute("aria-expanded", String(!m.hidden)); });
$("#menuX").addEventListener("click", () => { $("#menu").hidden = true; $("#menuBtn").setAttribute("aria-expanded", "false"); });
$("#sndBtn").addEventListener("click", () => { soundOn = !soundOn; $("#sndBtn").setAttribute("aria-pressed", String(soundOn)); $("#sndBtn").textContent = soundOn ? "声 オン" : "声 オフ"; if (!soundOn) { try { audio.pause(); } catch { } } });
QW.autoWalk = on => { WALK.auto = !!on; syncAutoBtn(); };
QW.hold = on => { WALK.hold = on; };
QW.look = (dy, dp = 0) => { CAM.look += dy; CAM.pitch += dp; CAM.lastDrag = performance.now(); };
QW.dbg = () => ({ moving: WALK.moving, v: AOI.v, vis: AOI.root?.visible, cam: [CAM.pos.x, CAM.pos.y, CAM.pos.z], yaw: CAM.yaw, look: CAM.look, mode: QW.mode, talk: voiceQ?.talk?.id || null, spoken: TALK.spoken.size, sp: SIGHT.sp?.id || null, worn: [...LAYER.worn] });
QW.wear = id => wearLayer(id);
QW.sight = id => { const sp = D.sight.find(s => s.id === id); if (sp) enterSight(sp, null); };
QW.goto = d => { const a = atD(d); CAM.pos.set(a.x, groundY(a.x, a.z) + EYE, a.z); CAM.yaw = yawAlong(d + 5); CAM.look = 0; if (AOI.m) { aoiSpot(AOI.pos); AOI.m.teleport(AOI.pos.x, AOI.pos.z, CAM.yaw + Math.PI); } updateTrees(true); };
QW.open = id => { const L = LAYER.objs.find(l => l.o.id === id); if (L) { L.show = 1; L.root.visible = true; openObj(L); } return !!L; };
QW.talkNow = () => { TALK.nextT = 0; };
QW.sky = SKY;

function fillMenu() {
  $("#about").textContent = D.about; $("#aoiNote").textContent = "碧（あおい）は、この作品の案内役です。歩くあいだ、いまいる所に結びついた記録を話しつづけます（字幕の「出典」から典拠を開けます）。碧の姿：mitsulab（VRoid）／声：VOICEVOX:冥鳴ひまり。";
  $("#credit").textContent = "地形：国土地理院 標高タイル（DEM5A）・全国最新写真（シームレス）を mitsulab が加工／建物：国土交通省 PLATEAU さいたま市 2022（CC BY 4.0）を加工（形と高さ。窓と階の並びは模式）／道・木・鳥居・池の位置と、地図の道・公園・社寺の名前：© OpenStreetMap contributors（ODbL）／等高線：国土地理院 DEM5A から mitsulab が計算／舗装・樹皮・葉の質感：Poly Haven・ambientCG（CC0）／樹木の話：さいたま市・氷川の杜まちづくり協議会『氷川参道の樹木調査』・環境省 巨樹・巨木林データベース・日本語版 Wikipedia（CC BY-SA 4.0）／歴史と文化の話：武蔵一宮氷川神社「由緒・歴史」「境内のご案内」「年間の祭典」・さいたま市・さいたま市立博物館・埼玉県立歴史と民俗の博物館・与野郷土資料館・埼玉県・国土地理院（それぞれの物と碧の話の「出典」に）／生きものの話：日本語版 Wikipedia（CC BY-SA 4.0）・iNaturalist の投稿者のみなさん（種の名前）・研究論文（それぞれの「出典」に）／Qualia/sound の音：［ほかの場所で録った同じ種類の音］風に鳴る葉（Gravity Sound・CC BY 4.0・録音地の記載なし）・スズメ（Derek Paulo・CC BY-SA 4.0・フィリピン）・アブラゼミ（Cory・CC BY 2.1 JP・日本）・ハシブトガラス（Zeimusu・CC BY-SA 2.5・日本）＝いずれも Wikimedia Commons／［再現音］元往還の人と馬・中の区間の車・玉砂利・神池のしずく＝記録にもとづいて端末の中で組み立てた音／［詩の音］mitsulab のことばから組み立てた音／Qualia/touch：面＝この作品の路面と同じ Poly Haven・ambientCG の写真（CC0）、手ざわりと音は端末の中で組み立てた模式／層の物とグラスの形：mitsulab（three.js の基本形で作成）";
  $("#music").textContent = "";
}
/* 左の層の板：一枚が一つの情報の層。触れると表示・非表示。板の色＝風景に重ねた物の色 */
function buildTray() {
  const mk = (L, box, i) => {
    const n = L.id === "sight" ? D.sight.length : L.id === "sound" ? D.sound.length : L.id === "touch" ? D.touch.length : L.id === "sho" ? (D.sho || []).length : D.objs.filter(o => o.layer === L.id).length;
    const li = document.createElement("li"); li.className = "ly";
    const b = document.createElement("button"); b.type = "button"; b.className = "lyBtn" + (L.q ? " q" : ""); b.dataset.id = L.id; b.setAttribute("aria-pressed", "false"); b.style.setProperty("--gc", L.color);
    b.title = L.lead; b.setAttribute("aria-label", `${L.name}（${L.lead}）`);
    b.innerHTML = `<span class="no">${String(i + 1).padStart(2, "0")}</span><span class="nm"><b>${L.name}</b><small>${L.en}</small></span><span class="ct">${n}</span><span class="sw" aria-hidden="true"></span>`;
    b.addEventListener("click", () => wearLayer(L.id, { noChooser: true })); li.appendChild(b);
    if (L.id === "sight") { const g = document.createElement("button"); g.type = "button"; g.className = "lyGo"; g.style.setProperty("--gc", L.color); g.textContent = "入る"; g.setAttribute("aria-label", "生きものの身体に入る"); g.addEventListener("click", e => { e.stopPropagation(); openSightChooser(); }); li.appendChild(g); }
    box.appendChild(li);
  };
  const a = $("#layersRec"), q = $("#layersQ"); a.innerHTML = ""; q.innerHTML = "";
  D.layers.forEach((L, i) => mk(L, a, i)); QLAYERS.forEach((L, i) => mk(L, q, D.layers.length + i));
  syncTray();
}
function syncTray() {
  document.querySelectorAll(".lyBtn").forEach(b => b.setAttribute("aria-pressed", LAYER.worn.includes(b.dataset.id) ? "true" : "false"));
  const c = $("#lsCount"); if (c) c.textContent = `${LAYER.worn.length} / ${ALL.length}`;
}

/* ---------- まわす ---------- */
const clock = new THREE.Clock(); let fpsAcc = 0, fpsN = 0, prT = 0;
function frame() {
  const dt = Math.min(.05, clock.getDelta());
  if (!stepTween(dt)) {
    if (QW.mode === "sky") { SKY.az += (SKY.tAz - SKY.az) * Math.min(1, dt * 5); SKY.el += (SKY.tEl - SKY.el) * Math.min(1, dt * 5); SKY.dist += (SKY.tDist - SKY.dist) * Math.min(1, dt * 5); skyCam(); }
    else if (QW.mode === "walk") stepWalk(dt);
    else if (QW.mode === "fly") stepFly(dt);
    else if (QW.mode === "sight") stepSight(dt);
    else if (QW.mode === "descend") stepWaitOrbit(dt);
  }
  if (QW.mode === "sky") {   // 地図の点の名前（7 つ）と、道・地名の名前
    START.pins.forEach((p, i) => { _v3.copy(p.head.position).project(camera); const l = START.labels[i]; if (_v3.z > 1) { l.style.display = "none"; return; } l.style.display = ""; l.style.transform = `translate(${(_v3.x + 1) / 2 * innerWidth}px,${(1 - _v3.y) / 2 * innerHeight}px)`; });
    stepMapLabels();
    if (MAP.here?.visible) MAP.here.scale.setScalar(1 + .15 * Math.sin(performance.now() / 300));
  }
  if (WALK.ring?.visible) { WALK.ringT = (WALK.ringT || 0) + dt; WALK.ring.material.opacity = .85 * (.6 + .4 * Math.cos(WALK.ringT * 4)); }
  updateTrees();
  if (BLD.length) { const cp = camera.position, far = QW.mode === "walk" || QW.mode === "sight" ? (MOBILE ? 320 : 430) : 1e9; for (const b of BLD) { const s = b.userData.ws; b.visible = Math.hypot(s.center.x - cp.x, s.center.z - cp.z) - s.radius < far; } }
  if (STONES.length && QW.mode !== "sky") { const cp = camera.position; for (const r of STONES) { const s = r.userData.ws; r.visible = s.center.distanceTo(cp) - s.radius < 160; } }
  stepLayer(dt); stepSoundscape(dt); stepSho(dt); stepTalk();
  if (QW.mode === "walk") stepAoi(dt);
  if (SIGHT.post && QW.mode === "sight") {
    SIGHT.post.mat.uniforms.time.value += dt;
    renderer.setRenderTarget(SIGHT.post.rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(SIGHT.post.ps, SIGHT.post.cam);
  } else renderer.render(scene, camera);
  // こまの速さを見て、画面の細かさを上げ下げする（落ち込みを止める）
  fpsAcc += dt; fpsN++; prT += dt;
  if (prT > 1.5) { const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0; prT = 0; const lim = MOBILE ? 1 / 32 : 1 / 52;
    if (avg > lim && pr > .9) { pr = Math.max(.9, pr - .15); renderer.setPixelRatio(pr); resize(); resizePost(); }
    else if (avg < lim * .62 && pr < PR_MAX) { pr = Math.min(PR_MAX, pr + .1); renderer.setPixelRatio(pr); resize(); resizePost(); } }
  QW.fps = 1 / dt;
}
addEventListener("resize", resizePost);
document.addEventListener("visibilitychange", () => { if (document.hidden) { renderer.setAnimationLoop(null); try { audio.pause(); } catch { } } else { clock.getDelta(); renderer.setAnimationLoop(frame); } });

(async () => {
  try {
    await buildBase();
    buildObjs(); fillMenu(); buildTray();
    setMode("sky"); skyCam(); showSkyUI(); selectStart(0);
    renderer.setAnimationLoop(frame);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    document.body.classList.add("ready");
    QW.ready = true; QW.tReady = performance.now() - T0;
    // 歩く前に要るものを、上空で選んでいるあいだに読む（地図の線と名前 → 道・木・構造物 → 碧 → 話）
    setTimeout(() => { fetch(BASE + "map.json?v=" + VER).then(r => r.json()).then(buildMap).catch(e => console.warn("map", e)); }, 120);
    setTimeout(() => { loadLate(); setTimeout(loadAoi, 400); setTimeout(loadTalk, 900); }, 300);
    const s0 = Q.get("start"); if (s0 != null && D.starts[+s0]) { selectStart(+s0); descendTo(+s0); }
    if (Q.get("layer")) setTimeout(() => wearLayer(Q.get("layer")), 200);
    if (Q.get("sight")) setTimeout(() => QW.sight(Q.get("sight")), 300);
  } catch (e) {
    console.error(e); status("読み込めませんでした。ページを開きなおしてください。");
  }
})();
