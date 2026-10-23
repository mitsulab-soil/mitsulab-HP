// 冒頭の 3D「全体像の地図」（2026-10-23 夜 本人「冒頭のグラフィックは作り直し。情報量を詰め込んでください」
//   「冒頭のグラフィックで、全てが説明できるように数式も入れて、全ての概念を凝縮してください」）
// 一枚に入れるもの：第 0 層（石畳と欅の根もと＝いつもの風景の一片）／AI・GIS・IoT の流れ／環境エージェント（碧・かさねっこの群れ）／
//   主体エージェント（人・ミツバチ・コウモリ・機械）と、それぞれの環世界の泡／環境と主体のあいだに立つ q／q が層 L に訳されて人へ手渡される流れ／
//   五つの層（案 10 の色）が重なって人の泡が広がる＝環世界 1.0 → 2.0／重なりの全体＝Qualium／積み重なる LQM。
// 式は定式化のプルダウンと同じ記号。七つの段を時間で順に光らせ、いまの段の式だけを強く見せる（下の段の札を押すと、その段へ）。
// ・カメラは斜め上に固定（回さない）・碧は共通部品 aoi_motion.js（upright・骨盤を起こして反り腰なし）・かさねっこは共通部品 kit/envAgents/kasane.js
// ・模式の図（実測の値ではない）。石畳は CC0（ambientCG PavingStones133・CC 管理台帳 M-0822）。欅は冒頭の場と同じ模型（葉はやわらかい葉の塊を重ねる）
// ・札どうしは毎こま重なりを調べ、重なる札は段の大事さの順に一つだけ残す（375px でも重ならない）
// ・画面の外とタブを隠したときは止める・動きを減らす設定ではすべて灯った一こまだけ・スマホは粒を減らし画素 1.5 まで
import * as THREE from 'three';
import { LAYER5 } from './kit/layer-colors.js?v=20261023k';
import { makeBee, makeBat } from './kit/creatures.js';

const STEP = 3.9, NST = 7, HOLD = 5, CYCLE = STEP * NST + HOLD;
const SUBJ = [
  { key: 'hito', c: 0xf4aa96, ja: '人', en: 'person' },
  { key: 'hachi', c: 0xc4b2ff, ja: 'ミツバチ', en: 'honeybee' },
  { key: 'komori', c: 0x78b8ec, ja: 'コウモリ', en: 'bat' },
  { key: 'kikai', c: 0xc2c7cc, ja: '機械', en: 'machine' },
];
const AOI_C = 0xa8f2f6, QM_C = 0xa8f2f6, E_C = 0x5fb8d0, LQM_C = 0xd7e9ff;
// 段：名・式・短い意味（式の記号は定式化のプルダウンと同じ）
const STEPS = [
  { ja: '環境エージェント', en: 'Environment agent', eq: 'B<sub>e</sub> ＝ ( σ<sub>e</sub>, R<sub>e</sub>, M<sub>e</sub> )', mj: '場所に身体を与える ── 測る・記録と典拠・内部モデル', me: 'A body for the place — sensing, records and sources, an internal model' },
  { ja: '環世界', en: 'Umwelt', eq: 'U<sub>s</sub> ＝ { q<sub>e,s</sub>(t) }', mj: '主体ごとの世界 ── その身体が受けとれるものの集まり', me: 'Each subject’s world — all that its body can take in' },
  { ja: 'Qualia', en: 'Qualia', eq: 'q<sub>e,s</sub>(t) ＝ Φ( x<sub>e</sub>(t), Σ<sub>s</sub> )', mj: '環境と主体のあいだに立ち上がる受けとり方', me: 'How a place is taken in, arising between environment and subject' },
  { ja: 'Qualia Layer', en: 'Qualia Layer', eq: 'L<sub>j→s</sub> ＝ T<sub>A</sub>( q<sub>e,j</sub> ; Σ<sub>s</sub> )', mj: '碧が、ほかの主体の q を人へ訳して手渡す一枚（L ≠ q）', me: 'Aoi translates another subject’s q into one layer for a person (L ≠ q)' },
  { ja: '環世界 2.0', en: 'Umwelt 2.0', eq: 'U<sub>s</sub><sup>2.0</sup> ＝ U<sub>s</sub><sup>1.0</sup> ∪ { Φ( x<sub>e</sub> ⊕ L, Σ<sub>s</sub> ) }', mj: '五つの層を重ねると、人の環世界が道具で広がる', me: 'Lay the five layers, and a person’s Umwelt widens through tools' },
  { ja: 'Qualium', en: 'Qualium', eq: '𝒬 ＝ ( 𝔼, 𝕊, A, {q}, {L} )', mj: '場所のまわりに、Qualia と層が重なる場', me: 'The field where Qualia and layers overlap around a place' },
  { ja: 'LQM', en: 'LQM', eq: 'LQM ＝ 𝒬 に積み重なった情報そのもの', eqEn: 'LQM ＝ the information accumulated in 𝒬, itself', mj: '学習させたモデルではない（体験の反応は集めない）', me: 'Not a trained model (no responses are collected)' },
];

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
  S.fog = new THREE.Fog(0x03060f, 30, 52);
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, .1, 90);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.45); key.position.set(4, 8, 5); S.add(key);
  const rimL = new THREE.DirectionalLight(0x8fe6f0, .6); rimL.position.set(-6, 3, -5); S.add(rimL);
  const add = THREE.AdditiveBlending;
  const geo = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };
  const lineMat = (c, op) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op, blending: add, depthWrite: false, toneMapped: false });
  const ptsMat = (c, size, op) => new THREE.PointsMaterial({ color: c, size, map: dot(), transparent: true, opacity: op, depthWrite: false, blending: add, toneMapped: false });
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const ring = (r, y = 0, n = 96) => { const p = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2; p.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } return geo(p); };

  // ── 第 0 層：いつもの風景（石畳の一区画。縁は丸くぼかす） ──
  const RG = 7.2;
  {
    const tl = new THREE.TextureLoader();
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 6); tex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .9, color: 0xb2ab9f, transparent: true, depthWrite: false });
    if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(6, 6); mat.normalMap = n; mat.normalScale = new THREE.Vector2(.7, .7); }
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
    const gr = ax.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.6, '#ddd'); gr.addColorStop(.86, '#333'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
    mat.alphaMap = new THREE.CanvasTexture(ac);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RG, 80), mat); m.rotation.x = -Math.PI / 2; S.add(m);
  }
  const TREE = new THREE.Vector3(5.8, 0, -5.4);
  { // 根もとの土
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 6, 64, 64, 62);
    gr.addColorStop(0, 'rgba(44,36,28,1)'); gr.addColorStop(.55, 'rgba(58,46,34,.9)'); gr.addColorStop(1, 'rgba(58,46,34,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${80 + Math.random() * 40 | 0},40,${.25 + Math.random() * .3})`; const a = Math.random() * 6.28, r = Math.random() * 44; x.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 1.4); }
    const m = new THREE.Mesh(new THREE.CircleGeometry(2.0, 40), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(TREE.x, .012, TREE.z); S.add(m);
  }
  // ── 欅：葉の画像を、やわらかい葉の塊（陰のある大きな面の粒）の上に重ねる＝遠目にも点々に崩れない ──
  (async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
      const g = await gl.loadAsync('img/hero/3d/keyaki_lod1_notex.glb');
      const bark = new THREE.MeshStandardMaterial({ color: 0x86725e, roughness: .92 });
      const leaf = new THREE.MeshStandardMaterial({ color: 0xa9bf88, roughness: .82, side: THREE.DoubleSide, alphaTest: .32, alphaToCoverage: !mobile });
      { const t = await new THREE.TextureLoader().loadAsync('img/hero/3d/keyaki_leaf_atlas.png'); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; leaf.map = t; }
      g.scene.updateMatrixWorld(true);
      const tree = new THREE.Group(), leafPos = [];
      g.scene.traverse(o => { if (!o.isMesh) return; const isLeaf = /leaf|leaves/i.test(o.name); const m = new THREE.Mesh(o.geometry, isLeaf ? leaf : bark); m.applyMatrix4(o.matrixWorld); tree.add(m);
        if (isLeaf) { const p = o.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i += Math.max(1, Math.floor(p.count / 260))) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); leafPos.push(v.clone()); } } });
      const v0y = y => y; const TH = 8.6, bb = new THREE.Box3().setFromObject(tree), sz = bb.getSize(new THREE.Vector3()), sc = TH / sz.y;
      tree.scale.setScalar(sc); tree.position.set(TREE.x - (bb.min.x + sz.x / 2) * sc, -bb.min.y * sc, TREE.z - (bb.min.z + sz.z / 2) * sc);
      // 葉の塊：葉の位置から選んだ点に、ふちのやわらかい緑の面（内側ほど暗い＝葉の重なりの陰）
      if (leafPos.length) {
        const n = Math.min(mobile ? 70 : 140, leafPos.length), P = new Float32Array(n * 3), C = new Float32Array(n * 3), cc = new THREE.Color();
        const ctr = bb.getCenter(new THREE.Vector3());
        for (let i = 0; i < n; i++) { const v = leafPos[Math.floor(i / n * leafPos.length)].clone().lerp(new THREE.Vector3(ctr.x, v0y(leafPos[Math.floor(i / n * leafPos.length)].y), ctr.z), .14); P[3 * i] = v.x; P[3 * i + 1] = v.y; P[3 * i + 2] = v.z;
          const shade = .5 + .5 * ((v.y - bb.min.y) / sz.y); cc.setRGB(.15 * shade, .22 * shade, .12 * shade); C[3 * i] = cc.r; C[3 * i + 1] = cc.g; C[3 * i + 2] = cc.b; }
        const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(P, 3)); cg.setAttribute('color', new THREE.BufferAttribute(C, 3));
        const cm = new THREE.PointsMaterial({ size: 1.15 / sc, map: softTex(), vertexColors: true, transparent: true, opacity: .78, depthWrite: false, sizeAttenuation: true });
        const canopy = new THREE.Points(cg, cm); canopy.renderOrder = -1; tree.add(canopy);
      }
      S.add(tree); render(performance.now(), true);
    } catch (e) { console.warn('qualia dive tree', e); }
  })();

  // ── 情報の出どころ（AI＝点の雲・左上／GIS＝地図の線・奥／IoT＝測る柱・右） → 場所の身体 B_e へ ──
  const AI_C = new THREE.Vector3(-5.6, 6.6, -2.8), GIS_Y = 6.9, GIS_C = new THREE.Vector3(.4, GIS_Y, -6.0);
  const PINS = [[4.6, .6], [5.6, -1.2], [3.9, 2.2], [6.0, 1.0]];
  const BE = new THREE.Vector3(.6, .05, -.7);   // 場所の身体（第 0 層の真ん中・層の重なりの下）
  const gisRings = [];
  for (let k = 0; k < 5; k++) { const pts = [], r0 = .4 + k * .4; for (let a = 0; a <= 64; a++) { const th = a / 64 * Math.PI * 2, r = r0 * (1 + .14 * Math.sin(th * 3 + k * .8) + .06 * Math.sin(th * 5 - k)); pts.push([GIS_C.x + Math.cos(th) * r * 1.35 + k * .05, GIS_C.z + Math.sin(th) * r * .8]); } gisRings.push(pts); }
  const gisLine = (() => { const p = []; for (const pts of gisRings) for (let i = 0; i < pts.length - 1; i++) p.push(pts[i][0], GIS_Y, pts[i][1], pts[i + 1][0], GIS_Y, pts[i + 1][1]); return new THREE.LineSegments(geo(p), lineMat(0xbfeee9, .4)); })();
  S.add(gisLine);
  const pinG = (() => { const p = []; for (const [x, z] of PINS) p.push(x, 0, z, x, .8, z); return new THREE.LineSegments(geo(p), lineMat(0xd6e6ee, .6)); })(); S.add(pinG);
  S.add(new THREE.Points(geo(PINS.flatMap(([x, z]) => [x, .83, z])), ptsMat(0xf4fbff, .16, .9)));
  const NAI = mobile ? 160 : 320, aiP = new Float32Array(NAI * 3), aiM = [];
  { let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < NAI; i++) { const u = r() * 2 - 1, th = r() * 6.283, rr = Math.cbrt(r()) * 1.7; aiM.push([Math.sqrt(1 - u * u) * Math.cos(th) * rr * 1.3, u * rr * .8, Math.sqrt(1 - u * u) * Math.sin(th) * rr]); } }
  const aiG = new THREE.BufferGeometry(); aiG.setAttribute('position', new THREE.BufferAttribute(aiP, 3)); const aiPts = new THREE.Points(aiG, ptsMat(0xdff6ff, mobile ? .1 : .08, .8)); aiPts.frustumCulled = false; S.add(aiPts);
  // 流れ：三つの出どころから B_e へ降りる粒
  const NF = mobile ? 60 : 120, fP = new Float32Array(NF * 3), fM = [];
  const srcs = [AI_C, GIS_C.clone().setY(GIS_Y), new THREE.Vector3(PINS[0][0], .83, PINS[0][1])];
  for (let i = 0; i < NF; i++) { const a = srcs[i % 3]; fM.push({ c: new THREE.QuadraticBezierCurve3(a.clone(), a.clone().lerp(BE, .5).add(new THREE.Vector3(0, 2.2, 0)), BE.clone().add(new THREE.Vector3((Math.random() - .5) * .9, 0, (Math.random() - .5) * .9))), o: Math.random() }); }
  const fG = new THREE.BufferGeometry(); fG.setAttribute('position', new THREE.BufferAttribute(fP, 3)); const fPts = new THREE.Points(fG, ptsMat(0xdff6ff, .1, .0)); fPts.frustumCulled = false; S.add(fPts);
  // B_e：場所の身体（三つの輪＝σ 測る・R 記録と典拠・M 内部モデル）
  const beRings = [.5, .85, 1.2].map((r, k) => { const l = new THREE.LineSegments(ring(r, 0, 72), lineMat([0x8fe6f0, 0xf2cf8c, 0xb4a2ff][k], .25)); l.position.copy(BE).setY(.04 + k * .02); S.add(l); return l; });

  // ── 主体エージェントと、それぞれの環世界の泡 ──
  const POS = [new THREE.Vector3(4.3, 0, 3.6), new THREE.Vector3(-5.0, 2.3, -.4), new THREE.Vector3(-1.4, 4.9, -4.6), new THREE.Vector3(-6.0, 0, 3.2)];
  const BR = [1.25, 1.0, 1.25, 1.05];   // 泡の大きさ（模式）
  const subj = SUBJ.map((s, i) => {
    const grp = new THREE.Group(); grp.position.copy(POS[i]); S.add(grp);
    const toE = new THREE.Vector3().subVectors(BE, POS[i]).setY(0).normalize(), yaw = Math.atan2(toE.x, toE.z);
    let body = null, eyeY = 0;
    if (s.key === 'hito') { body = makePerson(); body.scale.setScalar(1.15); body.rotation.y = yaw; grp.add(body); eyeY = 1.85; }
    else if (s.key === 'hachi') { body = makeBee(); body.scale.setScalar(.85); body.rotation.y = yaw; grp.add(body); }
    else if (s.key === 'komori') { const w = new THREE.Group(); body = makeBat(); body.scale.setScalar(.85); w.add(body); w.rotation.y = yaw; grp.add(w); }
    else { body = makeCamera(); body.rotation.y = yaw; grp.add(body); eyeY = 1.2; }
    const eye = POS[i].clone().setY(POS[i].y + eyeY);
    const bub = new THREE.Mesh(new THREE.SphereGeometry(1, mobile ? 28 : 40, mobile ? 18 : 26), bubbleMat(s.c)); bub.position.copy(eye); bub.scale.setScalar(BR[i]); S.add(bub);
    // q：環境と主体のあいだ（主体の目と B_e のあいだの、少し上）に立つ小さな光
    const qp = eye.clone().lerp(BE.clone().setY(1.4), .45).add(new THREE.Vector3(0, .5, 0));
    const qMesh = new THREE.Mesh(new THREE.OctahedronGeometry(.17, 0), new THREE.MeshBasicMaterial({ color: s.c, transparent: true, opacity: 0, blending: add, depthWrite: false, toneMapped: false })); qMesh.position.copy(qp); S.add(qMesh);
    const curve = new THREE.QuadraticBezierCurve3(eye.clone(), qp.clone().add(new THREE.Vector3(0, .4, 0)), BE.clone().setY(.3));
    const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), lineMat(s.c, 0)); S.add(path);
    return { s, grp, body, eye, bub, qp, qMesh, path, curve };
  });
  const HU = subj[0], BEE = subj[1];
  // 環世界 2.0：人の泡の外に、道具で広がった泡（五つの層の色の帯）
  const bub2 = new THREE.Mesh(new THREE.SphereGeometry(1, mobile ? 32 : 48, mobile ? 20 : 30), bubbleMat(0xe8f6ff)); bub2.position.copy(HU.eye); bub2.scale.setScalar(.01); S.add(bub2);
  const bands = LAYER5.map((L, k) => { const l = new THREE.LineSegments(ring(1, 0, 80), lineMat(L.c, 0)); l.position.copy(HU.eye); S.add(l); return l; });

  // ── 層 L：碧が訳した一枚（ミツバチの q → 碧の手 → 人） ──
  const AOI_P = new THREE.Vector3(-1.9, 0, 3.0), AOI_H = 3.3, HAND = new THREE.Vector3(-1.2, 2.0, 3.1);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .76), new THREE.MeshBasicMaterial({ map: paneTex(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); S.add(pane);
  const PANE_A = HAND.clone().add(new THREE.Vector3(.6, .4, 0)), PANE_B = HU.eye.clone().add(new THREE.Vector3(-1.2, .1, -.1));
  const trA = new THREE.QuadraticBezierCurve3(BEE.qp.clone(), new THREE.Vector3(-3.4, 3.4, 1.4), HAND.clone());
  const NT = mobile ? 24 : 40, tP = new Float32Array(NT * 3), tG = new THREE.BufferGeometry(); tG.setAttribute('position', new THREE.BufferAttribute(tP, 3));
  const tPts = new THREE.Points(tG, ptsMat(BEE.s.c, .12, 0)); tPts.frustumCulled = false; S.add(tPts);

  // ── 五つの層：場所の上に重なる（案 10 の色の、質感のある薄い板） ──
  const SX = .9, SZ = -1.0, RL = 2.4, yL = k => 1.25 + k * .5;
  const grain = grainTex();
  const plates = LAYER5.map((L, k) => {
    const g = new THREE.Group(); g.position.set(SX, yL(k), SZ);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(RL, 80), new THREE.MeshStandardMaterial({ color: L.body, map: grain, roughness: .42, metalness: .06, emissive: L.c, emissiveIntensity: .12, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    fill.rotation.x = -Math.PI / 2; g.add(fill);
    const rim = new THREE.LineSegments(ring(RL, 0, 80), lineMat(L.c, 0)); g.add(rim);
    S.add(g); return { g, fill, rim };
  });

  // ── Qualium：重なりの全体を包む、淡い天球（緯線と経線） ──
  const QR = 8.2, dome = new THREE.Group(); dome.position.set(.2, 0, -.4); S.add(dome);
  { const p = []; for (const ph of [.08, .3, .55, .82]) { const r = QR * Math.cos(ph), y = QR * Math.sin(ph) * .62; for (let a = 0; a < 120; a++) { const t0 = a / 120 * Math.PI * 2, t1 = (a + 1) / 120 * Math.PI * 2; p.push(Math.cos(t0) * r, y, Math.sin(t0) * r, Math.cos(t1) * r, y, Math.sin(t1) * r); } }
    for (let k = 0; k < 16; k++) { const th = k / 16 * Math.PI * 2; for (let j = 0; j < 12; j++) { const p0 = j / 12 * Math.PI / 2 * .95, p1 = (j + 1) / 12 * Math.PI / 2 * .95; p.push(Math.cos(th) * QR * Math.cos(p0), QR * Math.sin(p0) * .62, Math.sin(th) * QR * Math.cos(p0), Math.cos(th) * QR * Math.cos(p1), QR * Math.sin(p1) * .62, Math.sin(th) * QR * Math.cos(p1)); } }
    dome.add(new THREE.LineSegments(geo(p), lineMat(QM_C, 0))); }
  const domeL = dome.children[0];

  // ── LQM：積み重なる情報（右手前の、薄い円盤の層が積み上がる柱。上から粒が降りて積もる） ──
  const LQ = new THREE.Vector3(-3.4, 0, -5.4), NLQ = 14;
  const lqDisks = []; for (let k = 0; k < NLQ; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .07, 40), new THREE.MeshStandardMaterial({ color: k % 5 === 0 ? 0x9fb8cc : LAYER5[k % 5].body, emissive: LAYER5[k % 5].c, emissiveIntensity: .25, roughness: .5, transparent: true, opacity: 0, depthWrite: false })); m.position.set(LQ.x, .06 + k * .12, LQ.z); S.add(m); lqDisks.push(m); }
  const NQ = mobile ? 30 : 60, qP = new Float32Array(NQ * 3), qM = []; for (let i = 0; i < NQ; i++) qM.push({ o: Math.random(), a: Math.random() * 6.28, r: Math.random() * 2.5 + .5 });
  const qG = new THREE.BufferGeometry(); qG.setAttribute('position', new THREE.BufferAttribute(qP, 3)); const qPts = new THREE.Points(qG, ptsMat(LQM_C, .09, 0)); qPts.frustumCulled = false; S.add(qPts);

  // ── 碧：環境エージェント。ミツバチの q を受けて、人へ訳す（共通部品 aoi_motion.js） ──
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
      const { AoiMotion } = await import('./aoi_motion.js?v=20261023-v60');
      mot = new AoiMotion(vrm, { root: pivot, reducedMotion: reduce, wind: .25, faceViewer: false, startCalm: 1, posture: 'upright', uprightWeight: .9 });
      mot.faceTo(.2);
      vrm.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (!/CLOTH/.test(m.name || '') || /Outline/.test(m.name || '')) return;
        if (m.emissive) m.emissive.multiplyScalar(.4); if (m.parametricRimColorFactor) m.parametricRimColorFactor.multiplyScalar(.35); if ('shadingToonyFactor' in m) m.shadingToonyFactor = Math.min(m.shadingToonyFactor, .3); }); });
      window.__qvAoi = { vrm, pivot, mot }; kick();
    } catch (e) { console.warn('qualia dive aoi', e); }
  })();
  const FIX = { pelvis: .13, chest: .045 }, _qa = new THREE.Quaternion(), _ex = new THREE.Vector3(1, 0, 0);
  function rotX(name, a, pre) { const b = vrm.humanoid.getNormalizedBoneNode(name); if (!b) return; _qa.setFromAxisAngle(_ex, a); if (pre) b.quaternion.premultiply(_qa); else b.quaternion.multiply(_qa); }
  function stand() { rotX('hips', -FIX.pelvis); rotX('leftUpperLeg', FIX.pelvis, 1); rotX('rightUpperLeg', FIX.pelvis, 1); rotX('spine', FIX.pelvis * .85, 1); rotX('upperChest', FIX.chest); rotX('neck', -FIX.chest * .7, 1); }   // 反り腰なし

  // ── かさねっこ：場所の上の、層の色の小さな群れ（共通部品 kasane.js） ──
  let herd = null;
  setTimeout(async () => {
    try {
      const M = await import('./kit/envAgents/kasane.js?v=20261023m');
      const body = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.body.toString(16).padStart(6, '0')])), hud = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.c.toString(16).padStart(6, '0')]));
      const ok = (x, z) => Math.hypot(x, z) < RG * .8 && Math.hypot(x - AOI_P.x, z - AOI_P.z) > .9 && Math.hypot(x - TREE.x, z - TREE.z) > 2.2 && Math.hypot(x - HU.grp.position.x, z - HU.grp.position.z) > 1 && Math.hypot(x - LQ.x, z - LQ.z) > 1.1;
      herd = new M.KasaneHerd({ scene: S, camera: cam, groundAt: () => 0, walkable: ok, body, hud, scale: 2.4, mobile, maxDist: 80, max: 12, guideEvery: 1e9 });
      herd.addGroup(['sight', 'touch', 'sound', 'nature', 'culture'].map(l => ({ layer: l })), { x: -.2, z: 3.9, radius: 1.1, role: 'watch' });
      herd.addGroup(['nature', 'culture', 'touch'].map(l => ({ layer: l })), { x: 2.6, z: 2.3, radius: 1 });
      if (!mobile) herd.addGroup(['sound', 'sight', 'nature'].map(l => ({ layer: l })), { x: -3.4, z: 1.2, radius: .9 });
      await herd.load(); kick();
    } catch (e) { console.warn('qualia dive kasane', e); }
  }, 600);

  // ── 札と式（HTML。3D の点に寄せる。毎こま重なりを調べる） ──
  const T = (ja, en) => ({ ja, en });
  const labs = [];
  function lab(txt, cls, at, o = {}) { const e = document.createElement('span'); e.className = 'qv-lab ' + cls; e.setAttribute('aria-hidden', 'true'); if (o.c) e.style.setProperty('--c', '#' + o.c.toString(16).padStart(6, '0')); stage.appendChild(e);
    const L = { e, txt, at, st: o.st ?? -1, pri: o.pri ?? 1, a: 0, w: 0, h: 0, eq: !!o.eq, dx: o.dx || 0, dy: o.dy || 0, side: o.side || 'c' }; labs.push(L); return L; }
  const setText = L => { const en = isEn(); if (L.eq) { const s = STEPS[L.st]; L.e.innerHTML = '<span class="qv-eq" translate="no">' + (en && s.eqEn ? s.eqEn : s.eq) + '</span><small>' + (en ? s.me : s.mj) + '</small>'; } else L.e.innerHTML = en ? L.txt.en : L.txt.ja; L.w = 0; };
  // 物の札（段 st でその札が強くなる）
  lab(T('AI', 'AI'), 'qv-src', () => AI_C.clone().add(new THREE.Vector3(0, 1.6, 0)), { st: 0, pri: 2 });
  lab(T('GIS', 'GIS'), 'qv-src', () => GIS_C.clone().add(new THREE.Vector3(1.9, .2, 0)), { st: 0, pri: 2 });
  lab(T('IoT', 'IoT'), 'qv-src', () => new THREE.Vector3(5.6, 1.5, .2), { st: 0, pri: 2 });
  lab(T('第 0 層　いつもの風景', 'Layer 0 — the everyday scene'), 'qv-base', () => new THREE.Vector3(.4, 0, RG * .93), { st: 0, pri: 2 });
  lab(T('場所 e <i>E</i>', 'place e <i>E</i>'), 'qv-obj', () => BE.clone().add(new THREE.Vector3(1.6, 0, .9)), { st: 0, pri: 2, c: E_C });
  lab(T('碧 <i>A</i>', 'Aoi <i>A</i>'), 'qv-obj', () => AOI_P.clone().add(new THREE.Vector3(-.75, AOI_H * .55, 0)), { st: 3, pri: 3, c: AOI_C });
  lab(T('かさねっこ', 'Kasanekko'), 'qv-obj', () => new THREE.Vector3(-.2, .1, 4.9), { st: 0, pri: 1, c: 0xf0d19d });
  SUBJ.forEach((s, i) => lab(T(s.ja + ' <i>S</i>', s.en + ' <i>S</i>'), 'qv-obj', () => subj[i].eye.clone().add(new THREE.Vector3(0, BR[i] + .25, 0)), { st: 1, pri: i === 0 ? 3 : 2, c: s.c }));
  const lU = lab(T('環世界 <i>U</i><sub>s</sub>', 'Umwelt <i>U</i><sub>s</sub>'), 'qv-obj qv-u', () => BEE.eye.clone().add(new THREE.Vector3(0, -BR[1] - .3, 0)), { st: 1, pri: 1, c: BEE.s.c });
  lab(T('<i>q</i>', '<i>q</i>'), 'qv-q', () => HU.qp.clone().add(new THREE.Vector3(.35, .2, 0)), { st: 2, pri: 2, c: HU.s.c });
  lab(T('<i>L</i>', '<i>L</i>'), 'qv-q', () => pane.position.clone().add(new THREE.Vector3(0, .62, 0)), { st: 3, pri: 2, c: BEE.s.c });
  const lLay = LAYER5.map((L, k) => lab(T('Qualia/' + L.key, 'Qualia/' + L.key), 'qv-layer', () => new THREE.Vector3(SX + (k % 2 ? -1.05 : 1.0) * RL, yL(k), SZ + RL * .2), { st: 4, pri: 1, c: L.c }));
  lab(T('Qualium <i>𝒬</i>', 'Qualium <i>𝒬</i>'), 'qv-qm', () => new THREE.Vector3(-6.4, QR * .5, -2.6), { st: 5, pri: 2 });
  lab(T('LQM', 'LQM'), 'qv-obj', () => LQ.clone().add(new THREE.Vector3(0, NLQ * .12 + .45, 0)), { st: 6, pri: 2, c: LQM_C });
  // 式（その段の要素のそば）
  const EQ_AT = [
    () => BE.clone().add(new THREE.Vector3(-2.6, 1.0, 1.4)),
    () => BEE.eye.clone().add(new THREE.Vector3(.4, 1.7, 0)),
    () => HU.qp.clone().add(new THREE.Vector3(-.8, 1.5, 0)),
    () => pane.position.clone().add(new THREE.Vector3(.3, narrow() ? 2.6 : 1.5, 0)),
    () => new THREE.Vector3(SX - .4, yL(4) + 1.4, SZ),
    () => new THREE.Vector3(-1.0, QR * .66, -3.0),
    () => LQ.clone().add(new THREE.Vector3(-1.2, NLQ * .12 + 1.6, 0)),
  ];
  const eqs = STEPS.map((s, k) => lab(null, 'qv-eqlab', EQ_AT[k], { st: k, pri: 5, eq: true }));
  labs.forEach(setText);
  // 下の段の帯（いまの段の名・式・意味。押すとその段へ）
  const bar = document.createElement('div'); bar.className = 'qv-steps'; stage.appendChild(bar);
  const dots = STEPS.map((s, k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'qv-step'; b.addEventListener('click', () => { tc = k * STEP + .01; hold = 0; kick(); }); bar.appendChild(b); return b; });
  const setDots = () => dots.forEach((b, k) => { b.innerHTML = '<span class="qv-sn" translate="no">' + String(k + 1).padStart(2, '0') + '</span><span class="qv-sname">' + (isEn() ? STEPS[k].en : STEPS[k].ja) + '</span>'; b.setAttribute('aria-label', (isEn() ? 'Step ' : '段 ') + (k + 1) + ' ' + (isEn() ? STEPS[k].en : STEPS[k].ja)); });
  setDots();
  document.addEventListener('hp-lang-change', () => { labs.forEach(setText); setDots(); render(performance.now(), true); });

  let W = 0, Hh = 0;
  const size = () => { W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix(); labs.forEach(L => { L.w = 0; }); };
  new ResizeObserver(() => { size(); render(performance.now(), true); }).observe(cv); size();

  const v3 = new THREE.Vector3(), boxes = [];
  function placeAll(cur, allOn) {
    const nar = narrow();
    // 見せる札：いまの段の式（強）／ほかの段の式（PC は薄く・狭い画面は出さない）／物の札
    const items = [];
    for (const L of labs) {
      let want;
      if (L.eq) want = L.st === cur ? 1 : allOn ? (nar ? 0 : .5) : (L.st < cur && !nar ? .24 : 0);
      else want = L.st === cur ? 1 : (L.st < cur || allOn) ? (nar ? .62 : .72) : (L.st === -1 ? .7 : 0);
      if (L === lU && cur < 1 && !allOn) want = 0;
      if (lLay.includes(L) && cur < 4 && !allOn) want = 0;
      L.want = want; if (want > .01) items.push(L); else { L.a = L.a < .03 ? 0 : L.a * .8; L.e.style.opacity = L.a.toFixed(2); }
    }
    // 優先：いまの段 → 式 → 大事さ
    items.sort((a, b) => ((b.st === cur) - (a.st === cur)) || (b.pri - a.pri));
    boxes.length = 0;
    for (const L of items) {
      if (!L.w) { L.w = L.e.offsetWidth; L.h = L.e.offsetHeight; }
      v3.copy(L.at()).project(cam);
      let x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * Hh;
      const hw = L.w / 2, hh = L.h / 2; x = Math.max(hw + 4, Math.min(W - hw - 4, x)); y = Math.max(hh + 4, Math.min(Hh - (nar ? 46 : 52) - hh, y));
      // 重なりを避ける：上下に少しずつずらす。避けきれなければ、その札は出さない
      let ok = false, yy = y;
      for (const d of [0, -1, 1, -2, 2, -3, 3]) { yy = y + d * (L.h * .62 + 2); const b = [x - hw - 3, yy - hh - 2, x + hw + 3, yy + hh + 2]; if (b[1] < 2 || b[3] > Hh - (nar ? 44 : 50)) continue; if (!boxes.some(c => b[0] < c[2] && b[2] > c[0] && b[1] < c[3] && b[3] > c[1])) { boxes.push(b); ok = true; break; } }
      const tgt = ok ? L.want : 0; if (!ok) L.a = 0; else { L.a += (tgt - L.a) * .2; if (Math.abs(tgt - L.a) < .01) L.a = tgt; }
      L.e.style.opacity = L.a.toFixed(2); L.e.classList.toggle('now', L.st === cur && !L.eq ? true : L.eq && L.st === cur);
      if (ok) L.e.style.transform = 'translate(' + Math.round(x - hw) + 'px,' + Math.round(yy - hh) + 'px)';
    }
  }

  let faceNow = .2, t0 = performance.now(), raf = 0, vis = true, last = t0, tc = reduce ? CYCLE - .1 : 0, hold = 0, pointed = -1, curShown = -2;
  const fps = { n: 0, t: t0, v: 0 };
  window.__qvDive = { get fps() { return fps.v; }, get step() { return curShown; }, set tc(x) { tc = x; }, get tc() { return tc; } };
  const tmpC = new THREE.Color();
  function render(now, still) {
    const dt = still ? 0 : Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; const t = (now - t0) / 1000;
    if (!reduce && !still) tc = (tc + dt) % CYCLE;
    const allOn = tc >= STEP * NST, cur = allOn ? -1 : Math.floor(tc / STEP), u = allOn ? 1 : (tc - cur * STEP) / STEP;
    const on = k => allOn || cur > k ? 1 : cur === k ? sstep(0, .35, u) : 0;   // 段 k の要素が出ているか（出たら残る）
    const hi = k => cur === k ? 1 : 0;                                   // いま光っている段
    const fadeOut = 1 - sstep(CYCLE - .9, CYCLE - .1, tc);
    // 0 環境エージェント：出どころの流れ・B_e の輪
    const rot = t * .12;
    for (let i = 0; i < NAI; i++) { const m = aiM[i], c = Math.cos(rot), s = Math.sin(rot); aiP[3 * i] = AI_C.x + m[0] * c - m[2] * s; aiP[3 * i + 1] = AI_C.y + m[1] + Math.sin(t * .8 + i) * .04; aiP[3 * i + 2] = AI_C.z + m[0] * s + m[2] * c; }
    aiG.attributes.position.needsUpdate = true;
    for (let i = 0; i < NF; i++) { const f = fM[i], p = f.c.getPoint((t * .22 + f.o) % 1); fP[3 * i] = p.x; fP[3 * i + 1] = p.y; fP[3 * i + 2] = p.z; }
    fG.attributes.position.needsUpdate = true;
    fPts.material.opacity = (.25 + .65 * hi(0)) * on(0) * fadeOut + .15 * (allOn ? 1 : 0);
    aiPts.material.opacity = .45 + .4 * hi(0); gisLine.material.opacity = .22 + .35 * hi(0);
    beRings.forEach((l, k) => { l.material.opacity = (.22 + .5 * hi(0) * (.6 + .4 * Math.sin(t * 2.4 - k))) ; l.scale.setScalar(1 + .04 * Math.sin(t * 1.6 + k)); });
    // 1 環世界：泡
    subj.forEach((o, i) => { o.bub.material.uniforms.op.value = (.32 + .55 * hi(1)) * on(1); o.bub.visible = on(1) > .01;
      const a = o.body?.userData?.animate; if (a && !still) { try { a(t, o.s.key !== 'hito'); } catch (e) { } }
      o.qMesh.material.opacity = on(2) * (.55 + .45 * hi(2)) * (.8 + .2 * Math.sin(t * 3 + i)); o.qMesh.rotation.y = t * .8 + i; o.qMesh.scale.setScalar(.6 + .4 * on(2) + .25 * hi(2) * Math.sin(t * 4));
      o.path.material.opacity = on(2) * (.18 + .5 * hi(2)); });
    // 3 Qualia Layer：ミツバチの q → 碧の手 → 層 L → 人
    { const k = 3, pr = cur === k ? u : on(k);
      const fl = cur === k ? sstep(.05, .5, u) * (1 - sstep(.55, .7, u)) : 0;
      for (let i = 0; i < NT; i++) { const p = trA.getPoint(((t * .5 + i / NT) % 1)); tP[3 * i] = p.x; tP[3 * i + 1] = p.y; tP[3 * i + 2] = p.z; } tG.attributes.position.needsUpdate = true; tPts.material.opacity = .9 * fl;
      const m = cur === k ? sstep(.45, .95, u) : 1; pane.position.lerpVectors(PANE_A, PANE_B, m); pane.lookAt(cam.position); pane.material.opacity = (cur === k ? sstep(.38, .52, u) : cur > k || allOn ? .7 : 0) * fadeOut; pane.scale.setScalar(cur > k || allOn ? .8 : 1);
      if (mot && cur === k && pointed !== Math.floor(tc / CYCLE * 0 + (now - t0) / 1000 / CYCLE) && u > .22 && u < .3) { pointed = Math.floor((now - t0) / 1000 / CYCLE); mot.point(PANE_A.clone().lerp(HU.eye, .3).setY(.95), 2.4); mot.express('warm', .4, 3); }
      void pr; }
    // 4 環世界 2.0：五つの層が重なり、人の泡が広がる
    { const k = 4, p = on(k), grow = cur === k ? sstep(.15, .85, u) : p;
      plates.forEach((pl, j) => { const a = cur === k ? sstep(.04 + j * .08, .3 + j * .08, u) : p; pl.fill.material.opacity = (.22 + .2 * hi(k)) * a * fadeOut; pl.rim.material.opacity = (.55 + .35 * hi(k)) * a * fadeOut; });
      bub2.scale.setScalar(lerp(BR[0], 2.15, grow) * (grow > .01 ? 1 : .01)); bub2.material.uniforms.op.value = (.25 + .5 * hi(k)) * grow * fadeOut; bub2.visible = grow > .01;
      bands.forEach((l, j) => { const r = lerp(BR[0], 2.15, grow) * Math.cos((j - 2) * .3); l.scale.setScalar(r); l.position.y = HU.eye.y + lerp(BR[0], 2.15, grow) * Math.sin((j - 2) * .3); l.material.opacity = (.22 + .3 * hi(k)) * grow * fadeOut; }); }
    // 5 Qualium
    domeL.material.opacity = on(5) * (.1 + .25 * hi(5)) * fadeOut;
    // 6 LQM：円盤が積み上がり、粒が降りて積もる
    { const k = 6, n = cur === k ? Math.floor(sstep(0, .9, u) * NLQ) : on(k) ? NLQ : 3;
      lqDisks.forEach((d, j) => { d.material.opacity = (j < n ? .62 : 0) * (cur === k || allOn || cur < 0 ? 1 : .85) * fadeOut; });
      for (let i = 0; i < NQ; i++) { const q = qM[i], f = (t * .3 + q.o) % 1; qP[3 * i] = lerp(LQ.x + Math.cos(q.a) * q.r, LQ.x, f); qP[3 * i + 1] = lerp(QR * .5, n * .12 + .1, f); qP[3 * i + 2] = lerp(LQ.z + Math.sin(q.a) * q.r, LQ.z, f); }
      qG.attributes.position.needsUpdate = true; qPts.material.opacity = .85 * hi(k) + (allOn ? .3 : 0); }
    // カメラ：斜め上の一つの向き（ゆるい上下だけ）
    const br = reduce ? 0 : Math.sin(t * .4) * .04, nar = narrow();
    if (nar) { cam.fov = 42; cam.position.set(-7.0, 20.5 + br, 19.0); cam.lookAt(.3, 2.0, -.6); }
    else { cam.fov = 30; cam.position.set(-7.4, 12.6 + br, 23.0); cam.lookAt(.2, 2.9, -.4); }
    cam.updateProjectionMatrix();
    // 碧：段ごとに見る先を替える（目が先・頭があと〈共通部品〉）。訳す段で手をかざす
    if (mot) {
      const lk = cur === 0 ? BE.clone().setY(.4) : cur === 1 ? BEE.eye : cur === 2 ? HU.qp : cur === 3 ? (u < .5 ? BEE.qp : HU.eye) : cur === 4 ? new THREE.Vector3(SX, yL(2), SZ) : cur === 5 ? null : cur === 6 ? LQ.clone().setY(1) : null;
      mot.lookAt(reduce ? null : lk);
      { const fy = cur === 3 ? .85 : .2; if (fy !== faceNow) { faceNow = fy; mot.faceTo(fy); } }   // 訳す段は、体を人と見る人のあいだへ向けてから手をかざす（真横を指すと腕が肩の上へ上がる）
      mot.update(still ? 0 : dt, cam, { vrmUpdate: false }); stand(); vrm.update(still ? 0 : dt); mot.afterVrmUpdate(still ? 0 : dt);
      if (aoiPivot && !aoiPivot.visible && ++aoiFrames > 3) aoiPivot.visible = true;
    }
    if (herd) herd.update(still ? 0 : dt, { active: true });
    R.render(S, cam);
    placeAll(cur, allOn);
    if (cur !== curShown) { curShown = cur; dots.forEach((b, k) => { b.classList.toggle('on', k === cur); b.classList.toggle('done', allOn || k < cur); }); }
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

// 環世界の泡：ふちだけが淡く光る半透明の球（中は透ける）
function bubbleMat(hex) {
  return new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(hex) }, op: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 c; uniform float op; varying vec3 vN; varying vec3 vV; void main(){ float f = 1. - abs(dot(vN, vV)); float a = (pow(f, 2.6) * .85 + .05) * op; gl_FragColor = vec4(c * a, a); }',
  });
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
  P.userData.animate = t => { P.position.x = Math.sin(t * .5) * .008; torso.rotation.z = Math.sin(t * .5) * .012; arms.forEach(({ ua, sx }) => { ua.rotation.x = Math.sin(t * .5 + sx) * .02; }); };
  return P;
}
// 機械：三脚の上の写真機
function makeCamera() {
  const g = new THREE.Group(), M = (c, r, m) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const metal = M(0x3a4148, .45, .6), dark = M(0x15191d, .3, .4), glass = M(0x0b1a24, .08, .2);
  const c3 = new THREE.Group(); c3.position.y = 1.2; c3.scale.setScalar(1.6); g.add(c3);
  c3.add(new THREE.Mesh(new THREE.BoxGeometry(.42, .28, .24), metal));
  const top = new THREE.Mesh(new THREE.BoxGeometry(.16, .06, .14), dark); top.position.set(-.08, .17, 0); c3.add(top);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(.095, .1, .24, 24), dark); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0, .23); c3.add(lens);
  const lg = new THREE.Mesh(new THREE.CircleGeometry(.08, 24), glass); lg.position.set(0, 0, .352); c3.add(lg);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a4a })); led.position.set(.16, .09, .121); c3.add(led);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + .4, leg = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, 1.25, 8), dark); leg.position.set(Math.cos(a) * .22, .57, Math.sin(a) * .22); leg.rotation.set(Math.sin(a) * .34, 0, -Math.cos(a) * .34); g.add(leg); }
  return g;
}
function paneTex() {   // 層 L：細い縁と、花の模様を写した点（ミツバチの q の写しの模式）
  const c = document.createElement('canvas'); c.width = 256; c.height = 176; const x = c.getContext('2d');
  x.fillStyle = 'rgba(30,22,52,.55)'; x.fillRect(0, 0, 256, 176);
  x.strokeStyle = 'rgba(214,200,255,.85)'; x.lineWidth = 2; x.strokeRect(3, 3, 250, 170);
  x.strokeStyle = 'rgba(214,200,255,.3)'; x.lineWidth = 1; for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(3, k * 44); x.lineTo(253, k * 44); x.stroke(); }
  const flower = (cx, cy, r) => { for (let p = 0; p < 6; p++) for (let j = 1; j <= 4; j++) { const a = p / 6 * Math.PI * 2, rr = r * j / 4; x.fillStyle = `rgba(${200 + j * 10},${170 + j * 12},255,${.95 - j * .14})`; x.beginPath(); x.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.6, 0, 6.28); x.fill(); } x.fillStyle = 'rgba(255,240,200,1)'; x.beginPath(); x.arc(cx, cy, 4, 0, 6.28); x.fill(); };
  flower(70, 92, 34); flower(176, 70, 26); flower(196, 136, 18);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
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
let SOFT = null;
function softTex() {   // 葉の塊：ふちのやわらかい、中ほどが少し濃い面（葉むらの陰）
  if (SOFT) return SOFT;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.55, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 220; i++) { const a = Math.random() * 6.28, r = Math.random() * 46; x.fillStyle = `rgba(0,0,0,${Math.random() * .18})`; x.beginPath(); x.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2 + Math.random() * 4, 0, 6.28); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return SOFT = t;
}
