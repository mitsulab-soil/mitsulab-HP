/* © mitsulab. 環世界 2.0 のスケールの軸（2026-10-27）：一つの場所（中央の円）から、上へ大きく（ハイパーオブジェクト＝都市・流域・気候・時間の積み重なり）、下へ小さく（マイクロオブジェクト＝土の粒・菌糸・細胞・分子）。
   模式。大きさの比は実際の比ではなく、段ごとに桁が変わることを示す。光の線と粒だけ・後処理なし・見えないあいだは止める。 */
import * as THREE from 'three';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('[data-sax]').forEach(f => { const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); try { boot(f); } catch (e) { console.warn('sax', e); } } }, { rootMargin: '300px 0px' }); o.observe(f); });
function boot(root) {
  const cv = root.querySelector('canvas'), labs = [...root.querySelectorAll('[data-y]')];
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); R.setClearColor(0x03060f, 1);
  const S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, .1, 100);
  const add = (geo, color, op) => { const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }); const l = new THREE.LineLoop(geo, m); S.add(l); return l; };
  const ring = (r, n = 128) => { const p = []; for (let i = 0; i < n; i++) { const a = i / n * 6.283; p.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); } return new THREE.BufferGeometry().setFromPoints(p); };
  // 中央：いま・ここの場所（人の身体の大きさ）
  const place = add(ring(.55), 0xa8f2f6, .95); const place2 = add(ring(.62), 0xa8f2f6, .35);
  // 上：大きく（等高線のように広がる輪。上ほど大きく淡く）
  const up = [[.75, .95, 0xd9b382], [1.35, 1.55, 0x8fb6dc], [1.95, 2.15, 0x88b68f], [2.55, 2.75, 0xe9d7b0]];
  const ups = up.map(([y, r, c], i) => { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const l = add(ring(r * (1 - k * .06) + Math.sin(k) * .02), c, .5 - k * .14); l.position.y = 0; g.add(l); } g.position.y = y; S.add(g); return g; });
  // 下：小さく（粒・糸・細胞・分子。下ほど小さく細かい）
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  let sd = 7; const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  const cloud = (y, r, n, size, c) => { const p = []; for (let i = 0; i < n; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r; p.push(Math.cos(a) * d, y + (rnd() - .5) * .18, Math.sin(a) * d); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); const pt = new THREE.Points(g, new THREE.PointsMaterial({ map: dot, color: c, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); S.add(pt); return pt; };
  cloud(-.75, .42, 70, .09, 0xd6c09b);            // 土の粒（団粒）
  { const p = []; for (let i = 0; i < 14; i++) { let x = (rnd() - .5) * .5, z = (rnd() - .5) * .5, y = -1.35; for (let s = 0; s < 6; s++) { const nx = x + (rnd() - .5) * .14, nz = z + (rnd() - .5) * .14, ny = y + (rnd() - .5) * .08; p.push(x, y, z, nx, ny, nz); x = nx; z = nz; y = ny; } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); S.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xeef3d8, transparent: true, opacity: .6, blending: THREE.AdditiveBlending }))); } // 菌糸
  for (let i = 0; i < 7; i++) { const l = add(ring(.05 + rnd() * .03, 24), 0x88b68f, .8); l.position.set((rnd() - .5) * .3, -1.9, (rnd() - .5) * .3); } // 細胞
  cloud(-2.45, .12, 40, .045, 0xc4b6ff);           // 分子
  // 縦の光：マクロとミクロを一つの場所でつなぐ
  { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2.7, 0), new THREE.Vector3(0, 3.1, 0)]); S.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe2a6, transparent: true, opacity: .7, blending: THREE.AdditiveBlending }))); }
  const flow = cloud(0, .01, 30, .07, 0xffe2a6); const fp = flow.geometry.attributes.position;
  const size = () => { const w = cv.clientWidth || 1, h = cv.clientHeight || 1; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = cam.aspect < 1 ? 40 : 32; cam.updateProjectionMatrix(); };
  size(); new ResizeObserver(size).observe(cv); const _v = new THREE.Vector3();
  function frame(now) { requestAnimationFrame(frame); const r = root.getBoundingClientRect(); if (!(r.bottom > 0 && r.top < innerHeight) || document.hidden) return;
    const t = reduce ? 0 : now / 1000, a = .6 + t * .08; cam.position.set(Math.sin(a) * 9.6, 3.4, Math.cos(a) * 9.6); cam.lookAt(0, .15, 0);
    ups.forEach((g, i) => { g.rotation.y = t * (.04 + i * .01); });
    for (let i = 0; i < 30; i++) { const u = reduce ? i / 30 : (t * .12 + i / 30) % 1; fp.setXYZ(i, 0, -2.7 + u * 5.8, 0); } fp.needsUpdate = true;
    R.render(S, cam);
    const W = cv.clientWidth, Hh = cv.clientHeight; labs.forEach(lb => { _v.set(0, +lb.dataset.y, 0).project(cam); lb.style.transform = `translate3d(0,${((1 - _v.y) / 2 * Hh - 10) | 0}px,0)`; });
  }
  requestAnimationFrame(frame); root.classList.add('on3d');
}
