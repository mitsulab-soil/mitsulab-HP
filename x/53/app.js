/* Qualia/oldmap ── 地名と昔の地図。いまいる所の、昔の空中写真と地名を、景色の向きと重ねる。
   地図は国土地理院の地理院タイル（出典を明示して利用）。位置は端末の中だけで使い、送らない（地理院への地図の要求に座標が含まれるだけ）。 */
(function () {
  var M = MCam, EX = { lat: 35.9111, lon: 139.6308 }, here = null, Z = 16, off = { x: 0, y: 0 }, cache = {}, place = '', gsiBase = 'https://cyberjapandata.gsi.go.jp/xyz/';
  var LY = {
    std: { u: 'std/{z}/{x}/{y}.png', z: 18 }, photo: { u: 'seamlessphoto/{z}/{x}/{y}.jpg', z: 18 },
    y1974: { u: 'gazo1/{z}/{x}/{y}.jpg', z: 17 }, y1961: { u: 'ort_old10/{z}/{x}/{y}.png', z: 17 }, y1945: { u: 'ort_USA10/{z}/{x}/{y}.png', z: 17 }, relief: { u: 'relief/{z}/{x}/{y}.png', z: 15 }
  };
  function proj(lat, lon, z) { var n = Math.pow(2, z), s = Math.sin(lat * Math.PI / 180); return { x: (lon + 180) / 360 * n * 256, y: (.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n * 256 }; }
  function tile(id, z, x, y) {
    var k = id + z + '/' + x + '/' + y; if (cache[k]) return cache[k];
    var im = new Image(); im.decoding = 'async'; im.src = gsiBase + LY[id].u.replace('{z}', z).replace('{x}', x).replace('{y}', y); im.onerror = function () { im.bad = 1; };
    return cache[k] = im;
  }
  function layer(ctx, W, H, id, alpha) {
    var c = here || EX, z = Math.min(Z, LY[id].z), sc = Math.pow(2, Z - z), p = proj(c.lat, c.lon, z), cx = p.x - off.x / sc, cy = p.y - off.y / sc, ts = 256 * sc;
    var x0 = Math.floor((cx - W / 2 / sc) / 256), x1 = Math.floor((cx + W / 2 / sc) / 256), y0 = Math.floor((cy - H / 2 / sc) / 256), y1 = Math.floor((cy + H / 2 / sc) / 256), any = false;
    ctx.globalAlpha = alpha;
    for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) { var im = tile(id, z, x, y); if (im.complete && im.naturalWidth && !im.bad) { ctx.drawImage(im, W / 2 + (x * 256 - cx) * sc, H / 2 + (y * 256 - cy) * sc, ts + .5, ts + .5); any = true; } }
    ctx.globalAlpha = 1; return any;
  }
  var modeT = 0, lastMode = null;
  function render(ctx, W, H, S, mode, t) {
    ctx.fillStyle = '#0d1514'; ctx.fillRect(0, 0, W, H); if (lastMode !== mode.id) { lastMode = mode.id; modeT = t; }
    if (!layer(ctx, W, H, mode.id, 1)) { layer(ctx, W, H, 'std', .35); if (mode.id !== 'std' && t - modeT > 2500) { ctx.fillStyle = 'rgba(238,245,242,.85)'; ctx.font = '13px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('この範囲には、この年代の写真がありません', W / 2, H * .3); ctx.shadowBlur = 0; } }
    ctx.fillStyle = 'rgba(8,18,20,.18)'; ctx.fillRect(0, 0, W, H);
    /* いまいる所と、向いている方（視野の扇） */
    var mx = W / 2 + off.x, my = H / 2 + off.y;
    if (S.heading != null) { var a = (S.heading - 90) * Math.PI / 180, r = Math.min(W, H) * .32; var gr = ctx.createRadialGradient(mx, my, 0, mx, my, r); gr.addColorStop(0, 'rgba(155,220,240,.42)'); gr.addColorStop(1, 'rgba(155,220,240,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(mx, my); ctx.arc(mx, my, r, a - .5, a + .5); ctx.closePath(); ctx.fill(); }
    var b = .5 + .5 * Math.sin(t / 700); ctx.strokeStyle = '#0a1a1e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(mx, my, 8 + b * 3, 0, 7); ctx.stroke(); ctx.strokeStyle = '#9bdcf0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, 8 + b * 3, 0, 7); ctx.stroke(); ctx.fillStyle = '#9bdcf0'; ctx.beginPath(); ctx.arc(mx, my, 3, 0, 7); ctx.fill();
    var cr = '国土地理院（地理院タイル）' + (mode.cr ? '・' + mode.cr : '');
    ctx.font = '10px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(238,245,242,.75)'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText(cr, 16, H - 16 - (W < 768 ? 72 : 8)); ctx.shadowBlur = 0;
  }
  /* 指でずらす（離すと、ゆっくり現在地へ戻る） */
  var drag = null, cv = document.getElementById('scene');
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX - off.x, y: e.clientY - off.y }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) { if (drag) { off.x = e.clientX - drag.x; off.y = e.clientY - drag.y; } });
  cv.addEventListener('pointerup', function () { drag = null; });
  function name(p) {
    fetch('https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=' + p.lat.toFixed(5) + '&lon=' + p.lon.toFixed(5)).then(function (r) { return r.json(); }).then(function (j) {
      var r = j && j.results; if (!r) return; place = r.lv01Nm || '';
      window.GSI = window.GSI || {}; var s = document.createElement('script'); s.src = 'https://maps.gsi.go.jp/js/muni.js';
      s.onload = function () { var m = (GSI.MUNI_ARRAY || {})[String(+r.muniCd)]; var city = m ? m.split(',')[3].replace(/　/g, '') : ''; document.querySelector('.brand small').textContent = city + place; };
      document.head.appendChild(s); document.querySelector('.brand small').textContent = place;
    }).catch(function () {});
  }
  M.start({
    name: 'Qualia/oldmap ── 地名と昔の地図', more: 'この地図のこと',
    main: { label: 'いまいる所', go: function (S) { document.querySelector('#sub').textContent = '位置をたずねています…'; M.locate().then(function (p) { if (p) { here = p; off.x = off.y = 0; name(p); M.say(); } else document.querySelector('#sub').textContent = '位置が分からないので、例の場所（さいたま市・氷川参道）のままです。'; }); } },
    render: render,
    about: '<p>いまいる所の地図を、昔の空中写真に切りかえます。地名は、地理院の住所の検索で、いまいる町の名を引きます。地図を指でずらすと見回せます。向きのセンサーがあるスマホでは、向いている方が淡い扇で出ます。位置は、地理院へ地図と町の名をたずねるときにだけ使い、保存しません。</p><p>昔の空中写真は、年代ごとに撮られた範囲が限られ、ない所は空白になります。関東の明治の地図（迅速測図）は、下の閲覧の場所で、同じ所を開けます。</p>',
    sources: {
      gsi: { title: '国土地理院「地理院タイル一覧」（出典を明示して利用）', url: 'https://maps.gsi.go.jp/development/ichiran.html' },
      rg: { title: '国土地理院「逆ジオコーダ（住所の検索）」・地方公共団体コード', url: 'https://maps.gsi.go.jp/' },
      habs: { title: '迅速測図：農研機構農業環境研究部門「歴史的農業環境閲覧システム」（CC BY 2.1 JP）', url: 'https://habs.rad.naro.go.jp/' }
    },
    modes: [
      { id: 'std', label: 'いまの地図', ask: '地図の上の道の向きと、目の前の道の向きを、合わせてみてください。',
        notes: [{ text: 'いまの地図（地理院の標準地図）。顔を上げて、地図の線のどれが、目の前のどの道かを探してみてください。', src: 'gsi' }, { text: '画面を閉じたら、道の曲がり方や坂に、昔の川や台地の縁の跡がないか見てみてください。' }] },
      { id: 'photo', label: 'いまの空', cr: '空中写真', ask: '上から見ると、木の固まりはどこにありますか。目の前の木は、その端ですか、真ん中ですか。', notes: [{ text: 'いまの空中写真（地理院の写真の重ね合わせ）。', src: 'gsi' }] },
      { id: 'y1974', label: '1974〜78', cr: '空中写真 1974〜78年', ask: '五十年ほど前、ここは田畑でしたか、家でしたか。いまの景色のどこに、その名残がありますか。', notes: [{ text: '1974〜1978 年ごろの空中写真（地理院）。', src: 'gsi' }] },
      { id: 'y1961', label: '1961〜69', cr: '空中写真 1961〜69年', ask: '昔の道の線と、いまの道の線は、重なっていますか。', notes: [{ text: '1961〜1969 年ごろの空中写真（地理院）。', src: 'gsi' }] },
      { id: 'y1945', label: '1945〜50', cr: '米軍撮影の空中写真 1945〜50年', ask: '戦後すぐの写真です。いまも残っている線は、どれですか。', notes: [{ text: '1945〜1950 年ごろに米軍が撮った空中写真（地理院が公開）。', src: 'gsi' }] },
      { id: 'relief', label: '土地の高さ', cr: '色別標高図', ask: '色の境は、坂の上と下です。いま立っているのは、高い側ですか、低い側ですか。', notes: [{ text: '色別標高図（地理院）。いまの道が、昔の台地の縁や川の跡に沿っていることがあります。', src: 'gsi' }, { text: '関東なら、明治13〜19年の迅速測図で、同じ所の明治の土地の使われ方を見られます。', src: 'habs' }] }
    ]
  });
})();
