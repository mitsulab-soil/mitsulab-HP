/* © mitsulab. HP v4b（2026-10-26 夜 本人「複雑性はいらないので、概念がシンプルかつ正確に伝わるような 3D グラフィックに。本質を捉えて」）
   節ごとの 3D（.v2-fig[data-fig]）。矢印・網・糸・粒は使わない。一目で分かる大きな形＝「泡」（その生き物が感じとれる範囲・模式）。
   1.0：同じ一本の木と一輪の花のそばで、人・ミツバチ・マダニがそれぞれ自分の泡の中にいる。泡の中には、その生き物に届く姿だけを描く。
        人＝花の色と形／ミツバチ＝紫外線の模様（蜜のありかを示す花の中心の濃い模様。人の目には見えない）／マダニ＝花は届かず、酪酸のにおいと体温（通りかかる動物）だけ。
   2.0：人の泡が碧（環境エージェント）を介して広がり、ミツバチの泡と場所の記憶の泡に重なる。重なった所に、ミツバチの花の見え方が人の世界にも現れる。その重なる場＝Qualium（地の輪）。 */
import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = Math.min(innerWidth, innerHeight) < 700;
function hasGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!hasGL()) document.documentElement.classList.add('v2-no3d');
else document.querySelectorAll('.v2-fig').forEach(f => { const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); boot(f, +f.dataset.fig).catch(e => { console.warn('umwelt-figs', e); f.classList.add('no3d'); }); } }, { rootMargin: '500px 0px' }); o.observe(f); });

// 泡：縁だけが光る球（フレネル）。中は透けて、生き物と見え方が見える
function bubbleMat(hex, k = 1) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { c: { value: new THREE.Color(hex) }, k: { value: k } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 p = modelViewMatrix * vec4(position,1.); n = normalize(normalMatrix * normal); v = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
    fragmentShader: 'uniform vec3 c; uniform float k; varying vec3 n; varying vec3 v; void main(){ float f = pow(1. - abs(dot(n, v)), 2.6); gl_FragColor = vec4(c * (0.05 + 1.15 * f) * k, 1.); }' });
}
// 花の見え方（上から見た一輪を 2D で描く）。human＝黄の花びら・bee＝紫外線で見える中心の濃い模様（模式の色）
function flowerTex(kind) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.translate(S / 2, S / 2);
  for (let i = 0; i < 6; i++) { x.save(); x.rotate(i / 6 * Math.PI * 2); const g = x.createLinearGradient(0, 0, 0, -118);
    if (kind === 'human') { g.addColorStop(0, '#f2c440'); g.addColorStop(1, '#ffe27a'); } else { g.addColorStop(0, '#2a1250'); g.addColorStop(.42, '#3b1d6e'); g.addColorStop(.46, '#b9a6ff'); g.addColorStop(1, '#d9ccff'); }
    x.fillStyle = g; x.beginPath(); x.ellipse(0, -62, 30, 58, 0, 0, Math.PI * 2); x.fill();
    if (kind === 'bee') { x.strokeStyle = '#2a1250'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -20); x.lineTo(0, -70); x.stroke(); }
    x.restore(); }
  x.fillStyle = kind === 'human' ? '#9a6a1a' : '#1a0838'; x.beginPath(); x.arc(0, 0, 22, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }

async function boot(root, SC) {
  const cv = root.querySelector('canvas'), labsBox = root.querySelector('.v2-labs');
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75)); R.setClearColor(0x03060f, 1); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  const S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, .05, 200);
  S.add(new THREE.HemisphereLight(0xdfeeff, 0x1a1712, 1.5)); const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.set(-4, 7, 5); S.add(sun);
  const GL = glowTex();

  // 地（暗い円・縁はぼかす）
  { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, '#2a3a3c'); g.addColorStop(.6, '#142024'); g.addColorStop(1, 'rgba(3,6,15,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; S.add(m); }
  // 同じ風景：一本の木（落ち着いた色）と一輪の花
  const scene0 = new THREE.Group(); S.add(scene0);
  { const bark = new THREE.MeshStandardMaterial({ color: 0x5d4a3a, roughness: .95 }), leaf = new THREE.MeshStandardMaterial({ color: 0x4f6e4c, roughness: .9 });
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.16, .26, 2.6, 10), bark); tr.position.set(.4, 1.3, -2.6); scene0.add(tr);
    [[.4, 3.0, -2.6, 1.25], [-.35, 2.6, -2.4, .85], [1.1, 2.5, -2.5, .9], [.5, 2.3, -2.0, .8]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), leaf); s.position.set(x, y, z); scene0.add(s); });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.02, .025, .55, 6), new THREE.MeshStandardMaterial({ color: 0x5d7a3e })); stem.position.set(.55, .27, .1); scene0.add(stem);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), new THREE.MeshStandardMaterial({ map: flowerTex('human'), transparent: true, side: THREE.DoubleSide, roughness: .7 })); fl.position.set(.55, .56, .1); fl.rotation.x = -1.05; scene0.add(fl); }
  const FLOWER = new THREE.Vector3(.55, .56, .1);

  // 主体と泡
  const P_H = new THREE.Vector3(-1.7, 0, .6), B_H = new THREE.Vector3(-1.7, 1.25, .6), R_H = 1.3;
  const P_B = new THREE.Vector3(1.05, .95, .55), R_B = .62;
  const P_T = new THREE.Vector3(1.0, .4, 2.5), R_T = .3;
  const bub = (p, r, hex, k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), bubbleMat(hex, k)); m.position.copy(p); S.add(m); return m; };
  const bH = bub(B_H, R_H, 0xf4aa96, 1), bB = bub(P_B, R_B, 0xb7a2ff, 1.1), bT = bub(P_T, R_T, 0xf0a060, 1.2);
  // 泡の中に、その生き物に届く姿
  const card = (kind, p, s) => { const m = new THREE.Mesh(new THREE.CircleGeometry(s, 40), new THREE.MeshBasicMaterial({ map: flowerTex(kind), transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); m.position.copy(p); S.add(m); return m; };
  const seeH = card('human', B_H.clone().add(new THREE.Vector3(.55, .55, .3)), .28);
  const seeB = card('bee', P_B.clone().add(new THREE.Vector3(.12, .2, .18)), .2);
  // マダニ：花は届かない。届くのは酪酸のにおいと体温＝通りかかる動物の温かさ（橙の光・模式）
  const warm = new THREE.Sprite(new THREE.SpriteMaterial({ map: GL, color: 0xff8a4a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); warm.position.copy(P_T).add(new THREE.Vector3(-.12, .1, .05)); warm.scale.setScalar(.26); S.add(warm);

  // 生き物（共通の形）
  const [U, C] = await Promise.all([import('./umwelt-3d.js?v=20261026w'), import('./kit/creatures.js')]);
  const person = U.makePerson(); person.scale.setScalar(.82); person.position.copy(P_H); person.rotation.y = .9; S.add(person);
  const bee = C.makeBee(); bee.scale.setScalar(.3); bee.position.copy(P_B).add(new THREE.Vector3(-.05, -.12, 0)); bee.rotation.y = -1.9; S.add(bee);
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(.006, .014, .4, 5), new THREE.MeshStandardMaterial({ color: 0x6f7a3e })); blade.position.set(P_T.x + .06, .2, P_T.z); S.add(blade);
  const tick = U.makeTick(); tick.scale.setScalar(.2); tick.position.set(P_T.x + .06, .42, P_T.z); tick.rotation.set(-.9, .4, 0); S.add(tick);

  // 2.0：人の泡が広がる・碧・場所の記憶の泡・Qualium の地の輪
  let aoi = null, mot = null, grow = SC === 2 ? 0 : -1, memB = null, seeB2 = null, ring = null, ringM = null;
  if (SC === 2) {
    memB = bub(new THREE.Vector3(.4, 2.6, -2.5), 1.5, 0xe8c27a, 1.4);
    // 場所の記憶：木の幹に重なる年輪（模式）
    { const g = new THREE.Group(); for (let i = 1; i <= 5; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(i * .14, i * .14 + .025, 48), new THREE.MeshBasicMaterial({ color: 0xf6e2b0, transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); g.add(m); } g.position.set(.4, 2.1, -1.95); S.add(g); }
    seeB2 = card('bee', B_H.clone().add(new THREE.Vector3(1.05, .5, .35)), .24); seeB2.material.opacity = 0;
    ringM = new THREE.MeshBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.52, 128), ringM); ring.rotation.x = -Math.PI / 2; ring.position.set(-.3, .02, -.4); S.add(ring);
    // 碧（共通の aoi.vrm と AoiMotion）
    (async () => { try {
      const [V, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('@pixiv/three-vrm'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const Ld = new GLTFLoader(); Ld.setMeshoptDecoder(MeshoptDecoder); Ld.register(p => new V.VRMLoaderPlugin(p));
      const g = await Ld.parseAsync((await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())))).slice(0), '');
      const v = g.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(g.scene); V.VRMUtils.rotateVRM0(v);
      const N = n => v.humanoid.getNormalizedBoneNode(n), set = (n, x, y, z) => { const o = N(n); if (o) o.rotation.set(x, y, z); };
      set('leftUpperArm', -.12, 0, -1.28); set('rightUpperArm', -.12, 0, 1.28); set('leftLowerArm', 0, -.28, 0); set('rightLowerArm', 0, .28, 0);
      v.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      v.scene.scale.setScalar(.92); v.scene.position.set(-2.85, 0, 1.05); v.scene.rotation.y = .55; S.add(v.scene); aoi = v; v.update(0);
      try { const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61'); mot = new AoiMotion(v, { root: v.scene, reducedMotion: reduce, wind: 0, faceViewer: false, startCalm: 0, posture: 'upright', uprightWeight: .9 }); } catch (e) { console.warn('aoi motion', e); }
      window.__aoi = 'ok';
    } catch (e) { console.warn('aoi', e); } })();
  }

  // 札：data-at の点に置く（少なく）
  const AT = { hito: B_H.clone().add(new THREE.Vector3(-.2, R_H + .05, 0)), bee: P_B.clone().add(new THREE.Vector3(0, R_B + .05, 0)), tick: P_T.clone().add(new THREE.Vector3(0, R_T + .02, 0)), place: new THREE.Vector3(.4, 3.9, -2.6),
    aoi: new THREE.Vector3(-2.85, 1.75, 1.05), mem: new THREE.Vector3(.4, 4.0, -2.5), qualium: P_B.clone().add(new THREE.Vector3(-.75, .35, .1)), wide: B_H.clone().add(new THREE.Vector3(1.4, 1.6, 0)) };
  const labs = [...labsBox.querySelectorAll('[data-at]')], _v = new THREE.Vector3();
  const BW = () => cv.clientWidth || 1, BH = () => cv.clientHeight || 1;
  const size = () => { R.setSize(BW(), BH(), false); cam.aspect = BW() / BH(); cam.fov = cam.aspect < 1 ? 50 : 36; cam.updateProjectionMatrix(); };
  size(); new ResizeObserver(size).observe(cv);
  const CT = new THREE.Vector3(-.4, 1.3, -.3);
  let visible = true, last = performance.now(), t0 = null;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && t0 === null) t0 = performance.now(); }).observe(root);
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; if (!visible || document.hidden) return;
    const t = now / 1000, el = t0 === null ? 0 : (now - t0) / 1000;
    const a = reduce ? 0 : Math.sin(t * .12) * .22, D = (cam.aspect < 1 ? 7.6 : 9.2) * (SC === 2 ? 1.3 : 1);
    cam.position.set(CT.x + Math.sin(.32 + a) * D, CT.y + (SC === 2 ? 3.4 : 2.6), CT.z + Math.cos(.32 + a) * D); cam.lookAt(CT.x, CT.y + (SC === 2 ? .5 : 0), CT.z);
    if (!reduce) { bee.position.y = P_B.y - .12 + Math.sin(t * 2.2) * .03; person.userData.animate && person.userData.animate(t, false); }
    if (SC === 2) { const g = reduce ? 1 : Math.min(1, Math.max(0, (el - .8) / 2.6)), e = g * g * (3 - 2 * g); bH.scale.setScalar(1 + e * .85); seeB2.material.opacity = e; ringM.opacity = .9 * e; bH.material.uniforms.k.value = 1 - e * .35; }
    if (aoi) { try { if (mot) mot.update(dt, cam); else aoi.update(dt); } catch (e) { if (!frame.w) { frame.w = 1; console.warn('aoi update', e); } } }
    R.render(S, cam);
    const W = BW(), H = BH(), placed = [];
    labs.forEach(lb => { const p = AT[lb.dataset.at]; if (!p) return; _v.copy(p).project(cam); const vis = _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1; lb.classList.toggle('on', vis); if (!vis) return;
      const w = lb.offsetWidth, h = lb.offsetHeight; let x = Math.max(4, Math.min(W - w - 4, (_v.x + 1) / 2 * W - 8)), y = Math.max(4, Math.min(H - h - 4, (1 - _v.y) / 2 * H - h - 2));
      for (let k = 0; k < 12 && placed.some(r => x < r[2] && r[0] < x + w && y < r[3] && r[1] < y + h); k++) y = Math.max(4, Math.min(H - h - 4, y + (k % 2 ? -1 : 1) * (h + 4) * Math.ceil((k + 1) / 2)));
      placed.push([x, y, x + w, y + h]); lb.style.transform = `translate3d(${x | 0}px,${y | 0}px,0)`; });
  }
  requestAnimationFrame(frame); root.classList.add('on3d'); window.__v2 = 'ok';
}
