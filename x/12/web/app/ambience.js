/* 町に置いた音を、近づくと鳴らす ── Qualium 川越（2026-10-24）
   ・音のファイルは、近づいたとき（半径＋40 m）か触れたときに初めて読む（起動を重くしない）
   ・同時に鳴らすのは近いものから 3 つまで。碧が話しているあいだは小さくする
   ・組み立てる音（③ 再現音・④ 詩の音）は、ここで正弦波と雑音から作る。録音ではない
   使い方：const A = makeAmbience({ ctx, out, on(cat), duck(), tag(spot) }); A.setSpots(list); 毎こま A.update(dt, { x, z, yaw, active }); 触れたら A.play(spot, { dist }) */
export function makeAmbience(o) {
  const S = { spots: [], st: {}, buf: {}, load: {}, lastClock: "", live: [] };
  let NB = null;
  const track = n => { S.live.push(n); n.onended = () => { const i = S.live.indexOf(n); if (i >= 0) S.live.splice(i, 1); }; };
  const noise = ac => { if (!NB || NB.sampleRate !== ac.sampleRate) { NB = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(); s.buffer = NB; return s; };
  const env = (ac, g, t, a, at, dec) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + at); g.gain.exponentialRampToValueAtTime(.0004, t + at + dec); };
  function tone(ac, dest, t, f, a, dec, type = "sine", at = .003) { const os = ac.createOscillator(), g = ac.createGain(); os.type = type; os.frequency.value = f; env(ac, g, t, a, at, dec); os.connect(g).connect(dest); os.start(t); os.stop(t + at + dec + .05); track(os); return os; }
  function nz(ac, dest, t, f, q, a, dec, type = "bandpass", at = .002) { const s = noise(ac), fl = ac.createBiquadFilter(), g = ac.createGain(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; env(ac, g, t, a, at, dec); s.connect(fl).connect(g).connect(dest); s.start(t, Math.random()); s.stop(t + at + dec + .05); track(s); }
  const YO = [0, 2, 5, 7, 9];   // 笛の節の模式（陽の音階の五つの音。決まった曲ではない）
  /* ---------- 組み立てる音（どれも模式） ---------- */
  const SYN = {
    tsuchi(ac, d, t) {   // 鉄を打つ槌：重い一打と軽い二打（金属の響きは調和しない倍音を重ねる）
      [[0, 1], [.42, .55], [.7, .5], [1.5, 1], [1.92, .55], [2.2, .5]].forEach(([k, a]) => { const r = .97 + Math.random() * .06;
        [[1180, .16, .5], [2710, .1, .32], [4030, .06, .2], [5650, .03, .12]].forEach(([f, aa, dec]) => tone(ac, d, t + k, f * r, aa * a, dec)); nz(ac, d, t + k, 3000, .8, .12 * a, .03); });
      return 3.2; },
    soroban(ac, d, t) {   // 算盤の珠：硬い木の小さなこすれと当たり。二つ三つのまとまりで
      let k = 0; for (let b = 0; b < 3; b++) { const n = 3 + Math.floor(Math.random() * 6); for (let i = 0; i < n; i++) { k += .045 + Math.random() * .08; nz(ac, d, t + k, 3200 + Math.random() * 1400, 9, .22, .018); tone(ac, d, t + k, 1900 + Math.random() * 500, .025, .02); } k += .35 + Math.random() * .4; }
      return k + .3; },
    ro(ac, d, t) {   // 櫓のきしみ（木がこすれる低い唸り）と、舟べりの水
      for (let i = 0; i < 3; i++) { const t0 = t + i * 2.7, os = ac.createOscillator(), bp = ac.createBiquadFilter(), g = ac.createGain();
        os.type = "sawtooth"; os.frequency.setValueAtTime(70, t0); os.frequency.linearRampToValueAtTime(118, t0 + .7); os.frequency.linearRampToValueAtTime(84, t0 + 1.1);
        bp.type = "bandpass"; bp.frequency.value = 760; bp.Q.value = 6; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.05, t0 + .25); g.gain.linearRampToValueAtTime(0, t0 + 1.15);
        os.connect(bp).connect(g).connect(d); os.start(t0); os.stop(t0 + 1.2); track(os);
        nz(ac, d, t0 + 1.0, 420, .7, .13, 1.2, "lowpass", .35); nz(ac, d, t0 + 1.4, 1400, 1.5, .03, .5); }
      return 8.4; },
    hayashi(ac, d, t, o = {}) {   // 大太鼓・締太鼓（二つ）・笛・鉦の音色を借りた模式の一節。拍子と節は決まった曲ではない
      const bt = o.beat || .23, n = o.n || 32, base = o.f0 || 1046, pan = o.pan; let dest = d;
      if (pan != null && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; p.connect(d); dest = p; }
      for (let i = 0; i < n; i++) { const tt = t + i * bt + (Math.random() - .5) * .012;
        if (i % 4 === 0) { tone(ac, dest, tt, 68, .32, .38); nz(ac, dest, tt, 180, .7, .14, .12, "lowpass"); }   // 大太鼓
        if (i % 2 === 1 || Math.random() < .35) { tone(ac, dest, tt, 390 + (i % 2) * 18, .1, .07); nz(ac, dest, tt, 2400, 2, .09, .04); }   // 締太鼓
        if (i % 4 === 2) [2350, 3620, 5180].forEach((f, k) => tone(ac, dest, tt, f, .035 / (k + 1), .22));   // 鉦
      }
      let k = 0; while (k < n * bt - .3) { const dur = bt * (Math.random() < .5 ? 2 : 1), deg = YO[Math.floor(Math.random() * 5)] + (Math.random() < .3 ? 12 : 0), f = base * Math.pow(2, deg / 12);
        const os = ac.createOscillator(), lf = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(); os.type = "sine"; os.frequency.value = f; lf.frequency.value = 5.5; lg.gain.value = f * .006; lf.connect(lg).connect(os.frequency);
        g.gain.setValueAtTime(0, t + k); g.gain.linearRampToValueAtTime(.045, t + k + .03); g.gain.setValueAtTime(.04, t + k + dur * .8); g.gain.linearRampToValueAtTime(0, t + k + dur);
        os.connect(g).connect(dest); os.start(t + k); lf.start(t + k); os.stop(t + k + dur + .02); lf.stop(t + k + dur + .02); track(os); track(lf); nz(ac, dest, t + k, f * 1.5, 1.2, .006, dur * .8); k += dur; }   // 笛（息のまじる正弦波）
      return n * bt + .6; },
    hikkawase(ac, d, t) { const a = SYN.hayashi(ac, d, t, { pan: -.75, beat: .23, n: 40, f0: 1046 }); SYN.hayashi(ac, d, t + .5, { pan: .75, beat: .205, n: 44, f0: 1175 }); return Math.max(a, 44 * .205 + 1.1); },
    dashi(ac, d, t) {   // 山車の大きな木の車輪：低い地響きと、ときどき木のきしみ
      nz(ac, d, t, 120, .7, .2, 4.2, "lowpass", 1.2);
      [.6, 1.9, 3.1].forEach(k => { const os = ac.createOscillator(), bp = ac.createBiquadFilter(), g = ac.createGain(), t0 = t + k + Math.random() * .3; os.type = "sawtooth"; os.frequency.setValueAtTime(46, t0); os.frequency.linearRampToValueAtTime(63, t0 + .5);
        bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 5; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.07, t0 + .15); g.gain.linearRampToValueAtTime(0, t0 + .6); os.connect(bp).connect(g).connect(d); os.start(t0); os.stop(t0 + .65); track(os); });
      return 5.6; },
    furin(ac, d, t) {   // ガラスの風鈴：舌が当たる小さな音と、高い澄んだ響き。いくつかが少しずつ違う高さで
      const n = 3 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) { const tt = t + Math.random() * 3.2, f = 2450 + Math.random() * 900;
        tone(ac, d, tt, f, .05, 1.8); tone(ac, d, tt, f * 2.37, .02, 1.1); tone(ac, d, tt, f * 3.9, .01, .6); nz(ac, d, tt, 6000, 3, .03, .01); }
      return 5.2; },
    suzu(ac, d, t) {   // 鈴：小さな金属の玉がころがる音を、ふるたびに重ねる
      for (let sh = 0; sh < 3; sh++) for (let i = 0; i < 14; i++) { const tt = t + sh * .42 + Math.random() * .3; tone(ac, d, tt, 2900 + Math.random() * 1800, .022, .28); }
      return 2.2; },
    kogera(ac, d, t) {   // 小さなキツツキが木をつつく：細かい連打がだんだん弱まる
      for (let b = 0; b < 2; b++) { const t0 = t + b * 1.6, n = 10 + Math.floor(Math.random() * 6); for (let i = 0; i < n; i++) { const a = .2 * (1 - i / n * .6); nz(ac, d, t0 + i * .055, 1350, 3, a, .022); tone(ac, d, t0 + i * .055, 620, a * .3, .03); } }
      return 3.4; },
    amai(ac, d, t) {   // ④ 甘い町の午後：やわらかい音の粒（遅れて返る響きつき）
      const dl = ac.createDelay(1), fb = ac.createGain(), wet = ac.createGain(), lp = ac.createBiquadFilter(); dl.delayTime.value = .33; fb.gain.value = .42; wet.gain.value = .5; lp.type = "lowpass"; lp.frequency.value = 2600;
      const bus = ac.createGain(); bus.connect(d); bus.connect(dl); dl.connect(lp).connect(fb).connect(dl); lp.connect(wet).connect(d);
      for (let i = 0; i < 9; i++) { const f = 784 * Math.pow(2, YO[Math.floor(Math.random() * 5)] / 12) * (Math.random() < .3 ? 2 : 1), tt = t + i * .38 + Math.random() * .08; tone(ac, bus, tt, f, .06, 1.1, "triangle", .01); tone(ac, bus, tt, f * 2, .012, .5); }
      return 6; },
    tsuchikabe(ac, d, t) {   // ④ 土の壁が火を飲む：外のざわめきが、厚い壁の内では低く遠くなる
      const s = noise(ac), lp = ac.createBiquadFilter(), g = ac.createGain(); s.loop = true; lp.type = "lowpass"; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(160, t + 4.5);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + 1.2); g.gain.linearRampToValueAtTime(.07, t + 4.5); g.gain.linearRampToValueAtTime(0, t + 7); s.connect(lp).connect(g).connect(d); s.start(t); s.stop(t + 7.1); track(s);
      tone(ac, d, t + 3.8, 55, .12, 3.2, "sine", .8); tone(ac, d, t + 3.8, 82.5, .05, 2.6, "sine", .8);
      return 7.2; },
  };
  /* ---------- 音のファイル ---------- */
  function getBuf(sp) {
    const ac = o.ctx(); if (!ac || !sp.f) return null; if (S.buf[sp.f]) return Promise.resolve(S.buf[sp.f]);
    return S.load[sp.f] ||= fetch(sp.f + "?v=" + (o.ver || 1)).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej))).then(b => (S.buf[sp.f] = b)).catch(e => { console.warn("snd", sp.f, e); delete S.load[sp.f]; return null; });
  }
  function shot(ac, dest, sp, t) {
    if (sp.syn) return SYN[sp.syn](ac, dest, t);
    const b = S.buf[sp.f]; if (!b) return 0; const s = ac.createBufferSource(); s.buffer = b; s.connect(dest); s.start(t); track(s); return b.duration;
  }
  function chain(ac, pan) { const g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null; g.gain.value = 0; if (p) { p.pan.value = pan; g.connect(p).connect(o.out()); } else g.connect(o.out()); return { g, p }; }
  const panOf = (sp, p) => { const dx = sp.x - p.x, dz = sp.z - p.z, L = Math.hypot(dx, dz) || 1, y = p.yaw || 0; return Math.max(-.9, Math.min(.9, (dx * Math.cos(y) - dz * Math.sin(y)) / L)); };
  const inSeason = a => { const now = new Date(), m = now.getMonth() + 1, h = now.getHours() + now.getMinutes() / 60; return (!a.months || a.months.includes(m)) && (!a.hours || (h >= a.hours[0] && h < a.hours[1])); };
  function stopBed(st) { if (!st.bed) return; const ac = o.ctx(); try { st.bed.ch.g.gain.setTargetAtTime(0, ac.currentTime, .4); const s = st.bed.src; setTimeout(() => { try { s.stop(); } catch { } }, 1600); } catch { } st.bed = null; }
  function update(dt, p) {
    const ac = o.ctx(); const run = ac && ac.state === "running" && p.active;
    const duck = o.duck?.() ?? 1;
    // 近いものから 3 つまで（層・季節・時刻が合うもの）
    const cand = [];
    for (const sp of S.spots) { const st = S.st[sp.id] ||= { next: 2 + Math.random() * 4, told: -1e9 }; st.d = Math.hypot(sp.x - p.x, sp.z - p.z, p.h || 0);   // 空の上では、高さの分だけ遠い
      if (sp.f && st.d < (sp.amb?.r || 0) + 40) getBuf(sp);
      st.want = !!(run && sp.amb && o.on(sp.cat) && st.d < sp.amb.r && inSeason(sp.amb)); if (st.want) cand.push(sp); }
    cand.sort((a, b) => S.st[a.id].d - S.st[b.id].d); const keep = new Set(cand.slice(0, 3).map(s => s.id));
    const now = performance.now() / 1000;
    for (const sp of S.spots) { const st = S.st[sp.id], on = keep.has(sp.id);
      if (!on) { stopBed(st); continue; }
      const k = Math.pow(Math.max(0, 1 - st.d / sp.amb.r), 1.4), gain = (sp.amb.gain || 1) * k * duck, pan = panOf(sp, p);
      if (now - st.told > 90 && k > .15) { st.told = now; o.tag?.(sp); }
      if (sp.amb.bed) {
        if (!st.bed && S.buf[sp.f]) { const src = ac.createBufferSource(); src.buffer = S.buf[sp.f]; src.loop = true; const ch = chain(ac, pan); src.connect(ch.g); src.start(ac.currentTime + .05, Math.random() * S.buf[sp.f].duration); st.bed = { src, ch }; }
        if (st.bed) { st.bed.ch.g.gain.setTargetAtTime(gain * .9, ac.currentTime, .5); st.bed.ch.p?.pan.setTargetAtTime(pan, ac.currentTime, .3); }
        continue; }
      st.next -= dt; if (st.next > 0) continue;
      if (sp.f && !S.buf[sp.f]) { st.next = 1; continue; }
      const ch = chain(ac, pan); ch.g.gain.value = gain * .95; const dur = shot(ac, ch.g, sp, ac.currentTime + .05);
      st.next = Math.max(dur + 2, sp.amb.every * (.6 + Math.random() * .8));
    }
    // 時の鐘が鳴る時刻（6・12・15・18 時ちょうど）
    const d = new Date(), key = `${d.getDate()}-${d.getHours()}`;
    if (run && d.getMinutes() === 0 && key !== S.lastClock) { const sp = S.spots.find(s => s.clock?.includes(d.getHours()));
      if (sp && o.on(sp.cat)) { S.lastClock = key; const dist = Math.hypot((o.bell?.x ?? sp.x) - p.x, (o.bell?.z ?? sp.z) - p.z); play(sp, { dist, clock: d.getHours() }); } }
  }
  /* 触れたとき：一回はっきり鳴らす（遠いほど小さく遅れて） */
  async function play(sp, opt = {}) {
    const ac = o.ctx(); if (!ac) return 0; if (sp.f) await getBuf(sp);
    const ch = chain(ac, 0), dist = opt.dist || 0; ch.g.gain.value = Math.max(.15, 1 - dist / 900) * 1.1;
    const t = ac.currentTime + .05 + dist / 340, dur = shot(ac, ch.g, sp, t); o.tag?.(sp, opt); return dur + dist / 340;
  }
  function stop() { for (const s of S.live) { try { s.stop(); } catch { } } S.live.length = 0; for (const id in S.st) stopBed(S.st[id]); }
  return { setSpots(l) { S.spots = l; }, update, play, stop, S };
}
