/* lens-hear.js ── Qualia/hear のコウモリの声のレンズ（hear と同じ：時間を 10 倍にのばし、高さを 10 分の 1 にした模式）
   アブラコウモリの声（FM の下りの呼び声）を、端末の中で合成して鳴らす。マイクは使わない。値＝qfunc/senses.json の bat（pitch_down factor 10）。 */
(function () {
  QLens.define({ id: 'hear-bat', make: function () {
    var ac, out, tm = 0, on = false;
    function call(t) {
      var o = ac.createOscillator(), gn = ac.createGain(), pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
      o.type = 'sine'; o.frequency.setValueAtTime(8000, t); o.frequency.exponentialRampToValueAtTime(4500, t + .05);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.05, t + .006); gn.gain.exponentialRampToValueAtTime(.0005, t + .06);
      o.connect(gn); if (pan) { pan.pan.value = Math.sin(t * .7) * .6; gn.connect(pan); pan.connect(out); } else gn.connect(out);
      o.start(t); o.stop(t + .07);
    }
    function loop() {
      if (!on) return; var t = ac.currentTime + .05, n = 3 + Math.floor(Math.random() * 4);
      for (var i = 0; i < n; i++) call(t + i * (.9 + Math.random() * .3));   // 1 回が数ミリ秒・間は約 0.1 秒 → 10 倍
      tm = setTimeout(loop, (n * 1.0 + 2 + Math.random() * 3) * 1000);
    }
    return {
      apply: function (c) {
        var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
        ac = new A(); out = ac.createGain(); out.gain.value = 1; out.connect(ac.destination); ac.resume && ac.resume();
        on = true; loop();
        c.say && c.say('コウモリの声：時間 10 倍・高さ 1/10 の模式');
      },
      dispose: function () { on = false; clearTimeout(tm); if (ac) { try { ac.close(); } catch (e) { } } }
    };
  } });
})();
