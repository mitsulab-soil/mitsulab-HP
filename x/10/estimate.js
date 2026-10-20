/* 写真一枚から表面の地図をつくる（ブラウザの中だけ。どこにも送らない・残さない）。© 2026 mitsulab. All rights reserved.
   色＝写真の中央の正方形／凹凸＝明るさから照明のむらを除き、暗い溝を低く・明るい面を高いと見なした推定／法線＝凹凸の傾き／粗さ＝明るさの細かなばらつき。
   推定であって測定ではない（画面には「推定した凹凸」と出す）。 */
export const N = 512;

// 端を延ばした箱のぼかし（横・縦。r 画素）
function box(src, dst, w, h, r) {
  const tmp = new Float32Array(w * h), k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const o = y * w; let s = 0;
    for (let i = -r; i <= r; i++) s += src[o + Math.min(w - 1, Math.max(0, i))];
    for (let x = 0; x < w; x++) { tmp[o + x] = s * k; s += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let i = -r; i <= r; i++) s += tmp[Math.min(h - 1, Math.max(0, i)) * w + x];
    for (let y = 0; y < h; y++) { dst[y * w + x] = s * k; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
  }
  return dst;
}
export function blur(src, w, h, r) { const a = new Float32Array(w * h), b = new Float32Array(w * h); box(src, a, w, h, r); box(a, b, w, h, r); return box(b, a, w, h, r); }

function normalize01(a, lo = .02, hi = .98) {
  const s = Float32Array.from(a).sort(), l = s[Math.floor(s.length * lo)], u = s[Math.floor(s.length * hi)], d = u - l || 1;
  for (let i = 0; i < a.length; i++) a[i] = Math.min(1, Math.max(0, (a[i] - l) / d));
  return a;
}

// 凹凸の高さ（0..1・N×N）から、法線の地図（GL の向き：+Y が上）を canvas に描く
export function normalCanvas(hgt, n = N, strength = 6) {
  const cv = document.createElement("canvas"); cv.width = cv.height = n;
  const g = cv.getContext("2d"), im = g.createImageData(n, n), d = im.data;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const xl = hgt[y * n + Math.max(0, x - 1)], xr = hgt[y * n + Math.min(n - 1, x + 1)];
    const yu = hgt[Math.max(0, y - 1) * n + x], yd = hgt[Math.min(n - 1, y + 1) * n + x];
    let nx = -(xr - xl) * strength, ny = (yd - yu) * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * n + x) * 4; d[i] = (nx * .5 + .5) * 255; d[i + 1] = (ny * .5 + .5) * 255; d[i + 2] = (nz * .5 + .5) * 255; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return cv;
}
export function grayCanvas(a, n = N) {
  const cv = document.createElement("canvas"); cv.width = cv.height = n;
  const g = cv.getContext("2d"), im = g.createImageData(n, n), d = im.data;
  for (let i = 0; i < n * n; i++) { const v = a[i] * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); return cv;
}

export async function estimateFromFile(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });   // 位置情報などの付帯情報は画素に入らない
  const s = Math.min(bmp.width, bmp.height), sx = (bmp.width - s) / 2, sy = (bmp.height - s) / 2;
  const color = document.createElement("canvas"); color.width = color.height = 1024;
  color.getContext("2d").drawImage(bmp, sx, sy, s, s, 0, 0, 1024, 1024);
  const small = document.createElement("canvas"); small.width = small.height = N;
  const sg = small.getContext("2d", { willReadFrequently: true }); sg.drawImage(bmp, sx, sy, s, s, 0, 0, N, N);
  bmp.close?.();
  const px = sg.getImageData(0, 0, N, N).data, L = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
    L[i] = .2126 * lin(px[i * 4]) + .7152 * lin(px[i * 4 + 1]) + .0722 * lin(px[i * 4 + 2]);
  }
  // 照明のむら（大きな明暗）を割って除く → 対数の反射の比
  const B = blur(L, N, N, 40), R = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) R[i] = Math.log((L[i] + .004) / (B[i] + .004));
  // いくつかの大きさの凹凸を重ねる（細かい肌理＋中くらいの溝＋大きなうねり）
  const r1 = blur(R, N, N, 1), r3 = blur(R, N, N, 4), r9 = blur(R, N, N, 12), H = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) H[i] = .25 * r1[i] + .4 * r3[i] + .35 * r9[i];
  normalize01(H);
  // 粗さ：明るさの細かなばらつき（4 画素の窓）
  const m = blur(L, N, N, 3), L2 = new Float32Array(N * N); for (let i = 0; i < N * N; i++) L2[i] = L[i] * L[i];
  const m2 = blur(L2, N, N, 3), Rg = new Float32Array(N * N); let grad = 0;
  for (let i = 0; i < N * N; i++) Rg[i] = Math.sqrt(Math.max(0, m2[i] - m[i] * m[i])) / (m[i] + .02);
  normalize01(Rg); for (let i = 0; i < N * N; i++) Rg[i] = .62 + .38 * Rg[i];
  for (let y = 1; y < N - 1; y += 2) for (let x = 1; x < N - 1; x += 2) grad += Math.abs(H[y * N + x + 1] - H[y * N + x - 1]) + Math.abs(H[(y + 1) * N + x] - H[(y - 1) * N + x]);
  grad /= ((N / 2) ** 2);
  return {
    color, height: H, heightCanvas: grayCanvas(H), normalCanvas: normalCanvas(H), roughCanvas: grayCanvas(Rg),
    origin: "photo",
    params: { hard: .5, rough: Math.min(.95, Math.max(.2, grad * 6)), depth: 3, fric: .5, spring: .35, warm: .5 },
  };
}
