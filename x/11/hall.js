// Qualia/sho ── 書の庭の堂（v3 2026-10-22）
// © mitsulab. All rights reserved.
// 大きな堂の中に書を点在させる：礎石に立つ柱の林・組物・梁、屋根の格子（板の隙間から日が落ちる）、二方は格子窓、二方は高欄の外の明るい霞と庭。
// 床の縞の光と影・光の筋の霞・光の層（Qualia Layer）の柱。質感は Poly Haven の CC0（granite_tile・dark_wooden_planks・ninomaru_teien）。
import * as THREE from 'three';

// 日の向き（光のほうへ向く向き）。屋根の格子の隙間から、高い所から差す
export const SUN = new THREE.Vector3(-0.22, 0.9, -0.38).normalize();
export const HALF = 17;                              // 堂の半分の幅（m）
const SLAT_Y = 6.4, SLAT_P = 1.1, SLAT_W = 0.52;     // 屋根の格子の高さ・間隔・板の割合
const COL_H = 6.0;

// 縞の光（床・霞で同じ式）：点 p から日のほうへのばした線が、屋根の格子の隙間を通るか
const STRIPE_GLSL = /* glsl */`
  uniform float uT, uWarp;
  float slatLight(vec3 p){
    float k = (${SLAT_Y.toFixed(2)} - p.y) / ${SUN.y.toFixed(4)};
    vec2 h = p.xz + vec2(${SUN.x.toFixed(4)}, ${SUN.z.toFixed(4)}) * k;
    float w = uWarp * (0.55 * sin(h.x * 0.55 + h.y * 0.21 + uT * 0.11) + 0.3 * sin(h.x * 1.3 - h.y * 0.13 - uT * 0.07) + 0.15 * sin(h.y * 0.9 + uT * 0.05));
    float ph = fract((h.y + w) / ${SLAT_P.toFixed(3)});
    float edgeSoft = 0.03 + 0.01 * k;
    float open = smoothstep(${SLAT_W.toFixed(2)} - edgeSoft, ${SLAT_W.toFixed(2)} + edgeSoft, ph) * (1.0 - smoothstep(1.0 - edgeSoft, 1.0, ph));
    float inside = (1.0 - smoothstep(${(HALF - 1.5).toFixed(1)}, ${(HALF - 0.5).toFixed(1)}, abs(h.x))) * (1.0 - smoothstep(${(HALF - 1.5).toFixed(1)}, ${(HALF - 0.5).toFixed(1)}, abs(h.y)));
    return open * inside;
  }`;

// keepOut(x, z) が true の所には柱を立てない（書のまわりをあける）
export function buildHall(scene, { mobile, keepOut = () => false }) {
  const U = { uT: { value: 0 }, uWarp: { value: 0.5 } };
  const S = HALF * 2;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const put = (im, i, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) => im.setMatrixAt(i, m4.compose(p.set(x, y, z), ry ? q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry) : q.identity(), s.set(sx, sy, sz)));

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8c9196, roughness: 0.62, metalness: 0 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a524c, roughness: 0.78 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.82 });
  const paperMat = new THREE.MeshBasicMaterial({ color: 0xc9d1d6 });

  // 床：石の板。縞の光は床の材の中で足す
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.55, metalness: 0 });
  floorMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;\n' + STRIPE_GLSL)
      .replace('#include <opaque_fragment>', `
        float sl = slatLight(vWp);
        outgoingLight = outgoingLight * 0.62 + diffuseColor.rgb * vec3(1.0, 0.985, 0.96) * sl * 1.9;
        #include <opaque_fragment>`);
  };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S + 3, S + 3), floorMat);
  floor.rotation.x = -Math.PI / 2; scene.add(floor);

  // 柱の林：4 m ごと。書のまわりはあける
  const spots = [];
  for (let x = -HALF + 1.5; x <= HALF - 1.4; x += 4) for (let z = -HALF + 1.5; z <= HALF - 1.4; z += 4) if (!keepOut(x, z)) spots.push([x, z]);
  const n = spots.length;
  const cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.27, COL_H, mobile ? 12 : 20, 1), woodMat, n);
  const bases = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.5, 0.26, mobile ? 10 : 16), stoneMat, n);
  const masu = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.22, 0.6), darkMat, n);
  const hiji = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.18, 0.28), darkMat, n * 2);
  spots.forEach(([x, z], i) => { put(cols, i, x, COL_H / 2, z); put(bases, i, x, 0.13, z); put(masu, i, x, COL_H + 0.11, z); put(hiji, i * 2, x, COL_H + 0.3, z); put(hiji, i * 2 + 1, x, COL_H + 0.3, z, 1, 1, 1, Math.PI / 2); });
  [cols, bases, masu, hiji].forEach(m => { m.instanceMatrix.needsUpdate = true; scene.add(m); });
  // 梁（格子に組む）
  const nB = Math.floor((S - 3) / 4) + 1;
  const beamsX = new THREE.InstancedMesh(new THREE.BoxGeometry(S, 0.32, 0.3), darkMat, nB), beamsZ = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.32, S), darkMat, nB);
  for (let i = 0; i < nB; i++) { const c = -HALF + 1.5 + i * 4; put(beamsX, i, 0, COL_H + 0.5, c); put(beamsZ, i, c, COL_H + 0.62, 0); }
  [beamsX, beamsZ].forEach(m => { m.instanceMatrix.needsUpdate = true; scene.add(m); });

  // 屋根の格子と空
  const nSl = Math.ceil(S / SLAT_P) + 1;
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(S + 1, 0.2, SLAT_P * SLAT_W), woodMat, nSl);
  for (let i = 0; i < nSl; i++) put(slats, i, 0, SLAT_Y, -HALF + i * SLAT_P);
  slats.instanceMatrix.needsUpdate = true; scene.add(slats);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(S + 1, S + 1), new THREE.MeshBasicMaterial({ color: 0xd9dfe2 }));
  sky.rotation.x = Math.PI / 2; sky.position.y = SLAT_Y + 0.3; scene.add(sky);

  // 西と北：格子窓の壁
  const step = mobile ? 0.26 : 0.18, nv = Math.ceil(S / step);
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, COL_H - 0.4, 0.045), darkMat, nv * 2);
  for (let i = 0; i < nv; i++) { const c = -HALF + i * step; put(bars, i, -HALF, COL_H / 2, c); put(bars, nv + i, c, COL_H / 2, -HALF, 1, 1, 1, Math.PI / 2); }
  bars.instanceMatrix.needsUpdate = true; scene.add(bars);
  const pw = new THREE.Mesh(new THREE.PlaneGeometry(S, COL_H), paperMat); pw.rotation.y = Math.PI / 2; pw.position.set(-HALF - 0.05, COL_H / 2, 0); scene.add(pw);
  const pn = new THREE.Mesh(new THREE.PlaneGeometry(S, COL_H), paperMat); pn.position.set(0, COL_H / 2, -HALF - 0.05); scene.add(pn);
  [0.5, 1.6, 3.0, 4.4, COL_H - 0.2].forEach((y, i) => {
    const t = i === 0 || i === 4 ? 0.2 : 0.05;
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.1, t, S), darkMat); a.position.set(-HALF + 0.03, y, 0); scene.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(S, t, 0.1), darkMat); b.position.set(0, y, -HALF + 0.03); scene.add(b);
  });

  // 東と南：高欄と、その外の霞の庭
  const nP = Math.ceil(S / 1.6);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), darkMat, nP * 2);
  for (let i = 0; i < nP; i++) { const c = -HALF + i * 1.6; put(posts, i, HALF, 0.45, c); put(posts, nP + i, c, 0.45, HALF); }
  posts.instanceMatrix.needsUpdate = true; scene.add(posts);
  [[0.88, 0.08], [0.46, 0.05], [0.08, 0.14]].forEach(([y, h]) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, S), darkMat); a.position.set(HALF, y, 0); scene.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(S, h, 0.08), darkMat); b.position.set(0, y, HALF); scene.add(b);
  });
  const hazeMat = new THREE.ShaderMaterial({
    fog: false, depthWrite: false, side: THREE.DoubleSide, uniforms: { uPh: { value: null }, uHas: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D uPh; uniform float uHas; varying vec2 vUv;
      void main(){ float y = vUv.y; vec3 c = mix(vec3(0.6,0.64,0.67), vec3(0.86,0.89,0.9), smoothstep(0.0, 0.45, y));
        if (uHas > 0.5) { vec3 ph = texture2D(uPh, vec2(fract(0.3 + vUv.x * 2.0) * 0.5 + 0.25, 0.3 + y * 0.42)).rgb; float k = 0.42 * smoothstep(0.85, 0.35, y) * smoothstep(0.08, 0.3, y); c = mix(c, ph * 0.9 + 0.08, k); }
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const hz1 = new THREE.Mesh(new THREE.PlaneGeometry(S + 30, 20), hazeMat); hz1.rotation.y = -Math.PI / 2; hz1.position.set(HALF + 14, 6, 0); scene.add(hz1);
  const hz2 = new THREE.Mesh(new THREE.PlaneGeometry(S + 30, 20), hazeMat); hz2.rotation.y = Math.PI; hz2.position.set(0, 6, HALF + 14); scene.add(hz2);
  const outF = new THREE.Mesh(new THREE.PlaneGeometry(S + 30, S + 30), new THREE.MeshStandardMaterial({ color: 0xb9bfc3, roughness: 0.95 }));
  outF.rotation.x = -Math.PI / 2; outF.position.set(8, -0.6, 8); scene.add(outF);
  // 軒の外の屋根（高欄の上の庇）
  const eave1 = new THREE.Mesh(new THREE.PlaneGeometry(3, S + 3), darkMat); eave1.rotation.x = Math.PI / 2; eave1.rotation.y = -0.3; eave1.position.set(HALF + 1.2, SLAT_Y - 0.3, 0); scene.add(eave1);
  const eave2 = new THREE.Mesh(new THREE.PlaneGeometry(S + 3, 3), darkMat); eave2.rotation.x = Math.PI / 2 - 0.3; eave2.position.set(0, SLAT_Y - 0.3, HALF + 1.2); scene.add(eave2);

  // 光の筋の霞：堂の中の空気を、日の縞で照らす
  const steps = mobile ? 12 : 16;
  const shaftMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uI: { value: mobile ? 0.075 : 0.08 } }, side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uI; varying vec3 vW;
      ${STRIPE_GLSL}
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec3 ro = cameraPosition, rd = vW - ro; float L = min(length(rd), 18.0); rd = normalize(rd);
        float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));   // 細かくそろったゆらぎ（砂嵐に見せない）
        float dt = L / ${steps}.0, t = dt * (0.35 + 0.3 * ign), acc = 0.0;
        for (int i = 0; i < ${steps}; i++) {
          vec3 p = ro + rd * t;
          float d = slatLight(p) * (1.0 - smoothstep(3.0, ${SLAT_Y.toFixed(2)}, p.y)) * (0.5 + 0.5 * smoothstep(0.0, 1.2, p.y));
          acc += d * dt * exp(-t * 0.11);
          t += dt;
        }
        float a = acc * uI;
        gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * a, a);
      }`,
  });
  const shafts = new THREE.Mesh(new THREE.BoxGeometry(S, SLAT_Y, S), shaftMat);
  shafts.position.y = SLAT_Y / 2; shafts.renderOrder = 5; shafts.frustumCulled = false; scene.add(shafts);

  // 漂うちり
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const nM = mobile ? 350 : 900, mp = new Float32Array(nM * 3);
  for (let i = 0; i < nM; i++) mp.set([(Math.random() - .5) * S, 0.2 + Math.random() * 5.5, (Math.random() - .5) * S], i * 3);
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0xf4fbff, size: 2.2 * Math.min(devicePixelRatio, 2), sizeAttenuation: false, map: dotTex, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(motes);

  async function loadTextures(R) {
    const tl = new THREE.TextureLoader();
    const ld = (u, srgb, rep) => new Promise(ok => tl.load(u, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(...rep); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy()); ok(t); }, undefined, () => ok(null)));
    const fr = [(S + 3) / 2.4, (S + 3) / 2.4];
    const [fc, fn, fro, wc, wn, env, pc] = await Promise.all([
      ld('data/tex/floor_c.webp', true, fr), ld('data/tex/floor_n.webp', false, fr), ld('data/tex/floor_r.webp', false, fr),
      ld('data/tex/wood_c.webp', true, [1, 3]), ld('data/tex/wood_n.webp', false, [1, 3]), ld('data/tex/env.webp', true), ld('data/tex/paper_c.webp', true, [S / 3, 2]),
    ]);
    if (fc) { floorMat.map = fc; floorMat.color.set(0xb4b9be); }
    if (fn) { floorMat.normalMap = fn; floorMat.normalScale.set(0.9, 0.9); }
    if (fro) { floorMat.roughnessMap = fro; floorMat.roughness = 0.9; }
    if (wc) { woodMat.map = wc; woodMat.color.set(0xd8cfc4); woodMat.roughness = 0.72; darkMat.map = wc; darkMat.color.set(0xa0968c); }
    if (wn) { woodMat.normalMap = wn; darkMat.normalMap = wn; }
    if (fc) { stoneMat.map = fc; stoneMat.color.set(0xc4c8cc); }
    if (pc) { paperMat.map = pc; paperMat.color.set(0xdde3e6); paperMat.needsUpdate = true; }
    floorMat.needsUpdate = woodMat.needsUpdate = darkMat.needsUpdate = stoneMat.needsUpdate = true;
    if (env) {
      env.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromEquirectangular(env).texture; scene.environmentIntensity = 0.55; pm.dispose();
      env.mapping = THREE.UVMapping; env.wrapS = THREE.RepeatWrapping; env.wrapT = THREE.ClampToEdgeWrapping; env.generateMipmaps = true; env.minFilter = THREE.LinearMipmapLinearFilter; env.needsUpdate = true;
      hazeMat.uniforms.uPh.value = env; hazeMat.uniforms.uHas.value = 1;
    }
    return env;
  }

  return {
    U, motes, loadTextures,
    update(t) { U.uT.value = t; motes.rotation.y = Math.sin(t * 0.03) * 0.02; motes.position.y = Math.sin(t * 0.2) * 0.05; },
  };
}

export function makeLayerPillars(w, seed = 1) {
  const g = new THREE.Group();
  const line = new THREE.LineBasicMaterial({ color: 0xeaf6fa, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
  const frame = new THREE.LineBasicMaterial({ color: 0xf2fbff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const face = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0.05 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float a = uA * (0.35 + 0.65 * smoothstep(1.0, 0.0, vUv.y)) * smoothstep(0.0, 0.08, vUv.y); gl_FragColor = vec4(vec3(0.85, 0.95, 1.0) * a, a); }',
  });
  const r = (a, b) => a + (Math.sin(seed * 12.9898 + a * 78.233 + b) * 43758.5453 % 1 + 1) % 1 * (b - a);
  // 置き方：左右対称にしない（書の左奥・右手前・右奥）
  const spots = [[-(w * 0.5 + 0.75), -0.9, 0.5, 3.9], [w * 0.5 + 0.85, -1.5, 0.72, 4.4]];
  const frames = [];
  spots.forEach(([x, z, s, h], k) => {
    const col = new THREE.Group(); col.position.set(x, 0, z);
    const box = new THREE.BoxGeometry(s, h, s); box.translate(0, h / 2, 0);
    col.add(new THREE.LineSegments(new THREE.EdgesGeometry(box), line));
    for (const [px, pz, ry] of [[0, s / 2, 0], [0, -s / 2, Math.PI], [s / 2, 0, Math.PI / 2], [-s / 2, 0, -Math.PI / 2]]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(s, h), face); f.position.set(px, h / 2, pz); f.rotation.y = ry; col.add(f);
    }
    // 中に重なる枠（四隅の印つき）
    const nF = 3 + (k % 2);
    for (let i = 0; i < nF; i++) {
      const y = 0.35 + (i + r(0.1, 0.6)) * (h - 0.6) / nF, fs = s * 0.92;
      const pts = [];
      const c = fs / 2, m = fs * 0.18;
      for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) { pts.push(sx * c, 0, sz * c, sx * (c - m), 0, sz * c, sx * c, 0, sz * c, sx * c, 0, sz * (c - m)); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const fr = new THREE.LineSegments(gg, frame); fr.position.y = y; fr.userData = { y, i, k }; col.add(fr); frames.push(fr);
      const sq = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(fs, fs).rotateX(-Math.PI / 2)), line); sq.position.y = y; sq.userData = { y, i, k }; col.add(sq); frames.push(sq);
    }
    g.add(col);
  });
  g.userData.update = (t, u, sway) => {
    frames.forEach(f => { f.position.y = f.userData.y + Math.sin(t * 0.35 + f.userData.i * 1.7 + f.userData.k) * 0.06 * sway + u * 0.18 * (f.userData.i + 1); });
    line.opacity = 0.16 + 0.12 * u; frame.opacity = 0.4 + 0.4 * u; face.uniforms.uA.value = 0.045 + 0.03 * u;
  };
  return g;
}
