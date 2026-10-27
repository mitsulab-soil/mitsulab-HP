/* © mitsulab. 2026-10-27 TOP の 3D（本人「ロゴを大きく」「環世界 1.0・2.0 をゼロベースで、美しく洗練されたグラフィックで」）
   0：Qualium のロゴ。左半分（脳）と右半分（宇宙から新芽まで）を奥行きのある二枚にし、粒が二つの側を行き来しながら色を変える＝混ざり合う。
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
  const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); boot(f, +f.dataset.qx).catch(e => console.warn('top-qualium', e)); } }, { rootMargin: '300px 0px' });
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
  let tick = () => {}; let fitW = 7.4, fitH = 3.6;
  { // 映りこみの環境（暗い部屋に、碧と金の二つの窓）。物理の質感の照りに使う
    const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0a1424, side: THREE.BackSide })));
    const win = (c, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
    win(0xbff4ff, -6, 5, 5, 6, 3); win(0xffe2a8, 7, 2, -3, 4, 5); win(0x6a7aa8, 0, -7, 0, 12, 12);
    const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(es, .03).texture; pm.dispose(); }
  S.add(new THREE.HemisphereLight(0xcfe8ff, 0x20140c, 1.6)); { const d = new THREE.DirectionalLight(0xfff0dd, 2.2); d.position.set(2, 4, 3); S.add(d); const d2 = new THREE.DirectionalLight(0x9fe8ff, 1.2); d2.position.set(-3, 1, -2); S.add(d2); }

  // 遠いちり（奥行き）
  { const p = [], n = mobile ? 260 : 520; for (let i = 0; i < n; i++) p.push((Math.random() - .5) * 18, (Math.random() - .5) * 10, -3 - Math.random() * 8); S.add(points(p, null, .035, .45)); }

  if (kind === 0) {
    const [tl, tr] = await Promise.all([loadTex('img/brand/qualium_glyph_l.webp'), loadTex('img/brand/qualium_glyph_r.webp')]);
    const G = new THREE.Group(); S.add(G); const H = 2.6, W = H * 512 / 1028;
    const pl = (t, col, x) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: t, color: col, transparent: true, depthWrite: false, toneMapped: false })); m.position.x = x; G.add(m); return m; };
    const L = pl(tl, 0xd9fbff, -W / 2), Rr = pl(tr, 0xfff2da, W / 2);
    // 粒：球の中をまわり、左（脳）では碧の色、右（宇宙）では金の色に変わる＝二つの側が混ざる
    const n = mobile ? 650 : 1300, base = new Float32Array(n * 3), sp = new Float32Array(n);
    for (let i = 0; i < n; i++) { const r = Math.pow(Math.random(), .55) * 1.28, a = Math.random() * Math.PI * 2, y = (Math.random() * 2 - 1) * Math.sqrt(Math.max(0, 1.3 * 1.3 - r * r)) * .95; base[i * 3] = r; base[i * 3 + 1] = y; base[i * 3 + 2] = a; sp[i] = .08 + Math.random() * .22; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aB', new THREE.Float32BufferAttribute(base, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sp, 1));
    const pm = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uMap: { value: DOT }, uPx: { value: R.getPixelRatio() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aB; attribute float aS; uniform float uT; uniform float uPx; varying vec3 vC; varying float vA;
        void main(){ float a = aB.z + uT*aS; vec3 p = vec3(cos(a)*aB.x, aB.y, sin(a)*aB.x*.55);
          float side = smoothstep(.35,-.35,p.x); vC = mix(vec3(1.,.82,.45), vec3(.55,.97,1.), side);
          vA = .35 + .65*smoothstep(-.6,.6,p.z) ; vA *= .55 + .45*sin(uT*1.3 + aB.z*7.);
          vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = (2.2 + 3.5*fract(aB.z*13.))*uPx*(4./-mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC, t.a*vA*.8); }` });
    const P = new THREE.Points(g, pm); P.frustumCulled = false; G.add(P);
    const halo = ring(1.36, 0xbfefff, .22, 220); halo.rotation.x = Math.PI / 2; G.add(halo);
    const halo2 = ring(1.46, 0xf2c56e, .12, 220); halo2.rotation.x = Math.PI / 2; G.add(halo2);
    fitW = 3.3; fitH = 3.3; cam.position.set(0, 0, 6);
    let mx = 0, my = 0; addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    tick = t => { const s = .5 + .5 * Math.sin(t * .45);
      G.rotation.y = Math.sin(t * .22) * .28 + mx * .25; G.rotation.x = Math.sin(t * .17) * .07 + my * .12;
      L.position.z = .1 + s * .18; Rr.position.z = -.1 - s * .18; L.position.x = -W / 2 - s * .03; Rr.position.x = W / 2 + s * .03;
      pm.uniforms.uT.value = t; halo.rotation.z = t * .05; halo2.rotation.z = -t * .03; };
  }

  if (kind === 1 || kind === 2) {
    if (!window.__aoiBuf) window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
    const two = kind === 2; const G = new THREE.Group(); S.add(G);
    const cols = [0xffe6c4, 0xb9a6ff, 0xff9a5a];
    const tall = fig.clientWidth / Math.max(1, fig.clientHeight) < 1.25;
    const home = two ? [new THREE.Vector3(-.78, -.1, .25), new THREE.Vector3(.72, .38, -.1), new THREE.Vector3(.18, -.72, .45)] : tall ? [new THREE.Vector3(-1.2, .95, 0), new THREE.Vector3(1.2, 1.0, 0), new THREE.Vector3(0, -1.55, 0)] : [new THREE.Vector3(-2.45, 0, 0), new THREE.Vector3(0, .1, 0), new THREE.Vector3(2.45, 0, 0)];
    const rad = two ? [1.05, .8, .72] : [1.08, 1.0, .92];
    if (!two && !tall) { home[0].z = .25; home[1].z = -.35; home[2].z = .2; }
    const B = home.map((h, i) => { const g = new THREE.Group(); g.position.copy(h); G.add(g); const b = bubble(rad[i], cols[i], two ? .75 : 1); g.add(b); g.userData.b = b;
      const pl = new THREE.PointLight(cols[i], two ? .8 : 1.2, rad[i] * 2.4, 1.6); pl.position.set(rad[i] * .3, rad[i] * .5, rad[i] * .6); g.add(pl);
      if (!two) { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: cols[i], transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.set(rad[i] * 2.6, rad[i] * .42, 1); gl.position.y = -rad[i] - .06; g.add(gl); g.userData.glow = gl; }
      return g; });
    // 人
    glb('img/hero/3d/man.glb').then(gl => { const o = gl.scene, bx = new THREE.Box3().setFromObject(o), sz = bx.getSize(new THREE.Vector3()), k = (two ? 1.25 : 1.45) / sz.y; o.scale.setScalar(k);
      o.position.set(-(bx.min.x + sz.x / 2) * k, -bx.min.y * k - (two ? .66 : .76), -(bx.min.z + sz.z / 2) * k); o.rotation.y = .5;
      o.traverse(m => { if (m.isMesh) { m.frustumCulled = false; m.material = new THREE.MeshPhysicalMaterial({ color: 0xf2dccb, roughness: .55, metalness: 0, sheen: .6, sheenColor: new THREE.Color(0xffe6c4), clearcoat: .15, flatShading: false }); if (m.geometry && !m.geometry.userData.sm) { m.geometry.computeVertexNormals(); m.geometry.userData.sm = 1; } } }); B[0].add(o); }).catch(e => console.warn('man', e));
    B[0].add(specRing(rad[0] * .98, VIS, -rad[0] * .55, Math.PI * 1.3));
    // ミツバチと、花の紫外線の模様（蜜標）を見える色に置きかえた模式
    try { const C = await import('./kit/creatures.js'); const bee = C.makeBee(); bee.scale.setScalar(two ? .55 : .78); bee.position.set(0, .12, .1); bee.rotation.set(.25, -2.3, 0); B[1].add(bee); B[1].userData.bee = bee; } catch (e) { console.warn('bee', e); }
    { const p = [], c = [], C = new THREE.Color(); const n = mobile ? 260 : 420, s = two ? .32 : .42;
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, petal = Math.abs(Math.cos(a * 2.5)), r = Math.sqrt(Math.random()) * s * (.35 + .65 * petal); const inner = r < s * .3;
        p.push(Math.cos(a) * r, -.42 * (two ? .8 : 1) + Math.sin(a) * r * .5, .3 + Math.sin(a) * r * .3); C.setHex(inner ? 0xe07bff : 0x7d6bff).lerp(new THREE.Color(0xcfe0ff), inner ? 0 : Math.random() * .4); c.push(C.r, C.g, C.b); }
      B[1].add(points(p, c, .05, .95)); }
    B[1].add(specRing(rad[1] * .98, BEE, -rad[1] * .55, Math.PI * 1.0));
    // マダニ：熱の気配（橙の暈）と、下から立ちのぼる酪酸のにおいの粒
    try { const M3 = await import('./umwelt-3d.js?v=20261026w'); const tk = M3.makeTick(); tk.scale.setScalar(two ? .46 : .6); tk.position.set(0, .05, .15); tk.rotation.set(1.3, 0, .4); tk.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(1.5); } }); B[2].add(tk); } catch (e) { console.warn('tick', e); }
    { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,150,80,.75)'); gr.addColorStop(.5, 'rgba(255,90,40,.22)'); gr.addColorStop(1, 'rgba(255,60,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(rad[2] * 1.5); sp.position.y = -.1; B[2].add(sp); }
    const nb = mobile ? 50 : 90, bp = new Float32Array(nb * 3), bs = []; for (let i = 0; i < nb; i++) bs.push([(Math.random() - .5) * .9, Math.random(), (Math.random() - .5) * .5, .15 + Math.random() * .25]);
    const butyr = points(bp, null, .05, .8); butyr.material.color.setHex(0xffc08a); butyr.geometry.setAttribute('position', new THREE.BufferAttribute(bp, 3)); B[2].add(butyr);
    const hr = rad[2];
    anchors.push(...B);

    let core = null, qs = null, scaleAx = null, timeR = null;
    if (two) {
      // 依代（碧）：中央の小さな光。泡どうしを糸で結ぶ
      core = new THREE.Group(); G.add(core);
      const coreDot = new THREE.Mesh(new THREE.SphereGeometry(.12, 32, 24), new THREE.MeshBasicMaterial({ color: 0xc8fbff, toneMapped: false })); core.add(coreDot);
      // 碧（依代）の 3D：共通の aoi.vrm を光の縁だけの姿で小さく立たせる
      (async () => { try {
        const [V, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('@pixiv/three-vrm'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
        const Ld = new GLTFLoader(); Ld.setMeshoptDecoder(MeshoptDecoder); Ld.register(p => new V.VRMLoaderPlugin(p));
        const buf = await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })));
        const g = await Ld.parseAsync(buf.slice(0), ''); const v = g.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(g.scene); V.VRMUtils.rotateVRM0(v);
        const N = n => v.humanoid.getNormalizedBoneNode(n), set = (n, x, y, z) => { const o = N(n); if (o) o.rotation.set(x, y, z); };
        set('leftUpperArm', -.12, 0, -1.2); set('rightUpperArm', -.12, 0, 1.2); set('leftLowerArm', 0, -.3, 0); set('rightLowerArm', 0, .3, 0);
        const holo = () => { const m = new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
          m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', 'float fr = 1. - abs(dot(normalize(normal), normalize(vViewPosition))); gl_FragColor = vec4(vec3(.5, .95, 1.) * (pow(fr, 2.4) * 1.6 + .08) + vec3(.9, 1., 1.) * pow(fr, 8.) * .9, 1.);'); }; return m; };
        v.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = Array.isArray(o.material) ? o.material.map(holo) : holo(o.material); } });
        v.scene.scale.setScalar(.82); v.scene.position.set(0, -.9, .35); v.scene.rotation.y = .2; core.add(v.scene); v.update(0); coreDot.visible = false; core.userData.vrm = v;
      } catch (e) { console.warn('aoi', e); } })();
      { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(168,242,246,.9)'); gr.addColorStop(.3, 'rgba(168,242,246,.25)'); gr.addColorStop(1, 'rgba(168,242,246,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(1.1); core.add(sp); }
      const fl = new Float32Array(3 * 3 * 6), flow = points(fl, null, .07, .95); flow.material.color.setHex(0xd8fcff); flow.geometry.setAttribute('position', new THREE.BufferAttribute(fl, 3)); flow.frustumCulled = false; G.add(flow);
      const thread = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(18), 3)), new THREE.LineBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); G.add(thread);
      // Qualium の球（金）
      qs = bubble(2.05, 0xf2c56e, .55); G.add(qs);
      // スケールの軸：下ほど小さく（細胞・菌）、上ほど大きく（流域・気候）。桁ごとに輪が大きくなる
      scaleAx = new THREE.Group(); G.add(scaleAx);
      { const p = []; for (let y = -1.85; y <= 1.85; y += .02) p.push(0, y, 0); const ax = points(p, null, .018, .5); ax.material.color.setHex(0xdfe8ff); scaleAx.add(ax);
        for (let k = 0; k < 7; k++) { const y = -1.8 + k * .6, r = .025 * Math.pow(1.55, k); const rr = ring(r, 0xdfe8ff, .5 - k * .03, 64); rr.position.y = y; scaleAx.add(rr); } }
      scaleAx.position.set(-2.5, 0, 0);
      // タイムの輪：傾いた輪の上を、時の粒が流れる
      timeR = new THREE.Group(); G.add(timeR); timeR.rotation.set(1.18, 0, .32);
      for (let k = 0; k < 4; k++) { const rr = ring(1.55 + k * .14, 0xdfe8ff, .32 - k * .06, 200); timeR.add(rr); }
      const tn = 60, tp = new Float32Array(tn * 3); const tpts = points(tp, null, .06, .9); tpts.material.color.setHex(0xf6dca2); tpts.geometry.setAttribute('position', new THREE.BufferAttribute(tp, 3)); timeR.add(tpts);
      timeR.userData = { tp, tpts, tn };
      anchors.length = 0; anchors.push(core, { qs: 1 }, scaleAx, timeR, B[1]);
      fitW = 6.6; fitH = 5.0;
      const v = new THREE.Vector3();
      tick = (t, dt) => {
        G.rotation.y = Math.sin(t * .12) * .35;
        if (B[1].userData.bee && B[1].userData.bee.userData.animate) B[1].userData.bee.userData.animate(t, true);
        B.forEach((b, i) => { const a = t * .32 + i * 2.1; b.position.copy(home[i]).add(v.set(Math.cos(a) * .12, Math.sin(a * 1.3) * .08, Math.sin(a) * .1)); b.userData.b.material.uniforms.uT.value = t; });
        const pa = thread.geometry.attributes.position.array; B.forEach((b, i) => { pa[i * 6] = 0; pa[i * 6 + 1] = 0; pa[i * 6 + 2] = 0; pa[i * 6 + 3] = b.position.x; pa[i * 6 + 4] = b.position.y; pa[i * 6 + 5] = b.position.z; }); thread.geometry.attributes.position.needsUpdate = true;
        { const fa = flow.geometry.attributes.position.array; let k = 0; B.forEach((b, i) => { for (let j = 0; j < 6; j++) { const u = ((t * .35 + j / 6 + i * .13) % 1); fa[k++] = b.position.x * u; fa[k++] = .05 + (b.position.y - .05) * u; fa[k++] = b.position.z * u; } }); flow.geometry.attributes.position.needsUpdate = true; }
        if (core.userData.vrm) { core.userData.vrm.scene.rotation.y = .2 + Math.sin(t * .4) * .25; core.userData.vrm.update(1 / 60); } else core.scale.setScalar(1 + .08 * Math.sin(t * 1.6)); qs.material.uniforms.uT.value = t; qs.rotation.y = t * .05;
        const { tp, tn } = timeR.userData; for (let i = 0; i < tn; i++) { const a = i / tn * Math.PI * 2 + t * .25 * (1 + (i % 3) * .2), r = 1.55 + (i % 4) * .14; tp[i * 3] = Math.cos(a) * r; tp[i * 3 + 1] = 0; tp[i * 3 + 2] = Math.sin(a) * r; } timeR.userData.tpts.geometry.attributes.position.needsUpdate = true;
        scaleAx.children.forEach((c, k) => { if (k) c.rotation.y = t * .3; });
        upButyr(t);
      };
    } else {
      tick = t => { G.rotation.y = Math.sin(t * .1) * .12; B.forEach((b, i) => { b.position.y = home[i].y + Math.sin(t * .7 + i * 1.7) * .06; b.userData.b.material.uniforms.uT.value = t; }); if (B[1].userData.bee) { B[1].userData.bee.rotation.y = -2.3 + Math.sin(t * .5) * .3; if (B[1].userData.bee.userData.animate) B[1].userData.bee.userData.animate(t, true); } G.children.forEach(c => { if (c.userData.glow) c.userData.glow.material.opacity = .2 + .05 * Math.sin(t * .8 + c.position.x); }); upButyr(t); };
      fitW = tall ? 4.7 : 7.9; fitH = tall ? 5.5 : 2.9;
    }
    function upButyr(t) { for (let i = 0; i < nb; i++) { const [x, ph, z, s] = bs[i]; const y = ((ph + t * s) % 1); bp[i * 3] = x * (1 - y * .4) * hr * .8; bp[i * 3 + 1] = -hr * .85 + y * hr * 1.3; bp[i * 3 + 2] = z * hr * .6; } butyr.geometry.attributes.position.needsUpdate = true; butyr.material.opacity = .75; }
    cam.position.set(0, two ? .5 : .35, 6);
  }

  // 大きさ合わせ：fitW×fitH が必ず入る距離
  const v3 = new THREE.Vector3();
  function size() { const w = fig.clientWidth || 300, h = fig.clientHeight || 300; R.setSize(w, h, false); cam.aspect = w / h; const th = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); const d = Math.max(fitH / 2 / th, fitW / 2 / th / cam.aspect) * 1.04; cam.position.setLength(d); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); }
  size(); new ResizeObserver(size).observe(fig);
  function place() { if (!labs.length) return; const w = fig.clientWidth, h = fig.clientHeight;
    labs.forEach((el, i) => { const o = anchors[+el.dataset.at]; if (!o) return; let y = 0;
      if (o.qs) v3.set(0, 2.05, 0); else if (o.userData && o.userData.b) v3.set(0, o.userData.b.geometry.parameters.radius + .08, 0); else if (o === anchors[2] && kind === 2) v3.set(0, 2.0, 0); else if (o === anchors[3] && kind === 2) v3.set(1.75, 0, 0); else v3.set(-1.15, -1.55, .6);
      v3.applyMatrix4(o.matrixWorld || new THREE.Matrix4()); v3.project(cam);
      let x = (v3.x * .5 + .5) * w, yy = (-v3.y * .5 + .5) * h; x = Math.max(56, Math.min(w - 56, x)); yy = Math.max(30, Math.min(h - 4, yy)); el.style.transform = `translate(${x}px,${yy}px) translate(-50%,${el.dataset.below ? '0' : '-100%'})`; }); }
  let vis = true, t0 = performance.now(), last = t0, raf = 0;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf && !reduce) raf = requestAnimationFrame(loop); }).observe(fig);
  function frame(now) { const t = (now - t0) / 1000; tick(t, (now - last) / 1000); last = now; S.updateMatrixWorld(); place(); R.render(S, cam); }
  function loop(now) { raf = 0; if (!vis || document.hidden) return; frame(now); raf = requestAnimationFrame(loop); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !raf && !reduce) raf = requestAnimationFrame(loop); });
  frame(performance.now() + 4000); fig.classList.add('on');
  if (!reduce) raf = requestAnimationFrame(loop);
}
