/* 計算×認知場の音楽（Web Audio）。触れるまで鳴らさない。
   次元の対応（資料/音の次元の対応表.md）：
   高さ＝光の周波数を 40 オクターブ下げた値（聴こえる高さに移した模式）／音色＝受けとる側（人＝やわらかい正弦、機械＝細い矩形）
   リズム＝人の句 4 秒（安静時の呼吸 15 回/分）・機械の目 0.1 秒（LiDAR 毎秒 10 回転）／定位＝空間の左右
   残る所＝同じ高さ（澄む）、ずれる所＝近い高さ（うなる）、落ちる所＝短二度の不協和、どちらにも届かない所＝休符 */
export const PHRASE = 4, GRID = .1;

export class Music {
  constructor() { this.ctx = null; this.on = false; this.muted = false; }
  start() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const c = this.ctx = new A({ latencyHint: "interactive" });
    this.out = c.createGain(); this.out.gain.value = 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    const lift = c.createGain(); lift.gain.value = 1.7;   // 圧縮のあとで持ち上げる（小さなスピーカー・展示）
    this.out.connect(comp).connect(lift).connect(c.destination);
    this.out.gain.linearRampToValueAtTime(this.muted ? 0 : .55, c.currentTime + .6);
    // 小さな残響（生成した減衰の雑音）
    const len = c.sampleRate * 2.4 | 0, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.rev = c.createConvolver(); this.rev.buffer = ir; this.revIn = c.createGain(); this.revIn.gain.value = .32; this.revIn.connect(this.rev).connect(this.out);
    // 葉ずれ（風＝フィジカルの声部）。雑音を帯域で絞り、風の強さで息をする
    const nb = c.createBuffer(1, c.sampleRate * 8, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    const n = c.createBufferSource(); n.buffer = nb; n.loop = true;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = .5;
    this.leaf = c.createGain(); this.leaf.gain.value = 0; n.connect(bp).connect(this.leaf); this.leaf.connect(this.out); this.leaf.connect(this.revIn); n.start();
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    this.on = true;
  }
  setMuted(m) { this.muted = m; if (this.ctx) this.out.gain.setTargetAtTime(m ? 0 : .55, this.ctx.currentTime, .08); }
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  grid(t) { return Math.ceil(t / GRID) * GRID; }   // 機械の目（0.1 秒）にそろえる
  _pan(p) { const s = this.ctx.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); return s; }
  // 人の声部：やわらかい正弦＋かすかな二倍音。glide＝次の高さへなめらかに
  human(f, { t = this.now(), dur = 1.4, gain = .16, pan = 0, glide = null, hold = .55 } = {}) {
    if (!this.on || f <= 0) return; const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(), p = this._pan(pan);
    o.type = "sine"; o2.type = "triangle"; o.frequency.setValueAtTime(f, t); o2.frequency.setValueAtTime(f * 3, t); g2.gain.value = .1;   // 三倍音を少し（小さなスピーカーでも高さが分かる）
    if (glide) for (const [tt, ff] of glide) { o.frequency.linearRampToValueAtTime(ff, tt); o2.frequency.linearRampToValueAtTime(ff * 3, tt); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .09); g.gain.setTargetAtTime(0, t + dur * hold, dur * .3);
    o.connect(g); o2.connect(g2).connect(g); g.connect(p); p.connect(this.out); p.connect(this.revIn);
    o.start(t); o2.start(t); o.stop(t + dur * 2.2); o2.stop(t + dur * 2.2);
  }
  // 機械の声部：細い矩形を低域で丸め、短く。始まりは 0.1 秒の目にそろう
  machine(f, { t = this.now(), dur = .22, gain = .07, pan = 0, cut = 2400 } = {}) {
    if (!this.on || f <= 0) return; const c = this.ctx; t = this.grid(t);
    const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), p = this._pan(pan);
    o.type = "square"; o.frequency.setValueAtTime(f, t); lp.type = "lowpass"; lp.frequency.value = cut; lp.Q.value = .4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .006); g.gain.setTargetAtTime(0, t + .02, dur * .45);
    o.connect(lp).connect(g).connect(p); p.connect(this.out); p.connect(this.revIn); o.start(t); o.stop(t + dur * 3 + .1);
    return t;
  }
  // 熱：10 µm を 40 オクターブ下げると約 27 Hz。基音は小さな音具では出ないので倍音で聴かせる（ないはずの基音が聴こえる）
  heat(k, { t = this.now(), pan = 0 } = {}) {
    if (!this.on) return; const c = this.ctx; t = this.grid(t); const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), p = this._pan(pan);
    o.type = "sawtooth"; o.frequency.value = 27.3; lp.type = "lowpass"; lp.frequency.value = 650 + 600 * k;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 + .12 * k, t + .05); g.gain.setTargetAtTime(0, t + .3, .4);
    o.connect(lp).connect(g).connect(p); p.connect(this.out); o.start(t); o.stop(t + 2);
  }
  // LiDAR：一回転ごとの小さな刻み（毎秒 10 回）。強さ＝返りの強さ
  tick(k, { t = this.now(), pan = 0 } = {}) {
    if (!this.on) return; const c = this.ctx; t = this.grid(t); const s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(), p = this._pan(pan);
    s.buffer = this.noise; hp.type = "highpass"; hp.frequency.value = 3800; g.gain.setValueAtTime(.05 * k, t); g.gain.exponentialRampToValueAtTime(.0005, t + .03);
    s.connect(hp).connect(g).connect(p); p.connect(this.out); s.start(t, Math.random(), .05);
  }
  // コウモリの声の模式：60→40 kHz・5 ms の FM を 10 倍に引きのばし、6→4 kHz・50 ms で
  bat({ t = this.now(), pan = 0 } = {}) {
    if (!this.on) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), p = this._pan(pan);
    o.type = "sine"; o.frequency.setValueAtTime(6000, t); o.frequency.exponentialRampToValueAtTime(4000, t + .05);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .004); g.gain.exponentialRampToValueAtTime(.0005, t + .055);
    o.connect(g).connect(p); p.connect(this.out); p.connect(this.revIn); o.start(t); o.stop(t + .07);
  }
  // その場所の音の粒（葉ずれ・砂利・叩いた音の帯域を絞った雑音。模式）。人とマイクの両方に届く高さ
  grain(fc, { t = this.now(), pan = 0, gain = .13 } = {}) {
    if (!this.on) return; const c = this.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), p = this._pan(pan);
    s.buffer = this.noise; bp.type = "bandpass"; bp.frequency.value = fc; bp.Q.value = 2.2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .01); g.gain.setTargetAtTime(0, t + .04, .09);
    s.connect(bp).connect(g).connect(p); p.connect(this.out); p.connect(this.revIn); s.start(t, Math.random() * 7, .5);
  }
  wind(gust) { if (this.on) this.leaf.gain.setTargetAtTime(.012 + .05 * gust, this.ctx.currentTime, .3); }
}
