/* © mitsulab. Qualia/sight と同じ森の空間（2026-11-20 本人「sight と同じ空間で実装してください」）
   木＝sight と同じ作り方のケヤキ・コナラ（共通エンジンの sighttree.js）、地面＝sight の森の土の写真、霞と空＝共通部品 sight_land.js。
   部品と写真は sight のものをそのまま読む（公開版は ../02/ と ../hub/engine/、手元は sight/ の写し）。
   森はメートルで作り、10 倍にして置く（この道具は 10 cm＝1）。面や形は、森の地面に置かれた手のひらほどの物として見える。 */
import * as THREE from "three";
import { installSkyFog, treeVariety, landTint, groundMottle, hash1 } from "./sight_land.js";

const PUB = location.pathname.includes("/x/");
export const SIGHT = PUB ? "../02/" : "sight/";
const TREE_URL = PUB ? "../../hub/engine/sighttree.js" : "../sight/sighttree.js";
export const SKY = 0xc8d4dc, SUN = new THREE.Vector3(8, 14, 6).normalize();
installSkyFog(THREE, { sun: SUN });   // どの材質を組むより前に

export async function buildSightSpace({ scene, mobile, y = -.106 }) {
  const G = new THREE.Group(); G.scale.setScalar(10); G.position.y = y; G.name = "sightSpace";
  const tl = new THREE.TextureLoader(), load = f => tl.loadAsync(SIGHT + "tex/" + f).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; });
  const [soil, bark, leaf, mod] = await Promise.all([load("soil_forest.webp"), load("bark_zelkova.webp"), load("leaf_spray.webp"), import(TREE_URL)]);
  // 地面（森の土。2 m で一枚）と、土・苔・枯れ草のむら
  soil.repeat.set(420, 420);   // 手のひらの物に寄って見るので、細かく並べる（遠くのくり返しは、むらと霞で消える）
  const gm = new THREE.MeshStandardMaterial({ map: soil, roughness: 1, metalness: 0, envMapIntensity: .25 }); groundMottle(gm, { relief: !mobile });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(110, 40).rotateX(-Math.PI / 2), gm); G.add(ground);
  // 空：霞の色の大きな球（見る向きで、地平は明るく・上は青く）
  const sky = new THREE.Mesh(new THREE.SphereGeometry(105, 24, 12), new THREE.MeshBasicMaterial({ color: SKY, side: THREE.BackSide, fog: true, depthWrite: false })); sky.renderOrder = -2; G.add(sky);
  // 木：sight と同じ三本の見本を、森に散らして並べる（面のまわり 3 m は空ける。手前〔カメラの側〕は少なめに）
  bark.repeat.set(1, 3); leaf.wrapS = leaf.wrapT = THREE.ClampToEdgeWrapping;
  const barkMat = new THREE.MeshStandardMaterial({ color: 0xd8cfc4, roughness: 1, map: bark, envMapIntensity: .3 });
  const protos = mod.sightTrees(barkMat, leaf, 7).children, N = mobile ? 34 : 54, pts = [];
  for (let i = 0, k = 0; pts.length < N && k < 4000; k++) { const a = hash1(k * 3.1) * Math.PI * 2, r = 3.2 + Math.pow(hash1(k * 7.7 + 1), .8) * 42, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > 1.5 && Math.abs(x) < 2.4 + z * .28) continue;   // 見る人の立つ側は空ける
    if (pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 3.4)) continue; pts.push([x, z, k]); }
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
  protos.forEach((pr, pi) => { const list = pts.filter((_, i) => i % protos.length === pi);
    for (const m of pr.children) { landTint(m.material, { amt: .1 }); const im = new THREE.InstancedMesh(m.geometry, m.material, list.length);
      list.forEach(([x, z, k], i) => { treeVariety(THREE, m4, v.set(x, 0, z), hash1(k + .5) * 6.283, .8 + hash1(k + 9.1) * .5, k); im.setMatrixAt(i, m4); }); im.frustumCulled = false; G.add(im); } });
  // 下草：細い葉の束（面のまわり 60 cm は空ける＝落ち葉と土の地面）。色は sight の草の緑の幅
  { const blade = new THREE.PlaneGeometry(.014, 1, 1, 3); blade.translate(0, .5, 0); { const p = blade.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i); p.setX(i, p.getX(i) * (1 - t * .85)); p.setZ(i, t * t * .3); } } blade.computeVertexNormals();
    const n = mobile ? 1400 : 2800, im = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, side: THREE.DoubleSide, envMapIntensity: .2 }), n), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const cl = Math.floor(i / 7), ca = hash1(cl * 5.3) * 6.283, cr = 1.1 + Math.pow(hash1(cl * 2.9 + 4), 1.25) * 12, a = hash1(i * 1.7) * 6.283, r = hash1(i * 4.1) * .07, h = .08 + hash1(i * 9.7) * .16;
      e.set((hash1(i * 3.3) - .5) * .5, hash1(i * 6.1) * 6.283, (hash1(i * 8.3) - .5) * .5); q.setFromEuler(e); m4.compose(v.set(Math.cos(ca) * cr + Math.cos(a) * r, 0, Math.sin(ca) * cr + Math.sin(a) * r), q, s.set(1, h, 1)); im.setMatrixAt(i, m4);
      c.setHSL(.23 + hash1(i * 2.3) * .07, .34 + hash1(i * 5.9) * .16, .13 + hash1(i * 7.3) * .1); im.setColorAt(i, c); }
    im.frustumCulled = false; G.add(im); }
  scene.add(G); return G;
}
