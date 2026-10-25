/* © mitsulab. HP v2（2026-10-26 本人「環世界の拡張、環世界 1.0 から 2.0 へ、Qualium、ポートフォリオをベースに、ゼロベースで全面的に更新」「3D グラフィックで美しく」「電脳の世界観」）
   TOP 全体の後ろに一つだけ置く 3D。スクロールの場面（data-v2-scene）ごとに、決まった角度の間をカメラが移る（回さない）。
   地＝氷川参道の実データの線（等高線＝国土地理院 DEM5A、道・建物＝PLATEAU／OSM、構造物＝Qualium 氷川の配置。_dev/sando_wire/extract.py）。
   場面：0 VISION（夜の参道）／1 環世界 1.0（身体の泡・模式）／2 環世界 2.0（五つの層・碧・かさねっこ）／3 Qualium（場を見下ろす・氷川と川越）／4 以降＝暗く沈める。
   電脳の空気は、飾りの格子ではなく意味のある線と札（実の座標・層コード・記録の数）で出す。泡・層の板・川越の向きは模式。 */
import * as THREE from 'three';
import { LAYER5 } from './kit/layer-colors.js?v=20261023k';

const root = document.getElementById('top');
const cv = document.getElementById('v2cv');
const labsBox = document.getElementById('v2labs');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = Math.min(innerWidth, innerHeight) < 700;
const scenes = [...document.querySelectorAll('[data-v2-scene]')];

function hasGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!cv || !hasGL()) { document.documentElement.classList.add('v2-no3d'); } else boot().catch(e => { console.warn('v2-world', e); document.documentElement.classList.add('v2-no3d'); });

async function boot() {
  const [meta, bin] = await (window.__sandoWire || (window.__sandoWire = Promise.all([fetch('img/hero/sando_wire.json').then(r => r.json()), fetch('img/hero/sando_wire.bin').then(r => r.arrayBuffer())])));
  const I = new Int16Array(bin), Q = meta.q, HG = meta.hgrid;
  const hAt = (x, z) => { const c = Math.max(0, Math.min(HG.cols - 1, Math.round((x - HG.x0) / HG.d))), r = Math.max(0, Math.min(HG.rows - 1, Math.round((z - HG.z0) / HG.d))); return HG.v[r * HG.cols + c] / 10; };

  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: !mobile, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5)); R.setClearColor(0x03060f, 1);
  R.toneMapping = THREE.ACESFilmicToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
  const S = new THREE.Scene(); S.fog = new THREE.FogExp2(0x03060f, 0.0011);
  const cam = new THREE.PerspectiveCamera(50, 1, 0.2, 6000);
  S.add(new THREE.HemisphereLight(0x9fc8ff, 0x0a0f18, 1.1));
  const key = new THREE.DirectionalLight(0xdff6ff, 1.6); key.position.set(-30, 60, 40); S.add(key);

  const lm = (c, o) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false });
  const geo = a => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return g; };
  const binGroup = k => { const [o, n] = meta.groups[k]; const f = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) f[i] = I[o * 3 + i] * Q; return geo(f); };
  const dotC = document.createElement('canvas'); dotC.width = dotC.height = 64; { const x = dotC.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  const DOT = new THREE.CanvasTexture(dotC);
  const pm = (c, s, o) => new THREE.PointsMaterial({ color: c, size: s, map: DOT, sizeAttenuation: true, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const L5 = Object.fromEntries(LAYER5.map(l => [l.key, l.c]));

  // ---- 地：等高線・道・中心線・欅（模式の形）・構造物・建物
  const base = new THREE.Group(); S.add(base);
  const ct = []; meta.contours.forEach(([e, p]) => { for (let i = 0; i < p.length - 2; i += 2) ct.push(p[i], e + .2, p[i + 1], p[i + 2], e + .2, p[i + 3]); });
  base.add(new THREE.LineSegments(geo(ct), lm(0x4fa6c0, .34)));
  base.add(new THREE.LineSegments(binGroup('road'), lm(0x9fd8e6, .32)));
  const cl = []; meta.center.forEach((c, i) => { if (i) { const a = meta.center[i - 1]; cl.push(a[0], a[1] + .4, a[2], c[0], c[1] + .4, c[2]); } });
  base.add(new THREE.LineSegments(geo(cl), lm(0xf6e2b0, .75)));
  const tr = []; meta.trees.forEach(([x, y, z], i) => { if (mobile && i % 2) return; const H = 14 + (i * 37 % 9), b = y + H * .32, r = 4.6 + (i % 3) * .6;
    tr.push(x, y, z, x, b, z); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + i, mx = x + Math.cos(a) * r * .55, mz = z + Math.sin(a) * r * .55; tr.push(x, b, z, mx, b + H * .38, mz, mx, b + H * .38, mz, x + Math.cos(a) * r, y + H * .95, z + Math.sin(a) * r); } });
  const treeM = lm(L5.nature, .22); base.add(new THREE.LineSegments(geo(tr), treeM));
  const strM = lm(L5.culture, .8); base.add(new THREE.LineSegments(binGroup('structures'), strM));
  if (!mobile) base.add(new THREE.LineSegments(binGroup('buildings'), lm(0x8fa6c8, .12)));
  // 観察の記録（iNaturalist）＝細い光の柱
  const ob = []; meta.obs.forEach(([x, z]) => { const y = hAt(x, z); ob.push(x, y, z, x, y + 26, z); });
  const obsM = lm(L5.sight, .0); base.add(new THREE.LineSegments(geo(ob), obsM));

  const near = zz => meta.center.reduce((a, c) => Math.abs(c[2] - zz) < Math.abs(a[2] - zz) ? c : a);
  const A0 = near(-640), AO = new THREE.Vector3(A0[0], A0[1], A0[2]);   // 碧が立つ所（二の鳥居と三の鳥居のあいだ）
  const B0 = near(-180), BO = new THREE.Vector3(B0[0], B0[1], B0[2]);   // 環世界 1.0 の場面

  // ---- 環世界 1.0：泡（身体が受けとれる範囲・模式）
  const g1 = new THREE.Group(); g1.visible = false; S.add(g1);
  const bubble = (r, c, p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 24), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .07, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    const w = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(r, 18, 10)), lm(c, .16)); const g = new THREE.Group(); g.add(m, w); g.position.copy(p); g1.add(g);
    const core = new THREE.Points(geo([0, 0, 0]), pm(c, Math.max(.5, r * .18), 1)); g.add(core); return g; };
  const P_HITO = BO.clone().add(new THREE.Vector3(5, 1.6, 0)), P_BEE = BO.clone().add(new THREE.Vector3(-7, 1.2, 5)), P_TICK = BO.clone().add(new THREE.Vector3(-1.5, .3, -7));
  const bH = bubble(4.6, 0xf4aa96, P_HITO), bB = bubble(2.4, 0xc4b2ff, P_BEE), bT = bubble(.8, 0xe8a070, P_TICK);
  // 泡の外の手がかり（紫外線・超音波・地中の振動・匂い）＝泡の外だけに漂う粒（模式）
  const CN = mobile ? 260 : 600, cp = []; let guard = 0;
  while (cp.length < CN * 3 && guard++ < CN * 20) { const x = (Math.random() - .5) * 60, y = Math.random() * 14, z = (Math.random() - .5) * 60; const v = new THREE.Vector3(BO.x + x, BO.y + y, BO.z + z); if (v.distanceTo(P_HITO) > 5.2) cp.push(v.x, v.y, v.z); }
  const cues = new THREE.Points(geo(cp), pm(0xb7a8ff, .55, .7)); g1.add(cues);

  // ---- 環世界 2.0：五つの層の板（L01〜L05）・碧・かさねっこ
  const g2 = new THREE.Group(); g2.visible = false; S.add(g2);
  const plates = LAYER5.map((l, i) => { const g = new THREE.Group(), r = mobile ? 9 : 11;
    const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 72), new THREE.MeshBasicMaterial({ color: l.c, transparent: true, opacity: .05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); fill.rotation.x = -Math.PI / 2;
    const ring = []; for (let k = 0; k < 96; k++) { const a = k / 96 * 6.283, b = (k + 1) / 96 * 6.283; ring.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(b) * r, 0, Math.sin(b) * r); }
    for (let k = 0; k < 60; k++) { const a = k / 60 * 6.283, rr = k % 5 ? r * .96 : r * .9; ring.push(Math.cos(a) * rr, 0, Math.sin(a) * rr, Math.cos(a) * r, 0, Math.sin(a) * r); }   // 目盛り
    const line = new THREE.LineSegments(geo(ring), lm(l.c, .7)); g.add(fill, line); g.position.set(AO.x, AO.y + 2.6 + i * 1.7, AO.z); g.userData = { fill, line, y: AO.y + 2.6 + i * 1.7 }; g2.add(g); return g; });
  // 層と地を結ぶ縦の線（層は場所の上に重なる）
  const tie = []; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, r = mobile ? 9 : 11; tie.push(AO.x + Math.cos(a) * r, AO.y, AO.z + Math.sin(a) * r, AO.x + Math.cos(a) * r, AO.y + 2.6 + 4 * 1.7, AO.z + Math.sin(a) * r); }
  const tieM = lm(0xa8f2f6, .18); g2.add(new THREE.LineSegments(geo(tie), tieM));

  // ---- Qualium：場を見下ろす。川越は方角だけ（西へ約 13 km・距離は縮めた模式）
  const g3 = new THREE.Group(); g3.visible = false; S.add(g3);
  const KW = new THREE.Vector3(-1500, 14, -900);
  const kwRing = []; for (let i = 0; i < 5; i++) { const r = 60 + i * 22; for (let k = 0; k < 64; k++) { const a = k / 64 * 6.283, b = (k + 1) / 64 * 6.283; kwRing.push(KW.x + Math.cos(a) * r, KW.y + i * 6, KW.z + Math.sin(a) * r, KW.x + Math.cos(b) * r, KW.y + i * 6, KW.z + Math.sin(b) * r); } }
  g3.add(new THREE.LineSegments(geo(kwRing), lm(0xd9b382, .55)));
  const dash = []; for (let i = 0; i < 40; i += 2) { const a = i / 40, b = (i + 1) / 40; dash.push(AO.x + (KW.x - AO.x) * a, 20, AO.z + (KW.z - AO.z) * a, AO.x + (KW.x - AO.x) * b, 20, AO.z + (KW.z - AO.z) * b); }
  g3.add(new THREE.LineSegments(geo(dash), lm(0xa8f2f6, .5)));
  const hkRing = []; for (let i = 0; i < 5; i++) { const r = 90 + i * 30; for (let k = 0; k < 64; k++) { const a = k / 64 * 6.283, b = (k + 1) / 64 * 6.283; hkRing.push(AO.x + Math.cos(a) * r, AO.y + 2 + i * 6, AO.z + Math.sin(a) * r, AO.x + Math.cos(b) * r, AO.y + 2 + i * 6, AO.z + Math.sin(b) * r); } }
  const hkM = lm(0xa8f2f6, .35); g3.add(new THREE.LineSegments(geo(hkRing), hkM));

  // ---- 札（HTML）：3D の点に付く等幅の札
  const labs = [...labsBox.querySelectorAll('[data-at]')];
  const AT = { aoi: AO.clone().add(new THREE.Vector3(0, 2.1, 0)), hito: P_HITO.clone().add(new THREE.Vector3(0, 4.9, 0)), bee: P_BEE.clone().add(new THREE.Vector3(0, 2.7, 0)), tick: P_TICK.clone().add(new THREE.Vector3(0, 1.1, 0)), cue: BO.clone().add(new THREE.Vector3(-18, 9, -10)),
    hikawa: AO.clone().add(new THREE.Vector3(0, 60, 0)), kawagoe: KW.clone().add(new THREE.Vector3(0, 60, 0)), torii: new THREE.Vector3(...meta.marks[1].p).add(new THREE.Vector3(0, 9, 0)), coord: AO.clone().add(new THREE.Vector3(-12, 14, -60)) };
  LAYER5.forEach((l, i) => AT['l' + (i + 1)] = new THREE.Vector3(AO.x + (mobile ? 9 : 11), 0, AO.z));
  const _v = new THREE.Vector3();

  // ---- 碧（共通の aoi.vrm と AoiMotion）・かさねっこ（共通部品）は、地が描けてから読む
  let vrm = null, mot = null, herd = null;
  const loadAgents = async () => {
    try {
      const [V, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('@pixiv/three-vrm'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const Ld = new GLTFLoader(); Ld.setMeshoptDecoder(MeshoptDecoder); Ld.register(p => new V.VRMLoaderPlugin(p));
      const g = await Ld.parseAsync((await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())))).slice(0), '');
      const v = g.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(g.scene); V.VRMUtils.rotateVRM0(v);
      const N = n => v.humanoid.getNormalizedBoneNode(n), set = (n, x, y, z) => { const o = N(n); if (o) o.rotation.set(x, y, z); };
      set('leftUpperArm', -.12, 0, -1.28); set('rightUpperArm', -.12, 0, 1.28); set('leftLowerArm', 0, -.28, 0); set('rightLowerArm', 0, .28, 0);
      v.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      v.scene.position.copy(AO); v.scene.rotation.y = Math.PI * .08; g2.add(v.scene); vrm = v; v.update(0);
      try { const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61'); mot = new AoiMotion(v, { root: v.scene, reducedMotion: reduce, wind: 0, faceViewer: false, startCalm: 0, posture: 'upright', uprightWeight: .9 }); } catch (e) { console.warn('aoi motion', e); }
      window.__aoi = 'ok';
    } catch (e) { console.warn('aoi', e); }
    try {
      const { KasaneHerd } = await import('./kit/envAgents/kasane.js');
      herd = new KasaneHerd({ scene: g2, camera: cam, groundAt: (x, z) => AO.y, scale: 2.6, shadow: false });
      const keys = LAYER5.map(l => l.key), n = mobile ? 3 : 5;
      for (let gI = 0; gI < 3; gI++) { const a = gI / 3 * 6.283 + .6, r = 5 + gI * 1.5, mem = []; for (let k = 0; k < n; k++) mem.push({ layer: keys[(k + gI) % 5] }); herd.addGroup(mem, { x: AO.x + Math.cos(a) * r, z: AO.z + Math.sin(a) * r, radius: 2.4, role: gI === 1 ? 'watch' : '' }); }
      for (let k = 0; k < (mobile ? 3 : 6); k++) herd.add(keys[k % 5], { x: AO.x + (Math.random() - .5) * 14, z: AO.z + (Math.random() - .5) * 14, radius: 3, role: k % 2 ? 'watch' : 'wander' });
      herd.load();
    } catch (e) { console.warn('kasane', e); }
  };

  // ---- カメラの決まった角度（場面ごと）
  const KF = [
    { p: AO.clone().add(new THREE.Vector3(-40, mobile ? 190 : 85, mobile ? 300 : 330)), t: AO.clone().add(new THREE.Vector3(mobile ? 20 : -95, 0, -120)) },             // 0 VISION：参道を南の上から北へ見る
    { p: BO.clone().add(new THREE.Vector3(0, mobile ? 9 : 7, mobile ? 34 : 26)), t: BO.clone().add(new THREE.Vector3(mobile ? -1 : -8, mobile ? 4 : 2.5, 0)) },   // 1 環世界 1.0
    { p: AO.clone().add(new THREE.Vector3(mobile ? 2 : 6, mobile ? 5.5 : 6.5, mobile ? 9 : 18)), t: AO.clone().add(new THREE.Vector3(mobile ? 0 : -5, mobile ? 1.1 : 3.4, 0)) }, // 2 環世界 2.0
    { p: new THREE.Vector3(mobile ? -760 : -1560, mobile ? 3000 : 2150, 1100), t: new THREE.Vector3(mobile ? -760 : -1560, 0, -720) },                         // 3 Qualium：場を見下ろす
    { p: new THREE.Vector3(60, 520, 900), t: new THREE.Vector3(0, 0, -300) },                                               // 4 以降
  ];
  let cur = 0, k = 0, from = { p: KF[0].p.clone(), t: KF[0].t.clone() }, to = KF[0], tIn = 1, sceneT = 0;
  const camP = KF[0].p.clone(), camT = KF[0].t.clone();
  const go = i => { i = Math.max(0, Math.min(KF.length - 1, i)); if (i === cur) return; from = { p: camP.clone(), t: camT.clone() }; to = KF[i]; cur = i; tIn = reduce ? 1 : 0; sceneT = 0; root.dataset.v2 = i; };
  root.dataset.v2 = 0;
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) go(+e.target.dataset.v2Scene); }); }, { rootMargin: '-45% 0px -45% 0px' });
  scenes.forEach(s => io.observe(s));

  const size = () => { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 62 : 48; cam.updateProjectionMatrix(); };
  size(); addEventListener('resize', size);
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  let last = performance.now(), visible = true, running = true, mx = 0, my = 0;
  if (!reduce && !mobile) addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(root);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });
  let agentsAsked = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!visible || !running || !root.classList.contains('active')) return;
    tIn = Math.min(1, tIn + dt / 2.2); sceneT += dt; const e = ease(tIn);
    camP.lerpVectors(from.p, to.p, e); camT.lerpVectors(from.t, to.t, e);
    cam.position.copy(camP);
    // VISION の場面：参道をゆっくり北へ進む（止まった俯瞰にしない・往復）
    if (cur === 0 && !reduce) { const d = (1 - Math.cos(sceneT * .08)) * 90; cam.position.z -= d; cam.position.y -= d * .12; camT.z -= d * .8; }
    if (cur === 2 && !reduce) cam.position.x += Math.sin(sceneT * .25) * 1.2;
    if (!reduce) { cam.position.x += mx * (cur === 3 ? 30 : 1.6); cam.position.y += -my * (cur === 3 ? 20 : .8); }
    cam.lookAt(camT);
    g1.visible = cur === 1 || (cur === 0 && tIn < 1) || (cur === 2 && tIn < .6);
    g2.visible = cur >= 1 && cur <= 3;
    g3.visible = cur >= 3;
    const t = now / 1000;
    if (g1.visible) { [bH, bB, bT].forEach((b, i) => { b.scale.setScalar(1 + (reduce ? 0 : Math.sin(t * 1.3 + i) * .025)); }); cues.rotation.y = reduce ? 0 : t * .02; }
    // 層の板：2.0 に入ると一枚ずつ重なる
    const lp = cur >= 2 ? Math.min(5, (cur === 2 ? sceneT : 9) / .7) : 0;
    plates.forEach((g, i) => { const on = Math.max(0, Math.min(1, lp - i)); g.visible = on > 0; g.userData.fill.material.opacity = .06 * on; g.userData.line.material.opacity = .72 * on; g.position.y = g.userData.y - (1 - on) * 3; if (!reduce) g.rotation.y = t * .03 * (i % 2 ? 1 : -1); });
    tieM.opacity = .18 * Math.min(1, lp / 5);
    obsM.opacity = cur >= 2 ? .55 : 0; treeM.opacity = cur === 2 ? .07 : cur === 1 ? .1 : .26;
    S.fog.density = cur >= 3 ? .00016 : cur === 0 ? .0008 : .0016;
    // 碧とかさねっこの毎こまは、読み込みの途中（中の配列がまだ空）でも絵の全体を止めない（2026-10-26 見回りで "reading '0'" が 1 回）
    if (vrm && g2.visible) { try { if (mot) mot.update(dt, cam); else vrm.update(dt); } catch (e) { if (!frame.w1) { frame.w1 = 1; console.warn('aoi update', e); } } }
    if (herd) { try { herd.update(dt, { active: cur === 2, busy: false }); } catch (e) { if (!frame.w2) { frame.w2 = 1; console.warn('kasane update', e); } } }
    if (cur >= 2 && !agentsAsked) { agentsAsked = true; loadAgents(); }
    R.render(S, cam);
    // 札
    const W = innerWidth, H = innerHeight;
    labs.forEach(el => { const sc = el.dataset.sc.split(',').map(Number), on = sc.includes(cur) && tIn > .75; if (!on) { if (el.classList.contains('on')) el.classList.remove('on'); return; }
      const id = el.dataset.at; let p = AT[id]; if (!p) return; if (/^l\d$/.test(id)) { const g = plates[+id[1] - 1]; _v.set(p.x, g.position.y, p.z); } else _v.copy(p);
      _v.project(cam); const vis = _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05; el.classList.toggle('on', vis);
      if (vis) el.style.transform = `translate3d(${((_v.x + 1) / 2 * W) | 0}px,${((1 - _v.y) / 2 * H) | 0}px,0)`; });
  }
  requestAnimationFrame(frame);
  document.documentElement.classList.add('v2-3d');
  window.__v2 = 'ok'; if (/[?&]dbg/.test(location.search)) window.__v2d = { cam, S, R, AO, BO, KF, go };
}
