// Perch v1 の前処理（PCEN つきメルスペクトログラム）を JS で再現する。
// 入力：32 kHz・モノラル・160000 標本（5 秒）。出力：500×160 の Float32Array。
// 定数（窓・メル行列・平滑の核）は元のモデルのグラフから取り出した frontend.bin。
(function (root) {
  const N = 1024, HOP = 320, WIN = 640, T = 500, F = 160, BINS = 513, K = 256;
  // 基数 2 の FFT（実数入力を複素で計算。5 秒で 500 回なので十分速い）
  const rev = new Uint16Array(N), cos = new Float64Array(N / 2), sin = new Float64Array(N / 2);
  for (let i = 0; i < N; i++) { let r = 0; for (let b = 0, x = i; b < 10; b++, x >>= 1) r = (r << 1) | (x & 1); rev[i] = r; }
  for (let i = 0; i < N / 2; i++) { cos[i] = Math.cos(-2 * Math.PI * i / N); sin[i] = Math.sin(-2 * Math.PI * i / N); }
  function fft(re, im) {
    for (let i = 0; i < N; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1, step = N / size;
      for (let s = 0; s < N; s += size) for (let k = 0; k < half; k++) {
        const wr = cos[k * step], wi = sin[k * step], a = s + k, b = a + half;
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
      }
    }
  }
  function make(buf) { // buf: ArrayBuffer of frontend.bin
    const f = new Float32Array(buf);
    const win = f.subarray(0, WIN), mel = f.subarray(WIN, WIN + BINS * F), ker = f.subarray(WIN + BINS * F, WIN + BINS * F + K);
    const re = new Float64Array(N), im = new Float64Array(N), pw = new Float64Array(BINS);
    const E = new Float64Array(T * F);
    return function melspec(x) { // x: Float32Array(160000)
      for (let t = 0; t < T; t++) {
        const start = t * HOP - 320; // 前後に 320 の 0 を足した位置
        for (let i = 0; i < N; i++) { im[i] = 0; if (i < WIN) { const j = start + i; re[i] = (j >= 0 && j < x.length ? x[j] : 0) * win[i]; } else re[i] = 0; }
        fft(re, im);
        for (let k = 0; k < BINS; k++) { const a = re[k] * 0.003125, b = im[k] * 0.003125; pw[k] = a * a + b * b; }
        const row = t * F;
        for (let m = 0; m < F; m++) E[row + m] = 0;
        for (let k = 1; k < BINS; k++) { const p = pw[k]; if (!p) continue; const mk = k * F; for (let m = 0; m < F; m++) E[row + m] += p * mel[mk + m]; }
      }
      // PCEN：先頭のこまを 255 回くり返して前に足し、256 こまの核で平滑
      const out = new Float32Array(T * F), S2 = Math.SQRT2;
      for (let m = 0; m < F; m++) for (let t = 0; t < T; t++) {
        let acc = 0;
        for (let k = 0; k < K; k++) { const src = t + k - 255; acc += (src < 0 ? E[m] : E[src * F + m]) * ker[k]; }
        out[t * F + m] = Math.sqrt(E[t * F + m] / Math.sqrt(acc + 1e-6) + 2) - S2;
      }
      return out;
    };
  }
  root.PerchFrontend = { make, T, F };
  if (typeof module !== 'undefined') module.exports = root.PerchFrontend;
})(typeof self !== 'undefined' ? self : globalThis);
