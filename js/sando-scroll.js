// © mitsulab. 2026-11-13 本人「Qualia Dive を圧倒的なクオリティで。没入感のある体験に」
// スクロールに合わせて、氷川参道の上空から目の高さへ潜り、ミツバチ・コウモリ・土の中・欅の時間の受けとり方（模式）を通って、
// U = g( P( E, B ), K ) の層と作品が重なる所を抜け、上へ戻る。
// 地：氷川参道の線（PLATEAU さいたま市 2022・CC BY 4.0／OpenStreetMap・ODbL を《Qualium 大宮》が加工）、石畳＝ambientCG PavingStones133（CC0）、落ち葉の林床＝Poly Haven forest_leaves（CC0）。
// 軽さ：線と点と一本の地面だけ。描くのはスクロールが動いたとき・動く場面にいるときだけ。reduced-motion では読み込まない（静止画の連なり）。
import * as T from 'three';
export async function start(sec) {
  const cv = sec.querySelector('.sd-cv'), read = sec.querySelector('.sd-read'), cap = sec.querySelector('.sd-cap');
  const mob = innerWidth < 760;
  const [meta, buf] = await (window.__sandoWire || (window.__sandoWire = Promise.all([
    fetch('img/hero/sando_wire.json').then(r => r.json()), fetch('img/hero/sando_wire.bin').then(r => r.arrayBuffer())])));
  const I = new Int16Array(buf), q = meta.q, CP = meta.center, o = CP[Math.floor(CP.length / 2)];
  const R = new T.WebGLRenderer({ canvas: cv, antialias: !mob, alpha: false, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mob ? 1.25 : 1.5)); R.setClearColor(0x03060f, 1);
  R.outputColorSpace = T.SRGBColorSpace;
  const S = new T.Scene(), FOG = new T.Color(0x03060f); S.fog = new T.FogExp2(FOG.getHex(), 0.004);
  const C = new T.PerspectiveCamera(mob ? 66 : 52, 1, 0.1, 1400);
  S.add(new T.HemisphereLight(0x9fc8ff, 0x1a1208, 1.0));
  const sun = new T.DirectionalLight(0xffe6c4, 1.6); sun.position.set(-40, 60, 30); S.add(sun);
  const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const win = (p, a, b, f = 0.025) => sm((p - a) / f) * (1 - sm((p - b) / f));

  const curve = new T.CatmullRomCurve3(CP.map(p => new T.Vector3(p[0] - o[0], p[1] - o[1], p[2] - o[2])));
  const LEN = curve.getLength();
  let uEnd = 1; for (let u = 0; u <= 1; u += 0.002) { if (curve.getPointAt(u).z + o[2] < -830) { uEnd = u; break; } }

  // 1) 線：道・建物・構造物
  const pos = [], col = [], step = mob ? 2 : 1;
  const tint = { road: [0.42, 0.85, 0.9], buildings: [0.006, 0.012, 0.026], structures: [0.55, 0.42, 0.2] };
  for (const k of ['road', 'buildings', 'structures']) {
    const [off, cnt] = meta.groups[k], c = tint[k];
    for (let i = 0; i + 1 < cnt; i += 2 * step) {
      const n = (off + i) * 3, m = n + 3, x = I[n] * q - o[0], z = I[n + 2] * q - o[2];
      if (Math.abs(x) > (k === 'buildings' ? 200 : 320)) continue;
      pos.push(x, I[n + 1] * q - o[1], z, I[m] * q - o[0], I[m + 1] * q - o[1], I[m + 2] * q - o[2]); col.push(...c, ...c);
    }
  }
  const lg = new T.BufferGeometry();
  lg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); lg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  const lineM = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, fog: true, depthWrite: false, blending: T.AdditiveBlending });
  S.add(new T.LineSegments(lg, lineM));

  // 2) 並木（樹冠を光の点で）
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); })();
  const tp = [], per = mob ? 8 : 14, near = [];
  for (const [x, y, z] of meta.trees) {
    const X = x - o[0], Y = y - o[1], Z = z - o[2];
    for (let j = 0; j < per; j++) { const a = rnd() * 6.283, r = 1 + rnd() * 4.5; tp.push(X + Math.cos(a) * r, Y + 7 + rnd() * 9, Z + Math.sin(a) * r); }
    tp.push(X, Y + 2 + rnd() * 3, Z);
    if (Math.abs(X) < 40) near.push([X, Y, Z]);
  }
  const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute(tp, 3));
  const treeM = new T.PointsMaterial({ map: dot, color: 0x7fe0b4, size: mob ? 2.6 : 2.2, sizeAttenuation: true, transparent: true, opacity: 0.75, fog: true, depthWrite: false, blending: T.AdditiveBlending });
  S.add(new T.Points(tg, treeM));
  const TREE0 = new T.Color(0x7fe0b4), TREE_UV = new T.Color(0xb48cff), TREE_BAT = new T.Color(0x4a6a8a);

  // 3) 鳥居（朱の線）
  const tv = [];
  for (const mk of meta.marks) {
    if (!/鳥居/.test(mk.name) || /護国/.test(mk.name)) continue;
    const [x, y, z] = [mk.p[0] - o[0], mk.p[1] - o[1], mk.p[2] - o[2]], w = /一の/.test(mk.name) ? 7 : 5.5, h = /一の/.test(mk.name) ? 11 : 8.5;
    const L = (a, b) => tv.push(x + a[0], y + a[1], z, x + b[0], y + b[1], z);
    L([-w, 0], [-w * 0.92, h]); L([w, 0], [w * 0.92, h]); L([-w * 1.35, h + 0.9], [w * 1.35, h + 0.9]); L([-w * 1.2, h], [w * 1.2, h]); L([-w * 1.1, h - 1.6], [w * 1.1, h - 1.6]);
  }
  const og = new T.BufferGeometry(); og.setAttribute('position', new T.Float32BufferAttribute(tv, 3));
  S.add(new T.LineSegments(og, new T.LineBasicMaterial({ color: 0xff6b4a, transparent: true, opacity: 0.95, fog: true })));

  // 4) フォトリアルの地：参道に沿う帯（中＝石畳、両脇＝落ち葉の林床）。質感は目の高さに近づいてから読む
  const tl = new T.TextureLoader();
  const tex = (u, srgb) => { const t = tl.load(u, () => { dirtyTex = true; kick(); }); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; if (srgb) t.colorSpace = T.SRGBColorSpace; return t; };
  function strip(x0, x1, mat, lift) {
    const N = mob ? 260 : 420, P = [], U = [], ix = [], A = new T.Vector3(), D = new T.Vector3(), Nn = new T.Vector3();
    for (let i = 0; i <= N; i++) {
      const u = Math.min(1, uEnd * 1.04 * i / N); curve.getPointAt(u, A); curve.getTangentAt(u, D); Nn.set(-D.z, 0, D.x).normalize();
      for (const s of [x0, x1]) P.push(A.x + Nn.x * s, A.y + lift, A.z + Nn.z * s);
      const v = u * LEN / 1.6; U.push(x0 / 1.6, v, x1 / 1.6, v);
      if (i < N) { const b = i * 2; ix.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setIndex(ix); g.computeVertexNormals();
    S.add(new T.Mesh(g, mat));
  }
  const pave = new T.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.9, metalness: 0, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false });
  const leaf = new T.MeshStandardMaterial({ color: 0x8a7a62, roughness: 1, metalness: 0, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false });
  strip(-6, 6, pave, 0.02); strip(6, 26, leaf, 0); strip(-26, -6, leaf, 0);
  let texLoaded = false, dirtyTex = false;
  const loadTex = () => { if (texLoaded) return; texLoaded = true;
    pave.map = tex('img/hero/3d/ql_paving_c.webp', true); pave.normalMap = tex('img/hero/3d/ql_paving_n.webp'); pave.roughnessMap = tex('img/hero/3d/dio/paving_r.webp');
    leaf.map = tex('img/hero/3d/dio/leaves_c.webp', true); leaf.normalMap = tex('img/hero/3d/dio/leaves_n.webp'); leaf.roughnessMap = tex('img/hero/3d/dio/leaves_r.webp');
    pave.needsUpdate = leaf.needsUpdate = true; };

  // 5) 土の中：根と菌糸（模式）
  const rv = [];
  for (const [X, Y, Z] of near) {
    const br = (x, y, z, dx, dy, dz, len, d) => { if (d > (mob ? 2 : 3)) return; const ex = x + dx * len, ey = y + dy * len, ez = z + dz * len; rv.push(x, y, z, ex, ey, ez);
      for (let k = 0; k < 2; k++) { const a = rnd() * 6.283; br(ex, ey, ez, dx * 0.5 + Math.cos(a) * 0.7, Math.min(-0.15, dy * 0.6 - rnd() * 0.3), dz * 0.5 + Math.sin(a) * 0.7, len * 0.62, d + 1); } };
    for (let k = 0; k < 4; k++) { const a = rnd() * 6.283; br(X, Y - 0.2, Z, Math.cos(a), -0.35, Math.sin(a), 2.6, 0); }
  }
  for (let i = 0; i + 1 < near.length; i++) { const [a, b] = [near[i], near[i + 1]]; if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 16) { const mx = (a[0] + b[0]) / 2 + (rnd() - 0.5) * 3, mz = (a[2] + b[2]) / 2; rv.push(a[0], a[1] - 1.6, a[2], mx, a[1] - 2.4, mz, mx, a[1] - 2.4, mz, b[0], b[1] - 1.6, b[2]); } }
  const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.Float32BufferAttribute(rv, 3));
  const rootM = new T.LineBasicMaterial({ color: 0xe0a864, transparent: true, opacity: 0, fog: true, depthWrite: false, blending: T.AdditiveBlending });
  S.add(new T.LineSegments(rg, rootM));

  // 6) こだま・年輪の輪
  const ringG = (() => { const g = new T.BufferGeometry(), P = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.283; P.push(Math.cos(a), 0, Math.sin(a)); } g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); return g; })();
  const rings = [...Array(10)].map(() => { const l = new T.Line(ringG, new T.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, fog: true, depthWrite: false, blending: T.AdditiveBlending })); S.add(l); return l; });

  // 7) 式の層：U = g( P( E, B ), K ) と作品・領域（名前だけ。押して開くのは下の 02 の図）
  const LAY = [['E', 'ENVIRONMENT', '#7fe0b4', ['Qualium Omiya', 'Qualium Kawagoe', 'Qualium Shibuya', 'Sound/soil', 'Sound/tree', 'GIS', 'IoT']],
    ['B', 'BODY', '#78d6ec', ['Qualia/sight', 'Qualia/swarm', 'Qualia/AI', 'Qualia/translate', 'AI']],
    ['P', 'PERCEPTION', '#a8f2f6', ['Qualia/sound', 'Qualia/touch', 'Qualia/gaze', 'Qualia/oto']],
    ['K', 'CONTEXT', '#b4a2ff', ['Qualia/time', 'Qualia/scale', 'Qualia/literature', 'Qualia/letter', 'Qualia/fable', 'Qualia/rakugo']],
    ['g', 'MEANING', '#f2c58a', ['Qualia/yose', 'Qualia/song', 'Qualia/museum', 'ART']]];
  const label = (txt, color, px, h) => { const c = document.createElement('canvas'), g = c.getContext('2d'), F = px + 'px "JetBrains Mono",ui-monospace,Menlo,monospace'; g.font = F; const w = Math.ceil(g.measureText(txt).width) + 16; c.width = w; c.height = px + 16; g.font = F; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(txt, 8, c.height / 2);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, fog: false })); s.scale.set(h * w / c.height, h, 1); return s; };
  const FX = new T.Group(); S.add(FX); const fxMats = [];
  const uF = uEnd * 0.858, PF = curve.getPointAt(uF), DF = curve.getTangentAt(uF);
  FX.position.copy(PF); FX.rotation.y = Math.atan2(DF.x, DF.z);
  LAY.forEach(([sym, nm, c, apps], i) => {
    const y = 4 + i * 4.2, cl = new T.Color(c);
    const pl = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshBasicMaterial({ color: cl, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    pl.rotation.x = -Math.PI / 2; pl.position.y = y; FX.add(pl); fxMats.push([pl.material, 0.06]);
    const edge = new T.LineSegments(new T.EdgesGeometry(pl.geometry), new T.LineBasicMaterial({ color: cl, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    edge.rotation.x = -Math.PI / 2; edge.position.y = y; FX.add(edge); fxMats.push([edge.material, 0.8]);
    const s = label(sym + '  ' + nm, c, 40, 1.5); s.position.set(-14.5, y + 0.9, 15); s.center.set(0, 0.5); FX.add(s); fxMats.push([s.material, 1]);
    apps.forEach((a, j) => { const t = label(a, c, 30, 0.9), ang = j / apps.length * 6.283 + i, rr = 6 + (j % 3) * 3; t.position.set(Math.cos(ang) * rr, y + 0.6, Math.sin(ang) * rr); FX.add(t); fxMats.push([t.material, 0.9]); });
  });
  const ULab = label('U = g( P( E, B ), K )', '#eef5fb', 56, 2.4); ULab.position.set(0, 4 + 5 * 4.2 + 1.5, 0); FX.add(ULab); fxMats.push([ULab.material, 1]);

  // 場面（スクロールの量 p で決まる）
  const SC = [
    [0.00, 0.13, '', ''],
    [0.15, 0.29, '目の高さへ。人の受けとる参道。', 'Down to eye level. The approach as people receive it.'],
    [0.31, 0.44, 'ミツバチの目：人には見えない紫外の光（模式）', 'A honeybee’s eyes: ultraviolet light we cannot see (model)'],
    [0.46, 0.58, 'コウモリの耳：超音波のこだまで道を知る（模式）', 'A bat’s ears: finding the way by ultrasonic echoes (model)'],
    [0.60, 0.71, '土の中：根と菌がつながる（模式）', 'Under the soil: roots and fungi connect (model)'],
    [0.72, 0.79, '欅の時間：年輪は一年に一つずつ増える（模式）', 'Keyaki time: one tree ring for each year (model)'],
    [0.81, 0.9, '作品と領域が、式の層に重なる', 'Works and fields overlap on the layers of the formula'],
    [0.94, 1.01, '', '']];
  const key = (p, K) => { for (let i = 1; i < K.length; i++) if (p <= K[i][0]) { const [a, va] = K[i - 1], [b, vb] = K[i], e = sm((p - a) / (b - a)); return va + (vb - va) * e; } return K[K.length - 1][1]; };
  const KH = [[0, mob ? 95 : 80], [0.13, mob ? 70 : 58], [0.29, 1.6], [0.6, 1.6], [0.64, -2.4], [0.71, -2.4], [0.76, 1.8], [0.8, 4], [0.88, 10], [0.95, 40], [1, 90]];
  const KL = [[0, -6], [0.29, 1.5], [0.6, 1.4], [0.64, -3.2], [0.71, -3.2], [0.76, 2], [0.8, 10], [0.9, 18], [1, 30]];
  const KU = [[0, 0], [0.13, 0.04], [0.29, 0.3], [0.6, 0.58], [0.71, 0.66], [0.8, 0.8], [0.92, 0.86], [1, 0.9]];
  const A = new T.Vector3(), B = new T.Vector3(), FB = new T.Color(), FU = new T.Color(0x0c0620), FS = new T.Color(0x0d0904), PV = new T.Color(0x7a5cff), LV = new T.Color(0x5a3ca0);
  let scene = -2, tt = 0;
  function place(p) {
    const u = uEnd * key(p, KU), h = key(p, KH), ly = key(p, KL);
    curve.getPointAt(u, A); curve.getPointAt(Math.min(1, u + 0.03 + 0.02 * (1 - sm(p / 0.3))), B);
    const back = 46 * (1 - sm(p / 0.29));
    C.position.set(A.x + Math.sin(p * 9) * 0.25, A.y + h, A.z + back);
    if (p > 0.8) B.lerp(PF, sm((p - 0.78) / 0.05));
    C.lookAt(B.x, B.y + ly, B.z);
    const wBee = win(p, 0.31, 0.44), wBat = win(p, 0.46, 0.58), wSoil = win(p, 0.6, 0.71), wKey = win(p, 0.72, 0.79), wFx = win(p, 0.8, 0.9, 0.025), wEye = win(p, 0.15, 0.79, 0.05);
    treeM.color.copy(TREE0).lerp(TREE_UV, wBee).lerp(TREE_BAT, wBat * 0.8); treeM.opacity = 0.75 * (1 - wSoil * 0.7); treeM.size = (mob ? 2.6 : 2.2) * (1 - 0.72 * Math.max(wEye, sm((p - 0.15) / 0.05) * (1 - sm((p - 0.95) / 0.04))));
    lineM.opacity = 0.85 * (1 - wBat * 0.5) * (1 - wSoil * 0.6);
    pave.opacity = leaf.opacity = wEye * (1 - wSoil * 0.75) * (1 - wBat * 0.6);
    pave.color.setHex(0x9a968c).lerp(PV, wBee * 0.45); leaf.color.setHex(0x8a7a62).lerp(LV, wBee * 0.5);
    rootM.opacity = wSoil * 0.9;
    FB.setHex(0x03060f).lerp(FU, wBee).lerp(FS, wSoil); S.fog.color.copy(FB); R.setClearColor(FB, 1); S.fog.density = 0.004 + wEye * 0.012 - wFx * 0.002;
    fxMats.forEach(([m, a]) => m.opacity = a * wFx);
    const rk = Math.max(wBat, wKey), bat = wBat >= wKey;
    let t0 = null; if (!bat && rk > 0) { t0 = near.reduce((b, n) => (Math.hypot(n[0] - A.x, n[2] - A.z) < Math.hypot(b[0] - A.x, b[2] - A.z) ? n : b), near[0]); if (!t0 || Math.hypot(t0[0] - B.x, t0[2] - B.z) > 18) t0 = [B.x + 4, A.y, B.z]; }
    rings.forEach((r, i) => { const f = ((tt * (bat ? 0.6 : 0.12) + i / rings.length) % 1);
      if (bat) { r.position.set(C.position.x, A.y + 0.08, C.position.z); r.scale.setScalar(1.5 + f * 30); r.material.color.setHex(0xc8ecff); r.material.opacity = rk * (1 - f); }
      else if (t0) { r.position.set(t0[0], t0[1] + 1.4, t0[2]); r.scale.setScalar(0.3 + (i + f) * 0.45); r.material.color.setHex(0xf2c58a); r.material.opacity = rk * 0.7; }
      else r.material.opacity = 0; });
    if (wEye > 0.01) loadTex();
    const s = SC.findIndex(x => p >= x[0] && p < x[1]);
    if (s !== scene) { scene = s; if (cap) { const en = document.documentElement.lang === 'en', t = s < 0 ? '' : SC[s][en ? 3 : 2]; cap.textContent = t; cap.classList.toggle('on', !!t); } sec.dataset.scene = s; if (window.__sdSound) window.__sdSound(s); }
    if (read) read.textContent = 'D ' + String(Math.round(u * LEN)).padStart(4, '0') + ' m  ·  H ' + (h < 0 ? '-' : '') + String(Math.abs(Math.round(h))).padStart(2, '0') + ' m';
    return rk > 0.01;
  }
  function size() { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; R.setSize(w, h, false); C.aspect = w / h; C.updateProjectionMatrix(); }
  const prog = () => { const r = sec.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0; };
  let cur = prog(), raf = 0, vis = true, lt = 0, frozen = false;
  const draw = () => { const anim = place(cur); R.render(S, C); return anim; };
  function loop(n) { raf = 0; if (frozen) return; const dt = lt ? Math.min(0.05, (n - lt) / 1000) : 0.016; lt = n; tt += dt; const t = prog(); cur += (t - cur) * 0.2; if (Math.abs(t - cur) < 2e-4) cur = t; const anim = draw(); dirtyTex = false; if (vis && (cur !== t || anim)) raf = requestAnimationFrame(loop); else lt = 0; }
  function kick() { if (vis && !raf) raf = requestAnimationFrame(loop); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { size(); kick(); });
  new IntersectionObserver(e => { vis = e[0].isIntersecting; kick(); }).observe(sec);
  size(); draw(); sec.dataset.ready = '1';
  window.__sd = { rings, C, R, set: p => { frozen = true; cur = p; tt = 0.35; draw(); }, LEN, tex: () => loadTex() };
}
