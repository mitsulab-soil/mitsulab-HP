/* © mitsulab. 窓（まど）── 画面は「ときどき上げて確かめる窓」（2026-11-05 本番に入れた。設計＝資料/コモングラウンドの体験設計_2026-11-05.md）
   歩く → 画面は暗く静か（現地で歩くときは深く暗く・PC では縁だけ）。層や依代に近づくと、短い音と振動で知らせる（画面を見なくてよい）。
   止まる（約 2 秒）→ 画面がひらく。近くに依代がいれば、淡い光の中で弾んで現れる。
   ひらいて数秒 → 碧が、実物への問いを一つ置く（画面の外へ）。また歩き出すと、画面は静かに閉じる。
   軽さ：判定は 0.25 秒ごと（毎フレームではない）。画面の暗さは CSS の opacity だけ（合成のみ）。3D に足すのは光の板 1 枚（最初に一度だけ作る）。
   残すもの：なし（位置・会話・動きは保存しない）。 */
import * as THREE from "three";

const ASK = {   // 実物への問い（答えでなく、目と体を風景に戻す）。field＝現地／home＝家から
  field: ["画面から目を上げて、いちばん高い枝を探してみて。", "道の端に寄って、足もとの土に手のひらを近づけてみて。冷たい？", "道の端に寄って立ち止まり、目を閉じて、聞こえる音を三つ数えてみて。", "風がどちらから来ているか、頬で確かめてみて。"],
  home: ["画面の外へ。いまいる場所から見える、いちばん近い木はどこ？", "目を閉じて、いま聞こえる音を三つ数えてみて。", "この参道に立ったら、足の裏は何を感じるでしょう。"],
};
const NEAR = 9, STOP_S = 1.8, ASK_S = 5;

export function attachMado(q, { speak } = {}) {
  const isField = () => !!q.HERE?.on;   // 現在地で歩いているか（現地）
  const veil = document.createElement("div"); veil.id = "madoVeil"; veil.setAttribute("aria-hidden", "true");
  veil.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity 1.2s ease;background:radial-gradient(ellipse 75% 62% at 50% 52%,rgba(4,10,12,0) 0%,rgba(4,10,12,.55) 70%,rgba(4,10,12,.86) 100%)";
  const deep = document.createElement("div"); deep.style.cssText = "position:absolute;inset:0;background:rgba(3,8,10,.78);opacity:0;transition:opacity 1.2s ease"; veil.appendChild(deep);
  document.body.appendChild(veil);

  // 依代の現れる光（足もとの淡い円。一枚だけ作り、使い回す）
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(220,245,240,.9)"); gr.addColorStop(.35, "rgba(160,215,212,.35)"); gr.addColorStop(1, "rgba(160,215,212,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false, fog: false }));
  glow.renderOrder = 2; glow.visible = false; (q.world || q.scene).add(glow);

  let ac = null; const tone = (f = 660) => { try { if (!ac || ac.state !== "running") return;   /* 11-05 触れる前に音の箱を作ると本体が止まる（約 0.3 秒）＝触れたあとに作った箱でだけ鳴らす */ const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime; o.type = "sine"; o.frequency.value = f; v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(.06, t + .02); v.gain.exponentialRampToValueAtTime(.0001, t + .5); o.connect(v).connect(ac.destination); o.start(t); o.stop(t + .55); } catch {} };
  const buzz = p => { try { if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(p); } catch {} };   // 触れる前に振動を呼ぶと、ブラウザがエラーを出す
  addEventListener("pointerdown", () => { try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.(); } catch {} }, { once: true, passive: true });

  const speakingNow = () => { const c = document.getElementById("caption"), v = document.getElementById("voice"); return (c && !c.hidden) || (v && !v.paused); };   // 碧が話している最中は、問いを重ねない
  const S = { state: "open", still: 0, moving: 0, last: null, near: new Set(), asked: false, ai: 0, gl: null, glT: 0 };
  const nearThings = p => {
    const out = [];
    for (const it of q.YO?.my?.items || []) { const d = Math.hypot(it.root.position.x - p.x, it.root.position.z - p.z); if (d < NEAR) out.push(["y", it, d]); }
    for (const L of q.LAYER?.objs || []) { if (!L.o) continue; const d = Math.hypot(L.o.x - p.x, L.o.z - p.z); if (d < NEAR) out.push(["l", L, d]); }
    return out;
  };
  const setVeil = st => { const f = isField(); veil.style.opacity = st === "walk" ? "1" : "0"; deep.style.opacity = st === "walk" && f ? "1" : "0"; document.body.dataset.mado = st; };
  function appear(it) {   // 依代が現れる瞬間：足もとに淡い光が満ち、弾んでこちらを向く
    glow.position.copy(it.root.position); glow.position.y += .02; glow.scale.setScalar(1.6); glow.visible = true; S.gl = it; S.glT = 0; it.hop = 1;
  }
  function tick(dt) {
    if (q.mode !== "walk" || !q.camera) { if (S.state !== "open") { S.state = "open"; setVeil("open"); } return; }
    const p = q.camera.position, sp = S.last ? Math.hypot(p.x - S.last.x, p.z - S.last.z) / dt : 0; S.last = { x: p.x, z: p.z };
    if (sp > .35) { S.moving += dt; S.still = 0; } else { S.still += dt; S.moving = 0; }
    if (S.state !== "walk" && S.moving > 1.2) { S.state = "walk"; S.asked = false; setVeil("walk"); }
    if (S.state === "walk") {   // 歩くあいだ：新しく近づいたものだけを、音と振動で一度知らせる
      const now = nearThings(p), ids = new Set(now.map(e => e[1]));
      for (const e of now) if (!S.near.has(e[1])) { tone(e[0] === "y" ? 784 : 587); buzz(e[0] === "y" ? [14, 70, 14] : 16); }
      S.near = ids;
      if (S.still > STOP_S) { S.state = "open"; S.openT = 0; setVeil("open"); const y = now.filter(e => e[0] === "y").sort((a, b) => a[2] - b[2])[0]; if (y) appear(y[1]); }
    } else if (S.state === "open") {
      S.openT = (S.openT || 0) + dt;
      if (!S.asked && S.openT > ASK_S && S.still > ASK_S && !speakingNow()) { S.asked = true; const L = ASK[isField() ? "field" : "home"], t = L[S.ai++ % L.length]; speak?.([{ t, tc: t }]); }
    }
  }
  let prev = performance.now(); setInterval(() => { const n = performance.now(); tick(Math.min(1, (n - prev) / 1000)); prev = n; }, 250);
  // 光の満ち引きだけは滑らかに（光がある数秒のあいだだけ動く）
  const fade = () => { if (glow.visible) { S.glT += 1 / 60; const k = S.glT < .6 ? S.glT / .6 : Math.max(0, 1 - (S.glT - 2.4) / 1.6); glow.material.opacity = .55 * k; glow.scale.setScalar(1.6 + S.glT * .25); if (S.glT > 4) glow.visible = false; } requestAnimationFrame(fade); };
  requestAnimationFrame(fade);
  return { state: () => S.state, _S: S, _tick: tick };
}
