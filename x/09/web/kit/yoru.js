/* © mitsulab. 夜の暗さ（2026-11-05 本人「夜（日没のあと）は風景を夜の暗さにしてよい」）
   太陽の高さ（app.js の QW.sunAE＝実際の時刻の太陽）に合わせて、歩く風景の明るさを自然に落とす。
   0°（日の入り）→ −6°（市民薄明の終わり）→ −12°（航海薄明の終わり）でなめらかに暗くし、それより下は夜の暗さで止める。
   軽さ：露出の数を変えるだけ（材質の組み直しなし）と、色味の薄い膜 1 枚（CSS）。0.2 秒ごと。
   字幕・ボタンは膜より上にあるので暗くならない。足もとが見える程度の暗さで止める（歩けるように）。 */
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function nightAmount(el) { return smooth(0, -12, el); }   // 0＝昼、1＝夜

export function attachYoru(q) {
  const tint = document.createElement("div"); tint.id = "yoruTint"; tint.setAttribute("aria-hidden", "true");
  tint.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;transition:opacity 1.5s linear;background:linear-gradient(to bottom,rgba(14,24,62,.72),rgba(10,18,40,.38) 55%,rgba(8,12,24,.25));mix-blend-mode:multiply";
  document.body.appendChild(tint);
  const S = { k: 0 };
  const forced = /[?&]toki=1/.test(location.search) ? 1 : null;   // 行事の確かめ（?toki=1）は夜として見る
  setInterval(() => {
    const r = q.renderer; if (!r) return;
    const el = q.sunAE?.[1] ?? 30, target = forced ?? nightAmount(el);
    S.k += (target - S.k) * .25;   // 急に変えない
    const on = q.mode === "walk", k = on ? S.k : 0;
    if (q.scene && "backgroundIntensity" in q.scene) q.scene.backgroundIntensity = 1 - .92 * k;   // 空の写真は露出が効かないので、空だけ別に暗くする
    q.nightExp = 1 - .7 * S.k;   // 露出は app.js が毎こま、この係数に向けてなめらかに寄せる（夜でも 0.3 は残す＝道・木・碧が見える）
    tint.style.opacity = (k * .9).toFixed(3);
    document.body.dataset.yoru = k > .5 ? "1" : "0";
  }, 200);
  return { amount: () => S.k };
}
