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
      const SR = window.__qw?.startRects || []; if ((L.Z.id === "higashi" || L.Z.id === "nishi") && SR.length) { L.e.style.display = "none"; continue; } if (_v.z > 1 || sx < hw || sx > W - hw || sy < 60 || sy > bottom || SR.some(r => Math.abs(r[0] - sx) < hw + 60 && Math.abs(r[1] - sy) < 46)) {   /* 2026-10-27：始める場所の名札と重なる地区の札は出さない */ L.e.style.display = "none"; continue; } L.e.style.display = ""; L.e.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%)`; }
  }
  A.highlight = id => { for (const Z of A.zones) if (Z.fill) Z.fill.material.opacity = id && Z.id === id ? .5 : .3; };

  /* ---------- エリアの中身（道・地面・建物・地点） ---------- */
  // 道＝アスファルト（CC0・ambientCG Asphalt023S）、地面＝コンクリートの舗装（CC0・Poly Haven）。建物は半透明の薄い面（参道の建物と同じ考え）
  const roadMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/Asphalt023S_c5.webp"), normalMap: tex(BASE + "tex/Asphalt023S_n5.webp", false), color: 0x56544f, roughness: .9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const sandMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/gravelly_sand_c5.webp"), normalMap: tex(BASE + "tex/gravelly_sand_n5.webp", false), color: 0xb9ad94, roughness: .97, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const groundMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/PavingStones130_c5.webp"), normalMap: tex(BASE + "tex/PavingStones130_n5.webp", false), color: 0x8a8780, roughness: .95, metalness: 0 });
  // 2026-10-26 2：道と地面が白く飛んで一面の灰色に見えた → 色を下げ、地面には数十 m のむら（目地の汚れ・雨じみ）を重ねる
  groundMat.onBeforeCompile = sh => { sh.uniforms.uLandG = window.__qw?.LANDG || { value: 0 };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGw;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGw=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vGw; float gH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float gN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(gH(i),gH(i+vec2(1,0)),f.x),mix(gH(i+vec2(0,1)),gH(i+vec2(1,1)),f.x),f.y);}")
      .replace("#include <map_fragment>", "#include <map_fragment>\n{ vec2 p=vGw.xz; float n=gN(p*.05)*.6+gN(p*.17)*.4; diffuseColor.rgb*=.74+n*.5; vec3 big=texture2D(map,p*.027+.31).rgb; diffuseColor.rgb*=.7+dot(big,vec3(.333))*.6; vec3 t2=texture2D(map,mat2(.8,-.6,.6,.8)*p*.113+.17).rgb; diffuseColor.rgb*=mix(1.,dot(t2,vec3(.333))*2.1,.5*gN(p*.031)); float jl=step(.985,fract(p.x/6.))+step(.985,fract(p.y/6.)); diffuseColor.rgb*=1.-.18*min(jl,1.); diffuseColor.rgb*=.86+.28*gN(p*.009+4.1); }"); };
  groundMat.customProgramCacheKey = () => "areaGroundMacro";
  // 2026-10-26 3（採点「地面が一面同じ石の板」）：40 m の区画ごとに 3 種の舗装（CC0・Poly Haven）を混ぜる
  const mkG = (c, n, col) => { const m = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/" + c), normalMap: tex(BASE + "tex/" + n, false), color: col, roughness: .93, metalness: 0 }); m.onBeforeCompile = groundMat.onBeforeCompile; m.customProgramCacheKey = () => "areaGroundMacro"; return m; };
  groundMat.color.set(0x9a8c78); const GMATS = [groundMat, mkG("concrete_pavers_02_c5.webp", "concrete_pavers_02_n5.webp", 0xb6b4ac), mkG("granite_tile_04_c5.webp", "granite_tile_04_n5.webp", 0x6e7176)];   // 2026-10-26 3：東口＝暖かい石色・西口＝明るい平板・新都心＝暗い御影石（見て分かる差に）
  // 2026-10-26 3：灰色の半透明の箱 → 不透明の壁・窓・素材（川越の蔵と同じく、近寄っても破綻しない面に）。
  // 壁＝コンクリートの質感（CC0・Poly Haven）に、階（3.4 m）と柱間（2.6 m）の窓をシェーダで刻む。色は建物ごとに 6 種の外装（模式）。
  // 40 m を超える高い建物（新都心のビル群・駅前の高層）はガラスのカーテンウォール、低層の 1 階は店先のガラス。形は OSM の輪郭と高さ（模式）。
  const bldMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/Concrete034_c5.webp"), normalMap: tex(BASE + "tex/Concrete034_n5.webp", false), vertexColors: true, roughness: .82, metalness: 0, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/gravel_embedded_concrete_c5.webp"), color: 0x6c6a66, roughness: .95, metalness: 0 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xdfe8ee, transparent: true, opacity: .18, depthWrite: false });
  bldMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aF; varying vec3 vF; varying vec3 vBw; varying vec3 vWn;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvF=aF;").replace("#include <project_vertex>", "#include <project_vertex>\nvBw=(modelMatrix*vec4(transformed,1.)).xyz; vWn=normalize(mat3(modelMatrix)*objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vF; varying vec3 vBw; varying vec3 vWn; float wR; float wH(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}")
      .replace("#include <map_fragment>", `#include <map_fragment>
  float wu=vF.x, wv=vF.y, H=vF.z; float tall=step(40.,H); float dist=distance(vBw,cameraPosition);
  if(dist<2.2) discard;
  float bh=wH(vec2(floor(H*7.13),floor(H*3.7))); float fl=tall>.5?3.6+.5*bh:3.1+.6*bh, bay=tall>.5?2.6+.9*fract(bh*7.):2.0+1.4*fract(bh*5.);   /* 2026-10-27：建物ごとに階高と窓の割り付けを変える（同じ箱の繰り返しにしない） */
  vec2 c=vec2(wu/bay, wv/fl); vec2 f=fract(c); vec2 id=floor(c);
  float ground=step(wv,4.2)*(1.-tall);
  float win=tall>.5? step(.06,f.x)*step(f.x,.94)*step(.08,f.y)*step(f.y,.94) : step(.18,f.x)*step(f.x,.82)*step(.32,f.y)*step(f.y,.86);
  if(ground>.5) win=step(.06,fract(wu/4.2))*step(fract(wu/4.2),.94)*step(.35,wv)*step(wv,3.3);
  win*=step(wv,H-.9)*step(.3,wv);
  float aa=clamp(dist/90.,0.,1.); win=mix(win,tall>.5?.8:.32,aa*aa);
  float lit=step(.86,wH(id+floor(H)));
  vec3 sky=mix(vec3(.05,.07,.10),vec3(.22,.28,.34),clamp(fract(wv/fl)*.6+.25*wH(id.yy),0.,1.));
  float vr=mix(.5,.14,tall)*mix(1.,.3,aa); vec3 glass=sky*(1.-vr*.5+vr*wH(id))+lit*(1.-tall)*(1.-aa)*vec3(.5,.38,.22)*.35; glass=mix(glass,sky*1.1,tall*.4);
  if(ground>.5) glass=vec3(.07,.08,.08)+vec3(.45,.36,.24)*.3*step(.4,wH(floor(vec2(wu/4.2,1.))));
  // 窓の奥行き（模式）：上の枠と横の枠の落とす陰を、ガラスの面に
  float inset=tall>.5?0.:(1.-smoothstep(.70,.86,f.y))*0.+smoothstep(.70,.86,f.y)*.55+(1.-smoothstep(.18,.26,f.x))*.35; glass*=1.-inset*win*(1.-aa);
  diffuseColor.rgb=mix(diffuseColor.rgb, glass, win); wR=win;
  diffuseColor.rgb*=.62+.38*smoothstep(0.,7.,wv);
  diffuseColor.rgb*=1.-.28*smoothstep(H-1.1,H-.9,wv)*(1.-tall);
  // 2026-10-26 3（採点「窓を貼った箱」）：窓の下の水切り（明るい細い線）と上の庇の陰、1 階の上の看板の帯（文字ではなく、色の面と細い線だけの模式）
  if(tall<.5&&ground<.5){ float sill=step(.27,f.y)*step(f.y,.32)*step(.14,f.x)*step(f.x,.86); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.77,.74),sill*.7*(1.-aa)); float lint=step(.86,f.y)*step(f.y,.93)*step(.16,f.x)*step(f.x,.84); diffuseColor.rgb*=1.-lint*.35*(1.-aa); }
  if(tall<.5){ float so=.5*wH(vec2(floor(H*2.7),3.)); float sb=step(3.35+so,wv)*step(wv,4.15+so)*step(.08,fract(wu/8.4))*step(fract(wu/8.4),.92); float hc=wH(vec2(floor(wu/8.4),floor(H*7.))); vec3 sc=hc<.3?vec3(.48,.24,.2):hc<.55?vec3(.22,.28,.36):hc<.75?vec3(.78,.75,.68):vec3(.28,.33,.28);   /* 採点：彩度を落とし、模様をなくす */ diffuseColor.rgb=mix(diffuseColor.rgb,sc,sb*.92*(1.-aa*.5)); wR*=1.-sb; }   // 屋上のふち（パラペット）の陰で、箱の上端を締める
  diffuseColor.rgb*=.9+.2*wH(vec2(floor(H*3.1),floor(wu/37.)));
  { /* 2026-10-27 写実：建物ごとの色味のずれ・雨だれの筋（上から下へ薄れる）・足もとの汚れ（模式） */ float bt=wH(vec2(floor(H*5.3),7.)); diffuseColor.rgb*=mix(vec3(1.),vec3(1.03,1.,.96),bt*(1.-wR)); diffuseColor.rgb*=mix(vec3(1.),vec3(.97,.99,1.02),(1.-bt)*.6*(1.-wR));
    float st=wH(vec2(floor(wu/.7),floor(H))); float streak=smoothstep(.72,1.,st)*smoothstep(H*.2,H,wv)*(1.-wR); diffuseColor.rgb*=1.-.16*streak; diffuseColor.rgb*=1.-.12*(1.-smoothstep(0.,1.2,wv)); }   // 面ごとの汚れ・色の差   // 足もとの陰（地面との接するところを暗く）
  float band=tall<.5? (1.-step(.06,fract(wv/fl)))*.12 : 0.; diffuseColor.rgb*=1.-band;
  diffuseColor.rgb*=.82+.18*smoothstep(0.,6.,wv);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.12,wR);")
      .replace("#include <common>", "#include <common>\nuniform float uDig;")
      .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
  { /* 2026-10-27 夜 融合：写実の外壁の上に、薄いデジタルの層（点群・下から上へ走る走査の線・上端の光の輪郭）。近くは消し、15〜200 m で読める */
    float wu=vF.x, wv=vF.y, H=max(vF.z,1.); float dist=distance(vBw,cameraPosition); float fz=smoothstep(14.,30.,dist)*(1.-smoothstep(200.,500.,dist));
    vec2 pc=vec2(wu/1.4, wv/1.4); vec2 pf=fract(pc)-.5; float pw=max(fwidth(pc.x),fwidth(pc.y)); float pr=min(.05,pw*.7); float ph=fract(sin(dot(floor(pc),vec2(27.1,61.7)))*43758.5);
    float pcd=(1.-smoothstep(pr,pr+pw*.8,length(pf)))*(1.-smoothstep(.12,.25,pw))*step(.6,ph);
    float sy=fract(uDig*.05+fract(wu*.0007)); float scn=exp(-pow((wv/H-sy)*H/.7,2.));
    float top=1.-smoothstep(0.,.25,H-wv);
    totalEmissiveRadiance+=vec3(.36,.8,.9)*fz*(pcd*.25+scn*.22+top*.9);
    float gf=step(wv,3.3)*step(.35,wv)*(1.-step(40.,H))*step(.06,fract(wu/4.2))*step(fract(wu/4.2),.94); float lit2=step(.35,fract(sin(floor(wu/4.2)*91.7+H)*437.5)); totalEmissiveRadiance+=vec3(1.,.78,.5)*gf*lit2*.07*smoothstep(25.,45.,dist)*(1.-smoothstep(90.,200.,dist)); }`)   /* 1 階の店先に、暖かい灯り（店ごとに点く・点かない） */
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  { vec3 V=normalize(vBw-cameraPosition), R=reflect(V,normalize(vWn)); float fr=.08+.92*pow(1.-max(dot(-V,normalize(vWn)),0.),4.);
    vec3 skyR=mix(vec3(.30,.33,.36),vec3(.42,.56,.72),smoothstep(-.05,.6,R.y)); skyR=mix(skyR,vec3(.16,.15,.14),smoothstep(.02,-.25,R.y));
    float cl=wH(floor(R.xz/(abs(R.y)+.2)*3.))*.12; totalEmissiveRadiance+=(skyR+cl)*wR*min(fr,.6)*(vF.z>=40.?.5:.3); }   /* 窓の白飛びを抑える */`); };
  bldMat.customProgramCacheKey = () => "areaFacade4"; { const f0 = bldMat.onBeforeCompile; bldMat.onBeforeCompile = sh => { f0(sh); sh.uniforms.uDig = A.dig; }; }
  // 2026-10-26 15（本人の方針①「Qualia を主役に、風景は地」）：町の建物は写実を追わず、霧と点と線の「地」に引く。
  // 壁＝足もとに溜まり上へ薄れる霧・階の細い線・窓の位置の小さな点（点群のように）。屋根はほぼ透明、輪郭は細い線。形と高さは OSM（模式）
  const ghostV = sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aF; varying vec3 vF; varying vec3 vGw;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvF=aF; vGw=(modelMatrix*vec4(transformed,1.)).xyz;"); };
  const ghostF = (body) => sh => { ghostV(sh); sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vF; varying vec3 vGw;").replace("#include <color_fragment>", "#include <color_fragment>\n" + body)
    .replace("#include <fog_fragment>", "#ifdef USE_FOG\n float fgF = smoothstep(fogNear, fogFar, vFogDepth); gl_FragColor.a *= 1. - fgF * .85;\n#endif"); };
  const ghostWall = new THREE.MeshBasicMaterial({ color: 0xc9d8de, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
  ghostWall.onBeforeCompile = ghostF(`{ float wu=vF.x, wv=vF.y, H=max(vF.z,1.); float dist=distance(vGw,cameraPosition); if(dist<2.2) discard;
    float tall=step(40.,H); float fl=tall>.5?3.8:3.4, bay=tall>.5?3.0:2.6;
    float mist=exp(-wv/6.)*.11+.02;   /* 足もとに溜まる霧（2026-10-27：箱に見えないよう薄く） */
    float fy=wv/fl; float ld=abs(fract(fy+.5)-.5); float line=(1.-smoothstep(0.,fwidth(fy)*1.1,ld))*step(.5,fy)*step(wv,H-.3);
    vec2 c=vec2(wu/bay+.5, wv/fl); vec2 f=fract(c)-.5; f.x*=bay/fl; float dt=1.-smoothstep(.035,.06,length(f)); dt*=step(1.,wv)*step(wv,H-.6); dt=0.;   /* 2026-10-26 16：窓の位置の点は、近くでは白いぼけた丸（汚れ）に見えた → 点はやめ、霧と線だけに */    /* 2026-10-26 16：遠くで点がにじんで白い丸に見えた → 画面で細かくなる点は描かない */
    float near=1.-smoothstep(40.,260.,dist);
    /* 2026-10-27 夜 融合：壁は点群（1.1 m の格子の点。画面で細かくなりすぎる所は描かない）と、下から上へ走る走査の線、上端の光の輪郭 */
    vec2 pc=vec2(wu/1.1, wv/1.1); vec2 pf=fract(pc)-.5; float pw=max(fwidth(pc.x),fwidth(pc.y)); float ph=fract(sin(dot(floor(pc),vec2(27.1,61.7)))*43758.5);
    float pr=min(.05,pw*.7); float pcd=(1.-smoothstep(pr,pr+pw*.8,length(pf)))*(1.-smoothstep(.10,.22,pw))*step(.45,ph)*step(.5,wv)*step(wv,H-.2)*smoothstep(10.,24.,dist);
    float sy=fract(uDig*.06+fract(wu*.0007)); float scn=exp(-pow((wv/H-sy)*H/.9,2.));
    float top=1.-smoothstep(.0,.35,abs(wv-H));   /* 上端をわずかに締める */
    float body=mix(.30,.16,smoothstep(0.,max(H,8.),wv));   /* 2026-10-27 夜：空が透けて白く飛ばないよう、暗い硝子の体積に（輪郭と点が光る） */
    diffuseColor.rgb=mix(vec3(.13,.18,.22), vec3(.62,.92,.98), clamp(line*.6+top*.8+pcd+scn*.8,0.,1.));
    diffuseColor.a=(body + mist*.5 + line*.22*near + pcd*.55*near + scn*.25*near + top*.35) * mix(1.,.45,smoothstep(150.,700.,dist)); }`);
  { const f0 = ghostWall.onBeforeCompile; ghostWall.onBeforeCompile = sh => { f0(sh); sh.uniforms.uDig = DIG; sh.fragmentShader = sh.fragmentShader.replace("varying vec3 vF; varying vec3 vGw;", "varying vec3 vF; varying vec3 vGw; uniform float uDig;"); }; }
  ghostWall.customProgramCacheKey = () => "areaGhost2";
  const ghostRoof = new THREE.MeshBasicMaterial({ color: 0xc9d8de, transparent: true, opacity: .05, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const ghostSolid = new THREE.MeshBasicMaterial({ color: 0xc9d8de, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true });   // 目印（アリーナ・駅舎）も同じ地に
  ghostSolid.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGw;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvGw=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vGw; uniform float uB; uniform float uDig;").replace("#include <color_fragment>", `#include <color_fragment>
    { float dist=distance(vGw,cameraPosition); if(dist<2.2) discard; float wv=max(0.,vGw.y-uB); float fy=wv/4.; float ld=abs(fract(fy+.5)-.5); float line=(1.-smoothstep(0.,fwidth(fy)*1.1,ld))*step(.5,fy);
      vec3 fn=normalize(cross(dFdx(vGw),dFdy(vGw))); float roof=step(.6,abs(fn.y)); float near=1.-smoothstep(40.,320.,dist);
      vec2 pc=vec2((vGw.x+vGw.z)/1.1, wv/1.1); vec2 pf=fract(pc)-.5; float pw=max(fwidth(pc.x),fwidth(pc.y)); float pr=min(.05,pw*.7); float ph=fract(sin(dot(floor(pc),vec2(27.1,61.7)))*43758.5);
      float pcd=(1.-smoothstep(pr,pr+pw*.8,length(pf)))*(1.-smoothstep(.10,.22,pw))*step(.45,ph)*(1.-roof)*smoothstep(10.,24.,dist);
      float scn=exp(-pow((wv-fract(uDig*.05)*40.)/.8,2.))*(1.-roof);   /* 2026-10-27 夜 融合：点群と、下から上へ走る走査の線 */
      diffuseColor.rgb=mix(vec3(.13,.18,.22),vec3(.62,.92,.98),clamp(line*.6+pcd+scn,0.,1.)); diffuseColor.a=(1.-roof)*(.24+exp(-wv/8.)*.06+line*.3*near+pcd*.5*near+scn*.25*near)+roof*.12; }`)
      .replace("#include <fog_fragment>", "#ifdef USE_FOG\n float fgF = smoothstep(fogNear, fogFar, vFogDepth); gl_FragColor.a *= 1. - fgF * .85;\n#endif"); sh.uniforms.uB = ghostSolid.userData.b; sh.uniforms.uDig = A.dig; };
  ghostSolid.userData.b = { value: 8 }; ghostSolid.customProgramCacheKey = () => "areaGhostS2";
  edgeMat.opacity = .5; edgeMat.color.set(0xa8e4ee);   // 2026-10-27：輪郭を光の線に
  for (const m of [ghostWall, ghostRoof, ghostSolid]) m.userData.land = true;
  const FAC = [[.78,.76,.72],[.86,.84,.80],[.70,.64,.56],[.60,.58,.56],[.74,.70,.62],[.55,.47,.42]], GLS = [[.42,.50,.58],[.38,.46,.52],[.50,.55,.58]];
  for (const m of [roadMat, sandMat, ...GMATS, bldMat, roofMat, edgeMat]) m.userData.land = true;
  /* 2026-10-27 夜 本人「デジタルとフィジカルが融合した空間に」：写実の舗装（CC0）の上に、デジタルの層を重ねる。
     地面＝足もとから広がる光のグリッド（5 m の細い線・25 m の太い線）と、見る人から広がる走査の輪・データの粒。近くは控えめ、10〜80 m で読め、遠くで消える。上品に、やりすぎない */
  const DIG = { value: 0 }; A.dig = DIG;
  const DIGI = `{ vec2 gp=vGw.xz; float dc=distance(vGw.xz,cameraPosition.xz);
    vec2 g1=abs(fract(gp/5.+.5)-.5)/max(fwidth(gp/5.),1e-4); float l1=1.-min(min(g1.x,g1.y)/1.1,1.);
    vec2 g2=abs(fract(gp/25.+.5)-.5)/max(fwidth(gp/25.),1e-4); float l2=1.-min(min(g2.x,g2.y)/1.4,1.);
    float fz=smoothstep(4.,14.,dc)*(1.-smoothstep(70.,150.,dc));
    float ph=fract(uDig*.11); float scan=exp(-pow((dc-ph*110.)/2.2,2.))*(1.-ph);
    vec2 cid=floor(gp/2.5); float hh=fract(sin(dot(cid,vec2(12.9898,78.233)))*43758.5453); vec2 cf=fract(gp/2.5)-.5;
    float dot1=(1.-smoothstep(.03,.05,length(cf)))*step(.9,hh)*(.5+.5*sin(uDig*1.7+hh*40.))*(1.-smoothstep(25.,60.,dc))*step(fwidth(gp.x/2.5),.12);
    vec3 dcol=vec3(.50,.86,.92);
    totalEmissiveRadiance+=dcol*(l1*.1*fz+l2*.36*fz+scan*(.3+l1*.7)+dot1*.3); }`;
  const digiG = og => sh => { og(sh); sh.uniforms.uDig = DIG; sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uDig;").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + DIGI); };
  for (const m of GMATS) { m.onBeforeCompile = digiG(m.onBeforeCompile); m.customProgramCacheKey = () => "areaGroundDig1"; }
  /* 2026-10-27 本人「道路もリアルに」：アスファルト（CC0）の上に、実寸の路面の標示（模式）。道の端の白線（幅 15 cm）・中央の白い破線（6 m 引き 9 m 空け）・道の両端の横断歩道（幅 45 cm の白線を 45 cm おき・長さ 4 m）と停止線（幅 45 cm）・端の側溝の暗い帯（50 cm）・ときどきマンホール（直径 60 cm）。標示の位置は OSM の道の線からの模式で、実際の車線数は反映していない */
  const ROADMK = `{ float t=vRL.x, sv=vRL.y, hw=max(vRL.z,1.), TL=vRL.w; float as=abs(sv); float aa=fwidth(sv)*1.2+.01, at=fwidth(t)*1.2+.01;
    float gut=1.-smoothstep(hw-.5-aa,hw-.5,as); diffuseColor.rgb*=mix(.62,1.,gut);
    float edge=(1.-smoothstep(.075-aa,.075,abs(as-(hw-.75))))*step(2.6,hw);
    float cen=(1.-smoothstep(.075-aa,.075,as))*step(.4,fract(t/15.))*step(4.5,hw);
    float te=min(t,TL-t); float cw=step(1.2,te)*step(te,5.2)*step(.5,fract(sv/.9))*step(as,hw-.9)*step(28.,TL);
    float stp=(1.-smoothstep(.225-at,.225,abs(te-6.2)))*step(as,hw-.9)*step(sv,0.)*step(28.,TL);
    vec2 mh=vec2(fract(t/37.)*37.-18.,sv-hw*.45); float man=1.-smoothstep(.29,.3+aa,length(mh)); float manr=man*(1.-smoothstep(.24,.25,length(mh))); vec2 gq=abs(fract(mh*8.)-.5); man*=.8+.2*step(.42,max(gq.x,gq.y)); /* マンホールは無地の格子（市の柄は写さない） */
    float wl=clamp(edge+cen+cw+stp,0.,1.)*(.86+.14*fract(sin(dot(floor(vGw.xz*3.),vec2(12.9,78.2)))*4375.));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.86,.82),wl*.9); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.16,.17),man*.85); diffuseColor.rgb+=manr*.05; }`;
  roadMat.onBeforeCompile = digiG(sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGw; attribute vec4 aRL; varying vec4 vRL;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGw=(modelMatrix*vec4(transformed,1.)).xyz; vRL=aRL;"); sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vGw; varying vec4 vRL;").replace("#include <map_fragment>", "#include <map_fragment>\n" + ROADMK); });
  roadMat.customProgramCacheKey = () => "areaRoadDig2";
  // 2026-10-26 2：駅前の地形の写真（屋根の写った空中写真）が道と地面の上に白くかぶっていた → 参道の道と同じく、道と地面の画素に印を付けて地形を描かない
  for (const m of [roadMat, ...GMATS]) { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp; }
  function buildChunk(Z, J) {
    const G = new THREE.Group(); G.name = "area_" + Z.id; const C = { Z, J, g: G, w: J.w, tiles: {}, places: [] };
    for (const w of J.w) { let b = [1e9, 1e9, -1e9, -1e9]; for (let i = 1; i < w.length; i += 2) { b[0] = Math.min(b[0], w[i]); b[1] = Math.min(b[1], w[i + 1]); b[2] = Math.max(b[2], w[i]); b[3] = Math.max(b[3], w[i + 1]); } w.b = b; }
    // 道の帯
    const pos = [], ruv = [], spos = [], suv = [], rln = [];   // rln＝道の中の座標（進む向きの距離・横の位置・半幅・道の全長）＝白線と横断歩道を描く
    for (const w of J.w) { const hw = w[0]; const cx0 = (w.b[0] + w.b[2]) / 2, cz0 = (w.b[1] + w.b[3]) / 2, inPk = !!(PK && PK.box && cx0 > PK.box[0] && cx0 < PK.box[2] && cz0 > PK.box[1] && cz0 < PK.box[3]); const pa = inPk ? spos : pos, ua = inPk ? suv : ruv; let TL = 0; for (let i = 1; i + 3 < w.length; i += 2) TL += Math.hypot(w[i + 2] - w[i], w[i + 3] - w[i + 1]); let T0 = 0;
      for (let i = 1; i + 3 < w.length; i += 2) { const ax = w[i], az = w[i + 1], bx = w[i + 2], bz = w[i + 3], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * hw, nz = dx / l * hw;
        const P = [[ax + nx, az + nz], [ax - nx, az - nz], [bx - nx, bz - nz], [bx + nx, bz + nz]].map(([x, z]) => [x, groundY(x, z) + .1, z]);
        const RL = [[T0, hw], [T0, -hw], [T0 + l, -hw], [T0 + l, hw]];
        for (const k of [0, 1, 2, 0, 2, 3]) { pa.push(...P[k]); ua.push(P[k][0] / 4, P[k][2] / 4); if (!inPk) rln.push(RL[k][0], RL[k][1], hw, TL); } T0 += l; } }
    if (spos.length) { const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(spos, 3)); sg.setAttribute("uv", new THREE.Float32BufferAttribute(suv, 2)); sg.computeVertexNormals(); const sm = new THREE.Mesh(sg, sandMat); sm.renderOrder = -3; G.add(sm); }   // 公園の中の道は、アスファルトでなく砂利と土（CC0）
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute("aRL", new THREE.Float32BufferAttribute(rln, 4)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(ruv, 2)); rg.computeVertexNormals();
    const road = new THREE.Mesh(rg, roadMat); road.renderOrder = -3; road.name = "areaRoad"; G.add(road); C.road = road;
    // 地形（DEM）の外の地面：エリアの中の 20 m の区画だけ（模式の平らな地）
    const P = Z.poly; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let i = 0; i < P.length; i += 2) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); z0 = Math.min(z0, P[i + 1]); z1 = Math.max(z1, P[i + 1]); }
    const CS = 20, gps = [[], [], []]; let gp;
    if (Z.ground) for (let z = z0; z < z1; z += CS) for (let x = x0; x < x1; x += CS) { const cx = x + CS / 2, cz = z + CS / 2; if (!inside(P, cx, cz) || (inDem(cx, cz) && !Z.groundAll)) continue; const y = Math.min(groundY(x, z), groundY(x + CS, z), groundY(x, z + CS), groundY(x + CS, z + CS), groundY(cx, cz)) - .06;   /* 2026-10-27：地面の板が道より高くなって、道（アスファルトと白線）を覆っていた → 四隅でいちばん低い高さに */ const bh = Math.abs(Math.sin(Math.floor(cx / 40) * 12.9898 + Math.floor(cz / 40) * 78.233) * 43758.5453) % 1; gp = gps[Z.id === "nishi" ? 1 : Z.id === "shintoshin" ? 2 : 0];   // 2026-10-26 3：エリアごとに舗装の材を変える（東口＝石の舗装・西口＝コンクリート平板・新都心＝御影石の板）。区画で舗装を切りかえると帯に見えた（採点）→ 一種に戻し、柄のむらはシェーダで
      gp.push(x, y, z, x, y, z + CS, x + CS, y, z, x + CS, y, z, x, y, z + CS, x + CS, y, z + CS); }
    C.grounds = []; for (let k = 0; k < 3; k++) { gp = gps[k]; if (gp.length) { const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3)); const gu = []; for (let i = 0; i < gp.length; i += 3) { const us = k === 0 ? 4.2 : k === 1 ? 2.4 : 7; gu.push(gp[i] / us, gp[i + 2] / us); } gg.setAttribute("uv", new THREE.Float32BufferAttribute(gu, 2)); gg.computeVertexNormals(); const gm = new THREE.Mesh(gg, GMATS[k]); gm.renderOrder = -3; gm.name = "areaGround"; G.add(gm); C.grounds.push(gm); C.ground ||= gm; } }
    world.add(G);
    buildLandmarks(Z, J, G); if (G.userData.lmTrees) C.lmTrees = G.userData.lmTrees;
    if (Z.ground && /^(higashi|nishi|shintoshin)$/.test(Z.id)) { buildStreet(Z, J, G, C); buildMarks(Z, J, G); }   // 参道の区画には置かない   // 2026-10-27：町の街路樹・街灯（OSM の道の線に沿った模式）
    onChunk?.(Z, J, C);
    return C;
  }
  /* ---------- 目印（2026-10-26 3・模式）：形は公開の地図の輪郭（OSM）と、公開の写真で見た特徴を手で模式にしたもの。写真は写していない ---------- */
  const LM = [
    { id: "arena", area: "shintoshin", c: [16, 1373] },      // さいたまスーパーアリーナ：低い大きな箱に、一段高い客席の棟
    { id: "keyaki", area: "shintoshin", c: [30, 1566] },     // けやきひろば：空中の人工地盤（2 階の高さ）に、ケヤキの林
    { id: "eki1", area: "nishi", c: [-649, 120] }, { id: "eki2", area: "nishi", c: [-625, 88] },   // 大宮駅：ガラスの駅舎
  ];
  // 2026-10-26 3（採点「公園なのに正面にビル」）：大宮公園の園地の中（park.json の格子）にかかる建物は描かない（木立と池を主役に）
  let PK = null; const pkP = fetch(BASE + "park.json?v=20261026p").then(r => r.json()).then(J => { const [x0, z0, cs, nx, nz] = J.g, m = J.g[5]; PK = { x0, z0, cs, nx, nz, m, box: J.box }; }).catch(() => { });
  const inPark = b => { if (!PK) return false; const n = (b.length - 1) / 2; { const B = PK.box; let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += b[1 + i * 2]; cz += b[2 + i * 2]; } cx /= n; cz /= n; if (cx > B[0] && cx < B[2] && cz > B[1] && cz < B[3]) return true; } for (let i = 0; i <= n; i++) { const x = i < n ? b[1 + i * 2] : b.slice(1).filter((_, k) => k % 2 === 0).reduce((a, v) => a + v, 0) / n, z = i < n ? b[2 + i * 2] : b.slice(1).filter((_, k) => k % 2 === 1).reduce((a, v) => a + v, 0) / n;
      for (const [dx, dz] of [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12]]) { const gi = Math.floor((x + dx - PK.x0) / PK.cs), gj = Math.floor((z + dz - PK.z0) / PK.cs); if (gi >= 0 && gj >= 0 && gi < PK.nx && gj < PK.nz && PK.m[gj * PK.nx + gi] === "1") return true; } } return false; };
  const lmAt = b => { const n = (b.length - 1) / 2; let x = 0, z = 0; for (let i = 0; i < n; i++) { x += b[1 + i * 2]; z += b[2 + i * 2]; } x /= n; z /= n; for (const L of LM) if (Math.abs(L.c[0] - x) < 6 && Math.abs(L.c[1] - z) < 6) return L; return null; };
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x8f979e, roughness: .42, metalness: .35 });
  metalMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vMw;").replace("#include <project_vertex>", "#include <project_vertex>\nvMw=(modelMatrix*vec4(transformed,1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vMw;").replace("#include <map_fragment>", "#include <map_fragment>\nfloat ly=fract(vMw.y/1.4); diffuseColor.rgb*=.78+.22*smoothstep(.0,.25,ly); float gb=step(vMw.y-uBase,9.); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.07,.09,.11),gb*step(.1,fract((vMw.x+vMw.z)/3.))); float sm=fract((vMw.x+vMw.z)/4.5); diffuseColor.rgb*=.86+.14*smoothstep(.0,.04,sm)*(1.-smoothstep(.96,1.,sm)); diffuseColor.rgb*=.92+.08*fract(sin(floor((vMw.x+vMw.z)/4.5)*12.9)*437.5);   /* 2026-10-27 夜：外装の板の継ぎ目と板ごとの色の差 */")
      .replace("#include <common>", "#include <common>\nuniform float uBase;"); sh.uniforms.uBase = metalMat.userData.base; };
  metalMat.userData.base = { value: 8 }; metalMat.customProgramCacheKey = () => "lmMetal";
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5b3e, roughness: .72, metalness: 0 });
  const shadowMat = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }); })();   // 置き物の接地の陰
  const deckMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/granite_tile_c5.webp"), normalMap: tex(BASE + "tex/granite_tile_n5.webp", false), color: 0x9a968e, roughness: .85 });
  const slabMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/Concrete034_c5.webp"), color: 0x9a9893, roughness: .9, emissive: 0x3a3a38 });
  slabMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vSw; varying vec3 vSn;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvSw=(modelMatrix*vec4(transformed,1.)).xyz; vSn=normalize(mat3(modelMatrix)*objectNormal);"); sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vSw; varying vec3 vSn;").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n{ float dn=step(.6,-vSn.y); vec2 q=abs(fract(vSw.xz/6.+.5)-.5); float lt=(1.-smoothstep(.03,.05,q.x))*step(q.y,.3); totalEmissiveRadiance+=dn*(vec3(.95,.92,.85)*lt*.9+vec3(.5,.86,.92)*(1.-smoothstep(.0,.02,min(q.x,q.y)))*.12); }"); };   /* 2026-10-27 夜：デッキの下の天井に、照明の帯と細い光の格子 */
  slabMat.customProgramCacheKey = () => "slabLit1";   // デッキの下が暗く沈まないよう、裏面に弱い明るさ
  const grassMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/grass5.webp"), color: 0xbdd39a, roughness: 1 }); grassMat.map.repeat?.set(9, 9);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x7d9a62, roughness: .95 }), barkMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 1 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x7d93a1, roughness: .1, metalness: .35, transparent: true, opacity: .86, emissive: 0x1c2a33 });   // 2026-10-27：駅舎のガラスが黒い塊に見えた → 空を映す明るい硝子に
  const bandGlass = new THREE.MeshStandardMaterial({ color: 0x2a3a46, roughness: .08, metalness: .6, emissive: 0x0d161d });   // アリーナのガラスの帯（濃い色で階の帯が読めるように）
  for (const m of [woodMat, grassMat, metalMat, deckMat, slabMat, leafMat, barkMat, glassMat, bandGlass]) m.userData.land = true;
  function polyOf(b) { const n = (b.length - 1) / 2, P = []; for (let i = 0; i < n; i++) P.push(new THREE.Vector2(b[1 + i * 2], b[2 + i * 2])); return P; }
  function extrude(P, y0, h, mat, shrink = 0) {
    let cx = 0, cz = 0; for (const p of P) { cx += p.x; cz += p.y; } cx /= P.length; cz /= P.length;
    const Q = P.map(p => new THREE.Vector2(cx + (p.x - cx) * (1 - shrink), -(cz + (p.y - cz) * (1 - shrink))));
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(Q), { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
    return new THREE.Mesh(g, mat);
  }
  const lmEdge = new THREE.LineBasicMaterial({ color: 0xb4ecf4, transparent: true, opacity: .62, depthWrite: false }); lmEdge.userData.land = true;
  const colGhost = new THREE.MeshBasicMaterial({ color: 0xc9d8de, transparent: true, opacity: .1, depthWrite: false, fog: true }); colGhost.userData.land = true;   // 柱はごく淡く
  function gEx(P, y0, h, shrink = 0, mat = ghostSolid) { const m = extrude(P, y0, h, mat, shrink); m.renderOrder = 2; const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), lmEdge); m.add(e); return m; }   // 2026-10-26 15：目印は霧の面に、はっきりした輪郭の線
  function colShadows(G, pts) {   /* 2026-10-27 夜：柱の足もとに接地の陰（デッキが浮いて見えないように） */
    const g = new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), im = new THREE.InstancedMesh(g, shadowMat, pts.length), M4 = new THREE.Matrix4(); pts.forEach(([x, z], i) => im.setMatrixAt(i, M4.makeTranslation(x, groundY(x, z) + .04, z))); im.renderOrder = -1; G.add(im);
    const sh = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); return sh; }
  /* 2026-10-27 町の作り直し：広い道（片側 4 m 以上）の両側に、街路樹（参道と同じケヤキの形・小さめ）と街灯を、道の線に沿って模式で置く。建物の中・公園の中には置かない。
     位置は OSM の道の線から作った模式で、実在の一本ずつではない */
  const lampG = (() => { const p = new THREE.CylinderGeometry(.07, .09, 6, 6).translate(0, 3, 0), a = new THREE.BoxGeometry(1.1, .08, .08).translate(.5, 5.95, 0); return { p, a, h: new THREE.BoxGeometry(.5, .12, .28).translate(1.0, 5.86, 0) }; })();
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3e4247, roughness: .5, metalness: .6 }), lampHead = new THREE.MeshBasicMaterial({ color: 0xfff2d6, toneMapped: false });
  for (const m of [lampMat]) m.userData.land = true;
  /* 2026-10-27 本人「道路もリアルに」：渋谷（aoi-walk-shibuya 3aaa31b）と同じ作り＝路面の標示を、地面より少し上に浮かせた細い帯の形で描く（どの舗装の上でも見える）。
     片側 4 m 以上の道＝中央の白い破線（5 m 引いて 5 m 空け）と外側線（幅 15 cm）・縁石（幅 24 cm・高さ 16 cm）・道の両端に横断歩道（幅 45 cm の縞・長さ 4 m）。実寸の模式で、実際の車線数・横断歩道の位置は反映していない */
  const densify = (P, step) => { const o = [P[0]]; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / step)); for (let k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return o; };
  const offsetLine = (P, d) => P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1; return [p[0] - tz / l * d, p[1] + tx / l * d]; });
  const ribbon = (P, w, lift, pos, uv, idx) => { const b = pos.length / 3; let acc = 0;
    for (let i = 0; i < P.length; i++) { const a = P[Math.max(0, i - 1)], c = P[Math.min(P.length - 1, i + 1)], tx = c[0] - a[0], tz = c[1] - a[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l * w / 2, nz = tx / l * w / 2; if (i) acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      for (const sg of [1, -1]) { const x = P[i][0] + nx * sg, z = P[i][1] + nz * sg; pos.push(x, groundY(x, z) + lift, z); uv.push(sg > 0 ? 0 : w, acc); } }
    for (let i = 0; i + 1 < P.length; i++) { const k = b + i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } };
  const markMat = kind => { const m = new THREE.MeshStandardMaterial({ color: kind === 3 ? "#a9a6a0" : "#d9d8d2", roughness: .75, metalness: 0, polygonOffset: true, polygonOffsetFactor: kind === 3 ? -9 : -10, polygonOffsetUnits: kind === 3 ? -9 : -10 });
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n" + (kind === 1 ? "if (fract(vUv.y / 10.) > .5) discard;" : kind === 2 ? "if (fract(vUv.x / .9) > .5) discard;" : "") + "\nfloat wear = fract(sin(dot(floor(vUv * vec2(9., 3.)), vec2(12.9898, 78.233))) * 43758.5); diffuseColor.rgb *= .84 + .16 * wear;"); };
    m.defines = { USE_UV: "" }; m.customProgramCacheKey = () => "omMark" + kind; m.userData.land = true; return m; };
  const asphMat = new THREE.MeshStandardMaterial({ map: tex(BASE + "tex/Asphalt023S_c5.webp"), normalMap: mobile ? null : tex(BASE + "tex/Asphalt023S_n5.webp", false), color: 0x6b6862, roughness: .92, metalness: 0, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });   // 車道のアスファルト（CC0・ambientCG Asphalt023S）
  asphMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n{ float n = fract(sin(dot(floor(vMapUv * vec2(.5, .08)), vec2(12.9, 78.2))) * 4375.); diffuseColor.rgb *= .9 + .14 * n; }"); };
  asphMat.map.repeat?.set(.25, .25); if (asphMat.normalMap) asphMat.normalMap.repeat.set(.25, .25);
  asphMat.customProgramCacheKey = () => "omAsph2"; asphMat.userData.land = true;
  const tactMat = new THREE.MeshStandardMaterial({ color: "#d9b43a", roughness: .8, polygonOffset: true, polygonOffsetFactor: -9, polygonOffsetUnits: -9 });   // 点字ブロック（警告の点状・30 cm 角の模式）
  tactMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n{ vec2 c = fract(vUv / .3); float g = step(.03, c.x) * step(.03, c.y); vec2 d = fract(vUv / .075) - .5; float dot2 = 1. - smoothstep(.16, .26, length(d)); diffuseColor.rgb *= mix(.5, 1., g) * mix(.72, 1.08, dot2); }"); };
  tactMat.defines = { USE_UV: "" }; tactMat.customProgramCacheKey = () => "omTact1"; tactMat.userData.land = true;
  const MARK = [markMat(0), markMat(1), markMat(2), markMat(3), asphMat, tactMat];
  function buildMarks(Z, J, G) {
    const B = [0, 1, 2, 3, 4, 5].map(() => ({ pos: [], uv: [], idx: [] }));
    for (const w of J.w) { const hw = w[0]; if (hw < 2.5) continue; const P0 = []; for (let i = 1; i + 1 < w.length; i += 2) P0.push([w[i], w[i + 1]]); if (P0.length < 2) continue;
      const cx = P0.reduce((a, p) => a + p[0], 0) / P0.length, cz = P0.reduce((a, p) => a + p[1], 0) / P0.length; if (!inside(Z.poly, cx, cz)) continue; const P = densify(P0, 3);
      let TL = 0; for (let i = 1; i < P.length; i++) TL += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      ribbon(P, hw * 2, .05, B[4].pos, B[4].uv, B[4].idx);   // 車道のアスファルト
      if (hw >= 3.5) for (const sg of [-1, 1]) ribbon(offsetLine(P, sg * (hw + .12)), .3, .2, B[3].pos, B[3].uv, B[3].idx);   // 縁石（広い道だけ。商店街の細い道には付けない）
      if (hw >= 3.5) { ribbon(P, .15, .07, B[1].pos, B[1].uv, B[1].idx); for (const sg of [-1, 1]) ribbon(offsetLine(P, sg * (hw - .5)), .15, .07, B[0].pos, B[0].uv, B[0].idx); }
      if (TL > 30) for (const end of [0, 1]) { const Q = end ? P.slice().reverse() : P; const seg = []; let acc = 0; for (let i = 0; i < Q.length; i++) { if (i) acc += Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]); if (acc >= 1.5) seg.push(Q[i]); if (acc > 5.5) break; }
        if (seg.length > 1) { ribbon(seg, Math.max(2, hw * 2 - 1.4), .075, B[2].pos, B[2].uv, B[2].idx); for (const sg of [-1, 1]) { const T2 = offsetLine(seg.slice(0, 2), sg * (hw + .75)); ribbon(T2, .6, .17, B[5].pos, B[5].uv, B[5].idx); } } } }   // 横断歩道の両端の歩道に点字ブロック
    B.forEach((b, k) => { if (!b.idx.length) return; const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2)); g.setIndex(b.idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, MARK[k]); m.renderOrder = 1; m.name = "mark" + k; G.add(m); });
  }
  function buildStreet(Z, J, G, C) {
    const blds = []; for (const k in J.b) for (const b of J.b[k]) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (let i = 1; i < b.length; i += 2) { x0 = Math.min(x0, b[i]); x1 = Math.max(x1, b[i]); z0 = Math.min(z0, b[i + 1]); z1 = Math.max(z1, b[i + 1]); } blds.push({ P: b.slice(1), x0, z0, x1, z1 }); }
    const inB = (x, z) => blds.some(B => x > B.x0 - 1 && x < B.x1 + 1 && z > B.z0 - 1 && z < B.z1 + 1 && inside(B.P, x, z));
    const trees = [], lamps = [], cap = mobile ? 60 : 160;
    for (const w of J.w) { const hw = w[0]; if (hw < 4) continue; let acc = 7;
      for (let i = 1; i + 3 < w.length; i += 2) { const ax = w[i], az = w[i + 1], bx = w[i + 2], bz = w[i + 3], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); if (L < 1) continue; const nx = -dz / L, nz = dx / L;
        for (let t = acc; t < L; t += 13) { const px = ax + dx * t / L, pz = az + dz * t / L, n = Math.round(t / 13);
          for (const sd of [1, -1]) { const x = px + nx * (hw + 1.6) * sd, z = pz + nz * (hw + 1.6) * sd; if (!inside(Z.poly, x, z) || inB(x, z) || (PK && inPark([0, x, z, x + .1, z, x, z + .1]))) continue;
            if (n % 2 === 0 && trees.length < cap) trees.push([x, groundY(x, z), z, .34 + .08 * ((Math.sin(x * 3.1 + z) + 1) / 2)]); else if (lamps.length < cap / 2) lamps.push([x, groundY(x, z), z, Math.atan2(-nx * sd, -nz * sd)]); } }
        acc = ((acc - L) % 13 + 13) % 13; } }
    if (trees.length) C.lmTrees = (C.lmTrees || []).concat(trees);
    if (lamps.length) { const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
      for (const [geo, mat] of [[lampG.p, lampMat], [lampG.a, lampMat], [lampG.h, lampHead]]) { const im = new THREE.InstancedMesh(geo, mat, lamps.length); lamps.forEach(([x, y, z, r], i) => im.setMatrixAt(i, M4.compose(P.set(x, y, z), Q.setFromAxisAngle(Y, r - Math.PI / 2), S))); G.add(im); }
      const sg = new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), si = new THREE.InstancedMesh(sg, shadowMat, lamps.length); lamps.forEach(([x, y, z], i) => si.setMatrixAt(i, M4.makeTranslation(x, y + .04, z))); si.renderOrder = -1; G.add(si); }
  }
  function buildLandmarks(Z, J, G) {
    const all = []; for (const k in J.b) for (const b of J.b[k]) { const L = lmAt(b); if (L) all.push([L, b]); }
    for (const [L, b] of all) { const P = polyOf(b); let y = 1e9; for (const p of P) y = Math.min(y, groundY(p.x, p.y));
      if (L.id === "arena") { ghostSolid.userData.b.value = y; G.add(gEx(P, y, 38, 0, metalMat), gEx(P, y + 38, 26, .42, metalMat), gEx(P, y + 9, 4.5, -.012, glassMat), gEx(P, y + 22, 3, -.012, glassMat), gEx(P, y + 6.2, .5, -.05, slabMat));   /* 2026-10-27 夜：アリーナにガラスの帯と大きな庇（壁一枚の塊にしない・模式） */ const ring = gEx(P, y + 37.4, .4, -.015, slabMat);   /* 2026-10-27 夜：写実の外装に、輪郭の光の線を重ねる */ G.add(ring); }
      else if (L.id === "keyaki") { const top = y + 7;
        ghostSolid.userData.b.value = y; const slab = gEx(P, top - 1.1, 1.1, 0, slabMat); const deck = extrude(P, top, .02, deckMat); G.add(slab, deck);   /* 2026-10-26 16：けやきひろばの土台も霧と線に（床だけ歩ける面） */
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of P) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); }
        const inP = (x, z) => inside(P.flatMap(p => [p.x, p.y]), x, z);
        const col = [], tr = []; for (let x = x0 + 8; x < x1 - 4; x += 18) for (let z = z0 + 8; z < z1 - 4; z += 18) if (inP(x, z)) col.push([x, z]);   // 2026-10-27：柱を間引く（模型のように見えた）
        for (let x = x0 + 5; x < x1 - 3; x += 8) for (let z = z0 + 5; z < z1 - 3; z += 8) if (inP(x, z)) tr.push([x + (Math.sin(x * 3.1 + z) * 1.2), z + Math.cos(z * 2.3 + x) * 1.2]);
        const cg = new THREE.CylinderGeometry(.45, .45, 6, 8); cg.translate(0, 3, 0); const cm = new THREE.InstancedMesh(cg, slabMat, col.length); cm.renderOrder = 2; const M4 = new THREE.Matrix4();
        col.forEach(([x, z], i) => cm.setMatrixAt(i, M4.makeTranslation(x, groundY(x, z) - .1, z))); G.add(cm); colShadows(G, col);
        G.userData.lmTrees = tr.map(([x, z]) => [x, top, z]); }   // 木は app 側で参道と同じケヤキを植える（C.lmTrees）
      else if (L.id === "eki1" || L.id === "eki2") { const h = b[0]; G.add(gEx(P, y, h, .02, glassMat)); }
    }
    // 西口のデッキ（模式）：駅から西へ、2 階の高さで歩く人を渡す床と柱と手すり
    if (Z.id === "nishi") { const y = groundY(-745, 110) + 6.5, P = [[-780, 80], [-712, 80], [-712, 140], [-780, 140]].map(([x, z]) => new THREE.Vector2(x, z));
      G.add(gEx(P, y - 1.5, 1.5, 0, slabMat), extrude(P, y, .02, deckMat), gEx(P, y - 1.62, .12, -.01, metalMat));   /* 2026-10-27 夜：デッキに厚みと縁の梁 */
            { const gy = groundY(-745, 110) + .05, sm = extrude(P, gy, .01, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .32, depthWrite: false }), .04); sm.renderOrder = -1; G.add(sm); }   /* デッキの下の地面の陰 */
      const cg = new THREE.CylinderGeometry(.5, .5, 6.5, 8); cg.translate(0, 3.25, 0); const pts = []; for (let x = -774; x <= -718; x += 14) for (let z = 86; z <= 134; z += 16) pts.push([x, z]);
      const cm = new THREE.InstancedMesh(cg, slabMat, pts.length), M4 = new THREE.Matrix4(); pts.forEach(([x, z], i) => cm.setMatrixAt(i, M4.makeTranslation(x, groundY(x, z) - .1, z))); G.add(cm); colShadows(G, pts);
      const rl = []; for (let i = 0; i < 4; i++) { const a = P[i], c = P[(i + 1) % 4]; rl.push(a.x, y + 1.1, a.y, c.x, y + 1.1, c.y); } const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(rl, 3)); G.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xd8dde0 }))); }
    // 2026-10-26 3：広場の手がかり（車止め・植え込みの箱・ベンチ。模式）
    const props = (cx, cz, r, n, kind) => { const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
      if (kind === "bench") { const parts = [[new THREE.BoxGeometry(1.8, .05, .12).translate(0, .44, -.16), woodMat], [new THREE.BoxGeometry(1.8, .05, .12).translate(0, .44, 0), woodMat], [new THREE.BoxGeometry(1.8, .05, .12).translate(0, .44, .16), woodMat], [new THREE.BoxGeometry(.06, .42, .44).translate(-.75, .21, 0), metalMat], [new THREE.BoxGeometry(.06, .42, .44).translate(.75, .21, 0), metalMat], [new THREE.PlaneGeometry(2.3, 1).rotateX(-Math.PI / 2).translate(0, .02, 0), shadowMat]];
        for (const [g, m] of parts) { const im = new THREE.InstancedMesh(g, m, n); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2); M4.compose(P.set(x, groundY(x, z), z), Q, S); im.setMatrixAt(i, M4); } G.add(im); } return; }
      const geo = kind === "bollard" ? new THREE.CylinderGeometry(.1, .12, .85, 14).translate(0, .42, 0) : new THREE.CylinderGeometry(.8, .7, .6, 20).translate(0, .3, 0);
      if (kind === "bollard") { const sg = new THREE.PlaneGeometry(.5, .5).rotateX(-Math.PI / 2).translate(0, .02, 0), sim = new THREE.InstancedMesh(sg, shadowMat, n); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; M4.compose(P.set(x, groundY(x, z), z), Q, S); sim.setMatrixAt(i, M4); } G.add(sim); }
      const im = new THREE.InstancedMesh(geo, kind === "bollard" ? metalMat : slabMat, n); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a); M4.compose(P.set(x, groundY(x, z), z), Q, S); im.setMatrixAt(i, M4); } G.add(im);
      if (kind === "planter") { const g2 = new THREE.BoxGeometry(2.0, .25, .9).translate(0, .72, 0), im2 = new THREE.InstancedMesh(g2, grassMat, n); for (let i = 0; i < n; i++) { im.getMatrixAt(i, M4); im2.setMatrixAt(i, M4); } G.add(im2); } };
    if (Z.id === "higashi") { props(-540, 70, 11.2, 22, "bollard"); props(-562, 98, 7, 4, "bench"); }   /* 採点：灰色の箱のベンチ・植え込みは「ないほうがまし」→ 車止めだけ */
    if (Z.id === "shintoshin") { props(140, 1330, 12, 18, "bollard"); props(60, 1460, 10, 6, "bench"); }
    
    // 東口のロータリー（模式）：まるい植え込みの島と、バスの待つ屋根
    if (Z.id === "higashi") { const cx = -540, cz = 70, y = groundY(cx, cz);
      const isl = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.3, .35, 40), grassMat); { const sr = new THREE.Mesh(new THREE.RingGeometry(9.3, 10.6, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false })); sr.position.set(cx, y + .03, cz); G.add(sr); /* 縁石の足もとの陰 */ }
      isl.position.set(cx, y + .17, cz); const curb = new THREE.Mesh(new THREE.TorusGeometry(9.2, .18, 6, 48).rotateX(Math.PI / 2), slabMat); curb.position.set(cx, y + .3, cz); G.add(isl, curb);
      for (let k = 0; k < 3; k++) { const a = -.6 + k * .6, x = cx + Math.cos(a) * 17, z = cz + Math.sin(a) * 17, sh = new THREE.Group();
        const roof = new THREE.Mesh(new THREE.BoxGeometry(8, .15, 2.4), glassMat); roof.position.y = 2.8; sh.add(roof); for (const dx of [-3.6, 3.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 2.8, 6), slabMat); p.position.set(dx, 1.4, -.9); sh.add(p); }
        sh.position.set(x, groundY(x, z), z); sh.rotation.y = -a + Math.PI / 2; G.add(sh); } }
  }
  function buildTile(C, key) {
    const list = C.J.b[key]; const wp = [], wf = [], wc = [], rp = [], ep = [];
    for (const b of list) { if (lmAt(b) || inPark(b)) continue; const hr = Math.abs(Math.sin(b[1] * 12.99 + b[2] * 78.23) * 43758.5) % 1, h = Math.abs(b[0] - 7) < .01 ? 3.2 * (2 + Math.floor(hr * hr * 5)) : b[0],   /* 2026-10-27：高さの分からない建物（OSM で 7 m の仮の値）は、2〜6 階の低めの雑居ビルにばらす（大宮東口の町並みの密度に寄せる・模式） */ n = (b.length - 1) / 2; let y = 1e9; for (let i = 0; i < n; i++) y = Math.min(y, groundY(b[1 + i * 2], b[2 + i * 2]));
      const sd = Math.abs(Math.sin(b[1] * 12.9898 + b[2] * 78.233)) % 1, col = h >= 40 ? GLS[(sd * 3) | 0] : FAC[(sd * 6) | 0];
      // 輪郭の回りの向きをそろえる（外向きの面が表になるように）
      let ar = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; ar += b[1 + i * 2] * b[2 + j * 2] - b[1 + j * 2] * b[2 + i * 2]; }
      let u = 0;
      for (let k = 0; k < n; k++) { const i = ar > 0 ? k : n - 1 - k, j = ar > 0 ? (k + 1) % n : (n - 2 - k + n) % n, ax = b[1 + i * 2], az = b[2 + i * 2], bx = b[1 + j * 2], bz = b[2 + j * 2], L = Math.hypot(bx - ax, bz - az);
        wp.push(ax, y, az, ax, y + h, az, bx, y + h, bz, ax, y, az, bx, y + h, bz, bx, y, bz);
        wf.push(u, 0, h, u, h, h, u + L, h, h, u, 0, h, u + L, h, h, u + L, 0, h); for (let q = 0; q < 6; q++) wc.push(...col);
        ep.push(ax, y + h, az, bx, y + h, bz, ax, y, az, ax, y + h, az); u += L; }
      const pts = []; for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(b[1 + i * 2], b[2 + i * 2]));
      const tri = THREE.ShapeUtils.triangulateShape(pts, []); for (const t of tri) for (const k of t) rp.push(pts[k].x, y + h, pts[k].y); }
    const T = new THREE.Group();
    const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3)); wg.setAttribute("aF", new THREE.Float32BufferAttribute(wf, 3)); wg.setAttribute("color", new THREE.Float32BufferAttribute(wc, 3));
    const uv = []; for (let i = 0; i < wf.length; i += 3) uv.push(wf[i] / 2.6, wf[i + 1] / 2.6); wg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); wg.computeVertexNormals();
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3)); const ru = []; for (let i = 0; i < rp.length; i += 3) ru.push(rp[i] / 6, rp[i + 2] / 6); rg.setAttribute("uv", new THREE.Float32BufferAttribute(ru, 2)); rg.computeVertexNormals();
    const eg = new THREE.BufferGeometry(); eg.setAttribute("position", new THREE.Float32BufferAttribute(ep, 3));
    const wm = new THREE.Mesh(wg, bldMat), rm2 = new THREE.Mesh(rg, roofMat), el = new THREE.LineSegments(eg, edgeMat); wm.renderOrder = rm2.renderOrder = 2; T.add(wm, rm2, el); C.g.add(T); return T;
  }
  function dropChunk(id) {
    const C = A.chunks[id]; if (!C || !C.g) { delete A.chunks[id]; return; }
    onUnchunk?.(C);
    const keep = new Set([...MARK, bandGlass, colGhost, lmEdge, ghostWall, ghostRoof, ghostSolid, roadMat, sandMat, ...GMATS, bldMat, roofMat, edgeMat, woodMat, shadowMat, grassMat, metalMat, deckMat, slabMat, leafMat, barkMat, glassMat]); C.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && !keep.has(o.material)) o.material.dispose(); }); world.remove(C.g); delete A.chunks[id];
  }
  function ensure(Z) {
    if (!Z.chunk) return Promise.resolve(null);
    const c = A.chunks[Z.id]; if (c) return c.p;
    const e = A.chunks[Z.id] = { p: null };
    e.p = Promise.all([fetch(BASE + "areas/" + Z.id + ".json?v=" + VER).then(r => r.json()), pkP]).then(([J]) => { if (A.chunks[Z.id] !== e) return null; Object.assign(e, buildChunk(Z, J)); e.ok = true; return e; }).catch(err => { console.warn("area", Z.id, err); delete A.chunks[Z.id]; return null; });
    return e.p;
  }
  A.ensure = id => ensure(A.byId[id]);
  A.onCarriage = (x, z) => { for (const id in A.chunks) { const C = A.chunks[id]; if (!C.ok || !C.Z.ground) continue; for (const w of C.w) { const r = w[0]; if (r < 2.5) continue; const b = w.b; if (x < b[0] - r || x > b[2] + r || z < b[1] - r || z > b[3] + r) continue; for (let i = 1; i + 3 < w.length; i += 2) if (segD(x, z, w[i], w[i + 1], w[i + 2], w[i + 3]) < r) return true; } } return false; };   // 町の車道の上か（碧を立たせない）
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
  A.pickables = () => { const o = []; for (const id in A.chunks) { const C = A.chunks[id]; if (C.road) o.push(C.road); for (const g of C.grounds || []) o.push(g); } return o; };
  A.info = () => { let tiles = 0, roads = 0; for (const id in A.chunks) { const C = A.chunks[id]; if (!C.ok) continue; tiles += Object.keys(C.tiles).length; roads += C.w.length; } return { loaded: Object.keys(A.chunks), tiles, roads, cur: A.cur?.id || null }; };

  A.load = () => A.p ||= fetch(BASE + "zones.json?v=" + VER).then(r => r.json()).then(J => {
    A.zones = J.zones.map(z => ({ ...z })); for (const Z of A.zones) A.byId[Z.id] = Z;
    buildFills(); buildCurtains(); A.ready = true; return A;
  }).catch(e => console.warn("zones", e));

  let checkT = 0;
  A.update = (dt, mode) => { DIG.value += Math.min(.1, dt || 0);
    if (!A.ready) return;
    A.t += dt; const sky = mode === "sky", walk = mode === "walk" || mode === "sight";
    A.fills.visible = false; labBox.hidden = true;   /* 2026-10-28 本人「エリア分けは不要」＝色の面・輪郭・エリアの札を描かない */
    A.curtains.visible = false;
    const cp = camera.position;
    for (const m of A.curtains.children) { const u = m.material.uniforms; u.uT.value = rm ? 0 : A.t; u.uCam.value.copy(cp); u.uK.value = mode === "descend" ? .3 : .38; /* 2026-10-26 15：境界の幕も控えめに */ }
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
    const capOn = document.getElementById("caption") && !document.getElementById("caption").hidden;   /* 2026-10-26 17：字幕が出ているあいだは「この先」を出さない（重なって読めなかった） */
    if (best && !capOn && !tag.classList.contains("on")) { nearEl.style.setProperty("--ac", best.color); nearEl.textContent = `この先　${best.name}`; nearEl.classList.add("on"); } else nearEl.classList.remove("on");
  };
  A.hideAll = () => { tag.classList.remove("on"); nearEl.classList.remove("on"); labBox.hidden = true; };
  return A;
}
