/* Qualia/sound の音（v2・2026-10-14）：一つの音世界の中で、一行の「読み」を構造として鳴らす
   - 行 → 読み（world.js の compose。代表の行は scores.js の手書きの譜）→ 構造の操作（OPS）を時間に並べる
   - 群れの空間（残響の長さ・暗さ・反射）は、その群れの法則から合成する（録音した残響は使わない）
   - 聴く人のつまみ：遠い＝群れの空間の響きが深く・明るさが落ち・左右が狭まる／硬い＝立ち上がりが速く・音色が角ばる／明るい＝強める倍音が上へ・高さが少し上がる
   どこにも保存・送信しない。外の音源ファイルは使わない。 */
import { compose, OPS, F0 } from "./world.js";
import { SCORES } from "./scores.js";

const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export function seedOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const readingOf = item => compose(item, rng(seedOf(item.t)), SCORES);

export class QSynth {
  constructor() { this.ctx = null; this.cur = null; this.irCache = new Map(); this.onstate = null; }
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      this.attach(new AC());
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}   // iPhone のマナーモードでも鳴るように
    }
    if (this.ctx.state === "suspended") this.ctx.resume?.();
    return this.ctx;
  }
  // 音の道すじ（確かめでは OfflineAudioContext を渡して、鳴らさずに書き出して測る）
  attach(ctx) {
    this.ctx = ctx;
    // 耳を守る：高すぎる音を落とし、圧縮と上限で急な大音量を抑える
    this.hiCut = ctx.createBiquadFilter(); this.hiCut.type = "lowpass"; this.hiCut.frequency.value = 11000; this.hiCut.Q.value = .5;
    this.loCut = ctx.createBiquadFilter(); this.loCut.type = "highpass"; this.loCut.frequency.value = 28; this.loCut.Q.value = .5;
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -20; this.comp.knee.value = 10; this.comp.ratio.value = 5; this.comp.attack.value = .005; this.comp.release.value = .3;
    this.lim = ctx.createDynamicsCompressor(); this.lim.threshold.value = -6; this.lim.knee.value = 0; this.lim.ratio.value = 20; this.lim.attack.value = .001; this.lim.release.value = .1;
    this.out = ctx.createGain(); this.out.gain.value = 1.45;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 2048; this.analyser.smoothingTimeConstant = .6;
    this.hiCut.connect(this.loCut); this.loCut.connect(this.comp); this.comp.connect(this.out); this.out.connect(this.lim); this.lim.connect(this.analyser); this.analyser.connect(ctx.destination);
    this.noise = this.makeNoise(3);
    return ctx;
  }
  makeNoise(sec) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .2; } }   // 桃色の雑音
    return b;
  }
  // 群れの空間：長さ・暗さ・はじめの反射から、その場で残響をつくる
  space(W, dist) {
    const sp = W.space, len = clamp(sp.len * lerp(.6, 1.6, dist), .3, 9), key = `${sp.len}:${len.toFixed(1)}:${sp.lp}`; if (this.irCache.has(key)) return this.irCache.get(key);
    const ctx = this.ctx, sr = ctx.sampleRate, n = Math.floor(sr * len), b = ctx.createBuffer(2, n, sr), k = Math.exp(-2 * Math.PI * Math.min(sp.lp, 9000) / sr);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n; lp = lp * k + (Math.random() * 2 - 1) * (1 - k); d[i] = lp * Math.pow(1 - t, 2.4) * (i < 64 ? i / 64 : 1) * 3; }
      for (const s of (sp.slap || [])) { const i = Math.floor(s * sr * (1 + c * .03)); if (i < n) d[i] += .5; } }
    if (this.irCache.size > 12) this.irCache.delete(this.irCache.keys().next().value);
    this.irCache.set(key, b); return b;
  }
  get playing() { return !!this.cur; }
  stop(fade = .25) {
    const s = this.cur; if (!s) return; this.cur = null;
    const t = this.ctx.currentTime; s.bus.gain.cancelScheduledValues(t); s.bus.gain.setValueAtTime(s.bus.gain.value, t); s.bus.gain.linearRampToValueAtTime(0, t + fade);
    clearTimeout(s.timer); setTimeout(() => { try { s.bus.disconnect(); } catch (e) {} s.nodes.forEach(n => { try { n.stop?.(); } catch (e) {} }); }, fade * 1000 + 80);
    this.onstate?.(false);
  }
  // 鳴らす。item＝{n,t,tag}、d＝{dist,hard,light}（0〜1。0.5 が「はじめの鳴り」）。戻り値＝長さ（秒）
  play(item, d = { dist: .5, hard: .5, light: .5 }, opt = {}) {
    const ctx = typeof OfflineAudioContext !== "undefined" && this.ctx instanceof OfflineAudioContext ? this.ctx : this.ensure(); if (!ctx) return 0;
    this.stop(.12);
    const R = rng(seedOf(item.t)), score = compose(item, R, SCORES), W = score.world, T0 = ctx.currentTime + .06;
    // 聴く人のつまみ
    const K = { atk: lerp(2.2, .45, d.hard), br: lerp(.6, 1.5, d.light) * lerp(1.1, .6, d.dist), tr: Math.pow(2, (d.light - .5) * 3 / 12), tilt: (d.light - .5) * 2.4, hard: d.hard, dist: d.dist, span: W.space.width * lerp(1.2, .3, d.dist) };
    // 道すじ：出来事 → 群れの暗さ → 直接音と群れの空間 → 圧縮へ
    const norm = Math.pow(10, ((window.QS_GAIN?.[item.n] ?? 0)) / 20);   // 行ごとの大きさをそろえる（全行を書き出して測った表）
    const bus = ctx.createGain(); bus.gain.value = 0; bus.gain.setValueAtTime(0, T0); bus.gain.linearRampToValueAtTime(norm * lerp(1.05, .9, d.dist) * (1 - .3 * (d.hard - .5)) * (1 - .25 * (d.light - .5)), T0 + .05);   // つまみで大きさが変わりすぎないよう、硬い・明るいの分を少し下げる
    const evt = ctx.createGain(), tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = clamp(W.space.lp * 1.8 * K.br, 400, 16000); tone.Q.value = .4;
    const dry = ctx.createGain(); dry.gain.value = lerp(1, .5, d.dist);
    const conv = ctx.createConvolver(); conv.buffer = this.space(W, d.dist);
    const wet = ctx.createGain(); wet.gain.value = clamp(W.space.wet * lerp(.5, 1.9, d.dist), 0, 1.2);
    evt.connect(tone); tone.connect(dry); tone.connect(conv); conv.connect(wet); dry.connect(bus); wet.connect(bus); bus.connect(this.hiCut);
    // 音そのもの：音が自分の響きを聴く＝遅れの中に遅れがある（遅れの輪を二つ入れ子に）
    if (W.time === "recursive") { const d1 = ctx.createDelay(2), d2 = ctx.createDelay(2), f1 = ctx.createGain(), f2 = ctx.createGain(), lp = ctx.createBiquadFilter(), back = ctx.createGain();
      d1.delayTime.value = .61; d2.delayTime.value = .61 * 1.618; f1.gain.value = .42; f2.gain.value = .3; lp.type = "lowpass"; lp.frequency.value = 2400; back.gain.value = .55;
      tone.connect(d1); d1.connect(lp); lp.connect(f1); f1.connect(d1); lp.connect(d2); d2.connect(f2); f2.connect(d2); lp.connect(back); d2.connect(back); back.connect(conv); back.connect(dry); }
    const nodes = [], X = { ctx, out: evt, R, K, nodes, noise: this.noise, W };
    // 世界の地：どの行の下にも、基音 55 Hz とその群れの倍音がかすかにある（行どうしが同じ世界で響き合う）
    OPS.ground(X, T0, { dur: score.dur + .5, vol: .022, chord: W.ground.map(h => F0 * h) }, W);
    for (const [t, op, p] of score.ops) { const fn = OPS[op]; if (fn) fn(X, T0 + t, p, W); }
    // このまま聴く：一行のあと、その群れの世界の響きが 45 秒ほど、ほとんど動かずに続く（深く聴くための持続）
    let total = score.dur;
    if (opt.long) { const hs = W.hs.slice().sort(() => R() - .5).slice(0, 3), ch = W.ground.map(h => F0 * h).concat(hs.map(h => W.under ? F0 * 16 / h : F0 * h)).map(f => { while (f > 900) f /= 2; return f; });
      OPS.drift(X, T0 + score.dur - 1.5, { chord: ch, dur: 46, range: .04, vol: .05 }, W); OPS.ground(X, T0 + score.dur - 2, { chord: W.ground.map(h => F0 * h * 2), dur: 47, vol: .02 }, W);
      total += 45; }   // 一行より大きくしない・低い音を長く続けない（測って下げた）
    const id = { item, d, t0: T0, dur: total, bus, nodes, score };
    this.cur = id; this.onstate?.(true);
    const tail = Math.min(9, conv.buffer.duration) + .4;
    id.timer = setTimeout(() => { if (this.cur === id) { this.cur = null; this.onstate?.(false); setTimeout(() => { const t = ctx.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0, t + .1); setTimeout(() => { try { bus.disconnect(); } catch (e) {} }, 150); }, tail * 1000); } }, (total + .3) * 1000);   // 切る前に 0.1 秒で音を消す
    return total;
  }
  level() { if (!this.analyser) return 0; const a = this.lv ||= new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(a); let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length); }
  wave(buf) { if (this.analyser) this.analyser.getFloatTimeDomainData(buf); }
}
