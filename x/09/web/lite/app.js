/* Qualia/walk 氷川 ── 軽い版（2026-10-20）
   上空から始める場所を選ぶ → 降りて歩く／鳥になって飛ぶ。Qualia のグラスをかけると、その層の物（3D）が、地図の座標に固定されて重なる。
   物に触れると開き、碧がその場所の記録を話す。時代や層は、見る人が選んだときだけ変わる（近づいただけでは何も起きない）。
   座標：x＝東 m・y＝標高 m・z＝南 m（原点 経度 139.631・緯度 35.90725）。 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLASSES, makeGlass, glassThumbs } from "./glasses.js?v=1";

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 820;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const T0 = performance.now();
const QW = window.__qw = { ready: false, mode: "boot", renderer: null };
const BASE = "web/lite/";
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

const pData = fetch(BASE + "data.json").then(r => r.json());
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
  buildPath(); buildPonds(env); buildStarts();
  // 木と建物（並行して届いたものから）
  buildCrowns();
  pBld.then(buildBuildings).catch(e => console.warn("buildings", e));
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
  m.onBeforeCompile = sh => {   // 壁に階と窓の並び（模式）、屋根は少し暗く。PLATEAU の形と高さはそのまま
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;")
      .replace("#include <color_fragment>", `#include <color_fragment>
      { vec3 fn = normalize(cross(dFdx(vWp), dFdy(vWp))); float dist = length(vWp - cameraPosition);
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
  m.customProgramCacheKey = () => "facade1";
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
  const cp = camera.position, alt = cp.y - groundY(cp.x, cp.z), mode = QW.mode === "descend" || QW.mode === "boot" ? (alt < 30 ? "walk" : alt < 260 ? "fly" : "sky") : QW.mode;
  if (!force && TREE.lastMode === mode && TREE.lastPos.distanceToSquared(cp) < (mode === "walk" ? 16 : 400)) return;
  TREE.lastPos.copy(cp); TREE.lastMode = mode;
  const nearR = mode === "walk" ? (MOBILE ? 32 : 40) : 0;
  const farR = mode === "walk" ? (MOBILE ? 300 : 400) : 1e9;
  const midR = mode === "walk" ? (MOBILE ? 85 : 120) : mode === "fly" ? (MOBILE ? 70 : 140) : 0;
  const nr2 = nearR * nearR, fr2 = farR * farR, mr2 = midR * midR;
  for (const p of Object.values(TREE.protos)) [...p.parts, ...p.mid, ...(p.imp ? [p.imp] : [])].forEach(im => im.count = 0);
  let nc = 0; const useImp = mode === "walk";
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
      o.traverse(n => { if (n.isMesh && n.material) n.material.envMapIntensity = .6; });
      o.name = s.id; structGroup.add(o);
    }
  });
  const tr = Promise.all([glb(BASE + "trees.glb"), glb(BASE + "keyaki.glb").catch(() => null)]).then(buildTrees);
  lateP = Promise.allSettled([road, st, tr]);
  return lateP;
}

/* ---------- 上空の地図：始める場所 ---------- */
const START = { pins: [], sel: -1, labels: [] };
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
    const lb = document.createElement("div"); lb.className = "pinLabel"; lb.textContent = s.short === "社" ? "社" : s.short; lb.dataset.i = i; $("#pinLabels").appendChild(lb); START.labels.push(lb);
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

/* ---------- カメラと動き ---------- */
const CAM = { yaw: 0, pitch: 0, pos: new THREE.Vector3(), vy: 0 };
const SKY = { az: .3, el: .98, dist: MOBILE ? 1750 : 1550, tx: -20, tz: MOBILE ? 120 : 40, tAz: .3, tEl: .98, tDist: MOBILE ? 1750 : 1550 };
const EYE = 1.55;
let tween = null, TWFOG = null;
const FOGS = { sky: () => ({ c: NAVY, n: 1500, f: 3300 }), walk: () => ({ c: FOG_SKY, n: 70, f: MOBILE ? 340 : 480 }), fly: () => ({ c: FOG_SKY, n: 260, f: MOBILE ? 1100 : 1700 }), mid: () => ({ c: FOG_SKY, n: 300, f: 1900 }) };
function setMode(m) {
  QW.mode = m; document.body.dataset.mode = m;
  const walk = m === "walk", fly = m === "fly", sky = m === "sky";
  if (m !== "descend") { scene.fog.near = walk ? 70 : fly ? 260 : 1500; scene.fog.far = walk ? (MOBILE ? 340 : 480) : fly ? (MOBILE ? 1100 : 1700) : 3300; }
  camera.near = walk ? .08 : 1; camera.far = walk ? 700 : 6000; camera.updateProjectionMatrix();
  if (pathLine) pathLine.visible = sky || fly; if (START.group) START.group.visible = sky;
  if (QW.skyTex && m !== "descend") { scene.background = sky ? NAVY : QW.skyTex; scene.fog.color.copy(sky ? NAVY : FOG_SKY); }
  updateTrees(true);
  $("#modeWalk").setAttribute("aria-pressed", walk); $("#modeFly").setAttribute("aria-pressed", fly); $("#modeSky").setAttribute("aria-pressed", sky);
  if (AOI.root) AOI.root.visible = walk && AOI.ready;
}
QW.setMode = m => { if (m === "fly") startFly(); else if (m === "sky") toSky(); else setMode(m); };
function skyCam() {
  const c = Math.cos(SKY.el), x = SKY.tx + Math.sin(SKY.az) * c * SKY.dist, z = SKY.tz + Math.cos(SKY.az) * c * SKY.dist, y = 14 + Math.sin(SKY.el) * SKY.dist;
  camera.position.set(x, y, z); camera.lookAt(SKY.tx, 14, SKY.tz);
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function tweenTo(pos, yaw, pitch, dur, done) {
  const p0 = camera.position.clone(), q0 = camera.quaternion.clone();
  const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  tween = { p0, q0, p1: pos.clone(), q1, t: 0, dur: RM ? .01 : dur, done, fog: TWFOG }; TWFOG = null;
}
function stepTween(dt) {
  if (!tween) return false; tween.t += dt / tween.dur; const k = ease(Math.min(1, tween.t));
  if (QW.skyTex && tween.fog) { const [a, b] = tween.fog, f = k; scene.fog.color.copy(a.c).lerp(b.c, f); scene.fog.near = a.n + (b.n - a.n) * f; scene.fog.far = a.f + (b.f - a.f) * f; scene.background = (f > .5 ? b : a).c === NAVY ? NAVY : QW.skyTex; }
  // 弧を描いて降りる（まっすぐ落ちない）
  camera.position.lerpVectors(tween.p0, tween.p1, k); camera.position.y += Math.sin(k * Math.PI) * 0;
  camera.quaternion.slerpQuaternions(tween.q0, tween.q1, Math.min(1, k * 1.15));
  if (tween.t >= 1) { const d = tween.done; tween = null; d?.(); }
  return true;
}
function yawAlong(d) { const a = atD(d); return Math.atan2(-a.tx, -a.tz); }   // 道のりの増える向き（北の社へ）を向く
function descendTo(i) {
  const s = D.starts[i]; if (!s) return;
  hideSkyUI(); loadLate();
  const a = atD(s.d), yaw = yawAlong(Math.min(s.d + 6, 1985)), y = groundY(a.x, a.z) + EYE;
  setMode("descend");
  // まず斜め上空へ寄り、そこから目の高さへ
  const mid = new THREE.Vector3(a.x + Math.sin(yaw) * 140, y + 120, a.z + Math.cos(yaw) * 140);
  TWFOG = [FOGS.sky(), FOGS.mid()];
  tweenTo(mid, yaw, -.62, 1.5, () => {
    const wait = setTimeout(() => toast("参道の道と木を読み込んでいます。"), 400);
    lateP.then(() => { clearTimeout(wait); TWFOG = [FOGS.mid(), FOGS.walk()]; tweenTo(new THREE.Vector3(a.x, y, a.z), yaw, -.04, 1.7, () => { CAM.pos.set(a.x, y, a.z); CAM.yaw = yaw; CAM.pitch = -.04; enterWalk(); }); });
  });
}
QW.startAt = i => { if (QW.mode === "sky") descendTo(i ?? 0); };

/* 歩く */
const WALK = { goal: null, keys: new Set(), hold: false, speed: 1.35, ring: null };
function enterWalk() {
  setMode("walk"); showWalkUI();
  aoiArrive();
  if (!sessionStorageGet("hk_tip")) { toast(MOBILE ? "地面に触れるとそこへ歩きます。なぞると向きが変わります。" : "地面を押すとそこへ歩きます。ドラッグで向き、W A S D でも歩けます。"); sessionStorageSet("hk_tip", 1); }
}
function corridorClamp(p) {
  const n = nearestOnLine(p.x, p.z), lim = n.d > 1878 ? 70 : n.d < -20 ? 30 : 13;
  if (n.dist > lim) { const a = atD(n.d), dx = p.x - a.x, dz = p.z - a.z, l = Math.hypot(dx, dz) || 1; p.x = a.x + dx / l * lim; p.z = a.z + dz / l * lim; }
  if (n.d > 2010) { const a = atD(2010); p.x += (a.x - p.x) * .2; p.z += (a.z - p.z) * .2; }
}
const _f = new THREE.Vector3(), _r = new THREE.Vector3();
function stepWalk(dt) {
  let mx = 0, mz = 0; const K = WALK.keys;
  if (K.has("w") || K.has("arrowup") || WALK.hold) mz += 1; if (K.has("s") || K.has("arrowdown")) mz -= 1;
  if (K.has("a")) mx -= 1; if (K.has("d")) mx += 1;
  if (K.has("arrowleft")) CAM.yaw += dt * 1.6; if (K.has("arrowright")) CAM.yaw -= dt * 1.6;
  const sp = WALK.speed * (K.has("shift") ? 2.2 : 1);
  _f.set(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw)); _r.set(-_f.z, 0, _f.x);
  let moving = false;
  if (mx || mz) { WALK.goal = null; CAM.pos.addScaledVector(_f, mz * sp * dt).addScaledVector(_r, mx * sp * dt); moving = true; }
  else if (WALK.goal) {
    const dx = WALK.goal.x - CAM.pos.x, dz = WALK.goal.z - CAM.pos.z, l = Math.hypot(dx, dz);
    if (l < .25) { WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; }
    else { const st = Math.min(l, sp * dt); CAM.pos.x += dx / l * st; CAM.pos.z += dz / l * st; moving = true;
      const want = Math.atan2(-dx, -dz); let dy = want - CAM.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); CAM.yaw += dy * Math.min(1, dt * 2.2); }
  }
  corridorClamp(CAM.pos);
  const gy = groundY(CAM.pos.x, CAM.pos.z) + EYE + (AOI.low ? -1.49 : 0);
  CAM.pos.y += (gy - CAM.pos.y) * Math.min(1, dt * 8);
  camera.position.copy(CAM.pos);
  camera.quaternion.setFromEuler(new THREE.Euler(CAM.pitch, CAM.yaw, 0, "YXZ"));
  WALK.moving = moving;
}

/* 鳥になって飛ぶ（ゆっくり・高さは控えめ・地面と木にもぐらない） */
const FLY = { yawRate: 0, climb: 0, roll: 0, speed: 9, up: false, down: false, drag: null };
function startFly() {
  hideSkyUI(); hidePanel(); loadLate();
  let p, yaw;
  if (QW.mode === "walk") { p = CAM.pos.clone(); yaw = CAM.yaw; }
  else { const s = D.starts[Math.max(0, START.sel)]; const a = atD(s.d); p = new THREE.Vector3(a.x, 0, a.z); yaw = yawAlong(s.d + 5); }
  const y = Math.max(groundY(p.x, p.z) + 48, roofAt(p.x, p.z, 2) + 16);
  TWFOG = [QW.mode === "sky" ? FOGS.sky() : FOGS.walk(), FOGS.fly()]; setMode("descend");
  tweenTo(new THREE.Vector3(p.x, y, p.z), yaw, -.2, 1.6, () => { CAM.pos.set(p.x, y, p.z); CAM.yaw = yaw; CAM.pitch = -.2; FLY.roll = 0; setMode("fly"); showFlyUI(); if (!sessionStorageGet("hk_fly")) { toast(MOBILE ? "なぞった向きへ曲がります。右の ▲▼ で高さを変えます。" : "ドラッグか A D で曲がり、W S で高さを変えます。"); sessionStorageSet("hk_fly", 1); } });
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
  // 範囲：参道のまわり（端に来たら、ゆっくり内へ向きを変える）
  const n = nearestOnLine(CAM.pos.x, CAM.pos.z);
  if (n.dist > 260 || n.d < -120 || n.d > 2120) { const a = atD(Math.min(1980, Math.max(0, n.d))), want = Math.atan2(-(a.x - CAM.pos.x), -(a.z - CAM.pos.z)); let dy = want - CAM.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); CAM.yaw += dy * Math.min(1, dt * .8); }
  const g = groundY(CAM.pos.x, CAM.pos.z), lo = Math.max(g + 30, roofAt(CAM.pos.x + -Math.sin(CAM.yaw) * 20, CAM.pos.z + -Math.cos(CAM.yaw) * 20, 1) + 14), hi = Math.max(g + 140, lo + 30);
  if (CAM.pos.y < lo) { CAM.pos.y += (lo - CAM.pos.y) * Math.min(1, dt * 3); FLY.climb = Math.max(FLY.climb, 0); }
  if (CAM.pos.y > hi) { CAM.pos.y += (hi - CAM.pos.y) * Math.min(1, dt * 3); FLY.climb = Math.min(FLY.climb, 0); }
  FLY.roll += (-FLY.yawRate * .22 - FLY.roll) * Math.min(1, dt * 2);   // 傾きは 7° まで
  const pitch = -.2 + FLY.climb * .012;
  camera.position.copy(CAM.pos); camera.quaternion.setFromEuler(new THREE.Euler(pitch, CAM.yaw, FLY.roll, "YXZ"));
}
function landFromFly() {
  const n = nearestOnLine(CAM.pos.x, CAM.pos.z), d = Math.min(1985, Math.max(-20, n.d)), a = atD(d), y = groundY(a.x, a.z) + EYE, ya = yawAlong(d), yb = ya + Math.PI;
  const yaw = Math.abs(Math.atan2(Math.sin(ya - CAM.yaw), Math.cos(ya - CAM.yaw))) < Math.PI / 2 ? ya : yb;   // 道に沿って、飛んでいた向きに近いほうを向いて降りる
  setMode("descend"); hideFlyUI();
  lateP.then(() => (TWFOG = [FOGS.fly(), FOGS.walk()], tweenTo(new THREE.Vector3(a.x, y, a.z), yaw, -.04, 2.2, () => { CAM.pos.set(a.x, y, a.z); CAM.yaw = yaw; CAM.pitch = -.04; enterWalk(); })));
}
function toSky() {
  hidePanel(); hideWalkUI(); hideFlyUI(); stopVoice();
  const c = Math.cos(SKY.el), x = SKY.tx + Math.sin(SKY.az) * c * SKY.dist, z = SKY.tz + Math.cos(SKY.az) * c * SKY.dist, y = 14 + Math.sin(SKY.el) * SKY.dist;
  const tmp = new THREE.Object3D(); tmp.position.set(x, y, z); tmp.lookAt(SKY.tx, 14, SKY.tz); const e = new THREE.Euler().setFromQuaternion(tmp.quaternion, "YXZ");
  TWFOG = [QW.mode === "fly" ? FOGS.fly() : FOGS.walk(), FOGS.sky()]; setMode("descend"); if (AOI.root) AOI.root.visible = false;
  tweenTo(tmp.position, e.y, e.x, 1.8, () => { setMode("sky"); showSkyUI(); });
}

/* ---------- 入力 ---------- */
const ptr = { down: false, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: 0, id: null, pinch: null, pts: new Map() };
canvas.addEventListener("pointerdown", e => {
  ptr.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.pts.size === 2) { const [a, b] = [...ptr.pts.values()]; ptr.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: SKY.tDist }; return; }
  ptr.down = true; ptr.id = e.pointerId; ptr.x = ptr.sx = e.clientX; ptr.y = ptr.sy = e.clientY; ptr.t = performance.now(); ptr.moved = 0;
  canvas.setPointerCapture(e.pointerId);
  if (QW.mode === "fly") FLY.drag = { dx: 0, dy: 0 };
});
canvas.addEventListener("pointermove", e => {
  if (ptr.pts.has(e.pointerId)) ptr.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.pinch && ptr.pts.size === 2) { const [a, b] = [...ptr.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); SKY.tDist = Math.min(2800, Math.max(380, ptr.pinch.dist * ptr.pinch.d / d)); return; }
  if (!ptr.down || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY; ptr.moved += Math.abs(dx) + Math.abs(dy);
  if (QW.mode === "walk") { const k = MOBILE ? .0042 : .0032; CAM.yaw += dx * k; CAM.pitch = Math.max(-1.1, Math.min(.9, CAM.pitch + dy * k)); }
  else if (QW.mode === "sky") { SKY.tAz -= dx * .0042; SKY.tEl = Math.max(.42, Math.min(1.42, SKY.tEl + dy * .003)); }
  else if (QW.mode === "fly" && FLY.drag) { FLY.drag.dx = (e.clientX - ptr.sx) / (innerWidth * .5); FLY.drag.dy = (e.clientY - ptr.sy) / (innerHeight * .5); }
});
const endPtr = e => {
  ptr.pts.delete(e.pointerId); if (ptr.pts.size < 2) ptr.pinch = null;
  if (!ptr.down || e.pointerId !== ptr.id) return; ptr.down = false; FLY.drag = null;
  if (ptr.moved < 10 && performance.now() - ptr.t < 600) tap(e.clientX, e.clientY);
};
canvas.addEventListener("pointerup", endPtr); canvas.addEventListener("pointercancel", endPtr);
canvas.addEventListener("wheel", e => { if (QW.mode === "sky") { SKY.tDist = Math.min(2800, Math.max(380, SKY.tDist * (1 + e.deltaY * .0012))); e.preventDefault(); } }, { passive: false });
addEventListener("keydown", e => { if (e.target.closest?.("input,textarea")) return; const k = e.key.toLowerCase(); WALK.keys.add(k); if (k === "escape") { if (!$("#panel").hidden) hidePanel(); } });
addEventListener("keyup", e => WALK.keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => WALK.keys.clear());

const ray = new THREE.Raycaster(), _v2 = new THREE.Vector2(), _v3 = new THREE.Vector3();
function tap(x, y) {
  if (QW.mode === "sky") {   // 地図の点を選ぶ
    let best = -1, bd = 46 * 46;
    START.pins.forEach((p, i) => { for (const h of [p.head.position, p.ring.position]) { _v3.copy(h).project(camera); const sx = (_v3.x + 1) / 2 * innerWidth, sy = (1 - _v3.y) / 2 * innerHeight, d = (sx - x) ** 2 + (sy - y) ** 2; if (_v3.z < 1 && d < bd) { bd = d; best = i; } } });
    if (best >= 0) selectStart(best); return;
  }
  if (QW.mode !== "walk") return;
  const o = pickObj(x, y); if (o) { openObj(o); return; }
  _v2.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(_v2, camera); ray.far = 60;
  const hit = ray.intersectObjects(pickables.filter(m => m.visible !== false), false)[0];
  if (hit) { WALK.goal = hit.point.clone(); corridorClamp(WALK.goal); showGoalRing(WALK.goal); }
}
function showGoalRing(p) {
  if (!WALK.ring) { const g = new THREE.RingGeometry(.28, .34, 40); g.rotateX(-Math.PI / 2); WALK.ring = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: "#9bdcf0", transparent: true, opacity: .85, depthWrite: false })); world.add(WALK.ring); }
  WALK.ring.position.set(p.x, groundY(p.x, p.z) + .04, p.z); WALK.ring.visible = true; WALK.ringT = 0;
}

/* ---------- Qualia の層：グラスと物 ---------- */
const LAYER = { on: null, worn: [], objs: [], ripple: null, rippleR: 0, wear: null };
const GL = Object.fromEntries(GLASSES.map(g => [g.id, g]));
let GLOW = null;
function glowTex() {
  if (GLOW) return GLOW; const cv = document.createElement("canvas"); cv.width = cv.height = 64; const x = cv.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.18, "rgba(255,255,255,.55)"); gr.addColorStop(.5, "rgba(255,255,255,.12)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); GLOW = new THREE.CanvasTexture(cv); GLOW.colorSpace = THREE.SRGBColorSpace; return GLOW;
}
function glyphFor(layer, color) {   // 層ごとの形（光る線と点だけ。面は薄く）
  const g = new THREE.Group(), c = new THREE.Color(color);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: c.clone().lerp(new THREE.Color("#ffffff"), .3), transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
  sp.scale.setScalar(.34); g.add(sp); g.userData.glow = sp;
  const lm = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .95, depthWrite: false, fog: true });
  const fm = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const pm = new THREE.PointsMaterial({ color: c.clone().lerp(new THREE.Color("#ffffff"), .45), size: MOBILE ? 3.2 : 2.6, sizeAttenuation: false, transparent: true, depthWrite: false, fog: true });
  let geo;
  if (layer === "history") { geo = new THREE.OctahedronGeometry(.24, 0); geo.scale(.68, 1.65, .68); }   // 記録の碑のように縦に長い
  else if (layer === "culture") { geo = new THREE.TorusGeometry(.23, .006, 4, 48); }   // 人の輪
  else if (layer === "nature") { geo = new THREE.IcosahedronGeometry(.24, 0); }   // 木の実・種のかたち
  else { geo = new THREE.SphereGeometry(.2, 10, 6); }   // 複眼のような点の球
  if (layer === "umwelt") {
    const pts = [], n = 80; for (let i = 0; i < n; i++) { const y = 1 - (i + .5) / n * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996; pts.push(new THREE.Vector3(Math.cos(a) * r * .24, y * .24, Math.sin(a) * r * .24)); }
    g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), pm));
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, i) => new THREE.Vector3(Math.cos(i / 48 * 6.283) * .32, Math.sin(i / 48 * 6.283) * .32, 0))), lm); g.add(ring); g.userData.spin = ring;
  } else if (layer === "culture") {
    const tm = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .95, depthWrite: false }); g.add(new THREE.Mesh(geo, tm)); g.userData.extra = tm;
    const inner = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 6 }, (_, i) => new THREE.Vector3(Math.cos(i / 6 * 6.283) * .1, Math.sin(i / 6 * 6.283) * .1, 0))), lm); g.add(inner);
    g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()]), pm)); g.userData.spin = inner;
  } else {
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm)); g.add(new THREE.Mesh(geo, fm));
    g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()]), pm));
  }
  g.userData.mats = [lm, fm, pm]; if (g.userData.extra) g.userData.mats.push(g.userData.extra);
  return g;
}
function buildObjs() {
  const stemM = {}, ringG = new THREE.RingGeometry(.3, .33, 36); ringG.rotateX(-Math.PI / 2);
  for (const o of D.objs) {
    const color = GL[o.layer].color;
    const root = new THREE.Group(); root.position.set(o.x, o.y, o.z); root.visible = false; root.name = o.id;
    const glyph = glyphFor(o.layer, color); glyph.position.y = o.h; root.add(glyph);
    const sm = stemM[o.layer] ||= new THREE.LineBasicMaterial({ color, transparent: true, opacity: .45, depthWrite: false });
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, .02, 0), new THREE.Vector3(0, Math.max(.05, o.h - .3), 0)]), sm); root.add(stem);
    const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7, depthWrite: false })); ring.position.y = .03; root.add(ring);
    world.add(root); LAYER.objs.push({ o, root, glyph, ring, k: 0, show: 0, open: 0 });
  }
  const rg = new THREE.RingGeometry(.97, 1, 96); rg.rotateX(-Math.PI / 2);
  LAYER.ripple = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false })); LAYER.ripple.visible = false; world.add(LAYER.ripple);
}
function wearGlass(id) {   // グラスは重ねてかけられる（かけた順に 1 層目・2 層目…）。同じグラスをもう一度選ぶと外れる
  const W = LAYER.worn; let g = null;
  if (!id) W.length = 0; else if (W.includes(id)) W.splice(W.indexOf(id), 1); else { W.push(id); g = GL[id]; }
  LAYER.on = W.length ? W[W.length - 1] : null; hidePanel();
  document.querySelectorAll(".glassBtn").forEach(b => { const k = W.indexOf(b.dataset.id); b.setAttribute("aria-pressed", k >= 0 ? "true" : "false"); const n = b.querySelector(".gk"); if (n) n.textContent = (k >= 0 ? (k + 1) + " 層目・" : "") + n.dataset.n; });
  const top = LAYER.on ? GL[LAYER.on] : null;
  document.body.style.setProperty("--lc", top ? top.color : "transparent");
  document.body.classList.toggle("wearing", !!top);
  $("#wearX").hidden = !top; document.body.style.setProperty("--lc2", top ? top.color : "");
  if (g) toast(W.length + " 層目　" + g.name + "　" + g.lead);
  $("#qBtnName").textContent = W.length ? W.map(k => GL[k].short).join("＋") : "Qualia";
  closeTray();
  // 層が重なる：見る人の足もとから輪がひろがり、届いた所から物が現れる
  if (g) { LAYER.rippleR = 0; LAYER.ripple.visible = QW.mode === "walk" || QW.mode === "fly"; LAYER.ripple.material.color.set(g.color); LAYER.ripple.position.set(camera.position.x, groundY(camera.position.x, camera.position.z) + .06, camera.position.z); LAYER.rippleLayer = g.id; }
  for (const L of LAYER.objs) { L.want = W.includes(L.o.layer); if (!L.want) L.arr = false; }
  if (g) putOnAnim(g);
}
function putOnAnim(g) {   // グラスが目の前へ上がってきて、かけた視界へ
  if (LAYER.wear) { camera.remove(LAYER.wear.m); LAYER.wear = null; }
  if (RM || QW.mode === "sky") return;
  const m = makeGlass(g, QW.env); m.scale.setScalar(MOBILE ? 1.2 : 1.45); camera.add(m);
  LAYER.wear = { m, t: 0 };
}
function stepLayer(dt) {
  if (LAYER.wear) {
    const w = LAYER.wear; w.t += dt / .9; const k = ease(Math.min(1, w.t));
    w.m.position.set(0, -.16 + k * .16, -.42 + k * .3); w.m.rotation.set(.5 * (1 - k), 0, 0);
    for (const mt of w.m.userData.mats) mt.opacity = mt === w.m.userData.mats[1] ? .32 * (1 - k) : 1 - Math.max(0, k - .6) / .4;
    w.m.userData.mats.forEach(mt => mt.transparent = true);
    if (w.t >= 1) { camera.remove(w.m); w.m.traverse(o => o.geometry?.dispose()); LAYER.wear = null; }
  }
  if (LAYER.ripple?.visible) { LAYER.rippleR += dt * 55; const r = LAYER.rippleR; LAYER.ripple.scale.setScalar(Math.max(.01, r)); LAYER.ripple.material.opacity = Math.max(0, .7 * (1 - r / 260)); if (r > 260) LAYER.ripple.visible = false; }
  const cp = camera.position, t = performance.now() / 1000, far = QW.mode === "fly" ? 900 : QW.mode === "walk" ? (MOBILE ? 280 : 340) : 0;
  for (const L of LAYER.objs) {
    const dx = L.o.x - cp.x, dz = L.o.z - cp.z, dist = Math.hypot(dx, dz);
    if (L.want && !L.arr && (!LAYER.ripple.visible || L.o.layer !== LAYER.rippleLayer || dist < LAYER.rippleR - 10)) L.arr = true;
    const reached = L.arr;
    const target = L.want && reached && dist < far ? 1 : 0;
    L.show += (target - L.show) * Math.min(1, dt * (target ? 3 : 6));
    const vis = L.show > .01; L.root.visible = vis; if (!vis) continue;
    // 遠くでも見つけられるように、少しだけ大きく（位置は動かさない）
    const s = Math.min(QW.mode === "fly" ? 26 : 3.2, Math.max(1, dist / (QW.mode === "fly" ? 9 : 16))) * (1 + L.open * .35);
    L.glyph.scale.setScalar(s * (.6 + .4 * L.show));
    L.glyph.position.y = QW.mode === "fly" ? Math.max(L.o.h, 2.5 * s) : L.o.h;
    L.open += ((PANEL.cur === L ? 1 : 0) - L.open) * Math.min(1, dt * 5);
    if (L.glyph.userData.spin) L.glyph.userData.spin.rotation.z = t * .25;
    if (L.open > .01) L.glyph.rotation.y += dt * 1.2 * L.open;
    else L.glyph.rotation.y = Math.atan2(cp.x - L.o.x, cp.z - L.o.z);   // 見る人へ正面を向ける（その場で回るだけ）
    const op = L.show * (PANEL.cur && PANEL.cur !== L ? .35 : 1);
    for (const m of L.glyph.userData.mats) m.opacity = (m.isPointsMaterial ? 1 : m.isMeshBasicMaterial ? .12 : .95) * op;
    L.glyph.userData.glow.material.opacity = (.42 + .14 * Math.sin(t * 1.6 + L.o.x)) * op; L.glyph.userData.glow.scale.setScalar(.22 + L.open * .2);
    L.ring.material.opacity = .7 * op; L.ring.scale.setScalar(1 + L.open * 1.4);
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

/* ---------- 開いた中身 ---------- */
const PANEL = { cur: null };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function openObj(L) {
  const o = L.o, g = GL[o.layer]; PANEL.cur = L; closeTray();
  const p = $("#panel"); p.hidden = false; p.style.setProperty("--pc", g.color);
  $("#pLayer").textContent = g.name; $("#pTitle").textContent = o.title;
  const body = $("#pBody"); body.innerHTML = "";
  o.lines.forEach((l, i) => { const e = document.createElement("p"); e.className = "line"; e.dataset.i = i; e.textContent = l.t; body.appendChild(e); });
  for (const m of o.more) { const e = document.createElement("p"); e.className = "more"; e.textContent = m; body.appendChild(e); }
  const ex = $("#pExp"); ex.innerHTML = ""; ex.hidden = !o.exp;
  if (o.exp) for (const b of EXP_BTNS[o.exp] || []) { const e = document.createElement("button"); e.type = "button"; e.className = "ml-btn expBtn"; e.textContent = b.label; e.addEventListener("click", () => b.run(L)); ex.appendChild(e); }
  if (o.exp && EXP_FIG[o.exp]) { const f = document.createElement("figure"); f.className = "fig"; f.innerHTML = EXP_FIG[o.exp]; ex.prepend(f); }
  $("#pHow").textContent = o.how === "研究の知見" ? "研究の知見（ほかの場所で調べられたこと）" : "記録（公的な資料・神社の由緒など）";
  $("#pNote").textContent = o.note || ""; $("#pNote").hidden = !o.note;
  $("#pSrc").innerHTML = o.src.map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>`).join("");
  $("#pPos").textContent = `この物の位置：北緯 ${o.ll[1].toFixed(5)}°・東経 ${o.ll[0].toFixed(5)}°（地図の座標に固定）`;
  $("#pFold").open = false;
  p.scrollTop = 0; body.scrollTop = 0;
  speakLines(o.lines, L);
}
function hidePanel() { if ($("#panel").hidden) return; $("#panel").hidden = true; PANEL.cur = null; stopVoice(); expStop(); }
$("#pClose").addEventListener("click", hidePanel);

/* ---------- 声（碧） ---------- */
const audio = $("#voice"); let soundOn = true, voiceQ = null;
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { } }
function stopVoice() { voiceQ = null; try { audio.pause(); } catch { } AOI.m?.stopSpeaking(); document.querySelectorAll("#pBody .line.now").forEach(e => e.classList.remove("now")); }
function speakLines(lines, L) {
  stopVoice(); const q = lines.filter(l => l.f); voiceQ = { q, i: 0, L };
  if (L && AOI.m) { const p = L.glyph.getWorldPosition(new THREE.Vector3()); AOI.m.lookAt(p); AOI.focus = p; }   // 指さず、目と体を半分だけ物へ向ける
  playNext();
}
function playNext() {
  const v = voiceQ; if (!v) return; const l = v.q[v.i]; if (!l) { voiceQ = null; AOI.focus = null; return; }
  const idx = v.L ? v.L.o.lines.indexOf(l) : -1;
  document.querySelectorAll("#pBody .line").forEach(e => e.classList.toggle("now", +e.dataset.i === idx));
  if (!v.L) caption(l.t, l.dur);
  if (!soundOn) { setTimeout(() => { if (voiceQ === v) { v.i++; playNext(); } }, Math.max(1800, l.dur * 1000)); return; }
  audio.src = l.f; audio.currentTime = 0;
  audio.play().then(() => { AOI.m?.speak({ timeline: D.lip[l.id] || null, text: l.t, dur: l.dur, clock: () => audio.currentTime }); }).catch(() => { setTimeout(() => { if (voiceQ === v) { v.i++; playNext(); } }, 1500); });
  audio.onended = () => { if (voiceQ !== v) return; AOI.m?.stopSpeaking(); v.i++; setTimeout(() => voiceQ === v && playNext(), 380); };
}
let capT = 0;
function caption(t, dur = 4) { const c = $("#caption"); c.textContent = t; c.hidden = false; clearTimeout(capT); capT = setTimeout(() => { c.hidden = true; }, Math.max(3200, dur * 1000 + 900)); }

/* ---------- 碧（共通部品 AoiMotion） ---------- */
const AOI = { root: null, m: null, ready: false, vrm: null, pos: new THREE.Vector3(), focus: null, low: false, greeted: false, loading: null };
function loadAoi() {
  if (AOI.loading) return AOI.loading;
  return AOI.loading = (async () => {
    const [V, buf, Mot, Robe] = await Promise.all([import("@pixiv/three-vrm"), fetch("web/aoi.vrm").then(r => r.arrayBuffer()), import("../kit/aoi_motion.js"), import("../kit/aoi_robe.js").catch(() => null)]);
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
    AOI.m = new Mot.AoiMotion(v, { root, posture: "upright", reducedMotion: RM, wind: 0, groundAt: (x, z) => groundY(x, z), quality: MOBILE ? "mid" : "auto" });
    if (AOI.m.robe) AOI.m.robe.wind = .25;
    AOI.root = root; AOI.vrm = v; AOI.ready = true;
    try { root.visible = true; await renderer.compileAsync(root, camera, scene); } catch { } root.visible = QW.mode === "walk";
    window.__aoi = AOI;
  })().catch(e => { console.warn("碧の姿を読み込めませんでした：", e?.message ?? e); });
}
function aoiSpot(out) {   // 見る人の斜め前（道の中心の側）2.2 m
  const f = MOBILE ? 2.7 : 2.3, s = MOBILE ? .36 : .95;
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), n = nearestOnLine(CAM.pos.x, CAM.pos.z), a = atD(n.d);
  const rx = -fz, rz = fx, side = ((a.x - CAM.pos.x) * rx + (a.z - CAM.pos.z) * rz) >= 0 ? 1 : -1;
  out.set(CAM.pos.x + fx * f + rx * s * side, 0, CAM.pos.z + fz * f + rz * s * side); out.y = groundY(out.x, out.z); return out;
}
function aoiArrive() {
  loadAoi().then(() => {
    if (!AOI.m || QW.mode !== "walk") return;
    aoiSpot(AOI.pos); AOI.m.teleport(AOI.pos.x, AOI.pos.z, Math.atan2(CAM.pos.x - AOI.pos.x, CAM.pos.z - AOI.pos.z)); AOI.root.visible = true;
    if (!AOI.greeted) { AOI.greeted = true; setTimeout(() => { if (QW.mode === "walk" && !PANEL.cur) { speakLines([D.intro], null); setTimeout(() => toastGlass(), 5200); } }, 900); }
  });
}
function toastGlass() { if (!LAYER.on && QW.mode === "walk") { $("#qBtn").classList.add("hint"); setTimeout(() => $("#qBtn").classList.remove("hint"), 6000); } }
const _ap = new THREE.Vector3();
function stepAoi(dt) {
  if (!AOI.m || !AOI.root.visible) return;
  aoiSpot(_ap);
  // 碧の位置はこのページが運ぶ（見る人の歩く速さに遅れない）。足の運び・向き・体は AoiMotion が、その動きから決める
  const P = AOI.m.pos, dx = _ap.x - P.x, dz = _ap.z - P.z, dist = Math.hypot(dx, dz);
  if (dist > 18) { AOI.m.teleport(_ap.x, _ap.z, CAM.yaw + Math.PI); AOI.v = 0; }
  else {
    const go = WALK.moving ? dist > .25 : dist > (AOI.v > .1 ? .3 : 1.3);
    const want = go ? Math.min(1.6, dist * 1.4 + (WALK.moving ? WALK.speed * .6 : 0)) : 0;
    AOI.v = (AOI.v || 0) + Math.max(-1.8 * dt, Math.min(1.0 * dt, want - (AOI.v || 0)));
    if ((AOI.v > .02 || want > 0) && dist > .01) { const st = Math.min(dist, AOI.v * dt); AOI.m.drive(P.x + dx / dist * st, P.z + dz / dist * st); }
    else { if (AOI.v !== 0 || AOI.m.driven) AOI.m.walkTo(null); AOI.v = 0; AOI.m.faceTo(AOI.focus ? Math.atan2(AOI.focus.x - P.x, AOI.focus.z - P.z) * .4 + Math.atan2(CAM.pos.x - P.x, CAM.pos.z - P.z) * .6 : Math.atan2(CAM.pos.x - P.x, CAM.pos.z - P.z)); }
  }
  if (!AOI.focus) AOI.m.lookAt(null);
  AOI.m.update(dt, camera);
}

/* ---------- 環世界の体験（研究の手がかりを、模式の形で） ---------- */
const EXP = { echo: null, night: false };
const EXP_FIG = {
  echo: `<figcaption>押すと、この場所から音がひろがり、木と地面に当たって戻るまでの時間の順に、点が灯ります。音の速さ（秒速 343 m）で計算し、時間を 16 倍に引きのばした模式です。鳴る音も、同じく 16 倍に引きのばした模式の音です。</figcaption>`,
  cones: `<svg viewBox="0 0 320 120" role="img" aria-label="人の三種類と鳥の四種類の錐体の、感じる光の範囲の模式"><defs><linearGradient id="spg" x1="0" x2="1"><stop offset="0" stop-color="#6b4bd8"/><stop offset=".18" stop-color="#5a5cf0"/><stop offset=".38" stop-color="#3fb4e0"/><stop offset=".58" stop-color="#7fe08a"/><stop offset=".78" stop-color="#f2cf5c"/><stop offset="1" stop-color="#ef6a4a"/></linearGradient></defs>
    <rect x="20" y="96" width="280" height="4" fill="url(#spg)" opacity=".85"/><text x="20" y="114" class="t">紫外</text><text x="300" y="114" class="t" text-anchor="end">赤</text>
    <text x="20" y="20" class="t">人：3 種類</text>${[.42, .62, .72].map(c => `<path d="M${20 + 280 * (c - .16)} 52 Q${20 + 280 * c} 18 ${20 + 280 * (c + .16)} 52" class="cu h"/>`).join("")}
    <text x="20" y="66" class="t">鳥：4 種類</text>${[.12, .36, .56, .72].map(c => `<path d="M${20 + 280 * (c - .1)} 92 Q${20 + 280 * c} 64 ${20 + 280 * (c + .1)} 92" class="cu b"/>`).join("")}</svg>
    <figcaption>錐体の数と、感じる光の帯のならび方の模式。山の位置は種や環境で違います（Hart 2001）。</figcaption>`,
  eye15: `<svg viewBox="0 0 320 70" role="img" aria-label="アオスジアゲハの15種類の光受容細胞が6群に分かれる模式"><defs><linearGradient id="spg2" x1="0" x2="1"><stop offset="0" stop-color="#6b4bd8"/><stop offset=".3" stop-color="#3fb4e0"/><stop offset=".55" stop-color="#7fe08a"/><stop offset=".78" stop-color="#f2cf5c"/><stop offset="1" stop-color="#ef6a4a"/></linearGradient></defs>
    <rect x="20" y="50" width="280" height="4" fill="url(#spg2)" opacity=".85"/>${[[0, 2], [1, 2], [2, 3], [3, 4], [4, 2], [5, 2]].map(([g, n]) => Array.from({ length: n }, (_, k) => `<circle cx="${34 + g * 50 + k * 8}" cy="${32 - (k % 2) * 8}" r="3" class="dt"/>`).join("") + `<text x="${34 + g * 50}" y="66" class="t">${["紫外", "紫", "青", "緑", "橙", "赤"][g]}</text>`).join("")}</svg>
    <figcaption>15 種類の細胞を 6 つの群に分けた、という報告の模式（Chen ほか 2016）。15 の色を見分けるという意味ではありません。</figcaption>`,
};
const EXP_BTNS = {
  echo: [{ label: "反響の手がかりを見る", run: L => startEcho(L) }],
  _: null,
  cones: [{ label: "鳥の高さで飛ぶ", run: () => { hidePanel(); startFly(); } }],
  worm: [{ label: "ミミズのくらす高さまで下りる", run: L => toggleLow(L) }],
};
function startEcho(L) {   // 音の速さ（343 m/秒）で、木と地面と構造物に当たって戻るまでの時間を、16 倍に引きのばして見せる
  expStop();
  const src = L.glyph.getWorldPosition(new THREE.Vector3()), hits = [], N = MOBILE ? 360 : 720;
  const near = TREE.list.filter(t => Math.hypot(t.x - src.x, t.z - src.z) < 45);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i + .5) / N * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996, dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    let best = 45;
    if (dir.y < -.02) { const t = (groundY(src.x, src.z) - src.y) / dir.y; if (t > 0) best = Math.min(best, t); }
    for (const t of near) {   // 樹冠を球、幹を線とみなす
      const h = (SPH[t.sp] || 14) * t.s, c = _v3.set(t.x, t.y + h * .62, t.z), rad = (TREE.protos[t.sp]?.w || h * .7) * .45 * t.s;
      const oc = src.clone().sub(c), b = oc.dot(dir), cc = oc.lengthSq() - rad * rad, disc = b * b - cc;
      if (disc > 0) { const tt = -b - Math.sqrt(disc); if (tt > .5 && tt < best) best = tt; }
    }
    if (best < 45) hits.push({ p: src.clone().addScaledVector(dir, best), d: best });
  }
  const pos = new Float32Array(hits.length * 3); hits.forEach((h, i) => pos.set([h.p.x, h.p.y, h.p.z], i * 3));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setDrawRange(0, 0);
  hits.sort((a, b) => a.d - b.d); hits.forEach((h, i) => pos.set([h.p.x, h.p.y, h.p.z], i * 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex(), color: "#e2dbff", size: MOBILE ? .5 : .42, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  // 波の先：三つの大円（ジャイロの輪）がひろがる
  const sw = new THREE.Group(), cpts = Array.from({ length: 97 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * 6.2832), Math.sin(i / 96 * 6.2832), 0)), lm = new THREE.LineBasicMaterial({ color: "#b4a2ff", transparent: true, opacity: .6, depthWrite: false });
  for (const r of [[0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0]]) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cpts), lm); l.rotation.set(...r); sw.add(l); }
  sw.userData.m = lm; sw.position.copy(src); world.add(pts, sw);
  EXP.echo = { pts, sw, hits, t: 0, src };
  chirp();
}
function chirp() {   // 9〜11 ミリ秒の、高さがゆるやかに変わる音を、16 倍に引きのばして耳に届く高さにした模式の音
  if (!soundOn) return;
  try { const ac = EXP.ac ||= new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = "sine"; o.frequency.setValueAtTime(3000, t); o.frequency.exponentialRampToValueAtTime(2600, t + .16);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + .17); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .2); } catch { }
}
function stepExp(dt) {
  const E = EXP.echo; if (!E) return;
  E.t += dt; const SLOW = 16, c = 343 / SLOW, r = E.t * c;   // 波の先の半径（片道）
  E.sw.scale.setScalar(Math.max(.01, r)); E.sw.userData.m.opacity = Math.max(0, .65 * (1 - r / 45));
  const back = E.t * c / 2; let n = 0; while (n < E.hits.length && E.hits[n].d < back) n++;   // 往復した分だけ点が灯る
  E.pts.geometry.setDrawRange(0, n);
  if (E.t > 45 * 2 / c + 6) { E.pts.material.opacity = Math.max(0, E.pts.material.opacity - dt); if (E.pts.material.opacity <= 0) expStop(); }
}
function expStop() {
  if (EXP.echo) { world.remove(EXP.echo.pts, EXP.echo.sw); EXP.echo.pts.geometry.dispose(); EXP.echo.sw.traverse(o => o.geometry?.dispose()); EXP.echo = null; }
  if (EXP.night) toggleLow(null, false);
}
function toggleLow(L, on = !EXP.night) {   // 目の高さを、地面すれすれ（約 6 cm）まで下ろす。見え方を再現するのではなく、くらす高さに視点を置く
  EXP.night = on; AOI.low = on;
  if (on && L) { CAM.pos.x = L.o.x - Math.sin(CAM.yaw) * 1.2; CAM.pos.z = L.o.z - Math.cos(CAM.yaw) * 1.2; CAM.yaw = Math.atan2(-(L.o.x - CAM.pos.x), -(L.o.z - CAM.pos.z)); CAM.pitch = -.05; }
  document.querySelectorAll(".expBtn").forEach(b => { if (b.textContent.includes("高さ")) b.textContent = on ? "目の高さにもどる" : "ミミズのくらす高さまで下りる"; });
}

/* ---------- 画面の部品 ---------- */
function toast(t) { const e = $("#toast"); e.textContent = t; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => { e.hidden = true; }, 5200); }
const showSkyUI = () => { $("#skyUI").hidden = false; $("#pinLabels").hidden = false; };
const hideSkyUI = () => { $("#skyUI").hidden = true; $("#pinLabels").hidden = true; };
const showWalkUI = () => { $("#walkUI").hidden = false; $("#hud").hidden = false; };
const hideWalkUI = () => { $("#walkUI").hidden = true; };
const showFlyUI = () => { $("#flyUI").hidden = false; $("#hud").hidden = false; };
const hideFlyUI = () => { $("#flyUI").hidden = true; };
function openTray() { $("#tray").hidden = false; $("#qBtn").setAttribute("aria-expanded", "true"); }
function closeTray() { $("#tray").hidden = true; $("#qBtn").setAttribute("aria-expanded", "false"); }
$("#qBtn").addEventListener("click", () => $("#tray").hidden ? openTray() : closeTray());
$("#trayX").addEventListener("click", closeTray);
$("#wearX").addEventListener("click", () => wearGlass(null));
let unlocked = false;
function unlockAudio() {   // スマホのブラウザは、押した操作の中で一度鳴らしておかないと、あとで声が出ない
  if (unlocked || !D) return; unlocked = true;
  try { audio.muted = true; audio.src = D.intro.f; const p = audio.play(); p?.then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false; }).catch(() => { audio.muted = false; unlocked = false; }); } catch { audio.muted = false; }
}
addEventListener("pointerup", () => unlockAudio(), true);
$("#goDown").addEventListener("click", () => { unlockAudio(); descendTo(Math.max(0, START.sel)); });
$("#skyFly").addEventListener("click", () => { unlockAudio(); startFly(); });
$("#modeSky").addEventListener("click", () => { if (QW.mode !== "sky") toSky(); });
$("#modeWalk").addEventListener("click", () => { if (QW.mode === "fly") landFromFly(); else if (QW.mode === "sky") descendTo(Math.max(0, START.sel)); });
$("#modeFly").addEventListener("click", () => { if (QW.mode !== "fly") startFly(); });
const holdBtn = (el, on, off) => { el.addEventListener("pointerdown", e => { e.preventDefault(); on(); el.setPointerCapture(e.pointerId); }); for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, off); };
holdBtn($("#fwd"), () => { WALK.hold = true; WALK.goal = null; }, () => { WALK.hold = false; });
holdBtn($("#flyUp"), () => FLY.up = true, () => FLY.up = false);
holdBtn($("#flyDown"), () => FLY.down = true, () => FLY.down = false);
$("#land").addEventListener("click", landFromFly);
$("#menuBtn").addEventListener("click", () => { const m = $("#menu"); m.hidden = !m.hidden; $("#menuBtn").setAttribute("aria-expanded", String(!m.hidden)); });
$("#menuX").addEventListener("click", () => { $("#menu").hidden = true; $("#menuBtn").setAttribute("aria-expanded", "false"); });
$("#sndBtn").addEventListener("click", () => { soundOn = !soundOn; $("#sndBtn").setAttribute("aria-pressed", String(soundOn)); $("#sndBtn").textContent = soundOn ? "声 オン" : "声 オフ"; if (!soundOn) { try { audio.pause(); } catch { } } });
QW.autoWalk = on => { WALK.hold = on; };
QW.dbg = () => ({ moving: WALK.moving, v: AOI.v, ap: [_ap.x, _ap.z], vis: AOI.root?.visible, cam: [CAM.pos.x, CAM.pos.z], mode: QW.mode });
QW.wear = id => wearGlass(id);
QW.goto = d => { const a = atD(d); CAM.pos.set(a.x, groundY(a.x, a.z) + EYE, a.z); CAM.yaw = yawAlong(d + 5); if (AOI.m) { aoiSpot(AOI.pos); AOI.m.teleport(AOI.pos.x, AOI.pos.z, CAM.yaw + Math.PI); } updateTrees(true); };
QW.open = id => { const L = LAYER.objs.find(l => l.o.id === id); if (L) openObj(L); return !!L; };

function fillMenu() {
  $("#about").textContent = D.about; $("#aoiNote").textContent = "碧（あおい）は、この作品の案内役です。話すのは、それぞれの物の「出典と確かさ」にある記録だけです。碧の姿：mitsulab（VRoid）／声：VOICEVOX:冥鳴ひまり。";
  $("#credit").textContent = "地形：国土地理院 標高タイル（DEM5A）・全国最新写真（シームレス）を mitsulab が加工／建物：国土交通省 PLATEAU さいたま市 2022（CC BY 4.0）を加工（形と高さ。窓と階の並びは模式）／道・木・鳥居・池の位置：© OpenStreetMap contributors（ODbL）／舗装・樹皮・葉の質感：Poly Haven・ambientCG（CC0）／樹木の話：さいたま市・氷川の杜まちづくり協議会『氷川参道の樹木調査』・環境省 巨樹・巨木林データベース・日本語版 Wikipedia（CC BY-SA 4.0）／歴史と文化の話：武蔵一宮氷川神社「由緒・歴史」「境内のご案内」「年間の祭典」・さいたま市・さいたま市立博物館・埼玉県立歴史と民俗の博物館・与野郷土資料館・埼玉県・国土地理院（それぞれの物の「出典と確かさ」に）／生きものの話：日本語版 Wikipedia（CC BY-SA 4.0）・iNaturalist の投稿者のみなさん（種の名前）・研究論文（それぞれの物の「出典と確かさ」に）／Qualia のグラスと情報の物の形：mitsulab（three.js の基本形で作成）";
  $("#music").textContent = "";
}
function buildTray() {
  const thumbs = glassThumbs(renderer, QW.env);
  const box = $("#glasses"); box.innerHTML = "";
  for (const g of GLASSES) {
    const n = D.objs.filter(o => o.layer === g.id).length;
    const b = document.createElement("button"); b.type = "button"; b.className = "glassBtn"; b.dataset.id = g.id; b.setAttribute("aria-pressed", "false"); b.style.setProperty("--gc", g.color);
    b.innerHTML = `<img src="${thumbs[g.id]}" alt="" width="120" height="75"><span class="gn">${g.name}</span><span class="gl">${g.lead}</span><span class="gk" data-n="${n} か所">${n} か所</span>`;
    b.addEventListener("click", () => wearGlass(g.id)); box.appendChild(b);
  }
}

/* ---------- まわす ---------- */
const clock = new THREE.Clock(); let fpsAcc = 0, fpsN = 0, prT = 0;
function frame() {
  const dt = Math.min(.05, clock.getDelta());
  if (!stepTween(dt)) {
    if (QW.mode === "sky") { SKY.az += (SKY.tAz - SKY.az) * Math.min(1, dt * 5); SKY.el += (SKY.tEl - SKY.el) * Math.min(1, dt * 5); SKY.dist += (SKY.tDist - SKY.dist) * Math.min(1, dt * 5); skyCam(); }
    else if (QW.mode === "walk") stepWalk(dt);
    else if (QW.mode === "fly") stepFly(dt);
  }
  if (QW.mode === "sky") {   // 地図の点の名前（7 つだけ）
    START.pins.forEach((p, i) => { _v3.copy(p.head.position).project(camera); const l = START.labels[i]; if (_v3.z > 1) { l.style.display = "none"; return; } l.style.display = ""; l.style.transform = `translate(${(_v3.x + 1) / 2 * innerWidth}px,${(1 - _v3.y) / 2 * innerHeight}px)`; });
  }
  if (WALK.ring?.visible) { WALK.ringT = (WALK.ringT || 0) + dt; WALK.ring.material.opacity = .85 * (.6 + .4 * Math.cos(WALK.ringT * 4)); }
  updateTrees();
  if (BLD.length) { const cp = camera.position, far = QW.mode === "walk" ? (MOBILE ? 320 : 430) : 1e9; for (const b of BLD) { const s = b.userData.ws; b.visible = Math.hypot(s.center.x - cp.x, s.center.z - cp.z) - s.radius < far; } }
  if (STONES.length && QW.mode !== "sky") { const cp = camera.position; for (const r of STONES) { const s = r.userData.ws; r.visible = s.center.distanceTo(cp) - s.radius < 160; } }
  stepLayer(dt); stepExp(dt);
  if (QW.mode === "walk") stepAoi(dt);
  renderer.render(scene, camera);
  // こまの速さを見て、画面の細かさを上げ下げする（落ち込みを止める）
  fpsAcc += dt; fpsN++; prT += dt;
  if (prT > 1.5) { const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0; prT = 0; const lim = MOBILE ? 1 / 32 : 1 / 52;
    if (avg > lim && pr > .9) { pr = Math.max(.9, pr - .15); renderer.setPixelRatio(pr); resize(); }
    else if (avg < lim * .62 && pr < PR_MAX) { pr = Math.min(PR_MAX, pr + .1); renderer.setPixelRatio(pr); resize(); } }
  QW.fps = 1 / dt;
}
document.addEventListener("visibilitychange", () => { if (document.hidden) { renderer.setAnimationLoop(null); try { audio.pause(); } catch { } } else { clock.getDelta(); renderer.setAnimationLoop(frame); } });

(async () => {
  try {
    await buildBase();
    buildObjs(); fillMenu();
    setMode("sky"); skyCam(); showSkyUI(); selectStart(0);
    renderer.setAnimationLoop(frame);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    document.body.classList.add("ready");
    QW.ready = true; QW.tReady = performance.now() - T0;
    setTimeout(() => { try { buildTray(); } catch (e) { console.warn("tray", e); } }, 60);
    // 歩く前に要るものを、上空で選んでいるあいだに読む
    setTimeout(() => { loadLate(); setTimeout(loadAoi, 400); }, 300);
    const s0 = Q.get("start"); if (s0 != null && D.starts[+s0]) { selectStart(+s0); descendTo(+s0); }
    if (Q.get("glass")) setTimeout(() => wearGlass(Q.get("glass")), 200);
  } catch (e) {
    console.error(e); status("読み込めませんでした。ページを開きなおしてください。");
  }
})();
