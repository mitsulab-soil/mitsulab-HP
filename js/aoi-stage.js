/* 物語の碧の段で、背景に碧（共通の aoi.vrm＝Qualia/omiya と同じ正式の碧）が立ち上がる（2026-11-21）。
   暗い舞台に光の粒が集まり → 全身が同時に、輪郭の揺らいだ状態から輪郭のはっきりした不透明な姿へ移る（2026-11-23 本人：下から順に出す形はやめた） → 段を過ぎると粒に戻って消える。
   進みはスクロールの位置から決め、時間でなめらかに追う（行き来しても途切れない）。PC は本文の右の余白、スマホは薄く右寄せ・粒を減らす。 */
import * as THREE from 'three';
const P = document.querySelector('#qStory [data-ly="5"]');
if (P) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, SP = () => innerWidth < 761;
  const cv = document.createElement('canvas'); cv.className = 'aoi-stage'; cv.setAttribute('aria-hidden', 'true'); const MOB = false; let slot = null; // 2026-11-23 本人：スマホも段のあいだへ移さず、画面の右側で文字の後ろに留める
  // 2026-11-21 本人「スマホで碧が本文の文字に重ならないように」：スマホは段のあいだに場所をあけ、その中に碧を置く（固定の重ねはしない）
  // 2026-11-22 本人「胡蝶の夢の章のあいだ、ずっと碧を出す・文字に重ねない」：スマホは各段の下に場所をあけ、いま読んでいる段の下へ碧を移す
  const SLOTS = []; if (MOB) { ['0', '2', '3', '5'].forEach(n => { const p = document.querySelector('#qStory [data-ly="' + n + '"]'); if (!p) return; const d = document.createElement('div'); d.className = 'aoi-slot' + (n === '5' ? '' : ' aoi-slot-s'); d.setAttribute('aria-hidden', 'true'); p.after(d); SLOTS.push(d); }); slot = SLOTS[SLOTS.length - 1]; slot.appendChild(cv); }
  function pick() { if (!MOB || !SLOTS.length) return; const H = innerHeight; let best = slot, bd = 1e9; SLOTS.forEach(d => { const r = d.getBoundingClientRect(); const dd = Math.abs((r.top + r.bottom) / 2 - H * .55); if (dd < bd) { bd = dd; best = d; } }); if (best !== slot) { slot = best; slot.appendChild(cv); if (typeof cap !== 'undefined' && cap) slot.appendChild(cap); W = 0; } }
  if (!MOB) { const st = document.querySelector('.sd-stick'); st ? st.after(cv) : document.body.appendChild(cv); }
  const R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' });
  R.setPixelRatio(Math.min(devicePixelRatio, SP() ? 2 : 1.75)); R.setClearColor(0, 0);
  const CLIP = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1);
  const S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, .1, 50); const camSet = () => { if (SP()) { cam.position.set(0, 1.05, 5.0); cam.lookAt(0, .92, 0); } else { cam.position.set(0, 1.0, 6.4); cam.lookAt(0, 1.32, 0); } }; camSet();
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
  // 2026-11-21 本人「もっと自然に」：背景の夕方の参道の色に合わせた光（上は青みの空・下は暗い土・正面やや左から柔らかい主光・後ろから細い縁の光）
  S.add(new THREE.HemisphereLight(0xb9cfd8, 0x1a1712, .6)); const kl = new THREE.DirectionalLight(0xf1ece2, .72); kl.position.set(-2.5, 4, 5); S.add(kl); const rim = new THREE.DirectionalLight(0x9fd4e2, .55); rim.position.set(2.5, 3, -4); S.add(rim);
  // 2026-11-21 本人「立っているだけでなく、何かを話し始めて」：章に合わせた短い語り（HP の言葉から・断定しない・音は鳴らさない）
  const EN = () => /^en/.test(document.documentElement.lang || '');
  const CH = [
    ['#qStory [data-ly="0"]', '同じ参道でも、見えている世界はひとつではありません。', 'On the same approach, there is more than one world to see.'],
    ['#qStory [data-ly="2"]', '見ること、聴くことの一部を、いまは計算も担っています。', 'Computation now takes on part of seeing and hearing.'],
    ['#qStory [data-ly="3"]', 'ミツバチの紫外、コウモリの超音波。ほかの受けとり方へ。', 'A honeybee’s ultraviolet, a bat’s ultrasound: into other ways of receiving.'],
    ['#qStory [data-ly="5"]', 'わたしは碧。mitsulab の道具の案内役です。', 'I am Aoi, the guide of mitsulab’s tools.'],
    ['#qStory [data-ly="6"]', '世界と世界のあわいに立って、受けとり方を移しかえます。', 'I stand between worlds and carry one way of receiving into another.'],
    ['#qStory [data-ly="7"]', 'いつもの景色に戻ると、少しだけ違って見えるかもしれません。', 'Back in the everyday landscape, it may look a little different.'],
    ['#qloop', '受けとることと、はたらきかけること。その二つがめぐる円です。', 'Receiving and acting upon: a circle where the two turn together.'],
    ['#top .tp-lab', '道具をひとつ、ひらいてみませんか。画面は入口です。', 'Would you open one of the tools? The screen is only a door.'],
    ['#top div.nx-b', '道具を、場所へ持っていきます。', 'We take the tools out to a place.'],
    ['#top .nx-uc', '研究も、道具も、アートも、使う場へめぐっていきます。', 'Research, tools and art all turn toward the places where they are used.'],
    ['#top .nx-fd', 'mitsulab の代表です。', 'This is the founder of mitsulab.']];
  const END = () => document.querySelector('#qStory [data-ly="7"]') || P; // 本文の広い章（ループ・道具）では文字を読む邪魔になるので、物語の段だけ
  const cap = document.createElement('p'); cap.className = 'aoi-cap'; cap.setAttribute('aria-live', 'off'); cv.after(cap); if (MOB) cap.classList.add('in');
  let chI = -1, sayAt = 0;
  function chapter() { if (MOB) return Math.max(0, SLOTS.indexOf(slot)); const H = innerHeight; let k = -1; const n = 6;
    for (let i = 0; i < n; i++) { const e = document.querySelector(CH[i][0]); if (e && e.getBoundingClientRect().top < H * .62) k = i; } return k; }
  function say(i) { chI = i; sayAt = performance.now(); if (i < 0) { cap.classList.remove('on'); return; } const t = CH[i][EN() ? 2 : 1]; cap.classList.remove('on');
    setTimeout(() => { if (chI !== i) return; cap.textContent = t; cap.classList.add('on');
      if (mot) { const d = Math.min(4.2, 1.2 + t.length * (EN() ? .045 : .11)); try { mot.speak({ text: t, dur: d, autoGesture: false, gesture: RM ? null : [{ t: .5, type: 'beat' }, { t: d * .55, type: 'iconic', shape: 'small-round' }] }); } catch (e) { } } }, 260); }
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
    // 2026-11-21 本人「実際の碧のデータで」：材質は碧の VRM のまま（顔と衣の色）、足もとから立ち上がるのは切断面で表す
    // 2026-11-23 本人：下から順に出すのをやめ、全身を同時に出す（切断面は使わない＝頭のない衣だけのこまを作らない）
    v.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; } });
    const N2 = n => v.humanoid.getNormalizedBoneNode(n); [['leftUpperArm', -.12, 0, -1.25], ['rightUpperArm', -.12, 0, 1.25]].forEach(([n, x, y, z]) => { const o = N2(n); if (o) o.rotation.set(x, y, z); });
    v.scene.rotation.y = 0; S.add(v.scene); aoi = v; v.update(0);
    try { const { AoiMotion } = await import('./aoi_motion.js?v=20261026-v61'); mot = new AoiMotion(v, { root: v.scene, reducedMotion: RM, wind: 0, faceViewer: false, startCalm: 0, posture: 'upright', uprightWeight: .9 }); } catch (e) { }
    try { if (R.compileAsync) await R.compileAsync(S, cam); } catch (e) { }
    // 2026-11-22 重さ：質感（テクスチャ）を先に GPU へ送り、見えない一こまを先に描いておく（最初に見えたこまで止まらない）
    // 質感を一枚ずつ空き時間に GPU へ送り、最後に見えない一こまを描く（一度に長く止めない）
    try { const tex = new Set(); S.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { for (const k in m) { const t = m[k]; if (t && t.isTexture) tex.add(t); } }); });
      const gap = () => new Promise(r => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 600 }) : setTimeout(r, 30)));
      for (const t of tex) { await gap(); if (cur > 0) break; R.initTexture(t); }
      // 材質ごとに一つずつ見えない一こまを描き、シェーダーの準備を小分けにする
      const meshes = []; S.traverse(o => { if (o.isMesh || o.isPoints || o.isLine) meshes.push(o); }); const vis0 = meshes.map(o => o.visible);
      const prep = () => { const w = Math.max(2, cv.clientWidth || 2), h = Math.max(2, cv.clientHeight || 2); R.setSize(w, h, false); W = w; H = h; cam.aspect = w / h; cam.updateProjectionMatrix(); };
      for (let i = 0; i < meshes.length; i++) { await gap(); if (cur > 0) break; prep(); const ur = U.uRise.value; U.uRise.value = 2.4; CLIP.constant = 2.4; meshes.forEach((o, j) => { o.visible = j === i && vis0[j]; }); R.render(S, cam); meshes.forEach((o, j) => { o.visible = vis0[j]; }); U.uRise.value = ur; CLIP.constant = ur; R.clear(); }
      meshes.forEach((o, j) => { o.visible = vis0[j]; });
      await gap();
      if (cur <= 0) { const w = Math.max(2, cv.clientWidth || 2), h = Math.max(2, cv.clientHeight || 2); R.setSize(w, h, false); W = w; H = h; cam.aspect = w / h; cam.updateProjectionMatrix(); const ur = U.uRise.value, ua = U.uA.value; U.uRise.value = 2.4; U.uA.value = .85; CLIP.constant = 2.4; if (aoi) aoi.update(0); R.render(S, cam); U.uRise.value = ur; U.uA.value = ua; CLIP.constant = ur; R.clear(); } } catch (e) { }
    kick(); } catch (e) { console.warn('aoi stage', e); } }
  // 進み：段が画面の下から入ると上がり、上へ抜けると下がる
  function target() { pick(); const r = (document.querySelector('#qStory') || P).getBoundingClientRect(), H = innerHeight; if (!document.getElementById('top').classList.contains('active')) return 0;
    const e = (MOB ? (SLOTS[SLOTS.length - 1] || END()) : END()).getBoundingClientRect(); const up = (H * .95 - r.top) / (H * .4), down = (e.bottom + H * -.02) / (H * .45); return Math.max(0, Math.min(1, up, down)); }
  let cur = 0, raf = 0, last = 0, W = 0, H = 0, visT = 0, visOK = true;
  // 2026-11-23 本人：碧の頭の上にマイクの印。押すと音（TOP の環境音）のオン／オフ。初めはオフ
  const mic = document.createElement('button'); mic.type = 'button'; mic.className = 'aoi-mic'; mic.setAttribute('aria-pressed', 'false');
  const micL = () => { const on = mic.getAttribute('aria-pressed') === 'true'; mic.setAttribute('aria-label', EN() ? (on ? 'Sound on — turn off' : 'Sound off — turn on') : (on ? '音はオン（押すとオフ）' : '音はオフ（押すとオン）')); };
  mic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21"/><path class="mic-x" d="M4.5 4.5l15 15"/></svg>';
  document.body.appendChild(mic); micL();
  mic.addEventListener('click', () => { const b = document.querySelector('#sdHero .sd-snd'); if (b) b.click(); const on = b ? b.getAttribute('aria-pressed') === 'true' : mic.getAttribute('aria-pressed') !== 'true'; mic.setAttribute('aria-pressed', on ? 'true' : 'false'); micL(); });
  new MutationObserver(micL).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  const HV = new THREE.Vector3(); let mx = -1, my = -1;
  function micPlace(k) { const hb = aoi && aoi.humanoid && aoi.humanoid.getNormalizedBoneNode('head'); if (!hb || k < .5 || cv.style.opacity === '0') { mic.classList.remove('on'); return; }
    hb.getWorldPosition(HV); HV.y += .3; HV.project(cam); const r = cv.getBoundingClientRect(); const x = r.left + (HV.x + 1) / 2 * r.width, y = r.top + (1 - HV.y) / 2 * r.height - 26;
    mx = mx < 0 ? x : mx + (x - mx) * .25; my = my < 0 ? y : my + (y - my) * .25; mic.style.transform = 'translate(' + (mx - 22).toFixed(1) + 'px,' + (my - 22).toFixed(1) + 'px)'; mic.classList.add('on'); }
  // 2026-11-22 重さ：祖先ごと見えていない間（不透明度 0・非表示）は描かない。見えたら 1 こま目から描く
  function shown(now) { if (now - visT > 120) { visT = now; let e = cv.parentElement, ok = true; while (e && e.nodeType === 1) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .01) { ok = false; break; } e = e.parentElement; } visOK = ok; } return visOK; }
  function size() { camSet(); const w = cv.clientWidth, h = cv.clientHeight; if (w && h && (w !== W || h !== H)) { W = w; H = h; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } }
  function frame(now) { raf = 0; const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; const tg = target(); if (tg > 0 && !aoi) load();
    cur = RM ? tg : cur + (tg - cur) * Math.min(1, dt * 4); if (Math.abs(tg - cur) < .002) cur = tg;
    U.uT.value += dt; const k = cur;
    const gather = Math.min(1, k / .45), rise = Math.max(0, Math.min(1, (k - .3) / .65));
    pm.uniforms.uG.value = RM ? 1 : gather; pm.uniforms.uA.value = RM ? 0 : Math.min(1, k * 3) * (1 - rise * .75);
    pil.material.uniforms.uA.value = (RM ? 0 : Math.min(1, k * 2.2) * .7 * (1 - rise)) * (k > 0 ? 1 : 0); ring.material.uniforms.uA.value = Math.min(1, k * 2) * (1 - rise * .8);
    U.uRise.value = RM ? (k > .01 ? 2.4 : -1) : -0.02 + rise * 2.0; CLIP.constant = U.uRise.value; U.uA.value = (RM ? Math.min(1, k * 2) : Math.min(1, rise * 2.5)) * .85;
    // 全身が同時に現れる：輪郭が揺らぐ（ぼけ・ゆれ）→ 輪郭がはっきりする。最後は不透明・ぼけなし
    { let f = RM ? 1 : Math.min(1, rise * 1.25); f = f * f * (3 - 2 * f); const wob = (1 - f);
      cv.style.opacity = k > 0 ? '1' : '0';
      cv.style.filter = f >= .999 ? 'none' : 'blur(' + (wob * (6 + 1.5 * Math.sin(U.uT.value * 7))).toFixed(2) + 'px) brightness(' + (.22 + .78 * f).toFixed(3) + ')';
      if (aoi) { aoi.scene.visible = f > .001; const t = U.uT.value; aoi.scene.scale.set(1 + wob * .025 * Math.sin(t * 9.3), 1, 1 + wob * .02 * Math.cos(t * 7.1)); aoi.scene.position.x = wob * .02 * Math.sin(t * 5.7); } }
    { const c = k > .5 ? chapter() : -1;
      if (c < 0) { if (chI >= 0) say(-1); }
      else if (c < chI) say(c); else if (MOB && c !== chI) say(c);
      else if (c > chI && (chI < 0 || performance.now() - sayAt > 2600)) say(MOB ? c : chI + 1); }
    if (k > 0 && shown(now)) { size(); if (aoi) { try { mot ? mot.update(dt, cam) : aoi.update(dt); } catch (e) { } } R.render(S, cam); }
    micPlace(k);
    if (k > 0 || tg > 0) raf = requestAnimationFrame(frame); else last = 0; }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  addEventListener('scroll', kick, { passive: true }); addEventListener('resize', () => { W = 0; kick(); }); kick();
  // 2026-11-22 重さ：碧の読み込みと影の準備を、スクロールの前の空き時間に済ませる（スクロール中の止まりを減らす）
  const idle = window.requestIdleCallback || (f => setTimeout(f, 1500)); const pre = () => idle(() => { if (!aoi) load(); }, { timeout: 5000 });
  if (document.readyState === 'complete') pre(); else addEventListener('load', pre, { once: true });
}
