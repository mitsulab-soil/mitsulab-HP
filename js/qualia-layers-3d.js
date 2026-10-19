// Qualia Layer の 3D（2026-10-19 本人「レイヤーであることを表現するアニメーションに」「情報量を増やすレイヤーを３d上で表現」「中央に碧の３dモデル」）
// TOP の 3D の描画は二つまで：冒頭の場（参道）と、この層の図。前の「3D の循環の図」はこれと入れ替えた。
// ・画面に近づいてから読む（three・碧の VRM は冒頭の場と同じものを使い回す）・画面の外とタブを隠したときは止める・スマホは軽く（画素 1・アンチエイリアスなし・点を減らす）
// ・層は七枚（walk・sight・sound・touch・heart・rakugo・song）。スクロールで見えている札の番号まで一枚ずつ降りてきて重なり、重なるほど線と点（情報）が増える
// ・線と点は創作の模式（実測の値ではない）。碧は kit v5.9（uprightWeight:.9）
import * as THREE from 'three';

// 色は Qualia Layer の概念の文書（§5）の案：walk＝土・sight＝紫外の淡い紫・sound＝青・touch＝石の灰・heart＝墨（紺の地で見えるよう淡く）・rakugo＝朱・song＝光の白
const LAYERS = [
  { key: 'walk',   c: 0xc9a27a },
  { key: 'sight',  c: 0xc4b2ff },
  { key: 'sound',  c: 0x78b8ec },
  { key: 'touch',  c: 0xc2c7cc },
  { key: 'heart',  c: 0x9aa3b8 },
  { key: 'rakugo', c: 0xf08a6c },
  { key: 'song',   c: 0xf4fbff },
];

export async function boot(stage) {
  const mobile = innerWidth < 860 || matchMedia('(pointer:coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'ql3d';
  cv.setAttribute('aria-hidden', 'true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: !mobile, powerPreference: 'low-power' }); }
  catch (e) { return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5));
  R.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(cv);

  const S = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 60);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3, 6, 4); S.add(key);
  const rim = new THREE.DirectionalLight(0x8fe6f0, 1.1); rim.position.set(-4, 3, -3); S.add(rim);

  const SIZE = 5.2, GAP = .44, BASE = .28, N = LAYERS.length;
  const H = SIZE / 2;
  const add = THREE.AdditiveBlending;

  // 地：参道の線画（冒頭の場の静止画）を、いちばん下の一枚に
  // 第 0 層：いつもの風景（参道の一区画＝石畳と欅一本）
  const ground = new THREE.Group(); S.add(ground);
  {
    // 石畳（CC0：ambientCG PavingStones133。Qualia/walk 氷川の路面と同じ材・CC 管理台帳 M-0822）。縁は丸くぼかして、箱に入った模型に見せない
    const tl = new THREE.TextureLoader();
    const tex = tl.load('img/hero/3d/ql_paving_c.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 4);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .92, color: 0xb8b2a6, transparent: true });
    if (!mobile) { const n = tl.load('img/hero/3d/ql_paving_n.webp'); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(4, 4); mat.normalMap = n; mat.normalScale = new THREE.Vector2(.7, .7); }
    const ac = document.createElement('canvas'); ac.width = ac.height = 256; const ax = ac.getContext('2d');
    const gr = ax.createRadialGradient(128, 128, 20, 128, 128, 126); gr.addColorStop(0, '#fff'); gr.addColorStop(.5, '#eee'); gr.addColorStop(.8, '#555'); gr.addColorStop(1, '#000'); ax.fillStyle = gr; ax.fillRect(0, 0, 256, 256);
    mat.alphaMap = new THREE.CanvasTexture(ac);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 1.25, SIZE * 1.25), mat);
    m.rotation.x = -Math.PI / 2; ground.add(m);
  }
  (async () => {   // 欅一本（冒頭の場と同じ欅の模型。葉の画像はスマホでは読まない）
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]);
      const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
      const g = await gl.loadAsync('img/hero/3d/keyaki_lod1_notex.glb');
      const bark = new THREE.MeshStandardMaterial({ color: 0x8a7560, roughness: .9 });
      const leaf = new THREE.MeshStandardMaterial({ color: 0x6f8f5a, roughness: .8, side: THREE.DoubleSide, transparent: !mobile, opacity: mobile ? 1 : .92 });
      if (!mobile) { const t = await new THREE.TextureLoader().loadAsync('img/hero/3d/keyaki_leaf_atlas.png'); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; leaf.map = t; leaf.alphaTest = .45; leaf.transparent = false; leaf.color.set(0xb9cd97); }
      g.scene.updateMatrixWorld(true);
      const tree = new THREE.Group(); g.scene.traverse(o => { if (!o.isMesh) return; const mesh = new THREE.Mesh(o.geometry, /leaf|leaves/i.test(o.name) ? leaf : bark); mesh.applyMatrix4(o.matrixWorld); tree.add(mesh); });
      const bb = new THREE.Box3().setFromObject(tree), sz = bb.getSize(new THREE.Vector3()), sc = 3.3 / sz.y;
      tree.scale.setScalar(sc); tree.position.set(-1.45 - (bb.min.x + sz.x / 2) * sc, -bb.min.y * sc, -1.25 - (bb.min.z + sz.z / 2) * sc);
      ground.add(tree); window.__qlTree = { ok: true, h: 3.3, pos: tree.position.toArray().map(v => +v.toFixed(2)) }; kick();
    } catch (e) { window.__qlTree = { ok: false, e: String(e) }; console.warn('qualia layer tree', e); }
  })();
  // 碧が立つ、層を縦に貫く光の軸
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 4.2, 0)]), new THREE.LineBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
  S.add(axis);

  function frame(color, op) {
    const g = new THREE.BufferGeometry().setFromPoints([[-H, -H], [H, -H], [H, H], [-H, H]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
  }
  function lineMat(color, op) { return new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: add, depthWrite: false }); }
  function lines(color, op, list) {   // list: [[x,z],...][]
    const pos = [];
    for (const pts of list) for (let i = 0; i < pts.length - 1; i++) pos.push(pts[i][0], 0, pts[i][1], pts[i + 1][0], 0, pts[i + 1][1]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return new THREE.LineSegments(g, lineMat(color, op));
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  // 層ごとの「情報」：線と点の模式
  const builders = {
    walk(c) {   // 道すじと、時代ごとにずれる線
      const g = new THREE.Group();
      const path = o => { const p = []; for (let i = 0; i <= 60; i++) { const t = i / 60; p.push([lerp(-H * .9, H * .9, t), Math.sin(t * Math.PI * 1.4 + .4) * 1.1 + o]); } return p; };
      g.add(lines(c, .9, [path(0)]));
      g.add(lines(c, .35, [path(.28), path(-.28), path(.56), path(-.56)]));
      const ticks = []; for (let i = 1; i < 9; i++) { const t = i / 9, x = lerp(-H * .9, H * .9, t), z = Math.sin(t * Math.PI * 1.4 + .4) * 1.1; ticks.push([[x, z - .18], [x, z + .18]]); }
      g.add(lines(c, .7, ticks));
      return { g };
    },
    sight(c) {   // 生き物の目に映る色：紫外から緑・黄へ
      const n = mobile ? 26 : 38, pos = [], col = [];
      const A = new THREE.Color(0x9b7bff), B = new THREE.Color(0x7fe0b4), C = new THREE.Color(0xf2e08c), tmp = new THREE.Color();
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = lerp(-H * .92, H * .92, i / (n - 1)), z = lerp(-H * .92, H * .92, j / (n - 1));
        const v = .5 + .5 * Math.sin(x * 1.3 + Math.cos(z * 1.7) * 1.6);
        if (v < .18) continue;
        pos.push(x, 0, z);
        if (v < .55) tmp.copy(A).lerp(B, v / .55); else tmp.copy(B).lerp(C, (v - .55) / .45);
        col.push(tmp.r, tmp.g, tmp.b);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({ size: mobile ? .06 : .05, vertexColors: true, transparent: true, opacity: .9, blending: add, depthWrite: false });
      const p = new THREE.Points(geo, m);
      return { g: p, tick(t) { m.size = (mobile ? .06 : .05) * (1 + .18 * Math.sin(t * 1.6)); } };
    },
    sound(c) {   // 音の波
      const K = mobile ? 6 : 9, M = 72, geo = new THREE.BufferGeometry(), pos = new Float32Array(K * (M - 1) * 2 * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const ln = new THREE.LineSegments(geo, lineMat(c, .75));
      const upd = t => {
        let k = 0;
        for (let w = 0; w < K; w++) {
          const z0 = lerp(-H * .8, H * .8, w / (K - 1)), amp = .12 + .1 * Math.sin(w * 1.7), f = 2.2 + w * .35;
          let px, pz;
          for (let i = 0; i < M; i++) {
            const x = lerp(-H * .92, H * .92, i / (M - 1)), z = z0 + Math.sin(x * f + t * 2.1 + w) * amp;
            if (i) { pos[k++] = px; pos[k++] = 0; pos[k++] = pz; pos[k++] = x; pos[k++] = 0; pos[k++] = z; }
            px = x; pz = z;
          }
        }
        geo.attributes.position.needsUpdate = true;
      };
      upd(0);
      return { g: ln, tick: upd };
    },
    touch(c) {   // 振動の等高線（中心から広がる輪）
      const g = new THREE.Group(), rings = [];
      for (let i = 0; i < 7; i++) {
        const pts = []; for (let a = 0; a <= 72; a++) { const th = a / 72 * Math.PI * 2, r = 1 + .06 * Math.sin(th * 5 + i); pts.push(new THREE.Vector3(Math.cos(th) * r, 0, Math.sin(th) * r)); }
        const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat(c, .7)); l.position.set(.9, 0, -.6); g.add(l); rings.push(l);
      }
      return { g, tick(t, e) { rings.forEach((l, i) => { const s = ((t * .22 + i / rings.length) % 1); const r = .15 + s * 2.1; l.scale.set(r, 1, r); l.material.opacity = .75 * (1 - s) * e; }); } };
    },
    heart(c) {   // ことば（書の層）：筆の運びの線（3D の中に文字は描かない）
      const list = [];
      for (let k = 0; k < 6; k++) { const x0 = -H * .75 + k * .52, pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([x0 + Math.sin(t * 3.1 + k) * .18, -H * .7 + t * H * 1.4 + Math.sin(t * 9 + k * 2) * .05]); } list.push(pts); }
      const l = lines(c, .8, list);
      return { g: l, tick(t, e) { l.material.opacity = .8 * e * (.8 + .2 * Math.sin(t * .9)); } };
    },
    rakugo(c) {   // 語り：一点から広がる弧（声の届き方）
      const list = [];
      for (let k = 1; k <= 8; k++) { const r = k * .36, pts = []; for (let a = 0; a <= 40; a++) { const th = -1.05 + a / 40 * 2.1; pts.push([-H * .85 + Math.cos(th) * r, Math.sin(th) * r]); } list.push(pts); }
      const l = lines(c, .6, list);
      return { g: l, tick(t, e) { l.material.opacity = .6 * e * (.75 + .25 * Math.sin(t * 1.3)); } };
    },
    song(c) {   // 歌：光の柱
      const g = new THREE.Group(), cols = [], cnt = mobile ? 9 : 14;
      for (let i = 0; i < cnt; i++) {
        const a = i / cnt * Math.PI * 2, r = 1.2 + (i % 3) * .55, h = .5 + (i % 4) * .22;
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h, 0)]);
        const l = new THREE.Line(geo, lineMat(c, .8)); l.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.add(l); cols.push(l);
      }
      return { g, tick(t) { cols.forEach((l, i) => { l.scale.y = .55 + .45 * (.5 + .5 * Math.sin(t * 1.4 + i)); }); } };
    },
  };

  // 375px では、線と点の情報を描くのは三枚（walk・sight・sound）まで。四枚目からは板の枠だけ（数と絵をそろえ、軽く）
  const layers = LAYERS.map((L, i) => {
    const grp = new THREE.Group(); grp.position.y = BASE + i * GAP;
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshBasicMaterial({ color: L.c, transparent: true, opacity: .045, depthWrite: false, side: THREE.DoubleSide }));
    fill.rotation.x = -Math.PI / 2; grp.add(fill);
    const fr = frame(L.c, .75); grp.add(fr);
    const info = (mobile && i >= 3) ? { g: new THREE.Group() } : builders[L.key](L.c); grp.add(info.g);
    S.add(grp);
    const mats = []; grp.traverse(o => { if (o.material) { mats.push([o.material, o.material.opacity]); } });
    return { grp, info, mats, t: 0, y0: grp.position.y };
  });

  // 碧（中央に立つ）：冒頭の場と同じ VRM のバイト列を使い回す
  let mot = null, vrm = null;
  (async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'), import('@pixiv/three-vrm')]);
      const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder); L.register(p => new V.VRMLoaderPlugin(p));
      const buf = await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())));
      const g = await L.parseAsync(buf.slice(0), '');
      vrm = g.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(g.scene); V.VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      const pivot = new THREE.Group(); pivot.add(vrm.scene); S.add(pivot);
      vrm.humanoid.resetNormalizedPose(); vrm.update(0);
      const bb = new THREE.Box3().setFromObject(vrm.scene), h = bb.max.y - bb.min.y;
      const s = 2.1 / h; pivot.scale.setScalar(s);   // 人の背丈（参道の欅と釣り合う大きさ）。光の軸の上に立つ
      const { AoiMotion } = await import('./aoi_motion.js?v=20261019-v59');
      mot = new AoiMotion(vrm, { root: pivot, wind: .25, faceViewer: false, startCalm: 1, posture: 'upright', uprightWeight: .9 });
      stage.classList.add('has-aoi');
      kick();
    } catch (e) { console.warn('qualia layer aoi', e); }
  })();

  // 見えている札の番号（0〜7）。インラインの小さな script が送ってくる
  let target = window.__qlayerK || 0;
  document.addEventListener('qlayer', e => { target = e.detail; kick(); });

  let W = 0, Hh = 0;
  const size = () => { W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix(); };
  new ResizeObserver(() => { size(); render(performance.now()); }).observe(cv); size();

  let vis = true, raf = 0, last = performance.now(), t0 = last;
  const fps = { n: 0, t: last, v: 0 };
  window.__qlayers3d = { get fps() { return fps.v; }, get layers() { return layers.filter(l => l.t > .5).length; }, get aoi() { return !!vrm; } };

  function render(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
    const all = target >= LAYERS.length;
    layers.forEach((L, i) => {
      const on = (reduce ? true : i < target) ? 1 : 0;
      L.grp.rotation.y += (((all && !reduce) ? (i - (layers.length - 1) / 2) * .07 : 0) - L.grp.rotation.y) * Math.min(1, dt * 2);
      L.t += (on - L.t) * (reduce ? 1 : Math.min(1, dt * 3.2));
      const e = L.t * L.t * (3 - 2 * L.t);
      L.grp.position.y = L.y0 + (1 - e) * 1.4;
      L.grp.visible = L.t > .01;
      L.mats.forEach(([m, op]) => { m.opacity = op * e; });
      if (L.info.tick && L.grp.visible && !reduce) L.info.tick(t, e);
    });
    const k = layers.reduce((a, L) => a + L.t, 0);
    const ang = -.7 + (reduce ? 0 : t * .05) + k * .05, rad = mobile ? 9.8 : 9.4, hy = 3.2 + k * .26;
    cam.position.set(Math.sin(ang) * rad, hy, Math.cos(ang) * rad);
    cam.lookAt(0, 1.45 + k * .05, 0);
    if (mot) { mot.faceTo(Math.sin(t * .2) * .35); mot.update(dt, cam); }
    R.render(S, cam);
    fps.n++; if (now - fps.t > 1000) { fps.v = Math.round(fps.n * 1000 / (now - fps.t)); fps.n = 0; fps.t = now; }
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { vis = es[0].isIntersecting; kick(); }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); stage.classList.remove('has-3d'); });
  stage.classList.add('has-3d');
  kick();
}
