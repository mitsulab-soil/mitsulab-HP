/* 実験台 mark：出どころの印を見分ける（Qualia Lab・2026-10-20）。
   ある場所についての九つの「例の文」に、五つの印（測った値・計算の推定・資料の記載・mitsulab の問い・創作）か「印をつけない」を押す。
   正＝ の出どころの五つの印／環境エージェントの文書 §1.5.2（人の反応は層の中身にしない）。
   文はどれも、印の種類を見せるための例（特定の場所の事実として言っていない）。答えと点数は端末の中だけ（どこにも送らない・残さない）。 */
import * as THREE from "three";
import { seg, btn, tag, note, DS, canvasTex, tex } from "./util.js";

const SEAL = { meas: "#b8432c", est: "#b8432c", doc: "#b8432c", ask: "#b8432c", art: "#b8432c", none: "#5a6470" };

export function create(H) {
  const L = H.lang === "en" ? 1 : 0, T = (a, b) => (L ? b : a), tr = s => (L ? (H.EN[s] || s) : s);
  const MK = H.S.marks, CARDS = H.S.markCards, FB = H.S.markFb;
  const mname = id => { const m = MK.find(x => x.id === id); return m ? (L ? m.en : m.ja) : id; };
  const g = new THREE.Group(); const { std, box, cyl } = H;
  const base = box(1.7, .03, .7, std(DS.base, .5)); base.position.y = .015; g.add(base);
  const wood = new THREE.MeshStandardMaterial({ map: tex("wood_light", 1, 1), color: 0xc9a77a, roughness: .55 });
  const woodD = new THREE.MeshStandardMaterial({ map: tex("wood_dark", 1, 1), color: 0x6a4a32, roughness: .5 });
  const brass = std(0xb8913a, .32, .9);
  // 書見台と紙の札
  const desk = new THREE.Group(); desk.position.set(0, .03, -.12); desk.rotation.x = .55; g.add(desk);
  const board = box(1.0, .02, .5, woodD); board.position.set(0, .2, 0); desk.add(board);
  const cv = document.createElement("canvas"); cv.width = 2048; cv.height = 1024; const cx = cv.getContext("2d"); const ct = new THREE.CanvasTexture(cv); ct.colorSpace = THREE.SRGBColorSpace; ct.anisotropy = 4;
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(.92, .46), new THREE.MeshStandardMaterial({ map: ct, roughness: .9 })); paper.rotation.x = -Math.PI / 2; paper.position.set(0, .212, 0); desk.add(paper);
  const legs = box(.9, .28, .04, woodD); legs.position.set(0, .17, -.3); g.add(legs);
  // 判：六つ
  const stamps = [], pickables = [];
  MK.forEach((m, i) => {
    const s = new THREE.Group(); const x = -.7 + i * .28; s.position.set(x, .03, .26); g.add(s);
    const foot = cyl(.05, .05, .03, std(m.id === "none" ? 0x5a6470 : 0x7a2a1c, .6), 20); foot.position.y = .015; s.add(foot);
    const body = cyl(.03, .045, .1, wood, 16); body.position.y = .08; s.add(body);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 10), brass); knob.position.y = .15; s.add(knob);
    const nm = L ? m.en : m.ja; const lb = tag(nm, { w: Math.min(.3, .03 * [...nm].length + .04), size: 52 }); lb.position.set(0, .23, 0); s.add(lb);
    s.traverse(o => { if (o.isMesh || o.isSprite) { o.userData.mark = m.id; pickables.push(o); } });
    s.userData = { x0: x, id: m.id, anim: 0 }; stamps.push(s);
  });
  const hint = note(T("判を押すか、下の印のボタンで", "Tap a stamp, or use the buttons"), { w: .42 }); hint.position.set(0, .03, .42); g.add(hint);

  let idx = 0, answered = null, right = 0, box_ = null;
  const res = [];
  function wrap(text, maxW) { const out = []; let line = ""; const words = L ? text.split(/(\s+)/) : [...text]; for (const w of words) { const t2 = line + w; if (cx.measureText(t2).width > maxW && line) { out.push(line.trim()); line = w.trimStart(); } else line = t2; } if (line.trim()) out.push(line.trim()); for (let i = 1; i < out.length; i++) while (out[i] && "、。」）".includes(out[i][0])) { out[i - 1] += out[i][0]; out[i] = out[i].slice(1); } return out.filter(Boolean); }
  function drawCard() {
    const c = cx; c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = "#f1e9d6"; c.fillRect(0, 0, 1024, 512);
    for (let k = 0; k < 400; k++) { c.fillStyle = `rgba(120,96,60,${Math.random() * .06})`; c.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2); }
    c.strokeStyle = "rgba(60,40,20,.45)"; c.lineWidth = 3; c.strokeRect(14, 14, 996, 484);
    if (idx >= CARDS.length) { c.fillStyle = "#2a221a"; c.font = `600 54px "Hiragino Mincho ProN","Yu Mincho",serif`; c.textAlign = "center"; c.fillText(T("九つ、すべて見分けました", "All nine sorted"), 512, 230); c.font = `36px "Hiragino Mincho ProN","Yu Mincho",serif`; c.fillText(`${right} / ${CARDS.length}`, 512, 300); c.textAlign = "left"; ct.needsUpdate = true; return; }
    c.fillStyle = "#6a5a44"; c.font = `30px "Hiragino Sans",sans-serif`; c.fillText(T(`例の文 ${idx + 1} / ${CARDS.length}`, `Example ${idx + 1} of ${CARDS.length}`), 48, 72);
    c.fillStyle = "#2a221a"; c.font = `600 ${L ? 44 : 48}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
    c.strokeStyle = "#2a221a"; c.lineWidth = 1.6; wrap(tr(CARDS[idx].text), 900).forEach((ln, i) => { c.fillText(ln, 56, 160 + i * 66); c.strokeText(ln, 56, 160 + i * 66); });
    if (answered) {   // 押した印（朱の判）
      const col = SEAL[answered.pick]; c.save(); c.translate(820, 400); c.rotate(-.08); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 6; c.globalAlpha = .85;
      const nm = mname(answered.pick); c.font = `600 ${L ? 26 : 30}px "Hiragino Mincho ProN","Yu Mincho",serif`; const w = Math.max(150, c.measureText(nm).width + 40);
      c.strokeRect(-w / 2, -40, w, 80); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(nm, 0, 2); c.restore();
      c.fillStyle = answered.ok ? "#2f6a4a" : "#8a3a2a"; c.font = `32px "Hiragino Sans",sans-serif`; c.fillText(answered.ok ? T("○ そのとおり", "✓ Correct") : T(`答え：${mname(CARDS[idx].ans)}`, `Answer: ${mname(CARDS[idx].ans)}`), 56, 440);
    }
    ct.needsUpdate = true;
  }
  function choose(id) {
    if (idx >= CARDS.length || answered) return;
    const c = CARDS[idx], ok = id === c.ans; answered = { pick: id, ok }; if (ok) right++; res.push(ok);
    const s = stamps.find(x => x.userData.id === id); if (s) s.userData.anim = 1;
    drawCard(); render();
    H.say?.([ok ? FB.ok : FB[c.ans], c.why]);
  }
  function next() { if (idx < CARDS.length) idx++; answered = null; drawCard(); render(); if (idx >= CARDS.length) H.say?.([FB.done]); }
  function again() { idx = 0; answered = null; right = 0; res.length = 0; drawCard(); render(); }
  function render() {
    if (!box_) return; box_.innerHTML = "";
    if (idx >= CARDS.length) { btn(box_, T("はじめから", "Start again"), again, true); return; }
    { const q = document.createElement("p"); q.className = "markQ"; q.innerHTML = `<span>${T(`例の文 ${idx + 1} / ${CARDS.length}`, `Example ${idx + 1} of ${CARDS.length}`)}</span>${tr(CARDS[idx].text)}${answered ? `<b>${answered.ok ? T("そのとおり", "Correct") : T("答え", "Answer")}：${mname(CARDS[idx].ans)}</b>` : ""}`; box_.appendChild(q); }
    if (!answered) { const d = document.createElement("div"); d.className = "seg"; d.setAttribute("role", "group"); d.setAttribute("aria-label", T("印", "Marks")); MK.forEach(m => { const b = document.createElement("button"); b.textContent = L ? m.en : m.ja; b.setAttribute("aria-pressed", "false"); b.onclick = () => choose(m.id); d.appendChild(b); }); box_.appendChild(d); }
    else btn(box_, idx === CARDS.length - 1 ? T("おわりへ", "Finish") : T("次の文へ", "Next sentence"), next, true);
  }
  drawCard();
  return {
    group: g, focus: { y: .26, dist: 1.6, pitch: .55 }, labelY: 1.0, pickables,
    pick(h) { const id = h.object.userData.mark; if (id) choose(id); },
    enter() { drawCard(); }, exit() {},
    tick(dt) { for (const s of stamps) { const a = s.userData.anim; if (a > 0) { s.userData.anim = Math.max(0, a - dt * 1.6); const k = Math.sin(Math.min(1, (1 - s.userData.anim)) * Math.PI); s.position.y = .03 + .08 * k; } } },
    ui(b) { box_ = b; render(); },
    read() {
      const c = CARDS[Math.min(idx, CARDS.length - 1)];
      const done = idx >= CARDS.length;
      return `${done ? `<div class="pick">${T("見分けた数", "Sorted")}：${right} / ${CARDS.length}</div>` : ""}
${answered ? `<div><b>${answered.ok ? T("そのとおり", "Correct") : T("答え", "Answer")}：${mname(c.ans)}</b>　${tr(c.why)}</div>` : ""}
<div class="note">${T("五つの印：測った値／計算の推定／資料の記載／mitsulab の問い／創作。人がどう感じたかは、どの印もつけず、層の中身にしない。", "Five marks: Measured / Estimated / Documented / A mitsulab question / Creative. How people felt gets no mark and never becomes a layer's content.")}</div>
<div class="note">${T("文はどれも、印の種類を見せるための例。答えはこの端末の中だけで、どこにも送らない。", "Each sentence is an example made to show a kind of mark. Your answers stay on this device and are never sent anywhere.")}</div>`;
    },
  };
}
