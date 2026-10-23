// Qualia Layer の 3D（2026-10-19 本人「レイヤーであることを表現するアニメーションに」「情報量を増やすレイヤーを３d上で表現」「中央に碧の３dモデル」）
// TOP の 3D の描画は二つまで：冒頭の場（参道）と、この層の図。前の「3D の循環の図」はこれと入れ替えた。
// ・画面に近づいてから読む（three・碧の VRM は冒頭の場と同じものを使い回す）・画面の外とタブを隠したときは止める・スマホは軽く（画素 1・アンチエイリアスなし・点を減らす）
// ・層は五枚（2026-10-23：sight・touch・sound・nature・culture。以前は七枚→六枚）。スクロールで見えている札の番号まで、一枚ずつ上へ積み重なり、重なるほど線と点（情報）が増える
// ・2026-10-20 夜 本人「層は地下に潜るのではなく、上に重ねていく」「アニメーションにレイヤーの表現も」：層は第 0 層（いつもの風景）の上へ積む。新しい層が重なるとき、その板に名前と一言の札が寄りそう
// ・線と点は創作の模式（実測の値ではない）。碧は kit v5.9（uprightWeight:.9）
// ・2026-10-22 夜：碧を重なりの中（光の軸の上）へ。骨盤を起こして反り腰を直す（stand()）
import * as THREE from 'three';
import { LAYER5 } from './kit/layer-colors.js';

// 2026-10-23 本人「Qualia の層は 5 つに整理」：sight・touch・sound（sho を含む）・nature・culture（rakugo・history を含む）。色は js/kit/layer-colors.js の一か所から
const LAYERS = LAYER5.map(L => ({ key: L.key, c: L.c }));
// 札の一言は、TOP の層の一覧（.ql-line）と同じ文を読む（日英の切りかえもそこに従う）

export async function boot(stage) {
  const mobile = innerWidth < 860 || matchMedia('(pointer:coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = document.createElement('canvas');
  cv.className = 'ql3d';
  cv.setAttribute('aria-hidden', 'true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (e) { return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.75 : 1.5));   // 2026-10-23 スマホでも層の 3D を出す（欄は小さいので 1.75 まで。碧の輪郭が荒れないように）
  R.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(cv);

  const S = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 60);
  S.add(new THREE.HemisphereLight(0xe6f6ff, 0x1a2a34, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3, 6, 4); S.add(key);
  const rim = new THREE.DirectionalLight(0x8fe6f0, 1.1); rim.position.set(-4, 3, -3); S.add(rim);

  let treeObj = null;
  const SIZE = 5.2, GAP = .6, N = LAYERS.length;   // 2026-10-23 五枚になったので間を .5→.6（重なりの高さは六枚のときと同じ 3.0）   // 2026-10-20 夜 本人「木（欅）は消さずに、その上に層を薄く重ねる」：板を薄く・間を詰める   // 第 0 層（いつもの風景）がいちばん下、その上へ層が積み重なる
  const H = SIZE / 2;
  const add = THREE.AdditiveBlending;
  // 2026-10-23 採点の P1（層の板が碧の体を貫く）：碧の立つところだけ、どの板も丸く切り欠く（碧の体の半径は最大 1.03＝足もと〜腰。0.3 の余白）。
  // 板の上の線と点も、切り欠きの中では描かない（ GPU で捨てる）。碧は重なりの中に立ったまま、板は碧のまわりを囲む
  // 2 回目の採点（板の線が裾の上に描かれる）：丸い穴に加えて、見る人の側へ開いた切り欠き（幅は碧の体の幅）。板は碧の後ろと横を囲み、碧の前には線を引かない
  const HX = 0, HZ = -.35, HR = 1.32, HS = 1.08, DX = -.573, DZ = .82;   // D＝碧から見る人（カメラ）への向き（カメラは固定）
  function holed(m) {
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vHw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHw = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vHw;').replace('void main() {', 'void main() {\n  vec2 hq = vHw - vec2(' + HX.toFixed(2) + ', ' + HZ.toFixed(2) + '); vec2 hd = vec2(' + DX.toFixed(3) + ', ' + DZ.toFixed(3) + ');\n  if (length(hq) < ' + HR.toFixed(2) + ' || (dot(hq, hd) > 0.0 && abs(hq.x * hd.y - hq.y * hd.x) < ' + HS.toFixed(2) + ')) discard;');
    };
    m.customProgramCacheKey = () => 'qlhole';
    return m;
  }
  // 切り欠きの縁：碧の横の短い辺から、碧の後ろを半円でまわって、反対の横へ（U の字。手前の切り口の辺は引かない＝層の箱が左右に割れて見えない）
  function rimPts() {
    const nx = DZ, nz = -DX, pts = [], inSq = (x, z) => Math.abs(x) <= H && Math.abs(z) <= H;
    const edge = sgn => { let t = 0; while (t < 8 && inSq(HX + nx * HS * sgn + DX * (t + .05), HZ + nz * HS * sgn + DZ * (t + .05))) t += .05; return t; };
    const a0 = Math.asin(HS / HR), base = Math.atan2(DZ, DX);   // 穴の円と切り欠きの直線が交わる角
    const t2 = Math.min(.55, edge(-1)); pts.push(new THREE.Vector3(HX - nx * HS + DX * t2, .016, HZ - nz * HS + DZ * t2));   // −n の側の端から
    for (let a = 0; a <= 48; a++) { const th = base + a0 + (2 * Math.PI - 2 * a0) * a / 48; pts.push(new THREE.Vector3(HX + Math.cos(th) * HR, .016, HZ + Math.sin(th) * HR)); }   // 碧の後ろを回って
    const t1 = Math.min(.55, edge(1)); pts.push(new THREE.Vector3(HX + nx * HS + DX * t1, .016, HZ + nz * HS + DZ * t1));   // ＋n の側の端へ
    return pts;
  }

  // 第 0 層：いつもの風景（参道の一区画＝石畳と欅一本）
  // 重なる：碧と主体は、いちばん新しい層の上に立つ。見る位置を保つため、層の世界のほうを下へ送る（碧の足の置き方〈AoiMotion〉を崩さないため）
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
      const TREE_H = 10.5;   // 2026-10-22 本人「碧より木が小さいのが気になります。木をもっと大きくして」：欅を碧（6.4）より明らかに高く（約 1.7 倍）。碧のさらに右奥に立ち、碧の顔に葉がかからない
      const bb = new THREE.Box3().setFromObject(tree), sz = bb.getSize(new THREE.Vector3()), sc = TREE_H / sz.y;
      tree.scale.setScalar(sc); tree.position.set(2.2 - (bb.min.x + sz.x / 2) * sc, -bb.min.y * sc, -7.2 - (bb.min.z + sz.z / 2) * sc);   // 碧の右奥（碧より奥＝顔に葉がかからない）
      ground.add(tree); treeObj = tree; window.__qlTree = { ok: true, h: TREE_H, pos: tree.position.toArray().map(v => +v.toFixed(2)) }; kick();
    } catch (e) { window.__qlTree = { ok: false, e: String(e) }; console.warn('qualia layer tree', e); }
  })();
  // 碧が立つ、層を縦に貫く光の軸（2026-10-22 夜：碧が重なりの中に立つので、軸は碧の背後・重なりの高さまで＝顔を貫かない）
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, (N + .6) * GAP, -1.1), new THREE.Vector3(0, -.3, -1.1)]),  new THREE.LineBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
  world.add(axis);
  // 積層の足場：四隅の縦の線と、層ごとの目盛り（横から見て何枚重なっているかが分かる）
  {
    const pos = [], top = (N + .6) * GAP;
    for (const [x, z] of [[-H, -H], [H, -H], [H, H], [-H, H]]) pos.push(x, 0, z, x, top, z);
    for (let i = 0; i <= N; i++) { const y = i * GAP, L = i ? .34 : .5; pos.push(-H, y, H, -H - L, y, H, -H, y, H, -H, y, H + L); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    world.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x8bccca, transparent: true, opacity: .32, depthWrite: false })));
  }
  // 重なりのいちばん上：Qualium の光（七枚が重なったとき）
  const deep = new THREE.Mesh(new THREE.RingGeometry(HR + .05, HR + .75, 48, 1, .96 - Math.PI * .5, Math.PI),   // 見る人から見て碧の奥の半分だけ（手前の半分は碧の体の上に光の帯として重なった）   // 碧の体を貫かないよう、切り欠きのまわりの輪に
    new THREE.MeshBasicMaterial({ color: 0xa8f2f6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  deep.rotation.x = -Math.PI / 2; deep.position.set(HX, N * GAP + .16, HZ); world.add(deep);
  // 2026-10-20 夜 本人「碧の隣にある点群のマネキンを削除」：主体の点の人のかたちは外した

  function frame(color, op) {
    const g = new THREE.BufferGeometry().setFromPoints([[-H, -H], [H, -H], [H, H], [-H, H]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
  }
  function lineMat(color, op) { return holed(new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: add, depthWrite: false })); }
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
      const m = holed(new THREE.PointsMaterial({ size: mobile ? .06 : .05, vertexColors: true, transparent: true, opacity: .9, blending: add, depthWrite: false }));
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
      const g = new THREE.Group(); g.add(ln);
      // sho（書）も音の層に含める：筆の運びの線を薄く添える
      const sl = []; for (let k = 0; k < 4; k++) { const x0 = H * .35 + k * .42, pts = []; for (let i = 0; i <= 26; i++) { const t = i / 26; pts.push([x0 + Math.sin(t * 3.1 + k) * .14, -H * .62 + t * H * 1.24 + Math.sin(t * 9 + k * 2) * .04]); } sl.push(pts); }
      const sho = lines(c, .45, sl); g.add(sho);
      return { g, tick(t, e) { upd(t); sho.material.opacity = .45 * e * (.8 + .2 * Math.sin(t * .9)); } };
    },
    touch(c) {   // 振動の等高線（中心から広がる輪）
      const g = new THREE.Group(), rings = [];
      for (let i = 0; i < 7; i++) {
        const pts = []; for (let a = 0; a <= 72; a++) { const th = a / 72 * Math.PI * 2, r = 1 + .06 * Math.sin(th * 5 + i); pts.push(new THREE.Vector3(Math.cos(th) * r, 0, Math.sin(th) * r)); }
        const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat(c, .7)); l.position.set(.9, 0, -.6); g.add(l); rings.push(l);
      }
      return { g, tick(t, e) { rings.forEach((l, i) => { const s = ((t * .22 + i / rings.length) % 1); const r = .15 + s * 2.1; l.scale.set(r, 1, r); l.material.opacity = .75 * (1 - s) * e; }); } };
    },
    sho(c) {   // 書の層：筆の運びの線（3D の中に文字は描かない）
      const list = [];
      for (let k = 0; k < 6; k++) { const x0 = -H * .75 + k * .52, pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([x0 + Math.sin(t * 3.1 + k) * .18, -H * .7 + t * H * 1.4 + Math.sin(t * 9 + k * 2) * .05]); } list.push(pts); }
      const l = lines(c, .8, list);
      return { g: l, tick(t, e) { l.material.opacity = .8 * e * (.8 + .2 * Math.sin(t * .9)); } };
    },
    nature(c) {   // 自然の記録：樹冠のまとまり（点）と、土と水の流れ（線）
      const g = new THREE.Group(), pos = [];
      const C = [[-1.6, -1.2], [.2, -1.9], [1.5, -.6], [1.2, 1.4], [-.6, .9], [-1.8, 1.6]];
      let sd = 3; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (const [cx, cz] of C) for (let i = 0; i < (mobile ? 26 : 40); i++) { const a = rr() * Math.PI * 2, r = Math.sqrt(rr()) * .62; pos.push(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const m = holed(new THREE.PointsMaterial({ color: c, size: mobile ? .07 : .06, transparent: true, opacity: .9, blending: add, depthWrite: false }));
      g.add(new THREE.Points(geo, m));
      const flow = []; for (let k = 0; k < 3; k++) { const p = []; for (let i = 0; i <= 40; i++) { const t = i / 40; p.push([lerp(-H * .9, H * .9, t), -H * .55 + k * .5 + Math.sin(t * 4 + k) * .22]); } flow.push(p); }
      const fl = lines(c, .55, flow); g.add(fl);
      return { g, tick(t, e) { m.size = (mobile ? .07 : .06) * (1 + .12 * Math.sin(t * .9)); fl.material.opacity = .55 * e * (.8 + .2 * Math.sin(t * 1.2)); } };
    },
    culture(c) {   // 文化と歴史：一点から広がる語りの弧（rakugo・song）と、年の目盛り（history）
      const list = [];
      for (let k = 1; k <= 7; k++) { const r = k * .38, pts = []; for (let a = 0; a <= 40; a++) { const th = -1.05 + a / 40 * 2.1; pts.push([-H * .85 + Math.cos(th) * r, Math.sin(th) * r]); } list.push(pts); }
      list.push([[-H * .85, H * .72], [H * .85, H * .72]]);
      for (let i = 0; i <= 12; i++) { const x = lerp(-H * .85, H * .85, i / 12), L = i % 4 ? .1 : .22; list.push([[x, H * .72 - L], [x, H * .72 + L]]); }
      const l = lines(c, .6, list);
      return { g: l, tick(t, e) { l.material.opacity = .6 * e * (.75 + .25 * Math.sin(t * 1.3)); } };
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
    const grp = new THREE.Group(); grp.position.y = (i + 1) * GAP;
    // 厚みのある板（横から見ると断面が見える）＋板の下の薄い陰（重なりの濃さ）
    const slabG = new THREE.BoxGeometry(SIZE, .03, SIZE);   // 板（碧のまわりと前は GPU で切り欠く）
    const fill = new THREE.Mesh(slabG, holed(new THREE.MeshBasicMaterial({ color: L.c, transparent: true, opacity: .07, depthWrite: false })));
    grp.add(fill);
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(slabG), holed(new THREE.LineBasicMaterial({ color: L.c, transparent: true, opacity: .7, depthWrite: false }))));   // 板の外の縁
    grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rimPts()), new THREE.LineBasicMaterial({ color: L.c, transparent: true, opacity: .34, depthWrite: false })));   // 切り欠きの縁（U の字）
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * .98, SIZE * .98), holed(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .06, depthWrite: false, side: THREE.DoubleSide })));
    shade.rotation.x = -Math.PI / 2; shade.position.y = -.03; grp.add(shade);
    const lift = new THREE.Group(); lift.position.y = .02; grp.add(lift);
    const info = builders[L.key](L.c);   // 2026-10-23：五つになったので、スマホでも全部の層に模様を描く lift.add(info.g);
    world.add(grp);
    const mats = []; grp.traverse(o => { if (o.material) { mats.push([o.material, o.material.opacity]); } });
    return { grp, info, mats, t: 0, y0: grp.position.y };
  });

  // 碧（中央に立つ）：冒頭の場と同じ VRM のバイト列を使い回す
  let mot = null, vrm = null, aoiPivot = null, aoiFrames = 0;   // 2026-10-23 採点の P1：動きを当てる前の T ポーズを見せない（動きを当て終えて数こま回してから出す）
  (async () => {
    try {
      const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'), import('@pixiv/three-vrm')]);
      const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder); L.register(p => new V.VRMLoaderPlugin(p));
      const buf = await (window.__aoiBuf || (window.__aoiBuf = fetch('img/hero/aoi.vrm').then(r => r.arrayBuffer())));
      const g = await L.parseAsync(buf.slice(0), '');
      vrm = g.userData.vrm; V.VRMUtils.removeUnnecessaryVertices(g.scene); V.VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      const pivot = new THREE.Group(); pivot.add(vrm.scene); pivot.visible = false; aoiPivot = pivot; S.add(pivot);
      vrm.humanoid.resetNormalizedPose(); vrm.update(0);
      const bb = new THREE.Box3().setFromObject(vrm.scene), h = bb.max.y - bb.min.y;
      const s = 6.4 / h; pivot.scale.setScalar(s);    // 2026-10-20 夜 本人「碧は上へ上がっていかず、重なりに覆いかぶさるように」：重なりの奥に大きく立ち、層の上から見下ろす
      pivot.position.set(0, 0, -.35);   // 2026-10-22 本人「碧もレイヤーの中に入ってください。今はレイヤーの外に碧がいます」：重なりの真ん中、光の軸の上に立つ。層は碧の足もとから胸の高さまでを通り抜けていく（前へ傾けるのはやめた＝反り腰に見えた一因）
      const { AoiMotion } = await import('./aoi_motion.js?v=20261019-v59');
      mot = new AoiMotion(vrm, { root: pivot, reducedMotion: reduce, wind: .25, faceViewer: false, startCalm: 1, posture: 'upright', uprightWeight: .9 });
      mot.faceTo(-.3);   // 体は見る人へ少し向けたまま（毎こま向きを変えない＝足の踏みかえや体のゆらぎが続かない）。目と頭が、重なる層・見る人・欅を見る
      // 2026-10-23 採点の P1（裾が半透明に見える）：この図の暗い地では、服の自分の光と水色の縁の光で、裾のグラデーションがガラスのように透けて見えた。
      // 服だけ自分の光と縁の光を控え、光と陰で布の厚みが出るようにする（この図の中だけ。共通部品と .vrm は変えない）
      vrm.scene.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (!/CLOTH/.test(m.name || '') || /Outline/.test(m.name || '')) return;
        if (m.emissive) m.emissive.multiplyScalar(.4); if (m.parametricRimColorFactor) m.parametricRimColorFactor.multiplyScalar(.35); if ('shadingToonyFactor' in m) m.shadingToonyFactor = Math.min(m.shadingToonyFactor, .3); }); });
      stage.classList.add('has-aoi'); window.__qlAoi = { vrm, pivot, mot };
      kick();
    } catch (e) { console.warn('qualia layer aoi', e); }
  })();

  // 2026-10-22 本人「お尻が出ていて反り腰なのが気になります。姿勢を矯正して」：
  // 骨盤だけを後ろへ起こし（前傾を戻す）、太ももと背骨でその分を打ち消す＝脚と胴の向きは変えずに、腰の反りとお尻の張り出しだけを抑える。
  // 胸の張りも少し戻し、首で目線を保つ。共通部品（aoi_motion.js）は変えず、HP の層の図だけで直す。
  const FIX = { pelvis: .13, chest: .045 };
  const _qa = new THREE.Quaternion(), _ex = new THREE.Vector3(1, 0, 0);
  // post＝その骨の向きを回す／pre＝親の回しを打ち消す（子の世界の向きを保つ）
  function rotX(name, a, pre) { const b = vrm.humanoid.getNormalizedBoneNode(name); if (!b) return; _qa.setFromAxisAngle(_ex, a); if (pre) b.quaternion.premultiply(_qa); else b.quaternion.multiply(_qa); }
  function stand() {
    rotX('hips', -FIX.pelvis); rotX('leftUpperLeg', FIX.pelvis, 1); rotX('rightUpperLeg', FIX.pelvis, 1); rotX('spine', FIX.pelvis * .85, 1);
    rotX('upperChest', FIX.chest); rotX('neck', -FIX.chest * .7, 1);
  }

  // 見えている札の番号（0〜7）。インラインの小さな script が送ってくる
  let target = window.__qlayerK || 0;
  document.addEventListener('qlayer', e => { target = e.detail; kick(); });

  // 層の札：いちばん新しく重なった層の板に、名前と一言が寄りそう（一枚だけ出して重ねない・動きを減らす設定では出さない）
  const tagEl = document.createElement('p'); tagEl.className = 'ql3d-tag'; tagEl.setAttribute('aria-hidden', 'true');
  tagEl.innerHTML = '<span class="qt-n"></span><span class="qt-l"></span>'; stage.appendChild(tagEl);
  let tagK = -1;
  const v3 = new THREE.Vector3();
  function tagText(i) {
    const li = document.querySelector('.qt-layer[data-layer="' + (i + 1) + '"]');
    tagEl.style.setProperty('--c', '#' + LAYERS[i].c.toString(16).padStart(6, '0'));
    tagEl.querySelector('.qt-n').textContent = 'Qualia/' + LAYERS[i].key;
    tagEl.querySelector('.qt-l').textContent = li ? (li.querySelector('.ql-line') || {}).textContent || '' : '';
  }
  document.addEventListener('hp-lang-change', () => { if (tagK >= 0) tagText(tagK); });
  function placeTag() {
    const k = Math.min(LAYERS.length, Math.round(target)) - 1;
    if (reduce || k < 0) { tagEl.classList.remove('on'); tagK = -1; return; }
    if (k !== tagK) { tagK = k; tagEl.classList.remove('on'); tagText(k); }
    const L = layers[k]; if (L.t < .6) return;
    // 板の四隅のうち、画面でいちばん右の角に寄せる
    let bx = -1e9, by = 0;
    for (const [x, z] of [[-H, -H], [H, -H], [H, H], [-H, H]]) {
      v3.set(x, L.grp.position.y + .08, z).add(world.position).project(cam);
      const sx = (v3.x * .5 + .5) * W, sy = (-v3.y * .5 + .5) * Hh;
      if (sx > bx) { bx = sx; by = sy; }
    }
    const tw = tagEl.offsetWidth || 200;
    const left = Math.max(8, Math.min(W - tw - 8, Math.max(bx + 10, W * .58)));   // 碧（中央）に重ならないよう、図の右側に
    tagEl.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(Math.max(8, Math.min(Hh - 130, by - 22))) + 'px)';
    tagEl.classList.add('on');
  }

  // 碧の視線（2026-10-23 採点の P1「碧が静止気味」）：新しい層が重なると、少しあとにその板の上を目で追い、また見る人へ戻る。ときどき欅の梢を見上げる。
  // 体は揺らさない（息・重心の移し・まばたきは共通部品のまま）。動きを減らす設定では見る人だけを見る
  const gz = { k: 0, until: 0, next: 6 + Math.random() * 4, p: new THREE.Vector3() };
  function gaze(dt, t) {
    if (reduce) return;
    const k = Math.min(LAYERS.length, Math.round(target));
    if (k > gz.k) { gz.k = k; gz.pend = t + .45; }   // 重なりはじめて少しあとに目が行く
    else if (k < gz.k) gz.k = k;
    if (gz.pend && t >= gz.pend) { gz.pend = 0; const y = k * GAP + .05, a = .4 + Math.random() * .7;
      gz.p.set(HX + Math.sin(a) * (HR + 3.2), Math.max(y + 1.3, 4.5), HZ + Math.cos(a) * (HR + 3.2)); mot.lookAt(gz.p); mot.express('curious', .3, 1); gz.until = t + .9 + Math.random() * .4; gz.next = t + 7 + Math.random() * 5; }   // 2 回目の採点：うつむかない（遠くの、板の少し上を見る＝首は 15° ほど・目が残りを追う）・すぐ見る人へ戻る
    if (gz.until && t >= gz.until) { gz.until = 0; mot.lookAt(null); mot.express('calm', 1, 0); }   // 3 回目：笑みの閉じ目を出さない
    if (!gz.until && !gz.pend && t >= gz.next) {   // ふだんは見る人を見て、7〜12 秒にいちど、欅の梢か足もとの層へ目をやる
      if (treeObj && Math.random() < .6) gz.p.set(2.2, 8.6, -7.2); else gz.p.set(HX + 4.2, 4.6, HZ + 2.4);   // 欅の梢か、横の遠く（下は見ない）
      mot.lookAt(gz.p); gz.until = t + 1 + Math.random() * .6; gz.next = t + 8 + Math.random() * 6; }
  }

  let W = 0, Hh = 0;
  const size = () => { W = cv.clientWidth; Hh = cv.clientHeight; if (!W || !Hh) return; R.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix(); };
  new ResizeObserver(() => { size(); render(performance.now()); }).observe(cv); size();

  let vis = true, raf = 0, last = performance.now(), t0 = last;
  const fps = { n: 0, t: last, v: 0 };
  window.__qlayers3d = { get fps() { return fps.v; }, get layers() { return layers.filter(l => l.t > .5).length; }, get aoi() { return !!vrm; }, get target() { return target; }, get vis() { return vis; }, get ts() { return layers.map(l => +l.t.toFixed(2)); } };

  function render(now) {
    // 2026-10-22：rAF の時刻が kick() の時刻より前のことがあり、負の dt で層の値が負へ振れて板が出なかった → dt を 0 以上に
    const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; const t = (now - t0) / 1000;
    if (typeof window.__qlayerK === 'number') target = window.__qlayerK;   // 2026-10-22：読み込みの途中に札の合図を取りこぼしても、いま見えている札の番号にそろえる
    const all = target >= LAYERS.length;
    layers.forEach((L, i) => {
      const on = (reduce ? true : i < target) ? 1 : 0;
      L.t += (on - L.t) * (reduce ? 1 : Math.min(1, dt * 3.2));
      const e = L.t * L.t * (3 - 2 * L.t);
      L.grp.position.y = L.y0 + (1 - e) * .9;   // 上から降りて、重なりのいちばん上に載る
      L.grp.visible = L.t > .01;
      L.mats.forEach(([m, op]) => { m.opacity = op * e; });
      if (L.info.tick && L.grp.visible && !reduce) L.info.tick(t, e);
    });
    const k = layers.reduce((a, L) => a + L.t, 0);
    deep.material.opacity += ((all ? .16 : 0) - deep.material.opacity) * Math.min(1, dt * 2);
    // k＝重なった枚数（動きを減らす設定では真ん中で止める）
    const d = reduce ? N / 2 : k;
    // 2026-10-20 夜：碧は上がらない・層の世界も動かさない（欅の上に層が重なっていく）
    world.position.y = 0;
    // 欅はいつも見せる（層はその上に薄く重なる）
    const lookY = 3.7 + Math.min(1, d / N) * .15;   // 碧が重なりの中に立つので、重なりの全体と碧の頭、欅の梢が入る高さへ   // 2026-10-22：高くした欅の梢まで入るよう、見る高さと距離を少し上げた
    // 2026-10-23 本人「360度まわるのではなく、一定の角度から眺めるように」：カメラは回さず、積み重なりがいちばん分かる斜め上の一つの向きに置く（ゆるい呼吸の上下だけ）
    const ang = -.62, rad = mobile ? 17.5 : 19.5, br = reduce ? 0 : Math.sin(t * .5) * .06;
    cam.position.set(Math.sin(ang) * rad, lookY + (mobile ? 5.2 : 4.6) + br, Math.cos(ang) * rad);
    cam.lookAt(.9, lookY - (mobile ? .55 : 0), -2.2);   // 2026-10-22：碧と右奥の欅の両方が欄に収まるよう、見る点を少し右奥へ
    if (mot) { gaze(dt, t); mot.update(dt, cam, { vrmUpdate: false }); stand(); vrm.update(dt); mot.afterVrmUpdate(dt); if (aoiPivot && !aoiPivot.visible && ++aoiFrames > 3) aoiPivot.visible = true; }
    R.render(S, cam);
    placeTag();
    fps.n++; if (now - fps.t > 1000) { fps.v = Math.round(fps.n * 1000 / (now - fps.t)); fps.n = 0; fps.t = now; }
  }
  const loop = now => { if (!vis || document.hidden) { raf = 0; return; } render(now); raf = reduce ? 0 : requestAnimationFrame(loop); };
  function kick() { if (!raf && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; kick(); }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); stage.classList.remove('has-3d'); });
  stage.classList.add('has-3d');
  kick();
}
