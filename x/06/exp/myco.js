/* 実験台 myco：菌根（3D・2026-10-08）。
   本人（2026-10-08）：「確かなこと〈菌根の共生・養分のやりとり〉と、議論のあること〈森の木どうしのネットワークの役割〉を分けて、碧がその違いを話す形に」
   確かなこと：陸の植物の多くが菌根をつくる。植物は光合成でつくった炭素（糖など）を菌に渡し、菌は根の届かない所まで菌糸を伸ばして
     りん・窒素・水を植物に渡す（Smith & Read 2008 Mycorrhizal Symbiosis 3rd ed.）。
   確かめられていること：一つの菌が、何本もの木の根につながることがある（Beiler ほか 2010 New Phytologist 185: 543–553）。
   議論のあること：森の木どうしが、そのつながりを通して養分を分け合い、育ちを助けているか。野外の証拠は弱く、
     引用のされ方が実際の結果より強く語られてきた、と指摘されている（Karst, Jones & Hoeksema 2023 Nature Ecology & Evolution 7: 501–511）。
   形・長さ・粒の動きは模式（決めた値）。菌糸は実物ではずっと細く、目に見えないほどのものが多い。 */
import * as THREE from "three";
import { seg, btn, tag, note, DS } from "./util.js";
import { makeTree } from "./plant.js";

const W = 1.1, Hh = .42, Y0 = .05, SOIL_TOP = Y0 + Hh;
export function create(H) {
  const g = new THREE.Group(); const { std, box, cyl } = H;
  const base = box(W + .1, .05, .2, std(DS.wood, .6)); base.position.y = .025; g.add(base);
  const back = box(W, Hh, .01, std(0x3a2a1e, .95)); back.position.set(0, Y0 + Hh / 2, -.05); g.add(back);
  const front = box(W, Hh, .004, H.glassMat); front.position.set(0, Y0 + Hh / 2, .05); g.add(front);
  for (const s of [-1, 1]) { const p = box(.025, Hh + .02, .12, std(DS.wood, .6)); p.position.set(s * (W / 2 + .012), Y0 + Hh / 2, 0); g.add(p); }
  const top = box(W, .012, .1, std(0x4a5e34, .9)); top.position.set(0, SOIL_TOP + .006, 0); g.add(top);
  // 木
  const TX = [-.3, .3];
  // 木：枝分かれの規則（二股・先細り）・互生の葉・樹皮の質感で組み立てる（exp/plant.js）
  TX.forEach((x, i) => { const t = makeTree({ h: .5, r: .02, depth: 5, seed: 11 + i * 7, leafSize: .04 }); t.position.set(x, SOIL_TOP, 0); g.add(t); });
  // 根（枝分かれ）と根の先
  const rootPts = [], tips = [[], []];
  const rnd = (a, b) => a + Math.random() * (b - a);
  function growRoot(ti, x, y, a, len, d) {
    let px = x, py = y; const path = [[px, py]];
    for (let s = 0; s < len; s++) {
      const nx = px + Math.sin(a) * .018, ny = py - Math.cos(a) * .018; if (ny < Y0 + .03 || Math.abs(nx) > W / 2 - .03) break;
      rootPts.push(px, py, .02, nx, ny, .02); px = nx; py = ny; path.push([px, py]); a += rnd(-.25, .25);
      if (d < 2 && Math.random() < .15) growRoot(ti, px, py, a + (Math.random() < .5 ? -1 : 1) * rnd(.6, 1.1), len * .5, d + 1);
    }
    tips[ti].push({ x: px, y: py, path });
  }
  TX.forEach((x, i) => { for (let k = 0; k < 4; k++) growRoot(i, x, SOIL_TOP, (k - 1.5) * .45, 12, 0); });
  const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(rootPts, 3));
  g.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xc9a57a })));
  // 菌糸（根の先から、根の届かない所へ）
  const hyPts = [], hyEnds = [[], []];
  tips.forEach((arr, ti) => arr.forEach(t => {
    for (let h = 0; h < 6; h++) { let x = t.x, y = t.y, a = rnd(0, Math.PI * 2); const path = [[x, y]];
      for (let s = 0; s < 14; s++) { const nx = x + Math.cos(a) * .011, ny = y + Math.sin(a) * .011; if (ny < Y0 + .01 || ny > SOIL_TOP - .01 || Math.abs(nx) > W / 2 - .01) break; hyPts.push(x, y, .025, nx, ny, .025); x = nx; y = ny; path.push([x, y]); a += rnd(-.5, .5); }
      hyEnds[ti].push({ root: t, path }); }
  }));
  const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute(hyPts, 3));
  const hyM = new THREE.LineBasicMaterial({ color: 0xf2efe6, transparent: true, opacity: .8 });
  const hyphae = new THREE.LineSegments(hg, hyM); g.add(hyphae);
  // 木と木をつなぐ菌糸（一つの菌が二本の根につながる）
  const bridges = [];
  for (let b = 0; b < 3; b++) {
    const A = tips[0][Math.floor(Math.random() * tips[0].length)], B = tips[1][Math.floor(Math.random() * tips[1].length)];
    const pts = []; const n = 24; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector3(A.x + (B.x - A.x) * t + (Math.random() - .5) * .01, A.y + (B.y - A.y) * t - Math.sin(t * Math.PI) * rnd(.02, .06), .026)); }
    const lg = new THREE.BufferGeometry().setFromPoints(pts); const ln = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: 0xf2efe6, dashSize: .012, gapSize: .008, transparent: true, opacity: .8 })); ln.computeLineDistances(); g.add(ln);
    bridges.push({ ln, pts: pts.map(v => [v.x, v.y]), A, B });
  }
  const q1 = note("木どうしで、どれだけ動く？ 役に立つ？", { w: .36 }); q1.position.set(0, Y0 + .08, .07); g.add(q1);
  // 届く範囲（模式）
  const zoneM = new THREE.MeshBasicMaterial({ color: 0x9fd6cf, transparent: true, opacity: .14, depthWrite: false });
  const rootZone = TX.map(x => { const m = new THREE.Mesh(new THREE.CircleGeometry(.11, 32), zoneM); m.scale.set(1, 1.3, 1); m.position.set(x, SOIL_TOP - .16, .03); g.add(m); return m; });
  const hyZone = TX.map(x => { const m = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), zoneM.clone()); m.scale.set(1, 1, 1); m.position.set(x, SOIL_TOP - .18, .029); g.add(m); return m; });
  const lab1 = tag("木（光合成で炭素をつくる）", { w: .26 }); lab1.position.set(-.3, SOIL_TOP + .55, 0); g.add(lab1);
  const lab2 = tag("菌糸（りん・窒素・水を集める）", { w: .28 }); lab2.position.set(.3, SOIL_TOP + .55, 0); g.add(lab2);
  // 粒：炭素（だいだい）＝木→根→菌、りん・窒素（みどり）と水（あお）＝菌→根→木
  const NP = 140, parts = new THREE.InstancedMesh(new THREE.SphereGeometry(.0065, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), NP);
  parts.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NP * 3), 3); parts.frustumCulled = false; g.add(parts);
  const COL = { c: new THREE.Color(0xf09a3a), n: new THREE.Color(0x6fd05a), w: new THREE.Color(0x5aa6e6), q: new THREE.Color(0xffe36a) };
  function pathFor(kind) {
    if (kind === "q") { const b = bridges[Math.floor(Math.random() * bridges.length)]; return Math.random() < .5 ? b.pts : [...b.pts].reverse(); }
    const ti = Math.random() < .5 ? 0 : 1, h = hyEnds[ti][Math.floor(Math.random() * hyEnds[ti].length)];
    const full = [[TX[ti], SOIL_TOP + .3], [TX[ti], SOIL_TOP], ...h.root.path, ...(noHy ? [] : h.path)];   // 幹 → 根の先 →（菌糸の先）
    return kind === "c" ? full : full.slice().reverse();
  }
  let mode = "sure", noHy = false;
  const P = Array.from({ length: NP }, () => ({ path: null, t: 0, kind: "c", sp: 0 }));
  function spawn(p) { const r = Math.random(); p.kind = mode === "debate" && !noHy && r < .22 ? "q" : r < .5 ? "c" : r < .78 ? "n" : "w"; p.path = pathFor(p.kind); p.t = Math.random() * .3; p.sp = p.kind === "q" ? .05 : .16 + Math.random() * .08; }
  P.forEach(spawn);
  const M4 = new THREE.Matrix4();
  function draw(dt) {
    P.forEach((p, i) => {
      p.t += dt * p.sp; if (p.t >= 1) spawn(p);
      const L = p.path.length - 1, f = p.t * L, k = Math.min(L - 1, Math.floor(f)), u = f - k, a = p.path[k], b = p.path[k + 1] || a;
      M4.makeTranslation(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, .03); parts.setMatrixAt(i, M4); parts.setColorAt(i, COL[p.kind]);
    });
    parts.instanceMatrix.needsUpdate = true; parts.instanceColor.needsUpdate = true;
  }
  function apply() {
    const deb = mode === "debate";
    bridges.forEach(b => { b.ln.material.color.set(deb ? 0xffe36a : 0xf2efe6); b.ln.material.opacity = noHy ? 0 : deb ? 1 : .55; });
    q1.visible = deb && !noHy; hyphae.visible = !noHy;
    hyZone.forEach(m => m.visible = !noHy); rootZone.forEach(m => m.visible = noHy);
    P.forEach(spawn);
  }
  apply();
  return {
    group: g, focus: { y: .34, dist: 1.4, pitch: .1 }, labelY: 1.15,
    tick(dt, on) { draw(on ? dt : dt * .5); },
    ui(box_) {
      seg(box_, [["sure", "確かなこと"], ["debate", "議論のあること"]], mode, v => { mode = v; apply(); }, "見かた");
      const hb = btn(box_, "菌糸を消してみる", () => { noHy = !noHy; hb.textContent = noHy ? "菌糸をもどす" : "菌糸を消してみる"; apply(); });
    },
    read() {
      const leg = `<div class="row"><span class="chip"><i style="background:#f09a3a"></i>炭素（糖など）木→菌</span><span class="chip"><i style="background:#6fd05a"></i>りん・窒素 菌→木</span><span class="chip"><i style="background:#5aa6e6"></i>水 菌→木</span>${mode === "debate" ? '<span class="chip"><i style="background:#ffe36a"></i>木どうし（議論のあること）</span>' : ""}</div>`;
      if (mode === "sure") return leg + `<div><b>確かなこと</b>：陸の植物の多くが菌根をつくる。植物は炭素を菌に渡し、菌は根の届かない所から、りん・窒素・水を集めて植物に渡す（Smith &amp; Read 2008）。一つの菌が何本もの木の根につながることも、実際に見つかっている（Beiler ほか 2010）。</div>
<div class="note">${noHy ? "菌糸を消すと、届く範囲は根のまわりだけになります（模式）。" : "うすい緑の円は、菌糸で広がる届く範囲（模式）。"}形・長さ・粒の動きは模式です。</div>`;
      return leg + `<div><b>議論のあること</b>：森の木どうしが、菌のつながりを通して養分を分け合い、育ちを助けているか。野外でそれを示す証拠は弱く、引用のされ方が実際の結果より強く語られてきた、と指摘されている（Karst, Jones &amp; Hoeksema 2023）。</div>
<div class="note">黄色の点線＝二本の木につながる菌糸。そこを動く粒は、量も向きも確かめられていないことを表すため、ゆっくり・まばらにしています。</div>`;
    },
  };
}
