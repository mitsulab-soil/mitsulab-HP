/* Qualium 川越（旧 Qualia/walk 川越）── （2026-10-22 初版・10-23 公開）
   3D 地図（上空）から始める場所を選ぶ → 降りて歩く（見回しながら）／鳥になって飛ぶ／生きもの（Qualia/sight）になる。
   左の層の一覧：Qualia/sight・touch・sound（sho を含む）・nature・culture（歴史を含む）の 5 つ。触れると重ねる／外す（既定は全部重ねる）。
   建物は OpenStreetMap の平面を、電脳の HUD のような半透明の薄いグラフィックに（高さは模式）。一番街の店蔵の型と時の鐘だけ写実の 3D。
   座標：x＝東 m・y＝標高 m・z＝南 m（原点＝時の鐘 35.92348N 139.48334E）。
   walk 氷川（web/lite/app.js）の作りを写して、川越の中身で組み直した（氷川のファイルは触っていない）。 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { QLAYERS, makeMarker, makeLabel, glowTex } from "./layers.js?v=k2";
import { makeQMarks, placeLabels } from "./qmarks.js?v=q5k";
import { kuraMats, kuraGeos, machiGeos, bellGeos, W0, D0 } from "./kura.js?v=k8";
import { BellSynth } from "./bell.js?v=k1";
import { makeHereWalk } from "./herewalk.js?v=2";
import { makeSoundWalk } from "./soundwalk.js?v=1";
import { makeAmbience } from "./ambience.js?v=1";
import { SPOTS } from "./sounds.js?v=4";
import { makeEarWalk } from "./earwalk.js?v=1";
import { makeAreas } from "./areas.js?v=4";

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 820;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const T0 = performance.now();
const QW = window.__qw = { ready: false, mode: "boot" }; QW.THREE = THREE;
const VER = "20261026z";
const status = t => { const e = $("#bootStatus"); if (e) e.textContent = t; };

/* ---------- 描画 ---------- */
const canvas = $("#gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance" });
const PR_MAX = MOBILE ? Math.min(devicePixelRatio, 1.6) : Math.min(devicePixelRatio, 1.5);
let pr = PR_MAX; renderer.setPixelRatio(pr);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
QW.renderer = renderer;
const scene = new THREE.Scene(), world = new THREE.Group(); scene.add(world); QW.scene = scene;
/* 2026-10-26 本人「Qualia がメインで、風景はそのオーバーレイ」（氷川と同じ）：層を重ねているあいだ、風景（トーンマップされる物）だけ一段控えめに。印・碧・かさねっこ・札は除く。層をすべて外すと元へ */
const LANDG = { value: 0 }, LZERO = { value: 0 }; QW.LANDG = LANDG;
THREE.ShaderChunk.tonemapping_pars_fragment = "uniform float uLandG;\n" + THREE.ShaderChunk.tonemapping_pars_fragment;
THREE.ShaderChunk.tonemapping_fragment += `
#if defined( TONE_MAPPING )
{ float lu = dot(gl_FragColor.rgb, vec3(.2126, .7152, .0722)); vec3 lg = mix(vec3(lu), gl_FragColor.rgb, .34) * vec3(.64, .66, .71); gl_FragColor.rgb = mix(gl_FragColor.rgb, lg, uLandG); }
#endif
`;
THREE.Material.prototype.onBeforeCompile = function (sh) { sh.uniforms.uLandG = this.userData.land ? LANDG : LZERO; };
function landSweep() {
  const skip = new Set(), ex = o => o?.traverse(c => skip.add(c)); ex(AOI.root); ex(KASA.herd?.group);
  world.traverse(o => {
    if (!o.isMesh || skip.has(o)) return;
    for (const m of [].concat(o.material)) {
      if (!m || m.userData.land !== undefined) continue;
      if ((m.isShaderMaterial || m.isSpriteMaterial) && !m.toneMapped) { m.userData.land = false; continue; }
      if (!m.toneMapped) { m.userData.land = false; continue; }
      m.userData.land = true;
      if (Object.prototype.hasOwnProperty.call(m, "onBeforeCompile")) {
        const f = m.onBeforeCompile, ck = m.customProgramCacheKey, own = Object.prototype.hasOwnProperty.call(m, "customProgramCacheKey");
        m.onBeforeCompile = function (sh, r) { f.call(this, sh, r); sh.uniforms.uLandG = LANDG; };
        m.customProgramCacheKey = own ? () => ck.call(m) + "|land" : () => f.toString() + "|land";
      }
      m.needsUpdate = true;
    }
  });
}
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
// 2026-10-23 深夜：降りる途中の空を途切れなく。暗い地（電脳の地図）から写真の空へ、高さに合わせて少しずつ（空を一度に切りかえると、真っ黒な空のこまが出た）
const VEIL = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ uniforms: { opacity: { value: 0 }, uC: { value: NAVY } }, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  vertexShader: "varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
  fragmentShader: "uniform float opacity; uniform vec3 uC; varying float vY; void main(){ gl_FragColor = vec4(uC, opacity * mix(1., .22, smoothstep(-.16, .05, vY))); \n#include <colorspace_fragment>\n}" })); VEIL.renderOrder = -10; VEIL.visible = false; VEIL.frustumCulled = false; scene.add(VEIL);
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
/* 歩ける道（2026-10-25 本人「裏路地に入っても体験が続くように範囲をもう少し広げて」）：一番街の両側の裏路地・並行する道・喜多院／川越氷川神社／新河岸川への道。
   OSM の公道と一般に通れる道だけ（_dev/build_data.py の build_walk）。起動のあとに読む（読むまでは道筋 A のまわり 14 m だけ） */
const NET = { segs: null, hash: new Map(), cell: 20, box: null, p: null };
function loadNet() {
  return NET.p ||= fetch("web/geo/walk.json?v=" + VER).then(r => r.json()).then(j => {
    const S = []; for (const w of j.w) { const hw = w[0]; for (let i = 1; i + 3 < w.length; i += 2) S.push(w[i], w[i + 1], w[i + 2], w[i + 3], hw); }
    const segs = new Float32Array(S), c = NET.cell;
    for (let s = 0; s < segs.length; s += 5) { const x0 = Math.min(segs[s], segs[s + 2]) - 12, x1 = Math.max(segs[s], segs[s + 2]) + 12, z0 = Math.min(segs[s + 1], segs[s + 3]) - 12, z1 = Math.max(segs[s + 1], segs[s + 3]) + 12;
      for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let k = Math.floor(z0 / c); k <= Math.floor(z1 / c); k++) { const key = i * 4096 + k; let a = NET.hash.get(key); if (!a) NET.hash.set(key, a = []); a.push(s); } }
    NET.segs = segs; NET.box = j.box; NET.pw = (j.pw || []).map(f => { const r = []; for (let i = 0; i + 1 < f.length; i += 2) r.push({ x: f[i], y: f[i + 1] }); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of r) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); } return { r, x0, x1, z0, z1 }; }); QW.NET = NET; return NET;
  }).catch(e => { console.warn("歩ける道を読み込めませんでした", e?.message ?? e); return null; });
}
const _nn = { dist: 1e9, x: 0, z: 0, hw: 0, tx: 0, tz: 1 };
function netNear(x, z, R = 24, out = _nn) {   // いちばん近い歩ける道（中心の線までの距離と、その点・半幅・向き）
  out.dist = 1e9; out.hw = 0; const S = NET.segs; if (!S) return out; const c = NET.cell, r = Math.ceil(R / c), ci = Math.floor(x / c), ck = Math.floor(z / c);
  for (let i = ci - r; i <= ci + r; i++) for (let k = ck - r; k <= ck + r; k++) { const a = NET.hash.get(i * 4096 + k); if (!a) continue;
    for (const s of a) { const ax = S[s], az = S[s + 1], vx = S[s + 2] - ax, vz = S[s + 3] - az, l2 = vx * vx + vz * vz || 1e-9; let t = ((x - ax) * vx + (z - az) * vz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + vx * t, pz = az + vz * t, d = Math.hypot(x - px, z - pz); if (d - S[s + 4] < out.dist - out.hw) { const l = Math.sqrt(l2); out.dist = d; out.x = px; out.z = pz; out.hw = S[s + 4]; out.tx = vx / l; out.tz = vz / l; } } }
  return out;
}
function netFar(x, z) {   // 範囲の外から：いちばん近い歩ける道まで（全部を見る・現在地の判定にだけ使う）
  const S = NET.segs; let best = 1e9, bx = 0, bz = 0; if (!S) return { dist: best };
  for (let s = 0; s < S.length; s += 5) { const ax = S[s], az = S[s + 1], vx = S[s + 2] - ax, vz = S[s + 3] - az, l2 = vx * vx + vz * vz || 1e-9; let t = ((x - ax) * vx + (z - az) * vz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + vx * t, pz = az + vz * t, d = Math.hypot(x - px, z - pz); if (d < best) { best = d; bx = px; bz = pz; } }
  return { dist: best, x: bx, z: bz };
}
const onNet = (x, z, m = 0) => { const n = netNear(x, z, 20); return n.dist <= n.hw + m; };
const stAt = s => s.x != null ? { x: s.x, z: s.z, tx: 0, tz: -1 } : atD(s.d);   // 2026-10-26 広げたエリアの始める所は x・z で
const stYaw = s => s.yaw != null ? s.yaw : yawAlong(s.d);
const yawAlong = d => { const a = atD(d); return Math.atan2(-a.tx, -a.tz); };   // 道のりの増える向き（北へ）を向く

const TL = new THREE.TextureLoader();
const texP = (u, srgb = true) => new Promise((res, rej) => TL.load(u, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 2 : 8; res(t); }, undefined, rej));

/* ---------- 地形（標高 5 m 格子・空中写真） ---------- */
const DESAT = { value: 0 };   // 2026-10-23 公開前：鳥の高さで見ると、空中写真の粗い所が青緑の水面のように見えたので、sight では写真の色みを抜いて灰にする
const desat = m => { m.onBeforeCompile = (sh => { const prev = m._obc; return s => { prev && prev(s); s.uniforms.uDesat = DESAT; s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uDesat;").replace("#include <map_fragment>", "#include <map_fragment>\n { float lu=dot(diffuseColor.rgb,vec3(.299,.587,.114)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(lu*1.03,lu,lu*.95),uDesat); }"); }; })(); return m; };
async function buildBase() {
  status("地形を読み込んでいます");
  const [g, c, dem] = await Promise.all([fetch("web/geo/geo.json?v=" + VER).then(r => r.json()), fetch("web/app/content.json?v=" + VER).then(r => r.json()), fetch("web/geo/dem.bin?v=" + VER).then(r => r.arrayBuffer()), loadNet()]);   // 歩ける道（30 KB）も一緒に
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
  paveStreets(G.roads.filter(r => /大正浪漫|クレアモール/.test(r.nm)).map(r => ({ k: /大正浪漫/.test(r.nm) ? "T" : "M", P: r.p, w: r.w + .4 })));
  // 歩道（模式）：車の通る道の両わきに、コンクリートの舗装の帯を道の下に敷く（Poly Haven「Concrete Pavement」CC0）
  const sw = []; for (const r of G.roads) { if (r.w < 7) continue; if (!r.p.some(p => Math.hypot(p[0], p[1] - 400) < 900)) continue; sw.push(ribbon(densify(r.p, 4), r.w + 4.6, .03, 1.2)); }
  if (sw.length) { const ld = (u, srgb) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 4 : 8; return t; };
    const pm = new THREE.MeshStandardMaterial({ map: ld("web/tex/pave_c.webp", true), normalMap: ld("web/tex/pave_n.webp"), color: "#8e8981", roughness: 1, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -1.5 });
    const pv = new THREE.Mesh(mergeIdx(sw), pm); pv.name = "walkway"; world.add(pv); QW.pave = pv; }
}
/* 2026-10-26 通りごとの舗装（模式）：大正浪漫夢通り＝石の平板（Poly Haven「Stone Tiles 02」CC0）、クレアモール＝御影石の平板（Poly Haven「Granite Tile」CC0）。中央通りはアスファルトのまま */
const PAVE = {};
function paveMat(k) {
  if (PAVE[k]) return PAVE[k];
  const ld = (u, srgb) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 4 : 8; return t; };
  const m = k === "T" ? new THREE.MeshStandardMaterial({ map: ld("web/tex/stile_c.webp", true), normalMap: ld("web/tex/stile_n.webp"), color: "#8c8579", roughness: .95, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 })
    : new THREE.MeshStandardMaterial({ map: ld("web/tex/granite_c.webp", true), normalMap: ld("web/tex/granite_n.webp"), color: "#8a8784", roughness: .9, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
  return PAVE[k] = m;
}
function paveStreets(list, parent) {   // list＝[{k, P, w}]
  const by = { T: [], M: [] }; for (const r of list) if (by[r.k] && r.P.length > 1) by[r.k].push(ribbon(densify(r.P, 3), r.w, .07 + r.w * .002, r.k === "T" ? 2.4 : 1.6));
  for (const k in by) if (by[k].length) { const m = new THREE.Mesh(mergeIdx(by[k]), paveMat(k)); m.renderOrder = 1; m.name = "pave_" + k; (parent || world).add(m); if (!parent) (QW.paveSt ||= []).push(m); }
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
  const [buf] = await Promise.all([fetch("web/geo/bld.bin?v=" + VER).then(r => r.arrayBuffer()), loadNet(), AREAS.load()]), a = new Int16Array(buf);
  const B = NET.box || [0, 0, 0, 0], inBox = (x, z, m) => x > B[0] - m && x < B[2] + m && z > B[1] - m && z < B[3] + m;   // 歩ける道の範囲（とそのまわり）
  const P = [], Y0 = [], E = [], F = [], LIM = MOBILE ? 700 : 1600;
  let i = 0, nb = 0;
  while (i < a.length) {
    const n = a[i], hRaw = a[i + 1], low = (hRaw & 0x4000) !== 0, h = (hRaw & 0x3fff) / 10, y = a[i + 2] / 10; i += 3;
    const ring = []; for (let k = 0; k < n; k++) { ring.push(new THREE.Vector2(a[i] / 10, a[i + 1] / 10)); i += 2; }
    const cx = ring[0].x, cz = ring[0].y, box = inBox(cx, cz, 60); if (Math.hypot(cx, cz - 400) > LIM && !inBox(cx, cz, MOBILE ? 120 : 300)) continue; if (!low && AREAS.owned(cx, cz)) continue; nb++;
    const top = low ? y + .06 : y + h, far = !box && Math.hypot(cx, cz - 400) > 600;   // 型を置いた所は、地面の地割の線だけ
    if (!low && box && NET.pw) { let mx = 0, mz = 0; for (const p of ring) { mx += p.x; mz += p.y; } mx /= n; mz /= n; const A = Math.abs(THREE.ShapeUtils.area(ring));
      if (A > 18 && A < 3000 && (Math.hypot(mx - 465, mz + 440) < 62 || NET.pw.some(w => mx > w.x0 && mx < w.x1 && mz > w.z0 && mz < w.z1 && inRing(w.r, mx, mz))) && !netCrosses(ring)) { addTemple(ring, y, A); continue; } }   // 2026-10-26 川越氷川神社の境内（OSM では点だけ）も寺社の型に   // 2026-10-25 寺社の境内の建物＝寺社の建物の型（模式）
    if (!low && !far && streetSide(ring)) { addSolid(ring, y, top, SOLID, eraAt(ring)); for (let k = 0; k < n; k++) { const p = ring[k], q = ring[(k + 1) % n]; E.push(p.x, top, p.y, q.x, top, q.y); } continue; }   // 2026-10-24 本人「人が歩くところは透明にしない」＝通りに面した建物は不透明の壁に（入れない）
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
  buildSolids(); buildTemples(); buildShrine();
}
/* 2026-10-26 川越氷川神社の大鳥居と杜（模式）：鳥居は木の明神鳥居の形（二本の柱・貫・笠木と島木）、杜は境内のまわりの木々。位置は OSM の神社の点と参道の向きから。一本ずつの木や、実物の寸法を写したものではない */
function buildShrine() {
  const C0 = { x: 470, z: -453 }, g = new THREE.Group(); g.name = "shrine";
  const wood = new THREE.MeshStandardMaterial({ color: "#9a8266", roughness: .85, map: TL.load("web/tex/wood_c.webp", t => { t.colorSpace = THREE.SRGBColorSpace; }) });
  { const ax = .22, az = -.975, TD = MOBILE ? 36 : 22, tx = 457.8 + ax * TD, tz = -399.5 + az * TD, y = groundY(tx, tz), H = 11, sp = 8, T = new THREE.Group(); T.position.set(tx, y, tz); T.rotation.y = Math.atan2(ax, az);   // 降りる所（川越氷川神社）から本殿へ向かう軸の上、22 m 先
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.5, .62, H, 20), wood); p.position.set(sx * sp / 2, H / 2, 0); T.add(p); const k = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .9, 20), new THREE.MeshStandardMaterial({ color: "#2b2a28", roughness: .6 })); k.position.set(sx * sp / 2, .45, 0); T.add(k); }
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(sp + 2.4, .5, .36), wood); nuki.position.y = H - 3.1; T.add(nuki);
    const shim = new THREE.Mesh(new THREE.BoxGeometry(sp + 3.6, .55, .7), wood); shim.position.y = H - .35; T.add(shim);
    const kasa = new THREE.Mesh(new THREE.BoxGeometry(sp + 5, .7, 1.05), wood); kasa.position.y = H + .3; const pa = kasa.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setY(i, pa.getY(i) + Math.pow(Math.abs(x) / ((sp + 5) / 2), 3) * .9); } kasa.geometry.computeVertexNormals(); T.add(kasa);   // 笠木の両端の反り
    const gaku = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.7, .2), new THREE.MeshStandardMaterial({ color: "#3a3128", roughness: .8 })); gaku.position.y = H - 1.75; T.add(gaku);   // 額束（字は描かない）
    g.add(T); for (const sx of [-1, 1]) { const cx = tx + sx * sp / 2 * .975, cz = tz + sx * sp / 2 * .22; regSolidTo([new THREE.Vector2(cx - .7, cz - .7), new THREE.Vector2(cx + .7, cz - .7), new THREE.Vector2(cx + .7, cz + .7), new THREE.Vector2(cx - .7, cz + .7)], { ids: [] }); } }
  world.add(g); forestAt(C0.x, C0.z, 22, 80, MOBILE ? 70 : 130, 7, { x: 457.8, z: -399.5, ax: .22, az: -.975 });
  forestAt(530, 660, 45, 125, MOBILE ? 45 : 80, 11, null);   // 喜多院の境内のまわりの木々（模式）
  QW.shrine = { ok: true }; landSweep();
}
function forestAt(cx, cz, r0, r1, N, sd, axis) {
  const C0 = { x: cx, z: cz }, g = new THREE.Group(); g.name = "forest";
  const pts = []; let seed = sd; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900 && pts.length < N; i++) { const a = rnd() * Math.PI * 2, r = r0 + rnd() * (r1 - r0), x = C0.x + Math.cos(a) * r, z = C0.z + Math.sin(a) * r;
    if (axis) { const dx = x - axis.x, dz = z - axis.z, along = dx * axis.ax + dz * axis.az, off = Math.abs(dx * -axis.az + dz * axis.ax); if (along > -10 && along < 60 && off < 9) continue; }   /* 参道の軸は空ける */ if ((NET.segs && onNet(x, z, 2.5)) || inBld(x, z, 2.5) || pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 5.2) || (C.starts || []).some(t => t.x != null && Math.hypot(t.x - x, t.z - z) < 22)) continue; pts.push([x, z, .8 + rnd() * .6]); }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.28, .42, 1, 7), new THREE.MeshStandardMaterial({ color: "#4a3d31", roughness: .95 }), pts.length);
  const cg = new THREE.IcosahedronGeometry(1, 3); { const p = cg.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(p.getX(i) * 7.1 + p.getZ(i) * 5.3) * .5 + .5) * .22; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .85, p.getZ(i) * k); } cg.computeVertexNormals(); }
  const crown = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .92 }), pts.length * 3);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color(); let ci = 0;
  pts.forEach(([x, z, k], i) => { const y = groundY(x, z), h = 7 * k; M.compose(ps.set(x, y + h / 2, z), q, sc.set(k, h, k)); trunk.setMatrixAt(i, M);
    for (let j = 0; j < 3; j++) { const r = (3 + j * .6) * k * (j ? .75 : 1); M.compose(ps.set(x + (j ? (rnd() - .5) * 3 : 0), y + h + (j ? -1.5 + rnd() * 2 : 1.2) * k, z + (j ? (rnd() - .5) * 3 : 0)), q.setFromAxisAngle(sc.set(0, 1, 0), rnd() * 6), sc.set(r, r, r)); crown.setMatrixAt(ci, M); crown.setColorAt(ci, col.setHSL(.27 + rnd() * .1, .3 + rnd() * .15, .2 + rnd() * .1)); ci++; } });
  g.add(trunk, crown); world.add(g); return pts.length;
}
/* 通りに面した建物（道筋から 24 m 以内に輪郭がかかるもの）：漆喰の不透明の壁と屋根。歩いて中に入らない（足もとの輪郭で止める）。
   道筋が建物の輪郭の中を通るもの（駅の建物など）は、通れなくならないよう、これまでどおり薄いグラフィックに残す */
const SOLID = { P: [], U: [], W: [], C: [], E: [], polys: [], hash: new Map(), cell: 12 };
const SOLID_TONES = [[.24, .19, .14], [.28, .23, .17], [.17, .13, .1], [.11, .1, .09], [.32, .28, .23], [.07, .07, .07]];   // 2026-10-26 採点「白〜ベージュの箱」→ 土壁の茶・焼杉の黒・古い漆喰（色は線形の値）   // 2026-10-26「灰色の面が多い」→ 灰を減らし、土壁の茶と黒漆喰に近い黒を混ぜる   // 2026-10-25 採点「白い張りぼての板に見える」→ 白を抑え、雨に古びた漆喰・タイルの色へ   // 漆喰の白・タイルの砂色・灰・焦げ茶・濃い灰（模式）
function inRing(r, x, z) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a.y > z) !== (b.y > z) && x < (b.x - a.x) * (z - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
function streetSide(ring) {
  const route = nearestOnLine(ring[0].x, ring[0].y).dist < 70;
  if (!route && !NET.segs) return false;
  if (Math.abs(THREE.ShapeUtils.area(ring)) < 25) return false;   // 2026-10-25 採点「白い張りぼての板」＝角の 9 m² ほどの小さな建物（交番や塔のようなもの）は、不透明の箱にせず線のグラフィックのまま
  let near = false; if (route) for (const p of ring) if (nearestOnLine(p.x, p.y).dist < 24) { near = true; break; }
  if (!near && NET.segs) for (const p of ring) { const q = netNear(p.x, p.y, 20); if (q.dist < q.hw + 8) { near = true; break; } }   // 裏路地・並行する道に面した建物も（2026-10-25）
  if (!near) return false;
  if (NET.segs && netCrosses(ring)) return false;   // 歩ける道がこの建物の輪郭の中を通る（境内の道・駅の通路など）＝通れなくならないよう、薄いグラフィックのまま
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); }
  for (const q of G.line) if (q[0] > x0 && q[0] < x1 && q[1] > z0 && q[1] < z1 && inRing(ring, q[0], q[1])) return false;
  const n = nearestOnLine((x0 + x1) / 2, (z0 + z1) / 2), a = atD(n.d); if (inRing(ring, a.x, a.z)) return false;   // 道筋がこの建物の中を通る
  return true;
}
/* 寺社の建物の型（模式・2026-10-25）：境内の建物を、窓のある箱でなく、低い板壁と大きな瓦の寄棟の屋根に。
   喜多院の山門＝切妻造・本瓦葺、鐘楼門＝入母屋造・本瓦葺、川越氷川神社の本殿＝入母屋造・銅瓦葺（川越市の文化財の説明）。ここでは一つの寄棟の形で近づけた模式で、一棟ずつの姿ではない */
const TEMPLE = { wP: [], wU: [], rP: [], rU: [], tags: [] };
function addTemple(ring, y, A) {
  let best = 0, ang = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length], l = Math.hypot(q.x - p.x, q.y - p.y); if (l > best) { best = l; ang = Math.atan2(q.y - p.y, q.x - p.x); } }
  const ux = Math.cos(ang), uz = Math.sin(ang), vx = -uz, vz = ux; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const p of ring) { const a = p.x * ux + p.y * uz, b = p.x * vx + p.y * vz; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  let mx = 0, mz = 0; for (const p of ring) { mx += p.x; mz += p.y; } mx /= ring.length; mz /= ring.length;
  const kind = Math.hypot(mx - 607, mz - 631) < 8 ? "sanmon" : Math.hypot(mx - 615, mz - 683) < 8 ? "shoro" : "";   // 喜多院の山門（切妻造・本瓦葺の四脚門）／鐘楼門（入母屋造・本瓦葺・下層は袴腰）＝川越市の文化財の説明
  let wh = Math.min(5.2, 2.8 + Math.sqrt(A) * .07); if (kind === "sanmon") wh = 4.2; if (kind === "shoro") wh = 5.8;
  const top = y + wh, ov = kind === "shoro" ? 1.6 : kind ? 1.2 : Math.min(1.4, .6 + Math.sqrt(A) * .03);
  // 壁：OSM の輪郭のまま、板壁
  let L = 0; for (let k = 0; k < ring.length; k++) { const p = ring[k], q = ring[(k + 1) % ring.length], len = Math.hypot(q.x - p.x, q.y - p.y);
    if (kind === "shoro") { const k = .86, k2 = .66, k3 = 1.0, hy = y + 3.1, I = (t, c) => [mx + (t.x - mx) * c, mz + (t.y - mz) * c], [px2, pz2] = I(p, k), [qx2, qz2] = I(q, k), [px3, pz3] = I(p, k2), [qx3, qz3] = I(q, k2), [px4, pz4] = I(p, k3), [qx4, qz4] = I(q, k3);   // 下層は裾の広がる袴腰、その上に縁（腰組）、上層は一回り小さい鐘の間
      TEMPLE.wP.push(p.x, y - .3, p.y, q.x, y - .3, q.y, qx2, hy, qz2, p.x, y - .3, p.y, qx2, hy, qz2, px2, hy, pz2);
      TEMPLE.wP.push(px4, hy, pz4, qx4, hy, qz4, qx4, hy + .25, qz4, px4, hy, pz4, qx4, hy + .25, qz4, px4, hy + .25, pz4);   // 縁の板
      TEMPLE.wP.push(px3, hy + .25, pz3, qx3, hy + .25, qz3, qx3, top, qz3, px3, hy + .25, pz3, qx3, top, qz3, px3, top, pz3);
      for (const [u, v] of [[L, 0], [L + len, 0], [L + len, 3.1], [L, 0], [L + len, 3.1], [L, 3.1], [L, 0], [L + len, 0], [L + len, .25], [L, 0], [L + len, .25], [L, .25], [L, 3.4], [L + len * .66, 3.4], [L + len * .66, wh], [L, 3.4], [L + len * .66, wh], [L, wh]]) TEMPLE.wU.push(u / 2, v / 2);
      TEMPLE.rP.push(px4, hy + .25, pz4, qx4, hy + .25, qz4, qx3, hy + .25, qz3, px4, hy + .25, pz4, qx3, hy + .25, qz3, px3, hy + .25, pz3); for (let m = 0; m < 6; m++) TEMPLE.rU.push(0, 0);   // 縁の床
      L += len; continue; }
    TEMPLE.wP.push(p.x, y - .3, p.y, q.x, y - .3, q.y, q.x, top, q.y, p.x, y - .3, p.y, q.x, top, q.y, p.x, top, p.y); for (const [u, v] of [[L, 0], [L + len, 0], [L + len, wh], [L, 0], [L + len, wh], [L, wh]]) TEMPLE.wU.push(u / 2, v / 2); L += len; }
  // 屋根：外へ ov m 出した長方形に寄棟（長い辺の両側は台形、短い辺は三角）
  a0 -= ov; a1 += ov; b0 -= ov; b1 += ov; const W = b1 - b0, Lg = a1 - a0, rise = kind === "sanmon" ? W * .45 : Math.min(7, W * .3), rr = kind === "sanmon" ? Lg / 2 : Math.max(0, (Lg - W) / 2), am = (a0 + a1) / 2, bm = (b0 + b1) / 2, ry = top + rise, ey = top - .15;
  const P = (a, b, h) => [a * ux + b * vx, h, a * uz + b * vz], e1 = P(a0, b0, ey), e2 = P(a1, b0, ey), e3 = P(a1, b1, ey), e4 = P(a0, b1, ey), r1 = P(am - rr, bm, ry), r2 = P(am + rr, bm, ry), sl = Math.hypot(W / 2, rise);
  const tri = (A_, B_, C_, ua, ub, uc) => { TEMPLE.rP.push(...A_, ...B_, ...C_); TEMPLE.rU.push(...ua, ...ub, ...uc); };
  tri(e1, e2, r2, [0, 0], [Lg / 2, 0], [(Lg + 2 * rr) / 4, sl / 2]); tri(e1, r2, r1, [0, 0], [(Lg + 2 * rr) / 4, sl / 2], [(Lg - 2 * rr) / 4, sl / 2]);
  tri(e3, e4, r1, [0, 0], [Lg / 2, 0], [(Lg + 2 * rr) / 4, sl / 2]); tri(e3, r1, r2, [0, 0], [(Lg + 2 * rr) / 4, sl / 2], [(Lg - 2 * rr) / 4, sl / 2]);
  tri(e2, e3, r2, [0, 0], [W / 2, 0], [W / 4, sl / 2]); tri(e4, e1, r1, [0, 0], [W / 2, 0], [W / 4, sl / 2]);
  regSolid(ring); TEMPLE.tags.push({ k: { x: am * ux + bm * vx, z: am * uz + bm * vz, yaw: Math.atan2(vx, vz), dp: W, y }, code: "TEMPLE FORM", name: "寺社の建物の型" });
}
function buildTemples() {
  if (!TEMPLE.rP.length) return; const M = kuraMats(TL, MOBILE);
  const g1 = new THREE.BufferGeometry(); g1.setAttribute("position", new THREE.Float32BufferAttribute(TEMPLE.wP, 3)); g1.setAttribute("uv", new THREE.Float32BufferAttribute(TEMPLE.wU, 2)); g1.computeVertexNormals();
  const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.Float32BufferAttribute(TEMPLE.rP, 3)); g2.setAttribute("uv", new THREE.Float32BufferAttribute(TEMPLE.rU, 2)); g2.computeVertexNormals();
  const wm = M.wood.clone(); wm.color.set("#8a6e52"); const w = new THREE.Mesh(g1, wm), r = new THREE.Mesh(g2, M.tile); w.name = "templeWall"; r.name = "templeRoof"; world.add(w, r); BLD.temple = [w, r]; QW.nTemple = TEMPLE.tags.length;
  if (KURA.tags) KURA.tags.push(...TEMPLE.tags); else KURA.ttags = TEMPLE.tags;
  buildPrecinct();
}
/* 2026-10-26 喜多院の一帯が「草原に建物が点在」して見えた：堂の並ぶ所の地面を、境内の玉砂利（明るい灰の砂利の模式）に。地形に沿わせる */
function buildPrecinct() {
  const K = { x: 590, z: 690 }, ts = TEMPLE.tags.filter(t => Math.hypot(t.k.x - K.x, t.k.z - K.z) < 230); if (ts.length < 2) return;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const t of ts) { x0 = Math.min(x0, t.k.x); x1 = Math.max(x1, t.k.x); z0 = Math.min(z0, t.k.z); z1 = Math.max(z1, t.k.z); }
  x0 -= 22; x1 += 22; z0 -= 22; z1 += 22; const st = 4, nx = Math.ceil((x1 - x0) / st) + 1, nz = Math.ceil((z1 - z0) / st) + 1;
  const P = new Float32Array(nx * nz * 3), U = new Float32Array(nx * nz * 2), A = new Float32Array(nx * nz), I = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = x0 + i * st, z = z0 + j * st; P[k * 3] = x; P[k * 3 + 1] = groundY(x, z) + .05; P[k * 3 + 2] = z; U[k * 2] = x / 3; U[k * 2 + 1] = z / 3;
    let dm = 1e9; for (const t of ts) dm = Math.min(dm, Math.hypot(t.k.x - x, t.k.z - z)); A[k] = 1 - Math.min(1, Math.max(0, (dm - 26) / 14)); }   // 堂から 26 m までが境内、40 m で地へ溶ける
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; I.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.BufferAttribute(U, 2)); g.setAttribute("aA", new THREE.BufferAttribute(A, 1)); g.setIndex(I); g.computeVertexNormals();
  const ld = (u, srgb) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 4 : 8; return t; };
  const m = new THREE.MeshStandardMaterial({ color: "#d6d0c4", map: ld("web/tex/granite_c.webp", true), normalMap: ld("web/tex/granite_n.webp"), normalScale: new THREE.Vector2(1.2, 1.2), roughness: .95, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aA; varying float vA;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvA = aA;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vA;").replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= vA;"); };
  m.customProgramCacheKey = () => "precinct";
  const mesh = new THREE.Mesh(g, m); mesh.name = "precinct"; mesh.renderOrder = 1; world.add(mesh); BLD.precinct = mesh;
}
function regSolid(ring) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); }
  const id = SOLID.polys.push({ ring, x0, x1, z0, z1 }) - 1, c = SOLID.cell;
  for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) { const k = i + "," + j; if (!SOLID.hash.has(k)) SOLID.hash.set(k, []); SOLID.hash.get(k).push(id); }
}
function netCrosses(ring) {   // 歩ける道の中心の線が、この輪郭の中を通るか（1.5 m ごとに見る）
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); }
  const S = NET.segs, c = NET.cell, seen = new Set();
  for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let k = Math.floor(z0 / c); k <= Math.floor(z1 / c); k++) { const a = NET.hash.get(i * 4096 + k); if (!a) continue;
    for (const s of a) { if (seen.has(s)) continue; seen.add(s); const ax = S[s], az = S[s + 1], bx = S[s + 2], bz = S[s + 3], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
      for (let m = 0; m <= n; m++) { const x = ax + (bx - ax) * m / n, z = az + (bz - az) * m / n; if (x > x0 && x < x1 && z > z0 && z < z1 && inRing(ring, x, z)) return true; } } }
  return false;
}
/* 2026-10-26 本人「昭和通り・大正浪漫夢通りなどの通りと、歴史的な建物にこだわる」：通りごとに建物の時代の型（模式・一棟ずつの姿ではない）
   1＝大正〜昭和初めの洋風の看板建築（正面だけを高く立ち上げた平らな面・銅板やモルタル・軒の蛇腹・縦長の窓）
   2＝昭和の商店（一階のシャッターと店先・日よけ・字のない看板の帯・タイルの面・アルミの窓）
   3＝いまの商店街（ガラスの店先・横に連なる窓・字のない袖の看板）　5＝寺社・御殿（板と漆喰の真壁・寄棟の瓦屋根）
   どの通りに何を置くかは、OSM の通りの名と位置で決める（大正浪漫夢通り＝1 が多め／中央通りの仲町より南＝2 と 1／クレアモール＝3 と 2）。店名・ロゴ・字は描かない */
const STREETS = { list: [] };
function addStreets(arr) { for (const r of arr) { const nm = r.nm ?? r[0], p = r.p ?? null; let P = p; if (!P) { P = []; for (let i = 1; i + 1 < r.length; i += 2) P.push([r[i], r[i + 1]]); }
  const k = /大正浪漫/.test(nm) ? "T" : /^中央通り$/.test(nm) ? "S" : /クレアモール|八幡通り|アカシア通り/.test(nm) ? "M" : null; if (k && P.length > 1) STREETS.list.push({ k, P }); } }
function eraAt(ring) {
  if (!STREETS.ready && G) { STREETS.ready = true; addStreets(G.roads); }
  let mx = 0, mz = 0; for (const p of ring) { mx += p.x; mz += p.y; } mx /= ring.length; mz /= ring.length;
  let best = null, bd = 24;
  for (const S of STREETS.list) for (let i = 0; i + 1 < S.P.length; i++) { const a = S.P[i], b = S.P[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz || 1e-9; let t = ((mx - a[0]) * vx + (mz - a[1]) * vz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(mx - a[0] - vx * t, mz - a[1] - vz * t); if (d < bd) { bd = d; best = S.k; } }
  if (best === "S" && !(mz > 240 && mz < 1000)) best = null;   // 中央通りの仲町交差点より南（昭和の街）。北の一番街は蔵造りの型
  const h = Math.abs(Math.sin(mx * 12.9898 + mz * 78.233) * 43758.5453) % 1;
  if (best === "T") return h < .72 ? 1 : h < .88 ? 2 : 0;
  if (best === "S") return h < .45 ? 2 : h < .78 ? 1 : 0;
  if (best === "M") return h < .7 ? 3 : 2;
  return 0;
}
const ERA_TONES = { 1: [[.07, .26, .19], [.09, .3, .23], [.34, .31, .26], [.22, .14, .1]], 2: [[.3, .26, .21], [.2, .2, .2], [.33, .3, .26], [.24, .2, .17]], 3: [[.34, .34, .33], [.24, .25, .26], [.4, .37, .33]], 5: [[.42, .4, .36]] };   // 1＝緑青の銅板・モルタル・洗い出し・焦げ茶のタイル／2＝タイル・灰・砂色／3＝明るい灰／5＝漆喰（線形の値・模式）
const AWN = [[.1, .17, .12], [.24, .07, .06], [.07, .09, .16], [.3, .26, .18], [.16, .16, .15]];   // 日よけ：深緑・えんじ・紺・生成り・灰（字は入れない）
function frontOf(p, q, ring) {   // この壁が、歩ける道か道筋に面しているか（外向きの法線の先 3 m）
  const ex = q.x - p.x, ez = q.y - p.y, L = Math.hypot(ex, ez) || 1; let nx = ez / L, nz = -ex / L; const mx = (p.x + q.x) / 2, mz = (p.y + q.y) / 2;
  if (inRing(ring, mx + nx * .3, mz + nz * .3)) { nx = -nx; nz = -nz; }
  const x = mx + nx * 3, z = mz + nz * 3; let f = false;
  if (NET.segs) { const n = netNear(x, z, 12); f = n.dist < n.hw + 3.2; }
  if (!f && G) f = nearestOnLine(x, z).dist < 9;
  return { f, nx, nz };
}
function addSolid(ring, y, top, acc = SOLID, era = 0) {
  const P = acc.P, U = acc.U, W = acc.W, C = acc.C, E = acc.E, n = ring.length, rnd = Math.random();
  const T = ERA_TONES[era], b = T ? T[Math.floor(rnd * T.length)] : SOLID_TONES[Math.floor(rnd * SOLID_TONES.length)], j = (Math.random() - .5) * .05;
  if (era === 1) top = y + 7.2 + rnd * 1.6; else if (era === 2) top = y + Math.min(Math.max(top - y, 6.6), 10.4); else if (era === 3) top = y + Math.min(Math.max(top - y, 9.5), 22); else if (era === 5) top = y + Math.min(top - y, 5.8);
  const col = [b[0] + j, b[1] + j, b[2] + j], roofc = era === 5 ? [.15, .16, .18] : [.3, .3, .31];
  let L = 0; const y0 = y - .3, awn = AWN[Math.floor(rnd * 997) % AWN.length];
  for (let k = 0; k < n; k++) { const p = ring[k], q = ring[(k + 1) % n], len = Math.hypot(q.x - p.x, q.y - p.y), u0 = L, u1 = L + len; L += len;
    const fr = era ? frontOf(p, q, ring) : { f: false }, ff = fr.f && len > 2.2 ? 1 : 0, tp = era === 1 && ff ? top + 1.3 : top, H = tp - y;   // 看板建築の正面は、屋根より 1.3 m 高く立ち上げる
    P.push(p.x, y0, p.y, q.x, y0, q.y, q.x, tp, q.y, p.x, y0, p.y, q.x, tp, q.y, p.x, tp, p.y);
    for (const [u, v] of [[u0, -.3], [u1, -.3], [u1, H], [u0, -.3], [u1, H], [u0, H]]) { U.push(u / 2.5, v / 2.5); W.push(u, v, H, len); E.push(era, ff); }
    for (let m = 0; m < 6; m++) C.push(...col);
    if (ff && (era === 2 || era === 1 && rnd > .5)) {   // 日よけ（一階の上・外へ 1.1 m・ゆるく下がる）
      const o = 1.1, a1 = y + 3.0, a2 = y + 2.55, ax = p.x + fr.nx * .05, az = p.y + fr.nz * .05, bx = q.x + fr.nx * .05, bz = q.y + fr.nz * .05, cx = q.x + fr.nx * o, cz = q.y + fr.nz * o, dx = p.x + fr.nx * o, dz = p.y + fr.nz * o;
      for (const [X, Y, Z] of [[ax, a1, az], [cx, a2, cz], [bx, a1, bz], [ax, a1, az], [dx, a2, dz], [cx, a2, cz], [ax, a1, az], [bx, a1, bz], [cx, a2, cz], [ax, a1, az], [cx, a2, cz], [dx, a2, dz]]) { P.push(X, Y, Z); U.push(0, 0); W.push(0, -9, 0, 0); E.push(0, 0); C.push(...awn); } }
    if (ff && era === 3 && k % 2 === 0 && H > 7) {   // 字のない袖の看板（壁から外へ 0.9 m・縦長の板）
      const t = Math.min(.8, 1.2 / len), sx = p.x + (q.x - p.x) * t, sz = p.y + (q.y - p.y) * t, ex = sx + fr.nx * .9, ez = sz + fr.nz * .9, b0 = y + 3.6, b1 = Math.min(tp - .4, y + 3.6 + 5.5), sc = [.3, .29, .27];
      for (const [X, Y, Z] of [[sx, b0, sz], [ex, b0, ez], [ex, b1, ez], [sx, b0, sz], [ex, b1, ez], [sx, b1, sz], [sx, b0, sz], [ex, b1, ez], [ex, b0, ez], [sx, b0, sz], [sx, b1, sz], [ex, b1, ez]]) { P.push(X, Y, Z); U.push(0, 0); W.push(0, -9, 0, 0); E.push(0, 0); C.push(...sc); } } }
  if (era === 5) { const segs = segRoof(ring, top, acc, roofc); if (!segs) hipRoof(ring, top, acc, roofc); }
  else for (const [a, b2, c] of THREE.ShapeUtils.triangulateShape(ring, [])) for (const t of [a, c, b2]) { P.push(ring[t].x, top, ring[t].y); U.push(ring[t].x / 2.5, ring[t].y / 2.5); W.push(0, -9, 0, 0); E.push(0, 0); C.push(...roofc); }
  return regSolidTo(ring, acc);
}
function hipRoof(ring, top, acc, rc, pitch = .32) {   // 寄棟の屋根（長い辺に沿って・外へ 0.9 m 出す。模式）
  let best = 0, ang = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length], l = Math.hypot(q.x - p.x, q.y - p.y); if (l > best) { best = l; ang = Math.atan2(q.y - p.y, q.x - p.x); } }
  const ux = Math.cos(ang), uz = Math.sin(ang), vx = -uz, vz = ux; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const p of ring) { const a = p.x * ux + p.y * uz, b = p.x * vx + p.y * vz; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  a0 -= .9; a1 += .9; b0 -= .9; b1 += .9; const Wd = b1 - b0, Lg = a1 - a0, rise = Math.min(7.5, Wd * pitch), rr = Math.max(0, (Lg - Wd) / 2), am = (a0 + a1) / 2, bm = (b0 + b1) / 2, ry = top + rise, ey = top - .2;
  const Pt = (a, b, h) => [a * ux + b * vx, h, a * uz + b * vz], e1 = Pt(a0, b0, ey), e2 = Pt(a1, b0, ey), e3 = Pt(a1, b1, ey), e4 = Pt(a0, b1, ey), r1 = Pt(am - rr, bm, ry), r2 = Pt(am + rr, bm, ry);
  const tri = (A_, B_, C_) => { for (const V of [A_, B_, C_]) { acc.P.push(...V); acc.U.push(V[0] / 2.5, V[2] / 2.5); acc.W.push(0, -9, 0, 0); acc.E.push(6, 0); acc.C.push(...rc); } };
  for (const [A_, B_, C_] of [[e1, r2, e2], [e1, r1, r2], [e3, r1, e4], [e3, r2, r1], [e2, r2, e3], [e4, r1, e1]]) { tri(A_, B_, C_); tri(A_, C_, B_); }   // 両面（下からも見える軒）
}
/* 長い寺社・御殿の屋根を、棟ごとに分けた寄棟（模式）。本丸御殿は玄関と大広間の部分が残る（埼玉県景観資源データベース）＝低い玄関の棟・高い大広間の棟の並びに近づける。一棟ずつの姿ではない */
function segRoof(ring, top, acc, rc) {
  let best = 0, ang = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length], l = Math.hypot(q.x - p.x, q.y - p.y); if (l > best) { best = l; ang = Math.atan2(q.y - p.y, q.x - p.x); } }
  const ux = Math.cos(ang), uz = Math.sin(ang), vx = -uz, vz = ux; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (const p of ring) { const a = p.x * ux + p.y * uz, b = p.x * vx + p.y * vz; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
  const L = a1 - a0, W = b1 - b0; if (L < 26 || W < 8) return false;
  const n = Math.min(4, Math.max(2, Math.round(L / 16))), sl = L / n;
  for (let k = 0; k < n; k++) { const s0 = a0 + k * sl, s1 = s0 + sl, main = k === Math.floor(n / 2), lift = main ? 3.0 : k % 2 ? 1.1 : 0, w0 = main ? b0 : b0 + W * .16, w1 = main ? b1 : b1 - W * .16;
    const R = [[s0, w0], [s1, w0], [s1, w1], [s0, w1]].map(([a, b]) => new THREE.Vector2(a * ux + b * vx, a * uz + b * vz)); hipRoof(R, top + lift, acc, rc, main ? .42 : .3); }
  return true;
}
function regSolidTo(ring, acc) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); }
  const id = SOLID.polys.push({ ring, x0, x1, z0, z1 }) - 1, c = SOLID.cell;
  for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) { const k = i + "," + j; if (!SOLID.hash.has(k)) SOLID.hash.set(k, []); SOLID.hash.get(k).push(id); }
  (acc.ids ||= []).push(id); return id;
}
function inBld(x, z, r = .35) {   // 建物の中か（体の幅 r を見て）
  if (!SOLID.polys.length) return false; const c = SOLID.cell, ids = SOLID.hash.get(Math.floor(x / c) + "," + Math.floor(z / c)); if (!ids) return false;
  for (const id of ids) { const b = SOLID.polys[id]; if (x < b.x0 - r || x > b.x1 + r || z < b.z0 - r || z > b.z1 + r) continue;
    if (inRing(b.ring, x, z) || inRing(b.ring, x + r, z) || inRing(b.ring, x - r, z) || inRing(b.ring, x, z + r) || inRing(b.ring, x, z - r)) return true; }
  return false;
}
QW.inBld = inBld;
function buildSolids() {
  if (!SOLID.P.length) return;
  const mesh = makeSolidMesh(SOLID); mesh.name = "bldSolid"; world.add(mesh); BLD.solid = mesh; QW.nSolid = SOLID.polys.length;
}
let SOLID_MAT = null;
function makeSolidMesh(acc) {
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(acc.P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(acc.U, 2)); g.setAttribute("wuv", new THREE.Float32BufferAttribute(acc.W, 4)); g.setAttribute("color", new THREE.Float32BufferAttribute(acc.C, 3)); g.setAttribute("era", new THREE.Float32BufferAttribute(acc.E, 2)); g.computeVertexNormals();
  return new THREE.Mesh(g, SOLID_MAT ||= solidMat());
}
function solidMat() {
  const TL = new THREE.TextureLoader(), ld = (u, srgb) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 4 : 8; return t; };
  const m = new THREE.MeshStandardMaterial({ map: ld("web/tex/plaster_c.webp", true), normalMap: ld("web/tex/plaster_n.webp"), normalScale: new THREE.Vector2(.6, .6), roughnessMap: ld("web/tex/plaster_r.webp"), vertexColors: true, roughness: .92, metalness: 0 });   // 2026-10-26 採点「近寄ると単色の箱」→ 漆喰の写真の肌理（Poly Haven CC0）を色にも
  const tPlank = ld("web/tex/bplank_c.webp", true);
  // 壁の面に、模式の窓・店先のガラス・階の目地・足もとの汚れを描く（一棟ずつの実際の窓の位置ではない）
  m.onBeforeCompile = sh => {
    sh.uniforms.tPlank = { value: tPlank };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec4 wuv; varying vec4 vW; attribute vec2 era; varying vec2 vE;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvW = wuv; vE = era;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec4 vW; varying vec2 vE; uniform sampler2D tPlank;\nfloat hS(float x){return fract(sin(x*127.1)*43758.5);}\nfloat nS(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(hS(i),hS(i+1.),f);}").replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      if (vW.y > -5.) {
        float u = vW.x, v = vW.y, H = vW.z, L = vW.w, gl = 0., fr = 0.;
        float edge = L < 3.4 ? step(.25, fract(u / 1.7)) * step(fract(u / 1.7), .75) : step(1.2, u) * step(u, L - 1.2);   // 壁の端は窓にしない（2026-10-25 短い面が続く輪郭も、窓のない板にしない）
        if (v < 3.4) { float b = fract(u / 3.2); gl = step(.07, b) * step(b, .93) * step(.25, v) * step(v, 2.7) * edge; fr = step(2.7, v) * step(v, 3.25); }   // 一階：店先のガラスと看板の帯
        else if (v < H - .9) { float fu = fract(u / 2.6), fv = fract((v - 3.4) / 3.1); gl = step(.28, fu) * step(fu, .72) * step(.28, fv) * step(fv, .82) * edge; }   // 二階から上：窓
        float joint = (v > 3.4 && v < H - .4) ? smoothstep(.03, 0., abs(fract((v - 3.4) / 3.1) - .0) ) * .0 + step(fract((v - 3.4) / 3.1), .025) : 0.;
        float base = 1. - smoothstep(0., .9, v);                                // 足もとの汚れ
        float cap = step(H - .35, v);                                           // 屋上の縁
        vec3 glass = mix(vec3(.10, .13, .16), vec3(.36, .44, .52), clamp((v - .3) / max(1., H), 0., 1.) * .6 + .15);
        diffuseColor.rgb *= 1. - base * .35 - joint * .18 - cap * .12;
        // 2026-10-26 近寄っても箱に見えないように：腰板（焼杉の板・模式）・雨だれの筋・軒下の陰
        float koshi = step(v, .95) * step(-.2, v);
        vec3 pk = texture2D(tPlank, vec2(u / 1.4, v / 1.4)).rgb * vec3(.42, .36, .31);
        diffuseColor.rgb = mix(diffuseColor.rgb, pk, koshi * (1. - gl) * (1. - fr));
        float streak = nS(u * 2.3) * nS(u * .61 + 7.) ; float drip = smoothstep(.35, .9, streak) * smoothstep(H, H - 2.6, v) * step(.95, v);
        diffuseColor.rgb *= 1. - drip * .28 * (1. - gl);
        diffuseColor.rgb *= 1. - smoothstep(H - 1.2, H - .1, v) * .22 * (1. - cap);
        diffuseColor.rgb *= .9 + .2 * nS(u * .35 + v * .2 + 3.);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.16, .15, .14), fr * .75);
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, gl);
        roughnessFactor = mix(roughnessFactor, .18, gl);
        // 時代の型（模式）：通りに面した壁（vE.y＝1）だけ、正面の作りを描きかえる
        float era = floor(vE.x + .5), fw = vE.y;
        if (era > .5 && (fw > .5 || era > 4.5)) {
          vec3 base = vColor.rgb * texture2D(map, vMapUv).rgb * 1.6; float g2 = 0., dark = 0., lite = 0.;
          if (era < 1.5) {   // 1 大正〜昭和初めの看板建築：平らな正面・軒の蛇腹・縦長の窓・付け柱
            float cop = step(vColor.g, vColor.r) < .5 ? 1. : 0.;                       // 緑青の銅板の面は、細かい板の目地
            float pan = cop * (step(fract(u / .45), .05) + step(fract(v / .6), .05)) ;
            float cor = step(H - 1.95, v) * step(v, H - 1.35) + step(H - .45, v) + step(3.0, v) * step(v, 3.45);   // 軒の蛇腹・笠木・一階の上の帯（遠目にも読める太さ）
            float bayW = max(1.3, L / max(1., floor(L / 1.6)));
            float bu = fract(u / bayW), pil = step(bu, .07) + step(.93, bu);              // 付け柱
            float w2 = step(.3, bu) * step(bu, .7) * step(4.0, v) * step(v, H - 2.3);      // 二階の縦長の窓
            float shop = step(v, 2.75) * step(.2, v) * step(.06, fract(u / 1.8)) * step(fract(u / 1.8), .94) * step(1., u) * step(u, L - 1.);
            g2 = max(w2, shop); dark = pan * .22 + pil * .1; lite = min(cor, 1.) * .9;
            diffuseColor.rgb = mix(base * (1. - dark), vec3(.5, .48, .42), lite);   // 蛇腹はモルタルの明るい帯
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.16, .11, .07), (step(.24, bu) * step(bu, .76) * step(3.85, v) * step(v, H - 2.15) - w2) * .9);   // 窓の木の枠
          } else if (era < 2.5) {   // 2 昭和の商店：シャッターか店先・字のない看板の帯・タイル・アルミの窓
            float bay = fract(u / 3.6), id = floor(u / 3.6), shut = step(.5, fract(sin(id * 91.7 + L) * 437.5));
            float g1 = step(v, 2.55) * step(.15, v) * step(.05, bay) * step(bay, .95);
            float rib = step(.5, fract(v / .12));
            float band = step(2.6, v) * step(v, 3.45);
            float tile = step(3.45, v) * (step(fract(u / .22), .08) + step(fract(v / .11), .1)) * .5;
            float fu = fract(u / 3.0), fv = fract((v - 3.45) / 2.9), w2 = step(3.45, v) * step(v, H - .7) * step(.12, fu) * step(fu, .88) * step(.3, fv) * step(fv, .78);
            float fr2 = step(3.45, v) * step(v, H - .7) * (step(.09, fu) * step(fu, .91) * step(.26, fv) * step(fv, .82) - w2);
            diffuseColor.rgb = base * (1. - tile * .2);
            diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(.30, .30, .29), vec3(.22, .22, .21), rib), g1 * shut);
            g2 = max(g1 * (1. - shut), w2);
            diffuseColor.rgb = mix(diffuseColor.rgb, vColor.rgb * 1.5 + .04, band);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.55, .56, .57), fr2);          // アルミの枠
          } else if (era < 3.5) {   // 3 いまの商店街：ガラスの店先・横に連なる窓
            float g1 = step(v, 3.2) * step(.15, v) * step(.04, fract(u / 4.)) * step(fract(u / 4.), .96);
            float fv = fract((v - 3.6) / 3.1), w2 = step(3.6, v) * step(v, H - .8) * step(.25, fv) * step(fv, .8) * step(.6, u) * step(u, L - .6);
            float jn = step(fract(u / 1.2), .03) * step(3.6, v);
            diffuseColor.rgb = base * (1. - jn * .15); g2 = max(g1, w2);
          } else {   // 5 寺社・御殿：腰の板と、漆喰の壁に柱の真壁
            float ks = step(v, 1.1);
            float pst = step(fract(u / 1.8), .1) + step(H - .45, v);
            vec3 pk = texture2D(tPlank, vec2(u / 1.4, v / 1.4)).rgb * vec3(.34, .25, .18);
            diffuseColor.rgb = mix(base, pk, max(ks, pst));
          }
          vec3 gl2 = mix(vec3(.08, .1, .12), vec3(.3, .37, .43), clamp(v / max(1., H), 0., 1.) * .6 + .1);
          diffuseColor.rgb = mix(diffuseColor.rgb, gl2, g2); roughnessFactor = mix(.86, .16, g2);
          diffuseColor.rgb *= 1. - (1. - smoothstep(0., .9, v)) * .3;
        }
      } else if (vE.x > 5.5) {   // 寺社・御殿の屋根：いぶし瓦の列（模式）
        vec2 wp = vMapUv * 2.5; float ln = abs(fract((wp.x + wp.y) / .3) - .5); diffuseColor.rgb *= .62 + .38 * smoothstep(.02, .14, ln); diffuseColor.rgb *= .9 + .2 * fract(sin(floor((wp.x + wp.y) / .3) * 12.7) * 437.5); roughnessFactor = .7;
      }`);
  };
  return m;
}
const BLD = {}; QW.BLD = BLD;

/* ---------- 広げたエリア（2026-10-26）：JR 川越駅・クレアモール／喜多院・成田山／本丸御殿・三芳野神社／川越氷川神社の、元の範囲の外の道と建物 ---------- */
function netAdd(ways) {   // 歩ける道に足す（足した道は捨てない＝小さい）
  const S = []; for (const w of ways) { const hw = w[0]; for (let i = 1; i + 3 < w.length; i += 2) S.push(w[i], w[i + 1], w[i + 2], w[i + 3], hw); }
  if (!S.length) return; const old = NET.segs || new Float32Array(0), base = old.length, segs = new Float32Array(base + S.length); segs.set(old); segs.set(S, base); const c = NET.cell;
  for (let s = base; s < segs.length; s += 5) { const x0 = Math.min(segs[s], segs[s + 2]) - 12, x1 = Math.max(segs[s], segs[s + 2]) + 12, z0 = Math.min(segs[s + 1], segs[s + 3]) - 12, z1 = Math.max(segs[s + 1], segs[s + 3]) + 12;
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let k = Math.floor(z0 / c); k <= Math.floor(z1 / c); k++) { const key = i * 4096 + k; let a = NET.hash.get(key); if (!a) NET.hash.set(key, a = []); a.push(s); } }
  NET.segs = segs;
}
const AREA_G = new THREE.Group(); AREA_G.name = "areas"; world.add(AREA_G);
function buildArea(Z, J) {
  if (!NET.zones) NET.zones = new Set(); if (!NET.zones.has(Z.id)) { NET.zones.add(Z.id); netAdd(J.w); }
  addStreets(J.nr || []);
  const g = new THREE.Group(); g.name = "area_" + Z.id;
  const rg = []; for (const r of J.roads) { const P = []; for (let i = 1; i + 1 < r.length; i += 2) P.push([r[i], r[i + 1]]); if (P.length > 1) rg.push(ribbon(densify(P, 4), r[0], .04 + r[0] * .002)); }
  if (rg.length) { const m = new THREE.Mesh(mergeIdx(rg), roadMat()); m.renderOrder = 1; g.add(m); }
  paveStreets((J.nr || []).filter(r => /クレアモール|大正浪漫/.test(r[0])).map(r => { const P = []; for (let i = 1; i + 1 < r.length; i += 2) P.push([r[i], r[i + 1]]); return { k: /大正浪漫/.test(r[0]) ? "T" : "M", P, w: 5.4 }; }), g);
  const pw = (J.pw || []).map(f => { const r = []; for (let i = 0; i + 1 < f.length; i += 2) r.push({ x: f[i], y: f[i + 1] }); return r; });
  const acc = { P: [], U: [], W: [], C: [], E: [], ids: [] }, E2 = [];
  for (const b of J.b) {
    const kind = b[0], h = b[1], y = b[2], ring = []; for (let i = 3; i + 1 < b.length; i += 2) ring.push(new THREE.Vector2(b[i], b[i + 1]));
    if (ring.length < 3) continue; let mx = 0, mz = 0; for (const p of ring) { mx += p.x; mz += p.y; } mx /= ring.length; mz /= ring.length;
    if (netCrosses(ring)) { for (let k = 0; k < ring.length; k++) { const p = ring[k], q = ring[(k + 1) % ring.length]; E2.push(p.x, y + .05, p.y, q.x, y + .05, q.y); } continue; }   // 道が中を通る建物（駅の通路など）は地割の線だけ
    const temple = kind > 0 || pw.some(r => inRing(r, mx, mz));
    addSolid(ring, y, y + h, acc, temple ? 5 : eraAt(ring));
  }
  if (acc.P.length) { const m = makeSolidMesh(acc); m.name = "areaSolid"; g.add(m); }
  if (E2.length) { const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.Float32BufferAttribute(E2, 3)); g.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: "#9fe6f8", transparent: true, opacity: .4, depthWrite: false }))); }
  AREA_G.add(g); landSweep(); QW.nArea = (QW.nArea || 0) + J.b.length;
  return { g, ids: acc.ids };
}
function dropArea(h) {
  AREA_G.remove(h.g); h.g.traverse(o => { o.geometry?.dispose(); if (o.material && o.material !== SOLID_MAT && o.material !== ASPH) o.material.dispose?.(); });
  for (const id of h.ids) { const p = SOLID.polys[id]; if (p) { p.x0 = p.z0 = 1e9; p.x1 = p.z1 = -1e9; } }   // ぶつかる判定から外す
}
const AREAS = QW.AREAS = makeAreas({ THREE, world, camera, groundY: (x, z) => groundY(x, z), BASE: "web/", VER, mobile: MOBILE, rm: RM, build: buildArea, drop: dropArea,
  onPick: Z => { const i = C.starts.findIndex(s => s.zone === Z.id); if (i >= 0) { selectStart(i); return; } const [x, z] = Z.label; let bi = 0, bd = 1e9; C.starts.forEach((s, k) => { const a = stAt(s), d = Math.hypot(a.x - x, a.z - z); if (d < bd) { bd = d; bi = k; } }); selectStart(bi); } });

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
    const lb = makeLabel(layerNo(layer), L.name, o.title, L.color); lb.position.set(o.x + .45, y + (o.h || 1.8) + .75, o.z); lb.userData.by = lb.position.y; world.add(lb);
    for (const c of m.glyph.children) c.visible = false; m.beam.visible = false; m.base.visible = false;   // 2026-10-23 夜：線の印は描かず、かさねっこの形の結晶（qmarks.js）で描く
    LAYER.objs.push({ ...m, o, layer, kind, lb, show: 0 });
  };
  for (const o of C.objs) add(o, o.layer, "rec");
  extraSounds(); for (const s of C.sound) add({ ...s, h: 2.2 }, "sound", "sound");
  for (const t of C.touch) add({ ...t, h: 1.3 }, "touch", "touch");
  for (const s of C.sho) add({ ...s, h: .7, title: "《" + s.title + "》" }, "sho", "sho");
  LAYER.worn = ALL.map(l => l.id);   // 既定は全部重ねる
  LAYER.qm = makeQMarks(THREE, world, LAYER.objs.length, MOBILE); for (const L of LAYER.objs) LAYER.qm.add(L, GL[L.layer].color, top5(L.layer));
}
function wearLayer(id) { if (id === null) LAYER.worn = []; else if (LAYER.worn.includes(id)) LAYER.worn = LAYER.worn.filter(x => x !== id); else LAYER.worn.push(id); syncTray(); KASA.herd?.setLayers(LAYER.worn); }
const _v = new THREE.Vector3();
function stepLayer(dt) {
  const cp = camera.position, t = performance.now() / 1000, sky = QW.mode === "sky" || QW.mode === "descend";
  for (const L of LAYER.objs) {
    const on = LAYER.worn.includes(top5(L.layer)) && QW.mode !== "sight", d = Math.hypot(L.o.x - cp.x, L.o.z - cp.z);
    const want = on ? (sky ? 1 : d < 140 ? 1 : 0) : 0; L.show += (want - L.show) * Math.min(1, dt * 4);
    const vis = L.show > .02; L.root.visible = vis; L.lb.visible = vis && (sky ? false : d < 58);   // 2026-10-26 遠くの目印も名を読めるように 34→58 m
    if (!vis) continue;
    const k = sky ? Math.min(14, Math.max(2.5, camera.position.distanceTo(L.root.position) / 60)) : 1;
    L.root.scale.setScalar(k * (.4 + .6 * L.show)); L.glyph.rotation.y = t * .6; L.glyph.position.y = (L.o.h || 1.8) + Math.sin(t * 1.4 + L.o.x) * .05;
    for (const m of L.mats) m.opacity = (m === L.fm ? .1 : m === L.bm ? .55 : .9) * L.show;
    if (L.lb.visible) { L.lb.material.opacity = Math.min(1, (58 - d) / 8) * L.show; const ls = Math.max(1, d / 9); L.lb.scale.set(1.6 * ls, .4 * ls, 1); }   // 遠くても字が小さくなりすぎない
  }
  LAYER.qm?.update(camera, { t, sky, focus: !$("#panel").hidden ? PANEL.cur : null });
  if (!(LAYER.sweepT > t)) { LAYER.sweepT = t + 1.5; landSweep(); }
  { const gT = LAYER.worn.length && QW.mode !== "boot" ? (sky ? .32 : .62) : 0; LANDG.value += (gT - LANDG.value) * Math.min(1, dt * 2.2); }
  stepHere(cp, t, sky || QW.mode === "fly");
  declutter(dt);
}
/* 2026-10-26（氷川と同じ）：いまいる場所の重なり（半径 30 m の Qualia の数と層）と、画面の外のいちばん近い Qualia の方角 */
const QH = { t: 0, el: null, dir: null };
function stepHere(cp, t, off) {
  if (!QH.el) { QH.el = $("#qHere"); QH.dir = $("#qDir"); if (!QH.el) return; }
  const walk = !off && (QW.mode === "walk" || QW.mode === "sight") && $("#panel").hidden;
  if (!walk || !LAYER.worn.length) { QH.el.hidden = true; QH.dir.hidden = true; return; }
  const on = L => LAYER.worn.includes(top5(L.layer));
  if (t - QH.t > .5) {
    QH.t = t; const cnt = {}; let n = 0, best = null, bd = 1e9; const v = new THREE.Vector3();
    for (const L of LAYER.objs) { if (!on(L)) continue; const d = Math.hypot(L.o.x - cp.x, L.o.z - cp.z);
      if (d < 30) { const k = top5(L.layer); cnt[k] = (cnt[k] || 0) + 1; n++; }
      if (d > 4 && d < 70 && d < bd) { v.set(L.o.x, L.root.position.y + (L.o.h || 1.8), L.o.z).project(camera); if (v.z > 1 || Math.abs(v.x) > .92 || Math.abs(v.y) > .92) { bd = d; best = L; } } }
    const ks = ALL.filter(l => cnt[l.id]).reverse();
    QH.el.innerHTML = n ? `<b>${n}</b><span class="t">この 30 m に重なる Qualia</span>` + ks.map(l => `<i style="--c:${l.color}" title="${l.name}">${l.id}<em>${cnt[l.id]}</em></i>`).join("") : `<span class="t">この近くの Qualia は、少し先にあります</span>`;
    QH.el.hidden = false; QH.best = best;
  }
  const L = QH.best;
  if (!L || !on(L) || Math.hypot(L.o.x - cp.x, L.o.z - cp.z) < 8) { QH.dir.hidden = true; return; }
  const v = new THREE.Vector3(L.o.x, L.root.position.y + (L.o.h || 1.8), L.o.z).applyMatrix4(camera.matrixWorldInverse);
  if (v.z < 0 && Math.abs(v.x / -v.z) < 1 && Math.abs(v.y / -v.z) < .8) { QH.dir.hidden = true; return; }
  const a = Math.atan2(v.x, -v.z), W = innerWidth, H = innerHeight, x = Math.max(MOBILE ? 30 : 270, Math.min(W - 30, W / 2 + Math.sin(a) * (W / 2 - 40))), y = Math.max(MOBILE ? 340 : 140, Math.min(H - (MOBILE ? 300 : 150), H * .55 - Math.cos(a) * (H * .55 - 150)));
  let X = x, Y = y; { const cap = $("#caption"); if (cap && !cap.hidden) { const r = cap.getBoundingClientRect(); if (X > r.left - 50 && X < r.right + 50 && Y > r.top - 60 && Y < r.bottom + 60) Y = r.top - 60; } Y = Math.max(MOBILE ? 150 : 120, Y); }   // 上のタブに重ねない   // 2026-10-26 字幕・碧に重ねない
  if (AOI.root?.visible) { const w = new THREE.Vector3(); AOI.root.getWorldPosition(w); w.project(camera); const ax = (w.x + 1) / 2 * innerWidth; if (w.z < 1 && Math.abs(X - ax) < 130 && Y > innerHeight * .35) X = ax + (X < ax ? -150 : 150); X = Math.max(30, Math.min(innerWidth - 30, X)); }
  QH.dir.hidden = false; QH.dir.style.transform = `translate(${X - 18}px,${Y - 18}px)`; QH.dir.firstElementChild.style.transform = `rotate(${a}rad)`;
  QH.dir.style.setProperty("--c", GL[L.layer].color); QH.dir.lastElementChild.textContent = `${Math.round(Math.hypot(L.o.x - cp.x, L.o.z - cp.z))} m`;
}
/* 札どうし・札と結晶を重ねない（2026-10-23 深夜）：近い札から置き、重なる札は上へ一段ずつ逃がす（3 段まで）。それでも重なる遠い札はうすく消す。層の一覧の上にも出さない */
const DC = { t: 0, ls: null };
function declutter(dt) {
  const now = performance.now(); if (!DC.ls || now - DC.t > 500) { DC.t = now; DC.ls = $("#lstack").getBoundingClientRect(); }   // 画面の部品の位置は 0.5 秒ごとに読む（毎こま読むと重い）
  const ls = DC.ls, avoid = [...(LAYER.qm?.rects || [])]; if (ls.width) avoid.push({ x0: 0, x1: ls.right + 14, y0: 0, y1: ls.bottom + 14 });
  const cp = camera.position, list = []; for (const L of LAYER.objs) if (L.lb.visible) list.push({ sp: L.lb, L, d: Math.hypot(L.o.x - cp.x, L.o.z - cp.z), pri: !$("#panel").hidden && PANEL.cur === L ? 1 : 0 });
  if (list.length) placeLabels(THREE, camera, list, avoid, dt, MOBILE ? 16 : 22);   // 2026-10-26 採点「遠くの目印が読み取れない」→ 札の字の高さに下限
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
  const mo = $("#pMore"); mo.innerHTML = ""; for (const m of more) { const e = document.createElement("p"); e.className = "more"; e.textContent = m; mo.appendChild(e); }   // くわしい文は畳む（表には題と、いま話している一行だけ）
  const ex = $("#pExp"); ex.innerHTML = ""; ex.hidden = !pad && !buttons.length;
  if (pad) ex.appendChild(pad);
  for (const bt of buttons) { const e = document.createElement("button"); e.className = "ml-btn" + (bt.primary ? " ml-btn--primary" : ""); e.textContent = bt.label; e.addEventListener("click", bt.run); ex.appendChild(e); }
  $("#pHow").textContent = how ? "確かさ：" + how : ""; $("#pNote").textContent = note || "";
  const ul = $("#pSrc"); ul.innerHTML = ""; for (const s of src) { const li = document.createElement("li"); if (s.u) { const a = document.createElement("a"); a.href = s.u; a.target = "_blank"; a.rel = "noopener"; a.textContent = s.t; li.appendChild(a); } else li.textContent = s.t; ul.appendChild(li); }
  $("#pPos").textContent = ll ? `位置：${ll[1].toFixed(5)}N ${ll[0].toFixed(5)}E` : "";
  $("#pFold").open = false; $("#pFold").hidden = !src.length && !note && !how && !more.length;
  p.hidden = false; document.body.classList.add("pOpen");
  p.classList.remove("pulse"); void p.offsetWidth; p.classList.add("pulse"); qChime(color);   // 層の色の線と光がひらき、短い音と振動
}
function qChime(color) {   // 触れたときの短い音（その場で組み立てる合成音）と振動
  try { navigator.vibrate?.([14, 40, 10]); } catch { }
  if (!soundOn) return; const B = bell(), ac = B.ac, h = parseInt((color || "#9bdcf0").slice(1), 16), f0 = 520 + ((h >> 16) % 7) * 60, t = ac.currentTime + .01;
  for (const [k, f] of [[0, f0], [.07, f0 * 1.5]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, t + k); g.gain.linearRampToValueAtTime(.09, t + k + .015); g.gain.exponentialRampToValueAtTime(.0005, t + k + 1.1); o.connect(g); g.connect(B.out); o.start(t + k); o.stop(t + k + 1.2); }
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
  if (!v.L || $("#panel").hidden) caption(MOBILE ? l.t : (l.tc || l.t), v.talk);
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
    const [V, buf, Mot, Robe] = await Promise.all([import("@pixiv/three-vrm"), fetch("web/aoi.vrm").then(r => r.arrayBuffer()), import("../kit/aoi_motion.js?v=20261025a"), import("../kit/aoi_robe.js").catch(() => null)]);
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
  const f = MOBILE ? 4.0 : 3.5, s = MOBILE ? .45 : 1.25,   /* 2026-10-26 PC で碧の体が画面の下で切れない距離に 2.4→3.5 */ fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw);
  const n = nearestOnLine(CAM.pos.x, CAM.pos.z), a = atD(n.d), rx = -fz, rz = fx;
  const side = !$("#panel").hidden && !MOBILE ? -1 : ((a.x - CAM.pos.x) * rx + (a.z - CAM.pos.z) * rz) >= 0 ? 1 : -1;
  out.set(CAM.pos.x + fx * f + rx * s * side, 0, CAM.pos.z + fz * f + rz * s * side);
  if (offRoute(CAM.pos.x, CAM.pos.z)) { corridorClamp(out); if (inBld(out.x, out.z, .3)) { out.x = CAM.pos.x + fx * f; out.z = CAM.pos.z + fz * f; corridorClamp(out); } }   // 裏路地では、道の幅の中に立つ
  out.y = groundY(out.x, out.z); return out;
}
function aoiArrive() {
  loadAoi().then(() => {
    if (!AOI.m || QW.mode !== "walk") return;
    aoiSpot(AOI.pos); AOI.m.teleport(AOI.pos.x, AOI.pos.z, Math.atan2(CAM.pos.x - AOI.pos.x, CAM.pos.z - AOI.pos.z)); AOI.root.visible = true;
    if (!AOI.greeted) { setTimeout(() => { if (QW.mode === "walk") speakLines([C.intro], null, { done: () => { AOI.greeted = true; TALK.nextT = performance.now() + 2500; } }); else AOI.greeted = true; }, 900); }
  });
}
const _ap = new THREE.Vector3();
const _ndc = new THREE.Vector3();
function stepAoi(dt) {
  if (!AOI.m || !AOI.root.visible) return;
  aoiSpot(_ap); const P = AOI.m.pos, dx = _ap.x - P.x, dz = _ap.z - P.z, dist = Math.hypot(dx, dz);
  if (dist > 18) { AOI.m.teleport(_ap.x, _ap.z, CAM.yaw + Math.PI); AOI.v = 0; }
  else {
    const edge = MOBILE && Math.abs(_ndc.copy(P).setY(P.y + 1).project(camera).x) > .55;   // 2026-10-25 375px で碧が画面の端で切れない：端に寄ったら、立ち位置へ歩いて戻る
    const go = WALK.moving ? dist > .25 : dist > (AOI.v > .1 ? .3 : edge ? .2 : 1.3), want = go ? Math.min(1.6, dist * 1.4 + (WALK.moving ? WALK.speed * .6 : 0)) : 0;
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
  if ((m === "sky" || m === "fly" || m === "sight") && QW.HERE?.on) QW.HERE.stop();   // 現在地で歩くのは、歩いているあいだだけ
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
const START = { sel: 4, pins: [], labels: [] };   // 2026-10-23 はじめは蔵造りの一番街（仲町交差点）から
function buildStarts() {
  const box = $("#starts"); box.innerHTML = ""; const pl = $("#pinLabels");
  C.starts.forEach((s, i) => {
    const b = document.createElement("button"); b.className = "stBtn"; b.type = "button"; b.setAttribute("aria-pressed", "false"); b.innerHTML = `<span class="no">${String(i + 1).padStart(2, "0")}</span><span class="nm">${s.name}</span>`;
    b.addEventListener("click", () => selectStart(i)); box.appendChild(b);
    const a = stAt(s), y = groundY(a.x, a.z), g = new THREE.Group(); g.position.set(a.x, y, a.z);
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
  const a = stAt(C.starts[i]); SKY.c.set(a.x, groundY(a.x, a.z), a.z); SKY.tDist = MOBILE ? 520 : 420; }
function descendTo(i, at) {   // at＝現在地（GPS）の位置
  const s = C.starts[i], xz = !at && s.x != null, d = xz ? 0 : Math.min(at ? at.d : s.d, G.lineD[G.lineD.length - 1] - 3), a = at ? { x: at.x, z: at.z } : xz ? stAt(s) : atD(d), y = groundY(a.x, a.z) + EYE;
  const wait = AREAS.ensureAt(a.x, a.z);   // 広げたエリアの中なら、そのエリアの道と建物を読みながら降りる
  hideSkyUI(); exitSight(true); hideFlyUI(); setMode("descend"); hidePanel(); stopVoice();   // 前の場所の語りを、降りた先へ持ちこまない
  CAM.pos.set(a.x, y, a.z); CAM.yaw = xz ? stYaw(s) : /菓子屋/.test(s.name) ? yawAlong(d) + Math.PI : yawAlong(d); CAM.look = 0; CAM.pitch = -.04;
  if (!at && /時の鐘/.test(s.name) && G.bell) { const b = atD(1196); CAM.pos.set(b.x, groundY(b.x, b.z) + EYE, b.z); CAM.yaw = Math.atan2(-(G.bell.x - b.x), -(G.bell.z - b.z)); CAM.pitch = .12; }   // 鐘つき通りの入口から、鐘を見上げる
  tweenTo(CAM.pos, CAM.yaw, CAM.pitch, 2.6, () => wait.then(() => { setMode("walk"); showWalkUI(); aoiArrive(); }));
}
function corridorClamp(p) {   // 道筋 A のまわり 14 m か、歩ける道（裏路地ほか）の幅の中へ
  const n = nearestOnLine(p.x, p.z); if (n.dist <= 14) { solids(p); return; }
  const a = atD(n.d), k = 14 / n.dist, rx = a.x + (p.x - a.x) * k, rz = a.z + (p.z - a.z) * k;
  if (NET.segs) { const q = netNear(p.x, p.z, 40); if (q.dist <= q.hw) { solids(p); return; }
    if (q.dist < 1e8) { const m = q.hw / (q.dist || 1), nx = q.x + (p.x - q.x) * m, nz = q.z + (p.z - q.z) * m; if (Math.hypot(nx - p.x, nz - p.z) < Math.hypot(rx - p.x, rz - p.z)) { p.x = nx; p.z = nz; solids(p); return; } } }
  p.x = rx; p.z = rz; solids(p); }
const offRoute = (x, z) => nearestOnLine(x, z).dist > 14;
function solids(p, r = .35) {   // 店蔵の型と時の鐘には入らない（向きのある箱から押し出す）
  const push = (cx, cz, yaw, hw, hd) => { const c = Math.cos(yaw), s = Math.sin(yaw), dx = p.x - cx, dz = p.z - cz, lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) < hw + r && Math.abs(lz) < hd + r) { const ox = hw + r - Math.abs(lx), oz = hd + r - Math.abs(lz); let nx = lx, nz = lz; if (ox < oz) nx = Math.sign(lx || 1) * (hw + r); else nz = Math.sign(lz || 1) * (hd + r); p.x = cx + nx * c + nz * s; p.z = cz - nx * s + nz * c; } };
  for (const k of G.kura) if (Math.abs(k.x - p.x) < 12 && Math.abs(k.z - p.z) < 12) push(k.x, k.z, k.yaw, k.w / 2, k.dp / 2 + 1.8);   // 2026-10-26 採点「壁の手前で画面いっぱいが縦じま」→ 蔵の正面から約 2.2 m で止める
  for (const k of G.machi || []) if (Math.abs(k.x - p.x) < 12 && Math.abs(k.z - p.z) < 12) push(k.x, k.z, k.yaw, k.w / 2, k.dp / 2 + .6);
  if (KURA.tower) push(KURA.tower.position.x, KURA.tower.position.z, KURA.tower.rotation.y, 2.4, 2.4);
  solidRings(p);
}
/* 2026-10-26 壁に近づくと視点が壁に入っていた：通りの不透明の建物（SOLID）の壁から 0.6 m 手前で止める */
function solidRings(p, r = 1.1) {
  if (!SOLID.polys.length) return; const c = SOLID.cell, seen = new Set();
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const ids = SOLID.hash.get((Math.floor(p.x / c) + di) + "," + (Math.floor(p.z / c) + dj)); if (!ids) continue;
    for (const id of ids) { if (seen.has(id)) continue; seen.add(id); const b = SOLID.polys[id]; if (p.x < b.x0 - r || p.x > b.x1 + r || p.z < b.z0 - r || p.z > b.z1 + r) continue;
      const R = b.ring, n = R.length; let bd = 1e9, qx = 0, qz = 0;
      for (let i = 0; i < n; i++) { const A = R[i], B = R[(i + 1) % n], ex = B.x - A.x, ez = B.y - A.y, L2 = ex * ex + ez * ez || 1e-9; let t = ((p.x - A.x) * ex + (p.z - A.y) * ez) / L2; t = Math.max(0, Math.min(1, t));
        const x = A.x + ex * t, z = A.y + ez * t, d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; qx = x; qz = z; } }
      const inside = inRing(R, p.x, p.z); if (!inside && bd >= r) continue;
      let nx = p.x - qx, nz = p.z - qz; const l = Math.hypot(nx, nz) || 1e-9; nx /= l; nz /= l; if (inside) { nx = -nx; nz = -nz; }
      p.x = qx + nx * r; p.z = qz + nz * r; } }
}
function stepWalk(dt, eye = EYE, speed = WALK.speed) {
  const f = KEYS.has("w") || KEYS.has("arrowup") || WALK.auto || WALK.hold ? 1 : KEYS.has("s") || KEYS.has("arrowdown") ? -1 : 0;
  const turn = (KEYS.has("a") || KEYS.has("arrowleft") ? 1 : 0) - (KEYS.has("d") || KEYS.has("arrowright") ? 1 : 0);
  CAM.yaw += turn * dt * 1.3;
  const off = offRoute(CAM.pos.x, CAM.pos.z);
  if (off && WALK.auto && NET.segs) { const q = netNear(CAM.pos.x, CAM.pos.z, 12); if (q.dist < q.hw + 1) { const h = CAM.yaw + CAM.look, a1 = Math.atan2(-q.tx, -q.tz), a = Math.abs(wrap(a1 - h)) < Math.PI / 2 ? a1 : a1 + Math.PI; CAM.yaw += wrap(a - h) * Math.min(1, dt * 1.6); } }   // 歩きつづける：裏路地では道の向きに沿う
  if (off && !WALK.offSeen && QW.mode === "walk") { WALK.offSeen = true; setTimeout(() => safetyNote(), 600); }
  let mx = 0, mz = 0;
  if (f) { const yaw = CAM.yaw + CAM.look; mx = -Math.sin(yaw) * f * speed * dt; mz = -Math.cos(yaw) * f * speed * dt; }
  else if (WALK.goal) { const dx = WALK.goal.x - CAM.pos.x, dz = WALK.goal.z - CAM.pos.z, dd = Math.hypot(dx, dz); if (dd < .4) { WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; } else { mx = dx / dd * Math.min(dd, speed * dt); mz = dz / dd * Math.min(dd, speed * dt); const ty = Math.atan2(-dx, -dz); CAM.yaw += wrap(ty - CAM.yaw - CAM.look) * Math.min(1, dt * 2.2); } }
  WALK.moving = Math.abs(mx) + Math.abs(mz) > 1e-5;
  const px0 = CAM.pos.x, pz0 = CAM.pos.z; CAM.pos.x += mx; CAM.pos.z += mz; corridorClamp(CAM.pos);
  if (inBld(CAM.pos.x, CAM.pos.z) && !inBld(px0, pz0)) {   // 建物の壁の手前で止まる。斜めに当たったときは、壁に沿ってすべる
    if (!inBld(CAM.pos.x, pz0)) CAM.pos.z = pz0; else if (!inBld(px0, CAM.pos.z)) CAM.pos.x = px0; else { CAM.pos.x = px0; CAM.pos.z = pz0; }
    if (WALK.goal && Math.hypot(CAM.pos.x - px0, CAM.pos.z - pz0) < 1e-3) { WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; }
    if (performance.now() - (WALK.wallT || 0) > 8000) { WALK.wallT = performance.now(); toast("建物の中には入れません。通りを歩けます。"); } }
  if (!KURA.blockBell) { }
  const gy = groundY(CAM.pos.x, CAM.pos.z) + eye + (eye < .5 ? .1 : 0);   // 低い目（ハクセキレイ）は、道の面（地形より約 10 cm 上）から測る CAM.pos.y += (gy - CAM.pos.y) * Math.min(1, dt * 8);
  if (performance.now() - CAM.lastDrag > 2600 && WALK.moving) CAM.look *= Math.pow(.25, dt);   // 歩きだすと、見回した向きがゆっくり前へ戻る
  camera.position.copy(CAM.pos); camera.quaternion.setFromEuler(new THREE.Euler(CAM.pitch, CAM.yaw + CAM.look, 0, "YXZ"));
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
function safetyNote() { if (WALK.safety) return; if (!AOI.greeted || voiceQ) { setTimeout(safetyNote, 1500); return; }   // 2026-10-26 降りた直後は名乗りを先に、案内はそのあと
  WALK.safety = true; toast("裏の道も歩けます。歩くときは、前と周りの人・車・自転車に気をつけて。画面は立ち止まって見てください。"); }   // 2026-10-25 本人「メインストリートは人が多いので危なく」＝一度だけ
function startFly() {
  hidePanel(); stopVoice(); hideSkyUI(); hideWalkUI();
  const from = QW.mode === "walk" ? CAM.pos.clone() : (() => { const a = stAt(C.starts[Math.max(0, START.sel)]); return new THREE.Vector3(a.x, groundY(a.x, a.z), a.z); })();
  const yaw = QW.mode === "walk" ? CAM.yaw + CAM.look : stYaw(C.starts[Math.max(0, START.sel)]);
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
function flyOver(c) {   // 遠くの音の場所へ、低く（地面から約 10 m）空から近づく。手前 30 m から、その場所へ向いて
  hidePanel(); stopVoice(); hideSkyUI(); hideWalkUI(); unlockAudio();
  const n = nearestOnLine(c.x, c.z), a = atD(n.d), dx = c.x - a.x, dz = c.z - a.z, L = Math.hypot(dx, dz) || 1, x = c.x - dx / L * 30, z = c.z - dz / L * 30;
  CAM.pos.set(x, groundY(x, z) + 10, z); CAM.yaw = Math.atan2(-dx, -dz); CAM.look = 0; CAM.pitch = -.18;
  setMode("descend"); tweenTo(CAM.pos, CAM.yaw, CAM.pitch, 2.4, () => { setMode("fly"); showFlyUI(); toast(`${c.nm}の上です。近くを飛ぶと、その場所の音が聞こえます`); });
}
function landFromFly() { const n = nearestOnLine(CAM.pos.x, CAM.pos.z); let a = atD(n.d); if (NET.segs && n.dist > 14) { const q = netFar(CAM.pos.x, CAM.pos.z); if (q.dist < n.dist) a = { x: q.x, z: q.z }; }  /* 裏路地や喜多院の上からは、いちばん近い歩ける道へ */ hideFlyUI(); setMode("descend"); const y = CAM.yaw + CAM.look; CAM.pos.set(a.x, groundY(a.x, a.z) + EYE, a.z); CAM.yaw = y; CAM.look = 0; CAM.pitch = -.04; tweenTo(CAM.pos, CAM.yaw, CAM.pitch, 2.0, () => { setMode("walk"); showWalkUI(); aoiArrive(); }); }
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
  if (KASA.herd?.pickView(x, y)) return;   // 空中の 3D の窓に触れたら閉じる
  if (MY.L?.pick(x, y)) return;   // 自分の層（手渡された層を含む）に触れる
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
function kasaOk(x, z) { return (nearestOnLine(x, z).dist < 5 || onNet(x, z, -.4)) && !kasaBox(x, z) && !inBld(x, z, .2); }   // 通りの中ほど（両側の建物の前まで出ない）
function kasaPeek(x, z) { return (nearestOnLine(x, z).dist < 11 || onNet(x, z, 1.5)) && !kasaBox(x, z, .02); }   // 覗く所：建物の角のすぐ脇
function loadKasane() {
  if (KASA.p) return KASA.p;
  return KASA.p = (async () => {
    const M = await import("../kit/envAgents/kasane.js?v=20261025b");
    const herd = KASA.herd = new M.KasaneHerd({ scene: world, camera, groundAt: (x, z) => groundY(x, z) + .06, walkable: kasaOk, walkSurface: kasaPeek, hud: COLOR5, avoid: () => AOI.root?.visible ? AOI.root.position : null, scale: MOBILE ? 3.2 : 2.9, mobile: MOBILE, maxDist: MOBILE ? 32 : 40, max: 24,
      muted: () => !soundOn, minCamDist: MOBILE ? 1.7 : 1.5, viewTitle: a => a.data?.o?.title || a.data?.title || "", viewSafe: () => ({ left: MOBILE ? 118 : 250, top: MOBILE ? 176 : 80 }) });   // v3（2026-10-23 夜）：大きさは部品で前の 0.75 倍・鳴き声は「声と音」に従う・目の前に入りすぎない・窓は層の一覧にかけない
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
      // 2026-10-23 夜 本人「数が多すぎます」＝群れは 24 m に一つ・2〜3 体（全部で 70〜90 体）。本人「多少混ざって…メインとなるレイヤーが多く」＝およそ 7 割はその地点の層の色
      k++; const p = near(L.o.x, L.o.z); if (!p || centers.some(c => Math.hypot(c[0] - p[0], c[1] - p[1]) < 24)) continue; centers.push(p);
      const main = top5(L.layer), n = [2, 3, 2, 3, 3][k % 5], others = objs.map(o => o.L).filter(o => o !== L && Math.hypot(o.o.x - L.o.x, o.o.z - L.o.z) < 30), mem = [{ layer: main, data: L, target: { x: L.o.x, z: L.o.z } }];
      const lays = M.kasaneMix(main, n, { mix: .3, rnd: Math.random });
      for (let m = 1; m < n; m++) { const ly = lays[m], O = ly === main ? (others.find(X => top5(X.layer) === main && !mem.some(q => q.data === X)) || L) : others.find(X => top5(X.layer) === ly && !mem.some(q => q.data === X)); if (O) mem.push({ layer: top5(O.layer), data: O, target: { x: O.o.x, z: O.o.z } }); else mem.push({ layer: main, data: L, target: { x: L.o.x, z: L.o.z } }); }
      const G = herd.addGroup(mem, { x: p[0], z: p[1], radius: 2.6, role: k % 3 === 0 ? "watch" : "" }); for (const a of G.members) a.d = nearestOnLine(p[0], p[1]).d;
    }
    // 地点のない区間（本川越駅から夢通りなど）にも：通り全体の記録（台地の上の通り）の子と、生きもの（Qualia/sight）へ誘う子の群れを 34 m ごとに
    const daichi = LAYER.objs.find(L => L.o.id === "n_daichi"), endD = G.lineD[G.lineD.length - 1]; let g = 0;
    for (let d = 15; d < endD - 6 && daichi; d += 64) {
      if (herd.agents.some(a => a.d != null && Math.abs(a.d - d) < 36)) continue;
      const c = atD(d), side = (g % 2 ? 1 : -1) * 1.5, p = near(c.x + c.tz * side, c.z - c.tx * side, 4); if (!p) continue; g++;
      const mem = [{ layer: "nature", data: daichi }, { layer: "nature", data: daichi }, { layer: "sight", data: { sightPick: true } }];
      const G2 = herd.addGroup(mem, { x: p[0], z: p[1], radius: 2.6, role: g % 3 === 0 ? "watch" : "" }); for (const a of G2.members) a.d = d;
    }
    // 2026-10-25 裏路地・並行する道にも（本人「裏路地に入っても体験が続くように」）：道筋 A から 30 m より離れた歩ける道に、およそ 90 m に一つの群れ（近くの地点の層の子と、生きものへ誘う子）。多くしすぎない（22 群れまで）
    if (NET.segs) { const S = NET.segs, pts = []; for (let s = 0; s < S.length; s += 5) { const L = Math.hypot(S[s + 2] - S[s], S[s + 3] - S[s + 1]); for (let t = 0; t < L; t += 30) { const x = S[s] + (S[s + 2] - S[s]) * t / L, z = S[s + 1] + (S[s + 3] - S[s + 1]) * t / L; if (x > -330 && x < 640 && z > -470 && z < 700 && nearestOnLine(x, z).dist > 30) pts.push([x, z]); } }
      let ng = 0; for (const [x, z] of pts) { if (ng >= 22) break; if (herd.agents.some(a => Math.hypot(a.anchor.x - x, a.anchor.y - z) < 90)) continue; const p = near(x, z, 3); if (!p) continue;
        let O = null, od = 160; for (const L of LAYER.objs) { const d = Math.hypot(L.o.x - p[0], L.o.z - p[1]); if (d < od && L.kind === "rec") { od = d; O = L; } }
        const mem = [O ? { layer: top5(O.layer), data: O, target: { x: O.o.x, z: O.o.z } } : { layer: "nature", data: daichi }, { layer: "nature", data: daichi }, { layer: "sight", data: { sightPick: true } }];
        const G3 = herd.addGroup(mem, { x: p[0], z: p[1], radius: 2.2, role: ng % 2 ? "watch" : "" }); ng++; } }
    KASA.n = herd.agents.length; QW.KASA = KASA; herd.setLayers(LAYER.worn);
    await herd.load();
  })().catch(e => console.warn("かさねっこ：", e?.message ?? e));
}
function touchKasane(a) {
  KASA.cur = a; KASA.herd.touch(a, () => { if (KASA.cur !== a || QW.mode !== "walk") return; if (a.data?.sightPick) { KASA.herd.release(a); KASA.cur = null; openSightChooser(); return; } openObj(a.data); inviteLayer(a); KASA.cur = a; a.state = "focus"; a.focusTo = new THREE.Vector2(camera.position.x, camera.position.z);
    if (AOI.m) { const p = a.center(new THREE.Vector3()); AOI.focus = p; AOI.m.lookAt(p); setTimeout(() => { if (AOI.focus === p) { AOI.focus = null; AOI.m?.lookAt(camera.position.clone()); } }, 1600); } });
}

/* ---------- 自分の層（環世界 2.0：訪れる人が自分の意思で層を置く・端末の中だけ・手渡し）。部品＝web/kit/mylayer.js（_共通3D/kit/mylayer.js の写し） ---------- */
const MY = QW.MY = { L: null };
function loadMyLayer() { if (MY.L || MY.p) return MY.p; return MY.p = import("../kit/mylayer.js?v=2").then(async M => { MY.L = new M.MyLayers({ THREE, scene: world, camera, place: "kawagoe", groundAt: (x, z) => groundY(x, z), here: () => { const y = CAM.yaw + CAM.look; return { x: CAM.pos.x - Math.sin(y) * 3.4, z: CAM.pos.z - Math.cos(y) * 3.4 }; }   /* 目の前 3.4 m に置く */, colors: COLOR5, toast }); await MY.L.load(); return MY.L; }).catch(e => { console.warn("自分の層：", e?.message ?? e); MY.p = null; }); }
function inviteLayer(a) {   // 触れたかさねっこが「この場所に層を置く？」と誘う
  const ex = $("#pExp"); if (!ex) return; ex.hidden = false; const b = document.createElement("button"); b.className = "ml-btn"; b.textContent = "この場所に、あなたの層を置く？"; b.style.borderColor = COLOR5[top5(a.layer)] || ""; 
  b.addEventListener("click", async () => { const L = await loadMyLayer(); if (!L) return; const c = { center: v => a.center(v) }; hidePanel(); L.offer(c); }); ex.appendChild(b);
}
$("#myBtn")?.addEventListener("click", async () => { unlockAudio(); hidePanel(); const L = await loadMyLayer(); L?.openPlace(); });

/* ---------- Qualia/sight：いまいる所で、生きものの身体に入れ替わる（動くのは見る人の操作だけ） ---------- */
const SIGHT = { sp: null, post: null, fwd: false };
function openSightChooser() {
  const box = $("#sightList"); box.innerHTML = "";
  for (const sp of C.sight) { const b = document.createElement("button"); b.className = "spBtn"; b.type = "button"; b.innerHTML = `<span class="sk">${sp.en}</span><span class="sn">${sp.name}</span><span class="sl">${sp.lead}</span>`; b.addEventListener("click", () => { $("#sightBox").hidden = true; enterSight(sp); }); box.appendChild(b); }
  $("#sightBox").hidden = false;
}
function enterSight(sp) {
  if (QW.mode === "sky" || QW.mode === "descend") { const a = stAt(C.starts[Math.max(0, START.sel)]); CAM.pos.set(a.x, groundY(a.x, a.z) + EYE, a.z); CAM.yaw = stYaw(C.starts[Math.max(0, START.sel)]); hideSkyUI(); }
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
        if(mode==1){ vec2 q=uv-.5; uv=.5+q*(1.-.06*dot(q,q)); c=texture2D(tDiffuse,uv).rgb; float l=dot(c,vec3(.2126,.7152,.0722)); float sat=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b)); c=max(vec3(0.),mix(vec3(l),c,1.+.35*smoothstep(.06,.22,sat))); float sk=smoothstep(.45,.9,uv.y)*smoothstep(.0,.18,c.b-c.r)*smoothstep(.25,.75,l); c+=vec3(.42,.1,.62)*sk*.45; }   // 2026-10-24 紫外の手がかり（模式）：空の散乱光は紫外を多くふくむ、を紫で重ねる。紫外は測っていない   // 色の差の広げ方：色みのある所だけ（灰色の屋根を青緑にしない）   // 鳥：色どうしの差を広げる（四種類の単錐体の模式＝人の目への置きかえ）
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
    const n = nearestOnLine(CAM.pos.x, CAM.pos.z); if (n.dist > 90 && !(NET.segs && netNear(CAM.pos.x, CAM.pos.z, 60).dist < 60)) { const a = atD(n.d), k = 90 / n.dist; CAM.pos.x = a.x + (CAM.pos.x - a.x) * k; CAM.pos.z = a.z + (CAM.pos.z - a.z) * k; }
    camera.position.copy(CAM.pos); camera.quaternion.setFromEuler(new THREE.Euler(CAM.pitch, yaw, 0, "YXZ"));
  } else { WALK.hold = SIGHT.fwd; stepWalk(dt, sp.eye, sp.speed); }
}
function showSightUI(sp) { $("#sEn").textContent = sp.en; $("#sName").textContent = sp.name; $("#sLead").textContent = sp.lead; if (sp.mode === 1) $("#sLead").insertAdjacentHTML("beforeend", '<br><span class="smodel">紫は紫外の手がかりの模式（紫外は測っていません）</span>'); $("#sightUI").hidden = false; $("#sUpDn").hidden = false; $("#sUp").hidden = $("#sDown").hidden = sp.move !== "fly"; }
$("#sWhy").addEventListener("click", () => { const sp = SIGHT.sp; if (!sp) return; openPanel({ color: GL.sight.color, layer: `${String(layerNo("sight")).padStart(2, "0")}　Qualia/sight`, title: sp.name + "の手がかり", lines: sp.lines, more: sp.body, note: sp.note, src: sp.src, how: "研究の一般論と記録（模式）" }); });
$("#sBack").addEventListener("click", () => exitSight());

/* ---------- Qualia/sound：記録から組み立てた時の鐘（③ 再現音・④ 詩の音） ---------- */
let BELL = null;
function bell() { if (!BELL) BELL = new BellSynth(); BELL.resume(); return BELL; }
function openSound(L, no) {
  const it = L.o, g = GL.sound;
  if (it.kind === "far") {   // 遠くの音の道しるべ
    const c = it.cl; openPanel({ color: g.color, layer: no, title: it.title, lines: [{ t: `${c.nm}の音は、ここから${it.dir}へ約 ${it.m} m。歩く道からは遠くて届かないので、空から近づくと聞こえます。` }], more: ["その場所の音：" + c.list.map(s => s.title).join("・")], how: "", buttons: [{ label: "空から近づく", primary: true, run: () => flyOver(c) }] });
    return;
  }
  const run = () => { if (!soundOn) { toast("声と音がオフです（メニュー）"); return; } stopVoice(); const b = bell(); const dist = KURA.tower ? Math.hypot(KURA.tower.position.x - camera.position.x, KURA.tower.position.z - camera.position.z) : 0;
    if (it.kind === "kokonotsu") b.sequence(Array.from({ length: 9 }, (_, i) => i * 5), { dist });
    else if (it.kind === "hayagane") b.sequence([0, 1.1, 2.2, 4.4, 5.5, 6.6, 8.8, 11, 11.6, 12.2, 12.8, 13.4, 14, 14.6, 15.2, 15.8], { dist, hard: true });
    else if (it.kind === "cars") { SW.play("cars"); showTag(it.label, 13); return; }
    else if (it.kind === "amb") { AMB.play(it.spot); return; }
    else { b.sequence([0, 7, 14], { dist }); WAVE.start(); }
    showTag(it.label, it.kind === "kokonotsu" ? 44 : it.kind === "hayagane" ? 20 : 22); };
  if (it.kind === "amb") {   // 町に置いた音：声では読まず、触れたらすぐ鳴らす。題と出どころを小さく添える
    const sp = it.spot, ses = sp.amb && (sp.amb.months || sp.amb.hours) ? [`近づくと鳴る季節と時刻：${sp.amb.months ? sp.amb.months.join("・") + " 月" : "通年"}${sp.amb.hours ? `・${sp.amb.hours[0]} 時〜${sp.amb.hours[1]} 時` : ""}（それ以外は触れたときだけ）`] : [];
    openPanel({ color: g.color, layer: no, title: it.title, lines: [{ t: sp.how }], more: [...ses], src: sp.src, ll: it.ll, how: sp.label.split("（")[0], buttons: [{ label: "鳴らす", primary: true, run }, { label: "止める", run: () => AMB.stop() }] });
    const e = document.createElement("p"); e.className = "sndSrc"; e.textContent = `${sp.label}　音：${sp.who}`; $("#pBody").appendChild(e);
    run(); return;
  }
  openPanel({ color: g.color, layer: no, title: it.title, lines: it.lines, more: [it.label, it.how], src: it.src, ll: it.ll, how: it.label.split("（")[0], buttons: [{ label: "鳴らす", primary: true, run }, { label: "止める", run: () => { BELL?.stop(); WAVE.stop(); } }] });
  speakLines(it.lines, L, { done: run });
}
/* 2026-10-24 本人「Qualia/sound を増やす・音の体験を増やす」
   ・歩くと足音が変わる（車道のアスファルト／歩道の平板。壁の近くでは壁から返る音）・通りの車の地点（近づくと鳴る）。どちらも録音ではなく、その場で組み立てる模式 */
function extraSounds() {
  if (C.sound.some(s => s.id === "x_car1")) return;
  const ll = (x, z) => [+(G.origin[1] + x / G.kx).toFixed(7), +(G.origin[0] - z / G.ky).toFixed(7)];
  const side = (d, off) => { const a = atD(d); return { x: a.x - a.tz * off, z: a.z + a.tx * off }; };
  [[990, "仲町交差点"], [1330, "一番街"], [1440, "札の辻"]].forEach(([d, nm], i) => { const p = side(d, 6);
    C.sound.push({ id: "x_car" + (i + 1), kind: "cars", r: 0, ar: 46, every: 8, title: `${nm}の車`, x: p.x, z: p.z, ll: ll(p.x, p.z),
      label: "③ 再現音（通りを行き交う車を、風を切る音から組み立てた模式。台数とタイミングは模式）", how: `${nm}を通る車が、近づいて遠ざかる音を、その場で組み立てています。実際の台数ではありません。`, lines: [], src: [] }); });
  SW.zones = C.sound.filter(s => s.kind === "cars").map(s => ({ id: s.id, x: s.x, z: s.z, r: s.ar, every: s.every, label: s.label, it: s }));
  // 2026-10-24 本人「歴史や文化、自然などに関連する音をたくさん配置してください」→ 町に置いた音（sounds.js）
  const spots = SPOTS.map(s => { const a = s.at; let x, z;
    if (a.ll) { x = (a.ll[1] - G.origin[1]) * G.kx + (a.dx || 0); z = -(a.ll[0] - G.origin[0]) * G.ky + (a.dz || 0); }
    else if (a.d != null) ({ x, z } = side(a.d, a.s || 0)); else ({ x, z } = a);
    return { ...s, x: +x.toFixed(2), z: +z.toFixed(2) }; });
  for (const s of spots) C.sound.push({ id: s.id, kind: "amb", spot: s, title: s.title, x: s.x, z: s.z, ll: ll(s.x, s.z), label: s.label, how: s.how, lines: [], src: s.src });
  AMB.setSpots(spots);
  // 2026-10-25 歩く道から遠い音（喜多院・川越氷川神社・新河岸川。約 500 m 先）：道のいちばん近い所に「その音へ」の札を置き、触れると空から近づける（遠すぎて歩く道からは聞こえない、をそのまま言う）
  const PLACE = { h_kitain: "喜多院", n_aburazemi: "喜多院", n_kogera: "喜多院", c_furin: "川越氷川神社", c_suzu: "川越氷川神社", n_sagi: "新河岸川", n_ogawa: "新河岸川" };
  const far = spots.map(s => ({ s, n: nearestOnLine(s.x, s.z) })).filter(o => o.n.dist > 90 && !(NET.segs && netNear(o.s.x, o.s.z, 60).dist < 45)), CL = [];   // 2026-10-25 裏路地・喜多院への道を歩けるようにした＝歩いて近づける音には札を出さない
  for (const o of far) { const nm = PLACE[o.s.id] || o.s.title; let c = CL.find(c => c.nm === nm && Math.hypot(c.x - o.s.x, c.z - o.s.z) < 150); if (!c) CL.push(c = { nm, x: 0, z: 0, list: [] }); c.list.push(o.s); c.x = c.list.reduce((a, s) => a + s.x, 0) / c.list.length; c.z = c.list.reduce((a, s) => a + s.z, 0) / c.list.length; }
  const DIR = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  CL.forEach((c, i) => { const n = nearestOnLine(c.x, c.z), a = atD(n.d), dx = c.x - a.x, dz = c.z - a.z, L = Math.hypot(dx, dz), m = Math.round(L / 50) * 50;
    const dir = DIR[Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360 / 45) % 8], px = a.x + dx / L * 5, pz = a.z + dz / L * 5;
    C.sound.push({ id: "x_far" + (i + 1), kind: "far", cl: c, title: `${c.nm}の音へ（${dir}へ約 ${m} m）`, x: px, z: pz, ll: ll(px, pz), dir, m, label: "道しるべ（遠くの音の場所）", how: "", lines: [], src: [] }); });
}
function surfAt(x, z) { const n = nearestOnLine(x, z).dist; if (n < 3.2) return "asphalt"; if (n > 14 && NET.segs) { const q = netNear(x, z, 20); return q.hw > 4 && q.dist > q.hw - 2.3 ? "tile" : "asphalt"; } return "tile"; }   // 道の中ほどは車道のアスファルト、端は歩道の平板（模式）
function inKura(x, z) { for (const k of [...G.kura, ...(G.machi || [])]) { if (Math.abs(k.x - x) > 14 || Math.abs(k.z - z) > 14) continue; const c = Math.cos(k.yaw), s = Math.sin(k.yaw), dx = x - k.x, dz = z - k.z; if (Math.abs(dx * c - dz * s) < k.w / 2 && Math.abs(dx * s + dz * c) < k.dp / 2) return true; } return false; }
const WALLD = { t: 0, v: null };
function wallDist(x, z) {   // いちばん近い壁まで（1 m きざみ・7 m まで）
  for (let r = 1; r <= 7; r++) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (inBld(px, pz, 0) || inKura(px, pz)) return r; }
  return null;
}
const SW = makeSoundWalk({ ctx: () => BELL?.ac || null, out: () => BELL.out, on: () => soundOn && LAYER.worn.includes("sound") && (QW.mode === "walk" || QW.mode === "sight"), duck: () => voiceQ ? .5 : 1,
  tag: (id, label, zn) => showTag(zn ? zn.label : `③ 再現音（${label}。その場で組み立てた音）`, 4) });
QW.SW = SW; QW.surfAt = () => surfAt(CAM.pos.x, CAM.pos.z);
const AMB = makeAmbience({ ctx: () => BELL?.ac || null, out: () => BELL.out, ver: VER, get bell() { return G?.bell; },
  on: cat => soundOn && LAYER.worn.includes("sound") && LAYER.worn.includes(cat === "nature" ? "nature" : "culture"), duck: () => voiceQ ? .35 : 1,
  tag: (sp, opt = {}) => showTag(opt.clock ? `${opt.clock} 時。時の鐘が鳴る時刻です` : sp.title, opt.clock ? 22 : 6, `${sp.label}　音：${sp.who}`) });
QW.AMB = AMB;
function stepSoundWalk(dt) {
  if ((WALDT.t -= dt) < 0 && QW.mode === "walk") { WALDT.t = .3; WALLD.v = wallDist(CAM.pos.x, CAM.pos.z); }
  const cp = camera.position; SW.update(dt, { x: cp.x, z: cp.z, yaw: CAM.yaw + CAM.look, moving: WALK.moving && QW.mode === "walk", surface: QW.mode === "walk" ? surfAt(CAM.pos.x, CAM.pos.z) : null, wall: WALLD.v });
  AMB.update(dt, { x: cp.x, z: cp.z, h: QW.mode === "fly" ? Math.max(0, cp.y - groundY(cp.x, cp.z) - EYE) : 0, yaw: CAM.yaw + CAM.look, active: QW.mode === "walk" || QW.mode === "sight" || QW.mode === "fly" });   // 空を飛んでいるときは、川や杜の上を通ると聞こえる
}
const WALDT = { t: 0 };
function showTag(t, sec, sub) { const e = $("#sndTag"), k = sub || t; e.textContent = t; if (sub) { const s = document.createElement("small"); s.textContent = sub; e.appendChild(s); }
  e.dataset.k = k.startsWith("④") ? "poem" : k.startsWith("③") ? "re" : k.startsWith("②") ? "else" : "rec"; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => { e.hidden = true; }, sec * 1000); }
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
let PAPER = null;
function paperTex() {   // 書の後ろの、和紙のような淡い光（中ほどは明るく、ふちへ消える）
  if (PAPER) return PAPER; const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(250,246,236,.95)"); g.addColorStop(.55, "rgba(246,240,226,.72)"); g.addColorStop(1, "rgba(246,240,226,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  PAPER = new THREE.CanvasTexture(c); PAPER.colorSpace = THREE.SRGBColorSpace; return PAPER;
}
const SHO = { mod: null, loading: null, live: {} }, SHO_W = 5.2;   // 書の幅 m（2026-10-24 本人「sho をもっと大きく、目立つように」2.2 → 5.2）
function loadShoMod() { return SHO.loading ||= import("../sho/sho3d.js").then(m => { SHO.mod = m; return m; }).catch(e => console.warn("sho", e)); }
function stepSho(dt) {
  const on = LAYER.worn.includes("sound") && (QW.mode === "walk" || QW.mode === "fly"), cp = camera.position, t = performance.now() / 1000;
  for (const it of C.sho) {
    const dist = Math.hypot(it.x - cp.x, it.z - cp.z), want = on && dist < 120, S = SHO.live[it.id];
    if (want && !S) { if (!SHO.mod) { loadShoMod(); continue; }
      if (SHO.live[it.id] === undefined) { SHO.live[it.id] = null; SHO.mod.loadShoMap(it.src).then(map => {
        const sho = SHO.mod.createSho(THREE, map, { width: Math.min(SHO_W, 6.6 * map.w / map.h), particleMode: "ink", mobile: MOBILE }); const n = nearestOnLine(it.x, it.z), a = atD(n.d);
        sho.group.position.set(it.x, groundY(it.x, it.z) + sho.height / 2 + .3, it.z);
        const halo = new THREE.Mesh(new THREE.PlaneGeometry(sho.width * 1.9, sho.height * 1.7), new THREE.MeshBasicMaterial({ map: paperTex(), color: "#ffffff", transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false })); halo.position.set(0, 0, -.3); halo.renderOrder = -1; sho.group.add(halo);   // 書の後ろに、和紙のような淡い光（墨が木々に沈まず、遠くから読める） sho.group.rotation.y = Math.atan2(a.x - it.x, a.z - it.z) || 0; sho.setScale(innerHeight * renderer.getPixelRatio() * .9); world.add(sho.group);
        SHO.live[it.id] = { sho, snd: null, it, hold: 0 }; }).catch(e => console.warn("sho map", e)); }
      continue; }
    if (!S) continue;
    S.sho.group.visible = want; if (!want) { S.snd?.stop(); continue; }
    if (!S.snd && BELL?.ac && soundOn) S.snd = SHO.mod.createShoSound(it.preset, { context: BELL.ac, destination: BELL.ac.destination, volume: .4 });
    if (S.snd && soundOn && !S.snd.running && BELL.ac.state === "running") S.snd.start();
    if (S.snd && !soundOn && S.snd.running) S.snd.stop();
    { const ry = Math.atan2(cp.x - it.x, cp.z - it.z), g = S.sho.group; g.rotation.y += Math.atan2(Math.sin(ry - g.rotation.y), Math.cos(ry - g.rotation.y)) * Math.min(1, dt * 2); }   // 書はいつも見る人の方へ正面を向ける
    S.hold = Math.max(0, S.hold - dt); S.sho.target = S.hold > 0 ? 1 : dist < 10 ? .85 : 0;
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
/* 現在地で歩く（GPS・2026-10-24）：いまいる所から、その場の Qualium を歩く。位置はこの端末の中だけで使い、送らず、残さない */
function hereMove(x, z, f, jump) {
  if (QW.mode !== "walk") return;
  WALK.auto = false; syncAutoBtn(); if (WALK.ring) WALK.ring.visible = false;
  let blocked = false; { const dx = x - CAM.pos.x, dz = z - CAM.pos.z, L = Math.hypot(dx, dz); for (let m = 1; m < L; m += 1) if (inBld(CAM.pos.x + dx * m / L, CAM.pos.z + dz * m / L, .2)) { blocked = true; break; } }   // 角を曲がった（あいだに建物がある）ときは、歩かずにその場へ
  if (jump || blocked || Math.hypot(x - CAM.pos.x, z - CAM.pos.z) > 30) { CAM.pos.x = x; CAM.pos.z = z; WALK.goal = null; return; }   // 遠くへ跳んだときは、その場へ
  WALK.goal = new THREE.Vector3(x, 0, z);
}
const HERE = QW.HERE = makeHereWalk({
  name: "川越の町の道",
  toXZ: (lat, lon) => [(lon - G.origin[1]) * G.kx, -(lat - G.origin[0]) * G.ky],
  place(x, z) {
    // 2026-10-25 本人「裏路地に入ったら範囲外になり残念」＝道筋 A から 250 m ではなく、歩ける道（裏路地・並行する道・喜多院への道ほか）から 60 m までを範囲に
    const g = G.dem, n = nearestOnLine(x, z), in_ = x > g.x0 && x < g.x0 + g.cell * (g.nx - 1) && z > g.z0 && z < g.z0 + g.cell * (g.nz - 1);
    const q = NET.segs ? netFar(x, z) : { dist: 1e9 }, dn = Math.min(q.dist, n.dist);
    const zn = AREAS.ready && AREAS.zoneAt(x, z); if (zn && zn.chunk) AREAS.ensureAt(x, z);   // 2026-10-26 広げたエリア（駅・喜多院・本丸御殿・氷川神社）の中は範囲内。道は読みながら
    if (!in_ || (NET.segs ? q.dist > 60 && n.dist > 60 && !zn : n.dist > 250)) return { ok: false, dist: dn };
    const p = { x, z }; corridorClamp(p);
    if (inBld(p.x, p.z)) { if (q.dist < n.dist) { p.x = q.x; p.z = q.z; } else { const a = atD(n.d); p.x = a.x; p.z = a.z; } }   // 建物の中なら、道の上へ
    return { ok: true, dist: dn, d: n.d, x: p.x, z: p.z, off: dn > 16 };
  },
  first(x, z, f) {
    if (f.off) toast(`道から ${Math.round(f.dist)} m ほど離れています。いちばん近い道の上から歩きます。`);
    else setTimeout(() => safetyNote(), 4200);
    if (QW.mode === "walk") { hereMove(x, z, f, true); return; }
    const i = C.starts.reduce((b, t, k) => t.d != null && Math.abs(t.d - f.d) < Math.abs(C.starts[b].d - f.d) ? k : b, 0);
    descendTo(i, { x, z, d: f.d });
  },
  move: (x, z, f) => hereMove(x, z, f),
  toast: t => toast(t),
  sync(on) { for (const id of ["#hereBtn", "#skyHere"]) { const b = $(id); if (b) { b.setAttribute("aria-pressed", String(on)); b.textContent = on ? (id === "#hereBtn" ? "現在地で歩く：入" : "現在地を探しています…") : (id === "#hereBtn" ? "現在地で歩く" : "現在地から歩く"); } } }
});
$("#hereBtn").addEventListener("click", () => { unlockAudio(); HERE.toggle(); });
/* 耳で歩く（2026-10-26 本人）：画面は暗く、次の地点の方からかさねっこの声。止まると窓がひらく（部品 earwalk.js） */
const EAR = QW.EAR = makeEarWalk({ ctx: () => bell().ac, out: () => BELL.out, soundOn: () => soundOn, busy: () => false, toast: t => toast(t), colors: Object.values(COLOR5),
  pos: () => ({ x: CAM.pos.x, z: CAM.pos.z, yaw: CAM.yaw + CAM.look }),
  targets: () => LAYER.objs.filter(L => LAYER.worn.includes(top5(L.layer)) && L.kind !== "far" && !/^x_/.test(L.o.id || "")).map(L => ({ id: L.o.id || L.o.title, x: L.o.x, z: L.o.z, layer: top5(L.layer), L })),
  arrive: T => { if (T.L.kind === "rec" || T.L.kind === "sound" || T.L.kind === "touch") openObj(T.L); },
  sync: on => { const b = $("#earBtn"); if (b) { b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "耳で歩く：入" : "耳で歩く"; } } });
$("#earBtn")?.addEventListener("click", () => { unlockAudio(); EAR.toggle(); if (EAR.on && !HERE.on && window.isSecureContext && "geolocation" in navigator && !QW.noGeo) HERE.start(); });
$("#skyHere").addEventListener("click", () => { unlockAudio(); HERE.toggle(); });
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
$("#sndBtn").addEventListener("click", () => { soundOn = !soundOn; $("#sndBtn").setAttribute("aria-pressed", String(soundOn)); $("#sndBtn").textContent = soundOn ? "声と音 オン" : "声と音 オフ"; if (!soundOn) { try { audio.pause(); } catch { } BELL?.stop(); AMB.stop(); } });
function fillMenu() { $("#about").textContent = C.about; $("#credit").textContent = C.credit; }
function buildTray() {
  const a = $("#layersAll"); a.innerHTML = "";
  const mk = (L, i) => {
    const n = L.id === "sight" ? C.sight.length : L.id === "sound" ? C.sound.length + C.sho.length : L.id === "touch" ? C.touch.length : C.objs.filter(o => top5(o.layer) === L.id).length;
    const li = document.createElement("li"); li.className = "ly"; const b = document.createElement("button"); b.type = "button"; b.className = "lyBtn" + (L.q ? " q" : ""); b.dataset.id = L.id; b.style.setProperty("--gc", L.color); b.title = L.lead; b.setAttribute("aria-label", `${L.name}（${L.lead}）`);
    b.innerHTML = `<span class="tk" aria-hidden="true"></span><span class="no">L${String(i + 1).padStart(2, "0")}</span><span class="sh">${L.id}</span><span class="nm"><b>${L.name}</b><small>${L.en}</small></span><span class="ct">${String(n).padStart(2, "0")}</span>`;
    b.addEventListener("click", () => wearLayer(L.id)); li.appendChild(b);
    if (L.id === "sight") { const g = document.createElement("button"); g.type = "button"; g.className = "lyGo hb"; g.style.setProperty("--gc", L.color); g.textContent = "入る"; g.setAttribute("aria-label", "生きものの身体に入る"); g.addEventListener("click", e => { e.stopPropagation(); openSightChooser(); }); li.appendChild(g); }
    a.appendChild(li); };
  ALL.slice(0, 2).forEach((L, i) => mk(L, i));
  const sep = document.createElement("li"); sep.className = "lySep"; sep.setAttribute("aria-hidden", "true"); sep.textContent = "五感 · SENSES"; a.appendChild(sep);
  ALL.slice(2).forEach((L, i) => mk(L, 2 + i));
  syncTray();
}
function syncTray() { document.querySelectorAll(".lyBtn").forEach(b => b.setAttribute("aria-pressed", LAYER.worn.includes(b.dataset.id) ? "true" : "false")); const c = $("#lsCount"); if (c) c.textContent = `${LAYER.worn.length} / ${ALL.length}`; }
QW.dbg = () => ({ areas: AREAS.info(), nArea: QW.nArea || 0, mode: QW.mode, cam: [CAM.pos.x, CAM.pos.y, CAM.pos.z], worn: [...LAYER.worn], aoi: !!AOI.root?.visible, talk: voiceQ?.talk?.o?.id || null, spoken: TALK.spoken.size, nBld: QW.nBld, sight: SIGHT.sp?.id || null });
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
  for (const p of START.pins) p.g.visible = QW.mode === "sky" || (QW.mode === "descend" && camera.position.y - groundY(camera.position.x, camera.position.z) > 90);   // 降りきる前に、大きくなった輪と柱を消す
  { const low = camera.position.y - groundY(camera.position.x, camera.position.z) < 160; if (QW.roads) QW.roads.visible = low; if (QW.pave) QW.pave.visible = low; if (BLD.foot) BLD.foot.visible = low; if (BLD.solid) BLD.solid.visible = low; AREA_G.visible = low; for (const m of QW.paveSt || []) m.visible = low; }   // 上空では写真の道を見せる（帯は地上の近くだけ）
  if ((GEO.t -= dt) < 0 && QW.mode !== "boot") { GEO.t = .25; const g = GEO.el || (GEO.el = $("#lsGeo")), cp = camera.position, la = G.origin[0] - cp.z / G.ky, lo = G.origin[1] + cp.x / G.kx, h = Math.max(0, cp.y - groundY(cp.x, cp.z));
    const txt = `POS <b>${la.toFixed(4)}N ${lo.toFixed(4)}E</b>\nALT ${Math.round(h)}m  ${QW.mode.toUpperCase()}`; if (g && txt !== GEO.last) { g.innerHTML = txt; GEO.last = txt; } }
  if (!RM) BLDU.t.value += dt;
  if (BLD.lines) BLD.lines.material.opacity = QW.mode === "sight" ? .16 : .42;
  if (BLD.mat) BLD.mat.uniforms.amul.value += ((QW.mode === "fly" ? .7 : QW.mode === "sight" ? .06 : 1) - BLD.mat.uniforms.amul.value) * Math.min(1, dt * 3); DESAT.value += ((QW.mode === "sight" ? .8 : 0) - DESAT.value) * Math.min(1, dt * 3); if (BLD.lines) BLD.lines.material.opacity += ((QW.mode === "sight" ? .2 : .42) - BLD.lines.material.opacity) * Math.min(1, dt * 3);   // 2026-10-23 公開前：鳥の高さから見ると半透明の面が重なって町の外が水面に見えたので、sight では面をほとんど消し線を薄く   // 上から見ると面が重なって濃くなるので、面を薄く（線は残す）
  { const m = QW.mode, camH = camera.position.y - groundY(camera.position.x, camera.position.z), want = m === "sky" || m === "boot" ? 1 : m === "descend" ? Math.min(1, Math.max(0, (camH - 70) / 220)) : 0; CYBER.v.value += (want - CYBER.v.value) * Math.min(1, dt * 2.2); CYBER.scan.value = (performance.now() / 1000 * 70) % 2600 - 900;
    const vt = m === "sky" || m === "boot" ? 1 : 0; VEIL.k = (VEIL.k ?? 1) + (vt - (VEIL.k ?? 1)) * Math.min(1, dt * 1.8); const kc = VEIL.k, bg = kc > .995 ? NAVY : QW.skyBg; if (scene.background !== bg) scene.background = bg; VEIL.visible = bg !== NAVY && kc > .005; if (VEIL.visible) { VEIL.material.uniforms.opacity.value = kc; VEIL.position.copy(camera.position); VEIL.scale.setScalar(camera.far * .9); } scene.fog.color.copy(FOG).lerp(NAVY, CYBER.v.value); if (QW.near) QW.near.visible = CYBER.v.value < .5; }   // 3D 地図の電脳の地面（氷川と同じ）
  AREAS.update(dt, QW.mode);
  stepLayer(dt); stepSho(dt); stepTalk(); WAVE.step(); stepSoundWalk(dt); MY.L?.update(dt); KASA.herd?.update(dt, { active: QW.mode === "walk", busy: !$("#panel").hidden || !!voiceQ });   // 碧が話しているあいだは、かさねっこの掛け合いを重ねない
  if (KURA.tags) stepTag();
  if (QW.mode === "walk") { stepAoi(dt); EAR.update(dt); } else if (EAR.on && QW.mode !== "descend") EAR.stop();
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
    setMode("sky"); selectStart(START.sel); requestAnimationFrame(syncStMeter); SKY.dist = SKY.tDist = MOBILE ? 2100 : 1550; SKY.c.set(140, 20, 540);   // 2026-10-26 JR 川越駅〜川越氷川神社までの六つのエリアが一度に見える高さ skyCam(); showSkyUI();
    renderer.setAnimationLoop(frame);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    document.body.classList.add("ready"); QW.ready = true; QW.tReady = performance.now() - T0;
    setTimeout(() => { buildBuildings().catch(e => console.warn("bld", e)); buildKura(); }, 60);   // エリアの輪郭（zones.json・1 KB）は buildBuildings の中で一緒に読む
    setTimeout(loadKasane, 3000); setTimeout(loadMyLayer, 3600);
    setTimeout(() => { loadAoi(); fetch("web/app/lip.json?v=" + VER).then(r => r.json()).then(j => { LIP = j; }).catch(() => { }); }, 500);
    const s0 = Q.get("start"); if (s0 != null && C.starts[+s0]) { selectStart(+s0); descendTo(+s0); }
  } catch (e) { console.error(e); status("読み込めませんでした。ページを開きなおしてください。"); }
})();
