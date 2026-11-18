/* © mitsulab. 起動の鳥（2026-11-03）：Qualia/sight の起動と同じ考え方で、開いた直後に小さな鳥が数羽、目の前を横切って飛ぶ。
   種はシジュウカラ（大宮・川越・渋谷の公園や社寺林にふつうにいる留鳥）。形は kit/creatures.js の makeTit（外の 3D は使わない）。
   軽さ：操作できるようになってから呼ぶ／1 フレームに 1 羽ずつ作る／材質は makeTit の中の一つだけ／compileAsync で先にシェーダーを準備／
   飛び終えたら外して捨てる。reduced-motion では飛ばさない。 */
import { makeTit } from './creatures.js';

export async function startBirds({ THREE, scene, camera, renderer, n = 4, dur = 6.5 }) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const g = new THREE.Group(); g.name = 'startBirds';
  // 道筋はカメラから見た座標で持ち、毎フレーム世界の位置へ直す（起動のカメラの動きに置いていかれない・見下ろしの地図でも視野に入る）
  const cs = (x, y, z) => new THREE.Vector3(x, y, z);
  const birds = [];
  const tick = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < n; i++) {
    const b = makeTit(undefined, { state: 'fly', ph: i * .37 }); b.scale.setScalar(.15);
    const d = 3.2 + i * .9, w = 1.6 + d * .75;   // 左下から右上へ横切る
    const a = cs(-w, -.35 + i * .22, -d), z = cs(w, .55 + i * .28, -d - 1.2);
    birds.push({ b, a, z, t0: i * .35 });
    b.visible = false; g.add(b);
    await tick();
  }
  scene.add(g);
  try { if (renderer?.compileAsync) await renderer.compileAsync(g, camera, scene); } catch { }
  const T0 = performance.now(), dir = new THREE.Vector3(), p = new THREE.Vector3();
  const step = () => {
    const t = (performance.now() - T0) / 1000;
    let alive = false;
    for (const B of birds) {
      const u = (t - B.t0) / dur;
      if (u < 0 || u > 1) { B.b.visible = false; if (u < 0) alive = true; continue; }
      alive = true; B.b.visible = true;
      p.lerpVectors(B.a, B.z, u); p.y += Math.sin(u * Math.PI * 5 + B.t0) * .12;   // 波形の飛び方
      camera.updateMatrixWorld(); B.b.position.copy(camera.localToWorld(p)); dir.copy(B.z).sub(B.a).transformDirection(camera.matrixWorld); B.b.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
      B.b.userData.animate(t);
    }
    if (alive) requestAnimationFrame(step);
    else { scene.remove(g); g.traverse(m => { m.geometry?.dispose?.(); }); }
  };
  requestAnimationFrame(step);
}
