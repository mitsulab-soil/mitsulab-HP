/* 受けとり方の道具（Qualia）の一角：phono ＝ 超音波を聞こえる高さに変える装置（Phono-Qualia・3D・2026-10-08）。
   元＝保留の Phono-Qualia（）。変換の計算（タイムエキスパンション・ヘテロダイン・4 次バターワース）と
   録音（Wikimedia Commons・Kaldari・CC0 1.0。米国ペンシルベニア州の録音で、日本の録音ではない）をそのまま写し、研究室の装置の台に作り直した。
   音は押したときだけ鳴る。データは台に入ったときに読む（研究室を開いたときには読まない＝スマホを軽く）。 */
import * as THREE from "three";
import { seg, btn, tag, note, fmt, DS, canvasTex } from "./util.js";

const OUT = 48000, HET_BW = 5000;
function loadScript(src) { return new Promise((res, rej) => { if (window.PHONO) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function biquadLP(x, fs, fc, q) {
  const w = 2 * Math.PI * fc / fs, c = Math.cos(w), a = Math.sin(w) / (2 * q), a0 = 1 + a;
  const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, b2 = b0, a1 = -2 * c / a0, a2 = (1 - a) / a0;
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
const lp4 = (x, fs, fc) => biquadLP(biquadLP(x, fs, fc, 0.5412), fs, fc, 1.3066);
function resample(x, step) { const n = Math.floor((x.length - 1) / step), y = new Float32Array(n); for (let k = 0; k < n; k++) { const t = k * step, i = t | 0, f = t - i; y[k] = x[i] * (1 - f) + x[i + 1] * f; } return y; }
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
}
function specOf(y, cols) {   // 0〜24 kHz（48 kHz）
  const N = 512, hop = Math.max(1, Math.floor((y.length - N) / cols)), rows = 128, out = new Float32Array(rows * cols);
  const win = new Float32Array(N).map((_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / (N - 1)));
  for (let c = 0; c < cols; c++) { const re = new Float32Array(N), im = new Float32Array(N), o = c * hop; for (let i = 0; i < N; i++) re[i] = (y[o + i] || 0) * win[i]; fft(re, im);
    for (let r = 0; r < rows; r++) { const k = r * 2; out[(rows - 1 - r) * cols + c] = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + re[k + 1] * re[k + 1] + im[k + 1] * im[k + 1] + 1e-12); } }
  return { rows, cols, db: out };
}
const color = v => { const t = Math.max(0, Math.min(1, v)); return [Math.round(3 + 90 * t * t + 160 * Math.max(0, t - .7) / .3), Math.round(6 + 194 * t), Math.round(15 + 210 * Math.sqrt(t))]; };

export function create(H) {
  const g = new THREE.Group(); const { std, box, cyl } = H;
  // 装置：受信器（マイクとつまみ）・画面二枚（左＝録った音 0〜64 kHz、右＝聞こえる音 0〜24 kHz）・スピーカー
  const base = box(1.9, .03, .6, std(DS.base, .5)); base.position.y = .015; g.add(base);
  const det = box(.32, .18, .22, std(0x2a2e31, .45, .5)); det.position.set(-.72, .12, .1); g.add(det);
  const mic = cyl(.018, .024, .16, std(0x8a948e, .3, .8), 14); mic.rotation.z = Math.PI / 2; mic.position.set(-.94, .16, .1); g.add(mic);
  const knob = cyl(.035, .035, .03, std(0xb9b9b9, .3, .8), 20); knob.rotation.x = Math.PI / 2; knob.position.set(-.66, .13, .215); g.add(knob);
  const knobMark = box(.006, .03, .004, std(0xd04a2a, .5)); knobMark.position.set(-.66, .14, .232); g.add(knobMark);
  const lcd = canvasTex(256, 64, () => {}); const lcdC = lcd.image.getContext("2d");
  const lcdM = new THREE.Mesh(new THREE.PlaneGeometry(.2, .05), new THREE.MeshBasicMaterial({ map: lcd, toneMapped: false })); lcdM.position.set(-.76, .17, .212); g.add(lcdM);
  const spk = cyl(.07, .07, .12, std(0x24282b, .6), 24); spk.rotation.x = Math.PI / 2; spk.position.set(.82, .1, .12); g.add(spk);
  const cone = new THREE.Mesh(new THREE.CircleGeometry(.055, 24), std(0x3a3f44, .9)); cone.position.set(.82, .1, .181); g.add(cone);
  const mk = () => { const c = document.createElement("canvas"); c.width = 640; c.height = 360; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, x: c.getContext("2d"), t }; };
  const A = mk(), B = mk();
  for (const [s, x] of [[A, -.36], [B, .4]]) {
    const fr = box(.66, .4, .03, std(0x1a1d1f, .5, .4)); fr.position.set(x, .42, -.12); g.add(fr);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(.62, .35), new THREE.MeshBasicMaterial({ map: s.t, toneMapped: false })); scr.position.set(x, .42, -.104); g.add(scr);
    const st = box(.04, .22, .04, std(0x2a2e31, .5, .5)); st.position.set(x, .12, -.12); g.add(st);
  }
  const t1 = tag("録った音（0〜64 kHz）", { w: .26 }); t1.position.set(-.36, .67, -.1); g.add(t1);
  const t2 = tag("あなたの耳に届く音（0〜24 kHz）", { w: .32 }); t2.position.set(.4, .67, -.1); g.add(t2);
  const n1 = note("黄色の線＝20 kHz（多くの人の耳の上限）", { w: .4 }); n1.position.set(0, .03, .3); g.add(n1);
  let recs = null, cur = 0, method = "te10", lo = 25, outY = null, outSpec = null, src = null, t0 = 0, playing = false, loading = false;
  function frame(s, title) { const x = s.x; x.fillStyle = "#081215"; x.fillRect(0, 0, 640, 360); x.fillStyle = "#9fd6cf"; x.font = "22px 'Hiragino Sans',sans-serif"; x.fillText(title, 14, 30); }
  function drawSpec(s, rows, cols, val, fmax, title, play) {
    frame(s, title); const img = s.x.createImageData(cols, rows);
    for (let i = 0; i < rows * cols; i++) { const [r, gg, b] = color(val(i)); img.data[4 * i] = r; img.data[4 * i + 1] = gg; img.data[4 * i + 2] = b; img.data[4 * i + 3] = 255; }
    const tmp = document.createElement("canvas"); tmp.width = cols; tmp.height = rows; tmp.getContext("2d").putImageData(img, 0, 0);
    const X0 = 60, Y0 = 44, W = 560, Hh = 290; s.x.imageSmoothingEnabled = true; s.x.drawImage(tmp, X0, Y0, W, Hh);
    s.x.fillStyle = "#6f8c88"; s.x.font = "18px sans-serif"; for (let k = 0; k <= 4; k++) { const f = fmax * k / 4; s.x.fillText(`${Math.round(f / 1000)}k`, 8, Y0 + Hh - Hh * k / 4 + 6); }
    if (fmax > 20000) { const y = Y0 + Hh - Hh * 20000 / fmax; s.x.strokeStyle = "#e8c53a"; s.x.lineWidth = 3; s.x.beginPath(); s.x.moveTo(X0, y); s.x.lineTo(X0 + W, y); s.x.stroke(); }
    else { s.x.strokeStyle = "#e8c53a"; s.x.lineWidth = 3; s.x.beginPath(); s.x.moveTo(X0, Y0 + Hh - Hh * 20000 / fmax); s.x.lineTo(X0 + W, Y0 + Hh - Hh * 20000 / fmax); s.x.stroke(); }
    if (play != null) { s.x.strokeStyle = "#ffffff"; s.x.lineWidth = 2; s.x.beginPath(); s.x.moveTo(X0 + W * play, Y0); s.x.lineTo(X0 + W * play, Y0 + Hh); s.x.stroke(); }
    s.t.needsUpdate = true;
  }
  function drawIn() { if (!recs) { frame(A, "読みこんでいます…"); A.t.needsUpdate = true; return; } const r = recs[cur], sp = r.spec; drawSpec(A, sp.rows, sp.cols, i => r.img[i] / 255, sp.fmax, `${r.label}（実時間 ${r.dur} 秒）`); }
  function drawOut(play = null) {
    if (!outSpec) { frame(B, "変えて鳴らすと、ここに出ます"); B.t.needsUpdate = true; return; }
    let mx = -1e9; for (const v of outSpec.db) mx = Math.max(mx, v);
    drawSpec(B, outSpec.rows, outSpec.cols, i => (outSpec.db[i] - mx + 70) / 70, 24000, label(), play);
  }
  const label = () => method === "raw" ? "そのまま" : method === "het" ? `ヘテロダイン ${lo} kHz（実時間）` : `タイムエキスパンション ×${method === "te10" ? 10 : 20}（${fmt(outY.length / OUT, 1)} 秒）`;
  function lcdDraw() { lcdC.fillStyle = "#0b1a14"; lcdC.fillRect(0, 0, 256, 64); lcdC.fillStyle = "#7fe0a8"; lcdC.font = "600 30px monospace"; lcdC.fillText(method === "het" ? `HET ${lo}kHz` : method === "raw" ? "DIRECT" : `TE x${method === "te10" ? 10 : 20}`, 12, 42); lcd.needsUpdate = true; knob.rotation.z = knobMark.rotation.z = method === "het" ? -(lo - 15) / 45 * 4 : 0; }
  function render() {
    const r = recs[cur], fs = r.fs;
    if (method === "raw") return resample(lp4(lp4(r.x, fs, 22000), fs, 22000), fs / OUT);
    if (method !== "het") { const te = method === "te10" ? 10 : 20, fc = fs / te / 2 * .9; return lp4(lp4(resample(r.x, fs / (OUT * te)), OUT, fc), OUT, fc); }
    const m = new Float32Array(r.x.length), w = 2 * Math.PI * lo * 1000 / fs; for (let i = 0; i < m.length; i++) m[i] = r.x[i] * Math.cos(w * i) * 2;
    return resample(lp4(m, fs, HET_BW), fs / OUT);
  }
  function stop() { if (src) { try { src.stop(); } catch {} src = null; } playing = false; drawOut(null); }
  function convert(play) {
    if (!recs) return;
    outY = render(); outSpec = specOf(outY, 300); drawOut(null); lcdDraw();
    if (!play) return;
    const AUD = H.aud(); if (!AUD?.ctx) { H.toast("どこかを一度押すと、音が出せます"); return; }
    stop(); const c = AUD.ctx, b = c.createBuffer(1, outY.length, OUT); b.getChannelData(0).set(outY);
    const gn = c.createGain(); gn.gain.value = .6; src = c.createBufferSource(); src.buffer = b; src.connect(gn); gn.connect(AUD.master); src.start(); t0 = c.currentTime; playing = true;
    src.onended = () => { playing = false; src = null; drawOut(null); };
  }
  async function load() {
    if (recs || loading) return; loading = true; drawIn(); drawOut();
    try { await loadScript("data/qualia/phono.js"); } catch { H.toast("録音を読みこめませんでした"); return; }
    recs = window.PHONO.recs.map(r => {
      const bin = atob(r.pcm), n = bin.length >> 1, x = new Float32Array(n);
      for (let i = 0; i < n; i++) { let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (v > 32767) v -= 65536; x[i] = v / 32768; }
      const s = atob(r.spec.u8), img = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) img[i] = s.charCodeAt(i);
      return Object.assign({}, r, { x, img, spec: { rows: r.spec.rows, cols: r.spec.cols, fmax: r.spec.fmax } });
    });
    drawIn(); convert(false);
  }
  drawIn(); drawOut(); lcdDraw();
  let pt = 0;
  return {
    group: g, focus: { y: .36, dist: 1.7, pitch: .12 }, labelY: 1.05,
    enter() { load(); },
    exit() { stop(); },
    tick(dt, on) { if (!on || !playing) return; pt += dt; if (pt > .08) { pt = 0; const AUD = H.aud(); const f = (AUD.ctx.currentTime - t0) / (outY.length / OUT); drawOut(Math.min(1, f)); cone.scale.setScalar(1 + .06 * Math.random()); } },
    ui(box_) {
      seg(box_, [[0, "録音 1"], [1, "録音 2（えものの直前）"]], cur, v => { cur = v; stop(); drawIn(); convert(false); }, "録音");
      seg(box_, [["raw", "そのまま"], ["te10", "×10 ゆっくり"], ["te20", "×20 ゆっくり"], ["het", "ヘテロダイン"]], method, v => { method = v; stop(); convert(false); }, "変え方");
      seg(box_, [[20, "20 kHz"], [25, "25 kHz"], [30, "30 kHz"], [40, "40 kHz"]], lo, v => { lo = v; if (method === "het") { stop(); convert(false); } }, "ヘテロダインの高さ");
      btn(box_, "鳴らす", () => convert(true), true); btn(box_, "止める", () => stop());
    },
    read() {
      if (!recs) return `<div class="note">録音を読みこんでいます…</div>`;
      const r = recs[cur], F = (window.QCARDS || {}).facts?.phono || {};
      return `<div class="row"><span><span class="k">録音</span> ${r.label}：${r.what}</span><span><span class="k">種</span> ${r.species}（${r.species_note}）</span></div>
<div class="row"><span><span class="k">録音 1 の強いところ</span> 約 ${F.hoary_peak_khz} kHz（${F.hoary_lo_khz}〜${F.hoary_hi_khz}）</span><span><span class="k">×10 で</span> 約 ${F.hoary_te10_khz} kHz・${F.hoary_te10_s} 秒</span><span><span class="k">録音 2</span> 約 ${F.buzz_peak_khz} kHz</span></div>
<div class="note">録音：<a href="${r.page}" target="_blank" rel="noopener">${r.who}</a>（${r.lic}）・${r.where}・${r.date}。日本の録音ではありません。音は押したときだけ鳴ります。数値はこの録音から計算した値。</div>`;
    },
  };
}
