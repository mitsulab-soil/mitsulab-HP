/* 2026-11-12 渋谷川の昔の姿：国土地理院「明治期の低湿地データ」（原典＝第一軍管地方2万分1迅速測図原図・明治 13〜19 年）の
   川（R）と低い湿った土地（G：田・湿地など）を、いまの地面に重ねる。見る人のまわり（目の高さ）だけに浮かび、立ち止まると濃く、歩くと薄く。
   形は地図の線をなぞった模式（川幅・水の色は描きかえ）。 */
export function buildMeiji(THREE, { terrain, world, camera, mode, mobile, onFirst, aoi }) {
  const U = { tex: { value: null }, t: { value: 0 }, k: { value: 0 }, eye: { value: new THREE.Vector3() }, R: { value: mobile ? 75 : 95 }, aoi: { value: new THREE.Vector4(0, 0, 0, 0) } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, toneMapped: true, fog: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    vertexShader: "uniform vec4 aoi; varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.); w.y += .22; if (aoi.w > .5) w.y = mix(min(w.y, aoi.y + .015), w.y, smoothstep(.8, 2.2, distance(w.xz, aoi.xz))); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform sampler2D tex; uniform float t, k, R; uniform vec3 eye; uniform vec4 aoi; varying vec2 vU; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+1.), f.x), f.y); }
      void main(){ float ad = aoi.w > .5 ? length((vW.xz - aoi.xz) * vec2(1., 1.25)) : 99.; float sh = (1. - smoothstep(.1, .78, ad)) * .55;   // 碧の足もとの接地の影（いつも）
        if (k < .002) { if (sh < .01) discard; gl_FragColor = vec4(vec3(.03, .04, .04), sh); return; } vec3 m = texture2D(tex, vU).rgb; float d = distance(vW.xz, eye.xz);
        float near = 1. - smoothstep(R * .2, R, d); near *= near; float a0 = near * k * smoothstep(.25, .95, ad); if (a0 < .004 && sh < .01) discard;
        float wtr = smoothstep(.45, .9, m.r), low = smoothstep(.15, .85, m.g) * (1. - wtr);
        vec2 p = vW.xz;
        vec2 e = vec2(1. / 1024., 1. / 1430.) * 2.; vec2 gr = vec2(texture2D(tex, vU + vec2(e.x, 0.)).r - texture2D(tex, vU - vec2(e.x, 0.)).r, -(texture2D(tex, vU + vec2(0., e.y)).r - texture2D(tex, vU - vec2(0., e.y)).r));   // 川の幅の向き（地図の濃さの傾き）
        vec2 acr = length(gr) > .02 ? normalize(gr) : vec2(1., 0.); vec2 fl = vec2(-acr.y, acr.x); if (fl.y < 0.) fl = -fl;   // 流れの向き＝幅に直交・南（下流＝天現寺・古川）へ
        float along = dot(p, fl), across = dot(p, acr);
        float strk = n(vec2(along * .22 - t * 1.1, across * 2.6)) * .65 + n(vec2(along * .6 - t * 1.6, across * 5.)) * .35;   // 流れに沿って伸びる細い筋
        float rip = mix(n(p * 1.4 + t * .3), strk, .8);
        vec3 V = normalize(eye - vW); float fr = pow(1. - clamp(V.y, 0., 1.), 3.);
        float gl = pow(n(p * 3.1 + vec2(t * .9, -t * .4)), 5.); vec3 water = mix(vec3(.035, .06, .055), vec3(.58, .64, .66), clamp(fr * .75 + rip * .1, 0., 1.)) + gl * .2 + pow(strk, 4.) * .32;
        float tuft = n(p * 1.7) * .6 + n(p * 6.) * .4;
        vec3 paddy = mix(vec3(.34, .40, .20), vec3(.58, .60, .34), tuft) * (.85 + .3 * n(p * .25));
        float edge = smoothstep(.0, .25, m.r) * (1. - wtr);   // 岸の湿った縁
        vec3 col = water * wtr + paddy * low + vec3(.24, .27, .2) * edge;
        float a = (wtr * (.72 + fr * .2) + low * .34 + edge * .3) * a0;
        a *= .75 + .25 * n(p * .08 + t * .02);   // 縁を霞のようにゆらがせる
        gl_FragColor = vec4(mix(col, vec3(.03, .04, .04), sh / max(a + sh, 1e-3)), max(a, sh)); }` });
  const mesh = new THREE.Mesh(terrain.geometry, mat); mesh.name = "meiji"; mesh.renderOrder = 7; mesh.frustumCulled = false; mesh.visible = false; world.add(mesh);
  new THREE.TextureLoader().load("web/geo/meiji_lowland.webp?v=1", tx => { tx.colorSpace = THREE.NoColorSpace; tx.minFilter = THREE.LinearFilter; tx.generateMipmaps = false; U.tex.value = tx; mesh.visible = true; });
  const last = new THREE.Vector3(), _a = new THREE.Vector3(); let still = 0, shown = false, inWater = 0;
  return { mesh, update(dt) { if (!U.tex.value) return; U.t.value += dt; camera.getWorldPosition(U.eye.value); { const r = aoi?.(); if (r && r.visible && mode() === "walk") { r.getWorldPosition(_a); U.aoi.value.set(_a.x, _a.y, _a.z, 1); } else U.aoi.value.w = 0; }
      const sp = U.eye.value.distanceTo(last) / Math.max(dt, 1e-3); last.copy(U.eye.value); still = sp < .4 ? Math.min(1, still + dt / 2.5) : Math.max(0, still - dt * 1.5);
      const on = mode() === "walk" ? 1 : 0; const tgt = on * (.22 + .4 * still);   // 11-13 採点：地面が灰緑の水の膜に見える＝明治の川と田の層を控えめに（立ち止まると少し濃く） U.k.value += (tgt - U.k.value) * Math.min(1, dt * 1.6);
      if (!shown && on && still > .8) { shown = true; onFirst?.(); } } };
}
