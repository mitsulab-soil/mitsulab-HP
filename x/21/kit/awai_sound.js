/* © mitsulab. 抽象と具体のあわい ── 音（2026-11-06・x/20・21・22 で使い回す）
   Web Audio の合成だけ（録音の素材なし）。最初は鳴らない。画面に触れて、はじめて鳴る（ブラウザの決まりでもある）。
   音色は作品として作る。リズムと間は各アプリの資料/音の対応表.md の根拠に従う。聴こえない営みは「聴こえる高さに移した模式」。
   残響は一つの部屋（参道の木立を思わせる 2.6 秒の減衰。作品の設定の値）。 */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// 陽の音階（D・E・G・A・B）。i は 0 = D4。作品の設定の値
const YO = [0, 2, 5, 7, 9];
export const note = (i, base = 293.66) => { const o = Math.floor(i / 5), k = ((i % 5) + 5) % 5; return base * Math.pow(2, o + YO[k] / 12); };

export function createSound(btn) {
  let ctx = null, master, comp, send, rev, on = false, muted = false;
  const ensure = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .3;
    master.connect(comp).connect(ctx.destination);
    // 残響：減衰する雑音から作る（右と左で別の雑音）
    const len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { const x = Math.random() * 2 - 1; lp += (x - lp) * (.35 - .25 * i / len); d[i] = lp * Math.pow(1 - i / len, 2.6); } }
    rev = ctx.createConvolver(); rev.buffer = ir; send = ctx.createGain(); send.gain.value = .55; send.connect(rev).connect(master);
    return ctx;
  };
  const setBtn = () => { if (btn) btn.setAttribute("aria-pressed", on && !muted ? "true" : "false"); };
  const start = () => { const c = ensure(); if (!c) return; c.resume?.(); if (!on) { on = true; master.gain.setTargetAtTime(.9, c.currentTime, .4); bed(); } setBtn(); };
  if (btn) btn.addEventListener("click", e => { e.stopPropagation(); if (!on) { start(); return; } muted = !muted; master.gain.setTargetAtTime(muted ? 0 : .9, ctx.currentTime, .15); setBtn(); });
  const ok = () => on && !muted && ctx && ctx.state === "running";

  // 一つの声の出口：（閉じた音＝低域だけ）→ 左右 → 大きさ → そのまま＋残響へ
  const out = (o, dur) => {
    const t = ctx.currentTime + (o.at || 0), g = ctx.createGain(); g.gain.value = o.gain ?? .3;
    let head = g;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; f.Q.value = .4; f.connect(g); head = f; }
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) { p.pan.value = clamp(o.pan || 0, -1, 1); g.connect(p); p.connect(master); } else g.connect(master);
    const w = ctx.createGain(); w.gain.value = o.wet ?? .5; g.connect(w); w.connect(send);
    setTimeout(() => { try { g.disconnect(); w.disconnect(); p?.disconnect(); } catch (e) { } }, (dur + (o.at || 0) + 3.5) * 1000);
    return { t, head };
  };
  const env = (gn, t, a, peak, d) => { gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(peak, t + a); gn.gain.setTargetAtTime(0, t + a, d / 4); };

  // 木の棒を打った音（自由端の棒の倍音 1：2.76：5.40：8.93）
  const wood = (f, o = {}) => { if (!ok()) return; const dur = 1.6 * (o.decay || 1), { t, head } = out(o, dur);
    [[1, 1, 1], [2.756, .42, .45], [5.404, .2, .22], [8.933, .08, .12]].forEach(([r, a, d]) => { const os = ctx.createOscillator(), gn = ctx.createGain(); os.frequency.value = f * r; env(gn, t, .004, a, dur * d); os.connect(gn).connect(head); os.start(t); os.stop(t + dur * d + .6); }); };
  // 小さな鉦（倍音をずらした鐘の響き）
  const bell = (f, o = {}) => { if (!ok()) return; const dur = 2.8 * (o.decay || 1), { t, head } = out(o, dur);
    // 11-06：倍音はおりんに近い 1：2.76：5.40：8.93。各音を ±4 セントずらした 2 本で重ね、ゆっくりうなる（電子の素の音にしない）
    [[1, 1, 1], [2.756, .42, .62], [5.404, .2, .4], [8.933, .07, .22]].forEach(([r, a, d]) => { for (const dc of [-4, 4]) { const os = ctx.createOscillator(), gn = ctx.createGain(); os.frequency.value = f * r; os.detune.value = dc * (1 + r * .15); env(gn, t, .006, a * .4, dur * d); os.connect(gn).connect(head); os.start(t); os.stop(t + dur * d + .8); } }); };
  // 羽音：基音そのもの（ミツバチ 約 230 Hz）。のこぎり波を帯で絞り、はばたきの揺れ
  const hum = (f, dur = 1.4, o = {}) => { if (!ok()) return; const { t, head } = out(o, dur);
    // 11-06：基音 230 Hz と 2・3 倍の三角波。音量に浅い揺れ（23 Hz）、高さにゆるい揺れ（ホバリングの修正）
    const gn = ctx.createGain(), am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), amL = ctx.createOscillator(), amG = ctx.createGain(), bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = f * 2; bp.Q.value = .5;
    lfo.frequency.value = 3.1; lg.gain.value = f * .012; amL.frequency.value = 23; amG.gain.value = .18; am.gain.value = .82; amL.connect(amG).connect(am.gain);
    const oss = [[1, 1], [2, .5], [3, .28]].map(([r, a]) => { const os = ctx.createOscillator(), g1 = ctx.createGain(); os.type = "triangle"; os.frequency.value = f * r; g1.gain.value = a; lfo.connect(lg).connect(os.frequency); os.connect(g1).connect(bp); return os; });
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.55, t + .25); gn.gain.setValueAtTime(.55, t + dur - .4); gn.gain.linearRampToValueAtTime(0, t + dur);
    bp.connect(am).connect(gn).connect(head); for (const os of [...oss, lfo, amL]) { os.start(t); os.stop(t + dur + .1); } };
  // 短い鳴き（模式。高さは聴きやすい所へ移してある）
  const chirp = (f0, f1, dur = .14, o = {}) => { if (!ok()) return; const { t, head } = out(o, dur);
    const os = ctx.createOscillator(), gn = ctx.createGain(); os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.45, t + .012); gn.gain.setTargetAtTime(0, t + dur * .6, dur * .25);
    os.connect(gn).connect(head); os.start(t); os.stop(t + dur + .3); };
  // 息・風・葉ずれ（雑音を帯で絞る）
  let nb = null; const noiseBuf = () => { if (nb) return nb; nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return nb; };
  const breath = (dur = 1.5, o = {}) => { if (!ok()) return; const { t, head } = out(o, dur);
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), gn = ctx.createGain(); s.buffer = noiseBuf(); s.loop = true;
    bp.type = "bandpass"; bp.frequency.setValueAtTime(o.f0 || 900, t); bp.frequency.linearRampToValueAtTime(o.f1 || o.f0 || 900, t + dur); bp.Q.value = o.q || 1.2;
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.5, t + dur * .35); gn.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(bp).connect(gn).connect(head); s.start(t); s.stop(t + dur + .1); };
  // 土の上の一歩（低い雑音の短い粒。木の打音にしない）
  const step = (o = {}) => { if (!ok()) return; const { t, head } = out({ wet: .2, ...o }, .2);
    const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), gn = ctx.createGain(); s.buffer = noiseBuf(); lp.type = "lowpass"; lp.frequency.value = o.f || 520; lp.Q.value = .7;
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.9, t + .012); gn.gain.exponentialRampToValueAtTime(.001, t + .11); s.connect(lp).connect(gn).connect(head); s.start(t, Math.random() * 1.5); s.stop(t + .14); };
  // 場の音：木立の風と葉ずれ（ごく小さく・途切れない）。鳴りはじめてから、ずっと地にある
  let bedOn = false; const bed = () => { if (bedOn || !ctx) return; bedOn = true; const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(); s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; const g = ctx.createGain(); g.gain.value = .022;
    const hp = ctx.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = 2600; hp.Q.value = .8; const g2 = ctx.createGain(); g2.gain.value = .006;
    const l1 = ctx.createOscillator(), lg1 = ctx.createGain(); l1.frequency.value = 1 / 11; lg1.gain.value = .012; l1.connect(lg1).connect(g.gain);
    const l2 = ctx.createOscillator(), lg2 = ctx.createGain(); l2.frequency.value = 1 / 7.3; lg2.gain.value = .005; l2.connect(lg2).connect(g2.gain);
    s.connect(lp).connect(g).connect(master); s.connect(hp).connect(g2).connect(master); const w = ctx.createGain(); w.gain.value = .3; g2.connect(w).connect(send);
    s.start(t); l1.start(t); l2.start(t); };
  // 機械の読み取り（短い打鍵）
  const click = (o = {}) => { if (!ok()) return; const { t, head } = out({ wet: .25, ...o }, .1);
    const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), gn = ctx.createGain(); s.buffer = noiseBuf(); hp.type = "highpass"; hp.frequency.value = 3200;
    gn.gain.setValueAtTime(.7, t); gn.gain.exponentialRampToValueAtTime(.001, t + .03); s.connect(hp).connect(gn).connect(head); s.start(t); s.stop(t + .05);
    if (o.f) { const os = ctx.createOscillator(), g2 = ctx.createGain(); os.type = "square"; os.frequency.value = o.f; g2.gain.setValueAtTime(.06, t); g2.gain.exponentialRampToValueAtTime(.001, t + .09); os.connect(g2).connect(head); os.start(t); os.stop(t + .1); } };
  // 低い持続（土の中の遅い営み・層の重なり。模式）
  const drone = (f, dur = 4, o = {}) => { if (!ok()) return; const { t, head } = out(o, dur);
    [0, 3.2].forEach(dt => { const os = ctx.createOscillator(), gn = ctx.createGain(); os.type = "triangle"; os.frequency.value = f; os.detune.value = dt;
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.32, t + dur * .4); gn.gain.linearRampToValueAtTime(0, t + dur); os.connect(gn).connect(head); os.start(t); os.stop(t + dur + .1); }); };

  return { start, get on() { return ok(); }, get started() { return on; }, wood, bell, hum, chirp, breath, click, drone, step, note, now: () => ctx ? ctx.currentTime : 0 };
}
