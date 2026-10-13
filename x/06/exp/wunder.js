/* 驚異の部屋（Wunderkammer）の標本の壁（2026-10-09 夜に作り直し）。
   本人（2026-10-09）：「壁について、磁石実験の背後の石や砂の標本が置いてあるところの方がいいです。これを全面にしてください。」
   → 部屋の四つの壁を、木とガラスの標本の棚で埋める（入口の扉と右の窓はあける。窓の下は低い引き出しだけ）。
   棚は約 1.2 m ごとの「区画」に分け、区画ごとに一つの主題：鉱物・岩石・砂・土の断面（模型）・地層の柱（模型）・種子と土の瓶。
   標本の名前は段ごとの札（左から順）に書き、形と色は教科書の水準に合わせる：
     石英＝六角の柱と先のとがり（無色）／紫水晶＝紫の石英／黄鉄鉱＝真鍮色の立方体／磁鉄鉱＝黒い八面体／方解石＝無色の菱面体／蛍石＝緑の立方体。
     岩石＝色と粒の見え方（花崗岩は白・灰・黒の粒、玄武岩は黒っぽく細かい、黒曜石は黒くつやのある石 など）。
     土の断面＝日本の土壌分類体系（日本ペドロジー学会 2017）の土壌群の典型的な層の並び。地層の柱＝層の並びの模式（厚さは場所で大きく変わる）。
   生きものの尊厳に配慮して、剥製・骨格は置かない。形はすべてこの画面の中で作る。
   スマホを軽く：棚の木部・ガラス・札は材料ごとに一つの形にまとめ（mergeGeometries）、標本は種類ごとに InstancedMesh で一度に描く。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { tex, label, canvasTex } from "./util.js";
import { makeTree, makeRoots } from "./plant.js";

function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

// ---------------------------------------------------------------- 標本の中身（名前は札にそのまま出る）
const MINERALS = [   // [名前, 形, 色]
  ["石英", "hex", 0xe8eef2], ["紫水晶", "hex", 0x8e5fb5], ["黄鉄鉱", "cubeM", 0xc9a94a], ["磁鉄鉱", "octa", 0x202024], ["方解石", "rhomb", 0xf2efe6], ["蛍石", "cubeT", 0x6fbf8f],
];
const ROCKS = [
  [["花崗岩", 0xd6cdc4], ["安山岩", 0x8a8a86], ["玄武岩", 0x3e3f40], ["黒曜石", 0x141416]],
  [["軽石", 0xddd6c6], ["スコリア", 0x4a2c24], ["凝灰岩", 0xb9b79a], ["礫岩", 0x8c7d68]],
  [["砂岩", 0xb89d74], ["泥岩", 0x5f5b54], ["石灰岩", 0xcdc8bc], ["チャート", 0x8a4f40]],
];
const SANDS = [
  [["石英の砂", 0xece6d8], ["砂鉄", 0x262628], ["火山の黒い砂", 0x3d3a38], ["サンゴ礁の砂", 0xf1ebe0]],
  [["川の砂", 0x9b9282], ["鉄で赤い砂", 0xb8693e], ["星の砂（有孔虫の殻）", 0xefe4cf], ["貝がらの砂", 0xe3d8c4]],
  [["まさ土（花崗岩の砂）", 0xcdbb9a], ["火山灰", 0x9e968a], ["海岸の砂", 0xc8b48e], ["砂丘の砂", 0xd9c7a2]],
];
// 地層の柱（上から）：[名, 色, 厚さの割合]
const STRATA = [
  ["台地（武蔵野）", [["黒い土", "#1f1712", .14], ["関東ローム", "#8a5a36", .22], ["軽石の層", "#d9b45a", .05], ["関東ローム", "#7a4e2e", .2], ["砂利の層", "#8d8a82", .39]]],
  ["低地（川のそば）", [["田の土", "#4a3a2a", .12], ["灰色の粘土", "#6f7a78", .25], ["砂", "#b5a07a", .2], ["泥", "#5a5a52", .18], ["砂利", "#8d8a82", .25]]],
  ["火山のふもと", [["黒い土", "#231a14", .15], ["火山灰", "#a59a84", .2], ["スコリア", "#3a2622", .15], ["軽石", "#e0d6b8", .15], ["ローム", "#7a4e2e", .35]]],
  ["海辺", [["砂", "#d8c8a0", .3], ["貝がらまじりの砂", "#e6dccb", .2], ["泥", "#5f5d55", .2], ["砂", "#c8b48e", .3]]],
];
// 土の断面（モノリスの模型）：上から [色, 終わる深さの割合]、まだら（斑紋）の色
const MONO = [
  ["黒ボク土", [["#16110d", .34], ["#3a2a1e", .42], ["#8a5a30", 1]], null],
  ["ポドゾル", [["#2a1a10", .05], ["#bdb7aa", .2], ["#4a2a18", .28], ["#a8582a", .55], ["#b8a07a", 1]], null],
  ["赤黄色土", [["#5a3e28", .1], ["#b8642e", .55], ["#c8823a", 1]], null],
  ["グライ土", [["#5a5048", .16], ["#7a8a88", .62], ["#6e8486", 1]], "#b8682e"],
];
const JARS = [
  [["黒ボク土", 0x231a14], ["関東ローム", 0x7a4a2a], ["赤黄色土", 0xb56a34], ["砂丘の砂", 0xd6c49c], ["田んぼの土", 0x5d5a50]],
  null,   // 種子の標本箱
  [["腐葉土", 0x3a2a1c], ["粘土", 0x8a7f70], ["まさ土", 0xc9b48e], ["火山灰", 0xa49a8a], ["泥炭", 0x2a1f17]],
];
const THEMES = { min: "鉱物", rock: "岩石", sand: "砂", mono: "土の断面（模型）", strata: "地層の柱（模型）", seed: "種子と土の瓶" };
const ORDER = ["min", "rock", "sand", "mono", "strata", "seed"];

// 形
function hexCrystal() {   // 六角の柱＋六角錐（石英）。高さ 0〜2.8、半径 1
  const a = new THREE.CylinderGeometry(1, 1, 2, 6); a.translate(0, 1, 0);
  const b = new THREE.ConeGeometry(1, .8, 6); b.translate(0, 2.4, 0);
  return mergeGeometries([a.toNonIndexed(), b.toNonIndexed()]);
}
function rhomb() { const g = new THREE.BoxGeometry(1, 1, 1); const m = new THREE.Matrix4().set(1, .45, 0, 0, 0, 1, 0, 0, .3, .45, 1, 0, 0, 0, 0, 1); g.applyMatrix4(m); return g; }   // 菱面体（方解石）
function lump(seed, amp = .28) {
  const R = rng(seed), g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, ph = [R() * 6, R() * 6, R() * 6];
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), n = Math.sin(v.x * 2.1 + ph[0]) * Math.sin(v.y * 2.7 + ph[1]) * Math.sin(v.z * 1.9 + ph[2]); v.multiplyScalar(1 + amp * n); v.y *= .72; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
const speckle = () => canvasTex(256, 256, (c, w, h) => {   // 岩石・砂の粒の見え方（白地に黒・灰・白の粒。色はひとつずつの色をかける）
  c.fillStyle = "#e9e6e0"; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = Math.random(); c.fillStyle = v < .25 ? "rgba(20,20,20,.55)" : v < .5 ? "rgba(255,255,255,.7)" : `rgba(${120 + Math.random() * 80},${110 + Math.random() * 70},${100 + Math.random() * 60},.35)`; const s = 1 + Math.random() * 3; c.fillRect(Math.random() * w, Math.random() * h, s, s); }
});

export function buildWunder(scene, ctx) {
  const { RX, RZ, std, glassMat, obst, clickables, decorTick, openings = {} } = ctx;
  const R = rng(9);
  const wood = new THREE.MeshStandardMaterial({ map: tex("wood_dark", 1, 1), color: 0x7a5a40, roughness: .55 });
  const woodL = new THREE.MeshStandardMaterial({ map: tex("wood_light", 1, 1), color: 0xc9a77a, roughness: .55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8913a, roughness: .32, metalness: .9 });
  const glassDoor = new THREE.MeshPhysicalMaterial({ color: 0xdfe9ee, roughness: .04, transparent: true, opacity: .08, depthWrite: false });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false });
  const back = new THREE.MeshStandardMaterial({ color: 0x24302c, roughness: .9 });   // 棚の奥の板（深い緑。標本が浮かび上がる）
  const paper = std(0xefe6d2, .9);
  const speck = speckle(); speck.wrapS = speck.wrapT = THREE.RepeatWrapping;

  // ---- 木部・ガラス・札をまとめる箱（材料×主題ごとに一つの形にする）
  const B = new Map();
  const M_ = new THREE.Matrix4(), Q_ = new THREE.Quaternion(), Y_ = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
  function put(mat, theme, geo, pos, yaw) {
    const k = mat.uuid + "|" + theme; if (!B.has(k)) B.set(k, { mat, theme, geos: [] });
    Q_.setFromAxisAngle(Y_, yaw); M_.compose(pos, Q_, ONE); geo.applyMatrix4(M_); B.get(k).geos.push(geo.index ? geo.toNonIndexed() : geo);
  }
  const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d), planeG = (w, h) => new THREE.PlaneGeometry(w, h);
  // ---- 札（文字の板）：同じ文は同じ材料を使い回す
  const cardMats = new Map();
  function cardMat(text, { h = 56, size = 30, bg = "#efe6d2", ink = "#2a221a", w = 1024 } = {}) {
    const k = text + "|" + h; if (cardMats.has(k)) return cardMats.get(k);
    const t = canvasTex(w, h, (c, W, H) => { c.fillStyle = bg; c.fillRect(0, 0, W, H); c.strokeStyle = "rgba(60,40,20,.5)"; c.lineWidth = 3; c.strokeRect(3, 3, W - 6, H - 6); c.fillStyle = ink; c.font = `600 ${size}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; c.textBaseline = "middle"; c.textAlign = "center"; c.fillText(text, W / 2, H / 2 + 1, W - 30); });
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: .85 }); cardMats.set(k, m); return m;
  }
  // ---- 標本（種類ごとの InstancedMesh。置き場所を先に集め、最後に数ぴったりで作る）
  const crystalMat = new THREE.MeshPhysicalMaterial({ roughness: .08, metalness: 0, transparent: true, opacity: .82, clearcoat: 1 });
  const metalMat = new THREE.MeshStandardMaterial({ roughness: .3, metalness: .85 });
  const rockMat = new THREE.MeshStandardMaterial({ map: speck, roughness: .8 });
  const sandMat = new THREE.MeshStandardMaterial({ map: speck, roughness: .95 });
  const KIND = {
    hex: { geo: hexCrystal(), mat: crystalMat, decor: "w_min" }, cubeT: { geo: new THREE.BoxGeometry(1, 1, 1), mat: crystalMat, decor: "w_min" },
    cubeM: { geo: new THREE.BoxGeometry(1, 1, 1), mat: metalMat, decor: "w_min" }, octa: { geo: new THREE.OctahedronGeometry(1, 0), mat: metalMat, decor: "w_min" },
    rhomb: { geo: rhomb(), mat: crystalMat, decor: "w_min" }, matrix: { geo: lump(3, .2), mat: rockMat, decor: "w_min" },
    rock: { geo: lump(7), mat: rockMat, decor: "w_rock" }, rock2: { geo: lump(11, .35), mat: rockMat, decor: "w_rock" },
    dish: { geo: new THREE.CylinderGeometry(1, 1, 1, 24), mat: glassMat, decor: "w_sand" }, sand: { geo: new THREE.CylinderGeometry(1, 1, 1, 24), mat: sandMat, decor: "w_sand" },
    sandHeap: { geo: new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat: sandMat, decor: "w_sand" },
    core: { geo: new THREE.CylinderGeometry(1, 1, 1, 14), mat: new THREE.MeshStandardMaterial({ roughness: .95, map: tex("soil_diff", .2, 1) }), decor: "w_strata" },
    jar: { geo: new THREE.CylinderGeometry(1, 1, 1, 14), mat: glassMat, decor: "w_seed" }, fill: { geo: new THREE.CylinderGeometry(1, 1, 1, 14), mat: new THREE.MeshStandardMaterial({ roughness: .95, map: tex("soil_diff", .3, .3) }), decor: "w_seed" },
    lid: { geo: new THREE.CylinderGeometry(1, 1, 1, 14), mat: brass, decor: "w_seed" }, seed: { geo: new THREE.SphereGeometry(1, 8, 6), mat: new THREE.MeshStandardMaterial({ roughness: .6 }), decor: "w_seed" },
    knob: { geo: new THREE.SphereGeometry(.012, 8, 6), mat: brass, decor: null },
  };
  const IN = Object.fromEntries(Object.keys(KIND).map(k => [k, []]));
  const C_ = new THREE.Color();
  const inst = (k, p, s, col, rot) => IN[k].push([p.clone(), s.clone ? s.clone() : new THREE.Vector3(s, s, s), col ?? 0xffffff, rot ? rot.clone() : new THREE.Euler()]);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---- 土の断面（モノリス）の絵
  const monoTex = MONO.map(([, lay, mot], i) => canvasTex(64, 512, (c, w, h) => {
    let y0 = 0; for (const [col, end] of lay) { c.fillStyle = col; c.fillRect(0, y0 * h, w, (end - y0) * h + 1); y0 = end; }
    for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(${Math.random() < .5 ? "0,0,0" : "255,240,220"},${Math.random() * .12})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // 層の境は少しゆらぐ
    y0 = 0; for (const [col, end] of lay.slice(0, -1)) { c.fillStyle = col; for (let x = 0; x < w; x += 4) c.fillRect(x, end * h - 3 + Math.sin(x * .3 + i) * 3, 4, 5); }
    if (mot) for (let k = 0; k < 60; k++) { c.fillStyle = mot; c.globalAlpha = .55; c.beginPath(); c.ellipse(Math.random() * w, (.1 + Math.random() * .8) * h, 1 + Math.random() * 3, 2 + Math.random() * 6, 0, 0, 7); c.fill(); c.globalAlpha = 1; }   // 酸化鉄のまだら（斑紋）
    c.strokeStyle = "rgba(230,215,180,.35)"; c.lineWidth = 1; for (let k = 0; k < 10; k++) { let x = Math.random() * w, y = 0; c.beginPath(); c.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (Math.random() - .5) * 8; y += 10 + Math.random() * 14; c.lineTo(x, y); } c.stroke(); }   // 根
  }));
  const monoMat = monoTex.map(t => new THREE.MeshStandardMaterial({ map: t, roughness: .95 }));

  // ---------------------------------------------------------------- 棚の一続き
  //   起点 o・横の向き ux・前の向き fz（部屋の内側）・長さ len。low＝窓の下（引き出しだけ）
  let themeI = 0;
  const H = 3.3, D = .55, BODY = 1.0;   // 棚の高さ 3.3 m（4 段）＝壁の上の方まで標本で埋める
  function run(o, ux, fz, len, { low = false } = {}) {
    const yaw = Math.atan2(fz.x, fz.z);
    // 札の「左から」と並びを合わせる：棚の前に立った人の右手の向きへ u が増えるようにする
    const right = V3(Math.cos(yaw), 0, -Math.sin(yaw)); if (ux.dot(right) < 0) { o = o.clone().addScaledVector(ux, len); ux = right; }
    const at =(u, y, f) => o.clone().addScaledVector(ux, u).addScaledVector(fz, f).setY(y);
    const nb = Math.max(1, Math.round(len / 1.2)), bw = len / nb;
    for (let b = 0; b < nb; b++) {
      const u0 = b * bw, uc = u0 + bw / 2, th = low ? "seed" : ORDER[themeI++ % ORDER.length], dec = "w_" + th;
      // 下＝引き出しの箱（真鍮のつまみと札）
      put(wood, dec, boxG(bw, BODY, D), at(uc, BODY / 2, D / 2), yaw);
      put(woodL, dec, boxG(bw, .04, D + .02), at(uc, BODY, D / 2 + .01), yaw);
      for (const cu of [-.25, .25]) for (let r = 0; r < 3; r++) {
        const u = uc + cu * bw * .9, y = .2 + r * .26;
        put(woodL, dec, boxG(bw / 2 - .04, .22, .02), at(u, y, D + .005), yaw);
        put(paper, dec, boxG(.08, .035, .004), at(u, y + .06, D + .018), yaw);
        inst("knob", at(u, y, D + .03), 1);
      }
      if (low) continue;
      // 上＝ガラス戸の棚（奥の板・側板・天の飾り）
      put(back, dec, boxG(bw, H - BODY, .02), at(uc, BODY + (H - BODY) / 2, .01), yaw);
      put(wood, dec, boxG(.05, H - BODY, D), at(u0 + .025, BODY + (H - BODY) / 2, D / 2), yaw);
      put(wood, dec, boxG(bw + .02, .14, D + .08), at(uc, H + .07, D / 2 + .02), yaw);
      put(wood, dec, boxG(bw + .04, .05, D + .12), at(uc, H + .165, D / 2 + .04), yaw);
      put(glassDoor, dec, planeG(bw - .08, H - BODY - .06), at(uc, BODY + (H - BODY) / 2, D + .012), yaw);
      for (const du of [0, bw]) put(wood, dec, boxG(.04, H - BODY, .04), at(u0 + du, BODY + (H - BODY) / 2, D + .01), yaw);
      // 区画の題（天の飾りの前）
      put(cardMat(THEMES[th], { h: 64, size: 40, bg: "#2a2018", ink: "#e9d9b0", w: 512 }), dec, planeG(Math.min(.9, bw - .2), .11), at(uc, H + .07, D + .065), yaw);
      const shelfY = [1.05, 1.6, 2.15, 2.7];
      if (th === "mono") {   // 土の断面：棚板なし。背の高い板 4 枚
        const pw = (bw - .2) / 4;
        MONO.forEach(([name], i) => { const u = u0 + .1 + pw * (i + .5); put(monoMat[i], dec, planeG(pw - .05, 1.9), at(u, 1.12 + .95, .06), yaw); put(wood, dec, boxG(pw - .02, .03, .06), at(u, 1.1, .05), yaw); put(wood, dec, boxG(pw - .02, .03, .06), at(u, 3.04, .05), yaw); });
        put(cardMat("左から　" + MONO.map(m => m[0]).join("・") + "（断面の模型）"), dec, planeG(bw - .12, .055), at(uc, 1.065, D - .04), yaw);
        put(lamp, dec, boxG(bw - .1, .01, .02), at(uc, 3.2, D - .1), yaw);
        continue;
      }
      shelfY.forEach((y, s) => {
        put(woodL, dec, boxG(bw - .06, .02, D - .08), at(uc, y, D / 2), yaw);
        put(lamp, dec, boxG(bw - .1, .01, .02), at(uc, y + .5, D - .1), yaw);
        const names = [];
        const slot = (n, i) => u0 + .1 + (bw - .2) * (i + .5) / n, f = D / 2 - .02;
        if (th === "min") {
          const list = s % 2 ? [...MINERALS].reverse() : MINERALS;
          list.forEach(([name, kind, col], i) => {
            names.push(name); const p = at(slot(6, i), y + .01, f);
            inst("matrix", p.clone().setY(y + .024), V3(.055, .034, .048), 0x8a857c, new THREE.Euler(0, R() * 6, 0));
            if (kind === "hex") for (let k = 0; k < (name === "石英" ? 4 : 6); k++) { const r = name === "石英" ? .011 + R() * .005 : .007 + R() * .004, l = name === "石英" ? .065 + R() * .04 : .03 + R() * .02; inst("hex", p.clone().add(V3((R() - .5) * .055, .04, (R() - .5) * .04)), V3(r, l / 2.8, r), col, new THREE.Euler((R() - .5) * .7, R() * 6, (R() - .5) * .7)); }
            else if (kind === "cubeM" || kind === "cubeT") for (let k = 0; k < 3; k++) { const a = .022 + R() * .014; inst(kind, p.clone().add(V3((R() - .5) * .05, .042 + a / 2 * .6, (R() - .5) * .035)), V3(a, a, a), kind === "cubeT" && k === 2 ? 0x8e6fc4 : col, new THREE.Euler(R() * .4, R() * 6, R() * .4)); }
            else if (kind === "octa") for (let k = 0; k < 3; k++) { const a = .016 + R() * .008; inst("octa", p.clone().add(V3((R() - .5) * .05, .045 + a * .5, (R() - .5) * .035)), V3(a, a, a), col, new THREE.Euler(R() * .3, R() * 6, R() * .3)); }
            else if (kind === "rhomb") for (let k = 0; k < 2; k++) { const a = .03 + R() * .014; inst("rhomb", p.clone().add(V3((k - .5) * .035, .042 + a / 2, 0)), V3(a, a * .8, a), col, new THREE.Euler(0, R() * 6, 0)); }
          });
        } else if (th === "rock") {
          ROCKS[s % 3].forEach(([name, col], i) => { names.push(name); const p = at(slot(4, i), y + .05, f); const sc = .072 + R() * .02; inst(name === "軽石" || name === "スコリア" ? "rock2" : "rock", p, V3(sc * 1.15, sc, sc * .9), col, new THREE.Euler(0, R() * 6, 0)); });
        } else if (th === "sand") {
          SANDS[s % 3].forEach(([name, col], i) => { names.push(name); const p = at(slot(4, i), y + .012, f); inst("dish", p.clone().setY(y + .022), V3(.095, .034, .095)); inst("sand", p.clone().setY(y + .017), V3(.09, .014, .09), col); inst("sandHeap", p.clone().setY(y + .024), V3(.06, .022, .06), col); });
        } else if (th === "strata") {
          STRATA.forEach(([name, lay], i) => { names.push(name); const p = at(slot(4, i), y + .01, f); let yy = y + .012; const T = .46; for (const [, col, fr] of lay) { const hh = T * fr; inst("core", p.clone().setY(yy + hh / 2), V3(.05, hh, .05), new THREE.Color(col).getHex()); yy += hh; } });
        } else {   // seed：瓶と種子の箱
          if (JARS[s % 3]) JARS[s % 3].forEach(([name, col], i) => { names.push(name); const p = at(slot(5, i), y, f); inst("jar", p.clone().setY(y + .11), V3(.055, .2, .055)); inst("fill", p.clone().setY(y + .015 + .06), V3(.05, .12, .05), col); inst("lid", p.clone().setY(y + .215), V3(.06, .022, .06)); });
          else for (let i = 0; i < 5; i++) { const p = at(slot(5, i), y + .01, f); put(woodL, dec, boxG(.16, .015, .12), p.clone().setY(y + .018), yaw); const sc = [0x6b4f2a, 0xc9a45a, 0x2f2a24, 0x8a5a3a, 0xd9c79a][i]; for (let k = 0; k < 9; k++) inst("seed", p.clone().add(V3((k % 3 - 1) * .04, .03, (Math.floor(k / 3) - 1) * .03)), V3(.011, .008, .009), sc); }
        }
        const text = names.length ? "左から　" + names.join("・") + (th === "strata" ? "（模型）" : "") : "種子の標本箱（模型）";
        put(cardMat(text), dec, planeG(bw - .12, .045), at(uc, y + .012, D - .035), yaw);
      });
    }
    // 歩けない所
    const ends = [o, o.clone().addScaledVector(ux, len), o.clone().addScaledVector(fz, D + .05), o.clone().addScaledVector(ux, len).addScaledVector(fz, D + .05)];
    obst.push({ x0: Math.min(...ends.map(e => e.x)) - .02, x1: Math.max(...ends.map(e => e.x)) + .02, z0: Math.min(...ends.map(e => e.z)) - .02, z1: Math.max(...ends.map(e => e.z)) + .02 });
  }
  const X = V3(1, 0, 0), Z = V3(0, 0, 1);   // 向きは run の中で人の右手へそろえる
  // 奥の壁（入口から正面）・左の壁・右の壁（窓をあける）・手前の壁（扉をあける）
  run(V3(-RX + D, 0, -RZ), X, Z, RX * 2 - 2 * D);
  run(V3(-RX, 0, -RZ), Z, X, RZ * 2);
  const W = openings.window, Dr = openings.door;
  run(V3(RX, 0, RZ), Z.clone().negate(), X.clone().negate(), RZ - W[1] - .05);
  run(V3(RX, 0, W[1]), Z.clone().negate(), X.clone().negate(), W[1] - W[0], { low: true });
  run(V3(RX, 0, W[0] - .05), Z.clone().negate(), X.clone().negate(), W[0] + RZ - .05);
  run(V3(RX - D, 0, RZ), X.clone().negate(), Z.clone().negate(), RX - D - Dr[1] - .1);
  run(V3(Dr[0] - .1, 0, RZ), X.clone().negate(), Z.clone().negate(), Dr[0] - .1 + RX - D);

  // ---- まとめて置く
  for (const { mat, theme, geos } of B.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat); m.userData.decor = theme; scene.add(m); clickables.push(m);
  }
  const M4 = new THREE.Matrix4(), Qe = new THREE.Quaternion();
  for (const [k, arr] of Object.entries(IN)) {
    if (!arr.length) continue;
    const im = new THREE.InstancedMesh(KIND[k].geo, KIND[k].mat, arr.length);
    arr.forEach(([p, s, col, e], i) => { Qe.setFromEuler(e); M4.compose(p, Qe, s); im.setMatrixAt(i, M4); im.setColorAt(i, C_.set(col)); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
    scene.add(im); if (KIND[k].decor) { im.userData.decor = KIND[k].decor; clickables.push(im); }
  }

  // ---- 古い植物図版（PD／CC0）と押し葉の標本：奥の壁の棚の上に額で
  const plates = [["plate_shoryo", "薯莨（『植物名實圖考』）"], ["plate_tougarashi", "唐辛子の株（『花の図譜』）"], ["herbarium_saccharum", "押し葉の標本（スミソニアン）"], ["plate_tomato", "畝のあるトマト（『アンティル諸島の薬用植物誌』）"], ["plate_kansho", "サトウキビ（『フィリピン植物誌』）"]];
  const loader = new THREE.TextureLoader(), frameM = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: .4, metalness: .3 });
  plates.forEach(([f, t], i) => {
    if (i === 2) return;   // まん中は館の名札
    const g = new THREE.Group(); const x = [-7.6, -3.9, 0, 3.9, 7.6][i]; g.position.set(x, 4.25, -RZ + .03); scene.add(g);
    const tx = loader.load(`data/img/${f}.jpg`, tt => { const a = tt.image.width / tt.image.height; pic.scale.set(a, 1, 1); fr.scale.set(a + .1, 1.1, 1); }); tx.colorSpace = THREE.SRGBColorSpace;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshStandardMaterial({ map: tx, roughness: .8 })); pic.position.z = .02; g.add(pic);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), frameM); fr.position.z = .01; g.add(fr);
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .07), cardMat(t, { h: 56, size: 26 })); cap.position.set(0, -.68, .02); g.add(cap);
  });
  { const g = new THREE.Group(); g.position.set(0, 4.25, -RZ + .03); scene.add(g);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.15), new THREE.MeshStandardMaterial({ map: loader.load("data/img/herbarium_saccharum.jpg", t => { t.colorSpace = THREE.SRGBColorSpace; }), roughness: .8 })); pic.position.z = .02; g.add(pic);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.25), frameM); fr.position.z = .01; g.add(fr);
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(.9, .06), cardMat(plates[2][1], { h: 56, size: 26 })); cap.position.set(0, -.7, .02); g.add(cap); }

  // ---- 驚異の机（部屋のまん中）：真鍮の顕微鏡・拡大鏡・天球儀の骨組み・木と根の模型
  { const g = new THREE.Group(); g.position.set(0, 0, -1.2); scene.add(g);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, .06, .9), wood); top.position.y = .86; g.add(top);
    for (const [x, z] of [[-.82, -.38], [.82, -.38], [-.82, .38], [.82, .38]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.03, .025, .83, 8), wood); l.position.set(x, .415, z); g.add(l); }
    const mic = new THREE.Group(); mic.position.set(-.55, .89, 0); g.add(mic);
    const blk = std(0x1d2321, .35, .2), cyl = (a, b, h, m, s = 14) => new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, s), m), bx = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(.075, .085, .022, 28, 1, false, .5, Math.PI * 2 - 1), brass); foot.position.y = .011; mic.add(foot);   // 馬蹄形の足
    const pillar = cyl(.014, .016, .12, brass); pillar.position.y = .08; mic.add(pillar);
    const knuckle = cyl(.02, .02, .05, brass, 16); knuckle.rotation.x = Math.PI / 2; knuckle.position.y = .145; mic.add(knuckle);
    const tilt = new THREE.Group(); tilt.position.y = .145; tilt.rotation.z = .22; mic.add(tilt);
    const limb = bx(.025, .2, .02, brass); limb.position.set(-.02, .09, 0); tilt.add(limb);
    const stage = bx(.1, .008, .09, blk); stage.position.set(.02, .03, 0); tilt.add(stage);
    for (const z of [-.025, .025]) { const clip = bx(.035, .003, .006, brass); clip.position.set(.035, .036, z); tilt.add(clip); }
    const tubeM = cyl(.017, .017, .16, brass, 20); tubeM.position.set(.03, .16, 0); tilt.add(tubeM);
    const coarse = cyl(.016, .016, .05, brass, 18); coarse.rotation.x = Math.PI / 2; coarse.position.set(-.005, .17, 0); tilt.add(coarse);
    const eye = cyl(.012, .014, .04, blk, 16); eye.position.set(.03, .26, 0); tilt.add(eye);
    const obj = cyl(.006, .01, .03, brass, 12); obj.position.set(.03, .067, 0); tilt.add(obj);
    const mir = cyl(.022, .022, .004, std(0xdfe9ee, .05, 1), 20); mir.position.set(.02, -.045, 0); mir.rotation.z = .6; tilt.add(mir);
    const lens = new THREE.Mesh(new THREE.TorusGeometry(.06, .007, 8, 32), brass); lens.position.set(-.2, .95, .25); lens.rotation.x = -1.2; g.add(lens);
    const handle = cyl(.009, .009, .14, wood, 8); handle.position.set(-.2, .93, .38); handle.rotation.x = 1.4; g.add(handle);
    const arm2 = new THREE.Group(); arm2.position.set(.1, 1.17, -.15); g.add(arm2);
    for (const [rx, rz] of [[0, 0], [Math.PI / 2, 0], [Math.PI / 2, .41], [0, Math.PI / 2]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.17, .005, 6, 48), brass); r.rotation.set(rx, 0, rz); arm2.add(r); }
    const sph = new THREE.Mesh(new THREE.SphereGeometry(.03, 16, 12), brass); arm2.add(sph); const st = cyl(.01, .03, .22, brass, 10); st.position.y = -.2; arm2.add(st);
    decorTick.push(dt => { arm2.rotation.y += dt * .08; });
    const tree = makeTree({ h: .36, r: .012, depth: 5, seed: 23, leafSize: .028 }); tree.position.set(.6, 1.05, 0); g.add(tree);
    const roots = makeRoots({ depth: .14, r: .007, seed: 5, spread: .14, hyphae: true }); roots.position.set(.6, 1.05, 0); g.add(roots);
    const soilCut = new THREE.Mesh(new THREE.BoxGeometry(.3, .16, .2), new THREE.MeshStandardMaterial({ map: tex("soil_diff", .6, .3), color: 0x6a4a34, roughness: .95, transparent: true, opacity: .35, depthWrite: false })); soilCut.position.set(.6, .97, 0); g.add(soilCut);
    const bell = cyl(.2, .2, .62, glassMat, 32); bell.position.set(.6, 1.2, 0); g.add(bell);
    const lb = label("驚異の机（顕微鏡・拡大鏡・天球儀・木と根の模型）", { w: 1.4, size: 36 }); lb.position.set(0, 1.75, 0); g.add(lb);
    g.traverse(o2 => { if (o2.isMesh || o2.isSprite) { o2.userData.decor = "desk"; clickables.push(o2); } });
    obst.push({ x0: -.95, x1: .95, z0: -1.2 - .5, z1: -1.2 + .5 });
  }
}
