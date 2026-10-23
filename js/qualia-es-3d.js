// PHILOSOPHY の 3D「環境と主体のあいだに、Qualia がある。」（2026-10-24 TOP の一番上の図。式の札は既定で出さず、「図に式を出す」で出す）
// 2026-10-23 三回目・本人「数式を追加してください。また、人間、碧、かさねっこを表示してください。環境エージェント、主体エージェント、Qualia、Qualium など関係性を 3D グラフィカル上で表現してください。」
// 見せること：
//   中央＝環境エージェント E（場所：石畳の一区画・等高線・記録の柱・宙に浮かぶ見取り図）。そのそばに碧（環境エージェント・q を人へ訳す）。
//   E の上には、かさねっこ（五つの層の色の小さな環境エージェント）の群れ。q が立つとき、頭から光を運び上げて殻を重ねる。
//   まわり＝主体エージェント S（人・ミツバチ・コウモリ・機械）。感覚の通り道で E と向き合い、Φ の輪を通ると、その主体だけの q の殻が E のまわりに立つ。
//   四つの q が立ったあと、碧がミツバチの q を、人が受けとれる一枚の層 L に訳して人の前へ置く（L ≠ q）。最後に、すべてが重なる場＝Qualium（𝒬）。
//   式は定式化と同じ記号で、要素のそばに浮かべる（いま光る関係の式を強く、ほかは薄く）。一巡およそ 30 秒。主体を選ぶと、その関係からもう一度。
// ・カメラは回さない（斜め上の一つの向き）。碧は共通部品 aoi_motion.js（層の図と同じ upright・反り腰なし）。かさねっこは共通部品 kit/envAgents/kasane.js
// ・ミツバチとコウモリは共通部品の生きもの（js/kit/creatures.js）。人は形だけの模型。大きさは見やすく誇張した模式で、線と点は実測の値ではない
// ・画面に近づいてから読む・画面の外とタブを隠したときは止める・動きを減らす設定では重なった一こまだけ描く
import * as THREE from 'three';
import { lineMaterial, pointMaterial, contours, pillars } from './kit/layers.js';
import { makeBee, makeBat } from './kit/creatures.js';
import { LAYER5 } from './kit/layer-colors.js?v=20261023k';

const SUBJ = [
  { key: 'hito', c: 0xf4aa96 },
  { key: 'hachi', c: 0xc4b2ff },
  { key: 'komori', c: 0x78b8ec },
  { key: 'kikai', c: 0xc2c7cc },
];
const E_C = 0x5fb8d0, QM_C = 0xa8f2f6, AOI_C = 0x8fe6f0;
const SLOT = 4.6, TR = 5.4, ALL = 4.8, OUT = 1.4;
const T_TR = SLOT * 4, T_ALL = T_TR + TR, CYCLE = T_ALL + ALL + OUT;
const J = 1, TO = 0;   // 訳す：ミツバチ（j）の q を、人（s）へ

export function boot(fig) {
  const stage = fig.querySelector('[data-es3d]');
  const mobile = innerWidth < 700 || matchMedia('(pointer:coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas'); cv.className = 'qp-es-cv'; cv.setAttribute('aria-hidden', 'true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (e) { fig.classList.add('no-3d'); return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  R.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(cv);

  const S = new THREE.Scene();
  S.fog = new THREE.Fog(0x03060f, 24, 42);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 80);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 7, 6); S.add(key);
  const rim = new THREE.DirectionalLight(0x8fe6f0, .8); rim.position.set(-5, 3, -4); S.add(rim);
  const g = new THREE.Group(); S.add(g);
  const geo = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const bump = (a, b, c, d, x) => sstep(a, b, x) * (1 - sstep(c, d, x));
  const ringGeo = (r, y = 0, n = 96) => { const p = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2; p.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } return geo(p); };

  // ── E：環境エージェント（場所） ──
  const RAD = 2.4;
  {
    const tl = new THREE.TextureLoader();
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2.4, 2.4);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, color: 0xa9a59b, transparent: true, depthWrite: false });
    if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(2.4, 2.4); mat.normalMap = n; mat.normalScale = new THREE.Vector2(.7, .7); }
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
    const gr = ax.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.62, '#ddd'); gr.addColorStop(.88, '#333'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
    mat.alphaMap = new THREE.CanvasTexture(ac);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RAD * 1.2, 64), mat); m.rotation.x = -Math.PI / 2; g.add(m);
  }
  const hAt = (x, z) => .3 * Math.exp(-((x - .5) ** 2 + (z + .3) ** 2) / 2.2) + .12 * Math.exp(-((x + 1.1) ** 2 + (z - .7) ** 2) / 1);
  const clip = (cl, r) => { const p = cl.geometry.attributes.position.array, keep = []; for (let i = 0; i < p.length; i += 6) if (Math.hypot(p[i], p[i + 2]) < r && Math.hypot(p[i + 3], p[i + 5]) < r) keep.push(...p.slice(i, i + 6)); cl.geometry.dispose(); cl.geometry = geo(keep); return cl; };
  g.add(clip(contours(hAt, { x0: -RAD, x1: RAD, z0: -RAD, z1: RAD, cell: .12, step: .05, lift: .02, color: E_C, opacity: .5 }), RAD * .95));
  const SRC = [[-1.3, -.6], [-.2, -1.5], [1.4, -.9], [1.0, .5]].map(([x, z]) => [x, hAt(x, z), z]);
  g.add(pillars(SRC, { height: .7, color: 0xb4a2ff, opacity: .5 }));
  const model = new THREE.Group(); model.position.set(0, 1.55, -.3); g.add(model);
  {
    const mini = clip(contours(hAt, { x0: -RAD, x1: RAD, z0: -RAD, z1: RAD, cell: .2, step: .07, lift: 0, color: E_C, opacity: .8 }), RAD * .95);
    mini.scale.setScalar(.2); model.add(mini);
    model.add(new THREE.LineSegments(ringGeo(.5, 0, 64), lineMaterial(E_C, .6)));
    model.add(new THREE.LineSegments(geo([0, -1.5, 0, 0, -.05, 0]), lineMaterial(E_C, .35)));
  }
  const E_TOP = new THREE.Vector3(0, .9, -.3);

  // ── S：主体エージェント（E を囲む。人と機械は手前の左右、ミツバチとコウモリは奥の宙） ──
  const POS = [[-5.1, 0, 1.5], [-3.7, 2.1, -3.3], [3.9, 2.7, -3.0], [5.1, 0, 1.5]];
  const mat = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: o.rough ?? .7, metalness: o.metal ?? 0, transparent: !!o.transparent, opacity: o.opacity ?? 1 });
  let person = null;
  const subj = SUBJ.map((s, i) => {
    const [x, y, z] = POS[i], grp = new THREE.Group(); grp.position.set(x, y, z); g.add(grp);
    const toE = new THREE.Vector3(-x, 0, -z).normalize(), yaw = Math.atan2(toE.x, toE.z);
    let eye = new THREE.Vector3(x, y, z), body = null, deco = null;
    if (s.key === 'hito') {   // 人：形だけの人の模型（1.7 m の模式）と、目の高さからの視線の扇
      person = makePerson(); person.scale.setScalar(1.12); person.rotation.y = yaw; grp.add(person);
      eye = new THREE.Vector3(x, 1.6, z);
      const fan = []; for (let k = -3; k <= 3; k++) { const a = yaw + k * .15, d = 3.4; fan.push(0, 1.6, 0, Math.sin(a) * d, .12, Math.cos(a) * d); }
      deco = new THREE.LineSegments(geo(fan), lineMaterial(s.c, 0)); grp.add(deco);
    } else if (s.key === 'hachi') {
      body = makeBee(); body.scale.setScalar(1.05); body.rotation.y = yaw; grp.add(body);
    } else if (s.key === 'komori') {
      const wrap = new THREE.Group(); body = makeBat(); body.scale.setScalar(1.25); wrap.add(body); wrap.rotation.y = yaw; grp.add(wrap);
    } else {   // 機械：三脚の上の写真機と、その画角
      const metal = mat(0x3a4148, { rough: .45, metal: .6 }), dark = mat(0x15191d, { rough: .3, metal: .4 }), glass = mat(0x0b1a24, { rough: .08, metal: .2 });
      const cam3 = new THREE.Group(); cam3.position.y = 1.15; cam3.scale.setScalar(1.5); cam3.rotation.y = yaw; grp.add(cam3);
      cam3.add(new THREE.Mesh(new THREE.BoxGeometry(.42, .28, .24), metal));
      const top = new THREE.Mesh(new THREE.BoxGeometry(.16, .06, .14), dark); top.position.set(-.08, .17, 0); cam3.add(top);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(.095, .1, .24, 24), dark); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0, .23); cam3.add(lens);
      const lg = new THREE.Mesh(new THREE.CircleGeometry(.08, 24), glass); lg.position.set(0, 0, .352); cam3.add(lg);
      const led = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a4a })); led.position.set(.16, .09, .121); cam3.add(led);
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + .4, leg = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, 1.22, 8), dark); leg.position.set(Math.cos(a) * .2, .55, Math.sin(a) * .2); leg.rotation.set(Math.sin(a) * .34, 0, -Math.cos(a) * .34); grp.add(leg); }
      eye = new THREE.Vector3(x, 1.15, z).addScaledVector(toE, .35);
      const c0 = new THREE.Vector3(0, 1.15, 0).addScaledVector(toE, .35), aim = new THREE.Vector3(-x, .05, -z), side = new THREE.Vector3(toE.z, 0, -toE.x);
      const fr = []; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = aim.clone().addScaledVector(side, a * 1.1).add(new THREE.Vector3(0, b > 0 ? .9 : 0, 0)); fr.push(c0.x, c0.y, c0.z, p.x, p.y, p.z); }
      deco = new THREE.LineSegments(geo(fr), lineMaterial(s.c, 0)); grp.add(deco);
    }
    // Φ：主体と E のあいだの輪（関係のかたち）
    const gate = eye.clone().lerp(E_TOP, .5), dir = E_TOP.clone().sub(eye).normalize();
    const ringP = []; for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2, b = (k + 1) / 64 * Math.PI * 2; ringP.push(Math.cos(a) * .36, Math.sin(a) * .36, 0, Math.cos(b) * .36, Math.sin(b) * .36, 0); }
    const gm = lineMaterial(QM_C, .12), gateL = new THREE.LineSegments(geo(ringP), gm);
    gateL.position.copy(gate); gateL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); g.add(gateL);
    const curve = new THREE.QuadraticBezierCurve3(eye.clone(), gate.clone().add(new THREE.Vector3(0, .5, 0)), E_TOP.clone());
    const pathL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), lineMaterial(s.c, 0)); g.add(pathL);
    const NP = mobile ? 14 : 22, PP = new Float32Array(NP * 3), PT = []; for (let k = 0; k < NP; k++) PT.push(k / NP);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(PP, 3));
    const pm = pointMaterial(s.c, s.key === 'hachi' ? .11 : .09, 0), pts = new THREE.Points(pg, pm); pts.frustumCulled = false; g.add(pts);
    let arcs = null;
    if (s.key === 'komori') { arcs = []; for (let k = 0; k < 4; k++) { const ap = []; for (let a = 0; a <= 24; a++) { const th = -.9 + a / 24 * 1.8; ap.push(new THREE.Vector3(Math.sin(th) * .4, Math.cos(th) * .4 - .4, 0)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ap), lineMaterial(s.c, 0)); g.add(l); arcs.push(l); } }
    // q：E のまわりに立つ、この主体だけの殻（主体ごとに網の目が違う）
    const qR = 2.55 + i * .22, dome = new THREE.Group(); dome.position.z = -.3; g.add(dome);
    const dl = [];
    const lat = (phi, wob) => { for (let a = 0; a < 96; a++) { const t0 = a / 96 * Math.PI * 2, t1 = (a + 1) / 96 * Math.PI * 2, r0 = qR * Math.cos(phi) * (1 + wob(t0)), r1 = qR * Math.cos(phi) * (1 + wob(t1)), h = qR * Math.sin(phi) * .62; dl.push(Math.cos(t0) * r0, h, Math.sin(t0) * r0, Math.cos(t1) * r1, h, Math.sin(t1) * r1); } };
    const lon = (th, n) => { for (let k = 0; k < n; k++) { const p0 = k / n * Math.PI / 2 * .92, p1 = (k + 1) / n * Math.PI / 2 * .92; dl.push(Math.cos(th) * qR * Math.cos(p0), qR * Math.sin(p0) * .62, Math.sin(th) * qR * Math.cos(p0), Math.cos(th) * qR * Math.cos(p1), qR * Math.sin(p1) * .62, Math.sin(th) * qR * Math.cos(p1)); } };
    const none = () => 0;
    if (s.key === 'hito') { for (const p of [.12, .45, .8]) lat(p, none); }
    else if (s.key === 'hachi') { lat(.12, none); }
    else if (s.key === 'komori') { for (const p of [.1, .34, .6]) lat(p, t => .035 * Math.sin(t * 9 + p * 10)); }
    else { for (const p of [.1, .42, .74]) lat(p, none); for (let k = 0; k < 8; k++) lon(k / 8 * Math.PI * 2, 8); }
    const dm = lineMaterial(s.c, 0); dome.add(new THREE.LineSegments(geo(dl), dm));
    const bm = lineMaterial(s.c, 0), base = new THREE.LineSegments(ringGeo(qR, .04), bm); base.position.z = -.3; g.add(base);
    let dpm = null;
    if (s.key === 'hachi') { const dp = []; for (let k = 0; k < 22; k++) for (let j = 1; j < 8; j++) { const th = (k + (j % 2) * .5) / 22 * Math.PI * 2, p = j / 9 * Math.PI / 2 * .92; dp.push(Math.cos(th) * qR * Math.cos(p), qR * Math.sin(p) * .62, Math.sin(th) * qR * Math.cos(p)); } dpm = pointMaterial(s.c, .08, 0); dome.add(new THREE.Points(geo(dp), dpm)); }
    dome.scale.y = .01;
    return { s, grp, body, deco, gateL, gm, pathL, curve, NP, PP, PT, pg, pm, arcs, dome, dm, dpm, base, bm, qR, eye, gate, w: 0 };
  });
  const qmRing = new THREE.LineSegments(ringGeo(4.05, .03, 128), lineMaterial(QM_C, 0)); qmRing.position.z = -.3; g.add(qmRing);

  // ── 碧：E のそば（手前・人の側）に立ち、ミツバチの q を、人が受けとれる層 L に訳す ──
  const A_P = new THREE.Vector3(-2.15, 0, 3.05), A_H = 2.05, A_HAND = new THREE.Vector3(-2.35, 1.25, 2.75);
  let mot = null, vrm = null, aoiPivot = null, aoiFrames = 0, aoiLoading = false;
  async function loadAoi() {
    if (aoiLoading) return; aoiLoading = true;
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'), import('@pixiv/three-vrm')]);
      const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder); L.register(p => new V.VRMLoaderPlugin(p));
      const buf = await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())));
      const gl = await L.parseAsync(buf.slice(0), '');
      vrm = gl.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(gl.scene); V.VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      const pivot = new THREE.Group(); pivot.add(vrm.scene); pivot.visible = false; aoiPivot = pivot; g.add(pivot);
      vrm.humanoid.resetNormalizedPose(); vrm.update(0);
      const bb = new THREE.Box3().setFromObject(vrm.scene); pivot.scale.setScalar(A_H / (bb.max.y - bb.min.y)); pivot.position.copy(A_P);
      const { AoiMotion } = await import('./aoi_motion.js?v=20261023-v60');
      mot = new AoiMotion(vrm, { root: pivot, reducedMotion: reduce, wind: .25, faceViewer: false, startCalm: 1, posture: 'upright', uprightWeight: .9 });
      mot.faceTo(-.35);
      vrm.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (!/CLOTH/.test(m.name || '') || /Outline/.test(m.name || '')) return;
        if (m.emissive) m.emissive.multiplyScalar(.4); if (m.parametricRimColorFactor) m.parametricRimColorFactor.multiplyScalar(.35); if ('shadingToonyFactor' in m) m.shadingToonyFactor = Math.min(m.shadingToonyFactor, .3); }); });
      kick();
    } catch (e) { console.warn('qualia es aoi', e); }
  }
  const FIX = { pelvis: .13, chest: .045 }, _qa = new THREE.Quaternion(), _ex = new THREE.Vector3(1, 0, 0);
  function rotX(name, a, pre) { const b = vrm.humanoid.getNormalizedBoneNode(name); if (!b) return; _qa.setFromAxisAngle(_ex, a); if (pre) b.quaternion.premultiply(_qa); else b.quaternion.multiply(_qa); }
  function stand() { rotX('hips', -FIX.pelvis); rotX('leftUpperLeg', FIX.pelvis, 1); rotX('rightUpperLeg', FIX.pelvis, 1); rotX('spine', FIX.pelvis * .85, 1); rotX('upperChest', FIX.chest); rotX('neck', -FIX.chest * .7, 1); }

  // L：碧が訳した一枚の層（人の前に置く。ミツバチの q の写しの模式＝花の模様の点。q そのものではない）
  const PANE_P = new THREE.Vector3(-3.95, 1.45, 1.75);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(.95, .66), new THREE.MeshBasicMaterial({ map: paneTex(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  pane.position.copy(PANE_P); pane.lookAt(new THREE.Vector3(POS[0][0], 1.6, POS[0][2])); g.add(pane);
  // 訳の流れ：ミツバチの殻 → 碧の手 → 層 L
  const NT = mobile ? 26 : 44, TP = new Float32Array(NT * 3), TC = new Float32Array(NT * 3), TT = []; for (let k = 0; k < NT; k++) TT.push(k / NT);
  const qJ = subj[J], qFrom = new THREE.Vector3(-qJ.qR * .55, qJ.qR * .62 * .55, qJ.qR * .55 - .3);
  const trA = new THREE.QuadraticBezierCurve3(qFrom, new THREE.Vector3(-2.6, 2.3, 2.0), A_HAND), trB = new THREE.QuadraticBezierCurve3(A_HAND, new THREE.Vector3(-3.2, 1.8, 2.5), PANE_P);
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(TP, 3)); tg.setAttribute('color', new THREE.BufferAttribute(TC, 3));
  const tm = new THREE.PointsMaterial({ size: .1, map: dotTex(), vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const trPts = new THREE.Points(tg, tm); trPts.frustumCulled = false; g.add(trPts);
  const cBee = new THREE.Color(SUBJ[J].c), cAoi = new THREE.Color(AOI_C), cTo = new THREE.Color(0xf6e4ff), tmpC = new THREE.Color();

  // ── かさねっこ：E の上に、五つの層の色の小さな群れ。q が立つとき、頭から光を運び上げて殻へ重ねる ──
  let herd = null;
  setTimeout(async () => {
    try {
      const M = await import('./kit/envAgents/kasane.js?v=20261023m');
      const body = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.body.toString(16).padStart(6, '0')])), hud = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.c.toString(16).padStart(6, '0')]));
      const ok = (x, z) => Math.hypot(x, z + .3) < 2.25 && Math.hypot(x - A_P.x, z - A_P.z) > .9 && Math.hypot(x, z + .3) > .55;
      herd = new M.KasaneHerd({ scene: g, camera: cam, groundAt: (x, z) => hAt(x, z), walkable: ok, body, hud, scale: mobile ? 2.6 : 2.3, mobile, maxDist: 80, max: 12, guideEvery: 1e9, shadow: !mobile });
      herd.addGroup(['sight', 'touch', 'sound', 'nature', 'culture'].map(l => ({ layer: l })), { x: -.9, z: .9, radius: .8, role: 'watch' });
      herd.addGroup(['nature', 'culture', 'sound', 'touch'].map(l => ({ layer: l })), { x: 1.1, z: .2, radius: .8 });
      if (!mobile) herd.addGroup(['sight', 'nature', 'culture'].map(l => ({ layer: l })), { x: .1, z: -1.4, radius: .7 });
      await herd.load(); kick();
    } catch (e) { console.warn('qualia es kasane', e); }
  }, 500);
  const NK = 12, KP = new Float32Array(NK * 3), kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.BufferAttribute(KP, 3));
  const km = new THREE.PointsMaterial({ size: .13, map: dotTex(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const kPts = new THREE.Points(kg, km); kPts.frustumCulled = false; g.add(kPts);
  const kLines = new THREE.LineSegments(geo(new Array(NK * 6).fill(0)), lineMaterial(0xffffff, 0)); kLines.frustumCulled = false; g.add(kLines);

  // ── 札と式（HTML。3D の点に寄せる） ──
  const labs = [...stage.querySelectorAll('[data-at]')];
  const v = new THREE.Vector3(), AT = {};
  function placeLabs(st) {
    const cur = subj[st.sel];
    AT.e = new THREE.Vector3(1.0, 0, 3.25);
    AT.xe = new THREE.Vector3(3.5, 0, 2.3);
    AT.phi = new THREE.Vector3(0, mobile ? 2.4 : 2.75, -.3);
    AT.q = new THREE.Vector3(cur.qR * .98, cur.qR * .62 * .35, -.6);
    AT.qm = new THREE.Vector3(.2, 3.5, -3.4);
    AT.aoi = A_P.clone().add(new THREE.Vector3(-.15, 0, .5));
    AT.L = PANE_P.clone().add(new THREE.Vector3(0, .42, 0));
    AT.kasane = mobile ? new THREE.Vector3(2.6, .05, 4.9) : new THREE.Vector3(3.7, .05, 3.4);   // 2026-10-24 輪にかからないよう、輪の外（手前）へ
    for (let i = 0; i < 4; i++) AT['s' + i] = i === 0 ? new THREE.Vector3(POS[0][0], -.05, POS[0][2] + .3) : subj[i].eye.clone().add(new THREE.Vector3(0, i === 3 ? .5 : .75, 0));
    labs.forEach(el => {
      const at = el.dataset.at, p = AT[at]; if (!p) return;
      let a = 1;
      if (/^s\d$/.test(at)) a = +at[1] === st.sel && st.ph === 'slot' ? 1 : (+at[1] === TO || +at[1] === J) && st.ph === 'tr' ? 1 : st.ph === 'all' ? .55 : .3;
      else if (at === 'phi') a = st.ph === 'slot' ? Math.min(1, cur.w * 1.4) : 0;
      else if (at === 'q') a = st.ph === 'slot' ? Math.min(1, cur.w * 1.4) : 0;
      else if (at === 'qm') a = st.ph === 'all' ? 1 : .32;
      else if (at === 'L') a = st.ph === 'tr' ? st.pane : st.ph === 'all' ? .45 : 0;
      else if (at === 'aoi') a = st.ph === 'tr' ? 1 : .6;
      else if (at === 'kasane') a = st.ph === 'slot' ? .5 + .5 * st.lift : .5;
      else if (at === 'xe') a = st.ph === 'slot' && st.a < 1.6 ? 1 : .32;
      if (eqClosed() && el.classList.contains('qe-eqlab')) a = 0;   // 2026-10-24 図の式は既定で出さない（ボタンで出す）
      a *= st.out;
      v.copy(p).applyMatrix4(g.matrixWorld).project(cam);
      const hw = (el.offsetWidth || 0) / 2 + 4; let px = (v.x * .5 + .5) * W; if (hw * 2 < W) px = Math.max(hw, Math.min(W - hw, px));   // 画面の左右で切れない
      todo.push({ el, a, px, py: (-v.y * .5 + .5) * Hh, w: el.offsetWidth || 0, h: el.offsetHeight || 0 });
    });
    // 2026-10-23 夜（375px で式と札が重なる）：濃い札から順に置き、重なる札は上下に少しずらす。避けきれない薄い札は出さない
    todo.sort((x, y) => y.a - x.a); const boxes = [];
    for (const o of todo) {
      let ok = o.a < .02, yy = o.py;
      if (!ok) for (const d of [0, -1, 1, -2, 2]) { yy = o.py + d * (o.h * .6 + 3); o.el.style.transform = 'translate(' + Math.round(o.px) + 'px,' + Math.round(yy) + 'px)';
        const r = o.el.getBoundingClientRect(), bx = [r.left - 2, r.top - 2, r.right + 2, r.bottom + 2]; if (!boxes.some(c => bx[0] < c[2] && bx[2] > c[0] && bx[1] < c[3] && bx[3] > c[1])) { boxes.push(bx); ok = true; break; } }
      const a = ok ? o.a : 0; o.el.style.opacity = a.toFixed(2); o.el.classList.toggle('on', a > .9);
      if (o.a < .02) o.el.style.transform = 'translate(' + Math.round(o.px) + 'px,' + Math.round(o.py) + 'px)';
    }
    todo.length = 0;
  }
  const todo = [];

  // ── 主体を選ぶ（押すと、その主体の関係からもう一度。押さなければ順に巡る） ──
  const btns = [...fig.querySelectorAll('[data-subj]')], lines = [...fig.querySelectorAll('[data-subj-line]')], phLines = [...fig.querySelectorAll('[data-phase-line]')];
  let sel = 0, curPh = '', tc = reduce ? T_ALL + 2 : 0;
  function showSel(i, ph) {
    if (i === sel && ph === curPh) return; sel = i; curPh = ph;
    btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i && ph === 'slot' ? 'true' : 'false'));
    lines.forEach((l, k) => l.classList.toggle('on', ph === 'slot' && k === i));
    phLines.forEach(l => l.classList.toggle('on', l.dataset.phaseLine === ph));
  }
  btns.forEach((b, i) => b.addEventListener('click', () => { tc = i * SLOT; showSel(i, 'slot'); kick(); }));
  const eqBtn = fig.querySelector('[data-eq-toggle]');
  function eqClosed() { return fig.classList.contains('eq-closed'); }
  if (eqBtn) eqBtn.addEventListener('click', () => { const open = eqClosed(); fig.classList.toggle('eq-closed', !open); eqBtn.setAttribute('aria-pressed', open ? 'true' : 'false'); if (reduce) render(performance.now(), true); else kick(); });

  let W = 0, Hh = 0;
  const size = () => {
    W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); cam.userData.d = Math.max((mobile ? 6.9 : 6.1) / (t * cam.aspect), 4.1 / t);
    cam.updateProjectionMatrix();
  };
  new ResizeObserver(() => { size(); render(performance.now(), true); }).observe(cv); size();

  let vis = true, raf = 0, last = performance.now(); const t0 = last;
  const tmpV = new THREE.Vector3(), st = { sel: 0, ph: 'slot', a: 0, lift: 0, pane: 0, out: 1 };
  window.__qpESready = false;
  function render(now, still) {
    const dt = still ? 0 : Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; const t = (now - t0) / 1000;
    if (!reduce && !still) tc = (tc + dt) % CYCLE;
    const ph = tc < T_TR ? 'slot' : tc < T_ALL ? 'tr' : 'all';
    const slot = ph === 'slot' ? Math.min(3, Math.floor(tc / SLOT)) : ph === 'tr' ? J : sel, a = tc - slot * SLOT;
    const allA = sstep(T_ALL, T_ALL + 1.2, tc) * (1 - sstep(CYCLE - OUT, CYCLE - .2, tc));
    const out = 1 - sstep(CYCLE - OUT, CYCLE - .1, tc), trT = tc - T_TR;
    showSel(slot, ph);
    const d = cam.userData.d || 22, br = reduce ? 0 : Math.sin(t * .45) * .05;
    cam.position.set(0, 1.0 + d * .52 + br, d * .86); cam.lookAt(0, 1.3, .1);
    model.rotation.y = reduce ? .4 : t * .22;
    let lift = 0;
    subj.forEach((u, i) => {
      const cur = ph === 'slot' && i === slot, done = ph !== 'slot' || i < slot;
      const reach = cur ? sstep(0, 1.6, a) : 0, gl = cur ? bump(.9, 1.6, 2.6, 3.4, a) : 0;
      const rise = cur ? sstep(1.8, 3.8, a) : done ? 1 : 0;
      if (cur) lift = bump(1.5, 2.2, 3.4, 4.2, a);
      u.w += ((cur ? 1 : 0) - u.w) * (reduce ? 1 : Math.min(1, dt * 3));
      const isJ = ph === 'tr' && i === J, jb = isJ ? bump(0, .8, 3.6, 4.6, trT) : 0;
      const flash = cur ? bump(1.8, 2.6, 3.2, 4.4, a) : 0;
      const domeA = (cur ? .3 + .45 * rise + .35 * flash : done ? (ph === 'tr' ? (isJ ? .3 + .5 * jb : .12) : .2 + .45 * allA) : 0) * out;
      u.bm.opacity = (cur ? .25 + .75 * rise : done ? (ph === 'tr' ? .2 + .5 * jb : .35 + .4 * allA) : 0) * out; u.base.scale.setScalar(cur ? .7 + .3 * rise : 1);
      u.dm.opacity = domeA; if (u.dpm) u.dpm.opacity = domeA * 1.1;
      u.dome.scale.y = Math.max(.01, rise * (1 + (allA && !reduce ? .025 * Math.sin(t * 2 + i) : 0)));
      u.dome.rotation.y = reduce ? 0 : t * (.03 + i * .008) * (i % 2 ? -1 : 1);
      u.gm.opacity = (.14 + .8 * gl + .25 * allA) * out; u.gateL.scale.setScalar(1 + .25 * gl);
      u.pathL.material.opacity = (.08 + .5 * reach * (1 - .5 * sstep(3.4, 4.6, a))) * out;
      if (u.deco) u.deco.material.opacity = (.12 + .6 * reach + (ph === 'tr' && i === TO ? .3 * sstep(2.6, 3.6, trT) : 0)) * out;
      const flow = cur ? reach : 0;
      for (let k = 0; k < u.NP; k++) { if (!reduce) u.PT[k] = (u.PT[k] + dt * .32) % 1; const f = u.PT[k] * Math.max(.02, flow); u.curve.getPoint(f, tmpV); u.PP[3 * k] = tmpV.x; u.PP[3 * k + 1] = tmpV.y; u.PP[3 * k + 2] = tmpV.z; }
      u.pg.attributes.position.needsUpdate = true; u.pm.opacity = .95 * flow * out;
      if (u.arcs) u.arcs.forEach((l, k) => { const f = ((t * .45 + k / u.arcs.length) % 1) * flow; u.curve.getPoint(f, tmpV); l.position.copy(tmpV); l.lookAt(E_TOP); l.scale.setScalar(.6 + f * 1.4); l.material.opacity = .8 * flow * (1 - f) * out; });
      if (u.body && !reduce && !still) { if (u.s.key === 'hachi') { u.body.position.set(Math.sin(t * .7) * .25, Math.sin(t * 1.1) * .12, Math.cos(t * .5) * .18); } u.body.userData.animate(t); }
    });
    qmRing.material.opacity = .75 * allA;
    // 訳：ミツバチの q → 碧の手 → L
    const trOn = ph === 'tr' ? bump(.6, 1.2, 4.4, 5.2, trT) : 0, paneA = ph === 'tr' ? sstep(2.4, 3.4, trT) : ph === 'all' ? .55 * out : 0;
    for (let k = 0; k < NT; k++) {
      if (!reduce) TT[k] = (TT[k] + dt * .3) % 1;
      const f = TT[k], inA = f < .5, c = inA ? trA : trB; c.getPoint(inA ? f * 2 : f * 2 - 1, tmpV);
      TP[3 * k] = tmpV.x; TP[3 * k + 1] = tmpV.y; TP[3 * k + 2] = tmpV.z;
      if (inA) tmpC.copy(cBee).lerp(cAoi, f * 2); else tmpC.copy(cAoi).lerp(cTo, f * 2 - 1);
      const vis2 = inA ? 1 : sstep(1.6, 2.4, trT);
      TC[3 * k] = tmpC.r * vis2; TC[3 * k + 1] = tmpC.g * vis2; TC[3 * k + 2] = tmpC.b * vis2;
    }
    tg.attributes.position.needsUpdate = true; tg.attributes.color.needsUpdate = true; tm.opacity = .95 * trOn;
    pane.material.opacity = .9 * paneA;
    // かさねっこが光を運び上げる（今の主体の色）
    if (herd && herd.ready !== false && herd.agents.length) {
      const col = new THREE.Color(SUBJ[slot].c), u = subj[slot], lp = kLines.geometry.attributes.position.array;
      for (let k = 0; k < NK; k++) {
        const ag = herd.agents[k]; if (!ag) { KP[3 * k + 1] = -99; continue; }
        ag.center(tmpV); const top = tmpV.y + .32, rr = Math.hypot(tmpV.x, tmpV.z + .3), hd = rr < u.qR ? u.qR * Math.sin(Math.acos(Math.min(1, rr / u.qR))) * .62 : top;
        const f = reduce ? .5 : ((t * .55 + k / NK) % 1), y = top + (Math.max(top, hd) - top) * f;
        KP[3 * k] = tmpV.x; KP[3 * k + 1] = y; KP[3 * k + 2] = tmpV.z;
        lp.set([tmpV.x, top, tmpV.z, tmpV.x, y, tmpV.z], k * 6);
      }
      kg.attributes.position.needsUpdate = true; kLines.geometry.attributes.position.needsUpdate = true;
      km.color.copy(col); kLines.material.color.copy(col);
      km.opacity = .9 * lift * out; kLines.material.opacity = .35 * lift * out;
    }
    // 碧：q が立つあいだは E を見守り、訳すときにミツバチの q へ手をかざして人の前へ渡す
    if (mot) {
      if (!reduce && ph === 'tr' && trT > .4 && trT < .5 + dt) { mot.point(qFrom, 2.2); mot.express('warm', .4, 4); }
      if (!reduce && ph === 'tr' && trT > 2.6 && trT < 2.7 + dt) mot.point(PANE_P, 2.2);
      if (ph === 'tr') mot.lookAt(trT < 2.4 ? qFrom : PANE_P); else if (ph === 'slot') mot.lookAt(subj[slot].gate); else mot.lookAt(null);
      mot.update(still ? 0 : dt, cam, { vrmUpdate: false }); stand(); vrm.update(still ? 0 : dt); mot.afterVrmUpdate(still ? 0 : dt);
      if (aoiPivot && !aoiPivot.visible && ++aoiFrames > 3) { aoiPivot.visible = true; window.__qpESready = true; }
    }
    if (person && !reduce && !still) person.userData.animate(t, ph === 'tr' && trT > 2.6);
    if (herd) herd.update(still ? 0 : dt, { active: true });
    g.updateMatrixWorld(true);
    R.render(S, cam);
    st.sel = slot; st.ph = ph; st.a = a; st.lift = lift; st.pane = paneA; st.out = out; placeLabs(st);
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis) loadAoi(); kick(); }, { rootMargin: '200px 0px' }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('hp-lang-change', () => setTimeout(() => render(performance.now(), true), 30));
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fig.classList.remove('has-3d'); });
  fig.classList.add('has-3d');
  showSel(0, 'slot');
  window.__qpES = { get sel() { return sel; }, get ph() { return curPh; }, get vis() { return vis; }, get tc() { return +tc.toFixed(2); }, set tc(x) { tc = x; } };
  kick();
}

// 人の形だけの模型（1.7 m の模式・顔は描かない）。やわらかい石膏のような地の色
function makePerson() {
  const P = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9cfc2, roughness: .62 }), cloth = new THREE.MeshStandardMaterial({ color: 0x8a96a3, roughness: .78 }), dark = new THREE.MeshStandardMaterial({ color: 0x4a5464, roughness: .85 });
  const lathe = (pts, m) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28), m);
  const torso = lathe([[0, .86], [.15, .88], [.17, .98], [.16, 1.12], [.19, 1.3], [.2, 1.38], [.16, 1.43], [.07, 1.46], [0, 1.47]], cloth); torso.scale.z = .62; P.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .1, 14), skin); neck.position.y = 1.5; P.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 18), skin); head.scale.set(.88, 1.1, .98); head.position.y = 1.63; P.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 14, 0, Math.PI * 2, 0, Math.PI * .55), dark); hair.scale.set(.92, 1.08, 1.02); hair.position.set(0, 1.645, -.008); P.add(hair);
  const limb = (r0, r1, len, m) => { const gg = new THREE.Group(), c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 14), m); c.position.y = -len / 2; gg.add(c); const j = new THREE.Mesh(new THREE.SphereGeometry(r0, 12, 10), m); gg.add(j); return gg; };
  const legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const th = limb(.075, .055, .44, dark); th.position.set(sx * .085, .88, 0); P.add(th);
    const sh = limb(.055, .042, .42, dark); sh.position.y = -.44; th.add(sh);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(.08, .05, .22), new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: .7 })); ft.position.set(0, -.42, .05); sh.add(ft);
    legs.push(th);
    const ua = limb(.045, .038, .3, cloth); ua.position.set(sx * .215, 1.39, 0); ua.rotation.z = sx * .09; P.add(ua);
    const fa = limb(.036, .03, .27, skin); fa.position.y = -.3; fa.rotation.x = -.12; ua.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), skin); hand.scale.set(.8, 1.3, .6); hand.position.y = -.29; fa.add(hand);
    arms.push({ ua, fa, sx });
  }
  P.userData.animate = (t, look) => {   // 立ったまま、ゆっくり重心が揺れる。層 L が届くと、少し顔を上げる
    P.position.x = Math.sin(t * .5) * .008; torso.rotation.z = Math.sin(t * .5) * .012;
    const up = look ? -.12 : 0; head.rotation.x += (up - head.rotation.x) * .04; hair.rotation.x = head.rotation.x;
    arms.forEach(({ ua, sx }) => { ua.rotation.x = Math.sin(t * .5 + sx) * .02; });
  };
  return P;
}
let DOT = null;
function dotTex() {
  if (DOT) return DOT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return DOT = new THREE.CanvasTexture(c);
}
function paneTex() {   // L の板：細い縁と、花の模様を写した点（ミツバチの q の模式の写し）
  const c = document.createElement('canvas'); c.width = 256; c.height = 176; const x = c.getContext('2d');
  x.fillStyle = 'rgba(30,22,52,.55)'; x.fillRect(0, 0, 256, 176);
  x.strokeStyle = 'rgba(214,200,255,.85)'; x.lineWidth = 2; x.strokeRect(3, 3, 250, 170);
  x.strokeStyle = 'rgba(214,200,255,.35)'; x.lineWidth = 1; for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(3, k * 44); x.lineTo(253, k * 44); x.stroke(); }
  const flower = (cx, cy, r) => { for (let p = 0; p < 6; p++) for (let j = 1; j <= 4; j++) { const a = p / 6 * Math.PI * 2, rr = r * j / 4; x.fillStyle = `rgba(${200 + j * 10},${170 + j * 12},255,${.95 - j * .14})`; x.beginPath(); x.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.6, 0, 6.28); x.fill(); } x.fillStyle = 'rgba(255,240,200,1)'; x.beginPath(); x.arc(cx, cy, 4, 0, 6.28); x.fill(); };
  flower(70, 92, 34); flower(176, 70, 26); flower(196, 136, 18);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
