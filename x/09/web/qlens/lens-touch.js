/* lens-touch.js ── Qualia/touch の手ざわりのレンズ：景色に触れると、短い振動と音が返る（iPhone は音と光の輪）。作品の中で組み立てた模式。 */
(function () {
  QLens.define({ id: 'touch-ground', make: function () {
    var cv, ac, fn, ring;
    function tap(e) {
      try { navigator.vibrate && navigator.vibrate([14, 30, 10]); } catch (x) { }
      if (ac) {
        var n = ac.sampleRate * .08, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
        var s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
        f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 600; f.Q.value = 1.2; gn.gain.value = .25;
        s.buffer = b; s.connect(f); f.connect(gn); gn.connect(ac.destination); s.start();
      }
      ring.style.left = (e.clientX - 22) + 'px'; ring.style.top = (e.clientY - 22) + 'px';
      ring.style.transition = 'none'; ring.style.opacity = .9; ring.style.transform = 'scale(.4)';
      requestAnimationFrame(function () { ring.style.transition = 'opacity .6s, transform .6s'; ring.style.opacity = 0; ring.style.transform = 'scale(1.4)'; });
    }
    return {
      apply: function (c) {
        cv = c.canvas || (c.renderer && c.renderer.domElement); if (!cv) return;
        var A = window.AudioContext || window.webkitAudioContext; if (A) { ac = new A(); ac.resume && ac.resume(); }
        ring = document.createElement('div'); ring.style.cssText = 'position:fixed;width:44px;height:44px;border-radius:50%;border:1.5px solid rgba(214,192,155,.9);box-shadow:0 0 0 1px rgba(0,0,0,.35);pointer-events:none;opacity:0;z-index:40';
        document.body.appendChild(ring); fn = tap; cv.addEventListener('pointerdown', fn);
        c.say && c.say('景色に触れると、手ざわりが返る（模式）');
      },
      dispose: function () { if (cv && fn) cv.removeEventListener('pointerdown', fn); if (ring) ring.remove(); if (ac) { try { ac.close(); } catch (e) { } } }
    };
  } });
})();
