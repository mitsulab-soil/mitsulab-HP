// sho3d.js — 書を 3D の空間に「動的に」置く部品（Qualia/sho の層の下ごしらえ）
// © mitsulab. All rights reserved.  書は上原光瑛の作品。
// v1 2026-10-22
//
// 入力は prep_sho.py（_dev/sho3d/）が作る小さな地図 PNG：
//   R＝墨の形  G＝厚み（墨の中心ほど厚い）  B＝筆の向き（0〜π）
// 出すもの：
//   ・墨の彫刻（表と裏の二枚の起伏。縁が細く中心がふくらむ。濡れた墨のつや）
//   ・粒（筆の向きに沿ってほどけ、漂い、また集まる）
//   ・音（書ごとの型。ほどける速さに合わせて粒の音が鳴り、集まりきると一打。Web Audio の合成だけ＝録音の素材を使わない）
//   ・音に反応して揺れる（sho.setLevel(0..1)）
// three.js は呼ぶ側から渡す（import の場所をアプリに合わせるため）。
//
//   import { loadShoMap, createSho, createShoSound } from './sho3d.js';
//   const map = await loadShoMap('data/027.png');
//   const sho = createSho(THREE, map, { width: 2.4, auto: true });
//   scene.add(sho.group);
//   const snd = createShoSound('water');           // 最初の操作のあとで snd.start()
//   // 毎こま： sho.update(dt, t); snd.update(sho.state, dt); sho.setLevel(snd.level);
//   // 近づいたらほどく： sho.target = 1（離れたら 0）。auto:true なら自分で息をするように繰り返す

/* ───────── 地図の読み込み ───────── */
export async function loadShoMap(url) {
  const img = new Image(); img.decoding = 'async'; img.crossOrigin = 'anonymous';
  await new Promise((ok, ng) => { img.onload = ok; img.onerror = () => ng(new Error('sho3d: 読めない ' + url)); img.src = url; });   // decode() は隠れたタブで待たされるので onload
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const src = cx.getImageData(0, 0, w, h).data;
  // 下から上へ並べかえ（three の uv は左下が原点）。A に「ほどける順」を入れる
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = h - 1 - y;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, j = (sy * w + x) * 4;
      data[i] = src[j]; data[i + 1] = src[j + 1]; data[i + 2] = src[j + 2];
      data[i + 3] = Math.round(255 * orderAt(x / w, y / h));
    }
  }
  return { w, h, data, url };
}

// ほどける順（0＝最初にほどける）。筆が入った左上から、払いの右下へ。ゆるい揺らぎを足す
function orderAt(u, v) {
  const sweep = 0.62 * u + 0.38 * (1 - v);
  const n = 0.5 + 0.25 * Math.sin(u * 9.1 + v * 3.7) * Math.cos(v * 7.3 - u * 2.1) + 0.25 * Math.sin(u * 23.0 + v * 19.0);
  return Math.min(1, Math.max(0, 0.7 * sweep + 0.3 * n));
}

/* ───────── 墨の彫刻と粒 ───────── */
export function createSho(THREE, map, opts = {}) {
  const mobile = opts.mobile ?? matchMedia('(max-width:700px), (pointer:coarse)').matches;
  const width = opts.width ?? 2.4;
  const height = width * map.h / map.w;
  const thick = opts.thickness ?? width * 0.09;
  const N = opts.particles ?? (mobile ? 6000 : 20000);
  const seg = opts.segments ?? (mobile ? 110 : 190);
  const ink = new THREE.Color(opts.ink ?? 0x07090c);
  const glow = new THREE.Color(opts.glow ?? 0xdfeef2);
  const tint = new THREE.Color(opts.tint ?? 0x5cc8e0);
  // 粒の見え方：'light'＝暗い場で光る粒（加算）／'ink'＝明るい場で墨の粒（ふつうの重ね）
  const pMode = opts.particleMode ?? 'light';
  const pCol = new THREE.Color(opts.particleColor ?? (pMode === 'ink' ? 0x0b0d10 : 0xdfeef2));

  const tex = new THREE.DataTexture(map.data, map.w, map.h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true;

  const group = new THREE.Group(); group.name = 'sho';
  const U = {
    uMap: { value: tex }, uTexel: { value: new THREE.Vector2(1 / map.w, 1 / map.h) },
    uThick: { value: thick }, uU: { value: 0 }, uTime: { value: 0 }, uLevel: { value: 0 },
    uInk: { value: ink }, uGlow: { value: glow }, uTint: { value: tint },
    uLight: { value: new THREE.Vector3(-0.45, 0.65, 0.62).normalize() },
    uSize: { value: (opts.particleSize ?? 0.009) * width / 2.4 }, uScale: { value: 600 },
    uEdge: { value: opts.edgeGlow ?? 0.85 },   // ほどける縁の光（明るい場では弱く）
  };

  // 起伏（表＝side +1、裏＝side −1）
  const relGeo = new THREE.PlaneGeometry(width, height, seg, Math.max(8, Math.round(seg * height / width)));
  const relief = side => new THREE.ShaderMaterial({
    uniforms: { ...U, uSide: { value: side } },
    side: side > 0 ? THREE.FrontSide : THREE.BackSide,
    vertexShader: /* glsl */`
      uniform sampler2D uMap; uniform float uThick, uSide, uTime, uLevel, uU;
      varying vec2 vUv; varying vec3 vView; varying float vG; varying vec3 vNX, vNY, vNZ;
      void main(){
        vUv = uv; vNX = normalMatrix * vec3(1.,0.,0.); vNY = normalMatrix * vec3(0.,1.,0.); vNZ = normalMatrix * vec3(0.,0.,1.); vec4 m = texture2D(uMap, uv); vG = m.g;
        vec3 p = position;
        float sway = sin(p.x * 5.0 + uTime * 7.0) * sin(p.y * 4.0 - uTime * 5.0);
        p.z = uSide * m.g * uThick * 0.5 + uLevel * 0.02 * sway * m.r;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap; uniform vec2 uTexel; uniform float uThick, uSide, uU;
      uniform vec3 uInk, uGlow, uTint, uLight; uniform float uEdge;
      varying vec2 vUv; varying vec3 vView; varying float vG; varying vec3 vNX, vNY, vNZ;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
      void main(){
        vec4 m = texture2D(uMap, vUv);
        if (m.r < 0.5) discard;
        // ほどける：順（A）とこまかな揺らぎで、縁から欠けていく
        float o = m.a * 0.72 + (vn(vUv * 38.0) * 0.7 + vn(vUv * 150.0) * 0.3) * 0.28;
        float cut = uU * 1.25 - 0.1;
        if (o < cut) discard;
        float edge = 1.0 - smoothstep(0.0, 0.035, o - cut);
        // 厚みの傾きから法線（モデルの空間）
        float gx = texture2D(uMap, vUv + vec2(uTexel.x * 2., 0.)).g - texture2D(uMap, vUv - vec2(uTexel.x * 2., 0.)).g;
        float gy = texture2D(uMap, vUv + vec2(0., uTexel.y * 2.)).g - texture2D(uMap, vUv - vec2(0., uTexel.y * 2.)).g;
        vec3 n = normalize(vec3(-gx * 3.2, -gy * 3.2, 1.0) * vec3(1.0, 1.0, uSide));
        n = normalize(vNX * n.x + vNY * n.y + vNZ * n.z);
        vec3 l = normalize((viewMatrix * vec4(uLight, 0.0)).xyz);
        vec3 v = normalize(vView);
        float dif = max(dot(n, l), 0.0);
        float spe = pow(max(dot(n, normalize(l + v)), 0.0), 70.0);
        float fre = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 c = uInk * (0.45 + 0.8 * dif) + vec3(0.8, 0.86, 0.92) * spe * (0.18 + 0.3 * vG) + uTint * fre * 0.16;
        c = mix(c, uGlow, edge * step(0.001, uU) * uEdge);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const front = new THREE.Mesh(relGeo, relief(1)), back = new THREE.Mesh(relGeo, relief(-1));
  front.renderOrder = back.renderOrder = 1;
  group.add(front, back);

  // 粒：墨の上に置き、筆の向きに沿ってほどける
  const home = new Float32Array(N * 3), dir = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  const D = map.data; let k = 0, guard = 0;
  while (k < N && guard++ < N * 60) {
    const x = Math.random() * map.w | 0, y = Math.random() * map.h | 0, i = (y * map.w + x) * 4;
    if (D[i] < 128) continue;
    const g = D[i + 1] / 255, a = D[i + 2] / 255 * Math.PI, ord = D[i + 3] / 255;
    const px = ((x + Math.random()) / map.w - 0.5) * width, py = ((y + Math.random()) / map.h - 0.5) * height;
    home.set([px, py, (Math.random() * 2 - 1) * g * thick * 0.5], k * 3);
    const s = Math.random() < 0.5 ? -1 : 1;
    dir.set([Math.cos(a) * s, Math.sin(a) * s, (Math.random() - 0.5) * 0.6], k * 3);
    seed.set([ord, Math.random(), Math.random(), 0.4 + Math.random() * 0.9], k * 4);
    k++;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(home, 3));
  pGeo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  pGeo.setDrawRange(0, k);
  const spread = opts.spread ?? width * 0.32;
  const pMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uSpread: { value: spread }, uPCol: { value: pCol }, uInkMode: { value: pMode === 'ink' ? 1 : 0 } },
    transparent: true, depthWrite: false, blending: pMode === 'ink' ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uU, uTime, uLevel, uSize, uScale, uSpread;
      attribute vec3 aDir; attribute vec4 aSeed;
      varying float vA;
      void main(){
        float o = aSeed.x * 0.75 + aSeed.y * 0.25;
        float p = smoothstep(o * 0.8 - 0.05, o * 0.8 + 0.35, uU);
        float t = uTime * (0.25 + aSeed.z * 0.35);
        vec3 swirl = vec3(sin(t + aSeed.y * 6.28 + position.y * 3.0), cos(t * 0.9 + aSeed.z * 6.28 + position.x * 3.0), sin(t * 0.7 + aSeed.w * 4.0));
        vec3 pos = position + aDir * p * uSpread * (0.25 + 1.1 * aSeed.y * aSeed.y) + swirl * p * p * uSpread * 0.16 + vec3(0.0, p * p * uSpread * 0.18, 0.0);
        pos += normalize(vec3(aDir.y, -aDir.x, 0.4)) * sin(uTime * 9.0 + position.x * 11.0 + aSeed.y * 6.0) * uLevel * 0.025;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aSeed.w * uScale / -mv.z * (1.0 + p * 0.6 + uLevel * 0.6);
        vA = mix(0.2, 0.95, p) * (0.55 + 0.45 * aSeed.z);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uPCol, uTint; uniform float uInkMode; varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = dot(c, c);
        if (d > 0.25) discard;
        float a = smoothstep(0.25, 0.0, d) * vA;
        gl_FragColor = vec4(mix(uPCol, uTint, 0.18 * (1.0 - uInkMode)), a * (1.0 + uInkMode * 0.4));
      }`,
  });
  const points = new THREE.Points(pGeo, pMat); points.renderOrder = 2; points.frustumCulled = false;
  group.add(points);

  // 動き：target に向かってばねで寄る。auto なら「保つ→ほどく→漂う→集まる」を繰り返す
  const st = { u: 0, du: 0, gathered: true, ph: Math.random() * 10 };
  const cyc = opts.cycle ?? [3.2, 2.6, 2.4, 2.8];
  const api = {
    group, front, back, points, width, height,
    target: opts.u ?? 0, auto: !!opts.auto, level: 0,
    get state() { return st; },
    setLevel(v) { api.level = v; },
    setScale(pxPerUnitAtOne) { U.uScale.value = pxPerUnitAtOne; },
    update(dt, t) {
      dt = Math.min(dt, 0.1);
      if (api.auto) {
        const T = cyc.reduce((a, b) => a + b, 0), x = (t + st.ph) % T;
        api.target = x < cyc[0] ? 0 : x < cyc[0] + cyc[1] + cyc[2] ? 1 : 0;
      }
      const w = 2.2, a = w * w * (api.target - st.u) - 2 * w * st.du;   // 臨界減衰のばね
      st.du += a * dt; st.u = Math.min(1.02, Math.max(0, st.u + st.du * dt));
      U.uU.value = st.u; U.uTime.value = t;
      U.uLevel.value += (api.level - U.uLevel.value) * Math.min(1, dt * 12);
    },
    dispose() { relGeo.dispose(); pGeo.dispose(); front.material.dispose(); back.material.dispose(); pMat.dispose(); tex.dispose(); },
  };
  return api;
}

/* ───────── 音（Web Audio の合成だけ） ─────────
   型：water（木の中の水と養分）・dew（クモの巣の水滴）・void（宇宙の虚空間）・bloom（花の産声）・oto（音）
   update(state, dt) に sho.state を渡すと、ほどける速さ |du| に合わせて粒の音を重ね、集まりきったところで一打。 */
let SHARED = null;
export function createShoSound(preset = 'oto', opts = {}) {
  let ctx = null, out = null, an = null, bedG = null, buf = null, on = false, acc = 0, wasOpen = false;
  const vol = opts.volume ?? 0.5;
  const r = (a, b) => a + Math.random() * (b - a);
  const api = {
    preset, level: 0,
    get running() { return on; },
    async start() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; ctx = opts.context || (SHARED ||= new AC());   // 書が幾つあっても一つの AudioContext
        out = ctx.createGain(); out.gain.value = 0;
        an = ctx.createAnalyser(); an.fftSize = 512; buf = new Float32Array(an.fftSize);
        out.connect(an); an.connect(opts.destination || ctx.destination);
        bedG = ctx.createGain(); bedG.gain.value = 0; bedG.connect(out);
        bed(ctx, bedG, preset);
      }
      if (ctx.state !== 'running') await ctx.resume();
      out.gain.setTargetAtTime(vol, ctx.currentTime, 0.4); on = true;
    },
    stop() { if (!ctx) return; out.gain.setTargetAtTime(0, ctx.currentTime, 0.2); on = false; },
    toggle() { return on ? (api.stop(), false) : (api.start(), true); },
    gain(v) { if (ctx && on) out.gain.setTargetAtTime(vol * v, ctx.currentTime, 0.25); },   // 遠い書は小さく
    update(s, dt) {
      if (!ctx || !on) { api.level *= 0.9; return; }
      const now = ctx.currentTime;
      bedG.gain.setTargetAtTime(0.25 + 0.75 * Math.min(1, s.u), now, 0.3);
      const speed = Math.abs(s.du);
      acc += dt * (0.4 + speed * 26 + s.u * 2.5);
      let n = 0;
      while (acc > 1 && n++ < 6) { acc -= 1; grain(ctx, out, preset, now + Math.random() * 0.05, Math.min(1, 0.3 + speed)); }
      if (s.u > 0.5) wasOpen = true;
      if (wasOpen && s.u < 0.03 && Math.abs(s.du) < 0.08) { wasOpen = false; strike(ctx, out, preset, now + 0.02); }
      an.getFloatTimeDomainData(buf); let e = 0; for (let i = 0; i < buf.length; i++) e += buf[i] * buf[i];
      api.level = Math.min(1, Math.sqrt(e / buf.length) * 7);
    },
  };
  return api;

  function noiseBuf(c) { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); let br = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; br = (br + 0.02 * w) / 1.02; d[i] = preset === 'dew' ? w * 0.5 : br * 3.5; } return b; }
  function bed(c, dst, p) {
    const src = c.createBufferSource(); src.buffer = noiseBuf(c); src.loop = true;
    const f = c.createBiquadFilter(); const g = c.createGain();
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.13; lfo.connect(lg); lg.connect(f.frequency);
    if (p === 'water') { f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.9; lg.gain.value = 160; g.gain.value = 0.5; }
    else if (p === 'dew') { f.type = 'highpass'; f.frequency.value = 2600; lg.gain.value = 600; g.gain.value = 0.05; }
    else if (p === 'void') { f.type = 'lowpass'; f.frequency.value = 180; lg.gain.value = 60; g.gain.value = 0.7; }
    else if (p === 'bloom') { f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.7; lg.gain.value = 400; g.gain.value = 0.18; }
    else { f.type = 'lowpass'; f.frequency.value = 700; lg.gain.value = 200; g.gain.value = 0.18; }
    src.connect(f); f.connect(g); g.connect(dst); src.start(); lfo.start();
    const drone = { void: [55, 55.6, 82.4], oto: [98, 146.8, 196], water: [65.4], bloom: [261.6, 392], dew: [] }[p] || [];
    drone.forEach((hz, i) => { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = hz; og.gain.value = (p === 'void' ? 0.09 : 0.035) / (1 + i * 0.6); o.connect(og); og.connect(dst); o.start(); });
  }
  function voice(c, dst, t, type, f0, f1, att, dec, peak, pan) {
    const o = c.createOscillator(), g = c.createGain(), sp = c.createStereoPanner ? c.createStereoPanner() : null;
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + att + dec * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
    o.connect(g); if (sp) { sp.pan.value = pan; g.connect(sp); sp.connect(dst); } else g.connect(dst);
    o.start(t); o.stop(t + att + dec + 0.05);
  }
  function grain(c, dst, p, t, k) {
    const pan = r(-0.7, 0.7);
    if (p === 'water') { const f = r(280, 900); voice(c, dst, t, 'sine', f, f * r(1.5, 2.2), 0.004, r(0.06, 0.14), 0.12 * k, pan); }
    else if (p === 'dew') { const f = r(1700, 3400); voice(c, dst, t, 'sine', f, 0, 0.002, r(0.35, 0.9), 0.07 * k, pan); voice(c, dst, t, 'sine', f * 2.76, 0, 0.002, 0.2, 0.02 * k, pan); }
    else if (p === 'void') { const f = [110, 146.8, 164.8, 220, 293.7][Math.random() * 5 | 0]; voice(c, dst, t, 'sine', f, 0, r(0.25, 0.5), r(1.2, 2.2), 0.05 * k, pan); }
    else if (p === 'bloom') { const f = r(380, 620); voice(c, dst, t, 'triangle', f, f * r(1.8, 2.6), 0.01, r(0.08, 0.18), 0.06 * k, pan); }
    else { Math.random() < 0.5 ? voice(c, dst, t, 'sine', r(500, 1400), 0, 0.003, r(0.3, 0.7), 0.06 * k, pan) : voice(c, dst, t, 'sine', r(300, 700), r(600, 1300), 0.004, 0.1, 0.08 * k, pan); }
  }
  function strike(c, dst, p, t) {
    const set = { water: [[120, 0.5, 0.3], [240, 0.25, 0.08]], dew: [[2093, 1.6, 0.06], [2637, 1.4, 0.05], [3136, 1.2, 0.04]], void: [[41, 2.8, 0.35], [82, 2.0, 0.1]], bloom: [[523, 1.4, 0.1], [784, 1.1, 0.06], [1047, 0.9, 0.04]], oto: [[220, 3.2, 0.14], [594, 2.4, 0.07], [1122, 1.6, 0.04]] }[p];
    // 10-24 本人「もっと音を伸ばして」：Qualia/sho と同じ長さに（短い型でも 5 秒・長い型は約 2.2 倍。長く鳴るぶん初めの大きさは少し下げる）
    set.forEach(([f, d, a]) => { const L = Math.max(5, d * 2.2); voice(c, dst, t, 'sine', f, 0, 0.006, L, a * Math.pow(d / L, 0.25), 0); });
  }
}
