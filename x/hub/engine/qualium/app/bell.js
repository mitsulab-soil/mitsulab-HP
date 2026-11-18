/* Qualia/walk 川越 ── 組み立てた鐘の音（③ 再現音の素材。2026-10-22）
   時の鐘の録音ではない。梵鐘に一般的な、低い唸り（うなり）とゆっくり消える倍音を、正弦波を重ねて組み立てた模式。
   鐘の高さは模式。
   遠いほど遅れて（音の速さ 秒速約 340 m）、高い音が先に弱まる（空気の吸収の模式）。 */
export class BellSynth {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext; this.ac = new AC(); this.out = this.ac.createGain(); this.out.gain.value = .55;
    const comp = this.ac.createDynamicsCompressor(); comp.threshold.value = -14; this.out.connect(comp).connect(this.ac.destination); this.live = []; this.timers = [];
  }
  resume() { if (this.ac.state !== "running") this.ac.resume().catch(() => { }); }
  strike(at = 0, { gain = .7, dist = 0, hard = false } = {}) {
    const ac = this.ac, t = ac.currentTime + at + dist / 340, f0 = 128;   // 仮の基音
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = Math.max(900, 9000 - dist * 18); lp.connect(this.out);
    const att = gain * Math.max(.18, 1 - dist / 900);
    const parts = [[.5, .55, 16], [1, 1, 11], [1.007, .5, 11], [1.68, .32, 7], [2.0, .42, 8], [2.016, .2, 8], [2.74, .2, 5], [3.8, .12, 3.2], [5.3, .07, 2]];   // [比, 強さ, 消える秒]（うなりは近い二つの高さで）
    for (const [r, a, dec] of parts) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = f0 * r;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(att * a * (hard && r > 2 ? 1.6 : 1), t + .006); g.gain.exponentialRampToValueAtTime(.0004, t + dec * (hard ? .6 : 1));
      o.connect(g).connect(lp); o.start(t); o.stop(t + dec + .1); this.live.push(o);
    }
    const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * .08, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 420; const ng = ac.createGain(); ng.gain.value = att * .5; n.buffer = b; n.connect(bp).connect(ng).connect(lp); n.start(t);   // 撞木が当たる音
  }
  sequence(times, opt = {}) { this.stop(); this.resume(); for (const s of times) this.strike(s, opt); }
  stop() { for (const o of this.live) { try { o.stop(); } catch { } } this.live.length = 0; }
}
