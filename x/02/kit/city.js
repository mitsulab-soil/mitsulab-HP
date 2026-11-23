/* kit/city.js ── 都市の場（2026-11-23 本人「都市の 3D 空間を別途作って、画面で切り替えられるように」）。
   駅前の大通りと交差点の模式（大宮駅東口のような、ビル・歩道・街路樹・信号・看板・車のある通り。特定の店や建物を写したものではない）。
   共通の部品：Qualia/sight（x/02）と Qualia/hear（x/48）が同じものを使う（のちに touch ほかでも使える形）。
   素材：路面 asphalt_04・歩道 concrete_pavers_02（Poly Haven・CC0）、窓の並び Facade006（ambientCG・CC0）＝台帳 M-0822 ほか。
   ほかの形（車・信号・看板・木の枝ぶり・点字ブロック）は、この画面の中で描いた模式。看板の字は一般の名詞だけ（実在の店名・商標は使わない）。
   落とし物の結び目＝Qualia/touch の「結び目」（麻縄の止め結び）の形を写したもの（kit/touch_objects.js）。
   受けとり方の手がかり（M の uv・temp・echo）：白線の白い塗料は酸化チタンで紫外をよく吸う（紫外では暗い）／ガラスは紫外の多くを通さず映りこみも弱い／
   日なたのアスファルト・車の前（エンジン）・自販機は温かい／壁・路面のかたい面は超音波をよく返す。値は見え方の模式。
   使い方：const C = buildCity({ M, tx, canvasTex, group, pick, sonic, mobile }); 毎こま C.update(t, dt)。C.blocked(x, z, pad)・C.SPAWN・C.bounds。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const SPAWN = { x: 5.9, z: 13, yaw: 0 };   // 東側の歩道。北（−z）の交差点を向く
const ROAD = 3.5, WALK = 8.5;                       // 車道の半幅（片側 1 車線＋路肩）・歩道の外の線
const XZ0 = -17.5, XZ1 = -10.5;                     // 交わる道（東西）の車道
const TAU = Math.PI * 2;

export function buildCity({ M, tx, canvasTex, group, pick, sonic, mobile }) {
  let seed = 20261123; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + R() * (b - a);
  const geoAt = (g, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1 } = {}) => { g.scale(s, s, s); g.rotateX(rx); g.rotateZ(rz); g.rotateY(ry); g.translate(x, y, z); return g; };
  const add = (mesh, { cast = true, recv = true, hit = false, snd = true } = {}) => { mesh.castShadow = cast; mesh.receiveShadow = recv; group.add(mesh); if (hit) pick.push(mesh); if (snd) sonic.push(mesh); return mesh; };
  const boxes = [];   // 歩けない所（x0,x1,z0,z1）
  const block = (x0, x1, z0, z1) => boxes.push([Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)]);
  const posts = [];   // 細い柱（x,z,r）
  const inCross = z => z > XZ0 - 4 && z < XZ1 + 4;   // 交差点のまわり（歩道の角まで）

  // ---------------------------------------------------------------- 路面（アスファルト）
  const asph = tx("city_asphalt.webp", 1, 1), asphN = tx("city_asphalt_n.webp", 1, 1, false);
  { const S = 180, g = new THREE.PlaneGeometry(S, S, 1, 1); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * S / 4, uv.getY(i) * S / 4);
    add(new THREE.Mesh(g, M(0xb4b2ac, { std: true, map: asph, nmap: asphN, ns: .8, rough: .93, env: .25, uv: .04, temp: .5, echo: .6 })), { cast: false, hit: true }); }
  // 歩道（コンクリートの平板）：車道より 3 cm 高く、縁石（15 cm）で区切る
  const pav = tx("city_pavers.webp", 1, 1), pavN = tx("city_pavers_n.webp", 1, 1, false);
  const walkM = M(0xfff8ee, { std: true, map: pav, nmap: pavN, ns: .9, rough: .9, env: .3, uv: .22, temp: .35, echo: .7 });
  const walks = [];
  const walkRect = (x0, x1, z0, z1) => { const w = x1 - x0, d = z1 - z0, g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, .03, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 1.6, p.getZ(i) / 1.6); walks.push(g); };
  const FAR = 70;
  for (const sx of [1, -1]) {
    walkRect(sx > 0 ? ROAD : -WALK, sx > 0 ? WALK : -ROAD, XZ1, FAR - 20); walkRect(sx > 0 ? ROAD : -WALK, sx > 0 ? WALK : -ROAD, -FAR, XZ0);
    walkRect(sx > 0 ? WALK : -FAR, sx > 0 ? FAR : -WALK, XZ1, XZ1 + 4); walkRect(sx > 0 ? WALK : -FAR, sx > 0 ? FAR : -WALK, XZ0 - 4, XZ0);
  }
  add(new THREE.Mesh(mergeGeometries(walks), walkM), { cast: false, hit: true });
  // 縁石（御影石の灰色）
  { const cg = [], curb = (x0, x1, z0, z1) => cg.push(geoAt(new THREE.BoxGeometry(Math.abs(x1 - x0) || .18, .15, Math.abs(z1 - z0) || .18), { x: (x0 + x1) / 2, y: .075, z: (z0 + z1) / 2 }));
    for (const sx of [1, -1]) { curb(sx * ROAD, sx * ROAD, XZ1 + 4, FAR - 20); curb(sx * ROAD, sx * ROAD, -FAR, XZ0 - 4); curb(sx * (WALK + 4), sx * FAR, XZ1, XZ1); curb(sx * (WALK + 4), sx * FAR, XZ0, XZ0); }
    const cm = M(0xa9a7a2, { std: true, map: pav, rough: .8, env: .3, uv: .25, temp: .3, echo: .9 }); add(new THREE.Mesh(mergeGeometries(cg), cm), { recv: true }); }
  // 白線：中央線（破線）・車道外側線・停止線・横断歩道（白い帯 45 cm・すき間 45 cm）。白い塗料は紫外をよく吸う
  { const lg = [], line = (x, z, w, d) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, .012, z); lg.push(g); };
    for (let z = -FAR; z < FAR - 20; z += 10) if (!(z > XZ0 - 9 && z < XZ1 + 4)) line(0, z, .15, 5);
    for (let x = -FAR; x < FAR; x += 10) if (Math.abs(x) > WALK + 6) line(x, (XZ0 + XZ1) / 2, 5, .15);
    for (const sx of [1, -1]) { line(sx * 3.1, (XZ1 + 7 + FAR - 20) / 2, .15, FAR - 20 - XZ1 - 7); line(sx * 3.1, (-FAR + XZ0 - 8) / 2, .15, FAR + XZ0 - 8); }
    line(1.75, XZ1 + 6.2, 3.5, .45); line(-1.75, XZ0 - 6.2, 3.5, .45);                           // 停止線
    for (let x = -3.1; x <= 3.1; x += .9) { line(x, XZ1 + 2, .45, 3.6); line(x, XZ0 - 2, .45, 3.6); }   // 南北の道の横断歩道
    for (const sx of [1, -1]) for (let z = XZ0 + .4; z <= XZ1 - .4; z += .9) line(sx * (WALK + 2), z, 3.6, .45);   // 東西の道の横断歩道
    add(new THREE.Mesh(mergeGeometries(lg), M(0xe9e7e0, { std: true, rough: .75, env: .3, uv: .05, temp: .38, echo: .6, map: asph })), { cast: false, snd: false });
  }
  // 点字ブロック（線状＝誘導・点状＝警告。黄色）
  { const dots = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#d9b021"; g.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const r = g.createRadialGradient(6 + i * 13, 6 + j * 13, 1, 6 + i * 13, 6 + j * 13, 5); r.addColorStop(0, "#f2d35a"); r.addColorStop(1, "#b48d12"); g.fillStyle = r; g.beginPath(); g.arc(6.5 + i * 13, 6.5 + j * 13, 4.6, 0, TAU); g.fill(); } });
    const bars = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#d9b021"; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { const x = 4 + i * 16, gr = g.createLinearGradient(x, 0, x + 9, 0); gr.addColorStop(0, "#b48d12"); gr.addColorStop(.5, "#f2d35a"); gr.addColorStop(1, "#b48d12"); g.fillStyle = gr; g.fillRect(x, 3, 9, h - 6); } });
    dots.wrapS = dots.wrapT = bars.wrapS = bars.wrapT = THREE.RepeatWrapping;
    const strip = (map, cx, cz, w, d, rot) => { const g = new THREE.PlaneGeometry(w, d); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / .3, uv.getY(i) * d / .3); g.rotateX(-Math.PI / 2); if (rot) g.rotateY(Math.PI / 2); g.translate(cx, .036, cz); return g; };
    const bg = [], dg = [];
    for (const sx of [1, -1]) { bg.push(strip(bars, sx * 6.2, (XZ1 + 1.2 + FAR - 20) / 2, .3, FAR - 20 - XZ1 - 1.2)); bg.push(strip(bars, sx * 6.2, (-FAR + XZ0 - 1.2) / 2, .3, FAR + XZ0 - 1.2));
      dg.push(strip(dots, sx * 4.6, XZ1 + 2, .6, 3.6)); dg.push(strip(dots, sx * 4.6, XZ0 - 2, .6, 3.6)); dg.push(strip(dots, sx * 6.2, XZ1 + .6, .6, .6)); dg.push(strip(dots, sx * 6.2, XZ0 - .6, .6, .6)); }
    add(new THREE.Mesh(mergeGeometries(bg), M(0xffffff, { std: true, map: bars, rough: .7, env: .3, uv: .12, temp: .4, echo: .7 })), { cast: false, snd: false });
    add(new THREE.Mesh(mergeGeometries(dg), M(0xffffff, { std: true, map: dots, rough: .7, env: .3, uv: .12, temp: .4, echo: .7 })), { cast: false, snd: false });
  }

  // ---------------------------------------------------------------- 建物
  const facade = tx("city_facade.webp", 1, 1);   // 窓 13 列 × 8 階（1 枚＝幅 20.8 m・高さ 27.2 m）
  const tints = [0xf1ece2, 0xd8d2c6, 0xc2c6ca, 0xe6dccb, 0xb9b3a8, 0xdcd8d0];
  const bodyM = tints.map(c => M(c, { std: true, map: facade, rough: .55, metal: .1, env: .8, uv: .2, temp: .25, echo: .95 }));
  // 二つめの外壁：タイル張りの壁に横長の窓（日本の中層の雑居ビルによくある形）
  const tileTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#c9b79c"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 8) { const l = 175 + Math.random() * 40; g.fillStyle = `rgb(${l},${l * .9 | 0},${l * .76 | 0})`; g.fillRect(x + ((y / 4) % 2) * 4, y, 7, 3); }
    for (const y0 of [36, 164]) { const gr = g.createLinearGradient(0, y0, 0, y0 + 56); gr.addColorStop(0, "#3d4c58"); gr.addColorStop(.55, "#6f8290"); gr.addColorStop(1, "#2b3640"); g.fillStyle = gr; g.fillRect(0, y0, w, 56); g.fillStyle = "#d9d6cf"; for (let x = 0; x < w; x += 64) g.fillRect(x, y0, 4, 56); g.fillRect(0, y0 + 54, w, 4); }
  });
  const tileM = [0xffffff, 0xe7ddd0, 0xd7dde0].map(c => M(c, { std: true, map: tileTex, rough: .7, env: .5, uv: .15, temp: .28, echo: .95 }));
  const roofM = M(0x8d8b86, { std: true, rough: .95, env: .2, uv: .2, temp: .55, echo: .9 });
  const darkM = M(0x3c3f43, { std: true, rough: .6, metal: .3, env: .5, uv: .05, temp: .3, echo: .9 });
  // 一階の店先（ガラスの店先・庇・看板）。字は一般の名詞だけ
  const SHOPS = [["珈琲", "#2f2a26", "#efe2c6"], ["くすり", "#1c5a3d", "#ffffff"], ["書店", "#21324d", "#f0ead8"], ["パン", "#7a3d1c", "#fff2dc"], ["花", "#3c5a2a", "#fffaf0"], ["眼鏡", "#262626", "#e8e8e8"], ["そば", "#1d1d1d", "#f3e9d2"], ["歯科", "#ffffff", "#1d5f86"], ["不動産", "#f4f1ea", "#7a1f1f"], ["靴", "#5c4a3a", "#fff"], ["文具", "#efe9dc", "#2a4d6e"], ["和菓子", "#3e2723", "#f3e3c3"]];
  const shopTex = SHOPS.map(([word, bg, fg], i) => canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 60, 0, h); gr.addColorStop(0, "#5d5547"); gr.addColorStop(.5, "#a08c6e"); gr.addColorStop(1, "#3b342b"); g.fillStyle = gr; g.fillRect(0, 60, w, h - 60);   // 中の明かり
    g.fillStyle = "rgba(255,240,210,.35)"; for (let k = 0; k < 7; k++) g.fillRect(20 + k * 70 + Math.random() * 20, 110 + Math.random() * 40, 30 + Math.random() * 30, 60 + Math.random() * 60);   // 棚・品物の影
    g.fillStyle = "rgba(200,220,235,.18)"; g.beginPath(); g.moveTo(0, 60); g.lineTo(140, 60); g.lineTo(40, h); g.lineTo(0, h); g.fill();   // ガラスの映りこみ
    g.fillStyle = "#4a4f55"; for (let x = 0; x <= w; x += 128) g.fillRect(x - 3, 60, 6, h - 60); g.fillRect(0, h - 10, w, 10);   // サッシ
    g.fillStyle = bg; g.fillRect(0, 0, w, 60); g.fillStyle = fg; g.font = "600 40px 'Hiragino Mincho ProN','Yu Mincho',serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(word, w / 2, 32);
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, 56, w, 4);
  }));
  const shopM = shopTex.map(t => M(0xffffff, { std: true, map: t, rough: .25, metal: .05, env: 1, uv: .03, temp: .3, echo: .9 }));
  const bld = [];
  const building = (cx, cz, w, d, h, face) => {   // face＝通りに向いた面（+x・−x・+z・−z）
    const kind = R(), M0 = kind < .62 ? bodyM[(R() * bodyM.length) | 0] : tileM[(R() * tileM.length) | 0], tile = M0.map === tileTex;
    const g = new THREE.BoxGeometry(w, h - 3.6, d), uv = g.attributes.uv, TW = tile ? 8 : 20.8, TH = tile ? 7 : 27.2;
    for (let f = 0; f < 6; f++) { const [a, b] = f < 2 ? [d, h - 3.6] : f < 4 ? [w, d] : [w, h - 3.6]; for (let k = 0; k < 4; k++) { const i = f * 4 + k; if (f === 2 || f === 3) uv.setXY(i, .012, .005); else uv.setXY(i, uv.getX(i) * a / TW, uv.getY(i) * b / TH); } }
    g.translate(cx, 3.6 + (h - 3.6) / 2, cz); bld.push([g, M0]);
    // 屋上の手すり壁と室外機
    const top = new THREE.BoxGeometry(w + .1, .9, d + .1); top.translate(cx, h + .45, cz); bld.push([top, roofM]);
    for (let k = 0; k < (mobile ? 1 : 3); k++) { const u = new THREE.BoxGeometry(.9, .7, .35); u.translate(cx + rr(-w, w) * .3, h + .35, cz + rr(-d, d) * .3); bld.push([u, darkM]); }
    // 一階
    const sh = shopM[(R() * shopM.length) | 0], fl = new THREE.BoxGeometry(w - .2, 3.6, d - .2); fl.translate(cx, 1.8, cz);
    for (let k = 0, fu = fl.attributes.uv; k < fu.count; k++) fu.setXY(k, .02, .2);   // 一階の箱は暗いサッシの色。店先は通りに向けた一枚の板（字が裏返らない）
    bld.push([fl, sh]);
    // 庇
    const nx = face === "+x" ? 1 : face === "-x" ? -1 : 0, nz = face === "+z" ? 1 : face === "-z" ? -1 : 0, ex = cx + nx * (w / 2), ez = cz + nz * (d / 2);
    { const pw = nx ? d - .3 : w - .3, pg = new THREE.PlaneGeometry(pw, 3.6); pg.rotateY(Math.atan2(nx, nz)); pg.translate(ex + nx * .02, 1.8, ez + nz * .02); bld.push([pg, sh]); }
    const aw = new THREE.BoxGeometry(nx ? .9 : w * .9, .08, nz ? .9 : d * .9); aw.translate(ex + nx * .45, 3.3, ez + nz * .45); bld.push([aw, darkM]);
    block(cx - w / 2 - .15, cx + w / 2 + .15, cz - d / 2 - .15, cz + d / 2 + .15);
  };
  // 南北の通りに面した列（交差点の四つの角から外へ）
  for (const sx of [1, -1]) for (const [z0, z1, dir] of [[XZ1 + 4, FAR - 20, 1], [XZ0 - 4, -FAR, -1]]) {
    let z = z0; while (dir > 0 ? z < z1 : z > z1) { const w = rr(7, 15), h = [rr(9, 16), rr(14, 26), rr(20, 38)][(R() * 3) | 0], dep = rr(12, 16); const cz = z + dir * w / 2; building(sx * (WALK + dep / 2), cz, dep, w, h, sx > 0 ? "-x" : "+x"); z += dir * (w + rr(.2, 1.2)); }
  }
  // 東西の道に面した列
  for (const sx of [1, -1]) for (const [zc, face] of [[XZ1 + 4, "-z"], [XZ0 - 4, "+z"]]) {
    let x = WALK + 17; while (x < FAR - 10) { const w = rr(8, 14), h = rr(10, 30), dep = rr(10, 14); building(sx * (x + w / 2), zc + (face === "-z" ? dep / 2 : -dep / 2), w, dep, h, face); x += w + rr(.3, 1.2); }
  }
  // 遠くの高い建物（通りの奥の見通し。歩いては行けない）
  for (let i = 0; i < (mobile ? 6 : 12); i++) { const sx = R() < .5 ? 1 : -1, x = sx * rr(10, 40), z = rr(-FAR - 20, -FAR) * (R() < .3 ? -1 : 1) - (R() < .3 ? 0 : 0); const w = rr(14, 24), h = rr(30, 60), g = new THREE.BoxGeometry(w, h, w), uv = g.attributes.uv; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const j = f * 4 + k; uv.setXY(j, uv.getX(j) * w / 20.8, uv.getY(j) * h / 27.2); } g.translate(x, h / 2, z); bld.push([g, bodyM[i % bodyM.length]]); }
  { const byM = new Map(); for (const [g, m] of bld) { const L = byM.get(m) || byM.set(m, []).get(m); L.push(g.index ? g.toNonIndexed() : g); }
    for (const [m, L] of byM) add(new THREE.Mesh(mergeGeometries(L), m), { hit: false }); }

  // ---------------------------------------------------------------- 街路樹（ケヤキ。駅前の大通りに多い）
  const leafTex = tx("leaf_spray.webp", 1, 1); leafTex.wrapS = leafTex.wrapT = THREE.ClampToEdgeWrapping;
  const barkM = M(0xd8d2c8, { std: true, map: tx("bark_zelkova.webp", 1, 3), nmap: tx("bark_zelkova_n.webp", 1, 3, false), ns: 1.3, orm: tx("bark_zelkova_orm.webp", 1, 3, false), rough: 1, env: .4, uv: .05, temp: .1, echo: .5 });
  const leafM = M(0xffffff, { std: true, map: leafTex, alphaTest: .45, side: THREE.DoubleSide, rough: .6, env: .45, uv: .04, temp: .08, echo: .3, wind: .05, windH: 9 });
  const trees = [];
  for (const sx of [1, -1]) for (let z = -FAR + 6; z < FAR - 24; z += 10) if (!inCross(z) && Math.abs(z - SPAWN.z) > 2.5) trees.push([sx * 4.6, z + (sx > 0 ? 0 : 5)]);
  for (const sx of [1, -1]) for (let x = WALK + 8; x < FAR - 10; x += 11) { trees.push([sx * x, XZ1 + 1.4]); trees.push([sx * (x + 5), XZ0 - 1.4]); }
  { const wood = [], tips = [], pits = [];
    const branch = (from, dir, len, r0, depth, out) => { const pts = [from.clone()]; let p = from.clone(), d = dir.clone();
      for (let i = 1; i <= 3; i++) { d.add(new THREE.Vector3((R() - .5) * .3, .06, (R() - .5) * .3)).normalize(); p = p.clone().addScaledVector(d, len / 3); pts.push(p); }
      wood.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 4, r0, 5, false));
      if (depth > 0) { const n = depth === 2 ? 3 : 2; for (let k = 0; k < n; k++) { const a = k / n * TAU + R() * 2; branch(p, new THREE.Vector3(d.x + Math.cos(a) * .5, d.y + .3, d.z + Math.sin(a) * .5).normalize(), len * .64, r0 * .58, depth - 1, out); } }
      else out.push(p); };
    for (const [x, z] of trees) { const s = rr(.85, 1.15), base = new THREE.Vector3(x, 0, z), my = [];
      wood.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base.clone(), base.clone().add(new THREE.Vector3(.04, 1.4 * s, 0)), base.clone().add(new THREE.Vector3(0, 2.6 * s, .03))]), 5, .17 * s, 8, false));
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + R(); branch(base.clone().add(new THREE.Vector3(0, 2.5 * s, 0)), new THREE.Vector3(Math.cos(a) * .5, 1, Math.sin(a) * .5).normalize(), 2.6 * s, .09 * s, 2, my); }   // 欅：低い所で幾本にも分かれ、箒を逆さにした形
      tips.push([x, z, my]); posts.push([x, z, .45]);
      const pit = new THREE.PlaneGeometry(1.3, 1.3); pit.rotateX(-Math.PI / 2); pit.translate(x, .037, z); pits.push(pit); }
    add(new THREE.Mesh(mergeGeometries(wood.map(g => g.toNonIndexed())), barkM));
    const pitTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#3a2f25"; g.fillRect(0, 0, w, h); g.strokeStyle = "#4b4c4e"; g.lineWidth = 3; for (let i = 4; i < w; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); } g.strokeRect(1, 1, w - 2, h - 2); });
    add(new THREE.Mesh(mergeGeometries(pits), M(0xffffff, { std: true, map: pitTex, rough: .8, metal: .4, env: .3, uv: .06, temp: .3, echo: .7 })), { cast: false, snd: false });
    const per = mobile ? 300 : 560, n = tips.length * per, lg = new THREE.PlaneGeometry(.5, .5); lg.translate(0, .25, 0);
    const im = new THREE.InstancedMesh(lg, leafM, n), m4 = new THREE.Matrix4(), col = new THREE.Color(), xA = new THREE.Vector3(), yA = new THREE.Vector3(), zA = new THREE.Vector3(), rv = new THREE.Vector3(); let i = 0;
    for (const [x, z, my] of tips) { const ctr = my.reduce((a, t) => a.add(t), new THREE.Vector3()).multiplyScalar(1 / my.length);
      for (let k = 0; k < per; k++, i++) { const t = my[k % my.length], out = t.clone().sub(ctr).normalize(), r = .1 + Math.pow(R(), .6) * 1.1;
        const v = t.clone().add(new THREE.Vector3(R() - .5, (R() - .5) * .8, R() - .5).normalize().multiplyScalar(r)).addScaledVector(out, .2);
        yA.copy(out).add(new THREE.Vector3((R() - .5) * 1.3, .3 + R() * .5, (R() - .5) * 1.3)).normalize(); rv.set(R() - .5, R() - .5, R() - .5); xA.crossVectors(yA, rv).normalize(); zA.crossVectors(xA, yA);
        const s = .8 + R() * .5; m4.makeBasis(xA.multiplyScalar(s), yA.multiplyScalar(s), zA.multiplyScalar(s)); m4.setPosition(v); im.setMatrixAt(i, m4);
        const l = .68 + R() * .3; col.setRGB(l * .84, l * .92, l * .74); im.setColorAt(i, col); } }
    add(im, { cast: !mobile });
  }

  const lamps = [];   // 街灯の灯の位置（x, y, z）
  // ---------------------------------------------------------------- 街灯・電柱と電線・ガードパイプ・自販機
  { const steel = M(0x8e9296, { std: true, rough: .45, metal: .7, env: .8, uv: .2, temp: .3, echo: .9 }), conc = M(0xb4b1aa, { std: true, rough: .85, env: .3, uv: .25, temp: .3, echo: .9 });
    const sg = [], cgs = [];
    for (const sx of [1, -1]) for (let z = -FAR + 2; z < FAR - 24; z += 20) if (!inCross(z)) {
      const x = sx * (ROAD + .45); sg.push(geoAt(new THREE.CylinderGeometry(.07, .1, 8, 8), { x, y: 4, z })); sg.push(geoAt(new THREE.CylinderGeometry(.05, .05, 1.8, 6), { rz: Math.PI / 2, x: x - sx * .9, y: 7.9, z }));
      sg.push(geoAt(new THREE.BoxGeometry(.7, .14, .32), { x: x - sx * 1.75, y: 7.85, z })); lamps.push([x - sx * 1.75, 7.77, z]); posts.push([x, z, .25]); }
    // 電柱（東西の道。コンクリート柱 12 m・腕金・変圧器）と電線（たるませる）
    const poles = []; for (const sz of [XZ1 + 3.6, XZ0 - 3.6]) for (let x = WALK + 9; x < FAR - 8; x += 30) for (const sx of [1, -1]) poles.push([sx * x, sz]);
    for (const [x, z] of poles) { cgs.push(geoAt(new THREE.CylinderGeometry(.14, .2, 12, 10), { x, y: 6, z })); cgs.push(geoAt(new THREE.BoxGeometry(.1, .1, 1.8), { x, y: 11.2, z })); cgs.push(geoAt(new THREE.BoxGeometry(.1, .1, 1.4), { x, y: 10.4, z }));
      if (Math.abs(x) % 60 < 31) sg.push(geoAt(new THREE.CylinderGeometry(.28, .28, .9, 12), { x: x + .35, y: 9.3, z })); posts.push([x, z, .35]); }
    const wires = [];
    for (const sz of [XZ1 + 3.6, XZ0 - 3.6]) for (const sx of [1, -1]) { const L = poles.filter(p => p[1] === sz && Math.sign(p[0]) === sx).sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]));
      for (let k = 0; k < L.length - 1; k++) for (const [dy, dz] of [[11.2, -.8], [11.2, .8], [10.4, 0]]) { const a = new THREE.Vector3(L[k][0], dy, sz + dz), b = new THREE.Vector3(L[k + 1][0], dy, sz + dz), m = a.clone().lerp(b, .5); m.y -= .55;
        wires.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 16, .012, 3, false)); } }
    add(new THREE.Mesh(mergeGeometries(sg.map(g => g.index ? g.toNonIndexed() : g)), steel)); add(new THREE.Mesh(mergeGeometries(cgs.map(g => g.index ? g.toNonIndexed() : g)), conc));
    add(new THREE.Mesh(mergeGeometries(wires), M(0x1e1f21, { rough: .6, uv: .05, temp: .3, echo: .2 })), { cast: false, snd: false });
    const lampM = M(0xfff4dc, { basic: true, uv: .02, temp: .4 }); add(new THREE.Mesh(mergeGeometries(lamps.map(([x, y, z]) => geoAt(new THREE.BoxGeometry(.6, .04, .26), { x, y, z }))), lampM), { cast: false, snd: false });
    // ガードパイプ（白。車道との境の一部）
    const gp = []; for (const sx of [1, -1]) for (let z = -FAR + 4; z < FAR - 26; z += 2) if (!inCross(z) && !trees.some(([tx_, tz]) => Math.sign(tx_) === sx && Math.abs(tz - z) < 1.6) && Math.abs(z - SPAWN.z) > 3) {
      const x = sx * (ROAD + .3); gp.push(geoAt(new THREE.CylinderGeometry(.03, .03, .8, 6), { x, y: .4, z })); gp.push(geoAt(new THREE.CylinderGeometry(.025, .025, 2, 6), { rx: Math.PI / 2, x, y: .75, z: z + 1 })); gp.push(geoAt(new THREE.CylinderGeometry(.025, .025, 2, 6), { rx: Math.PI / 2, x, y: .45, z: z + 1 })); }
    add(new THREE.Mesh(mergeGeometries(gp.map(g => g.toNonIndexed())), M(0xeeeeea, { std: true, rough: .4, metal: .3, env: .6, uv: .05, temp: .3, echo: .7 })), { snd: false });
    // 自販機（中の明かりと冷やす機械で、まわりより温かい）
    const vend = canvasTex(128, 256, (g, w, h) => { g.fillStyle = "#e9ecef"; g.fillRect(0, 0, w, h); g.fillStyle = "#bcd3e6"; g.fillRect(8, 10, w - 16, 150);
      const C = ["#c0392b", "#2e86c1", "#f1c40f", "#27ae60", "#ecf0f1", "#8e5b3a", "#16a085", "#d35400"]; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { g.fillStyle = C[(r * 6 + c * 5) % C.length]; g.fillRect(14 + c * 17, 18 + r * 36, 11, 24); g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(16 + c * 17, 20 + r * 36, 2, 20); g.fillStyle = "#33414e"; g.fillRect(16 + c * 17, 44 + r * 36, 8, 4); }
      g.fillStyle = "#2c3e50"; g.fillRect(14, 170, 60, 30); g.fillStyle = "#555"; g.fillRect(84, 175, 28, 6); g.fillRect(24, 220, 80, 22); });
    const vm = [], vf = M(0xffffff, { std: true, map: vend, rough: .3, env: .7, uv: .08, temp: .6, echo: .9 });
    for (const [x, z, ry] of [[WALK - .45, 22, -Math.PI / 2], [WALK - .45, 23.05, -Math.PI / 2], [-WALK + .45, -31, Math.PI / 2], [-WALK + .45, 6, Math.PI / 2]]) { const g = new THREE.BoxGeometry(1, 1.83, .8); const uv = g.attributes.uv; for (let f = 0; f < 6; f++) if (f !== 4) for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, .05, .5); g.rotateY(ry); g.translate(x, .915, z); vm.push(g); block(x - .5, x + .5, z - .5, z + .5); }
    add(new THREE.Mesh(mergeGeometries(vm), vf));
  }

  // ---------------------------------------------------------------- 信号（横型の灯器・歩行者用の灯器）。青 25 秒・黄 3 秒・赤（全赤 2 秒をはさむ）の模式
  const sig = { t: 0, NS: "g", EW: "r", lamps: [] };
  { const box = M(0x55595d, { std: true, rough: .5, metal: .5, env: .6, uv: .1, temp: .35, echo: .9 }), gg = [];
    const lampSet = (x, y, z, ry, dirKey) => { const g = new THREE.BoxGeometry(1.25, .42, .25); g.rotateY(ry); g.translate(x, y, z); gg.push(g);
      const o = new THREE.Vector3(0, 0, .14).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry), side = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      [["g", 0x22d39a, -.4], ["y", 0xffb21a, 0], ["r", 0xff3b2f, .4]].forEach(([k, c, s]) => { const m = new THREE.MeshBasicMaterial({ color: c }); m.userData.on = new THREE.Color(c); m.userData.off = new THREE.Color(c).multiplyScalar(.12);
        const d = new THREE.Mesh(new THREE.CircleGeometry(.13, 20), m); d.position.set(x + o.x + side.x * s, y, z + o.z + side.z * s); d.rotation.y = ry; group.add(d); sig.lamps.push({ m, dir: dirKey, k }); }); };
    const ped = (x, z, ry, dirKey) => { const g = new THREE.BoxGeometry(.36, .7, .2); g.rotateY(ry); g.translate(x, 2.6, z); gg.push(g); const o = new THREE.Vector3(0, 0, .11).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      [["r", 0xff4433, .17], ["g", 0x2fe0b0, -.17]].forEach(([k, c, dy]) => { const m = new THREE.MeshBasicMaterial({ color: c }); m.userData.on = new THREE.Color(c); m.userData.off = new THREE.Color(c).multiplyScalar(.1); const d = new THREE.Mesh(new THREE.PlaneGeometry(.26, .28), m); d.position.set(x + o.x, 2.6 + dy, z + o.z); d.rotation.y = ry; group.add(d); sig.lamps.push({ m, dir: "p" + dirKey, k }); }); };
    // 四つの角に柱と腕
    for (const [sx, sz] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) { const x = sx * (ROAD + .6), z = sz > 0 ? XZ1 + .6 : XZ0 - .6; gg.push(geoAt(new THREE.CylinderGeometry(.11, .13, 6.2, 10), { x, y: 3.1, z })); posts.push([x, z, .3]);
      if (sx * sz > 0) { gg.push(geoAt(new THREE.CylinderGeometry(.06, .06, 3.4, 6), { rz: Math.PI / 2, x: x - sx * 1.7, y: 5.6, z })); lampSet(x - sx * 2.6, 5.6, z, sz > 0 ? 0 : Math.PI, "NS"); }
      else { gg.push(geoAt(new THREE.CylinderGeometry(.06, .06, 3.4, 6), { rx: Math.PI / 2, x, y: 5.6, z: z - sz * 1.7 })); lampSet(x, 5.6, z - sz * 2.6, sx > 0 ? Math.PI / 2 : -Math.PI / 2, "EW"); }
      ped(x, z, sz > 0 ? Math.PI : 0, "NS"); ped(x, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, "EW"); }
    add(new THREE.Mesh(mergeGeometries(gg.map(g => g.index ? g.toNonIndexed() : g)), box));
  }
  const CYC = 60;   // NS 青 25・黄 3・全赤 2 → EW 青 25・黄 3・全赤 2
  const phase = t => { const u = t % CYC; return u < 25 ? ["g", "r"] : u < 28 ? ["y", "r"] : u < 30 ? ["r", "r"] : u < 55 ? ["r", "g"] : u < 58 ? ["r", "y"] : ["r", "r"]; };

  // ---------------------------------------------------------------- 車（横から見た形を押し出した車体・ガラス・車輪。色は日本の道で多い白・銀・黒・紺）
  const cars = [];
  { const prof = new THREE.Shape(); [[-2.2, .32], [-2.25, .75], [-1.5, .86], [-.95, 1.42], [.6, 1.45], [1.3, .92], [2.15, .78], [2.25, .45], [2.15, .32]].forEach(([x, y], i) => i ? prof.lineTo(x, y) : prof.moveTo(x, y)); prof.closePath();
    const bodyG = new THREE.ExtrudeGeometry(prof, { depth: 1.62, bevelEnabled: true, bevelThickness: .08, bevelSize: .07, bevelSegments: 3, curveSegments: 4 }); bodyG.translate(0, 0, -.81); bodyG.rotateY(Math.PI / 2);   // 前が −z
    const glassG = new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); [[-1.42, .9], [-.92, 1.38], [.55, 1.4], [1.18, .94]].forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; })(), { depth: 1.66, bevelEnabled: false }); glassG.translate(0, 0, -.83); glassG.rotateY(Math.PI / 2);
    const wheelG = new THREE.CylinderGeometry(.32, .32, .24, 18); wheelG.rotateZ(Math.PI / 2);
    const glassM = M(0x1a2228, { std: true, rough: .08, metal: .2, env: 1.4, uv: .02, temp: .15, echo: .9 }), tyreM = M(0x161616, { std: true, rough: .9, uv: .03, temp: .55, echo: .6 });
    const headM = new THREE.MeshBasicMaterial({ color: 0xfff6e4 }), tailM = new THREE.MeshBasicMaterial({ color: 0xb3120c });
    const COL = [0xf2f2ef, 0xf2f2ef, 0xb9bcbf, 0x17181a, 0x1f2b44, 0x8b8f94, 0x6e1d1d];
    const make = () => { const g = new THREE.Group(), c = COL[(R() * COL.length) | 0];
      const bm = M(c, { std: true, phys: { clearcoat: 1, clearcoatRoughness: .08 }, rough: .35, metal: .55, env: 1.1, uv: .08, temp: .45, echo: .95 });
      const hood = new THREE.Mesh(bodyG, bm); hood.castShadow = true; g.add(hood); const gl = new THREE.Mesh(glassG, glassM); g.add(gl);
      for (const [x, z] of [[-.83, -1.35], [.83, -1.35], [-.83, 1.4], [.83, 1.4]]) { const w = new THREE.Mesh(wheelG, tyreM); w.position.set(x, .32, z); g.add(w); }
      for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(.32, .1, .04), headM); h.position.set(sx * .58, .72, -2.27); g.add(h); const t = new THREE.Mesh(new THREE.BoxGeometry(.3, .12, .04), tailM); t.position.set(sx * .6, .8, 2.27); g.add(t); }
      const trim = M(0x26282b, { std: true, rough: .55, metal: .2, env: .6, uv: .04, temp: .4, echo: .9 });   // 前後のバンパー・窓の下の黒い帯・ドアミラー・ナンバー
      for (const z of [-2.3, 2.3]) { const bp = new THREE.Mesh(new THREE.BoxGeometry(1.74, .2, .12), trim); bp.position.set(0, .42, z); g.add(bp); const np = new THREE.Mesh(new THREE.BoxGeometry(.33, .17, .02), M(0xf3f1e6, { rough: .5, uv: .3, temp: .4 })); np.position.set(0, .52, z + Math.sign(z) * .07); g.add(np); }
      for (const sx of [-1, 1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(.03, .12, 3.2), trim); sk.position.set(sx * .9, .36, 0); g.add(sk); const mr = new THREE.Mesh(new THREE.BoxGeometry(.16, .1, .08), bm); mr.position.set(sx * .95, 1.02, -.75); g.add(mr);
        const dl = new THREE.Mesh(new THREE.BoxGeometry(.012, .012, 2.2), trim); dl.position.set(sx * .885, .72, .05); g.add(dl); }
      // 前の温かさ（エンジン・ラジエーター）：熱の目で前が明るく写る模式
      const eng = new THREE.Mesh(new THREE.BoxGeometry(1.5, .25, .9), M(0x202020, { rough: .9, uv: .03, temp: .9, echo: .6 })); eng.position.set(0, .5, -1.6); g.add(eng);
      g.traverse(o => { if (o.isMesh) sonic.push(o); }); group.add(g); return g; };
    const lanes = [{ ax: "z", x: 1.75, dir: -1, stop: XZ1 + 6.4 }, { ax: "z", x: -1.75, dir: 1, stop: XZ0 - 6.4 }, { ax: "x", z: -12.25, dir: -1, stop: WALK + 4.6 }, { ax: "x", z: -15.75, dir: 1, stop: -WALK - 4.6 }];
    const per = mobile ? [3, 3, 2, 2] : [5, 4, 3, 3];
    lanes.forEach((L, li) => { for (let k = 0; k < per[li]; k++) { const g = make(); cars.push({ g, L, s: -FAR + k * (2 * FAR / per[li]) + rr(-4, 4), v: 8, vmax: rr(8, 11) }); } });
  }
  const carAt = c => { const p = c.L.dir * c.s; if (c.L.ax === "z") { c.g.position.set(c.L.x, 0, p); c.g.rotation.y = c.L.dir < 0 ? 0 : Math.PI; } else { c.g.position.set(p, 0, c.L.z); c.g.rotation.y = c.L.dir < 0 ? Math.PI / 2 : -Math.PI / 2; } };
  cars.forEach(carAt);

  // ---------------------------------------------------------------- 落とし物：麻縄の結び目（Qualia/touch の形を写す・実物大）
  let rope = null;
  import("./touch_objects.js").then(({ loadGeometry }) => loadGeometry({ make: "rope" })).then(g => {
    g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0); g.scale(.13, .13, .13); g.computeVertexNormals();   // 1 単位＝10 cm の模型 → 実物大（太さ 約 1.4 cm）
    const hemp = canvasTex(128, 128, (c, w, h) => { c.fillStyle = "#d2bb88"; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const l = 120 + Math.random() * 90; c.strokeStyle = `rgba(${l},${l * .82 | 0},${l * .55 | 0},.6)`; c.beginPath(); const x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); c.lineTo(x + 6, y + 2 + Math.random() * 3); c.stroke(); } });
    hemp.wrapS = hemp.wrapT = THREE.RepeatWrapping; hemp.repeat.set(2, 6);
    rope = new THREE.Mesh(g, M(0xffffff, { std: true, map: hemp, rough: .95, env: .25, uv: .25, temp: .3, echo: .3 })); rope.position.set(6.9, .03, 5.2); rope.rotation.y = 2.2; rope.castShadow = true; rope.receiveShadow = true; rope.name = "落とし物の結び目";
    group.add(rope); sonic.push(rope); out.rope = rope; }).catch(e => console.warn("結び目", e?.message ?? e));

  // ---------------------------------------------------------------- 毎こま
  const tmpV = new THREE.Vector3();
  function update(t, dt) {
    sig.t = t; const [ns, ew] = phase(t); sig.NS = ns; sig.EW = ew;
    for (const L of sig.lamps) { const st = L.dir === "NS" ? ns : L.dir === "EW" ? ew : L.dir === "pNS" ? (ns === "g" ? "g" : "r") : (ew === "g" ? "g" : "r"); L.m.color.copy(st === L.k ? L.m.userData.on : L.m.userData.off); }
    for (const c of cars) { const L = c.L, st = L.ax === "z" ? ns : ew, ahead = L.stop * L.dir; // 停止線までの距離（進む向きで測る）
      const d = (L.dir < 0 ? -L.stop : L.stop) - c.s; let target = c.vmax;
      if (st !== "g" && d > 0 && d < 30) target = Math.min(target, Math.max(0, (d - 1) * .6));
      for (const o of cars) if (o !== c && o.L === L) { const gap = o.s - c.s; if (gap > 0 && gap < 14) target = Math.min(target, Math.max(0, (gap - 6) * .9)); }
      c.v += Math.max(-6 * dt, Math.min(2.5 * dt, target - c.v)); c.s += c.v * dt; if (c.s > FAR) c.s -= 2 * FAR; carAt(c); void ahead; }
  }
  const out = {
    SPAWN, rope: null, update, cars, sig, lamps: lamps.filter(l => l[0] > 0).sort((a, b) => Math.abs(a[2] - SPAWN.z + 4) - Math.abs(b[2] - SPAWN.z + 4)),
    bounds: { x0: -FAR + 4, x1: FAR - 4, z0: -FAR + 4, z1: FAR - 24 },
    // 歩けない所：建物・幹・柱・自販機。車道は横断歩道の上だけ渡れる（walk＝歩く身体のとき）
    blocked(x, z, pad = .3, walk = true) {
      for (const [a, b, c, d] of boxes) if (x > a - pad && x < b + pad && z > c - pad && z < d + pad) return true;
      for (const [px, pz, r] of posts) if (Math.hypot(x - px, z - pz) < r + pad * .5) return true;
      if (!walk) return false;
      const onNS = Math.abs(x) < ROAD - .1, onEW = z > XZ0 + .1 && z < XZ1 - .1 && Math.abs(x) > ROAD;
      if (onNS && !(z > XZ1 + .2 && z < XZ1 + 3.8) && !(z < XZ0 - .2 && z > XZ0 - 3.8) && !(z >= XZ0 && z <= XZ1)) return true;
      if (onEW && !(Math.abs(x) > WALK + .2 && Math.abs(x) < WALK + 3.8)) return true;
      if (onNS && z >= XZ0 && z <= XZ1) return true;   // 交差点のまん中には入らない
      return false;
    },
    inside(x, z) { return x > this.bounds.x0 && x < this.bounds.x1 && z > this.bounds.z0 && z < this.bounds.z1; },
  };
  return out;
}
