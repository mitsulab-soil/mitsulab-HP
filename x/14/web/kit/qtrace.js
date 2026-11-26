/* Qualia/omiya・kawagoe・shibuya 共通：痕跡（スティグマジー）2026-11-26
   設計＝01_経営/01_経営/03_資料/痕跡の設計_スティグマジー_2026-11-26.md。部品＝_共通3D/qfunc/trace.js（Trace.create を使うだけ）。
   ・歩いた道筋＝3 m の升目から升目へ、細い淡い帯でつなぐ。何度も歩くと濃くなる（上限あり）。
   ・生き物の目に切りかえた所（body.iki）＝淡い紫の輪（音の波の金と分ける）、6 秒立ち止まった所＝白い輪。どれも半減期 3 日で薄れる。
   ・前に残した痕跡は前方にも見え、近づくと少し濃く浮かぶ。踏むと軽い振動と小さな音（8 秒に 1 回まで）。
   ・位置はアプリの中の座標（m）を升目に丸めたものだけ。時刻は 1 時間に丸める。端末の localStorage だけで、送らない。
   ・地面すれすれに加算の淡いにじみで重ねる（景色を遮らない）。描画は 1 回（InstancedMesh）。
   使い方：<script src="web/kit/trace.js?v=1" defer></script><script src="web/kit/qtrace.js?v=1" defer></script> */
(function () {
  if (!window.Trace) return;
  var WID = (innerWidth < 700 ? 0.8 : 1), CELL = 3, MAX = 400, site = (location.pathname.match(/x\/(\d+)/) || [0, 'q'])[1];
  var T = Trace.create({ key: 'qsite' + site + '.trace', halfLife: 3 * 864e5, cap: 4, max: MAX });
  var seq = 0, lastXZ = null, sm = null, THREE, mesh, ring, q, lastCell = null, stayT = 0, stayDone = false, iki = false, dirty = true, tB = 0, tS = 0;
  var COL = { walk: [0.45, 0.95, 1.0], eye: [0.72, 0.45, 1.0], stop: [0.95, 0.97, 1.0] };
  var RAD = { walk: 1.5, eye: 2.6, stop: 1.9 };

  function tex(ring) {
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
    if (ring) { var rg = x.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,.35)'); rg.addColorStop(.55, 'rgba(255,255,255,.15)'); rg.addColorStop(.75, 'rgba(255,255,255,1)'); rg.addColorStop(.88, 'rgba(255,255,255,.25)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 64, 64); }
    else { var g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.18, 'rgba(255,255,255,.12)'); g.addColorStop(.36, 'rgba(255,255,255,.6)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(.64, 'rgba(255,255,255,.6)'); g.addColorStop(.82, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
    return new THREE.CanvasTexture(c);
  }
  function inst(ring, op) {
    var geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshBasicMaterial({ map: tex(ring), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op, fog: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    var m = new THREE.InstancedMesh(geo, mat, MAX); m.count = 0; m.frustumCulled = false; m.renderOrder = 5; m.name = 'qtrace';
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3); (q.scene || q.world).add(m); return m;
  }
  /* 渋谷は立ち止まると地面の上 0.3 m に融合の層（fusion）が出て帯を覆うため、帯をその上に置く（2026-11-26） */
  /* 2026-11-26 第 2 版：歩いた点を Catmull-Rom の一本の帯に（升目どうしの直線はやめた）。幅はそろえ、ふちは柔らかく。スマホは濃く。渋谷は川の層より上に描く */
  var MOB = innerWidth < 700, MAXV = 6000, band, bP, bC, bU;
  function make() {
    var sb = site === '14';
    if (sb) COL.walk = [0.62, 0.5, 0.95];
    var geo = new THREE.BufferGeometry(); bP = new Float32Array(MAXV * 3); bC = new Float32Array(MAXV * 3); bU = new Float32Array(MAXV * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(bP, 3)); geo.setAttribute('color', new THREE.BufferAttribute(bC, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(bU, 2));
    var idx = new Uint16Array((MAXV / 2 - 1) * 6); for (var i = 0, j = 0; i < MAXV / 2 - 1; i++) { var a = i * 2; idx[j++] = a; idx[j++] = a + 1; idx[j++] = a + 2; idx[j++] = a + 1; idx[j++] = a + 3; idx[j++] = a + 2; }
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.setDrawRange(0, 0);
    var op = (MOB ? .6 : .55) * (sb ? .85 : 1);
    var mat = new THREE.MeshBasicMaterial({ map: tex(false), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op, fog: true, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    band = new THREE.Mesh(geo, mat); band.frustumCulled = false; band.renderOrder = sb ? 60 : 5; band.name = 'qtrace-band'; (q.scene || q.world).add(band);
    mesh = band; ring = inst(true, .95); if (sb) ring.renderOrder = 61;
    WID = (MOB ? 0.95 : 0.9) * (sb ? 1.1 : 1);
  }
  function gy(x, z, fb) {
    try { var y = q.groundAt ? q.groundAt(x, z) : (q.surfAt ? q.surfAt(x, z) : null); if (typeof y === 'object' && y) y = y.y; if (isFinite(y)) return y; } catch (e) {}
    return fb;
  }
  function rebuild() {
    var L = T.all(), oMax = 1, C = q.camera.position, m = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3(), r = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), n = 0, nr = 0;
    L.sort(function (a, b) { return b.w - a.w; }); L.forEach(function (e) { if (e.m && e.m.o > oMax) oMax = e.m.o; });
    for (var i = 0; i < L.length; i++) {
      var e = L[i], M = e.m; if (!M || !isFinite(M.x) || Math.hypot(M.x - C.x, M.z - C.z) < 3.5) continue;
      var dc = Math.hypot(M.x - C.x, M.z - C.z), old = (oMax - ((M.o) || 0)) > 8, near = Math.min(1, Math.max(0, (dc - 3.5) / 6)) * (old && dc > 3 && dc < 14 ? 1.45 : 1), k = Math.min(1, e.w / T.cap), c = COL[M.k] || COL.walk, a = near * (0.3 + 0.7 * k) * (0.5 + 0.5 * Math.max(0, 1 - (oMax - ((e.m && e.m.o) || 0)) / 60)), y = (isFinite(M.y) ? M.y : 0) + (site === '14' ? 0.42 : 0.18);
      if (M.k === 'walk') { continue;
      } else {
        if (nr >= MAX) continue; var R = M.k === 'eye' ? 1.0 : 0.65;
        p.set(M.x, y + .02, M.z); r.identity(); s.set(R * 2, 1, R * 2); m.compose(p, r, s); ring.setMatrixAt(nr, m); ring.instanceColor.setXYZ(nr, c[0] * a, c[1] * a, c[2] * a); nr++;
      }
    }
    ring.count = nr; ring.instanceMatrix.needsUpdate = true; ring.instanceColor.needsUpdate = true; buildBand(L, oMax, C); dirty = false;
  }
  /* 歩いた順（o）に並べ、つながる所は一本の鎖にして Catmull-Rom でなめらかに。色＝濃さ（加算なので黒は透明） */
  function buildBand(L, oMax, C) {
    var W = L.filter(function (e) { return e.m && e.m.k === 'walk' && isFinite(e.m.px); }).sort(function (a, b) { return a.m.o - b.m.o; });
    var chains = [], cur = null, prev = null, oy = site === '14' ? 0.42 : 0.3, c = COL.walk;
    W.forEach(function (e) {
      var M = e.m, len = Math.hypot(M.x - M.px, M.z - M.pz); if (len < .5 || len > 12) { cur = null; prev = null; return; }
      var y = (isFinite(M.y) ? M.y : 0) + oy, w = Math.min(1, e.w / T.cap), age = 0.5 + 0.5 * Math.max(0, 1 - (oMax - (M.o || 0)) / 60), a = (0.35 + 0.65 * w) * age;
      if (!cur || !prev || Math.hypot(M.px - prev.x, M.pz - prev.z) > 2.5) { cur = [{ x: M.px, z: M.pz, y: y, a: a }]; chains.push(cur); }
      var lp = cur[cur.length - 1]; if (cur.length > 1 && Math.hypot(M.x - lp.x, M.z - lp.z) < 4.5) { lp.a = Math.max(lp.a, a); prev = M; return; }   /* 点を間引いて蛇行を抑える */
      cur.push({ x: M.x, z: M.z, y: y, a: a }); prev = M;
    });
    var v = 0, hw = WID / 2;
    function cr(p0, p1, p2, p3, t, k) { var t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3); }
    chains.forEach(function (ch) {
      if (ch.length < 2 || v >= MAXV - 4) return;
      var S = [];
      for (var i = 0; i < ch.length - 1; i++) {
        var p0 = ch[Math.max(0, i - 1)], p1 = ch[i], p2 = ch[i + 1], p3 = ch[Math.min(ch.length - 1, i + 2)], n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / 0.5));
        for (var j = (i ? 1 : 0); j <= n; j++) { var t = j / n; S.push({ x: cr(p0, p1, p2, p3, t, 'x'), z: cr(p0, p1, p2, p3, t, 'z'), y: p1.y + (p2.y - p1.y) * t, a: p1.a + (p2.a - p1.a) * t }); }
      }
            for (var s = 0; s < S.length && v < MAXV - 2; s++) {
        var A = S[Math.max(0, s - 1)], B = S[Math.min(S.length - 1, s + 1)], tx = B.x - A.x, tz = B.z - A.z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl, P = S[s];
        var dc = Math.hypot(P.x - C.x, P.z - C.z), f = Math.min(1, Math.max(0, (dc - 2.2) / 4.5)), end = Math.min(1, s / 4, (S.length - 1 - s) / 4), al = P.a * f * end;
        for (var side = 0; side < 2; side++) { var sg = side ? 1 : -1, o = v * 3; bP[o] = P.x + nx * hw * sg; bP[o + 1] = P.y; bP[o + 2] = P.z + nz * hw * sg; bC[o] = c[0] * al; bC[o + 1] = c[1] * al; bC[o + 2] = c[2] * al; bU[v * 2] = side; bU[v * 2 + 1] = s * 0.1; v++; }
      }
      /* 鎖の両端は濃さ 0 にしてあるので、次の鎖へつなぐ面は黒＝加算で見えない */
    });
    var g = band.geometry; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.uv.needsUpdate = true; g.setDrawRange(0, Math.max(0, (v / 2 - 1) * 6));
  }
  function put(kind, x, z, y, amt, from) {
    var cx = Math.round(x / CELL), cz = Math.round(z / CELL), meta = { x: cx * CELL, z: cz * CELL, y: Math.round(gy(cx * CELL, cz * CELL, y) * 10) / 10, k: kind, o: ++seq }, id = kind + ':' + cx + ',' + cz;
    if (from) { meta.x = Math.round(x); meta.z = Math.round(z); meta.px = from[0]; meta.pz = from[1]; id += '<' + Math.round(from[0] / CELL) + ',' + Math.round(from[1] / CELL); }
    T.put(id, amt, meta); dirty = true;
  }
  /* 前に残した痕跡に近づいたら、軽い振動と小さな音で気づかせる（8 秒に 1 回まで。音は操作のあとだけ） */
  var ac = null, tCue = 0;
  addEventListener('pointerdown', function () { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume && ac.resume(); } catch (e) {} }, { once: true, passive: true });
  function cue(hi) {
    var t = performance.now(); if (t - tCue < 8000) return; tCue = t;
    try { navigator.vibrate && navigator.vibrate(hi ? [10, 60, 10] : 12); } catch (e) {}
    try { if (!ac || ac.state !== 'running') return; var o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime; o.type = 'sine'; o.frequency.value = hi ? 1046 : 784; g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(.035, n + .02); g.gain.exponentialRampToValueAtTime(.0005, n + .5); o.connect(g).connect(ac.destination); o.start(n); o.stop(n + .55); } catch (e) {}
  }
  /* はじめの一回だけ「前に歩いた跡」と 1 行で知らせる（端末に一度出したかを覚えるだけ） */
  var hinted = false; try { hinted = localStorage.getItem('qtrace.hinted') === '1'; } catch (e) {}
  function hint() {
    if (hinted) return; hinted = true; try { localStorage.setItem('qtrace.hinted', '1'); } catch (e) {}
    var d = document.createElement('div'); d.id = 'qTraceHint'; d.textContent = '前に歩いた跡';
    d.style.cssText = "position:fixed;left:50%;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 168px);transform:translateX(-50%);z-index:30;pointer-events:none;white-space:nowrap;padding:4px 12px;border-radius:2px;background:rgba(6,12,18,.66);color:#eef4f6;font:500 13px/1.5 'Shippori Mincho B1','Hiragino Mincho ProN',serif;letter-spacing:.08em;opacity:0;transition:opacity .6s";
    document.body.appendChild(d); requestAnimationFrame(function () { d.style.opacity = 1; }); setTimeout(function () { d.style.opacity = 0; setTimeout(function () { d.remove(); }, 800); }, 3200);
  }
  function near(P) {
    var best = null; T.all().forEach(function (e) { var M = e.m; if (!M || seq - (M.o || 0) <= 8) return; var d = Math.hypot(M.x - P.x, M.z - P.z); if (d < (M.k === 'walk' ? 2 : 3.5) && (!best || M.k !== 'walk')) best = M; });
    if (best) { cue(best.k !== 'walk'); hint(); }
  }
  function tick() {
    var now = performance.now(), walk = q.mode === 'walk' && !document.hidden;
    if (mesh) mesh.visible = ring.visible = q.mode === 'walk';
    if (walk && now - tS > 400) {
      var dt = tS ? now - tS : 0; tS = now;
      var A = q.AOI, P = (A && A.position && A.position.isVector3) ? A.position : (A && A.root && A.root.position) ? A.root.position : (A && A.pos && A.pos.isVector3) ? A.pos : q.camera.position;
      var foot = P === q.camera.position ? P.y - 1.6 : P.y; sm = sm ? { x: sm.x * .75 + P.x * .25, z: sm.z * .75 + P.z * .25 } : { x: P.x, z: P.z };
      var cell = Math.round(P.x / CELL) + ',' + Math.round(P.z / CELL);
      if (cell !== lastCell) { near(P); if (lastCell !== null && lastXZ) put('walk', sm.x, sm.z, foot, 0.6, lastXZ); } if (cell !== lastCell) { lastCell = cell; lastXZ = [Math.round(sm.x), Math.round(sm.z)]; stayT = 0; stayDone = false; }
      else { stayT += dt; if (!stayDone && stayT > 6000) { stayDone = true; put('stop', P.x, P.z, foot, 1); } }
      var ik = document.body.classList.contains('iki') || document.documentElement.classList.contains('iki');
      if (ik && !iki) put('eye', P.x, P.z, foot, 1.5); iki = ik;
    }
    if ((dirty || walk) && now - tB > 700) { tB = now; rebuild(); }
    requestAnimationFrame(tick);
  }
  var h = setInterval(function () {
    q = window.__qw; if (!q || !q.ready || !q.camera || !(q.scene || q.world)) return; clearInterval(h);
    T.all().forEach(function (e) { if (e.m && e.m.o > seq) seq = e.m.o; }); (q.THREE ? Promise.resolve(q.THREE) : import('three')).then(function (m) { THREE = m; make(); rebuild(); requestAnimationFrame(tick); }).catch(function () {});
  }, 500);
})();
