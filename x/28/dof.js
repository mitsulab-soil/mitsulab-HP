// Qualia/sho ── 奥のぼかし（被写界深度・v5.1 2026-10-22）
// © mitsulab. All rights reserved.
// 本人「奥をぼかして、文字を見やすくできるように」：ピントは書に合わせ、部屋の奥・柱・窓・遠い線をぼかす。手前はごく控えめ。
// 軽さ：一度描いた絵と深さから、縮めた絵（PC 1/2・スマホ 1/3）で 2 回だけぼかして重ねる。書（ピントの中）は元の絵のまま。
import * as THREE from 'three';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const LIN = `
  uniform float uNear, uFar, uFocus, uBack, uFront;
  float linZ(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
  float coc(float d){ float dz = linZ(d) - uFocus;
    return dz > 0.0 ? 0.4 * smoothstep(0.0, 1.0, clamp((dz - uBack) / 8.0, 0.0, 1.0)) : clamp((-dz - uFront) / 3.0, 0.0, 1.0) * 0.25; }   /* 本人「自然な感じで、そんなに強くなくていい」：距離に応じてなだらかに、背景の形は残す */`;

export function createDOF(R, { mobile }) {
  const half = THREE.HalfFloatType;
  const main = new THREE.WebGLRenderTarget(4, 4, { type: half, samples: 4, depthTexture: new THREE.DepthTexture(4, 4) });
  main.depthTexture.type = THREE.UnsignedIntType;
  const lo = () => new THREE.WebGLRenderTarget(4, 4, { type: half, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const A = lo(), B = lo();
  const K = mobile ? 3 : 2;
  const common = { uNear: { value: 0.05 }, uFar: { value: 80 }, uFocus: { value: 5 }, uBack: { value: 2.6 }, uFront: { value: 4.0 } };   /* v7 広間：ほかの書（数 m 前後）はぼかさず、奥の壁だけを弱く */
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sc = new THREE.Scene(); sc.add(quad); quad.frustumCulled = false;
  // 1：縮めて、絵と「ぼけの量」を一緒に持つ
  const down = new THREE.ShaderMaterial({
    uniforms: { ...common, tC: { value: main.texture }, tD: { value: main.depthTexture }, uPx: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `${LIN} uniform sampler2D tC, tD; varying vec2 vUv;
      uniform vec2 uPx;
      void main(){ vec3 c = vec3(0.0); float a = 0.0, ws = 0.0;   /* 4 点で縮める（書の画素は外す） */
        for (int j = 0; j < 4; j++) { vec2 o = (vec2(float(j % 2), float(j / 2)) - 0.5) * uPx; float k = coc(texture2D(tD, vUv + o).r); c += texture2D(tC, vUv + o).rgb * (k + 1e-4); ws += k + 1e-4; a = max(a, k); }
        gl_FragColor = vec4(c / ws, a); }`,
  });
  // 2・3：ぼかす（ピントの中の画素は混ぜない＝書の黒が奥へにじまない）
  const blur = new THREE.ShaderMaterial({
    uniforms: { tC: { value: null }, uDir: { value: new THREE.Vector2() }, uR: { value: mobile ? 2.4 : 3.6 } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D tC; uniform vec2 uDir; uniform float uR; varying vec2 vUv;
      void main(){ vec4 c0 = texture2D(tC, vUv); vec3 acc = vec3(0.0); float wsum = 0.0, csum = 0.0;
        for (int i = -4; i <= 4; i++) { float fi = float(i); vec4 s = texture2D(tC, vUv + uDir * fi * uR * 0.25 * max(c0.a, 0.35));
          float w = exp(-fi * fi / 8.0) * s.a; acc += s.rgb * w; wsum += w; csum += s.a * exp(-fi * fi / 8.0); }
        gl_FragColor = vec4(wsum > 1e-3 ? acc / wsum : c0.rgb, max(c0.a, csum / 4.5)); }   /* ピントの中（書）の画素は一切混ぜない＝縮めた絵の段が書の縁に出ない */`,
  });
  // 4：元の絵と重ね、色の仕上げ（トーンと sRGB）
  const comp = new THREE.ShaderMaterial({
    uniforms: { ...common, tC: { value: main.texture }, tD: { value: main.depthTexture }, tB: { value: A.texture } }, vertexShader: VS, depthTest: false, depthWrite: false, toneMapped: true,
    fragmentShader: `${LIN} uniform sampler2D tC, tD, tB; varying vec2 vUv;
      void main(){ vec3 s = texture2D(tC, vUv).rgb; vec4 b = texture2D(tB, vUv); float k = smoothstep(0.0, 1.0, coc(texture2D(tD, vUv).r));
        gl_FragColor = vec4(mix(s, b.rgb, k), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const pass = (m, target) => { quad.material = m; R.setRenderTarget(target); R.render(sc, oc); };
  const api = {
    on: true,
    setSize(w, h) {   // CSS の px × 描く倍率
      const pr = R.getPixelRatio(), W = Math.max(4, Math.round(w * pr)), H = Math.max(4, Math.round(h * pr));
      main.setSize(W, H); down.uniforms.uPx.value.set(K * 0.5 / W, K * 0.5 / H); A.setSize(Math.ceil(W / K), Math.ceil(H / K)); B.setSize(Math.ceil(W / K), Math.ceil(H / K));
    },
    render(scene, cam, focus) {
      if (!api.on) { R.setRenderTarget(null); R.render(scene, cam); return; }
      for (const u of [down.uniforms, comp.uniforms]) { u.uNear.value = cam.near; u.uFar.value = cam.far; u.uFocus.value = focus; }
      R.setRenderTarget(main); R.render(scene, cam);
      pass(down, A);
      blur.uniforms.tC.value = A.texture; blur.uniforms.uDir.value.set(1 / A.width, 0); pass(blur, B);
      blur.uniforms.tC.value = B.texture; blur.uniforms.uDir.value.set(0, 1 / B.height); pass(blur, A);
      pass(comp, null);
    },
  };
  return api;
}
