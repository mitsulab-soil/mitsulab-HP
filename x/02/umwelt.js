/* 環世界の庭（umwelt）── 2026-10-07
   本人「花の色の話について、3D 空間で仮想的に、動物や虫などの環世界を体験して、碧が案内をしてくれるものを実装してください。」
   ひとつの庭を、生きものの受けとり方（lens）に切り替えて歩く。言葉と色（iro）、四つの時計（toki・試作）。
   色の写し方：それぞれの面に「人の色（linear RGB）」と「紫外の返し（uv）」と「温かさ（temp）」を持たせ、
   シェーダーで、受けとる細胞の感度から作った行列（uM）と紫外の写し先（uUVw）で置きかえる。近似（README）。
   操作は森羅博物館と同じ（押して歩く・一回 6 m まで／なぞって見回す／キーボード）。 */
import * as THREE from "three";
import { makeBody, creaturePortrait, humanPortrait, makeCreature, disposePortraitRenderer } from "./bodies.js?v=20261016-startup1";
import { buildForest } from "./forest.js?v=20261023-boot";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildNature, photoTex, makeTree, makeFlowers, makeGrass } from "./nature.js?v=20261016-startup1";
import { buildZen, YARD, ENGAWA, STONES, crownHook } from "./zen.js";
import { AoiMotion, inferGestures } from "./kit/aoi_motion.js?v=20261013v31";   // v3.1（2026-10-13）：まっすぐ立ち、左右の揺れを小さく（posture:"upright"）   // 碧の動きと表情（共通部品 01_経営/03_対外書類/12_ブランド/_共通3D/kit/ の写し。人の動きの記録・裾の布・表情。2026-10-13）

const $ = id => document.getElementById(id);
const S = window.SCRIPT, N = S.names, VOICE = window.VOICE || {}, P = window.PATHS || {};
const STARTUP = window.__umStartup = { moduleAt: performance.now(), firstFrameAt: null, interactiveAt: null, legacyGardenBuilt: false, assetsLoading: false, assetErrors: [] };
THREE.DefaultLoadingManager.onStart = () => { STARTUP.assetsLoading = true; };
THREE.DefaultLoadingManager.onLoad = () => { STARTUP.assetsLoading = false; STARTUP.assetsReadyAt = performance.now(); };
THREE.DefaultLoadingManager.onError = url => { STARTUP.assetErrors.push(url); };
// Start fetching the VRM and its decoder while the forest geometry is built.
// A settled result avoids an unhandled rejection before loadAoi awaits it.
const aoiAssetTask = (async () => {
  const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js"), import("@pixiv/three-vrm")]);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); loader.register(p => new V.VRMLoaderPlugin(p));
  const gltf = await loader.loadAsync(P.aoi); STARTUP.aoiAssetAt = performance.now(); return { gltf, V };
})().then(value => ({ value }), error => ({ error }));
document.querySelectorAll("[data-n]").forEach(e => { if (N[e.dataset.n]) e.textContent = N[e.dataset.n]; });
document.title = N.app;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = (dt, k) => 1 - Math.exp(-k * dt);
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mobile = innerWidth<700 || matchMedia("(pointer:coarse)").matches;
// 短い説明の文を、句のまとまりごとに折る（375px で語の途中で折れない。2026-10-13）
const phrases = t => String(t).split(/(?<=[・、／])|(?= · )|(?=（)/).map(p => `<span style="display:inline-block">${p.replace(/^ /, '\u00a0').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c])}</span>`).join('');
const TOUCH = matchMedia("(pointer:coarse)").matches || (navigator.maxTouchPoints > 0 && !matchMedia("(pointer:fine)").matches);   // 指で触る端末
let RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const prog = p => { $("prog").firstElementChild.style.width = p + "%"; };
if (P.face) $("face").src = P.face;
// 下の帯（受けとり方・言葉）は、碧の字幕の高さのすぐ上に置く（重ならない）
new ResizeObserver(() => document.documentElement.style.setProperty("--gh", ($("guide").offsetHeight + 6) + "px")).observe($("guide"));

// ---------------------------------------------------------------- 描画の土台
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
const BASE_PR = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(BASE_PR); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
// 自然な露出（2026-10-09 よりリアルに）：色をなるべく変えないトーンマッピング（Khronos PBR Neutral）。言葉と色の壁だけは色をそのまま出す
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
// 太陽の向きのある影（影の地図）。スマホは地図を小さく、描き直しを間引く
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; if (mobile) renderer.shadowMap.autoUpdate = false;
$("stage").appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, .02, 400);
const LIT = { hemi: .95, sun: 3.1, base: 15.2 };    // 庭のいつもの時刻＝午後 3 時すぎ（低い日ざしで砂紋と石の影が立つ）
const hemi = new THREE.HemisphereLight(0xdfefff, 0x6b6450, LIT.hemi); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, LIT.sun); sun.position.set(8, 14, 6); scene.add(sun); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.setScalar(mobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -21, right: 21, top: 21, bottom: -21, near: 1, far: 90 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
// 遠くほど淡くなる大気の層（夜・土の中の受けとり方では、シェーダーが上から描きかえる）
scene.fog = new THREE.FogExp2(0xc8d4dc, .011);
scene.background = new THREE.Color(0x0f1412);

// 受けとり方の共通の値（すべての面のシェーダーが見る）
const G = {
  uM: { value: new THREE.Matrix3() }, uUVw: { value: new THREE.Vector3() }, uMode: { value: 0 },
  uEcho: { value: new THREE.Vector4(0, 0, 0, -9) }, uEchoW: { value: .45 }, uTouch: { value: new THREE.Vector4(0, -99, 0, .6) },
  uCam: { value: new THREE.Vector3() }, uWorm: { value: 0 }, uHeatR: { value: 14 }, uTime: { value: 0 },
};
// 風で揺れる（葉・草）：頂点を世界の位置で少しずらす。uWindH＝この高さで揺れが最大になる
const WIND = `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
mvPosition = instanceMatrix * mvPosition;
vec3 ip_ = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
#else
vec3 ip_ = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#endif
vec4 wq_ = modelMatrix * mvPosition;
float ph_ = dot(ip_.xz, vec2(.37, .61)) + ip_.y * .2;
float sw_ = uWind * clamp(wq_.y / uWindH, 0.0, 1.0);
float gust_ = .65 + .35 * sin(uTime * .23 + ip_.x * .05);
wq_.x += sw_ * gust_ * (sin(uTime * 1.1 + ph_) * .6 + sin(uTime * 2.7 + ph_ * 1.7) * .22);
wq_.z += sw_ * gust_ * cos(uTime * .9 + ph_ * 1.3) * .45;
wq_.y += uWind * .12 * sin(uTime * 4.6 + ph_ * 3.1) * transformed.y;
mvPosition = viewMatrix * wq_;
gl_Position = projectionMatrix * mvPosition;
`;
const HEAD = `varying vec3 vWP;
uniform mat3 uM; uniform vec3 uUVw; uniform int uMode; uniform float uUV, uTemp, uEchoK, uWorm, uEchoW, uHeatR;
uniform vec4 uEcho; uniform vec4 uTouch; uniform vec3 uCam;
#ifdef HAS_UVMAP
uniform sampler2D uUVMap;
#endif
`;
const COLOR = `
float uvr = uUV;
#ifdef HAS_UVMAP
uvr *= texture2D(uUVMap, vMapUv).r;
#endif
diffuseColor.rgb = max(uM * diffuseColor.rgb + uUVw * uvr, 0.0);
`;
const END = `
if (uMode == 1) {            // マムシ：目の像を暗く、温かいものを明るく重ねる（ピットの赤外）
  float d = distance(vWP, uCam);
  float heat = uTemp * (1.0 - smoothstep(uHeatR * .35, uHeatR, d));
  vec3 vis = vec3(dot(gl_FragColor.rgb, vec3(.3, .55, .15))) * .28;
  vec3 hc = mix(vec3(.55, .06, .32), vec3(1., .9, .55), clamp(heat * 1.3, 0., 1.));
  gl_FragColor.rgb = mix(vis, hc, smoothstep(.22, .6, heat));
} else if (uMode == 2) {     // コウモリ：声の波面がとどいたところだけ光る
  float d = distance(vWP, uEcho.xyz);
  float band = exp(-pow((d - uEcho.w) / uEchoW, 2.0));
  float trail = d < uEcho.w ? exp(-(uEcho.w - d) * .5) * .3 : 0.0;
  float k = (band + trail) * (1.0 - smoothstep(6.0, 17.0, d)) * uEchoK;
  gl_FragColor.rgb = gl_FragColor.rgb * .015 + vec3(.55, .82, 1.0) * k;
} else if (uMode == 4) {     // ミミズ：明るさだけ
  gl_FragColor.rgb = vec3(uWorm);
}
`;
function prep(m, o = {}) {
  m.userData.u = { uUV: { value: o.uv ?? .05 }, uTemp: { value: o.temp ?? .1 }, uEchoK: { value: o.echo ?? 1 }, uUVMap: { value: o.uvMap || null }, uWind: { value: o.wind || 0 }, uWindH: { value: o.windH || 8 } };
  if (o.uvMap) m.defines = { ...(m.defines || {}), HAS_UVMAP: 1 };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, G, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvec4 wp_ = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp_ = instanceMatrix * wp_;\n#endif\nvWP = (modelMatrix * wp_).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + HEAD)
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + COLOR)
      .replace("#include <dithering_fragment>", END + "\n#include <dithering_fragment>");
    if (o.wind) sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime, uWind, uWindH;").replace("#include <project_vertex>", WIND);
    if (o.hook) o.hook(sh);
  };
  m.customProgramCacheKey = () => "umw" + (o.uvMap ? 1 : 0) + m.type + (o.wind ? "w" : "") + (o.key || "");
  return m;
}
const MATS = [];
// std＝写真の質感（法線・粗さ・AO の地図）と空の映りこみを持つ面。ほかは軽い Lambert のまま
function M(hex, o = {}) {
  const base = { color: hex, map: o.map || null, side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, alphaTest: o.alphaTest || 0, vertexColors: !!o.vc };
  // phys＝生きものの質感（2026-10-13：クリアコート＝濡れた艶・シーン＝毛や鱗粉の照り・薄膜の虹色。creatures.js が渡す）
  const SPm = { ...base, roughness: o.rough ?? .9, metalness: o.metal ?? 0, envMapIntensity: o.env ?? .7,
    normalMap: o.nmap || null, normalScale: new THREE.Vector2(o.ns ?? 1, o.ns ?? 1), roughnessMap: o.orm || null, aoMap: o.ao || null, aoMapIntensity: o.aoK ?? 1 };
  const m = o.basic ? new THREE.MeshBasicMaterial(base) : o.std && o.phys ? new THREE.MeshPhysicalMaterial({ ...SPm, ...o.phys }) : o.std ? new THREE.MeshStandardMaterial(SPm) : new THREE.MeshLambertMaterial(base);
  if (o.fog === false) m.fog = false; if (o.noTone) m.toneMapped = false;
  prep(m, o); MATS.push(m); return m;
}
// tex/ の写真の質感（色は sRGB、法線・粗さは線形）
function tx(file, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.TextureLoader().load("tex/" + file); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
}

// ---------------------------------------------------------------- 絵の具（その場で描く）
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// 土の断面（O・A・B 層の目安）。四つの時計の「土の千年」で、上に新しい層が積もる
const soilTex = canvasTex(256, 256, (g, w, h) => {
  const L = [[0, .06, "#2a1f17"], [.06, .42, "#3b2a1d"], [.42, 1, "#7a5a3a"]];
  for (const [a, b, c] of L) { g.fillStyle = c; g.fillRect(0, a * h, w, (b - a) * h); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? "20,12,6" : "160,130,90"},${.15 + Math.random() * .3})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.strokeStyle = "rgba(200,180,140,.5)"; g.lineWidth = 1.5; for (let i = 0; i < 9; i++) { g.beginPath(); let x = Math.random() * w; g.moveTo(x, 0); for (let y = 0; y < h * .7; y += 12) { x += (Math.random() - .5) * 10; g.lineTo(x, y); } g.stroke(); }
});

// ---------------------------------------------------------------- 庭
const garden = new THREE.Group(); scene.add(garden);
const pick = [];                 // 押すと歩ける面
const sonic = [];                // 画面のまん中にあるものの紫外・温かさを音にするための的
// 空（紫外を多くふくむ散乱光＝uv 高め。熱はない・反響もない）
// 空は太陽の向きで塗る：天頂の青・地平のかすみ・太陽のまわりの明るみ・朝夕の赤み（paintSky）
{
  const geo = new THREE.SphereGeometry(120, 48, 24);
  geo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  var sky = new THREE.Mesh(geo, M(0xffffff, { basic: true, vc: true, side: THREE.BackSide, uv: .85, temp: 0, echo: 0, fog: false })); garden.add(sky);
}
const SKY = { zen: new THREE.Color(0x5f8fc4), hor: new THREE.Color(0xd5e0e6), glow: new THREE.Color(0xfff1d6), dusk: new THREE.Color(0xf0a070) };
function paintSky(dir, dusk = 0, lit = 1) {
  const p = sky.geometry.attributes.position, c = sky.geometry.attributes.color, v = new THREE.Vector3(), col = new THREE.Color(), hz = SKY.hor.clone().lerp(SKY.dusk, dusk * .8), zn = SKY.zen.clone().lerp(new THREE.Color(0x40507a), dusk * .5);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); const up = clamp(v.y, 0, 1), cs = clamp(v.dot(dir), -1, 1);
    col.copy(hz).lerp(zn, Math.pow(up, .45));
    col.lerp(SKY.glow.clone().lerp(SKY.dusk, dusk), clamp(Math.pow((cs + 1) / 2, 8) * (.55 + .45 * (1 - up)), 0, 1) * .85);   // 太陽のまわり
    if (v.y < 0) col.lerp(new THREE.Color(0x8d8a78), clamp(-v.y * 4, 0, 1));
    c.setXYZ(i, col.r * lit, col.g * lit, col.b * lit); }
  c.needsUpdate = true;
  scene.fog.color.copy(hz).multiplyScalar(lit * .97);
  if (habitat === "forest") scene.fog.color.lerp(new THREE.Color(0x9fb09a).multiplyScalar(lit), .55);   // 森の中のかすみは、緑がかった灰色
}
// 池（なめらかな水面：音を前へはね返すので、反響は弱い＝Greif & Siemers 2010）
const legacyGardenSteps = [];
const POND = { x: -8, z: -7.4, r: 2.4 };
legacyGardenSteps.push(() => {
  // 水面：空と塀の向こうの木々が映る（映りこみの地図）。細かいさざ波は法線の地図で
  const w = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 48), M(0x1d3a3c, { std: true, rough: .06, env: 1.25, nmap: tx("sand_grit_n.webp", 2, 2, false), ns: .08, uv: .12, temp: .03, echo: .1 })); w.rotation.x = -Math.PI / 2; w.position.set(POND.x, .02, POND.z); garden.add(w); w.receiveShadow = true;
});
// 閉じた禅の庭（2026-10-09）：土塀・白砂と砂紋・石組みと苔・縁側。地平線は見せない（zen.js）
let ZEN;
legacyGardenSteps.push(() => { ZEN = buildZen({ M, canvasTex, photoTex, tx, garden, pick, sonic, POND, mobile }); });
// 木（欅のような落葉樹）・花・草・池のまわり・生きものは nature.js。花は右の塀ぎわの植え込みへ（花壇の座標 → 庭の座標）
const TREE = { x: 8.6, z: -8.8 };
const BED = { ry: -Math.PI / 2, x: 9.6, z: -.6 };
const bed = (x, y, z) => new THREE.Vector3(BED.x - z, y, BED.z + x);
const MOUSE = { x: -2.6, z: -.45 };
const NAT = buildNature({ M, canvasTex, tx, garden, sonic, TREE, POND, BED, bed, MOUSE, scenery: false, grassSample: r => r() < .8 ? [8.3 + r() * 3.1, -4.3 + r() * 8] : (a => [POND.x + Math.cos(a) * (POND.r + .4 + r() * .5), POND.z + Math.sin(a) * (POND.r + .4 + r() * .5)])(r() * Math.PI * 2) });
const { bird, mouse, butterflies, ageha, bee } = NAT;
let leafMat, leafIM;
legacyGardenSteps.push(() => { Object.assign(NAT, NAT.initScenery()); ({ leafMat, leafIM } = NAT); });
// 赤い面（紫外を返さない絵の具の想定）。《蜂の目》の八っつぁんの赤い戸。
//   2026-10-09：禅庭に馴染むよう、背もたれのある赤いベンチをやめ、縁台（腰かける低い台）にした。二つの案：
//     既定＝座面の板を赤く塗った縁台（台本の「紫外を返さない絵の具で赤く塗った板」のまま）
//     ?bench=mosen＝白木の縁台に赤い毛氈を敷く（選ぶなら、台本の一文を「赤い毛氈」に直して声を作り直す）
const BENCH = new URLSearchParams(location.search).get("bench") === "mosen" ? "mosen" : "nuri";
const redBoard = new THREE.Group();
legacyGardenSteps.push(() => {
  const L = 1.5, Dp = .55, H = .42;
  const woodB = M(0x9c8668, { std: true, map: tx("hinoki.webp", 1, 1), nmap: tx("hinoki_n.webp", 1, 1, false), orm: tx("hinoki_orm.webp", 1, 1, false), rough: .8, uv: .05, temp: .25 });
  const red = BENCH === "nuri" ? M(0xa31d16, { std: true, rough: .5, nmap: tx("hinoki_n.webp", 2, 1, false), ns: .35, uv: 0, temp: .3 })        // 赤い塗り（木目がうすく透ける）
    : M(0xb01e24, { std: true, rough: 1, nmap: tx("plaster_n.webp", 3, 3, false), ns: .6, uv: 0, temp: .3 });                                       // 毛氈（羊毛のフェルト）
  const parts = [], wood = [];
  // 座面：細い板を 5 枚、すき間をあけて並べる
  for (let k = 0; k < 5; k++) (BENCH === "nuri" ? parts : wood).push(new THREE.BoxGeometry(L, .035, Dp / 5 - .012).translate(0, H - .0175, -Dp / 2 + (k + .5) * Dp / 5));
  // 脚（四本）・貫（脚をつなぐ横木）・座面の下の框
  for (const x of [-L / 2 + .08, L / 2 - .08]) for (const z of [-Dp / 2 + .05, Dp / 2 - .05]) wood.push(new THREE.BoxGeometry(.06, H - .035, .06).translate(x, (H - .035) / 2, z));
  for (const x of [-L / 2 + .08, L / 2 - .08]) wood.push(new THREE.BoxGeometry(.04, .045, Dp - .1).translate(x, .12, 0));
  wood.push(new THREE.BoxGeometry(L - .16, .045, .04).translate(0, .12, 0));
  for (const z of [-Dp / 2 + .03, Dp / 2 - .03]) wood.push(new THREE.BoxGeometry(L - .02, .07, .03).translate(0, H - .07, z));
  const wm = new THREE.Mesh(mergeGeometries(wood.map(g => g.toNonIndexed())), woodB); redBoard.add(wm);
  let top;
  if (BENCH === "nuri") { top = new THREE.Mesh(mergeGeometries(parts.map(g => g.toNonIndexed())), red); }
  else {   // 毛氈：座面に敷き、手前と奥へ少し垂らす（布の厚み 4 mm・角はやわらかく落ちる）
    const cl = new THREE.PlaneGeometry(L - .1, Dp + .36, 30, 24), q = cl.attributes.position;
    for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), over = Math.max(0, Math.abs(y) - Dp / 2);
      const zz = Math.sign(y) * (Math.min(Math.abs(y), Dp / 2) + .008 * Math.min(1, over / .012) + .006 * Math.sin(x * 9) * Math.min(1, over * 6)), hh = H + .004 - over + .004 * Math.max(0, 1 - over / .012);
      q.setXYZ(i, x, hh, -zz); }
    cl.computeVertexNormals(); red.side = THREE.DoubleSide; top = new THREE.Mesh(cl, red);
  }
  redBoard.add(top);
  redBoard.position.copy(bed(1.4, 0, 2.2)); redBoard.rotation.y = BED.ry - .2; garden.add(redBoard); sonic.push(top);
});
let berryBush = null;
// ブルーベリーのような実の茂み（実の白い粉＝ブルームが紫外を返す：Siitari et al. 1999）
legacyGardenSteps.push(() => {
  const bush = new THREE.Group(); bush.position.set(6.4, 0, -9.9); berryBush = bush;
  // 葉：写真の葉を小枝に互生させた房（LeafSet014・CC0）を、株の形（横に広い楕円体）に散らす。房 0.24 m（葉一枚 約 4〜5 cm）。2026-10-09
  { const sp = tx("leaf_spray2.webp", 1, 1); sp.wrapS = sp.wrapT = THREE.ClampToEdgeWrapping;
    const n = mobile ? 260 : 520, geo = new THREE.PlaneGeometry(.24, .24).translate(0, .12, 0), im = new THREE.InstancedMesh(geo, M(0xffffff, { std: true, map: sp, alphaTest: .45, side: THREE.DoubleSide, rough: .55, env: .5, uv: .04, temp: .12, wind: .02, windH: 1.2, key: "crown", hook: crownHook }), n);
    const m4 = new THREE.Matrix4(), xA = new THREE.Vector3(), yA = new THREE.Vector3(), zA = new THREE.Vector3(), c = new THREE.Color(), ctr = new Float32Array(n * 3), C = new THREE.Vector3(6.4, .5, -9.9);
    for (let i = 0; i < n; i++) { const d = new THREE.Vector3(Math.random() - .5, Math.random() * .8 - .1, Math.random() - .5).normalize(), r = .35 + Math.pow(Math.random(), .5) * .55, p = new THREE.Vector3(d.x * r * 1.25, .42 + d.y * r * .85, d.z * r);
      yA.copy(d).add(new THREE.Vector3(0, .4, 0)).normalize(); xA.crossVectors(yA, new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5)).normalize(); zA.crossVectors(xA, yA);
      m4.makeBasis(xA, yA, zA); m4.setPosition(p); im.setMatrixAt(i, m4); const l = .5 + .35 * Math.random() + .15 * Math.max(0, d.y); c.setRGB(l * .78, l * .88, l * .7); im.setColorAt(i, c); ctr.set([C.x, C.y, C.z], i * 3); }
    geo.setAttribute("aCtr", new THREE.InstancedBufferAttribute(ctr, 3)); bush.add(im);
    const stems = []; for (let i = 0; i < 9; i++) { const a = i * 2.4, g = new THREE.CylinderGeometry(.008, .015, .75, 5).translate(0, .37, 0); g.rotateZ(Math.cos(a) * .35).rotateX(Math.sin(a) * .3); stems.push(g); }
    bush.add(new THREE.Mesh(mergeGeometries(stems), M(0x5a4a3a, { uv: .05, temp: .1 }))); }
  const berryM = M(0x4a5a8a, { uv: .55, temp: .15 }), bg = new THREE.SphereGeometry(.035, 8, 6);
  { const gs = []; for (let i = 0; i < 40; i++) { const a = i * 2.39996; gs.push(bg.clone().translate(Math.cos(a) * .82, .35 + (i % 7) * .09, Math.sin(a) * .62)); } const b = new THREE.Mesh(mergeGeometries(gs), berryM); bush.add(b); sonic.push(b); }   // 実は一つの形にまとめて描く
  garden.add(bush);
});
// 蛾（夜・コウモリの獲物）
const moths = [];
for (let i = 0; i < 4; i++) {
  const m = makeCreature("chou", (c, o = {}) => M(c, { uv: .1, temp: .2, echo: 1.6, ...o }), { kind: "moth" }); m.scale.setScalar(.022 * 2.5);   // ヤガのなかま（体長 約 2 cm）の 2.5 倍
  m.userData.ph = i * 1.7; m.visible = false; garden.add(m); moths.push(m);
}
// 言葉と色の壁（黄緑→緑→青→紫・明るさ四段）。ラベルと境目は言語ごとに描きかえる
const WALL = { x: -1.5, z: -11.1, w: 4.8, h: 1.75, y: .55, cols: 12, rows: 4 };
const wallCanvas = document.createElement("canvas"); wallCanvas.width = 1536; wallCanvas.height = 600;
const wallTex = new THREE.CanvasTexture(wallCanvas); wallTex.colorSpace = THREE.SRGBColorSpace; wallTex.anisotropy = 8;
const wall = new THREE.Mesh(new THREE.PlaneGeometry(WALL.w, WALL.h), M(0xffffff, { basic: true, map: wallTex, uv: .05, temp: .2, noTone: true, fog: false }));   // 色の札は、露出の整えも霞もかけず、決めた色のまま
wall.position.set(WALL.x, WALL.y + WALL.h / 2, WALL.z);
legacyGardenSteps.push(() => {
  garden.add(wall);
  const fr = M(0x3d3428, { uv: .05, temp: .2 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(WALL.w + .2, WALL.h + .2, .08), fr); back.position.set(WALL.x, WALL.y + WALL.h / 2, WALL.z - .05); garden.add(back);
  for (const x of [-WALL.w / 2 + .3, WALL.w / 2 - .3]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.1, WALL.y + .1, .1), fr); p.position.set(x, (WALL.y + .1) / 2, WALL.z - .05); garden.add(p); }
});
const HUES = Array.from({ length: 12 }, (_, i) => 92 + i * 16);       // 92°（黄緑）〜 268°（紫）
const LIGHT = [26, 42, 58, 76];                                          // 暗い → 明るい（下の段 → 上の段）
const tileColor = (c, r) => `hsl(${HUES[c]},${r === 3 ? 62 : 55}%,${LIGHT[r]}%)`;
// 言語ごとの分け方（模式図。研究の報告をもとにした目安で、境目は人と調べ方で変わる）
const LANGS = {
  ja: { name: "日本語", cats: [["緑", "みどり", (c, r) => c <= 5 && !(c <= 1 && r >= 2)], ["黄緑", "きみどり", (c, r) => c <= 1 && r >= 2], ["青", "あお", (c, r) => c >= 6 && c <= 10 && !(c <= 9 && r === 3)], ["水色", "みずいろ", (c, r) => c >= 6 && c <= 9 && r === 3], ["紫", "むらさき", c => c === 11]], src: "Kuriki ら 2017（水色）" },
  en: { name: "English", cats: [["green", "グリーン", c => c <= 5], ["blue", "ブルー", c => c >= 6 && c <= 10], ["purple", "パープル", c => c === 11]], src: "" },
  ru: { name: "Русский", cats: [["зелёный", "ゼリョーヌイ", c => c <= 5], ["голубой", "ガルボーイ", (c, r) => c >= 6 && c <= 10 && r >= 2], ["синий", "シーニー", (c, r) => c >= 6 && c <= 10 && r <= 1], ["фиолетовый", "フィオレータヴイ", c => c === 11]], src: "Winawer ら 2007" },
  hz: { name: "ヒンバ", cats: [["dumbu", "ドゥンブ", (c, r) => c <= 1 && r >= 1 && r <= 2], ["burou", "ブロウ", (c, r) => c >= 2 && r >= 1 && r <= 2], ["zoozu", "ゾーズ", (c, r) => r === 0], ["vapa", "ヴァパ", (c, r) => r === 3]], src: "Roberson ら 2005" },
  ko: { name: "古い日本語（説）", cats: [["あを", "あお", (c, r) => r >= 1 && r <= 2], ["くろ", "くろ", (c, r) => r === 0], ["しろ", "しろ", (c, r) => r === 3]], src: "佐竹昭広 1955 の説" },
};
const IRO = { lang: null, mine: null };
function drawWall() {
  const g = wallCanvas.getContext("2d"), W = wallCanvas.width, H = wallCanvas.height, pad = 30, top = 70, gw = W - pad * 2, gh = H - top - 30, cw = gw / WALL.cols, rh = gh / WALL.rows;
  g.fillStyle = "#2a241c"; g.fillRect(0, 0, W, H);
  const cell = (c, r) => [pad + c * cw, top + (WALL.rows - 1 - r) * rh];
  for (let c = 0; c < WALL.cols; c++) for (let r = 0; r < WALL.rows; r++) { const [x, y] = cell(c, r); g.fillStyle = tileColor(c, r); g.fillRect(x + 3, y + 3, cw - 6, rh - 6); }
  g.font = "600 34px 'Hiragino Mincho ProN', serif"; g.textAlign = "center"; g.textBaseline = "middle";
  const L = IRO.lang && LANGS[IRO.lang];
  if (L) {
    const catOf = (c, r) => L.cats.findIndex(k => k[2](c, r));
    g.strokeStyle = "#fff"; g.lineWidth = 7; g.lineCap = "round";
    for (let c = 0; c < WALL.cols; c++) for (let r = 0; r < WALL.rows; r++) {
      const k = catOf(c, r), [x, y] = cell(c, r);
      if (c < WALL.cols - 1 && catOf(c + 1, r) !== k) { g.beginPath(); g.moveTo(x + cw, y); g.lineTo(x + cw, y + rh); g.stroke(); }
      if (r < WALL.rows - 1 && catOf(c, r + 1) !== k) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + cw, y); g.stroke(); }
    }
    for (const [nm, kana, f] of L.cats) {
      let sx = 0, sy = 0, n = 0; for (let c = 0; c < WALL.cols; c++) for (let r = 0; r < WALL.rows; r++) if (f(c, r)) { const [x, y] = cell(c, r); sx += x + cw / 2; sy += y + rh / 2; n++; }
      if (!n) continue; const x = sx / n, y = sy / n;
      // 字は区画の幅に収まるだけ大きく（スマホでも読めるように）
      let x0 = 1e9, x1 = -1e9; for (let c = 0; c < WALL.cols; c++) for (let r = 0; r < WALL.rows; r++) if (f(c, r)) { const [xx] = cell(c, r); x0 = Math.min(x0, xx); x1 = Math.max(x1, xx + cw); }
      const jp = /[ぁ-んァ-ン一-龥]/.test(nm), fam = jp ? "'Hiragino Mincho ProN', serif" : "'Helvetica Neue', Arial, sans-serif";
      g.font = `600 100px ${fam}`; const fs = Math.min(64, 100 * (x1 - x0) * .86 / g.measureText(nm).width); g.font = `600 ${fs}px ${fam}`; g.lineWidth = 8; g.strokeStyle = "rgba(0,0,0,.75)"; g.strokeText(nm, x, y - 12); g.fillStyle = "#fff"; g.fillText(nm, x, y - 12);
      if (kana !== nm) { g.font = `500 ${Math.min(34, fs * .6)}px 'Hiragino Sans', sans-serif`; g.lineWidth = 6; g.strokeText(kana, x, y + fs * .55); g.fillText(kana, x, y + fs * .55); }
    }
    g.font = "600 34px 'Hiragino Sans', sans-serif"; g.fillStyle = "#f3ead6"; g.textAlign = "left"; g.fillText(L.name + (L.src ? "　" : ""), pad, 36);
    if (L.src) { g.font = "24px 'Hiragino Sans', sans-serif"; g.fillStyle = "#cbbf9f"; g.textAlign = "right"; g.fillText("模式図・" + L.src, W - pad, 38); }
  } else { g.font = "600 32px 'Hiragino Sans', sans-serif"; g.fillStyle = "#f3ead6"; g.textAlign = "left"; g.fillText(IRO.mine == null ? "まん中の段で「ここから青」と思うところを押す" : "あなたの線", pad, 36); }
  if (IRO.mine != null) {
    const x = pad + IRO.mine * cw; g.strokeStyle = "#ffd25a"; g.lineWidth = 9; g.setLineDash([18, 10]); g.beginPath(); g.moveTo(x, top - 8); g.lineTo(x, top + gh + 8); g.stroke(); g.setLineDash([]);
    g.font = "600 26px 'Hiragino Sans', sans-serif"; g.fillStyle = "#ffd25a"; g.textAlign = "center"; g.fillText("あなたの線", clamp(x, 90, W - 90), H - 14);
  }
  wallTex.needsUpdate = true;
}
drawWall();

// ---------------------------------------------------------------- 土の中（ミミズ）── 森の下の別の場所（y＝UG）。明るさだけを見せる
const UG = -40;
scene.add(camera);

// ---------------------------------------------------------------- 受けとり方（lens）
//   行列は「入る linear RGB → 出す linear RGB」。紫外（uv）は uUVw の向きへ足す。数字は受けとる細胞の感度の山からの近似（README）。
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const xz = v => [v.x, v.z], xyz = v => [v.x, v.y, v.z];
const sat = s => { const w = [.2126, .7152, .0722]; return [0, 1, 2].flatMap(i => [0, 1, 2].map(j => (i === j ? s : 0) + (1 - s) * w[j])); };
const LENS = {
  hito: { eye: 1.55, m: I3, uvw: [0, 0, 0], sub: "色を受けとる細胞は三種類（三色型）", legend: "" },
  // ミツバチ：紫外・青・緑（Peitsch et al. 1992：約 340・435・540 nm）。表示は 紫外→青・青→緑・緑→赤
  hachi: { eye: .95, speed: 2.2, spot: [...xz(bed(-1.0, 0, 1.7)), ...xyz(bed(-1.9, 1.15, -.9))], m: [.18, .85, .10, 0, .15, .85, 0, 0, .02], uvw: [0, 0, 1], sub: "紫外・青・緑の三色型", legend: "<b>人の画面への置きかえ（近似）</b><br>紫外 → 青<br>青 → 緑<br>緑 → 赤<br>紫外を返すものを見ると、高い音" },
  // アゲハ：四色型（Koshitaka et al. 2008）。紫外は紫がかった光で重ねる
  chou: { eye: .9, speed: 2, spot: [...xz(bed(3.6, 0, 2.3)), ...xyz(bed(1.6, .75, .2))], m: sat(1.12), uvw: [.45, 0, .65], sub: "紫外から赤まで・四色型とされる", legend: "<b>紫がかった光</b>＝紫外を返すところ<br>（人の画面に出せない四つ目の色の置きかえ）<br>紫外を返すものを見ると、高い音" },
  // 鳥：四色型（Hart 2001）。紫外は同じく紫で重ねる
  tori: { eye: 2.3, speed: 2.4, spot: [TREE.x - 3.2, TREE.z + 3.6, TREE.x - .9, 2.4, TREE.z + .9], m: sat(1.25), uvw: [.4, 0, .7], sub: "四色型・種によって紫外まで", legend: "<b>紫がかった光</b>＝紫外を返すところ<br>（四つ目の色の置きかえ）<br>紫外を返すものを見ると、高い音" },
  // 犬：二色型（Neitz, Geist & Jacobs 1989：約 429・555 nm）。人の二色型の近似の行列（Machado et al. 2009）と、ぼかし
  inu: { eye: .5, spot: [...xz(bed(.4, 0, 4.6)), ...xyz(bed(1.4, .45, 2.2))], m: [.367322, .860646, -.227968, .280085, .672501, .047413, -.01182, .04294, .968881], uvw: [0, 0, 0], blur: .3, sub: "青と黄緑あたりの二色型", legend: "<b>二色型の近似</b><br>ぼかし＝細かさの見分けがあらい" },
  hebi: { eye: .25, mode: 1, spot: [MOUSE.x - .5, MOUSE.z + 1.4, MOUSE.x, .08, MOUSE.z], m: I3, uvw: [0, 0, 0], sub: "目と、ピット（赤外を熱で感じる）", legend: "<b>明るいところ</b>＝温かいもの<br>温かいものを見ると、低い音" },
  koumori: { eye: 2.0, mode: 2, spot: [.5, 6.5, 1, 1.6, -1], m: I3, uvw: [0, 0, 0], night: true, sub: "反響で形をとらえる（エコーロケーション）", legend: "<b>光る輪</b>＝声のとどいたところ<br>（ゆっくりにして見せている）<br>音＝人に聞こえる高さに下げた作り音" },
  mimizu: { under: "light", mode: 4, m: I3, uvw: [0, 0, 0], sub: "目はない・体で光の明るさを感じる", legend: "<b>画面の明るさ</b>＝光の明るさだけ<br>▲▼で上へ・下へ" },
};
const FLIGHT=new Set(['hachi','chou','tori','koumori']);
const MOTION={hito:{speed:1.4,bob:.025,freq:9},hachi:{speed:2.2,bob:.015,freq:35},chou:{speed:1.3,bob:.065,freq:8},tori:{speed:3.2,bob:.025,freq:12},inu:{speed:2,bob:.035,freq:11},hebi:{speed:.7,bob:.006,freq:4},koumori:{speed:2.8,bob:.025,freq:16},mimizu:{speed:.04,bob:0,freq:3}};
// 森（2026-10-12 組み直し：モグラと都市を外し、木と草花を森らしく。forest.js）
const forest=new THREE.Group();scene.add(forest);scene.add(sky);let habitat='forest',flightHeight=1.5;
// Water is a dielectric; retain the existing shape and lens cues without metallic reflection.
const waterMaterial=M(0x426e70,{std:true,rough:.13,metal:0,env:1,uv:.12,temp:.1,echo:.08});
const pool=new THREE.Mesh(new THREE.CircleGeometry(4.8,72),waterMaterial);pool.rotation.x=-Math.PI/2;pool.position.set(-8,.025,-7);pool.userData.noCast=true;forest.add(pool);
const riverCurve=new THREE.CatmullRomCurve3([[-8,-7],[-5,-13],[1,-15],[9,-12],[18,-7],[30,-2],[44,4]].map(([x,z])=>new THREE.Vector3(x,.035,z)));const river=new THREE.Mesh(new THREE.TubeGeometry(riverCurve,140,.75,12,false),waterMaterial);river.scale.y=.035;river.userData.noCast=true;forest.add(river);
STARTUP.forestBuildStartedAt = performance.now();
const FOREST=buildForest({M,tx,canvasTex,photoTex,forest,pick,sonic,mobile,riverCurve});
STARTUP.forestBuiltAt = performance.now();
for(const m of moths)forest.add(m);   // 夜の蛾は森に（2026-10-12）
scene.fog.density=mobile?.03:.026;   // 木々の奥が、かすみに溶ける
// 庭で作った生きもの（シジュウカラ・ネズミ・蝶・蜂）を、森の草地へ（碧の話に出てくるもの）。人工物の赤い板と、栽培種の実の茂みは森に置かない（2026-10-12）
{const MW=FOREST.meadow;
 bird.position.copy(FOREST.perch);bird.userData.ry0=Math.atan2(FOREST.perchDir.x,FOREST.perchDir.z)+Math.PI/2;bird.rotation.y=bird.userData.ry0;forest.add(bird);
 mouse.position.set(MW.x-2.1,.06,MW.z+2.9);mouse.userData.x0=mouse.position.x;mouse.rotation.y=2.4;forest.add(mouse);
 for(const b of [...butterflies,ageha])forest.add(b);
 const wf=FOREST.whiteFlower.pos;bee.position.set(wf.x+.18,wf.y,wf.z+.12);bee.lookAt(wf);forest.add(bee);}
const FSPOT={
  hachi:()=>{const w=FOREST.whiteFlower.pos;return [w.x+.4,w.z+1.6,w.clone().add(new THREE.Vector3(0,-.25,0))];},
  chou:()=>[FOREST.meadow.x-.6,FOREST.meadow.z+4.2,new THREE.Vector3(FOREST.meadow.x+.4,.7,FOREST.meadow.z)],
  tori:()=>{const b=bird.position;return [b.x-2.2,b.z+2.4,b.clone()];},
  hebi:()=>[mouse.position.x+.6,mouse.position.z+1.5,mouse.position.clone()],
};
const meadowBed=(x,y,z)=>new THREE.Vector3(FOREST.meadow.x-2.5+x,y,FOREST.meadow.z-.3+z);
// Each unchanged body is built on its first selection, behind the existing transition.
const bodies=Object.fromEntries(S.lens.map(l=>[l.id,null]));
// 森を飛ぶ生きもの（2026-10-12 写実の造形に。頭はいつも進む向きへ・曲がるときは内へ傾く）
//   シジュウカラ 3 羽（実物の 1.5 倍）・ナミアゲハ（2 倍）・ミツバチ（3 倍）。道すじは木の間を通るなめらかな輪
const mfR=(c,o={})=>M(c,{temp:.7,uv:.1,...o});
const residents=[
  {id:'tori',s:.145*1.5,c:[-3,-4],r:[4.2,3.1],h:[2.2,.5],w:.32,ph:0},{id:'tori',s:.145*1.5,c:[-3,-4],r:[4.2,3.1],h:[2.3,.45],w:.32,ph:-.16},{id:'tori',s:.145*1.5,c:[5,-2],r:[3.4,4.4],h:[2.6,.6],w:-.27,ph:2},
  {id:'chou',s:.03*2,c:[4,-3],r:[2.6,1.8],h:[1.0,.3],w:.22,ph:1},{id:'hachi',s:.013*3,c:[-1.5,1.5],r:[1.6,1.2],h:[.8,.25],w:-.45,ph:3},
].map((R,i)=>{const b=makeCreature(R.id,mfR,{kind:'ageha',uv:R.id==='chou'?.15:undefined,ph:i*.37});b.scale.setScalar(R.s);b.userData.kind=R.id;b.userData.R=R;b.userData.prev=new THREE.Vector3();b.userData.yaw=0;b.userData.roll=0;forest.add(b);return b;});
// 蜂の花めぐり（2026-10-13）：花の前でホバリング（小さくゆれて止まる）→ 花にとまる（翅をたたむ）→ 飛びたって、次の花へすばやく移る。
//   花はオカトラノオの群れ（草地の白い花）から近いものを選ぶ。とまる高さは目安（花穂の上のあたり）
function beeForage(b,t,dt){const F=b.userData.F||(b.userData.F={st:'go',t0:t,from:b.position.clone(),to:null,i:0,spd:0});
  if(!F.list){const c=FOREST.whiteFlower.pos;F.list=(FOREST.lists?.tora||[]).filter(it=>Math.hypot(it.x-c.x,it.z-c.z)<5).slice(0,8).map(it=>new THREE.Vector3(it.x,.72*(it.s||1)*(it.sy||1),it.z));if(F.list.length<2)F.list=[c.clone(),c.clone().add(new THREE.Vector3(.8,0,.5)),c.clone().add(new THREE.Vector3(-.6,0,.9))];b.position.copy(F.list[0]).add(new THREE.Vector3(0,.3,0));F.from.copy(b.position);}
  const fl=F.list[F.i%F.list.length],hov=fl.clone().add(new THREE.Vector3(.07,.05,.07)),u=t-F.t0;
  if(F.st==='go'){const d=F.from.distanceTo(hov),T=Math.max(.6,d/1.4),k=sstep(0,1,u/T);b.position.lerpVectors(F.from,hov,k);b.position.y+=Math.sin(Math.PI*k)*.15*Math.min(1,d);F.spd=k<1?1.4:0;b.userData.state='fly';faceVelocity(b,dt,.15,.3);if(u>=T){F.st='hover';F.t0=t;F.dur=1+Math.random()*1.5;}}
  else if(F.st==='hover'){b.position.copy(hov);F.spd=0;b.userData.state='fly';const yaw=Math.atan2(fl.x-hov.x,fl.z-hov.z);b.rotation.set(0,yaw,0,'YXZ');if(u>F.dur){F.st='land';F.t0=t;}}
  else if(F.st==='land'){const k=sstep(0,.5,u);b.position.lerpVectors(hov,fl,k);if(k>=1){F.st='rest';F.t0=t;F.dur=2+Math.random()*2.5;}}
  else if(F.st==='rest'){b.position.copy(fl);b.userData.state='rest';if(u>F.dur){F.st='go';F.t0=t;F.from=b.position.clone().add(new THREE.Vector3(0,.04,0));F.i++;b.userData.state='fly';}}
  b.userData.speed=F.spd;b.userData.animate(t,true);}
// 進む向きに頭を向ける（造形は頭が +Z）。曲がる速さに合わせて内へ傾け、上り下りで頭を上げ下げする
function faceVelocity(b,dt,bankK=.35,pitchK=1){if(!b.userData.prev){b.userData.prev=b.position.clone();b.userData.yaw=b.rotation.y;b.userData.roll=0;return;}const p=b.position,q=b.userData.prev,vx=p.x-q.x,vy=p.y-q.y,vz=p.z-q.z,h=Math.hypot(vx,vz);q.copy(p);if(h<1e-5)return;
  const yaw=Math.atan2(vx,vz),dy=wrapA(yaw-b.userData.yaw);b.userData.yaw=yaw;const turn=dt>0?dy/dt:0;b.userData.roll+=(clamp(-turn*bankK,-.8,.8)-b.userData.roll)*ease(dt,6);
  b.rotation.set(-Math.atan2(vy,h)*pitchK,yaw,b.userData.roll,'YXZ');}
window.__orient=()=>residents.concat([...butterflies,ageha]).map(b=>{const f=new THREE.Vector3(0,0,1).applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()));const p=b.getWorldPosition(new THREE.Vector3());const v=p.clone().sub(b.userData.prevW||p);b.userData.prevW=p;return {kind:b.userData.kind||'chou',deg:v.length()>1e-6?+(f.angleTo(v.normalize())*180/Math.PI).toFixed(1):null};});
// 熱（マムシのピット）の温かさ（2026-10-13 テストプレーの直し）：
//   体温を自分で保つ（恒温）鳥・けもの・人だけが、まわりより温かい。虫・ヘビ・ミミズは変温で、体温はまわりの気温に近いので、
//   まわりの地面や葉と同じ値にする（熱の見え方では、ほとんど浮かばない）。飛ぶハチの胸がわずかに温まることは「なぜ」の画面に書いた。
const AMBIENT_T = .1;
function asAmbient(o) { o.traverse(m => { if (!m.isMesh) return; for (const mt of [].concat(m.material)) { const u = mt.userData?.u; if (u?.uTemp) u.uTemp.value = AMBIENT_T; } }); }
for (const o of [...butterflies, ageha, bee, ...moths, ...residents.filter(b => b.userData.kind !== 'tori')]) asAmbient(o);
// 見る人の身体：頭を前（画面の奥）へ。曲がるときは傾く
//   2026-10-13：画面のまん中をふさがないよう、少し小さく・下へ。切り替えた直後の見せ場のあとは、うすく透ける
const bodyRoot=new THREE.Group();camera.add(bodyRoot);bodyRoot.position.set(0,-.27,-.65);bodyRoot.scale.setScalar(.2);bodyRoot.rotation.y=Math.PI;
let bodyYaw0=0,bodyRoll=0,showLens='',showT=0;
const BODYPOS={hachi:[-.19,-.78],chou:[-.2,-.84],tori:[-.2,-.84],inu:[-.3,-.98],hebi:[-.22,-.92],koumori:[-.19,-.84]};
// 切り替えた直後の「寄り」（ry＝横へ回す・rx＝手前へ傾けて背を見せる・y z＝寄せる位置・s＝大きさの倍率）
const SHOW={def:{ry:1.2,rx:0,y:-.13,z:-.52,s:1.35},hachi:{ry:1.35,rx:.12,y:-.1,z:-.44,s:1.9},tori:{ry:1.3,rx:.1,y:-.11,z:-.46,s:1.7},chou:{ry:1.0,rx:.35,y:-.12,z:-.5,s:1.45},inu:{ry:1.25,rx:.05,y:-.15,z:-.55,s:1.35},hebi:{ry:.55,rx:.85,y:-.12,z:-.5,s:1.8},koumori:{ry:.4,rx:.55,y:-.05,z:-.82,s:1.0}};
// 自分の体の質感（森の生きものと共有している質感は、透かさない）
const worldMats = new Set(); forest.traverse(o => { if (o.isMesh) for (const mt of [].concat(o.material)) worldMats.add(mt); });
const bodyMats = {};
function ensureBody(id) {
  if (bodies[id] || id === 'hito') return bodies[id];
  const b = makeBody(id, (c,o={})=>M(c,{temp:.7,uv:.05,...o}));
  if (['hachi','chou','hebi','mimizu'].includes(id)) asAmbient(b);
  const list=[]; b.traverse(o=>{if(o.isMesh)for(const mt of [].concat(o.material))if(!worldMats.has(mt))list.push([mt,mt.opacity,mt.transparent]);});
  bodyMats[id]=list; b.visible=false; bodyRoot.add(b); bodies[id]=b; return b;
}
const bodyA = {};
function setBodyAlpha(id, a) { if (Math.abs(a - (bodyA[id] ?? 1)) < .01) return; bodyA[id] = a; for (const [mt, o0, tr0] of bodyMats[id] || []) { const t = a < .999 || tr0; if (mt.transparent !== t) { mt.transparent = t; mt.needsUpdate = true; } mt.opacity = o0 * a; } }
function initLegacyGarden() {
  if (STARTUP.legacyGardenBuilt) return;
  for (const build of legacyGardenSteps) build();
  garden.traverse(o => { if (!o.isMesh || o === sky || o.userData.noShadow) return; o.receiveShadow = true; o.castShadow = !o.userData.noCast && !(mobile && o.userData.smallCast); });
  STARTUP.legacyGardenBuilt = true; renderer.shadowMap.needsUpdate = true;
}
function setHabitat(place){if(place==='garden')initLegacyGarden();habitat=place;me.path=null;me.pos.set(0,LENS[lens].eye||1.5,place==='forest'?4:11.2);me.yaw=0;me.pitch=-.05;applyLens(lens);document.querySelectorAll('[data-habitat]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.habitat===place)));setWhere();}
const LENS_IDS = S.lens.map(l => l.id);
let lens = "hito", chapter = "umwelt", lensRequest = "hito", lensToken = 0;
// 見え方だけを切りかえる（色の写し方・ぼかし・夜）。「人の目とくらべる」を押しているあいだは、ひとの見え方を一時的に重ねる（2026-10-13）
function lensVisual(id) {
  const L = LENS[id];
  G.uM.value.set(...L.m); G.uUVw.value.set(...L.uvw); G.uMode.value = L.mode || 0;
  renderer.setPixelRatio(L.blur ? Math.max(.5, BASE_PR * .5) : BASE_PR); renderer.setSize(innerWidth, innerHeight);
  renderer.domElement.style.filter = L.blur ? `blur(${mobile ? 1.6 : 2.2}px)` : "";
  const night = !!L.night;
  if (night) { hemi.intensity = .05; sun.intensity = 0; scene.fog.color.set(0x020306); } else setDay(LIT.base);
  scene.background.set(L.under ? 0x000000 : night ? 0x020306 : 0x0f1412);
  for (const m of moths) m.visible = night;
  if (FOREST.shafts) FOREST.shafts.visible = (id === 'hito' || id === 'inu') && !night;
}
let comparing = false;
function compareView(on) {
  if (on === comparing || LENS[lens].under || chapter !== "umwelt") return;
  comparing = on; lensVisual(on ? "hito" : lens); $("cmpBtn").setAttribute("aria-pressed", String(on));
  $("cmpTag").hidden = !on; $("cmpTag").textContent = on ? "人の目で見ています（はなすと " + (S.lens.find(x => x.id === lens)?.name || "") + " に戻る）" : "";
}
function applyLens(id) {
  const L = LENS[id];
  if (id === "koumori" && typeof echo !== "undefined") echo.t = 99;   // 切り替えてすぐ最初の声を出す（2026-10-14：はじめの数秒が真っ黒だった）
  if (comparing) { comparing = false; $("cmpBtn")?.setAttribute("aria-pressed", "false"); $("cmpTag") && ($("cmpTag").hidden = true); }
  G.uM.value.set(...L.m); G.uUVw.value.set(...L.uvw); G.uMode.value = L.mode || 0;
  // 犬のぼかし（2026-10-13）：画素を粗くすると四角いモザイクに見えるので、描く細かさを半分にし、画面全体をなめらかにぼかす
  renderer.setPixelRatio(L.blur ? Math.max(.5, BASE_PR * .5) : BASE_PR); renderer.setSize(innerWidth, innerHeight);
  renderer.domElement.style.filter = L.blur ? `blur(${mobile ? 1.6 : 2.2}px)` : "";
  const night = !!L.night;
  if (night) { hemi.intensity = .05; sun.intensity = 0;scene.fog.color.set(0x020306); } else setDay(LIT.base);
  scene.background.set(L.under ? 0x000000 : night ? 0x020306 : 0x0f1412);
  for (const m of moths) m.visible = night;
  garden.visible = !L.under && habitat==='garden';forest.visible=!L.under && habitat==='forest';if(FOREST.shafts)FOREST.shafts.visible=(id==='hito'||id==='inu')&&!night;
  flightHeight=L.eye||1.5;
  if (!L.under) ensureBody(id);
  Object.entries(bodies).forEach(([key,b])=>{if(b)b.visible=key===id&&key!=='hito'&&!L.under;});
  { const bp = BODYPOS[id] || [-.27, -.65]; bodyRoot.position.set(0, bp[0], bp[1]); }   // 画面の下の字幕に隠れない高さに（2026-10-12）
  $('flightControls').hidden=!FLIGHT.has(id)||chapter!=='umwelt';
  // 操作の説明（2026-10-13）：指で触る端末では、キーボードの説明を出さない
  $('moveNote').innerHTML = phrases(L.under ? '土の中 · ▲ 上へ・▼ 下へ で明るさが変わる'
    : TOUCH ? (FLIGHT.has(id) ? '飛ぶ · ↑ 長押しで進む・＋ − で上下' : (id === 'hebi' ? '地面を這う' : '歩く') + ' · ↑ 長押しで進む・なぞって見回す')
    : FLIGHT.has(id) ? '飛ぶ · W A S D ／ 上昇 R・下降 F（画面のボタンでも）' : id === 'hebi' ? '地面を這う · W A S D ／ 押した場所へ' : '歩く · W A S D ／ 押した場所へ');
  $('bodyControls').hidden = !!L.under || chapter !== 'umwelt';   // ミミズのときは ▲▼ のボタンだけ（進む・戻ると役割が重なるため）
  $("legend").innerHTML = L.legend; $("legend").hidden = !L.legend || chapter !== "umwelt";
  $("worm").hidden = id !== "mimizu" || chapter !== "umwelt";
  $("cmpBtn").hidden = id === "hito" || !!L.under || chapter !== "umwelt";
}

// ---------------------------------------------------------------- 見る人（カメラ）の動き
const me = { pos: new THREE.Vector3(0, 1.55 + ENGAWA.h, 11.2), yaw: 0, pitch: -.06, path: null, speed: 1.4, t: 0, under: 0, depth: .3 };
const gardenSave = { pos: me.pos.clone(), yaw: 0 };
const keys = new Set();
const MAX_STEP = 6;
function setFov() { const a = innerWidth / innerHeight; camera.fov = a < .8 ? 72 : a < 1.2 ? 66 : 58; camera.aspect = a; camera.updateProjectionMatrix(); }
setFov();
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); setFov(); if (chapter === "iro") { frameWall(); iroLook.x = clamp(iroLook.x, -iroLook.pan, iroLook.pan); } layoutToki(); });
function okGround(x, z) {   // 塀の内側と縁側。池・木・石組み・植え込みはよける
  if(habitat==='forest'){if(x<-27||x>29||z<-25||z>26)return false;if(!FLIGHT.has(lens)&&Math.hypot(x+8,z+7)<4.6)return false;return !FOREST.blocked(x,z,FLIGHT.has(lens)?.15:.6);}   // 幹・藪・石・倒木はよける（2026-10-25：歩く身体は幹から 0.6 m＝幹の樹皮が画面をふさがない）
  if(FLIGHT.has(lens)) return x>YARD.x0+.3&&x<YARD.x1-.3&&z>YARD.z0+.3&&z<ENGAWA.z1-.5;
  if (x < YARD.x0 + .4 || x > YARD.x1 - .4 || z < YARD.z0 + .4 || z > ENGAWA.z1 - .5) return false;
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + .3 || Math.hypot(x - TREE.x, z - TREE.z) < .7) return false;
  if (STONES.some(st => Math.hypot(x - st.x, z - st.z) < st.r * .75)) return false;
  return !(x > 8.1 && z > -4.4 && z < 3.9);
}
function walkTo(x, z) {
  // 一回の押しは 6 m まで（森羅博物館と同じ）。池・木・庭の外はよける
  let dx = x - me.pos.x, dz = z - me.pos.z, d = Math.hypot(dx, dz);
  if (d > MAX_STEP) { x = me.pos.x + dx / d * MAX_STEP; z = me.pos.z + dz / d * MAX_STEP; d = MAX_STEP; }
  for (let k = 0; k < 12 && !okGround(x, z); k++) { x = me.pos.x + (x - me.pos.x) * .8; z = me.pos.z + (z - me.pos.z) * .8; }
  if (!okGround(x, z) || d < .15) return false;
  me.path = new THREE.Vector3(x, 0, z); ring(x, z); return true;
}
// 押したところの印
const ringM = new THREE.Mesh(new THREE.RingGeometry(.18, .24, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
ringM.rotation.x = -Math.PI / 2; scene.add(ringM);
function ring(x, z) { ringM.position.set(x, .03, z); ringM.material.opacity = .8; ringM.scale.setScalar(1); }
function moveCam(dt) {
  const L = LENS[lens];
  if (chapter !== "umwelt") return;
  if (L?.under === "light") { me.pos.set(0, UG, 0); return; }
  // 歩く
  let fx = 0, fz = 0; const sp = MOTION[lens].speed;
  if (keys.has("w") || keys.has("arrowup")) fz -= 1; if (keys.has("s") || keys.has("arrowdown")) fz += 1;
  if (keys.has("a")) fx -= 1; if (keys.has("d")) fx += 1;
  if (keys.has("arrowleft") || keys.has("q")) me.yaw += 1.6 * dt; if (keys.has("arrowright") || keys.has("e")) me.yaw -= 1.6 * dt;
  if (fx || fz) {
    me.path = null; const c = Math.cos(me.yaw), s = Math.sin(me.yaw);
    const nx = me.pos.x + (fx * c + fz * s) * sp * dt, nz = me.pos.z + (-fx * s + fz * c) * sp * dt;
    if (okGround(nx, nz)) { me.pos.x = nx; me.pos.z = nz; } else if (okGround(nx, me.pos.z)) me.pos.x = nx; else if (okGround(me.pos.x, nz)) me.pos.z = nz;
  } else if (me.path) {
    const dx = me.path.x - me.pos.x, dz = me.path.z - me.pos.z, d = Math.hypot(dx, dz);
    if (d < .05) { me.path = null; }
    else { const v = Math.min(d, sp * dt * clamp(d / .6, .35, 1)); me.pos.x += dx / d * v; me.pos.z += dz / d * v;
      if (!drag.on && !drag.recent) { const want = Math.atan2(-dx, -dz); me.yaw += wrapA(want - me.yaw) * ease(dt, 1.6); } }
  }
  let eye=(L?.eye??1.55)+(habitat==='garden'&&me.pos.z>ENGAWA.z0?ENGAWA.h:0);
  if(FLIGHT.has(lens)){const up=keys.has('r'),down=keys.has('f');flightHeight=clamp(flightHeight+((up?1:0)-(down?1:0))*dt*1.4,.25,8);eye=flightHeight;}
  me.pos.y += (eye - me.pos.y) * ease(dt, 6);   // 縁側の上では床の高さぶん上
}
// なぞる（ドラッグ）と押す（タップ）を分ける。数 px 動いたらタップにしない、二本指もタップにしない
const drag = { on: false, x: 0, y: 0, moved: 0, id: null, recent: false, multi: false };
const el = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const ptrs = new Map();
el.addEventListener("pointerdown", e => {
  if (!started) drag.firstTap = true;   // 2026-10-14：はじめの一押しは「はじめる」だけ（押した所へ歩きださない＝碧が背を向けて歩いていった）
  first();
  ptrs.set(e.pointerId, e); drag.multi = ptrs.size > 1;
  drag.on = true; drag.x = e.clientX; drag.y = e.clientY; drag.moved = 0; drag.id = e.pointerId; el.setPointerCapture?.(e.pointerId);
});
el.addEventListener("pointermove", e => {
  if (!drag.on || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
  if (drag.moved > (mobile ? 10 : 6)) { drag.recent = true; if (chapter === "iro" || chapter === "toki") { if (chapter === "iro") { if (iroLook.pan) iroLook.x = clamp(iroLook.x - dx * iroLook.k, -iroLook.pan, iroLook.pan); else { iroLook.yaw = clamp(iroLook.yaw + dx * .003, -.5, .5); iroLook.pitch = clamp(iroLook.pitch + dy * .003, -.3, .3); } } return; }
    me.yaw += dx * .0042; me.pitch = clamp(me.pitch + dy * .0034, -1.1, 1.0); }
});
const endPtr = e => {
  ptrs.delete(e.pointerId);
  if (!drag.on || e.pointerId !== drag.id) return; drag.on = false;
  const tap = drag.moved <= (mobile ? 10 : 6) && !drag.multi; if (!ptrs.size) drag.multi = false;
  setTimeout(() => drag.recent = false, 400);
  if (drag.firstTap) { drag.firstTap = false; return; }
  if (tap && e.type === "pointerup") onTap(e.clientX, e.clientY);
};
el.addEventListener("pointerup", endPtr); el.addEventListener("pointercancel", endPtr);
function onTap(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (chapter === "iro") {
    const h = ray.intersectObject(wall)[0]; if (!h) return;
    const u = h.uv.x, v = h.uv.y, W = 1536, H = 600, pad = 30, top = 70, gw = W - pad * 2, gh = H - top - 30;
    const px = u * W, py = (1 - v) * H; if (py < top || py > top + gh) return;
    const col = clamp(Math.round((px - pad) / (gw / WALL.cols)), 1, WALL.cols - 1);
    iroMine(col); return;
  }
  if (chapter !== "umwelt") return;
  const L = LENS[lens];
  if (L.under) return;
  const h = ray.intersectObjects(pick)[0]; if (h) walkTo(h.point.x, h.point.z);
}
addEventListener("keydown", e => {
  // 設定・説明を読んでいる間は庭の移動・視点・音声のショートカットを止める。
  if (!$("why").hidden) { if (e.key === "Tab") { const items = [...$("why").querySelectorAll("button")]; const i = items.indexOf(document.activeElement); if (e.shiftKey ? i <= 0 : i === items.length - 1) { e.preventDefault(); (e.shiftKey ? items[items.length - 1] : items[0]).focus(); } } return; }
  if (!$("menu").hidden) {
    if (e.key === "Escape") { e.preventDefault(); closeMenu(); }
    if (e.key === "Tab") {
      const items = [...$("menu").querySelectorAll('button,input,a[href]')].filter(el => !el.disabled && el.getClientRects().length);
      const firstItem = items[0], lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem?.focus(); }
      else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem?.focus(); }
    }
    return;
  }
  if (e.target.closest?.("input,button") && e.key === " ") return;
  const k = e.key.toLowerCase(); first();
  if (/^[1-8]$/.test(k) && chapter === "umwelt") { setLens(LENS_IDS[+k - 1]); return; }
  if (k === " ") { e.preventDefault(); pauseSpeech(!SP.paused); return; }
  if (k === "n") { skipLine(); return; }
  if (k === "escape") { $("menu").hidden = true; return; }
  keys.add(k);
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => { keys.clear(); compareView(false); });

// ---------------------------------------------------------------- 音（はじめに押してから。碧の声・その場で作る音だけ。録音は使わない）
const AUD = {
  ctx: null, master: null, voice: null, an: null, td: null, hum: null, uvTone: null,
  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C(); this.master = c.createGain(); this.master.gain.value = $("optSound").checked ? 1 : 0; this.master.connect(c.destination);
    const v = this.voice = new Audio(); v.preload = "auto";
    try { const s = c.createMediaElementSource(v); this.an = c.createAnalyser(); this.an.fftSize = 512; s.connect(this.an); const vg = c.createGain(); vg.gain.value = 1.1; this.an.connect(vg); vg.connect(this.master); } catch {}
    this.td = new Uint8Array(512);
    // 庭の風（ノイズを低く濾した音）
    const n = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { last = last * .985 + (Math.random() * 2 - 1) * .015; d[i] = last * 3.2; }
    n.buffer = b; n.loop = true; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600; this.wind = c.createGain(); this.wind.gain.value = .0;
    n.connect(lp); lp.connect(this.wind); this.wind.connect(this.master); n.start();
    // 温かさの音（マムシ）と紫外の音（蜂・蝶・鳥）
    const mk = (type, f, q) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const g = c.createGain(); g.gain.value = 0; o.connect(g); g.connect(this.master); o.start(); return { o, g }; };
    this.hum = mk("sine", 92, 0); this.uvTone = mk("triangle", 1320, 0);
    c.resume?.();
  },
  level() { if (!this.an || !SP.playing) return 0; this.an.getByteTimeDomainData(this.td); let s = 0; for (let k = 0; k < this.td.length; k += 4) { const x = (this.td[k] - 128) / 128; s += x * x; } return Math.sqrt(s / (this.td.length / 4)); },
  set(g, v, tc = .15) { if (this.ctx) g.gain.setTargetAtTime(v, this.ctx.currentTime, tc); },
};
function chirp(at, f0, f1, dur, vol) {
  const c = AUD.ctx; if (!c) return; const t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0008, t + dur); o.connect(g); g.connect(AUD.master); o.start(t); o.stop(t + dur + .02);
}
function thump(vol = .5) {
  const c = AUD.ctx; if (!c) return; const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(34, t + .35); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); o.connect(g); g.connect(AUD.master); o.start(t); o.stop(t + .55);
}
let tickT = 0;
function tick() { lastTick = performance.now(); const c = AUD.ctx; if (!c || c.currentTime - tickT < .09) return; tickT = c.currentTime; chirp(0, 2600 + Math.random() * 900, 1800, .025, .05); }

// ---------------------------------------------------------------- 碧の声と字幕（字幕＝話すことばそのもの）
const SP = { tok: 0, playing: false, paused: false, resolve: null, timer: null, t0: 0, rest: 0 };
const voiceOn = () => AUD.ctx && $("optVoice").checked && $("optSound").checked;
const est = t => 900 + t.length * 135;
function speakLine(text) {
  return new Promise(res => {
    $("say").textContent = text; $("guide").classList.add("talking");
    // 四つの時計：いま話している窓を光らせる（スマホの 2×2 でも、PC の横並びでも同じ窓を指す）
    { const k = S.toki.indexOf(text) - 1; tokiFrames.forEach((f, i) => f.classList.toggle("on", i === k)); } A.talkT = 0; window.__said = (window.__said || []).concat([text]).slice(-40);
    const v = VOICE[text];
    const done = () => { clearTimeout(SP.timer); SP.timer = null; SP.resolve = null; SP.playing = false; $("guide").classList.remove("talking"); AM?.stopSpeaking(); res(); };
    SP.resolve = done;
    const timed = ms => { SP.rest = ms; SP.t0 = performance.now(); if (!SP.paused) SP.timer = setTimeout(done, ms); };
    if (v && voiceOn()) {
      const a = AUD.voice; a.onended = done; a.onerror = () => timed(est(text)); a.src = v.f; a.currentTime = 0; SP.playing = true; window.__voiceSrc = v.f;
      if (!SP.paused) a.play().catch(() => { SP.playing = false; timed(est(text)); });
      AM?.speak({ kana: v.kana, text, dur: v.dur || est(text) / 1000, clock: () => a.currentTime, level: () => AUD.level() * 7, gesture: aoiGestures(text, v.kana, v.dur || est(text) / 1000) });   // 口は声の読み（かな）と再生位置に合わせる
    } else { timed(est(text)); AM?.speak({ kana: v?.kana || "", text, dur: est(text) / 1000, gesture: aoiGestures(text, v?.kana || "", est(text) / 1000) }); }
  });
}
function pauseSpeech(on) {
  SP.paused = on;
  if (SP.playing) on ? AUD.voice.pause() : AUD.voice.play().catch(() => {});
  else if (SP.resolve) { if (on) { clearTimeout(SP.timer); SP.rest = Math.max(400, SP.rest - (performance.now() - SP.t0)); } else { SP.t0 = performance.now(); SP.timer = setTimeout(SP.resolve, SP.rest); } }
  setActs(curActs);
}
function skipLine() { if (SP.playing) AUD.voice.pause(); SP.resolve?.(); }
function hush() { SP.tok++; if (SP.playing) AUD.voice.pause(); SP.resolve?.(); }
async function sayQ(lines) {
  const tok = ++SP.tok; if (SP.playing) AUD.voice.pause(); SP.resolve?.();
  for (const l of [].concat(lines).filter(Boolean)) {
    while (SP.paused && tok === SP.tok) await sleep(150);
    if (tok !== SP.tok) return false;
    await speakLine(l); if (tok !== SP.tok) return false; await sleep(340);
  }
  return tok === SP.tok;
}
let curActs = [];
function setActs(list) {
  curActs = list; const box = $("acts"); box.innerHTML = "";
  for (const a of list) { const b = document.createElement("button"); b.className = "btn" + (a[2] ? " pri" : ""); b.textContent = typeof a[0] === "function" ? a[0]() : a[0]; if (a[3]) b.setAttribute("aria-label", a[3]); b.onclick = a[1]; box.appendChild(b); }
}
// 2026-10-25 碧の自然さ：「広がっています」などで両腕を左右対称に一瞬だけ大きく開く身ぶり（0.3 秒）が、操り人形のように見えた → 片手で、手のひらを上に差し出す身ぶりにゆっくり置きかえる
function aoiGestures(text, kana, dur) {
  let g = []; try { g = inferGestures({ text, kana, dur }); } catch (e) { return []; }
  g = g.map(x => x.type === "iconic" && x.shape === "large" ? { t: x.t, type: "metaphoric", shape: "present", hand: "right", hold: .8, big: true } : x);
  // 2026-10-25（採点「話すあいだの身ぶりが小さい」）：身ぶりの語がない 2.2 秒以上の行は、二行に一度、句の頭の少しあとで片手を小さく差し出す（左右を交互に）
  if (!g.length && dur > 2.2 && (aoiGestures.n = (aoiGestures.n || 0) + 1) % 2) g.push({ t: Math.min(1.1, dur * .3), type: "metaphoric", shape: "present", hand: aoiGestures.n % 4 === 1 ? "right" : "left", hold: .7, big: true });
  return g;
}
const talkActs = extra => [[() => SP.paused ? "▶ 続ける" : "⏸", () => pauseSpeech(!SP.paused), false, "碧の話を止める・続ける"], ["⏭", skipLine, false, "このことばをとばす"], ...extra];
function talk(lines, extra = []) { if (SP.paused) SP.paused = false;   // 止めたまま切り替えたら、新しい話から始める（字幕が前の文のまま残らない）
  setActs(talkActs(extra)); return sayQ(lines).then(ok => { if (ok) setActs(extra); return ok; }); }

// ---------------------------------------------------------------- 碧（依代）── 森羅博物館と同じ姿・同じ声。庭のまん中に、揺れずにゆっくり現れる
const AOI_H = 1.62;
let aoi = null, vrm = null, AM = null;   // AM＝碧の動き（AoiMotion）
const A = { pos: new THREE.Vector3(0, 0, 3.2), vel: new THREE.Vector3(), yaw: 0, sp: 0, k: 0, ph: 0, tk: 0, ws: 3, wsTo: .5, wsv: 0, tl: 14, tlT: null, tlS: 1, blink: 2, bt: -1, hip0: null, mouth: 0, talkT: 0, fade: 0, calm: 2, cur: {}, show: true, spot: null, spotLens: null };
async function loadAoi() {
  try {
    const loaded = await aoiAssetTask; if (loaded.error) throw loaded.error;
    const { gltf: g, V } = loaded.value; prog(95);
    const v = g.userData.vrm; if (!v) throw new Error("VRM ではない");
    V.VRMUtils.removeUnnecessaryVertices(g.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(g.scene); V.VRMUtils.rotateVRM0(v);
    v.scene.traverse(o => { o.frustumCulled = false; if (o.isMesh) o.castShadow = true; });
    aoi = new THREE.Group(); aoi.add(v.scene); garden.add(aoi); vrm = v;
    v.humanoid.resetNormalizedPose(); v.update(0); v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(v.scene), h = box.max.y - box.min.y, sc = h > .5 ? AOI_H / h : 1;
    v.scene.scale.setScalar(sc); v.scene.position.y = -box.min.y * sc;
    aoi.traverse(o=>{if(o.isMesh){o.material=[].concat(o.material).map(m=>{const n=new THREE.MeshStandardMaterial({map:m.map||null,color:m.color?.clone()||new THREE.Color(0xffffff),side:m.side,transparent:m.transparent,alphaTest:m.alphaTest||0,roughness:.85});n.name=m.name;if(/SKIN/i.test(m.name)){n.emissiveMap=m.map;n.emissive=new THREE.Color(.24,.2,.19);n.roughness=.7;}else if(/EYE|FACE/i.test(m.name)){n.emissiveMap=m.map;n.emissive=new THREE.Color(.45,.45,.45);}else if(/HAIR/i.test(m.name)){n.roughness=.62;}/* 2026-10-15：肌は光の当たらない側も少し透けて明るく（MToon から写すと顔が暗く沈んでいた）・目は暗くしない */prep(n,{uv:.04,temp:.75,echo:1});return n;});if(o.material.length===1)o.material=o.material[0];}});
    A.mats = []; aoi.traverse(m => { if (m.isMesh) for (const mt of [].concat(m.material)) A.mats.push([mt, mt.transparent, mt.depthWrite]); });
    // 2026-10-13：体の動き・目・まばたき・口・表情・裾の布は共通部品 AoiMotion に任せる（本人「碧の動きを極限まで人間の自然な動作に近づけて」「表情も大事です」）
    aoi.position.copy(A.pos); aoi.updateMatrixWorld(true);
    AM = new AoiMotion(v, { root: aoi, reducedMotion: RM, wind: .35, startCalm: 2.2, posture: "upright", uprightWeight: .6, faceLight: .6 });   /* 2026-10-19：片足荷重 .6（kit v5.9。.38／.6／.9 を同じ場面で 11 人が比べ、.6 が自然さ 76） */ AM.place(A.pos.x, A.pos.z, A.yaw);
    // 2026-10-25（採点「差し出す手が手首から先だけ」）：このアプリの差し出す身ぶり（big）だけ、手を肘から前へ・前腕を水平近くまで上げる（共通部品は変えない）
    { const gp = AM._gPose.bind(AM); AM._gPose = (part, sd, out) => { const r = gp(part, sd, out); if (part.g.big && part.g.type === "metaphoric" && part.g.shape !== "contrast") { out.p.y += .09; out.p.z += .12; out.p.x += (sd === "left" ? 1 : -1) * .06; out.shape = "flat"; } return r; }; }
    opacity(0); window.__aoi = { vrm, aoi, A, M: AM }; STARTUP.aoiReadyAt = performance.now();
  } catch (e) { console.warn("碧の姿を読み込めませんでした（声と字幕で案内します）：", e?.message ?? e); }
}
function opacity(o) { for (const [mt, tr, dw] of A.mats) { const transparent = o < 1 ? true : tr; if(mt.transparent !== transparent){mt.transparent=transparent;mt.needsUpdate=true;} mt.opacity = o; mt.depthWrite = o < 1 ? o > .6 : dw; } }
// 碧の小さな窓：マムシ・コウモリ・ミミズのときは、画面の隅に碧が目を閉じて、同じ受けとり方で「一緒に感じている」姿を出す。
//   窓のふちの光は、その受けとり方の信号（熱・反響・ふれ・光の明るさ）と同じ拍子で強まる。
const aoiScene = new THREE.Scene();
aoiScene.add(new THREE.HemisphereLight(0xeef6ff, 0x404840, 1.7)); { const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(.6, 2, 2); aoiScene.add(d); }
const aoiCam = new THREE.PerspectiveCamera(26, 1, .05, 20); aoiCam.position.set(0, 1.42, 1.25); aoiCam.lookAt(0, 1.36, 0);
const WIN = {
  hebi: { c: "#ff9a4a", bg: 0x2a1410, cap: "碧も目を閉じて、熱を感じています" },
  koumori: { c: "#9fd4ff", bg: 0x050b14, cap: "碧も、反響に耳をすましています" },
  mimizu: { c: "#ffffff", bg: 0x101010, cap: "碧も、光の明るさだけを感じています" },
};
let winSig = 0, lastHeat = 0, lastTick = 0;
const winMode = () => !!vrm && chapter === "umwelt" && !!LENS[lens].under;
function aoiWindowTick(dt) {
  const w = WIN[lens]; $("aoiWin").hidden = false; $("aoiWinCap").textContent = w.cap; $("aoiWin").style.setProperty("--ac", w.c);
  if (aoi.parent !== aoiScene) { aoiScene.add(aoi); A.vel.set(0, 0, 0); A.sp = 0; AM.calm = 1.2; AM.place(0, 0, 0); }
  aoi.visible = true; A.talkT += dt;
  AM.eyesClosed = .9;     // 目を閉じて、感じている
  AM.faceTo(0); AM.lookAt(null); AM.update(dt, aoiCam);
  if (A.fade < 1) { A.fade = Math.min(1, A.fade + Math.max(dt, RDT) / 1.2); opacity(A.fade); }
  // 信号の強さ（0〜1）
  const sig = lens === "hebi" ? lastHeat : lens === "koumori" ? Math.exp(-echo.t * 4) : G.uWorm.value;
  winSig += (sig - winSig) * ease(dt, 10); $("aoiWin").style.setProperty("--sig", winSig.toFixed(3));
}
function renderAoiWindow() {
  const r = $("aoiWin").getBoundingClientRect(), H = innerHeight;
  renderer.setScissorTest(true); renderer.setViewport(r.left, H - r.bottom, r.width, r.height); renderer.setScissor(r.left, H - r.bottom, r.width, r.height);
  aoiCam.aspect = r.width / r.height; aoiCam.updateProjectionMatrix();
  aoiScene.background = new THREE.Color(WIN[lens].bg);
  const savedCam=G.uCam.value.clone(),savedTouch=G.uTouch.value.clone();G.uCam.value.copy(aoiCam.position);G.uTouch.value.set(0,1.35,0,.4);renderer.render(aoiScene,aoiCam);G.uCam.value.copy(savedCam);G.uTouch.value.copy(savedTouch);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight);
}
// 碧が立つ向き（ひとのとき）：画面の幅の割合で決める（2026-10-14：560px・320px の幅では右の端の操作ボタンの下に隠れていた）。PC は右寄り、縦長はまん中寄り
function aoiSideAng(hf) { const asp = innerWidth / innerHeight, ndc = asp >= 1.2 ? .6 : asp >= .8 ? .36 : .3; return Math.atan(ndc * Math.tan(hf / 2)); }
// 2026-10-25 碧の自然さ（採点「話していないあいだは棒立ち」）：黙って立っているとき、5〜9 秒に一度、近くの草や木の根もとへ目と顔を 1.5〜2.5 秒向けて、また見る人へ戻す
//   2026-10-26 本人「Qualium 以外には、碧だけで、かさねっこは入れないでください」→ かさねっこを外し、目を向ける先は森の足もとにした
const GL = { t: 4, on: false, until: 0, v: new THREE.Vector3() };
function aoiGlance(dt) {
  const quiet = !SP.playing && !SP.resolve && !me.path && !keys.size && A.sp < .15;
  if (!quiet) { GL.on = false; GL.t = Math.max(GL.t, 2.5); return null; }
  if (GL.on) { GL.until -= dt; if (GL.until <= 0) { GL.on = false; GL.t = 5 + Math.random() * 4; return null; } return GL.v; }
  GL.t -= dt; if (GL.t > 0) return null;
  GL.t = 5 + Math.random() * 4;
  const ang = A.yaw + (Math.random() < .5 ? -1 : 1) * (.5 + Math.random() * .7), d = 2 + Math.random() * 2;
  GL.v.set(A.pos.x + Math.sin(ang) * d, .18, A.pos.z + Math.cos(ang) * d); GL.on = true; GL.until = 1.5 + Math.random();
  return null;
}
function aoiTick(dt) {
  if (!vrm) return;
  if (A.hold) { aoi.visible = false; return; }
  if (winMode()) { aoiWindowTick(dt); return; }
  $("aoiWin").hidden = true;
  AM.eyesClosed = 0;
  if (aoi.parent !== (habitat==='forest'?forest:garden)) { (habitat==='forest'?forest:garden).add(aoi); A.fade = 0; opacity(0); AM.calm = 1.2; AM.place(A.pos.x, A.pos.z, A.yaw); }
  const L = LENS[lens], showNow = A.show && (chapter === "umwelt" ? !L.under : chapter === "iro");
  aoi.visible = showNow;
  if (!showNow) return;
  // ふだんは見る人の右前（となりを歩く）。言葉と色では壁のわき
  let goal;
  if (chapter === "iro") goal = new THREE.Vector3(WALL.x + WALL.w / 2 + .7, 0, WALL.z + 1.1);
  else if (A.fade < 1 && A.intro) goal = A.pos.clone();
  else {
    // 2026-10-08：生きものに切り替えているあいだは、碧は視界の端の少し奥（景色を隠さない）。ひとのときはとなりの右前
    const hf = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect), creature = lens !== "hito";
    const nar = innerWidth / innerHeight < .8, D = KUR.on ? (nar ? 6.2 : lens === "hebi" ? 6.4 : 4.6) : creature ? 4.6 : (innerWidth / innerHeight < .8 ? 4.0 : 2.6), ang = (creature || KUR.on) ? hf / 2 * (nar ? (KUR.on ? .56 : .4) : .62) : aoiSideAng(hf);   // 縦長では右の操作ボタンに隠れないよう、まん中寄り（2026-10-14）   // くらべる旅では、花を見下ろしても頭が切れないよう少し奥に   // 縦長では右の操作ボタンに隠れないよう、まん中寄り（2026-10-13）
    const F = D * Math.cos(ang), X = D * Math.sin(ang), fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw);
    // 2026-10-12：見る人が向きを変えるたびに追いかけない（森羅研究室と同じ）。歩いているとき・視野の外に出たとき・近すぎ／遠すぎのときだけ立つ所を決めなおす
    const walking = !!me.path || ["w", "s", "a", "d", "arrowup", "arrowdown"].some(k => keys.has(k));
    const dMe = Math.hypot(A.pos.x - me.pos.x, A.pos.z - me.pos.z), rel = wrapA(Math.atan2(A.pos.x - me.pos.x, A.pos.z - me.pos.z) - Math.atan2(fx, fz));
    // 2026-10-25（採点 P1）：向きを変えたあと、碧が画面の端で右の操作ボタン・下の帯の裏に切れて残っていた → 画面の端の帯（375 は外側 38%、PC は 20%）に入ったら、立つ所を決めなおす
    const ndcX = Math.abs(rel) < 1.5 ? Math.tan(Math.abs(rel)) / Math.tan(hf / 2) : 9;
    if (!A.spot || walking || A.spotLens !== lens || dMe > D + 2.2 || dMe < 1.8 || ndcX > (nar ? .62 : .8)) {
      const lead = walking ? 1.4 : 0;   // 2026-10-25：歩いているあいだは少し先を歩く（追いかけて画面の右端・操作ボタンの裏に残らない）
      A.spot = new THREE.Vector3(me.pos.x + fx * (F + lead) - fz * X, 0, me.pos.z + fz * (F + lead) + fx * X);
      for (let k = 0; k < 6 && !okGround(A.spot.x, A.spot.z); k++) A.spot.lerp(new THREE.Vector3(me.pos.x, 0, me.pos.z), .4);
      A.spotLens = lens;
    }
    goal = A.spot;
  }
  // 遠く（5 m より先）へ移るときは、歩かせずに立つ所へ置きなおし、薄くから現れる（2026-10-13：くらべる旅で 9 m ほど先へ移ると、急いで歩く足の届かない姿勢が崩れて見えた）
  if (A.pos.distanceTo(goal) > 5) { A.pos.copy(goal); A.vel.set(0, 0, 0); A.sp = 0; AM.place(A.pos.x, A.pos.z); AM.calm = 1.2; A.fade = 0; opacity(0); A.appear = true; }
  const w = 3.2, n = Math.max(1, Math.ceil(dt / .02)), h = dt / n;
  for (let i = 0; i < n; i++) {
    A.vel.x += (w * w * (goal.x - A.pos.x) - 2 * w * A.vel.x) * h; A.vel.z += (w * w * (goal.z - A.pos.z) - 2 * w * A.vel.z) * h;
    { const dx = A.pos.x - me.pos.x, dz = A.pos.z - me.pos.z, d = Math.hypot(dx, dz); if (d < 1.4 && d > 1e-3) { const f = (1.4 - d) * 9, sx = -dz / d, sz = dx / d, sd = Math.sign(sx * A.vel.x + sz * A.vel.z) || 1; A.vel.x += (dx / d + sx * sd) * f * h; A.vel.z += (dz / d + sz * sd) * f * h; } }   // 見る人を通りぬけず、よけて回る
    const m = Math.hypot(A.vel.x, A.vel.z); if (m > 2.4) A.vel.multiplyScalar(2.4 / m);
    A.pos.x += A.vel.x * h; A.pos.z += A.vel.z * h;
  }
  A.sp += (Math.hypot(A.vel.x, A.vel.z) - A.sp) * ease(dt, 5);
  if (Math.hypot(A.pos.x - me.pos.x, A.pos.z - me.pos.z) < .8) aoi.visible = false;
  A.talkT += dt;
  // 体・足・向き・目・まばたき・口・表情・裾は AoiMotion（位置だけこちらで決める。向きは歩く向き／止まると見る人へ、足を踏みかえて）
  AM.faceTo(null); AM.lookAt(aoiGlance(dt)); AM.drive(A.pos.x, A.pos.z); AM.update(dt, camera); A.yaw = AM.yaw;
  if (A.fade < 1 && A.appear) { A.fade = Math.min(1, A.fade + Math.max(dt, RDT) / (A.intro ? (A.late ? .55 : .18) : 2.2)); opacity(A.fade * A.fade * (3 - 2 * A.fade));  if (A.late && A.intro) { const sh = A.fade >= 1; if (A.shadowOn !== sh) { A.shadowOn = sh; aoi.traverse(o => { if (o.isMesh) o.castShadow = sh; }); renderer.shadowMap.needsUpdate = true; } } }   // 透けている間は影を落とさない（半透明の体に濃い影は不自然・影の材質の組み立てを現れ終わりのあとへ回す）   // 初回は180msで表示。体験中の出現は従来の2.2秒を保つ（2026-10-17）。幕のあとに届いたときは 0.55 秒（2026-10-25 起動 5 秒）
}
// 体の動き（以前の pose() ＝森羅研究室の式の写し）は、2026-10-13 に共通部品 AoiMotion へ置きかえた。元＝../旧ver/2026-10-13_碧の動きv3の前/umwelt.js

// ---------------------------------------------------------------- 受けとり方を切り替える
const dial = $("dial"), spoken = new Set();
const pendingPortraits = new Set(S.lens.map(l => l.id));
let portraitTask = null;
function schedulePortraits() {
  if (portraitTask !== null || document.hidden || !(STARTUP.interactiveAt || STARTUP.fallbackAt)) return;
  if (!pendingPortraits.size) { disposePortraitRenderer(); STARTUP.portraitsReadyAt ||= performance.now(); return; }
  const renderOne = () => {
    portraitTask = null; if (document.hidden) return;
    const id = [...pendingPortraits].find(id => !dial.querySelector(`[data-id="${id}"]`).hidden) || pendingPortraits.values().next().value;
    pendingPortraits.delete(id);
    try { const img = dial.querySelector(`[data-id="${id}"] img`); img.src = id === 'hito' && vrm ? humanPortrait(aoi,vrm) : creaturePortrait(id); img.style.visibility = ''; if(id === 'hito')img.alt='人の身体を表す碧の3D'; }
    catch (e) { console.warn('生きものの肖像', id, e); }
    schedulePortraits();
  };
  portraitTask = window.requestIdleCallback ? requestIdleCallback(renderOne, { timeout: 1200 }) : setTimeout(renderOne, 80);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) schedulePortraits(); });
for (const [i, l] of S.lens.entries()) {
  const b = document.createElement("button"); b.className = "pill"; b.dataset.id = l.id; b.setAttribute("aria-pressed", String(l.id === lens)); b.setAttribute("aria-keyshortcuts", String(i + 1));
  b.innerHTML = `<img class="creaturePortrait" alt="" ${l.id === 'hito' ? `src="${P.face}"` : 'style="visibility:hidden"'}><span>${l.name}</span><i>${i + 1}</i>`; b.setAttribute("aria-label",`${l.name}の身体と受けとり方`); b.onclick = () => { first(false); setLens(l.id); }; dial.appendChild(b);
}
function layoutBodyWheel(){const selected=LENS_IDS.indexOf(lensRequest);[...dial.children].forEach((b,i)=>{const NL=LENS_IDS.length;let d=(i-selected+NL)%NL;if(d>NL/2)d-=NL;b.hidden=Math.abs(d)>2;const mobile=innerWidth<700,y=d*(mobile?57:67),x=(mobile?6:16)*(1-Math.abs(d)*.5);b.style.transform=`translate(${x}px,${y-34}px) scale(${1-Math.abs(d)*.06})`;b.style.opacity=String(1-Math.abs(d)*.16);});}
$('bodyPrev').onclick=()=>setLens(LENS_IDS[(LENS_IDS.indexOf(lensRequest)+LENS_IDS.length-1)%LENS_IDS.length]);$('bodyNext').onclick=()=>setLens(LENS_IDS[(LENS_IDS.indexOf(lensRequest)+1)%LENS_IDS.length]);$('bodyWheel').addEventListener('wheel',e=>{e.preventDefault();if(!e.repeat)setLens(LENS_IDS[(LENS_IDS.indexOf(lensRequest)+(e.deltaY>0?1:LENS_IDS.length-1))%LENS_IDS.length]);},{passive:false});addEventListener('resize',layoutBodyWheel);layoutBodyWheel();
async function veil(fn, token) { $("veil").classList.add("on"); await sleep(RM ? 60 : 260); if(token!==undefined&&token!==lensToken)return false; fn(); await sleep(60); if(token!==undefined&&token!==lensToken)return false; $("veil").classList.remove("on");return true; }
function setWhere() {
  if (chapter === "umwelt") { const l = S.lens.find(x => x.id === lens); $("whereName").textContent = l.name; $("whereSub").innerHTML = phrases(LENS[lens].sub); }
  else if (chapter === "iro") { $("whereName").textContent = N.ch_iro; $("whereSub").textContent = IRO.lang ? LANGS[IRO.lang].name : "あなたの線を引く"; }
  else { $("whereName").textContent = N.ch_toki; $("whereSub").textContent = "同じ庭を、四つの速さで"; }
}
async function setLens(id, silent = false, opt = {}) {
  if (!LENS[id]) return;
  first(false);
  if (!opt.at && KUR.on) kurabeEnd(false);   // ダイヤルで自由に切り替えたら、くらべる旅はそこで終わる
  const token=++lensToken; lensRequest=id; keys.clear();
  if (!silent) { hush(); $("say").textContent = ""; setActs([]); }   // すばやく切り替えたとき、前の生きものの台詞を残さない（2026-10-13）
  dial.setAttribute('aria-busy','true');
  for(const b of dial.children)b.setAttribute('aria-pressed',String(b.dataset.id===id));layoutBodyWheel();
  const was = LENS[lens];
  if (chapter !== "umwelt") { setChapter("umwelt", true); }
  const applied=await veil(() => {
    if (!was.under) { gardenSave.pos.copy(me.pos); gardenSave.yaw = me.yaw; }
    lens = id; const L = LENS[id];
    if (L.under === "light") { me.depth = .25; me.pitch = 0; }
    else if (opt.at) {   // くらべる旅：同じ場所に立ったまま、体だけを入れかえる（目の高さだけが変わる）
      const a = opt.at, ey = L.eye || 1; me.pos.set(a.x, ey, a.z); me.yaw = Math.atan2(-(a.tx - a.x), -(a.tz - a.z)); me.pitch = clamp(Math.atan2(a.ty - ey, Math.hypot(a.tx - a.x, a.tz - a.z)), -.7, .3); flightHeight = ey; }
    else if (habitat==='forest' && FSPOT[id] && !silent) {   // 話に出てくるものが見える草地の場所へ（蜂は草地の白い花の前、マムシはネズミの近く…）
      const [x, z, tgt] = FSPOT[id](); me.pos.set(x, L.eye || 1, z); me.yaw = Math.atan2(-(tgt.x - x), -(tgt.z - z)); me.pitch = clamp(Math.atan2(tgt.y - (L.eye || 1), Math.hypot(tgt.x - x, tgt.z - z)), -.6, .6); flightHeight = L.eye || 1.5; }
    else if (habitat==='forest') {if(was.under){me.pos.copy(gardenSave.pos);me.yaw=gardenSave.yaw;}me.pos.y=L.eye||1;me.pitch=clamp(me.pitch,-.6,.6);}
    else if (L.spot && !silent) {
      // その生きものの受けとり方がよく分かる場所へ（蜂はヒマワリの前、マムシはネズミの近く…）。向きもそちらへ
      const [x, z, lx, ly, lz] = L.spot; me.pos.set(x, L.eye, z); me.yaw = Math.atan2(-(lx - x), -(lz - z)); me.pitch = Math.atan2(ly - L.eye, Math.hypot(lx - x, lz - z));
    }
    else if (was.under) { me.pos.copy(gardenSave.pos); me.yaw = gardenSave.yaw; me.pos.y = L.eye; }
    else me.pos.y = L.eye;
    me.path = null; applyLens(id);
    for (const b of dial.children) b.setAttribute("aria-pressed", String(b.dataset.id === id));layoutBodyWheel();
    
    setWhere();
  },token);
  if(!applied)return;dial.setAttribute("aria-busy","false");
  if (!silent && !opt.at) talkLens(id);
  return true;
}
function talkLens(id, again = false) {
  const l = S.lens.find(x => x.id === id), i = LENS_IDS.indexOf(id), next = LENS_IDS[i + 1];
  const extra = [["もう一度", () => talkLens(id, true)]];
  if (next) extra.push([`次：${S.lens[i + 1].name} ›`, () => setLens(next), true]);
  else extra.push(["人の身体へ戻る",()=>setLens("hito"),true]);
  spoken.add(id);
  talk(l.lines, extra).then(ok => { if (ok && !next && !again) talk(S.outro, extra); });
}

// ---------------------------------------------------------------- 言葉と色
const iroLook = { yaw: 0, pitch: 0, x: 0, pan: 0, k: 0 };
const langBar = $("langs");
for (const [id, L] of Object.entries(LANGS)) { const b = document.createElement("button"); b.className = "pill"; b.dataset.id = id; b.textContent = L.name; b.setAttribute("aria-pressed", "false"); b.onclick = () => setLang(id); langBar.appendChild(b); }
{ const b = document.createElement("button"); b.className = "pill"; b.dataset.id = "mine"; b.textContent = "線を引きなおす"; b.onclick = () => { IRO.lang = null; IRO.mine = null; drawWall(); markLang(); setWhere(); talk([S.iro.intro[2]]); }; langBar.appendChild(b); }
function markLang() { for (const b of langBar.children) b.setAttribute("aria-pressed", String(b.dataset.id === IRO.lang)); }
function iroMine(col) {
  IRO.mine = col; IRO.lang = null; drawWall(); markLang(); setWhere();
  talk([S.iro.mine], [["日本語の線を見る ›", () => setLang("ja"), true]]);
}
const LANG_ORDER = ["ja", "ko", "en", "ru", "hz"];
function setLang(id) {
  IRO.lang = id; drawWall(); markLang(); setWhere(); if (id === "ru" || id === "ja") panTo(7);
  const i = LANG_ORDER.indexOf(id), nx = LANG_ORDER[i + 1];
  const extra = nx ? [[`次：${LANGS[nx].name} ›`, () => setLang(nx), true]] : [["まとめを聞く ›", () => talk(S.iro.outro, [[`次：${N.ch_toki} ›`, () => setChapter("toki"), true]]), true]];
  talk(S.iro.langs[id], extra);
}
function frameWall() {
  // PC：壁がちょうど収まる距離。スマホの縦長（2026-10-08）：壁の高さが画面の半分ほどになるまで寄り、左右になぞって壁を動かす（タイルが押しやすい大きさに）
  const vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect), narrow = camera.aspect < .8;
  const d = narrow ? (WALL.h / 2 + .12) / Math.tan(vf / 2) / .62 : Math.max((WALL.w / 2 + .25) / Math.tan(hf / 2), (WALL.h / 2 + .5) / Math.tan(vf / 2));
  const vis = 2 * d * Math.tan(hf / 2);
  iroLook.pan = narrow ? Math.max(0, (WALL.w - vis) / 2 + .12) : 0; iroLook.k = vis / innerWidth;
  iroLook.base = new THREE.Vector3(WALL.x, WALL.y + WALL.h / 2 + (narrow ? .12 : .1), WALL.z + d);
}
// 線や言葉の区画のあるところへ、壁を寄せる（スマホ）
function panTo(col) { if (!iroLook.pan) return; iroLook.x = clamp(-WALL.w / 2 + (col + .5) * WALL.w / WALL.cols, -iroLook.pan, iroLook.pan); }

// ---------------------------------------------------------------- 四つの時計
//   同じ庭を、四つの速さで同時に見る。数は典拠のあるものだけ（資料/設計_時間.md）。
const TOKI = [
  { id: "bee", name: "蜂の一瞬", rate: 1 / 100, fmt: s => `${(s * 1000).toFixed(1)} ミリ秒`, note: "1 秒 ＝ 100 分の 1 秒" },
  { id: "day", name: "人の一日", rate: 3600, fmt: s => `${Math.floor((s / 3600 + 6) % 24)} 時`, note: "1 秒 ＝ 1 時間" },
  { id: "year", name: "木の一年", rate: 15 * 86400, fmt: s => `${Math.floor(((s / 86400) % 365) / 30.42) % 12 + 1} 月`, note: "1 秒 ＝ およそ半月" },
  { id: "soil", name: "土の千年", rate: 40 * 365 * 86400, fmt: s => { const y = (s / (365 * 86400)) % 1000; return `${Math.floor(y)} 年　+${(y / 1000).toFixed(2)} cm`; }, note: "1 秒 ＝ 40 年" },
];
const tokiCams = TOKI.map(() => new THREE.PerspectiveCamera(50, 1, .005, 300));
let tokiT0 = 0, tokiLabs = [], tokiFrames = [];
const newLayer = new THREE.Mesh(new THREE.BoxGeometry(.42, 1, .2), M(0x6e4a2a, { uv: .03, temp: .12 }));   // 新しく積もった層（もとの土より明るい色で区別）
const bank = new THREE.Group();
let layerTop;
legacyGardenSteps.push(() => {
  // 土の断面の小さな崖と物差し（cm）
  const face = new THREE.Mesh(new THREE.BoxGeometry(.42, .5, .2), [M(0x3b2a1d), M(0x3b2a1d), M(0x2a1f17), M(0x3b2a1d), M(0xffffff, { map: soilTex, uv: .03, temp: .12 }), M(0x3b2a1d)]);
  face.position.y = .25; bank.add(face);
  newLayer.position.set(0, .5, 0); newLayer.scale.y = .0001; bank.add(newLayer);
  // 物差し：長さ 6 cm（目盛り 1 mm・数字は cm）。上の端＝いまの地表（0）
  // 物差し（2026-10-08 直し）：0＝もとの地表。上へ +1 cm・+2 cm、下へ −1 cm（1 mm 目盛り）。新しい層がどこまで積もったかを読む
  const rulerTex = canvasTex(160, 600, (g, w, h) => {
    g.fillStyle = "#f6f1e2"; g.fillRect(0, 0, w, h); const y0 = 400, mm = 20;               // 0 cm の位置と 1 mm の幅（px）
    g.fillStyle = "rgba(255,200,60,.55)"; g.fillRect(0, y0 - 10 * mm, w, 10 * mm);             // 0〜+1 cm の帯
    g.fillStyle = "#222";
    for (let i = -10; i <= 20; i++) { const y = y0 - i * mm; g.fillRect(0, y - 1.5, i % 10 === 0 ? 70 : i % 5 === 0 ? 48 : 28, 3); if (i % 10 === 0) { g.font = "bold 34px sans-serif"; g.fillText(i === 0 ? "0" : (i > 0 ? "+" : "") + (i / 10) + "cm", 76, y + 12); } }
  });
  const ruler = new THREE.Mesh(new THREE.PlaneGeometry(.008, .03), M(0xffffff, { basic: true, map: rulerTex, uv: .1 })); ruler.position.set(-.0065, .5 - .015 + .03 * 400 / 600, .1025); bank.add(ruler);   // 0 の目盛り（上から 400/600）を、もとの地表 y＝.5 に合わせる
  // 新しい層の上の端に、細い金の線（どこまで積もったかが一目で分かる）
  layerTop = new THREE.Mesh(new THREE.PlaneGeometry(.42, .0005), new THREE.MeshBasicMaterial({ color: 0xffd25a })); layerTop.position.set(0, .5, .1012); bank.add(layerTop);
  bank.position.set(-10.9, 0, 6.4); bank.rotation.y = Math.PI / 2; garden.add(bank);
});
function layoutToki() {
  if (chapter !== "toki") return;
  const narrow = innerWidth < 760 && innerWidth / innerHeight < 1;
  const rects = TOKI.map((_, i) => narrow ? { x: (i % 2) * innerWidth / 2, y: Math.floor(i / 2) * (innerHeight - 250) / 2 + 100, w: innerWidth / 2, h: (innerHeight - 250) / 2 } : { x: i * innerWidth / 4, y: 100, w: innerWidth / 4, h: innerHeight - 100 - 120 });
  TOKI.forEach((k, i) => { k.r = rects[i]; tokiCams[i].aspect = rects[i].w / rects[i].h; tokiCams[i].updateProjectionMatrix(); const fr = tokiFrames[i]; if (fr) Object.assign(fr.style, { left: rects[i].x + "px", top: rects[i].y + "px", width: rects[i].w + "px", height: rects[i].h + "px" }); const lb = tokiLabs[i]; if (lb) { lb.style.left = rects[i].x + "px"; lb.style.width = rects[i].w + "px"; lb.style.top = (rects[i].y + 6) + "px"; } });
}
function setupToki() {
  tokiLabs.forEach(l => l.remove());
  tokiFrames.forEach(f => f.remove()); tokiFrames = TOKI.map(() => { const f = document.createElement("div"); f.className = "tframe"; document.body.appendChild(f); return f; });
  tokiLabs = TOKI.map(k => { const d = document.createElement("div"); d.className = "tlab"; d.innerHTML = `<b>${k.name}</b><span>${k.note}</span><br><span class="v"></span>` + (k.id === "soil" ? `<div class="g" aria-hidden="true"><i></i><small>1 cm</small></div>` : ""); document.body.appendChild(d); return d; });
  // それぞれの窓のカメラ（同じ庭の、それぞれの主役へ向ける）
  const c = tokiCams;
  c[0].position.set(bee.position.x + .14, bee.position.y + .06, bee.position.z + .26); c[0].lookAt(bee.position.x - .02, bee.position.y, bee.position.z);
  c[1].position.set(1.5, 2.2, 10.6); c[1].lookAt(-1, 1.2, -4);
  c[2].position.set(TREE.x - 4.5, 2.2, TREE.z + 6.5); c[2].lookAt(TREE.x, 2.6, TREE.z);
  c[3].fov = 26; c[3].updateProjectionMatrix(); const bp = bank.localToWorld(new THREE.Vector3(.001, .508, .2)); c[3].position.copy(bp); c[3].lookAt(bank.localToWorld(new THREE.Vector3(.001, .508, .1)));
  layoutToki(); tokiT0 = performance.now();
}
// 太陽の道（縁側は南向き＝庭の奥 -z が南）。6 時に東（-x）から昇り、正午に南、18 時に西（+x）へ。高さは秋分の関東の目安（南中 約 55°）
const SUNDIR = new THREE.Vector3();
function setDay(h) {  // h 時（0〜24）
  const a = (h - 6) / 12 * Math.PI, up = Math.sin(a), el = Math.asin(clamp(up, -1, 1) * Math.sin(55 / 180 * Math.PI));
  SUNDIR.set(-Math.cos(a) * Math.cos(el), Math.sin(el), -Math.sin(a) * .55 * Math.cos(el) - .25).normalize();
  if (habitat !== 'forest') sun.target.position.set(0, 0, 0); sun.position.copy(SUNDIR).multiplyScalar(40).add(sun.target.position);
  const hi = clamp(SUNDIR.y / .5, 0, 1), dusk = clamp(1 - SUNDIR.y / .32, 0, 1) * (SUNDIR.y > -.08 ? 1 : 0);
  sun.intensity = LIT.sun * clamp(SUNDIR.y * 6, 0, 1) * (.75 + .25 * hi);
  sun.color.setRGB(1, .96 - .38 * dusk, .9 - .62 * dusk);                       // 朝夕は赤み
  hemi.intensity = LIT.hemi * (.12 + .88 * clamp(SUNDIR.y * 3 + .3, 0, 1)); hemi.color.setRGB(.88 + .12 * dusk, .93 - .05 * dusk, 1 - .2 * dusk);
  paintSky(SUNDIR, dusk, clamp(SUNDIR.y * 2.5 + .35, .05, 1));
  if (renderer.shadowMap.autoUpdate === false) renderer.shadowMap.needsUpdate = true;
}
function setYear(doy) { // 欅のおよその暦（関東）：4 月に芽吹き、11 月に色づき、12 月に落葉。葉の量は葉の絵のしきい値で増減
  let v = 0, col = new THREE.Color(0xffffff);
  if (doy < 95) v = 0; else if (doy < 125) v = (doy - 95) / 30; else if (doy < 305) v = 1; else if (doy < 345) v = 1 - (doy - 305) / 40; else v = 0;
  if (doy >= 95 && doy < 140) col.setRGB(1.15, 1.3, .9); if (doy >= 300) col.setRGB(1.9, 1.15, .4);
  leafIM.visible = v > .02; leafIM.count = Math.floor(leafIM.userData.n * v); leafMat.color.copy(col);   // 葉の数で芽吹き・落葉を表す
}
function renderToki() {
  const t = (performance.now() - tokiT0) / 1000, W = innerWidth, H = innerHeight;
  renderer.setScissorTest(true); renderer.setClearColor(0x0f1412); renderer.setViewport(0, 0, W, H); renderer.setScissor(0, 0, W, H); renderer.clear();
  TOKI.forEach((k, i) => {
    const s = t * k.rate, r = k.r; if (!r) return;
    setDay(LIT.base); setYear(200); newLayer.scale.y = .0001; newLayer.position.y = .5; layerTop.position.y = .5;
    if (k.id === "bee") bee.userData.animate(s);
    if (k.id === "day") setDay((s / 3600 + 6) % 24);
    if (k.id === "year") setYear((s / 86400) % 365);
    if (k.id === "soil") { const y = (s / (365 * 86400)) % 1000, th = y / 1000 * .01; newLayer.scale.y = Math.max(.0001, th); newLayer.position.y = .5 + th / 2; layerTop.position.y = .5 + th; tokiLabs[i].querySelector(".g i").style.height = (y / 10) + "%"; }
    tokiLabs[i].querySelector(".v").textContent = k.fmt(s);
    renderer.setViewport(r.x, H - r.y - r.h, r.w, r.h); renderer.setScissor(r.x + 1, H - r.y - r.h, r.w - 2, r.h); renderer.render(scene, tokiCams[i]);
  });
  renderer.setScissorTest(false); setDay(LIT.base); setYear(200);
}

// ---------------------------------------------------------------- 章
function setChapter(ch, quiet = false) {
  if (ch === chapter && !quiet) return;
  if (ch !== "umwelt") initLegacyGarden();
  chapter = ch; hush();
  for (const b of document.querySelectorAll(".tab")) b.setAttribute("aria-selected", String(b.dataset.ch === ch));
  $("habitats").hidden=ch!=="umwelt";$("bodyForward").hidden=ch!=="umwelt";$("moveNote").hidden=ch!=="umwelt";$("flightControls").hidden=ch!=="umwelt"||!FLIGHT.has(lens);
  $("dial").hidden = ch !== "umwelt"; $("langs").hidden = ch !== "iro"; $("panHint").hidden = true;
  tokiLabs.forEach(l => l.remove()); tokiLabs = []; tokiFrames.forEach(f => f.remove()); tokiFrames = [];
  if (ch !== "umwelt") { if (LENS[lens].under) { me.pos.copy(gardenSave.pos); me.yaw = gardenSave.yaw; } lens = "hito"; applyLens("hito"); for (const b of dial.children) b.setAttribute("aria-pressed", String(b.dataset.id === "hito")); }
  applyLens(lens);
  if (ch === "iro") { frameWall(); iroLook.yaw = 0; iroLook.pitch = 0; panTo(6); $("panHint").hidden = !iroLook.pan; IRO.lang = null; IRO.mine = null; drawWall(); markLang(); if (!quiet) talk(S.iro.intro); }
  if (ch === "toki") { setupToki(); if (!quiet) talk(S.toki, [["もう一度", () => talk(S.toki)]]); }
  setWhere(); $("where").hidden = ch === "toki";
}
const shortTabs = () => { const s = innerWidth < 520; for (const b of document.querySelectorAll(".tab")) b.textContent = N["ch_" + b.dataset.ch + (s ? "_s" : "")] || b.textContent; };
shortTabs(); addEventListener("resize", shortTabs);
for (const b of document.querySelectorAll(".tab")) b.onclick = () => { first(); setChapter(b.dataset.ch); };

// ---------------------------------------------------------------- ミミズ：上へ・下へ・地面をたたく
$("wormUp").onclick = () => { me.depth = clamp(me.depth - .15, .02, 1.2); };
$("wormDown").onclick = () => { me.depth = clamp(me.depth + .15, .02, 1.2); };
let quake = 0;
$("wormTap").onclick = () => { first(); thump(.7); quake = 1; navigator.vibrate?.(180); setTimeout(() => { me.depth = clamp(me.depth + .3, .02, 1.2); talk([S.tap], [["もう一度", () => talkLens("mimizu", true)], ["人の身体へ戻る",()=>setLens("hito"),true]]); }, 500); };

// ---------------------------------------------------------------- 設定
function closeMenu() { $("menu").hidden = true; keys.clear(); $("menuBtn").focus(); }
$("menuBtn").onclick = () => { keys.clear(); $("menu").hidden = false; $("menuX").focus(); };
$("menuX").onclick = closeMenu;
$("menu").addEventListener("click", e => { if (e.target.id === "menu") closeMenu(); });
$("optRM").checked = RM; $("optRM").onchange = e => { RM = e.target.checked; };
// 文字を大きく（端末に覚える。読めなくても動く）
try { $("optBig").checked = localStorage.getItem("umw-big") === "1"; } catch {}
document.body.classList.toggle("big", $("optBig").checked);
$("optBig").onchange = e => { document.body.classList.toggle("big", e.target.checked); try { e.target.checked ? localStorage.setItem("umw-big", "1") : localStorage.removeItem("umw-big"); } catch {} };
// 八つの受けとり方をくらべる表（授業でも使えるように）
// ダイヤルの名前（短い呼び名）と、この森で形を作った種の名前（2026-10-13）
const SPECIES = { chou: "ナミアゲハ", tori: "シジュウカラ", inu: "柴犬", hebi: "ニホンマムシ", koumori: "アブラコウモリ", mimizu: "フトミミズのなかま" };
$("lensTable").innerHTML = S.lens.map(l => `<tr><td>${l.name}${SPECIES[l.id] ? `<br><small style="font-size:13px;font-weight:400;color:var(--dim)">${SPECIES[l.id]}</small>` : ""}</td><td>${LENS[l.id].sub}</td></tr>`).join("");
// なぜ、そう見えるの？（2026-10-12）：いまの身体の受けとり方が、どうして分かったのか
let whyId = "hito", whyBack = null;
function renderWhy(id) {
  const W = window.WHY || {}, d = W[id]; if (!d) return; whyId = id;
  const esc = x => String(x).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);
  const name = S.lens.find(l => l.id === id)?.name || id, li = a => a.map(x => `<li>${esc(x)}</li>`).join("");
  // 題は塊ごとに折る（375px で語の途中で折れない）。ダイヤルの名前と、典拠の種の名前をそろえて見せる
  $("whyTitle").innerHTML = `<span class="nw">${esc(name)}${SPECIES[id] ? `（${esc(SPECIES[id])}）` : ""} ──</span> <span class="nw">なぜ、そう${["hebi", "koumori", "mimizu"].includes(id) ? "感じとれる" : "見える"}の？</span>`;
  $("whyCaution").textContent = d.caution || ""; $("whyCaution").hidden = !d.caution;
  $("whyBody").innerHTML = li(d.body); $("whyHow").innerHTML = li(d.how); $("whyUnknown").innerHTML = li(d.unknown); $("whyRefs").innerHTML = li(d.refs); $("whyNote").textContent = W.note || "";
  $("whyTabs").innerHTML = ""; for (const l of S.lens) { const b = document.createElement("button"); b.textContent = l.name; b.setAttribute("aria-pressed", String(l.id === id)); b.onclick = () => renderWhy(l.id); $("whyTabs").appendChild(b); }
}
function openWhy() { whyBack = document.activeElement; renderWhy(lensRequest || lens); $("why").hidden = false; $("why").scrollTop = 0; $("whyX").focus(); }
function closeWhy() { $("why").hidden = true; whyBack?.focus?.(); }
$("whyBtn").onclick = () => { first(false); openWhy(); }; $("whyX").onclick = closeWhy;
$("why").addEventListener("click", e => { if (e.target.id === "why") closeWhy(); });
addEventListener("keydown", e => { if (e.key === "Escape" && !$("why").hidden) { e.stopPropagation(); closeWhy(); } }, true);
window.__why = { open: openWhy, close: closeWhy, render: renderWhy };
$("optSound").onchange = e => { if (AUD.master) AUD.master.gain.value = e.target.checked ? 1 : 0; };
$("cred").innerHTML = [
  "碧の声：VOICEVOX:冥鳴ひまり。碧の 3D の姿 © mitsulab。表示の道具：three.js・three-vrm（MIT）。樹皮・葉・土・石の写真は CC0（Poly Haven・ambientCG）。花・モミジとスギの葉・シダ・落ち葉・空の絵と音は、この画面の中でその場で作っています（録音は使っていません）。",
  "「なぜ、そう見えるの？」の典拠は、その画面に一つずつ示しています。この作品が参考にしたおもな文献：von Uexküll 1934／Nagel 1974／Peitsch ら 1992（蜂の色覚）／von Frisch 1914／Chittka & Waser 1997／Eisner ら 1969・Todesco ら 2022（花の紫外の模様）／Kevan, Giurfa & Chittka 1996（白い花）／Arikawa 2003・Koshitaka ら 2008（アゲハ）／Obara 1970（モンシロチョウ）／Hart 2001（鳥の色覚）／Hunt ら 1998・Andersson ら 1998（アオガラ）／Neitz, Geist & Jacobs 1989・Miller & Murphy 1995（犬）／Machado ら 2009（二色型の近似の行列）／Gracheva ら 2010・Hartline ら 1978（ピット）／Heinrich 1993（虫の体温）／Griffin 1944・Griffin ら 1960・Greif & Siemers 2010（コウモリ）／Darwin 1881（ミミズ）",
  "生きものの 3D は、図鑑・教科書の形態（脚・翅・羽・指の数と並び、模様）にそって、この画面の中で組み立てた mitsulab の造形です（外から取りこんだ 3D はありません）。ミツバチ・ナミアゲハ・モンシロチョウ・シジュウカラ・柴犬・マムシ・アブラコウモリ・フトミミズのなかま・夜の蛾。毛・艶・透けも、画面の中で作った質感です。動きは、はばたきの回数や歩き方などの研究の記載をもとにしていますが、羽ばたきの速さ（鳥・蝶・コウモリは実際より遅く、蜂は扇のかすみで示す）やカメラの動きは見やすく調整しています。実際の速さや、生きものの主観そのものを再現したものではありません。",
  "マムシの熱の見え方では、体温を自分で保つ鳥・けもの・人を明るく重ね、体温がまわりの気温に近い虫・ヘビ・ミミズは、まわりと同じ暗さにしています。温かさの値は目安です。",
  "森・池・川は体験用につくった空間で、関東の雑木林と谷すじのスギ林、夏のはじめ（7 月ごろ）の午後のつもりです。草花の形は図鑑の記載にそって作り、草花はこの季節に日本の林と草地に自然に生える在来のものだけで、紫外の値は目安です（モンシロチョウの雌雄と空のほか）。",
].map(t => `<span style="display:block;margin-bottom:8px">${t}</span>`).join("");

// ---------------------------------------------------------------- くらべる旅（2026-10-13 80 点へ）
//   本人「他も同様。基準をさらに上げてください。」／11 人の指摘＝体どうしの比べを体験の芯に。
//   ひとつの場所（草地の白い花・橙の花・草むらのネズミが見える所）に立ったまま、体だけを入れかえる。
//   切り替える前に「どう見えると思う？」と予想してから見る（予想してから確かめると、記憶に残りやすい）。最後に、外で使える見方を一枚にして持ち帰る。
const K = S.kurabe || {};
const KUR = { on: false, i: 0, hits: 0, picks: [], at: null };
function kurabeSpot() {
  if (KUR.at) return KUR.at;
  const wf = FOREST.whiteFlower.pos, kz = (FOREST.lists?.kanzou || []).reduce((b, it) => { const d = Math.hypot(it.x - wf.x, it.z - wf.z); return d < b.d ? { d, it } : b; }, { d: 1e9, it: null }).it;
  const kp = kz && Math.hypot(kz.x - wf.x, kz.z - wf.z) < 5 ? new THREE.Vector3(kz.x, .6, kz.z) : wf.clone().add(new THREE.Vector3(1.2, 0, .4));
  const c = wf.clone().add(kp).multiplyScalar(.5), side = new THREE.Vector3(-(kp.z - wf.z), 0, kp.x - wf.x).normalize(), toM = new THREE.Vector3(FOREST.meadow.x - c.x, 0, FOREST.meadow.z - c.z);
  if (side.dot(toM) < 0) side.negate();
  let D = 1.8, p = c.clone().addScaledVector(side, D); for (let k = 0; k < 8 && !okGround(p.x, p.z); k++) { D += .4; p = c.clone().addScaledVector(side, D); }
  // 草むらのネズミを、花と見る人のあいだの手前に（マムシで、温かいものとして浮かぶ）
  const mp = c.clone().addScaledVector(side, .05).add(new THREE.Vector3((kp.x - wf.x) * .15, 0, (kp.z - wf.z) * .15)); mouse.position.set(mp.x, .06, mp.z); mouse.userData.x0 = mp.x;
  // 印は、群れのまん中に（2026-10-14 r2：一本目の株は間引かれて描かれていないことがあり、輪が花のない所を囲んでいた）
  const cen = (list, c0, r) => { const n = (list || []).filter(it => Math.hypot(it.x - c0.x, it.z - c0.z) < r); if (!n.length) return c0.clone(); return new THREE.Vector3(n.reduce((a, it) => a + it.x, 0) / n.length, 0, n.reduce((a, it) => a + it.z, 0) / n.length); };
  // いちばん株の詰まった所（.45 m 以内の株がいちばん多い所）を、白い花の印のまん中に（2026-10-14 r3：輪のまん中がまばらで、白い穂が輪の外に見えていた）
  const dense = (list, c0, R) => { const L = (list || []).filter(it => Math.hypot(it.x - c0.x, it.z - c0.z) < R); let best = null, bn = 0; for (const a of L) { const n = L.filter(b => Math.hypot(a.x - b.x, a.z - b.z) < .45); if (n.length > bn) { bn = n.length; best = n; } } return best ? cen(best, best[0], 9) : c0.clone(); };
  // 白い穂は茎が曲がって株の位置からずれるので、描いている花そのもの（オカトラノオの花の InstancedMesh）の位置から決める
  const spikes = []; { const m4 = new THREE.Matrix4(); forest.traverse(o => { if (!o.isInstancedMesh || o.material?.color?.getHexString?.() !== "f7f8f0") return; o.geometry.computeBoundingSphere(); const c0 = o.geometry.boundingSphere.center; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); const v = c0.clone().applyMatrix4(m4); if (Math.hypot(v.x - wf.x, v.z - wf.z) < 1.6 && !(FOREST.lists?.kanzou || []).some(k => Math.hypot(v.x - k.x, v.z - k.z) < .55)) spikes.push(v); } }); }   // 橙の花（ノカンゾウ）のそばの穂は除く（スマホで輪のまん中が橙の花になった・2026-10-14 r3 の P1）
  if (spikes.length) { let best = null, bn = 0; for (const a of spikes) { const n = spikes.filter(b => a.distanceTo(b) < .4); if (n.length > bn) { bn = n.length; best = n; } } KUR.wf = best.reduce((acc, v) => acc.add(v), new THREE.Vector3()).multiplyScalar(1 / best.length); }
  else KUR.wf = dense(FOREST.lists?.tora, wf, 1.4).setY(.62); KUR.kz = cen(FOREST.lists?.kanzou, kp, .8).setY(.64);
  return KUR.at = { x: p.x, z: p.z, tx: c.x, ty: .7, tz: c.z };
}
function kurabeStart() {
  if (habitat !== "forest") setHabitat("forest");
  KUR.on = true; KUR.i = 0; KUR.hits = 0; KUR.picks = []; KUR.cur = "all"; A.intro = false; $("takeaway").hidden = true;
  setLens("hito", true, { at: kurabeSpot() }).then(() => talk([...(K.intro || []), K.hito].filter(Boolean), [["予想する ›", () => kurabeStep(), true]]));
}
function kurabeStep() {
  const q = (K.steps || [])[KUR.i]; if (!q) { kurabeFinish(); return; }
  KUR.on = true; KUR.cur = q.id;
  // 予想：切り替える前に、選んでもらう（選ぶまで体は変えない）
  const opts = q.opts.map((o, j) => [o, () => kurabeReveal(q, j)]);
  talk([q.q], opts).then(ok => { if (ok) setActs(opts); });
  $("moveNote").hidden = true; $("kurQ").hidden = false; $("kurQ").textContent = `予想 ${KUR.i + 1}／${K.steps.length}　${S.lens.find(l => l.id === q.id)?.name}になったら？`;
}
async function kurabeReveal(q, j) {
  const hit = j === q.ans; KUR.picks.push({ id: q.id, pick: q.opts[j], hit }); if (hit) KUR.hits++;
  $("kurQ").textContent = `あなたの予想：${q.opts[j]}`;
  setActs([]); hush();
  const ok = await setLens(q.id, true, { at: q.id === "hebi" ? { ...kurabeSpot(), ty: -.05 } : kurabeSpot() }); if (!ok) return;   // マムシは目が低いので、草むらのネズミが画面のまん中に来るよう少し見下ろす（2026-10-14）
  showT = -99; showLens = "";   // 体の寄りの見せ場も、もう一度
  const last = KUR.i === K.steps.length - 1;
  KUR.i++;
  const next = last ? [["持ち帰る見方を見る ›", kurabeFinish, true]] : [["次の予想 ›", kurabeStep, true]];
  talk([hit ? K.hit : K.miss, ...q.reveal, ...(KUR.i === 1 ? [K.cmp] : [])].filter(Boolean), next);
}
function kurabeFinish() {
  $("kurQ").hidden = true; KUR.on = false; $("moveNote").hidden = false;
  $("takeHits").textContent = `予想が当たったのは ${KUR.hits}／${(K.steps || []).length}。`;
  $("takeList").innerHTML = (K.take || []).map(t => `<li><b>${t[0]}</b>${t[1]}</li>`).join("");
  $("takeaway").hidden = false; $("takeX").focus();
  talk(K.end || [], [["自由に歩く ›", () => freeWalk(), true], ["もう一度くらべる", kurabeStart]]);   // 押したことが分かるよう、字幕を替える（2026-10-14 r2）
}
function kurabeEnd(talkOn = true) { KUR.on = false; $("kurQ").hidden = true; $("moveNote").hidden = chapter !== "umwelt"; }
const freeWalk = () => { $("takeaway").hidden = true; hush(); setActs([]); $("say").textContent = "ここからは自由に歩けます。左のダイヤルで体を入れかえたり、右の ↑ で進んだりしてみてください。"; };   // 押したことが分かるよう、字幕を替える（2026-10-14 r3）
$("takeX").onclick = freeWalk;
$("takeAgain").onclick = () => { $("takeaway").hidden = true; kurabeStart(); };
$("kurBtn").onclick = () => { first(false); hush(); kurabeStart(); };
// 人の目とくらべる（押しているあいだ）。キーボードは H を押しているあいだ
{ const b = $("cmpBtn"); b.onpointerdown = e => { first(false); compareView(true); b.setPointerCapture?.(e.pointerId); };
  const up = () => compareView(false); b.onpointerup = up; b.onpointercancel = up; b.onlostpointercapture = up; b.onblur = up;
  b.onkeydown = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); compareView(true); } }; b.onkeyup = up;
  addEventListener("keydown", e => { if (e.key.toLowerCase() === "h" && !e.repeat && $("menu").hidden && $("why").hidden) compareView(true); });
  addEventListener("keyup", e => { if (e.key.toLowerCase() === "h") compareView(false); }); }
window.__kur = { start: kurabeStart, step: kurabeStep, reveal: (j) => kurabeReveal(K.steps[KUR.i], j), finish: kurabeFinish, KUR, compare: compareView };

// ---------------------------------------------------------------- はじめて押したとき：音を立て、碧がひとこと
let started = false;
function first(intro = true) {
  if (started) return; started = true; AUD.init();
  A.appear = true; A.intro = true; if (AM) AM.calm = 2.2;
  $("say").textContent = "";
  if(!intro){A.intro=false;return;}
  // 2026-10-13：はじめの一歩は「くらべる旅」（同じ場所で、予想してから体を入れかえる）。自由に歩くこともできる
  setTimeout(() => talk(S.intro, [["はじめる：くらべる ›", kurabeStart, true], ["自由に歩く", () => { A.intro = false; talkLens("hito"); }]]).then(() => { A.intro = false; }), 600);
}

// ---------------------------------------------------------------- 毎フレーム
const clock = new THREE.Clock();
let echo = { t: 9, next: 0, int: 1.6 }, sonT = 0;
const ECHO_V = 20;   // 見せる波面の速さ（m/s）。本当の音の速さ（約 340 m/s）を、ゆっくりにしたもの
let shadowTick = 0;
let lastFrame=0,simTime=0,RDT=0;const FPS={n:0};   // 描いたこまの数（確かめ用）
addEventListener("visibilitychange",()=>{keys.clear();if(document.hidden)compareView(false);clock.getDelta();});
function frame(now=0) {
  if(document.hidden||now-lastFrame<33){requestAnimationFrame(frame);return;}lastFrame=now;FPS.n++;
  const rawDt = clock.getDelta(), dt = Math.min(rawDt, .05); RDT = Math.min(rawDt, .4); simTime += dt; const t = simTime;   // RDT＝実の経過（碧の現れ方は、遅い端末でも秒で決める。2026-10-14）
  G.uTime.value = RM ? 0 : t;
  if (mobile && ++shadowTick % 3 === 0) renderer.shadowMap.needsUpdate = true;   // スマホは影の地図の描き直しを 3 こまに 1 回
  moveCam(dt);
  // 影の地図は、森の中では見る人のまわり（4 m ごとに寄せる）を描く
  if (habitat === 'forest') { const cx = Math.round(me.pos.x / 4) * 4, cz = Math.round(me.pos.z / 4) * 4; if (cx !== sun.target.position.x || cz !== sun.target.position.z) { sun.target.position.set(cx, 0, cz); sun.position.copy(SUNDIR).multiplyScalar(40).add(sun.target.position); sun.target.updateMatrixWorld(); if (!renderer.shadowMap.autoUpdate) renderer.shadowMap.needsUpdate = true; } }
  bodyRoot.visible=chapter==='umwelt';
  if(!RM&&habitat==='forest')residents.forEach(b=>{const R=b.userData.R,p=t*R.w+R.ph;if(R.id==='hachi'){beeForage(b,t,dt);return;}let y=R.h[0]+Math.sin(p*2.3)*R.h[1];if(R.id==='tori')y+=b.userData.bound||0;b.position.set(R.c[0]+Math.sin(p)*R.r[0]+Math.sin(p*3.1)*.3,y,R.c[1]+Math.cos(p)*R.r[1]);faceVelocity(b,dt,R.id==='tori'?.3:.15,R.id==='tori'?.6:.3);const a=b.userData.animate(t,true);if(R.id==='tori')b.userData.bound=((b.userData.bound||0)+(a===-1?-.35:.12)*dt)*.985;});
  // 生きものの動き
  if (!RM) {
    // 蝶：はばたきながら花のあいだを（モンシロチョウ 2 頭は花壇の上、アゲハはヒナゲシのあたり）
    const BB = habitat === 'forest' ? meadowBed : bed, bry = habitat === 'forest' ? 0 : BED.ry;
    [...butterflies, ageha].forEach((b, i) => { const ph = t * (b.userData.ageha ? .4 : .55) + b.userData.ph, cx = b.userData.ageha ? 3.4 : 1.6, rx = b.userData.ageha ? 1.1 : 1.4;
      b.position.copy(BB(cx + Math.cos(ph) * rx + Math.sin(ph * 2.3) * .3, .75 + Math.sin(ph * 1.7) * .25, .3 + Math.sin(ph) * 1.0)); if (!b.userData.prev) { b.userData.prev = b.position.clone(); b.userData.yaw = 0; b.userData.roll = 0; } faceVelocity(b, dt, .12, .3); b.userData.flap(t + i * .7); });
    moths.forEach(m => { if (!m.visible) return; const ph = t * .8 + m.userData.ph; m.position.set(Math.cos(ph) * 3 + Math.sin(ph * 1.9), 1.8 + Math.sin(ph * 2.2) * .6, -1 + Math.sin(ph * 1.3) * 3); faceVelocity(m, dt, .1, .5); m.userData.flap(t + m.userData.ph); });
    bird.rotation.y = bird.userData.ry0 || 0; bird.userData.animate(t);   // 見回し・跳ねて向きを変えるのは、鳥の中で（2026-10-13）
    mouse.position.x = (mouse.userData.x0 ?? -1.1) + Math.sin(t * .3) * .08;
    if (chapter !== "toki") bee.userData.animate(t);
  }
  ringM.material.opacity *= Math.pow(.2, dt); ringM.scale.multiplyScalar(1 + dt * .6);
  // カメラ
  if (chapter === "iro") {
    const b = iroLook.base.clone(); b.x += iroLook.x; camera.position.lerp(b, ease(dt, 4)); camera.rotation.set(0, 0, 0, "YXZ");
    camera.lookAt(camera.position.x + Math.sin(iroLook.yaw) * 4, b.y - iroLook.pitch * 4 - .02, WALL.z);
  } else if (chapter === "umwelt") {
    const L = LENS[lens];
    if (L.under === "light") camera.position.set(0, UG - me.depth, 0); else camera.position.copy(me.pos);
    camera.rotation.set(me.pitch, me.yaw, 0, "YXZ");
    const moving=!!me.path||['w','s','a','d','arrowup','arrowdown'].some(k=>keys.has(k)),motion=MOTION[lens];
    if(!RM){camera.position.y+=Math.sin(t*motion.freq)*motion.bob*(moving?1:.18);if(lens==='hebi'&&moving)camera.rotation.z=Math.sin(t*4)*.018;if(lens==='chou'&&moving)camera.rotation.z=Math.sin(t*2)*.025;bodies[lens]?.userData.animate(t,moving);}
    { const dy = wrapA(me.yaw - bodyYaw0); bodyYaw0 = me.yaw; const turn = dt > 0 ? dy / dt : 0; bodyRoll += (clamp(turn * (FLIGHT.has(lens) ? .28 : .08), -.6, .6) - bodyRoll) * ease(dt, 5); bodyRoot.rotation.z = -bodyRoll; }
    // 身体を切り替えた直後の 2〜3 秒だけ、自分の体を横から寄せて見せる（毛・艶・翅がわかるように。2026-10-13）
    // 2026-10-13（80 点へ）：生きものごとに寄り方を変える（蜂・小鳥は横から大きく、マムシは斜め上から銭形が見えるように、コウモリは翼と耳が入る距離）。
    //   画面が横に広いと体が小さく見えるので大きく。見せ場は 3.6 秒。⟲ のボタン（showAgain）でもう一度見られる
    { if (lens !== showLens) { showLens = lens; showT = t; } const u = t - showT, sv = SHOW[lens] || SHOW.def, wide = innerWidth / innerHeight > 1.2 ? 1.3 : 1,
        k = (RM || KUR.on || lens === 'hito' || lens === 'mimizu') ? 0 :   /* くらべる旅では体の見せ場を出さない（答えの瞬間に自分の体が花をふさいだ・2026-10-14 r3） */ sstep(0, .5, u) * (1 - sstep(3.3, 4.1, u)), bp = BODYPOS[lens] || [-.27, -.65];
      bodyRoot.rotation.set(0, Math.PI, 0, 'YXZ'); bodyRoot.position.set(0, bp[0] + (sv.y - bp[0]) * k, bp[1] + (sv.z - bp[1]) * k); bodyRoot.scale.setScalar(.2 * (1 + (sv.s * wide - 1) * k));
      setBodyAlpha(lens, KUR.on ? k : .55 + .45 * k); if (KUR.on && k < .01) bodyRoot.visible = false; }   // くらべる旅では、見せ場のあとは自分の体を消して、見比べる花を隠さない（2026-10-14 r2：PC の犬が中央を占めた）
    if (quake > 0) { camera.position.y += (Math.random() - .5) * .02 * quake; quake = Math.max(0, quake - dt * 2); }
  }
  $('stage').dataset.flightHeight=flightHeight.toFixed(3);$('stage').dataset.lens=lens;$('stage').dataset.habitat=habitat;$('stage').dataset.position=camera.position.toArray().map(v=>v.toFixed(3)).join(',');$('stage').dataset.depth=me.depth.toFixed(3);
  G.uCam.value.copy(camera.position);
  // コウモリ：声を出し、波面をひろげる。獲物に近づくと間隔が短くなる
  if (chapter === "umwelt" && lens === "koumori") {
    echo.t += dt; let nearMoth = 99; const f = new THREE.Vector3(); camera.getWorldDirection(f);
    for (const m of moths) { const v = m.position.clone().sub(camera.position), d = v.length(); if (v.normalize().dot(f) > .8) nearMoth = Math.min(nearMoth, d); }
    echo.int = nearMoth < 3 ? .35 : nearMoth < 6 ? .8 : 1.6;
    if (echo.t >= echo.int) {
      echo.t = 0; echo.o = camera.position.clone(); chirp(0, 3200, 1400, .06, .16);
      // はね返り：まわりの物までの距離から、ゆっくりにした時間でかえす（距離 d → 2d/ECHO_V 秒）
      const dirs = [[0, 0], [.5, 0], [-.5, 0], [0, -.35], [.25, -.2], [-.25, -.2]];
      for (const [yx, px] of dirs) { const d = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(me.pitch + px, me.yaw + yx, 0, "YXZ")); ray.set(camera.position, d); ray.far = 16; const h = ray.intersectObjects((habitat==='forest'?forest:garden).children, true).find(x => x.object.visible && x.object.material?.userData?.u?.uEchoK?.value > .3); if (h) chirp(2 * h.distance / ECHO_V, 2600, 1300, .05, .07 * (1 - h.distance / 17)); }
    }
    if (echo.o) G.uEcho.value.set(echo.o.x, echo.o.y, echo.o.z, echo.t * ECHO_V);
  }
  if (chapter === "umwelt" && lens === "mimizu") { G.uWorm.value = clamp(.85 * Math.exp(-me.depth * 3.2), 0, 1) * (1 - .15 * quake); scene.background.setScalar(Math.pow(G.uWorm.value, 2.2)); }
  // 画面のまん中にあるものを音に（紫外・温かさ）
  sonT -= dt;
  if (AUD.ctx && sonT <= 0) {
    sonT = .2; let uvv = 0, heat = 0;
    if (chapter === "umwelt" && ["hachi", "chou", "tori", "hebi"].includes(lens)) {
      ray.setFromCamera(new THREE.Vector2(0, 0), camera); ray.far = 30; const h = ray.intersectObjects(sonic, false).find(x => { for (let o = x.object; o; o = o.parent) if (!o.visible) return false; return true; });   // 見えていないもの（使っていない庭）は音にしない
      if (h) { const u = h.object.material.userData.u; uvv = u.uUV.value; heat = u.uTemp.value * (1 - clamp((h.distance - 5) / 9, 0, 1)); }
    }
    AUD.set(AUD.uvTone.g, ["hachi", "chou", "tori"].includes(lens) && uvv > .3 ? .05 * uvv : 0);
    lastHeat = lens === "hebi" ? heat : 0;
    AUD.set(AUD.hum.g, lens === "hebi" && heat > .3 ? .18 * heat : 0); AUD.hum.o.frequency.value = 70 + heat * 60;
    if (AUD.wind) AUD.wind.gain.setTargetAtTime(chapter === "umwelt" && !LENS[lens].under && !LENS[lens].night ? .05 : 0, AUD.ctx.currentTime, .5);
  }
  aoiTick(dt); kurMarks();
  if (chapter === "toki") renderToki(); else { renderer.setViewport(0, 0, innerWidth, innerHeight); renderer.render(scene, camera); if (winMode()) renderAoiWindow(); }
  STARTUP.firstFrameAt ||= performance.now();
  // Do not count the old poster/boot state as usable 3D. Aoi must be visible.
  if (!STARTUP.interactiveAt && vrm && A.fade >= .99 && !STARTUP.assetsLoading && !STARTUP.assetErrors.length && $("boot").hidden) {
    STARTUP.interactiveAt = performance.now(); $("stage").dataset.ready = 'true'; schedulePortraits();
  }
  if (!STARTUP.fallbackAt && ((!vrm && A.loadDone) || STARTUP.assetErrors.length) && !STARTUP.assetsLoading && $("boot").hidden) {
    STARTUP.fallbackAt = performance.now(); $("stage").dataset.ready = 'fallback'; schedulePortraits();
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- 影と映りこみ（2026-10-09 よりリアルに）
setDay(LIT.base); FOREST.aimShafts?.(SUNDIR);
forest.traverse(o => { if (!o.isMesh) return; o.receiveShadow = true; let nc = false; for (let q = o; q; q = q.parent) if (q.userData.noCast) nc = true; if (!nc && o.castShadow !== true) o.castShadow = !(mobile && o.isInstancedMesh && o.count > 300); if (nc) o.castShadow = false; });
garden.traverse(o => { if (!o.isMesh || o === sky || o.userData.noShadow) return; o.receiveShadow = true; o.castShadow = !o.userData.noCast && !(mobile && o.userData.smallCast); });
{ // 空の映りこみ（水面・縁側の床・瓦・石の艶）：いつもの時刻の空と、塀の向こうの木々の暗い帯を、映りこみの地図に焼く
  const env = new THREE.Scene(), sk = new THREE.Mesh(sky.geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); env.add(sk);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 30, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x24301f, side: THREE.BackSide, fog: false })); band.position.y = 4; env.add(band);
  const gnd = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshBasicMaterial({ color: 0x8f8a7c, fog: false })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -1; env.add(gnd);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, .02).texture; pm.dispose();
}

// ---------------------------------------------------------------- はじまり
STARTUP.sceneBuiltAt = performance.now();
(async () => {
  me.pos.set(0,1.55,4);prog(20); applyLens("hito"); setWhere(); camera.rotation.set(me.pitch, me.yaw, 0, "YXZ");
  // 2026-10-23 起動 5 秒：碧を読むあいだに、森の材質（シェーダー）を並行に組み立てておく（はじめのこまで一つずつ組み立てて数秒止まっていた）
  const preCompile = renderer.compileAsync ? renderer.compileAsync(scene, camera).catch(() => {}) : null;
  // 2026-10-23 本人「見える部分は表示してください」：森が組み上がったら幕を上げて操作できるようにし、碧はあとから現れる（PC は 0.8 秒まで待つ・スマホは待たない）
  A.hold = true;
  const aoiReady = loadAoi().then(async () => {
    if (aoi && renderer.compileAsync) { aoi.visible = true; await renderer.compileAsync(aoi, camera, scene).catch(() => {}); }
    STARTUP.aoiCompiledAt = performance.now();   // 碧の材質は、出る前に並行で組み立てる（映ったこまで止まらない）
    // 碧のはじめの位置（2026-10-13）：見る人のすぐ前（0.6 m）で見えなかったので、ふだん立つ右前（となり）に置く
    if (vrm) { const nar = innerWidth / innerHeight < .8, D = nar ? 4.0 : 2.6, ang = aoiSideAng(2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect)); A.pos.set(me.pos.x + D * Math.sin(ang), 0, me.pos.z - D * Math.cos(ang)); A.yaw = 0; AM.place(A.pos.x, A.pos.z, A.yaw); aoi.position.copy(A.pos); }
    A.loadDone = true;
    if (vrm && A.sayOnShow && !started) $("say").textContent = A.sayOnShow;   // 碧が現れてから「となりに立っているのが…」を出す
    if (vrm) { STARTUP.aoiAppearAt = performance.now(); A.late = !!$("boot").hidden; if (A.late) { A.shadowOn = false; aoi.traverse(o => { if (o.isMesh) o.castShadow = false; }); } A.hold = false; A.appear = true; if (!started) A.intro = true; if (AM) AM.calm = 2.4; }   // 幕のあとに届いたときは、1 秒かけて静かに現れる
  });
  await preCompile; await Promise.race([aoiReady, sleep(mobile ? 0 : 800)]); prog(100);
  // 右の ↑ ↓ ↶ ↷（2026-10-13）：押しているあいだ進む・向きを変える。短く押したときは一歩（1.2 m）・一ふり（約 17°）
  const hold = (btn, key, tapFn) => { let t0 = 0;
    btn.onpointerdown = e => { first(); if (LENS[lens].under) return; t0 = performance.now(); keys.add(key); btn.setPointerCapture?.(e.pointerId); };
    const end = cancel => { if (!t0) return; keys.delete(key); const short = performance.now() - t0 < 260; t0 = 0; if (short && !cancel) tapFn(); };
    btn.onpointerup = () => end(false); btn.onpointercancel = () => end(true); btn.onlostpointercapture = () => end(true);
    btn.onclick = e => { if (e.detail === 0) { first(); tapFn(); } };   // キーボード（Enter・スペース）で押したとき
  };
  hold($('bodyForward'), 'w', () => walkTo(me.pos.x - Math.sin(me.yaw) * 1.2, me.pos.z - Math.cos(me.yaw) * 1.2));
  hold($('bodyBack'), 's', () => walkTo(me.pos.x + Math.sin(me.yaw) * 1.2, me.pos.z + Math.cos(me.yaw) * 1.2));
  document.querySelectorAll('[data-turn]').forEach(b => hold(b, b.dataset.turn === 'left' ? 'q' : 'e', () => { me.yaw += b.dataset.turn === 'left' ? .3 : -.3; }));
  document.querySelectorAll('[data-habitat]').forEach(b=>b.onclick=()=>{first();setHabitat(b.dataset.habitat);});
  document.querySelectorAll('[data-fly]').forEach(b=>{const key=b.dataset.fly;const release=()=>keys.delete(key);b.onclick=()=>{flightHeight=clamp(flightHeight+(key==='r'?.45:-.45),.25,8);me.pos.y=flightHeight;};b.onpointerdown=e=>{keys.add(key);b.setPointerCapture(e.pointerId);};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;b.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat){flightHeight=clamp(flightHeight+(key==='r'?.45:-.45),.25,8);me.pos.y=flightHeight;}}};b.onkeyup=release;b.onblur=release;});
  STARTUP.controlsReadyAt = performance.now();
  window.__muBoot = true; $("boot").classList.add("gone"); setTimeout(() => $("boot").hidden = true, 180);
  { const T0 = "となりに立っているのが、案内の碧です。画面を押すと、碧が案内をはじめます。同じ場所に立ったまま、蜂・犬・マムシに体を入れかえて、見え方をくらべます。（およそ 5 分）"; if (A.hold) A.sayOnShow = T0; else $("say").textContent = T0; }
  setActs([]);
  requestAnimationFrame(frame);
  // 姿は、はじめて押す前から、揺れずにゆっくり現れる
  if (!A.hold) { A.appear = true; A.intro = true; if (AM) AM.calm = 2.4; }   // 2026-10-14：待たずに、最初のこまから現れはじめる
})();
// 2026-10-14：上の説明（#where）が 2 行に折れても、「歩く…」の行（#moveNote）と予想の札が重ならないよう、高さを #where の下にそろえる
{ const W = $("where"), N = $("moveNote"), Q = $("kurQ"), C = $("cmpTag");
  const lay = () => { const b = W.getBoundingClientRect().bottom; N.style.top = Math.round(b + 4) + "px"; const nb = N.hidden || !N.textContent ? b : N.getBoundingClientRect().bottom; if (Q) Q.style.top = Math.round(nb + 6) + "px"; if (C) C.style.top = Math.round(nb + 6 + (Q && !Q.hidden ? Q.offsetHeight + 6 : 0)) + "px"; };
  new ResizeObserver(lay).observe(W); new ResizeObserver(lay).observe(N); addEventListener("resize", lay); new MutationObserver(lay).observe(N, { attributes: true, childList: true, subtree: true, characterData: true }); if (Q) new MutationObserver(lay).observe(Q, { attributes: true, attributeFilter: ["hidden"] }); lay(); }
// くらべる旅の印（2026-10-14 11 人：「この白い花」「橙の花」「ネズミ」がどれか、画面が指していなかった）：見比べるものに細い輪と名前を出す
const KMARK = { hachi: [["wf", "白い花"]], inu: [["kz", "橙の花（ノカンゾウ）"]], hebi: [["mouse", "草むらのネズミ"]] };
function kurMarks() {
  const box = $("kurMarks"); if (!box) return;
  const cid = KUR.cur || "all", list = KUR.on && chapter === "umwelt" && $("why").hidden ? (cid === "all" ? [...KMARK.hachi, ...KMARK.inu, ...KMARK.hebi] : KMARK[cid] || []) : [];
  if (!list.length) { if (box.childElementCount) box.innerHTML = ""; box.dataset.k = ""; return; }
  if (box.dataset.k !== cid) { box.dataset.k = cid; box.innerHTML = list.map(([k, n]) => `<div class="km" data-k="${k}"><i></i><span>${n}</span></div>`).join(""); }
  const gTop = $("guide").getBoundingClientRect().top;
  for (const el of box.children) { const k = el.dataset.k, v = (k === "wf" ? KUR.wf : k === "kz" ? KUR.kz : mouse.getWorldPosition(new THREE.Vector3()))?.clone(); if (!v) { el.hidden = true; continue; }
    const vr = v.clone().add(new THREE.Vector3(k === "mouse" ? .12 : .4, 0, 0).applyQuaternion(camera.quaternion)); v.project(camera); vr.project(camera); const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
    el.style.setProperty("--r", Math.round(clamp(Math.abs(vr.x - v.x) / 2 * innerWidth, 22, innerWidth < 700 ? 62 : 90)) + "px");   // 輪の大きさ＝群れの大きさ
    el.hidden = v.z > 1 || x < 0 || x > innerWidth || y < 0 || y > gTop - 8; el.classList.toggle("l", x > innerWidth * (innerWidth < 700 ? .4 : .52)); el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    if (innerWidth < 700) { const lg = $("legend"), lt = lg && !lg.hidden ? lg.getBoundingClientRect().top : 1e9, rr = parseFloat(el.style.getPropertyValue("--r")) || 22; el.classList.toggle("up", y + rr + 34 > Math.min(lt, gTop)); const sp = el.querySelector("span"), hw = (sp?.offsetWidth || 120) / 2; el.style.setProperty("--dx", Math.round(clamp(x, 92 + hw, innerWidth - 82 - hw) - x) + "px"); } }   // スマホは輪の下に名前。左のダイヤルと右のボタンにかからないよう寄せる
}
window.__um = {FPS,get habitat(){return habitat;},bodies,forest,FOREST,setHabitat, NAT, renderer, get lens() { return lens; }, get chapter() { return chapter; }, setLens, setChapter, setLang, iroMine, me, A, SP, LENS, G, walkTo, onTap, camera, IRO, get tunT() { return tunT; } };
