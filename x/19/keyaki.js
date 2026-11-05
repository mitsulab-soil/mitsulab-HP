/* ひとつの木 専用のケヤキ（共通部品の growTree は使わない・kit は読むだけ）。2026-11-05 第 18 版で一から作り直した。
   樹形：太い幹が低い所（約 2.6 m）で 8 本ほどの太枝に分かれ、急な角度で上へ伸びながら外へ開く＝箒を立てたような扇形。
         枝先ほど水平に広がり、樹冠の上はなだらかな丸い傘になる。
   幹：根張りから分かれ目までを一枚の面で作る（別の管や輪を足さない＝根元の継ぎ目が出ない）。根張りは幹の断面のうねり。
   葉：一枚ずつの葉が 9 枚互生した小枝の画（LeafSet014・CC0 を _dev/leaf_prep.py で組んだ）を、細い枝の先の外側に重ねて量感を出す。
       樹冠の内側ほど暗く（外から届く光が少ない）、下ほど暗い。内側には暗い房を少し入れて、空が抜けて見えないように。 */
import * as THREE from "three";
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// 幹：根張り（断面のうねり）→ 円い幹 → 分かれ目のふくらみ → 上を閉じる。一枚の面
function trunkGeo(r0, hf, det, R) {
  const NA = det ? 32 : 10, NY = det ? 26 : 8, y0 = -.6, y1 = hf + 1.3, pos = [], uv = [], idx = [], ph = R() * TAU, lean = new V3((R() - .5) * .12, 0, (R() - .5) * .12);
  const lobes = Array.from({ length: 7 }, (_, k) => [k / 7 * TAU + (R() - .5) * .5, .7 + R() * .6]);
  for (let j = 0; j <= NY; j++) {
    const t = j / NY, y = y0 + (y1 - y0) * t, yy = Math.max(0, y);
    for (let i = 0; i <= NA; i++) {
      const a = i / NA * TAU;
      let lob = 0; for (const [la, lk] of lobes) { const d = Math.atan2(Math.sin(a - la), Math.cos(a - la)); lob += lk * Math.exp(-d * d / .09); }
      let r = r0 * (1 + .85 * Math.exp(-yy / .5)) * (1 + .75 * lob * Math.exp(-yy / .55));   // 根張り
      r *= 1 + .2 * ss(hf - 1.4, hf - .2, y);                                                  // 分かれ目のふくらみ
      r *= 1 - .8 * ss(hf - .9, y1, y);                                                        // 上はなだらかに細り、太枝の中へ消える（段を作らない）
      r *= 1 + .03 * Math.sin(a * 3 + y * 2.1 + ph) + .02 * Math.sin(a * 7 - y * 3.3);        // 樹皮の凹凸
      const c = lean.clone().multiplyScalar(y);
      pos.push(c.x + Math.cos(a) * r, y, c.z + Math.sin(a) * r);
      uv.push(i / NA * 2, (y - y0) / (TAU * r0) * 1.1);
    }
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + NA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}

/* o: { r, hf, limbs, len, tilt, levels, forks, decay, sprigs, back, det }
   返す：{ wood:[geo], sprigs:[[pos, yAxis, normal, scale, shade]], back:[...], ctr } */
export function growKeyaki(K, R, x, z, o) {
  const rr = (a, b) => a + (b - a) * R(), wood = [trunkGeo(o.r, o.hf, o.det, R)], twigs = [];   // twigs = [点, 向き, 深さ]
  const limb = (from, dir, len, r0, depth, lvl) => {
    const n = o.det ? (lvl === 0 ? 7 : 5) : 3, pts = [from.clone()], d = dir.clone(); let p = from.clone();
    for (let i = 1; i <= n; i++) {
      const h = new V3(d.x, 0, d.z); if (h.lengthSq() > 1e-5) h.normalize();
      const spread = lvl === 0 ? .018 : .03 + .02 * lvl;                     // 太枝はまっすぐ上へ、細い枝ほど外へ開く
      d.addScaledVector(h, spread).add(new V3((R() - .5) * (lvl === 0 ? .3 : .16), lvl >= 3 ? .03 : .04, (R() - .5) * .16)).normalize();
      p = p.clone().addScaledVector(d, len / n); pts.push(p);
    }
    const r1 = Math.max(.012, r0 * (depth === 0 ? .25 : lvl === 0 ? .52 : .62));
    wood.push(K.taperTube(pts, r0, r1, o.det ? Math.max(4, 12 - lvl * 3) : 4, o.det ? n + 1 : 3).toNonIndexed());
    if (depth > 0) {
      const nf = o.forks + (R() < .35 ? 1 : 0);
      for (let j = 0; j < nf; j++) {
        const at = pts[Math.min(n, Math.max(2, Math.round(n * (.45 + .55 * (j + 1) / nf))))];
        const a = R() * TAU, side = new V3(Math.cos(a), 0, Math.sin(a)), h = new V3(d.x, 0, d.z).normalize();
        side.addScaledVector(h, .9).normalize();                                // 子の枝は外向きに寄せる（扇が閉じない）
        const cd = d.clone().multiplyScalar(1.1).addScaledVector(side, .3 + .06 * lvl).normalize();
        limb(at, cd, len * rr(o.decay * .85, o.decay * 1.08), r1 * .92, depth - 1, lvl + 1);
      }
    }
    // 葉をつける細枝：先の深さ 0・1 の枝の後ろ半分
    if (depth <= 2) for (let i = Math.floor(n * (depth === 2 ? .6 : .3)); i <= n; i++) twigs.push([pts[i], d.clone(), depth]);
  };
  const a0 = R() * TAU;
  for (let k = 0; k < o.limbs; k++) {
    const a = a0 + k / o.limbs * TAU + rr(-.2, .2), tilt = rr(o.tilt * .75, o.tilt * 1.25), off = new V3(Math.cos(a), 0, Math.sin(a));
    const from = new V3(x, 0, z).addScaledVector(off, o.r * .18); from.y = o.hf - rr(1.1, 1.4);   // 太枝は幹の中から始まり、分かれ目で幹の面から出る
    limb(from, new V3(Math.cos(a) * tilt, 1, Math.sin(a) * tilt).normalize(), rr(...o.len), o.r * rr(.5, .6), o.levels, 0);
  }
  wood[0].translate(x, 0, z);
  // 樹冠の殻：方位 12×高さ 6 の区画ごとに、中心から最も遠い細枝までの距離
  const tw = twigs.map(t => t[0]), ctr = tw.reduce((s, p) => s.add(p), new V3()).multiplyScalar(1 / tw.length); ctr.y -= 1;
  const AZ = 12, EL = 6, shell = new Float32Array(AZ * EL).fill(.5);
  const bin = p => { const v = p.clone().sub(ctr), az = Math.floor(((Math.atan2(v.z, v.x) + Math.PI) / TAU) * AZ) % AZ, el = Math.min(EL - 1, Math.max(0, Math.floor((Math.atan2(v.y, Math.hypot(v.x, v.z)) / Math.PI + .5) * EL))); return [az * EL + el, v.length()]; };
  for (const p of tw) { const [b, l] = bin(p); shell[b] = Math.max(shell[b], l); }
  const depthOf = p => { const [b, l] = bin(p); return l / Math.max(.5, shell[b]); };   // 1＝殻の上・0＝中心
  const ymin = ctr.y - 4, ymax = Math.max(...tw.map(p => p.y));
  const place = (n, fromTwig, card) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const [tp, td, dep] = twigs[Math.floor(R() * twigs.length)];
      const outw = tp.clone().sub(ctr).normalize();
      const pos = tp.clone().add(new V3(R() - .5, (R() - .5) * .7, R() - .5).multiplyScalar(fromTwig)).addScaledVector(outw, R() * .12 * fromTwig);
      if (!card) pos.lerp(ctr, .25 + R() * .35);
      const yAx = td.clone().multiplyScalar(.8).addScaledVector(outw, .6).add(new V3((R() - .5) * .9, (R() - .5) * .5, (R() - .5) * .9)).normalize();
      const n0 = new V3(0, .45, 0).addScaledVector(outw, .8).add(new V3((R() - .5) * 1.8, (R() - .5) * 1.2, (R() - .5) * 1.8)).normalize();   // 葉の面の向きを散らす（水平の板が重なって筋に見えない）
      const dp = Math.min(1.1, depthOf(pos)), hh = Math.min(1, Math.max(0, (pos.y - ymin) / (ymax - ymin)));
      const shade = (.24 + .76 * ss(.4, 1.0, dp)) * (.62 + .38 * hh);   // 樹冠の内側・下ほど暗い
      out.push([pos, yAx, n0, (card ? .8 + R() * .45 : 1 + R() * .5) * (dep === 1 ? 1.08 : 1), shade]);
    }
    return out;
  };
  return { wood, sprigs: place(o.sprigs, 1.15, true), back: place(o.back, 1.1, false), ctr, top: ymax };
}

// 葉の板を一つの InstancedMesh に（板の根元が小枝に付く）。aCtr は共通部品の葉の材質（crown）が使う
export function sprigMesh(list, mat, size, tint, ctr, R) {
  const geo = new THREE.PlaneGeometry(size, size); geo.translate(0, size * .45, 0);
  const im = new THREE.InstancedMesh(geo, mat, list.length), ctrA = new Float32Array(list.length * 3), m4 = new THREE.Matrix4(), xA = new V3(), zA = new V3(), col = new THREE.Color();
  list.forEach(([pos, yA, n0, s, sh], i) => {
    xA.crossVectors(yA, n0).normalize(); zA.crossVectors(xA, yA).normalize();
    m4.makeBasis(xA.clone().multiplyScalar(s), yA.clone().multiplyScalar(s), zA.multiplyScalar(s)); m4.setPosition(pos); im.setMatrixAt(i, m4);
    const t = R(), l = sh * (.85 + R() * .3); col.setRGB(l * tint[0] * (.9 + t * .2), l * tint[1], l * tint[2] * (1.08 - t * .3)); im.setColorAt(i, col);
    ctrA.set([ctr.x, ctr.y, ctr.z], i * 3);
  });
  geo.setAttribute("aCtr", new THREE.InstancedBufferAttribute(ctrA, 3)); im.computeBoundingSphere(); return im;
}
