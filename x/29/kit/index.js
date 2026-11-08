/* mitsulab 共通 3D の部品（v1・2026-10-12）。入口はここ一つ。
   使い方は ../README.md。three@0.170.0・@pixiv/three-vrm@3.5.5 に固定（HP と同じ版。importmap で読む） */
export { PRESETS, makeSky, applyAtmosphere, fitRenderer } from "./atmosphere.js";
export { WIND, rng, natureMaterial, taperTube, SPECIES, growTree, plantTrees, leafMaterial, barkMaterial, poisson, grassField, groundPlane } from "./vegetation.js";
export { LAYER, lineMaterial, pointMaterial, contours, pillars, drift, layerPlane, textSprite, aoiRing } from "./layers.js";
export { loadAoi, AoiMotion, EMOTIONS, timelineFromKana, timelineFromText } from "./aoi.js";
import { WIND } from "./vegetation.js";
// 毎こまの時計（風など）。t＝秒
export const tick = t => { WIND.uTime.value = t; };
