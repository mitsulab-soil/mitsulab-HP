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
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mob ? 1.25 : 1.5)); R.setClearColor(0x15243c, 1);
  R.outputColorSpace = T.SRGBColorSpace; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 0.95;
  const S = new T.Scene(), FOG = new T.Color(0x15243c); S.fog = new T.FogExp2(FOG.getHex(), 0.003);
  const C = new T.PerspectiveCamera(mob ? 66 : 52, 1, 0.1, 1400);
  const hemi = new T.HemisphereLight(0x9fc8ff, 0x2a2214, 1.7); S.add(hemi);
  const sun = new T.DirectionalLight(0xffe6c4, 2.3); sun.position.set(-40, 60, 30); S.add(sun);
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
  /* 点の樹冠は写実の樹と二重に見えるので出さない */
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
  const toriiM = new T.LineBasicMaterial({ color: 0xff6b4a, transparent: true, opacity: 0.95, fog: true }); S.add(new T.LineSegments(og, toriiM));

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
    { const me = new T.Mesh(g, mat); me.renderOrder = mat === pave ? 1 : -2; S.add(me); }
  }
  const pave = new T.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.9, metalness: 0, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false });
  const leaf = new T.MeshStandardMaterial({ color: 0xd2c6b0, roughness: 1, metalness: 0, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false });
  // 継ぎ目のくり返しを崩す：同じ質感を 2 つの大きさ・向きで読み、場所ごとの揺らぎで混ぜる（描く数は増えない）
  const UT = { value: 0 }, UDAP = { value: 0.7 };
  const antiTile = m => { m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
      vec2 uA = vMapUv; vec2 uB = mat2(0.8, -0.6, 0.6, 0.8) * vMapUv * 0.37 + vec2(0.31, 0.77);
      float nz = fract(sin(dot(floor(vMapUv * 0.25), vec2(12.99, 78.23))) * 43758.5);
      float nz2 = fract(sin(dot(floor(vMapUv * 0.09 + 3.1), vec2(39.3, 11.7))) * 24634.6);
      vec4 tA = texture2D(map, uA), tB = texture2D(map, uB);
      vec4 tc = mix(tA, tB, 0.28 + 0.34 * nz);
      tc.rgb *= 0.82 + 0.3 * nz2;
      diffuseColor *= tc;
      vec2 wq = vMapUv * 0.55 + vec2(uT * 0.05, uT * 0.03);
      float dp = sin(wq.x * 2.3 + sin(wq.y * 1.7)) * sin(wq.y * 2.9 + sin(wq.x * 1.3 + uT * 0.2));
      diffuseColor.rgb *= 0.72 + 0.8 * uDap * smoothstep(0.25, 0.85, dp) * vec3(1.0, 0.9, 0.7);
    #endif`); sh.uniforms.uT = UT; sh.uniforms.uDap = UDAP; sh.fragmentShader = 'uniform float uT; uniform float uDap;\n' + sh.fragmentShader; }; m.customProgramCacheKey = () => 'antiTile'; };
  antiTile(pave); antiTile(leaf);
  strip(-6, 6, pave, 0.02); strip(6, 26, leaf, 0); strip(-26, -6, leaf, 0);
  const soilG = new T.MeshStandardMaterial({ color: 0x6e5a44, roughness: 1, metalness: 0, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }); antiTile(soilG);
  if (!mob) { strip(26, 70, soilG, -0.05); strip(-70, -26, soilG, -0.05); }
  let texLoaded = false, dirtyTex = false;
  const loadTex = () => { if (texLoaded) return; texLoaded = true;
    pave.map = tex('img/hero/3d/ql_paving_c.webp', true); pave.normalMap = tex('img/hero/3d/ql_paving_n.webp'); pave.roughnessMap = tex('img/hero/3d/dio/paving_r.webp');
    leaf.map = tex('img/hero/3d/dio/lsgravel_c_' + (mob ? 512 : 1024) + '.webp', true); leaf.normalMap = tex('img/hero/3d/dio/lsgravel_n_512.webp');
    soilG.map = tex('img/hero/3d/dio/soil_c.webp', true); soilG.normalMap = tex('img/hero/3d/dio/soil_n.webp');
    pave.needsUpdate = leaf.needsUpdate = soilG.needsUpdate = true; };

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

  // 5b) 土の中を満たす模式：菌糸の網・ミミズ・トビムシ・しみ込む水（u で 0.56〜0.68 の区間の地下）
  const soilV = [], wormV = [], bugP = [], dropP = [], A0 = new T.Vector3(), D0 = new T.Vector3();
  for (let k = 0; k < (mob ? 420 : 820); k++) { const u = uEnd * (0.55 + rnd() * 0.14); curve.getPointAt(u, A0); curve.getTangentAt(u, D0);
    const sx = (rnd() - 0.5) * 16, x = A0.x - D0.z * sx, z = A0.z + D0.x * sx, y = A0.y - 0.4 - rnd() * 4;
    for (let j = 0; j < 3; j++) { const a = rnd() * 6.283, l = 0.4 + rnd() * 1.4; soilV.push(x, y, z, x + Math.cos(a) * l, y + (rnd() - 0.5) * 0.6, z + Math.sin(a) * l); }
    if (k % 3 === 0) bugP.push(x + rnd(), y + rnd() * 0.5, z + rnd());
    if (k % 2 === 0) dropP.push(x, A0.y - rnd() * 4.4, z, rnd());
    if (k % 26 === 0) { let px = x, py = y, pz = z, a = rnd() * 6.283; for (let j = 0; j < 14; j++) { a += (rnd() - 0.5) * 0.9; const nx = px + Math.cos(a) * 0.12, ny = py + (rnd() - 0.5) * 0.04, nz = pz + Math.sin(a) * 0.12; wormV.push(px, py, pz, nx, ny, nz); px = nx; py = ny; pz = nz; } } }
  const mkL = (v, c, op) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); const m = new T.LineBasicMaterial({ color: c, transparent: true, opacity: 0, fog: true, depthWrite: false, blending: T.AdditiveBlending }); S.add(new T.LineSegments(g, m)); return [m, op]; };
  const mkP = (v, c, sz, op) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); const m = new T.PointsMaterial({ map: dot, color: c, size: sz, sizeAttenuation: true, transparent: true, opacity: 0, fog: true, depthWrite: false, blending: T.AdditiveBlending }); const p = new T.Points(g, m); S.add(p); return [m, op, p]; };
  const soilMats = [mkL(soilV, 0xf4ecd8, 0.55), mkL(wormV, 0xd88a7a, 0.95), mkP(bugP, 0xfff4e0, 0.14, 1)];
  const dropArr = new Float32Array(dropP.length / 4 * 3), dropS = dropP.filter((_, i) => i % 4 === 3); for (let i = 0; i < dropS.length; i++) { dropArr[i * 3] = dropP[i * 4]; dropArr[i * 3 + 1] = dropP[i * 4 + 1]; dropArr[i * 3 + 2] = dropP[i * 4 + 2]; }
  const dropG = new T.BufferGeometry(); dropG.setAttribute('position', new T.BufferAttribute(dropArr, 3));
  const dropM = new T.PointsMaterial({ map: dot, color: 0x7fc8ff, size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0, fog: true, depthWrite: false, blending: T.AdditiveBlending }); { const dp = new T.Points(dropG, dropM); dp.frustumCulled = false; S.add(dp); }
  const dropY0 = dropP.filter((_, i) => i % 4 === 1);

  // 5c) コウモリが追う小さな虫（模式）：こだまの輪が届くと光る
  const NB = mob ? 28 : 48, bugO = [...Array(NB)].map(() => [(rnd() - 0.5) * 14, 1.5 + rnd() * 5, 4 + rnd() * 22, rnd() * 6.283]);
  const bugArr = new Float32Array(NB * 3), bugCol = new Float32Array(NB * 3), bugG = new T.BufferGeometry();
  bugG.setAttribute('position', new T.BufferAttribute(bugArr, 3)); bugG.setAttribute('color', new T.BufferAttribute(bugCol, 3));
  const bugM = new T.PointsMaterial({ map: dot, vertexColors: true, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0, fog: true, depthWrite: false, blending: T.AdditiveBlending }); { const bp = new T.Points(bugG, bugM); bp.frustumCulled = false; S.add(bp); }

  // 4b) 欅（Qualium 大宮の参道の欅の型）：写実の樹を参道の並木の位置に。目の高さに降りる前に読む
  const treeMeshes = []; let mossM = null, treeSel = []; const stk = sec.querySelector('.sd-stick'), base0 = mob ? 0.42 : 0.4;
  const loadTrees = async () => { try {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
    const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
    const tg = await gl.loadAsync('img/hero/3d/sando_keyaki.glb');
    tg.scene.updateMatrixWorld(true); const parts = []; tg.scene.traverse(m => { if (m.isMesh) { if (m.material) { m.material.side = T.DoubleSide; if (/leaves/.test(m.name)) { m.material.alphaTest = 0.45; m.material.transparent = false; m.material.onBeforeCompile = sh => { sh.uniforms.uT = UT; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed.x += sin(uT * 1.3 + position.y * 4.0 + position.z * 3.0) * 0.025 * (position.y + 1.0);\n  transformed.z += cos(uT * 1.1 + position.x * 3.5) * 0.02 * (position.y + 1.0);'); }; m.material.customProgramCacheKey = () => 'keyakiSway'; } if (m.material.map) m.material.map.anisotropy = 4; } parts.push(m); } });
    const bb = new T.Box3().setFromObject(tg.scene), sz = bb.getSize(new T.Vector3());
    const dC = (x, z) => { let m = 1e9; for (const c of CP) { const d = Math.hypot(c[0] - o[0] - x, c[2] - o[2] - z); if (d < m) m = d; } return m; };
    const pick = near.filter(([x, , z]) => { const d = dC(x, z); return d > 9.5 && d < 32; }), lim = mob ? 90 : 170, stp = Math.max(1, pick.length / lim), sel = [];
    for (let i = 0; i < pick.length && sel.length < lim; i += stp) sel.push(pick[Math.floor(i)]);
    const M4 = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SCv = new T.Vector3(); treeSel = sel;
    parts.forEach(m => { const im = new T.InstancedMesh(m.geometry, m.material, sel.length); sel.forEach(([x, y, z], i) => { const h = 14 + (Math.sin(x * 12.9 + z * 3.1) * 0.5 + 0.5) * 6, sc = h / sz.y; Q.setFromAxisAngle(V.set(0, 1, 0), (x * 7.3 + z) % 6.283); SCv.set(sc, sc, sc);
      M4.compose(V.set(x, y - bb.min.y * sc - 0.2, z), Q, SCv).multiply(m.matrixWorld); im.setMatrixAt(i, M4); }); im.frustumCulled = false; im.visible = false; S.add(im); treeMeshes.push(im); });

    // 並木を密に：道の両脇 8〜16 m に 6〜8 m ごと。幹の太さ・高さ・葉の色にばらつき（欅の形を共有し、色で樹の違いを模式に）
    { const extra = [], step = mob ? 40 : 13; const PA = new T.Vector3(), PD = new T.Vector3();
      for (let u = 0.02; u < uEnd; u += step / LEN) { curve.getPointAt(u, PA); curve.getTangentAt(u, PD);
        for (const sd of [-1, 1]) { const off = sd * (8.5 + rnd() * 7.5), x = PA.x - PD.z * off + (rnd() - 0.5) * 2, z = PA.z + PD.x * off + (rnd() - 0.5) * 2;
          if (dC(x, z) > 8.3) extra.push([x, PA.y, z]); } }
      const TC = [0x9db58a, 0x8fae7a, 0xa9bf8e, 0x7f9f70, 0xb3c49a]; const col = new T.Color();
      parts.forEach(m => { const leafP = /leaves/.test(m.name); const im = new T.InstancedMesh(m.geometry, m.material, extra.length); extra.forEach(([x, y, z], i) => { const h = 10 + rnd() * 10, sc = h / sz.y, th = 0.75 + rnd() * 0.6; Q.setFromAxisAngle(V.set(0, 1, 0), rnd() * 6.283); SCv.set(sc * th, sc, sc * th);
          M4.compose(V.set(x, y - bb.min.y * sc - 0.2, z), Q, SCv).multiply(m.matrixWorld); im.setMatrixAt(i, M4); if (leafP) { im.setColorAt(i, col.setHex(TC[i % TC.length])); } }); im.frustumCulled = false; im.visible = false; S.add(im); treeMeshes.push(im); });
      // 下草：葉の塊を低く小さく（同じ素材）
      const lp = parts.find(m => /leaves/.test(m.name));
      if (lp) { const nb = mob ? 0 : 80, im = new T.InstancedMesh(lp.geometry, lp.material, nb); for (let i = 0; i < nb; i++) { const u = rnd() * uEnd; curve.getPointAt(u, PA); curve.getTangentAt(u, PD); const sd = rnd() < 0.5 ? -1 : 1, off = sd * (6.8 + rnd() * 12), x = PA.x - PD.z * off, z = PA.z + PD.x * off, s0 = (0.9 + rnd() * 1.1) / sz.y * 1.0;
          Q.setFromAxisAngle(V.set(0, 1, 0), rnd() * 6.283); SCv.set(s0 * 1.6, s0, s0 * 1.6); M4.compose(V.set(x, PA.y - 0.15, z), Q, SCv).multiply(lp.matrixWorld); im.setMatrixAt(i, M4); im.setColorAt(i, col.setHex(i % 2 ? 0x6f8f5c : 0x86a06a)); }
        im.frustumCulled = false; im.visible = false; S.add(im); treeMeshes.push(im); }
      treeSel = sel;
      parts.forEach(m => { const im = new T.InstancedMesh(m.geometry, m.material, shrTrees.length); shrTrees.forEach(([x, y, z], i) => { const h = 16 + rnd() * 10, sc = h / sz.y, th = 0.8 + rnd() * 0.7; Q.setFromAxisAngle(V.set(0, 1, 0), rnd() * 6.283); SCv.set(sc * th, sc, sc * th); M4.compose(V.set(x, y - bb.min.y * sc - 0.2, z), Q, SCv).multiply(m.matrixWorld); im.setMatrixAt(i, M4); }); im.frustumCulled = false; im.visible = false; S.add(im); treeMeshes.push(im); });
      netAddTrees(sel.concat(extra.filter((_, i) => i % 3 === 0))); }

    // 欅の根元の苔（縁だけ。石畳には置かない＝並木の位置は道の中心から 9.5 m 以上）
    { const mc = document.createElement('canvas'); mc.width = mc.height = 64; const g2 = mc.getContext('2d'), gr = g2.createRadialGradient(32, 32, 6, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#bbb'); gr.addColorStop(1, '#000'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      const mm = new T.MeshStandardMaterial({ map: tex('img/hero/3d/dio/moss_c_' + (mob ? 512 : 1024) + '.webp', true), normalMap: tex('img/hero/3d/dio/moss_n_512.webp'), alphaMap: new T.CanvasTexture(mc), transparent: true, depthWrite: false, roughness: 1, metalness: 0, color: 0x6f7a5c, polygonOffset: true, polygonOffsetFactor: -2 });
      const mg = new T.CircleGeometry(1, 24); mg.rotateX(-Math.PI / 2); const im = new T.InstancedMesh(mg, mm, sel.length);
      sel.forEach(([x, y, z], i) => { const r0 = Math.min(1.8 + (Math.sin(x * 3.7 + z) * 0.5 + 0.5) * 0.6, dC(x, z) - 8.2), r = r0 < 0.9 ? 0.001 : r0; M4.compose(V.set(x, y + 0.03, z), Q.identity(), SCv.set(r, 1, r)); im.setMatrixAt(i, M4); });
      im.frustumCulled = false; im.renderOrder = -1; im.visible = false; S.add(im); treeMeshes.push(im); mossM = mm; }
    if (R.compileAsync) await R.compileAsync(S, C);
    treeMeshes.forEach(m => m.visible = true); kick(); (window.requestIdleCallback || (f => setTimeout(f, 400)))(() => loadVeg(), { timeout: 2500 });
  } catch (e) { console.warn('sando trees', String(e && e.message || e)); } };


  // 植生（Poly Haven CC0 の縮めた写し）。種名は出さない。道の両脇・石畳の外だけに置く
  const loadVeg = async () => { try { R.domElement.addEventListener('webglcontextlost', () => console.warn('sando ctx lost'));
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
    const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
    const PA = new T.Vector3(), PD = new T.Vector3(), M4 = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SCv = new T.Vector3(), IV = new T.Matrix4();
    const dP = (x, z) => { let m = 1e9; for (const c of CP) { const d = Math.hypot(c[0] - o[0] - x, c[2] - o[2] - z); if (d < m) m = d; } return m; };
    // 置き場所：道の中心から dMin〜dMax m
    const spots = (n, dMin, dMax) => { const r = []; let g = 0; while (r.length < n && g++ < n * 8) { const u = 0.015 + rnd() * (uEnd - 0.02); curve.getPointAt(u, PA); curve.getTangentAt(u, PD); const off = (rnd() < 0.5 ? -1 : 1) * (dMin + rnd() * (dMax - dMin)), x = PA.x - PD.z * off, z = PA.z + PD.x * off; if (dP(x, z) > dMin - 0.5) r.push([x, PA.y, z]); } return r; };
    // 一つの glb の中の変種（子の節）ごとに InstancedMesh を作る
    const plant = async (url, list, hMin, hMax, opt = {}) => {
      const g = await gl.loadAsync(url); g.scene.updateMatrixWorld(true);
      const vars = g.scene.children.filter(c => { let has = false; c.traverse(m => { if (m.isMesh) has = true; }); return has; });
      if (!vars.length) return;
      vars.forEach((vn, vi) => {
        const pts = list.filter((_, i) => i % vars.length === vi); if (!pts.length) return;
        IV.copy(vn.matrixWorld).invert(); const ms = []; const bb = new T.Box3(), tb = new T.Box3();
        vn.traverse(m => { if (!m.isMesh) return; const rel = new T.Matrix4().multiplyMatrices(IV, m.matrixWorld); m.geometry.computeBoundingBox(); tb.copy(m.geometry.boundingBox).applyMatrix4(rel); bb.union(tb); ms.push([m, rel]); });
        const sz = bb.getSize(new T.Vector3()), ctr = bb.getCenter(new T.Vector3()), toC = new T.Matrix4().makeTranslation(-ctr.x, -bb.min.y, -ctr.z);
        ms.forEach(([m, rel]) => { if (m.material) { m.material.side = T.DoubleSide; if (m.material.map) { m.material.alphaTest = 0.4; m.material.transparent = false; } }
          const im = new T.InstancedMesh(m.geometry, m.material, pts.length);
          pts.forEach(([x, y, z], i) => { const h = hMin + rnd() * (hMax - hMin), sc = h / Math.max(0.01, sz.y); Q.setFromAxisAngle(V.set(0, 1, 0), rnd() * 6.283); SCv.set(sc, sc, sc);
            M4.compose(V.set(x, y - 0.05, z), Q, SCv).multiply(toC).multiply(rel); im.setMatrixAt(i, M4); });
          im.frustumCulled = false; im.renderOrder = opt.ro || 0; S.add(im); treeMeshes.push(im); });
      }); kick(); };
    const nP = mob ? 4 : 14, nB = mob ? 8 : 26, nS = mob ? 18 : 70, nF = mob ? 22 : 80, nG = mob ? 30 : 110, nR = mob ? 4 : 12;
    await plant('img/hero/3d/veg/broad_lo.glb', spots(nB, 7.5, 15), 7, 12);
    await plant('img/hero/3d/veg/pine_lo.glb', spots(nP, 9, 18), 12, 18);
    await plant('img/hero/3d/veg/shrub_02.glb', spots(nS, 6.8, 12), 1.2, 2.4);
    await plant('img/hero/3d/veg/fern_02.glb', spots(nF, 6.5, 10), 0.5, 0.9);
    await plant('img/hero/3d/veg/grass_medium_02.glb', spots(nG, 6.3, 12), 0.3, 0.6);
    await plant('img/hero/3d/veg/root_cluster_01.glb', (treeSel || []).filter((_, i) => i % 3 === 0).slice(0, nR), 0.5, 0.9);
  } catch (e) { console.warn('sando veg', String(e && e.message || e)); } };

  // 6) こだま・年輪の輪
  const ringG = (() => { const g = new T.BufferGeometry(), P = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.283; P.push(Math.cos(a), 0, Math.sin(a)); } g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); return g; })();
  const rings = [...Array(10)].map(() => { const l = new T.Line(ringG, new T.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, fog: true, depthWrite: false, blending: T.AdditiveBlending })); S.add(l); return l; });

  // 7) 式の層：U = g( P( E, B ), K ) と作品・領域（名前だけ。押して開くのは下の 02 の図）
  const LAY = [['E', 'ENVIRONMENT', '#7fe0b4', ['Qualium Omiya', 'Qualium Kawagoe', 'Qualium Shibuya', 'GIS', 'IoT']],
    ['B', 'BODY', '#78d6ec', ['Qualia/sight', 'Qualia/swarm', 'Qualia/sight', 'Qualia/sight', 'AI']],
    ['P', 'PERCEPTION', '#a8f2f6', ['Qualia/sound', 'Qualia/touch', 'Qualia/gaze', 'Qualia/oto']],
    ['K', 'CONTEXT', '#b4a2ff', ['Qualia/scale', 'Qualia/scale', 'Qualia/scale', 'Qualia/rakugo']],
    ['g', 'MEANING', '#f2c58a', ['Qualia/yose', 'Qualia/song', 'Qualia/museum', 'ART']]];
  const label = (txt, color, px, h) => { const c = document.createElement('canvas'), g = c.getContext('2d'), F = px + 'px "JetBrains Mono",ui-monospace,Menlo,monospace'; g.font = F; const w = Math.ceil(g.measureText(txt).width) + 16; c.width = w; c.height = px + 16; g.font = F; g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(txt, 8, c.height / 2);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })); s.scale.set(h * w / c.height, h, 1); return s; };
  const FX = new T.Group(); S.add(FX); const fxMats = [];
  const uF = uEnd * 0.858, PF = curve.getPointAt(uF), DF = curve.getTangentAt(uF);
  FX.position.copy(PF); FX.rotation.y = Math.atan2(DF.x, DF.z); if (mob) FX.scale.setScalar(0.62);
  LAY.forEach(([sym, nm, c, apps], i) => {
    const y = 4 + i * 4.2, cl = new T.Color(c);
    const pl = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshBasicMaterial({ color: cl, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    pl.rotation.x = -Math.PI / 2; pl.position.y = y; FX.add(pl); fxMats.push([pl.material, 0.06]);
    const edge = new T.LineSegments(new T.EdgesGeometry(pl.geometry), new T.LineBasicMaterial({ color: cl, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    edge.rotation.x = -Math.PI / 2; edge.position.y = y; FX.add(edge); fxMats.push([edge.material, 0.8]);
    const s = label(sym + '  ' + nm, c, 40, 1.5); s.position.set(-14.5, y + 0.9, 15); s.center.set(0, 0.5); FX.add(s); fxMats.push([s.material, 1]);
    if (!mob) apps.forEach((a, j) => { const t = label(a, c, 30, 0.9), ang = j / apps.length * 6.283 + i, rr = 6 + (j % 3) * 3; t.position.set(Math.cos(ang) * rr, y + 0.6, Math.sin(ang) * rr); FX.add(t); fxMats.push([t.material, 0.9]); });
  });
  const ULab = label('U = g( P( E, B ), K )', '#eef5fb', 56, 2.4); ULab.position.set(0, 4 + 5 * 4.2 + 1.5, 0); FX.add(ULab); fxMats.push([ULab.material, 1]);

  // 7b) 最初の画面（本人の手本＝d4・d5「線形のグラフィックで、情報が積層するイメージ」）：受けとり方ごとの層が線で積み上がる
  const TOPL = new T.Group(); S.add(TOPL); const topMats = [];
  { const P0 = curve.getPointAt(uEnd * 0.065), D0 = curve.getTangentAt(uEnd * 0.065); const sh_ = mob ? 15 : 58; TOPL.position.set(P0.x - D0.z * sh_, P0.y + (mob ? (innerWidth < 360 ? -146 : -122) : -34), P0.z + D0.x * sh_); TOPL.rotation.y = Math.atan2(D0.x, D0.z);
    const LAYS = [['TERRAIN', 0x7fe0b4], ['ULTRAVIOLET', 0xb48cff], ['ECHO', 0x9fd8ff], ['SOIL', 0xe0a864], ['TIME', 0xf2c58a]];
    const SZ = 64, N = 8;
    LAYS.forEach(([nm, c], i) => {
      const y = 16 + i * 11, L = [];
      const GL = []; for (let q = 1; q < N; q++) { const t = -SZ / 2 + q * SZ / N; GL.push(-SZ / 2, y, t, SZ / 2, y, t, t, y, -SZ / 2, t, y, SZ / 2); }
      const AO = [0x5fc9c0, 0x78d6ec, 0x8fe4ee, 0xa8f2f6, 0xd4fbfc][i], hz = 1 - i * 0.12;
      { const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(GL, 3)); const gm = new T.LineBasicMaterial({ color: AO, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }); TOPL.add(new T.LineSegments(gg, gm)); topMats.push([gm, 0.16 * hz]);
        const h2 = SZ / 2, FR = [-h2, y, -h2, h2, y, -h2, h2, y, -h2, h2, y, h2, h2, y, h2, -h2, y, h2, -h2, y, h2, -h2, y, -h2];
        [[0, 0.85], [0.18, 0.35], [0.4, 0.14]].forEach(([d, a]) => { const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(FR.map((v, k) => k % 3 === 1 ? v + d : v), 3)); const fm = new T.LineBasicMaterial({ color: AO, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }); TOPL.add(new T.LineSegments(fg, fm)); topMats.push([fm, a * hz]); }); }
      // 層ごとの模式：地形＝等高線、紫外＝点、こだま＝同心円、土＝根の線、時間＝目盛り
      if (i === 0) for (let r = 4; r < 30; r += 4) for (let k = 0; k < 48; k++) { const a = k / 48 * 6.283, b = (k + 1) / 48 * 6.283, w = 1 + Math.sin(k * 0.7 + r) * 0.08; L.push(Math.cos(a) * r * w, y, Math.sin(a) * r * w * 0.8, Math.cos(b) * r * w, y, Math.sin(b) * r * w * 0.8); }
      if (i === 2) for (let r = 3; r < 30; r += 3.5) for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283, b = (k + 1) / 40 * 6.283; L.push(Math.cos(a) * r - 8, y, Math.sin(a) * r, Math.cos(b) * r - 8, y, Math.sin(b) * r); }
      if (i === 3) { const br = (x, z, a, l, d) => { if (d > 4) return; const ex = x + Math.cos(a) * l, ez = z + Math.sin(a) * l; L.push(x, y, z, ex, y, ez); br(ex, ez, a - 0.5, l * 0.7, d + 1); br(ex, ez, a + 0.45, l * 0.7, d + 1); }; for (let k = 0; k < 5; k++) br((k - 2) * 10, -20, 1.57 + (k - 2) * 0.15, 9, 0); }
      if (i === 4) for (let k = -30; k <= 30; k += 2) L.push(k, y, SZ / 2 - 1, k, y, SZ / 2 - (k % 10 === 0 ? 6 : 3));
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(L, 3));
      const m = new T.LineBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false });
      TOPL.add(new T.LineSegments(g, m)); topMats.push([m, (i === 0 ? 0.6 : 0.5) * hz]);
      const pl = new T.Mesh(new T.PlaneGeometry(SZ, SZ), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
      pl.rotation.x = -Math.PI / 2; pl.position.y = y; TOPL.add(pl); topMats.push([pl.material, 0.035 * hz]);
      if (i === 1) { const pts = []; for (let k = 0; k < (mob ? 160 : 320); k++) pts.push((rnd() - 0.5) * SZ, y + rnd() * 0.6, (rnd() - 0.5) * SZ); const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); const pm = new T.PointsMaterial({ map: dot, color: c, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }); TOPL.add(new T.Points(pg, pm)); topMats.push([pm, 0.9]); }
      const lb = label(nm, '#' + new T.Color(c).lerp(new T.Color(0xffffff), 0.86).getHexString(), mob ? 56 : 52, mob ? 7 : 5.4); if (mob) { lb.position.set(SZ / 2 + (innerWidth < 360 ? 10 : 5), y + 0.4, SZ / 2 + (innerWidth < 360 ? 10 : 5)); lb.center.set(1, 0.5); } else { lb.position.set(SZ / 2 + 6, y, SZ / 2 + 6); lb.center.set(1, 0.5); } if (0) { const o = mob ? (innerWidth < 360 ? 10 : 5) : 6, q = o - 1; const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute([SZ / 2 + q, mob ? y + 0.4 : y, SZ / 2 + q, SZ / 2, y, SZ / 2], 3)); const lm = new T.LineBasicMaterial({ color: 0xdff6f8, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }); TOPL.add(new T.LineSegments(lg, lm)); topMats.push([lm, 0.7]); }
    });
    // 層をつなぐ縦の細い線
    const V = []; for (const [x, z] of [[-32, -32], [32, -32], [-32, 32], [32, 32]]) V.push(x, 16, z, x, 16 + 44, z);
    const vg = new T.BufferGeometry(); vg.setAttribute('position', new T.Float32BufferAttribute(V, 3));
    const vm = new T.LineBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: 0, depthWrite: false, fog: false }); TOPL.add(new T.LineSegments(vg, vm)); topMats.push([vm, 0.32]);
  }
  let px = 0, py = 0;
  addEventListener('pointermove', e => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; kick(); }, { passive: true });
  addEventListener('deviceorientation', e => { if (e.gamma == null) return; px = Math.max(-0.5, Math.min(0.5, e.gamma / 60)); py = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 90)); kick(); }, { passive: true });

  // 場面（スクロールの量 p で決まる）


  const skyM = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, transparent: true, fog: false, uniforms: { uO: { value: 0 }, uSun: { value: new T.Vector3(-0.55, 0.42, -0.72).normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uO; uniform vec3 uSun; varying vec3 vD; void main(){ float h = clamp(vD.y, -0.1, 1.0); vec3 c = mix(vec3(0.86,0.80,0.70), vec3(0.36,0.52,0.70), smoothstep(0.0, 0.55, h)); float s = max(0.0, dot(vD, uSun)); c += vec3(1.0,0.82,0.55) * (pow(s, 48.0) * 1.4 + pow(s, 6.0) * 0.22); gl_FragColor = vec4(c, uO); }' });
  const skyD = new T.Mesh(new T.SphereGeometry(900, 32, 16), skyM); skyD.frustumCulled = false; skyD.renderOrder = -5; S.add(skyD);

  // ── 氷川神社の境内（公開されている配置にもとづく模式）：参道の先に 神池と朱の神橋 → 楼門 → 拝殿
  const PE = new T.Vector3(), DE = new T.Vector3(); curve.getPointAt(uEnd, PE); curve.getTangentAt(uEnd, DE); DE.y = 0; DE.normalize();
  const SIDE = new T.Vector3(-DE.z, 0, DE.x), ang = Math.atan2(DE.x, DE.z);
  const at = (f, s, y = 0) => new T.Vector3(PE.x + DE.x * f + SIDE.x * s, PE.y + y, PE.z + DE.z * f + SIDE.z * s);
  const SHR = new T.Group(); S.add(SHR);
  const shuM = new T.MeshStandardMaterial({ color: 0x9c4a3a, roughness: 0.6, metalness: 0, transparent: true, opacity: 0 });
  const roofM = new T.MeshStandardMaterial({ color: 0x3c4a44, roughness: 0.55, metalness: 0.25, transparent: true, opacity: 0 });
  const wallM = new T.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.9, metalness: 0, transparent: true, opacity: 0 });
  const waterM = new T.MeshStandardMaterial({ color: 0x3c5560, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0 });
  const gravM = new T.MeshStandardMaterial({ color: 0xbdb6a6, roughness: 1, metalness: 0, transparent: true, opacity: 0 });
  const shrMats = [[shuM, 1], [roofM, 1], [wallM, 1], [waterM, 0.92], [gravM, 1]];
  const box = (w, h, d, m, p, yaw = ang) => { const me = new T.Mesh(new T.BoxGeometry(w, h, d), m); me.position.copy(p); me.rotation.y = yaw; SHR.add(me); return me; };

  const stoneM = new T.MeshStandardMaterial({ color: 0x8e8a80, roughness: 0.95, metalness: 0, transparent: true, opacity: 0 }); shrMats.push([stoneM, 1]);
  const goldM = new T.MeshStandardMaterial({ color: 0xc9a75a, roughness: 0.45, metalness: 0.6, transparent: true, opacity: 0 }); shrMats.push([goldM, 1]);
  // 寄棟の屋根（四方へ流れる面）＋軒の薄い板
  const roof = (w, d, h, p, m = roofM) => { const g = new T.CylinderGeometry(0.16, 0.7071, h, 4, 1); g.rotateY(Math.PI / 4); g.scale(w, 1, d); const me = new T.Mesh(g, m); me.position.copy(p); me.rotation.y = ang; SHR.add(me);
    box(w * 1.02, 0.12, d * 1.02, m, p.clone().setY(p.y - h / 2)); return me; };
  // 石灯籠（基礎・竿・中台・火袋・笠・宝珠）
  const lantern = (f, s) => { const b = at(f, s, 0); const y0 = b.y;
    box(0.9, 0.3, 0.9, stoneM, b.clone().setY(y0 + 0.15)); const c = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 1.3, 10), stoneM); c.position.copy(b).setY(y0 + 0.95); SHR.add(c);
    box(0.75, 0.22, 0.75, stoneM, b.clone().setY(y0 + 1.7)); box(0.5, 0.5, 0.5, stoneM, b.clone().setY(y0 + 2.05));
    roof(1.05, 1.05, 0.32, b.clone().setY(y0 + 2.48), stoneM); const q = new T.Mesh(new T.SphereGeometry(0.11, 10, 8), stoneM); q.position.copy(b).setY(y0 + 2.72); SHR.add(q); };
  // 境内の地面（玉砂利）
  { const g = new T.PlaneGeometry(90, 150); g.rotateX(-Math.PI / 2); const me = new T.Mesh(g, gravM); me.position.copy(at(80, 0, -0.02)); me.rotation.y = ang; SHR.add(me); }
  // 神池（左右に）と朱の神橋
  for (const s of [-1, 1]) { const g = new T.PlaneGeometry(26, 18); g.rotateX(-Math.PI / 2); const me = new T.Mesh(g, waterM); me.position.copy(at(16, s * 17, 0.02)); me.rotation.y = ang; SHR.add(me); }
  { const br = new T.Group(); for (const s of [-1, 1]) { for (let k = 0; k <= 10; k++) { const f = k / 10, y = 0.5 + Math.sin(f * Math.PI) * 1.1; const p = at(10 + f * 12, s * 2.6, y); box(0.18, 0.9, 0.18, shuM, p); } box(0.14, 0.14, 12.4, shuM, at(16, s * 2.6, 1.95)); }
    for (let k = 0; k <= 24; k++) { const f = k / 24; box(5.4, 0.16, 0.56, shuM, at(10 + f * 12, 0, 0.35 + Math.sin(f * Math.PI) * 1.1)); } }
  // 楼門（朱の二層の門：柱・貫・屋根）
  { const f0 = 42; for (const s of [-3.6, -1.2, 1.2, 3.6]) for (const d of [-2, 2]) box(0.5, 7.2, 0.5, shuM, at(f0 + d, s, 3.6));
    box(9.4, 0.45, 5, shuM, at(f0, 0, 4.3)); box(9.6, 0.25, 5.2, shuM, at(f0, 0, 6.9)); roof(12, 7.2, 1.0, at(f0, 0, 7.75)); box(8.6, 2.0, 4.4, shuM, at(f0, 0, 9.2));
    for (const s of [-3.4, -1.15, 1.15, 3.4]) box(0.32, 2.0, 0.32, wallM, at(f0 - 2.21, s, 9.2)); roof(13.4, 8.2, 2.2, at(f0, 0, 11.3)); box(1.2, 0.5, 0.2, goldM, at(f0 - 2.6, 0, 7.15));
    box(10.4, 0.35, 6.4, stoneM, at(f0, 0, 0.17)); }
  // 回廊（左右に低く）
  for (const s of [-1, 1]) { box(0.3, 3.2, 40, shuM, at(62, s * 22, 1.6)); box(3.6, 0.5, 41, roofM, at(62, s * 22, 3.5)); }
  // 拝殿（朱の柱と白い壁、深い屋根）
  { const f0 = 92; box(18, 0.9, 12, stoneM, at(f0, 0, 0.45)); for (let k = 0; k < 4; k++) box(6, 0.22, 0.6, stoneM, at(f0 - 6.3 - k * 0.6, 0, 0.11 + (3 - k) * 0.22));
    box(16, 4.2, 10, wallM, at(f0, 0, 3.0)); for (const s of [-7.6, -3.8, 0, 3.8, 7.6]) box(0.55, 4.6, 0.55, shuM, at(f0 - 5.2, s, 3.2)); box(16.4, 0.35, 0.6, shuM, at(f0 - 5.2, 0, 5.3));
    roof(21, 14, 3.4, at(f0, 0, 6.9)); box(5, 0.6, 1.6, roofM, at(f0 - 7.2, 0, 5.6)); box(1.4, 0.45, 0.2, goldM, at(f0 - 5.55, 0, 5.75)); }
  // 石灯籠：楼門の前と、拝殿へ向かう道の両脇
  for (const f of [30, 36, 54, 66, 78]) for (const s of [-4.5, 4.5]) lantern(f, s);
  // 境内の木（欅の形は後で読む。ここでは位置だけ）
  const shrTrees = []; for (let f = 8; f < 120; f += (mob ? 18 : 11)) for (const s of [-1, 1]) { const sd = s * (27 + rnd() * 10); const p = at(f, sd, 0); shrTrees.push([p.x, p.y, p.z]); }

  // ── ネットワーク：場（地面の格子の節）・オブジェクト（木・石・水・道具）・エージェント（人・生き物・碧・センサーや AI）
  // 節点は小さな形（光の玉ではない）：場＝十字、オブジェクト＝四角、エージェント＝三角。結び目は時間とスクロールで結ばれ、ほどける。
  const NODES = []; const KIND = { place: 0x7fe0e8, object: 0xe8c48a, agent: 0x9fe8a8 };
  const addN = (x, y, z, k) => NODES.push({ p: new T.Vector3(x, y, z), k, ph: rnd() * 6.283 });
  const PB = new T.Vector3(), DB = new T.Vector3();
  for (let u = 0.01; u < uEnd; u += (mob ? 34 : 22) / LEN) { curve.getPointAt(u, PB); curve.getTangentAt(u, DB);
    addN(PB.x, PB.y + 0.05, PB.z, 'place');
    for (const sd of [-1, 1]) { const off = sd * (3 + rnd() * 2.5); addN(PB.x - DB.z * off, PB.y + 1.6, PB.z + DB.x * off, 'agent'); } }
  for (let f = 0; f < 110; f += 14) { const p = at(f, 0, 0.05); addN(p.x, p.y, p.z, 'place'); const a = at(f + 5, (rnd() - 0.5) * 10, 1.6); addN(a.x, a.y, a.z, 'agent'); }
  for (const [f, s] of [[16, -17], [16, 17]]) { const p = at(f, s, 0.3); addN(p.x, p.y, p.z, 'object'); }
  for (const f of [42, 92]) { const p = at(f, 0, 3.5); addN(p.x, p.y, p.z, 'object'); }
  let netTrees = false; function netAddTrees(arr) { if (netTrees) return; netTrees = true; arr.forEach(([x, y, z], i) => { if (i % (mob ? 3 : 2) === 0) addN(x, y + 2.2, z, 'object'); }); shrTrees.forEach(([x, y, z], i) => { if (i % 2 === 0) addN(x, y + 2.2, z, 'object'); }); buildNet(); }
  const glyph = (k) => k === 'place' ? [[-0.5, 0, 0], [0.5, 0, 0], [0, 0, -0.5], [0, 0, 0.5]] : k === 'object' ? [[-0.4, -0.4, 0], [0.4, -0.4, 0], [0.4, -0.4, 0], [0.4, 0.4, 0], [0.4, 0.4, 0], [-0.4, 0.4, 0], [-0.4, 0.4, 0], [-0.4, -0.4, 0]] : [[0, 0.5, 0], [0.45, -0.3, 0], [0.45, -0.3, 0], [-0.45, -0.3, 0], [-0.45, -0.3, 0], [0, 0.5, 0]];
  let netL = null, netG = null, linkA = null, glyphL = null, bitL = null, bitA = null, LINKS = [];
  const netM = new T.LineDashedMaterial({ vertexColors: true, dashSize: 1.6, gapSize: 0.9, transparent: true, opacity: 0, depthWrite: false, fog: true, blending: T.AdditiveBlending });
  const glyM = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const bitM = new T.LineDashedMaterial({ color: 0x9fe8f0, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0, depthWrite: false, fog: true });
  function buildNet() {
    // 結び目：近い節どうし（種類の違う節を優先）
    const N = NODES.length, maxL = mob ? 110 : 240; LINKS = [];
    for (let i = 0; i < N && LINKS.length < maxL; i++) { let c = 0; for (let k = i + 1; k < N && c < 3; k++) { const d = NODES[i].p.distanceTo(NODES[k].p); if (d < 17 && (NODES[i].k !== NODES[k].k || d < 9)) { LINKS.push([i, k, rnd() * 6.283, 0.35 + rnd() * 0.5, new T.Color(KIND[NODES[i].k]).lerp(new T.Color(KIND[NODES[k].k]), 0.5)]); c++; } } }
    const P = new Float32Array(LINKS.length * 6), Cc = new Float32Array(LINKS.length * 6); linkA = Cc;
    LINKS.forEach(([a, b], n) => { P.set([NODES[a].p.x, NODES[a].p.y, NODES[a].p.z, NODES[b].p.x, NODES[b].p.y, NODES[b].p.z], n * 6); });
    netG = new T.BufferGeometry(); netG.setAttribute('position', new T.BufferAttribute(P, 3)); netG.setAttribute('color', new T.BufferAttribute(Cc, 3));
    netL = new T.LineSegments(netG, netM); netL.computeLineDistances(); netL.frustumCulled = false; S.add(netL);
    // 節の形
    const GP = [], GC = [], col = new T.Color(); NODES.forEach(nd => { col.setHex(KIND[nd.k]); const s = nd.k === 'place' ? 1.4 : 0.95; for (const v of glyph(nd.k)) { GP.push(nd.p.x + v[0] * s, nd.p.y + v[1] * s, nd.p.z + v[2] * s); GC.push(col.r, col.g, col.b); } });
    const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(GP, 3)); gg.setAttribute('color', new T.Float32BufferAttribute(GC, 3));
    glyphL = new T.LineSegments(gg, glyM); glyphL.frustumCulled = false; S.add(glyphL);
    // ビット↔アトム：物（オブジェクト）から上へデータの破線が立ち上がり、上からは地面へ降りる（互いに描きあう）
    const BP = []; NODES.forEach(nd => { if (nd.k !== 'object') return; const x = nd.p.x, z = nd.p.z, y0 = nd.p.y - 2.2; BP.push(x + 0.6, y0, z, x + 0.6, y0 + 9, z, x - 0.6, y0 + 9, z, x - 0.6, y0, z); });
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(BP, 3)); bitL = new T.LineSegments(bg, bitM); bitL.computeLineDistances(); bitL.frustumCulled = false; S.add(bitL);
  }
  const netUpd = (p, wEye, wSoil, wShr) => {
    const vis = Math.max(wEye, 1 - sm((p - 0.1) / 0.06), wShr) * (1 - wSoil * 0.8);
    netM.opacity = 0.6 * vis; netM.dashOffset = -tt * 1.1; bitM.dashOffset = -tt * 0.7; glyM.opacity = 0.85 * vis; bitM.opacity = 0.8 * vis;
    if (!netG || vis < 0.01) return vis > 0.01;
    netUpd.k = (netUpd.k || 0) + 1; if (netUpd.k % 2) return true; const c = new T.Color(); const pr = p * 6;
    for (let n = 0; n < LINKS.length; n++) { const L = LINKS[n], s = Math.sin(tt * L[3] + L[2] + pr), w = (s > 0.25 ? Math.min(1, (s - 0.25) * 2.0) : 0) * 1.05, q = n * 6, lc = L[4];
      linkA[q] = linkA[q + 3] = lc.r * w; linkA[q + 1] = linkA[q + 4] = lc.g * w; linkA[q + 2] = linkA[q + 5] = lc.b * w; }
    netG.attributes.color.needsUpdate = true; bitM.dashSize = 0.35; bitL.material.uniforms; bitM.gapSize = 0.25 + 0.15 * Math.sin(tt * 0.8); return true; };
  // 2026-11-18 背景の演出：木漏れ日の光の筋・漂う粒・地面を走る走査の帯（すべて手続きで生成）
  const shaftT = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,240,210,0)'); gr.addColorStop(0.25, 'rgba(255,240,210,.9)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 128); const g2 = g.createLinearGradient(0, 0, 16, 0); return new T.CanvasTexture(c); })();
  const shafts = [], NS = mob ? 7 : 16, SA = new T.Vector3(), SD = new T.Vector3();
  for (let i = 0; i < NS; i++) { const m = new T.MeshBasicMaterial({ map: shaftT, color: 0xffe2b0, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false });
    const me = new T.Mesh(new T.PlaneGeometry(1.4 + rnd() * 2.4, 34), m); S.add(me); shafts.push([me, rnd(), (rnd() - 0.5) * 20, rnd() * 6.283]); }
  const ND = mob ? 260 : 700, dV = new Float32Array(ND * 3), dO = []; for (let i = 0; i < ND; i++) dO.push([(rnd() - 0.5) * 40, rnd() * 14, (rnd() - 0.5) * 40, rnd() * 6.283]);
  const dG = new T.BufferGeometry(); dG.setAttribute('position', new T.BufferAttribute(dV, 3));
  const dM = new T.PointsMaterial({ map: dot, color: 0xfff0d0, size: mob ? 0.34 : 0.26, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: true }); /* 漂う粒は出さない */
  const scanM = new T.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: true });
  const scan = new T.Mesh(new T.PlaneGeometry(56, 0.35), scanM); scan.rotation.x = -Math.PI / 2; S.add(scan);
  const fx2 = (p, u, wEye, wSoil, wBee, wBat) => {
    const day = Math.max(wEye, 1 - sm((p - 0.1) / 0.06)) * (1 - wSoil) * (1 - wBat * 0.7), top = 0;
    shafts.forEach(([me, r, sx, ph], i) => { const uu = Math.min(1, u + 0.004 + r * 0.05); curve.getPointAt(uu, SA); curve.getTangentAt(uu, SD);
      me.position.set(SA.x - SD.z * sx, SA.y + 12, SA.z + SD.x * sx); me.rotation.set(0, Math.atan2(SD.x, SD.z) + ph, 0.38);
      me.material.opacity = (day * 0.22 + top * 0.12) * (0.6 + 0.4 * Math.sin(tt * 0.5 + ph)); me.material.color.setHex(0xffe2b0); });
    dM.opacity = Math.max(day, top * 0.6) * 0.8; dM.color.setHex(wBee > 0.5 ? 0xd8c0ff : 0xfff0d0);
    for (let i = 0; i < ND; i++) { const [x, y, z, ph] = dO[i]; dV[i * 3] = C.position.x + x + Math.sin(tt * 0.3 + ph) * 1.2; dV[i * 3 + 1] = (A.y + ((y + tt * 0.25 + ph) % 14)); dV[i * 3 + 2] = C.position.z + z + Math.cos(tt * 0.25 + ph) * 1.2; }
    dG.attributes.position.needsUpdate = true;
    const f = (tt * 0.12) % 1, su = Math.min(1, u + 0.002 + f * 0.03); curve.getPointAt(su, SA); curve.getTangentAt(su, SD);
    scan.position.set(SA.x, SA.y + 0.06, SA.z); scan.rotation.z = -Math.atan2(SD.x, SD.z); scanM.opacity = (wEye * 0.55 + top * 0.3) * Math.sin(f * Math.PI) * (1 - wSoil);
    return day > 0.01 || top > 0.01; };
  const SC = [
    [0.00, 0.13, '', ''],
    [0.15, 0.29, '目の高さへ。人の受けとる参道。', 'Down to eye level. The approach as people receive it.'],
    [0.31, 0.44, 'ミツバチの目：人には見えない紫外の光（模式）', 'A honeybee’s eyes: ultraviolet light we cannot see (model)'],
    [0.46, 0.58, 'コウモリの耳：超音波のこだまで道を知る（模式）', 'A bat’s ears: finding the way by ultrasonic echoes (model)'],
    [0.60, 0.71, '土の中：根と菌がつながる（模式）', 'Under the soil: roots and fungi connect (model)'],
    [0.72, 0.79, '欅の時間：年輪は、多くの木で一年に一つ（模式）', 'Keyaki time: in most trees, one ring a year (model)'],
    [0.81, 0.9, '作品と領域が、式の層に重なる', 'Works and fields overlap on the layers of the formula'],
    [0.94, 1.01, '', '']];
  const key = (p, K) => { for (let i = 1; i < K.length; i++) if (p <= K[i][0]) { const [a, va] = K[i - 1], [b, vb] = K[i], e = sm((p - a) / (b - a)); return va + (vb - va) * e; } return K[K.length - 1][1]; };
  const KH = [[0, mob ? 7 : 6], [0.13, mob ? 4 : 3.5], [0.29, 1.6], [0.6, 1.6], [0.64, -2.4], [0.7, -2.4], [0.73, 1.7], [0.8, 1.9], [0.88, 10], [0.95, 40], [1, 90]];
  const KL = [[0, 2.2], [0.29, 1.5], [0.6, 1.4], [0.64, -3.2], [0.71, -3.2], [0.76, 2], [0.8, 10], [0.9, 18], [1, 30]];
  const KU = [[0, 0.05], [0.13, 0.07], [0.29, 0.3], [0.6, 0.58], [0.71, 0.66], [0.735, 1], [1, 1]];
  const A = new T.Vector3(), B = new T.Vector3(), FB = new T.Color(), FU = new T.Color(0x0c0620), FS = new T.Color(0x0d0904), PV = new T.Color(0x7a5cff), LV = new T.Color(0x5a3ca0);
  let scene = -2, tt = 0;
  function place(p) {
    const u = uEnd * key(p, KU), h = key(p, KH), ly = key(p, KL);
    curve.getPointAt(u, A); curve.getPointAt(Math.min(1, u + 0.03 + 0.02 * (1 - sm(p / 0.3))), B);
    const back = 0;
    C.position.set(A.x + Math.sin(p * 9) * 0.25, A.y + h, A.z + back);
    if (p > 0.8) B.lerp(PF, sm((p - 0.78) / 0.05));
    const ext = 68 * sm((p - 0.735) / 0.05); if (ext > 0.01) { A.copy(PE).addScaledVector(DE, ext); C.position.set(A.x, A.y + h, A.z); B.copy(PE).addScaledVector(DE, ext + 14); B.y = PE.y + 1.5; }
    C.lookAt(B.x, B.y + ly, B.z);

    // 足もとへ寄る場面（.sd-pause の区間だけ）
    const pz = document.querySelector('.sd-pause'); let wC = 0;
    if (pz) { const r = pz.getBoundingClientRect(); wC = sm(1 - Math.abs(r.top + r.height / 2 - innerHeight / 2) / (innerHeight * 0.75)); }
    if (wC > 0.001) {
      let tb = null, bd = 1e9; for (const n of treeSel) { const d = Math.hypot(n[0] - A.x, n[2] - A.z); if (d < bd) { bd = d; tb = n; } }
      if (tb) { const q0 = C.quaternion.clone(), p0 = C.position.clone(), dx = A.x - tb[0], dz = A.z - tb[2], dl = Math.hypot(dx, dz) || 1;
        C.position.set(tb[0] + dx / dl * 4.2, tb[1] + 1.25, tb[2] + dz / dl * 4.2); C.lookAt(tb[0], tb[1] + 0.15, tb[2]);
        const q1 = C.quaternion.clone(); C.position.lerpVectors(p0, C.position, wC); C.quaternion.copy(q0).slerp(q1, wC); }
    }
    if (stk) { const o = wC > 0.01 ? String(base0 + 0.38 * wC) : ''; if (stk.style.opacity !== o) stk.style.opacity = o; }
    window.__sdClose = wC;
    const wTop = 1 - sm(p / 0.12); topMats.forEach(([m]) => m.opacity = 0); TOPL.visible = false;
    if (wTop > 0.01) { C.rotateY((Math.sin(tt * 0.12) * 0.05 - px * 0.08) * wTop); C.rotateX((-py * 0.05) * wTop); }
    const wBee = win(p, 0.31, 0.44), wBat = win(p, 0.46, 0.58), wSoil = win(p, 0.6, 0.71), wKey = win(p, 0.72, 0.79), wFx = win(p, 0.8, 0.9, 0.025), wEye = win(p, 0.15, 0.79, 0.05);
    treeM.color.copy(TREE0).lerp(TREE_UV, wBee).lerp(TREE_BAT, wBat * 0.8); treeM.opacity = 0.75 * (1 - wSoil * 0.7) * (1 - (mob ? 0.8 : 0.6) * (1 - sm(p / 0.12))); treeM.size = (mob ? 2.6 : 2.2) * (1 - 0.72 * Math.max(wEye, 1 - sm((p - 0.1) / 0.06), sm((p - 0.15) / 0.05) * (1 - sm((p - 0.95) / 0.04))));
    toriiM.opacity = 0.95 * (1 - (mob ? 0.85 : 0.3) * (1 - sm(p / 0.12))); lineM.opacity = 0.85 * (1 - wBat * 0.5) * (1 - wSoil * 0.6) * (1 - 0.7 * (1 - sm(p / 0.12)));
    pave.opacity = leaf.opacity = Math.max(wEye, 1 - sm((p - 0.1) / 0.06)) * (1 - wSoil * 0.75) * (1 - wBat * 0.6); soilG.opacity = pave.opacity * 0.9; if (mossM) mossM.opacity = Math.min(1, pave.opacity * 1.1); { const wc = window.__sdClose || 0; if (wc > 0.001) { pave.opacity = leaf.opacity = Math.max(pave.opacity, wc); soilG.opacity = Math.max(soilG.opacity, wc * 0.9); if (mossM) mossM.opacity = Math.max(mossM.opacity, wc); UDAP.value = Math.max(UDAP.value, 0.6 * wc); } } UT.value = tt; UDAP.value = 0.75 * (1 - wBat) * (1 - wSoil);
    pave.color.setHex(0x9a968c); leaf.color.setHex(0xd2c6b0);
    rootM.opacity = wSoil * 0.9;
    hemi.intensity = 1.0 + wBat * 1.4 + wEye * 0.5; hemi.color.setHex(wBat > 0.5 ? 0x8fb4ff : 0x9fc8ff);
    soilMats.forEach(([m, op]) => m.opacity = op * wSoil); dropM.opacity = 0;
    if (wSoil > 0.01) { const pa = dropG.attributes.position; for (let i = 0; i < dropY0.length; i++) pa.array[i * 3 + 1] = dropY0[i] - ((tt * 0.25 + i * 0.137) % 1) * 1.2; pa.needsUpdate = true; }
    bugM.opacity = 0;
    if (wBat > 0.01) { const pa = bugG.attributes.position, ca = bugG.attributes.color, fw = new T.Vector3(B.x - A.x, 0, B.z - A.z).normalize();
      for (let i = 0; i < NB; i++) { const [sx, sy, sf, ph] = bugO[i], x = A.x + fw.x * sf - fw.z * sx + Math.sin(tt * 3 + ph) * 0.6, z = A.z + fw.z * sf + fw.x * sx + Math.cos(tt * 2.6 + ph) * 0.6, y = A.y + sy + Math.sin(tt * 4 + ph) * 0.3;
        pa.array[i * 3] = x; pa.array[i * 3 + 1] = y; pa.array[i * 3 + 2] = z;
        const d = Math.hypot(x - C.position.x, z - C.position.z); let hit = 0; for (let k = 0; k < rings.length; k++) { const f = ((tt * 0.6 + k / rings.length) % 1), rr = 1.5 + f * 30; hit = Math.max(hit, Math.max(0, 1 - Math.abs(rr - d) / 1.2) * (1 - f)); }
        const c = 0.9 + hit * 2.2; ca.array[i * 3] = c; ca.array[i * 3 + 1] = c * 0.95; ca.array[i * 3 + 2] = c * 0.8; }
      pa.needsUpdate = ca.needsUpdate = true; }
    FB.setHex(0x15243c).lerp(FS, wSoil); S.fog.color.copy(FB); R.setClearColor(FB, 1); S.fog.density = 0.003 + wEye * 0.012 - wFx * 0.002;
    fxMats.forEach(([m, a]) => m.opacity = a * wFx);
    const rk = Math.max(wBat, wKey), bat = wBat >= wKey;
    let t0 = null; if (!bat && rk > 0) { t0 = near.reduce((b, n) => (Math.hypot(n[0] - A.x, n[2] - A.z) < Math.hypot(b[0] - A.x, b[2] - A.z) ? n : b), near[0]); if (!t0 || Math.hypot(t0[0] - B.x, t0[2] - B.z) > 18) t0 = [B.x + 4, A.y, B.z]; }
    rings.forEach((r, i) => { const f = ((tt * (bat ? 0.6 : 0.12) + i / rings.length) % 1);
      if (bat) { r.position.set(C.position.x, A.y + 0.08, C.position.z); r.scale.setScalar(1.5 + f * 30); r.material.color.setHex(0xc8ecff); r.material.opacity = rk * (1 - f); }
      else if (t0) { r.position.set(t0[0], t0[1] + 1.4, t0[2]); r.scale.setScalar(0.3 + (i + f) * 0.45); r.material.color.setHex(0xf2c58a); r.material.opacity = rk * 0.7; }
      else r.material.opacity = 0; });
    const wShr = sm((p - 0.705) / 0.03); shrMats.forEach(([m, o]) => m.opacity = o * wShr * 0.8); SHR.visible = wShr > 0.01;
    const fxa = fx2(p, u, wEye, wSoil, wBee, wBat); const nta = netUpd(p, wEye, wSoil, wShr);
    skyD.position.copy(C.position); skyM.uniforms.uO.value = Math.max(wEye, 1 - sm((p - 0.1) / 0.06)) * (1 - wSoil) * (1 - wBat * 0.8) * (1 - wBee * 0.6) * 0.32;
    if (wEye > 0.01) loadTex();
    const s = SC.findIndex(x => p >= x[0] && p < x[1]);
    if (s !== scene) { scene = s; if (cap) { const en = document.documentElement.lang === 'en', t = s < 0 ? '' : SC[s][en ? 3 : 2]; cap.textContent = t; cap.classList.toggle('on', !!t); } sec.dataset.scene = s; if (window.__sdSound) window.__sdSound(s); }
    if (read) read.textContent = 'D ' + String(Math.round(u * LEN)).padStart(4, '0') + ' m  ·  H ' + (h < 0 ? '-' : '') + String(Math.abs(Math.round(h))).padStart(2, '0') + ' m';
    return rk > 0.01 || wSoil > 0.01 || p < 0.04 || fxa || nta;
  }
  function size() { const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; R.setSize(w, h, false); C.aspect = w / h; C.updateProjectionMatrix(); }
  const prog = () => { const M0 = window.__mdEnd || 0; const span = document.documentElement.scrollHeight - innerHeight, q = span > 0 ? Math.min(1, Math.max(0, scrollY / span)) : 0; return 0.79 * (M0 > 0 ? (q < M0 ? 0 : 0.13 + 0.87 * (q - M0) / (1 - M0)) : q); };
  let cur = prog(), raf = 0, vis = true, lt = 0, frozen = false;
  const draw = () => { const anim = place(cur); R.render(S, C); return anim; };
  function loop(n) { raf = 0; if (frozen) return; const dt = lt ? Math.min(0.05, (n - lt) / 1000) : 0.016; lt = n; tt += dt; const t = prog(); cur += (t - cur) * 0.2; if (Math.abs(t - cur) < 2e-4) cur = t; const anim = draw(); dirtyTex = false; if (vis && (cur !== t || anim)) raf = requestAnimationFrame(loop); else lt = 0; }
  function kick() { if (vis && !raf) raf = requestAnimationFrame(loop); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { size(); kick(); });
  vis = true; document.addEventListener('visibilitychange', () => { vis = !document.hidden; kick(); });
  size(); draw(); sec.dataset.ready = '1';
  (window.requestIdleCallback || (f => setTimeout(f, 300)))(() => { loadTex(); loadTrees(); }, { timeout: 1200 });
  window.__sd = { rings, C, R, set: p => { frozen = true; cur = p; tt = 0.35; draw(); }, LEN, tex: () => loadTex() };
}
