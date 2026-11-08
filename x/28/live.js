// Qualia/sho ── LIVE の層（v5 2026-10-22）
// © mitsulab. All rights reserved.
// 本人「動的な３dオブジェクト」「液体の墨」「無重力感」「デジタル空間と融合」「書が振動して、空間も振動」「LIVE感がもっとも重要」。
// ・無重力の墨の滴：書の肌から離れて球になり、漂い、また戻る（表面張力で丸く、動くと伸びる）
// ・デジタルの層：音の波形の輪・走査の線・床の格子・昇るデータの粒（細い線と点だけ。面は塗らない＝世界観の決まり）
// ・振動：音の強さと触れた強さで、書・層・部屋が一緒に震える（減らす設定ではほぼ止める）
import * as THREE from 'three';

export function createLive(scene, sho, { mobile, RM, drops = true }) {   /* v9 drops:false＝書から離れる墨の滴を出さない（本人「触れてもバラバラにならないで」） */
  const g = new THREE.Group(); g.name = 'live';
  const C = sho.group.position.clone();
  const W = sho.width, Hh = sho.height, R0 = Math.max(W, Hh) * 0.62;
  const line = (op) => new THREE.LineBasicMaterial({ color: 0x1c1d20, transparent: true, opacity: Math.min(0.75, op * 1.6), depthWrite: false, fog: false });   // v5.3 霧で白くかすんだ線が書の前を横切らない   // v5.1 色は全部墨：淡墨の細い線（光の線にしない）

  // 無重力の墨の滴
  const nB = mobile ? 26 : 64;
  const blobMat = new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.62, metalness: 0 });   // v5.3 白い光の点を出さない（テカリなし）   // 本体と同じ墨。縁に光を受けて球に見える
  // v6.1（10-23）尾を短く・平たくしない（木の葉・花びらの形に見えた）。v5.4 滴は真球にしない：涙形（丸い頭と、本体のほうへ細る尾）。尾の長さは離れる速さで伸び縮みする
  const dropGeo = new THREE.IcosahedronGeometry(1, mobile ? 2 : 3);
  { const pa = dropGeo.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); if (y < 0) { const k = -y, w = Math.pow(1 - k, 1.35) * 0.92 + 0.08 * (1 - k); pa.setXYZ(i, pa.getX(i) * w, -k * 1.25, pa.getZ(i) * w); } else pa.setY(i, y * 0.82); } dropGeo.computeVertexNormals(); }
  const blobs = new THREE.InstancedMesh(dropGeo, blobMat, nB);
  let seed = 2701; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // 毎回同じ並び（見え方を確かめられる）
  blobs.frustumCulled = false;
  const src = sho.points.geometry.getAttribute('position'), cnt = sho.points.geometry.drawRange.count;
  const B = [];
  for (let i = 0; i < nB; i++) {
    const k = Math.floor(rnd() * cnt);
    const a = new THREE.Vector3(src.getX(k), src.getY(k), src.getZ(k));
    const d = new THREE.Vector3(rnd() - .5, rnd() - .3, rnd() - .5).normalize();
    B.push({ sq: [0.72 + rnd() * 0.5, 0.8 + rnd() * 0.5, 0.65 + rnd() * 0.45], a, d, r: 0.011 + Math.pow(rnd(), 2.6) * 0.04, far: 0.3 + rnd() * 1.0, ph: rnd() * 30, sp: 0.09 + rnd() * 0.13 }   /* v6 LIVE：滴を一回り大きく・速く（6 秒で離れて戻るのが見える） */);
  }
  if (drops) scene.add(blobs);
  // v5.4 書の背の霞：書のすぐ後ろに、障子の照り返しのような淡い明るみ（どの向きから見ても、柱や暗い壁に墨が刺さって溶けない）
  const haloMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uA: { value: 0.32 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; void main(){ float a = exp(-pow(dot(vU * vec2(1.0, 0.85), vU * vec2(1.0, 0.85)), 1.6) * 3.2) * uA; gl_FragColor = vec4(vec3(0.62, 0.6, 0.57), a); }' });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat); halo.scale.set(W * 1.9, Hh * 1.7, 1); halo.frustumCulled = false; halo.renderOrder = -1; halo.visible = false;   // v5.4b 霞は「光の箱」に見えたので出さない（柱は古材の明るさで分ける）
  const hc = new THREE.Vector3(), hd = new THREE.Vector3();

  // 波形の輪（書のまわりに三つ。音の形がそのまま輪の揺れになる）
  const NW = mobile ? 96 : 192;
  const rings = [0.38, 0.5, 0.62].map((hy, j) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NW * 3), 3));
    const l = new THREE.LineLoop(geo, line(0.32 - j * 0.06)); l.userData = { hy, j }; l.frustumCulled = false; g.add(l); return l;
  });
  // 走査の線（上下にゆっくり往復する水平の輪）
  const scanGeo = new THREE.BufferGeometry(); const sp = new Float32Array(129 * 3);
  for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; sp.set([Math.cos(a) * R0 * 1.15, 0, Math.sin(a) * R0 * 1.15], i * 3); }
  scanGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const scan = new THREE.Line(scanGeo, line(0.5)); scan.frustumCulled = false; g.add(scan);
  // 床の格子（書の足もとに、四角い区画の印。音で明るむ）
  const gp = [], N = 8, S = 0.5;
  for (let i = -N; i <= N; i++) { gp.push(i * S, 0, -N * S, i * S, 0, N * S, -N * S, 0, i * S, N * S, 0, i * S); }
  const gridGeo = new THREE.BufferGeometry(); gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  const gridMat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0.12 }, uR: { value: N * S }, uT: { value: 0 }, uK: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA, uR, uT, uK; varying vec2 vP; void main(){ float r = length(vP); float wave = 0.5 + 0.5 * sin(r * 6.0 - uT * 4.0); float a = uA * (1.0 - smoothstep(uR * 0.4, uR, r)) * (0.6 + 0.4 * wave + uK * 1.6 * wave); gl_FragColor = vec4(vec3(0.05, 0.05, 0.055), a * 2.2); }',   /* 床の格子も墨の線 */
  });
  const grid = new THREE.LineSegments(gridGeo, gridMat); grid.position.y = 0.012; grid.frustumCulled = false;
  // データの粒（書のまわりを昇る点）
  const nD = mobile ? 90 : 220, dp = new Float32Array(nD * 3), ds = new Float32Array(nD);
  for (let i = 0; i < nD; i++) { const a = rnd() * Math.PI * 2, r = R0 * (0.7 + rnd() * 0.7); dp.set([Math.cos(a) * r, rnd() * Hh * 1.4 - Hh * 0.7, Math.sin(a) * r], i * 3); ds[i] = rnd(); }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dGeo.setAttribute('aS', new THREE.BufferAttribute(ds, 1));
  const dMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 0 }, uH: { value: Hh * 1.4 }, uPx: { value: Math.min(devicePixelRatio, 2) } }, transparent: true, depthWrite: false,
    vertexShader: `uniform float uT, uK, uH, uPx; attribute float aS; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uH * 0.5 + uT * (0.08 + 0.12 * aS) * (1.0 + 2.0 * uK), uH) - uH * 0.5;
        vA = (0.25 + 0.75 * aS) * (1.0 - smoothstep(uH * 0.35, uH * 0.5, abs(p.y))) * (0.5 + uK);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (1.2 + 1.6 * aS) * (1.0 + 0.6 * uK); }`,
    fragmentShader: 'varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c, c) * 16.0) * vA * 0.6; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.04, 0.04, 0.045), a * 1.4); }',   /* 昇る粒も墨の微塵 */
  });
  const data = new THREE.Points(dGeo, dMat); data.frustumCulled = false; g.add(data);
  g.position.copy(C);
  scene.add(g); scene.add(grid);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let shake = 0;
  return {
    group: g, grid,
    // t：時刻、lv：音の強さ（0..1）、kick：触れた強さ（0..1）、wave：波形（Float32Array）
    update(t, dt, lv, kick, wave, roomGroup, cam) {
      const k = Math.min(1, lv * 0.9 + kick * 1.6), mo = RM ? 0.15 : 1;
      // 滴：離れて、漂い、戻る（離れているあいだは丸く、動きの速い所は伸びる）
      sho.group.updateMatrixWorld();
      for (let i = 0; i < nB; i++) {
        const b = B[i], c = (t * b.sp + b.ph) % 1, out = Math.sin(Math.PI * c);   // 0→1→0
        const e = out * out * (3 - 2 * out) * (1 + 0.6 * k);
        p3.copy(b.d).multiplyScalar(b.far * e * (1 + 1.6 * k)).add(b.a);   /* v7 触れたとき、かけらがはっきり離れて漂う */
        p3.x += Math.sin(t * 0.9 + b.ph) * 0.08 * e; p3.y += Math.cos(t * 0.7 + b.ph * 1.3) * 0.09 * e;
        const vel = Math.abs(Math.cos(Math.PI * c)) * (1 - Math.min(1, e * 1.2)) ;   // v5.4 離れる・戻るときは糸のように細長く、漂うあいだは平たいしずく   // 離れていくときだけ伸び、漂うあいだは真球
        const r = b.r * Math.min(1, e * 3) * (1 + 0.25 * k * Math.sin(t * 37 + i));
        const wob = 0.16 * Math.sin(t * (2.2 + 3.0 * b.sp * 10) + b.ph * 7.0) * (0.4 + 0.6 * e);   /* v5.1 無重力の液滴は真球で止まらず、ゆっくり伸び縮みして揺れる（表面張力の振動） */
        q.setFromUnitVectors(up, b.d); s3.set(r * b.sq[0] * (1 - 0.45 * vel - 0.5 * wob), r * b.sq[1] * (1 + 1.4 * vel + wob), r * b.sq[2] * 0.88 * (1 - 0.45 * vel - 0.5 * wob));   // v5.3 真球にしない（滴ごとに少しずつ違う形）
        m4.compose(p3, q, s3).premultiply(sho.group.matrixWorld);
        blobs.setMatrixAt(i, m4);
      }
      blobs.instanceMatrix.needsUpdate = true;
      if (cam) { sho.group.getWorldPosition(hc); hd.copy(cam.position).sub(hc).setY(0).normalize(); halo.position.copy(hc).addScaledVector(hd, -Math.max(W, Hh) * 0.22); halo.quaternion.copy(cam.quaternion); }
      // 波形の輪
      rings.forEach(l => {
        const a = l.geometry.attributes.position.array, y = (l.userData.hy - 0.5) * Hh, rr = R0 * (0.95 + 0.12 * l.userData.j) * (1 + 0.04 * Math.sin(t * 0.6 + l.userData.j));
        for (let i = 0; i < NW; i++) {
          const ang = i / NW * Math.PI * 2 + t * (0.05 + 0.03 * l.userData.j) * (l.userData.j % 2 ? -1 : 1);
          const w = wave ? wave[(i * 2 + l.userData.j * 37) % wave.length] : Math.sin(i * 0.3 + t * 3) * 0.02;
          const d = rr * (1 + w * (0.8 + 2.5 * k) * mo);
          a[i * 3] = Math.cos(ang) * d; a[i * 3 + 1] = y + w * 0.25 * mo; a[i * 3 + 2] = Math.sin(ang) * d;
        }
        l.geometry.attributes.position.needsUpdate = true; l.material.opacity = 0.3 * k * k; l.visible = k > 0.05;   // v5.3 輪は触れた・音が強いときだけ一瞬（ふだんは線を出さない＝HUD に見えない）
      });
      // 走査の線
      scan.position.y = Math.sin(t * 0.45) * Hh * 0.55; scan.material.opacity = 0.25 * k * k; scan.visible = k > 0.05; scan.scale.setScalar(1 + 0.05 * Math.sin(t * 2.0) + 0.08 * k);
      gridMat.uniforms.uT.value = t; gridMat.uniforms.uK.value = k; gridMat.uniforms.uA.value = 0.1 + 0.2 * k;
      dMat.uniforms.uT.value = t; dMat.uniforms.uK.value = k;
      // 空間ごと震える（部屋は小さく、カメラはさらに小さく）
      shake += (k - shake) * Math.min(1, dt * 18);
      const amp = shake * 0.03 * mo;
      if (roomGroup) roomGroup.position.set(Math.sin(t * 61) * amp, Math.sin(t * 53 + 1) * amp * 0.6, Math.cos(t * 57) * amp);
      g.scale.setScalar(1 + shake * 0.02 * mo);
      return amp;
    },
    dispose() { scene.remove(g); scene.remove(grid); scene.remove(blobs); scene.remove(halo); halo.geometry.dispose(); haloMat.dispose(); [blobs.geometry, scanGeo, gridGeo, dGeo].forEach(x => x.dispose()); rings.forEach(l => l.geometry.dispose()); },
  };
}
