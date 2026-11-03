/* © mitsulab. 五感＋X 感をえらぶ（2026-11-03 本人「色の層はやめる。五感＋X 感を選択できるインターフェイスを、自然に操作できてかつ理解できるデザインに」
   「碧以外の依代は、元から碧の隣にいるのではなく、X 感で生き物の視点として表示」）。大宮・川越・渋谷で共通（共通部品 _共通3D/kit/senses6.js）。o.can(id)＝その町で出せる生き物だけ輪に並べる。
   ・画面の下に 6 つ：見る・聴く・触れる・嗅ぐ・味わう・X 感。押すと、その感覚の印だけが風景に残る（もう一度押すと全部に戻る）。
   ・X 感を押すと依代の輪（yoring.js）がひらき、回して手前の一体を押すと、その感覚を持つ生き物の目へ入る（kit/henshin.js）。下の 5 つの点が、いまどの生き物かを示す。
   ・二段の選択・隠れた操作はない。説明は碧の字幕だけ。軽さ：DOM の 6 つのボタンだけ（3D の効果は足さない）。 */
import { makeYoRing } from "./yoring.js?v=5";
let VO6 = null; fetch(new URL("./senses6_voice.json?v=1", import.meta.url)).then(r => r.json()).then(j => VO6 = j).catch(() => { });
const SENSES = [
  { k: "sight", n: "見る", d: '<path d="M3 12c2.4-3.9 5.5-5.9 9-5.9s6.6 2 9 5.9c-2.4 3.9-5.5 5.9-9 5.9S5.4 15.9 3 12z"/><circle cx="12" cy="12" r="2.7"/><circle cx="13.1" cy="10.9" r=".55" class="f"/>', say: "見えるものに、しぼります。" },
  { k: "sound", n: "聴く", d: '<circle cx="6.6" cy="12" r="1.25" class="f"/><path d="M10.4 8.7a4.7 4.7 0 0 1 0 6.6M13.6 6.2a8.2 8.2 0 0 1 0 11.6"/><path d="M16.8 3.9a11.6 11.6 0 0 1 0 16.2" opacity=".55"/>', say: "耳をすませる印だけ、残します。" },
  { k: "touch", n: "触れる", d: '<path d="M5.6 16.4V11a6.4 6.4 0 0 1 12.8 0v5.4" opacity=".55"/><path d="M8.3 19.6V11a3.7 3.7 0 0 1 7.4 0v8.6"/><path d="M11 18.4v-7.2a1 1 0 0 1 2 0v7.2"/>', say: "手で確かめられるものに、しぼります。" },
  { k: "smell", n: "嗅ぐ", d: '<path d="M7.6 20c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4M12 19.4c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4-1.6-3.3 0-4.9M16.4 20c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4"/>', say: "匂いの手がかりだけ、残します。" },
  { k: "taste", n: "味わう", d: '<path d="M4.2 11.6h15.6a7.8 7 0 0 1-15.6 0z"/><path d="M9.6 19.6h4.8"/><path d="M10.2 8.4c-.9-1 .9-1.9 0-3M13.8 8.4c-.9-1 .9-1.9 0-3" opacity=".6"/>', say: "この土地の食べ物の記録に、しぼります。" },
  { k: "x", n: "X 感", d: '<path d="M11.4 3.8c.6 4.3 3.6 7.4 8 8-4.4.6-7.4 3.7-8 8-.6-4.3-3.6-7.4-8-8 4.4-.6 7.4-3.7 8-8z"/><circle cx="18.6" cy="5.4" r="1"/>' },   /* 閉じる印に見えないよう、ひらく光の形 */
];
// X 感の生き物（その感覚を持つもの）。n＝名前だけ（ボタンと輪で同じ型。11-03 P2「〜の夜」「〜の目」の混在をなくした）、s＝何が変わるかの短い言い方
const XS = [
  { id: "suzume", n: "スズメ", s: "人に見えない光（紫外）も見る" },
  { id: "hachi", n: "ミツバチ", s: "人に見えない光（紫外）・青・緑で見る" },
  { id: "tanuki", n: "タヌキ", s: "二色の目で、夜を歩く" },
  { id: "ishi", n: "石", s: "この場所の時間をさかのぼる" },
  { id: "ki", n: "木", s: "水と光の循環" },
];
export function mountSenses(QW, o = {}) {
  const H = QW.henshin, xs = XS.filter(x => H?.profiles?.[x.id] && (!o.can || o.can(x.id)));
  const css = document.createElement("style"); css.id = "qualium-senses6";
  css.textContent = `#qSense{display:none!important}
#qS6{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(max(12px,env(safe-area-inset-bottom)) + 6px);z-index:7;display:flex;gap:2px;padding:4px;border-radius:30px;
 background:rgba(8,13,22,.42);-webkit-backdrop-filter:blur(10px) saturate(1.1);backdrop-filter:blur(10px) saturate(1.1);border:1px solid rgba(225,235,242,.14);box-shadow:0 6px 24px rgba(0,0,0,.25);
 font-family:var(--mincho,"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho",serif);transition:opacity .4s}
body:not([data-mode="walk"]) #qS6{opacity:0;pointer-events:none}
#qS6 button{all:unset;box-sizing:border-box;position:relative;width:56px;min-height:52px;padding:6px 0 5px;border-radius:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;
 color:rgba(232,239,244,.78);-webkit-tap-highlight-color:transparent;transition:background .35s,color .35s}
#qS6 button svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;overflow:visible;transition:transform .35s}#qS6 button svg .f{fill:currentColor;stroke:none}   /* 11-03 本人「アイコンをもっと美しく」：同じ 24 の格子・線 1.2・丸い端で 6 つを描き直した一品もの */
#qS6 button:active svg{transform:scale(.92)}
#qS6 button span{font-size:10.5px;letter-spacing:.08em;line-height:1;white-space:nowrap}
#qS6 button:hover{color:#fff}#qS6 button:focus-visible{outline:1px solid rgba(255,255,255,.7);outline-offset:-2px}
#qS6 button[aria-pressed="true"]{color:#0b1119;background:radial-gradient(120% 100% at 50% 20%,#fbfcfd,color-mix(in oklab,var(--c) 38%,#eef3f5));box-shadow:inset 0 0 0 1px rgba(255,255,255,.75),0 0 14px color-mix(in oklab,var(--c) 45%,transparent)}
#qS6 button[aria-pressed="true"] svg{stroke-width:1.35}
#qS6 button.x{width:64px;min-width:64px;max-width:64px;flex:0 0 64px;overflow:hidden}#qS6 .dots{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);display:flex;gap:3px;opacity:0;transition:opacity .3s}
#qS6 button.x[aria-pressed="true"] .dots{opacity:1}#qS6 .dots i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.3}#qS6 .dots i.on{opacity:1}
@media (max-width:400px){#qS6 button{width:52px}#qS6 button.x{width:62px;min-width:62px;max-width:62px;flex-basis:62px}}
body.hen #sndTag,body.qRingOpen #sndTag{visibility:hidden!important}
@media (prefers-reduced-motion:reduce){#qS6,#qS6 button{transition:none}}`;
  document.head.appendChild(css);
  const col = k => (k === "x" ? "#c7b8f0" : (QW.QAC?.[k] || "#cfe3ea"));
  const bar = document.createElement("nav"); bar.id = "qS6"; bar.setAttribute("aria-label", "感覚をえらぶ");
  bar.innerHTML = SENSES.map(s => `<button type="button" data-k="${s.k}" class="${s.k === "x" ? "x" : ""}" aria-pressed="false" style="--c:${col(s.k)}"><svg viewBox="0 0 24 24" aria-hidden="true">${s.d}</svg><span>${s.n}</span>${s.k === "x" ? `<b class="dots">${xs.map(() => "<i></i>").join("")}</b>` : ""}</button>`).join("");
  document.body.appendChild(bar);
  const B = {}; for (const b of bar.querySelectorAll("button")) B[b.dataset.k] = b;
  const xLabel = B.x.querySelector("span"), dots = [...B.x.querySelectorAll(".dots i")];
  const st = { k: null, xi: -1 };
  const RING = makeYoRing(xs, i => { st.t = performance.now(); st.xi = i; st.k = "x"; setFilter(null); paint(); B.x.setAttribute("aria-expanded", "false"); H.go(xs[i].id); });
  const kindOf = L => (QW.QAK?.(L) || "x").split(".")[0];
  const near = k => { const cp = QW.camera.position; let n = 0; for (const L of QW.LAYER?.objs || []) if (L.root?.visible && kindOf(L) === k && Math.hypot(L.o.x - cp.x, L.o.z - cp.z) < 40) n++; return n; };
  function paint() { for (const s of SENSES) B[s.k].setAttribute("aria-pressed", String(st.k === s.k));
    if (st.k === "x" && xs[st.xi]) { xLabel.textContent = xs[st.xi].n; dots.forEach((d, i) => d.classList.toggle("on", i === st.xi)); B.x.setAttribute("aria-label", `X 感：${xs[st.xi].n}の受けとり方（${xs[st.xi].s}）。押すと依代の輪をひらく`); }
    else { xLabel.textContent = "X 感"; B.x.setAttribute("aria-label", "X 感：ほかの生き物の受けとり方へ"); } }
  function setFilter(k) { globalThis.__qsF = k && k !== "x" ? (L => kindOf(L) === k) : null; }
  function pick(k) {
    navigator.vibrate?.(8); st.t = performance.now();
    if (k === "x") { if (!xs.length) return; if (RING.open) { RING.hide(); B.x.setAttribute("aria-expanded", "false"); return; } RING.show(Math.max(0, st.xi)); B.x.setAttribute("aria-expanded", "true"); return; }   // 11-03 本人「依代を円に並べ、回して選ぶ」：X 感＝依代の輪をひらく
    RING.hide(); B.x.setAttribute("aria-expanded", "false");
    const was = st.k; if (was === "x") H.go("hito");
    st.k = was === k ? null : k; setFilter(st.k); paint();
    const vo = id => VO6?.[id]?.[0] || null;   /* 11-03 碧の一言に声（_dev/build_voice_senses.py・読みは確かめ済み） */
    if (st.k) { const s = SENSES.find(x => x.k === k), n = near(k); QW.speak?.([vo(k) || { t: s.say }, ...(n ? [] : [vo("none") || { t: "この近くにはまだありません。歩くと、見つかります。" }])]); }
    else QW.speak?.([vo("all") || { t: "すべての感覚に、もどします。" }]);
    for (const ms of [30, 200, 600, 1200, 2400, 3600, 5200]) setTimeout(() => { const g = document.getElementById("capTag"); if (g) g.hidden = true; }, ms);   // 前の話の出典の札を残さない
  }
  bar.addEventListener("click", e => { const b = e.target.closest("button"); if (b) pick(b.dataset.k); });
  // 「碧へ戻る」や碧に触れて人の目へ戻ったら、X 感のしるしも外す
  setInterval(() => { if (st.k === "x" && H.state.target === 0 && performance.now() - (st.t || 0) > 3000) { st.k = null; paint(); } }, 400);
  paint();
  return { pick, state: st };
}
