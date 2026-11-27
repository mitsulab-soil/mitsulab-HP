/* lens-n.js ── N（物語）のレンズ「絵の生き物」（2026-11-27）
   額の形の小さな枠の絵から燕が抜け出し、その場の 3D の景色に重なって飛ぶ。
   絵＝歌川広重《桜に燕》（シカゴ美術館・CC0／パブリックドメイン https://www.artic.edu/artworks/25873）。切り抜きは Qualia/museum と同じ。
   体＝Qualia/museum の creatures3d.js（画面の中で組む立体・外の 3D データなし）をそのまま読む。大きさは実寸（体長 約 17 cm）。
   AR の道具でも ctx に renderer・scene・camera を渡せば同じように重なる。 */
(function () {
  var CREDIT = '絵：歌川広重《桜に燕》（1830年代・シカゴ美術館所蔵・CC0＝パブリックドメイン https://www.artic.edu/artworks/25873）。燕の体は Qualia/museum と同じ、画面の中で組んだ模式の立体。';
  QLens.define({ id: 'n-tsubame', make: function () {
    var frame, bird, raf = 0, on = true, cam, scene, t0 = 0, last = 0, pos, vel, ctr, cr, own = null;
    function abs(p) { return new URL(QLens.base() + p, document.baseURI).href; }
    function showFrame() {
      frame = document.createElement('figure');
      frame.setAttribute('aria-label', '歌川広重《桜に燕》');
      frame.style.cssText = 'position:fixed;right:16px;top:calc(env(safe-area-inset-top,0px) + 56px);z-index:30;margin:0;width:86px;height:242px;padding:6px;background:#2a2118;border:1px solid #8a6d45;box-shadow:0 6px 18px rgba(0,0,0,.45),inset 0 0 0 2px #4a3a26;pointer-events:none;opacity:0;transition:opacity .5s';
      frame.innerHTML = '<div style="position:relative;width:100%;height:100%;overflow:hidden;background:#d8cdb4"><img alt="" src="' + abs('n/e_empty.jpg') + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><img alt="" src="' + abs('n/e_full.jpg') + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity .9s"></div>';
      document.body.appendChild(frame); requestAnimationFrame(function () { frame.style.opacity = 1; });
      cr = document.createElement('p'); cr.className = 'qlens-credit'; cr.innerHTML = '絵：歌川広重《桜に燕》1830年代・<a href="https://www.artic.edu/artworks/25873" target="_blank" rel="noopener" style="color:inherit">シカゴ美術館</a>所蔵・CC0（パブリックドメイン）。燕の体は Qualia/museum と同じ、画面の中で組んだ模式。';
      cr.style.cssText = 'display:block;margin:10px 0 0;font-size:11px!important;line-height:1.6!important;opacity:.78';
      var box = document.querySelector('.qlens'); if (box) box.appendChild(cr);
    }
    /* 枠の位置から、カメラの前の 3D の一点へ（画面の左下の方向・1.2 m 先） */
    function startPoint(THREE) {
      var r = frame.getBoundingClientRect(), x = (r.left + r.width / 2) / innerWidth * 2 - 1, y = -((r.top + r.height * .25) / innerHeight * 2 - 1);
      var v = new THREE.Vector3(x, y, .5).unproject(cam).sub(cam.position).normalize();
      return cam.position.clone().add(v.multiplyScalar(.9));
    }
    function loop(THREE) {
      if (!on) return; raf = requestAnimationFrame(function () { loop(THREE); });
      if (own) { var W = innerWidth, H = innerHeight; if (own.w !== W || own.h !== H) { own.w = W; own.h = H; own.r.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); } }
      var now = performance.now() / 1000, dt = Math.min(.05, now - last); last = now; var t = now - t0;
      var e = cam.matrixWorld.elements, fwd = new THREE.Vector3(-e[8], 0, -e[10]).normalize();
      var port = innerWidth < innerHeight, want = cam.position.clone().add(fwd.clone().multiplyScalar(port ? 2.8 : 2.4)); want.y = cam.position.y + .25;
      ctr.lerp(want, Math.min(1, dt * .6));   // 歩く人の前の空に、ゆるくついてくる
      // 燕の飛び方：速く、はばたきと長い滑空、上下に大きく弧（museum の swallow と同じ型を景色の中で）
      var nar = port ? .55 : 1, a = t * 1.1, R = (1.1 + .35 * Math.sin(t * .37)) * nar;   // 見る人の 2〜3 m 先＝木や建物の陰に入りにくい。縦長の画面は輪を小さく
      var tgt = new THREE.Vector3(ctr.x + Math.cos(a) * R, ctr.y + .35 * Math.sin(t * 1.3) + .2 * Math.sin(t * .5), ctr.z + Math.sin(a) * R * .8);
      var sw = (t - 1.2) % 9;   // 見せ場：抜け出てすぐと 9 秒ごとに、目の前 1 m をかすめて飛ぶ（大きさは実寸のまま、近さで見せる）
      if (t < 1.2 || sw < 1.4) { var side = new THREE.Vector3(e[0], 0, e[2]).normalize().multiplyScalar(t < 1.2 ? .15 : .35 * Math.sin(t)); tgt = cam.position.clone().add(fwd.clone().multiplyScalar(1.0)).add(side); tgt.y = cam.position.y - .05; }
      var k = Math.min(1, t / 1.6);   // 抜け出てからの 1.6 秒は、枠のそばから飛び立つ
      var desired = tgt.sub(pos).multiplyScalar(k < 1 ? 1.8 : 1.2);
      vel.lerp(desired, Math.min(1, dt * (k < 1 ? 2.5 : 1.8)));
      var sp = vel.length(); if (sp > 5) vel.multiplyScalar(5 / sp);   // ツバメの巡航はおよそ 6〜10 m/秒
      pos.addScaledVector(vel, dt);
      bird.G.position.copy(pos); bird.G.lookAt(pos.clone().add(vel));
      bird.G.rotateZ(-Math.max(-.7, Math.min(.7, vel.x * .04)));
      bird.update({ t: t, ph: t < .9 ? 0 : 2, pt: t, spd: vel.length(), L: .17, look: 0 });
      if (own) own.r.render(scene, cam);
    }
    return {
      apply: function (c) {
        cam = c.camera; scene = c.scene; showFrame();
        var cap = document.createElement('figcaption'); cap.textContent = '広重《桜に燕》から、一羽'; cap.style.cssText = 'position:absolute;right:0;top:100%;margin-top:6px;white-space:nowrap;font:500 12px/1.4 "Shippori Mincho",serif;color:#f3ead8;background:rgba(10,14,16,.62);padding:3px 8px;border-radius:4px;letter-spacing:.04em'; frame.appendChild(cap);   // 字幕は道具の語りに上書きされるので、額の下に添える
        var useOwn = !cam || !scene;   // AR（カメラの景色）など、3D の場を持たない画面では、透ける層を一枚かさねて、その中で飛ばす
        Promise.all([import('three'), import(abs('n/creatures3d.js'))]).then(function (m) {
          if (!on) return; var THREE = m[0]; window.__qlensN = 'ok';
          if (useOwn) {
            var r = new THREE.WebGLRenderer({ alpha: true, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setClearColor(0, 0);
            r.domElement.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:31';   // 額（30）の手前を飛ぶ
            document.body.appendChild(r.domElement); own = { r: r, w: 0, h: 0 };
            scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xdfe9f3, 0x6b5a45, 1.6)); var dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(2, 4, 3); scene.add(dl);
            cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .05, 100); cam.position.set(0, 1.5, 0); cam.updateMatrixWorld();
          }
          bird = m[1].createCreatures(THREE).make('swallow');
          bird.G.scale.setScalar(.17);           // 体長 約 17 cm（ツバメの実寸）
          pos = startPoint(THREE); vel = new THREE.Vector3(0, .6, 0); ctr = pos.clone();
          bird.G.position.copy(pos); scene.add(bird.G); window.__qlensN = { g: bird.G, cam: cam };
          var full = frame.querySelectorAll('img')[1]; if (full) full.style.opacity = 0;   // 絵から燕が一羽消える（抜けた跡は元の画の紙の色で埋めた画）
          frame.animate([{ boxShadow: '0 0 0 0 rgba(255,236,190,0), 0 6px 18px rgba(0,0,0,.45)' }, { boxShadow: '0 0 22px 6px rgba(255,236,190,.75), 0 6px 18px rgba(0,0,0,.45)' }, { boxShadow: '0 0 0 0 rgba(255,236,190,0), 0 6px 18px rgba(0,0,0,.45)' }], { duration: 1400, easing: 'ease-out' });
          t0 = last = performance.now() / 1000; loop(THREE);
        }).catch(function (e) { window.__qlensN = String(e); console.warn('lens-n', e); });
      },
      dispose: function () {
        on = false; cancelAnimationFrame(raf);
        if (bird) { scene.remove(bird.G); bird.G.traverse(function (m) { if (m.isMesh) { m.geometry.dispose(); [].concat(m.material).forEach(function (x) { x.dispose(); }); } }); }
        if (frame) frame.remove(); if (cr) cr.remove();
        if (own) { own.r.dispose(); own.r.domElement.remove(); }
      }
    };
  } });
})();
