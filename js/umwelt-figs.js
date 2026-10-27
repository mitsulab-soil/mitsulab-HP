/* © mitsulab. HP v5（2026-10-26 深夜 本人「環世界のグラフィックがカッコよくないです」）
   TOP の従来の 3D（氷川参道の線・碧）と同じ質で：暗い地に、光の線と粒だけで描く映像のような図。塗りの球・玩具の形は使わない。
   泡＝その生き物が感じとれる範囲（模式）。光る細い輪郭と、内側のかすかな屈折だけ。
   1.0：暗い空間に一本の木。生き物ごとの泡の中だけで、同じ木が違う姿に光る。
        人の泡＝木の形と色（温かい白）／ミツバチの泡＝紫外線で見える模様（帯がゆっくり流れる・人の目には見えない）／マダニの泡＝木は届かず、通りかかる人の熱の気配（橙）だけ。
   2.0：中央に碧（依代）。碧から光が流れ、人の泡が碧を介して広がり、ミツバチの泡と場所の記憶の泡に重なる。重なった所が淡く光る＝Qualium。
   奥行き＝霧・ちりの粒・焦点から離れた粒ほど大きく淡く（被写界深度の代わり。後処理は使わず、スマホでも軽く）。 */
import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = Math.min(innerWidth, innerHeight) < 700;
function hasGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!hasGL()) document.documentElement.classList.add('v2-no3d');
else document.querySelectorAll('.v2-fig').forEach(f => { const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); boot(f, +f.dataset.fig).catch(e => { console.warn('umwelt-figs', e); f.classList.add('no3d'); }); } }, { rootMargin: '500px 0px' }); o.observe(f); });

// ---- 泡の場（最大 5 つ）：xyz＝中心・w＝半径、mode 1 人／2 ミツバチ／3 マダニ／4 場所の記憶。線と粒の色はこの場で決まる
const NS = 5;
const regionChunk = `
uniform vec4 uS[${NS}]; uniform float uM[${NS}]; uniform float uT; uniform vec3 uBase; uniform float uBaseA; uniform float uFog; uniform float uTickHide;
varying vec3 vW; varying float vD;
vec4 regionColor(vec3 p){
  float hum = 0., bee = 0., tic = 0., mem = 0.;
  for (int i = 0; i < ${NS}; i++){ float d = uS[i].w - distance(p, uS[i].xyz); float a = smoothstep(-.04, .1, d);
    if (uM[i] == 1.) hum = max(hum, a); else if (uM[i] == 2.) bee = max(bee, a); else if (uM[i] == 3.) tic = max(tic, a); else if (uM[i] == 4.) mem = max(mem, a); }
  vec3 c = uBase; float al = uBaseA;
  if (hum > 0.) { c = mix(c, vec3(1., .93, .82), hum); al = mix(al, .95, hum); }
  if (bee > 0.) { float band = .5 + .5 * sin(length(p.xz - vec2(1., .3)) * 22. - uT * 2.2); vec3 uv = mix(vec3(.55, .45, 1.), vec3(.95, .9, 1.), band * band);
    c = mix(c, uv, bee); al = mix(al, .55 + .45 * band, bee); }
  if (mem > 0.) { c = mix(c, vec3(.96, .84, .58), mem * .8); al = mix(al, .8, mem); }
  if (tic > 0.) { if (uTickHide > .5) al *= 1. - tic; else { c = mix(c, vec3(1., .55, .28), tic); al = mix(al, .9, tic); } }
  float fog = clamp(1. - (vD - 7.) / uFog, .15, 1.);
  return vec4(c, al * fog);
}`;
function regionUniforms(base = 0x8bccca, baseA = .12) { return { uS: { value: Array.from({ length: NS }, () => new THREE.Vector4(0, -99, 0, 0)) }, uM: { value: new Array(NS).fill(0) }, uT: { value: 0 }, uBase: { value: new THREE.Color(base) }, uBaseA: { value: baseA }, uFog: { value: 14 }, uTickHide: { value: 1 } }; }
function lineMat(U) {
  return new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: regionChunk + `void main(){ vec4 c = regionColor(vW); gl_FragColor = vec4(c.rgb * c.a, 1.); }` });
}
function pointMat(U, size) {
  U.uSize = { value: size }; U.uPx = { value: 1 };
  return new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uSize; uniform float uPx; uniform float uT; attribute float aR; varying vec3 vW; varying float vD;
      void main(){ vec3 p = position; p.y += sin(uT * .6 + aR * 40.) * .015; vec4 w = modelMatrix * vec4(p,1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z;
        float dof = 1. + abs(vD - 9.5) * .16; gl_PointSize = uSize * uPx * dof * (.6 + aR * .8) * (10. / vD); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: regionChunk + `void main(){ vec2 q = gl_PointCoord - .5; float r = length(q); if (r > .5) discard; vec4 c = regionColor(vW); float dof = 1. / (1. + abs(vD - 9.5) * .25);
      float f = smoothstep(.5, 0., r); gl_FragColor = vec4(c.rgb * c.a * f * f * (.55 + .45 * dof), 1.); }` });
}
// 泡の輪郭：光る細い縁と、内側のかすかな屈折（縁へ向けた淡いグラデーション）。他の泡と重なった所は淡く灯る
function bubbleMat(hex) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { c: { value: new THREE.Color(hex) }, k: { value: 1 }, oc: { value: Array.from({ length: 3 }, () => new THREE.Vector4(0, -99, 0, 0)) }, ok: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec3 n; varying vec3 v; varying vec3 w; void main(){ vec4 p = modelViewMatrix * vec4(position,1.); w = (modelMatrix * vec4(position,1.)).xyz; n = normalize(normalMatrix * normal); v = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
    fragmentShader: `uniform vec3 c; uniform float k; uniform vec4 oc[3]; uniform float ok; uniform float uT; varying vec3 n; varying vec3 v; varying vec3 w;
      void main(){ float nv = abs(dot(n, v)); float rim = pow(1. - nv, 11.) * 1.3 + pow(1. - nv, 2.4) * .04; float shimmer = .9 + .1 * sin(w.y * 9. + uT * .8);
        float lens = 0.; for (int i = 0; i < 3; i++){ float d = oc[i].w - distance(w, oc[i].xyz); lens = max(lens, smoothstep(0., .25, d)); }
        vec3 col = c * rim * shimmer * k + vec3(1., .82, .45) * lens * ok * (1.1 + pow(1. - nv, 2.) * 1.2);
        gl_FragColor = vec4(col, 1.); }` });
}
function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }

// 木：枝を線で、葉と花を粒で（不ぞろいに）
function treeGeo(rnd) {
  const L = [], P = [], R = [];
  const branch = (p, dir, len, d) => { const e = p.clone().addScaledVector(dir, len); const steps = 4; let a = p.clone();
    for (let s = 1; s <= steps; s++) { const b = p.clone().lerp(e, s / steps).add(new THREE.Vector3((rnd() - .5) * .05 * len, 0, (rnd() - .5) * .05 * len)); L.push(a.x, a.y, a.z, b.x, b.y, b.z); a = b; }
    if (d === 0) for (let k = 0; k < 5; k++) { const o = new THREE.Vector3((rnd() - .5) * .14, 0, (rnd() - .5) * .14); L.push(p.x + o.x, p.y, p.z + o.z, e.x + o.x * .4, e.y, e.z + o.z * .4); }
    if (d >= 5) { const n = mobile ? 26 : 46; for (let i = 0; i < n; i++) { const r = .15 + rnd() * .5, t = rnd() * 6.283, u = rnd() * 2 - 1; P.push(e.x + Math.cos(t) * r * Math.sqrt(1 - u * u), e.y + u * r * .7, e.z + Math.sin(t) * r * Math.sqrt(1 - u * u)); R.push(rnd()); } return; }
    const n = d === 0 ? 4 : 2 + (rnd() < .45 ? 1 : 0);
    for (let i = 0; i < n; i++) { const a2 = rnd() * 6.283, sp = d === 0 ? .75 : .55; const nd = dir.clone().add(new THREE.Vector3(Math.cos(a2) * sp, .3 + rnd() * .35, Math.sin(a2) * sp)).normalize(); branch(e, nd, len * (.66 + rnd() * .1), d + 1); } };
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 1.25, 0);
  return { L, P, R };
}
// 3D の形を、細い光の線（輪郭の稜線）に
function wire(obj) { obj.updateMatrixWorld(true); const out = [];
  obj.traverse(m => { if (!m.isMesh || !m.geometry) return; const e = new THREE.EdgesGeometry(m.geometry, 28), a = e.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); out.push(v.x, v.y, v.z); } e.dispose(); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); return g; }
// 3D の形を、表面の光の粒に（人・マダニ）
function dots(obj, n, rnd) { obj.updateMatrixWorld(true); const all = [];
  obj.traverse(m => { if (!m.isMesh || !m.geometry) return; const a = m.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld); all.push(v.x, v.y, v.z); } });
  const out = [], r = [], cnt = all.length / 3; for (let i = 0; i < n; i++) { const k = Math.floor(rnd() * cnt) * 3; out.push(all[k] + (rnd() - .5) * .01, all[k + 1], all[k + 2] + (rnd() - .5) * .01); r.push(rnd()); }
  return [out, r]; }
// 人の姿を、表面の光の粒で（頭・胴・腕・脚を丸い管として、面積に比例して粒を置く）
function figureDots(base, ry, n, rnd) {
  const parts = [[[0, 1.58, 0], [0, 1.66, 0], .1], [[0, 1.42, 0], [0, 1.47, 0], .05], [[0, .98, 0], [0, 1.36, 0], .16], [[0, .92, 0], [0, 1.0, 0], .15],
    [[-.2, 1.35, 0], [-.27, 1.06, .04], .05], [[-.27, 1.06, .04], [-.29, .8, .07], .042], [[.2, 1.35, 0], [.27, 1.06, -.02], .05], [[.27, 1.06, -.02], [.3, .8, -.03], .042],
    [[-.09, .88, 0], [-.1, .48, .03], .07], [[-.1, .48, .03], [-.11, .06, -.02], .055], [[.09, .88, 0], [.11, .48, -.05], .07], [[.11, .48, -.05], [.12, .06, -.1], .055]];
  const area = parts.map(([a, b, r]) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * r + r * r * 2), tot = area.reduce((x, y) => x + y, 0);
  const out = [], R = [], A = new THREE.Vector3(), B = new THREE.Vector3(), d = new THREE.Vector3(), u = new THREE.Vector3(), w = new THREE.Vector3(), m = new THREE.Matrix4().makeRotationY(ry);
  parts.forEach(([a, b, r], i) => { const k = Math.round(n * area[i] / tot); A.set(...a); B.set(...b); d.subVectors(B, A); const L = d.length(); d.normalize(); u.set(1, 0, 0); if (Math.abs(d.x) > .9) u.set(0, 0, 1); u.cross(d).normalize(); w.crossVectors(d, u);
    for (let j = 0; j < k; j++) { const t = rnd() * (L + r * 2) - r, th = rnd() * 6.283, p = A.clone().addScaledVector(d, Math.max(0, Math.min(L, t))); const cap = t < 0 ? -t : t > L ? t - L : 0, rr = Math.sqrt(Math.max(0, r * r - cap * cap));
      p.addScaledVector(u, Math.cos(th) * rr).addScaledVector(w, Math.sin(th) * rr).addScaledVector(d, t < 0 ? t : t > L ? t - L : 0); p.applyMatrix4(m).add(base); out.push(p.x, p.y, p.z); R.push(rnd()); } });
  return [out, R]; }
const geo = (a, r) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); if (r) g.setAttribute('aR', new THREE.Float32BufferAttribute(r, 1)); return g; };

async function boot(root, SC) {
  const cv = root.querySelector('canvas'), labsBox = root.querySelector('.v2-labs');
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  const PR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75); R.setPixelRatio(PR); R.setClearColor(0x03060f, 1); R.outputColorSpace = THREE.SRGBColorSpace;
  const S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, 1, .05, 80);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const U = regionUniforms(0x8bccca, .22); const LM = lineMat(U); const PM = pointMat(U, mobile ? 3.2 : 3.6);
  const mats = [U];

  // 地：等高線の細い線（遠くへ霧で沈む）
  { const ln = []; for (let k = 1; k <= 9; k++) { const r = k * .75; for (let i = 0; i < 180; i++) { const a = i / 180 * 6.283, b = (i + 1) / 180 * 6.283, w = q => r + Math.sin(q * 3 + k * .7) * .1 * k * .3 + Math.sin(q * 7 - k) * .03 * k; ln.push(Math.cos(a) * w(a), 0, Math.sin(a) * w(a), Math.cos(b) * w(b), 0, Math.sin(b) * w(b)); } }
    const U2 = regionUniforms(0x5aa6b8, .07); mats.push(U2); S.add(new THREE.LineSegments(geo(ln), lineMat(U2))); }
  // 木
  const T = treeGeo(rnd); S.add(new THREE.LineSegments(geo(T.L), LM)); S.add(new THREE.Points(geo(T.P, T.R), PM)); U.uBaseA.value = .14;
  // ちりの粒（空間の奥行き）
  { const N = mobile ? 380 : 900, a = [], r = []; for (let i = 0; i < N; i++) { a.push((rnd() - .5) * 16, rnd() * 7, (rnd() - .5) * 16); r.push(rnd()); }
    const U3 = regionUniforms(0x9fd8e6, .32); mats.push(U3); S.add(new THREE.Points(geo(a, r), pointMat(U3, mobile ? 1.6 : 1.8))); }

  // 生き物（光の線）
  const [M3, C] = await Promise.all([import('./umwelt-3d.js?v=20261026w'), import('./kit/creatures.js')]);
  const Uc = regionUniforms(0xcfe8ea, .5); mats.push(Uc); const CM = lineMat(Uc);
  const place = (o, p, s, ry, rx = 0) => { o.scale.setScalar(s); o.position.copy(p); o.rotation.set(rx, ry, 0); return o; };
  const P_PERSON = SC === 2 ? new THREE.Vector3(-1.9, 0, 1.2) : new THREE.Vector3(-1.85, 0, .95);
  const PMc = pointMat(Uc, mobile ? 2.0 : 2.3); { const [p, r] = figureDots(P_PERSON, .7, mobile ? 1800 : 3000, rnd); S.add(new THREE.Points(geo(p, r), PMc)); }
  const P_BEE = SC === 2 ? new THREE.Vector3(.55, 2.85, .4) : new THREE.Vector3(1.15, 2.95, .55);
  { const [p, r] = dots(place(C.makeBee(), P_BEE, SC === 1 ? .8 : .5, -2.1), 1600, rnd); S.add(new THREE.Points(geo(p, r), pointMat(Uc, mobile ? 1.3 : 1.4))); }
  const P_TICK = new THREE.Vector3(1.55, .2, 1.45);
  if (SC === 1) { { const Ut = regionUniforms(0xd6a888, .4); Ut.uTickHide.value = 0; // 模式のマダニ（線）：卵形の胴・前の口・左右 4 対の脚。カメラへ少し起こして形が読めるように
      const L = [], P = [], Rr = [], k = .26, ell = (a, b, cy, n) => { for (let i = 0; i < n; i++) { const q0 = i / n * 6.283, q1 = (i + 1) / n * 6.283; L.push(Math.cos(q0) * a, Math.sin(q0) * b + cy, 0, Math.cos(q1) * a, Math.sin(q1) * b + cy, 0); } };
      ell(.5, .62, -.1, 48); ell(.3, .26, .3, 32); ell(.11, .12, .64, 16);
      for (const sx of [-1, 1]) [[.3, .55], [.15, .3], [-.05, -.05], [-.25, -.4]].forEach(([y, d], i) => { const x0 = sx * .42, kx = sx * (.82 + i * .02), ky = y + .22 - i * .02, ex = sx * (1.0 - i * .03), ey = y + d - .25 * (i > 1) ; L.push(x0, y, 0, kx, ky, 0, kx, ky, 0, ex, ey, 0); });
      for (let i = 0; i < 260; i++) { const t = rnd() * 6.283, rr = Math.sqrt(rnd()); P.push(Math.cos(t) * rr * .48, Math.sin(t) * rr * .6 - .1, 0); Rr.push(rnd()); }
      const g = new THREE.Group(); const Uw = regionUniforms(0xf3dcc2, .85); Uw.uTickHide.value = 0; Uw.__noRegion = 1; mats.push(Uw);
      g.add(new THREE.LineSegments(geo(L), lineMat(Uw))); g.add(new THREE.Points(geo(P, Rr), pointMat(Ut, mobile ? 1.3 : 1.5)));
      g.scale.setScalar(k); g.position.copy(P_TICK).add(new THREE.Vector3(0, .3, 0)); g.rotation.set(-.35, .55, 0); S.add(g); mats.push(Ut); Ut.__noRegion = 1; }  }

  Uc.uTickHide.value = 0;
  // マダニに届くもの：通りかかる人の熱の揺らぎ（橙の粒・模式）
  let heat = null; if (SC === 1) { const a = [], r = []; for (let i = 0; i < 160; i++) { const t = rnd() * 6.283, rr = Math.sqrt(rnd()) * .42; a.push(1.5 + Math.cos(t) * rr - .1, .25 + rnd() * .55, 1.4 + Math.sin(t) * rr * .6); r.push(rnd()); }
    heat = new THREE.Points(geo(a, r), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'uniform float uT; uniform float uPx; attribute float aR; varying float vA; void main(){ vec3 p = position; float ph = fract(uT * .25 + aR); p.y += ph * .35; p.x += sin(uT * 1.3 + aR * 20.) * .04; vA = sin(ph * 3.14159); vec4 mv = modelViewMatrix * vec4(p,1.); gl_PointSize = (3. + aR * 5.) * uPx * (10. / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; float f = smoothstep(.5, 0., r); gl_FragColor = vec4(vec3(1., .5, .22) * f * f * vA * .9, 1.); }' })); S.add(heat); mats.push(heat.material.uniforms); }
  // 泡
  const bubs = [];
  const bubble = (c, r, hex, mode) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 72, 48), bubbleMat(hex)); m.position.copy(c); S.add(m); const b = { m, c, r, mode, s: 1 }; bubs.push(b); return b; };
  const bH = SC === 2 ? bubble(new THREE.Vector3(-1.95, 1.15, 1.25), 1.15, 0xf4c2b4, 1) : bubble(new THREE.Vector3(-.75, 1.45, .55), 1.9, 0xf4c2b4, 1);
  const bB = bubble(SC === 2 ? new THREE.Vector3(.15, 2.45, .35) : new THREE.Vector3(1.0, 3.0, .3), 1.05, 0xc4b6ff, 2); if (SC === 2) bB.m.material.uniforms.k.value = .8;
  let bM = null; if (SC === 1) bubble(new THREE.Vector3(1.5, .48, 1.4), .74, 0xffb27a, 3); else { bM = bubble(new THREE.Vector3(0, 1.4, 0), 1.25, 0xf2d8a0, 4); bM.m.material.uniforms.k.value = 1.1; }
  // 外側の縁（くっきりした輪郭）：カメラに向いた細い円
  const rims = bubs.map(b => { const pts = []; for (let i = 0; i <= 160; i++) { const q = i / 160 * 6.283; pts.push(new THREE.Vector3(Math.cos(q), Math.sin(q), 0)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: b.m.material.uniforms.c.value, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false })); S.add(l); return l; });

  // 2.0：碧（共通の aoi.vrm・中央）、碧から人へ流れる光、広がる前の点線
  let aoi = null, mot = null, flow = null, ghost = null; const AO = new THREE.Vector3(-.75, 0, 1.5), GL = glowTex();
  if (SC === 2) {
    flow = new THREE.Points(geo(new Array(3 * 24).fill(0)), new THREE.PointsMaterial({ map: GL, color: 0xd8fcff, size: .38, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); flow.frustumCulled = false; S.add(flow);
    { const pts = []; for (let i = 0; i <= 120; i++) { const q = i / 120 * 6.283; pts.push(new THREE.Vector3(Math.cos(q), Math.sin(q), 0)); } ghost = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xf4c2b4, dashSize: .05, gapSize: .05, transparent: true, opacity: 0, depthWrite: false })); ghost.computeLineDistances(); S.add(ghost); }
    (async () => { try {
      const [V, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('@pixiv/three-vrm'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const Ld = new GLTFLoader(); Ld.setMeshoptDecoder(MeshoptDecoder); Ld.register(p => new V.VRMLoaderPlugin(p));
      const g = await Ld.parseAsync((await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())))).slice(0), '');
      const v = g.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(g.scene); V.VRMUtils.rotateVRM0(v);
      const N = n => v.humanoid.getNormalizedBoneNode(n), set = (n, x, y, z) => { const o = N(n); if (o) o.rotation.set(x, y, z); };
      set('leftUpperArm', -.12, 0, -1.28); set('rightUpperArm', -.12, 0, 1.28); set('leftLowerArm', 0, -.28, 0); set('rightLowerArm', 0, .28, 0);
      const holo = m0 => { const m = new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide });
        m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', 'float fr = 1. - abs(dot(normalize(normal), normalize(vViewPosition))); gl_FragColor = vec4(vec3(.5, .95, 1.) * (pow(fr, 2.6) * 1.5 + .05) + vec3(.9, 1., 1.) * pow(fr, 9.) * .8, 1.);'); }; return m; };
      v.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = Array.isArray(o.material) ? o.material.map(holo) : holo(o.material); } });
      v.scene.scale.setScalar(.95); v.scene.position.copy(AO); v.scene.rotation.y = .25; S.add(v.scene); aoi = v; v.update(0);
      const hl = new THREE.HemisphereLight(0xcfe9f0, 0x0a1218, .7), kl = new THREE.DirectionalLight(0xe6f6ff, 1.4); kl.position.set(-3, 5, 6); const rl = new THREE.DirectionalLight(0x9ff4ff, 1.4); rl.position.set(2, 3, -6); S.add(hl, kl, rl);
      try { const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61'); mot = new AoiMotion(v, { root: v.scene, reducedMotion: reduce, wind: 0, faceViewer: false, startCalm: 0, posture: 'upright', uprightWeight: .9 }); } catch (e) { console.warn('aoi motion', e); }
      window.__aoi = 'ok';
    } catch (e) { console.warn('aoi', e); } })();
  }

  // 2.0：重なり（Qualium）を灯す金の粒と、碧から三つの泡へ伸びる光の糸
  let qPts = null, links = [], qCore = null; const qC = new THREE.Vector3(); if (SC === 2) {
    qCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: GL, color: 0xffd994, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); qCore.scale.setScalar(1.3); S.add(qCore);
    const N = mobile ? 900 : 1600, a = new Float32Array(N * 3), r = []; for (let i = 0; i < N; i++) r.push(rnd());
    qPts = new THREE.Points(geo(Array.from(a), r), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uPx: { value: 1 }, uE: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'uniform float uT; uniform float uPx; attribute float aR; attribute float aK; varying float vA; void main(){ vA = (.55 + .45 * sin(uT * 1.6 + aR * 30.)) * aK; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = (2.2 + aR * 3.5) * (.7 + aK * .45) * uPx * (10. / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uE; varying float vA; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; float f = smoothstep(.5, 0., r); gl_FragColor = vec4(vec3(1., .82, .45) * f * f * vA * uE, 1.); }' }));
    qPts.geometry.setAttribute('aK', new THREE.Float32BufferAttribute(new Float32Array(N).fill(1), 1)); qPts.frustumCulled = false; qPts.userData.seed = Array.from({ length: N }, () => [rnd(), rnd(), rnd()]); S.add(qPts); mats.push(qPts.material.uniforms);
    const A0 = AO.clone().add(new THREE.Vector3(0, 1.2, 0));
    [[bH, 0xf4c2b4], [bB, 0xc4b6ff], [bM, 0xf2d8a0]].forEach(([b, c]) => { const crv = new THREE.QuadraticBezierCurve3(A0, A0.clone().lerp(b.c, .5).add(new THREE.Vector3(0, .7, 0)), b.c); const pts = crv.getPoints(60);
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false })); S.add(ln); ln.userData.crv = crv;
      const fp = new THREE.Points(geo(new Array(3 * 10).fill(0)), new THREE.PointsMaterial({ map: GL, color: c, size: .26, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fp.frustumCulled = false; S.add(fp); links.push({ crv, fp, b, ln }); });
  }
  // 1.0：泡ごとの「見え方の画」（模式）。人＝可視光の花の色／ミツバチ＝紫外線で見える花の的の模様／マダニ＝花は届かず、熱と酪酸の気配だけ
  if (SC === 1) {
    const card = draw => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.translate(128, 128);
      const g = x.createRadialGradient(0, 0, 60, 0, 0, 128); g.addColorStop(0, 'rgba(0,0,0,0)'); x.save(); x.beginPath(); x.arc(0, 0, 122, 0, 6.283); x.clip(); draw(x); x.restore();
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 122, 0, 6.283); x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const petals = (x, fill, inner) => { for (let k = 0; k < 8; k++) { x.save(); x.rotate(k / 8 * 6.283); const g = x.createLinearGradient(0, 0, 0, -92); g.addColorStop(0, inner || fill); g.addColorStop(1, fill); x.fillStyle = g; x.beginPath(); x.ellipse(0, -52, 20, 44, 0, 0, 6.283); x.fill(); x.restore(); } };
    const human = card(x => { x.fillStyle = '#16301e'; x.fillRect(-128, -128, 256, 256); petals(x, '#f2c531', '#f2c531'); x.fillStyle = '#9a5f1a'; x.beginPath(); x.arc(0, 0, 20, 0, 6.283); x.fill(); });
    const bee = card(x => { x.fillStyle = '#100a24'; x.fillRect(-128, -128, 256, 256); petals(x, '#f6e27a', '#2a1650'); x.strokeStyle = 'rgba(20,10,48,.9)'; x.lineWidth = 3; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; x.beginPath(); x.moveTo(Math.cos(a) * 22, Math.sin(a) * 22); x.lineTo(Math.cos(a) * 62, Math.sin(a) * 62); x.stroke(); } x.fillStyle = '#1e0f3c'; x.beginPath(); x.arc(0, 0, 22, 0, 6.283); x.fill(); });
    const tick = card(x => { x.fillStyle = '#0b0705'; x.fillRect(-128, -128, 256, 256); const g = x.createRadialGradient(-90, 0, 0, -90, 0, 170); g.addColorStop(0, 'rgba(255,150,70,.95)'); g.addColorStop(.5, 'rgba(230,90,40,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(-128, -128, 256, 256);
      let sd = 5; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647; x.fillStyle = 'rgba(255,220,170,.8)'; for (let i = 0; i < 70; i++) { const a = r() * 6.283, d = 30 + r() * 80; x.beginPath(); x.arc(Math.cos(a) * d - 50, Math.sin(a) * d * .6, 1.5 + r() * 2.5, 0, 6.283); x.fill(); } });
    [[human, new THREE.Vector3(-2.15, 2.55, .9), .95], [bee, new THREE.Vector3(.55, 3.5, .65), .62], [tick, new THREE.Vector3(2.05, 1.05, 1.95), .4]].forEach(([tx, p, sz]) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: .92, depthWrite: false })); sp.position.copy(p); sp.scale.setScalar(sz); S.add(sp); });
  }
  // 札（3 つまで）：PC は左右の余白に引き出し線、スマホは図の下に番号の凡例
  const AT = SC === 1 ? { hito: new THREE.Vector3(-1.6, 3.2, .55), bee: P_BEE.clone().add(new THREE.Vector3(.2, 1.0, 0)), tick: P_TICK.clone().add(new THREE.Vector3(0, .75, 0)) }
    : { aoi: AO.clone().add(new THREE.Vector3(0, 1.75, 0)), wide: new THREE.Vector3(-3.3, 2.6, 1.25), qualium: new THREE.Vector3(.55, 2.75, .2) };
  const labs = [...labsBox.querySelectorAll('[data-at]')], _v = new THREE.Vector3();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'v2-lead-svg'); svg.setAttribute('aria-hidden', 'true'); labsBox.prepend(svg);
  const BW = () => cv.clientWidth || 1, BH = () => cv.clientHeight || 1;
  const size = () => { R.setSize(BW(), BH(), false); cam.aspect = BW() / BH(); cam.fov = cam.aspect < 1 ? 46 : 34; cam.updateProjectionMatrix(); mats.forEach(u => { if (u.uPx) u.uPx.value = PR * BH() / 600; }); };
  size(); new ResizeObserver(size).observe(cv);
  const CT = new THREE.Vector3(SC === 2 ? -1.1 : -.1, 1.75, .4);
  let last = performance.now(), t0 = null;
  const setRegions = () => mats.forEach(u => u.uS && !u.__noRegion && bubs.forEach((b, i) => { u.uS.value[i].set(b.c.x, b.c.y, b.c.z, b.r * b.s); u.uM.value[i] = b.mode; }));

  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now;
    { const r = root.getBoundingClientRect(); if (!(r.bottom > 0 && r.top < innerHeight) || document.hidden) return; } if (t0 === null) t0 = now;
    const t = now / 1000, el = (now - t0) / 1000;
    // カメラ：ゆっくり回り込む
    const a = reduce ? 0 : Math.sin(el * .06) * .32 + el * .012, D = cam.aspect < 1 ? (SC === 2 ? 12.6 : 9.6) : (SC === 2 ? 10.6 : 8.6);
    const cxo = cam.aspect < 1 && SC === 2 ? -.4 : 0; cam.position.set(cxo + CT.x + Math.sin(.35 + a) * D, CT.y + 1.1, CT.z + Math.cos(.35 + a) * D); cam.lookAt(CT.x + cxo, CT.y, CT.z);
    mats.forEach(u => { u.uT.value = reduce ? 0 : t; });
    if (SC === 2) {
      const cy = reduce ? 6 : ((el + 2.6) % 11), g = reduce ? 1 : (cy < 1.2 ? 0 : cy < 3.4 ? (cy - 1.2) / 2.2 : cy < 10 ? 1 : Math.max(0, 1 - (cy - 10))), e = g * g * (3 - 2 * g);
      bH.s = 1 + e * 1.0;
      const A = AO.clone().add(new THREE.Vector3(0, 1.15, 0)), B = P_PERSON.clone().add(new THREE.Vector3(0, 1.15, 0)), pa = flow.geometry.attributes.position;
      for (let i = 0; i < 24; i++) { const u = reduce ? i / 24 : ((t * .7 + i / 24) % 1); _v.copy(A).lerp(B, u); _v.y += Math.sin(u * Math.PI) * .18; pa.setXYZ(i, _v.x, _v.y, _v.z); } pa.needsUpdate = true;
      flow.material.opacity = reduce ? .8 : (cy < 3.6 ? 1 : .7);
      ghost.scale.setScalar(bH.r); ghost.position.copy(bH.c); ghost.quaternion.copy(cam.quaternion); ghost.material.opacity = 0;
      const lt = [bB, bM]; bH.m.material.uniforms.ok.value = e * .06; lt.forEach((b, i) => bH.m.material.uniforms.oc.value[i].set(b.c.x, b.c.y, b.c.z, b.r));
      { const d = bM.c.clone().sub(bH.c), L = d.length(), rh = bH.r * bH.s; d.normalize(); AT.qualium.copy(bH.c).addScaledVector(d, Math.min(rh, L) - Math.max(0, rh + bM.r - L) / 2); }
      if (qPts) { const pa = qPts.geometry.attributes.position, rh = bH.r * bH.s, sd = qPts.userData.seed; let k = 0;
        for (let i = 0; i < sd.length; i++) { const [x, y, z] = sd[i], Bq = i % 3 ? bM : bB, th = x * 6.283, ph = Math.acos(2 * y - 1), rr = Math.cbrt(z) * Bq.r; _v.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(rr).add(Bq.c);
          const ka = qPts.geometry.attributes.aK; if (i === 0) { qC.set(0, 0, 0); qC.n = 0; } const inB = _v.distanceTo(bB.c) < bB.r, inM = _v.distanceTo(bM.c) < bM.r; if (_v.distanceTo(bH.c) < rh) { pa.setXYZ(i, _v.x, _v.y, _v.z); ka.setX(i, inB && inM ? 1.8 : .18); if (inB && inM) { qC.add(_v); qC.n++; } } else pa.setXYZ(i, 0, -99, 0); } pa.needsUpdate = true; qPts.geometry.attributes.aK.needsUpdate = true; if (qC.n) { qC.multiplyScalar(1 / qC.n); qCore.position.copy(qC); AT.qualium.copy(qC); } qCore.material.opacity = e * .9; qPts.material.uniforms.uE.value = e; }
      links.forEach(({ crv, fp, ln }, j) => { if (j === 2 && qC.n) { crv.v2.copy(qC); crv.v1.copy(crv.v0).lerp(qC, .5).y += .7; const lp = ln.geometry.attributes.position; crv.getPoints(60).forEach((q, k) => lp.setXYZ(k, q.x, q.y, q.z)); lp.needsUpdate = true; } const pa = fp.geometry.attributes.position; for (let i = 0; i < 10; i++) { const u = reduce ? i / 10 : ((t * .45 + i / 10 + j * .13) % 1); crv.getPoint(u, _v); pa.setXYZ(i, _v.x, _v.y, _v.z); } pa.needsUpdate = true; });
      lt.forEach(b => { b.m.material.uniforms.ok.value = e * .05; b.m.material.uniforms.oc.value[0].set(bH.c.x, bH.c.y, bH.c.z, bH.r * bH.s); });
    }
    bubs.forEach((b, i) => { b.m.scale.setScalar(b.s); b.m.material.uniforms.uT.value = t; rims[i].position.copy(b.c); rims[i].scale.setScalar(b.r * b.s); rims[i].quaternion.copy(cam.quaternion); });
    setRegions();
    if (aoi) { try { if (mot) mot.update(dt, cam); else aoi.update(dt); } catch (e) { if (!frame.w) { frame.w = 1; console.warn('aoi update', e); } } }
    R.render(S, cam);
    drawLabels();
  }
  function drawLabels() {
    const W = BW(), H = BH(), side = { L: [], R: [] };
    labs.forEach(lb => { const p = AT[lb.dataset.at]; if (!p) { lb.classList.remove('on'); return; } _v.copy(p).project(cam); const vis = _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05; lb.classList.toggle('on', vis); if (!vis) { lb._g && (lb._g.style.display = 'none'); return; }
      side[_v.x < 0 ? 'L' : 'R'].push({ lb, px: (_v.x + 1) / 2 * W, py: (1 - _v.y) / 2 * H }); });
    const mk = lb => { if (!lb._g) { lb._g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); lb._g.innerHTML = '<polyline fill="none"/><circle r="2.4"/><text text-anchor="middle"></text>'; lb._g.style.color = lb.style.getPropertyValue('--c') || '#a8f2f6'; svg.appendChild(lb._g); } lb._g.style.display = ''; return lb._g; };
    const all = [...side.L, ...side.R];
    if (W < 520) {
      all.sort((p, q) => p.px - q.px); let rowH = 0;
      all.forEach((o, i) => { o.lb.style.width = ((W - 12) / 2 - 8) + 'px'; o.lb.dataset.n = i + 1; rowH = Math.max(rowH, o.lb.offsetHeight + 8); });
      all.forEach((o, i) => { const x = 4 + (i % 2) * (W - 12) / 2, y = H + 10 + Math.floor(i / 2) * rowH; o.lb.style.transform = `translate3d(${x | 0}px,${y | 0}px,0)`;
        const g = mk(o.lb); g.children[0].setAttribute('points', ''); g.children[1].setAttribute('r', 8); let mx = o.px, my = o.py; all.slice(0, i).forEach(q => { if (Math.hypot(q.mx - mx, q.my - my) < 20) my = q.my + (my >= q.my ? 20 : -20); }); o.mx = mx; o.my = my; g.children[1].setAttribute('cx', mx); g.children[1].setAttribute('cy', my); g.children[2].textContent = i + 1; g.children[2].setAttribute('x', mx); g.children[2].setAttribute('y', my + 3.5); });
      cv.parentElement.style.marginBottom = (Math.ceil(all.length / 2) * rowH + 10) + 'px'; root.classList.add('nar');
      return;
    }
    root.classList.remove('nar'); cv.parentElement.style.marginBottom = '';
    for (const k of ['L', 'R']) { const arr = side[k].sort((a, b) => a.py - b.py); let y = 14;
      arr.forEach(o => { o.lb.style.width = ''; const w = o.lb.offsetWidth, h = o.lb.offsetHeight; y = Math.max(y, Math.min(H - h - 14, o.py - h - 18)); const x = k === 'L' ? 14 : W - w - 14;
        o.lb.style.transform = `translate3d(${x | 0}px,${y | 0}px,0)`;
        const g = mk(o.lb), ax = k === 'L' ? x + w + 6 : x - 6, ay = y + h * .55, ex = k === 'L' ? ax + 16 : ax - 16;
        g.children[0].setAttribute('points', `${ax},${ay} ${ex},${ay} ${o.px},${o.py}`); g.children[1].setAttribute('r', 2.4); g.children[1].setAttribute('cx', o.px); g.children[1].setAttribute('cy', o.py); g.children[2].textContent = '';
        y += h + 14; }); }
  }
  requestAnimationFrame(frame); root.classList.add('on3d'); window.__v2 = 'ok';
}
