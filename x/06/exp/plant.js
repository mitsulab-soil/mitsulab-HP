/* 木と根を組み立てる道具（2026-10-09 本人「木のデザインや根っこのデザインなど、細部の造り込みにこだわって」）。
   形の決まり（典拠）：
   - 枝分かれ：一本の枝が二本に分かれ、先へ行くほど細く短くなる。分かれる前後で断面積の和がほぼ保たれる
     （レオナルド・ダ・ヴィンチの規則。Eloy 2011, Physical Review Letters 107: 258101）→ 子の太さ＝親の太さ／√2。
   - 葉：小枝の先に、左右に互い違いに付く（互生。ケヤキ・クヌギ・コナラなど関東の雑木林の多くの木）。
   - 樹皮：Poly Haven の CC0 の写真の質感（japanese_camphor_bark）。割れ目は写真の法線から。
   - 根：主根と側根が分かれながら細くなり、下へ伸びる。細根の先のすぐ後ろ（伸びる先端そのものではない）に根毛が生える（根毛帯）。
     菌根の糸（菌糸）は根毛よりさらに細く、根の外へ広がる（Smith & Read 2008）。太さは見やすく強めている。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { tex, canvasTex } from "./util.js";

function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function seg(a, b, r0, r1, sides = 7) {
  const d = b.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, sides, 1, true);
  g.translate(0, L / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.applyQuaternion(q); g.translate(a.x, a.y, a.z); return g;
}
let _leafTex = null;
function leafTex() {
  if (_leafTex) return _leafTex;
  _leafTex = canvasTex(128, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    // 卵形の葉（先がとがる）と縁のぎざぎざ（鋸歯）・主脈と側脈
    c.beginPath(); c.moveTo(w / 2, h * .98);
    for (let i = 0; i <= 40; i++) { const t = i / 40, y = h * (.96 - .92 * t), half = Math.sin(Math.PI * Math.pow(t, .8)) * w * .44 * (1 - .15 * t), saw = (i % 2 ? 1 : .9); c.lineTo(w / 2 + half * saw, y); }
    for (let i = 40; i >= 0; i--) { const t = i / 40, y = h * (.96 - .92 * t), half = Math.sin(Math.PI * Math.pow(t, .8)) * w * .44 * (1 - .15 * t), saw = (i % 2 ? 1 : .9); c.lineTo(w / 2 - half * saw, y); }
    c.closePath(); const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#6fa04a"); gr.addColorStop(1, "#3f6e2e"); c.fillStyle = gr; c.fill();
    c.strokeStyle = "rgba(220,235,180,.55)"; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2, h * .97); c.lineTo(w / 2, h * .06); c.stroke();
    c.lineWidth = 1; for (let k = 1; k < 9; k++) { const y = h * (.9 - k * .095); c.beginPath(); c.moveTo(w / 2, y); c.lineTo(w / 2 + w * .3, y - h * .06); c.moveTo(w / 2, y); c.lineTo(w / 2 - w * .3, y - h * .06); c.stroke(); }
  });
  return _leafTex;
}

// 木：高さ h（m）。返すのは Group（幹と枝＝一つの形、葉＝InstancedMesh）
export function makeTree({ h = .5, r = .018, depth = 5, seed = 7, leaves = true, leafSize = .035 } = {}) {
  const R = rng(seed), geos = [], tips = [];
  function branch(p, dir, len, rad, d) {
    const q = p.clone().addScaledVector(dir, len);
    geos.push(seg(p, q, rad, rad * .78, d < 2 ? 9 : 6));
    if (d >= depth || rad < .0012) { tips.push({ p: q, dir, len }); return; }
    // 二股に分かれる：断面積の和を保つ（太さ×1/√2）。開く角は 20〜40°、片方はやや主軸寄り
    const axis = new THREE.Vector3(R() - .5, 0, R() - .5).normalize(), tw = R() * Math.PI * 2;
    for (const [s, a] of [[1, .35 + R() * .3], [-1, .3 + R() * .35]]) {
      const nd = dir.clone().applyAxisAngle(axis.clone().applyAxisAngle(dir, tw), s * a).lerp(new THREE.Vector3(0, 1, 0), .12).normalize();
      branch(q, nd, len * (.7 + R() * .12), rad * .78 / Math.SQRT2, d + 1);
    }
  }
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), h * .38, r, 0);
  const g = new THREE.Group();
  const wood = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map: tex("bark_diff", 1, 3), normalMap: tex("bark_nor", 1, 3, false), roughness: .95, color: 0x9a8a7a }));
  g.add(wood);
  if (leaves) {
    const geo = new THREE.PlaneGeometry(leafSize * .5, leafSize); geo.translate(0, leafSize / 2, 0);
    const per = 6, im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: leafTex(), transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .7 }), tips.length * per);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1); let k = 0;
    for (const t of tips) for (let i = 0; i < per; i++) {
      // 小枝に沿って、左右に互い違い（互生）
      const p = t.p.clone().addScaledVector(t.dir, -t.len * (i / per) * .8), side = i % 2 ? 1 : -1;
      E.set((R() - .5) * .6, Math.atan2(t.dir.x, t.dir.z) + side * 1.2, side * (.9 + R() * .4)); Q.setFromEuler(E);
      const s = .75 + R() * .5; S.set(s, s, s); M.compose(p, Q, S); im.setMatrixAt(k++, M);
      const c = new THREE.Color().setHSL(.25 + R() * .05, .45, .28 + R() * .12); im.setColorAt(k - 1, c);
    }
    im.count = k; g.add(im);
  }
  return g;
}

// 根：地表（y=0）から下へ。返すのは Group（根＝一つの形、根毛＝線、菌糸＝線）
export function makeRoots({ depth = .35, r = .012, seed = 3, spread = .25, hairs = true, hyphae = false, order = 4 } = {}) {
  const R = rng(seed), geos = [], tips = [], byOrd = [];
  function root(p, dir, len, rad, d) {
    let cur = p.clone(), dd = dir.clone(); const n = 5;
    for (let i = 0; i < n; i++) {
      const nd = dd.clone().add(new THREE.Vector3((R() - .5) * .35, -.18, (R() - .5) * .35)).normalize();   // 重力の向きへ少しずつ（重力屈性）
      const q = cur.clone().addScaledVector(nd, len / n); if (Math.abs(q.x) > spread || Math.abs(q.z) > spread * .6 || q.y < -depth) break;
      const r0 = rad * (1 - i / n * .45), r1 = rad * (1 - (i + 1) / n * .45);
      (byOrd[Math.min(d, 3)] ||= []).push(seg(cur, q, r0, r1, d < 1 ? 7 : 5)); cur = q; dd = nd;
      if (d < order && R() < .55) { const side = new THREE.Vector3(R() - .5, -.15, R() - .5).normalize(); root(cur, side.lerp(dd, .2).normalize(), len * (.55 + R() * .2), r1 * .55, d + 1); }
    }
    tips.push({ p: cur, dir: dd, rad });
  }
  root(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0), depth * .8, r, 0);
  for (let k = 0; k < 4; k++) root(new THREE.Vector3(0, -.01, 0), new THREE.Vector3(Math.cos(k * 1.6), -.4, Math.sin(k * 1.6)).normalize(), depth * .55, r * .6, 1);
  const g = new THREE.Group();
  // 古く太い根は表皮がコルク化して茶色く、若く細い根ほど白っぽく半透明（教科書の水準）。分かれた順（次数）で色を変える
  const RC = [0x7a5a3e, 0xa5825c, 0xd2b994, 0xece0c6];
  byOrd.forEach((a, d) => { if (a && a.length) g.add(new THREE.Mesh(mergeGeometries(a), new THREE.MeshStandardMaterial({ color: RC[d], roughness: d < 2 ? .9 : .6 }))); });
  if (hairs) {   // 根毛：先端のすぐ後ろ（2〜8 mm 相当の区間）に、根から直角に出る細い毛
    const pts = [];
    for (const t of tips) for (let i = 0; i < (t.rad < .002 ? 7 : 0); i++) {   // 根毛は細い根（若い根）の先にだけ
      const back = .004 + R() * .014, base = t.p.clone().addScaledVector(t.dir, -back), perp = new THREE.Vector3(R() - .5, R() - .5, R() - .5).cross(t.dir).normalize();
      pts.push(base.x, base.y, base.z); const e = base.clone().addScaledVector(perp, .004 + R() * .006); pts.push(e.x, e.y, e.z);
    }
    const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: 0xf4efe2, transparent: true, opacity: .4 })));
  }
  if (hyphae) {   // 菌根の糸：根の先から外へ、根毛より細く長く
    const pts = [];
    for (const t of tips) for (let h = 0; h < (t.rad < .002 ? 2 : 0); h++) { let p = t.p.clone(), d = new THREE.Vector3(R() - .5, R() - .5, R() - .5).normalize(); for (let s = 0; s < 8; s++) { const q = p.clone().addScaledVector(d, .008); pts.push(p.x, p.y, p.z, q.x, q.y, q.z); p = q; d.add(new THREE.Vector3(R() - .5, R() - .5, R() - .5).multiplyScalar(.6)).normalize(); } }
    const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: 0xf2ead2, transparent: true, opacity: .25 })));
  }
  return g;
}
