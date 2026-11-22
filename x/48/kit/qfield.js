/* qfield.js ── 知覚をひらく道具（Qualia/uv・sonic・heat・deep）に共通の場。
   Qualia/sight・Qualia/time と同じ氷川参道の目の高さの地（共通部品 sight_land.js・CC0 の質感）を、軽く組み直した写し。
   参道の形・木の数・人は模式。x/02（sight）・x/37（time）のファイルは書き換えない。
   使い方：
     const F = create(canvas, { onFrame(dt, t) {} });
     F.patch(material, { key, uniforms, pars, albedo, out })   // 材質ごとに、色（albedo）と光の結果（out）を差しかえる GLSL を足す
     F.lens.value = 0..1                                       // 人の目 → 道具の目 の混ぜ具合（全材質で共有） */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
import { installSkyFog, groundMottle, landTint, hash1 } from './sight_land.js';
export { THREE, hash1 };

const LAT = 35.9 * Math.PI / 180, ROAD = 4 * Math.PI / 180;   // 大宮の緯度・参道の向き（N 約 4° W。Qualia/time と同じ）
export function sunAt(date, out) {
  const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
  const hour = date.getHours() + date.getMinutes() / 60;   // 太陽時の模式（標準時との差・均時差は省く）
  const dec = -23.44 * Math.PI / 180 * Math.cos(2 * Math.PI * (doy + 10) / 365), H = (hour - 12) * Math.PI / 12;
  const el = Math.asin(Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(dec) * Math.cos(LAT));
  out.set(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).applyAxisAngle(new THREE.Vector3(0, 1, 0), -ROAD);
  return { el, doy, hour };
}

export function create(canvas, opt = {}) {
  const mobile = matchMedia('(max-width:760px)').matches;
  const R = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const S = new THREE.Scene();
  const SKY = new THREE.Color(opt.sky || '#c9d6dc');
  S.background = SKY.clone(); S.fog = new THREE.FogExp2(SKY.clone(), 0.02);
  const cam = new THREE.PerspectiveCamera(62, 1, 0.02, 400); cam.position.set(0, 1.55, 4); S.add(cam);
  const now = opt.date || new Date(), sunDir = new THREE.Vector3(); let sunInfo = sunAt(now, sunDir);
  let day = Math.max(0, Math.min(1, (Math.sin(sunInfo.el) + .08) / .3));
  const sunV = sunDir.clone(); if (sunV.y < .12) sunV.set(-.4, .5, .3).normalize();   // 夜・朝夕の低い日は、見やすい高さの光で描く（模式）
  const hemi = new THREE.HemisphereLight('#dfe9ee', '#4a4030', .95 + .4 * day); S.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d8', 1.1 + 1.2 * day); sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 }); sun.shadow.bias = -0.0008; sun.shadow.radius = 3; sun.shadow.normalBias = .04;
  sun.target.position.set(0, 0, -6); sun.position.copy(sun.target.position).addScaledVector(sunV, 60); S.add(sun, sun.target);
  installSkyFog(THREE, { sun: sunV });
  const domeM = new THREE.MeshBasicMaterial({ color: SKY, side: THREE.BackSide, fog: true });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), domeM); S.add(dome);

  const lens = { value: 0 }, time = { value: 0 };
  // 材質に GLSL を足す（前の onBeforeCompile を活かしたまま）
  function patch(m, p) {
    const prev = m.onBeforeCompile, key = (m.customProgramCacheKey ? m.customProgramCacheKey() : '') + '|' + p.key;
    m.onBeforeCompile = (sh, r) => { prev && prev.call(m, sh, r);
      sh.uniforms.uLens = lens; sh.uniforms.uTime = time; Object.assign(sh.uniforms, p.uniforms || {});
      if (p.vary) { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vQW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n{ vec4 qw = vec4( transformed, 1. );\n#ifdef USE_INSTANCING\n qw = instanceMatrix * qw;\n#endif\n vQW = ( modelMatrix * qw ).xyz; }'); }
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uLens, uTime;\n' + (p.vary ? 'varying vec3 vQW;\n' : '') + (p.pars || ''));
      if (p.albedo) sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + p.albedo);
      if (p.out) sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', p.out + '\n#include <opaque_fragment>'); };
    m.customProgramCacheKey = () => key; m.needsUpdate = true; return m;
  }

  const tl = new THREE.TextureLoader(), base = opt.base || '';
  const tex = (nm, rx, ry) => { const t = tl.load(base + 'tex/' + nm + '.webp'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

  // 地面と参道
  const gGeo = new THREE.PlaneGeometry(400, 400, 64, 64); gGeo.rotateX(-Math.PI / 2);
  { const p = gGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, .2 * Math.sin(x * .07 + z * .05) * Math.min(1, Math.abs(x) / 12)); } gGeo.computeVertexNormals(); }
  const gMat = new THREE.MeshStandardMaterial({ map: tex('soil_forest', 30, 30), roughness: 1, color: '#b3a68a' }); groundMottle(gMat, { relief: !mobile });
  const ground = new THREE.Mesh(gGeo, gMat); ground.receiveShadow = true; S.add(ground);
  const pMat = new THREE.MeshStandardMaterial({ map: tex('path_gravel', 2, 40), roughness: 1, color: '#d8d0c0' });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 120), pMat); path.rotation.x = -Math.PI / 2; path.position.set(0, .03, -40); path.receiveShadow = true; S.add(path);

  // ケヤキの並木（箒状・模式）と参道の外の林
  const T = [];
  for (const side of [-1, 1]) for (let k = 0; k < 14; k++) T.push({ x: side * (4.4 + hash1(k + side * 7) * 1.3), z: 6 - k * 6.4 + (hash1(k * 3 + side) - .5) * 2, s: k * 2 + (side > 0 ? 1 : 0), H: 15 + hash1(k * 5.1 + side) * 8 });
  for (let k = 0; k < (mobile ? 22 : 40); k++) { const side = k % 2 ? 1 : -1; T.push({ x: side * (10 + hash1(k * 4.7) * 22), z: 8 - hash1(k * 6.3) * 100, s: 40 + k, H: 12 + hash1(k * 8.1) * 9 }); }
  const NT = T.length, NB = 5, LPT = mobile ? 50 : 80;
  const trunkGeo = new THREE.CylinderGeometry(.22, .42, 1, 9, 1, true); trunkGeo.translate(0, .5, 0);
  const tMat = new THREE.MeshStandardMaterial({ map: tex('bark_zelkova', 1, 4), roughness: .95, color: '#b9aa96' }); landTint(tMat, { amt: .1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, tMat, NT), branches = new THREE.InstancedMesh(trunkGeo, tMat, NT * NB); trunks.castShadow = branches.castShadow = true; trunks.receiveShadow = true; S.add(trunks, branches);
  const leafT = tl.load(base + 'tex/leaf_cluster.webp'); leafT.colorSpace = THREE.SRGBColorSpace;
  const lMat = new THREE.MeshStandardMaterial({ map: leafT, alphaTest: .45, side: THREE.DoubleSide, roughness: .8, color: '#e8f0dc' });
  const wind = { value: 0 };
  lMat.onBeforeCompile = sh => { sh.uniforms.uW = wind; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uW;').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec3 o_ = instanceMatrix[3].xyz; transformed.x += .06 * sin(uW * 1.7 + o_.x * .8 + o_.y) * position.y; transformed.z += .04 * sin(uW * 2.3 + o_.z); }'); };
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.4, 1.4), lMat, NT * LPT); leaves.castShadow = !mobile; S.add(leaves);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler(), d = new THREE.Vector3();
    for (let i = 0; i < NT; i++) { const t = T[i], W = .9 + hash1(t.s * 1.7) * .5, hT = t.H * (.3 + .1 * hash1(t.s * 2.3));
      m4.compose(v.set(t.x, 0, t.z), q.identity(), s.set(W, hT, W)); trunks.setMatrixAt(i, m4);
      for (let b = 0; b < NB; b++) { const ang = (b / NB + t.s * .13) * 6.283, tilt = .35 + .4 * hash1(t.s * 9.1 + b), L = t.H * (.35 + .2 * hash1(t.s * 3.3 + b));
        e.set(Math.cos(ang) * tilt, 0, Math.sin(ang) * tilt, 'YXZ'); q.setFromEuler(e); m4.compose(v.set(t.x, hT * .92, t.z), q, s.set(W * .42, L, W * .42)); branches.setMatrixAt(i * NB + b, m4); }
      for (let j = 0; j < LPT; j++) { const k = i * LPT + j, r = hash1(k * 1.37), a = hash1(k * 2.11) * 6.283, h = hash1(k * 3.7), cr = 5.5 * (.35 + .85 * h);
        e.set(hash1(k * 4.4), hash1(k * 5.3) * 6.28, hash1(k * 6.1) * .4); q.setFromEuler(e);
        m4.compose(v.set(t.x + Math.cos(a) * r * cr, t.H * (.5 + h * .5), t.z + Math.sin(a) * r * cr), q, s.setScalar(1.8 + hash1(k * 7.9))); leaves.setMatrixAt(k, m4); } } }

  // 石（参道の縁石と、ところどころの石。形と数は模式）
  const stMat = new THREE.MeshStandardMaterial({ color: '#9a978e', roughness: .9 });
  const stGeo = new THREE.DodecahedronGeometry(.5, 1); { const p = stGeo.attributes.position; for (let i = 0; i < p.count; i++) { const f = 1 + .12 * Math.sin(p.getX(i) * 9 + p.getZ(i) * 7); p.setXYZ(i, p.getX(i) * f, p.getY(i) * .6 * f, p.getZ(i) * f); } stGeo.computeVertexNormals(); }
  const NS = 14, stones = new THREE.InstancedMesh(stGeo, stMat, NS); stones.castShadow = stones.receiveShadow = true; S.add(stones);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < NS; i++) { const side = i % 2 ? 1 : -1, sc = .5 + hash1(i * 3.1) * .7; q.setFromAxisAngle(v.set(0, 1, 0), hash1(i) * 6); m4.compose(v.set(side * (3.5 + hash1(i * 2.2) * .5), .12 * sc, 1.5 - i * 4.3), q, s.set(sc, sc, sc)); stones.setMatrixAt(i, m4); } }

  // 歩く人（模式）
  const NP = mobile ? 8 : 12, people = [];
  const bodyGeo = new THREE.CapsuleGeometry(.18, .55, 3, 10); bodyGeo.scale(1, 1, .7); bodyGeo.translate(0, 1.15, 0);
  const headGeo = new THREE.SphereGeometry(.12, 12, 10); headGeo.translate(0, 1.62, 0);
  const legGeo = new THREE.CapsuleGeometry(.07, .62, 3, 6); legGeo.translate(0, -.38, 0);
  const clothM = new THREE.MeshStandardMaterial({ roughness: .9 }), skinM = new THREE.MeshStandardMaterial({ color: '#c9a58a', roughness: .7 });
  const pB = new THREE.InstancedMesh(bodyGeo, clothM, NP), pH = new THREE.InstancedMesh(headGeo, skinM, NP), pL = new THREE.InstancedMesh(legGeo, clothM, NP * 2); pB.castShadow = true; S.add(pB, pH, pL);
  const cloth = ['#3b4048', '#6d6a60', '#8a7f6b', '#4d5a62', '#5f4e45', '#2e3b3a', '#9c968a'];
  for (let i = 0; i < NP; i++) { people.push({ x: (hash1(i * 3.3) - .5) * 3.8, z0: hash1(i * 1.9) * 60, v: (i % 2 ? 1 : -1) * (1 + hash1(i * 6.1) * .4) }); const c = new THREE.Color(cloth[i % cloth.length]); pB.setColorAt(i, c); pL.setColorAt(i * 2, c); pL.setColorAt(i * 2 + 1, c); }

  function size() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 72 : 60; cam.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);

  // 見回す（ドラッグ）。見下ろしすぎ・見上げすぎない
  const look = { yaw: 0, pitch: opt.pitch ?? -.05, ty: 0, tp: opt.pitch ?? -.05, min: opt.pitchMin ?? -1.2, max: .7 };
  let dr = null;
  canvas.addEventListener('pointerdown', e => { dr = { x: e.clientX, y: e.clientY, yaw: look.ty, p: look.tp }; canvas.setPointerCapture?.(e.pointerId); });
  addEventListener('pointermove', e => { if (!dr) return; look.ty = dr.yaw + (e.clientX - dr.x) * .004; look.tp = Math.max(look.min, Math.min(look.max, dr.p + (e.clientY - dr.y) * .003)); });
  addEventListener('pointerup', () => dr = null); addEventListener('pointercancel', () => dr = null);
  addEventListener('keydown', e => { if (e.key === 'ArrowLeft') look.ty += .15; if (e.key === 'ArrowRight') look.ty -= .15; });

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), eu = new THREE.Euler();
  let tp = performance.now(), walk = 0, firstFrame = 0;
  const F = { THREE, R, S, cam, mobile, sun, hemi, sunDir, sunInfo, day, look, lens, time, patch, tex, ground, gMat, pMat, tMat, lMat, stMat, clothM, skinM, stones, people, T, leaves, trunks, branches, dome, domeM, tl,
    onFrame: opt.onFrame, render: null,
    setDate(d) { F.sunInfo = sunInfo = sunAt(d, sunDir); F.day = day = Math.max(0, Math.min(1, (Math.sin(sunInfo.el) + .08) / .3)); sunV.copy(sunDir); if (sunV.y < .12) sunV.set(-.4, .5, .3).normalize(); sun.position.copy(sun.target.position).addScaledVector(sunV, 60); hemi.intensity = .95 + .4 * day; sun.intensity = 1.1 + 1.2 * day; } };
  function loop(t) { const dt = Math.min(.1, (t - tp) / 1000); tp = t; time.value = t / 1000;
    look.yaw += (look.ty - look.yaw) * Math.min(1, dt * 6); look.pitch += (look.tp - look.pitch) * Math.min(1, dt * 6);
    eu.set(look.pitch, look.yaw, 0, 'YXZ'); cam.quaternion.setFromEuler(eu);
    wind.value = t / 1000; walk += dt;
    for (let i = 0; i < NP; i++) { const p = people[i], z = -6 - (((p.z0 + p.v * walk) % 60) + 60) % 60, bob = Math.abs(Math.sin(walk * 3.2 + i)) * .03, ry = p.v > 0 ? Math.PI : 0;
      m4.compose(v3.set(p.x, bob, z), q.setFromAxisAngle(s3.set(0, 1, 0), ry), s3.set(1, 1, 1)); pB.setMatrixAt(i, m4); pH.setMatrixAt(i, m4);
      const sw = Math.sin(walk * 5.1 + i * 1.7) * .45;
      for (let k = 0; k < 2; k++) { const sg = k ? 1 : -1; eu.set(sw * sg, ry, 0, 'YXZ'); q.setFromEuler(eu); m4.compose(v3.set(p.x + Math.cos(ry) * sg * .09, .95 + bob, z), q, s3.set(1, 1, 1)); pL.setMatrixAt(i * 2 + k, m4); } }
    pB.instanceMatrix.needsUpdate = pH.instanceMatrix.needsUpdate = pL.instanceMatrix.needsUpdate = true;
    eu.set(look.pitch, look.yaw, 0, 'YXZ'); cam.quaternion.setFromEuler(eu);
    F.onFrame && F.onFrame(dt, t / 1000);
    if (F.render) F.render(); else R.render(S, cam);
    if (!firstFrame) { firstFrame = performance.now(); window.__ready = firstFrame; }
    requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  return F;
}
