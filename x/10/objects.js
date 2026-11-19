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

// 実物を測った形（Poly Haven・CC0。形だけを使い、質感の画像は使わない＝触れ心地を貼るため）。台帳 M-0900
export const OBJECTS = [
  { id: "boulder", name: "岩", sub: "実物を測った岩", src: "models/boulder_01.gltf", rep: [1, 1] },
  { id: "shell", name: "貝", sub: "実物を測った貝", src: "models/lambis_shell.gltf", rep: [1, 1], tint: [1.6, 1.5, 1.35] },
  { id: "vase", name: "器", sub: "実物を測った花瓶", src: "models/ceramic_vase_01.gltf", rep: [2, 2], size: .55, tint: [1.7, 1.6, 1.45] },
  { id: "pot", name: "鉢", sub: "実物を測った素焼きの鉢", src: "models/planter_pot_clay.gltf", rep: [2, 2], size: .5, tint: [1.15, .78, .55] },
  { id: "branch", name: "枯れ枝", sub: "実物を測った枝", src: "models/dead_quiver_branch_01.gltf", rep: [1, 1] },
  { id: "tile", name: "瓦", sub: "反りのある瓦（模型）", rep: [1.6, 2], scale: .8 },
  // 2026-11-20 本人「形の３dについて、自然だけでなく、生き物も入れてください」＝Qualia/sight の生き物の 3D（mitsulab の造形）の形だけを使う。色と模様は外し、選んだ触れ心地を貼る。大きさは手のひらほどの模型
  { id: "tit", name: "小鳥", sub: "シジュウカラの形（模型）", creature: "makeTit", opt: { state: "perch" }, rep: [2, 2], size: .8 },
  { id: "dog", name: "犬", sub: "犬の形（模型）", creature: "makeDog", rep: [2, 2], size: .74 },
  { id: "mamushi", name: "マムシ", sub: "ニホンマムシの形（模型）", creature: "makeMamushi", rep: [3, 1], size: 1.15, bend: .11 },
];
const SIGHT = location.pathname.includes("/x/") ? "../02/" : "./sight/";
// 生き物の 3D（部品の集まり）を、触れ心地を貼れる一つの形にまとめる。透ける翅・細い毛の束（インスタンス）は外し、体の面だけを使う
async function creatureGeometry(o) {
  const C = await import(SIGHT + "creatures.js?v=20261013k80"), root = C[o.creature](undefined, o.opt || {}); try { if (o.opt) root.userData.animate?.(1.3, false); } catch (e) {}
  root.updateMatrixWorld(true); const P = [], N = [], UV = [], v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  root.traverse(m => { if (!m.isMesh || m.isInstancedMesh || !m.visible) return; const mt = [].concat(m.material)[0]; if (!mt || mt.transparent || mt.opacity < 1 || mt.alphaTest > 0) return;
    let g = m.geometry; if (!g.attributes.uv || !g.attributes.normal) return; if (g.index) g = g.toNonIndexed(); g.computeBoundingSphere(); const sc = m.getWorldScale(v.clone()); if (g.boundingSphere.radius * Math.max(sc.x, sc.y, sc.z) < .012) return;   // 目のつやなど、ごく小さな部品は外す
    const p = g.attributes.position, nn = g.attributes.normal, uv = g.attributes.uv; nm.getNormalMatrix(m.matrixWorld);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); n.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize(); P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); UV.push(uv.getX(i), uv.getY(i)); } });
  root.traverse(m => { if (m.isMesh) { m.geometry.dispose(); [].concat(m.material).forEach(x => x.dispose()); } });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
  g.computeBoundingBox(); const b = g.boundingBox, s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = (o.size || .62) / Math.max(s.x, s.y, s.z);
  g.translate(-c.x, -b.min.y, -c.z); g.scale(k, k, k); g.translate(0, -.1, 0);
  if (o.bend) { const p = g.attributes.position, L = (o.size || 1); for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setX(i, p.getX(i) + o.bend * Math.sin(z / L * Math.PI * 2.6)); } g.computeVertexNormals(); }   // 体をくねらせた姿（まっすぐの棒に見えないように）
  g.rotateY(-.5);
  g.userData.base = g.attributes.position.array.slice(); g.userData.n0 = g.attributes.normal.array.slice(); g.userData.keepNormals = true; return g;
}
let _loader = null;
// 測った形を読み、いちばん大きな部分の形を、0.8 単位（8 cm）に収めて床に置く
export async function loadGeometry(o) {
  if (o.creature) return creatureGeometry(o);
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
  const p = g.attributes.position, uv = g.attributes.uv, B = g.userData.base, N = g.userData.n0;
  for (let i = 0; i < p.count; i++) {
    const u = (uv.getX(i) * rep[0]) % 1, v = (uv.getY(i) * rep[1]) % 1, w = pole ? Math.sin(Math.PI * uv.getY(i)) : 1, h = (hAt(u, v) - .5) * depth * w;   // 球の極では凹凸を弱める（一点に集まって見えないように）
    p.setXYZ(i, B[i * 3] + N[i * 3] * h, B[i * 3 + 1] + N[i * 3 + 1] * h, B[i * 3 + 2] + N[i * 3 + 2] * h);
  }
  p.needsUpdate = true; if (!g.userData.keepNormals) g.computeVertexNormals();   /* 部品をまとめた形は、つなぎ目が割れないよう元の法線のまま */ g.computeBoundingSphere(); g.computeBoundingBox();
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
