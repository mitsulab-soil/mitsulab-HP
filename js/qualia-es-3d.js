// PHILOSOPHY の 3D「環境と主体のあいだに、Qualia がある。」（2026-10-23 二回目・本人「3D がよくない。作り直す」）
// 見せること（文字の札は少なく、動きで）：
//   中央＝環境エージェント E（場所：石畳の一区画・等高線・記録の柱・宙に浮かぶ自分の小さな写し＝見取り図）。
//   まわり＝主体エージェント S（人・ミツバチ・コウモリ・機械）。それぞれの感覚の通り道（人＝目の高さの視線／ミツバチ＝花へ向かう粒／コウモリ＝声の反響の弧／機械＝写真機の画角）で E と向き合う。
//   その途中の輪＝Φ（関係のかたち）を通ると、E のまわりに、その主体にだけ立つ Qualia q の殻が立ち上がる。
//   四つの q が E のまわりで重なり合うと Qualium（場）。一巡およそ 24 秒。主体を選ぶと、その関係からもう一度。
// ・カメラは回さない（斜め上の一つの向き）。ミツバチとコウモリは共通部品の生きもの（_共通3D/kit/creatures.js の写し＝js/kit/creatures.js）。大きさは見やすく誇張した模式
// ・線と点は共通部品 _共通3D/kit/layers.js（js/kit/layers.js）。形は模式で、実測の値ではない
// ・画面に近づいてから読む・画面の外とタブを隠したときは止める・動きを減らす設定では重なった一こまだけ描く
import * as THREE from 'three';
import { lineMaterial, pointMaterial, contours, pillars } from './kit/layers.js';
import { makeBee, makeBat } from './kit/creatures.js';

const SUBJ = [
  { key: 'hito', c: 0xf4aa96 },
  { key: 'hachi', c: 0xc4b2ff },
  { key: 'komori', c: 0x78b8ec },
  { key: 'kikai', c: 0xc2c7cc },
];
const E_C = 0x5fb8d0, QM_C = 0xa8f2f6;
const SLOT = 4.6, ALL = 4.8, OUT = 1.4, CYCLE = SLOT * 4 + ALL + OUT;

export function boot(fig) {
  const stage = fig.querySelector('[data-es3d]');
  const mobile = innerWidth < 700 || matchMedia('(pointer:coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas'); cv.className = 'qp-es-cv'; cv.setAttribute('aria-hidden', 'true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (e) { fig.classList.add('no-3d'); return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.5));
  R.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(cv);

  const S = new THREE.Scene();
  S.fog = new THREE.Fog(0x03060f, 22, 40);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 80);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 7, 6); S.add(key);
  const rim = new THREE.DirectionalLight(0x8fe6f0, .8); rim.position.set(-5, 3, -4); S.add(rim);
  const g = new THREE.Group(); S.add(g);
  const geo = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const bump = (a, b, c, d, x) => sstep(a, b, x) * (1 - sstep(c, d, x));

  // ── E：環境エージェント（場所） ──
  const RAD = 2.4;
  {
    const tl = new THREE.TextureLoader();
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2.4, 2.4);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, color: 0xa9a59b, transparent: true, depthWrite: false });
    if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(2.4, 2.4); mat.normalMap = n; mat.normalScale = new THREE.Vector2(.7, .7); }
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
    const gr = ax.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.62, '#ddd'); gr.addColorStop(.88, '#333'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
    mat.alphaMap = new THREE.CanvasTexture(ac);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RAD * 1.2, 64), mat); m.rotation.x = -Math.PI / 2; g.add(m);
  }
  const hAt = (x, z) => .3 * Math.exp(-((x - .5) ** 2 + (z + .3) ** 2) / 2.2) + .12 * Math.exp(-((x + 1.1) ** 2 + (z - .7) ** 2) / 1);
  const clip = (cl, r) => { const p = cl.geometry.attributes.position.array, keep = []; for (let i = 0; i < p.length; i += 6) if (Math.hypot(p[i], p[i + 2]) < r && Math.hypot(p[i + 3], p[i + 5]) < r) keep.push(...p.slice(i, i + 6)); cl.geometry.dispose(); cl.geometry = geo(keep); return cl; };
  g.add(clip(contours(hAt, { x0: -RAD, x1: RAD, z0: -RAD, z1: RAD, cell: .12, step: .05, lift: .02, color: E_C, opacity: .55 }), RAD * .95));
  const SRC = [[-1.5, .5], [-.5, -1.3], [.8, 1.2], [1.5, -.7]].map(([x, z]) => [x, hAt(x, z), z]);
  g.add(pillars(SRC, { height: .7, color: 0xb4a2ff, opacity: .55 }));
  // 見取り図（内部モデル）：自分の等高線の小さな写しが、場所の上に浮かんでゆっくり回る
  const model = new THREE.Group(); model.position.set(0, 1.55, 0); g.add(model);
  {
    const mini = clip(contours(hAt, { x0: -RAD, x1: RAD, z0: -RAD, z1: RAD, cell: .2, step: .07, lift: 0, color: E_C, opacity: .8 }), RAD * .95);
    mini.scale.setScalar(.2); model.add(mini);
    const ring = []; for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2, b = (k + 1) / 64 * Math.PI * 2; ring.push(Math.cos(a) * .5, 0, Math.sin(a) * .5, Math.cos(b) * .5, 0, Math.sin(b) * .5); }
    model.add(new THREE.LineSegments(geo(ring), lineMaterial(E_C, .6)));
    model.add(new THREE.LineSegments(geo([0, -1.5, 0, 0, -.05, 0]), lineMaterial(E_C, .35)));
  }
  const E_TOP = new THREE.Vector3(0, .9, 0);

  // ── S：主体エージェント（E を囲む） ──
  const POS = [[-4.8, 0, 2.3], [-3.7, 2.1, -3.2], [3.9, 2.8, -2.9], [4.8, 0, 2.2]];
  const mat = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: o.rough ?? .7, metalness: o.metal ?? 0, vertexColors: !!o.vc, map: o.map || null, side: o.side ?? THREE.FrontSide, transparent: !!o.transparent });
  const subj = SUBJ.map((s, i) => {
    const [x, y, z] = POS[i], grp = new THREE.Group(); grp.position.set(x, y, z); g.add(grp);
    const toE = new THREE.Vector3(-x, 0, -z).normalize(), yaw = Math.atan2(toE.x, toE.z);
    let eye = new THREE.Vector3(x, y, z), body = null, deco = null;
    if (s.key === 'hito') {   // 人：足あとと、目の高さ（1.6 m の模式）からの視線の扇
      const fp = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: .9, transparent: true, opacity: .55, depthWrite: false });
      for (const sx of [-.13, .13]) { const f = new THREE.Mesh(new THREE.CircleGeometry(.1, 20), fp); f.scale.set(.95, 2.3, 1); f.rotation.x = -Math.PI / 2; f.rotation.z = -yaw; f.position.set(Math.cos(yaw) * sx, .015, -Math.sin(yaw) * sx); grp.add(f); }
      grp.add(new THREE.LineSegments(geo([0, .02, 0, 0, 1.6, 0]), lineMaterial(s.c, .35)));
      grp.add(new THREE.Points(geo([0, 1.6, 0]), pointMaterial(s.c, .26, 1)));
      eye = new THREE.Vector3(x, 1.6, z);
      const fan = []; for (let k = -3; k <= 3; k++) { const a = yaw + k * .17, d = 3.6; fan.push(0, 1.6, 0, Math.sin(a) * d, .1 - 1.6 + 1.6, Math.cos(a) * d); }
      for (let k = 0; k < fan.length; k += 6) fan[k + 4] = .12;
      deco = new THREE.LineSegments(geo(fan), lineMaterial(s.c, 0)); grp.add(deco);
    } else if (s.key === 'hachi') {   // ミツバチ（共通部品の写実の造形）
      body = makeBee(); body.scale.setScalar(1.05); body.rotation.y = yaw; grp.add(body);
      eye = new THREE.Vector3(x, y, z);
    } else if (s.key === 'komori') {   // コウモリ（共通部品）。声の反響の弧を E へ送る
      const wrap = new THREE.Group(); body = makeBat(); body.scale.setScalar(1.25); wrap.add(body); wrap.rotation.y = yaw; grp.add(wrap); body.userData.wrap = wrap;
      eye = new THREE.Vector3(x, y, z);
    } else {   // 機械：三脚の上の写真機と、その画角
      const metal = mat(0x3a4148, { rough: .45, metal: .6 }), dark = mat(0x15191d, { rough: .3, metal: .4 }), glass = mat(0x0b1a24, { rough: .08, metal: .2 });
      const cam3 = new THREE.Group(); cam3.position.y = 1.15; cam3.scale.setScalar(1.5); cam3.rotation.y = yaw; grp.add(cam3);
      const bx = new THREE.Mesh(new THREE.BoxGeometry(.42, .28, .24), metal); cam3.add(bx);
      const top = new THREE.Mesh(new THREE.BoxGeometry(.16, .06, .14), dark); top.position.set(-.08, .17, 0); cam3.add(top);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(.095, .1, .24, 24), dark); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0, .23); cam3.add(lens);
      const lg = new THREE.Mesh(new THREE.CircleGeometry(.08, 24), glass); lg.position.set(0, 0, .352); cam3.add(lg);
      const led = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a4a })); led.position.set(.16, .09, .121); cam3.add(led);
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + .4, leg = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, 1.22, 8), dark); leg.position.set(Math.cos(a) * .2, .55, Math.sin(a) * .2); leg.rotation.set(Math.sin(a) * .34, 0, -Math.cos(a) * .34); grp.add(leg); }
      eye = new THREE.Vector3(x, 1.15, z).addScaledVector(toE, .35);
      // 画角：レンズから E の上の四角へ
      const c0 = new THREE.Vector3(0, 1.15, 0).addScaledVector(toE, .35), aim = new THREE.Vector3(-x, .05, -z), side = new THREE.Vector3(toE.z, 0, -toE.x);
      const fr = []; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = aim.clone().addScaledVector(side, a * 1.2).add(new THREE.Vector3(0, b > 0 ? .9 : 0, 0)); fr.push(c0.x, c0.y, c0.z, p.x, p.y, p.z); }
      deco = new THREE.LineSegments(geo(fr), lineMaterial(s.c, 0)); grp.add(deco);
    }
    // Φ：主体と E のあいだの輪（関係のかたち）
    const gate = eye.clone().lerp(E_TOP, .5);
    const dir = E_TOP.clone().sub(eye).normalize();
    const ringP = []; for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2, b = (k + 1) / 64 * Math.PI * 2; ringP.push(Math.cos(a) * .36, Math.sin(a) * .36, 0, Math.cos(b) * .36, Math.sin(b) * .36, 0); }
    const gm = lineMaterial(QM_C, .12), gateL = new THREE.LineSegments(geo(ringP), gm);
    gateL.position.copy(gate); gateL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); g.add(gateL);
    // 主体 → Φ → E の道すじ（細い線）と、その上を流れる粒
    const mid = gate.clone().add(new THREE.Vector3(0, .5, 0));
    const curve = new THREE.QuadraticBezierCurve3(eye.clone(), mid, E_TOP.clone());
    const pathL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), lineMaterial(s.c, 0)); g.add(pathL);
    const NP = mobile ? 14 : 22, PP = new Float32Array(NP * 3), PT = []; for (let k = 0; k < NP; k++) PT.push(k / NP);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(PP, 3));
    const pm = pointMaterial(s.c, s.key === 'hachi' ? .11 : .09, 0), pts = new THREE.Points(pg, pm); pts.frustumCulled = false; g.add(pts);
    // コウモリの声の反響：道すじに沿って進む弧
    let arcs = null;
    if (s.key === 'komori') { arcs = []; for (let k = 0; k < 4; k++) { const ap = []; for (let a = 0; a <= 24; a++) { const th = -.9 + a / 24 * 1.8; ap.push(new THREE.Vector3(Math.sin(th) * .4, Math.cos(th) * .4 - .4, 0)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ap), lineMaterial(s.c, 0)); g.add(l); arcs.push(l); } }
    // q：E のまわりに立つ、この主体だけの殻（主体ごとに網の目が違う）
    const qR = 2.55 + i * .22, dome = new THREE.Group(); g.add(dome);
    const dl = [];
    const lat = (phi, wob) => { for (let a = 0; a < 96; a++) { const t0 = a / 96 * Math.PI * 2, t1 = (a + 1) / 96 * Math.PI * 2, r0 = qR * Math.cos(phi) * (1 + wob(t0)), r1 = qR * Math.cos(phi) * (1 + wob(t1)), h = qR * Math.sin(phi) * .62; dl.push(Math.cos(t0) * r0, h, Math.sin(t0) * r0, Math.cos(t1) * r1, h, Math.sin(t1) * r1); } };
    const lon = (th, n) => { for (let k = 0; k < n; k++) { const p0 = k / n * Math.PI / 2 * .92, p1 = (k + 1) / n * Math.PI / 2 * .92; dl.push(Math.cos(th) * qR * Math.cos(p0), qR * Math.sin(p0) * .62, Math.sin(th) * qR * Math.cos(p0), Math.cos(th) * qR * Math.cos(p1), qR * Math.sin(p1) * .62, Math.sin(th) * qR * Math.cos(p1)); } };
    const none = () => 0;
    if (s.key === 'hito') { for (const p of [.12, .45, .8]) lat(p, none); }
    else if (s.key === 'hachi') { lat(.12, none); }
    else if (s.key === 'komori') { for (const p of [.1, .34, .6]) lat(p, t => .035 * Math.sin(t * 9 + p * 10)); }
    else { for (const p of [.1, .42, .74]) lat(p, none); for (let k = 0; k < 8; k++) lon(k / 8 * Math.PI * 2, 8); }
    const dm = lineMaterial(s.c, 0); dome.add(new THREE.LineSegments(geo(dl), dm));
    // q が立つ瞬間をはっきり：殻の足もとの輪（主体の色）が、立ち上がるときに明るく広がる
    const bl = []; for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2, b = (k + 1) / 96 * Math.PI * 2; bl.push(Math.cos(a) * qR, .04, Math.sin(a) * qR, Math.cos(b) * qR, .04, Math.sin(b) * qR); }
    const bm = lineMaterial(s.c, 0), base = new THREE.LineSegments(geo(bl), bm); g.add(base);
    let dpm = null;
    if (s.key === 'hachi') { const dp = []; for (let k = 0; k < 22; k++) for (let j = 1; j < 8; j++) { const th = (k + (j % 2) * .5) / 22 * Math.PI * 2, p = j / 9 * Math.PI / 2 * .92; dp.push(Math.cos(th) * qR * Math.cos(p), qR * Math.sin(p) * .62, Math.sin(th) * qR * Math.cos(p)); } dpm = pointMaterial(s.c, .08, 0); dome.add(new THREE.Points(geo(dp), dpm)); }
    dome.scale.y = .01;
    return { s, grp, body, deco, gateL, gm, pathL, curve, NP, PP, PT, pg, pm, arcs, dome, dm, dpm, base, bm, qR, eye, gate, d: 0, w: 0 };
  });
  // Qualium：四つの q が重なったとき、E の足もとに光る輪
  const qmRing = (() => { const p = []; const r = 3.95; for (let k = 0; k < 128; k++) { const a = k / 128 * Math.PI * 2, b = (k + 1) / 128 * Math.PI * 2; p.push(Math.cos(a) * r, .03, Math.sin(a) * r, Math.cos(b) * r, .03, Math.sin(b) * r); } const l = new THREE.LineSegments(geo(p), lineMaterial(QM_C, 0)); g.add(l); return l; })();

  // ── 札（HTML の語を 3D の点に寄せる。出すのは E・いまの主体・Φ・q・Qualium だけ） ──
  const labs = [...stage.querySelectorAll('[data-at]')];
  const v = new THREE.Vector3(), AT = {};
  function placeLabs(sel, allA) {
    const cur = subj[sel];
    AT.e = new THREE.Vector3(0, 0, RAD * 1.4);
    AT.phi = cur.gate.clone().add(new THREE.Vector3(0, .62, 0));
    AT.q = new THREE.Vector3(Math.cos(-.5) * cur.qR * .7, cur.qR * .62 * .78, Math.sin(-.5) * cur.qR * .7);
    AT.qm = new THREE.Vector3(-4.1, 0, -.4);
    for (let i = 0; i < 4; i++) AT['s' + i] = subj[i].eye.clone().add(new THREE.Vector3(0, i === 0 ? .55 : i === 3 ? .5 : .75, 0));
    labs.forEach(el => {
      const at = el.dataset.at, p = AT[at]; if (!p) return;
      let a = 1;
      if (/^s\d$/.test(at)) a = +at[1] === sel ? 1 - allA : 0;
      else if (at === 'phi' || at === 'q') a = (1 - allA) * Math.min(1, cur.w * 1.4);
      else if (at === 'qm') a = allA;
      v.copy(p).applyMatrix4(g.matrixWorld).project(cam);
      el.style.opacity = a.toFixed(2);
      el.style.transform = 'translate(' + Math.round((v.x * .5 + .5) * W) + 'px,' + Math.round((-v.y * .5 + .5) * Hh) + 'px)';
    });
  }

  // ── 主体を選ぶ（押すと、その主体の関係からもう一度。押さなければ順に巡る） ──
  const btns = [...fig.querySelectorAll('[data-subj]')], lines = [...fig.querySelectorAll('[data-subj-line]')];
  let sel = 0, tc = reduce ? SLOT * 4 + 2 : 0;
  function showSel(i) { if (i === sel && btns[i].getAttribute('aria-pressed') === 'true') return; sel = i; btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false')); lines.forEach((l, k) => l.classList.toggle('on', k === i)); }
  btns.forEach((b, i) => b.addEventListener('click', () => { tc = i * SLOT; showSel(i); kick(); }));

  let W = 0, Hh = 0;
  const size = () => {
    W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); cam.userData.d = Math.max(6.4 / (t * cam.aspect), 4.6 / t);   // 左右の主体（幅 約 11）と殻の高さが切れない距離
    cam.updateProjectionMatrix();
  };
  new ResizeObserver(() => { size(); render(performance.now(), true); }).observe(cv); size();

  let vis = true, raf = 0, last = performance.now(); const t0 = last;
  const tmpV = new THREE.Vector3();
  function render(now, still) {
    const dt = still ? 0 : Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; const t = (now - t0) / 1000;
    if (!reduce) tc = (tc + dt) % CYCLE;
    const slot = Math.min(3, Math.floor(tc / SLOT)), a = tc - slot * SLOT;
    const allA = sstep(SLOT * 4, SLOT * 4 + 1.2, tc) * (1 - sstep(CYCLE - OUT, CYCLE - .2, tc));
    const out = 1 - sstep(CYCLE - OUT, CYCLE - .1, tc);
    if (tc < SLOT * 4) showSel(slot);
    // カメラ：斜め上の固定（ゆるい呼吸の上下だけ）
    const d = cam.userData.d || 22, br = reduce ? 0 : Math.sin(t * .45) * .05;
    cam.position.set(0, 1.0 + d * .5 + br, d * .87); cam.lookAt(0, 1.25, -.2);
    model.rotation.y = reduce ? .4 : t * .22;
    subj.forEach((u, i) => {
      // 今の主体：0〜1.6 秒で感覚の通り道が E へ伸び、1〜2.8 秒で Φ が灯り、1.8〜3.8 秒で q が立ち上がる。済んだ主体の q は薄く残る
      const cur = i === slot && tc < SLOT * 4, done = i < slot || tc >= SLOT * 4;
      const reach = cur ? sstep(0, 1.6, a) : 0, gl = cur ? bump(.9, 1.6, 2.6, 3.4, a) : 0;
      const rise = cur ? sstep(1.8, 3.8, a) : done ? 1 : 0;
      u.w += ((cur ? 1 : 0) - u.w) * (reduce ? 1 : Math.min(1, dt * 3));
      u.d = rise;
      const flash = cur ? bump(1.8, 2.6, 3.2, 4.4, a) : 0, domeA = (cur ? .3 + .45 * rise + .35 * flash : done ? .2 + .45 * allA : 0) * out;
      u.bm.opacity = (cur ? .25 + .75 * rise : done ? .35 + .4 * allA : 0) * out; u.base.scale.setScalar(cur ? .7 + .3 * rise : 1);
      u.dm.opacity = domeA; if (u.dpm) u.dpm.opacity = domeA * 1.1;
      u.dome.scale.y = Math.max(.01, rise * (1 + (allA && !reduce ? .025 * Math.sin(t * 2 + i) : 0)));
      u.dome.rotation.y = reduce ? 0 : t * (.03 + i * .008) * (i % 2 ? -1 : 1);
      u.gm.opacity = (.14 + .8 * gl + .25 * allA) * out;
      u.gateL.scale.setScalar(1 + .25 * gl);
      u.pathL.material.opacity = (.08 + .5 * reach * (1 - .5 * sstep(3.4, 4.6, a))) * out;
      if (u.deco) u.deco.material.opacity = (.12 + .6 * reach) * out;
      // 粒：主体から Φ を通って E へ（今の主体だけ流れる）
      const flow = cur ? reach : 0;
      for (let k = 0; k < u.NP; k++) { if (!reduce) u.PT[k] = (u.PT[k] + dt * .32) % 1; const f = u.PT[k] * Math.max(.02, flow); u.curve.getPoint(f, tmpV); u.PP[3 * k] = tmpV.x; u.PP[3 * k + 1] = tmpV.y; u.PP[3 * k + 2] = tmpV.z; }
      u.pg.attributes.position.needsUpdate = true; u.pm.opacity = .95 * flow * out;
      if (u.arcs) u.arcs.forEach((l, k) => { const f = ((t * .45 + k / u.arcs.length) % 1) * flow; u.curve.getPoint(f, tmpV); l.position.copy(tmpV); l.lookAt(E_TOP); l.scale.setScalar(.6 + f * 1.4); l.material.opacity = .8 * flow * (1 - f) * out; });
      if (u.body && !reduce && !still) {
        if (u.s.key === 'hachi') { u.body.position.set(Math.sin(t * .7) * .25, Math.sin(t * 1.1) * .12, Math.cos(t * .5) * .18); u.body.userData.animate(t); }
        else u.body.userData.animate(t);
      }
    });
    qmRing.material.opacity = .75 * allA;
    g.updateMatrixWorld(true);
    R.render(S, cam); placeLabs(sel, allA);
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; kick(); }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('hp-lang-change', () => setTimeout(() => render(performance.now(), true), 30));
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fig.classList.remove('has-3d'); });
  fig.classList.add('has-3d');
  showSel(0);
  window.__qpES = { get sel() { return sel; }, get vis() { return vis; }, get tc() { return +tc.toFixed(2); }, set tc(x) { tc = x; } };
  kick();
}
