/* 実験台 temp：地面の中の温度の波（3D・2026-10-08）。
   地表の温度が一日（または一年）の周期で上下すると、その波は土の中へ伝わりながら小さくなり、遅れて届く。
   熱伝導の式の周期解（教科書の水準：Hillel 1998 Environmental Soil Physics ほか）：
     T(z, t) = Tm + A · exp(−z/d) · sin(ωt − z/d)、 d = √(2κ/ω)（減衰深さ）
   κ（熱の伝わりやすさ・温度拡散率）＝ 5×10⁻⁷ m²/s（湿った土の代表的な値の目安。土の種類と湿り気で 0.2〜1×10⁻⁶ ほど変わる）。
   → 一日の波の d ≈ 12 cm、一年の波の d ≈ 2.2 m。地表の振れ幅（A）と平均（Tm）は目安。どこも同じ土で、水の動き・雪・草のおおいは入れていない。 */
import * as THREE from "three";
import { seg, btn, fmt, canvasTex, DS } from "./util.js";

const KAPPA = 5e-7;
const MODE = {
  day: { name: "一日の波", P: 86400, Tm: 18, A: 10, depth: .6, probes: [0, .05, .1, .2, .4], unit: "cm", k: 100, secPerCycle: 24 },
  year: { name: "一年の波", P: 365.25 * 86400, Tm: 16, A: 12, depth: 6, probes: [0, .5, 1, 2, 4], unit: "m", k: 1, secPerCycle: 36 },
};
const BW = .8, BH = .6, BD = .3, Y0 = .03;
let RANGE = [8, 28];
const col = T => { const u = THREE.MathUtils.clamp((T - RANGE[0]) / (RANGE[1] - RANGE[0]), 0, 1); const c = new THREE.Color(); c.setHSL(.66 - .66 * u, .7, .45 + .1 * Math.sin(u * Math.PI)); return c; };

export function create(H) {
  const g = new THREE.Group(); const { std, box, cyl } = H;
  const base = box(1.25, .03, .42, std(DS.base, .5)); base.position.y = .015; g.add(base);
  // 土の断面：前の面に温度の色を描く
  const cv = document.createElement("canvas"); cv.width = 8; cv.height = 120; const cx = cv.getContext("2d");
  const heat = new THREE.CanvasTexture(cv); heat.colorSpace = THREE.SRGBColorSpace; heat.magFilter = THREE.LinearFilter;
  const side = std(0x5a4430, .95);
  const blockM = [side, side, std(0x4a5e34, .9), side, new THREE.MeshBasicMaterial({ map: heat, toneMapped: false }), side];
  const block = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), blockM); block.position.set(-.18, Y0 + BH / 2, 0); g.add(block);
  for (let i = 0; i < 18; i++) { const gr = box(.004, .02 + Math.random() * .03, .004, std(0x5f8f3a, .7)); gr.position.set(-.18 + (Math.random() - .5) * BW * .95, Y0 + BH + .015, (Math.random() - .5) * BD * .9); g.add(gr); }
  // 温度計（深さごとの差しこみ棒）と名札
  const probes = [0, 1, 2, 3, 4].map(i => {
    const rod = cyl(.006, .006, .16, std(0xb9b9b9, .3, .8), 8); rod.rotation.x = Math.PI / 2; g.add(rod);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(.014, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); g.add(bead);
    const lc = document.createElement("canvas"); lc.width = 256; lc.height = 64; const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
    const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, transparent: true, depthWrite: false })); lab.scale.set(.2, .05, 1); lab.renderOrder = 6; g.add(lab);
    return { rod, bead, lc, lt, lab };
  });
  // 波の板（深さごとの温度の移り変わり）
  const gc = document.createElement("canvas"); gc.width = 512; gc.height = 300; const gx = gc.getContext("2d");
  const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(.46, .27), new THREE.MeshBasicMaterial({ map: gt, toneMapped: false })); board.position.set(.43, Y0 + .44, -.05); board.rotation.y = -.25; g.add(board);
  const stand = box(.02, .3, .02, std(DS.base, .5)); stand.position.set(.43, Y0 + .15, -.05); g.add(stand);
  // 色の物差し（2026-10-13 テストプレーの P3「色の物差しがない」）：断面の左に、上が温かい（赤）・下が冷たい（青）の帯と温度
  const kc = document.createElement("canvas"); kc.width = 160; kc.height = 600; const kt = new THREE.CanvasTexture(kc); kt.colorSpace = THREE.SRGBColorSpace;
  const key = new THREE.Mesh(new THREE.PlaneGeometry(.12, .45), new THREE.MeshBasicMaterial({ map: kt, transparent: true, toneMapped: false })); key.position.set(-.66, Y0 + BH / 2, BD / 2 - .02); g.add(key);
  function drawKey() {
    const c = kc.getContext("2d"); c.clearRect(0, 0, 160, 600); c.fillStyle = "rgba(6,10,18,.82)"; c.fillRect(0, 0, 160, 600);
    for (let y = 0; y < 520; y++) { const T = RANGE[1] - (RANGE[1] - RANGE[0]) * y / 519; c.fillStyle = "#" + col(T).getHexString(); c.fillRect(104, 40 + y, 36, 1); }
    c.fillStyle = "#eef5fb"; c.font = "600 30px 'Hiragino Sans','Noto Sans JP',sans-serif"; c.textAlign = "right"; c.textBaseline = "middle";
    [[0, RANGE[1]], [.5, (RANGE[0] + RANGE[1]) / 2], [1, RANGE[0]]].forEach(([f, v]) => c.fillText(`${fmt(v, 0)}℃`, 96, 40 + f * 519));
    c.font = "24px 'Hiragino Sans','Noto Sans JP',sans-serif"; c.fillText("温", 96, 100); c.fillText("冷", 96, 500); kt.needsUpdate = true;
  }
  // 太陽（一日）・季節の札（一年）
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffd25a })); g.add(sun);
  let mode = "day", run = true, t = 0, fast = 1, acc = 0;
  const TT = (z, tt) => { const M = MODE[mode], w = 2 * Math.PI / M.P, d = Math.sqrt(2 * KAPPA / w); return M.Tm + M.A * Math.exp(-z / d) * Math.sin(w * tt - z / d); };
  // t は「周期の中の位置（秒）」。一日：表面が 13 時ごろに最も高くなるよう、ずらす（目安）。一年：8 月半ばに最も高い（目安）
  const phase0 = () => mode === "day" ? 7 * 3600 : (365.25 / 12 * 4.5) * 86400;
  function draw() {
    const M = MODE[mode];
    for (let y = 0; y < cv.height; y++) { const z = y / cv.height * M.depth; cx.fillStyle = "#" + col(TT(z, t - phase0())).getHexString(); cx.fillRect(0, y, cv.width, 1); }
    heat.needsUpdate = true;
    probes.forEach((p, i) => {
      const z = M.probes[i], yy = Y0 + BH - z / M.depth * BH, T = TT(z, t - phase0());
      p.rod.position.set(.24, yy, BD / 2 - .02); p.bead.position.set(.32, yy, BD / 2 - .02); p.bead.material.color.copy(col(T));
      p.lab.position.set(.42 + (i % 2) * .0, yy, BD / 2); const c = p.lc.getContext("2d"); c.clearRect(0, 0, 256, 64);
      c.fillStyle = "rgba(251,250,246,.92)"; c.fillRect(0, 0, 256, 64); c.fillStyle = "#1d2321"; c.font = "600 30px 'Hiragino Sans','Noto Sans JP',sans-serif"; c.textBaseline = "middle";
      c.fillText(`${z === 0 ? "表面" : (mode === "day" ? z * 100 : z) + " " + M.unit}　${fmt(T, 1)}℃`, 10, 33); p.lt.needsUpdate = true;
    });
    // 波の板：一周期ぶんの線
    gx.fillStyle = "#fbfaf6"; gx.fillRect(0, 0, 512, 300); gx.strokeStyle = "#c9c4b8"; gx.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { gx.beginPath(); gx.moveTo(40, 30 + k * 60); gx.lineTo(500, 30 + k * 60); gx.stroke(); }
    gx.fillStyle = "#56605c"; gx.font = "18px sans-serif"; [M.Tm + M.A, M.Tm + M.A / 2, M.Tm, M.Tm - M.A / 2, M.Tm - M.A].forEach((v, k) => gx.fillText(fmt(v, 0) + "℃", 2, 36 + k * 60));
    const colors = ["#c0392b", "#e08a1e", "#2f8f86", "#2f6f8f", "#6a4fa0"];
    M.probes.forEach((z, i) => { gx.strokeStyle = colors[i]; gx.lineWidth = 3; gx.beginPath(); for (let s = 0; s <= 100; s++) { const tt = t - phase0() - M.P + s / 100 * M.P, T = TT(z, tt), x = 40 + s * 4.6, y = 150 - (T - M.Tm) / M.A * 120; s ? gx.lineTo(x, y) : gx.moveTo(x, y); } gx.stroke(); });
    gx.fillStyle = "#1d2321"; gx.font = "600 20px sans-serif"; gx.fillText(mode === "day" ? "この 24 時間" : "この 1 年", 400, 22);
    M.probes.forEach((z, i) => { gx.fillStyle = colors[i]; gx.fillText(z === 0 ? "表面" : (mode === "day" ? z * 100 : z) + M.unit, 60 + i * 86, 292); });
    gt.needsUpdate = true;
    // 太陽：一日は空を横切る、一年は季節で高さが変わる
    if (mode === "day") { const h = ((t / 3600) % 24), a = (h - 6) / 12 * Math.PI; sun.visible = h > 6 && h < 18; sun.position.set(-.18 - Math.cos(a) * .45, Y0 + BH + .08 + Math.sin(a) * .3, -.1); }
    else { const m = (t / M.P * 12) % 12, hgt = .2 + .14 * Math.sin((m - 2.67) / 12 * 2 * Math.PI); sun.visible = true; sun.position.set(-.18, Y0 + BH + .08 + hgt, -.1); }
  }
  function reset() { const M = MODE[mode]; RANGE = [M.Tm - M.A, M.Tm + M.A]; t = mode === "day" ? 6 * 3600 : 0; drawKey(); draw(); }
  reset();
  return {
    group: g, focus: { y: .32, dist: 1.5, pitch: .18 }, labelY: 1.0,
    tick(dt, on) { if (!on || !run) return; const M = MODE[mode]; t += dt * fast * M.P / M.secPerCycle; acc += dt; if (acc > .1) { acc = 0; draw(); } },
    ui(box_) {
      const pb = btn(box_, "⏸ とめる", () => { run = !run; pb.textContent = run ? "⏸ とめる" : "▶ 進める"; }, true);
      seg(box_, Object.entries(MODE).map(([k, v]) => [k, v.name]), mode, k => { mode = k; reset(); }, "波の長さ");
      seg(box_, [[1, "ふつう"], [3, "はやく"]], fast, v => { fast = v; }, "速さ");
    },
    read() {
      const M = MODE[mode], w = 2 * Math.PI / M.P, d = Math.sqrt(2 * KAPPA / w), tt = t - phase0();
      const when = mode === "day" ? `${Math.floor((t / 3600) % 24)} 時` : `${Math.floor((t / M.P * 12) % 12) + 1} 月ごろ`;
      return `<div class="row"><span><span class="k">${mode === "day" ? "時刻" : "季節"}</span> ${when}</span>${M.probes.map(z => `<span><span class="k">${z === 0 ? "表面" : (mode === "day" ? z * 100 : z) + " " + M.unit}</span> ${fmt(TT(z, tt), 1)}℃</span>`).join("")}</div>
<div class="note">振れ幅が表面の約 37% になる深さ＝${mode === "day" ? fmt(d * 100, 0) + " cm" : fmt(d, 1) + " m"}（熱の伝わりやすさを湿った土の代表的な値にしたとき）。表面の温度の振れ幅と平均は目安です。</div>`;
    },
  };
}
