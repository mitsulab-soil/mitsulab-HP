/* 碧（依代）の読み込みと、標準の動き。v3・2026-10-14
   v3：シーンに置くのを、AoiMotion が腕を下ろした休めの形にしたあとにした（T ポーズを見せない）。relaxPose も書き出す。
   v2：動きと表情は aoi_motion.js（AoiMotion）に移した（本人「碧の動きを極限まで人間の自然な動作に近づけて」「表情も大事です」）。
   ここは読み込み・大きさ・現れ方だけ。v1（森羅研究室の aoiPose・aoiTick の写し）は ../旧ver/2026-10-12_碧の動き_自然化の前/。
   - 現れるとき：揺れもの（髪・裾）を止めたまま、1.4 秒で薄くから濃く（2026-10-07 本人「ワンピースが不自然に大きく揺れる」）
   - 動きを減らす設定：揺れ・身ぶりを止め、まばたき・口・視線だけ残す */
import * as THREE from "three";
import { AoiMotion } from "./aoi_motion.js";
export { AoiMotion, EMOTIONS, timelineFromKana, timelineFromText, inferGestures, relaxPose } from "./aoi_motion.js";

export async function loadAoi(url, { scene, height = 1.62, onProgress, seed = 0, reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches, wind = .6, posture = "natural", quality = "auto" } = {}) {
  const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js"), import("@pixiv/three-vrm")]);
  const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); ld.register(p => new V.VRMLoaderPlugin(p));
  const g = await ld.loadAsync(url, e => { if (e.total && onProgress) onProgress(e.loaded / e.total); });
  const vrm = g.userData.vrm; if (!vrm) throw new Error("VRM ではありません");
  V.VRMUtils.removeUnnecessaryVertices(g.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(g.scene); V.VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse(o => { o.frustumCulled = false; if (o.isMesh) o.castShadow = true; });
  const root = new THREE.Group(); root.add(vrm.scene);   // シーンに置くのは、動きの部品が休めの形にしてから（v3・2026-10-14：T ポーズを一こまも見せない）
  // 大きさをそろえる（足もとを y=0 に）。腕を下ろした形で測る
  vrm.humanoid.resetNormalizedPose(); vrm.update(0); vrm.scene.updateMatrixWorld(true);
  { const bx = new THREE.Box3().setFromObject(vrm.scene), h = bx.max.y - bx.min.y, sc = h > .5 ? height / h : 1; vrm.scene.scale.setScalar(sc); vrm.scene.position.y = -bx.min.y * sc; }
  root.updateMatrixWorld(true);
  const motion = new AoiMotion(vrm, { root, seed, reducedMotion, wind, posture, quality });   // quality（v5）＝"auto"|"high"|"mid"|"low"
  scene.add(root);
  // 透けさせて現れる
  const live = !reducedMotion; let fade = live ? 0 : 1;
  const mats = []; root.traverse(m => { if (m.isMesh) for (const mt of [].concat(m.material)) mats.push([mt, mt.transparent, mt.depthWrite]); });
  // 現れるあいだの「透けた顔に白目と口の中が浮く」のは、AoiMotion（v5）が奥行きだけの写しで防ぐ（どのアプリの現れ方でも効く）
  const opacity = o => { for (const [mt, tr, dw] of mats) { mt.transparent = o < 1 ? true : tr; mt.opacity = o; mt.depthWrite = o < 1 ? o > .6 : dw; mt.needsUpdate = true; } };
  opacity(fade);
  return {
    vrm, root, motion, state: motion.s,
    place(x, z, yaw) { motion.place(x, z, yaw); },
    walkTo(v3) { motion.walkTo(v3); },
    // 声の時刻表がないときは、話しているあいだ身ぶりと口を合わせる（sec 秒）
    talk(opts = {}) { motion.speak({ dur: 3, kana: "", ...opts }); },
    speak(opts) { motion.speak(opts); },
    // 毎こま呼ぶ。camera＝見る人（体と目を向ける先）
    tick(dt, camera) {
      motion.update(dt, camera);
      if (fade < 1) { fade = Math.min(1, fade + Math.min(dt, .05) / 1.4); opacity(fade); }
    },
  };
}
