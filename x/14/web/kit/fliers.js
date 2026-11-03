/* © mitsulab. 風景を飛ぶ小さな生きもの（2026-10-29 本人「風景に鳥や虫などをとばしてください」）。Qualium 3 版共通。
   形は HP の共通部品 kit/creatures.js（図鑑の形態・はばたき）をそのまま使う。外から取りこんだ 3D はない。
   出す種は、その場所に一年じゅういる鳥だけ（季節・時刻に合わない種は出さない）。数は少なく（PC 4・スマホ 2）、見る人のまわり 1.6〜4.2 m を
   低い枝から樹冠の下（目の高さのあたり 1.3〜2.8 m）で、波形にはばたいて行き来する。遠すぎるもの・後ろのものは描かない。 */
import * as THREE from "three";
import { makeTit } from "./creatures.js?v=1";
export function makeFliers(scene, camera, o = {}) {
  const mobile = o.mobile, n = o.natural ? 2 : mobile ? 3 : 4, S = o.size || .145, G = new THREE.Group(); G.name = "fliers"; scene.add(G);
  const B = [];
  for (let i = 0; i < n; i++) { const g = makeTit(undefined, { ph: i * .37 }); g.scale.setScalar(S); g.userData.state = "fly";
    g.traverse(m => { if (m.isMesh) { m.castShadow = false; m.frustumCulled = false; } }); G.add(g);
    B.push({ g, a: Math.random() * 6.28, r: 1.6 + Math.random() * 2.6, h: 1.3 + Math.random() * 1.5, w: (.18 + Math.random() * .12) * (i % 2 ? 1 : -1), c: new THREE.Vector3(), ph: Math.random() * 9 }); }
  let t = 0, on = false; const _v = new THREE.Vector3();
  return {
    group: G,
    // 11-02 本人「鳥に触れたとき、碧が出典つきで一言」：画面の点（clientX/Y）の近く（指 40px・カーソル 28px）に鳥がいれば o.onTouch(種) を呼ぶ
    pick(x, y, el, dry) { if (!on || !o.onTouch) return false; const r = (el || document.body).getBoundingClientRect(), lim = mobile ? 96 : 72; let hit = null, hd = lim;
      for (const b of B) { if (!b.g.visible) continue; _v.copy(b.g.position).project(camera); if (_v.z > 1) continue; const sx = r.left + (_v.x + 1) / 2 * r.width, sy = r.top + (1 - _v.y) / 2 * r.height, d = Math.hypot(sx - x, sy - y); if (d < hd && b.g.position.distanceTo(camera.position) < 18) { hd = d; hit = b; } }
      if (!hit) return false; if (dry) return true; hit.w *= -1; o.onTouch("tit"); return true; },   // 触れた鳥は向きを変えて飛び去る（追いかけない）
    update(dt, active) {
      on = !!active; G.visible = on; if (!on) return; t += dt;
      for (const b of B) {
        if (b.c.distanceTo(camera.position) > 12 || b.c.lengthSq() === 0) { camera.getWorldDirection(_v); const l = Math.hypot(_v.x, _v.z) || 1, f = 4 + Math.random() * 3; b.c.set(camera.position.x + _v.x / l * f + (Math.random() - .5) * 3, 0, camera.position.z + _v.z / l * f + (Math.random() - .5) * 3); }   // 11-02：見る人の前のあたりを飛ぶ（触れる機会を増やす）
        if (o.natural) {   // 11-02 本人「鳥が多い。もっと自然に」：いつも飛んでいるのでなく、ときどき 1〜2 羽が通り、しばらく近くの枝の高さで留まって去る（シジュウカラは群れでも数羽）
          b.cy = (b.cy ?? (i0 => i0 * 23 + 6)(B.indexOf(b))) - dt; if (b.cy < 0) { b.on = !b.on; b.cy = b.on ? 14 + Math.random() * 10 : 28 + Math.random() * 30; if (b.on) b.c.set(0, 0, 0); }
          b.g.visible = !!b.on; if (!b.on) continue; }
        b.a += b.w * dt; const x = b.c.x + Math.cos(b.a) * b.r, z = b.c.z + Math.sin(b.a) * b.r, y = (o.groundY ? o.groundY(x, z) : 0) + b.h + Math.sin(t * .7 + b.ph) * .8;
        const nx = b.c.x + Math.cos(b.a + .05 * Math.sign(b.w)) * b.r, nz = b.c.z + Math.sin(b.a + .05 * Math.sign(b.w)) * b.r;
        const gy0 = o.groundY ? o.groundY(x, z) : 0, dc = Math.hypot(x - camera.position.x, z - camera.position.z); const yy = dc < 6 ? Math.max(y, gy0 + 2.8) : y;   // 11-03 P2：見る人の 6 m 以内では碧の頭より上を飛ぶ（胴の前を横切らない）
        b.g.position.set(x, yy, z); b.g.rotation.set(0, Math.atan2(nx - x, nz - z), 0);
        const bob = b.g.userData.animate(t + b.ph, true); b.g.position.y += (bob || 0) * .04;
      }
    },
  };
}
