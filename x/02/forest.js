/* 胡蝶の夢：森（2026-10-12）
   本人「モグラは削除。都市のところは削除。花、植物、木など、配置を変えて、より自然な景色に仕上げてください。
         また、花の種類も多様にしてください。まるで森の中を動いているような感覚がいいです。」
   関東の雑木林（コナラ・ケヤキ・イロハモミジ）と、谷すじのスギ林のつもりの、夏のはじめ（7 月ごろ）の午後の森。
   層：高木（樹冠）→ 亜高木・低木（モミジ・ヤマアジサイ・藪）→ 草と花 → 落ち葉と苔。
   置き方：木は最小距離つきの乱数（ポアソン円板）で、列にしない。草花は株のかたまり（群落）で、
           日なたの草地・林の縁・林の中の日陰・水辺と、それぞれの花が育つ場所に置く。
   花は 12 種、すべて日本の林・草地・水辺に自然に生える在来種で 7 月ごろに咲くもの（カワラナデシコ・キキョウ・オミナエシ・ウツボグサ・
           オカトラノオ・ノカンゾウ・ヤマユリ・ホタルブクロ・ドクダミ・ヤマアジサイ・ノハナショウブ・ハンゲショウ）。
           2026-10-12 栽培種・外来種（ヒマワリ・アラゲハンゴンソウ・ヒナゲシ）と人工物（赤く塗った板）は森から外した。形の根拠は 資料/調べたこと/森の草木_形の確かめ.md。
   軽さ：同じ形は InstancedMesh で一度に描く（木の葉・草・落ち葉・花）。幹は 24 m 四方ごとに一つにまとめて、見えない所は描かない。
   素材：樹皮と葉の写真は CC0（Poly Haven・ambientCG。台帳 M-0793〜0796）。モミジ・スギの葉、シダ、落ち葉、花びらは、この画面の中で描く。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { bladeGeo, stemGeo, geoAt, rockGeo } from "./nature.js?v=20261013k80";
import { crownHook } from "./zen.js";

const TAU = Math.PI * 2, V3 = THREE.Vector3;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(20261012), rr = (a, b) => a + (b - a) * R();
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

// ---------------------------------------------------------------- 場所の地図（ワールド座標・m）
export const MEADOW = { x: 4.5, z: -4.4, r: 5.8 };                  // 日なたの草地（林の中の明るいすき間）
export const SPAWN = { x: 0, z: 4.2 };
const GAPS = [MEADOW, { x: 0, z: 4.2, r: 3.2 }, { x: -11.5, z: 9, r: 3.4 }, { x: 13.5, z: 7.5, r: 3.8 }, { x: -2.5, z: 17, r: 3 }, { x: -19, z: -3, r: 3.2 }, { x: 18.5, z: -17, r: 3 }];
const POND = { x: -8, z: -7, r: 4.8 };
export const RIVER = [[-8, -7], [-5, -13], [1, -15], [9, -12], [18, -7], [30, -2], [44, 4]];
const PATH = [[-7, 30], [-4.5, 19], [-1.5, 10], [0, 4.2], [2.6, -1.4], [5.2, -7.6], [7.6, -11.6]];
const WALK = { x0: -27, x1: 29, z0: -25, z1: 26 };
const SUGI = [{ x: 25, z: 21, rx: 13, rz: 10 }, { x: -34, z: 24, rx: 12, rz: 14 }, { x: 40, z: -20, rx: 10, rz: 12 }];
function polyDist(P, x, z) {
  let best = 1e9;
  for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); }
  return best;
}
// 川はなめらかな曲線（umwelt.js の川と同じ点）を細かくとった折れ線で測る
let RIVER_PTS = null;
const dRiver = (x, z) => polyDist(RIVER_PTS, x, z);
const dPond = (x, z) => Math.hypot(x - POND.x, z - POND.z) - POND.r;
const dPath = (x, z) => polyDist(PATH, x, z);
const gapK = (x, z) => GAPS.reduce((m, g) => Math.max(m, sstep(g.r + 2.6, g.r - .8, Math.hypot(x - g.x, z - g.z))), 0);
// 明るさ（0＝樹冠の下・1＝空がひらけている）
const lightAt = (x, z) => clamp(Math.max(gapK(x, z), sstep(3.6, 1.2, dRiver(x, z)) * .8, sstep(2.8, 0, dPond(x, z)) * .9, sstep(1.6, .3, dPath(x, z)) * .35), 0, 1);
const inSugi = (x, z) => SUGI.some(s => ((x - s.x) / s.rx) ** 2 + ((z - s.z) / s.rz) ** 2 < 1);
const near = (x, z, pad = 8) => x > WALK.x0 - pad && x < WALK.x1 + pad && z > WALK.z0 - pad && z < WALK.z1 + pad;

// ---------------------------------------------------------------- 形の部品
function taperTube(pts, r0, r1, radial, seg, uvK = 1) {
  const c = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(c, seg, 1, radial, false), p = g.attributes.position, uv = g.attributes.uv, q = new V3(), v = new V3();
  const L = c.getLength(), circ = TAU * (r0 + r1) / 2;
  for (let i = 0; i < p.count; i++) { const t = uv.getX(i); c.getPointAt(t, q); v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(q).multiplyScalar(lerp(r0, r1, t)); p.setXYZ(i, q.x + v.x, q.y + v.y, q.z + v.z);
    uv.setXY(i, uv.getY(i), t * L / Math.max(circ, .05) * uvK * .5); }   // 樹皮の縦の筋が幹にそうように（周り＝u・長さ＝v）
  g.computeVertexNormals(); return g;
}
const strip = g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };
// 株の見本（Group）を、材質ごとの一つの形に焼く
function bake(group) {
  group.updateMatrixWorld(true); const by = new Map();
  group.traverse(o => { if (!o.isMesh) return; const g = strip(o.geometry.clone()).applyMatrix4(o.matrixWorld); (by.get(o.material) || by.set(o.material, []).get(o.material)).push(g); });
  return [...by].map(([m, gs]) => [m, mergeGeometries(gs)]);
}
const Mesh = (geo, mat, o = {}) => { const m = new THREE.Mesh(geo, mat); if (o.p) m.position.set(...o.p); if (o.r) m.rotation.set(...o.r, o.order || "XYZ"); return m; };

export function buildForest(ctx) {
  const { M, tx, canvasTex, photoTex, forest, pick, sonic, mobile, riverCurve } = ctx;
  RIVER_PTS = riverCurve.getSpacedPoints(160).map(v => [v.x, v.z]);
  const out = { trunks: [], shafts: null, sunflower: null, meadow: MEADOW };
  const Q = mobile ? .5 : 1;                                  // スマホは数を半分ほどに
  const quat = new THREE.Quaternion(), eul = new THREE.Euler(), m4 = new THREE.Matrix4(), col = new THREE.Color();

  // 同じ形の株を、たくさんの場所に一度に置く。list の要素：{x, z, y, ry, s, tx, tz, c（色をつける材質だけに掛ける）}
  function field(protos, list, o = {}) {
    const meshes = [];
    protos.forEach((proto, vi) => {
      const items = list.filter(it => (it.v || 0) % protos.length === vi); if (!items.length) return;
      for (const [mat, geo] of proto) {
        const im = new THREE.InstancedMesh(geo, mat, items.length);
        items.forEach((it, i) => { eul.set(it.tx || 0, it.ry || 0, it.tz || 0, "YXZ"); quat.setFromEuler(eul); const s = it.s || 1; m4.compose(new V3(it.x, it.y || 0, it.z), quat, new V3(s, s * (it.sy || 1), s)); im.setMatrixAt(i, m4);
          if (mat.userData.tint && it.c) im.setColorAt(i, it.c); else { const l = it.l ?? (.88 + R() * .24); im.setColorAt(i, col.setRGB(l, l, l)); } });
        im.computeBoundingSphere(); im.userData.noCast = !!o.noCast; if (o.noRay) im.raycast = () => {};
        if (mat.userData.sonic) sonic.push(im);
        forest.add(im); meshes.push(im);
      }
    });
    return meshes;
  }
  // 群落：中心のまわりに株をばらまく（正規分布＝まん中ほど密）
  function clumps(nC, per, spread, okC, okP, mk) {
    const list = [];
    for (let k = 0, tries = 0; k < nC && tries < nC * 400; tries++) {
      const x = rr(-30, 32), z = rr(-28, 30); if (!okC(x, z)) continue; k++;
      const n = Math.max(1, Math.round(per * (.6 + R() * .8)));
      for (let j = 0; j < n; j++) { const px = x + gauss() * spread, pz = z + gauss() * spread; if (okP(px, pz)) list.push(mk(px, pz)); }
    }
    return list;
  }
  const clumpsAt = (cx, cz, n, spread, okP, mk) => { const l = []; for (let j = 0; j < n; j++) { const px = cx + gauss() * spread, pz = cz + gauss() * spread; if (okP(px, pz)) l.push(mk(px, pz)); } return l; };
  // 幹・藪・石の場所（3 m 四方の升で引く）
  const tcell = new Map(), addTrunk = t => { out.trunks.push(t); const k = Math.floor(t[0] / 3) + "," + Math.floor(t[1] / 3); (tcell.get(k) || tcell.set(k, []).get(k)).push(t); };
  const hitTrunk = (x, z, pad) => { const cx = Math.floor(x / 3), cz = Math.floor(z / 3); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const t of tcell.get((cx + i) + "," + (cz + j)) || []) if (Math.hypot(x - t[0], z - t[1]) < t[2] + pad) return true; return false; };
  const free = (x, z, pad = .3) => dPond(x, z) > pad && dRiver(x, z) > .9 + pad && !hitTrunk(x, z, pad);

  // ---------------------------------------------------------------- 地面：落ち葉の土・苔・草地・踏み跡（頂点の色で塗り分け、写真の土をかける）
  {
    const S = 150, N = mobile ? 90 : 120, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, cs = [];
    const nz = (x, z) => Math.sin(x * .31 + Math.sin(z * .17) * 2) * Math.sin(z * .27 + Math.cos(x * .13) * 2) + .5 * Math.sin(x * .9 + z * .7) * Math.sin(z * 1.1 - x * .4);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), L = lightAt(x, z), n = nz(x, z), moss = sstep(.35, .9, n) * (1 - L) * .9, wet = sstep(2.5, 0, Math.min(dRiver(x, z) - .8, dPond(x, z)));
      const meadow = sstep(.25, .8, gapK(x, z)), path = sstep(1.2, .35, dPath(x, z));
      let r = .78, gg = .72, b = .64;                                   // 落ち葉の積もった土
      r = lerp(r, .55, moss); gg = lerp(gg, .78, moss); b = lerp(b, .42, moss);                         // 苔
      r = lerp(r, .62, meadow); gg = lerp(gg, .86, meadow); b = lerp(b, .44, meadow);                    // 草地
      r = lerp(r, .6, wet * .6); gg = lerp(gg, .62, wet * .6); b = lerp(b, .52, wet * .6);                // 水辺の湿った土
      r = lerp(r, 1.02, path * .7); gg = lerp(gg, .93, path * .7); b = lerp(b, .82, path * .7);            // 踏み跡
      const k = .9 + .14 * n; cs.push(r * k, gg * k, b * k);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3));
    const ground = new THREE.Mesh(g, M(0xffffff, { std: true, rough: 1, metal: 0, env: .3, map: photoTex("soil_forest.webp", 40, 40), vc: true, uv: .06, temp: .1 }));
    ground.userData.noCast = true; forest.add(ground); pick.push(ground); out.ground = ground;
  }

  // ---------------------------------------------------------------- 絵の具（その場で描く）
  const leafCanvas = (w, h, draw) => { const t = canvasTex(w, h, draw); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  // イロハモミジの小枝：葉は対生、掌状に 5〜7 裂け（ここでは 7）、裂片は細く先がとがり、縁は重鋸歯。葉身 4〜6 cm・葉柄は長め
  const momijiTex = leafCanvas(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = "#6b4a3a"; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2 + 6, 20); g.stroke();
    const leaf = (x, y, L, rot, hue) => {
      g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = "#7a5a3a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -L * .45); g.stroke(); g.translate(0, -L * .45);
      const p = new Path2D(); p.moveTo(0, 0);
      for (let k = -3; k <= 3; k++) { const a = k * .44, l = L * (1 - Math.abs(k) * .13), wd = L * .1;
        const tip = [Math.sin(a) * l, -Math.cos(a) * l], lft = [Math.sin(a - .2) * wd * 2.2, -Math.cos(a - .2) * wd * 2.2], rgt = [Math.sin(a + .2) * wd * 2.2, -Math.cos(a + .2) * wd * 2.2];
        for (let s = 0; s <= 6; s++) { const t = s / 6, j = (s % 2 ? 1 : -.4) * 2.2; p.lineTo(lerp(lft[0], tip[0], t) + Math.cos(a) * j, lerp(lft[1], tip[1], t) + Math.sin(a) * j); }
        for (let s = 6; s >= 0; s--) { const t = s / 6, j = (s % 2 ? 1 : -.4) * 2.2; p.lineTo(lerp(rgt[0], tip[0], t) - Math.cos(a) * j, lerp(rgt[1], tip[1], t) - Math.sin(a) * j); }
      }
      p.closePath(); g.fillStyle = `hsl(${hue},48%,${34 + R() * 8}%)`; g.fill(p); g.strokeStyle = "rgba(210,235,170,.35)"; g.lineWidth = 1; for (let k = -3; k <= 3; k++) { const a = k * .44; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(a) * L * .8, -Math.cos(a) * L * .8); g.stroke(); }
      g.restore();
    };
    for (let k = 0; k < 4; k++) { const y = h - 40 - k * 52, L = 44 - k * 3; leaf(w / 2 + 2, y, L, -.95 - k * .05, 92 + k * 4); leaf(w / 2 + 4, y - 4, L, .95 + k * .05, 96 + k * 3); }
    leaf(w / 2 + 6, 46, 40, 0, 100);
  });
  // スギの枝先：細い枝に、短い針のような葉（鎌状にまがる）がらせんにびっしりつく。濃い緑
  const sugiTex = leafCanvas(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const twig = (x0, y0, x1, y1, n, len) => { g.strokeStyle = "#4a5a2c"; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      for (let i = 0; i < n; i++) { const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t), a = Math.atan2(y1 - y0, x1 - x0); for (const s of [-1, 1]) { const b = a + s * (.75 + R() * .3), l = len * (1 - t * .45); g.strokeStyle = `hsl(${105 + R() * 15},${38 + R() * 10}%,${22 + R() * 12}%)`; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(b) * l * .6, y + Math.sin(b) * l * .6, x + Math.cos(b + s * .3) * l, y + Math.sin(b + s * .3) * l); g.stroke(); } } };
    twig(w / 2, h, w / 2, 10, 60, 16);
    for (let k = 0; k < 7; k++) { const y = h - 30 - k * 30, s = k % 2 ? 1 : -1; twig(w / 2, y, w / 2 + s * (40 - k * 3), y - 34, 18, 11); }
  });
  // 杉の樹皮：赤褐色で、縦に細長くはがれる繊維
  const sugiBark = canvasTex(128, 256, (g, w, h) => { g.fillStyle = "#6e4a34"; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { const x = R() * w; g.strokeStyle = `rgba(${R() < .5 ? "40,24,16" : "150,110,80"},${.25 + R() * .35})`; g.lineWidth = 1 + R() * 3; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * .05 + i) * 2, y); g.stroke(); } });
  sugiBark.wrapS = sugiBark.wrapT = THREE.RepeatWrapping;
  // シダの葉（一回羽状。羽片は先ほど小さく、ふちが浅く裂ける）
  const fernTex = leafCanvas(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = "#4e5f2e"; g.lineWidth = 2.2; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 4); g.stroke();
    for (let k = 0; k < 22; k++) { const t = k / 22, y = h - 20 - t * (h - 30), L = (w / 2 - 3) * Math.sin(Math.PI * Math.pow(1 - t, .7)) * (t < .08 ? .6 : 1);
      for (const s of [-1, 1]) { g.fillStyle = `hsl(${92 + R() * 12},45%,${28 + R() * 8}%)`; g.beginPath(); g.moveTo(w / 2, y); for (let i = 0; i <= 6; i++) { const u = i / 6; g.lineTo(w / 2 + s * L * u, y - 5 * Math.sin(Math.PI * u) - u * 6 - (i % 2) * 1.5); } for (let i = 6; i >= 0; i--) { const u = i / 6; g.lineTo(w / 2 + s * L * u, y + 3 * Math.sin(Math.PI * u) - u * 6); } g.fill(); } }
  });
  // 落ち葉（去年の葉）：白っぽい葉の形に主脈。色は一枚ずつ茶・黄土・こげ茶を掛ける
  const litterTex = leafCanvas(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#e8e2d6"; g.beginPath(); g.moveTo(32, 60); g.bezierCurveTo(4, 44, 6, 14, 32, 4); g.bezierCurveTo(58, 14, 60, 44, 32, 60); g.fill(); g.strokeStyle = "rgba(90,70,50,.55)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(32, 60); g.lineTo(32, 6); g.stroke(); for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(32, 58 - k * 9); g.lineTo(14, 50 - k * 9); g.moveTo(32, 58 - k * 9); g.lineTo(50, 50 - k * 9); g.stroke(); } });

  // ---------------------------------------------------------------- 木
  const spray = tx("leaf_spray.webp", 1, 1), spray2 = tx("leaf_spray2.webp", 1, 1); for (const t of [spray, spray2]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const leafMat = (map, o = {}) => M(0xffffff, { std: true, map, alphaTest: .45, side: THREE.DoubleSide, rough: o.rough ?? .78, env: .4, uv: o.uv ?? .04, temp: .09, wind: o.wind ?? .05, windH: o.windH ?? 9, key: "crown", hook: crownHook });
  const SP = {
    // コナラ：雑木林の主。幹はやや曲がりながら 5 m ほどまで枝を出さず、太い枝が斜めに分かれ、樹冠は不整形。葉は倒卵形であらい鋸歯（写真の葉）
    konara: { bark: "konara", leaf: leafMat(spray2), card: 1.05, trunkH: [4.5, 6.5], r: [.2, .34], limbs: [3, 4], spread: .85, len: [3.6, 5.2], fork: 2, sub: .7, up: .18, decay: .62, wig: .45, cards: 260, cluster: 1.7, tint: [.82, .9, .72] },
    // ケヤキ：低い位置から何本もの太い枝が斜め上へ分かれ、箒を逆さにしたような樹形。葉は卵形で弧を描く鋸歯
    keyaki: { bark: "keyaki", leaf: leafMat(spray), card: .9, trunkH: [2.6, 3.8], r: [.26, .4], limbs: [5, 7], spread: .42, len: [5, 7], fork: 2, sub: .5, up: .32, decay: .6, wig: .25, cards: 280, cluster: 1.6, tint: [.86, .93, .78] },
    // イロハモミジ：林の中の亜高木。幹は細く、枝を横に広げて層になる
    momiji: { bark: "momiji", leaf: leafMat(momijiTex, { windH: 4 }), card: .58, trunkH: [1.1, 1.9], r: [.07, .12], limbs: [4, 5], spread: 1.5, len: [1.8, 2.8], fork: 2, sub: .9, up: .06, decay: .6, wig: .3, cards: 130, cluster: 1.05, flat: .45, tint: [.95, 1, .9] },
    // スギ：まっすぐな幹、円錐形の樹冠
    sugi: { bark: "sugi", leaf: leafMat(sugiTex, { rough: .75, windH: 14 }), card: 1.25, tint: [.78, .86, .74] },
  };
  const barkM = {
    keyaki: M(0xd8d2c8, { std: true, map: photoTex("bark_zelkova.webp", 1, 1), nmap: tx("bark_zelkova_n.webp", 1, 1, false), ns: .65, orm: tx("bark_zelkova_orm.webp", 1, 1, false), rough: 1, env: .35, uv: .05, temp: .1 }),
    // コナラの樹皮は灰黒色で縦に不規則な裂け目が入る。クスノキの樹皮の写真（縦の裂け目）を、灰色寄りに染めて使う
    konara: M(0xb4aea4, { std: true, map: photoTex("bark_camphor.webp", 1, 1), nmap: tx("bark_camphor_n.webp", 1, 1, false), ns: .75, orm: tx("bark_camphor_orm.webp", 1, 1, false), rough: 1, env: .3, uv: .05, temp: .1 }),
    // モミジの樹皮はなめらかな灰褐色（若いケヤキの写真を灰色寄りに）
    momiji: M(0xa9a69a, { std: true, map: photoTex("bark_zelkova.webp", 1, 1), rough: .95, env: .3, uv: .05, temp: .1 }),
    sugi: M(0xffffff, { std: true, map: sugiBark, rough: 1, env: .25, uv: .05, temp: .1 }),
  };
  const woodChunks = new Map(), leafCards = { konara: [], keyaki: [], momiji: [], sugi: [] };
  const addWood = (kind, x, z, geo) => { const C = near(x, z, 0) ? 20 : 48, key = kind + ":" + C + ":" + Math.floor(x / C) + ":" + Math.floor(z / C); (woodChunks.get(key) || woodChunks.set(key, []).get(key)).push(strip(geo)); };
  function limb(from, dir, len, r0, depth, sp, acc, det) {
    const pts = [from.clone()]; let p = from.clone(); const d = dir.clone(), n = det ? 4 : 3;
    for (let i = 1; i <= n; i++) { d.add(new V3((R() - .5) * sp.wig, .04, (R() - .5) * sp.wig)).normalize(); p = p.clone().addScaledVector(d, len / n); pts.push(p); }
    const r1 = r0 * .55; acc.geos.push(taperTube(pts, r0, r1, det ? 6 : 4, det ? 6 : 3));
    if (depth > 0) acc.mids.push(p.clone());
    if (depth > 0) for (let j = 0; j < sp.fork; j++) { const a = j / sp.fork * TAU + R() * 2.2; limb(pts[n - (j % 2)], new V3(d.x + Math.cos(a) * sp.sub, d.y + sp.up, d.z + Math.sin(a) * sp.sub).normalize(), len * sp.decay, r1, depth - 1, sp, acc, det); }
    else acc.tips.push(p);
  }
  function tree(kind, x, z, det, scale = 1) {
    const sp = SP[kind], acc = { geos: [], tips: [], mids: [] }, base = new V3(x, 0, z);
    if (kind === "sugi") {
      const H = rr(17, 24) * scale, r0 = rr(.24, .34) * scale;
      acc.geos.push(taperTube([base, new V3(x + rr(-.15, .15), H * .5, z + rr(-.15, .15)), new V3(x, H, z)], r0, .03, det ? 8 : 5, det ? 6 : 3, 1));
      acc.geos.push(geoAt(new THREE.CylinderGeometry(r0 * 1.05, r0 * 1.5, .4, det ? 8 : 5), { x, y: .2, z }));
      const y0 = H * rr(.32, .42), step = det ? .55 : 1.1, cards = [];
      for (let y = y0; y < H; y += step) { const k = (H - y) / (H - y0), cr = .35 + k * rr(2, 2.6) * scale, n = Math.round((det ? 6 : 4) * (.5 + k));
        for (let i = 0; i < n; i++) { const a = R() * TAU, rd = cr * (.35 + R() * .65), pos = new V3(x + Math.cos(a) * rd, y + rr(-.2, .2), z + Math.sin(a) * rd), o = new V3(Math.cos(a), -.25 - R() * .3, Math.sin(a)).normalize();
          cards.push([pos, o, new V3(x, y, z), .8 + R() * .5, k]); } }
      leafCards.sugi.push(...cards);
      addTrunk([x, z, r0 + .1]);
      for (const g of acc.geos) addWood("sugi", x, z, g);
      return;
    }
    const tH = rr(...sp.trunkH) * scale, r0 = rr(...sp.r) * scale, lean = new V3(rr(-.12, .12), 1, rr(-.12, .12)).normalize();
    const top = base.clone().addScaledVector(lean, tH);
    acc.geos.push(taperTube([base, base.clone().lerp(top, .5).add(new V3(rr(-.1, .1), 0, rr(-.1, .1))), top], r0, r0 * .78, det ? 10 : 6, det ? 6 : 3));
    if (det) acc.geos.push(geoAt(new THREE.CylinderGeometry(r0, r0 * 1.45, .45, 10, 1, true), { x, y: .2, z }));   // 根張り
    const nL = Math.round(rr(...sp.limbs)), a0 = R() * TAU;
    for (let k = 0; k < nL; k++) { const a = a0 + k / nL * TAU + rr(-.3, .3); limb(top.clone().add(new V3(0, -rr(0, .5), 0)), new V3(Math.cos(a) * sp.spread, 1, Math.sin(a) * sp.spread).normalize(), rr(...sp.len) * scale, r0 * .62, det ? 1 : 0, sp, acc, det); }
    // 葉：枝先のまわりに、外と上へ向けて房を散らす
    const ctr = acc.tips.reduce((s, t) => s.add(t), new V3()).multiplyScalar(1 / acc.tips.length); ctr.y -= 1;
    const n = Math.round(sp.cards * (det ? 1 : .42) * Q * scale), ymin = Math.min(...acc.tips.map(t => t.y)), ymax = Math.max(...acc.tips.map(t => t.y));
    const anchors = acc.mids.length ? [...acc.tips, ...acc.tips, ...acc.mids] : acc.tips;   // 枝先を多めに、枝の途中にも
    for (let i = 0; i < n; i++) { const t = anchors[i % anchors.length], rd = sp.cluster * (det ? 1 : 1.35) * scale * (.25 + Math.pow(R(), .6) * .75);
      const dv = new V3(R() - .5, (R() - .5) * (sp.flat ? .5 : .9), R() - .5).normalize().multiplyScalar(rd), pos = t.clone().add(dv), o = pos.clone().sub(ctr).normalize();
      leafCards[kind].push([pos, o, ctr.clone(), (det ? 1 : 1.45) * scale * (.8 + R() * .4), clamp((pos.y - ymin) / Math.max(1, ymax - ymin), 0, 1)]); }
    addTrunk([x, z, r0 + .08]);
    for (const g of acc.geos) addWood(kind, x, z, g);
  }
  // 高木：ポアソン円板（最小距離つきの乱数）。すき間・池・川・踏み跡はあける
  const placed = [], cell = new Map(), ck = (x, z) => Math.floor(x / 4) + "," + Math.floor(z / 4);
  const farEnough = (x, z, d) => { for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (const p of cell.get((Math.floor(x / 4) + i) + "," + (Math.floor(z / 4) + j)) || []) if (Math.hypot(p[0] - x, p[1] - z) < d) return false; return true; };
  const put = (x, z, kind) => { placed.push([x, z, kind]); const k = ck(x, z); (cell.get(k) || cell.set(k, []).get(k)).push([x, z]); };
  const canopyOK = (x, z) => Math.hypot(x, z) < (mobile ? 47 : 58) && gapK(x, z) < .12 && dPond(x, z) > 1.4 && dRiver(x, z) > 2.4 && dPath(x, z) > 1.4;
  // 草地のへりに、低い枝のあるコナラを一本（アオガラがとまる枝）
  const perchTree = [MEADOW.x + 5.4, MEADOW.z - 3.6]; put(...perchTree, "konara");
  for (let i = 0; i < (mobile ? 5000 : 9000); i++) {
    const x = rr(-58, 58), z = rr(-58, 58); if (!canopyOK(x, z)) continue;
    const sg = inSugi(x, z), d = sg ? 2.9 : (near(x, z, 0) ? 4.3 : 5.2) * (mobile ? 1.12 : 1); if (!farEnough(x, z, d)) continue;
    put(x, z, sg ? "sugi" : R() < .62 ? "konara" : "keyaki");
  }
  for (const [x, z, kind] of placed) tree(kind, x, z, near(x, z, 6), kind === "sugi" ? 1 : rr(.9, 1.15));
  // 亜高木：イロハモミジ（日陰〜半日陰。高木のあいだ）
  let nM = 0;
  for (let i = 0; i < 3000 && nM < (mobile ? 26 : 44); i++) { const x = rr(-34, 36), z = rr(-32, 34); if (!canopyOK(x, z) || inSugi(x, z) || lightAt(x, z) > .55 || !farEnough(x, z, 3)) continue; put(x, z, "momiji"); tree("momiji", x, z, near(x, z, 2), rr(.8, 1.2)); nM++; }
  // 幹（材ごと・24 m 四方ごとに一つ）
  for (const [key, gs] of woodChunks) { const mesh = new THREE.Mesh(mergeGeometries(gs), barkM[key.split(":")[0]]); mesh.castShadow = true; forest.add(mesh); sonic.push(mesh); }
  // 葉の房
  const cardGeo = L => { const g = new THREE.PlaneGeometry(L, L); g.translate(0, L / 2, 0); return g; };
  const xA = new V3(), yA = new V3(), zA = new V3(), rv = new V3();
  for (const [kind, cards] of Object.entries(leafCards)) {
    if (!cards.length) continue; const sp = SP[kind], geo = cardGeo(sp.card), im = new THREE.InstancedMesh(geo, sp.leaf, cards.length), ctrA = new Float32Array(cards.length * 3);
    cards.forEach(([pos, o, c, s, h], i) => {
      if (kind === "sugi") { yA.copy(o); rv.set(R() - .5, 1, R() - .5); } else { yA.copy(o).add(new V3((R() - .5) * 1.3, .3 + R() * .5, (R() - .5) * 1.3)).normalize(); rv.set(R() - .5, R() - .5, R() - .5); }
      xA.crossVectors(yA, rv).normalize(); zA.crossVectors(xA, yA);
      m4.makeBasis(xA.multiplyScalar(s), yA.multiplyScalar(s), zA.multiplyScalar(s)); m4.setPosition(pos); im.setMatrixAt(i, m4);
      const l = .62 + .3 * h + R() * .18; im.setColorAt(i, col.setRGB(l * sp.tint[0], l * sp.tint[1], l * sp.tint[2])); ctrA.set([c.x, c.y, c.z], i * 3);
    });
    geo.setAttribute("aCtr", new THREE.InstancedBufferAttribute(ctrA, 3)); im.raycast = () => {}; im.castShadow = true; im.computeBoundingSphere(); forest.add(im);
    if (kind === "keyaki") { out.leafIM = im; out.leafMat = sp.leaf; }
  }
  // アオガラのとまる枝（草地のへりのコナラから、草地のほうへ横に出る低い枝）
  {
    const [px, pz] = perchTree, dir = new V3(MEADOW.x - px, 0, MEADOW.z - pz).normalize(), a = new V3(px, 2.35, pz).addScaledVector(dir, .2), b = a.clone().addScaledVector(dir, 1.6).add(new V3(0, .22, 0));
    const br = new THREE.Mesh(taperTube([a, a.clone().lerp(b, .5).add(new V3(0, .05, 0)), b], .06, .018, 6, 6), barkM.konara); br.castShadow = true; forest.add(br);
    out.perch = a.clone().lerp(b, .62); out.perch.y += .05; out.perchDir = dir;
  }

  // ---------------------------------------------------------------- 倒木と石（苔は上を向いた面に）
  {
    const logG = [], logM = M(0xffffff, { std: true, map: photoTex("bark_camphor.webp", 1, 1), vc: true, rough: 1, env: .25, uv: .05, temp: .12 });
    const mossy = (g, k = .35) => { const n = g.attributes.normal, c = []; for (let i = 0; i < n.count; i++) { const m = sstep(k, .85, n.getY(i)); c.push(lerp(1, .55, m), lerp(1, .82, m), lerp(1, .4, m)); } g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); return g; };
    let nLog = 0;
    for (let i = 0; i < 400 && nLog < 7; i++) { const x = rr(-24, 26), z = rr(-22, 24); if (lightAt(x, z) > .3 || dPath(x, z) < 2 || !free(x, z, 1.5)) continue; const a = R() * Math.PI, L = rr(3, 5.5), r = rr(.14, .26);
      const pA = new V3(x - Math.cos(a) * L / 2, r * .8, z - Math.sin(a) * L / 2), pB = new V3(x + Math.cos(a) * L / 2, r * .7, z + Math.sin(a) * L / 2);
      const g = strip(taperTube([pA, pA.clone().lerp(pB, .5).add(new V3(0, .03, 0)), pB], r, r * .7, 9, 8)); logG.push(mossy(g)); addTrunk([x, z, .01]); nLog++;
      out.logs = (out.logs || []).concat([[pA, pB, r]]); }
    if (logG.length) { const lm = new THREE.Mesh(mergeGeometries(logG), logM); lm.castShadow = true; forest.add(lm); }
    const stoneM = M(0xd8d2c6, { vc: true, map: photoTex("rock_surface.webp", 1, 1), uv: .1, temp: .3 }), rocks = [];
    const rock = (x, z, s, seed) => { const g = strip(rockGeo(seed, 1)); const gg = geoAt(g, { s, sy: s * rr(.7, 1.1), ry: R() * 6, x, y: s * .18, z }); const c = gg.attributes.normal, cs = []; for (let i = 0; i < c.count; i++) { const m = sstep(.45, .9, c.getY(i)) * (s > .3 ? .8 : .3); cs.push(lerp(.95, .5, m), lerp(.93, .76, m), lerp(.9, .38, m)); } gg.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3)); rocks.push(gg); };
    // 日なたの石（草地）・沢の石・林の中の苔むした石
    for (const [dx, dz, s] of [[-2.6, 1.8, .42], [-1.9, 2.3, .26], [2.8, 2.6, .34]]) rock(MEADOW.x + dx, MEADOW.z + dz, s, Math.floor(R() * 99));
    out.sunStones = [[MEADOW.x - 2.6, MEADOW.z + 1.8], [MEADOW.x + 2.8, MEADOW.z + 2.6]];
    for (let i = 0, n = 0; i < 600 && n < 40; i++) { const x = rr(-40, 44), z = rr(-36, 40), dr = dRiver(x, z); if (dr > 1.6 || dr < .5 || dPond(x, z) < .4) continue; rock(x, z, rr(.15, .4), i); n++; }
    for (let i = 0, n = 0; i < 400 && n < 26; i++) { const x = rr(-30, 32), z = rr(-28, 30); if (lightAt(x, z) > .4 || !free(x, z, .8) || dPath(x, z) < 1.5) continue; rock(x, z, rr(.25, .7), i + 300); addTrunk([x, z, .3]); n++; }
    const rm = new THREE.Mesh(mergeGeometries(rocks), stoneM); rm.castShadow = true; forest.add(rm); sonic.push(rm);
  }

  // ---------------------------------------------------------------- 草花の材質（色をつける材質は userData.tint、紫外の音の的は userData.sonic）
  const mat = (hex, o = {}) => { const m = M(hex, { side: THREE.DoubleSide, uv: o.uv ?? .05, temp: o.temp ?? .12, wind: o.wind ?? .03, windH: o.windH ?? 1, map: o.map || null, alphaTest: o.alphaTest || 0 }); m.userData.tint = !!o.tint; m.userData.sonic = !!o.sonic; return m; };
  const stemM = mat(0x5a7f3c), leafM = mat(0x4f7a36), darkLeafM = mat(0x3c5e2c), paleLeafM = mat(0x6a8f48);
  const tepalTex = (draw, w = 64, h = 128) => canvasTex(w, h, draw);
  // 花びらの長さ方向の v（0＝根もと → 1＝先）に合わせて描く。canvas の下＝根もと
  const lilyTex = tepalTex((g, w, h) => { g.fillStyle = "#f7f3ea"; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(.3, "rgba(240,196,40,0)"); gr.addColorStop(.5, "rgba(240,196,40,.95)"); gr.addColorStop(.7, "rgba(240,196,40,0)"); g.fillStyle = gr; g.fillRect(0, h * .12, w, h * .8);
    for (let i = 0; i < 46; i++) { const y = h * (.25 + R() * .6), x = w / 2 + (R() - .5) * w * .8; g.fillStyle = `rgba(${150 + R() * 40},${40 + R() * 20},${30},${.8})`; g.beginPath(); g.ellipse(x, y, 1.6 + R() * 1.6, 2 + R() * 2, 0, 0, TAU); g.fill(); } });
  const kanzouTex = tepalTex((g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "#f2b23a"); gr.addColorStop(.3, "#e8742a"); gr.addColorStop(1, "#d9541e"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(250,205,120,.75)"; g.fillRect(w * .45, h * .25, w * .1, h * .65); });
  const bellTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#f6eff3"; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(120,50,90,.55)"; g.beginPath(); g.arc(R() * w, h * (.3 + R() * .6), 1.2, 0, TAU); g.fill(); } });
  const irisTex = tepalTex((g, w, h) => { g.fillStyle = "#7b3a8e"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(60,20,80,.5)"; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(w / 2, h); g.quadraticCurveTo(w / 2 + i * 5, h * .5, w / 2 + i * 8, 0); g.stroke(); } const gr = g.createLinearGradient(0, h, 0, h * .5); gr.addColorStop(0, "#f2c51e"); gr.addColorStop(1, "rgba(242,197,30,0)"); g.fillStyle = gr; g.fillRect(w * .44, h * .5, w * .12, h * .5); });
  const halfWhite = canvasTex(16, 64, (g, w, h) => { g.fillStyle = "#5d8a3e"; g.fillRect(0, 0, w, h); g.fillStyle = "#f1f2e8"; g.fillRect(0, h * .4, w, h * .6); });   // ハンゲショウ：花のころ、上の葉の根もと側が白くなる
  const lilyM = mat(0xffffff, { map: lilyTex, uv: .2, tint: false, sonic: true }), antherM = mat(0x7a3418, { uv: .02 }), filM = mat(0xcfd8b0), stigM2 = mat(0x6b5a3a);
  const kanzouM = mat(0xffffff, { map: kanzouTex, uv: .1, sonic: true }), budOM = mat(0xc9852f);
  const toraM = mat(0xf7f8f0, { uv: .15, sonic: true }), toraBudM = mat(0xd8e4c0, { uv: .1 });
  const bellM = mat(0xffffff, { map: bellTex, uv: .3, tint: true, sonic: true });
  const dokuBractM = mat(0xf4f3ec, { uv: .2, sonic: true }), dokuSpikeM = mat(0xdcd59a, { uv: .1 }), dokuLeafM = mat(0x3d5c34);
  const hangeWhiteM = mat(0xffffff, { map: halfWhite, uv: .2, sonic: true }), hangeSpikeM = mat(0xf1f0e6, { uv: .15 });
  const irisM = mat(0xffffff, { map: irisTex, uv: .35, sonic: true }), irisInM = mat(0x8a4a9c, { uv: .35 });
  const ajiSepM = mat(0xf2f4ff, { uv: .4, tint: true, sonic: true }), ajiFertM = mat(0x8a96d8, { uv: .4, tint: true }), ajiLeafM = mat(0x4a6e34, { windH: 1.5 });
  const fernM = mat(0xffffff, { map: fernTex, alphaTest: .4, windH: .8, wind: .025 });
  // 形の道具：葉（披針形・卵形・心形）
  const lance = (L, W) => bladeGeo(L, W, { cup: .25, curl: -.15, seg: 4, shape: t => Math.sin(Math.PI * Math.pow(t, .7)) });
  const ovate = (L, W) => bladeGeo(L, W, { cup: .2, curl: -.1, seg: 5, shape: t => Math.sin(Math.PI * Math.pow(t, .5)) });
  const cordate = (L, W) => bladeGeo(L, W, { cup: .15, curl: -.08, seg: 6, shape: t => Math.sin(Math.PI * Math.pow(t, .42)) * (t < .14 ? .75 + t * 1.8 : 1) });
  const strap = (L, W, curl) => bladeGeo(L, W, { cup: .35, curl, seg: 6, shape: t => (t < .06 ? .5 + t * 8 : 1) * (1 - t * .75) });
  // 茎に互生の葉をつける
  const alternate = (G, curve, n, t0, t1, geoF, m, tilt = -1.0) => { for (let k = 0; k < n; k++) { const t = t0 + (t1 - t0) * k / Math.max(1, n - 1), p = curve.getPointAt(t); const lf = new THREE.Mesh(geoF(t), m); lf.position.copy(p); lf.rotation.set(tilt + rr(-.15, .15), k * 2.4 + rr(-.2, .2), 0, "YXZ"); G.add(lf); } };
  const headAt = (G, curve, head, rx, ry = 0) => { head.position.copy(curve.getPointAt(1)); head.rotation.set(rx, ry, 0, "YXZ"); G.add(head); };

  // ---- ヤマユリ（Lilium auratum）：茎 1〜1.5 m・披針形の葉が散生・花は横〜やや下向きで径 15〜20 cm。花被片 6（外 3・内 3）は白地に黄の筋と赤褐色の斑点、先が強く反り返る。雄しべ 6・葯は赤褐色、雌しべ 1
  const lilyProto = nF => { const G = new THREE.Group(), h = 1.25, { geo, curve } = stemGeo(h, .007, .004, .12); G.add(new THREE.Mesh(geo, stemM));
    alternate(G, curve, 14, .12, .8, () => lance(.13, .026), leafM, -.9);
    const flower = () => { const f = new THREE.Group();
      for (let i = 0; i < 6; i++) { const outer = i % 2 === 0, b = geoAt(bladeGeo(.11, outer ? .04 : .05, { cup: .35, curl: -.38, seg: 7, shape: t => Math.sin(Math.PI * Math.pow(t, .55)) }), { rx: .95 }).rotateZ(i / 6 * TAU); f.add(new THREE.Mesh(b, lilyM)); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3, fil = geoAt(new THREE.CylinderGeometry(.0012, .0012, .085, 4), { rx: Math.PI / 2, z: .045 }).translate(Math.cos(a) * .006, Math.sin(a) * .006 - .004, 0); f.add(new THREE.Mesh(fil, filM)); f.add(Mesh(new THREE.BoxGeometry(.004, .014, .003), antherM, { p: [Math.cos(a) * .012, Math.sin(a) * .012 - .008, .088] })); }
      f.add(Mesh(geoAt(new THREE.CylinderGeometry(.0016, .0016, .09, 4), { rx: Math.PI / 2, z: .047 }), filM), Mesh(new THREE.SphereGeometry(.005, 6, 5), stigM2, { p: [0, -.004, .093] })); return f; };
    headAt(G, curve, flower(), .3, 0); if (nF > 1) { const f2 = flower(), p = curve.getPointAt(.86); f2.position.set(p.x + .1, p.y - .05, p.z); f2.rotation.set(.35, 1.8, 0, "YXZ"); G.add(f2, Mesh(geoAt(new THREE.CylinderGeometry(.002, .002, .12, 4), { rz: 1.1 }), stemM, { p: [p.x + .05, p.y - .02, p.z] })); }
    return bake(G); };
  // ---- ノカンゾウ（Hemerocallis fulva var. disticha）：葉は根もとから 2 列に出る帯状で弓なり。花茎 70〜90 cm の先が分かれ、橙赤色の一重の花（花被片 6・中央に淡い筋）を上向きに開く。花は一日でしぼむ
  const kanzouProto = () => { const G = new THREE.Group();
    for (let k = 0; k < 9; k++) { const s = k % 2 ? 1 : -1, lf = new THREE.Mesh(strap(rr(.45, .65), .02, rr(.35, .55)), leafM); lf.rotation.set(-.18 - R() * .3, (s > 0 ? 0 : Math.PI) + rr(-.35, .35), 0, "YXZ"); G.add(lf); }
    const { geo, curve } = stemGeo(.82, .005, .004, .05); G.add(new THREE.Mesh(geo, stemM));
    const flower = () => { const f = new THREE.Group(); for (let i = 0; i < 6; i++) f.add(new THREE.Mesh(geoAt(bladeGeo(.07, i % 2 ? .024 : .02, { cup: .3, curl: -.18, seg: 6 }), { rx: .62 }).rotateZ(i / 6 * TAU), kanzouM)); for (let i = 0; i < 6; i++) f.add(Mesh(geoAt(new THREE.CylinderGeometry(.0008, .0008, .05, 3), { rx: Math.PI / 2 - .25, z: .025 }).rotateZ(i), filM)); return f; };
    headAt(G, curve, flower(), -.8, 0);
    const top = curve.getPointAt(1); for (let k = 0; k < 3; k++) { const b = Mesh(new THREE.SphereGeometry(.009, 6, 5), budOM, { p: [top.x + .025 * Math.cos(k * 2.1), top.y + .02 + k * .01, top.z + .025 * Math.sin(k * 2.1)] }); b.scale.set(1, 3, 1); b.rotation.z = (k - 1) * .4; G.add(b); }
    return bake(G); };
  // ---- オカトラノオ（Lysimachia clethroides）：茎 60〜90 cm・披針形の葉が互生。茎の先に白い小さな花がびっしりの穂（10〜20 cm）が、一方へ弓なりに傾く。下から咲きのぼる
  const toraProto = () => { const G = new THREE.Group(), h = rr(.62, .8), { geo, curve } = stemGeo(h, .0045, .0032, .04); G.add(new THREE.Mesh(geo, stemM));
    alternate(G, curve, 11, .1, .82, t => lance(.1 - t * .03, .022), leafM, -.85);
    // 穂：緑の軸に、白い 5 裂の小さな花（径 8〜12 mm）がびっしり。下から咲きのぼり、先の方はつぼみ
    const t0 = curve.getPointAt(1), rc = new THREE.CatmullRomCurve3([[0, 0], [.02, .06], [.06, .11], [.11, .125], [.16, .1]].map(([a, b]) => new V3(t0.x + a, t0.y + b, t0.z)));
    G.add(new THREE.Mesh(taperTube(rc.getPoints(6), .0035, .0015, 4, 8), stemM));
    const star = (() => { const sh = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU, r = i % 2 ? .0022 : .0052; sh[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ShapeGeometry(sh); })(), bud = new THREE.SphereGeometry(.003, 4, 3);
    for (let k = 0; k < 42; k++) { const t = Math.pow(k / 42, .85), p = rc.getPointAt(t), tg = rc.getTangentAt(t), a = k * 2.39996, side = new V3(0, Math.cos(a), Math.sin(a)).projectOnPlane(tg).normalize(), r = .009 * (1 - t * .55);
      const pos = p.clone().addScaledVector(side, r);
      if (t < .72) { const m = new THREE.Mesh(star, toraM); m.position.copy(pos); m.lookAt(pos.clone().add(side).add(tg.clone().multiplyScalar(-.3))); G.add(m); }
      else { const m = new THREE.Mesh(bud, toraBudM); m.position.copy(pos); G.add(m); } }
    return bake(G); };
  // ---- ホタルブクロ（Campanula punctata）：茎 40〜80 cm。釣り鐘形の花（長さ 4〜5 cm）が数個、一方向にうつむいて下がる。花は淡い紅紫〜白で、内側に濃い斑点。口は浅く 5 裂
  const bellGeo = (() => { const prof = [[.001, 0], [.008, -.004], [.0115, -.014], [.0125, -.028], [.0135, -.04], [.0165, -.047], [.0195, -.05], [.021, -.0485]].map(([r, y]) => new THREE.Vector2(r, y)); const g = new THREE.LatheGeometry(prof, 14), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), k = 1 + .09 * Math.cos(5 * a) * sstep(-.035, -.05, y); p.setX(i, x * k); p.setZ(i, z * k); } g.computeVertexNormals(); return g; })();
  const hotaruProto = () => { const G = new THREE.Group(), h = rr(.45, .62), { geo, curve } = stemGeo(h, .004, .003, .09); G.add(new THREE.Mesh(geo, stemM));
    alternate(G, curve, 7, .1, .7, () => ovate(.07, .028), leafM, -1.0);
    for (let k = 0; k < 3; k++) { const p = curve.getPointAt(.78 + k * .1), b = new THREE.Mesh(bellGeo, bellM); b.position.set(p.x + .03, p.y - .005, p.z); b.rotation.set(0, 0, -.35 - k * .1); G.add(b, Mesh(geoAt(new THREE.CylinderGeometry(.0012, .0012, .035, 3), { rz: 1.1 }), stemM, { p: [p.x + .015, p.y + .002, p.z] })); }
    return bake(G); };
  // ---- ドクダミ（Houttuynia cordata）：高さ 20〜35 cm。心形の葉が互生。茎の先に、白い花びらのような総苞片 4 枚と、まん中に淡黄色の穂（花の集まり）が立つ。湿った日陰に群れる
  const dokuProto = () => { const G = new THREE.Group(), h = rr(.2, .3), { geo, curve } = stemGeo(h, .0028, .0022, .02); G.add(new THREE.Mesh(geo, stemM));
    alternate(G, curve, 4, .2, .8, t => cordate(.055 - t * .01, .05), dokuLeafM, -1.3);
    const f = new THREE.Group(); for (let i = 0; i < 4; i++) f.add(new THREE.Mesh(geoAt(bladeGeo(.015, .011, { cup: .1, seg: 4, shape: t => Math.sin(Math.PI * Math.pow(t, .5)) }), { rx: .12 }).rotateZ(i / 4 * TAU + .4), dokuBractM));
    f.add(Mesh(geoAt(new THREE.CylinderGeometry(.0022, .0026, .022, 6), { rx: Math.PI / 2, z: .011 }), dokuSpikeM)); headAt(G, curve, f, -Math.PI / 2, 0); return bake(G); };
  // ---- ハンゲショウ（Saururus chinensis）：水辺。高さ 50〜100 cm。卵状心形の葉が互生し、花のころ茎の上の 2〜3 枚の葉の根もと側が白くなる。白い細い花穂（10〜15 cm）は先がうなだれる
  const hangeProto = () => { const G = new THREE.Group(), h = rr(.6, .8), { geo, curve } = stemGeo(h, .004, .003, .05); G.add(new THREE.Mesh(geo, stemM));
    alternate(G, curve, 6, .15, .7, () => cordate(.1, .065), leafM, -1.1);
    for (let k = 0; k < 2; k++) { const p = curve.getPointAt(.86 + k * .12), lf = new THREE.Mesh(cordate(.09, .06), hangeWhiteM); lf.position.copy(p); lf.rotation.set(-1.05, 1 + k * 2.8, 0, "YXZ"); G.add(lf); }
    const p = curve.getPointAt(.92), sp = [[0, 0], [-.02, .05], [-.04, .09], [-.07, .1], [-.09, .08]].map(([a, b]) => new V3(p.x + a, p.y + b, p.z - .01)); G.add(new THREE.Mesh(taperTube(sp, .0035, .002, 5, 8, .2), hangeSpikeM));
    return bake(G); };
  // ---- ノハナショウブ（Iris ensata var. spontanea）：湿った草地・水辺。葉は剣形で中央の脈が目立つ。花茎 40〜100 cm、花は赤紫で径 10〜13 cm。外花被片 3（垂れる・根もとに黄色の細い筋）・内花被片 3（小さく立つ）・花柱の枝 3
  const irisProto = () => { const G = new THREE.Group();
    for (let k = 0; k < 7; k++) { const lf = new THREE.Mesh(bladeGeo(rr(.45, .62), .013, { cup: .5, curl: rr(.02, .12), seg: 6, shape: t => (t < .08 ? .6 + t * 5 : 1) * (1 - Math.pow(t, 3) * .9) }), darkLeafM); lf.rotation.set(-.1 - R() * .12, k * .9 + rr(-.2, .2), 0, "YXZ"); G.add(lf); }
    const { geo, curve } = stemGeo(rr(.62, .78), .004, .0035, .03); G.add(new THREE.Mesh(geo, stemM));
    const f = new THREE.Group();
    for (let i = 0; i < 3; i++) f.add(new THREE.Mesh(geoAt(bladeGeo(.068, .036, { cup: -.15, curl: -.25, seg: 7, shape: t => (t < .3 ? .35 + t * 1.6 : 1) * Math.sin(Math.PI * Math.pow(t, .5)) }), { rx: -.25 }).rotateZ(i / 3 * TAU), irisM));
    for (let i = 0; i < 3; i++) f.add(new THREE.Mesh(geoAt(bladeGeo(.035, .01, { cup: .2, seg: 4 }), { rx: 1.25 }).rotateZ(i / 3 * TAU + Math.PI / 3), irisInM));
    for (let i = 0; i < 3; i++) f.add(new THREE.Mesh(geoAt(bladeGeo(.04, .009, { cup: .3, curl: .05, seg: 4 }), { rx: .45 }).rotateZ(i / 3 * TAU), irisInM));
    headAt(G, curve, f, -Math.PI / 2 + .15, 0); return bake(G); };
  // ---- ヤマアジサイ（Hydrangea serrata）：林の中・沢ぞいの低木（高さ 1 m ほど）。葉は対生で楕円形・先がとがり鋸歯。枝先に平たい花序（径 7〜10 cm）：まん中に小さな両性花、まわりにがく片 4 枚の装飾花が 5〜10 個
  const ajiProto = () => { const G = new THREE.Group();
    for (let s = 0; s < 6; s++) { const a = s / 6 * TAU + rr(-.3, .3), h = rr(.75, 1.05), { geo, curve } = stemGeo(h, .007, .004, .25); const st = new THREE.Mesh(geo, stemM); st.rotation.y = a; st.rotation.z = rr(.12, .3); st.updateMatrix(); G.add(st);
      const P = t => curve.getPointAt(t).applyMatrix4(st.matrix);
      for (let k = 0; k < 6; k++) { const p = P(.22 + k * .13); for (const sd of [0, Math.PI]) { const lf = new THREE.Mesh(ovate(.13 - k * .01, .058), ajiLeafM); lf.position.copy(p); lf.rotation.set(-1.15, a + sd + k * Math.PI / 2, 0, "YXZ"); G.add(lf); } }
      if (s % 3 !== 2) { const top = P(1), f = new THREE.Group(); f.position.copy(top); G.add(f);
        f.add(Mesh(geoAt(new THREE.SphereGeometry(.034, 10, 5, 0, TAU, 0, Math.PI / 2), { sy: .35 }), ajiFertM));
        for (let j = 0; j < 7; j++) { const aa = j / 7 * TAU + R() * .3, fl = new THREE.Group(); fl.position.set(Math.cos(aa) * .046, .006, Math.sin(aa) * .046); for (let q = 0; q < 4; q++) fl.add(new THREE.Mesh(geoAt(bladeGeo(.015, .013, { cup: .12, seg: 3, shape: t => Math.sin(Math.PI * Math.pow(t, .55)) }), { rx: -Math.PI / 2 + .25 }).rotateY(q / 4 * TAU + aa), ajiSepM)); f.add(fl); } } }
    return bake(G); };
  // ---- シダ（林床の大型のシダ。種は決めない）：葉 6〜8 枚が株の中心から弓なりに広がる
  const fernProto = () => { const G = new THREE.Group(); for (let k = 0; k < 7; k++) { const L = rr(.5, .75), f = new THREE.Mesh(bladeGeo(L, .16, { cup: .05, curl: .35, seg: 6, shape: () => 1 }), fernM); f.rotation.set(-.55 - R() * .3, k / 7 * TAU + rr(-.2, .2), 0, "YXZ"); G.add(f); } return bake(G); };
  // ---- 林の中の藪（種は決めない広葉の低木）：写真の葉の房を株の形に
  const bushProto = () => { const G = new THREE.Group(), bm = M(0xffffff, { std: true, map: spray2, alphaTest: .45, side: THREE.DoubleSide, rough: .6, env: .35, uv: .04, temp: .1, wind: .03, windH: 1.4 });
    for (let i = 0; i < 46; i++) { const d = new V3(R() - .5, R() * .8 - .05, R() - .5).normalize(), r = .25 + Math.pow(R(), .5) * .5, p = new V3(d.x * r * 1.2, .38 + d.y * r * .8, d.z * r); const c = new THREE.Mesh(new THREE.PlaneGeometry(.3, .3).translate(0, .15, 0), bm); c.position.copy(p); c.lookAt(p.clone().add(d).add(new V3(0, .5, 0))); c.rotateX(-Math.PI / 2 + rr(-.4, .4)); G.add(c); }
    for (let i = 0; i < 6; i++) G.add(Mesh(geoAt(new THREE.CylinderGeometry(.006, .012, .7, 4), { y: .35 }).rotateZ(Math.cos(i * 2.4) * .35).rotateX(Math.sin(i * 2.4) * .3), M(0x5a4a3a, { uv: .05, temp: .1 })));
    return bake(G); };

  // ---- カワラナデシコ（Dianthus superbus var. longicalycinus）：草地・河原。茎 30〜80 cm で上で分かれ、細い線形の葉が対生。花は径 3〜4 cm、淡い紅紫の花弁 5 枚の先が糸のように細かく裂ける。長い筒形のがく
  const nadeTex = canvasTex(64, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#e9a7c6"; g.beginPath(); g.moveTo(w * .44, h); g.lineTo(w * .56, h); g.lineTo(w * .62, h * .55);
    for (let i = 0; i <= 18; i++) { const u = i / 18, x = w * (.62 - u * .24) + Math.sin(u * 40) * 2, a = w * (.5 + (u - .5) * 1.05); g.lineTo(a + (i % 2 ? 0 : 0), i % 2 ? h * .02 : h * .3 + Math.random() * h * .1); }
    g.lineTo(w * .38, h * .55); g.closePath(); g.fill(); g.fillStyle = "rgba(160,60,110,.55)"; g.fillRect(w * .42, h * .5, w * .16, h * .12); for (let i = 0; i < 18; i++) { g.strokeStyle = "rgba(150,50,100,.5)"; g.beginPath(); g.moveTo(w * .5, h * .55); g.lineTo(w * (.3 + Math.random() * .4), h * (.4 + Math.random() * .1)); g.stroke(); } });
  const nadeM = mat(0xffffff, { map: nadeTex, alphaTest: .4, uv: .25, sonic: true }), calyxM = mat(0x6f8f62);
  const nadeProto = () => { const G = new THREE.Group(), h = rr(.45, .6), { geo, curve } = stemGeo(h, .0026, .002, .05); G.add(new THREE.Mesh(geo, stemM));
    for (let k = 0; k < 5; k++) { const p = curve.getPointAt(.12 + k * .17); for (const sd of [0, Math.PI]) { const lf = new THREE.Mesh(bladeGeo(.06, .005, { cup: .2, curl: -.1, seg: 3 }), leafM); lf.position.copy(p); lf.rotation.set(-.7, sd + k * 1.57, 0, "YXZ"); G.add(lf); } }
    const flower = () => { const f = new THREE.Group(); f.add(Mesh(geoAt(new THREE.CylinderGeometry(.0035, .003, .028, 6), { rx: Math.PI / 2, z: -.012 }), calyxM));
      for (let i = 0; i < 5; i++) f.add(new THREE.Mesh(geoAt(bladeGeo(.024, .016, { cup: .05, seg: 3, shape: () => 1 }), { rx: .2 }).rotateZ(i / 5 * TAU), nadeM)); return f; };
    headAt(G, curve, flower(), -Math.PI / 2 + .35, 0);
    const p = curve.getPointAt(.8), f2 = flower(); f2.position.set(p.x + .05, p.y + .06, p.z); f2.rotation.set(-Math.PI / 2 + .5, 1.2, 0, "YXZ"); G.add(f2, Mesh(geoAt(new THREE.CylinderGeometry(.0014, .0014, .09, 4), { rz: -.6 }), stemM, { p: [p.x + .025, p.y + .035, p.z] }));
    return bake(G); };
  // ---- キキョウ（Platycodon grandiflorus）：日当たりのよい草地。茎 40〜100 cm、卵形の葉が互生し縁に鋸歯。花は青紫で径 4〜5 cm、先が 5 裂した広い鐘形で上〜横を向く。つぼみは風船のようにふくらむ
  const kikyoM = mat(0x8582e0, { uv: .3, sonic: true }), kikyoVeinM = mat(0xeeeaf6);
  const kikyoProto = () => { const G = new THREE.Group(), h = rr(.55, .75), { geo, curve } = stemGeo(h, .0035, .0028, .06); G.add(new THREE.Mesh(geo, stemM));
    alternate(G, curve, 9, .12, .78, () => ovate(.05, .022), leafM, -1.0);
    const f = new THREE.Group(); for (let i = 0; i < 5; i++) f.add(new THREE.Mesh(geoAt(bladeGeo(.03, .03, { cup: .3, curl: -.15, seg: 5, shape: t => Math.sin(Math.PI * Math.pow(t, .5)) * (t > .8 ? 1 - (t - .8) * 2.5 : 1) }), { rx: .42 }).rotateZ(i / 5 * TAU), kikyoM));
    f.add(Mesh(geoAt(new THREE.CylinderGeometry(.0015, .0015, .016, 4), { rx: Math.PI / 2, z: .008 }), kikyoVeinM)); headAt(G, curve, f, -Math.PI / 2 + .6, 0);
    const p = curve.getPointAt(.86), bud = Mesh(new THREE.SphereGeometry(.009, 10, 6), kikyoM, { p: [p.x + .04, p.y + .03, p.z] }); bud.scale.set(1, 1.25, 1); G.add(bud, Mesh(geoAt(new THREE.CylinderGeometry(.0012, .0012, .05, 4), { rz: -.9 }), stemM, { p: [p.x + .02, p.y + .015, p.z] }));
    return bake(G); };
  // ---- オミナエシ（Patrinia scabiosifolia）：日当たりのよい草地。茎 60〜100 cm、葉は対生で羽状に裂ける（根もとに多い）。茎の先で分かれ、黄色の小さな花が平らな房（散房状）にたくさんつく
  const omiTex = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * w * .46; g.fillStyle = `hsl(${46 + Math.random() * 8},85%,${50 + Math.random() * 12}%)`; g.beginPath(); g.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 2.6, 0, TAU); g.fill(); } });
  const omiM = mat(0xffffff, { map: omiTex, alphaTest: .4, uv: .2, sonic: true });
  const omiProto = () => { const G = new THREE.Group(), h = rr(.75, .95), { geo, curve } = stemGeo(h, .0042, .003, .05); G.add(new THREE.Mesh(geo, stemM));
    for (let k = 0; k < 4; k++) { const p = curve.getPointAt(.1 + k * .16); for (const sd of [0, Math.PI]) { const lf = new THREE.Mesh(bladeGeo(.09 - k * .012, .035, { cup: .1, curl: -.1, seg: 6, shape: t => Math.sin(Math.PI * Math.pow(t, .6)) * (.55 + .45 * Math.abs(Math.sin(t * 9))) }), darkLeafM); lf.position.copy(p); lf.rotation.set(-.95, sd + k * 1.57, 0, "YXZ"); G.add(lf); } }
    const top = curve.getPointAt(1);
    for (let k = 0; k < 6; k++) { const a = k * 2.4, r = k ? .035 + R() * .03 : 0, y = top.y + (k ? -.01 - R() * .02 : .005), x = top.x + Math.cos(a) * r, z = top.z + Math.sin(a) * r;
      if (k) G.add(Mesh(taperTube([top.clone().add(new V3(0, -.06, 0)), new V3(x, y - .005, z)], .0016, .0012, 3, 2), stemM));
      const d = Mesh(new THREE.CircleGeometry(.024, 10), omiM, { p: [x, y, z], r: [-Math.PI / 2, 0, 0] }); G.add(d); }
    return bake(G); };
  // ---- ウツボグサ（Prunella vulgaris subsp. asiatica）：日当たりのよい草地・道ばた。高さ 20〜30 cm、四角い茎に卵形の葉が対生。茎の先に長さ 3〜6 cm の円柱形の穂、紫色の唇形の花が段になって咲く
  const utsuTex = canvasTex(32, 64, (g, w, h) => { g.fillStyle = "#9a7ccc"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 6) { g.fillStyle = "#7d9258"; for (let x = 0; x < w; x += 8) g.fillRect(x + (y / 6 % 2) * 4, y + 3, 4, 3); } });   // 紫の花のあいだに、緑の苞
  const utsuSpikeM = mat(0xffffff, { map: utsuTex, uv: .3 }), utsuLipM = mat(0xa486d6, { uv: .35, sonic: true });
  const utsuProto = () => { const G = new THREE.Group(), h = rr(.18, .26), { geo, curve } = stemGeo(h, .0028, .0024, .02); G.add(new THREE.Mesh(geo, stemM));
    for (let k = 0; k < 3; k++) { const p = curve.getPointAt(.15 + k * .25); for (const sd of [0, Math.PI]) { const lf = new THREE.Mesh(ovate(.04, .02), leafM); lf.position.copy(p); lf.rotation.set(-1.1, sd + k * 1.57, 0, "YXZ"); G.add(lf); } }
    const top = curve.getPointAt(1); G.add(Mesh(geoAt(new THREE.CylinderGeometry(.009, .01, .045, 8), { x: top.x, y: top.y + .022, z: top.z }), utsuSpikeM));
    for (let k = 0; k < 9; k++) { const a = k * 2.1, y = top.y + .008 + (k % 3) * .012, lp = new THREE.Mesh(bladeGeo(.016, .008, { cup: .4, curl: -.3, seg: 3 }), utsuLipM); lp.position.set(top.x + Math.cos(a) * .009, y, top.z + Math.sin(a) * .009); lp.rotation.set(-1.0, -a + Math.PI / 2, 0, "YXZ"); G.add(lp); }
    return bake(G); };

  // ---------------------------------------------------------------- 置く（それぞれの花が育つ場所に、群れで）
  const shade = (x, z) => lightAt(x, z) < .35 && free(x, z) && dPath(x, z) > .9 && !inSugi(x, z);
  const edge = (x, z) => { const L = lightAt(x, z); return L > .3 && L < .85 && free(x, z) && dPath(x, z) > .7; };
  const sunny = (x, z) => gapK(x, z) > .55 && free(x, z) && dPath(x, z) > .6;
  const wet = (x, z) => { const d = Math.min(dPond(x, z), dRiver(x, z) - .9); return d > .05 && d < 1.8 && free(x, z, .05); };
  const inM = (x, z) => Math.hypot(x - MEADOW.x, z - MEADOW.z) < MEADOW.r + .6 && free(x, z) && dPath(x, z) > .7 && Math.hypot(x - SPAWN.x, z - SPAWN.z) > 2;
  const item = (x, z, o = {}) => ({ x, z, ry: R() * TAU, s: rr(.82, 1.18), tx: rr(-.06, .06), tz: rr(-.06, .06), ...o });
  const hue = (a, b) => col.clone().setHSL(rr(a[0], b[0]), rr(a[1], b[1]), rr(a[2], b[2]));

  // 草地：日本の草地・林縁に自然に生える在来の草花（2026-10-12 栽培種・外来種のヒマワリ・アラゲハンゴンソウ・ヒナゲシから置きかえ）
  const mC = (cx, cz, n, sp, mk) => clumpsAt(MEADOW.x + cx, MEADOW.z + cz, n, sp, inM, mk);
  const lists = {
    nade: [...mC(.6, 1.6, 22, .7, (x, z) => item(x, z)), ...mC(-2.4, .6, 14, .6, (x, z) => item(x, z)), ...mC(2.6, 2.6, 10, .5, (x, z) => item(x, z))],
    kikyo: [...mC(-.4, .3, 16, .7, (x, z) => item(x, z)), ...mC(2.4, -.8, 11, .6, (x, z) => item(x, z)), ...mC(-2.8, 2.6, 8, .5, (x, z) => item(x, z))],
    omi: [...mC(1.2, -3.4, 12, .7, (x, z) => item(x, z)), ...mC(-3.4, -.9, 6, .5, (x, z) => item(x, z)), ...clumps(4, 5, .5, (x, z) => sunny(x, z) && near(x, z, -3), sunny, (x, z) => item(x, z))],
    utsubo: [...mC(-.8, 2.8, 18, .7, (x, z) => item(x, z)), ...mC(1.8, .8, 12, .6, (x, z) => item(x, z)), ...clumps(5, 10, .5, (x, z) => (sunny(x, z) || dPath(x, z) < 1.6) && free(x, z) && lightAt(x, z) > .4 && near(x, z, -3), (x, z) => free(x, z) && lightAt(x, z) > .35, (x, z) => item(x, z))],
    lily: [...clumps(10, 2, .6, (x, z) => edge(x, z) && near(x, z, -2), edge, (x, z) => item(x, z, { v: R() < .5 ? 0 : 1 })), ...clumpsAt(MEADOW.x - 4.6, MEADOW.z - 3.4, 3, .5, edge, (x, z) => item(x, z, { v: 1 }))],
    kanzou: [...clumpsAt(MEADOW.x + 3.6, MEADOW.z + 1.2, 4, .5, inM, (x, z) => item(x, z)), ...clumpsAt(MEADOW.x - 3.8, MEADOW.z + .8, 3, .4, inM, (x, z) => item(x, z)), ...clumps(5, 3, .5, (x, z) => sunny(x, z) && near(x, z, -3), sunny, (x, z) => item(x, z))],
    tora: (() => { const l = []; for (const [cx, cz, n] of [[-1.4, -1.6, 20], [3.4, -2.6, 18], [-3.6, -2.4, 12], [.8, 3.6, 10]]) { const ry = rr(0, TAU); l.push(...clumpsAt(MEADOW.x + cx, MEADOW.z + cz, n, .55, inM, (x, z) => item(x, z, { ry: ry + rr(-.4, .4) }))); } l.push(...clumps(5, 10, .6, (x, z) => sunny(x, z) && near(x, z, -3), sunny, (x, z) => item(x, z, { ry: 1.2 + rr(-.4, .4) }))); return l; })(),
    hotaru: clumps(14, 5, .45, (x, z) => edge(x, z) && near(x, z, -2), edge, (x, z) => item(x, z, { c: R() < .7 ? hue([.86, .25, .74], [.92, .45, .82]) : hue([.1, .05, .93], [.12, .1, .97]) })),
    doku: clumps(Math.round(16 * (mobile ? .7 : 1)), 26, .9, (x, z) => shade(x, z) && near(x, z, -3) && Math.min(dRiver(x, z), dPond(x, z) + 1) < 12, shade, (x, z) => item(x, z, { s: rr(.85, 1.15) })),
    hange: [...clumps(7, 8, .45, (x, z) => wet(x, z) && near(x, z, -2), wet, (x, z) => item(x, z))],
    iris: [...clumps(8, 4, .4, (x, z) => wet(x, z) && near(x, z, -2), wet, (x, z) => item(x, z)), ...clumpsAt(POND.x + 3.6, POND.z + 3.4, 5, .45, wet, (x, z) => item(x, z))],
    aji: clumps(14, 2, 1.2, (x, z) => shade(x, z) && near(x, z, -3), (x, z) => shade(x, z) && free(x, z, .7), (x, z) => item(x, z, { s: rr(.85, 1.2), c: R() < .65 ? hue([.58, .45, .7], [.64, .6, .8]) : R() < .5 ? hue([.85, .35, .8], [.9, .5, .86]) : hue([.15, .05, .9], [.2, .1, .95]) })),
    fern: clumps(Math.round(26 * Q + 8), 4, 1.1, (x, z) => shade(x, z) && near(x, z, 4), shade, (x, z) => item(x, z, { s: rr(.7, 1.3) })),
    bush: clumps(Math.round(30 * Q + 8), 2, 1.6, (x, z) => lightAt(x, z) < .5 && free(x, z, 1) && near(x, z, 8), (x, z) => lightAt(x, z) < .55 && free(x, z, .8) && dPath(x, z) > 1.2, (x, z) => item(x, z, { s: rr(.8, 1.6), sy: rr(.8, 1.3) })),
  };
  // 近くの草花は細かく、置く数はスマホで間引く（同じ種の群れは残す）
  const thin = l => mobile ? l.filter((_, i) => i % 3 !== 2) : l;
  field([nadeProto(), nadeProto()], lists.nade);
  field([kikyoProto(), kikyoProto()], lists.kikyo);
  field([omiProto(), omiProto()], lists.omi);
  field([utsuProto()], thin(lists.utsubo), { noCast: true });
  field([lilyProto(1), lilyProto(2)], lists.lily);
  field([kanzouProto(), kanzouProto()], lists.kanzou);
  field([toraProto(), toraProto()], thin(lists.tora));
  field([hotaruProto(), hotaruProto()], thin(lists.hotaru));
  field([dokuProto(), dokuProto()], thin(lists.doku), { noCast: true });
  field([hangeProto()], lists.hange);
  field([irisProto(), irisProto()], lists.iris);
  field([ajiProto()], lists.aji);
  field([fernProto(), fernProto()], lists.fern, { noCast: mobile, noRay: true });
  field([bushProto()], lists.bush, { noRay: true });
  { const it = lists.tora[0]; out.whiteFlower = { pos: new V3(it.x, .78, it.z) }; }   // 蜂の話の「草地の白い花」（オカトラノオの群れ）
  for (const l of [lists.aji, lists.bush]) for (const it of l) addTrunk([it.x, it.z, .45 * it.s]);
  out.lists = lists; out.counts = Object.fromEntries(Object.entries(lists).map(([k, l]) => [k, l.length]));  out.counts.trees = placed.length;

  // ---------------------------------------------------------------- 水辺のヨシ（池の奥の岸と、川の曲がり）
  {
    const reedM = M(0x7f9a54, { side: THREE.DoubleSide, uv: .05, temp: .1, wind: .06, windH: 2 }), plumeM = M(0xa8957e, { uv: .08, temp: .1, wind: .06, windH: 2 }), rg = [], pg = [];
    const reed = (x, z) => { const h = rr(1.3, 2.1); rg.push(strip(geoAt(bladeGeo(h, .016, { cup: .1, curl: rr(.05, .18), shape: t => 1 - t * .9 }), { ry: R() * 6, x, z }))); if (R() < .35) pg.push(strip(geoAt(new THREE.ConeGeometry(.035, .32, 5), { rz: Math.PI + rr(-.5, .5), sx: .7, x, y: h - .05, z }))); };   // 穂は淡い紫褐色で、ゆるく垂れる
    for (let i = 0; i < (mobile ? 110 : 200); i++) { const a = Math.PI * (1.0 + R() * .9), r = POND.r + rr(-.3, .9); reed(POND.x + Math.cos(a) * r, POND.z + Math.sin(a) * r); }
    for (const [cx, cz] of [[4, -15.4], [14, -10.4]]) for (let i = 0; i < (mobile ? 30 : 55); i++) { const x = cx + gauss() * .9, z = cz + gauss() * .5; if (dRiver(x, z) < 1.3) reed(x, z); }
    const a = new THREE.Mesh(mergeGeometries(rg), reedM), b = new THREE.Mesh(mergeGeometries(pg), plumeM); a.userData.noCast = b.userData.noCast = mobile; forest.add(a, b);
  }

  // ---------------------------------------------------------------- 草（草地は密に、林の中はまばら）と落ち葉
  {
    const n = mobile ? 2600 : 5200, bl = new THREE.PlaneGeometry(.016, .32, 1, 3); bl.translate(0, .16, 0);
    const p = bl.attributes.position, cs = []; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / .32; if (t > .99) p.setX(i, 0); p.setZ(i, .07 * t * t); const c = .45 + .65 * t; cs.push(c, c, c); }
    bl.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3)); bl.computeVertexNormals();
    const im = new THREE.InstancedMesh(bl, M(0xffffff, { side: THREE.DoubleSide, uv: .04, temp: .13, vc: true, wind: .04, windH: .4 }), n);
    let k = 0;
    for (let t = 0; k < n && t < n * 30; t++) { const x = rr(-28, 30), z = rr(-26, 27), L = lightAt(x, z); if (R() > .05 + L * .95 || !free(x, z, .05) || dPath(x, z) < .35) continue;
      eul.set(rr(-.25, .25), R() * TAU, rr(-.25, .25)); quat.setFromEuler(eul); const s = (.6 + R() * .8) * (.6 + L * .7); m4.compose(new V3(x, 0, z), quat, new V3(s, s * (.8 + R() * .6), s)); im.setMatrixAt(k, m4);
      im.setColorAt(k, col.setHSL(.2 + R() * .08 + L * .02, .38 + R() * .15, .26 + R() * .12 + L * .05)); k++; }
    im.count = k; im.userData.noCast = true; im.raycast = () => {}; forest.add(im);
    const ln = mobile ? 2600 : 6000, lg = new THREE.PlaneGeometry(.075, .075); lg.rotateX(-Math.PI / 2);
    const lim = new THREE.InstancedMesh(lg, M(0xffffff, { map: litterTex, alphaTest: .5, side: THREE.DoubleSide, uv: .05, temp: .12 }), ln);
    let j = 0;
    for (let t = 0; j < ln && t < ln * 20; t++) { const x = rr(-26, 28), z = rr(-24, 26), L = lightAt(x, z); if (R() < L * .9 || !free(x, z, .02) || dPath(x, z) < .5) continue;
      eul.set(rr(-.25, .25), R() * TAU, rr(-.25, .25)); quat.setFromEuler(eul); const s = rr(.7, 1.5); m4.compose(new V3(x, .006 + R() * .01, z), quat, new V3(s, 1, s * rr(.8, 1.4))); lim.setMatrixAt(j, m4);
      lim.setColorAt(j, col.setHSL(rr(.05, .1), rr(.35, .6), rr(.22, .42))); j++; }
    lim.count = j; lim.userData.noCast = true; lim.raycast = () => {}; forest.add(lim);
  }

  // ---------------------------------------------------------------- 木もれ日の光の筋（すき間に。人・犬の受けとり方の昼だけ）
  {
    const t = canvasTex(32, 128, (g, w, h) => { const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, "rgba(255,255,255,0)"); gx.addColorStop(.5, "rgba(255,255,255,1)"); gx.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gx; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "destination-in"; const gy = g.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, "rgba(0,0,0,0)"); gy.addColorStop(.35, "rgba(0,0,0,1)"); gy.addColorStop(.9, "rgba(0,0,0,.7)"); gy.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gy; g.fillRect(0, 0, w, h); });
    const m = new THREE.MeshBasicMaterial({ map: t, color: 0xfff1d0, transparent: true, opacity: .085, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const grp = new THREE.Group(); grp.userData.noCast = true; forest.add(grp); out.shafts = grp;
    const spots2 = [[MEADOW.x - 1.5, MEADOW.z + .5, 2.6], [MEADOW.x + 2, MEADOW.z - 2, 1.8], [-11.5, 9, 1.6], [13.5, 7.5, 2], [-2.5, 17, 1.4], [-1.5, 8.5, 1.1], [7, 2, 1.2], [-15, 2, 1.3]];
    out.aimShafts = dir => {   // 光の筋は、日の向きに傾けた十字の板を、一つの形にまとめる
      grp.clear(); const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir.clone().normalize()), gs = [];
      for (const [x, z, w] of spots2) for (const ry of [0, Math.PI / 2]) { const L = 22, g = new THREE.PlaneGeometry(w, L); g.translate(0, L / 2, 0); g.rotateY(ry); g.applyQuaternion(q); g.translate(x, 0, z); gs.push(g); }
      const sh = new THREE.Mesh(mergeGeometries(gs), m); sh.userData.noCast = true; sh.raycast = () => {}; grp.add(sh); };
  }

  // ---------------------------------------------------------------- 歩けるところ（幹・藪・石・倒木はよける）
  out.blocked = (x, z, pad = .25) => { if (hitTrunk(x, z, pad)) return true;
    for (const [a, b, r] of out.logs || []) { const dx = b.x - a.x, dz = b.z - a.z, u = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1); if (Math.hypot(x - a.x - dx * u, z - a.z - dz * u) < r + pad) return true; } return false; };
  out.lightAt = lightAt; out.dRiver = dRiver;
  return out;
}
