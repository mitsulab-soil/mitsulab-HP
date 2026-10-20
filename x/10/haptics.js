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

// 触れ心地の音（Web Audio で合成。外の音源は使わない）。
// 振動の一回ごとに、短い「ざらっ」「こつ」を一粒鳴らす。粗さ＝雑音の多さ、硬さ＝明るさと短さ、強さ＝音量。
// 最初に触れたとき（利用者の操作のあと）に音の道具をつくる＝自動再生の制限を守る。
export class Sonic {
  constructor() {
    this.AC = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
    this.ok = !!this.AC; this.on = this.ok; this.ctx = null; this.d = null; this.p = null;
    try { if (localStorage.getItem("qt-sound") === "off") this.on = false; } catch (e) { /* 保存できない端末は入から */ }
  }
  setSurface(params) { this.p = params; this.d = derive(params); }
  wake() {                                   // pointerdown の中で呼ぶ
    if (!this.ok || !this.on) return;
    try {
      if (!this.ctx) {
        const c = this.ctx = new this.AC();
        this.master = c.createGain(); this.master.gain.value = .5;
        const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 8; comp.attack.value = .002; comp.release.value = .12;
        this.master.connect(comp); comp.connect(c.destination);
        const n = c.createBuffer(1, c.sampleRate, c.sampleRate), d = n.getChannelData(0);
        let b = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = .97 * b + .03 * w; d[i] = w * .7 + b * 2.2; }   // 白い雑音に少し低い成分を混ぜる
        this.noise = n;
      }
      if (this.ctx.state !== "running") this.ctx.resume().catch(() => {});
    } catch (e) { this.ok = false; }
  }
  sleep() { if (this.ctx && this.ctx.state === "running") this.ctx.suspend().catch(() => {}); }
  // 一粒：ms＝振動の長さ、amp＝強さ（0..1）
  grain(ms, amp, kind = "stroke") {
    if (!this.ok || !this.on || !this.ctx || this.ctx.state !== "running" || !this.p) return;
    const c = this.ctx, t = c.currentTime + .005, p = this.p;
    const center = kind === "tap" ? 180 + 1500 * p.hard ** 1.3 : 260 + 2600 * p.hard ** 1.2 + 500 * p.rough;   // 硬いほど明るい
    const dur = Math.max(.012, Math.min(.12, ms / 1000 * (kind === "tap" ? 2.2 : 1.1) * (1.25 - .55 * p.hard) * (1 + .6 * p.spring)));
    const vol = Math.min(1, amp) * (kind === "tap" ? .16 : .22) * (.55 + .45 * p.rough);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.004, dur * .2)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = center * (.9 + Math.random() * .2); f.Q.value = .8 + 5 * (1 - p.rough);   // なめらかなほど音の高さがはっきりする
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900 + 5200 * p.hard;                                               // やわらかいほど高い音が鈍る
    const s = c.createBufferSource(); s.buffer = this.noise; s.connect(f); f.connect(lp); lp.connect(g); g.connect(this.master);
    s.start(t, Math.random() * .8, dur + .02);
    if (p.rough < .5 || kind === "tap") {   // なめらか・硬い面は、雑音に小さな響きを足す（金属・石の「こつ」）
      const o = c.createOscillator(), og = c.createGain(); o.type = "sine"; o.frequency.value = center;
      const ov = vol * (kind === "tap" ? .9 : .6) * (1 - p.rough) * p.hard;
      og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(ov, t + .003); og.gain.exponentialRampToValueAtTime(.0005, t + dur * 1.4);
      o.connect(og); og.connect(this.master); o.start(t); o.stop(t + dur * 1.4 + .02);
    }
  }
  tap() { this.grain(14, .7, "tap"); }
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
