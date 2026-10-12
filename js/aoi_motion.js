/* 碧（依代）の自然な動きと表情 ── aoi_motion.js（v2・2026-10-12）
   本人（2026-10-12）：「碧の動きを極限まで人間の自然な動作に近づけて」「表情も大事です」
   調べたこと・数値の出どころ＝../../資料/碧の自然な動き_調べ.md。外のモーションデータは使っていない（すべてこのファイルの中で作る動き）。

   使い方（どのアプリでも同じ）：
     import { AoiMotion } from "./kit/aoi_motion.js";
     const m = new AoiMotion(vrm, { root });        // root＝碧を置く入れ物（vrm.scene の親。無ければ vrm.scene）
     毎こま：m.update(dt, camera);                   // 中で vrm.update(dt) まで呼ぶ（{ vrmUpdate:false } で外せる）
     m.place(x, z, yaw)    いきなり置く（足もそろえる）
     m.walkTo(v3)          ばねで歩いて行く（足は地面に着いたまま、すべらない）
     m.drive(x, z)         アプリが自分で位置を決めるとき（壁の当たり判定など）。毎こま呼ぶ
     m.faceTo(yaw|null)    その向きへ足を踏みかえて向く（null＝見る人の方へ）
     m.lookAt(v3|Object3D|null)  見る先（null＝見る人）
     m.speak({ timeline, kana, text, dur, clock, level })  話す（口・身ぶり・視線・まばたき）。clock＝声の再生位置（秒）を返す関数
     m.stopSpeaking()      話し終わり
     m.listen(on)          聞く（うなずき・首をかしげる・目を合わせる）
     m.point(v3, sec)      指さす（目→手→見る人の順）
     m.bow("eshaku"|"keirei")  お辞儀（会釈 15°・敬礼 30°。腰から曲げ、背は伸ばす）
     m.express(name, w, sec)   表情（calm・warm・smile・curious・thinking・concern・surprise）。ふだんは calm
   何もしなくても：息（3.4〜4.8 秒で一回・吸う 4 割／吐く 6 割）・重心の移しかえ（片足に体重をのせ、骨盤が傾き、肩が逆に傾く）・
   小さな揺れ・まばたき（間隔は対数正規・話すと増える・視線を大きく動かすとき・二度まばたき）・目が先に動き頭が追う・
   ときどき目をそらす・腕は振り子として遅れてついてくる・表情の小さなゆらぎ。
   動きを減らす設定（reducedMotion）：揺れ・身ぶりを止め、まばたき・口・視線だけ残す。 */
import * as THREE from "three";

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const _v = [...Array(10)].map(() => new THREE.Vector3()), _q = [...Array(6)].map(() => new THREE.Quaternion()), _e = new THREE.Euler(), _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

// 臨界減衰のばね（行き過ぎない・急に止まらない）
class Spr {
  constructor(v = 0, w = 6) { this.v = v; this.d = 0; this.t = v; this.w = w; }
  step(dt, w = this.w) { const x = this.v - this.t, c = this.d + w * x, e = Math.exp(-w * dt); this.v = this.t + (x + c * dt) * e; this.d = (this.d - c * w * dt) * e; return this.v; }
  set(v) { this.v = this.t = v; this.d = 0; }
}
function rng(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// なめらかな揺らぎ（周期のそろわない三つの正弦の和。-1..1）
const wob = (t, s) => .55 * Math.sin(t * .31 + s) + .3 * Math.sin(t * .73 + s * 2.3) + .15 * Math.sin(t * 1.61 + s * 4.1);

// ---------------------------------------------------------------- 口の時刻表
// timeline＝{ m:[[開始秒, 長さ, 母音, 唇を閉じる子音か], …], b:[拍（強く読む音の時刻）…], p:[句の始まり…], d:全体の秒 }
// 母音＝a i u e o、N（ん）、cl（っ）、pau（間）。大文字の A I U E O は無声化（口はほとんど動かない）
const KV = {}; { const rows = { a: "アカガサザタダナハバパマヤラワャァヮ", i: "イキギシジチヂニヒビピミリィ", u: "ウクグスズツヅヌフブプムユルュゥヴ", e: "エケゲセゼテデネヘベペメレェ", o: "オコゴソゾトドノホボポモヨロヲョォ" }; for (const [v, s] of Object.entries(rows)) for (const c of s) KV[c] = v; }
const LIP = new Set("マミムメモバビブベボパピプペポ");
// かな（VOICEVOX の kana＝「ヨオコソ、/シンラ/…」）と長さから、時刻表をつくる（正確な時刻表が無いアプリ用）
export function timelineFromKana(kana, dur, { pre = .05, post = .12 } = {}) {
  const ms = []; let phrase = true, ph = [];
  for (const c of kana || "") {
    if (c === "/") { phrase = true; continue; }
    if (c === "、" || c === "，" || c === "。") { ms.push({ v: "pau", w: 1.8 }); phrase = true; continue; }
    if ("ャュョァィゥェォヮ".includes(c) && ms.length && ms[ms.length - 1].v !== "pau") { ms[ms.length - 1].v = KV[c]; continue; }
    const m = c === "ー" ? { v: ms.length ? ms[ms.length - 1].v : "a", w: 1 } : c === "ッ" ? { v: "cl", w: .8 } : c === "ン" ? { v: "N", w: .9 } : KV[c] ? { v: KV[c], w: 1, c: LIP.has(c) ? 1 : 0 } : null;
    if (!m) continue; if (phrase) { m.ph = 1; phrase = false; } ms.push(m);
  }
  const W = ms.reduce((s, m) => s + m.w, 0) || 1, k = Math.max(.1, dur - pre - post) / W; let t = pre; const out = { m: [], b: [], p: [], d: dur };
  for (const m of ms) { if (m.ph) { out.p.push(t); out.b.push(t + k * .5); } out.m.push([+t.toFixed(3), +(m.w * k).toFixed(3), m.v, m.c || 0]); t += m.w * k; }
  return out;
}
// 漢字まじりの字幕しかないとき（声のない文）：字の数から、おおよその口の動きをつくる（母音は字ごとに決まった並び）
export function timelineFromText(text, dur) {
  const K = "アイウエオカキクケコサシスセソタチツテトナニヌネノマミムメモ"; let s = "";
  for (const c of text || "") { if ("、。，．！？!?…".includes(c)) s += "、"; else if (/\s/.test(c)) s += "/"; else if (KV[c] || "ンッー".includes(c)) s += c; else s += K[c.charCodeAt(0) % K.length]; }
  return timelineFromKana(s, dur);
}
const VIS = { a: { aa: .78, oh: .08 }, i: { ih: .66, ee: .16 }, u: { ou: .6 }, e: { ee: .7, aa: .12 }, o: { oh: .72, ou: .08 }, N: { ou: .1 }, A: { aa: .12 }, I: { ih: .1 }, U: { ou: .1 }, E: { ee: .12 }, O: { oh: .12 } };
const MOUTH = ["aa", "ih", "ou", "ee", "oh"];

// ---------------------------------------------------------------- 表情（VRoid の顔の形から、アニメの誇張を避けた小さな動きを組む）
// 目を閉じて笑う「happy」や、口を大きく開ける形は使わない。頬が上がり目尻が締まる（デュシェンヌ）を、下まぶたの小さな上がりで表す
const CH = { smile: [["Fcl_MTH_Fun", 1]], squint: [["Fcl_EYE_Fun", 1]], browUp: [["Fcl_BRW_Surprised", 1]], browSad: [["Fcl_BRW_Sorrow", 1]], browJoy: [["Fcl_BRW_Fun", 1]], wide: [["Fcl_EYE_Spread", 1]], eyeSad: [["Fcl_EYE_Sorrow", 1]] };
export const EMOTIONS = {
  calm:     { smile: .14, squint: .05, browJoy: .10 },
  warm:     { smile: .32, squint: .17, browJoy: .2 },
  smile:    { smile: .5, squint: .27, browJoy: .3 },
  curious:  { smile: .08, browUp: .34, wide: .1 },
  thinking: { squint: .12, browSad: .2, eyeSad: .05 },
  concern:  { browSad: .42, eyeSad: .12, browUp: .06 },
  surprise: { browUp: .62, wide: .32 },
};

// ---------------------------------------------------------------- 本体
export class AoiMotion {
  constructor(vrm, { root = null, seed = 0, reducedMotion = false, wind = .6, faceViewer = true, startCalm = 2.2 } = {}) {
    this.vrm = vrm; this.root = root || vrm.scene; this.rand = seed ? rng(seed) : Math.random;
    this.live = !reducedMotion; this.wind = wind; this.faceViewer = faceViewer; this.t = 0; this.calm = startCalm;
    const H = vrm.humanoid; this.N = n => H.getNormalizedBoneNode(n);
    this.bones = {}; for (const n of ["hips", "spine", "chest", "upperChest", "neck", "head", "leftShoulder", "rightShoulder", "leftUpperArm", "rightUpperArm", "leftLowerArm", "rightLowerArm", "leftHand", "rightHand", "leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg", "leftFoot", "rightFoot", "leftToes", "rightToes"]) this.bones[n] = this.N(n);
    this.fingers = []; for (const s of ["left", "right"]) for (const f of ["Index", "Middle", "Ring", "Little", "Thumb"]) for (const j of ["Metacarpal", "Proximal", "Intermediate", "Distal"]) { const b = this.N(s + f + j); if (b) this.fingers.push([b, s, f, j]); }
    // 静止の形を測る（足首の高さ・腰の高さ・脚の長さ・足の長さ）
    H.resetNormalizedPose(); this.root.updateMatrixWorld(true);
    const B = this.bones, wp = (o, v) => o.getWorldPosition(v), rootInv = _m.copy(this.root.matrixWorld).invert();
    const loc = o => wp(o, new THREE.Vector3()).applyMatrix4(rootInv);
    this.rest = { hips: loc(B.hips), L: { up: loc(B.leftUpperLeg), foot: loc(B.leftFoot), toe: B.leftToes ? loc(B.leftToes) : null }, R: { up: loc(B.rightUpperLeg), foot: loc(B.rightFoot), toe: B.rightToes ? loc(B.rightToes) : null } };
    this.rest.hip0 = B.hips.position.clone();
    this.ankleH = (this.rest.L.foot.y + this.rest.R.foot.y) / 2; this.halfW = Math.abs(this.rest.L.foot.x - this.rest.R.foot.x) / 2;
    this.legLen = this.rest.hips.y - this.ankleH; this.footLen = this.rest.L.toe ? Math.max(.06, this.rest.L.toe.z - this.rest.L.foot.z) : .12;
    this.scale = new THREE.Vector3(); this.root.getWorldScale(this.scale); this.sc = this.scale.x || 1; this.vs = vrm.scene.getWorldScale(new THREE.Vector3()).x || 1; this.hk = this.sc / this.vs;
    // 状態
    const r0 = this.root;
    this.pos = new THREE.Vector3(r0.position.x, r0.position.y, r0.position.z); this.vel = new THREE.Vector3(); this.goal = null; this.driven = false; this._last = this.pos.clone();
    this.yaw = r0.rotation.y; this.faceYaw = null; this.speed = 0; this.k = 0;
    this.feet = { L: this._foot(1), R: this._foot(-1) }; this.lastStep = "R"; this._placeFeet();
    this.s = { br: 0, brP: 4.2, brU: 0, ws: new Spr(0, 1.6), wsHold: 3 + 4 * this.rand(), wsLvl: 0, lean: new Spr(0, 3), talk: new Spr(0, 3.2), listen: new Spr(0, 2.5), gest: new Spr(0, 5), point: new Spr(0, 4.5), bow: new Spr(0, 3), tilt: new Spr(0, 2), nod: new Spr(0, 9), armL: new Spr(0, 3.2), armR: new Spr(0, 3.2), armLz: new Spr(0, 3.2), armRz: new Spr(0, 3.2), beat: 0, beatSide: 1, hipY: new Spr(0, 7), turnLead: new Spr(0, 5) };
    this.seedPh = this.rand() * 100;
    // 目・頭
    this.gazeObj = new THREE.Object3D(); if (vrm.lookAt) vrm.lookAt.target = this.gazeObj;   // 親を持たない（位置＝世界の座標。場面の固定化の影響を受けない）
    this.look = { target: null, cur: new THREE.Vector3(0, 1.5, 3), sac: new THREE.Vector3(), sacT: .5, away: 0, awayDir: new THREE.Vector3(), awayT: 4 + 4 * this.rand(), hy: new Spr(0, 7), hp: new Spr(0, 7), last: new THREE.Vector3() };
    this.blink = { next: 1.5 + this.rand() * 2, t: -1, amp: 1, dbl: 0, v: 0 };
    // 表情
    this.face = { emo: "calm", emoW: new Spr(1, 3), hold: 0, ch: {}, mouth: Object.fromEntries(MOUTH.map(k => [k, new Spr(0, 26)])), spk: null, flash: 0 };
    this._initFace();
    // 揺れもの
    this.springs = (vrm.springBoneManager?.joints ? [...vrm.springBoneManager.joints] : []).map(j => ({ j, g: j.settings.gravityDir.clone(), p: j.settings.gravityPower }));
    this.pointing = null; this.bowing = null; this.listening = false; this.speaking = null;
  }
  _foot(side) { return { side, p: new THREE.Vector3(), yaw: 0, swing: null, heel: 0 }; }
  _home(f, out, lead = 0) {   // その足の置き場所（体の向き・左右の幅・少し外へ開いたつま先）
    const sx = f.side * this.halfW * this.sc * 1.05, c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    out.set(this.pos.x + sx * c + this.vel.x * lead, this.pos.y + this.ankleH * this.sc, this.pos.z - sx * s + this.vel.z * lead);
    return out;
  }
  _placeFeet() { for (const f of Object.values(this.feet)) { this._home(f, f.p); f.yaw = this.yaw + f.side * .1; f.swing = null; } }
  _initFace() {
    const em = this.vrm.expressionManager; this.morph = []; if (!em) return;
    const prims = em.getExpression("blink")?._binds?.[0]?.primitives || [];
    let meshes = prims.length ? prims : []; if (!meshes.length) this.vrm.scene.traverse(o => { if (o.morphTargetDictionary?.Fcl_MTH_A != null) meshes.push(o); });
    for (const [ch, list] of Object.entries(CH)) {
      const binds = []; for (const [name, w] of list) for (const m of meshes) { const i = m.morphTargetDictionary?.[name]; if (i != null) binds.push([m, i, w]); }
      this.face.ch[ch] = { v: new Spr(0, 6), binds };
    }
  }

  // ---------------------------------------------------------------- 外から呼ぶ
  place(x, z, yaw = this.yaw) { this.pos.set(x, this.root.position.y, z); this.vel.set(0, 0, 0); this.goal = null; this.yaw = yaw; this.faceYaw = null; this._last.copy(this.pos); this._apply(); this._placeFeet(); return this; }
  walkTo(v) { this.goal = v ? new THREE.Vector3(v.x, this.pos.y, v.z) : null; this.driven = false; return this; }
  drive(x, z) { this.driven = true; this.goal = null; this.pos.x = x; this.pos.z = z; return this; }
  faceTo(yaw) { this.faceYaw = yaw; return this; }
  lookAt(t) { this.look.target = t || null; return this; }
  express(name, w = 1, sec = 2.5) { if (!EMOTIONS[name]) return this; this.face.emo = name; this.face.emoW.t = clamp(w, 0, 1.2); this.face.hold = sec; return this; }
  listen(on = true) { this.listening = !!on; if (on) this.express("warm", .8, 1e9); else this.express("calm", 1, 0); return this; }
  speak({ timeline = null, kana = "", text = "", dur = 3, clock = null, level = null } = {}) {
    const tl = timeline || (kana ? timelineFromKana(kana, dur) : timelineFromText(text, dur)); const t0 = this.t;
    this.speaking = { tl, clock: clock || (() => this.t - t0), level, i: 0, bi: 0, nb: 0, pi: 0, dur: tl.d || dur, startAway: this.rand() < .55 };
    this.listening = false; this.blink.next = Math.min(this.blink.next, .25 + this.rand() * .4);
    if (this.rand() < .6) this.face.flash = .45;   // 話しはじめに眉が小さく上がる
    if (this.face.emo === "calm" || this.face.hold <= 0) this.express("warm", .9, (tl.d || dur) + 1);
    return this;
  }
  stopSpeaking() { this.speaking = null; return this; }
  point(v, sec = 2.6) { this.pointing = { p: v.clone ? v.clone() : new THREE.Vector3(v.x, v.y, v.z), t: 0, sec, side: 0 }; return this; }
  bow(kind = "eshaku") { const deg = kind === "keirei" ? 30 : kind === "saikeirei" ? 45 : 15; this.bowing = { a: deg * Math.PI / 180, t: 0, down: deg > 20 ? 1.15 : .8, hold: deg > 20 ? .8 : .45, up: deg > 20 ? 1.6 : 1.1 }; return this; }
  get busy() { return !!(this.speaking || this.pointing || this.bowing); }
  debug() { const f = this.feet; return `速さ ${this.speed.toFixed(2)}  足 L${f.L.swing ? "↑" : "_"} R${f.R.swing ? "↑" : "_"}  重心 ${this.s.ws.v.toFixed(2)}  ${this.speaking ? "話す" : this.listening ? "聞く" : ""}${this.bowing ? " 礼" : ""}${this.pointing ? " 指す" : ""}`; }

  // ---------------------------------------------------------------- 毎こま
  update(dt, camera, { vrmUpdate = true } = {}) {
    dt = Math.min(dt, .05); if (dt <= 0) return; this.t += dt; const S = this.s;
    this._locomotion(dt, camera);
    this._apply();
    const cam = camera ? camera.getWorldPosition(this._cam || (this._cam = new THREE.Vector3())) : null;
    this._body(dt);
    this.root.updateMatrixWorld(true);
    this._legs(dt);
    this._arms(dt);
    this._headEyes(dt, cam);
    this._faceTick(dt);
    if (this.springs.length && this.live && this.calm <= 0 && this.wind) { const t = this.t, a = this.wind; for (const s of this.springs) { s.j.settings.gravityDir.set(s.g.x + .18 * a * Math.sin(t * .63 + s.g.y), s.g.y, s.g.z + .1 * a * Math.sin(t * .41)).normalize(); s.j.settings.gravityPower = Math.max(s.p, .05); } }
    if (vrmUpdate) this.vrm.update(dt);
    if (this.calm > 0) { this.calm -= dt; this.vrm.springBoneManager?.setInitState?.(); this.vrm.springBoneManager?.reset?.(); }
  }
  _apply() { this.root.position.set(this.pos.x, this.pos.y, this.pos.z); this.root.rotation.y = this.yaw; }

  _locomotion(dt, camera) {
    const P = this.pos;
    if (this.goal && !this.driven) {   // ばねで目標へ（歩き出しはゆっくり、着く前にゆるめる）
      const w = 2.6, n = Math.max(1, Math.ceil(dt / .02)), h = dt / n;
      for (let i = 0; i < n; i++) { this.vel.x += (w * w * (this.goal.x - P.x) - 2 * w * this.vel.x) * h; this.vel.z += (w * w * (this.goal.z - P.z) - 2 * w * this.vel.z) * h; const m = Math.hypot(this.vel.x, this.vel.z); if (m > .85) this.vel.multiplyScalar(.85 / m); P.x += this.vel.x * h; P.z += this.vel.z * h; }
      if (P.distanceTo(this.goal) < .03 && this.vel.length() < .05) { this.goal = null; this.vel.set(0, 0, 0); }
    } else if (this.driven) {
      const vx = (P.x - this._last.x) / dt, vz = (P.z - this._last.z) / dt, a = 1 - Math.exp(-10 * dt);
      this.vel.x += (vx - this.vel.x) * a; this.vel.z += (vz - this.vel.z) * a;
    } else this.vel.multiplyScalar(Math.exp(-8 * dt));
    if (Math.hypot(P.x - this._last.x, P.z - this._last.z) > 1.6) { this._last.copy(P); this._apply(); this._placeFeet(); }   // とんだときは足をそろえ直す
    this._last.copy(P);
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    const kT = clamp((this.speed - .12) / .6, 0, 1); this.k += (kT - this.k) * (1 - Math.exp(-4 * dt));
    // 向き：歩くときは進む方へ、止まっているときは決めた向きか見る人の方へ（大きく違うときだけ。足を踏みかえて向く）
    let want = this.yaw;
    if (this.speed > .25) want = Math.atan2(this.vel.x, this.vel.z);
    else if (this.faceYaw != null) want = this.faceYaw;
    else if (this.pointing) want = Math.atan2(this.pointing.p.x - P.x, this.pointing.p.z - P.z) * .5 + this._toCam(camera) * .5;
    else if (this.faceViewer && camera) { const tc = this._toCam(camera); if (Math.abs(wrapA(tc - this.yaw)) > .5 || this.speaking || this.listening) want = tc; }
    const d = wrapA(want - this.yaw), rate = this.speed > .25 ? 2.6 : 1.5;
    this.yaw += clamp(d * (1 - Math.exp(-3.2 * dt)), -rate * dt, rate * dt);
    this.s.turnLead.t = clamp(d, -.9, .9); this.s.turnLead.step(dt);
  }
  _toCam(camera) { const c = camera.getWorldPosition(_v[8]); return Math.atan2(c.x - this.pos.x, c.z - this.pos.z); }

  // 姿勢の層（息・重心・揺れ・お辞儀・話す・聞く）を、骨の回転に重ねる
  _body(dt) {
    const S = this.s, B = this.bones, t = this.t, L = this.live, k = this.k, sp = this.seedPh;
    // 息：一回ごとに長さを少し変える。吸う 4 割・吐く 6 割
    if (L) { S.brU += dt / S.brP; if (S.brU >= 1) { S.brU -= 1; S.brP = (this.speaking ? 3.2 : 4.2) * (.85 + .3 * this.rand()); } }
    const u = S.brU, br = L ? (u < .4 ? sstep(u / .4) : 1 - sstep((u - .4) / .6)) : 0;
    // 重心：数秒〜十数秒ごとに、片足へ（体重の移し）。歩くときと、指す・礼のときは真ん中へ
    if (L) { S.wsHold -= dt; if (S.wsHold <= 0) { const r = this.rand(); S.wsLvl = r < .15 ? 0 : (S.wsLvl > 0 ? -1 : 1) * (.55 + .45 * this.rand()); S.wsHold = 5 + 9 * this.rand(); } }
    S.ws.t = (this.bowing || this.pointing) ? 0 : S.wsLvl * (1 - k); S.ws.step(dt); const ws = S.ws.v;
    const swX = L ? wob(t * .9, sp) : 0, swZ = L ? wob(t * .7, sp + 5) : 0;   // 静かに立つときの小さな揺れ（前後・左右に数 mm）
    // お辞儀
    let bw = 0; const bo = this.bowing; if (bo) { bo.t += dt; const a = bo.t, d1 = bo.down, d2 = d1 + bo.hold, d3 = d2 + bo.up; bw = a < d1 ? sstep(a / d1) : a < d2 ? 1 : a < d3 ? 1 - sstep((a - d2) / bo.up) : 0; if (a >= d3) this.bowing = null; }
    const bA = bo ? bo.a * bw : 0; this._bowA = bA;
    S.talk.t = this.speaking ? 1 : 0; S.talk.step(dt); S.listen.t = this.listening ? 1 : 0; S.listen.step(dt);
    const tk = S.talk.v * (L ? 1 : 0), ls = S.listen.v * (L ? 1 : 0);
    // 歩く：骨盤の回り・傾き、胸は逆にひねる（足の位置から）
    const g = this._gait || { u: 0, side: 0, ph: 0 }, gs = g.side * Math.sin(Math.PI * g.u) * k;
    this._pose = {};
    const P = (n, x = 0, y = 0, z = 0) => { this._pose[n] = [x, y, z]; };
    const lean = .05 * k + .02 * tk + .025 * ls;
    P("hips", bA * .7 + .02 * k, -.12 * g.ph * k + S.turnLead.v * .2, .055 * ws - .035 * gs);
    P("spine", lean * .4 + bA * .1 + .008 * br + .004 * swZ + .015 * (this._beat || 0), .07 * g.ph * k + S.turnLead.v * .15, -.05 * ws + .02 * gs);
    P("chest", lean * .3 + bA * .05 - .018 * br, .06 * g.ph * k + S.turnLead.v * .12, -.025 * ws + .012 * gs);
    P("upperChest", lean * .2 - .012 * br, .02 * g.ph * k, -.01 * ws);
    P("leftShoulder", 0, 0, .012 * br + .01 * ws); P("rightShoulder", 0, 0, -.012 * br + .01 * ws);
    // 頭の位置（首から上）は、見る先へ向ける前の基本の形。首・頭は胴の傾きを半分ほど打ち消す（目線を水平に保つ）
    const tilt = this._tilt(dt, ls);
    P("neck", -.06 * bA + .01 * br - lean * .3, 0, .025 * ws + tilt * .4);
    P("head", -.04 * bA + .02 * k - lean * .3 + S.nod.step(dt), 0, .02 * ws + tilt * .6);
    // 腰の位置：重心の側へ寄る・前後の揺れ・礼では後ろへ引く・歩くとき少し沈み、片足立ちの真ん中で高くなる
    S.hipY.t = -.024 * k + .02 * k * Math.sin(Math.PI * g.u) - .006 * Math.abs(ws) - .004 * br * (1 - k) - .06 * Math.sin(bA);   /* 礼では膝を少しゆるめる */ S.hipY.step(dt);
    this._hipOff = [.03 * ws + .004 * swX - .02 * gs, S.hipY.v, .005 * swZ - .07 * Math.sin(bA)];
    this._ws = ws; this._br = br; this._tk = tk; this._ls = ls; this._bw = bw;
    // 骨へ
    const hips = B.hips; if (hips) { const h0 = this.rest.hip0; hips.position.set(h0.x + this._hipOff[0] * this.hk, h0.y + this._hipOff[1] * this.hk, h0.z + this._hipOff[2] * this.hk); }
    for (const [n, r] of Object.entries(this._pose)) { const b = B[n]; if (b) b.quaternion.setFromEuler(_e.set(r[0], r[1], r[2])); }
  }
  _tilt(dt, ls) {   // 首をかしげる（聞くとき多く、ふだんは 20〜40 秒に一度）
    const S = this.s; if (!this.live) return 0;
    S._tl = (S._tl ?? 8) - dt * (1 + 2 * ls);
    if (S._tl <= 0) { S._tl = 18 + 20 * this.rand(); S.tilt.t = (this.rand() < .5 ? 1 : -1) * (.05 + .06 * this.rand()); S._tlHold = 1.8 + 2.5 * this.rand(); }
    if (S._tlHold != null) { S._tlHold -= dt; if (S._tlHold <= 0) { S.tilt.t = ls > .5 ? .03 : 0; S._tlHold = null; } }
    if (ls > .5 && this.rand() < dt * .25) S.nod.d += 2.2;   // 聞くときの小さなうなずき（数秒に一度）
    return S.tilt.step(dt);
  }

  // ---------------------------------------------------------------- 足：着いた足は動かさず、離れすぎたら一歩ずつ踏みかえる＋二関節の IK
  _legs(dt) {
    const F = this.feet, k = this.k, moving = this.speed > .15;
    // 踏みかえの判断
    const home = _v[0];
    // 歩く：片足を振る 0.38〜0.44 秒＋両足が着いている 0.1 秒（1 秒に 2 歩ほど・歩幅は身長の 4 割ほど）。着く足は、体より半歩先へ
    const swingT = moving ? clamp(.38 - .05 * this.speed, .32, .36) : .5, ds = .07, landLead = moving ? .5 * (swingT + ds) : 0;
    const swinging = F.L.swing || F.R.swing; this._ds = (this._ds || 0) - dt;
    if (!swinging && this._ds <= 0) {
      let best = null, bestE = 0;
      for (const key of ["L", "R"]) { const f = F[key]; this._home(f, home, moving ? swingT + landLead : 0); const e = Math.hypot(home.x - f.p.x, home.z - f.p.z), ye = Math.abs(wrapA(this.yaw + f.side * .1 - f.yaw)); const sc = e + ye * .25 + (key === this.lastStep ? -.04 : 0); if (sc > bestE) { bestE = sc; best = key; } }
      const th = moving ? .1 : .16;
      if (best && bestE > th) { const f = F[best]; f.swing = { from: f.p.clone(), fy: f.yaw, u: 0, T: swingT }; this.lastStep = best; }
    }
    let gait = { u: 0, side: 0, ph: 0 };
    for (const key of ["L", "R"]) {
      const f = F[key], sw = f.swing; if (!sw) continue;
      sw.u += dt / sw.T; const u = clamp(sw.u, 0, 1);
      this._home(f, home, moving ? (1 - u) * sw.T + landLead : 0);
      // 着く場所は振り出しの 7 割までに決め、横の動きは 85% で終える（下ろすあいだは横に動かさない＝着いてからすべらない）
      if (u < .7 || !sw.to) sw.to = (sw.to || new THREE.Vector3()).copy(home);
      const e = sstep(u / .85), to = sw.to; f.p.x = sw.from.x + (to.x - sw.from.x) * e; f.p.z = sw.from.z + (to.z - sw.from.z) * e;
      const lift = (moving ? .05 : .03) * this.sc * Math.pow(Math.sin(Math.PI * u), .7);   // すぐ地面から離れ、着く直前に下りる
      f.p.y = home.y + lift; f.yaw = sw.fy + wrapA(this.yaw + f.side * .1 - sw.fy) * e;
      f.pitch = moving ? (.22 * Math.sin(Math.PI * clamp(u / .45, 0, 1)) * (1 - u) - .14 * sstep((u - .7) / .3) * (1 - sstep((u - .95) / .05))) : .12 * Math.sin(Math.PI * u);
      gait = { u, side: f.side, ph: f.side * (2 * u - 1) };
      if (sw.u >= 1) { f.swing = null; f.p.x = sw.to.x; f.p.z = sw.to.z; f.p.y = home.y; f.pitch = 0; this._ds = moving ? ds : .15; }
    }
    this._gait = gait;
    // 二関節の IK
    for (const key of ["L", "R"]) {
      const f = F[key], s = key === "L" ? "left" : "right";
      // 後ろに残った足は、かかとから上がる（つま先を軸に）
      let heel = 0; if (!f.swing && moving) { const fw = _v[1].set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const behind = -((f.p.x - this.pos.x) * fw.x + (f.p.z - this.pos.z) * fw.z); heel = clamp((behind - .12 * this.sc) * 1.6 / this.sc, 0, .25) * k; /* 長い裾をけり上げないよう、かかとの上がりは小さめ */ }
      f.heel += (heel - f.heel) * (1 - Math.exp(-14 * dt));
      const tgt = _v[2].copy(f.p), pitch = (f.swing ? f.pitch : 0) + f.heel;
      if (f.heel > 1e-3) { const fl = this.footLen * this.sc, cy = Math.cos(f.yaw), sy = Math.sin(f.yaw); tgt.x += sy * fl * (1 - Math.cos(f.heel)); tgt.z += cy * fl * (1 - Math.cos(f.heel)); tgt.y += fl * Math.sin(f.heel); }
      this._ik(s, tgt, f.yaw, pitch);
    }
  }
  _ik(s, T, footYaw, footPitch) {
    const up = this.bones[s + "UpperLeg"], lo = this.bones[s + "LowerLeg"], ft = this.bones[s + "Foot"]; if (!up || !lo || !ft) return;
    up.parent.updateWorldMatrix(true, false);
    const A = up.getWorldPosition(_v[3]), sc = this.sc, l1 = lo.position.length() * this.vs, l2 = ft.position.length() * this.vs;
    const AT = _v[4].subVectors(T, A); let d = AT.length(); const dir = AT.divideScalar(d || 1);
    d = clamp(d, Math.abs(l1 - l2) + 1e-4, (l1 + l2) * .9995);
    const ca = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
    // 膝の向き：体の前と、足の向きのあいだ
    const pole = _v[5].set(Math.sin(footYaw) + Math.sin(this.yaw), 0, Math.cos(footYaw) + Math.cos(this.yaw)).normalize();
    pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const K = _v[6].copy(A).addScaledVector(dir, l1 * ca).addScaledVector(pole, l1 * sa);
    const Tc = _v[7].copy(A).addScaledVector(dir, d);
    // 太もも
    const pq = up.parent.getWorldQuaternion(_q[0]), pqi = _q[1].copy(pq).invert();
    const w1 = _v[8].subVectors(K, A).normalize().applyQuaternion(pqi);
    const q1 = _q[2].setFromUnitVectors(_v[9].copy(lo.position).normalize(), w1);
    // ねじれ：膝のお皿が pole を向くように
    const fwdL = _v[3].set(0, 0, 1).applyQuaternion(q1), pl = _v[4].copy(pole).applyQuaternion(pqi);
    fwdL.addScaledVector(w1, -fwdL.dot(w1)); pl.addScaledVector(w1, -pl.dot(w1));
    if (fwdL.lengthSq() > 1e-6 && pl.lengthSq() > 1e-6) { fwdL.normalize(); pl.normalize(); const ang = Math.atan2(_v[5].crossVectors(fwdL, pl).dot(w1), fwdL.dot(pl)); q1.premultiply(_q[3].setFromAxisAngle(w1, ang)); }
    up.quaternion.copy(q1); up.updateWorldMatrix(false, false);
    // すね
    const uq = up.getWorldQuaternion(_q[0]), uqi = _q[1].copy(uq).invert();
    const w2 = _v[8].subVectors(Tc, K).normalize().applyQuaternion(uqi);
    lo.quaternion.setFromUnitVectors(_v[9].copy(ft.position).normalize(), w2); lo.updateWorldMatrix(false, false);
    // 足首：地面に平ら（足の向き・つま先の上げ下げ）
    const lq = lo.getWorldQuaternion(_q[0]).invert();
    const fq = _q[4].setFromEuler(_e.set(footPitch, footYaw, 0, "YXZ"));
    ft.quaternion.copy(lq.multiply(fq));
    if (this.bones[s + "Toes"]) this.bones[s + "Toes"].quaternion.setFromEuler(_e.set(-Math.min(.5, footPitch > .15 ? footPitch * .8 : 0), 0, 0));
  }

  // ---------------------------------------------------------------- 腕：振り子のように遅れてついてくる・歩くと脚と逆に振れる・話すと手が上がる・指す
  _arms(dt) {
    const S = this.s, B = this.bones, k = this.k, t = this.t, L = this.live, ws = this._ws, br = this._br;
    // 歩くときの腕の振り：反対の足の前後の位置から（右腕は左足と一緒に前へ）
    const fw = _v[0].set(Math.sin(this.yaw), 0, Math.cos(this.yaw)), F = this.feet;
    const fl = ((F.L.p.x - this.pos.x) * fw.x + (F.L.p.z - this.pos.z) * fw.z) / (.17 * this.sc), fr = ((F.R.p.x - this.pos.x) * fw.x + (F.R.p.z - this.pos.z) * fw.z) / (.17 * this.sc);
    S.armL.t = -clamp(fr, -1, 1) * .45 * k; S.armR.t = -clamp(fl, -1, 1) * .45 * k;
    // 体の揺れ・向きの変化で、腕が少し遅れる（振り子）
    S.armLz.t = -.6 * S.turnLead.v * (1 - k) * .1 + .04 * ws; S.armRz.t = -.6 * S.turnLead.v * (1 - k) * .1 + .04 * ws;
    for (const n of ["armL", "armR"]) S[n].step(dt, 7);   // 腕は少し遅れてついてくる（振り子）
    for (const n of ["armLz", "armRz"]) S[n].step(dt);
    // 話すときの手：右手が主、ときどき両手。拍で小さく打つ
    // 話す身ぶり：句ごとに「手を下ろしたまま／右手／両手／左手」を選び、長い間では手を下ろす（いつも同じ構えにしない）。
    // 拍（強く読む音）は全部は打たない（6 割ほど・強さもまちまち）。うなずき・眉も拍の一部にだけ
    const sp = this.speaking; let beat = 0;
    if (sp) { const c = sp.clock(), b = sp.tl.b || [], Pp = sp.tl.p || [], Mm = sp.tl.m || [];
      if (!sp.amp) sp.amp = b.map(() => this.rand() < .38 ? 0 : .45 + .55 * this.rand());
      while (sp.pi < Pp.length && Pp[sp.pi] <= c + .3) { const r = this.rand(); sp.plan = sp.pi === 0 && r < .5 ? 1 : r < .3 ? 0 : r < .62 ? 1 : r < .84 ? 2 : 3; sp.var = this.rand(); sp.var2 = this.rand(); if (sp.pi > 0 && L && this.rand() < .22 && this.look.away <= 0) { this.look.away = .45 + .4 * this.rand(); this._pickAway(); } sp.pi++; }   /* 句の切れ目で、ときどき目をそらして考える */
      const mo = Mm[sp.i]; if (mo && mo[2] === "pau" && mo[1] > .26 && c > mo[0] + .05) sp.plan = 0;
      while (sp.bi < b.length && b[sp.bi] < c - .35) sp.bi++;
      for (let i = Math.max(0, sp.bi - 1); i < Math.min(b.length, sp.bi + 2); i++) { const x = c - (b[i] - .06); if (x > -.18 && x < .45) beat = Math.max(beat, sp.amp[i] * (x < 0 ? sstep(1 + x / .18) : 1 - sstep(x / .45))); }
      while (sp.nb < b.length && b[sp.nb] - .06 <= c) { const a = sp.amp[sp.nb]; if (L && a > 0 && this.rand() < .4) S.nod.d += .6 + 1.1 * a * this.rand(); if (L && a > .8 && this.rand() < .3) this.face.flash = .32; sp.nb++; }
      if (c > (sp.dur || 0) + .35) this.speaking = null; }
    const pl = sp && L ? (sp.plan ?? 1) : 0, gon = (1 - k * .7) * (1 - this._bw);
    S.gest.t = (pl === 1 || pl === 2 ? 1 : pl === 3 ? .3 : 0) * gon; S.gest.step(dt, 4.2);
    S.gestL = S.gestL || new Spr(0, 4.2); S.gestL.t = (pl === 2 || pl === 3 ? 1 : pl === 1 ? .3 : 0) * gon; S.gestL.step(dt);
    S.gVar = (S.gVar ?? .5) + ((sp?.var ?? .5) - (S.gVar ?? .5)) * (1 - Math.exp(-3 * dt)); S.gVar2 = (S.gVar2 ?? .5) + ((sp?.var2 ?? .5) - (S.gVar2 ?? .5)) * (1 - Math.exp(-3 * dt));
    const g = S.gest.v, g2 = S.gestL.v, bt = beat; this._beat = beat;
    // 指す
    let pw = 0, aimY = 0, aimP = 0, side = 1; const po = this.pointing;
    if (po) { po.t += dt; const a = po.t, T = po.sec; pw = sstep((a - .35) / .45) * (1 - sstep((a - T + .5) / .5)); if (a > T) this.pointing = null;
      const toT = Math.atan2(po.p.x - this.pos.x, po.p.z - this.pos.z); aimY = wrapA(toT - this.yaw); side = aimY >= 0 ? 1 : -1;   // 左にあるものは左手
      const dist = Math.hypot(po.p.x - this.pos.x, po.p.z - this.pos.z); aimP = Math.atan2(po.p.y - 1.3 * this.sc, dist); po.side = side; }
    S.point.t = pw; S.point.step(dt); const pe = S.point.v;
    // お辞儀：腕は下へ垂れる（胴が前へ傾いた分、肩で戻す）・手は体の前で重ねる
    const bA = this._bowA || 0, bw = this._bw;
    // 休めの形（上腕：脇へ下ろす・前腕：少し曲げる・手首：腿へ向く）
    const rest = (sd, swing, swingZ) => { const sg = sd === "left" ? 1 : -1;
      return { ua: [-.06 + swing - bA * .3, sg * (.06 - .62 * bw), sg * (-1.3 + .02 * br + swingZ * sg) - sg * .02 * bw], la: [0, sg * -(.3 + .12 * k + .1 * Math.max(0, -swing / .45) * k * 2 + .38 * bw), 0], h: [.04 - .35 * bw, sg * (.05 + .25 * bw), sg * .1] }; };
    const sides = { left: rest("left", S.armL.v, S.armLz.v), right: rest("right", S.armR.v, S.armRz.v) };
    // 話す身ぶり（手のひらを少し上へ、体の前、腰〜胸の高さ）
    const gestPose = (sd, w, b) => { const sg = sd === "left" ? 1 : -1, o = sides[sd];
      // 肘は脇の近く（上腕はほぼ縦・少し内へ回す）、前腕は水平より 25〜45° 下、手は腰の前に寄る。構えの高さは句ごとに少し変える
      const v = S.gVar, bb = b * w;
      o.ua = [o.ua[0] + (-.03 - .05 * v) * w, o.ua[1] - sg * (.32 + .12 * v) * w, o.ua[2] + sg * .06 * w];
      o.la = [o.la[0], o.la[1] + sg * -(.52 + .3 * v - .2 * bb) * w, o.la[2]];
      const v2 = S.gVar2; o.h = [o.h[0] - (.3 + .4 * v2) * w, o.h[1] + sg * (-.3 + .35 * v2) * w, o.h[2] + sg * (-.12 + .18 * b) * w]; };
    gestPose("right", g, bt); gestPose("left", g2, bt * .7);
    // 指す腕
    if (pe > 1e-3) { const sd = side > 0 ? "left" : "right", sg = side > 0 ? 1 : -1, o = sides[sd];
      const yawL = clamp(aimY * sg, -.4, 1.5);   // 体の前を 0、外へ広がる向きを正
      const tgtUA = [-(Math.PI / 2 - .25) * Math.cos(yawL) * .95 - aimP * .6, sg * (Math.PI / 2 - .25) * Math.sin(Math.max(0, yawL)) * .5, sg * (-1.24 + 1.0 + .6 * Math.max(0, yawL))];
      o.ua = o.ua.map((v, i) => v + (tgtUA[i] - v) * pe); o.la = o.la.map((v, i) => v + ([0, sg * -.15, 0][i] - v) * pe); o.h = o.h.map((v, i) => v + ([0, 0, sg * .05][i] - v) * pe);
      this._pointSide = sd; this._pointW = pe; } else this._pointW = 0;
    for (const sd of ["left", "right"]) { const o = sides[sd];
      B[sd + "UpperArm"]?.quaternion.setFromEuler(_e.set(...o.ua)); B[sd + "LowerArm"]?.quaternion.setFromEuler(_e.set(...o.la)); B[sd + "Hand"]?.quaternion.setFromEuler(_e.set(...o.h)); }
    // 指：力を抜いた曲がり（人差し指から小指へ深く）。指すときは人差し指を伸ばす
    const cu = .3 + .06 * k + (L ? .03 * wob(t * .4, this.seedPh + 2) : 0);
    for (const [b, sd, f, j] of this.fingers) { const sg = sd === "left" ? 1 : -1;
      if (f === "Thumb") { b.quaternion.setFromEuler(_e.set(0, sg * (j === "Metacarpal" ? .25 : j === "Proximal" ? .2 : .12), sg * -(j === "Distal" ? .18 : .06))); continue; }
      const m = { Index: .78, Middle: 1, Ring: 1.08, Little: 1.2 }[f] * (j === "Proximal" ? 1 : j === "Intermediate" ? 1.15 : .8);
      let c = cu * m; if (sd === (this._pointSide || "") && this._pointW > 0) c = f === "Index" ? c * (1 - this._pointW) : c + .5 * this._pointW;
      if (sd === "right" && g > 0) c *= 1 - .35 * g; if (sd === "left" && g2 > 0) c *= 1 - .35 * g2;   // 話すとき、手は少しひらく
      b.quaternion.setFromEuler(_e.set(0, 0, -sg * c)); }
  }

  // ---------------------------------------------------------------- 目と頭：目が先に（サッカード）、頭は 0.1〜0.2 秒遅れてついていく。ときどき目をそらす
  _headEyes(dt, cam) {
    const Lk = this.look, B = this.bones, L = this.live;
    const head = B.head; if (!head) return;
    // 見る先
    const tgt = _v[0];
    const po = this.pointing;
    if (po && po.t < po.sec - .6 && po.t > .05) tgt.copy(po.p);
    else if (Lk.target) { if (Lk.target.isObject3D) Lk.target.getWorldPosition(tgt); else tgt.copy(Lk.target); }
    else if (cam) tgt.copy(cam); else tgt.set(this.pos.x + Math.sin(this.yaw) * 3, 1.5 * this.sc, this.pos.z + Math.cos(this.yaw) * 3);
    // 歩くとき：ふだんは 5〜8 m 先の道を見て、ときどき（3〜6 秒ごとに 1 秒ほど）見る人を見る
    if (!Lk.target && !(po && po.t < po.sec - .6) && this.k > .45) { Lk.wg = (Lk.wg ?? 2) - dt; if (Lk.wg < -1.1) Lk.wg = 3 + 3 * this.rand();
      if (Lk.wg > 0) { const d = 6.5 * this.sc; tgt.set(this.pos.x + Math.sin(this.yaw) * d, 1.15 * this.sc + this.pos.y, this.pos.z + Math.cos(this.yaw) * d); } }
    if (this._bowA > .05) { const hp = head.getWorldPosition(_v[1]); tgt.set(hp.x + Math.sin(this.yaw) * 2, this.pos.y, hp.z + Math.cos(this.yaw) * 2); }   // 礼のときは足もとの少し先（目を伏せる）
    // 目をそらす：話しはじめ・考えるとき・ふだんもときどき（下や横へ。上はまれ）
    if (L) { Lk.awayT -= dt;
      const sp = this.speaking, startAway = sp && sp.startAway && sp.clock() < .9;
      if (startAway && Lk.away <= 0) { Lk.away = .7 + .5 * this.rand(); this._pickAway(); sp.startAway = false; }
      if (Lk.awayT <= 0 && !po && this._bowA < .05 && this.k < .3) { Lk.awayT = (this.listening ? 9 : sp ? 3.5 : 5) + 6 * this.rand(); if (!this.listening) { Lk.away = .5 + 1.1 * this.rand(); this._pickAway(); } } }
    if (Lk.away > 0) { Lk.away -= dt; const hp = head.getWorldPosition(_v[1]); tgt.copy(hp).add(Lk.awayDir); }
    // 大きく動いたら：目は一気に（サッカード）、頭はばねで。視線が大きく動くときにまばたき
    const hpos = head.getWorldPosition(_v[2]);
    const dNew = _v[3].subVectors(tgt, hpos).normalize(), dOld = _v[4].subVectors(Lk.cur, hpos).normalize();
    const jump = dNew.angleTo(dOld);
    if (jump > .04) { if (jump > .3 && this.rand() < .65) this.blink.next = Math.min(this.blink.next, .02); Lk.cur.copy(tgt); }
    else Lk.cur.lerp(tgt, 1 - Math.exp(-12 * dt));   // ゆっくり動くものは目で追う
    // 頭の向き：胸から見た角度の 7 割（目が残りを受け持つ）。首 4 割・頭 6 割
    const ch = (B.upperChest || B.chest || B.spine); const cq = ch.getWorldQuaternion(_q[0]).invert();
    const dl = _v[5].subVectors(Lk.cur, hpos).applyQuaternion(cq);
    const yawT = Math.atan2(dl.x, dl.z), pitT = Math.atan2(-dl.y, Math.hypot(dl.x, dl.z));
    Lk.hy.t = clamp(yawT * .72, -1.0, 1.0) * (L ? 1 : .6); Lk.hp.t = clamp(pitT * .6, -.35, .45);
    Lk.hy.step(dt); Lk.hp.step(dt);
    const nk = B.neck; const qy = _q[1], qn = _q[2];
    // 大きく振り向くときは、胸も少し回す（首だけで回さない）。目→頭→胸の順に遅れて
    const hyv = Lk.hy.v, big = Math.sign(hyv) * Math.max(0, Math.abs(hyv) - .3) * .45; Lk.cy = (Lk.cy ?? 0) + (big - (Lk.cy ?? 0)) * (1 - Math.exp(-4 * dt));
    const cb = B.upperChest || B.chest; if (cb && Math.abs(Lk.cy) > 1e-4) cb.quaternion.premultiply(_q[3].setFromEuler(_e.set(0, Lk.cy, 0)));
    const hy2 = hyv - Lk.cy;
    if (nk) { qn.setFromEuler(_e.set(Lk.hp.v * .4, hy2 * .4, 0)); nk.quaternion.premultiply(qn); }
    qy.setFromEuler(_e.set(Lk.hp.v * .6, hy2 * .6, 0)); head.quaternion.premultiply(qy);
    // 目の小さな動き（固視中のマイクロサッカード：1 秒に 1〜2 回、1° 未満）
    if (L) { Lk.sacT -= dt; if (Lk.sacT <= 0) { Lk.sacT = .35 + .7 * this.rand(); const d = Lk.cur.distanceTo(hpos) * .012; Lk.sac.set((this.rand() - .5) * d, (this.rand() - .5) * d * .7, (this.rand() - .5) * d); } }
    this.gazeObj.position.copy(Lk.cur).add(Lk.sac);
    // 下を見るとき、上まぶたも少し下がる
    this._lidDown = clamp(-Math.atan2(Lk.cur.y - hpos.y, Math.hypot(Lk.cur.x - hpos.x, Lk.cur.z - hpos.z)) - .12, 0, .5) * .45;
  }
  _pickAway() { const r = this.rand(), s = this.rand() < .5 ? -1 : 1, y = this.yaw + s * (.35 + .5 * this.rand()); const dn = r < .5 ? -(.2 + .3 * this.rand()) : r < .9 ? -.04 : .15;
    this.look.awayDir.set(Math.sin(y) * 2, dn * 2, Math.cos(y) * 2); }

  // ---------------------------------------------------------------- まばたき・表情・口
  _faceTick(dt) {
    const em = this.vrm.expressionManager; if (!em) return; const Bk = this.blink, Fc = this.face, L = this.live, sp = this.speaking;
    // まばたき：間隔は対数正規（ふだん中央値 3.4 秒・話すと 2.4 秒・聞くと 4 秒）。閉じる 70ms・止まる 40ms・ひらく 160ms。一割ほど二度まばたき
    Bk.next -= dt;
    if (Bk.t < 0 && Bk.next <= 0) { Bk.t = 0; Bk.amp = this.rand() < .15 ? .75 : 1; }
    if (Bk.t >= 0) { Bk.t += dt; const u = Bk.t; Bk.v = Bk.amp * (u < .07 ? sstep(u / .07) : u < .11 ? 1 : 1 - sstep((u - .11) / .16));
      if (u >= .27) { Bk.t = -1; Bk.v = 0; const med = sp ? 2.4 : this.listening ? 4 : 3.4; Bk.next = this.rand() < .09 ? .12 + .1 * this.rand() : Math.max(.7, med * Math.exp(.5 * this._gauss())); } }
    em.setValue("blink", Math.min(1, Bk.v + (this._lidDown || 0) + .02));
    // 表情：いまの感情へゆっくり寄せ、小さな揺らぎを足す。話すと口の笑みは半分（口の形とぶつかるので）
    if (Fc.hold > 0 && Fc.hold < 1e8) { Fc.hold -= dt; if (Fc.hold <= 0) { Fc.emo = this.listening ? "warm" : "calm"; Fc.emoW.t = 1; } }
    Fc.emoW.step(dt); const E = EMOTIONS[Fc.emo] || EMOTIONS.calm, t = this.t, sd = this.seedPh;
    if (Fc.flash > 0) Fc.flash -= dt;
    const fl = Fc.flash > 0 ? Math.sin(Math.PI * clamp(1 - Fc.flash / .45, 0, 1)) : 0;   // 眉を上げる（あいさつ・話しはじめ。約 0.2〜0.4 秒）
    const talkMouth = sp ? .45 : 1;
    for (const [ch, o] of Object.entries(Fc.ch)) {
      let v = (E[ch] || 0) * Fc.emoW.v;
      if (ch === "smile") v *= talkMouth;
      if (ch === "browUp") v += .35 * fl + .1 * (this._beat || 0);   // 強く読む音で眉が少し上がる
      if (sp && (ch === "smile" || ch === "squint")) { const c = sp.clock(), e = sstep((c - (sp.dur - .9)) / .5); v += (ch === "smile" ? .16 : .08) * e; }   // 言い終わりに、頬が少し上がる
      if (L) v += (ch === "smile" ? .035 : ch.startsWith("brow") ? (sp ? .07 : .03) : .015) * wob(t * (sp ? .9 : .5), sd + ch.length);
      if (ch === "browUp" && this.listening) v += .08;
      o.v.t = clamp(v, 0, ch === "squint" ? .3 : 1); o.v.step(dt);   /* 目を細めるのは 0.3 まで（閉じきるとまばたきに見える） */
      for (const [m, i, w] of o.binds) m.morphTargetInfluences[i] = clamp(o.v.v * w, 0, 1);
    }
    // 口：時刻表の母音へ（音より 40ms 先に形をつくる）。声の大きさで開きを変える。唇を閉じる子音は閉じる
    const want = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    if (sp) { const c = sp.clock() + .04, M = sp.tl.m || []; while (sp.i < M.length - 1 && M[sp.i][0] + M[sp.i][1] <= c) sp.i++;
      const mo = M[sp.i]; if (mo && c >= mo[0] && c < mo[0] + mo[1] + .02) { const [st, len, v, cl] = mo; const vis = VIS[v]; const ph = (c - st) / Math.max(.01, len);
        const open = sp.level ? clamp(.55 + .6 * sp.level(), .5, 1.15) : 1; const close = cl && ph < .35 ? sstep(ph / .35) : 1;
        if (vis) for (const [kk, w] of Object.entries(vis)) want[kk] = w * open * close; } }
    for (const kk of MOUTH) { const s = Fc.mouth[kk]; s.t = want[kk]; s.step(dt); em.setValue(kk, clamp(s.v, 0, 1)); }
  }
  _gauss() { let u = 0, v = 0; while (!u) u = this.rand(); while (!v) v = this.rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
}
