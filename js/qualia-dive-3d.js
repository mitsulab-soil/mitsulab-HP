// 冒頭の 3D「世界を、重ねる。」（2026-10-23 本人「冒頭の節を整理したうえで 3D のグラフィックを加える」）
// 見せること：AI・GIS・IoT が集めた情報（点と線）が、感覚ごとの五つの層（sight・touch・sound・nature・culture）に訳され、
// 第 0 層（いつもの風景＝石畳）の上へ降りて重なる。重なった場が Qualium。一巡およそ 16 秒。
// 下の Qualia Layer の 3D（js/qualia-layers-3d.js）とは役割を分ける：こちらは「情報が層に訳されて重なるまで」、下は「層を一枚ずつ重ね、碧がその中に立つ」。
// ・カメラは回さない（斜め上の一つの向き・本人 10-23「一定の角度から」）・碧は出さない（碧は下の層の図に一人だけ）
// ・点と線は模式（実測の値ではない）。石畳は CC0（ambientCG PavingStones133・CC 管理台帳 M-0822。層の図と同じ材）
// ・画面の外とタブを隠したときは止める・動きを減らす設定では重なった一こまだけ・スマホは粒を減らし画素 1.5 まで
import * as THREE from 'three';
import { LAYER5 } from './kit/layer-colors.js?v=20261023k';

const T_CYCLE = 16;

export function boot(fig) {
  const stage = fig.querySelector('[data-qv3d]');
  const mobile = innerWidth < 860 || matchMedia('(pointer:coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas'); cv.className = 'qv-cv'; cv.setAttribute('aria-hidden', 'true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: !mobile, powerPreference: 'low-power' }); }
  catch (e) { return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.5));
  R.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(cv);

  const S = new THREE.Scene();
  S.fog = new THREE.Fog(0x03060f, 26, 44);
  const cam = new THREE.PerspectiveCamera(mobile ? 34 : 30, 16 / 9, .1, 80);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 8, 5); S.add(key);
  const add = THREE.AdditiveBlending;
  const geo = a => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return b; };
  const lineMat = (c, op) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op, blending: add, depthWrite: false, toneMapped: false });
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ── 第 0 層：いつもの風景（石畳の一区画。縁は丸くぼかす） ──
  const RG = 6.2;
  {
    const tl = new THREE.TextureLoader();
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 5);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, color: 0xa9a59b, transparent: true, depthWrite: false });
    if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(5, 5); mat.normalMap = n; mat.normalScale = new THREE.Vector2(.7, .7); }
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
    const gr = ax.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.6, '#ddd'); gr.addColorStop(.86, '#333'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
    mat.alphaMap = new THREE.CanvasTexture(ac);
    const m = new THREE.Mesh(new THREE.CircleGeometry(RG, 72), mat); m.rotation.x = -Math.PI / 2; S.add(m);
  }

  // ── 情報の出どころ（三つ）：AI＝点の雲（左）／GIS＝地図の線（奥）／IoT＝地面の測る柱から上る信号（右） ──
  const AI_C = new THREE.Vector3(-4.2, 6.1, .9), GIS_Y = 6.7, GIS_C = new THREE.Vector3(1.0, GIS_Y, -2.6);
  const PINS = [[3.4, 1.2], [4.5, -.6], [2.6, 3.0], [4.9, 1.9], [3.1, -2.2], [5.2, .3]];
  // GIS の線：起伏の等高線に見える、ゆがんだ輪（中心が少しずつずれる）
  const gisRings = [];
  for (let k = 0; k < 6; k++) { const pts = [], r0 = .45 + k * .42; for (let a = 0; a <= 64; a++) { const th = a / 64 * Math.PI * 2, r = r0 * (1 + .14 * Math.sin(th * 3 + k * .8) + .06 * Math.sin(th * 5 - k)); pts.push([GIS_C.x + Math.cos(th) * r * 1.35 + k * .05, GIS_C.z + Math.sin(th) * r * .8]); } gisRings.push(pts); }
  const gisLine = (() => { const p = []; for (const pts of gisRings) for (let i = 0; i < pts.length - 1; i++) p.push(pts[i][0], GIS_Y, pts[i][1], pts[i + 1][0], GIS_Y, pts[i + 1][1]); return new THREE.LineSegments(geo(p), lineMat(0xbfeee9, .55)); })();
  S.add(gisLine);
  // IoT の柱（細い支柱と、頭の小さな点）
  const pinG = (() => { const p = []; for (const [x, z] of PINS) p.push(x, 0, z, x, .75, z); return new THREE.LineSegments(geo(p), lineMat(0xd6e6ee, .75)); })();
  S.add(pinG);
  const pinHead = new THREE.Points(geo(PINS.flatMap(([x, z]) => [x, .78, z])), new THREE.PointsMaterial({ color: 0xf4fbff, size: .16, map: dot(), transparent: true, depthWrite: false, blending: add, toneMapped: false }));
  S.add(pinHead);

  // ── 五つの層：中空で一枚ずつ形になり、第 0 層の上へ降りて重なる ──
  const N5 = LAYER5.length, RL = 4.3;
  const yAir = k => 3.9 + k * .46, yGround = k => .4 + k * .7;
  const plates = LAYER5.map((L, k) => {
    const g = new THREE.Group();
    const fill = new THREE.Mesh(new THREE.CircleGeometry(RL, 72), new THREE.MeshBasicMaterial({ color: L.c, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    fill.rotation.x = -Math.PI / 2; g.add(fill);
    const rp = []; for (let a = 0; a < 96; a++) { const t0 = a / 96 * Math.PI * 2, t1 = (a + 1) / 96 * Math.PI * 2; rp.push(Math.cos(t0) * RL, 0, Math.sin(t0) * RL, Math.cos(t1) * RL, 0, Math.sin(t1) * RL); }
    const rim = new THREE.LineSegments(geo(rp), lineMat(L.c, 0)); g.add(rim);
    S.add(g); return { g, fill, rim };
  });

  // 層ごとの模様（その層が重ねるものの模式）：sight＝目に映る色の点の面／touch＝振動の輪／sound＝音の波／nature＝樹冠のまとまり／culture＝語りの弧と年の目盛り
  function pattern(k) {
    const out = [];
    if (k === 0) { for (let x = -RL; x <= RL; x += .42) for (let z = -RL; z <= RL; z += .42) if (Math.hypot(x, z) < RL * .92) out.push([x + (z * 7 % .1), z]); }
    else if (k === 1) { for (let r = .45; r < RL * .92; r += .42) { const n = Math.round(r * 11); for (let a = 0; a < n; a++) { const th = a / n * Math.PI * 2; out.push([.8 + Math.cos(th) * r * .82, -.5 + Math.sin(th) * r * .82]); } } }
    else if (k === 2) { for (let z = -3.4; z <= 3.4; z += .62) for (let x = -RL; x <= RL; x += .14) { const zz = z + Math.sin(x * 2.1 + z) * .16; if (Math.hypot(x, zz) < RL * .93) out.push([x, zz]); } }
    else if (k === 3) { const C = [[-2.2, -1.4], [-.4, -2.6], [1.8, -1.8], [2.6, .6], [.6, 1.2], [-1.8, 1.6], [-.3, 3.0], [2.0, 2.6]]; let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; for (const [cx, cz] of C) for (let i = 0; i < 46; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * .78; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } }
    else { for (let r = .6; r < 4.6; r += .48) { const n = Math.round(r * 7); for (let a = 0; a <= n; a++) { const th = -1.0 + a / n * 2.0; const x = -3.2 + Math.cos(th) * r, z = Math.sin(th) * r; if (Math.hypot(x, z) < RL * .93) out.push([x, z]); } } for (let x = -3.6; x <= 3.6; x += .3) out.push([x, 3.3]); }
    return out;
  }
  const SLOTS = LAYER5.map((_, k) => pattern(k));

  // 粒：i 番目の粒は、出どころ s＝i%3（AI・GIS・IoT）から、層 k＝i%5 の模様へ
  const NP = mobile ? 900 : 1600;
  const P = new Float32Array(NP * 3), Cc = new Float32Array(NP * 3);
  const meta = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const counts = [0, 0, 0, 0, 0];
  for (let i = 0; i < NP; i++) {
    const s = i % 3, k = i % 5, slot = SLOTS[k][(counts[k]++ * 7) % SLOTS[k].length];
    const m = { s, k, dx: slot[0] + (rnd() - .5) * .06, dz: slot[1] + (rnd() - .5) * .06, d: rnd() * 1.2, ph: rnd() * Math.PI * 2, r: rnd(), q: rnd() };
    if (s === 0) { const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rr = Math.cbrt(rnd()) * 2.0; m.ax = Math.sqrt(1 - u * u) * Math.cos(th) * rr * 1.3; m.ay = u * rr * .8; m.az = Math.sqrt(1 - u * u) * Math.sin(th) * rr; }
    else if (s === 1) { const ring = gisRings[(i * 5) % gisRings.length], j = Math.floor(rnd() * (ring.length - 1)), f = rnd(); m.gx = lerp(ring[j][0], ring[j + 1][0], f); m.gz = lerp(ring[j][1], ring[j + 1][1], f); }
    else { const pin = PINS[i % PINS.length]; m.px = pin[0]; m.pz = pin[1]; }
    meta.push(m);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(P, 3)); pg.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
  const pm = new THREE.PointsMaterial({ size: mobile ? .15 : .13, map: dot(), vertexColors: true, transparent: true, opacity: .95, depthWrite: false, blending: add, toneMapped: false });
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; S.add(pts);
  const RAW = new THREE.Color(0xdff6ff), LC = LAYER5.map(L => new THREE.Color(L.c)), tmp = new THREE.Color();

  // 札（文字は少なく：出どころの三つ・層の名前・第 0 層・Qualium）
  const labs = [];
  function lab(text, cls, c) { const e = document.createElement('span'); e.className = 'qv-lab ' + (cls || ''); e.textContent = text; if (c) e.style.setProperty('--c', c); e.setAttribute('aria-hidden', 'true'); stage.appendChild(e); const o = { e, p: new THREE.Vector3(), a: 0 }; labs.push(o); return o; }
  const lAI = lab('AI', 'qv-src'), lGIS = lab('GIS', 'qv-src'), lIoT = lab('IoT', 'qv-src');
  const lL = LAYER5.map(L => lab('Qualia/' + L.key, 'qv-layer', '#' + L.c.toString(16).padStart(6, '0')));
  const isEn = () => document.documentElement.getAttribute('data-lang') === 'en';
  const l0 = lab('', 'qv-base'), lQ = lab('Qualium', 'qv-qm');
  const setLang = () => { l0.e.textContent = isEn() ? 'Layer 0 — the everyday scene' : '第 0 層　いつもの風景'; };
  setLang(); document.addEventListener('hp-lang-change', setLang);

  let W = 0, Hh = 0;
  const size = () => { W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix(); };
  new ResizeObserver(() => { size(); render(performance.now(), true); }).observe(cv); size();

  const v3 = new THREE.Vector3();
  function place(o, a) {
    o.a += (a - o.a) * .18; if (Math.abs(a - o.a) < .01) o.a = a;
    v3.copy(o.p).project(cam);
    const x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * Hh;
    o.e.style.opacity = o.a.toFixed(2);
    o.e.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }

  let t0 = performance.now(), raf = 0, vis = true;
  const fps = { n: 0, t: t0, v: 0 };
  window.__qvDive = { get fps() { return fps.v; }, get phase() { return phase; } };
  let phase = '';
  function render(now, still) {
    const tt = reduce ? 12.5 : ((now - t0) / 1000) % T_CYCLE, t = (now - t0) / 1000;
    // 時の区切り：0〜4 集まる／4〜8 層に訳す／8〜11 風景へ降りて重なる／11〜14.6 重なったまま／14.6〜16 ほどける
    const uT = k => sstep(4 + k * .25, 7.2 + k * .25, tt);           // 訳す（層ごとに少しずつ遅れて）
    const uD = k => sstep(8 + (N5 - 1 - k) * .18, 10.6 + (N5 - 1 - k) * .18, tt);   // 降りる（下の層から先に着く）
    const fade = 1 - sstep(14.6, 15.8, tt), fadeIn = sstep(0, 1.2, tt);
    phase = tt < 4 ? 'gather' : tt < 8 ? 'translate' : tt < 11 ? 'descend' : tt < 14.6 ? 'hold' : 'release';
    const ya = k => lerp(yAir(k), yGround(k), uD(k));
    // 粒
    const rot = t * .12;
    for (let i = 0; i < NP; i++) {
      const m = meta[i]; let sx, sy, sz;
      if (m.s === 0) { const c = Math.cos(rot + m.ph * .02), s = Math.sin(rot + m.ph * .02); sx = AI_C.x + m.ax * c - m.az * s; sz = AI_C.z + m.ax * s + m.az * c; sy = AI_C.y + m.ay + Math.sin(t * .8 + m.ph) * .05; }
      else if (m.s === 1) { sx = m.gx; sy = GIS_Y + Math.sin(t * 1.1 + m.ph) * .02; sz = m.gz; }
      else { const f = ((t * .32 + m.r) % 1); sx = m.px + Math.sin(f * 6 + m.ph) * .05; sy = .8 + f * 5.0; sz = m.pz; }
      const u = sstep(0, 1, (uT(m.k) * 1.25 - m.d * .2));
      const tx = m.dx, ty = ya(m.k) + .03, tz = m.dz;
      P[3 * i] = lerp(sx, tx, u); P[3 * i + 1] = lerp(sy, ty, u) + Math.sin(u * Math.PI) * .6 * (m.q - .3); P[3 * i + 2] = lerp(sz, tz, u);
      tmp.copy(RAW).lerp(LC[m.k], u);
      const b = fade * fadeIn * (m.s === 2 ? (u > .02 ? 1 : .55 + .45 * Math.sin(((t * .32 + m.r) % 1) * Math.PI)) : 1);
      Cc[3 * i] = tmp.r * b; Cc[3 * i + 1] = tmp.g * b; Cc[3 * i + 2] = tmp.b * b;
    }
    pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    // 出どころの線は、訳しはじめると薄れる
    const src = fadeIn * (1 - sstep(4, 7, tt)) + sstep(14.8, 16, tt);
    gisLine.material.opacity = .55 * src; pinG.material.opacity = .3 + .45 * fade; pinHead.material.opacity = .5 + .5 * fade;
    // 層の板
    plates.forEach((pl, k) => { const a = sstep(5 + k * .25, 7.6 + k * .25, tt) * fade; pl.g.position.y = ya(k); pl.fill.material.opacity = .085 * a; pl.rim.material.opacity = .8 * a; });
    // カメラ：斜め上の一つの向き（ゆるい呼吸の上下だけ）
    const br = reduce ? 0 : Math.sin(t * .45) * .05;
    if (mobile) { cam.position.set(-7.4, 11.6 + br, 20.6); cam.lookAt(.2, 3.2, .2); }
    else { cam.position.set(-6.6, 10.6 + br, 18.6); cam.lookAt(.2, 3.35, .2); }
    R.render(S, cam);
    // 札
    lAI.p.set(AI_C.x, AI_C.y + 1.95, AI_C.z); place(lAI, src);
    lGIS.p.set(GIS_C.x, GIS_Y + .55, GIS_C.z - 1.4); place(lGIS, src);
    lIoT.p.set(4.4, 3.2, .6); place(lIoT, src);
    lL.forEach((o, k) => { o.p.set(RL * .99, ya(k), RL * .12); const a = sstep(5.6 + k * .25, 7.8 + k * .25, tt) * fade; place(o, a); });
    // 札どうしが重ならないよう、画面の上下に間をあける（下の層から順に、上の札を押し上げる）
    { const gap = mobile ? 17 : 22; let prev = 1e9; for (let k = 0; k < N5; k++) { const o = lL[k]; v3.copy(o.p).project(cam); let y = (-v3.y * .5 + .5) * Hh; if (y > prev - gap) y = prev - gap; prev = y; const x = (v3.x * .5 + .5) * W; o.e.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; } }
    l0.p.set(-1.0, 0, RG * .9); place(l0, 1);
    lQ.p.set(-RL * 1.0, yGround(N5 - 1) + .55, -.3); place(lQ, sstep(10.8, 11.8, tt) * fade);
    if (still) return;
    fps.n++; if (now - fps.t > 1000) { fps.v = Math.round(fps.n * 1000 / (now - fps.t)); fps.n = 0; fps.t = now; }
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) raf = requestAnimationFrame(loop); }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; kick(); }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); fig.classList.remove('has-3d'); });
  fig.classList.add('has-3d');
  kick();
}

let DOT = null;
function dot() {
  if (DOT) return DOT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return DOT = new THREE.CanvasTexture(c);
}
