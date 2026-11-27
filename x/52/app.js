/* Qualia/carve ── 環世界の翻訳。同じ景色を、文化圏ごとの「切り分けの軸」で区切り直す。
   色の区切りの代表点は、出典の傾向にもとづく模式（境目の位置は人や場面で揺れる）。訳語は出さず、区切り方そのものを見せる。 */
(function () {
  var M = MCam;
  /* 色の代表点：おおよその焦点色（模式） */
  var K = { blk: '#1c1c1e', wht: '#ecece6', gry: '#8a8b88', red: '#c0302a', org: '#e07a22', yel: '#e3c62c', grn: '#3f8a3c', blu: '#2f56b0', pur: '#6c3a8c', pnk: '#e08aa8', brn: '#6e4526', mizu: '#8fc8e6', sinij: '#21409a', goluboj: '#86bde8' };
  function P(keys) { return keys.map(function (k) { return { c: K[k] }; }); }
  var luts = {};
  function L(id, pal) { return luts[id] || (luts[id] = M.lut(pal)); }
  var two = [ /* 明るく暖かい色の側（0）と、暗く冷たい色の側（1）。Heider & Olivier 1972 の記述の模式 */
    { c: '#e8d6b4', g: 0, at: '#ecece6' }, { c: '#e8d6b4', g: 0, at: '#e3c62c' }, { c: '#e8d6b4', g: 0, at: '#c0302a' }, { c: '#e8d6b4', g: 0, at: '#e07a22' }, { c: '#e8d6b4', g: 0, at: '#e08aa8' },
    { c: '#2b3540', g: 1, at: '#1c1c1e' }, { c: '#2b3540', g: 1, at: '#3f8a3c' }, { c: '#2b3540', g: 1, at: '#2f56b0' }, { c: '#2b3540', g: 1, at: '#6c3a8c' }, { c: '#2b3540', g: 1, at: '#5a6466' }
  ];
  function compass(ctx, W, H, S, t, absolute) {
    var hd = S.heading, has = hd != null; if (!has) hd = 0;
    var fov = 62, cx = W / 2, top = H * .16;
    ctx.lineWidth = 1; ctx.font = '13px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'center';
    var marks = absolute ? [['北', 0], ['東', 90], ['南', 180], ['西', 270]] : [['前', 0], ['右', 90], ['後ろ', 180], ['左', 270]];
    var rel = absolute ? -hd : 0;
    for (var a = -fov; a <= fov; a += 1) {
      var deg = ((a - rel) % 360 + 360) % 360, x = cx + a / fov * W * .5;
      if (deg % 90 === 0) {
        var m = marks[deg / 90];
        ctx.strokeStyle = 'rgba(236,246,244,.75)'; ctx.beginPath(); ctx.moveTo(x, top - 10); ctx.lineTo(x, H); ctx.stroke();
        ctx.fillStyle = '#eef5f2'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillText(m[0], x, top - 18); ctx.shadowBlur = 0;
      } else if (deg % 15 === 0) { ctx.strokeStyle = 'rgba(236,246,244,.35)'; ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x, top + 4); ctx.stroke(); }
    }
    if (absolute && !has) { ctx.fillStyle = 'rgba(238,245,242,.7)'; ctx.fillText(W < 768 ? '向きのセンサーがあれば、北が動きます' : '向きのセンサーがあるスマホで、北がその方へ動きます', cx, top + 24); }
  }
  MCam.start({
    name: 'Qualia/carve ── 環世界の翻訳', more: 'この切り分け方',
    about: '<p>文化圏によって、色や方位をどこで区切るかがちがいます。その区切り方を一つの環世界として、景色の区切りごと切りかえます。区切り方に順位はありません。</p><p>色の代表点と境目は、下の研究の傾向による模式で、人や場面で揺れます。区切り方がちがうことと、何をどう感じているかは、別の問いです。</p>',
    sources: {
      bk: { title: 'Berlin & Kay 1969『Basic Color Terms』（University of California Press）', url: 'https://www.ucpress.edu/books/basic-color-terms/paper' },
      wcs: { title: 'World Color Survey（Kay ほか、カリフォルニア大学バークレー校）', url: 'https://www1.icsi.berkeley.edu/wcs/' },
      ho: { title: 'Heider & Olivier 1972, Cognitive Psychology 3: 337–354', url: 'https://doi.org/10.1016/0010-0285(72)90011-4' },
      kur: { title: 'Kuriki ほか 2017「The modern Japanese color lexicon」Journal of Vision 17(3):1', url: 'https://doi.org/10.1167/17.3.1' },
      win: { title: 'Winawer ほか 2007「Russian blues…」PNAS 104: 7780–7785', url: 'https://doi.org/10.1073/pnas.0701644104' },
      mar: { title: 'Martinovic ほか 2020「Russian blues reveal the limits…」Cognition 201: 104281', url: 'https://doi.org/10.1016/j.cognition.2020.104281' },
      lev: { title: 'Levinson 2003『Space in Language and Cognition』（Cambridge University Press）', url: 'https://doi.org/10.1017/CBO9780511613609' },
      hav: { title: 'Haviland 1998「Guugu Yimithirr Cardinal Directions」Ethos 26(1): 25–47', url: 'https://doi.org/10.1525/eth.1998.26.1.25' }
    },
    modes: [
      { id: 'none', label: 'いまの区切り', ask: 'どこまでを「一つの色」と見ていますか。',
        notes: [{ text: '色の名前で景色を区切るとき、どこに境目を置くかは、文化圏によってちがいます。枠を選ぶと、景色の区切りが切りかわります。', src: 'wcs' }, { text: '画面を閉じたら、帰り道で一つ、二つの色の名のあいだにある色を探してみてください。' }] },
      { id: 'two', label: '二つの色の区切り', fx: function (px, w, h) { M.carve(px, w, h, L('two', two), .4); },
        ask: '目の前でいちばん赤い物は、明るく暖かい側ですか。境目はどこ？',
        notes: [
          { text: 'ニューギニアのダニの人びとのことばでは、基本の色の名が二つで、明るく暖かい色の側と、暗く冷たい色の側に分けると報告されています。', src: 'ho' },
          { text: '同じ研究は、色の名が二つでも、色の見分けや覚え方は、ほかの言語の話し手と大きくは変わらなかったと述べています。区切り方と、感じ方は別の問いです。', src: 'ho' }] },
      { id: 'eleven', label: '十一の色の区切り', fx: function (px, w, h) { M.carve(px, w, h, L('en', P(['blk', 'wht', 'gry', 'red', 'org', 'yel', 'grn', 'blu', 'pur', 'pnk', 'brn']))); },
        ask: '目の前の木で、葉の緑と幹の茶は、どこで分かれますか。',
        notes: [{ text: '英語などでは、基本の色の名は十一とされ、多くの言語の色の名には共通の傾向があるという研究が続いています。', src: 'bk' }, { text: '世界の 110 の言語で色の名を集めた調査があり、区切り方の傾向と幅の両方が調べられています。', src: 'wcs' }] },
      { id: 'mizu', label: '水色のある区切り', fx: function (px, w, h) { M.carve(px, w, h, L('ja', P(['blk', 'wht', 'gry', 'red', 'org', 'yel', 'grn', 'blu', 'pur', 'pnk', 'brn', 'mizu']))); },
        ask: '明るい青が、別の区切りに。空のどこからですか。',
        notes: [{ text: 'いまの日本語の色の名を調べた研究では、「水（水色）」を 98% の人が使い、基本の色の名の候補として挙げています。', src: 'kur' }, { text: '同じ研究では、「紺」「抹茶」なども、ほかの語と分かれた区切りとして現れました。', src: 'kur' }] },
      { id: 'blue2', label: '二つの青の区切り', fx: function (px, w, h) { M.carve(px, w, h, L('ru', P(['blk', 'wht', 'gry', 'red', 'org', 'yel', 'grn', 'sinij', 'goluboj', 'pur', 'pnk', 'brn']))); },
        ask: '濃い青と明るい青。影の中の青はどちら？',
        notes: [{ text: 'ロシア語では、濃い青と明るい青に、別々の基本の色の名があります。', src: 'win' }, { text: 'その境目は、明るさの文脈や、前に見た色によって動くことも報告されています。', src: 'mar' }] },
      { id: 'body', label: '体の向きで切る', over: function (c, W, H, S, t) { compass(c, W, H, S, t, false); },
        ask: '前・右・後ろ・左。体を回すと、区切りも回ります。',
        notes: [{ text: '空間を、話し手の体を基準に区切ることばと、東西南北のような体の外の基準で区切ることばがあります。', src: 'lev' }] },
      { id: 'abs', label: '東西南北で切る', over: function (c, W, H, S, t) { compass(c, W, H, S, t, true); },
        ask: '体を回しても、北は北。背中はいま、どの方角？',
        notes: [{ text: 'オーストラリアのグーグ・イミディルのことばでは、日常の小さな位置も、東西南北で言い表すと報告されています。', src: 'hav' }, { text: 'こうした区切り方のちがいは、多くの言語を比べる研究の中で整理されています。', src: 'lev' }] }
    ]
  });
})();
