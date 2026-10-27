/* Qualia/song ── 曲の中に入る 3D（2026-10-27 本人「song も 2D でなく、3D で没入できるようにしてください」）
   碧（aoi.vrm・AoiMotion）が杜の空き地の真ん中に立って歌い、口と身ぶりは曲の音の大きさに合わせる。
   映像の中にあった「地を這う線（根と水）」「光の木」「声の輪」「宙の 0 と 1」は、見る人のまわりの空間そのものとして広がる。
   ドラッグで回り、地面を押すとそこへ歩く。ホイール・ピンチで寄る。MV の映像は小さな窓（切りかえ）で残す。
   共通部品＝kit/atmosphere.js・kit/layers.js・kit/aoi.js（AoiMotion）。写真の素材は読まない（起動を軽く）。 */
import * as THREE from "three";
import { applyAtmosphere, fitRenderer } from "./kit/atmosphere.js";
import { LAYER, lineMaterial, pointMaterial, contours, drift, textSprite } from "./kit/layers.js";

const v = document.getElementById("mv"), cv = document.getElementById("stage");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" }); }
catch (e) { cv.remove(); document.body.classList.add("no3d"); throw e; }
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, .1, 600);
applyAtmosphere(renderer, scene, "aoi_hour", { fogDensity: .03 });
const fit = fitRenderer(renderer, camera, cv);
const mobile = fit.mobile;
const geo = a => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---- 音：曲の大きさ（口・輪・木の明るさを合わせる）。押して再生したあとに一度だけつなぐ
let an = null, buf = null, level = 0, beat = 0;
function hookAudio() {
  if (an) return; try {
    const ac = new (window.AudioContext || window.webkitAudioContext)(), src = ac.createMediaElementSource(v);
    an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an); an.connect(ac.destination); buf = new Uint8Array(an.fftSize);
    v.addEventListener("play", () => ac.resume());
  } catch (e) { an = null; }
}
v.addEventListener("play", hookAudio, { once: true });
const readLevel = () => {
  if (!an || v.paused) { level += (0 - level) * .1; return level; }
  an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const x = (buf[i] - 128) / 128; s += x * x; }
  const r = Math.min(1, Math.sqrt(s / buf.length) * 3.2); level += (r - level) * (r > level ? .5 : .12); return level;
};

// ---- 地面：ゆるい起伏。面は暗く、形は等高線
const heightAt = (x, z) => .18 * Math.sin(x * .23 + 1.3) * Math.cos(z * .19) + .1 * Math.sin((x + z) * .41);
const gGeo = new THREE.PlaneGeometry(90, 90, 90, 90); gGeo.rotateX(-Math.PI / 2);
const gp = gGeo.attributes.position; for (let i = 0; i < gp.count; i++) gp.setY(i, heightAt(gp.getX(i), gp.getZ(i)) - .01);
gGeo.computeVertexNormals();
scene.add(new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: .95 })));
scene.add(contours(heightAt, { x0: -28, x1: 28, z0: -28, z1: 28, cell: mobile ? .8 : .55, step: .07, color: LAYER.base, opacity: .26 }));

// ---- 地を這う線：碧の足もとから四方へ、根と水の道が分かれながら広がる（見る人の足もとまで）
const roots = [], flowP = [];
const grow = (x, z, a, len, depth) => {
  let px = x, pz = z;
  for (let k = 0; k < len; k++) {
    a += (rnd() - .5) * .45; const nx = px + Math.cos(a) * .5, nz = pz + Math.sin(a) * .5;
    roots.push(px, heightAt(px, pz) + .03, pz, nx, heightAt(nx, nz) + .03, nz); flowP.push([px, pz, nx, nz]); px = nx; pz = nz;
    if (depth < 3 && rnd() < .1) grow(px, pz, a + (rnd() < .5 ? -.7 : .7), len * .55 | 0, depth + 1);
  }
};
for (let i = 0; i < (mobile ? 10 : 16); i++) { const a = i / (mobile ? 10 : 16) * Math.PI * 2 + rnd() * .2; grow(Math.cos(a) * .4, Math.sin(a) * .4, a, 30, 0); }
scene.add(new THREE.LineSegments(geo(roots), lineMaterial(LAYER.water, mobile ? .3 : .4)));
const NF = mobile ? 160 : 340, fP = new Float32Array(NF * 3), fS = []; for (let i = 0; i < NF; i++) fS.push({ k: rnd() * flowP.length | 0, t: rnd() });
const flow = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(fP, 3)), pointMaterial(LAYER.water, .07, .9));
flow.frustumCulled = false; scene.add(flow);

// ---- 光の木：見る人と碧をぐるりと囲む、ガラスのような光の筒。水が梢へのぼる
const trunkMat = new THREE.MeshBasicMaterial({ color: LAYER.nature, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false });
const treeLines = [], tips = [], tubeM = [];
const branch = (p, dir, len, r, depth) => {
  const q = p.clone().addScaledVector(dir, len), o = new THREE.Object3D();
  o.position.copy(p).lerp(q, .5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); o.scale.set(r, len, r); o.updateMatrix(); tubeM.push(o.matrix.clone());
  treeLines.push(p.x, p.y, p.z, q.x, q.y, q.z);
  if (depth >= (mobile ? 3 : 4)) { tips.push(q.x, q.y, q.z); return; }
  for (let k = 0; k < 2 + (rnd() < .4); k++) branch(q, dir.clone().add(new THREE.Vector3((rnd() - .5) * 1.1, .35 + rnd() * .4, (rnd() - .5) * 1.1)).normalize(), len * (.62 + rnd() * .12), r * .62, depth + 1);
};
const NT = mobile ? 9 : 14;
for (let i = 0; i < NT; i++) { const a = i / NT * Math.PI * 2 + rnd() * .3, R = 7.5 + rnd() * 6, x = Math.cos(a) * R, z = Math.sin(a) * R;
  branch(new THREE.Vector3(x, heightAt(x, z), z), new THREE.Vector3((rnd() - .5) * .15, 1, (rnd() - .5) * .15).normalize(), 2.4 + rnd() * 1.4, .18, 0); }
const tubes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.7, 1, 1, 8, 1, true), trunkMat, tubeM.length); tubeM.forEach((m, i) => tubes.setMatrixAt(i, m)); scene.add(tubes);
const treeLineMat = lineMaterial(LAYER.nature, .45); scene.add(new THREE.LineSegments(geo(treeLines), treeLineMat));
const tipMat = pointMaterial(LAYER.nature, .12, .8); scene.add(new THREE.Points(geo(tips), tipMat));

// ---- 声の輪：碧の足もとから、歌の強さで広がる
const ringGeo = (() => { const a = []; for (let k = 0; k < 120; k++) { const t = k / 120 * Math.PI * 2, u = (k + 1) / 120 * Math.PI * 2; a.push(Math.cos(t), 0, Math.sin(t), Math.cos(u), 0, Math.sin(u)); } return geo(a); })();
const rings = []; for (let i = 0; i < 6; i++) { const m = new THREE.LineSegments(ringGeo, lineMaterial(LAYER.aoi, 0)); m.position.y = .05; scene.add(m); rings.push({ m, t: i / 6, a: 0 }); }

// ---- 宙の 0 と 1：機械のことば（歌詞「0 と 1 のあいだに緑」）。まわりをゆっくり上る
const BIT = ["0", "1"].map(c => { const t = textSprite(c, { color: LAYER.info, height: .34, font: '500 44px "JetBrains Mono",ui-monospace,monospace' }); t.material.opacity = .55; return t; });
const bits = []; for (let i = 0; i < (mobile ? 40 : 80); i++) { const s = BIT[rnd() < .5 ? 0 : 1].clone(), a = rnd() * Math.PI * 2, r = 2.5 + rnd() * 10; s.position.set(Math.cos(a) * r, rnd() * 7, Math.sin(a) * r); scene.add(s); bits.push({ s, sp: .08 + rnd() * .14 }); }
const dust = drift({ count: mobile ? 260 : 600, box: [[-14, 0, -14], [14, 8, 14]], color: LAYER.aoi, size: .04, speed: [.03, .12], opacity: .45 }); scene.add(dust);

// ---- 碧：空き地の真ん中に立って歌う（共通の AoiMotion）。地面の輪で立ち位置を示す
let aoi = null;
const AOI_URL = location.pathname.includes("/x/") ? "../../img/hero/aoi.vrm" : "../../../../03_発信/01_HP/img/hero/aoi.vrm";
{ const rim = new THREE.SpotLight(0xa8f2f6, 6, 12, .5, .6); rim.position.set(0, 3.2, -3); rim.target.position.set(0, 1.2, 0); scene.add(rim, rim.target);   // 碧の背からの縁の光
  const key = new THREE.SpotLight(0xffe8d0, 4, 12, .45, .7); key.position.set(1.5, 3, 3.5); key.target.position.set(0, 1.1, 0); scene.add(key, key.target); }
{ const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,.75)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .02; scene.add(sh); }   // 足もとの影（接地）
{ const ring = new THREE.LineSegments(ringGeo, lineMaterial(LAYER.aoi, .55)); ring.scale.setScalar(.55); ring.position.y = .03; scene.add(ring); }
setTimeout(async () => {
  try { const K = await import("./kit/aoi.js"); aoi = await K.loadAoi(AOI_URL, { scene, wind: .3, posture: "natural", quality: mobile ? "mid" : "auto" }); aoi.place(0, 0, 0); }
  catch (e) { console.warn("碧：", e?.message ?? e); }
}, 400);
let singing = false, gT = 1.5, gi = 0;
const sing = on => { if (!aoi || on === singing) return; singing = on;
  if (on) aoi.motion.speak({ dur: Math.max(5, (v.duration || 105) - v.currentTime), level: () => level, autoGesture: true });
  else aoi.motion.stopSpeaking(); };
v.addEventListener("play", () => sing(true)); v.addEventListener("pause", () => sing(false)); v.addEventListener("ended", () => sing(false));
v.addEventListener("seeked", () => { if (!v.paused) { singing = false; sing(true); } });

// ---- カメラ：碧を中心に回る。ドラッグで回り、地面を押すとそこへ歩く（見る人の目の高さ 1.5 m）
const view = { az: .35, el: .1, dist: mobile ? 5.2 : 4.4, tgt: new THREE.Vector3(0, 1.2, 0), goal: new THREE.Vector3(0, 1.2, 0) };
let drag = null, moved = 0, pinch = 0; const ptrs = new Map();
cv.style.touchAction = "none";
cv.addEventListener("pointerdown", e => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); cv.setPointerCapture(e.pointerId); drag = [e.clientX, e.clientY]; moved = 0; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
cv.addEventListener("pointermove", e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) view.dist = Math.min(16, Math.max(2.4, view.dist * pinch / d)); pinch = d; moved = 99; return; }
  if (!drag) return; const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; drag = [e.clientX, e.clientY]; moved += Math.abs(dx) + Math.abs(dy);
  view.az -= dx * .006; view.el = Math.min(.9, Math.max(-.05, view.el + dy * .004));
});
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
cv.addEventListener("pointerup", e => {
  ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0;
  if (drag && moved < 8 && !ptrs.size) {   // 地面を押した：そこへ歩く（遠すぎる所は 14 m まで）
    const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(floor, hit)) { if (hit.length() > 14) hit.setLength(14); view.goal.set(hit.x, 1.2, hit.z); }
  }
  if (!ptrs.size) drag = null;
});
cv.addEventListener("wheel", e => { e.preventDefault(); view.dist = Math.min(16, Math.max(2.4, view.dist * (1 + Math.sign(e.deltaY) * .08))); }, { passive: false });
addEventListener("keydown", e => { const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!k || e.target.closest("input,button")) return;
  const f = new THREE.Vector3(Math.sin(view.az), 0, Math.cos(view.az)), s = new THREE.Vector3(f.z, 0, -f.x); view.goal.addScaledVector(s, k[0] * .8).addScaledVector(f, k[1] * .8); e.preventDefault(); });

let last = performance.now(), T = 0, visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(document.querySelector(".hero"));
const loop = now => {
  requestAnimationFrame(loop);
  const ms = now - last, dt = Math.min(.05, ms / 1000); last = now;
  if (document.hidden) return;
  T += dt; const playing = !v.paused && !v.ended, L = readLevel(), m = reduced ? 0 : 1;
  if (!visible && !playing && T > 1) return;
  if (!drag && !playing) view.az += dt * .03 * m;
  view.tgt.lerp(view.goal, Math.min(1, dt * 1.6));
  const ce = Math.cos(view.el); camera.position.set(view.tgt.x + Math.sin(view.az) * ce * view.dist, Math.max(.4, view.tgt.y + .3 + Math.sin(view.el) * view.dist), view.tgt.z + Math.cos(view.az) * ce * view.dist);
  camera.lookAt(view.tgt);
  for (let i = 0; i < NF; i++) { const f = fS[i]; f.t += dt * (playing ? 1.2 + L * 2 : .5) * m; if (f.t >= 1) { f.t = 0; f.k = (f.k + 1) % flowP.length; if (rnd() < .05) f.k = rnd() * flowP.length | 0; }
    const [ax, az, bx, bz] = flowP[f.k], x = ax + (bx - ax) * f.t, z = az + (bz - az) * f.t; fP[3 * i] = x; fP[3 * i + 1] = heightAt(x, z) + .05; fP[3 * i + 2] = z; }
  flow.geometry.attributes.position.needsUpdate = true;
  beat += dt * (playing ? .25 + L * .8 : .05) * m;
  for (const r of rings) { r.t += dt * (playing ? .12 + L * .5 : .04) * m; if (r.t > 1) r.t -= 1; const s = .6 + r.t * 14; r.m.scale.set(s, 1, s); r.m.material.opacity = (playing ? .6 + L * .5 : .25) * (1 - r.t) * Math.min(1, r.t * 6); r.m.position.y = .05 + r.t * .4; }
  for (const b of bits) { b.s.position.y += b.sp * dt * m * (1 + L); if (b.s.position.y > 8) b.s.position.y = 0; }
  dust.userData.update(dt * m);
  trunkMat.opacity = .05 + L * .12; treeLineMat.opacity = .3 + L * .45; tipMat.opacity = .5 + L * .5;
  // 歌のしぐさ：声の強いところで、空・杜・聴く人へ手をひらく（4〜7 秒ごと）。表情も声に合わせて
  if (aoi && playing) { gT -= dt; if (gT <= 0 && L > .35) { gT = 4 + rnd() * 3; const k = gi++ % 4, a = view.az + (k - 1.5) * .7;
      const tgt = k === 1 ? new THREE.Vector3(0, 4.5, 2) : new THREE.Vector3(Math.sin(a) * 4, k === 3 ? .3 : 1.7, Math.cos(a) * 4);
      aoi.motion.point(tgt, 2.2); aoi.motion.express(L > .6 ? "smile" : "warm", .7, 2.5); } }
  if (aoi) aoi.tick(dt, camera);
  fit.frame(ms);
  renderer.render(scene, camera);
  if (!document.body.classList.contains("ready")) document.body.classList.add("ready");
};
requestAnimationFrame(loop);

window.__song = { level: () => level, speaking: () => !!aoi?.motion.speaking, aoi: () => !!aoi };
