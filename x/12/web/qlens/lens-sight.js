/* lens-sight.js ── Qualia/sight の色のレンズ（qfunc の uv の変換と同じ式を、3D の画面に色の行列で掛ける）
   値の出どころ＝qfunc/senses.json（honeybee・papilio の transform.mode = uv）。人の目への置きかえの模式。 */
(function () {
  var UV = '0 .55 0 0 0  0 .2 .8 0 0  .35 .35 .6 0 0  0 0 0 1 0';
  function mix(k) { var a = UV.split(/\s+/).map(Number), I = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0]; return a.map(function (v, i) { return (I[i] + (v - I[i]) * k).toFixed(3); }).join(' '); }
  function make(id, k, line) {
    QLens.define({ id: id, make: function () {
      var svg, cv, prev;
      return {
        apply: function (c) {
          cv = c.canvas || (c.renderer && c.renderer.domElement); if (!cv) return;
          svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
          svg.innerHTML = '<filter id="ql-' + id + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' + mix(k) + '"/></filter>';
          document.body.appendChild(svg);
          prev = cv.style.filter; cv.style.transition = 'filter .6s'; cv.style.filter = 'url(#ql-' + id + ')';
          c.say && c.say(line);
        },
        dispose: function () { if (cv) cv.style.filter = prev || ''; if (svg) svg.remove(); }
      };
    } });
  }
  make('sight-bee', 1, 'ミツバチの色の幅を、人の目の色に置きかえた模式（赤は暗く）');
  make('sight-papilio', .6, 'アゲハの色の幅を、人の目の色に置きかえた模式');
})();
