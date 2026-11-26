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
    else { var g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(20,60,80,0)'); g.addColorStop(.22, 'rgba(20,60,80,.75)'); g.addColorStop(.38, 'rgba(255,255,255,.95)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(.62, 'rgba(255,255,255,.95)'); g.addColorStop(.78, 'rgba(20,60,80,.75)'); g.addColorStop(1, 'rgba(20,60,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
    return new THREE.CanvasTexture(c);
  }
  function inst(ring, op) {
    var geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshBasicMaterial({ map: tex(ring), transparent: true, depthWrite: false, opacity: op, fog: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    var m = new THREE.InstancedMesh(geo, mat, MAX); m.count = 0; m.frustumCulled = false; m.renderOrder = 2; m.name = 'qtrace';
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3); (q.scene || q.world).add(m); return m;
  }
  function make() { var dark = site === '14'; mesh = inst(false, dark ? .4 : .6); ring = inst(true, .95); if (dark) WID *= .8; }
  function gy(x, z, fb) {
    try { var y = q.groundAt ? q.groundAt(x, z) : (q.surfAt ? q.surfAt(x, z) : null); if (typeof y === 'object' && y) y = y.y; if (isFinite(y)) return y; } catch (e) {}
    return fb;
  }
  function rebuild() {
    var L = T.all(), oMax = 1, C = q.camera.position, m = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3(), r = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), n = 0, nr = 0;
    L.sort(function (a, b) { return b.w - a.w; }); L.forEach(function (e) { if (e.m && e.m.o > oMax) oMax = e.m.o; });
    for (var i = 0; i < L.length; i++) {
      var e = L[i], M = e.m; if (!M || !isFinite(M.x)) continue;
      var dc = Math.hypot(M.x - C.x, M.z - C.z), old = (oMax - ((M.o) || 0)) > 8, near = Math.min(1, Math.max(0.25, (dc - 2) / 7)) * (old && dc > 3 && dc < 14 ? 1.45 : 1), k = Math.min(1, e.w / T.cap), c = COL[M.k] || COL.walk, a = near * (0.3 + 0.7 * k) * (0.5 + 0.5 * Math.max(0, 1 - (oMax - ((e.m && e.m.o) || 0)) / 60)), y = (isFinite(M.y) ? M.y : 0) + 0.18;
      if (M.k === 'walk') {
        if (n >= MAX || !isFinite(M.px)) continue;
        var dx = M.x - M.px, dz = M.z - M.pz, len = Math.hypot(dx, dz); if (len < .5 || len > 12) continue;
        p.set((M.x + M.px) / 2, y, (M.z + M.pz) / 2); r.setFromAxisAngle(up, Math.atan2(dx, dz)); s.set((0.5 + 0.25 * k) * WID, 1, len + 0.4);
        m.compose(p, r, s); mesh.setMatrixAt(n, m); mesh.instanceColor.setXYZ(n, c[0] * a, c[1] * a, c[2] * a); n++;
      } else {
        if (nr >= MAX) continue; var R = M.k === 'eye' ? 1.0 : 0.65;
        p.set(M.x, y + .02, M.z); r.identity(); s.set(R * 2, 1, R * 2); m.compose(p, r, s); ring.setMatrixAt(nr, m); ring.instanceColor.setXYZ(nr, c[0] * a, c[1] * a, c[2] * a); nr++;
      }
    }
    mesh.count = n; ring.count = nr; [mesh, ring].forEach(function (o) { o.instanceMatrix.needsUpdate = true; o.instanceColor.needsUpdate = true; }); dirty = false;
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
  function near(P) {
    var best = null; T.all().forEach(function (e) { var M = e.m; if (!M || seq - (M.o || 0) <= 8) return; var d = Math.hypot(M.x - P.x, M.z - P.z); if (d < (M.k === 'walk' ? 2 : 3.5) && (!best || M.k !== 'walk')) best = M; });
    if (best) cue(best.k !== 'walk');
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
