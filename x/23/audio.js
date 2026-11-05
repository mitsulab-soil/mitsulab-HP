// 音：外の場と内の認知が互いを描き合う循環を、声部として 3D に結ぶ（Web Audio のみ・素材なし）
// 対応表＝資料/音の対応表.md。リズムと間は出典で確かめた周期か、そのまま「設定の値」「時間を縮めた模式」と明記したもの。
// 音色だけを作品として作る。最初は鳴らさず、触れてから鳴る。
let ctx = null, master, net, netFb, netGain, voices = [], started = false;
// 主体ごとの声部の設計（period＝拍の周期 秒。note＝根拠の種類）
export const VOICE = {
  bird:   { deg: 9, wave: 'sine',     period: 2.4,  len: .16, rep: 3, note: '短い句を 3 回くり返す形はシジュウカラのさえずりに倣う。2.4 秒の間は作品の設定の値' },
  bee:    { hz: 230, wave: 'sawtooth', period: 0,    note: 'ミツバチの羽音の基音は約 200〜250 Hz（倍音の多い羽音に近づけるため鋸歯の波を低域だけ通す）' },
  worm:   { deg: 2, wave: 'triangle', period: 3.0,  len: .9,  rep: 1, note: '土の中のゆっくりした伸び縮み（間は模式）' },
  tree:   { deg: 0, wave: 'sine',     period: 24,   len: 10,  rep: 1, note: '日の周期 24 時間を 24 秒に縮めた模式' },
  fungi:  { deg: -5, wave: 'sine',    period: 0,    note: '土の中の遅い営みを、聴こえる高さに移した持続音（模式）' },
  human:  { deg: 4, wave: 'triangle', period: .55,  len: .07, rep: 1, note: '人の歩行は毎分 100〜120 歩前後（1 歩 約 0.5〜0.6 秒）' },
  aoi:    { deg: 7, wave: 'sine',     period: 4.0,  len: .5,  rep: 2, note: '碧の語り（作品の設定の値）' },
  sensor: { deg: 11, wave: 'square',  period: 1.0,  len: .03, rep: 1, note: '計の読み取り間隔 1 秒（機械の設定の値）' },
  camera: { deg: 12, wave: 'square',  period: .5,   len: .02, rep: 1, note: '画像の判定の間隔（設定の値）' },
  gis:    { deg: -12, wave: 'sine',   period: 0,    note: '動かない層の持続音' },
};
const SCALE = [0, 2, 4, 7, 9]; // 五音（音色側の作り）
const degHz = (d, key) => { const o = Math.floor(d / 5), k = ((d % 5) + 5) % 5; return 220 * Math.pow(2, (SCALE[k] + 12 * o + key) / 12); };
let key = 0, keyTarget = 0, lastRel = -1;

export function start(ids) {
  if (started) { if (ctx.state === 'suspended') ctx.resume(); return; } started = true;
  document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume(); });
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  master = ctx.createGain(); master.gain.value = .55;
  const comp = ctx.createDynamicsCompressor(); master.connect(comp).connect(ctx.destination);
  // 網＝声部どうしが響き合う共有の遅れ（相即相入の模式）
  net = ctx.createDelay(2); net.delayTime.value = .37; netFb = ctx.createGain(); netFb.gain.value = .35;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  netGain = ctx.createGain(); netGain.gain.value = .05;
  net.connect(lp).connect(netFb).connect(net); lp.connect(netGain).connect(master);
  voices = ids.map(id => {
    const v = VOICE[id], g = ctx.createGain(); g.gain.value = 0; const pan = ctx.createStereoPanner();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = v.wave === 'square' ? 3200 : 1800; f.Q.value = .7;
    g.connect(f).connect(pan).connect(master); const send = ctx.createGain(); send.gain.value = .25; f.connect(send).connect(net);
    let osc = null;
    if (!v.period) { osc = ctx.createOscillator(); osc.type = v.wave; osc.frequency.value = v.hz || degHz(v.deg, 0); if (id === 'bee') { f.frequency.value = 700; } osc.connect(g); osc.start(); }
    return { id, v, g, pan, f, osc, level: 0, next: ctx.currentTime + Math.random() * .3 };
  });
}
function blip(vo, t, hz, len, amp) {
  const o = ctx.createOscillator(), e = ctx.createGain(); o.type = vo.v.wave; o.frequency.value = hz;
  e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(amp, t + Math.min(.02, len * .3)); e.gain.exponentialRampToValueAtTime(.0005, t + len);
  o.connect(e).connect(vo.f); o.start(t); o.stop(t + len + .05);
}
// 毎こま：levels＝各声部の大きさ（触れた・近い）、pans＝定位、inner＝内側かどうか、rel＝相対化
export function update(levels, pans, inner, rel) {
  if (!ctx) return; const now = ctx.currentTime;
  keyTarget = inner ? 5 : 0; key += (keyTarget - key) * .02; // 外⇄内で調が移る（四度）
  if (Math.abs(rel - lastRel) > .01) { lastRel = rel; netGain.gain.setTargetAtTime(.05 + rel * .35, now, .3); netFb.gain.setTargetAtTime(.3 + rel * .25, now, .5); }
  voices.forEach((vo, i) => {
    const L = levels[i]; if (L === 0 && vo.lastL === 0) return; const pv = Math.max(-1, Math.min(1, pans[i])); if (Math.abs(pv - (vo.lastP ?? 9)) > .01) { vo.pan.pan.setTargetAtTime(pv, now, .05); vo.lastP = pv; } const ch = Math.abs(L - (vo.lastL ?? 9)) > .01; vo.lastL = L;
    if (vo.osc) { if (!ch && Math.abs(key - keyTarget) < .01) return; vo.g.gain.setTargetAtTime(L * (vo.id === 'bee' ? .012 : .07), now, .2); if (vo.v.deg !== undefined) vo.osc.frequency.setTargetAtTime(degHz(vo.v.deg, key), now, .3); return; }
    if (ch) vo.g.gain.setTargetAtTime(L > .01 ? 1 : 0, now, .1);
    if (L > .01 && now + .08 > vo.next) {
      const t = Math.max(now + .01, vo.next);
      for (let r = 0; r < vo.v.rep; r++) blip(vo, t + r * vo.v.len * 1.4, degHz(vo.v.deg + (r % 2 ? 1 : 0), keyTarget), vo.v.len, (vo.v.wave === 'square' ? .07 : .16) * L);
      vo.next = t + vo.v.period;
    } else if (L <= .01) vo.next = now;
  });
}
// 一つの露から多くへ：距離の順に遅れて鳴る（一即多の模式）
export function ripple(delays) {
  if (!ctx) return; const now = ctx.currentTime, vo = voices[0] && { v: { wave: 'sine' }, f: master };
  delays.slice(0, 24).forEach((d, k) => { const vo = voices[k % voices.length]; const w = vo.v.wave === 'sawtooth' ? 'triangle' : vo.v.wave; blip({ v: { wave: w }, f: net }, now + d, degHz((vo.v.deg ?? 4) + 7, keyTarget), .35, w === 'square' ? .02 : .05); });   // 一即多：波紋の音は、それぞれの主体の声部の音色と高さで鳴る
  blip({ v: { wave: 'sine' }, f: master }, now, degHz(14, keyTarget), .5, .08);
}
export const ready = () => started;
