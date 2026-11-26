/* hear.js ── Qualia/hear：聞こえない音を聞く（sight＝見えない世界を見る、と対）。
   マイクで拾った高い音を、聴こえる高さへ移して聴く（ヘテロダイン＝コウモリの検出器と同じ方式）。
   マイクが拾えない帯域（コウモリの声の多く）は「聴こえる高さに移した模式」の音で聴く。
   場：Qualia/sight の森（forest.js・nature.js・tex＝CC0 の写真の質感）をそのまま写して使う（2026-11-23 本人「sight の環境の 3D データをコピーして準用」）。
   時刻は夕方（日の入りのころ・模式）。コウモリは sight の造形（creatures.js の makeBat）。 */
import * as THREE from "three";
import { buildForest, SPAWN, MEADOW } from "./forest.js?v=20261123n";
import { photoTex } from "./nature.js?v=20261105s";
import { makeBat } from "./creatures.js?v=20261120r";
import { bitmapTex } from "./kit/warm.js";
import { buildShore, clearForest } from "./kit/shore.js?v=20261124d";

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
const U = { uTime: { value: 0 } };
function prep(m, o = {}) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = { value: o.wind || 0 }; sh.uniforms.uWindH = { value: o.windH || 8 };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvec4 wp_ = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp_ = instanceMatrix * wp_;\n#endif\nvWP = (modelMatrix * wp_).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;");
    if (o.wind) sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime, uWind, uWindH;").replace("#include <project_vertex>", WIND);
    if (o.hook) o.hook(sh);
  };
  m.customProgramCacheKey = () => "hear" + m.type + (o.wind ? "w" : "") + (o.key || "");
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

// 碧の 3D（約 2 MB）は、Qualia/sight と同じ物を読む（先に sight を開いた人は、ブラウザの控えから出る）。手元で開いたときは、このフォルダの写し
const AOI_BUF = (() => { let p = null; return () => p || (p = fetch("../02/assets/aoi/aoi.vrm").then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).catch(() => fetch("assets/aoi/aoi.vrm").then(r => r.arrayBuffer()))); })();
export function start(canvas) {
  AOI_BUF();   // 森を組むあいだに読み始める
  const mobile = matchMedia("(max-width:760px)").matches;
  const R = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const S = new THREE.Scene(); const FOG = new THREE.Color("#7c6a6c");
  S.background = FOG.clone(); S.fog = new THREE.FogExp2(FOG.clone(), mobile ? .03 : .026);
  const cam = new THREE.PerspectiveCamera(60, 1, .03, 300);
  // 夕方の空（上は暗い青、地平は夕焼けの色）
  const skyG = new THREE.SphereGeometry(200, 32, 16), col = [], p = skyG.attributes.position, c = new THREE.Color(), top = new THREE.Color("#1f2a48"), mid = new THREE.Color("#8a6f78"), low = new THREE.Color("#e8925a");
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 200; if (y > .25) c.copy(mid).lerp(top, Math.min(1, (y - .25) / .6)); else c.copy(low).lerp(mid, Math.max(0, (y + .05) / .3)); col.push(c.r, c.g, c.b); }
  skyG.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const sky = new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); S.add(sky);
  const hemi = new THREE.HemisphereLight("#e2d0cc", "#6a5644", 1.75); S.add(hemi);   // 2026-11-23 夜：夕景を暗くしすぎない
  const sun = new THREE.DirectionalLight("#ffb27a", 1.6); sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 120 }); sun.shadow.bias = -.0008; sun.shadow.normalBias = .04;
  sun.target.position.set(44, 0, 2); sun.position.set(10, 14, -14); S.add(sun, sun.target);
  // 森（sight と同じ）
  const forest = new THREE.Group(); S.add(forest); const pick = [], sonic = [];
  const riverCurve = new THREE.CatmullRomCurve3([[-8, -7], [-5, -13], [1, -15], [9, -12], [18, -7], [30, -2], [44, 4]].map(([x, z]) => new THREE.Vector3(x, .035, z)));
  const water = M(0x3a584a, { std: true, rough: .09, metal: .42, env: 1.3 });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4.8, 72), water); pool.rotation.x = -Math.PI / 2; pool.position.set(-8, .025, -7); forest.add(pool);
  const FOREST = buildForest({ M, tx, canvasTex, photoTex, forest, pick, sonic, mobile, riverCurve });
  forest.traverse(o => { if (!o.isMesh) return; o.receiveShadow = true; let nc = false; for (let q = o; q; q = q.parent) if (q.userData.noCast) nc = true; o.castShadow = !nc && !(mobile && o.isInstancedMesh && o.count > 300); });
  { const env = new THREE.Scene(); env.add(new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 30, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x24301f, side: THREE.BackSide, fog: false })); band.position.y = 4; env.add(band);
    const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(env, .02).texture; pm.dispose(); }
  // あとの草花・落ち葉は、起動のあとに一こまずつ（sight と同じ）
  (async () => { for (const job of FOREST.later || []) { await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); const g = job(); g.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = !mobile; } }); forest.add(g); } })();
  // 立つ所：森の草地（明るいすき間）の縁から、空の開けた方を見上げる
  // 立つ所（2026-11-23 本人「自然の中に海辺の要素を」）：森のはし、川が海へ出る入り江の砂浜から、夕方の海と空を見る。うしろは森
  const eye = new THREE.Vector3(37.6, 1.55, 6.5), look = innerWidth / innerHeight < .8 ? new THREE.Vector3(53, 3.6, -12) : new THREE.Vector3(50, 3.6, -16);   // スマホは少し海へ向ける（画面の左のはしに森の枝先だけが切れて入らない）   // 左に森のはし、右に海
  let yaw = Math.atan2(-(look.x - eye.x), -(look.z - eye.z)), pitch = Math.atan2(look.y - eye.y, Math.hypot(look.x - eye.x, look.z - eye.z)), dy = 0, dp = 0;
  cam.position.copy(eye); cam.rotation.order = "YXZ";
  // 見回す（なぞる）
  let drag = null; canvas.addEventListener("pointerdown", e => { drag = [e.clientX, e.clientY, dy, dp]; });
  addEventListener("pointermove", e => { if (!drag) return; dy = Math.max(-1.2, Math.min(1.2, drag[2] - (e.clientX - drag[0]) * .004)); dp = Math.max(-.35, Math.min(.5, drag[3] + (e.clientY - drag[1]) * .003)); });
  addEventListener("pointerup", () => { drag = null; });
  // 夕方の空を飛ぶアブラコウモリ（翼を広げて約 20 cm。sight の造形。見やすく 2 倍）
  const bats = []; for (let k = 0; k < 3; k++) { const inner = makeBat(), b = new THREE.Group(); b.add(inner); const bb = new THREE.Box3().setFromObject(inner), sz = bb.getSize(new THREE.Vector3()); b.scale.setScalar(.4 / Math.max(sz.x, sz.z, .001)); inner.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); o.material.emissive.set(0x5a3c2a); o.material.emissiveIntensity = .55; } }); /* 夕方の空でも、茶色の体と翼の膜が分かるように（黒い紙片に見せない・2026-11-23 夜） */ forest.add(b); bats.push({ b, inner, ph: k * 2.1, r: 1.3 + k * .8, h: 1.5 + k * .45, sp: .55 + k * .12 }); }

  // 碧（sight と同じ 3D・共通部品 AoiMotion。2026-11-23 本人「hear にも碧を表示して」）。森と操作を先に出し、碧はあとから読む。組み終えてから場面に入れる（透けて出ない）
  let AM = null, aoi = null; const AOI_H = 1.62;
  (async () => { try {
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));   // 森の最初のこまを先に出す
    const [buf, { GLTFLoader }, { MeshoptDecoder }, V, { AoiMotion }] = await Promise.all([AOI_BUF(), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js"), import("@pixiv/three-vrm"), import("./kit/aoi_motion.js")]);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); loader.register(p => new V.VRMLoaderPlugin(p));
    const g = await loader.parseAsync(buf, ""), v = g.userData.vrm;
    V.VRMUtils.removeUnnecessaryVertices(g.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(g.scene); V.VRMUtils.rotateVRM0(v);
    v.scene.traverse(o => { o.frustumCulled = false; if (o.isMesh) o.castShadow = true; });
    aoi = new THREE.Group(); aoi.add(v.scene);
    v.humanoid.resetNormalizedPose(); v.update(0); v.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(v.scene), h = box.max.y - box.min.y, sc = h > .5 ? AOI_H / h : 1; v.scene.scale.setScalar(sc); v.scene.position.y = -box.min.y * sc;
    aoi.traverse(o=>{if(o.isMesh){o.material=[].concat(o.material).map(m=>{const n=new THREE.MeshStandardMaterial({map:m.map||null,color:m.color?.clone()||new THREE.Color(0xffffff),side:m.side,transparent:m.transparent,alphaTest:m.alphaTest||0,roughness:.85});n.name=m.name;if(/SKIN/i.test(m.name)){n.emissiveMap=m.map;n.emissive=new THREE.Color(.24,.2,.19);n.roughness=.7;}else if(/EYE|FACE/i.test(m.name)){n.emissiveMap=m.map;n.emissive=new THREE.Color(.45,.45,.45);}else if(/HAIR/i.test(m.name)){n.roughness=.62;}/* 2026-10-15：肌は光の当たらない側も少し透けて明るく（MToon から写すと顔が暗く沈んでいた）・目は暗くしない *//* 2026-10-27 熱の見え方（マムシ）：肌は温かく、衣は体温をさえぎって表面がぬるく、髪はさらに低い（人の赤外線の像で、顔と手が明るく衣が暗いのと同じ）。目は肌と同じ温度にして、光る点にしない */prep(n,{uv:.04,temp:/EYE/i.test(m.name)?.3:/SKIN|FACE|MOUTH|BROW/i.test(m.name)?.55:/HAIR/i.test(m.name)?.22:.38,echo:1});return n;});if(o.material.length===1)o.material=o.material[0];}});
    // 立つ所：見ている向きの右手前、草地の縁（スマホは画面のまん中寄り）
    const nar = innerWidth / innerHeight < .8, fw = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), rt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const P = eye.clone().setY(0).addScaledVector(fw, nar ? 5.5 : 4.5).addScaledVector(rt, nar ? .3 : .9);
    aoi.position.copy(P);
    AM = new AoiMotion(v, { root: aoi, reducedMotion: RM, wind: .3, startCalm: 2.2, posture: "natural", uprightWeight: .25, faceLight: .6 });
    AM.place(P.x, P.z, Math.atan2(eye.x - P.x, eye.z - P.z));
    try { await R.compileAsync(aoi, cam, S); } catch { }
    (place === "city" ? city : forest).add(aoi); if (place === "city") standAoi(); window.__aoi = { v, aoi, AM }; window.__hearAoiAt = performance.now();
  } catch (e) { console.warn("碧の姿を読み込めませんでした", e?.message ?? e); } })();
  // ── 場所の切りかえ（自然／都市。2026-11-23 本人）。都市の場（kit/city.js）は切りかえたときに読む。森の先の海辺（kit/shore.js）は森が出てから組む
  const city = new THREE.Group(); city.visible = false; S.add(city); let CITY = null, cityP = null, SHORE = null, place = "forest"; window.__hearKz = { cam, get place() { return place; } };   // 2026-11-26 気づいた痕跡（kit/kizuki.js）が見る
  const VIEW = { forest: { eye: eye.clone(), look: look.clone() } };
  // 森の先の海辺（kit/shore.js）。この場所は浜から見るので、はじめから組む
  try { clearForest(forest, FOREST.trunks, [FOREST.ground]);
    const add0 = forest.add.bind(forest); forest.add = (...a) => { add0(...a); try { clearForest(forest, FOREST.trunks, [FOREST.ground, aoi], a); } catch { } return forest; };
    SHORE = buildShore({ M, tx, canvasTex, group: forest, pick, sonic, mobile }); SHORE.root.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  } catch (e) { console.warn("海辺", e?.message ?? e); }
  setTimeout(() => import("./kit/city.js?v=20261123p").catch(() => { }), 4000);
  function standAoi() { if (!aoi || !AM) return; const nar = innerWidth / innerHeight < .8, fw = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), rt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const P = eye.clone().setY(0).addScaledVector(fw, place === "city" ? (nar ? 9 : 5.5) : (nar ? 5.5 : 4.5)).addScaledVector(rt, place === "city" ? (nar ? .2 : .1) : (nar ? .3 : .9)); if (place === "city" && CITY && nar) { for (const d of [7.5, 6.5, 8.5, 5.5]) { const Q = eye.clone().setY(0).addScaledVector(fw, d).addScaledVector(rt, .2); Q.x = Math.max(Q.x, 5.6); if (!CITY.blocked(Q.x, Q.z, .5)) { P.copy(Q); break; } } }   // 2026-11-24：植え込み（x＝±4.35 の列）より建物側の歩道に立たせ、スマホで植え込みに隠れない
    aoi.position.copy(P); AM.place(P.x, P.z, Math.atan2(eye.x - P.x, eye.z - P.z)); }
  async function setPlace(p) {
    if (p === place) return;
    if (p === "city" && !CITY) { cityP = cityP || import("./kit/city.js?v=20261123p").then(({ buildCity }) => { CITY = buildCity({ M, tx, canvasTex, group: city, pick, sonic, mobile }); city.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
        const L = CITY.lamps[0] || [2.2, 7.8, 12]; VIEW.city = { eye: new THREE.Vector3(7.1, 1.55, L[2] + 5), look: new THREE.Vector3(L[0] + .3, 4.3, L[2] - 8) };   // 歩道の建物寄りから、通りの先の街灯を見上げる
        city.visible = true; const q = R.compileAsync ? R.compileAsync(city, cam, S).catch(() => { }) : null; city.visible = false; return q; }); await cityP; }
    place = p; forest.visible = p === "forest"; city.visible = p === "city";
    S.fog.density = p === "city" ? (mobile ? .016 : .013) : (mobile ? .03 : .026);
    const V = VIEW[p]; eye.copy(V.eye); look.copy(V.look); cam.position.copy(eye); yaw = Math.atan2(-(look.x - eye.x), -(look.z - eye.z)); pitch = Math.atan2(look.y - eye.y, Math.hypot(look.x - eye.x, look.z - eye.z)); dy = dp = 0;
    const host = p === "city" ? city : forest; for (const B of bats) host.add(B.b); if (aoi) { host.add(aoi); standAoi(); }
    sun.target.position.set(eye.x + 2, 0, eye.z - 8); sun.position.copy(sun.target.position).add(new THREE.Vector3(-36, 14, -16));
  }
  // 音の輪（いま拾っている高い音の強さに応じて、目の前に広がる）
  const ringM = new THREE.MeshBasicMaterial({ color: "#cfe9f0", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const rings = []; for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.985, 1, 72), ringM.clone()); S.add(r); rings.push({ r, t: i / 6 }); }
  const fwd = new THREE.Vector3();
  function size() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 70 : 58; cam.updateProjectionMatrix(); }
  addEventListener("resize", size); size();
  let level = 0, call = 0, last = performance.now(); const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  R.setAnimationLoop(() => { const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000; U.uTime.value = t;
    cam.rotation.set(pitch + dp + (RM ? 0 : Math.sin(t * .21) * .012), yaw + dy + (RM ? 0 : Math.sin(t * .13) * .03), 0);
    const L0 = place === "city" && CITY ? (CITY.lamps[0] || [2.2, 7.8, 12]) : null, cx = L0 ? L0[0] + .4 : 41.5, cz = L0 ? L0[2] - 5 : -2, hy = L0 ? 3.4 : 1.2;   // 森では、森のはしと浜の上（夕方のコウモリは林縁や水辺で虫を捕る）   // 都市では街灯のまわり（アブラコウモリは街灯に集まる虫を捕る）
    for (const B of bats) { const a = B.ph + t * B.sp; B.b.position.set(cx + Math.cos(a) * B.r, B.h + hy + Math.sin(a * 2.3) * .6, cz + Math.sin(a) * B.r * .8); B.b.rotation.y = -a + Math.PI; B.inner.userData.animate?.(t, true); }
    cam.getWorldDirection(fwd);
    for (const Rg of rings) { Rg.t = (Rg.t + dt * .35) % 1; const s = .15 + Rg.t * 3.2; Rg.r.scale.setScalar(s); Rg.r.position.copy(cam.position).addScaledVector(fwd, 3.2); Rg.r.quaternion.copy(cam.quaternion); Rg.r.material.opacity = (1 - Rg.t) * Math.min(1, level * 3 + call) * .5; }
    call = Math.max(0, call - dt * .8);
    if (AM) { AM.eyesClosed = 0; AM.faceTo(null); AM.lookAt(level > .05 || call > .2 ? new THREE.Vector3(cx, 3.2 + hy, cz) : null); AM.update(dt, cam); }   // 高い音が来ると、碧も空のコウモリの方へ目を向ける
    if (place === "city" && CITY) CITY.update(t, dt); if (place === "forest" && SHORE) SHORE.update(t, dt, cam.position);
    R.render(S, cam); });
  return { R, S, cam, setLevel(v) { level = v; }, pulse() { call = 1; }, setPlace, get place() { return place; } };
}

// ── 音 ──
export function audio() {
  const AC = new (window.AudioContext || window.webkitAudioContext)();
  const out = AC.createGain(); out.gain.value = .9; out.connect(AC.destination);
  const an = AC.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = .6;
  let mic = null, het = null, osc = null;
  async function openMic(f0) {
    const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    mic = AC.createMediaStreamSource(st); mic.connect(an);
    // 高い音だけを取り出し（15 kHz より下を落とす）→ 発振器とかけ合わせる（周波数の差が聴こえる高さに降りる）→ 5 kHz より上を落とす
    const hp1 = AC.createBiquadFilter(); hp1.type = 'highpass'; hp1.frequency.value = 15000; hp1.Q.value = .7;
    const hp2 = AC.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = 15000; hp2.Q.value = .7;
    const mix = AC.createGain(); mix.gain.value = 0; osc = AC.createOscillator(); osc.frequency.value = f0; osc.connect(mix.gain); osc.start();
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
    const boost = AC.createGain(); boost.gain.value = 6;
    mic.connect(hp1); hp1.connect(hp2); hp2.connect(mix); mix.connect(lp); lp.connect(boost); boost.connect(out); het = boost;
    return st; }
  function tune(f0) { osc && osc.frequency.setTargetAtTime(f0, AC.currentTime, .05); }
  // 模式：アブラコウモリの探す声（約 100 kHz から 40 kHz 前後へ下がる、数ミリ秒の FM）を、時間を 10 倍にのばし、高さを 1/10 にした音
  function batCall() { const t0 = AC.currentTime + .02, o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(10000, t0); o.frequency.exponentialRampToValueAtTime(4200, t0 + .045); o.frequency.setValueAtTime(4100, t0 + .045); o.frequency.linearRampToValueAtTime(4000, t0 + .07);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.35, t0 + .006); g.gain.setValueAtTime(.35, t0 + .05); g.gain.linearRampToValueAtTime(0, t0 + .075);
    o.connect(g); g.connect(out); g.connect(an); o.start(t0); o.stop(t0 + .09); }
  // まわりの音（聞こえる音・この画面で作った模式）：浜では寄せては返す波（約 8 秒・画面の泡の線と同じ周期）と、ときどきウミネコの「ミャーオ」。街では遠い車の低い音。
  //   高い音の帯（上の帯の 15 kHz より上）には入れない（マイクの音と混ぜない）
  const amb = AC.createGain(); amb.gain.value = 0; amb.connect(out);
  const nbuf = AC.createBuffer(1, AC.sampleRate * 4, AC.sampleRate); { const d = nbuf.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { b = (b + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; } }   // ブラウン雑音
  const src = AC.createBufferSource(); src.buffer = nbuf; src.loop = true; const lp2 = AC.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 700; const swell = AC.createGain(); swell.gain.value = .3;
  src.connect(lp2); lp2.connect(swell); swell.connect(amb); src.start();
  let ambKind = null, gullT = 0;
  function gull() { const t0 = AC.currentTime + .05, o = AC.createOscillator(), g = AC.createGain(), v = AC.createOscillator(), vg = AC.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(900, t0); o.frequency.linearRampToValueAtTime(1500, t0 + .18); o.frequency.linearRampToValueAtTime(950, t0 + .55);   // ネコのような「ミャーオ」（上がって下がる）
    v.frequency.value = 22; vg.gain.value = 40; v.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.05, t0 + .06); g.gain.linearRampToValueAtTime(.035, t0 + .4); g.gain.linearRampToValueAtTime(0, t0 + .6);
    o.connect(g); g.connect(amb); o.start(t0); v.start(t0); o.stop(t0 + .65); v.stop(t0 + .65); }
  function ambient(kind) { ambKind = kind; amb.gain.setTargetAtTime(kind ? .16 : 0, AC.currentTime, .6); lp2.frequency.setTargetAtTime(kind === "city" ? 220 : 700, AC.currentTime, .3); }
  setInterval(() => { if (!ambKind) return; const t = AC.currentTime, u = (performance.now() / 1000 / 8) % 1;
    swell.gain.setTargetAtTime(ambKind === "forest" ? .15 + .85 * Math.pow(Math.sin(u * Math.PI), 2) : .55, t, .25);   // 波が寄せると大きく、返すと小さく
    if (ambKind === "forest" && t > gullT) { gullT = t + 9 + Math.random() * 10; gull(); if (Math.random() < .5) setTimeout(gull, 700); } }, 250);
  const bins = new Uint8Array(an.frequencyBinCount);
  function spectrum() { an.getByteFrequencyData(bins); return bins; }
  return { AC, openMic, tune, batCall, spectrum, ambient, get nyq() { return AC.sampleRate / 2; }, get micOn() { return !!mic; } };
}
