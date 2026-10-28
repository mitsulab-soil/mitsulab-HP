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
  const FAINT = (m, on) => { m.transparent = true; m.opacity = on ? 1 : .55; m.depthWrite = on; return m; };

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
  { const m = new THREE.MeshStandardMaterial({ color: 0x7a6656, roughness: .8 }), w2 = new THREE.MeshStandardMaterial({ color: 0x4e4036, roughness: .8, side: THREE.DoubleSide });
    const b = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 10), m); b.scale.set(1.5, .85, .85); bird.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(.065, 14, 10), m); h.position.set(.14, .06, 0); bird.add(h);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.018, .07, 8), new THREE.MeshStandardMaterial({ color: 0xd9a441 })); beak.rotation.z = -Math.PI / 2; beak.position.set(.22, .055, 0); bird.add(beak);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 4), w2); tail.rotation.z = Math.PI / 2; tail.scale.z = .25; tail.position.set(-.2, .02, 0); bird.add(tail);
    const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.quadraticCurveTo(.08, .2, -.04, .3); ws.lineTo(-.1, .05); ws.lineTo(0, 0);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ShapeGeometry(ws), w2); w.rotation.x = s > 0 ? -1.2 : Math.PI + 1.2; w.position.set(-.01, .05, s * .05); bird.add(w); } }
  // 高すぎて聞こえない音（コウモリの超音波の模式・届かない）：細かい弧
  const ultra = new THREE.Group(); ultra.position.copy(BAT); stage.add(ultra);
  { // 音の出どころ：小さなコウモリ（模式）。体と、膜の張った二枚の翼
    const bm = new THREE.MeshStandardMaterial({ color: 0x8a8088, roughness: .85, side: THREE.DoubleSide }); const bat = new THREE.Group(); bat.position.set(-.3, -.02, 0); bat.scale.setScalar(2.2); ultra.add(bat);
    const body = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), bm); body.scale.set(1.5, .8, .8); bat.add(body);
    const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(.26, .1); ws.lineTo(.24, .02); ws.lineTo(.18, -.03); ws.lineTo(.12, -.01); ws.lineTo(.06, -.05); ws.lineTo(0, -.03);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ShapeGeometry(ws), bm); w.rotation.x = -Math.PI / 2 + .3 * s; w.rotation.y = s > 0 ? 0 : Math.PI; w.position.z = 0; w.scale.set(1, 1, 1); w.rotation.z = s * .2; bat.add(w); } }
  for (let k = 1; k <= 5; k++) { const a = new THREE.Mesh(new THREE.TorusGeometry(k * .12, .009, 4, 32, 1.4), FAINT(new THREE.MeshBasicMaterial({ color: 0xa8f2f6 }), two)); a.rotation.z = -.7; a.rotation.y = .8; ultra.add(a); }

  // 作り込み：土の層位の帯と札・ミミズ・小さな土の生き物・段差（縁石）・丁石・ミツバチ
  { const hz = [[-.08, -.3, 0x3a2a1a, 'A'], [-.3, -.85, 0x5a4430, 'B'], [-.85, -1.48, 0x7a6448, 'C']];
    hz.forEach(([y0, y1, c, n]) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(W, y0 - y1), new THREE.MeshStandardMaterial({ color: c, roughness: 1, transparent: true, opacity: .55 })); b.position.set(0, (y0 + y1) / 2, D / 2 + .003); stage.add(b);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(W, .006), new THREE.MeshBasicMaterial({ color: 0xd8c8a8, transparent: true, opacity: .5 })); l.position.set(0, y1, D / 2 + .004); stage.add(l); }); }
  { const wm = FAINT(new THREE.MeshStandardMaterial({ color: 0xc08070, roughness: .6 }), two);
    [[.6, -.5, 1.98, 0], [1.9, -.95, 1.98, 1.4], [-.4, -1.1, 1.98, .6]].forEach(([x, y, z, r]) => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-.18, 0, 0), new THREE.Vector3(-.06, .05, 0), new THREE.Vector3(.06, -.04, 0), new THREE.Vector3(.18, .02, 0)]); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 20, .018, 6), wm); m.position.set(x, y, z); m.rotation.z = r; stage.add(m); });
    const mm = FAINT(new THREE.MeshStandardMaterial({ color: 0xe8dcc0 }), two); for (let i = 0; i < 24; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 4), mm); s.position.set((Math.random() - .5) * W * .9, -.12 - Math.random() * .5, D / 2 + .01); stage.add(s); } }
  { const kerb = new THREE.Mesh(new THREE.BoxGeometry(W, .12, .22), new THREE.MeshStandardMaterial({ color: 0x8c8780, roughness: .9 })); kerb.position.set(0, .02, -D / 2 + .11); stage.add(kerb);
    const step = new THREE.Mesh(new THREE.BoxGeometry(W, .1, .5), new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: .95 })); step.position.set(0, .1, -D / 2 + .25); step.scale.x = .999; stage.add(step);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(.12, .5, .12), new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: .9 })); ch.position.set(-2.6, .25, .6); stage.add(ch);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.09, .08, 4), ch.material); cap.position.set(-2.6, .54, .6); cap.rotation.y = Math.PI / 4; stage.add(cap); }
  const bee = new THREE.Group(); bee.position.set(FLOWER.x + .18, .62, FLOWER.z - .05); stage.add(bee);
  { const bm = new THREE.MeshStandardMaterial({ color: 0xd8a02a, roughness: .6 }); const b = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), bm); b.scale.set(1.6, 1, 1); bee.add(b);
    const st = new THREE.Mesh(new THREE.TorusGeometry(.026, .006, 4, 16), new THREE.MeshStandardMaterial({ color: 0x2a2018 })); st.rotation.y = Math.PI / 2; bee.add(st);
    const wm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, side: THREE.DoubleSide }); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(.03, 10), wm); w.position.set(0, .03, s * .03); w.rotation.x = -Math.PI / 2 + s * .5; bee.add(w); } }
  // 人と欅（模型）
  (async () => { try {
    const [man, tg] = await Promise.all([gltf('img/hero/3d/man.glb'), gltf('img/hero/3d/keyaki_lod1_notex.glb')]);
    const skin = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .62, sheen: .4, sheenColor: new THREE.Color(0x8899aa) });
    skin.onBeforeCompile = sh => { sh.vertexShader = 'varying float vH_;\n' + sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n vH_ = (modelMatrix * vec4(transformed, 1.)).y;'); sh.fragmentShader = 'varying float vH_; uniform float uTop; uniform float uBot;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hN = clamp((vH_ - uBot) / (uTop - uBot), 0., 1.);
      vec3 sk = vec3(.86, .69, .58), coat = vec3(.18, .22, .28), pants = vec3(.24, .25, .27), shoe = vec3(.12, .1, .09), hair = vec3(.1, .08, .07);
      vec3 c = hN < .05 ? shoe : hN < .47 ? pants : hN < .82 ? coat : hN < .93 ? sk : hair;
      diffuseColor.rgb = c;`); sh.uniforms.uTop = skin.userData.uTop; sh.uniforms.uBot = skin.userData.uBot; };
    skin.userData.uTop = { value: 1 }; skin.userData.uBot = { value: 0 };
    // 2026-10-28 P2：角ばりを抑える＝面ごとの法線を、頂点をまとめて滑らかな法線に作り直す（形は手元の man.glb のまま）
    const { mergeVertices } = await import('three/addons/utils/BufferGeometryUtils.js');
    man.scene.traverse(m => { if (m.isMesh) { try { let g = m.geometry.clone(); g.deleteAttribute('normal'); if (g.attributes.uv) g.deleteAttribute('uv'); g = mergeVertices(g, 1e-3); g.computeVertexNormals(); m.geometry = g; } catch (e) {} m.material = skin; m.frustumCulled = false; } });
    const bb = new THREE.Box3().setFromObject(man.scene), sz = bb.getSize(new THREE.Vector3()), sc = 1.7 / sz.y;
    { let lo = 1e9, hi = -1e9; man.scene.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); lo = Math.min(lo, o.geometry.boundingBox.min.y); hi = Math.max(hi, o.geometry.boundingBox.max.y); } }); skin.userData.uTop.value = 1.7; skin.userData.uBot.value = 0.; }
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
  // 2026-10-28 P2：線が人の頭の上で細かく重ならないよう、線は顔から少し離れた所から出す（2.0 では身体の線を一段淡く）
  const off = (a, b, r) => a.clone().add(b.clone().sub(a).normalize().multiplyScalar(r));
  [[EYE, TRUNK], [EAR, BIRD], [FOOT, new THREE.Vector3(-.3, .02, 1.3)], [EYE, FLOWER.clone().setY(.45)]].forEach(([a, b], i) => { const l = lineTo(i === 2 ? a : off(a, b, .26), b, BODY, false); if (two) l.material.opacity = .5; dot(b, BODY); });
  if (!two) dot(EYE, BODY);

  if (two && !window.__sandoMeta) { try { window.__sandoMeta = await fetch('img/hero/sando_wire.json').then(r => r.json()); } catch (e) { window.__sandoMeta = null; } }
  let aoiTick = null; const sideLabs = [];
  const layerYs = [3.7, 4.5, 5.3, 6.1];
  let layers = [];
  if (two) {
    // 情報の層（地図のレイヤーのような、平らで透けた板）。下から 地形・歴史・生き物・音
    const EN = { '地形 ── 等高線（標高・国土地理院の数値地図より・模式）': 'Terrain: contour lines (elevation, GSI data; schematic)', '昔の道（古い地図に残る道筋）': 'Old path (as on old maps)', '鳥居': 'Torii', '丁石（道のりの石）': 'Distance stone', '歴史 ── 記録と古い地図（模式）': 'History: records and old maps (schematic)', 'ケヤキ': 'Zelkova', 'ミツバチ（紫外線で花を見る）': 'Honeybee (sees UV on flowers)', 'シジュウカラ': 'Japanese tit', 'ミミズ・菌糸（土の中）': 'Earthworms, fungi (in soil)', '生き物 ── 記録された生き物（模式）': 'Living things: recorded species (schematic)', '人に聞こえる音': 'Human hearing', 'コウモリの声': 'Bat calls', '音 ── 周波数（対数・模式）': 'Sound: frequency (log scale; schematic)' };
    const tr = s => (document.documentElement.dataset.lang === 'en' && EN[s]) || s;
    const lab = (x, s, px, py, col, size = 22) => { s = tr(s); size = Math.round(size * 1.6); x.font = `600 ${size}px "Noto Sans JP", sans-serif`; x.fillStyle = col; x.fillText(s, px, py); };
    const L = [
      [0x8fe3c8, (x, w, h) => { // 実データ：国土地理院 DEM5A から作った 1 m 間隔の等高線（氷川参道のまわり 240 m × 160 m を、この板に縮めて描く）
        const M = window.__sandoMeta; if (!M) return; const C = M.center, o = C[Math.floor(C.length * .55)], HW = 260, HD = 175;
        x.lineCap = 'round'; const seen = {};
        for (const [e, xs] of M.contours) { x.strokeStyle = '#b4ffe0'; x.lineWidth = e % 5 === 0 ? 8 : 5; x.beginPath(); let on = false;
          for (let i = 0; i + 1 < xs.length; i += 2) { const px = (xs[i] - o[0] + HW) / (2 * HW) * w, py = (xs[i + 1] - o[2] + HD) / (2 * HD) * h; const inside = px > -20 && px < w + 20 && py > -20 && py < h + 20;
            if (inside) { on ? x.lineTo(px, py) : x.moveTo(px, py); on = true; if (!seen[e] && px > w * .1 && px < w * .9 && py > h * .1 && py < h * .9) seen[e] = [px, py]; } else on = false; }
          x.stroke(); }
        Object.entries(seen).forEach(([e, [px, py]]) => { x.fillStyle = 'rgba(8,16,24,.75)'; x.fillRect(px - 4, py - 34, 96, 40); lab(x, (+e).toFixed(0) + ' m', px + 2, py - 6, '#bff5e2', 26); }); }],
      [0xf2c56e, (x, w, h) => { x.strokeStyle = '#f2c56e'; x.lineWidth = 7; x.setLineDash([26, 14]); x.beginPath(); x.moveTo(w * .05, h * .95); x.lineTo(w * .45, h * .1); x.stroke(); x.setLineDash([]); x.lineWidth = 5; x.strokeRect(w * .18, h * .05, w * .2, h * .12);
        x.beginPath(); x.arc(w * .5, h * .86, 7, 0, 6.283); x.fillStyle = '#f2c56e'; x.fill(); }],
      [0xc9b8ff, (x, w, h) => { x.fillStyle = '#c9b8ff'; x.strokeStyle = '#c9b8ff'; x.lineWidth = 4; [[.78, .3, 'ケヤキ'], [.6, .78, 'ミツバチ（紫外線で花を見る）'], [.3, .55, 'シジュウカラ'], [.84, .82, 'ミミズ・菌糸（土の中）']].forEach(([u, v, n]) => { x.beginPath(); x.arc(u * w, v * h, 12, 0, 6.283); x.fill(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; x.beginPath(); x.moveTo(u * w, v * h); x.lineTo(u * w + Math.cos(a) * 46, v * h + Math.sin(a) * 34); x.stroke(); } }); }],
      [0xa8f2f6, (x, w, h) => { x.strokeStyle = '#a8f2f6'; x.lineWidth = 5; [[.12, .3], [.7, .26]].forEach(([u, v]) => { for (let k = 1; k <= 6; k++) { x.globalAlpha = 1 - k * .13; x.beginPath(); x.arc(u * w, v * h, k * 18, 0, 6.283); x.stroke(); } }); x.globalAlpha = 1;
        // 周波数の目盛り（対数）：人に聞こえるのはおよそ 20 Hz〜20 kHz、コウモリの声は 20 kHz より高い（模式）
        const y0 = h * .82, x0 = w * .08, x1 = w * .92, f = v => x0 + (Math.log10(v) - 1) / 4 * (x1 - x0); x.lineWidth = 3; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y0); x.stroke();
        [[10, '10 Hz'], [1000, '1 kHz'], [100000, '100 kHz']].forEach(([v, s]) => { x.beginPath(); x.moveTo(f(v), y0 - 10); x.lineTo(f(v), y0 + 10); x.stroke(); x.fillStyle = 'rgba(8,16,24,.75)'; x.fillRect(f(v) - 30, y0 + 14, 150, 40); lab(x, s, f(v) - 26, y0 + 46, '#d4fbfd', 20); });
        x.fillStyle = 'rgba(168,242,246,.28)'; x.fillRect(f(20), y0 - 26, f(20000) - f(20), 14);
        x.fillStyle = 'rgba(242,197,110,.4)'; x.fillRect(f(20000), y0 - 26, f(100000) - f(20000), 14); }]];
    const texs = [];
    new MutationObserver(() => texs.forEach(([tx, draw]) => { const c = tx.image, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); draw(x, c.width, c.height); tx.needsUpdate = true; })).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
    L.forEach(([col, draw], i) => {
      const g = new THREE.Group(); g.position.y = layerYs[i]; stage.add(g);
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide })); fill.rotation.x = -Math.PI / 2; g.add(fill);
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: (() => { const tx = canvasTex((x, w, h) => { draw(x, w, h); }, 1024, 680); texs.push([tx, draw]); return tx; })(), transparent: true, opacity: .95, depthWrite: false, side: THREE.DoubleSide })); ln.rotation.x = -Math.PI / 2; ln.position.y = .003; g.add(ln);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, .001, D)), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .9 })); g.add(e);
      { const SL = [['地形', '等高線 1 m ごと（国土地理院 DEM5A）', 'Terrain', '1 m contours (GSI DEM5A)'], ['歴史', '昔の道・鳥居・丁石', 'History', 'old path, torii, stones'], ['生き物', 'ケヤキ・ミツバチ・シジュウカラ', 'Living things', 'zelkova, honeybee, tit'], ['音', '人 〜20 kHz・コウモリ 20 kHz〜', 'Sound', 'human ≤20 kHz, bats 20 kHz+']][i];
        const el = document.createElement('div'); el.className = 'qx-sl'; el.style.setProperty('--c', '#' + new THREE.Color(col).getHexString()); fig.appendChild(el);
        const fill = () => { const en = document.documentElement.dataset.lang === 'en'; el.innerHTML = '<b>' + (en ? SL[2] : SL[0]) + '</b><span>' + (en ? SL[3] : SL[1]) + '</span>'; }; fill(); texs.push([{ image: document.createElement('canvas') }, () => fill()]);
        const an = new THREE.Object3D(); an.position.set(W / 2 + .1, 0, -D / 2 + .3); g.add(an); sideLabs.push([el, an]); }
      { const slab = new THREE.Mesh(new THREE.BoxGeometry(W, .09, D), new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: i === 0 ? .2 : .09, roughness: .3, metalness: 0, depthWrite: false })); slab.position.y = -.05; g.add(slab);
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .7 })); ed.position.y = -.05; g.add(ed); }
      if (i < 3) for (let k = 1; k <= 3; k++) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * .995, D * .995), new THREE.MeshBasicMaterial({ color: 0xcfe6ee, transparent: true, opacity: .045, depthWrite: false, side: THREE.DoubleSide })); sh.rotation.x = -Math.PI / 2; sh.position.y = (layerYs[i + 1] - layerYs[i]) * k / 4; g.add(sh);
        const e2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(W * .995, D * .995)), new THREE.LineBasicMaterial({ color: 0xcfe6ee, transparent: true, opacity: .25 })); e2.rotation.x = -Math.PI / 2; e2.position.y = sh.position.y; g.add(e2); }
      layers.push(g);
    });
    // 層を通してつながる：人→層→（届かなかったもの）。縦の線は層への出入り
    // 依代＝環境エージェント（2026-10-28 本人）：碧が人のそばに立ち、主体と情報の層のあいだをつなぐ。層のそばに小さな依代（Qualium の共通部品の現行版）を置く
    const AOI = new THREE.Vector3(.45, 0, -.1), AOIH = new THREE.Vector3(.45, 1.55, -.1);
    lineTo(off(EYE, AOIH, .26), AOIH, 0xa8f2f6, false); dot(AOIH, 0xa8f2f6);
    const top = new THREE.Vector3(AOIH.x, layerYs[layerYs.length - 1], AOIH.z); lineTo(AOIH, top, 0xa8f2f6, false); dot(top, 0xa8f2f6);
    { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.1, D * 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .015; stage.add(sh); }
    const via = (layerI, target, col) => { const y = layerYs[layerI]; const up = new THREE.Vector3(AOIH.x, y, AOIH.z), dn = new THREE.Vector3(target.x, y, target.z);
      lineTo(up, dn, col, false); lineTo(dn, target, col, true); dot(up, col); dot(dn, col); dot(target, col); };
    via(0, ROOTS, 0x8fe3c8); via(1, OLD, 0xf2c56e); via(2, FLOWER.clone().setY(.46), 0xc9b8ff); via(3, BAT.clone().add(new THREE.Vector3(-.75, .12, 0)), 0xa8f2f6);
    (async () => { try {
      const g = await gltf('js/kit/envAgents/kasane.glb'); const proto = g.scene; const bb = new THREE.Box3().setFromObject(proto), h = bb.max.y - bb.min.y;
      [[ROOTS.x - .5, 0, ROOTS.z + .9, '#6c8d71'], [OLD.x + .4, 0, 1.6, '#864e4c'], [FLOWER.x - .25, 0, FLOWER.z + .35, '#a59fc3'], [-2.0, 0, .2, '#3a4360']].forEach(([x, y, z, c], i) => {
        const k = proto.clone(true); k.traverse(o => { if (o.isMesh && o.material && !/eye|cheek|目|頬/i.test(o.name + (o.material.name || ''))) { o.material = o.material.clone(); o.material.color && o.material.color.set(c); } });
        k.scale.setScalar(.5 / h); k.position.set(x, y - bb.min.y * .5 / h, z); k.rotation.y = .6 + i * .5; stage.add(k); }); } catch (e) { console.warn('kasane', e); } })();
    (async () => { try {
      const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'), import('@pixiv/three-vrm')]);
      const Ld = new GLTFLoader(); Ld.setMeshoptDecoder(MeshoptDecoder); Ld.register(p => new V.VRMLoaderPlugin(p));
      const buf = await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())));
      const gg = await Ld.parseAsync(buf.slice(0), ''); const vrm = gg.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(gg.scene); V.VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      const pivot = new THREE.Group(); pivot.add(vrm.scene); pivot.visible = false; stage.add(pivot);
      vrm.humanoid.resetNormalizedPose(); vrm.update(0); const b2 = new THREE.Box3().setFromObject(vrm.scene), hh = b2.max.y - b2.min.y; pivot.scale.setScalar(1.62 / hh); pivot.position.copy(AOI);
      const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61');
      const mot = new AoiMotion(vrm, { root: pivot, reducedMotion: reduce, wind: .2, faceViewer: false, startCalm: 1, posture: 'upright', uprightWeight: .9 }); mot.faceTo(.6);
      let n = 0; aoiTick = dt => { mot.update(dt, cam, { vrmUpdate: false }); vrm.update(dt); mot.afterVrmUpdate(dt); if (!pivot.visible && ++n > 3) pivot.visible = true; };
    } catch (e) { console.warn('aoi', e); } })();
  }

  // 札の置き場（図の下に並べるので、ここでは使わない）
  const fitW = two ? (mobile ? 11.6 : 10.6) : 7.4, fitH = two ? 9.0 : 6.6;
  const look = new THREE.Vector3(two ? 1.4 : 0, two ? 2.6 : .6, 0);
  function size() { const w = fig.clientWidth || 300, h = fig.clientHeight || 300; R.setSize(w, h, false); cam.aspect = w / h; const th = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); const d = Math.max(fitH / 2 / th, fitW / 2 / th / cam.aspect) * 1.02; const dir = new THREE.Vector3(.75, .62, 1).normalize(); cam.position.copy(look).add(dir.multiplyScalar(d)); cam.lookAt(look); cam.updateProjectionMatrix(); }
  size(); new ResizeObserver(size).observe(fig);
  let vis = true, raf = 0; const t0 = performance.now(); let lastT = t0;
  function frame() { const now = performance.now(), t = (now - t0) / 1000, dt = Math.min(.05, (now - lastT) / 1000); lastT = now; if (aoiTick) aoiTick(dt); if (sideLabs.length) { S.updateMatrixWorld(); const w = fig.clientWidth, h = fig.clientHeight, v = new THREE.Vector3(); sideLabs.forEach(([el, an]) => { an.getWorldPosition(v); v.project(cam); el.style.transform = `translate(${Math.min(w - 8, (v.x * .5 + .5) * w + 6)}px,${(-v.y * .5 + .5) * h}px) translate(0,-50%)`; }); } bee.position.y = .62 + (reduce ? 0 : Math.sin(t * 7) * .015); stage.rotation.y = reduce ? 0 : Math.sin(t * .15) * .08; bird.position.y = BIRD.y + (reduce ? 0 : Math.sin(t * 2) * .03); R.render(S, cam); }
  function loop() { raf = 0; if (!vis || document.hidden) return; frame(); raf = requestAnimationFrame(loop); }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(loop); }).observe(fig);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !raf) raf = requestAnimationFrame(loop); });
  frame(); fig.classList.add('on'); if (!reduce) raf = requestAnimationFrame(loop);
}
