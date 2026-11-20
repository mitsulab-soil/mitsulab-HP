/* 物語の碧の段で、背景に碧（共通の aoi.vrm）が立ち上がる（2026-11-21）。
   暗い舞台に光の粒が集まり → 光の柱と走査線の幕の中で、足もとから順に姿が立ち上がる → 段を過ぎると粒に戻って消える。
   進みはスクロールの位置から決め、時間でなめらかに追う（行き来しても途切れない）。PC は本文の右の余白、スマホは薄く右寄せ・粒を減らす。 */
import * as THREE from 'three';
const P = document.querySelector('#qStory [data-ly="5"]');
if (P) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, SP = () => innerWidth < 761;
  const cv = document.createElement('canvas'); cv.className = 'aoi-stage'; cv.setAttribute('aria-hidden', 'true'); { const st = document.querySelector('.sd-stick'); st ? st.after(cv) : document.body.appendChild(cv); }
  const R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: !SP(), powerPreference: 'low-power' });
  R.setPixelRatio(Math.min(devicePixelRatio, SP() ? 1.25 : 1.75)); R.setClearColor(0, 0);
  const S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, .1, 50); cam.position.set(0, 1.0, 6.6); cam.lookAt(0, .9, 0);
  const U = { uRise: { value: -1 }, uA: { value: 0 }, uT: { value: 0 } };
  // 光の柱（上下に薄れる）と床の輪
  const pil = new THREE.Mesh(new THREE.CylinderGeometry(.26, .3, 3.2, 48, 1, true), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uT: U.uT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uA; uniform float uT; varying vec2 vU; void main(){ float v = vU.y; float a = smoothstep(0., .12, v) * pow(1. - v, 1.6); float sc = .75 + .25 * sin(v * 160. - uT * 3.); float st = .6 + .4 * sin(vU.x * 6.283 * 9. + uT * .4); vec3 oC = vec3(.45, .9, 1.) * a * sc * st * uA * .45; gl_FragColor = vec4(oC, clamp(max(oC.r, max(oC.g, oC.b)), 0., 1.)); }' }));
  pil.position.y = 1.6; S.add(pil);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.22, .3, 64), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; void main(){ vec3 oC = vec3(.5, .95, 1.) * .5 * uA; gl_FragColor = vec4(oC, clamp(max(oC.r, max(oC.g, oC.b)), 0., 1.)); }' }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .005; S.add(ring);
  // 光の粒：散った位置 ⇄ 体の上の位置
  const N = SP() ? 160 : 420, a0 = new Float32Array(N * 3), a1 = new Float32Array(N * 3), ar = new Float32Array(N);
  for (let i = 0; i < N; i++) { const q = Math.random() * 6.283, r = 1 + Math.random() * 1.6, h = Math.random() * 3.2 - .4; a0.set([Math.cos(q) * r, h, Math.sin(q) * r * .6], i * 3);
    const y = Math.random() * 1.62, w = .05 + .17 * Math.sin(Math.min(1, y / 1.62) * 3.0) * (y > 1.3 ? .6 : 1), q2 = Math.random() * 6.283; a1.set([Math.cos(q2) * w, y, Math.sin(q2) * w * .6], i * 3); ar[i] = Math.random(); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(a0, 3)); pg.setAttribute('aT', new THREE.BufferAttribute(a1, 3)); pg.setAttribute('aR', new THREE.BufferAttribute(ar, 1));
  const pm = new THREE.ShaderMaterial({ uniforms: { uG: { value: 0 }, uA: { value: 0 }, uT: U.uT, uPx: { value: R.getPixelRatio() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'uniform float uG; uniform float uT; uniform float uPx; attribute vec3 aT; attribute float aR; varying float vR; void main(){ float g = clamp(uG * 1.25 - aR * .25, 0., 1.); g = g * g * (3. - 2. * g); vec3 p = mix(position, aT, g); float s = (1. - g) * 1.4 + .2; p.x += sin(uT * .7 + aR * 40.) * .05 * s; p.y += cos(uT * .5 + aR * 30.) * .05 * s; vR = aR; vec4 mv = modelViewMatrix * vec4(p,1.); gl_PointSize = (1.5 + aR * 2.5) * uPx * (6. / -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uA; uniform float uT; varying float vR; void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; float f = smoothstep(.5, 0., r); float tw = .6 + .4 * sin(uT * 2. + vR * 50.); vec3 oC = vec3(.7, .97, 1.) * f * f * tw * uA; gl_FragColor = vec4(oC, clamp(max(oC.r, max(oC.g, oC.b)), 0., 1.)); }' });
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; S.add(pts);
  S.add(new THREE.HemisphereLight(0xcfe9f0, 0x0a1218, .8)); const kl = new THREE.DirectionalLight(0xe6f6ff, 1.2); kl.position.set(-3, 5, 6); S.add(kl);
  let aoi = null, mot = null, loading = false;
  async function load() { if (loading) return; loading = true; try {
    const [V, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('@pixiv/three-vrm'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
    const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder); L.register(p => new V.VRMLoaderPlugin(p));
    const buf = await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })));
    const g = await L.parseAsync(buf.slice(0), ''); const v = g.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(g.scene); V.VRMUtils.rotateVRM0(v);
    const holo = () => { const m = new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
        sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.)).xyz;');
        sh.fragmentShader = 'uniform float uRise; uniform float uA; uniform float uT; varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <dithering_fragment>',
          'if (vWp.y > uRise) discard; float fr = 1. - abs(dot(normalize(normal), normalize(vViewPosition))); float sc = .78 + .22 * sin(vWp.y * 260. - uT * 4.); float edge = smoothstep(.06, 0., uRise - vWp.y);' +
          'vec3 c = vec3(.5, .95, 1.) * (pow(fr, 2.2) * 1.3 + .12) * sc + vec3(.9, 1., 1.) * pow(fr, 8.) * .6 + vec3(.8, 1., 1.) * edge * 1.4; vec3 oC = c * uA; gl_FragColor = vec4(oC, clamp(max(oC.r, max(oC.g, oC.b)), 0., 1.));'); };
      return m; };
    v.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.material = Array.isArray(o.material) ? o.material.map(holo) : holo(); } });
    const N2 = n => v.humanoid.getNormalizedBoneNode(n); [['leftUpperArm', -.12, 0, -1.25], ['rightUpperArm', -.12, 0, 1.25]].forEach(([n, x, y, z]) => { const o = N2(n); if (o) o.rotation.set(x, y, z); });
    v.scene.rotation.y = 0; S.add(v.scene); aoi = v; v.update(0);
    try { const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61'); mot = new AoiMotion(v, { root: v.scene, reducedMotion: RM, wind: 0, faceViewer: false, startCalm: 0, posture: 'upright', uprightWeight: .9 }); } catch (e) { }
    kick(); } catch (e) { console.warn('aoi stage', e); } }
  // 進み：段が画面の下から入ると上がり、上へ抜けると下がる
  function target() { const r = P.getBoundingClientRect(), H = innerHeight; if (!document.getElementById('top').classList.contains('active')) return 0;
    const up = (H * .95 - r.top) / (H * .4), down = (r.bottom + H * .55) / (H * .45); return Math.max(0, Math.min(1, up, down)); }
  let cur = 0, raf = 0, last = 0, W = 0, H = 0;
  function size() { const w = cv.clientWidth, h = cv.clientHeight; if (w && h && (w !== W || h !== H)) { W = w; H = h; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } }
  function frame(now) { raf = 0; const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; const tg = target(); if (tg > 0 && !aoi) load();
    cur = RM ? tg : cur + (tg - cur) * Math.min(1, dt * 1.6); if (Math.abs(tg - cur) < .002) cur = tg;
    U.uT.value += dt; const k = cur;
    const gather = Math.min(1, k / .45), rise = Math.max(0, Math.min(1, (k - .3) / .65));
    pm.uniforms.uG.value = RM ? 1 : gather; pm.uniforms.uA.value = RM ? 0 : Math.min(1, k * 3) * (1 - rise * .75);
    pil.material.uniforms.uA.value = (RM ? .3 : Math.min(1, k * 2.2) * (.45 + .4 * (1 - rise))) * (k > 0 ? 1 : 0); ring.material.uniforms.uA.value = Math.min(1, k * 2);
    U.uRise.value = RM ? (k > .01 ? 2 : -1) : -0.02 + rise * 1.75; U.uA.value = (RM ? Math.min(1, k * 2) : Math.min(1, rise * 2.5)) * .85;
    cv.style.opacity = k > 0 ? '1' : '0';
    if (k > 0) { size(); if (aoi) { try { mot ? mot.update(dt, cam) : aoi.update(dt); } catch (e) { } } R.render(S, cam); }
    if (k > 0 || tg > 0) raf = requestAnimationFrame(frame); else last = 0; }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', kick, { passive: true }); addEventListener('resize', () => { W = 0; kick(); }); kick();
}
