// © mitsulab. 入口の小さな部品（2026-11-09）：HP へ戻る印（44px）・焦点の見え方・最初に押す所を一つ控えめに光らせるボタン
// 使い方：const go = qxEntry({ label, onPress, css }); 毎こま go.place(x, y)（画面の外なら null）。押されたら消える。
export function qxEntry(o = {}) {
  const st = document.createElement("style");
  st.textContent = `
.qx-home{position:fixed;left:max(6px,env(safe-area-inset-left));top:calc(8px + env(safe-area-inset-top));z-index:9;width:44px;height:44px;display:grid;place-items:center;color:#eef5fb;text-decoration:none;font:400 18px/1 "Hiragino Sans",sans-serif;text-shadow:0 0 3px #000,0 0 10px rgba(0,0,0,.7);pointer-events:auto}
${o.css || ""}
.qx-go{position:fixed;left:0;top:0;z-index:8;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:1px solid rgba(242,214,150,.85);background:radial-gradient(circle,rgba(255,236,190,.16),rgba(255,236,190,0) 70%);box-shadow:0 0 14px rgba(255,226,160,.45);cursor:pointer;pointer-events:auto;padding:0;animation:qxp 2.4s ease-in-out infinite;transition:opacity .4s}
.qx-go[hidden]{display:none}
@keyframes qxp{0%,100%{box-shadow:0 0 8px rgba(255,226,160,.3);opacity:.75}50%{box-shadow:0 0 20px rgba(255,226,160,.6);opacity:1}}
:focus-visible{outline:2px solid #9bdcf0!important;outline-offset:3px}
@media (prefers-reduced-motion:reduce){.qx-go{animation:none}}`;
  document.head.appendChild(st);
  const home = document.createElement("a"); home.className = "qx-home"; home.href = "/"; home.setAttribute("aria-label", "mitsulab のホームへ戻る"); home.textContent = "←";
  document.body.prepend(home);   // 2026-11-09 第2周：Tab の順を 戻る→最初の輪→下の操作 に（末尾に置くと Tab が外へ抜けた）
  const go = document.createElement("button"); go.className = "qx-go"; go.type = "button"; go.setAttribute("aria-label", o.label || "ここに触れる"); go.hidden = !o.onPress;
  home.after(go);
  let done = !o.onPress;
  go.addEventListener("click", e => { e.stopPropagation(); if (done) return; done = true; go.hidden = true; o.onPress?.(); });
  if (!done) setTimeout(() => { try { go.focus({ preventScroll: true }); } catch (_) { } }, 0);
  return {
    home, el: go,
    place(x, y) { if (done) return; if (x == null) { go.style.visibility = "hidden"; return; } go.style.visibility = ""; if (document.activeElement === document.body || !document.activeElement) try { go.focus({ preventScroll: true }); } catch (_) { } go.style.transform = `translate(${x | 0}px,${y | 0}px)`; },
    end() { done = true; go.hidden = true; },
    get done() { return done; },
  };
}
