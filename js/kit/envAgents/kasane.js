/* © mitsulab. かさねっこ ── Qualium の小さな環境エージェント（v2・2026-10-23）。
   本人「案１０で採用してください」（形は 1 種類・違いは 5 色だけ）／「かさねっこを、川越と氷川にたくさん入れてください。」
   本人「遠目からこっちを覗いて見てたり、近づいてきて層への案内をしてくれるようにしてください。」
   形：../../_dev/envAgents/kasane/build.py（Blender の Python・自作・外の素材なし）→ kasane.glb（meshopt・体と手足 1064 三角形＋目とほお 432 三角形）。
   描き方：1 つの形を、層の色（体の色）を掛けて使い回す。インスタンス描画（体・目・足もとの影の 3 回の描画で全員）。骨もアニメーションも持たない（形の鍵＝足・手・まばたき）。
   動き：ちょこちょこ歩く（足を交互・小さく跳ねる・着地でつぶれる）／立ち止まって見上げる・首をかしげる／二体で向き合って話す（吹き出しは層の色の点）／
         人が近づくと少し離れてまた寄る／少し離れた所で立ち止まり、こちらをじっと見つめる（本人「遠くでこっちを見つめてるイメージ」）／
         層の地点のそばで寄ってきて、その地点の方へ少し先を歩いて案内する（一度案内したら、しばらく来ない）。
   人のことばは話さない（点の吹き出しと短い音だけ）。中身は、触れたときにアプリが碧に読ませる（典拠つきの記録）。

   使い方：
     import { KasaneHerd } from "./kit/envAgents/kasane.js";
     const herd = new KasaneHerd({ scene: world, camera, groundAt, walkable, hud: COLOR5, scale: 2.1 });
     herd.add("nature", { x, z, radius: 2, data: 地点, target: { x, z }（案内の行き先）, role: "wander"|"watch"|"pair", pair: 相手 });
     herd.load();                                  // 主な画面が動いてから
     毎こま：herd.update(dt, { active: 歩いている, busy: 札を開いている })
     層の on/off：herd.setLayers(["sight", …])
     触れる：const a = herd.pick(x, y); if (a) herd.touch(a, () => 碧が a.data を読む);  札を閉じたら herd.release(a) */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

// 体の色（案 10・2026-10-23 本人決定）と、夜の地の HUD の線と字の色
export const KASANE_BODY = { sight: "#a59fc3", touch: "#d6c09b", sound: "#3a4360", nature: "#6c8d71", culture: "#864e4c" };
export const KASANE_HUD = { sight: "#c9abe0", touch: "#f0d19d", sound: "#8fb6dc", nature: "#88b68f", culture: "#e79592" };   // 案 10 の HUD の列。sight と sound だけ、夜の地で見分けやすいよう紫と青へ少し離した
export const KASANE_H = .22;   // 形の高さ（m）。見せる大きさは scale を掛ける

const URL_GLB = new URL("./kasane.glb", import.meta.url).href;
const RM = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, "YXZ"), _p3 = new THREE.Vector3(), _s3 = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const _mR = new THREE.Matrix4(), _mP = new THREE.Matrix4();

// ---- 短い音（その場で作る・やわらかい二音）
let AC = null;
function chirp(kind = "hi", vol = .14) {
  try {
    if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; AC = new C(); }
    if (AC.state === "suspended") AC.resume();
    const t = AC.currentTime + .01, out = AC.createGain(); out.gain.value = vol; out.connect(AC.destination);
    const notes = kind === "hi" ? [[880, 1180, 0], [1320, 1500, .12]] : [[740, 900, 0]];
    for (const [f, f2, d] of notes) { const o = AC.createOscillator(), g = AC.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f, t + d); o.frequency.exponentialRampToValueAtTime(f2, t + d + .07);
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(1, t + d + .01); g.gain.exponentialRampToValueAtTime(.001, t + d + .16); o.connect(g).connect(out); o.start(t + d); o.stop(t + d + .2); }
  } catch { }
}

// ---- 点の吹き出し（層の色の点 1〜3 つ・字はない）
const DOTS = {};
function dotsTex(hex, n) {
  const k = hex + n; if (DOTS[k]) return DOTS[k];
  const c = document.createElement("canvas"); c.width = 128; c.height = 64; const g = c.getContext("2d");
  g.fillStyle = "rgba(6,10,18,.62)"; g.strokeStyle = hex; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect ? g.roundRect(6, 8, 116, 40, 20) : g.rect(6, 8, 116, 40); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(52, 48); g.lineTo(60, 60); g.lineTo(66, 48); g.closePath(); g.fillStyle = "rgba(6,10,18,.62)"; g.fill(); g.strokeStyle = hex; g.stroke();
  g.fillStyle = "rgba(6,10,18,.62)"; g.fillRect(53, 44, 12, 5);
  g.fillStyle = hex; for (let i = 0; i < 3; i++) { g.globalAlpha = i < n ? 1 : .22; g.beginPath(); g.arc(38 + i * 26, 28, 7, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return DOTS[k] = t;
}
function shadowTex() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(.55, "rgba(0,0,0,.28)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

class Kasane {
  constructor(herd, layer, o, seed) {
    this.herd = herd; this.layer = layer; this.data = o.data || null; this.role = o.role || "wander"; this.cover = o.cover || null; this.target = o.target || null;
    this.anchor = new THREE.Vector2(o.x, o.z); this.radius = o.radius ?? 1.8; this.R = rnd(seed);
    this.pos = new THREE.Vector2(o.x + (this.R() - .5) * .6, o.z + (this.R() - .5) * .6); this.yaw = this.R() * Math.PI * 2;
    this.state = "idle"; this.t = this.R() * 3; this.dur = 1 + this.R() * 3; this.goal = null; this.spd = .3;
    this.ph = this.R(); this.side = 0; this.squash = 0; this.y = 0; this.moving = false; this.mv = 0;
    this.tilt = 0; this.tiltGoal = 0; this.tiltT = 4 + this.R() * 10; this.tiltHold = 0; this.pitch = 0; this.roll = 0;
    this.blinkT = 1 + this.R() * 4; this.blink = 0; this.happy = 0; this.raise = 0; this.raiseGoal = 0; this.say = 0; this.sayN = 0;
    this.lastPd = Infinity; this.focusTo = null; this.lookT = 0; this.peekSide = this.R() < .5 ? -1 : 1; this.peekK = 0; this.guided = false;
    this.pair = null; this.talkT = 2 + this.R() * 5; this.layerOn = true; this.seen = false; this.idx = -1;
  }
  get s() { return this.herd.scale; }
  center(v = new THREE.Vector3()) { return v.set(this.pos.x, this.gy + this.y + KASANE_H * .5 * this.s, this.pos.y); }
  goTo(x, z, state, spd) { this.goal = new THREE.Vector2(x, z); this.state = state; this.spd = spd; this.t = 0; this.stuck = 0; }
  stop(state = "idle", dur = null) { this.goal = null; this.state = state; this.t = 0; this.dur = dur ?? (1.5 + this.R() * 3.5); }
  // 一歩ずつ進む。通れない所はよけ、よけられなければ止まる。着いたら true
  step(dt, turnRate = 7, loose = false) {
    const g = this.goal; if (!g) return true;
    const dx = g.x - this.pos.x, dz = g.y - this.pos.y, dist = Math.hypot(dx, dz);
    if (dist < .05) return true;
    let want = Math.atan2(dx, dz);
    const ok = loose ? this.herd.walkSurface : this.herd.walkable, s = this.s, ahead = .12 * s;
    if (ok) {
      let found = false;
      for (const off of [0, .5, -.5, 1, -1, 1.5, -1.5]) { const a = want + off; if (ok(this.pos.x + Math.sin(a) * ahead, this.pos.y + Math.cos(a) * ahead)) { want = a; found = true; break; } }
      if (!found) { this.stuck += dt; if (this.stuck > .6) return true; return false; }
    }
    const turn = angDiff(this.yaw, want); this.yaw += clamp(turn, -turnRate * dt, turnRate * dt);
    if (Math.abs(turn) > .9) return false;   // まず向きを変えてから歩く
    const v = this.spd, mv = Math.min(dist, v * dt);
    this.pos.x += Math.sin(this.yaw) * mv; this.pos.y += Math.cos(this.yaw) * mv; this.moving = true; this.mv = v;
    return dist - mv < .05;
  }
  faceTo(x, z, dt, rate = 3) { this.yaw += clamp(angDiff(this.yaw, Math.atan2(x - this.pos.x, z - this.pos.y)), -rate * dt, rate * dt); }
}

export class KasaneHerd {
  constructor({ scene, camera, groundAt = null, walkable = null, walkSurface = null, canSee = null, avoid = null, scale = 2, hud = KASANE_HUD, body = KASANE_BODY, mobile = Math.min(innerWidth, innerHeight) < 700, maxDist = null, max = 40, guideEvery = 100, shadow = true } = {}) {
    Object.assign(this, { scene, camera, groundAt, walkable, scale, mobile, max }); this.walkSurface = walkSurface || walkable; this.canSee = canSee; this.avoid = avoid;   // avoid()：よける点（碧の立ち位置）   // canSee(x, z)：その点が人から見えるか（手前に低木の株がないか）   // 覗く位置は、物陰のそばの面（幹・燈籠の当たりの中でもよい）
    this.hud = { ...KASANE_HUD, ...hud }; this.body = { ...KASANE_BODY, ...body };
    this.maxDist = maxDist ?? (mobile ? 28 : 38); this.comeDist = mobile ? 3.4 : 3.6; this.guideEvery = guideEvery; this.guideCool = 22; this.guiding = null;
    this.agents = []; this.group = new THREE.Group(); this.group.name = "kasane"; this.group.visible = false; scene.add(this.group);
    this._seed = 7; this.t = 0; this.ready = false; this.active = false; this.on = null; this.shadowOn = shadow;
    this.bubbles = []; this.P = new THREE.Vector2(); this.F = new THREE.Vector2(0, -1); this.prevP = null; this.pv = 0;
    this.ring = null;
  }
  add(layer, o) { const a = new Kasane(this, layer, o, (this._seed += 7919)); this.agents.push(a); return a; }
  /** 二体を組にする（ときどき向き合って話す） */
  pairUp(a, b) { a.pair = b; b.pair = a; a.role = b.role = "pair"; }
  /** 小さな群れ（3〜7 体）。members＝[{ layer, data, target }]、o＝{ x, z, radius, role: "watch"（そろって見つめることが多い） }。
      群れの中では、押し合う・跳ね合う・追いかけっこ・輪になって話す・一体がつまずいて周りが寄る・そろってこちらを見つめる。案内は先頭の一体が先導し、ほかはぞろぞろついてくる。 */
  addGroup(members, o = {}) {
    const G = { members: [], c: new THREE.Vector2(o.x, o.z), anchor: new THREE.Vector2(o.x, o.z), radius: o.radius ?? 2.4, role: o.role || "", mode: "idle", t: 0, dur: 1 + Math.random() * 2, rot: Math.random() * 6.28, goal: null, vi: 0 };
    members.forEach((m, i) => { const ang = i / members.length * Math.PI * 2 + G.rot, r = .35 * this.scale; const a = this.add(m.layer, { x: o.x + Math.cos(ang) * r, z: o.z + Math.sin(ang) * r, radius: 1, data: m.data, target: m.target }); a.flock = G; a.slot = i; a.jx = 0; a.jz = 0; a.role = "flock"; G.members.push(a); });
    (this.flocks ||= []).push(G); return G;
  }
  _flock(G, dt, busy) {
    const s = this.scale, P = this.P, F = this.F, M = G.members, L = M[0], pd = Math.hypot(P.x - G.c.x, P.y - G.c.y), R = L.R;
    G.t += dt;
    for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {   // 重ならない（めり込まない）
      const a = M[i], b = M[j], dx = b.pos.x - a.pos.x, dz = b.pos.y - a.pos.y, d = Math.hypot(dx, dz), mn = .27 * s;
      if (d < mn && d > 1e-4) { const k = (mn - d) / 2 / d; a.pos.x -= dx * k; a.pos.y -= dz * k; b.pos.x += dx * k; b.pos.y += dz * k; }
    }
    if (G.mode === "follow") {
      if (!L.state.startsWith("g")) { G.mode = "jostle"; G.t = 0; G.dur = 2.5; G.c.set(0, 0); for (const a of M) G.c.add(a.pos); G.c.multiplyScalar(1 / M.length); G.anchor.copy(G.c); for (const a of M) a.happy = .34; }
      else G.c.copy(L.pos);
      return;
    }
    // 案内：先頭の子が寄ってきて手まねきし、ほかはぞろぞろついてくる
    if (!busy && !this.guiding && this.guideCool <= 0 && !L.guided && L.layerOn && L.target && L.state === "flock" && pd < 9 && pd > 2.2 && G.mode !== "stumble" && !G.noGuide) {
      const tg = this._targetFor(L), td = tg ? Math.hypot(tg.x - P.x, tg.y - P.y) : 0;
      if (tg && td > 4 && td < 30 && ((tg.x - P.x) * F.x + (tg.y - P.y) * F.y) / td > .2 && this.pv < .6) { this.guiding = L; L.tgt = tg; L.state = "gCome"; L.t = 0; L.goal = null; G.mode = "follow"; return; }
      G.noGuide = true;
    }
    if (G.mode === "move" && G.goal) {
      const dx = G.goal.x - G.c.x, dz = G.goal.y - G.c.y, d = Math.hypot(dx, dz), v = .2 * s * dt;
      if (d < .1 || G.t > 14) { G.mode = G.after || "idle"; G.after = null; G.t = 0; G.dur = G.mode === "watch" ? 4 + R() * 3 : 1.5 + R() * 2; } else { G.c.x += dx / d * Math.min(d, v); G.c.y += dz / d * Math.min(d, v); }
    }
    if (pd < .7 * s + .5 && G.mode !== "move") {   // 人がすぐそばへ来たら、群れごと少し離れる
      const n = pd || 1, x = G.c.x + (G.c.x - P.x) / n * 1.4, z = G.c.y + (G.c.y - P.y) / n * 1.4;
      if (!this.walkable || this.walkable(x, z)) { G.goal = new THREE.Vector2(x, z); G.mode = "move"; G.t = 0; }
    }
    if (G.t < G.dur || G.mode === "move") return;
    // つぎに何をするか
    const watchP = pd > 4 && pd < 24 ? (G.role === "watch" ? .55 : .2) : 0, r = R();
    if (pd > 5 && pd < 18 && R() < .4) {   // 気になって、群れごと人の見ている前のほうへ出てきて、そろって見つめる（碧の側はよける）
      const k = this.mobile ? 5.5 + R() * 3 : 4.5 + R() * 3, rx = -F.y, rz = F.x, av = this.avoid?.(); let side = (R() - .5) * (this.mobile ? 1.2 : 3);
      if (av) { const as = (av.x - P.x) * rx + (av.z - P.y) * rz; side = -Math.sign(as || 1) * (this.mobile ? .4 + Math.abs(side) * .4 : .8 + Math.abs(side)); }
      const x = P.x + F.x * k + rx * side, z = P.y + F.y * k + rz * side;
      if (!this.walkable || this.walkable(x, z)) { G.goal = new THREE.Vector2(x, z); G.mode = "move"; G.t = 0; G.after = "watch"; return; }
    }
    let m = r < watchP ? "watch" : ["move", "move", "circle", "circle", "jostle", "chase", "stumble", "idle"][Math.floor(R() * 8)];
    if (m === "chase" && M.length < 3) m = "jostle";
    G.mode = m; G.t = 0; G.rot += (R() - .5) * 2;
    G.dur = { watch: 4 + R() * 4, circle: 4 + R() * 2.5, jostle: 2.5 + R() * 1.5, chase: 3 + R() * 2, stumble: 2.4, idle: 1.5 + R() * 2.5, move: 99 }[m];
    if (m === "move") { for (let k = 0; k < 6; k++) { const a = R() * 6.28, rr = Math.sqrt(R()) * G.radius, x = G.anchor.x + Math.cos(a) * rr, z = G.anchor.y + Math.sin(a) * rr; if (!this.walkable || this.walkable(x, z)) { G.goal = new THREE.Vector2(x, z); break; } } if (!G.goal) { G.mode = "idle"; } }
    if (m === "stumble") { G.vi = Math.floor(R() * M.length); const v = M[G.vi]; v.squash = .55; v.tiltGoal = (R() < .5 ? -1 : 1) * .35; v.tiltT = 3; v.tiltHold = .9; }
    if (m === "jostle" || m === "watch") for (const a of M) a.happy = R() < .5 ? .34 : 0;
  }
  _member(a, dt, pd) {
    const G = a.flock, s = this.scale, P = this.P, M = G.members, n = M.length, i = a.slot, R = a.R;
    const ang = i / n * Math.PI * 2 + G.rot, r0 = .3 * s * (1 + .22 * Math.sqrt(n));
    let tx = G.c.x + Math.cos(ang) * r0 + a.jx, tz = G.c.y + Math.sin(ang) * r0 + a.jz, face = null, spd = .24 * s;
    switch (G.mode) {
      case "circle": { const r = .45 * s * (1 + .12 * n); tx = G.c.x + Math.cos(ang) * r; tz = G.c.y + Math.sin(ang) * r; face = G.c;
        if (Math.floor(G.t / 1.15) % n === i) { a.say = Math.max(a.say, .4); a.sayT = (a.sayT || 0) + dt; a.nod = 0; } else a.nod = Math.max(0, Math.sin(G.t * 5 + i)) * .1; break; }
      case "chase": { if (i < 2) { const w = G.t * 1.9 + (i ? 0 : -.9), r = .75 * s; tx = G.c.x + Math.cos(w) * r; tz = G.c.y + Math.sin(w) * r; spd = .55 * s; } else face = M[0].pos; break; }
      case "stumble": { const v = M[G.vi]; if (a === v) { tx = a.pos.x; tz = a.pos.y; } else { const dx = a.pos.x - v.pos.x, dz = a.pos.y - v.pos.y, d = Math.hypot(dx, dz) || 1; tx = v.pos.x + dx / d * .36 * s; tz = v.pos.y + dz / d * .36 * s; face = v.pos; spd = .3 * s; } break; }
      case "follow": { const L = M[0], fy = L.yaw, k = Math.max(1, i), back = .42 * s * (1 + (k - 1) * .5), lat = (k % 2 ? 1 : -1) * .2 * s;
        tx = L.pos.x - Math.sin(fy) * back + Math.cos(fy) * lat; tz = L.pos.y - Math.cos(fy) * back - Math.sin(fy) * lat; spd = Math.max(.3 * s, (L.mv || 0) * 1.1); face = L.state === "gWait" || L.state === "gGreet" ? P : null; break; }
      case "watch": face = P; if (R() < dt * .2) a.happy = Math.max(a.happy, .34); break;
      case "jostle": { if ((a.jt = (a.jt || 0) - dt) < 0) { a.jt = .45 + R() * .5; a.jx = (R() - .5) * .25 * s; a.jz = (R() - .5) * .25 * s; if (R() < .5) a.happy = .34; } face = R() < .5 ? null : G.c; break; }
      default: if (pd < 6 * s) face = P;
    }
    if (G.mode !== "jostle") { a.jx *= .9; a.jz *= .9; }
    if (this.walkable && !this.walkable(tx, tz)) { tx = G.c.x; tz = G.c.y; }
    const d = Math.hypot(tx - a.pos.x, tz - a.pos.y);
    if (d > .06 * s) { a.goal = a.goal || new THREE.Vector2(); a.goal.set(tx, tz); a.spd = spd * (d > .8 * s ? 1.4 : 1); a.stuck = 0; a.step(dt, 9); }
    else if (face) a.faceTo(face.x, face.y, dt, 4);
    if (G.mode === "stumble" && a === M[G.vi] && G.t > 1.4) a.happy = Math.max(a.happy, .34);
  }
  setLayers(on) { this.on = new Set(on); for (const a of this.agents) a.layerOn = this.on.has(a.layer); }
  load() {
    if (this._lp) return this._lp;
    const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
    return this._lp = ld.loadAsync(URL_GLB).then(g => { this._build(g.scene); this.ready = true; }).catch(e => console.warn("かさねっこ：", e?.message ?? e));
  }
  _build(root) {
    root.updateMatrixWorld(true); const by = {}; root.traverse(o => { if (o.isMesh) by[o.name.replace(/\..*$/, "")] = o; });
    const T = by.kasane_tint, F = by.kasane_fix, N = this.max;
    const mT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: 0, envMapIntensity: .35 });
    const mF = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.iT = new THREE.InstancedMesh(T.geometry, mT, N); this.iF = new THREE.InstancedMesh(F.geometry, mF, N);
    this.LT = T.matrixWorld.clone(); this.LF = F.matrixWorld.clone();
    this.mi = { T: T.morphTargetDictionary, F: F.morphTargetDictionary };
    this.oT = { morphTargetInfluences: new Array(T.morphTargetInfluences.length).fill(0) }; this.oF = { morphTargetInfluences: new Array(F.morphTargetInfluences.length).fill(0) };
    for (let i = 0; i < N; i++) { this.iT.setMorphAt(i, this.oT); this.iF.setMorphAt(i, this.oF); this.iT.setColorAt(i, _c.set("#ffffff")); }
    for (const im of [this.iT, this.iF]) { im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.count = 0; this.group.add(im); }
    if (this.shadowOn) {
      const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
      this.iS = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: .7, polygonOffset: true, polygonOffsetFactor: -2 }), N);
      this.iS.frustumCulled = false; this.iS.count = 0; this.iS.renderOrder = 1; this.group.add(this.iS);
    }
    const rg = new THREE.RingGeometry(.86, 1, 48); rg.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false })); this.ring.visible = false; this.ring.renderOrder = 2; this.group.add(this.ring);
    for (let i = 0; i < 4; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotsTex("#ffffff", 3), transparent: true, depthWrite: false })); sp.visible = false; sp.renderOrder = 3; this.group.add(sp); this.bubbles.push(sp); }
  }
  _morph(o, dict, name, v) { const i = dict[name]; if (i != null) o.morphTargetInfluences[i] = v; }
  /** 画面の点に近い一体（指で押しやすいよう 44px 以上） */
  pick(cx, cy, minPx = 44) {
    if (!this.ready || !this.group.visible) return null; let best = null, bd = Infinity; const cam = this.camera, H = innerHeight;
    for (const a of this.agents) {
      if (a.idx < 0) continue; a.center(_v); const dist = _v.distanceTo(cam.position); _v.project(cam); if (_v.z > 1) continue;
      const sx = (_v.x * .5 + .5) * innerWidth, sy = (-_v.y * .5 + .5) * H, px = KASANE_H * this.scale / (2 * dist * Math.tan(cam.fov * Math.PI / 360)) * H;
      const rad = Math.max(minPx, px * .9), d = Math.hypot(sx - cx, sy - cy);
      if (d < rad && d / rad + dist * .01 < bd) { bd = d / rad + dist * .01; best = a; }
    }
    return best;
  }
  /** 触れた：その子は止まってこちらを向き、跳ねて、点の吹き出しで応える → done（碧が訳す） */
  touch(a, done) {
    if (!a) return; if (this.guiding === a) this._endGuide(a);
    a.focusTo = new THREE.Vector2(this.camera.position.x, this.camera.position.z); a.goal = null; a.state = "focus"; a.happy = .7; a.say = 1.4; a.raiseGoal = .7;
    chirp("hi"); if (done) setTimeout(done, 650);
  }
  release(a) { if (!a) return; a.focusTo = null; a.raiseGoal = 0; a.stop("idle", 2 + Math.random() * 2); a.lookAt = 2; }
  _endGuide(a) { if (this.guiding === a) { this.guiding = null; this.guideCool = this.guideEvery; } a.guided = true; if (this.ring) this.ring.visible = false; }

  update(dt, { active = true, busy = false } = {}) {
    this.active = active && this.ready; this.group.visible = this.active; if (!this.active) return;
    this.t += dt; const t = this.t, cam = this.camera, s = this.scale;
    this.P.set(cam.position.x, cam.position.z); cam.getWorldDirection(_v); this.F.set(_v.x, _v.z); if (this.F.lengthSq() > 1e-6) this.F.normalize();
    if (this.prevP) { const v = this.P.distanceTo(this.prevP) / Math.max(dt, 1e-3); this.pv = lerp(this.pv, v, 1 - Math.exp(-dt * 4)); this.prevP.copy(this.P); } else this.prevP = this.P.clone();
    this.guideCool -= dt; this._busy = busy;
    for (const G of this.flocks || []) if (Math.hypot(this.P.x - G.c.x, this.P.y - G.c.y) < this.maxDist + 12) this._flock(G, dt, busy);
    const live = [];
    for (const a of this.agents) {
      a.idx = -1; if (!a.layerOn) { if (this.guiding === a) this._endGuide(a); continue; }
      const pd = Math.hypot(this.P.x - a.pos.x, this.P.y - a.pos.y);
      if (pd > this.maxDist + 12) { if (this.guiding === a) this._endGuide(a); continue; }   // 遠くの子は止めておく（動きの計算もしない）
      this._think(a, dt, t, pd, busy);
      if (pd < this.maxDist && live.length < this.max) live.push(a);
    }
    // ---- 描く
    if (!this.iT) return;
    let n = 0, bi = 0;
    for (const a of live) {
      a.idx = n; const gy = a.gy, sq = a.sq;
      _e.set(a.pitch, a.yaw, a.tilt + a.roll, "YXZ"); _q.setFromEuler(_e); _p3.set(a.pos.x, gy + a.y, a.pos.y); _s3.set(s * (1 - sq * .5), s * (1 + sq), s * (1 - sq * .5));
      _m.compose(_p3, _q, _s3);
      this.iT.setMatrixAt(n, _mR.multiplyMatrices(_m, this.LT)); this.iF.setMatrixAt(n, _mP.multiplyMatrices(_m, this.LF));
      this.iT.setColorAt(n, _c.set(this.body[a.layer] || "#cccccc"));
      const oT = this.oT.morphTargetInfluences; oT.fill(0); const d = this.mi.T;
      this._morph(this.oT, d, "stepL", a.stepL); this._morph(this.oT, d, "stepR", a.stepR); this._morph(this.oT, d, "swingL", a.swL); this._morph(this.oT, d, "swingR", a.swR); this._morph(this.oT, d, "raiseR", a.raise);
      this.iT.setMorphAt(n, this.oT); this.oF.morphTargetInfluences.fill(0); this._morph(this.oF, this.mi.F, "blink", a.blinkV); this.iF.setMorphAt(n, this.oF);
      if (this.iS) { const k = s * .2 * (1 - clamp(a.y / (.12 * s), 0, .5)); _q.identity(); _p3.set(a.pos.x, gy + .015, a.pos.y); _s3.set(k, 1, k * .9); _m.compose(_p3, _q, _s3); this.iS.setMatrixAt(n, _m); }
      // 吹き出し（話している子だけ・近くだけ）
      if (a.say > 0 && bi < this.bubbles.length && a.pd < 22) {
        const sp = this.bubbles[bi++], nDots = 1 + Math.floor((a.sayT || 0) * 3.2) % 3; sp.material.map = dotsTex(this.hud[a.layer] || "#ffffff", nDots); sp.material.opacity = clamp(a.say * 3, 0, 1);
        sp.position.set(a.pos.x, gy + a.y + KASANE_H * s * 1.18, a.pos.y); const bs = .2 * s * (.9 + .1 * Math.sin(t * 6)); sp.scale.set(bs, bs * .5, 1); sp.visible = true;
      }
      n++;
    }
    for (; bi < this.bubbles.length; bi++) this.bubbles[bi].visible = false;
    this.iT.count = this.iF.count = n; if (this.iS) this.iS.count = n;
    this.iT.instanceMatrix.needsUpdate = this.iF.instanceMatrix.needsUpdate = true; if (this.iT.instanceColor) this.iT.instanceColor.needsUpdate = true;
    if (this.iT.morphTexture) this.iT.morphTexture.needsUpdate = true; if (this.iF.morphTexture) this.iF.morphTexture.needsUpdate = true; if (this.iS) this.iS.instanceMatrix.needsUpdate = true;
    // 案内の行き先の輪
    const G = this.guiding;
    if (this.ring && G && (G.state === "gLead" || G.state === "gWait") && G.tgt) {
      this.ring.visible = true; this.ring.material.color.set(this.hud[G.layer]); this.ring.position.set(G.tgt.x, (this.groundAt ? this.groundAt(G.tgt.x, G.tgt.y) : 0) + .03, G.tgt.y);
      const k = .35 * s * (1 + .12 * Math.sin(t * 3.4)); this.ring.scale.setScalar(k); this.ring.material.opacity = .55 + .25 * Math.sin(t * 3.4);
    } else if (this.ring) this.ring.visible = false;
  }

  _think(a, dt, t, pd, busy) {
    const s = this.s ?? this.scale, P = this.P, F = this.F, R = a.R;
    const approach = (a.lastPd - pd) / Math.max(dt, 1e-3); a.lastPd = pd; a.pd = pd;
    a.moving = false; a.t += dt; a.peekCool = (a.peekCool || 0) - dt; a.talkT -= dt; const shyR = .55 * s + .5;
    // こちらを見ているか（画面のまんなか近くに入っているか）
    const tx = a.pos.x - P.x, tz = a.pos.y - P.y, tl = Math.hypot(tx, tz) || 1, looked = (tx * F.x + tz * F.y) / tl > .975 && pd < 34;
    if (a.state === "focus") { if (a.focusTo) a.faceTo(a.focusTo.x, a.focusTo.y, dt, 6); }
    else if (a.state !== "shy" && !a.state.startsWith("g") && a.state !== "hide" && pd < shyR && approach > .3 && !RM) {   // 人がすぐそばへ来たら、少し離れる
      const n = Math.hypot(a.pos.x - P.x, a.pos.y - P.y) || 1, d = (.5 + R() * .3) * s + .3;
      a.goTo(a.pos.x + (a.pos.x - P.x) / n * d, a.pos.y + (a.pos.y - P.y) / n * d, "shy", .95 * s * .5 + .5);
    }
    if (a.flock && a.state === "idle") a.state = "flock";
    switch (a.state) {
      case "flock": this._member(a, dt, pd); break;
      case "idle": {
        if (a.lookAt > 0 || pd < 6 * s) a.faceTo(P.x, P.y, dt, 1.8);
        // 案内（見どころが前の方にあり、人が立ち止まっているか、ゆっくりのとき）：層の地点の近くで、まだ案内していない子が、とことこ寄ってくる（一度に一体・一度したらしばらく来ない）
        if (!busy && !this.guiding && this.guideCool <= 0 && !a.guided && a.tgt0 !== false && a.target && pd < 9 && pd > 2.2 && a.role !== "watch") {
          const tg = this._targetFor(a), td = tg ? Math.hypot(tg.x - P.x, tg.y - P.y) : 0;
          if (tg && td > 4 && td < 30 && ((tg.x - P.x) * F.x + (tg.y - P.y) * F.y) / td > .2 && this.pv < .6) { this.guiding = a; a.tgt = tg; a.state = "gCome"; a.t = 0; break; }
          a.tgt0 = false;
        }
        if (a.role === "watch" && pd > 5 && pd < 24 && !busy) {   // 少し離れた所で立ち止まり、体と顔をこちらへ向けて、じっと見つめる（ときどき首をかしげ、小さく跳ねる）
          a.faceTo(P.x, P.y, dt, 3); a.lookAt = 1; if (R() < dt * .18) a.happy = Math.max(a.happy, .34); a.t = 0; break;
        }
        if (a.role === "pair" && a.pair && a.pair.state === "idle" && a.pair.layerOn && a.talkT < 0 && Math.hypot(a.pair.pos.x - a.pos.x, a.pair.pos.y - a.pos.y) < 1.4 * s && pd < 26) {
          a.state = a.pair.state = "talk"; a.t = a.pair.t = 0; a.talkDur = a.pair.talkDur = 3.6 + R() * 2.4; a.talkT = a.pair.talkT = 7 + R() * 9; a.speaker = true; a.pair.speaker = false; break;
        }
        if (a.t > a.dur) {
          if (a.peekBack && pd > shyR * 1.4 && pd < 6 * s) {   // 少し離れたあと、また寄ってきて見上げる
            const n = pd || 1, d = Math.min(pd - (shyR + .3 * s), .8 * s); a.peekBack = false;
            if (d > .1) { a.goTo(a.pos.x + (P.x - a.pos.x) / n * d, a.pos.y + (P.y - a.pos.y) / n * d, "walk", .2 * s); break; }
          }
          if (pd < 13 && pd > 3 && R() < .45 && a.role !== "watch") {   // 気になって、人の見ている前のほうへ、とことこ出てくる（見えるところへ）
            const k = this.mobile ? 5 + R() * 4 : 4.5 + R() * 3.5, rx = -F.y, rz = F.x, av = this.avoid?.(); let side = (R() - .5) * 2 * (this.mobile ? 1.1 : 2.2) * k / 6;
            if (av) { const as = (av.x - P.x) * rx + (av.z - P.y) * rz; side = -Math.sign(as || 1) * (this.mobile ? .3 + Math.abs(side) * .45 : .6 + Math.abs(side)); }   // 碧のいる側をよけて、反対の側へ
            const x = P.x + F.x * k + rx * side, z = P.y + F.y * k + rz * side;
            if (!this.walkable || this.walkable(x, z)) { a.goTo(x, z, "walk", (.2 + R() * .06) * s); a.lookAt = 3; break; }
          }
          const ang = R() * Math.PI * 2, r = Math.sqrt(R()) * a.radius, base = a.role === "pair" && a.pair && R() < .7 ? a.pair.pos : a.anchor;
          let x = base.x + Math.cos(ang) * r * (base === a.anchor ? 1 : .35), z = base.y + Math.sin(ang) * r * (base === a.anchor ? 1 : .35);
          if (this.walkable && !this.walkable(x, z)) { x = a.anchor.x; z = a.anchor.y; }
          a.goTo(x, z, "walk", (.16 + R() * .08) * s);
        }
        break;
      }
      case "walk": case "shy": {
        if (a.step(dt) || a.t > 12) { if (a.state === "shy") { a.peekBack = true; a.lookAt = 2.5; } a.stop("idle"); }
        break;
      }
      case "talk": {   // 向き合って話す：話し手は点を出して小さく弾み、聞き手はうなずく
        const b = a.pair; if (!b || b.state !== "talk") { a.stop("idle"); a.say = 0; break; }
        a.faceTo(b.pos.x, b.pos.y, dt, 4);
        const turn = Math.floor(a.t / 1.25) % 2 === 0; const speak = a.speaker ? turn : !turn;
        if (speak) { a.say = Math.max(a.say, .4); a.sayT = (a.sayT || 0) + dt; } else a.sayT = 0;
        a.nod = speak ? 0 : Math.max(0, Math.sin(a.t * 5)) * .12;
        if (a.t > a.talkDur) { a.say = 0; a.nod = 0; a.stop("idle", 2 + R() * 4); }
        break;
      }
      case "gCome": {   // 寄ってくる（人の斜め前の足もとへ・歩く道はふさがない）
        const rx = -F.y, rz = F.x, cd = this.comeDist, sg = (a.pos.x - P.x) * rx + (a.pos.y - P.y) * rz >= 0 ? 1 : -1, gx = P.x + F.x * cd + rx * .7 * sg, gz = P.y + F.y * cd + rz * .7 * sg;   // 画面の下の端より手前に来ない（目の高さ 1.6 m・縦の画角から）
        if (!a.goal) a.goal = new THREE.Vector2(); a.goal.set(gx, gz); a.spd = .32 * s;
        const arrived = a.step(dt);
        if (arrived || a.t > 7) { a.state = "gGreet"; a.t = 0; a.goal = null; a.happy = .7; a.raiseGoal = 1; chirp("hi", .1); }
        if (pd > 16) { this._endGuide(a); a.stop("idle"); }
        break;
      }
      case "gGreet": {   // 足もとで跳ねて、手まねき
        a.faceTo(P.x, P.y, dt, 6); a.say = Math.max(a.say, .3); a.sayT = (a.sayT || 0) + dt;
        if (a.t > 1.5) { a.raiseGoal = 0; a.say = 0; a.state = "gLead"; a.t = 0; a.waitT = 0; }
        break;
      }
      case "gLead": {   // 見どころの方へ、少し先を歩く。離れたら振りかえって待ち、手まねき
        const tg = a.tgt; if (!tg) { this._endGuide(a); a.stop("idle"); break; }
        if (pd > 5.5) {
          a.goal = null; a.faceTo(P.x, P.y, dt, 5); a.waitT += dt; a.raiseGoal = Math.sin(a.waitT * 3) > .3 ? .9 : .2;
          if (a.waitT > 9 || pd > 18) { this._endGuide(a); a.raiseGoal = 0; a.stop("idle"); }
          break;
        }
        a.waitT = 0; a.raiseGoal = 0; a.lb = (a.lb || 0) + dt; if (a.lb > 2.2) { a.lb = 0; a.happy = .34; a.say = Math.max(a.say, .7); }   // 歩きながら、ときどき弾んで点を出す（ついてきて）
        if (!a.goal) a.goal = new THREE.Vector2(); a.goal.set(tg.x, tg.y); a.spd = clamp(.32 * s + this.pv * .45, .3, 1.1);
        const fin = a.step(dt);
        if (fin || Math.hypot(tg.x - a.pos.x, tg.y - a.pos.y) < .35) { a.state = "gWait"; a.t = 0; a.goal = null; }
        if (a.t > 40) { this._endGuide(a); a.stop("idle"); }
        break;
      }
      case "gWait": {   // 着いた：振りかえって待つ（触れると碧が訳す）
        a.faceTo(P.x, P.y, dt, 4); if (Math.sin(a.t * 2.2) > .85) a.happy = Math.max(a.happy, .32);
        a.say = a.t % 5 < 1.6 ? Math.max(a.say, .3) : a.say; a.sayT = (a.sayT || 0) + dt;
        if (a.t > 22 || (pd < 2.2 && a.t > 4) || pd > 20) { this._endGuide(a); a.anchor.set(a.pos.x, a.pos.y); a.stop("idle", 3 + R() * 3); a.lookAt = 3; }
        break;
      }
    }
    // ---- 体（跳ね・つぶれ・かしげ・見上げ・まばたき・足と手）
    const moving = a.moving, sp = a.mv / Math.max(.01, s);
    const stepLen = .055 * (1 + clamp(sp / .2 - 1, 0, 2) * .4), rate = moving ? sp / stepLen : 0;
    let y = 0, sq = 0, stepL = 0, stepR = 0, swL = 0, swR = 0;
    if (moving && !RM) {
      a.ph += rate * dt; if (a.ph >= 1) { a.ph -= 1; a.side ^= 1; a.squash = .14; }
      const k = Math.sin(a.ph * Math.PI); y = k * .022 * s * clamp(sp / .2, .6, 1.4);
      if (a.side) { stepL = k; swR = k * .8; } else { stepR = k; swL = k * .8; }
      if (a.ph < .14) sq -= .1 * (1 - a.ph / .14); else sq += .04 * k;   // 着地でつぶれ、空中で少し伸びる
    } else a.ph = 0;
    a.squash = Math.max(0, a.squash - dt * 1.4);
    if (a.happy > 0 && !RM) { a.happy -= dt; const k = (a.happy % .34) / .34; y += Math.sin(k * Math.PI) * .03 * s; if (k < .15) sq -= .08; }
    const breath = Math.sin(t * 1.9 + a.anchor.x) * .012;
    a.tiltT -= dt;
    if (a.tiltT < 0 && !moving) { a.tiltGoal = (R() < .5 ? -1 : 1) * (.18 + R() * .12); a.tiltT = 5 + R() * 10; a.tiltHold = 1 + R() * .9; }
    if (a.tiltHold > 0) { a.tiltHold -= dt; if (a.tiltHold <= 0) a.tiltGoal = 0; }
    if (moving) a.tiltGoal = 0;
    const peekLean = 0;
    const lookUp = !moving && (pd < 5 * s || a.state === "focus" || a.state === "gWait" || a.state === "gGreet") ? clamp((5 * s - pd) / (5 * s), 0, 1) * .22 + (a.state === "focus" ? .08 : 0) : 0;
    a.tilt = lerp(a.tilt, a.tiltGoal + peekLean, 1 - Math.exp(-dt * 5));
    a.pitch = lerp(a.pitch, (moving ? .09 : 0) - lookUp + (a.nod || 0), 1 - Math.exp(-dt * 5));
    a.roll = moving ? Math.sin(a.ph * Math.PI * 2 + (a.side ? Math.PI : 0)) * .05 : 0;
    a.raise = lerp(a.raise, a.raiseGoal, 1 - Math.exp(-dt * 6));
    a.blinkT -= dt; if (a.blinkT < 0) { a.blink = .15; a.blinkT = 2.4 + R() * 4.5; }
    a.blinkV = a.blink > 0 ? Math.sin((1 - a.blink / .15) * Math.PI) : 0; a.blink = Math.max(0, a.blink - dt);
    a.say = Math.max(0, a.say - dt); if (a.say <= 0 && a.state !== "talk") a.sayT = 0;
    a.lookAt = Math.max(0, (a.lookAt || 0) - dt);
    if (RM) { y = 0; sq = 0; }
    a.y = y; a.sq = sq + breath - a.squash * .6; a.stepL = stepL; a.stepR = stepR; a.swL = swL; a.swR = swR;
    a.gy = this.groundAt ? this.groundAt(a.pos.x, a.pos.y) : 0;
  }
  _targetFor(a) {
    const tg = a.target; if (!tg) return null; const w = this.walkable;
    if (!w || w(tg.x, tg.z)) return new THREE.Vector2(tg.x, tg.z);
    for (let r = .5; r < 6; r += .5) for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2, x = tg.x + Math.cos(an) * r, z = tg.z + Math.sin(an) * r; if (w(x, z)) return new THREE.Vector2(x, z); }
    return null;
  }
  info() { return { agents: this.agents.length, drawn: this.iT?.count ?? 0, tris: (this.iT?.count ?? 0) * (1064 + 432 + 2), calls: this.iT ? 3 : 0 }; }
  dispose() { this.scene.remove(this.group); }
}
