// © mitsulab. 鳥の声の聞き分け（Web Worker・2026-11-02 本人決定で本番へ）。Google Perch v1（重み Apache 2.0）の埋め込み＋日本で見られる 63 種の列。
// 音は端末の中だけで扱い、送らず残さない（判定のあと捨てる）。モデルの置き場所は load のときに受けとる（3 版で一つを共有）。
importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js', 'frontend.js');
ort.env.wasm.numThreads = 1; ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
let melspec, sess, W, B, species, NS;
async function load(base) {
  const [fb, hb, sp, mb] = await Promise.all(['frontend.bin', 'head_jp.bin', 'species.json', 'perch_emb.onnx'].map((f, i) => fetch(base + f).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return i === 2 ? r.json() : r.arrayBuffer(); })));
  melspec = PerchFrontend.make(fb); species = sp; NS = sp.length; const h = new Float32Array(hb); W = h.subarray(0, 1280 * NS); B = h.subarray(1280 * NS);
  sess = await ort.InferenceSession.create(mb, { executionProviders: ['wasm'] });
}
function resample(x, sr) { if (sr === 32000) return x; const n = Math.floor(x.length * 32000 / sr), y = new Float32Array(n), k = sr / 32000; for (let i = 0; i < n; i++) { const p = i * k, j = p | 0, f = p - j; y[i] = (x[j] || 0) * (1 - f) + (x[j + 1] || 0) * f; } return y; }
async function classify(raw, sr) {
  const x = resample(raw, sr); let m = 0, e2 = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; e2 += a * a; }
  const rms = Math.sqrt(e2 / Math.max(1, x.length)); if (rms < .002) { raw.fill(0); x.fill(0); return { top: [], quiet: true }; }   // ほぼ無音なら判定しない
  const y = new Float32Array(160000); for (let i = 0; i < x.length && i < 160000; i++) y[i] = x[i] / m * .25;
  const o = await sess.run({ 'mel:0': new ort.Tensor('float32', melspec(y), [1, 500, 160]) }), e = o['pl_emb:0'].data, lg = new Float32Array(NS);
  for (let j = 0; j < NS; j++) { let s = B[j]; for (let k = 0; k < 1280; k++) s += e[k] * W[k * NS + j]; lg[j] = s; }
  raw.fill(0); x.fill(0); y.fill(0);   // 音の中身はここで捨てる
  return { top: [...lg.keys()].sort((a, b) => lg[b] - lg[a]).slice(0, 2).map(j => ({ ja: species[j].ja, p: 1 / (1 + Math.exp(-lg[j])) })) };
}
onmessage = async ev => { const d = ev.data; try { if (d.type === 'load') { await load(d.base); postMessage({ type: 'loaded' }); } else if (d.type === 'audio') postMessage({ type: 'result', ...(await classify(d.samples, d.sr)) }); } catch (e) { postMessage({ type: 'error', message: String(e) }); } };
