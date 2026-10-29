/* © mitsulab. 音のセッション ── 自然とのセッション・自然のリズム（kit/session.js・v1・2026-10-29 本人「Qualium に音を実装してください」）
   大宮・川越・渋谷はこのファイルを写して使う（場所ごとに直さない）。音はすべて WebAudio のその場の合成（録音・外の素材なし）。
   型：
   ・重ねる：層をパートとして重ねる。土＝低音（見下ろすと強まる）・水＝うねり（水の話の印の近く）・木＝和音（木の話の印の近く）・鳥＝旋律（鳥の名が出る印の近く）・暮らし＝拍（文化の印の近く）。
     近づくとそのパートが加わり、離れると抜ける。
   ・合わせる：拍は歩く人の一歩（アプリの足音と同じ時刻）。止まると和音・旋律・拍は鳴らず、低音とうねりだけが小さく残る。
     一歩の間隔（約 0.56 秒＝毎分約 107 歩）は、成人のふつうの歩行の目安「毎分 100 歩以上」（Tudor-Locke ほか 2018, Br J Sports Med, PMID 29858465）の範囲。
   ・応える（鳴き交わし）は、出典で間を確かめてから足す（v1 には入れない）。
   決まり：確かめられない周期（風の息・瀬音のうねりの周期など）は使わない＝うねりは周期をもたない、ゆらぎだけの音にする。擬人化しない。語りのあいだは全体を下げる。
   触覚（v2・10-29 本人「音体験、触覚体験を主軸に」）：opt.haptic(pattern, kind) を、一歩・水のうねり・鳥の旋律に合わせて呼ぶ（振動の刻みはアプリが端末に渡す。振動がない端末では画の小さな動きで代える）。
   使い方：const SS = makeSession({ ctx: () => AudioContext, out: () => GainNode, on: () => bool, duck: () => 0..1, haptic: (ms[], kind) => {} });
           毎こま SS.update(dt, { soil, water, tree, bird, life })（それぞれ 0〜1）／一歩ごとに SS.step() */
const PENTA = [0, 2, 4, 7, 9];   // 和音と旋律の音の並び（五音）。音色・高さは作品として作る
export function makeSession(o) {
  const S = { ac: null, bus: null, parts: null, n: 0, w: { soil: 0, water: 0, tree: 0, bird: 0, life: 0 }, moving: 0, lastStep: 0 };
  let NB = null;
  const noiseBuf = ac => { if (!NB || NB.sampleRate !== ac.sampleRate) { NB = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = NB.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { b = b * .985 + (Math.random() * 2 - 1) * .15; d[i] = b; } } return NB; };
  function build(ac) {
    S.ac = ac; S.bus = ac.createGain(); S.bus.gain.value = 0; S.bus.connect(o.out());
    // 土＝低音：低いサインと五度上を、ごく小さく
    const soilG = ac.createGain(); soilG.gain.value = 0; soilG.connect(S.bus);
    for (const [f, a] of [[55, .5], [82.4, .22]]) { const os = ac.createOscillator(), g = ac.createGain(); os.type = "sine"; os.frequency.value = f; g.gain.value = a; os.connect(g).connect(soilG); os.start(); }
    // 水＝うねり：ゆるい雑音を低めに通す（周期をもたせない）
    const waterG = ac.createGain(); waterG.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = .4;
    const ns = ac.createBufferSource(); ns.buffer = noiseBuf(ac); ns.loop = true; ns.connect(lp).connect(waterG).connect(S.bus); ns.start();
    S.parts = { soilG, waterG, lp };
  }
  function tone(t, f, a, dur, type = "triangle", dest = S.bus) {
    const ac = S.ac, os = ac.createOscillator(), g = ac.createGain(); os.type = type; os.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .02); g.gain.exponentialRampToValueAtTime(.0004, t + dur);
    os.connect(g).connect(dest); os.start(t); os.stop(t + dur + .05);
  }
  const note = (root, k) => root * Math.pow(2, (PENTA[k % 5] + 12 * Math.floor(k / 5)) / 12);
  return {
    get weights() { return S.w; },
    update(dt, w = {}) {
      const ac = o.ctx(); if (!ac || ac.state !== "running") return; if (!S.ac) build(ac);
      const on = o.on(), duck = o.duck ? o.duck() : 1, t = ac.currentTime, k = Math.min(1, dt * 1.2);
      for (const key of Object.keys(S.w)) S.w[key] += ((w[key] || 0) - S.w[key]) * k;
      S.moving = Math.max(0, S.moving - dt * .5);   // 一歩がしばらく来ないと「止まった」
      S.bus.gain.setTargetAtTime(on ? .55 * duck : 0, t, .4);
      S.parts.soilG.gain.setTargetAtTime(.10 * S.w.soil, t, .8);
      S.parts.waterG.gain.setTargetAtTime(.16 * S.w.water * (.35 + .65 * Math.min(1, S.moving * 2)), t, .8);
      S.parts.lp.frequency.setTargetAtTime(420 + 520 * S.w.water, t, 1);
    },
    step(surface) {   // 歩く人の一歩（アプリの足音と同じ時刻）
      const ac = S.ac; if (!ac || ac.state !== "running" || !o.on()) return; S.n++; S.moving = 1;
      const H = o.haptic; if (H) { const FOOT = { stone: [9], tile: [7], soil: [14], wood: [11], asphalt: [6], gravel: [4, 18, 4] };   // 足もとの面ごとの一歩の刻み（硬い面は短く、土は長く）
        if (S.w.water > .3 && S.n % 4 === 1) H([18, 70, 26, 90, 14], "water"); else H(FOOT[surface] || FOOT.asphalt, "step"); }
      const t = ac.currentTime + .01, d = o.duck ? o.duck() : 1, w = S.w;
      if (w.life > .1) tone(t, 98, .05 * w.life * d, .18, "sine");                                    // 暮らし＝拍：一歩ごとに小さく
      if (w.tree > .1 && S.n % 4 === 0) { const r = 196, b = (S.n / 4) % 5 | 0; for (const k of [b, b + 2, b + 4]) tone(t, note(r, k), .035 * w.tree * d, 1.6); }   // 木＝和音：四歩に一度
      if (w.bird > .1 && S.n % 8 === 2) { const r = 784; [0, 2, 1].forEach((k, i) => tone(t + i * .14, note(r, (S.n / 8 | 0) + k), .03 * w.bird * d, .22, "sine")); o.haptic?.([6, 134, 6, 134, 6], "bird"); }   // 旋律の三つの音に合わせた短い刻み   // 鳥＝旋律：八歩に一度、短く
    },
  };
}
