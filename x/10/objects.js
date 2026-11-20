/* Qualia/touch ── 形に貼る（触覚の mixed reality）。2026-10-27 本人「3D オブジェクトに、触覚情報を形状に貼り付けられるような操作を」
   形は mitsulab がこの場でつくる（外の素材は使わない＝権利の心配なし）。大きさは実寸の目安：1 単位＝10 cm。
   触覚の面（写真から作った凹凸の地図）を形の UV に沿って並べ、凹凸の分だけ法線の向きに押し出す。触れ心地の計算は面と同じ地図を引く。 */
import * as THREE from "three";

const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
// なめらかな雑音（形のゆらぎ。同じ種なら同じ形）
function noise3(seed) {
  const r = rng(seed), P = Array.from({ length: 24 }, () => [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1, r() * 6.28, 1 + r() * 2.5]);
  return (x, y, z) => { let s = 0; for (const [a, b, c, ph, f] of P) s += Math.sin((a * x + b * y + c * z) * f * 3 + ph) / f; return s / 6; };
}

// 2026-11-20 本人「犬でなく、もっと触覚が味わえる３dオブジェクトに。触覚が入れ替わって違和感ないものに」
// ＝どの触れ心地を貼っても「その素材でできた物」に見える、中立で形の読みやすい物だけにする。生き物の形は外した（毛並みやうろこの面を用意できたら、その面と対で戻す）。
// はじめの四つは mitsulab がこの場でつくる形（外の素材なし）。面のどこでも模様が同じ細かさで並び、つなぎ目が割れないように作る。器と岩は実物を測った形（Poly Haven・CC0。台帳 M-0900）
export const OBJECTS = [
  { id: "lump", name: "かたまり", sub: "手のひらに収まる丸い塊（模型）", make: "lump", rep: [1, 1], el: .2, zoom: .74, relief: .85 },
  { id: "ring", name: "輪", sub: "指を通せる太い輪（模型）", make: "ring", rep: [2, 1], el: .4, zoom: .78, relief: .85 },
  { id: "log", name: "円柱", sub: "片手でにぎれる円柱（模型）", make: "log", rep: [1, 1], el: .2, zoom: .78, relief: .85 },
  { id: "rise", name: "起伏", sub: "手のひらほどの起伏（模型）", make: "rise", rep: [1, 1], el: .27, zoom: .8, relief: .5 },
  { id: "vase", name: "器", sub: "実物を測った花瓶", src: "models/ceramic_vase_01.gltf", rep: [2, 2], size: .55, tint: [1.7, 1.6, 1.45] },
  { id: "boulder", name: "岩", sub: "実物を測った岩", src: "models/boulder_01.gltf", rep: [1, 1] },
];

// ---- この場でつくる形の土台
// 格子の面を足す。f(s,t) → [x,y,z,u,v,w]（w＝凹凸の効き。面のつなぎ目では 0 にして割れを防ぐ）。c＝形の内側の一点（面の表を外へ向ける）
function sheet(P, ns, nt, f, c) {
  const o = P.pos.length / 3;
  for (let j = 0; j <= nt; j++) for (let i = 0; i <= ns; i++) { const r = f(i / ns, j / nt); P.pos.push(r[0], r[1], r[2]); P.uv.push(r[3], r[4]); P.w.push(r[5] ?? 1); }
  const id = []; for (let j = 0; j < nt; j++) for (let i = 0; i < ns; i++) { const a = o + j * (ns + 1) + i, b = a + 1, d = a + ns + 1, e = d + 1; id.push(a, d, b, b, d, e); }
  let sum = 0; const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), q = k => new THREE.Vector3(P.pos[k * 3], P.pos[k * 3 + 1], P.pos[k * 3 + 2]);
  for (let k = 0; k < id.length; k += 3 * 29) { A.copy(q(id[k])); B.copy(q(id[k + 1])).sub(A); C.copy(q(id[k + 2])).sub(A); sum += B.cross(C).normalize().dot(A.sub(c).normalize()); }
  if (sum < 0) for (let k = 0; k < id.length; k += 3) { const t = id[k + 1]; id[k + 1] = id[k + 2]; id[k + 2] = t; }
  for (let k = 0; k < id.length; k++) P.idx.push(id[k]);
}
// 同じ場所に重なる頂点の組（面のつなぎ目）。凹凸を貼ったあと、向きをそろえて継ぎ目を消す
function weldGroups(g) {
  const p = g.attributes.position, m = new Map(), out = [];
  for (let i = 0; i < p.count; i++) { const k = Math.round(p.getX(i) * 2e4) + "," + Math.round(p.getY(i) * 2e4) + "," + Math.round(p.getZ(i) * 2e4); const a = m.get(k); if (a) a.push(i); else m.set(k, [i]); }
  for (const a of m.values()) if (a.length > 1) out.push(a); return out;
}
function finish(P, ry = 0, sink = 0) {
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P.pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(P.uv, 2)); g.setIndex(new THREE.BufferAttribute(new Uint32Array(P.idx), 1));
  g.computeBoundingBox(); const b = g.boundingBox, c = b.getCenter(new THREE.Vector3()); g.translate(-c.x, -b.min.y - .104 - sink, -c.z); if (ry) g.rotateY(ry);   // 森の地面（y＝−.106）に置く
  g.userData.w = new Float32Array(P.w); return seal(g);
}
function seal(g) { g.userData.weld = weldGroups(g); g.computeVertexNormals(); smoothWeld(g); g.userData.base = g.attributes.position.array.slice(); g.userData.n0 = g.attributes.normal.array.slice(); return g; }
function smoothWeld(g) {
  const W = g.userData.weld, n = g.attributes.normal; if (!W) return;
  for (const a of W) { let x = 0, y = 0, z = 0; for (const i of a) { x += n.getX(i); y += n.getY(i); z += n.getZ(i); } const l = Math.hypot(x, y, z) || 1; for (const i of a) n.setXYZ(i, x / l, y / l, z / l); }
  n.needsUpdate = true;
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const newP = () => ({ pos: [], uv: [], w: [], idx: [] });
const MAKE = {
  // かたまり：川原の丸石ほどの塊。上と下の二枚の面を合わせる（合わせ目は、土に近い下まわりに置く）
  lump(N) {
    const n = noise3(23), P = newP(), TH = 1.95;
    const pt = sg => (s, t) => {
      const a = s * 2 - 1, b = t * 2 - 1, dx = a * Math.sqrt(1 - b * b / 2), dz = b * Math.sqrt(1 - a * a / 2), rho = Math.hypot(dx, dz), th = sg > 0 ? rho * TH : Math.PI - rho * (Math.PI - TH), k = rho < 1e-6 ? (sg > 0 ? TH : Math.PI - TH) : Math.sin(th) / rho;
      const x = dx * k, z = dz * k, y = Math.cos(th), kk = 1 + n(x * .62, y * .62, z * .62) * .34;
      return [x * kk * .36, y * kk * (y > 0 ? .26 : .2), z * kk * .29, s, t, 1];
    };
    sheet(P, N, N, pt(1), new THREE.Vector3(0, .02, 0)); sheet(P, N, N, pt(-1), new THREE.Vector3(0, .02, 0)); return finish(P, -.45, .06);   // 下を少し土に沈める
  },
  // 円柱：胴は巻いた面、両はしは平らに切った面。角では凹凸を 0 にして、割れずに丸くつなぐ
  log(N) {
    const n = noise3(41), P = newP(), L = .84, R0 = .2, NS = Math.round(N * 1.5), C = 2 * Math.PI * R0;   // C＝胴まわり。模様の一枚を胴まわり一周に合わせ、長さの向きと木口も同じ細かさで貼る（伸びない）
    const R = (ph, x) => R0 * (1 + n(Math.cos(ph) * .9, Math.sin(ph) * .9, x * 1.4) * .16) * (1 - .06 * sstep(.86, 1, Math.abs(x) * 2 / L) ** 2);
    sheet(P, NS, N, (s, t) => { const ph = s * Math.PI * 2, x = (t - .5) * L, r = R(ph, x); return [x, r * Math.cos(ph), r * Math.sin(ph), s, .5 + (t - .5) * L / C, 1 - sstep(.84, 1, Math.abs(t * 2 - 1))]; }, new THREE.Vector3());
    for (const e of [-1, 1]) sheet(P, NS, Math.round(N * .3), (s, t) => { const ph = s * Math.PI * 2, x = e * L / 2, r = R(ph, x) * t; return [x + e * .014 * (1 - t * t), r * Math.cos(ph), r * Math.sin(ph), .5 + e * r * Math.sin(ph) / C, .5 + r * Math.cos(ph) / C, .4 * (1 - sstep(.72, 1, t))]; }, new THREE.Vector3());   // 切った面は、胴より平らに
    return finish(P, .5);
  },
  // 起伏：地面からなだらかに立ち上がる、手のひらほどの丘。ふちは地面にとけこむ
  rise(N) {
    const n = noise3(7), P = newP(), R = .5, ns = Math.round(N * 1.5), nt = Math.round(N * .75);
    const Hh = (ph, t) => { const x = t * R * Math.cos(ph), z = t * R * Math.sin(ph); return (1 - t * t) ** 1.7 * (.19 + .1 * n(x * 2.2, .3, z * 2.2)); };
    // 真上から貼ると斜面で模様が伸びる。中心から斜面に沿って測った長さ（と、真上から見た長さの中ほど）で貼る
    const Ln = new Float32Array((ns + 1) * (nt + 1));
    for (let i = 0; i <= ns; i++) { const ph = i / ns * Math.PI * 2; let l = 0, h0 = Hh(ph, 0); for (let j = 1; j <= nt; j++) { const h1 = Hh(ph, j / nt); l += Math.hypot(R / nt, h1 - h0); h0 = h1; Ln[j * (ns + 1) + i] = l; } }
    sheet(P, ns, nt, (s, t) => { const i = Math.round(s * ns), j = Math.round(t * nt), ph = s * Math.PI * 2, l = (Ln[j * (ns + 1) + i] + t * R) / 2; return [t * R * Math.cos(ph), Hh(ph, t), t * R * Math.sin(ph), .5 + l * Math.cos(ph), .5 + l * Math.sin(ph), 1 - sstep(.8, 1, t)]; }, new THREE.Vector3(0, -1, 0));
    return finish(P, 0, .012);
  },
  // 輪：太い輪。どこにも模様の集まる所がない
  ring(N) {
    const g = new THREE.TorusGeometry(.27, .118, Math.round(N * .6), Math.round(N * 1.7)); g.rotateX(Math.PI / 2); g.rotateZ(.2); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y - .104, 0);
    return seal(g);
  },
};

let _loader = null;
// 測った形を読み、いちばん大きな部分の形を、0.8 単位（8 cm）に収めて床に置く
export async function loadGeometry(o) {
  if (o.make) return MAKE[o.make](matchMedia("(max-width: 899px)").matches ? 110 : 150);
  if (!o.src) { const g = baseGeometry(o.id); if (o.scale) { g.scale(o.scale, o.scale, o.scale); g.userData.base = g.attributes.position.array.slice(); } return g; }
  if (!_loader) { const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"); _loader = new GLTFLoader(); }
  const gl = await _loader.loadAsync(o.src); gl.scene.updateMatrixWorld(true); let best = null;
  gl.scene.traverse(m => { if (m.isMesh && m.geometry.attributes.uv && (!best || m.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = m; });
  const g = best.geometry.clone(); g.applyMatrix4(best.matrixWorld); for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
  g.computeBoundingBox(); const b = g.boundingBox, s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = (o.size || .62) / Math.max(s.x, s.y, s.z);
  g.translate(-c.x, -b.min.y, -c.z); g.scale(k, k, k); g.translate(0, -.1, 0);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.userData.base = g.attributes.position.array.slice(); g.userData.n0 = g.attributes.normal.array.slice(); return g;
}

export function baseGeometry(id) {
  let g;
  if (id === "stone") {
    g = new THREE.SphereGeometry(.36, 160, 96); g.rotateZ(Math.PI / 2); const n = noise3(11), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + n(v.x * 2, v.y * 2, v.z * 2) * .16; v.multiplyScalar(k); v.y *= .62; v.x *= 1.18; p.setXYZ(i, v.x, v.y, v.z); }
    g.translate(0, .23, 0);
  } else if (id === "branch") {
    const r = rng(5), pts = []; for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector3(-.5 + i / 6, .12 + Math.sin(i * 1.3) * .05 + r() * .03, Math.sin(i * .9) * .12));
    g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, .075, 48, false);
    const p = g.attributes.position, uv = g.attributes.uv, c = new THREE.CatmullRomCurve3(pts), q = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { const t = uv.getX(i); c.getPointAt(t, q); v.fromBufferAttribute(p, i).sub(q).multiplyScalar(1.15 - .55 * t).add(q); p.setXYZ(i, v.x, v.y, v.z); }   // 先へ行くほど細く
  } else if (id === "bowl") {
    const pr = [new THREE.Vector2(.001, 0)]; for (let i = 0; i <= 24; i++) { const t = i / 24; pr.push(new THREE.Vector2(.12 + .3 * Math.sin(t * Math.PI / 2), t * .26)); }
    for (let i = 24; i >= 0; i--) { const t = i / 24; pr.push(new THREE.Vector2(Math.max(.001, .1 + .28 * Math.sin(t * Math.PI / 2) - .02), .025 + t * .235)); }
    g = new THREE.LatheGeometry(pr, 160);
  } else if (id === "tile") {
    g = new THREE.PlaneGeometry(.66, .84, 120, 160); const p = g.attributes.position;   // 幅の向きに弧を描いて反らせる（丸瓦の片割れ）
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), a = x / .3, r = .3 - .015 * (y / .42) ** 2; p.setXYZ(i, Math.sin(a) * r, Math.cos(a) * r - .3 * Math.cos(1.1) + .02, y); }
  } else {   // 貝：扇形に放射の筋のある、ふくらんだ殻
    g = new THREE.SphereGeometry(.42, 160, 96, 0, Math.PI * 2, 0, Math.PI * .5); const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x); v.y *= .45; v.x *= 1 + .04 * Math.sin(a * 22); v.z *= (.9 + .04 * Math.sin(a * 22)) * (v.z > 0 ? 1 : .82); p.setXYZ(i, v.x, v.y, v.z); }
    g.translate(0, .02, 0);
  }
  g.computeVertexNormals(); g.userData.base = g.attributes.position.array.slice(); g.userData.n0 = g.attributes.normal.array.slice();
  return g;
}

// 触覚の地図を形に貼る（凹凸を形の上に押し出す）。hAt(u,v)＝0..1、depth＝単位（10 cm＝1）
export function applyRelief(g, rep, hAt, depth, pole = false) {
  const p = g.attributes.position, uv = g.attributes.uv, B = g.userData.base, N = g.userData.n0, W = g.userData.w;
  for (let i = 0; i < p.count; i++) {
    const u = (((uv.getX(i) * rep[0]) % 1) + 1) % 1, v = (((uv.getY(i) * rep[1]) % 1) + 1) % 1, w = W ? W[i] : pole ? Math.sin(Math.PI * uv.getY(i)) : 1, h = (hAt(u, v) - .5) * depth * w;   // 球の極では凹凸を弱める（一点に集まって見えないように）
    p.setXYZ(i, B[i * 3] + N[i * 3] * h, B[i * 3 + 1] + N[i * 3 + 1] * h, B[i * 3 + 2] + N[i * 3 + 2] * h);
  }
  p.needsUpdate = true; if (!g.userData.keepNormals) { g.computeVertexNormals(); smoothWeld(g); }   /* 部品をまとめた形は、つなぎ目が割れないよう元の法線のまま */ g.computeBoundingSphere(); g.computeBoundingBox();
}

// 二進の STL（mm）。この端末の中でつくるだけで、送信しない
export function geometrySTL(g) {
  const G = g.index ? g.toNonIndexed() : g, P = G.attributes.position, n = P.count / 3, buf = new ArrayBuffer(84 + n * 50), dv = new DataView(buf);
  dv.setUint32(80, n, true); const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let t = 0; t < n; t++) {
    a.fromBufferAttribute(P, t * 3).multiplyScalar(100); b.fromBufferAttribute(P, t * 3 + 1).multiplyScalar(100); c.fromBufferAttribute(P, t * 3 + 2).multiplyScalar(100);
    nn.subVectors(c, b).cross(a.clone().sub(b)).normalize(); let o = 84 + t * 50;
    for (const v of [nn, a, b, c]) { dv.setFloat32(o, v.x, true); dv.setFloat32(o + 4, -v.z, true); dv.setFloat32(o + 8, v.y, true); o += 12; }   // Z を上に
  }
  return buf;
}
