/* 起動の部品の入口（_dev/bundle.mjs で kit/boot.b.js に束ねる）。three と、最初に使う部品を一つのファイルにする */
export * from "three";
export { GLTFLoader } from "./three/addons/loaders/GLTFLoader.js";
export { MeshoptDecoder } from "./three/addons/libs/meshopt_decoder.module.js";
export { sightLeaf, sightBark, setSightSun } from "./sight_trees.js";
export { installSkyFog, treeVariety, landTint, groundMottle, hash1 } from "./sight_land.js";
