// 冒頭の 3D「世界を、重ねる。」（2026-10-23 本人「冒頭の節を整理したうえで 3D のグラフィックを加える」）
// 2026-10-23 夕 本人「グラフィックに碧をおいてください」「（点と線の模式が）あんまりです」→ 作り直し：
//   第 0 層（石畳と欅の根もと＝いつもの風景の一片）の上に碧が立ち、手をかざすと、AI・GIS・IoT が集めた点と線が五つの層に訳されて、碧のまわりに重なっていく。
//   足もとには層の色のかさねっこの小さな群れ（共通部品 js/kit/envAgents/kasane.js）。層の板は案 10 の層の色の、質感のある薄い板（碧の立つところは丸く空ける）。
//   点と線は細く、層に入るところで層の色に変わる。一巡およそ 16 秒。
// ・カメラは回さない（斜め上の一つの向き）・碧は共通部品 aoi_motion.js（層の図と同じ upright・骨盤を起こして反り腰なし）
// ・点と線は模式（実測の値ではない）。石畳は CC0（ambientCG PavingStones133・CC 管理台帳 M-0822）。欅は冒頭の場と同じ模型
// ・画面の外とタブを隠したときは止める・動きを減らす設定では重なった一こまだけ・スマホは粒を減らし画素 1.5 まで・欅の葉の画像と碧の影はなし
import * as THREE from 'three';
import { LAYER5 } from './kit/layer-colors.js?v=20261023k';

const T_CYCLE = 16;

export function boot(fig) {
  const stage = fig.querySelector('[data-qv3d]');
  const mobile = innerWidth < 860 || matchMedia('(pointer:coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas'); cv.className = 'qv-cv'; cv.setAttribute('aria-hidden', 'true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: !mobile, powerPreference: 'low-power' }); }
  catch (e) { return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.5));
  R.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(cv);

  const S = new THREE.Scene();
  S.fog = new THREE.Fog(0x03060f, 26, 44);
  const cam = new THREE.PerspectiveCamera(mobile ? 34 : 30, 16 / 9, .1, 80);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 8, 5); S.add(key);
  const add = THREE.AdditiveBlending;
  const geo = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };
  const lineMat = (c, op) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op, blending: add, depthWrite: false, toneMapped: false });
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ── 第 0 層：いつもの風景（石畳の一区画。縁は丸くぼかす） ──
  const RG = 6.2;
  {
    const tl = new THREE.TextureLoader();
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 5);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .9, color: 0xb9b2a6, transparent: true, depthWrite: false });
    if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(5, 5); mat.normalMap = n; mat.normalScale = new THREE.Vector2(.7, .7); }
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
    const gr = ax.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.6, '#ddd'); gr.addColorStop(.86, '#333'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
    mat.alphaMap = new THREE.CanvasTexture(ac);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RG, 72), mat); m.rotation.x = -Math.PI / 2; S.add(m);
  }

  // ── 欅の根もと（右奥。冒頭の場と同じ欅の模型。幹と根もとの土が入るように） ──
  let treeObj = null;
  (async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
      const g = await gl.loadAsync('img/hero/3d/keyaki_lod1_notex.glb');
      const bark = new THREE.MeshStandardMaterial({ color: 0x86725e, roughness: .92 });
      const leaf = new THREE.MeshStandardMaterial({ color: 0x6f8f5a, roughness: .8, side: THREE.DoubleSide });
      { const t = await new THREE.TextureLoader().loadAsync('img/hero/3d/keyaki_leaf_atlas.png'); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; leaf.map = t; leaf.alphaTest = .45; leaf.color.set(0xb9cd97); }
      g.scene.updateMatrixWorld(true);
      const tree = new THREE.Group(); g.scene.traverse(o => { if (!o.isMesh) return; const m = new THREE.Mesh(o.geometry, /leaf|leaves/i.test(o.name) ? leaf : bark); m.applyMatrix4(o.matrixWorld); tree.add(m); });
      const TH = 11, bb = new THREE.Box3().setFromObject(tree), sz = bb.getSize(new THREE.Vector3()), sc = TH / sz.y;
      tree.scale.setScalar(sc); tree.position.set(4.6 - (bb.min.x + sz.x / 2) * sc, -bb.min.y * sc, -4.4 - (bb.min.z + sz.z / 2) * sc);
      S.add(tree); treeObj = tree; render(performance.now(), true);
    } catch (e) { console.warn('qualia dive tree', e); }
  })();
  { // 根もとの土（石畳の切れ目に、黒い土と落ち葉の色の小さな島）
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 6, 64, 64, 62);
    gr.addColorStop(0, 'rgba(44,36,28,1)'); gr.addColorStop(.55, 'rgba(58,46,34,.9)'); gr.addColorStop(1, 'rgba(58,46,34,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${80 + Math.random() * 40 | 0},40,${.25 + Math.random() * .3})`; const a = Math.random() * 6.28, r = Math.random() * 44; x.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 1.4); }
    const m = new THREE.Mesh(new THREE.CircleGeometry(2.0, 40), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(4.6, .012, -4.4); S.add(m);
  }

  // ── 碧：第 0 層の真ん中に立つ。手をかざすと、情報が層に訳されて碧のまわりに重なる（共通部品 aoi_motion.js・層の図と同じ姿勢の直し） ──
  let mot = null, vrm = null, aoiPivot = null, aoiFrames = 0;
  const AOI_H = 4.5, AOI_P = new THREE.Vector3(-3.3, 0, 2.7);   // 採点の P1（板が碧を輪切りにする）：碧は重なりの手前左に立ち、重なりへ手をかざす
  (async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'), import('@pixiv/three-vrm')]);
      const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder); L.register(p => new V.VRMLoaderPlugin(p));
      const buf = await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())));
      const g = await L.parseAsync(buf.slice(0), '');
      vrm = g.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(g.scene); V.VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      const pivot = new THREE.Group(); pivot.add(vrm.scene); pivot.visible = false; aoiPivot = pivot; S.add(pivot);
      vrm.humanoid.resetNormalizedPose(); vrm.update(0);
      const bb = new THREE.Box3().setFromObject(vrm.scene); pivot.scale.setScalar(AOI_H / (bb.max.y - bb.min.y)); pivot.position.copy(AOI_P);
      const { AoiMotion } = await import('./aoi_motion.js?v=20261019-v59');
      mot = new AoiMotion(vrm, { root: pivot, reducedMotion: reduce, wind: .25, faceViewer: false, startCalm: 1, posture: 'upright', uprightWeight: .9 });
      mot.faceTo(.15);   // 体は見る人へ、少し重なりのほうへ
      vrm.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (!/CLOTH/.test(m.name || '') || /Outline/.test(m.name || '')) return;
        if (m.emissive) m.emissive.multiplyScalar(.4); if (m.parametricRimColorFactor) m.parametricRimColorFactor.multiplyScalar(.35); if ('shadingToonyFactor' in m) m.shadingToonyFactor = Math.min(m.shadingToonyFactor, .3); }); });
      window.__qvAoi = { vrm, pivot, mot }; kick();
    } catch (e) { console.warn('qualia dive aoi', e); }
  })();
  const FIX = { pelvis: .13, chest: .045 }, _qa = new THREE.Quaternion(), _ex = new THREE.Vector3(1, 0, 0);
  function rotX(name, a, pre) { const b = vrm.humanoid.getNormalizedBoneNode(name); if (!b) return; _qa.setFromAxisAngle(_ex, a); if (pre) b.quaternion.premultiply(_qa); else b.quaternion.multiply(_qa); }
  function stand() { rotX('hips', -FIX.pelvis); rotX('leftUpperLeg', FIX.pelvis, 1); rotX('rightUpperLeg', FIX.pelvis, 1); rotX('spine', FIX.pelvis * .85, 1); rotX('upperChest', FIX.chest); rotX('neck', -FIX.chest * .7, 1); }   // 反り腰なし（層の図と同じ）

  // ── かさねっこ：碧の足もとに、層の色の小さな群れ（共通部品 kasane.js） ──
  let herd = null;
  setTimeout(async () => {
    try {
      const M = await import('./kit/envAgents/kasane.js?v=20261023m');
      const body = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.body.toString(16).padStart(6, '0')])), hud = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.c.toString(16).padStart(6, '0')]));
      const ok = (x, z) => { const r = Math.hypot(x - AOI_P.x, z - AOI_P.z); return r > 1.0 && Math.hypot(x, z) < RG * .78 && Math.hypot(x - 4.6, z + 4.4) > 2.2; };
      herd = new M.KasaneHerd({ scene: S, camera: cam, groundAt: () => 0, walkable: ok, body, hud, scale: 5.6, mobile, maxDist: 80, max: 12, guideEvery: 1e9 });
      herd.addGroup(['sight', 'touch', 'sound', 'nature', 'culture'].map(l => ({ layer: l })), { x: -1.4, z: 4.0, radius: 1.2, role: 'watch' });
      herd.addGroup(['nature', 'culture', 'touch'].map(l => ({ layer: l })), { x: 2.8, z: 2.7, radius: 1.1 });
      if (!mobile) herd.addGroup(['sound', 'sight', 'nature'].map(l => ({ layer: l })), { x: .2, z: 1.4, radius: 1 });
      await herd.load(); kick();
    } catch (e) { console.warn('qualia dive kasane', e); }
  }, 600);

  // ── 情報の出どころ（三つ）：AI＝点の雲（左）／GIS＝地図の線（奥）／IoT＝地面の測る柱から上る信号（右） ──
  const AI_C = new THREE.Vector3(-4.2, 6.1, .9), GIS_Y = 6.7, GIS_C = new THREE.Vector3(1.0, GIS_Y, -2.6);
  const PINS = [[3.4, 1.2], [4.5, -.6], [2.6, 3.0], [4.9, 1.9], [3.1, -2.2], [5.2, .3]];
  // GIS の線：起伏の等高線に見える、ゆがんだ輪（中心が少しずつずれる）
  const gisRings = [];
  for (let k = 0; k < 6; k++) { const pts = [], r0 = .45 + k * .42; for (let a = 0; a <= 64; a++) { const th = a / 64 * Math.PI * 2, r = r0 * (1 + .14 * Math.sin(th * 3 + k * .8) + .06 * Math.sin(th * 5 - k)); pts.push([GIS_C.x + Math.cos(th) * r * 1.35 + k * .05, GIS_C.z + Math.sin(th) * r * .8]); } gisRings.push(pts); }
  const gisLine = (() => { const p = []; for (const pts of gisRings) for (let i = 0; i < pts.length - 1; i++) p.push(pts[i][0], GIS_Y, pts[i][1], pts[i + 1][0], GIS_Y, pts[i + 1][1]); return new THREE.LineSegments(geo(p), lineMat(0xbfeee9, .55)); })();
  S.add(gisLine);
  // IoT の柱（細い支柱と、頭の小さな点）
  const pinG = (() => { const p = []; for (const [x, z] of PINS) p.push(x, 0, z, x, .75, z); return new THREE.LineSegments(geo(p), lineMat(0xd6e6ee, .75)); })();
  S.add(pinG);
  const pinHead = new THREE.Points(geo(PINS.flatMap(([x, z]) => [x, .78, z])), new THREE.PointsMaterial({ color: 0xf4fbff, size: .16, map: dot(), transparent: true, depthWrite: false, blending: add, toneMapped: false }));
  S.add(pinHead);

  // ── 五つの層：中空で一枚ずつ形になり、第 0 層の上へ降りて重なる ──
  const N5 = LAYER5.length, RL = 3.5, SX = 1.3, SZ = -.9;   // 重なりの中心（碧の右奥）
  const yAir = k => 4.9 + k * .42, yGround = k => 1.45 + k * .6;   // 足もとのかさねっこの頭より上から、碧の肩の高さまで
  const RIN = .02;
  const grain = grainTex();
  const plates = LAYER5.map((L, k) => {
    const g = new THREE.Group();
    const fill = new THREE.Mesh(new THREE.CircleGeometry(RL, 96), new THREE.MeshStandardMaterial({ color: L.body, map: grain, roughness: .42, metalness: .06, emissive: L.c, emissiveIntensity: .1, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    fill.rotation.x = -Math.PI / 2; g.add(fill);
    const rp = []; for (const r of [RL]) for (let a = 0; a < 96; a++) { const t0 = a / 96 * Math.PI * 2, t1 = (a + 1) / 96 * Math.PI * 2; rp.push(Math.cos(t0) * r, 0, Math.sin(t0) * r, Math.cos(t1) * r, 0, Math.sin(t1) * r); }
    const rim = new THREE.LineSegments(geo(rp), lineMat(L.c, 0)); g.add(rim);
    S.add(g); return { g, fill, rim };
  });

  // 層ごとの模様（その層が重ねるものの模式）：sight＝目に映る色の点の面／touch＝振動の輪／sound＝音の波／nature＝樹冠のまとまり／culture＝語りの弧と年の目盛り
  function pattern(k) {
    const out = [];
    if (k === 0) { for (let x = -RL; x <= RL; x += .42) for (let z = -RL; z <= RL; z += .42) if (Math.hypot(x, z) < RL * .92) out.push([x + (z * 7 % .1), z]); }
    else if (k === 1) { for (let r = .45; r < RL * .92; r += .42) { const n = Math.round(r * 11); for (let a = 0; a < n; a++) { const th = a / n * Math.PI * 2; out.push([.8 + Math.cos(th) * r * .82, -.5 + Math.sin(th) * r * .82]); } } }
    else if (k === 2) { for (let z = -3.4; z <= 3.4; z += .62) for (let x = -RL; x <= RL; x += .14) { const zz = z + Math.sin(x * 2.1 + z) * .16; if (Math.hypot(x, zz) < RL * .93) out.push([x, zz]); } }
    else if (k === 3) { const C = [[-2.2, -1.4], [-.4, -2.6], [1.8, -1.8], [2.6, .6], [.6, 1.2], [-1.8, 1.6], [-.3, 3.0], [2.0, 2.6]]; let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; for (const [cx, cz] of C) for (let i = 0; i < 46; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * .78; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } }
    else { for (let r = .6; r < 4.6; r += .48) { const n = Math.round(r * 7); for (let a = 0; a <= n; a++) { const th = -1.0 + a / n * 2.0; const x = -3.2 + Math.cos(th) * r, z = Math.sin(th) * r; if (Math.hypot(x, z) < RL * .93) out.push([x, z]); } } for (let x = -3.6; x <= 3.6; x += .3) out.push([x, 3.3]); }
    return out;
  }
  const SLOTS = LAYER5.map((_, k) => pattern(k).map(([x, z]) => [x * RL / 4.3, z * RL / 4.3]));

  // 粒：i 番目の粒は、出どころ s＝i%3（AI・GIS・IoT）から、層 k＝i%5 の模様へ
  const NP = mobile ? 900 : 1600;
  const P = new Float32Array(NP * 3), Cc = new Float32Array(NP * 3);
  const meta = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const counts = [0, 0, 0, 0, 0];
  for (let i = 0; i < NP; i++) {
    const s = i % 3, k = i % 5, slot = SLOTS[k][(counts[k]++ * 7) % SLOTS[k].length];
    const m = { s, k, dx: slot[0] + (rnd() - .5) * .06, dz: slot[1] + (rnd() - .5) * .06, d: rnd() * 1.2, ph: rnd() * Math.PI * 2, r: rnd(), q: rnd() };
    if (s === 0) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rr = Math.cbrt(rnd()) * 2.0; m.ax = Math.sqrt(1 - u * u) * Math.cos(th) * rr * 1.3; m.ay = u * rr * .8; m.az = Math.sqrt(1 - u * u) * Math.sin(th) * rr; }
    else if (s === 1) { const ring = gisRings[(i * 5) % gisRings.length], j = Math.floor(rnd() * (ring.length - 1)), f = rnd(); m.gx = lerp(ring[j][0], ring[j + 1][0], f); m.gz = lerp(ring[j][1], ring[j + 1][1], f); }
    else { const pin = PINS[i % PINS.length]; m.px = pin[0]; m.pz = pin[1]; }
    meta.push(m);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(P, 3)); pg.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
  const pm = new THREE.PointsMaterial({ size: mobile ? .11 : .085, map: dot(), vertexColors: true, transparent: true, opacity: .95, depthWrite: false, blending: add, toneMapped: false });
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; S.add(pts);
  const RAW = new THREE.Color(0xdff6ff), LC = LAYER5.map(L => new THREE.Color(L.c)), tmp = new THREE.Color();

  // 札（文字は少なく：出どころの三つ・層の名前・第 0 層・Qualium）
  const labs = [];
  function lab(text, cls, c) { const e = document.createElement('span'); e.className = 'qv-lab ' + (cls || ''); e.textContent = text; if (c) e.style.setProperty('--c', c); e.setAttribute('aria-hidden', 'true'); stage.appendChild(e); const o = { e, p: new THREE.Vector3(), a: 0 }; labs.push(o); return o; }
  const lAI = lab('AI', 'qv-src'), lGIS = lab('GIS', 'qv-src'), lIoT = lab('IoT', 'qv-src');
  const lL = LAYER5.map(L => lab('Qualia/' + L.key, 'qv-layer', '#' + L.c.toString(16).padStart(6, '0')));
  const isEn = () => document.documentElement.getAttribute('data-lang') === 'en';
  const l0 = lab('', 'qv-base'), lQ = lab('Qualium', 'qv-qm');
  const setLang = () => { l0.e.textContent = isEn() ? 'Layer 0 — the everyday scene' : '第 0 層　いつもの風景'; };
  setLang(); document.addEventListener('hp-lang-change', setLang);

  let W = 0, Hh = 0;
  const size = () => { W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix(); };
  new ResizeObserver(() => { size(); render(performance.now(), true); }).observe(cv); size();

  const v3 = new THREE.Vector3();
  function place(o, a) {
    o.a += (a - o.a) * .18; if (Math.abs(a - o.a) < .01) o.a = a;
    v3.copy(o.p).project(cam);
    const x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * Hh;
    o.e.style.opacity = o.a.toFixed(2);
    o.e.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }

  let t0 = performance.now(), raf = 0, vis = true;
  const fps = { n: 0, t: t0, v: 0 };
  window.__qvDive = { get fps() { return fps.v; }, get phase() { return phase; } };
  let phase = '';
  let last = performance.now(), gestured = -1;
  function render(now, still) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    const tt = reduce ? 12.5 : ((now - t0) / 1000) % T_CYCLE, t = (now - t0) / 1000;
    // 時の区切り：0〜4 集まる／4〜8 層に訳す／8〜11 風景へ降りて重なる／11〜14.6 重なったまま／14.6〜16 ほどける
    const uT = k => sstep(4 + k * .25, 7.2 + k * .25, tt);           // 訳す（層ごとに少しずつ遅れて）
    const uD = k => sstep(8 + (N5 - 1 - k) * .18, 10.6 + (N5 - 1 - k) * .18, tt);   // 降りる（下の層から先に着く）
    const fade = 1 - sstep(14.6, 15.8, tt), fadeIn = sstep(0, 1.2, tt);
    phase = tt < 4 ? 'gather' : tt < 8 ? 'translate' : tt < 11 ? 'descend' : tt < 14.6 ? 'hold' : 'release';
    const ya = k => lerp(yAir(k), yGround(k), uD(k));
    // 粒
    const rot = t * .12;
    for (let i = 0; i < NP; i++) {
      const m = meta[i]; let sx, sy, sz;
      if (m.s === 0) { const c = Math.cos(rot + m.ph * .02), s = Math.sin(rot + m.ph * .02); sx = AI_C.x + m.ax * c - m.az * s; sz = AI_C.z + m.ax * s + m.az * c; sy = AI_C.y + m.ay + Math.sin(t * .8 + m.ph) * .05; }
      else if (m.s === 1) { sx = m.gx; sy = GIS_Y + Math.sin(t * 1.1 + m.ph) * .02; sz = m.gz; }
      else { const f = ((t * .32 + m.r) % 1); sx = m.px + Math.sin(f * 6 + m.ph) * .05; sy = .8 + f * 5.0; sz = m.pz; }
      const u = sstep(0, 1, (uT(m.k) * 1.25 - m.d * .2));
      const tx = m.dx + SX, ty = ya(m.k) + .03, tz = m.dz + SZ;
      P[3 * i] = lerp(sx, tx, u); P[3 * i + 1] = lerp(sy, ty, u) + Math.sin(u * Math.PI) * .6 * (m.q - .3); P[3 * i + 2] = lerp(sz, tz, u);
      tmp.copy(RAW).lerp(LC[m.k], u);
      const b = fade * fadeIn * (m.s === 2 ? (u > .02 ? 1 : .55 + .45 * Math.sin(((t * .32 + m.r) % 1) * Math.PI)) : 1);
      Cc[3 * i] = tmp.r * b; Cc[3 * i + 1] = tmp.g * b; Cc[3 * i + 2] = tmp.b * b;
    }
    pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    // 出どころの線は、訳しはじめると薄れる
    const src = fadeIn * (1 - sstep(4, 7, tt)) + sstep(14.8, 16, tt);
    gisLine.material.opacity = .55 * src; pinG.material.opacity = .3 + .45 * fade; pinHead.material.opacity = .5 + .5 * fade;
    // 層の板
    plates.forEach((pl, k) => { const a = sstep(5 + k * .25, 7.6 + k * .25, tt) * fade; pl.g.position.set(SX, ya(k), SZ); pl.fill.material.opacity = .32 * a; pl.rim.material.opacity = .7 * a; });
    // カメラ：斜め上の一つの向き（ゆるい呼吸の上下だけ）
    const br = reduce ? 0 : Math.sin(t * .45) * .05;
    if (mobile) { cam.position.set(-7.4, 11.6 + br, 20.6); cam.lookAt(.2, 3.2, .2); }
    else { cam.position.set(-6.6, 10.6 + br, 18.6); cam.lookAt(.2, 3.35, .2); }
    // 碧：集まるあいだは情報の雲を見て、訳しはじめに手をかざす（層の重なる所へ）。重なったあとは見る人へ
    if (mot) {
      const cyc = Math.floor((now - t0) / 1000 / T_CYCLE);
      if (!reduce && tt > 3.7 && gestured !== cyc) { gestured = cyc; mot.point(new THREE.Vector3(SX - .6, 1.5, SZ + 1.6), 4.2); mot.express('warm', .45, 4); }
      if (reduce || tt > 11) mot.lookAt(null); else if (tt < 3.7) mot.lookAt(new THREE.Vector3(AI_C.x, AI_C.y, AI_C.z)); else mot.lookAt(new THREE.Vector3(SX, 2.6, SZ));
      mot.update(still ? 0 : dt, cam, { vrmUpdate: false }); stand(); vrm.update(still ? 0 : dt); mot.afterVrmUpdate(still ? 0 : dt);
      if (aoiPivot && !aoiPivot.visible && ++aoiFrames > 3) aoiPivot.visible = true;
    }
    if (herd) herd.update(still ? 0 : dt, { active: true });
    R.render(S, cam);
    // 札
    lAI.p.set(AI_C.x, AI_C.y + 1.95, AI_C.z); place(lAI, src);
    lGIS.p.set(GIS_C.x, GIS_Y + .55, GIS_C.z - 1.4); place(lGIS, src);
    lIoT.p.set(4.4, 3.2, .6); place(lIoT, src);
    lL.forEach((o, k) => { o.p.set(SX + RL * .99, ya(k), SZ + RL * .12); const a = sstep(5.6 + k * .25, 7.8 + k * .25, tt) * fade; place(o, a); });
    // 札どうしが重ならないよう、画面の上下に間をあける（下の層から順に、上の札を押し上げる）
    { const gap = mobile ? 17 : 22; let prev = 1e9; for (let k = 0; k < N5; k++) { const o = lL[k]; v3.copy(o.p).project(cam); let y = (-v3.y * .5 + .5) * Hh; if (y > prev - gap) y = prev - gap; prev = y; const x = (v3.x * .5 + .5) * W; o.e.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; } }
    l0.p.set(-1.0, 0, RG * .9); place(l0, 1);
    lQ.p.set(SX - RL * .6, yGround(N5 - 1) + 1.0, SZ - RL * .5); place(lQ, sstep(10.8, 11.8, tt) * fade);
    if (still) return;
    fps.n++; if (now - fps.t > 1000) { fps.v = Math.round(fps.n * 1000 / (now - fps.t)); fps.n = 0; fps.t = now; }
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) raf = requestAnimationFrame(loop); }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; kick(); }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fig.classList.remove('has-3d'); });
  fig.classList.add('has-3d');
  kick();
}

let GRAIN = null;
function grainTex() {   // 層の板の質感（和紙の繊維のような細い筋と、ごく薄いむら）
  if (GRAIN) return GRAIN;
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const a = Math.random() * Math.PI, l = 6 + Math.random() * 22, px = Math.random() * 256, py = Math.random() * 256; x.strokeStyle = `rgba(255,255,255,${.25 + Math.random() * .35})`; x.lineWidth = .6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(160,160,160,${Math.random() * .12})`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 30, 0, 6.28); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return GRAIN = t;
}
let DOT = null;
function dot() {
  if (DOT) return DOT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return DOT = new THREE.CanvasTexture(c);
}
