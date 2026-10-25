/* 耳で歩く（2026-10-26 本人の指示・資料＝01_経営/01_経営/03_資料/環世界2.0_広げる方法と実装_2026-10-26.md の S1・S2）
   ・歩いているあいだ、画面は真っ黒（消さない＝Screen Wake Lock。位置が止まらないように）。かさねっこの小さな光だけ。
   ・数秒止まると、窓がひらく（ふつうの画面に戻る）。また歩きだすと閉じる。
   ・次の地点の方角から、かさねっこの鳴き声（その層の高さの音）が聞こえる。近いほど間が短く、うしろはこもった音。着くと鳴り、碧が読む。
   ・iPhone の Safari では振動が使えないので、振動は使わず音だけで出す。
   ・画面の黒は長押しで戻る（ポケットの中で誤って触っても戻らない）。
   費用 0 円・外へ何も送らない（位置は「現在地で歩く」と同じく端末の中だけ）。 */
const PITCH = { sight: 1568, touch: 1175, sound: 1319, nature: 988, culture: 1047 };
export function makeEarWalk(o) {
  const E = { on: false, still: 0, moved: 0, last: null, t: 0, next: 0, visited: new Set(), cur: null, lock: null, veil: null, open: false };
  function veil() {
    if (E.veil) return E.veil;
    const v = document.createElement("div"); v.id = "earVeil";
    v.innerHTML = '<div class="ev-dots"></div><p class="ev-msg">耳で歩いています<br><span>止まると、窓がひらきます。<br>長押しで、ふつうの画面へ。</span></p>';
    document.body.appendChild(v);
    let hold = null; v.addEventListener("pointerdown", () => { hold = setTimeout(() => { stop(); o.toast("ふつうの画面に戻りました。"); }, 800); });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) v.addEventListener(ev, () => clearTimeout(hold));
    const d = v.querySelector(".ev-dots"); for (const c of o.colors) { const s = document.createElement("i"); s.style.background = c; s.style.boxShadow = `0 0 10px ${c}`; d.appendChild(s); }
    return E.veil = v;
  }
  async function wake() { try { if ("wakeLock" in navigator && !E.lock) { E.lock = await navigator.wakeLock.request("screen"); E.lock.addEventListener?.("release", () => { E.lock = null; }); } } catch { E.lock = null; } }
  document.addEventListener("visibilitychange", () => { if (E.on && document.visibilityState === "visible") wake(); });
  function chirp(pan, near, back, layer) {   // かさねっこの鳴き声（短い二つの上がる音）
    const ac = o.ctx(); if (!ac || !o.soundOn()) return; const t = ac.currentTime + .02, f = PITCH[layer] || 1100, out = o.out();
    const p = ac.createStereoPanner ? ac.createStereoPanner() : null, lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = back ? 900 : 6000;
    if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); lp.connect(p).connect(out); } else lp.connect(out);
    const vol = (back ? .05 : .09) * (.5 + .5 * near);
    [[0, f * .82, f], [.13, f * .92, f * 1.18]].forEach(([dt, a, b]) => { const os = ac.createOscillator(), g = ac.createGain(); os.type = "sine"; os.frequency.setValueAtTime(a, t + dt); os.frequency.exponentialRampToValueAtTime(b, t + dt + .09);
      g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(vol, t + dt + .015); g.gain.exponentialRampToValueAtTime(.0004, t + dt + .12); os.connect(g).connect(lp); os.start(t + dt); os.stop(t + dt + .14); });
  }
  function chime(layer) { const ac = o.ctx(); if (!ac || !o.soundOn()) return; const t = ac.currentTime + .02, f = (PITCH[layer] || 1100) / 2;
    [1, 1.5, 2].forEach((m, i) => { const os = ac.createOscillator(), g = ac.createGain(); os.type = "triangle"; os.frequency.value = f * m; g.gain.setValueAtTime(0, t + i * .09); g.gain.linearRampToValueAtTime(.07, t + i * .09 + .02); g.gain.exponentialRampToValueAtTime(.0004, t + i * .09 + 1.4); os.connect(g).connect(o.out()); os.start(t + i * .09); os.stop(t + i * .09 + 1.5); }); }
  function pick(p) {   // 次の地点：まだ着いていない、近い地点（前の方を少し優先）
    let best = null, bs = 1e9;
    for (const T of o.targets()) { if (E.visited.has(T.id)) continue; const dx = T.x - p.x, dz = T.z - p.z, d = Math.hypot(dx, dz); if (d > 320) continue;
      const rel = Math.abs(wrap(Math.atan2(-dx, -dz) - p.yaw)), s = d * (1 + rel * .35); if (s < bs) { bs = s; best = T; } }
    return best;
  }
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  function update(dt) {
    if (!E.on) return; const p = o.pos(); E.t += dt;
    if (E.last) { const m = Math.hypot(p.x - E.last.x, p.z - E.last.z); E.moved = E.moved * Math.pow(.4, dt) + m; } E.last = { x: p.x, z: p.z };
    const moving = E.moved > .35 && !o.busy(); E.still = moving ? 0 : E.still + dt;
    const shut = !(E.still > 3.5); if (shut !== !E.open) { E.open = !shut; E.veil.classList.toggle("open", E.open); o.onOpen?.(E.open); }
    const T = pick(p); E.cur = T; if (!T) return;
    const dx = T.x - p.x, dz = T.z - p.z, d = Math.hypot(dx, dz);
    if (d < 10) { E.visited.add(T.id); chime(T.layer); o.arrive(T); E.next = E.t + 6; return; }
    if (E.t >= E.next) { const rel = wrap(Math.atan2(-dx, -dz) - p.yaw); chirp(-Math.sin(rel), Math.max(0, 1 - d / 200), Math.abs(rel) > Math.PI / 2, T.layer); E.next = E.t + Math.max(1.4, Math.min(6.5, d / 18)); }
  }
  function start() {
    if (E.on) return; E.on = true; E.still = 0; E.moved = 1; E.next = E.t + 1.2; veil().classList.remove("open"); veil().hidden = false; E.open = false; wake(); o.sync(true);
    o.toast("耳で歩きます。画面は暗くなり、次の地点の方から、かさねっこの声がします。止まると窓がひらきます。歩くときは周りに気をつけて。");
  }
  function stop() { if (!E.on) return; E.on = false; if (E.veil) E.veil.hidden = true; try { E.lock?.release(); } catch { } E.lock = null; o.sync(false); o.onOpen?.(true); }
  E.start = start; E.stop = stop; E.update = update; E.toggle = () => E.on ? stop() : start();
  return E;
}
