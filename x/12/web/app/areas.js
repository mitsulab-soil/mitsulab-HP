/* Qualium 川越 ── エリアと、あとから読む中身（2026-10-26 本人「JR 川越駅から有名な寺院・氷川神社などを含むところまで広げる」）
   大宮（web/lite/areas.js）と同じ考え・同じ見た目のオーロラの境界と色の面（その節を写した。大宮のファイルは触らない）。
   zones.json（起動のあとに読む）＝6 つのエリアの輪郭・色・始める所。areas/<id>.json＝元の範囲の外の道と建物。
   いまいるエリアと、200 m より近づいたエリアだけを読み、600 m より離れたら捨てる。中身の形は app.js の build(Z, J) が作る。
   作る道具＝_dev/build_areas.py。 */
export function makeAreas({ THREE, world, camera, groundY, BASE, VER, mobile, rm, build, drop, onPick, onEnter }) {
  const A = { zones: [], byId: {}, cur: null, chunks: {}, fills: null, curtains: null, labels: [], ready: false, t: 0, old: null };
  const NEAR = 200, DROP = 600;
  const inside = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const ax = P[i], az = P[i + 1], bx = P[j], bz = P[j + 1]; if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) c = !c; } return c; };
  const segD = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2)); return Math.hypot(ax + dx * t - x, az + dz * t - z); };
  const distTo = (Z, x, z) => { if (inside(Z.poly, x, z)) return 0; let d = 1e9; const P = Z.poly; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) d = Math.min(d, segD(x, z, P[j], P[j + 1], P[i], P[i + 1])); return d; };
  A.zoneAt = (x, z) => { for (const Z of A.zones) if (inside(Z.poly, x, z)) return Z; return null; };
  A.inOld = (x, z) => { const o = A.old; return !o || (x > o[0] && x < o[2] && z > o[1] && z < o[3]); };
  A.owned = (x, z) => { if (!A.ready || A.inOld(x, z)) return false; const Z = A.zoneAt(x, z); return !!(Z && Z.chunk); };   // 元の範囲の外で、エリアの中身が持つ所
  /* ---------- HTML：地図の札・歩くときの名前と読み込みの表示 ---------- */
  const css = document.createElement("style"); css.textContent = `
.arLabels{position:fixed;inset:0;pointer-events:none;z-index:6}
.arLabel{position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:auto;min-height:44px;min-width:44px;padding:6px 14px 7px;border-radius:3px;border:1px solid var(--ac);background:rgba(10,16,26,.72);color:#eef3f6;font:600 13px/1.25 "Shippori Mincho","Hiragino Mincho ProN",serif;letter-spacing:.06em;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;white-space:nowrap;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.arLabel small{font:500 9px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.14em;color:var(--ac);opacity:.95;margin-top:2px}
.arLabel:hover,.arLabel:focus-visible{background:rgba(10,16,26,.9);outline:none;box-shadow:0 0 0 1px var(--ac),0 0 14px var(--ac)}
.arTag{position:fixed;left:50%;top:22%;transform:translate(-50%,-50%);z-index:7;pointer-events:none;text-align:center;color:#f4f7f8;font:600 19px/1.3 "Shippori Mincho","Hiragino Mincho ProN",serif;letter-spacing:.14em;text-shadow:0 0 12px var(--ac),0 1px 3px rgba(0,0,0,.7);opacity:0;transition:opacity .9s}
.arTag.on{opacity:1}
.arTag small{display:block;font:500 10px/1.4 ui-monospace,Menlo,monospace;letter-spacing:.22em;color:var(--ac);text-shadow:0 1px 3px rgba(0,0,0,.8)}
.arTag .ld{display:inline-flex;align-items:center;gap:7px;margin-top:8px;font:500 11px/1.4 "Hiragino Sans",sans-serif;letter-spacing:.06em;color:#dfe7ea;opacity:0;transition:opacity .4s}
.arTag .ld.on{opacity:.9}
.arTag .ld i{width:56px;height:2px;background:rgba(255,255,255,.18);position:relative;overflow:hidden}
.arTag .ld i:after{content:"";position:absolute;inset:0;width:40%;background:var(--ac);animation:arld 1.1s ease-in-out infinite}
@keyframes arld{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
.arNear{position:fixed;left:50%;bottom:132px;transform:translateX(-50%);z-index:6;pointer-events:none;color:#eef3f6;font:600 13px/1.3 "Shippori Mincho","Hiragino Mincho ProN",serif;letter-spacing:.12em;text-shadow:0 0 10px var(--ac),0 1px 2px rgba(0,0,0,.8);opacity:0;transition:opacity .6s;white-space:nowrap}
.arNear.on{opacity:.92}
@media (max-width:600px){.arTag{font-size:16px;top:24%}.arNear{bottom:150px;font-size:12px}.arLabel{font-size:12px;padding:5px 10px 6px}}
@media (prefers-reduced-motion:reduce){.arTag .ld i:after{animation:none;width:100%}}`; document.head.appendChild(css);
  const labBox = document.createElement("div"); labBox.className = "arLabels"; labBox.hidden = true; document.body.appendChild(labBox);
  const tag = document.createElement("div"); tag.className = "arTag"; tag.setAttribute("aria-live", "polite"); tag.innerHTML = `<small></small><b></b><div class="ld"><i></i><span>道と建物を読み込んでいます</span></div>`; document.body.appendChild(tag);
  const nearEl = document.createElement("div"); nearEl.className = "arNear"; document.body.appendChild(nearEl);
  let tagT = 0;
  function showTag(Z, loading) { tag.style.setProperty("--ac", Z.color); tag.querySelector("small").textContent = Z.en; tag.querySelector("b").textContent = Z.name; tag.querySelector(".ld").classList.toggle("on", !!loading); tag.classList.add("on"); tagT = loading ? 1e9 : 3.2; }

  /* ---------- 光の幕（オーロラ）：エリアの輪郭の内側 1.2 m に、地面から立ちのぼる ---------- */
  const auroraMat = color => new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(color) }, uCam: { value: new THREE.Vector3() }, uK: { value: 1 } },
    vertexShader: `attribute float aS; attribute float aH; varying float vS; varying float vH; varying float vD; uniform vec3 uCam;
      void main(){ vS=aS; vH=aH; vec4 w=modelMatrix*vec4(position,1.); vD=distance(w.xz,uCam.xz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uT; uniform vec3 uC; uniform float uK; varying float vS; varying float vH; varying float vD;
      float h(float n){return fract(sin(n)*43758.5453);} float n1(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h(i),h(i+1.),f);}
      void main(){
        float s=vS*.11, t=uT*.35;
        float band=n1(s+t)*.6+n1(s*2.7-t*1.3)*.4;            // 横にゆらぐ光の帯
        float rays=pow(n1(s*9.+t*2.),3.)*.8+.2;                 // 縦の筋
        float top=mix(.45,1.,n1(s*.8+t*.6));                   // 幕の上端が波うつ
        float y=vH/top; if(y>1.) discard;
        float edge=exp(-y*y*900.)*.9;                          // 根もとの光の線（境界がはっきり読めるように）
        float a=smoothstep(0.,.05,y)*pow(1.-y,1.25)*(.35+.65*band)*(.35+.65*rays);
        float near=1.-smoothstep(80.,170.,vD); float close=smoothstep(1.,5.,vD);   // 遠くは消す・目の前は薄く
        a=min(.9,(a*1.7+edge)*near*(.35+.65*close)*uK*1.25);
        vec3 c=mix(uC*1.15,vec3(1.),pow(1.-y,8.)*.45);         // 根もとは白みを帯びる
        gl_FragColor=vec4(c,a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide, fog: false, toneMapped: false,
  });
  function buildCurtains() {
    const G = new THREE.Group(); G.name = "areaCurtains"; G.visible = false;
    const HGT = mobile ? 5 : 6.5, STEP = 6;   // 川越：壁に映りこまない低い幕
    for (const Z of A.zones) {
      const P = Z.poly, pos = [], aS = [], aH = [], idx = []; let s = 0;
      // 内側へ 1.2 m ずらす（隣のエリアの幕と重ならず、両側に二色の幕が立つ）
      const cx = P.reduce((a, v, i) => i % 2 ? a : a + v, 0) / (P.length / 2), cz = P.reduce((a, v, i) => i % 2 ? a + v : a, 0) / (P.length / 2);
      const pts = []; for (let i = 0; i < P.length; i += 2) pts.push([P[i], P[i + 1]]);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < .5) continue;
        let nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (!inside(P, mx + nx * 2, mz + nz * 2)) { nx = -nx; nz = -nz; }
        const n = Math.max(1, Math.ceil(L / STEP)), base = pos.length / 3;
        for (let k = 0; k <= n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t + nx * 1.2, z = a[1] + (b[1] - a[1]) * t + nz * 1.2, y = groundY(x, z) - .2;
          pos.push(x, y, z, x, y + HGT, z); aS.push(s + L * t, s + L * t); aH.push(0, 1); }
        for (let k = 0; k < n; k++) { const q = base + k * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
        s += L;
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aS", new THREE.Float32BufferAttribute(aS, 1)); g.setAttribute("aH", new THREE.Float32BufferAttribute(aH, 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, auroraMat(Z.color)); m.frustumCulled = false; m.renderOrder = 8; m.userData.zone = Z.id; G.add(m);
    }
    world.add(G); A.curtains = G;
  }
  /* ---------- 3D 地図：エリアの色の面と輪郭・名前の札 ---------- */
  function buildFills() {
    const G = new THREE.Group(); G.name = "areaFills"; G.visible = false;
    for (const Z of A.zones) {
      const P = Z.poly, sh = new THREE.Shape(); for (let i = 0; i < P.length; i += 2) i ? sh.lineTo(P[i], -P[i + 1]) : sh.moveTo(P[i], -P[i + 1]);
      const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)) + 4);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: Z.color, transparent: true, opacity: .3, depthWrite: false, depthTest: false, fog: false, toneMapped: false })); m.renderOrder = 4; G.add(m);
      const lp = []; for (let i = 0; i < P.length; i += 2) { const j = (i + 2) % P.length; lp.push(new THREE.Vector3(P[i], groundY(P[i], P[i + 1]) + 4.5, P[i + 1]), new THREE.Vector3(P[j], groundY(P[j], P[j + 1]) + 4.5, P[j + 1])); }
      const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: Z.color, transparent: true, opacity: .95, depthWrite: false, depthTest: false, fog: false, toneMapped: false })); l.renderOrder = 5; G.add(l);
      Z.fill = m;
      const e = document.createElement("button"); e.type = "button"; e.className = "arLabel"; e.style.setProperty("--ac", Z.color); e.innerHTML = `${Z.name}<small>${Z.en}</small>`; e.setAttribute("aria-label", Z.name + "に降りる");
      e.addEventListener("click", ev => { ev.stopPropagation(); onPick?.(Z); }); labBox.appendChild(e);
      const [lx, lz] = Z.label || Z.start; A.labels.push({ e, p: new THREE.Vector3(lx, groundY(lx, lz) + 30, lz), Z });
    }
    world.add(G); A.fills = G;
  }
  const _v = new THREE.Vector3();
  function stepLabels() {
    const W = innerWidth, H = innerHeight;
    // 2026-10-26 2：場所選びの板（#skyUI .card）に札が重ならないよう、板の上端より下には出さない
    const card = document.querySelector("#skyUI .card"), cr = card && card.offsetParent ? card.getBoundingClientRect() : null, bottom = cr && cr.width ? cr.top - 30 : H - 30;
    for (const L of A.labels) { _v.copy(L.p).project(camera); const sx = (_v.x + 1) / 2 * W, sy = (1 - _v.y) / 2 * H, hw = (L.w ||= L.e.offsetWidth || 110) / 2 + 6;   // 画面の端で切れる札は出さない
      const ls = document.querySelector("#lstack")?.getBoundingClientRect(), lh = (L.h ||= L.e.offsetHeight || 44) / 2;   // 層の一覧に重なる札は出さない（川越）
      if (_v.z > 1 || sx < hw || sx > W - hw || sy < 60 || sy > bottom || (ls && ls.width && sx - hw < ls.right && sy - lh < ls.bottom && sy + lh > ls.top)) { L.e.style.display = "none"; continue; } L.e.style.display = ""; L.e.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%)`; }
  }
  A.highlight = id => { for (const Z of A.zones) if (Z.fill) Z.fill.material.opacity = id && Z.id === id ? .5 : .3; };


  /* ---------- 中身：読む・捨てる ---------- */
  function ensure(Z) {
    if (!Z || !Z.chunk) return Promise.resolve(null);
    const e = A.chunks[Z.id]; if (e) return e.p;
    const c = A.chunks[Z.id] = { ok: false };
    c.p = fetch(BASE + "geo/areas/" + Z.id + ".json?v=" + VER).then(r => r.json()).then(J => { if (A.chunks[Z.id] !== c) return null; c.h = build(Z, J); c.ok = true; return c; })
      .catch(err => { console.warn("area", Z.id, err?.message ?? err); delete A.chunks[Z.id]; return null; });
    return c.p;
  }
  function dropChunk(id) { const c = A.chunks[id]; if (!c) return; delete A.chunks[id]; if (c.ok && c.h) drop(c.h); }
  A.ensure = id => ensure(A.byId[id]);
  A.ensureAt = (x, z) => { const Z = A.zoneAt(x, z); return Z && Z.chunk && !A.inOld(x, z) ? ensure(Z) : Promise.resolve(null); };
  A.info = () => ({ loaded: Object.keys(A.chunks).filter(k => A.chunks[k].ok), cur: A.cur?.id || null });
  A.load = () => A.p ||= fetch(BASE + "geo/zones.json?v=" + VER).then(r => r.json()).then(J => {
    A.old = J.old; A.zones = J.zones.map(z => ({ ...z, adj: [] })); for (const Z of A.zones) A.byId[Z.id] = Z;
    for (const Z of A.zones) for (const Y of A.zones) if (Y !== Z) { let near = false; for (let i = 0; i < Y.poly.length && !near; i += 2) near = distTo(Z, Y.poly[i], Y.poly[i + 1]) < 1; if (near) Z.adj.push(Y.id); }
    buildFills(); buildCurtains(); A.ready = true; return A;
  }).catch(e => { console.warn("zones", e?.message ?? e); return A; });
  let checkT = 0;
  A.update = (dt, mode) => {
    if (!A.ready) return;
    A.t += dt; const sky = mode === "sky", walk = mode === "walk" || mode === "sight" || mode === "fly";
    A.fills.visible = sky; labBox.hidden = !sky; if (sky) stepLabels();
    A.curtains.visible = mode === "walk" || mode === "descend";
    const cp = camera.position;
    for (const m of A.curtains.children) { const u = m.material.uniforms; u.uT.value = rm ? 0 : A.t; u.uCam.value.copy(cp); u.uK.value = mode === "descend" ? .25 : .32; }
    if (tagT < 1e8 && (tagT -= dt) < 0) tag.classList.remove("on");
    if ((checkT -= dt) > 0) return; checkT = .3;
    const cap = document.querySelector("#caption"), capOn = cap && !cap.hidden;   // 川越：碧の語りの字幕が出ているあいだは、地名の札を出さない（重ねない）
    if (capOn) { nearEl.classList.remove("on"); if (tagT < 1e8) tag.classList.remove("on"); }
    if (!walk) { nearEl.classList.remove("on"); return; }
    const Z = A.zoneAt(cp.x, cp.z);
    if (Z !== A.cur) {
      const prev = A.cur; A.cur = Z;
      if (Z && prev && mode === "walk" && !capOn) { const loading = Z.chunk && !A.chunks[Z.id]?.ok; showTag(Z, loading); if (loading) ensure(Z).then(() => { if (A.cur === Z) { tag.querySelector(".ld").classList.remove("on"); tagT = 2.4; } }); onEnter?.(Z, prev); }
      else if (Z) ensure(Z);
    }
    for (const Y of A.zones) { if (!Y.chunk) continue; const d = distTo(Y, cp.x, cp.z);
      if (Y === Z || d < NEAR) ensure(Y); else if (d > DROP && A.chunks[Y.id]) dropChunk(Y.id); }
    let best = null, bd = 28; if (Z && mode === "walk") for (const Y of A.zones) { if (Y === Z || !Z.adj.includes(Y.id)) continue; const d = distTo(Y, cp.x, cp.z); if (d < bd) { bd = d; best = Y; } }
    if (best && !capOn && !tag.classList.contains("on")) { nearEl.style.setProperty("--ac", best.color); nearEl.textContent = `この先　${best.name}`; nearEl.classList.add("on"); } else nearEl.classList.remove("on");
  };
  A.hideAll = () => { tag.classList.remove("on"); nearEl.classList.remove("on"); labBox.hidden = true; };
  return A;
}
