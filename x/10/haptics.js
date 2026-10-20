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

// 端末の振動（対応する端末だけ。音は使わない）
export class Vibe {
  constructor() { this.ok = typeof navigator !== "undefined" && "vibrate" in navigator; this.on = this.ok; this.last = 0; }
  tick(now, amp, pressing) {
    if (!this.ok || !this.on) return;
    if (amp > .06 && now - this.last > 45) { try { navigator.vibrate(Math.round(6 + 28 * Math.min(1, amp))); } catch (e) { /* 止められた端末 */ } this.last = now; }
  }
  tap() { if (this.ok && this.on) try { navigator.vibrate(12); } catch (e) { /* 何もしない */ } }
  stop() { if (this.ok) try { navigator.vibrate(0); } catch (e) { /* 何もしない */ } }
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
