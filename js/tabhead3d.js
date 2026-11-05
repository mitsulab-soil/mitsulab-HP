// © mitsulab. タブの頭の 3D（2026-11-05）。どのタブも同じ地（暗い地に、フィジカル＝砂色・デジタル＝水色の情報の層）に、
// そのタブの中身を表すものを一つ置く。画面に入ったときだけ読み・描き、離れたら止める。大きさは見やすく描いた模式。
import * as THREE from 'three';
const KINDS = {
  apps:    { cam: [0, 3.2, 9.5], look: [0, .9, 0] },   // 参道の並木に、層が重なる（場所に層を重ねるアプリ）
  art:     { cam: [0, 1.8, 5.4], look: [0, 1.3, 0] },   // 生き物（ヒヨドリ・アオスジアゲハ）が、ゆらぐ層の中に
  writing: { cam: [0, 2.6, 8.0], look: [0, 1.2, 0] },   // 紙が層になって積み重なる（言葉に残す）
  collab:  { cam: [0, 2.6, 7.6], look: [0, 2.5, 0] },   // 人が欅の下に立ち、同じ層を見る（ワークショップ）
  story:   { cam: [0, 2.6, 8.2], look: [0, 2.2, 0] },    // 欅と、その下の土の層（土木と自然から始まった歩み）
  profile: { cam: [0, 1.7, 4.8], look: [0, 1.0, 0] },   // 一人が、層の中に立つ
  museum:  { cam: [0, 2.2, 7.4], look: [0, 1.1, 0] },   // 展示の台に、層を写した面が浮かぶ
  pair:    { cam: [0, 1.8, 5.6], look: [0, 1.0, 0] },   // 二人が並び、同じ層を見る（一緒に試す）
  ground:  { cam: [0, 3.4, 8.6], look: [0, .8, 0] },    // 六つの環世界が重なる（コモングラウンド）
};
export function start(box, kind = box.dataset.th || 'ground') {
  const K = KINDS[kind] || KINDS.ground, mob = innerWidth < 760, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = box.querySelector('canvas'), R = new THREE.WebGLRenderer({ canvas: cv, antialias: !mob, alpha: true, powerPreference: 'low-power' });
  R.setPixelRatio(Math.min(devicePixelRatio, mob ? 1.3 : 1.6)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  const S = new THREE.Scene(); S.fog = new THREE.Fog(0x05080f, 9, 20);
  const C = new THREE.PerspectiveCamera(30, 1, .1, 50), W = new THREE.Group(); S.add(W);
  S.add(new THREE.HemisphereLight(0xcfe4ff, 0x1a1408, .95));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.0); key.position.set(4, 8, 6); S.add(key);
  const rim = new THREE.DirectionalLight(0x8fd3ff, 1.4); rim.position.set(-5, 4, -7); S.add(rim);
  const anim = [];
  // 地
  { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      vertexShader: `varying vec2 v;void main(){v=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 v;void main(){float r=length(v);float f=smoothstep(5.,1.2,r);vec2 g=abs(fract(v*1.25)-.5);float gr=smoothstep(.47,.5,max(g.x,g.y));float h=sin(v.x*.9+1.3)*cos(v.y*.7-.4)+.4*sin(r*1.2);float c=smoothstep(.06,0.,abs(fract(h*2.2)-.5)-.44);gl_FragColor=vec4(vec3(.035,.05,.075)+vec3(.56,.83,1.)*gr*.12+vec3(.91,.77,.54)*c*.15,f*.95);}` });
    const g = new THREE.Mesh(kind === 'story' ? new THREE.RingGeometry(1.82, 5.4, 64) : new THREE.CircleGeometry(5.4, 64), m); g.rotation.x = -Math.PI / 2; W.add(g); }
  // 情報の層（下＝フィジカル、上＝デジタル）
  const sheets = [];
  [[.35, 0xe8c48a], [.6, 0xe8c48a], [2.5, 0x8fd3ff], [2.75, 0x8fd3ff]].forEach(([y, c], i) => {
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, col: { value: new THREE.Color(c) }, ph: { value: i * 1.7 } },
      vertexShader: `uniform float t,ph;varying vec2 v;void main(){vec3 p=position;p.z+=sin(p.x*.7+t*.5+ph)*.08+cos(p.y*.6-t*.4+ph)*.07;v=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `uniform vec3 col;uniform float t,ph;varying vec2 v;void main(){float a=smoothstep(4.8,1.8,length(v));float s=smoothstep(0.,.02,abs(fract(v.x*.55+v.y*.2+ph+t*.03)-.5)-.47);gl_FragColor=vec4(col,a*(.09+s*.24));}` });
    const o = new THREE.Mesh(new THREE.PlaneGeometry(10, 10, mob ? 16 : 28, mob ? 16 : 28), m); o.rotation.x = -Math.PI / 2; o.position.y = y; W.add(o); sheets.push(m); });
  const blobT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const blob = (x, z, r) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, .012, z); W.add(m); };
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? .8, metalness: o.m ?? 0, emissive: o.e ?? 0 });
  let GL = null; const gltf = async url => { if (!GL) { const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]); GL = new GLTFLoader(); GL.setMeshoptDecoder(MeshoptDecoder); } return GL.loadAsync(url); };
  const fit = (o, h) => { const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), k = h / s.y; o.scale.setScalar(k); o.position.set(-(b.min.x + s.x / 2) * k, -b.min.y * k, -(b.min.z + s.z / 2) * k); const g = new THREE.Group(); g.add(o); return g; };
  const keyakiR = async h => { const g = await gltf('img/hero/3d/sando_keyaki.glb'); g.scene.traverse(m => { if (m.isMesh) { m.frustumCulled = false; const mt = m.material; if (mt && mt.map) mt.map.anisotropy = 4; if (mt && /bark|trunk|wood|kan|miki/i.test(m.name + mt.name)) mt.color && mt.color.setHex(0x7d7266); } }); return fit(g.scene, h); };
  const keyaki = async h => { const g = await gltf('img/hero/3d/keyaki_lod1_notex.glb'); g.scene.traverse(m => { if (m.isMesh) m.material = /leaf|ha|foli/i.test(m.name + (m.material && m.material.name)) ? std(0x8fae74, { r: .85 }) : std(0x8a7a66, { r: .95 }); }); return fit(g.scene, h); };
  const human = async h => { const g = await gltf('img/hero/3d/human.glb'); g.scene.traverse(m => { if (m.isMesh) { m.frustumCulled = false; const mt = m.material; if (mt && mt.metalness != null) { mt.metalness = 0; mt.roughness = Math.max(.55, mt.roughness || 0); } if (/hair|brow|short/i.test(m.name) && mt) { mt.alphaTest = .5; mt.side = THREE.DoubleSide; } } }); return fit(g.scene, h); };
  const add = async (o, x = 0, z = 0, ry = 0, r = .5) => { o.position.x += x; o.position.z += z; o.rotation.y = ry; try { if (R.compileAsync) await R.compileAsync(o, C, S); } catch (e) {} W.add(o); blob(x, z, r); dirty = 1; return o; };
  let dirty = 1;
  const build = {
    async apps() { for (let i = 0; i < (mob ? 2 : 4); i++) for (const sx of [-1, 1]) { const t = await keyakiR((mob ? 3.4 : 2.6) + (i % 2) * .3); await add(t, sx * 1.6, 2.4 - i * 1.7, i * 1.3, .7); }
      const path = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 9), std(0x4a4339, { r: .95 })); path.rotation.x = -Math.PI / 2; path.position.y = .01; W.add(path); },
    async art() { R.toneMappingExposure = 1.0; const fl = new THREE.DirectionalLight(0xfff4e6, .9); fl.position.set(0, 2, 6); S.add(fl); const M = await import('./kit/sight/sightModels.js');
      const b = await M.loadSight('hiyo', { shadow: false }); b.object.scale.setScalar(7.5); b.play('perch'); const br = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, 2.6, 8), std(0x6b5a48, { r: 1 })); br.rotation.z = Math.PI / 2 - .12; br.position.set(-.9, 1.43, 0); W.add(br); const bg = new THREE.Group(); bg.add(b.object); await add(bg, -.9, 0, .9); bg.position.y = 1.36; anim.push((t, dt) => { b.update(dt); });
      const a = await M.loadSight('aosuji', { shadow: false }); a.object.scale.setScalar(11); a.play('fly'); const ag = new THREE.Group(); ag.add(a.object); await add(ag, 1.1, .4, -1); ag.position.y = 1.1; anim.push((t, dt) => { a.update(dt); ag.position.set(.9 + Math.sin(t * .6) * .35, 1.25 + Math.sin(t * 1.3) * .12, 1.4 + Math.cos(t * .5) * .25); }); },
    async writing() { const pm = std(0xf0ece2, { r: .9 }); for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, .012, 2.0), pm); const g = new THREE.Group(); g.add(p); p.position.y = .3 + i * .17; p.rotation.y = (i - 4) * .09; W.add(g);
        const ln = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .02), new THREE.MeshBasicMaterial({ color: i % 3 ? 0xe8c48a : 0x8fd3ff, transparent: true, opacity: .7, toneMapped: false })); ln.rotation.x = -Math.PI / 2; ln.position.set(0, .3 + i * .17 + .008, (i % 3 - 1) * .5); ln.rotation.z = p.rotation.y; W.add(ln);
        anim.push(t => { g.position.y = Math.sin(t * .6 + i * .5) * .03; }); } blob(0, 0, 1.3); },
    async collab() { const t = await keyakiR(mob ? 5.6 : 5.2); await add(t, 0, -1.4, 0, 1.2); const h = await human(1.72); await add(h, -.9, .8, .5); h.rotation.y = 2.6; },
    async story() { const t = await keyakiR(mob ? 5.4 : 5.0); await add(t, 0, 0, 0, 1.2);
      W.position.y = .55; [[0x4a3826, -.15, 1.8], [0x6e5638, -.45, 1.7], [0x8f7a5a, -.75, 1.6]].forEach(([c, y, r]) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .28, 48), std(c, { r: 1, e: new THREE.Color(c).multiplyScalar(.25) })); s.position.y = y; W.add(s); }); },   // 土の層（表土・下層土・母材の模式）
    async museum() { const pm = std(0x2a2f38, { r: .7 }); [-2, 0, 2].forEach((x, i) => { const p = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, .9), pm); p.position.set(x, .45, i === 1 ? -.4 : 0); W.add(p); blob(x, p.position.z, .8);
        const tx = new THREE.TextureLoader().load(['img/apps/vid/walk_poster.webp', 'img/apps/vid/hitotsu_poster.webp', 'img/apps/vid/touch_poster.webp'][i], () => { dirty = 1; }); tx.colorSpace = THREE.SRGBColorSpace; const f = new THREE.Mesh(new THREE.PlaneGeometry(1.28, .8), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide, toneMapped: false }));
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(f.geometry), new THREE.LineBasicMaterial({ color: i === 1 ? 0x8fd3ff : 0xe8c48a, transparent: true, opacity: .8 })); const g = new THREE.Group(); g.add(f, e); g.position.set(x, 1.55, p.position.z); W.add(g);
        anim.push(t => { g.position.y = 1.55 + Math.sin(t * .7 + i) * .05; g.rotation.y = (1 - i) * .25 + Math.sin(t * .3 + i) * .08; }); }); },
    async pair() { const a = await human(1.72); await add(a, -.45, 0, .35); const b = await human(1.64); await add(b, .45, .1, -.35); },
    async profile() { const h = await human(1.72); await add(h, 0, 0, 0); h.rotation.y = .3; },
    async ground() { const cs = [0x8fd3ff, 0xe8c48a, 0xbfe6ff, 0xd9b27a, 0x6fbfe8, 0xf0d9b0], sm = new THREE.SphereGeometry(1.25, 40, 28);
      cs.forEach((c, i) => { const a = i / 6 * Math.PI * 2; const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { col: { value: new THREE.Color(c) } },
        vertexShader: `varying float f;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normal);f=pow(1.-abs(dot(n,normalize(-mv.xyz))),2.4);gl_Position=projectionMatrix*mv;}`, fragmentShader: `uniform vec3 col;varying float f;void main(){gl_FragColor=vec4(col,f*.3);}` });
        const o = new THREE.Mesh(sm, m); o.scale.y = .62; o.position.set(Math.cos(a) * .95, 1, Math.sin(a) * .95); W.add(o); anim.push(t => { o.position.y = 1 + Math.sin(t * .5 + i) * .05; }); }); },
  };
  function size() { const w = box.clientWidth, h = box.clientHeight; R.setSize(w, h, false); C.aspect = w / h; C.fov = C.aspect < 1.2 ? 40 : 30; C.position.set(...K.cam); C.lookAt(...K.look); C.updateProjectionMatrix(); dirty = 1; }
  size(); addEventListener('resize', size);
  let yaw = 0, drag = null, auto = 0, user = 0, vis = false, raf = 0, last = performance.now(), T0 = last;
  cv.style.touchAction = 'pan-y';
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y0: yaw }; user = performance.now(); });
  addEventListener('pointermove', e => { if (!drag) return; yaw = drag.y0 + (e.clientX - drag.x) * .006; user = performance.now(); dirty = 1; kick(); }, { passive: true });
  addEventListener('pointerup', () => { drag = null; });
  const kick = () => { if (!raf && vis) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(es => { vis = es[0].isIntersecting; kick(); }).observe(box);
  function loop(n) { raf = 0; if (!vis) return; const dt = Math.min(.05, (n - last) / 1000); last = n;
    if (reduce && !dirty && !drag) return; dirty = 0; const t = (n - T0) / 1000;
    if (!reduce && !drag && performance.now() - user > 2500) auto += dt * .08;
    W.rotation.y = yaw + Math.sin(auto) * .4; sheets.forEach(m => m.uniforms.t.value = t); anim.forEach(f => f(t, dt));
    R.render(S, C); raf = requestAnimationFrame(loop); }
  (async () => { try { await (build[kind] || build.ground)(); } catch (e) { console.warn('tabhead3d', kind, e); } dirty = 1; kick(); })();
  if (reduce) setInterval(() => { if (dirty) kick(); }, 400);
}
