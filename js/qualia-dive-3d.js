// 冒頭の 3D「全体像」（2026-10-24 本人「冒頭のグラフィックをもっとシンプルに、デジタル情報とフィジカル情報が重なり合ったデザインに」）
// 一目で分かる構図：下＝フィジカル（第 0 層＝石畳・欅・人・碧・かさねっこ）／上＝デジタル（五つの層の色の薄い板）。
//   1) 測る：場所の上を走査の輪が広がり、地面に細い格子、欅に点の写しが灯る（いつもの風景に、デジタルの線と点が重なる）
//   2) 重ねる：五つの層（案 10 の色）が一枚ずつ、地面から上がって風景の上に重なる。物から上へ細い線が通り、板を通る所に点
//   3) 場：すべてを包む細い枠＝Qualium。そのまま少し置いて、はじめに戻る
// 式は 3D の中に浮かべない（重なりの元になったので、図の下の帯に二本だけ）。記号は PHILOSOPHY の定式化と同じ（x_e・Σ_s・𝒬）。
// ・カメラは斜め上に固定（回さない）・碧は共通部品 aoi_motion.js の待機だけ（upright・反り腰なし・指さし／腕を伸ばす動きは使わない）
// ・かさねっこは共通部品 kit/envAgents/kasane.js ・石畳は CC0（ambientCG PavingStones133・CC 管理台帳 M-0822）・欅は冒頭の場と同じ模型
// ・模式の図（実測の値ではない）・札は毎こま重なりを調べ、重なる札は出さない（375px でも重ならない）
// ・画面の外とタブを隠したときは止める・動きを減らす設定ではすべて重なった一こまだけ・スマホは粒を減らし画素 1.5 まで
import * as THREE from 'three';
import { LAYER5 } from './kit/layer-colors.js?v=20261023k';

const T_SCAN = 3.2, T_L0 = 3.6, T_LS = 1.25, T_ALL = T_L0 + T_LS * 5, CYCLE = T_ALL + 5.5;
const AOI_C = 0xa8f2f6, QM_C = 0xa8f2f6, HU_C = 0xf4aa96;

export function boot(fig) {
  const stage = fig.querySelector('[data-qv3d]');
  const mobile = innerWidth < 860 || matchMedia('(pointer:coarse)').matches;
  const narrow = () => stage.clientWidth < 560;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isEn = () => document.documentElement.getAttribute('data-lang') === 'en';
  const cv = document.createElement('canvas'); cv.className = 'qv-cv'; cv.setAttribute('aria-hidden', 'true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: !mobile, powerPreference: 'low-power' }); }
  catch (e) { return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  R.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(cv);

  const S = new THREE.Scene();
  S.fog = new THREE.Fog(0x03060f, 30, 54);
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, .1, 90);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(4, 8, 5); S.add(key);
  const rimL = new THREE.DirectionalLight(0x8fe6f0, .55); rimL.position.set(-6, 3, -5); S.add(rimL);
  const add = THREE.AdditiveBlending;
  const geo = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };
  const lineMat = (c, op) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op, blending: add, depthWrite: false, toneMapped: false });
  const ptsMat = (c, size, op) => new THREE.PointsMaterial({ color: c, size, map: dot(), transparent: true, opacity: op, depthWrite: false, blending: add, toneMapped: false });
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ring = (r, y = 0, n = 96) => { const p = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2; p.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } return geo(p); };

  // ── 第 0 層：いつもの風景（石畳の一区画。縁は丸くぼかす） ──
  const RG = 7.0, CT = new THREE.Vector3(0, 0, -.4);
  {
    const tl = new THREE.TextureLoader();
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 6); tex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .9, color: 0xb6afa3, transparent: true, depthWrite: false });
    if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(6, 6); mat.normalMap = n; mat.normalScale = new THREE.Vector2(.7, .7); }
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
    const gr = ax.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.62, '#ddd'); gr.addColorStop(.88, '#333'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
    mat.alphaMap = new THREE.CanvasTexture(ac);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RG, 80), mat); m.rotation.x = -Math.PI / 2; m.position.copy(CT); S.add(m);
  }
  const TREE = new THREE.Vector3(4.3, 0, -3.9);
  { // 根もとの土
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 6, 64, 64, 62);
    gr.addColorStop(0, 'rgba(44,36,28,1)'); gr.addColorStop(.55, 'rgba(58,46,34,.9)'); gr.addColorStop(1, 'rgba(58,46,34,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${80 + Math.random() * 40 | 0},40,${.25 + Math.random() * .3})`; const a = Math.random() * 6.28, r = Math.random() * 44; x.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 1.4); }
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(TREE.x, .012, TREE.z); S.add(m);
  }

  // ── デジタルの写し（地面の細い格子・走査の輪・欅の点の写し） ──
  const GRID = (() => { const p = [], st = .7, n = Math.ceil(RG / st); for (let i = -n; i <= n; i++) { const a = i * st, h = Math.sqrt(Math.max(0, RG * RG * .8 - a * a)); if (h <= 0) continue; p.push(CT.x + a, .03, CT.z - h, CT.x + a, .03, CT.z + h, CT.x - h, .03, CT.z + a, CT.x + h, .03, CT.z + a); } return p; })();
  const gridMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: add, uniforms: { r: { value: 0 }, op: { value: 0 }, c: { value: new THREE.Color(0x8fe6f0) } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float r; uniform float op; uniform vec3 c; varying vec2 vP; void main(){ float d = length(vP - vec2(${CT.x.toFixed(2)}, ${CT.z.toFixed(2)})); float a = op * (1. - smoothstep(r - .6, r, d)) * (1. - smoothstep(${(RG * .55).toFixed(2)}, ${(RG * .9).toFixed(2)}, d)) * .55 + op * .9 * exp(-pow((d - r) * 2.2, 2.)); gl_FragColor = vec4(c * a, a); }` });
  const grid = new THREE.LineSegments(geo(GRID), gridMat); S.add(grid);
  const scan = new THREE.LineSegments(ring(1, .05, 120), lineMat(0xbff6fa, 0)); scan.position.copy(CT); S.add(scan);
  let treePts = null, treeD = null;   // 欅の点の写し（走査が通ると灯る）

  // ── 欅：葉の画像を、やわらかい葉の塊の上に重ねる ──
  (async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
      const g = await gl.loadAsync('img/hero/3d/keyaki_lod1_notex.glb');
      const bark = new THREE.MeshStandardMaterial({ color: 0x86725e, roughness: .92 });
      const leaf = new THREE.MeshStandardMaterial({ color: 0xa9bf88, roughness: .82, side: THREE.DoubleSide, alphaTest: .32, alphaToCoverage: !mobile });
      { const t = await new THREE.TextureLoader().loadAsync('img/hero/3d/keyaki_leaf_atlas.png'); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; leaf.map = t; }
      g.scene.updateMatrixWorld(true);
      const tree = new THREE.Group(), leafPos = [], allPos = [];
      g.scene.traverse(o => { if (!o.isMesh) return; const isLeaf = /leaf|leaves/i.test(o.name); const m = new THREE.Mesh(o.geometry, isLeaf ? leaf : bark); m.applyMatrix4(o.matrixWorld); tree.add(m);
        const p = o.geometry.attributes.position, v = new THREE.Vector3(), stp = Math.max(1, Math.floor(p.count / (isLeaf ? 420 : 160)));
        for (let i = 0; i < p.count; i += stp) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); (isLeaf ? leafPos : allPos).push(v.clone()); } });
      const TH = 8.4, bb = new THREE.Box3().setFromObject(tree), sz = bb.getSize(new THREE.Vector3()), sc = TH / sz.y;
      tree.scale.setScalar(sc); tree.position.set(TREE.x - (bb.min.x + sz.x / 2) * sc, -bb.min.y * sc, TREE.z - (bb.min.z + sz.z / 2) * sc);
      if (leafPos.length) {   // 葉の塊（内側ほど暗い＝葉の重なりの陰）
        const n = Math.min(mobile ? 70 : 140, leafPos.length), P = new Float32Array(n * 3), C = new Float32Array(n * 3), cc = new THREE.Color(), ctr = bb.getCenter(new THREE.Vector3());
        for (let i = 0; i < n; i++) { const v = leafPos[Math.floor(i / n * leafPos.length)].clone(); v.lerp(new THREE.Vector3(ctr.x, v.y, ctr.z), .14); P[3 * i] = v.x; P[3 * i + 1] = v.y; P[3 * i + 2] = v.z;
          const shade = .5 + .5 * ((v.y - bb.min.y) / sz.y); cc.setRGB(.15 * shade, .22 * shade, .12 * shade); C[3 * i] = cc.r; C[3 * i + 1] = cc.g; C[3 * i + 2] = cc.b; }
        const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(P, 3)); cg.setAttribute('color', new THREE.BufferAttribute(C, 3));
        const canopy = new THREE.Points(cg, new THREE.PointsMaterial({ size: 1.15 / sc, map: softTex(), vertexColors: true, transparent: true, opacity: .78, depthWrite: false, sizeAttenuation: true }));
        canopy.renderOrder = -1; tree.add(canopy);
      }
      S.add(tree); tree.updateMatrixWorld(true);
      // 点の写し：模型の頂点を間引いて、外へ少しだけ浮かせた点（デジタルの写し）
      const src = leafPos.concat(allPos), nP = Math.min(mobile ? 320 : 640, src.length), P = new Float32Array(nP * 3); treeD = new Float32Array(nP);
      const w = new THREE.Vector3();
      for (let i = 0; i < nP; i++) { w.copy(src[Math.floor(i / nP * src.length)]).applyMatrix4(tree.matrixWorld); w.x += (w.x - TREE.x) * .04; w.z += (w.z - TREE.z) * .04; P[3 * i] = w.x; P[3 * i + 1] = w.y; P[3 * i + 2] = w.z; treeD[i] = Math.hypot(w.x - CT.x, w.z - CT.z) + w.y * .18; }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(P, 3));
      treePts = new THREE.Points(tg, ptsMat(0xbff6fa, mobile ? .11 : .085, 0)); treePts.material.depthTest = false; treePts.renderOrder = 2; treePts.frustumCulled = false; S.add(treePts);
      render(performance.now(), true);
    } catch (e) { console.warn('qualia dive tree', e); }
  })();

  // ── 人（主体エージェント S）：石膏のような地の色の、顔を描かない模型 ──
  const HU_P = new THREE.Vector3(1.0, 0, 2.6);
  const person = makePerson(); person.scale.setScalar(1.12); person.position.copy(HU_P); person.rotation.y = Math.atan2(TREE.x - HU_P.x, TREE.z - HU_P.z) * .55; S.add(person);
  const HU_EYE = HU_P.clone().setY(1.85);

  // ── 五つの層：風景の上に重なる、層の色の薄い板（格子と、層ごとの小さな模様） ──
  const PW = mobile && narrow() ? 7.2 : 8.4, PD = 5.6, PC = new THREE.Vector3(.2, 0, -.9);
  const GAP = mobile && narrow() ? .84 : .7, yL = k => 3.0 + k * GAP;
  const pg = roundRect(PW, PD, .35);
  const plates = LAYER5.map((L, k) => {
    const g = new THREE.Group(); g.position.set(PC.x, yL(k), PC.z);
    const fill = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: plateTex(L, k), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    fill.rotation.x = -Math.PI / 2; g.add(fill);
    const rimPts = []; { const sh = roundRectPts(PW, PD, .35); for (let i = 0; i < sh.length; i++) { const a = sh[i], b = sh[(i + 1) % sh.length]; rimPts.push(a.x, 0, -a.y, b.x, 0, -b.y); } }
    const rim = new THREE.LineSegments(geo(rimPts), lineMat(L.c, 0)); g.add(rim);
    S.add(g); return { g, fill, rim };
  });
  // 物から上へ通る細い線（欅・石畳の目地）と、板を通る所の点
  const AOI_P = new THREE.Vector3(-1.4, 0, 2.2), AOI_H = 2.0;
  const RISE = [TREE.clone().setY(3.6).add(new THREE.Vector3(-.6, 0, .9)), new THREE.Vector3(2.4, .05, .9), new THREE.Vector3(-.4, .05, -.2), new THREE.Vector3(-2.6, .05, -2.2)];   // 頭の上には線を通さない（吊られて見えるので）
  const riseL = new THREE.LineSegments(geo(RISE.flatMap(p => [p.x, p.y, p.z, p.x, yL(4) + .02, p.z])), lineMat(0xdff6ff, 0)); S.add(riseL);
  const pierce = LAYER5.map((L, k) => { const pts = new THREE.Points(geo(RISE.flatMap(p => [p.x, yL(k) + .01, p.z])), ptsMat(L.c, mobile ? .2 : .16, 0)); S.add(pts); return pts; });
  // 地面の上の測る点（石の目地のあたり）
  const stone = new THREE.Points(geo([RISE[3].x, .06, RISE[3].z]), ptsMat(0xf4fbff, .22, 0)); S.add(stone);

  // ── Qualium：全体を包む細い枠（地面の輪・上の輪・縦の線） ──
  const QR = RG * .96, QH = yL(4) + .9;
  const qm = new THREE.Group(); qm.position.copy(CT); S.add(qm);
  { const p = []; const top = ring(QR, QH, 120).attributes.position.array, bot = ring(QR, .02, 120).attributes.position.array; p.push(...top, ...bot);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + .13; for (let j = 0; j < 10; j++) { const y0 = j / 10 * QH, y1 = (j + .55) / 10 * QH; p.push(Math.cos(a) * QR, y0, Math.sin(a) * QR, Math.cos(a) * QR, y1, Math.sin(a) * QR); } }
    qm.add(new THREE.LineSegments(geo(p), lineMat(QM_C, 0))); }
  const qmL = qm.children[0];

  // ── 碧：環境エージェント。人のとなりに立ち、静かに待つ（共通部品 aoi_motion.js の待機だけ） ──
  let mot = null, vrm = null, aoiPivot = null, aoiFrames = 0;
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
      const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61');
      mot = new AoiMotion(vrm, { root: pivot, reducedMotion: reduce, wind: .2, faceViewer: false, startCalm: 1, posture: 'upright', uprightWeight: .9 });
      mot.faceTo(-.25);
      vrm.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (!/CLOTH/.test(m.name || '') || /Outline/.test(m.name || '')) return;
        if (m.emissive) m.emissive.multiplyScalar(.4); if (m.parametricRimColorFactor) m.parametricRimColorFactor.multiplyScalar(.35); if ('shadingToonyFactor' in m) m.shadingToonyFactor = Math.min(m.shadingToonyFactor, .3); }); });
      window.__qvAoi = { vrm, pivot, mot }; kick();
    } catch (e) { console.warn('qualia dive aoi', e); }
  })();
  const FIX = { pelvis: .13, chest: .045 }, _qa = new THREE.Quaternion(), _ex = new THREE.Vector3(1, 0, 0);
  function rotX(name, a, pre) { const b = vrm.humanoid.getNormalizedBoneNode(name); if (!b) return; _qa.setFromAxisAngle(_ex, a); if (pre) b.quaternion.premultiply(_qa); else b.quaternion.multiply(_qa); }
  function stand() { rotX('hips', -FIX.pelvis); rotX('leftUpperLeg', FIX.pelvis, 1); rotX('rightUpperLeg', FIX.pelvis, 1); rotX('spine', FIX.pelvis * .85, 1); rotX('upperChest', FIX.chest); rotX('neck', -FIX.chest * .7, 1); }   // 反り腰なし

  // ── かさねっこ：石畳の上の、層の色の小さな群れ（共通部品 kasane.js） ──
  let herd = null;
  const KS = new THREE.Vector3(-3.0, 0, .6);
  setTimeout(async () => {
    try {
      const M = await import('./kit/envAgents/kasane.js?v=20261023m');
      const body = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.body.toString(16).padStart(6, '0')])), hud = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.c.toString(16).padStart(6, '0')]));
      const ok = (x, z) => Math.hypot(x - CT.x, z - CT.z) < RG * .78 && Math.hypot(x - AOI_P.x, z - AOI_P.z) > .9 && Math.hypot(x - TREE.x, z - TREE.z) > 2.1 && Math.hypot(x - HU_P.x, z - HU_P.z) > .9;
      herd = new M.KasaneHerd({ scene: S, camera: cam, groundAt: () => 0, walkable: ok, body, hud, scale: 2.4, mobile, maxDist: 80, max: mobile ? 7 : 9, guideEvery: 1e9 });
      herd.addGroup(['sight', 'touch', 'sound', 'nature', 'culture'].map(l => ({ layer: l })), { x: KS.x, z: KS.z, radius: 1.0, role: 'watch' });
      if (!mobile) herd.addGroup(['nature', 'culture', 'touch', 'sight'].map(l => ({ layer: l })), { x: 2.9, z: .4, radius: .8 });
      else herd.addGroup(['nature', 'culture'].map(l => ({ layer: l })), { x: 2.9, z: .4, radius: .7 });
      await herd.load(); kick();
    } catch (e) { console.warn('qualia dive kasane', e); }
  }, 600);

  // ── 札（HTML。3D の点に寄せる。毎こま重なりを調べる） ──
  const T = (ja, en) => ({ ja, en });
  const labs = [];
  function lab(txt, cls, at, o = {}) { const e = document.createElement('span'); e.className = 'qv-lab ' + cls; e.setAttribute('aria-hidden', 'true'); if (o.c) e.style.setProperty('--c', '#' + o.c.toString(16).padStart(6, '0')); stage.appendChild(e);
    const L = { e, txt, at, pri: o.pri ?? 1, show: o.show || (() => 1), a: 0, w: 0, h: 0, al: o.al || 'c' }; labs.push(L); return L; }
  const setText = L => { L.e.innerHTML = isEn() ? L.txt.en : L.txt.ja; L.w = 0; };
  lab(T('第 0 層　いつもの風景', 'Layer 0 — the everyday scene'), 'qv-base', () => CT.clone().add(new THREE.Vector3(.6, 0, RG * .9)), { pri: 3 });
  lab(T('人 <i>S</i>', 'person <i>S</i>'), 'qv-obj', () => HU_P.clone().add(new THREE.Vector3(.75, 1.1, .2)), { pri: 3, c: HU_C });
  lab(T('碧 <i>A</i>', 'Aoi <i>A</i>'), 'qv-obj', () => AOI_P.clone().add(new THREE.Vector3(-1.05, 1.25, .1)), { pri: 3, c: AOI_C });
  lab(T('かさねっこ', 'Kasanekko'), 'qv-obj', () => KS.clone().add(new THREE.Vector3(-.4, 0, 1.25)), { pri: 2, c: 0xf0d19d });
  lab(T('場所 <i>e</i>', 'place <i>e</i>'), 'qv-obj', () => RISE[3].clone().add(new THREE.Vector3(-.3, .0, -.55)), { pri: 1, c: 0x8fe6f0, show: v => v.scan });
  const lLay = LAYER5.map((L, k) => lab(T('Qualia/' + L.key, 'Qualia/' + L.key), 'qv-layer', () => new THREE.Vector3(PC.x + PW / 2 + .15, yL(k), PC.z + PD / 2 - .2), { pri: 2, c: L.c, al: 'l', show: v => v.lay[k] }));
  lab(T('Qualium <i>𝒬</i>', 'Qualium <i>𝒬</i>'), 'qv-qm', () => CT.clone().add(new THREE.Vector3(-QR * .97, QH * .55, .9)), { pri: 2, al: 'r', show: v => v.qm });
  labs.forEach(setText);
  document.addEventListener('hp-lang-change', () => { labs.forEach(setText); render(performance.now(), true); });

  let W = 0, Hh = 0;
  const size = () => { W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix(); labs.forEach(L => { L.w = 0; }); };
  new ResizeObserver(() => { size(); render(performance.now(), true); }).observe(cv); size();

  const v3 = new THREE.Vector3(), boxes = [];
  function placeAll(V) {
    const items = [];
    for (const L of labs) { L.want = Math.max(0, Math.min(1, L.show(V))); if (L.want > .01) items.push(L); else { L.a = L.a < .03 ? 0 : L.a * .8; L.e.style.opacity = L.a.toFixed(2); } }
    items.sort((a, b) => b.pri - a.pri);
    boxes.length = 0;
    for (const L of items) {
      if (!L.w) { L.w = L.e.offsetWidth; L.h = L.e.offsetHeight; }
      v3.copy(L.at()).project(cam);
      let x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * Hh;
      if (L.al === 'l') x += L.w / 2; else if (L.al === 'r') x -= L.w / 2;
      const hw = L.w / 2, hh = L.h / 2; x = Math.max(hw + 4, Math.min(W - hw - 4, x)); y = Math.max(hh + 4, Math.min(Hh - hh - 4, y));
      let ok = false, yy = y;
      for (const d of [0, -1, 1, -2, 2]) { yy = y + d * (L.h * .62 + 2); const b = [x - hw - 3, yy - hh - 2, x + hw + 3, yy + hh + 2]; if (b[1] < 2 || b[3] > Hh - 2) continue; if (!boxes.some(c => b[0] < c[2] && b[2] > c[0] && b[1] < c[3] && b[3] > c[1])) { boxes.push(b); ok = true; break; } }
      if (!ok) L.a = 0; else { L.a += (L.want - L.a) * .2; if (Math.abs(L.want - L.a) < .01) L.a = L.want; }
      L.e.style.opacity = L.a.toFixed(2);
      if (ok) L.e.style.transform = 'translate(' + Math.round(x - hw) + 'px,' + Math.round(yy - hh) + 'px)';
    }
  }

  let t0 = performance.now(), raf = 0, vis = true, last = t0, tc = reduce ? T_ALL + 2 : 0;
  const fps = { n: 0, t: t0, v: 0 };
  window.__qvDive = { get fps() { return fps.v; }, set tc(x) { tc = x; }, get tc() { return tc; }, CYCLE, T_ALL };
  const V = { scan: 0, lay: [0, 0, 0, 0, 0], qm: 0 };
  function render(now, still) {
    const dt = still ? 0 : Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; const t = (now - t0) / 1000;
    if (!reduce && !still) tc = (tc + dt) % CYCLE;
    const out = 1 - sstep(CYCLE - 1.1, CYCLE - .1, tc);    // 一回りの終わりに、層だけ静かに消える（風景は残る）
    // 1 測る：走査の輪が広がり、格子と欅の点が灯る
    const sr = sstep(.2, T_SCAN, tc) * RG * 1.05;
    gridMat.uniforms.r.value = sr; gridMat.uniforms.op.value = .55 * (.55 + .45 * out);
    scan.scale.setScalar(Math.max(.01, sr)); scan.material.opacity = .75 * (1 - sstep(T_SCAN - .6, T_SCAN + .2, tc)) * sstep(.1, .5, tc);
    V.scan = sstep(.6, 1.6, tc) * (.55 + .45 * out);
    stone.material.opacity = .9 * V.scan * (.75 + .25 * Math.sin(t * 2.2));
    if (treePts) { treePts.material.opacity = (.42 + .14 * Math.sin(t * 1.3)) * (.6 + .4 * out) * sstep(0, 1, sr / 8); }
    // 2 重ねる：五つの層が一枚ずつ、地面から上がって重なる
    let any = 0;
    plates.forEach((pl, k) => {
      const s0 = T_L0 + k * T_LS, a = sstep(s0, s0 + T_LS * .9, tc) * out; V.lay[k] = a; any = Math.max(any, a);
      const rise = 1 - sstep(s0, s0 + T_LS * 1.1, tc);
      pl.g.position.y = yL(k) - rise * (yL(k) - .1); pl.fill.material.opacity = .9 * a; pl.rim.material.opacity = .85 * a;
      pierce[k].material.opacity = .95 * a * sstep(s0 + T_LS * .6, s0 + T_LS, tc);
    });
    riseL.material.opacity = .32 * sstep(T_L0 + .4, T_L0 + 1.4, tc) * out;
    // 3 場：Qualium の枠
    V.qm = sstep(T_ALL - .4, T_ALL + .8, tc) * out;
    qmL.material.opacity = .26 * V.qm;
    // カメラ：斜め上の一つの向き（固定。ゆるい上下だけ）
    const br = reduce ? 0 : Math.sin(t * .4) * .03, nar = narrow();
    if (nar) { cam.fov = 44; cam.position.set(-6.2, 15.8 + br, 18.6); cam.lookAt(.2, 2.4, -.6); }
    else { cam.fov = 30; cam.position.set(-7.4, 11.2 + br, 18.6); cam.lookAt(.4, 3.0, -.7); }
    cam.updateProjectionMatrix();
    // 碧：待機（見る先だけ、層が上がるときは層を、ふだんは人を）
    if (mot) {
      const k = Math.min(4, Math.max(-1, Math.floor((tc - T_L0) / T_LS)));
      mot.lookAt(reduce ? null : (k >= 0 && tc < T_ALL ? new THREE.Vector3(PC.x, yL(k), PC.z) : HU_EYE));
      mot.update(still ? 0 : dt, cam, { vrmUpdate: false }); stand(); vrm.update(still ? 0 : dt); mot.afterVrmUpdate(still ? 0 : dt);
      if (aoiPivot && !aoiPivot.visible && ++aoiFrames > 3) aoiPivot.visible = true;
    }
    if (person.userData.animate && !still) person.userData.animate(t);
    if (herd) herd.update(still ? 0 : dt, { active: true });
    void any;
    R.render(S, cam);
    placeAll(V);
    if (still) return;
    fps.n++; if (now - fps.t > 1000) { fps.v = Math.round(fps.n * 1000 / (now - fps.t)); fps.n = 0; fps.t = now; }
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; kick(); }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fig.classList.remove('has-3d'); });
  fig.classList.add('has-3d');
  kick();
}

// 角を丸めた長方形（板の形）
function roundRectPts(w, d, r) {
  const pts = [], hw = w / 2, hd = d / 2, seg = 6;
  const corners = [[hw - r, hd - r, 0], [-hw + r, hd - r, Math.PI / 2], [-hw + r, -hd + r, Math.PI], [hw - r, -hd + r, Math.PI * 1.5]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= seg; i++) { const a = a0 + i / seg * Math.PI / 2; pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
  return pts;
}
function roundRect(w, d, r) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(roundRectPts(w, d, r)), 4);
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / d + .5);
  return g;
}
// 層の板の面：ごく薄い層の色の地・細い格子・層ごとの小さな模様（sight＝複眼の点の並び／touch＝面の凹凸の筋／sound＝広がる輪／nature＝等高線／culture＝道と札の目印）
function plateTex(L, k) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 342; const x = c.getContext('2d');
  const col = '#' + L.c.toString(16).padStart(6, '0'), rgba = a => { const n = L.c; return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  x.fillStyle = rgba(.13); x.fillRect(0, 0, 512, 342);
  x.strokeStyle = rgba(.26); x.lineWidth = 1; for (let i = 1; i < 16; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 342); x.stroke(); } for (let i = 1; i < 11; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(512, i * 32); x.stroke(); }
  x.strokeStyle = rgba(.75); x.fillStyle = rgba(.7); x.lineWidth = 1.4;
  const R = (a, b) => { let s = (k + 1) * 9301 + a * 49297 + b * 233; s = (s * 16807) % 2147483647; return s / 2147483647; };
  if (L.key === 'sight') { for (let j = 0; j < 7; j++) for (let i = 0; i < 9; i++) { const cx = 300 + i * 16 + (j % 2) * 8, cy = 70 + j * 14; x.beginPath(); x.arc(cx, cy, 2.4, 0, 6.28); x.fill(); } }
  else if (L.key === 'touch') { for (let j = 0; j < 9; j++) { x.beginPath(); for (let i = 0; i <= 60; i++) { const px = 60 + i * 3.4, py = 200 + j * 11 + Math.sin(i * .5 + j) * 3 * R(i, j); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } }
  else if (L.key === 'sound') { for (let r = 10; r < 120; r += 18) { x.globalAlpha = 1 - r / 130; x.beginPath(); x.arc(150, 120, r, 0, 6.28); x.stroke(); } x.globalAlpha = 1; }
  else if (L.key === 'nature') { for (let r = 1; r < 6; r++) { x.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.28, rr = r * 17 * (1 + .18 * Math.sin(a * 3 + r)); const px = 380 + Math.cos(a) * rr * 1.4, py = 230 + Math.sin(a) * rr; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } }
  else { x.setLineDash([5, 5]); x.beginPath(); x.moveTo(40, 300); x.bezierCurveTo(160, 240, 260, 300, 470, 210); x.stroke(); x.setLineDash([]); for (const [px, py] of [[110, 270], [250, 282], [400, 236]]) { x.strokeRect(px - 7, py - 20, 14, 14); x.beginPath(); x.moveTo(px, py - 6); x.lineTo(px, py + 4); x.stroke(); } }
  x.strokeStyle = col; x.globalAlpha = .5; x.lineWidth = 2; x.strokeRect(1, 1, 510, 340); x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// 人の形だけの模型（顔は描かない。石膏のような地の色）
function makePerson() {
  const P = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9cfc2, roughness: .62 }), cloth = new THREE.MeshStandardMaterial({ color: 0x8a96a3, roughness: .78 }), dark = new THREE.MeshStandardMaterial({ color: 0x4a5464, roughness: .85 });
  const lathe = (pts, m) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28), m);
  const torso = lathe([[0, .86], [.15, .88], [.17, .98], [.16, 1.12], [.19, 1.3], [.2, 1.38], [.16, 1.43], [.07, 1.46], [0, 1.47]], cloth); torso.scale.z = .62; P.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .1, 14), skin); neck.position.y = 1.5; P.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 18), skin); head.scale.set(.88, 1.1, .98); head.position.y = 1.63; P.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 14, 0, Math.PI * 2, 0, Math.PI * .55), dark); hair.scale.set(.92, 1.08, 1.02); hair.position.set(0, 1.645, -.008); P.add(hair);
  const limb = (r0, r1, len, m) => { const gg = new THREE.Group(), c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 14), m); c.position.y = -len / 2; gg.add(c); gg.add(new THREE.Mesh(new THREE.SphereGeometry(r0, 12, 10), m)); return gg; };
  const arms = [];
  for (const sx of [-1, 1]) {
    const th = limb(.075, .055, .44, dark); th.position.set(sx * .085, .88, 0); P.add(th);
    const sh = limb(.055, .042, .42, dark); sh.position.y = -.44; th.add(sh);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(.08, .05, .22), new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: .7 })); ft.position.set(0, -.42, .05); sh.add(ft);
    const ua = limb(.045, .038, .3, cloth); ua.position.set(sx * .215, 1.39, 0); ua.rotation.z = sx * .09; P.add(ua);
    const fa = limb(.036, .03, .27, skin); fa.position.y = -.3; fa.rotation.x = -.12; ua.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 10), skin); hand.scale.set(.8, 1.3, .6); hand.position.y = -.29; fa.add(hand);
    arms.push({ ua, sx });
  }
  P.userData.animate = t => { torso.rotation.z = Math.sin(t * .5) * .01; head.rotation.y = Math.sin(t * .23) * .08; arms.forEach(({ ua, sx }) => { ua.rotation.x = Math.sin(t * .5 + sx) * .02; }); };
  return P;
}
let DOT = null;
function dot() {
  if (DOT) return DOT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return DOT = new THREE.CanvasTexture(c);
}
let SOFT = null;
function softTex() {   // 葉の塊：ふちのやわらかい、中ほどが少し濃い面（葉むらの陰）
  if (SOFT) return SOFT;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.55, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 220; i++) { const a = Math.random() * 6.28, r = Math.random() * 46; x.fillStyle = `rgba(0,0,0,${Math.random() * .18})`; x.beginPath(); x.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2 + Math.random() * 4, 0, 6.28); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return SOFT = t;
}
