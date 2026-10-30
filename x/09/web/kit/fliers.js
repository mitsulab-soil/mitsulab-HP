/* © mitsulab. 風景を飛ぶ小さな生きもの（2026-10-29 本人「風景に鳥や虫などをとばしてください」）。Qualium 3 版共通。
   形は HP の共通部品 kit/creatures.js（図鑑の形態・はばたき）をそのまま使う。外から取りこんだ 3D はない。
   出す種は、その場所に一年じゅういる鳥だけ（季節・時刻に合わない種は出さない）。数は少なく（PC 4・スマホ 2）、見る人のまわり 1.6〜4.2 m を
   低い枝から樹冠の下（目の高さのあたり 1.3〜2.8 m）で、波形にはばたいて行き来する。遠すぎるもの・後ろのものは描かない。 */
import * as THREE from "three";
import { makeTit } from "./creatures.js?v=1";
export function makeFliers(scene, camera, o = {}) {
  const mobile = o.mobile, n = mobile ? 2 : 4, S = o.size || .145, G = new THREE.Group(); G.name = "fliers"; scene.add(G);
  const B = [];
  for (let i = 0; i < n; i++) { const g = makeTit(undefined, { ph: i * .37 }); g.scale.setScalar(S); g.userData.state = "fly";
    g.traverse(m => { if (m.isMesh) { m.castShadow = false; m.frustumCulled = false; } }); G.add(g);
    B.push({ g, a: Math.random() * 6.28, r: 1.6 + Math.random() * 2.6, h: 1.3 + Math.random() * 1.5, w: (.18 + Math.random() * .12) * (i % 2 ? 1 : -1), c: new THREE.Vector3(), ph: Math.random() * 9 }); }
  let t = 0, on = false;
  return {
    group: G,
    update(dt, active) {
      on = !!active; G.visible = on; if (!on) return; t += dt;
      for (const b of B) {
        if (b.c.distanceTo(camera.position) > 45 || b.c.lengthSq() === 0) b.c.set(camera.position.x + (Math.random() - .5) * 5, 0, camera.position.z + (Math.random() - .5) * 5);
        b.a += b.w * dt; const x = b.c.x + Math.cos(b.a) * b.r, z = b.c.z + Math.sin(b.a) * b.r, y = (o.groundY ? o.groundY(x, z) : 0) + b.h + Math.sin(t * .7 + b.ph) * .8;
        const nx = b.c.x + Math.cos(b.a + .05 * Math.sign(b.w)) * b.r, nz = b.c.z + Math.sin(b.a + .05 * Math.sign(b.w)) * b.r;
        b.g.position.set(x, y, z); b.g.rotation.set(0, Math.atan2(nx - x, nz - z), 0);
        const bob = b.g.userData.animate(t + b.ph, true); b.g.position.y += (bob || 0) * .04;
      }
    },
  };
}
