/* Qualia/song の 3D の舞台（2026-10-27）。MV を杜の空間の中の幕に映し、
   映像の中の「地を這う線（根と水）」「光の木」「声の輪」「宙の 0 と 1」を、幕のまわりの空間へ広げる。
   共通部品＝kit/atmosphere.js（光・霧・空）・kit/layers.js（線・点・札）。写真の素材は読まない（起動を軽く）。 */
import * as THREE from "three";
import { applyAtmosphere, fitRenderer } from "./kit/atmosphere.js";
import { LAYER, lineMaterial, pointMaterial, contours, drift, textSprite } from "./kit/layers.js";

const v = document.getElementById("mv"), cv = document.getElementById("stage");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" }); }
catch (e) {
  // 3D が使えない端末：映像をそのまま見せる
  cv.remove(); v.classList.add("flat"); v.controls = true; document.querySelector(".hero").replaceWith(v);
  throw e;
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, .1, 600);
applyAtmosphere(renderer, scene, "aoi_hour", { fogDensity: .028 });
const fit = fitRenderer(renderer, camera, cv);
const mobile = fit.mobile;
const geo = a => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// 地面：ゆるい起伏。面は暗く、形は等高線で見せる
const heightAt = (x, z) => .22 * Math.sin(x * .23 + 1.3) * Math.cos(z * .19) + .12 * Math.sin((x + z) * .41) - Math.max(0, -z - 6) * .02;
const gGeo = new THREE.PlaneGeometry(80, 80, 80, 80); gGeo.rotateX(-Math.PI / 2);
const gp = gGeo.attributes.position; for (let i = 0; i < gp.count; i++) gp.setY(i, heightAt(gp.getX(i), gp.getZ(i)) - .01);
gGeo.computeVertexNormals();
scene.add(new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: .95, metalness: 0 })));
scene.add(contours(heightAt, { x0: -26, x1: 26, z0: -30, z1: 14, cell: mobile ? .7 : .5, step: .07, color: LAYER.base, opacity: .3 }));

// 地を這う線：幕の足もとから、根と水の道が分かれながら広がる
const roots = [], flowP = [];
const grow = (x, z, a, len, depth) => {
  let px = x, pz = z;
  for (let k = 0; k < len; k++) {
    a += (rnd() - .5) * .5; const nx = px + Math.cos(a) * .45, nz = pz + Math.sin(a) * .45;
    roots.push(px, heightAt(px, pz) + .03, pz, nx, heightAt(nx, nz) + .03, nz); flowP.push([px, pz, nx, nz]);
    px = nx; pz = nz;
    if (depth < 3 && rnd() < .12) grow(px, pz, a + (rnd() < .5 ? -.7 : .7), len * .55 | 0, depth + 1);
  }
};
for (let i = 0; i < (mobile ? 6 : 14); i++) { const a = Math.PI * (i / 13) + (rnd() - .5) * .2; grow(Math.cos(a) * .6, -.4 + Math.sin(a) * .3, a + (rnd() - .5) * .3 + (i % 2 ? .1 : -.1), 26, 0); }
scene.add(new THREE.LineSegments(geo(roots), lineMaterial(LAYER.water, mobile ? .26 : .42)));
// 線の上を、水のしずくがゆっくり進む
const NF = mobile ? 120 : 260, fP = new Float32Array(NF * 3), fS = [];
for (let i = 0; i < NF; i++) fS.push({ k: rnd() * flowP.length | 0, t: rnd() });
const flow = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(fP, 3)), pointMaterial(LAYER.water, .07, .9));
flow.frustumCulled = false; scene.add(flow);

// 光の木：ガラスのような光の筒（幹と枝）。水が梢へのぼる道
const trunkMat = new THREE.MeshBasicMaterial({ color: LAYER.nature, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false });
const treeLines = [], tips = [];
const branch = (p, dir, len, r, depth, group) => {
  const q = p.clone().addScaledVector(dir, len);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r * .7, r, len, 8, 1, true), trunkMat);
  cyl.position.copy(p).lerp(q, .5); cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); group.add(cyl);
  treeLines.push(p.x, p.y, p.z, q.x, q.y, q.z);
  if (depth >= (mobile ? 3 : 4)) { tips.push(q.x, q.y, q.z); return; }
  for (let k = 0; k < 2 + (rnd() < .4); k++) {
    const d = dir.clone().add(new THREE.Vector3((rnd() - .5) * 1.1, .35 + rnd() * .4, (rnd() - .5) * 1.1)).normalize();
    branch(q, d, len * (.62 + rnd() * .12), r * .62, depth + 1, group);
  }
};
const trees = new THREE.Group(); scene.add(trees);
const spots = [[-8.2, -3.2], [8.4, -3.8], [-9.6, -6.5], [9.2, -7.4], [-3.8, -9], [3.2, -11], [-13, -12], [13.5, -13], [0, -16], [-7, -18], [8, -20]];
for (const [x, z] of spots.slice(0, mobile ? 7 : spots.length)) branch(new THREE.Vector3(x, heightAt(x, z), z), new THREE.Vector3((rnd() - .5) * .15, 1, (rnd() - .5) * .15).normalize(), 2.2 + rnd() * 1.2, .16, 0, trees);
scene.add(new THREE.LineSegments(geo(treeLines), lineMaterial(LAYER.nature, .5)));
scene.add(new THREE.Points(geo(tips), pointMaterial(LAYER.nature, .1, .8)));

// 声の輪：再生中、幕の足もとから広がる
const ringGeo = (() => { const a = []; for (let k = 0; k < 96; k++) { const t = k / 96 * Math.PI * 2, u = (k + 1) / 96 * Math.PI * 2; a.push(Math.cos(t), 0, Math.sin(t), Math.cos(u), 0, Math.sin(u)); } return geo(a); })();
const rings = []; for (let i = 0; i < 5; i++) { const m = new THREE.LineSegments(ringGeo, lineMaterial(LAYER.aoi, 0)); m.position.set(0, .06, -.2); scene.add(m); rings.push({ m, t: i / 5 }); }

// 宙の 0 と 1：機械のことば。ゆっくり上る
const bits = []; const n01 = mobile ? 18 : 36;
for (let i = 0; i < n01; i++) {
  const s = textSprite(rnd() < .5 ? "0" : "1", { color: LAYER.info, height: .22, font: '500 44px "JetBrains Mono",ui-monospace,monospace' });
  s.material.opacity = .55; s.position.set((rnd() - .5) * 22, rnd() * 7, -2 - rnd() * 14); scene.add(s); bits.push({ s, sp: .08 + rnd() * .14 });
}
const dust = drift({ count: mobile ? 260 : 600, box: [[-16, 0, -22], [16, 8, 6]], color: LAYER.aoi, size: .04, speed: [.03, .12], opacity: .45 }); scene.add(dust);

// 幕：MV を映す。四隅の印と細い縁（世界観の決まりの枠）
const SW = 6.4, SH = 3.6, SY = 2.25;
const poster = new THREE.TextureLoader().load("poster.webp?v=20261020-title"); poster.colorSpace = THREE.SRGBColorSpace;
const vtex = new THREE.VideoTexture(v); vtex.colorSpace = THREE.SRGBColorSpace;
const screenMat = new THREE.MeshBasicMaterial({ map: poster, toneMapped: false, fog: false });
const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat); screen.position.set(0, SY, 0); scene.add(screen);
const W = SW / 2 + .06, H = SH / 2 + .06, k = .32, fr = [-W, -H, 0, W, -H, 0, W, -H, 0, W, H, 0, W, H, 0, -W, H, 0, -W, H, 0, -W, -H, 0], cr = [];
for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = sx * (W + .08), y = sy * (H + .08); cr.push(x, y, 0, x - sx * k, y, 0, x, y, 0, x, y - sy * k, 0); }
const frame = new THREE.Group(); frame.position.copy(screen.position);
frame.add(new THREE.LineSegments(geo(fr), lineMaterial(LAYER.aoi, .3)), new THREE.LineSegments(geo(cr), lineMaterial(LAYER.aoi, .9))); scene.add(frame);
// 幕の光が足もとへ落ちる（薄い板）
const glow = new THREE.Mesh(new THREE.PlaneGeometry(SW * 1.1, 2.6), new THREE.MeshBasicMaterial({ color: 0x9bdcf0, transparent: true, opacity: .05, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
glow.rotation.x = -Math.PI / 2; glow.position.set(0, .04, 1.1); scene.add(glow);
const showVideo = () => { if (screenMat.map !== vtex) { screenMat.map = vtex; screenMat.needsUpdate = true; } };
v.addEventListener("playing", showVideo); v.addEventListener("seeked", () => { if (v.currentTime > 0) showVideo(); });

// カメラ：幕が画面の幅に収まる距離。指やマウスで少しだけ見回せる
let dist = 9, look = new THREE.Vector3(0, SY, 0), px = 0, py = 0, tx = 0, ty = 0;
const place = () => {
  const half = THREE.MathUtils.degToRad(camera.fov / 2), aspect = camera.aspect;
  const dW = (SW / (aspect < 1 ? .9 : .62)) / 2 / (Math.tan(half) * aspect), dH = (SH / .6) / 2 / Math.tan(half);
  dist = Math.max(dW, dH);
  look.y = SY + (aspect < 1 ? -.1 : -.25);
};
place(); addEventListener("resize", place);
addEventListener("pointermove", e => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2; }, { passive: true });

let last = performance.now(), T = 0, visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(document.querySelector(".hero"));
const loop = now => {
  requestAnimationFrame(loop);
  const ms = now - last, dt = Math.min(.05, ms / 1000); last = now;
  if (document.hidden) return;
  T += dt; const playing = !v.paused && !v.ended;
  // 本文を読んでいるあいだ（幕が見えないとき）は、映像が止まっていれば描かない
  if (!visible && !playing && T > 1) return;
  const m = reduced ? 0 : 1;
  px += (tx - px) * .04; py += (ty - py) * .04;
  const sway = Math.sin(T * .18) * .25 * m;
  camera.position.set((px * .9 + sway) * m, look.y + .25 - py * .25 * m + Math.sin(T * .25) * .05 * m, dist);
  camera.lookAt(look);
  // しずく
  for (let i = 0; i < NF; i++) { const f = fS[i]; f.t += dt * (playing ? 1.6 : .6) * m; if (f.t >= 1) { f.t = 0; f.k = (f.k + 1) % flowP.length; if (rnd() < .05) f.k = rnd() * flowP.length | 0; }
    const [ax, az, bx, bz] = flowP[f.k], x = ax + (bx - ax) * f.t, z = az + (bz - az) * f.t; fP[3 * i] = x; fP[3 * i + 1] = heightAt(x, z) + .05; fP[3 * i + 2] = z; }
  flow.geometry.attributes.position.needsUpdate = true;
  // 輪
  for (const r of rings) { r.t += dt * (playing ? .22 : .06) * m; if (r.t > 1) r.t -= 1; const s = .6 + r.t * 9; r.m.scale.set(s, 1, s); r.m.material.opacity = (playing ? .55 : .22) * (1 - r.t) * Math.min(1, r.t * 6); }
  for (const b of bits) { b.s.position.y += b.sp * dt * m; if (b.s.position.y > 7.5) b.s.position.y = 0; }
  dust.userData.update(dt * m);
  trunkMat.opacity = .06 + (playing ? .03 * (1 + Math.sin(T * 2.1)) : 0);
  fit.frame(ms);
  renderer.render(scene, camera);
  if (!document.body.classList.contains("ready")) document.body.classList.add("ready");
};
requestAnimationFrame(loop);
