/* 再現音（Web Audio）。録音ではない。音はひとりでには鳴らさない＝start() は押したときだけ呼ぶ。
   出口は必ず 音量 → 圧縮（やわらかい上限）→ 出力。既定の音量は小さめ。 */
export class Synth {
  constructor() { this.ctx = null; this.running = null; this.onEvent = null; this.vol = .35; }
  ensure() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext; const c = this.ctx = new C();
    this.master = c.createGain(); this.master.gain.value = this.vol;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 8; comp.attack.value = .003; comp.release.value = .25;
    this.an = c.createAnalyser(); this.an.fftSize = 1024; this.an.smoothingTimeConstant = .7;
    this.master.connect(comp); comp.connect(this.an); this.an.connect(c.destination);
    // 雑音の素
    const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .05); }
  level() { if (!this.an) return 0; const a = new Uint8Array(this.an.fftSize); this.an.getByteTimeDomainData(a); let s = 0; for (const x of a) { const y = (x - 128) / 128; s += y * y; } return Math.sqrt(s / a.length); }
  spectrum(out) { if (this.an) this.an.getByteFrequencyData(out); }
  stop() { if (this.running) { this.running.stop(); this.running = null; } }
  start(id) {
    this.ensure(); this.ctx.resume(); this.stop();
    const c = this.ctx, bus = c.createGain(); bus.gain.value = 0; bus.connect(this.master);
    bus.gain.setTargetAtTime(1, c.currentTime, .08);
    let alive = true, timers = [], nodes = [];
    const emit = (kind, v = 1, delay = 0) => { const t = setTimeout(() => alive && this.onEvent?.(kind, v), delay * 1000); timers.push(t); };
    const at = () => c.currentTime + .02;
    const noiseSrc = () => { const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; };
    const sched = (fn, next) => { const loop = () => { if (!alive) return; fn(); timers.push(setTimeout(loop, next() * 1000)); }; loop(); };

    if (id === "ae") {
      // 一打＝短い減衰の打音。もとの超音波の一打を 1/64 の高さに。長さは聴きとれるよう 20〜70 ms に（数百倍）
      sched(() => {
        const t = at(), f = 1600 + Math.random() * 6000, dur = .02 + Math.random() * .05, amp = .25 + Math.random() * .6;
        const s = noiseSrc(), bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 6 + Math.random() * 10;
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .0015); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
        const o = c.createOscillator(); o.frequency.value = f * (.8 + Math.random() * .4); const og = c.createGain(); og.gain.setValueAtTime(amp * .35, t); og.gain.exponentialRampToValueAtTime(.0003, t + dur * 1.4);
        s.connect(bp); bp.connect(g); g.connect(bus); o.connect(og); og.connect(bus);
        s.start(t, Math.random()); s.stop(t + dur + .05); o.start(t); o.stop(t + dur * 1.5 + .05);
        emit("ae", amp, .02);
        if (Math.random() < .25) emit("ae2", amp * .5, .03 + Math.random() * .1);
      }, () => .15 + Math.random() * Math.random() * 1.6);
    }
    if (id === "sway") {
      // 画面の木のゆれ（0.32 Hz）を 200 倍＝約 64 Hz の唸りに。強い風で少し速く＝少し高く。風の強さ＝大きさ
      const o1 = c.createOscillator(), o2 = c.createOscillator(); o1.type = "sine"; o2.type = "triangle";
      o1.frequency.value = 64; o2.frequency.value = 128.6;
      const g = c.createGain(), g2 = c.createGain(); g.gain.value = .0; g2.gain.value = .0;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
      const wn = noiseSrc(), wf = c.createBiquadFilter(); wf.type = "bandpass"; wf.frequency.value = 700; wf.Q.value = .5; const wg = c.createGain(); wg.gain.value = 0;
      o1.connect(g); o2.connect(g2); g.connect(lp); g2.connect(lp); lp.connect(bus); wn.connect(wf); wf.connect(wg); wg.connect(bus);
      o1.start(); o2.start(); wn.start(); nodes.push(o1, o2, wn);
      sched(() => {
        const t = c.currentTime, gust = .25 + Math.random() * .75, len = 2 + Math.random() * 3;
        g.gain.setTargetAtTime(.5 * gust, t, .6); g2.gain.setTargetAtTime(.12 * gust, t, .6);
        wg.gain.setTargetAtTime(.05 * gust, t, .5);
        const fz = .32 * (1 + .12 * gust) * 200; o1.frequency.setTargetAtTime(fz, t, 1.2); o2.frequency.setTargetAtTime(fz * 2.01, t, 1.2);
        g.gain.setTargetAtTime(.12, t + len * .6, 1.2); g2.gain.setTargetAtTime(.03, t + len * .6, 1.2); wg.gain.setTargetAtTime(.012, t + len * .6, 1);
        emit("gust", gust);
      }, () => 3 + Math.random() * 3);
    }
    if (id === "soil") {
      // こする・掘る（ざらつき）と、ときどき小さなはじけ
      sched(() => {
        const t = at(), dur = .08 + Math.random() * .5, amp = .1 + Math.random() * .4;
        const s = noiseSrc(), hp = c.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = 900 + Math.random() * 3500; hp.Q.value = 1.5;
        const am = c.createGain(), g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + dur * .3); g.gain.linearRampToValueAtTime(0, t + dur);
        const lfo = c.createOscillator(); lfo.frequency.value = 18 + Math.random() * 40; const lg = c.createGain(); lg.gain.value = .5; am.gain.value = .5; lfo.connect(lg); lg.connect(am.gain);
        s.connect(hp); hp.connect(am); am.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + .05); lfo.start(t); lfo.stop(t + dur + .05);
        emit("dig", amp);
        if (Math.random() < .4) { const t2 = t + Math.random() * dur, o = c.createOscillator(), og = c.createGain(); o.frequency.value = 2500 + Math.random() * 3000; og.gain.setValueAtTime(.15, t2); og.gain.exponentialRampToValueAtTime(.0003, t2 + .015); o.connect(og); og.connect(bus); o.start(t2); o.stop(t2 + .03); emit("tick", .5, t2 - c.currentTime); }
      }, () => .12 + Math.random() * .7);
    }
    if (id === "vib") {
      // 短い脈の連なり（数十〜数百 Hz）。呼んで、間をおいて、また呼ぶ
      sched(() => {
        const t0 = at(), base = 90 + Math.random() * 160, n = 4 + (Math.random() * 10 | 0), gap = .05 + Math.random() * .06;
        for (let i = 0; i < n; i++) {
          const t = t0 + i * gap, o = c.createOscillator(), g = c.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(base * (1 + i * .015), t);
          const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + gap * .8);
          o.connect(lp); lp.connect(g); g.connect(bus); o.start(t); o.stop(t + gap);
          emit("pulse", 1 - i / n * .5, t - c.currentTime);
        }
      }, () => 1.2 + Math.random() * 2.2);
    }
    if (id === "bat") {
      // 87→43 kHz・約 5 ms を 1/16＝約 5.4→2.7 kHz・約 80 ms。探す・近づく（間が詰まる）をくり返す
      let k = 0;
      sched(() => {
        const t = at(), approach = (k % 14) > 9, dur = approach ? .045 : .08, f0 = 5440, f1 = 2700;
        const o = c.createOscillator(), g = c.createGain(); o.type = "sine";
        o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .02);
        emit("chirp", 1); k++;
      }, () => (k % 14) > 9 ? .09 : .2 + Math.random() * .04 + ((k % 14) === 0 ? .9 : 0));
    }
    if (id === "ele") {
      // 18 Hz・12 秒を 8 倍の高さ・1/8 の長さに＝およそ 144 Hz・1.5 秒の唸り。倍音を少し
      sched(() => {
        const t = at(), f = 112 + Math.random() * 80, dur = 1.25 + Math.random() * .6;
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.42, t + .35); g.gain.setValueAtTime(.42, t + dur - .4); g.gain.linearRampToValueAtTime(0, t + dur);
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 2;
        for (const [m, a] of [[1, 1], [2, .35], [3, .15]]) {
          const o = c.createOscillator(), og = c.createGain(); o.type = "sine"; og.gain.value = a;
          o.frequency.setValueAtTime(f * m * .96, t); o.frequency.linearRampToValueAtTime(f * m * 1.04, t + dur * .45); o.frequency.linearRampToValueAtTime(f * m * .92, t + dur);
          o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + .05);
        }
        lp.connect(g); g.connect(bus);
        emit("rumble", 1, .05);
      }, () => 3.2 + Math.random() * 2);
    }
    this.running = {
      stop: () => { alive = false; timers.forEach(clearTimeout); bus.gain.setTargetAtTime(0, c.currentTime, .06); setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch {} }); bus.disconnect(); }, 500); },
    };
  }
}
