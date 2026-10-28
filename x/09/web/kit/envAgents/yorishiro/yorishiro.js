/* © mitsulab. 依代を置く ── 碧が姿を変えたもの（しずく・石 …）を、Qualium の 3D 空間に置く小さな部品（v1・2026-10-29）。
   本人「8 体が 80 点以上になったら、Qualium や HP などに入れてください。依代として、碧が姿かたちを変えたものです。」→ 先に 80 点を越えた 2 体（しずく・石）。
   決まり（CLAUDE.md）：依代は Qualium の中だけ／触れても 3D の大きな演出は出さない（字幕・声・小さな動きで応える）／色は碧の髪の色 1 色・白い体・マット。
   形：_dev/envAgents/sugata_ref/最良/{しずく,石}.py（Blender の Python・自作・外の素材なし）→ glb（gltfpack の meshopt・アプリの importmap と同じ解凍器）。
   どこに・何を語るかはアプリ（体験の担当）が決める。この部品は「置く・小さく息づく・触れたら小さく弾んで onTouch を呼ぶ」だけ。

   使い方（各 app.js から数行）：
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
const RM = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export class Yorishiro {
  constructor({ scene, camera, groundAt = () => 0 } = {}) {
    this.scene = scene; this.camera = camera; this.groundAt = groundAt; this.items = []; this.t = 0;
    this.loader = new GLTFLoader(); this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.ray = new THREE.Raycaster(); this.v2 = new THREE.Vector2();
  }
  async add(kind, { x = 0, z = 0, y = null, yaw = 0, scale = .5, onTouch = null } = {}) {
    if (!YORISHIRO_KINDS[kind]) throw new Error("unknown yorishiro: " + kind);
    const g = await this.loader.loadAsync(new URL(`./${kind}.glb`, import.meta.url).href);
    const root = new THREE.Group(), body = g.scene; root.add(body);
    body.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const m = o.material; if (m && m.roughness !== undefined && m.transmission === 0) m.roughness = Math.max(m.roughness, .65); } });   // マットに
    root.position.set(x, y ?? this.groundAt(x, z), z); root.rotation.y = yaw; root.scale.setScalar(scale);
    root.userData.yorishiro = kind; this.scene.add(root);
    const it = { kind, root, body, onTouch, hop: 0, ph: Math.random() * 6.28 }; this.items.push(it); return it;
  }
  update(dt) {
    this.t += dt;
    for (const it of this.items) {
      const b = RM ? 0 : Math.sin(this.t * 1.3 + it.ph) * .012;                  // 小さく息づく（縦に 1％ほど）
      it.hop = Math.max(0, it.hop - dt * 2.2); const h = RM ? 0 : Math.sin(it.hop * Math.PI) * .06;   // 触れたときの小さな弾み
      it.body.scale.set(1 - b * .5, 1 + b + h * .4, 1 - b * .5); it.body.position.y = h * .5;
    }
  }
  pick(cx, cy, el = document.body) {
    if (!this.items.length) return false;
    const r = el.getBoundingClientRect(); this.v2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    this.ray.setFromCamera(this.v2, this.camera);
    const hit = this.ray.intersectObjects(this.items.map(i => i.root), true)[0]; if (!hit) return false;
    let o = hit.object; while (o && !o.userData.yorishiro) o = o.parent;
    const it = this.items.find(i => i.root === o); if (!it) return false;
    it.hop = 1; it.onTouch?.(it); return true;
  }
  dispose() { for (const it of this.items) this.scene.remove(it.root); this.items.length = 0; }
}
