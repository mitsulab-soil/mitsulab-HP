/* hear.js ── Qualia/hear：聞こえない音を聞く（sight＝見えない世界を見る、と対）。
   マイクで拾った高い音を、聴こえる高さへ移して聴く（ヘテロダイン＝コウモリの検出器と同じ方式）。
   マイクが拾えない帯域（コウモリの声の多く）は「聴こえる高さに移した模式」の音で聴く。
   場：Qualia/sight の森（forest.js・nature.js・tex＝CC0 の写真の質感）をそのまま写して使う（2026-11-23 本人「sight の環境の 3D データをコピーして準用」）。
   時刻は夕方（日の入りのころ・模式）。コウモリは sight の造形（creatures.js の makeBat）。 */
import * as THREE from "three";
import { buildForest, SPAWN, MEADOW } from "./forest.js?v=20261120r";
import { photoTex } from "./nature.js?v=20261105s";
import { makeBat } from "./creatures.js?v=20261120r";
import { bitmapTex } from "./kit/warm.js";

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

export function start(canvas) {
  const mobile = matchMedia("(max-width:760px)").matches;
  const R = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.18;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const S = new THREE.Scene(); const FOG = new THREE.Color("#a48f8c");
  S.background = FOG.clone(); S.fog = new THREE.FogExp2(FOG.clone(), mobile ? .03 : .026);
  const cam = new THREE.PerspectiveCamera(60, 1, .03, 300);
  // 夕方の空（上は暗い青、地平は夕焼けの色）
  const skyG = new THREE.SphereGeometry(200, 32, 16), col = [], p = skyG.attributes.position, c = new THREE.Color(), top = new THREE.Color("#3e4a6a"), mid = new THREE.Color("#b49a9a"), low = new THREE.Color("#e2a274");
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 200; if (y > .25) c.copy(mid).lerp(top, Math.min(1, (y - .25) / .6)); else c.copy(low).lerp(mid, Math.max(0, (y + .05) / .3)); col.push(c.r, c.g, c.b); }
  skyG.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const sky = new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); S.add(sky);
  const hemi = new THREE.HemisphereLight("#d6c4c4", "#4a3c30", 1.25); S.add(hemi);
  const sun = new THREE.DirectionalLight("#ffb27a", 1.6); sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 120 }); sun.shadow.bias = -.0008; sun.shadow.normalBias = .04;
  sun.target.position.set(2, 0, -4); sun.position.set(-34, 14, -20); S.add(sun, sun.target);
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
  const eye = new THREE.Vector3(SPAWN.x, 1.55, SPAWN.z), look = new THREE.Vector3(MEADOW.x - 1.5, 3.1, MEADOW.z);
  let yaw = Math.atan2(-(look.x - eye.x), -(look.z - eye.z)), pitch = Math.atan2(look.y - eye.y, Math.hypot(look.x - eye.x, look.z - eye.z)), dy = 0, dp = 0;
  cam.position.copy(eye); cam.rotation.order = "YXZ";
  // 見回す（なぞる）
  let drag = null; canvas.addEventListener("pointerdown", e => { drag = [e.clientX, e.clientY, dy, dp]; });
  addEventListener("pointermove", e => { if (!drag) return; dy = Math.max(-1.2, Math.min(1.2, drag[2] - (e.clientX - drag[0]) * .004)); dp = Math.max(-.35, Math.min(.5, drag[3] + (e.clientY - drag[1]) * .003)); });
  addEventListener("pointerup", () => { drag = null; });
  // 夕方の空を飛ぶアブラコウモリ（翼を広げて約 20 cm。sight の造形。見やすく 2 倍）
  const bats = []; for (let k = 0; k < 3; k++) { const inner = makeBat(), b = new THREE.Group(); b.add(inner); const bb = new THREE.Box3().setFromObject(inner), sz = bb.getSize(new THREE.Vector3()); b.scale.setScalar(.4 / Math.max(sz.x, sz.z, .001)); forest.add(b); bats.push({ b, inner, ph: k * 2.1, r: 1.3 + k * .8, h: 2.8 + k * .7, sp: .55 + k * .12 }); }
  // 音の輪（いま拾っている高い音の強さに応じて、目の前に広がる）
  const ringM = new THREE.MeshBasicMaterial({ color: "#cfe9f0", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const rings = []; for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.985, 1, 72), ringM.clone()); S.add(r); rings.push({ r, t: i / 6 }); }
  const fwd = new THREE.Vector3();
  function size() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 70 : 58; cam.updateProjectionMatrix(); }
  addEventListener("resize", size); size();
  let level = 0, call = 0, last = performance.now(); const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  R.setAnimationLoop(() => { const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000; U.uTime.value = t;
    cam.rotation.set(pitch + dp + (RM ? 0 : Math.sin(t * .21) * .012), yaw + dy + (RM ? 0 : Math.sin(t * .13) * .03), 0);
    const cx = (SPAWN.x + MEADOW.x) * .5 - .6, cz = (SPAWN.z + MEADOW.z) * .5 - 1.2;
    for (const B of bats) { const a = B.ph + t * B.sp; B.b.position.set(cx + Math.cos(a) * B.r, B.h + Math.sin(a * 2.3) * .6, cz + Math.sin(a) * B.r * .8); B.b.rotation.y = -a + Math.PI; B.inner.userData.animate?.(t, true); }
    cam.getWorldDirection(fwd);
    for (const Rg of rings) { Rg.t = (Rg.t + dt * .35) % 1; const s = .15 + Rg.t * 3.2; Rg.r.scale.setScalar(s); Rg.r.position.copy(cam.position).addScaledVector(fwd, 3.2); Rg.r.quaternion.copy(cam.quaternion); Rg.r.material.opacity = (1 - Rg.t) * Math.min(1, level * 3 + call) * .5; }
    call = Math.max(0, call - dt * .8);
    R.render(S, cam); });
  return { R, S, cam, setLevel(v) { level = v; }, pulse() { call = 1; } };
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
  const bins = new Uint8Array(an.frequencyBinCount);
  function spectrum() { an.getByteFrequencyData(bins); return bins; }
  return { AC, openMic, tune, batCall, spectrum, get nyq() { return AC.sampleRate / 2; }, get micOn() { return !!mic; } };
}
