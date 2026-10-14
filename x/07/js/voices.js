/* Qualia/sound の声部（v2・2026-10-14）
   一行の「像」を鳴らすための、ものの音の作り方。すべてその場の合成（録音は使わない）。
   - 金属・ガラス・木・石・器：固有の響きを重ねる（モーダル合成）
   - 弦・糸・蜘蛛の巣：Karplus-Strong（はじいた弦の計算）
   - 雨・しずく・砂・火・紙：粒の合成（短い粒をたくさん）
   - 風・流れ・息・波：帯を絞ったノイズ
   - 鐘・光のきらめき：FM
   どの声部も (X, t, p) を受けとり、X.out（その出来事の出口）へ鳴らす。戻り値はおよその終わりの時刻。
   X = { ctx, out, R, K, nodes, noise }  K＝聴く人のつまみから：atk(秒)・br(明るさの倍率)・tr(高さの倍率)・hard・dist */

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
export const SILENT = .0001;

// ---- 小さな道具
function G(X, dest, v = 0) { const g = X.ctx.createGain(); g.gain.value = v; g.connect(dest); return g; }
function env(g, t, a, peak, hold, rel) { const p = g.gain; p.setValueAtTime(SILENT, t); p.exponentialRampToValueAtTime(Math.max(SILENT * 2, peak), t + Math.max(.001, a)); if (hold > 0) p.setValueAtTime(Math.max(SILENT * 2, peak), t + a + hold); p.exponentialRampToValueAtTime(SILENT, t + a + Math.max(0, hold) + Math.max(.005, rel)); p.setValueAtTime(0, t + a + Math.max(0, hold) + Math.max(.005, rel) + .01); }
function P(X, pan, dest = X.out) { if (!X.ctx.createStereoPanner) return dest; const n = X.ctx.createStereoPanner(); n.pan.value = clamp(pan * (X.K.span ?? 1), -1, 1); n.connect(dest); return n; }
function O(X, type, f) { const o = X.ctx.createOscillator(); o.type = type; o.frequency.value = Math.max(1, f); X.nodes.push(o); return o; }
function N(X) { const s = X.ctx.createBufferSource(); s.buffer = X.noise; s.loop = true; s.loopStart = X.R() * 2; s.loopEnd = X.noise.duration; X.nodes.push(s); return s; }
function F(X, type, f, q = .7) { const b = X.ctx.createBiquadFilter(); b.type = type; b.frequency.value = clamp(f, 20, 18000); b.Q.value = q; return b; }
const play = (src, t, end) => { src.start(t, src.loopStart || 0); src.stop(end); };
const vf = (X, f) => f * X.K.tr;                         // 聴く人の「明るい／暗い」で少し高さを動かす
const top = (X, f) => clamp(f * X.K.br, 300, 16000);      // 明るさの上限
const A = (X, a) => a * X.K.atk;                          // 立ち上がり（柔らかい＝遅く・硬い＝速く）
function bendTo(param, t, ratio, dur) { if (!ratio || ratio === 1) return; param.setValueAtTime(param.value, t); param.exponentialRampToValueAtTime(Math.max(1, param.value * ratio), t + dur); }

// ---- 1. 水
export function drop(X, t, p = {}) {            // しずく：小さな泡の共鳴が一瞬上がる（Minnaert 共鳴）＋当たりのかすかな音
  const n = p.n ?? 1, win = p.win ?? 0, vol = p.vol ?? .25; let end = t;
  for (let i = 0; i < n; i++) {
    const tt = t + (n > 1 ? X.R() * win : 0), f = vf(X, (p.f ?? 1500) * (.7 + X.R() * .8)), o = O(X, "sine", f * .6), g = G(X, P(X, (p.pan ?? 0) + (X.R() - .5) * (p.spread ?? .8)));
    o.frequency.setValueAtTime(f * .6, tt); o.frequency.exponentialRampToValueAtTime(f * 1.5, tt + .03 + X.R() * .02);
    const d = (p.dec ?? .09) * (.7 + X.R() * .6); env(g, tt, A(X, .0015), vol * (.5 + X.R() * .5), 0, d); o.connect(g); o.start(tt); o.stop(tt + d + .1);
    if ((p.click ?? .3) > 0) { const s = N(X), h = F(X, "highpass", 3500), cg = G(X, g.gain ? P(X, 0) : X.out); s.connect(h); h.connect(cg); env(cg, tt, .0005, vol * (p.click ?? .3) * .5, 0, .008); play(s, tt, tt + .03); }
    end = Math.max(end, tt + d);
  }
  return end;
}
export function bubble(X, t, p = {}) { return drop(X, t, { f: 520, dec: .16, click: 0, vol: .2, ...p }); }
export function rain(X, t, p = {}) {             // 雨：遠い粒の帯＋近いしずく
  const dur = p.dur ?? 5, vol = p.vol ?? .3, dens = p.dens ?? 14;
  const s = N(X), lp = F(X, "lowpass", top(X, p.lp ?? 3200)), hp = F(X, "highpass", 380), g = G(X, P(X, 0));
  s.connect(hp); hp.connect(lp); lp.connect(g); env(g, t, A(X, .9), vol * .32, Math.max(.1, dur - 1.8), .9); play(s, t, t + dur + .1);
  drop(X, t + .1, { n: Math.round(dur * dens), win: dur - .3, f: p.f ?? 2600, vol: vol * .5, dec: .05, spread: 1.8, click: .5 });
  return t + dur;
}
export function splash(X, t, p = {}) {           // 水面に当たる：短い水しぶき＋跳ね返りのしずく
  const vol = p.vol ?? .35, s = N(X), b = F(X, "bandpass", top(X, p.f ?? 1300), .8), g = G(X, P(X, p.pan ?? 0));
  s.connect(b); b.connect(g); env(g, t, .002, vol, 0, .28); play(s, t, t + .4);
  drop(X, t + .04, { n: 4, win: .35, f: (p.f ?? 1300) * 1.2, vol: vol * .4, dec: .06 });
  return t + .6;
}
export function flow(X, t, p = {}) {             // 流れ：帯の中心が細かく動き続ける（せせらぎ）
  const dur = p.dur ?? 5, vol = p.vol ?? .25, g = G(X, P(X, p.pan ?? 0)); env(g, t, A(X, .7), vol, Math.max(.1, dur - 1.6), .9);
  for (const [c, q] of [[p.f ?? 1100, 3], [(p.f ?? 1100) * 2.1, 4]]) {
    const s = N(X), b = F(X, "bandpass", c, q); s.connect(b); b.connect(g);
    for (let tt = t; tt < t + dur; tt += .03 + X.R() * .07) b.frequency.setTargetAtTime(top(X, c * (.6 + X.R() * .9)), tt, .02);
    play(s, t, t + dur + .2);
  }
  return t + dur;
}
export function wave(X, t, p = {}) {             // 海の波：ゆっくり寄せて返す
  const dur = p.dur ?? 8, vol = p.vol ?? .3, s = N(X), lp = F(X, "lowpass", 500), g = G(X, P(X, 0)); s.connect(lp); lp.connect(g); play(s, t, t + dur + .3);
  g.gain.setValueAtTime(SILENT, t); let tt = t; while (tt < t + dur) { const per = 4.5 + X.R() * 2.5; g.gain.linearRampToValueAtTime(vol, tt + per * .45); lp.frequency.linearRampToValueAtTime(top(X, 1600), tt + per * .45); g.gain.linearRampToValueAtTime(vol * .15, tt + per); lp.frequency.linearRampToValueAtTime(400, tt + per); tt += per; }
  g.gain.linearRampToValueAtTime(0, t + dur + .2); return t + dur;
}

// ---- 2. 固いもの（モーダル合成）
const MATS = {
  metal: { r: [1, 2.76, 5.4, 8.93, 13.34, 19.1], d: [2.6, 1.8, 1.2, .8, .5, .3], a: [1, .55, .4, .28, .16, .08], click: .25 },
  rust:  { r: [1, 2.31, 3.98, 5.66, 8.1], d: [.5, .35, .25, .18, .1], a: [1, .7, .5, .4, .25], click: .5, rough: true },
  glass: { r: [1, 2.32, 4.25, 6.63, 9.38], d: [1.5, 1.1, .8, .55, .35], a: [1, .7, .45, .3, .2], click: .12 },
  ice:   { r: [1, 2.62, 4.9, 7.3], d: [.9, .6, .4, .25], a: [1, .6, .4, .25], click: .3 },
  wood:  { r: [1, 2.57, 4.21, 6.1], d: [.24, .14, .09, .06], a: [1, .45, .3, .15], click: .6 },
  hollow:{ r: [1, 1.98, 2.96, 4.1], d: [.45, .3, .2, .12], a: [1, .5, .3, .15], click: .4 },
  stone: { r: [1, 1.83, 3.1, 4.6], d: [.1, .07, .05, .04], a: [1, .6, .4, .3], click: .8 },
  crystal:{ r: [1, 3.01, 5.02, 7.04], d: [3, 2, 1.4, 1], a: [1, .4, .2, .1], click: .05 },
  bowl:  { r: [1, 2.71, 5.12, 8.3], d: [7, 5, 3.5, 2], a: [1, .5, .3, .15], click: .04, beat: true },
  skin:  { r: [1, 1.59, 2.14, 2.65], d: [.35, .2, .15, .1], a: [1, .5, .35, .2], click: .4, pitchDrop: true },
};
export function modal(X, t, p = {}) {
  const m = MATS[p.mat] || MATS.metal, f0 = vf(X, p.f ?? 440), vol = p.vol ?? .3, dec = (p.dec ?? 1) * lerp(1.25, .8, X.K.hard), n = p.n ?? 1; let end = t;
  for (let h = 0; h < n; h++) {
    const tt = t + h * (p.gap ?? .5) * (1 + (X.R() - .5) * .3), dest = P(X, (p.pan ?? 0) + (X.R() - .5) * .5), hv = vol * (h ? (p.decay ?? .75) ** h : 1);
    m.r.forEach((r, i) => {
      const f = f0 * r * (1 + (X.R() - .5) * .004); if (f > top(X, 14000)) return;
      const pairs = m.beat ? [0, 1.5 + X.R() * 2] : [0];
      for (const df of pairs) {
        const o = O(X, "sine", f + df), g = G(X, dest), d = m.d[i] * dec;
        env(g, tt, A(X, .0015), hv * m.a[i] * .35 / pairs.length, 0, d);
        if (m.pitchDrop) o.frequency.exponentialRampToValueAtTime(f * .8, tt + d);
        if (p.bend) bendTo(o.frequency, tt + .02, Math.pow(2, p.bend / 12), d);
        o.connect(g); o.start(tt); o.stop(tt + d + .1); end = Math.max(end, tt + d);
      }
    });
    if (m.click) { const s = N(X), b = F(X, "bandpass", top(X, f0 * 3), 1.2), g = G(X, dest); s.connect(b); b.connect(g); env(g, tt, .0006, hv * m.click * .5, 0, m.rough ? .08 : .015); play(s, tt, tt + .15); }
  }
  return end;
}
// 弦・糸（Karplus-Strong）。蜘蛛の巣・髪・チェロのはじき
const KS = new Map();
function ksBuf(X, f, dec, bright) {
  const sr = X.ctx.sampleRate, key = `${sr}:${Math.round(f)}:${dec.toFixed(1)}:${bright.toFixed(1)}`; if (KS.has(key)) return KS.get(key);
  const Np = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * dec), b = X.ctx.createBuffer(1, len, sr), d = b.getChannelData(0), buf = new Float32Array(Np);
  let lp = 0; for (let i = 0; i < Np; i++) { const w = Math.random() * 2 - 1; lp = lp + (w - lp) * (.25 + .75 * bright); buf[i] = lp; }
  const g = Math.pow(.001, 1 / (f * dec)); let idx = 0;
  for (let i = 0; i < len; i++) { const a = buf[idx], c = buf[(idx + 1) % Np]; d[i] = a; buf[idx] = g * (a * (.5 + .45 * bright) + c * (.5 - .45 * bright)) / 1; idx = (idx + 1) % Np; }
  let mx = 0; for (let i = 0; i < len; i++) mx = Math.max(mx, Math.abs(d[i])); if (mx) for (let i = 0; i < len; i++) d[i] /= mx;
  if (KS.size > 60) KS.delete(KS.keys().next().value); KS.set(key, b); return b;
}
export function pluck(X, t, p = {}) {
  const n = p.n ?? 1, vol = p.vol ?? .25; let end = t;
  for (let i = 0; i < n; i++) {
    const tt = t + i * (p.gap ?? .4) + (n > 1 ? (X.R() - .5) * .05 : 0), f = vf(X, (p.f ?? 330) * (p.notes ? Math.pow(2, p.notes[i % p.notes.length] / 12) : 1)), dec = (p.dec ?? 2) * lerp(1.2, .8, X.K.hard);
    const s = X.ctx.createBufferSource(); s.buffer = ksBuf(X, f, dec, clamp((p.bright ?? .5) * X.K.br, 0, 1)); X.nodes.push(s);
    const g = G(X, P(X, (p.pan ?? 0) + (X.R() - .5) * .6)); g.gain.value = vol; s.connect(g);
    if (p.bend) bendTo(s.playbackRate, tt + .05, Math.pow(2, p.bend / 12), dec);
    s.start(tt); end = Math.max(end, tt + dec);
  }
  return end;
}
export function fm(X, t, p = {}) {               // 鐘・チャイム・きらめき
  const f = vf(X, p.f ?? 660), dec = (p.dec ?? 3) * lerp(1.2, .8, X.K.hard), c = O(X, "sine", f), m = O(X, "sine", f * (p.ratio ?? 1.4)), mg = X.ctx.createGain(), g = G(X, P(X, p.pan ?? 0));
  mg.gain.setValueAtTime(f * (p.index ?? 2.5) * lerp(.5, 1.2, X.K.hard), t); mg.gain.exponentialRampToValueAtTime(f * .05, t + dec * .7);
  m.connect(mg); mg.connect(c.frequency); c.connect(g); env(g, t, A(X, .003), p.vol ?? .2, 0, dec);
  if (p.bend) { bendTo(c.frequency, t, Math.pow(2, p.bend / 12), dec); bendTo(m.frequency, t, Math.pow(2, p.bend / 12), dec); }
  c.start(t); m.start(t); c.stop(t + dec + .1); m.stop(t + dec + .1); return t + dec;
}
export function shatter(X, t, p = {}) {          // 割れる：鋭い立ち上がり＋散る破片
  const vol = p.vol ?? .35, s = N(X), h = F(X, "highpass", 1400), g = G(X, P(X, p.pan ?? 0)); s.connect(h); h.connect(g); env(g, t, .0008, vol * .8, 0, .16); play(s, t, t + .3);
  const k = p.n ?? 12; let end = t;
  for (let i = 0; i < k; i++) { const tt = t + .01 + Math.pow(X.R(), 1.8) * (p.spread ?? 1.2); end = Math.max(end, modal(X, tt, { mat: p.mat ?? "glass", f: (p.f ?? 2400) * (.6 + X.R() * 1.4), vol: vol * .35 * (1 - i / k * .6), dec: .25, pan: (X.R() - .5) * 1.6 })); }
  return end;
}
export function crack(X, t, p = {}) {            // ひび：乾いた小さな裂け目が数回
  const k = p.n ?? 4; let end = t;
  for (let i = 0; i < k; i++) { const tt = t + i * (p.gap ?? .12) * (.5 + X.R()), s = N(X), b = F(X, "bandpass", top(X, (p.f ?? 2200) * (.7 + X.R() * .6)), 2), g = G(X, P(X, (X.R() - .5) * .8)); s.connect(b); b.connect(g); env(g, tt, .0006, (p.vol ?? .3) * (.6 + X.R() * .4), 0, .03); play(s, tt, tt + .08); end = tt + .1; }
  return end;
}

// ---- 3. 粒（砂・土・火・紙・微生物）
function grains(X, t, p, shape) {
  const dur = p.dur ?? 3, cnt = Math.round(dur * (p.dens ?? 30)), vol = p.vol ?? .2; let end = t;
  const bus = G(X, P(X, p.pan ?? 0), 1);
  for (let i = 0; i < cnt; i++) {
    const u = i / cnt, tt = t + (p.curve ? Math.pow(X.R(), p.curve) : X.R()) * dur, s = N(X), b = F(X, shape.type, top(X, shape.f * (.7 + X.R() * .6) * (p.fr ?? 1)), shape.q), g = G(X, P(X, (X.R() - .5) * (p.spread ?? 1.2), bus));
    s.connect(b); b.connect(g); const len = shape.len * (.6 + X.R() * .8); env(g, tt, .0008, vol * (shape.pop && X.R() < .1 ? 2.2 : .5 + X.R() * .5) * (p.fade ? 1 - u * .7 : 1), 0, len); play(s, tt, tt + len + .02); end = Math.max(end, tt + len);
  }
  return end;
}
export const sand = (X, t, p = {}) => grains(X, t, p, { type: "highpass", f: 3000, q: .7, len: .012 });
export const soil = (X, t, p = {}) => grains(X, t, { dens: 20, ...p }, { type: "lowpass", f: 900, q: .8, len: .03 });
export const paper = (X, t, p = {}) => grains(X, t, { dens: 45, ...p }, { type: "bandpass", f: 3500, q: 1.6, len: .02 });
export const micro = (X, t, p = {}) => grains(X, t, { dens: 25, vol: .08, ...p }, { type: "bandpass", f: 6500, q: 4, len: .006 });
export function crackle(X, t, p = {}) {          // 火：はぜる粒＋低いごうごう
  const dur = p.dur ?? 4, vol = p.vol ?? .25, s = N(X), l = F(X, "lowpass", 220), g = G(X, P(X, 0)); s.connect(l); l.connect(g); env(g, t, A(X, .6), vol * .7, Math.max(.1, dur - 1.4), .8); play(s, t, t + dur + .1);
  return Math.max(t + dur, grains(X, t, { dur, dens: p.dens ?? 18, vol: vol * .8 }, { type: "bandpass", f: 2200, q: .8, len: .01, pop: true }));
}
export function cloth(X, t, p = {}) {            // 布・葉ずれ：やわらかいこすれ
  const dur = p.dur ?? .8, s = N(X), b = F(X, "bandpass", top(X, p.f ?? 1800), .6), g = G(X, P(X, p.pan ?? 0)); s.connect(b); b.connect(g);
  env(g, t, A(X, dur * .35), p.vol ?? .2, 0, dur * .65); b.frequency.linearRampToValueAtTime(top(X, (p.f ?? 1800) * 1.6), t + dur); play(s, t, t + dur + .1); return t + dur;
}

// ---- 4. 空気（風・息・霧・うなり）
export function wind(X, t, p = {}) {
  const dur = p.dur ?? 5, vol = p.vol ?? .25, s = N(X), b = F(X, "bandpass", top(X, p.f ?? 600), p.q ?? 3), g = G(X, P(X, p.pan ?? 0));
  s.connect(b); b.connect(g); env(g, t, A(X, p.atk ?? 1.2), vol, Math.max(.1, dur - (p.atk ?? 1.2) - 1.2), 1.2);
  const f0 = p.f ?? 600, f1 = p.f1 ?? f0; for (let k = 0, tt = t; tt < t + dur; tt += .4 + X.R() * .6, k++) b.frequency.linearRampToValueAtTime(top(X, lerp(f0, f1, (tt - t) / dur) * (.75 + X.R() * .6 * (p.gust ?? 1))), tt);
  play(s, t, t + dur + .2); return t + dur;
}
export function breath(X, t, p = {}) {           // 息：吸う（ゆっくり上がる）・吐く（長く下がる）
  const n = p.n ?? 1, vol = p.vol ?? .2; let tt = t;
  for (let i = 0; i < n; i++) { const s = N(X), b = F(X, "bandpass", 900, .6), g = G(X, P(X, p.pan ?? 0)); s.connect(b); b.connect(g);
    g.gain.setValueAtTime(SILENT, tt); g.gain.linearRampToValueAtTime(vol * .6, tt + 1); g.gain.linearRampToValueAtTime(SILENT, tt + 1.2); g.gain.linearRampToValueAtTime(vol, tt + 1.5); g.gain.linearRampToValueAtTime(0, tt + 3);
    b.frequency.setValueAtTime(1300, tt); b.frequency.linearRampToValueAtTime(700, tt + 3); play(s, tt, tt + 3.1); tt += 3.2; }
  return tt;
}
export function rumble(X, t, p = {}) {           // 地鳴り・雷のあと・太陽の奥
  const dur = p.dur ?? 4, s = N(X), l = F(X, "lowpass", p.f ?? 110, 1), g = G(X, P(X, 0)); s.connect(l); l.connect(g); env(g, t, A(X, p.atk ?? .8), (p.vol ?? .5), Math.max(.1, dur - 2), 1.5); play(s, t, t + dur + .1); return t + dur;
}
export function sub(X, t, p = {}) {              // 低いうなり：二つの低い音の打ち合い
  const dur = p.dur ?? 6, f = p.f ?? 41; for (const df of [0, p.beat ?? .7]) { const o = O(X, "sine", f + df), g = G(X, P(X, df ? .3 : -.3)); env(g, t, A(X, p.atk ?? 2), (p.vol ?? .3) * .5, Math.max(.1, dur - (p.atk ?? 2) - 2), 2); if (p.bend) bendTo(o.frequency, t, Math.pow(2, p.bend / 12), dur); o.connect(g); o.start(t); o.stop(t + dur + .1); }
  return t + dur;
}
export function hum(X, t, p = {}) {              // 電気・機械のうなり
  const dur = p.dur ?? 4, o = O(X, "sawtooth", p.f ?? 60), l = F(X, "lowpass", top(X, p.lp ?? 420), 2), g = G(X, P(X, p.pan ?? 0)); o.connect(l); l.connect(g); env(g, t, A(X, .4), (p.vol ?? .2) * .5, Math.max(.1, dur - 1), .6);
  if (p.trem) { const tg = X.ctx.createGain(); tg.gain.value = .8; l.disconnect(); l.connect(tg); tg.connect(g); const lf = O(X, "sine", p.trem), lg = X.ctx.createGain(); lg.gain.value = .2; lf.connect(lg); lg.connect(tg.gain); lf.start(t); lf.stop(t + dur + .1); }
  o.start(t); o.stop(t + dur + .1); return t + dur;
}

// ---- 5. 響きの形（ひらく・とける・反転・終わりのない上昇）
export function drone(X, t, p = {}) {
  const dur = p.dur ?? 6, chord = p.chord ?? [0, 7], f = vf(X, p.f ?? 196), vol = p.vol ?? .2, wave = p.wave ?? (X.K.hard < .35 ? "sine" : X.K.hard < .7 ? "triangle" : "sawtooth");
  const l = F(X, "lowpass", top(X, p.lp ?? f * 5), .8), g = G(X, P(X, p.pan ?? 0)); l.connect(g); env(g, t, A(X, p.atk ?? 1.5), vol, Math.max(.1, dur - (p.atk ?? 1.5) - (p.rel ?? 1.8)), p.rel ?? 1.8);
  if (p.lp1) l.frequency.linearRampToValueAtTime(top(X, p.lp1), t + dur);
  chord.forEach((s, i) => { const o = O(X, wave, f * Math.pow(2, s / 12)), og = X.ctx.createGain(); og.gain.value = (wave === "sawtooth" ? .35 : 1) / chord.length; o.detune.value = (X.R() - .5) * 12;
    if (p.vib) { const lf = O(X, "sine", 4 + X.R()), lg = X.ctx.createGain(); lg.gain.value = p.vib; lf.connect(lg); lg.connect(o.detune); lf.start(t); lf.stop(t + dur + .1); }
    if (p.bend) bendTo(o.frequency, t + (p.bendAt ?? 0), Math.pow(2, p.bend / 12), dur - (p.bendAt ?? 0));
    o.connect(og); og.connect(l); o.start(t); o.stop(t + dur + .1); });
  if (p.trem) { const tg = X.ctx.createGain(); tg.gain.value = .6; l.disconnect(); l.connect(tg); tg.connect(g); const lf = O(X, "sine", p.trem), lg = X.ctx.createGain(); lg.gain.value = .4; lf.connect(lg); lg.connect(tg.gain); lf.start(t); lf.stop(t + dur + .05); }
  return t + dur;
}
export function bloom(X, t, p = {}) {            // 咲く・ひらく：倍音が一つずつ加わり、明るさがひらく
  const f = vf(X, p.f ?? 262), dur = p.dur ?? 4, k = p.k ?? 8, l = F(X, "lowpass", 300), g = G(X, P(X, p.pan ?? 0)); l.connect(g); env(g, t, A(X, dur * .4), p.vol ?? .22, dur * .25, dur * .45);
  l.frequency.setValueAtTime(300, t); l.frequency.exponentialRampToValueAtTime(top(X, f * k * 1.2), t + dur * .55);
  for (let i = 1; i <= k; i++) { const o = O(X, "sine", f * i * (1 + (X.R() - .5) * .003)), og = X.ctx.createGain(), ti = t + (i - 1) * dur * .5 / k; og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(.5 / i, ti + .25); o.connect(og); og.connect(l); o.start(t); o.stop(t + dur + .1); }
  return t + dur;
}
export function melt(X, t, p = {}) {             // 溶ける：音が下がりながらにじみ、細いしずくが落ちる
  const dur = p.dur ?? 4; drone(X, t, { f: p.f ?? 520, chord: [0, 7, 12], dur, vol: p.vol ?? .2, lp: 4000, lp1: 350, bend: p.bend ?? -6, atk: .3, rel: 1.4, vib: 6 });
  drop(X, t + dur * .35, { n: p.drips ?? 4, win: dur * .55, f: 900, vol: .12, dec: .12, click: 0 }); return t + dur;
}
export function swell(X, t, p = {}) {            // 反転：ゆっくり膨らんで、ぷつりと切れる（逆再生の形）
  const dur = p.dur ?? 2.5, f = vf(X, p.f ?? 330), g = G(X, P(X, p.pan ?? 0)), l = F(X, "lowpass", top(X, f * 6));
  l.connect(g); g.gain.setValueAtTime(SILENT, t); g.gain.exponentialRampToValueAtTime(p.vol ?? .25, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + .03);
  for (const s of (p.chord ?? [0, 7, 15])) { const o = O(X, "triangle", f * Math.pow(2, s / 12)); o.connect(l); o.start(t); o.stop(t + dur + .05); }
  const n = N(X), h = F(X, "highpass", 2500), ng = G(X, g); n.connect(h); h.connect(ng); ng.gain.value = .25; play(n, t, t + dur + .05);
  return t + dur;
}
export function shepard(X, t, p = {}) {          // 終わりのない上昇（無限・くり返し）
  const dur = p.dur ?? 7, base = vf(X, p.f ?? 55), dir = p.dir ?? 1, vol = p.vol ?? .18, k = 6, out = G(X, P(X, 0), 1); env(out, t, A(X, 1.2), 1, Math.max(.1, dur - 2.4), 1.2);
  for (let i = 0; i < k; i++) { const o = O(X, "sine", base), g = X.ctx.createGain(); o.connect(g); g.connect(out);
    const steps = 400, fc = new Float32Array(steps), gc = new Float32Array(steps);
    for (let s = 0; s < steps; s++) { const pos = ((i + dir * s / steps * 1.5) % k + k) % k, fr = base * Math.pow(2, pos); fc[s] = fr; gc[s] = vol * Math.exp(-Math.pow((pos - k / 2) / 1.3, 2)) / 2; }
    o.frequency.setValueCurveAtTime(fc, t, dur); g.gain.setValueCurveAtTime(gc, t, dur); o.start(t); o.stop(t + dur + 2); }
  return t + dur;
}
export function vanish(X, t, p = {}) {           // 無：音が出かかって、消える
  const f = vf(X, p.f ?? 220), g = G(X, P(X, 0)), l = F(X, "lowpass", top(X, f * 3)); l.connect(g);
  g.gain.setValueAtTime(SILENT, t); g.gain.exponentialRampToValueAtTime((p.vol ?? .2), t + (p.rise ?? 1.4)); g.gain.exponentialRampToValueAtTime(SILENT, t + (p.rise ?? 1.4) + .35);
  for (const s of [0, 5, 12]) { const o = O(X, "sine", f * Math.pow(2, s / 12)); o.connect(l); o.start(t); o.stop(t + (p.rise ?? 1.4) + .5); }
  const a = N(X), h = F(X, "highpass", 5000), ag = G(X, P(X, 0)); a.connect(h); h.connect(ag); env(ag, t + (p.rise ?? 1.4), .2, .02, .5, 1.5); play(a, t + (p.rise ?? 1.4), t + (p.rise ?? 1.4) + 2.3);
  return t + (p.rise ?? 1.4) + 2;
}
export function question(X, t, p = {}) {         // 問い：上がって、答えのないまま止まる
  const f = vf(X, p.f ?? 300), dur = p.dur ?? 1.6, o = O(X, X.K.hard > .6 ? "triangle" : "sine", f), g = G(X, P(X, p.pan ?? 0)), lf = O(X, "sine", 5.5), lg = X.ctx.createGain();
  lg.gain.value = 9; lf.connect(lg); lg.connect(o.detune); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (p.up ?? 1.6), t + dur);
  env(g, t, A(X, .15), p.vol ?? .22, dur - .2, .06); o.connect(g); o.start(t); o.stop(t + dur + .1); lf.start(t); lf.stop(t + dur + .1); return t + dur + .6;
}
export function echoes(X, t, p = {}) {           // 記憶・こだま：短い節が、遅れて、すり減りながらくり返す
  const d = X.ctx.createDelay(2), fb = X.ctx.createGain(), l = F(X, "lowpass", top(X, 2200)), out = P(X, 0); d.delayTime.value = p.delay ?? .42; fb.gain.value = p.fb ?? .58;
  const inp = X.ctx.createGain(); inp.connect(out); inp.connect(d); d.connect(l); l.connect(fb); fb.connect(d); l.connect(out);
  const save = X.out; X.out = inp; pluck(X, t, { f: p.f ?? 392, notes: p.notes ?? [0, 3, 7], n: p.n ?? 3, gap: .2, vol: p.vol ?? .25, dec: 1.2, bright: .6 }); X.out = save;
  setTimeout(() => {}, 0); return t + 4;
}
export function choir(X, t, p = {}) {            // 祈り・神：母音「あ」の合唱
  const dur = p.dur ?? 5, f = vf(X, p.f ?? 196), g = G(X, P(X, 0)); env(g, t, A(X, 1.6), p.vol ?? .2, Math.max(.1, dur - 3.2), 1.6);
  const b1 = F(X, "bandpass", 700, 6), b2 = F(X, "bandpass", 1150, 8); b1.connect(g); b2.connect(g);
  for (const s of (p.chord ?? [0, 7, 12, 16])) for (const dt of [-6, 6]) { const o = O(X, "sawtooth", f * Math.pow(2, s / 12)); o.detune.value = dt; const lf = O(X, "sine", 4.6 + X.R()), lg = X.ctx.createGain(); lg.gain.value = 8; lf.connect(lg); lg.connect(o.detune); o.connect(b1); o.connect(b2); o.start(t); o.stop(t + dur + .1); lf.start(t); lf.stop(t + dur + .1); }
  return t + dur;
}
export function shimmer(X, t, p = {}) {          // 光：高いところで、やわらかい粒がゆっくりきらめく
  const dur = p.dur ?? 4, n = Math.round(dur * (p.dens ?? 3)); let end = t;
  for (let i = 0; i < n; i++) end = Math.max(end, fm(X, t + X.R() * dur, { f: (p.f ?? 2400) * Math.pow(2, Math.floor(X.R() * 4) * 3 / 12), ratio: 3.01, index: .4, dec: 1.4 + X.R() * 1.5, vol: (p.vol ?? .08) * (.5 + X.R() * .5), pan: (X.R() - .5) * 1.6 }));
  return end;
}

// ---- 6. 生きもの
export function heart(X, t, p = {}) {
  const dur = p.dur ?? 5, beat = 60 / (p.bpm ?? 66); let end = t;
  for (let tt = t; tt < t + dur; tt += beat) for (const [off, a] of [[0, 1], [.26, .6]]) { const o = O(X, "sine", 70), g = G(X, P(X, 0)), at = tt + off; o.frequency.setValueAtTime(vf(X, p.f ?? 72), at); o.frequency.exponentialRampToValueAtTime(40, at + .15); env(g, at, A(X, .01), (p.vol ?? .45) * a, 0, .22); o.connect(g); o.start(at); o.stop(at + .4); end = at + .3; }
  return end;
}
export function chirp(X, t, p = {}) {
  const kind = p.kind ?? "bird", n = p.n ?? 4, vol = p.vol ?? .12; let tt = t;
  for (let i = 0; i < n; i++) {
    if (kind === "insect") { const o = O(X, "triangle", vf(X, p.f ?? 4200)), am = O(X, "square", 38 + X.R() * 20), ag = X.ctx.createGain(), g = G(X, P(X, p.pan ?? .3)), mg = G(X, g, .5); ag.gain.value = .5; am.connect(ag); ag.connect(mg.gain); env(g, tt, .02, vol * .6, .5, .15); o.connect(mg); o.start(tt); o.stop(tt + .8); am.start(tt); am.stop(tt + .8); tt += .9 + X.R() * .5; continue; }
    if (kind === "frog") { const o = O(X, "sawtooth", vf(X, p.f ?? 180)), b = F(X, "bandpass", 700, 3), g = G(X, P(X, p.pan ?? -.3)), mg = G(X, g, .4), am = O(X, "square", 28), ag = X.ctx.createGain(); ag.gain.value = .4; am.connect(ag); ag.connect(mg.gain); o.connect(b); b.connect(mg); env(g, tt, .01, vol * 1.2, .18, .08); o.start(tt); o.stop(tt + .4); am.start(tt); am.stop(tt + .4); tt += .5 + X.R() * .4; continue; }
    const top0 = vf(X, (p.f ?? 3400) * (.85 + X.R() * .3)), o = O(X, "sine", top0), g = G(X, P(X, p.pan ?? (X.R() - .5))), len = (p.len ?? .07) * (.8 + X.R() * .5);
    o.frequency.setValueAtTime(top0 * .75, tt); o.frequency.exponentialRampToValueAtTime(top0 * 1.15, tt + len * .4); o.frequency.exponentialRampToValueAtTime(top0 * .8, tt + len);
    env(g, tt, .005, vol, len * .3, len * .6); o.connect(g); o.start(tt); o.stop(tt + len * 2); tt += len + .05 + X.R() * (p.gap ?? .1);
  }
  return tt;
}
export function voice(X, t, p = {}) {            // ことば：意味のない母音の移ろい（ささやき or 声）
  const dur = p.dur ?? 3, whisper = p.whisper ?? X.K.hard < .55, src = whisper ? N(X) : O(X, "sawtooth", vf(X, p.f ?? 150)), mix = X.ctx.createGain(), g = G(X, P(X, p.pan ?? 0));
  const V = [[800, 1200], [300, 2300], [350, 1250], [500, 1900], [500, 800]], b1 = F(X, "bandpass", 700, 7), b2 = F(X, "bandpass", 1200, 9);
  src.connect(b1); src.connect(b2); b1.connect(mix); b2.connect(mix); mix.connect(g);
  for (let tt = t; tt < t + dur; tt += .14 + X.R() * .22) { const v = V[Math.floor(X.R() * V.length)]; b1.frequency.setTargetAtTime(v[0], tt, .03); b2.frequency.setTargetAtTime(v[1], tt, .03); mix.gain.setValueAtTime(X.R() < .25 ? .1 : 1, tt); }
  env(g, t, A(X, .25), (p.vol ?? .3) * (whisper ? 1 : .2), Math.max(.1, dur - .9), .6); play(src, t, t + dur + .1); return t + dur;
}
export function creak(X, t, p = {}) {            // 錆・木のきしみ：こすれて引っかかる、を繰り返す
  const dur = p.dur ?? 2.5, o = O(X, "sawtooth", p.f ?? 28), b = F(X, "bandpass", top(X, p.fc ?? 1100), 5), g = G(X, P(X, p.pan ?? 0));
  o.connect(b); b.connect(g); for (let tt = t; tt < t + dur; tt += .08 + X.R() * .2) o.frequency.linearRampToValueAtTime((p.f ?? 28) * (.6 + X.R() * 1.2), tt);
  env(g, t, A(X, .25), p.vol ?? .2, Math.max(.1, dur - .7), .4); o.start(t); o.stop(t + dur + .1); return t + dur;
}
export function glitch(X, t, p = {}) {           // 電子：細かい点と、ちぎれた雑音
  const dur = p.dur ?? 2.5, step = p.step ?? .06, vol = p.vol ?? .12; let end = t;
  for (let tt = t; tt < t + dur; tt += step) { if (X.R() > (p.dens ?? .45)) continue; const kind = X.R();
    if (kind < .6) { const o = O(X, X.K.hard > .45 ? "square" : "sine", vf(X, (p.f ?? 1200) * Math.pow(2, Math.floor(X.R() * 12) / 12 * 2))), g = G(X, P(X, (X.R() - .5) * 1.4)); env(g, tt, .001, vol * .5, step * .3, .02); o.connect(g); o.start(tt); o.stop(tt + step); }
    else { const s = N(X), h = F(X, "highpass", 3000), g = G(X, P(X, (X.R() - .5) * 1.4)); s.connect(h); h.connect(g); env(g, tt, .0005, vol * .5, step * .4, .005); play(s, tt, tt + step); }
    end = tt + step; }
  return end;
}
export function tick(X, t, p = {}) {             // 時計：刻み。warp で刻みが伸び縮みする
  const dur = p.dur ?? 5; let tt = t, iv = 60 / (p.bpm ?? 60), k = 0;
  while (tt < t + dur) { modal(X, tt, { mat: k % 2 ? "wood" : "hollow", f: vf(X, k % 2 ? 2100 : 1700), vol: p.vol ?? .22, dec: .4 }); tt += iv * (p.warp ? Math.pow(1 + p.warp, k) : 1); k++; }
  return tt;
}
export function clank(X, t, p = {}) {            // 機械：金属の当たりが規則正しく
  const dur = p.dur ?? 3, iv = 60 / (p.bpm ?? 100); let tt = t, k = 0;
  while (tt < t + dur) { modal(X, tt, { mat: k % 3 === 2 ? "metal" : "rust", f: vf(X, (p.f ?? 300) * (k % 3 === 2 ? 1.5 : 1)), vol: (p.vol ?? .25) * (k % 3 === 0 ? 1 : .6), dec: .4 }); tt += iv; k++; }
  hum(X, t, { dur, f: 50, vol: (p.vol ?? .25) * .6, lp: 300 }); return t + dur;
}
export function passby(X, t, p = {}) {           // 通りすぎる（電車・トラック）：近づいて遠ざかる・高さが下がる
  const dur = p.dur ?? 3.5, s = N(X), l = F(X, "lowpass", 300, 1), g = G(X, P(X, 0)); s.connect(l); l.connect(g);
  g.gain.setValueAtTime(SILENT, t); g.gain.exponentialRampToValueAtTime(p.vol ?? .4, t + dur * .5); g.gain.exponentialRampToValueAtTime(SILENT, t + dur);
  l.frequency.setValueAtTime(250, t); l.frequency.linearRampToValueAtTime(top(X, 1400), t + dur * .5); l.frequency.linearRampToValueAtTime(200, t + dur);
  const o = O(X, "sawtooth", p.f ?? 90), og = G(X, l, .15); o.connect(og); o.frequency.setValueAtTime((p.f ?? 90) * 1.08, t + dur * .45); o.frequency.linearRampToValueAtTime((p.f ?? 90) * .9, t + dur * .55); o.start(t); o.stop(t + dur);
  play(s, t, t + dur + .05); return t + dur;
}
export function spark(X, t, p = {}) {           // 電気の火花・信号
  const n = p.n ?? 3; let end = t; for (let i = 0; i < n; i++) { const tt = t + X.R() * (p.win ?? .6); fm(X, tt, { f: 1800 + X.R() * 2000, ratio: 7.1, index: 6, dec: .12, vol: (p.vol ?? .12) }); crack(X, tt, { n: 1, f: 5000, vol: (p.vol ?? .12) }); end = tt + .15; } return end;
}

export const VOICES = { drop, bubble, rain, splash, flow, wave, modal, pluck, fm, shatter, crack, sand, soil, paper, micro, crackle, cloth, wind, breath, rumble, sub, hum, drone, bloom, melt, swell, shepard, vanish, question, echoes, choir, shimmer, heart, chirp, voice, creak, glitch, tick, clank, passby, spark };
