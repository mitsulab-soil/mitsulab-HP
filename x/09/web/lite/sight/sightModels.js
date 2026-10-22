/* © mitsulab. Qualia/walk 氷川・Qualia/sight の生き物 6 種の 3D を呼ぶ小さな部品（2026-10-22）。
   使い方：
     import { loadSight, SIGHT_SPECIES } from "./sight/sightModels.js";
     const m = await loadSight("hiyo");            // 名前は id（hiyo・koumori・aosuji・kaitsuburi・mimizu・inu）か和名
     scene.add(m.object); m.play("fly");           // 動きの名前は m.clips（下の SIGHT_SPECIES の clips）
     // 毎こま：m.update(dt)
     loadSight("inu", { lod: "far" })              // 遠く用（形を約 1/4・絵を 256 px に）
   向きと大きさ：頭が +Z、背が +Y、足もと（腹）が y=0。実寸（m）。見せるために大きくするときは m.object.scale を呼ぶ側で。
   読み込みは種ごとに一度だけ（ArrayBuffer をためて、呼ぶたびに組み直す＝骨つきでも安全に複製できる）。 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

export const SIGHT_SPECIES = {
  hiyo:       { ja: "ヒヨドリ",       sci: "Hypsipetes amaurotis",  file: "hiyodori",   len: 0.275, clips: ["fly", "glide", "perch"],  main: "fly" },
  koumori:    { ja: "アブラコウモリ", sci: "Pipistrellus abramus",  file: "koumori",    len: 0.050, clips: ["fly", "turn"],    main: "fly" },
  aosuji:     { ja: "アオスジアゲハ", sci: "Graphium sarpedon",     file: "aosuji",     len: 0.030, clips: ["fly", "rest"],            main: "fly" },
  kaitsuburi: { ja: "カイツブリ",     sci: "Tachybaptus ruficollis", file: "kaitsuburi", len: 0.26, clips: ["swim", "dive", "idle"],   main: "swim" },
  mimizu:     { ja: "ミミズ",         sci: "フトミミズ科",           file: "mimizu",     len: 0.14,  clips: ["crawl", "idle"],          main: "crawl" },
  inu:        { ja: "イヌ",           sci: "Canis familiaris",       file: "inu",        len: 0.62,  clips: ["walk", "trot", "sniff", "idle"], main: "walk" },
};
const ALIAS = Object.fromEntries(Object.entries(SIGHT_SPECIES).flatMap(([id, s]) => [[id, id], [s.ja, id], [s.file, id]]));
ALIAS["コウモリ"] = "koumori"; ALIAS["犬"] = "inu";

const BASE = new URL(".", import.meta.url).href;
const BUF = new Map();
let loader = null;
function getLoader() {
  if (!loader) { loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder); }
  return loader;
}
function fetchBuf(url) {
  if (!BUF.has(url)) BUF.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(url + " " + r.status); return r.arrayBuffer(); }));
  return BUF.get(url);
}
/** 先に読んでおく（選ぶ画面を開いたときなど）。中身は組み立てない */
export function prefetchSight(names, o = {}) {
  for (const n of names) { const id = ALIAS[n]; if (id) fetchBuf(fileURL(id, o)); }
}
function fileURL(id, o) { return (o.base || BASE) + SIGHT_SPECIES[id].file + (o.lod === "far" ? "_far" : "") + ".glb"; }

/** 種を名前で呼ぶと、3D とアニメーションを返す */
export async function loadSight(name, o = {}) {
  const id = ALIAS[name]; if (!id) throw new Error("sightModels: 知らない名前 " + name);
  const sp = SIGHT_SPECIES[id], url = fileURL(id, o);
  const buf = await fetchBuf(url);
  const gltf = await new Promise((res, rej) => getLoader().parse(buf.slice(0), url.replace(/[^/]*$/, ""), res, rej));
  const object = gltf.scene; object.name = "sight_" + id;
  object.traverse(m => {
    if (!m.isMesh) return;
    m.castShadow = o.shadow ?? true; m.receiveShadow = false; m.frustumCulled = false;   // 骨で動く形は箱が実際より小さいことがあるので、切り落とさない
    const mt = m.material; if (mt && mt.alphaTest > 0) mt.alphaToCoverage = !!o.aa;
  });
  const mixer = new THREE.AnimationMixer(object), actions = {};
  for (const c of gltf.animations) actions[c.name] = mixer.clipAction(c);
  let cur = null;
  const api = {
    id, info: sp, object, mixer, actions, clips: Object.keys(actions),
    /** 動きを替える（fade 秒でなめらかに） */
    play(clip = sp.main, fade = .35, speed = 1) {
      const a = actions[clip]; if (!a) { console.warn("sightModels: 動きがない", id, clip); return null; }
      a.setLoop(THREE.LoopRepeat, Infinity); a.timeScale = speed; a.enabled = true;
      if (cur && cur !== a) { a.reset().play(); cur.crossFadeTo(a, fade, false); } else a.play();
      cur = a; return a;
    },
    update(dt) { mixer.update(dt); },
    dispose() {
      mixer.stopAllAction(); object.traverse(m => { if (m.isMesh) { m.geometry.dispose(); for (const k in m.material) { const v = m.material[k]; if (v && v.isTexture) v.dispose(); } m.material.dispose(); } });
      object.removeFromParent();
    },
  };
  if (o.autoplay !== false) api.play(sp.main, 0);
  return api;
}
