// PHILOSOPHY の 3D（2026-10-23 本人「環境と主体のあいだに、Qualia がある。に 3D のグラフィックを入れて分かりやすく」）
// 下＝環境エージェント E（場所：石畳の一区画・等高線・記録の柱・内部モデルの小さな網）。上＝主体エージェント S（人・ミツバチ・コウモリ・機械の四つの輪）。
// そのあいだを結ぶ線と粒＝関係の形 Φ。各主体の下に、その主体にだけ立ち上がる一枚＝Qualia q。同じ E から、S ごとに違う q が立つことを一目で。
// ・線と点は共通部品 _共通3D/kit/layers.js（js/kit/layers.js は公開用の写し）。形は模式で、実測の値ではない
// ・画面に近づいてから読む・画面の外とタブを隠したときは止める・動きを減らす設定では一こまだけ描く・スマホは画素 1・粒を減らす
import * as THREE from 'three';
import { lineMaterial, pointMaterial, contours, pillars } from './kit/layers.js';

const SUBJ = [
  { key: 'hito', c: 0xf4aa96 },
  { key: 'hachi', c: 0xc4b2ff },
  { key: 'komori', c: 0x78b8ec },
  { key: 'kikai', c: 0xc2c7cc },
];
const E_C = 0x5fb8d0;

export function boot(fig) {
  const stage = fig.querySelector('[data-es3d]');
  const mobile = innerWidth < 700 || matchMedia('(pointer:coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas'); cv.className = 'qp-es-cv'; cv.setAttribute('aria-hidden', 'true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: !mobile, powerPreference: 'low-power' }); }
  catch (e) { fig.classList.add('no-3d'); return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5));
  R.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(cv);

  const S = new THREE.Scene();
  S.fog = new THREE.Fog(0x03060f, 14, 30);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 60);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(3, 6, 5); S.add(key);
  const g = new THREE.Group(); S.add(g);
  const geo = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };

  // ── E：環境エージェント（場所） ──
  const RAD = 3.1;
  {
    const tl = new THREE.TextureLoader();
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 3);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, color: 0x9aa5a8, transparent: true, depthWrite: false });
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
    const gr = ax.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.55, '#ddd'); gr.addColorStop(.85, '#333'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
    mat.alphaMap = new THREE.CanvasTexture(ac);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RAD * 1.15, 64), mat); m.rotation.x = -Math.PI / 2; g.add(m);
  }
  // 等高線（ゆるい起伏の模式）。円の外の線は落とす
  const hAt = (x, z) => .32 * Math.exp(-((x - .6) ** 2 + (z + .3) ** 2) / 3.2) + .12 * Math.exp(-((x + 1.4) ** 2 + (z - .8) ** 2) / 1.4);
  {
    const cl = contours(hAt, { x0: -RAD, x1: RAD, z0: -RAD, z1: RAD, cell: .16, step: .06, lift: .02, color: E_C, opacity: .55 });
    const p = cl.geometry.attributes.position.array, keep = [];
    for (let i = 0; i < p.length; i += 6) if (Math.hypot(p[i], p[i + 2]) < RAD * .92 && Math.hypot(p[i + 3], p[i + 5]) < RAD * .92) keep.push(...p.slice(i, i + 6));
    cl.geometry.dispose(); cl.geometry = geo(keep); g.add(cl);
    const ring = []; for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2, b = (k + 1) / 96 * Math.PI * 2; ring.push(Math.cos(a) * RAD, .01, Math.sin(a) * RAD, Math.cos(b) * RAD, .01, Math.sin(b) * RAD); }
    g.add(new THREE.LineSegments(geo(ring), lineMaterial(E_C, .35)));
  }
  // 記録と典拠の柱（模式の位置）
  const SRC = [[-1.9, .6], [-.7, -1.6], [.9, 1.5], [1.9, -.9], [-.2, .2]].map(([x, z]) => [x, hAt(x, z), z]);
  g.add(pillars(SRC, { height: .9, color: 0xb4a2ff, opacity: .55 }));
  // 内部モデル（場所の見取り図）＝中央の小さな網
  const model = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(.42, 1)), lineMaterial(E_C, .6));
  model.position.set(-.2, 1.45, .2); g.add(model);

  // ── S：主体エージェント ──
  const SY = 4.6, SX = [-3.15, -1.05, 1.05, 3.15];
  const subj = SUBJ.map((s, i) => {
    const grp = new THREE.Group(); grp.position.set(SX[i], SY, 0); g.add(grp);
    const ring = []; for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2, b = (k + 1) / 64 * Math.PI * 2; ring.push(Math.cos(a) * .42, 0, Math.sin(a) * .42, Math.cos(b) * .42, 0, Math.sin(b) * .42); }
    const rm = lineMaterial(s.c, .8); grp.add(new THREE.LineSegments(geo(ring), rm));
    const dm = pointMaterial(s.c, .32, 1); grp.add(new THREE.Points(geo([0, 0, 0]), dm));
    // q：この主体にだけ立つ一枚（主体の少し下）
    const qm = new THREE.MeshBasicMaterial({ color: s.c, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const q = new THREE.Mesh(new THREE.CircleGeometry(.62, 48), qm); q.rotation.x = -Math.PI / 2; q.position.y = -.62; grp.add(q);
    const qe = []; for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2, b = (k + 1) / 64 * Math.PI * 2; qe.push(Math.cos(a) * .62, -.62, Math.sin(a) * .62, Math.cos(b) * .62, -.62, Math.sin(b) * .62); }
    const qem = lineMaterial(s.c, .5); grp.add(new THREE.LineSegments(geo(qe), qem));
    // Φ：E の記録の柱の先から、この主体の q へ（三本の曲線と、流れる粒）
    const curves = [0, 2, 4].map((j, n) => { const [x, y, z] = SRC[(j + i) % SRC.length]; const a = new THREE.Vector3(x, y + .9, z), b = new THREE.Vector3(SX[i] + (n - 1) * .22, SY - .64, (n - 1) * .14), c = new THREE.Vector3((x + SX[i]) * .5, 2.9 + n * .18, (z * .4)); return new THREE.QuadraticBezierCurve3(a, c, b); });
    const cE = new THREE.Color(E_C), cS = new THREE.Color(s.c), lp = [], lc = [];
    curves.forEach(cu => { const pts = cu.getPoints(40); for (let k = 0; k < pts.length - 1; k++) { const t0 = k / 40, t1 = (k + 1) / 40; lp.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z); const c0 = cE.clone().lerp(cS, t0), c1 = cE.clone().lerp(cS, t1); lc.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b); } });
    const lg = geo(lp); lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    const lm = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    g.add(new THREE.LineSegments(lg, lm));
    const NP = mobile ? 5 : 9, PP = new Float32Array(curves.length * NP * 3), PT = [];
    for (let k = 0; k < curves.length * NP; k++) PT.push(Math.random());
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(PP, 3));
    const pm = pointMaterial(s.c, .12, .9); const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; g.add(pts);
    return { grp, rm, dm, qm, qem, lm, pm, curves, NP, PP, PT, pg, w: 1 };
  });

  // ── 札（HTML の語を 3D の点に寄せる） ──
  const labs = [...stage.querySelectorAll('[data-at]')];
  const AT = { e: new THREE.Vector3(0, 0, RAD * .78), phi: new THREE.Vector3(-.95, 2.65, .9), q: new THREE.Vector3(SX[0] - .95, SY - .62, 0), s0: new THREE.Vector3(SX[0], SY + .55, 0), s1: new THREE.Vector3(SX[1], SY + .55, 0), s2: new THREE.Vector3(SX[2], SY + .55, 0), s3: new THREE.Vector3(SX[3], SY + .55, 0), m: new THREE.Vector3(.32, 1.45, .2) };
  const v = new THREE.Vector3();
  function placeLabs() { labs.forEach(el => { const p = AT[el.dataset.at]; if (!p) return; v.copy(p).applyMatrix4(g.matrixWorld).project(cam); let x = (v.x * .5 + .5) * W; if (el.dataset.at === 'q') x = Math.max(x, el.offsetWidth + 6); el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round((-v.y * .5 + .5) * Hh) + 'px)'; }); }

  // ── 主体を選ぶ（押すと、その主体への Φ と q が明るくなる。押さなければ順に巡る） ──
  const btns = [...fig.querySelectorAll('[data-subj]')], lines = [...fig.querySelectorAll('[data-subj-line]')];
  let sel = 0, auto = !reduce, tAuto = 0;
  let vis = true, raf = 0, last = performance.now(); const t0 = last;
  function pick(i, user) { sel = i; if (user) auto = false; btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false')); lines.forEach((l, k) => l.classList.toggle('on', k === i)); labs.forEach(el => { const m = /^s(\d)$/.exec(el.dataset.at || ''); if (m) el.classList.toggle('on', +m[1] === i); }); kick(); }
  btns.forEach((b, i) => b.addEventListener('click', () => pick(i, true)));

  let W = 0, Hh = 0;
  const size = () => {
    W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh;
    // 横幅 約 9.4 と高さ 約 7 が収まる距離（狭い画面でも左右の主体が切れないように）
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); cam.userData.d = Math.max(4.7 / (t * cam.aspect), 4.5 / t);
    cam.updateProjectionMatrix();
  };
  new ResizeObserver(() => { size(); render(performance.now()); }).observe(cv); size();

  function render(now) {
    const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; const t = (now - t0) / 1000;
    if (auto) { tAuto += dt; if (tAuto > 4.2) { tAuto = 0; pick((sel + 1) % SUBJ.length, false); } }
    const sw = reduce ? 0 : Math.sin(t * .18) * .55;
    const d = cam.userData.d || 16;
    cam.position.set(sw * 2.2, 2.35 + d * .36, d * .93); cam.lookAt(0, 2.3, 0);
    model.rotation.y = reduce ? .4 : t * .25;
    subj.forEach((s, i) => {
      const on = i === sel ? 1 : 0; s.w += (on - s.w) * (reduce ? 1 : Math.min(1, dt * 3));
      s.lm.opacity = .07 + .85 * s.w; s.pm.opacity = .15 + .85 * s.w; s.qm.opacity = .04 + .3 * s.w; s.qem.opacity = .18 + .72 * s.w; s.rm.opacity = .4 + .6 * s.w;
      const pulse = reduce ? 0 : .06 * Math.sin(t * 2 + i);
      s.grp.children[2].scale.setScalar(1 + s.w * (.08 + pulse));
      // 粒：E から S へ流れる（選んだ主体ほど速く・多く見える）
      for (let c = 0; c < s.curves.length; c++) for (let n = 0; n < s.NP; n++) {
        const j = c * s.NP + n; if (!reduce) s.PT[j] = (s.PT[j] + dt * (.12 + .22 * s.w)) % 1;
        const p = s.curves[c].getPoint(s.PT[j]); s.PP[3 * j] = p.x; s.PP[3 * j + 1] = p.y; s.PP[3 * j + 2] = p.z;
      }
      s.pg.attributes.position.needsUpdate = true;
    });
    g.updateMatrixWorld(true);
    R.render(S, cam); placeLabs();
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { vis = es[0].isIntersecting; kick(); }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('hp-lang-change', () => setTimeout(() => render(performance.now()), 30));
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fig.classList.remove('has-3d'); });
  fig.classList.add('has-3d');
  pick(0, false);
  window.__qpES = { get sel() { return sel; }, get vis() { return vis; } };
  kick();
}
