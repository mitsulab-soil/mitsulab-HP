/* 3D 地図の案内（Qualium 大宮・川越・渋谷で共通）2026-10-28 本人
   「透過した線と面で案内する。上品に、細く。エリア分けは不要。」
   「1 回目に地点を押す → その地点の説明と、その場所を目の高さから見た眺め。同じ地点をもう 1 回押す → そこから歩く。」
   眺めは、アプリ自身の 3D を目の高さで描いたもの（よその写真・ストリートビューは使わない）。
   使い方：
     const MG = makeMapGuide({ THREE, parent, groundY, routes: [[[x, z], ...]], places: [{ x, z, r }] });
       毎こま MG.update(t, camera) ／ MG.show(true|false)
     const EV = makeEyeView({ THREE, renderer, scene, hide: () => [隠す物...] });
       EV.draw(canvas, { x, y, z, yaw, pitch }) … 目の高さの眺めを canvas に描く（呼んだ一回だけ描く）
*/
export function makeMapGuide({ THREE, parent, groundY, routes = [], places = [], color = "#bfe9f5", lift = 1.4 }) {
  const g = new THREE.Group(); g.name = "mapGuide"; parent.add(g);
  const C = new THREE.Color(color);
  /* 道筋：地面に沿う細い帯。幅は画面でおよそ 2px に保つ（頂点で横へずらす）。芯は明るく、縁は透ける。光がゆっくり流れる */
  const lineMat = new THREE.ShaderMaterial({
    uniforms: { uC: { value: C }, uW: { value: 1 }, uT: { value: 0 }, uA: { value: 1 } },
    vertexShader: `attribute float aSide; attribute vec3 aDir; attribute float aS; uniform float uW; varying float vS; varying float vSide;
      void main(){ vec3 n = normalize(vec3(-aDir.z, 0., aDir.x)); vec3 p = position + n * aSide * uW; vS = aS; vSide = aSide;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform vec3 uC; uniform float uT; uniform float uA; varying float vS; varying float vSide;
      void main(){ float e = 1. - abs(vSide); float core = pow(e, 1.6);
        float flow = .55 + .45 * smoothstep(.0, .5, .5 - abs(fract(vS / 90. - uT * .08) - .5));
        gl_FragColor = vec4(mix(uC, vec3(1.), core * .35), core * .62 * flow * uA); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
  });
  for (const R of routes) {
    if (!R || R.length < 2) continue;
    const pos = [], side = [], dir = [], sArr = [], idx = []; let s = 0;
    for (let i = 0; i < R.length; i++) {
      const [x, z] = R[i], a = R[Math.max(0, i - 1)], b = R[Math.min(R.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      if (i) s += Math.hypot(x - R[i - 1][0], z - R[i - 1][1]);
      const y = groundY(x, z) + lift;
      for (const sd of [-1, 1]) { pos.push(x, y, z); side.push(sd); dir.push(dx, 0, dz); sArr.push(s); }
      if (i) { const q = (i - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
    geo.setAttribute("aDir", new THREE.Float32BufferAttribute(dir, 3)); geo.setAttribute("aS", new THREE.Float32BufferAttribute(sArr, 1)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, lineMat); m.frustumCulled = false; m.renderOrder = 6; g.add(m);
  }
  /* 主な場所：淡い円の面（中ほどがわずかに明るく、縁へ溶ける）と、髪の毛ほどの輪 */
  const discMat = new THREE.ShaderMaterial({
    uniforms: { uC: { value: C }, uA: { value: 1 } },
    vertexShader: `varying vec2 vU; void main(){ vU = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; varying vec2 vU;
      void main(){ float r = length(vU); if (r > 1.) discard; float fill = (1. - smoothstep(.15, 1., r)) * .16; float rim = smoothstep(.93, .97, r) * (1. - smoothstep(.97, 1., r)) * .5;
        gl_FragColor = vec4(uC, (fill + rim) * uA); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
  });
  const discG = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  for (const p of places) { const m = new THREE.Mesh(discG, discMat); m.position.set(p.x, groundY(p.x, p.z) + lift * .8, p.z); m.scale.setScalar(p.r || 30); m.renderOrder = 5; m.frustumCulled = false; g.add(m); }
  const _v = new THREE.Vector3();
  return {
    group: g,
    show(on) { g.visible = on; },
    update(t, camera) {
      if (!g.visible) return; lineMat.uniforms.uT.value = t;
      /* 画面でおよそ 1.6px（スマホ 2px）の半幅に。遠くから見るほど、地面では太く */
      const d = camera.position.distanceTo(_v.set(camera.position.x, groundY(camera.position.x, camera.position.z), camera.position.z)) || 100;
      const F = innerHeight / 2 / Math.tan(camera.fov * Math.PI / 360); lineMat.uniforms.uW.value = Math.max(.6, d * (innerWidth < 640 ? 2 : 1.6) / F);
    },
  };
}

/* 目の高さの眺め：アプリ自身の 3D を、その地点に立ったカメラで描く。
   画面と同じ色の仕上げ（トーンと色空間）にするため、画面の左下の小さな枠へ一度だけ描いて写し取り、すぐ元の画を描き直す */
export function makeEyeView({ THREE, renderer, scene, camera, hide = () => [], fov = 62, prep = null }) {
  const W = 480, H = 270, cam = new THREE.PerspectiveCamera(fov, W / H, .3, 2400), sz = new THREE.Vector2(), vp = new THREE.Vector4();
  return {
    draw(canvas, { x, y, z, yaw, pitch = -.03 }) {
      cam.position.set(x, y, z); cam.rotation.set(pitch, yaw, 0, "YXZ"); cam.updateMatrixWorld();
      const hid = hide().filter(o => o && o.visible); for (const o of hid) o.visible = false;
      const undo = prep?.(cam), pr = renderer.getPixelRatio(); renderer.getSize(sz); renderer.getViewport(vp);
      const w = Math.min(W / pr, sz.x), h = Math.min(H / pr, sz.y);
      renderer.setRenderTarget(null); renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h); renderer.setScissorTest(true);
      renderer.render(scene, cam);
      canvas.width = W; canvas.height = H; const el = renderer.domElement;
      canvas.getContext("2d").drawImage(el, 0, el.height - h * pr, w * pr, h * pr, 0, 0, W, H);
      renderer.setScissorTest(false); renderer.setViewport(vp);
      undo?.(); for (const o of hid) o.visible = true;
      if (camera) renderer.render(scene, camera);   // 元の画に戻す
    },
  };
}
