/* 音と触覚の Qualium　© mitsulab. All rights reserved.
   画面を見なくても使える。音は押したときだけ鳴る。止めるはいつも一番上。 */
(() => {
const $ = id => document.getElementById(id);
const D = window.DATA, V = window.VOICE, L = D.layers;
const st = { mode: null, i: -1, ear: 1, ctx: null, nodes: [], timers: [], run: 0, vib: 'vibrate' in navigator };
const buf = {};

function live(t) { $('live').textContent = ''; setTimeout(() => { $('live').textContent = t; }, 60); }
function caption(t) { $('cap').textContent = t; }

function ctx() {
  if (!st.ctx) {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    st.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (st.ctx.state === 'suspended') st.ctx.resume();
  return st.ctx;
}
async function load(path) {
  if (!buf[path]) buf[path] = fetch(path).then(r => r.arrayBuffer()).then(a => new Promise((ok, ng) => ctx().decodeAudioData(a, ok, ng)));
  return buf[path];
}
// 置き場所（左右・遠さ）。歩くモードは片耳だけ
function out(pan = 0, dist = 0) {
  const c = ctx(), g = c.createGain(), f = c.createBiquadFilter(), p = c.createStereoPanner();
  f.type = 'lowpass'; f.frequency.value = 18000 - dist * 13000;
  g.gain.value = 1 - dist * 0.55;
  p.pan.value = st.mode === 'walk' ? st.ear : pan;
  g.connect(f); f.connect(p); p.connect(c.destination);
  st.nodes.push(g, f, p);
  return g;
}
function track(n) { st.nodes.push(n); return n; }
function wait(ms, run) { return new Promise(ok => st.timers.push(setTimeout(() => ok(run === st.run), ms))); }

async function playFile(path, pan, dist, maxSec) {
  const run = st.run, b = await load(path);
  if (run !== st.run) return false;
  const s = track(ctx().createBufferSource()); s.buffer = b; s.connect(out(pan, dist));
  const dur = Math.min(b.duration, maxSec || 99); s.start(0, 0, dur);
  return wait(dur * 1000 + 120, run);
}
async function say(text) {
  caption(text);
  if (!$('optVoice').checked) { live((st.pre || '') + text); st.pre = ''; return wait(Math.min(9000, 1200 + text.length * 110), st.run); }
  return playFile(V[text], 0, 0);
}

// 震え。使えない端末（iOS ほか）では低いトントンで代える
function vibrate(pat) {
  if (st.vib && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) { try { if (navigator.vibrate(pat)) return; } catch (e) {} st.vib = false; }
  const c = ctx(); let t = c.currentTime + 0.02;
  pat.forEach((ms, k) => {
    if (k % 2 === 0) {
      const o = track(c.createOscillator()), g = track(c.createGain());
      o.type = 'triangle'; o.frequency.value = 170; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.008);
      g.gain.setValueAtTime(0.5, t + Math.max(0.02, ms / 1000 - 0.01)); g.gain.linearRampToValueAtTime(0, t + ms / 1000);
      o.connect(g); g.connect(out(0, 0)); o.start(t); o.stop(t + ms / 1000 + 0.02);
    }
    t += ms / 1000;
  });
}

// 計算でつくる音（模式）
function synth(kind, pan, dist, sec) {
  const c = ctx(), t0 = c.currentTime + 0.05, dst = out(pan || 0, dist || 0);
  const tone = (f, a, b, typ = 'sine', vol = .3) => {
    const o = track(c.createOscillator()), g = track(c.createGain()); o.type = typ; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0 + a); g.gain.linearRampToValueAtTime(vol, t0 + a + .02); g.gain.exponentialRampToValueAtTime(.0005, t0 + b);
    o.connect(g); g.connect(dst); o.start(t0 + a); o.stop(t0 + b + .05); return o;
  };
  if (kind === 'height') { [196, 262, 330, 392, 523, 659].forEach((f, k) => tone(f, k * .32, k * .32 + .5, 'triangle', .25)); return 2.4; }
  if (kind === 'bell2') { [[294, .26], [588, .1], [882, .05]].forEach(([f, v], k) => { tone(f, 0, 2.6, 'sine', v); tone(f * 1.003, .9, 3.4, 'sine', v * .7); }); return 3.4; }
  if (kind === 'bell') { [[220, .3], [440, .12], [661, .07], [1180, .03]].forEach(([f, v]) => tone(f, 0, 3.2, 'sine', v)); return 3.2; }
  if (kind === 'water') {
    const n = c.sampleRate * sec, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let k = 0; k < n; k++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[k] = last * 3.5; }
    const s = track(c.createBufferSource()), f = track(c.createBiquadFilter()), g = track(c.createGain()), lfo = track(c.createOscillator()), lg = track(c.createGain());
    s.buffer = b; f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = .8; lfo.frequency.value = .35; lg.gain.value = 300;
    lfo.connect(lg); lg.connect(f.frequency); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.9, t0 + .5); g.gain.linearRampToValueAtTime(0, t0 + sec);
    s.connect(f); f.connect(g); g.connect(dst); s.start(t0); lfo.start(t0); lfo.stop(t0 + sec); return sec;
  }
  if (kind === 'bat') { // 探す声 → 近づくと間が詰まる。ゆっくり・低くした模式。はね返りは小さく遅らせて
    let t = 0, gap = .38;
    while (t < Math.min(sec, 3.4)) {
      const o = track(c.createOscillator()), g = track(c.createGain()), dl = track(c.createDelay()), eg = track(c.createGain());
      o.frequency.setValueAtTime(3200, t0 + t); o.frequency.exponentialRampToValueAtTime(1100, t0 + t + .06);
      g.gain.setValueAtTime(0, t0 + t); g.gain.linearRampToValueAtTime(.22, t0 + t + .005); g.gain.exponentialRampToValueAtTime(.0005, t0 + t + .07);
      dl.delayTime.value = Math.max(.012, gap * .25); eg.gain.value = .25; o.connect(g); g.connect(dst); g.connect(dl); dl.connect(eg); eg.connect(dst);
      o.start(t0 + t); o.stop(t0 + t + .09); t += gap; gap = Math.max(.07, gap * .82);
    }
    return 3.6;
  }
  if (kind === 'bee') { // 体をふるわせる走り（模式）：うなりの塊をくり返す
    const pat = [.3, .12, .3, .12, .3, .12, .3, .6, .3, .12, .3]; let t = 0;
    pat.forEach((d, k) => { if (k % 2 === 0) { tone(240, t, t + d, 'sawtooth', .07); tone(120, t, t + d, 'sine', .15); } t += d; });
    return t + .2;
  }
  return 0;
}

async function playLayer(i) {
  stop(true);
  const run = ++st.run, l = L[i]; st.i = i;
  $('where').textContent = `${l.place}／${l.name}（${i + 1}／${L.length}）`;
  const lab = `${i + 1}／${L.length}、${l.place}、${l.name}`; st.pre = lab + '。';
  $('pad').setAttribute('aria-label', `いま ${lab}。押すと次へ`);
  if ($('optVoice').checked) st.timers.push(setTimeout(() => live(`${i + 1}／${L.length}`), 1500));
  if (!(await say(l.say))) return;
  if (!(await wait(250, run))) return;
  const walk = st.mode === 'walk', max = walk ? 3 : 7, s = l.snd;
  vibrate(l.vib);
  const ps = [];
  if (s.synth) { const d = synth(s.synth, s.pan, s.dist, max); ps.push(wait(d * 1000, run)); }
  if (s.file) ps.push(playFile(`snd/${s.file}.m4a`, s.pan, s.dist, max).then(ok => ok && s.then && !walk ? playFile(`snd/${s.then}.m4a`, -(s.pan || 0), s.dist, 3) : ok));
  await Promise.all(ps);
  if (run === st.run && !$('optVoice').checked) live('次へ、または、もう一度');
  if (run === st.run && i === L.length - 1) $('pad').setAttribute('aria-label', 'おわり。押すと、しめくくり');
  if (L[i + 1]) load(V[L[i + 1].say]);
}
async function intro() {
  stop(true); const run = ++st.run;
  const seq = st.heard ? [] : [D.sys.hello, D.sys.intro]; st.heard = true;
  seq.push( st.mode === 'walk' ? D.sys.walk : D.sys.home);
  if (!st.vib) seq.push(D.sys.novib);
  seq.push(D.sys.help);
  for (const t of seq) { if (run !== st.run || !(await say(t))) return; }
}
function next() { if (st.i >= L.length) { st.i = -1; } if (st.i + 1 < L.length) playLayer(st.i + 1); else { stop(true); st.i = L.length; $('pad').setAttribute('aria-label', 'しめくくり。押すと、はじめの層から'); const run = ++st.run; say(D.sys.end); } }
function again() { if (st.i >= 0 && st.i < L.length) playLayer(st.i); else intro(); }
function prev() { playLayer(Math.max(0, st.i - 1)); }

function stop(quiet) {
  st.run++;
  st.timers.forEach(clearTimeout); st.timers = [];
  st.nodes.forEach(n => { try { n.stop && n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); st.nodes = [];
  try { if (st.vib) navigator.vibrate(0); } catch (e) {}
  if (!quiet) { caption(D.sys.stop); live('止めました'); }
}

function begin(mode) {
  st.mode = mode; st.i = -1; ctx();
  st.ear = +document.querySelector('input[name=ear]:checked').value;
  $('start').hidden = true; $('play').hidden = false; $('stop').hidden = false;
  if ($('optShake').checked) shakeOn();
  $('pad').focus();
  intro();
}
$('goHome').onclick = () => begin('home');
$('goWalk').onclick = () => begin('walk');
$('stop').onclick = () => stop(); $('stop2').onclick = () => stop();
$('next').onclick = next; $('again').onclick = again; $('prev').onclick = prev;
$('back').onclick = () => { stop(true); $('play').hidden = true; $('stop').hidden = true; $('start').hidden = false; $('goHome').focus(); };

// 大きな面：ひと押し＝次へ、長押し＝もう一度。画面読み上げのダブルタップ（click のみ）は「次へ」
let downAt = 0, longDone = false, lt = null;
$('pad').addEventListener('pointerdown', () => { downAt = Date.now(); longDone = false; $('pad').classList.add('on'); lt = setTimeout(() => { longDone = true; again(); }, 900); });
const up = () => { clearTimeout(lt); $('pad').classList.remove('on'); };
$('pad').addEventListener('pointerup', up); $('pad').addEventListener('pointercancel', up); $('pad').addEventListener('pointerleave', up);
$('pad').addEventListener('contextmenu', e => e.preventDefault());
$('pad').addEventListener('click', () => { if (longDone) { longDone = false; return; } next(); });

document.addEventListener('keydown', e => {
  if ($('play').hidden) return;
  if (e.key === 'Escape') { stop(); e.preventDefault(); }
});

// 振って止める（任意。iOS は許可を聞く）
function shakeOn() {
  const go = () => window.addEventListener('devicemotion', ev => {
    const a = ev.accelerationIncludingGravity; if (!a) return;
    const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    if (m > 28 && Date.now() - (shakeOn.t || 0) > 1500) { shakeOn.t = Date.now(); stop(); }
  });
  if (window.DeviceMotionEvent && DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission().then(r => r === 'granted' && go()).catch(() => {});
  else go();
}
})();
