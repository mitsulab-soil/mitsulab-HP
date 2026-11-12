/* © mitsulab. 鳥の声を聞く（2026-11-02 本人決定「鳥の声の認識を本番に入れる」）。Qualium 3 版共通。
   ・マイクは、本人が「鳥の声を聞く」を押し、端末の許可を出したあとだけ使う。押さなければ何も読み込まない（起動の重さに響かない）。
   ・音は端末の中（Worker）で 5 秒ずつ聞き分け、送らず残さない。似ている度合いが 0.6 以上のときだけ、碧が「〜の声に似ています」と言う（断定しない）。
   ・同じ種は 90 秒に一度まで。画面が隠れたら止める。モデル＝Google Perch v1（Apache 2.0）・onnxruntime-web（MIT）。
   使い方：const E = makeBirdEar({ base: "web/kit/birdear/", model: "<モデルの置き場所>", say: (line) => {...}, onState: s => {} }); E.toggle(); */
export function makeBirdEar(o) {
  let worker = null, ready = null, st = null, ac = null, node = null, timer = 0, on = false, busy = false, V = null; const last = new Map();
  const vo = () => V || (V = fetch(o.base + "voice.json").then(r => r.json()));
  function ensure() { if (ready) return ready; worker = new Worker(o.base + "worker.js");
    ready = new Promise((res, rej) => { worker.onmessage = e => { if (e.data.type === "loaded") res(); else if (e.data.type === "error") rej(e.data.message); }; });
    worker.postMessage({ type: "load", base: new URL(o.model || (o.base + "model/"), location.href).href }); return ready; }
  function run(samples, sr) { return new Promise(r => { worker.onmessage = e => { if (e.data.type === "result") r(e.data); else r({ top: [] }); }; worker.postMessage({ type: "audio", samples, sr }, [samples.buffer]); }); }
  async function start() {
    on = true; o.onState?.("load");
    try { st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { on = false; o.onState?.("denied"); return; }
    try { ac = new AudioContext({ sampleRate: 32000 }); } catch { ac = new AudioContext(); }
    const sr = ac.sampleRate, N = Math.round(sr * 5), ring = new Float32Array(N); let w = 0, filled = 0;
    const src = ac.createMediaStreamSource(st); node = ac.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = e => { const d = e.inputBuffer.getChannelData(0); for (let i = 0; i < d.length; i++) { ring[w] = d[i]; w = (w + 1) % N; } filled += d.length; };
    const mute = ac.createGain(); mute.gain.value = 0; src.connect(node); node.connect(mute); mute.connect(ac.destination);   // 聞こえる音は出さない
    vo().then(v => o.say(v._on)).catch(() => { });
    try { await ensure(); } catch (e) { console.warn("birdear", e); stop(true); o.onState?.("error"); return; }
    if (!on) return; o.onState?.("on");
    timer = setInterval(async () => { if (busy || !on || filled < N || document.hidden) return; busy = true;
      const seg = new Float32Array(N); seg.set(ring.subarray(w)); seg.set(ring.subarray(0, w), N - w);
      const r = await run(seg, sr); busy = false; const t = r.top && r.top[0]; if (!on || !t || t.p < .6) return;
      try { dispatchEvent(new CustomEvent("qualium:bird", { detail: { ja: t.ja, p: t.p } })); } catch { }   // 11-13 聞き分けた種の名と度合いだけを知らせる（音は渡さない）。kit/kikai.js が向きに印を置く
      const now = performance.now(); if (now - (last.get(t.ja) || -1e9) < 90000) return; last.set(t.ja, now);
      const v = (await vo())[t.ja]; if (v && !(o.busy && o.busy())) o.say(v, t); }, 3000);
  }
  function stop(silent) { on = false; clearInterval(timer); try { node && (node.onaudioprocess = null, node.disconnect()); } catch { } try { st && st.getTracks().forEach(k => k.stop()); } catch { } try { ac && ac.close(); } catch { } st = ac = node = null; o.onState?.("off"); if (!silent) vo().then(v => o.say(v._off)).catch(() => { }); }
  document.addEventListener("visibilitychange", () => { if (document.hidden && on) stop(true); });
  return { toggle() { on ? stop() : start(); }, get on() { return on; }, stop };
}
