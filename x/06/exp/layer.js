/* 実験台 layer：Qualia Layer を組む（Qualia Lab・2026-10-20）。
   一枚＝何の手がかりか（光・音・水・時間）× どこから取ったか（五つの印）× どう届けるか（光・音・語り・触れる）。
   正＝ の「層の文法」（一度に見るのは 3〜5 枚まで・強さ 0 で元の場所へ・推定や創作を測った値に見せない）。
   場所の模型は一つ（木の根もとと道）。板の上の線は模式。 */
import * as THREE from "three";
import { seg, btn, tag, note, DS, canvasTex, tex } from "./util.js";

const CLUE = { uv: ["光：紫外線の模様", "Light: ultraviolet patterns"], us: ["音：聞こえない声", "Sound: unheard calls"], water: ["水：地下の流れ", "Water: groundwater"], time: ["時間：昔の道すじ", "Time: the old road"] };
const WHAT = { uv: ["花びらの紫外線の模様", "Ultraviolet patterns on petals"], us: ["人に聞こえない高さの声", "Calls too high for people to hear"], water: ["地下の水の流れ", "Groundwater flow"], time: ["昔の道すじ", "The old road"] };
const BACKTO = { uv: ["足もとの花のまん中", "The centres of flowers at your feet"], us: ["夕方の空", "The evening sky"], water: ["坂の下の湧き水", "A spring at the foot of a slope"], time: ["いまの道の曲がり方", "How today's path bends"] };
const SRC = { meas: ["測った値", "Measured"], est: ["計算の推定", "Estimated"], doc: ["資料の記載", "Documented"], ask: ["mitsulab の問い", "A mitsulab question"], art: ["創作", "Creative"] };
const SRCN = { meas: ["その場で機械が測った値", "Values measured on site by a device"], est: ["測った値や資料から、計算で推し量ったもの", "Worked out by calculation from measurements or records"], doc: ["論文・図鑑・地図・史料に書かれたこと", "What papers, field guides, maps or historical records say"], ask: ["まだ答えのない、mitsulab の問い", "An open question from mitsulab"], art: ["作品として加えた語りや場面", "Storytelling or scenes added as creative work"] };
const HOW = { light: ["光（色と線）", "Light (colour and line)"], sound: ["音", "Sound"], voice: ["語り（碧の声）", "Narration (Aoi's voice)"], touch: ["触れる（振動）", "Touch (vibration)"] };
const MAX = 4, PW = 1.6, PD = .64;

// 板の模様（x：−0.8〜0.8・z：−0.32〜0.32 を 512×204 に）
const px = x => (x / PW + .5) * 512, pz = z => (z / PD + .5) * 204;
function pattern(clue, src) {
  return canvasTex(512, 204, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = "#9bdcf0"; c.fillStyle = "#9bdcf0"; c.lineWidth = 2.2;
    const dashed = src === "est" ? [10, 7] : src === "ask" ? [2, 7] : src === "art" ? [16, 5, 3, 5] : [];
    c.setLineDash(dashed);
    if (clue === "uv") for (const [x, z] of [[.3, .12], [.42, .04], [.36, -.1], [.52, -.02]]) { for (const r of [5, 11, 18]) { c.beginPath(); c.arc(px(x), pz(z), r, 0, 7); c.stroke(); } }
    if (clue === "us") { const X = px(.48), Z = pz(-.2); for (let r = 14; r < 210; r += 26) { c.globalAlpha = Math.max(.15, 1 - r / 220); c.beginPath(); c.arc(X, Z, r, 0, 7); c.stroke(); } c.globalAlpha = 1; }
    if (clue === "water") { for (let k = 0; k < 6; k++) { c.beginPath(); for (let s = 0; s <= 30; s++) { const t = s / 30, x = -.7 + 1.32 * t, z = -.26 + .46 * t + .05 * Math.sin(t * 6 + k) + (k - 2.5) * .028; s ? c.lineTo(px(x), pz(z)) : c.moveTo(px(x), pz(z)); } c.stroke(); }
      c.setLineDash([]); c.beginPath(); c.arc(px(.62), pz(.2), 12, 0, 7); c.stroke(); }
    if (clue === "time") { c.lineWidth = 5; c.beginPath(); c.moveTo(px(-.8), pz(.22)); c.lineTo(px(.8), pz(-.16)); c.stroke(); c.lineWidth = 2; for (let k = -6; k <= 6; k++) { const x = k * .12, z = .03 - .2375 * x; c.beginPath(); c.arc(px(x) + 18, pz(z) - 14, 4, 0, 7); c.fill(); c.beginPath(); c.arc(px(x) - 18, pz(z) + 14, 4, 0, 7); c.fill(); } }
    c.setLineDash([]); c.strokeStyle = "rgba(155,220,240,.55)"; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
  });
}

export function create(H) {
  const L = H.lang === "en" ? 1 : 0, T = (a, b) => (L ? b : a);
  const g = new THREE.Group(); const { std, box, cyl } = H;
  // 場所：木の根もとと道（写実の地）
  const base = box(1.7, .03, .72, std(DS.base, .5)); base.position.y = .015; g.add(base);
  const gr = box(PW, .03, PD, new THREE.MeshStandardMaterial({ map: tex("forest_diff", 2, 1), roughness: .95 })); gr.position.y = .045; g.add(gr);
  // いまの道：曲がった帯
  { const sh = new THREE.Shape(), pts = []; for (let s = 0; s <= 24; s++) { const t = s / 24, x = -.8 + 1.6 * t, z = .2 * Math.cos(t * 3.1) - .02; pts.push([x, z]); }
    sh.moveTo(pts[0][0], pts[0][1] - .05); for (const [x, z] of pts) sh.lineTo(x, z - .05); for (const [x, z] of pts.reverse()) sh.lineTo(x, z + .05);
    const p = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ map: tex("sand_diff", 3, 3), color: 0xc9bca2, roughness: .9, side: THREE.DoubleSide })); p.rotation.x = Math.PI / 2; p.position.y = .062; g.add(p); }
  // 木：幹と根の張り、葉の茂み
  const bark = new THREE.MeshStandardMaterial({ map: tex("bark_diff", 1, 2), color: 0x8a7a68, roughness: .9 });
  const trunk = cyl(.035, .055, .3, bark, 14); trunk.position.set(-.25, .21, -.08); g.add(trunk);
  for (let k = 0; k < 5; k++) { const r = cyl(.008, .016, .14, bark, 6); const a = k / 5 * 6.28; r.rotation.set(Math.PI / 2 - .25, 0, a); r.position.set(-.25 + Math.cos(a) * .06, .07, -.08 + Math.sin(a) * .06); r.lookAt(-.25 + Math.cos(a) * .2, .05, -.08 + Math.sin(a) * .2); g.add(r); }
  const leafM = new THREE.MeshStandardMaterial({ map: tex("leaves_diff", 1, 1), color: 0x6f8e4a, roughness: .85 });
  for (let k = 0; k < 7; k++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(.09 + Math.random() * .05, 1), leafM); s.position.set(-.25 + (Math.random() - .5) * .22, .42 + Math.random() * .08, -.08 + (Math.random() - .5) * .16); g.add(s); }
  // 足もとの花
  const flM = std(0xe7bf2a, .6); for (const [x, z] of [[.3, .12], [.42, .04], [.36, -.1], [.52, -.02]]) { const f = new THREE.Mesh(new THREE.CircleGeometry(.02, 12), flM); f.rotation.x = -Math.PI / 2; f.position.set(x, .068, z); g.add(f); }
  // 湧き水
  const pool = new THREE.Mesh(new THREE.CircleGeometry(.05, 24), new THREE.MeshPhysicalMaterial({ color: 0x4f8fb0, roughness: .08, metalness: .1 })); pool.rotation.x = -Math.PI / 2; pool.position.set(.62, .065, .2); g.add(pool);
  const placeTag = note(T("場所：木の根もとと道（模型）", "Place: a tree and its path (model)"), { w: .44 }); placeTag.position.set(0, .03, .42); g.add(placeTag);

  // 重ねた板
  const stack = []; let cur = { clue: "water", src: "est", how: "light" }, box_ = null;
  const plateY = i => .6 + i * .1;
  function addPlate() {
    if (!ok()) { H.toast(warn()[0]); return; }
    if (stack.length >= MAX) { H.toast(T("一度に見る層は四枚まで。はがしてから重ねてください", "Four layers at a time. Remove one first.")); return; }
    const mat = new THREE.MeshBasicMaterial({ map: pattern(cur.clue, cur.src), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const film = new THREE.MeshBasicMaterial({ color: 0x5cc8e0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const p = new THREE.Group(); const a = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), mat); a.rotation.x = -Math.PI / 2; p.add(a);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), film); f.rotation.x = -Math.PI / 2; f.position.y = -.002; p.add(f);
    const lab = tag(`${CLUE[cur.clue][L]}・${SRC[cur.src][L]}`, { w: .42 }); lab.position.set(-PW / 2 + .2, .05, -PD / 2 - .02); p.add(lab);
    p.position.y = plateY(stack.length) + .15; g.add(p);
    const it = { ...cur, p, mat, film, s: 1, shown: 0, jig: cur.how === "touch" ? 1 : 0, pulse: cur.how === "sound" ? 1 : 0 };
    stack.push(it);
    if (cur.how === "voice") H.say?.([H.S.layerSay[cur.clue]]);
    if (cur.how === "touch") { try { navigator.vibrate?.([30, 40, 30]); } catch {} }
    if (cur.how === "sound") chime();
    render();
  }
  function chime() { const A = H.aud(); const c = A?.ctx; if (!c || A.muted) return; const o = c.createOscillator(), gn = c.createGain(); o.type = "sine"; o.frequency.value = 660; gn.gain.setValueAtTime(0, c.currentTime); gn.gain.linearRampToValueAtTime(.12, c.currentTime + .02); gn.gain.exponentialRampToValueAtTime(.001, c.currentTime + .9); o.connect(gn); gn.connect(A.master); o.start(); o.stop(c.currentTime + 1); }
  function popPlate(all) { const n = all ? stack.length : Math.min(1, stack.length); for (let k = 0; k < n; k++) { const it = stack.pop(); g.remove(it.p); it.mat.map.dispose(); it.mat.dispose(); it.film.dispose(); } render(); }
  const ok = () => !(cur.clue === "time" && cur.src === "meas");
  const warn = () => {
    const w = [];
    if (!ok()) w.push(T("昔の道すじは、いま測れません。資料の記載か、資料にもとづく推定で組みます。", "An old road can't be measured today. Build it from documents, or from estimates based on them."));
    if (cur.src === "art") w.push(T("創作の一枚は、事実の層と印で分けて重ねます。", "A creative layer is stacked with its mark, kept apart from the factual layers."));
    if (cur.clue === "us" && cur.src === "meas") w.push(T("測るには、聞こえない高さまで記録できる録音機が要ります。", "Measuring it takes a recorder that can capture pitches beyond human hearing."));
    return w;
  };
  function render() {
    if (!box_) return; box_.innerHTML = "";
    seg(box_, Object.keys(CLUE).map(k => [k, CLUE[k][L]]), cur.clue, v => { cur.clue = v; render(); }, T("手がかり", "Cue"));
    seg(box_, Object.keys(SRC).map(k => [k, SRC[k][L]]), cur.src, v => { cur.src = v; render(); }, T("出どころ", "Source"));
    seg(box_, Object.keys(HOW).map(k => [k, HOW[k][L]]), cur.how, v => { cur.how = v; render(); }, T("届け方", "Delivery"));
    const add = btn(box_, T("重ねる", "Add layer"), addPlate, true); if (!ok()) add.disabled = true;
    if (stack.length) {
      btn(box_, T("いちばん上をはがす", "Remove top layer"), () => popPlate(false)); btn(box_, T("全部はがす", "Remove all"), () => popPlate(true));
      const top = stack[stack.length - 1];
      seg(box_, [[0, T("なし", "Off")], [.35, T("うすく", "Faint")], [.7, T("半分", "Half")], [1, T("こく", "Full")]], top.s, v => { top.s = v; if (v === 0) H.toast(T("層なし：元の場所の姿です", "Layer off: the place as it is")); }, T("いちばん上の強さ", "Top layer strength"));
    }
  }
  let t = 0;
  return {
    group: g, focus: { y: .45, dist: 1.95, pitch: .38 }, labelY: 1.2,
    enter() {}, exit() {},
    tick(dt, on) {
      t += dt;
      stack.forEach((it, i) => {
        const y = plateY(i); it.p.position.y += (y - it.p.position.y) * Math.min(1, dt * 5);
        it.shown = Math.min(1, it.shown + dt * 2);
        let op = it.s * it.shown; if (it.pulse > 0) { it.pulse = Math.max(0, it.pulse - dt * .5); op *= .7 + .3 * Math.abs(Math.sin(t * 8)) * it.pulse + .3 * (1 - it.pulse); }
        it.mat.opacity = op; it.film.opacity = .07 * op;
        if (it.jig > 0) { it.jig = Math.max(0, it.jig - dt * .8); it.p.position.x = .006 * Math.sin(t * 60) * it.jig; } else it.p.position.x = 0;
        if (it.clue === "water") it.mat.map.offset.x = -((t * .03) % 1);
      });
    },
    ui(b) { box_ = b; render(); },
    read() {
      const w = warn();
      const card = [[T("層の名前", "Layer"), CLUE[cur.clue][L]], [T("重ねるもの", "What it holds"), WHAT[cur.clue][L]], [T("出どころ", "Source"), `${SRC[cur.src][L]}（${SRCN[cur.src][L]}）`], [T("届く感覚", "Reaches you by"), HOW[cur.how][L]], [T("場所", "Place"), T("木の根もとと道（この台）", "The tree and path on this table")], [T("戻る先", "Look again at"), BACKTO[cur.clue][L]]];
      return `<table>${card.map(([k, v]) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`).join("")}</table>
${w.map(x => `<div class="pick">${x}</div>`).join("")}
<div class="note">${T("いま重なっている層", "Layers stacked")}：${stack.length} / ${MAX}${stack.length ? "（" + stack.map(s => `${CLUE[s.clue][L]}・${SRC[s.src][L]}`).join(" ／ ") + "）" : ""}</div>
<div class="note">${T("線の形で出どころを分ける：実線＝測った値・資料の記載／破線＝計算の推定／点線＝問い／一点鎖線＝創作。板の模様は模式。", "Line style shows the source: solid = measured or documented, dashed = estimated, dotted = a question, dash-dot = creative. Patterns are schematic.")}</div>`;
    },
  };
}
