/* 実験台 grain：土の粒と団粒（100 倍の拡大・3D・2026-10-09）。
   本人「土の表現にこだわって」→ 一辺 5 mm の土を 100 倍にした立方体の中に、砂・シルト・粘土の粒、団粒、すきま（孔隙）、水の膜、根毛と菌糸を置く。
   粒の大きさの区分は国際土壌学会法（日本の農学で使われる）：粗砂 2〜0.2 mm・細砂 0.2〜0.02 mm・シルト 0.02〜0.002 mm・粘土 0.002 mm 以下。
   粘土は 100 倍でも 0.2 mm 以下で見えないので、粒の表面の薄い膜と、団粒の中の色で表す。団粒は根・菌糸・微生物のねばりと腐植で
   細かい粒がまとまったもの（Tisdall & Oades 1982）。根毛の太さはおよそ 10 µm、菌糸は数 µm（教科書の水準）→ 100 倍で 1 mm・0.5 mm 前後。
   湿り気で、水の膜が厚くなり、土の色が濃く、艶が出る（湿った土が暗く見えるのは、粒の表面の水の膜の中で光がはね返り、吸われやすくなるため：Lekner & Dorf 1988, Applied Optics 27: 1278）。
   粒の数・形・置き方は模式（決めた値）。 */
import * as THREE from "three";
import { seg, note, tag, DS, tex } from "./util.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const L = .5, HALF = L / 2;   // 模型の一辺 50 cm ＝ 実物 5 mm
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

export function create(H) {
  const g = new THREE.Group(); const { std, box } = H; const R = rng(42);
  const base = box(.9, .04, .7, std(DS.base, .5)); base.position.y = .02; g.add(base);
  const cube = new THREE.Group(); cube.position.y = .04 + HALF + .02; g.add(cube);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, L, L)), new THREE.LineBasicMaterial({ color: 0xb9c2c6 })); cube.add(frame);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(L, L), new THREE.MeshStandardMaterial({ map: tex("soil_diff", 2, 2), normalMap: tex("soil_nor", 2, 2, false), color: 0x5a4434, roughness: .95 })); back.position.z = -HALF; cube.add(back);
  // 砂：角のとれた石英のような粒（変形した二十面体）
  // 粒の形：つなぎ目のない球（頂点を共有）を、なめらかなでこぼこでゆがめる → 角のとれた石英の粒・ごつごつした団粒のかけら
  const lump = (detail, amp, seed) => { const R2 = rng(seed), g0 = mergeVertices(new THREE.IcosahedronGeometry(1, detail)), p = g0.attributes.position, ph = Array.from({ length: 9 }, () => R2() * 6.28), fr = Array.from({ length: 9 }, () => 1.3 + R2() * 2.4);
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); let n = 0; for (let k = 0; k < 3; k++) n += Math.sin(v.x * fr[k * 3] + ph[k * 3]) * Math.sin(v.y * fr[k * 3 + 1] + ph[k * 3 + 1]) * Math.sin(v.z * fr[k * 3 + 2] + ph[k * 3 + 2]) / (k + 1); n += .18 * Math.sin(v.x * 7.3 + ph[0] * 2) * Math.sin(v.y * 6.1 + ph[4]) * Math.sin(v.z * 8.2 + ph[7]); v.multiplyScalar(1 + amp * n); /* 細かいでこぼこ（亜角〜亜円の粒） */ v.y *= .82; p.setXYZ(i, v.x, v.y, v.z); }
    g0.computeVertexNormals(); return g0; };
  const sandGeo = lump(3, .22, 5), sandGeo2 = lump(3, .3, 8);
  const sandM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .45, map: tex("sand_diff", .6, .6), clearcoat: 0, sheen: .3 });
  const NS = 18, sand = new THREE.InstancedMesh(sandGeo, sandM, NS); cube.add(sand);
  const S = []; const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  for (let i = 0; i < NS; i++) { const r = (i < 5 ? .05 : .02 + R() * .025); let p; let tries = 0; do { p = new THREE.Vector3((R() - .5) * (L - 2 * r), (R() - .5) * (L - 2 * r), (R() - .5) * (L - 2 * r)); tries++; } while (S.some(s => s.p.distanceTo(p) < s.r + r + .01) && tries < 60); S.push({ p, r }); Q.setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6)); Sc.setScalar(r); M4.compose(p, Q, Sc); sand.setMatrixAt(i, M4); sand.setColorAt(i, new THREE.Color([0xe6d8b6, 0xdcc8a2, 0xe8c9b0, 0xcdbb94, 0x6a625a][i % 5])); }   // 石英（白〜黄みの灰）・長石（うすい桃色）・暗い鉱物
  // 細砂：0.2〜0.02 mm → 100 倍で 2 cm〜2 mm。粗砂のすきまに散らばる（色は石英・長石・暗い鉱物の混ざり）
  const NFS = 140, fsand = new THREE.InstancedMesh(sandGeo2, new THREE.MeshStandardMaterial({ roughness: .6 }), NFS); cube.add(fsand);
  { const FC = [0xe2d6b8, 0xd2b88e, 0xbfa27a, 0x8a7a68, 0xeee4cc]; let k = 0;
    for (let i = 0; i < 600 && k < NFS; i++) { const r = .001 + R() * .009, p = new THREE.Vector3((R() - .5) * (L - 2 * r), (R() - .5) * (L - 2 * r), (R() - .5) * (L - 2 * r)); if (S.some(s => s.p.distanceTo(p) < s.r * 1.05 + r)) continue;
      Q.setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6)); M4.compose(p, Q, Sc.set(r, r * (.7 + R() * .3), r)); fsand.setMatrixAt(k, M4); fsand.setColorAt(k, new THREE.Color(FC[k % FC.length])); k++; }
    fsand.count = k; }
  // 団粒：細かい粒（シルト）と腐植がまとまった、でこぼこの丸いかたまり
  const aggs = new THREE.Group(); cube.add(aggs);
  // 団粒：小さなかたまり（ミクロ団粒・0.05〜0.25 mm → 100 倍で 0.5〜2.5 cm）が、根・菌糸・ねばりでつながった、すきまの多いかたまり（Tisdall & Oades 1982 の階層）。
  // 色は腐植の多い黒褐色〜褐色。かけら＝lump の形を InstancedMesh で一度に描く。シルトの細かい粒が表面に散る
  const humusM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95, map: tex("soil_diff", .5, .5) });
  const NA = 2600, crumbs = new THREE.InstancedMesh(lump(1, .35, 13), humusM, NA); aggs.add(crumbs);
  const siltGeo = new THREE.IcosahedronGeometry(.0009, 0), siltM = new THREE.MeshStandardMaterial({ color: 0xa08a68, roughness: .9 });
  const sil = new THREE.InstancedMesh(siltGeo, siltM, 900); aggs.add(sil);
  const HC = [0x2e2016, 0x3b2a1c, 0x4a3524, 0x5a4230, 0x34261a, 0x6a5038]; let na = 0, ns = 0;
  for (let a = 0; a < 40 && na < NA - 90; a++) {
    const rad = .04 + R() * .035, c = new THREE.Vector3((R() - .5) * (L - 2 * rad), (R() - .5) * (L - 2 * rad), (R() - .5) * (L - 2 * rad));
    if (S.some(s => s.p.distanceTo(c) < s.r + rad * .8)) continue;
    S.push({ p: c, r: rad * .9 });
    const n = 50 + Math.floor(R() * 30);
    for (let i = 0; i < n; i++) { const d = new THREE.Vector3(R() - .5, R() - .5, R() - .5); d.normalize().multiplyScalar(rad * Math.cbrt(R())); const r = .005 + R() * .0075;   // ミクロ団粒：直径 0.1〜0.25 mm（Tisdall & Oades 1982 の 20〜250 µm）
      M4.compose(c.clone().add(d), Q.setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6)), Sc.set(r, r * (.7 + R() * .4), r)); crumbs.setMatrixAt(na, M4); crumbs.setColorAt(na, new THREE.Color(HC[Math.floor(R() * HC.length)])); na++; }
    for (let i = 0; i < 18 && ns < 900; i++) { const d = new THREE.Vector3(R() - .5, R() - .5, R() - .5).normalize().multiplyScalar(rad * (.7 + R() * .4)); M4.compose(c.clone().add(d), Q, Sc.setScalar(.5 + R() * .6)); sil.setMatrixAt(ns++, M4); }
  }
  crumbs.count = na; sil.count = ns;
  // 粘土の膜：砂の粒をうすく包む
  const clayM = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 1, transparent: true, opacity: .35, depthWrite: false });
  const clay = new THREE.InstancedMesh(sandGeo, clayM, NS); for (let i = 0; i < NS; i++) { sand.getMatrixAt(i, M4); M4.decompose(V, Q, Sc); Sc.multiplyScalar(1.06); M4.compose(V, Q, Sc); clay.setMatrixAt(i, M4); } cube.add(clay);
  // 水の膜（粒をつつむ）と、すきまにたまる水
  const waterM = new THREE.MeshPhysicalMaterial({ color: 0x6fb2e0, roughness: .05, transparent: true, opacity: .32, depthWrite: false });
  const film = new THREE.InstancedMesh(sandGeo, waterM, NS); cube.add(film);
  const pool = new THREE.Mesh(new THREE.BoxGeometry(L * .99, 1, L * .99), new THREE.MeshPhysicalMaterial({ color: 0x5aa6d6, roughness: .05, transparent: true, opacity: .22, depthWrite: false })); cube.add(pool);
  // 根毛（太さ 10 µm → 100 倍で 1 mm）と菌糸（数 µm → 0.5 mm 前後）：すきまを通る。画面で見えるよう、太さは本物の拡大の約 2 倍で描く
  const hairs = new THREE.Group(); cube.add(hairs);
  const TM = new Map(), tube = (pts, r, col) => { const c = new THREE.CatmullRomCurve3(pts); if (!TM.has(col)) TM.set(col, new THREE.MeshStandardMaterial({ color: col, roughness: .6 })); return new THREE.Mesh(new THREE.TubeGeometry(c, pts.length * 6, r, 5, false), TM.get(col)); };
  // 細い根（直径 0.2 mm → 100 倍で 2 cm）がすきまを通り、先（右）へ伸びる。先のすぐ後ろから根毛（長さ 0.1〜0.6 mm → 1〜6 cm）が横へ出る。伸びる先そのものには根毛はない
  { const rc = new THREE.CatmullRomCurve3([new THREE.Vector3(-HALF, .12, .05), new THREE.Vector3(-.1, .08, .02), new THREE.Vector3(.05, .1, -.05), new THREE.Vector3(.16, .02, -.02)]);
    hairs.add(new THREE.Mesh(new THREE.TubeGeometry(rc, 60, .009, 10, false), new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: .55 })));
    const capM = new THREE.Mesh(new THREE.SphereGeometry(.009, 12, 8), new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: .6 })); capM.position.copy(rc.getPoint(1)); hairs.add(capM);   // 根冠
    const hm = new THREE.MeshStandardMaterial({ color: 0xf6f0e2, roughness: .5, transparent: true, opacity: .9 });
    for (let i = 0; i < 70; i++) { const t = .35 + R() * .55, c = rc.getPoint(t), d = rc.getTangent(t), pr = new THREE.Vector3(R() - .5, R() - .5, R() - .5).cross(d).normalize(), len = .012 + R() * .05 * (1 - Math.max(0, t - .8) * 4);
      hairs.add(tube([c.clone().addScaledVector(pr, .008), c.clone().addScaledVector(pr, .008 + len * .5).addScaledVector(d, (R() - .5) * .006), c.clone().addScaledVector(pr, .008 + len)], .0011, 0xf6f0e2)); } }
  for (let k = 0; k < 4; k++) { const pts = []; let p = new THREE.Vector3(HALF * (R() > .5 ? 1 : -1) * .98, (R() - .5) * .4, (R() - .5) * .4); for (let s = 0; s < 6; s++) { pts.push(p.clone()); p = p.clone().add(new THREE.Vector3(-Math.sign(p.x) * .06, (R() - .5) * .08, (R() - .5) * .08)); } hairs.add(tube(pts, .0006, 0xffffff)); }
  const n1 = note("一辺 5 mm の土を 100 倍に（粒の数と形は模式・根毛と菌糸は約 2 倍の太さで描いた）", { w: .62 }); n1.position.set(0, .03, .37); g.add(n1);
  const t1 = tag("砂（細砂・粗砂）", { w: .16 }); t1.position.set(.3, .5, .2); g.add(t1);
  const t2 = tag("団粒（シルト＋腐植）", { w: .18 }); t2.position.set(-.3, .62, .2); g.add(t2);
  let wet = 1, show = "all";
  function apply() {
    const k = [0, 1, 2][wet];
    for (let i = 0; i < NS; i++) { sand.getMatrixAt(i, M4); M4.decompose(V, Q, Sc); Sc.multiplyScalar(1 + [.0, .12, .2][wet]); M4.compose(V, Q, Sc); film.setMatrixAt(i, M4); }
    film.instanceMatrix.needsUpdate = true; film.visible = wet > 0 && (show === "all" || show === "sand");
    const lvl = [0, .25, 1][wet]; pool.scale.y = Math.max(.001, L * lvl); pool.position.y = -HALF + L * lvl / 2; pool.visible = wet > 0;
    // 湿るほど暗く、艶が出る
    sandM.color.setScalar([1, .78, .64][wet]); sandM.roughness = [.55, .3, .15][wet];
    humusM.color.setScalar([1.35, 1, .78][wet]); humusM.roughness = [.98, .7, .5][wet];
    sand.visible = clay.visible = fsand.visible = show === "all" || show === "sand"; clay.visible = clay.visible || show === "fine"; aggs.visible = show === "all" || show === "agg" || show === "fine"; hairs.visible = show === "all" || show === "life";
    sandM.needsUpdate = humusM.needsUpdate = true;
  }
  apply();
  return {
    group: g, focus: { y: .32, dist: 1.25, pitch: .25 }, labelY: .95,
    tick(dt, on) { if (on) cube.rotation.y += dt * .05; },
    ui(box_) {
      seg(box_, [[0, "乾いた"], [1, "湿った"], [2, "水びたし"]], wet, v => { wet = v; apply(); }, "湿り気");
      seg(box_, [["all", "ぜんぶ"], ["sand", "砂"], ["fine", "シルトと粘土"], ["agg", "団粒"], ["life", "根毛と菌糸"]], show, v => { show = v; apply(); }, "見せるもの");
    },
    read() {
      return `<table><tr><td>粗砂</td><td class="v">2〜0.2 mm</td><td>ざらざら</td></tr><tr><td>細砂</td><td class="v">0.2〜0.02 mm</td><td>ざらつく</td></tr><tr><td>シルト</td><td class="v">0.02〜0.002 mm</td><td>さらさら・すべすべ</td></tr><tr><td>粘土</td><td class="v">0.002 mm 以下</td><td>ねばる（この拡大でも見えない）</td></tr></table>
<div class="note">粒の大きさの区分は国際土壌学会法。手ざわりは、指で土をこねて確かめる野外の方法の言い方。${["乾いた土：すきまの多くは空気。", "湿った土：粒のまわりに水の膜。色が濃く、艶が出る。", "水びたし：すきまが水で満ち、空気が追い出される（根は息がしにくい）。"][wet]}</div>`;
    },
  };
}
