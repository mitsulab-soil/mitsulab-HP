/* Qualia/touch — 画像から表面へ、表面から触れ心地へ。© 2026 mitsulab. All rights reserved.
   選んだ画像はこの端末の中だけで処理する（fetch・送信・保存をしない）。
   表面は 10 cm 四方。凹凸（高さ）・法線・粗さの地図で 3D の面にし、押すとへこみ、なぞると振動の波が描かれる。 */
import * as THREE from "three";
import { T, setLang, lang } from "./i18n.js?v=20261020b";
import { TouchModel, Vibe, Sonic, SIZE_MM, FORCE_MAX, buildLayer, buildSTL } from "./haptics.js?v=20261020b";
import { estimateFromFile, N as EN } from "./estimate.js";

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE = matchMedia("(max-width: 899px)").matches;
const $ = s => document.querySelector(s);

// ---- 見本の表面（CC0。初期値は模式で、測った値ではない）
const SAMPLES = [
  { id: "bark",   mat: "Poly Haven — Japanese Zelkova Bark (CC0)", p: { hard: .78, rough: .8, depth: 6, fric: .7, spring: .15, warm: .65 } },
  { id: "soil",   mat: "Poly Haven — Farm Soil (CC0)",             p: { hard: .22, rough: .55, depth: 3.5, fric: .6, spring: .06, warm: .5 } },
  { id: "stone",  mat: "Poly Haven — Rock Surface (CC0)",          p: { hard: .98, rough: .5, depth: 2.5, fric: .5, spring: .02, warm: .12 } },
  { id: "moss",   mat: "ambientCG — Moss004 (CC0)",                p: { hard: .08, rough: .3, depth: 4, fric: .45, spring: .8, warm: .6 } },
  { id: "wood",   mat: "Poly Haven — Japanese Cedar Planks (CC0)", p: { hard: .7, rough: .25, depth: 1.2, fric: .35, spring: .1, warm: .72 } },
  { id: "cloth",  mat: "Poly Haven — Rough Linen (CC0)",           p: { hard: .3, rough: .45, depth: .8, fric: .55, spring: .45, warm: .78 } },
  { id: "metal",  mat: "ambientCG — Metal058B (CC0)",              p: { hard: 1, rough: .3, depth: .6, fric: .3, spring: .02, warm: .05 }, metal: .75 },
  { id: "leaves", mat: "Poly Haven — Dry Decay Leaves (CC0)",      p: { hard: .4, rough: .9, depth: 4, fric: .75, spring: .35, warm: .55 } },
];
const PARAMS = [
  { k: "hard", min: 0, max: 1, step: .01, lo: "p.hard.lo", hi: "p.hard.hi", f: v => Math.round(v * 100) },
  { k: "rough", min: 0, max: 1, step: .01, lo: "p.rough.lo", hi: "p.rough.hi", f: v => Math.round(v * 100) },
  { k: "depth", min: .2, max: 10, step: .1, f: v => v.toFixed(1) + " mm" },
  { k: "fric", min: 0, max: 1, step: .01, lo: "p.fric.lo", hi: "p.fric.hi", f: v => Math.round(v * 100) },
  { k: "spring", min: 0, max: 1, step: .01, lo: "p.spring.lo", hi: "p.spring.hi", f: v => Math.round(v * 100) },
  { k: "warm", min: 0, max: 1, step: .01, lo: "p.warm.lo", hi: "p.warm.hi", f: v => Math.round(v * 100) },
];
const NAME = { hard: "p.hard", rough: "p.rough", depth: "p.depth", fric: "p.fric", spring: "p.spring", warm: "p.warm" };

// ---- 描画の土台
const cv = $("#cv"), stage = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
renderer.autoClear = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, .02, 20);

// 環境の光：上が明るい空、下が紺の地の、ゆるい階調（にじみの効果ではなく、面の照り返しの元）
function makeEnv() {
  const es = new THREE.Scene();
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {},
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "varying vec3 vP; void main(){ float y = vP.y; vec3 top = vec3(.78,.82,.9), hor = vec3(.22,.26,.34), bot = vec3(.02,.03,.06); vec3 c = y > 0. ? mix(hor, top, pow(y,.6)) : mix(hor, bot, pow(-y,.5)); gl_FragColor = vec4(c,1.); }" });
  es.add(new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16), m));
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(es, .04).texture; pm.dispose(); return t;
}
scene.environment = makeEnv();
const key = new THREE.DirectionalLight(0xfff1e2, 2.6); key.position.set(-1.1, .62, .35); scene.add(key);   // 低く斜めに当たる光（凹凸が読める）
const fill = new THREE.DirectionalLight(0x9bdcf0, .28); fill.position.set(1, .8, -.4); scene.add(fill);
scene.add(new THREE.HemisphereLight(0x8a96ad, 0x05080f, .25));

// ---- 表面（10 cm 四方＝1 単位）
const SEG = MOBILE ? 200 : 300;
const geo = new THREE.PlaneGeometry(1, 1, SEG, SEG);
const U = { uDent: { value: new THREE.Vector3(0, 0, 0) }, uDentR: { value: .08 } };
const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: .55, displacementScale: .03 });
mat.onBeforeCompile = sh => {
  sh.uniforms.uDent = U.uDent; sh.uniforms.uDentR = U.uDentR;
  sh.vertexShader = "uniform vec3 uDent; uniform float uDentR; varying float vDentG;\n" + sh.vertexShader
    .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
      { vec2 dd = position.xy - uDent.xy; float g = exp(-dot(dd, dd) / (uDentR * uDentR)); vec2 grad = uDent.z * g * 2.0 * dd / (uDentR * uDentR); objectNormal = normalize(objectNormal - vec3(grad, 0.0)); }`)
    .replace("#include <displacementmap_vertex>", `#ifdef USE_DISPLACEMENTMAP
      { vec2 eu = vDisplacementMapUv; float ed = min(min(eu.x, 1.0 - eu.x), min(eu.y, 1.0 - eu.y));   // 縁は凹凸を 0 へ（切り口がとげにならない）
        transformed += normalize(objectNormal) * (texture2D(displacementMap, vDisplacementMapUv).x * displacementScale * smoothstep(0.0, 0.02, ed) + displacementBias); }
      #endif
      { vec2 dd = position.xy - uDent.xy; float g = exp(-dot(dd, dd) / (uDentR * uDentR)); transformed.z -= uDent.z * g; vDentG = uDent.z * g; }`);
  // へこんだところは光が入りにくく、少し暗い
  sh.fragmentShader = "varying float vDentG;\n" + sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n diffuseColor.rgb *= 1.0 - clamp(vDentG * 7.0, 0.0, 0.5);");
};
const plate = new THREE.Mesh(geo, mat); plate.rotation.x = -Math.PI / 2; scene.add(plate);
// 台：上の面のない箱（へこみが台に隠れない深さ 10 mm の側面だけ）
{ const dark = new THREE.MeshStandardMaterial({ color: 0x0a0f1a, roughness: 1 }), none = new THREE.MeshBasicMaterial({ visible: false });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.002, .105, 1.002), [dark, dark, none, dark, dark, dark]); base.position.y = -.0535; scene.add(base); }
// 四隅の印と、10 cm の目盛り（事実の線）
{
  const L = [], c = .53, a = .06;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { L.push(sx * c, 0, sz * c, sx * c - sx * -a, 0, sz * c, sx * c, 0, sz * c, sx * c, 0, sz * c - sz * -a); }
  const z = .58; L.push(-.5, 0, z, .5, 0, z, -.5, 0, z - .015, -.5, 0, z + .015, .5, 0, z - .015, .5, 0, z + .015);
  for (let i = 1; i < 10; i++) L.push(-.5 + i / 10, 0, z - .007, -.5 + i / 10, 0, z + .007);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(L, 3));
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: .55 })));
}
// 触れたところの輪（色＝温かさの感じ：ひんやり＝水の色、あたたか＝文化の色）
const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos(i / 64 * Math.PI * 2), 0, Math.sin(i / 64 * Math.PI * 2)))), new THREE.LineBasicMaterial({ color: 0x9bdcf0, transparent: true, opacity: 0 }));
scene.add(ring);
const COLD = new THREE.Color(0x78d6ec), WARM = new THREE.Color(0xf2cf8c);
// 指の通り道（細い線。2.4 秒で消える）
const TR = 900, trPos = new Float32Array(TR * 2 * 3), trCol = new Float32Array(TR * 2 * 4), trAge = new Float32Array(TR * 2).fill(99);
const trGeo = new THREE.BufferGeometry(); trGeo.setAttribute("position", new THREE.BufferAttribute(trPos, 3)); trGeo.setAttribute("color", new THREE.BufferAttribute(trCol, 4));
const trail = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
trail.frustumCulled = false; scene.add(trail); let trW = 0;

// ---- 表面の中身
let H = new Float32Array(EN * EN), HN = EN;          // 凹凸（0..1）
const heightAt = (xmm, ymm) => {                       // x：左→右、y：奥（上の行）→手前
  const fx = Math.min(HN - 1.001, Math.max(0, xmm / SIZE_MM * HN - .5)), fy = Math.min(HN - 1.001, Math.max(0, ymm / SIZE_MM * HN - .5));
  const x = fx | 0, y = fy | 0, tx = fx - x, ty = fy - y, i = y * HN + x;
  return (H[i] * (1 - tx) + H[i + 1] * tx) * (1 - ty) + (H[i + HN] * (1 - tx) + H[i + HN + 1] * tx) * ty;
};
let surf = null, params = null;
const model = new TouchModel(), vibe = new Vibe(), sonic = new Sonic();
vibe.onPulse = (ms, amp) => sonic.grain(ms, amp);   // 振動と同じ刻みで音を一粒
const cache = new Map(), maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const tex = (src, srgb) => { const t = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = maxAniso; t.needsUpdate = true; return t; };
const img = url => new Promise((ok, ng) => { const i = new Image(); i.decoding = "async"; i.onload = () => ok(i); i.onerror = ng; i.src = url; });
function heightFrom(image) {
  const c = document.createElement("canvas"); c.width = c.height = EN; const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(image, 0, 0, EN, EN); const d = g.getImageData(0, 0, EN, EN).data, h = new Float32Array(EN * EN);
  for (let i = 0; i < EN * EN; i++) h[i] = d[i * 4] / 255; return { h, c };
}
async function loadSample(s) {
  if (cache.has(s.id)) return cache.get(s.id);
  const [c, n, r, hi] = await Promise.all(["c", "n", "r", "h"].map(k => img(`tex/${s.id}_${k}.webp`)));
  const { h, c: hc } = heightFrom(hi);
  const v = { id: s.id, origin: "normal-map", material: s.mat, map: tex(c, true), normalMap: tex(n), roughMap: tex(r), dispMap: tex(hc), H: h, p0: { ...s.p }, metal: s.metal || 0, nBase: 1 };
  cache.set(s.id, v); return v;
}
function applySurface(v, keepParams = false) {
  surf = v; H = v.H; HN = EN;
  mat.map = v.map; mat.normalMap = v.normalMap; mat.roughnessMap = v.roughMap; mat.displacementMap = v.dispMap; mat.metalness = v.metal; mat.needsUpdate = true;
  if (!keepParams) params = { ...v.p0 };
  applyParams(); buildSliders();
  $("#originT").textContent = T(v.origin === "photo" ? "origin.photo" : "origin.normal");
  for (const b of document.querySelectorAll(".chip")) b.setAttribute("aria-pressed", String(b.dataset.s === v.id));
}
function applyParams() {
  const p = params; mat.displacementScale = p.depth / SIZE_MM;
  const ns = (p.depth / Math.max(.3, surf.p0.depth)) ** .6 * (.55 + .9 * p.rough) / (.55 + .9 * surf.p0.rough) * surf.nBase;
  mat.normalScale.set(ns, ns);
  mat.roughness = .55 + .45 * p.rough;
  U.uDentR.value = (5 + 7 * (1 - p.hard)) / SIZE_MM;
  ring.material.color.copy(COLD).lerp(WARM, p.warm);
  model.setSurface(heightAt, p); sonic.setSurface(p);
}

// ---- つまみ
function buildSliders() {
  const box = $("#sliders"); box.textContent = "";
  for (const d of PARAMS) {
    const w = document.createElement("div"); w.className = "sl";
    const id = "p_" + d.k;
    w.innerHTML = `<label for="${id}" data-t="${NAME[d.k]}">${T(NAME[d.k])}</label><output id="o_${d.k}"></output><input type="range" id="${id}" min="${d.min}" max="${d.max}" step="${d.step}">` + (d.lo ? `<div class="ends"><span data-t="${d.lo}">${T(d.lo)}</span><span data-t="${d.hi}">${T(d.hi)}</span></div>` : "");
    const inp = w.querySelector("input"), out = w.querySelector("output");
    inp.value = params[d.k]; out.textContent = d.f(params[d.k]);
    inp.addEventListener("input", () => { params[d.k] = +inp.value; out.textContent = d.f(params[d.k]); applyParams(); dirty = 2; });
    box.append(w);
  }
}

// ---- 表面を選ぶ
const chips = $("#chips"), photoChip = chips.querySelector('[data-s="photo"]');
for (const s of SAMPLES) {
  const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.dataset.s = s.id; b.setAttribute("aria-pressed", "false");
  b.innerHTML = `<img src="tex/${s.id}_t.webp" alt="" width="48" height="48" loading="lazy"><span><b data-t="s.${s.id}">${T("s." + s.id)}</b><small data-t="s.${s.id}.sub">${T("s." + s.id + ".sub")}</small></span>`;
  b.addEventListener("click", async () => { if (surf?.id === s.id) return; busy(true); try { applySurface(await loadSample(s)); say("aoi." + s.id, 6500); aoiReact(); } finally { busy(false); } });
  chips.insertBefore(b, photoChip);
}
let photoSurf = null;
photoChip.addEventListener("click", () => { if (photoSurf && surf !== photoSurf) { applySurface(photoSurf, false); say("aoi.photo", 7000); } });
async function onFile(e) {
  const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
  $("#err").hidden = true; busy(true);
  try {
    const r = await estimateFromFile(f);   // この端末の中だけ
    if (photoSurf) for (const k of ["map", "normalMap", "roughMap", "dispMap"]) photoSurf[k].dispose();
    photoSurf = { id: "photo", origin: "photo", material: null, map: tex(r.color, true), normalMap: tex(r.normalCanvas), roughMap: tex(r.roughCanvas), dispMap: tex(r.heightCanvas), H: r.height, p0: r.params, metal: 0, nBase: 1 };
    const tc = $("#photoThumb").getContext("2d"); tc.drawImage(r.color, 0, 0, 48, 48);
    photoChip.hidden = false; applySurface(photoSurf); say("aoi.photo", 7500); aoiReact();
  } catch (err) { console.warn(err); $("#err").textContent = T("err.photo"); $("#err").hidden = false; }
  finally { busy(false); }
}
$("#fPick").addEventListener("change", onFile); $("#fShoot").addEventListener("change", onFile);
function busy(on) { $("#busy").hidden = !on; }

// ---- 向き
const VIEWS = [{ el: .9, d: 1 }, { el: 1.53, d: .98 }, { el: .36, d: 1.05 }];   // 斜め・真上・低く
let view = 0; const camT = new THREE.Vector3(), camP = new THREE.Vector3(), look = new THREE.Vector3(0, 0, MOBILE ? .05 : .1);   // 下の帯（波・字幕）のぶん、面を少し上へ
function camGoal() {
  const v = VIEWS[view], a = camera.aspect, vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * a);
  const need = Math.max(.66 / Math.tan(hf / 2), .7 / Math.tan(vf / 2)) * v.d * (MOBILE ? 1.14 : 1.08);
  camT.set(0, Math.sin(v.el) * need, Math.cos(v.el) * need + .02);
}
$("#bView").addEventListener("click", () => { view = (view + 1) % VIEWS.length; $("#viewName").dataset.t = "view." + view; $("#viewName").textContent = T("view." + view); camGoal(); dirty = 2; });

// ---- 大きさ
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix(); camGoal(); if (!camP.lengthSq()) camP.copy(camT);
  const wv = $("#wv"), dp = Math.min(devicePixelRatio, 2); wv.width = wv.clientWidth * dp; wv.height = wv.clientHeight * dp;
  dirty = 2;
}
addEventListener("resize", resize);

// ---- 触れる
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), flat = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
const toPlate = e => { const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(flat, hitP) ? hitP.clone() : null; };
const inside = p => p && Math.abs(p.x) <= .5 && Math.abs(p.z) <= .5;
let touch = null, force = 0, dentAt = new THREE.Vector2(), lastMove = 0, lastStroke = [], strokeMs = 0, said = {}, dirty = 2;
const mm = p => [(p.x + .5) * SIZE_MM, (p.z + .5) * SIZE_MM];
cv.addEventListener("pointerdown", e => {
  const p = toPlate(e); if (!inside(p)) return;
  cv.setPointerCapture(e.pointerId); e.preventDefault();
  touch = { id: e.pointerId, p, t: e.timeStamp, t0: performance.now(), pen: e.pointerType !== "mouse" && e.pressure > 0 && e.pressure !== .5 };
  dentAt.set(p.x, -p.z); model.recording = true; model.stroke = []; sonic.wake(); vibe.tap(); sonic.tap(); addTrail(p, p, true);
  $("#waveHint").style.opacity = 0; aoiWatch(true);
});
cv.addEventListener("pointermove", e => {
  if (!touch || e.pointerId !== touch.id) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of evs.length ? evs : [e]) {
    const p = toPlate(ev); if (!p) continue; p.x = Math.max(-.5, Math.min(.5, p.x)); p.z = Math.max(-.5, Math.min(.5, p.z));
    const dt = Math.max(1, ev.timeStamp - touch.t), [x0, y0] = mm(touch.p), [x1, y1] = mm(p);
    model.move(x0, y0, x1, y1, Math.min(dt, 120)); addTrail(touch.p, p); touch.p = p; touch.t = ev.timeStamp;
    if (touch.pen && ev.pressure > 0) touch.pr = ev.pressure;
  }
  dentAt.set(touch.p.x, -touch.p.z); lastMove = performance.now(); dirty = 2;
});
const end = e => { if (!touch || e.pointerId !== touch.id) return; touch = null; model.recording = false; if (model.stroke.length > 20) lastStroke = model.stroke.slice(); vibe.stop(); aoiWatch(false); };
cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
function addTrail(a, b, start) {
  const ya = heightAt(...mm(a)) * params.depth / SIZE_MM + .0015, yb = heightAt(...mm(b)) * params.depth / SIZE_MM + .0015;
  const i = trW % TR; trW++;
  trPos.set([a.x, ya, a.z, b.x, yb, b.z], i * 6); trAge[i * 2] = trAge[i * 2 + 1] = 0;
  if (start) trAge[i * 2] = trAge[i * 2 + 1] = 0;
  trGeo.attributes.position.needsUpdate = true;
}

// ---- 波を描く
const wv = $("#wv"), wg = wv.getContext("2d");
function drawWave() {
  const w = wv.width, h = wv.height, buf = model.buf, n = buf.length, span = 1500, mid = h * .38;
  wg.clearRect(0, 0, w, h); const amp = h * .3;
  wg.strokeStyle = "rgba(195,204,224,.14)"; wg.lineWidth = 1; wg.beginPath(); wg.moveTo(0, mid); wg.lineTo(w, mid); wg.stroke();
  const sc = amp / Math.max(.15, params.depth * .35);
  wg.strokeStyle = "rgba(155,220,240,.92)"; wg.lineWidth = Math.max(1, devicePixelRatio * .8); wg.beginPath();
  const step = Math.max(1, Math.floor(span / w * 1.5));
  for (let i = 0; i < span; i += step) { const v = buf[(model.w - span + i + n) % n], x = i / span * w, y = mid - Math.max(-1, Math.min(1, v * sc / amp)) * amp; i ? wg.lineTo(x, y) : wg.moveTo(x, y); }
  wg.stroke();
}

// ---- 碧（共通の部品。読み込みは表面のあとで。表面の操作は待たせない）
const aoiScene = new THREE.Scene(); aoiScene.environment = scene.environment;
{ const k = new THREE.DirectionalLight(0xfff1e2, 2.0); k.position.set(-1, 1.4, 1.2); aoiScene.add(k); aoiScene.add(new THREE.HemisphereLight(0xb8c4da, 0x0a0f1a, .9)); }
const aoiCam = new THREE.PerspectiveCamera(26, .74, .1, 20); aoiCam.position.set(0, 1.3, 1.95); aoiCam.lookAt(0, 1.2, 0);
let aoi = null;
const AOI_URL = location.pathname.includes("/x/") ? "../../img/hero/aoi.vrm" : "aoi.vrm";
async function loadAoi() {
  try {
    const K = await import("./kit/aoi.js");
    aoi = await K.loadAoi(AOI_URL, { scene: aoiScene, wind: .15, posture: "upright", quality: MOBILE ? "mid" : "auto" });
    aoi.place(0, 0, 0);
    if (!said.hello) hello();
  } catch (e) { console.warn("碧を読めませんでした", e); }
}
const LOOK = new THREE.Vector3(MOBILE ? -.9 : .9, .75, .9);
function aoiWatch(on) { aoi?.motion.lookAt(on ? LOOK : null); }
function aoiReact() { aoi?.motion.express("curious", .55, 2.4); }

// ---- 碧の字幕
// はじめに一度だけ名乗り、そのあとに触れ方を伝える（触れはじめたら名乗りは切りあげる）
function hello() { said.hello = true; say("aoi.name", 5200); setTimeout(() => { if (capKey === "aoi.name" || !capKey) say("aoi.hello", 8000); }, 5400); }
let capKey = null, capTimer = 0;
function say(k, ms = 6000) {
  said[k.replace("aoi.", "")] = true; capKey = k; const c = $("#cap"); c.textContent = T(k); c.classList.add("on");
  clearTimeout(capTimer); capTimer = setTimeout(() => { c.classList.remove("on"); capKey = null; }, ms);
  aoi?.motion.express("warm", .35, 2);   // 声は出さないので口は動かさず、表情だけ
}

// ---- 層を見る・書き出す（この端末に保存するだけ。送信しない）
const layerNow = () => buildLayer({ surface: { id: surf.id, label: T("s." + surf.id), origin: surf.origin === "photo" ? "estimated-from-image" : "integrated-from-normal-map", material: surf.material }, params, heightAt, stroke: lastStroke });
function save() {
  const L = layerNow(), d = new Date(), pad = n => String(n).padStart(2, "0");
  const blob = new Blob([JSON.stringify(L, null, 1)], { type: "application/json" }), u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = `qualia-touch_${surf.id}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  say("aoi.save", 5000);
}
$("#bSave").addEventListener("click", save); $("#bSave2").addEventListener("click", save);
// 触覚の層の形を STL（3D プリント用・mm）で保存。この端末の中でつくるだけで、送信しない
function saveSTL() {
  const r = buildSTL(heightAt, params), d = new Date(), pad = n => String(n).padStart(2, "0");
  const blob = new Blob([r.buf], { type: "model/stl" }), u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = `qualia-touch_${surf.id}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.stl`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  say("aoi.stl", 6000);
  return r;
}
$("#bStl").addEventListener("click", saveSTL); $("#bStl2").addEventListener("click", saveSTL);
$("#bShow").addEventListener("click", () => {
  const L = layerNow(), short = JSON.stringify(L, (k, v) => typeof v === "string" && v.length > 80 ? v.slice(0, 48) + `…（${v.length}）` : v, 1);
  $("#layerPre").textContent = short; $("#dlgLayer").showModal();
});
$("#bAbout").addEventListener("click", () => $("#dlgAbout").showModal());
for (const d of document.querySelectorAll("dialog")) { d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) d.close(); }); }
$("#bReset").addEventListener("click", () => { params = { ...surf.p0 }; applyParams(); buildSliders(); dirty = 2; });
if (sonic.ok) { const b = $("#bSnd"); b.hidden = false; const show = () => { b.setAttribute("aria-pressed", String(sonic.on)); b.dataset.t = sonic.on ? "snd.on" : "snd.off"; b.textContent = T(b.dataset.t); }; show(); b.addEventListener("click", () => { sonic.setOn(!sonic.on); if (sonic.on) { sonic.wake(); sonic.tap(); } show(); }); }
document.addEventListener("visibilitychange", () => { if (document.hidden) sonic.sleep(); });
if (vibe.ok) { const b = $("#bVib"); b.hidden = false; b.addEventListener("click", () => { vibe.on = !vibe.on; b.setAttribute("aria-pressed", String(vibe.on)); b.dataset.t = vibe.on ? "vib.on" : "vib.off"; b.textContent = T(b.dataset.t); if (!vibe.on) vibe.stop(); }); }
for (const b of document.querySelectorAll("[data-lang]")) b.addEventListener("click", () => {
  setLang(b.dataset.lang);
  if (surf) $("#originT").textContent = T(surf.origin === "photo" ? "origin.photo" : "origin.normal");
  if (capKey) $("#cap").textContent = T(capKey);
});

// ---- 毎こま
let last = performance.now(), uiT = 0, frames = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = Math.min(100, now - last);
  const busyFrame = touch || Math.abs(model.dent) > .005 || camP.distanceToSquared(camT) > 1e-7 || dirty > 0 || trAge.some(a => a < 2.4);
  if (!busyFrame && dtMs < 33) return;   // 何も動いていないときは 30 こま/秒に
  last = now; const dt = dtMs / 1000; frames++;
  if (!surf) return;
  // 押す力：止まって押すほど強く、なぞるあいだは軽く（ペンなど押す強さが取れる端末はその値）
  const still = touch && now - lastMove > 80, target = !touch ? 0 : touch.pr ? touch.pr * FORCE_MAX : still ? FORCE_MAX * (1 - Math.exp(-(now - touch.t0) / 350)) : .45;
  force += (target - force) * Math.min(1, dt * 9);
  if (touch && now - lastMove > 30) model.idle(dtMs); else if (!touch) model.idle(dtMs);
  const dent = model.press(dt, force);
  U.uDent.value.set(dentAt.x, dentAt.y, dent / SIZE_MM);
  const r = model.measure();
  if (touch) { vibe.tick(now, r.amp); strokeMs += dtMs; if (!vibe.ok && strokeMs > 600 && !said.novib) say(sonic.ok && sonic.on ? "aoi.novib" : "aoi.novib.mute", 6000); if (strokeMs > 1400 && !said.stroke && r.speed > 30) say("aoi.stroke", 5500); if (dent > 1.2 && !said.press) say("aoi.press", 5500); }
  // 輪
  // 振動の代わりに目で：強く当たるほど輪が明るく、少し広がる
  ring.material.opacity += ((touch ? .55 + .45 * r.amp : 0) - ring.material.opacity) * Math.min(1, dt * 8);
  ring.position.set(dentAt.x, heightAt((dentAt.x + .5) * SIZE_MM, (-dentAt.y + .5) * SIZE_MM) * params.depth / SIZE_MM - dent / SIZE_MM * .6 + .002, -dentAt.y);
  ring.scale.setScalar(U.uDentR.value * (.9 + (touch ? .35 * r.amp : 0)));
  // 通り道の色（2.4 秒で消える）
  for (let i = 0; i < TR * 2; i++) { const a = trAge[i] += dt, o = Math.max(0, 1 - a / 2.4); trCol[i * 4] = .7; trCol[i * 4 + 1] = .92; trCol[i * 4 + 2] = 1; trCol[i * 4 + 3] = o; }
  trGeo.attributes.color.needsUpdate = true;
  // カメラ
  camP.lerp(camT, RM ? 1 : 1 - Math.exp(-dt * 4)); camera.position.copy(camP); camera.lookAt(look);
  // 目盛りの字
  const sp = new THREE.Vector3(0, 0, .6).project(camera), sl = $("#scaleL");
  sl.style.left = ((sp.x + 1) / 2 * stage.clientWidth) + "px"; sl.style.top = ((1 - sp.y) / 2 * stage.clientHeight + 4) + "px";
  // 数の表示（毎秒 10 回）
  if (now - uiT > 100) { uiT = now; $("#rSpeed").textContent = Math.round(r.speed); $("#rFreq").textContent = Math.round(r.freq); $("#rAmp").textContent = r.amp.toFixed(2); $("#rDent").textContent = Math.max(0, dent).toFixed(1); }
  drawWave();
  // 描く
  renderer.setScissorTest(false); renderer.setViewport(0, 0, stage.clientWidth, stage.clientHeight);
  renderer.setClearColor(0x03060f, 1); renderer.clear(); renderer.render(scene, camera);
  if (aoi) {
    aoi.tick(dt, aoiCam);
    const b = $("#aoiBox").getBoundingClientRect(), s = cv.getBoundingClientRect(), x = b.left - s.left, y = s.bottom - b.bottom;
    renderer.setScissorTest(true); renderer.setViewport(x, y, b.width, b.height); renderer.setScissor(x, y, b.width, b.height);
    aoiCam.aspect = b.width / b.height; aoiCam.updateProjectionMatrix();
    renderer.setClearColor(0x070d1a, 1); renderer.clear(); renderer.render(aoiScene, aoiCam); renderer.setScissorTest(false);
  }
  if (dirty > 0) dirty--;
}

// ---- はじめ
setLang(lang());
resize();
(async () => {
  try { applySurface(await loadSample(SAMPLES[0])); }
  catch (e) { console.error(e); }
  window.MLLoader?.done();
  requestAnimationFrame(frame);
  setTimeout(() => { if (!said.hello) hello(); }, 1600);
  setTimeout(loadAoi, 350);
  // ほかの見本は、手が空いたときに先に読んでおく
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1200));
  idle(() => SAMPLES.slice(1, 4).reduce((p, s) => p.then(() => loadSample(s).catch(() => {})), Promise.resolve()));
})();
window.__qt = { model, sonic, saveSTL, stl: (o) => buildSTL(heightAt, params, o), get params() { return params; }, get surf() { return surf; }, renderer, frames: () => frames };
