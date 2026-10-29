/* © mitsulab. 依代を置く ── 碧が姿を変えたもの（しずく・石 …）を、Qualium の 3D 空間に置く小さな部品（v2・2026-10-29 姿ごとの自然な動き）。
   本人「8 体が 80 点以上になったら、Qualium や HP などに入れてください。依代として、碧が姿かたちを変えたものです。」
   本人「碧以外の依代にも自然な動きをつけて、Qualium に入れてください」→ v2：姿ごとの動き（下の MOTION）。
   決まり（CLAUDE.md）：依代は Qualium の中だけ／触れても 3D の大きな演出は出さない（字幕・声・小さな動きで応える）／色は碧の髪の色 1 色・白い体・マット。
   動きの考え方（碧の AoiMotion と同じ）：止まりきらない小さな揺れ・周期はそろえず重ねる（ばらつき）・瞬きは不規則な間（ときどき二度）・動きは小さく、速く跳ねない。
     しずく：表面の小さなゆらぎ（頂点を GPU でずらす）・体の小さな揺れ・ゆっくり向きを変える・泡が上下にただよう・瞬き。
     石：体はほぼ動かない・葉と苔の先だけ小さく揺れる・ときどき瞬き。
     新しい姿：材質の名で動きが付く（eye/hl＝瞬き、lf/leaf/tuft＝葉の揺れ、water/bub＝ただよい、ほかの大きな部品＝体）。KIND_MOTION に姿ごとの強さを足すだけ。
   重さ：頂点の動きは材質のシェーダーで（CPU の頂点書き換えなし）。毎こまの仕事は数個の数の更新だけ。
   形：_dev/envAgents/sugata_ref/最良/{しずく,石}.py（Blender の Python・自作・外の素材なし）→ glb（gltfpack の meshopt・アプリの importmap と同じ解凍器）。

   使い方（各 app.js から数行・v1 と同じ）：
     const Y = await import("../kit/envAgents/yorishiro/yorishiro.js");
     const yo = new Y.Yorishiro({ scene: world, camera, groundAt: groundY });
     await yo.add("shizuku", { x, z, yaw: 0, scale: .5, onTouch: () => 碧の字幕と声で一言 });
     毎こま：yo.update(dt)
     触れる：if (yo.pick(clientX, clientY)) return;   // 当たったら onTouch を呼んで true
*/
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

export const YORISHIRO_KINDS = { shizuku: "しずく", ishi: "石" };
// 姿ごとの動きの強さ（m は形の単位＝scale を掛ける前）。ripple＝表面のゆらぎ、sway＝体の揺れ（rad）、turn＝向きの変化（rad）、leaf＝葉の揺れ、float＝泡のただよい、blink＝瞬きの間（秒）
const KIND_MOTION = {
  shizuku: { ripple: .006, sway: .045, turn: .22, leaf: 0, float: .02, blink: [2.8, 6.5], breathe: .012 },
  ishi:    { ripple: 0,    sway: .004, turn: 0,   leaf: .012, float: 0, blink: [6, 13], breathe: .002 },
  _:       { ripple: 0,    sway: .02,  turn: .1,  leaf: .012, float: .015, blink: [3.5, 8], breathe: .008 },
};
const RM = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const role = name => /^(eye|hl)/.test(name) ? "eye" : /^(lf|leaf|tuft|mo)/.test(name) ? "leaf" : /^(water|bub)/.test(name) ? "float" : "body";

// 材質に、時間で頂点を小さくずらす処理を足す（形の単位の座標で。地面に近い所ほど動かない）
function patch(mat, U, kind) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = U.t; sh.uniforms.uA = U[kind]; sh.uniforms.uPh = U.ph;
    sh.vertexShader = "uniform float uT; uniform float uA; uniform float uPh;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      { float h = max(0.0, position.y);
        ${kind === "body" ? `float w = sin(position.y * 23.0 + uT * 1.7 + uPh) * sin(position.x * 19.0 - uT * 1.3) + .6 * sin(position.z * 29.0 + uT * 2.3 + uPh * .7);
        transformed += normal * w * uA * smoothstep(.0, .25, h);` : ""}
        ${kind === "leaf" ? `float s = sin(uT * 1.9 + position.x * 9.0 + uPh) + .5 * sin(uT * 3.1 + position.z * 13.0);
        transformed.x += s * uA * smoothstep(.0, .3, h); transformed.z += .6 * cos(uT * 1.5 + position.y * 11.0 + uPh) * uA;` : ""}
        ${kind === "float" ? `float k = smoothstep(.04, .12, h);
        transformed.y += sin(uT * .9 + position.x * 7.0 + position.z * 5.0 + uPh) * uA * k; transformed.x += sin(uT * .6 + position.y * 9.0) * uA * .4 * k;` : ""}
      }`);
  };
  mat.customProgramCacheKey = () => "yo_" + kind;
  mat.needsUpdate = true;
}

export class Yorishiro {
  constructor({ scene, camera, groundAt = () => 0 } = {}) {
    this.scene = scene; this.camera = camera; this.groundAt = groundAt; this.items = []; this.t = 0;
    this.loader = new GLTFLoader(); this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.ray = new THREE.Raycaster(); this.v2 = new THREE.Vector2();
  }
  async add(kind, { x = 0, z = 0, y = null, yaw = 0, scale = .5, onTouch = null } = {}) {
    if (!YORISHIRO_KINDS[kind]) throw new Error("unknown yorishiro: " + kind);
    const g = await this.loader.loadAsync(new URL(`./${kind}.glb${new URL(import.meta.url).search || ""}`, import.meta.url).href);
    const M = KIND_MOTION[kind] || KIND_MOTION._, ph = Math.random() * 6.28;
    const U = { t: { value: 0 }, ph: { value: ph }, body: { value: RM ? 0 : M.ripple }, leaf: { value: RM ? 0 : M.leaf }, float: { value: RM ? 0 : M.float } };
    const root = new THREE.Group(), sway = new THREE.Group(), body = g.scene; sway.add(body); root.add(sway);
    const eyes = [];
    body.traverse(o => {
      if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
      const m = o.material, r = role(m?.name || "");
      if (m && m.roughness !== undefined && !(m.transmission > 0)) m.roughness = Math.max(m.roughness, .65);   // マットに
      if (r === "eye") {   // 瞬き：目の中心を軸に縦につぶす
        o.geometry.computeBoundingBox(); const c = o.geometry.boundingBox.getCenter(new THREE.Vector3());
        o.geometry.translate(-c.x, -c.y, -c.z); o.position.add(c); eyes.push(o);
      } else if (m && (r !== "body" || M.ripple)) { o.material = m.clone(); patch(o.material, U, r); }
    });
    root.position.set(x, y ?? this.groundAt(x, z), z); root.rotation.y = yaw; root.scale.setScalar(scale);
    root.userData.yorishiro = kind; this.scene.add(root);
    const it = { kind, root, sway, body, eyes, U, M, yaw0: yaw, onTouch, hop: 0, ph, blinkAt: M.blink[0] * Math.random(), blinkT: -1, twice: false };
    this.items.push(it); return it;
  }
  update(dt) {
    dt = Math.min(dt, .1); this.t += dt; const t = this.t;
    for (const it of this.items) {
      const M = it.M, p = it.ph; it.U.t.value = t;
      if (!RM) {
        // 体：ゆっくりした揺れ（周期をそろえない二つの波を重ねる）と、向きのゆっくりした変化
        it.sway.rotation.z = M.sway * (Math.sin(t * .53 + p) * .7 + Math.sin(t * .31 + p * 1.7) * .3);
        it.sway.rotation.x = M.sway * .6 * Math.sin(t * .41 + p * .5);
        it.root.rotation.y = it.yaw0 + M.turn * (Math.sin(t * .11 + p) * .75 + Math.sin(t * .067 + p * 2.1) * .25);
      }
      const b = RM ? 0 : Math.sin(t * 1.25 + p) * M.breathe;
      it.hop = Math.max(0, it.hop - dt * 2.2); const h = RM ? 0 : Math.sin(it.hop * Math.PI) * .06;   // 触れたときの小さな弾み
      it.body.scale.set(1 - b * .5, 1 + b + h * .4, 1 - b * .5); it.body.position.y = h * .5;
      // 瞬き：不規則な間・ときどき二度・0.16 秒で閉じて開く
      if (it.eyes.length) {
        it.blinkAt -= dt;
        if (it.blinkT < 0 && it.blinkAt <= 0) { it.blinkT = 0; }
        let s = 1;
        if (it.blinkT >= 0) {
          it.blinkT += dt; const u = it.blinkT / .16; s = u < 1 ? 1 - .9 * Math.sin(u * Math.PI) : 1;
          if (u >= 1) { it.blinkT = -1; const twice = !it.twice && Math.random() < .2; it.twice = twice; it.blinkAt = twice ? .12 : M.blink[0] + Math.random() * (M.blink[1] - M.blink[0]); }
        }
        for (const e of it.eyes) e.scale.y = s;
      }
    }
  }
  pick(cx, cy, el = document.body) {
    if (!this.items.length) return false;
    const r = el.getBoundingClientRect(); this.v2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    this.ray.setFromCamera(this.v2, this.camera);
    const hit = this.ray.intersectObjects(this.items.map(i => i.root), true)[0]; if (!hit) return false;
    let o = hit.object; while (o && !o.userData.yorishiro) o = o.parent;
    const it = this.items.find(i => i.root === o); if (!it) return false;
    it.hop = 1; it.blinkAt = .25; it.onTouch?.(it); return true;
  }
  dispose() { for (const it of this.items) this.scene.remove(it.root); this.items.length = 0; }
}
