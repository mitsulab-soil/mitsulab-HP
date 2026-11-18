/* Qualia/sight（x/02 forest.js）のケヤキ・コナラと同じ作り方の木（幹・枝＝先細りの管、葉＝枝先の房の板）。
   3 本の見本を作り、engine の植生（InstancedMesh）でならべる。形の数値は sight の SP と同じ */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const V3 = THREE.Vector3, TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t;
const SP = {
  konara: { trunkH: [4.5, 6.5], r: [.2, .34], limbs: [3, 4], spread: .85, len: [3.6, 5.2], fork: 2, sub: .7, up: .18, decay: .62, wig: .45, cards: 260, cluster: 1.7, card: 1.05 },
  keyaki: { trunkH: [2.6, 3.8], r: [.26, .4], limbs: [5, 7], spread: .42, len: [5, 7], fork: 2, sub: .5, up: .32, decay: .6, wig: .25, cards: 280, cluster: 1.6, card: .9 } };
function taperTube(pts, r0, r1, radial, seg) {
  const c = new THREE.CatmullRomCurve3(pts); c.arcLengthDivisions = seg * 6;
  const g = new THREE.TubeGeometry(c, seg, 1, radial, false), p = g.attributes.position, uv = g.attributes.uv, q = new V3(), v = new V3(), L = c.getLength(), circ = TAU * (r0 + r1) / 2, PT = new Map();
  for (let i = 0; i < p.count; i++) { const t = uv.getX(i); let qq = PT.get(t); if (!qq) { qq = c.getPointAt(t, new V3()); PT.set(t, qq); } q.copy(qq); v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(q).multiplyScalar(lerp(r0, r1, t)); p.setXYZ(i, q.x + v.x, q.y + v.y, q.z + v.z); uv.setXY(i, uv.getY(i), t * L / Math.max(circ, .05) * .5); }
  g.computeVertexNormals(); return g;
}
const clean = g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k); return g; };
export function sightTrees(barkMat, leafMap, seed = 7) {
  let s = seed; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647), rr = (a, b) => a + R() * (b - a);
  const leafMat = new THREE.MeshStandardMaterial({ map: leafMap, alphaTest: .45, side: THREE.DoubleSide, roughness: .78, name: "leaf" });
  const root = new THREE.Group();
  for (const kind of ["keyaki", "konara", "keyaki"]) {
    const sp = SP[kind], geos = [], tips = [], mids = [], base = new V3(0, 0, 0);
    const limb = (from, dir, len, r0, depth) => { const pts = [from.clone()]; let p = from.clone(); const d = dir.clone(); for (let i = 1; i <= 4; i++) { d.add(new V3((R() - .5) * sp.wig, .04, (R() - .5) * sp.wig)).normalize(); p = p.clone().addScaledVector(d, len / 4); pts.push(p); }
      const r1 = r0 * .55; geos.push(taperTube(pts, r0, r1, 6, 6)); if (depth > 0) { mids.push(p.clone()); for (let j = 0; j < sp.fork; j++) { const a = j / sp.fork * TAU + R() * 2.2; limb(pts[4 - (j % 2)], new V3(d.x + Math.cos(a) * sp.sub, d.y + sp.up, d.z + Math.sin(a) * sp.sub).normalize(), len * sp.decay, r1, depth - 1); } } else tips.push(p); };
    const tH = rr(...sp.trunkH), r0 = rr(...sp.r), lean = new V3(rr(-.12, .12), 1, rr(-.12, .12)).normalize(), top = base.clone().addScaledVector(lean, tH);
    geos.push(taperTube([base, base.clone().lerp(top, .5).add(new V3(rr(-.1, .1), 0, rr(-.1, .1))), top], r0, r0 * .78, 10, 6));
    { const g = new THREE.CylinderGeometry(r0, r0 * 1.45, .45, 10, 1, true); g.translate(0, .2, 0); geos.push(g); }   // 根張り
    const nL = Math.round(rr(...sp.limbs)), a0 = R() * TAU;
    for (let k = 0; k < nL; k++) { const a = a0 + k / nL * TAU + rr(-.3, .3); limb(top.clone().add(new V3(0, -rr(0, .5), 0)), new V3(Math.cos(a) * sp.spread, 1, Math.sin(a) * sp.spread).normalize(), rr(...sp.len), r0 * .62, 1); }
    const ctr = tips.reduce((a, t) => a.add(t), new V3()).multiplyScalar(1 / tips.length); ctr.y -= 1;
    const anchors = [...tips, ...tips, ...mids], cards = [], yA = new V3(), xA = new V3(), zA = new V3(), rv = new V3(), m4 = new THREE.Matrix4();
    for (let i = 0; i < sp.cards; i++) { const t = anchors[i % anchors.length], rd = sp.cluster * (.25 + Math.pow(R(), .6) * .75), pos = t.clone().add(new V3(R() - .5, (R() - .5) * .9, R() - .5).normalize().multiplyScalar(rd)), o = pos.clone().sub(ctr).normalize(), sc = .8 + R() * .4;
      yA.copy(o).add(new V3((R() - .5) * 1.3, .3 + R() * .5, (R() - .5) * 1.3)).normalize(); rv.set(R() - .5, R() - .5, R() - .5); xA.crossVectors(yA, rv).normalize(); zA.crossVectors(xA, yA);
      const g = new THREE.PlaneGeometry(sp.card, sp.card); g.translate(0, sp.card / 2, 0); m4.makeBasis(xA.multiplyScalar(sc), yA.multiplyScalar(sc), zA.multiplyScalar(sc)).setPosition(pos); g.applyMatrix4(m4); cards.push(g); }
    const v = new THREE.Group(); v.add(new THREE.Mesh(mergeGeometries(geos.map(clean)), barkMat), new THREE.Mesh(mergeGeometries(cards.map(clean)), leafMat)); root.add(v);
  }
  root.updateMatrixWorld(true); return root;
}
