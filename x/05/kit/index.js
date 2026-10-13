/* mitsulab 共通の部品（index.js）。© 2026 mitsulab. All rights reserved. */
export { PRESETS, makeSky, applyAtmosphere, fitRenderer } from "./atmosphere.js";
export { WIND, rng, natureMaterial, taperTube, SPECIES, growTree, plantTrees, leafMaterial, barkMaterial, poisson, grassField, groundPlane } from "./vegetation.js";
export { LAYER, lineMaterial, pointMaterial, contours, pillars, drift, layerPlane, textSprite, aoiRing } from "./layers.js";
export { loadAoi, AoiMotion, EMOTIONS, timelineFromKana, timelineFromText } from "./aoi.js";
import { WIND } from "./vegetation.js";
// 毎こまの時計（風など）。t＝秒
export const tick = t => { WIND.uTime.value = t; };
