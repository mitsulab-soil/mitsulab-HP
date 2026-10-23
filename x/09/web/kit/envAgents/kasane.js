/* © mitsulab. かさねっこ ── Qualium の小さな環境エージェント（v3・2026-10-23 夜）。
   本人「案１０で採用してください」（形は 1 種類・体の色は層の 5 色）／「かさねっこを、川越と氷川にたくさん入れてください。」
   本人「遠目からこっちを覗いて見てたり、近づいてきて層への案内をしてくれるようにしてください。」
   本人（v3）「同じ色だけの集団でなく、多少混ざっていてください。ただ、Qualiumなどでそのメインとなるレイヤーが多くいて欲しいです。」
            「サイズはみんな同じでなく、小さいのがいたり、形がちょっと違うのがいたり、多少の個性を出してください。」
            「タッチしたときに、吹き出しだけでなく、何を言っているかわからないが鳴き声を出すようにするのと、反応のバリエーションを増やしてください。」
            「かさねっこの数が多すぎます。…サイズをもう少し小さく。また、Qualiaへの案内をしてください。」
            「かさねっこのデザインは変えずに、それぞれの層の特徴を持ったアイテムや飾りなどをつけてください。かさねっこが、３dビューを空間に表示して解説をしてくれるようにしてください。」
   形：../../_dev/envAgents/kasane/build.py（Blender の Python・自作・外の素材なし）→ kasane.glb（meshopt・体と手足 1064 三角形＋目とほお 432 三角形）。
   個性：形は 1 種類のまま、大きさ（0.7〜1.15 倍）・丸い／細い・先の傾きの向き（左右の写し）・目の間隔を、拡大縮小と写しで変える。動きの癖（跳ねる高さ・歩く速さ・首をかしげる多さ・のんびり）。
   持ち物：層ごとに 2〜3 種（遠眼鏡・虫めがね／小石・手ぬぐい／鈴・筆／若葉・どんぐり／扇子・瓦のかけら・提灯）。その場で作る数十三角形の形・種類ごとにインスタンス描画。
   鳴き声：WebAudio でその場で作る短い声（人のことばにならない音の高さの上がり下がりだけ。層ごとに音色、個体ごとに高さが少し違う）。外の音は使わない。
   3D の窓：触れたとき・案内で着いたとき、空中に層の色の細い罫線と走査線の小さな窓を出し、その場にある 3D（近くの形）や素材の面を写して見せる（一度に一つ・押すと閉じる）。
   人のことばは話さない（点の吹き出しと鳴き声だけ）。中身は、触れたときにアプリが碧に読ませる（典拠つきの記録）。

   使い方：
     import { KasaneHerd, kasaneMix } from "./kit/envAgents/kasane.js";
     const herd = new KasaneHerd({ scene: world, camera, groundAt, walkable, hud: COLOR5, scale: 2.9, muted: () => !soundOn, minCamDist: 1.6, upright: false });
     const layers = kasaneMix("nature", 4, { mix: .3, rnd })  // メインの層が 6〜7 割、ほかの層が少し
     herd.addGroup(members, { x, z, radius, role });
     herd.load();                                  // 主な画面が動いてから
     毎こま：herd.update(dt, { active: 歩いている, busy: 札を開いている })
     層の on/off：herd.setLayers(["sight", …])
     触れる：if (herd.pickView(x, y)) return;  const a = herd.pick(x, y); if (a) herd.touch(a, () => 碧が a.data を読む);  札を閉じたら herd.release(a)
     （案内で着いた所の層の名の札に触れても pick が案内の子を返す） */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

// 体の色（案 10・2026-10-23 本人決定）と、夜の地の HUD の線と字の色
export const KASANE_BODY = { sight: "#a59fc3", touch: "#d6c09b", sound: "#3a4360", nature: "#6c8d71", culture: "#864e4c" };
export const KASANE_HUD = { sight: "#c9abe0", touch: "#f0d19d", sound: "#8fb6dc", nature: "#88b68f", culture: "#e79592" };
export const KASANE_NAME = { sight: "Qualia/sight", touch: "Qualia/touch", sound: "Qualia/sound", nature: "Qualia/nature", culture: "Qualia/culture" };
export const KASANE_H = .22;   // 形の高さ（m）。見せる大きさは scale を掛ける
export const KASANE_SIZE = .75;   // 2026-10-23 本人「サイズをもう少し小さく」＝前の 7〜8 割（碧の膝より下）
const LAYERS5 = ["sight", "touch", "sound", "nature", "culture"];

/** 群れの層の並び：メインの層が (1 - mix)、ほかの層が少し混ざる。先頭（案内する子）はいつもメイン */
export function kasaneMix(main, n, { mix = .3, pool = LAYERS5, rnd = Math.random } = {}) {
  const others = pool.filter(l => l !== main), out = [main]; let k = 0;
  for (let i = 1; i < n; i++) { const want = Math.round(n * mix); if (others.length && k < want && (rnd() < mix * 1.6 || n - i <= want - k)) { out.push(others[Math.floor(rnd() * others.length)]); k++; } else out.push(main); }
  return out;
}

const URL_GLB = new URL("./kasane.glb", import.meta.url).href;
const RM = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, "YXZ"), _p3 = new THREE.Vector3(), _s3 = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _c = new THREE.Color();
const _mR = new THREE.Matrix4(), _mP = new THREE.Matrix4(), _mS = new THREE.Matrix4(), _mX = new THREE.Matrix4().makeScale(-1, 1, 1), _mI = new THREE.Matrix4(), _mA = new THREE.Matrix4(), _mB = new THREE.Matrix4();

// ---- 鳴き声（その場で作る・人のことばにならない短い声）
let AC = null, lastVoice = 0;
const VOICE = {   // 層ごとの音色：基の高さ・倍音・息の混ざり
  sight: { f: 760, wave: "sine", h2: .35, noise: 0, q: 6 },
  touch: { f: 600, wave: "triangle", h2: .12, noise: .05, q: 3 },
  sound: { f: 520, wave: "sine", h2: .5, noise: 0, q: 9, bell: true },
  nature: { f: 680, wave: "triangle", h2: .2, noise: .12, q: 4 },
  culture: { f: 560, wave: "triangle", h2: .25, noise: .03, q: 5 },
};
function voice(layer = "sight", { pitch = 1, mood = "hi", vol = .06, muted = false } = {}) {
  if (muted) return;
  try {
    const now = performance.now(); if (now - lastVoice < 160) return; lastVoice = now;
    if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; AC = new C(); }
    if (AC.state === "suspended") AC.resume();
    const V = VOICE[layer] || VOICE.sight, t0 = AC.currentTime + .01, out = AC.createGain(), lp = AC.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 3200; out.gain.value = vol; lp.connect(out).connect(AC.destination);
    // 音節の数と上がり下がり（mood）：hi＝上がる二、三音／oh＝下がって上がる一音／shy＝小さく下がる／wa＝弾む三、四音
    const shape = { hi: [[1, 1.18], [1.22, 1.42], [1.1, 1.3]], oh: [[1.35, .95, 1.2]], shy: [[1.05, .82]], wa: [[1, 1.25], [1.15, .98], [1.3, 1.5], [1.05, 1.2]], up: [[.9, 1.4]] }[mood] || [[1, 1.2]];
    const nSyl = mood === "hi" ? 2 + (Math.random() < .5 ? 1 : 0) : mood === "wa" ? 3 + (Math.random() < .5 ? 1 : 0) : shape.length;
    let t = t0;
    for (let i = 0; i < nSyl; i++) {
      const c = shape[i % shape.length], f0 = V.f * pitch * (.94 + Math.random() * .12), d = mood === "shy" ? .16 : .085 + Math.random() * .05;
      const o = AC.createOscillator(), g = AC.createGain(), bp = AC.createBiquadFilter();
      o.type = V.wave; bp.type = "bandpass"; bp.Q.value = V.q; bp.frequency.setValueAtTime(f0 * 2.1, t); bp.frequency.linearRampToValueAtTime(f0 * (1.4 + Math.random()), t + d);
      o.frequency.setValueAtTime(f0 * c[0], t); for (let k = 1; k < c.length; k++) o.frequency.exponentialRampToValueAtTime(f0 * c[k], t + d * k / (c.length - 1));
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(mood === "shy" ? .5 : 1, t + .012); g.gain.setValueAtTime(mood === "shy" ? .45 : .9, t + d * .6); g.gain.exponentialRampToValueAtTime(.001, t + d + .05);
      const mix = AC.createGain(); mix.gain.value = .8; o.connect(mix); mix.connect(g); g.connect(lp);
      const dry = AC.createGain(); dry.gain.value = .35; o.connect(dry).connect(bp).connect(g);
      if (V.h2) { const o2 = AC.createOscillator(), g2 = AC.createGain(); o2.type = "sine"; o2.frequency.setValueAtTime(f0 * c[0] * (V.bell ? 2.76 : 2), t); o2.frequency.exponentialRampToValueAtTime(f0 * c[c.length - 1] * (V.bell ? 2.76 : 2), t + d); g2.gain.value = V.h2 * (V.bell ? .6 : .4); o2.connect(g2).connect(g); o2.start(t); o2.stop(t + d + .25); }
      if (V.noise) { const nb = AC.createBuffer(1, Math.floor(AC.sampleRate * d), AC.sampleRate), ch = nb.getChannelData(0); for (let k = 0; k < ch.length; k++) ch[k] = (Math.random() * 2 - 1) * (1 - k / ch.length); const ns = AC.createBufferSource(), ng = AC.createGain(), nf = AC.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = f0 * 3; nf.Q.value = 2; ns.buffer = nb; ng.gain.value = V.noise; ns.connect(nf).connect(ng).connect(g); ns.start(t); }
      o.start(t); o.stop(t + d + .12); t += d + .03 + Math.random() * .04;
    }
  } catch { }
}

// ---- 吹き出し（層の色の点・字はない）。形は 5 つ：dots（1〜3 つ）・one（大きい一つ＝びっくり）・up（大きくなる三つ＝うれしい）・wave（波＝ごきげん）・spark（四方の点＝きらきら）
const BUB = {};
function bubbleTex(hex, kind, n = 3) {
  const k = hex + kind + n; if (BUB[k]) return BUB[k];
  const c = document.createElement("canvas"); c.width = 128; c.height = 64; const g = c.getContext("2d"), bg = "rgba(6,10,18,.62)";
  g.fillStyle = bg; g.strokeStyle = hex; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect ? g.roundRect(6, 8, 116, 40, 20) : g.rect(6, 8, 116, 40); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(52, 48); g.lineTo(60, 60); g.lineTo(66, 48); g.closePath(); g.fillStyle = bg; g.fill(); g.strokeStyle = hex; g.stroke();
  g.fillStyle = bg; g.fillRect(53, 44, 12, 5); g.fillStyle = hex; g.strokeStyle = hex;
  const dot = (x, y, r, a = 1) => { g.globalAlpha = a; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; };
  if (kind === "one") dot(64, 28, 10);
  else if (kind === "up") { dot(40, 32, 4.5); dot(62, 29, 6.5); dot(88, 26, 9); }
  else if (kind === "wave") { g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); for (let x = 28; x <= 100; x += 2) g.lineTo(x, 28 + Math.sin((x - 28) / 72 * Math.PI * 3) * 7); g.stroke(); }
  else if (kind === "spark") { dot(64, 28, 5.5); for (let i = 0; i < 4; i++) dot(64 + Math.cos(i * Math.PI / 2 + .78) * 15, 28 + Math.sin(i * Math.PI / 2 + .78) * 12, 3); dot(34, 28, 3, .6); dot(94, 28, 3, .6); }
  else for (let i = 0; i < 3; i++) dot(38 + i * 26, 28, 7, i < n ? 1 : .22);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return BUB[k] = t;
}
function shadowTex() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(.55, "rgba(0,0,0,.28)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const FONT = '"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
function tagTex(hex, text) {   // 案内で着いた所の層の名の札（層の色の細い罫線と字）
  const c = document.createElement("canvas"), W = 320, H = 72; c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = "rgba(6,10,18,.72)"; g.fillRect(4, 8, W - 8, H - 16); g.strokeStyle = hex; g.lineWidth = 1.5; g.strokeRect(4.5, 8.5, W - 9, H - 17);
  g.lineWidth = 3; for (const [x, y, dx, dy] of [[4, 8, 1, 1], [W - 4, 8, -1, 1], [4, H - 8, 1, -1], [W - 4, H - 8, -1, -1]]) { g.beginPath(); g.moveTo(x + dx * 14, y); g.lineTo(x, y); g.lineTo(x, y + dy * 12); g.stroke(); }
  g.globalAlpha = .12; g.fillStyle = hex; for (let y = 10; y < H - 8; y += 3) g.fillRect(6, y, W - 12, 1); g.globalAlpha = 1;
  g.fillStyle = hex; g.font = `600 30px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, W / 2, H / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData = { aspect: W / H }; return t;
}

// ---- 持ち物（層ごと・数十三角形・頂点色）。体の左手（+x）に持つか、頭・胸に付ける。形の座標は体の足もとを原点・前が +Z
function colorize(geo, hex) { const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute("uv"); const n = g.attributes.position.count, c = new Float32Array(n * 3); _c.set(hex).convertSRGBToLinear(); for (let i = 0; i < n; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; } g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g; }
function place(geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) { geo.applyMatrix4(_mA.compose(_v.set(...p), _q.setFromEuler(_e.set(r[0], r[1], r[2], "XYZ")), _s3.set(...s))); return geo; }
function merge(parts) {
  let n = 0; for (const g of parts) n += g.attributes.position.count; const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { if (!g.attributes.normal) g.computeVertexNormals(); P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute("position", new THREE.BufferAttribute(P, 3)); m.setAttribute("normal", new THREE.BufferAttribute(N, 3)); m.setAttribute("color", new THREE.BufferAttribute(C, 3)); return m;
}
const HAND = [.077, .046, .014], HEAD = [.036, .214, .002], CHEST = [0, .062, .045];
const ITEM_DEF = {
  // sight：虫めがね（輪とガラスと柄）・遠眼鏡
  lens: { mount: "hand", make: () => merge([colorize(place(new THREE.TorusGeometry(.015, .0028, 4, 10), { p: [0, .03, .006] }), "#a8864f"), colorize(place(new THREE.CircleGeometry(.0135, 10), { p: [0, .03, .006] }), "#b9d4e0"), colorize(place(new THREE.CylinderGeometry(.0028, .0032, .022, 5), { p: [0, .009, .006] }), "#5b3b24")]) },
  scope: { mount: "hand", make: () => merge([colorize(place(new THREE.CylinderGeometry(.0055, .0075, .046, 7), { p: [0, .012, .012], r: [1.05, 0, 0] }), "#9a7a45"), colorize(place(new THREE.CylinderGeometry(.0079, .0079, .006, 7), { p: [0, .0035, .033], r: [1.05, 0, 0] }), "#3b3026")]) },
  // touch：小石・手ぬぐい
  pebble: { mount: "hand", make: () => merge([colorize(place(new THREE.IcosahedronGeometry(.0125, 0), { p: [0, .002, .008], s: [1.25, .72, 1] }), "#a8a397")]) },
  tenugui: { mount: "hand", make: () => merge([colorize(place(new THREE.BoxGeometry(.024, .04, .003), { p: [0, -.012, .006], r: [.12, 0, .05] }), "#e4dccb"), colorize(place(new THREE.BoxGeometry(.0245, .006, .0034), { p: [0, -.004, .006], r: [.12, 0, .05] }), "#34507a"), colorize(place(new THREE.BoxGeometry(.0245, .006, .0034), { p: [0, -.024, .0075], r: [.12, 0, .05] }), "#34507a")]) },
  // sound（sho を含む）：鈴（胸）・筆
  bell: { mount: "chest", make: () => merge([colorize(place(new THREE.SphereGeometry(.0105, 8, 5), { p: [0, -.004, .009] }), "#c6a35c"), colorize(place(new THREE.TorusGeometry(.004, .0012, 3, 6), { p: [0, .008, .009] }), "#c6a35c"), colorize(place(new THREE.BoxGeometry(.0016, .0016, .0016), { p: [0, -.009, .019], s: [5, 1, 1] }), "#2a1f16"), colorize(place(new THREE.TorusGeometry(.03, .0012, 3, 10, Math.PI * .8), { p: [0, .02, -.004], r: [-.25, 0, Math.PI * 1.1] }), "#b34a3c")]) },
  brush: { mount: "hand", make: () => merge([colorize(place(new THREE.CylinderGeometry(.0026, .0026, .046, 5), { p: [0, .01, .008], r: [.5, 0, -.35] }), "#b49a62"), colorize(place(new THREE.ConeGeometry(.0042, .013, 6), { p: [.0045, -.016, -.006], r: [.5 + Math.PI, 0, -.35] }), "#1d1a18")]) },
  // nature：若葉（頭）・どんぐり
  leaf: { mount: "head", make: () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.014, .016, 0, .04); sh.quadraticCurveTo(-.014, .016, 0, 0);
    return merge([colorize(place(new THREE.ShapeGeometry(sh, 4), { p: [0, .002, 0], r: [-.5, 0, -.45] }), "#7aa452"), colorize(place(new THREE.CylinderGeometry(.0012, .0012, .01, 3), { p: [0, -.002, 0], r: [-.5, 0, -.45] }), "#5d7a3a")]); } },
  acorn: { mount: "hand", make: () => merge([colorize(place(new THREE.SphereGeometry(.0085, 7, 5), { p: [0, -.002, .008], s: [1, 1.3, 1] }), "#8a5a2b"), colorize(place(new THREE.SphereGeometry(.0092, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), { p: [0, .005, .008] }), "#5b4530"), colorize(place(new THREE.CylinderGeometry(.0012, .0012, .006, 3), { p: [0, .011, .008] }), "#4a3826")]) },
  // culture（rakugo・history を含む）：扇子・瓦のかけら・提灯
  fan: { mount: "hand", make: () => merge([colorize(place(new THREE.CircleGeometry(.032, 7, Math.PI * .22, Math.PI * .56), { p: [0, .004, .012], r: [-.2, 0, 0] }), "#ead9b4"), colorize(place(new THREE.CircleGeometry(.012, 7, Math.PI * .22, Math.PI * .56), { p: [0, .004, .0125], r: [-.2, 0, 0] }), "#6b4a2e"), colorize(place(new THREE.BoxGeometry(.003, .012, .003), { p: [0, -.002, .012] }), "#6b4a2e")]) },
  tile: { mount: "hand", make: () => { const g = new THREE.BoxGeometry(.026, .006, .019); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { if (P.getX(i) > 0 && P.getZ(i) > 0) P.setX(i, P.getX(i) - .007); P.setY(i, P.getY(i) + (P.getX(i) * P.getX(i)) * 6); }
    return merge([colorize(place(g, { p: [0, .001, .01], r: [.2, .4, .25] }), "#858a8f")]); } },
  lantern: { mount: "hand", make: () => merge([colorize(place(new THREE.CylinderGeometry(.0105, .0105, .022, 8, 1), { p: [0, -.02, .01] }), "#e8d5a6"), colorize(place(new THREE.CylinderGeometry(.0085, .0085, .004, 8), { p: [0, -.007, .01] }), "#2f241b"), colorize(place(new THREE.CylinderGeometry(.0085, .0085, .004, 8), { p: [0, -.033, .01] }), "#2f241b"), colorize(place(new THREE.BoxGeometry(.0018, .012, .0018), { p: [0, 0, .01] }), "#2f241b")]) },
};
const ITEMS_OF = { sight: ["scope", "lens"], touch: ["pebble", "tenugui"], sound: ["bell", "brush"], nature: ["leaf", "acorn"], culture: ["fan", "tile", "lantern"] };
const MOUNT = { hand: HAND, head: HEAD, chest: CHEST }, ITEM_K = 2;   // 小さく映るので、持ち物は形の 1.7 倍（手・頭・胸の位置はそのまま）
const SHOULDER_L = new THREE.Vector3(.0595, .09, .0072);   // 左手を振る軸（build.py の swingL と同じ）

// ---- 3D の窓の材質（層の色・縁が光る・走査線）
function holoMat(hex) {
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(hex) }, uT: { value: 0 }, uA: { value: 1 } }, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vec4 wp = modelMatrix * vec4(position,1.); vY = wp.y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uT; uniform float uA; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = pow(1. - abs(dot(normalize(vN), vV)), 2.); float sc = .55 + .45 * step(.5, fract(vY * 160. - uT * 2.)); float a = (.12 + .6 * f) * sc * uA; gl_FragColor = vec4(uC * (0.6 + f), a); }`,
  });
}
function cutGeo(o, c, R, flat = false) {   // 大きな形から、点 c のまわり R m の三角形だけを取り出す（上向きの平らな面＝地面は除く・2 万三角形まで）
  const g = o.geometry, P = g.attributes.position, I = g.index, n = I ? I.count : P.count, e = o.matrixWorld.elements, out = [], A = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let t = 0; t < n && out.length < 20000 * 9; t += 3) {
    for (let k = 0; k < 3; k++) { const i = I ? I.getX(t + k) : t + k, x = P.getX(i), y = P.getY(i), z = P.getZ(i); A[k * 3] = e[0] * x + e[4] * y + e[8] * z + e[12]; A[k * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; A[k * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; }
    const cx = (A[0] + A[3] + A[6]) / 3, cz = (A[2] + A[5] + A[8]) / 3; if ((cx - c.x) ** 2 + (cz - c.z) ** 2 > R * R) continue;
    const ux = A[3] - A[0], uy = A[4] - A[1], uz = A[5] - A[2], vx = A[6] - A[0], vy = A[7] - A[1], vz = A[8] - A[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz) || 1;
    if (!flat && Math.abs(ny / L) > .92 && Math.max(A[1], A[4], A[7]) - Math.min(A[1], A[4], A[7]) < .05 && Math.max(Math.abs(ux), Math.abs(uz), Math.abs(vx), Math.abs(vz)) > 1.5) continue;   // 広い平らな地面
    out.push(...A);
  }
  if (out.length < 9 * (flat ? 4 : 12)) return null;
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(out, 3)); geo.computeVertexNormals(); geo.userData.cut = true;
  const m = new THREE.Mesh(geo); m.matrixAutoUpdate = false; return m;
}
function waveObj(hex) {   // sound：音の波の立体（模式）
  const g = new THREE.Group(), m = new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: .9, depthTest: false });
  for (let r = 0; r < 7; r++) { const pts = []; for (let i = 0; i <= 64; i++) { const x = i / 64 - .5; pts.push(new THREE.Vector3(x, 0, (r - 3) * .09)); } const geo = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(geo, m); l.userData.row = r; g.add(l); }
  g.userData.wave = true; return g;
}

class Kasane {
  constructor(herd, layer, o, seed) {
    this.herd = herd; this.layer = layer; this.data = o.data || null; this.role = o.role || "wander"; this.cover = o.cover || null; this.target = o.target || null;
    this.anchor = new THREE.Vector2(o.x, o.z); this.radius = o.radius ?? 1.8; this.R = rnd(seed);
    this.pos = new THREE.Vector2(o.x + (this.R() - .5) * .6, o.z + (this.R() - .5) * .6); this.yaw = this.R() * Math.PI * 2;
    this.state = "idle"; this.t = this.R() * 3; this.dur = 1 + this.R() * 3; this.goal = null; this.spd = .3;
    this.ph = this.R(); this.side = 0; this.squash = 0; this.y = 0; this.moving = false; this.mv = 0;
    this.tilt = 0; this.tiltGoal = 0; this.tiltT = 4 + this.R() * 10; this.tiltHold = 0; this.pitch = 0; this.roll = 0;
    this.blinkT = 1 + this.R() * 4; this.blink = 0; this.happy = 0; this.raise = 0; this.raiseGoal = 0; this.say = 0; this.sayN = 0; this.bub = "dots";
    this.lastPd = Infinity; this.focusTo = null; this.lookT = 0; this.peekSide = this.R() < .5 ? -1 : 1; this.peekK = 0; this.guided = false;
    this.pair = null; this.talkT = 2 + this.R() * 5; this.layerOn = true; this.seen = false; this.idx = -1;
    // 個性（形は 1 種類のまま・変形と動きの癖で）
    const R = this.R, r0 = R();
    this.sz = o.size ?? (r0 < .22 ? .7 + R() * .1 : r0 > .88 ? 1.06 + R() * .09 : .86 + R() * .2);   // 小さい子が少し・大きい子も少し
    const rnd2 = R() - .5; this.round = rnd2 * .16;   // ＋＝丸い／−＝細い
    this.mirror = R() < .5;   // 先の傾きの向き（左右の写し）
    this.leanK = .9 + R() * .25;   // 先の傾きの強さ（横の伸び）
    this.eyeK = .95 + R() * .1;   // 目の間隔
    this.hopK = .7 + R() * .7; this.spdK = .8 + R() * .4; this.curious = R(); this.lazy = R() < .25;   // 跳ねる高さ・歩く速さ・首をかしげる多さ・のんびり
    if (this.lazy) this.spdK *= .8;
    this.pitchV = clamp(1 / Math.sqrt(this.sz), .9, 1.2) * (.95 + R() * .1);   // 鳴き声の高さ（小さい子ほど少し高い）
    const its = ITEMS_OF[layer] || []; this.item = o.item ?? (its.length ? its[(o.slot ?? Math.floor(R() * 7)) % its.length] : null);
    this.react = null; this.lastReact = "";
  }
  get s() { return this.herd.scale; }
  get S() { return this.herd.scale * this.sz; }
  center(v = new THREE.Vector3()) { return v.set(this.pos.x, this.gy + this.y + KASANE_H * .5 * this.S, this.pos.y); }
  goTo(x, z, state, spd) { this.goal = new THREE.Vector2(x, z); this.state = state; this.spd = spd * this.spdK; this.t = 0; this.stuck = 0; }
  stop(state = "idle", dur = null) { this.goal = null; this.state = state; this.t = 0; this.dur = (dur ?? (1.5 + this.R() * 3.5)) * (this.lazy ? 1.6 : 1); }
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
    if (Math.abs(turn) > .9) return false;
    const v = this.spd, mv = Math.min(dist, v * dt);
    this.pos.x += Math.sin(this.yaw) * mv; this.pos.y += Math.cos(this.yaw) * mv; this.moving = true; this.mv = v;
    return dist - mv < .05;
  }
  faceTo(x, z, dt, rate = 3) { this.yaw += clamp(angDiff(this.yaw, Math.atan2(x - this.pos.x, z - this.pos.y)), -rate * dt, rate * dt); }
}

export class KasaneHerd {
  constructor({ scene, camera, groundAt = null, walkable = null, walkSurface = null, canSee = null, avoid = null, scale = 2, sizeK = KASANE_SIZE, hud = KASANE_HUD, body = KASANE_BODY, names = KASANE_NAME, mobile = Math.min(innerWidth, innerHeight) < 700, maxDist = null, max = 40, guideEvery = 100, shadow = true,
    muted = null, minCamDist = null, upright = false, bubbleAvoid = null, screenMargin = 8, view = null, viewTitle = null, viewSafe = null, items = true } = {}) {
    Object.assign(this, { scene, camera, groundAt, walkable, mobile, max }); this.scale = scale * sizeK; this.walkSurface = walkSurface || walkable; this.canSee = canSee; this.avoid = avoid;
    this.hud = { ...KASANE_HUD, ...hud }; this.body = { ...KASANE_BODY, ...body }; this.names = { ...KASANE_NAME, ...names };
    this.muted = muted || (() => false); this.minCamDist = minCamDist; this.upright = upright; this.bubbleAvoid = bubbleAvoid; this.screenMargin = screenMargin; this.viewFn = view; this.viewTitle = viewTitle; this.viewSafe = viewSafe; this.itemsOn = items;   // viewSafe()＝{ left, right, top }：窓を出さない画面の端の幅（層の一覧など）
    this.maxDist = maxDist ?? (mobile ? 28 : 38); this.comeDist = mobile ? 3.4 : 3.6; this.guideEvery = guideEvery; this.guideCool = 22; this.guiding = null;
    this.agents = []; this.group = new THREE.Group(); this.group.name = "kasane"; this.group.visible = false; scene.add(this.group);
    this._seed = 7; this.t = 0; this.ready = false; this.active = false; this.on = null; this.shadowOn = shadow;
    this.bubbles = []; this.P = new THREE.Vector2(); this.F = new THREE.Vector2(0, -1); this.prevP = null; this.pv = 0;
    this.ring = null; this.tag = null; this.view = null;
  }
  add(layer, o) { const a = new Kasane(this, layer, o, (this._seed += 7919)); this.agents.push(a); return a; }
  pairUp(a, b) { a.pair = b; b.pair = a; a.role = b.role = "pair"; }
  /** 小さな群れ。members＝[{ layer, data, target, size?, item? }]、o＝{ x, z, radius, role: "watch" } */
  addGroup(members, o = {}) {
    const G = { members: [], c: new THREE.Vector2(o.x, o.z), anchor: new THREE.Vector2(o.x, o.z), radius: o.radius ?? 2.4, role: o.role || "", mode: "idle", t: 0, dur: 1 + Math.random() * 2, rot: Math.random() * 6.28, goal: null, vi: 0 };
    members.forEach((m, i) => { const ang = i / members.length * Math.PI * 2 + G.rot, r = .35 * this.scale; const a = this.add(m.layer, { x: o.x + Math.cos(ang) * r, z: o.z + Math.sin(ang) * r, radius: 1, data: m.data, target: m.target, size: m.size, item: m.item, slot: i + Math.floor(o.x * 7 + o.z * 3) }); a.flock = G; a.slot = i; a.jx = 0; a.jz = 0; a.role = "flock"; G.members.push(a); });
    if (G.members.length) { const L = G.members[0]; L.sz = Math.max(L.sz, .9); }   // 先頭（案内する子）は小さすぎない
    (this.flocks ||= []).push(G); return G;
  }
  _flock(G, dt, busy) {
    const s = this.scale, P = this.P, F = this.F, M = G.members, L = M[0], pd = Math.hypot(P.x - G.c.x, P.y - G.c.y), R = L.R;
    G.t += dt;
    for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {
      const a = M[i], b = M[j], dx = b.pos.x - a.pos.x, dz = b.pos.y - a.pos.y, d = Math.hypot(dx, dz), mn = .27 * s * (a.sz + b.sz) * .5;
      if (d < mn && d > 1e-4) { const k = (mn - d) / 2 / d; a.pos.x -= dx * k; a.pos.y -= dz * k; b.pos.x += dx * k; b.pos.y += dz * k; }
    }
    if (G.mode === "follow") {
      if (!L.state.startsWith("g")) { G.mode = "jostle"; G.t = 0; G.dur = 2.5; G.c.set(0, 0); for (const a of M) G.c.add(a.pos); G.c.multiplyScalar(1 / M.length); G.anchor.copy(G.c); for (const a of M) a.happy = .34; }
      else G.c.copy(L.pos);
      return;
    }
    if (!busy && !this.guiding && this.guideCool <= 0 && !L.guided && L.layerOn && L.target && L.state === "flock" && pd < 9 && pd > 2.2 && G.mode !== "stumble" && !G.noGuide) {
      const tg = this._targetFor(L), td = tg ? Math.hypot(tg.x - P.x, tg.y - P.y) : 0;
      if (tg && td > 4 && td < 30 && ((tg.x - P.x) * F.x + (tg.y - P.y) * F.y) / td > .2 && this.pv < .6) { this.guiding = L; L.tgt = tg; L.state = "gCome"; L.t = 0; L.goal = null; G.mode = "follow"; return; }
      G.noGuide = true;
    }
    if (G.mode === "move" && G.goal) {
      const dx = G.goal.x - G.c.x, dz = G.goal.y - G.c.y, d = Math.hypot(dx, dz), v = .2 * s * dt;
      if (d < .1 || G.t > 14) { G.mode = G.after || "idle"; G.after = null; G.t = 0; G.dur = G.mode === "watch" ? 4 + R() * 3 : 1.5 + R() * 2; } else { G.c.x += dx / d * Math.min(d, v); G.c.y += dz / d * Math.min(d, v); }
    }
    if (pd < .7 * s + .5 + (this.minCamDist || 0) * .5 && G.mode !== "move") {
      const n = pd || 1, x = G.c.x + (G.c.x - P.x) / n * 1.4, z = G.c.y + (G.c.y - P.y) / n * 1.4;
      if (!this.walkable || this.walkable(x, z)) { G.goal = new THREE.Vector2(x, z); G.mode = "move"; G.t = 0; }
    }
    if (G.t < G.dur || G.mode === "move") return;
    const watchP = pd > 4 && pd < 24 ? (G.role === "watch" ? .55 : .2) : 0, r = R();
    if (pd > 5 && pd < 18 && R() < .4) {
      const k = this.mobile ? 5.5 + R() * 3 : 4.5 + R() * 3, rx = -F.y, rz = F.x, av = this.avoid?.(); let side = (R() - .5) * (this.mobile ? 1.2 : 3);
      if (av) { const as = (av.x - P.x) * rx + (av.z - P.y) * rz; side = -Math.sign(as || 1) * (this.mobile ? .4 + Math.abs(side) * .4 : .8 + Math.abs(side)); }
      const x = P.x + F.x * k + rx * side, z = P.y + F.y * k + rz * side;
      if (!this.walkable || this.walkable(x, z)) { G.goal = new THREE.Vector2(x, z); G.mode = "move"; G.t = 0; G.after = "watch"; return; }
    }
    let m = r < watchP ? "watch" : ["move", "move", "circle", "circle", "jostle", "chase", "stumble", "idle"][Math.floor(R() * 8)];
    if (m === "chase" && M.length < 3) m = "jostle";
    if (m === "stumble" && this.upright) m = "jostle";
    G.mode = m; G.t = 0; G.rot += (R() - .5) * 2;
    G.dur = { watch: 4 + R() * 4, circle: 4 + R() * 2.5, jostle: 2.5 + R() * 1.5, chase: 3 + R() * 2, stumble: 2.4, idle: 1.5 + R() * 2.5, move: 99 }[m];
    if (m === "move") { for (let k = 0; k < 6; k++) { const a = R() * 6.28, rr = Math.sqrt(R()) * G.radius, x = G.anchor.x + Math.cos(a) * rr, z = G.anchor.y + Math.sin(a) * rr; if (!this.walkable || this.walkable(x, z)) { G.goal = new THREE.Vector2(x, z); break; } } if (!G.goal) { G.mode = "idle"; } }
    if (m === "stumble") { G.vi = Math.floor(R() * M.length); const v = M[G.vi]; v.squash = .55; v.tiltGoal = (R() < .5 ? -1 : 1) * .35; v.tiltT = 3; v.tiltHold = .9; }
    if (m === "jostle" || m === "watch") for (const a of M) a.happy = R() < .5 ? .34 : 0;
  }
  _member(a, dt, pd) {
    const G = a.flock, s = this.scale, P = this.P, M = G.members, n = M.length, i = a.slot, R = a.R;
    const ang = i / n * Math.PI * 2 + G.rot, r0 = .3 * s * (1 + .22 * Math.sqrt(n));
    let tx = G.c.x + Math.cos(ang) * r0 + a.jx, tz = G.c.y + Math.sin(ang) * r0 + a.jz, face = null, spd = .24 * s * a.spdK;
    switch (G.mode) {
      case "circle": { const r = .45 * s * (1 + .12 * n); tx = G.c.x + Math.cos(ang) * r; tz = G.c.y + Math.sin(ang) * r; face = G.c;
        if (Math.floor(G.t / 1.15) % n === i) { a.say = Math.max(a.say, .4); a.bub = "dots"; a.sayT = (a.sayT || 0) + dt; a.nod = 0; } else a.nod = Math.max(0, Math.sin(G.t * 5 + i)) * .1; break; }
      case "chase": { if (i < 2) { const w = G.t * 1.9 + (i ? 0 : -.9), r = .75 * s; tx = G.c.x + Math.cos(w) * r; tz = G.c.y + Math.sin(w) * r; spd = .55 * s; } else face = M[0].pos; break; }
      case "stumble": { const v = M[G.vi]; if (a === v) { tx = a.pos.x; tz = a.pos.y; } else { const dx = a.pos.x - v.pos.x, dz = a.pos.y - v.pos.y, d = Math.hypot(dx, dz) || 1; tx = v.pos.x + dx / d * .36 * s; tz = v.pos.y + dz / d * .36 * s; face = v.pos; spd = .3 * s; } break; }
      case "follow": { const L = M[0], fy = L.yaw, k = Math.max(1, i), back = .42 * s * (1 + (k - 1) * .5), lat = (k % 2 ? 1 : -1) * .2 * s;
        tx = L.pos.x - Math.sin(fy) * back + Math.cos(fy) * lat; tz = L.pos.y - Math.cos(fy) * back - Math.sin(fy) * lat; spd = Math.max(.3 * s, (L.mv || 0) * 1.1); face = L.state === "gWait" || L.state === "gGreet" ? P : null; break; }
      case "watch": face = P; if (R() < dt * .2) a.happy = Math.max(a.happy, .34); break;
      case "jostle": { if ((a.jt = (a.jt || 0) - dt) < 0) { a.jt = .45 + R() * .5; a.jx = (R() - .5) * .25 * s; a.jz = (R() - .5) * .25 * s; if (R() < .5) a.happy = .34; } face = R() < .5 ? null : G.c; break; }
      default: if (pd < 6 * s) face = P;
    }
    if (a.hideBehind) { const b = a.hideBehind, dx = b.pos.x - P.x, dz = b.pos.y - P.y, d = Math.hypot(dx, dz) || 1; tx = b.pos.x + dx / d * .22 * s; tz = b.pos.y + dz / d * .22 * s; face = P; spd = .5 * s; }
    if (G.mode !== "jostle") { a.jx *= .9; a.jz *= .9; }
    if (this.walkable && !this.walkable(tx, tz)) { tx = G.c.x; tz = G.c.y; }
    const d = Math.hypot(tx - a.pos.x, tz - a.pos.y);
    if (d > .06 * s) { a.goal = a.goal || new THREE.Vector2(); a.goal.set(tx, tz); a.spd = spd * (d > .8 * s ? 1.4 : 1); a.stuck = 0; a.step(dt, 9); }
    else if (face) a.faceTo(face.x, face.y, dt, 4);
    if (G.mode === "stumble" && a === M[G.vi] && G.t > 1.4) a.happy = Math.max(a.happy, .34);
  }
  setLayers(on) { this.on = new Set(on); for (const a of this.agents) a.layerOn = this.on.has(a.layer); if (this.view && this.view.a && !this.view.a.layerOn) this.closeView(); }
  load() {
    if (this._lp) return this._lp;
    const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
    return this._lp = ld.loadAsync(URL_GLB).then(g => { this._build(g.scene); this.ready = true; }).catch(e => console.warn("かさねっこ：", e?.message ?? e));
  }
  _build(root) {
    root.updateMatrixWorld(true); const by = {}; root.traverse(o => { if (o.isMesh) by[o.name.replace(/\..*$/, "")] = o; });
    const T = by.kasane_tint, F = by.kasane_fix, N = this.max;
    const mT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: 0, envMapIntensity: .35 });
    // 2026-10-23 深夜 本人「小豆色（culture）の子の顔が暗く見える」→ 暗い体の色ほど、顔のあたり（前・目の高さ）を少しだけ内から明るく（目とほおの差が見えるように）。明るい色の子はほとんど変えない
    mT.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vKP;").replace("#include <project_vertex>", "#include <project_vertex>\n  vKP = transformed;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vKP;").replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  { float lum = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722)); float dk = 1. - smoothstep(.06, .32, lum);
    vec3 fd = (vKP - vec3(0., .088, .07)) / vec3(.075, .05, .06); float fw = exp(-dot(fd, fd));   // 顔のまわりを、丸くやわらかく
    totalEmissiveRadiance += diffuseColor.rgb * dk * (.14 + .7 * fw); }`);
    };
    const mF = new THREE.MeshBasicMaterial({ vertexColors: true });
    // 左右の写し（先の傾きの向き）は、写しの組（物の行列を x で反転＝面の向きもそろう）で描く
    const mk = (geo, mat, mir) => { const im = new THREE.InstancedMesh(geo, mat, N); if (mir) { im.scale.x = -1; im.updateMatrix(); } im.frustumCulled = false; im.castShadow = im.receiveShadow = false; this.group.add(im); return im; };
    this.iT = [mk(T.geometry, mT, false), mk(T.geometry, mT, true)]; this.iF = [mk(F.geometry, mF, false), mk(F.geometry, mF, true)];
    this.LT = T.matrixWorld.clone(); this.LF = F.matrixWorld.clone();
    this.mi = { T: T.morphTargetDictionary, F: F.morphTargetDictionary };
    this.oT = { morphTargetInfluences: new Array(T.morphTargetInfluences.length).fill(0) }; this.oF = { morphTargetInfluences: new Array(F.morphTargetInfluences.length).fill(0) };
    for (const im of [...this.iT, ...this.iF]) for (let i = 0; i < N; i++) { im.setMorphAt(i, im.geometry === T.geometry ? this.oT : this.oF); if (im.geometry === T.geometry) im.setColorAt(i, _c.set("#ffffff")); }
    for (const im of [...this.iT, ...this.iF]) im.count = 0;   // 形の鍵の表は count の数で作られるので、作ってから 0 に
    if (this.shadowOn) {
      const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
      this.iS = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: .7, polygonOffset: true, polygonOffsetFactor: -2 }), N);
      this.iS.frustumCulled = false; this.iS.count = 0; this.iS.renderOrder = 1; this.group.add(this.iS);
    }
    // 持ち物（使う種類だけ作る）
    this.iI = {};
    if (this.itemsOn) {
      const used = new Set(this.agents.map(a => a.item).filter(Boolean)), mI = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .05, side: THREE.DoubleSide, envMapIntensity: .4 });
      for (const k of used) { const D = ITEM_DEF[k]; if (!D) continue; const im = new THREE.InstancedMesh(D.make(), mI, N); im.frustumCulled = false; im.count = 0; this.group.add(im); this.iI[k] = { im, n: 0, mount: MOUNT[D.mount], hand: D.mount === "hand" }; }
    }
    const rg = new THREE.RingGeometry(.86, 1, 48); rg.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false })); this.ring.visible = false; this.ring.renderOrder = 2; this.group.add(this.ring);
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false })); this.tag.visible = false; this.tag.renderOrder = 6; this.group.add(this.tag); this.tagL = null;
    for (let i = 0; i < 4; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex("#ffffff", "dots", 3), transparent: true, depthWrite: false })); sp.visible = false; sp.renderOrder = 3; this.group.add(sp); this.bubbles.push(sp); }
  }
  _morph(o, dict, name, v) { const i = dict[name]; if (i != null) o.morphTargetInfluences[i] = v; }
  _screen(v) { const c = v.clone().project(this.camera); return c.z > 1 ? null : { x: (c.x * .5 + .5) * innerWidth, y: (-c.y * .5 + .5) * innerHeight }; }
  /** 画面の点に近い一体（指で押しやすいよう 44px 以上）。案内で着いた所の層の名の札に触れても、案内の子を返す */
  pick(cx, cy, minPx = 44) {
    if (!this.ready || !this.group.visible) return null;
    if (this.tag?.visible && this.tagRect && this.guiding) { const r = this.tagRect; if (cx > r.x0 - 8 && cx < r.x1 + 8 && cy > r.y0 - 10 && cy < r.y1 + 10) return this.guiding; }
    let best = null, bd = Infinity; const cam = this.camera, H = innerHeight;
    for (const a of this.agents) {
      if (a.idx < 0) continue; a.center(_v); const dist = _v.distanceTo(cam.position); _v.project(cam); if (_v.z > 1) continue;
      const sx = (_v.x * .5 + .5) * innerWidth, sy = (-_v.y * .5 + .5) * H, px = KASANE_H * a.S / (2 * dist * Math.tan(cam.fov * Math.PI / 360)) * H;
      const rad = Math.max(minPx, px * .9), d = Math.hypot(sx - cx, sy - cy);
      if (d < rad && d / rad + dist * .01 < bd) { bd = d / rad + dist * .01; best = a; }
    }
    return best;
  }
  /** 3D の窓に触れたら閉じる（true を返す） */
  pickView(cx, cy) { const r = this.view?.rect; if (!r || !this.view.g.visible) return false; if (cx > r.x0 && cx < r.x1 && cy > r.y0 && cy < r.y1) { this.closeView(); return true; } return false; }
  /** 触れた：その子はいろいろな反応をして、鳴き声と点の吹き出しで応える → 空中に 3D の窓 → done（碧が訳す） */
  touch(a, done) {
    if (!a) return; const wasGuide = this.guiding === a && a.state === "gWait"; if (this.guiding === a) this._endGuide(a);
    a.focusTo = new THREE.Vector2(this.camera.position.x, this.camera.position.z); a.goal = null; a.state = "focus"; a.raiseGoal = 0;
    this._react(a, wasGuide ? "hop" : null);
    this.openView(a);
    if (done) setTimeout(done, 650);
  }
  _react(a, force = null) {
    const R = a.R; let opts = ["hop", "startle", "spin", "shy", "dance", "together", "hop", "spin"];
    if (!this.upright) opts.push("tumble");
    if (a.flock && a.sz < .84 && a.flock.members.some(b => b !== a && b.sz > a.sz + .12)) opts.push("hide", "hide");
    if (a.curious < .3) opts.push("shy");
    if (a.lazy) opts.push("tumble");
    opts = opts.filter(k => k !== a.lastReact && (k !== "tumble" || !this.upright));
    const k = force || opts[Math.floor(R() * opts.length)]; a.lastReact = k;
    const dur = { hop: 1.3, startle: 1.4, spin: 1.1, shy: 2.2, dance: 2.4, together: 1.6, tumble: 2.2, hide: 2.6 }[k];
    a.react = { k, t: 0, dur, sgn: R() < .5 ? -1 : 1 };
    const mood = { hi: "hi", hop: "hi", startle: "oh", spin: "up", shy: "shy", dance: "wa", together: "wa", tumble: "oh", hide: "shy" }[k];
    a.bub = { hop: "up", startle: "one", spin: "spark", shy: "dots", dance: "wave", together: "up", tumble: "one", hide: "dots" }[k];
    a.say = k === "shy" || k === "hide" ? .9 : 1.4; a.sayT = 0;
    voice(a.layer, { pitch: a.pitchV, mood, vol: k === "shy" || k === "hide" ? .035 : .055, muted: this.muted() });
    if (k === "hop") a.happy = 1.02;
    if (k === "together" && a.flock) { a.happy = .68; a.flock.members.forEach((b, i) => { if (b !== a && b.layerOn) { setTimeout(() => { b.happy = Math.max(b.happy, .68); }, 120 + i * 90); if (i === 1) setTimeout(() => voice(b.layer, { pitch: b.pitchV, mood: "hi", vol: .03, muted: this.muted() }), 260); } }); }
    if (k === "hide" && a.flock) { const big = a.flock.members.filter(b => b !== a && b.sz > a.sz).sort((x, y) => y.sz - x.sz)[0]; a.hideBehind = big || null; setTimeout(() => { a.hideBehind = null; }, 2600); }
    if (k === "startle") a.squash = .5;
  }
  release(a) { if (!a) return; a.focusTo = null; a.raiseGoal = 0; a.stop("idle", 2 + Math.random() * 2); a.lookAt = 2; if (this.view?.a === a) this.closeView(); }
  _endGuide(a) { if (this.guiding === a) { this.guiding = null; this.guideCool = this.guideEvery; } a.guided = true; if (this.ring) this.ring.visible = false; if (this.tag) this.tag.visible = false; this.tagRect = null; }

  // ---- 空中の 3D の窓（一度に一つ）
  openView(a) {
    if (!this.ready) return; this.closeView();
    const hex = this.hud[a.layer] || "#ffffff", content = this._viewContent(a, hex); if (!content) return;
    const g = new THREE.Group(); g.renderOrder = 20;
    const W = 512, H = 360, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    { const gr = x.createLinearGradient(0, 6, 0, H - 6); gr.addColorStop(0, "rgba(5,10,18,.97)"); gr.addColorStop(1, "rgba(2,5,10,.97)"); x.fillStyle = gr; x.fillRect(6, 6, W - 12, H - 12); }   // 2026-10-23 深夜：後ろの景色と二重に見えないよう、地はほぼ不透明に
    x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(14, 66, W - 28, H - 66 - (40)); x.strokeStyle = hex; x.globalAlpha = .18; x.lineWidth = 1; x.strokeRect(14.5, 66.5, W - 29, H - 107); x.globalAlpha = 1;   // 中身の台（窓の地と中身の線を分ける）
    x.strokeStyle = hex; x.globalAlpha = .55; x.lineWidth = 1.2; x.strokeRect(6.5, 6.5, W - 13, H - 13); x.globalAlpha = 1; x.lineWidth = 3;
    for (const [px, py, dx, dy] of [[6, 6, 1, 1], [W - 6, 6, -1, 1], [6, H - 6, 1, -1], [W - 6, H - 6, -1, -1]]) { x.beginPath(); x.moveTo(px + dx * 26, py); x.lineTo(px, py); x.lineTo(px, py + dy * 22); x.stroke(); }
    x.globalAlpha = .07; x.fillStyle = hex; for (let y = 8; y < H - 8; y += 4) x.fillRect(8, y, W - 16, 1.4); x.globalAlpha = 1;
    x.globalAlpha = .35; x.lineWidth = 1; x.beginPath(); x.moveTo(18, 58); x.lineTo(W - 18, 58); x.stroke(); x.globalAlpha = 1;
    x.fillStyle = hex; x.font = `600 26px ${FONT}`; x.textBaseline = "middle"; x.fillText(this.names[a.layer] || a.layer, 22, 34);
    const sub = content.title || this.viewTitle?.(a) || ""; if (sub) { x.globalAlpha = .85; x.font = `500 20px ${FONT}`; x.textAlign = "right"; let s = sub; while (x.measureText(s).width > W - 260 && s.length > 2) s = s.slice(0, -2) + "…"; x.fillText(s, W - 66, 34); x.textAlign = "left"; x.globalAlpha = 1; }
    x.lineWidth = 2.4; x.beginPath(); x.moveTo(W - 44, 24); x.lineTo(W - 24, 44); x.moveTo(W - 24, 24); x.lineTo(W - 44, 44); x.stroke();   // 閉じる（窓のどこに触れても閉じる）
    if (content.note) { x.globalAlpha = .7; x.font = `500 17px ${FONT}`; x.fillText(content.note, 22, H - 26); x.globalAlpha = 1; }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1, H / W), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })); panel.renderOrder = 20; g.add(panel);
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(.96, .012), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: .28, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending })); scan.renderOrder = 22; g.add(scan);
    const box = new THREE.Group(); box.position.set(0, -.03, .02); box.renderOrder = 21; g.add(box);
    const inner = content.object; box.add(inner);
    const bb = new THREE.Box3().setFromObject(inner), sz = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3()), fit = Math.min(.78 / Math.max(sz.x, sz.z, 1e-3), .48 / Math.max(sz.y, 1e-3));
    inner.position.sub(ctr); const pivot = new THREE.Group(); box.remove(inner); pivot.add(inner); pivot.scale.setScalar(fit * (content.flat ? 1 : .92)); box.add(pivot);
    inner.traverse(o => { o.renderOrder = 21; });
    const beamG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); const beam = new THREE.Line(beamG, new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: .5, depthTest: false })); beam.renderOrder = 19; this.group.add(beam);
    this.group.add(g);
    this.view = { a, g, panel, scan, pivot, beam, t: 0, mats: content.mats || [], flat: content.flat, rect: null, tex, wave: content.wave || null };
  }
  closeView() {
    const V = this.view; if (!V) return; this.view = null;
    this.group.remove(V.g); this.group.remove(V.beam); V.tex.dispose(); V.panel.material.dispose(); V.panel.geometry.dispose(); V.scan.material.dispose(); V.scan.geometry.dispose(); V.beam.geometry.dispose(); V.beam.material.dispose();
    for (const m of V.mats) m.dispose?.(); V.g.traverse(o => { if (o.geometry?.userData?.cut) o.geometry.dispose(); });
  }
  /** 窓の中身：アプリが渡す view(a)、なければ その場にある 3D（行き先・その子のそばの形）を層の色の線で写す。sound は音の波（模式）、touch は近くの素材の面 */
  _viewContent(a, hex) {
    const r = this.viewFn?.(a); if (r === false) return null;
    if (r?.object || r?.texture) {
      if (r.texture) { const m = new THREE.MeshBasicMaterial({ map: r.texture, transparent: true, opacity: .92, depthTest: false, depthWrite: false, side: THREE.DoubleSide }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); pl.rotation.x = -.5; return { object: pl, title: r.title, note: r.note, mats: [m], flat: true }; }
      return { object: this._holoClone(r.object, hex, r.raw), title: r.title, note: r.note, mats: this._lastMats };
    }
    if (a.layer === "sound") { const w = waveObj(hex); return { object: w, title: r?.title, note: r?.note || "音の波（模式）", mats: [w.children[0].material], wave: w }; }
    const tg = a.target ? new THREE.Vector3(a.target.x, 0, a.target.z) : new THREE.Vector3(a.pos.x, 0, a.pos.y);
    if (a.layer === "touch") { const mesh = this._nearMeshes(tg, 6, 1, true)[0]; const map = mesh && [].concat(mesh.material).find(m => m?.map)?.map; if (map) { const m = new THREE.MeshBasicMaterial({ map, color: "#ffffff", transparent: true, opacity: .95, depthTest: false, depthWrite: false, side: THREE.DoubleSide }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); pl.rotation.x = -.55; return { object: pl, title: r?.title, note: r?.note || "触れる面", mats: [m], flat: true }; } }
    let ms = this._nearMeshes(tg, a.layer === "culture" ? 7 : 5, 10, false); if (!ms.length) { tg.set(a.pos.x, 0, a.pos.y); ms = this._nearMeshes(tg, 7, 10, false); } if (!ms.length) ms = this._nearMeshes(tg, 16, 4, false, true); if (!ms.length) return null;   // 何もなければ、その場の地形と道
    const grp = new THREE.Group(); for (const m of ms) grp.add(m); return { object: this._holoClone(grp, hex, true, tg), title: r?.title, note: r?.note, mats: this._lastMats };
  }
  _nearMeshes(c, R, maxN, needMap, flat = false) {
    const out = [], me = this.group, box = new THREE.Box3(), ctr = new THREE.Vector3(), szv = new THREE.Vector3(), mtx = new THREE.Matrix4();
    this.scene.updateMatrixWorld?.();
    this.scene.traverseVisible(o => {
      if (out.length >= maxN * 4 || !o.isMesh || o.isSkinnedMesh || o.isSprite) return; let p = o; while (p) { if (p === me || /aoi|vrm/i.test(p.name || "")) return; p = p.parent; }   // 碧の体は写さない
      const g = o.geometry; if (!g?.attributes?.position) return; const tris = (g.index ? g.index.count : g.attributes.position.count) / 3; if (tris > 400000) return;
      if (needMap && ![].concat(o.material).some(m => m?.map)) return;
      if (!g.boundingBox) g.computeBoundingBox();
      if (o.isInstancedMesh) {
        const n = Math.min(o.count, 4000); let k = 0;
        for (let i = 0; i < n && k < 4; i++) { o.getMatrixAt(i, mtx); mtx.premultiply(o.matrixWorld); ctr.setFromMatrixPosition(mtx); if (Math.hypot(ctr.x - c.x, ctr.z - c.z) < R) { box.copy(g.boundingBox).applyMatrix4(mtx); box.getSize(szv); if (Math.max(szv.x, szv.y, szv.z) < 30 && Math.max(szv.x, szv.y, szv.z) > .2) { const m = new THREE.Mesh(g, o.material); m.matrixAutoUpdate = false; m.matrix.copy(mtx); out.push({ m, d: Math.hypot(ctr.x - c.x, ctr.z - c.z) }); k++; } } }
        return;
      }
      box.copy(g.boundingBox).applyMatrix4(o.matrixWorld); box.getCenter(ctr); box.getSize(szv);
      const big = Math.max(szv.x, szv.y, szv.z); if (big < .2) return;
      if (big > 30 || tris > 60000) { if (needMap || !box.intersectsBox(new THREE.Box3(new THREE.Vector3(c.x - R, -1e4, c.z - R), new THREE.Vector3(c.x + R, 1e4, c.z + R)))) return; const cut = cutGeo(o, c, R, flat); if (cut) out.push({ m: cut, d: R * .5 }); return; }   // 町並みをまとめた大きな形は、その場のまわりだけ切り出す（平らな地面は除く）
      const d = Math.hypot(ctr.x - c.x, ctr.z - c.z); if (d > R) return;
      const m = new THREE.Mesh(g, o.material); m.matrixAutoUpdate = false; m.matrix.copy(o.matrixWorld); out.push({ m, d });
    });
    return out.sort((x, y) => x.d - y.d).slice(0, maxN).map(x => x.m);
  }
  _holoClone(src, hex, raw = false, origin = null) {
    const mat = holoMat(hex); this._lastMats = [mat]; const g = new THREE.Group();
    src.updateMatrixWorld?.(true);
    src.traverse(o => { if (!o.isMesh) return; const m = new THREE.Mesh(o.geometry, mat); m.matrixAutoUpdate = false; m.matrix.copy(raw ? o.matrix : o.matrixWorld); if (origin) m.matrix.premultiply(_mB.makeTranslation(-origin.x, -(this.groundAt ? this.groundAt(origin.x, origin.z) : 0), -origin.z)); m.renderOrder = 21; g.add(m); });
    return g;
  }
  _stepView(dt) {
    const V = this.view; if (!V) return; V.t += dt; const a = V.a, cam = this.camera, W = innerWidth, H = innerHeight;
    V.pd0 ??= a.pd; if (V.t > 18 || !a.layerOn || a.pd > Math.max(12, V.pd0 + 5)) { this.closeView(); return; }
    const pxW = this.mobile ? Math.min(W * .52, 210) : Math.min(W * .22, 300), pxH = pxW * 360 / 512, D = 2.2, th = Math.tan(cam.fov * Math.PI / 360);
    a.center(_v); _v.y += KASANE_H * a.S * .6; const sc = this._screen(_v) || { x: W / 2, y: H * .6 };
    const VS = this.viewSafe?.() || {}, L0 = (VS.left || 0) + 12, R0 = W - (VS.right || 0) - 12, topSafe = VS.top ?? (this.mobile ? 78 : 70); let cx = clamp(sc.x, L0 + pxW / 2, R0 - pxW / 2), cy = clamp(sc.y - pxH * .85, topSafe + pxH / 2, Math.max(topSafe + pxH / 2, H * .46));
    const av = this.avoid?.(); if (av) { const as = this._screen(_v2.set(av.x, av.y + 1.2, av.z)); if (as && Math.abs(as.x - cx) < pxW / 2 + (this.mobile ? 60 : 110)) { const left = as.x - pxW / 2 - (this.mobile ? 50 : 110), right = as.x + pxW / 2 + (this.mobile ? 50 : 110); cx = (left - pxW / 2 > L0 && (sc.x < as.x || right + pxW / 2 > R0)) ? left : right; cx = clamp(cx, L0 + pxW / 2, R0 - pxW / 2);
      if (Math.abs(as.x - cx) < pxW / 2 + 40) { const hd = this._screen(_v2.set(av.x, av.y + 1.72, av.z)); if (hd) cy = Math.max(topSafe + pxH / 2, Math.min(cy, hd.y - pxH / 2 - 8)); } } }   // 碧の体にかからない側へ（横に場所がなければ、碧の頭より上へ）
    V.rect = { x0: cx - pxW / 2, x1: cx + pxW / 2, y0: cy - pxH / 2, y1: cy + pxH / 2 };
    const nx = cx / W * 2 - 1, ny = -(cy / H * 2 - 1);
    _v2.set(nx * D * th * cam.aspect, ny * D * th, -D).applyMatrix4(cam.matrixWorld); V.g.position.copy(_v2); V.g.quaternion.copy(cam.quaternion);
    const k = pxW / H * 2 * D * th, open = clamp(V.t / .28, 0, 1), fl = V.t < .3 ? (Math.sin(V.t * 90) > 0 ? 1 : .6) : 1; V.g.scale.set(k, k * (RM ? 1 : open), k);
    V.panel.material.opacity = fl; V.scan.position.y = ((V.t * .35) % 1 - .5) * .62;
    for (const m of V.mats) if (m.uniforms) { m.uniforms.uT.value = V.t; m.uniforms.uA.value = fl; }
    if (!RM) V.pivot.rotation.y = V.flat ? Math.sin(V.t * .6) * .35 : V.t * .45;
    if (V.wave) V.wave.children.forEach(l => { const P = l.geometry.attributes.position, r = l.userData.row; for (let i = 0; i < P.count; i++) { const x = i / (P.count - 1); P.setY(i, Math.sin(x * 18 + V.t * (2 + r * .3) + r) * .12 * Math.sin(x * Math.PI) * (1 - Math.abs(r - 3) * .12)); } P.needsUpdate = true; });
    // かさねっこの頭から窓の下の縁へ、細い線
    const bp = V.beam.geometry.attributes.position; a.center(_v); _v.y += KASANE_H * a.S * .5; bp.setXYZ(0, _v.x, _v.y, _v.z);
    _v2.set(nx * D * th * cam.aspect, (ny - pxH / H) * D * th, -D).applyMatrix4(cam.matrixWorld); bp.setXYZ(1, _v2.x, _v2.y, _v2.z); bp.needsUpdate = true;
  }

  /** 2026-10-23 深夜 本人「375 で画面の端の子が切れる・碧の足に重なる」→ 近くの子が画面の左右の端にかかったら内へ、碧の足もとに重なったら横へ、少しずつ歩かせる */
  _keepInView(a, dt) {
    if (a.pd > (this.mobile ? 14 : 18) || a.state === "focus") return;
    const cam = this.camera, W = innerWidth, H = innerHeight, th = Math.tan(cam.fov * Math.PI / 360);
    _v.set(a.pos.x, (a.gy || 0) + KASANE_H * a.S * .5, a.pos.y); const dist = _v.distanceTo(cam.position), c = _v.project(cam); if (c.z > 1) return;
    const sx = (c.x * .5 + .5) * W, sy = (-c.y * .5 + .5) * H, px = KASANE_H * a.S / (2 * dist * th) * H, half = px * .6, m = this.mobile ? 14 : 10;
    const rx = -this.F.y, rz = this.F.x; let push = 0;   // 画面の右へ＝(rx, rz)
    if (sx - half < m && sx + half > -half) push = 1; else if (sx + half > W - m && sx - half < W + half) push = -1;
    const av = this.avoid?.();
    if (av && !push) { _v2.set(av.x, av.y + .25, av.z); const fd = _v2.distanceTo(cam.position), fc = _v2.project(cam); if (fc.z < 1) { const fx = (fc.x * .5 + .5) * W, fy = (-fc.y * .5 + .5) * H, aw = Math.max(24, .32 / (2 * fd * th) * H);
      if (Math.abs(sx - fx) < aw + half && sy > fy - aw * 2.4 && sy < fy + aw * .8) push = sx < fx ? -1 : 1; } }   // 碧の足もと（膝から下）の前後に重なる
    if (!push) return;
    const sp = (this.mobile ? 1.1 : .8) * dt, F = this.F;
    // 横へ（画面の内へ）。横が歩けない所なら、見る人から離れる向きへ（遠くなるほど画面の内へ寄る）
    for (const [ux, uz] of [[rx * push, rz * push], [(rx * push + F.x) * .7, (rz * push + F.y) * .7], [F.x, F.y]]) {
      const x = a.pos.x + ux * sp, z = a.pos.y + uz * sp;
      if (!this.walkable || this.walkable(x, z)) { a.pos.set(x, z); if (!a.flock) a.anchor.set(a.anchor.x + ux * sp, a.anchor.y + uz * sp); if (a.goal) { a.goal.x += ux * sp; a.goal.y += uz * sp; } if (a.flock && a.flock.mode !== "follow") { const G = a.flock, k = 1 / Math.max(1, G.members.length) * 1.5; G.c.x += ux * sp * k; G.c.y += uz * sp * k; G.anchor.x += ux * sp * k; G.anchor.y += uz * sp * k; } a.held = (a.held || 0) + dt; return; }   // 群れの子なら、群れごと少し内へ
    }
  }
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
      if (pd > this.maxDist + 12) { if (this.guiding === a) this._endGuide(a); continue; }
      this._think(a, dt, t, pd, busy);
      if (this.minCamDist && a.pd < this.minCamDist) {   // 見る人の目の前に入りすぎない（体が画面の下の帯の裏で切れない）
        const n = a.pd || 1e-3, k = this.minCamDist / n, x = this.P.x + (a.pos.x - this.P.x) * k, z = this.P.y + (a.pos.y - this.P.y) * k;
        if (!this.walkable || this.walkable(x, z)) a.pos.set(x, z); else { a.pos.x = lerp(a.pos.x, x, .5); a.pos.y = lerp(a.pos.y, z, .5); }
      }
      if (pd < this.maxDist && live.length < this.max) { live.push(a); this._keepInView(a, dt); }
    }
    // ---- 描く
    if (!this.iT) return;
    const cnt = [0, 0]; let bi = 0; for (const k in this.iI) this.iI[k].n = 0;
    let idx = 0;
    for (const a of live) {
      a.idx = idx++; const gy = a.gy, sq = a.sq, S = a.S, mir = a.mirror ? 1 : 0, im = this.iT[mir], fm = this.iF[mir], n = cnt[mir]++;
      const yaw = a.yaw + (a.yawOff || 0);
      _e.set(a.pitch, yaw, a.tilt + a.roll, "YXZ"); _q.setFromEuler(_e); _p3.set(a.pos.x, gy + a.y, a.pos.y);
      const rx = 1 + a.round, ry = 1 - a.round * .6;
      _s3.set(S * (1 - sq * .5) * rx * a.leanK, S * (1 + sq) * ry, S * (1 - sq * .5) * rx); _m.compose(_p3, _q, _s3);   // 体の写し：world = A · X（写し）。写しの組は物の行列が X なので、インスタンスには X·A·X を入れる
      const body = mir ? _mS.multiplyMatrices(_mX, _m).multiply(_mX) : _mS.copy(_m);
      im.setMatrixAt(n, _mR.multiplyMatrices(body, this.LT));
      _mA.makeScale(a.eyeK, 1, 1); _mI.copy(this.LF); _mI.elements[12] *= a.eyeK;
      fm.setMatrixAt(n, _mP.multiplyMatrices(body, _mA).multiply(this.LF));
      im.setColorAt(n, _c.set(this.body[a.layer] || "#cccccc"));
      const oT = this.oT.morphTargetInfluences; oT.fill(0); const d = this.mi.T;
      this._morph(this.oT, d, "stepL", a.stepL); this._morph(this.oT, d, "stepR", a.stepR); this._morph(this.oT, d, "swingL", a.swL); this._morph(this.oT, d, "swingR", a.swR); this._morph(this.oT, d, "raiseR", a.raise);
      im.setMorphAt(n, this.oT); this.oF.morphTargetInfluences.fill(0); this._morph(this.oF, this.mi.F, "blink", a.blinkV); fm.setMorphAt(n, this.oF);
      // 持ち物（左手のものは手の振りについていく）
      const I = a.item && this.iI[a.item];
      if (I && a.pd < (this.mobile ? 18 : 24)) {
        _mA.identity();
        if (I.hand) { const sw = a.swL || 0; _mA.makeTranslation(SHOULDER_L.x, SHOULDER_L.y, SHOULDER_L.z).multiply(_mB.makeRotationX(-.8 * sw)).multiply(_mI.makeTranslation(-SHOULDER_L.x, -SHOULDER_L.y, -SHOULDER_L.z)); }
        _mB.makeTranslation(I.mount[0], I.mount[1], I.mount[2]); _mA.multiply(_mB).multiply(_mB.makeScale(ITEM_K, ITEM_K, ITEM_K));
        const w = mir ? _mI.multiplyMatrices(_m, _mX) : _mI.copy(_m); w.multiply(_mA);
        I.im.setMatrixAt(I.n++, w);
      }
      if (this.iS) { const k = S * .2 * (1 - clamp(a.y / (.12 * S), 0, .5)); _q.identity(); _p3.set(a.pos.x, gy + .015, a.pos.y); _s3.set(k, 1, k * .9); _m.compose(_p3, _q, _s3); this.iS.setMatrixAt(a.idx, _m); }
      // 吹き出し（話している子だけ・近くだけ・画面の端と避けたい所には出さない）
      if (a.say > 0 && bi < this.bubbles.length && a.pd < 22) {
        _v.set(a.pos.x, gy + a.y + KASANE_H * S * 1.18, a.pos.y); const sc = this._screen(_v), m = this.screenMargin, bw = this.mobile ? 34 : 40;
        if (sc && sc.x > m + bw && sc.x < innerWidth - m - bw && sc.y > m + 20 && sc.y < innerHeight - m && !(this.bubbleAvoid && this.bubbleAvoid(sc.x, sc.y))) {
          const sp = this.bubbles[bi++], nDots = 1 + Math.floor((a.sayT || 0) * 3.2) % 3; sp.material.map = bubbleTex(this.hud[a.layer] || "#ffffff", a.bub || "dots", nDots); sp.material.opacity = clamp(a.say * 3, 0, 1);
          sp.position.copy(_v); const bs = .2 * Math.max(S, s * .85) * (.9 + .1 * Math.sin(t * 6)); sp.scale.set(bs, bs * .5, 1); sp.visible = true;
        }
      }
    }
    for (; bi < this.bubbles.length; bi++) this.bubbles[bi].visible = false;
    for (let m = 0; m < 2; m++) { const im = this.iT[m], fm = this.iF[m]; im.count = fm.count = cnt[m]; im.visible = fm.visible = cnt[m] > 0; im.instanceMatrix.needsUpdate = fm.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; if (im.morphTexture) im.morphTexture.needsUpdate = true; if (fm.morphTexture) fm.morphTexture.needsUpdate = true; }
    for (const k in this.iI) { const I = this.iI[k]; I.im.count = I.n; I.im.visible = I.n > 0; I.im.instanceMatrix.needsUpdate = true; }
    if (this.iS) { this.iS.count = idx; this.iS.instanceMatrix.needsUpdate = true; }
    // 案内の行き先の輪と、層の名の札
    const G = this.guiding;
    if (this.ring && G && (G.state === "gLead" || G.state === "gWait") && G.tgt) {
      const gy = this.groundAt ? this.groundAt(G.tgt.x, G.tgt.y) : 0, hex = this.hud[G.layer];
      this.ring.visible = true; this.ring.material.color.set(hex); this.ring.position.set(G.tgt.x, gy + .03, G.tgt.y);
      const k = .35 * s * (1 + .12 * Math.sin(t * 3.4)); this.ring.scale.setScalar(k); this.ring.material.opacity = .55 + .25 * Math.sin(t * 3.4);
      if (G.state === "gWait") {
        if (this.tagL !== G.layer) { this.tag.material.map = tagTex(hex, this.names[G.layer] || G.layer); this.tag.material.needsUpdate = true; this.tagL = G.layer; }
        _v.set(G.tgt.x, gy + .5 * s + .25, G.tgt.y); const dist = _v.distanceTo(cam.position), th = Math.tan(cam.fov * Math.PI / 360), pxH = this.mobile ? 34 : 38, hW = pxH / innerHeight * 2 * dist * th, asp = this.tag.material.map.userData.aspect || 4.4;
        this.tag.position.copy(_v); this.tag.scale.set(hW * asp, hW, 1); this.tag.visible = true; this.tag.material.opacity = clamp(G.t * 2.5, 0, 1);
        const sc = this._screen(_v); if (sc) { const pw = pxH * asp; this.tagRect = { x0: sc.x - pw / 2, x1: sc.x + pw / 2, y0: sc.y - pxH / 2, y1: sc.y + pxH / 2 }; } else this.tagRect = null;
      } else { this.tag.visible = false; this.tagRect = null; }
    } else if (this.ring) { this.ring.visible = false; if (this.tag) this.tag.visible = false; this.tagRect = null; }
    this._stepView(dt);
  }

  _think(a, dt, t, pd, busy) {
    const s = this.s ?? this.scale, P = this.P, F = this.F, R = a.R;
    const approach = (a.lastPd - pd) / Math.max(dt, 1e-3); a.lastPd = pd; a.pd = pd;
    a.moving = false; a.t += dt; a.peekCool = (a.peekCool || 0) - dt; a.talkT -= dt; const shyR = .55 * s + .5;
    const tx = a.pos.x - P.x, tz = a.pos.y - P.y, tl = Math.hypot(tx, tz) || 1, looked = (tx * F.x + tz * F.y) / tl > .975 && pd < 34;
    if (a.state === "focus") { if (a.focusTo && !a.hideBehind) a.faceTo(a.focusTo.x, a.focusTo.y, dt, 6); if (a.hideBehind && a.flock) this._member(a, dt, pd); }
    else if (a.state !== "shy" && !a.state.startsWith("g") && a.state !== "hide" && pd < shyR && approach > .3 && !RM) {
      const n = Math.hypot(a.pos.x - P.x, a.pos.y - P.y) || 1, d = (.5 + R() * .3) * s + .3;
      a.goTo(a.pos.x + (a.pos.x - P.x) / n * d, a.pos.y + (a.pos.y - P.y) / n * d, "shy", .95 * s * .5 + .5);
      if (R() < .3) { a.bub = "one"; a.say = .7; }
    }
    if (a.flock && a.state === "idle") a.state = "flock";
    switch (a.state) {
      case "flock": this._member(a, dt, pd); break;
      case "idle": {
        if (a.lookAt > 0 || pd < 6 * s) a.faceTo(P.x, P.y, dt, 1.8);
        if (!busy && !this.guiding && this.guideCool <= 0 && !a.guided && a.tgt0 !== false && a.target && pd < 9 && pd > 2.2 && a.role !== "watch") {
          const tg = this._targetFor(a), td = tg ? Math.hypot(tg.x - P.x, tg.y - P.y) : 0;
          if (tg && td > 4 && td < 30 && ((tg.x - P.x) * F.x + (tg.y - P.y) * F.y) / td > .2 && this.pv < .6) { this.guiding = a; a.tgt = tg; a.state = "gCome"; a.t = 0; break; }
          a.tgt0 = false;
        }
        if (a.role === "watch" && pd > 5 && pd < 24 && !busy) { a.faceTo(P.x, P.y, dt, 3); a.lookAt = 1; if (R() < dt * .18) a.happy = Math.max(a.happy, .34); a.t = 0; break; }
        if (a.role === "pair" && a.pair && a.pair.state === "idle" && a.pair.layerOn && a.talkT < 0 && Math.hypot(a.pair.pos.x - a.pos.x, a.pair.pos.y - a.pos.y) < 1.4 * s && pd < 26) {
          a.state = a.pair.state = "talk"; a.t = a.pair.t = 0; a.talkDur = a.pair.talkDur = 3.6 + R() * 2.4; a.talkT = a.pair.talkT = 7 + R() * 9; a.speaker = true; a.pair.speaker = false; break;
        }
        if (a.t > a.dur) {
          if (a.peekBack && pd > shyR * 1.4 && pd < 6 * s) {
            const n = pd || 1, d = Math.min(pd - (shyR + .3 * s), .8 * s); a.peekBack = false;
            if (d > .1) { a.goTo(a.pos.x + (P.x - a.pos.x) / n * d, a.pos.y + (P.y - a.pos.y) / n * d, "walk", .2 * s); break; }
          }
          if (pd < 13 && pd > 3 && R() < .45 && a.role !== "watch") {
            const k = this.mobile ? 5 + R() * 4 : 4.5 + R() * 3.5, rx = -F.y, rz = F.x, av = this.avoid?.(); let side = (R() - .5) * 2 * (this.mobile ? 1.1 : 2.2) * k / 6;
            if (av) { const as = (av.x - P.x) * rx + (av.z - P.y) * rz; side = -Math.sign(as || 1) * (this.mobile ? .3 + Math.abs(side) * .45 : .6 + Math.abs(side)); }
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
      case "talk": {
        const b = a.pair; if (!b || b.state !== "talk") { a.stop("idle"); a.say = 0; break; }
        a.faceTo(b.pos.x, b.pos.y, dt, 4);
        const turn = Math.floor(a.t / 1.25) % 2 === 0; const speak = a.speaker ? turn : !turn;
        if (speak) { a.say = Math.max(a.say, .4); a.bub = "dots"; a.sayT = (a.sayT || 0) + dt; } else a.sayT = 0;
        a.nod = speak ? 0 : Math.max(0, Math.sin(a.t * 5)) * .12;
        if (a.t > a.talkDur) { a.say = 0; a.nod = 0; a.stop("idle", 2 + R() * 4); }
        break;
      }
      case "gCome": {
        const rx = -F.y, rz = F.x, cd = Math.max(this.comeDist, (this.minCamDist || 0) + .6), sg = (a.pos.x - P.x) * rx + (a.pos.y - P.y) * rz >= 0 ? 1 : -1, gx = P.x + F.x * cd + rx * .7 * sg, gz = P.y + F.y * cd + rz * .7 * sg;
        if (!a.goal) a.goal = new THREE.Vector2(); a.goal.set(gx, gz); a.spd = .32 * s;
        const arrived = a.step(dt);
        if (arrived || a.t > 7) { a.state = "gGreet"; a.t = 0; a.goal = null; a.happy = .7; a.raiseGoal = 1; a.bub = "up"; voice(a.layer, { pitch: a.pitchV, mood: "hi", vol: .045, muted: this.muted() }); }
        if (pd > 16) { this._endGuide(a); a.stop("idle"); }
        break;
      }
      case "gGreet": {   // 足もとで跳ねて、手まねき（手を何度か振る）
        a.faceTo(P.x, P.y, dt, 6); a.say = Math.max(a.say, .3); a.sayT = (a.sayT || 0) + dt; a.raiseGoal = Math.sin(a.t * 7) > 0 ? 1 : .45;
        if (a.t > 1.8) { a.raiseGoal = 0; a.say = 0; a.state = "gLead"; a.t = 0; a.waitT = 0; }
        break;
      }
      case "gLead": {
        const tg = a.tgt; if (!tg) { this._endGuide(a); a.stop("idle"); break; }
        if (pd > 5.5) {
          a.goal = null; a.faceTo(P.x, P.y, dt, 5); a.waitT += dt; a.raiseGoal = Math.sin(a.waitT * 6) > .2 ? 1 : .4;
          if (a.waitT > 9 || pd > 18) { this._endGuide(a); a.raiseGoal = 0; a.stop("idle"); }
          break;
        }
        a.waitT = 0; a.raiseGoal = 0; a.lb = (a.lb || 0) + dt; if (a.lb > 2.2) { a.lb = 0; a.happy = .34; a.say = Math.max(a.say, .7); a.bub = "dots"; }
        if (!a.goal) a.goal = new THREE.Vector2(); a.goal.set(tg.x, tg.y); a.spd = clamp(.32 * s + this.pv * .45, .3, 1.1);
        const fin = a.step(dt);
        if (fin || Math.hypot(tg.x - a.pos.x, tg.y - a.pos.y) < .35) { a.state = "gWait"; a.t = 0; a.goal = null; a.bub = "spark"; a.say = 1.2; voice(a.layer, { pitch: a.pitchV, mood: "up", vol: .04, muted: this.muted() }); }
        if (a.t > 40) { this._endGuide(a); a.stop("idle"); }
        break;
      }
      case "gWait": {   // 着いた：振りかえって待つ。輪の上に層の名の札（触れると、その層が開く）
        a.faceTo(P.x, P.y, dt, 4); if (Math.sin(a.t * 2.2) > .85) a.happy = Math.max(a.happy, .32);
        a.say = a.t % 5 < 1.6 ? Math.max(a.say, .3) : a.say; a.sayT = (a.sayT || 0) + dt;
        a.raiseGoal = a.t % 4 < 1 ? (Math.sin(a.t * 7) > 0 ? .9 : .4) : 0;
        if (a.t > 26 || (pd < 1.6 && a.t > 6) || pd > 20) { this._endGuide(a); a.anchor.set(a.pos.x, a.pos.y); a.stop("idle", 3 + R() * 3); a.lookAt = 3; a.raiseGoal = 0; }
        break;
      }
    }
    // ---- 体（跳ね・つぶれ・かしげ・見上げ・まばたき・足と手）。跳ねの高さ・かしげの多さは個体の癖
    const moving = a.moving, sp = a.mv / Math.max(.01, s);
    const stepLen = .055 * (1 + clamp(sp / .2 - 1, 0, 2) * .4), rate = moving ? sp / stepLen : 0;
    let y = 0, sq = 0, stepL = 0, stepR = 0, swL = 0, swR = 0, yawOff = 0, rollAdd = 0, pitchAdd = 0;
    if (moving && !RM) {
      a.ph += rate * dt; if (a.ph >= 1) { a.ph -= 1; a.side ^= 1; a.squash = .14; }
      const k = Math.sin(a.ph * Math.PI); y = k * .022 * s * a.sz * a.hopK * clamp(sp / .2, .6, 1.4);
      if (a.side) { stepL = k; swR = k * .8; } else { stepR = k; swL = k * .8; }
      if (a.ph < .14) sq -= .1 * (1 - a.ph / .14); else sq += .04 * k;
    } else a.ph = 0;
    a.squash = Math.max(0, a.squash - dt * 1.4);
    if (a.happy > 0 && !RM) { a.happy -= dt; const k = (a.happy % .34) / .34; y += Math.sin(k * Math.PI) * .03 * s * a.sz * a.hopK; if (k < .15) sq -= .08; }
    // 触れたときの反応
    const X = a.react;
    if (X && !RM) {
      X.t += dt; const u = X.t / X.dur, e = clamp(u, 0, 1);
      switch (X.k) {
        case "startle": { if (X.t < .3) { const n = a.pd || 1, v = .9 * s * dt; const nx = a.pos.x + (a.pos.x - P.x) / n * v, nz = a.pos.y + (a.pos.y - P.y) / n * v; if (!this.walkable || this.walkable(nx, nz)) a.pos.set(nx, nz); y += Math.sin(X.t / .3 * Math.PI) * .05 * s * a.sz; } pitchAdd -= .18 * Math.sin(e * Math.PI); break; }
        case "spin": { yawOff = Math.PI * 2 * (1 - Math.pow(1 - clamp(X.t / .8, 0, 1), 3)) * X.sgn; y += Math.sin(clamp(X.t / .8, 0, 1) * Math.PI) * .035 * s * a.sz; break; }
        case "shy": { const k = Math.sin(e * Math.PI); yawOff = .85 * X.sgn * clamp(k * 1.6, 0, 1); pitchAdd += .22 * clamp(k * 1.6, 0, 1); a.raiseGoal = u < .8 ? .85 : 0; break; }
        case "dance": { rollAdd = Math.sin(X.t * 9) * (this.upright ? .1 : .16); yawOff = Math.sin(X.t * 4.5) * .45; y += Math.abs(Math.sin(X.t * 9)) * .02 * s * a.sz; swL = Math.max(0, Math.sin(X.t * 9)) * .8; swR = Math.max(0, -Math.sin(X.t * 9)) * .8; a.raiseGoal = Math.sin(X.t * 4.5) > .3 ? .8 : 0; break; }
        case "tumble": { const k = X.t < .3 ? X.t / .3 : X.t < .9 ? 1 : Math.max(0, 1 - (X.t - .9) / .7); rollAdd = 1.05 * X.sgn * k * k; y += k * .03 * s * a.sz; if (X.t > 1.6 && !X.hop) { X.hop = 1; a.happy = .34; } break; }
        case "hide": { if (X.t > 1.4) yawOff = Math.sin(X.t * 3) * .25; break; }
      }
      if (X.t >= X.dur) { a.react = null; if (a.raiseGoal > 0 && X.k !== "hop") a.raiseGoal = 0; }
    }
    const breath = Math.sin(t * 1.9 + a.anchor.x) * .012;
    a.tiltT -= dt;
    if (a.tiltT < 0 && !moving) { a.tiltGoal = (R() < .5 ? -1 : 1) * (.18 + R() * .12); a.tiltT = (5 + R() * 10) * (1.4 - a.curious); a.tiltHold = 1 + R() * .9; }
    if (a.tiltHold > 0) { a.tiltHold -= dt; if (a.tiltHold <= 0) a.tiltGoal = 0; }
    if (moving) a.tiltGoal = 0;
    if (this.upright) a.tiltGoal = clamp(a.tiltGoal, -.16, .16);
    const lookUp = !moving && (pd < 5 * s || a.state === "focus" || a.state === "gWait" || a.state === "gGreet") ? clamp((5 * s - pd) / (5 * s), 0, 1) * .22 + (a.state === "focus" ? .08 : 0) : 0;
    a.tilt = lerp(a.tilt, a.tiltGoal, 1 - Math.exp(-dt * 5));
    a.pitch = lerp(a.pitch, (moving ? .09 : 0) - lookUp + (a.nod || 0) + pitchAdd, 1 - Math.exp(-dt * 5));
    a.roll = (moving ? Math.sin(a.ph * Math.PI * 2 + (a.side ? Math.PI : 0)) * .05 : 0) + rollAdd;
    a.yawOff = yawOff;
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
  info() { const n = this.iT ? this.iT[0].count + this.iT[1].count : 0; let it = 0, calls = 0; for (const k in this.iI) { it += this.iI[k].im.count; if (this.iI[k].im.count) calls++; } return { agents: this.agents.length, drawn: n, items: it, tris: n * (1064 + 432 + 2), calls: (this.iT ? (this.iT[0].count ? 2 : 0) + (this.iT[1].count ? 2 : 0) + 1 : 0) + calls, view: !!this.view }; }
  dispose() { this.closeView(); this.scene.remove(this.group); }
}
