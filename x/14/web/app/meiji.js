/* 2026-11-12 渋谷川の昔の姿：国土地理院「明治期の低湿地データ」（原典＝第一軍管地方2万分1迅速測図原図・明治 13〜19 年）の
   川（R）と低い湿った土地（G：田・湿地など）を、いまの地面に重ねる。見る人のまわり（目の高さ）だけに浮かび、立ち止まると濃く、歩くと薄く。
   形は地図の線をなぞった模式（川幅・水の色は描きかえ）。 */
export function buildMeiji(THREE, { terrain, world, camera, mode, mobile, onFirst }) {
  const U = { tex: { value: null }, t: { value: 0 }, k: { value: 0 }, eye: { value: new THREE.Vector3() }, R: { value: mobile ? 75 : 95 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, toneMapped: true, fog: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    vertexShader: "varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.); w.y += .32; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform sampler2D tex; uniform float t, k, R; uniform vec3 eye; varying vec2 vU; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+1.), f.x), f.y); }
      void main(){ if (k < .002) discard; vec3 m = texture2D(tex, vU).rgb; float d = distance(vW.xz, eye.xz);
        float near = 1. - smoothstep(R * .2, R, d); near *= near; float a0 = near * k; if (a0 < .004) discard;
        float wtr = smoothstep(.5, .85, m.r), low = smoothstep(.25, .7, m.g) * (1. - wtr);
        vec2 p = vW.xz; float rip = n(p * .9 + vec2(t * .35, t * .6)) * .6 + n(p * 2.3 - vec2(t * .5, t * .2)) * .4;
        vec3 V = normalize(eye - vW); float fr = pow(1. - clamp(V.y, 0., 1.), 3.);
        float gl = pow(n(p * 3.1 + vec2(t * .9, -t * .4)), 5.); vec3 water = mix(vec3(.035, .06, .055), vec3(.58, .64, .66), clamp(fr * .75 + rip * .1, 0., 1.)) + gl * .28;
        float tuft = n(p * 1.7) * .6 + n(p * 6.) * .4;
        vec3 paddy = mix(vec3(.34, .40, .20), vec3(.58, .60, .34), tuft) * (.85 + .3 * n(p * .25));
        float edge = smoothstep(.0, .25, m.r) * (1. - wtr);   // 岸の湿った縁
        vec3 col = water * wtr + paddy * low + vec3(.24, .27, .2) * edge;
        float a = (wtr * (.72 + fr * .2) + low * .34 + edge * .3) * a0;
        gl_FragColor = vec4(col, a); }` });
  const mesh = new THREE.Mesh(terrain.geometry, mat); mesh.name = "meiji"; mesh.renderOrder = 7; mesh.frustumCulled = false; mesh.visible = false; world.add(mesh);
  new THREE.TextureLoader().load("web/geo/meiji_lowland.webp?v=1", tx => { tx.colorSpace = THREE.NoColorSpace; tx.minFilter = THREE.LinearFilter; tx.generateMipmaps = false; U.tex.value = tx; mesh.visible = true; });
  const last = new THREE.Vector3(); let still = 0, shown = false, inWater = 0;
  return { mesh, update(dt) { if (!U.tex.value) return; U.t.value += dt; camera.getWorldPosition(U.eye.value);
      const sp = U.eye.value.distanceTo(last) / Math.max(dt, 1e-3); last.copy(U.eye.value); still = sp < .4 ? Math.min(1, still + dt / 2.5) : Math.max(0, still - dt * 1.5);
      const on = mode() === "walk" ? 1 : 0; const tgt = on * (.45 + .55 * still); U.k.value += (tgt - U.k.value) * Math.min(1, dt * 1.6);
      if (!shown && on && still > .8) { shown = true; onFirst?.(); } } };
}
