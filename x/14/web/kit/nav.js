/* Qualium 共通の操作（大宮・川越・渋谷で同じもの）2026-10-29
   設計＝01_Qualium_大宮/資料/操作の設計_まち歩きの型から_2026-10-29.md
   ・押す 1 回の意味を一つに：歩いている間はどこを押しても止まる／止まっているときは app の tap（印→依代・かさねっこ→地面）
   ・指を置いた瞬間に行き先の円（ずらすと消えて見回し）
   ・見回し＝画面の幅をなぞると約 90°・離して 0.2 秒の慣性・縦は ±35°・2 秒で水平へ戻る
   ・ホイール／ピンチ＝歩く：視野 50〜75°、地図：距離
   ・札は 4 つ（≡・地図｜歩く｜AR・🔈・歩きつづける）。層の操作はメニューの「層」へ
   ・AR＝現在地で歩く＋端末の向き（iOS は許可の手順）
   ・最初の碧の一言・スティックはメニューで選べる */
const PMAX = 35 * Math.PI / 180;
const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch { } } };
const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { } } };

export function installNav(o) {
  const { canvas, mobile } = o;
  const N = { drag: null, vx: 0, vy: 0, relT: -1e9, lookT: -1e9, pts: new Map(), pinch: null, hoverT: 0, ar: false, ori: null, oriBase: null, stick: { f: 0, s: 0, on: ls.get("q.stick") === "1" }, stats: { wrong: 0, stuckMs: 0 } };
  window.__qnav = N;
  const gain = () => (Math.PI / 2) / Math.max(320, innerWidth);
  const lookable = m => m === "walk" || m === "fly" || m === "sight";
  const mine = () => !o.modes || o.modes.includes(o.mode());   // 大宮：飛ぶ・生きものの身体は app の古い入力が受ける

  /* ---------- 指・マウス ---------- */
  canvas.addEventListener("pointerdown", e => { if (!mine()) return;
    N.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (N.pts.size === 2) { const [a, b] = [...N.pts.values()]; N.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; N.drag = null; o.ring(null); return; }
    N.drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), id: e.pointerId, moved: 0, stop: o.mode() === "walk" && o.isMoving(), look: false, lt: performance.now() };
    N.vx = N.vy = 0; try { canvas.setPointerCapture(e.pointerId); } catch { }
    if (!N.drag.stop && o.mode() === "walk") o.ring(o.goalAt(e.clientX, e.clientY));
  });
  canvas.addEventListener("pointermove", e => {
    if (N.pts.has(e.pointerId)) N.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (N.pinch && N.pts.size === 2) { const [a, b] = [...N.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoom(N.pinch.d / Math.max(1, d)); N.pinch.d = d; return; }
    const D = N.drag;
    if (!D || D.id !== e.pointerId) { if (mine()) hover(e); return; }
    const dx = e.clientX - D.x, dy = e.clientY - D.y, now = performance.now(), dtm = Math.max(1, now - D.lt); D.x = e.clientX; D.y = e.clientY; D.lt = now; D.moved += Math.abs(dx) + Math.abs(dy);
    if (!D.look && D.moved > 9) { D.look = true; o.ring(null); }
    if (!D.look) return;
    const m = o.mode();
    if (m === "sky") { o.skyDrag(dx, dy); return; }
    if (!lookable(m)) return;
    const g = gain(), ky = dx * g, kp = dy * g;
    look(ky, kp); N.vx = N.vx * .5 + ky / dtm * 1000 * .5; N.vy = N.vy * .5 + kp / dtm * 1000 * .5;
  });
  const end = e => {
    N.pts.delete(e.pointerId); if (N.pts.size < 2) N.pinch = null;
    const D = N.drag; if (!D || D.id !== e.pointerId) return; N.drag = null;
    if (D.look) { N.relT = performance.now(); return; }
    if (e.type === "pointercancel") { o.ring(null); return; }
    if (performance.now() - D.t > 650) { o.ring(null); return; }
    if (D.stop) { o.stop(); o.ring(null); return; }   // 歩いている間は、どこを押しても止まる（碧は喋り出さない）
    o.tap(e.clientX, e.clientY);
  };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", e => { if (!mine()) return; e.preventDefault(); zoom(1 + Math.max(-.5, Math.min(.5, e.deltaY * .0012))); }, { passive: false });
  canvas.addEventListener("pointerleave", () => { if (!N.drag && !mobile) o.ring(null); });
  function hover(e) {   // PC：カーソルの下に円・印の上では指
    if (e.pointerType !== "mouse" || o.mode() !== "walk") { canvas.style.cursor = ""; return; }
    const now = performance.now(); if (now - N.hoverT < 70) return; N.hoverT = now;
    if (o.isMoving()) { o.ring(null); canvas.style.cursor = "default"; return; }
    const mk = o.markAt(e.clientX, e.clientY);
    if (mk) { o.ring(null); canvas.style.cursor = "pointer"; } else { o.ring(o.goalAt(e.clientX, e.clientY)); canvas.style.cursor = "crosshair"; }
  }
  function look(dy, dp) {
    if (N.ar && N.oriBase != null) { N.oriBase += dy; return; }
    o.cam.look += dy; o.cam.pitch = Math.max(-PMAX, Math.min(PMAX, o.cam.pitch + dp)); o.cam.lastDrag = N.lookT = performance.now();
  }
  function zoom(f) {
    const m = o.mode();
    if (m === "sky") { o.skyZoom(f); return; }
    if (m !== "walk") return;
    const c = o.camera; c.fov = Math.max(50, Math.min(75, c.fov * f)); c.updateProjectionMatrix();
  }

  /* ---------- 毎こま ---------- */
  N.update = dt => {
    const m = o.mode(), now = performance.now();
    if (lookable(m) && !N.drag) {
      const t = (now - N.relT) / 200;
      if (t < 1) { const k = (1 - t) * dt; look(N.vx * k, N.vy * k); }
      if (m === "walk" && !N.ar && now - N.lookT > 3500 && now - N.relT > 3500 && Math.abs(o.cam.pitch) > .002) o.cam.pitch *= Math.pow(.35, dt);   // 3.5 秒で水平へゆっくり戻る（10-30 パネル）
      if (Math.abs(o.cam.pitch) > PMAX && m === "walk") o.cam.pitch = Math.sign(o.cam.pitch) * PMAX;
    }
    if (N.ar && N.ori && m === "walk") { if (N.oriBase == null) N.oriBase = (o.cam.yaw + o.cam.look) - N.ori.yaw; const H = N.oriBase + N.ori.yaw; o.cam.look = H - o.cam.yaw; o.cam.pitch = Math.max(-1.2, Math.min(1.2, N.ori.pitch)); }
    if (m === "walk" && o.isStuck?.()) N.stats.stuckMs += dt * 1000;
  };

  /* ---------- キーボード ---------- */
  addEventListener("keydown", e => {
    if (e.target.closest?.("input,textarea,select")) return;
    const k = e.key.toLowerCase(), m = o.mode();
    if (k === "m") { $("#modeSky")?.click(); return; }
    if (k === "n") { $("#qSnd")?.click(); return; }
    if (k === "escape") { o.hush(); return; }
    if ((k === "+" || k === "=") && !e.metaKey && !e.ctrlKey) { zoom(.92); return; }
    if (k === "-" && !e.metaKey && !e.ctrlKey) { zoom(1.08); return; }
    if (k === "tab" && m === "walk") { e.preventDefault(); o.tabMark(e.shiftKey ? -1 : 1); return; }
    if (k === "enter" && m === "walk") { if (o.enterMark()) e.preventDefault(); return; }
    if (k === "enter" && m === "sky") { $("#goDown")?.click(); return; }
    if (k === " " && m === "walk") { e.preventDefault(); if (o.isMoving()) o.stop(); else $("#autoBtn")?.click(); }
  }, true);

  /* ---------- 札を 4 つに（≡・地図｜歩く｜AR・🔈・歩きつづける） ---------- */
  const $ = s => document.querySelector(s);
  const css = document.createElement("style"); css.id = "qnav-css";
  css.textContent = `
#myBtn,#earBtn,#hereBtn,#gyroBtn,#talkBtn,#modeFly,#sessBtn{display:none!important}
#hud .seg{position:relative}
#hud .seg button{transition:background-color .28s ease,color .28s ease,box-shadow .28s ease;font-family:var(--ml-serif,"Shippori Mincho","Hiragino Mincho ProN",serif);min-height:44px}
#hud .seg button[aria-pressed="true"]{box-shadow:inset 0 -2px 0 var(--ml-aoi,#5cc8e0)}
#hud .seg button.qtick{animation:qtick .32s ease}
@keyframes qtick{0%{transform:translateY(2px);opacity:.6}100%{transform:none;opacity:1}}
#qSnd{order:-1;flex:0 0 auto!important;min-width:44px!important;width:44px!important;max-width:44px!important;min-height:44px;padding:0!important;display:inline-flex!important;align-items:center;justify-content:center}
#qSnd svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.3}
#autoBtn{order:2!important}#walkUI #qSnd{order:1!important}#walkUI>*:not(#qSnd):not(#autoBtn){order:3}
#qSnd[aria-pressed="false"]{opacity:.55}
body #walkUI,body[data-mode="walk"] #walkUI{flex-direction:row!important;align-items:flex-end!important;display:flex!important;direction:ltr!important;gap:8px!important}
body[data-mode="walk"] #walkUI #qSnd,body[data-mode="walk"] #walkUI #autoBtn{grid-row:auto;grid-column:auto}
body #walkUI[hidden],body[data-mode="walk"] #walkUI[hidden]{display:none!important}
body.qLeft #walkUI{right:auto!important;left:var(--g,16px)}
#caption{cursor:pointer}
#qHere .t{display:none!important}   /* 10-30 パネル：PC とスマホで同じ形（数と層の札だけ） */
html body #caption #capTag{white-space:normal!important;width:auto!important;max-width:min(92vw,720px);display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5!important;text-overflow:clip}
#qStick{position:fixed;width:96px;height:96px;margin:-48px 0 0 -48px;border-radius:50%;border:1px solid rgba(220,240,248,.5);background:rgba(10,20,28,.18);z-index:7;pointer-events:none;display:none}
#qStick i{position:absolute;left:50%;top:50%;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;background:rgba(220,240,248,.55)}
#qStickZone{position:fixed;left:0;bottom:0;width:46vw;height:38vh;z-index:4;display:none;touch-action:none}
body.qStick[data-mode="walk"] #qStickZone{display:block}
.mrow.qlay{display:flex;flex-wrap:wrap;gap:8px}
.mrow.qlay .ml-btn{min-height:44px}
#menu h4.qh{margin:14px 0 6px;font:500 12px/1.4 var(--ml-serif,serif);letter-spacing:.18em;color:var(--ml-ink-3,#9aa)}`;
  document.head.appendChild(css);
  // 地図｜歩く｜AR
  const fly = $("#modeFly"), sky = $("#modeSky"), walk = $("#modeWalk");
  if (sky) sky.textContent = "地図";
  let arB = null;
  if (walk && mobile) { arB = document.createElement("button"); arB.id = "modeAR"; arB.setAttribute("aria-pressed", "false"); arB.textContent = "AR"; arB.title = "いまいる所で、端末を向けて見る"; walk.after(arB); arB.addEventListener("click", () => toggleAR()); }
  const tick = b => { b.classList.remove("qtick"); void b.offsetWidth; b.classList.add("qtick"); };
  for (const b of [sky, walk, arB]) if (b) b.addEventListener("click", () => tick(b));
  new MutationObserver(() => { if (arB) { if (N.ar) { walk.setAttribute("aria-pressed", "false"); } arB.setAttribute("aria-pressed", String(N.ar)); } }).observe(walk, { attributes: true, attributeFilter: ["aria-pressed"] });
  // 🔈：声と音を一つで入／切
  const wUI = $("#walkUI"), snd = $("#sndBtn");
  if (wUI && snd) { const b = document.createElement("button"); b.className = "ib"; b.id = "qSnd"; b.setAttribute("aria-label", "声と音（N キー）"); const sync = () => { const on = snd.getAttribute("aria-pressed") !== "false"; b.setAttribute("aria-pressed", String(on)); b.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8h3l4-3v10l-4-3H3z"/>${on ? '<path d="M13 7.5a3.5 3.5 0 0 1 0 5M15 5.5a6.5 6.5 0 0 1 0 9"/>' : '<path d="M13.5 8l4 4M17.5 8l-4 4"/>'}</svg>`; }; sync(); b.addEventListener("click", () => { snd.click(); sync(); if (snd.getAttribute("aria-pressed") === "false") o.hush(); }); new MutationObserver(sync).observe(snd, { attributes: true, attributeFilter: ["aria-pressed"] }); wUI.insertBefore(b, $("#autoBtn")); }
  // 字幕を押すと碧が黙る
  const cap = $("#caption"); if (cap) cap.addEventListener("click", e => { e.stopImmediatePropagation(); o.hush(); }, true);
  // メニューの「層」と「操作」
  const menu = $("#menu");
  if (menu) {
    const anchor = menu.querySelector(".mrow") || menu.querySelector("h3");
    const h = document.createElement("h4"); h.className = "qh"; h.textContent = "層";
    const row = document.createElement("div"); row.className = "mrow qlay";
    const proxy = (id, label) => { const t = document.getElementById(id); if (!t) return; const b = document.createElement("button"); b.className = "ml-btn"; b.textContent = label; b.addEventListener("click", () => { closeMenu(); setTimeout(() => t.click(), 30); }); row.appendChild(b); };
    proxy("myBtn", "層を置く"); if (!o.noSenseMenu) { proxy("earBtn", "耳で歩く"); proxy("skySight", "生きものの身体に入る"); } proxy("sessBtn", "自然とのセッション"); proxy("skyFly", "鳥になって飛ぶ");   // 10-30：五感＋X 感は空間の層に触れて入る（メニューから選ばない）
    const h2 = document.createElement("h4"); h2.className = "qh"; h2.textContent = "操作";
    const row2 = document.createElement("div"); row2.className = "mrow qlay";
    const stB = document.createElement("button"); stB.className = "ml-btn"; const syncSt = () => { stB.setAttribute("aria-pressed", String(N.stick.on)); stB.textContent = N.stick.on ? "スティックで歩く：入" : "スティックで歩く"; document.body.classList.toggle("qStick", N.stick.on); }; syncSt();
    stB.addEventListener("click", () => { N.stick.on = !N.stick.on; ls.set("q.stick", N.stick.on ? "1" : "0"); syncSt(); });
    const lrB = document.createElement("button"); lrB.className = "ml-btn"; const syncLr = () => { const on = ls.get("q.left") === "1"; document.body.classList.toggle("qLeft", on); lrB.textContent = on ? "札を右手側へ" : "札を左手側へ"; }; syncLr();
    lrB.addEventListener("click", () => { ls.set("q.left", ls.get("q.left") === "1" ? "0" : "1"); syncLr(); });
    if (mobile) row2.append(stB, lrB); else row2.append(lrB);
    if (anchor) anchor.after(h, row, h2, row2); else menu.append(h, row, h2, row2);
  }
  function closeMenu() { const x = document.getElementById("menuX"); if (x && !menu.hidden) x.click(); }

  /* ---------- スティック（選んだ人だけ・左下に触れた所へ出る） ---------- */
  if (mobile) {
    const z = document.createElement("div"); z.id = "qStickZone"; const st = document.createElement("div"); st.id = "qStick"; st.appendChild(document.createElement("i")); document.body.append(z, st);
    let sid = null, cx = 0, cy = 0;
    z.addEventListener("pointerdown", e => { if (o.isMoving() && !N.stick.f && !N.stick.s) o.stop(); sid = e.pointerId; cx = e.clientX; cy = e.clientY; st.style.left = cx + "px"; st.style.top = cy + "px"; st.style.display = "block"; z.setPointerCapture(sid); e.preventDefault(); });
    z.addEventListener("pointermove", e => { if (e.pointerId !== sid) return; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), r = 40; if (l > r) { dx *= r / l; dy *= r / l; } st.firstChild.style.transform = `translate(${dx}px,${dy}px)`; N.stick.f = -dy / r; N.stick.s = dx / r; });
    const up = e => { if (e.pointerId !== sid) return; sid = null; st.style.display = "none"; st.firstChild.style.transform = ""; N.stick.f = N.stick.s = 0; };
    z.addEventListener("pointerup", up); z.addEventListener("pointercancel", up);
  }

  /* ---------- AR（現在地で歩く＋端末の向き） ---------- */
  const _q = { onO: null };
  function onOrient(e) {
    if (e.alpha == null) return;
    const d = Math.PI / 180, al = e.alpha * d, be = e.beta * d, ga = e.gamma * d, or = (screen.orientation?.angle || window.orientation || 0) * d;
    const T = o.THREE, q = new T.Quaternion().setFromEuler(new T.Euler(be, al, -ga, "YXZ"));   // three.js の DeviceOrientationControls と同じ式
    q.multiply(new T.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), -or));
    const eu = new T.Euler().setFromQuaternion(q, "YXZ"), yaw = eu.y, pitch = eu.x;
    N.ori = { yaw, pitch };
  }
  async function toggleAR() {
    if (N.ar) { N.ar = false; removeEventListener("deviceorientation", onOrient); N.ori = null; N.oriBase = null; if (o.here()?.on) o.hereToggle(); arB?.setAttribute("aria-pressed", "false"); return; }
    try { if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== "granted") { o.say("端末の向きを使う許可がありませんでした。なぞって見回せます。"); return; } } } catch { }
    if (o.mode() !== "walk") { $("#modeWalk")?.click(); await new Promise(r => setTimeout(r, 2600)); }
    N.ar = true; N.ori = null; N.oriBase = null; addEventListener("deviceorientation", onOrient); arB?.setAttribute("aria-pressed", "true"); walk?.setAttribute("aria-pressed", "false");
    if (!o.here()?.on) o.hereToggle();
    once("q.h.ar", "足元に気をつけて。ゆっくり端末を向けると、印が重なります。");
    setTimeout(() => { if (N.ar && !N.ori) { N.ar = false; removeEventListener("deviceorientation", onOrient); arB?.setAttribute("aria-pressed", "false"); o.say("この端末では、向きの知らせが届きませんでした。なぞって見回せます。"); } }, 1800);
  }
  N.leaveAR = () => { if (N.ar) toggleAR(); };

  /* ---------- 最初の一言（1 回だけ） ---------- */
  function once(k, t) { if (ss.get(k)) return; ss.set(k, "1"); o.say(t); }
  N.firstWalk = () => setTimeout(() => once("q.h.walk", mobile ? "行きたい所を、指でさしてください。なぞると見回せます。" : "行きたい所をクリック。ドラッグで見回し、W A S D でも歩けます。"), 400);
  N.firstWalk = ((f0) => () => { f0(); setTimeout(() => { if (document.querySelector("#qHere:not([hidden])")) once("q.h.cnt", "左の数字は、まわり 30 m に重なっている層の数です。"); }, 6200); })(N.firstWalk);   // 10-30 パネル：数字の札の意味を最初の一度だけ
  const ab = $("#autoBtn"); if (ab) ab.addEventListener("click", () => { if (ab.getAttribute("aria-pressed") === "true") once("q.h.auto", "どこかに触れると、止まります。"); });
  return N;
}
