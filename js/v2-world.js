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
  // 環境エージェント E（場所：測る・記録・見取り図）＝主体を囲む地の輪。主体はその中にいる
  const ER = 13, eLn = [];
  for (let k = 0; k < 128; k++) { const a = k / 128 * 6.283, b = (k + 1) / 128 * 6.283; eLn.push(BO.x + Math.cos(a) * ER, BO.y + .05, BO.z + Math.sin(a) * ER, BO.x + Math.cos(b) * ER, BO.y + .05, BO.z + Math.sin(b) * ER); }
  for (let k = 0; k < 72; k++) { const a = k / 72 * 6.283, r0 = k % 6 ? ER - .4 : ER - 1.1; eLn.push(BO.x + Math.cos(a) * r0, BO.y + .05, BO.z + Math.sin(a) * r0, BO.x + Math.cos(a) * ER, BO.y + .05, BO.z + Math.sin(a) * ER); }
  for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + .4, x = BO.x + Math.cos(a) * ER, z = BO.z + Math.sin(a) * ER; eLn.push(x, BO.y, z, x, BO.y + 3.2, z); }   // 測る柱
  const eM = lm(0xa8f2f6, .5); g1.add(new THREE.LineSegments(geo(eLn), eM));
  // Qualia＝E と S のあいだに立ち上がる関係：地（E）から各主体へ、弧の線
  const P_WORM = BO.clone().add(new THREE.Vector3(2.5, .15, 6.5));
  const bW = bubble(1.1, 0xd99a7c, P_WORM);
  const qLn = [], qP = [];
  [[P_HITO, 0], [P_BEE, 2.2], [P_TICK, 4.1], [P_WORM, 5.3]].forEach(([p, a]) => { const e = new THREE.Vector3(BO.x + Math.cos(a) * ER, BO.y + .05, BO.z + Math.sin(a) * ER); let pr = e;
    for (let i = 1; i <= 24; i++) { const u = i / 24, v = e.clone().lerp(p, u); v.y += Math.sin(u * Math.PI) * 3.2; qLn.push(pr.x, pr.y, pr.z, v.x, v.y, v.z); pr = v; if (i === 12) qP.push(v.x, v.y, v.z); } });
  const qM = lm(0xf6e2b0, .55); g1.add(new THREE.LineSegments(geo(qLn), qM));
  // 向き：E（地の輪）から主体へ。弧の終わりに矢じり、弧の上を流れる光の粒、地の輪の起点に印
  const qArc = [], arrowM = new THREE.MeshBasicMaterial({ color: 0xf6e2b0, transparent: true, opacity: .95, toneMapped: false, depthWrite: false });
  for (let j = 0; j < 4; j++) { const seg = qLn.slice(j * 144, j * 144 + 144), pts = []; for (let i = 0; i < 24; i++) pts.push(new THREE.Vector3(seg[i * 6], seg[i * 6 + 1], seg[i * 6 + 2])); pts.push(new THREE.Vector3(seg[138 + 3], seg[138 + 4], seg[138 + 5])); qArc.push(new THREE.CatmullRomCurve3(pts));
    const end = pts[pts.length - 1], dir = end.clone().sub(pts[pts.length - 3]).normalize(), cone = new THREE.Mesh(new THREE.ConeGeometry(.32, .9, 10), arrowM); cone.position.copy(end).addScaledVector(dir, -.9); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g1.add(cone);
    const st = new THREE.Mesh(new THREE.RingGeometry(.45, .7, 24), new THREE.MeshBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: .9, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); st.position.copy(pts[0]).setY(BO.y + .1); st.rotation.x = -Math.PI / 2; g1.add(st); }
  const NPU = 4 * 6, puP = new Float32Array(NPU * 3), puG = geo(puP); const pulses = new THREE.Points(puG, pm(0xfff2c8, 1.0, 1)); pulses.frustumCulled = false; g1.add(pulses); g1.add(new THREE.Points(geo(qP), pm(0xf6e2b0, 1.2, 1)));
  const Q_AT = new THREE.Vector3(qP[0], qP[1], qP[2]);
  // 写実の地と生き物は遅れて読む（場面 1 に近づいたとき）。スマホは草を減らす
  let real1 = null, SM1 = null;
  const loadReal1 = async () => {
    try {
      const [U, C] = await Promise.all([import('./umwelt-3d.js?v=20261026w'), import('./kit/creatures.js')]);
      const r = new THREE.Group(); r.position.copy(BO); const tl = new THREE.TextureLoader();
      r.add(new THREE.HemisphereLight(0xffe6c4, 0x2a2016, 1.3)); const sun = new THREE.DirectionalLight(0xffd6a0, 2.0); sun.position.set(-6, 8, 4); r.add(sun, sun.target);
      const RG = 12.5, fade = U.fadeMap();
      const soil = tl.load('x/02/tex/soil_forest.webp'); soil.colorSpace = THREE.SRGBColorSpace; soil.wrapS = soil.wrapT = THREE.RepeatWrapping; soil.repeat.set(9, 9);
      const gd = new THREE.Mesh(new THREE.CircleGeometry(RG, 72), new THREE.MeshStandardMaterial({ map: soil, color: 0x8c7a62, roughness: .96, transparent: true, alphaMap: fade, depthWrite: false })); gd.rotation.x = -Math.PI / 2; gd.position.y = .02; r.add(gd);
      const pv = tl.load('img/hero/3d/ql_paving_c.webp'); pv.colorSpace = THREE.SRGBColorSpace; pv.wrapS = pv.wrapT = THREE.RepeatWrapping; pv.repeat.set(1.5, 9);
      const pmS = new THREE.MeshStandardMaterial({ map: pv, color: 0xa39c8e, roughness: .9, transparent: true, alphaMap: U.stripFade(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
      if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(1.5, 9); pmS.normalMap = n; pmS.normalScale = new THREE.Vector2(.6, .6); }
      const path = new THREE.Mesh(new THREE.PlaneGeometry(4.2, RG * 2), pmS); path.rotation.x = -Math.PI / 2; path.position.set(5, .03, 0); r.add(path);
      { const N = mobile ? 500 : 1800, bl = new THREE.PlaneGeometry(.05, 1, 1, 4); bl.translate(0, .5, 0); const pa = bl.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setX(i, pa.getX(i) * (1 - y * .92)); pa.setZ(i, y * y * .18); } bl.computeVertexNormals();
        const im = new THREE.InstancedMesh(bl, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .85 }), N), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(); let n = 0, gu = 0;
        while (n < N && gu++ < N * 20) { const x = (Math.random() * 2 - 1) * RG, z = (Math.random() * 2 - 1) * RG; if (Math.abs(x - 5) < 2.4 || Math.hypot(x, z) > RG * .85) continue; const h = .2 + Math.random() * .5; e.set((Math.random() - .5) * .35, Math.random() * 6.28, (Math.random() - .5) * .35); q.setFromEuler(e); M.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, h, 1)); im.setMatrixAt(n, M); c.setHSL(.2 + Math.random() * .1, .35 + Math.random() * .2, .2 + Math.random() * .16); if (Math.random() < .25) c.setHSL(.11, .35, .32); im.setColorAt(n, c); n++; }
        im.count = n; r.add(im); }
      const loc = p => p.clone().sub(BO);
      const person = U.makePerson(); person.scale.setScalar(1.05); person.position.copy(loc(P_HITO)).setY(0); person.rotation.y = -2.4; r.add(person);
      const bee = C.makeBee(); bee.scale.setScalar(2.2); bee.position.copy(loc(P_BEE)); bee.rotation.y = 2.4; r.add(bee);
      const tick = U.makeTick(); tick.scale.setScalar(1.5); tick.position.copy(loc(P_TICK)).setY(.5); tick.rotation.set(-1.0, .5, 0); r.add(tick);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.012, .03, .5, 6), new THREE.MeshStandardMaterial({ color: 0x6f7a3e, roughness: .8 })); stem.position.copy(loc(P_TICK)).setY(.25); r.add(stem);
      // 写実の生き物（Qualium 氷川の sight で合格したモデル＝ヒヨドリ・コウモリ・ミミズ・アオスジアゲハ）。見やすく大きく描く（模式の注記どおり）
      const SMod = await import('./kit/sight/sightModels.js'); const sp = [];
      const put = async (name, s, pos, ry) => { try { const m = await SMod.loadSight(name, { shadow: false }); m.object.scale.setScalar(s); m.object.position.copy(pos); m.object.rotation.y = ry; r.add(m.object); sp.push(m); return m; } catch (e) { console.warn('sight', name, e); return null; } };
      const [worm, bat, hiyo, ageha] = await Promise.all([put('mimizu', 20, loc(P_WORM).setY(.04), .7), put('koumori', 26, new THREE.Vector3(-11, 7.5, -8), .9), put('hiyo', 6, new THREE.Vector3(-6.5, 5.2, -5), 1.4), put('aosuji', 26, loc(P_BEE).add(new THREE.Vector3(2.4, 1.0, -1.4)), 2.2)]);
      r.userData = { person, bee, tick, worm, bat, hiyo, ageha, sp, BEE: bee.position.clone() };
      SM1 = SMod;
      g1.add(r); real1 = r;
    } catch (e) { console.warn('umwelt1 real', e); }
  };

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
  // 層の中身：実の座標（観察の記録・欅・構造物・参道の中心線）を縮めて各層に点で置き、層ごとに三枚（記録・典拠・測った値）を重ねる
  const SC = (mobile ? 9 : 11) / 760, pts = arr => { const f = []; arr.forEach(([x, z]) => { const dx = (x - AO.x) * SC, dz = (z - AO.z) * SC; if (Math.hypot(dx, dz) < (mobile ? 8.6 : 10.6)) f.push(dx, 0, dz); }); return f; };
  const SRC = { sight: meta.obs.map(o => [o[0], o[1]]), touch: meta.center.map(c => [c[0], c[2]]), sound: meta.trees.filter((_, i) => i % 2).map(t => [t[0], t[2]]), nature: meta.trees.map(t => [t[0], t[2]]), culture: (meta.marks || []).map(m => [m.p[0], m.p[2]]).concat(meta.center.filter((_, i) => i % 3 === 0).map(c => [c[0] + 18, c[2]])) };
  plates.forEach((g, i) => { const l = LAYER5[i], ex = [];
    const dm = pm(l.c, mobile ? .45 : .38, 0); const d = new THREE.Points(geo(pts(SRC[l.key] || [])), dm); d.position.y = .02; g.add(d); ex.push([dm, .95]);
    for (let s2 = 1; s2 <= 2; s2++) { const r = (mobile ? 9 : 11) * (1 - s2 * .05), ring = []; for (let k = 0; k < 72; k++) { const a = k / 72 * 6.283, b = (k + 1) / 72 * 6.283; ring.push(Math.cos(a) * r, s2 * .5, Math.sin(a) * r, Math.cos(b) * r, s2 * .5, Math.sin(b) * r); } const m = lm(l.c, 0); g.add(new THREE.LineSegments(geo(ring), m)); ex.push([m, .32]); }
    g.userData.ex = ex; });
  // 同じ人が、泡の中から層の中へ：碧のそばの人の泡が、層が重なるにつれて大きくひらく
  const P2 = AO.clone().add(new THREE.Vector3(2.4, 0, 1.6));
  const b2 = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 14, 8)), lm(0xf4aa96, .0)); b2.position.copy(P2).add(new THREE.Vector3(0, 1.6, 0)); g2.add(b2);
  let person2 = null;

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
  const AT = { aoi: AO.clone().add(new THREE.Vector3(0, 2.1, 0)), hito: P_HITO.clone().add(new THREE.Vector3(0, 4.9, 0)), bee: P_BEE.clone().add(new THREE.Vector3(0, 2.7, 0)), tick: P_TICK.clone().add(new THREE.Vector3(0, 1.1, 0)), worm: P_WORM.clone().add(new THREE.Vector3(0, 1.4, 0)), env: BO.clone().add(new THREE.Vector3(-ER * .3, .4, ER * .92)), bat: BO.clone().add(new THREE.Vector3(-11, 9.3, -8)), qualia: Q_AT, person2: P2.clone().add(new THREE.Vector3(0, 4, 0)), qualia2: AO.clone().lerp(P2, .5).add(new THREE.Vector3(0, 2.4, 0)), cue: BO.clone().add(new THREE.Vector3(-3, 10, -14)),
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
      try { const U = await import('./umwelt-3d.js?v=20261026w'); person2 = U.makePerson(); person2.position.copy(P2); person2.rotation.y = -.6; g2.add(person2); } catch (e) { console.warn('person2', e); }
    } catch (e) { console.warn('kasane', e); }
  };

  // ---- 寄りの挿し絵：一つの生き物に寄った 3D と、受けとる手がかりの一行（場面 1 だけ・同じ描画器の一角に描く）
  const insEl = document.getElementById('v2inset'), IS = new THREE.Scene(), IC = new THREE.PerspectiveCamera(30, 1.3, .01, 50);
  IS.add(new THREE.HemisphereLight(0xfff0dc, 0x5a4a3a, 2.6), new THREE.AmbientLight(0xffffff, .8)); { const d = new THREE.DirectionalLight(0xffe2b8, 2.4); d.position.set(-2, 3, 2); IS.add(d); const b = new THREE.DirectionalLight(0x9fc8ff, .8); b.position.set(2, 1, -3); IS.add(b); }
  const INS = [['bee'], ['koumori', 'fly'], ['aosuji', 'fly'], ['mimizu', 'crawl']];   // 本文の順（ミツバチ → コウモリ → マダニ）
  let insI = -1, insT = 99, insObj = null, insMix = null, insBusy = false;
  async function nextInset() {
    if (insBusy) return; insBusy = true; insI = (insI + 1) % INS.length; const [id, clip] = INS[insI];
    try {
      let o, m = null;
      if (id === 'tick') o = (await import('./umwelt-3d.js?v=20261026w')).makeTick();
      else if (id === 'bee') o = (await import('./kit/creatures.js')).makeBee();
      else { m = await SM1.loadSight(id, { shadow: false, autoplay: false }); m.play(clip, 0); o = m.object; }
      if (insObj) IS.remove(insObj); const w = new THREE.Group(); w.add(o); IS.add(w);
      const bx = new THREE.Box3().setFromObject(o), c = bx.getCenter(new THREE.Vector3()), sz = bx.getSize(new THREE.Vector3()).length() || 1; o.position.sub(c); w.scale.setScalar(1 / sz);
      insObj = w; insMix = m; insT = 0;
      if (insEl) insEl.querySelectorAll('[data-ins]').forEach(e => e.classList.toggle('on', e.dataset.ins === id));
    } catch (e) { console.warn('inset', e); }
    insBusy = false;
  }
  function drawInset(dt, t) {
    const on = cur === 1 && tIn > .75 && SM1; if (insEl) insEl.classList.toggle('on', !!(on && insObj)); if (!on || !insEl) return;
    insT += dt; if (insT > 4.2) nextInset(); if (!insObj) return;
    const r = insEl.getBoundingClientRect(), H = innerHeight; if (r.width < 10) return;
    insMix && insMix.update(dt); insObj.rotation.y = reduce ? .6 : t * .35;
    IC.aspect = r.width / r.height; IC.position.set(0, .32, 1.3); IC.lookAt(0, 0, 0); IC.updateProjectionMatrix();
    R.setScissorTest(true); R.setViewport(r.left, H - r.bottom, r.width, r.height); R.setScissor(r.left, H - r.bottom, r.width, r.height);
    R.setClearColor(0x070b14, 1); R.clear(); R.render(IS, IC); R.setScissorTest(false); R.setViewport(0, 0, innerWidth, innerHeight); R.setClearColor(0x03060f, 1);
  }

  // ---- カメラの決まった角度（場面ごと）
  const KF = [
    { p: AO.clone().add(new THREE.Vector3(-40, mobile ? 190 : 85, mobile ? 300 : 330)), t: AO.clone().add(new THREE.Vector3(mobile ? 20 : -95, 0, -120)) },             // 0 VISION：参道を南の上から北へ見る
    { p: BO.clone().add(new THREE.Vector3(mobile ? 2 : 6, mobile ? 30 : 15, mobile ? 46 : 36)), t: BO.clone().add(new THREE.Vector3(mobile ? 0 : -9, mobile ? -15 : 1, mobile ? 6 : 0)) },   // 1 環世界 1.0
    { p: AO.clone().add(new THREE.Vector3(mobile ? 3 : 9, mobile ? 14 : 10, mobile ? 30 : 27)), t: AO.clone().add(new THREE.Vector3(mobile ? 0 : -7, mobile ? .5 : 4.5, 0)) }, // 2 環世界 2.0
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
    if (!real1 && !frame.r1 && (cur >= 1 || now > 2500)) { frame.r1 = 1; loadReal1(); }
    if (g1.visible) { for (let j = 0; j < 4; j++) for (let k = 0; k < 6; k++) { const u = reduce ? k / 6 : (t * .22 + k / 6 + j * .13) % 1; qArc[j].getPoint(u, _v); puP.set([_v.x, _v.y, _v.z], (j * 6 + k) * 3); } puG.attributes.position.needsUpdate = true; }
    if (real1 && g1.visible) { const u = real1.userData; u.sp.forEach(m => m.update(reduce ? 0 : dt));
      if (!reduce) { if (u.bat) u.bat.object.position.set(-11 + Math.sin(t * .5) * 3, 7.5 + Math.sin(t * 1.1) * .5, -8 + Math.cos(t * .5) * 2), u.bat.object.rotation.y = .9 - t * .5; if (u.ageha) u.ageha.object.position.y = u.BEE.y + 1 + Math.sin(t * 1.7) * .3; } }
    if (real1 && g1.visible && !reduce) { const u = real1.userData; u.bee.position.copy(u.BEE).add(new THREE.Vector3(Math.sin(t * .9) * .25, Math.sin(t * 2.1) * .08, Math.cos(t * .7) * .2)); u.person.userData.animate && u.person.userData.animate(t, false); }
    qM.opacity = .55 + (reduce ? 0 : Math.sin(t * 2) * .15);
    if (g1.visible) { [bH, bB, bT, bW].forEach((b, i) => { b.scale.setScalar(1 + (reduce ? 0 : Math.sin(t * 1.3 + i) * .025)); }); cues.rotation.y = reduce ? 0 : t * .02; }
    // 層の板：2.0 に入ると一枚ずつ重なる
    const lp = cur >= 2 ? Math.min(5, (cur === 2 ? sceneT : 9) / .7) : 0;
    plates.forEach((g, i) => { const on = Math.max(0, Math.min(1, lp - i)); g.visible = on > 0; g.userData.fill.material.opacity = .1 * on; g.userData.line.material.opacity = .85 * on; g.position.y = g.userData.y - (1 - on) * 3; if (!reduce) g.rotation.y = t * .03 * (i % 2 ? 1 : -1); });
    tieM.opacity = .18 * Math.min(1, lp / 5);
    plates.forEach((g, i) => { const on = Math.max(0, Math.min(1, lp - i)); g.userData.ex.forEach(([m, o]) => m.opacity = o * on); });
    { const u = Math.min(1, lp / 5); b2.material.opacity = cur === 2 ? .08 + .14 * u : 0; b2.scale.setScalar(1.4 + u * (mobile ? 3.2 : 4.6)); }
    obsM.opacity = cur >= 2 ? .55 : 0; treeM.opacity = cur === 2 ? .07 : cur === 1 ? .1 : .26;
    S.fog.density = cur >= 3 ? .00016 : cur === 0 ? .0008 : .0016;
    // 碧とかさねっこの毎こまは、読み込みの途中（中の配列がまだ空）でも絵の全体を止めない（2026-10-26 見回りで "reading '0'" が 1 回）
    if (vrm && g2.visible) { try { if (mot) mot.update(dt, cam); else vrm.update(dt); } catch (e) { if (!frame.w1) { frame.w1 = 1; console.warn('aoi update', e); } } }
    if (herd) { try { herd.update(dt, { active: cur === 2, busy: false }); } catch (e) { if (!frame.w2) { frame.w2 = 1; console.warn('kasane update', e); } } }
    if (cur >= 2 && !agentsAsked) { agentsAsked = true; loadAgents(); }
    R.render(S, cam);
    drawInset(dt, t);
    // 札
    const W = innerWidth, H = innerHeight, placed = [];
    labs.forEach(el => { const sc = el.dataset.sc.split(',').map(Number), on = sc.includes(cur) && tIn > .75; if (!on) { if (el.classList.contains('on')) el.classList.remove('on'); return; }
      if (mobile && el.dataset.m === '0') { el.classList.remove('on'); return; }
      const id = el.dataset.at; let p = AT[id]; if (!p) return; if (/^l\d$/.test(id)) { const g = plates[+id[1] - 1]; _v.set(p.x, g.position.y, p.z); } else _v.copy(p);
      _v.project(cam); const vis = _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05; el.classList.toggle('on', vis);
      if (vis) { const w = el.offsetWidth || 160, h = el.offsetHeight || 30, x = Math.min(W - w - 12, ((_v.x + 1) / 2 * W)) | 0; let y = ((1 - _v.y) / 2 * H) | 0;   // 札どうしが重ならないよう、下へずらす
        for (let n = 0; n < 8 && placed.some(r => x < r[2] && x + w > r[0] && y < r[3] && y + h > r[1]); n++) y += h * .55 + 2;
        placed.push([x, y, x + w, y + h]); el.style.transform = `translate3d(${x}px,${y}px,0)`; } });
  }
  requestAnimationFrame(frame);
  document.documentElement.classList.add('v2-3d');
  window.__v2 = 'ok'; if (/[?&]dbg/.test(location.search)) window.__v2d = { cam, S, R, AO, BO, KF, go };
}
