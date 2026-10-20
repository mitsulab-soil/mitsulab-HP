/* Qualia Lab の部屋の調度（2026-10-20）：壁ぎわの低い木の棚・壁の図（押すと碧が話す）・まん中の「重なる層」の像。
   2026-10-20 本人「土の実験ではなく、Qualiaのラボという立ち位置で全面的に作り変え」→ 鉱物・土の標本の棚（旧 wunder.js）をやめ、
   受けとり方の仕組み（場所・受けとる主体・碧・受けとり方・Qualia Layer）の図を壁にかけた。部屋の骨組み（寄木の床・格天井・天窓・窓・扉）は前のまま。
   スマホを軽く：棚は材料ごとに一つの形にまとめ、図はキャンバスに描いた一枚ずつ。 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { canvasTex, tex } from "./util.js";

const MIN = `"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`, GO = `"Hiragino Sans","Noto Sans JP",sans-serif`;
// 壁の図：題・小さな図・ことば（図は線だけ＝事実の線）
const PANELS = {
  p_q: { t: "受けとり方", s: "q ＝ Φ（場所, 主体）", c: ["受けとり方は、場所と主体のあいだに", "立ち上がる関係。どちらかを替えると、変わる。"], draw: "phi" },
  p_s: { t: "受けとる主体", s: "人・生き物・機械", c: ["人だけでなく、ミツバチも、コウモリも、", "録音機やカメラも、受けとる主体。"], draw: "subj" },
  p_layer: { t: "Qualia Layer", s: "受けとり方を写した一枚", c: ["ほかの主体や場所の受けとり方を、", "人の感覚に写して、同じ場所に重ねる。"], draw: "layer" },
  p_e: { t: "場所", s: "環境", c: ["測った値と、記録と典拠をもとに、", "いま差し出せる手がかりを出す。"], draw: "place" },
  p_a: { t: "碧", s: "主体ごとに一人", c: ["受けとる主体ごとに一人ずつ現れる。", "姿も声も同じで、碧どうしは互いに見えない。"], draw: "aoi" },
};

function panelTex(P) {
  return canvasTex(1024, 720, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0b1424"); g.addColorStop(1, "#070d18"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 1400; k++) { c.fillStyle = `rgba(200,210,230,${Math.random() * .025})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }   // 紙の地のむら
    c.strokeStyle = "rgba(150,170,240,.35)"; c.lineWidth = 2; c.strokeRect(22, 22, w - 44, h - 44);
    c.fillStyle = "#5cc8e0"; c.fillRect(22, 22, 4, h - 44);
    c.fillStyle = "#eef5fb"; c.font = `600 64px ${MIN}`; c.fillText(P.t, 70, 110);
    c.fillStyle = "#9bdcf0"; c.font = `34px ${MIN}`; c.fillText(P.s, 72, 164);
    c.fillStyle = "#c3cce0"; c.font = `32px ${MIN}`; P.c.forEach((ln, i) => c.fillText(ln, 72, 600 + i * 48));
    // 図（線）
    c.strokeStyle = "#9bdcf0"; c.fillStyle = "#9bdcf0"; c.lineWidth = 3; const cx = 512, cy = 370;
    const lbl = (t, x, y) => { c.font = `28px ${GO}`; c.fillStyle = "#eef5fb"; c.textAlign = "center"; c.fillText(t, x, y); c.textAlign = "left"; c.fillStyle = "#9bdcf0"; };
    if (P.draw === "phi") { c.strokeRect(cx - 330, cy - 70, 200, 140); lbl("場所", cx - 230, cy + 10); c.beginPath(); c.arc(cx + 230, cy, 70, 0, 7); c.stroke(); lbl("主体", cx + 230, cy + 10);
      c.setLineDash([10, 8]); c.beginPath(); c.moveTo(cx - 120, cy); c.lineTo(cx + 150, cy); c.stroke(); c.setLineDash([]); lbl("q", cx + 15, cy - 20); }
    if (P.draw === "subj") { const xs = [cx - 300, cx - 100, cx + 100, cx + 300], nm = ["人", "ミツバチ", "コウモリ", "機械"]; xs.forEach((x, i) => { c.beginPath(); c.arc(x, cy - 10, 56, 0, 7); c.stroke(); lbl(nm[i], x, cy + 92); });
      c.beginPath(); c.moveTo(cx - 300, cy - 40); c.lineTo(cx - 300, cy + 10); c.moveTo(cx - 325, cy - 20); c.lineTo(cx - 275, cy - 20); c.stroke();
      c.beginPath(); c.ellipse(cx - 100, cy - 10, 26, 16, 0, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cx - 140, cy - 40); c.lineTo(cx - 60, cy + 20); c.moveTo(cx - 60, cy - 40); c.lineTo(cx - 140, cy + 20); c.stroke();
      c.beginPath(); c.moveTo(cx + 50, cy - 20); c.quadraticCurveTo(cx + 100, cy - 50, cx + 150, cy - 20); c.moveTo(cx + 70, cy); c.quadraticCurveTo(cx + 100, cy - 18, cx + 130, cy); c.stroke();
      c.strokeRect(cx + 270, cy - 35, 60, 50); c.beginPath(); c.arc(cx + 300, cy - 10, 14, 0, 7); c.stroke(); }
    if (P.draw === "layer") { for (let i = 0; i < 4; i++) { const y = cy - 110 + i * 60; c.globalAlpha = 1 - i * .18; c.beginPath(); c.moveTo(cx - 260, y + 40); c.lineTo(cx - 120, y - 20); c.lineTo(cx + 260, y - 20); c.lineTo(cx + 120, y + 40); c.closePath(); c.stroke(); } c.globalAlpha = 1; lbl("同じ場所の上に、一枚ずつ", cx, cy + 170); }
    if (P.draw === "place") { c.beginPath(); c.moveTo(cx - 320, cy + 60); for (let x = -320; x <= 320; x += 20) c.lineTo(cx + x, cy + 60 - 40 * Math.exp(-(((x + 60) / 140) ** 2)) - 18 * Math.sin(x / 50)); c.stroke();
      [["測った値", -230], ["記録と典拠", 0], ["手がかり", 230]].forEach(([t, x], i) => { c.beginPath(); i < 2 ? (c.moveTo(cx + x, cy - 90), c.lineTo(cx + x, cy + 10)) : (c.moveTo(cx + x, cy + 10), c.lineTo(cx + x, cy - 90)); c.stroke(); lbl(t, cx + x, cy - 108); }); }
    if (P.draw === "aoi") { [-260, 0, 260].forEach(x => { c.beginPath(); c.arc(cx + x, cy - 60, 30, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cx + x - 45, cy + 70); c.quadraticCurveTo(cx + x, cy - 30, cx + x + 45, cy + 70); c.stroke(); }); c.setLineDash([6, 10]); c.beginPath(); c.moveTo(cx - 200, cy); c.lineTo(cx - 60, cy); c.moveTo(cx + 60, cy); c.lineTo(cx + 200, cy); c.stroke(); c.setLineDash([]); lbl("一人に一人", cx, cy + 140); }
  });
}

export function buildRoom(scene, { RX, RZ, std, obst, clickables, decorTick, windowZ }) {
  const wood = new THREE.MeshStandardMaterial({ map: tex("wood_dark", 2, 1), color: 0x6a4a32, roughness: .5 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8913a, roughness: .32, metalness: .9 });
  const wg = [], bg = [];
  const cab = (x0, x1, z0, z1) => { const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    let g = new THREE.BoxGeometry(w, .86, d); g.translate(cx, .43, cz); wg.push(g); g = new THREE.BoxGeometry(w + .04, .04, d + .04); g.translate(cx, .88, cz); wg.push(g);
    const along = w > d, n = Math.max(1, Math.round((along ? w : d) / 1.1));
    for (let k = 0; k < n; k++) { const t = (k + .5) / n, hx = along ? x0 + w * t : (x0 < 0 ? x1 + .005 : x0 - .005), hz = along ? (z0 < 0 ? z1 + .005 : z0 - .005) : z0 + d * t; const hg = new THREE.BoxGeometry(along ? .16 : .02, .02, along ? .02 : .16); hg.translate(hx, .7, hz); bg.push(hg); }
    obst.push({ x0, x1, z0, z1 }); };
  // 左右の壁ぎわ（窓の下はあける）と奥の壁ぎわ
  cab(-RX + .05, -RX + .5, -RZ + .6, RZ - 1.4); cab(RX - .5, RX - .05, .2, RZ - 1.4); cab(RX - .5, RX - .05, -RZ + .6, windowZ[0] - .2);
  cab(-RX + .6, -1.6, -RZ + .05, -RZ + .5); cab(1.6, RX - .6, -RZ + .05, -RZ + .5);
  scene.add(new THREE.Mesh(mergeGeometries(wg), wood)); scene.add(new THREE.Mesh(mergeGeometries(bg), brass));
  // 壁の図：額（木の縁）とキャンバス。押すと碧が話す
  const frameM = new THREE.MeshStandardMaterial({ map: tex("wood_dark", 1, 1), color: 0x4a3222, roughness: .45 });
  const hang = (key, x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 2.35, z); g.rotation.y = ry; scene.add(g);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.48, .06), frameM); g.add(fr);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 1.36), new THREE.MeshBasicMaterial({ map: panelTex(PANELS[key]), toneMapped: false })); pic.position.z = .032; g.add(pic);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .9, 10), brass); lamp.rotation.z = Math.PI / 2; lamp.position.set(0, .86, .14); g.add(lamp);
    for (const o of [fr, pic]) { o.userData.decor = key; clickables.push(o); }
  };
  hang("p_q", -RX + .04, 6, Math.PI / 2); hang("p_layer", -RX + .04, -2.5, Math.PI / 2); hang("p_s", RX - .04, 6, -Math.PI / 2);
  hang("p_e", -5.6, -RZ + .04, 0); hang("p_a", 5.6, -RZ + .04, 0);
  // まん中の像：一つの場所（いちばん上の地面）の下へ、受けとり方の層が重なっていく（潜る向き）
  const S = new THREE.Group(); S.position.set(0, 0, 2.2); scene.add(S);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(.55, .62, .5, 40), new THREE.MeshStandardMaterial({ map: tex("sand_diff", 2, 1), color: 0xb8b0a2, roughness: .8 })); ped.position.y = .25; S.add(ped);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 2.0, 8), brass); rod.position.y = 1.5; S.add(rod);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, .05, 1.1), new THREE.MeshStandardMaterial({ map: tex("forest_diff", 1, 1), roughness: .95 })); top.position.y = 2.45; S.add(top);
  const plates = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.MeshBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: .1 - i * .012, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), m); p.rotation.x = -Math.PI / 2;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.1, 1.1)), new THREE.LineBasicMaterial({ color: 0x9bdcf0, transparent: true, opacity: .75 - i * .12 })); e.rotation.x = -Math.PI / 2;
    const gp = new THREE.Group(); gp.add(p, e); gp.position.y = 2.2 - i * .26; S.add(gp); plates.push(gp);
  }
  S.traverse(o => { if (o.isMesh || o.isLineSegments) { o.userData.decor = "sculpt"; if (o.isMesh) clickables.push(o); } });
  obst.push({ x0: -.75, x1: .75, z0: 2.2 - .75, z1: 2.2 + .75 });
  let t = 0; decorTick.push(dt => { t += dt; plates.forEach((p, i) => { p.rotation.y = Math.sin(t * .15 + i * .5) * .25; }); });
}
