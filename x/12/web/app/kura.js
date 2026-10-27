/* Qualia/walk 川越 ── 蔵造りの店蔵の型（5 つ）と時の鐘の 3D（2026-10-22）。
   mitsulab が three.js の基本の面だけで組んだ模式（外の模型・写真は使っていない）。
   形の拠りどころ：川越の店蔵の一般の形（切妻・平入り・厚い土壁・箱棟と大きな鬼瓦・観音開きの窓・下屋）と、
   時の鐘＝木造の三層の櫓・高さ約 16 m（OpenStreetMap）・下見板張り（川越市のパンフレット）。
   一棟ずつの姿ではない。店名・看板・家紋は作らない。
   座標：店蔵は手前（+z）が通りに面する。幅 W0＝8 m・奥行き D0＝9 m を基準に、置く所で横と奥へ伸び縮みさせる。 */
import * as THREE from "three";

export const W0 = 8, D0 = 9;

/* ---------- 面を足す道具（UV は m 単位） ---------- */
class Acc {
  constructor() { this.p = []; this.n = []; this.u = []; }
  quad(a, b, c, d, us = 1, vs = 1) {   // a→b が u、a→d が v
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), C = new THREE.Vector3(...c), D = new THREE.Vector3(...d);
    const n = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(D, A)).normalize();
    const lu = A.distanceTo(B) / us, lv = A.distanceTo(D) / vs;
    const P = [A, B, C, A, C, D], U = [[0, 0], [lu, 0], [lu, lv], [0, 0], [lu, lv], [0, lv]];
    for (let i = 0; i < 6; i++) { this.p.push(P[i].x, P[i].y, P[i].z); this.n.push(n.x, n.y, n.z); this.u.push(U[i][0], U[i][1]); }
  }
  tri(a, b, c, us = 1) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), C = new THREE.Vector3(...c);
    const n = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A)).normalize();
    const ax = new THREE.Vector3().subVectors(B, A).normalize(), ay = new THREE.Vector3().crossVectors(n, ax);
    for (const P of [A, B, C]) { const q = new THREE.Vector3().subVectors(P, A); this.p.push(P.x, P.y, P.z); this.n.push(n.x, n.y, n.z); this.u.push(q.dot(ax) / us, q.dot(ay) / us); }
  }
  box(x0, y0, z0, x1, y1, z1, s = 1, faces = "xXyYzZ") {   // 軸にそった箱
    const f = faces;
    if (f.includes("Z")) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], s, s);   // 手前
    if (f.includes("z")) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], s, s);   // 奥
    if (f.includes("X")) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], s, s);
    if (f.includes("x")) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], s, s);
    if (f.includes("Y")) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], s, s);
    if (f.includes("y")) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], s, s);
  }
  // 傾いた板（屋根）：手前の下の辺 (x0..x1, ya, za) から奥の上の辺 (yb, zb) へ。厚み t
  slab(x0, x1, ya, za, yb, zb, t = .12, us = 1) {
    this.quad([x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb], us, us);
    this.quad([x1, ya - t, za], [x0, ya - t, za], [x0, yb - t, zb], [x1, yb - t, zb], us, us);
    this.quad([x0, ya - t, za], [x1, ya - t, za], [x1, ya, za], [x0, ya, za], us, us);   // 軒の小口
    this.quad([x0, ya - t, za], [x0, ya, za], [x0, yb, zb], [x0, yb - t, zb], us, us);
    this.quad([x1, ya, za], [x1, ya - t, za], [x1, yb - t, zb], [x1, yb, zb], us, us);
  }
  // 本瓦の筋（丸瓦の列の模式）：屋根の板の上に、棟へ向かって細い山を等間隔に。瓦の筋が遠目にも読めるように
  ribs(x0, x1, ya, za, yb, zb, step = .3, w = .07, h = .07) {
    for (let x = Math.min(x0, x1) + step / 2; x < Math.max(x0, x1); x += step) {
      this.quad([x - w, ya, za], [x, ya + h, za], [x, yb + h, zb], [x - w, yb, zb]); this.quad([x, ya + h, za], [x + w, ya, za], [x + w, yb, zb], [x, yb + h, zb]);
      this.quad([x - w, ya - .02, za], [x + w, ya - .02, za], [x, ya + h, za], [x - w, ya, za]);   // 軒先の瓦の口（巴の模式）
    }
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere(); return g;
  }
}

/* ---------- 質感 ---------- */
let MATS = null;
function tileTex(mobile) {   // 桟瓦の波（自作の模式）：横に波打つ山と、縦の重なりの段。色と法線を canvas で
  const S = mobile ? 256 : 512, c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d");
  const n = document.createElement("canvas"); n.width = n.height = S; const y = n.getContext("2d");
  const rc = document.createElement("canvas"); rc.width = rc.height = S; const z = rc.getContext("2d");
  const id = x.createImageData(S, S), nd = y.createImageData(S, S), rd = z.createImageData(S, S);
  // 1 枚の瓦＝働き幅 約 0.26 m・働き長さ 約 0.23 m。絵 1 枚＝横 4 枚・縦 4 段（約 1.04 m × 0.92 m）を m 単位の UV で繰り返す（下の repeat）
  const cols = 4, rows = 4, rnd = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const u = px / S * cols, v = py / S * rows, iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv;
    const wave = Math.cos(fu * Math.PI * 2) * .5 + .5;   // 桟の山
    const lap = Math.pow(fv, 3.2);                        // 下の段へ重なる段差
    const h = wave * .7 + (1 - lap) * .3;
    const dhu = -Math.sin(fu * Math.PI * 2) * Math.PI * .7, dhv = -3.2 * Math.pow(fv, 2.2) * .3 * (fv > .97 ? -8 : 1);
    const k = (py * S + px) * 4, r = rnd(iu, iv + 13 * Math.floor(py / S));
    const r2 = rnd(iu * 3.1 + 7, iv * 5.3 + 1), sh = Math.pow(Math.max(0, (fv - .78) / .22), 1.6);   // 瓦ごとの焼きむらと、上の段の瓦が落とす陰
    const base = 62 + r * 34 + r2 * 10 + h * 22 - sh * 34 - (fv > .965 ? 26 : 0) - (Math.abs(fu - .5) > .47 ? 10 : 0);
    id.data[k] = base; id.data[k + 1] = base + 2 + r2 * 3; id.data[k + 2] = base + 7; id.data[k + 3] = 255;
    const rg = Math.min(255, (.5 + r * .25 + sh * .3 + (fv > .965 ? .2 : 0)) * 255); rd.data[k] = rd.data[k + 1] = rd.data[k + 2] = rg; rd.data[k + 3] = 255;
    const nx = -dhu * .25, ny = -dhv * .25, nz = 1, L = Math.hypot(nx, ny, nz);
    nd.data[k] = (nx / L * .5 + .5) * 255; nd.data[k + 1] = (ny / L * .5 + .5) * 255; nd.data[k + 2] = (nz / L * .5 + .5) * 255; nd.data[k + 3] = 255;
  }
  x.putImageData(id, 0, 0); y.putImageData(nd, 0, 0); z.putImageData(rd, 0, 0);
  const T = new THREE.CanvasTexture(c), N = new THREE.CanvasTexture(n), R = new THREE.CanvasTexture(rc);
  for (const t of [T, N, R]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 1.04, 1 / .92); t.anisotropy = mobile ? 2 : 8; }
  T.colorSpace = THREE.SRGBColorSpace; return { T, N, R, canvas: c };
}
export function kuraMats(TL, mobile) {
  if (MATS) return MATS;
  const ld = (u, srgb, rep = 1) => { const t = TL.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = mobile ? 2 : 8; return t; };
  const tile = tileTex(mobile);
  MATS = {
    // 黒漆喰：磨いた漆喰の深い黒（つやは強め・映り込みは控えめ）。白い漆喰の写真の肌理を、色は黒にして使う
    shikkui: new THREE.MeshPhysicalMaterial({ color: "#07080a", map: ld("web/tex/plaster_c.webp", true, .5), normalMap: ld("web/tex/plaster_n.webp", false, .5), normalScale: new THREE.Vector2(.12, .12), roughness: .82, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: .75 }),   // 2026-10-26 黒漆喰の質感：磨いた面のつやと空の映り込みを強め、写真の肌理は浅く
    // 町家の型の上壁：灰白の漆喰（白い漆喰の写真の色をそのまま、少し灰に）
    plaster: new THREE.MeshStandardMaterial({ color: "#c9c4ba", map: ld("web/tex/plaster_c.webp", true, .5), normalMap: ld("web/tex/plaster_n.webp", false, .5), normalScale: new THREE.Vector2(.5, .5), roughnessMap: ld("web/tex/plaster_r.webp", false, .5), roughness: .95 }),
    plasterg: new THREE.MeshStandardMaterial({ color: "#8a6f55",   /* 2026-10-26 本人「灰色の面が多い」→ 土壁（荒壁の土の色・模式）に */ map: ld("web/tex/plaster_c.webp", true, .5), normalMap: ld("web/tex/plaster_n.webp", false, .5), normalScale: new THREE.Vector2(.5, .5), roughnessMap: ld("web/tex/plaster_r.webp", false, .5), roughness: .95 }),
    glass: new THREE.MeshStandardMaterial({ color: "#6d7a84", roughness: .04, metalness: 0, envMapIntensity: .8, transparent: true, opacity: .16, depthWrite: false }),   // ガラス戸：透けて奥の土間が見え、空がうすく映る
    doma: new THREE.MeshStandardMaterial({ color: "#4a3a2c", roughness: .9, emissive: "#3a2814", emissiveIntensity: .5 }),   // 店の奥（土間と奥の壁）：暗いが真っ黒にしない
    // 町家の型の板壁・格子：杉板（焼いた色に寄せて暗く）
    cedar: new THREE.MeshStandardMaterial({ color: "#4a3d32", map: ld("web/tex/cedar_c.webp", true, .5), normalMap: ld("web/tex/cedar_n.webp", false, .5), normalScale: new THREE.Vector2(.8, .8), roughness: .78 }),
    tile: new THREE.MeshStandardMaterial({ color: "#b4b7bd", map: tile.T, normalMap: tile.N, normalScale: new THREE.Vector2(1.0, 1.0), roughnessMap: tile.R, roughness: 1, metalness: 0, envMapIntensity: .35 }),   // いぶし瓦：金属の照りにしない（粗さは瓦ごとにむら）
    wood: new THREE.MeshStandardMaterial({ color: "#6d5a48", map: ld("web/tex/wood_c.webp", true, .6), normalMap: ld("web/tex/wood_n.webp", false, .6), roughness: .72 }),
    bwood: new THREE.MeshStandardMaterial({ color: "#5a5048", map: ld("web/tex/bplank_c.webp", true, .5), normalMap: ld("web/tex/bplank_n.webp", false, .5), roughness: .66 }),
    stone: new THREE.MeshStandardMaterial({ color: "#a39f97", map: ld("web/tex/granite_c.webp", true, .5), normalMap: ld("web/tex/granite_n.webp", false, .5), roughness: .8 }),
    dark: new THREE.MeshStandardMaterial({ color: "#07080a", roughness: .95 }),
    bronze: new THREE.MeshStandardMaterial({ color: "#4a4a3c", map: ld("web/tex/bronze_c.webp", true, 1), normalMap: ld("web/tex/bronze_n.webp", false, 1), roughness: .42, metalness: .85 }),
  };
  for (const k in MATS) MATS[k].side = THREE.DoubleSide;   // 面の向きを気にせず、両面を描く
  // 壁の足もと（地面から約 0.9 m）に、はね上がった土ぼこりと雨じみ：色を少し明るく灰に、つやを落とす。上の縁へ向かって雨の筋を薄く
  for (const k of ["shikkui", "plaster", "plasterg"]) MATS[k].onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vLy; varying vec2 vLxz;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvLy = position.y; vLxz = position.xz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vLy; varying vec2 vLxz;\nfloat h1(float n){return fract(sin(n)*43758.5453);}")
      .replace("#include <map_fragment>", `#include <map_fragment>
        float dust = (1. - smoothstep(.15, 1.05, vLy)) * .85;
        float streak = smoothstep(.55, 1., h1(floor((vLxz.x + vLxz.y) * 7.))) * smoothstep(7.5, 3., vLy) * .25;
        diffuseColor.rgb = mix(diffuseColor.rgb, ${k === "shikkui" ? "vec3(.16,.15,.14)" : "vec3(.62,.61,.59)"}, dust * .3);
        ${k !== "plaster" ? "" : "diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(.2126,.7152,.0722))) * vec3(1.,1.,1.02), .85);"}   // 漆喰の写真の黄みを抜き、灰白に
        diffuseColor.rgb *= 1. - streak * ${k === "shikkui" ? ".0" : ".1"} + streak * ${k === "shikkui" ? ".25" : ".0"};
        ${k !== "shikkui" ? "" : "float tw = sin(vLxz.x * 1.7 + vLy * .9) * sin((vLxz.y - vLy) * 1.3); diffuseColor.rgb *= 1. + tw * .06;"}`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, .95, dust);");
  };
  MATS.shikkui.customProgramCacheKey = () => "kura-shikkui"; MATS.plaster.customProgramCacheKey = () => "kura-plaster"; MATS.plasterg.customProgramCacheKey = () => "kura-plasterg";
  MATS.tileCanvas = tile.canvas;
  return MATS;
}

/* ---------- 店蔵の型 ----------
   A：観音開きの窓 2・下屋あり／B：窓 3・格子戸／C：箱棟が高く鬼瓦が大きい・窓 2／D：窓 1 の大きな壁・下屋深い／E：窓 2・袖の壁（袖蔵の模式なし） */
const TYPES = {
  A: { win: 2, lattice: false, ridge: .95, oni: 1.05, hisashi: 1.1, h1: 3.5, h2: 6.6 },
  B: { win: 3, lattice: true, ridge: .85, oni: .95, hisashi: 1.0, h1: 3.4, h2: 6.4 },
  C: { win: 2, lattice: false, ridge: 1.25, oni: 1.3, hisashi: 1.2, h1: 3.6, h2: 6.9 },
  D: { win: 1, lattice: true, ridge: 1.0, oni: 1.1, hisashi: 1.4, h1: 3.5, h2: 6.7 },
  E: { win: 2, lattice: true, ridge: .9, oni: 1.0, hisashi: 1.0, h1: 3.3, h2: 6.3 },
};
function oniShape(h) {   // 鬼瓦の板の形（模式）：裾の広い台に、上が丸くふくらむ
  const s = new THREE.Shape(), w = h * .62;
  s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w * .92, h * .18); s.quadraticCurveTo(w * 1.08, h * .55, w * .62, h * .78);
  s.quadraticCurveTo(w * .35, h * 1.04, 0, h); s.quadraticCurveTo(-w * .35, h * 1.04, -w * .62, h * .78); s.quadraticCurveTo(-w * 1.08, h * .55, -w * .92, h * .18); s.closePath();
  return s;
}
export function kuraGeos(type) {
  const T = TYPES[type], W = W0, D = D0, hw = W / 2, hd = D / 2, wt = .35;   // 壁の厚み（土壁の模式）
  const A = { shikkui: new Acc(), tile: new Acc(), wood: new Acc(), stone: new Acc(), dark: new Acc() };
  // 基礎
  A.stone.box(-hw, -.6, -hd, hw, .25, hd, 1, "xXzZY");
  // 1 階：奥と横は土壁、手前は 0.7 m 引っこめた店の口
  const fz = hd - .7;
  A.shikkui.box(-hw, .25, -hd, hw, T.h1, fz, 1, "xXz");
  A.shikkui.box(-hw, .25, fz, -hw + .5, T.h1, hd, 1, "xXZ"); A.shikkui.box(hw - .5, .25, fz, hw, T.h1, hd, 1, "xXZ");
  A.dark.quad([-hw + .5, .25, fz], [hw - .5, .25, fz], [hw - .5, T.h1 - .5, fz], [-hw + .5, T.h1 - .5, fz]);   // 店の奥の暗がり
  A.wood.box(-hw + .5, T.h1 - .55, fz, hw - .5, T.h1, hd - .05, 1, "ZyY");   // 鴨居
  const nb = 3;
  for (let i = 0; i <= nb; i++) { const x = -hw + .5 + (W - 1) * i / nb; A.wood.box(x - .09, .25, hd - .35, x + .09, T.h1 - .5, hd - .17); }   // 柱
  if (T.lattice) for (let x = -hw + .65; x < hw - .6; x += .11) A.wood.box(x - .018, .4, fz + .25, x + .018, T.h1 - .6, fz + .29, 1, "xXZ");   // 格子（模式）
  // 下屋（ひさし）：1 階の上、手前へ突き出す
  const hy = T.h1 + .35, hz = hd + T.hisashi;
  A.tile.slab(-hw - .15, hw + .15, hy - .45, hz, hy, hd, .14); A.tile.ribs(-hw - .15, hw + .15, hy - .45, hz, hy, hd, .3, .06, .06);
  A.wood.box(-hw - .17, hy - .45 - .2, hz - .03, hw + .17, hy - .45 + .03, hz + .03);   // 鼻隠しの板（2026-10-23 公開前：下屋の瓦の切り口に白い光の縞が出たので板で隠す）
  A.wood.quad([hw + .15, hy - .45 - .15, hz], [-hw - .15, hy - .45 - .15, hz], [-hw - .15, hy - .15, hd], [hw + .15, hy - .15, hd]);   // 下屋の軒裏は板（見上げたとき瓦の照りが見えない）
  for (let x = -hw; x <= hw; x += .9) A.wood.box(x - .04, hy - .62, hd, x + .04, hy - .5, hz - .1, 1, "xXy");   // 垂木
  // 2 階：厚い土壁（手前を 0.25 m 引っこめる）
  const z2 = hd - .25;
  A.shikkui.box(-hw, T.h1, -hd, hw, T.h2, z2, 1, "xXzZ");
  // 2026-10-27 壁を平らな箱にしない：2 階の両端に袖壁（防火の厚い土の壁を通りへ突き出し、上に瓦の笠）・床の高さの水切り（瓦の段）・2 階の腰の段
  for (const sx of [-1, 1]) { const xo = sx * hw, xi = sx * (hw - .42), x0 = Math.min(xo, xi), x1 = Math.max(xo, xi);
    A.shikkui.box(x0, T.h1, z2, x1, T.h2 - .7, hd + .55);   // 袖壁
    A.tile.box(x0 - .06, T.h2 - .7, z2, x1 + .06, T.h2 - .55, hd + .7, 1, "xXZY");   // 袖壁の笠
    A.shikkui.box(x0 - .03, T.h1, hd + .3, x1 + .03, T.h1 + .45, hd + .6); }   // 袖壁の足もとの段
  A.tile.box(-hw + .42, T.h1 + .38, z2, hw - .42, T.h1 + .48, z2 + .22, 1, "ZYy");   // 水切り（2 階の床の高さの瓦の段）
  A.shikkui.box(-hw + .42, T.h1 + .48, z2, hw - .42, T.h1 + .78, z2 + .1, 1, "ZY");   // 2 階の腰の段
  A.shikkui.box(-hw + .42, T.h2 - 1.0, z2, hw - .42, T.h2 - .7, z2 + .12, 1, "ZYy");   // 鉢巻の下の段
  // 観音開きの窓：壁の穴の暗がり＋両側へ開いた厚い扉（土扉の模式）
  for (let i = 0; i < T.win; i++) {
    const cx = -hw + W * (i + .5) / T.win, ww = T.win === 1 ? 1.6 : 1.05, wy0 = T.h1 + 1.0, wy1 = wy0 + 1.15;
    A.dark.quad([cx - ww / 2, wy0, z2 + .01], [cx + ww / 2, wy0, z2 + .01], [cx + ww / 2, wy1, z2 + .01], [cx - ww / 2, wy1, z2 + .01]);
    for (let x = cx - ww / 2 + .12; x < cx + ww / 2 - .05; x += .16) A.wood.box(x - .022, wy0, z2 + .02, x + .022, wy1, z2 + .06, 1, "xXZ");   // 窓の格子（模式）
    A.shikkui.box(cx - ww / 2 - .1, wy0 - .1, z2, cx - ww / 2, wy1 + .1, z2 + .16, 1, "xXZ"); A.shikkui.box(cx + ww / 2, wy0 - .1, z2, cx + ww / 2 + .1, wy1 + .1, z2 + .16, 1, "xXZ");   // 窓の枠の段
    A.shikkui.box(cx - ww / 2 - .16, wy0 - .12, z2, cx + ww / 2 + .16, wy0, z2 + .2, 1, "XxYZy");   // 窓の下の段
    A.shikkui.box(cx - ww / 2 - .16, wy1, z2, cx + ww / 2 + .16, wy1 + .14, z2 + .22, 1, "XxYZy");   // 窓の上の段
    for (const sd of [-1, 1]) {   // 扉は壁に沿って開いた形（厚み 0.16）
      const x0 = cx + sd * ww / 2, x1 = x0 + sd * ww / 2;
      A.shikkui.box(Math.min(x0, x1), wy0 - .04, z2 + .05, Math.max(x0, x1), wy1 + .04, z2 + .3);   // 厚い土扉
      A.shikkui.box(Math.min(x0, x1) + .06, wy0 + .06, z2 + .3, Math.max(x0, x1) - .06, wy1 - .06, z2 + .36);   // 扉の段（掛子の模式）
      A.shikkui.box(Math.min(x0, x1) + .12, wy0 + .12, z2 + .36, Math.max(x0, x1) - .12, wy1 - .12, z2 + .41);   // 掛子の三段目（厚い土扉の段の重なり）
      A.wood.box(sd > 0 ? x0 + .02 : x0 - .05, wy0 + .2, z2 + .3, sd > 0 ? x0 + .05 : x0 - .02, wy1 - .2, z2 + .34, 1, "xXZ");   // 扉の吊り元の金具の帯（模式）
      A.dark.quad([Math.min(x0, x1), wy0 - .05, z2 + .049], [Math.max(x0, x1), wy0 - .05, z2 + .049], [Math.max(x0, x1), wy1 + .05, z2 + .049], [Math.min(x0, x1), wy1 + .05, z2 + .049]);   // 扉の裏の影
    }
  }
  // 大屋根：平入り（棟は通りと平行）。軒は手前と奥へ 0.9 m、横へ 0.5 m 出す。鉢巻（軒下の厚い土の帯）
  const eave = T.h2 + .05, pitch = .5, ez = hd + .9, ridgeY = eave + (hd + .9) * pitch * .92;
  A.shikkui.box(-hw - .2, T.h2 - .7, -hd - .35, hw + .2, T.h2 + .05, z2 + .35, 1, "xXzZy");   // 鉢巻
  A.tile.slab(-hw - .5, hw + .5, eave, ez, ridgeY, 0, .16);
  A.tile.slab(hw + .5, -hw - .5, eave, -ez, ridgeY, 0, .16);
  A.tile.ribs(-hw - .5, hw + .5, eave, ez, ridgeY, 0); A.tile.ribs(hw + .5, -hw - .5, eave, -ez, ridgeY, 0);
  // 置き屋根：土の箱（鉢巻）の上に、木の小屋で浮かせて屋根を置く。軒の下に影の隙間と、垂木と、桁を見せる
  for (const sz of [-1, 1]) { const zi = sz * (z2 + .35), zo = sz * ez, y0 = T.h2 + .05;
    A.dark.quad([-hw - .5, y0, zi], [hw + .5, y0, zi], [hw + .5, eave - .17, zi], [-hw - .5, eave - .17, zi]);
    A.wood.box(-hw - .5, eave - .34, Math.min(zi, zi + sz * .2), hw + .5, eave - .16, Math.max(zi, zi + sz * .2), 1, "zZy");   // 出桁
    for (let x = -hw - .4; x <= hw + .4; x += .45) { const za = Math.min(zi, zo - sz * .05), zb = Math.max(zi, zo - sz * .05); A.wood.box(x - .045, eave - .3, za, x + .045, eave - .17, zb, 1, "xXy"); } }   // 垂木
  for (const sx of [-1, 1]) A.shikkui.tri([sx * hw, T.h2, -hd], [sx * hw, T.h2, hd - .25], [sx * hw, ridgeY - .2, 0].map((v, i) => v), 1);   // 妻の壁
  for (const sx of [-1, 1]) {   // 2026-10-25 横の壁にも、2 階に小さな窓（暗がりと格子と土の枠の段・模式）。角に建つと通りから見える
    const x = sx * (hw + .01), xo = sx * (hw + .14), xa = Math.min(x, xo), xb = Math.max(x, xo), zc = -hd * .2, w = .9, y0 = T.h1 + 1.1, y1 = y0 + 1.0;
    A.dark.quad([x + sx * .004, y0, zc - w / 2], [x + sx * .004, y0, zc + w / 2], [x + sx * .004, y1, zc + w / 2], [x + sx * .004, y1, zc - w / 2]);
    for (let z = zc - w / 2 + .1; z < zc + w / 2 - .04; z += .15) A.wood.box(Math.min(x, x + sx * .05), y0, z - .02, Math.max(x, x + sx * .05), y1, z + .02);
    A.shikkui.box(xa, y0 - .14, zc - w / 2 - .14, xb, y0, zc + w / 2 + .14); A.shikkui.box(xa, y1, zc - w / 2 - .14, xb, y1 + .16, zc + w / 2 + .14);
    A.shikkui.box(xa, y0, zc - w / 2 - .12, xb, y1, zc - w / 2); A.shikkui.box(xa, y0, zc + w / 2, xb, y1, zc + w / 2 + .12);
  }
  // 箱棟：棟の上の大きな箱（側面は土、上は瓦）
  const rh = T.ridge, rw = .34;
  A.shikkui.box(-hw - .35, ridgeY - .1, -rw, hw + .35, ridgeY + rh, rw, 1, "zZ");
  A.tile.box(-hw - .45, ridgeY + rh, -rw - .1, hw + .45, ridgeY + rh + .14, rw + .1, 1, "xXzZY");
  for (let k = 1; k <= 2; k++) A.tile.box(-hw - .36, ridgeY + rh * k / 3 - .04, -rw - .03, hw + .36, ridgeY + rh * k / 3 + .04, rw + .03, 1, "zZY");   // 箱棟の筋
  const geos = {}; for (const k in A) if (A[k].p.length) geos[k] = A[k].geo();
  // 鬼瓦：棟の両端に立てる（板を押し出した形）
  const og = new THREE.ExtrudeGeometry(oniShape(T.oni), { depth: .3, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 1, curveSegments: 6 });
  og.translate(0, 0, -.15); og.rotateY(Math.PI / 2);
  const o1 = og.clone().translate(-hw - .5, ridgeY + rh * .2, 0), o2 = og.clone().translate(hw + .5, ridgeY + rh * .2, 0);
  // 鬼瓦の彫り（一回り小さい面を外へ重ねて段に）・経の巻（上の丸い巻物）・鰭（棟の横へはねる板）
  const og2 = new THREE.ExtrudeGeometry(oniShape(T.oni * .72), { depth: .14, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 1, curveSegments: 6 }); og2.rotateY(Math.PI / 2);
  const kyo = new THREE.CylinderGeometry(.13, .13, .62, 12).rotateX(Math.PI / 2);
  const hire = new THREE.ExtrudeGeometry((() => { const f = new THREE.Shape(); f.moveTo(0, 0); f.quadraticCurveTo(.5, .1, .75, .55); f.lineTo(.62, .6); f.quadraticCurveTo(.4, .25, 0, .22); f.closePath(); return f; })(), { depth: .08, bevelEnabled: false }); hire.translate(0, 0, -.04);
  const parts = [o1, o2];
  for (const sx of [-1, 1]) { const x = sx * (hw + .5);
    parts.push(og2.clone().translate(x + sx * .2, ridgeY + rh * .2 + T.oni * .1, 0));
    parts.push(kyo.clone().translate(x + sx * .05, ridgeY + rh * .2 + T.oni * 1.05, 0));
    parts.push(hire.clone().rotateY(sx > 0 ? 0 : Math.PI).translate(x - sx * .25, ridgeY + rh + .1, 0)); }
  geos.oni = mergeAll(parts);
  return { geos, h: ridgeY + rh + T.oni * .8 };
}

/* ---------- 町家の型（模式）：一番街と鐘つき通りの、型の蔵を置かなかった低い建物 ----------
   2 階建て・平入り・瓦屋根・1 階は格子と下屋。M＝上壁が灰白の漆喰／N＝上壁が杉の板。一棟ずつの姿ではない（瓦屋根の連なりと通りの狭さを出すための模式） */
const MTYPES = {   // up＝2 階の正面・side＝横と奥・f1＝1 階の正面（lattice＝格子／glass＝ガラス戸の店の口）
  M: { up: "plaster", side: "plasterg", f1: "lattice", h1: 3.1, h2: 5.7, pitch: .42 },
  N: { up: "cedar", side: "plaster", f1: "lattice", h1: 3.0, h2: 5.5, pitch: .46 },
  G: { up: "shikkui", side: "shikkui", f1: "glass", h1: 3.2, h2: 5.9, pitch: .42 },
  K: { up: "shikkui", side: "shikkui", f1: "glass", h1: 3.2, h2: 6.0, pitch: .45 },   // 塗屋（2 階の正面を黒く塗った町家の模式）
};
export function machiGeos(type) {
  const T = MTYPES[type], W = W0, D = D0, hw = W / 2, hd = D / 2;
  const A = { stone: new Acc(), cedar: new Acc(), wood: new Acc(), dark: new Acc(), tile: new Acc(), plaster: new Acc(), plasterg: new Acc(), shikkui: new Acc(), glass: new Acc(), doma: new Acc() };
  A.stone.box(-hw, -.6, -hd, hw, .15, hd, 1, "xXzZY");
  const fz = hd - .55;
  A[T.side].box(-hw, .15, -hd, hw, T.h1, T.f1 === "glass" ? hd - .3 : fz, 1, "xXz");   // 1 階の横と奥
  if (T.f1 !== "glass") A.dark.quad([-hw, .15, fz], [hw, .15, fz], [hw, T.h1, fz], [-hw, T.h1, fz]);   // 店の奥の暗がり（ガラス戸の型は、奥の土間が見える）
  A.wood.box(-hw, T.h1 - .35, fz, hw, T.h1, hd - .05, 1, "ZyY");   // 鴨居
  const nb = Math.max(3, Math.round(W / 2)); for (let i = 0; i <= nb; i++) { const x = -hw + .1 + (W - .2) * i / nb; A.wood.box(x - .08, .15, hd - .3, x + .08, T.h1 - .35, hd - .14); }   // 柱
  if (T.f1 === "lattice") {
    for (let x = -hw + .3; x < hw - .2; x += .1) A.cedar.box(x - .017, .5, hd - .26, x + .017, T.h1 - .4, hd - .22, 1, "xXZ");   // 格子（模式）
    A.wood.box(-hw + .1, .15, hd - .3, hw - .1, .5, hd - .16, 1, "ZY");   // 格子の下の腰板
  } else {   // ガラス戸の店の口：引き戸の框と、上に欄間の格子（店名・看板は作らない）。ガラスの奥 2.5 m に土間と奥の壁
    const bz = hd - 3; A.doma.quad([-hw + .1, .16, hd - .3], [hw - .1, .16, hd - .3], [hw - .1, .16, bz], [-hw + .1, .16, bz]); A.doma.quad([-hw + .1, .16, bz], [hw - .1, .16, bz], [hw - .1, T.h1 - .4, bz], [-hw + .1, T.h1 - .4, bz]);
    for (let x = -hw + .8; x < hw - .5; x += 1.6) A.wood.box(x - .5, .9, bz + .02, x + .5, 1.0, bz + .4, 1, "ZY");   // 奥の棚（模式）
    A.glass.quad([-hw + .1, .2, hd - .3], [hw - .1, .2, hd - .3], [hw - .1, T.h1 - .95, hd - .3], [-hw + .1, T.h1 - .95, hd - .3]);
    for (let x = -hw + .1; x <= hw - .1 + 1e-6; x += (W - .2) / (nb * 2)) A.wood.box(x - .035, .2, hd - .3, x + .035, T.h1 - .95, hd - .24, 1, "xXZ");
    A.wood.box(-hw + .1, T.h1 - 1.0, hd - .3, hw - .1, T.h1 - .9, hd - .22, 1, "ZYy"); A.wood.box(-hw + .1, .15, hd - .3, hw - .1, .24, hd - .2, 1, "ZY");
    for (let x = -hw + .2; x < hw - .15; x += .14) A.cedar.box(x - .015, T.h1 - .9, hd - .28, x + .015, T.h1 - .38, hd - .25, 1, "xXZ");
  }
  const hy = T.h1 + .3, hz = hd + .85;
  A.tile.slab(-hw - .05, hw + .05, hy - .38, hz, hy, hd, .1);   // 下屋
  A.wood.quad([hw + .05, hy - .38 - .11, hz], [-hw - .05, hy - .38 - .11, hz], [-hw - .05, hy - .11, hd], [hw + .05, hy - .11, hd]);   // 軒裏
  for (let x = -hw; x <= hw; x += .75) A.wood.box(x - .035, hy - .5, hd, x + .035, hy - .42, hz - .08, 1, "xXy");
  const z2 = hd - .15;
  A[T.side].box(-hw, T.h1, -hd, hw, T.h2, z2, 1, "xXz");   // 2 階の横と奥
  A[T.up].quad([-hw, T.h1, z2], [hw, T.h1, z2], [hw, T.h2, z2], [-hw, T.h2, z2]);   // 2 階の正面
  const nw = W > 9 ? 2 : 1, ww = Math.min(3.6, W * .5 / nw), wy0 = T.h1 + .95, wy1 = wy0 + .95;   // 2 階の窓（格子）
  for (let k = 0; k < nw; k++) { const cx = nw === 1 ? 0 : (k ? 1 : -1) * W / 4;
    A.dark.quad([cx - ww / 2, wy0, z2 + .01], [cx + ww / 2, wy0, z2 + .01], [cx + ww / 2, wy1, z2 + .01], [cx - ww / 2, wy1, z2 + .01]);
    for (let x = cx - ww / 2 + .06; x < cx + ww / 2; x += .12) A.cedar.box(x - .016, wy0, z2 + .02, x + .016, wy1, z2 + .06, 1, "xXZ");
    A.wood.box(cx - ww / 2 - .08, wy0 - .08, z2, cx + ww / 2 + .08, wy0, z2 + .1, 1, "ZY"); A.wood.box(cx - ww / 2 - .08, wy1, z2, cx + ww / 2 + .08, wy1 + .08, z2 + .1, 1, "ZY"); }
  const eave = T.h2 + .03, ez = hd + .6, ridgeY = eave + ez * T.pitch;
  A.wood.box(-hw - .1, T.h2 - .25, -hd - .1, hw + .1, T.h2 + .03, z2 + .1, 1, "xXzZy");   // 軒の桁
  A.tile.slab(-hw - .45, hw + .45, eave, ez, ridgeY, 0, .12);
  A.tile.slab(hw + .45, -hw - .45, eave, -ez, ridgeY, 0, .12);
  for (const sx of [-1, 1]) A[T.side].tri([sx * hw, T.h2, -hd], [sx * hw, T.h2, z2], [sx * hw, ridgeY - .12, 0], 1);   // 妻の壁
  // 2026-10-25 横の壁（角に建つと通りから見える）にも、杉の腰板と、1 階・2 階の小さな格子窓（模式）。窓のない平らな壁に見せない
  for (const sx of [-1, 1]) {
    const x = sx * (hw + .012), xo = sx * (hw + .07), xa = Math.min(x, xo), xb = Math.max(x, xo);
    A.cedar.quad([x, .15, -hd + .15], [x, .15, z2 - .05], [x, 1.0, z2 - .05], [x, 1.0, -hd + .15]);   // 腰板
    A.wood.box(xa, .98, -hd + .15, xb, 1.06, z2 - .05);   // 腰板の見切り
    for (const [zc, y0, y1, w] of [[-hd * .4, T.h1 + .9, T.h1 + 1.7, 1.4], [hd * .25, 1.35, 2.25, 1.2]]) {
      A.dark.quad([x + sx * .004, y0, zc - w / 2], [x + sx * .004, y0, zc + w / 2], [x + sx * .004, y1, zc + w / 2], [x + sx * .004, y1, zc - w / 2]);
      for (let z = zc - w / 2 + .06; z < zc + w / 2 - .02; z += .12) A.cedar.box(xa, y0, z - .016, xb, y1, z + .016);   // 格子
      A.wood.box(xa - .02, y0 - .08, zc - w / 2 - .08, xb + .02, y0, zc + w / 2 + .08); A.wood.box(xa - .02, y1, zc - w / 2 - .08, xb + .02, y1 + .08, zc + w / 2 + .08);
      A.wood.box(xa, y0, zc - w / 2 - .08, xb, y1, zc - w / 2); A.wood.box(xa, y0, zc + w / 2, xb, y1, zc + w / 2 + .08);
    }
  }
  A.tile.box(-hw - .45, ridgeY - .06, -.2, hw + .45, ridgeY + .26, .2, 1, "xXzZY");   // 棟（低い）
  const geos = {}; for (const k in A) if (A[k].p.length) geos[k] = A[k].geo();
  return { geos, h: ridgeY + .26 };
}

/* ---------- 時の鐘（三層の櫓） ---------- */
export function bellGeos() {
  const A = { bwood: new Acc(), tile: new Acc(), stone: new Acc(), dark: new Acc(), wood: new Acc() };
  const tiers = [[0, 6.2, 3.7], [6.9, 10.4, 3.2], [11.1, 13.4, 2.9]];   // [下, 上, 一辺]
  A.stone.box(-2.3, -.6, -2.3, 2.3, .3, 2.3, 1, "xXzZY");
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) A.stone.box(sx * 1.85 - .32, .3, sz * 1.85 - .32, sx * 1.85 + .32, .55, sz * 1.85 + .32);   // 礎石
  tiers.forEach(([y0, y1, s], i) => {
    const h = s / 2;
    if (i < 2) {   // 下見板の壁（横に重ねた板）：板 1 枚ずつの段を、少しずつずらして重ねる
      for (let y = y0 + (i === 0 ? .55 : 0); y < y1 - .05; y += .24) {
        const t = .03, o = h + t * ((Math.round(y / .24) % 2) ? 1 : 0) * .0 + .02;
        A.bwood.quad([-o, y, o + t], [o, y, o + t], [o, y + .26, o], [-o, y + .26, o]);
        A.bwood.quad([o, y, -o - t], [-o, y, -o - t], [-o, y + .26, -o], [o, y + .26, -o]);
        A.bwood.quad([o + t, y, o], [o + t, y, -o], [o, y + .26, -o], [o, y + .26, o]);
        A.bwood.quad([-o - t, y, -o], [-o - t, y, o], [-o, y + .26, o], [-o, y + .26, -o]);
      }
      if (i === 0) A.dark.quad([-.6, .55, h + .06], [.6, .55, h + .06], [.6, 2.6, h + .06], [-.6, 2.6, h + .06]);   // 戸口の暗がり（模式）
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) A.wood.box(sx * h - .14 * (sx > 0 ? 1 : 0), i === 0 ? .55 : y0, sz * h - .14 * (sz > 0 ? 1 : 0), sx * h + .14 * (sx < 0 ? 1 : 0), y1, sz * h + .14 * (sz < 0 ? 1 : 0));   // 隅の柱
    // 各層の上のひさし（四方へ下がる瓦）
    const ry = i < 2 ? y1 + .1 : y1 + .05, o = h + (i < 2 ? 1.0 : 1.2), dy = i < 2 ? .7 : .9;
    A.tile.quad([-o, ry - dy, o], [o, ry - dy, o], [h, ry, h], [-h, ry, h]);
    A.tile.quad([o, ry - dy, -o], [-o, ry - dy, -o], [-h, ry, -h], [h, ry, -h]);
    A.tile.quad([o, ry - dy, o], [o, ry - dy, -o], [h, ry, -h], [h, ry, h]);
    A.tile.quad([-o, ry - dy, -o], [-o, ry - dy, o], [-h, ry, h], [-h, ry, -h]);
    A.wood.quad([o, ry - dy - .05, o], [-o, ry - dy - .05, o], [-h, ry - .05, h], [h, ry - .05, h]);   // 軒裏
    A.wood.quad([-o, ry - dy - .05, -o], [o, ry - dy - .05, -o], [h, ry - .05, -h], [-h, ry - .05, -h]);
    A.wood.quad([o, ry - dy - .05, -o], [o, ry - dy - .05, o], [h, ry - .05, h], [h, ry - .05, -h]);
    A.wood.quad([-o, ry - dy - .05, o], [-o, ry - dy - .05, -o], [-h, ry - .05, -h], [-h, ry - .05, h]);
    if (i < 2) A.bwood.box(-h + .1, ry, -h + .1, h - .1, tiers[i + 1][0], h - .1, 1, "xXzZ");   // 層のあいだの胴
  });
  // 最上層：四方が開いた鐘の間。手すり
  const s3 = tiers[2][2] / 2, y3 = tiers[2][0];
  for (const sd of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const [ax, az] = sd, px = (t) => ax ? [ax * (s3 + .05), az] : [t, az * (s3 + .05)];
    for (const yy of [y3 + .9, y3 + .25]) { if (ax) A.wood.box(ax * s3 - .05, yy, -s3, ax * s3 + .05, yy + .08, s3); else A.wood.box(-s3, yy, az * s3 - .05, s3, yy + .08, az * s3 + .05); }
  }
  // 屋根の頂き（宝形）
  const top = tiers[2][1] + .05, o = s3 + 1.2, peak = 17.6;   // 土間〜頂部 17.6 m（川越市のパンフレット）
  A.tile.tri([-o, top - .9, o], [o, top - .9, o], [0, peak - .5, 0]); A.tile.tri([o, top - .9, -o], [-o, top - .9, -o], [0, peak - .5, 0]);
  A.tile.tri([o, top - .9, o], [o, top - .9, -o], [0, peak - .5, 0]); A.tile.tri([-o, top - .9, -o], [-o, top - .9, o], [0, peak - .5, 0]);
  A.dark.box(-.18, peak - .55, -.18, .18, peak, .18);   // 頂きの飾り（模式）
  const geos = {}; for (const k in A) if (A[k].p.length) geos[k] = A[k].geo();
  // 鐘（明治 27 年の鐘：全長 1.3 m・外径 82 cm〈川越市のパンフレット〉）：回転体の模式
  const prof = [[0, 1.3], [.12, 1.3], [.3, 1.26], [.36, 1.1], [.38, .7], [.4, .25], [.41, .05], [.38, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  const bell = new THREE.LatheGeometry(prof, 28); bell.translate(0, y3 + 1.0 - .2, 0);
  geos.bronze = bell;
  return { geos, bellY: y3 + 1.65 };
}

export function mergeAll(list) {
  const P = [], N = [], U = [];
  for (let g of list) { if (g.index) g = g.toNonIndexed(); const p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv?.array;
    P.push(...p); N.push(...n); if (u) U.push(...u); else for (let i = 0; i < p.length / 3; i++) U.push(0, 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.computeBoundingSphere(); return g;
}
