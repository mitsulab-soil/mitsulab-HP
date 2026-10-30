/* © mitsulab. 空間に漂う Qualia の層（2026-10-30 本人「球の印に触れる形をやめ、空間に漂う Qualia のレイヤー（オーロラ状の層）に触れると、その層の感覚が広がる」
   「環世界 2.0 のオーロラのような層で、かつ、互いに絡まりあっていて関係し合うようなイメージ」）
   ・印のある所（通り・木・水辺・建物のまわり）に、その場の手がかりの層の色の薄い布の帯が漂う。地面から 0.5〜3.2 m。
   ・近い印どうしの帯は、互いの方へ伸びてくぐり合い、交わる所で色が足し合わさる（加算の重ね）。
   ・触れる（押す・PC はカーソルを重ねる・近づく）と、その層が明るく波打ち、絡んでいる層もわずかに応える。押すと opt.open(L) でその感覚がひらく。
   使い方：const QA = makeQAurora(THREE, world, { camera, marks: () => [...], kind: L => "sound"|"touch"|"memory"|"x", color: k => "#..", ground: (x,z) => y, open: L => {}, mobile });
           毎こま QA.update(dt)。押した所の判定は QA.pick(x, y) → L | null。 */
export function makeQAurora(THREE, scene, opt) {
  const MAX = opt.mobile ? 6 : 9, NS = 96, R = 55;
  const vs = "varying vec2 vU; varying float vD; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }";
  const fs = "uniform float uT; uniform vec3 uC; uniform float uA; uniform float uP; varying vec2 vU; varying float vD; void main(){ float edge = smoothstep(0.,.5,vU.y)*(1.-smoothstep(.5,1.,vU.y)); float ends = smoothstep(0.,.18,vU.x)*(1.-smoothstep(.82,1.,vU.x)); float veil = .62+.38*sin(vU.x*19.+uT*.5+sin(vU.x*7.-uT*.3)*1.4); float near = smoothstep(1.2,3.0,vD); float pul = uP*exp(-pow(fract(vU.x*1.5-uT*.4)-.5,2.)*14.); float rim = (smoothstep(.0,.06,vU.y)*(1.-smoothstep(.06,.12,vU.y)) + smoothstep(.88,.94,vU.y)*(1.-smoothstep(.94,1.,vU.y)))*ends*near*uA*.45; gl_FragColor = vec4(uC*(1.+pul*1.4)+vec3(rim*.35), uA*edge*ends*veil*near*(1.+pul) + rim); }";
  const S = [];
  for (let i = 0; i < MAX; i++) {
    const pos = new Float32Array((NS + 1) * 6), uv = new Float32Array((NS + 1) * 4), idx = [];
    for (let k = 0; k <= NS; k++) { uv[k * 4] = uv[k * 4 + 2] = k / NS; uv[k * 4 + 1] = 0; uv[k * 4 + 3] = 1; if (k < NS) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color("#fff") }, uA: { value: 0 }, uP: { value: 0 } }, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.visible = false; scene.add(mesh);
    S.push({ mesh, m, pos, L: null, a: 0, want: 0, p: 0, hov: 0, c: [], ph: i * 1.7, links: [] });
  }
  let t = 0, reT = 0, geoT = 0; const cp = new THREE.Vector3(), _v = new THREE.Vector3();
  function assign() {
    const cam = opt.camera.position, M = opt.marks().map(L => ({ L, d: Math.hypot(L.o.x - cam.x, L.o.z - cam.z) })).filter(e => e.d < R && opt.kind(e.L)).sort((a, b) => a.d - b.d).slice(0, MAX).map(e => e.L);
    for (const s of S) if (s.L && !s.amb && !M.includes(s.L)) s.want = 0;   // 遠くなった層は、ゆっくり溶ける
    for (const L of M) { if (S.some(s => s.L === L && !s.amb)) continue; const s = S.find(s => !s.L || (s.want === 0 && s.a < .02)); if (!s) break; s.L = L; s.a = 0; s.want = 1; s.k = opt.kind(L); s.m.uniforms.uC.value.set(opt.color(s.k)); }
    for (const s of S) if (s.L && s.a < .02 && s.want === 0) { s.L.qaIn = 0; s.L = null; s.amb = false; s.mesh.visible = false; }
    // 10-30：印から遠い所でも、いちばん近い印の層が一本、見る人の少し前に漂う（触れるとその印の感覚がひらく）
    const near = false && S.some(s => s.L && s.want && !s.amb && Math.hypot(s.L.o.x - cam.x, s.L.o.z - cam.z) < 18),   /* 10-30：見る人の前の一本はいつも漂わせる（印が通りの脇にあると、帯が画面に入らなかった） */ fw = opt.camera.getWorldDirection(_v), fl = Math.hypot(fw.x, fw.z) || 1;
    let am = S.find(s => s.amb && s.L);
    if (near) { if (am) am.want = 0; }
    else { const all = opt.marks().filter(L => opt.kind(L) && !S.some(q => q.L === L && !q.amb)).map(L => ({ L, d: Math.hypot(L.o.x - cam.x, L.o.z - cam.z) })).filter(e => e.d < 160).sort((a, b) => a.d - b.d);
      if (all.length) { if (!am) { am = S.find(s => !s.L); if (am) { am.L = all[0].L; am.amb = true; am.a = 0; am.k = opt.kind(am.L); am.m.uniforms.uC.value.set(opt.color(am.k)); am.links = []; am.to = null; } }
        if (am) { am.want = 1; am.ax = cam.x + fw.x / fl * 7; am.az = cam.z + fw.z / fl * 7; am.ph = Math.atan2(fw.x, fw.z) + 1.2; } } }
    // 絡まり：近い層どうし（25 m 以内）を結ぶ。帯はその方へ伸びて、相手の帯とくぐり合う
    const act = S.filter(s => s.L && s.want);
    for (const s of act) { let best = null, bd = 25; for (const o of act) { if (o === s) continue; const d = Math.hypot(o.L.o.x - s.L.o.x, o.L.o.z - s.L.o.z); if (d < bd) { bd = d; best = o; } } s.links = act.filter(o => o !== s && Math.hypot(o.L.o.x - s.L.o.x, o.L.o.z - s.L.o.z) < 25); s.to = best; }
  }
  function shape(s) {   // 印のまわりから、絡む相手の方へ伸びる弧（うねり・ねじれ）
    const o = s.amb ? { x: s.ax, z: s.az } : s.L.o, g0 = opt.ground(o.x, o.z); let tx, tz, len;
    if (s.to && !s.amb) { const dx = s.to.L.o.x - o.x, dz = s.to.L.o.z - o.z, l = Math.hypot(dx, dz) || 1; tx = dx / l; tz = dz / l; len = Math.min(16, l * .9 + 3); } else { tx = Math.sin(s.ph); tz = Math.cos(s.ph); len = 8; }
    const nx = -tz, nz = tx, P = s.pos, wob = s.p * .35;
    for (let k = 0; k <= NS; k++) { const u = k / NS, a = (u - .3) * len, sw = Math.sin(u * Math.PI * 2 + s.ph + t * .23) * 1.4 + Math.sin(u * 9 - t * 3) * wob * .3,
      x = o.x + tx * a + nx * sw, z = o.z + tz * a + nz * sw, gy = opt.ground(x, z) || g0, y = gy + 1.5 + .9 * Math.sin(u * Math.PI * 1.5 + s.ph + t * .17) + wob * Math.sin(u * 14 - t * 5),
      tau = u * 4.2 + s.ph + t * .12, W = 1.0 + .6 * s.a + .4 * s.hov, ux = nx * Math.sin(tau), uy = Math.cos(tau), uz = nz * Math.sin(tau);
      for (let j = 0; j < 2; j++) { const h = (j - .5) * W, q = (k * 2 + j) * 3; P[q] = x + ux * h; P[q + 1] = Math.min(gy + (s.amb ? 2.1 : 3.2), Math.max(gy + .35, y + uy * h));   /* 見る人の前の一本は近いので、腰から肩の高さまでに（空へ弧を描かない） */   /* 10-30 パネル：身体スケール（地面から 3.2 m まで） */ P[q + 2] = z + uz * h; } }
    s.mesh.geometry.attributes.position.needsUpdate = true;
  }
  // x/soil：足もとの下がひらく（地中の模式：円く透けた地面の下に、根と菌糸のような細い線が伸びる。8 秒で閉じる）
  const SOIL = { g: null, t: 0 };
  function soilOpen(x, z) {
    if (!SOIL.g) { const g = new THREE.Group(), gy = 0;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, toneMapped: false, fog: false,
        vertexShader: "varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
        fragmentShader: "uniform float uA; varying vec2 vP; void main(){ float r = length(vP)/2.6; float a = (1.-smoothstep(.55,1.,r)); gl_FragColor = vec4(vec3(.09,.07,.06), uA*.78*a); }" }));
      disc.renderOrder = 4; g.add(disc);
      const pts = [], rnd = (k) => { const v = Math.sin(k * 127.1) * 43758.5453; return v - Math.floor(v); };
      for (let i = 0; i < 34; i++) { let px = (rnd(i) - .5) * 2.4, py = -.05, pz = (rnd(i + 9) - .5) * 2.4; for (let k = 0; k < 7; k++) { const nx = px + (rnd(i * 7 + k) - .5) * .5, ny = py - .12 - rnd(i * 3 + k) * .25, nz = pz + (rnd(i * 5 + k + 2) - .5) * .5; pts.push(px, py, pz, nx, ny, nz); px = nx; py = ny; pz = nz; } }
      const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: "#c9b08a", transparent: true, opacity: 0, depthTest: false, toneMapped: false, fog: false })); lines.renderOrder = 5; g.add(lines);
      SOIL.g = g; SOIL.disc = disc; SOIL.lines = lines; scene.add(g); }
    SOIL.g.position.set(x, opt.ground(x, z) + .03, z); SOIL.t = 8; SOIL.g.visible = true;
  }
  function hint(text) {   // 画面の上の方に、明朝の小さな一行（4.5 秒で消える）
    const e = document.createElement("div"); e.textContent = text; e.setAttribute("role", "status");
    e.style.cssText = "position:fixed;left:50%;top:max(96px,15vh);transform:translateX(-50%);z-index:8;max-width:min(88vw,560px);padding:8px 14px;font:400 13px/1.6 var(--ml-serif,'Shippori Mincho','Hiragino Mincho ProN',serif);letter-spacing:.06em;color:#eef6f8;background:rgba(6,12,20,.5);border-left:2px solid rgba(160,140,255,.8);pointer-events:none;opacity:0;transition:opacity .6s ease;text-align:center";
    document.body.appendChild(e); requestAnimationFrame(() => { e.style.opacity = "1"; }); setTimeout(() => { e.style.opacity = "0"; setTimeout(() => e.remove(), 700); }, 4500);
  }
  const api = {
    soilOpen,
    update(dt) {
      t += dt; reT += dt; geoT += dt; const cam = opt.camera.position;
      if (reT > 1) { reT = 0; assign(); }
      if (SOIL.g && SOIL.g.visible) { SOIL.t -= dt; const k = Math.max(0, Math.min(1, SOIL.t > 7 ? 8 - SOIL.t : SOIL.t / 1.5)); SOIL.disc.material.uniforms.uA.value = k; SOIL.lines.material.opacity = .75 * k; SOIL.lines.scale.y = .4 + .6 * Math.min(1, 8 - SOIL.t); if (SOIL.t <= 0) SOIL.g.visible = false; }
      const doGeo = geoT > .045; if (doGeo) geoT = 0;
      // 10-30 パネル「押してよいのか分からない」：視野の中ほどに入った帯は縁が明るくなり、最初の一度だけ碧が触れるよう誘う
      for (const s of S) { if (!s.L || !s.mesh.visible) continue; const q = (NS >> 1) * 6, P = s.pos; _v.set((P[q] + P[q + 3]) / 2, (P[q + 1] + P[q + 4]) / 2, (P[q + 2] + P[q + 5]) / 2).project(opt.camera); s.ctr = _v.z < 1 && Math.abs(_v.x) < .45 && Math.abs(_v.y) < .55 ? 1 : 0;
        if (s.ctr) { s.hov = Math.max(s.hov, .45); if (!api._hinted && t > 6.2 && (document.getElementById("toast")?.hidden !== false || t > 14)) { api._hinted = true; let seen = false; try { seen = !!sessionStorage.getItem("q.h.band"); sessionStorage.setItem("q.h.band", "1"); } catch { } if (!seen) hint("目の前の色の帯に、触れてみてください。その感覚がひらきます。"); }   /* 10-30：3 秒で出す。碧の字幕（画面の下）と重ならないよう、画面の上の方に小さく */ } }
      for (const s of S) { if (!s.L) continue; s.a += (s.want - s.a) * Math.min(1, dt * .8); s.p *= Math.pow(.25, dt); s.hov *= Math.pow(.1, dt); s.L.qaIn = s.a;
        const d = s.amb ? 4 : Math.hypot(s.L.o.x - cam.x, s.L.o.z - cam.z), nearK = d < 6 ? 1 - d / 6 : 0;   // 近づくと濃く
        s.m.uniforms.uA.value = s.a * (.6 + .3 * nearK + .35 * s.hov) * (t < 12 ? 1 + .5 * Math.max(0, Math.sin(t * 1.6)) : 1); s.m.uniforms.uP.value = Math.min(1.2, s.p + nearK * .15); s.m.uniforms.uT.value = t; s.mesh.visible = s.a > .02;   /* 10-30 パネル：触れる層が見えるように（下限を上げ、歩き始めの 12 秒は呼吸のようにゆらぐ） */
        if (s.mesh.visible && (doGeo || s.p > .1)) shape(s); }
    },
    touch(L, v = 1) { const st = document.getElementById("sndTag"); if (st) { st.hidden = true; st.style.visibility = "hidden"; clearTimeout(api._stT); api._stT = setTimeout(() => { st.style.visibility = ""; }, 7000); }   // 10-30 パネル：触れた層の箱だけを出す（近くの再現音の説明を、しばらく隠す）
 const s = S.find(s => s.L === L); if (!s) return; s.p = Math.min(1.2, s.p + v); for (const o of s.links) o.p = Math.min(1.2, o.p + v * .35); },   // 触れた層と、絡んでいる層がわずかに応える
    pick(x, y, hover) {   // 画面の点から、いちばん近い帯（中心線から 36px 以内・遠い帯は除く）
      const cam = opt.camera, W = innerWidth, H = innerHeight, lim = (opt.mobile ? 52 : 40) ** 2; let best = null, bd = lim;
      for (const s of S) { if (!s.L || !s.mesh.visible || s.a < .3) continue; if (!s.amb && Math.hypot(s.L.o.x - cam.position.x, s.L.o.z - cam.position.z) > (opt.mobile ? 45 : 55)) continue; const P = s.pos;
        for (let k = 0; k <= NS; k += 3) { const q = k * 6; _v.set((P[q] + P[q + 3]) / 2, (P[q + 1] + P[q + 4]) / 2, (P[q + 2] + P[q + 5]) / 2).project(cam); if (_v.z > 1 || _v.z < -1) continue; const sx = (_v.x + 1) / 2 * W, sy = (1 - _v.y) / 2 * H, dd = (sx - x) ** 2 + (sy - y) ** 2; if (dd < bd) { bd = dd; best = s; } } }
      if (best && hover) { best.hov = Math.min(1, best.hov + .6); best.p = Math.max(best.p, .35); }   // PC：カーソルを重ねると帯が波打つ
      return best ? best.L : null;
    },
    get sheets() { return S.filter(s => s.L).map(s => [s.k, s.L.o.title, +s.a.toFixed(2)]); },
  };
  return api;
}

/* リズム（Qualia/sound の中の、その場所の周期）：日の出・日の入りの時刻を、その場所の緯度経度と今日の日付から計算する。
   式＝NOAA の太陽位置の近似式（大気差 0.833° を含む・国立天文台 暦計算室の値と数分以内で一致）。日本時（UTC+9）で返す。 */
export function sunTimes(lat, lon, d = new Date()) {
  const rad = Math.PI / 180, start = Date.UTC(d.getFullYear(), 0, 0), N = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 864e5);
  const g = 2 * Math.PI / 365 * (N - 1), eq = 229.18 * (.000075 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g)),
    de = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g),
    ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(de)) - Math.tan(lat * rad) * Math.tan(de)) / rad;
  const f = m => { m = ((m % 1440) + 1440) % 1440; return `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`; };
  return { rise: f(720 - 4 * (lon + ha) - eq + 540), set: f(720 - 4 * (lon - ha) - eq + 540) };
}
