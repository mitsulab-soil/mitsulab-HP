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

  let aoiPivot = null, person = null, standY = 0;
  const SIZE = 5.2, GAP = .62, N = LAYERS.length;   // 2026-10-20 本人「潜る」：第 0 層（いつもの風景）がいちばん上、その下へ層が重なる
  const H = SIZE / 2;
  const add = THREE.AdditiveBlending;

  // 地：参道の線画（冒頭の場の静止画）を、いちばん下の一枚に
  // 第 0 層：いつもの風景（参道の一区画＝石畳と欅一本）
  // 潜る：碧と主体と見る人はその場にとどまり、層の世界のほうが上へ送られていく（＝一枚ずつ下へ潜る）。碧の足の置き方（AoiMotion）を崩さないため
  const world = new THREE.Group(); S.add(world);
  const ground = new THREE.Group(); world.add(ground);
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
  if (!mobile) (async () => {   // 欅一本（冒頭の場と同じ欅の模型）。スマホでは葉の画像なしだと粗く見えるので、欅は置かず石畳と板だけにする
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
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 2.4, 0), new THREE.Vector3(0, -(N + 1) * GAP, 0)]), new THREE.LineBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
  world.add(axis);
  // 積層の足場：四隅の縦の線と、層ごとの目盛り（横から見て何枚重なっているかが分かる）
  {
    const pos = [], bottom = -(N + .6) * GAP;
    for (const [x, z] of [[-H, -H], [H, -H], [H, H], [-H, H]]) pos.push(x, 0, z, x, bottom, z);
    for (let i = 0; i <= N; i++) { const y = -i * GAP, L = i ? .34 : .5; pos.push(-H, y, H, -H - L, y, H, -H, y, H, -H, y, H + L); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    world.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x8bccca, transparent: true, opacity: .32, depthWrite: false })));
  }
  // いちばん深いところ：Qualium の光
  const deep = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), new THREE.MeshBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  deep.rotation.x = -Math.PI / 2; deep.position.y = -(N + .9) * GAP; world.add(deep);
  // 主体 S：碧のそばに立つ一人（点で描いた人のかたち。特定の人ではない）
  {
    const pts = [], add = (cx, cy, cz, rx, ry, rz, n) => { for (let i = 0; i < n; i++) { const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1); pts.push(cx + rx * Math.sin(v) * Math.cos(u), cy + ry * Math.cos(v), cz + rz * Math.sin(v) * Math.sin(u)); } };
    const n = mobile ? 1 : 2;
    add(0, 1.86, 0, .12, .14, .12, 160 * n); add(0, 1.38, 0, .2, .3, .13, 320 * n); add(0, .78, 0, .17, .36, .12, 300 * n);
    add(-.27, 1.3, 0, .06, .3, .06, 90 * n); add(.27, 1.3, 0, .06, .3, .06, 90 * n);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    person = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf4aa96, size: .022, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
    person.position.set(.75, 0, .35); S.add(person);
  }

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
    const grp = new THREE.Group(); grp.position.y = -(i + 1) * GAP;
    // 厚みのある板（横から見ると断面が見える）＋板の下の薄い陰（重なりの濃さ）
    const slabG = new THREE.BoxGeometry(SIZE, .13, SIZE);
    const fill = new THREE.Mesh(slabG, new THREE.MeshBasicMaterial({ color: L.c, transparent: true, opacity: .14, depthWrite: false }));
    grp.add(fill);
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(slabG), new THREE.LineBasicMaterial({ color: L.c, transparent: true, opacity: .9, depthWrite: false })));
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * .98, SIZE * .98), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide }));
    shade.rotation.x = -Math.PI / 2; shade.position.y = -.1; grp.add(shade);
    const lift = new THREE.Group(); lift.position.y = .075; grp.add(lift);
    const info = (mobile && i >= 3) ? { g: new THREE.Group() } : builders[L.key](L.c); lift.add(info.g);
    world.add(grp);
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
      const s = 2.1 / h; pivot.scale.setScalar(s);    // 光の軸（x=0）の上に立ち、見る人と一緒に下の層へ降りていく   // 人の背丈（参道の欅と釣り合う大きさ）。いちばん上の第 0 層に立ち、光の軸が足もとから下の層を貫く
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
      L.t += (on - L.t) * (reduce ? 1 : Math.min(1, dt * 3.2));
      const e = L.t * L.t * (3 - 2 * L.t);
      L.grp.position.y = L.y0 - (1 - e) * .9;   // 下から浮かび上がって、その位置に重なる
      L.grp.visible = L.t > .01;
      L.mats.forEach(([m, op]) => { m.opacity = op * e; });
      if (L.info.tick && L.grp.visible && !reduce) L.info.tick(t, e);
    });
    const k = layers.reduce((a, L) => a + L.t, 0);
    deep.material.opacity += ((all ? .32 : 0) - deep.material.opacity) * Math.min(1, dt * 2);
    // 見る人が、層を一枚ずつ下へ潜っていく（k＝重なった枚数。動きを減らす設定では真ん中の深さで止める）
    const d = reduce ? N / 2 : k;
    // 碧と主体は、いま重なった層の上へ降りる（第 0 層＝ y 0 から、層 k の上面へ）
    const sTarget = reduce ? 0 : -Math.max(0, Math.round(target <= LAYERS.length ? Math.min(target, LAYERS.length) : 0)) * GAP + (target > 0 ? .07 : 0);
    standY += (sTarget - standY) * Math.min(1, dt * 1.8);
    world.position.y = -standY;   // 層の世界を上へ送る（碧と主体は、いま重なった層の上に立つ）
    const lookY = .9 - Math.min(1, d) * .35;
    const ang = -.62 + (reduce ? 0 : t * .04), rad = mobile ? 9.6 : 8.6;
    cam.position.set(Math.sin(ang) * rad, lookY + (mobile ? 2.5 : 2.1), Math.cos(ang) * rad);
    cam.lookAt(0, lookY, 0);
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
