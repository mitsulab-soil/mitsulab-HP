/* mitsulab 共通の部品（vegetation.js）。© 2026 mitsulab. All rights reserved. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2, V3 = THREE.Vector3;
const lerp = (a, b, t) => a + (b - a) * t;
export function rng(seed = 20261012) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 風の時計（全部の材質で一つ）。アプリは毎こま kit の tick(t) か、ここの uTime.value を進める
export const WIND = { uTime: { value: 0 }, uGust: { value: 1 } };

// 材質に風と樹冠の陰をつける（MeshStandardMaterial 用）
export function natureMaterial(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: o.color ?? 0xffffff, map: o.map || null, normalMap: o.normalMap || null, roughness: o.roughness ?? .9, metalness: 0,
    alphaTest: o.alphaTest ?? 0, side: o.side ?? THREE.FrontSide, vertexColors: !!o.vertexColors });
  const wind = o.wind ?? 0, windH = o.windH ?? 8, crown = !!o.crown;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, WIND, { uWind: { value: wind }, uWindH: { value: windH } });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
uniform float uTime, uGust, uWind, uWindH; varying vec3 vWP;${crown ? "\nattribute vec3 aCtr; varying vec3 vCtr;" : ""}`)
      .replace("#include <project_vertex>", `vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
mvPosition = instanceMatrix * mvPosition;
#endif
vec4 wq_ = modelMatrix * mvPosition;
float ph_ = dot(wq_.xz, vec2(.37, .61));
float sw_ = uWind * uGust * clamp(wq_.y / uWindH, 0.0, 1.0) * (.65 + .35 * sin(uTime * .23 + wq_.x * .05));
wq_.x += sw_ * (sin(uTime * 1.1 + ph_) * .6 + sin(uTime * 2.7 + ph_ * 1.7) * .22);
wq_.z += sw_ * cos(uTime * .9 + ph_ * 1.3) * .45;
vWP = wq_.xyz;${crown ? "\nvCtr = aCtr;" : ""}
mvPosition = viewMatrix * wq_;
gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;" + (crown ? "\nvarying vec3 vCtr;" : ""));
    if (crown) sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ vec3 cn_ = normalize((viewMatrix * vec4(normalize(vWP - vCtr + vec3(0.0, .25, 0.0)), 0.0)).xyz); normal = normalize(mix(normal, cn_, .72)); }`);
  };
  m.customProgramCacheKey = () => "mlnat" + (wind ? "w" : "") + (crown ? "c" : "");
  return m;
}

// 先細りの管（幹・枝）。樹皮の縦の筋が幹に沿うように UV を取る
export function taperTube(pts, r0, r1, radial = 6, seg = 4) {
  const c = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(c, seg, 1, radial, false), p = g.attributes.position, uv = g.attributes.uv, q = new V3(), v = new V3();
  const L = c.getLength(), circ = TAU * (r0 + r1) / 2;
  for (let i = 0; i < p.count; i++) { const t = uv.getX(i); c.getPointAt(t, q); v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(q).multiplyScalar(lerp(r0, r1, t)); p.setXYZ(i, q.x + v.x, q.y + v.y, q.z + v.z); uv.setXY(i, uv.getY(i), t * L / Math.max(circ, .05) * .5); }
  g.computeVertexNormals(); return g;
}
const strip = g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k); return g; };

// 樹種の形（胡蝶の夢の値）
export const SPECIES = {
  konara: { trunkH: [4.5, 6.5], r: [.2, .34], limbs: [3, 4], spread: .85, len: [3.6, 5.2], fork: 2, sub: .7, up: .18, decay: .62, wig: .45, cards: 260, cluster: 1.7, card: 1.05, tint: [.82, .9, .72] },
  keyaki: { trunkH: [2.6, 3.8], r: [.26, .4], limbs: [5, 7], spread: .42, len: [5, 7], fork: 2, sub: .5, up: .32, decay: .6, wig: .25, cards: 280, cluster: 1.6, card: .9, tint: [.86, .93, .78] },
  momiji: { trunkH: [1.1, 1.9], r: [.07, .12], limbs: [4, 5], spread: 1.5, len: [1.8, 2.8], fork: 2, sub: .9, up: .06, decay: .6, wig: .3, cards: 130, cluster: 1.05, card: .58, flat: .45, tint: [.95, 1, .9] },
};

// 一本の木の骨と葉の位置を作る（描かない）。det＝近くの木（枝を一段多く・面を細かく）
export function growTree(kind, x, z, R, { det = true, scale = 1, q = 1 } = {}) {
  const sp = SPECIES[kind], rr = (a, b) => a + (b - a) * R(), geos = [], tips = [], mids = [], base = new V3(x, 0, z);
  const limb = (from, dir, len, r0, depth) => {
    const pts = [from.clone()]; let p = from.clone(); const d = dir.clone(), n = det ? 4 : 3;
    for (let i = 1; i <= n; i++) { d.add(new V3((R() - .5) * sp.wig, .04, (R() - .5) * sp.wig)).normalize(); p = p.clone().addScaledVector(d, len / n); pts.push(p); }
    const r1 = r0 * .55; geos.push(taperTube(pts, r0, r1, det ? 6 : 4, det ? 6 : 3));
    if (depth > 0) { mids.push(p.clone()); for (let j = 0; j < sp.fork; j++) { const a = j / sp.fork * TAU + R() * 2.2; limb(pts[n - (j % 2)], new V3(d.x + Math.cos(a) * sp.sub, d.y + sp.up, d.z + Math.sin(a) * sp.sub).normalize(), len * sp.decay, r1, depth - 1); } }
    else tips.push(p);
  };
  const tH = rr(...sp.trunkH) * scale, r0 = rr(...sp.r) * scale, lean = new V3(rr(-.12, .12), 1, rr(-.12, .12)).normalize(), top = base.clone().addScaledVector(lean, tH);
  geos.push(taperTube([base, base.clone().lerp(top, .5).add(new V3(rr(-.1, .1), 0, rr(-.1, .1))), top], r0, r0 * .78, det ? 10 : 6, det ? 6 : 3));
  if (det) { const fl = new THREE.CylinderGeometry(r0, r0 * 1.45, .45, 10, 1, true); fl.translate(x, .2, z); geos.push(fl); }   // 根張り
  const nL = Math.round(rr(...sp.limbs)), a0 = R() * TAU;
  for (let k = 0; k < nL; k++) { const a = a0 + k / nL * TAU + rr(-.3, .3); limb(top.clone().add(new V3(0, -rr(0, .5), 0)), new V3(Math.cos(a) * sp.spread, 1, Math.sin(a) * sp.spread).normalize(), rr(...sp.len) * scale, r0 * .62, det ? 1 : 0); }
  const ctr = tips.reduce((s, t) => s.add(t), new V3()).multiplyScalar(1 / tips.length); ctr.y -= 1;
  const n = Math.round(sp.cards * (det ? 1 : .42) * q * scale), ys = tips.map(t => t.y), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const anchors = mids.length ? [...tips, ...tips, ...mids] : tips, cards = [];
  for (let i = 0; i < n; i++) { const t = anchors[i % anchors.length], rd = sp.cluster * (det ? 1 : 1.35) * scale * (.25 + Math.pow(R(), .6) * .75);
    const pos = t.clone().add(new V3(R() - .5, (R() - .5) * (sp.flat ? .5 : .9), R() - .5).normalize().multiplyScalar(rd));
    cards.push([pos, pos.clone().sub(ctr).normalize(), ctr.clone(), (det ? 1 : 1.45) * scale * (.8 + R() * .4), Math.min(1, Math.max(0, (pos.y - ymin) / Math.max(1, ymax - ymin)))]); }
  return { kind, wood: geos.map(strip), cards, trunk: [x, z, r0 + .08] };
}

// 木を場面に植える：幹は樹種ごとに一つの形、葉は樹種ごとに一つの InstancedMesh
export function plantTrees(parent, trees, { barkMat, leafMats, R = rng(), shadows = false }) {
  const byKind = {}, out = { meshes: [] };
  for (const t of trees) (byKind[t.kind] ||= []).push(t);
  const xA = new V3(), yA = new V3(), zA = new V3(), rv = new V3(), m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (const [kind, list] of Object.entries(byKind)) {
    const wood = new THREE.Mesh(mergeGeometries(list.flatMap(t => t.wood)), barkMat[kind] || barkMat.default); wood.castShadow = shadows; parent.add(wood); out.meshes.push(wood);
    const cards = list.flatMap(t => t.cards); if (!cards.length) continue;
    const sp = SPECIES[kind], L = sp.card, geo = new THREE.PlaneGeometry(L, L); geo.translate(0, L / 2, 0);
    const im = new THREE.InstancedMesh(geo, leafMats[kind] || leafMats.default, cards.length), ctrA = new Float32Array(cards.length * 3);
    cards.forEach(([pos, o, c, s, h], i) => {
      yA.copy(o).add(new V3((R() - .5) * 1.3, .3 + R() * .5, (R() - .5) * 1.3)).normalize(); rv.set(R() - .5, R() - .5, R() - .5);
      xA.crossVectors(yA, rv).normalize(); zA.crossVectors(xA, yA);
      m4.makeBasis(xA.multiplyScalar(s), yA.multiplyScalar(s), zA.multiplyScalar(s)); m4.setPosition(pos); im.setMatrixAt(i, m4);
      const l = .62 + .3 * h + R() * .18; im.setColorAt(i, col.setRGB(l * sp.tint[0], l * sp.tint[1], l * sp.tint[2])); ctrA.set([c.x, c.y, c.z], i * 3);   // 上の葉ほど明るい（空の光）
    });
    geo.setAttribute("aCtr", new THREE.InstancedBufferAttribute(ctrA, 3)); im.castShadow = shadows; im.computeBoundingSphere(); parent.add(im); out.meshes.push(im);
  }
  return out;
}

// 葉の材質（写真の葉の板。アルファで切り抜く）
export const leafMaterial = (map, o = {}) => natureMaterial({ map, alphaTest: .45, side: THREE.DoubleSide, roughness: o.roughness ?? .6, wind: o.wind ?? .05, windH: o.windH ?? 9, crown: true });
export const barkMaterial = (map, o = {}) => natureMaterial({ map, normalMap: o.normalMap, color: o.color ?? 0xd8d2c8, roughness: 1 });

// ポアソン円板：最小距離 d を守って n 回まで試す。ok(x,z) で置けない所を外す
export function poisson(R, { x0, x1, z0, z1, d, tries = 4000, ok = () => true }) {
  const pts = [], cs = d, cell = new Map(), key = (x, z) => Math.floor(x / cs) + "," + Math.floor(z / cs);
  for (let i = 0; i < tries; i++) {
    const x = lerp(x0, x1, R()), z = lerp(z0, z1, R()); if (!ok(x, z)) continue;
    let far = true; const cx = Math.floor(x / cs), cz = Math.floor(z / cs);
    for (let a = -1; a <= 1 && far; a++) for (let b = -1; b <= 1 && far; b++) for (const p of cell.get((cx + a) + "," + (cz + b)) || []) if (Math.hypot(p[0] - x, p[1] - z) < d) { far = false; break; }
    if (!far) continue; pts.push([x, z]); const k = key(x, z); (cell.get(k) || cell.set(k, []).get(k)).push([x, z]);
  }
  return pts;
}

// 草：一枚ずつ反った細い葉。根元は暗く先は明るい（頂点の色）。群れで置く
export function grassField(parent, R, { count = 6000, area = 20, ok = () => true, center = [0, 0], spread = null, color = [0x2f3d22, 0x8a9b5a] } = {}) {
  const parts = [], c0 = new THREE.Color(color[0]), c1 = new THREE.Color(color[1]);
  for (let b = 0; b < 3; b++) {   // 一株＝三枚
    const g = new THREE.PlaneGeometry(.028, .34, 1, 4), p = g.attributes.position, cs = [], a = b / 3 * TAU + .4, bend = .12 + b * .05;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + .17, t = y / .34; p.setXYZ(i, p.getX(i) * (1 - t * .85), y, bend * t * t); const c = c0.clone().lerp(c1, t); cs.push(c.r, c.g, c.b); }
    g.rotateY(a); g.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3)); parts.push(g);
  }
  const geo = mergeGeometries(parts.map(g => { g = g.toNonIndexed(); g.deleteAttribute("uv"); return g; }));
  const mat = natureMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .85, wind: .09, windH: .6 });
  const list = []; for (let i = 0; i < count * 3 && list.length < count; i++) {
    const x = spread ? center[0] + gaussR(R) * spread : center[0] + (R() - .5) * area, z = spread ? center[1] + gaussR(R) * spread : center[1] + (R() - .5) * area;
    if (ok(x, z)) list.push([x, z]);
  }
  const im = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3(), col = new THREE.Color();
  list.forEach(([x, z], i) => { const k = .55 + R() * .6; q.setFromAxisAngle(new V3(0, 1, 0), R() * TAU); s.set(k, k * (.7 + R() * .6), k); m4.compose(new V3(x, 0, z), q, s); im.setMatrixAt(i, m4); const l = .8 + R() * .35; im.setColorAt(i, col.setRGB(l, l * (.95 + R() * .1), l * .9)); });
  im.computeBoundingSphere(); parent.add(im); return im;
}
const gaussR = R => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

// 地面：土の写真に、苔・湿り・踏み跡を頂点の色でまだらに重ねる
export function groundPlane(parent, { size = 80, seg = 96, map = null, tint = (x, z) => [.78, .72, .64], height = () => 0 } = {}) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cs = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, height(x, z)); cs.push(...tint(x, z)); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3)); g.computeVertexNormals();
  if (map) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(size / 2.5, size / 2.5); }
  const m = new THREE.Mesh(g, natureMaterial({ map, vertexColors: true, roughness: 1 })); m.receiveShadow = true; parent.add(m); return m;
}
