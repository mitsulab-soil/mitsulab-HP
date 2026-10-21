/* 触覚の関数 Φ_touch（模式）。© 2026 mitsulab. All rights reserved.
   表面（凹凸の地図・硬さ・粗さ・摩擦・弾み・温かさ）と、触れる指（位置・速さ・押す力）から、
   指先に届く振動の波・へこみ・戻りを計算する。値はすべて模式で、測定値ではない。
   振動の波は 1 kHz の仮の刻みでつくる（指の振動の感じやすさは数百 Hz までに収まるため）。 */
export const FS = 1000;                 // 波の刻み（Hz）
export const SIZE_MM = 100;             // 表面の一辺（mm）
export const FORCE_MAX = 1.5;           // 軽く押す力（N・およそ）
const lerp = (a, b, t) => a + (b - a) * t;

// つまみ（0..1）から、物の値（模式）へ
export function derive(p) {
  return {
    stiffness: 10 ** lerp(-.7, 2.3, p.hard),        // N/mm：0.2（苔ほど）〜 200（石ほど）
    lowpass: lerp(60, 450, p.hard),   // 1 kHz の刻みで表せる 500 Hz 未満に                  // Hz：やわらかいほど高い震えが鈍る
    gain: lerp(.35, 1.7, p.rough),
    mu: lerp(.2, 1.0, p.fric),                       // 摩擦の係数（模式）
    zeta: lerp(2.4, .12, p.spring),                  // 減衰の比：大きいほど戻りがゆっくり・はね返らない
    natural: lerp(1.6, 11, p.hard),                  // 戻りの固有の速さ（Hz・見た目の模式）
    warmth: p.warm,                                  // 0＝ひんやり（熱を奪う）〜 1＝あたたか（模式）
  };
}

export class TouchModel {
  constructor() {
    this.buf = new Float32Array(FS * 2); this.w = 0;           // 直近 2 秒の波
    this.hp = 0; this.hpPrev = 0; this.lp = 0; this.lp2 = 0;
    this.speed = 0; this.freq = 0; this.amp = 0;
    this.dent = 0; this.dentV = 0; this.force = 0;              // へこみ（mm）
    this.stroke = []; this.recording = false;
  }
  setSurface(heightAt, params) { this.h = heightAt; this.p = params; this.d = derive(params); }
  push(v) { this.buf[this.w] = v; this.w = (this.w + 1) % this.buf.length; if (this.recording && this.stroke.length < FS * 8) this.stroke.push(v); }
  // 指が (x0,y0)→(x1,y1)（mm）へ dtMs で動いた。途中を 1 kHz で拾う
  move(x0, y0, x1, y1, dtMs) {
    const n = Math.max(1, Math.min(200, Math.round(dtMs * FS / 1000))), L = Math.hypot(x1 - x0, y1 - y0);
    const v = L / Math.max(1, dtMs) * 1000; this.speed += (v - this.speed) * Math.min(1, dtMs / 60);
    for (let i = 1; i <= n; i++) { const t = i / n; this.sample(this.h(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) * this.p.depth, v); }
  }
  idle(dtMs) { const n = Math.min(200, Math.round(dtMs * FS / 1000)); for (let i = 0; i < n; i++) this.sample(this.lastH ?? 0, 0); this.speed *= Math.exp(-dtMs / 90); }
  sample(hmm, v) {
    this.lastH = hmm;
    const d = this.d, dt = 1 / FS;
    // 大きなうねりを除く（8 Hz の高域通過）→ やわらかさの低域通過（2 段）→ 粗さの強さ
    const a = 1 / (1 + 2 * Math.PI * 8 * dt); this.hp = a * (this.hp + hmm - this.hpPrev); this.hpPrev = hmm;
    const b = 1 - Math.exp(-2 * Math.PI * d.lowpass * dt); this.lp += (this.hp - this.lp) * b; this.lp2 += (this.lp - this.lp2) * b;
    // 摩擦：動いているあいだの細かなひっかかり（速さと摩擦に比例する小さなむら）
    const slip = v > 1 ? (Math.random() * 2 - 1) * d.mu * Math.min(1, v / 120) * .05 * this.p.depth * (.4 + this.p.rough) : 0;
    this.push((this.lp2 + slip) * d.gain);
  }
  // いまの振動の周波数と強さ（直近 60 ms）
  measure() {
    const W = 60, n = this.buf.length; let z = 0, s2 = 0, prev = this.buf[(this.w - W - 1 + n) % n];
    for (let i = W; i > 0; i--) { const x = this.buf[(this.w - i + n) % n]; s2 += x * x; if ((x >= 0) !== (prev >= 0)) z++; prev = x; }
    const rms = Math.sqrt(s2 / W);
    this.amp += (Math.tanh(rms * 2.2) - this.amp) * .35;
    const f = rms > .004 ? z / 2 / (W / FS) : 0; this.freq += (f - this.freq) * .3;
    return { speed: this.speed, freq: this.freq, amp: this.amp };
  }
  // 押す力（0..FORCE_MAX）に向かって、へこみをばねと減衰で動かす
  press(dt, force) {
    this.force = force; const d = this.d, target = Math.min(8, force / d.stiffness), w = 2 * Math.PI * d.natural;
    const sub = Math.max(1, Math.ceil(dt / .004)), h = dt / sub;
    for (let i = 0; i < sub; i++) { const acc = -w * w * (this.dent - target) - 2 * d.zeta * w * this.dentV; this.dentV += acc * h; this.dent += this.dentV * h; }
    this.dent = Math.max(-.6, this.dent);   // はね返りは面の少し上までに
    return this.dent;
  }
}

// 端末の振動（対応する端末だけ）。震えるたびに onPulse(ms, amp) を呼ぶ（音を同じ刻みで鳴らすため）。
// 振動できない端末でも、同じ刻みで onPulse を呼ぶ（光の輪と音で確かめる）。
export class Vibe {
  constructor() { this.ok = typeof navigator !== "undefined" && "vibrate" in navigator; this.on = this.ok; this.last = 0; this.onPulse = null; }
  tick(now, amp) {
    if (amp > .06 && now - this.last > 45) {
      const ms = Math.round(6 + 28 * Math.min(1, amp));
      if (this.ok && this.on) try { navigator.vibrate(ms); } catch (e) { /* 止められた端末 */ }
      this.onPulse?.(ms, amp); this.last = now;
    }
  }
  tap() { if (this.ok && this.on) try { navigator.vibrate(12); } catch (e) { /* 何もしない */ } }
  stop() { if (this.ok) try { navigator.vibrate(0); } catch (e) { /* 何もしない */ } }
}

// 触れた音（実際にその物に触れた・なでた・たたいた録音から鳴らす。録音はすべて Freesound の CC0）。
// 振動の一回ごとに、なでる音の帯から短い一粒を切り出して鳴らす（グラニュラー）。
// 速さ＝再生の速さと明るさ、強さ＝音量と、帯のどの辺り（静か〜ざらつく所）を使うか、粗さ＝粒の短さとむら、硬さ＝高い音の通り。
// 音のファイルは、最初に触れたとき（利用者の操作のあと）に、いまの素材の分だけ読む＝自動再生の制限を守り、起動を遅らせない。
export class Sonic {
  constructor(sounds, base = "snd/") {
    this.AC = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
    this.ok = !!this.AC && typeof fetch !== "undefined"; this.on = this.ok; this.ctx = null; this.p = null; this.p0 = null;
    this.S = sounds; this.base = base; this.mat = null; this.bufs = new Map(); this.dec = new Map(); this.lv = new Map();
    try { if (localStorage.getItem("qt-sound") === "off") this.on = false; } catch (e) { /* 保存できない端末は入から */ }
  }
  setSurface(params, p0) { this.p = params; this.p0 = p0 || params; }
  setMaterial(m) { if (!this.S[m]) return; this.mat = m; if (this.ctx) this.load(m); }
  load(m) {
    if (this.bufs.has(m)) return this.bufs.get(m);
    const pr = fetch(this.base + m + ".m4a?v=20261021").then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((ok, ng) => { const q = this.ctx.decodeAudioData(ab, ok, ng); if (q && q.catch) q.catch(ng); }))
      .then(buf => {   // なでる音の帯を 10 ms ごとの大きさにし、静か〜大きい順に並べておく（強さで使う所を選ぶ）
        const d = buf.getChannelData(0), sr = buf.sampleRate, [s0, sl] = this.S[m].stroke, hop = Math.round(sr * .01), a = Math.round(s0 * sr), n = Math.floor(sl * sr / hop) - 12, env = [];
        for (let i = 0; i < n; i++) { let e = 0; for (let k = 0; k < hop; k++) { const v = d[a + i * hop + k] || 0; e += v * v; } env.push([i * hop / sr + s0, e]); }
        env.sort((x, y) => x[1] - y[1]); this.lv.set(m, env); this.dec.set(m, buf); return buf;
      })
      .catch(e => { this.bufs.delete(m); console.warn("音を読めませんでした", m, e); return null; });
    this.bufs.set(m, pr); return pr;
  }
  wake() {                                   // pointerdown の中で呼ぶ
    if (!this.ok || !this.on) return;
    try {
      if (!this.ctx) {
        const c = this.ctx = new this.AC();
        this.master = c.createGain(); this.master.gain.value = .42;           // 控えめに
        const comp = c.createDynamicsCompressor(); comp.threshold.value = -22; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = .003; comp.release.value = .15;
        this.master.connect(comp); comp.connect(c.destination);
      }
      if (this.ctx.state !== "running") this.ctx.resume().catch(() => {});
      if (this.mat) this.load(this.mat);
    } catch (e) { this.ok = false; }
  }
  sleep() { if (this.ctx && this.ctx.state === "running") this.ctx.suspend().catch(() => {}); }
  ready() { return this.ok && this.on && this.ctx && this.ctx.state === "running" && this.p && this.mat; }
  // 鳴らす。buf の [at, len] を、rate の速さ・vol の大きさ・cut の高い音の通りで
  play(buf, at, len, rate, vol, cut, atk) {
    const c = this.ctx, t = c.currentTime + .004, dur = len / rate;
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = Math.min(18000, cut); lp.Q.value = .5;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + Math.max(atk, dur * .55)); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(lp); lp.connect(g); g.connect(this.master); s.start(t, at, len + .01); s.stop(t + dur + .03);
  }
  level(m) { return Math.min(6, 10 ** ((-24 - (this.S[m].rms_db ?? -24)) / 20)) * (this.S[m].tone?.gain ?? 1); }   // 素材ごとの大きさをそろえ、味付けを掛ける
  // 一粒：ms＝振動の長さ、amp＝強さ（0..1）、speed＝なぞる速さ（mm/s）
  grain(ms, amp, speed = 60) {
    if (!this.ready()) return;
    const m = this.mat, buf = this.dec.get(m); if (!buf) { this.load(m); return; }
    const p = this.p, p0 = this.p0, env = this.lv.get(m); if (!env || !env.length) return;
    const dr = p.rough - p0.rough, dh = p.hard - p0.hard;
    // 強く当たるほど、帯の中の大きい（ざらつく）所から。粗さを上げるとむらを大きく
    const tn = this.S[m].tone || {}, q0 = tn.qmin ?? 0;
    const q = Math.min(.98, Math.max(q0, .25 + .7 * Math.min(1, amp) + (Math.random() - .5) * (.3 + .4 * Math.max(0, dr))));
    const at = env[Math.floor(q * (env.length - 1))][0] + Math.random() * .008;
    const len = Math.max(.045, Math.min(.16, (.06 + ms / 1000 * 2.4) * (1 - .45 * Math.max(0, dr))));
    const rate = Math.max(.7, Math.min(1.5, (.84 + Math.min(1, speed / 220) * .42) * (tn.rate ?? 1) * (1 + .18 * dh) * (1 + (Math.random() - .5) * .05)));
    const vol = Math.min(1, amp) ** 1.1 * .5 * this.level(m) * (.55 + .45 * Math.min(1, speed / 90));
    const cut = Math.min(tn.cut ?? 18000, (2600 + 14000 * Math.min(1, .25 + speed / 200 + amp * .4)) * 2 ** (dh * 1.6));
    this.play(buf, at, len, rate, vol, cut, Math.min(.012, len * .25));
  }
  tap() {
    if (!this.ready()) return;
    const m = this.mat, buf = this.dec.get(m); if (!buf) return;
    const T = this.S[m].taps; if (!T.length) return; const [at, len] = T[Math.floor(Math.random() * T.length)];
    const dh = this.p.hard - this.p0.hard, tn = this.S[m].tone || {};
    this.play(buf, at, len, (tn.rate ?? 1) * (1 + .2 * dh) * (1 + (Math.random() - .5) * .04), .38 * Math.min(1, tn.gain ?? 1), Math.min(tn.cut ?? 18000, 18000 * 2 ** (Math.min(0, dh) * 2)), .002);
  }
  setOn(on) { this.on = on && this.ok; try { localStorage.setItem("qt-sound", on ? "on" : "off"); } catch (e) { /* 何もしない */ } if (!on) this.sleep(); }
}

// 「触覚の層」の形を STL（バイナリ・mm）にする。3D プリントで触れる板になる。
// 板＝一辺 sizeMm（既定 100 mm）、土台の厚み baseMm（既定 2 mm）、その上に凹凸（つまみの深さ）。閉じた形（すき間なし）。
// 上から見て画面と同じ向き（左右・奥手前が反転しない）。
export function buildSTL(heightAt, params, { sizeMm = SIZE_MM, baseMm = 2, grid = 200 } = {}) {
  const G = grid, s = sizeMm / SIZE_MM, step = SIZE_MM / (G - 1);
  const Z = new Float32Array(G * G);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) Z[j * G + i] = baseMm + Math.max(0, Math.min(1, heightAt(i * step, j * step))) * params.depth;
  // 頂点の位置：X＝左→右、Y＝手前→奥（画面の上の行が奥）、Z＝上
  const X = i => i * step * s, Y = j => (SIZE_MM - j * step) * s;
  const nTri = 2 * (G - 1) * (G - 1) + 4 * (G - 1) * 2 + 4 * (G - 1);
  const buf = new ArrayBuffer(84 + nTri * 50), dv = new DataView(buf);
  const head = "mitsulab Qualia/touch layer (STL, mm). (c) 2026 mitsulab. All rights reserved.";
  for (let k = 0; k < 80; k++) dv.setUint8(k, k < head.length ? head.charCodeAt(k) & 127 : 32);
  dv.setUint32(80, nTri, true);
  let o = 84;
  const tri = (a, b, c) => {   // a,b,c＝[x,y,z]、外から見て反時計回り
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    for (const v of [nx, ny, nz, ...a, ...b, ...c]) { dv.setFloat32(o, v, true); o += 4; }
    dv.setUint16(o, 0, true); o += 2;
  };
  const T = (i, j) => [X(i), Y(j), Z[j * G + i]], B = (i, j) => [X(i), Y(j), 0];
  // 上の面（Y は j とともに減るので、(i,j)→(i,j+1)→(i+1,j) の向きが上から見て反時計回り）
  for (let j = 0; j < G - 1; j++) for (let i = 0; i < G - 1; i++) {
    const a = T(i, j), b = T(i + 1, j), c = T(i, j + 1), d = T(i + 1, j + 1);
    tri(a, c, b); tri(b, c, d);
  }
  // 側面：外周を上から見て反時計回りにたどる（手前の辺 j=G-1 を左→右、右の辺を手前→奥、奥の辺を右→左、左の辺を奥→手前）
  const ring = [];
  for (let i = 0; i < G - 1; i++) ring.push([i, G - 1]);
  for (let j = G - 1; j > 0; j--) ring.push([G - 1, j]);
  for (let i = G - 1; i > 0; i--) ring.push([i, 0]);
  for (let j = 0; j < G - 1; j++) ring.push([0, j]);
  for (let k = 0; k < ring.length; k++) {
    const [i0, j0] = ring[k], [i1, j1] = ring[(k + 1) % ring.length];
    const a = B(i0, j0), b = B(i1, j1), c = T(i1, j1), d = T(i0, j0);
    tri(a, b, c); tri(a, c, d);
  }
  // 底：中心から外周へ扇。下から見て反時計回り＝上から見て時計回り
  const ctr = [X((G - 1) / 2), Y((G - 1) / 2), 0];
  for (let k = 0; k < ring.length; k++) { const [i0, j0] = ring[k], [i1, j1] = ring[(k + 1) % ring.length]; tri(ctr, B(i1, j1), B(i0, j0)); }
  if (o !== buf.byteLength) throw new Error("STL size mismatch");
  return { buf, triangles: nTri, sizeMm, baseMm, reliefMm: params.depth, heightMm: baseMm + params.depth };
}

// 決まった速さでまっすぐなぞったときの振動（書き出しの profile）
export function profile(heightAt, params, speeds = [30, 60, 120, 240]) {
  return speeds.map(sp => {
    const m = new TouchModel(); m.setSurface(heightAt, params);
    const dur = Math.min(1.2, (SIZE_MM * .8) / sp), n = Math.round(dur * FS);
    let y = SIZE_MM * .5, x0 = SIZE_MM * .1, s2 = 0, z = 0, prev = 0, cnt = 0;
    for (let i = 0; i < n; i++) { m.sample(heightAt(x0 + sp * i / FS, y) * params.depth, sp); }
    for (let i = 0; i < m.buf.length && i < n; i++) { const v = m.buf[i]; if (i < 100) { prev = v; continue; } s2 += v * v; cnt++; if ((v >= 0) !== (prev >= 0)) z++; prev = v; }
    const rms = Math.sqrt(s2 / Math.max(1, cnt));
    return { speed_mm_s: sp, dominant_hz: Math.round(z / 2 / (cnt / FS)), rms_mm: +rms.toFixed(4), intensity: +Math.tanh(rms * 2.2).toFixed(3) };
  });
}

const b64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

// 一枚の「触覚の層」（形の定め＝資料/触覚Qualiaの書き出しの形.md）
export function buildLayer({ surface, params, heightAt, stroke }) {
  const d = derive(params), G = 64, hm = new Uint8Array(G * G);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) hm[j * G + i] = Math.round(255 * heightAt((i + .5) / G * SIZE_MM, (j + .5) / G * SIZE_MM));
  const forces = [0, .1, .25, .5, 1, 1.5];
  const layer = {
    format: "mitsulab.qualia-layer.touch", version: "0.1",
    sense: "touch",
    surface: { id: surface.id, label: surface.label, origin: surface.origin, material: surface.material ?? null, photo_included: false },
    units: { length: "mm", force: "N", frequency: "Hz", normalized: "0..1" },
    params: { hardness: r3(params.hard), roughness: r3(params.rough), relief_depth_mm: r3(params.depth), friction: r3(params.fric), springiness: r3(params.spring), warmth: r3(params.warm) },
    model: {
      stiffness_N_per_mm: r3(d.stiffness),
      force_to_indent: forces.map(f => ({ force_N: f, indent_mm: r3(Math.min(8, f / d.stiffness)) })),
      damping_ratio: r3(d.zeta), recovery_hz: r3(d.natural),
      friction_coefficient: r3(d.mu),
      vibration_lowpass_hz: Math.round(d.lowpass), vibration_gain: r3(d.gain),
      warmth: r3(d.warmth),
    },
    vibration_profile: profile(heightAt, params),
    relief: { size_mm: [SIZE_MM, SIZE_MM], grid: [G, G], depth_mm: r3(params.depth), order: "row-major, top row first", height_u8_base64: b64(hm) },
    last_stroke: stroke && stroke.length > 20 ? (() => {
      let mx = 1e-6; for (const v of stroke) mx = Math.max(mx, Math.abs(v));
      const i8 = new Int8Array(stroke.length); stroke.forEach((v, i) => i8[i] = Math.round(v / mx * 127));
      return { sample_rate_hz: FS, duration_ms: stroke.length, scale_mm: r3(mx), samples_i8_base64: b64(new Uint8Array(i8.buffer)) };
    })() : null,
    note: "Model values for design and comparison, not measurements of a real object.",
    rights: "© 2026 mitsulab. All rights reserved.",
  };
  return layer;
}
const r3 = v => Math.round(v * 1000) / 1000;
