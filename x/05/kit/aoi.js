/* mitsulab 共通の部品（aoi.js）。© 2026 mitsulab. All rights reserved. */
import * as THREE from "three";
import { AoiMotion } from "./aoi_motion.js";
export { AoiMotion, EMOTIONS, timelineFromKana, timelineFromText } from "./aoi_motion.js";

export async function loadAoi(url, { scene, height = 1.62, onProgress, seed = 0, reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches, wind = .6, posture = "natural" } = {}) {
  const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js"), import("@pixiv/three-vrm")]);
  const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); ld.register(p => new V.VRMLoaderPlugin(p));
  const g = await ld.loadAsync(url, e => { if (e.total && onProgress) onProgress(e.loaded / e.total); });
  const vrm = g.userData.vrm; if (!vrm) throw new Error("VRM ではありません");
  V.VRMUtils.removeUnnecessaryVertices(g.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(g.scene); V.VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse(o => { o.frustumCulled = false; if (o.isMesh) o.castShadow = true; });
  const root = new THREE.Group(); root.add(vrm.scene); scene.add(root);
  // 大きさをそろえる（足もとを y=0 に）。腕を下ろした形で測る
  vrm.humanoid.resetNormalizedPose(); vrm.update(0); vrm.scene.updateMatrixWorld(true);
  { const bx = new THREE.Box3().setFromObject(vrm.scene), h = bx.max.y - bx.min.y, sc = h > .5 ? height / h : 1; vrm.scene.scale.setScalar(sc); vrm.scene.position.y = -bx.min.y * sc; }
  root.updateMatrixWorld(true);
  const motion = new AoiMotion(vrm, { root, seed, reducedMotion, wind, posture });
  // 透けさせて現れる
  const live = !reducedMotion; let fade = live ? 0 : 1;
  const mats = []; root.traverse(m => { if (m.isMesh) for (const mt of [].concat(m.material)) mats.push([mt, mt.transparent, mt.depthWrite]); });
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
