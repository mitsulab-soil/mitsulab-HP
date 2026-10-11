/* 環世界の庭（umwelt）── 2026-10-07
   本人「花の色の話について、3D 空間で仮想的に、動物や虫などの環世界を体験して、碧が案内をしてくれるものを実装してください。」
   ひとつの庭を、生きものの受けとり方（lens）に切り替えて歩く。言葉と色（iro）、四つの時計（toki・試作）。
   色の写し方：それぞれの面に「人の色（linear RGB）」と「紫外の返し（uv）」と「温かさ（temp）」を持たせ、
   シェーダーで、受けとる細胞の感度から作った行列（uM）と紫外の写し先（uUVw）で置きかえる。近似（README）。
   操作は森羅博物館と同じ（押して歩く・一回 6 m まで／なぞって見回す／キーボード）。 */
import * as THREE from "three";
import {makeBody,creaturePortrait,flowerForest} from "./bodies.js?v=20261011f";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildNature, photoTex, makeTree, makeFlowers, makeGrass } from "./nature.js?v=20261011f";
import { buildZen, YARD, ENGAWA, STONES, crownHook } from "./zen.js";

const $ = id => document.getElementById(id);
const S = window.SCRIPT, N = S.names, VOICE = window.VOICE || {}, P = window.PATHS || {};
document.querySelectorAll("[data-n]").forEach(e => { if (N[e.dataset.n]) e.textContent = N[e.dataset.n]; });
document.title = N.app;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = (dt, k) => 1 - Math.exp(-k * dt);
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mobile = innerWidth<700 || matchMedia("(pointer:coarse)").matches;
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
} else if (uMode == 3) {     // モグラ：鼻先がふれたところだけ（アイマー器官）
  float d = distance(vWP, uTouch.xyz);
  float k = 1.0 - smoothstep(uTouch.w * .45, uTouch.w, d);
  float n = fract(sin(dot(floor(vWP * 70.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  gl_FragColor.rgb = vec3(.012) + vec3(.96, .84, .66) * k * (.45 + .55 * step(.5, n));
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
  const m = o.basic ? new THREE.MeshBasicMaterial(base) : o.std ? new THREE.MeshStandardMaterial({ ...base, roughness: o.rough ?? .9, metalness: o.metal ?? 0, envMapIntensity: o.env ?? .7,
    normalMap: o.nmap || null, normalScale: new THREE.Vector2(o.ns ?? 1, o.ns ?? 1), roughnessMap: o.orm || null, aoMap: o.ao || null, aoMapIntensity: o.aoK ?? 1 }) : new THREE.MeshLambertMaterial(base);
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
}
// 池（なめらかな水面：音を前へはね返すので、反響は弱い＝Greif & Siemers 2010）
const POND = { x: -8, z: -7.4, r: 2.4 };
{
  // 水面：空と塀の向こうの木々が映る（映りこみの地図）。細かいさざ波は法線の地図で
  const w = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 48), M(0x1d3a3c, { std: true, rough: .06, env: 1.25, nmap: tx("sand_grit_n.webp", 2, 2, false), ns: .08, uv: .12, temp: .03, echo: .1 })); w.rotation.x = -Math.PI / 2; w.position.set(POND.x, .02, POND.z); garden.add(w); w.receiveShadow = true;
}
// 閉じた禅の庭（2026-10-09）：土塀・白砂と砂紋・石組みと苔・縁側。地平線は見せない（zen.js）
const ZEN = buildZen({ M, canvasTex, photoTex, tx, garden, pick, sonic, POND, mobile });
// 木（欅のような落葉樹）・花・草・池のまわり・生きものは nature.js。花は右の塀ぎわの植え込みへ（花壇の座標 → 庭の座標）
const TREE = { x: 8.6, z: -8.8 };
const BED = { ry: -Math.PI / 2, x: 9.6, z: -.6 };
const bed = (x, y, z) => new THREE.Vector3(BED.x - z, y, BED.z + x);
const MOUSE = { x: -2.6, z: -.45 };
const NAT = buildNature({ M, canvasTex, tx, garden, sonic, TREE, POND, BED, bed, MOUSE, grassSample: r => r() < .8 ? [8.3 + r() * 3.1, -4.3 + r() * 8] : (a => [POND.x + Math.cos(a) * (POND.r + .4 + r() * .5), POND.z + Math.sin(a) * (POND.r + .4 + r() * .5)])(r() * Math.PI * 2) });
const { bird, mouse, butterflies, ageha, bee, leafMat, leafIM } = NAT;
// 赤い面（紫外を返さない絵の具の想定）。《蜂の目》の八っつぁんの赤い戸。
//   2026-10-09：禅庭に馴染むよう、背もたれのある赤いベンチをやめ、縁台（腰かける低い台）にした。二つの案：
//     既定＝座面の板を赤く塗った縁台（台本の「紫外を返さない絵の具で赤く塗った板」のまま）
//     ?bench=mosen＝白木の縁台に赤い毛氈を敷く（選ぶなら、台本の一文を「赤い毛氈」に直して声を作り直す）
const BENCH = new URLSearchParams(location.search).get("bench") === "mosen" ? "mosen" : "nuri";
const redBoard = new THREE.Group();
{
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
}
// ブルーベリーのような実の茂み（実の白い粉＝ブルームが紫外を返す：Siitari et al. 1999）
{
  const bush = new THREE.Group(); bush.position.set(6.4, 0, -9.9);
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
  for (let i = 0; i < 40; i++) { const a = i * 2.39996, b = new THREE.Mesh(bg, berryM); b.position.set(Math.cos(a) * .82, .35 + (i % 7) * .09, Math.sin(a) * .62); bush.add(b); if (i < 6) sonic.push(b); }
  garden.add(bush);
}
// 蛾（夜・コウモリの獲物）
const moths = [];
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(.12, .08), M(0x9a8a70, { uv: .1, temp: .2, side: THREE.DoubleSide, echo: 1.6 }));
  m.userData.ph = i * 1.7; m.visible = false; garden.add(m); moths.push(m);
}
// 言葉と色の壁（黄緑→緑→青→紫・明るさ四段）。ラベルと境目は言語ごとに描きかえる
const WALL = { x: -1.5, z: -11.1, w: 4.8, h: 1.75, y: .55, cols: 12, rows: 4 };
const wallCanvas = document.createElement("canvas"); wallCanvas.width = 1536; wallCanvas.height = 600;
const wallTex = new THREE.CanvasTexture(wallCanvas); wallTex.colorSpace = THREE.SRGBColorSpace; wallTex.anisotropy = 8;
const wall = new THREE.Mesh(new THREE.PlaneGeometry(WALL.w, WALL.h), M(0xffffff, { basic: true, map: wallTex, uv: .05, temp: .2, noTone: true, fog: false }));   // 色の札は、露出の整えも霞もかけず、決めた色のまま
wall.position.set(WALL.x, WALL.y + WALL.h / 2, WALL.z); garden.add(wall);
{
  const fr = M(0x3d3428, { uv: .05, temp: .2 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(WALL.w + .2, WALL.h + .2, .08), fr); back.position.set(WALL.x, WALL.y + WALL.h / 2, WALL.z - .05); garden.add(back);
  for (const x of [-WALL.w / 2 + .3, WALL.w / 2 - .3]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.1, WALL.y + .1, .1), fr); p.position.set(x, (WALL.y + .1) / 2, WALL.z - .05); garden.add(p); }
}
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

// ---------------------------------------------------------------- 土の中（モグラ・ミミズ）── 庭の下の別の場所（y＝UG）
const UG = -40;
const under = new THREE.Group(); under.visible = false; scene.add(under);
const TUN = new THREE.CatmullRomCurve3([[0, 0, 4], [3, .1, 2], [4, -.1, -1.5], [1.5, 0, -4], [-2, .05, -3.5], [-4, -.1, 0], [-2.5, 0, 3]].map(([x, y, z]) => new THREE.Vector3(x, UG + y, z)), true, "catmullrom", .5);
const tunPick = [];
{
  const soilM = M(0x9a8a7a, { map: photoTex("soil_forest.webp", 60, 3), side: THREE.BackSide, uv: .02, temp: .1 });   // 森の土の写真（Forest Ground 04・CC0）
  const tube = new THREE.Mesh(new THREE.TubeGeometry(TUN, 220, .32, 14, true), soilM); under.add(tube); tunPick.push(tube);
  // 根（トンネルを横ぎる）・石・ミミズ（壁から半分出ている）
  const rootM = M(0xc9b48a, { uv: .05, temp: .1 }), stoneM = M(0x8a8478, { uv: .05, temp: .1 }), wormM = M(0xb86a5e, { uv: .05, temp: .2 });
  for (let i = 0; i < 26; i++) {
    const t = i / 26 + .013, p = TUN.getPointAt(t), tg = TUN.getTangentAt(t), side = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 1, 0)).normalize();
    if (i % 3 === 0) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.012, .02, .9, 6), rootM); r.position.copy(p).addScaledVector(side, (i % 2 ? .1 : -.12)); r.rotation.set(.3 * (i % 2 ? 1 : -1), 0, .25); under.add(r); }
    else if (i % 3 === 1) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(.09 + (i % 4) * .02, 0), stoneM); s.position.copy(p).addScaledVector(side, .3 * (i % 2 ? 1 : -1)).add(new THREE.Vector3(0, -.2 + (i % 5) * .08, 0)); under.add(s); }
    else {
      const pts = []; for (let k = 0; k < 6; k++) pts.push(p.clone().addScaledVector(side, (i % 2 ? 1 : -1) * (.36 - k * .05)).add(new THREE.Vector3(Math.sin(k) * .03, -.12 + k * .02, Math.cos(k * 1.3) * .03)));
      const w = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .012, 6), wormM); w.userData.base = w.position.clone(); w.userData.ph = i; under.add(w);
    }
  }
}

// モグラの鼻先（画面の下のまん中）：裸の桃色の鼻先に、アイマー器官の小さな粒。ふれたところが浮かぶのは、この鼻先の前
scene.add(camera);
const snout = new THREE.Mesh(new THREE.ConeGeometry(.034, .16, 18, 1, true).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#c98f86"; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,225,215,${.4 + Math.random() * .5})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1.2, 0, 7); g.fill(); } }) }));
const snoutTip = new THREE.Mesh(new THREE.CircleGeometry(.009, 16), new THREE.MeshBasicMaterial({ color: 0xf0c4b8 })); snoutTip.position.z = -.08; snout.add(snoutTip);
snout.position.set(0, -.085, -.27); snout.visible = false; camera.add(snout);

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
  mogura: { under: "touch", mode: 3, m: I3, uvw: [0, 0, 0], sub: "鼻先のアイマー器官でふれる", legend: "<b>浮かぶところ</b>＝鼻先がふれたところ" },
  mimizu: { under: "light", mode: 4, m: I3, uvw: [0, 0, 0], sub: "目はない・体で光の明るさを感じる", legend: "<b>画面の明るさ</b>＝光の明るさだけ<br>▲▼で上へ・下へ" },
};
const FLIGHT=new Set(['hachi','chou','tori','koumori']);
const MOTION={hito:{speed:1.4,bob:.025,freq:9},hachi:{speed:2.2,bob:.015,freq:35},chou:{speed:1.3,bob:.065,freq:8},tori:{speed:3.2,bob:.025,freq:12},inu:{speed:2,bob:.035,freq:11},hebi:{speed:.7,bob:.006,freq:4},koumori:{speed:2.8,bob:.025,freq:16},mogura:{speed:.12,bob:.009,freq:9},mimizu:{speed:.04,bob:0,freq:3}};
const forest=flowerForest(M,pick,sonic);scene.add(forest);scene.add(sky);
for(let i=0;i<18;i++){const a=i*2.399,r=8+(i%4)*3;makeTree(forest,sonic,{x:Math.cos(a)*r,z:Math.sin(a)*r});}
for(const [x,z,ry] of [[-5,-3,.3],[5,-6,-.4],[-7,5,1]])makeFlowers(forest,sonic,{x,z,ry});
makeGrass(forest,r=>{const a=r()*Math.PI*2,d=2+r()*22;return [Math.cos(a)*d,Math.sin(a)*d];});
forest.children[0].material.map=photoTex('soil_forest.webp',12,12);forest.children[0].material.needsUpdate=true;
forest.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=true;}});let habitat='forest',flightHeight=1.5;
const waterMaterial=M(0x426e70,{std:true,rough:.08,metal:.2,uv:.12,temp:.1,echo:.08});
const pool=new THREE.Mesh(new THREE.CircleGeometry(4.8,72),waterMaterial);pool.rotation.x=-Math.PI/2;pool.position.set(-8,.025,-7);forest.add(pool);
const riverCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-8,.035,-7),new THREE.Vector3(-5,.035,-13),new THREE.Vector3(1,.035,-15),new THREE.Vector3(9,.035,-12),new THREE.Vector3(18,.035,-7)]);const river=new THREE.Mesh(new THREE.TubeGeometry(riverCurve,90,.75,12,false),waterMaterial);river.scale.y=.035;forest.add(river);
const aerial=new THREE.TextureLoader().load('assets/world/tex_photo_s.jpg');aerial.colorSpace=THREE.SRGBColorSpace;const cityFloor=new THREE.Mesh(new THREE.PlaneGeometry(22,22),M(0xffffff,{std:true,map:aerial,uv:.04,temp:.15}));cityFloor.rotation.x=-Math.PI/2;cityFloor.position.set(17,.02,0);forest.add(cityFloor);
let cityReady=false;
async function loadCity(){try{const [{GLTFLoader},{MeshoptDecoder}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js')]);const l=new GLTFLoader();l.setMeshoptDecoder(MeshoptDecoder);const data=await l.loadAsync('assets/world/buildings_lite.glb');const group=data.scene,box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3()),extent=box.getSize(new THREE.Vector3()),scale=18/Math.max(extent.x,extent.z);group.scale.setScalar(scale);group.position.set(16-center.x*scale,-box.min.y*scale,-center.z*scale);group.traverse(o=>{if(o.isMesh){if(!o.geometry.attributes.normal)o.geometry.computeVertexNormals();o.material=M(0xd5d6ca,{std:true,vc:!!o.geometry.attributes.color,uv:.04,temp:.2});}});forest.add(group);cityReady=true;}catch(e){console.warn('都市モデルを読み込めませんでした',e);}}
loadCity();
const bodies=Object.fromEntries(S.lens.map(l=>[l.id,makeBody(l.id,c=>M(c,{temp:.7,uv:.05}))]));
const residents=['chou','chou','hachi','hachi','tori','tori','hebi'].map((id,i)=>{const b=makeBody(id,c=>M(c,{uv:id==='chou'?.7:.1,temp:.7}));b.scale.setScalar(id==='tori'?.3:id==='hebi'?.25:.16);b.userData.kind=id;b.userData.phase=i*1.9;forest.add(b);return b;});
const bodyRoot=new THREE.Group();camera.add(bodyRoot);bodyRoot.position.set(0,-.27,-.65);bodyRoot.scale.setScalar(.22);Object.values(bodies).forEach(b=>{bodyRoot.add(b);b.visible=false;});
function setHabitat(place){habitat=place;me.path=null;me.pos.set(0,LENS[lens].eye||1.5,place==='forest'?4:11.2);me.yaw=0;me.pitch=-.05;applyLens(lens);document.querySelectorAll('[data-habitat]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.habitat===place)));setWhere();}
const LENS_IDS = S.lens.map(l => l.id);
let lens = "hito", chapter = "umwelt";
function applyLens(id) {
  const L = LENS[id];
  G.uM.value.set(...L.m); G.uUVw.value.set(...L.uvw); G.uMode.value = L.mode || 0;
  renderer.setPixelRatio(L.blur ? BASE_PR * L.blur : BASE_PR); renderer.setSize(innerWidth, innerHeight);
  const night = !!L.night;
  if (night) { hemi.intensity = .05; sun.intensity = 0; } else setDay(LIT.base);
  scene.background.set(L.under ? 0x000000 : night ? 0x020306 : 0x0f1412);
  for (const m of moths) m.visible = night;
  garden.visible = !L.under && habitat==='garden';forest.visible=!L.under && habitat==='forest';under.visible = L.under === "touch";
  flightHeight=L.eye||1.5;
  Object.entries(bodies).forEach(([key,b])=>{b.visible=key===id&&key!=='hito'&&!L.under;});
  $('flightControls').hidden=!FLIGHT.has(id)||chapter!=='umwelt';
  $('moveNote').textContent=FLIGHT.has(id)?'飛ぶ · W A S D ／ 上昇 R・下降 F（画面のボタンでも操作）':id==='hebi'?'地面を這う · W A S D':L.under?'土の中を進む · 矢印／上へ・下へ':'歩く · W A S D ／ 押した場所へ';
  $("legend").innerHTML = L.legend; $("legend").hidden = !L.legend || chapter !== "umwelt";
  $("worm").hidden = id !== "mimizu" || chapter !== "umwelt";
  snout.visible = id === "mogura" && chapter === "umwelt";
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
  if(habitat==='forest'){if(x<-27||x>29||z<-25||z>26)return false;if(!FLIGHT.has(lens)&&Math.hypot(x+8,z+7)<4.6)return false;return true;}
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
// 土の中：トンネルの曲線の上の位置（0〜1）
let tunT = 0, tunGoal = null;
function moveCam(dt) {
  const L = LENS[lens];
  if (chapter !== "umwelt") return;
  if (L?.under === "touch") {
    let v = 0; if (keys.has("w") || keys.has("arrowup")) v = .12; if (keys.has("s") || keys.has("arrowdown")) v = -.12;
    if (v) tunGoal = null;
    if (tunGoal != null) { const d = wrapT(tunGoal - tunT); v = clamp(d, -.05, .05) * 2.4; if (Math.abs(d) < .002) tunGoal = null; }
    if (v) { tunT = (tunT + v * dt + 1) % 1; if (Math.random() < dt * 6) tick(); }
    const p = TUN.getPointAt(tunT), tg = TUN.getTangentAt(tunT);
    me.pos.copy(p); if (v) { const want = Math.atan2(-tg.x * Math.sign(v), -tg.z * Math.sign(v)); me.yaw += wrapA(want - me.yaw) * ease(dt, 3); }
    return;
  }
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
const wrapT = d => ((d % 1) + 1.5) % 1 - .5;
// なぞる（ドラッグ）と押す（タップ）を分ける。数 px 動いたらタップにしない、二本指もタップにしない
const drag = { on: false, x: 0, y: 0, moved: 0, id: null, recent: false, multi: false };
const el = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const ptrs = new Map();
el.addEventListener("pointerdown", e => {
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
  if (L.under === "touch") { const h = ray.intersectObjects(tunPick)[0]; if (!h) return; tunGoal = nearestT(h.point); return; }
  if (L.under) return;
  const h = ray.intersectObjects(pick)[0]; if (h) walkTo(h.point.x, h.point.z);
}
function nearestT(p) {
  let best = tunT, bd = 1e9; for (let i = 0; i < 400; i++) { const t = i / 400, d = TUN.getPointAt(t).distanceToSquared(p); if (d < bd) { bd = d; best = t; } }
  // 一回で進むのは 6 m まで
  const len = TUN.getLength(), dt = wrapT(best - tunT), lim = MAX_STEP / len;
  return (tunT + clamp(dt, -lim, lim) + 1) % 1;
}
addEventListener("keydown", e => {
  // 設定を読んでいる間は庭の移動・視点・音声のショートカットを止める。
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
  if (/^[1-9]$/.test(k) && chapter === "umwelt") { setLens(LENS_IDS[+k - 1]); return; }
  if (k === " ") { e.preventDefault(); pauseSpeech(!SP.paused); return; }
  if (k === "n") { skipLine(); return; }
  if (k === "escape") { $("menu").hidden = true; return; }
  keys.add(k);
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => keys.clear());

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
// 土の中の小さな動物の振動を「まねて作った音」（録音ではない）。Maeder et al. 2022 で 100〜1000 Hz あたりに帯が見えたことにならい、その帯の短いノイズ
function crackle() {
  const c = AUD.ctx; if (!c) return; const t = c.currentTime, n = c.createBufferSource(), len = .02 + Math.random() * .05, b = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 180 + Math.random() * 700; bp.Q.value = 1.4; const g = c.createGain(); g.gain.value = .05 + Math.random() * .08;
  n.buffer = b; n.connect(bp); bp.connect(g); g.connect(AUD.master); n.start(t);
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
    const done = () => { clearTimeout(SP.timer); SP.timer = null; SP.resolve = null; SP.playing = false; $("guide").classList.remove("talking"); res(); };
    SP.resolve = done;
    const timed = ms => { SP.rest = ms; SP.t0 = performance.now(); if (!SP.paused) SP.timer = setTimeout(done, ms); };
    if (v && voiceOn()) {
      const a = AUD.voice; a.onended = done; a.onerror = () => timed(est(text)); a.src = v.f; a.currentTime = 0; SP.playing = true; window.__voiceSrc = v.f;
      if (!SP.paused) a.play().catch(() => { SP.playing = false; timed(est(text)); });
    } else timed(est(text));
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
const talkActs = extra => [[() => SP.paused ? "▶ 続ける" : "⏸", () => pauseSpeech(!SP.paused), false, "碧の話を止める・続ける"], ["⏭", skipLine, false, "このことばをとばす"], ...extra];
function talk(lines, extra = []) { if (SP.paused) SP.paused = false;   // 止めたまま切り替えたら、新しい話から始める（字幕が前の文のまま残らない）
  setActs(talkActs(extra)); return sayQ(lines).then(ok => { if (ok) setActs(extra); return ok; }); }

// ---------------------------------------------------------------- 碧（依代）── 森羅博物館と同じ姿・同じ声。庭のまん中に、揺れずにゆっくり現れる
const AOI_H = 1.62;
let aoi = null, vrm = null;
const A = { pos: new THREE.Vector3(0, 0, 3.2), vel: new THREE.Vector3(), yaw: 0, sp: 0, k: 0, ph: 0, blink: 2, bt: -1, hip0: null, mouth: 0, talkT: 0, fade: 0, calm: 2, cur: {}, show: true };
async function loadAoi() {
  try {
    const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js"), import("@pixiv/three-vrm")]);
    const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); ld.register(p => new V.VRMLoaderPlugin(p));
    const g = await ld.loadAsync(P.aoi, e => { if (e.total) prog(40 + 55 * e.loaded / e.total); });
    const v = g.userData.vrm; if (!v) throw new Error("VRM ではない");
    V.VRMUtils.removeUnnecessaryVertices(g.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(g.scene); V.VRMUtils.rotateVRM0(v);
    v.scene.traverse(o => { o.frustumCulled = false; if (o.isMesh) o.castShadow = true; });
    aoi = new THREE.Group(); aoi.add(v.scene); garden.add(aoi); vrm = v;
    const hp = v.humanoid.getNormalizedBoneNode("hips"); if (hp) A.hip0 = hp.position.clone();
    pose(0); v.update(0); v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(v.scene), h = box.max.y - box.min.y, sc = h > .5 ? AOI_H / h : 1;
    v.scene.scale.setScalar(sc); v.scene.position.y = -box.min.y * sc;
    A.gaze = new THREE.Object3D(); scene.add(A.gaze); if (v.lookAt) v.lookAt.target = A.gaze;
    aoi.traverse(o=>{if(o.isMesh){o.material=[].concat(o.material).map(m=>{const n=new THREE.MeshStandardMaterial({map:m.map||null,color:m.color?.clone()||new THREE.Color(0xffffff),side:m.side,transparent:m.transparent,alphaTest:m.alphaTest||0,roughness:.85});prep(n,{uv:.04,temp:.75,echo:1});return n;});if(o.material.length===1)o.material=o.material[0];}});
    A.mats = []; aoi.traverse(m => { if (m.isMesh) for (const mt of [].concat(m.material)) A.mats.push([mt, mt.transparent, mt.depthWrite]); });
    opacity(0); window.__aoi = { vrm, aoi, A };
  } catch (e) { console.warn("碧の姿を読み込めませんでした（声と字幕で案内します）：", e?.message ?? e); }
}
function opacity(o) { for (const [mt, tr, dw] of A.mats) { mt.transparent = o < 1 ? true : tr; mt.opacity = o; mt.depthWrite = o < 1 ? o > .6 : dw; mt.needsUpdate = true; } }
// 碧の小さな窓：マムシ・コウモリ・モグラ・ミミズのときは、画面の隅に碧が目を閉じて、同じ受けとり方で「一緒に感じている」姿を出す。
//   窓のふちの光は、その受けとり方の信号（熱・反響・ふれ・光の明るさ）と同じ拍子で強まる。
const aoiScene = new THREE.Scene();
aoiScene.add(new THREE.HemisphereLight(0xeef6ff, 0x404840, 1.7)); { const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(.6, 2, 2); aoiScene.add(d); }
const aoiCam = new THREE.PerspectiveCamera(26, 1, .05, 20); aoiCam.position.set(0, 1.42, 1.25); aoiCam.lookAt(0, 1.36, 0);
const WIN = {
  hebi: { c: "#ff9a4a", bg: 0x2a1410, cap: "碧も目を閉じて、熱を感じています" },
  koumori: { c: "#9fd4ff", bg: 0x050b14, cap: "碧も、反響に耳をすましています" },
  mogura: { c: "#e8cc9a", bg: 0x120c08, cap: "碧も、鼻先でふれています" },
  mimizu: { c: "#ffffff", bg: 0x101010, cap: "碧も、光の明るさだけを感じています" },
};
let winSig = 0, lastHeat = 0, lastTick = 0;
const winMode = () => !!vrm && chapter === "umwelt" && !!LENS[lens].under;
function aoiWindowTick(dt) {
  const w = WIN[lens]; $("aoiWin").hidden = false; $("aoiWinCap").textContent = w.cap; $("aoiWin").style.setProperty("--ac", w.c);
  if (aoi.parent !== aoiScene) { aoiScene.add(aoi); aoi.position.set(0, 0, 0); aoi.rotation.y = 0; A.vel.set(0, 0, 0); A.sp = 0; A.calm = 1.2; }
  aoi.visible = true; A.gaze?.position.copy(aoiCam.position); A.talkT += dt;
  const want = SP.playing ? clamp(AUD.level() * 7, 0, 1) : $("guide").classList.contains("talking") && !SP.paused ? .15 + .15 * Math.abs(Math.sin(performance.now() / 90)) : 0;
  A.mouth += (want - A.mouth) * ease(dt, 18); vrm.expressionManager?.setValue("aa", A.mouth * .8);
  pose(dt); vrm.expressionManager?.setValue("blink", .9);     // 目を閉じて、感じている
  vrm.update(dt);
  if (A.calm > 0) { A.calm -= dt; const sbm = vrm.springBoneManager; sbm?.setInitState?.(); sbm?.reset?.(); }
  if (A.fade < 1) { A.fade = Math.min(1, A.fade + dt / 1.2); opacity(A.fade); }
  // 信号の強さ（0〜1）
  const sig = lens === "hebi" ? lastHeat : lens === "koumori" ? Math.exp(-echo.t * 4) : lens === "mogura" ? Math.exp(-(performance.now() - lastTick) / 160) : G.uWorm.value;
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
function aoiTick(dt) {
  if (!vrm) return;
  if (winMode()) { aoiWindowTick(dt); return; }
  $("aoiWin").hidden = true;
  if (aoi.parent !== (habitat==='forest'?forest:garden)) { (habitat==='forest'?forest:garden).add(aoi); A.fade = 0; opacity(0); A.calm = 1.2; }
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
    const D = creature ? 4.6 : (innerWidth / innerHeight < .8 ? 3.4 : 2.6), ang = creature ? hf / 2 * .92 : Math.atan((innerWidth / innerHeight < .8 ? 1.05 : 1.3) / D);
    const F = D * Math.cos(ang), X = D * Math.sin(ang), fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw);
    goal = new THREE.Vector3(me.pos.x + fx * F - fz * X, 0, me.pos.z + fz * F + fx * X);
    for (let k = 0; k < 6 && !okGround(goal.x, goal.z); k++) goal.lerp(new THREE.Vector3(me.pos.x, 0, me.pos.z), .4);
  }
  if (A.pos.distanceTo(goal) > 14) { A.pos.copy(goal); A.vel.set(0, 0, 0); }
  const w = 3.2, n = Math.max(1, Math.ceil(dt / .02)), h = dt / n;
  for (let i = 0; i < n; i++) {
    A.vel.x += (w * w * (goal.x - A.pos.x) - 2 * w * A.vel.x) * h; A.vel.z += (w * w * (goal.z - A.pos.z) - 2 * w * A.vel.z) * h;
    const m = Math.hypot(A.vel.x, A.vel.z); if (m > 2.4) A.vel.multiplyScalar(2.4 / m);
    A.pos.x += A.vel.x * h; A.pos.z += A.vel.z * h;
  }
  A.sp += (Math.hypot(A.vel.x, A.vel.z) - A.sp) * ease(dt, 5);
  const toCam = Math.atan2(me.pos.x - A.pos.x, me.pos.z - A.pos.z), fy = A.sp > .35 ? Math.atan2(A.vel.x, A.vel.z) : toCam;
  A.yaw += clamp(wrapA(fy - A.yaw) * ease(dt, 4), -2.2 * dt, 2.2 * dt);
  aoi.position.set(A.pos.x, 0, A.pos.z); aoi.rotation.y = A.yaw;
  if (Math.hypot(A.pos.x - me.pos.x, A.pos.z - me.pos.z) < .8) aoi.visible = false;
  A.gaze?.position.copy(camera.position);
  A.talkT += dt;
  const want = SP.playing ? clamp(AUD.level() * 7, 0, 1) : $("guide").classList.contains("talking") && !SP.paused ? .15 + .15 * Math.abs(Math.sin(performance.now() / 90)) : 0;
  A.mouth += (want - A.mouth) * ease(dt, 18); vrm.expressionManager?.setValue("aa", A.mouth * .8);
  pose(dt);
  vrm.update(dt);
  if (A.calm > 0) { A.calm -= dt; const sbm = vrm.springBoneManager; sbm?.setInitState?.(); sbm?.reset?.(); }
  if (A.fade < 1 && A.appear) { A.fade = Math.min(1, A.fade + dt / 2.2); opacity(A.fade * A.fade * (3 - 2 * A.fade)); }
}
// 体の動き：森羅博物館の aoiPose を小さくしたもの（腕を下ろし、息・まばたき・歩くときの脚）
function pose(dt) {
  const live = !RM, t = performance.now() / 1000, T = {}, S_ = (n, x = 0, y = 0, z = 0) => { T[n] = [x, y, z]; };
  const kT = clamp((A.sp - .15) / .8, 0, 1); A.k += (kT - A.k) * ease(dt || .016, 2.6); const k = A.k;
  A.ph += 2 * Math.PI * (.45 + .35 * Math.min(A.sp, 2)) * (dt || 0) * Math.min(1, k * 1.5);
  const s1 = Math.sin(A.ph), c1 = Math.cos(A.ph), br = live ? Math.sin(t * 2 * Math.PI / 4.2) : 0;
  const talking = $("guide").classList.contains("talking"), gst = live && talking ? 1 : 0, gw = live ? Math.sin(t * 2.1) : 0;
  if (vrm && A.hip0) vrm.humanoid.getNormalizedBoneNode("hips")?.position.set(A.hip0.x + .012 * s1 * k, A.hip0.y + .015 * Math.cos(2 * A.ph) * k - .004 * (1 - k) * br, A.hip0.z);
  S_("hips", 0, .07 * s1 * k, .035 * s1 * k); S_("spine", .04 * k - .006 * br, -.05 * s1 * k, 0); S_("chest", -.012 * br, -.04 * s1 * k, 0);
  const lt = -.36 * s1 * k, rt = .36 * s1 * k, lk = k * (.06 + .62 * Math.pow(Math.max(0, c1), 1.5)), rk = k * (.06 + .62 * Math.pow(Math.max(0, -c1), 1.5));
  S_("leftUpperLeg", lt, 0, .015); S_("rightUpperLeg", rt, 0, -.015); S_("leftLowerLeg", lk); S_("rightLowerLeg", rk); S_("leftFoot", -(lt + lk) * .75); S_("rightFoot", -(rt + rk) * .75);
  S_("leftUpperArm", .26 * s1 * k - .05 * (1 - k), 0, -1.3 + .04 * br * (1 - k)); S_("leftLowerArm", 0, -(.28 + .14 * k), 0); S_("leftHand", .05, 0, .12);
  S_("rightUpperArm", -.26 * s1 * k - .05 * (1 - k) - .14 * gst * (1 - k), 0, 1.3 - .04 * br * (1 - k) - .06 * gst); S_("rightLowerArm", 0, .28 + .14 * k + (.34 + .08 * gw) * gst * (1 - k), 0); S_("rightHand", .05 + .08 * gst * gw, 0, -.12);
  for (const [f, m] of [["Index", .8], ["Middle", 1], ["Ring", 1.1], ["Little", 1.25]]) { const cl = .34 * m; S_(`left${f}Proximal`, 0, 0, -cl); S_(`left${f}Intermediate`, 0, 0, -cl * 1.15); S_(`right${f}Proximal`, 0, 0, cl); S_(`right${f}Intermediate`, 0, 0, cl * 1.15); }
  S_("neck", -.02 * br); S_("head", 0, 0, live ? .03 * Math.sin(t * .3) : 0);
  if (!vrm) return;
  const r = live ? 12 : 30;
  for (const [nm, tg] of Object.entries(T)) { const b = vrm.humanoid.getNormalizedBoneNode(nm); if (!b) continue; const c = A.cur[nm] ||= [...tg]; for (let i = 0; i < 3; i++) c[i] += dt ? clamp((tg[i] - c[i]) * ease(dt, r), -.14, .14) : tg[i] - c[i]; b.rotation.set(c[0], c[1], c[2]); }
  let bv = 0;
  if (live) { if (A.bt < 0) { A.blink -= dt; if (A.blink <= 0) A.bt = 0; } else { A.bt += dt; const u = A.bt; bv = u < .09 ? u / .09 : u < .12 ? 1 : u < .26 ? 1 - (u - .12) / .14 : 0; if (u >= .26) { A.bt = -1; A.blink = 3.5 + Math.random() * 4.5; } } }
  vrm.expressionManager?.setValue("blink", bv * bv * (3 - 2 * bv));
}

// ---------------------------------------------------------------- 受けとり方を切り替える
const dial = $("dial"), spoken = new Set();
for (const [i, l] of S.lens.entries()) {
  const b = document.createElement("button"); b.className = "pill"; b.dataset.id = l.id; b.setAttribute("aria-pressed", String(l.id === lens)); b.setAttribute("aria-keyshortcuts", String(i + 1));
  b.innerHTML = `<img class="creaturePortrait" alt="" src="${creaturePortrait(l.id)}"><span>${l.name}</span><i>${i + 1}</i>`; b.setAttribute("aria-label",`${l.name}の身体と受けとり方`); b.onclick = () => { first(); setLens(l.id); }; dial.appendChild(b);
}
function layoutBodyWheel(){const selected=LENS_IDS.indexOf(lens);[...dial.children].forEach((b,i)=>{let d=(i-selected+9)%9;if(d>4)d-=9;b.hidden=Math.abs(d)>2;const mobile=innerWidth<700,y=d*(mobile?57:67),x=(mobile?6:16)*(1-Math.abs(d)*.5);b.style.transform=`translate(${x}px,${y-34}px) scale(${1-Math.abs(d)*.13})`;b.style.opacity=String(1-Math.abs(d)*.23);});}
$('bodyPrev').onclick=()=>setLens(LENS_IDS[(LENS_IDS.indexOf(lens)+8)%9]);$('bodyNext').onclick=()=>setLens(LENS_IDS[(LENS_IDS.indexOf(lens)+1)%9]);$('bodyWheel').addEventListener('wheel',e=>{e.preventDefault();if(!e.repeat)setLens(LENS_IDS[(LENS_IDS.indexOf(lens)+(e.deltaY>0?1:8))%9]);},{passive:false});addEventListener('resize',layoutBodyWheel);layoutBodyWheel();
async function veil(fn) { $("veil").classList.add("on"); await sleep(RM ? 60 : 420); fn(); await sleep(60); $("veil").classList.remove("on"); }
function setWhere() {
  if (chapter === "umwelt") { const l = S.lens.find(x => x.id === lens); $("whereName").textContent = l.name; $("whereSub").textContent = LENS[lens].sub; }
  else if (chapter === "iro") { $("whereName").textContent = N.ch_iro; $("whereSub").textContent = IRO.lang ? LANGS[IRO.lang].name : "あなたの線を引く"; }
  else { $("whereName").textContent = N.ch_toki; $("whereSub").textContent = "同じ庭を、四つの速さで"; }
}
async function setLens(id, silent = false) {
  if (!LENS[id]) return;
  const was = LENS[lens]; if (id === lens && chapter === "umwelt" && !silent) { talkLens(id, true); return; }
  if (chapter !== "umwelt") { setChapter("umwelt", true); }
  await veil(() => {
    if (!was.under) { gardenSave.pos.copy(me.pos); gardenSave.yaw = me.yaw; }
    lens = id; const L = LENS[id];
    if (L.under === "touch") { me.pos.copy(TUN.getPointAt(tunT)); me.pitch = 0; const tg = TUN.getTangentAt(tunT); me.yaw = Math.atan2(-tg.x, -tg.z); }
    else if (L.under === "light") { me.depth = .25; me.pitch = 0; }
    else if (habitat==='forest') {me.pos.set(0,L.eye||1,4);me.yaw=0;me.pitch=-.1;}
    else if (L.spot && !silent) {
      // その生きものの受けとり方がよく分かる場所へ（蜂はヒマワリの前、マムシはネズミの近く…）。向きもそちらへ
      const [x, z, lx, ly, lz] = L.spot; me.pos.set(x, L.eye, z); me.yaw = Math.atan2(-(lx - x), -(lz - z)); me.pitch = Math.atan2(ly - L.eye, Math.hypot(lx - x, lz - z));
    }
    else if (was.under) { me.pos.copy(gardenSave.pos); me.yaw = gardenSave.yaw; me.pos.y = L.eye; }
    else me.pos.y = L.eye;
    me.path = null; applyLens(id);
    for (const b of dial.children) b.setAttribute("aria-pressed", String(b.dataset.id === id));layoutBodyWheel();
    
    setWhere();
  });
  if (!silent) talkLens(id);
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
{
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
  var layerTop = new THREE.Mesh(new THREE.PlaneGeometry(.42, .0005), new THREE.MeshBasicMaterial({ color: 0xffd25a })); layerTop.position.set(0, .5, .1012); bank.add(layerTop);
  bank.position.set(-10.9, 0, 6.4); bank.rotation.y = Math.PI / 2; garden.add(bank);
}
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
  sun.position.copy(SUNDIR).multiplyScalar(40); sun.target.position.set(0, 0, 0);
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
    if (k.id === "bee") { const ang = Math.sin(2 * Math.PI * 230 * s) * .9; bee.userData.L.rotation.z = ang; bee.userData.Rw.rotation.z = -ang; }
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
// 九つの受けとり方をくらべる表（授業でも使えるように）
$("lensTable").innerHTML = S.lens.map(l => `<tr><td>${l.name}</td><td>${LENS[l.id].sub}</td></tr>`).join("");
$("optSound").onchange = e => { if (AUD.master) AUD.master.gain.value = e.target.checked ? 1 : 0; };
$("cred").innerHTML = [
  "碧の声：VOICEVOX:冥鳴ひまり。碧の 3D の姿 © mitsulab。表示の道具：three.js・three-vrm（MIT）。草・花・空・土の絵と音は、この画面の中でその場で作っています（録音は使っていません）。",
  "典拠（くわしくは README と 資料/調べたこと/）：von Uexküll 1934／Nagel 1974／Peitsch ら 1992（蜂の色覚）／von Frisch 1914／Chittka & Waser 1997／Eisner ら 1969・Todesco ら 2022（花の紫外の模様）／Martínez-Harms ら 2020（ヒナゲシ）／Arikawa 2003・Koshitaka ら 2008（アゲハ）／Obara 1970（モンシロチョウ）／Hart 2001（鳥の色覚）／Hunt ら 1998・Andersson ら 1998（アオガラ）／Siitari ら 1999（実の紫外）／Neitz, Geist & Jacobs 1989・Miller & Murphy 1995（犬）／Machado ら 2009（二色型の近似の行列）／Gracheva ら 2010・Hartline ら 1978（ピット）／Griffin 1944・Griffin ら 1960・Greif & Siemers 2010（コウモリ）／Eimer 1871・Catania（モグラ）／Darwin 1881（ミミズ）",
  "言葉と色：Berlin & Kay 1969／Kay ら 2009（World Color Survey）／Winawer ら 2007／Roberson ら 2005／Kuriki ら 2017／佐竹昭広 1955／Regier & Kay 2009。四つの時計：Altshuler ら 2005／FAO 2015。",
].map(t => `<span style="display:block;margin-bottom:8px">${t}</span>`).join("");

// ---------------------------------------------------------------- はじめて押したとき：音を立て、碧がひとこと
let started = false;
function first() {
  if (started) return; started = true; AUD.init();
  A.appear = true; A.intro = true; A.calm = 2.2;
  $("say").textContent = "";
  setTimeout(() => talk(S.intro, [[`はじめる：${S.lens[1].name} ›`, () => { A.intro = false; setLens("hachi"); }, true], ["人の目のまま歩く", () => { A.intro = false; talkLens("hito"); }]]).then(() => { A.intro = false; }), 600);
}

// ---------------------------------------------------------------- 毎フレーム
const clock = new THREE.Clock();
let echo = { t: 9, next: 0, int: 1.6 }, sonT = 0;
const ECHO_V = 20;   // 見せる波面の速さ（m/s）。本当の音の速さ（約 340 m/s）を、ゆっくりにしたもの
let shadowTick = 0;
let lastFrame=0;
function frame(now=0) {
  if(document.hidden||now-lastFrame<33){requestAnimationFrame(frame);return;}lastFrame=now;
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  G.uTime.value = RM ? 0 : t;
  if (mobile && ++shadowTick % 3 === 0) renderer.shadowMap.needsUpdate = true;   // スマホは影の地図の描き直しを 3 こまに 1 回
  moveCam(dt);
  bodyRoot.visible=chapter==='umwelt';
  if(!RM&&habitat==='forest')residents.forEach((b,i)=>{const p=t*(b.userData.kind==='chou'?.4:.6)+b.userData.phase;b.position.set(Math.sin(p)*4+(i%2?4:-3),b.userData.kind==='hebi'?.1:1+Math.sin(p*1.7)*.4,Math.cos(p)*4-3);b.rotation.y=-p;b.userData.animate(t,true);});
  // 生きものの動き
  if (!RM) {
    // 蝶：はばたきながら花のあいだを（モンシロチョウ 2 頭は花壇の上、アゲハはヒナゲシのあたり）
    [...butterflies, ageha].forEach((b, i) => { const ph = t * (b.userData.ageha ? .4 : .55) + b.userData.ph, cx = b.userData.ageha ? 3.4 : 1.6, rx = b.userData.ageha ? 1.1 : 1.4;
      b.position.copy(bed(cx + Math.cos(ph) * rx + Math.sin(ph * 2.3) * .3, .75 + Math.sin(ph * 1.7) * .25, .3 + Math.sin(ph) * 1.0)); b.rotation.y = -ph + BED.ry; const f = Math.sin(t * (b.userData.ageha ? 9 : 13) + i) * .85; b.userData.pl.rotation.z = -f; b.userData.pr.rotation.z = f; });
    moths.forEach(m => { if (!m.visible) return; const ph = t * .8 + m.userData.ph; m.position.set(Math.cos(ph) * 3 + Math.sin(ph * 1.9), 1.8 + Math.sin(ph * 2.2) * .6, -1 + Math.sin(ph * 1.3) * 3); m.rotation.y = ph * 3; m.rotation.x = Math.sin(t * 20 + m.userData.ph) * .5; });
    bird.rotation.y = Math.sin(t * .4) * .5; bird.userData.head.rotation.y = Math.sin(t * 1.3) * .4;
    mouse.position.x = -1.1 + Math.sin(t * .3) * .08;
    if (chapter !== "toki") { const a = Math.sin(t * 40) * .9; bee.userData.L.rotation.z = a; bee.userData.Rw.rotation.z = -a; }
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
    if (quake > 0) { camera.position.y += (Math.random() - .5) * .02 * quake; quake = Math.max(0, quake - dt * 2); }
  }
  $('stage').dataset.lens=lens;$('stage').dataset.habitat=habitat;$('stage').dataset.position=camera.position.toArray().map(v=>v.toFixed(3)).join(',');$('stage').dataset.depth=me.depth.toFixed(3);
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
  if (chapter === "umwelt" && lens === "mogura") { const f = new THREE.Vector3(); camera.getWorldDirection(f); const p = camera.position.clone().addScaledVector(f, .22); G.uTouch.value.set(p.x, p.y, p.z, .62); }
  if (chapter === "umwelt" && lens === "mogura" && AUD.ctx && Math.random() < dt * (SP.playing ? 1.5 : 3)) crackle();
  if (chapter === "umwelt" && lens === "mimizu") { G.uWorm.value = clamp(.85 * Math.exp(-me.depth * 3.2), 0, 1) * (1 - .15 * quake); scene.background.setScalar(Math.pow(G.uWorm.value, 2.2)); }
  under.children.forEach(o => { if (o.userData.base) { o.position.y = Math.sin(t * 1.2 + o.userData.ph) * .01; } });
  // 画面のまん中にあるものを音に（紫外・温かさ）
  sonT -= dt;
  if (AUD.ctx && sonT <= 0) {
    sonT = .2; let uvv = 0, heat = 0;
    if (chapter === "umwelt" && ["hachi", "chou", "tori", "hebi"].includes(lens)) {
      ray.setFromCamera(new THREE.Vector2(0, 0), camera); ray.far = 30; const h = ray.intersectObjects(sonic, false)[0];
      if (h) { const u = h.object.material.userData.u; uvv = u.uUV.value; heat = u.uTemp.value * (1 - clamp((h.distance - 5) / 9, 0, 1)); }
    }
    AUD.set(AUD.uvTone.g, ["hachi", "chou", "tori"].includes(lens) && uvv > .3 ? .05 * uvv : 0);
    lastHeat = lens === "hebi" ? heat : 0;
    AUD.set(AUD.hum.g, lens === "hebi" && heat > .3 ? .18 * heat : 0); AUD.hum.o.frequency.value = 70 + heat * 60;
    if (AUD.wind) AUD.wind.gain.setTargetAtTime(chapter === "umwelt" && !LENS[lens].under && !LENS[lens].night ? .05 : 0, AUD.ctx.currentTime, .5);
  }
  aoiTick(dt);
  if (chapter === "toki") renderToki(); else { renderer.setViewport(0, 0, innerWidth, innerHeight); renderer.render(scene, camera); if (winMode()) renderAoiWindow(); }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- 影と映りこみ（2026-10-09 よりリアルに）
setDay(LIT.base);
garden.traverse(o => { if (!o.isMesh || o === sky || o.userData.noShadow) return; o.receiveShadow = true; o.castShadow = !o.userData.noCast && !(mobile && o.userData.smallCast); });
{ // 空の映りこみ（水面・縁側の床・瓦・石の艶）：いつもの時刻の空と、塀の向こうの木々の暗い帯を、映りこみの地図に焼く
  const env = new THREE.Scene(), sk = new THREE.Mesh(sky.geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); env.add(sk);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 30, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x24301f, side: THREE.BackSide, fog: false })); band.position.y = 4; env.add(band);
  const gnd = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshBasicMaterial({ color: 0x8f8a7c, fog: false })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -1; env.add(gnd);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, .02).texture; pm.dispose();
}

// ---------------------------------------------------------------- はじまり
(async () => {
  me.pos.set(0,1.55,4);prog(20); applyLens("hito"); setWhere(); camera.rotation.set(me.pitch, me.yaw, 0, "YXZ");
  await loadAoi(); prog(100);
  if (vrm) { A.pos.set(0, 0, 3.4); A.yaw = 0; }
  $('bodyForward').onclick=()=>{first();if(lens==='mogura'){tunGoal=(tunT+.08)%1;}else if(lens==='mimizu'){me.depth=clamp(me.depth+.04,0,1.5);}else walkTo(me.pos.x-Math.sin(me.yaw)*1.2,me.pos.z-Math.cos(me.yaw)*1.2);};
  document.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>{me.yaw+=b.dataset.turn==='left'?.3:-.3;});$('bodyBack').onclick=()=>{if(LENS[lens].under){if(lens==='mogura')tunGoal=(tunT-.08+1)%1;else me.depth=clamp(me.depth-.04,.02,1.2);}else walkTo(me.pos.x+Math.sin(me.yaw)*1.2,me.pos.z+Math.cos(me.yaw)*1.2);};
  document.querySelectorAll('[data-habitat]').forEach(b=>b.onclick=()=>{first();setHabitat(b.dataset.habitat);});
  document.querySelectorAll('[data-fly]').forEach(b=>{const key=b.dataset.fly;const release=()=>keys.delete(key);b.onclick=()=>{flightHeight=clamp(flightHeight+(key==='r'?.45:-.45),.25,8);me.pos.y=flightHeight;};b.onpointerdown=e=>{keys.add(key);b.setPointerCapture(e.pointerId);};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;b.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();keys.add(key);}};b.onkeyup=release;b.onblur=release;});
  window.__muBoot = true; $("boot").classList.add("gone"); setTimeout(() => $("boot").hidden = true, 700);
  $("say").textContent = "画面を押すと、碧が案内をはじめます。蜂の受けとり方で、この森を歩いてみませんか。（ひとつ 1〜2 分）";
  setActs([]);
  requestAnimationFrame(frame);
  // 姿は、はじめて押す前から、揺れずにゆっくり現れる
  setTimeout(() => { A.appear = true; A.calm = 2.4; }, 400);
})();
window.__um = {get habitat(){return habitat;},bodies,forest,setHabitat, NAT, renderer, get lens() { return lens; }, get chapter() { return chapter; }, setLens, setChapter, setLang, iroMine, me, A, SP, LENS, G, walkTo, onTap, camera, IRO, get tunT() { return tunT; } };
