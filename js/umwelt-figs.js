/* © mitsulab. HP v4d（2026-10-26 夜 本人「環世界はもっとスタイリッシュに。美しくないです」「複雑性はいらない・本質を」）
   節ごとの 3D（.v2-fig[data-fig]）。世界観の決まり＝写実の地に、事実の線。地は写真の土、木は先細りの幹と写真の葉、生き物はマットな造形。
   泡＝その生き物が感じとれる範囲（模式）。透けるガラスの膜（屈折・縁の光・地にやわらかい影）。矢印・網・粒は使わない。色は紺の地・碧・淡い差し色だけ。
   1.0：同じ一本の木と一輪の花のそばで、人・ミツバチ・マダニがそれぞれ自分の泡の中にいる。泡の中には、その生き物に届く姿だけを線で描く。
        人＝花の色と形／ミツバチ＝紫外線で見える花の中心の模様（人の目には見えない）／マダニ＝花は届かず、酪酸のにおいと体温（温かさの輪）。
   2.0：依代（碧）が灯り、光が人へ流れ、人の泡が広がってミツバチの泡・場所の記憶の泡と重なる。その重なる場＝Qualium（地の細い輪）。 */
import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = Math.min(innerWidth, innerHeight) < 700;
const AOI = 0xa8f2f6, WARM = 0xf2cf8c, PERSON = 0xf4aa96, INFO = 0xb4a2ff;
function hasGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!hasGL()) document.documentElement.classList.add('v2-no3d');
else document.querySelectorAll('.v2-fig').forEach(f => { const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); boot(f, +f.dataset.fig).catch(e => { console.warn('umwelt-figs', e); f.classList.add('no3d'); }); } }, { rootMargin: '500px 0px' }); o.observe(f); });

const TL = new THREE.TextureLoader();
const tex = (u, srgb = true, rep) => { const t = TL.load(u); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); } return t; };
// 夜の空の映り込み（泡のガラスに柔らかく映る。眩しい点は置かない）
function envMap(R) {
  const s = new THREE.Scene(), g = new THREE.SphereGeometry(10, 32, 16);
  s.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 p; void main(){ float h = p.y*.5+.5; vec3 c = mix(vec3(.02,.03,.05), vec3(.32,.42,.48), smoothstep(.45,1.,h)); c += vec3(.55,.6,.62) * smoothstep(.93,1.,dot(p, normalize(vec3(-.4,.8,.45)))); gl_FragColor = vec4(c,1.); }' })));
  const pm = new THREE.PMREMGenerator(R), e = pm.fromScene(s, .02).texture; pm.dispose(); return e;
}
// 泡：透けるガラスの膜＋縁だけに碧の細い光（にじませない）
function makeBubble(r, tint) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .06, metalness: 0, transmission: 1, thickness: r * .12, ior: 1.18, iridescence: .35, iridescenceIOR: 1.3, envMapIntensity: .9, transparent: true, opacity: 1, depthWrite: false, side: THREE.FrontSide }));
  const rim = new THREE.Mesh(new THREE.SphereGeometry(r * 1.002, 64, 40), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color(tint) }, k: { value: 1 }, oc: { value: new THREE.Vector3(0, -99, 0) }, orr: { value: 0 }, ok: { value: 0 } },
    vertexShader: 'varying vec3 n; varying vec3 v; varying vec3 w; void main(){ vec4 p = modelViewMatrix * vec4(position,1.); w = (modelMatrix * vec4(position,1.)).xyz; n = normalize(normalMatrix * normal); v = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
    fragmentShader: 'uniform vec3 c; uniform float k; uniform vec3 oc; uniform float orr; uniform float ok; varying vec3 n; varying vec3 v; varying vec3 w; void main(){ float f = pow(1. - abs(dot(n, v)), 5.); float d = orr - distance(w, oc); float ins = smoothstep(0., .08, d); float edge = 1. - smoothstep(0., .05, abs(d)); vec3 q = vec3(.66,.95,.96); gl_FragColor = vec4(c * f * .9 * k + q * (ins * .5 + edge * .35) * ok, 1.); }' }));
  // 地にやわらかい影と、細い接地の線（その主体の色）
  const sh = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(r * 1.1, 48), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2;
  const foot = new THREE.Mesh(new THREE.RingGeometry(r * .985, r, 128), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); foot.rotation.x = -Math.PI / 2;
  g.add(glass, rim); g.userData = { glass, rim, shadow, foot, r }; return g;
}
// 泡の中に描く「届く姿」（細い線の花）。human＝温かい白の花びら／bee＝紫外線で見える中心の模様（蜜標）を線で
function flowerTex(kind) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.translate(S / 2, S / 2); x.lineCap = 'round';
  for (let i = 0; i < 5; i++) { x.save(); x.rotate(i / 5 * Math.PI * 2);
    x.beginPath(); x.moveTo(0, -30); x.bezierCurveTo(70, -90, 52, -205, 0, -228); x.bezierCurveTo(-52, -205, -70, -90, 0, -30);
    if (kind === 'human') { x.fillStyle = 'rgba(242,207,140,.22)'; x.fill(); x.strokeStyle = 'rgba(250,236,205,.95)'; x.lineWidth = 3; x.stroke(); }
    else { x.fillStyle = 'rgba(180,162,255,.08)'; x.fill(); x.strokeStyle = 'rgba(200,188,255,.75)'; x.lineWidth = 2.5; x.stroke();
      x.strokeStyle = 'rgba(180,162,255,1)'; x.lineWidth = 3; for (const k of [-14, 0, 14]) { x.beginPath(); x.moveTo(k * .4, -40); x.lineTo(k, -120); x.stroke(); } }
    x.restore(); }
  if (kind === 'bee') { x.fillStyle = 'rgba(180,162,255,.55)'; x.beginPath(); x.arc(0, 0, 70, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = kind === 'human' ? 'rgba(242,207,140,.9)' : 'rgba(225,215,255,1)'; x.beginPath(); x.arc(0, 0, 22, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// 木：先細りの管の幹と枝（ケヤキの樹皮の写真）＋枝先に写真の葉の板
function makeTree() {
  const g = new THREE.Group(), bark = new THREE.MeshStandardMaterial({ map: tex('x/02/tex/bark_zelkova.webp', true), normalMap: tex('x/02/tex/bark_zelkova_n.webp', false), color: 0x8a8076, roughness: .92 });
  const leafM = new THREE.MeshStandardMaterial({ map: tex('x/02/tex/leaf_cluster.webp'), alphaTest: .45, side: THREE.DoubleSide, roughness: .85, color: 0x9fb08a });
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tips = [];
  const branch = (p, dir, len, rad, d) => { const e = p.clone().addScaledVector(dir, len), mid = p.clone().lerp(e, .5).add(new THREE.Vector3((rnd() - .5) * len * .12, 0, (rnd() - .5) * len * .12));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p, mid, e), 8, rad, 7, false), bark); g.add(tube);
    if (d >= 4) { tips.push(e); return; }
    const n = d === 0 ? 3 : 2 + (rnd() < .5 ? 1 : 0);
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, sp = d === 0 ? .55 : .5; const nd = dir.clone().add(new THREE.Vector3(Math.cos(a) * sp, .35 + rnd() * .3, Math.sin(a) * sp)).normalize(); branch(e, nd, len * (.62 + rnd() * .12), rad * .62, d + 1); } };
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 1.25, .17, 0);
  const lg = new THREE.PlaneGeometry(.95, .53);
  tips.forEach(t => { for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(lg, leafM); m.position.copy(t).add(new THREE.Vector3((rnd() - .5) * .35, (rnd() - .3) * .25, (rnd() - .5) * .35)); m.rotation.set(rnd() * 1.2 - .6, rnd() * 6.28, rnd() * 1.2 - .6); g.add(m); } });
  return g;
}
const matte = (o, hex = 0xd8d2c8) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: .82, metalness: 0 }); o.traverse(c => { if (c.isMesh || c.isSkinnedMesh) c.material = m; }); return o; };

async function boot(root, SC) {
  const cv = root.querySelector('canvas'), labsBox = root.querySelector('.v2-labs');
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75)); R.setClearColor(0x03060f, 1); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = 1.05;
  const S = new THREE.Scene(); S.fog = new THREE.Fog(0x03060f, 9, 19); S.environment = envMap(R);
  const cam = new THREE.PerspectiveCamera(32, 1, .05, 60);
  S.add(new THREE.HemisphereLight(0xc9dde6, 0x3a3228, 1.35)); const key = new THREE.DirectionalLight(0xf3ead8, 1.6); key.position.set(-5, 8, 4); S.add(key); const back = new THREE.DirectionalLight(0x9fd8e6, .7); back.position.set(4, 3, -6); S.add(back);

  // 地：写真の土（縁は霧へ溶ける）＋等高線のような細い線（事実の線＝地のゆるい起伏の模式）
  { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(.55, '#fff'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 96), new THREE.MeshStandardMaterial({ map: tex('x/02/tex/soil_forest.webp', true, 7), color: 0xa89a84, roughness: .97, transparent: true, alphaMap: new THREE.CanvasTexture(c), depthWrite: false })); ground.rotation.x = -Math.PI / 2; S.add(ground);
    const ln = []; for (let k = 1; k <= 6; k++) { const r = k * 1.15; for (let i = 0; i < 160; i++) { const a = i / 160 * 6.283, b = (i + 1) / 160 * 6.283, w = q => r + Math.sin(q * 3 + k) * .12 + Math.sin(q * 5 - k * 2) * .06; ln.push(Math.cos(a) * w(a) - .4, .012, Math.sin(a) * w(a) - .6, Math.cos(b) * w(b) - .4, .012, Math.sin(b) * w(b) - .6); } }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(ln, 3)); S.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x8bccca, transparent: true, opacity: .13, depthWrite: false }))); }

  const tree = makeTree(); tree.position.set(.5, 0, -2.6); tree.scale.setScalar(1.1); S.add(tree);
  // 同じ一輪の花（茎は細い線・花は温かい白）
  { const st = new THREE.Mesh(new THREE.CylinderGeometry(.008, .012, .55, 6), new THREE.MeshStandardMaterial({ color: 0x7d8a5a, roughness: .9 })); st.position.set(.45, .275, .2); S.add(st);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(.14, 40), new THREE.MeshBasicMaterial({ map: flowerTex('human'), transparent: true, side: THREE.DoubleSide, depthWrite: false })); fl.position.set(.45, .56, .2); fl.rotation.x = -1.0; S.add(fl); }

  const P_H = new THREE.Vector3(-1.7, 0, .6), B_H = new THREE.Vector3(-1.7, 1.15, .6), R_H = 1.2;
  const P_B = new THREE.Vector3(SC === 2 ? .85 : 1.15, .9, .65), R_B = .5;
  const P_T = new THREE.Vector3(.95, .32, 2.3), R_T = .3;
  const put = (b, p) => { b.position.copy(p); S.add(b); const u = b.userData; u.shadow.position.set(p.x, .015, p.z); u.foot.position.set(p.x, .02, p.z); const k = Math.max(0, 1 - p.y / u.r) ; u.foot.scale.setScalar(Math.sqrt(Math.max(0, 1 - (p.y / u.r) ** 2)) || .001); u.shadow.scale.setScalar(.9 + k * .2); S.add(u.shadow, u.foot); return b; };
  const bH = put(makeBubble(R_H, PERSON), B_H), bB = put(makeBubble(R_B, INFO), P_B), bT = put(makeBubble(R_T, WARM), P_T); bT.userData.rim.material.uniforms.k.value = 2.2;
  const card = (kind, p, s) => { const m = new THREE.Mesh(new THREE.CircleGeometry(s, 48), new THREE.MeshBasicMaterial({ map: flowerTex(kind), transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })); m.position.copy(p); S.add(m); return m; };
  const seeH = card('human', B_H.clone().add(new THREE.Vector3(.5, .5, .25)), .24);
  const seeB = card('bee', P_B.clone().add(new THREE.Vector3(.08, .18, .16)), .19);
  // マダニに届くもの＝体温（温かさの細い輪が、ゆっくり脈打つ）
  const heat = new THREE.Group(); for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.05 + i * .045, .055 + i * .045, 64), new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: .8 - i * .22, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); heat.add(m); } heat.position.copy(P_T).add(new THREE.Vector3(-.08, .12, .12)); S.add(heat);

  const [U, C] = await Promise.all([import('./umwelt-3d.js?v=20261026w'), import('./kit/creatures.js')]);
  const person = U.makePerson(); person.scale.setScalar(.8); person.position.copy(P_H); person.rotation.y = .9; S.add(person);
  const bee = C.makeBee(); bee.scale.setScalar(.27); bee.position.copy(P_B).add(new THREE.Vector3(-.06, -.12, 0)); bee.rotation.y = -1.9; S.add(bee);
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(.005, .012, .36, 5), new THREE.MeshStandardMaterial({ color: 0x7d8a5a, roughness: .9 })); blade.position.set(P_T.x + .05, .18, P_T.z); S.add(blade);
  const tick = matte(U.makeTick(), 0x8a7a6a); tick.scale.setScalar(.18); tick.position.set(P_T.x + .05, .37, P_T.z); tick.rotation.set(-.9, .4, 0); S.add(tick);

  let aoi = null, mot = null, seeB2 = null, ringM = null, wave = null, flow = null, aoiLine = null;
  const FA = new THREE.Vector3(-2.45, .95, .95), FB = new THREE.Vector3(-1.72, .95, .62);
  if (SC === 2) {
    tree.position.set(.1, 0, -1.3); const mem = put(makeBubble(1.3, WARM), new THREE.Vector3(.1, 1.75, -1.3)); { const u1 = bH.userData.rim.material.uniforms, u2 = mem.userData.rim.material.uniforms; u1.oc.value.copy(mem.position); u1.orr.value = 1.3; u2.oc.value.copy(B_H); var lensU = [u1, u2]; mem.userData.rim.material.uniforms.k.value = 1.8; } bH.userData.foot.visible = false;
    seeB2 = card('bee', B_H.clone().add(new THREE.Vector3(1.0, .45, .3)), .22); seeB2.material.opacity = 0;
    { const pts = []; for (let i = 0; i <= 128; i++) { const q = i / 128 * 6.283; pts.push(new THREE.Vector3(Math.cos(q) * R_H, Math.sin(q) * R_H, 0)); }
      var ghost = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffe4da, dashSize: .08, gapSize: .05, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); ghost.computeLineDistances(); ghost.position.copy(B_H); S.add(ghost); }
    // 重なり（Qualium）を淡く灯す：人の泡とミツバチの泡のあいだのレンズの所
    var lens = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(168,242,246,.85)'); g.addColorStop(1, 'rgba(168,242,246,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); lens.position.set(-.55, 1.55, -.62); lens.scale.set(1.5, 2.1, 1); S.add(lens);
    ringM = new THREE.MeshBasicMaterial({ color: AOI, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.32, 192), ringM); ring.rotation.x = -Math.PI / 2; ring.position.set(-.3, .025, -.3); S.add(ring);
    wave = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 128), new THREE.MeshBasicMaterial({ color: AOI, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); wave.rotation.x = -Math.PI / 2; wave.position.set(FA.x, .03, FA.z); S.add(wave);
    // 碧から人へ：細い一本の光の線が伸びる（矢じりは付けない）
    aoiLine = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: AOI, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); S.add(aoiLine);
    var dot = new THREE.Mesh(new THREE.SphereGeometry(.08, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe8feff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); S.add(dot);
    (async () => { try {
      const [V, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('@pixiv/three-vrm'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const Ld = new GLTFLoader(); Ld.setMeshoptDecoder(MeshoptDecoder); Ld.register(p => new V.VRMLoaderPlugin(p));
      const g = await Ld.parseAsync((await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())))).slice(0), '');
      const v = g.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(g.scene); V.VRMUtils.rotateVRM0(v);
      const N = n => v.humanoid.getNormalizedBoneNode(n), set = (n, x, y, z) => { const o = N(n); if (o) o.rotation.set(x, y, z); };
      set('leftUpperArm', -.12, 0, -1.28); set('rightUpperArm', -.12, 0, 1.28); set('leftLowerArm', 0, -.28, 0); set('rightLowerArm', 0, .28, 0);
      v.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      v.scene.scale.setScalar(.9); v.scene.position.set(FA.x, 0, FA.z); v.scene.rotation.y = .55; S.add(v.scene); aoi = v; v.update(0);
      try { const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61'); mot = new AoiMotion(v, { root: v.scene, reducedMotion: reduce, wind: 0, faceViewer: false, startCalm: 0, posture: 'upright', uprightWeight: .9 }); } catch (e) { console.warn('aoi motion', e); }
      window.__aoi = 'ok';
    } catch (e) { console.warn('aoi', e); } })();
  }

  const AT = { hito: B_H.clone().add(new THREE.Vector3(-.3, R_H + .1, 0)), bee: P_B.clone().add(new THREE.Vector3(0, R_B + .08, 0)), tick: P_T.clone().add(new THREE.Vector3(0, R_T + .06, 0)),
    aoi: new THREE.Vector3(FA.x - .12, 1.45, FA.z), ghost: B_H.clone().add(new THREE.Vector3(-.2, R_H + .02, 0)), mem: new THREE.Vector3(.1, 3.15, -1.3), qualium: new THREE.Vector3(-.45, 1.6, -.7) };
  const labs = [...labsBox.querySelectorAll('[data-at]')], _v = new THREE.Vector3();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'v2-lead-svg'); svg.setAttribute('aria-hidden', 'true'); labsBox.prepend(svg);
  const BW = () => cv.clientWidth || 1, BH = () => cv.clientHeight || 1;
  const size = () => { R.setSize(BW(), BH(), false); cam.aspect = BW() / BH(); cam.fov = cam.aspect < 1 ? 44 : 32; cam.updateProjectionMatrix(); };
  size(); new ResizeObserver(size).observe(cv);
  const CT = new THREE.Vector3(-.35, 1.25, -.4);
  let last = performance.now(), t0 = null;
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now;
    { const r = root.getBoundingClientRect(); if (!(r.bottom > 0 && r.top < innerHeight) || document.hidden) return; } if (t0 === null) t0 = now;
    const t = now / 1000, el = (now - t0) / 1000;
    // カメラ：ゆっくり回り込む
    const a = reduce ? 0 : Math.sin(el * .07) * .28, D = (cam.aspect < 1 ? 8.2 : 9.6) * (SC === 2 ? 1.32 : 1);
    const cx = CT.x - (cam.aspect < 1 ? (SC === 2 ? .8 : .45) : 0); cam.position.set(cx + Math.sin(.3 + a) * D, CT.y + (SC === 2 ? 3.3 : 2.5), CT.z + Math.cos(.3 + a) * D); cam.lookAt(cx, CT.y + (SC === 2 ? .35 : 0), CT.z);
    if (!reduce) { bee.position.y = P_B.y - .12 + Math.sin(t * 2.2) * .025; person.userData.animate && person.userData.animate(t, false); heat.children.forEach((m, i) => { const s = 1 + ((t * .5 + i / 3) % 1) * .9; m.scale.setScalar(s); m.material.opacity = .8 * (1 - ((t * .5 + i / 3) % 1)); }); }
    heat.quaternion.copy(cam.quaternion); seeH.quaternion.copy(cam.quaternion); seeB.quaternion.copy(cam.quaternion); if (seeB2) seeB2.quaternion.copy(cam.quaternion);
    if (SC === 2) {
      const cy = reduce ? 6 : ((el + 2.6) % 11), w0 = Math.min(1, cy / 1.4), fu = Math.min(1, Math.max(0, (cy - .3) / .9));   // 11 秒ごと：碧の足もとから波 → 光の線が人へ → 届いた所から人の泡が広がり重なる（約 5 秒）→ 静かに戻る
      wave.scale.setScalar(.25 + w0 * 2.2); wave.material.opacity = reduce ? 0 : (cy < 1.4 ? .7 * (1 - w0) : 0);
      const tip = FA.clone().lerp(FB, Math.max(.001, fu)); { const L = FA.distanceTo(tip); aoiLine.scale.set(1, L, 1); aoiLine.position.copy(FA).lerp(tip, .5); aoiLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(FA).normalize()); } dot.position.copy(FA).lerp(FB, (el * .6) % 1); dot.material.opacity = reduce ? 0 : aoiLine.material.opacity; aoiLine.material.opacity = reduce ? .6 : (cy < 1.2 ? .9 : cy < 10 ? .55 : Math.max(0, .55 * (1 - (cy - 10))));
      const g = reduce ? 1 : (cy < 1.2 ? 0 : cy < 3.4 ? (cy - 1.2) / 2.2 : cy < 10 ? 1 : Math.max(0, 1 - (cy - 10))), e = g * g * (3 - 2 * g);
      bH.scale.setScalar(1 + e * .9); bH.userData.foot.scale.setScalar((1 + e) * Math.sqrt(Math.max(0, 1 - (B_H.y / R_H) ** 2))); bH.userData.shadow.scale.setScalar(1 + e);
      seeB2.material.opacity = e; ringM.opacity = .75 * e; ghost.material.opacity = e; lensU[0].ok.value = e; lensU[1].ok.value = e; lensU[1].orr.value = R_H * (1 + e * .9); ghost.quaternion.copy(cam.quaternion); lens.material.opacity = e * .35;
    }
    if (aoi) { try { if (mot) mot.update(dt, cam); else aoi.update(dt); } catch (e) { if (!frame.w) { frame.w = 1; console.warn('aoi update', e); } } }
    R.render(S, cam);
    // 札は図の左右の余白へ並べ、細い引き出し線で点へ結ぶ（絵の上に字を重ねない）
    const W = BW(), H = BH(), side = { L: [], R: [] };
    labs.forEach(lb => { const p = AT[lb.dataset.at]; if (!p) return; _v.copy(p).project(cam); const vis = _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05; lb.classList.toggle('on', vis); if (!vis) { lb._g && (lb._g.style.display = 'none'); return; }
      side[_v.x < 0 ? 'L' : 'R'].push({ lb, px: (_v.x + 1) / 2 * W, py: (1 - _v.y) / 2 * H }); });
    const all = [...side.L, ...side.R];
    if (W < 520) {   // スマホ：図の中には番号の点だけ、札は図の下に二列で（線を交差させない）
      all.sort((p, q) => p.px - q.px); let rowH = 0;
      all.forEach((o, i) => { const w = (W - 12) / 2; o.lb.style.width = (w - 8) + 'px'; o.lb.dataset.n = i + 1; rowH = Math.max(rowH, o.lb.offsetHeight + 8); });
      all.forEach((o, i) => { const x = 4 + (i % 2) * (W - 12) / 2, y = H + 10 + Math.floor(i / 2) * rowH; o.lb.style.transform = `translate3d(${x | 0}px,${y | 0}px,0)`;
        if (!o.lb._g) { o.lb._g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); o.lb._g.innerHTML = '<polyline fill="none"/><circle r="2.4"/><text text-anchor="middle"></text>'; o.lb._g.style.color = o.lb.style.getPropertyValue('--c') || '#a8f2f6'; svg.appendChild(o.lb._g); }
        const g = o.lb._g; g.style.display = ''; g.children[0].setAttribute('points', ''); g.children[1].setAttribute('r', 8); g.children[1].setAttribute('cx', o.px); g.children[1].setAttribute('cy', o.py - 12); g.children[2].textContent = i + 1; g.children[2].setAttribute('x', o.px); g.children[2].setAttribute('y', o.py - 8.5); });
      cv.parentElement.style.marginBottom = (Math.ceil(all.length / 2) * rowH + 10) + 'px'; root.classList.add('nar');
    } else {
    root.classList.remove('nar'); cv.parentElement.style.marginBottom = '';
    for (const k of ['L', 'R']) { const arr = side[k].sort((a, b) => a.py - b.py); let y = 10;
      arr.forEach(o => { const w = o.lb.offsetWidth, h = o.lb.offsetHeight; if (W >= 520) y = Math.max(y, Math.min(H - h - 10, o.py - h - 18)); /* スマホは上の空に二列で並べる */ const x = k === 'L' ? 10 : W - w - 10;
        o.lb.style.transform = `translate3d(${x | 0}px,${y | 0}px,0)`;
        if (!o.lb._g) { o.lb._g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); o.lb._g.innerHTML = '<polyline fill="none"/><circle r="2.4"/><text></text>'; o.lb._g.style.color = o.lb.style.getPropertyValue('--c') || '#a8f2f6'; svg.appendChild(o.lb._g); }
        o.lb._g.style.display = ''; const nar = W < 520, ax = nar ? x + w * (k === 'L' ? .3 : .7) : (k === 'L' ? x + w + 4 : x - 4), ay = nar ? y + h + 3 : y + h * .55, ex = nar ? ax : (k === 'L' ? ax + 14 : ax - 14);
        o.lb._g.children[0].setAttribute('points', `${ax},${ay} ${ex},${ay} ${o.px},${o.py}`); o.lb._g.children[1].setAttribute('cx', o.px); o.lb._g.children[1].setAttribute('cy', o.py);
        y += h + 12; }); }
    }
  }
  requestAnimationFrame(frame); root.classList.add('on3d'); window.__v2 = 'ok';
}
