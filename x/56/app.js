/* Qualia/koyomi ── 暦で見る。どこでも同じ太陽の位置から、いまの二十四節気・七十二候と、空の太陽の高さを出し、景色に重ねる。 */
(function () {
  var M = MCam, K72 = [], SEK = ['春分', '清明', '穀雨', '立夏', '小満', '芒種', '夏至', '小暑', '大暑', '立秋', '処暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '啓蟄'];
  fetch('kit/k72.json').then(function (r) { return r.json(); }).then(function (j) { K72 = j; M.say(); });
  function now(S) { var s = M.sun(S.now, S.pos && S.pos.lat, S.pos && S.pos.lon), l = s.lambda; return { s: s, sek: SEK[Math.floor(l / 15) % 24], ko: K72[Math.floor(((l - 315 + 360) % 360) / 5)] }; }
  function F(c, px) { c.font = px + 'px ' + getComputedStyle(document.body).fontFamily; }
  function ring(c, W, H, S, t) {
    var n = now(S), cx = W / 2, cy = H * .4, R = Math.min(W, H) * (W < 768 ? .36 : .3), l = n.s.lambda;
    c.strokeStyle = 'rgba(236,246,244,.35)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); c.textAlign = 'center';
    for (var i = 0; i < 24; i++) {
      var a = (-90 - i * 15) * Math.PI / 180, on = SEK[i] === n.sek, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); c.lineTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6)); c.stroke();
      F(c, on ? 15 : 10); c.fillStyle = on ? '#f3ece0' : 'rgba(238,245,242,.55)'; c.shadowColor = '#000'; c.shadowBlur = 6;
      var tx = cx + Math.cos(a) * (R + (W < 768 ? 16 : 22)), ty = cy + Math.sin(a) * (R + (W < 768 ? 16 : 22)) + 4; if (W >= 768 || i % 3 === 0 || on) c.fillText(SEK[i], tx, ty); c.shadowBlur = 0;
    }
    var a2 = (-90 - l) * Math.PI / 180, b = .5 + .5 * Math.sin(t / 800);
    c.fillStyle = 'rgba(243,214,150,.95)'; c.beginPath(); c.arc(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R, 6 + b * 2, 0, 7); c.fill();
    F(c, 12); c.fillStyle = 'rgba(238,245,242,.8)'; c.fillText('太陽の黄経 ' + l.toFixed(1) + '°', cx, cy + 4);
  }
  function kou(c, W, H, S) {
    var n = now(S); if (!n.ko) return; var x = W - (W < 768 ? 38 : 80), y = H * .12, fs = W < 768 ? 26 : 36, w = n.ko[1].replace(/\(.*\)/, '');
    F(c, fs); c.textAlign = 'center'; c.shadowColor = '#000'; c.shadowBlur = 12; c.fillStyle = '#f3ece0';
    for (var i = 0; i < w.length; i++) c.fillText(w[i], x, y + fs * 1.15 * (i + 1));
    F(c, 12); c.fillStyle = 'rgba(243,236,224,.85)'; var r = n.ko[2]; for (var j = 0; j < r.length; j++) c.fillText(r[j], x - fs * 1.1, y + 15 * (j + 1) + fs * .3); c.shadowBlur = 0;
  }
  function sunDir(c, W, H, S, t) {
    c.textAlign = 'center'; F(c, 13); c.shadowColor = '#000'; c.shadowBlur = 8; c.fillStyle = '#eef5f2';
    if (!S.pos) { c.fillText('位置を許可すると、ここから見た太陽の高さと向きを計算します', W / 2, H * .3); c.shadowBlur = 0; return; }
    var s = M.sun(S.now, S.pos.lat, S.pos.lon), dirs = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'], d = dirs[Math.round(s.az / 45) % 8];
    F(c, 26); c.fillText((s.alt > 0 ? '高さ ' + s.alt.toFixed(0) + '°' : '地平線の下 ' + (-s.alt).toFixed(0) + '°') + ' ・ ' + d, W / 2, H * .3);
    if (S.heading != null) { var rel = ((s.az - S.heading + 540) % 360) - 180, x = W / 2 + rel / 31 * W * .5; if (Math.abs(rel) < 31 && s.alt > -2) { var y = H * .5 - s.alt / 24 * H * .5; c.strokeStyle = 'rgba(243,214,150,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 18, 0, 7); c.stroke(); } else { F(c, 14); c.fillText(rel > 0 ? '太陽は右の方 →' : '← 太陽は左の方', W / 2, H * .3 + 28); } }
    c.shadowBlur = 0;
  }
  M.start({
    name: 'Qualia/koyomi ── 暦で見る', more: 'いまの暦',
    about: '<p>暦は、一年を区切って景色に名をつける枠です。太陽の黄経（地球から見た太陽の位置）を 15° ずつに区切ると二十四節気、5° ずつに区切ると七十二候になります。この道具は、いまの日時から太陽の位置を計算して、いまの節気と候を出します。どこにいても同じです。</p><p>七十二候の名とよみは、国立天文台の暦Wiki の表（宝暦暦以降の欄）によります。太陽の位置は簡単な式による目安で、区切りの日の前後では、暦の本とずれることがあります。</p>',
    sources: { k72: { title: '国立天文台 暦計算室「暦Wiki 七十二候」', url: 'https://eco.mtk.nao.ac.jp/koyomi/wiki/B5A8C0E12FBCB7BDBDC6F3B8F5.html' }, sek: { title: '国立天文台 暦計算室「暦Wiki 二十四節気」', url: 'https://eco.mtk.nao.ac.jp/koyomi/wiki/C6F3BDBDBBCDC0E1B5A4.html' } },
    modes: [
      { id: 'kou', label: '七十二候', fx: function (px) { M.tone(px, [.78, .76, .72], [10, 9, 6]); }, over: kou,
        ask: function (S) { var n = now(S); return n.ko ? 'いまは' + n.sek + '、「' + n.ko[1].replace(/\(.*\)/, '') + '（' + n.ko[2] + '）」のころ。目の前の景色に、その気配はありますか。' : ''; },
        notes: [{ text: '七十二候は、二十四節気をさらに三つずつに分けたもので、多くが生き物や天気の様子を表します。', src: 'k72' }, { text: '中国から伝わった七十二候を、江戸時代に渋川春海が日本の気候や生き物に合わせて改めました。', src: 'k72' }] },
      { id: 'sek', label: '二十四節気', fx: function (px) { M.tone(px, [.55, .57, .6], [6, 8, 10]); }, over: ring,
        ask: function (S) { return 'いまは「' + now(S).sek + '」。太陽は、一年の環のこのあたりにいます。'; },
        notes: [{ text: '二十四節気は、太陽の黄経を 15° ずつ区切ったもの。春分が 0°、夏至が 90°、秋分が 180°、冬至が 270° です。', src: 'sek' }] },
      { id: 'sun', label: '太陽の高さ', enter: function () { M.locate().then(function () { M.say(); }); }, fx: function (px) { M.tone(px, [.7, .68, .64], [10, 8, 4]); }, over: sunDir,
        ask: function (S) { return S.pos ? '影の長さを見てください。太陽が低いほど、影は長くのびます。' : 'いまの太陽は、どの高さにありますか。'; },
        notes: [{ text: '同じ節気でも、北にいるほど、太陽は低く上ります。計算は、いまいる所の緯度と経度を使います（端末の中だけで計算し、送りません）。', src: 'sek' }] }
    ]
  });
})();
