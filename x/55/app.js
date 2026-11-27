/* Qualia/kigo ── 季語で見る。いまの季節（太陽の黄経で決まる二十四節気の区切り）の季語を枠に、目の前の景色を切りとる。
   季語の説明はすべて mitsulab が書いた文。歳時記の本文は写していない。 */
(function () {
  var M = MCam;
  var D = {
    春: { 天文: [['春風', '春に吹くやわらかな風。'], ['朧月', 'かすんでにじむ春の月。'], ['春雨', '音もなく細く降る雨。']], 地理: [['水温む', '池や川の水が、ぬるんでくること。'], ['春泥', '雪どけや雨でぬかるむ土。'], ['残雪', '日陰に残る雪。']], 植物: [['木の芽', '冬芽がほどけて出てくる芽。'], ['菜の花', '黄色い花の群れ。'], ['桜', '咲いて散るまでの花。']], 動物: [['燕', '南から渡ってきて巣をかける鳥。'], ['蝶', '春の野を舞う蝶。'], ['蛙', '田や池で鳴きはじめる蛙。']], 生活: [['花見', '花の下に集まること。'], ['種蒔', '畑に種をまくこと。'], ['野遊び', '野に出て遊ぶこと。']] },
    夏: { 天文: [['雲の峰', '高く湧きあがる夏の雲。'], ['夕立', '夏の午後の急な雨。'], ['炎天', '照りつける夏の空。']], 地理: [['青田', '苗が育って青々とした田。'], ['滴り', '崖や苔から落ちるしずく。'], ['夏野', '草の茂る夏の野。']], 植物: [['新緑', '初夏の若い葉の緑。'], ['青葉', '茂った夏の葉。'], ['緑陰', '茂った木の下の陰。']], 動物: [['蟬', '夏の木で鳴く蟬。'], ['蛍', '夜に光って飛ぶ蛍。'], ['時鳥', '初夏に渡ってきて鳴く鳥。']], 生活: [['打水', '暑さをしずめるために水をまくこと。'], ['日傘', '日ざしをよける傘。'], ['団扇', 'あおいで風をつくる道具。']] },
    秋: { 天文: [['秋晴', '澄んで高い秋の空。'], ['鰯雲', '小さな雲が群れて並ぶ空。'], ['月', '季語では、ただ「月」といえば秋の月。']], 地理: [['花野', '秋の草花が咲く野。'], ['刈田', '稲を刈ったあとの田。'], ['秋の水', '澄んだ秋の川や池の水。']], 植物: [['紅葉', '赤く色づいた葉。'], ['芒', '風になびく穂。'], ['団栗', '木から落ちた実。']], 動物: [['蜻蛉', '秋の空を飛ぶとんぼ。'], ['虫', '季語では、秋に鳴く虫の声。'], ['雁', '北から渡ってくる鳥。']], 生活: [['夜長', '秋の長い夜。'], ['案山子', '田に立てる人形。'], ['灯火親しむ', '秋の夜、灯の下で本を読むこと。']] },
    冬: { 天文: [['木枯', '木の葉を吹き落とす冬の風。'], ['時雨', '降ってはやむ冬の初めの雨。'], ['冬晴', '晴れわたった冬の空。']], 地理: [['霜柱', '土の中から立ちあがる氷の柱。'], ['冬枯', '草木が枯れた冬の野。'], ['水涸る', '冬に川や池の水が細ること。']], 植物: [['冬木立', '葉を落とした木の並び。'], ['落葉', '散り敷いた葉。'], ['枯葉', '枝や地面に残る枯れた葉。']], 動物: [['鴨', '冬の池や川に来る鴨。'], ['白鳥', '北から渡ってくる白い鳥。'], ['鷦鷯', '冬の藪をくぐる小さな鳥（みそさざい）。']], 生活: [['日向ぼこ', '冬の日だまりに身をおくこと。'], ['焚火', '落葉や枯れ枝を燃やすこと。'], ['息白し', '寒さで吐く息が白く見えること。']] }
  };
  function season(S) { var j = new Date(S.now.getTime() + 9 * 36e5); j.setUTCHours(23, 59, 59, 0); var l = M.sun(new Date(j.getTime() - 9 * 36e5)).lambda; /* 日本時間のその日のうちに立春などに達したら、その日から */  return l >= 315 || l < 45 ? '春' : l < 135 ? '夏' : l < 225 ? '秋' : '冬'; }
  var pick = {}, FX = {
    天文: function (px, w, h) { for (var y = 0; y < h; y++) { var f = Math.min(1, Math.max(0, (y / h - .3) / .35)), k = 1.12 - .5 * f * f * (3 - 2 * f); for (var x = 0; x < w; x++) { var i = (y * w + x) * 4; px[i] *= k; px[i + 1] *= k; px[i + 2] *= k; } } },
    地理: function (px, w, h) { for (var y = 0; y < h; y++) { var f = Math.min(1, Math.max(0, (y / h - .4) / .35)), k = .58 + .5 * f * f * (3 - 2 * f); for (var x = 0; x < w; x++) { var i = (y * w + x) * 4; px[i] *= k; px[i + 1] *= k; px[i + 2] *= k; } } },
    植物: function (px) { for (var i = 0; i < px.length; i += 4) { var r = px[i], g = px[i + 1], b = px[i + 2], y = r * .3 + g * .59 + b * .11, gr = g > r * 1.02 && g > b; px[i] = gr ? r : y * .55; px[i + 1] = gr ? g * 1.08 : y * .58; px[i + 2] = gr ? b : y * .6; } },
    動物: function (px) { M.tone(px, [.72, .74, .76], [8, 10, 12]); },
    生活: function (px) { M.tone(px, [.86, .78, .66], [16, 10, 4]); }
  };
  function vert(c, W, H, word, read) {
    var x = W - (W < 768 ? 40 : 80), y = H * .14, fs = W < 768 ? 30 : 40;
    c.font = fs + 'px ' + getComputedStyle(document.body).fontFamily; c.textAlign = 'center'; c.shadowColor = '#000'; c.shadowBlur = 12; c.fillStyle = '#f3ece0';
    for (var i = 0; i < word.length; i++) c.fillText(word[i], x, y + fs * 1.15 * (i + 1));
    c.strokeStyle = 'rgba(243,236,224,.45)'; c.lineWidth = 1; c.shadowBlur = 0; c.beginPath(); c.moveTo(x - fs * .9, y); c.lineTo(x - fs * .9, y + fs * 1.15 * (word.length + .6)); c.stroke();
  }
  var cats = ['天文', '地理', '植物', '動物', '生活'], LOOK = { 天文: '空を見上げて', 地理: '足もとや水辺に', 植物: '木や草に', 動物: '声や影に', 生活: '人のしぐさに' };
  var cur = {}, order = ['春', '夏', '秋', '冬'], now0 = season({ now: new Date() });
  function list(s) { var L = []; cats.forEach(function (c) { D[s][c].forEach(function (p) { L.push({ cat: c, w: p[0], t: p[1] }); }); }); return L; }
  function show(s) { var L = list(s); return cur[s] || (cur[s] = L[Math.floor(Math.random() * L.length)]); }
  var seasons = order.slice(order.indexOf(now0)).concat(order.slice(0, order.indexOf(now0)));
  M.start({
    name: 'Qualia/kigo ── 季語で見る', tapHint: '次の季語',
    about: '<p>俳句の季語は、景色を季節の名で切りとる枠です。いまの日付から季節を決め、その季節の季語を一つずつ景色に重ねます。字幕を押すと次の季語へ。目の前に、その季語が一つでもあるかを探してください。</p><p>季語の説明は mitsulab が書いた短い文です。季節の区切り（立春・立夏・立秋・立冬）は、太陽の黄経の計算による目安です。</p>',
    sources: { nao: { title: '国立天文台 暦計算室「暦Wiki 二十四節気とは？」', url: 'https://eco.mtk.nao.ac.jp/koyomi/wiki/B5A8C0E12FC6F3BDBDBBCDC0E1B5A4A4C8A4CFA1A9.html' } },
    modes: seasons.map(function (s) {
      return {
        id: s, label: s === now0 ? 'いま（' + s + '）' : s,
        fx: function (px, w, h) { FX[show(s).cat](px, w, h); },
        over: function (c, W, H) { vert(c, W, H, show(s).w); },
        ask: function () { var p = show(s); return '「' + p.w + '」── ' + p.t + ' ' + LOOK[p.cat] + '、探してみてください。'; },
        notes: function () { return [{ text: '画面を閉じたら、いつもの道で、いまの季語を一つ見つけてみてください。' }]; },
        enter: function () {}
      };
    })
  });
  document.getElementById('sub').addEventListener('click', function (e) { if (e.target.closest('a')) return; var m = M.mode(), L = list(m.id), p = show(m.id), i = L.findIndex(function (q) { return q.w === p.w; }); cur[m.id] = L[(i + 1) % L.length]; M.say(); });
})();
