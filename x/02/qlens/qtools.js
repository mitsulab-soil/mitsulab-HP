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
      { id: 'sight', lens: 'forest-hachi', ja: '生き物の目', d: '生き物の目の色の幅で森を見る。選ぶとミツバチの見え方に。歩いて花や葉の違いを探す。根拠：蜂の目は紫外・青・緑の三色型（模式）。' },
      { id: 'hear', lens: 'hear-bat', ja: '聴こえない音', d: '聴こえない音を聴こえる形にする。コウモリの声が時間 10 倍・高さ 1/10 で鳴る。耳をすませて間と向きを聴く。根拠：超音波で周りを知る。' },
      { id: 'touch', lens: 'touch-forest', ja: '手ざわり', d: '森の物の手ざわりを指で受けとる。樹皮・苔・石・土・葉を押すと面に寄り、なぞると振動と音が返る。根拠：森の材質の写真の凹凸（模式）。' },
      { id: 'magnet', lens: 'magnet-field', ja: '地磁気', d: '感じない地磁気を景色に重ねる。見ている向きに磁北と線が出る。体ごと向きを変えて確かめる。根拠：国土地理院の磁気図（西へ約 7.5°）。' } ] },   // museum は世界の地図（x/58）の場所へ（2026-11-27 本人）
    { title: '世界を切り分け直す', items: [
      { id: 'carve', lens: 'm-carve', ja: '色と方位', d: '色や方位を文化圏ごとの区切りで切り直す。森が二つ・十一の色などで塗り分けられる。札で切りかえる。根拠：Berlin & Kay（1969）ほかの色名の研究。' },
      { id: 'oldmap', lens: 'm-oldmap', ja: '地図', d: '景色を地図の記号で読む。森を上から見た地図と 5 m の方眼が出る。目の前と見くらべ、遠さを数える。根拠：この森の模型の池と川。' },
      { id: 'civil', lens: 'm-civil', ja: '土木の目', d: '道をつくる人の目で線と傾きを読む。輪郭・水平・水の集まる所が浮かぶ。見上げて水平の線を動かす。根拠：道路構造令の横断勾配 1.5〜2%。' },
      { id: 'kigo', lens: 'm-kigo', ja: '季語', d: '季語を枠に、景色を季節の名で切りとる。いまの季語が縦書きで重なる。字幕を押して次へ、森に探す。根拠：太陽の黄経による季節の区切り。' },
      { id: 'koyomi', lens: 'm-koyomi', ja: '暦', d: '暦で一年を区切り、景色に名をつける。いまの七十二候と二十四節気が重なる。札で切りかえる。根拠：黄経 15° で節気・5° で候（国立天文台）。' },
      { id: 'role', lens: 'm-role', ja: '立場の目', d: '立場ごとの目の向け方を借りる。植木職人・鳥を調べる人・子どもの見る所が残る。札で切りかえ森を歩く。根拠：mitsulab が書いた問い（仮説）。' } ] }
  ];
  var ALL = []; GROUPS.forEach(function (G) { G.items.forEach(function (it) { ALL.push(it); }); });
  var O, cur = null, box, badge, THREE = null, loader = null, models = {}, rr = null, live = null;
  var CSS = '.qt-open{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;margin:0 0 12px;padding:6px 14px;box-sizing:border-box;border:1px solid rgba(170,226,236,.4);border-radius:26px;background:rgba(6,34,38,.32);color:#e9f6f5;font:500 14px "Shippori Mincho",serif;text-align:left}.qt-open span{flex:0 0 auto}.qt-open small{opacity:.7;font-size:11px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    'html body #qgDrawer .qt-open{display:flex!important;grid-column:1/-1!important;flex:0 0 100%!important;width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important;box-sizing:border-box!important}' +
    /* 帯：カメラの撮影モードのような細い一本の帯に、道具の名前が横に並ぶ。画面の下の端（常設の 3 つの上）。景色のまん中はあける */
    '.qs{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);z-index:26;pointer-events:none;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;font-family:"Shippori Mincho","Hiragino Mincho ProN",serif;color:#eef5f2}.qs.on{opacity:1;transform:none}' +
    '.qs-pv{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 auto 10px;padding:8px 12px;max-width:600px;box-sizing:border-box;border-radius:14px;background:rgba(8,16,18,.42);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);pointer-events:auto}' +
    '@media (max-width:767px){.qs-pv{margin:0 16px 10px}.qs-pv em{white-space:nowrap}.qs .qs-pv p{display:block;-webkit-line-clamp:unset;font-size:11.5px;line-height:1.5}.qs-pv canvas{width:112px;height:112px;flex:0 0 112px;margin:-48px -22px -14px -18px}.qs-pv .qs-x{margin-left:-6px}.qs-pv .qs-x{width:36px;height:36px;flex:0 0 36px}.qs-pv{gap:10px;padding:8px 10px}}.qs-pv canvas{width:170px;height:170px;flex:0 0 170px;margin:-44px -10px -20px -16px;border-radius:50%;background:radial-gradient(circle at 50% 42%,rgba(220,240,240,.22),rgba(220,240,240,0) 68%)}.qs-pv div{flex:1 1 auto}' +
    '.qs-pv div{min-width:0}.qs-pv em{display:block;font-style:normal;font-size:10px;letter-spacing:.16em;opacity:.6}.qs-pv b{display:block;font:600 19px/1.2 "Cormorant Garamond","Shippori Mincho",serif;letter-spacing:.06em}.qs-pv p{margin:2px 0 0;font-size:12px;line-height:1.5;opacity:.86;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}' +
    '.qs-more{display:inline-block;min-height:32px;margin:2px 0 0;padding:0;border:0;background:none;color:#cfe9ef;font:500 12px "Shippori Mincho",serif;letter-spacing:.06em;cursor:pointer}.qs-more:focus-visible{outline:1px solid rgba(190,236,246,.7)}' +
    '.qs .qs-pv p.qs-m[hidden],.qs-more[hidden]{display:none}.qs .qs-pv p.qs-m{display:block;-webkit-line-clamp:unset;margin:4px 0 0;font-size:12.5px;line-height:1.7;opacity:.92;max-height:min(34vh,220px);overflow-y:auto}' +
    '.qs-bar{position:relative;height:46px;margin:0 auto;max-width:640px;pointer-events:auto;touch-action:pan-y;cursor:grab;background:rgba(8,16,18,.46);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:1px solid rgba(220,240,240,.14);border-bottom:1px solid rgba(220,240,240,.14);-webkit-mask-image:linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);overflow:hidden}' +
    '.qs-bar:focus{outline:none}.qs-n{position:absolute;left:50%;top:0;height:46px;line-height:46px;border:0;padding:0 10px;background:none;color:inherit;font:400 16px "Cormorant Garamond","Helvetica Neue",sans-serif;letter-spacing:.1em;text-shadow:0 1px 4px rgba(0,0,0,.6);white-space:nowrap;transform-origin:50% 50%;cursor:pointer}' +
    '.qs-ar{display:none;position:absolute;bottom:0;width:44px;height:46px;border:0;background:none;color:#eef5f2;font:300 22px/46px serif;opacity:.8;pointer-events:auto;z-index:2}.qs-ar.l{left:0}.qs-ar.r{right:0}.qs-ar[disabled]{opacity:.15}' +
    '.qs-dot{position:absolute;left:50%;bottom:6px;width:4px;height:4px;margin-left:-2px;border-radius:2px;background:#eef5f2;pointer-events:none}' +
    '.qs-sep{position:absolute;top:12px;width:1px;height:22px;background:rgba(243,214,150,.7);pointer-events:none;font-style:normal}.qs-sep b,.qs-sep s{position:absolute;top:-9px;font:600 10px/1 "Cormorant Garamond",serif;color:rgba(243,214,150,.9);text-decoration:none}.qs-sep b{right:5px;white-space:nowrap}.qs-sep s{left:5px;white-space:nowrap}' +
    '.qs-x{flex:0 0 44px;width:44px;height:44px;border:1px solid rgba(220,240,240,.25);border-radius:22px;background:rgba(8,16,18,.4);color:inherit;font-size:14px;opacity:.85;pointer-events:auto}' +
    '@media (min-width:768px){.qs{bottom:28px;right:auto;left:50%;width:640px;transform:translate(-50%,8px)}.qs.on{transform:translateX(-50%)}}' +
    '.qs:not(.has) .qs-dot{visibility:hidden}.qs .qs-x{display:none}' +   /* ✕ は左上の札の一つだけ */
    '@media (max-width:767px){.qs.has.rest .qs-pv{display:none}.qs-ar{display:block}.qs.has.rest .qs-pv canvas{width:96px;height:96px;flex-basis:96px;margin:-40px -8px -12px -10px}}' +
    'body.qd-on .qlm{bottom:calc(var(--qsb,92px) + var(--qsh,140px) + 8px)!important}' +
    '.qt-badge{position:fixed;left:12px;top:calc(env(safe-area-inset-top,0px) + 30px);z-index:25;display:flex;align-items:center;gap:8px;padding:4px 6px 4px 4px;border:1px solid rgba(170,226,236,.35);border-radius:28px;background:rgba(6,20,22,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:#e9f6f5;font-family:"Shippori Mincho",serif;opacity:0;transition:opacity .35s;pointer-events:none;cursor:pointer}' +
    '.qt-badge.on{opacity:1;pointer-events:auto}.qt-badge canvas{width:64px;height:64px;margin:-6px -2px -6px -4px}.qt-badge b{font:600 15px/1 "Cormorant Garamond","Shippori Mincho",serif;letter-spacing:.04em}.qt-badge small{display:block;font-size:10px;opacity:.7;margin-top:2px}' +
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
    else { add(new THREE.IcosahedronGeometry(.5, 1), M(0x9bdcf0, { flatShading: true })); }
    return G;
  }
  /* 道具ごとの見せ方：carve は斜め上から、7 色の帯と目盛りの面が見える角度で、明るく（2026-11-28） */
  function view(id, w) {
    if (id === 'carve') {
      var inner = w.children[0]; inner.rotation.x = .32; w.userData.wobble = .55;   /* 正面の 7 色の帯が見える向きのまま、斜め上から少しだけ揺らす */
      w.traverse(function (m) { if (m.isMesh) [].concat(m.material).forEach(function (x) { var n = x.name || ''; if (/smoke|glow/.test(n)) { x.transparent = true; x.opacity = .12; x.transmission = 0; x.depthWrite = false; } else if (/band/.test(n) && x.emissive) { x.emissive.copy(x.color); x.emissiveIntensity = .8; } else if (x.color) { x.color.multiplyScalar(2.2); } }); });   /* 覆いのガラスを薄く、7 色の帯を光らせ、本体を明るく */
    }
    return w;
  }
  function fit(o) { var b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = 1.55 / Math.max(s.x, s.y, s.z, 1e-3); o.position.sub(c.multiplyScalar(k)); o.scale.multiplyScalar(k); var w = new THREE.Group(); w.add(o); return w; }
  function model(id) {
    if (models[id]) return models[id];
    return models[id] = three().then(function () {
      var u = (O.models || {})[id];   // 置き場は呼ぶ側の表で決める（本番の 3D が届いたら、表の道のりを差し替えるだけ）
      if (!u) return fit(fallback(id));
      return loader.loadAsync(u).then(function (gl) { return view(id, fit(gl.scene)); }, function () { return fit(fallback(id)); });
    });
  }
  function stage() {
    if (rr) return rr;
    var r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(256, 256, false); r.setClearColor(0, 0); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.7;
    var sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, .1, 20); cam.position.set(0, .35, 2.7);   // 道具を大きく（2026-11-28 本人） cam.lookAt(0, 0, 0);
    sc.add(new THREE.HemisphereLight(0xf2fafa, 0x6a5a48, 3.2)); var dl = new THREE.DirectionalLight(0xffffff, 3); dl.position.set(2, 3, 2.5); sc.add(dl); var rim = new THREE.DirectionalLight(0xbfe8f4, 2.6); rim.position.set(-2.5, 1.5, -2); sc.add(rim); sc.add(new THREE.AmbientLight(0xffffff, .8));   // 暗い道具も形が分かるように、正面と輪郭に光
    return rr = { r: r, sc: sc, cam: cam };
  }
  function draw(o, cv, ang) {
    var S = stage(); S.sc.add(o); o.rotation.y = o.userData.wobble ? Math.sin(ang) * o.userData.wobble : ang; S.r.render(S.sc, S.cam); S.sc.remove(o);
    var c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(S.r.domElement, 0, 0, cv.width, cv.height);
  }
  /* ── 使っている道具の札（左上・押すと帯がひらく） ── */
  function showBadge(it) {
    cancelAnimationFrame(live); badge.classList.toggle('on', !!it); if (!it) return;
    badge.querySelector('b').firstChild.nodeValue = it.id; badge.querySelector('small').textContent = '';
    var cv = badge.querySelector('canvas'), t0 = performance.now(), last = 0;
    model(it.id).then(function (o) {
      (function spin(t) { if (cur !== it) return; live = requestAnimationFrame(spin); if (t - last < 66) return; last = t; draw(o, cv, (t - t0) / 1600); })(t0);
    });
  }
  /* ── 帯：道具を一つずつ送る。いまの名前は白くはっきり、前後は薄く小さく ── */
  var arrows = {}, dial, bar, pv, xb, its = [], seps = [], pos = 0, target = 0, raf2 = 0, settle = 0, pvSpin = 0;
  function gap() { return innerWidth >= 768 ? 96 : 84; }
  function layout() {
    var n = ALL.length, G = gap();
    its.forEach(function (b, i) {
      var d = i - pos, ad = Math.abs(d), op = ad < .5 ? 1 : ad < 1.5 ? .82 : ad < 2.4 && innerWidth >= 768 ? .58 : 0;   // 端で切れて見える名前は出さない
      b.style.transform = 'translateX(calc(-50% + ' + (d * G) + 'px)) scale(' + (ad < .5 ? 1 : .86) + ')'; b.style.opacity = op; b.style.pointerEvents = op ? 'auto' : 'none';
      b.style.fontWeight = ad < .5 ? 600 : 400; b.classList.toggle('cur', ad < .5);
    });
    if (arrows.l) { arrows.l.disabled = Math.round(pos) <= 0; arrows.r.disabled = Math.round(pos) >= n - 1; }
    seps.forEach(function (m) { m.el.style.left = 'calc(50% + ' + ((m.at - pos) * G) + 'px)'; m.el.style.opacity = Math.abs(m.at - pos) < 3.5 ? 1 : 0; });
    var it = ALL[((Math.round(pos) % n) + n) % n];
    dial.classList.toggle('has', !!cur); dial.classList.toggle('rest', !!cur && cur === it); if (cur === it) requestAnimationFrame(measure);
    if (pv.dataset.id !== it.id) { pv.dataset.id = it.id; pv.querySelector('em').textContent = it.g + (cur === it ? '　·　使用中' : '　·　押して決める'); pv.querySelector('b').textContent = it.id; /* 名前は道具の名前だけ（2026-11-28 本人） */ pv.querySelector('p').textContent = it.d; spinPv(it); }
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
  function openDial(focus) {
    var i = cur ? ALL.indexOf(cur) : 0; pos = target = i; dial.hidden = false; document.body.classList.add('qd-on'); pv.dataset.id = ''; layout();
    requestAnimationFrame(function () { dial.classList.add('on'); measure(); setTimeout(measure, 400); }); if (focus) bar.focus({ preventScroll: true });   // 起動のときは森を歩く矢印のキーを奪わない
  }
  function measure() { if (!dial || dial.hidden) return; var r = dial.getBoundingClientRect(); document.documentElement.style.setProperty('--qsh', Math.round(r.height) + 'px'); document.documentElement.style.setProperty('--qsb', Math.round(innerHeight - r.bottom) + 'px'); }
  function closeDial() { dial.classList.remove('on'); document.body.classList.remove('qd-on'); setTimeout(function () { if (!dial.classList.contains('on')) { dial.hidden = true; cancelAnimationFrame(pvSpin); } }, 320); }
  function buildDial() {
    dial = document.createElement('div'); dial.className = 'qs'; dial.hidden = true; dial.setAttribute('role', 'dialog'); dial.setAttribute('aria-label', '道具をえらぶ');
    pv = document.createElement('div'); pv.className = 'qs-pv'; pv.setAttribute('aria-live', 'polite'); pv.innerHTML = '<canvas width="256" height="256" aria-hidden="true"></canvas><div><em></em><b></b><p></p></div>'; dial.appendChild(pv);
    bar = document.createElement('div'); bar.className = 'qs-bar'; bar.tabIndex = 0; bar.setAttribute('aria-label', '道具の帯：左右に送って選ぶ'); dial.appendChild(bar);
    var prevG = null;
    ALL.forEach(function (it, i) {
      if (prevG && prevG !== it.g) { var m = document.createElement('i'); m.className = 'qs-sep'; m.innerHTML = '<b title="感覚をひらく">P 感覚</b><s title="世界を切り分け直す">M 意味</s>'; bar.appendChild(m); seps.push({ el: m, at: i - .5 }); }
      prevG = it.g;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'qs-n'; b.textContent = it.id; b.setAttribute('aria-label', it.id);
      b.onclick = function () { if (moved) return; if (Math.round(pos) === i) pick(it); else go(i); };   // 決めても帯は閉じない（2026-11-28 本人「出したままに」）
      its.push(b); bar.appendChild(b);
    });
    var dot = document.createElement('i'); dot.className = 'qs-dot'; bar.appendChild(dot);
    /* スマホ：帯の両端の矢印（ほかの道具があると分かるように） */
    ['l', 'r'].forEach(function (k) { var a = document.createElement('button'); a.type = 'button'; a.className = 'qs-ar ' + k; a.textContent = k === 'l' ? '‹' : '›'; a.setAttribute('aria-label', k === 'l' ? '前の道具へ' : '次の道具へ'); a.onclick = function () { go(Math.round(target) + (k === 'l' ? -1 : 1)); }; dial.appendChild(a); arrows[k] = a; });
    xb = document.createElement('button'); xb.type = 'button'; xb.className = 'qs-x'; xb.textContent = '✕'; xb.setAttribute('aria-label', '道具をはずす'); xb.onclick = function () { pick(null); }; pv.appendChild(xb);
    document.body.appendChild(dial);
    var dr = null, moved = false;
    bar.addEventListener('pointerdown', function (e) { dr = { x: e.clientX, p: target }; moved = false; });
    addEventListener('pointermove', function (e) { if (!dr) return; var dx = e.clientX - dr.x; if (Math.abs(dx) > 6) moved = true; target = Math.max(-.4, Math.min(ALL.length - .6, dr.p - dx / gap())); if (!raf2) raf2 = requestAnimationFrame(tick); });
    addEventListener('pointerup', function () { if (!dr) return; dr = null; if (moved) go(Math.round(target)); setTimeout(function () { moved = false; }, 0); });
    bar.addEventListener('wheel', function (e) { e.preventDefault(); go(Math.round(target) + (e.deltaY + e.deltaX > 0 ? 1 : -1)); }, { passive: false });
    dial.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(Math.round(target) + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(Math.round(target) - 1); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { pick(ALL[Math.round(target)]); e.preventDefault(); }
      else if (e.key === 'Escape') pick(null);
    });
    addEventListener('resize', function () { if (!dial.hidden) { layout(); measure(); } });
  }
  function pick(it) {
    if (pv) { pv.dataset.id = ''; if (it) { target = pos = ALL.indexOf(it); } setTimeout(function () { if (dial && !dial.hidden) { layout(); measure(); } }, 0); }
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
    box.onclick = function () { closeDrawer(); setTimeout(function () { openDial(true); }, 200); };
    badge = document.createElement('div'); badge.className = 'qt-badge'; badge.setAttribute('role', 'status');
    badge.innerHTML = '<canvas width="152" height="152" aria-hidden="true"></canvas><div><b>&nbsp;</b><small></small></div><button type="button" aria-label="道具をはずす">✕</button>';
    badge.querySelector('button').onclick = function (e) { e.stopPropagation(); pick(null); };
    badge.onclick = function () { openDial(true); };
    document.body.appendChild(badge);
    buildDial();
    function put() { var d = document.querySelector(o.drawer); if (d && !d.contains(box)) d.insertBefore(box, d.firstChild); }
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest(o.menu)) { put(); setTimeout(put, 0); setTimeout(put, 120); } }, true);
    /* ?lens=sight など：その道具を選んだ状態で始める */
    var q = (new URLSearchParams(location.search)).get('lens') || '';
    var it = ALL.filter(function (x) { return x.id === q || x.lens === q || 'm-' + x.id === q || (q === 'touch-ground' && x.id === 'touch'); })[0];
    var n = 0; (function w() { var u = g.__um; if (!u || !u.renderer || !u.camera || !g.__muBoot) { if (n++ < 400) setTimeout(w, 100); return; } if (it) pick(it); openDial(false); if (innerWidth < 768 && u.me && u.me.pitch > -.2) u.me.pitch = -.24; })();   /* スマホは目線を少し下げ、碧が帯と札の上に見えるように */   // 帯は出したまま（2026-11-28 本人）
  }
  g.QTools = { mount: mount, groups: GROUPS, open: function () { openDial(true); }, close: function () { closeDial(); }, pick: function (id) { pick(ALL.filter(function (x) { return x.id === id; })[0] || null); }, current: function () { return cur && cur.id; } };
})(window);
