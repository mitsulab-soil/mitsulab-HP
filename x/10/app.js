/* Qualia/touch — 画像から表面へ、表面から触れ心地へ。© 2026 mitsulab. All rights reserved.
   選んだ画像はこの端末の中だけで処理する（fetch・送信・保存をしない）。
   表面は 10 cm 四方。凹凸（高さ）・法線・粗さの地図で 3D の面にし、押すとへこみ、なぞると振動の波が描かれる。 */
import * as THREE from "three";
import { T, setLang, lang } from "./i18n.js?v=20261021";
import { TouchModel, Vibe, Sonic, SIZE_MM, FORCE_MAX, buildLayer, buildSTL } from "./haptics.js?v=20261021";
import { SOUNDS } from "./sounds.js?v=20261021";
import { estimateFromFile, N as EN } from "./estimate.js";
import { OBJECTS, loadGeometry, applyRelief, geometrySTL } from "./objects.js?v=20261027i";

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE = matchMedia("(max-width: 899px)").matches;
const $ = s => document.querySelector(s);

// ---- 見本の表面（CC0。初期値は模式で、測った値ではない）
const SAMPLES = [
  { id: "bark",   mat: "Poly Haven — Japanese Zelkova Bark (CC0)", p: { hard: .78, rough: .8, depth: 3.5, fric: .7, spring: .15, warm: .65 } },
  { id: "soil",   mat: "Poly Haven — Farm Soil (CC0)",             p: { hard: .22, rough: .55, depth: 3.5, fric: .6, spring: .06, warm: .5 } },
  { id: "stone",  mat: "Poly Haven — Rock Surface (CC0)",          p: { hard: .98, rough: .5, depth: 2.5, fric: .5, spring: .02, warm: .12 } },
  { id: "moss",   mat: "Poly Haven — Moss Wood (CC0)",             p: { hard: .25, rough: .35, depth: 1.6, fric: .5, spring: .55, warm: .6 } },
  { id: "wood",   mat: "Poly Haven — Japanese Cedar Planks (CC0)", p: { hard: .7, rough: .25, depth: 1.2, fric: .35, spring: .1, warm: .72 } },
  { id: "cloth",  mat: "Poly Haven — Rough Linen (CC0)",           p: { hard: .3, rough: .45, depth: .8, fric: .55, spring: .45, warm: .78 } },
  { id: "metal",  mat: "Poly Haven — Rusty Metal 02 (CC0)",        p: { hard: 1, rough: .35, depth: .4, fric: .35, spring: .02, warm: .05 }, metal: .55 },
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
// 触れた音の素材（録音の出どころ＝sounds.js・資料/触れた音の出どころ.md）。見本の面は同じ名の音、選んだ画像は近い触れ心地の音から（あとで選びかえられる）
const SND_IDS = ["bark", "soil", "stone", "moss", "wood", "cloth", "metal", "leaves", "paper", "glass"];
const SND_P = { paper: { hard: .45, rough: .35 }, glass: { hard: 1, rough: .05 } };
const nearestSnd = p => { let best = "wood", bd = 9; for (const id of SND_IDS) { const q = SND_P[id] || SAMPLES.find(s => s.id === id).p, d = (q.hard - p.hard) ** 2 + (q.rough - p.rough) ** 2; if (d < bd) { bd = d; best = id; } } return best; };
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
mat.fog = false; const plate = new THREE.Mesh(geo, mat); plate.rotation.x = -Math.PI / 2; scene.add(plate);
// 台：上の面のない箱（へこみが台に隠れない深さ 10 mm の側面だけ）
{ const dark = new THREE.MeshStandardMaterial({ color: 0x0a0f1a, roughness: 1 }), none = new THREE.MeshBasicMaterial({ visible: false });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.002, .105, 1.002), [dark, dark, none, dark, dark, dark]); base.position.y = -.0535; base.userData.plate = true; scene.add(base); }
// 四隅の印と、10 cm の目盛り（事実の線）
{
  const L = [], c = .53, a = .06;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { L.push(sx * c, 0, sz * c, sx * c - sx * -a, 0, sz * c, sx * c, 0, sz * c, sx * c, 0, sz * c - sz * -a); }
  const z = .58; L.push(-.5, 0, z, .5, 0, z, -.5, 0, z - .015, -.5, 0, z + .015, .5, 0, z - .015, .5, 0, z + .015);
  for (let i = 1; i < 10; i++) L.push(-.5 + i / 10, 0, z - .007, -.5 + i / 10, 0, z + .007);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(L, 3));
  const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: .55 })); ls.userData.plate = true; scene.add(ls);
}
// 触れたところの輪（色＝温かさの感じ：ひんやり＝水の色、あたたか＝文化の色）
const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos(i / 64 * Math.PI * 2), 0, Math.sin(i / 64 * Math.PI * 2)))), new THREE.LineBasicMaterial({ color: 0x9bdcf0, transparent: true, opacity: 0 }));
scene.add(ring);
const COLD = new THREE.Color(0x78d6ec), WARM = new THREE.Color(0xf2cf8c);
// 指の通り道（細い線。2.4 秒で消える）
const TR = 900, trPos = new Float32Array(TR * 2 * 3), trCol = new Float32Array(TR * 2 * 4), trAge = new Float32Array(TR * 2).fill(99);
const trGeo = new THREE.BufferGeometry(); trGeo.setAttribute("position", new THREE.BufferAttribute(trPos, 3)); trGeo.setAttribute("color", new THREE.BufferAttribute(trCol, 4));
const trail = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
trail.frustumCulled = false; trail.userData.plate = true; scene.add(trail); let trW = 0;

// ---- デジタルの層（2026-10-27 本人「デジタルとフィジカルの融合」）：写真の面の上に、点群・走査線・地の光のグリッドを薄く重ねる
scene.fog = new THREE.FogExp2(0x03060f, .22);
{ const L = [], C = [], E = 1.6, S = .1;
  const n = Math.round(2 * E / S);   // 線を短い区間に分けて、中心から遠いほど薄くする
  for (let a = 0; a <= n; a++) for (let k = 0; k < n; k++) { const v = -E + a * S, u0 = -E + k * S, u1 = u0 + S; L.push(u0, -.106, v, u1, -.106, v, v, -.106, u0, v, -.106, u1); }
  for (let i = 0; i < L.length; i += 3) { const r = Math.hypot(L[i], L[i + 2]), o = Math.pow(Math.max(0, 1 - r / E), 1.6) * (r < .56 ? .3 : 1); C.push(o * .5, o * .9, 1 * o); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(L, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }))); }
const CN = MOBILE ? 64 : 96, cPos = new Float32Array(CN * CN * 3);
const cloudU = { uScan: { value: 0 }, uSize: { value: (MOBILE ? 2.2 : 2.4) * Math.min(devicePixelRatio, 2) } };
const cloud = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(cPos, 3)), new THREE.ShaderMaterial({
  uniforms: cloudU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: "uniform float uScan, uSize; varying float vA; void main(){ float d = position.z - uScan; vA = .2 + .75 * exp(-d * d / .0008); gl_PointSize = uSize * (.8 + .6 * vA); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
  fragmentShader: "varying float vA; void main(){ vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard; gl_FragColor = vec4(.66, .95, .97, vA * .45); }" }));
cloud.frustumCulled = false; cloud.userData.plate = true; scene.add(cloud);
const SCN = 128, scPos = new Float32Array(SCN * 3);
const scan = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(scPos, 3)), new THREE.LineBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false }));
scan.frustumCulled = false; scan.userData.plate = true; scene.add(scan);
function updateCloud() {
  if (!params) return; const k = params.depth / SIZE_MM;
  for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) { const x = (i + .5) / CN, y = (j + .5) / CN, n = (j * CN + i) * 3; cPos[n] = x - .5; cPos[n + 1] = heightAt(x * SIZE_MM, y * SIZE_MM) * k + .004; cPos[n + 2] = y - .5; }
  cloud.geometry.attributes.position.needsUpdate = true;
}
// ---- 触れ心地の計器（3D）：右に 4 本の光の柱＝速さ・振動・強さ・へこみ、その奥に硬さ・あたたかさの目盛り。数値と連動する
const GX = .8, GAUGE = [], UNIT = ["mm/s", "Hz", "", "mm"];
const gLab = (t) => { const c = document.createElement("canvas"); c.width = 320; c.height = 64; const x = c.getContext("2d");
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); s.scale.set(.4, .08, 1);
  s.userData.draw = v => { x.clearRect(0, 0, 320, 64); x.textAlign = "center"; x.font = '600 32px "Shippori Mincho","Hiragino Mincho ProN",serif'; x.fillStyle = "#eef5fb"; x.fillText(t + "  " + v, 160, 44); tx.needsUpdate = true; };
  s.userData.draw("0"); return s; };
let gT = 0;
["速さ", "振動", "強さ", "へこみ"].forEach((name, i) => {
  const z = -.36 + i * .24, g = new THREE.Group(); if (MOBILE) g.position.set(-.36 + i * .24, -.1, -.68); else g.position.set(GX, -.1, z);   // スマホは面の奥に横一列
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.05, .32, .05)), new THREE.LineBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: .35 })); frame.position.y = .16; g.add(frame);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(.036, 1, .036), new THREE.MeshBasicMaterial({ color: [0x78d6ec, 0xb4a2ff, 0xf2cf8c, 0x7fe0b4][i], transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false }));
  bar.scale.y = .001; g.add(bar); const lab = gLab(name); lab.position.set(0, MOBILE ? .4 : -.06, .02); if (MOBILE) lab.visible = false;   // スマホの値は下の欄に任せる g.add(lab);
  scene.add(g); GAUGE.push({ bar, v: 0, lab });
});
// 振動の波：計器の上に 3D の線で（強さで振れ幅、振動数で山の数）
const WN = 96, wPos = new Float32Array(WN * 3); const wave3 = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(wPos, 3)), new THREE.LineBasicMaterial({ color: 0xb4a2ff, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
wave3.frustumCulled = false; scene.add(wave3); let wPh = 0;
function gauges(r, dent, dt) {
  const tgt = [Math.min(1, r.speed / 200), Math.min(1, r.freq / 300), Math.min(1, r.amp), Math.min(1, Math.max(0, dent) / 4)];
  GAUGE.forEach((g, i) => { g.v += (tgt[i] - g.v) * Math.min(1, dt * 8); const h = Math.max(.002, g.v * .32); g.bar.scale.y = h; g.bar.position.y = h / 2; });
  gT += dt; if (gT > .25) { gT = 0; const v = [Math.round(r.speed) + " mm/s", Math.round(r.freq) + " Hz", r.amp.toFixed(2), Math.max(0, dent).toFixed(1) + " mm"]; GAUGE.forEach((g, i) => { if (g.last !== v[i]) { g.last = v[i]; g.lab.userData.draw(v[i]); } }); }
  wPh += dt * (2 + r.freq / 30); const A = .02 + .09 * r.amp, k = 2 + r.freq / 40;
  for (let i = 0; i < WN; i++) { const u = i / (WN - 1), y = (MOBILE ? .42 : .36) + Math.sin(u * Math.PI * 2 * k - wPh) * A * Math.sin(u * Math.PI); if (MOBILE) { wPos[i * 3] = -.45 + u * .9; wPos[i * 3 + 1] = y; wPos[i * 3 + 2] = -.82; } else { wPos[i * 3] = GX; wPos[i * 3 + 1] = y; wPos[i * 3 + 2] = -.4 + u * .8; } }
  wave3.geometry.attributes.position.needsUpdate = true;
}
function updateScan(t) {
  if (!params || objMesh) { scan.visible = false; return; } const z = ((t * .09) % 1.3) - .65; cloudU.uScan.value = z; const k = params.depth / SIZE_MM, inside = Math.abs(z) < .5;
  scan.visible = inside; if (!inside) return; const y = (z + .5) * SIZE_MM;
  for (let i = 0; i < SCN; i++) { const x = i / (SCN - 1); scPos[i * 3] = x - .5; scPos[i * 3 + 1] = heightAt(x * SIZE_MM, y) * k + .005; scPos[i * 3 + 2] = z; }
  scan.geometry.attributes.position.needsUpdate = true;
}

// ---- 表面の中身
let H = new Float32Array(EN * EN), HN = EN;          // 凹凸（0..1）
const heightAt = (xmm, ymm) => {                       // x：左→右、y：奥（上の行）→手前
  const fx = Math.min(HN - 1.001, Math.max(0, xmm / SIZE_MM * HN - .5)), fy = Math.min(HN - 1.001, Math.max(0, ymm / SIZE_MM * HN - .5));
  const x = fx | 0, y = fy | 0, tx = fx - x, ty = fy - y, i = y * HN + x;
  return (H[i] * (1 - tx) + H[i + 1] * tx) * (1 - ty) + (H[i + HN] * (1 - tx) + H[i + HN + 1] * tx) * ty;
};
let surf = null, params = null;
const model = new TouchModel(), vibe = new Vibe(), sonic = new Sonic(SOUNDS);
vibe.onPulse = (ms, amp) => sonic.grain(ms, amp, model.speed);   // 振動と同じ刻みで、触れた音の一粒
const cache = new Map(), maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const tex = (src, srgb) => { const t = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = maxAniso; t.needsUpdate = true; return t; };
const img = url => new Promise((ok, ng) => { const i = new Image(); i.decoding = "async"; i.onload = () => ok(i); i.onerror = ng; i.src = url; });
function heightFrom(image) {
  const c = document.createElement("canvas"); c.width = c.height = EN; const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(image, 0, 0, EN, EN); const d = g.getImageData(0, 0, EN, EN).data, h = new Float32Array(EN * EN);
  for (let i = 0; i < EN * EN; i++) h[i] = d[i * 4] / 255; return { h, c };
}
// 形を立てる地図だけ、少しならす（近くへ寄っても、細い針のような三角が立たない）。触れ心地の計算は元の凹凸のまま
function softDisp(h, r = 2, passes = 2) {
  const n = EN, a = Float32Array.from(h), b = new Float32Array(n * n), w = 2 * r + 1;
  for (let k = 0; k < passes; k++) for (const [src, dst, hor] of [[a, b, true], [b, a, false]]) {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let s = 0; for (let t = -r; t <= r; t++) { const x = hor ? Math.min(n - 1, Math.max(0, i + t)) : i, y = hor ? j : Math.min(n - 1, Math.max(0, j + t)); s += src[y * n + x]; } dst[j * n + i] = s / w; }
  }
  const c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"), im = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = Math.round(a[i] * 255); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
}
async function loadSample(s) {
  if (cache.has(s.id)) return cache.get(s.id);
  const [c, n, r, hi] = await Promise.all(["c", "n", "r", "h"].map(k => img(`tex/${s.id}_${k}.webp?v=20261021`)));
  const { h } = heightFrom(hi), hc = softDisp(h);
  const v = { id: s.id, origin: "normal-map", material: s.mat, map: tex(c, true), normalMap: tex(n), roughMap: tex(r), dispMap: tex(hc), H: h, p0: { ...s.p }, metal: s.metal || 0, nBase: 1, snd: s.id };
  cache.set(s.id, v); return v;
}
function applySurface(v, keepParams = false) {
  surf = v; H = v.H; HN = EN;
  mat.map = v.map; mat.normalMap = v.normalMap; mat.roughnessMap = v.roughMap; mat.displacementMap = v.dispMap; mat.metalness = v.metal; mat.needsUpdate = true;
  if (!keepParams) params = { ...v.p0 };
  applyParams(); buildSliders(); setSnd(v.snd);
  $("#originT").textContent = T(v.origin === "photo" ? "origin.photo" : "origin.normal");
  for (const b of document.querySelectorAll(".chip")) b.setAttribute("aria-pressed", String(b.dataset.s === v.id));
}
// ---- 形に貼る（触覚の mixed reality）
let objMesh = null, objDef = null, objHit = null; const _nq = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const objMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: .55, side: THREE.DoubleSide });
const cloneTex = (t, rep) => { if (!t) return null; const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rep[0], rep[1]); c.needsUpdate = true; return c; };
function relief() {
  applyRelief(objMesh.geometry, objDef.rep, (u, v) => heightAt(u * SIZE_MM, (1 - v) * SIZE_MM), params.depth / SIZE_MM * .55, objDef.pole);
  for (const k of ["map", "normalMap", "roughnessMap"]) objMat[k]?.dispose();
  objMat.map = cloneTex(mat.map, objDef.rep); objMat.normalMap = cloneTex(mat.normalMap, objDef.rep); objMat.roughnessMap = cloneTex(mat.roughnessMap, objDef.rep);
  objMat.color.setRGB(...(objDef.tint || [1, 1, 1])); objMat.metalness = mat.metalness; objMat.roughness = mat.roughness; objMat.normalScale.copy(mat.normalScale); objMat.needsUpdate = true; dirty = 2;
}
async function setObject(id) {
  if (objMesh) { scene.remove(objMesh); objMesh.geometry.dispose(); objMesh = null; objHit = null; }
  objDef = OBJECTS.find(o => o.id === id) || null;
  for (const o of scene.children) if (o.userData.plate) o.visible = !objDef;
  plate.visible = !objDef; $("#scaleL").hidden = !!objDef;
  for (const b of document.querySelectorAll(".objchip")) b.setAttribute("aria-pressed", String((b.dataset.o || null) === id));
  $("#bGlb").hidden = !objDef;
  if (!objDef) { aoi?.motion.lookAt(null); return; }
  const want = objDef; let g; try { busy(true); g = await loadGeometry(objDef); } finally { busy(false); } if (objDef !== want) { g.dispose(); return; }
  objMesh = new THREE.Mesh(g, objMat); objMesh.castShadow = true; scene.add(objMesh); relief();
  const c = new THREE.Vector3(0, .15, 0); if (aoi) aoi.place(AOI_X, -.08, Math.atan2(-AOI_X, .08)); aoi?.motion.point?.(c, 2.6);   // 形のほうを向いて示す aoi?.motion.lookAt(c); aoi?.motion.express("curious", .5, 2.4);
  say("aoi.obj", 6500);
}
function applyParams() {
  const p = params; mat.displacementScale = p.depth / SIZE_MM;
  const ns = (p.depth / Math.max(.3, surf.p0.depth)) ** .6 * (.55 + .9 * p.rough) / (.55 + .9 * surf.p0.rough) * surf.nBase;
  mat.normalScale.set(ns, ns);
  mat.roughness = .55 + .45 * p.rough;
  U.uDentR.value = (5 + 7 * (1 - p.hard)) / SIZE_MM;
  ring.material.color.copy(COLD).lerp(WARM, p.warm);
  model.setSurface(heightAt, p); sonic.setSurface(p, surf.p0);
  updateCloud(); if (objMesh) relief();
}

// ---- 触れた音の素材を選ぶ
const sMat = $("#sMat");
function fillSnd() { const v = sMat.value; sMat.textContent = ""; for (const id of SND_IDS) { const o = document.createElement("option"); o.value = id; o.textContent = T("m." + id); sMat.append(o); } if (v) sMat.value = v; }
function setSnd(id) { if (surf) surf.snd = id; sMat.value = id; sonic.setMaterial(id); }
fillSnd();
sMat.addEventListener("change", () => { setSnd(sMat.value); sonic.wake(); setTimeout(() => sonic.tap(), 160); });

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
  b.innerHTML = `<img src="tex/${s.id}_t.webp?v=20261021" alt="" width="48" height="48" loading="lazy"><span><b data-t="s.${s.id}">${T("s." + s.id)}</b><small data-t="s.${s.id}.sub">${T("s." + s.id + ".sub")}</small></span>`;
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
    photoSurf = { id: "photo", origin: "photo", material: null, map: tex(r.color, true), normalMap: tex(r.normalCanvas), roughMap: tex(r.roughCanvas), dispMap: tex(softDisp(r.height)), H: r.height, p0: r.params, metal: 0, nBase: 1, snd: nearestSnd(r.params) };
    const tc = $("#photoThumb").getContext("2d"); tc.drawImage(r.color, 0, 0, 48, 48);
    photoChip.hidden = false; applySurface(photoSurf); say("aoi.photo", 7500); aoiReact();
  } catch (err) { console.warn(err); $("#err").textContent = T("err.photo"); $("#err").hidden = false; }
  finally { busy(false); }
}
$("#fPick").addEventListener("change", onFile); $("#fShoot").addEventListener("change", onFile);
function busy(on) { $("#busy").hidden = !on; }

// ---- 見る向き（回す・傾ける・寄る・ずらす）。V＝いま、G＝向かう先
const VIEWS = [{ el: .9, d: 1 }, { el: 1.53, d: .98 }, { el: .36, d: 1.05 }];   // 斜め・真上・低く
const Z_MIN = .5, Z_MAX = 1.8, EL_MIN = .1, EL_MAX = 1.55, T0 = MOBILE ? .3 : .1;   // 下の帯（波・字幕）のぶん、面を少し上へ
let view = 0, baseD = 2;
const V = { az: 0, el: VIEWS[0].el, zoom: 1, tx: 0, tz: T0 }, G = { ...V };
const look = new THREE.Vector3();
let fitAspect = 1;
function fitDist() {
  const a = fitAspect, vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * a);
  baseD = Math.max((MOBILE ? .8 : .98) / Math.tan(hf / 2), .78 / Math.tan(vf / 2)) * (MOBILE ? 1.22 : 1.08);
}
const markFree = () => { const n = $("#viewName"); if (n.dataset.t !== "view.free") { n.dataset.t = "view.free"; n.textContent = T("view.free"); } };
const clampG = () => { G.zoom = Math.min(Z_MAX, Math.max(Z_MIN, G.zoom)); G.el = Math.min(EL_MAX, Math.max(EL_MIN, G.el)); G.tx = Math.min(.55, Math.max(-.55, G.tx)); G.tz = Math.min(.6, Math.max(-.55, G.tz)); dirty = 2; };
function setView(i) { view = i; Object.assign(G, { az: 0, el: VIEWS[i].el, zoom: 1, tx: 0, tz: T0 }); $("#viewName").dataset.t = "view." + i; $("#viewName").textContent = T("view." + i); clampG(); }
const viewMoving = () => Math.abs(V.az - G.az) + Math.abs(V.el - G.el) + Math.abs(V.zoom - G.zoom) * .5 + Math.abs(V.tx - G.tx) + Math.abs(V.tz - G.tz) > 2e-4;
function placeCam(dt) {
  const k = RM ? 1 : 1 - Math.exp(-dt * 14);
  for (const key of ["az", "el", "zoom", "tx", "tz"]) V[key] += (G[key] - V[key]) * k;
  const d = baseD * VIEWS[view].d * V.zoom; look.set(V.tx, 0, V.tz);
  camera.position.set(V.tx + d * Math.sin(V.az) * Math.cos(V.el), d * Math.sin(V.el), V.tz + d * Math.cos(V.az) * Math.cos(V.el));
  camera.lookAt(look);
}
$("#bView").addEventListener("click", () => setView((view + 1) % VIEWS.length));
$("#bHome").addEventListener("click", () => { setView(0); say("aoi.home", 3500); });
// ずらす：画面の dx, dy（px）だけ、面を指についてこさせる
function pan(dx, dy) {
  if (dx || dy) markFree();
  const u = 2 * baseD * VIEWS[view].d * G.zoom * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / Math.max(1, stage.clientHeight);
  const c = Math.cos(G.az), s = Math.sin(G.az), f = dy * u / Math.max(.4, Math.sin(G.el));
  G.tx += -c * dx * u - s * f; G.tz += s * dx * u - c * f; clampG();
}
function orbit(dx, dy) { markFree(); G.az -= dx * .008; G.el += dy * .006; clampG(); }
// 寄る：k<1 で近く。sx, sy の下の点（面の上）へ向かって寄る
function zoomAt(k, sx, sy) {
  markFree(); const z0 = G.zoom; G.zoom = Math.min(Z_MAX, Math.max(Z_MIN, z0 * k)); const r = G.zoom / z0;
  const h = sx == null ? null : toPlate({ clientX: sx, clientY: sy });
  if (h && r !== 1) { G.tx += (h.x - G.tx) * (1 - r); G.tz += (h.z - G.tz) * (1 - r); }
  clampG();
}
// なでる／動かす（スマホは一本の指の役目を切りかえる。二本の指はいつでも寄る・回す・ずらす）
let mode = "stroke";
function setMode(m, quiet) {
  mode = m; cv.classList.toggle("move", m === "move");
  for (const b of document.querySelectorAll("[data-mode]")) b.setAttribute("aria-pressed", String(b.dataset.mode === m));
  if (!quiet) say(m === "move" ? (MOBILE ? "aoi.move" : "aoi.move.pc") : "aoi.strokemode", 5500);
}
for (const b of document.querySelectorAll("[data-mode]")) b.addEventListener("click", () => setMode(b.dataset.mode));
cv.addEventListener("wheel", e => { e.preventDefault(); zoomAt(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * .004), e.clientX, e.clientY); }, { passive: false });
cv.addEventListener("contextmenu", e => e.preventDefault());
addEventListener("keydown", e => {
  if (e.target.closest && e.target.closest("input,select,textarea,dialog") || e.metaKey || e.ctrlKey || e.altKey) return;
  const step = 34, K = e.key; let used = true;
  if (K === "ArrowLeft") e.shiftKey ? orbit(-step, 0) : pan(step, 0);
  else if (K === "ArrowRight") e.shiftKey ? orbit(step, 0) : pan(-step, 0);
  else if (K === "ArrowUp") e.shiftKey ? orbit(0, -step) : pan(0, step);
  else if (K === "ArrowDown") e.shiftKey ? orbit(0, step) : pan(0, -step);
  else if (K === "+" || K === "=" || K === ";") zoomAt(.8);
  else if (K === "-" || K === "_") zoomAt(1.25);
  else if (K === "0" || K === "Home") setView(0);
  else used = false;
  if (used) e.preventDefault();
});

// ---- 大きさ
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false);
  // PC：3D は画面いっぱい、右の板の下まで続く。面の中心は板の左の真ん中へ（2026-10-27 全アプリ 3D 化）
  const PO = innerWidth >= 900 ? Math.min(380, w * .3) : 0;
  camera.aspect = (w + PO) / h; fitAspect = (w - PO) / h;
  if (PO) camera.setViewOffset(w + PO, h, PO, 0, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix(); fitDist();
  const wv = $("#wv"), dp = Math.min(devicePixelRatio, 2); wv.width = wv.clientWidth * dp; wv.height = wv.clientHeight * dp;
  dirty = 2;
}
addEventListener("resize", resize);

// ---- 触れる・動かす
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), flat = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
const toPlate = e => { const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (objMesh) {   // 形に貼ったとき：形の表面の触れた所を、触覚の地図の上の位置に読みかえる
    const h = ray.intersectObject(objMesh)[0]; if (!h || !h.uv) return null; objHit = h;
    const u = (h.uv.x * objDef.rep[0]) % 1, v = (h.uv.y * objDef.rep[1]) % 1; return new THREE.Vector3(u - .5, 0, .5 - v);
  }
  return ray.ray.intersectPlane(flat, hitP) ? hitP.clone() : null; };
const inside = p => p && Math.abs(p.x) <= .5 && Math.abs(p.z) <= .5;
let touch = null, force = 0, dentAt = new THREE.Vector2(), lastMove = 0, lastStroke = [], strokeMs = 0, said = {}, dirty = 2;
const ptrs = new Map(); let drag = null, pinch = null;   // drag＝一本の指・マウスで回す／ずらす、pinch＝二本の指
const mm = p => [(p.x + .5) * SIZE_MM, (p.z + .5) * SIZE_MM];
const two = () => { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
cv.addEventListener("pointerdown", e => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); cv.setPointerCapture(e.pointerId); e.preventDefault();
  if (ptrs.size === 2) {   // 二本目の指：なでるのをやめて、寄る・回す・ずらすへ
    if (touch) endStroke(); drag = null; pinch = { ...two(), lastX: 0, lastY: 0 }; pinch.lastX = pinch.x; pinch.lastY = pinch.y; return;
  }
  if (ptrs.size > 2 || pinch) return;
  const p = toPlate(e), btn = e.button;
  if (btn === 2 || btn === 1 || e.shiftKey) { drag = { kind: "pan", x: e.clientX, y: e.clientY }; cv.classList.add("grabbing"); return; }
  if (mode === "move" || !inside(p)) { drag = { kind: "orbit", x: e.clientX, y: e.clientY }; cv.classList.add("grabbing"); return; }
  touch = { id: e.pointerId, p, t: e.timeStamp, t0: performance.now(), pen: e.pointerType !== "mouse" && e.pressure > 0 && e.pressure !== .5 };
  dentAt.set(p.x, -p.z); model.recording = true; model.stroke = []; sonic.wake(); vibe.tap(); sonic.tap(); addTrail(p, p, true);
  $("#waveHint").style.opacity = 0; aoiWatch(true);
  if (capKey === "aoi.name") { clearTimeout(capTimer); $("#cap").classList.remove("on"); capKey = null; }   // 2026-10-22 なではじめたら名乗りの字幕をたたむ（面を覆わない）
});
cv.addEventListener("pointermove", e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size >= 2) {
    const g = two(); zoomAt(pinch.d / Math.max(10, g.d), g.x, g.y);
    let da = g.ang - pinch.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
    G.az -= da; pan(g.x - pinch.lastX, g.y - pinch.lastY);
    Object.assign(pinch, { d: g.d, ang: g.ang, lastX: g.x, lastY: g.y }); said.zoomhint = true; return;
  }
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.kind === "pan" ? pan(dx, dy) : orbit(dx, dy); said.zoomhint = true; return; }
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
function endStroke() { touch = null; model.recording = false; if (model.stroke.length > 20) lastStroke = model.stroke.slice(); vibe.stop(); aoiWatch(false); }
const end = e => {
  ptrs.delete(e.pointerId);
  if (pinch) { if (ptrs.size < 2) pinch = null; return; }   // 残った指では何もしない（指をすべて離してから次へ）
  if (drag) { drag = null; cv.classList.remove("grabbing"); return; }
  if (!touch || e.pointerId !== touch.id) return;
  endStroke();
  if (!said.zoomhint && strokeMs > 900) { said.zoomhint = true; setTimeout(() => { if (!touch && !capKey) say(MOBILE ? "aoi.zoom" : "aoi.zoom.pc", 7000); }, 900); }
};
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
  const w = wv.width, h = wv.height, buf = model.buf, n = buf.length, span = 1500, mid = h * .5;   // 上の案内の一行と、下の数の行のあいだ
  wg.clearRect(0, 0, w, h); const amp = h * .22;
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
    aoi = await K.loadAoi(AOI_URL, { scene, height: MOBILE ? .6 : .5, wind: .15, posture: "upright", quality: MOBILE ? "mid" : "low" });
    aoi.root.position.y = -.106; aoi.place(AOI_X, -.08, .35);
    { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,.7)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(.28, .28), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(AOI_X, -.104, -.08); scene.add(sh);
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, i) => new THREE.Vector3(Math.cos(i / 48 * Math.PI * 2) * .12, 0, Math.sin(i / 48 * Math.PI * 2) * .12))), new THREE.LineBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: .5 })); ring.position.set(AOI_X, -.103, -.08); scene.add(ring); }   // 2026-10-27 本人「碧はどのアプリでも 3D 空間の中に 3D で」：触覚の板の左に、小さく立つ
    if (!said.hello) hello();
  } catch (e) { console.warn("碧を読めませんでした", e); }
}
const AOI_X = -.78;
const LOOK = new THREE.Vector3(0, .02, 0);
function aoiWatch(on) { aoi?.motion.lookAt(on ? LOOK : null); }
function aoiReact() { aoi?.motion.express("curious", .55, 2.4); }

// ---- 碧の字幕
// はじめに一度だけ名乗り、そのあとに触れ方を伝える（触れはじめたら名乗りは切りあげる）
function hello() { said.hello = true; say("aoi.name", 8600); setTimeout(() => { if (capKey === "aoi.name" || !capKey) say("aoi.hello", 8000); }, 8800); }   // 2026-10-22 名乗りが長くなったので、読み終えるまで出す
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
  if (objMesh) { const d = new Date(), pad = n => String(n).padStart(2, "0"); dl(new Blob([geometrySTL(objMesh.geometry)], { type: "model/stl" }), `qualia-touch_${objDef.id}_${surf.id}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.stl`); say("aoi.stl", 6000); return; }
  const r = buildSTL(heightAt, params), d = new Date(), pad = n => String(n).padStart(2, "0");
  const blob = new Blob([r.buf], { type: "model/stl" }), u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = `qualia-touch_${surf.id}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.stl`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  say("aoi.stl", 6000);
  return r;
}
$("#bStl").addEventListener("click", saveSTL); $("#bStl2").addEventListener("click", saveSTL);
function dl(blob, name) { const u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
// 形と質感をそのまま GLB に（three.js の GLTFExporter・MIT。押したときだけ読む）
$("#bGlb").addEventListener("click", async () => {
  if (!objMesh) return; const { GLTFExporter } = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/exporters/GLTFExporter.js");
  const m = objMesh.clone(); m.scale.setScalar(.1);   // 1 単位＝10 cm → メートル
  new GLTFExporter().parse(m, r => { dl(new Blob([r], { type: "model/gltf-binary" }), `qualia-touch_${objDef.id}_${surf.id}.glb`); say("aoi.glb", 6000); }, e => console.warn(e), { binary: true });
});
{ const box = $("#objChips");
  const mk = (id, name, sub) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip objchip"; if (id) b.dataset.o = id; b.setAttribute("aria-pressed", String(!id)); b.innerHTML = `<span><b>${name}</b><small>${sub}</small></span>`; b.addEventListener("click", () => setObject(id)); box.append(b); };
  mk(null, "板", "10 cm 四方の面"); for (const o of OBJECTS) mk(o.id, o.name, o.sub); }
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
  fillSnd();
});

// ---- 毎こま
let last = performance.now(), uiT = 0, frames = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dtMs = Math.min(100, now - last);
  const busyFrame = touch || drag || pinch || Math.abs(model.dent) > .005 || viewMoving() || dirty > 0 || trAge.some(a => a < 2.4);
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
  if (objMesh && objHit) { ring.position.copy(objHit.point); _nq.copy(objHit.face.normal).transformDirection(objMesh.matrixWorld); ring.quaternion.setFromUnitVectors(_up, _nq); ring.position.addScaledVector(_nq, .004); } else ring.quaternion.identity();
  // 通り道の色（2.4 秒で消える）
  for (let i = 0; i < TR * 2; i++) { const a = trAge[i] += dt, o = Math.max(0, 1 - a / 2.4); trCol[i * 4] = .7; trCol[i * 4 + 1] = .92; trCol[i * 4 + 2] = 1; trCol[i * 4 + 3] = o; }
  trGeo.attributes.color.needsUpdate = true;
  gauges(r, dent, dt);
  // カメラ
  placeCam(dt);
  updateScan(now / 1000);
  // 目盛りの字
  const sp = new THREE.Vector3(0, 0, .6).project(camera), sl = $("#scaleL");
  sl.style.left = ((sp.x + 1) / 2 * stage.clientWidth) + "px"; sl.style.top = ((1 - sp.y) / 2 * stage.clientHeight + 4) + "px"; const ctlTop = $("#ctl").offsetTop, sy = (1 - sp.y) / 2 * stage.clientHeight + 4; sl.style.visibility = Math.abs(sp.x) < .92 && sy > 40 && sy + 14 < ctlTop && sp.z < 1 ? "" : "hidden";
  // 数の表示（毎秒 10 回）
  if (now - uiT > 100) { uiT = now; $("#rSpeed").textContent = Math.round(r.speed); $("#rFreq").textContent = Math.round(r.freq); $("#rAmp").textContent = r.amp.toFixed(2); $("#rDent").textContent = Math.max(0, dent).toFixed(1); }
  drawWave();
  // 描く
  renderer.setScissorTest(false); renderer.setViewport(0, 0, stage.clientWidth, stage.clientHeight);
  renderer.setClearColor(0x03060f, 1); renderer.clear(); renderer.render(scene, camera);
  if (aoi) {
    aoi.tick(dt, camera);   // 碧は同じ 3D 空間の中（別の枠では描かない）
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
window.__qt = { model, sonic, V, G, setMode, zoomAt, saveSTL, stl: (o) => buildSTL(heightAt, params, o), get params() { return params; }, get surf() { return surf; }, renderer, frames: () => frames };
