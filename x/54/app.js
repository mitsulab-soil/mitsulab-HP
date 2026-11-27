/* Qualia/civil ── 工学の目。土木・造園の技術者が道を見るときの「軸」（線・傾き・水の下る向き）で、いまの景色を読み直す。診断はしない。 */
(function () {
  var M = MCam, elev = null, busy = false, exa = false;
  function font(c, px) { c.font = px + 'px ' + getComputedStyle(document.body).fontFamily; }
  function label(c, s, x, y) { c.shadowColor = '#000'; c.shadowBlur = 8; c.fillStyle = '#eef5f2'; c.fillText(s, x, y); c.shadowBlur = 0; }
  /* 傾き：スマホを地面に平らに置いたときの傾き（％）。センサーの目安 */
  function level(c, W, H, S) {
    var cx = W / 2, cy = H * .42, R = Math.min(W, H) * .22; c.textAlign = 'center';
    /* 2% の傾き：画面の幅で、実際の比のまま（左右で幅の 2% だけ高さがちがう） */
    var y2 = H * .2, x0 = 24, x1 = W - 24; c.strokeStyle = 'rgba(236,246,244,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y2); c.lineTo(x1, y2); c.stroke(); c.strokeStyle = 'rgba(155,220,240,.95)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y2); c.lineTo(x1, y2 + (x1 - x0) * .02); c.stroke(); font(c, 12); label(c, '水平と、2% の傾き（歩道の標準・実際の比）', cx, y2 - 10);
    c.strokeStyle = 'rgba(236,246,244,.55)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, R * .1, 0, 7); c.stroke();
    if (S.beta == null) { /* センサーがないとき：泡がゆっくり 2% の位置へ寄る見本を見せる */ var ph = (performance.now() / 3200) % 2, q = ph < 1 ? ph : 2 - ph, ex = .2 * (q * q * (3 - 2 * q)); c.fillStyle = 'rgba(155,220,240,.55)'; c.beginPath(); c.arc(cx - ex * R * .9, cy, R * .09, 0, 7); c.fill(); font(c, 13); label(c, 'スマホを地面に平らに置くと、', cx, cy + R + 30); label(c, 'ここに傾きの数字が出ます', cx, cy + R + 50); return; }
    var bx = Math.max(-1, Math.min(1, S.gamma / 10)), by = Math.max(-1, Math.min(1, S.beta / 10));
    c.fillStyle = 'rgba(155,220,240,.85)'; c.beginPath(); c.arc(cx - bx * R * .9, cy - by * R * .9, R * .09, 0, 7); c.fill();
    var deg = Math.sqrt(S.beta * S.beta + S.gamma * S.gamma), pct = Math.tan(Math.min(deg, 60) * Math.PI / 180) * 100;
    font(c, 28); label(c, (deg < 12 ? pct.toFixed(1) : '—') + ' %', cx, cy + R + 38); font(c, 12);
    label(c, deg < 12 ? 'スマホを地面に平らに置いたときの傾き（目安）' : 'スマホを地面に平らに置いてください', cx, cy + R + 60);
  }
  function water(c, W, H, S, t) {
    c.textAlign = 'center'; font(c, 13);
    if (!elev) { label(c, busy ? '地理院の標高を読んでいます…' : '位置を許可すると、まわりの土地の高さを読みます', W / 2, H * .3); return; }
    var ang = elev.down; if (S.heading != null) ang = elev.down - S.heading; /* 画面の上＝向いている方 */
    /* 矢印は足もとの地面に寝かせて描く（奥行きで縦を縮める） */
    var a = (ang - 90) * Math.PI / 180, cx = W / 2, cy = H * (W < 768 ? .68 : .74), L = Math.min(W, H) * .2, ph = (t / 1600) % 1, sq = .42;
    c.strokeStyle = 'rgba(155,220,240,.9)'; c.lineWidth = 2;
    for (var i = 0; i < 4; i++) { var f = ((i / 4 + ph) % 1), x = cx + Math.cos(a) * L * (f * 2 - 1), y = cy + Math.sin(a) * sq * L * (f * 2 - 1); c.globalAlpha = Math.sin(f * Math.PI); c.beginPath(); c.moveTo(x - Math.cos(a - .5) * 12, y - Math.sin(a - .5) * 12 * sq); c.lineTo(x, y); c.lineTo(x - Math.cos(a + .5) * 12, y - Math.sin(a + .5) * 12 * sq); c.stroke(); }
    c.globalAlpha = 1; font(c, 13);
    var ty = cy - L * sq - 70;
    if (exa) { font(c, 11); label(c, '位置が分からないので、例の場所（さいたま市・氷川参道）の高さです', cx, ty - 20); font(c, 13); }
    label(c, 'ここ ' + elev.h.toFixed(1) + ' m', cx, ty); label(c, elev.drop < .2 ? 'まわり 40 m は、ほぼ平ら（差 0.2 m 未満）' : '40 m 先で、いちばん低い向きへ ' + elev.drop.toFixed(1) + ' m 下がる', cx, ty + 20);
    if (S.heading == null) { font(c, 11); label(c, '足もとの矢印の奥が北（向きのセンサーがあると、向いている方が奥）', cx, ty + 40); }
  }
  function readElev(p) {
    busy = true; var d = 40, dl = d / 111320, dn = d / (111320 * Math.cos(p.lat * Math.PI / 180)), pts = [[0, 0], [dl, 0], [0, dn], [-dl, 0], [0, -dn]];
    Promise.all(pts.map(function (q) { return fetch('https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=' + (p.lon + q[1]).toFixed(6) + '&lat=' + (p.lat + q[0]).toFixed(6) + '&outtype=JSON').then(function (r) { return r.json(); }).then(function (j) { return +j.elevation; }); }))
      .then(function (e) { busy = false; if (e.some(isNaN)) return; var gN = (e[1] - e[3]) / (2 * d), gE = (e[2] - e[4]) / (2 * d), down = (Math.atan2(-gE, -gN) * 180 / Math.PI + 360) % 360, drop = e[0] - Math.min(e[1], e[2], e[3], e[4]); elev = { h: e[0], down: down, drop: drop }; M.say(); })
      .catch(function () { busy = false; });
  }
  M.start({
    name: 'Qualia/civil ── 工学の目', more: '数字と出典',
    about: '<p>道や庭をつくる技術者は、景色を「線」「傾き」「水の下る向き」で読みます。この道具は、その見方の軸を借りて、いまの景色を読み直します。</p><p>右下の「カメラ」でいまの景色を写します。「水の下る向き」を選ぶと、位置をたずねて土地の高さを読みます（位置は地理院への問い合わせにだけ使い、保存しません）。傾きは、スマホのセンサーの目安です。土地の高さは、国土地理院の標高（5〜10 m の格子）から 40 m 先の四方を比べたものです。</p>',
    sources: {
      kozo: { title: '道路構造令 第24条（横断勾配）e-Gov 法令検索', url: 'https://laws.e-gov.go.jp/law/345CO0000000320' },
      dem: { title: '国土地理院「標高API」', url: 'https://maps.gsi.go.jp/development/elevation_s.html' }
    },
    modes: [
      { id: 'line', label: '線で読む', fx: function (px, w, h) { M.edges(px, w, h); },
        ask: '縁石、舗装の継ぎ目、溝のふた。線は、どちらへ傾いて続いていますか。',
        notes: [{ text: '舗装した車道には、雨水を端へ流すため、1.5〜2% の横の傾きを付けることが標準とされています。', src: 'kozo' }, { text: '歩道には、2% の横の傾きを標準として付けるとされています。1 m で 2 cm です。', src: 'kozo' }] },
      { id: 'level', label: '傾きをはかる', fx: function (px) { M.tone(px, [.5, .55, .6], [6, 10, 14]); }, over: function (c, W, H, S) { level(c, W, H, S); },
        ask: 'スマホを、道や庭の地面に平らに置いてみてください。次の雨の日、水はどちらへ流れるでしょう。',
        notes: [{ text: '歩道の横の傾きの標準は 2%。置いた所の数字と比べてみてください。', src: 'kozo' }] },
      { id: 'water', label: '水の下る向き', fx: function (px) { M.tone(px, [.55, .65, .75], [4, 10, 18]); }, over: function (c, W, H, S, t) { water(c, W, H, S, t); },
        enter: function () { if (!elev && !busy) M.locate().then(function (p) { exa = !p; readElev(p || { lat: 35.9111, lon: 139.6308 }); }); },
        ask: function () { return elev ? '雨が降ったら、水は矢印の向きへ。その先に、溝や低い所はありますか。' : '雨が降ったら、ここの水はどちらへ流れていくでしょう。'; },
        notes: [{ text: '土地の高さは、国土地理院の標高（多くはレーザーで測った 5 m の格子）から読んでいます。', src: 'dem' }] }
    ]
  });
})();
