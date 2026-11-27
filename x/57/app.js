/* Qualia/role ── 立場の目。同じ景色を、仕事や立場ごとの「目の向け方」で切りかえる。その人の受けとり方を言い切らず、「〜に目が向くかもしれません」まで。 */
(function () {
  var M = MCam;
  function band(px, w, h, y0, y1, out) { /* 見る帯の外を、なだらかに灰色へ沈める */ for (var y = 0; y < h; y++) { var f = y / h, d = f < y0 ? y0 - f : f > y1 ? f - y1 : 0, k = Math.min(1, d / .12); if (!k) continue; for (var x = 0; x < w; x++) { var i = (y * w + x) * 4, l = px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11, o = 1 - k * (1 - out); px[i] = px[i] * (1 - k) + l * o * k; px[i + 1] = px[i + 1] * (1 - k) + l * o * k; px[i + 2] = px[i + 2] * (1 - k) + l * o * 1.04 * k; } } }
  M.start({
    name: 'Qualia/role ── 立場の目', more: 'この目の向け方',
    about: '<p>同じ道でも、仕事や年齢などの立場によって、目が向く所はちがいます。この道具は、その「目の向け方」を一つずつ借りて、いまの景色の見る所を切りかえます。その仕事の人が何を感じているかを言い切るものではなく、見る所の手がかりです。</p><p>文は、mitsulab が書いた短い問いです。</p>',
    sources: {},
    modes: [
      { id: 'ueki', label: '植木職人', fx: function (px, w, h) { band(px, w, h, 0, .62, .6); },
        ask: '枝の切り口を、一つ探してみてください。',
        notes: [{ text: '枝の分かれ方、切った跡、幹の根もとの広がりに、目が向くかもしれません。' }, { text: '木と木の間、木と建物の間の広さにも、目が向くかもしれません。' }] },
      { id: 'tori', label: '鳥を調べる人', fx: function (px, w, h) { band(px, w, h, 0, .45, .55); },
        ask: '目を閉じて、声がどの高さから来るか、聴いてみてください。',
        notes: [{ text: '姿より先に、声のする高さと向きに、耳が向くかもしれません。' }, { text: '枝の先の細い所、幹の高い所、地面。止まる場所の高さに、目が向くかもしれません。' }] },
      { id: 'kodomo', label: '子ども', fx: function (px, w, h) { var c = px.slice(0), s = .7; for (var y = 0; y < h; y++) { var sy = Math.min(h - 1, Math.floor(h * (1 - s) + y * s)); for (var x = 0; x < w; x++) { var sx = Math.floor(w * (1 - s) / 2 + x * s), i = (y * w + x) * 4, j = (sy * w + sx) * 4; px[i] = c[j]; px[i + 1] = c[j + 1]; px[i + 2] = c[j + 2]; } } },
        ask: 'しゃがんで、目の高さを一メートルにしてみてください。',
        notes: [{ text: '目の高さが下がると、地面の模様や、低い所の生き物が近くなります。' }, { text: '大人には腰の高さの柵や柱が、目の前の壁になるかもしれません。' }] },
      { id: 'michi', label: '道をつくる人', fx: function (px, w, h) { band(px, w, h, .55, 1, .6); },
        ask: '足もとの舗装の継ぎ目は、どちらへ流れていますか。',
        notes: [{ text: '水が流れていく先、溝のふた、舗装の色が変わる境目に、目が向くかもしれません。' }] },
      { id: 'iro', label: '絵を描く人', fx: function (px) { for (var i = 0; i < px.length; i += 4) { px[i] = Math.round(px[i] / 48) * 48; px[i + 1] = Math.round(px[i + 1] / 48) * 48; px[i + 2] = Math.round(px[i + 2] / 48) * 48; } },
        ask: 'いちばん明るい所と、いちばん暗い所を、一つずつ見つけてください。',
        notes: [{ text: '物の名より先に、明るさの順や、色の固まりに目が向くかもしれません。' }] }
    ]
  });
})();
