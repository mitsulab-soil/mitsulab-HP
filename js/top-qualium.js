/* © mitsulab. 2026-10-27 TOP の 3D（本人「ロゴを大きく」「環世界 1.0・2.0 をゼロベースで、美しく洗練されたグラフィックで」）
   0：Qualium のロゴ。mitsulab の印の画像を奥行きのある二枚にし、粒が行き来しながら色を変える。
   1：環世界 1.0。三つの泡が離れて浮かぶ。泡＝その生き物の感覚が届く範囲（模式）。
      人＝可視光（およそ 400〜700nm、赤〜紫）／ミツバチ＝紫外線・青・緑（赤は感じにくい。花の紫外線の模様＝蜜標を見える色に置きかえた模式）／
      マダニ＝目で探さず、体温と酪酸（汗のにおい）で動物に気づく（ユクスキュル 1934）。
   2：環世界 2.0＝Qualium。同じ三つの泡が、中央の依代（碧）を介して重なり、大きな Qualium の球の中に入る。縦の軸＝スケール（ミクロ⇄マクロ）、
      まわる輪＝タイム（時の積み重なり）、重なる泡＝環世界。大きさ・色は見やすくした模式。
   画面に入ったときだけ描く。動きを減らす設定では一こまだけ。 */
import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = Math.min(innerWidth, innerHeight) < 700;
function hasGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!hasGL()) document.documentElement.classList.add('v2-no3d');
else document.querySelectorAll('[data-qx]').forEach(f => {
  const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); const k = +f.dataset.qx; (k === 0 ? boot(f, 0) : import('./umwelt-diorama.js?v=20261028e8').then(m => m.bootDiorama(f, k, []))).catch(e => console.warn('top-qualium', e)); } }, { rootMargin: '300px 0px' });
  o.observe(f);
});

const TEX = new THREE.TextureLoader();
const loadTex = u => new Promise((res, rej) => TEX.load(u, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, rej));
const glb = (() => { let P = null; return url => (P || (P = Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]))).then(([{ GLTFLoader }, { MeshoptDecoder }]) => { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); return l.loadAsync(url); }); })();
let MAN = null; const getMan = () => MAN || (MAN = glb('img/hero/3d/man.glb'));

// 泡の殻：縁だけが光る（フレネル）。中はほぼ透明
function bubble(r, col, k = 1) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(col) }, uK: { value: k }, uT: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 w = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-w.xyz); vP = position; gl_Position = projectionMatrix*w; }`,
    fragmentShader: `uniform vec3 uC; uniform float uK; uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec3 N = normalize(vN), V = normalize(vV); float f = 1. - abs(dot(N, V)); float rim = pow(f, 3.4);
        // 薄い膜の虹（縁ほど強く、ゆっくり流れる）・二つの光の映りこみ・内側のかすかな屈折の明暗
        vec3 film = .5 + .5*cos(6.2832*(f*1.6 + vP.y*.35 + uT*.03 + vec3(0., .33, .67)));
        float sp1 = pow(max(dot(reflect(-V, N), normalize(vec3(-.55, .62, .56))), 0.), 28.) * .55;
        float sp2 = pow(max(dot(reflect(-V, N), normalize(vec3(.7, -.25, .66))), 0.), 24.) * .35;
        float inner = smoothstep(.0, .55, f) * (1. - smoothstep(.55, .95, f)) * (.5 + .5*sin(vP.x*3.1 + vP.y*2.3 - uT*.4));
        vec3 col = uC*(.55 + rim*1.1) + film*pow(f, 2.2)*.42 + vec3(1.)*(sp1*1.4 + sp2);
        float a = (rim*.9 + pow(f,1.3)*.07 + inner*.035) * uK + (sp1*.9 + sp2*.5);
        gl_FragColor = vec4(col, clamp(a, 0., 1.)); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, mobile ? 48 : 72, mobile ? 32 : 48), m); s.userData.mat = m; return s;
}
function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
const DOT = dotTex();
function points(pos, col, size, opa = 1) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size, map: DOT, vertexColors: !!col, color: 0xffffff, transparent: true, opacity: opa, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
}
function ring(r, col, opa = .5, n = 160) { const p = []; for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2; p.push(Math.cos(a) * r, 0, Math.sin(a) * r); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: opa, blending: THREE.AdditiveBlending, depthWrite: false })); }
// 色の帯（スペクトル）の輪：stops＝[[t, hex]...]
function specRing(r, stops, y, arc = Math.PI * 1.1) {
  const n = 120, p = [], c = [], C = new THREE.Color(), A = new THREE.Color(), B = new THREE.Color();
  for (let k = 0; k <= n; k++) { const t = k / n, a = -Math.PI / 2 - arc / 2 + t * arc; p.push(Math.cos(a) * r, y, Math.sin(a) * r);
    let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++; const [t0, h0] = stops[i], [t1, h1] = stops[i + 1]; C.copy(A.setHex(h0)).lerp(B.setHex(h1), Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))); c.push(C.r, C.g, C.b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const pts = points(p, c, .07, .95); return pts;
}
const VIS = [[0, 0xff3b30], [.2, 0xff9500], [.38, 0xffe14a], [.55, 0x4cd964], [.75, 0x3a7bff], [1, 0x8a4dff]];      // 人：赤→紫
const BEE = [[0, 0x4cd964], [.4, 0x3a7bff], [.7, 0x8a4dff], [1, 0xd56bff]];                                          // ミツバチ：緑→青→紫外線（紫外線は見える色に置きかえ）

function makeRenderer(cv) {
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.setClearColor(0, 0); return r;
}

async function boot(fig, kind) {
  const cv = fig.querySelector('canvas'); const R = makeRenderer(cv);
  const S = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(kind === 0 ? 32 : 34, 1, .05, 100);
  const labs = [...fig.querySelectorAll('.qx-lab')]; const anchors = [];
  let tick = () => {}; let fitW = 7.4, fitH = 3.6; let customRender = null;
  { // 映りこみの環境（暗い部屋に、碧と金の二つの窓）。物理の質感の照りに使う
    const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0a1424, side: THREE.BackSide })));
    const win = (c, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
    win(0xbff4ff, -6, 5, 5, 6, 3); win(0xffe2a8, 7, 2, -3, 4, 5); win(0x6a7aa8, 0, -7, 0, 12, 12);
    const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(es, .03).texture; pm.dispose(); }
  S.add(new THREE.HemisphereLight(0xcfe8ff, 0x20140c, 1.6)); { const d = new THREE.DirectionalLight(0xfff0dd, 2.2); d.position.set(2, 4, 3); S.add(d); const d2 = new THREE.DirectionalLight(0x9fe8ff, 1.2); d2.position.set(-3, 1, -2); S.add(d2); }

  // 遠いちり（奥行き）
  if (kind === 1) { const p = [], n = mobile ? 260 : 520; for (let i = 0; i < n; i++) p.push((Math.random() - .5) * 18, (Math.random() - .5) * 10, -3 - Math.random() * 8); S.add(points(p, null, .035, .45)); }

  if (kind === 0) {
    const [tl, tr] = await Promise.all([loadTex('img/brand/qualium_glyph_l.webp'), loadTex('img/brand/qualium_glyph_r.webp')]);
    const G = new THREE.Group(); S.add(G); const H = 2.6, W = H * 512 / 1028;
    const pl = (t, col, x) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: t, color: col, transparent: true, depthWrite: false, toneMapped: false })); m.position.x = x; G.add(m); return m; };
    const L = pl(tl, 0xe9f1ef, -W / 2), Rr = pl(tr, 0xe9f1ef, W / 2);
    // 粒：球の中をまわり、左では碧の色、右では金の色に変わる＝二つの側が混ざる
    const n = mobile ? 650 : 1300, base = new Float32Array(n * 3), sp = new Float32Array(n);
    for (let i = 0; i < n; i++) { const r = Math.pow(Math.random(), .55) * 1.28, a = Math.random() * Math.PI * 2, y = (Math.random() * 2 - 1) * Math.sqrt(Math.max(0, 1.3 * 1.3 - r * r)) * .95; base[i * 3] = r; base[i * 3 + 1] = y; base[i * 3 + 2] = a; sp[i] = .08 + Math.random() * .22; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aB', new THREE.Float32BufferAttribute(base, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sp, 1));
    const pm = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uMap: { value: DOT }, uPx: { value: R.getPixelRatio() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aB; attribute float aS; uniform float uT; uniform float uPx; varying vec3 vC; varying float vA;
        void main(){ float a = aB.z; float x = 1.06 - mod(aB.z*.41 + uT*(.12 + aS*.25), 2.12); float lim = sqrt(max(0., 1.1236 - x*x)); vec3 p = vec3(x, aB.y/1.3*lim*.95, sin(a)*aB.x*.3*lim);
          vC = vec3(.913,.945,.937);
          vA = .35 + .65*smoothstep(-.6,.6,p.z) ; vA *= .55 + .45*sin(uT*1.3 + aB.z*7.); vA *= 1. - smoothstep(.96, 1.05, length(p.xy));
          vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = (2.2 + 3.5*fract(aB.z*13.))*uPx*(4./-mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC, t.a*vA*.8); }` });
    // 2026-10-28 本人「ロゴの背景の粒子を無くす」：粒は置かない（ロゴの絵だけ）
    const halo = ring(1.36, 0xe9f1ef, .22, 220); halo.rotation.x = Math.PI / 2; 
    const halo2 = ring(1.46, 0xe9f1ef, .12, 220); halo2.rotation.x = Math.PI / 2; 
    fitW = 3.3; fitH = 3.3; cam.position.set(0, 0, 6);
    let mx = 0, my = 0; addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    tick = t => { const s = .5 + .5 * Math.sin(t * .45);
      pm.uniforms.uT.value = t; halo.rotation.z = t * .05; halo2.rotation.z = -t * .03; };
  }

  if (kind === 1) {
    // 環世界 1.0（2026-10-28 作り直し）：同じ一輪の花を、三つの窓（人・ミツバチ・マダニ）で見る。窓ごとに届くものだけを描く（模式）。
    // 写実の花（2026-10-28 本人「3D のフォトリアルに」）：花びらは反りと筋のある面、中心は筒状花の粒、茎と葉は筋のある面。AI 画像は使わない（質感は手で描いた canvas）。
    const cvTex = (draw, w = 512, h = 128, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const tx = new THREE.CanvasTexture(c); if (srgb) tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx; };
    const petalTex = (base, tip, deep) => cvTex((x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, deep); g.addColorStop(.35, base); g.addColorStop(1, tip); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.globalAlpha = .18; x.strokeStyle = '#000'; for (let i = 0; i < 26; i++) { const y0 = h * (.08 + i / 26 * .84); x.lineWidth = .8 + Math.random(); x.beginPath(); x.moveTo(0, h / 2 + (y0 - h / 2) * .2); x.quadraticCurveTo(w * .5, y0, w, y0 + (Math.random() - .5) * 6); x.stroke(); }
      x.globalAlpha = .08; for (let i = 0; i < 1400; i++) { x.fillStyle = Math.random() < .5 ? '#fff' : '#000'; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } });
    const veinBump = cvTex((x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a5a5a'; for (let i = 0; i < 26; i++) { const y0 = h * (.08 + i / 26 * .84); x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, h / 2 + (y0 - h / 2) * .2); x.quadraticCurveTo(w * .5, y0, w, y0); x.stroke(); } }, 512, 128, false);
    const petalGeo = (() => { const g = new THREE.PlaneGeometry(1, 1, 24, 8); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) + .5, v = p.getY(i); const width = Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.pow(u, .62)))) * .2 * (1 - .1 * u) + .012; const x = u * .6, z = v * width; const y = -.07 * u * u + .035 * Math.cos(v * Math.PI) * u;
        p.setXYZ(i, x + .1, y, z); } g.computeVertexNormals(); return g; })();
    const mkPetalMat = (map, color = 0xffffff) => new THREE.MeshPhysicalMaterial({ map, color, bumpMap: veinBump, bumpScale: 1.2, roughness: .55, sheen: .6, sheenRoughness: .5, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide });
    const mkFlower = (petalMat, centerMat) => { const g = new THREE.Group();
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c7f45, roughness: .62, bumpMap: veinBump, bumpScale: .4 });
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(.04, -1.75, 0), new THREE.Vector3(-.02, -1.1, .02), new THREE.Vector3(.03, -.5, -.01), new THREE.Vector3(0, -.02, 0)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .028, 10, false), stemMat));
      const leafMat = new THREE.MeshPhysicalMaterial({ map: cvTex((x, w, h) => { const gg = x.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#41622f'); gg.addColorStop(.5, '#6a8f48'); gg.addColorStop(1, '#41622f'); x.fillStyle = gg; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(220,240,180,.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke(); x.lineWidth = 1; for (let i = 1; i < 12; i++) { x.beginPath(); x.moveTo(w * i / 12, h / 2); x.lineTo(w * i / 12 + 40, 6); x.moveTo(w * i / 12, h / 2); x.lineTo(w * i / 12 + 40, h - 6); x.stroke(); } }), roughness: .5, sheen: .3, side: THREE.DoubleSide });
      const leafGeo = (() => { const lg = new THREE.PlaneGeometry(1, 1, 20, 6); const p = lg.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) + .5, v = p.getY(i); const wd = Math.sin(Math.PI * u) * .14; p.setXYZ(i, u * .62, -.12 * u * u + .03 * Math.abs(v) * 4 * wd, v * wd * 2); } lg.computeVertexNormals(); return lg; })();
      [[-1.05, 2.6, .35], [-1.35, -.4, .5]].forEach(([y, ry, rz]) => { const l = new THREE.Mesh(leafGeo, leafMat); l.position.set(0, y, 0); l.rotation.set(0, ry, rz); g.add(l); });
      const head = new THREE.Group(); g.add(head);
      for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 11; i++) { const p = new THREE.Mesh(petalGeo, petalMat); p.rotation.y = (i + ring * .5) / 11 * Math.PI * 2; p.rotation.z = -.12 - ring * .1; p.position.y = -ring * .01; head.add(p); }
      const disk = new THREE.Mesh(new THREE.SphereGeometry(.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), centerMat); disk.scale.y = .45; head.add(disk);
      { const n = 260, fl = new THREE.InstancedMesh(new THREE.SphereGeometry(.011, 6, 4), centerMat, n), M = new THREE.Matrix4(); for (let i = 0; i < n; i++) { const r = .125 * Math.sqrt(i / n), a = i * 2.39996; const y = .055 * Math.sqrt(Math.max(0, 1 - (r / .13) ** 2)) + .004; M.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r); fl.setMatrixAt(i, M); } head.add(fl); }
      head.rotation.x = .78; g.userData.head = head; g.scale.setScalar(1.05); return g; };
    const bokeh = (s, cols) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.75, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const tx = new THREE.CanvasTexture(c);
      for (let i = 0; i < 26; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: cols[i % cols.length], transparent: true, opacity: .25 + Math.random() * .25, depthWrite: false })); sp.position.set((Math.random() - .5) * 4, (Math.random() - .5) * 4, -2.5 - Math.random() * 2); sp.scale.setScalar(.3 + Math.random() * .6); s.add(sp); } };
    // 人：黄色の花
    const sHum = new THREE.Scene(), sBee = new THREE.Scene(), sTick = new THREE.Scene();
    [sHum, sBee].forEach(s => { s.add(new THREE.HemisphereLight(0xfff6e8, 0x2a3424, 1.5)); const d = new THREE.DirectionalLight(0xfff2de, 2.6); d.position.set(2, 3, 3); s.add(d); const r = new THREE.DirectionalLight(0xcfe2ff, 1.1); r.position.set(-2, 1, -3); s.add(r); }); if (S.environment) { sHum.environment = S.environment; sBee.environment = S.environment; }
    const fH = mkFlower(mkPetalMat(petalTex('#f2c11c', '#ffe58a', '#d99a10')), new THREE.MeshStandardMaterial({ color: 0x8a4a12, roughness: .85 })); sHum.add(fH); bokeh(sHum, [0x9cc078, 0x6f9b58, 0xe8d79a]); bokeh(sBee, [0x6f7fd8, 0x9db0ff, 0x5a62b8]);
    // ミツバチ：紫外線の模様（中心が濃く、外が明るい「的」）を、見える色に置きかえた模式
    const uvMat = new THREE.ShaderMaterial({ vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec3 vP; void main(){ float r = clamp((vP.x-.02)/.7, 0., 1.); vec3 inner = vec3(.42,.24,.78), outer = vec3(.62,.72,1.); vec3 c = mix(inner, outer, smoothstep(.2,.6,r)); gl_FragColor = vec4(c, 1.); }' });
    const fB = mkFlower(mkPetalMat(petalTex('#7f8fff', '#c9d6ff', '#4a2a9e')), new THREE.MeshStandardMaterial({ color: 0x3d2276, roughness: .8 })); sBee.add(fB);
    
    // マダニ：目で花を見ない。体温（あたたかい色の広がり）と、汗のにおい（酪酸など）の粒だけ
    const warm = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,140,60,.95)'); gr.addColorStop(.45, 'rgba(235,95,40,.45)'); gr.addColorStop(1, 'rgba(255,120,70,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    const heat = new THREE.Sprite(new THREE.SpriteMaterial({ map: warm, transparent: true, depthWrite: false })); heat.scale.setScalar(1.9); sTick.add(heat);
    const nS = 70, sp = new Float32Array(nS * 3), sd = []; for (let i = 0; i < nS; i++) sd.push([Math.random() * 6.28, Math.random(), .3 + Math.random() * .7]);
    const smell = points(sp, null, .05, .8); smell.material.color.setHex(0xffa860); smell.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sTick.add(smell);
    const ghost = mkFlower(new THREE.MeshBasicMaterial({ color: 0x1a222c }), new THREE.MeshBasicMaterial({ color: 0x1a222c })); ghost.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: 0x3a4658, transparent: true, opacity: .9 }); const e = o.isInstancedMesh ? new THREE.Group() : new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 60), new THREE.LineBasicMaterial({ color: 0x8a9bb0, transparent: true, opacity: .3 })); o.add(e); } }); sTick.add(ghost);
    const pc = new THREE.PerspectiveCamera(30, 1, .05, 50); pc.position.set(0, .15, 3.6); pc.lookAt(0, -.25, 0);
    const scenes = [sHum, sBee, sTick];
    tick = t => { [fH, fB, ghost].forEach((f, i) => { f.rotation.y = Math.sin(t * .35 + i) * .35; f.rotation.z = Math.sin(t * .8 + i) * .03; });
      heat.position.set(Math.sin(t * .4) * .6, -.1 + Math.sin(t * .3) * .2, .2); heat.material.opacity = .75 + .25 * Math.sin(t * 1.3);
      for (let i = 0; i < nS; i++) { const [a, ph, s] = sd[i]; const u = (ph + t * .08 * s) % 1; sp[i * 3] = heat.position.x + Math.cos(a) * u * 1.1; sp[i * 3 + 1] = heat.position.y + Math.sin(a) * u * .8 + u * .3; sp[i * 3 + 2] = .2; } smell.geometry.attributes.position.needsUpdate = true; smell.material.opacity = .8; };
    customRender = () => { const w = fig.clientWidth || 300, h = fig.clientHeight || 300; const row = true; const n = 3, gap = row ? 12 : 44;
      const cw = row ? (w - gap * 2) / 3 : w, ch = row ? h - 44 : (h - 44 - gap * 2) / 3;
      R.setScissorTest(true); R.setClearColor(0x000000, 0); R.clear();
      for (let i = 0; i < n; i++) { const x = row ? i * (cw + gap) : 0, yTop = row ? 0 : i * (ch + gap); const y = h - yTop - ch;
        R.setViewport(x, y, cw, ch); R.setScissor(x, y, cw, ch); R.setClearColor(i === 2 ? 0x0d1219 : 0x0a1220, 1); R.clear();
        pc.aspect = cw / ch; pc.position.z = cw / ch < 1 ? 3.0 / (cw / ch) : 3.6; pc.updateProjectionMatrix(); R.render(scenes[i], pc);
        const lab = labs[i]; if (lab) { lab.style.width = cw + 'px'; lab.style.whiteSpace = 'normal'; lab.style.transform = `translate(${x + cw / 2}px,${yTop + ch + 4}px) translate(-50%,0)`; } }
      R.setScissorTest(false); };
  }
  if (kind === 2) {
    // 環世界 2.0（2026-10-28 作り直し）：一人の人の目の高さで、氷川参道（実データの線）をゆっくり歩く。
    // その視界に、情報の層が一枚ずつ重なる：地形（国土地理院の等高線）・歴史（鳥居と丁石の位置）・生き物（欅の位置）・音（鳥の声の広がり＝模式）。
    const [meta, buffer] = await (window.__sandoWire || (window.__sandoWire = Promise.all([fetch('img/hero/sando_wire.json').then(r => r.json()), fetch('img/hero/sando_wire.bin').then(r => r.arrayBuffer())])));
    const ints = new Int16Array(buffer), C = meta.center, o = C[Math.floor(C.length * .55)];
    const lm = (c, a) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const near = (x, z) => Math.abs(x - o[0]) < 260 && Math.abs(z - o[2]) < 420;
    const ribbon = (P, w, col, a) => { const V = []; for (let i = 0; i < P.length; i += 6) { const ax = P[i], ay = P[i + 1], az = P[i + 2], bx = P[i + 3], by = P[i + 4], bz = P[i + 5]; let nx, ny, nz; if (Math.abs(by - ay) > Math.hypot(bx - ax, bz - az)) { nx = w / 2; ny = 0; nz = 0; } else { const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1; nx = -dz / L * w / 2; ny = 0; nz = dx / L * w / 2; }
      V.push(ax - nx, ay - ny, az - nz, bx - nx, by - ny, bz - nz, bx + nx, by + ny, bz + nz, ax - nx, ay - ny, az - nz, bx + nx, by + ny, bz + nz, ax + nx, ay + ny, az + nz); }
      return new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(V, 3)), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); };
    const base = new THREE.Group(); S.add(base);
    // 写実の地（2026-10-28 本人「3D のフォトリアルに」）：路面・地形・鳥居＝Qualium 大宮と同じ PLATEAU／国土地理院の 3D、石畳＝ambientCG PavingStones133（CC0）、
    // 並木敷き＝落ち葉の質感（CC0）、欅＝同じ欅の模型と葉の画像（CC0）。AI 画像は使わない。
    S.background = new THREE.Color(0x9fb0b8); S.fog = new THREE.FogExp2(0xa9b6ba, mobile ? .0095 : .0075);
    S.children.filter(o => o.isLight).forEach(o => S.remove(o));
    S.add(new THREE.HemisphereLight(0xdfeaf0, 0x4a4434, 1.5)); { const d = new THREE.DirectionalLight(0xfff1dc, 2.4); d.position.set(-30, 60, 20); S.add(d); }
    R.toneMappingExposure = 1.0;
    const TL = new THREE.TextureLoader(), wtex = (u, rep, srgb) => { const x = TL.load(u); x.wrapS = x.wrapT = THREE.RepeatWrapping; if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; x.userData.rep = rep; return x; };
    const worldUV = (m, rep) => { m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vec4 wp_ = modelMatrix * vec4(position, 1.); \n#if defined(USE_MAP)\n vMapUv = wp_.xz * ' + rep.toFixed(3) + ';\n#endif\n#if defined(USE_NORMALMAP)\n vNormalMapUv = wp_.xz * ' + rep.toFixed(3) + ';\n#endif'); }; return m; };
    { const sky = TL.load('img/hero/3d/sando_sky.webp'); sky.colorSpace = THREE.SRGBColorSpace; sky.mapping = THREE.EquirectangularReflectionMapping; S.background = sky; S.backgroundIntensity = .9; }
    (async () => { try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
      const toLocal = g => { g.position.set(-o[0], -o[1], -o[2]); base.add(g); return g; };
      const pave = worldUV(new THREE.MeshStandardMaterial({ map: wtex('img/hero/3d/ql_paving_c.webp', 1, true), normalMap: wtex('img/hero/3d/ql_paving_n.webp', 1), roughness: .88, color: 0xc9c2b4 }), .45);
      const leaves = worldUV(new THREE.MeshStandardMaterial({ map: wtex('img/hero/3d/sando_leaves.jpg', 1, true), roughness: .95, color: 0xb8ae94 }), .25);
      { const gp = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), leaves); gp.rotation.x = -Math.PI / 2; gp.position.y = -.12; base.add(gp); window.__sandoGP = gp; }
      const road = await gl.loadAsync('img/hero/3d/road.glb');
      road.scene.traverse(m => { if (m.isMesh) { m.material = pave; m.position.y += .02; } }); toLocal(road.scene);
      
      const tg = await gl.loadAsync('img/hero/3d/sando_keyaki.glb');
      tg.scene.updateMatrixWorld(true); const parts = []; tg.scene.traverse(m => { if (m.isMesh) { if (m.material) { m.material.side = THREE.DoubleSide; if (/leaves/.test(m.name)) { m.material.alphaTest = .45; m.material.transparent = false; } } parts.push(m); } });
      const bb = new THREE.Box3().setFromObject(tg.scene), sz = bb.getSize(new THREE.Vector3());
      const dC = (x, z) => { let m = 1e9; for (const c of C) { const d = Math.hypot(c[0] - x, c[2] - z); if (d < m) m = d; } return m; };
      const lim = mobile ? 130 : 180, sorted = treesNear.filter(([x, , z]) => dC(x, z) > 4).sort((a, b) => Math.hypot(a[0] - o[0], a[2] - o[2]) - Math.hypot(b[0] - o[0], b[2] - o[2])).slice(0, lim);
      const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3();
      parts.forEach(m => { const im = new THREE.InstancedMesh(m.geometry, m.material, sorted.length); sorted.forEach(([x, y, z], i) => { const h = 16 + (Math.sin(x * 12.9 + z * 3.1) * .5 + .5) * 6, sc = h / sz.y; Q.setFromAxisAngle(V.set(0, 1, 0), (x * 7.3 + z) % 6.283); SC.set(sc, sc, sc);
        M4.compose(V.set(x - o[0], y - o[1] - bb.min.y * sc - .2, z - o[2]), Q, SC).multiply(m.matrixWorld); im.setMatrixAt(i, M4); }); im.frustumCulled = false; base.add(im); });
      const sg = await gl.loadAsync('img/hero/3d/structures.glb'); const P = await fetch('img/hero/3d/place.json').then(r => r.json());
      P.struct.filter(s => /torii/.test(s.m) && near(s.p[0], s.p[2])).forEach(s => { const src = sg.scene.getObjectByName(s.m); if (!src) return; const c = src.clone(); c.position.set(s.p[0] - o[0], s.p[1] - o[1], s.p[2] - o[2]); c.rotation.set(0, s.r || 0, 0); c.scale.setScalar(s.s || 1); base.add(c); });
    } catch (err) { console.warn('sando photo', err); } })();
    const layer = () => { const g = new THREE.Group(); S.add(g); return g; };
    // 地形：等高線
    const L1 = layer(); { const P = []; for (const [e, xs] of meta.contours) { for (let i = 0; i + 3 < xs.length; i += 2) { const x1 = xs[i], z1 = xs[i + 1], x2 = xs[i + 2], z2 = xs[i + 3]; if (!near(x1, z1)) continue; P.push(x1 - o[0], e - o[1] + .25, z1 - o[2], x2 - o[0], e - o[1] + .25, z2 - o[2]); } }
      { const V = [], h = .9; for (let i = 0; i < P.length; i += 6) { const [ax, ay, az, bx, by, bz] = P.slice(i, i + 6); V.push(ax, ay, az, bx, by, bz, bx, by + h, bz, ax, ay, az, bx, by + h, bz, ax, ay + h, az); }
        const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(V, 3)); const uv = []; for (let i = 0; i < V.length / 18; i++) uv.push(0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        L1.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uO: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'uniform float uO; varying vec2 vU; void main(){ gl_FragColor = vec4(vec3(.49,1.,.77), (1.-vU.y)*1.*uO); }' }))); } }
    // 歴史：鳥居と丁石の位置に立つ光の柱
    const L2 = layer(); { const P = []; [...meta.marks.map(m => m.p), ...meta.choishi].forEach(([x, y, z], k) => { if (!near(x, z)) return; const h = k < meta.marks.length ? 22 : 7; P.push(x - o[0], y - o[1], z - o[2], x - o[0], y - o[1] + h, z - o[2]); for (let j = 0; j < 16; j++) { const a = j / 16 * 6.283, b = (j + 1) / 16 * 6.283, r = k < meta.marks.length ? 2.4 : .9; P.push(x - o[0] + Math.cos(a) * r, y - o[1] + .1, z - o[2] + Math.sin(a) * r, x - o[0] + Math.cos(b) * r, y - o[1] + .1, z - o[2] + Math.sin(b) * r); } });
      L2.add(ribbon(P, .28, 0xf2c56e, .95)); }
    // 生き物：欅の位置（樹冠の輪）
    const L3 = layer(); const treesNear = meta.trees.filter(([x, , z]) => near(x, z)); { const P = []; treesNear.forEach(([x, y, z]) => { for (const [r, hh] of [[1.6, .25]]) for (let j = 0; j < 20; j++) { const a = j / 20 * 6.283, b = (j + 1) / 20 * 6.283; P.push(x - o[0] + Math.cos(a) * r, y - o[1] + hh, z - o[2] + Math.sin(a) * r, x - o[0] + Math.cos(b) * r, y - o[1] + hh, z - o[2] + Math.sin(b) * r); } P.push(x - o[0], y - o[1], z - o[2], x - o[0], y - o[1] + 7.5, z - o[2]); });
      L3.add(ribbon(P, .12, 0xc9b8ff, .95)); }
    // 音：いくつかの樹冠から、鳥の声の輪が広がる（模式）
    const L4 = layer(); const rings = []; treesNear.filter((_, i) => i % 9 === 0).slice(0, 14).forEach(([x, y, z], i) => { for (let k = 0; k < 3; k++) { const r = ring(1, 0xa8f2f6, .95, 64); r.position.set(x - o[0], y - o[1] + 12, z - o[2]); r.userData = { ph: k / 3 + i * .17 }; L4.add(r); rings.push(r); } });
    const layers = [L1, L2, L3, L4]; layers.forEach(g => g.traverse(m => { if (m.material) { m.userData.a = m.material.opacity; m.material.blending = THREE.NormalBlending; m.material.needsUpdate = true; } }));
    // 目の高さの道すじ
    const path = new THREE.CatmullRomCurve3(C.map(([x, y, z]) => new THREE.Vector3(x - o[0], y - o[1] + 1.6, z - o[2])));
    cam.fov = 56; cam.near = .3; cam.far = 900; cam.updateProjectionMatrix(); fitW = 0; fitH = 0;
    const per = 1.1, hold = 11, cyc = per * 4 + hold; const P0 = new THREE.Vector3(), P1 = new THREE.Vector3();
    tick = t => { const u = .5 + ((t * .0016) % .12) - .06; path.getPointAt(Math.min(.99, Math.max(0, u)), P0); path.getPointAt(Math.min(1, u + .02), P1); cam.position.copy(P0); P1.y += .6; cam.lookAt(P1); if (window.__sandoGP) window.__sandoGP.position.y = P0.y - 1.6 - .1;
      const tt = reduce ? cyc - 1 : (t + per * 4) % cyc;
      layers.forEach((g, i) => { const k = Math.min(1, Math.max(0, (tt - i * per) / 1.2)), e = k * k * (3 - 2 * k), out = tt > cyc - 1 ? cyc - tt : 1, v = e * out;
        g.userData.v = v; g.traverse(m => { if (m.material) { m.material.opacity = m.userData.a * v; if (m.material.uniforms && m.material.uniforms.uO) m.material.uniforms.uO.value = v; } }); const lab = labs[i]; if (lab) lab.style.opacity = "1"; });
      rings.forEach(r => { const s = ((t * .35 + r.userData.ph) % 1); r.scale.setScalar(1 + s * 5); r.material.opacity = .95 * (1 - s) * (L4.children[0] ? 1 : 0) * (L4.userData.v == null ? 1 : L4.userData.v); }); };
  }

  // 大きさ合わせ：fitW×fitH が必ず入る距離
  const v3 = new THREE.Vector3();
  function size() { const w = fig.clientWidth || 300, h = fig.clientHeight || 300; R.setSize(w, h, false); cam.aspect = w / h; if (!fitW) { cam.updateProjectionMatrix(); return; } const th = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); const d = Math.max(fitH / 2 / th, fitW / 2 / th / cam.aspect) * 1.04; cam.position.setLength(d); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); }
  size(); new ResizeObserver(size).observe(fig);
  function place() { if (!labs.length) return; const w = fig.clientWidth, h = fig.clientHeight;
    labs.forEach((el, i) => { const o = anchors[+el.dataset.at]; if (!o) return; let y = 0;
      if (o.qs) v3.set(0, 2.05, 0); else if (o.userData && o.userData.b) v3.set(0, o.userData.b.geometry.parameters.radius + .08, 0); else if (o === anchors[2] && kind === 9) v3.set(0, 2.0, 0); else if (o === anchors[3] && kind === 9) v3.set(0, 0, 1.95); else v3.set(-.05, .5, .6);
      v3.applyMatrix4(o.matrixWorld || new THREE.Matrix4()); v3.project(cam);
      let x = (v3.x * .5 + .5) * w, yy = (-v3.y * .5 + .5) * h; x = Math.max(56, Math.min(w - 56, x)); yy = Math.max(30, Math.min(h - 4, yy)); el.style.transform = `translate(${x}px,${yy}px) translate(-50%,${el.dataset.below ? '0' : '-100%'})`; }); }
  let vis = true, t0 = performance.now(), last = t0, raf = 0;
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; if (vis && !raf && !reduce) raf = requestAnimationFrame(loop); }).observe(fig);
  function frame(now) { now = Math.max(now, performance.now()); const t = Math.max(0, (now - t0) / 1000); tick(t, (now - last) / 1000); last = now; S.updateMatrixWorld(); place(); if (customRender) customRender(); else R.render(S, cam); }
  function loop(now) { raf = 0; if (!vis || document.hidden) return; frame(now); raf = requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !raf && !reduce) raf = requestAnimationFrame(loop); });
  frame(performance.now() + 4000); fig.classList.add('on');
  if (!reduce) raf = requestAnimationFrame(loop);
}
