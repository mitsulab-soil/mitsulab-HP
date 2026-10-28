/* © mitsulab. 環世界 1.0・2.0 の概念図（2026-10-28 本人「概念が分かるように、3D グラフィックを」）
   同じ一区画を、模型のような断面で見せる（石畳・土の断面・欅と根・鳥居・鳥・花）。主体（人）はその中に立つ。
   1.0：人の目・耳・足から、届く手がかり（木の幹・鳥の声・足もとの石畳・花の色）にだけ細い線が伸びる。
        届かないもの（土の中の根と菌糸・花の紫外線の模様・昔の参道の跡・高すぎて聞こえない音）は、そこにあっても淡いまま。
   2.0：同じ舞台の上に、GIS の層のような平らで透けた情報の層（地形・歴史・生き物・音）を重ねる。
        1.0 で淡かったものが、層を通して人とつながる。
   質感：石畳＝ambientCG PavingStones133（CC0）、欅＝CC0 の模型と葉、人＝Quaternius（CC0）。AI 画像は使わない。形と位置は模式。 */
import * as THREE from 'three';

const mobile = Math.min(innerWidth, innerHeight) < 700;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let LOADERS = null;
const gltf = url => (LOADERS || (LOADERS = Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]))).then(([{ GLTFLoader }, { MeshoptDecoder }]) => { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); return l.loadAsync(url); });
const canvasTex = (draw, w = 512, h = 512, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

export async function bootDiorama(fig, kind, labs) {
  const two = kind === 2;
  const cv = fig.querySelector('canvas');
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.setClearColor(0, 0);
  const S = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(26, 1, .1, 200);
  S.add(new THREE.HemisphereLight(0xeef4f8, 0x40382c, 1.7));
  { const d = new THREE.DirectionalLight(0xfff0d8, 2.5); d.position.set(-5, 9, 6); S.add(d); const r = new THREE.DirectionalLight(0xbfdcff, .7); r.position.set(6, 3, -5); S.add(r); }
  const W = 6, D = 4, SOIL = 1.4;    // 区画の幅・奥行き・土の深さ
  const stage = new THREE.Group(); S.add(stage);
  const FAINT = (m, on) => { m.transparent = true; m.opacity = on ? 1 : .42; m.depthWrite = on; return m; };

  // 石畳の上面
  const TL = new THREE.TextureLoader();
  const pc = TL.load('img/hero/3d/ql_paving_c.webp'); pc.colorSpace = THREE.SRGBColorSpace; pc.wrapS = pc.wrapT = THREE.RepeatWrapping; pc.repeat.set(3, 2); pc.anisotropy = 8;
  const pn = TL.load('img/hero/3d/ql_paving_n.webp'); pn.wrapS = pn.wrapT = THREE.RepeatWrapping; pn.repeat.set(3, 2);
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, .08, D), new THREE.MeshStandardMaterial({ map: pc, normalMap: pn, roughness: .9, color: 0xd6cebf })); top.position.y = -.04; stage.add(top);
  // 土の断面（層位の帯：表土・心土）
  const soilTex = canvasTex((x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4a3826'); g.addColorStop(.35, '#5e4630'); g.addColorStop(.36, '#7a6040'); g.addColorStop(1, '#8a7050'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = Math.random(); x.fillStyle = v < .5 ? 'rgba(30,20,10,.35)' : 'rgba(200,180,140,.18)'; const r = Math.random() * 2.4; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, r, 0, 6.283); x.fill(); } }, 1024, 256);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(W, SOIL, D), [0, 1, 2, 3, 4, 5].map(i => new THREE.MeshStandardMaterial({ map: i === 2 || i === 3 ? null : soilTex, color: i === 2 || i === 3 ? 0x3c2e20 : 0xffffff, roughness: 1 })));
  soil.position.y = -.08 - SOIL / 2; stage.add(soil);

  // 主体：人（区画の中に立つ）
  const P = new THREE.Vector3(-.9, 0, .7), EYE = new THREE.Vector3(-.9, 1.58, .74), EAR = new THREE.Vector3(-.98, 1.52, .7), FOOT = new THREE.Vector3(-.9, .04, .8);
  // 届くもの・届かないもの の位置
  const TREE = new THREE.Vector3(1.6, 0, -.9), TRUNK = new THREE.Vector3(1.6, 1.1, -.9), BIRD = new THREE.Vector3(1.2, 3.1, -.6), FLOWER = new THREE.Vector3(.2, .42, 1.1);
  const ROOTS = new THREE.Vector3(1.6, -.6, -.9), OLD = new THREE.Vector3(-1.4, -.32, 1.95), BAT = new THREE.Vector3(-2.3, 1.7, 1.3), TORII = new THREE.Vector3(-2.1, 0, -1.4);
  const reached = new THREE.Group(), hidden = new THREE.Group(); stage.add(reached, hidden);

  // 花：色（届く）と、紫外線の模様（届かない＝花の上に淡い的として）
  { const f = new THREE.Group(); f.position.copy(FLOWER).setY(0); stage.add(f);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, .42, 8), new THREE.MeshStandardMaterial({ color: 0x5b7f44 })); st.position.y = .21; f.add(st);
    const pm = new THREE.MeshStandardMaterial({ color: 0xf2c11c, roughness: .55, side: THREE.DoubleSide });
    for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 6), pm); p.scale.set(1, .18, .38); const a = i / 12 * 6.283; p.position.set(Math.cos(a) * .065, .43, Math.sin(a) * .065); p.rotation.y = -a; f.add(p); }
    const uv = new THREE.Mesh(new THREE.RingGeometry(.03, .14, 32), FAINT(new THREE.MeshBasicMaterial({ color: 0x7a5cff, side: THREE.DoubleSide }), two)); uv.rotation.x = -Math.PI / 2; uv.position.y = .46; f.add(uv); f.userData.uv = uv; }
  // 鳥居（区画の奥）
  { const m = new THREE.MeshStandardMaterial({ color: 0x9a3f2a, roughness: .7 }); const g = new THREE.Group(); g.position.copy(TORII); stage.add(g);
    for (const x of [-.55, .55]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.05, .055, 1.5, 12), m); c.position.set(x, .75, 0); g.add(c); }
    const k = new THREE.Mesh(new THREE.BoxGeometry(1.6, .08, .1), m); k.position.y = 1.52; g.add(k); const n = new THREE.Mesh(new THREE.BoxGeometry(1.3, .06, .08), m); n.position.y = 1.25; g.add(n); }
  // 昔の参道の跡（土の中・届かない）：破線の帯
  const oldPath = new THREE.Mesh(new THREE.PlaneGeometry(.5, 3.6), FAINT(new THREE.MeshBasicMaterial({ map: canvasTex((x, w, h) => { x.fillStyle = 'rgba(242,197,110,.0)'; x.fillRect(0, 0, w, h); x.strokeStyle = '#f2c56e'; x.lineWidth = 10; x.setLineDash([40, 30]); x.beginPath(); x.moveTo(20, 0); x.lineTo(20, h); x.moveTo(w - 20, 0); x.lineTo(w - 20, h); x.stroke(); }, 128, 512), transparent: true, side: THREE.DoubleSide }), two));
  oldPath.rotation.z = Math.PI / 2; oldPath.scale.set(.5, .7, 1); oldPath.position.copy(OLD); stage.add(oldPath);
  // 根と菌糸（土の中・届かない）
  { const P2 = []; const rnd = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(7);
    const grow = (p, dir, len, depth) => { if (depth > 4 || p.y < -SOIL + .05) return; const q = p.clone().add(dir.clone().multiplyScalar(len)); q.y = Math.max(q.y, -SOIL + .05); P2.push(p.x, p.y, p.z, q.x, q.y, q.z); for (let k = 0; k < 2; k++) { const nd = dir.clone().add(new THREE.Vector3((rnd() - .5) * 1.2, -rnd() * .5, (rnd() - .5) * 1.2)).normalize(); grow(q, nd, len * .65, depth + 1); } };
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; grow(new THREE.Vector3(TREE.x, -.1, TREE.z), new THREE.Vector3(Math.cos(a), -.6, Math.sin(a)).normalize(), .55, 0); }
    for (let i = 0; i < 120; i++) { const a = rnd() * 6.283, r = .3 + rnd() * 1.4, y = -.15 - rnd() * .9; const x = TREE.x + Math.cos(a) * r, z = TREE.z + Math.sin(a) * r; P2.push(x, y, z, x + (rnd() - .5) * .25, y + (rnd() - .5) * .15, z + (rnd() - .5) * .25); }
    const roots = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)), FAINT(new THREE.LineBasicMaterial({ color: 0xf2e6cc }), two)); stage.add(roots);
    // 断面の手前に見えるよう、土の箱を少し透かす
    soil.material.forEach((m, i) => { m.transparent = true; m.opacity = (i === 4 || i === 0) ? .34 : .9; m.depthWrite = false; }); }
  // 古い参道の礫（断面に見える、昔の道の跡）
  { const m = FAINT(new THREE.MeshStandardMaterial({ color: 0xb8a582, roughness: .9 }), two); for (let i = 0; i < 40; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.035 + Math.random() * .03, 6, 4), m); s.position.set(OLD.x + (Math.random() - .5) * 1.6, OLD.y + (Math.random() - .5) * .1, 1.96); s.scale.z = .4; stage.add(s); } }
  // 鳥（届く：鳴き声）
  const bird = new THREE.Group(); bird.position.copy(BIRD); stage.add(bird);
  { const m = new THREE.MeshStandardMaterial({ color: 0x6b5848, roughness: .8 }); const b = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 10), m); b.scale.set(1.4, .9, .9); bird.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), m); h.position.set(.12, .05, 0); bird.add(h);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(.14, .01, .16), m); w.position.set(-.02, .03, s * .09); w.rotation.x = s * .5; bird.add(w); } }
  // 高すぎて聞こえない音（コウモリの超音波の模式・届かない）：細かい弧
  const ultra = new THREE.Group(); ultra.position.copy(BAT); stage.add(ultra);
  { // 音の出どころ：小さなコウモリ（模式）。体と、膜の張った二枚の翼
    const bm = new THREE.MeshStandardMaterial({ color: 0x8a8088, roughness: .85, side: THREE.DoubleSide }); const bat = new THREE.Group(); bat.position.set(-.3, -.02, 0); bat.scale.setScalar(2.2); ultra.add(bat);
    const body = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), bm); body.scale.set(1.5, .8, .8); bat.add(body);
    const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(.26, .1); ws.lineTo(.24, .02); ws.lineTo(.18, -.03); ws.lineTo(.12, -.01); ws.lineTo(.06, -.05); ws.lineTo(0, -.03);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ShapeGeometry(ws), bm); w.rotation.x = -Math.PI / 2 + .3 * s; w.rotation.y = s > 0 ? 0 : Math.PI; w.position.z = 0; w.scale.set(1, 1, 1); w.rotation.z = s * .2; bat.add(w); } }
  for (let k = 1; k <= 5; k++) { const a = new THREE.Mesh(new THREE.TorusGeometry(k * .12, .009, 4, 32, 1.4), FAINT(new THREE.MeshBasicMaterial({ color: 0xa8f2f6 }), two)); a.rotation.z = -.7; a.rotation.y = .8; ultra.add(a); }

  // 人と欅（模型）
  (async () => { try {
    const [man, tg] = await Promise.all([gltf('img/hero/3d/man.glb'), gltf('img/hero/3d/keyaki_lod1_notex.glb')]);
    const skin = new THREE.MeshStandardMaterial({ color: 0xd9cfc2, roughness: .7 });
    man.scene.traverse(m => { if (m.isMesh) { m.material = skin; m.frustumCulled = false; } });
    const bb = new THREE.Box3().setFromObject(man.scene), sz = bb.getSize(new THREE.Vector3()), sc = 1.7 / sz.y;
    man.scene.scale.setScalar(sc); man.scene.position.set(P.x - (bb.min.x + sz.x / 2) * sc, -bb.min.y * sc, P.z - (bb.min.z + sz.z / 2) * sc); man.scene.rotation.y = 1.0; stage.add(man.scene);
    const bark = new THREE.MeshStandardMaterial({ color: 0x6d5d4c, roughness: .95 });
    const leaf = new THREE.MeshStandardMaterial({ color: 0xb9cd97, roughness: .8, side: THREE.DoubleSide, alphaTest: .45 });
    try { const lt = await TL.loadAsync('img/hero/3d/keyaki_leaf_atlas.png'); lt.flipY = false; lt.colorSpace = THREE.SRGBColorSpace; leaf.map = lt; } catch (e) {}
    const tree = new THREE.Group(); tg.scene.updateMatrixWorld(true);
    tg.scene.traverse(m => { if (m.isMesh) { const mm = new THREE.Mesh(m.geometry, /leaf|leaves/i.test(m.name) ? leaf : bark); mm.applyMatrix4(m.matrixWorld); tree.add(mm); } });
    const tb = new THREE.Box3().setFromObject(tree), ts = tb.getSize(new THREE.Vector3()), tsc = 3.4 / ts.y;
    tree.scale.setScalar(tsc); tree.position.set(TREE.x - (tb.min.x + ts.x / 2) * tsc, -tb.min.y * tsc, TREE.z - (tb.min.z + ts.z / 2) * tsc); stage.add(tree);
  } catch (e) { console.warn('diorama', e); } })();

  // 手がかりの線（人→もの）
  const lineTo = (a, b, col, dash) => { const g = new THREE.BufferGeometry().setFromPoints([a, b]); const m = dash ? new THREE.LineDashedMaterial({ color: col, dashSize: .08, gapSize: .06, transparent: true, opacity: .95 }) : new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .95 }); const l = new THREE.Line(g, m); if (dash) l.computeLineDistances(); stage.add(l); return l; };
  const dot = (p, col) => { const d = new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), new THREE.MeshBasicMaterial({ color: col })); d.position.copy(p); stage.add(d); return d; };
  const BODY = 0xffffff;
  // 1.0・2.0 共通：身体で届くもの
  [[EYE, TRUNK], [EAR, BIRD], [FOOT, new THREE.Vector3(-.3, .02, 1.3)], [EYE, FLOWER.clone().setY(.45)]].forEach(([a, b]) => { lineTo(a, b, BODY, false); dot(b, BODY); });
  dot(EYE, BODY);

  const layerYs = [3.9, 4.35, 4.8, 5.25];
  let layers = [];
  if (two) {
    // 情報の層（地図のレイヤーのような、平らで透けた板）。下から 地形・歴史・生き物・音
    const L = [
      [0x8fe3c8, (x, w, h) => { x.strokeStyle = '#8fe3c8'; x.lineWidth = 4; for (let k = 1; k < 10; k++) { x.beginPath(); for (let i = 0; i <= 100; i++) { const u = i / 100; const y = h * (k / 10) + Math.sin(u * 7 + k) * h * .03; i ? x.lineTo(u * w, y) : x.moveTo(0, y); } x.stroke(); } }],
      [0xf2c56e, (x, w, h) => { x.strokeStyle = '#f2c56e'; x.lineWidth = 7; x.setLineDash([26, 14]); x.beginPath(); x.moveTo(w * .05, h * .95); x.lineTo(w * .45, h * .1); x.stroke(); x.setLineDash([]); x.lineWidth = 5; x.strokeRect(w * .18, h * .05, w * .2, h * .12); }],
      [0xc9b8ff, (x, w, h) => { x.fillStyle = '#c9b8ff'; x.strokeStyle = '#c9b8ff'; x.lineWidth = 4; [[.78, .3], [.6, .78]].forEach(([u, v]) => { x.beginPath(); x.arc(u * w, v * h, 14, 0, 6.283); x.fill(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; x.beginPath(); x.moveTo(u * w, v * h); x.lineTo(u * w + Math.cos(a) * 70, v * h + Math.sin(a) * 50); x.stroke(); } }); }],
      [0xa8f2f6, (x, w, h) => { x.strokeStyle = '#a8f2f6'; x.lineWidth = 5; [[.12, .25], [.7, .2]].forEach(([u, v]) => { for (let k = 1; k <= 6; k++) { x.globalAlpha = 1 - k * .13; x.beginPath(); x.arc(u * w, v * h, k * 18, 0, 6.283); x.stroke(); } }); x.globalAlpha = 1; }]];
    L.forEach(([col, draw], i) => {
      const g = new THREE.Group(); g.position.y = layerYs[i]; stage.add(g);
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide })); fill.rotation.x = -Math.PI / 2; g.add(fill);
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: canvasTex((x, w, h) => { draw(x, w, h); }, 768, 512), transparent: true, opacity: .95, depthWrite: false, side: THREE.DoubleSide })); ln.rotation.x = -Math.PI / 2; ln.position.y = .003; g.add(ln);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, .001, D)), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .9 })); g.add(e);
      layers.push(g);
    });
    // 層を通してつながる：人→層→（届かなかったもの）。縦の線は層への出入り
    // 人の頭から一本の幹で層へ上がり、各層の上を水平に進んで、届かなかったものの真上から降りる
    const top = new THREE.Vector3(EYE.x, layerYs[layerYs.length - 1], EYE.z); lineTo(EYE, top, 0xffffff, false); dot(top, 0xffffff);
    const via = (layerI, target, col) => { const y = layerYs[layerI]; const up = new THREE.Vector3(EYE.x, y, EYE.z), dn = new THREE.Vector3(target.x, y, target.z);
      lineTo(up, dn, col, false); lineTo(dn, target, col, true); dot(up, col); dot(dn, col); dot(target, col); };
    via(0, ROOTS, 0x8fe3c8); via(1, OLD, 0xf2c56e); via(2, FLOWER.clone().setY(.46), 0xc9b8ff); via(3, BAT.clone().add(new THREE.Vector3(-.75, .12, 0)), 0xa8f2f6);
  }

  // 札の置き場（図の下に並べるので、ここでは使わない）
  const fitW = 7.4, fitH = two ? 7.4 : 5.4;
  const look = new THREE.Vector3(0, two ? 2.0 : .6, 0);
  function size() { const w = fig.clientWidth || 300, h = fig.clientHeight || 300; R.setSize(w, h, false); cam.aspect = w / h; const th = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); const d = Math.max(fitH / 2 / th, fitW / 2 / th / cam.aspect) * 1.02; const dir = new THREE.Vector3(.75, .42, 1).normalize(); cam.position.copy(look).add(dir.multiplyScalar(d)); cam.lookAt(look); cam.updateProjectionMatrix(); }
  size(); new ResizeObserver(size).observe(fig);
  let vis = true, raf = 0; const t0 = performance.now();
  function frame() { const t = (performance.now() - t0) / 1000; stage.rotation.y = reduce ? 0 : Math.sin(t * .15) * .08; bird.position.y = BIRD.y + (reduce ? 0 : Math.sin(t * 2) * .03); R.render(S, cam); }
  function loop() { raf = 0; if (!vis || document.hidden) return; frame(); raf = requestAnimationFrame(loop); }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(loop); }).observe(fig);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !raf) raf = requestAnimationFrame(loop); });
  frame(); fig.classList.add('on'); if (!reduce) raf = requestAnimationFrame(loop);
}
