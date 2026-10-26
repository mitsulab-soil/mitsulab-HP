/* Qualium 大宮 ── 7 つのエリアと、区画ごとにあとから読む仕組み（2026-10-26 本人「区画ごとに近くだけをあとから読む方法で…大宮駅から徒歩 15 分くらい」
   「3D 地図でエリアを色分け」「地面からオーロラのような光の境界」）
   zones.json（2 KB）＝エリアの輪郭・色・隣どうし。起動のあとに読む。
   areas/<id>.json＝そのエリアの道（公道だけ）・建物（250 m の区画ごと）・地点。いまいるエリアと、200 m より近づいた隣だけを読み、600 m より離れたら捨てる。
   建物は区画ごとに、近く（PC 430 m・スマホ 320 m）に入ったときだけ形をつくり、離れたら捨てる。
   作る道具＝_dev/20261026_areas/build_areas.py。 */
export function makeAreas({ THREE, world, camera, groundY, BASE, VER, mobile, rm, inDem, tex, onChunk, onUnchunk, onPick, onEnter }) {
  const A = { zones: [], byId: {}, cur: null, chunks: {}, fills: null, curtains: null, labels: [], ready: false, t: 0 };
  const NEAR = 200, DROP = 600, BLD_IN = mobile ? 320 : 430, BLD_OUT = BLD_IN + 120;
  const inside = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const ax = P[i], az = P[i + 1], bx = P[j], bz = P[j + 1]; if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) c = !c; } return c; };
  const segD = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2)); return Math.hypot(ax + dx * t - x, az + dz * t - z); };
  const distTo = (Z, x, z) => { if (inside(Z.poly, x, z)) return 0; let d = 1e9; const P = Z.poly; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) d = Math.min(d, segD(x, z, P[j], P[j + 1], P[i], P[i + 1])); return d; };
  const edgeD = (Z, x, z) => { let d = 1e9; const P = Z.poly; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) d = Math.min(d, segD(x, z, P[j], P[j + 1], P[i], P[i + 1])); return d; };
  A.zoneAt = (x, z) => { for (const Z of A.zones) if (inside(Z.poly, x, z)) return Z; return null; };

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
    const HGT = mobile ? 11 : 14, STEP = 6;
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
      if (_v.z > 1 || sx < hw || sx > W - hw || sy < 60 || sy > bottom) { L.e.style.display = "none"; continue; } L.e.style.display = ""; L.e.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%)`; }
  }
  A.highlight = id => { for (const Z of A.zones) if (Z.fill) Z.fill.material.opacity = id && Z.id === id ? .5 : .3; };

  /* ---------- エリアの中身（道・地面・建物・地点） ---------- */
  // 道＝アスファルト（CC0・ambientCG Asphalt023S）、地面＝コンクリートの舗装（CC0・Poly Haven）。建物は半透明の薄い面（参道の建物と同じ考え）
  const roadMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/Asphalt023S_c5.webp"), normalMap: tex(BASE + "tex/Asphalt023S_n5.webp", false), color: 0x56544f, roughness: .9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const groundMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/concrete_pavement_c5.webp"), normalMap: tex(BASE + "tex/concrete_pavement_n5.webp", false), color: 0x625f58, roughness: .95, metalness: 0 });
  // 2026-10-26 2：道と地面が白く飛んで一面の灰色に見えた → 色を下げ、地面には数十 m のむら（目地の汚れ・雨じみ）を重ねる
  groundMat.onBeforeCompile = sh => { sh.uniforms.uLandG = window.__qw?.LANDG || { value: 0 };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGw;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGw=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vGw; float gH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float gN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(gH(i),gH(i+vec2(1,0)),f.x),mix(gH(i+vec2(0,1)),gH(i+vec2(1,1)),f.x),f.y);}")
      .replace("#include <map_fragment>", "#include <map_fragment>\n{ vec2 p=vGw.xz; float n=gN(p*.05)*.6+gN(p*.17)*.4; diffuseColor.rgb*=.74+n*.5; vec3 big=texture2D(map,p*.027+.31).rgb; diffuseColor.rgb*=.7+dot(big,vec3(.333))*.6; }"); };
  groundMat.customProgramCacheKey = () => "areaGroundMacro";
  const bldMat = new THREE.MeshStandardMaterial({ color: 0x9fa9b1, roughness: .8, metalness: 0, transparent: true, opacity: .34, depthWrite: false, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8f99a2, roughness: .85, metalness: 0, transparent: true, opacity: .55, depthWrite: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xdfe8ee, transparent: true, opacity: .45, depthWrite: false });
  // 2026-10-26 2：駅前の大きな建物の中や間に立つと、半透明の壁が何枚も重なって画面が白く飛んでいた → 目の前（〜6 m）は消し、30 m までで少しずつ現す・色を暗めに
  bldMat.color.set(0x7d8892); bldMat.opacity = .3; roofMat.color.set(0x737d87); roofMat.opacity = .45;
  for (const m of [bldMat, roofMat, edgeMat]) { m.onBeforeCompile = sh => {
    sh.uniforms.uLandG = window.__qw?.LANDG || { value: 0 };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vBw;").replace("#include <project_vertex>", "#include <project_vertex>\nvBw=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vBw;").replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a*=smoothstep(6.,30.,distance(vBw,cameraPosition));"); };
    m.customProgramCacheKey = () => "areaBldFade" + m.type; }
  for (const m of [roadMat, groundMat, bldMat, roofMat, edgeMat]) m.userData.land = true;
  // 2026-10-26 2：駅前の地形の写真（屋根の写った空中写真）が道と地面の上に白くかぶっていた → 参道の道と同じく、道と地面の画素に印を付けて地形を描かない
  for (const m of [roadMat, groundMat]) { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp; }
  function buildChunk(Z, J) {
    const G = new THREE.Group(); G.name = "area_" + Z.id; const C = { Z, J, g: G, w: J.w, tiles: {}, places: [] };
    for (const w of J.w) { let b = [1e9, 1e9, -1e9, -1e9]; for (let i = 1; i < w.length; i += 2) { b[0] = Math.min(b[0], w[i]); b[1] = Math.min(b[1], w[i + 1]); b[2] = Math.max(b[2], w[i]); b[3] = Math.max(b[3], w[i + 1]); } w.b = b; }
    // 道の帯
    const pos = [], ruv = [];
    for (const w of J.w) { const hw = w[0];
      for (let i = 1; i + 3 < w.length; i += 2) { const ax = w[i], az = w[i + 1], bx = w[i + 2], bz = w[i + 3], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * hw, nz = dx / l * hw;
        const P = [[ax + nx, az + nz], [ax - nx, az - nz], [bx - nx, bz - nz], [bx + nx, bz + nz]].map(([x, z]) => [x, groundY(x, z) + .1, z]);
        for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...P[k]); ruv.push(P[k][0] / 4, P[k][2] / 4); } } }
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(ruv, 2)); rg.computeVertexNormals();
    const road = new THREE.Mesh(rg, roadMat); road.renderOrder = -3; road.name = "areaRoad"; G.add(road); C.road = road;
    // 地形（DEM）の外の地面：エリアの中の 20 m の区画だけ（模式の平らな地）
    const P = Z.poly; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let i = 0; i < P.length; i += 2) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); z0 = Math.min(z0, P[i + 1]); z1 = Math.max(z1, P[i + 1]); }
    const CS = 20, gp = [];
    if (Z.ground) for (let z = z0; z < z1; z += CS) for (let x = x0; x < x1; x += CS) { const cx = x + CS / 2, cz = z + CS / 2; if (!inside(P, cx, cz) || (inDem(cx, cz) && !Z.groundAll)) continue; const y = groundY(cx, cz) - .02;
      gp.push(x, y, z, x, y, z + CS, x + CS, y, z, x + CS, y, z, x, y, z + CS, x + CS, y, z + CS); }
    if (gp.length) { const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3)); const gu = []; for (let i = 0; i < gp.length; i += 3) gu.push(gp[i] / 6, gp[i + 2] / 6); gg.setAttribute("uv", new THREE.Float32BufferAttribute(gu, 2)); gg.computeVertexNormals(); const gm = new THREE.Mesh(gg, groundMat); gm.renderOrder = -3; gm.name = "areaGround"; G.add(gm); C.ground = gm; }
    world.add(G);
    onChunk?.(Z, J, C);
    return C;
  }
  function buildTile(C, key) {
    const list = C.J.b[key]; const wp = [], rp = [], ep = [];
    for (const b of list) { const h = b[0], n = (b.length - 1) / 2; let y = 1e9; for (let i = 0; i < n; i++) y = Math.min(y, groundY(b[1 + i * 2], b[2 + i * 2]));
      for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = b[1 + i * 2], az = b[2 + i * 2], bx = b[1 + j * 2], bz = b[2 + j * 2];
        wp.push(ax, y, az, bx, y, bz, bx, y + h, bz, ax, y, az, bx, y + h, bz, ax, y + h, az); ep.push(ax, y + h, az, bx, y + h, bz, ax, y, az, ax, y + h, az); }
      const pts = []; for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(b[1 + i * 2], b[2 + i * 2]));
      const tri = THREE.ShapeUtils.triangulateShape(pts, []); for (const t of tri) for (const k of t) rp.push(pts[k].x, y + h, pts[k].y); }
    const T = new THREE.Group();
    const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3)); wg.computeVertexNormals();
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3)); rg.computeVertexNormals();
    const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.Float32BufferAttribute(ep, 3));
    const wm = new THREE.Mesh(wg, bldMat), rm2 = new THREE.Mesh(rg, roofMat), el = new THREE.LineSegments(eg, edgeMat); wm.renderOrder = rm2.renderOrder = 2; T.add(wm, rm2, el); C.g.add(T); return T;
  }
  function dropChunk(id) {
    const C = A.chunks[id]; if (!C || !C.g) { delete A.chunks[id]; return; }
    onUnchunk?.(C);
    const keep = new Set([roadMat, groundMat, bldMat, roofMat, edgeMat]); C.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && !keep.has(o.material)) o.material.dispose(); }); world.remove(C.g); delete A.chunks[id];
  }
  function ensure(Z) {
    if (!Z.chunk) return Promise.resolve(null);
    const c = A.chunks[Z.id]; if (c) return c.p;
    const e = A.chunks[Z.id] = { p: null };
    e.p = fetch(BASE + "areas/" + Z.id + ".json?v=" + VER).then(r => r.json()).then(J => { if (A.chunks[Z.id] !== e) return null; Object.assign(e, buildChunk(Z, J)); e.ok = true; return e; }).catch(err => { console.warn("area", Z.id, err); delete A.chunks[Z.id]; return null; });
    return e.p;
  }
  A.ensure = id => ensure(A.byId[id]);
  A.walkable = (x, z) => {
    for (const id in A.chunks) { const C = A.chunks[id]; if (!C.ok) continue;
      for (const w of C.w) { const r = w[0] + .3, b = w.b; if (x < b[0] - r || x > b[2] + r || z < b[1] - r || z > b[3] + r) continue;
        for (let i = 1; i + 3 < w.length; i += 2) if (segD(x, z, w[i], w[i + 1], w[i + 2], w[i + 3]) < r) return true; } }
    return false;
  };
  /* いちばん近い道の上の点（降りる場所を道の上にそろえる） */
  A.snap = (x, z) => { let best = null, bd = 1e9;
    for (const id in A.chunks) { const C = A.chunks[id]; if (!C.ok) continue;
      for (const w of C.w) for (let i = 1; i + 3 < w.length; i += 2) { const ax = w[i], az = w[i + 1], dx = w[i + 2] - ax, dz = w[i + 3] - az, l2 = dx * dx + dz * dz || 1, t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2)), px = ax + dx * t, pz = az + dz * t, d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = [px, pz]; } } }
    return best; };
  A.pickables = () => { const o = []; for (const id in A.chunks) { const C = A.chunks[id]; if (C.road) o.push(C.road); if (C.ground) o.push(C.ground); } return o; };
  A.info = () => { let tiles = 0, roads = 0; for (const id in A.chunks) { const C = A.chunks[id]; if (!C.ok) continue; tiles += Object.keys(C.tiles).length; roads += C.w.length; } return { loaded: Object.keys(A.chunks), tiles, roads, cur: A.cur?.id || null }; };

  A.load = () => A.p ||= fetch(BASE + "zones.json?v=" + VER).then(r => r.json()).then(J => {
    A.zones = J.zones.map(z => ({ ...z })); for (const Z of A.zones) A.byId[Z.id] = Z;
    buildFills(); buildCurtains(); A.ready = true; return A;
  }).catch(e => console.warn("zones", e));

  let checkT = 0;
  A.update = (dt, mode) => {
    if (!A.ready) return;
    A.t += dt; const sky = mode === "sky", walk = mode === "walk" || mode === "sight";
    A.fills.visible = sky; labBox.hidden = !sky; if (sky) stepLabels();
    A.curtains.visible = walk || mode === "descend";
    const cp = camera.position;
    for (const m of A.curtains.children) { const u = m.material.uniforms; u.uT.value = rm ? 0 : A.t; u.uCam.value.copy(cp); u.uK.value = mode === "descend" ? .5 : 1; }
    if (tagT < 1e8 && (tagT -= dt) < 0) tag.classList.remove("on");
    if ((checkT -= dt) > 0) return; checkT = .3;
    if (!walk) { nearEl.classList.remove("on"); return; }
    const Z = A.zoneAt(cp.x, cp.z);
    if (Z !== A.cur) {
      const prev = A.cur; A.cur = Z;
      if (Z && prev) { const loading = Z.chunk && !A.chunks[Z.id]?.ok; showTag(Z, loading); if (loading) ensure(Z).then(() => { if (A.cur === Z) { tag.querySelector(".ld").classList.remove("on"); tagT = 2.4; } }); onEnter?.(Z, prev); }
      else if (Z) ensure(Z);
    }
    // 隣のエリアへ 200 m より近づいたら読みはじめる・600 m より離れたら捨てる
    for (const Y of A.zones) { if (!Y.chunk) continue; const d = distTo(Y, cp.x, cp.z);
      if (Y === Z || d < NEAR) ensure(Y); else if (d > DROP && A.chunks[Y.id]) dropChunk(Y.id); }
    // 建物の区画：近いものだけ形をつくる
    for (const id in A.chunks) { const C = A.chunks[id]; if (!C.ok) continue; const t = C.J.t;
      for (const key in C.J.b) { const [i, j] = key.split(",").map(Number), d = Math.hypot((i + .5) * t - cp.x, (j + .5) * t - cp.z);
        if (d < BLD_IN && !C.tiles[key]) C.tiles[key] = buildTile(C, key);
        else if (d > BLD_OUT && C.tiles[key]) { const T = C.tiles[key]; T.traverse(o => o.geometry?.dispose()); C.g.remove(T); delete C.tiles[key]; } } }
    // 境界に近づくと、向こうのエリアの名前が浮かぶ
    let best = null, bd = 28; if (Z) for (const Y of A.zones) { if (Y === Z || !Z.adj.includes(Y.id)) continue; const d = distTo(Y, cp.x, cp.z); if (d < bd) { bd = d; best = Y; } }
    if (best && !tag.classList.contains("on")) { nearEl.style.setProperty("--ac", best.color); nearEl.textContent = `この先　${best.name}`; nearEl.classList.add("on"); } else nearEl.classList.remove("on");
  };
  A.hideAll = () => { tag.classList.remove("on"); nearEl.classList.remove("on"); labBox.hidden = true; };
  return A;
}
