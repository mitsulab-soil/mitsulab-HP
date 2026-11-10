/* © mitsulab. 五感をえらぶ＋生き物の目（2026-11-04 本人：環世界に入るのはリアルな生き物だけ・X 感と呼ばない・輪で選ぶ二段の操作はやめる→右の 4 つを押すと、すぐその生き物の目で歩く。もう一度押すと人の目へ）。旧：五感＋X 感をえらぶ（2026-11-03 本人「色の層はやめる。五感＋X 感を選択できるインターフェイスを、自然に操作できてかつ理解できるデザインに」
   「碧以外の依代は、元から碧の隣にいるのではなく、X 感で生き物の視点として表示」）。大宮・川越・渋谷で共通（共通部品 _共通3D/kit/senses6.js）。o.can(id)＝その町で出せる生き物だけ輪に並べる。
   ・画面の下に 6 つ：見る・聴く・触れる・嗅ぐ・味わう・X 感。押すと、その感覚の印だけが風景に残る（もう一度押すと全部に戻る）。
   ・X 感を押すと依代の輪（yoring.js）がひらき、回して手前の一体を押すと、その感覚を持つ生き物の目へ入る（kit/henshin.js）。下の 5 つの点が、いまどの生き物かを示す。
   ・二段の選択・隠れた操作はない。説明は碧の字幕だけ。軽さ：DOM の 6 つのボタンだけ（3D の効果は足さない）。 */
let VO6 = null; fetch(new URL("./senses6_voice.json?v=2", import.meta.url)).then(r => r.json()).then(j => VO6 = j).catch(() => { });
const SENSES = [
  { k: "sight", n: "見る", d: '<path d="M3 12c2.4-3.9 5.5-5.9 9-5.9s6.6 2 9 5.9c-2.4 3.9-5.5 5.9-9 5.9S5.4 15.9 3 12z"/><circle cx="12" cy="12" r="2.7"/><circle cx="13.1" cy="10.9" r=".55" class="f"/>', say: "目で見えるものの印だけ、残るよ。" },
  { k: "sound", n: "聴く", d: '<circle cx="6.6" cy="12" r="1.25" class="f"/><path d="M10.4 8.7a4.7 4.7 0 0 1 0 6.6M13.6 6.2a8.2 8.2 0 0 1 0 11.6"/><path d="M16.8 3.9a11.6 11.6 0 0 1 0 16.2" opacity=".55"/>', say: "耳で聴けるものの印だけ、残るよ。" },
  { k: "touch", n: "触れる", d: '<path d="M5.6 16.4V11a6.4 6.4 0 0 1 12.8 0v5.4" opacity=".55"/><path d="M8.3 19.6V11a3.7 3.7 0 0 1 7.4 0v8.6"/><path d="M11 18.4v-7.2a1 1 0 0 1 2 0v7.2"/>', say: "さわれるものの印だけ、残るよ。" },
  { k: "smell", n: "嗅ぐ", d: '<path d="M7.6 20c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4M12 19.4c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4-1.6-3.3 0-4.9M16.4 20c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4"/>', say: "においの印だけ、残るよ。" },
  { k: "taste", n: "味わう", d: '<path d="M4.2 11.6h15.6a7.8 7 0 0 1-15.6 0z"/><path d="M9.6 19.6h4.8"/><path d="M10.2 8.4c-.9-1 .9-1.9 0-3M13.8 8.4c-.9-1 .9-1.9 0-3" opacity=".6"/>', say: "この町の食べ物の話の印だけ、残るよ。" },
];
// X 感の生き物（その感覚を持つもの）。n＝名前だけ（ボタンと輪で同じ型。11-03 P2「〜の夜」「〜の目」の混在をなくした）、s＝何が変わるかの短い言い方
const XS = [
  { id: "hachi", n: "ミツバチ", d: '<ellipse cx="12" cy="13" rx="4" ry="5.6"/><path d="M8.3 11.5h7.4M8.1 14.5h7.8"/><path d="M8.6 9.4C5 6.4 3.4 8.4 4.6 10.6s3.7.9 4.4-.4M15.4 9.4c3.6-3 5.2-1 4 1.2s-3.7.9-4.4-.4"/>' },
  { id: "chou", n: "ナミアゲハ", d: '<path d="M12 6v13"/><path d="M11.4 9C8 4.2 3.6 4.8 4 8.6c.3 2.6 3.4 3.6 7.4 3.4M12.6 9C16 4.2 20.4 4.8 20 8.6c-.3 2.6-3.4 3.6-7.4 3.4M11.4 12.6c-3 .6-5 2.6-4 4.6s3.4.4 4-2.4M12.6 12.6c3 .6 5 2.6 4 4.6s-3.4.4-4-2.4"/>' },
  { id: "tori", n: "小鳥", d: '<path d="M4 14.6c2.6.4 4.6-.4 6-2.4 1.2-1.8 2.6-3.6 5-3.6 2 0 3.2 1.4 3.6 2.6l2 .6-2 .8c-.4 3.4-3.6 5.8-7.6 5.6-3-.2-5.6-1.6-7-3.6z"/><circle cx="16.2" cy="10.8" r=".6" class="f"/><path d="M11 17.2l-1 2.6M13.4 17.4l.2 2.4"/>' },
  { id: "inu", n: "イヌ", d: '<path d="M5 18v-5.6c0-1.4 1-2.4 2.4-2.4h7.2l2-3.2 1.2.4.8 2.2 1.8 1.2-.6 1.6h-2.2v5.8M8 18v-4.2M14.6 18v-4"/><circle cx="17.4" cy="9.4" r=".5" class="f"/><path d="M5 12.6L3.4 10"/>' },
];
export function mountSenses(QW, o = {}) {
  const H = QW.ikimono, xs = XS.filter(x => H?.list?.[x.id] && (!o.can || o.can(x.id)));
  const css = document.createElement("style"); css.id = "qualium-senses6";
  css.textContent = `#qSense{display:none!important}
#qS6{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(max(12px,env(safe-area-inset-bottom)) + 6px);z-index:7;display:flex;gap:2px;padding:4px;border-radius:30px;
 background:rgba(8,13,22,.62);-webkit-backdrop-filter:blur(10px) saturate(1.1);backdrop-filter:blur(10px) saturate(1.1);border:1px solid rgba(225,235,242,.14);box-shadow:0 6px 24px rgba(0,0,0,.25);
 font-family:var(--mincho,"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho",serif);transition:opacity .4s}
body:not([data-mode="walk"]) #qS6{opacity:0;pointer-events:none}
#qS6 button{all:unset;box-sizing:border-box;position:relative;width:56px;min-height:52px;padding:6px 0 5px;border-radius:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;
 color:rgba(244,248,250,.96);-webkit-tap-highlight-color:transparent;transition:background .35s,color .35s}
#qS6 button svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;overflow:visible;transition:transform .35s}#qS6 button svg .f{fill:currentColor;stroke:none}   /* 11-03 本人「アイコンをもっと美しく」：同じ 24 の格子・線 1.2・丸い端で 6 つを描き直した一品もの */
#qS6 button:active svg{transform:scale(.92)}
#qS6 button span{font-size:12.5px;letter-spacing:.06em;line-height:1;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,.7)}
#qS6 button:hover{color:#fff}#qS6 button:focus-visible{outline:1px solid rgba(255,255,255,.7);outline-offset:-2px}
#qS6 button[aria-pressed="true"]{color:#0b1119;background:radial-gradient(120% 100% at 50% 20%,#fbfcfd,color-mix(in oklab,var(--c) 38%,#eef3f5));box-shadow:inset 0 0 0 1px rgba(255,255,255,.75),0 0 14px color-mix(in oklab,var(--c) 45%,transparent)}
#qS6 button[aria-pressed="true"] svg{stroke-width:1.35}
#qS6 button.x{width:64px;min-width:64px;max-width:64px;flex:0 0 64px;overflow:hidden}#qS6 .dots{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);display:flex;gap:3px;opacity:0;transition:opacity .3s}
#qS6 button.x[aria-pressed="true"] .dots{opacity:1}#qS6 .dots i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.3}#qS6 .dots i.on{opacity:1}
@media (max-width:400px){#qS6 button{width:52px}#qS6 button.x{width:62px;min-width:62px;max-width:62px;flex-basis:62px}}
body.hen #sndTag,body.qRingOpen #sndTag{visibility:hidden!important}
@media (prefers-reduced-motion:reduce){#qS6,#qS6 button{transition:none}}`;
  document.head.appendChild(css);
  css.textContent += `@media (max-width:400px){#qS6{bottom:calc(max(12px,env(safe-area-inset-bottom)) + 58px)}}
#qIK{position:fixed;right:max(12px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);z-index:7;display:flex;flex-direction:column;gap:6px;transition:opacity .4s}
@media (max-width:640px){#qIK{top:calc(max(12px,env(safe-area-inset-top)) + 84px);transform:none}}   /* 11-05 375 で碧の顔と肩に重なっていた→見出しのすぐ下へ */
body:not([data-mode="walk"]) #qIK{opacity:0;pointer-events:none}
#qIK button{all:unset;box-sizing:border-box;width:52px;min-height:52px;border-radius:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;color:rgba(236,242,246,.86);background:rgba(8,13,22,.36);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(225,235,242,.18);-webkit-tap-highlight-color:transparent;transition:background .3s,color .3s;font-family:var(--mincho,"Shippori Mincho",serif)}
#qIK{align-items:flex-end}#qIK button.long{width:auto;padding:0 8px}#qIK button.long span{max-width:none}
#qIK button svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}#qIK button svg .f{fill:currentColor;stroke:none}
#qIK button span{font-size:11.5px;letter-spacing:.02em;line-height:1.15;white-space:nowrap;text-align:center;max-width:58px;text-shadow:0 1px 3px rgba(0,0,0,.7)}
#qIKsrc{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(max(12px,env(safe-area-inset-bottom)) + 74px);z-index:7;max-width:min(300px,62vw);font-size:11.5px;line-height:1.5;color:#eef3f6;text-align:right;text-shadow:0 1px 3px rgba(0,0,0,.85),0 0 8px rgba(0,0,0,.5);pointer-events:none;transition:opacity .4s}
#qIKsrc[hidden]{display:block;opacity:0}
@media (max-width:640px){html body #qIK{transform-origin:0 100%!important;flex-direction:column!important;align-items:flex-start!important;left:max(12px,env(safe-area-inset-left))!important;right:auto!important;top:auto!important;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 150px)!important;gap:6px!important}html body #qIK button span{font-size:13px!important}html body #caption#caption{padding-left:70px!important;box-sizing:border-box!important}body:not([data-mode="walk"]) #caption#caption{padding-left:0!important}}   /* 11-11 第5 採点「札が建物にかかる」：スマホの札は文字つきのまま、左下の路面の上（下の五つの札のすぐ上）に縦に・字を一段大きく・字幕は札の列の右から始める（札と字幕を重ねない） */
@media (max-width:640px){html body #capText{text-shadow:0 0 2px #000,0 0 5px rgba(0,0,0,.95),0 0 12px rgba(0,0,0,.8),0 0 22px rgba(0,0,0,.55)!important}}   /* 11-11 第4 採点「札が建物に重なる」「字幕が碧の白い服に重なり読みにくい」→ 字幕は濃い縁の影（灰の地は付けない） */
body:not(.q4used)[data-mode="walk"] #qS6 button:nth-child(2){outline:2px solid rgba(255,207,134,.9);outline-offset:-2px}   /* 11-11 採点「聴くの金の輪が薄い」：光る誘いの合間も輪を残す */
@media (max-width:640px){#qIK{flex-direction:row;align-items:flex-start;gap:5px;top:calc(max(12px,env(safe-area-inset-top)) + 60px);right:max(22px,env(safe-area-inset-right))}#qIK{padding:8px 6px;margin:-8px -6px;border-radius:32px;background:radial-gradient(closest-side,rgba(3,7,12,.42),rgba(3,7,12,.22) 70%,rgba(3,7,12,0))}#qIK button{width:48px;min-height:48px;border-radius:24px;background:rgba(8,13,22,.55);box-shadow:0 2px 10px rgba(0,0,0,.35)}#qIK button span{text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 6px rgba(0,0,0,.6)}#qIK button.long{padding:0 7px}#qIK button span{font-size:10.5px}}   /* 11-11 採点「スマホの札の列の上端が右上の鬼瓦にかかる」→ 縦の列をやめ、見出しのすぐ下の空の帯に横一列で（48px で押しやすさは保つ） */
@media (max-width:400px){#qIKsrc{bottom:calc(max(12px,env(safe-area-inset-bottom)) + 128px)}}
#qIK button[aria-pressed="true"]{color:#0b1119;background:radial-gradient(120% 100% at 50% 20%,#fbfcfd,#d8e6ec);box-shadow:0 0 14px rgba(200,225,235,.45)}`;
  const col = k => (QW.QAC?.[k] || "#cfe3ea");
  const bar = document.createElement("nav"); bar.id = "qS6"; bar.setAttribute("aria-label", "感覚をえらぶ");
  bar.innerHTML = SENSES.map(s => `<button type="button" data-k="${s.k}" aria-pressed="false" style="--c:${col(s.k)}"><svg viewBox="0 0 24 24" aria-hidden="true">${s.d}</svg><span>${s.n}</span></button>`).join("");
  document.body.appendChild(bar);
  const ik = document.createElement("nav"); ik.id = "qIK"; ik.setAttribute("aria-label", "生き物の目で歩く");
  ik.innerHTML = xs.map(x => `<button type="button" data-id="${x.id}" aria-pressed="false" class="${x.n.length > 4 ? "long" : ""}" aria-label="${x.n}の目で歩く（もう一度押すと人の目へ）"><svg viewBox="0 0 24 24" aria-hidden="true">${x.d}</svg><span>${x.n}</span></button>`).join("");   /* 11-04：長い名（アゲハチョウ科）は 2 行に＝丸の幅に収める */
  document.body.appendChild(ik);
  const B = {}; for (const b of bar.querySelectorAll("button")) B[b.dataset.k] = b;
  const st = { k: null, id: null };
  const kindOf = L => (QW.QAK?.(L) || "x").split(".")[0];
  const near = k => { const cp = QW.camera.position; let n = 0; for (const L of QW.LAYER?.objs || []) if (L.root?.visible && kindOf(L) === k && Math.hypot(L.o.x - cp.x, L.o.z - cp.z) < 40) n++; return n; };
  function paint() { for (const s of SENSES) B[s.k].setAttribute("aria-pressed", String(st.k === s.k)); for (const b of ik.querySelectorAll("button")) b.setAttribute("aria-pressed", String(st.id === b.dataset.id)); }
  function setFilter(k) { globalThis.__qsF = k ? (L => kindOf(L) === k) : null; }
  function pick(k) {
    navigator.vibrate?.(8);
    st.k = st.k === k ? null : k; setFilter(st.k); paint();
    const vo = id => VO6?.[id]?.[0] || null;
    if (st.k) { const s = SENSES.find(x => x.k === k), n = near(k); QW.speak?.([vo(k) || { t: s.say }, ...(n ? [] : [vo("none") || { t: "この近くには、まだないよ。歩くと見つかるよ。" }])]); }
    else QW.speak?.([vo("all") || { t: "ぜんぶの感覚に、もどすよ。" }]);
    for (const ms of [30, 200, 600, 1200, 2400, 3600, 5200]) setTimeout(() => { const g = document.getElementById("capTag"); if (g) g.hidden = true; }, ms);
  }
  const src = document.createElement("div"); src.id = "qIKsrc"; src.hidden = true; src.setAttribute("aria-live", "polite"); document.body.appendChild(src);
  function showSrc(id) { const c = id && H.list?.[id]?.sources?.[0]; src.textContent = c ? `模式・出典：${c.cite}` : ""; src.hidden = !c; }   // 2026-11-10 第8周：生き物を選んだら出典を一行
  async function pickIk(id) { navigator.vibrate?.(8); const r = await H.go(id); st.id = r; paint(); showSrc(r); if (!r) QW.speak?.([{ t: "人の目に、もどります。" }]); }
  bar.addEventListener("click", e => { const b = e.target.closest("button"); if (b) pick(b.dataset.k); });
  ik.addEventListener("click", e => { const b = e.target.closest("button"); if (b) pickIk(b.dataset.id); });
  paint();
  return { pick, pickIk, state: st };
}
