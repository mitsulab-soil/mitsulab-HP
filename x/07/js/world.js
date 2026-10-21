/* Qualia/sound の音世界（v2・2026-10-14）
   考え方：一行の言葉を「効果音」に写さない。行が指しているもの（時間・境界・生成と消滅・知覚の外・自己と他者・スケールの飛躍…）を読み、
   音の構造（倍音・時間の向き・粒の密度・周期の入れ子・沈黙の質・空間）で鳴らす。
   世界の法則：
   - すべての行は、ひとつの基音 F0＝55 Hz の倍音（と下方倍音）の上に立つ。だから、どの二行を同時に鳴らしても同じ世界の中で響き合う。
   - 九つの群れは、それぞれ固有の「音律・時間の流れ方・空間」を持つ（WORLDS）。
   - 行の読み（READINGS）が、構造の操作（OPS）を文の順に並べる。手で書いた譜（scores.js）がある行はそれを使う。
   設計の説明＝作品の「この作品」 */
import * as V from "./voices.js";

export const F0 = 55;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const S = V.SILENT;

// ---- 九つの群れの法則（音律 hs＝使う倍音の番号、under＝下方倍音、tet＝平均律に丸める、stretch＝倍音の伸び、time＝時間の流れ方、space＝空間）
export const WORLDS = {
  uchu:   { ja: "宇宙",       hs: [7, 9, 11, 13, 15, 17, 19, 23, 27, 31], stretch: 1.006, time: "still",      gap: 2.6, space: { len: .7, wet: .1, lp: 9000, width: 1 },  ground: [1, 2],   sig: "beyond",   law: "高い奇数の倍音だけ・ほとんど響かない広さ・立ち上がりの長い、ほとんど動かない時間" },
  seimei: { ja: "生命と土",   hs: [2, 3, 4, 5, 6, 8, 10, 12], time: "breath",     gap: 1.3, space: { len: 1.6, wet: .32, lp: 3200, width: .6 }, ground: [2, 3],   sig: "breath",   law: "低い純正の倍音・息の周期（4 秒）でふくらむ・近くて温かい" },
  toshi:  { ja: "都市と機械", hs: [4, 5, 6, 8, 9, 10, 12, 15, 16], tet: true, time: "grid", gap: .3125, space: { len: 1, wet: .26, lp: 6500, width: .8, slap: [.11, .23] }, ground: [4], sig: "machine", law: "平均律に丸めた高さ・96 拍の格子・硬い反射" },
  kokoro: { ja: "心と意識",   hs: [3, 5, 7, 9, 11, 13], drift: true, time: "rubato", gap: 1.7, space: { len: 1.1, wet: .4, lp: 1900, width: .35 }, ground: [2, 3], sig: "inner", law: "七・十一の倍音（あいまいな音程）・始まりが揺れる時間・内側にこもる狭い空間" },
  kotoba: { ja: "ことばと文字", hs: [8, 9, 10, 12, 15, 16, 18, 20], time: "speech", gap: .22, space: { len: .55, wet: .14, lp: 5200, width: .5 }, ground: [4], sig: "speech", law: "8〜20 番の倍音（純正の音程）・行のモーラの長短がそのまま拍・乾いた近さ" },
  toki:   { ja: "時間と死",   hs: [1, 2, 3, 4, 5, 6, 7, 8], under: true, time: "decel", gap: 1.5, space: { len: 5.5, wet: .55, lp: 3600, width: .8 }, ground: [1], sig: "dissolve", law: "下方倍音（高さが割り算で下がる列）・だんだん遅くなる時間・長く消えていく空間" },
  mizu:   { ja: "水と天気",   hs: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16], gliss: true, time: "stochastic", gap: .9, space: { len: 3.2, wet: .48, lp: 5200, width: 1 }, ground: [2, 4], sig: "flow", law: "倍音のあいだをすべる高さ・偶然に降る時間（ポアソン）・ひらけた空間" },
  iro:    { ja: "色と光",     hs: [8, 10, 12, 14, 16, 18, 20, 24], time: "shimmer", gap: 1.1, space: { len: 4.2, wet: .5, lp: 12000, width: 1 }, ground: [4, 8], sig: "light", law: "上の倍音・どの倍音を強めるかが色・ゆっくりきらめく時間" },
  oto:    { ja: "音そのもの", hs: [1, 2, 3, 4, 5, 6, 7, 8], time: "recursive", gap: 1.2, space: { len: 6.5, wet: .75, lp: 7000, width: .9 }, ground: [1, 2], sig: "recurse", law: "音が自分の響きを聴く（遅れの中の遅れ）・残響そのものが素材" },
};

// 群れの音律から高さを一つ選ぶ（oct で上下）
export function pitchOf(W, h, oct = 0) {
  let f = W.under ? F0 * 16 / h : F0 * Math.pow(h, W.stretch ?? 1);
  if (W.tet) f = 440 * Math.pow(2, Math.round(12 * Math.log2(f / 440)) / 12);
  f *= Math.pow(2, oct); while (f < 70) f *= 2; while (f > 3200) f /= 2; return f;
}
const pick = (R, a) => a[Math.floor(R() * a.length)];

// ---- 部品（倍音の束・粒の雲・沈黙の質）
function partials(X, t, dur, fs, as, o = {}) {           // 倍音の束：一本ずつの高さを動かせる（溶け合い・分かれ・広がりに使う）
  const W = X.W || {};
  // 群れの時間の法則がここで効く：宇宙＝立ち上がりが長い・生命＝息の周期でふくらむ・色と光＝ゆっくり揺れる・水＝倍音がすべる・心＝高さが揺れる
  o = { ...o };
  if (W.time === "still") o.atk = (o.atk ?? .8) * 2.2;
  if (!o.am && W.time === "breath") o.am = [.25, .5];
  if (!o.am && W.time === "shimmer") o.am = [.3 + X.R() * .2, .3];
  if (!o.drift && (W.gliss || W.drift)) o.drift = W.gliss ? 35 : 22;
  // スマホのスピーカーでも芯が聞こえるよう、130 Hz より低い倍音には 2・3 倍の写しを添える
  if (!o.noCopy) { const n0 = fs.length, F2 = [...fs], A2 = fs.map((_, i) => as[i] ?? as[as.length - 1] ?? .3), T2 = o.to ? fs.map((f, i) => o.to[i] ?? f) : null, M2 = o.ampTo ? fs.map((_, i) => o.ampTo[i] ?? .1) : null;
    for (let i = 0; i < n0; i++) if (fs[i] < 130) for (const [m, a] of [[2, .35], [3, .2]]) { F2.push(fs[i] * m); A2.push(A2[i] * a); if (T2) T2.push(T2[i] * m); if (M2) M2.push(M2[i] * a); }
    fs = F2; as = A2; if (T2) o.to = T2; if (M2) o.ampTo = M2; }
  const g = X.ctx.createGain(), pan = X.ctx.createStereoPanner ? X.ctx.createStereoPanner() : null, lp = X.ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = clamp((o.lp ?? 6000) * X.K.br, 200, 16000); g.gain.value = 0;
  if (pan) { pan.pan.value = clamp((o.pan ?? 0) * X.K.span, -1, 1); if (o.pan1 != null) pan.pan.linearRampToValueAtTime(clamp(o.pan1 * X.K.span, -1, 1), t + dur); lp.connect(pan); pan.connect(g); } else lp.connect(g);
  let am = null; if (o.am) { am = X.ctx.createGain(); am.gain.value = 1 - o.am[1] / 2; am.connect(X.out); g.connect(am); } else g.connect(X.out);
  const rel = Math.min(o.rel ?? 1.2, dur * .45), atk = Math.min(Math.max(.01, (o.atk ?? .8) * X.K.atk), dur - rel - .01);
  g.gain.setValueAtTime(S, t); g.gain.exponentialRampToValueAtTime(o.vol ?? .2, t + atk); if (dur - atk - rel > 0) g.gain.setValueAtTime(o.vol ?? .2, t + dur - rel); g.gain.exponentialRampToValueAtTime(S, t + dur); g.gain.setValueAtTime(0, t + dur + .01);
  if (o.lp1) lp.frequency.linearRampToValueAtTime(clamp(o.lp1 * X.K.br, 200, 16000), t + dur);
  if (am) { const lf = X.ctx.createOscillator(), lg = X.ctx.createGain(); lf.frequency.value = o.am[0]; lg.gain.value = o.am[1] / 2; lf.connect(lg); lg.connect(am.gain); X.nodes.push(lf); lf.start(t); lf.stop(t + dur + .05); }
  as = fs.map((_, i) => as[i] ?? as[as.length - 1] ?? .3); if (o.ampTo) o.ampTo = fs.map((_, i) => o.ampTo[i] ?? .1); if (o.to) o.to = fs.map((f, i) => o.to[i] ?? f);
  // 聴く人の「明るい」：強める倍音を上へ傾ける（暗い＝下へ）
  as = as.map((a, i) => a * Math.pow(i + 1, X.K.tilt ?? 0));
  const sum = as.reduce((a, b) => a + b, 0) || 1;
  fs.forEach((f, i) => {
    const os = X.ctx.createOscillator(), og = X.ctx.createGain(); os.type = o.wave ?? "sine"; os.frequency.value = f * X.K.tr; og.gain.value = as[i] / sum; X.nodes.push(os); X.pitch?.connect(os.detune);
    if (o.to) { os.frequency.setValueAtTime(f * X.K.tr, t + (o.toAt ?? 0) * dur); os.frequency.exponentialRampToValueAtTime(Math.max(1, o.to[i] * X.K.tr), t + (o.toEnd ?? 1) * dur); }
    if (o.ampTo) { og.gain.setValueAtTime(as[i] / sum, t); og.gain.linearRampToValueAtTime(o.ampTo[i] / sum, t + dur); }
    if (o.drift) { for (let k = 1; k <= 4; k++) os.detune.linearRampToValueAtTime((X.R() - .5) * o.drift, t + dur * k / 4); }
    os.connect(og); og.connect(lp); os.start(t); os.stop(t + dur + .05);
  });
  return t + dur;
}
function cloud(X, t, dur, o = {}) {                      // 粒の雲：密度・粒の長さ・高さの散らばりが時間とともに変わる
  const n = Math.round(dur * ((o.d0 ?? 10) + (o.d1 ?? 10)) / 2), ps = o.pitches ?? [440], vol = o.vol ?? .12; let end = t;
  for (let i = 0; i < n; i++) {
    // 密度の変化：d0→d1 を時間の分布に写す（d1>d0 なら後ろに寄る）
    const u0 = (i + X.R() * (X.W?.time === "stochastic" ? 1.6 : .5)) / n, w = (o.d1 ?? 10) / Math.max(.1, o.d0 ?? 10), u = w === 1 ? u0 : (Math.pow(w, u0) - 1) / (w - 1), tt = t + clamp(u, 0, 1) * dur;   // 水と天気：粒の時刻をもっと偶然に散らす
    const k = (tt - t) / dur, len = lerp(o.l0 ?? .04, o.l1 ?? .04, k) * (.7 + X.R() * .6) * (X.W?.time === "still" ? 2 : 1), spread = lerp(o.s0 ?? 0, o.s1 ?? 0, k);
    let f = pick(X.R, ps) * Math.pow(2, (X.R() - .5) * spread); if (o.target) f = lerp(f, o.target, Math.pow(k, 1.5));
    const os = X.ctx.createOscillator(), g = X.ctx.createGain(), pn = X.ctx.createStereoPanner ? X.ctx.createStereoPanner() : null; os.type = o.wave ?? "sine"; os.frequency.value = f * X.K.tr; X.nodes.push(os); X.pitch?.connect(os.detune);
    if (pn) { pn.pan.value = clamp((X.R() - .5) * (o.width ?? 1.2) * X.K.span, -1, 1); g.connect(pn); pn.connect(X.out); } else g.connect(X.out);
    const a = o.rev ? len * .88 : Math.max(.015, len * .08 * X.K.atk), r = o.rev ? Math.max(.06, len * .12) : Math.max(.02, len * .92), amp = vol * (o.fade === "in" ? .2 + k * .8 : o.fade === "out" ? 1 - k * .85 : 1) * (.6 + X.R() * .4);
    g.gain.setValueAtTime(S, tt); g.gain.exponentialRampToValueAtTime(amp, tt + a); g.gain.exponentialRampToValueAtTime(S, tt + a + r); g.gain.setValueAtTime(0, tt + a + r + .005);
    os.connect(g); os.start(tt); os.stop(tt + a + r + .02); end = Math.max(end, tt + a + r);
  }
  return end;
}
function floor(X, t, dur, kind = "room", vol = .02) {   // 沈黙の質：部屋の静けさ・圧のある静けさ・空気だけの静けさ
  if (kind === "pressure") return partials(X, t, dur, [F0, F0 + .5, F0 * 2 + .3], [1, 1, .5], { vol: vol * 1.6, atk: 1.5, rel: 1.5, lp: 260, noCopy: true });
  const s = X.ctx.createBufferSource(); s.buffer = X.noise; s.loop = true; X.nodes.push(s); X.pitch?.connect(s.detune);
  const f = X.ctx.createBiquadFilter(); f.type = kind === "air" ? "highpass" : "lowpass"; f.frequency.value = kind === "air" ? 5500 : 380;
  const g = X.ctx.createGain(); g.gain.setValueAtTime(S, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(1.5, dur / 3)); g.gain.setValueAtTime(vol, t + dur - Math.min(1.5, dur / 3)); g.gain.exponentialRampToValueAtTime(S, t + dur);
  s.connect(f); f.connect(g); g.connect(X.out); s.start(t); s.stop(t + dur + .05); return t + dur;
}
const chordOf = (W, R, n, oct = 0, base) => { const hs = [...W.hs].sort(() => R() - .5).slice(0, n); return hs.map(h => pitchOf(W, h, oct)); };
const harm = (f, n) => Array.from({ length: n }, (_, i) => f * (i + 1));

// ---- 構造の操作（OPS）。どれも (X, t, p, W) → 終わりの時刻
export const OPS = {
  // 生成：まばらな粒が速く・長くなり、一つの響きに集まる
  emerge(X, t, p, W) { const d = p.dur ?? 4, ch = p.chord ?? chordOf(W, X.R, 3); cloud(X, t, d * .75, { pitches: ch.map(f => f * 2), d0: 3, d1: 40, l0: .015, l1: .18, s0: 2, s1: 0, target: null, vol: p.vol ?? .1, fade: "in" }); return partials(X, t + d * .6, d * .9, ch, ch.map((_, i) => 1 / (i + 1)), { vol: p.vol ?? .14, atk: d * .25, rel: d * .4, lp: 5000 }); },
  // 消滅：響きが粒にほどけ、まばらになって、静けさだけが残る
  dissolve(X, t, p, W) { const d = p.dur ?? 4.5, ch = p.chord ?? chordOf(W, X.R, 3); partials(X, t, d * .4, ch, ch.map(() => 1), { vol: p.vol ?? .14, atk: .3, rel: d * .3 }); cloud(X, t + d * .25, d * .7, { pitches: ch, d0: 40, d1: 2, l0: .12, l1: .01, s0: 0, s1: 2.5, vol: (p.vol ?? .14) * .8, fade: "out" }); return floor(X, t + d * .7, d * .6, p.floor ?? "room", .015); },
  // 境界の溶解：二つの違う音（整った倍音／ずれた倍音）の倍音がすべって、一つの響きに混ざる
  fuse(X, t, p, W) { const d = p.dur ?? 5, a = p.a ?? pitchOf(W, pick(X.R, W.hs)), b = p.b ?? a * Math.pow(2, 5 / 12 + .07), m = p.m ?? Math.sqrt(a * b), n = 6;
    const A = harm(a, n), B = harm(b, n).map((f, i) => f * Math.pow(i + 1, .06)), M = harm(m, n);
    partials(X, t, d, A, A.map((_, i) => p.flat ? 1 : 1 / (i + 1)), { to: M, toAt: .2, toEnd: .8, pan: -.8, pan1: 0, vol: p.vol ?? .12, atk: 1, rel: 1.4 });
    return partials(X, t, d, B, B.map((_, i) => p.flat ? 1 : 1 / (i + 1.5)), { to: M, toAt: .2, toEnd: .8, pan: .8, pan1: 0, vol: p.vol ?? .12, atk: 1, rel: 1.4 }); },
  // 分裂：ひとつの響きが、うなりを生み、二つに分かれて左右へ離れていく
  split(X, t, p, W) { const d = p.dur ?? 4.5, f = p.f ?? pitchOf(W, pick(X.R, W.hs)), A = harm(f, 5), as = A.map((_, i) => 1 / (i + 1));
    partials(X, t, d, A, as, { to: A.map(x => x * (p.ratio ?? 7 / 6)), toAt: .25, pan: 0, pan1: .9, vol: p.vol ?? .12, atk: .6 });
    return partials(X, t, d, A, as, { to: A.map(x => x / (p.ratio ?? 7 / 6)), toAt: .25, pan: 0, pan1: -.9, vol: p.vol ?? .12, atk: .6 }); },
  // 反転：ひとつの短い節を鳴らし、つづけて時間の向きを裏返して鳴らす（減衰→立ち上がり、順→逆）
  reverse(X, t, p, W) { const ch = p.chord ?? chordOf(W, X.R, 4, 1), seq = ch.map((f, i) => [t + i * .32, f]);
    for (const [tt, f] of seq) cloud(X, tt, .02, { pitches: [f], d0: 50, d1: 50, l0: .9, l1: .9, vol: p.vol ?? .14 });
    const t2 = t + seq.length * .32 + .5; [...seq].reverse().forEach(([, f], i) => cloud(X, t2 + i * .32, .02, { pitches: [f], d0: 50, d1: 50, l0: .9, l1: .9, rev: true, vol: p.vol ?? .14 }));
    return t2 + seq.length * .32 + 1; },
  // 入れ子：同じ形の周期が、四倍ずつ速く・二オクターブずつ高く重なる（スケールの飛躍）
  nest(X, t, p, W) { const d = p.dur ?? 7, f = p.f ?? pitchOf(W, pick(X.R, W.hs), -1), lv = p.levels ?? 3; let end = t;
    for (let k0 = 0; k0 < lv; k0++) { const k = (p.dir ?? 1) < 0 ? lv - 1 - k0 : k0, per = (p.period ?? 2.4) / Math.pow(4, k), ff = f * Math.pow(4, k);
      const w0 = p.seq ? t + k0 * d / lv : t + k * .6, w1 = p.seq ? Math.min(t + d, w0 + d / lv * 1.25) : t + d;   // seq：層ごとに順に移る（前の層は次の層の始まりで消える）
      for (let tt = w0; tt < w1; tt += per) end = Math.max(end, partials(X, tt, Math.min(per * .9, 1.6), [ff, ff * 1.5], [1, .4], { vol: (p.vol ?? .12) * Math.pow(.7, k), atk: Math.min(.3, per * .3), rel: Math.min(.8, per * .6), pan: (k - 1) * .5 })); if ((p.dir ?? 1) < 0 && !p.seq) t += .9; }
    return end; },
  // 循環：終わりのない上昇（くり返し・輪廻・無限）
  cycle(X, t, p, W) { return V.shepard(X, t, { dur: p.dur ?? 7, f: p.f ?? F0, dir: p.dir ?? 1, vol: p.vol ?? .16 }); },
  // 無：音が近づくが、たどりつく直前で消える。あとに空気だけの静けさ
  void(X, t, p, W) { const ch = p.chord ?? chordOf(W, X.R, 3); partials(X, t, p.rise ?? 2.2, ch, [1, .6, .4], { vol: p.vol ?? .1, atk: (p.rise ?? 2.2) * .95 / X.K.atk, rel: .04, lp: 2500 }); return floor(X, t + (p.rise ?? 2.2), p.after ?? 3, "air", .012); },
  // 沈黙：かすかな二点に挟まれた、質のある静けさ（部屋・圧・空気）
  silence(X, t, p, W) { const f = p.f ?? pitchOf(W, W.ground[0], 2), d = p.dur ?? 5; cloud(X, t, .02, { pitches: [f], d0: 50, d1: 50, l0: 1.2, l1: 1.2, vol: p.vol ?? .08 }); floor(X, t + .5, d - 1, p.kind ?? "room", .018); cloud(X, t + d - .6, .02, { pitches: [f * 1.5], d0: 50, d1: 50, l0: 1.6, l1: 1.6, vol: (p.vol ?? .08) * .7 }); return t + d + 1; },
  // 知覚の外：高い二音の差が、低い F0 として「聞こえる気がする」（差音）。ほとんど聞こえない遅い揺れ
  beyond(X, t, p, W) { const d = p.dur ?? 6, hi = p.hi ?? 2860; partials(X, t, d, [hi, hi + F0], [1, 1], { vol: p.vol ?? .06, atk: 1.5, rel: 1.8, pan: -.5, pan1: .5, am: [.13, .8], noCopy: true }); return partials(X, t + d * .3, d * .7, [hi * 1.5, hi * 1.5 + F0], [1, 1], { vol: (p.vol ?? .06) * .7, atk: 2, rel: 1.8, pan: .5, pan1: -.5, am: [.09, .8], noCopy: true }); },
  // 自己と他者：節と、その鏡（音程をさかさに）が左右から重なる。merge なら最後に一つになる
  mirror(X, t, p, W) { const f = p.f ?? pitchOf(W, pick(X.R, W.hs), 1), iv = p.iv ?? [0, 4, 7, 11], d = p.dur ?? 4.5;
    iv.forEach((s, i) => { cloud(X, t + i * .45, .02, { pitches: [f * Math.pow(2, s / 12)], d0: 50, d1: 50, l0: 1, l1: 1, vol: p.vol ?? .12, width: 0 }); cloud(X, t + .22 + i * .45, .02, { pitches: [f * Math.pow(2, -s / 12)], d0: 50, d1: 50, l0: 1, l1: 1, vol: (p.vol ?? .12) * .9, width: 0 }); });
    return p.merge ? partials(X, t + iv.length * .45, d - iv.length * .45 + 1, harm(f, 4), [1, .5, .3, .2], { vol: p.vol ?? .12, atk: 1.2 }) : t + d; },
  // 時間：刻みの間隔が伸び縮みし、刻みの音そのものも引きのばされる
  timewarp(X, t, p, W) { let tt = t, iv = p.iv ?? .5, k = 0; const f = p.f ?? pitchOf(W, pick(X.R, W.hs), 1);
    while (tt < t + (p.dur ?? 6) && k < 40) { cloud(X, tt, .02, { pitches: [f * (k % 2 ? 1.5 : 1)], d0: 50, d1: 50, l0: .05 + k * (p.stretch ?? .04), l1: .05 + k * (p.stretch ?? .04), vol: p.vol ?? .14 }); tt += iv; iv *= (p.warp ?? 1.12); k++; }
    return tt; },
  // 問い：倍音の列を上り、解決しない倍音（11 番）で宙に止まる
  question(X, t, p, W) { const f = p.f ?? pitchOf(W, 4), steps = [4, 5, 6, 7, 9, 11]; steps.forEach((h, i) => cloud(X, t + i * .28, .02, { pitches: [F0 * h * (f / (F0 * 4))], d0: 50, d1: 50, l0: i === steps.length - 1 ? 2.2 : .5, l1: i === steps.length - 1 ? 2.2 : .5, vol: p.vol ?? .13, rev: i === steps.length - 1 })); return t + steps.length * .28 + 1.5; },
  // 超越・祈り：純正の和音がゆっくりうなり合い、母音「あ」の形がかすかに浮かぶ
  transcend(X, t, p, W) { const d = p.dur ?? 7, f = p.f ?? F0 * 2; partials(X, t, d, [f, f * 1.5, f * 2, f * 2.5, f * 3.01], [1, .7, .5, .35, .25], { vol: p.vol ?? .13, atk: 2.5, rel: 2.5, drift: 8, lp: 2600 }); return V.choir(X, t + 1, { dur: d - 1.5, f: f * 2, vol: (p.vol ?? .13) * .5, chord: [0, 7, 12] }); },
  // 記憶：短い節が遅れてくり返し、くり返すたびに暗く・ずれていく
  memory(X, t, p, W) { const ch = p.chord ?? chordOf(W, X.R, 3, 1); let end = t;
    for (let r = 0; r < (p.n ?? 5); r++) ch.forEach((f, i) => { end = cloud(X, t + r * (p.delay ?? .9) + i * .18, .02, { pitches: [f * Math.pow(2, -r * .02)], d0: 50, d1: 50, l0: .5 + r * .2, l1: .5 + r * .2, vol: (p.vol ?? .13) * Math.pow(.62, r), width: r * .4 }); });
    return end; },
  // 光・色：同じ倍音の束の、強める倍音が低→高へ移る（色＝どの倍音が明るいか）
  light(X, t, p, W) { const f = p.f ?? F0 * 2, n = 16, fs = harm(f, n), d = p.dur ?? 5, white = p.from == null || (p.from <= 1 && p.to >= 16);
    const band = (a, b) => fs.map((_, i) => white ? .5 : (i + 1 >= a && i + 1 <= b) ? 1 : .02);
    if (p.sweep) { const seg = d / 4; let a = p.from, w = Math.max(2, Math.round((p.to - p.from) / 3)); for (let k = 0; k < 4; k++) { const b0 = p.from + (p.to - p.from - w) * k / 3; partials(X, t + k * seg * .8, seg * 1.5, fs, band(b0, b0 + w), { vol: p.vol ?? .12, atk: seg * .5, rel: seg * .6, lp: 12000, noCopy: true }); } return t + d; }
    return partials(X, t, d, fs, fs.map((_, i) => i < 3 ? 1 : .05), { ampTo: band(p.from ?? 1, p.to ?? 16), vol: p.vol ?? .12, atk: 1.2, rel: p.rel ?? 1.6, lp: 12000 }); },
  // 息（生命）：倍音の束が 4 秒の周期でふくらみ、その下で心拍の周期が低くゆれる
  breath(X, t, p, W) { const d = p.dur ?? 7, ch = p.chord ?? chordOf(W, X.R, 3); partials(X, t, d, ch, [1, .6, .4], { vol: p.vol ?? .13, atk: 1.6, rel: 1.6, am: [.25, .8], lp: 2600 }); return partials(X, t, d, [F0 * 2, F0 * 4], [1, .35], { vol: (p.vol ?? .13) * .6, atk: .5, rel: 1, am: [p.pulse ?? 1.1, .9], lp: 400 }); },
  // 機械：格子にそろった、平均律の短い音（はみ出しのない時間）
  // 情報：行の字の符号（ビット）がそのまま格子の上のオン／オフになる
  machine(X, t, p, W) { const d = p.dur ?? 4, step = W.gap ?? .3125, bits = (p.bits ?? "10110010").split("").map(b => b === "1"), ch = chordOf({ ...W, tet: true }, X.R, 4, 1); let tt = t, i = 0;
    const wood = !p.electric;   // 読みに機械・電子・データなどがある行だけ電子音。ほかは、硬い棒が当たる響きに近い比（1：約 2.76）の粒で刻む
    for (; tt < t + d; tt += step, i++) if (bits[i % bits.length]) { const f = ch[i % ch.length]; if (wood) cloud(X, tt, .01, { pitches: [f, f * 2.76], d0: 200, d1: 200, l0: .12, l1: .12, vol: (p.vol ?? .1) * .5, width: .6 }); else partials(X, tt, step * .7, [f, f * 3], [1, .3], { vol: p.vol ?? .1, atk: .008, rel: .06, wave: X.K.hard > .75 ? "square" : "triangle", lp: 2600 }); }
    return tt; },
  // ことば：行のモーラ（字の数と種類）がそのまま拍になる、母音の形の響き
  speech(X, t, p, W) { const mora = p.mora ?? [1, 1, 2, 1], f = p.f ?? pitchOf(W, pick(X.R, W.hs), -1); let tt = t; mora.forEach((m, i) => { V.voice(X, tt, { dur: m * .18 + .05, f: f * (i % 3 === 2 ? 1.12 : 1), vol: (p.vol ?? .25), whisper: X.K.hard < .55 }); tt += m * .2; }); return tt + .3; },
  // 衝突・崩壊：倍音がばらばらの向きへ散り、別の響きに落ち着く
  collapse(X, t, p, W) { const d = p.dur ?? 3.5, f = p.f ?? pitchOf(W, pick(X.R, W.hs)), A = harm(f, 7), to = A.map(x => x * Math.pow(2, (X.R() - .6) * 1.2)); return partials(X, t, d, A, A.map((_, i) => 1 / (i + 1)), { to, toAt: 0, toEnd: .5, vol: p.vol ?? .14, atk: .01, rel: 1.5, lp: 4000, lp1: 900 }); },
  // 積層・石化：音が一つずつ加わって止まり、最後に明るさが閉じて固まる
  accumulate(X, t, p, W) { const ch = p.chord ?? chordOf(W, X.R, 5), d = p.dur ?? 6; ch.forEach((f, i) => partials(X, t + i * d * .12, d - i * d * .12, [f, f * 2], [1, .3], { vol: (p.vol ?? .09), atk: .05, rel: .6, lp: 6000, lp1: p.petrify ? 350 : 6000 })); return t + d; },
  // 流れ・漂い：倍音がそれぞれ勝手な速さでゆっくりすべる
  drift(X, t, p, W) { const ch = p.chord ?? chordOf(W, X.R, 4), d = p.dur ?? 6; return partials(X, t, d, ch, ch.map(() => 1), { to: ch.map(f => f * Math.pow(2, (X.R() - .5) * (p.range ?? .5))), vol: p.vol ?? .11, atk: 1.2, rel: 1.6, pan: -.6, pan1: .6 }); },
  // 膨張：倍音どうしの間隔が広がっていき、空間も広がる
  expand(X, t, p, W) { const f = p.f ?? F0 * 2, d = p.dur ?? 7, A = harm(f, 8); return partials(X, t, d, A, A.map((_, i) => 1 / (i + 1)), { to: A.map((x, i) => f * Math.pow(i + 1, p.k ?? 1.35) * .7), toAt: .1, vol: p.vol ?? .12, atk: 1.5, rel: 2, pan: 0, pan1: .01, lp: 7000 }); },
  // 凍結：動いていた粒が一つの響きに止まり、そのまま切れる
  freeze(X, t, p, W) { const ch = p.chord ?? chordOf(W, X.R, 3, 1), d = p.dur ?? 3.5; cloud(X, t, d * .6, { pitches: ch, d0: 30, d1: 60, l0: .03, l1: .01, s0: 1.5, s1: 0, vol: (p.vol ?? .1) * .7 }); return partials(X, t + d * .55, d * .45, ch, [1, .7, .5], { vol: p.vol ?? .1, atk: .02, rel: .02, lp: 9000 }); },
  // 熱：倍音の数が増え、揺れが速くなっていく
  energy(X, t, p, W) { const f = p.f ?? F0 * 2, d = p.dur ?? 5, A = harm(f, 12); return partials(X, t, d, A, A.map((_, i) => i < 2 ? 1 : .02), { ampTo: A.map((_, i) => 1 / Math.sqrt(i + 1)), vol: p.vol ?? .12, atk: .8, rel: 1, am: [7, .35], lp: 3000, lp1: 9000 }); },
  // 下降・上昇（重さ・沈むこと、立ちのぼること）
  descend(X, t, p, W) { const ch = p.chord ?? chordOf(W, X.R, 3, 1), d = p.dur ?? 4; return partials(X, t, d, ch, [1, .6, .4], { to: ch.map(f => f * Math.pow(2, -(p.oct ?? 1))), vol: p.vol ?? .12, atk: .4, rel: 1.4, lp1: 800 }); },
  ascend(X, t, p, W) { const ch = p.chord ?? chordOf(W, X.R, 3), d = p.dur ?? 4; return partials(X, t, d, ch, [1, .6, .4], { to: ch.map(f => f * Math.pow(2, p.oct ?? 1)), vol: p.vol ?? .12, atk: 1, rel: 1.2 }); },
  // 群れの地：その群れの法則でつくる短い響き（ほかに読みが立たない行の土台）
  ground(X, t, p, W) { const d = p.dur ?? 5, ch = p.chord ?? W.ground.map(h => pitchOf(W, h)).concat([pitchOf(W, pick(X.R, W.hs))]); return partials(X, t, d, ch, ch.map((_, i) => 1 / (i + 1)), { vol: p.vol ?? .11, atk: 1.4, rel: 1.8, drift: W.drift ? 20 : 0, am: W.time === "breath" ? [.25, .6] : null, lp: W.space.lp }); },
  // 音が音を聴く：小さな音が、自分の残響の中で増えていく（遅れの中の遅れ）
  recurse(X, t, p, W) { const f = p.f ?? pitchOf(W, pick(X.R, W.hs), 1); let end = t; for (let k = 0; k < 6; k++) end = cloud(X, t + (Math.pow(1.5, k) - 1) * .5, .02, { pitches: [f * Math.pow(1.5, k % 3) / (k > 2 ? 2 : 1)], d0: 50, d1: 50, l0: .4 + k * .3, l1: .4 + k * .3, vol: (p.vol ?? .12) * (1 - k * .1), width: k * .3 }); return end; },
  // 内側：こもった近さで、七の倍音があいまいに揺れる
  inner(X, t, p, W) { const f = p.f ?? (p.chord ? p.chord[0] : pitchOf(W, pick(X.R, W.hs), -1)), d = p.dur ?? 6; return partials(X, t, d, [f, f * 1.5, f * 7 / 4, f * 11 / 4], [1, .5, .4, .2], { vol: p.vol ?? .12, atk: 1.6, rel: 1.8, drift: 25, lp: 1400, am: [.16, .4] }); },
};
// 残り続ける差：まわりがそろっていく中で、一本だけがわずかに揺れてずれ続ける
OPS.persist = (X, t, p, W) => partials(X, t, p.dur ?? 8, [p.f ?? F0 * 4.5], [1], { vol: p.vol ?? .08, atk: 1, rel: 1.5, drift: 60, pan: .5 });
// 一本の弦の声：倍音の多い一本の低い声が、ゆっくりした揺れをもって立つ
OPS.string = (X, t, p, W) => V.drone(X, t, { f: p.f ?? F0 * 2, chord: [0], wave: "sawtooth", vib: 9, lp: (p.f ?? F0 * 2) * 7, dur: p.dur ?? 6, atk: .5, rel: 1.5, vol: p.vol ?? .2 });
OPS.flow = OPS.drift;

// ---- 行の読み（言葉 → 構造）。文の順に並べる。ものの名前は「効果音」にせず、構造の手がかりにだけ使う
export const READINGS = [
  [/反転|逆回転|裏返|表と裏|逆さ|さかさ/, "reverse"],
  [/溶け合|混ざ|融合|一致|境界|狭間|間に|あいだ|つなが|繋が|溶ける|溶けき|融和|ものを分けない|共鳴|交差|絡ま|寄り添|一緒|同期|調和|ハウリング|合う|の間|あうん|繋ぎ|縁起|ミイラ取り|かえる|還ろ|サンドイッチ|と彫刻/, "fuse"],
  [/分裂|分離|分かれ|割れ|裂け|ひび|二つに|崩壊|崩れ|解体|破壊|壊/, "split"],
  [/生まれ|生じ|生成|発生|芽生|芽|咲|産声|誕生|創造|創り|創発|はじまり|始まり|湧き|立ち上が|新し|新た|現れ|ポップアップ|目覚め|起こ|出逢|生む|もたらす|開く|ポータル|獲得|知性|自己組織|閃/, "emerge"],
  [/消え|消滅|朽ち|滅|終わ|終の|最期|最後|薄れ|剥が|失わ|忘れ|死|なくな|去る|眠|枯|しなび|消費|賞味期限|溶/, "dissolve"],
  [/無自体|無の|なにもな|何もな|虚空|空虚|無意味|存在しない|あらざる|不在|一切皆空|色即是空|空$|なんでもない|どうでもいい|無目的|かたちなき|形がなき|なきもの|無常|拘らない/, "void"],
  [/沈黙|静寂|静か|黙|しじま|無音|聴こえない|聞こえない|音なき|音ならざる/, "silence"],
  [/無限|銀河|宇宙|スケール|マルチバース|入れ子|級数|微生物|素粒子|ミクロ|惑星|地球|巨大|大き|小さ|すべて|全て|万物|無数|系|ネットワーク|山|次元|DNA|遺伝子|細胞|ガイア|世界|経済|社会|中心|上下前後左右|ヒッグス|数で/, "nest"],
  [/循環|輪廻|繰り返|くり返|円環|永劫|続け|続ける|巡/, "cycle"],
  [/可聴|知覚の外|見えない|目には見えない|以前|外側|枠外|超越|クオリア|ニュートリノ|重力波|ダークマター|不可視|触れ|気配|秘め|謎|影|死角|幽か|霞/, "beyond"],
  [/自分|他者|私|鏡|あなた|汝|映る|出逢い|別れ|男女|誰|二人|相手|見つめ|人と|愛する|画家とモデル|モデル|観察者|群衆|顔|身体|見る|聴く|女|おじさん|プレイヤー|ナマケモノと/, "mirror"],
  [/時間|時空|時の|時計|一瞬|瞬間|刹那|永遠|悠久|時系列|昨日|明日|今日|朝|夜|夕|日々|毎日|季節|年|速度|せっかち|遅|早/, "timewarp"],
  [/？|\?|why|問|なぜ|保証はあるか|べきか|可能か|存在するのか|なのか|ふり|嘘|詐欺|胡散臭|エイプリル/, "question"],
  [/祈|神|仏|悟|解脱|禅|瞑想|只管打坐|幽|魂|霊|修行|境地|東洋思想|荘子|茶道|古典|アウラ|ゾーン|忘我|美学|美しさ|アミニズム/, "transcend"],
  [/記憶|思い出|懐|蘇る|あの日|原風景|こだま|残響/, "memory"],
  [/光|輝|虹|朝日|太陽|色|青|蒼|藍|白|黒|灰|赤|透明|ネオン|写真|絵画|紫外線|見える|明るく|日焼け|緑茶|メタリック|冠/, "light"],
  [/生命|いのち|息|呼吸|心臓|鼓動|心拍|生き|胞子|菌|種/, "breath"],
  [/機械|ロボット|AI|デジタル|電子|回路|データ|コピー|情報|ネット|アップロード|計算|シミュレ|工業|製造|製品|装置|仮想|都市|システム|工場|スマホ|電車|トラック|バス|ネオン|アスファルト|コンクリート|鉄|錆/, "machine"],
  [/言葉|言語|文字|詩|語|呟|名前|点字|記号|意味|読|声|発音|話|叫|笑|呼|歌|唄|うた|アナウンス|小説|絵本|書き|鉛筆|ペン|線画|矢印|「を」|比喩|理屈|論争|哲学|主催者/, "speech"],
  [/積み|積ま|重な|石化|堆積|結晶|固ま|塔|建築|石|岩|鉱物|骨|蔵|地層|パッケージ|形成|造形|記述|設計|特許|デザイン|選択|編集|再生産|定食|パン|肥大/, "accumulate"],
  [/流れ|漂|揺れ|揺ら|流|浮遊|旅|渦|雲|風|水|雨|川|海|波|泡|霧|空気|煙|湯気|うねうね|ふさふさ|もっちり|ぼんやり|まどろ|ゆとり|暇|怠け|微動|ところてん|香り|身体を丸め/, "drift"],
  [/膨張|広が|拡散|広大|蔽いつく|満ち/, "expand"],
  [/凍|止ま|固|冷た|冬|氷/, "freeze"],
  [/燃|熱|核融合|爆発|焦げ|ふいご|エネルギー|火|炎|爆|熱狂|ダンス|踊|リズム|ビート|ノリ|加速|遠心力|テキーラ|煽|むちゃ|躍|ピクニック/, "energy"],
  [/落ち|落と|沈|滴|降|下が|埋ま|地中|土|底|穴|地下|踏/, "descend"],
  [/昇|上が|架か|飛|立ちのぼ|舞|空に|天|上に|伸び/, "ascend"],
  [/内|心の|胸|意識|無意識|夢|想像|気持ち|感情|恐怖|恐|愛|好き|幸福|痛|驚き|不安|嫌|喜|涙|ドキドキ|ざわざわ/, "inner"],
  [/崩|折れ|傾い|割ら|ギリギリ|はみ出し|おびえ|震え|痩せ|潔い|したたか|邪|危険|戦闘|苦しみ/, "collapse"],
  [/音が音|音の音|音自体|音を呼|音のような|音について|音そのもの/, "recurse"],
];
const COLOR = [[/青|蒼|藍/, 7, 11], [/白|透明/, 1, 16], [/黒|闇|暗/, 1, 3], [/赤|夕日|橙|夕焼/, 2, 6], [/灰|曇/, 4, 8], [/虹/, 3, 15], [/緑/, 5, 9], [/金|輝/, 10, 15]];

// 群れごとの構造の手持ち（読みが立たない行に使う）
const POOLS = {
  kokoro: ["inner", "mirror", "drift", "void", "memory", "fuse", "question", "split"],
  seimei: ["breath", "emerge", "nest", "dissolve", "drift", "accumulate"],
  toshi: ["machine", "accumulate", "timewarp", "recurse", "collapse", "freeze"],
  kotoba: ["speech", "memory", "emerge", "mirror", "dissolve"],
  toki: ["dissolve", "timewarp", "memory", "descend", "silence"],
  mizu: ["flow", "emerge", "descend", "freeze", "expand", "drift"],
  iro: ["light", "expand", "ascend", "freeze", "fuse"],
  oto: ["recurse", "silence", "memory", "reverse", "beyond", "void"],
  uchu: ["beyond", "nest", "expand", "silence", "cycle"],
};
const ELEC = /機械|ロボット|AI|電子|データ|デジタル|コンピュ|回路|情報|ネット|スマホ|バッテリー|電気|信号|DX|コピー|仮想/;
// 行のモーラの長短（漢字＝長・かな＝短・小さい字＝半分・読点＝休み）。ことばの群れの拍に使う
export function moraOf(text) { return [...text.replace(/の?音$/, "")].slice(0, 22).map(c => /[、。・，]/.test(c) ? 2.5 : /[ぁぃぅぇぉっゃゅょァィゥェォッャュョ]/.test(c) ? .5 : /[一-鿿]/.test(c) ? 1.6 : 1); }

// 行 → 譜（{dur, world, ops:[[t, op, p]], reading}）
export function compose(item, R, scores) {
  const W = WORLDS[item.tag] || WORLDS.kokoro, hand = scores?.[item.n];
  if (hand) {   // 手で書いた譜にも、群れの時間の法則を小さな幅で通す（譜は壊さない）
    let ops = hand.ops.map(o => [o[0], o[1], { ...(o[2] || {}) }]), dur = hand.dur ?? 9;
    ops.forEach(o => { if (o[1] === "machine" && o[2].electric == null) o[2].electric = ELEC.test(item.t); });
    if (W.time === "grid") ops.forEach(o => o[0] = Math.max(.1, Math.round(o[0] / W.gap) * W.gap));
    if (W.time === "rubato") ops.forEach((o, k) => { if (k) o[0] = Math.max(.1, o[0] + (R() - .5) * .3); });
    if (W.time === "still") { ops.forEach(o => { o[0] *= 1.1; if (o[2].dur) o[2].dur *= 1.1; }); dur *= 1.1; }
    if (W.time === "decel") ops.forEach((o, k) => o[0] *= 1 + k * .06);
    if (W.time === "speech" && !ops.some(o => o[1] === "speech")) { const mora = moraOf(item.t), len = mora.reduce((a, b) => a + b, 0) * .2 + .5; ops.push([dur - .2, "speech", { vol: .12, mora }]); dur += len; }   // 拍は譜の切れ目を避け、最後にそっと置く（のばす長さ＝拍の長さ）
    return { world: W, dur, ops, reading: hand.r, hand: true };
  }
  const text = item.t.replace(/見えない人|聞こえない人|目が見えない人|目を使わずに/g, ""), found = [];
  for (const [re, op] of READINGS) { const m = text.match(re); if (m && !found.some(f => f.op === op)) found.push({ op, i: m.index }); }
  found.sort((a, b) => a.i - b.i);
  let ops = found.slice(0, 3).map(f => f.op);
  // 読みが立たない行：その群れの法則に合う構造の中から、行ごとの種で二つを選ぶ（同じ持続音にしない）
  const pool = POOLS[item.tag] || POOLS.kokoro, a = pool[Math.floor(R() * pool.length)];
  if (!ops.length) { const b = pool.filter(x => x !== a)[Math.floor(R() * (pool.length - 1))]; ops = R() < .5 ? [a, b] : [W.sig === a ? b : W.sig, a]; }
  if (ops.length === 1) ops.push(ops[0] === a ? pool.find(x => x !== a) : a);
  if (W.time === "speech" && !ops.includes("speech")) { if (ops.length >= 3) ops[2] = "speech"; else ops.push("speech"); }   // ことばと文字：行の拍がいつも鳴る
  if (ops.length === 2 && R() < .45) { const c = pool.filter(x => !ops.includes(x)); if (c.length) ops.push(c[Math.floor(R() * c.length)]); }   // 三つめの構造を、行ごとの種で
  const col = COLOR.find(c => c[0].test(text));
  const dur = /一瞬|瞬間|刹那|「あ」/.test(text) ? 6 : /永遠|悠久|無限|ゆっくり|じわじわ/.test(text) ? 11 : 9;
  // 文の順に、少し重ねて並べる（前の構造の尾の中から、次の構造が立ち上がる）
  const out = []; let t = .3; const each = (dur - 1.2) / ops.length;
  const bits = [...item.t].slice(0, 3).map(c => c.codePointAt(0).toString(2).slice(-8)).join(""), electric = ELEC.test(item.t);
  ops.forEach((op, k) => { const p = { dur: each * 1.35, chord: chordOf(W, R, 2 + Math.floor(R() * 3), R() < .3 ? 1 : 0), bits, electric };
    if (W.time === "grid") t = Math.round(t / W.gap) * W.gap;                 // 都市と機械：格子にそろえる
    if (W.time === "rubato") t = Math.max(.1, t + (R() - .5) * .8);           // 心と意識：始まりが揺れる
    if (W.time === "still") p.dur *= 1.2;                                     // 宇宙：ほとんど動かない、長い
    if (op === "nest" && W.time === "still") p.period = 4.8; if (op === "light" && col) Object.assign(p, { from: col[1], to: col[2], color: "c" }); if (op === "speech") p.mora = moraOf(item.t); out.push([+(t).toFixed(2), op, p]); t += each * (W.time === "decel" ? 1 + k * .15 : 1); });
  return { world: W, dur, ops: out, reading: ops.join("→"), auto: !found.length };
}
