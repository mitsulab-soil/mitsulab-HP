/* © mitsulab. 五感＋X 感をえらぶ（2026-11-03 本人「色の層はやめる。五感＋X 感を選択できるインターフェイスを、自然に操作できてかつ理解できるデザインに」
   「碧以外の依代は、元から碧の隣にいるのではなく、X 感で生き物の視点として表示」）。大宮・川越・渋谷で共通（共通部品 _共通3D/kit/senses6.js）。o.can(id)＝その町で出せる生き物だけ輪に並べる。
   ・画面の下に 6 つ：見る・聴く・触れる・嗅ぐ・味わう・X 感。押すと、その感覚の印だけが風景に残る（もう一度押すと全部に戻る）。
   ・X 感を押すと依代の輪（yoring.js）がひらき、回して手前の一体を押すと、その感覚を持つ生き物の目へ入る（kit/henshin.js）。下の 5 つの点が、いまどの生き物かを示す。
   ・二段の選択・隠れた操作はない。説明は碧の字幕だけ。軽さ：DOM の 6 つのボタンだけ（3D の効果は足さない）。 */
import { makeYoRing } from "./yoring.js?v=4";
let VO6 = null; fetch(new URL("./senses6_voice.json?v=1", import.meta.url)).then(r => r.json()).then(j => VO6 = j).catch(() => { });
const SENSES = [
  { k: "sight", n: "見る", d: '<circle cx="12" cy="12" r="3.2"/><path d="M2.5 12c2.6-4.4 5.8-6.6 9.5-6.6s6.9 2.2 9.5 6.6c-2.6 4.4-5.8 6.6-9.5 6.6S5.1 16.4 2.5 12z"/>', say: "見えるものに、しぼります。" },
  { k: "sound", n: "聴く", d: '<path d="M6 9.5v5M10 6.5v11M14 8.5v7M18 10.5v3"/>', say: "耳をすませる印だけ、残します。" },
  { k: "touch", n: "触れる", d: '<path d="M8.5 13V5.8a1.6 1.6 0 0 1 3.2 0V11m0-1.2a1.6 1.6 0 0 1 3.2 0V11m0-.4a1.6 1.6 0 0 1 3.2 0v4.2c0 3.4-2.4 5.9-5.8 5.9-2.6 0-4-1.2-5.4-3.4L4.6 14a1.5 1.5 0 0 1 2.4-1.8l1.5 1.8"/>', say: "手で確かめられるものに、しぼります。" },
  { k: "smell", n: "嗅ぐ", d: '<path d="M7 19c-1.6-2.2.9-3.6-.6-6S8 9 7 6.5M12 19c-1.6-2.2.9-3.6-.6-6S13 9 12 6.5M17 19c-1.6-2.2.9-3.6-.6-6S18 9 17 6.5"/>', say: "匂いの手がかりだけ、残します。" },
  { k: "taste", n: "味わう", d: '<path d="M5.5 10.5h13c0 4.2-2.9 7.5-6.5 7.5s-6.5-3.3-6.5-7.5zM9 6.5c0-1 .8-1.4.8-2.4M12.5 6.5c0-1 .8-1.4.8-2.4"/>', say: "この土地の食べ物の記録に、しぼります。" },
  { k: "x", n: "X 感", d: '<path d="M12 3.5c.7 4.6 3.9 7.8 8.5 8.5-4.6.7-7.8 3.9-8.5 8.5-.7-4.6-3.9-7.8-8.5-8.5 4.6-.7 7.8-3.9 8.5-8.5z"/>' },   /* 閉じる印に見えないよう、ひらく光の形 */
];
// X 感の生き物（その感覚を持つもの）。順に切りかわる。名前は画面に出す短い言い方
const XS = [
  { id: "suzume", n: "スズメの目", s: "紫外" },
  { id: "hachi", n: "ミツバチの目", s: "速い時間" },
  { id: "tanuki", n: "タヌキの夜", s: "二色の目" },
  { id: "ishi", n: "石の時間", s: "さかのぼる" },
  { id: "ki", n: "木の循環", s: "水と光" },
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
#qS6 button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}
#qS6 button span{font-size:10.5px;letter-spacing:.08em;line-height:1;white-space:nowrap}
#qS6 button:hover{color:#fff}#qS6 button:focus-visible{outline:1px solid rgba(255,255,255,.7);outline-offset:-2px}
#qS6 button[aria-pressed="true"]{color:#0b1119;background:color-mix(in oklab,var(--c) 42%,#f4f7f9)}
#qS6 button.x{width:64px}#qS6 .dots{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);display:flex;gap:3px;opacity:0;transition:opacity .3s}
#qS6 button.x[aria-pressed="true"] .dots{opacity:1}#qS6 .dots i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.3}#qS6 .dots i.on{opacity:1}
#qS6 button.x[aria-pressed="true"] span{font-size:9.5px;letter-spacing:.02em}
@media (max-width:400px){#qS6 button{width:52px}#qS6 button.x{width:62px}}
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
    if (st.k === "x" && xs[st.xi]) { xLabel.textContent = xs[st.xi].n; dots.forEach((d, i) => d.classList.toggle("on", i === st.xi)); B.x.setAttribute("aria-label", `X 感：${xs[st.xi].n}（${xs[st.xi].s}）。押すと依代の輪をひらく`); }
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
