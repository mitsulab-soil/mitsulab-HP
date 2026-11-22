/* sonic.js ── Qualia/sonic：マイクで拾った高い音を、聴こえる高さへ移して聴く（ヘテロダイン＝コウモリの検出器と同じ方式）。
   マイクが拾えない帯域（コウモリの声の多く）は「聴こえる高さに移した模式」の音で聴く。 */
import { create, THREE, hash1 } from './kit/qfield.js';

export function start(canvas) {
  const F = create(canvas, { pitch: .18, sky: '#9fb2c4' });
  // 夕方の空を飛ぶアブラコウモリ（模式。翼を広げて約 20 cm）
  const batM = new THREE.MeshStandardMaterial({ color: '#2a221e', roughness: .8, side: THREE.DoubleSide });
  const bats = []; for (let k = 0; k < 3; k++) { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), batM); body.scale.set(.8, .8, 1.6); g.add(body);
    const wg = new THREE.Shape(); wg.moveTo(0, 0); wg.lineTo(.1, .03); wg.lineTo(.11, -.01); wg.lineTo(.07, -.02); wg.lineTo(.05, -.05); wg.lineTo(.02, -.03); wg.lineTo(0, -.04);
    const geo = new THREE.ShapeGeometry(wg).rotateX(-Math.PI / 2); const wings = [];
    for (const s of [-1, 1]) { const w = new THREE.Mesh(geo, batM); w.scale.x = s; g.add(w); wings.push(w); }
    g.scale.setScalar(4.5); F.S.add(g); bats.push({ g, wings, ph: hash1(k * 3) * 6, r: 1.6 + k * .9, h: 5 + k * 1.4, sp: .7 + hash1(k) * .4 }); }
  // 音の輪（いま拾っている高い音の強さに応じて、目の前に広がる）
  const ringM = new THREE.MeshBasicMaterial({ color: '#cfe9f0', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const rings = []; for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.98, 1, 64), ringM.clone()); r.position.set(0, 1.5, 1); F.S.add(r); rings.push({ r, t: i / 6 }); }

  let level = 0, call = 0;
  F.onFrame = (dt, t) => {
    for (const b of bats) { const a = b.ph + t * b.sp; b.g.position.set(Math.cos(a) * b.r, b.h + Math.sin(a * 2.3) * .8, -9 - 3 * b.r + Math.sin(a) * b.r * 1.5); b.g.rotation.y = -a; const fl = Math.sin(t * 22 + b.ph) * .9; b.wings[0].rotation.z = fl; b.wings[1].rotation.z = -fl; }
    for (const R of rings) { R.t = (R.t + dt * .35) % 1; const s = .2 + R.t * 6; R.r.scale.setScalar(s); R.r.material.opacity = (1 - R.t) * Math.min(1, level * 3 + call) * .5; R.r.lookAt(F.cam.position); }
    call = Math.max(0, call - dt * .8);
  };
  return { F, setLevel(v) { level = v; }, pulse() { call = 1; } };
}

// ── 音 ──
export function audio() {
  const AC = new (window.AudioContext || window.webkitAudioContext)();
  const out = AC.createGain(); out.gain.value = .9; out.connect(AC.destination);
  const an = AC.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = .6;
  let mic = null, het = null, osc = null;
  async function openMic(f0) {
    const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    mic = AC.createMediaStreamSource(st); mic.connect(an);
    // 高い音だけを取り出し（15 kHz より下を落とす）→ 発振器とかけ合わせる（周波数の差が聴こえる高さに降りる）→ 5 kHz より上を落とす
    const hp1 = AC.createBiquadFilter(); hp1.type = 'highpass'; hp1.frequency.value = 15000; hp1.Q.value = .7;
    const hp2 = AC.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = 15000; hp2.Q.value = .7;
    const mix = AC.createGain(); mix.gain.value = 0; osc = AC.createOscillator(); osc.frequency.value = f0; osc.connect(mix.gain); osc.start();
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
    const boost = AC.createGain(); boost.gain.value = 6;
    mic.connect(hp1); hp1.connect(hp2); hp2.connect(mix); mix.connect(lp); lp.connect(boost); boost.connect(out); het = boost;
    return st; }
  function tune(f0) { osc && osc.frequency.setTargetAtTime(f0, AC.currentTime, .05); }
  // 模式：アブラコウモリの探す声（約 100 kHz から 40 kHz 前後へ下がる、数ミリ秒の FM）を、時間を 10 倍にのばし、高さを 1/10 にした音
  function batCall() { const t0 = AC.currentTime + .02, o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(10000, t0); o.frequency.exponentialRampToValueAtTime(4200, t0 + .045); o.frequency.setValueAtTime(4100, t0 + .045); o.frequency.linearRampToValueAtTime(4000, t0 + .07);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.35, t0 + .006); g.gain.setValueAtTime(.35, t0 + .05); g.gain.linearRampToValueAtTime(0, t0 + .075);
    o.connect(g); g.connect(out); g.connect(an); o.start(t0); o.stop(t0 + .09); }
  const bins = new Uint8Array(an.frequencyBinCount);
  function spectrum() { an.getByteFrequencyData(bins); return bins; }
  return { AC, openMic, tune, batCall, spectrum, get nyq() { return AC.sampleRate / 2; }, get micOn() { return !!mic; } };
}
