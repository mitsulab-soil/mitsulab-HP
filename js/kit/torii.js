// © mitsulab. 明神鳥居（その場で組む形・2026-11-05）。比率は氷川参道の一の鳥居の読み（全高 9.0 m・柱間 6.9 m＝Qualium 大宮の struct_place.json）に合わせた模式。
// 朱の柱と貫・島木、黒い笠木と根巻。笠木の両端は反る（反り増し）。h＝全高。
import * as THREE from 'three';
export function makeTorii(h = 1, o = {}) {
  const g = new THREE.Group(), span = h * .767, pr = h * .043;
  const shu = new THREE.MeshStandardMaterial({ color: o.shu ?? 0xc0533a, roughness: .62, metalness: 0 });
  const kuro = new THREE.MeshStandardMaterial({ color: 0x1c1a19, roughness: .55, metalness: .05 });
  const lean = .018;   // 柱の転び（内へ傾く）
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(pr * .92, pr, h * .86, 24), shu); p.position.set(s * span / 2, h * .43, 0); p.rotation.z = s * lean; g.add(p);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(pr * 1.18, pr * 1.22, h * .1, 24), kuro); b.position.set(s * span / 2, h * .05, 0); g.add(b);   // 根巻
  }
  const bar = (w, hh, d, y, m, sori = 0) => { const geo = new THREE.BoxGeometry(w, hh, d, 24, 1, 1), a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) { const x = a.getX(i) / (w / 2); a.setY(i, a.getY(i) + sori * h * Math.pow(Math.abs(x), 2.4)); } geo.computeVertexNormals(); const me = new THREE.Mesh(geo, m); me.position.y = y; g.add(me); return me; };
  bar(span + h * .26, h * .055, pr * 1.3, h * .68, shu);                 // 貫
  bar(span + h * .36, h * .05, pr * 1.9, h * .86, shu, .018);          // 島木
  bar(span + h * .44, h * .055, pr * 2.3, h * .915, kuro, .045);       // 笠木
  const gk = new THREE.Mesh(new THREE.BoxGeometry(h * .05, h * .15, pr * 1.2), shu); gk.position.y = h * .77; g.add(gk);   // 額束
  return g;
}
