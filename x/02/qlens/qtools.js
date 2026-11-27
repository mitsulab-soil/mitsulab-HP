/* qtools.js ── はじまりの森（sight）を全道具の入口にする「道具の棚」（2026-11-27 本人「道具は sight などの名前・3D で表示・説明」）
   ≡ の中に、道具ごとに［3D の姿・名前・1〜2 行の説明］のカードを並べる。使っているあいだは、画面の左上に名前と小さな 3D を出し続ける。
   3D の姿：models の表の glb（いまは手道具の原型＝_共通3D/p-tools の写し。本番は img/tools3d/ に届いたら表を差し替える）。
   素材は ≡ を開いたとき・道具を選んだときにだけ読む（起動では読まない）。中身のレンズは qlens.js の QLens.use。
   使い方：QTools.mount({ base:'qlens/', drawer:'#qgDrawer', menu:'#qgMenu', models:{ sight:'qlens/p-tools/sight.glb', … }, ctx:function(){...} })
   models に無い道具は、画面の中で組む簡単な形（仮）で出す。 */
(function (g) {
  'use strict';
  var GROUPS = [
    { title: '感覚をひらく', items: [
      { id: 'sight', lens: 'forest-hachi', ja: '生き物の目', d: '森を、ミツバチやチョウなど生き物の目の色の幅で見る（人の目に置きかえた模式）。', m: 'ミツバチなど生き物の目が受けとる色の幅で、森を見る道具。選ぶと、紫外を見て赤を見分けにくいミツバチの色の見え方に、森の色が置きかわる。歩いたり見回したりして、花や葉の見え方の違いを探す。根拠：ミツバチの目は紫外・青・緑の三色型（人の目の色に置きかえた模式）。' },
      { id: 'hear', lens: 'hear-bat', ja: '聴こえない音', d: 'コウモリの声を、時間 10 倍・高さ 1/10 にして聴く（端末の中で合成した模式）。', m: '人には聴こえない高さの音を、聴こえる形にする道具。選ぶと、森にアブラコウモリの呼び声が、時間を 10 倍にのばし高さを 1/10 にした音で鳴る。耳をすませて、声の間と向きを聴く。根拠：コウモリは超音波で呼び、こだまで周りを知る（声は端末の中で合成した模式）。' },
      { id: 'touch', lens: 'touch-forest', ja: '手ざわり', d: '樹皮・苔・石・土・葉を押すと面に寄り、なぞると振動と音で手ざわりが返る。', m: '森の物の手ざわりを、指で受けとる道具。選んで樹皮・苔・石・土・葉を押すと、その面に寄り、表面が画面いっぱいに広がる。広がった面をなぞると、凹凸と粗さに合わせて振動と音が返る。根拠：森の 3D の材質の写真の明暗と粗さから組んだ模式。' },
      { id: 'magnet', lens: 'magnet-field', ja: '地磁気', d: '見ている向きに、地磁気の線を重ねる（さいたま付近の値の模式）。', m: '人の体では感じない地磁気を、景色に重ねる道具。選ぶと、見ている向きに磁北と磁力線が淡い線で出る。体ごと向きを変えて、磁北がどちらかを確かめる。根拠：国土地理院の磁気図による、さいたま付近の偏角（西へ約 7.5°）と伏角（約 49.5°）。' } ] },   // museum は世界の地図（x/58）の場所へ（2026-11-27 本人）
    { title: '世界を切り分け直す', items: [
      { id: 'carve', lens: 'm-carve', ja: '色と方位', d: '文化圏ごとの色の区切りや方位の切り方で、森を区切り直す。', m: '色や方位を、文化圏ごとの区切り方で切り分け直す道具。選ぶと、森が二つの色・十一の色・水色のある区切りなどで塗り分けられる。下の札で区切り方を切りかえ、字幕を押すと説明が進む。根拠：Berlin & Kay の基本色彩語の研究と World Color Survey など（区切りの位置は模式）。' },
      { id: 'oldmap', lens: 'm-oldmap', ja: '地図', d: '森を上から見た地図と 5 m の方眼に置きかえて読む。', m: '景色を、地図という記号に置きかえて読む道具。選ぶと、森を上から見た地図（池・川・自分の向き）や、地面に 5 m の方眼が出る。地図と目の前を見くらべ、方眼で遠さを数える。根拠：この森の模型の池と川の位置（特定の実在の場所ではない）。' },
      { id: 'civil', lens: 'm-civil', ja: '土木の目', d: '線・水平・水の集まる所。土木の目で森を読む。', m: '道や水路をつくる人の目で、景色の線と傾きを読む道具。選ぶと、輪郭の線・目の高さの水平・水の集まる池と川の筋が浮かぶ。札で読み方を切りかえ、見上げ見下ろして水平の線を動かす。根拠：道路構造令による車道の横断勾配 1.5〜2% など。' },
      { id: 'kigo', lens: 'm-kigo', ja: '季語', d: 'いまの季節の季語を一つずつ重ね、森の中に探す。', m: '俳句の季語を枠にして、景色を季節の名で切りとる道具。選ぶと、いまの季節の季語が縦書きで重なり、その種類に合わせて空や足もとが強まる。字幕を押すと次の季語へ進み、森の中にその季語を探す。根拠：季節の区切りは、太陽の黄経による立春・立夏・立秋・立冬の目安。' },
      { id: 'koyomi', lens: 'm-koyomi', ja: '暦', d: 'いまの二十四節気と七十二候を、太陽の位置から出して重ねる。', m: '一年を区切って景色に名をつける、暦の道具。選ぶと、いまの七十二候の名と読み、二十四節気の環と太陽の位置が重なる。札で候と節気を切りかえ、いまの候の気配を森に探す。根拠：太陽の黄経を 15° ずつ区切ると節気、5° ずつで候（国立天文台 暦Wiki）。' },
      { id: 'role', lens: 'm-role', ja: '立場の目', d: '植木職人・鳥を調べる人・子ども。立場ごとの目の向け方を借りる。', m: '仕事や年齢など、立場ごとの目の向け方を借りる道具。選ぶと、植木職人・鳥を調べる人・子どもなどの見る所が残り、ほかが沈む。札で立場を切りかえ、その目で森を歩いてみる。根拠：mitsulab がその立場を想像して書いた問い（仮説）で、仕事の手引きにもとづくものではない。' },
      { id: 'language', lens: 'language', ja: 'ことば', d: '言語を切りかえると、同じ名前でまとまる物と、別の名前に分かれる物が、景色の中で入れかわる。' } ] }
  ];
  var ALL = []; GROUPS.forEach(function (G) { G.items.forEach(function (it) { ALL.push(it); }); });
  var O, cur = null, box, badge, THREE = null, loader = null, models = {}, rr = null, live = null;
  var CSS = '.qt-open{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;margin:0 0 12px;padding:6px 14px;box-sizing:border-box;border:1px solid rgba(170,226,236,.4);border-radius:26px;background:rgba(6,34,38,.32);color:#e9f6f5;font:500 14px "Shippori Mincho",serif;text-align:left}.qt-open span{flex:0 0 auto}.qt-open small{opacity:.7;font-size:11px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    'html body #qgDrawer .qt-open{display:flex!important;grid-column:1/-1!important;flex:0 0 100%!important;width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important;box-sizing:border-box!important}' +
    /* 帯：カメラの撮影モードのような細い一本の帯に、道具の名前が横に並ぶ。画面の下の端（常設の 3 つの上）。景色のまん中はあける */
    '.qs{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);z-index:26;pointer-events:none;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;font-family:"Shippori Mincho","Hiragino Mincho ProN",serif;color:#eef5f2}.qs.on{opacity:1;transform:none}' +
    '.qs-pv{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 auto 10px;padding:8px 12px;max-width:600px;box-sizing:border-box;border-radius:14px;background:rgba(8,16,18,.42);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);pointer-events:auto}' +
    '@media (max-width:767px){.qs-pv{margin:0 16px 10px}.qs-pv em{white-space:nowrap}.qs .qs-pv p{-webkit-line-clamp:3}}.qs-pv canvas{width:68px;height:68px;flex:0 0 68px;border-radius:50%;background:radial-gradient(circle at 50% 42%,rgba(220,240,240,.22),rgba(220,240,240,0) 68%)}.qs-pv div{flex:1 1 auto}' +
    '.qs-pv div{min-width:0}.qs-pv em{display:block;font-style:normal;font-size:10px;letter-spacing:.16em;opacity:.6}.qs-pv b{display:block;font-weight:500;font-size:14px;letter-spacing:.06em}.qs-pv p{margin:2px 0 0;font-size:12px;line-height:1.5;opacity:.86;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.qs-more{display:inline-block;min-height:32px;margin:2px 0 0;padding:0;border:0;background:none;color:#cfe9ef;font:500 12px "Shippori Mincho",serif;letter-spacing:.06em;cursor:pointer}.qs-more:focus-visible{outline:1px solid rgba(190,236,246,.7)}' +
    '.qs .qs-pv p.qs-m[hidden],.qs-more[hidden]{display:none}.qs .qs-pv p.qs-m{display:block;-webkit-line-clamp:unset;margin:4px 0 0;font-size:12.5px;line-height:1.7;opacity:.92;max-height:min(34vh,220px);overflow-y:auto}' +
    '.qs-bar{position:relative;height:46px;margin:0 auto;max-width:640px;pointer-events:auto;touch-action:pan-y;cursor:grab;background:rgba(8,16,18,.46);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:1px solid rgba(220,240,240,.14);border-bottom:1px solid rgba(220,240,240,.14);-webkit-mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent);overflow:hidden}' +
    '.qs-bar:focus{outline:none}.qs-n{position:absolute;left:50%;top:0;height:46px;line-height:46px;border:0;padding:0 10px;background:none;color:inherit;font:400 16px "Cormorant Garamond","Helvetica Neue",sans-serif;letter-spacing:.1em;text-shadow:0 1px 4px rgba(0,0,0,.6);white-space:nowrap;transform-origin:50% 50%;cursor:pointer}' +
    '.qs-dot{position:absolute;left:50%;bottom:6px;width:4px;height:4px;margin-left:-2px;border-radius:2px;background:#eef5f2;pointer-events:none}' +
    '.qs-sep{position:absolute;top:12px;width:1px;height:22px;background:rgba(243,214,150,.7);pointer-events:none}' +
    '.qs-x{flex:0 0 44px;width:44px;height:44px;border:1px solid rgba(220,240,240,.25);border-radius:22px;background:rgba(8,16,18,.4);color:inherit;font-size:14px;opacity:.85;pointer-events:auto}' +
    '@media (min-width:768px){.qs{bottom:28px;right:auto;left:50%;width:640px;transform:translate(-50%,8px)}.qs.on{transform:translateX(-50%)}}' +
    'body.qd-on .qlm{opacity:0;pointer-events:none;transition:opacity .25s}' +
    '.qt-badge{position:fixed;left:12px;top:calc(env(safe-area-inset-top,0px) + 30px);z-index:25;display:flex;align-items:center;gap:8px;padding:4px 6px 4px 4px;border:1px solid rgba(170,226,236,.35);border-radius:28px;background:rgba(6,20,22,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:#e9f6f5;font-family:"Shippori Mincho",serif;opacity:0;transition:opacity .35s;pointer-events:none;cursor:pointer}' +
    '.qt-badge.on{opacity:1;pointer-events:auto}.qt-badge canvas{width:40px;height:40px}.qt-badge b{font:600 15px/1 "Cormorant Garamond","Shippori Mincho",serif;letter-spacing:.04em}.qt-badge small{display:block;font-size:10px;opacity:.7;margin-top:2px}' +
    '.qt-badge button{width:44px;height:44px;border:0;border-radius:22px;background:transparent;color:inherit;font-size:16px;cursor:pointer}';

  /* ── 3D の姿 ── */
  function three() {
    if (THREE) return Promise.resolve();
    return Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')]).then(function (m) { THREE = m[0]; loader = new m[1].GLTFLoader(); loader.setMeshoptDecoder(m[2].MeshoptDecoder); });   // 道具の glb は meshopt で縮めてある
  }
  function fallback(id) {   // 本番の 3D が届くまでの、画面の中で組む簡単な形（仮）
    var G = new THREE.Group(), M = function (c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .55, metalness: .1 }, o || {})); };
    var add = function (geo, m, x, y, z, rx, ry, rz) { var o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); G.add(o); return o; };
    if (id === 'carve') { add(new THREE.CylinderGeometry(.5, .5, .5, 6), M(0xd9c7a1, { flatShading: true })); add(new THREE.TorusGeometry(.62, .03, 6, 36), M(0x9bdcf0), 0, 0, 0, Math.PI / 2); }
    else if (id === 'oldmap') { for (var i = 0; i < 3; i++) add(new THREE.BoxGeometry(.42, .02, .9), M(i % 2 ? 0xd8cba8 : 0xc9b98f), (i - 1) * .4, 0, 0, 0, 0, (i - 1) * .35); }
    else if (id === 'civil') { add(new THREE.BoxGeometry(1.2, .14, .14), M(0x3a4a52)); add(new THREE.CylinderGeometry(.045, .045, .2, 12), M(0x8fd0c0, { transparent: true, opacity: .8 }), 0, .02, 0, 0, 0, Math.PI / 2); }
    else if (id === 'kigo') { add(new THREE.BoxGeometry(.28, 1.1, .02), M(0xe6dcc6)); add(new THREE.TorusGeometry(.04, .01, 6, 16), M(0x864e4c), 0, .5, .02); }
    else if (id === 'koyomi') { add(new THREE.TorusGeometry(.5, .05, 8, 48), M(0xd6c09b)); for (var k = 0; k < 24; k++) { var a = k / 24 * Math.PI * 2; add(new THREE.BoxGeometry(.02, .1, .02), M(0xeef5f2), Math.cos(a) * .5, Math.sin(a) * .5, 0, 0, 0, a); } add(new THREE.SphereGeometry(.07, 12, 8), M(0xf3d696, { emissive: 0x6a5020 }), .5, 0, 0); }
    else if (id === 'role') { add(new THREE.TorusGeometry(.32, .05, 8, 32), M(0x4a5a5e), -.36, 0, 0); add(new THREE.TorusGeometry(.32, .05, 8, 32), M(0x4a5a5e), .36, 0, 0); add(new THREE.CylinderGeometry(.03, .03, .2, 8), M(0x4a5a5e), 0, 0, 0, 0, 0, Math.PI / 2); }
    else if (id === 'language') { add(new THREE.TorusGeometry(.4, .045, 8, 40), M(0x9bdcf0), -.2, 0, 0); add(new THREE.TorusGeometry(.4, .045, 8, 40), M(0xf3d696), .2, 0, 0); }
    else { add(new THREE.IcosahedronGeometry(.5, 1), M(0x9bdcf0, { flatShading: true })); }
    return G;
  }
  function fit(o) { var b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = 1.4 / Math.max(s.x, s.y, s.z, 1e-3); o.position.sub(c.multiplyScalar(k)); o.scale.multiplyScalar(k); var w = new THREE.Group(); w.add(o); return w; }
  function model(id) {
    if (models[id]) return models[id];
    return models[id] = three().then(function () {
      var u = (O.models || {})[id];   // 置き場は呼ぶ側の表で決める（本番の 3D が届いたら、表の道のりを差し替えるだけ）
      if (!u) return fit(fallback(id));
      return loader.loadAsync(u).then(function (gl) { return fit(gl.scene); }, function () { return fit(fallback(id)); });
    });
  }
  function stage() {
    if (rr) return rr;
    var r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(112, 112, false); r.setClearColor(0, 0); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.7;
    var sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, .1, 20); cam.position.set(0, .5, 3.2); cam.lookAt(0, 0, 0);
    sc.add(new THREE.HemisphereLight(0xf2fafa, 0x6a5a48, 3.2)); var dl = new THREE.DirectionalLight(0xffffff, 3); dl.position.set(2, 3, 2.5); sc.add(dl); var rim = new THREE.DirectionalLight(0xbfe8f4, 2.6); rim.position.set(-2.5, 1.5, -2); sc.add(rim); sc.add(new THREE.AmbientLight(0xffffff, .8));   // 暗い道具も形が分かるように、正面と輪郭に光
    return rr = { r: r, sc: sc, cam: cam };
  }
  function draw(o, cv, ang) {
    var S = stage(); S.sc.add(o); o.rotation.y = ang; S.r.render(S.sc, S.cam); S.sc.remove(o);
    var c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(S.r.domElement, 0, 0, cv.width, cv.height);
  }
  /* ── 使っている道具の札（左上・押すと帯がひらく） ── */
  function showBadge(it) {
    cancelAnimationFrame(live); badge.classList.toggle('on', !!it); if (!it) return;
    badge.querySelector('b').firstChild.nodeValue = it.id; badge.querySelector('small').textContent = it.ja;
    var cv = badge.querySelector('canvas'), t0 = performance.now(), last = 0;
    model(it.id).then(function (o) {
      (function spin(t) { if (cur !== it) return; live = requestAnimationFrame(spin); if (t - last < 66) return; last = t; draw(o, cv, (t - t0) / 1600); })(t0);
    });
  }
  /* ── 帯：道具を一つずつ送る。いまの名前は白くはっきり、前後は薄く小さく ── */
  var dial, bar, pv, xb, its = [], seps = [], pos = 0, target = 0, raf2 = 0, settle = 0, pvSpin = 0;
  function gap() { return innerWidth >= 768 ? 96 : 84; }
  function layout() {
    var n = ALL.length, G = gap();
    its.forEach(function (b, i) {
      var d = i - pos, ad = Math.abs(d), op = ad < .5 ? 1 : ad < 1.5 ? .66 : ad < 2.5 ? .38 : ad < 3.5 ? .16 : 0;
      b.style.transform = 'translateX(calc(-50% + ' + (d * G) + 'px)) scale(' + (ad < .5 ? 1 : .86) + ')'; b.style.opacity = op; b.style.pointerEvents = op ? 'auto' : 'none';
      b.style.fontWeight = ad < .5 ? 600 : 400; b.classList.toggle('cur', ad < .5);
    });
    seps.forEach(function (m) { m.el.style.left = 'calc(50% + ' + ((m.at - pos) * G) + 'px)'; m.el.style.opacity = Math.abs(m.at - pos) < 3.5 ? 1 : 0; });
    var it = ALL[((Math.round(pos) % n) + n) % n];
    if (pv.dataset.id !== it.id) { pv.dataset.id = it.id; pv.querySelector('em').textContent = it.g + (cur === it ? '　·　使用中' : '　·　押して決める'); pv.querySelector('b').textContent = it.ja; pv.querySelector('p').textContent = it.d; var q = pv.querySelector('.qs-m'); q.textContent = it.m || ''; q.hidden = true; var mb = pv.querySelector('.qs-more'); mb.hidden = !it.m; mb.setAttribute('aria-expanded', 'false'); mb.textContent = '＋ くわしく'; spinPv(it); }
  }
  function spinPv(it) {
    cancelAnimationFrame(pvSpin); var cv = pv.querySelector('canvas'), t0 = performance.now(), last = 0;
    model(it.id).then(function (o) { (function sp(t) { if (pv.dataset.id !== it.id || dial.hidden) return; pvSpin = requestAnimationFrame(sp); if (t - last < 50) return; last = t; draw(o, cv, (t - t0) / 2200); })(t0); }).catch(function (e) { console.warn('qtools', it.id, e); });
  }
  function tick() { var d = target - pos; pos += d * .2; if (Math.abs(d) < .002) pos = target; layout(); raf2 = pos !== target ? requestAnimationFrame(tick) : 0; }
  function go(t, now) {
    target = Math.max(0, Math.min(ALL.length - 1, t)); if (!raf2) raf2 = requestAnimationFrame(tick);
    // 送るだけでは切りかえない。真ん中の名前を押したとき（Enter）だけ決める（2026-11-27 本人）
  }
  function openDial() {
    var i = cur ? ALL.indexOf(cur) : 0; pos = target = i; dial.hidden = false; document.body.classList.add('qd-on'); pv.dataset.id = ''; layout();
    requestAnimationFrame(function () { dial.classList.add('on'); }); bar.focus({ preventScroll: true });
  }
  function closeDial() { dial.classList.remove('on'); document.body.classList.remove('qd-on'); setTimeout(function () { if (!dial.classList.contains('on')) { dial.hidden = true; cancelAnimationFrame(pvSpin); } }, 320); }
  function buildDial() {
    dial = document.createElement('div'); dial.className = 'qs'; dial.hidden = true; dial.setAttribute('role', 'dialog'); dial.setAttribute('aria-label', '道具をえらぶ');
    pv = document.createElement('div'); pv.className = 'qs-pv'; pv.setAttribute('aria-live', 'polite'); pv.innerHTML = '<canvas width="112" height="112" aria-hidden="true"></canvas><div><em></em><b></b><p></p><button type="button" class="qs-more" aria-expanded="false">＋ くわしく</button><p class="qs-m" hidden></p></div>';
    pv.querySelector('.qs-more').onclick = function () { var o = this.getAttribute('aria-expanded') !== 'true', q = pv.querySelector('.qs-m'); this.setAttribute('aria-expanded', String(o)); this.textContent = o ? '－ とじる' : '＋ くわしく'; q.hidden = !o; }; dial.appendChild(pv);
    bar = document.createElement('div'); bar.className = 'qs-bar'; bar.tabIndex = 0; bar.setAttribute('aria-label', '道具の帯：左右に送って選ぶ'); dial.appendChild(bar);
    var prevG = null;
    ALL.forEach(function (it, i) {
      if (prevG && prevG !== it.g) { var m = document.createElement('i'); m.className = 'qs-sep'; bar.appendChild(m); seps.push({ el: m, at: i - .5 }); }
      prevG = it.g;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'qs-n'; b.textContent = it.id; b.setAttribute('aria-label', it.id + '（' + it.ja + '）');
      b.onclick = function () { if (moved) return; if (Math.round(pos) === i) { pick(it); closeDial(); } else go(i); };
      its.push(b); bar.appendChild(b);
    });
    var dot = document.createElement('i'); dot.className = 'qs-dot'; bar.appendChild(dot);
    xb = document.createElement('button'); xb.type = 'button'; xb.className = 'qs-x'; xb.textContent = '✕'; xb.setAttribute('aria-label', '帯を閉じる'); xb.onclick = closeDial; pv.appendChild(xb);
    document.body.appendChild(dial);
    var dr = null, moved = false;
    bar.addEventListener('pointerdown', function (e) { dr = { x: e.clientX, p: target }; moved = false; });
    addEventListener('pointermove', function (e) { if (!dr) return; var dx = e.clientX - dr.x; if (Math.abs(dx) > 6) moved = true; target = Math.max(-.4, Math.min(ALL.length - .6, dr.p - dx / gap())); if (!raf2) raf2 = requestAnimationFrame(tick); });
    addEventListener('pointerup', function () { if (!dr) return; dr = null; if (moved) go(Math.round(target)); setTimeout(function () { moved = false; }, 0); });
    bar.addEventListener('wheel', function (e) { e.preventDefault(); go(Math.round(target) + (e.deltaY + e.deltaX > 0 ? 1 : -1)); }, { passive: false });
    dial.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(Math.round(target) + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(Math.round(target) - 1); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { pick(ALL[Math.round(target)]); closeDial(); e.preventDefault(); }
      else if (e.key === 'Escape') closeDial();
    });
    addEventListener('resize', function () { if (!dial.hidden) layout(); });
  }
  function pick(it) {
    if (pv) pv.dataset.id = '';
    cur = it; QLens.use(it ? it.lens : 'none', O.ctx()).catch(function (e) { console.warn('qtools', e); });
    showBadge(it);
  }
  function closeDrawer() { var m = document.querySelector(O.menu); if (m && m.getAttribute('aria-expanded') === 'true') m.click(); }

  function mount(o) {
    O = o; QLens.setBase(o.base);
    GROUPS.forEach(function (G) { G.items.forEach(function (it) { it.g = G.title; }); });
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = document.createElement('button'); box.type = 'button'; box.className = 'qt-open';
    box.innerHTML = '<span>道具をえらぶ</span><small>sight・hear・touch・magnet・carve ほか</small>';
    box.onclick = function () { closeDrawer(); setTimeout(openDial, 200); };
    badge = document.createElement('div'); badge.className = 'qt-badge'; badge.setAttribute('role', 'status');
    badge.innerHTML = '<canvas width="80" height="80" aria-hidden="true"></canvas><div><b>&nbsp;</b><small></small></div><button type="button" aria-label="道具をはずす">✕</button>';
    badge.querySelector('button').onclick = function (e) { e.stopPropagation(); pick(null); closeDial(); };
    badge.onclick = function () { openDial(); };
    document.body.appendChild(badge);
    buildDial();
    function put() { var d = document.querySelector(o.drawer); if (d && !d.contains(box)) d.insertBefore(box, d.firstChild); }
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest(o.menu)) { put(); setTimeout(put, 0); setTimeout(put, 120); } }, true);
    /* ?lens=sight など：その道具を選んだ状態で始める */
    var q = (new URLSearchParams(location.search)).get('lens') || '';
    var it = ALL.filter(function (x) { return x.id === q || x.lens === q || 'm-' + x.id === q || (q === 'touch-ground' && x.id === 'touch'); })[0];
    if (it) { var n = 0; (function w() { var u = g.__um; if (!u || !u.renderer || !u.camera || !g.__muBoot) { if (n++ < 400) setTimeout(w, 100); return; } pick(it); })(); }
  }
  g.QTools = { mount: mount, groups: GROUPS, open: function () { openDial(); }, close: function () { closeDial(); }, pick: function (id) { pick(ALL.filter(function (x) { return x.id === id; })[0] || null); }, current: function () { return cur && cur.id; } };
})(window);
