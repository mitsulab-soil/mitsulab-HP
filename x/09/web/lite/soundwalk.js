/* 歩くと音が変わる ── Qualium 氷川・川越の共通の小さな部品（2026-10-24）
   ・足音：足もとの面（アスファルト・石の平板・歩道の平板・締まった土）ごとに、一歩ずつその場で組み立てる（再現音・録音ではない）
   ・壁が近いときは、壁から返る音（音の速さ 秒速約 343 m の往復で遅らせ、高い音を少し落とす）を重ねる
   ・車の地点：近づくと、車が近づいて遠ざかる音を、ときどき組み立てて鳴らす（台数とタイミングは模式）
   使い方：const SW = makeSoundWalk({ ctx, out, on, tag }); 毎こま SW.update(dt, { x, z, yaw, moving, surface, wall }); 触れたら SW.play(kind, dest) */
export const SURF_LABEL = { asphalt: "アスファルト", stone: "石の平板", tile: "歩道の平板", soil: "締まった土", wood: "板" };
export function makeSoundWalk(o) {
  const S = { step: 0, surf: null, zones: [], z: {}, lastTag: 0 };
  let NB = null;
  const noise = ac => { if (!NB || NB.sampleRate !== ac.sampleRate) { NB = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(); s.buffer = NB; return s; };
  function burst(ac, dest, t, f, q, a, dec) {
    const s = noise(ac), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .002); g.gain.exponentialRampToValueAtTime(.0005, t + dec);
    s.connect(bp).connect(g).connect(dest); s.start(t, Math.random()); s.stop(t + dec + .05);
  }
  function thump(ac, dest, t, f, a, dec) { const os = ac.createOscillator(), g = ac.createGain(); os.type = "sine"; os.frequency.setValueAtTime(f, t); os.frequency.exponentialRampToValueAtTime(f * .55, t + dec); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .004); g.gain.exponentialRampToValueAtTime(.0005, t + dec); os.connect(g).connect(dest); os.start(t); os.stop(t + dec + .03); }
  // 一歩：かかと（低いどすっ）→ つま先（こすれ）。面ごとに、響きの高さ・長さ・こすれの量を変える
  function foot(ac, dest, t, kind, a = 1) {
    const r = .85 + Math.random() * .3;
    if (kind === "stone") { thump(ac, dest, t, 150 * r, .16 * a, .05); burst(ac, dest, t, 3400 * r, 3, .16 * a, .025); burst(ac, dest, t + .045, 2200 * r, 1.6, .07 * a, .04); }
    else if (kind === "tile") { thump(ac, dest, t, 170 * r, .13 * a, .045); burst(ac, dest, t, 2600 * r, 2.2, .13 * a, .03); burst(ac, dest, t + .04, 1800 * r, 1.4, .06 * a, .05); }
    else if (kind === "soil") { thump(ac, dest, t, 110 * r, .2 * a, .08); burst(ac, dest, t, 600 * r, .8, .14 * a, .09); burst(ac, dest, t + .03, 1700 * r, 1.1, .05 * a, .1); }
    else if (kind === "wood") { thump(ac, dest, t, 210 * r, .2 * a, .09); burst(ac, dest, t, 1400 * r, 2.5, .1 * a, .05); }
    else { thump(ac, dest, t, 130 * r, .14 * a, .05); burst(ac, dest, t, 1100 * r, 1.2, .12 * a, .045); burst(ac, dest, t + .035, 2600 * r, 1.6, .05 * a, .04); }   // アスファルト
  }
  // 車が近づいて遠ざかる（風を切る音の高さが上がって下がる・低いエンジンの唸り）。pan：左右のどちらから来るか
  function car(ac, dest, t, a = .5, dur = 2.6, pan = 0) {
    const s = noise(ac), lp = ac.createBiquadFilter(), g = ac.createGain(), m = dur / 2;
    const pn = ac.createStereoPanner ? ac.createStereoPanner() : null; if (pn) { pn.pan.setValueAtTime(-pan, t); pn.pan.linearRampToValueAtTime(pan, t + dur); g.connect(pn).connect(dest); } else g.connect(dest);
    lp.type = "lowpass"; lp.frequency.setValueAtTime(420, t); lp.frequency.linearRampToValueAtTime(2300, t + m); lp.frequency.linearRampToValueAtTime(380, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + m); g.gain.linearRampToValueAtTime(0, t + dur);
    s.loop = true; s.connect(lp).connect(g); s.start(t); s.stop(t + dur + .05);
    const os = ac.createOscillator(), og = ac.createGain(); os.type = "sawtooth"; os.frequency.setValueAtTime(64, t); os.frequency.linearRampToValueAtTime(58, t + m); os.frequency.linearRampToValueAtTime(47, t + dur);
    og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(a * .09, t + m); og.gain.linearRampToValueAtTime(0, t + dur); os.connect(og).connect(pn || dest); os.start(t); os.stop(t + dur + .05);
  }
  function update(dt, p) {
    const ac = o.ctx(); if (!ac || ac.state !== "running" || !o.on()) { S.step = 0; return; }
    const out = o.out(), t = ac.currentTime + .01;
    // 足音
    if (p.moving && p.surface) {
      S.step += dt;
      if (S.step > .56) { S.step = 0; const a = o.duck?.() ?? 1; foot(ac, out, t, p.surface, a);
        if (p.wall != null && p.wall < 7) { const lag = 2 * Math.max(.6, p.wall) / 343, lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = "lowpass"; lp.frequency.value = 2400; g.gain.value = .5 * (1 - p.wall / 8); lp.connect(g).connect(out); foot(ac, lp, t + lag, p.surface, a * .9); }
        o.pulse?.(.35); }
      if (p.surface !== S.surf) { const was = S.surf; S.surf = p.surface; if (was) o.tag?.("foot", `足音：${SURF_LABEL[p.surface] || p.surface}${p.wall != null && p.wall < 7 ? "（近くの壁から返る音つき）" : ""}`); }
    } else S.step = .3;
    // 車の地点（近いときだけ、ときどき一台）
    for (const zn of S.zones) {
      const d = Math.hypot(zn.x - p.x, zn.z - p.z), st = S.z[zn.id] ||= { next: Math.random() * 2 };
      if (d > zn.r) { st.next = Math.min(st.next, 1.5); continue; }
      st.next -= dt; if (st.next > 0) continue;
      st.next = zn.every * (.6 + Math.random() * .8);
      const k = Math.max(0, 1 - d / zn.r), ang = Math.atan2(zn.x - p.x, zn.z - p.z) - (p.yaw || 0);
      car(ac, out, t, .42 * k * k * (o.duck?.() ?? 1) + .02, 2.2 + Math.random() * 1.2, Math.max(-.85, Math.min(.85, -Math.sin(ang - Math.PI) * .9)) * (Math.random() < .5 ? 1 : -1));
      o.pulse?.(.6); o.tag?.(zn.id, zn.label, zn);
    }
  }
  function play(kind, dest) {   // 触れたとき：はっきり鳴らす
    const ac = o.ctx(); if (!ac) return; const t = ac.currentTime + .05, out = dest || o.out();
    if (kind === "cars") { for (let k = 0; k < 4; k++) car(ac, out, t + k * 3.1 + Math.random() * .6, .5, 2.6, k % 2 ? .8 : -.8); return 13; }
    if (SURF_LABEL[kind]) { for (let k = 0; k < 6; k++) foot(ac, out, t + k * .56, kind, 1.1); return 4; }
    return 0;
  }
  S.update = update; S.play = play; S.foot = (kind, dest) => { const ac = o.ctx(); if (ac) foot(ac, dest || o.out(), ac.currentTime + .02, kind, 1); };
  return S;
}
