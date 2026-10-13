/* 実験台 kanten：観天望気（空の模型・3D・2026-10-08）。
   ことば・意味・しるし・しくみ・典拠は、森羅博物館の観天望気のデータから研究室の中へ写したもの（data/kanten.js・）。書き足さない。
   空の模型は、データの「自然のしくみ」の説明を絵にしたもの（西が左・東が右。中緯度では天気がおおむね西から東へ移る）。
   動きの時間の長さは、データに書かれた幅（半日から一日・30 分〜1 時間 など）の札だけを出し、模型の速さは決めた値。 */
import * as THREE from "three";
import { seg, btn, tag, note, fmt, DS } from "./util.js";

const K = window.KANTEN || { items: [], verdict: {} };
const MARK = { "根拠あり": "●", "部分的": "◐", "伝承": "○" };
const SKY = {   // [上, 地平]
  day: ["#6fa6d8", "#cfe2ef"], dusk: ["#38568f", "#f0a25a"], night: ["#0d1730", "#27375a"], dawn: ["#5c79a8", "#f3c48d"], gray: ["#8a929c", "#b9bec4"], dark: ["#5d646d", "#8c939b"], haze: ["#9fb8cf", "#e4e8ea"],
};
// 場面：p（0〜1）で移る。stages＝[p の境目, 札]
const SCENES = {
  yuyake: { stages: [[0, "夕方：西の空が焼けている"], [.35, "夜"], [.6, "あくる日"]], end: "晴れることが多い" },
  kasa: { stages: [[0, "夜：月に暈"], [.4, "雲が低く厚くなる"], [.75, "雨（データの幅：半日から一日ほど）"]], end: "雨になることが多い（前線を伴わない巻層雲もある）" },
  asagiri: { stages: [[0, "朝：霧"], [.4, "日が昇り、霧が晴れる"], [.7, "日中"]], end: "晴れることが多い（前線の霧は別）" },
  nishi: { stages: [[0, "雨のさなか：西の空が明るむ"], [.4, "雲の帯の西の縁が近づく"], [.75, "縁が通りすぎる"]], end: "まもなく雨は上がることが多い（夏の積乱雲の雨は別）" },
  uroko: { stages: [[0, "空一面のうろこ雲"], [.45, "雲が低く厚くなることが多い"], [.8, "崩れることがある"]], end: "条件つき（何も起きない日もある）" },
  tsubame: { stages: [[0, "燕が低く飛ぶ"], [.5, "湿った空気"], [.8, "降る日も、降らない日もある"]], end: "条件つき（検証は限られる）" },
};

export function create(H) {
  const g = new THREE.Group(); const { std, box, cyl } = H;
  const base = box(1.3, .04, .56, std(DS.base, .5)); base.position.y = .02; g.add(base);
  // 地面（低い丘と家並み）
  const ground = box(1.26, .03, .5, std(0x6d8a52, .9)); ground.position.y = .055; g.add(ground);
  for (let i = 0; i < 6; i++) { const hill = new THREE.Mesh(new THREE.SphereGeometry(.12 + Math.random() * .08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0x5f7d48, .9)); hill.scale.y = .45; hill.position.set(-.55 + i * .22, .07, -.17 + Math.random() * .05); g.add(hill); }
  for (let i = 0; i < 5; i++) { const h = box(.035, .03, .03, std(0xe8e2d4, .7)); h.position.set(-.3 + i * .14, .085, .08); g.add(h); const r = new THREE.Mesh(new THREE.ConeGeometry(.03, .025, 4), std(0x7a4a3a, .7)); r.rotation.y = Math.PI / 4; r.position.set(-.3 + i * .14, .112, .08); g.add(r); }
  // 空の背景（半円の筒の内側）
  const cv = document.createElement("canvas"); cv.width = 16; cv.height = 128; const cx = cv.getContext("2d");
  const skyT = new THREE.CanvasTexture(cv); skyT.colorSpace = THREE.SRGBColorSpace;
  // 空の背景：ゆるく曲げた板（左右の端を少し手前へ）
  const dg = new THREE.PlaneGeometry(1.3, .82, 24, 1); { const pa = dg.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setZ(i, .18 * (x / .65) ** 2); } dg.computeVertexNormals(); }
  const dome = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: skyT, toneMapped: false }));
  dome.position.set(0, .48, -.26); g.add(dome);
  const W_ = note("西", { w: .06 }); W_.position.set(-.6, .9, -.1); g.add(W_); const E_ = note("東", { w: .06 }); E_.position.set(.6, .9, -.1); g.add(E_);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffe08a, toneMapped: false })); g.add(sun);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.012, 16, 10), new THREE.MeshBasicMaterial({ color: 0xf2f0e6, toneMapped: false })); g.add(moon);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.19, .005, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .6, toneMapped: false })); g.add(halo);
  // 暈の半径は空の角度でおよそ 22°、月はおよそ 0.5°（直径）。本物の比では月が見えなくなるので、月は大きめに描いて札で言う
  const haloNote = note("暈の半径はおよそ 22°（月は大きめに描いた）", { w: .36 }); haloNote.position.set(0, .32, -.12); g.add(haloNote);
  // 雲：積雲（ふくらみ）・層の雲（板）・うろこ雲（小さな粒の群れ）・積乱雲（塔）と雨の柱
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: .95 });
  const puffs = new THREE.Group(); g.add(puffs);
  for (let i = 0; i < 4; i++) { const c = new THREE.Group(); for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.03 + Math.random() * .02, 10, 8), cloudM); s.position.set((k - 2) * .025, Math.random() * .015, (Math.random() - .5) * .03); c.add(s); } c.userData.x0 = -.5 + i * .33; c.userData.y = .55 + Math.random() * .12; puffs.add(c); }
  const layerM = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const layer = box(1.3, .03, .5, layerM); g.add(layer);
  const scaleM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const scales = new THREE.InstancedMesh(new THREE.SphereGeometry(.012, 6, 4), scaleM, 160); scales.frustumCulled = false; g.add(scales);
  { const M = new THREE.Matrix4(); for (let i = 0; i < 160; i++) { M.compose(new THREE.Vector3(-.6 + (i % 20) * .063 + (Math.random() - .5) * .02, .78 + (Math.random() - .5) * .03, -.2 + Math.floor(i / 20) * .05), new THREE.Quaternion(), new THREE.Vector3(1.6, .5, 1)); scales.setMatrixAt(i, M); } }
  const tower = new THREE.Group(); g.add(tower);
  for (let k = 0; k < 14; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.05 + (k > 10 ? .03 : 0), 10, 8), new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 1, transparent: true, opacity: 1 })); s.position.set((Math.random() - .5) * .1 + (k > 10 ? (k - 12) * .06 : 0), .25 + k * .042, (Math.random() - .5) * .08); tower.add(s); }
  const rainM = new THREE.MeshBasicMaterial({ color: 0x7f97b4, transparent: true, opacity: 0, depthWrite: false });
  const rainCol = cyl(.12, .14, .22, rainM, 20); g.add(rainCol);
  const fogM = new THREE.MeshBasicMaterial({ color: 0xf2f2ee, transparent: true, opacity: 0, depthWrite: false });
  const fog = box(1.24, .07, .46, fogM); fog.position.y = .11; g.add(fog);
  // 燕（横から見た形：とがった翼と、二つに分かれた尾）
  const birdTex = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 64; const x = c.getContext("2d"); x.fillStyle = "#1e2430";
    x.beginPath(); x.moveTo(64, 30); x.quadraticCurveTo(40, 14, 6, 22); x.quadraticCurveTo(38, 26, 58, 36); x.lineTo(70, 36); x.quadraticCurveTo(90, 26, 122, 22); x.quadraticCurveTo(88, 14, 64, 30); x.fill();
    x.beginPath(); x.ellipse(64, 34, 9, 5, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(58, 38); x.lineTo(54, 58); x.lineTo(63, 42); x.lineTo(72, 58); x.lineTo(68, 38); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const birds = [0, 1, 2].map(i => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: birdTex, transparent: true, depthWrite: false })); s.scale.set(.06, .03, 1); s.userData.ph = i * 2.1; g.add(s); return s; });
  const stageTag = tag("", { w: .3 }); stageTag.position.set(0, 1.0, .1); g.add(stageTag);
  function setTag(t) { const n = tag(t, { w: Math.min(.7, .045 * t.length + .06) }); stageTag.material.map = n.material.map; stageTag.material.needsUpdate = true; stageTag.scale.copy(n.scale); }

  const C1 = new THREE.Color(), C2 = new THREE.Color();
  function sky(a, b, t) { const A1 = SKY[a], A2 = SKY[b]; C1.set(A1[0]).lerp(new THREE.Color(A2[0]), t); C2.set(A1[1]).lerp(new THREE.Color(A2[1]), t); const gr = cx.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#" + C1.getHexString()); gr.addColorStop(1, "#" + C2.getHexString()); cx.fillStyle = gr; cx.fillRect(0, 0, 16, 128); skyT.needsUpdate = true; }
  const sm = (a, b, p) => THREE.MathUtils.smoothstep(p, a, b);
  let id = (K.items[0] || {}).id, p = 0, playing = false, lastStage = "", time = 0;
  function apply() {
    const S = SCENES[id]; if (!S) return;
    // まず全部を隠す
    sun.visible = moon.visible = halo.visible = haloNote.visible = false; puffs.visible = false; tower.visible = false; birds.forEach(b => b.visible = false);
    layerM.opacity = 0; scaleM.opacity = 0; rainM.opacity = 0; fogM.opacity = 0; layer.scale.set(1, 1, 1);
    const arc = (x, y) => [x, y];
    if (id === "yuyake") {
      if (p < .35) { sky("dusk", "night", sm(.2, .35, p)); sun.visible = p < .25; sun.position.set(-.55, .25 - p * .5, -.2); puffs.visible = true; puffs.children.forEach(c => { c.position.set(c.userData.x0 * .3 + .35 + p * .6, c.userData.y, -.1); }); }
      else if (p < .6) sky("night", "dawn", sm(.5, .6, p));
      else { sky("dawn", "day", sm(.6, .75, p)); sun.visible = true; const q = (p - .6) / .4; sun.position.set(.55 - q * .5, .2 + q * .45, -.2); }
    } else if (id === "kasa") {
      sky(p < .7 ? "night" : "night", p < .7 ? "night" : "dark", sm(.7, .85, p));
      moon.visible = halo.visible = p < .55; moon.position.set(0, .6, -.2); halo.position.copy(moon.position); haloNote.visible = true;
      halo.material.opacity = .6 * (1 - sm(.3, .55, p));
      layer.position.set(-.6 + Math.min(1, p * 1.6) * .6, .78 - sm(.3, .8, p) * .35, -.05); layer.scale.y = 1 + sm(.3, .8, p) * 3; layerM.opacity = .25 + .6 * sm(.1, .8, p); layerM.color.set(0xc8ccd2).lerp(new THREE.Color(0x6e747c), sm(.4, .9, p));
      rainM.opacity = .5 * sm(.75, .85, p); rainCol.scale.set(5, 1.6, 2); rainCol.position.set(0, .26, -.05);
    } else if (id === "asagiri") {
      sky("dawn", "day", sm(.2, .7, p)); sun.visible = true; sun.position.set(.55 - p * .45, .18 + p * .45, -.2);
      fogM.opacity = .85 * (1 - sm(.35, .75, p)); fog.position.y = .11 + sm(.35, .75, p) * .12;
    } else if (id === "nishi") {
      // 雨の雲の帯（板）が西から東へ流れ、西の縁が通りすぎると雨が上がる。西（左）の空は初めから明るい
      // 空：西（左）は雲の外で明るく、雲の帯の縁から東（右）は暗い。縁が東へ動くと明るい所が広がる
      { const e = THREE.MathUtils.clamp((-.4 + sm(0, 1, p) * 1.1 + .65) / 1.3, 0, 1), gr = cx.createLinearGradient(0, 0, 16, 0);
        gr.addColorStop(0, "#d6e6f0"); gr.addColorStop(e, "#a9c0d3"); gr.addColorStop(Math.min(1, e + .12), "#5d646d"); gr.addColorStop(1, "#5d646d");
        cx.fillStyle = gr; cx.fillRect(0, 0, 16, 128); skyT.needsUpdate = true; }
      const edge = -.4 + sm(0, 1, p) * 1.1;    // 雲の帯の西の縁（x）。はじめから西（左）の端は雲の外＝明るい。左から右へ
      const w = Math.max(.02, .66 - edge);       // 縁から東の端まで
      layer.position.set(edge + w / 2, .7, -.05); layer.scale.set(w / 1.3, 3, 1); layerM.color.set(0x7c838c); layerM.opacity = .85 * (1 - sm(.85, 1, p));
      rainM.opacity = .5 * (1 - sm(.55, .8, p)); rainCol.scale.set(Math.max(.05, w / .28), 1.6, 2); rainCol.position.set(edge + w / 2, .26, -.05);
      sun.visible = true; sun.position.set(-.52, .32 + p * .12, -.04);
    } else if (id === "uroko") {
      sky("day", "gray", sm(.4, .9, p)); sun.visible = p < .6; sun.position.set(.3, .78, -.25);
      scaleM.opacity = .9 * (1 - sm(.4, .7, p)); layerM.opacity = .7 * sm(.35, .8, p); layer.position.set(0, .7 - sm(.4, .9, p) * .2, -.05); layer.scale.y = 1 + sm(.4, .9, p) * 2; layerM.color.set(0xb9bec4);
      rainM.opacity = .22 * sm(.85, 1, p); rainCol.scale.set(5, 1.6, 2); rainCol.position.set(0, .26, -.05);
    } else if (id === "tsubame") {
      sky("haze", "gray", sm(.3, .9, p)); layerM.opacity = .35 + .3 * sm(.3, .9, p); layer.position.set(0, .74, -.05); layer.scale.y = 2; layerM.color.set(0xc4c9cf);
      birds.forEach((b, i) => { b.visible = true; const t = time * .9 + b.userData.ph; b.position.set(Math.sin(t) * .45, .13 + .025 * Math.sin(t * 2.3), .05 + .1 * Math.cos(t)); });
    }
    let cur = S.stages[0][1]; for (const [a, t] of S.stages) if (p >= a) cur = t; if (p >= 1) cur = S.end;
    if (cur !== lastStage) { lastStage = cur; setTag(cur); }
  }
  function choose(nid) { id = nid; p = 0; playing = false; lastStage = ""; apply(); if (pb) pb.textContent = "このあとを見る ▶"; const it = K.items.find(k => k.id === id); if (it && H.say) H.say([`${it.text}。`, it.meaning]); }
  apply();
  let pb;
  return {
    group: g, focus: { y: .45, dist: 1.6, pitch: .12 }, labelY: 1.18,
    tick(dt, on) { if (!on) return; time += dt; if (playing) { p = Math.min(1, p + dt / 9); if (p >= 1) { playing = false; if (pb) pb.textContent = "もう一度見る ▶"; } } apply(); },
    ui(box_) {
      seg(box_, K.items.map(k => [k.id, `${MARK[k.verdict]} ${k.name}`]), id, v => choose(v), "徴");
      pb = btn(box_, "このあとを見る ▶", () => { if (p >= 1) p = 0; playing = true; pb.textContent = "動いています"; }, true);
    },
    read() {
      const it = K.items.find(k => k.id === id); if (!it) return "";
      // 典拠は切らずに全文（2026-10-13 テストプレーの P2「典拠が途中で切れる」）。URL は押して開ける
      const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      const src = esc(it.src).replace(/https?:\/\/[^\s）)]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.length > 48 ? u.slice(0, 46) + "…" : u}</a>`);
      return `<div><b>${it.text}</b>　<span class="k">${MARK[it.verdict]} ${it.verdict}（${K.verdict[it.verdict] || ""}）</span></div>
<div>${it.meaning}</div><div class="note">しくみ：${it.how}</div><div class="note src">典拠：${src}</div>
<div class="note">ことば・しるし・典拠は森羅博物館の観天望気のデータから写したもの。空の模型は、しくみの説明を絵にしたものです（西が左）。</div>`;
    },
  };
}
