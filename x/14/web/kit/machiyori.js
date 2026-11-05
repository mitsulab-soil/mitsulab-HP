/* © mitsulab. 町の依代（2026-11-04 本人「碧のデザインを踏襲した可愛い依代のキャラクターが町の中にいて、彼らを通して環境の感じ方を伝えてくれる」）。
   碧の意匠を受けつぐ：白い衣と裾の水色（碧の衣）・髪の色 #5fa7a0 の髪と葉の房・点の目。手もとに、その依代の手がかり（しずく・小石・葉・土と芽）を持つ。
   変身の対象ではない。擬人の断定はしない（話すのは碧。依代は向く・弾む・瞬くだけ）。
   軽さ：一体＝体（頂点色で一つにまとめた形）・目・手がかりの 3 つの描画だけ。形と材質は全員で共有。40 m より遠くは描かない。
   外から取りこんだ 3D・画像はない（その場で組み立てる＝権利の問題なし）。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const HAIR = new THREE.Color(0x5fa7a0), ROBE = new THREE.Color(0xf4f2ec), HEM = new THREE.Color(0x9fd2d6), SKIN = new THREE.Color(0xf7ece2), COLLAR = new THREE.Color(0x24383c);
function colored(g, c) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g; }
function bodyGeo() {
  // 衣：裾の広い鐘の形（高さ 0.26）。裾へ向かって水色へ（碧の衣の裾と同じ向き）
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14, y = .26 * t; pts.push(new THREE.Vector2(.115 - .06 * Math.pow(t, .8) + .012 * Math.sin(t * Math.PI), y)); }
  const robe = new THREE.LatheGeometry(pts, 28); const n = robe.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const y = robe.attributes.position.getY(i) / .26; c.copy(HEM).lerp(ROBE, THREE.MathUtils.smoothstep(y, .05, .5)); col.set([c.r, c.g, c.b], i * 3); }
  robe.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const base = colored(new THREE.CircleGeometry(.115, 28).rotateX(Math.PI / 2), HEM);
  const collar = colored(new THREE.TorusGeometry(.058, .012, 8, 24).rotateX(Math.PI / 2).translate(0, .262, 0), COLLAR);
  const head = colored(new THREE.SphereGeometry(.105, 28, 20).scale(1, .94, .96).translate(0, .36, 0), SKIN);
  const hair = colored(new THREE.SphereGeometry(.113, 28, 16, 0, Math.PI * 2, 0, Math.PI * .5).scale(1, .96, 1).rotateX(-.5).translate(0, .372, -.01), HAIR);
  const side = [-1, 1].map(s => colored(new THREE.SphereGeometry(.04, 14, 10).scale(.7, 1.8, .8).rotateZ(s * .15).translate(s * .088, .31, .01), HAIR));   // 横の髪（碧の顔まわり）
  const leaves = [-1, 0, 1].map(k => colored(new THREE.SphereGeometry(.03, 12, 8).scale(.5, 1.7, .28).rotateZ(-k * .45).translate(k * .026, .49 + (k ? 0 : .012), -.01), HAIR));   // 葉の房（碧の髪の一房）
  const g = mergeGeometries([robe, base, collar, head, hair, ...side, ...leaves].map(x => x.index ? x.toNonIndexed() : x).map(x => { for (const k of Object.keys(x.attributes)) if (!["position", "normal", "color"].includes(k)) x.deleteAttribute(k); return x; }));
  g.computeBoundingSphere(); return g;
}
const EM = {   // 手がかり（体の前、胸の高さに浮かぶ）
  shizuku: () => { const p = []; for (let i = 0; i <= 12; i++) { const t = i / 12; p.push(new THREE.Vector2(Math.sin(t * Math.PI) * (t > .5 ? 1 : Math.pow(t * 2, 1.4) * .9) * .032, .07 * (1 - t))); } return [new THREE.LatheGeometry(p, 18), new THREE.MeshStandardMaterial({ color: 0x8fcbe0, roughness: .15, metalness: 0, transparent: true, opacity: .78 })]; },
  ishi: () => [new THREE.DodecahedronGeometry(.032, 1).scale(1.3, .75, 1), new THREE.MeshStandardMaterial({ color: 0x8d8a82, roughness: .9 })],
  ki: () => [new THREE.SphereGeometry(.03, 14, 10).scale(.55, 1.5, .18), new THREE.MeshStandardMaterial({ color: 0x6f9a5a, roughness: .7, side: THREE.DoubleSide })],
  tsuchi: () => [new THREE.SphereGeometry(.034, 12, 8).scale(1.2, .7, 1.1), new THREE.MeshStandardMaterial({ color: 0x6a4e36, roughness: .95 })],
};
export class MachiYori {
  constructor({ scene, camera, dom, groundAt = () => 0, active = () => true, aoi = () => null, onGreet = null }) {
    Object.assign(this, { scene, camera, groundAt, active, aoi, onGreet });
    /* 11-05 遠くからの目印：足もとの淡い水色の輪（全員で一つの形・材質。加算で光る。1 体 1 描画） */
    this.ringG = new THREE.RingGeometry(.16, .25, 32).rotateX(-Math.PI / 2); this.ringM = new THREE.MeshBasicMaterial({ color: 0x9fd2d6, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending }); this.items = []; this.t = 0;
    this.geo = bodyGeo(); this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: 0 });
    this.eyeG = new THREE.SphereGeometry(.0105, 10, 8).scale(1, 1.35, .6); this.eyeM = new THREE.MeshStandardMaterial({ color: 0x1b2326, roughness: .3 });
    this.em = {}; this.ray = new THREE.Raycaster(); this.v2 = new THREE.Vector2(); this.v3 = new THREE.Vector3();
    this.dom = dom; window.addEventListener("pointerup", e => { if (e.target === dom) this.tap(e); }, true);   // 本体の押した所へ歩く処理より先に受ける
  }
  add(kind, { x, z, yaw = 0, scale = 1.25, onTouch }) {
    const root = new THREE.Group(), sway = new THREE.Group(); root.add(sway);
    const body = new THREE.Mesh(this.geo, this.mat); body.castShadow = true; sway.add(body);
    const eyes = new THREE.InstancedMesh(this.eyeG, this.eyeM, 2), o = new THREE.Object3D();
    [-1, 1].forEach((s, i) => { o.position.set(s * .036, .355, .097); o.updateMatrix(); eyes.setMatrixAt(i, o.matrix); }); sway.add(eyes);
    const [eg, emat] = (this.em[kind] ||= EM[kind] ? EM[kind]() : EM.ishi()); const emb = new THREE.Mesh(eg, emat); emb.position.set(0, .17, .15); sway.add(emb);
    root.position.set(x, this.groundAt(x, z), z); root.rotation.y = yaw; root.scale.setScalar(scale); root.userData.machiyori = kind; this.scene.add(root);
    const ring = new THREE.Mesh(this.ringG, this.ringM.clone()); ring.position.y = .01; ring.renderOrder = 2; root.add(ring);
    const it = { kind, root, sway, body, eyes, emb, ring, onTouch, ph: Math.random() * 6.28, hop: 0, blink: 2 + Math.random() * 3, yaw }; this.items.push(it); return it;
  }
  tap(e) {
    if (!this.active() || !this.items.length) return; const r = e.target.getBoundingClientRect?.(); if (!r) return;
    this.v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); this.ray.setFromCamera(this.v2, this.camera);
    const vis = this.items.filter(i => i.root.visible); const hit = this.ray.intersectObjects(vis.map(i => i.body), false)[0];
    if (!hit || hit.distance > 14) return; const it = vis.find(i => i.body === hit.object); if (!it) return;
    e.stopImmediatePropagation(); it.hop = 1; it.onTouch?.(it);
  }
  update(dt) {
    this.t += dt; const t = this.t, cp = this.camera.position;
    for (const it of this.items) {
      const R = it.root, d = Math.hypot(R.position.x - cp.x, R.position.z - cp.z); R.visible = d < 40 && this.active(); if (!R.visible) continue;
      if (((it.gt ??= 0) - dt) < 0 || (it.gt -= dt) < 0) { it.gt = .6; R.position.y = this.groundAt(R.position.x, R.position.z); }   // 足もとは描いている面に合わせなおす（読みこみの前後で高さが変わる）
      const A = this.aoi(), da = A ? Math.hypot(A.x - R.position.x, A.z - R.position.z) : 99;   // 11-05 碧と仲良く：碧が 3 m に来ると碧へ向き、一度だけ小さく弾む
      if (da < 3 && !it.met) { it.met = true; it.hop = Math.max(it.hop, .8); it.ct = 4 + Math.random() * 2; this.onGreet?.(it); } else if (da > 6) it.met = false;
      if (da < 3 && (it.ct -= dt) < 0) { it.ct = 5 + Math.random() * 3; it.hop = Math.max(it.hop, .45); if (Math.random() < .5) this.onGreet?.(it); }   // 11-05 碧と仲良く：碧がそばにいるあいだは、ときどき小さく弾んで応える（碧も目をやる）
      it.lean = (it.lean || 0) + ((da < 3 ? .07 : 0) - (it.lean || 0)) * Math.min(1, dt * 3); it.sway.rotation.x = it.lean;   // 碧の方へ少し身を寄せる
      const want = da < 3 ? Math.atan2(A.x - R.position.x, A.z - R.position.z) : d < 6 ? Math.atan2(cp.x - R.position.x, cp.z - R.position.z) : it.yaw;   // 近づくと見る人の方へ向く
      { const far = THREE.MathUtils.smoothstep(d, 6, 14) * (1 - THREE.MathUtils.smoothstep(d, 32, 40)); it.ring.material.opacity = far * (.32 + .18 * Math.sin(t * 1.8 + it.ph)); it.ring.visible = far > .02; it.ring.scale.setScalar(1 + far * 1.4); }   // 遠く（6〜40 m）ではかすかに光る輪、近くでは消える
      R.rotation.y += Math.atan2(Math.sin(want - R.rotation.y), Math.cos(want - R.rotation.y)) * Math.min(1, dt * 3);
      it.hop = Math.max(0, it.hop - dt * 2.2); it.sway.position.y = Math.abs(Math.sin(t * 1.6 + it.ph)) * .008 + Math.sin(it.hop * Math.PI) * .06;
      it.sway.rotation.z = Math.sin(t * 1.1 + it.ph) * .035; it.emb.position.y = .17 + Math.sin(t * 2 + it.ph) * .008; it.emb.rotation.y += dt * .8;
      it.blink -= dt; const k = it.blink < 0 ? (it.blink < -.12 ? (it.blink = 2.5 + Math.random() * 3, 1) : .15) : 1; it.eyes.scale.y = k; it.eyes.position.y = (1 - k) * .355;
    }
  }
}
