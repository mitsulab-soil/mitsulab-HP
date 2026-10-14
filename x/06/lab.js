/* 森羅研究室（lab）── いつもの景色の見え方が変わる実験を、3D の模型で動かす部屋。2026-10-07、2026-10-09 夜に 8 台へ絞り、博物館の展示室に作り直した。
   操作は森羅博物館と同じ：床を押すと歩く（一回の押しで STEP_MAX m まで）・ドラッグで見回す・
   壁ぎわでも下がれる・足音。実験台を押すと、台の前へ歩き、そのまま台の上の模型に寄る（同じ空間の中で寄る＝短い遷移）。
   碧の声と字幕は museum.js から借りた（speakLine・talk）。体の動きと表情は共通部品 kit/aoi_motion.js（2026-10-12・足はすべらず、口は声の時刻表 data/lipsync.js に合わせる）。
   名前は names.json だけに置く（コードの識別子は lab・worm・grain・frost・temp・phono・gw・kanten・myco）。 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as FROST from "./exp/frost.js";
import * as WORM from "./exp/worm.js?v=20261014p3";
import * as TEMP from "./exp/temp.js";
import * as KANTEN from "./exp/kanten.js";
import * as MYCO from "./exp/myco.js";
import * as GW from "./exp/gw.js";
import * as PHONO from "./exp/phono.js";
import * as GRAIN from "./exp/grain.js";
import { buildWunder } from "./exp/wunder.js";
import { label, canvasTex, tex } from "./exp/util.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { AoiMotion } from "./kit/aoi_motion.js";   // 碧の自然な動きと表情（mitsulab の共通部品の写し。2026-10-12）

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (dt, k) => 1 - Math.exp(-k * dt);
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = matchMedia("(pointer: coarse)").matches;
const decorTick = [];
const prog = p => { $("loadBar").style.width = p + "%"; };
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

const NAMES = await fetch("names.json").then(r => r.json()).catch(() => ({ lab: "森羅研究室", guide: "碧" }));
const S = window.SCRIPT, VOICE = window.VOICE || {};
// 口の時刻表（data/lipsync.js・約 140 KB）は、部屋が見えてからあとで読む（2026-10-13 はじめの表示を軽く）。読むまでは声の大きさで口を動かす
let LIPSYNC = {};
function loadLater(src, done) { const s = document.createElement("script"); s.src = src; s.async = true; s.onload = done; document.head.appendChild(s); }
const CONF = { aoi: "assets/aoi.vrm" };   // 同一実行フォルダに収めた碧の姿。公開先でも取得できる。
document.title = NAMES.lab; $("whereT").textContent = NAMES.lab; $("loadT").textContent = NAMES.lab; $("listT").textContent = `${NAMES.lab}の実験台`;
prog(10);

// ---------------------------------------------------------------- 描画の土台
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.6 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;   // 世界観と見た目 v1：ACES の黄ばみを避ける（2026-10-13）
$("stage").appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1612);
scene.fog = new THREE.Fog(0x1b1612, 24, 52);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .38;
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, .03, 80);
scene.add(new THREE.HemisphereLight(0xf3ead8, 0x3a2a1e, .95));   // 天窓と吊り照明の、暖かい明るさ
const sun = new THREE.DirectionalLight(0xfff1dc, .85); sun.position.set(9, 7, -3); scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfeaff, .3); fill.position.set(-6, 5, 6); scene.add(fill);
// いま見ている台を照らすスポット（一灯だけ。近い台へ移る）
const spot = new THREE.SpotLight(0xfff0dc, 26, 9, .55, .7, 1.3); spot.position.set(0, 4, 0); scene.add(spot); scene.add(spot.target);

const std = (color, rough = .7, metal = 0, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, metalness: 0, transmission: 0, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide });
// 足もとの影（2026-10-14 テストプレー「黒い楕円が穴のように見える」）：原因＝碧を現すときに、影の板の濃さまで 1 にしていた。
//   中心から外へ消えていく柔らかい影（放射状のぼかし）にし、濃さは碧の現れ方とは別に決める（いちばん濃い所で 0.6）
const BLOB_MAX = .6;
const blobMat = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,1)"); r.addColorStop(.35, "rgba(0,0,0,.72)"); r.addColorStop(.7, "rgba(0,0,0,.22)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, color: 0x000000, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }); })();

// ---------------------------------------------------------------- 部屋：博物館の展示室（2026-10-09 夜）
//   本人（2026-10-09）：「壁について、磁石実験の背後の石や砂の標本が置いてあるところの方がいいです。これを全面にしてください。
//   また、床や天井も、博物館の雰囲気に仕上げてください。」
//   幅 22 m・奥行 30 m・天井 6 m。四つの壁＝木とガラスの標本の棚（exp/wunder.js）。入口の扉（手前の壁のまん中）と右の窓はあける。
//   床＝寄木（市松に組んだ木の板）、天井＝格天井（木の梁の格子）とまん中の天窓・真鍮と乳白ガラスの吊り照明・壁の上の蛇腹（コーニス）。
//   質感はこの画面の中で描く（外から読まない＝スマホを軽く）。木の写真は CC0（Poly Haven）の wood_dark・wood_light（data/tex）。
const RX = 11, RZ = 15, CEIL = 6, EYE = 1.55;
const WIN = [-7.4, -.4], WY0 = 1.1, WY1 = 3.6, DOOR = [-1.3, 1.3], DOOR_H = 3.1;   // 窓（右の壁の z の範囲）と扉（手前の壁の x の範囲）
const floors = [], blockers = [], clickables = [], obst = [];
const glow = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: o < 1, opacity: o });
const blinkers = [];
{
  // 床：寄木（50 cm 角の升に 4 枚の板。升ごとに向きを 90° かえる）。板ごとに色と木目をかえる
  const ft = canvasTex(1024, 1024, (c, w, h) => {
    const T = 256, n = 4, sw = T / n;
    for (let ty = 0; ty < h / T; ty++) for (let tx = 0; tx < w / T; tx++) for (let k = 0; k < n; k++) {
      const hor = (tx + ty) % 2 === 0, x = tx * T + (hor ? 0 : k * sw), y = ty * T + (hor ? k * sw : 0), pw = hor ? T : sw, ph = hor ? sw : T;
      const v = 0.82 + Math.random() * .3; c.fillStyle = `rgb(${Math.round(118 * v)},${Math.round(80 * v)},${Math.round(50 * v)})`; c.fillRect(x, y, pw, ph);
      c.strokeStyle = `rgba(40,24,12,${.18 + Math.random() * .12})`; c.lineWidth = 1;
      for (let g = 0; g < 9; g++) { c.beginPath(); const o = Math.random() * (hor ? ph : pw); for (let s = 0; s <= 16; s++) { const a = s / 16 * (hor ? pw : ph), b = o + Math.sin(a * .05 + g) * 3; hor ? (s ? c.lineTo(x + a, y + b) : c.moveTo(x + a, y + b)) : (s ? c.lineTo(x + b, y + a) : c.moveTo(x + b, y + a)); } c.stroke(); }
      c.strokeStyle = "rgba(25,15,8,.75)"; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, pw - 2, ph - 2);
    }
  });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(RX * 2 / 2, RZ * 2 / 2); ft.anisotropy = 8;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(RX * 2, RZ * 2), std(0xffffff, .42, 0, { map: ft })); fl.rotation.x = -Math.PI / 2; scene.add(fl); floors.push(fl);
  // 床の縁の石の帯（棚の前・幅 40 cm）と、まん中の通路の敷物
  const stoneT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#b9b2a4"; c.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { const v = 150 + Math.random() * 70; c.fillStyle = `rgba(${v},${v - 6},${v - 14},.4)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.strokeStyle = "rgba(60,55,48,.6)"; c.lineWidth = 2; c.strokeRect(0, 0, w, h); });
  stoneT.wrapS = stoneT.wrapT = THREE.RepeatWrapping;
  const band = (x, z, w, d) => { const t = stoneT.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, w / .6), Math.max(1, d / .6)); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(0xffffff, .5, 0, { map: t })); p.rotation.x = -Math.PI / 2; p.position.set(x, .003, z); scene.add(p); };
  band(0, -RZ + .75, RX * 2 - 1.1, .4); band(0, RZ - .75, RX * 2 - 1.1, .4); band(-RX + .75, 0, .4, RZ * 2 - 1.1); band(RX - .75, 0, .4, RZ * 2 - 1.1);
  const rugT = canvasTex(64, 512, (c, w, h) => { c.fillStyle = "#5a2a24"; c.fillRect(0, 0, w, h); c.strokeStyle = "#b08a4a"; c.lineWidth = 3; c.strokeRect(5, 5, w - 10, h - 10); c.strokeStyle = "rgba(176,138,74,.5)"; c.lineWidth = 1; c.strokeRect(11, 11, w - 22, h - 22); });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 22), std(0xffffff, .95, 0, { map: rugT })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, .005, 2.5); scene.add(rug);
  // 天井：格天井（木の梁の格子）・まん中の天窓・壁の上の蛇腹
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(RX * 2, RZ * 2), std(0xd9cfb8, .9)); ce.rotation.x = Math.PI / 2; ce.position.y = CEIL; scene.add(ce); blockers.push(ce);
  const beamM = new THREE.MeshStandardMaterial({ map: tex("wood_dark", 1, 4), color: 0x6a4a32, roughness: .6 });
  const bg = [];
  const bm = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); bg.push(g); };
  for (let x = -RX; x <= RX + .01; x += 22 / 8) bm(.22, .36, RZ * 2, x, CEIL - .18, 0);
  for (let z = -RZ; z <= RZ + .01; z += 30 / 10) bm(RX * 2, .3, .2, 0, CEIL - .15, z);
  bm(RX * 2, .26, .3, 0, CEIL - .13, -RZ + .15); bm(RX * 2, .26, .3, 0, CEIL - .13, RZ - .15); bm(.3, .26, RZ * 2, -RX + .15, CEIL - .13, 0); bm(.3, .26, RZ * 2, RX - .15, CEIL - .13, 0);   // 蛇腹
  scene.add(new THREE.Mesh(mergeGeometries(bg), beamM));
  // 天窓：まん中の 3 列ぶん（x −2.75〜2.75・z −12〜12）。外の明るさを乳白のガラス越しに（桟の格子つき）
  const skyT = canvasTex(256, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#e8eef0"); g.addColorStop(.5, "#f6f8f6"); g.addColorStop(1, "#e8eef0"); c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = "#5a4a3a"; c.lineWidth = 4; for (let x = 0; x <= w; x += w / 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += h / 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
  skyT.wrapT = THREE.RepeatWrapping; skyT.repeat.set(1, 3);
  const sk = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 24), new THREE.MeshBasicMaterial({ map: skyT, color: 0xe6e2d6, toneMapped: false })); sk.rotation.x = Math.PI / 2; sk.position.set(0, CEIL - .01, 0); scene.add(sk);
  // 吊り照明（真鍮の吊り棒＋乳白ガラスの球）：二列
  const brassM = std(0xb8913a, .32, .9), opal = glow(0xfff0d0);
  const lg = [], og = [];
  for (const x of [-5.5, 5.5]) for (let z = -12; z <= 12; z += 6) {
    let g = new THREE.CylinderGeometry(.008, .008, 1.5, 6); g.translate(x, CEIL - .75, z); lg.push(g);
    g = new THREE.CylinderGeometry(.06, .1, .08, 16); g.translate(x, CEIL - 1.52, z); lg.push(g);
    g = new THREE.SphereGeometry(.17, 18, 12); g.translate(x, CEIL - 1.72, z); og.push(g);
  }
  scene.add(new THREE.Mesh(mergeGeometries(lg), brassM)); scene.add(new THREE.Mesh(mergeGeometries(og), opal));
  // 壁：上の方は深い緑の漆喰（棚の上に見える所）
  const wallT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#2f423c"; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = Math.random(); c.fillStyle = `rgba(${v < .5 ? "20,30,26" : "70,90,82"},.18)`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); } });
  wallT.wrapS = wallT.wrapT = THREE.RepeatWrapping;
  const W = (w, h, x, y, z, ry) => { const t = wallT.clone(); t.needsUpdate = true; t.repeat.set(w / 2.4, h / 2.4); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std(0xffffff, .9, 0, { map: t })); p.position.set(x, y, z); p.rotation.y = ry; scene.add(p); blockers.push(p); return p; };
  W(RX * 2, CEIL, 0, CEIL / 2, -RZ, 0); W(RZ * 2, CEIL, -RX, CEIL / 2, 0, Math.PI / 2);
  // 手前の壁（扉をあける）
  W(RX + DOOR[0], CEIL, (-RX + DOOR[0]) / 2, CEIL / 2, RZ, Math.PI); W(RX - DOOR[1], CEIL, (RX + DOOR[1]) / 2, CEIL / 2, RZ, Math.PI); W(DOOR[1] - DOOR[0], CEIL - DOOR_H, 0, (CEIL + DOOR_H) / 2, RZ, Math.PI);
  // 扉：二枚の木の扉（上にガラス）・真鍮の取っ手・上の明かり取り
  { const dw = (DOOR[1] - DOOR[0]) / 2, dm = new THREE.MeshStandardMaterial({ map: tex("wood_dark", 1, 2), color: 0x5a3e2a, roughness: .5 }), fr = std(0x3a2818, .5);
    for (const s of [-1, 1]) {
      const d = box(dw - .03, DOOR_H - .45, .06, dm); d.position.set(s * dw / 2, (DOOR_H - .45) / 2, RZ + .02); scene.add(d);
      const gl = box(dw - .3, 1.1, .01, glow(0xd8d2c0, .55)); gl.position.set(s * dw / 2, 1.85, RZ - .015); scene.add(gl);
      const hd = box(.03, .3, .03, std(0xb8913a, .3, .9)); hd.position.set(s * .1, 1.1, RZ - .03); scene.add(hd);
    }
    const tr = box(DOOR[1] - DOOR[0] - .1, .35, .01, glow(0xf0ead8, .7)); tr.position.set(0, DOOR_H - .22, RZ - .01); scene.add(tr);
    for (const [w, h, x, y] of [[.12, DOOR_H, DOOR[0] - .06, DOOR_H / 2], [.12, DOOR_H, DOOR[1] + .06, DOOR_H / 2], [DOOR[1] - DOOR[0] + .24, .14, 0, DOOR_H + .07], [DOOR[1] - DOOR[0], .06, 0, DOOR_H - .45]]) { const m = box(w, h, .14, fr); m.position.set(x, y, RZ - .02); scene.add(m); }
    const ex = label("出入口", { w: 1.1, size: 44 }); ex.position.set(0, DOOR_H + .45, RZ - .1); scene.add(ex);
  }
  // 右の壁：観察窓（外は昼の林）。窓の下は低い引き出しの棚
  W(RZ + WIN[0], CEIL, RX, CEIL / 2, (-RZ + WIN[0]) / 2, -Math.PI / 2); W(RZ - WIN[1], CEIL, RX, CEIL / 2, (WIN[1] + RZ) / 2, -Math.PI / 2);
  W(WIN[1] - WIN[0], WY0, RX, WY0 / 2, (WIN[0] + WIN[1]) / 2, -Math.PI / 2); W(WIN[1] - WIN[0], CEIL - WY1, RX, (CEIL + WY1) / 2, (WIN[0] + WIN[1]) / 2, -Math.PI / 2);
  const sky = canvasTex(1024, 384, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#6f9cc4"); g.addColorStop(.62, "#bcd2e0"); g.addColorStop(.63, "#90a283"); g.addColorStop(1, "#6a805a"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const cloud = (x, y, s) => { for (let i = 0; i < 9; i++) { const rx = x + (Math.random() - .5) * s * 1.6, ry = y + (Math.random() - .3) * s * .4, r = s * (.35 + Math.random() * .35); const gr = c.createRadialGradient(rx, ry, 0, rx, ry, r); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.beginPath(); c.arc(rx, ry, r, 0, 7); c.fill(); } };
    cloud(180, 120, 80); cloud(520, 80, 110); cloud(860, 140, 70);
    c.fillStyle = "#435c3b"; for (let x = 0; x < w; x += 6) { const t = 230 - 26 * Math.abs(Math.sin(x * .013)) - 14 * Math.abs(Math.sin(x * .047)) - Math.random() * 6; c.fillRect(x, t, 7, h - t); }
  });
  const skyP = new THREE.Mesh(new THREE.PlaneGeometry(16, 6.5), new THREE.MeshBasicMaterial({ map: sky, fog: false })); skyP.position.set(RX + 3.2, 2.4, (WIN[0] + WIN[1]) / 2); skyP.rotation.y = -Math.PI / 2; scene.add(skyP);
  const frame = std(0x3a2818, .5, .2);
  for (let k = 0; k <= 4; k++) { const z = WIN[0] + (WIN[1] - WIN[0]) * k / 4, m = box(.1, WY1 - WY0, .1, frame); m.position.set(RX - .03, (WY0 + WY1) / 2, z); scene.add(m); }
  for (const y of [WY0, WY1]) { const m = box(.14, .1, WIN[1] - WIN[0] + .1, frame); m.position.set(RX - .04, y, (WIN[0] + WIN[1]) / 2); scene.add(m); }
  const win = new THREE.Mesh(new THREE.PlaneGeometry(WIN[1] - WIN[0], WY1 - WY0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .04, depthWrite: false }));
  win.position.set(RX - .01, (WY0 + WY1) / 2, (WIN[0] + WIN[1]) / 2); win.rotation.y = -Math.PI / 2; win.userData.decor = "window"; scene.add(win); clickables.push(win);
  // 奥の壁の上：館の名の額（金の字）
  const bt = canvasTex(1024, 300, (c, w, h) => {
    c.fillStyle = "#1f1712"; c.fillRect(0, 0, w, h); c.strokeStyle = "#b8913a"; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20); c.lineWidth = 2; c.strokeRect(26, 26, w - 52, h - 52);
    c.fillStyle = "#e3c27a"; c.textAlign = "center"; c.font = "600 84px 'Hiragino Mincho ProN','Yu Mincho',serif"; c.fillText(NAMES.lab, w / 2, 135);
    c.font = "32px 'Hiragino Mincho ProN','Yu Mincho',serif"; c.fillStyle = "#d9c9a0"; c.fillText("いつもの景色の見え方が変わる、八つの実験", w / 2, 210);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.9, .85), new THREE.MeshBasicMaterial({ map: bt, toneMapped: false })); board.position.set(0, 5.25, -RZ + .06); scene.add(board);
}
// 台の上の光だまり（その場で描いた丸い光。照明の計算は増やさない）
const poolTex = canvasTex(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,244,224,.55)"); g.addColorStop(.6, "rgba(255,240,215,.18)"); g.addColorStop(1, "rgba(255,240,215,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); });
const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

// ---------------------------------------------------------------- 実験台（8 台・2026-10-09 本人「世界の見え方が変わる実験に絞って」）
//   左右の壁ぎわに 4 台ずつ。台の向こうに標本の棚が見えるよう、台は部屋のまん中を向き、見る人は棚の方を向いて立つ。
//   観天望気は窓の前（空を背に）。
const BENCH = [
  { id: "worm", mod: WORM, x: -7.6, z: 7.0, ry: Math.PI / 2 },
  { id: "grain", mod: GRAIN, x: -7.6, z: 1.5, ry: Math.PI / 2 },
  { id: "frost", mod: FROST, x: -7.6, z: -4.0, ry: Math.PI / 2 },
  { id: "temp", mod: TEMP, x: -7.6, z: -9.5, ry: Math.PI / 2 },
  { id: "phono", mod: PHONO, x: 7.6, z: 7.0, ry: -Math.PI / 2 },
  { id: "gw", mod: GW, x: 7.6, z: 1.5, ry: -Math.PI / 2 },
  { id: "kanten", mod: KANTEN, x: 7.6, z: -3.9, ry: -Math.PI / 2 },
  { id: "myco", mod: MYCO, x: 7.6, z: -9.5, ry: -Math.PI / 2 },
];
const BW = 2.3, BD = .95, BH = .9;
// 台＝木の展示台（天板は濃い木、胴は板張り、真鍮の金具）
const benchTop = new THREE.MeshStandardMaterial({ map: tex("wood_dark", 2, 1), color: 0x4a3222, roughness: .35 }), benchBody = new THREE.MeshStandardMaterial({ map: tex("wood_dark", 1, 1), color: 0x6a4a32, roughness: .55 }), benchEdge = std(0x3a2818, .5, .1);
function addObst(x, z, w, d, ry) { const sw = Math.abs(Math.cos(ry)) > .5; const hw = (sw ? w : d) / 2, hd = (sw ? d : w) / 2; obst.push({ x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd }); }
const H = { THREE, std, box, cyl, glassMat, label, canvasTex, toast: m => toast(m), aud: () => AUD, RM, say: lines => talk(lines, expActs), closeUp: p => closeUp(p) };
for (const b of BENCH) {
  const g = new THREE.Group(); g.position.set(b.x, 0, b.z); g.rotation.y = b.ry; scene.add(g);
  const top = box(BW, .05, BD, benchTop); top.position.y = BH - .025; g.add(top);
  const body = box(BW - .08, BH - .12, BD - .1, benchBody); body.position.y = (BH - .12) / 2 + .05; g.add(body);
  const plinth = box(BW - .02, .08, BD - .04, benchEdge); plinth.position.y = .04; g.add(plinth);
  for (const sx of [-1, 1]) { const dr = box(.5, .5, .01, benchEdge); dr.position.set(sx * .55, .45, BD / 2 - .045); g.add(dr); const hd = box(.18, .02, .03, std(0xb8913a, .3, .9)); hd.position.set(sx * .55, .62, BD / 2 - .03); g.add(hd); }
  { const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.y = BH + .002; pool.userData.bench = false; g.add(pool);
    const fpool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), poolMat); fpool.rotation.x = -Math.PI / 2; fpool.position.set(0, .006, BD / 2 + .6); fpool.userData.bench = false; fpool.raycast = () => {}; g.add(fpool); }
  b.mod = b.mod.create(H, S.bench[b.id], NAMES);
  b.mod.group.position.y = BH; g.add(b.mod.group);
  const lab_ = label(NAMES[b.id] || S.bench[b.id].title, { sub: S.bench[b.id].sub, w: 1.5 }); lab_.position.set(0, BH + (b.mod.labelY ?? 1.05), 0); g.add(lab_); b.label = lab_;
  g.traverse(o => { if (o.isMesh || o.isSprite) { o.userData.bench ??= b.id; } }); clickables.push(...collect(g));
  b.g = g; b.face = new THREE.Vector3(Math.sin(b.ry), 0, Math.cos(b.ry));
  b.stand = new THREE.Vector3(b.x, 0, b.z).addScaledVector(b.face, BD / 2 + 1.25);
  b.center = new THREE.Vector3(b.x, BH, b.z);
  addObst(b.x, b.z, BW + .1, BD + .1, b.ry);
}
function collect(g) { const a = []; g.traverse(o => { if (o.isMesh || o.isSprite || o.isInstancedMesh || o.isPoints) a.push(o); }); return a; }

// ---------------------------------------------------------------- 標本の壁と驚異の机（exp/wunder.js）
buildWunder(scene, { RX, RZ, std, box, cyl, glassMat, obst, clickables, decorTick, openings: { window: WIN, door: DOOR } });
// ---------------------------------------------------------------- 歩ける所
const M_ = .35;
function walkable(x, z, m = M_) {
  if (x < -RX + m || x > RX - m || z < -RZ + m || z > RZ - m) return false;
  for (const o of obst) if (x > o.x0 - m && x < o.x1 + m && z > o.z0 - m && z < o.z1 + m) return false;
  return true;
}

// ---------------------------------------------------------------- 音（声・足音・小さな効果音）
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
const AUD = {
  ctx: null, master: null, voice: null, an: null, sfx: null, muted: store.get("lab-mute", false), duck: 1,
  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C(); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    const v = this.voice = new Audio(); v.preload = "auto"; v.src = SILENT; v.play().catch(() => {});
    try { const s = ctx.createMediaElementSource(v); this.an = ctx.createAnalyser(); this.an.fftSize = 512; s.connect(this.an); const vb = ctx.createGain(); vb.gain.value = 1.15; this.an.connect(vb); vb.connect(this.master); } catch {}
    this.td = new Uint8Array(512); ctx.resume?.();
  },
  setMute(m) { this.muted = m; store.set("lab-mute", m); if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, .08); $("muteBtn").textContent = m ? "🔇" : "🔊"; $("muteBtn").setAttribute("aria-pressed", String(m)); $("muteBtn").setAttribute("aria-label", m ? "音を出す" : "音を消す"); },
  setDuck(d) { if (!this.ctx || d === this.duck) return; this.duck = d; this.sfx.gain.setTargetAtTime(d, this.ctx.currentTime, .25); },
  level() { if (!this.an || !SP.playing) return 0; this.an.getByteTimeDomainData(this.td); let s = 0; for (let k = 0; k < this.td.length; k += 4) { const x = (this.td[k] - 128) / 128; s += x * x; } return Math.sqrt(s / (this.td.length / 4)); },
};
AUD.setMute(AUD.muted);
function bump() {
  const c = AUD.ctx; if (!c || AUD.muted) return;
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
  o.type = "triangle"; o.frequency.setValueAtTime(140, c.currentTime); o.frequency.exponentialRampToValueAtTime(70, c.currentTime + .12);
  g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(.2, c.currentTime + .008); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .18);
  o.connect(f); f.connect(g); g.connect(AUD.master); o.start(); o.stop(c.currentTime + .2);
}

// ---------------------------------------------------------------- 碧の声と字幕（字幕＝話すことばそのもの）
const SP = { tok: 0, playing: false, paused: false, cur: "", resolve: null, timer: null, t0: 0, rest: 0 };
const voiceOn = () => AUD.ctx && !AUD.muted;
const est = t => 900 + t.length * 135;
const narrowNums = () => innerWidth < 520 && mode !== "walk" && !$("exp").hidden && !$("exp").classList.contains("mini");
function setTalking(on) {
  $("guide").classList.toggle("talking", on);
  clearTimeout(SP.foldT);
  if (on && SP.autoFolded && !narrowNums()) { SP.autoFolded = false; fold(false); }
  if (!on) SP.foldT = setTimeout(() => { if ($("guide").classList.contains("talking") || SP.paused || mode === "exp") return; fold(true); SP.autoFolded = true; }, 5000);
}
function fold(on) { $("guide").classList.toggle("folded", on); $("foldBtn").setAttribute("aria-label", on ? "字幕をひらく" : "字幕をたたむ"); }
$("foldBtn").onclick = () => fold(true);
$("guide").addEventListener("click", e => { if ($("guide").classList.contains("folded")) { e.stopPropagation(); if (narrowNums()) { $("exp").classList.add("mini"); store.set("lab-mini", true); syncMore(); } fold(false); } });
function speakLine(text) {
  return new Promise(res => {
    SP.cur = text; $("say").textContent = text; A.talkT = 0; setTalking(true); window.__said = (window.__said || []).concat([text]).slice(-40);
    const v = VOICE[text];
    const done = () => { clearTimeout(SP.timer); SP.timer = null; SP.resolve = null; SP.playing = false; setTalking(false); AUD.setDuck(1); M?.stopSpeaking(); res(); };
    SP.resolve = done;
    const timed = ms => { SP.rest = ms; SP.t0 = performance.now(); if (!SP.paused) SP.timer = setTimeout(done, ms);
      const t0 = performance.now(); M?.speak({ text, dur: ms / 1000, clock: () => SP.paused ? -1 : (performance.now() - t0) / 1000 }); };
    if (v && voiceOn()) {
      const el = AUD.voice; el.onended = done; el.onerror = () => timed(est(text));
      el.src = v.f; el.currentTime = 0; SP.playing = true; AUD.setDuck(.35); window.__voiceSrc = v.f;
      M?.speak({ timeline: LIPSYNC[text] || null, kana: v.kana, dur: v.dur, clock: () => SP.paused || !SP.playing ? -1 : el.currentTime, level: () => AUD.level() * 7 });
      if (!SP.paused) el.play().catch(() => { SP.playing = false; timed(est(text)); });
    } else timed(est(text));
  });
}
function pauseSpeech(on) {
  SP.paused = on; $("sayState").textContent = on ? "一時停止中" : "";
  if (SP.playing) { on ? AUD.voice.pause() : AUD.voice.play().catch(() => {}); }
  else if (SP.resolve) { if (on) { clearTimeout(SP.timer); SP.rest = Math.max(400, SP.rest - (performance.now() - SP.t0)); } else { SP.t0 = performance.now(); SP.timer = setTimeout(SP.resolve, SP.rest); } }
  setActs(curActs());
}
function skipLine() { if (SP.playing) AUD.voice.pause(); SP.resolve?.(); }
function hush() { SP.tok++; if (SP.playing) AUD.voice.pause(); SP.resolve?.(); SP.paused = false; $("sayState").textContent = ""; }
async function sayQ(lines) {
  const tok = ++SP.tok; if (SP.playing) AUD.voice.pause(); SP.resolve?.(); SP.paused = false; $("sayState").textContent = "";
  lines = [].concat(lines).filter(Boolean);
  for (const ln of lines) {
    while (SP.paused && tok === SP.tok) await sleep(150);
    if (tok !== SP.tok) return false;
    await speakLine(ln);
    if (tok !== SP.tok) return false;
    await sleep(320);
  }
  return tok === SP.tok;
}
let curActs = () => [];
function setActs(list) {
  const bx = $("acts"); bx.innerHTML = "";
  for (const a of list) { const b = document.createElement("button"); b.className = "btn" + (a[2] ? " pri" : "") + ([...a[0]].length <= 2 ? " ic" : ""); b.textContent = a[0]; if (a[3]) b.setAttribute("aria-label", a[3]); b.onclick = e => { e.stopPropagation(); a[1](); }; bx.appendChild(b); }
}
function talk(lines, acts = []) { curActs = typeof acts === "function" ? acts : () => acts; setActs(curActs()); $("guide").hidden = false; $("sayState").textContent = ""; if (narrowNums()) { fold(true); SP.autoFolded = true; } else fold(false); return sayQ(lines); }

// ---------------------------------------------------------------- 見る人（カメラ）
const me = { pos: new THREE.Vector3(0, EYE, 11.8), yaw: 0, pitch: -.06, path: [], speed: 0, faceTo: null, onArrive: null, userLook: false };
const keys = new Set();
function setFov() { const a = innerWidth / innerHeight; camera.fov = a < .8 ? 74 : a < 1.2 ? 66 : 58; camera.aspect = a; camera.updateProjectionMatrix(); }
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); setFov(); if (mode === "exp") orbitFit(); });
setFov();
let mode = "walk", cur = null;   // walk ＝歩く／exp ＝台の模型に寄っている／trans ＝寄るあいだ

function goTo(p, faceTo = null, onArrive = null) {
  me.userLook = false; me.path = [p.clone()]; me.faceTo = faceTo; me.onArrive = onArrive;
  if (RM) { me.pos.x = p.x; me.pos.z = p.z; me.path = []; if (faceTo) me.yaw = Math.atan2(-(faceTo.x - p.x), -(faceTo.z - p.z)); onArrive?.(); }
}
// 道すじが台・棚を横切るなら、角をまわる点をはさむ（部屋が単純なので、角の外の点を一つ選ぶ）
function route(to) {
  const a = me.pos, pts = [];
  if (clearLine(a, to)) return [to];
  let best = null;
  for (const o of obst) for (const [cx, cz] of [[o.x0 - .7, o.z0 - .7], [o.x1 + .7, o.z0 - .7], [o.x0 - .7, o.z1 + .7], [o.x1 + .7, o.z1 + .7]]) {
    const c = new THREE.Vector3(cx, 0, cz); if (!walkable(cx, cz)) continue;
    if (clearLine(a, c) && clearLine(c, to)) { const L = a.distanceTo(c) + c.distanceTo(to); if (!best || L < best.L) best = { c, L }; }
  }
  if (best) pts.push(best.c); pts.push(to); return pts;
}
function clearLine(a, b) { const n = Math.ceil(a.distanceTo(b) / .2); for (let i = 1; i <= n; i++) { const t = i / n; if (!walkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, .25)) return false; } return true; }
function goRoute(p, faceTo, onArrive) { goTo(p, faceTo, onArrive); if (!RM) me.path = route(new THREE.Vector3(p.x, 0, p.z)); }
function moveTick(dt) {
  if (mode !== "walk") return;
  if (me.path.length) {
    const t = me.path[0], dx = t.x - me.pos.x, dz = t.z - me.pos.z, d = Math.hypot(dx, dz);
    const last = me.path.length === 1, vmax = 2.2;
    me.speed = Math.min(vmax, me.speed + 3 * dt, last ? Math.max(.35, d * 1.6) : vmax);
    const st = Math.min(d, me.speed * dt);
    if (d < .04) { me.path.shift(); if (!me.path.length) { me.speed = 0; arrive(); } }
    else {
      me.pos.x += dx / d * st; me.pos.z += dz / d * st;
      const want = me.faceTo && (last && d < 1.6) ? Math.atan2(-(me.faceTo.x - me.pos.x), -(me.faceTo.z - me.pos.z)) : Math.atan2(-dx, -dz);
      if (!dragging && !me.userLook) me.yaw += wrapA(want - me.yaw) * ease(dt, 3.2);
    }
  }
  let f = 0, s = 0, turn = 0;
  if (keys.has("w") || keys.has("arrowup")) f += 1; if (keys.has("s") || keys.has("arrowdown")) f -= 1;
  if (keys.has("a")) s -= 1; if (keys.has("d")) s += 1;
  if (keys.has("arrowleft") || keys.has("q")) turn += 1; if (keys.has("arrowright") || keys.has("e")) turn -= 1;
  me.yaw += turn * 1.6 * dt;
  if (f || s) {
    me.path = []; const sp = 2.0 * dt, fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw);
    const nx = me.pos.x + (fx * f + -fz * s) * sp, nz = me.pos.z + (fz * f + fx * s) * sp;
    // 壁・台の手前 .5 m まで。いま線の外にいるなら、少しでも内へ戻る向き（下がる）は通す（博物館と同じ）
    const ok = (x, z) => walkable(x, z, .5), curOK = ok(me.pos.x, me.pos.z);
    if (ok(nx, nz) || (!curOK && (walkable(nx, nz, .2) || f < 0))) { me.pos.x = nx; me.pos.z = nz; } else if (ok(nx, me.pos.z)) me.pos.x = nx; else if (ok(me.pos.x, nz)) me.pos.z = nz;
    else if (!me.bumpT || performance.now() - me.bumpT > 700) { me.bumpT = performance.now(); bump(); }
  }
  me.pos.y = EYE;
  camera.position.copy(me.pos);
  camera.rotation.set(me.pitch, me.yaw, 0, "YXZ");
}
function arrive() {
  if (me.faceTo && !me.userLook) me.yaw += wrapA(Math.atan2(-(me.faceTo.x - me.pos.x), -(me.faceTo.z - me.pos.z)) - me.yaw);
  const f = me.onArrive; me.onArrive = null; f?.();
}
// 一回の押しで歩くのは STEP_MAX m まで（博物館と同じ。2026-10-07 本人「一回の押しで動ける範囲を適度に制限」）
const STEP_MAX = 6;
function walkTo(p, keepLook) {
  const dx = p.x - me.pos.x, dz = p.z - me.pos.z, d = Math.hypot(dx, dz);
  if (d > STEP_MAX && !keepLook) { const k = STEP_MAX / d; let q = new THREE.Vector3(me.pos.x + dx * k, 0, me.pos.z + dz * k); for (let t = 0; t < 8 && !walkable(q.x, q.z); t++) q = new THREE.Vector3((q.x + me.pos.x) / 2, 0, (q.z + me.pos.z) / 2); if (walkable(q.x, q.z)) p = q; }
  marker.position.set(p.x, .01, p.z); marker.material.opacity = .9; goRoute(p); if (keepLook) me.userLook = true;
}
function backStep() {
  const bx = Math.sin(me.yaw), bz = Math.cos(me.yaw);
  for (const t of [1.8, 1.4, 1.0, .7]) { const x = me.pos.x + bx * t, z = me.pos.z + bz * t; if (walkable(x, z, .5)) return new THREE.Vector3(x, 0, z); }
  return null;
}

// ---------------------------------------------------------------- 台の模型に寄る（同じ空間の中で、カメラが台の上へ寄る）
const orb = { target: new THREE.Vector3(), yaw: 0, pitch: .32, dist: 2, base: 2, ry: 0 };
const trans = { t: 0, dur: .9, fromP: new THREE.Vector3(), fromQ: new THREE.Quaternion(), then: null };
function orbitPose(out = { p: new THREE.Vector3(), q: new THREE.Quaternion() }) {
  const a = orb.ry + orb.yaw, cp = Math.cos(orb.pitch), d = orb.dist * (typeof distK === "number" ? distK : 1);
  out.p.set(orb.target.x + Math.sin(a) * cp * d, orb.target.y + Math.sin(orb.pitch) * d, orb.target.z + Math.cos(a) * cp * d);
  const m = new THREE.Matrix4().lookAt(out.p, orb.target, new THREE.Vector3(0, 1, 0)); out.q.setFromRotationMatrix(m); return out;
}
function orbitFit() {
  const f = cur.mod.focus || {}, asp = innerWidth / innerHeight;
  orb.base = (f.dist || 1.9) * (asp < .62 ? 1.95 : asp < .9 ? 1.55 : asp < 1.3 ? 1.15 : 1);
  orb.dist = clamp(orb.dist || orb.base, orb.base * .55, orb.base * 1.6);
  // 広い画面では操作の板が左にあるので、模型が右寄りに見えるよう、見る点を左へずらす
  // 縦長の画面では、模型を少し左へ寄せて、右に碧の立つ所をあける（2026-10-14 スマホ：碧が箱を隠すか、出なかった）
  const side = innerWidth >= 980 ? -.32 * orb.base / 1.9 : asp < .9 ? .2 * orb.base / 1.9 : 0, ry = cur.ry;
  orb.target.copy(cur.center).add(new THREE.Vector3(Math.cos(ry) * side, f.y ?? .35, -Math.sin(ry) * side));
}
// 模型の中の一点に寄る（ミミズの台の「ミミズに寄る」。2026-10-14 スマホ：ミミズが赤い点に見えた）。p＝世界の点、null でもどる
function closeUp(p) {
  if (!cur || mode !== "exp") return;
  if (!p) { orbitFit(); orb.dist = orb.base; return; }
  orb.target.lerp(p, .25); orb.dist += (orb.base * (innerWidth / innerHeight < .9 ? .26 : .38) - orb.dist) * .2;
}
function enterBench(b) {
  if (mode === "exp" && cur === b) return;
  if (mode === "exp") leaveBench(true);
  hush(); seen.add(b.id);
  // 台の前に着くまでは、碧は見る人のとなりを歩く（2026-10-14 スマホ：先に台の前へ向かう碧の後ろ頭が画面を覆った）。
  // 立つ所は、寄りおえてから benchAoiSpot が台ごとに決める
  const g0 = new THREE.Vector3(b.x, 0, b.z).addScaledVector(b.face, BD / 2 + .45).add(new THREE.Vector3(Math.cos(b.ry), 0, -Math.sin(b.ry)).multiplyScalar(.95));
  const go = () => {
    A.goal = A.pos.clone(); A.look = b.center.clone(); A.point = 1;
    cur = b; mode = "trans"; orb.ry = b.ry; orb.yaw = 0; orb.pitch = b.mod.focus?.pitch ?? .34; orb.dist = 0;
    orbitFit(); orb.dist = orb.base;
    trans.t = 0; trans.fromP.copy(camera.position); trans.fromQ.copy(camera.quaternion);
    trans.then = () => { mode = "exp"; setTimeout(() => benchAoiSpot(b), 300); };   // 画面のずらし（viewOffset）が落ちついてから
    openPanel(b);
    benchTalk(b);
    setTimeout(() => { if (cur === b) M?.point(b.center.clone(), 3.0); }, 600);   // 話しはじめに、模型を指して見せる（目→手→見る人）
  };
  const far = me.pos.distanceTo(new THREE.Vector3(b.stand.x, EYE, b.stand.z));
  if (far < .5) go();
  else if (far > 7 && !RM) {
    $("fade").classList.add("on"); me.path = [];
    setTimeout(() => { me.pos.set(b.stand.x, EYE, b.stand.z); me.yaw = Math.atan2(-(b.center.x - b.stand.x), -(b.center.z - b.stand.z)); me.pitch = -.12; camera.position.copy(me.pos); camera.rotation.set(me.pitch, me.yaw, 0, "YXZ");
      if (M) { A.pos.copy(g0); A.vel.set(0, 0, 0); M.place(A.pos.x, A.pos.z); } $("fade").classList.remove("on"); go(); }, 320);
  } else { $("whereS").textContent = `${NAMES[b.id] || S.bench[b.id].title}の台へ歩いています`; goRoute(b.stand, b.center.clone(), go); }
}
// 実験台の前で、碧がどこに立つか（台ごとに決める。2026-10-14）
//   ・頭から胸までが、上の操作の板と下の字幕のあいだ（PC は左の板の外）に、切れずに入る
//   ・模型（観察箱など）に重ならない。模型の横に場所がなければ、台の向こう（模型より奥）で、頭と胸が模型の上に出る所
//   ・どこにもなければ、実験のあいだ姿を隠す（声と字幕は続く）
const _bx = new THREE.Box3(), _v = new THREE.Vector3();
function benchAoiSpot(b) {
  if (!M || cur !== b) return;
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const c = camera.position, f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
  const r = new THREE.Vector3(-f.z, 0, f.x), hf = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);
  const P = (x, y, z) => _v.set(x, y, z).project(camera);
  // 模型の画面の上の四角
  _bx.setFromObject(b.mod.group); const R = { x0: 9, x1: -9, y0: 9, y1: -9 };
  for (const X of [_bx.min.x, _bx.max.x]) for (const Y of [_bx.min.y, _bx.max.y]) for (const Z of [_bx.min.z, _bx.max.z]) { P(X, Y, Z); R.x0 = Math.min(R.x0, _v.x); R.x1 = Math.max(R.x1, _v.x); R.y0 = Math.min(R.y0, _v.y); R.y1 = Math.max(R.y1, _v.y); }
  const Dm = Math.hypot(b.center.x - c.x, b.center.z - c.z);
  // 画面の空いている所（ndc）
  const ex = $("exp").getBoundingClientRect(), gd = $("guide"), wide = innerWidth >= 980;
  const L = wide && !$("exp").hidden ? ex.right / innerWidth * 2 - 1 + .03 : -.98, Rr = .99;
  const Ty = !wide && !$("exp").hidden ? 1 - 2 * ex.bottom / innerHeight - .02 : .96, By = gd.hidden ? -.96 : 1 - 2 * gd.getBoundingClientRect().top / innerHeight + .02;
  let best = null; const dbg = benchAoiSpot.dbg = { n: 0, walk: 0, frame: 0, model: 0, R, Dm, L, Ty, By };
  for (const sx of [1, -1]) for (let D = .8; D <= Dm + 2.4; D += .15) for (const ndc of [.86, .78, .7, .62, .54, .46, .38, .3]) {
    const X = Math.tan(hf / 2) * D * ndc * sx, x = c.x + f.x * D + r.x * X, z = c.z + f.z * D + r.z * X;
    dbg.n++; if (!walkable(x, z, .32)) { dbg.walk++; continue; }
    // 碧の頭（顔）と、胸から上の肩の幅を画面へ
    const rect = (ys, w) => { const q = { x0: 9, x1: -9, y0: 9, y1: -9 }; for (const y of ys) for (const s of [-w, w]) { P(x + r.x * s, y, z + r.z * s); if (_v.z > 1 || _v.z < -1) return null; q.x0 = Math.min(q.x0, _v.x); q.x1 = Math.max(q.x1, _v.x); q.y0 = Math.min(q.y0, _v.y); q.y1 = Math.max(q.y1, _v.y); } return q; };
    const B = rect([AOI_H * 1.0, AOI_H * .72], .24), Hd = rect([AOI_H * 1.0, AOI_H * .86], .11);
    if (!B || !Hd) continue;
    if (B.x0 < L || B.x1 > Rr || B.y1 > Ty || B.y0 < By) { dbg.frame++; continue; }
    const apart = (q, m) => q.x1 < R.x0 - m || q.x0 > R.x1 + m || q.y0 > R.y1 + m;
    const ov = (Math.max(0, Math.min(B.x1, R.x1) - Math.max(B.x0, R.x0)) * Math.max(0, Math.min(B.y1, R.y1) - Math.max(B.y0, R.y0))) / ((B.x1 - B.x0) * (B.y1 - B.y0));
    const side = apart(B, .03);                              // 模型の横（または上）に、胸から上がまるごと
    const behind = D > Dm + .5 && apart(Hd, .02);           // 台の向こうに立ち、顔は模型にかからない（体は台と模型の陰）
    const loose = ov < (wide ? .35 : .16);                   // 模型の四角（台の板や札も入る大きめの枠）の端に、少しかかるだけ
    if (!side && !behind && !loose) { dbg.model++; continue; }
    const big = B.y1 - B.y0;   // 胸から上の大きさ（小さすぎると遠い人に見える）
    const score = Math.abs(D - (side ? Dm * .85 : Dm + .9)) + (side ? 0 : behind ? .5 : .6 + ov * 4) + (sx < 0 ? .25 : 0) + (big < .12 ? 1 : 0);
    if (!best || score < best.score) dbg.ov = +ov.toFixed(2), dbg.kind = side ? "side" : behind ? "behind" : "loose";
    if (!best || score < best.score) best = { x, z, score };
  }
  // PC で模型が画面いっぱいの台は、これまでどおり右の端の少し内側に（2026-10-14 r4 の PC の立ち位置）
  if (!best && wide) for (const sx of [1, -1]) { for (const ndc of [.72, .64, .8]) { for (let D = 2.8; D >= .7; D -= .15) {
    const X = Math.tan(hf / 2) * D * ndc * sx, x = c.x + f.x * D + r.x * X, z = c.z + f.z * D + r.z * X;
    if (!walkable(x, z, .32)) continue;
    P(x, AOI_H * .96, z); const a = _v.z < 1 && Math.abs(_v.x) < .93 && Math.abs(_v.y) < .9; P(x, AOI_H * .76, z); const b2 = _v.z < 1 && Math.abs(_v.x) < .93 && Math.abs(_v.y) < .97;
    if (a && b2) { best = { x, z }; dbg.kind = "pc"; break; } } if (best) break; } if (best) break; }
  if (!best) { A.hideExp = true; return; }
  let ok = true; for (let i = 1; i < 12 && ok; i++) { const t = i / 12; ok = walkable(A.pos.x + (best.x - A.pos.x) * t, A.pos.z + (best.z - A.pos.z) * t, .3); }
  A.goal = new THREE.Vector3(best.x, 0, best.z); A.hideExp = false;
  if (!ok || A.pos.distanceTo(A.goal) > 4) { A.pos.copy(A.goal); A.vel.set(0, 0, 0); M.place(best.x, best.z); M.calm = 1.2; A.fade = 0; aoiOpacity(0); }   // 台を通りぬけないと行けない所・遠い所へは、歩かせずに置きなおして、ゆっくり現れる
}
function leaveBench(quiet) {
  if (!cur) return;
  const b = cur; b.mod.exit?.(); cur = null; mode = "walk"; $("exp").hidden = true; document.body.classList.remove("inexp");
  me.pos.set(b.stand.x, EYE, b.stand.z); me.yaw = Math.atan2(-(b.center.x - b.stand.x), -(b.center.z - b.stand.z)); me.pitch = -.12; me.path = [];
  { const bx = Math.sin(me.yaw), bz = Math.cos(me.yaw); for (const k of [1.6, 1.2, .8]) if (walkable(me.pos.x + bx * k, me.pos.z + bz * k, .3)) { me.pos.x += bx * k; me.pos.z += bz * k; break; } }   // もどったら一歩さがって、台と壁の題が画面に入るように（2026-10-14）
  A.goal = null; A.look = null; A.point = 0; A.hideExp = false; idleSpot = followSpot();   // もどったら、見る人のとなりへ（2026-10-14：台の向こうに残って画面にいなかった）
  $("whereS").textContent = "床を押すと歩く・実験台を押すと実験に入る"; $("whereT").textContent = NAMES.lab;
  if (!quiet) { hush(); talk([S.back], freeActs()); }
}
function expActs() {
  return [[SP.paused ? "▶ 続ける" : "⏸", () => pauseSpeech(!SP.paused), false, SP.paused ? "続ける" : "一時停止"], ["⏭", skipLine, false, "このことばをとばす"],
    ["もう一度聞く", () => benchTalk(cur)], ["本物の世界では", () => { const sc = S.bench[cur.id]; talk(sc.real, expActs); }], ["外で見る", () => { showLook(cur); talk(S.bench[cur.id].look?.lines || [], expActs); }]];
}
// 台の話：何をまねているか → さわり方 → 本物の世界では → 外に出たら（2026-10-13 ミカタ：台の終わりに「外でこう見る」を一つ）
async function benchTalk(b) {
  const sc = S.bench[b.id], look = sc.look?.lines || [];
  $("outside").hidden = true;
  const ok = await talk([...sc.what, ...sc.hint, ...sc.real], expActs);
  if (!ok || cur !== b) return;
  showLook(b); await sayQ(look);
}
function showLook(b) {
  const lk = S.bench[b.id].look; if (!lk) return;
  const o = $("outside"); o.hidden = false;
  o.innerHTML = `<span class="k">外に出たら</span>${esc(lk.lines[0].replace(/^外に出たら、/, ""))}`;
}
// はじめての人には、いちばん驚きの大きい一台をすすめる（2026-10-13 ななみ「最初の 3 秒」）。一度入ったら出さない
function freeActs() { const ph = BENCH.find(b => b.id === "phono"); return [["実験台をえらぶ", openList, true], ...(seen.size || !ph ? [] : [["まず、コウモリの声を聞く", () => enterBench(ph)]])]; }
function openPanel(b) {
  $("exp").hidden = false; document.body.classList.add("inexp");
  $("expT").innerHTML = `${esc(NAMES[b.id] || S.bench[b.id].title)}<small>${esc(S.bench[b.id].sub)}</small>`;
  $("whereT").textContent = NAMES[b.id] || S.bench[b.id].title; $("whereS").textContent = isTouch ? "ドラッグで回す・二本指で寄る" : "ドラッグで回す・ホイールで寄る";
  const c = $("ctrls"); c.innerHTML = ""; b.mod.ui?.(c); b.mod.enter?.(); $("outside").hidden = true;
  $("read").innerHTML = b.mod.read?.() || "";
  const small = innerHeight < 700 || innerWidth < 520; $("exp").classList.toggle("mini", small && store.get("lab-mini", true)); syncMore();
}
// 数字の板の下に続きがあるとき「↓ 続き」を出す（2026-10-14）
{ const ex = $("exp"); const hint = document.createElement("div"); hint.className = "moreHint"; hint.textContent = "↓ 続きがあります（板の中をなぞる）"; hint.hidden = true; ex.appendChild(hint);
  const upd = () => { if (hint.parentNode !== ex) ex.appendChild(hint); const h = ex.hidden || ex.scrollHeight - ex.clientHeight - ex.scrollTop < 8; if (hint.hidden !== h) hint.hidden = h; };
  ex.addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); new MutationObserver(() => requestAnimationFrame(upd)).observe(ex, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] }); }
function syncMore() { const m = $("exp").classList.contains("mini"); $("expMore").textContent = m ? "数字を見る" : "数字をたたむ"; $("expMore").setAttribute("aria-expanded", String(!m)); }
$("expMore").onclick = () => { $("exp").classList.toggle("mini"); store.set("lab-mini", $("exp").classList.contains("mini")); syncMore();
  // 狭い画面で数字を開いたら、字幕をたたむ（3D を見える大きさに残す。碧の顔を押すと字幕にもどり、数字はたたむ）
  if (narrowNums()) { fold(true); SP.autoFolded = true; } else if (innerWidth < 520) { fold(false); SP.autoFolded = false; } };
$("expBack").onclick = () => leaveBench();
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------------------------------------------------------------- 押す・見回す
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let dragging = false, down = null;
const pts = new Map(); let pinch0 = 0, dist0 = 0;
const marker = new THREE.Mesh(new THREE.RingGeometry(.22, .3, 40), new THREE.MeshBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; scene.add(marker);
const hoverRing = new THREE.Mesh(new THREE.RingGeometry(.2, .26, 40), new THREE.MeshBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: .45, depthWrite: false }));
hoverRing.rotation.x = -Math.PI / 2; hoverRing.visible = false; scene.add(hoverRing);
const TAP_PX = isTouch ? 10 : 6;
const stage = $("stage");
let firstPress = false;
stage.addEventListener("pointerdown", e => {
  if (!woke) firstPress = true;
  wake();
  if (e.target !== renderer.domElement) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = orb.dist; if (down) down.multi = true; return; }
  if (down) { down.multi = true; return; }
  down = { x: e.clientX, y: e.clientY, yaw: mode === "exp" ? orb.yaw : me.yaw, pitch: mode === "exp" ? orb.pitch : me.pitch, id: e.pointerId, multi: false, max: 0 }; dragging = false;
});
stage.addEventListener("pointermove", e => {
  if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2 && mode === "exp") { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) orb.dist = clamp(dist0 * pinch0 / d, orb.base * .55, orb.base * 1.6); return; }
  if (!down || e.pointerId !== down.id) { hover(e); return; }
  const dx = e.clientX - down.x, dy = e.clientY - down.y; down.max = Math.max(down.max, Math.hypot(dx, dy));
  if (!dragging && down.max > TAP_PX && !down.multi) { dragging = true; me.userLook = true; stage.setPointerCapture?.(e.pointerId); }
  if (!dragging) return;
  if (mode === "exp") { orb.yaw = clamp(down.yaw - dx * 3.2 / innerWidth, -1.25, 1.25); orb.pitch = clamp(down.pitch + dy * 2 / innerHeight, -.05, 1.15); }
  else if (mode === "walk") { const k = (isTouch ? 1.6 : 1.2) * camera.fov / 60 / innerHeight * 1.4; me.yaw = down.yaw + dx * k; me.pitch = clamp(down.pitch + dy * k, -.6, .5); }
});
addEventListener("pointerup", e => {
  pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0;
  if (!down || e.pointerId !== down.id) return;
  const d = down, wasDrag = dragging || d.max > TAP_PX || d.multi; down = null; dragging = false;
  if (firstPress) { firstPress = false; return; }
  if (!wasDrag && e.target === renderer.domElement) pick(e.clientX, e.clientY);
});
addEventListener("pointercancel", e => { pts.delete(e.pointerId); down = null; dragging = false; });
stage.addEventListener("wheel", e => { if (mode !== "exp") return; e.preventDefault(); orb.dist = clamp(orb.dist * Math.exp(e.deltaY * .0012), orb.base * .55, orb.base * 1.6); }, { passive: false });
function rayAt(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
const visibleChain = o => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
function hover(e) {
  if (isTouch || mode !== "walk") { stage.style.cursor = mode === "exp" ? "grab" : ""; return; }
  rayAt(e.clientX, e.clientY); hoverRing.visible = false;
  if (aoi?.visible && ray.intersectObject(aoi, true)[0]) { stage.style.cursor = "pointer"; return; }
  const h = ray.intersectObjects([...clickables.filter(visibleChain), ...floors, ...blockers], false)[0];
  if (!h || h.distance > 30) { stage.style.cursor = ""; return; }
  if (h.object.userData?.bench || h.object.userData?.decor) { stage.style.cursor = "pointer"; return; }
  stage.style.cursor = "";
  if (floors.includes(h.object) && walkable(h.point.x, h.point.z) && Math.hypot(h.point.x - me.pos.x, h.point.z - me.pos.z) <= STEP_MAX) { hoverRing.position.set(h.point.x, .012, h.point.z); hoverRing.visible = true; }
}
function pick(x, y) {
  rayAt(x, y);
  if (mode === "exp") { const hs = ray.intersectObjects(cur.mod.pickables || [], true); if (hs[0]) cur.mod.pick?.(hs[0]); return; }
  if (mode !== "walk") return;
  if (aoi?.visible) { const h = ray.intersectObject(aoi, true)[0]; if (h && h.distance < 12) { aoiTapped(); return; } }
  const hits = ray.intersectObjects([...clickables.filter(visibleChain), ...floors, ...blockers], false);
  const h = hits[0]; if (!h) return;
  if (h.object.userData?.bench) { enterBench(BENCH.find(b => b.id === h.object.userData.bench)); return; }
  if (h.object.userData?.decor) { decorTapped(h.object.userData.decor, h.point); return; }
  if (blockers.includes(h.object)) {
    const c = camera.position, dx = h.point.x - c.x, dz = h.point.z - c.z, L = Math.hypot(dx, dz); let q = null;
    for (let t = Math.min(L, 30) - 1; t > .8; t -= .3) { const xx = c.x + dx / L * t, zz = c.z + dz / L * t; if (walkable(xx, zz)) { q = new THREE.Vector3(xx, 0, zz); break; } }
    if (!q || Math.hypot(q.x - c.x, q.z - c.z) < .5) { const bk = backStep(); if (bk) { walkTo(bk, true); return; } toast("そこへは行けません"); return; }
    walkTo(q); return;
  }
  const p = h.point;
  if (!walkable(p.x, p.z)) {
    const c = camera.position, dx = p.x - c.x, dz = p.z - c.z, L = Math.hypot(dx, dz); let q = null;
    for (let t = L; t > .6; t -= .3) { const xx = c.x + dx / L * t, zz = c.z + dz / L * t; if (walkable(xx, zz)) { q = new THREE.Vector3(xx, 0, zz); break; } }
    if (!q) { const bk = backStep(); if (bk) { walkTo(bk, true); return; } toast("そこへは行けません"); return; }
    p.x = q.x; p.z = q.z;
  }
  walkTo(p);
}
function decorTapped(k, p) {
  const lines = S.decor[k]; if (!lines) return;
  A.goal = null; A.look = new THREE.Vector3(p.x, 0, p.z); A.point = 1; M?.point(new THREE.Vector3(p.x, p.y, p.z), 3.4);
  talk(lines, freeActs());
}
const seen = new Set();
function aoiTapped() { talk([S.idle[seen.size ? 1 : 0]], freeActs()); }
addEventListener("keydown", e => {
  if (e.target.closest?.("input,textarea,select,button")) { if (e.key !== "Escape") return; }
  const k = e.key.toLowerCase(); wake();
  if (k === "escape") { if (!$("help").hidden) { $("help").hidden = true; return; } if (!$("list").hidden) { $("list").hidden = true; return; } if (mode === "exp") leaveBench(); return; }
  if (mode === "walk" && ["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { keys.add(k); e.preventDefault(); }
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => keys.clear());

// ---------------------------------------------------------------- 一覧・説明・小さな知らせ
function openList() {
  const box_ = $("listItems"); box_.innerHTML = "";
  for (const b of BENCH) { const bt = document.createElement("button"); bt.className = "it"; bt.innerHTML = `<b>${esc(NAMES[b.id])}</b><small>${esc(S.bench[b.id].sub)}</small>${S.bench[b.id].look ? `<small class="lk">外で見る：${esc(S.bench[b.id].look.when)}</small>` : ""}`; bt.onclick = () => { $("list").hidden = true; enterBench(b); }; box_.appendChild(bt); }
  $("list").hidden = false; box_.querySelector("button")?.focus();
}
$("listBtn").onclick = () => { wake(); openList(); }; $("listX").onclick = () => { $("list").hidden = true; };
$("list").addEventListener("click", e => { if (e.target === $("list")) $("list").hidden = true; });
$("muteBtn").onclick = () => { wake(); AUD.setMute(!AUD.muted); };
$("helpBtn").onclick = () => { $("help").hidden = false; $("helpBox").querySelector(".close")?.focus(); };
$("help").addEventListener("click", e => { if (e.target === $("help") || e.target.closest(".close")) $("help").hidden = true; });
$("helpBox").innerHTML = `<button class="btn close">とじる</button><h2>${esc(NAMES.lab)}</h2>
<p>見たあとで、いつもの景色が少し違って見える実験を、八つの模型にして並べた部屋です。実験台を押すと、そばで${esc(NAMES.guide)}が、模型が何をまねているのかと、本物の世界ではどうなるのかを話します。壁の棚は、鉱物・岩石・砂・土の断面・地層の柱・種子の標本（模型）です。押すと${esc(NAMES.guide)}が話します。</p>
<h3>うごき方</h3><ul><li>床を押す：そこへ歩く（一回に 6 m まで）</li><li>ドラッグ：見回す（実験の中では模型を回す）</li><li>実験台・棚・机を押す：近づく・話を聞く</li><li>キーボード：W A S D・矢印で歩く、Esc で実験からもどる</li></ul>
<h3>実験台</h3><ul>${BENCH.map(b => `<li><b>${esc(NAMES[b.id])}</b>：${esc(S.bench[b.id].sub)}</li>`).join("")}</ul>
<h3>外に出たら</h3><p>台の終わりに、${esc(NAMES.guide)}が、本物の景色でたしかめる見方を一つ話します。</p><ul>${BENCH.filter(b => S.bench[b.id].look).map(b => `<li><b>${esc(NAMES[b.id])}</b>（${esc(S.bench[b.id].look.when)}）：${esc(S.bench[b.id].look.lines[0].replace(/^外に出たら、/, ""))}</li>`).join("")}</ul>
<h3>模型の値について</h3><p>どの模型も、仕組みを見るためのものです。地温の波の熱の伝わりやすさ（湿った土の代表的な値）と、土の粒の大きさの区分（国際土壌学会法）を除いて、数や速さは動きが見えるように決めた値か目安です。形は「模式」、標本の棚は「模型」です。</p>
<h3>典拠</h3><ul>
<li>Darwin, C. (1881) <i>The Formation of Vegetable Mould through the Action of Worms, with Observations on their Habits</i>. John Murray.（第 3 章：1842 年 12 月にまいた白亜が、1871 年 11 月に 7 インチ下）</li>
<li>Hillel, D. (1998) <i>Environmental Soil Physics</i>. Academic Press.（地温の波）</li>
<li>霜柱の成因・放射冷却（教科書の水準。木下誠一 編『凍土の物理学』森北出版 ほか）</li>
<li>Freeze, R. A. &amp; Cherry, J. A. (1979) <i>Groundwater</i>. Prentice-Hall.（地下水の流れ・Darcy の法則）／環境省「名水百選」（お鷹の道・真姿の池湧水群）</li>
<li>Tisdall, J. M. &amp; Oades, J. M. (1982) Organic matter and water-stable aggregates in soils. <i>J. Soil Science</i> 33: 141–163.／粒の大きさの区分は国際土壌学会法</li>
<li>Lekner, J. &amp; Dorf, M. C. (1988) Why some things are darker when wet. <i>Applied Optics</i> 27: 1278–1280.</li>
<li>Smith, S. E. &amp; Read, D. J. (2008) <i>Mycorrhizal Symbiosis</i>, 3rd ed. Academic Press.</li>
<li>Beiler, K. J. ほか (2010) Architecture of the wood-wide web. <i>New Phytologist</i> 185: 543–553.</li>
<li>Karst, J., Jones, M. D. &amp; Hoeksema, J. D. (2023) Positive citation bias and overinterpreted results lead to misinformation on common mycorrhizal networks in forests. <i>Nature Ecology &amp; Evolution</i> 7: 501–511.</li>
<li>観天望気のことば・しるし・典拠：森羅博物館の観天望気のデータ（気象庁「はれるんランド」・英国気象庁 ほか。各景の札に記載）</li>
<li>超音波を聞こえる音に：録音＝Kaldari / Wikimedia Commons（CC0 1.0）。<a href="https://commons.wikimedia.org/wiki/File:Hoary_bat_chirp_recording.wav" target="_blank" rel="noopener">録音 1</a>・<a href="https://commons.wikimedia.org/wiki/File:Bat_feeding_buzz.wav" target="_blank" rel="noopener">録音 2</a>（米国 ペンシルベニア州で 2020 年に録られたもの。種は録音者の推定）</li>
<li>Eloy, C. (2011) Leonardo's rule, self-similarity, and wind-induced stresses in trees. <i>Physical Review Letters</i> 107: 258101.（枝分かれの太さ）</li>
<li>標本の棚：鉱物の形（結晶の形）・岩石・砂は教科書の水準。土の断面の名は日本の土壌分類体系（日本ペドロジー学会 2017）</li>
<li>奥の壁の植物図版と押し葉（一点ずつ）：
  呉其濬『植物名實圖考』（1848）の薯莨（<a href="https://commons.wikimedia.org/wiki/File:%E6%A4%8D%E7%89%A9%E5%90%8D%E5%AF%A6%E5%9C%96%E8%80%83%C2%B7%E8%96%AF%E8%8E%A8.jpg" target="_blank" rel="noopener">パブリックドメイン</a>）／
  『Florilegium（花の図譜）』1608 の Pepper Plant with Geometric Border（クリーブランド美術館 1963.594.46.b・<a href="https://clevelandart.org/art/1963.594.46.b" target="_blank" rel="noopener">CC0</a>）／
  Descourtilz『Flore médicale des Antilles』Pl. 405 Tomate à côtes（1828・<a href="https://commons.wikimedia.org/wiki/File:Flore_m%C3%A9dicale_des_Antilles,_ou,_Trait%C3%A9_des_plantes_usuelles_(10420969506).jpg" target="_blank" rel="noopener">パブリックドメイン</a>・Biodiversity Heritage Library）／
  Blanco『Flora de Filipinas』の Saccharum officinarum（<a href="https://commons.wikimedia.org/wiki/File:Saccharum_officinarum_Blanco1.18.jpg" target="_blank" rel="noopener">パブリックドメイン</a>）／
  押し葉 Saccharum robustum（スミソニアン国立自然史博物館・<a href="https://commons.wikimedia.org/wiki/File:Saccharum_robustum.jpg" target="_blank" rel="noopener">CC0</a>）</li>
<li>質感の写真：Poly Haven（CC0）</li>
</ul>
<h3>つくり</h3><p>表示の道具は three.js と three-vrm（MIT）。${esc(NAMES.guide)}の声：VOICEVOX:冥鳴ひまり。${esc(NAMES.guide)}の動きの一部は、人の動きの記録をもとにしています（The data used in this project was obtained from <a href="http://mocap.cs.cmu.edu/" target="_blank" rel="noopener">mocap.cs.cmu.edu</a>. The database was created with funding from NSF EIA-0196217.）。${esc(NAMES.guide)}の 3D の姿は © mitsulab（この作品の中で表示するためだけに置いています）。足音・雨の音はこの画面の中でその場で作っています。</p>
<p>© 2026 mitsulab. All rights reserved. この作品の文章・画像・音声・3D・プログラムの著作権は、別に示した他者の素材を除き mitsulab にあります。無断の複製・転載・改変と、AI の学習・生成への利用はお断りします（テキスト・データマイニングの権利を留保します）。<a href="https://mitsulab.jp/terms/#ai" target="_blank" rel="noopener">利用規約</a> ／ <a href="https://mitsulab.jp" target="_blank" rel="noopener">mitsulab.jp</a></p>`;
let toastT = 0;
function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200); }

// ---------------------------------------------------------------- 碧（依代）── 読み込みは museum.js から、動きと表情は共通部品 AoiMotion（2026-10-12）
// 足は着いているあいだ動かない（一歩ずつ踏みかえる）・息と重心の移し・目が先に動き頭が追う・まばたきの間隔は人の統計から・
// 口は声の時刻表（data/lipsync.js＝VOICEVOX のモーラの時刻）に合わせ、話す拍に手と首が合う
const AOI_H = 1.62;
let aoi = null, vrm = null, M = null;
const A = { pos: new THREE.Vector3(0, 0, 8.8), vel: new THREE.Vector3(), goal: null, look: null, point: 0, talkT: 0, fade: 0, occ: 1, op: -1 };
async function loadAoi() {
  try {
    const [{ GLTFLoader }, { MeshoptDecoder }, V] = await Promise.all([import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js"), import("@pixiv/three-vrm")]);
    const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder); ld.register(p => new V.VRMLoaderPlugin(p));
    const g = await ld.loadAsync(CONF.aoi);
    const v = g.userData.vrm; if (!v) throw new Error("VRM ではない");
    V.VRMUtils.removeUnnecessaryVertices(g.scene); (V.VRMUtils.combineSkeletons ?? V.VRMUtils.removeUnnecessaryJoints)?.(g.scene); V.VRMUtils.rotateVRM0(v);
    v.scene.traverse(o => { o.frustumCulled = false; });
    aoi = new THREE.Group(); aoi.add(v.scene); scene.add(aoi); vrm = v;
    v.humanoid.resetNormalizedPose(); v.update(0); v.scene.updateMatrixWorld(true);
    const bx = new THREE.Box3().setFromObject(v.scene), h = bx.max.y - bx.min.y, sc = h > .5 ? AOI_H / h : 1;
    v.scene.scale.setScalar(sc); v.scene.position.y = -bx.min.y * sc;
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(.78, .62), blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = .006; blob.renderOrder = -1; blob.userData.noFade = true; aoi.add(blob);
    // 起動時：部屋の中央に、静かに現れる（2026-10-07 本人「碧が登場するときにワンピースが不自然に大きく揺れる」→ 揺れものを止めたまま、ゆっくり出す）
    A.pos.copy(followSpot()); aoi.position.copy(A.pos); aoi.updateMatrixWorld(true);
    M = new AoiMotion(v, { root: aoi, reducedMotion: RM, wind: .35, startCalm: 2.2, posture: "upright", faceLight: .5 });   // まっすぐ立ち、揺れを小さく（2026-10-13）
    M.place(A.pos.x, A.pos.z, Math.atan2(me.pos.x - A.pos.x, me.pos.z - A.pos.z));
    A.fade = 0; aoiOpacity(0);
    window.__aoi = { vrm, aoi, A, M };
  } catch (e) { console.warn("碧の姿を読み込めませんでした（声と字幕で案内します）：", e?.message ?? e); }
}
function followSpot() {
  // 歩いているときは、見る人の右前（となりを歩く）。近くにいるあいだは動かない（せわしなく追わない）
  const narrow = innerWidth / innerHeight < .8; let F = narrow ? 2.6 : 2.3, X = narrow ? .6 : 1.1;
  // 歩いているあいだは、画面の右の端に（2026-10-14 スマホ：碧の後ろ頭が画面のまん中を覆った）。追いつけるよう、歩く速さのぶん先に
  if (me.path.length) { const hf = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect); F = narrow ? 2.4 : 2.3; X = Math.tan(hf / 2) * F * (narrow ? .86 : .76); F += me.speed * .6; }
  const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw), rx = -fz, rz = fx;
  let x = me.pos.x + fx * F + rx * X, z = me.pos.z + fz * F + rz * X;
  for (let k = 0; k < 6 && !walkable(x, z, .45); k++) { x = (x + me.pos.x) / 2; z = (z + me.pos.z) / 2; }
  return new THREE.Vector3(x, 0, z);
}
let idleSpot = null;
function aoiTick(dt) {
  if (!vrm) return;
  let goal = A.goal;
  if (!goal) {
    const dMe = Math.hypot(A.pos.x - me.pos.x, A.pos.z - me.pos.z);
    // 歩いているあいだ・画角の外に出たときも、となりへ（2026-10-14 11 人：前へ 5.6 m 歩くと碧が後ろに取り残された）
    const hf = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect), rel = Math.atan2(Math.sin(Math.atan2(-(A.pos.x - me.pos.x), -(A.pos.z - me.pos.z)) - me.yaw), Math.cos(Math.atan2(-(A.pos.x - me.pos.x), -(A.pos.z - me.pos.z)) - me.yaw));
    if (!idleSpot || me.path.length || dMe > 4.6 || dMe < 1.1 || Math.abs(rel) > hf / 2 * 1.05) idleSpot = me.path.length || dMe > 4.6 || dMe < 1.1 || Math.abs(rel) > hf / 2 * 1.05 ? followSpot() : (idleSpot || A.pos.clone());
    goal = idleSpot;
    if (me.path.length && Math.abs(rel) > hf / 2 * 1.05 && A.pos.distanceTo(goal) > 2.5 && A.op >= 0) { A.pos.copy(goal); A.vel.set(0, 0, 0); M.place(goal.x, goal.z); M.calm = 1.2; A.fade = 0; }   // 後ろに取り残されたら、見えない所で先回りして、ゆっくり現れる（2026-10-14）
  }
  if (A.pos.distanceTo(goal) > 14) { A.pos.copy(goal); A.vel.set(0, 0, 0); M.calm = 1.2; A.fade = 0; M.place(A.pos.x, A.pos.z); }
  // 人の歩く速さ（1 秒に 1.4 m まで）。速く追わず、着く前にゆるめる
  const w = A.goal ? 3.4 : 2.6, n = Math.max(1, Math.ceil(dt / .02)), h = dt / n, vmax = !A.goal && me.path.length ? 2.2 : 1.4;
  for (let i = 0; i < n; i++) {
    A.vel.x += (w * w * (goal.x - A.pos.x) - 2 * w * A.vel.x) * h; A.vel.z += (w * w * (goal.z - A.pos.z) - 2 * w * A.vel.z) * h;
    const m = Math.hypot(A.vel.x, A.vel.z); if (m > vmax) { A.vel.x *= vmax / m; A.vel.z *= vmax / m; }
    const nx = A.pos.x + A.vel.x * h, nz = A.pos.z + A.vel.z * h;
    if (walkable(nx, nz, .3) || !walkable(A.pos.x, A.pos.z, .3)) { A.pos.x = nx; A.pos.z = nz; } else A.vel.multiplyScalar(.5);
  }
  M.drive(A.pos.x, A.pos.z);
  const camP = camera.position;
  // 話しはじめの 2.6 秒は、話題の台を見る（体も半分そちらへ）。そのあとは見る人へ
  const lookWork = A.look && A.talkT < 2.6;
  if (lookWork) { const toCam = Math.atan2(camP.x - A.pos.x, camP.z - A.pos.z), toW = Math.atan2(A.look.x - A.pos.x, A.look.z - A.pos.z); M.faceTo(toCam + Math.atan2(Math.sin(toW - toCam), Math.cos(toW - toCam)) * .5); M.lookAt(new THREE.Vector3(A.look.x, 1.0, A.look.z)); }
  else { M.faceTo(null); M.lookAt(null); }
  A.talkT += dt;
  M.update(dt, camera);
  // 見る人のすぐ前・画面のまん中に碧が来たら、うすくして消す（後ろ頭で画面が覆われないように。2026-10-14）
  { const d = Math.hypot(A.pos.x - camP.x, A.pos.z - camP.z); let o = 1;
    if (mode === "walk" && d < 2.6) { _v.set(A.pos.x, AOI_H * .9, A.pos.z).project(camera); if (_v.z < 1 && Math.abs(_v.x) < .6) o = clamp((d - 1.5) / .9, 0, 1); }
    A.occ += (o - A.occ) * Math.min(1, dt * 6); if (A.occ > .995) A.occ = 1; if (A.occ < .01) A.occ = 0; }
  if (A.fade < 1) A.fade = Math.min(1, A.fade + Math.max(dt, RDT) / 1.4);   // 秒で決める（遅い端末で網目の碧が長く残らないように。2026-10-14）
  { const op = Math.min(A.fade, A.occ); if (op !== A.op) { A.op = op; aoiOpacity(op); } }
  aoi.visible = Math.hypot(A.pos.x - camP.x, A.pos.z - camP.z) > .7 && A.op > .02 && !(A.hideExp && (mode === "exp" || mode === "trans"));
}
let aoiMats = null, RDT = 0;
function aoiOpacity(o) {
  if (!aoi) return;
  if (!aoiMats) { aoiMats = []; aoi.traverse(m => { if (m.isMesh && !m.userData.noFade) for (const mt of [].concat(m.material)) aoiMats.push([mt, mt.transparent, mt.depthWrite]); }); }
  blobMat.opacity = BLOB_MAX * o;
  for (const [mt, tr, dw] of aoiMats) { mt.transparent = o < 1 ? true : tr; mt.opacity = o; mt.depthWrite = o < 1 ? o > .6 : dw; mt.needsUpdate = true; }
}

// ---------------------------------------------------------------- 足音（床＝寄木の床。短く、少しだけ響く）
let stepT = 0, stepPh = 0;
const STEP = { rev: null, wet: null };
function stepTick(dt) {
  const moving = mode === "walk" && (me.path.length || [...keys].some(k => "wasd".includes(k) || k.startsWith("arrow")));
  if (!AUD.ctx || AUD.muted || !moving) { stepT = Math.min(stepT, .12); return; }
  stepT -= dt; if (stepT > 0) return; stepT = .52;
  const c = AUD.ctx;
  if (!STEP.rev) {
    STEP.rev = c.createConvolver(); STEP.wet = c.createGain(); STEP.wet.gain.value = .12; STEP.rev.connect(STEP.wet); STEP.wet.connect(AUD.master);
    const n = Math.floor(c.sampleRate * .8), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 4); }
    STEP.rev.buffer = b;
  }
  stepPh ^= 1;
  for (const [delay, amp] of [[0, 1], [.05, .4]]) {
    const len = .06, src = c.createBufferSource(), b = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 6);
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1300 * (stepPh ? 1 : .92); bp.Q.value = 2.5;
    const g = c.createGain(); g.gain.value = .2 * amp;
    src.buffer = b; src.connect(bp); bp.connect(g); g.connect(AUD.master); g.connect(STEP.rev); src.start(c.currentTime + delay);
  }
}

// ---------------------------------------------------------------- はじめての一押し：音を立て、碧があいさつ
let woke = false;
function wake() {
  if (woke) { AUD.ctx?.resume?.(); return; }
  woke = true; AUD.init(); AUD.setMute(AUD.muted);
  if (mode === "walk" && !cur) talk(S.intro, freeActs());
}

// ---------------------------------------------------------------- まわす
const clock = new THREE.Clock();
let frames = 0, slowAcc = 0, viewOff = 0, distK = 1, lastRead = "";
function loop() {
  const rawDt = clock.getDelta(), dt = Math.min(.05, rawDt); RDT = Math.min(rawDt, .4); frames++;
  if (mode === "trans") {
    trans.t = Math.min(1, trans.t + dt / (RM ? .01 : trans.dur)); const e = trans.t * trans.t * (3 - 2 * trans.t);
    const P = orbitPose(); camera.position.lerpVectors(trans.fromP, P.p, e); camera.quaternion.copy(trans.fromQ).slerp(P.q, e);
    if (trans.t >= 1) { const f = trans.then; trans.then = null; f?.(); }
  } else if (mode === "exp") { const P = orbitPose(); camera.position.copy(P.p); camera.quaternion.copy(P.q); }
  // 狭い画面：上の操作の板と下の字幕のあいだに模型が来るよう、絵をずらし、少し引く（2026-10-08 検証の P2「数字の板が模型を隠す」）
  if (frames % 6 === 0) {
    if ((mode === "exp" || mode === "trans") && innerWidth < 980 && !$("exp").hidden) {
      const top = $("exp").getBoundingClientRect().bottom, gd = $("guide"), bot = gd.hidden ? innerHeight : gd.getBoundingClientRect().top;
      const off = (top + bot) / 2 - innerHeight / 2; viewOff += (off - viewOff) * .5; distK = clamp(Math.sqrt(innerHeight / Math.max(120, bot - top)), 1, 1.3) * .82;
      camera.setViewOffset(innerWidth, innerHeight, 0, -viewOff, innerWidth, innerHeight);
    } else if (viewOff !== 0 || distK !== 1) { viewOff = 0; distK = 1; camera.clearViewOffset(); }
  }
  moveTick(dt); aoiTick(dt); stepTick(dt);
  marker.material.opacity = Math.max(0, marker.material.opacity - dt * .9);
  for (const f of decorTick) f(dt);
  { let best = cur, bd = 1e9; if (!best) for (const b of BENCH) { const d = camera.position.distanceTo(b.center); if (d < bd) { bd = d; best = b; } } if (best) { spot.target.position.lerp(best.center, Math.min(1, dt * 3)); spot.position.set(spot.target.position.x, 4.2, spot.target.position.z + .6); } }
  slowAcc += dt;
  for (const b of BENCH) {
    const on = cur === b;
    if (on) b.mod.tick(dt, true);
    else if (camera.position.distanceTo(b.center) < 9) b.mod.tick(dt, false);
    b.label.visible = !on;
  }
  if (cur && slowAcc > .25) { const h = cur.mod.read?.() || ""; if (h !== lastRead) { lastRead = h; $("read").innerHTML = h; } }
  if (slowAcc > .25) slowAcc = 0;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
prog(60);
camera.position.copy(me.pos); camera.rotation.set(me.pitch, me.yaw, 0, "YXZ");
// 2026-10-13：碧の姿（約 2 MB）を待たずに部屋を見せる。碧はあとから静かに現れる（もともと 1.4 秒かけて出る作り）
renderer.compile(scene, camera); renderer.render(scene, camera);
prog(100);
setTimeout(() => $("load").classList.add("off"), 150);
requestAnimationFrame(loop);
loadAoi();
setTimeout(() => loadLater("data/lipsync.js", () => { LIPSYNC = window.LIPSYNC || {}; }), 1200);
$("sayState").textContent = "どこかを押すと、声で話しはじめます（音が出ます）";
// ?b=frost などで、その台の前から始める（授業で URL を配るため。2026-10-08 検証の P3）
{ const q = new URLSearchParams(location.search).get("b"), b0 = BENCH.find(b => b.id === q); if (b0) { me.pos.set(b0.stand.x, EYE, b0.stand.z); me.yaw = Math.atan2(-(b0.center.x - b0.stand.x), -(b0.center.z - b0.stand.z)); setTimeout(() => enterBench(b0), 600); } }
window.__lab = { benchAoiSpot, BENCH, me, A, SP, AUD, S, NAMES, enterBench, leaveBench, walkable, get mode() { return mode; }, get cur() { return cur; }, renderer, camera, scene, orb, get frames() { return frames; }, wake };
