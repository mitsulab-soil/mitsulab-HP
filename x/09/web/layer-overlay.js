/* Qualia/walk 氷川 — 層が重なる見た目と、碧が層を語る・Ghost が降りる（2026-10-19 夜・Claude Code）
   本人「多層的な情報がオーバーレイされる未来的なイメージ」「依代の碧というインターフェイスを通して、語る」「依代碧に、Ghostが降りるニュアンス」。
   - 記録（place-perspectives の 48 件）を、その地点から立ち上がる細い光の線と、奥行きの違う高さに浮かぶ半透明の札で重ねる。
     高さは層ごと（自然 低／歴史 中／暮らしと文化 高）。近いものは濃く、遠いものは淡く。一度に開く札は 5 枚まで（Qualia Layer の文法）。
   - 自然：地中の根の模式の線（透けて見える）と、生き物の気配の粒。歴史：足もとに時代の目盛りの線。暮らしと文化：地点の光の柱。
     どれも模式。根・水・生息・年代の測定ではない。
   - 碧が立ち止まった人のそばで、いちばん近い記録を文字で語る。語る層が強く光り、ほかの層は退く。碧から札へ細い光の糸。
   - Ghost：その場に重なってきた時間や記憶が碧に宿る比喩。上空から光の粒が静かに降り、碧の輪郭に沿って重なり、目と衣に淡い光が宿って消える。
     初めて歩き出すときと、層を深く開く節目にだけ。信仰の存在をそのまま描くものではない（10-10 の決定）。
   - Unity のエフェクトは作り方の参考だけ（加算の光・粒子・走査線・ディゾルブ・わずかな色ずれ・遠くの淡さ）。全画面の後処理は使わない（描画の場を増やさない）。
   - 動きを減らす設定では、粒は動かさず、Ghost は短い光の輪だけ。スマホは数を減らし、こまが落ちたら段階的に減らす。 */
(() => {
  const QS = new URLSearchParams(location.search);
  if (QS.get('overlay') === 'off') { window.__layerOverlay = { status: () => ({ disabled: true }) }; return; }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const LITE = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  const LAYER_STYLE = {
    nature: { name: '自然', h: 2.0, color: [0.56, 0.92, 0.74], css: '#8eeabd' },
    history: { name: '歴史', h: 2.85, color: [0.98, 0.80, 0.52], css: '#f8cc85' },
    culture: { name: '暮らしと文化', h: 3.7, color: [0.72, 0.84, 1.0], css: '#b8d6ff' }
  };
  const MAX_CARDS = 5;
  const st = { ready: false, cards: 0, focus: null, told: 0, ghosts: 0, tier: LITE ? 1 : 2, frameMs: 0, errors: [], lastLine: '' };
  let T, C, root, sheets = [], cardPool = [], lines, lineGeo, motes, roots, rootGeo, eraLines, eraGeo, thread, threadGeo, glowTex, ghost = null;
  let lastPick = 0, nearList = [], startedOnce = false, stillSince = 0, lastCam = null, focus = null, focusUntil = 0, toldIds = new Set(), seenLayers = new Set();
  let lastT = 0, slow = 0, fast = 0;
  const v1 = () => new T.Vector3();

  function layerOf(r) {
    const L = window.__qualium?.layers || [];
    for (const l of L) if (l.ids.includes(r.category)) return l.id;
    for (const l of L) if (r.categories?.some(c => l.ids.includes(c))) return l.id;
    return 'culture';
  }
  function layerOn(id) { const on = window.__qualium?.layerOn; return on ? !!on[id] : true; }
  function markOf(r) { return r.meaning || (r.category === 'fiction' ? '創作' : r.status === 'interpretation' ? 'mitsulabの見方' : '資料の記載'); }

  function makeGlowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }

  /* 札：走査線・縁の淡い光・わずかな色ずれ・ディゾルブで現れる。文字は明朝。 */
  const CARD_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const CARD_FS = `uniform sampler2D map; uniform float uOpacity, uTime, uReveal, uFocus; uniform vec3 uColor; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv; float edge = max(abs(uv.x - .5) * 2.0, abs(uv.y - .5) * 2.0);
      float ca = .0018 * (.4 + edge);
      vec4 base = texture2D(map, uv); float r = texture2D(map, uv + vec2(ca, 0.0)).r, b = texture2D(map, uv - vec2(ca, 0.0)).b;
      vec3 col = vec3(r, base.g, b);
      float scan = .9 + .1 * sin(uv.y * 220.0 + uTime * 3.0);
      float frame = smoothstep(.93, .985, edge) * (1.0 - smoothstep(.985, 1.0, edge));
      float diss = h(floor(uv * vec2(64.0, 20.0)));
      if (diss > uReveal) discard;
      float a = base.a * scan + frame * .55;
      vec3 c = mix(col, uColor, frame * .8) * (1.0 + .35 * uFocus);
      gl_FragColor = vec4(c, clamp(a, 0.0, 1.0) * uOpacity);
      #include <colorspace_fragment>
    }`;

  function drawCard(slot, r, layer) {
    const g = slot.ctx, W = 512, H = 176, s = LAYER_STYLE[layer];
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(4,22,26,.62)'; g.fillRect(6, 6, W - 12, H - 12);
    g.fillStyle = s.css; g.fillRect(6, 6, 5, H - 12);
    g.font = '500 22px "Hiragino Sans","Noto Sans JP",sans-serif'; g.fillStyle = s.css; g.fillText(s.name + '　' + markOf(r), 26, 40);
    g.font = '600 38px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif'; g.fillStyle = '#eef6f1';
    const title = String(r.title || '').replace(/^(mitsulabの見方|創作)[：:]/, ''); g.fillText(title.length > 13 ? title.slice(0, 12) + '…' : title, 26, 94, W - 50);
    g.font = '20px "Hiragino Sans","Noto Sans JP",sans-serif'; g.fillStyle = '#b9d2c8';
    const src = (r.sourceInfo || []).map(x => x.publisher).filter(Boolean)[0] || (r.category === 'fiction' ? 'mitsulab の創作' : 'mitsulab');
    g.font = '24px "Hiragino Sans","Noto Sans JP",sans-serif'; g.fillText((slot.ahead ? 'この周辺の記録　' : '') + src.slice(0, 16), 26, 140, W - 50);
    slot.tex.needsUpdate = true;
  }

  function makeCard() {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 176;
    const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 2;
    const mat = new T.ShaderMaterial({ uniforms: { map: { value: tex }, uOpacity: { value: 0 }, uTime: { value: 0 }, uReveal: { value: 0 }, uFocus: { value: 0 }, uColor: { value: new T.Color() } },
      vertexShader: CARD_VS, fragmentShader: CARD_FS, transparent: true, depthWrite: false, depthTest: true, side: T.DoubleSide, toneMapped: false });
    const mesh = new T.Mesh(new T.PlaneGeometry(2.0, .69), mat); mesh.renderOrder = 6; mesh.visible = false; mesh.frustumCulled = false;
    const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glow.scale.set(.55, .55, 1); glow.renderOrder = 5; glow.visible = false;
    const pillar = new T.Mesh(new T.CylinderGeometry(.014, .014, 1, 6, 1, true), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      uniforms: { uC: { value: new T.Color() }, uA: { value: 0 }, uT: { value: 0 } }, vertexShader: 'varying float vY; void main(){ vY = position.y + .5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uC; uniform float uA, uT; varying float vY; void main(){ float p = .55 + .45 * smoothstep(.0, .2, fract(vY * 1.6 - uT * .35)); gl_FragColor = vec4(uC * p, uA * (1.0 - .65 * vY)); }' }));
    pillar.renderOrder = 5; pillar.visible = false; pillar.frustumCulled = false;
    root.add(mesh, glow, pillar);
    return { mesh, glow, pillar, mat, tex, ctx: canvas.getContext('2d'), id: null, layer: null, reveal: 0, target: 0, base: v1(), top: v1() };
  }

  function init() {
    C = window.__core; T = C.THREE; root = new T.Group(); root.name = 'qualia-layer-overlay'; C.scene.add(root);
    glowTex = makeGlowTexture();
    for (let i = 0; i < MAX_CARDS; i++) cardPool.push(makeCard());
    // 地点から立ち上がる光の線（頂点ごとの色）
    lineGeo = new T.BufferGeometry(); lineGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(MAX_CARDS * 2 * 3), 3)); lineGeo.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(MAX_CARDS * 2 * 3), 3));
    lines = new T.LineSegments(lineGeo, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    lines.frustumCulled = false; lines.renderOrder = 5; lines.visible = false;   /* 光の柱（pillar）に置きかえた */
    // 碧から語る札への糸
    threadGeo = new T.BufferGeometry(); threadGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(17 * 3), 3));
    thread = new T.Line(threadGeo, new T.LineBasicMaterial({ color: 0xd8fff0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    thread.frustumCulled = false; thread.renderOrder = 7; root.add(thread);
    // 生き物の気配の粒（自然）
    const nM = st.tier >= 2 ? 140 : 70, mp = new Float32Array(nM * 3), ms = new Float32Array(nM);
    for (let i = 0; i < nM; i++) { mp[3 * i] = (Math.random() - .5) * 26; mp[3 * i + 1] = .3 + Math.random() * 3.2; mp[3 * i + 2] = (Math.random() - .5) * 26; ms[i] = Math.random() * 6.28; }
    const mg = new T.BufferGeometry(); mg.setAttribute('position', new T.Float32BufferAttribute(mp, 3)); mg.userData.seed = ms;
    motes = new T.Points(mg, new T.PointsMaterial({ map: glowTex, color: 0xbff2c4, size: .09, sizeAttenuation: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    motes.frustumCulled = false; motes.renderOrder = 4; root.add(motes);
    // 地中の根の模式（透けて見える。depthTest を切り、淡く）
    rootGeo = new T.BufferGeometry(); rootGeo.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(3 * 2 * 3 * 14), 3));
    roots = new T.LineSegments(rootGeo, new T.LineBasicMaterial({ color: 0xb6f0bd, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    roots.frustumCulled = false; roots.renderOrder = 3; root.add(roots);
    // 足もとの時代の目盛り（歴史）
    eraGeo = new T.PlaneGeometry(1, 1); eraGeo.rotateX(-Math.PI / 2);
    eraLines = new T.InstancedMesh(eraGeo, new T.MeshBasicMaterial({ color: 0xf2c37c, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }), 104); eraLines.count = 0;
    eraLines.frustumCulled = false; eraLines.renderOrder = 3; root.add(eraLines);
    // 層の面：奥行きの違う高さに浮かぶ、ごく淡い情報の面（同心の目盛りと走査の弧）。見る人の上を覆う
    sheets = Object.entries(LAYER_STYLE).map(([id, s]) => { const m = new T.Mesh(new T.RingGeometry(3.5, 16, 64, 1), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false,
      uniforms: { uC: { value: new T.Color().setRGB(...s.color) }, uA: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uC; uniform float uA, uT; varying vec2 vP; void main(){ float r = length(vP), a = atan(vP.y, vP.x); float fall = smoothstep(3.5, 6.0, r) * (1.0 - smoothstep(9.0, 16.0, r)); float ring = 1.0 - smoothstep(.0, .05, abs(fract(r / 1.5) - .5) - .45); float rad = 1.0 - smoothstep(.0, .012, abs(fract(a * 3.8197) - .5) - .488); float sweep = pow(max(0.0, cos(a - uT * .35)), 24.0); gl_FragColor = vec4(uC, uA * fall * (.25 + .6 * ring + .35 * rad + .9 * sweep)); }' }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 2; m.frustumCulled = false; m.userData.layer = id; root.add(m); return m; });
    // 碧の語りの文字（字幕の上の一行。いまの字幕と重ならないときだけ）
    const cap = document.createElement('div'); cap.id = 'layerAoiLine'; cap.setAttribute('role', 'status'); cap.hidden = true;
    const chips = document.createElement('div'); chips.id = 'layerNowChips'; chips.setAttribute('aria-label', 'いま重なっている層');
    chips.innerHTML = Object.entries(LAYER_STYLE).map(([id, s]) => `<span data-chip="${id}" style="--c:${s.css}">${s.name}</span>`).join('') + '<em>線と粒は模式</em>';
    document.body.append(cap, chips);
    const css = document.createElement('style'); css.dataset.source = 'layer-overlay';
    css.textContent = `#layerAoiLine{box-sizing:border-box;position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 96px);width:min(560px,calc(100vw - 32px));z-index:6;padding:10px 14px 11px;background:linear-gradient(180deg,#06191dd9,#071b1ff0);border:1px solid #6fb4a466;border-left:3px solid var(--c,#8eeabd);color:#e7f3ee;font:400 14px/1.75 "Hiragino Mincho ProN","Yu Mincho",serif;letter-spacing:.04em;pointer-events:none;box-shadow:0 0 22px #4fd6b322}
#layerAoiLine b{display:block;font:500 11px/1.6 "Hiragino Sans",sans-serif;color:var(--c,#8eeabd);letter-spacing:.12em}#layerAoiLine small{display:block;font:11px/1.6 "Hiragino Sans",sans-serif;color:#a9c4ba;margin-top:2px}
#layerNowChips{position:fixed;left:max(10px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 60px);z-index:5;display:flex;gap:6px;pointer-events:none}
#layerNowChips span{font:500 11px/1 "Hiragino Sans",sans-serif;letter-spacing:.1em;color:#d9ece5;padding:6px 8px;border:1px solid color-mix(in srgb,var(--c) 55%,transparent);background:#05181c99;opacity:.82;transition:opacity .5s,box-shadow .5s}
#layerNowChips em{font:10px/1 "Hiragino Sans",sans-serif;font-style:normal;color:#a7c0b7;align-self:center;opacity:.8}#layerNowChips span.off{opacity:.25;text-decoration:line-through}#layerNowChips span.focus{opacity:1;box-shadow:0 0 12px color-mix(in srgb,var(--c) 70%,transparent)}
body.layerTalk #sub{visibility:hidden}body.layerTalk #layerNowChips{opacity:0}body.ovOn #layerNowChips,body.ovOn #layerAoiLine,body:has(#menu:not([hidden])) #layerNowChips{display:none}
@media(max-width:520px){#layerAoiLine{bottom:calc(env(safe-area-inset-bottom,0px) + 84px);font-size:13.5px}}
@media(prefers-reduced-motion:reduce){#layerNowChips span{transition:none}}`;
    document.head.append(css);
    st.ready = true;
  }

  function pickRecords(talk) {
    const api = window.__placePerspectives; if (!api?.status().ready) return [];
    const states = window.__qualium?.states; if (!states) return [];
    return api.near(talk.d, talk, states, MAX_CARDS).filter(r => layerOn(layerOf(r)));
  }
  function anchorOf(r, i, talk) {
    const p = r.place || {}; let d = null;
    if (p.dRange) d = (p.dRange[0] + p.dRange[1]) / 2;
    if (d == null) { const s = talk.SEGX?.(p.segmentIds?.[0]); d = s?.at?.d ?? (Number.isFinite(s?.d0) ? (s.d0 + s.d1) / 2 : talk.d); }
    const dir = talk.dir || 1;   /* 記録はこの周辺（65 m 以内）のもの。見える所に並べるため、近い記録はその地点、離れた記録は行く手に置く */
    let ahead = false; if (!(Number.isFinite(d) && Math.abs(d - talk.d) < 10)) { d = talk.d + dir * (7 + i * 5.5); ahead = true; }
    const side = (i % 2 ? 1 : -1) * (2.7 + (i >> 1) * .6), w = talk.toWorld(d, side), gy = C.groundY(w.x, w.z);
    return { x: w.x, z: w.z, y: Number.isFinite(gy) ? gy : C.camera.position.y - 1.6, ahead };
  }

  function refresh(talk, now) {
    nearList = pickRecords(talk);
    const ids = new Set(nearList.map(r => r.id));
    for (const slot of cardPool) if (slot.id && !ids.has(slot.id)) { slot.target = 0; }
    nearList.forEach((r, i) => {
      let slot = cardPool.find(s => s.id === r.id);
      if (!slot) slot = cardPool.find(s => !s.id || (s.target === 0 && s.reveal < .02));
      if (!slot) return;
      const layer = layerOf(r);
      if (slot.id !== r.id) { slot.id = r.id; slot.layer = layer; slot.rec = r; slot.reveal = 0; drawCard(slot, r, layer); slot.mat.uniforms.uColor.value.setRGB(...LAYER_STYLE[layer].color); }
      slot.target = 1; const a = anchorOf(r, i, talk); if (slot.ahead !== a.ahead) { slot.ahead = a.ahead; drawCard(slot, r, layer); } slot.base.set(a.x, a.y + .02, a.z); slot.top.set(a.x, a.y + LAYER_STYLE[layer].h, a.z);
    });
    st.cards = cardPool.filter(s => s.target > 0).length;
  }

  /* 碧が語る：立ち止まって 2.5 秒、碧がほかの話をしていないとき、まだ語っていない近い記録を一つ */
  function narrate(talk, now) {
    const cap = document.getElementById('layerAoiLine'), sub = document.getElementById('sub');
    const busy = !!talk.speaking;
    if (focus && (now > focusUntil || !layerOn(focus.layer) || now - stillSince < 300 || !nearList.some(x => x.id === focus.id))) { focus = null; cap.hidden = true; document.body.classList.remove('layerTalk'); }
    if (focus || busy || now - stillSince < 2500) return;
    const r = nearList.find(x => !toldIds.has(x.id)); if (!r) return;
    toldIds.add(r.id); const layer = layerOf(r); focus = { id: r.id, layer }; focusUntil = now + 9000; st.told++;
    const s = LAYER_STYLE[layer]; cap.style.setProperty('--c', s.css);
    cap.innerHTML = ''; const b = document.createElement('b'); b.textContent = '碧　' + s.name + 'の層から'; const p = document.createElement('span'); p.textContent = r.text;
    const sm = document.createElement('small'); sm.textContent = markOf(r) + (r.sourceInfo?.[0]?.publisher ? '・' + r.sourceInfo[0].publisher : '');
    cap.append(b, p, sm); cap.hidden = false; st.lastLine = r.id; document.body.classList.add('layerTalk');
    const sr = sub?.getBoundingClientRect(); if (sr && sr.width > 40) { cap.style.left = sr.left + 'px'; cap.style.width = sr.width + 'px'; cap.style.transform = 'none'; cap.style.bottom = (innerHeight - sr.bottom) + 'px'; }
    if (!seenLayers.has(layer)) { seenLayers.add(layer); if (seenLayers.size > 1) startGhost(now, 'deep'); }
  }

  /* Ghost が降りる：上空から光の粒、碧の骨格に沿って重なり、目と衣に淡い光、消える */
  function boneWorld(vrm, name, out) { const h = vrm?.humanoid; const n = h?.getRawBoneNode?.(name) || h?.getNormalizedBoneNode?.(name); if (!n) return null; return n.getWorldPosition(out); }
  const SEGS = [['head', 'neck'], ['neck', 'chest'], ['chest', 'hips'], ['leftUpperArm', 'leftLowerArm'], ['leftLowerArm', 'leftHand'], ['rightUpperArm', 'rightLowerArm'], ['rightLowerArm', 'rightHand'], ['hips', 'leftUpperLeg'], ['leftUpperLeg', 'leftLowerLeg'], ['leftLowerLeg', 'leftFoot'], ['hips', 'rightUpperLeg'], ['rightUpperLeg', 'rightLowerLeg'], ['rightLowerLeg', 'rightFoot']];
  function startGhost(now, why) {
    const A = window.__aoi; if (!A?.aoi?.visible || ghost) return;
    const n = 0;   /* 2026-10-20 本人「氷川の碧のパーティクルを解除してください」：碧のまわりの光の粒は出さない。残すのは胸元の淡い光と、淡い光の柱だけ */
    const pos = new Float32Array(Math.max(n, 1) * 3), info = [];
    for (let i = 0; i < n; i++) info.push({ seg: SEGS[i % SEGS.length], t: Math.random(), jr: .05 + Math.random() * .16, ja: Math.random() * 6.28, jy: (Math.random() - .5) * .08, h0: 5.5 + Math.random() * 4, r0: Math.random() * 1.3, a0: Math.random() * 6.28, delay: Math.random() * .7 });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    const pts = new T.Points(g, new T.PointsMaterial({ map: glowTex, color: 0xd9fff3, size: .07, sizeAttenuation: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    pts.frustumCulled = false; pts.renderOrder = 8;
    // 体積のある光：上から碧へ落ちる淡い円錐（縦のグラデーションと揺らぎ）
    const cone = new T.Mesh(new T.CylinderGeometry(.18, 1.05, 9, 24, 1, true), new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false,
      uniforms: { uA: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uA,uT; varying vec2 vUv; void main(){ float v = vUv.y; float a = smoothstep(0.0,.25,v) * (1.0 - smoothstep(.75,1.0,v)); float s = .75 + .25 * sin(vUv.x * 37.7 + uT * .8) * sin(vUv.x * 13.1 - uT * .5); gl_FragColor = vec4(vec3(.72,1.0,.92) * s, a * uA * .09); }' }));
    cone.renderOrder = 7; cone.frustumCulled = false;
    const ring = new T.Mesh(new T.PlaneGeometry(1.6, 1.6), new T.MeshBasicMaterial({ map: glowTex, color: 0xbff7e6, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.renderOrder = 7;
    const eyes = [0, 1].map(() => { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xcff9ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })); s.scale.set(.05, .05, 1); s.renderOrder = 9; return s; });
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0x9ff0d8, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.scale.set(1.1, 2.1, 1); halo.renderOrder = 6;
    root.add(cone, halo);   /* 粒（pts）・足もとの光の輪・目の光は加えない（2026-10-20：目の光が髪の後ろから透けて見えたため外した。残すのは胸元の淡い光と光の柱） */
    ghost = { t0: now, why, pts, info, cone, ring, eyes, halo, n }; st.ghosts++;
  }
  const tmpA = { a: null, b: null };
  /* 2026-10-20：Ghost が降りるあいだ、狭い画面では碧の全身が画面に入るよう、視線を少しずつ寄せる（指で見回しているときは寄せない） */
  let userDrag = false; addEventListener('pointerdown', () => { userDrag = true; }, true); addEventListener('pointerup', () => { userDrag = false; }, true); addEventListener('pointercancel', () => { userDrag = false; }, true);
  function frameAoi(t, dt) {
    const A = window.__aoi, FR = window.__talk?.FR, cam = C.camera; if (!A?.aoi?.visible || !FR || FR.yaw == null || userDrag || t > 3.8 || innerWidth >= 760 || ghost?.why !== 'first' || window.__freezeEye || document.querySelector('.fieldVisionRead.fvVisible')) return;   /* 歩き出すときの一度だけ。読む画面を開いているときは動かさない */
    const vrm = A.vrm, base = A.aoi.getWorldPosition(new T.Vector3()), head = boneWorld(vrm, 'head', new T.Vector3()) || base.clone().add(new T.Vector3(0, 1.5, 0));
    const mid = base.clone().lerp(head, .5).project(cam), feet = base.clone().project(cam), top = head.clone().add(new T.Vector3(0, .14, 0)).project(cam);
    if (mid.z > 1) return; const k = Math.min(1, dt * 2.2), tx = Math.sign(mid.x || 1) * .32;
    if (Math.abs(mid.x) > .4) FR.yaw -= (mid.x - tx) * .55 * k;
    if (feet.y < -.9 && top.y < .9) FR.pitch = Math.max(-.85, FR.pitch - .35 * k); else if (top.y > .92 && feet.y > -.8) FR.pitch = Math.min(.3, FR.pitch + .25 * k);
    st.framed = (st.framed || 0) + 1;
  }
  function updateGhost(now, dt = .016) {
    if (!ghost) return; frameAoi((now - ghost.t0) / 1000, dt); const A = window.__aoi, vrm = A?.vrm, t = (now - ghost.t0) / 1000, D = reduced.matches ? 1.6 : 4.2;
    if (!A?.aoi || t > D) { for (const o of [ghost.pts, ghost.cone, ghost.ring, ghost.halo, ...ghost.eyes]) { root.remove(o); o.geometry?.dispose(); o.material.dispose(); } ghost = null; return; }
    ghost.ring.visible = false; ghost.pts.visible = false;
    const base = A.aoi.getWorldPosition(new T.Vector3()), env = Math.min(1, t / .5) * (1 - Math.max(0, (t - (D - 1)) / 1));
    ghost.cone.position.set(base.x, base.y + 4.9, base.z); ghost.cone.material.uniforms.uA.value = reduced.matches ? 0 : env * (t < 2.4 ? 1 : .5); ghost.cone.material.uniforms.uT.value = t;
    ghost.ring.position.set(base.x, base.y + .03, base.z); ghost.ring.material.opacity = .16 * env; const rs = reduced.matches ? 1 : .6 + .5 * Math.min(1, t / 2.2); ghost.ring.scale.set(rs, rs, rs);
    const chest = boneWorld(vrm, 'chest', new T.Vector3()) || base.clone().add(new T.Vector3(0, 1.15, 0));
    ghost.halo.position.copy(chest); ghost.halo.position.y -= .25; ghost.halo.material.opacity = .3 * env * Math.min(1, Math.max(0, (t - 1.2) / .8));
    const head = boneWorld(vrm, 'head', new T.Vector3()); const le = boneWorld(vrm, 'leftEye', new T.Vector3()), re = boneWorld(vrm, 'rightEye', new T.Vector3());
    const eyeA = Math.max(0, Math.min(1, (t - 1.7) / .4)) * Math.max(0, 1 - Math.max(0, t - 3.4) / .8);
    if (head) { const fwd = new T.Vector3(0, 0, 1).applyQuaternion(A.aoi.getWorldQuaternion(new T.Quaternion())), rt = new T.Vector3(1, 0, 0).applyQuaternion(A.aoi.getWorldQuaternion(new T.Quaternion()));
      const eyesP = [le || head.clone().addScaledVector(rt, .032).add(new T.Vector3(0, .055, 0)).addScaledVector(fwd, .08), re || head.clone().addScaledVector(rt, -.032).add(new T.Vector3(0, .055, 0)).addScaledVector(fwd, .08)];
      ghost.eyes.forEach((s, i) => { s.position.copy(eyesP[i]).addScaledVector(fwd, .012); s.material.opacity = eyeA; s.scale.setScalar(LITE ? .075 : .055); }); }
    if (!ghost.n) return;
    const P = ghost.pts.geometry.attributes.position, a = new T.Vector3(), b = new T.Vector3(), q = new T.Vector3(); const cache = {};
    const bw = name => cache[name] ?? (cache[name] = boneWorld(vrm, name, new T.Vector3()));
    for (let i = 0; i < ghost.n; i++) {
      const f = ghost.info[i], A0 = bw(f.seg[0]), B0 = bw(f.seg[1]);
      if (A0 && B0) q.lerpVectors(A0, B0, f.t); else q.copy(base).add(new T.Vector3(0, .2 + f.t * 1.4, 0));
      q.x += Math.cos(f.ja) * f.jr; q.z += Math.sin(f.ja) * f.jr; q.y += f.jy;
      const u = Math.max(0, Math.min(1, (t - f.delay) / 1.7)), e = 1 - Math.pow(1 - u, 3);   /* 降りる（減速） */
      const sx = base.x + Math.cos(f.a0) * f.r0, sz = base.z + Math.sin(f.a0) * f.r0, sy = base.y + f.h0;
      const sw = Math.sin(t * 1.3 + f.a0) * .02 * (u >= 1 ? 1 : 0);
      P.setXYZ(i, sx + (q.x - sx) * e + sw, sy + (q.y - sy) * e, sz + (q.z - sz) * e);
    }
    P.needsUpdate = true; ghost.pts.material.opacity = .9 * env; ghost.pts.material.size = (LITE ? .075 : .055) + .03 * Math.max(0, 1 - t / 2);
  }

  function updateLines(now, camera) {
    const P = lineGeo.attributes.position, Cc = lineGeo.attributes.color; let k = 0;
    for (const slot of cardPool) {
      if (slot.target > 0 || slot.reveal > .02) {
        const f = slot.focusMix ?? 1, a = slot.reveal * slot.fade * f, c = LAYER_STYLE[slot.layer].color;
        P.setXYZ(k, slot.base.x, slot.base.y, slot.base.z); Cc.setXYZ(k++, c[0] * a, c[1] * a, c[2] * a);
        P.setXYZ(k, slot.top.x, slot.top.y - .3, slot.top.z); Cc.setXYZ(k++, c[0] * a * .35, c[1] * a * .35, c[2] * a * .35);
      }
    }
    lineGeo.setDrawRange(0, k); P.needsUpdate = true; Cc.needsUpdate = true;
  }

  function updateNature(now, dt, camera, on) {
    const target = on ? (focus && focus.layer !== 'nature' ? .25 : .75) : 0;
    motes.material.opacity += (target - motes.material.opacity) * Math.min(1, dt * 2);
    motes.visible = motes.material.opacity > .01 && st.tier >= 1;
    if (motes.visible) {
      motes.position.set(camera.position.x, C.groundY(camera.position.x, camera.position.z) ?? camera.position.y - 1.6, camera.position.z);
      if (!reduced.matches) { const P = motes.geometry.attributes.position, sd = motes.geometry.userData.seed;
        for (let i = 0; i < P.count; i++) { const s = sd[i]; P.setY(i, .3 + ((P.getY(i) - .3 + dt * (.05 + .04 * Math.sin(s))) % 3.4)); P.setX(i, P.getX(i) + Math.sin(now * .0003 + s) * dt * .08); }
        P.needsUpdate = true; }
    }
    // 根の模式：近い木 3 本の足もとから、地中へ枝分かれする線
    const rt = on && st.tier >= 1 ? (focus && focus.layer !== 'nature' ? .14 : .5) : 0;
    roots.material.opacity += (rt - roots.material.opacity) * Math.min(1, dt * 2); roots.visible = roots.material.opacity > .01;
    if (roots.visible && now - (roots.userData.at || 0) > 700) {
      roots.userData.at = now; const cp = camera.position, trees = (C.D.trees || []).map(t => ({ t, d: Math.hypot(t.p[0] - cp.x, t.p[2] - cp.z) })).filter(x => x.d < 22).sort((a, b) => a.d - b.d).slice(0, 3);
      const P = rootGeo.attributes.position; let k = 0;
      for (const { t } of trees) { const gy = C.groundY(t.p[0], t.p[2]) ?? t.p[1]; const seed = Math.abs(Math.sin(t.p[0] * 12.9 + t.p[2] * 7.3));
        for (let j = 0; j < 7; j++) { const a = (j / 7) * 6.283 + seed * 3, L = 1.4 + 1.6 * ((seed * (j + 3)) % 1), mx = t.p[0] + Math.cos(a) * L * .55, mz = t.p[2] + Math.sin(a) * L * .55, ex = t.p[0] + Math.cos(a + .25) * L, ez = t.p[2] + Math.sin(a + .25) * L;
          P.setXYZ(k++, t.p[0], gy - .15, t.p[2]); P.setXYZ(k++, mx, gy - .45, mz); P.setXYZ(k++, mx, gy - .45, mz); P.setXYZ(k++, ex, gy - .7 - .3 * (j % 2), ez); } }
      rootGeo.setDrawRange(0, k); P.needsUpdate = true;
    }
  }

  const eraM = { m: null, q: null, s: null, p: null };
  function updateHistory(now, dt, talk, on) {
    const target = on ? (focus && focus.layer !== 'history' ? .14 : .5) : 0;
    eraLines.material.opacity += (target - eraLines.material.opacity) * Math.min(1, dt * 2); eraLines.visible = eraLines.material.opacity > .01;
    if (!eraLines.visible || now - (eraLines.userData.at || 0) < 200) return; eraLines.userData.at = now;
    eraM.m ??= new T.Matrix4(); eraM.q ??= new T.Quaternion(); eraM.s ??= new T.Vector3(); eraM.p ??= new T.Vector3();
    const Y = new T.Vector3(0, 1, 0); let k = 0; const d0 = talk.d, sh = reduced.matches ? 0 : (now * .0015) % 4;
    const put = (d, s, len, wid) => { const a = talk.toWorld(d, s), b = talk.toWorld(d + .5, s), y = C.groundY(a.x, a.z); if (!Number.isFinite(y) || k >= 104) return;
      eraM.q.setFromAxisAngle(Y, Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2); eraM.p.set(a.x, y + .035, a.z); eraM.s.set(len, 1, wid); eraM.m.compose(eraM.p, eraM.q, eraM.s); eraLines.setMatrixAt(k++, eraM.m); };
    for (const side of [-1, 1]) for (let i = 0; i < 36; i++) put(d0 - 36 + i * 2 + sh, side * 2.35, 1.2, .035);   /* 時代の目盛りの線（模式） */
    for (let i = 0; i < 16; i++) { const dd = Math.round((d0 - 30) / 5) * 5 + i * 5; put(dd, -2.0, .05, .7); }
    eraLines.count = k; eraLines.instanceMatrix.needsUpdate = true;
  }

  function updateCards(now, dt, camera) {
    const cp = camera.position; let shown = 0;
    for (const slot of cardPool) {
      if (!slot.id) continue;
      const dist = Math.hypot(slot.top.x - cp.x, slot.top.z - cp.z);
      slot.fade = Math.max(.18, Math.min(1, 1.25 - dist / 42));   /* 近いほど濃く、遠いほど淡く */
      const focusMix = focus ? (focus.layer === slot.layer ? 1 : .3) : 1; slot.focusMix = focusMix;
      const goal = slot.target * (layerOn(slot.layer) ? 1 : 0);
      slot.reveal += (goal - slot.reveal) * Math.min(1, dt * (reduced.matches ? 6 : 2.2));
      const vis = slot.reveal > .02 && dist < 70; slot.mesh.visible = vis; slot.glow.visible = vis;
      if (!vis) { slot.pillar.visible = false; if (goal === 0 && slot.reveal <= .02) slot.id = null; continue; }
      shown++;
      slot.mesh.position.copy(slot.top); slot.mesh.position.y += reduced.matches ? 0 : Math.sin(now * .0011 + slot.top.x) * .04;
      slot.mesh.rotation.set(0, Math.atan2(cp.x - slot.top.x, cp.z - slot.top.z), 0);
      const s = (.8 + Math.min(1.4, dist / 18) * .6) * (LITE ? 1.2 : 1); slot.mesh.scale.setScalar(s);
      const u = slot.mat.uniforms; u.uTime.value = now / 1000; u.uReveal.value = Math.min(1, slot.reveal * 1.15); u.uOpacity.value = slot.fade * focusMix * Math.min(1, slot.reveal * 1.4) * (focus?.id === slot.id ? 1.15 : 1);
      u.uFocus.value += ((focus?.id === slot.id ? 1 : 0) - u.uFocus.value) * Math.min(1, dt * 3);
      { const pl = slot.pillar, hgt = slot.mesh.position.y - .3 * slot.mesh.scale.y - slot.base.y; pl.visible = hgt > .2 && !slot.ahead;   /* 離れた記録は地面に柱を立てない（その場所の記録と読ませない） */ pl.position.set(slot.base.x, slot.base.y + hgt / 2, slot.base.z); pl.scale.set(1, Math.max(.2, hgt), 1);
        pl.material.uniforms.uC.value.setRGB(...LAYER_STYLE[slot.layer].color); pl.material.uniforms.uA.value = .9 * slot.fade * focusMix * slot.reveal; pl.material.uniforms.uT.value = reduced.matches ? 0 : now / 1000; }
      slot.glow.position.copy(slot.base); slot.glow.position.y += .05; slot.glow.material.color.setRGB(...LAYER_STYLE[slot.layer].color); slot.glow.material.opacity = slot.ahead ? 0 : .55 * slot.fade * focusMix * slot.reveal;
    }
    st.cards = shown;
  }

  function updateThread(now, dt) {
    const slot = focus && cardPool.find(s => s.id === focus.id && s.mesh.visible), A = window.__aoi;
    let near = slot && Math.hypot(slot.top.x - C.camera.position.x, slot.top.z - C.camera.position.z) < 18;
    if (near) { const q = slot.mesh.position.clone().project(C.camera); near = Math.abs(q.x) < .92 && Math.abs(q.y) < .92 && q.z < 1; }   /* 札が画面の中にあるときだけ糸を出す */
    const goal = near && A?.aoi?.visible ? .32 : 0; thread.material.opacity += (goal - thread.material.opacity) * Math.min(1, dt * 3); thread.visible = thread.material.opacity > .01;
    if (!thread.visible || !slot) return;
    const hand = boneWorld(A.vrm, 'rightHand', new T.Vector3()) || A.aoi.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 1.1, 0));
    const end = slot.mesh.position.clone(); end.y -= .32 * slot.mesh.scale.y; const P = threadGeo.attributes.position;
    for (let i = 0; i <= 16; i++) { const t = i / 16, x = hand.x + (end.x - hand.x) * t, z = hand.z + (end.z - hand.z) * t, y = hand.y + (end.y - hand.y) * t + Math.sin(t * Math.PI) * .45; P.setXYZ(i, x, y, z); }
    P.needsUpdate = true; thread.material.color.setRGB(...LAYER_STYLE[focus.layer].color);
  }

  /* 2026-10-20：操作のヒント（#howto）と層の札（#layerNowChips）を、字幕（碧の語りを含む）の上に置く。重ならないように */
  let placeAt = 0;
  function placeAboveSub() {
    const now = performance.now(); if (now - placeAt < 300) return; placeAt = now;
    const sub = document.getElementById('sub'), cap = document.getElementById('layerAoiLine'); let top = innerHeight;
    for (const el of [sub, cap]) { if (!el || el.hidden || getComputedStyle(el).display === 'none') continue; const r = el.getBoundingClientRect(); if (r.height > 4) top = Math.min(top, r.top); }
    const chips = document.getElementById('layerNowChips'); let ctop = top;
    if (chips && !chips.hidden) { const b = Math.round(innerHeight - top + 8); chips.style.bottom = b + 'px'; ctop = top - 8 - chips.getBoundingClientRect().height; }
    const how = document.getElementById('howto');
    if (how && !how.hidden) { const hr = how.getBoundingClientRect(), limit = ctop - 8; if (hr.bottom > limit) { how.style.bottom = Math.round(innerHeight - limit) + 'px'; how.style.top = 'auto'; } }
  }
  function updateChips() {
    const box = document.getElementById('layerNowChips'); if (!box) return;
    for (const el of box.children) { const id = el.dataset.chip; el.classList.toggle('off', !layerOn(id)); el.classList.toggle('focus', focus?.layer === id); }
  }

  window.__layerOverlayFrame = (scene, camera) => {
    try {
      const talk = window.__talk, core = window.__core;
      if (!core?.THREE || !talk || !window.__qualium) return;
      const started = !!document.getElementById('start')?.hidden && talk.mode === 'sim' && !document.body.classList.contains('ovOn') && !!window.__entryFirstFrameAt;
      if (!st.ready) { if (!started) return; init(); }
      const now = performance.now(), dt = lastT ? Math.min(.1, (now - lastT) / 1000) : .016; lastT = now;
      // こまの速さで段階を落とす（2 秒続けて 22 ms を超えたら一段下げる）
      if (dt > .022) { slow += dt; fast = 0; } else { fast += dt; slow = Math.max(0, slow - dt * .5); }
      if (slow > 2 && st.tier > 0) { st.tier--; slow = 0; if (st.tier === 0) { motes.visible = false; roots.visible = false; } }
      st.frameMs = Math.round(dt * 1000);
      root.visible = started && !document.hidden;
      const chips = document.getElementById('layerNowChips'); if (chips) chips.hidden = !started;
      if (!root.visible) { const cap = document.getElementById('layerAoiLine'); if (cap) cap.hidden = true; return; }
      if (!startedOnce) { startedOnce = true; setTimeout(() => startGhost(performance.now(), 'first'), 900); }
      const cp = camera.position; if (!lastCam) lastCam = cp.clone();
      if (cp.distanceTo(lastCam) > .25) { stillSince = now; lastCam.copy(cp); }
      if (now - lastPick > 450) { lastPick = now; refresh(talk, now); narrate(talk, now); updateChips(); }
      updateCards(now, dt, camera);
      updateNature(now, dt, camera, layerOn('nature')); updateHistory(now, dt, talk, layerOn('history'));
      for (const m of sheets) { const id = m.userData.layer, on = layerOn(id), goal = on ? (focus ? (focus.layer === id ? .2 : .04) : .085) : 0, u = m.material.uniforms; u.uA.value += (goal - u.uA.value) * Math.min(1, dt * 2); m.visible = u.uA.value > .004 && st.tier >= 1;
        const gy = C.groundY(cp.x, cp.z); m.position.set(cp.x, (Number.isFinite(gy) ? gy : cp.y - 1.6) + LAYER_STYLE[id].h + .55, cp.z); u.uT.value = reduced.matches ? 0 : now / 1000; }
      updateThread(now, dt); updateGhost(now, dt); placeAboveSub();
    } catch (e) { if (st.errors.length < 5) st.errors.push(String(e.message || e)); }
  };
  // 層を ON にしたとき（深く開く節目）にも Ghost を一度
  addEventListener('change', e => { const id = e.target?.dataset?.layer; if (id && e.target.checked && st.ready && !seenLayers.has('on:' + id)) { seenLayers.add('on:' + id); startGhost(performance.now(), 'layer'); } }, true);
  window.__layerOverlayHold = () => !!focus && performance.now() < focusUntil;
  window.__layerOverlay = { status: () => ({ ...st, focus: focus ? { ...focus } : null, near: nearList.map(r => r.id), ghostActive: !!ghost }), ghost: () => st.ready && startGhost(performance.now(), 'manual'), get root() { return root; } };
})();
