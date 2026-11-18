/* Qualia エンジン（三つの Qualia の共通の土台・2026-11-19）
   一つの 3D の場（参道の砂利と並木・霞）、目の高さのカメラと歩き方、碧、字幕、共通の操作の札、読み込み、音、受けとり方の切りかえ。
   使い方は README.md。© mitsulab. All rights reserved. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const BASE = new URL("./", import.meta.url).href;
const $ = (t, a = {}, p) => { const e = document.createElement(t); Object.assign(e, a); if (p) p.appendChild(e); return e; };
const ICON = {
  eye: '<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>',
  ear: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0"/><path d="M10 10a2 2 0 0 1 4 0"/>',
  brush: '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 20l3-3"/>',
  hand: '<path d="M8 12V5a1.5 1.5 0 0 1 3 0v6M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-12 0v-2.5a1.5 1.5 0 0 1 3 0"/>',
  ask: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
  scale: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10"/>',
  place: '<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  book: '<path d="M4 5h7v14H4zM13 5h7v14h-7z"/>',
  dot: '<circle cx="12" cy="12" r="4"/>' };

export async function createWorld(opt = {}) {
  const haze = opt.haze || "#8e98a8";
  /* 描く先（v2）：opt.container を渡すとその中に描く。省くと body */
  const host = opt.container || document.body; if (opt.container) { host.classList.add("qe-host"); if (getComputedStyle(host).position === "static") host.style.position = "relative"; }   /* 三つの道具に共通の霞の色（つながりの色） */
  (opt.container ? host : document.documentElement).style.setProperty("--qe-haze", haze);
  /* 読み込みの幕 */
  const load = $("div", { id: "qeLoad", innerHTML: "<i></i>" }, host);
  /* 3D */
  const canvas = $("canvas", { id: "qeCanvas" }, host);
  const small = innerWidth < 760;
  /* 測るための旗（?qe=pr1,noveg,noaoi,nofog,veg50）。ふだんは使わない */
  const QE = new Set((new URL(location.href).searchParams.get("qe") || "").split(","));   /* v2：スマホは幕の前の仕事を軽く（アンチエイリアスなし・解像度 1.25） */
  const R = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: "high-performance" });
  R.setPixelRatio(QE.has("pr1") ? 1 : Math.min(devicePixelRatio, small ? 1.25 : 2)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  const S = new THREE.Scene(); S.background = new THREE.Color(haze); S.fog = QE.has("nofog") ? null : new THREE.Fog(haze, 8, 46);
  const C = new THREE.PerspectiveCamera(60, 1, .03, 4000); C.position.set(0, 1.55, 6);
  const hemi = new THREE.HemisphereLight("#f2f0e6", "#5b4e3e", 1.5); S.add(hemi); const sun = new THREE.DirectionalLight("#ffe7c2", 2.1); sun.position.set(4, 9, 3); S.add(sun);
  /* v2：時の速さ（1＝いま）。世界の時刻（秒）は 10 時から。速くすると日が動き、昼と夜が移る（模式） */
  let ts = 1, clockSec = 10 * 3600; const hazeC = new THREE.Color(haze), nightC = new THREE.Color("#0b1220");
  const tl = new THREE.TextureLoader(), tex = (f, rep) => new Promise(ok => tl.load(BASE + "tex/" + f, t => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; ok(t); }, undefined, () => ok(null)));
  /* 地面：一面の土と、参道の砂利の帯 */
  /* v2：地面に起伏（道の両脇から外へ、ゆるい凹凸と根もとの盛り上がり）。道の上は平ら */
  const gG = new THREE.PlaneGeometry(400, 400, mobGeo(), mobGeo()); { const P = gG.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), ax = Math.abs(x);
      const n = Math.sin(x * .21 + y * .13) * .35 + Math.sin(x * .57 - y * .41) * .15 + Math.sin(x * 1.7 + y * 1.3) * .05; const k = Math.min(1, Math.max(0, (ax - 3.4) / 4)); P.setZ(i, n * k + k * .08); } gG.computeVertexNormals(); }
  const ground = new THREE.Mesh(gG, new THREE.MeshLambertMaterial({ color: "#8a7a62" })); ground.rotation.x = -Math.PI / 2; S.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4, 400), new THREE.MeshLambertMaterial({ color: "#c9bea8" })); road.rotation.x = -Math.PI / 2; road.position.y = .02; S.add(road);
  tex("soil_forest.webp", 90).then(t => { if (t) { ground.material.map = t; ground.material.needsUpdate = true; } });
  tex("path_gravel.webp", 1).then(t => { if (t) { t.repeat.set(2, 200); road.material.map = t; road.material.needsUpdate = true; } });
  /* 歩ける範囲（道の両脇まで） */
  let bound = opt.bound || { x: 7, z0: -150, z1: 12 };
  /* 歩く面（v2）：地形の glb を読んだら、その面で押した所と足もとの高さを求める */
  const walkables = [ground]; const down1 = new THREE.Raycaster(); const DOWN = new THREE.Vector3(0, -1, 0); let groundY = 0;
  /* 植生：Poly Haven CC0（縮めた写し）。描きはじめてから読む */
  try { MeshoptDecoder.useWorkers && MeshoptDecoder.useWorkers(2); } catch (e) { }   /* v2：圧縮の解き方は別の糸で */
  const gl = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  function mobGeo() { return innerWidth < 760 ? 120 : 200; }
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const vegG = new THREE.Group(); S.add(vegG); const pend = [];
  /* v3：並木は Qualia/sight と同じ作り方の木（sighttree.js）。樹皮は同じケヤキの写真、葉は同じ葉の房の写真（CC0） */
  const sightScene = async () => { const { sightTrees } = await import("./sighttree.js"); const lm = await tl.loadAsync(BASE + "tex/leaf_spray.webp"); lm.colorSpace = THREE.SRGBColorSpace; lm.wrapS = lm.wrapT = THREE.ClampToEdgeWrapping;
    const bm = new THREE.MeshStandardMaterial({ color: "#d8cfc4", roughness: 1, map: barkT, normalMap: barkN, name: "bark" }); return sightTrees(bm, lm); };
  /* 並木の幹に、Qualia/sight と同じケヤキの樹皮の写真（CC0）を貼る */
  let barkT = null, barkN = null; tl.load(BASE + "tex/bark_zelkova.webp", t => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); barkT = t; }); tl.load(BASE + "tex/bark_zelkova_n.webp", t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); barkN = t; });   /* v2：植生はこの一つの組に入れる（止める・差しかえる） */
  const plant = async (file, pts, hMin, hMax) => { try { const g = file === "sight" ? { scene: await sightScene() } : await gl.loadAsync(/^(https?:|\.|\/)/.test(file) ? file : BASE + "veg/" + file); g.scene.updateMatrixWorld(true);
    const vars = g.scene.children.filter(c => { let h = false; c.traverse(m => { if (m.isMesh) h = true; }); return h; }); const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), IV = new THREE.Matrix4();
    vars.forEach((vn, vi) => { const list = pts.filter((_, i) => i % vars.length === vi); if (!list.length) return; IV.copy(vn.matrixWorld).invert(); const ms = [], bb = new THREE.Box3(), tb = new THREE.Box3();
      vn.traverse(m => { if (!m.isMesh) return; const rel = new THREE.Matrix4().multiplyMatrices(IV, m.matrixWorld); m.geometry.computeBoundingBox(); tb.copy(m.geometry.boundingBox).applyMatrix4(rel); bb.union(tb); ms.push([m, rel]); });
      const sz = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3()), toC = new THREE.Matrix4().makeTranslation(-ctr.x, -bb.min.y, -ctr.z);
      ms.forEach(([m, rel]) => { if (m.material) { m.material.side = THREE.DoubleSide; const leafy = m.material.map && (m.material.alphaTest > 0 || m.material.transparent || /leaf|leaves|foliage/i.test(m.material.name + m.name)); if (m.material.map) { m.material.alphaTest = .4; m.material.transparent = false; } if (!leafy && /broad|pine/.test(file) && barkT) { m.material = m.material.clone(); m.material.map = barkT; if (barkN) m.material.normalMap = barkN; m.material.color && m.material.color.set("#d8cfc4"); } }
        const im = new THREE.InstancedMesh(m.geometry, m.material, list.length);
        list.forEach(([x, z], i) => { const h = hMin + rnd() * (hMax - hMin), sc = h / Math.max(.01, sz.y); Q.setFromAxisAngle(V.set(0, 1, 0), rnd() * 6.283); SC.set(sc, sc, sc); M4.compose(V.set(x, -.02, z), Q, SC).multiply(toC).multiply(rel); im.setMatrixAt(i, M4); });
        im.frustumCulled = false; im.visible = false; vegG.add(im); pend.push(im); }); });
    /* v2：材質を描く前に別の糸で組み、こまを止めない。組めたら一度に出す */
    try { if (R.compileAsync) await R.compileAsync(vegG, C, S); } catch (e) { } pend.forEach(m => m.visible = true); pend.length = 0; await new Promise(r => setTimeout(r, 120)); } catch (e) { console.warn("veg", file, String(e && e.message || e)); } };
  const mob = innerWidth < 760; const VF = QE.has("veg50") ? .5 : mob ? .55 : 1;   /* v2：スマホは植生を 55% に（読み込み中のこまの止まりを減らす） */
  const side = (n, dMin, dMax, z0, z1) => [...Array(n)].map(() => [(rnd() < .5 ? -1 : 1) * (dMin + rnd() * (dMax - dMin)), z0 + rnd() * (z1 - z0)]);
  const trees = []; for (let k = 0; k < Math.round((mob ? 26 : 40) * VF); k++) for (const sd of [-1, 1]) trees.push([sd * (3.2 + rnd() * 1.6), 10 - k * 4 + (rnd() - .5) * 1.5]);
  /* 碧 */
  const aoi = { root: new THREE.Group(), vrm: null }; aoi.root.position.set(1.1, 0, 3.6); aoi.root.rotation.y = -.4; S.add(aoi.root);
  /* 歩き方：地面を押す＝そこへ歩く（一度に 6 m まで）、なぞる＝見回す、W A S D・矢印 */
  let yaw = 0, pitch = -.04, target = null; const keys = {}; const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  let down = null;
  canvas.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false }; canvas.setPointerCapture(e.pointerId); unlockAudio(); });
  canvas.addEventListener("pointermove", e => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 6) down.moved = true; if (down.moved) { yaw = down.yaw - dx * .005; pitch = Math.max(-1.2, Math.min(.6, down.pitch - dy * .004)); } });
  canvas.addEventListener("pointerup", e => { if (down && !down.moved) { v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(v2, C); const h = ray.intersectObjects(walkables, true)[0];
      if (h) { const d = new THREE.Vector3().subVectors(h.point, C.position); d.y = 0; if (d.length() > 6) d.setLength(6); target = C.position.clone().add(d); }
      api.emit("tap", { x: e.clientX, y: e.clientY, point: h && h.point }); } down = null; });
  const onKD = e => { keys[e.key.toLowerCase()] = 1; unlockAudio(); }, onKU = e => { keys[e.key.toLowerCase()] = 0; }; addEventListener("keydown", onKD); addEventListener("keyup", onKU);
  /* 受けとり方の色：画面全体に色の行列をかける（受けとり方の模式） */
  const rt = new THREE.WebGLRenderTarget(2, 2, { samples: small ? 0 : 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace; rt.depthTexture = new THREE.DepthTexture(2, 2);   /* 空（奥行きが無い所）は受けとり方の色をかけない */
  const post = new THREE.ShaderMaterial({ uniforms: { km: { value: null }, dt: { value: rt.depthTexture }, t: { value: rt.texture }, m: { value: new THREE.Matrix3() }, vig: { value: 0 }, blur: { value: 0 }, px: { value: new THREE.Vector2(1, 1) }, mono: { value: 0 }, split: { value: 0 } },
    vertexShader: "varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader: "uniform sampler2D t,dt,km;uniform mat3 m;uniform float vig,blur,mono,split;uniform vec2 px;varying vec2 u;void main(){vec3 c0=texture2D(t,u).rgb;vec3 c=c0;if(blur>0.){vec3 s=vec3(0.);for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++)s+=texture2D(t,u+vec2(float(i),float(j))*px*blur).rgb;c=s/25.;}float sky=step(.99999,texture2D(dt,u).r);float keep=max(sky,texture2D(km,u).r);c=mix(m*c,c,keep);if(mono>1.5){float l=pow(clamp(dot(c,vec3(.3,.59,.11)),0.,1.),2.2);vec3 a=vec3(.02,.05,.14),b2=vec3(.1,.3,.48),d=vec3(.92,.45,.15),e=vec3(1.,.92,.62);c=l<.33?mix(a,b2,l/.33):l<.66?mix(b2,d,(l-.33)/.33):mix(d,e,(l-.66)/.34);}else if(mono>0.){float l=dot(c,vec3(.3,.59,.11));c=mix(c,vec3(l),mono);}float r=length(u-.5);c*=1.-vig*smoothstep(.3,.75,r);if(split>0.){if(u.x<.5)c=c0;if(abs(u.x-.5)<px.x*1.5)c=vec3(.93,.96,.98);}gl_FragColor=vec4(c,1.);}" });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post), pS = new THREE.Scene(), pC = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); pS.add(quad);
  let usePost = false; const kmRT = new THREE.WebGLRenderTarget(2, 2), kmMat = new THREE.MeshBasicMaterial({ color: 0xffffff }), blackT = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blackT.needsUpdate = true; const isIn = (o, r) => { while (o) { if (o === r) return true; o = o.parent; } return false; };   /* keepAoi＝true なら碧には受けとり方の色をかけない */
  /* 大きさ：目の高さ（m）。1.55 が人。下げれば小さな生き物、上げれば鳥から空の上まで */
  let eye = 1.55, eyeT = 1.55;
  /* 音 */
  let ac = null; function unlockAudio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === "suspended") ac.resume(); api.emit("audio", ac); }
  /* GUI */
  const top = $("div", { id: "qeTop" }, host);
  const row = $("div", { className: "row" }, top);
  $("a", { className: "back", href: "/", textContent: "←", ariaLabel: "mitsulab のトップへ" }, row);
  const titleWrap = $("div", {}, row); $("h1", { textContent: opt.title || "" }, titleWrap);
  const defEl = $("div", { className: "def" }, titleWrap); defEl.innerHTML = opt.def ? `<b>${opt.def.sym}</b>── ${opt.def.text}` : "";
  const modesEl = $("nav", { id: "qeModes", ariaLabel: "受けとり方" }, top);
  const subEl = $("nav", { id: "qeSub", ariaLabel: "この中の選び", hidden: true }, top);
  const tr = $("div", { id: "qeTR" }, host), br = $("div", { id: "qeBR" }, host), bl = $("div", { id: "qeBL" }, host);
  const cap = $("p", { id: "qeCap", className: "qe-shadow", ariaLive: "polite" }, host);
  const info = $("section", { id: "qeInfo", hidden: true, role: "dialog", ariaLabel: "説明" }, host);
  const btn = (slot, label, fn, aria) => { const b = $("button", { className: "qe-btn", type: "button", innerHTML: label, onclick: fn }, { tr, br, bl }[slot]); if (aria) b.setAttribute("aria-label", aria); return b; };
  let capT = 0; const say = (text, ms = 6000, small) => { clearTimeout(capT); cap.innerHTML = ""; cap.textContent = text; if (small) $("small", { textContent: small }, cap); cap.classList.add("on"); if (ms) capT = setTimeout(() => cap.classList.remove("on"), ms); };
  const helpBtn = btn("tr", "＋", () => { info.hidden = !info.hidden; }, "説明");
  const shot = btn("br", '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-2.5h5L16 7"/></svg>', () => { api.render(); canvas.toBlob(b => { const a = $("a", { href: URL.createObjectURL(b), download: (opt.title || "qualia").replace(/\W+/g, "_") + ".png" }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }); }, "この画面を一枚の画像で保存（どこにも送りません）");
  /* 受けとり方（モード） */
  const modes = []; let cur = null, curSub = 0;
  let uiMarked = false;
  function setMode(id, sub = 0) { if (!uiMarked) { uiMarked = true; requestAnimationFrame(() => { try { performance.mark("qe-ui"); } catch (e) { } }); } const m = modes.find(x => x.id === id) || modes[0]; if (cur && cur !== m && cur.exit) cur.exit(api); const changed = cur !== m; cur = m; curSub = sub;
    [...modesEl.children].forEach(b => b.setAttribute("aria-pressed", b.dataset.id === m.id));
    subEl.innerHTML = ""; subEl.hidden = !m.subs; if (m.subs) m.subs.forEach((s, i) => { const b = $("button", { type: "button", textContent: s.label, onclick: () => setMode(m.id, i) }, subEl); b.setAttribute("aria-pressed", i === sub); }); { const on = subEl.children[sub]; if (on && subEl.scrollWidth > subEl.clientWidth) subEl.scrollLeft = Math.max(0, on.offsetLeft - (subEl.clientWidth - on.offsetWidth) / 2); }   /* 選んだ札を横の列の中ほどへ（スマホで画面の外に出ないように） */
    info.hidden = true; info.innerHTML = ""; const inf = (m.subs && m.subs[sub] && m.subs[sub].info) || m.info; if (inf) { $("h2", { textContent: inf.title || m.label }, info); $("p", { innerHTML: inf.body || "" }, info); if (inf.src) $("p", { className: "src", innerHTML: inf.src }, info); }
    if (m.enter) m.enter(api, sub, changed); const u = new URL(location.href); u.searchParams.set("m", m.id); if (sub) u.searchParams.set("s", sub); else u.searchParams.delete("s"); history.replaceState(null, "", u); api.emit("mode", { id: m.id, sub }); }
  const listeners = {};
  const api = { THREE, scene: S, camera: C, renderer: R, ground, road, aoi, haze, base: BASE, say, btn, info, sub: () => curSub,
    on: (k, f) => (listeners[k] = listeners[k] || []).push(f), emit: (k, d) => (listeners[k] || []).forEach(f => { try { f(d); } catch (e) { console.warn(e); } }),
    audio: () => ac, unlockAudio, mobile: mob,
    addMode(m) { modes.push(m); const b = $("button", { type: "button", innerHTML: `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[m.icon] || ICON.dot}</svg><span class="v"></span><span class="n"></span>`, onclick: () => setMode(m.id) }, modesEl); b.dataset.id = m.id; b.querySelector(".v").textContent = m.label; b.querySelector(".n").textContent = m.name || ""; b.setAttribute("aria-label", m.label + (m.name ? "（" + m.name + "）" : "")); },
    setMode, setLabel(id, label) { const b = modesEl.querySelector(`[data-id="${id}"] .v`); if (b) b.textContent = label; },
    /* 色の行列（行優先の 9 つの数）。null で元の色 */
    setColor(mat, o = {}) { usePost = !!mat || !!o.vig || !!o.blur || !!o.mono; post.uniforms.m.value.set(...(mat || [1, 0, 0, 0, 1, 0, 0, 0, 1])); post.uniforms.vig.value = o.vig || 0; post.uniforms.blur.value = o.blur || 0; post.uniforms.mono.value = o.mono || 0; },
    /* くらべる：画面の左半分を元の色、右半分を受けとり方の色にする（true/false） */
    setSplit(on) { post.uniforms.split.value = on ? 1 : 0; },
    setEye(h) { eyeT = h; }, eye: () => eye, setFog(near, far) { if (S.fog) { S.fog.near = near; S.fog.far = far; } },
    render() { if (usePost) { if (api.keepAoi && aoi.vrm) { kmRT.setSize(rt.width, rt.height); const bg = S.background, fg = S.fog; S.background = null; S.fog = null; S.overrideMaterial = kmMat; const vis = []; S.traverse(o => { if (o.isMesh && !isIn(o, aoi.root)) { vis.push([o, o.visible]); o.visible = false; } }); R.setRenderTarget(kmRT); R.setClearColor(0x000000, 1); R.clear(); R.render(S, C); vis.forEach(([o, v]) => o.visible = v); S.overrideMaterial = null; S.background = bg; S.fog = fg; post.uniforms.km.value = kmRT.texture; } else post.uniforms.km.value = blackT; R.setRenderTarget(rt); R.render(S, C); R.setRenderTarget(null); R.render(pS, pC); } else R.render(S, C); },
    walkTo(p) { target = p.clone(); } };
  function resize() { const w = opt.container ? host.clientWidth : innerWidth, h = opt.container ? host.clientHeight : innerHeight; R.setSize(w, h, false); C.aspect = w / h; C.updateProjectionMatrix(); const pr = R.getPixelRatio(); rt.setSize(w * pr, h * pr); post.uniforms.px.value.set(1 / (w * pr), 1 / (h * pr)); }
  addEventListener("resize", resize); resize();
  (window.__qe = window.__qe || []).push(api);   /* 確かめ用：開いている場の一覧 */
  /* v2：止める・閉じる・範囲と地形の差し替え */
  let running = true, rafId = 0, disposed = false;
  Object.assign(api, {
    pause() { running = false; cancelAnimationFrame(rafId); try { ac && ac.suspend(); } catch (e) { } },
    resume() { if (disposed || running) return; running = true; clock.getDelta(); try { ac && ac.resume(); } catch (e) { } rafId = requestAnimationFrame(frame); },
    dispose() { if (disposed) return; disposed = true; api.pause(); removeEventListener("resize", resize); removeEventListener("keydown", onKD); removeEventListener("keyup", onKU);
      S.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? [].concat(o.material) : []; ms.forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); });
      rt.dispose(); R.dispose(); try { R.forceContextLoss(); } catch (e) { } [canvas, load, top, tr, br, bl, cap, info].forEach(e => e && e.remove()); try { ac && ac.close(); } catch (e) { } },
    setBound(b) { bound = { ...bound, ...b }; },
    /* 当たり判定：setObstacles([mesh, …]) を渡すと、歩く操作と walkTo がそれを通り抜けない（足もと 0.5 m の高さで水平に光線を当てる軽い作り）。[] で外す */
    setObstacles(list) { obstacles.length = 0; (list || []).forEach(o => obstacles.push(o)); },
    /* 地面を平らに：flattenGround({ x, z, r, y = 0, edge = 1 })。中心 (x, z) から半径 r の内を高さ y に、外へ edge m でなめらかにつなぐ。何度呼んでもよい */
    flattenGround(o) { const P = ground.geometry.attributes.position, y0 = o.y || 0, e = o.edge === undefined ? 1 : o.edge;
      for (let i = 0; i < P.count; i++) { const gx = P.getX(i), gz = -P.getY(i), d = Math.hypot(gx - o.x, gz - o.z); if (d > o.r + e) continue; const k = d <= o.r ? 1 : 1 - (d - o.r) / e; P.setZ(i, P.getZ(i) * (1 - k) + y0 * k); }
      P.needsUpdate = true; ground.geometry.computeVertexNormals(); ground.geometry.computeBoundingSphere(); },
    /* 霞と空の色を自分で決めるとき true（エンジンの毎こまの霞・昼夜の色を止める） */
    fogLock: false,
    /* 時の速さ：setTimeScale(k)（1＝いま、1000＝千倍速）。worldTime() は世界の時刻（秒・0〜86400） */
    setTimeScale(k) { ts = k; }, timeScale: () => ts, worldTime: () => clockSec, setWorldTime(sec) { clockSec = sec % 86400; },
    /* 向き：setView({ lookAt: [x, y, z] }) か setView({ yaw, pitch })。毎こまの向きはこの値から決まる（camera.lookAt は毎こま上書きされるので使わない） */
    setView(o) { if (o.position) C.position.fromArray(o.position);   /* 位置を先に置いてから向きを求める（同じ呼び出しで両方渡したとき、前の位置から向きを求めていた） */ if (o.lookAt) { const d = new THREE.Vector3().fromArray(o.lookAt).sub(C.position); yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); } if (o.yaw !== undefined) yaw = o.yaw; if (o.pitch !== undefined) pitch = o.pitch; if (o.position) C.position.fromArray(o.position); },
    /* 碧の立ち位置：setAoi({ pos: [x,y,z], lookAt: [x,y,z] }) でそこに立たせる（lookAt を省くと今の向き）。follow() で、また少し前を一緒に歩く */
    setAoi(o) { const pos = new THREE.Vector3().fromArray(o.pos);
      aoiPin = { pos, look: o.lookAt ? new THREE.Vector3().fromArray(o.lookAt) : null }; },
    follow() { aoiPin = null; },
    /* 植生：clearVegetation() で消す。setVegetation([{ file, pts: [[x, z], …], h: [最小, 最大] }]) で差しかえる（file は veg/ の名前か URL） */
    clearVegetation() { vegG.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } }); vegG.clear(); },
    async setVegetation(list) { api.clearVegetation(); for (const v of list) await plant(v.file, v.pts, v.h[0], v.h[1]); },
    /* 字幕の段落送り：字幕か画面の下を押すたびに次の文へ。最後で done を呼ぶ */
    sayLines(lines, o = {}) { let i = 0; const go = () => { if (i >= lines.length) { cap.classList.remove("on"); cap.style.pointerEvents = ""; cap.onclick = null; o.done && o.done(); return; } say(lines[i], 0, o.hint || (i < lines.length - 1 ? "押すと次へ" : "")); i++; };
      cap.style.pointerEvents = "auto"; cap.style.cursor = "pointer"; cap.onclick = go; go(); return { next: go }; },
    /* 映像の面：<video> を面に貼る（音は既定で消す。押したときに鳴らす） */
    videoPlane(url, w = 1.6, h = .9, o = {}) { const v = document.createElement("video"); v.src = url; v.crossOrigin = "anonymous"; v.loop = o.loop !== false; v.muted = o.muted !== false; v.playsInline = true; v.preload = "metadata";
      const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.userData.video = v; if (o.autoplay !== false) v.play().catch(() => { }); return m; },
    /* 一体の目：カメラをその物（Object3D）に乗せる。offset は物から見た目の位置。null で外す */
    attachEye(obj, offset = [0, .05, .05]) { rider = obj ? { obj, off: new THREE.Vector3().fromArray(offset) } : null; },
    /* 地形の glb を読む。replace＝true なら標準の地面と砂利の帯を隠す。返り値は読んだ glb の scene */
    async loadTerrain(url, o = {}) { const g = await gl.loadAsync(url); const sc = g.scene; if (o.position) sc.position.fromArray(o.position); if (o.scale) sc.scale.setScalar(o.scale); S.add(sc); sc.updateMatrixWorld(true); walkables.unshift(sc); if (o.replace) { ground.visible = false; road.visible = false; walkables.splice(walkables.indexOf(ground), 1); } return sc; },
    walkables });
  /* 毎こま */
  const clock = new THREE.Clock(); const fwd = new THREE.Vector3(); let rider = null, aoiPin = null; const _q = new THREE.Quaternion(), _p = new THREE.Vector3();
  const obstacles = [], obR = new THREE.Raycaster(); let prevPos = null;
  function frame() { if (!running) return; prevPos = C.position.clone(); const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    if (aoiPin) { aoi.root.position.copy(aoiPin.pos); if (aoiPin.look) { const d = new THREE.Vector3().subVectors(aoiPin.look, aoiPin.pos); aoi.root.rotation.y = Math.atan2(d.x, d.z); } }
    const sp = 1.6 * Math.max(.4, Math.min(30, eye / 1.55)) * dt; fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); const rt2 = new THREE.Vector3(-fwd.z, 0, fwd.x);
    if (keys.w || keys.arrowup) C.position.addScaledVector(fwd, sp); if (keys.s || keys.arrowdown) C.position.addScaledVector(fwd, -sp); if (keys.a || keys.arrowleft) C.position.addScaledVector(rt2, -sp); if (keys.d || keys.arrowright) C.position.addScaledVector(rt2, sp);
    if (target) { const d = new THREE.Vector3().subVectors(target, C.position); d.y = 0; const L = d.length(); if (L < .05) target = null; else { C.position.addScaledVector(d.normalize(), Math.min(L, sp)); yaw += (Math.atan2(-d.x, -d.z) - yaw) * 0 ; } }
    if (obstacles.length && prevPos) { const mv = new THREE.Vector3().subVectors(C.position, prevPos); mv.y = 0; const L = mv.length(); if (L > 1e-4) { obR.set(new THREE.Vector3(prevPos.x, groundY + .5, prevPos.z), mv.clone().normalize()); obR.far = L + .35; if (obR.intersectObjects(obstacles, true).length) { C.position.x = prevPos.x; C.position.z = prevPos.z; target = null; api.obstacleHits = (api.obstacleHits || 0) + 1; } } }
    C.position.x = Math.max(-bound.x, Math.min(bound.x, C.position.x)); C.position.z = Math.max(bound.z0, Math.min(bound.z1, C.position.z));
    eye += (eyeT - eye) * Math.min(1, dt * 3); if (walkables.length > 1 || walkables[0] !== ground) { down1.set(new THREE.Vector3(C.position.x, 2000, C.position.z), DOWN); const hh = down1.intersectObjects(walkables, true)[0]; if (hh) groundY += (hh.point.y - groundY) * Math.min(1, dt * 6); } C.position.y = groundY + eye; C.near = Math.max(.005, eye * .02); C.far = Math.max(200, eye * 60); C.updateProjectionMatrix();
    if (S.fog && !api.fogLock) { S.fog.far = Math.max(46, eye * 9); S.fog.near = Math.max(8, eye * .6); }   /* v2：高く上がるほど霞を厚く（並木の外の平らな地面が地平で切れて見えない） */ C.rotation.set(pitch, yaw, 0, "YXZ");
    /* 碧は少し前を、同じ速さで歩く */
    if (!aoiPin) { const ap = C.position.clone().addScaledVector(fwd, mob ? 5 : 4).addScaledVector(rt2, mob ? .35 : .9); ap.y = groundY; { const cf = new THREE.Vector3(); C.getWorldDirection(cf); cf.y = 0; cf.normalize(); const ctr = C.position.clone().addScaledVector(cf, mob ? 5 : 4); ctr.y = groundY; for (let k = 0; k < 6; k++) { const q = ap.clone(); q.y += 1; q.project(C); if (q.z < 1 && Math.abs(q.x) < .7) break; ap.lerp(ctr, .35); } }   /* 立ち位置が画面の横 70% の外に出るときは、視線の先へ寄せる（体が端で切れないように） */   /* v2：スマホは少し遠く・中寄りに（画面の右で切れない。375px の横の見える幅は 5 m 先で左右 1.3 m。0.62 m だと歩くあいだの遅れで右端を越えた） */ aoi.root.position.lerp(ap, Math.min(1, dt * 1.2)); aoi.root.rotation.y += ((yaw + Math.PI) * 0 + Math.atan2(C.position.x - aoi.root.position.x, C.position.z - aoi.root.position.z) - aoi.root.rotation.y) * Math.min(1, dt * 2); }
    clockSec = (clockSec + dt * ts) % 86400; { const a = (clockSec / 86400) * Math.PI * 2 - Math.PI / 2, h = Math.sin(a); sun.position.set(Math.cos(a) * 10, h * 10, 3); const day = Math.max(0, Math.min(1, h * 3 + .3)); sun.intensity = 2.1 * day; hemi.intensity = .35 + 1.15 * day; if (!api.fogLock) { S.background.copy(nightC).lerp(hazeC, day); if (S.fog) S.fog.color.copy(S.background); } }
    if (aoi.vrm) { /* v2：立っているときの小さな動き（息・腕・首）。棒立ちにしない */ const N = n => aoi.vrm.humanoid.getNormalizedBoneNode(n);
      for (const sd of ["left", "right"]) { const sg = sd === "left" ? 1 : -1; N(sd + "UpperArm")?.rotation.set(.05 + Math.sin(t * .9 + sg) * .03, sg * .08, sg * -(1.36 + Math.sin(t * 1.1) * .025)); N(sd + "LowerArm")?.rotation.set(0, sg * -.35, sg * -.12); }
      const ch = N("chest") || N("spine"); if (ch) ch.rotation.x = Math.sin(t * 1.6) * .012; const hd = N("head"); if (hd) { hd.rotation.y = Math.sin(t * .35) * .12; hd.rotation.x = Math.sin(t * .5) * .03; }
      aoi.vrm.update(dt); }
    if (rider) { rider.obj.updateWorldMatrix(true, false); rider.obj.getWorldQuaternion(_q); _p.copy(rider.off).applyQuaternion(_q).add(rider.obj.getWorldPosition(new THREE.Vector3())); C.position.copy(_p); C.quaternion.copy(_q); C.rotateX(pitch); }
    api.emit("frame", { dt, t, wdt: dt * ts, clock: clockSec }); api.render(); rafId = requestAnimationFrame(frame); }
  rafId = requestAnimationFrame(frame);
  /* 最初のこまが描けたら幕を上げ、そのあと重いもの（植生・碧）を読む */
  requestAnimationFrame(() => requestAnimationFrame(() => { load.classList.add("out"); setTimeout(() => load.remove(), 600);
    (window.requestIdleCallback || (f => setTimeout(f, 300)))(async () => {
      if (opt.vegetation !== false && !QE.has("noveg")) {
      await plant(QE.has("oldtree") ? "broad_lo.glb" : "sight", trees, 9, 15);
      /* v2：並木の外の森（遠くまで木が続き、高く上がっても平らな地面だけにならない） */
      const far = []; for (let i = 0; i < Math.round((mob ? 70 : 160) * VF); i++) far.push([(rnd() < .5 ? -1 : 1) * (7 + rnd() * 70), 14 - rnd() * 190]);
      await plant(QE.has("oldtree") ? "broad_lo.glb" : "sight", far, 10, 18);   /* 並木の外も sight と同じ木（上から見ても葉がある。broad_lo は上から枝だけに見えた） */
      await plant("pine_lo.glb", far.filter((_, i) => i % 4 === 0).map(([x, z]) => [x * 1.08 + 3, z - 6]), 14, 22);
      await plant("root_cluster_01.glb", trees.filter((_, i) => i % 3 === 0), .5, .9);
      await plant("shrub_02.glb", side(Math.round((mob ? 30 : 60) * VF), 2.4, 7, 12, -150), .8, 2);
      await plant("fern_02.glb", side(Math.round((mob ? 50 : 110) * VF), 2.2, 6, 12, -150), .35, .75);
      await plant("grass_medium_02.glb", side(Math.round((mob ? 80 : 180) * VF), 2.1, 7, 12, -150), .25, .55); }
      if (opt.aoi !== false && !QE.has("noaoi")) setTimeout(loadAoi, mob ? 1800 : 600);   /* v2：碧は植生のあと、少し間をおいて（最初の 2 秒の止まりを分ける） */
    }, { timeout: 1200 }); }));
  async function loadAoi() { try { const { VRMLoaderPlugin, VRMUtils } = await import("@pixiv/three-vrm"); const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(p => new VRMLoaderPlugin(p)).loadAsync(BASE + "aoi/aoi.vrm");
    const v = g.userData.vrm; VRMUtils.rotateVRM0?.(v); const N = n => v.humanoid.getNormalizedBoneNode(n);
    for (const sd of ["left", "right"]) { const sg = sd === "left" ? 1 : -1; N(sd + "UpperArm")?.rotation.set(-.06, sg * .06, sg * -1.3); N(sd + "LowerArm")?.rotation.set(0, sg * -.3, 0); }
    v.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); try { if (R.compileAsync) await R.compileAsync(v.scene, C, S); } catch (e) { } aoi.root.add(v.scene); aoi.vrm = v; api.emit("aoi", v); } catch (e) { console.warn("aoi", String(e && e.message || e)); } }
  return api;
}
