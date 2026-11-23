/* touch.js ── Qualia/touch：森で、ものに近づいて触れる（2026-11-23 本人「ものの3dを触るのでなく、木や土や石、苔などリアルなものに近づいて、sightのような空間で触れられるような体験に」）。
   場：Qualia/sight の森（forest.js・nature.js・tex＝CC0 の写真の質感）を写して使う（hear と同じ形）。時刻は昼。
   触れられるもの：ケヤキの幹・石・苔むした倒木・土・落ち葉・杭に結んだ麻縄。表面は Poly Haven の CC0 を実寸 10 cm で貼る（近づいても破綻しない）。
   触れた手ごたえ：haptics.js（振動の刻み・触れた音〈Freesound の CC0〉・STL）をそのまま使う。値はすべて模式。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildForest, SPAWN, MEADOW } from "./forest.js?v=20261123n";
import { photoTex } from "./nature.js?v=20261105s";
import { bitmapTex } from "./kit/warm.js";
import { TouchModel, Vibe, Sonic, SIZE_MM, FORCE_MAX, buildSTL } from "./haptics.js?v=20261105f";
import { SOUNDS } from "./sounds.js?v=20261021";
import { loadGeometry, OBJECTS, baseGeometry } from "./objects.js?v=20261121r";
// 海辺と都市は、Qualia/sight・hear と同じ共通の部品の写し（mitsulab-HP 516ca17 の x/48/kit）。新しい版が出たら kit/shore.js・kit/city.js（と kit/touch_objects.js・tex）を差し替えるだけで入る
import { buildShore, clearForest, shoreX } from "./kit/shore.js?v=20261124s";

const U = { uTime: { value: 0 } };
function prep(m, o = {}) {
  if (o.wind) m.onBeforeCompile = sh => { sh.uniforms.uTime = U.uTime; };
  m.customProgramCacheKey = () => "touch" + m.type + (o.key || "");
  return m;
}
function M(hex, o = {}) {
  const base = { color: hex, map: o.map || null, side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, alphaTest: o.alphaTest || 0, vertexColors: !!o.vc };
  const SPm = { ...base, roughness: o.rough ?? .9, metalness: o.metal ?? 0, envMapIntensity: o.env ?? .7,
    normalMap: o.nmap || null, normalScale: new THREE.Vector2(o.ns ?? 1, o.ns ?? 1), roughnessMap: o.orm || null, aoMap: o.ao || null, aoMapIntensity: o.aoK ?? 1 };
  const m = o.basic ? new THREE.MeshBasicMaterial(base) : o.std && o.phys ? new THREE.MeshPhysicalMaterial({ ...SPm, ...o.phys }) : o.std ? new THREE.MeshStandardMaterial(SPm) : new THREE.MeshLambertMaterial(base);
  if (o.fog === false) m.fog = false; if (o.noTone) m.toneMapped = false;
  return prep(m, o);
}
function tx(file, rx = 1, ry = 1, srgb = true) {
  const t = bitmapTex("tex/" + file, { opaque: !/^leaf_/.test(file) }); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
}
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// 触れられるもの（手ごたえの値は模式。前の Qualia/touch の見本の値をそのまま使う）
export const THINGS = [
  { id: "bark", name: "樹皮", tex: "bark", snd: "bark", p: { hard: .78, rough: .8, depth: 3.5, fric: .7, spring: .15, warm: .65 },
    cue: "ケヤキの古い幹は、うろこのように薄くはがれる。かたく、乾いて、指の腹にひっかかる。" },
  { id: "stone", name: "石", tex: "stone", snd: "stone", p: { hard: .98, rough: .5, depth: 2.5, fric: .5, spring: .02, warm: .12 },
    cue: "かたく、押しても沈まない。木より熱を伝えやすいので、同じ気温でもひんやり感じる。" },
  { id: "moss", name: "苔", tex: "moss", snd: "moss", p: { hard: .25, rough: .35, depth: 1.6, fric: .5, spring: .55, warm: .6 },
    cue: "倒れた木をおおう苔。押すと沈み、ゆっくり戻る。水をふくむと、しっとり重くなる。" },
  { id: "soil", name: "土", tex: "soil", snd: "soil", p: { hard: .22, rough: .55, depth: 3.5, fric: .6, spring: .06, warm: .5 },
    cue: "粒が集まった塊のすき間に、空気と水が入っている。押すと少し沈み、指に粒が残る。" },
  { id: "leaves", name: "落ち葉", tex: "leaves", snd: "leaves", p: { hard: .4, rough: .9, depth: 4, fric: .75, spring: .35, warm: .55 },
    cue: "上の乾いた葉はかさかさと鳴る。下の層ほど湿って、分解が進んでいる。" },
  // 浜（森のはし、川が海へ出る入り江）
  { id: "sand", place: "shore", name: "砂", tex: "sand", snd: "soil", p: { hard: .3, rough: .6, depth: 1.2, fric: .55, spring: .05, warm: .7 },
    cue: "岩や貝のかけらの細かな粒。乾いた砂はさらさらと崩れ、水を含んだ波打ち際は締まってかたい。" },
  { id: "shell", place: "shore", name: "貝殻", h: "shell", snd: "stone", direct: true, p: { hard: .95, rough: .45, depth: 1.0, fric: .4, spring: .02, warm: .2 },
    cue: "二枚貝の殻。外側の放射の筋を、指がひとつずつ越えていく。殻は炭酸カルシウムで、かたく、うすい。" },
  { id: "isorock", place: "shore", name: "磯の岩", tex: "stone", snd: "stone", p: { hard: .98, rough: .55, depth: 2.5, fric: .45, spring: .02, warm: .15 },
    cue: "波に洗われる岩。濡れた所はすべりやすく、くぼみに海の水が残る。" },
  { id: "drift", place: "shore", name: "流木", tex: "drift", snd: "wood", noray: true, direct: true, p: { hard: .55, rough: .3, depth: 1.0, fric: .4, spring: .1, warm: .72 },
    cue: "海を漂ってきた木。波と砂に磨かれて角がとれ、日に晒されて白っぽくなる。" },
  // 都市（駅前の大通りの模式）
  { id: "rope", place: "city", name: "結び目", h: "cloth", snd: "cloth", direct: true, p: { hard: .45, rough: .6, depth: 2.2, fric: .65, spring: .25, warm: .75 },
    cue: "歩道に落ちていた麻縄のひと結び。三本の撚りの溝を、指がたどっていく。結び目で、縄が重なる。" },
  { id: "street", place: "city", name: "街路樹", tex: "bark", snd: "bark", p: { hard: .78, rough: .75, depth: 3, fric: .65, spring: .12, warm: .6 },
    cue: "歩道のケヤキの幹。森の木と同じ樹皮が、車の音と排気のそばで育っている。日なたの側は、かわいて温かい。" },
  { id: "pave", place: "city", name: "敷石", tex: "pave", snd: "stone", p: { hard: .95, rough: .55, depth: 1.5, fric: .6, spring: .02, warm: .35 },
    cue: "歩道の敷石。目地の溝で指が止まる。日の当たる石は、昼のあいだに温まっていく。" },
];

// 碧の 3D は Qualia/sight と同じ物を読む（先に sight・hear を開いた人はブラウザの控えから）。手元ではこのフォルダの写し
const AOI_BUF = (() => { let p = null; return () => p || (p = fetch("../02/assets/aoi/aoi.vrm").then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).catch(() => fetch("assets/aoi/aoi.vrm").then(r => r.arrayBuffer()))); })();
export function start(canvas, ui) {
  AOI_BUF();   // 森を組むあいだに読み始める
  const mobile = matchMedia("(max-width:760px)").matches;
  const R = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const S = new THREE.Scene(); const FOG = new THREE.Color("#b4c2bd");
  S.background = FOG.clone(); S.fog = new THREE.FogExp2(FOG.clone(), mobile ? .026 : .022);
  const cam = new THREE.PerspectiveCamera(60, 1, .02, 300);
  // 昼の空
  const skyG = new THREE.SphereGeometry(200, 32, 16), col = [], p = skyG.attributes.position, c = new THREE.Color(), top = new THREE.Color("#7fa6cc"), mid = new THREE.Color("#c3d3d9"), low = new THREE.Color("#e3e4da");
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 200; if (y > .2) c.copy(mid).lerp(top, Math.min(1, (y - .2) / .6)); else c.copy(low).lerp(mid, Math.max(0, (y + .05) / .25)); col.push(c.r, c.g, c.b); }
  skyG.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  S.add(new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
  S.add(new THREE.HemisphereLight("#e9f0f0", "#5c4c3a", 1.15));
  const sun = new THREE.DirectionalLight("#fff0da", 2.3); sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 120 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
  sun.target.position.set(SPAWN.x, 0, SPAWN.z - 3); sun.position.set(SPAWN.x - 22, 34, SPAWN.z - 14); S.add(sun, sun.target);
  // 森（sight と同じ）
  const forest = new THREE.Group(); S.add(forest); const pick = [], sonic = [];
  const riverCurve = new THREE.CatmullRomCurve3([[-8, -7], [-5, -13], [1, -15], [9, -12], [18, -7], [30, -2], [44, 4]].map(([x, z]) => new THREE.Vector3(x, .035, z)));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.8, 72), M(0x3a584a, { std: true, rough: .09, metal: .42, env: 1.3 })); pool.rotation.x = -Math.PI / 2; pool.position.set(-8, .025, -7); forest.add(pool);
  const FOREST = buildForest({ M, tx, canvasTex, photoTex, forest, pick, sonic, mobile, riverCurve });
  forest.traverse(o => { if (!o.isMesh) return; o.receiveShadow = true; let nc = false; for (let q = o; q; q = q.parent) if (q.userData.noCast) nc = true; o.castShadow = !nc && !(mobile && o.isInstancedMesh && o.count > 300); });
  { const env = new THREE.Scene(); env.add(new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 30, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x3a4a30, side: THREE.BackSide, fog: false })); band.position.y = 4; env.add(band);
    const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(env, .02).texture; pm.dispose(); }
  // 自分で置く物の入れ物（海辺の部品が林のはしの木を畳むとき、ここは畳まない）
  const mine = new THREE.Group(); mine.userData.keep = true; forest.add(mine);
  const city = new THREE.Group(); city.visible = false; S.add(city); const cityMine = new THREE.Group(); city.add(cityMine);
  let SHORE = null, CITY = null, cityP = null, place = "forest";
  try { clearForest(forest, FOREST.trunks, [FOREST.ground, mine]);
    const add0 = forest.add.bind(forest); forest.add = (...a) => { add0(...a); try { clearForest(forest, FOREST.trunks, [FOREST.ground, mine, aoi].filter(Boolean), a); } catch { } return forest; };
    SHORE = buildShore({ M, tx, canvasTex, group: forest, pick, sonic, mobile }); SHORE.root.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  } catch (e) { console.warn("海辺", e?.message ?? e); }
  (async () => { for (const job of FOREST.later || []) { await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); const g = job(); g.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = !mobile; } }); forest.add(g); } })();

  // 立つ所と向き：森の踏み跡から、草地の方を見る
  const eye = new THREE.Vector3(SPAWN.x, 1.55, SPAWN.z), look0 = new THREE.Vector3(MEADOW.x - 1.5, 1.2, MEADOW.z);
  let yaw = Math.atan2(-(look0.x - eye.x), -(look0.z - eye.z)), pitch = -.12;
  const fw = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), rt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const at = (f, r) => eye.clone().setY(0).addScaledVector(fw, f).addScaledVector(rt, r);
  cam.position.copy(eye); cam.rotation.order = "YXZ";

  // ---- 触れられるもの（実寸 10 cm の質感＝1 枚が 10 cm）
  const T = {}, items = [];
  // 10 cm の切り出しはつなぎ目のない模様ではないので、遠くの面は折り返し（鏡映）で貼り、近づいた所には 10 cm を一枚だけ重ねる（下の near）
  const mir = t => { t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; return t; };
  const mat = (th, rx, ry, o0 = {}) => { const { disp, wrap, ...o } = o0;
    const t = th.tex, k = (f, srgb) => { const x = mir(tx(`${t}_${f}.webp`, rx, ry, srgb)); if (wrap) x.wrapS = x.wrapT = wrap; return x; };
    const m = new THREE.MeshStandardMaterial({ map: k("c", true), normalMap: k("n", false), roughnessMap: k("r", false), roughness: 1, metalness: 0, envMapIntensity: .55,
      color: th.tint ? new THREE.Color(...th.tint) : new THREE.Color(1, 1, 1), ...o });
    if (disp) { m.displacementMap = k("h", false); m.displacementScale = disp; m.displacementBias = 0; }
    return m;
  };
  const edge = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, w * .18, w / 2, h / 2, w * .5); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
  const add = (id, mesh, aim, n, grp = mine) => { const th = THINGS.find(x => x.id === id); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.thing = th; grp.add(mesh); items.push(mesh);
    T[id] = { th, mesh, aim, n: n.normalize(), rep: mesh.userData.rep }; };
  // ケヤキの幹（左手前）。上は樹冠の中へ
  { const P = at(3.4, -1.7), r0 = .34, g = new THREE.CylinderGeometry(r0 * .62, r0, 12, mobile ? 48 : 72, mobile ? 60 : 110, true); g.translate(0, 6, 0);
    const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x), k = 1 + .05 * Math.sin(a * 5 + y * .7) + .03 * Math.sin(a * 11 - y * 1.9) + (y < .6 ? (.6 - y) * .35 * (.6 + .4 * Math.sin(a * 4)) : 0); pa.setXYZ(i, x * k, y, z * k); }
    g.computeVertexNormals(); const rep = [2, 12]; const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xd8d2c8, map: photoTex("bark_zelkova.webp", 4, 24), normalMap: tx("bark_zelkova_n.webp", 4, 24, false), roughnessMap: tx("bark_zelkova_orm.webp", 4, 24, false), roughness: 1, envMapIntensity: .35 })); m.position.copy(P); m.userData.rep = rep;
    const toE = eye.clone().setY(0).sub(P).normalize(); add("bark", m, P.clone().addScaledVector(toE, r0 * 1.02).setY(1.25), toE.clone()); }
  // 石（右手前、草地へ向かう縁）
  { const g = baseGeometry("stone"); g.scale(1.5, 1.5, 1.5); g.computeBoundingBox(); const P = at(2.9, 1.5); const rep = [30, 15];
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xe2ddd2, map: photoTex("rock_surface.webp", 8, 4), normalMap: tx("rock_surface_n.webp", 8, 4, false), normalScale: new THREE.Vector2(1.6, 1.6), roughness: .93, envMapIntensity: .35 })); m.position.set(P.x, -.06, P.z); m.rotation.y = .7; m.userData.rep = rep;
    m.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(m), toE = eye.clone().setY(0).sub(P).normalize();
    add("stone", m, new THREE.Vector3(P.x, b.max.y * .82, P.z).addScaledVector(toE, .3), toE.clone().multiplyScalar(.6).add(new THREE.Vector3(0, .8, 0))); }
  // 苔むした倒木（まん中の奥）
  { const L = 2.6, r = .24, g = new THREE.CylinderGeometry(r * .85, r, L, mobile ? 40 : 64, mobile ? 30 : 48, false); g.rotateZ(Math.PI / 2);
    const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); const k = 1 + .06 * Math.sin(x * 3.1 + Math.atan2(z, y) * 3) + (y > 0 ? .05 : 0); pa.setXYZ(i, x, y * k, z * k); }
    g.computeVertexNormals(); const rep = [Math.round(2 * Math.PI * r / .3), Math.round(L / .3)]; const P = at(4.6, .1);
    const m = new THREE.Mesh(g, mat(THINGS[2], rep[0], rep[1])); m.position.set(P.x, r * .82, P.z); m.rotation.y = yaw + .35; m.userData.rep = rep;
    add("moss", m, new THREE.Vector3(P.x, r * 1.75, P.z), new THREE.Vector3(0, 1, 0).addScaledVector(eye.clone().setY(0).sub(P).normalize(), .7)); }
  // 土と落ち葉（足もとの円い所。縁は地面へなじませる）
  const patch = (id, f, r, rad) => { const P = at(f, r), rep = [Math.round(rad * 4) + .5, Math.round(rad * 4) + .5]   /* まん中（寄る所）に模様の継ぎ目が来ないよう半端に */, g = new THREE.CircleGeometry(rad, 64); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat(THINGS.find(x => x.id === id), rep[0], rep[1], { wrap: THREE.RepeatWrapping, transparent: true, alphaMap: edge, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.material.alphaMap.repeat.set(1, 1); m.position.set(P.x, .012, P.z); m.userData.rep = rep; m.renderOrder = 1; add(id, m, new THREE.Vector3(P.x, .012, P.z), new THREE.Vector3(0, 1, 0).addScaledVector(eye.clone().setY(0).sub(P).normalize(), .9)); };
  patch("soil", 2.0, -.35, .5); patch("leaves", 2.2, .75, .6);
  // 麻縄の繊維：撚りに沿った細い繊維の筋と、ところどころの毛羽（その場で描く。色は麻の生成り）
  function ropeMat() { const fib = (g, w, h, bump) => { g.fillStyle = bump ? "#808080" : "#a88a56"; g.fillRect(0, 0, w, h); let sd = 7; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 2600; i++) { const x = rn() * w, y = rn() * h, L = 10 + rn() * 34, a = -1.05 + (rn() - .5) * .25, l = rn(); g.strokeStyle = bump ? `rgba(${l > .5 ? 255 : 0},${l > .5 ? 255 : 0},${l > .5 ? 255 : 0},${.18 + rn() * .3})` : `rgba(${150 + l * 90 | 0},${118 + l * 70 | 0},${70 + l * 45 | 0},${.35 + rn() * .4})`; g.lineWidth = .6 + rn() * 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
      for (let i = 0; i < 160; i++) { const x = rn() * w, y = rn() * h; g.strokeStyle = bump ? "rgba(255,255,255,.5)" : "rgba(235,215,170,.55)"; g.lineWidth = .5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (rn() - .5) * 14, y - 6, x + (rn() - .5) * 20, y - 10 - rn() * 8); g.stroke(); } };
    const set = t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 1.5); t.anisotropy = 8; return t; };
    return new THREE.MeshStandardMaterial({ map: set(canvasTex(512, 512, (g, w, h) => fib(g, w, h, false))), bumpMap: set(canvasTex(512, 512, (g, w, h) => fib(g, w, h, true), false)), bumpScale: 4, roughness: .95, envMapIntensity: .3 }); }
  // ---- 浜：森のはしの砂浜に立ち、海の方を見る（砂・貝殻・流木・磯の岩）
  const SP = {}; SP.forest = { eye: eye.clone(), yaw, pitch };
  { const z0 = 5.5, x0 = shoreX(z0) - 6.2; SP.shore = { eye: new THREE.Vector3(x0, 1.55, z0), yaw: -Math.PI / 2 - .12, pitch: -.2 } }
  { const G = SHORE?.grass, e = SP.shore.eye; if (G) { const m4 = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < G.count; i++) { G.getMatrixAt(i, m4); if (Math.hypot(m4.elements[12] - e.x, m4.elements[14] - e.z) < 3.2) G.setMatrixAt(i, Z); } G.instanceMatrix.needsUpdate = true; } }   // 2026-11-23 夜：目の前の草を抜く（太い黒い線が字に重ならない）
  const sandY = (x, z) => { const d = shoreX(z) - x; return d > 0 ? .03 + Math.min(.25, d * .025) * Math.min(1, (x - 30) / 8) : .03 + d * .045; };   // kit/shore.js の砂と同じ高さ（2026-11-23 夜 水ぎわに段なし）
  const sAt = (f, r) => { const e = SP.shore.eye, yw = SP.shore.yaw, F = new THREE.Vector3(-Math.sin(yw), 0, -Math.cos(yw)), Rt = new THREE.Vector3(Math.cos(yw), 0, -Math.sin(yw)); const P = e.clone().setY(0).addScaledVector(F, f).addScaledVector(Rt, r); P.y = sandY(P.x, P.z); return P; };
  const toward = (P, E) => E.clone().setY(0).sub(P.clone().setY(0)).normalize();
  { const P = sAt(2.0, -.3), rad = .55, rep = [Math.round(rad * 4) + .5, Math.round(rad * 4) + .5], g = new THREE.CircleGeometry(rad, 64); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat(THINGS.find(x => x.id === "sand"), rep[0], rep[1], { wrap: THREE.RepeatWrapping, transparent: true, alphaMap: edge, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(P.x, P.y + .02, P.z); m.userData.rep = rep; m.renderOrder = 2; add("sand", m, new THREE.Vector3(P.x, P.y + .02, P.z), new THREE.Vector3(0, 1, 0).addScaledVector(toward(P, SP.shore.eye), .9)); }
  // 貝殻：二枚貝（ホタテのなかまの片方の殻）。蝶番の両わきに耳、そこから扇形に放射の筋。実物の大きさ 約 6 cm。この場でつくる形
  function scallop() { const nu = 48, nv = 192, pos = [], uv = [], idx = [], A = 1.25;
    for (let j = 0; j <= nu; j++) for (let i = 0; i <= nv; i++) { const u = j / nu, v = i / nv, a = (v * 2 - 1) * A, r = .1 + .9 * u, rib = .028 * Math.max(0, Math.cos(a * 21)) ** .6 * u;
      const y = .55 * Math.sin(Math.PI * .5 * Math.min(1, u * 1.25)) * Math.cos(a * .75) * (1 - .25 * u) + rib;
      pos.push(Math.sin(a) * r, y, Math.cos(a) * r - .5); uv.push(v * 3, u); }
    for (let j = 0; j < nu; j++) for (let i = 0; i < nv; i++) { const a = j * (nv + 1) + i, b = a + 1, c = a + nv + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const o = pos.length / 3; [[-1], [1]].forEach(([sg]) => { const b0 = pos.length / 3; [[0, .02, -.48], [sg * .34, .015, -.46], [sg * .3, .03, -.34], [sg * .02, .06, -.36]].forEach(p => { pos.push(...p); uv.push(.5, 0); }); idx.push(...(sg > 0 ? [b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3] : [b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2])); }); void o;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }
  { const P = sAt(2.6, .75), g = scallop(), s = .06; const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: canvasTex(256, 64, (c, w, h) => { const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, "#efe3cf"); g.addColorStop(.55, "#dcb79a"); g.addColorStop(1, "#b9876a"); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(150,90,70,${.12 + .1 * (i % 2)})`; c.fillRect(0, h * (.15 + i * .09), w, 2); } }), roughness: .45, clearcoat: .35, clearcoatRoughness: .5, envMapIntensity: .6, side: THREE.DoubleSide })   /* 殻：蝶番から縁へ色の帯（成長線）・内側はつや */);
    m.scale.setScalar(s); m.position.set(P.x, P.y + .022, P.z); m.rotation.y = .6; m.userData.rep = [1, 1];
    const g2 = scallop(); const m2 = new THREE.Mesh(g2, m.material); m2.scale.setScalar(s * .8); m2.position.set(P.x + .22, P.y + .02, P.z - .15); m2.rotation.set(.1, 2.1, 0); m2.castShadow = true; mine.add(m2);
    add("shell", m, new THREE.Vector3(P.x, P.y + .045, P.z), new THREE.Vector3(0, 1, 0).addScaledVector(toward(P, SP.shore.eye), .8)); }
  // 流木（白っぽく角のとれた枝。長さ 約 1.6 m）
  { const P = sAt(2.4, -1.5), L = 1.6, r = .085, pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new THREE.Vector3(-L / 2 + u * L, r * .8 + Math.sin(u * 3.1) * .03, Math.sin(u * 4.2) * .09)); }
    const crv = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(crv, 120, r, 48, false), pa = g.attributes.position, guv = g.attributes.uv, q = new THREE.Vector3(), w = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) { const u = guv.getX(i), a = guv.getY(i) * Math.PI * 2; crv.getPointAt(u, q); w.fromBufferAttribute(pa, i).sub(q);   // 太さのむら・両はしは折れて細る・ところどころの節のふくらみ・乾いて割れた筋
      const k = (.75 + .25 * Math.sin(u * 9.3) * Math.sin(u * 3.7 + 1)) * Math.min(1, .35 + u * 5, .35 + (1 - u) * 5) * (1 + .22 * Math.exp(-((u - .62) ** 2) / .002));
      pa.setXYZ(i, q.x + w.x * k, q.y + w.y * k, q.z + w.z * k); } g.computeVertexNormals();
    { const b0 = crv.getPointAt(.62), dir = new THREE.Vector3(.35, .55, -.75).normalize(), bp = [b0.clone(), b0.clone().addScaledVector(dir, .12), b0.clone().addScaledVector(dir, .22).add(new THREE.Vector3(0, -.03, 0))], sg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 12, r * .45, 12, false);   // 折れた枝の付け根
      const sp_ = sg.attributes.position, su = sg.attributes.uv; for (let i = 0; i < sp_.count; i++) { const u = su.getX(i), k = 1 - .55 * u; const c0 = new THREE.CatmullRomCurve3(bp).getPointAt(u); sp_.setXYZ(i, c0.x + (sp_.getX(i) - c0.x) * k, c0.y + (sp_.getY(i) - c0.y) * k, c0.z + (sp_.getZ(i) - c0.z) * k); }
      g.copy(mergeGeometries([g.index ? g.toNonIndexed() : g, sg.index ? sg.toNonIndexed() : sg])); g.computeVertexNormals(); }
    const rep = [1.5, 3], m = new THREE.Mesh(g, mat(THINGS.find(x => x.id === "drift"), rep[1], rep[0], { normalScale: new THREE.Vector2(1.8, 1.8) }));   /* 2026-11-24：木目と乾いた割れが見える大きさに（前は 16×6 回くり返してのっぺり） */
    m.position.set(P.x, P.y, P.z); m.rotation.y = .9; m.userData.rep = [rep[1], rep[0]];
    m.updateMatrixWorld(true); const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
    add("drift", m, new THREE.Vector3(c.x, P.y + r * 1.7, c.z), new THREE.Vector3(0, 1, 0).addScaledVector(toward(P, SP.shore.eye), .9)); void pa; }
  // 磯の岩（波打ち際）
  { const P = sAt(5.6, -.9), g = baseGeometry("stone");   /* 碧の立つ所（スマホ 4.6・.7／PC 3.2・2.2）と重ならない、左奥 */ g.scale(1.25, 1.1, 1.25);   // 波に削られた角ばった面と、ごつごつした割れ目
    { const pa = g.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); const f = 1 + .12 * Math.round(Math.sin(v.x * 7.1 + v.z * 3.3) * 2.2) / 2.2 + .05 * Math.sin(v.y * 23 + v.x * 11) * Math.sin(v.z * 19) - .08 * Math.max(0, Math.sin(v.x * 4 - v.z * 6 + 1) ) ** 6; pa.setXYZ(i, v.x * f, v.y * (.9 + .1 * f), v.z * f); } g.computeVertexNormals(); } const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xa9a59c, map: photoTex("rock_surface.webp", 3, 1.5), normalMap: tx("rock_surface_n.webp", 3, 1.5, false), normalScale: new THREE.Vector2(1.6, 1.6), roughness: .55, envMapIntensity: .6 }));
    m.position.set(P.x, P.y - .26, P.z); m.rotation.y = 1.9; /* 2026-11-23 夜：砂に沈めて浮かせない・スマホで右端に切れない位置へ */ m.userData.rep = [30, 15]; m.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(m), tE = toward(P, SP.shore.eye);
    add("isorock", m, new THREE.Vector3(P.x, b.max.y * .8 + (P.y - .26) * .2, P.z).addScaledVector(tE, .28), tE.clone().multiplyScalar(.6).add(new THREE.Vector3(0, .8, 0))); }

  // ---- 手ごたえ（haptics.js）
  const model = new TouchModel(), vibe = new Vibe(), snd = new Sonic(SOUNDS); snd.lag = vibe.ok ? .012 : 0;
  vibe.onPulse = (ms, amp) => { snd.grain(ms, amp, model.speed); tip.a = Math.min(1, tip.a + .5 * amp + .2); };
  const HM = new Map(); const hgt = id => { if (HM.has(id)) return HM.get(id); const pr = new Promise((ok, ng) => { const im = new Image(); im.onload = () => { const n = 256, cv = document.createElement("canvas"); cv.width = cv.height = n; const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0, n, n); const d = g.getImageData(0, 0, n, n).data, h = new Float32Array(n * n); for (let i = 0; i < n * n; i++) h[i] = d[i * 4] / 255; ok({ h, n }); }; im.onerror = ng; im.src = `tex/${id}_h.webp`; }); HM.set(id, pr); return pr; };
  let H = { h: new Float32Array(4), n: 2 };
  const heightAt = (xmm, ymm) => { const n = H.n, w = v => ((v % n) + n) % n, fx = w(xmm / SIZE_MM * n), fy = w(ymm / SIZE_MM * n), x = fx | 0, y = fy | 0, tx_ = fx - x, ty = fy - y, x1 = (x + 1) % n, y1 = (y + 1) % n, h = H.h;
    return (h[y * n + x] * (1 - tx_) + h[y * n + x1] * tx_) * (1 - ty) + (h[y1 * n + x] * (1 - tx_) + h[y1 * n + x1] * tx_) * ty; };
  let cur = null;   // いま近づいているもの
  function setThing(id) { const th = T[id].th; cur = T[id]; snd.setMaterial(th.snd); snd.setSurface(th.p); model.setSurface(heightAt, th.p); hgt(th.h || th.tex).then(v => { if (cur && cur.th === th) H = v; }); if (snd.ctx) snd.prefetch(); }
  // 近づいた所に重ねる、実寸 10 cm の一枚（縁は消えるように。凹凸は面を少し押し出す）
  const nearM = new Map(), nearG0 = new THREE.PlaneGeometry(.11, .11, mobile ? 80 : 128, mobile ? 80 : 128);
  const nearMesh = new THREE.Mesh(nearG0, new THREE.MeshBasicMaterial()); nearMesh.visible = false; nearMesh.userData.rep = [1, 1]; nearMesh.renderOrder = 10; nearMesh.receiveShadow = true; S.add(nearMesh);
  const bent = new Map(); let bigG = null; const nearUnder = () => nearMesh.userData.under ? (bigG || (bigG = new THREE.PlaneGeometry(.22, .22, 96, 96))) : nearG0;   // 貝殻の下の砂は、殻のまわりまで広く
  function showNear(th, P, N) { if (false) { th = THINGS.find(x => x.id === "sand"); P = P.clone(); P.y = sandY(P.x, P.z) + .006; N = new THREE.Vector3(0, 1, 0); nearMesh.userData.under = true; } else nearMesh.userData.under = false;
    if (th.direct) { nearMesh.visible = false; return; }
    if (!nearM.has(th.id)) nearM.set(th.id, mat(th, 1, 1, { wrap: THREE.RepeatWrapping, transparent: true, alphaMap: edge, disp: th.id === "stone" ? .004 : .005, polygonOffset: true, polygonOffsetFactor: -4, depthTest: !(th.id === "soil" || th.id === "leaves") }));   // 地面に寄ったとき、草の葉がレンズの前に突き抜けないよう、寄った一枚を手前に描く
    nearMesh.material = nearM.get(th.id);
    if (th.id === "bark" || th.id === "street") { const rr = th.id === "street" ? .2 : .34, kk = "b" + rr; if (!bent.has(kk)) { const g = nearG0.clone(), pa = g.attributes.position, r = rr; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setZ(i, -(r - Math.sqrt(r * r - x * x))); } g.computeVertexNormals(); bent.set(kk, g); } nearMesh.geometry = bent.get(kk); } else nearMesh.geometry = nearUnder();
    nearMesh.position.copy(P).addScaledVector(N, .005); const up = Math.abs(N.y) > .9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    nearMesh.up.copy(up); nearMesh.lookAt(P.clone().add(N)); nearMesh.visible = true; }
  // 顔を寄せたとき、手もとがわずかに明るく見えるよう、目の前に弱い光（近づいたときだけ）
  const fill = new THREE.PointLight("#fff4e6", 0, 1.2, 2); S.add(fill);
  const tgt = () => cur && cur.th.direct ? cur.mesh : nearMesh;
  // 指の下の光（強さで明るく）
  const tip = new THREE.Mesh(new THREE.RingGeometry(.006, .009, 40), new THREE.MeshBasicMaterial({ color: "#eaf7fa", transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false })); tip.a = 0; tip.renderOrder = 5; S.add(tip);

  // ---- 動き：歩く・近づく・はなれる
  let mode = "walk", tw = null; const qWalk = new THREE.Quaternion(), qTmp = new THREE.Quaternion(), e3 = new THREE.Euler(0, 0, 0, "YXZ"), base = eye.clone();
  const walkQ = () => qWalk.setFromEuler(e3.set(pitch, yaw, 0));
  function glide(toPos, toQ, dur, done) { tw = { p0: cam.position.clone(), q0: cam.quaternion.clone(), p1: toPos, q1: toQ, t: 0, dur, done }; }
  function approach(id, P, N) {
    const it = T[id]; if (!it) return; setThing(id); clutter(true); cam.near = .02; cam.updateProjectionMatrix();
    if (!P && !it.th.direct && !it.th.noray) { const o = base.clone(), h = new THREE.Raycaster(o, it.aim.clone().sub(o).normalize(), 0, 30).intersectObject(it.mesh, false)[0]; if (h) { P = h.point.clone(); N = worldN(h); if (N.dot(o.clone().sub(P)) < 0) N.negate(); } }   // 名前から近づくとき：今いる所から見える、ほんとうの表面の一点へ
    const free = !!N; const sp = SP[it.th.place || "forest"]; if (sp && !free) base.copy(sp.eye); P = P || it.aim; N = (N || it.n).clone().normalize(); if (free && N.dot(cam.position.clone().sub(P)) < 0) N.negate();   // 決まった向き（名前から）は、いまのカメラの位置で裏返さない
    const d = it.th.id === "rope" ? (innerWidth / innerHeight < .8 ? .3 : .2) : it.th.id === "shell" ? .17 : /^(soil|leaves|sand)$/.test(it.th.id) ? .115 : .125, pos = P.clone().addScaledVector(N, d); pos.y = Math.max(.12, pos.y);
    const upv = Math.abs(N.y) > .92 ? P.clone().sub(base).setY(0).normalize() : new THREE.Vector3(0, 1, 0);   // 真上から見下ろすときは、来た向きを画面の上に（向きが定まらず空を向くのを防ぐ）
    const m = new THREE.Matrix4().lookAt(pos, P, upv), q = new THREE.Quaternion().setFromRotationMatrix(m);
    mode = "going"; ui.mode?.("going", it.th); glide(pos, q, 1.1, () => { mode = "near"; cam.near = d * (it.th.direct ? .3 : .7); cam.updateProjectionMatrix(); if (/^(soil|leaves|sand)$/.test(it.th.id)) clutter(false); ui.mode?.("near", it.th); });   // 寄ったら、目とものの間にある草の葉などは写さない
    aoiLook = P.clone(); showNear(it.th, P, N);
  }
  // 地面に顔を寄せたとき、目の前に立つ草や散った葉の板が画面を横切らないよう、そのあいだだけ森の小さな草花を消す（寄った面と幹・石は残す）
  const hidden = []; function clutter(on) { if (on) { for (const o of hidden) o.visible = true; hidden.length = 0; return; }
    forest.traverse(o => { if (o.isInstancedMesh && o.visible && !items.includes(o)) { o.visible = false; hidden.push(o); } }); }
  function leave() { clutter(true); cam.near = .02; cam.updateProjectionMatrix(); walkQ(); mode = "going"; ui.mode?.("going", null); glide(base.clone(), qWalk.clone(), .9, () => { mode = "walk"; cur = null; ui.mode?.("walk", null); }); aoiLook = null; nearMesh.visible = false; }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hitAt = (e, list) => { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.intersectObjects(list, false)[0]; };
  const worldN = h => h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
  // 指の動き
  let down = null, lastUV = null, lastMove = 0, held = false, force = 0;
  canvas.addEventListener("pointerdown", e => { canvas.setPointerCapture?.(e.pointerId);
    down = { x: e.clientX, y: e.clientY, yaw, pitch, t: performance.now(), moved: false };
    if (mode === "near") { const h = hitAt(e, [tgt()]); snd.wake(); vibe.arm();
      if (h) { held = true; lastUV = uvmm(h); lastMove = performance.now(); snd.tap(); vibe.tap(); placeTip(h); model.takeEdges(); ui.touch?.(true); } } });
  addEventListener("pointermove", e => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 8) down.moved = true;
    if (mode === "walk") { yaw = down.yaw - dx * .004; pitch = Math.max(-.6, Math.min(.5, down.pitch + dy * .003)); return; }
    if (mode === "near" && held) { const h = hitAt(e, [tgt()]); if (!h) return; const uv = uvmm(h), now = performance.now(), dt = Math.max(4, now - lastMove);
      let ax = uv[0], ay = uv[1]; if (lastUV) { const W = SIZE_MM; if (ax - lastUV[0] > W / 2) ax -= W; if (lastUV[0] - ax > W / 2) ax += W; if (ay - lastUV[1] > W / 2) ay -= W; if (lastUV[1] - ay > W / 2) ay += W; model.move(lastUV[0], lastUV[1], ax, ay, dt); }
      lastUV = uv; lastMove = now; placeTip(h); } });
  addEventListener("pointerup", e => { const d = down; down = null; if (held) { held = false; ui.touch?.(false); } lastUV = null; if (!d) return;
    if (d.moved || performance.now() - d.t > 500) return;
    if (mode === "walk") { const h = hitAt(e, items.filter(o => (place === "city") === (o.userData.thing.place === "city")).concat(place === "city" ? (CITY?.ground ? [CITY.ground] : []) : [FOREST.ground, ...(SHORE?.root ? SHORE.root.children.filter(o => o.isMesh).slice(0, 1) : [])]).filter(Boolean)); if (!h) return; const th = h.object.userData.thing;
      if (th) { if (h.distance < 7) approach(th.id, h.point.clone(), worldN(h)); else stepTo(h.point); } else stepTo(h.point); }
    else if (mode === "near") { const h = hitAt(e, [tgt()]); if (!h) leave(); } });
  const uvmm = h => { const r = h.object.userData.rep || [1, 1], u = h.uv ? h.uv.x * r[0] : 0, v = h.uv ? h.uv.y * r[1] : 0; return [(u - Math.floor(u)) * SIZE_MM, (1 - (v - Math.floor(v))) * SIZE_MM]; };
  const placeTip = h => { const N = worldN(h); tip.position.copy(h.point).addScaledVector(N, .003); tip.lookAt(h.point.clone().add(N)); };
  // 地面を押す＝その方へ数歩（遠くても 3 m まで。触れられるものの近くから離れすぎない）
  function stepTo(P) { const to = P.clone().setY(1.55), d = to.clone().sub(cam.position).setY(0); if (d.length() > 3) to.copy(cam.position).addScaledVector(d.normalize(), 3).setY(1.55);
    const c0 = (SP[place] || SP.forest).eye; if (to.clone().sub(c0).setY(0).length() > 5) return; if (place !== "city" && FOREST.blocked?.(to.x, to.z, .4)) return; if (place === "city" && CITY?.blocked?.(to.x, to.z, .3, true)) return; base.copy(to); walkQ(); mode = "going"; glide(to, qWalk.clone(), .8, () => { mode = "walk"; }); }

  // ---- 碧（sight と同じ 3D・AoiMotion。森と操作を先に出し、組み終えてから場面に入れる＝透けて出ない）
  let AM = null, aoi = null, aoiLook = null; const AOI_H = 1.62, RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(async () => { try {
    const [buf, { GLTFLoader }, { MeshoptDecoder }, V, { AoiMotion }] = await Promise.all([AOI_BUF(), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js"), import("@pixiv/three-vrm"), import("./kit/aoi_motion.js")]);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); loader.register(p => new V.VRMLoaderPlugin(p));
    const g = await loader.parseAsync(buf, ""), v = g.userData.vrm;
    V.VRMUtils.removeUnnecessaryVertices(g.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(g.scene); V.VRMUtils.rotateVRM0(v);
    v.scene.traverse(o => { o.frustumCulled = false; if (o.isMesh) o.castShadow = true; });
    aoi = new THREE.Group(); aoi.add(v.scene);
    v.humanoid.resetNormalizedPose(); v.update(0); v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(v.scene), h = box.max.y - box.min.y, sc = h > .5 ? AOI_H / h : 1; v.scene.scale.setScalar(sc); v.scene.position.y = -box.min.y * sc;
    aoi.traverse(o => { if (o.isMesh) { o.material = [].concat(o.material).map(m => { const n = new THREE.MeshStandardMaterial({ map: m.map || null, color: m.color?.clone() || new THREE.Color(0xffffff), side: m.side, transparent: m.transparent, alphaTest: m.alphaTest || 0, roughness: .85 }); n.name = m.name;
      if (/SKIN/i.test(m.name)) { n.emissiveMap = m.map; n.emissive = new THREE.Color(.22, .18, .17); n.roughness = .7; } else if (/EYE|FACE/i.test(m.name)) { n.emissiveMap = m.map; n.emissive = new THREE.Color(.4, .4, .4); } else if (/HAIR/i.test(m.name)) n.roughness = .62; return n; }); if (o.material.length === 1) o.material = o.material[0]; } });
    // 立つ所：石のさらに右、草地の縁（スマホは画面のまん中寄り・字幕にかからない奥）
    const nar = innerWidth / innerHeight < .8, P = at(nar ? 6.2 : 4.4, nar ? .9 : 2.6);
    aoi.position.copy(P);
    AM = new AoiMotion(v, { root: aoi, reducedMotion: RM, wind: .3, startCalm: 2.2, posture: "natural", uprightWeight: .25, faceLight: .6 });
    AM.place(P.x, P.z, Math.atan2(eye.x - P.x, eye.z - P.z));
    try { await R.compileAsync(aoi, cam, S); } catch { }
    (place === "city" ? city : forest).add(aoi); standAoi(); window.__aoi = { v, aoi, AM }; window.__touchAoiAt = performance.now();
  } catch (e) { console.warn("碧の姿を読み込めませんでした", e?.message ?? e); } }, 0);

  // 碧の立つ所：いまの立ち位置から見て右前（スマホは画面のまん中寄りの奥）
  function standAoi() { if (!aoi || !AM) return; const sp = SP[place] || SP.forest, yw = sp.yaw, F = new THREE.Vector3(-Math.sin(yw), 0, -Math.cos(yw)), Rt = new THREE.Vector3(Math.cos(yw), 0, -Math.sin(yw)), nar = innerWidth / innerHeight < .8;
    const P = place === "forest" ? at(nar ? 4.6 : 3.3, nar ? .8 : 1.9) : sp.eye.clone().setY(0).addScaledVector(F, nar ? 4.6 : 3.2).addScaledVector(Rt, place === "city" ? (nar ? -.3 : -.9) : (nar ? .7 : 2.2));
    if (place === "shore") P.y = sandY(P.x, P.z); aoi.position.copy(P); AM.place(P.x, P.z, Math.atan2(sp.eye.x - P.x, sp.eye.z - P.z)); }
  // ---- 場所の切りかえ（森／浜／都市）。都市（kit/city.js）は切りかえたときに組む
  async function setPlace(p) { if (p === place && mode === "walk") return;
    if (p === "city" && !CITY) { cityP = cityP || import("./kit/city.js?v=20261123p").then(({ buildCity }) => { CITY = buildCity({ M, tx, canvasTex, group: city, pick: [], sonic: [], mobile }); city.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
        SP.city = { eye: new THREE.Vector3(7.25, 1.55, 9.2), yaw: .05, pitch: -.22 };
        const waitRope = () => new Promise(ok => { const k = () => CITY.rope || city.getObjectByName("落とし物の結び目") ? ok(CITY.rope || city.getObjectByName("落とし物の結び目")) : setTimeout(k, 50); k(); });
        return waitRope().then(rope => { rope.updateMatrixWorld(true); rope.userData.rep = [1.5, 1.5]; rope.material = ropeMat(); const b = new THREE.Box3().setFromObject(rope), c = b.getCenter(new THREE.Vector3());
          items.push(rope); rope.userData.thing = THINGS.find(x => x.id === "rope"); T.rope = { th: rope.userData.thing, mesh: rope, aim: new THREE.Vector3(c.x, b.max.y * .75, c.z), n: new THREE.Vector3(0, 1, 0).addScaledVector(toward(c, SP.city.eye), .9).normalize() };
          const P = new THREE.Vector3(c.x - .55, .012, c.z + .55), rad = .4, rep = [Math.round(rad * 4) + .5, Math.round(rad * 4) + .5], g = new THREE.CircleGeometry(rad, 48); g.rotateX(-Math.PI / 2);
          const pm = new THREE.Mesh(g, mat(THINGS.find(x => x.id === "pave"), rep[0], rep[1], { wrap: THREE.RepeatWrapping, transparent: true, alphaMap: edge, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
          const yy = (() => { const h = new THREE.Raycaster(new THREE.Vector3(P.x, 3, P.z), new THREE.Vector3(0, -1, 0)).intersectObjects(city.children, true).find(x => x.object !== rope); return h ? h.point.y : 0; })();
          pm.position.set(P.x, yy + .012, P.z); pm.userData.rep = rep; pm.renderOrder = 2; add("pave", pm, new THREE.Vector3(P.x, yy + .012, P.z), new THREE.Vector3(0, 1, 0).addScaledVector(toward(P, SP.city.eye), .9), cityMine);
          { const tz = 6, tX = 4.6, r0 = .2, g = new THREE.CylinderGeometry(r0 * .8, r0, 4.2, 48, 40, true); g.translate(0, 2.1, 0);   // 歩道のケヤキ（街路樹の幹に重ねる）
            const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x), k = 1 + .05 * Math.sin(a * 5 + y * .7) + (y < .4 ? (.4 - y) * .4 : 0); pa.setXYZ(i, x * k, y, z * k); } g.computeVertexNormals();
            const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xd8d2c8, map: photoTex("bark_zelkova.webp", 1.5, 4), normalMap: tx("bark_zelkova_n.webp", 1.5, 4, false), roughnessMap: tx("bark_zelkova_orm.webp", 1.5, 4, false), roughness: 1, envMapIntensity: .35 })); m.position.set(tX, 0, tz); m.userData.rep = [1.5, 4];
            const tE = toward(new THREE.Vector3(tX, 0, tz), SP.city.eye); add("street", m, new THREE.Vector3(tX, 1.25, tz).addScaledVector(tE, r0 * 1.02), tE.clone(), cityMine); }
          city.visible = true; const q = R.compileAsync ? R.compileAsync(city, cam, S).catch(() => { }) : null; city.visible = false; return q; }); }); await cityP; }
    if (mode !== "walk") { clutter(true); nearMesh.visible = false; cur = null; aoiLook = null; cam.near = .02; cam.updateProjectionMatrix(); }
    place = p; forest.visible = p !== "city"; city.visible = p === "city";
    const sp = SP[p]; yaw = sp.yaw; pitch = sp.pitch; base.copy(sp.eye); cam.position.copy(sp.eye); walkQ(); cam.quaternion.copy(qWalk); mode = "walk"; tw = null;
    S.fog.density = p === "city" ? (mobile ? .016 : .013) : (mobile ? .026 : .022);
    sun.target.position.set(sp.eye.x, 0, sp.eye.z - 3); sun.position.set(sp.eye.x + (p === "shore" ? 26 : -22), 34, sp.eye.z - 14);   // 浜は海の側から日が差す（林の影が浜に落ちない）
    if (aoi) { (p === "city" ? city : forest).add(aoi); standAoi(); }
    ui.mode?.("walk", null); }
  function size() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 70 : 58; cam.updateProjectionMatrix(); }
  addEventListener("resize", size); size();
  let last = performance.now(), lastUI = 0;
  R.setAnimationLoop(() => { const now = performance.now(), dtMs = Math.min(50, now - last), dt = dtMs / 1000; last = now; const t = now / 1000; U.uTime.value = t;
    if (tw) { tw.t += dt / tw.dur; const k = Math.min(1, tw.t), s = k * k * (3 - 2 * k); cam.position.lerpVectors(tw.p0, tw.p1, s); cam.quaternion.slerpQuaternions(tw.q0, tw.q1, s); if (k >= 1) { const d = tw.done; tw = null; d && d(); } }
    else if (mode === "walk") { walkQ(); qTmp.setFromEuler(e3.set(pitch + (RM ? 0 : Math.sin(t * .21) * .01), yaw + (RM ? 0 : Math.sin(t * .13) * .02), 0)); cam.quaternion.copy(qTmp); }
    // 手ごたえ：動いていない間は静かに、縁を越えたら震えと音
    if (cur && mode === "near") { if (!held || now - lastMove > 30) model.idle(dtMs); force += ((held ? FORCE_MAX : 0) - force) * Math.min(1, dt * 6); const dent = model.press(dt, force);
      const hit = held ? vibe.edges(now, model.takeEdges()) : (model.takeEdges(), 0); const r = model.measure();
      tip.a = Math.max(tip.a * Math.exp(-dt * 5), held ? .35 + .5 * r.amp : 0); tip.material.opacity = tip.a * .8; tip.scale.setScalar(1 + Math.max(0, dent) * .12 + hit * .4);
      if (now - lastUI > 120) { lastUI = now; ui.feel?.({ speed: r.speed, amp: r.amp, dent: Math.max(0, dent), held, moving: held && now - lastMove < 400 }); } }
    else { tip.material.opacity = 0; }
    fill.position.copy(cam.position); fill.intensity += ((mode === "near" ? .012 : 0) - fill.intensity) * Math.min(1, dt * 4);
    if (place === "city" && CITY) CITY.update(t, dt); if (place !== "city" && SHORE) SHORE.update(t, dt, cam.position);
    if (AM) { AM.faceTo(null); AM.lookAt(aoiLook || (mode === "walk" ? cam.position : null)); AM.update(dt, cam); }   // 歩いているあいだは、ときどき見る人の方へ目を向ける（AoiMotion がまばたき・重心の移しを足す）
    R.render(S, cam); });
  window.__touch = { T, cam, approach, leave, setPlace, get mode() { return mode; }, vibe, model, snd };
  return {
    R, S, cam, approach, leave, setPlace, get place() { return place; }, things: () => Object.keys(T),
    stl() { if (!cur) return null; const r = buildSTL(heightAt, cur.th.p); return { buf: r.buf, id: cur.th.id }; },
    sound(on) { snd.setOn(on); }, get soundOn() { return snd.on; },
  };
}
