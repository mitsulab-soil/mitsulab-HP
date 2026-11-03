// 研究タブの模式の 3D（2026-11-03）。画面に入ったときだけ描き、離れたら止める。スマホ（細い画面・粗い指先）は 1 こまだけ描く静止画。
import * as THREE from 'three';
const AOI = 0xa8f2f6, INK = 0xdfe8ec, DIM = 0x55707a;
const mobile = matchMedia('(max-width:768px), (pointer:coarse)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function label(text, color = '#dfe8ec', size = 28) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `${size}px "Noto Sans JP", sans-serif`; const w = Math.ceil(g.measureText(text).width) + 12;
  c.width = w; c.height = size + 12; g.font = `${size}px "Noto Sans JP", sans-serif`; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, 6, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  const k = 0.0085; s.scale.set(c.width * k, c.height * k, 1); return s;
}
const line = (pts, color, opacity = 1) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));

// 1. 見える光の帯（nm）。人 約 400–700、ミツバチ 約 300–650（紫外が見え、赤は見えにくい）、多くの鳥 約 300–700（紫外を含む）。
function bands(scene) {
  const nm = x => (x - 500) / 60; // 300→-3.33, 700→3.33
  const rows = [['人', 400, 700, 0], ['ミツバチ', 300, 650, 1], ['多くの鳥', 300, 700, 2]];
  const grp = new THREE.Group();
  rows.forEach(([n, a, b, i]) => {
    const z = (i - 1) * 1.1, w = nm(b) - nm(a);
    const geo = new THREE.BoxGeometry(w, 0.32, 0.5, 64, 1, 1); const col = []; const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k) + (nm(a) + nm(b)) / 2, l = x * 60 + 500; const c = new THREE.Color();
      if (l < 400) c.setHSL(0.78, 0.6, 0.55); else c.setHSL(0.75 - (Math.min(l, 700) - 400) / 300 * 0.75, 0.75, 0.55); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 }));
    m.position.set((nm(a) + nm(b)) / 2, 0, z); grp.add(m);
    const L = label(n); L.position.set(nm(300) - 0.9, 0, z); grp.add(L);
  });
  [300, 400, 500, 600, 700].forEach(v => { grp.add(line([new THREE.Vector3(nm(v), -0.2, -1.6), new THREE.Vector3(nm(v), -0.2, 1.6)], DIM, .5));
    const L = label(v + ' nm', '#8fb0b8', 22); L.position.set(nm(v), -0.45, 1.9); grp.add(L); });
  const U = label('紫外', '#c9a8f6', 24); U.position.set(nm(340), 0.55, -1.6); grp.add(U);
  scene.add(grp); return t => { grp.rotation.y = Math.sin(t * 0.3) * 0.25; };
}
// 2. 方角を振動で知らせるベルト（模式）。腰を囲む振動子のうち、北に近いものだけが震える。
function belt(scene) {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.09, 12, 96), new THREE.MeshStandardMaterial({ color: 0x2a3c44, roughness: .8 })));
  const motors = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.12), new THREE.MeshStandardMaterial({ color: 0x6f8a92, emissive: AOI, emissiveIntensity: 0 }));
    m.position.set(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0); m.rotation.z = a; grp.add(m); motors.push([m, a]); }
  grp.rotation.x = -Math.PI / 2.4; scene.add(grp);
  const N = label('北', '#a8f2f6', 30); N.position.set(0, 0.6, -2.5); scene.add(N);
  scene.add(line([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.3)], AOI, .6));
  return t => { grp.rotation.z = Math.sin(t * 0.25) * 1.2; // 人が向きを変える
    motors.forEach(([m, a]) => { const w = a + grp.rotation.z; const d = Math.abs(Math.atan2(Math.sin(w + Math.PI / 2), Math.cos(w + Math.PI / 2)));
      const on = d < 0.3; m.material.emissiveIntensity = on ? 1.2 : 0; m.position.z = on ? Math.sin(t * 60) * 0.03 : 0; }); };
}
// 3. 聴こえない音を聴こえる高さに移す（模式）。コウモリの声（例 40 kHz）を 1/10 にして 4 kHz に。人の可聴域 約 20 Hz–20 kHz。
function shift(scene) {
  const f = k => Math.log10(k) * 1.6 - 3.2; // kHz を対数の位置に
  const grp = new THREE.Group();
  const band = new THREE.Mesh(new THREE.BoxGeometry(f(20) - f(0.02), 0.06, 1.6), new THREE.MeshStandardMaterial({ color: 0x2b5a62, transparent: true, opacity: .55 }));
  band.position.set((f(20) + f(0.02)) / 2, -0.6, 0); grp.add(band);
  const L1 = label('人に聴こえる高さ（約 20 Hz–20 kHz）', '#8fb0b8', 22); L1.position.set((f(20) + f(0.02)) / 2, -0.95, 1.1); grp.add(L1);
  const mk = (k, y) => { const pts = []; for (let i = 0; i <= 80; i++) { const z = -0.8 + i / 50; pts.push(new THREE.Vector3(f(k) + Math.sin(i * (k > 10 ? 2.2 : 0.6)) * 0.18, y, z)); } return line(pts, AOI); };
  const hi = mk(40, 0.6), lo = mk(4, -0.5); grp.add(hi, lo);
  const a = label('コウモリの声 40 kHz', '#dfe8ec', 24); a.position.set(f(40), 1.0, 0); grp.add(a);
  const b = label('1/10 にすると 4 kHz', '#a8f2f6', 24); b.position.set(f(4), 0.05, 0.9); grp.add(b);
  const ar = line([new THREE.Vector3(f(40), 0.5, 0), new THREE.Vector3(f(4), -0.4, 0)], INK, .5); grp.add(ar);
  [0.1, 1, 10, 100].forEach(k => { const L = label(k < 1 ? k * 1000 + ' Hz' : k + ' kHz', '#6f8a92', 20); L.position.set(f(k), -1.3, -1); grp.add(L); });
  scene.add(grp); return t => { grp.rotation.y = Math.sin(t * 0.3) * 0.3; hi.position.y = Math.sin(t * 3) * 0.02; };
}
// 4. 木の根と菌根菌の菌糸（模式）。根と菌がつながることは確か、木どうしで何をどれだけ運ぶかは論争中。
function soil(scene) {
  const grp = new THREE.Group(); const brown = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: .9 });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.04, 2.4), new THREE.MeshStandardMaterial({ color: 0x3a2c22, transparent: true, opacity: .5 }));
  ground.position.y = 0.9; grp.add(ground);
  const tips = [];
  [-1.7, 1.7].forEach((x, ti) => { const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 10), brown); trunk.position.set(x, 1.6, 0); grp.add(trunk);
    for (let r = 0; r < 7; r++) { const a = r / 7 * Math.PI * 2; const pts = []; let p = new THREE.Vector3(x, 0.9, 0);
      for (let s = 0; s < 6; s++) { pts.push(p.clone()); p = p.clone().add(new THREE.Vector3(Math.cos(a) * 0.22, -0.2, Math.sin(a) * 0.18)); }
      grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.03, 5), brown)); tips.push([p, ti]); } });
  const rnd = (i => () => (i = (i * 16807) % 2147483647) / 2147483647)(7);
  const hy = new THREE.LineBasicMaterial({ color: 0xe8e2c8, transparent: true, opacity: .45 }); const disputed = [];
  for (let i = 0; i < 70; i++) { const [p] = tips[Math.floor(rnd() * tips.length)]; const q = p.clone().add(new THREE.Vector3((rnd() - .5) * 1.4, (rnd() - .5) * 0.5, (rnd() - .5) * 1.0));
    grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, q]), hy)); }
  tips.filter(t => t[1] === 0).slice(0, 3).forEach(([p], i) => { const q = tips.filter(t => t[1] === 1)[i][0]; const m = new THREE.Vector3().addVectors(p, q).multiplyScalar(.5); m.y -= 0.3;
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(p, m, q).getPoints(30)), new THREE.LineDashedMaterial({ color: AOI, dashSize: .08, gapSize: .08, transparent: true, opacity: .8 }));
    l.computeLineDistances(); grp.add(l); disputed.push(l); });
  const A = label('根と菌のつながり＝確か', '#e8e2c8', 22); A.position.set(-1.7, -0.6, 1.2); grp.add(A);
  const B = label('木どうしで何を運ぶか＝論争中', '#a8f2f6', 22); B.position.set(1.3, -0.9, 1.2); grp.add(B);
  grp.position.y = -0.5; scene.add(grp);
  return t => { grp.rotation.y = Math.sin(t * 0.25) * 0.35; disputed.forEach(l => l.material.opacity = .45 + Math.sin(t * 2) * .35); };
}
const MAKERS = { bands, belt, shift, soil };

function mount(el) {
  const make = MAKERS[el.dataset.fig]; if (!make) return;
  const cv = el.querySelector('canvas'); let r, scene, cam, step, live = false, raf = 0, t0 = performance.now();
  function init() {
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: !mobile, alpha: true, powerPreference: 'low-power' });
    r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2)); r.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(36, 1, 0.1, 50); cam.position.set(0, 2.2, 8.2); cam.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xdff6ff, 0x1a2228, 1.4)); const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(3, 5, 4); scene.add(d);
    step = make(scene); size();
  }
  function size() { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !r) return; r.setSize(w, h, false); cam.aspect = w / h;
    cam.position.z = 8.2 * Math.max(1, 2.4 / (w / h)); cam.updateProjectionMatrix(); }
  function frame() { if (!live) return; step((performance.now() - t0) / 1000); r.render(scene, cam); raf = requestAnimationFrame(frame); }
  function still() { step(1.2); r.render(scene, cam); }
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { if (!r) init(); if (mobile || reduce) { still(); return; } if (!live) { live = true; frame(); } }
    else { live = false; cancelAnimationFrame(raf); }
  }), { rootMargin: '80px' }).observe(el);
  addEventListener('resize', () => { if (r) { size(); if (!live) still(); } });
}
function start() { document.querySelectorAll('#research .rs-fig').forEach(mount); }
// 研究タブが開くまで何もしない（TOP の読み込みを重くしない）
const sec = document.getElementById('research');
if (sec) { if (sec.classList.contains('active')) start();
  else { const mo = new MutationObserver(() => { if (sec.classList.contains('active')) { mo.disconnect(); start(); } }); mo.observe(sec, { attributes: true, attributeFilter: ['class'] }); } }
