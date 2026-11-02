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

export const YORISHIRO_KINDS = { shizuku: "しずく", ishi: "石", kitsune: "狐", cho: "蝶", hitsuji: "羊", tori: "鳥", ki: "木", tsuchi: "土", tanuki: "タヌキ", suzume: "スズメ", mitsubachi: "ミツバチ" };
/* 11-02 本人「大宮にもミツバチいます。あとタヌキもいます。あと小鳥（すずめ）も入れてください。」（本人の観察 2026-11-02）→ 形＝_dev/envAgents/sugata_ref/最良/new3_タヌキ_スズメ_ミツバチ.py（自作）。
   本人「木が歩くのはおかしいです。」→ 動かない物（木・石・土・しずく）は向きも変えず跳ねもしない。碧が来たら葉がわずかにそよぐだけ。歩く＝狐・タヌキ・羊、飛ぶ＝鳥・スズメ・蝶・ミツバチ。 */
export const YORISHIRO_STILL = new Set(["ki", "ishi", "tsuchi", "shizuku"]);
/* 11-02 本人「碧以外の依代を Qualium に自然な動作で導入してください。碧と仲良くしてください。」→ v3：8 体すべて。
   形＝_dev/envAgents/sugata_ref/最良/{羊,鳥,蝶,狐,木,土}.py（自作）→ gltfpack（-cc -si 0.2）。
   仲良く（setCompanion で碧の位置・向き・話しているかを渡す）：
     狐＝碧のそばを歩く（横・少し後ろ。歩くと小さく弾む）。蝶＝碧の肩の高さをゆっくり回る（はばたき）。
     置いた姿（しずく・石・羊・鳥・木・土）＝碧が 9 m 以内に来ると碧へ向き、一度だけ小さく弾む（onGreet で碧が目をやる）。
     碧が話すあいだ＝近くの依代は碧へ向く。問いの一行（react("ask")）＝首をかしげるように小さく傾く。
     見る人が 4 m 以内で碧が黙っているとき＝見る人へ向く。
   重さ：60 m より遠い・画面の外の依代は動かさない（70 m より遠いものは描かない）。毎こまの仕事は数の更新だけ。 */
// 姿ごとの動きの強さ（m は形の単位＝scale を掛ける前）。ripple＝表面のゆらぎ、sway＝体の揺れ（rad）、turn＝向きの変化（rad）、leaf＝葉の揺れ、float＝泡のただよい、blink＝瞬きの間（秒）
const KIND_MOTION = {
  shizuku: { ripple: .006, sway: .045, turn: 0, leaf: 0, float: .02, blink: [2.8, 6.5], breathe: .012 },
  ishi:    { ripple: 0,    sway: .004, turn: 0,   leaf: .012, float: 0, blink: [6, 13], breathe: .002 },
  kitsune: { ripple: 0,   sway: .012, turn: .05, leaf: .02,  float: 0, blink: [3, 7], breathe: .01, h: .46 },
  cho:     { ripple: 0,   sway: .03,  turn: 0,   leaf: .01,  float: 0, blink: [4, 9], breathe: 0, wing: .9, h: .3 },
  hitsuji: { ripple: 0,   sway: .008, turn: .12, leaf: .01,  float: 0, blink: [3.5, 8], breathe: .012, h: .5 },
  tori:    { ripple: 0,   sway: .01,  turn: .35, leaf: .008, float: 0, blink: [2.5, 6], breathe: .015, wing: .08, h: .4 },
  ki:      { ripple: 0,   sway: .006, turn: 0,   leaf: .02,  float: 0, blink: [4, 10], breathe: .004, h: .8 },
  tsuchi:  { ripple: 0,   sway: .002, turn: 0,   leaf: .015, float: 0, blink: [5, 11], breathe: .004, h: .42 },
  tanuki:  { ripple: 0,   sway: .01,  turn: .15, leaf: .015, float: 0, blink: [3, 7], breathe: .012, h: .4 },
  suzume:  { ripple: 0,   sway: .012, turn: .5,  leaf: .01,  float: 0, blink: [2, 5], breathe: .018, wing: .1, h: .2 },
  mitsubachi: { ripple: 0, sway: .04, turn: 0,  leaf: .008, float: 0, blink: [4, 9], breathe: 0, wing: .7, h: .11, hover: .9 },
  _:       { ripple: 0,    sway: .02,  turn: .1,  leaf: .012, float: .015, blink: [3.5, 8], breathe: .008 },
};
/* 11-02 本人「依代について、必ずしも白にしなくてもいいです。木のみきは白でなく、リアルな茶色系にしてください。ほかも同様に自然な色合いに」
   → 姿ごとに素材らしい落ち着いた色（材質の名で塗る）。葉の房（tuft・lf・lv）と点の目（eye）はそのまま＝碧と並んで浮かないチャーム。 */
/* 11-02 本人（改め 2）「色は自然の色にしつつ、何か依代の目印のものをつけるイメージにしたいです。」
   → 体は素材らしい自然な色。依代の目印＝碧の髪の色の葉の房（tuft）・点の目・碧の衣の色の小さな印（mark＝首元の細い帯。無い形は葉の房と目）。目印の材質は塗りかえない。 */
const NATURAL = {
  ki:      [[/^trunk/, "#6e5643", .95], [/^pb/, "#8c8478", .9], [/^mo/, "#6f8a52", .95]],
  tsuchi:  [[/^s0/, "#5b4532", .95], [/^s1/, "#7a5b3d", .95], [/^s2/, "#4c3a2a", .95], [/^s3/, "#86664a", .95], [/^s4/, "#5f4a36", .95], [/^s5/, "#3f3124", .95], [/^sl/, "#6b5440", .95], [/^root/, "#cdbb9c", .9], [/^sprout/, "#7c9f4c", .8], [/^pb/, "#8c8478", .9]],
  kitsune: [[/^body/, "#a8805e", .9], [/^tail/, "#b08b68", .9], [/^paw/, "#4a3a30", .9], [/^ear/, "#8a5a38", .9], [/^nose/, "#2b2420", .7]],
  hitsuji: [[/^w\d/, "#e6ddcc", .95], [/^m\d/, "#d9cfbc", .95], [/^face/, "#4a423b", .9], [/^legm/, "#4a423b", .9], [/^hoof/, "#2f2925", .85], [/^(horn|hg)/, "#b3a283", .85]],
  tori:    [[/^body/, "#8e7c64", .9], [/^ch/, "#ddd3bf", .9], [/^fe/, "#6c5c48", .9], [/^bl/, "#5a4c3c", .9], [/^branch/, "#6a5240", .95]],
  cho:     [[/^w-?1/, "#5f9a8e", .8], [/^wl/, "#2f3a36", .85], [/^pan/, "#e9e4d6", .85], [/^vn/, "#3a3a34", .85], [/^bfly/, "#2a2a26", .85]],
  ishi:    [[/^Icosphere/, "#8b8578", .95], [/^peb/, "#9a9284", .95]],
  shizuku: [[/^(drop|body|water)/, "#cfe6ea", .2]],
};
const RM = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const role = (name, kind) => /^(eye|ey|hl)/.test(name) ? "eye" : (kind === "cho" && /^(w|wl|pan|bfly)/.test(name)) || (kind === "tori" && /^fe/.test(name)) || (kind === "suzume" && /^fe/.test(name)) || (kind === "mitsubachi" && /^w1/.test(name)) ? "wing" : /^(lf|leaf|tuft|mo|lv|sprout|tail|berry)/.test(name) ? "leaf" : /^(water|bub)/.test(name) ? "float" : "body";

// 材質に、時間で頂点を小さくずらす処理を足す（形の単位の座標で。地面に近い所ほど動かない）
function patch(mat, U, kind) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = U.t; sh.uniforms.uA = U[kind]; sh.uniforms.uPh = U.ph; if (kind === "wing") sh.uniforms.uW = U.wa;
    sh.vertexShader = "uniform float uT; uniform float uA; uniform float uPh;" + (kind === "wing" ? " uniform float uW;" : "") + "\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      { float h = max(0.0, position.y);
        ${kind === "body" ? `float w = sin(position.y * 23.0 + uT * 1.7 + uPh) * sin(position.x * 19.0 - uT * 1.3) + .6 * sin(position.z * 29.0 + uT * 2.3 + uPh * .7);
        transformed += normal * w * uA * smoothstep(.0, .25, h);` : ""}
        ${kind === "leaf" ? `float s = sin(uT * 1.9 + position.x * 9.0 + uPh) + .5 * sin(uT * 3.1 + position.z * 13.0);
        transformed.x += s * uA * smoothstep(.0, .3, h); transformed.z += .6 * cos(uT * 1.5 + position.y * 11.0 + uPh) * uA;` : ""}
        ${kind === "float" ? `float k = smoothstep(.04, .12, h);
        transformed.y += sin(uT * .9 + position.x * 7.0 + position.z * 5.0 + uPh) * uA * k; transformed.x += sin(uT * .6 + position.y * 9.0) * uA * .4 * k;` : ""}
        ${kind === "wing" ? `float a = uW * uA; float ax = abs(transformed.x); transformed.z -= ax * sin(a); transformed.x = sign(transformed.x) * ax * cos(a);` : ""}
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
    this.co = null; this.ask = 0; this.v3 = new THREE.Vector3(); this.fr = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.sp = new THREE.Sphere();
  }
  // 碧と仲良く：aoi()＝{x,y,z,yaw}|null、speaking()＝話しているか、viewer()＝見る人の位置、onGreet(it)＝依代が碧へ向いて弾んだとき（碧が目をやる）
  setCompanion(o) { this.co = o; }
  react(what) { if (what === "ask") this.ask = 1.6; }
  async add(kind, { x = 0, z = 0, y = null, yaw = 0, scale = .5, height = 0, follow = false, onTouch = null } = {}) {
    if (!YORISHIRO_KINDS[kind]) throw new Error("unknown yorishiro: " + kind);
    const g = await this.loader.loadAsync(new URL(`./${kind}.glb${new URL(import.meta.url).search || ""}`, import.meta.url).href);
    const M = KIND_MOTION[kind] || KIND_MOTION._, ph = Math.random() * 6.28;
    const U = { t: { value: 0 }, ph: { value: ph }, body: { value: RM ? 0 : M.ripple }, leaf: { value: RM ? 0 : M.leaf }, float: { value: RM ? 0 : M.float }, wing: { value: RM ? .15 : (M.wing || 0) }, wa: { value: 0 } };
    const root = new THREE.Group(), sway = new THREE.Group(), body = g.scene; sway.add(body); root.add(sway);
    const eyes = [];
    const eyeM = [];
    body.traverse(o => {
      if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
      const m = o.material, r = role(m?.name || "", kind);
      if (m) { const nm = m.name || "", P = NATURAL[kind] || []; for (const [re, col, rough] of P) if (re.test(nm)) { m.color.set(col); if (rough) m.roughness = rough; if (kind === "shizuku" && re.source.startsWith("^(drop")) { m.transparent = true; m.opacity = .45; m.depthWrite = false; } break; } }   // 11-02 本人「必ずしも白にしなくてもいい・自然な色合いに」
      if (m && m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = Math.min(m.opacity ?? 1, .62); m.depthWrite = false; m.needsUpdate = true; }   // 11-02：透過（transmission）は画面全体をもう一度描く（初めて見えたとき全部の影絵を組み直して 350 ms 止まり、以後も毎コマ重い）＝半透明に置きかえる
      if (m && m.roughness !== undefined && !(m.transmission > 0)) m.roughness = Math.max(m.roughness, .65);   // マットに
      if (r === "eye") eyeM.push(o);   // 瞬き：あとで目の中心に軸を置く（走査中に木の組みを変えない） else if (m && (r !== "body" || M.ripple)) { o.material = m.clone(); patch(o.material, U, r); }
    });
    for (const o of eyeM) {   // 目の中心を軸に縦につぶす（形を写してから＝左右の目で形を共有していても崩れない・節の回転と大きさを保つ）
      o.geometry = o.geometry.clone(); o.geometry.computeBoundingBox(); const c = o.geometry.boundingBox.getCenter(new THREE.Vector3());
      o.geometry.translate(-c.x, -c.y, -c.z); const pv = new THREE.Group(), par = o.parent;
      pv.position.copy(o.position).add(c.clone().multiply(o.scale).applyQuaternion(o.quaternion)); pv.quaternion.copy(o.quaternion); pv.scale.copy(o.scale);
      par.add(pv); pv.add(o); o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.set(1, 1, 1); eyes.push(o);
    }
    if (height) { body.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(body), hh = bb.max.y - bb.min.y; if (hh > 1e-4) scale = height / hh; body.position.y -= bb.min.y; }   // 高さ（m）で大きさを決め、足を地面に
    root.position.set(x, y ?? this.groundAt(x, z), z); root.rotation.y = yaw; root.scale.setScalar(scale);
    root.userData.yorishiro = kind; this.scene.add(root);
    const it = { kind, root, sway, body, eyes, U, M, yaw0: yaw, yaw, onTouch, hop: 0, ph, blinkAt: M.blink[0] * Math.random(), blinkT: -1, twice: false, follow, near: false, greetT: 0, v: 0, by: body.position.y, home: { x, z }, side: Math.random() < .5 ? 1 : -1 };
    this.items.push(it); return it;
  }
  update(dt) {
    dt = Math.min(dt, .1); this.t += dt; const t = this.t, co = this.co;
    const A = co?.aoi?.() || null, speaking = !!co?.speaking?.(), V = co?.viewer?.() || this.camera?.position; this.ask = Math.max(0, this.ask - dt);
    if (this.camera) { this.camera.updateMatrixWorld(); this.pm.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse); this.fr.setFromProjectionMatrix(this.pm); }
    for (const it of this.items) {
      const M = it.M, p = it.ph, R = it.root; it.U.t.value = t;
      if (it.follow && A) this.follow(it, A, V, dt, speaking);
      const cd = V ? Math.hypot(R.position.x - V.x, R.position.z - V.z) : 0;
      R.visible = cd < 70; if (!R.visible) continue;
      this.sp.center.copy(R.position); this.sp.radius = 1.2; if (cd > 60 || (this.camera && !this.fr.intersectsSphere(this.sp))) continue;   // 遠い・画面の外は動かさない
      // 碧へ・見る人へ向く（置いた姿）
      let want = null;
      if (!it.follow && A) {
        const da = Math.hypot(A.x - R.position.x, A.z - R.position.z), near = da < 9;
        if (near && !it.near && t - it.greetT > 25) { it.greetT = t; if (YORISHIRO_STILL.has(it.kind)) it.rustle = 1.6; else it.hop = 1; it.blinkAt = .3; co?.onGreet?.(it); }   // 動かない物は葉がそよぐだけ   // 碧が来た：一度だけ小さく弾む
        it.near = near;
        if (near || (speaking && da < 15)) want = Math.atan2(A.x - R.position.x, A.z - R.position.z);
        else if (V && cd < 4) want = Math.atan2(V.x - R.position.x, V.z - R.position.z);
      }
      if (YORISHIRO_STILL.has(it.kind)) want = null;
      it.rustle = Math.max(0, (it.rustle || 0) - dt); it.U.leaf.value = RM ? 0 : M.leaf * (1 + 1.5 * Math.min(1, it.rustle));   // 碧が来た・触れた：葉がわずかにそよぐ
      if (M.hover && !RM) R.position.y = (it.gy ?? (it.gy = R.position.y)) + M.hover + .06 * Math.sin(t * 1.3 + p) + .03 * Math.sin(t * 3.1);   // ミツバチ：花の高さでただよう
      if (it.kind === "suzume" && !RM && Math.sin(t * .9 + p * 3) > .985) it.hop = Math.max(it.hop, .6);   // スズメ：ときどき小さく跳ねる
      if (want !== null && M.turn > 0) { const d = Math.atan2(Math.sin(want - it.yaw0), Math.cos(want - it.yaw0)); it.yaw0 += d * Math.min(1, dt * 1.6); }
      if (!RM) {
        // 体：ゆっくりした揺れ（周期をそろえない二つの波を重ねる）と、向きのゆっくりした変化
        it.sway.rotation.z = M.sway * (Math.sin(t * .53 + p) * .7 + Math.sin(t * .31 + p * 1.7) * .3) + (this.ask > 0 && it.near ? .12 * Math.sin(Math.min(1, this.ask / 1.6) * Math.PI) * it.side : 0);   // 問いの一行：首をかしげるように
        it.sway.rotation.x = M.sway * .6 * Math.sin(t * .41 + p * .5) + (it.trot || 0);
        if (!it.follow) R.rotation.y = it.yaw0 + M.turn * (want !== null ? .15 : 1) * (Math.sin(t * .11 + p) * .75 + Math.sin(t * .067 + p * 2.1) * .25);
        if (M.wing) it.U.wa.value = it.kind === "cho" ? (Math.sin(t * 7.5 + p) * .5 + .5) * (.55 + .45 * Math.sin(t * .7 + p)) : Math.max(0, Math.sin(t * 9) ) * (Math.sin(t * .23 + p) > .93 ? 1 : 0);   // 蝶ははばたき・鳥はときどき羽をふるわせる
      }
      const b = RM ? 0 : Math.sin(t * 1.25 + p) * M.breathe;
      it.hop = Math.max(0, it.hop - dt * 2.2); const h = RM ? 0 : Math.sin(it.hop * Math.PI) * .06 + (it.bob || 0);   // 触れた・碧が来たときの小さな弾み
      it.body.scale.set(1 - b * .5, 1 + b + h * .4, 1 - b * .5); it.body.position.y = it.by + h * .5;
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
  // 碧のそばにいる姿（狐＝横を歩く・蝶＝肩の高さを回る）
  follow(it, A, V, dt, speaking) {
    const s0 = (l, cur) => Math.abs(l) < .3 ? cur : Math.sign(l);
    const R = it.root, t = this.t, s = it.side, cy = Math.cos(A.yaw || 0), sy = Math.sin(A.yaw || 0);
    let ox, oz, oy = 0;
    if (it.kind === "cho") { const a = t * .45 + it.ph; ox = Math.cos(a) * .75 + s * .2; oz = Math.sin(a * .8) * .55 - .1; oy = 1.25 + .18 * Math.sin(t * .9 + it.ph) + .06 * Math.sin(t * 2.3); }
    else {   // 碧の横（見る人から見て画面の内側になる方へ。3 秒ごとに見直す）・碧の陰にならないよう少し手前
      if (this.camera && t - (it.sideT || -9) > 3) { it.sideT = t; const q = sd => this.v3.set(A.x + sd * .85 * cy + .2 * sy, A.y + .2, A.z - sd * .85 * sy + .2 * cy).project(this.camera).x, l = Math.abs(q(-1)) - Math.abs(q(1)); it.side = s0(l * 4, it.side); }
      ox = it.side * .85; oz = .2; }
    const tx = A.x + ox * cy + oz * sy, tz = A.z - ox * sy + oz * cy, dx = tx - R.position.x, dz = tz - R.position.z, d = Math.hypot(dx, dz);
    if (d > 10) { R.position.x = tx; R.position.z = tz; it.v = 0; }   // 碧が立ち位置を移したら一緒に
    else if (it.kind === "cho") { const k = Math.min(1, dt * 1.4); R.position.x += dx * k; R.position.z += dz * k; }
    else { const want = d > .35 ? Math.min(2.6, d * 1.6) : 0; it.v += Math.max(-2.5 * dt, Math.min(1.6 * dt, want - it.v)); if (d > .01) { const st = Math.min(d, it.v * dt); R.position.x += dx / d * st; R.position.z += dz / d * st; } }
    const gy = (this.co?.ground || this.groundAt)(R.position.x, R.position.z);
    if (it.kind === "cho") { const ty = A.y + oy; R.position.y += (ty - R.position.y) * Math.min(1, dt * 2); if (R.position.y < gy + .5) R.position.y = gy + .5; }
    else R.position.y = gy;
    // 向き：動いていれば進む向き、止まれば（話している碧・近い見る人）へ
    let yaw;
    if (it.kind === "cho") yaw = Math.atan2(dx, dz) + .6 * Math.sin(t * .6);
    else if (it.v > .15) yaw = Math.atan2(dx, dz);
    else if (speaking || !V || Math.hypot(V.x - R.position.x, V.z - R.position.z) > 4) yaw = Math.atan2(A.x - R.position.x, A.z - R.position.z);
    else yaw = Math.atan2(V.x - R.position.x, V.z - R.position.z);
    const dy = Math.atan2(Math.sin(yaw - R.rotation.y), Math.cos(yaw - R.rotation.y)); R.rotation.y += dy * Math.min(1, dt * (it.kind === "cho" ? 2 : 3));
    it.near = true;
    // 歩くと小さく弾む（狐）
    if (it.kind !== "cho" && !RM) { it.ph2 = (it.ph2 || 0) + dt * (4 + it.v * 5); it.bob = it.v > .1 ? Math.abs(Math.sin(it.ph2)) * .035 * Math.min(1, it.v) : 0; it.trot = it.v > .1 ? .04 * Math.min(1, it.v) : 0; }
  }
  pick(cx, cy, el = document.body) {
    if (!this.items.length) return false;
    const r = el.getBoundingClientRect(); this.v2.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1);
    this.ray.setFromCamera(this.v2, this.camera);
    const hit = this.ray.intersectObjects(this.items.map(i => i.root), true)[0]; if (!hit) return false;
    let o = hit.object; while (o && !o.userData.yorishiro) o = o.parent;
    const it = this.items.find(i => i.root === o); if (!it) return false;
    if (YORISHIRO_STILL.has(it.kind)) it.rustle = 1.6; else it.hop = 1; it.blinkAt = .25; it.onTouch?.(it); return true;
  }
  dispose() { for (const it of this.items) this.scene.remove(it.root); this.items.length = 0; }
}
