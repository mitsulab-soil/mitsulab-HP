/* © mitsulab. 生き物を選ぶ並び（2026-11-23 本人「生き物の選択画面も sight のものを準用」）
   Qualia/sight（x/02）の並び（ring.js の写し）を、画面の上に置く。まん中が選んでいる体、左右に前後の体。押すか、なぞって回す。
   はじめは「ひと」＝人の目。選ぶと、今までの生き物のボタン（#qIK。見えなくしただけで、動きはそのまま）を押す。 */
import * as T from "three";
import { makeRing } from "./ring.js?v=20261123a";
const W = { hito: "人の目。色を受けとる細胞は三種類（三色型）", hachi: "紫外が見え、赤は見えない（模式）", chou: "紫外から赤まで、色の差が濃い（模式）", tori: "四色型。紫外も手がかりに（模式）", suzume: "しげみの高さ。紫外も手がかりに（模式）", tanuki: "地面から 30 cm。青と黄の二色（模式）", inu: "目の高さ 45 cm。青と黄の二色（模式）", hebi: "頬のピット器官で、熱を感じる（模式）", kikai: "点群・赤外線・等高線。押すたびに切りかわる" };
export function mountRing(QW, items) {
  const ik = document.getElementById("qIK"); if (!ik) return;
  const css = document.createElement("style"); css.id = "qring";
  css.textContent = `#qRing{position:fixed;left:50%;transform:translateX(-50%);top:max(4px,env(safe-area-inset-top));width:min(520px,100vw - 560px);height:104px;z-index:6;touch-action:pan-y;user-select:none;-webkit-user-select:none;background:linear-gradient(180deg,rgba(4,10,8,.42),rgba(4,10,8,.2) 70%,rgba(4,10,8,0));border-radius:0 0 16px 16px;transition:opacity .4s}
#qRing canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 16%,#000 84%,transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 16%,#000 84%,transparent 100%)}
#qRing .rg-row{position:absolute;inset:0}
#qRing .rg-it{position:absolute;left:50%;top:0;width:104px;margin-left:-52px;height:100%;border:0;background:none;padding:0;display:flex;align-items:flex-end;justify-content:center;color:#f1f6ee;cursor:pointer;-webkit-tap-highlight-color:transparent}
#qRing .rg-it span{font:500 14px/1.2 var(--ml-serif,"Shippori Mincho","Hiragino Mincho ProN",serif);letter-spacing:.06em;padding:0 4px 2px;white-space:nowrap;text-shadow:0 0 2px #071108,0 0 6px rgba(7,17,8,.95),0 1px 10px rgba(7,17,8,.8)}
#qRing .rg-it.on span{font-size:19px;font-weight:600;color:#fff;letter-spacing:.1em;border-bottom:1px solid #7fd6d0}
#qRing .rg-it:focus-visible{outline:2px solid #e8c98a;outline-offset:-2px}
#qRing .rg-arrow{position:absolute;top:50%;margin-top:-24px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(220,235,240,.35);background:rgba(6,10,18,.5);color:#eef4f6;font-size:22px;line-height:1;display:grid;place-items:center;padding:0 0 3px;z-index:2;cursor:pointer}
#qRing .rg-prev{left:4px}#qRing .rg-next{right:4px}
#qRingW{position:fixed;left:50%;transform:translateX(-50%);top:calc(max(4px,env(safe-area-inset-top)) + 106px);z-index:6;max-width:calc(100vw - 32px);text-align:center;font:500 12.5px/1.5 var(--ml-sans,"Zen Kaku Gothic New",sans-serif);color:#eef4f0;letter-spacing:.04em;padding:2px 12px;border-radius:10px;background:rgba(4,10,8,.4);pointer-events:none;transition:opacity .4s}
body:not([data-mode="walk"]) #qRing,body:not([data-mode="walk"]) #qRingW,html.qfirst #qRing,html.qfirst #qRingW,body:has(#qJidaiTag) #qRingW.x{opacity:0;pointer-events:none}
#qIK>button:not(.ik-keep),#ikTog{display:none!important}
@media (max-width:640px){#qRing{width:100vw;height:104px;top:calc(max(8px,env(safe-area-inset-top)) + 54px)}#qRing .rg-it span{font-size:13px;background:rgba(6,10,18,.4);border-radius:4px}#qRing .rg-it.on span{font-size:17px}#qRingW{display:none}html body #qJidaiTag#qJidaiTag{top:auto!important;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 226px)!important}#qRing .rg-prev{left:6px}#qRing .rg-next{right:6px}
html body[data-mode="walk"][data-mode="walk"] #caption#caption#caption#caption#caption#caption{top:calc(max(12px,env(safe-area-inset-top)) + 214px)!important;bottom:auto!important}
html body[data-mode="walk"][data-mode="walk"] #sndTag#sndTag#sndTag#sndTag#sndTag#sndTag{top:calc(max(12px,env(safe-area-inset-top)) + 172px)!important;bottom:auto!important}
html body[data-mode="walk"][data-mode="walk"]:has(#caption:not([hidden])) #sndTag#sndTag#sndTag#sndTag#sndTag#sndTag{top:calc(max(12px,env(safe-area-inset-top)) + 172px)!important}
html body:is(.ikOnly,.iki)[data-mode="walk"] #caption#caption#caption#caption#caption#caption#caption{top:auto!important;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 140px)!important}html body #w4src#w4src{left:12px!important;right:auto!important;top:calc(max(12px,env(safe-area-inset-top)) + 166px)!important;bottom:auto!important}html body #qIKsrc#qIKsrc{top:calc(max(12px,env(safe-area-inset-top)) + 166px)!important;left:auto!important;right:12px!important;bottom:auto!important;max-width:calc(100vw - 24px);font-size:10.5px!important;line-height:1.4!important}}`;
  document.head.appendChild(css);
  const host = document.createElement("nav"); host.id = "qRing"; host.setAttribute("aria-label", "生き物を選ぶ（左右の体を押すか、なぞって回す）"); document.body.appendChild(host);
  const cap = document.createElement("p"); cap.id = "qRingW"; cap.setAttribute("aria-live", "polite"); document.body.appendChild(cap);
  let mod = null, sb = null;
  const wrap = (c, size) => { const g = new T.Group(); c.scale.multiplyScalar(size || 1); g.add(c); g.userData.creature = c; g.userData.animate = (t, m = true) => { try { c.userData.animate?.(t, m); } catch { } }; return g; };
  const makeBody = id => {
    const it = items.find(i => i.id === id) || {};
    if (it.sight) { const g = sb.makeBody(it.sight); return g; }
    const c = id === "hachi" ? mod.makeBee(undefined, { state: "fly" }) : id === "chou" ? mod.makeButterfly("ageha") : id === "tori" ? mod.makeTit() : id === "suzume" ? mod.makeTit(undefined, { sp: "suzume" }) : id === "tanuki" ? mod.makeDog(undefined, { tanuki: true }) : mod.makeDog();
    return wrap(c);
  };
  const btnOf = it => [...ik.querySelectorAll("button")].find(b => (b.dataset.id || b.dataset.kk) === it.key || b.textContent.trim() === it.label);
  const curId = () => { for (const it of items) { if (!it.key) continue; const b = btnOf(it); if (b && b.getAttribute("aria-pressed") === "true") return it.id; } return "hito"; };
  const say = id => { cap.textContent = W[id] || ""; };
  let ring = null;
  const pick = (id, again) => {
    const it = items.find(i => i.id === id); if (!it) return;
    if (id === "hito") { const c = curId(); if (c !== "hito") { const hb = [...ik.querySelectorAll("button")].find(b => b.dataset.kk === "hito" && !b.hidden); const cb = btnOf(items.find(i => i.id === c)); (hb && c !== "hachi" && c !== "suzume" && c !== "tanuki" ? hb : cb)?.click(); } }
    else if (again && it.id !== "kikai") return;
    else btnOf(it)?.click();
    ring?.set(id); say(id);
  };
  const sync = () => { const c = curId(); ring?.set(c); say(c); };
  new MutationObserver(sync).observe(ik, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
  const go = async () => {
    mod = await import("../creatures_sight.js?v=13"); if (items.some(i => i.sight)) sb = await import("./bodies.js?v=20261123a");
    ring = makeRing({ host, items: items.map(i => ({ id: i.id, name: i.name })), onPick: pick, makeBody, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches });
    ring.set("hito", true); say("hito"); await ring.start(); sync();
  };
  const w = setInterval(() => { if (QW.mode === "walk" && document.body.classList.contains("ready")) { clearInterval(w); (window.requestIdleCallback || setTimeout)(() => go().catch(e => console.warn("qring", e)), { timeout: 1500 }); } }, 400);
}
