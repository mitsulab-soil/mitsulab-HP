/* Qualia/walk 氷川 ── 軽い版（2026-10-20）／層を重ねる版（2026-10-22）
   3D 地図（上空）から始める場所を選ぶ → 降りて歩く（見回しながら）／鳥になって飛ぶ／生きもの（Qualia/sight）になる。
   Qualia Layer：記録の 9 層と、Qualia/sight・Qualia/sound の層を重ねると、その層の物（3D）が地図の座標に固定されて重なる（Qualium の構想）。
   碧は、いまいる所に結びついた記録を話しつづける（出典は字幕から開く）。層は、見る人が選んだときだけ変わる。
   座標：x＝東 m・y＝標高 m・z＝南 m（原点 経度 139.631・緯度 35.90725）。 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { QLAYERS, makeMarker, makeLabel, glowTex } from "./layers.js?v=8";
import { makeQMarks, placeLabels } from "./qmarks.js?v=k18";
import { makeWorldLayers } from "./worldlayers.js?v=w16";   // 10-28 晩：層は世界の中に（関係の線・見下ろす／見上げるでミクロ⇄マクロ）
import { groundFarMat } from "../kit/ground_far.js?v=7";
const QM_OPT = { overWalls: true };   // 2026-10-27 夜：Qualium 共通の基準（大宮・川越・渋谷で同じ）
import { makeStartPins } from "../kit/startpins.js?v=mg5";
import { makeMapGuide, makeEyeView } from "../kit/mapguide.js?v=mg2";
import { makeHereWalk } from "./herewalk.js?v=2";
import { makeSoundWalk } from "./soundwalk.js?v=1";
import { makeAreas } from "./areas.js?v=56m";

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 820;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const T0 = performance.now();
const QW = window.__qw = { ready: false, mode: "boot", renderer: null };
const BASE = "web/lite/", VER = "20261028t";   // データの版の印（公開直後に古いデータが出ないように）
const status = t => { const e = $("#bootStatus"); if (e) e.textContent = t; };

/* ---------- 描画 ---------- */
const canvas = $("#gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance", alpha: false, stencil: true });   // 道の上に地形が出ないよう、道の画素に印を付ける（下の ROAD_STENCIL）
QW.renderer = renderer;
const PR_MAX = MOBILE ? Math.min(devicePixelRatio, 1.6) : Math.min(devicePixelRatio, 1.5);
let pr = PR_MAX; renderer.setPixelRatio(pr);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
const scene = new THREE.Scene();
/* 2026-10-26 本人「Qualia がメインで、風景はそのオーバーレイ」：層を重ねているあいだ、風景（トーンマップされる物）だけを一段控えめに（彩度と明るさを下げ、写実は保つ）。
   印（toneMapped:false）・碧・かさねっこ・札は除く。層をすべて外すと、ふつうの風景に戻る。 */
const LANDG = { value: 0 }, LZERO = { value: 0 }; QW.LANDG = LANDG;
THREE.ShaderChunk.tonemapping_pars_fragment = "uniform float uLandG;\n" + THREE.ShaderChunk.tonemapping_pars_fragment;
THREE.ShaderChunk.tonemapping_fragment += `
#if defined( TONE_MAPPING )
{ float lu = dot(gl_FragColor.rgb, vec3(.2126, .7152, .0722)); vec3 lg = mix(vec3(lu), gl_FragColor.rgb, .34) * vec3(.64, .66, .71); gl_FragColor.rgb = mix(gl_FragColor.rgb, lg, uLandG); }
#endif
`;
THREE.Material.prototype.onBeforeCompile = function (sh) { sh.uniforms.uLandG = this.userData.land ? LANDG : LZERO; };
function landSweep() {
  const skip = new Set(), ex = o => o?.traverse(c => skip.add(c)); ex(AOI.root); ex(KASA.herd?.group); ex(LAYER.ripple);
  world.traverse(o => {
    if (!o.isMesh || skip.has(o)) return;
    for (const m of [].concat(o.material)) {
      if (!m || m.userData.land !== undefined) continue;
      if (m.isShaderMaterial && !m.toneMapped) { m.userData.land = false; continue; }
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
const camera = new THREE.PerspectiveCamera(MOBILE ? 62 : 55, innerWidth / innerHeight, .08, 6000);
scene.add(camera);
const FOG_SKY = new THREE.Color("#d2d8df"), NAVY = new THREE.Color("#03060f");
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

/* ---------- 石の風化（2026-10-22 本人「石がつるつるすぎる」）----------
   鳥居の台・灯籠・狛犬・石柵・縁石・石張り・護岸の石に、ほんものの岩の肌理（Poly Haven rock_surface・lichen_rock、CC0）を
   世界の座標から三方向で重ね、むらのある汚れ・雨の筋・地衣・苔（ambientCG Moss004、CC0）と、粗さのむら・細かな凹凸を足す。
   つやは抑える（粗さ 0.8 以上・映り込みを弱く）。漆の黒・朱・銅は触らない。 */
let W_TEX = null;
const W_CHUNK = `
uniform sampler2D wTex; uniform vec4 wP; uniform vec4 wQ; varying vec3 vWp; varying vec3 vWn; varying float vOy;
float wh(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float wn3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(wh(i),wh(i+vec3(1,0,0)),f.x),mix(wh(i+vec3(0,1,0)),wh(i+vec3(1,1,0)),f.x),f.y),mix(mix(wh(i+vec3(0,0,1)),wh(i+vec3(1,0,1)),f.x),mix(wh(i+vec3(0,1,1)),wh(i+vec3(1,1,1)),f.x),f.y),f.z); }
vec4 wTri(vec3 p, vec3 n){ vec3 b=pow(abs(n),vec3(4.)); b/=(b.x+b.y+b.z);
#ifdef W_CHEAP
  vec2 uv = b.y>max(b.x,b.z) ? p.xz : (b.x>b.z ? p.zy : p.xy); return texture2D(wTex, uv);
#else
  return texture2D(wTex,p.zy)*b.x + texture2D(wTex,p.xz)*b.y + texture2D(wTex,p.xy)*b.z;
#endif
}`;
function weather(m, o = {}) {   // o: moss・grime・lichen（0〜1）、scale（1 m あたりの繰り返し）、flat（敷石など平らな面）、bump（凹凸の強さ）、base（汚れの基準の高さ。省くと物の足もと）、rough（粗さの下限）
  if (!W_TEX) { W_TEX = tex(BASE + "tex/weather.webp?v=" + VER, false); W_TEX.anisotropy = MOBILE ? 2 : 8; }
  const P = new THREE.Vector4(o.moss ?? .35, o.grime ?? .5, o.lichen ?? .4, o.scale ?? 1.2), Qv = new THREE.Vector4(o.flat ? 1 : 0, o.bump ?? .045, o.base ?? -1e4, o.rough ?? .84);
  m.roughness = Math.max(m.roughness ?? 1, Qv.w); m.metalness = 0; m.envMapIntensity = Math.min(m.envMapIntensity ?? 1, o.env ?? .32);
  m.onBeforeCompile = sh => {
    sh.uniforms.wTex = { value: W_TEX }; sh.uniforms.wP = { value: P }; sh.uniforms.wQ = { value: Qv };
    if (MOBILE) sh.defines = Object.assign(sh.defines || {}, { W_CHEAP: "" });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; varying vec3 vWn; varying float vOy;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n{ vec4 wq = modelMatrix * vec4(transformed, 1.); vWp = wq.xyz; vWn = normalize(mat3(modelMatrix) * objectNormal); vOy = wq.y - modelMatrix[3].y; }");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + W_CHUNK)
      .replace("#include <map_fragment>", `#include <map_fragment>
  vec3 wN = normalize(vWn); float wD = length(vWp - cameraPosition);
  vec4 W = wTri(vWp * wP.w, wN);
#ifndef W_CHEAP
  vec4 W2 = wTri(vWp * wP.w * .23 + 3.1, wN);
#else
  vec4 W2 = W;
#endif
#ifdef W_CHEAP
  vec2 wq2 = vWp.xz + vWp.yy * .7; float wn1 = texture2D(wTex, wq2 * .09 + .3).b, wn2 = texture2D(wTex, wq2 * .31 + .7).r, wn4 = W.b, wMac = wn1;   // スマホ：ノイズの計算を、同じ絵の低い周波数の読み出しで代える
#else
  float wn1 = wn3(vWp * .45), wn2 = wn3(vWp * 1.9 + 11.), wn4 = wn3(vWp * 6.3 + 5.), wMac = wn3(vWp * .13 + 2.);
#endif
  float grain = mix(W.r, W2.r, .45), grain2 = W.b;
  diffuseColor.rgb *= (.74 + .52 * grain) * (.8 + .36 * wn1) * (.93 + .14 * wn4) * (.86 + .26 * wMac);
  float oy = wQ.z > -9000. ? vWp.y - wQ.z : vOy;
  float wUp = smoothstep(.25, .9, wN.y);
  float wLow = 1. - smoothstep(0., .3 + .9 * wn2, oy);
  wLow = mix(wLow, smoothstep(.5, .85, wn1 * .6 + wn2 * .4), wQ.x);
#ifdef W_CHEAP
  float streak = (1. - wUp) * smoothstep(.5, .82, texture2D(wTex, vec2((vWp.x + vWp.z) * .8, vWp.y * .06)).r);
#else
  float streak = (1. - wUp) * smoothstep(.5, .82, wn3(vec3((vWp.x + vWp.z) * 3.2, vWp.y * .35, 0.)));
#endif
  float wGrime = clamp(wLow * .85 + streak * .45, 0., 1.) * wP.y;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.52, .5, .44), wGrime);
  float wMs = wn1 * .45 + wn2 * .3 + wUp * .2 + wLow * .25 + (1. - grain2) * .15 - .08 * wQ.x;
  float wT = .97 - .3 * wP.x; float wMoss = smoothstep(wT, wT + .1, wMs) * .92 * step(.001, wP.x);   // 苔なしの面（舗装）は苔を描かない
  vec3 mossC = mix(vec3(.10, .13, .055), vec3(.24, .28, .12), W2.a) * (.8 + .4 * wn4);
  diffuseColor.rgb = mix(diffuseColor.rgb, mossC, wMoss);
  float wLic = W.g * wP.z * smoothstep(.3, .65, wn2);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.58, .6, .52) * (.85 + .3 * grain), wLic * .6);
  float wH = grain * .7 + grain2 * .3 + wMoss * .35 + wn4 * .15;`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor = clamp(max(roughnessFactor, wQ.w) + (wn2 - .5) * .14 + wMoss * .12 - wGrime * .05, .76, 1.);")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
  { float k = wQ.y * (1. - smoothstep(5., 45., wD)); vec3 sp = -vViewPosition; vec3 sx = dFdx(sp), sy = dFdy(sp);
    vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1) * faceDirection;
    float hx = dFdx(wH) * k, hy = dFdy(wH) * k; vec3 gr = sign(det) * (hx * r1 + hy * r2);
    if (k > 0.) normal = normalize(abs(det) * normal - gr); }`);
  };
  m.customProgramCacheKey = () => "weather" + (MOBILE ? 1 : 0);
  m.needsUpdate = true;
  return m;
}

const pData = fetch(BASE + "data.json?v=" + VER).then(r => r.json());
const pDem = fetch(BASE + "dem.bin").then(r => r.arrayBuffer());
const pTerrain = glb("web/lite/terrain.glb");
let pPhoto = null; const photoP = () => pPhoto || (pPhoto = texP(BASE + "tex/" + (MOBILE ? "photo_1k.webp" : "photo_2k.webp")));   // 2026-10-23 夕：空中写真は 3D 地図では使わない（電脳の地図に）。歩くときの遠くの地面のためだけに、起動のあとで読む
// 2026-10-23 深夜：降りる途中の空を途切れなく。暗い地（電脳の地図）から写真の空へ、高さに合わせて少しずつ（空を一度に切りかえない）
const VEIL = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ uniforms: { opacity: { value: 0 }, uC: { value: NAVY } }, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  vertexShader: "varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
  fragmentShader: "uniform float opacity; uniform vec3 uC; varying float vY; void main(){ gl_FragColor = vec4(uC, opacity * mix(1., .22, smoothstep(-.16, .05, vY))); \n#include <colorspace_fragment>\n}" })); VEIL.renderOrder = -10; VEIL.visible = false; VEIL.frustumCulled = false; scene.add(VEIL);
const MAPV = .32;   /* 2026-10-28 本人：3D 地図は航空写真の地に、淡い線と面を重ねる（暗い電脳の地にしない） */
const CYBER = { v: { value: 1 }, scan: { value: 0 } };   // 3D 地図の地面：暗い地に細い格子・等高線・ゆっくり流れる光の走査（1＝地図・0＝歩く）
const pSky = texP(BASE + "tex/sky.webp");
const pBld = glb(BASE + "buildings.glb");

const world = new THREE.Group(); scene.add(world); QW.scene = scene; QW.world = world; QW.TREE = null;
let terrainMesh = null, roadGroup = null, structGroup = null;
const pickables = [];   // 地面を押して歩くときに当たる面

async function buildBase() {
  status("参道の地形を読み込んでいます");
  const [data, dem, tg, sky] = await Promise.all([pData, pDem, pTerrain, pSky]);
  D = data; DEM = new Int16Array(dem);
  sky.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = sky; QW.skyTex = sky;
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(sky).texture; pm.dispose();
  scene.environment = env; QW.env = env;
  const grass = tex(BASE + "tex/grass5.webp"), litter = tex(BASE + "tex/litter.webp?v=" + VER);
  terrainMesh = tg.scene.getObjectByProperty("isMesh", true); if (!terrainMesh.geometry.attributes.normal) terrainMesh.geometry.computeVertexNormals();
  const tm = new THREE.MeshStandardMaterial({ color: 0x55604a, roughness: 1, metalness: 0, envMapIntensity: .35 });
  setTimeout(() => photoP().then(photo => { photo.anisotropy = MOBILE ? 4 : 8; photo.flipY = false; photo.needsUpdate = true; tm.map = photo; tm.color.set(0xffffff); tm.needsUpdate = true; }).catch(() => { }), 1800);
  tm.onBeforeCompile = sh => {   // 近くだけ、草と土の細かい絵を重ねる（遠くは写真のまま）
    sh.uniforms.detail = { value: grass }; sh.uniforms.litter = { value: litter }; sh.uniforms.uCy = CYBER.v; sh.uniforms.uScan = CYBER.scan;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uCy; uniform float uScan;\nfloat gridL(vec2 p, float s){ vec2 q=abs(fract(p/s+.5)-.5)*s; vec2 w=fwidth(p)*1.3; vec2 l=1.-smoothstep(vec2(0.),w,q); return max(l.x,l.y); }")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\nif(uCy>.001){ vec2 p=vWp.xz; float fw=length(fwidth(p)); float g1=gridL(p,100.), g2=gridL(p,20.)*(1.-smoothstep(1.5,5.,fw)); float hh=vWp.y; float cq=abs(fract(hh+.5)-.5); float cl=1.-smoothstep(0.,fwidth(hh)*1.3,cq); float sc=exp(-pow((p.y-uScan)/60.,2.)); vec3 ln=vec3(.32,.78,.9); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.01,.025,.045),uCy); totalEmissiveRadiance+=uCy*(ln*(g1*.32+g2*.1+cl*.18)+ln*sc*(.05+g1*.4+cl*.3)); }\n/* 2026-10-27 夜 融合：歩くときも、地面に細い光の格子（5 m）と高さ 50 cm ごとの光の等高線を、近くは控えめに・10〜100 m で薄く重ねる */ { float dc=length(vWp.xz-cameraPosition.xz); float fz=smoothstep(5.,16.,dc)*(1.-smoothstep(60.,140.,dc))*(1.-uCy); vec2 gq=abs(fract(vWp.xz/5.+.5)-.5)/max(fwidth(vWp.xz/5.),vec2(1e-4)); float gl=1.-min(min(gq.x,gq.y)/1.1,1.); float hq=abs(fract(vWp.y*2.+.5)-.5)/max(fwidth(vWp.y*2.),1e-4); float cl2=1.-min(hq/1.2,1.); totalEmissiveRadiance+=vec3(.5,.86,.92)*fz*(gl*.07+cl2*.12); }");
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D detail; uniform sampler2D litter; varying vec3 vWp;")
      .replace("#include <map_fragment>", "#include <map_fragment>\n{ float dist=length(vWp-cameraPosition); float k=1.-smoothstep(25.,140.,dist); vec3 dt=texture2D(detail,vWp.xz*.33).rgb; float l=dot(dt,vec3(.333)); diffuseColor.rgb*=mix(1.,.55+l*1.1,k*.85); float l0=dot(diffuseColor.rgb,vec3(.333)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(l0),.45)*vec3(.86,.83,.76); float lu=dot(diffuseColor.rgb,vec3(.333)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.37,.36,.34)*(.8+lu*.25),smoothstep(.28,.52,lu)*.92);"
        + " float rg=smoothstep(-1075.,-1045.,vWp.z)*(1.-smoothstep(-870.,-835.,vWp.z))*smoothstep(-175.,-150.,vWp.x)*(1.-smoothstep(0.,25.,vWp.x)); vec3 lt=texture2D(litter,vWp.xz*.24).rgb; vec3 lt2=texture2D(litter,vWp.xz*.09+.37).rgb; vec3 lt3=texture2D(litter,vWp.zx*.55+.21).rgb; lt=mix(lt,lt3,.35); lt=mix(lt,vec3(dot(lt,vec3(.333))),.62)*vec3(.66,.58,.47); lt=(lt-.14)*1.3+.14; diffuseColor.rgb=mix(diffuseColor.rgb,max(lt,vec3(0.))*(.35+1.*dot(lt2,vec3(.333))),rg*(1.-smoothstep(60.,220.,dist))*.9); }");   // 境内の林の床：落ち葉と腐植（2026-10-22）
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
  const ll2 = (lon, lat) => [(lon - D.origin[0]) * 111320 * Math.cos(D.origin[1] * Math.PI / 180), -(lat - D.origin[1]) * 110574];
  const [rx0, rz0] = ll2(139.54833984375, 35.978006180855665), [rx1, rz1] = ll2(139.68017578125, 35.87124685002796);   // 国土地理院 シームレス空中写真 z14（tex/far_photo.webp）の範囲
  const gm = groundFarMat(THREE, { hole: [x0, z0, x1, z1], base: "#8d8a83", rect: [rx0, rz0, rx1, rz1] });
  setTimeout(() => TL.load(BASE + "tex/far_photo.webp?v=1", t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MOBILE ? 2 : 4; gm.userData.gf.gfMap.value = t; gm.userData.gf.gfOn.value = 1; }), 2600);   // 起動のあとで読む
  QW.farGM = gm; const m = new THREE.Mesh(g, gm);   // 2026-10-27 夜：遠くの地面を灰色の無地にしない（共通部品 kit/ground_far.js・実在の空中写真）
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
    world.add(new THREE.Mesh(rg, weather(new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/japanese_stone_wall_c5.webp"), normalMap: MOBILE ? null : tex(BASE + "tex/japanese_stone_wall_n5.webp", false), color: "#b8b2a6", roughness: .95, side: THREE.DoubleSide, envMapIntensity: .4 }), { moss: .75, grime: .6, lichen: .35, base: y + .05, scale: 1.1 })));
    const bot = new THREE.Mesh(g.clone(), new THREE.MeshStandardMaterial({ color: "#2b3326", roughness: 1 })); bot.position.y = y - .75; world.add(bot);   // 池の底（もぐったときに見える）
  }
}

/* 建物：区画ごと（見えない区画は描かない） */
const BLDU = { t: { value: 0 }, g: { value: -1e4 }, sky: { value: 0 } }, GEO = { t: 0, el: null, last: "" }, EDGEQ = [];
/* 建物の輪郭の線：面の向きが 28° 以上変わる辺と、縁の辺だけ（three の EdgesGeometry より速い、数の鍵の版） */
function bldEdges(geo, cosT = Math.cos(28 * Math.PI / 180)) {
  const P = geo.attributes.position; if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox, q = 1e5 / Math.max(1e-6, bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
  const vid = new Int32Array(P.count), map = new Map(), px = []; let nv = 0;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = (Math.round((x - bb.min.x) * q) * 17179869184) + Math.round((y - bb.min.y) * q) * 131072 + Math.round((z - bb.min.z) * q);   // 1e5 < 2^17：重ならない鍵
    let id = map.get(k); if (id === undefined) { id = nv++; map.set(k, id); px.push(x, y, z); } vid[i] = id; }
  const ix = geo.index ? geo.index.array : null, nT = (ix ? ix.length : P.count) / 3, N = new Float32Array(nT * 3), E = new Map(), out = [];
  for (let t = 0; t < nT; t++) {
    const a = vid[ix ? ix[t * 3] : t * 3], b = vid[ix ? ix[t * 3 + 1] : t * 3 + 1], c = vid[ix ? ix[t * 3 + 2] : t * 3 + 2]; if (a === b || b === c || a === c) continue;
    const ux = px[b * 3] - px[a * 3], uy = px[b * 3 + 1] - px[a * 3 + 1], uz = px[b * 3 + 2] - px[a * 3 + 2], vx = px[c * 3] - px[a * 3], vy = px[c * 3 + 1] - px[a * 3 + 1], vz = px[c * 3 + 2] - px[a * 3 + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); if (l < 1e-12) continue; N[t * 3] = nx / l; N[t * 3 + 1] = ny / l; N[t * 3 + 2] = nz / l;
    for (const [u0, v0] of [[a, b], [b, c], [c, a]]) { const u = Math.min(u0, v0), v = Math.max(u0, v0), k = u * nv + v, pr = E.get(k);
      if (pr === undefined) E.set(k, t); else if (pr >= 0) { if (N[pr * 3] * N[t * 3] + N[pr * 3 + 1] * N[t * 3 + 1] + N[pr * 3 + 2] * N[t * 3 + 2] < cosT) out.push(u, v); E.set(k, -1); } }
  }
  for (const [k, t] of E) if (t >= 0) out.push(Math.floor(k / nv), k % nv);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(px, 3)); g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(out, 1) : new THREE.Uint16BufferAttribute(out, 1)); return g;
}
/* Qualia/sight のヒヨドリ（2026-10-22 合格した自作の 3D・CC管理台帳 M-0860）。使い方を絞る：
   近く＝植え込みにとまる横の姿（やや見下ろす角度だけ。いつも横を向け、2.5 m より寄らない）、遠く＝並木の上を飛ぶ姿（実寸のまま・画面で 120 px 以下のときだけ）。正面・真上・真下から寄って見せない */
const HIYO = { near: null, far: null, loading: false, a: 0, yaw: null, c: null }; QW.HIYO = HIYO;
/* 参道の縁の植え込みの、低木にも下草にも隠れない地面（d＝道のり） */
function surfaceY(x, z) {   // 目に見えている地面の高さ（標高の値より、描いている地面の面が少し高い所がある）。建物・木・草・札は除いて、真上から当てる
  let gy = groundY(x, z); const rc = new THREE.Raycaster(new THREE.Vector3(x, gy + 6, z), new THREE.Vector3(0, -1, 0), 0, 12);
  if (!surfaceY.o || surfaceY.n !== world.children.length) { surfaceY.n = world.children.length; surfaceY.o = []; world.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !BLD.includes(o) && o.material && !o.material.transparent) surfaceY.o.push(o); }); }   // 当てる面の一覧は一度だけ作る
  const objs = surfaceY.o;
  for (const h of rc.intersectObjects(objs, false)) { if (h.point.y < gy + 1.2) { gy = Math.max(gy, h.point.y); break; } }
  return gy; }
function clearSpot(d) { let best = -1, x = 0, z = 0;
  for (let dd = -12; dd <= 12; dd += .5) for (const sd of [1, -1]) for (const lat of [4.5, 4.9]) {
    const q = atD(d + dd), cx = q.x - q.tz * lat * sd, cz = q.z + q.tx * lat * sd; let near = 1e9;
    for (const S of VEG.sp) for (let k = 0; k < S.m; k++) { const ex = S.xs[k * 6] - cx, ez = S.xs[k * 6 + 2] - cz; if (Math.abs(ex) > 3 || Math.abs(ez) > 3) continue; near = Math.min(near, Math.hypot(ex, ez) - S.xs[k * 6 + 3] * (S.s <= 2 || S.s === 7 ? .45 : .25)); }
    for (const t of TREE.list) { const ex = t.x - cx, ez = t.z - cz; if (Math.abs(ex) < 4 && Math.abs(ez) < 4) near = Math.min(near, Math.hypot(ex, ez) - 1.6); }   // 木の根元の盛り上がりも避ける
    const sc = Math.min(near, 2) - Math.abs(dd) * .02; if (sc > best) { best = sc; x = cx; z = cz; } }
  return { x, z }; }
/* ミミズ（2026-10-22 合格・自作の 3D）：近く＝土の上をはう横の姿（真横寄りだけ。4 倍で見せ、札に書く）。1.8〜7 m のときだけ */
const MIMI = { m: null, loading: false, yaw: null, lb: null }; QW.MIMI = MIMI;
function loadMimi() {
  if (MIMI.loading || !D) return; MIMI.loading = true;
  import("./sight/sightModels.js?v=1").then(async ({ loadSight }) => {
    const m = await loadSight("mimizu", { shadow: false }); await (VEG.p || Promise.resolve());
    const sp = D.sight.find(q => q.id === "mimizu"), d = sp ? nearestOnLine(sp.x, sp.z).d : 640, { x, z } = clearSpot(d);
    const gy = surfaceY(x, z);
    m.object.position.set(x, gy + .012, z); m.object.scale.setScalar(4); m.play("crawl", 0, .8);
    const lb = makeLabel(layerNo("sight"), "Qualia/sight", "ミミズ（4 倍で見せています）", GL.sight?.color || "#c9abe0"); lb.position.set(0, .06, 0); lb.scale.set(.16, .04, 1); lb.material.depthTest = false; lb.renderOrder = 9; m.object.add(lb); MIMI.lb = lb;
    m.object.visible = false; world.add(m.object); MIMI.m = m;
  }).catch(e => console.warn("mimizu", e));
}
function stepMimi(dt) {
  if (!MIMI.m) return; const o = MIMI.m.object, cp = camera.position, dx = cp.x - o.position.x, dz = cp.z - o.position.z, dh = Math.hypot(dx, dz), down = Math.atan2(cp.y - o.position.y, dh);
  const show = LAYER.worn.includes("sight") && QW.mode === "walk" && dh > 1.8 && dh < 7 && down < .8; o.visible = show; if (MIMI.lb) MIMI.lb.visible = dh < 4.5;
  if (show) { const ty = Math.atan2(dx, dz) - Math.PI / 2; if (MIMI.yaw === null) MIMI.yaw = ty; let e = ty - MIMI.yaw; e = Math.atan2(Math.sin(e), Math.cos(e)); MIMI.yaw += e * Math.min(1, dt * .8); o.rotation.y = MIMI.yaw; MIMI.m.update(dt); }   // いつも真横を見せる（ゆっくり向きを変える）
}
function loadHiyo() {
  if (HIYO.loading || !D) return; HIYO.loading = true;
  import("./sight/sightModels.js?v=1").then(async ({ loadSight }) => {
    const [n, f] = await Promise.all([loadSight("hiyo", { shadow: false }), loadSight("hiyo", { lod: "far", shadow: false })]);
    const sp = D.sight.find(q => q.id === "hiyo"), d = sp ? nearestOnLine(sp.x, sp.z).d : 499, p = atD(d), side = 7.2;
    let x = p.x - p.tz * side, z = p.z + p.tx * side, top = groundY(x, z) + 1.0; HIYO.c = { x, z, y: groundY(x, z) };
    await (VEG.p || Promise.resolve()); ({ x, z } = clearSpot(d)); top = surfaceY(x, z) + .02;   // とまる所＝参道の縁の植え込みの地面（落ち葉の上で餌をさがす横の姿）
    n.object.position.set(x, top, z); n.object.scale.setScalar(2.5); n.play("perch", 0);   // 見つけやすいよう 2.5 倍（札に書く）
    const lb = makeLabel(layerNo("sight"), "Qualia/sight", "ヒヨドリ（2.5 倍で見せています）", GL.sight?.color || "#c9abe0"); lb.position.set(0, .22, 0); lb.scale.set(.44, .11, 1); lb.material.depthTest = false; lb.renderOrder = 9; n.object.add(lb); HIYO.lb = lb; n.object.visible = false; world.add(n.object);
    f.play("fly", 0, .7); f.object.visible = false; world.add(f.object);
    n.object.traverse(o => { if (o.isMesh) o.renderOrder = 3; }); HIYO.near = n; HIYO.far = f;
  }).catch(e => console.warn("hiyo", e));
}
function stepHiyo(dt) {
  if (!HIYO.near) return;
  const on = LAYER.worn.includes("sight"), cp = camera.position, M = QW.mode;
  const o = HIYO.near.object, dx = cp.x - o.position.x, dz = cp.z - o.position.z, dh = Math.hypot(dx, dz), down = Math.atan2(cp.y - o.position.y, dh);
  const showN = on && M === "walk" && dh > 3 && dh < 30 && down > -.01 && down < .42; if (HIYO.lb) HIYO.lb.visible = dh < 6.5;   // 横から〜見下ろす 24° まで（下から見上げる角度では出さない）
  o.visible = showN;
  if (showN) { const ty = Math.atan2(dx, dz) - Math.PI / 2; if (HIYO.yaw === null) HIYO.yaw = ty; let e = ty - HIYO.yaw; e = Math.atan2(Math.sin(e), Math.cos(e)); HIYO.yaw += e * Math.min(1, dt * 1.5); o.rotation.y = HIYO.yaw; HIYO.near.update(dt); }
  const fo = HIYO.far.object, c = HIYO.c; HIYO.a += dt * .24; const a = HIYO.a, R = 30;
  fo.position.set(c.x + Math.cos(a) * R, c.y + 17 + Math.sin(a * 2.3) * 2.2, c.z + Math.sin(a) * R * 1.6);
  fo.rotation.set(0, Math.atan2(-Math.sin(a) * R, Math.cos(a) * R * 1.6), 0);
  const d = fo.position.distanceTo(cp), px = .275 * innerHeight / (2 * Math.max(.1, d) * Math.tan(camera.fov * Math.PI / 360));
  const showF = on && (M === "walk" || M === "fly") && px < 120 && px > 1.2 && d > 12;
  fo.visible = showF; if (showF) HIYO.far.update(dt);
}
/* アブラコウモリ（2026-10-22 合格した自作の 3D・遠く用だけ）：コウモリの身体に入った夕方の暗さの中で、遠くを飛ぶほかのコウモリ。近くでは見せない（12 m より寄ると消し、画面で 120 px 以下のときだけ） */
const BATS = { list: [], loading: false, c: null, t: 0 }; QW.BATS = BATS; QW.camera = camera;
function stepBats(dt) {
  const on = QW.mode === "sight" && SIGHT.sp?.id === "koumori";
  if (on && !BATS.loading) { BATS.loading = true;
    import("./sight/sightModels.js?v=1").then(({ loadSight }) => Promise.all([0, 1, 2].map(() => loadSight("koumori", { lod: "far", shadow: false })))).then(ms => {
      ms.forEach((m, i) => { m.object.scale.setScalar(5); m.play("fly", 0, .55 + i * .07); m.object.visible = false; world.add(m.object); BATS.list.push({ m, r: 6 + i * 4, w: (.5 + i * .13) * (i % 2 ? -1 : 1), ph: i * 2.1, h: 4 + i * 2.2 });   /* 空を背にして見えるよう、少し上を */ });
    }).catch(e => console.warn("bats", e)); }
  if (!BATS.list.length) return;
  if (!on) { for (const b of BATS.list) b.m.object.visible = false; BATS.c = null; return; }
  const cp = camera.position; camera.getWorldDirection(_v3); _v3.y = 0; _v3.normalize(); const tgt = cp.clone().addScaledVector(_v3, 28); if (!BATS.c) BATS.c = tgt; BATS.c.lerp(tgt, Math.min(1, dt * .6)); BATS.t += dt;   // 群れの輪は、ゆっくりあとを追う
  for (const b of BATS.list) { const a = b.ph + BATS.t * b.w, o = b.m.object;
    o.position.set(BATS.c.x + Math.cos(a) * b.r, BATS.c.y + b.h + Math.sin(BATS.t * 1.3 + b.ph) * 1.2, BATS.c.z + Math.sin(a) * b.r);
    o.rotation.set(0, Math.atan2(-Math.sin(a) * b.w, Math.cos(a) * b.w), 0);
    const d = o.position.distanceTo(cp), px = .2 * 5 * innerHeight / (2 * Math.max(.1, d) * Math.tan(camera.fov * Math.PI / 360));
    o.visible = d > 12 && px < 120; if (o.visible) b.m.update(dt); }
}
function stepEdges() { if (!EDGEQ.length) return; const t0 = performance.now();
  do { const o = EDGEQ.shift(); const ln = new THREE.LineSegments(bldEdges(o.geometry), QW.bldLine); ln.renderOrder = 2; ln.matrixAutoUpdate = false; o.add(ln); } while (EDGEQ.length && performance.now() - t0 < (MOBILE ? 3 : 6)); }
let bldGroup = null; const BLD = [], ROOF = { x0: -680, z0: -1360, cell: 20, nx: 68, nz: 136, h: new Float32Array(68 * 136) };
function roofAt(x, z, r = 1) {   // まわり r 区画の、いちばん高い屋根
  const R = ROOF, c0 = Math.floor((x - R.x0) / R.cell), r0 = Math.floor((z - R.z0) / R.cell); let m = 0;
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const c = c0 + i, rr = r0 + j; if (c >= 0 && rr >= 0 && c < R.nx && rr < R.nz) m = Math.max(m, R.h[rr * R.nx + c]); }
  return m;
}
function buildBuildings(g) {
  // 2026-10-22 本人「建物がキューブ系でよくないので、半透明にして、薄いグラフィックに」→ PLATEAU の形と高さはそのまま、写実の箱をやめて「データの層」として描く：
  // 面はごく薄い色（斜めから見る面ほど少し濃い）、輪郭は細い線、壁に階の線（近くだけ）、ゆっくり上へ抜ける走査の帯。遠いほど薄く。参道の並木・鳥居・社殿は写実のまま
  const U = BLDU;
  const vs = (sh) => { sh.uniforms.uT = U.t; sh.uniforms.uG = U.g; sh.uniforms.uSky = U.sky;   // 霞では色を霞へ寄せず、薄くして消す（データの層は、遠くでは見えなくなるだけ）
    sh.fragmentShader = sh.fragmentShader.replace("#include <fog_fragment>", "#ifdef USE_FOG\n float fgF = smoothstep(fogNear, fogFar, vFogDepth); gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fgF * .25); gl_FragColor.a *= 1. - fgF * .82;\n#endif"); sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;"); };
  const m = new THREE.MeshBasicMaterial({ color: "#d8f3fb", transparent: true, depthWrite: true, fog: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
  m.onBeforeCompile = sh => { vs(sh);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; uniform float uT; uniform float uG; uniform float uSky;")
      .replace("#include <color_fragment>", `#include <color_fragment>
      { vec3 fn = normalize(cross(dFdx(vWp), dFdy(vWp))); float dist = length(vWp - cameraPosition); vec3 vd = (cameraPosition - vWp) / max(dist, 1e-3);
        float fr = pow(1. - abs(dot(fn, vd)), 2.); float roof = step(.6, abs(fn.y)); float nr = 1. - smoothstep(80., 420., dist);
        float fy = (vWp.y - 13.2) / 3.15; float d = abs(fract(fy + .5) - .5); float fl = (1. - roof) * step(.5, fy) * (1. - smoothstep(0., fwidth(fy) * 1.2, d));
        float sy = 12. + mod(uT * 5.5, 78.); float band = exp(-pow((vWp.y - sy) / 1.1, 2.)) * (1. - roof);
        float fade = mix(mix(1., .18, smoothstep(80., 380., dist)), mix(1., .6, smoothstep(140., 760., dist)), uSky);   /* 10-28 夜 5：歩くとき遠くの建物を早めに消す（遠くが白く浮いていた） */
        diffuseColor.rgb = mix(vec3(.25,.35,.43), vec3(.36,.66,.78), fr * .7 + band * .7 + fl * nr * .6) * (roof > .5 ? 1.1 : 1.);
        { float sh = roof > .5 ? 1. : .62 + .38 * abs(dot(fn.xz, normalize(vec2(.6, .8))));   // 10-28 夜 8：歩くときは、データの層を「沈んだ青灰の面＋細い走査線」に描き直す（白く浮かない・面の向きで明暗）
          vec3 wc = vec3(.13, .18, .22) * sh + vec3(.2, .45, .55) * (fl * nr * .7 + band * .5) + vec3(.1, .2, .24) * fr * .5;
          diffuseColor.rgb = mix(wc, diffuseColor.rgb, uSky); }
        diffuseColor.a = (.24 + .14 * fr + roof * .04 + fl * .3 * nr + band * .26) * fade * smoothstep(uG - 2.5, uG - .3, vWp.y) * mix(2.3, .4, uSky); }`);   /* 10-28 夜 4：歩くときは面をさらに淡く（白く浮いて見えていた） */   /* 3D 地図では面をさらに淡く */
  };
  m.customProgramCacheKey = () => "bldGhost3";
  const lm = new THREE.LineBasicMaterial({ color: "#5fcfe9", transparent: true, depthWrite: false, fog: true });
  lm.onBeforeCompile = sh => { vs(sh);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; uniform float uT; uniform float uG; uniform float uSky;")
      .replace("#include <color_fragment>", `#include <color_fragment>
      { float dist = length(vWp - cameraPosition); float sy = 12. + mod(uT * 5.5, 78.); float band = exp(-pow((vWp.y - sy) / 1.6, 2.));
        diffuseColor.a = (mix(.8, .24, smoothstep(30., 700., dist)) + band * .35) * smoothstep(uG - 2.5, uG - .3, vWp.y) * mix(1., .5, uSky);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86,.99,1.), band * .7); }`);
  };
  lm.customProgramCacheKey = () => "bldGhostL2";
  QW.bldMat = m; QW.bldLine = lm; QW.bldGhost = g.scene;
  g.scene.updateMatrixWorld(true);
  g.scene.traverse(o => { if (o.isMesh) { o.material = m; o.geometry.computeBoundingSphere(); o.userData.ws = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); } });
  bldGroup = g.scene; world.add(bldGroup); BLD.length = 0; bldGroup.traverse(o => { if (o.isMesh) BLD.push(o); });
  bldGroup.traverse(o => { if (o.isMesh) { o.renderOrder = 1; o.castShadow = o.receiveShadow = false; } });
  { const cp = camera.position; EDGEQ.length = 0; EDGEQ.push(...BLD.slice().sort((p, r) => p.userData.ws.center.distanceTo(cp) - r.userData.ws.center.distanceTo(cp))); }   // 輪郭の線は、近い区画から、こまごとに少しずつ作る（起動を重くしない）
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
      if (o === bark) barkUV(mat);
      if (o === leaves) { mat.alphaTest = Math.max(mat.alphaTest || 0, .45); mat.transparent = false; mat.side = THREE.DoubleSide; }
      const g2 = o === leaves && MOBILE && sp === "keyaki" ? thinLeaves(geo, 2, 1.3) : geo;   // スマホの近くのケヤキは、葉の札を半分に
      const im = new THREE.InstancedMesh(g2, mat, count[sp] || 1); im.count = 0; im.frustumCulled = false; world.add(im); parts.push(im);
    }
    // 中くらいの距離：幹は遠景の形、葉は札を減らした形
    const fb = g.scene.getObjectByName(base + "_bark") || bark; fb.updateWorldMatrix(true, false);
    const bgeo = toFloat(fb.geometry).applyMatrix4(fb.matrixWorld); bgeo.translate(0, -box.min.y, 0); bgeo.scale(k, k, k);
    const lgeo = thinLeaves(parts[1].geometry, MOBILE ? 5 : 4, MOBILE ? 1.85 : 1.7);
    const lm2 = parts[1].material.clone(); lm2.side = THREE.DoubleSide;
    barkUV(fb.material);
    const mid = [new THREE.InstancedMesh(bgeo, fb.material, count[sp] || 1), new THREE.InstancedMesh(lgeo, lm2, count[sp] || 1)];
    if (sp === "keyaki") TREE.kMid = { bgeo, lgeo, bm: fb.material, lm: lm2, h: SPH[sp] };   // 2026-10-26 3：けやきひろばにも参道と同じケヤキを
    for (const im of mid) { im.count = 0; im.frustumCulled = false; world.add(im); }
    const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * k;
    TREE.protos[sp] = { parts, mid, w, h: SPH[sp] };
  }
  try { buildImpostors(); } catch (e) { console.warn("impostor", e); }
  { const lm = TREE.protos.keyaki?.parts[1]?.material; if (lm?.map && TREE.leafU) { lm.map.wrapS = lm.map.wrapT = THREE.RepeatWrapping; lm.map.needsUpdate = true; TREE.leafU.value = lm.map; } }
  TREE.lastPos.set(1e9, 0, 0); updateTrees(true);
}
/* 2026-10-23 幹の樹皮が縦に引き伸ばされて縞になっていた（採点の指摘）：絵の座標を、幹のまわりの角度と高さから作りなおす（どの太さ・高さでも同じ肌理の大きさ） */
function barkUV(m) {
  if (!m || m.userData.barkUV) return; m.userData.barkUV = true;
  for (const t of [m.map, m.normalMap, m.roughnessMap]) if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; }
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { prev?.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
  { vec2 bu = vec2(atan(position.x, position.z) * .4775, position.y * .55);
#ifdef USE_MAP
    vMapUv = bu;
#endif
#ifdef USE_NORMALMAP
    vNormalMapUv = bu;
#endif
#ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv = bu;
#endif
  }`).replace("#include <common>", "#include <common>\nvarying vec3 vBp; varying vec3 vBn;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvBp = position; vBn = normal;");
    /* 2026-10-29 近景：横へ張る枝で樹皮の絵が筒の向きに引き伸ばされていた→ 色と粗さは枝の面の向きに合わせて三方から貼る（Poly Haven「Japanese Zelkova Bark」CC0 のまま）。欅の肌の灰みを少し戻す */
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vBp; varying vec3 vBn;\nvec4 bTri(sampler2D t){ vec3 w = pow(abs(normalize(vBn)), vec3(4.)); w /= w.x + w.y + w.z + 1e-5; return texture2D(t, vBp.zy * .55) * w.x + texture2D(t, vBp.xz * .55) * w.y + texture2D(t, vBp.xy * .55) * w.z; }")
      .replace("#include <map_fragment>", "#ifdef USE_MAP\n{ vec4 bc = bTri(map); float bl = dot(bc.rgb, vec3(.2126, .7152, .0722)); bc.rgb = mix(bc.rgb, vec3(bl) * vec3(1., .98, .95), .35); diffuseColor *= bc; }\n#endif")
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\nroughnessFactor *= bTri(roughnessMap).g;\n#endif"); };
  m.customProgramCacheKey = () => "barkUV3" + (m.uuid);
  m.needsUpdate = true;
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
/* 2026-10-23 本人「舗装が白くて眩しいので、もっと自然な色に」→ 写真の質感（CC0）はそのまま、色を少し暖かい灰・使い込まれた石へ寄せて明度を下げ、照り返しを抑える */
const ROAD_MATS = { asphalt_dark: ["Asphalt023S", [.95, .93, .9], 1, .8], asphalt_light: ["asphalt_04", [.82, .8, .76], 1, 1.5], sidewalk: ["concrete_pavers_02", [.72, .68, .62], 1, 1], granite_light: ["concrete_pavement", [.74, .7, .64], 1, 1],
  granite_plaza: ["granite_tile_04", [.72, .68, .62], 1, 1], granite_black: ["granite_tile", [1, 1, 1], .92, .7], washed: ["gravel_embedded_concrete", [.78, .74, .68], 1, 1], granite_band: ["PavingStones133", [.76, .72, .66], 1, 1],
  stone: ["japanese_stone_wall", [.84, .8, .74], 1, 1], sand: ["gravelly_sand", [1, 1, 1], 1, .9], roots: ["roots", [.46, .42, .37], 1, 1.2], bed: ["Ground047", [.8, .74, .66], 1, 1], lawn: ["Ground047", [.78, 1.05, .62], 1, 1],
  gravel: ["Gravel023", [.8, .79, .76], 1, 1.2], concrete: ["asphalt_04", [.9, .87, .82], 1, .5], paint: ["Asphalt023S", [1.55, 1.52, 1.45], .8, .4] };
const ROAD_WEATHER = { stone: { moss: 0, grime: .45, lichen: 0, scale: 1.1, bump: .05 }, concrete: { moss: 0, grime: .55, lichen: 0, scale: 1.5, bump: .03 },   // 2026-10-23 本人「石畳の舗装に苔を生やさない」＝舗装の面は苔・地衣（緑のしみ）なし。縁の外の土・植え込みはそのまま
  granite_light: { flat: 1, moss: 0, grime: .4, lichen: 0, scale: 1, bump: .022, rough: .93 }, granite_plaza: { flat: 1, moss: 0, grime: .38, lichen: 0, scale: 1, bump: .022, rough: .93 },
  granite_black: { flat: 1, moss: 0, grime: .3, lichen: 0, scale: 1, bump: .02, rough: .9 }, granite_band: { flat: 1, moss: 0, grime: .4, lichen: 0, scale: 1, bump: .022, rough: .93 },
  asphalt_light: { flat: 1, moss: 0, grime: .6, lichen: 0, scale: .9, bump: .03, rough: .9 },   // 2026-10-28 深夜 3D：参道の中央の舗装が無地の灰に見えないよう、使い込まれた濃淡・細かな凹凸（苔なし）
  sidewalk: { flat: 1, moss: 0, grime: .35, lichen: 0, scale: 1.2, bump: .02 }, washed: { flat: 1, moss: 0, grime: .35, lichen: 0, scale: 1.2, bump: .025 } };
const STRUCT_WEATHER = { stone_new: { moss: .38, grime: .55, lichen: .45 }, granite: { moss: .32, grime: .5, lichen: .4 }, old_lantern: { moss: .55, grime: .65, lichen: .65 },
  old_komainu: { moss: .5, grime: .6, lichen: .6 }, old_hyoseki: { moss: .45, grime: .6, lichen: .55 }, old_shago: { moss: .45, grime: .6, lichen: .55 },
  inscr_hyoseki: { moss: .12, grime: .35, lichen: .18, bump: .02 }, inscr_shago: { moss: .12, grime: .35, lichen: .18, bump: .02 },
  stone_pier: { moss: .6, grime: .6, lichen: .45 }, stonewall: { moss: .6, grime: .55, lichen: .45 } };

/* ---------- 通れない所（2026-10-23 本人「植え込みの中には入れないように」）：植え込み・芝・根もとの土・池・低木・幹・小さな石の物を、0.5 m の格子に塗る ---------- */
let COLL = null; const collInit = () => COLL || (COLL = (() => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of D.cl) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
  x0 -= 90; x1 += 90; z0 -= 90; z1 += 90; const c = .5, nx = Math.ceil((x1 - x0) / c), nz = Math.ceil((z1 - z0) / c);
  return QW.COLL = { x0, z0, c, nx, nz, g: new Uint8Array(nx * nz) }; })());
function collMark(cx, cz) { collInit(); const i = Math.floor((cx - COLL.x0) / COLL.c), j = Math.floor((cz - COLL.z0) / COLL.c); if (i >= 0 && j >= 0 && i < COLL.nx && j < COLL.nz) COLL.g[j * COLL.nx + i] = 1; }
function collDisc(x, z, r) { const c = collInit().c; for (let dz = -r; dz <= r; dz += c) for (let dx = -r; dx <= r; dx += c) if (dx * dx + dz * dz <= r * r) collMark(x + dx, z + dz); }
function collPoly(poly) {   // [[x,z],…] の多角形の中を塗る
  let a = 1e9, b = -1e9, e = 1e9, f = -1e9; for (const [x, z] of poly) { a = Math.min(a, x); b = Math.max(b, x); e = Math.min(e, z); f = Math.max(f, z); }
  const c = collInit().c; for (let z = Math.floor(e / c) * c + c / 2; z < f; z += c) for (let x = Math.floor(a / c) * c + c / 2; x < b; x += c) { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } if (ins) collMark(x, z); }
}
function collMesh(o) {   // 面の三角形を真上から塗る（縁から 0.15 m 内側だけ＝縁石の上は歩ける）
  const g = o.geometry, P = g.attributes.position, I = g.index, n = I ? I.count : P.count, v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], c = collInit().c;
  for (let t = 0; t < n; t += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, I ? I.getX(t + k) : t + k).applyMatrix4(o.matrixWorld);
    const [A, B, C] = v, ar = (B.x - A.x) * (C.z - A.z) - (C.x - A.x) * (B.z - A.z); if (Math.abs(ar) < 1e-6) continue;
    const mnx = Math.min(A.x, B.x, C.x), mxx = Math.max(A.x, B.x, C.x), mnz = Math.min(A.z, B.z, C.z), mxz = Math.max(A.z, B.z, C.z);
    for (let z = Math.floor(mnz / c) * c + c / 2; z < mxz; z += c) for (let x = Math.floor(mnx / c) * c + c / 2; x < mxx; x += c) {
      const w0 = ((B.x - x) * (C.z - z) - (C.x - x) * (B.z - z)) / ar, w1 = ((C.x - x) * (A.z - z) - (A.x - x) * (C.z - z)) / ar, w2 = 1 - w0 - w1;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) collMark(x, z);
    }
  }
}
function blocked(x, z) { if (!COLL) return false; if (PARK.w && inPark(x, z)) return false; if (AREAS?.walkable(x, z) && nearestOnLine(x, z).dist > 40) return false;   /* エリアの公道（参道から 40 m より外）は、参道の植え込みの格子にかけない */ const i = Math.floor((x - COLL.x0) / COLL.c), j = Math.floor((z - COLL.z0) / COLL.c); return i >= 0 && j >= 0 && i < COLL.nx && j < COLL.nz && COLL.g[j * COLL.nx + i] === 1; }
function collShrink() {   // 塗った所の縁を 1 こまぶん削る（細い縁石の上・植え込みの角で引っかからない）。植え込みどうしの間の通り道は残る
  collInit(); const { g, nx, nz } = COLL, h = g.slice();
  for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 1; i++) { const k = j * nx + i; if (h[k] && (!h[k - 1] || !h[k + 1] || !h[k - nx] || !h[k + nx])) g[k] = 2; }
  for (let k = 0; k < g.length; k++) if (g[k] === 2) g[k] = 0;
}
let lateP = null; const STONES = [];
function loadLate() {
  if (lateP) return lateP;
  setTimeout(loadHiyo, 2500); setTimeout(loadMimi, 4000);   // ヒヨドリの 3D は、歩きはじめて少ししてから（起動を重くしない）
  const road = glb("web/road.glb").then(g => {
    const mats = {};
    for (const [k, [t, c, r, n]] of Object.entries(ROAD_MATS)) { mats[k] = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/" + t + "_c5.webp"), normalMap: MOBILE ? null : tex(BASE + "tex/" + t + "_n5.webp", false), normalScale: new THREE.Vector2(n, -n), color: new THREE.Color(...c), roughness: r, metalness: 0, envMapIntensity: .3 }); if (ROAD_WEATHER[k]) weather(mats[k], ROAD_WEATHER[k]); }
    for (const m of Object.values(mats)) { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp; }   // ROAD_STENCIL
    g.scene.traverse(o => { if (o.isMesh) { const k = o.name.split("|")[0]; if (mats[k]) o.material = mats[k]; o.renderOrder = -1; o.userData.stone = k === "stone"; pickables.push(o); } });
    roadGroup = g.scene; world.add(roadGroup); roadGroup.updateMatrixWorld(true);
    roadGroup.traverse(o => { if (o.isMesh && /^(bed|lawn|roots)\|/.test(o.name)) collMesh(o); }); collShrink(); for (const p of D.ponds) collPoly(p.poly); for (const t of D.trees) collDisc(t[0], t[2], Math.max(.35, .32 * t[4]));
    roadGroup.traverse(o => { if (o.isMesh && o.userData.stone) { o.geometry.computeBoundingSphere(); o.userData.ws = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); STONES.push(o); } });
  });
  const WMAT = {};
  const st = glb(BASE + "structures.glb").then(g => {
    structGroup = new THREE.Group(); world.add(structGroup);
    for (const s of D.structs) {
      const src = g.scene.getObjectByName(s.m); if (!src) continue;
      const o = src.clone(true); o.position.set(s.p[0], s.p[1], s.p[2]); o.rotation.set(0, s.r, 0); o.scale.setScalar(1);
      o.traverse(n => { if (n.isMesh && n.material) { n.material.envMapIntensity = .6;
        if (n.material.name === "black") { n.material = n.material.clone(); n.material.color.set("#1c1a19"); n.material.roughness = .38; n.material.metalness = .05; n.material.envMapIntensity = 1.25; }   // 根巻と笠木の黒：漆のような艶（平らな黒い箱に見えないように）
        else if (STRUCT_WEATHER[n.material.name]) { const nm = n.material.name; n.material = WMAT[nm] ||= weather(n.material.clone(), STRUCT_WEATHER[nm]); } } });
      o.name = s.id; structGroup.add(o);
      if (/^(ishidoro|komainu|hyoseki|shagohi|choishi|mokutoro)/.test(s.id)) collDisc(s.p[0], s.p[2], /^ishidoro|^mokutoro/.test(s.id) ? 1.0 : .8);   // 燈籠・狛犬・碑・丁石は通れない（鳥居と楼門はくぐれる）
      if (QW.mode === "sky" && /^torii_|^romon$|^shinkyo$/.test(s.id)) o.visible = false;
    }
    try { buildBigStructs(g.scene); } catch (e) { console.warn("bigstructs", e); }
  });
  const tr = Promise.all([glb(BASE + "trees.glb"), glb(BASE + "keyaki.glb").catch(() => null)]).then(buildTrees);
  loadVeg();
  lateP = Promise.allSettled([road, st, tr]).then(r => { try { renderer.compileAsync(scene, camera).catch(() => { }); } catch { } return r; });   // 降りる前に、道・木・構造物の描き方を用意しておく（初めて見えたときに止まらない）
  return lateP;
}


/* ---------- 植え込みの低木と下草（2026-10-22 本人「もっと低木や雑草などを生やしてください」）----------
   位置は _dev/20261020_lite/build_veg.mjs が決めた veg.bin（参道の植え込み・並木の根元・境内の縁。現地の一株ずつではなく、よくある植栽と下草の模式の配置）。
   葉の絵 veg.webp は ambientCG（Leaf001・LeafSet014、CC0）の葉の写真を組んだもの（build_surface.py）。
   種：0 ツツジ・1 アオキ・2 ヤツデ・3 ササ・4 チヂミザサ・5 ドクダミ・6 細い草。近くだけ描き、遠くの縁では小さくして消す。 */
const VEG = { sp: [], last: new THREE.Vector3(1e9, 0, 0), t: 0, group: null, time: { value: 0 } };
const VEG_UV = [[0, .5, .5, 1], [.5, .5, 1, 1], [0, 0, .5, .5], [.5, .25, .75, .5], [.75, .25, 1, .5], [.5, 0, .75, .25], [.75, 0, 1, .25]];
function vegGeo(kind) {
  const P = [], N = [], U = [], C = [], I = [];
  const r = (() => { let s = 7 + kind * 131; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const quad = (c, ax, ay, w, h, uv, nrm, bottom = false, dark = .55) => {   // c＝中心（bottom なら下の辺の中）、ax・ay＝横と縦の向き
    const b = P.length / 3, [u0, v0, u1, v1] = uv;
    const oy = bottom ? 0 : -h / 2;
    for (const [sx, sy, u, v] of [[-.5, 0, u0, v0], [.5, 0, u1, v0], [.5, 1, u1, v1], [-.5, 1, u0, v1]]) {
      const yy = oy + sy * h;
      const p = [c[0] + ax[0] * sx * w + ay[0] * yy, c[1] + ax[1] * sx * w + ay[1] * yy, c[2] + ax[2] * sx * w + ay[2] * yy];
      P.push(...p); const n = nrm(p); N.push(...n); U.push(u, v);
      const g = Math.min(1, dark + (1 - dark) * Math.min(1, Math.max(0, p[1]) / .6)); C.push(g, g, g);   // 株元ほど暗く（葉の重なりの陰）
    }
    I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  const out = (cx, cy, cz, upw = .6) => p => { const v = [p[0] - cx, p[1] - cy + upw, p[2] - cz], l = Math.hypot(...v) || 1; return v.map(a => a / l); };
  const uv = VEG_UV[kind];
  const norm = v => { const l = Math.hypot(...v) || 1; return v.map(a => a / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  if (kind === 0) {   // ツツジ：刈り込んだ丸い株（芯の半球＋外側の葉の札）
    const Rx = .55, Ry = .42;
    const cu = [.145, .531, .355, .707];   // 葉の絵の、株の下の方の混んだ所
    const seg = 9, ring = 4, b0 = P.length / 3;
    for (let j = 0; j <= ring; j++) for (let i = 0; i <= seg; i++) {
      const ph = j / ring * Math.PI / 2, th = i / seg * Math.PI * 2, x = Math.cos(th) * Math.cos(ph) * Rx * .86, y = Math.sin(ph) * Ry * .86, z = Math.sin(th) * Math.cos(ph) * Rx * .86;
      P.push(x, y, z); N.push(...norm([x, y + .3, z])); U.push(cu[0] + (x / Rx * .5 + .5) * (cu[2] - cu[0]), cu[1] + (z / Rx * .5 + .5) * (cu[3] - cu[1])); const g = .45 + .55 * (y / Ry); C.push(g, g, g);
    }
    for (let j = 0; j < ring; j++) for (let i = 0; i < seg; i++) { const a = b0 + j * (seg + 1) + i, b = a + seg + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
    for (let k = 0; k < 20; k++) {
      const th = r() * Math.PI * 2, ph = Math.asin(Math.min(.98, r() * .95)), n = [Math.cos(th) * Math.cos(ph), Math.sin(ph), Math.sin(th) * Math.cos(ph)];
      const c = [n[0] * Rx * .92, n[1] * Ry * .92 + .02, n[2] * Rx * .92];
      let ax = norm(cross([0, 1, 0], n)); if (!isFinite(ax[0]) || Math.hypot(...ax) < .1) ax = [1, 0, 0];
      const ay = norm(cross(n, ax)); const tw = (r() - .5) * .8, ca = Math.cos(tw), sa = Math.sin(tw);
      const ax2 = ax.map((v, i) => v * ca + ay[i] * sa), ay2 = ay.map((v, i) => v * ca - ax[i] * sa);
      quad(c, ax2, ay2, .46, .46, uv, out(0, 0, 0, .3), false, .5);
    }
  } else if (kind === 7) {   // ツツジ（刈り込みの浅い株）：枝葉の札が立ち上がる、輪郭の崩れた株
    for (let k = 0; k < 7; k++) { const th = k / 7 * Math.PI * 2 + r() * .6, tl = .3 + r() * .4, ax = [Math.cos(th + Math.PI / 2), 0, Math.sin(th + Math.PI / 2)], ay = norm([Math.cos(th) * tl, 1, Math.sin(th) * tl]);
      quad([Math.cos(th) * .12, 0, Math.sin(th) * .12], ax, ay, 1.05 + r() * .35, 1.0 + r() * .35, VEG_UV[0], out(0, 0, 0, .25), true, .45); }
    for (let k = 0; k < 4; k++) { const th = r() * 6.28, ax = [Math.cos(th), 0, Math.sin(th)], ay = norm([-Math.sin(th) * .5, .3, Math.cos(th) * .5]); quad([Math.cos(th) * .2, .3 + r() * .12, Math.sin(th) * .2], ax, ay, .75, .75, VEG_UV[0], () => [0, 1, 0], false, .8); }
  } else if (kind === 1) {   // アオキ：株立ちの、立ち上がった枝葉
    for (let k = 0; k < 7; k++) { const th = k / 7 * Math.PI * 2 + r() * .4, tl = .18 + r() * .25, ax = [Math.cos(th + Math.PI / 2), 0, Math.sin(th + Math.PI / 2)], ay = norm([Math.cos(th) * tl, 1, Math.sin(th) * tl]);
      quad([Math.cos(th) * .1, 0, Math.sin(th) * .1], ax, ay, 1.15, 1.35, uv, out(0, 0, 0, .2), true, .4); }
    for (let k = 0; k < 3; k++) { const th = r() * 6.28, ax = [Math.cos(th), 0, Math.sin(th)], ay = norm([-Math.sin(th) * .4, .25, Math.cos(th) * .4]); quad([0, 1.15, 0], ax, ay, .9, .9, uv, () => [0, 1, 0], false, .8); }
  } else if (kind === 2) {   // ヤツデ：茎の先に、手のひら形の大きな葉が横に開く
    const stem = [VEG_UV[1][0] + .245, VEG_UV[1][1] + .005, VEG_UV[1][0] + .255, VEG_UV[1][1] + .08];
    for (let k = 0; k < 8; k++) {
      const th = k / 8 * Math.PI * 2 + r() * .5, h = .38 + r() * .85, rr = .2 + r() * .32, c = [Math.cos(th) * rr, h, Math.sin(th) * rr];
      quad([c[0] * .25, 0, c[2] * .25], [-Math.sin(th), 0, Math.cos(th)], norm([c[0] * .75, h, c[2] * .75]), .022, Math.hypot(c[0] * .75, h, c[2] * .75) * .96, stem, () => [0, 1, 0], true, .4);
      const tilt = .2 + r() * .3, ay = norm([Math.cos(th) * Math.cos(tilt), -Math.sin(tilt), Math.sin(th) * Math.cos(tilt)]), ax = [-Math.sin(th), 0, Math.cos(th)];
      const w = .8 + r() * .25; quad(c, ax, ay, w, w, uv, () => norm([Math.cos(th) * .3, 1, Math.sin(th) * .3]), false, .85);
    }
  } else {   // 下草：交わる札（ササ・チヂミザサ・ドクダミ・草）
    const dims = { 3: [.75, .62, 3], 4: [.62, .38, 3], 5: [.42, .3, 3], 6: [.5, .46, 3] }[kind];
    for (let k = 0; k < dims[2]; k++) { const th = k / dims[2] * Math.PI + r() * .3, lean = (r() - .5) * .3, ax = [Math.cos(th), 0, Math.sin(th)], ay = norm([-Math.sin(th) * lean, 1, Math.cos(th) * lean]);
      quad([0, 0, 0], ax, ay, dims[0], dims[1], uv, p => norm([p[0] * .6, 1, p[2] * .6]), true, .5); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  return g;
}
function loadVeg() {
  if (VEG.p) return VEG.p;
  return VEG.p = Promise.all([fetch(BASE + "veg.bin?v=" + VER).then(r => r.arrayBuffer()), texP(BASE + "tex/veg.webp?v=" + VER)]).then(([buf, vt]) => {
    const n = new Uint32Array(buf, 0, 1)[0], pos = new Int16Array(buf, 4, n * 3), at = new Uint8Array(buf, 4 + n * 6, n * 4);
    vt.anisotropy = MOBILE ? 2 : 4;
    const mat = new THREE.MeshStandardMaterial({ map: vt, vertexColors: true, alphaTest: .5, side: THREE.DoubleSide, roughness: .82, metalness: 0, envMapIntensity: .3, alphaToCoverage: !MOBILE });
    mat.onBeforeCompile = sh => {
      sh.uniforms.vTime = VEG.time;
      if (!MOBILE && !RM) sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float vTime;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\n{ vec3 ip = instanceMatrix[3].xyz; float sw = sin(vTime * 1.6 + ip.x * .7 + ip.z * .9) + .5 * sin(vTime * 2.9 + ip.z * 1.3); transformed.xz += vec2(sw, sw * .6) * .025 * max(transformed.y, 0.); }");
      sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\n  normal = normalize(vNormal);")   // 札の裏も表と同じ明るさに
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * .07;");   // 葉を透ける光（ごく弱く）
    };
    mat.customProgramCacheKey = () => "veg" + (MOBILE ? 1 : 0) + (RM ? 1 : 0);
    VEG.group = new THREE.Group(); VEG.group.name = "veg"; world.add(VEG.group);
    const lists = Array.from({ length: 8 }, () => []);
    for (let i = 0; i < n; i++) { const s0 = at[i * 4]; lists[s0 === 0 ? 7 : s0].push(i); }   // ツツジは、枝葉が株元から立ち上がる株の形（2026-10-22 丸いドームの形はやめた）
    const tint = [[.82, .9, .8], [.9, .95, .9], [.9, .95, .9], [.66, .7, .56], [.66, .72, .58], [.74, .74, .74], [.84, .84, .72], [.8, .88, .78]];
    for (let s = 0; s < 8; s++) {
      const L = lists[s], m = L.length; if (!m) continue;
      const xs = new Float32Array(m * 6);
      L.forEach((i, k) => { xs[k * 6] = pos[i * 3] / 10; xs[k * 6 + 1] = pos[i * 3 + 1] / 100; xs[k * 6 + 2] = pos[i * 3 + 2] / 10; xs[k * 6 + 3] = .4 + at[i * 4 + 1] / 255 * 1.6; xs[k * 6 + 4] = at[i * 4 + 2] / 256 * Math.PI * 2; xs[k * 6 + 5] = at[i * 4 + 3] / 255; });
      const big = s <= 2 || s === 7, R = big ? (MOBILE ? 72 : 140) : (MOBILE ? 28 : 55);
      const cap = Math.min(m, big ? (MOBILE ? 700 : 2600) : (MOBILE ? 1100 : 4200));
      const im = new THREE.InstancedMesh(vegGeo(s), mat, cap); im.count = 0; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const col = new THREE.Color(); for (let k = 0; k < cap; k++) im.setColorAt(k, col.setRGB(1, 1, 1));
      VEG.group.add(im);
      VEG.sp.push({ s, xs, m, R, cap, im, tint: tint[s] });
    }
    for (const S of VEG.sp) if (S.s <= 2 || S.s === 7) for (let k = 0; k < S.m; k++) if (S.xs[k * 6 + 3] > .9) collDisc(S.xs[k * 6], S.xs[k * 6 + 2], S.xs[k * 6 + 3] * .3);   // 大きな株（低木）は通れない。下草は踏める
    VEG.last.set(1e9, 0, 0); updateVeg(true);
  }).catch(e => console.warn("veg", e));
}
function updateVeg(force = false) {
  if (!VEG.group) return;
  const on = QW.mode === "walk" || QW.mode === "sight" || QW.mode === "fly" || QW.mode === "descend";
  VEG.group.visible = on; if (!on) return;
  const cp = camera.position;
  if (!force && Math.hypot(cp.x - VEG.last.x, cp.z - VEG.last.z) < 3) return;
  VEG.last.copy(cp);
  const col = new THREE.Color();
  for (const S of VEG.sp) {
    const { xs, m, R, cap, im, tint } = S, R2 = R * R, arr = im.instanceMatrix.array, ca = im.instanceColor.array; let c = 0;
    for (let k = 0; k < m && c < cap; k++) {
      const dx = xs[k * 6] - cp.x, dz = xs[k * 6 + 2] - cp.z, d2 = dx * dx + dz * dz; if (d2 > R2) continue;
      const d = Math.sqrt(d2), f = d > R * .75 ? Math.max(0, (R - d) / (R * .25)) : 1, sc = xs[k * 6 + 3] * (.25 + .75 * f), a = xs[k * 6 + 4], co = Math.cos(a) * sc, si = Math.sin(a) * sc, o = c * 16;
      const st = .8 + .45 * ((xs[k * 6 + 5] * 5.3) % 1), lean = S.s >= 3 && S.s <= 6 ? (((xs[k * 6 + 5] * 9.1) % 1) - .5) * .5 : 0, cl = Math.cos(lean), sl = Math.sin(lean);   // 下草は株ごとに少し傾ける
      arr[o] = co * st; arr[o + 1] = 0; arr[o + 2] = -si * st; arr[o + 3] = 0; const sy = sc * (.62 + .76 * ((xs[k * 6 + 5] * 13.7) % 1)); arr[o + 4] = si / sc * sl * sy; arr[o + 5] = cl * sy; arr[o + 6] = co / sc * sl * sy; arr[o + 7] = 0; arr[o + 8] = si * cl; arr[o + 9] = -sl * sc; arr[o + 10] = co * cl; arr[o + 11] = 0;
      arr[o + 12] = xs[k * 6]; arr[o + 13] = xs[k * 6 + 1] - .03; arr[o + 14] = xs[k * 6 + 2]; arr[o + 15] = 1;
      const v = xs[k * 6 + 5], b = .78 + v * .36; col.setRGB(tint[0] * b * (.94 + .12 * ((v * 7.3) % 1)), tint[1] * b, tint[2] * b * (.92 + .16 * ((v * 3.1) % 1)));
      ca[c * 3] = col.r; ca[c * 3 + 1] = col.g; ca[c * 3 + 2] = col.b;
      c++;
    }
    im.count = c; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  }
}
QW.veg = () => VEG.sp.map(S => [S.s, S.im.count, S.m]); QW.VEG = VEG;


/* ---------- 3D 地図（上空）：始める場所・道と地名・等高線・鳥居の 3D・いまの地点 ---------- */
const START = { pins: [], sel: -1, labels: [] };
const MAP = { group: null, labels: [], big: [], here: null, data: null };
const PICK = "#ffb648";   // 選んでいる場所の色（地図のしるし・ボタンと同じ）
/* 2026-10-28 本人：3D 地図の案内（共通部品 kit/mapguide.js）＝透けた細い線と淡い面で道筋と主な場所を示す。エリア分けは描かない。
   始める場所は、1 回目に押す＝その場所の説明と、アプリ自身の 3D を目の高さで描いた眺め／同じ所をもう 1 回＝そこから歩く */
let MGUIDE = null, EYEV = null;
const escH = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function startInfo(x, z, name) {   /* その場所の説明＝いちばん近い Qualia の語り（典拠つき）の初めの 2 文 */
  const nm = String(name).replace(/（.*?）|\s/g, ""); let b = null, bd = 1e9;
  for (const L of LAYER.objs) { const o = L.o; if (!o || o.x == null || !(o.lines || []).length) continue; const s0 = (o.src || []).find(q => !/OpenStreetMap/i.test(q.t || "")); if (!s0) continue;   /* 地図の点（OSM）だけを典拠にした語りは、説明に使わない */ let d = Math.hypot(o.x - x, o.z - z); const t = String(o.title || "").replace(/（.*?）|\s/g, ""); if (t && (nm.includes(t) || t.includes(nm))) d -= 150; if (d < bd) { bd = d; b = o; } }
  if (!b || bd > 110) return {};
  const text = b.lines.slice(0, 2).map(l => l.t).join(""), ss = (b.src || []).filter((q, k, A) => !/OpenStreetMap/i.test(q.t || "") && A.findIndex(r => r.t === q.t) === k);
  return { text, src: ss.map(q => q.u ? `<a href="${escH(q.u)}" target="_blank" rel="noopener">${escH(q.t)}</a>` : escH(q.t)).join("／") };
}
function startPreview(eyeAt) {
  return { info: i => { const p = START.sp?.pins[i]; return p ? startInfo(p.it.x, p.it.z, p.it.name) : {}; },
    draw: (cv, i) => { const e = eyeAt(i); if (!e) return; EYEV ||= makeEyeView({ THREE, renderer, scene, camera, hide: eyeHide, prep: eyePrep }); EYEV.draw(cv, e);
      eyeLoad?.(); for (const ms of [1200, 3500]) setTimeout(() => { if (START.sp?.sel === i && cv.isConnected) EYEV.draw(cv, e); }, ms); } };   /* 近くの木や道が届いたら描き直す */
}
const yawTo = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));
function eyeHide() { return [MGUIDE?.group, START.sp?.group, MAP.group, pathLine, ...world.children.filter(o => o.isInstancedMesh && o.material?.isShaderMaterial && o.material.uniforms?.uT)]; }   /* 地図の大きさの Qualia の印は、目の高さの眺めには描かない */
const eyeLoad = () => loadLate();
function eyePrep(cam) {   /* 歩くときと同じ見え方に：空・霧・木の細かさ（目の位置で）・地図の層は隠す */
  const bg = scene.background, f = { c: scene.fog.color.clone(), n: scene.fog.near, f: scene.fog.far }, m = QW.mode, cp = camera.position.clone();
  applyFog(FOGS.walk()); if (QW.skyTex) scene.background = QW.skyTex; showMapLayer(false);
  QW.mode = "walk"; camera.position.copy(cam.position); updateTrees(true);
  return () => { QW.mode = m; camera.position.copy(cp); updateTrees(true); showMapLayer(m === "sky"); scene.background = bg; scene.fog.color.copy(f.c); scene.fog.near = f.n; scene.fog.far = f.f; }; }
function eyeAt(i) { const n = D.starts.length; if (i < n) { const s = D.starts[i], a = atD(s.d); return { x: a.x, y: groundY(a.x, a.z) + EYE, z: a.z, yaw: yawAlong(Math.min(s.d + 6, 1985)) }; }
  const e = START.extra[i - n]; if (!e || e.kind === "here") return null; return { x: e.x, y: groundY(e.x, e.z) + EYE, z: e.z, yaw: yawTo(e.x, e.z, 0, e.z) }; }
function buildStarts() {
  /* 2026-10-27 本人：始める場所は GUI の一覧でなく、地図の上の 3D の印と明朝の名札（共通部品 startpins.js）。名前は省略しない。
     東口・西口（町の地図の層）と「現在地から歩く」も地図の上の印に。位置の許可は押したときだけ */
  const items = D.starts.map(s => ({ name: s.name, x: s.x, z: s.z, kind: s.icon || "" }));
  START.extra = [{ name: "大宮駅 東口", x: -420, z: 30, kind: "area", zone: "higashi" }, { name: "大宮駅 西口", x: -700, z: 110, kind: "area", zone: "nishi" }, { name: "現在地から歩く", x: MOBILE ? 300 : 520, z: MOBILE ? 960 : 900, kind: "here" }];   // 現在地は地図の端の印（自分の位置の形）。押したときだけ位置を使い、位置が出たらその場所へ印が移る   // 「現在地から歩く」は地図の場所に置かず、地図の縁の方位の印（#skyHere）に（その場所にいると読ませない）   // 東口・西口は、地図の上の町の札（大宮駅（東口）・（西口））から選ぶ
  START.sp = makeStartPins({ THREE, parent: world, camera, groundY, mobile: MOBILE, items: [...items, ...START.extra],
    note: { text: "氷川参道は、一の鳥居から神社まで、およそ 2 km。", x: 260, z: 560 }, goBtn: $("#goDown"), preview: startPreview(eyeAt),
    onSelect: i => { if (i < D.starts.length) { START.sel = i; return; } const e = START.extra[i - D.starts.length]; if (e.kind === "here" && $("#skyHere")?.getAttribute("aria-pressed") !== "true") { unlockAudio(); HERE.toggle(); } },
    onGo: i => { unlockAudio(); if (i < D.starts.length) return descendTo(i); const e = START.extra[i - D.starts.length]; if (e.zone) { const Z = AREAS?.byId?.[e.zone]; if (Z) areaDescend(Z); } else if ($("#skyHere")?.getAttribute("aria-pressed") !== "true") HERE.toggle(); } });
  MGUIDE = makeMapGuide({ THREE, parent: world, groundY, routes: [D.cl.map(p => [p[0], p[2]])], places: D.starts.map(s => ({ x: s.x, z: s.z, r: 22 })) }); MGUIDE.show(QW.mode === "sky");
  START.sp.show(QW.mode === "sky"); { const h = $("#skyHere"); if (h) h.style.display = "none"; }
}
function selectStart(i) {
  START.sel = i; /* 印の選択（札と 2 回目で歩く）は、人が印を押したときだけ（startpins）。ここでは動かさない */
  START.pins.forEach((p, k) => { const on = k === i; p.col.material.color.set(on ? PICK : "#9bdcf0"); p.col.material.opacity = on ? 1 : .2; p.ring.material.color.set(on ? PICK : "#9bdcf0"); p.ring.material.opacity = on ? 1 : .35; p.ring.scale.setScalar(on ? 1.8 : .8); p.head.material.color.set(on ? PICK : "#7f9aa6"); p.head.scale.set(on ? 1.3 : .75, on ? 1.95 : 1.1, on ? 1.3 : .75); });   // 選んでいる所は濃く、ほかは薄く
  document.querySelectorAll(".stBtn").forEach((b, k) => b.setAttribute("aria-pressed", k === i ? "true" : "false"));
  START.labels.forEach((l, k) => l.classList.toggle("on", k === i));
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
  for (const s of D.structs) if (/^torii_|^romon$|^shinkyo$/.test(s.id) && !D.starts.some(t => t.name === s.name)) {   /* 始める場所の札と同じ名前は出さない（二つの札が重なって「二」が「三」に見えた） */ const e = document.createElement("div"); e.className = "mapLabel k-torii"; e.textContent = s.name; box.appendChild(e); MAP.labels.push({ e, p: new THREE.Vector3(s.p[0], s.p[1] + (s.id === "romon" ? 120 : 90), s.p[2]), big: true }); }
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
  const now = performance.now(); if (!MAP.av || now - MAP.avT > 500) { MAP.avT = now; const c = $("#skyUI .card")?.getBoundingClientRect(), l = $("#lstack")?.getBoundingClientRect(); MAP.av = { cy: c && c.height ? c.top - 6 : H, lx: l && l.width ? l.right + 4 : 0, ly: l && l.height ? l.bottom : 0 }; }   // 視野の札（始める場所・層の目盛り）の下に、地図の名前を重ねない
  for (const L of all) {
    _v3.copy(L.p).project(camera); const x = (_v3.x + 1) / 2 * W; let y = (1 - _v3.y) / 2 * H; if (L === MAP.hereLabel && _v3.z < 1) { y = Math.max(130, Math.min(H - 60, y)); }   // 「いま」の札は上の端で切らない
    const lw = (L.w ||= L.e.offsetWidth || 80) / 2; let ok = _v3.z < 1 && x > (MOBILE ? 72 : -40) && x + lw * 2 + 14 < W && x > 4 &&   /* 2026-10-27：画面の端で切れる地名は出さない */ y > 70 && y < H - 40 && y < MAP.av.cy && !(x < MAP.av.lx && y < MAP.av.ly + 10);
    if (ok && START.rects) for (const r of START.rects) if (Math.abs(r[0] - x) < (MOBILE ? 100 : 110) && Math.abs(r[1] - y) < 40) { ok = false; break; }   // 始める場所の名札を優先（地区の札は重ねない）
    if (ok && L !== MAP.hereLabel) for (const q of placed) if (Math.abs(q[0] - x) < (MOBILE ? 96 : 70) && Math.abs(q[1] - y) < (MOBILE ? 22 : 18)) { ok = false; break; }   // 重なる名札は出さない（大きな鳥居の名札も）
    if (!ok) { if (L.vis !== false) { L.e.style.display = "none"; L.vis = false; } continue; }
    placed.push([x, y]); if (L.vis !== true) { L.e.style.display = ""; L.vis = true; }
    L.e.style.transform = `translate(${x | 0}px,${y | 0}px)`;
  }
}

/* ---------- カメラと動き ---------- */
// CAM.yaw＝体（歩く）の向き、CAM.look＝見回す向き（体からの差）、CAM.pitch＝上下。カメラの向き＝yaw＋look
const CAM = { yaw: 0, look: 0, pitch: 0, pos: new THREE.Vector3(), vy: 0, lastDrag: 0 };
const SKY = { az: .3, el: .98, dist: MOBILE ? 2550 : 2150, tx: MOBILE ? -330 : -160, tz: MOBILE ? -10 : 150, tAz: .3, tEl: .98, tDist: MOBILE ? 2550 : 2150 };   // 2026-10-27：一の鳥居から楼門まで・西口まで、始めの一画面に収める
const EYE = 1.55;
let tween = null, TWFOG = null;
// どの見方も、空と霞は同じ色。切りかえのあいだも、霞の近さ・遠さだけが連続して変わる（黒い画面にしない）
const FOGS = { sky: () => ({ c: FOG_SKY, n: 1700, f: 4200 }), walk: () => ({ c: FOG_SKY, n: 180, f: 690 })   /* 2026-10-29 遠景：歩くときは描く距離が 700 m なので、霞をその手前で満たす（旧 220〜1500 m＝700 m で景色が霞の途中で切れていた） */, fly: () => ({ c: FOG_SKY, n: 260, f: MOBILE ? 1100 : 1700 }), mid: () => ({ c: FOG_SKY, n: 400, f: 2600 }) };
function applyFog(f) { scene.fog.color.copy(f.c); scene.fog.near = f.n; scene.fog.far = f.f; }
function setMode(m) {
  const prev = QW.mode; QW.mode = m; document.body.dataset.mode = m;
  if ((m === "sky" || m === "fly" || m === "sight") && QW.HERE?.on) QW.HERE.stop();   // 現在地で歩くのは、歩いているあいだだけ
  const walk = m === "walk", fly = m === "fly", sky = m === "sky", sight = m === "sight";
  if (m !== "descend" && !sight) applyFog(walk ? FOGS.walk() : fly ? FOGS.fly() : FOGS.sky());
  camera.near = walk || sight ? .03 : 1; camera.far = walk ? 700 : sight ? 1400 : 9000; camera.updateProjectionMatrix();
  if (pathLine) { pathLine.visible = fly;   /* 3D 地図では共通の案内（MGUIDE）が道筋を示す */ pathLine.material.depthTest = !sky; }
  if (START.group) START.group.visible = sky;
  MGUIDE?.show(sky); BLDU.sky.value = sky ? 1 : 0; if (QW.farGM) QW.farGM.userData.gf.gfDim.value = sky ? 1 : 0;   /* 地図の案内は 3D 地図のときだけ（歩くときに淡い面が視界を覆わない） */
  showMapLayer(sky);
  if (QW.skyTex && !sight) scene.background = QW.skyTex;   // 3D 地図は暗い地（電脳の地図）
  
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
  if (!tween) return false; tween.t = Math.max(tween.t + Math.min(dt, .05) / tween.dur, (performance.now() - (tween.s ??= performance.now())) / 1000 / tween.dur);   /* 10-28 夜 8：こまが遅い端末でも、動く時間を実時間で決める */ const k = ease(Math.min(1, tween.t));
  if (tween.fog) { const [a, b] = tween.fog; _fa.c.copy(a.c).lerp(b.c, k); _fa.n = a.n + (b.n - a.n) * k; _fa.f = a.f + (b.f - a.f) * k; applyFog(_fa); }
  camera.position.lerpVectors(tween.p0, tween.p1, k); camera.position.y += Math.sin(k * Math.PI) * tween.arc;   // 弧を描いて動く（まっすぐ落ちない）
  camera.quaternion.slerpQuaternions(tween.q0, tween.q1, Math.min(1, k * 1.1));
  if (tween.t >= 1) { const d = tween.done; tween = null; d?.(); }
  return true;
}
function yawAlong(d) { const a = atD(d); return Math.atan2(-a.tx, -a.tz); }   // 道のりの増える向き（北の社へ）を向く
function descendTo(i, at) {
  const s = D.starts[i]; if (!s) return;
  hideSkyUI(); loadLate();
  const a = at ? { x: at.x, z: at.z } : atD(s.d), yaw = yawAlong(Math.min((at ? at.d : s.d) + 6, 1985)), y = groundY(a.x, a.z) + EYE;   // at＝現在地（GPS）の位置
  setMode("descend");
  // まず斜め上空へ寄り、そこから目の高さへ（道と木が届くまでは、斜め上空でゆっくり回りながら待つ）
  const mid = new THREE.Vector3(a.x + Math.sin(yaw) * 140, y + 120, a.z + Math.cos(yaw) * 140);
  TWFOG = [FOGS.sky(), FOGS.mid()];
  tweenTo(mid, yaw, -.62, .7, () => {   // 2026-10-26 3：降りる演出を短く（歩きはじめまで 5 秒以内）

    let ready = false; const wait = setTimeout(() => { if (!ready) toast("参道の道と木を読み込んでいます。"); }, 500);
    WAITORBIT = { c: new THREE.Vector3(a.x, y, a.z), r: 140 * Math.SQRT2 / Math.SQRT2, yaw, t: 0 };
    lateP.then(() => { ready = true; clearTimeout(wait); WAITORBIT = null; TWFOG = [FOGS.mid(), FOGS.walk()]; tweenTo(new THREE.Vector3(a.x, y, a.z), yaw, -.04, .9, () => { CAM.pos.set(a.x, y, a.z); CAM.yaw = yaw; CAM.look = 0; CAM.pitch = -.04; enterWalk(); }); });
  });
}
let WAITORBIT = null;
function stepWaitOrbit(dt) {   // 待つあいだも画は止めない
  const W = WAITORBIT; if (!W || tween) return; W.t += dt; const a = W.yaw + W.t * .05;
  camera.position.set(W.c.x + Math.sin(a) * 140, W.c.y + 120, W.c.z + Math.cos(a) * 140); camera.lookAt(W.c.x, W.c.y, W.c.z);
}
QW.startAt = i => { if (QW.mode === "sky") descendTo(i ?? 0); };

/* 現在地で歩く（GPS・2026-10-24 戻した）：いまいる所から、その場の Qualium を歩く。位置はこの端末の中だけで使い、送らず、残さない */
function descendToXZ(x, z) {
  const n = nearestOnLine(x, z), d = Math.max(-20, Math.min(1985, n.d)), s = START.sel;
  const i = D.starts.reduce((b, t, k) => Math.abs(t.d - d) < Math.abs(D.starts[b].d - d) ? k : b, 0); if (s < 0) selectStart(i);
  descendTo(i, { x, z, d });
}
const HERE = makeHereWalk({
  name: "氷川参道",
  toXZ: (lat, lon) => [(lon - D.origin[0]) * 111320 * Math.cos(D.origin[1] * Math.PI / 180), -(lat - D.origin[1]) * 110574],
  place(x, z) {
    { const k = START.sp?.pins.findIndex(p => p.it.kind === "here"); if (k >= 0) START.sp.movePin(k, x, z); }   // 位置が出たら、現在地の印をその場所へ
    const [x0, x1, z0, z1] = D.extent, n = nearestOnLine(x, z);
    if (x < x0 || x > x1 || z < z0 || z > z1 || n.dist > 250) return { ok: false, dist: n.dist };
    const p = { x, z }; corridorClamp(p);
    if (blocked(p.x, p.z)) { const a = atD(Math.max(-20, Math.min(1985, n.d))); p.x = a.x; p.z = a.z; }   // 植え込みや池の上なら、道の上へ
    return { ok: true, dist: n.dist, x: p.x, z: p.z, off: n.dist > 16 };
  },
  first(x, z, f) {
    if (f.off) toast(`参道から ${Math.round(f.dist)} m ほど離れています。いちばん近い参道の上から歩きます。`);
    if (QW.mode === "walk") { hereMove(x, z, f, true); return; }
    if (QW.mode === "fly" || QW.mode === "sight") { if (QW.mode === "sight") exitSight(true); hideFlyUI(); }
    descendToXZ(x, z);
  },
  move: (x, z, f) => hereMove(x, z, f),
  toast: t => toast(t),
  sync(on) { for (const id of ["#hereBtn", "#skyHere"]) { const b = $(id); if (b) { b.setAttribute("aria-pressed", String(on)); b.textContent = on ? (id === "#hereBtn" ? "現在地で歩く：入" : "現在地を探しています…") : (id === "#hereBtn" ? "現在地で歩く" : "現在地から歩く"); } } }
});
function hereMove(x, z, f, jump) {
    if (QW.mode !== "walk") return;
    WALK.auto = false; syncAutoBtn(); if (WALK.ring) WALK.ring.visible = false;
    if (jump || Math.hypot(x - CAM.pos.x, z - CAM.pos.z) > 30) { CAM.pos.x = x; CAM.pos.z = z; WALK.goal = null; return; }   // 遠くへ跳んだときは、その場へ
    WALK.goal = new THREE.Vector3(x, 0, z);
}
QW.HERE = HERE;

/* 歩く：体は道に沿って進み、目は自由に見回せる */
const WALK = { goal: null, keys: new Set(), hold: false, auto: false, speed: 2.4, vk: .35, ring: null, moving: false }; QW.WALK = WALK;
function enterWalk() {
  setMode("walk"); showWalkUI();
  aoiArrive(); loadKasane(); setTimeout(loadPark, 1200);
  if (!sessionStorageGet("hk_tip2")) { toast(MOBILE ? "なぞると見回せます。地面に触れるとその向きへ数歩、「歩きつづける」で参道を進みます。" : "ドラッグで見回し、W で見ている方へ、「歩きつづける」で参道に沿って進みます。地面を押すとその向きへ数歩すすみます。"); sessionStorageSet("hk_tip2", 1); }
}
/* ---------- 大宮公園の歩ける道（2026-10-26 本人「大宮公園も Qualium に入れてください」）
   park.json（_dev/20261026_omiya/build_park.py・OSM の園路）を起動のあとに読む。園路の帯の中は参道の帯の外でも歩ける。
   地面は DEM の外（z < −1350）も、園の中だけ芝と土の模式の面でつなぐ。池＝舟遊池の輪郭（OSM）。 */
const PARK = { w: null, p: null }; QW.PARK = PARK; QW.inPark = (x, z) => inPark(x, z);
function inPark(x, z) {
  const W = PARK.w; if (!W) return false;
  for (const w of W) { const r = w[0] + .3, b = w.b; if (x < b[0] - r || x > b[2] + r || z < b[1] - r || z > b[3] + r) continue;
    for (let i = 1; i + 3 < w.length; i += 2) { const ax = w[i], az = w[i + 1], dx = w[i + 2] - ax, dz = w[i + 3] - az, l2 = dx * dx + dz * dz || 1, t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2));
      if ((ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2 < r * r) return true; } }
  return false;
}
/* 2026-10-26 2（本人「公園の景色が模式的」）：芝と園路に、①大小二つの縮尺で同じ絵を混ぜて、くり返しの模様を消す ②数十 m の明るさと色のむら（日なた・踏まれて薄い所・落ち葉）③芝は遠くで少し青みを抜く */
function parkMacro(m, amt, lawn) {
  const lit = tex(BASE + "tex/litter.webp?v=" + VER), soil = lawn ? tex(BASE + "tex/Ground047_c5.webp") : null;
  m.onBeforeCompile = sh => {
    sh.uniforms.uLit = { value: lit }; if (soil) sh.uniforms.uSoil = { value: soil };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vPw;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvPw=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vPw; uniform sampler2D uLit;" + (soil ? " uniform sampler2D uSoil;" : "") + "\nfloat pH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float pN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(pH(i),pH(i+vec2(1,0)),f.x),mix(pH(i+vec2(0,1)),pH(i+vec2(1,1)),f.x),f.y);}")
      .replace("#include <map_fragment>", `#include <map_fragment>
{ vec2 p=vPw.xz; ${lawn ? "vec3 g2=texture2D(map,mat2(.8,-.6,.6,.8)*p*.29+.37).rgb; diffuseColor.rgb*=mix(vec3(1.),g2/max(dot(g2,vec3(.333)),.05),.45); float bp=pN(p*.009+2.7); diffuseColor.rgb*=mix(vec3(.74,.86,.62),vec3(1.16,1.08,.86),bp);" : ""} vec3 big=texture2D(map,p*.031+.17).rgb; diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*big/max(dot(big,vec3(.333)),.05)*.5,.45);
  float n=pN(p*.045)*.6+pN(p*.13)*.4, n2=pN(p*.021+7.3);
  diffuseColor.rgb*=mix(1.,.72+n*.56,${amt.toFixed(2)});
  vec3 lt=texture2D(uLit,p*.21).rgb; float lf=smoothstep(.55,.85,n2); diffuseColor.rgb=mix(diffuseColor.rgb,lt*vec3(.8,.72,.6),lf*${lawn ? ".12" : ".55"}*${amt.toFixed(2)});
  ${soil ? "vec3 so=texture2D(uSoil,p*.18).rgb*vec3(.86,.8,.7); float worn=smoothstep(.7,.88,pN(p*.07+3.1)); diffuseColor.rgb=mix(diffuseColor.rgb,so,worn*.12); float dd=length(vPw-cameraPosition); float l0=dot(diffuseColor.rgb,vec3(.333)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(l0)*vec3(1.02,1.,.9),smoothstep(40.,160.,dd)*.35);" : ""} }`);
  };
  m.customProgramCacheKey = () => "parkMacro" + (lawn ? "L" : "P");
}
function loadPark() {
  if (PARK.p) return PARK.p;
  return PARK.p = fetch(BASE + "park.json?v=20261028t").then(r => r.json()).then(J => {
    for (const w of J.w) { let b = [1e9, 1e9, -1e9, -1e9]; for (let i = 1; i < w.length; i += 2) { b[0] = Math.min(b[0], w[i]); b[1] = Math.min(b[1], w[i + 1]); b[2] = Math.max(b[2], w[i]); b[3] = Math.max(b[3], w[i + 1]); } w.b = b; }
    PARK.w = J.w;
    const G = new THREE.Group(); G.name = "park";
    // 園路の帯（土の面）
    const pos = [], uv = [];
    for (const w of J.w) { const hw = w[0];
      for (let i = 1; i + 3 < w.length; i += 2) { const ax = w[i], az = w[i + 1], bx = w[i + 2], bz = w[i + 3], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * hw, nz = dx / l * hw;
        const P = [[ax + nx, az + nz], [ax - nx, az - nz], [bx - nx, bz - nz], [bx + nx, bz + nz]].map(([x, z]) => [x, groundY(x, z) + .12, z]);
        for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...P[k]); uv.push(P[k][0] / 3, P[k][2] / 3); } } }
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); rg.computeVertexNormals();
    const rm = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/gravelly_sand_c5.webp"), normalMap: tex(BASE + "tex/gravelly_sand_n5.webp", false), normalScale: new THREE.Vector2(1.3, 1.3), color: 0xc9bca2, roughness: .96, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    parkMacro(rm, .55);   // 2026-10-26 2：園路の砂利も、くり返しの模様が見えないよう大きなむらを重ねる
    { const rmM = new THREE.Mesh(rg, rm); rmM.renderOrder = -1; G.add(rmM); }
    // DEM の外の園の地面（芝の模式）。DEM の中は今の地形のまま
    const [gx0, gz0, CS, GX, GZ, GM] = J.g, gp = [], gu = [], gi = [];   // 公園の輪郭の中の 10 m 区画だけ（本殿より北）
    for (let j = 0; j <= GZ; j++) for (let i = 0; i <= GX; i++) { const x = gx0 + i * CS, z = gz0 + j * CS; gp.push(x, groundY(x, z) + (z > -1350 ? .06 : -.02), z); gu.push(x / 2.4, z / 2.4); }
    for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) { if (GM[j * GX + i] !== "1") continue; const a = j * (GX + 1) + i; gi.push(a, a + GX + 1, a + 1, a + 1, a + GX + 1, a + GX + 2); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3)); gg.setAttribute("uv", new THREE.Float32BufferAttribute(gu, 2)); gg.setIndex(gi); gg.computeVertexNormals();
    const lm = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/Grass004_c5.webp"), normalMap: tex(BASE + "tex/Grass004_n5.webp", false), normalScale: new THREE.Vector2(1, 1), color: 0xd6e2c2, roughness: 1, metalness: 0 });   // 2026-10-26 3：泥と草のまだら → 芝を主に（踏まれた土と落ち葉は控えめに）
    parkMacro(lm, 1, true); { const lmM = new THREE.Mesh(gg, lm); lmM.renderOrder = -1; G.add(lmM); }
    // 2026-10-26 3（採点「公園の灰色の板」＝地形の空中写真の池と広場が、芝の上に出ていた）：芝・園路・池を先に描いて印を付け、印のある画素には地形を描かない（参道の道と同じ）
    for (const m of [lm, rm]) { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp; }
    // 舟遊池（OSM の輪郭）
    const pd = J.pond, sh = new THREE.Shape(); for (let i = 0; i < pd.length; i += 2) i ? sh.lineTo(pd[i], -pd[i + 1]) : sh.moveTo(pd[i], -pd[i + 1]);
    const pg = new THREE.ShapeGeometry(sh); pg.rotateX(-Math.PI / 2); let py = 0, pn = 0; for (let i = 0; i < pd.length; i += 2) { py += groundY(pd[i], pd[i + 1]); pn++; } py /= pn; pg.translate(0, py + .18, 0);   // 2026-10-26 3：芝より上に水面（芝の下に隠れていた）
    // 2026-10-26 3（採点「公園の灰色の板」＝池の面が空を白く映して板に見えた）：水を暗い緑の深みに・岸ぞいを浅く明るく・さざ波の細かな法線（シェーダ）
    const wm = new THREE.MeshStandardMaterial({ color: 0x1c2a26, roughness: .32, metalness: 0, envMapIntensity: .12, transparent: true, opacity: .96, fog: false });
    wm.onBeforeCompile = sh => { sh.uniforms.uT = PARK.uT = { value: 0 };
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWw;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWw=(modelMatrix*vec4(transformed,1.)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWw; uniform float uT;")
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n{ vec2 p=vWw.xz; float a=sin(p.x*1.7+uT*1.3)*cos(p.y*1.3-uT*.9)+.5*sin(p.x*4.1-p.y*3.3+uT*2.1); vec3 pn=normalize(vec3(.06*cos(p.x*1.7+uT*1.3)+.04*cos(p.x*4.1-p.y*3.3),1.,.06*sin(p.y*1.3-uT*.9))); normal=normalize(normal+(viewMatrix*vec4(pn-vec3(0,1,0),0.)).xyz*.3); }")
        .replace("#include <map_fragment>", "#include <map_fragment>\n{ float d=length(vWw-cameraPosition); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.10,.15,.13),smoothstep(10.,80.,d)); }")
        .replace("#include <dithering_fragment>", "#include <dithering_fragment>\n{ vec3 V=normalize(cameraPosition-vWw); float rp=.5+.5*sin(vWw.x*1.7+uT*1.3)*cos(vWw.z*1.3-uT*.9), rp2=.5+.5*sin(vWw.x*5.3-vWw.z*4.1+uT*2.3); float fr=pow(1.-max(V.y,0.),3.); vec3 deep=vec3(.05,.08,.075), sky=mix(vec3(.55,.62,.68),vec3(.36,.48,.62),clamp(V.y*3.,0.,1.)); vec3 refl=mix(sky,vec3(.12,.17,.13),smoothstep(.0,.06,V.y)*.0+.0); float m=clamp(fr*.75,0.,1.);   /* 採点：さざ波の縞が格子に見えた → 映り込みだけ */ gl_FragColor.rgb=mix(deep,refl,m); }"); };
    wm.customProgramCacheKey = () => "pondWater1";
    { // 岸（池のふちに 1.4 m の土の帯。芝と水面の継ぎ目を見せない・CC0 ambientCG Ground054）
      const sp = [], su = [], se = []; const n = pd.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = pd[i * 2], az = pd[i * 2 + 1], bx = pd[j * 2], bz = pd[j * 2 + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, wv = .5 + .9 * (.5 + .5 * Math.sin(i * .73) * Math.cos(i * .31)), nx = -dz / l * wv, nz = dx / l * wv;
        const P = [[ax - nx, az - nz], [ax + nx * 1.6, az + nz * 1.6], [bx + nx * 1.6, bz + nz * 1.6], [bx - nx, bz - nz]].map(([x, z]) => [x, py + .16, z]); const E = [0, 1, 1, 0]; for (const k of [0, 1, 2, 0, 2, 3]) { sp.push(...P[k]); su.push(P[k][0] / 2.5, P[k][2] / 2.5); se.push(E[k]); } }
      const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute("uv", new THREE.Float32BufferAttribute(su, 2)); sg.setAttribute("aE", new THREE.Float32BufferAttribute(se, 1)); sg.computeVertexNormals();
      const smt = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/Ground054_c5.webp"), normalMap: tex(BASE + "tex/Ground054_n5.webp", false), color: 0x7d6e58, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      smt.transparent = true; smt.depthWrite = false; smt.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aE; varying float vE; varying vec2 vSp;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvE=aE; vSp=(modelMatrix*vec4(position,1.)).xz;"); sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vE; varying vec2 vSp;").replace("#include <dithering_fragment>", "#include <dithering_fragment>\n{ float n=fract(sin(dot(floor(vSp*2.),vec2(12.9,78.2)))*43758.5); gl_FragColor.a*=1.-smoothstep(.6,1.05,vE+n*.25); }"); }; smt.customProgramCacheKey = () => "shoreFade"; /* 岸の外側を芝へ溶かす */ smt.stencilWrite = false; smt.stencilRef = 1; smt.stencilFunc = THREE.AlwaysStencilFunc; smt.stencilZPass = THREE.ReplaceStencilOp; const sm = new THREE.Mesh(sg, smt); sm.renderOrder = -1; G.add(sm); }
    wm.stencilWrite = true; wm.stencilRef = 1; wm.stencilFunc = THREE.AlwaysStencilFunc; wm.stencilZPass = THREE.ReplaceStencilOp; wm.transparent = false; { const pm = new THREE.Mesh(pg, wm); pm.renderOrder = -1; G.add(pm); }
    world.add(G); PARK.g = G; for (const m of G.children) pickables.push(m);
  }).catch(e => console.warn("park", e));
}
function corridorClamp(p, prev = _pv) {
  if (PARK.w && inPark(p.x, p.z)) return;   // 大宮公園の園路の上は、参道の帯の外でも歩ける
  if (AREAS?.walkable(p.x, p.z)) return;   // 2026-10-26：7 つのエリアの公道の上も歩ける（区画ごとにあとから読む・areas.js）
  const n = nearestOnLine(p.x, p.z), lim = n.d > 1878 ? 70 : n.d < -20 ? 30 : 13;
  if (n.dist > lim && AREAS && prev && AREAS.walkable(prev.x, prev.z)) {   // 道の外へは出ない：道の縁に沿ってすべる
    if (AREAS.walkable(p.x, prev.z)) p.z = prev.z; else if (AREAS.walkable(prev.x, p.z)) p.x = prev.x; else { p.x = prev.x; p.z = prev.z; }
    return;
  }
  if (AREAS && n.dist > 120 && prev) { p.x = prev.x; p.z = prev.z; return; }   // 参道から遠い所では、参道へ引き戻さない（区画の読み込み中・失敗のときは、その場にとどまる）
  if (n.dist > lim) { const a = atD(n.d), dx = p.x - a.x, dz = p.z - a.z, l = Math.hypot(dx, dz) || 1; p.x = a.x + dx / l * lim; p.z = a.z + dz / l * lim; }
  if (n.d > 2010) { const a = atD(2010); p.x += (a.x - p.x) * .2; p.z += (a.z - p.z) * .2; }
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const _pv = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _eu = new THREE.Euler(0, 0, 0, "YXZ");
function stepWalk(dt, eye = EYE, speed = WALK.speed, bob = 0) {
  const K = WALK.keys; _pv.copy(CAM.pos);
  const fwd = K.has("w") || K.has("arrowup") || WALK.hold, back = K.has("s") || K.has("arrowdown");
  if (K.has("a") || K.has("arrowleft")) CAM.yaw += dt * 1.5; if (K.has("d") || K.has("arrowright")) CAM.yaw -= dt * 1.5;
  const intent = (K.has("w") || K.has("arrowup") || WALK.hold || K.has("s") || K.has("arrowdown") || WALK.goal || WALK.auto); WALK.vk = intent ? Math.min(1, (WALK.vk || .35) + dt * 1.6) : .35;   /* 2026-10-27 本人「移動を速く」→ 1.35→2.4 m/s（約 1.8 倍）。歩きはじめは約 0.4 秒でなめらかに上げる（酔わない） */
  const sp = speed * WALK.vk * (K.has("shift") ? 1.6 : 1);
  let moving = false;
  if (fwd || back) {   // 見ている方へ：体が目の向きへ回りこむ
    WALK.goal = null; if (WALK.ring) WALK.ring.visible = false;
    if (fwd) { const k = Math.min(1, dt * 3.2); CAM.yaw += CAM.look * k; CAM.look -= CAM.look * k; }
    _f.set(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw)); CAM.pos.addScaledVector(_f, (fwd ? 1 : -.6) * sp * dt); moving = true;
  } else if (WALK.goal) {
    const dx = WALK.goal.x - CAM.pos.x, dz = WALK.goal.z - CAM.pos.z, l = Math.hypot(dx, dz);
    if (l < .25) { WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; }
    else {   // 着く手前で、ゆっくり止まる
      const st = Math.min(l, sp * dt * Math.min(1, .35 + l / 1.6)); CAM.pos.x += dx / l * st; CAM.pos.z += dz / l * st; moving = true;
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
  if (moving && !GYRO.on && QW.mode === "walk" && performance.now() - CAM.lastDrag > 3500) CAM.look -= wrap(CAM.look) * Math.min(1, dt * .5);
  CAM.look = wrap(CAM.look);
  corridorClamp(CAM.pos);
  if (moving && blocked(CAM.pos.x, CAM.pos.z) && !blocked(_pv.x, _pv.z)) {   // 通れない所の手前で止まる。斜めに当たったときは、縁に沿ってすべる
    if (!blocked(CAM.pos.x, _pv.z)) CAM.pos.z = _pv.z; else if (!blocked(_pv.x, CAM.pos.z)) CAM.pos.x = _pv.x; else { CAM.pos.x = _pv.x; CAM.pos.z = _pv.z; }
    if (WALK.goal && Math.hypot(CAM.pos.x - _pv.x, CAM.pos.z - _pv.z) < 1e-3) { WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; }
  }
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
function syncGyroBtn() { const b = $("#gyroBtn"); if (b) { b.setAttribute("aria-pressed", String(GYRO.on)); b.textContent = GYRO.on ? "見回す：入" : "見回す"; b.title = "端末の向きで見回す"; } }
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
  if (QW.mode === "fly") FLY.drag = { dx: 0, dy: 0 };   // 生きものの身体では、ドラッグは見回すだけ（勝手に曲がらない）
});
canvas.addEventListener("pointermove", e => {
  if (ptr.pts.has(e.pointerId)) ptr.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.pinch && ptr.pts.size === 2) { const [a, b] = [...ptr.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); SKY.tDist = Math.min(4400, Math.max(380, ptr.pinch.dist * ptr.pinch.d / d)); return; }
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
canvas.addEventListener("wheel", e => { if (QW.mode === "sky") { SKY.tDist = Math.min(4400, Math.max(380, SKY.tDist * (1 + e.deltaY * .0012))); e.preventDefault(); } }, { passive: false });
addEventListener("keydown", e => { if (e.target.closest?.("input,textarea")) return; const k = e.key.toLowerCase(); WALK.keys.add(k); if (k === "escape") { if (!$("#panel").hidden) hidePanel(); } if (k === " " && QW.mode === "walk") { WALK.auto = !WALK.auto; syncAutoBtn(); e.preventDefault(); } if (k === " " && QW.mode === "sight" && SIGHT.sp?.move === "echo") { echoNow(); e.preventDefault(); } });
addEventListener("keyup", e => WALK.keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => WALK.keys.clear());

const STEP = 3.5;   // 押して進む一度の距離（m）
const ray = new THREE.Raycaster(), _v2 = new THREE.Vector2(), _v3 = new THREE.Vector3();
function tap(x, y) {
  if (QW.mode === "sky") {   // 地図の点を選ぶ
    if (START.sp) { const k = START.sp.pick(x, y); if (k >= 0) START.sp.select(k); return; }
    let best = -1, bd = 46 * 46;
    START.pins.forEach((p, i) => { for (const h of [p.head.position, p.ring.position]) { _v3.copy(h).project(camera); const sx = (_v3.x + 1) / 2 * innerWidth, sy = (1 - _v3.y) / 2 * innerHeight, d = (sx - x) ** 2 + (sy - y) ** 2; if (_v3.z < 1 && d < bd) { bd = d; best = i; } } });
    if (best >= 0) selectStart(best); return;
  }
  if (QW.mode !== "walk" && QW.mode !== "sight") return;
  if (QW.mode === "walk" && KASA.herd?.pickView(x, y)) return;   // 空中の 3D の窓に触れたら閉じる
  if (QW.mode === "walk" && KASA.herd) { const k = KASA.herd.pick(x, y); if (k) { touchKasane(k); return; } }   // かさねっこに触れる
  if (QW.mode === "walk") { for (const h of AREA.herds) { if (h.pickView(x, y)) return; const k = h.pick(x, y); if (k) { touchKasane(k); return; } } const L = pickAreaMark(x, y); if (L) { openObj(L); return; } }   // エリアのかさねっこと地点
  if (QW.mode === "walk" && YO.y && YO.y.pick(x, y, renderer.domElement)) return;   // 依代に触れる
  const o = pickObj(x, y); if (o) { openObj(o); return; }
  if (QW.mode !== "walk") return;
  // 2026-10-23 本人「押した位置からは方向だけを読み取り、一度に進む距離は一定の距離を超えないように」＝押した向きへ、最大 STEP m だけ進んで止まる
  _v2.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(_v2, camera); ray.far = 60;
  const hit = ray.intersectObjects(pickables.filter(m => m.visible !== false), false)[0];
  let dx, dz; if (hit) { dx = hit.point.x - CAM.pos.x; dz = hit.point.z - CAM.pos.z; } else { dx = ray.ray.direction.x; dz = ray.ray.direction.z; }
  const l = Math.hypot(dx, dz); if (l < 1e-3) return;
  const step = Math.min(STEP, hit ? l : STEP), g = new THREE.Vector3(CAM.pos.x + dx / l * step, 0, CAM.pos.z + dz / l * step);
  if (AREAS?.walkable(CAM.pos.x, CAM.pos.z)) for (let k = 0; k < 14 && !AREAS.walkable(g.x, g.z) && !(PARK.w && inPark(g.x, g.z)) && nearestOnLine(g.x, g.z).dist > 13; k++) { g.x -= dx / l * .25; g.z -= dz / l * .25; }   // エリアの道の外を押したら、道の縁まで
  corridorClamp(g, CAM.pos); for (let k = 0; k < 12 && blocked(g.x, g.z); k++) { g.x -= dx / l * .3; g.z -= dz / l * .3; }   // 植え込みの中を押したら、その手前まで
  if (Math.hypot(g.x - CAM.pos.x, g.z - CAM.pos.z) < .3) { toast("その先は植え込みです。通れません。"); return; }
  WALK.goal = g; showGoalRing(g);
}
function showGoalRing(p) {
  if (!WALK.ring) { const g = new THREE.RingGeometry(.28, .34, 40); g.rotateX(-Math.PI / 2); WALK.ring = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: "#9bdcf0", transparent: true, opacity: .85, depthWrite: false })); world.add(WALK.ring); }
  WALK.ring.position.set(p.x, groundY(p.x, p.z) + .04, p.z); WALK.ring.visible = true; WALK.ringT = 0;
}

/* ---------- Qualia Layer：層を重ねる（記録の 9 層と、Qualia/sight・Qualia/sound） ---------- */
let ALL = [], GL = {};
const LAYER = { worn: [], objs: [], ripple: null, rippleR: 0, wear: null, thumbs: null };
/* 2026-10-23 本人「sight, touch, sound, nature, culture です」→ 層は 5 つ。Qualia/sho は sound の中、Qualia/rakugo と歴史は culture の中（中身はそのまま・どの層で重ねるかだけを付け替える） */
const PARENT = { sho: "sound", rakugo: "culture", history: "culture" };
const top5 = id => PARENT[id] || id;
const COLOR5 = { sight: "#c9abe0", touch: "#f0d19d", sound: "#8fb6dc", nature: "#88b68f", culture: "#e79592" };   // 2026-10-23 本人「案１０で採用」：層の 5 色＝案 10（体の色：藤鼠 #a59fc3・砥粉 #d6c09b・藍鉄 #3a4360・老竹 #6c8d71・小豆 #864e4c）の、夜の地の HUD の線と字の列。sight と sound は夜の地で色相が近かったので、HUD の色だけ紫と青へ少し離した（体の色は変えない）
const SUBNAME = { sho: "sho", rakugo: "rakugo", history: "history" };
const LEAD5 = {
  sound: "参道の音（葉ずれ・鳥と蟬の声・玉砂利・池の水）と、上原光瑛の書（Qualia/sho）。書に近づくと、音が鳴る",
  culture: "参道の暮らし・祭礼と暦・街道と宿場・鳥居と石・地名・災害と変わり目、そしてその場所にちなんだ噺（Qualia/rakugo）",
};
function layerNo(id) { return ALL.findIndex(l => l.id === top5(id)) + 1; }
/* 2026-10-24 本人「Qualia/sound を増やす・音の体験を増やす」：並木の葉ずれ（再現音）と、参道を横切る車道の車（再現音）の地点を足す。どちらも録音ではなく、その場で組み立てる模式 */
function extraSounds() {
  if (D.sound.some(s => s.id === "x_leaf1")) return;
  const ll = (x, z) => [+(D.origin[0] + x / (111320 * Math.cos(D.origin[1] * Math.PI / 180))).toFixed(7), +(D.origin[1] - z / 110574).toFixed(7)];
  const side = (d, off) => { const a = atD(d); return { x: a.x - a.tz * off, z: a.z + a.tx * off }; };
  [150, 620, 1200, 1700].forEach((d, i) => { const p = side(d, i % 2 ? 5.5 : -5.5); D.sound.push({ id: "x_leaf" + (i + 1), kind: "leaves", r: 24, title: "並木の葉ずれ", era: "いま", x: p.x, z: p.z, y: groundY(p.x, p.z), ll: ll(p.x, p.z),
    label: "再現音（並木の葉ずれを、風の音の粒から組み立てた音。録音ではありません）", how: "風が枝を渡るときの葉ずれを、細かな音の粒の重なりとして、その場で組み立てています。近づくと聞こえ、離れると消えます。", lines: [], src: [] }); });
  for (const sc of D.sec) if (sc.prof === "X" && /交差/.test(sc.name)) { const d = (sc.d0 + sc.d1) / 2, p = side(d, 9), road = sc.name.replace(/との交差$/, "");
    D.sound.push({ id: "x_car_" + sc.key, kind: "cars", r: 0, ar: 48, every: 7, title: `${road}の車`, era: "いま", x: p.x, z: p.z, y: groundY(p.x, p.z), ll: ll(p.x, p.z),
      label: "再現音（交差する車道を行き交う車を、風を切る音から組み立てた模式。台数とタイミングは模式）", how: `参道を横切る${road}の車が、近づいて遠ざかる音を、その場で組み立てています。実際の台数ではありません。`, lines: [], src: [] }); }
  SW.zones = D.sound.filter(s => s.kind === "cars").map(s => ({ id: s.id, x: s.x, z: s.z, r: s.ar, every: s.every, label: s.label, it: s }));
}
function buildObjs() {
  extraSounds();
  const rec = Object.fromEntries(D.layers.map(l => [l.id, l])), q = Object.fromEntries(QLAYERS.map(l => [l.id, l]));
  // 下から 01：記録の層（culture・nature）の上に、五感の層（sound・touch・sight）を重ねる。上から読むと sight・touch・sound・nature・culture
  ALL = [{ ...rec.culture, lead: LEAD5.culture }, { ...rec.nature }, { ...q.sound, lead: LEAD5.sound }, q.touch, q.sight];
  ALL = ALL.map(l => ({ ...l, color: COLOR5[l.id] || l.color })); GL = Object.fromEntries(ALL.map(l => [l.id, l]));
  for (const [sub, par] of Object.entries(PARENT)) { const b = rec[sub] || q[sub] || { id: sub }; GL[sub] = { ...b, color: GL[par].color, name: `${GL[par].name} ／ ${SUBNAME[sub]}` }; }
  for (const s of D.sound) if (s.y == null) s.y = groundY(s.x, s.z);   // 2026-10-26 3：エリアの音の地点は標高を持たない（地形から読む）
  const list = [...D.objs, ...D.sound.map(s => ({ id: s.id, x: s.x, y: s.y, z: s.z, ll: s.ll, layer: "sound", title: s.title, h: 2.0, lines: [], snd: s })), ...D.touch.map(t => ({ id: t.id, x: t.x, y: t.y, z: t.z, ll: t.ll, layer: "touch", title: t.title, h: 1.25, lines: [], tch: t })), ...(D.sho || []).map(t => ({ id: t.id, x: t.x, y: t.y, z: t.z, ll: t.ll, layer: "sho", title: t.title, h: .7, lines: [], sho: t })), ...(D.rakugo || []).map(t => ({ id: t.id, x: t.x, y: t.y, z: t.z, ll: t.ll, layer: "rakugo", title: t.title, h: 1.9, lines: [], rk: t }))];
  for (const o of list) {
    const L0 = GL[o.layer]; if (!L0) continue;
    const m = makeMarker(o.sub || o.layer, L0.color, o.h, MOBILE);   // 形は細かい分類（樹木・鳥居と石…）、色はまとめた層の色
    m.root.position.set(o.x, o.y, o.z); m.root.visible = false; m.root.name = o.id;
    for (const c of m.glyph.children) c.visible = false; m.root.remove(m.beam); m.root.remove(m.base); m.faces = [];   // 2026-10-23 夜：線の印は描かず、かさねっこの形の結晶（qmarks.js）で描く
    world.add(m.root); LAYER.objs.push({ o, ...m, k: 0, show: 0, open: 0, label: null });
  }
  // はじめから、すべての層を重ねておく（2026-10-22 本人「デフォルトで全て on に」）。外すのは見る人が選んだときだけ
  LAYER.worn = ALL.map(l => l.id); for (const L of LAYER.objs) { L.want = true; L.arr = true; }
  LAYER.qm = makeQMarks(THREE, world, LAYER.objs.length, MOBILE, QM_OPT); for (const L of LAYER.objs) LAYER.qm.add(L, GL[L.o.layer].color, top5(L.o.layer));
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
  for (const L of LAYER.objs) { L.want = W.includes(top5(L.o.layer)); if (!L.want) L.arr = false; if (L.label) { L.glyph.remove(L.label); L.label.material.map.dispose(); L.label.material.dispose(); L.label = null; } }
  if (g) putOnAnim(g);
  if (!W.includes("sight") && SIGHT.sp) exitSight();
  KASA.herd?.setLayers(W); for (const h of AREA.herds) h.setLayers(W);
  updateStack();
}
function putOnAnim() { }   // 2026-10-22 本人「グラスで分ける案はやめて」→ 層は左の板で切りかえる
const LABEL_R = MOBILE ? 18 : 20;   /* 10-28 午後 本人「印が目立ちすぎ」：札は近い印だけ・小さく */   /* 10-28 夜 4：20〜26 m の印の札が薄すぎて 1 枚しか読めなかった */   // 10-28：スマホでも近い 3 つの印に札（12 m より先の札を消していた）
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
  // 2026-10-26 17：碧の体の後ろに重なる目印の球は、碧の頭の上へ表示だけ持ち上げる（地点の位置は変えない）
  let AB = null; if (MOBILE && M === "walk" && AOI.root?.visible) { const p = AOI.root.position, f = _pv3.set(p.x, p.y, p.z).project(camera).clone(), h = _pv3.set(p.x, p.y + 1.75, p.z).project(camera).clone(); AB = { x: h.x, y0: f.y, y1: h.y, hw: (h.y - f.y) * .3 * innerHeight / innerWidth, d: Math.hypot(p.x - cp.x, p.z - cp.z) }; } QW._AB = AB;
  for (const L of LAYER.objs) {
    const dx = L.o.x - cp.x, dz = L.o.z - cp.z, dist = Math.hypot(dx, dz);
    { let tl = 0; if (AB && dist > AB.d + 1 && dist < 60) { const v = _pv3.set(L.o.x, L.o.y + L.o.h, L.o.z).project(camera); if (v.z < 1 && Math.abs(v.x - AB.x) < AB.hw + .12 && v.y < AB.y1 + .06 && v.y > AB.y0) tl = (AB.y1 + .1 - v.y) * dist * Math.tan(camera.fov * Math.PI / 360); } L.lift = (L.lift || 0) + (tl - (L.lift || 0)) * Math.min(1, dt * 3); }
    if (L.want && !L.arr && (!LAYER.ripple.visible || top5(L.o.layer) !== LAYER.rippleLayer || dist < LAYER.rippleR - 10)) L.arr = true;
    const target = L.want && L.arr && dist < far ? 1 : 0;
    L.show += (target - L.show) * Math.min(1, dt * (target ? 3 : 6));
    const vis = L.show > .01; L.root.visible = vis; if (!vis) continue;
    // 遠くでも見つけられるように、少しだけ大きく（位置は動かさない）
    const s = sky ? Math.min(46, Math.max(10, Math.hypot(cp.x - L.o.x, cp.y - L.o.y, cp.z - L.o.z) / 38)) : Math.min(flyish ? 26 : 3.2, Math.max(1, dist / (flyish ? 9 : 16))) * (1 + L.open * .35);
    L.glyph.scale.setScalar(s * (.6 + .4 * L.show));
    L.glyph.position.y = sky ? Math.max(L.o.h, 2.2 * s) : flyish ? Math.max(L.o.h, 2.5 * s) : L.o.h + (L.lift || 0);
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
    const near = !sky && !flyish && M !== "descend" && dist < LABEL_R;   /* 10-28 夜 8：降りているあいだは札を出さない（着く直前に札が重なって見えた） */
    if (near && !L.label) { L.label = makeLabel(layerNo(L.o.layer), GL[L.o.layer].name, L.o.title, GL[L.o.layer].color); L.label.position.set(.5, .66, 0); L.label.userData.by = .66; L.label.material.depthTest = false; L.label.renderOrder = 9; L.glyph.add(L.label); }   // 札は木に隠さない（重なりは placeLabels で避ける）
    if (L.label) { L.label.visible = near && !L.qHide; L.label.material.opacity = Math.min(1, (LABEL_R - dist) / 6) * op; const gs = L.glyph.scale.x || 1, fpx = innerHeight / 2 / Math.tan(camera.fov * Math.PI / 360), wh = (MOBILE ? 30 : 30) * Math.max(1, dist) / fpx, k = wh / .4 / gs; L.label.scale.set(1.6 * k, .4 * k, 1); }   // 2026-10-26 15：札は画面の上でいつも同じ大きさ（名前の字が PC 約 25px・スマホ約 20px の明朝）
  }
  LAYER.qm?.update(camera, { t, sky, focus: PANEL.cur || null }); AREA.qm?.update(camera, { t, sky, focus: PANEL.cur || null });
  if (!(LAYER.sweepT > t)) { LAYER.sweepT = t + 1.5; landSweep(); }
  { const gT = LAYER.worn.length && M !== "boot" ? (sky ? .32 : .62) : 0; LANDG.value += (gT - LANDG.value) * Math.min(1, dt * 2.2); }
  stepHere(cp, t, sky || flyish || M === "boot");
  // 札どうし・札と結晶を重ねない（近い札から置き、重なる札は上へ逃がすか、うすく消す）
  const lbs = [], onScr = L => { L.glyph.getWorldPosition(_pv3).project(camera); return _pv3.z < 1 && Math.abs(_pv3.x) < 1 && Math.abs(_pv3.y) < 1; };   /* 10-28 夜：画面の外（横・後ろ）の印は札の数に数えない。近い順の上限 4 を画面の外の印が使い切り、目の前の印に札が付かなかった */
  for (const L of LAYER.objs) if (L.label && L.label.visible && L.root.visible && !L.qHide) { if (!onScr(L)) { L.label.visible = false; continue; } lbs.push({ sp: L.label, L, d: Math.hypot(L.o.x - cp.x, L.o.z - cp.z), pri: PANEL.cur === L ? 1 : 0 }); }
  // 2026-10-26 16：町（東口・西口・新都心・公園）の典拠のある地点にも、近くに来たら名札（参道の札と同じ形・大きさ）
  if (!sky && !flyish) for (const L of AREA.marks || []) { const dA = Math.hypot(L.o.x - cp.x, L.o.z - cp.z), nearA = L.mark.visible && dA < LABEL_R && !L.qHide && onScr(L);
    if (nearA && !L.label) { const k5 = top5(L.o.layer); L.label = makeLabel(layerNo(L.o.layer), GL[k5]?.name || ("Qualia/" + k5), L.o.title, COLOR5[k5] || "#e8eef2"); L.label.material.depthTest = false; L.label.renderOrder = 9; L.label.position.set(.9, .4, 0); L.label.userData.by = .4; L.glyph.add(L.label); }
    if (L.label) { L.label.visible = nearA && !L.qHide;   /* 10-28：札は見せている印と同じものだけ */ if (nearA) { L.label.material.opacity = Math.min(1, (LABEL_R - dA) / 6); const fpx = innerHeight / 2 / Math.tan(camera.fov * Math.PI / 360), wh = (MOBILE ? 30 : 30) * Math.max(1, dA) / fpx, k = wh / .4; L.label.scale.set(1.6 * k, .4 * k, 1); lbs.push({ sp: L.label, L, d: dA, pri: 0 }); } } }
  { lbs.sort((p, q) => q.pri - p.pri || p.d - q.d); const cap = MOBILE ? 3 : 4; for (const e of lbs.splice(cap)) e.sp.visible = false; if (MOBILE) for (let i = lbs.length - 1; i >= 0; i--) if (lbs[i].d > 30 && !lbs[i].pri) { lbs[i].sp.visible = false; lbs.splice(i, 1); } }   /* 2026-10-27 夜：スマホは遠い札（鳥居や並木に透けて重なる）を出さず、近い札だけ */   // 2026-10-26 15：大きな札は近い順に PC 4・スマホ 3 まで
  if (lbs.length) { const av = [...(LAYER.qm?.rects || []), ...(AREA.qm?.rects || [])]; for (const id of ["qHere", "lstack", "caption", "qDir", "hud", "sndTag"]) { const e = document.getElementById(id); if (!e || e.hidden) continue; { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < .05) continue; } const r = e.getBoundingClientRect(); if (r.width && r.height) av.push({ x0: r.left - 4, x1: r.right + 4, y0: r.top - 4, y1: r.bottom + 4 }); } placeLabels(THREE, camera, lbs, av, dt); }   // 2026-10-26 15：札を大きくしたので、画面の板（重なりの数・層の一覧・字幕）にもかけない
}
function pickObj(x, y) {
  let best = null, bd = (MOBILE ? 50 : 42) ** 2;   // 10-28 午後：印を小さくしたので、当たりは広めに（外れて歩き出さない）
  for (const L of LAYER.objs) {
    if (!L.root.visible || L.show < .5 || L.qHide) continue;
    L.glyph.getWorldPosition(_v3); const dist = _v3.distanceTo(camera.position); _v3.project(camera); if (_v3.z > 1) continue;
    const sx = (_v3.x + 1) / 2 * innerWidth, sy = (1 - _v3.y) / 2 * innerHeight, d = (sx - x) ** 2 + (sy - y) ** 2;
    const rad = Math.max(bd, (420 / Math.max(1, dist)) ** 2);
    if (d < rad && (!best || d < best.d)) best = { L, d };
  }
  return best?.L || null;
}
function updateStack() { syncTray(); }
/* 2026-10-26：いまいる場所の重なり（半径 30 m に重なる Qualia の数と層）と、画面の外にあるいちばん近い Qualia の方角 */
const QH = { t: 0, el: null, dir: null };
function stepHere(cp, t, off) {
  if (!QH.el) { QH.el = $("#qHere"); QH.dir = $("#qDir"); if (!QH.el) return; }
  const walk = !off && (QW.mode === "walk" || QW.mode === "sight") && $("#panel").hidden;
  if (!walk || !LAYER.worn.length) { QH.el.hidden = true; QH.dir.hidden = true; return; }
  if (t - QH.t > .5) {
    QH.t = t; const cnt = {}; let n = 0, best = null, bd = 1e9, nd = 1e9, nL = null; const v = new THREE.Vector3();
    for (const L of [...LAYER.objs, ...(AREA.marks || [])]) { if (L.mark ? !L.mark.visible : !L.want) continue; const d = Math.hypot(L.o.x - cp.x, L.o.z - cp.z);   // 2026-10-26 16：町の典拠のある地点も数え、方角を出す
      if (d < 30) { const k = top5(L.o.layer); cnt[k] = (cnt[k] || 0) + 1; n++; } if (d < nd && d > 4) { nd = d; nL = L; }
      if (d > 4 && d < 400 && d < bd) { v.set(L.o.x, L.o.y + (L.o.h ?? 2.1), L.o.z).project(camera); if (v.z > 1 || Math.abs(v.x) > .92 || Math.abs(v.y) > .92) { bd = d; best = L; } } }
    const ks = ALL.filter(l => cnt[l.id]).reverse();
    QH.el.innerHTML = n ? `<b>${n}</b><span class="t">まわり半径 30 m の Qualia（前後左右すべて）</span>` + ks.map(l => `<i style="--c:${l.color}" title="${l.name}">${l.id}<em>${cnt[l.id]}</em></i>`).join("") : (nd < 400 ? `<b>${Math.round(nd)} m</b><span class="t">先に、いちばん近い Qualia</span>` : "");
    QH.el.hidden = !n && !(nd < 400); QH.best = nd < 400 ? nL : null;   /* 上の札と方角の丸は同じ球を指す */
  }
  const L = QH.best;
  if (!L || (L.mark ? !L.mark.visible : !L.want) || Math.hypot(L.o.x - cp.x, L.o.z - cp.z) < 8) { QH.dir.hidden = true; return; }
  const v = new THREE.Vector3(L.o.x, L.o.y + (L.o.h ?? 2.1), L.o.z).applyMatrix4(camera.matrixWorldInverse);
  if (v.z < 0 && Math.abs(v.x / -v.z) < 1 && Math.abs(v.y / -v.z) < .8) { QH.dir.hidden = true; return; }
  const a = Math.atan2(v.x, -v.z), W = innerWidth, H = innerHeight, x = Math.max(MOBILE ? 30 : 270, Math.min(W - 30, W / 2 + Math.sin(a) * (W / 2 - 40))), y = Math.max(MOBILE ? 340 : 140, Math.min(H - (MOBILE ? 300 : 150), H * .55 - Math.cos(a) * (H * .55 - 150)));   // 前は上・うしろは下の、画面のふち
  let X = x; if (AOI.root?.visible) { const p = AOI.root.position, f = _ap2.set(p.x, p.y, p.z).project(camera), fx = (f.x * .5 + .5) * W, fy = (-f.y * .5 + .5) * H, hy = (-_ap2.set(p.x, p.y + 1.75, p.z).project(camera).y * .5 + .5) * H, hw = (fy - hy) * .3 + 26; if (Math.abs(X - fx) < hw && y > hy - 30 && y < fy + 10) X = fx > W / 2 ? Math.max(30, fx - hw) : Math.min(W - 30, fx + hw); }   /* 2026-10-26 17：方角の丸を碧の顔と体に重ねない */
  QH.dir.hidden = false; QH.dir.style.transform = `translate(${X - 18}px,${y - 18}px)`; QH.dir.firstElementChild.style.transform = `rotate(${a}rad)`;
  QH.dir.style.setProperty("--c", (GL[L.o.layer] || GL[top5(L.o.layer)])?.color || COLOR5[top5(L.o.layer)] || "#e8eef2"); QH.dir.lastElementChild.textContent = `${Math.round(Math.hypot(L.o.x - cp.x, L.o.z - cp.z))} m`;
}

/* ---------- 開いた中身 ---------- */
const PANEL = { cur: null };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const srcList = src => src.map(s => s.u ? `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a></li>` : `<li>${esc(s.t)}</li>`).join("");
/* 10-28 午後：音・触覚・書などの印も、歩いているあいだは重ね窓を出さない。碧が一行で語り、音は自動で鳴らす（「鳴らす」「聴く」の操作だけ自動で行う。空へ飛ぶ・身体に入るなどの大きな切りかえは自動ではしない） */
const NARR_FORCE = { on: false };
function panelAsNarr({ title, lines = [], more = [], src = [], buttons = [] }) {
  let ls = (lines || []).filter(l => l && l.t).slice(0, 2).map(l => ({ ...l }));
  if (!ls.length && more && more[0]) ls = [{ t: String(more[0]) }];
  if (!ls.length) ls = [{ t: title }];
  const s0 = (src || [])[0], s0t = s0 ? (typeof s0 === "string" ? s0 : (s0.t || "")).trim() : ""; if (s0t) for (const l of ls) l.src = s0t;
  const L = PANEL.cur || null; if (!$("#panel").hidden) { $("#panel").hidden = true; document.body.classList.remove("pOpen"); }
  const play = (buttons || []).find(b => /鳴らす|聴く|再生|流す/.test(b.label || ""));
  pastTint(ls);
  speakLines(ls, L, { narr: true, done: () => { if (play && PANEL.cur === L) { try { play.run(); } catch (e) { console.warn(e); } } if (PANEL.cur === L && $("#panel").hidden) PANEL.cur = null; } });   // 語り終えてから音を鳴らす（鳴らす操作は語りを止めるため）
}
function openPanel({ color, layer, title, lines = [], more = [], how, note, src = [], ll, figs = "", buttons = [] }) {
  if ((QW.mode === "walk" || QW.mode === "sight") && !NARR_FORCE.on) { panelAsNarr({ title, lines, more, src, buttons }); return; }   // 2026-10-28 午後 本人「オーバーレイで説明が出るのではなく、碧が解説するように」＝歩いているあいだは重ね窓を出さず、碧の語りと下の小さな字幕に
  closeTray(); if (innerWidth < 640) { $("#lstack").classList.add("closed"); $("#lsHead").setAttribute("aria-expanded", "false"); }   // スマホ：札を開くときは層の一覧をたたむ（札の後ろに透けない）
  const p = $("#panel"); p.hidden = false; p.style.setProperty("--pc", color); document.body.classList.add("pOpen");
  // 2026-10-23：スマホでも碧は消さない（札を下の 46vh にして、碧はその上に見える）
  $("#pLayer").textContent = layer; $("#pTitle").textContent = title;
  const body = $("#pBody"); body.innerHTML = "";
  lines.forEach((l, i) => { const e = document.createElement("p"); e.className = "line"; e.dataset.i = i; e.textContent = l.t; body.appendChild(e); });
  const mo = $("#pMore"); mo.innerHTML = ""; for (const m of more) { const e = document.createElement("p"); e.className = "more"; e.textContent = m; mo.appendChild(e); }   // くわしい文は畳む（表には題と、いま話している一行だけ）
  const ex = $("#pExp"); ex.innerHTML = figs ? `<figure class="fig">${figs}</figure>` : ""; ex.hidden = !figs && !buttons.length;
  for (const b of buttons) { const e = document.createElement("button"); e.type = "button"; e.className = "ml-btn expBtn" + (b.primary ? " ml-btn--primary" : ""); e.textContent = b.label; e.addEventListener("click", b.run); ex.appendChild(e); }
  $("#pHow").textContent = how || ""; $("#pHow").hidden = !how;
  $("#pNote").textContent = note || ""; $("#pNote").hidden = !note;
  $("#pSrc").innerHTML = srcList(src);
  $("#pPos").textContent = ll ? `この物の位置：北緯 ${ll[1].toFixed(5)}°・東経 ${ll[0].toFixed(5)}°（地図の座標に固定）` : "";
  $("#pFold").open = false; $("#pFold").hidden = !src.length && !note && !how && !more.length; p.scrollTop = 0;
  p.classList.remove("pulse"); void p.offsetWidth; p.classList.add("pulse"); qChime(color);   // 層の色の線と光がひらき、短い音と振動
}
function qChime(color) {   // 触れたときの短い音（その場で組み立てる合成音）と振動
  try { navigator.vibrate?.([14, 40, 10]); } catch { }
  const ac = sndCtx(); if (!ac || !soundOn) return; const h = parseInt((color || "#9bdcf0").slice(1), 16), f0 = 520 + ((h >> 16) % 7) * 60, t = ac.currentTime + .01;
  for (const [k, f] of [[0, f0], [.07, f0 * 1.5]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, t + k); g.gain.linearRampToValueAtTime(.07, t + k + .015); g.gain.exponentialRampToValueAtTime(.0005, t + k + 1.1); o.connect(g); g.connect(SND.out); o.start(t + k); o.stop(t + k + 1.2); }
}
function openObj(L) {
  const o = L.o, g = GL[o.layer];
  if (NARR.L === L && !NARR.sp && voiceQ && !o.tch && !o.snd) return;   // 10-29：語っている印にもう一度触れても言いなおさない
  if (NARR.L === L && NARR.sp) { const sp = NARR.sp; stopVoice(); NARR.L = null; NARR.sp = null; PANEL.cur = null; SIGHT.from = L; return enterSight(sp, L); }   // 語りの最中にもう一度触れる＝その生きものの受けとり方へ
  PANEL.cur = L;
  if (o.snd) return openSound(L);
  if (o.tch) return openTouch(L);
  if (o.sho) return openSho(L);
  if (o.rk) return openRakugo(L);
  const sp = o.sp ? D.sight.find(s => s.id === o.sp) : null;
  narrate(L, sp);
}
/* 2026-10-28 午後 本人「オーバーレイで説明が出るのではなく、碧が解説するように。オーバーレイしている最中に移動ができず、操作感が悪くなる。下に小さくナレーションで文字を」
   → 印に触れても重ね窓は出さない。碧がその場で語り（声と身ぶり）、画面の下に小さな字幕。語っているあいだも歩く・見回す・ほかの印に触れるがそのまま効く（ほかに触れたら語りは切りかわる）。
   体験の芯＝「受けとり方が変わる」：生きものの手がかりのある印は、もう一度触れるとその生きものの受けとり方へ（Qualia/sight）。語りの終わりに、答えでなく次の印への問いを置く（歩くと分かる）。
   表面的な話（舗装・割合・催しなど）は一言に縮める（データは消さず、出し方で）。 */
/* 10-28 晩 本人「Qualia のレイヤーを画面左に配置するのではなく、世界自体にレイヤーとして重ね合わせて」→ 共通部品 kit/worldlayers.js（左の層の一覧は歩くときに出さない） */
/* 10-29 本人の決定：依代（碧が姿を変えたもの）のしずくと石を置く（共通部品 kit/envAgents/yorishiro）。
   しずく＝水に関わる印のそば、石＝石に関わる印のそば。歩く道すじから見える所に 1 体ずつ、さりげなく。
   触れると碧の声で短く一言、その印の出典つきの一行につなぐ（大きな演出は出さない・擬人の断定はしない）。 */
const YO = { y: null, busy: false };
const YO_RE = { shizuku: /神池|池の|湧水|湧き水|泉|用水|渋谷川|新河岸川|入間川|見沼|水路|せせらぎ|川の水|水が流れ/, ishi: /石畳|標石|石垣|石段|石碑|敷石|石の鳥居|道標/ };
async function startYorishiro() {
  if (YO.y || YO.busy) return; YO.busy = true; QW.YO = YO;
  try {
    const Y = await import("../kit/envAgents/yorishiro/yorishiro.js?v=y1");
    YO.y = new Y.Yorishiro({ scene: world, camera, groundAt: (x, z) => surfaceY(x, z) });
    const cp = camera.position, used = [];
    for (const kind of ["shizuku", "ishi"]) {
      let best = null, bd = 1e9;
      for (const L of [...LAYER.objs, ...(AREA.marks || [])]) { const t = (L.o.title || "") + (L.o.lines || []).map(l => l.t || "").join(""); if (!YO_RE[kind].test(t) || THIN.test(t) || /標高/.test(t) || used.includes(L)) continue; const d = Math.hypot(L.o.x - cp.x, L.o.z - cp.z); if (d < bd) { bd = d; best = L; } }
      if (!best) continue; used.push(best);
      const a = (best.o.x * 7.1 + best.o.z * 3.3) % 6.28, x = best.o.x + Math.cos(a) * 1.4, z = best.o.z + Math.sin(a) * 1.4, L = best;
      await YO.y.add(kind, { x, z, yaw: a, scale: .42, onTouch: () => {
        const nm = kind === "shizuku" ? "しずく" : "石", l0 = (L.o.lines || []).find(l => l && l.t && YO_RE[kind].test(l.t)) || (L.o.lines || []).find(l => l && l.t),   /* 水・石の話の一行を選ぶ */ s0 = (L.o.src || [])[0], st = s0 ? (typeof s0 === "string" ? s0 : s0.t || "") : "";
        const a1 = `${nm}の姿の碧です。`, ls = [{ t: a1, tc: a1 }]; if (l0) ls.push({ t: l0.t, tc: l0.tc || l0.t, src: st || undefined });
        speakLines(ls, null, { narr: true }); } });
    }
  } catch (e) { console.warn("yorishiro", e); }
}
let WL = null;
function startWL() { if (WL) return; for (const L of LAYER.objs) { const sp = L.o.sp ? D.sight.find(x => x.id === L.o.sp) : null; L.qSight = !!(sp && BODY_D[sp.id]); }   /* 生きものの受けとり方へ入れる印の目印 */ WL = makeWorldLayers(THREE, world, { marks: () => [...LAYER.objs.filter(L => L.root?.visible && L.show > .5), ...(AREA.marks || []).filter(L => L.mark?.visible)], pitch: () => CAM.pitch, narrate: (L, k, from) => narrate(L, null, k, from), color: L => (GL[L.o.layer] || GL[top5(L.o.layer)])?.color || COLOR5[top5(L.o.layer)] || "#bfe3ee", busy: () => !$("#panel").hidden, speaking: () => !!voiceQ, skip: M => THIN.test((M.o.title || "") + (M.o.lines || []).map(l => l.t || "").join("")), quietFor: () => { const cp = camera.position; let nd = 1e9; for (const M of [...LAYER.objs, ...(AREA.marks || [])]) { if (M.qHide || (M.mark ? !M.mark.visible : !M.root?.visible)) continue; const d = Math.hypot(M.o.x - cp.x, M.o.z - cp.z); if (d > 6 && d < nd) nd = d; } return Math.max(8, Math.min(16, nd / 1.4 * .45)); },   /* 10-29：間合いを次の印までの距離で（川越・渋谷と同じ） */ ask: () => { if (!WL_HINT.done) { const h = "足もとを見下ろすと小さなものの話を、見上げると土地の大きな形の話をします。"; speakLines([{ t: h, tc: h, hint: true }], null); return; } const q = nextMarkAsk(null) || nextMarkAsk(null, true); if (q) speakLines([{ t: q, tc: q }], null); },   /* 10-28 晩：見下ろす／見上げるの知らせは、最初の静かな間に */ active: () => QW.mode === "walk", ground: (x, z) => groundY(x, z) }); }
const WL_HINT = { n: 0, done: (() => { try { return sessionStorage.getItem("wl_hint") === "1"; } catch { return false; } })() };
const NARR = { L: null, sp: null, heard: new Set() };
const THIN = /舗装|アスファルト|割合|本数|樹種の内訳|観察会|見る会|催し|イベント|募集|駐車|約\s*[0-9０-９]+\s*割|[0-9０-９]+\s*本、|[0-9０-９]+\s*種の|樹種|調査では/;   // 10-28 晩：数や割合の豆知識は一言に
let ASKN = -1;
function nextMarkAsk(L, wide) {
  const cp = camera.position, fw = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); let best = null, bd = 1e9;
  for (const M of [...LAYER.objs, ...(AREA.marks || [])]) { if (M === L || (!wide && M.qHide) || (M.mark ? !M.mark.visible : !M.root?.visible)) continue; const dx = M.o.x - cp.x, dz = M.o.z - cp.z, d = Math.hypot(dx, dz); if (d < 12 || d > 120) continue; const fr = (dx * fw.x + dz * fw.z) / d, sc = d - fr * 25; if (sc < bd) { bd = sc; best = { M, d, dx, dz, fr }; } }
  if (!best) return null; const side = best.dx * -fw.z + best.dz * fw.x;   // 右が正
  const dir = best.fr > .7 ? "この先" : best.fr < -.5 ? "うしろ" : side > 0 ? "右手" : "左手";
  const m = Math.round(best.d / 5) * 5, Q = [`${dir}、${m} m ほどの所には、何が重なっているでしょう。`, `${dir} ${m} m ほど。そこでは、何が見えてくるでしょう。`, `${dir}の、${m} m ほど先。足を止めてみたくなる所があります。`, `${dir}、${m} m ほど。そこに、何が残っているでしょう。`];
  ASKN = (ASKN + 1) % Q.length; return Q[ASKN];   // 10-28 晩：同じ言い方が続かないように（答えは言わない）
}
/* 10-28 午後 本人承認「歩きながら時間が重なる」：昔の姿を語るあいだ（年号・時代の語がある記録だけ）、景色の色をゆっくり古い写真の色へ寄せ、語り終えると戻す。形は足さない（典拠のない昔の形を作らない） */
const PAST_RE = /江戸|明治|大正|昭和|享保|元禄|宝暦|寛永|天保|慶長|中世|縄文|弥生|古墳|[0-9０-９]+\s*年(前|ごろ|に)|かつて|昔は|むかし/;
function pastTint(lines) { const on = lines.some(l => PAST_RE.test(l.t || "")); queueMicrotask(() => document.body.classList.toggle("pastOn", on)); }   // 語りを始める処理（stopVoice が色を戻す）のあとで付ける
/* 10-28 晩：触覚の印は、歩いたまま触れる小さな板を画面の左下に出す（重ね窓にしない・ほかの操作をふさがない）。触れた所から 8 m 離れるか、ほかの印に触れると消える */
const TFL = { el: null, L: null, iv: 0 };
function floatPad(pad, L) {
  clearInterval(TFL.iv); if (!pad) return; let box = document.getElementById("tfloat"); if (!box) { box = document.createElement("div"); box.id = "tfloat"; document.body.appendChild(box); for (const ev of ["pointerdown", "pointermove", "pointerup", "mousedown", "mousemove", "touchstart", "touchmove", "click", "wheel"]) box.addEventListener(ev, e => e.stopPropagation()); }   // なでても景色が回らない・歩き出さない
  box.innerHTML = ""; pad.style.height = "100%"; pad.style.margin = "0"; box.appendChild(pad); box.hidden = false; TFL.el = box; TFL.L = L;
  const o0 = L?.o, lim = o0 ? Math.max(18, Math.hypot(o0.x - camera.position.x, o0.z - camera.position.z) + 8) : 18;   // 触れた所から 8 m 以上離れたら消す（遠くの印に触れてもすぐ消えない）
  TFL.iv = setInterval(() => { const o = TFL.L?.o; if (!o || QW.mode !== "walk" || Math.hypot(o.x - camera.position.x, o.z - camera.position.z) > lim) clearFloatPad(); }, 500);
}
function clearFloatPad() { clearInterval(TFL.iv); if (TFL.el) { TFL.el.hidden = true; TFL.el.innerHTML = ""; } TFL.L = null;  }
function narrate(L, sp, how, from) { if (TFL.L && TFL.L !== L) clearFloatPad();
  const o = L.o; hidePanel(); PANEL.cur = L; NARR.L = L; NARR.sp = sp && BODY_D[sp.id] ? sp : null;
  let lines = (o.lines || []).filter(l => l && l.t); const thin = THIN.test(o.title + " " + lines.map(l => l.t).join(""));
  const again = NARR.heard.has(o.id); NARR.heard.add(o.id);
  lines = thin || again ? lines.slice(0, 1) : lines.slice(0, 3); if (!lines.length) lines = [{ t: o.title }];   // 10-29：一度聞いた印は一言だけ
  lines = lines.map(l => ({ ...l, tc: l.tc || l.t }));
  const s0 = (o.src || [])[0], s0t = s0 ? (typeof s0 === "string" ? s0 : (s0.t || "")).trim() : ""; if (s0t) for (const l of lines) l.src = s0t; { const G0 = (GL[o.layer] || GL[top5(o.layer)]); if (G0) for (const l of lines) { l.lay = G0.name; l.lc = G0.color; } }   // 10-28 晩：字幕の端に層の名と色（左の一覧をなくしたので、どの層の話かをここで示す）   /* 10-28 晩：出典はどの行にも（data の出典の欄から） */
  startWL(); const rel = how === "cont" ? null : WL?.related(L); WL?.focus(L); WL?.follow(L, rel?.M || null);   // 線の先へ歩くと、続きを語る
  if (how === "micro" || how === "micro-far") { const t0 = how === "micro" ? "足もとの、小さなものの話です。" : "少し先の、小さなものの話です。"; lines.unshift({ t: t0, tc: t0 }); } else if (how === "cont" && from) { const t0 = `さっきの「${from.o.title}」と、同じ資料に書かれた話です。`; lines.unshift({ t: t0, tc: t0 }); } else if (how === "macro") lines.unshift({ t: "見上げた先の、土地の大きな形の話です。", tc: "見上げた先の、土地の大きな形の話です。" });
  let tail = NARR.sp ? `${NARR.sp.name}は、ここをどう受けとっているでしょう。もう一度触れると、その受けとり方へ。` : rel ? `この話は、${Math.round(rel.d / 5) * 5} m ほど先の「${rel.M.o.title}」と、同じ資料でつながっています。景色の中の細い線が、その道すじです。` : nextMarkAsk(L);

  if (tail) lines.push({ t: tail, tc: tail, ask: true });
  if (!WL_HINT.done && ++WL_HINT.n === 1) { const h = "足もとを見下ろすと小さなものの話を、見上げると土地の大きな形の話をします。"; lines.push({ t: h, tc: h, hint: true }); }   /* 静かな間を待たず、最初の語りの終わりに知らせる（静かな間が来れば、そこで） */
  if (o.seg) TALK.spoken.add(o.seg);
  qChime((GL[o.layer] || GL[top5(o.layer)])?.color);
  pastTint(lines);
  speakLines(lines, L, { narr: true, done: () => { WL?.focus(null); if (NARR.L === L) { NARR.L = null; NARR.sp = null; if (PANEL.cur === L && $("#panel").hidden) PANEL.cur = null; } } });
}
function hidePanel() { if (KASA.cur) { KASA.cur.herd?.release(KASA.cur); KASA.cur = null; } try { $("#pExp video")?.pause(); } catch { } if ($("#panel").hidden) return; $("#panel").hidden = true; document.body.classList.remove("pOpen"); if (AOI.hidP) { AOI.hidP = false; if (AOI.root && QW.mode === "walk") AOI.root.visible = true; } PANEL.cur = null; TCH.cur = null; stopVoice(); stopSound(); }
$("#pClose").addEventListener("click", hidePanel);

/* ---------- 声（碧） ---------- */
const audio = $("#voice"); let soundOn = true, voiceQ = null;
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { } }
let VOICE_END = 0;
function stopVoice() { if (voiceQ) VOICE_END = performance.now(); document.body.classList.remove("pastOn"); voiceQ = null; try { audio.pause(); } catch { } AOI.m?.stopSpeaking(); document.querySelectorAll("#pBody .line.now").forEach(e => e.classList.remove("now")); hideCaption(); }
function speakLines(lines, L, opt = {}) {
  stopVoice(); const q = lines.slice(); voiceQ = { q, i: 0, L, talk: opt.talk || null, done: opt.done || null, narr: !!opt.narr };   // 2026-10-27 声のない典拠つきの一行も字幕で出す
  if (L && AOI.m) { const p = L.glyph.getWorldPosition(new THREE.Vector3()), P = AOI.root?.position;
    // 物が碧から見て見る人と反対の側にあるときは、物へ振りむかず、見る人の方を向いて話す（背を向けて話さない）
    if (P && Math.abs(wrap(Math.atan2(p.x - P.x, p.z - P.z) - Math.atan2(CAM.pos.x - P.x, CAM.pos.z - P.z))) > 1.1) { AOI.m.lookAt(camera.position.clone()); AOI.focus = null; }
    else { AOI.m.lookAt(p); AOI.focus = p; const f0 = p; setTimeout(() => { if (AOI.focus === f0) { AOI.focus = null; AOI.m?.lookAt(camera.position.clone()); } }, 1600); } }   // 指さず、目と体を半分だけ物へ向け、1.6 秒で見る人へ向きなおって話す
  playNext();
}
function playNext() {
  const v = voiceQ; if (!v) return; const l = v.q[v.i];
  if (l && l.hint && WL_HINT.done) { v.i++; return playNext(); }   // 知らせが出ていたら、もう一つは飛ばす
  if (l && l.hint) { WL_HINT.done = true; try { sessionStorage.setItem("wl_hint", "1"); } catch { } }   // 知らせは、実際に出たときにだけ済みにする（触れて切りかわったら、次の静かな間に一言）
  if (!l) { VOICE_END = performance.now(); voiceQ = null; AOI.focus = null; hideCaption(1200); v.done?.(); return; }
  const idx = v.L && !v.narr ? v.L.o.lines.indexOf(l) : -1;
  document.querySelectorAll("#pBody .line").forEach(e => e.classList.toggle("now", +e.dataset.i === idx));
  if (!v.L || v.narr || $("#panel").hidden) CAP_LAY = l.lay ? { n: l.lay, c: l.lc } : null; caption(l.tc || l.t, v.talk, l.src, (soundOn && l.f ? (l.dur || l.t.length * .16) : Math.max(3.2, (l.dur || l.t.length * .16) + 1.2)));
  const next = gap => setTimeout(() => { if (voiceQ === v) { v.i++; playNext(); } }, gap);
  if (!soundOn || !l.f) { next(Math.max(3200, (l.dur || l.t.length * .16) * 1000 + 1200))   /* 10-28 晩：声のない行も読める長さ（1 字 0.2 秒＋1.2 秒・最低 3.2 秒） */; return; }
  audio.src = l.f; audio.currentTime = 0;
  if (AOI.m && v.i === 0) AOI.m.express(v.talk ? (Math.random() < .5 ? "warm" : "curious") : "warm", .55, Math.min(6, (l.dur || 3) + 1));
  audio.play().then(() => { AOI.m?.speak({ timeline: D.lip[l.id] || null, text: l.t, dur: l.dur, clock: () => audio.currentTime, ref: v.L && v.i === 0 && AOI.focus ? AOI.focus : null, autoGesture: !v.L || (v.i === 0 && !!AOI.focus) /* 2026-10-23 札の読み上げで指すのは、物が前にある最初の一行だけ */ }); }).catch(() => next(1500));
  audio.onended = () => { if (voiceQ !== v) return; AOI.m?.stopSpeaking(); next(420); };
  { const i0 = v.i; setTimeout(() => { if (voiceQ === v && v.i === i0 && !audio.ended && (audio.paused || audio.currentTime < .05)) { AOI.m?.stopSpeaking(); v.i++; playNext(); } }, ((l.dur || 3) + 4) * 1000); }   // 10-29：声が止まっても黙ったまま止まらない
}
let capT = 0;
let capChunkT = 0;
function capChunks(t) {   // 10-28 午後：字幕は 1〜2 行。長い文は句点・読点で区切って順に出す
  const max = innerWidth < 640 ? 44 : 70; t = String(t).trim(); if (t.length <= max) return [t];
  const parts = t.split(/(?<=[。！？])/); const out = []; let cur = "";
  for (const p of parts) { if ((cur + p).length > max && cur) { out.push(cur); cur = ""; } if (p.length > max) { for (const q of p.split(/(?<=、)/)) { if ((cur + q).length > max && cur) { out.push(cur); cur = ""; } cur += q; } } else cur += p; }
  if (cur) out.push(cur); const o2 = []; for (const x of out.map(x => x.trim()).filter(Boolean)) { if (o2.length && (o2[o2.length - 1].length < 14 || x.length < 8) && (o2[o2.length - 1] + x).length <= max * 1.35) o2[o2.length - 1] += x; else o2.push(x); } return o2;   // 改行だけの区切りを出さない・短い切れ端はつなぐ
}
let CAP_LAY = null;
function caption(t, talk, src, dur = 0) {
  const c = $("#caption"); clearInterval(capChunkT); const ch = capChunks(t); $("#capText").textContent = ch[0];
  if (ch.length > 1) { const tot = ch.reduce((a, x) => a + x.length, 0); let i = 0, acc = ch[0].length; const step = () => { i++; if (i >= ch.length) return; $("#capText").textContent = ch[i]; acc += ch[i].length; if (i < ch.length - 1) capChunkT = setTimeout(step, Math.max(2200, ch[i].length * 160, (dur || tot * .2) * 1000 * ch[i].length / tot)); }; capChunkT = setTimeout(step, Math.max(2200, ch[0].length * 160, (dur || tot * .2) * 1000 * ch[0].length / tot)); }
  const tag = $("#capTag"); const s0 = src || (talk && talk.src && talk.src[0] && talk.src[0].t) || "";
  if (s0 || CAP_LAY) { const g = talk ? GL[talk.k] : null; tag.hidden = false; tag.style.setProperty("--c", CAP_LAY?.c || g?.color || "#9bdcf0"); tag.textContent = (CAP_LAY ? "● " + CAP_LAY.n + (s0 ? "　" : "") : (g ? "● " + g.name + "　" : "")) + (s0 ? "出典：" + s0 : ""); }   // 10-28 午後：出典は字幕の端に小さく（押して開く窓はなくした）
  else tag.hidden = true;
  delete c.dataset.talk;
  c.hidden = false; clearTimeout(capT);
}
function hideCaption(after = 0) { clearTimeout(capT); capT = setTimeout(() => { $("#caption").hidden = true; }, after); }
$("#caption").addEventListener("click", () => {   // 字幕の「出典」から、いま話している区切りを開く
  return;   // 10-28 午後 本人：重ね窓は出さない（出典は字幕の端に出ている）
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
    if (THIN.test(s.lines.map(l => l.t).join(""))) continue;   // 10-28 晩：数や割合の豆知識は、ひとりでには語らない（触れたときだけ一言）
    let ok;
    if (s.a && !air) { const rel = (s.d0 + 24 - d) * dir; ok = rel > -8 && rel < 34; }   // 地点の話：歩く先 34 m から、すぐうしろ 8 m まで
    else ok = d >= s.d0 - pad && d <= s.d1 + pad;
    if (!ok && quiet > 16000) ok = Math.abs((s.d0 + s.d1) / 2 - d) < (air ? 260 : 120);   // しばらく話すことがないときは、少し離れた話も
    if (!ok) continue;
    let sc = s.p + (LAYER.worn.includes(top5(s.k)) ? 5 : 0) + (s.a && !air ? 2 : 0) - Math.abs((s.d0 + s.d1) / 2 - d) / 150;
    if (air) sc -= s.lines.length > 3 ? 1 : 0;
    if (sc > bs) { bs = sc; best = s; }
  }
  return best;
}
function stepTalk() {
  if (performance.now() - VOICE_END < 4500) return;   // 10-29：語りのあとは 4.5 秒あける（途中で切りかわっても詰まらない）
  if (!TALK.on || !TALK.loaded || !AOI.greeted) return;
  const M = QW.mode; if (M !== "walk" && M !== "fly" && M !== "sight") return;
  if (voiceQ || PANEL.cur || !$("#sightBox").hidden) { TALK.idleSince = performance.now(); return; }
  const now = performance.now(); if (now < TALK.nextT) return;
  const s = pickTalk(); if (!s) { TALK.nextT = now + 1500; return; }
  const air = M !== "walk";
  const lines = s.lines.filter(l => !(air && (l.r === "do" || l.r === "see")));
  TALK.spoken.add(s.id); try { sessionStorage.setItem("hk_spoken", JSON.stringify([...TALK.spoken])); } catch { }
  if (!lines.length) return;
  speakLines(lines, null, { talk: s, done: () => { TALK.nextT = performance.now() + 4500 + Math.random() * 2500;   /* 10-29：息つぎ */ TALK.idleSince = performance.now(); } });
}
function syncTalkBtn() { const b = $("#talkBtn"); b.setAttribute("aria-pressed", String(TALK.on)); b.querySelector("span").textContent = TALK.on ? "碧の話：止める" : "碧の話：続ける"; }
$("#talkBtn").addEventListener("click", () => { TALK.on = !TALK.on; syncTalkBtn(); if (!TALK.on && voiceQ?.talk) stopVoice(); else TALK.nextT = performance.now() + 400; });

/* ---------- 碧（共通部品 AoiMotion） ---------- */
const AOI = { root: null, m: null, ready: false, vrm: null, pos: new THREE.Vector3(), focus: null, low: false, greeted: false, loading: null };
QW.AOI = AOI;
function loadAoi() {
  if (AOI.loading) return AOI.loading;
  return AOI.loading = (async () => {
    const [V, buf, Mot, Robe] = await Promise.all([import("@pixiv/three-vrm"), fetch("web/aoi.vrm").then(r => r.arrayBuffer()), import("../kit/aoi_motion.js?v=20261028t"), import("../kit/aoi_robe.js").catch(() => null)]);
    const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); ld.register(p => new V.VRMLoaderPlugin(p));
    const gl = await ld.parseAsync(buf, ""); const v = gl.userData.vrm;
    V.VRMUtils.removeUnnecessaryVertices(gl.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(gl.scene); V.VRMUtils.rotateVRM0(v);
    v.scene.traverse(o => { o.frustumCulled = false; });
    // 2026-10-26 3（採点「服がのっぺりした単色で陰影がない」）：衣の陰をやわらかく少し深く（顔・目・髪はそのまま）
    v.scene.traverse(o => { for (const m of [].concat(o.material || [])) { if (!m?.isMToonMaterial || /face|eye|hair|brow|mouth|teeth/i.test(m.name + o.name)) continue; if (m.shadeColorFactor) m.shadeColorFactor.lerp(new THREE.Color(0x6f7c8c), .35); if ("shadingToonyFactor" in m) m.shadingToonyFactor = Math.min(m.shadingToonyFactor, .42); if ("shadingShiftFactor" in m) m.shadingShiftFactor = Math.max(m.shadingShiftFactor - .14, -.5); if (m.color && /cloth|body|tops|bottoms|onepiece|coat|skirt|dress/i.test(m.name + o.name)) m.color.multiplyScalar(.9); } });   // 2026-10-26 16：衣が光から浮く → 白を少し落とし、陰をやわらかく深く
    const root = new THREE.Group(); root.name = "aoi"; root.add(v.scene); root.visible = false; world.add(root);
    for (const j of v.springBoneManager?.joints ?? []) j.center = root;
    v.humanoid.resetNormalizedPose(); v.update(0); v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(v.scene), h = box.max.y - box.min.y, sc = h > .5 && Math.abs(h - 1.67) / 1.67 > .02 ? 1.67 / h : 1;
    v.scene.scale.setScalar(sc); v.scene.position.y = -box.min.y * sc;
    try { Robe?.hideCoveredLegs?.(v, { keep: .12 }); } catch { }
    AOI.m = new Mot.AoiMotion(v, { root, posture: "natural", reducedMotion: RM, wind: 0, groundAt: (x, z) => { const k = Math.round(x * 2) + "," + Math.round(z * 2); if (AOI.gk !== k) { AOI.gk = k; AOI.gy = surfaceY(x, z); } return AOI.gy; }, quality: MOBILE ? "mid" : "auto" });
    if (AOI.m.robe) AOI.m.robe.wind = .25;
    AOI.root = root; AOI.vrm = v; AOI.ready = true;
    try { root.visible = true; await renderer.compileAsync(root, camera, scene); } catch { } root.visible = QW.mode === "walk";
    window.__aoi = AOI;
  })().catch(e => { console.warn("碧の姿を読み込めませんでした：", e?.message ?? e); });
}
/* 2026-10-26 3：碧の立ち位置を、画面の上のボタンと Qualia の球の領域から決める（候補を順に試し、重ならない最初のものを、0.6 秒ごとに選びなおす） */
const AOIPK = { t: 0, i: 0, rects: [], rt: 0 }, _pv3 = new THREE.Vector3(), _ap2 = new THREE.Vector3();
function aoiPick(fx, fz, rx, rz, f, C0) {
  const C = C0 || (MOBILE ? [[f, .1], [f, -.35], [f, .5], [f, -.7], [f, .85], [f, .68], [f, -.55], [f * .8, .6], [f * 1.35, .35], [f * 1.35, -.35], [f * 1.6, .2], [f * 1.5, 1.6], [f * 1.5, -1.6], [f * 1.9, 2.4], [f * 1.9, -2.4], [f * 2.4, 3.4], [f * 2.4, -3.4], [f * 3, 4.4], [f * 3, -4.4]] : [[f, .85], [f, -.85], [f, .5], [f, -.5], [f, 1.1], [f * 1.3, 2.2], [f * 1.3, -2.2], [f * 1.7, 3.4], [f * 1.7, -3.4], [f * 2.2, 4.6], [f * 2.2, -4.6]]);   /* 2026-10-27：町では車道を避けて、歩道の側の遠めの候補も */   /* 距離は一定（画面の大きさをそろえる）、横だけずらす */
  const now = performance.now(); if (now - AOIPK.t < 600) return C[Math.min(AOIPK.i, C.length - 1)]; AOIPK.t = now;
  if (now - AOIPK.rt > 1500) { AOIPK.rt = now; AOIPK.rects = [...document.querySelectorAll("button, a, [role=button]")].map(e => e.getBoundingClientRect()).filter(r => r.width > 20 && r.height > 14 && r.bottom > innerHeight * .55 && r.top < innerHeight); }
  const marks = []; for (const L of [...(LAYER.objs || []), ...(AREA.marks || [])]) { const o = L.o; if (!o || !(L.root?.visible ?? L.mark?.visible)) continue; if (Math.hypot(o.x - CAM.pos.x, o.z - CAM.pos.z) > 45) continue; /* 2026-10-26 16：池の向こうの球（30 m 先）も避ける */ if (L.glyph) { L.glyph.getWorldPosition(_pv3); marks.push(_pv3.clone().project(camera)); } else marks.push(_pv3.set(o.x, groundY(o.x, o.z) + 2.1, o.z).clone().project(camera)); }
  const W = innerWidth, H = innerHeight, sx = v => (v.x * .5 + .5) * W, sy = v => (-v.y * .5 + .5) * H;
  let best = 1e9, bi = 0;
  for (let i = 0; i < C.length; i++) { const [ff, ss] = C[i], x = CAM.pos.x + fx * ff + rx * ss, z = CAM.pos.z + fz * ff + rz * ss, g = groundY(x, z);
    const ft = _pv3.set(x, g, z).project(camera), fX = sx(ft), fY = sy(ft), hd = _pv3.set(x, g + 1.65, z).project(camera), hX = sx(hd), hY = sy(hd), hw = Math.abs(fY - hY) * .2;
    let pen = i * .01 + (AOI.m ? Math.hypot(x - AOI.m.pos.x, z - AOI.m.pos.z) * .08 : 0) + Math.abs(ff - f) * .5;   /* カメラとの距離をそろえる */   /* 今いる所に近い候補を選ぶ（大きく移らない） */
    if (fX - hw < 8 || fX + hw > W - 8 || fY > H - 6) pen += MOBILE ? 30 : 10;
    if (AREAS?.onCarriage?.(x, z)) pen += MOBILE ? 8 : 25;   /* 2026-10-27：碧は町の車道の上に立たない（歩道・横断歩道の手前へ） */
    if (AOIPK.rects.some(r => fX + hw > r.left && fX - hw < r.right && fY + 12 > r.top && hY < r.bottom)) pen += MOBILE ? 14 : 5;
    if (marks.some(m => m.z < 1 && Math.abs(sx(m) - hX) < hw * 2.6 && sy(m) > hY - Math.abs(fY - hY) * .3 && sy(m) < fY)) pen += 6;   /* 2026-10-26 16：頭だけでなく胴・裾とも重ねない */   /* 2026-10-26 15：頭と目印の球が重なる候補は強く避ける（球の実際の位置で） */
    if (pen < best) { best = pen; bi = i; } }
  AOIPK.i = bi; return C[bi];
}
function camOffRoad(x, z, yaw) {   // 2026-10-27（スマホの町）：見る人の位置が車道の上なら、横のいちばん近い歩道へ（碧も歩道に並んで画面に入る）
  if (!AREAS?.onCarriage?.(x, z)) return [x, z]; const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  for (let d = .5; d <= 10; d += .5) for (const sg of [1, -1]) { const X = x + rx * d * sg, Z = z + rz * d * sg; if (!AREAS.onCarriage(X, Z)) return [X + rx * .8 * sg, Z + rz * .8 * sg]; }
  return [x, z];
}
function aoiOffRoad(out, rx, rz) {   // 2026-10-27：町の車道の上なら、横のいちばん近い歩道へ寄せる（碧を車道に立たせない）
  if (!AREAS?.onCarriage?.(out.x, out.z)) return; const ox = out.x, oz = out.z, oy = out.y;
  if (MOBILE) { const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw); for (const [ff, ss] of [[5, .5], [5, -.5], [5, 0], [6.5, .8], [6.5, -.8], [4, .3]]) { const x = CAM.pos.x + fx * ff + rx * ss, z = CAM.pos.z + fz * ff + rz * ss; if (!AREAS.onCarriage(x, z)) { out.x = x; out.z = z; out.y = groundY(x, z); return; } } }   // スマホ：見る人が歩道にいるので、その歩道の少し前に立つ for (let d = .5; d <= 10; d += .5) for (const sg of [1, -1]) { const x = out.x + rx * d * sg, z = out.z + rz * d * sg; if (!AREAS.onCarriage(x, z)) { out.x = x + rx * 1.1 * sg; out.z = z + rz * 1.1 * sg; out.y = groundY(out.x, out.z); if (!aoiOnScreen(out)) { out.x = ox; out.z = oz; out.y = oy; } return; } }   /* 歩道の上で画面に入らなければ、元の位置のまま（見えない碧にしない） */
}
function aoiOnScreen(out) {   // 歩道へ寄せて画面の外に出たら、歩道の上を前へずらして画面の内へ（スマホの細い画面）
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw);
  for (let k = 0; k < 16; k++) { const v = _pv3.set(out.x, out.y + .8, out.z).project(camera), px = (v.x * .5 + .5) * innerWidth; if (v.z < 1 && px > 80 && px < innerWidth - 80 && !AREAS.onCarriage(out.x, out.z)) return true; out.x += fx * 2.5; out.z += fz * 2.5; out.y = groundY(out.x, out.z); } return false;
}
function aoiSpot(out) {   // 見る人の斜め前（道の中心の側）。体の向き（歩く向き）を基準にするので、見回しても碧は動かない
  const f = MOBILE ? 5.0 : 3.3, s = MOBILE ? .32 : 1.3;   // 2026-10-26 3（採点「PC で足もとが切れる・スマホでボタンに隠れる」）：少し離れて立つ   // スマホは少し離れて、全身が画面の右寄りに入るように   // 視界のまんなかをあけて、斜め前の端寄りに
  const vy = CAM.yaw + (MOBILE ? (CAM.look || 0) : 0), fx = -Math.sin(vy), fz = -Math.cos(vy), n = nearestOnLine(CAM.pos.x, CAM.pos.z), a = atD(n.d);   /* 10-28 夜 8：スマホは見ている向きの前に立つ */
  const rx = -fz, rz = fx, side = PANEL.cur && !MOBILE ? -1 : ((a.x - CAM.pos.x) * rx + (a.z - CAM.pos.z) * rz) >= 0 ? 1 : -1;   // PC で右に札を開いているあいだは、碧は左寄りに（札に隠れない）
  // 2026-10-26 3：参道から離れたエリア（東口・西口・新都心・公園）では、参道の中心へ引っぱらない（スマホで碧が画面の端で切れていた）。右寄りに固定し、道の上へ寄せる
  if (Math.hypot(a.x - CAM.pos.x, a.z - CAM.pos.z) > 30) { const c = aoiPick(fx, fz, rx, rz, MOBILE ? f : f + .7);   /* PC は少し離して足もとまで */ out.set(CAM.pos.x + fx * c[0] + rx * c[1], 0, CAM.pos.z + fz * c[0] + rz * c[1]); out.y = groundY(out.x, out.z); aoiOffRoad(out, rx, rz); return out; }
  { const c = MOBILE ? aoiPick(fx, fz, rx, rz, f, [[f, s * side], [f, (s + .3) * side], [f, -.15 * side], [f, (s - .35) * side], [f * .85, (s + .15) * side]]) : [f, s * side];   /* 2026-10-26 17：スマホは参道の近くでも目印の球と重ならない立ち位置を選ぶ（池の球の列） */
    out.set(CAM.pos.x + fx * c[0] + rx * c[1], 0, CAM.pos.z + fz * c[0] + rz * c[1]); }
  aoiOffRoad(out, rx, rz);
  for (let k = 0; k < 24 && blocked(out.x, out.z); k++) { const dx = a.x - out.x, dz = a.z - out.z, l = Math.hypot(dx, dz) || 1; out.x += dx / l * .35; out.z += dz / l * .35; }   // 碧も植え込み・幹・池には立たない（道の中心の側へ寄る）
  out.y = groundY(out.x, out.z); return out;
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
const _ndc = new THREE.Vector3();
function stepAoi(dt) {
  if (!AOI.m || !AOI.root.visible) return;
  aoiSpot(_ap);
  const P = AOI.m.pos, dx = _ap.x - P.x, dz = _ap.z - P.z, dist = Math.hypot(dx, dz);
  if (dist > 18) { AOI.m.teleport(_ap.x, _ap.z, CAM.yaw + Math.PI); AOI.v = 0; }
  else {
    const edge = MOBILE && Math.abs(_ndc.copy(P).setY(P.y + 1).project(camera).x) > .4;   /* 10-28 夜 8：375px で碧が画面の端に寄ったら、立ち位置へ戻る（川越・渋谷と同じ） */
    const go = WALK.moving ? dist > .25 : dist > (AOI.v > .1 ? .3 : edge ? .2 : 1.3);
    const want = go ? Math.min(2.9, dist * 1.4 + (WALK.moving ? WALK.speed * .6 : 0)) : 0;
    AOI.v = (AOI.v || 0) + Math.max(-(PANEL.cur ? 3 : 1.8) * dt, Math.min((PANEL.cur ? 2.4 : 1.0) * dt, want - (AOI.v || 0)));   // 札を開いたときの立ち位置の入れかえは、きびきびと（解説のあいだ横を向いたままにしない）
    if ((AOI.v > .02 || want > 0) && dist > .01) { const st = Math.min(dist, AOI.v * dt); AOI.m.drive(P.x + dx / dist * st, P.z + dz / dist * st); }
    else { if (AOI.v !== 0 || AOI.m.driven) AOI.m.walkTo(null); AOI.v = 0; { const toCam = Math.atan2(CAM.pos.x - P.x, CAM.pos.z - P.z); AOI.m.faceTo(AOI.focus ? toCam + Math.max(-.9, Math.min(.9, wrap(Math.atan2(AOI.focus.x - P.x, AOI.focus.z - P.z) - toCam) * .4)) : toCam + 0 * Math.sign(wrap(CAM.yaw + Math.PI - toCam) || 1)); } }   // 2026-10-26 3：待つあいだは真正面で立ちつくさず、行く先へ少し体をひらく（話すときは見る人へほぼ正面）。2026-10-23：角の平均を回りこみなしで（物が後ろにあるとき、背を向けて話していた）。体は見る人へ、物へは半分まで
  }
  // 話していないときは、ときどき近くの物（層の目じるし・木）へ目をやり、また見る人へ戻す（ずっと正面で立ちつくさない）
  AOI.gT = (AOI.gT ?? 5) - dt;
  if (!AOI.focus && AOI.gT <= 0) {
    if (AOI.glance) { AOI.glance = null; AOI.gT = 10 + Math.random() * 8; }   /* 2026-10-26 3：よそ見は短く・まれに（横を向いたまま止まって見えた） */
    else { let best = null, bd = 1e9; for (const L of LAYER.objs) { if (!L.root.visible) continue; const d = Math.hypot(L.o.x - P.x, L.o.z - P.z); if (d > 3 && d < 22 && d < bd) { bd = d; best = L; } }
      AOI.glance = best ? best.glyph.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(P.x - Math.sin(CAM.yaw) * 12, P.y + 6 + Math.random() * 4, P.z - Math.cos(CAM.yaw) * 12); AOI.gT = .9 + Math.random() * .6; }
  }
  if (!AOI.focus) AOI.m.lookAt(AOI.glance || camera.position);
  // 2026-10-26 3（採点「目を閉じかけたまま止まる」）：待つあいだは、ときどき目をひらいた表情へ寄せる（話すあいだはしない）
  AOI.eT = (AOI.eT ?? 2) - dt; if (AOI.eT <= 0) { AOI.eT = 5 + Math.random() * 3; if (!voiceQ && (AOI.v || 0) < .05) AOI.m.express("curious", .35, 4); }   // 2026-10-26 3：目を見る人へ合わせる（焦点のない目にしない）
  // 2026-10-26 3（採点「待つ姿が固い・指が板のよう」）：共通部品は書き換えず、アプリの側で ①指に、指ごとに違う小さな曲がりと開き（ゆっくり変わる）を足し、②そのあとで vrm を進める
  // 2026-10-26 3（採点 P1「腕をまっすぐ下げた硬い立ち姿」）：共通部品は書き換えず、待つあいだは手を前で組む時間を長く、下ろす時間を短く（共通部品の状態を、このアプリの中でだけ寄せる）
  { const S2 = AOI.m.s; if (S2 && S2.claspHold != null) { if (!S2.claspOn && S2.claspHold > 2.5) S2.claspHold = 2.5; if (S2.claspOn && !S2.claspExt) { S2.claspHold += 6 + 4 * Math.random(); S2.claspExt = true; } if (!S2.claspOn) S2.claspExt = false; } }
  AOI.m.update(dt, camera, { vrmUpdate: false });
  aoiFingers(dt); aoiElbows(); aoiShadow(); aoiEyes();
  AOI.m.vrm.update(dt); AOI.m.afterVrmUpdate(dt);
}
const _fq = new THREE.Quaternion(), _fe = new THREE.Euler();
/* 2026-10-27 夜（採点「目を閉じた顔で止まる」）：共通部品は書き換えず、アプリの側で ①まばたきの途中で止まったら（0.45 秒を超えたら）ひらく、②まばたきの外では、まぶたの閉じを 2 割までに抑える（視線で下がるまぶた・下まぶたの形と重なって目が線にならない） */
function aoiEyes() {
  const M = AOI.m, em = M?.vrm?.expressionManager; if (!em) return; const B = M.blink;
  if (B && B.t >= 0 && B.t > .45) { B.t = -1; B.v = 0; B.next = 2 + Math.random() * 2; }
  if (B && B.t < 0 && !(M.eyesClosed > 0)) { const v = em.getValue("blink") || 0; if (v > .2) em.setValue("blink", .2); }
  for (const ch of ["lidLow", "cheek"]) { if (em.getExpression?.(ch)) { const v = em.getValue(ch) || 0; if (v > .35) em.setValue(ch, .35); } }
}
// 2026-10-26 3（採点「腕を下ろしたとき手が体の横で硬い」）：腕を下ろしているあいだだけ、肘を少し曲げる（共通部品が一こまおきに休むこまは二重に足さない）
function aoiElbows() {
  const M = AOI.m, S2 = M.s, w = Math.max(0, 1 - (S2?.clasp?.v || 0) * 2.5) * (M.speaking ? .5 : 1); if (w < .02) return;
  for (const sd of ["left", "right"]) { const b = M.bones?.[sd + "LowerArm"], h = M.bones?.[sd + "Hand"]; if (!b) continue; if (b.userData.qa && b.quaternion.equals(b.userData.qa)) continue;
    const sg = sd === "left" ? 1 : -1; b.quaternion.multiply(_fq.setFromEuler(_fe.set(0, sg * -.22 * w, 0))); (b.userData.qa ||= new THREE.Quaternion()).copy(b.quaternion);
  }   /* 手首は回さない（袖に手が埋まって見えた） */
}
// 足もとの接地の陰（スマホでも）：やわらかな丸い陰を碧の足もとに
let AOISH = null;
function aoiShadow() {
  if (!AOISH) { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,.86)"); gr.addColorStop(.28, "rgba(0,0,0,.6)"); gr.addColorStop(.6, "rgba(0,0,0,.24)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    AOISH = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false, toneMapped: false })); AOISH.renderOrder = 1; world.add(AOISH); }
  const p = AOI.root.position; AOISH.visible = AOI.root.visible; AOISH.position.set(p.x, groundY(p.x, p.z) + .03, p.z); AOISH.rotation.y = AOI.m.yaw || 0;
}
function plantKeyaki(C) {   // けやきひろばの木を、参道と同じケヤキの形・質で（大きさは少しずつ違う）
  const go = () => { const K = TREE.kMid; if (!K || C.dead) return !!C.dead; const L = C.lmTrees, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
    for (const [geo, mat] of [[K.bgeo, K.bm], [K.lgeo, K.lm]]) { const im = new THREE.InstancedMesh(geo, mat, L.length); L.forEach(([x, y, z, ks], i) => { const k = ks ?? (.55 + .2 * ((Math.sin(x * 12.9 + z * 7.1) + 1) / 2)); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), x * 1.7 + z); M4.compose(P.set(x, y, z), Q, S.set(k, k, k)); im.setMatrixAt(i, M4); }); im.frustumCulled = false; C.g.add(im); } return true; };
  if (!go()) { const t = setInterval(() => { if (go()) clearInterval(t); }, 500); }
}
function aoiFingers(dt) {
  const M = AOI.m; if (!M.fingers || RM) return; const t = (AOI.ft = (AOI.ft || 0) + dt);
  const SP = { Index: .07, Middle: .015, Ring: -.03, Little: -.08 }, CU = { Index: .07, Middle: .11, Ring: .15, Little: .19 };   // 指を軽く丸める
  for (const [b, sd, f, j] of M.fingers) { if (f === "Thumb" || j === "Metacarpal") continue;
    if (b.userData.qa && b.quaternion.equals(b.userData.qa)) continue;   // 共通部品が一こまおきに指を休ませるこま（同じ値のまま）は、二重に足さない
    const sg = sd === "left" ? 1 : -1, ph = (sd === "left" ? 0 : 2.3) + f.length * 1.1, w = Math.sin(t * .31 + ph) * .5 + Math.sin(t * .13 + ph * 1.7) * .5;
    const c = (CU[f] + .025 * w) * (j === "Proximal" ? 1 : j === "Intermediate" ? 1.25 : .9), y = j === "Proximal" ? SP[f] * (1 + .25 * w) : 0;
    b.quaternion.multiply(_fq.setFromEuler(_fe.set(0, sg * y, -sg * c))); (b.userData.qa ||= new THREE.Quaternion()).copy(b.quaternion); }
}

/* ---------- かさねっこ（小さな環境エージェント）：層の地点のそばに、その層の色の子がいる（2026-10-23 本人「かさねっこを、川越と氷川にたくさん入れてください」）
   触れると、点の吹き出しで応え、碧がその地点の典拠つきの記録を訳して読む（いまの札と声の仕組み）。遠くの物陰から覗く・層の地点へ案内する（一度したら、しばらく来ない）。
   歩くのは歩道・石畳・砂利の上だけ（車道・植え込み・幹・池・燈籠には入らない）。遠くは描かず、起動のあと（道を読み終えてから）読む。部品＝web/kit/envAgents/kasane.js */
const KASA = { herd: null, p: null, cur: null, ok: null, n: 0, miss: 0, noCover: 0, bins: 0 };
const KASA_SURF = /^(sidewalk|granite_light|granite_plaza|granite_black|granite_band|washed|sand|gravel)\|/;   // stone（縁石・石垣）の上には乗らない
function kasaCell(x, z) { if (!COLL) return -1; const i = Math.floor((x - COLL.x0) / COLL.c), j = Math.floor((z - COLL.z0) / COLL.c); return i >= 0 && j >= 0 && i < COLL.nx && j < COLL.nz ? j * COLL.nx + i : -1; }
// 2026-10-25 採点「鳥居の石の台から体が突き出て、埋まって見える」→ 鳥居・楼門の柱と根もとの台（地面に立つ小さな部分）の足もと＋1 m には（台の向こうから先が生えて見えない）、かさねっこは立たない
const KNO = { n: -1, b: [] };
function kasaNo(x, z) {
  const n = structGroup ? structGroup.children.length : 0;
  if (n !== KNO.n) { KNO.n = n; KNO.b.length = 0; const bb = new THREE.Box3();
    for (const o of structGroup?.children || []) if (/^torii_|^romon$/.test(o.name)) o.traverse(m => { if (!m.isMesh) return; bb.setFromObject(m); const sx = bb.max.x - bb.min.x, sz = bb.max.z - bb.min.z; if (sx < 3.2 && sz < 3.2 && bb.min.y < groundY((bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2) + .6) KNO.b.push([bb.min.x - 1, bb.max.x + 1, bb.min.z - 1, bb.max.z + 1]); }); }
  for (const b of KNO.b) if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) return true; return false;
}
function kasaSurf(x, z) { const k = kasaCell(x, z); return k >= 0 && KASA.ok[k] === 1 && !kasaNo(x, z); }
function kasaPeek(x, z) { const k = kasaCell(x, z); return k >= 0 && KASA.ok[k] >= 1 && KASA.ok[k] <= 3 && !kasaNo(x, z); }   // 覗く所：歩ける面と、並木の根もと・植え込みの縁（低木の株のある所は除く。縁石の陰から体の半分が出る。そこを歩きまわりはしない）
function kasaSee(x, z) {   // その点から人の方へ 5 m、低木の株（4）がなければ見える
  const c = camera.position, dx = c.x - x, dz = c.z - z, L = Math.hypot(dx, dz) || 1; for (let u = .3; u < Math.min(5, L); u += .25) { const k = kasaCell(x + dx / L * u, z + dz / L * u); if (k >= 0 && KASA.ok[k] === 4) return false; } return true; }
function kasaOk(x, z) { return kasaSurf(x, z) && !blocked(x, z); }
function kasaRaster(o, val = 1) {   // 歩ける面（歩道・石畳・砂利）を真上から塗る
  const g = o.geometry, P = g.attributes.position, I = g.index, n = I ? I.count : P.count, v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], c = COLL.c;
  for (let t = 0; t < n; t += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(P, I ? I.getX(t + k) : t + k).applyMatrix4(o.matrixWorld);
    const [A, B, C] = v, ar = (B.x - A.x) * (C.z - A.z) - (C.x - A.x) * (B.z - A.z); if (Math.abs(ar) < 1e-6) continue;
    for (let z = Math.floor(Math.min(A.z, B.z, C.z) / c) * c + c / 2; z < Math.max(A.z, B.z, C.z); z += c) for (let x = Math.floor(Math.min(A.x, B.x, C.x) / c) * c + c / 2; x < Math.max(A.x, B.x, C.x); x += c) {
      const w0 = ((B.x - x) * (C.z - z) - (C.x - x) * (B.z - z)) / ar, w1 = ((C.x - x) * (A.z - z) - (A.x - x) * (C.z - z)) / ar;
      if (w0 >= 0 && w1 >= 0 && 1 - w0 - w1 >= 0) { const k = kasaCell(x, z); if (k >= 0) KASA.ok[k] = Math.max(KASA.ok[k], val); }
    }
  }
}
function loadKasane() {
  if (KASA.p) return KASA.p;
  return KASA.p = (async () => {
    await loadLate(); if (!roadGroup || !COLL) return;
    const M = await import("../kit/envAgents/kasane.js?v=b1");
    KASA.ok = new Uint8Array(COLL.nx * COLL.nz); roadGroup.traverse(o => { if (o.isMesh && /^(roots|bed|lawn)\|/.test(o.name)) kasaRaster(o, 2); }); roadGroup.traverse(o => { if (o.isMesh && KASA_SURF.test(o.name)) kasaRaster(o, 1); });
    await VEG.p?.catch(() => { });
    for (const S of VEG.sp) if (S.s <= 2 || S.s === 7) for (let i = 0; i < S.m; i++) { const x = S.xs[i * 6], z = S.xs[i * 6 + 2], r = S.xs[i * 6 + 3] * .55 + .2, c = COLL.c; for (let dz = -r; dz <= r; dz += c) for (let dx = -r; dx <= r; dx += c) if (dx * dx + dz * dz <= r * r) { const k = kasaCell(x + dx, z + dz); if (k >= 0 && KASA.ok[k] === 2) KASA.ok[k] = 4; } }   // 低木の株のまわり
    for (let pass = 0; pass < 2; pass++) { const g = KASA.ok, nx = COLL.nx, h = g.slice(); for (let k = nx; k < g.length - nx; k++) if (h[k] === 1 && (h[k - 1] !== 1 || h[k + 1] !== 1 || h[k - nx] !== 1 || h[k + nx] !== 1)) g[k] = [h[k - 1], h[k + 1], h[k - nx], h[k + nx]].some(v => v >= 2) ? 3 : 0; }   // 縁から 2 こま（約 1 m）は歩かない（縁石の上や陰に入らない）   // 縁は 1 こま削る（縁石の外へはみ出さない）
    const herd = KASA.herd = new M.KasaneHerd({ scene: world, camera, groundAt: groundY, walkable: kasaOk, walkSurface: kasaPeek, canSee: kasaSee, hud: COLOR5, avoid: () => AOI.root?.visible ? AOI.root.position : null, scale: MOBILE ? 3.2 : 2.9, mobile: MOBILE, maxDist: MOBILE ? 32 : 40, max: 24,
      muted: () => !soundOn, minCamDist: MOBILE ? 1.7 : 1.5, view: () => false, viewTitle: a => a.data?.o?.title || "", viewSafe: () => ({ left: MOBILE ? 118 : 250, top: MOBILE ? 176 : 80 }) });   // 窓は層の一覧にかけない   // v3（2026-10-23 夜）：大きさは部品で前の 0.75 倍・鳴き声は「声と音」に従う・目の前に入りすぎない
    const R = (() => { let s = 20261023; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    const near = (x, z, Rm = 7) => { if (kasaOk(x, z)) return [x, z]; for (let r = .5; r <= Rm; r += .5) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + r, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (kasaOk(px, pz)) return [px, pz]; } return null; };
    // 物陰：並木の幹と、石・木の燈籠（見かけの太さ）
    const covers = []; for (const t of D.trees) covers.push({ x: t[0], z: t[2], r: Math.max(.24, .3 * t[4]) });
    for (const s of D.structs) if (/^(ishidoro|mokutoro|komainu|hyoseki|shagohi)/.test(s.id)) covers.push({ x: s.p[0], z: s.p[2], r: /^(ishidoro|mokutoro)/.test(s.id) ? .42 : .36 });
    const coverNear = (x, z) => { let best = null, bd = 12; for (const c of covers) { const d = Math.hypot(c.x - x, c.z - z); if (d < bd && d > .8 && [0, 1, 2, 3, 4, 5, 6, 7].filter(i => { const px = c.x + Math.cos(i * .785) * (c.r + .1), pz = c.z + Math.sin(i * .785) * (c.r + .1), L = Math.hypot(px - x, pz - z); if (!kasaPeek(px, pz)) return false; for (let u = 0; u <= L; u += .25) if (!kasaPeek(x + (px - x) * u / L, z + (pz - z) * u / L)) return false; return true; }).length >= 2) { bd = d; best = c; } } return best; };
    // 2026-10-23 夜 本人「数が多すぎます」＝道のり 56 m ごとに、その区間の層の地点のそばへ 2〜4 体の群れ（全部で 70〜90 体・近くで画面に入るのは 1〜2 群れ）。
    //   本人「同じ色だけの集団でなく、多少混ざって…メインとなるレイヤーが多く」＝群れの先頭とおよそ 7 割は、その地点の層の色。ほかの層の子は、同じ区間のその層の地点の話をする
    const BIN = 56, bins = new Map();
    for (const L of LAYER.objs) { const o = L.o; if (o.sho) continue; const n = nearestOnLine(o.x, o.z); if (n.dist > 40) continue; const b = Math.floor(n.d / BIN); if (!bins.has(b)) bins.set(b, []); bins.get(b).push(L); }
    const used = { sight: 0, touch: 0, sound: 0, nature: 0, culture: 0 }; let k = 0;
    const pickL = (list, not = []) => { let best = null, bs = 1e9; for (const L of list) { if (not.includes(L) || L._kmiss) continue; const ly = top5(L.o.layer); if (!(ly in used)) continue; const sc = used[ly] + R() * .9; if (sc < bs) { bs = sc; best = L; } } return best; };
    const place = (list, not) => { for (let tries = 0; tries < 6; tries++) { const L = pickL(list, not); if (!L) return null; const p = near(L.o.x, L.o.z); if (p) { used[top5(L.o.layer)]++; return { L, p }; } L._kmiss = 1; } return null; };
    const add = (L, p, o = {}) => { const a = herd.add(top5(L.o.layer), { x: p[0], z: p[1], radius: 1.6, data: L, target: { x: L.o.x, z: L.o.z }, ...o }); a.d = nearestOnLine(p[0], p[1]).d; return a; };
    KASA.bins = bins.size;
    for (const b of [...bins.keys()].sort((a, c) => a - c)) {   // 2026-10-23 本人「一人より、群れでわちゃわちゃしている方が可愛い」＝区間ごとに 3〜5 体の群れ（色は混ざってよい）
      const list = bins.get(b), A = place(list, []); if (!A) { KASA.miss++; continue; } k++;
      const main = top5(A.L.o.layer), n = [2, 3, 2, 2, 3][k % 5], lays = M.kasaneMix(main, n, { mix: .3, rnd: R }), mem = [], not = [A.L];
      const nb = [...(bins.get(b - 1) || []), ...(bins.get(b + 1) || [])];
      for (const ly of lays) {
        let L = mem.length ? [...list, ...nb].find(X => !not.includes(X) && top5(X.o.layer) === ly) : A.L; if (!L) L = ly === main ? A.L : null;
        if (!L) { const Lm = list.find(X => !not.includes(X) && top5(X.o.layer) === main) || A.L; mem.push({ layer: main, data: Lm, target: { x: Lm.o.x, z: Lm.o.z } }); continue; }
        if (L !== A.L) not.push(L); used[top5(L.o.layer)]++; mem.push({ layer: ly, data: L, target: { x: L.o.x, z: L.o.z } });
      }
      const G = herd.addGroup(mem, { x: A.p[0], z: A.p[1], radius: 2.6, role: k % 3 === 0 ? "watch" : "" }); for (const a of G.members) a.d = nearestOnLine(A.p[0], A.p[1]).d;
    }
    KASA.n = herd.agents.length; QW.KASA = KASA; herd.setLayers(LAYER.worn);
    await herd.load();
  })().catch(e => console.warn("かさねっこ：", e?.message ?? e));
}
function touchKasane(a) {
  KASA.cur = a; a.herd.touch(a, () => { if (KASA.cur !== a || QW.mode !== "walk") return; openObj(a.data); KASA.cur = a; a.state = "focus"; a.focusTo = new THREE.Vector2(camera.position.x, camera.position.z);
    if (AOI.m) { const p = a.center(new THREE.Vector3()); AOI.focus = p; AOI.m.lookAt(p); setTimeout(() => { if (AOI.focus === p) { AOI.focus = null; AOI.m?.lookAt(camera.position.clone()); } }, 1600); } });   // 碧は、触れた子へ目をやってから、見る人へ向きなおって訳す
}

/* ---------- 7 つのエリア（2026-10-26 本人「大宮公園、氷川神社、氷川参道、さいたま新都心周辺、盆栽村、大宮駅（東口）、大宮駅（西口）」）
   輪郭と色＝zones.json、中身＝areas/<id>.json（areas.js が近いエリアだけ読み、離れたら捨てる）。ここでは地点の印・かさねっこ・降りる先をつなぐ */
let AREAS = null; const AREA = { herds: [], marks: [], M: null, halos: {} };
AREA.haloTex = null;
AREA.haloMat = c => AREA.halos[c] ||= (() => { if (!AREA.haloTex) { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const x = cv.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(.3, "rgba(255,255,255,.3)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); AREA.haloTex = new THREE.CanvasTexture(cv); }
  return new THREE.SpriteMaterial({ map: AREA.haloTex, color: c, transparent: true, opacity: .7, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }); })();   /* 2026-10-26 15：暈が建物や地面を透けて白い丸に見えた → 奥行きで隠す */
function initAreas() {
  if (AREAS) return;
  const g = D.dem, inDem = (x, z) => x > g.x0 && z > g.z0 && x < g.x0 + g.cell * (g.nx - 1) && z < g.z0 + g.cell * (g.nz - 1);
  QW.AREA = AREA; AREAS = QW.AREAS = makeAreas({ THREE, world, camera, groundY, BASE, VER, mobile: MOBILE, rm: RM, inDem, tex,
    onChunk: (Z, J, C) => { if (C.lmTrees) plantKeyaki(C); for (const m of [C.road, ...(C.grounds || [])]) if (m) pickables.push(m); areaPlaces(Z, J, C); areaKasane(Z, J, C); },
    onUnchunk: C => { for (const m of [C.road, ...(C.grounds || [])]) { const i = pickables.indexOf(m); if (i >= 0) pickables.splice(i, 1); }
      AREA.marks = AREA.marks.filter(L => L.chunk !== C); AREA.qm?.remove(L => L.chunk === C); if (C.herd) { C.herd.dispose(); AREA.herds = AREA.herds.filter(h => h !== C.herd); if (KASA.cur?.herd === C.herd) KASA.cur = null; } C.dead = true; },
    onPick: Z => areaDescend(Z) });
  AREAS.load();
}
function areaDescend(Z) {
  if (QW.mode !== "sky") return; AREAS.highlight(Z.id); unlockAudio();
  AREAS.ensure(Z.id).then(() => {
    let [x, z] = Z.start; if (Z.ground || Z.id === "koen") { const p = AREAS.snap(x, z); if (p) [x, z] = p; } [x, z] = camOffRoad(x, z, 0);
    const n = nearestOnLine(x, z), d = Math.max(-20, Math.min(1985, n.d)), i = D.starts.reduce((b, t, k) => Math.abs(t.d - d) < Math.abs(D.starts[b].d - d) ? k : b, 0);
    if (START.sel < 0) selectStart(i); descendTo(i, { x, z, d }); AREAS.highlight(null);
  });
}
function areaPlaces(Z, J, C) {   // 典拠のある地点：層の色の小さな球と、細い光の柱（触れると札と出典）
  if (J.lip) Object.assign(D.lip ||= {}, J.lip);   // 2026-10-26 地点の碧の声の口の動き
  for (const p of J.p) {
    const y = groundY(p.x, p.z), c = COLOR5[p.layer] || "#e8eef2", G = new THREE.Group(); G.position.set(p.x, y, p.z);
    // 2026-10-26 2：球が画面で小さく見えた → 球を大きく・まわりに光の暈（いつも見る人を向く）・足もとに輪。遠くでも見つけられる
    // 2026-10-27 夜 本人：町の地点も参道と同じ小さく強い Qualia の印に（平たい円盤・大きな球をやめる）
    const ball = new THREE.Object3D(); ball.position.y = 2.1; ball.scale.setScalar(1.6); G.add(ball); C.g.add(G);
    const L = { o: { id: p.id, layer: p.layer, title: p.title, x: p.x, z: p.z, y, ll: p.ll, lines: p.lines.map(l => typeof l === "string" ? { t: l } : l), more: [], src: p.src, how: "記録", note: null, exp: null }, glyph: ball, mark: G, chunk: C };
    L.root = G; L.show = 1; AREA.marks.push(L); C.places.push(L);
    if (!AREA.qm) AREA.qm = makeQMarks(THREE, world, 160, MOBILE, QM_OPT); AREA.qm.add(L, c, top5(p.layer));
  }
}
const _am = new THREE.Vector3();
function pickAreaMark(x, y) {
  let best = null, bd = 60 * 60;
  for (const L of AREA.marks) { if (!L.mark.visible) continue; L.glyph.getWorldPosition(_am); if (_am.distanceTo(camera.position) > 60) continue; _am.project(camera); if (_am.z > 1) continue; const sx = (_am.x + 1) / 2 * innerWidth, sy = (1 - _am.y) / 2 * innerHeight, d = (sx - x) ** 2 + (sy - y) ** 2; if (d < bd) { bd = d; best = L; } }
  return best;
}
async function areaKasane(Z, J, C) {   // かさねっこ：各エリアに群れ（地点のそばと、道ぞいの数か所）。近くだけ描く
  if (!J.p.length) return;
  const M = AREA.M ||= await import("../kit/envAgents/kasane.js?v=b1"); if (C.dead) return;
  const ok = (x, z) => AREAS.walkable(x, z);
  const herd = new M.KasaneHerd({ scene: world, camera, groundAt: groundY, walkable: ok, walkSurface: ok, canSee: () => true, hud: COLOR5, avoid: () => AOI.root?.visible ? AOI.root.position : null, scale: MOBILE ? 3.2 : 2.9, mobile: MOBILE, maxDist: MOBILE ? 36 : 46, max: 22,
    muted: () => !soundOn, minCamDist: MOBILE ? 1.7 : 1.5, view: () => false, viewTitle: a => a.data?.o?.title || "", viewSafe: () => ({ left: MOBILE ? 118 : 250, top: MOBILE ? 176 : 80 }) });
  let s = 0; for (const ch of Z.id) s = s * 31 + ch.charCodeAt(0); const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const spots = [];
  for (const L of C.places) { const q = AREAS.snap(L.o.x, L.o.z); if (q) spots.push({ q, L }); }
  const W = J.w.filter(w => w.length > 5); for (let k = 0; k < 12 && W.length; k++) { const w = W[Math.floor(R() * W.length)], i = 1 + 2 * Math.floor(R() * ((w.length - 1) / 2)); const q = [w[i], w[i + 1]]; let L = null, bd = 1e9; for (const P of C.places) { const d = Math.hypot(P.o.x - q[0], P.o.z - q[1]); if (d < bd) { bd = d; L = P; } } spots.push({ q, L }); }
  spots.forEach(({ q, L }, k) => { const main = L.o.layer === "nature" ? "nature" : "culture", lays = M.kasaneMix(main, [3, 2, 3][k % 3], { mix: .3, rnd: R });
    herd.addGroup(lays.map(ly => ({ layer: ly, data: L, target: { x: L.o.x, z: L.o.z } })), { x: q[0], z: q[1], radius: 2.6, role: k % 3 === 2 ? "watch" : "" }); });
  herd.setLayers(LAYER.worn); await herd.load(); if (C.dead) { herd.dispose(); return; }
  C.herd = herd; AREA.herds.push(herd);
}
function stepAreas(dt) {
  if (!AREAS) return; AREAS.update(dt, QW.mode);
  // 2026-10-26 3：東口・西口・新都心では、参道まわりの半透明の建物（電脳の写し）を出さない（不透明の建物と二重になり、遠くに半透明の箱が残っていた）
  if (AREAS.ready && QW.bldGhost) { const Zc = AREAS.cur; QW.bldGhost.visible = !(Zc && Zc.ground); }
  const busy = !!PANEL.cur || !!voiceQ; for (const h of AREA.herds) h.update(dt, { active: QW.mode === "walk", busy });
  for (const L of AREA.marks) { const on = LAYER.worn.includes(top5(L.o.layer)); L.mark.visible = on && QW.mode !== "sky"; if (on) { const AB = QW._AB, cp = camera.position, dist = Math.hypot(L.o.x - cp.x, L.o.z - cp.z); let tl = 0; if (AB && dist > AB.d + 1 && dist < 60) { const v = _pv3.set(L.o.x, groundY(L.o.x, L.o.z) + 2.1, L.o.z).project(camera); if (v.z < 1 && Math.abs(v.x - AB.x) < AB.hw + .12 && v.y < AB.y1 + .08 && v.y > AB.y0) tl = (AB.y1 + .12 - v.y) * dist * Math.tan(camera.fov * Math.PI / 360); } L.lift = (L.lift || 0) + (tl - (L.lift || 0)) * .08; L.show += ((tl > 0 ? .1 : 1) - L.show) * .15;   /* 2026-10-27 夜：碧の頭の後ろでは、上げるだけでなく薄く */   /* 2026-10-26 17：町の球も碧の頭の後ろに来たら表示だけ上へ */
    L.glyph.position.y = 2.1 + (RM ? 0 : Math.sin(performance.now() / 900 + L.o.x) * .08) + L.lift; } }
}

/* ---------- Qualia/sight：生きものを選んで、その身体へ ---------- */
const EXP_FIG = {
  echo: `<figcaption>おもに、はね返ってくる音で、まわりの形をとらえる。押すたびに前へ音がひろがり、木と地面と建物に当たって戻るまでの時間の順に、点が灯ります。音の速さ（秒速 343 m）で計算し、時間を 16 倍に引きのばした模式です。鳴る音も 16 倍に引きのばした模式の音です。</figcaption>`,
  cones: `<svg viewBox="0 0 320 120" role="img" aria-label="人の三種類と鳥の四種類の錐体の、感じる光の範囲の模式"><defs><linearGradient id="spg" x1="0" x2="1"><stop offset="0" stop-color="#6b4bd8"/><stop offset=".18" stop-color="#5a5cf0"/><stop offset=".38" stop-color="#3fb4e0"/><stop offset=".58" stop-color="#7fe08a"/><stop offset=".78" stop-color="#f2cf5c"/><stop offset="1" stop-color="#ef6a4a"/></linearGradient></defs>
    <rect x="20" y="96" width="280" height="4" fill="url(#spg)" opacity=".85"/><text x="20" y="114" class="t">紫外</text><text x="300" y="114" class="t" text-anchor="end">赤</text>
    <text x="20" y="20" class="t">人：3 種類</text>${[.42, .62, .72].map(c => `<path d="M${20 + 280 * (c - .16)} 52 Q${20 + 280 * c} 18 ${20 + 280 * (c + .16)} 52" class="cu h"/>`).join("")}
    <text x="20" y="66" class="t">鳥：4 種類</text>${[.12, .36, .56, .72].map(c => `<path d="M${20 + 280 * (c - .1)} 92 Q${20 + 280 * c} 64 ${20 + 280 * (c + .1)} 92" class="cu b"/>`).join("")}</svg>
    <figcaption>錐体の数と、感じる光の帯のならび方の模式。山の位置は種や環境で違います（Hart 2001）。画面の色は、人の目への置きかえです。</figcaption>`,
  eye15: `<svg viewBox="0 0 320 70" role="img" aria-label="アオスジアゲハの15種類の光受容細胞が6群に分かれる模式"><defs><linearGradient id="spg2" x1="0" x2="1"><stop offset="0" stop-color="#6b4bd8"/><stop offset=".3" stop-color="#3fb4e0"/><stop offset=".55" stop-color="#7fe08a"/><stop offset=".78" stop-color="#f2cf5c"/><stop offset="1" stop-color="#ef6a4a"/></linearGradient></defs>
    <rect x="20" y="50" width="280" height="4" fill="url(#spg2)" opacity=".85"/>${[[0, 2], [1, 2], [2, 3], [3, 4], [4, 2], [5, 2]].map(([g, n]) => Array.from({ length: n }, (_, k) => `<circle cx="${34 + g * 50 + k * 8}" cy="${32 - (k % 2) * 8}" r="3" class="dt"/>`).join("") + `<text x="${34 + g * 50}" y="66" class="t">${["紫外", "紫", "青", "緑", "橙", "赤"][g]}</text>`).join("")}</svg>
    <figcaption>15 種類の細胞を 6 つの群に分けた、という報告の模式（Chen ほか 2016）。15 の色を見分けるという意味ではありません。複眼の六角の目の並びも模式です。</figcaption>`,
};
const SIGHT = { sp: null, t: 0, pulse: 0, echo: [], post: null, kusu: null, prevExp: 1.02, flap: 0, v: 0, vy: 0, fwd: false, body: null };
function openSightChooser() {
  const box = $("#sightList"); if (!box.childElementCount) for (const sp of D.sight.filter(q => BODY_D[q.id])) {   /* 後ろ姿の 3D の確かめが済んだ生きものだけを選べる（カイツブリは合格まで外す） */
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
  // 2026-10-22 本人「特定の場所ではなく、今いる場所で人間の視点から生き物の環世界に入れ替わるように」→ いま立っている所・向きのまま、目の高さだけが変わる。
  // 例外は、水の上でしか泳げないカイツブリ（神池から離れているときだけ池へ）と、上空の地図から入るとき（まだ地上にいない）
  if (sp.x != null && ((sp.move === "swim" && !(sp.pond && inPoly(CAM.pos.x, CAM.pos.z, sp.pond))) || QW.mode === "sky" || !QW.walked)) { px = sp.x; pz = sp.z; yaw = yawAlong(sp.d + 5); }
  if (sp.move === "crawl" && QW.mode !== "sky") { const n = nearestOnLine(px, pz); if (n.dist < 4.4) { const q = atD(n.d), sd = ((px - q.x) * -q.tz + (pz - q.z) * q.tx) >= 0 ? 1 : -1; px = q.x - q.tz * 4.8 * sd; pz = q.z + q.tx * 4.8 * sd; } }   // ミミズは土の生きもの：石畳の上にいるときは、すぐ横の植え込みの土へ
  if (QW.mode === "sky" && sp.x == null) { const s = D.starts[Math.max(0, START.sel)], a = atD(s.d); px = a.x; pz = a.z; yaw = yawAlong(s.d + 5); }
  let y = groundY(px, pz) + sp.eye; if (sp.move === "swim") { let m = 1e9, far = null, fd = 0; for (const [x, z] of sp.pond) { m = Math.min(m, groundY(x, z)); const d = Math.hypot(x - px, z - pz); if (d > fd) { fd = d; far = [x, z]; } } y = m + .24; const rm = D.structs.find(q => q.id === "romon"); yaw = rm ? Math.atan2(-(rm.p[0] - px), -(rm.p[2] - pz)) : Math.atan2(-(far[0] - px), -(far[1] - pz)); }   // 楼門と社叢の方を向いて浮かぶ
  hideSkyUI(); hideFlyUI(); loadLate(); if (AOI.root) AOI.root.visible = false;
  const from = QW.mode; TWFOG = [from === "sky" ? FOGS.sky() : from === "fly" ? FOGS.fly() : FOGS.walk(), FOGS.walk()]; setMode("descend");
  SIGHT.pending = sp;
  lateP.then(() => tweenTo(new THREE.Vector3(px, y, pz), yaw, sp.move === "crawl" ? -.5 : -.05, from === "sky" ? 2.4 : 1.6, () => {
    CAM.pos.set(px, y, pz); CAM.yaw = yaw; CAM.look = 0; CAM.pitch = sp.move === "crawl" ? -.5 : -.05; SIGHT.sp = sp; SIGHT.t = 0; SIGHT.pending = null; SIGHT.v = SIGHT.vy = 0; showBody(sp);
    setMode("sight"); document.body.dataset.sp = sp.id; showSightUI(sp);
    camera.fov = sp.fov; camera.updateProjectionMatrix();
    setupSightLook(sp);
    if (sp.lines?.length) speakLines(sp.lines, null, { done: () => { TALK.nextT = performance.now() + 3000; } });
  }, 0));
}
function exitSight(quiet = false) {
  const sp = SIGHT.sp; if (!sp) return; SIGHT.sp = null; SIGHT.surf = null; delete document.body.dataset.sp; hideSightUI(); stopEcho(); hideBody();
  teardownSightLook(); camera.fov = MOBILE ? 62 : 55; camera.updateProjectionMatrix();
  if (quiet) return;
  const a = CAM.pos.clone(); corridorClamp(a); const y = groundY(a.x, a.z) + EYE, yaw = CAM.yaw + CAM.look;   // 戻るのも、いまいる所（歩ける所の中）・いまの向きのまま
  TWFOG = [FOGS.walk(), FOGS.walk()]; setMode("descend");
  tweenTo(new THREE.Vector3(a.x, y, a.z), yaw, -.04, 1.2, () => { CAM.pos.set(a.x, y, a.z); CAM.yaw = yaw; CAM.look = 0; CAM.pitch = -.04; enterWalk(); const fr = SIGHT.from; SIGHT.from = null; const t2 = fr ? `いま見た「${fr.o.title}」のあたりを、人の目でもう一度見てみましょう。` : null; const bl = [D.say?.back, t2 ? { t: t2, tc: t2 } : null].filter(Boolean); if (bl.length) speakLines(bl, null); }, 0);   /* 10-29：戻ったら同じ場所を人の目で見なおす一言 */
}
/* 生きものの後ろ姿（2026-10-22 本人「画面上にその生き物の後ろ姿が見えるように」）：肩越しの視点で、画面の下のほうに、少し上の後ろから。
   ヒヨドリ・アブラコウモリは合格した 3D（コウモリは遠く用の形を、画面で小さく）、ほかの種もいまの 3D。寄りすぎない（体の長さの 5 倍ほど離す） */
const BODY = { id: null, m: null, p: null, last: new THREE.Vector3(), spd: 0, scene: null };
function renderBody() {   // 後ろ姿は、生きものの見え方の置きかえ（ぼかし・色）の外に、くっきり重ねる（自分の体は、その目で見た景色の一部ではない）
  if (!BODY.m || !BODY.scene || QW.mode !== "sight") return;
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth(); renderer.render(BODY.scene, camera); renderer.autoClear = ac;
}
const BODY_D = { hiyo: [.9, .36, .62, "far"], koumori: [.85, .24, 0, "far"], aosuji: [.36, .15, .7, "far"], mimizu: [.26, .2], inu: [2.5, .62] };   // カイツブリの 3D は、まだ種の形の確かめが済んでいないので後ろ姿を出さない   // [離す距離 m, 下げる m, 斜めにずらす向き rad, 形]
// 10-22 深夜（採点「ヒヨドリの真後ろの姿が、フードを被った人影に見える」）：飛ぶものは真後ろでなく、斜め後ろの少し上から（翼と尾が読める・合格した画角＝遠く用の飛ぶ姿）
function showBody(sp) {
  hideBody(); if (!BODY_D[sp.id]) return; BODY.id = sp.id; const id = sp.id;
  BODY.p = import("./sight/sightModels.js?v=1").then(({ loadSight }) => loadSight(id, { lod: BODY_D[id][3], shadow: false })).then(m => {
    if (BODY.id !== id) { m.dispose(); return; } BODY.m = m;
    if (!BODY.scene) { BODY.scene = new THREE.Scene(); BODY.scene.environment = QW.env; BODY.hemi = new THREE.HemisphereLight("#dfe9ff", "#4d4636", 1.1); BODY.sun = new THREE.DirectionalLight("#fff1dc", 2.0); BODY.sun.position.set(.4, 1, .3); BODY.scene.add(BODY.hemi, BODY.sun); }
    if (id === "inu") m.object.traverse(o => { if (!o.isMesh) return; for (const mt of [].concat(o.material)) mt.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <dithering_fragment>", "#include <dithering_fragment>\n{ vec3 c0 = gl_FragColor.rgb; gl_FragColor.rgb = max(vec3(0.), vec3(dot(vec3(.367,.861,-.228),c0), dot(vec3(.280,.673,.047),c0), dot(vec3(-.012,.043,.969),c0))); }"); }; });   // 10-22 深夜（採点「二色型の世界で、犬の体だけ元の色で浮く」）：犬の体も、景色と同じ二色型の置きかえで
    const k = id === "koumori" ? 1.6 : id === "hiyo" ? 1.3 : 1; BODY.hemi.intensity = 1.1 * k; BODY.sun.intensity = 2 * k; BODY.scene.add(m.object); BODY.last.copy(camera.position);
    const main = id === "kaitsuburi" ? "swim" : id === "mimizu" ? "crawl" : id === "inu" ? "walk" : "fly"; m.play(main, 0, id === "koumori" ? .6 : 1); BODY.main = main; BODY.cur = main;
  }).catch(e => console.warn("body", e));
}
function hideBody() { BODY.id = null; if (BODY.m) { BODY.m.dispose(); BODY.m = null; } }
function stepBody(dt) {
  const m = BODY.m, sp = SIGHT.sp; if (!m || !sp || QW.mode !== "sight") return;
  const [dd, dn, dy = 0] = BODY_D[sp.id] || [1.5, .3], vyaw = CAM.yaw + CAM.look, o = m.object;
  const fx = -Math.sin(vyaw), fz = -Math.cos(vyaw), cp = camera.position;
  o.position.set(cp.x + fx * dd, cp.y - dn, cp.z + fz * dd);
  if (sp.move === "trot" || sp.move === "crawl") { if ((BODY.sT = (BODY.sT || 0) - dt) <= 0) { BODY.sT = .5; BODY.sOff = surfaceY(o.position.x, o.position.z) - groundY(o.position.x, o.position.z); }   // 描いている地面の面に合わせる（0.5 秒ごと）
    o.position.y = groundY(o.position.x, o.position.z) + (BODY.sOff || 0) + .005; if (sp.move === "crawl") camera.position.y = Math.max(camera.position.y, o.position.y + .2); }
  if (sp.move === "swim") o.position.y = (SIGHT.surf ?? o.position.y) - SIGHT.dive * .6;
  o.rotation.set(sp.move === "fly" || sp.move === "echo" || sp.move === "flutter" ? -SIGHT.vy * .06 : 0, vyaw + Math.PI + (sp.id === "mimizu" ? 1.45 : dy), 0);   // ミミズは真後ろだと棒に見えるので、ほぼ真横の姿に（節と環帯が見える向き）
  const spd = cp.distanceTo(BODY.last) / Math.max(dt, 1e-3); BODY.last.copy(cp); BODY.spd += (spd - BODY.spd) * Math.min(1, dt * 4);
  const still = BODY.spd < .15, want = still && (sp.id === "inu" || sp.id === "kaitsuburi") ? "idle" : BODY.main;   // ミミズはいつもはう（まっすぐ止まると棒に見える）   // 鳥は翼を板のように止めず、いつもはばたく
  if (want !== BODY.cur && m.actions[want]) { m.play(want, .4, sp.id === "koumori" ? .6 : 1); BODY.cur = want; }
  m.update(dt);
}
/* 夕方の空：上は夜の紺、地平の近くに残照（コウモリの飛ぶ時刻。遠くを飛ぶほかのコウモリが空を背に影で見える） */
let DUSK = null;
function duskSky() { if (DUSK) return DUSK; const c = document.createElement("canvas"); c.width = 4; c.height = 256; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#0a1024"); g.addColorStop(.45, "#16203e"); g.addColorStop(.72, "#3a3658"); g.addColorStop(.86, "#7a5a68"); g.addColorStop(1, "#8e6a62"); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  DUSK = new THREE.CanvasTexture(c); DUSK.colorSpace = THREE.SRGBColorSpace; return DUSK; }
/* 見え方の模式（人の目への置きかえ）：画面を一度べつの面へ描き、色・ぼけ・明るさだけを置きかえる */
function setupSightLook(sp) {
  const mode = { hiyo: 1, koumori: 2, aosuji: 3, mimizu: 4, inu: 5, kaitsuburi: 6 }[sp.id] || 0;   // 2026-10-24 コウモリも画面を置きかえる（暗い中で目はあまり使わない・声の輪）   // コウモリは夕方の暗さと反響の点だけ（画面の置きかえはしない）
  if (sp.id === "koumori") {   // 夕方の暗さ：目の手がかりはほとんど使わない模式
    renderer.toneMappingExposure = .24; scene.background = duskSky(); applyFog({ c: new THREE.Color("#0b1226"), n: 20, f: 160 });
  } else if (sp.id === "mimizu") { applyFog({ c: FOG_SKY, n: 4, f: 60 }); }
  else applyFog(FOGS.walk());
  if (sp.id === "aosuji") showKusu(true);
  if (!mode) return;
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(s.x, s.y, { type: THREE.HalfFloatType, samples: MOBILE ? 0 : 4 });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, mode: { value: mode }, res: { value: s.clone() }, time: { value: 0 }, under: { value: 0 }, pulse: { value: 0 }, move: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
    fragmentShader: `uniform sampler2D tDiffuse; uniform int mode; uniform vec2 res; uniform float time; uniform float under; uniform float pulse; uniform float move; varying vec2 vUv;
      vec3 blur(vec2 uv, float r){ vec3 c=vec3(0.); float w=0.; for(int i=-2;i<=2;i++) for(int j=-2;j<=2;j++){ float k=1.-length(vec2(i,j))/3.2; c+=texture2D(tDiffuse, uv+vec2(i,j)*r/res).rgb*k; w+=k; } return c/w; }
      void main(){
        vec2 uv=vUv; vec3 c;
        if(mode==1){   // 鳥：四種類の錐体と油球で色の帯が細くしぼられる、の模式＝色どうしの差を広げる（人の目への置きかえ）
          vec2 q=uv-.5; uv=.5+q*(1.-.14*dot(q,q)); c=texture2D(tDiffuse,uv).rgb; float l=dot(c,vec3(.2126,.7152,.0722)); c=max(vec3(0.),mix(vec3(l),c,1.45));   // 横に広い視野（目が頭の横）＝ふちをゆがめて寄せる
          float sk=smoothstep(.45,.9,uv.y)*smoothstep(.0,.18,c.b-c.r)*smoothstep(.25,.75,l); c+=vec3(.42,.1,.62)*sk*.45;   // 紫外の手がかり（模式）：空の散乱光は紫外を多くふくむ、を紫で重ねる。紫外は測っていない
        } else if(mode==3){   // 蝶：複眼の六角の並び（模式）と、人よりあらい像
          vec2 q0=uv-.5; float rq=length(q0*vec2(res.x/res.y,1.)); uv=.5+q0*(1.-.10*dot(q0,q0));   // 2026-10-25 画面のモザイクに見せない：真ん中は像がやわらかく、ふちほど小さな目（個眼）の並びが見える。広い視野＝ふちを少し寄せる
          float cs=res.y/130.; vec2 p=uv*res/cs; vec2 r=vec2(1.,1.732), h=r*.5; vec2 a=mod(p,r)-h, b=mod(p-h,r)-h; vec2 g=dot(a,a)<dot(b,b)?a:b; vec2 cell=(p-g)*cs/res;
          float edge=smoothstep(.3,.75,rq); c=mix(blur(uv, 2.2), blur(cell, 2.6), .55*edge);   // 真ん中には網をかけない（ふちだけ）
          float lr=length(g); c*=1.+.06*edge*(1.-smoothstep(0.,.4,lr))-.16*edge*smoothstep(.36,.5,lr);   // 一つひとつの個眼のレンズ：真ん中が少し明るく、ふちが細く暗い（模式）
          c=mix(vec3(dot(c,vec3(.333))),c,1.2);
          float l3=dot(c,vec3(.333)); float uk=smoothstep(.5,1.,uv.y)*smoothstep(0.,.16,c.b-c.r)*.7+smoothstep(.62,.95,l3)*.35; c=mix(c,c+vec3(.32,.04,.5),uk*.55);   // 紫外の手がかり（模式）を紫で重ねる。紫外は測っていない
          c+=vec3(.06,.1,.02)*smoothstep(.2,.6,c.g-c.r)*.8;   // 緑の葉（クスノキの若葉ほか）の手がかり
        } else if(mode==4){   // ミミズ：目はない。皮ふで受けとる明るさだけの模式（形はほとんど分からない）
          vec2 dq=(vUv-vec2(.5,-.15))*vec2(res.x/res.y,1.); float rr=length(dq), wv=sin(rr*38.-time*8.)*move; uv+=normalize(dq+1e-4)*wv*.006;   // 地面の振動（歩くたびに体へ伝わる・模式）で、明暗のむらがゆれる
          c=blur(uv, 22.); c=mix(c, blur(uv, 40.), .5); float l=dot(c,vec3(.2126,.7152,.0722)); l=smoothstep(.05,.9,l);   // 形は分からず、明暗のむらだけ c=vec3(l*l*1.1)*vec3(1.,.95,.88);
        } else if(mode==2){   // コウモリ：夕方の暗さでは目はあまり使わず、声の反響で形をとらえる（模式）。声を出すと、まわりへ輪がひろがる
          c=texture2D(tDiffuse,uv).rgb; float l=dot(c,vec3(.2126,.7152,.0722)); l=pow(clamp(l,0.,1.),.74); c=vec3(l)*vec3(.6,.66,1.)*1.12+vec3(.01,.013,.035);   // 2026-10-25 375px で暗すぎた：夕方の暗さは残し、木と鳥居の形が読める明るさに
          float rr=length((vUv-.5)*vec2(res.x/res.y,1.)); float fr=1.-pulse; c+=vec3(.62,.54,1.)*.62*pulse*smoothstep(.075,0.,abs(rr-fr*1.1));   // 声の輪
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
    const bob = sp.move === "trot" ? Math.abs(Math.sin(t * 9.5)) * .008 : 0;   // 揺れはごく小さく（酔わないように）
    stepWalk(dt, sp.eye, sp.speed, bob);
    if (sp.move === "crawl") camera.position.y = groundY(camera.position.x, camera.position.z) + .2;   // ミミズは肩越しの視点を少し上（20 cm）から：はう体の節が見える
    return;
  }
  if (sp.move === "swim") { stepSwim(dt, sp); return; }
  // 飛ぶ身体（2026-10-22 本人「自分で操作する感じに。勝手に画面が動くと酔ってしまいます」）：動くのは本人の操作だけ。
  // 向き＝ドラッグ（見回す）と A・D／← →、進む＝W・↑ か「前へ」を押しているあいだ、上下＝R・F か「上へ」「下へ」。速さはゆっくり立ち上がり、ゆっくり止まる。画面の揺れ・自動の旋回はない
  const fw = (K.has("w") || K.has("arrowup") || SIGHT.fwd ? 1 : 0) - (K.has("s") || K.has("arrowdown") ? 1 : 0);
  const turn = (K.has("a") || K.has("arrowleft") ? 1 : 0) - (K.has("d") || K.has("arrowright") ? 1 : 0);
  const climb = (K.has("r") || K.has("pageup") || FLY.up ? 1 : 0) - (K.has("f") || K.has("pagedown") || FLY.down ? 1 : 0);
  CAM.yaw += turn * .9 * dt;
  SIGHT.v += (fw * sp.speed * (fw < 0 ? .5 : 1) - SIGHT.v) * Math.min(1, dt * 1.6);
  SIGHT.vy += (climb * Math.min(3, sp.speed * .5) - SIGHT.vy) * Math.min(1, dt * 1.8);
  const vyaw = CAM.yaw + CAM.look, nx = CAM.pos.x - Math.sin(vyaw) * SIGHT.v * dt, nz = CAM.pos.z - Math.cos(vyaw) * SIGHT.v * dt;
  const n2 = nearestOnLine(nx, nz); if (n2.dist < (sp.move === "flutter" ? 30 : 60) && n2.d > -40 && n2.d < 2020) { CAM.pos.x = nx; CAM.pos.z = nz; } else SIGHT.v *= .5;   // 参道から離れすぎる所へは進まない（向きは変えない）
  const g = groundY(CAM.pos.x, CAM.pos.z), lo = g + Math.max(.6, sp.eye * .25), hi = g + Math.max(sp.eye * 2.2, 20);
  CAM.pos.y = Math.min(hi, Math.max(lo, CAM.pos.y + SIGHT.vy * dt));
  camera.position.copy(CAM.pos);
  camera.quaternion.setFromEuler(_eu.set(CAM.pitch, vyaw, 0));
  if (sp.move === "echo") stepEcho(dt);
}
/* カイツブリ：神池の水面を泳ぎ、「下へ」でもぐる（池の形から出ない） */
function inPoly(x, z, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / ((b[1] - a[1]) || 1e-9) + a[0]) c = !c; } return c; }
function stepSwim(dt, sp) {
  const P = sp.pond, K = WALK.keys; if (SIGHT.surf == null) { let y = 1e9; for (const [x, z] of P) y = Math.min(y, groundY(x, z)); SIGHT.surf = y + .12; SIGHT.dive = 0; }
  let turn = (K.has("a") || K.has("arrowleft") ? 1 : 0) - (K.has("d") || K.has("arrowright") ? 1 : 0); if (FLY.drag) turn += -FLY.drag.dx * 2;
  FLY.yawRate += (Math.max(-1, Math.min(1, turn)) * .8 - FLY.yawRate) * Math.min(1, dt * 2); CAM.yaw += FLY.yawRate * dt;
  const want = FLY.down || K.has("f") ? 1 : FLY.up || K.has("r") ? 0 : SIGHT.dive > .5 && SIGHT.t - (SIGHT.dT || 0) > 6 ? 0 : SIGHT.dive;
  if (want > SIGHT.dive && SIGHT.dive < .05) SIGHT.dT = SIGHT.t; SIGHT.dive += (want - SIGHT.dive) * Math.min(1, dt * 1.6);
  const fw = (K.has("w") || K.has("arrowup") || SIGHT.fwd ? 1 : 0) - (K.has("s") || K.has("arrowdown") ? .5 : 0); SIGHT.v += (fw * sp.speed * (1 + SIGHT.dive * .6) - SIGHT.v) * Math.min(1, dt * 1.6);   // 進むのは押しているあいだだけ
  const vyaw = CAM.yaw + CAM.look, nx = CAM.pos.x - Math.sin(vyaw) * SIGHT.v * dt, nz = CAM.pos.z - Math.cos(vyaw) * SIGHT.v * dt;
  if (inPoly(nx, nz, P)) { CAM.pos.x = nx; CAM.pos.z = nz; } else SIGHT.v = 0;   // 池の縁では止まる（向きは変えない）
  if (!inPoly(CAM.pos.x, CAM.pos.z, P)) { CAM.pos.x += (sp.x - CAM.pos.x) * dt; CAM.pos.z += (sp.z - CAM.pos.z) * dt; }
  CAM.pos.y = SIGHT.surf + .12 - SIGHT.dive * .85;
  camera.position.copy(CAM.pos); camera.quaternion.setFromEuler(_eu.set(CAM.pitch - SIGHT.dive * .2, CAM.yaw + CAM.look, 0));
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
    if (best < 45 && best > 2.5) hits.push({ p: src.clone().addScaledVector(dir, best), d: best });   // すぐそばの葉の点は、まぶしい塊になるので出さない
  }
  hits.sort((a, b) => a.d - b.d);
  const pos = new Float32Array(hits.length * 3); hits.forEach((h, i) => pos.set([h.p.x, h.p.y, h.p.z], i * 3));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setDrawRange(0, 0);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex(), color: "#d4ccff", opacity: 1, size: MOBILE ? 1.15 : .8, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  world.add(pts); SIGHT.echo.push({ pts, hits, t: 0, src: src.clone(), yaw: CAM.yaw + CAM.look }); chirp(); SIGHT.ring = 1;
}
function echoNow() { if (SIGHT.pulse > 0) return; SIGHT.pulse = .45; emitEcho(); }   // 本人が押したときだけ、超音波を出す（続けて押せるのは 0.45 秒ごと）
function stepEcho(dt) {
  SIGHT.pulse -= dt;
  const c = 343 / 16;
  for (const E of SIGHT.echo) {
    E.t += dt; const back = E.t * c / 2; let n = 0; while (n < E.hits.length && E.hits[n].d < back) n++; E.pts.geometry.setDrawRange(0, n);
    E.pts.material.opacity = Math.max(0, 1 - Math.max(0, E.t - 3.2) / 1.6);
  }
  while (SIGHT.echo.length && SIGHT.echo[0].t > 4.8) { const E = SIGHT.echo.shift(); world.remove(E.pts); E.pts.geometry.dispose(); E.pts.material.dispose(); }
  drawRadar(dt);
}
/* コウモリのレーダー（2026-10-24 本人「コウモリなどもレーダーを表示している方がリアリティがあります」）：声を出す → 反響が返る → まわりの形が点として浮かぶ、を上から見た円の画面で。
   範囲 45 m・音の速さ 秒速 343 m（画面では 16 倍ゆっくり）。反響の点は、上の 3D の点と同じ（模式。この参道で録った反響ではない） */
const RADAR = { cv: null, x: null, sweep: 0 };
function drawRadar(dt) {
  if (!RADAR.cv) { const c = RADAR.cv = document.createElement("canvas"); c.id = "radar"; c.setAttribute("aria-hidden", "true"); document.body.appendChild(c); RADAR.x = c.getContext("2d"); }
  const c = RADAR.cv, S = MOBILE ? 132 : 172, pr = Math.min(2, devicePixelRatio || 1); if (c.width !== S * pr) { c.width = c.height = S * pr; c.style.width = c.style.height = S + "px"; }
  c.hidden = !(QW.mode === "sight" && SIGHT.sp?.move === "echo");
  if (!RADAR.cap) { const e = RADAR.cap = document.createElement("p"); e.id = "radarCap"; e.textContent = "「超音波」で声を出す → 輪がひろがる → はね返った所が点で灯る（模式）"; document.body.appendChild(e); }   // 2026-10-25 何が起きているかを一行で
  RADAR.cap.hidden = c.hidden; if (c.hidden) return;
  const x = RADAR.x, R = S / 2 - 6, K = R / 45, cx = S / 2, cy = S / 2; x.setTransform(pr, 0, 0, pr, 0, 0); x.clearRect(0, 0, S, S);
  x.fillStyle = "rgba(6,8,22,.72)"; x.beginPath(); x.arc(cx, cy, R + 4, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "rgba(180,168,255,.5)"; x.lineWidth = 1; for (const m of [10, 20, 30, 45]) { x.beginPath(); x.arc(cx, cy, m * K, 0, Math.PI * 2); x.stroke(); }
  x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
  x.fillStyle = "rgba(200,190,255,.6)"; x.font = "300 8px ui-monospace,monospace"; x.fillText("45m", cx + 3, cy - R + 9); x.fillText("ECHO", 6, 11);
  const vy = CAM.yaw + CAM.look, cs = Math.cos(vy), sn = Math.sin(vy), cp = camera.position;
  for (const E of SIGHT.echo) {
    const back = E.t * (343 / 16) / 2, out = E.t * (343 / 16), a = Math.max(0, 1 - Math.max(0, E.t - 3.2) / 1.6);
    if (out * K < R + 4) { x.strokeStyle = `rgba(190,180,255,${.75 * (1 - out / 50)})`; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, Math.min(R, out * K), -Math.PI / 2 - .9, -Math.PI / 2 + .9); x.stroke(); }   // 前へ出ていく声
    for (const h of E.hits) { if (h.d > back) break; const dx = h.p.x - cp.x, dz = h.p.z - cp.z, fx = -(dx * cs - dz * sn), fz = dx * sn + dz * cs; const px = cx - fx * K, py = cy - fz * K; if ((px - cx) ** 2 + (py - cy) ** 2 > R * R) continue;   // 前＝上
      const fresh = Math.max(0, 1 - (back - h.d) / 6); x.fillStyle = `rgba(${200 + 55 * fresh | 0},${190 + 50 * fresh | 0},255,${a * (.35 + .65 * fresh)})`; x.fillRect(px - 1.6, py - 1.6, 3.2, 3.2); }
  }
  x.fillStyle = "#d8d0ff"; x.beginPath(); x.moveTo(cx, cy - 6); x.lineTo(cx - 4, cy + 4); x.lineTo(cx + 4, cy + 4); x.closePath(); x.fill();
}
function stopEcho() { if (RADAR.cv) RADAR.cv.hidden = true; if (RADAR.cap) RADAR.cap.hidden = true; for (const E of SIGHT.echo) { world.remove(E.pts); E.pts.geometry.dispose(); E.pts.material.dispose(); } SIGHT.echo.length = 0; }
let AC = null;
function chirp() {   // 9〜11 ミリ秒の、高さがゆるやかに変わる音を、16 倍に引きのばして耳に届く高さにした模式の音
  if (!soundOn) return;
  try { const ac = AC ||= new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = "sine"; o.frequency.setValueAtTime(3000, t); o.frequency.exponentialRampToValueAtTime(2600, t + .16);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + .17); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .2); } catch { }
}
function showSightUI(sp) {
  $("#sightUI").hidden = false; $("#sName").textContent = sp.name; $("#sEn").textContent = sp.en; $("#sLead").innerHTML = esc(sp.lead).replace(/（[^）]*）/, m => `<span style="white-space:nowrap">${m}</span>`);   // かっこの中は折らない
  if (sp.id === "koumori") $("#sLead").insertAdjacentHTML("beforeend", '<br><span style="opacity:.8">遠くを飛ぶほかのコウモリは、5 倍の大きさで見せています。「超音波」を押すと声が出て、反響がレーダーと点に返ります。</span>');
  const MODEL = { hiyo: "紫は紫外の手がかりの模式（紫外は測っていません）", aosuji: "六角の並びと紫は、複眼と紫外の手がかりの模式（紫外は測っていません）", mimizu: "目はなく、明るさと地面の振動の模式", koumori: "反響の点とレーダーは模式（この参道で録った反響ではありません）", inu: "二色型の色の模式" }[sp.id];
  if (MODEL) $("#sLead").insertAdjacentHTML("beforeend", `<br><span class="smodel">${MODEL}</span>`);
  /* 「歩きつづける」（自動で進む）は生きものの身体では出さず、「前へ」にそろえる */ $("#walkUI").hidden = true; $("#flyUI").hidden = true; $("#sUpDn").hidden = false; $("#sEcho").hidden = sp.move !== "echo"; $("#sUp").hidden = $("#sDown").hidden = sp.move === "trot" || sp.move === "crawl";   // 歩く身体にも「前へ」を置き、操作の形をそろえる
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
/* 歩くと足音が変わる：足もとの面（区間の断面の模式）ごとに、一歩ずつ組み立てる。境内の玉砂利は、これまでどおり gravelStep */
function surfAt(x, z) {
  const n = nearestOnLine(x, z), sc = D.sec.find(q => n.d >= q.d0 && n.d < q.d1) || D.sec[D.sec.length - 1], w = n.dist;
  switch (sc.prof) {
    case "SN": return w < 1.5 ? "asphalt" : "tile";            // 車道（密粒アスファルト）／歩道（透水性の平板）
    case "M": return w < 1.75 ? "stone" : "tile";              // 中央の灰御影石の平板／両脇の洗い出し
    case "H": return "stone";                                  // 御影石の遊歩道
    case "T": return w < 2.1 ? "asphalt" : w < 3.2 ? "stone" : "soil";   // アスファルト／御影石の帯／砂色の土の帯
    case "K0": return "soil";
    case "K1": return null;                                    // 玉砂利（gravelStep）
    default: return "asphalt";
  }
}
const SW = makeSoundWalk({ ctx: () => SND.ac, out: () => SND.out, on: () => sndOn(), duck: () => voiceQ ? .5 : 1, pulse: v => { SND.pulse = Math.max(SND.pulse || 0, v); },
  tag: (id, label, zn) => { if (!SND.tag || performance.now() > SND.tagUntil) showTag(zn ? zn.it : { id: "sw_" + id, kind: "re", label: `再現音（${label}。その場で組み立てた音）`, x: CAM.pos.x, y: groundY(CAM.pos.x, CAM.pos.z), z: CAM.pos.z }, 4); } });
QW.SW = SW; QW.surfAt = (x, z) => surfAt(x ?? CAM.pos.x, z ?? CAM.pos.z);
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
  SW.update(dt, { x: cp.x, z: cp.z, yaw: vy, moving: WALK.moving && QW.mode === "walk", surface: QW.mode === "walk" ? surfAt(CAM.pos.x, CAM.pos.z) : null });
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
  showTag(it, { ourai: 8.5, kuruma: 13, cars: 13, rec: 9, poem: 10, poem2: 10 }[it.kind] || 5);
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
  if (it.kind === "cars") { SW.play("cars", bus); SND.seq.push(setInterval(() => { SND.pulse = .7; }, 400)); setTimeout(() => SND.seq.forEach(clearInterval), 13000); return; }
  if (it.kind === "water") { for (let i = 0; i < 16; i++) SND.seq.push(setTimeout(() => drop(bus, 1), i * 180 + Math.random() * 120)); return; }
  if (it.kind === "leaves") { const s = noise(), hp = ac.createBiquadFilter(), g = ac.createGain(); hp.type = "highpass"; hp.frequency.value = 1400; g.gain.setValueAtTime(0, t0); for (let k = 0; k < 6; k++) g.gain.linearRampToValueAtTime(.12 + .3 * Math.random(), t0 + .8 + k * 1.1); g.gain.linearRampToValueAtTime(0, t0 + 8); s.connect(hp).connect(g).connect(bus); s.start(t0); s.stop(t0 + 8.2); SND.pulse = 1; return; }
  if (it.kind === "ourai") {   // 人の歩み（およそ 1.8 歩／秒）と、馬の並足（四拍子・一周およそ 1.1 秒）
    for (let k = 0; k < 14; k++) step(t0 + k * .55, bus, .3);
    for (let c = 0; c < 7; c++) for (let j = 0; j < 4; j++) hoof(t0 + .3 + c * 1.1 + j * .275 + (Math.random() - .5) * .02, bus, j % 2 ? .38 : .45);
    SND.seq.push(setInterval(() => { SND.pulse = 1; }, 275)); setTimeout(() => SND.seq.forEach(clearInterval), 8200); return;
  }
  if (it.kind === "rail") {   // 2026-10-26 3 大宮：列車が通り過ぎる模式（低い走行の響き＋継ぎ目を越える車輪の二つずつの音。発車の曲・放送は鳴らさない）
    const s = noise(), lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = "lowpass"; lp.frequency.setValueAtTime(160, t0); lp.frequency.linearRampToValueAtTime(700, t0 + 3.5); lp.frequency.linearRampToValueAtTime(180, t0 + 9);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.5, t0 + 3.5); g.gain.linearRampToValueAtTime(.35, t0 + 6); g.gain.linearRampToValueAtTime(0, t0 + 9.5); s.connect(lp).connect(g).connect(bus); s.start(t0); s.stop(t0 + 9.6);
    for (let c = 0; c < 9; c++) for (const dd of [0, .16]) { const t = t0 + 1.4 + c * .78 + dd, k = Math.max(.15, 1 - Math.abs(c - 4) / 5), o = ac.createOscillator(), og = ac.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + .09); og.gain.setValueAtTime(.32 * k, t); og.gain.exponentialRampToValueAtTime(.001, t + .14); o.connect(og).connect(bus); o.start(t); o.stop(t + .16); }
    SND.seq.push(setInterval(() => { SND.pulse = .8; }, 390)); setTimeout(() => SND.seq.forEach(clearInterval), 9500); return;
  }
  if (it.kind === "deck") {   // 2026-10-26 3 大宮：大勢の足音を少しずつずらして重ねた模式（話し声は入れない）
    for (let p = 0; p < 7; p++) { const per = .48 + Math.random() * .16, ph = Math.random() * per; for (let k = 0; k < 16; k++) step(t0 + ph + k * per + (Math.random() - .5) * .03, bus, .1 + Math.random() * .08); }
    SND.seq.push(setInterval(() => { SND.pulse = .5; }, 300)); setTimeout(() => SND.seq.forEach(clearInterval), 8500); return;
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
  if (QW.mode === "walk") floatPad($("#tpad"), L);   // 10-28 晩：歩いたまま触れる板
  TCH.cur = it; speakLines(it.lines, L, { narr: true }); loadNormal(it).then(m => { if (TCH.cur === it) { TCH.map = m; bindPad(it); } });
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
let PAPER = null;
function paperTex() {   // 書の後ろの、和紙のような淡い光（中ほどは明るく、ふちへ消える）
  if (PAPER) return PAPER; const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(250,246,236,.95)"); g.addColorStop(.55, "rgba(246,240,226,.72)"); g.addColorStop(1, "rgba(246,240,226,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  PAPER = new THREE.CanvasTexture(c); PAPER.colorSpace = THREE.SRGBColorSpace; return PAPER;
}
const SHO = { mod: null, loading: null, live: {}, near: null }, SHO_W = 5.2; QW.SHO = SHO;   // 書の幅 m（2026-10-24 2.2 → 5.2）
function loadShoMod() { return SHO.loading ||= import("./sho/sho3d.js").then(m => { SHO.mod = m; return m; }).catch(e => console.warn("sho", e)); }
function stepSho(dt) {
  const list = D.sho || [], on = LAYER.worn.includes("sound") && (QW.mode === "walk" || QW.mode === "sight" || QW.mode === "fly"), cp = camera.position, t = performance.now() / 1000;
  for (const it of list) {
    const dist = Math.hypot(it.x - cp.x, it.z - cp.z), want = on && dist < 120, S = SHO.live[it.id];   // 2026-10-24 本人「sho をもっと大きく、目立つように」＝遠くから見える
    if (want && !S) {
      if (!SHO.mod) { loadShoMod(); continue; }
      if (SHO.live[it.id] === undefined) { SHO.live[it.id] = null; SHO.mod.loadShoMap(it.src).then(map => {
        const sho = SHO.mod.createSho(THREE, map, { width: Math.min(SHO_W, 6.6 * map.w / map.h), particleMode: "ink", mobile: MOBILE }), cy = it.y + sho.height / 2 + .3;
        const n = nearestOnLine(it.x, it.z), a = atD(n.d); sho.group.position.set(it.x, cy, it.z); sho.group.rotation.y = Math.atan2(a.x - it.x, a.z - it.z);   // 参道の方を向く
        const halo = new THREE.Mesh(new THREE.PlaneGeometry(sho.width * 1.9, sho.height * 1.7), new THREE.MeshBasicMaterial({ map: paperTex(), color: "#ffffff", transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false })); halo.position.set(0, 0, -.3); halo.renderOrder = -1; sho.group.add(halo);   // 書の後ろに、和紙のような淡い光（墨が木々に沈まず、遠くから読める）
        sho.setScale(innerHeight * renderer.getPixelRatio() * .9); world.add(sho.group);
        const ac = sndCtx(); const snd = ac ? SHO.mod.createShoSound(it.preset, { context: ac, destination: SND.out, volume: .45 }) : null;
        const lb = makeLabel(layerNo("sho"), GL.sho?.name || "Qualia/sound", it.title, GL.sho?.color || "#8fb6dc"); lb.position.set(it.x, cy + sho.height / 2 + .5, it.z); lb.scale.set(4.4, 1.1, 1); lb.material.depthTest = false; lb.renderOrder = 9; world.add(lb);   // 層の物だと分かるように、層の名札を添える
        SHO.live[it.id] = { sho, snd, it, hold: 0, lb };
      }).catch(e => console.warn("sho map", e)); }
      continue;
    }
    if (!S) continue;
    S.sho.group.visible = want; if (S.lb) S.lb.visible = want;
    if (!want) { S.snd?.stop(); continue; }
    if (S.snd && soundOn && !S.snd.running && SND.ac?.state === "running") S.snd.start();
    if (S.snd && !soundOn && S.snd.running) S.snd.stop();
    { const ry = Math.atan2(cp.x - it.x, cp.z - it.z), g = S.sho.group; g.rotation.y += Math.atan2(Math.sin(ry - g.rotation.y), Math.cos(ry - g.rotation.y)) * Math.min(1, dt * 2); }   // 書はいつも見る人の方へ正面を向ける（横向きで細く見えない）
    S.hold = Math.max(0, S.hold - dt);
    S.sho.target = S.hold > 0 ? 1 : dist < 10 ? .85 : 0;   // 近づくとほどける
    S.sho.update(dt, t); if (S.snd) { S.snd.update(S.sho.state, dt); S.sho.setLevel(S.snd.level); S.snd.gain(Math.max(0, 1 - dist / 40) * (voiceQ ? .4 : 1)); }
  }
}
function openSho(L) {
  const it = L.o.sho, g = GL.sho;
  openPanel({ color: g.color, layer: `${String(layerNo("sho")).padStart(2, "0")}　${g.name}`, title: `《${it.title}》`, lines: [],
    more: ["上原光瑛の書。墨の形を 3D の起伏にし、近づくと筆の向きに沿って粒にほどけ、また集まります。音は、ほどける速さに合わせて、その場で組み立てています。", "置いた場所：" + it.why + "（題と場所の結びつけは、作品としての解釈です）"],
    src: [{ t: "書：上原光瑛（© mitsulab. All rights reserved.）" }], ll: it.ll, how: "作品（mitsulab）",
    buttons: [{ label: "ほどく・集める", primary: true, run: () => touchSho(it) }] });
  touchSho(it);
}
/* Qualia/rakugo：公開中の Qualia/rakugo の演目を、その場所で一席（動画は rakugo の公開ページのものを流す・押すまで読まない） */
const RK_BASE = "https://mitsulab-soil.github.io/aoi-shizen-rakugo/";
function openRakugo(L) {
  const it = L.o.rk, g = GL.rakugo, v = MOBILE ? "_v540" : "_h720", mm = s => `${Math.floor(s / 60)} 分`;
  const figs = `<video class="rkV" controls playsinline preload="none" poster="${RK_BASE}img/${esc(it.slug)}_poster${MOBILE ? "_v" : ""}.webp" src="${RK_BASE}video/${esc(it.slug)}${v}.mp4" aria-label="噺《${esc(it.title)}》の高座（約 ${mm(it.dur)}）"></video><figcaption>《${esc(it.title)}》（${esc(it.r)}）・約 ${mm(it.dur)}。高座の碧が演じます。音が出ます。</figcaption>`;
  openPanel({ color: g.color, layer: `${String(layerNo("rakugo")).padStart(2, "0")}　${g.name}`, title: `《${it.title}》`, lines: [it.say], more: [it.lead, "置いた場所：" + it.why, "ためしてみる：" + it.invite],
    note: it.fic + (it.warn ? "　" + it.warn : ""), src: [{ t: "高座：Qualia/rakugo（mitsulab）", u: RK_BASE + "?e=" + it.slug }, ...it.src], ll: it.ll, how: "作品（mitsulab）── 噺の中の人物と見立ては作り話。典拠は噺のもとになった記録", figs });
  const vid = $("#pExp video"); if (vid) { let was = null; vid.addEventListener("play", () => { stopVoice(); stopSound(); if (was === null) was = TALK.on; TALK.on = false; syncTalkBtn(); }); const back = () => { if (was) { TALK.on = true; syncTalkBtn(); TALK.nextT = performance.now() + 4000; } was = null; }; vid.addEventListener("pause", back); vid.addEventListener("ended", back); }   // 噺のあいだは、碧の歩きながらの話を止める
  speakLines([it.say], L);
}
function touchSho(it) {   // 触れる：書がほどけ、端末が震える（iPhone は震えない）
  const S = SHO.live[it.id]; sndCtx(); try { navigator.vibrate?.([18, 50, 30, 60, 14]); } catch { }
  if (S) S.hold = S.hold > 0 ? 0 : 4.5;
}
addEventListener("resize", () => { for (const k in SHO.live) SHO.live[k]?.sho.setScale(innerHeight * renderer.getPixelRatio() * .9); });

/* ---------- 画面の部品 ---------- */
function toast(t) { const e = $("#toast"); e.textContent = t; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => { e.hidden = true; }, 5200); }
const showSkyUI = () => { $("#skyUI").hidden = false; $("#pinLabels").hidden = false; START.sp?.show(true); };
const hideSkyUI = () => { $("#skyUI").hidden = true; $("#pinLabels").hidden = true; START.sp?.show(false); };
const showWalkUI = () => { $("#walkUI").hidden = false; $("#hud").hidden = false; syncAutoBtn(); };
const hideWalkUI = () => { $("#walkUI").hidden = true; };
const showFlyUI = () => { $("#flyUI").hidden = false; $("#hud").hidden = false; };
const hideFlyUI = () => { $("#flyUI").hidden = true; };
function closeTray() { $("#sightBox").hidden = true; }
$("#sightX").addEventListener("click", closeTray);
$("#lsHead").addEventListener("click", () => { const c = $("#lstack").classList.toggle("closed"); $("#lsHead").setAttribute("aria-expanded", String(!c)); });
$("#lsAll").addEventListener("click", () => { for (const L of ALL) if (!LAYER.worn.includes(L.id)) wearLayer(L.id, { noChooser: true }); });
$("#lsNone").addEventListener("click", () => wearLayer(null));
if (innerWidth < 640) { $("#lstack").classList.add("closed"); $("#lsHead").setAttribute("aria-expanded", "false"); }   // スマホ：はじめは目盛りと番号だけ（視野をふさがない）。上の「QUALIA」に触れると名前が出る
let unlocked = false;
function unlockAudio() {   // スマホのブラウザは、押した操作の中で一度鳴らしておかないと、あとで声が出ない
  if (unlocked || !D) return; unlocked = true;
  try { audio.muted = true; audio.src = D.intro.f; const p = audio.play(); p?.then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false; }).catch(() => { audio.muted = false; unlocked = false; }); } catch { audio.muted = false; }
}
addEventListener("pointerup", () => unlockAudio(), true);

$("#skyFly").addEventListener("click", () => { unlockAudio(); startFly(); });
$("#skySight").addEventListener("click", () => { unlockAudio(); openSightChooser(); });
$("#modeSky").addEventListener("click", () => { if (QW.mode !== "sky") toSky(); });
$("#modeWalk").addEventListener("click", () => { if (QW.mode === "fly") landFromFly(); else if (QW.mode === "sky") descendTo(Math.max(0, START.sel)); else if (QW.mode === "sight") exitSight(); });
$("#modeFly").addEventListener("click", () => { if (QW.mode !== "fly") startFly(); });
const holdBtn = (el, on, off) => { el.addEventListener("pointerdown", e => { e.preventDefault(); on(); el.setPointerCapture(e.pointerId); }); for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, off); };
holdBtn($("#flyUp"), () => FLY.up = true, () => FLY.up = false);
holdBtn($("#flyDown"), () => FLY.down = true, () => FLY.down = false);
holdBtn($("#sUp"), () => FLY.up = true, () => FLY.up = false);
holdBtn($("#sFwd"), () => { SIGHT.fwd = true; WALK.hold = true; }, () => { SIGHT.fwd = false; WALK.hold = false; });
$("#sEcho").addEventListener("click", () => echoNow());
holdBtn($("#sDown"), () => FLY.down = true, () => FLY.down = false);
$("#autoBtn").addEventListener("click", () => { WALK.auto = !WALK.auto; WALK.goal = null; if (WALK.ring) WALK.ring.visible = false; syncAutoBtn(); });
$("#gyroBtn").addEventListener("click", toggleGyro);
$("#hereBtn").addEventListener("click", () => { unlockAudio(); HERE.toggle(); });
$("#skyHere").addEventListener("click", () => { unlockAudio(); HERE.toggle(); });
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
QW.sight = id => { const sp = D.sight.find(s => s.id === id); if (sp && BODY_D[sp.id]) enterSight(sp, null); };
QW.goto = d => { const a = atD(d); CAM.pos.set(a.x, groundY(a.x, a.z) + EYE, a.z); CAM.yaw = yawAlong(d + 5); CAM.look = 0; if (AOI.m) { aoiSpot(AOI.pos); AOI.m.teleport(AOI.pos.x, AOI.pos.z, CAM.yaw + Math.PI); } updateTrees(true); };
QW.LAYER = LAYER; QW.CAM = CAM;
QW.open = id => { const L = LAYER.objs.find(l => l.o.id === id); if (L) { L.show = 1; L.root.visible = true; openObj(L); } return !!L; };
QW.talkNow = () => { TALK.nextT = 0; };
QW.place = (x, z, tx, tz, p = -.12) => { const yw = Math.atan2(-(tx - x), -(tz - z)); [x, z] = camOffRoad(x, z, yw); CAM.pos.set(x, groundY(x, z) + EYE, z); CAM.yaw = yw; CAM.look = 0; CAM.pitch = p; };   // 確かめ用：その場所から、その点の方を見る
QW.sky = SKY;

function fillMenu() {
  $("#about").textContent = D.about; $("#aoiNote").textContent = "碧（あおい）は、この作品の案内役です。歩くあいだ、いまいる所に結びついた記録を話しつづけます（字幕の「出典」から典拠を開けます）。碧の姿：mitsulab（VRoid）／声：VOICEVOX:冥鳴ひまり。";
  $("#credit").textContent = "地形：国土地理院 標高タイル（DEM5A）・全国最新写真（シームレス）を mitsulab が加工／建物：国土交通省 PLATEAU さいたま市 2022（CC BY 4.0）を加工（形と高さ。窓と階の並びは模式）／道・木・鳥居・池の位置と、地図の道・公園・社寺の名前：© OpenStreetMap contributors（ODbL）／等高線：国土地理院 DEM5A から mitsulab が計算／舗装・樹皮・葉の質感：Poly Haven・ambientCG（CC0）／樹木の話：さいたま市・氷川の杜まちづくり協議会『氷川参道の樹木調査』・環境省 巨樹・巨木林データベース／歴史と文化の話：武蔵一宮氷川神社「由緒・歴史」「境内のご案内」「年間の祭典」・さいたま市・さいたま市立博物館・埼玉県立歴史と民俗の博物館・与野郷土資料館・埼玉県・国土地理院（それぞれの物と碧の話の「出典」に）／生きものの話：iNaturalist の投稿者のみなさん（種の名前）・研究論文（それぞれの「出典」に）／Qualia/sound の音：［ほかの場所で録った同じ種類の音］風に鳴る葉（Gravity Sound・CC BY 4.0・録音地の記載なし）・スズメ（Derek Paulo・CC BY-SA 4.0・フィリピン）・アブラゼミ（Cory・CC BY 2.1 JP・日本）・ハシブトガラス（Zeimusu・CC BY-SA 2.5・日本）＝いずれも Wikimedia Commons／［再現音］元往還の人と馬・中の区間の車・玉砂利・神池のしずく＝記録にもとづいて端末の中で組み立てた音／［詩の音］mitsulab のことばから組み立てた音／Qualia/touch：面＝この作品の路面と同じ Poly Haven・ambientCG の写真（CC0）、手ざわりと音は端末の中で組み立てた模式／層の物とグラスの形：mitsulab（three.js の基本形で作成）";
  $("#music").textContent = "";
}
/* 左の層の板：一枚が一つの情報の層。触れると表示・非表示。板の色＝風景に重ねた物の色 */
function buildTray() {
  const mk = (L, box, i) => {   // 目盛りの一段（下から 01・02…と上へ重なる）
    const n = L.id === "sight" ? D.sight.filter(q => BODY_D[q.id]).length : L.id === "sound" ? D.sound.length + (D.sho || []).length : L.id === "touch" ? D.touch.length : L.id === "culture" ? D.objs.filter(o => top5(o.layer) === "culture").length + (D.rakugo || []).length : D.objs.filter(o => o.layer === L.id).length;
    const li = document.createElement("li"); li.className = "ly";
    const b = document.createElement("button"); b.type = "button"; b.className = "lyBtn" + (L.q ? " q" : ""); b.dataset.id = L.id; b.setAttribute("aria-pressed", "false"); b.style.setProperty("--gc", L.color);
    b.title = L.lead; b.setAttribute("aria-label", `${L.name}（${L.lead}）`);
    b.innerHTML = `<span class="tk" aria-hidden="true"></span><span class="no">L${String(i + 1).padStart(2, "0")}</span><span class="sh">${L.id}</span><span class="nm"><b>${L.name}</b><small>${L.en}</small></span><span class="ct">${String(n).padStart(2, "0")}</span>`;
    b.addEventListener("click", () => wearLayer(L.id, { noChooser: true })); li.appendChild(b);
    if (L.id === "sight") { const g = document.createElement("button"); g.type = "button"; g.className = "lyGo hb"; g.style.setProperty("--gc", L.color); g.textContent = "入る"; g.setAttribute("aria-label", "生きものの身体に入る"); g.addEventListener("click", e => { e.stopPropagation(); openSightChooser(); }); li.appendChild(g); }
    box.appendChild(li);
  };
  const a = $("#layersAll"); a.innerHTML = "";
  ALL.slice(0, 2).forEach((L, i) => mk(L, a, i));
  const sep = document.createElement("li"); sep.className = "lySep"; sep.setAttribute("aria-hidden", "true"); sep.textContent = "五感 · SENSES"; a.appendChild(sep);
  ALL.slice(2).forEach((L, i) => mk(L, a, 2 + i));
  syncTray();
}
function syncTray() {
  document.querySelectorAll(".lyBtn").forEach(b => b.setAttribute("aria-pressed", LAYER.worn.includes(b.dataset.id) ? "true" : "false"));
  const c = $("#lsCount"); if (c) c.textContent = `${LAYER.worn.length} / ${ALL.length}`;
}

/* ---------- まわす ---------- */
const clock = new THREE.Clock(); let fpsAcc = 0, fpsN = 0, prT = 0;
function frame() {
  if (!D) return;   // タブが隠れていたあいだに描画が始まったとき（データの前）は描かない
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
    { const l = $("#lstack")?.getBoundingClientRect(); MGUIDE?.show(QW.mode === "sky"); MGUIDE?.update(performance.now() / 1000, camera); { const sk = QW.mode === "sky" ? 1 : 0, gd = QW.farGM?.userData.gf.gfDim; if (gd) gd.value += (sk - gd.value) * .08; BLDU.sky.value += (sk - BLDU.sky.value) * .08; } START.rects = QW.startRects = START.sp?.update(performance.now() / 1000, l && l.width ? { x: l.right + 8, y: l.bottom } : null) || []; } stepMapLabels();
    if (MAP.here?.visible) MAP.here.scale.setScalar(1 + .15 * Math.sin(performance.now() / 300));
  }
  if (WALK.ring?.visible) { WALK.ringT = (WALK.ringT || 0) + dt; WALK.ring.material.opacity = .85 * (.6 + .4 * Math.cos(WALK.ringT * 4)); }
  if ((GEO.t -= dt) < 0 && QW.mode !== "boot") { GEO.t = .25; const g = GEO.el || (GEO.el = document.getElementById("lsGeo")); const cp = camera.position;   // 視野の左上：いまいる所（緯度・経度・地面からの高さ）
    const la = 35.90725 - cp.z / 110980, lo = 139.631 + cp.x / (111320 * Math.cos(la * Math.PI / 180)), gy0 = groundY(cp.x, cp.z), h = Math.max(0, cp.y - (Number.isFinite(gy0) ? gy0 : 8));   /* 10-28 夜：地形の外（3D 地図の高い所）では地面の高さが NaN になり ALT NaNm と出ていた。外は大宮の台地の高さ およそ 8 m で数える */
    const txt = `POS <b>${la.toFixed(4)}N ${lo.toFixed(4)}E</b>\nALT ${Math.round(h)}m  ${QW.mode.toUpperCase()}`; if (g && txt !== GEO.last) { g.innerHTML = txt; GEO.last = txt; } }
  updateTrees(); VEG.time.value += dt; updateVeg(); if (!RM) BLDU.t.value += dt; BLDU.g.value = QW.mode === "walk" || QW.mode === "sight" ? groundY(camera.position.x, camera.position.z) : -1e4; stepEdges(); stepHiyo(dt); stepMimi(dt); stepBats(dt); stepBody(dt);
  if (BLD.length) { const cp = camera.position, far = QW.mode === "walk" || QW.mode === "sight" ? (MOBILE ? 320 : 430) : 1e9; for (const b of BLD) { const s = b.userData.ws; b.visible = Math.hypot(s.center.x - cp.x, s.center.z - cp.z) - s.radius < far; } }
  if (STONES.length && QW.mode !== "sky") { const cp = camera.position; for (const r of STONES) { const s = r.userData.ws; r.visible = s.center.distanceTo(cp) - s.radius < 160; } }
  { const m = QW.mode, camH = camera.position.y - groundY(camera.position.x, camera.position.z), want = m === "sky" || m === "boot" ? MAPV : m === "descend" ? Math.min(1, Math.max(0, (camH - 70) / 260)) : 0; CYBER.v.value += (want - CYBER.v.value) * Math.min(1, dt * 2.2);
    if (QW.skyTex && m !== "sight") { const vt = m === "boot" ? 1 : 0; VEIL.k = (VEIL.k ?? 1) + (vt - (VEIL.k ?? 1)) * Math.min(1, dt * 1.8); const kc = VEIL.k, bg = kc > .995 ? NAVY : QW.skyTex; if (scene.background !== bg) scene.background = bg; VEIL.visible = bg !== NAVY && kc > .005; if (VEIL.visible) { VEIL.material.uniforms.opacity.value = kc; VEIL.position.copy(camera.position); VEIL.scale.setScalar(camera.far * .9); } if (m === "descend" || m === "sky") scene.fog.color.copy(FOG_SKY).lerp(NAVY, CYBER.v.value); } else VEIL.visible = false; CYBER.scan.value = (performance.now() / 1000 * 70) % 2600 - 1300; if (QW.skirt) { const sm = QW.skirt.material; (sm.userData.c0 ||= sm.color.clone()); sm.color.copy(sm.userData.c0).lerp(NAVY, CYBER.v.value * .97); } }   // 3D 地図の電脳の地面
  if (PARK.uT && !RM) PARK.uT.value += dt;
  stepLayer(dt); stepSoundscape(dt); stepSho(dt); stepTalk(); KASA.herd?.update(dt, { active: QW.mode === "walk", busy: !!PANEL.cur || !!voiceQ }); stepAreas(dt); if (!WL && QW.mode === "walk") startWL(); WL?.update(dt, camera); if (!YO.y && QW.mode === "walk") startYorishiro(); YO.y?.update(dt);   // 碧が話しているあいだは、かさねっこの掛け合いを重ねない
  if (QW.mode === "walk") stepAoi(dt);
  if (SIGHT.post && QW.mode === "sight") {
    const PU = SIGHT.post.mat.uniforms; PU.time.value += dt; SIGHT.ring = Math.max(0, (SIGHT.ring || 0) - dt / 1.1); PU.pulse.value = SIGHT.ring; PU.move.value += ((SIGHT.sp ? Math.min(1, Math.abs(SIGHT.v) / Math.max(.2, SIGHT.sp.speed || 1)) : 0) - PU.move.value) * Math.min(1, dt * 4);
    renderer.setRenderTarget(SIGHT.post.rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(SIGHT.post.ps, SIGHT.post.cam);
  } else renderer.render(scene, camera);
  if (QW.mode === "sky" || QW.mode === "descend" || QW.mode === "walk" || QW.mode === "fly") renderer.toneMappingExposure += ((QW.mode === "sky" ? .5 : 1.02) - renderer.toneMappingExposure) * Math.min(1, dt * 3);   // 3D 地図は暗めに（白すぎないように）
  renderBody();
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
    QW.ready = true; QW.tReady = performance.now() - T0; setTimeout(() => loadLate(), 400);   // 2026-10-26 3：道と木は、操作できるようになったらすぐ先に読みはじめる（降りるときに待たない）
    // 歩く前に要るものを、上空で選んでいるあいだに読む（地図の線と名前 → 道・木・構造物 → 碧 → 話）
    setTimeout(() => { fetch(BASE + "map.json?v=" + VER).then(r => r.json()).then(buildMap).catch(e => console.warn("map", e)); }, 120);
    setTimeout(() => { loadAoi(); loadLate(); setTimeout(loadTalk, 900); setTimeout(loadKasane, 2600); }, 300);
    setTimeout(initAreas, 700);   // 7 つのエリアの輪郭（2 KB）。中身は近づいたときに読む   // 2026-10-23：碧を道・木・構造物と同時に読みはじめる（前は 0.4 秒あと）
    const s0 = Q.get("start"); if (s0 != null && D.starts[+s0]) { selectStart(+s0); descendTo(+s0); }
    if (Q.get("layer")) setTimeout(() => wearLayer(Q.get("layer")), 200);
    if (Q.get("sight")) setTimeout(() => QW.sight(Q.get("sight")), 300);
  } catch (e) {
    console.error(e); status("読み込めませんでした。ページを開きなおしてください。");
  }
})();
