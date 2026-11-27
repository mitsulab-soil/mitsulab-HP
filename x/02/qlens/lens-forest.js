/* lens-forest.js ── はじまりの森（sight）の中で「生き物の目」を選ぶレンズ（2026-11-27）
   sight そのものの切りかえ（window.__um.setLens）を呼ぶだけ。森の外の道具では何もしない。 */
(function () {
  QLens.define({ id: 'forest-hachi', make: function () {
    return {
      apply: function () { var U = window.__um; if (U && U.setLens) U.setLens('hachi'); },
      dispose: function () { var U = window.__um; if (U && U.setLens && U.lens === 'hachi') U.setLens('hito', true); }
    };
  } });
})();
/* touch（森の中）── 森の物（樹皮・苔・石・土・葉）を押すと、その面に寄ってテクスチャーが大きく広がる。なぞると、その面の明暗の起伏に合わせて振動と音が返る（2026-11-27 本人）。
   面の画は森の 3D の材質（map の写真・頂点の色）をそのまま使う。手ざわりの返し方は、画の明暗の差と材質の粗さから組んだ模式。 */
(function () {
  var KIND = [[/bark/, '樹皮', 1.0], [/rock/, '石', .7], [/soil/, '土', .45], [/leaf/, '葉', .3], [/hinoki|planks/, '木の板', .5], [/gravel|sand/, '砂利', .85]];
  QLens.define({ id: 'touch-forest', make: function () {
    var THREE, ray, U, cv, panel, pc, px, lab, ac, on = true, cur = null, lastV = 0, hint, prevPick;
    function kindOf(hit) {
      var m = [].concat(hit.object.material)[0] || {}, F = (window.__um && window.__um.FOREST) || {}, src = ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap'].map(function (k) { var t = m[k]; return t ? [t.name, t.image && (t.image.currentSrc || t.image.src), t.source && t.source.data && t.source.data.src, t.userData && t.userData.src].join(' ') : ''; }).join(' ');
      if (hit.object === F.ground) src += ' soil';
      else if (m === F.leafMat || m.alphaTest > 0) src += ' leaf';
      else if (!/bark|rock|soil|leaf|hinoki|planks|gravel|sand/.test(src) && m.color) { var h = m.color.getHex(); if (h === 0xd8d2c8 || h === 0xb4aea4) src += ' bark'; else if (h === 0xe2ddd2) src += ' rock'; }
      for (var i = 0; i < KIND.length; i++) if (KIND[i][0].test(src)) {
        var k = { name: KIND[i][1], rough: KIND[i][2], img: m.map.image, color: m.color };
        if (/soil/.test(src) && hit.face && hit.object.geometry.attributes.color) {   // 地面は頂点の色で、苔と土を分ける（forest.js の塗り分けと同じ）
          var c = hit.object.geometry.attributes.color, a = hit.face.a, r = c.getX(a), gg = c.getY(a), b = c.getZ(a);
          if (gg > r * 1.12 && gg > b * 1.4) { k.name = '苔'; k.rough = .25; k.tint = 'rgba(90,140,70,.38)'; }
          k.vc = [r, gg, b];
        }
        return k;
      }
      return m.map && m.map.image ? { name: '面', rough: .5, img: m.map.image, color: m.color } : null;
    }
    function open(hit, k, x, y) {
      cur = { k: k, u: hit.uv ? hit.uv.x : Math.random(), v: hit.uv ? hit.uv.y : Math.random(), rep: (hit.object.material.map && hit.object.material.map.repeat) || { x: 1, y: 1 } };
      lab.textContent = k.name + '　なぞってみてください';
      panel.style.transition = 'none'; panel.style.transformOrigin = x + 'px ' + y + 'px'; panel.style.transform = 'scale(.08)'; panel.style.opacity = 0; panel.hidden = false;
      requestAnimationFrame(function () { panel.style.transition = 'transform .7s cubic-bezier(.2,.8,.2,1), opacity .5s'; panel.style.transform = 'scale(1)'; panel.style.opacity = 1; });
      paint(0, 0);
    }
    function paint(dx, dy) {
      var W = pc.width, H = pc.height, img = cur.k.img, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      var zoom = 2.2, sw = iw / zoom, sh = sw * H / W;
      cur.u = (cur.u - dx / W / zoom + 10) % 1; cur.v = (cur.v + dy / H / zoom * (W / H) + 10) % 1;
      var sx = ((cur.u * cur.rep.x) % 1) * iw - sw / 2, sy = (1 - (cur.v * cur.rep.y) % 1) * ih - sh / 2;
      px.imageSmoothingQuality = 'high';
      // 繰り返しの模様として一枚で塗る（タイルの継ぎ目に段差を出さない）
      var k = W / sw; if (!cur.pat) cur.pat = px.createPattern(img, 'repeat');
      px.setTransform(k, 0, 0, k, -sx * k, -sy * k); px.fillStyle = cur.pat; px.fillRect(sx, sy, sw + 2, sh + 2); px.setTransform(1, 0, 0, 1, 0, 0);
      if (cur.k.vc) { px.globalCompositeOperation = 'multiply'; px.fillStyle = 'rgb(' + cur.k.vc.map(function (v) { return Math.min(255, Math.round(v * 255)); }).join(',') + ')'; px.fillRect(0, 0, W, H); px.globalCompositeOperation = 'source-over'; }
      if (cur.k.tint) { px.fillStyle = cur.k.tint; px.fillRect(0, 0, W, H); }
    }
    function feel(x, y) {   // 指の下の明暗の差＝起伏の手がかり
      var d = px.getImageData(Math.max(0, Math.min(pc.width - 3, x)), Math.max(0, Math.min(pc.height - 3, y)), 3, 3).data, L = [];
      for (var i = 0; i < d.length; i += 4) L.push(d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11);
      var e = Math.abs(L[0] - L[8]) + Math.abs(L[2] - L[6]) + Math.abs(L[1] - L[7]); return Math.min(1, e / 120);
    }
    function grain(e, speed) {
      var t = performance.now(); if (t - lastV < 45) return; lastV = t;
      var r = cur.k.rough, amp = Math.min(1, (.25 + e) * r * (.4 + speed));
      try { navigator.vibrate && navigator.vibrate(Math.round(6 + 26 * amp)); } catch (x) { }
      if (!ac) return; var n = ac.sampleRate * .05, b = ac.createBuffer(1, n, ac.sampleRate), dd = b.getChannelData(0);
      for (var i = 0; i < n; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
      f.type = 'bandpass'; f.frequency.value = 300 + 3200 * r * (.4 + e); f.Q.value = .9; gn.gain.value = .05 + .3 * amp;
      s.buffer = b; s.connect(f); f.connect(gn); gn.connect(ac.destination); s.start();
    }
    function down(e) {
      if (!panel.hidden || !on) return;
      var r = cv.getBoundingClientRect(), m = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(m, U.camera); ray.far = 14;
      var hit = ray.intersectObject(U.forest, true).filter(function (h) { return h.object.visible && h.object.isMesh; })[0]; if (!hit) return;
      var k = kindOf(hit); if (!k || !k.img) return;
      e.stopImmediatePropagation(); e.preventDefault();
      var A = window.AudioContext || window.webkitAudioContext; if (A && !ac) { ac = new A(); } ac && ac.resume && ac.resume();
      open(hit, k, e.clientX, e.clientY); if (hint) { hint.remove(); hint = null; }
    }
    return {
      apply: function (c) {
        U = window.__um; if (!U || !U.renderer) return; cv = U.renderer.domElement;
        panel = document.createElement('div'); panel.hidden = true;
        panel.style.cssText = 'position:fixed;inset:0;z-index:23;background:#0b0f0d;touch-action:none;cursor:crosshair';
        pc = document.createElement('canvas'); pc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
        lab = document.createElement('p'); lab.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 92px);margin:0;padding:6px 14px;border-radius:16px;background:rgba(6,16,18,.62);color:#eef5f2;font:500 14px/1.5 "Shippori Mincho",serif;white-space:nowrap;pointer-events:none';
        var back = document.createElement('button'); back.type = 'button'; back.textContent = '森へ戻る';
        back.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 96px);min-height:44px;padding:0 20px;border:1px solid rgba(170,226,236,.5);border-radius:22px;background:rgba(6,20,22,.62);color:#e9f6f5;font:500 14px "Shippori Mincho",serif';
        back.onclick = function (e) { e.stopPropagation(); panel.style.transform = 'scale(.08)'; panel.style.opacity = 0; setTimeout(function () { panel.hidden = true; }, 500); };
        panel.appendChild(pc); panel.appendChild(lab); panel.appendChild(back); document.body.appendChild(panel);
        function size() { var d = Math.min(devicePixelRatio || 1, 2); pc.width = Math.round(innerWidth * d); pc.height = Math.round(innerHeight * d); if (cur && !panel.hidden) paint(0, 0); }
        size(); addEventListener('resize', size); px = pc.getContext('2d', { willReadFrequently: true });
        var last = null;
        panel.addEventListener('pointerdown', function (e) { if (e.target === back) return; last = { x: e.clientX, y: e.clientY, t: performance.now() }; panel.setPointerCapture && panel.setPointerCapture(e.pointerId); });
        panel.addEventListener('pointermove', function (e) {
          if (!last || !cur) return; var d = Math.min(devicePixelRatio || 1, 2), dx = (e.clientX - last.x) * d, dy = (e.clientY - last.y) * d, t = performance.now();
          var sp = Math.min(1.5, Math.hypot(dx, dy) / Math.max(8, t - last.t)); paint(dx * .5, dy * .5); grain(feel(Math.round(e.clientX * d), Math.round(e.clientY * d)), sp);
          last = { x: e.clientX, y: e.clientY, t: t };
        });
        panel.addEventListener('pointerup', function () { last = null; });
        import('three').then(function (T) { THREE = T; ray = new T.Raycaster(); cv.addEventListener('pointerdown', down, true); });
        hint = document.createElement('p'); hint.textContent = '樹皮・苔・石・土・葉を押すと、その面に寄ります';
        hint.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 96px);z-index:22;margin:0;padding:6px 14px;max-width:calc(100vw - 32px);box-sizing:border-box;text-align:center;border-radius:16px;background:rgba(6,16,18,.62);color:#eef5f2;font:500 13px/1.5 "Shippori Mincho",serif;pointer-events:none';
        document.body.appendChild(hint);
      },
      dispose: function () { on = false; if (cv) cv.removeEventListener('pointerdown', down, true); if (panel) panel.remove(); if (hint) hint.remove(); if (ac) { try { ac.close(); } catch (e) { } } }
    };
  } });
})();
