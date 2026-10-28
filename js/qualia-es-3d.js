// PHILOSOPHY の 3D「環境と主体のあいだに、Qualia がある。」（TOP の一番上の図）
// 2026-10-24 本人（三つの指示をまとめて作り直した）：
//   ①主体のボタンと「図に式を出す」を外し、式の札は出しっぱなし（いま光る関係の式を強く、ほかは薄く）。主体は一巡のなかで自動で順にめぐる。
//   ②「グラフィックにもっと Qualium 感…デジタル空間とフィジカル空間を統合したイメージをオブジェクトを入れて…視覚だけでなく、聴覚、触覚、文化、自然などの層が重なっていることを表現」
//     → 暗い地に細い格子・走査の輪・データの粒・ワイヤーフレーム・HUD の札。写実の物（石畳・欅・石燈籠）に、ワイヤーフレームと測った点群と記録の札が重なる（雰囲気は電脳もの。記号や画面は写さず独自）。
//     → 五つの層（案 10 の色）を層ごとの表現で場所に積む：sight＝複眼の六角と紫外の花の模様／sound＝音の輪と波／touch＝凹凸と振動の筋／nature＝等高線・水の輪・葉／culture＝札・古い道・祭りの灯。
//   ③「主体エージェントは環境の中に入っています。環世界1.0と環世界2.0の違いは、身体感覚での環世界の体験と、情報が積層した世界での環世界の違い」
//     → 主体（人・ミツバチ・コウモリ・機械）は場所＝環境エージェント E の中に立つ。各主体は身体の感覚の泡（環世界1.0）で、環境の手がかり（欅・花・燈籠・石畳）を受けとる（知覚）。
//       手がかりと主体のあいだに、その主体だけの q の殻が立ち上がる（知覚→認知＝関係）。碧がミツバチの q を、人が受けとれる層 L に訳す（L ≠ q）。
//       最後に五つの層が場所に積み重なり、主体はその層の中で受けとる（環世界2.0：泡が層の色の点を帯びて広がる）。すべてが重なる場＝Qualium（𝒬）。
// ・カメラは回さない（斜め上の一つの向き）。碧は共通部品 aoi_motion.js。かさねっこは共通部品 kit/envAgents/kasane.js
// ・ミツバチとコウモリは共通部品の生きもの（js/kit/creatures.js）。人は形だけの模型。大きさは見やすく誇張した模式で、線と点は実測の値ではない
// ・画面に近づいてから読む・画面の外とタブを隠したときは止める・動きを減らす設定では重なった一こまだけ描く
import * as THREE from 'three';
import { lineMaterial, pointMaterial, contours, pillars, drift } from './kit/layers.js';
import { makeBee, makeBat } from './kit/creatures.js';
import { LAYER5 } from './kit/layer-colors.js?v=20261023k';

const SUBJ = [
  { key: 'hito', c: 0xf4aa96 },
  { key: 'hachi', c: 0xc4b2ff },
  { key: 'komori', c: 0x78b8ec },
  { key: 'kikai', c: 0xc2c7cc },
];
const E_C = 0x5fb8d0, QM_C = 0xa8f2f6, AOI_C = 0x8fe6f0;
const SLOT = 4.6, TR = 5.4, ALL = 7.4, OUT = 1.4;
const T_TR = SLOT * 4, T_ALL = T_TR + TR, CYCLE = T_ALL + ALL + OUT;
const J = 1, TO = 0;   // 訳す：ミツバチ（j）の q を、人（s）へ
const RE = 5.0;        // 場所（環境エージェント E）の広さ。主体はこの中に立つ
const RL = 4.3;        // 五つの層の板の広さ
const LY = [.32, .62, .92, 1.22, 1.52];   // 五つの層の高さ（人の身体を通る高さ＝層の中に立つ）

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
  S.fog = new THREE.Fog(0x03060f, 22, 44);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 90);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 7, 6); S.add(key);
  const rim = new THREE.DirectionalLight(0x8fe6f0, .9); rim.position.set(-5, 3, -4); S.add(rim);
  const g = new THREE.Group(); S.add(g);
  const geo = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const bump = (a, b, c, d, x) => sstep(a, b, x) * (1 - sstep(c, d, x));
  const ringGeo = (r, y = 0, n = 96) => { const p = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2; p.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } return geo(p); };
  const tl = new THREE.TextureLoader();
  const SPH = sphereLines(4, 8);
  const fades = [];   // 一巡の終わりに薄れるもの [material, 基準の濃さ]

  // ── 電脳の地：場所の外まで続く細い格子（中心ほど明るい）・走査の輪・漂うデータの粒 ──
  {
    const p = [], c = [], R0 = 10, stp = .5, base = new THREE.Color(E_C);
    for (let v = -R0; v <= R0 + 1e-6; v += stp) for (const ax of [0, 1]) for (let u = -R0; u < R0 - 1e-6; u += stp) {
      const A = ax ? [v, u] : [u, v], B = ax ? [v, u + stp] : [u + stp, v];
      const fa = Math.max(0, 1 - Math.hypot(A[0], A[1]) / R0) ** 1.4, fb = Math.max(0, 1 - Math.hypot(B[0], B[1]) / R0) ** 1.4;
      if (fa <= 0 && fb <= 0) continue;
      p.push(A[0], -.02, A[1], B[0], -.02, B[1]); c.push(base.r * fa, base.g * fa, base.b * fa, base.r * fb, base.g * fb, base.b * fb);
    }
    const gg = geo(p); gg.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
  }
  const scan = new THREE.LineSegments(ringGeo(1, .03, 128), lineMaterial(QM_C, 0)); g.add(scan);
  const dust = drift({ count: mobile ? 110 : 240, box: [[-9, 0, -7], [9, 5.5, 5]], color: E_C, size: .045, speed: [.04, .16], opacity: .42 }); g.add(dust);

  // ── E：環境エージェント（場所）。石畳の下に格子と等高線が透け、記録の柱が立つ。縁は HUD の目盛り ──
  {
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 5);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, color: 0x9d998f, transparent: true, opacity: .8, depthWrite: false });
    if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(5, 5); mat.normalMap = n; mat.normalScale = new THREE.Vector2(.7, .7); }
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
    const gr = ax.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.7, '#ddd'); gr.addColorStop(.92, '#333'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
    mat.alphaMap = new THREE.CanvasTexture(ac);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RE * 1.08, 72), mat); m.rotation.x = -Math.PI / 2; g.add(m);
    // 縁：場所の境い目の輪と、HUD の目盛り
    g.add(new THREE.LineSegments(ringGeo(RE, .03, 160), lineMaterial(E_C, .55)));
    const tk = []; for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2, l = k % 6 ? .12 : .32; tk.push(Math.cos(a) * RE, .03, Math.sin(a) * RE, Math.cos(a) * (RE + l), .03, Math.sin(a) * (RE + l)); }
    g.add(new THREE.LineSegments(geo(tk), lineMaterial(E_C, .5)));
  }
  const hAt = (x, z) => .28 * Math.exp(-((x - .4) ** 2 + (z + .6) ** 2) / 4) + .14 * Math.exp(-((x + 2) ** 2 + (z - 1) ** 2) / 2);
  const clip = (cl, r) => { const p = cl.geometry.attributes.position.array, keep = []; for (let i = 0; i < p.length; i += 6) if (Math.hypot(p[i], p[i + 2]) < r && Math.hypot(p[i + 3], p[i + 5]) < r) keep.push(...p.slice(i, i + 6)); cl.geometry.dispose(); cl.geometry = geo(keep); return cl; };
  g.add(clip(contours(hAt, { x0: -RE, x1: RE, z0: -RE, z1: RE, cell: .16, step: .045, lift: .02, color: E_C, opacity: .42 }), RE * .97));
  const SRC = [[-3.6, -1.2], [-.4, -2.6], [1.2, 2.2], [3.7, -.6], [-1.9, 3.3]].map(([x, z]) => [x, 0, z]);
  g.add(pillars(SRC, { height: .9, color: 0xb4a2ff, opacity: .5 }));
  // E の内部モデル（見取り図）：場所の上に浮かぶ小さな写し
  const model = new THREE.Group(); model.position.set(0, 3.25, -2.2); g.add(model);
  {
    const mini = clip(contours(hAt, { x0: -RE, x1: RE, z0: -RE, z1: RE, cell: .3, step: .06, lift: 0, color: E_C, opacity: .8 }), RE * .95);
    mini.scale.setScalar(.11); model.add(mini);
    model.add(new THREE.LineSegments(ringGeo(.56, 0, 64), lineMaterial(E_C, .6)));
    model.add(new THREE.LineSegments(geo([0, -3.2, 0, 0, -.05, 0]), lineMaterial(E_C, .25)));
  }

  // ── 写実の物と、その写し（デジタルとフィジカルの統合）：欅と石燈籠 ──
  const TREE_P = new THREE.Vector3(-2.5, 0, -3.3), TREE_H = mobile ? 3.6 : 4.1;
  const LANT_P = new THREE.Vector3(2.75, 0, -2.6);
  const treeScan = new THREE.LineSegments(ringGeo(1, 0, 64), lineMaterial(0x88b68f, 0)); treeScan.position.copy(TREE_P); g.add(treeScan);
  let treeR = 1.2;
  setTimeout(async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
      const [gt, bt] = await Promise.all([gl.loadAsync('img/hero/3d/keyaki_lod1_notex.glb'), tl.loadAsync('x/02/tex/bark_zelkova.webp')]);
      bt.colorSpace = THREE.SRGBColorSpace; bt.wrapS = bt.wrapT = THREE.RepeatWrapping;
      const bark = new THREE.MeshStandardMaterial({ map: bt, color: 0xb3a28c, roughness: .92 });
      let leaf = null;
      if (!mobile) { const lt = await tl.loadAsync('img/hero/3d/keyaki_leaf_atlas.png'); lt.flipY = false; lt.colorSpace = THREE.SRGBColorSpace; leaf = new THREE.MeshStandardMaterial({ map: lt, alphaTest: .45, side: THREE.DoubleSide, color: 0xaec28e, roughness: .8 }); }
      gt.scene.updateMatrixWorld(true);
      const T = new THREE.Group(), v3 = new THREE.Vector3();
      gt.scene.traverse(o => {
        if (!o.isMesh) return;
        const isLeaf = /leaf|leaves/i.test(o.name);
        if (!isLeaf) {
          const m = new THREE.Mesh(o.geometry, bark); m.applyMatrix4(o.matrixWorld); T.add(m);
          const w = new THREE.LineSegments(new THREE.WireframeGeometry(o.geometry), lineMaterial(E_C, .14)); w.applyMatrix4(o.matrixWorld); w.scale.multiplyScalar(1.015); T.add(w);
        } else {
          if (leaf) { const m = new THREE.Mesh(o.geometry, leaf); m.applyMatrix4(o.matrixWorld); T.add(m); }
          const P = o.geometry.attributes.position, q = [], stp = mobile ? 3 : 5;
          for (let k = 0; k < P.count; k += stp) { v3.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld); q.push(v3.x, v3.y, v3.z); }
          T.add(new THREE.Points(geo(q), pointMaterial(0x88b68f, mobile ? .05 : .035, mobile ? .85 : .6)));   // 測った点群（模式）
        }
      });
      const bb = new THREE.Box3().setFromObject(T), sz = bb.getSize(new THREE.Vector3()), sc = TREE_H / sz.y;
      T.scale.setScalar(sc); T.position.set(TREE_P.x - (bb.min.x + sz.x / 2) * sc, -bb.min.y * sc, TREE_P.z - (bb.min.z + sz.z / 2) * sc);
      treeR = Math.max(sz.x, sz.z) * sc * .5;
      g.add(T); kick();
    } catch (e) { console.warn('qualia es tree', e); }
  }, 300);
  const lantern = makeLantern(tl, mobile); lantern.position.copy(LANT_P); lantern.rotation.y = -.5; g.add(lantern);
  const lBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.95, 1.85, .95)), lineMaterial(E_C, .38)); lBox.position.set(LANT_P.x, .93, LANT_P.z); lBox.rotation.y = -.5; g.add(lBox);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(.86, .43), new THREE.MeshBasicMaterial({ map: tagTex(), transparent: true, depthWrite: false, toneMapped: false, opacity: .9 }));
  tag.position.set(LANT_P.x + .75, 2.15, LANT_P.z); g.add(tag);
  g.add(new THREE.LineSegments(geo([LANT_P.x + .1, 1.6, LANT_P.z, LANT_P.x + .5, 1.98, LANT_P.z]), lineMaterial(E_C, .5)));

  // ── 五つの層（場所に積み重なる情報の層・案 10 の色）。層ごとの表現で重なる ──
  const layers = makeLayers();
  // ── S：主体エージェント（場所の中に立つ）。cue＝その主体が受けとる環境の手がかり ──
  const DEF = [
    { pos: [-3.1, 0, 1.5], cue: [-2.5, 1.6, -3.0], bc: [0, 1.0, 0], r1: .95 },     // 人：欅を見る
    { pos: [-.9, 1.3, -1.6], cue: [-.3, .08, -2.7], bc: [0, 0, 0], r1: .5 },     // ミツバチ：足もとの花（紫外の模様）
    { pos: [1.5, 2.65, -1.5], cue: [2.75, 1.35, -2.6], bc: [0, 0, 0], r1: .6 },    // コウモリ：燈籠からの反響
    { pos: [3.1, 0, 1.5], cue: [1.3, .03, .1], bc: [0, 1.12, 0], r1: .6 },         // 機械：石畳を撮る
  ];
  const mat = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: o.rough ?? .7, metalness: o.metal ?? 0, transparent: !!o.transparent, opacity: o.opacity ?? 1 });
  let person = null;
  // ミツバチの手がかり：足もとの小さな花（人には一色、紫外では模様＝点の輪）
  {
    const fl = new THREE.Group(); fl.position.set(...DEF[1].cue); g.add(fl);
    const pet = mat(0xe8e2c8, { rough: .6 }), ctr = mat(0xe0b040, { rough: .5 });
    for (const [dx, dz, s] of [[0, 0, 1], [.32, .22, .8], [-.26, .3, .7], [.1, -.32, .75]]) {
      const f = new THREE.Group(); f.position.set(dx, 0, dz); f.scale.setScalar(s); fl.add(f);
      for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 6), pet); p.scale.set(1, .25, .55); const a = k / 6 * Math.PI * 2; p.position.set(Math.cos(a) * .08, .02, Math.sin(a) * .08); p.rotation.y = -a; f.add(p); }
      const cc = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), ctr); cc.position.y = .03; f.add(cc);
    }
  }
  const subj = SUBJ.map((s, i) => {
    const D = DEF[i], [x, y, z] = D.pos, grp = new THREE.Group(); grp.position.set(x, y, z); g.add(grp);
    const cue = new THREE.Vector3(...D.cue), toC = new THREE.Vector3(cue.x - x, 0, cue.z - z).normalize(), yaw = Math.atan2(toC.x, toC.z);
    let eye = new THREE.Vector3(x, y, z), body = null, deco = null;
    if (s.key === 'hito') {
      person = makePerson(); person.scale.setScalar(1.12); person.rotation.y = yaw; grp.add(person);
      eye = new THREE.Vector3(x, 1.78, z);
      const fan = [], d = eye.distanceTo(cue); for (let k = -3; k <= 3; k++) { const a = yaw + k * .1; fan.push(0, 1.78, 0, Math.sin(a) * d * .9, cue.y - .2 + Math.abs(k) * .12, Math.cos(a) * d * .9); }
      deco = new THREE.LineSegments(geo(fan), lineMaterial(s.c, 0)); grp.add(deco);
    } else if (s.key === 'hachi') {
      body = makeBee(); body.scale.setScalar(1.05); body.rotation.y = yaw; grp.add(body);
    } else if (s.key === 'komori') {
      const wrap = new THREE.Group(); body = makeBat(); body.scale.setScalar(1.2); wrap.add(body); wrap.rotation.y = yaw; grp.add(wrap);
    } else {
      const metal = mat(0x3a4148, { rough: .45, metal: .6 }), dark = mat(0x15191d, { rough: .3, metal: .4 }), glass = mat(0x0b1a24, { rough: .08, metal: .2 });
      const cam3 = new THREE.Group(); cam3.position.y = 1.15; cam3.scale.setScalar(1.5); cam3.rotation.y = yaw; grp.add(cam3);
      cam3.add(new THREE.Mesh(new THREE.BoxGeometry(.42, .28, .24), metal));
      const top = new THREE.Mesh(new THREE.BoxGeometry(.16, .06, .14), dark); top.position.set(-.08, .17, 0); cam3.add(top);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(.095, .1, .24, 24), dark); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0, .23); cam3.add(lens);
      const lg = new THREE.Mesh(new THREE.CircleGeometry(.08, 24), glass); lg.position.set(0, 0, .352); cam3.add(lg);
      const led = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a4a })); led.position.set(.16, .09, .121); cam3.add(led);
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + .4, leg = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, 1.22, 8), dark); leg.position.set(Math.cos(a) * .2, .55, Math.sin(a) * .2); leg.rotation.set(Math.sin(a) * .34, 0, -Math.cos(a) * .34); grp.add(leg); }
      eye = new THREE.Vector3(x, 1.15, z).addScaledVector(toC, .35);
      const c0 = new THREE.Vector3(0, 1.15, 0).addScaledVector(toC, .35), aim = cue.clone().sub(grp.position), side = new THREE.Vector3(toC.z, 0, -toC.x);
      const fr = []; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = aim.clone().addScaledVector(side, a * .8).addScaledVector(toC, b * .5); fr.push(c0.x, c0.y, c0.z, p.x, p.y, p.z); }
      deco = new THREE.LineSegments(geo(fr), lineMaterial(s.c, 0)); grp.add(deco);
    }
    // 手がかりの印（環境が差し出すもの x_e）：手がかりのまわりの小さな輪
    const cueM = lineMaterial(s.c, 0), cueL = new THREE.LineSegments(ringGeo(.32, 0, 48), cueM); cueL.position.copy(cue); g.add(cueL);
    // 知覚：手がかり → 身体の感覚 へ流れる粒
    const mid = eye.clone().lerp(cue, .5).add(new THREE.Vector3(0, .45, 0));
    const curve = new THREE.QuadraticBezierCurve3(cue.clone(), mid, eye.clone());
    const pathL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), lineMaterial(s.c, 0)); g.add(pathL);
    const NP = mobile ? 14 : 22, PP = new Float32Array(NP * 3), PT = []; for (let k = 0; k < NP; k++) PT.push(k / NP);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(PP, 3));
    const pm = pointMaterial(s.c, s.key === 'hachi' ? .1 : .085, 0), pts = new THREE.Points(pg, pm); pts.frustumCulled = false; g.add(pts);
    let arcs = null;
    if (s.key === 'komori') { arcs = []; for (let k = 0; k < 4; k++) { const ap = []; for (let a = 0; a <= 24; a++) { const th = -.9 + a / 24 * 1.8; ap.push(new THREE.Vector3(Math.sin(th) * .4, Math.cos(th) * .4 - .4, 0)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ap), lineMaterial(s.c, 0)); g.add(l); arcs.push(l); } }
    // Φ：主体と手がかりのあいだの輪（関係のかたち）
    const gate = eye.clone().lerp(cue, .5), dir = cue.clone().sub(eye).normalize();
    const gm = lineMaterial(QM_C, .1), gateL = new THREE.LineSegments(ringGeo(.3, 0, 64), gm);
    gateL.position.copy(gate); gateL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(gateL);
    // q：主体と手がかりのあいだに立つ殻（この主体だけの Qualia。主体から手がかりへ伸びる筒のかたちで、主体ごとに網の目が違う）
    const qC = eye.clone().lerp(cue, .5), qr = eye.distanceTo(cue) / 2 + .25, rc = s.key === 'hachi' ? .5 : s.key === 'hito' ? .85 : .65, dome = new THREE.Group(); dome.position.copy(qC); dome.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); g.add(dome);
    const dl = [], none = () => 0;
    const sec = (f, wob) => { const zz = f * qr, rr = rc * Math.sqrt(Math.max(0, 1 - f * f)); for (let a = 0; a < 48; a++) { const t0 = a / 48 * Math.PI * 2, t1 = (a + 1) / 48 * Math.PI * 2; dl.push(Math.cos(t0) * rr * (1 + wob(t0)), Math.sin(t0) * rr * (1 + wob(t0)), zz, Math.cos(t1) * rr * (1 + wob(t1)), Math.sin(t1) * rr * (1 + wob(t1)), zz); } };
    const mer = (th, n) => { for (let k = 0; k < n; k++) { const f0 = -1 + k / n * 2, f1 = -1 + (k + 1) / n * 2, r0 = rc * Math.sqrt(1 - f0 * f0), r1 = rc * Math.sqrt(1 - f1 * f1); dl.push(Math.cos(th) * r0, Math.sin(th) * r0, f0 * qr, Math.cos(th) * r1, Math.sin(th) * r1, f1 * qr); } };
    if (s.key === 'hito') { for (const f of [-.6, -.2, .2, .6]) sec(f, none); for (let k = 0; k < 6; k++) mer(k / 6 * Math.PI * 2, 14); }
    else if (s.key === 'hachi') { sec(0, none); }
    else if (s.key === 'komori') { for (const f of [-.55, -.15, .25, .65]) sec(f, t => .06 * Math.sin(t * 9 + f * 10)); }
    else { for (const f of [-.7, -.35, 0, .35, .7]) sec(f, none); for (let k = 0; k < 8; k++) mer(k / 8 * Math.PI * 2, 14); }
    const dm = lineMaterial(s.c, 0); dome.add(new THREE.LineSegments(geo(dl), dm));
    let dpm = null;
    if (s.key === 'hachi') { const dp = []; for (let k = 0; k < 16; k++) for (let j = -4; j <= 4; j++) { const th = (k + (j & 1) * .5) / 16 * Math.PI * 2, f = j / 5, rr = rc * Math.sqrt(1 - f * f); dp.push(Math.cos(th) * rr, Math.sin(th) * rr, f * qr); } dpm = pointMaterial(s.c, .07, 0); dome.add(new THREE.Points(geo(dp), dpm)); }
    dome.scale.setScalar(.01);
    // 環世界1.0：身体の感覚の泡（主体の色）。環世界2.0：層の色の点を帯びて広がる泡
    const bc = eye.clone(); if (i === 0 || i === 3) bc.set(x, D.bc[1], z);
    const inM = lineMaterial(s.c, 0), inner = new THREE.LineSegments(SPH, inM); inner.position.copy(bc); inner.scale.setScalar(D.r1); g.add(inner);
    const outM = lineMaterial(QM_C, 0), outer = new THREE.LineSegments(SPH, outM); outer.position.copy(bc); outer.scale.setScalar(D.r1); g.add(outer);
    const nq = [], nc = []; for (let k = 0; k < 60; k++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), L = LAYER5[k % 5]; nq.push(Math.cos(a) * r, u, Math.sin(a) * r); const cc = new THREE.Color(L.c); nc.push(cc.r, cc.g, cc.b); }
    const ng = geo(nq); ng.setAttribute('color', new THREE.Float32BufferAttribute(nc, 3));
    const nM = new THREE.PointsMaterial({ size: .09, map: dotTex(), vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    outer.add(new THREE.Points(ng, nM));
    return { rc, s, grp, body, deco, cue, cueL, cueM, gateL, gm, pathL, curve, NP, PP, PT, pg, pm, arcs, dome, dm, dpm, qr, qC, eye, gate, bc, r1: D.r1, inner, inM, outer, outM, nM, w: 0 };
  });
  const qmRing = new THREE.LineSegments(ringGeo(RE + .55, .03, 160), lineMaterial(QM_C, 0)); g.add(qmRing);

  // ── 碧：場所の中、人のそばに立ち、ミツバチの q を、人が受けとれる層 L に訳す ──
  const A_P = new THREE.Vector3(-1.45, 0, 2.75), A_H = 2.05, A_HAND = new THREE.Vector3(-1.75, 1.25, 2.45);
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
      const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61');
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
  const PANE_P = new THREE.Vector3(-2.45, 1.55, 1.0);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(.95, .66), new THREE.MeshBasicMaterial({ map: paneTex(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  pane.position.copy(PANE_P); pane.lookAt(subj[TO].eye); g.add(pane);
  const NT = mobile ? 26 : 44, TP = new Float32Array(NT * 3), TC = new Float32Array(NT * 3), TT = []; for (let k = 0; k < NT; k++) TT.push(k / NT);
  const qFrom = subj[J].qC.clone();
  const trA = new THREE.QuadraticBezierCurve3(qFrom, new THREE.Vector3(-2.0, 2.4, 1.0), A_HAND), trB = new THREE.QuadraticBezierCurve3(A_HAND, new THREE.Vector3(-2.2, 1.9, 1.9), PANE_P);
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(TP, 3)); tg.setAttribute('color', new THREE.BufferAttribute(TC, 3));
  const tm = new THREE.PointsMaterial({ size: .1, map: dotTex(), vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const trPts = new THREE.Points(tg, tm); trPts.frustumCulled = false; g.add(trPts);
  const cBee = new THREE.Color(SUBJ[J].c), cAoi = new THREE.Color(AOI_C), cTo = new THREE.Color(0xf6e4ff), tmpC = new THREE.Color();

  // ── かさねっこ：場所の中、五つの層の色の小さな群れ。層を運び上げて重ねる ──
  let herd = null;
  setTimeout(async () => {
    try {
      const M = await import('./kit/envAgents/kasane.js?v=20261023m');
      const body = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.body.toString(16).padStart(6, '0')])), hud = Object.fromEntries(LAYER5.map(L => [L.key, '#' + L.c.toString(16).padStart(6, '0')]));
      const away = [[A_P.x, A_P.z, .9], [DEF[0].pos[0], DEF[0].pos[2], .9], [DEF[3].pos[0], DEF[3].pos[2], .8], [LANT_P.x, LANT_P.z, .8], [TREE_P.x, TREE_P.z, 1.1], [DEF[1].cue[0], DEF[1].cue[2], .6]];
      const ok = (x, z) => Math.hypot(x, z) < RE * .8 && away.every(([ax, az, r]) => Math.hypot(x - ax, z - az) > r);
      herd = new M.KasaneHerd({ scene: g, camera: cam, groundAt: (x, z) => hAt(x, z), walkable: ok, body, hud, scale: mobile ? 2.6 : 2.3, mobile, maxDist: 80, max: 12, guideEvery: 1e9, shadow: !mobile });
      herd.addGroup(['sight', 'touch', 'sound', 'nature', 'culture'].map(l => ({ layer: l })), { x: .1, z: 1.2, radius: .9, role: 'watch' });
      herd.addGroup(['nature', 'culture', 'sound', 'touch'].map(l => ({ layer: l })), { x: 1.4, z: -.9, radius: .8 });
      if (!mobile) herd.addGroup(['sight', 'nature', 'culture'].map(l => ({ layer: l })), { x: -1.6, z: -.6, radius: .7 });
      await herd.load(); kick();
    } catch (e) { console.warn('qualia es kasane', e); }
  }, 500);
  const NK = 12, KP = new Float32Array(NK * 3), kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.BufferAttribute(KP, 3));
  const km = new THREE.PointsMaterial({ size: .12, map: dotTex(), vertexColors: false, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const kPts = new THREE.Points(kg, km); kPts.frustumCulled = false; g.add(kPts);
  const kLines = new THREE.LineSegments(geo(new Array(NK * 6).fill(0)), lineMaterial(0xffffff, 0)); kLines.frustumCulled = false; g.add(kLines);

  // ── 札と式（HTML。3D の点に寄せる） ──
  const labs = [...stage.querySelectorAll('[data-at]')];
  const v = new THREE.Vector3(), AT = {};
  function placeLabs(st) {
    const cur = subj[st.sel];
    AT.e = new THREE.Vector3(.9, 0, RE - .25);
    AT.xe = mobile ? new THREE.Vector3(2.9, .1, 3.7) : new THREE.Vector3(3.4, .1, 3.3);
    AT.phi = cur.gate.clone().add(new THREE.Vector3(0, .55, 0));
    AT.q = cur.qC.clone().add(new THREE.Vector3(.35, cur.rc + .25, 0));
    AT.u1 = cur.bc.clone().add(new THREE.Vector3(0, -cur.r1 - .12, 0));
    AT.u2 = subj[TO].bc.clone().add(mobile ? new THREE.Vector3(1.3, 2.9, -.4) : new THREE.Vector3(.3, 1.9, 0));
    AT.qm = mobile ? new THREE.Vector3(.6, 4.95, -2.6) : new THREE.Vector3(0, 4.25, -2.6);
    AT.l5 = mobile ? new THREE.Vector3(3.3, 1.6, -.2) : new THREE.Vector3(4.6, 1.3, -.4);
    AT.aoi = A_P.clone().add(new THREE.Vector3(-.1, 0, .45));
    AT.L = PANE_P.clone().add(new THREE.Vector3(0, .45, 0));
    AT.kasane = mobile ? new THREE.Vector3(1.4, .05, 3.9) : new THREE.Vector3(1.9, .05, 3.0);
    for (let i = 0; i < 4; i++) AT['s' + i] = i === 0 ? new THREE.Vector3(DEF[0].pos[0], -.05, DEF[0].pos[2] + .3) : i === 3 ? new THREE.Vector3(DEF[3].pos[0], 1.75, DEF[3].pos[2]) : subj[i].eye.clone().add(new THREE.Vector3(0, .7, 0));
    labs.forEach(el => {
      const at = el.dataset.at, p = AT[at]; if (!p) return;
      let a = 1;
      if (/^s\d$/.test(at)) a = +at[1] === st.sel && st.ph === 'slot' ? 1 : (+at[1] === TO || +at[1] === J) && st.ph === 'tr' ? 1 : st.ph === 'all' ? .55 : .3;
      else if (at === 'phi') a = st.ph === 'slot' ? Math.max(.32, Math.min(1, cur.w * 1.4)) : .32;
      else if (at === 'q') a = st.ph === 'slot' ? Math.min(1, cur.w * 1.4) * sstep(1.6, 2.4, st.a) : 0;
      else if (at === 'u1') a = st.ph === 'slot' ? Math.min(1, cur.w * 1.4) * (1 - sstep(1.7, 2.3, st.a)) : 0;
      else if (at === 'u2') a = st.ph === 'all' || (st.ph === 'tr' && st.trT > 2.6) ? 1 : .32;
      else if (at === 'qm') a = st.ph === 'all' ? Math.max(.32, sstep(.55, 1, st.stack)) : .32;
      else if (at === 'l5') a = st.ph === 'all' ? sstep(0, .3, st.stack) : 0;
      else if (at === 'L') a = st.ph === 'tr' ? Math.max(.32, st.pane) : .32;
      else if (at === 'aoi') a = st.ph === 'tr' ? 1 : .6;
      else if (at === 'kasane') a = st.ph === 'all' ? .5 + .5 * st.stack : .5;
      else if (at === 'xe') a = st.ph === 'slot' && st.a < 1.6 ? 1 : .32;
      a *= st.out; if (el.classList.contains('qe-eqlab')) a = Math.max(a, .45);   // 式の札は出しっぱなし（一巡の切れ目でも消さない）
      v.copy(p).applyMatrix4(g.matrixWorld).project(cam);
      const hw = (el.offsetWidth || 0) / 2 + 4; let px = (v.x * .5 + .5) * W; if (hw * 2 < W) px = Math.max(hw, Math.min(W - hw, px));   // 画面の左右で切れない
      const hh = (el.offsetHeight || 0) / 2 + 4; let py = (-v.y * .5 + .5) * Hh; if (hh * 2 < Hh) py = Math.max(hh, Math.min(Hh - hh, py));
      todo.push({ el, a, px, py, w: el.offsetWidth || 0, h: el.offsetHeight || 0, eq: el.classList.contains('qe-eqlab') });
    });
    // 濃い札（式は先）から順に置き、重なる札は上下に少しずらす。避けきれない薄い札は出さない（式の札は必ず置く）
    todo.sort((x, y) => (y.eq - x.eq) || (y.a - x.a)); const boxes = [];
    for (const o of todo) {
      let ok = o.a < .02, yy = o.py;
      if (!ok) for (const d of [0, -1, 1, -2, 2, -3, 3]) { yy = o.py + d * (o.h * .6 + 3); o.el.style.transform = 'translate(' + Math.round(o.px) + 'px,' + Math.round(yy) + 'px)';
        const r = o.el.getBoundingClientRect(), bx = [r.left - 2, r.top - 2, r.right + 2, r.bottom + 2]; if (!boxes.some(c => bx[0] < c[2] && bx[2] > c[0] && bx[1] < c[3] && bx[3] > c[1])) { boxes.push(bx); ok = true; break; } }
      const a = ok ? o.a : 0; o.el.style.opacity = a.toFixed(2); o.el.classList.toggle('on', a > .9);
      if (o.a < .02) o.el.style.transform = 'translate(' + Math.round(o.px) + 'px,' + Math.round(o.py) + 'px)';
    }
    todo.length = 0;
    // 矢印（2026-10-24 TOP8）：図だけで流れが読めるように、点と点を細い矢印で結ぶ
    if (arws.length) {
      const sp = k => { const p = k === 'qJ' ? subj[J].qC : k === 'sTO' ? subj[TO].eye : AT[k]; if (!p) return null; v.copy(p).applyMatrix4(g.matrixWorld).project(cam); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * Hh]; };
      const tr = st.ph === 'tr', sl = st.ph === 'slot', al = st.ph === 'all', cw = Math.min(1, cur.w * 1.4);
      const A = { 'xe-phi': ['xe', 'phi', sl ? cw * (1 - sstep(1.8, 2.4, st.a)) : 0], 'phi-q': ['phi', 'q', sl ? cw * sstep(1.4, 2.2, st.a) : 0], 'q-aoi': ['qJ', 'aoi', tr ? 1 - sstep(2.4, 3.2, st.trT) : 0], 'aoi-L': ['aoi', 'L', tr ? sstep(.6, 1.4, st.trT) : 0], 'L-s': ['L', 'sTO', tr ? sstep(1.6, 2.4, st.trT) : 0], 'u1-u2': ['u1', 'u2', tr ? sstep(2.6, 3.4, st.trT) : 0], 'l5-qm': ['l5', 'qm', al ? sstep(.4, .9, st.stack) : 0] };
      arwSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
      for (const el of arws) { const d = A[el.dataset.arw], a0 = d && sp(d[0]), b0 = d && sp(d[1]); const op = d && a0 && b0 ? d[2] * st.out : 0; el.style.opacity = op.toFixed(2); if (op < .02) continue;
        const dx = b0[0] - a0[0], dy = b0[1] - a0[1], L = Math.hypot(dx, dy) || 1, cut = Math.min(26, L * .2), ux = dx / L, uy = dy / L;
        const x1 = a0[0] + ux * cut, y1 = a0[1] + uy * cut, x2 = b0[0] - ux * cut, y2 = b0[1] - uy * cut, bend = Math.min(40, L * .18);
        el.setAttribute('d', 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Q' + ((x1 + x2) / 2 - uy * bend).toFixed(1) + ' ' + ((y1 + y2) / 2 + ux * bend).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1)); }
    }
  }
  const todo = [], arwSvg = stage.querySelector('.qe-arrows'), arws = arwSvg ? [...arwSvg.querySelectorAll('[data-arw]')] : [];

  // ── 主体は順にめぐる（選ぶボタンは置かない） ──
  const lines = [...fig.querySelectorAll('[data-subj-line]')], phLines = [...fig.querySelectorAll('[data-phase-line]')];
  let sel = 0, curPh = '', tc = reduce ? T_ALL + 5.2 : 0;
  function showSel(i, ph) {
    if (i === sel && ph === curPh) return; sel = i; curPh = ph;
    lines.forEach((l, k) => l.classList.toggle('on', ph === 'slot' && k === i));
    phLines.forEach(l => l.classList.toggle('on', l.dataset.phaseLine === ph));
  }

  let W = 0, Hh = 0;
  const size = () => {
    W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); cam.userData.d = Math.max((mobile ? 5.4 : 6.3) / (t * cam.aspect), (mobile ? 4.4 : 4.3) / t);
    cam.updateProjectionMatrix();
  };
  new ResizeObserver(() => { size(); render(performance.now(), true); }).observe(cv); size();

  let vis = true, raf = 0, last = performance.now(); const t0 = last;
  const tmpV = new THREE.Vector3(), st = { sel: 0, ph: 'slot', a: 0, lift: 0, pane: 0, out: 1, stack: 0, trT: 0 };
  window.__qpESready = false;
  function render(now, still) {
    const dt = still ? 0 : Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; const t = (now - t0) / 1000;
    if (!reduce && !still) tc = (tc + dt) % CYCLE;
    const ph = tc < T_TR ? 'slot' : tc < T_ALL ? 'tr' : 'all';
    const slot = ph === 'slot' ? Math.min(3, Math.floor(tc / SLOT)) : ph === 'tr' ? J : sel, a = tc - slot * SLOT;
    const allA = sstep(T_ALL, T_ALL + 1.2, tc) * (1 - sstep(CYCLE - OUT, CYCLE - .2, tc));
    const out = 1 - sstep(CYCLE - OUT, CYCLE - .1, tc), trT = tc - T_TR;
    const stack = ph === 'all' ? Math.min(1, (tc - T_ALL) / 3.6) : 0;   // 五つの層が一枚ずつ重なる（0→1）
    showSel(slot, ph);
    const d = cam.userData.d || 22;
    cam.position.set(0, 1.0 + d * .55, d * .84); cam.lookAt(0, 1.0, .2);
    model.rotation.y = reduce ? .4 : t * .22;
    // 電脳の地：走査の輪とデータの粒
    { const sp = reduce ? .5 : (t * .16) % 1; scan.scale.setScalar(.3 + sp * RE * 1.7); scan.material.opacity = .42 * (1 - sp) * out; if (!reduce && !still) dust.userData.update(dt); }
    // 欅を測る：幹から梢へ上る走査の輪
    { const f = reduce ? .5 : (t * .18) % 1; treeScan.position.y = f * TREE_H; treeScan.scale.setScalar(treeR * (.35 + .75 * Math.sin(Math.PI * Math.min(1, f * 1.15)))); treeScan.material.opacity = .5 * Math.sin(Math.PI * f) * out; }
    tag.quaternion.copy(cam.quaternion);
    lantern.userData.flicker(reduce ? 0 : t);
    // 五つの層
    layers.update(t, reduce || still ? 0 : dt, k => {
      const base = ph === 'all' ? sstep(k * .2, k * .2 + .22, stack) : 0;
      return (.07 + .93 * base) * out;
    });
    let lift = 0;
    subj.forEach((u, i) => {
      const cur = ph === 'slot' && i === slot, done = ph !== 'slot' || i < slot;
      const reach = cur ? sstep(0, 1.6, a) : 0, gl = cur ? bump(.9, 1.6, 2.6, 3.4, a) : 0;
      const rise = cur ? sstep(1.8, 3.8, a) : done ? 1 : 0;
      if (cur) lift = bump(1.5, 2.2, 3.4, 4.2, a);
      u.w += ((cur ? 1 : 0) - u.w) * (reduce ? 1 : Math.min(1, dt * 3));
      const isJ = ph === 'tr' && i === J, jb = isJ ? bump(0, .8, 3.6, 4.6, trT) : 0;
      const flash = cur ? bump(1.8, 2.6, 3.2, 4.4, a) : 0;
      u.dm.opacity = (cur ? .45 + .55 * rise + .35 * flash : done ? (ph === 'tr' ? (isJ ? .3 + .5 * jb : .1) : .16 + .3 * allA) : 0) * out; if (u.dpm) u.dpm.opacity = u.dm.opacity * 1.1;
      u.dome.scale.setScalar(Math.max(.01, rise * (1 + (allA && !reduce ? .02 * Math.sin(t * 2 + i) : 0))));
      u.gm.opacity = (.1 + .8 * gl) * out; u.gateL.scale.setScalar(1 + .3 * gl);
      u.cueM.opacity = (cur ? .25 + .7 * bump(0, .5, 2.4, 3.4, a) : .12) * out; u.cueL.scale.setScalar(1 + (cur && !reduce ? .25 * Math.sin(t * 4) : 0));
      u.pathL.material.opacity = (.06 + .5 * reach * (1 - .5 * sstep(3.4, 4.6, a))) * out;
      if (u.deco) u.deco.material.opacity = (.08 + .55 * reach + (ph === 'tr' && i === TO ? .3 * sstep(2.6, 3.6, trT) : 0)) * out;
      const flow = cur ? reach : 0;
      for (let k = 0; k < u.NP; k++) { if (!reduce) u.PT[k] = (u.PT[k] + dt * .32) % 1; const f = u.PT[k] * Math.max(.02, flow); u.curve.getPoint(f, tmpV); u.PP[3 * k] = tmpV.x; u.PP[3 * k + 1] = tmpV.y; u.PP[3 * k + 2] = tmpV.z; }
      u.pg.attributes.position.needsUpdate = true; u.pm.opacity = .95 * flow * out;
      if (u.arcs) u.arcs.forEach((l, k) => { const f = ((t * .45 + k / u.arcs.length) % 1) * flow; u.curve.getPoint(f, tmpV); l.position.copy(tmpV); l.lookAt(u.eye); l.scale.setScalar(.6 + f * 1.4); l.material.opacity = .8 * flow * (1 - f) * out; });
      // 泡：1.0（身体の感覚）→ 2.0（層の中で広がる）
      const g2 = ph === 'all' ? sstep(.15, .95, stack) : (ph === 'tr' && i === TO ? .5 * sstep(2.6, 4.4, trT) : 0);
      u.inM.opacity = (cur ? .3 + .4 * (1 - sstep(1.8, 3.8, a)) : ph === 'all' ? .22 : .12) * out;
      u.outer.scale.setScalar(u.r1 * (1 + .85 * g2)); u.outM.opacity = .18 * g2 * out; u.nM.opacity = .95 * g2 * out;
      u.outer.rotation.y = reduce ? 0 : t * .12;
      if (u.body && !reduce && !still) { if (u.s.key === 'hachi') { u.body.position.set(Math.sin(t * .7) * .2, Math.sin(t * 1.1) * .1, Math.cos(t * .5) * .15); } u.body.userData.animate(t); }
    });
    qmRing.material.opacity = .55 * allA * sstep(.55, 1, stack);
    // 訳：ミツバチの殻 → 碧の手 → 層 L
    const trOn = ph === 'tr' ? bump(.2, .9, 4.4, 5.2, trT) : 0, paneA = ph === 'tr' ? sstep(2.4, 3.4, trT) : ph === 'all' ? .5 * (1 - sstep(CYCLE - OUT, CYCLE - .1, tc)) : 0;
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
    // かさねっこが層の光を運び上げる（主体の q のときは主体の色、層が重なるときは五つの層の高さへ）
    if (herd && herd.ready !== false && herd.agents.length) {
      const col = new THREE.Color(ph === 'all' ? QM_C : SUBJ[slot].c), lp = kLines.geometry.attributes.position.array, up = ph === 'all' ? stack : lift;
      for (let k = 0; k < NK; k++) {
        const ag = herd.agents[k]; if (!ag) { KP[3 * k + 1] = -99; continue; }
        ag.center(tmpV); const top = tmpV.y + .32, f = reduce ? .5 : ((t * .55 + k / NK) % 1), y = top + (LY[k % 5] + .3) * f;
        KP[3 * k] = tmpV.x; KP[3 * k + 1] = y; KP[3 * k + 2] = tmpV.z;
        lp.set([tmpV.x, top, tmpV.z, tmpV.x, y, tmpV.z], k * 6);
      }
      kg.attributes.position.needsUpdate = true; kLines.geometry.attributes.position.needsUpdate = true;
      km.color.copy(col); kLines.material.color.copy(col);
      km.opacity = .9 * up * out; kLines.material.opacity = .35 * up * out;
    }
    // 碧：主体が受けとるあいだは見守り、訳すときにミツバチの q へ手をかざして人の前へ渡す
    if (mot) {
      if (!reduce && ph === 'tr' && trT > .4 && trT < .5 + dt) { mot.point(qFrom, 2.2); mot.express('warm', .4, 4); }
      if (!reduce && ph === 'tr' && trT > 2.6 && trT < 2.7 + dt) mot.point(PANE_P, 2.2);
      if (ph === 'tr') mot.lookAt(trT < 2.4 ? qFrom : PANE_P); else if (ph === 'slot') mot.lookAt(subj[slot].gate); else mot.lookAt(null);
      mot.update(still ? 0 : dt, cam, { vrmUpdate: false }); stand(); vrm.update(still ? 0 : dt); mot.afterVrmUpdate(still ? 0 : dt);
      if (aoiPivot && !aoiPivot.visible && ++aoiFrames > 3) { aoiPivot.visible = true; window.__qpESready = true; }
    }
    if (person && !reduce && !still) person.userData.animate(t, (ph === 'tr' && trT > 2.6) || ph === 'all');
    if (herd) herd.update(still ? 0 : dt, { active: true });
    g.updateMatrixWorld(true);
    R.render(S, cam);
    st.sel = slot; st.ph = ph; st.a = a; st.lift = lift; st.pane = paneA; st.out = out; st.stack = stack; st.trT = trT; placeLabs(st);
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis) loadAoi(); kick(); }, { rootMargin: '200px 0px' }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('hp-lang-change', () => setTimeout(() => render(performance.now(), true), 30));
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fig.classList.remove('has-3d'); });
  fig.classList.add('has-3d');
  showSel(0, 'slot');
  window.__qpES = { get sel() { return sel; }, get ph() { return curPh; }, get vis() { return vis; }, get tc() { return +tc.toFixed(2); }, set tc(x) { tc = x; }, CYCLE, T_TR, T_ALL };
  kick();

  // 五つの層（場所に積み重なる情報の層）。sight／sound／touch／nature／culture を、層ごとの表現で
  function makeLayers() {
    const items = [];
    LAYER5.forEach((L, k) => {
      const grp = new THREE.Group(); grp.position.set(0, LY[k], 0); g.add(grp);
      const mats = [], upd = [], add = (o, mo) => { grp.add(o); mats.push([o.material, mo * .55]); return o; };
      add(new THREE.LineSegments(ringGeo(RL, 0, 160), lineMaterial(L.c, 0)), .55);   // 層の縁
      const tk = []; for (let j = 0; j < 4; j++) { const a = j / 4 * Math.PI * 2 + .3 + k * .25; tk.push(Math.cos(a) * RL, 0, Math.sin(a) * RL, Math.cos(a) * (RL + .3), 0, Math.sin(a) * (RL + .3)); }
      add(new THREE.LineSegments(geo(tk), lineMaterial(L.c, 0)), .7);
      if (L.key === 'sight') {   // 複眼の六角と、紫外で浮かぶ花の模様
        const p = [], h = .36, hw = h * Math.sqrt(3) / 2, rr = .17;
        for (let r = -14; r <= 14; r++) for (let c = -14; c <= 14; c++) { const x = c * hw * 2 + (r & 1) * hw, z = r * h * 1.5; if (Math.hypot(x, z) > RL * .9) continue; if (((r * 7 + c * 13) & 3) !== 0) continue; for (let e = 0; e < 6; e++) { const a0 = e / 6 * Math.PI * 2 + Math.PI / 6, a1 = (e + 1) / 6 * Math.PI * 2 + Math.PI / 6; p.push(x + Math.cos(a0) * rr, 0, z + Math.sin(a0) * rr, x + Math.cos(a1) * rr, 0, z + Math.sin(a1) * rr); } }
        add(new THREE.LineSegments(geo(p), lineMaterial(L.c, 0)), .5);
        const f = []; for (const [cx, cz, s] of [[-.3, -2.7, .5], [1.6, 2.1, .4], [2.6, -.5, .35]]) for (let pp = 0; pp < 8; pp++) for (let j = 1; j <= 4; j++) { const a = pp / 8 * Math.PI * 2; f.push(cx + Math.cos(a) * s * j / 4, 0, cz + Math.sin(a) * s * j / 4); }
        add(new THREE.Points(geo(f), pointMaterial(0xe6d4ff, .08, 0)), .9);
      } else if (L.key === 'sound') {   // 音の輪（広がる）と波
        const rings = []; for (let j = 0; j < 5; j++) rings.push(add(new THREE.LineSegments(ringGeo(1, 0, 96), lineMaterial(L.c, 0)), .6));
        const NW = 90, wp = new Float32Array(NW * 3), wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(wp, 3));
        const wave = add(new THREE.Line(wg, lineMaterial(L.c, 0)), .8); wave.frustumCulled = false;
        upd.push((t, A) => {
          rings.forEach((r, j) => { const f = (t * .22 + j / 5) % 1; r.scale.setScalar(.3 + f * (RL - .3)); r.position.set(-1.2, 0, .6); r.material.opacity = .6 * (1 - f) * A; });
          for (let q = 0; q < NW; q++) { const x = -RL * .85 + q / (NW - 1) * RL * 1.7; wp[3 * q] = x; wp[3 * q + 1] = .12 * Math.sin(x * 5 - t * 3.2) * Math.exp(-(x * x) / 8); wp[3 * q + 2] = -1.4 + .25 * Math.sin(x * .7); }
          wg.attributes.position.needsUpdate = true;
        });
      } else if (L.key === 'touch') {   // 石畳の凹凸の線と、振動の筋
        const p = []; for (let z = -RL * .8; z <= RL * .8; z += .42) { let px = null; for (let x = -RL; x <= RL; x += .12) { if (Math.hypot(x, z) > RL * .92) { px = null; continue; } const y = .05 * Math.sin(x * 7.3 + z * 3.1) * Math.sin(x * 2.1 - z * 5.7) + .03 * Math.sin(x * 13 + z); if (px) p.push(px[0], px[1], px[2], x, y, z); px = [x, y, z]; } }
        add(new THREE.LineSegments(geo(p), lineMaterial(L.c, 0)), .4);
        const vib = []; for (const [cx, cz] of [[1.3, .1], [-1.6, 1.0], [.4, -2.0], [2.4, 1.6]]) { const vp = []; for (let j = 0; j < 5; j++) vp.push(cx - .4, 0, cz + j * .07, cx + .4, 0, cz + j * .07); vib.push(add(new THREE.LineSegments(geo(vp), lineMaterial(L.c, 0)), .85)); }
        upd.push(t => vib.forEach((o, j) => { o.position.y = .035 * Math.sin(t * 38 + j * 2); o.position.x = .02 * Math.sin(t * 31 + j); }));
      } else if (L.key === 'nature') {   // 等高線・水の輪・葉
        const hN = (x, z) => Math.sin(x * .9 + 1) * Math.cos(z * .8) * .5 + .3 * Math.exp(-((x + 1) ** 2 + (z + 2.4) ** 2));
        const c = clip(contours(hN, { x0: -RL, x1: RL, z0: -RL, z1: RL, cell: .22, step: .16, lift: 0, color: L.c, opacity: 0 }), RL * .92);
        c.geometry.attributes.position.array.forEach((_, q, arr) => { if (q % 3 === 1) arr[q] = 0; });
        add(c, .45);
        const water = []; for (let j = 0; j < 3; j++) water.push(add(new THREE.LineSegments(ringGeo(1, 0, 64), lineMaterial(0x78d6ec, 0)), .7));
        const lv = []; for (let q = 0; q < 70; q++) { const a = Math.random() * Math.PI * 2, r = Math.random() * 1.3; lv.push(Math.max(-RL * .8, TREE_P.x + Math.cos(a) * r), 0, TREE_P.z + Math.sin(a) * r * .8); }
        add(new THREE.Points(geo(lv), pointMaterial(L.c, .09, 0)), .9);
        upd.push((t, A) => water.forEach((r, j) => { const f = (t * .3 + j / 3) % 1; r.scale.set(.2 + f * .9, 1, .14 + f * .6); r.position.set(2.0, 0, 2.7); r.material.opacity = .7 * (1 - f) * A; }));
      } else {   // culture：古い道（破線）・札・祭りの灯
        const road = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-RL * .85, 0, 1.9), new THREE.Vector3(.2, 0, -1.2), new THREE.Vector3(RL * .8, 0, -1.6)), rp = [];
        for (let q = 0; q < 40; q += 2) { const a = road.getPoint(q / 40), b = road.getPoint((q + 1) / 40); rp.push(a.x, 0, a.z, b.x, 0, b.z); }
        add(new THREE.LineSegments(geo(rp), lineMaterial(L.c, 0)), .8);
        const tt = cultureTagTex();
        for (const [x, z] of [[-2.2, -1.6], [.9, -2.8], [3.0, .9]]) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(.16, .42), new THREE.MeshBasicMaterial({ map: tt, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })), .9); m.position.set(x, .21, z); m.userData.bill = 1; }
        const lp = []; for (let q = 0; q < 11; q++) { const p = road.getPoint(.1 + q * .08); lp.push(p.x, .12, p.z + .25); }
        const lm = add(new THREE.Points(geo(lp), pointMaterial(0xffc98a, .13, 0)), .95);
        upd.push((t, A) => { lm.material.opacity = (.75 + .25 * Math.sin(t * 7.3) * Math.sin(t * 3.1)) * .95 * A; grp.children.forEach(o => { if (o.userData.bill) o.quaternion.copy(cam.quaternion); }); });
      }
      items.push({ grp, mats, upd });
    });
    return {
      update(t, dt, alphaOf) {
        items.forEach((it, k) => { const A = alphaOf(k); it.mats.forEach(([m, mo]) => { m.opacity = mo * A; }); it.upd.forEach(f => f(t, A)); });
      },
    };
  }
}

// 球の網（緯線と経線）：泡に使う
function sphereLines(nLat, nLon) {
  const p = [], N = 48;
  for (let i = 1; i < nLat; i++) { const ph = -Math.PI / 2 + i / nLat * Math.PI, r = Math.cos(ph), y = Math.sin(ph); for (let k = 0; k < N; k++) { const a = k / N * Math.PI * 2, b = (k + 1) / N * Math.PI * 2; p.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } }
  for (let j = 0; j < nLon; j++) { const a = j / nLon * Math.PI * 2; for (let k = 0; k < N / 2; k++) { const p0 = -Math.PI / 2 + k / (N / 2) * Math.PI, p1 = -Math.PI / 2 + (k + 1) / (N / 2) * Math.PI; p.push(Math.cos(a) * Math.cos(p0), Math.sin(p0), Math.sin(a) * Math.cos(p0), Math.cos(a) * Math.cos(p1), Math.sin(p1), Math.sin(a) * Math.cos(p1)); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g;
}
// 石燈籠（写実の物）：石の質感で、基礎・竿・中台・火袋・笠・宝珠。火袋の窓に灯
function makeLantern(tl, mobile) {
  const L = new THREE.Group();
  const tx = tl.load('x/02/tex/rock_surface.webp'); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  const st = new THREE.MeshStandardMaterial({ map: tx, color: 0xa59f93, roughness: .95 });
  if (!mobile) { const n = tl.load('x/02/tex/rock_surface_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; st.normalMap = n; st.normalScale = new THREE.Vector2(.8, .8); }
  const add = (gm, y) => { const m = new THREE.Mesh(gm, st); m.position.y = y; L.add(m); return m; };
  add(new THREE.CylinderGeometry(.36, .42, .14, 6), .07);
  add(new THREE.CylinderGeometry(.24, .3, .1, 6), .19);
  add(new THREE.CylinderGeometry(.1, .13, .66, 14), .57);
  add(new THREE.CylinderGeometry(.32, .2, .14, 6), .97);
  add(new THREE.CylinderGeometry(.21, .21, .32, 6), 1.2);
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd49a, transparent: true, opacity: .85, toneMapped: false });
  for (let k = 0; k < 2; k++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.15, .17), glow); const a = k * Math.PI + Math.PI / 6; w.position.set(Math.sin(a) * .185, 1.2, Math.cos(a) * .185); w.rotation.y = a; L.add(w); }
  add(new THREE.ConeGeometry(.5, .26, 6), 1.49);
  add(new THREE.CylinderGeometry(.07, .09, .06, 10), 1.64);
  add(new THREE.SphereGeometry(.075, 14, 10), 1.73);
  L.userData.flicker = t => { glow.opacity = .7 + .15 * Math.sin(t * 9.1) * Math.sin(t * 4.3); };
  return L;
}
// 記録の札（HUD）：燈籠の上に浮かぶ。言語によらない記号と線だけ（数値の事実は書かない）
function tagTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = 'rgba(4,18,28,.72)'; x.fillRect(0, 0, 256, 128);
  x.strokeStyle = 'rgba(143,230,240,.9)'; x.lineWidth = 2; x.strokeRect(2, 2, 252, 124);
  x.fillStyle = 'rgba(143,230,240,.95)'; x.fillRect(2, 2, 10, 124);
  x.font = 'italic 600 40px Georgia, serif'; x.fillStyle = '#dff8fb'; x.fillText('R', 26, 50); x.font = 'italic 400 24px Georgia, serif'; x.fillText('e', 52, 58);
  x.fillStyle = 'rgba(143,230,240,.6)'; for (let k = 0; k < 4; k++) x.fillRect(90, 22 + k * 12, 60 + ((k * 37) % 90), 5);
  x.fillStyle = 'rgba(180,162,255,.9)'; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(32 + k * 22, 96, 6, 0, 6.28); x.fill(); }
  x.strokeStyle = 'rgba(143,230,240,.5)'; x.lineWidth = 1; for (let k = 0; k < 18; k++) { x.beginPath(); x.moveTo(110 + k * 7, 110); x.lineTo(110 + k * 7, 110 - (8 + (k * 53) % 26)); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// culture の札（短冊のかたちの線だけ）
function cultureTagTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 168; const x = c.getContext('2d');
  x.fillStyle = 'rgba(231,149,146,.18)'; x.fillRect(4, 10, 56, 154);
  x.strokeStyle = 'rgba(231,149,146,.95)'; x.lineWidth = 3; x.strokeRect(4, 10, 56, 154);
  x.beginPath(); x.moveTo(32, 0); x.lineTo(32, 10); x.stroke();
  x.lineWidth = 2; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(32, 30 + k * 26); x.lineTo(32, 46 + k * 26); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
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
