/* Qualia の印（2026-10-23 夜 本人「Qualia をもっと目立つように・美しいグラフィックで・かさねっこの形に似たデザインに」）
   地点の上に、かさねっこの形（丸い体・葉のように少し傾いた先）の半透明の結晶が、層の色に光ってゆっくり回る。
   足もとには層の色の輪と細い HUD の線、地点と結晶をつなぐ細い光の柱。
   遠くは柱と輪を強めて見つけやすく、近づくと結晶の縁と面がくっきりする。層を外すと消える（印の root が見えないとき）。
   描くのは 3 回だけ（結晶・輪・柱をそれぞれ InstancedMesh で、すべての印をまとめる）。
   使い方：const QM = makeQMarks(THREE, parent, n); QM.add(L, color) … 毎こま QM.update(list, camera, { t, focus, sky })
   L は glyph（結晶の位置と大きさ）・root（地面の位置・見える／見えない）・show（0〜1）を持つもの。 */

function crystalGeo(THREE) {
  // かさねっこの輪郭：下は丸く、上は細くなって先が少し横へ傾く。
  // 2026-10-23 深夜 本人「角ばっていて、かさねっこの丸さに足りない」→ 切子をやめ、細かく分けた滑らかな面（輪郭 24 段 × まわり 32）と滑らかな法線に
  const pr = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const a = i / N;                       // 0＝下・1＝先
    const y = -.42 + a * .98;
    const r = a < .38 ? Math.sin(Math.acos(1 - a / .38 * 1.0)) * .30 + .0001 : .30 * Math.pow(1 - (a - .38) / .62, 1.25) + .0001;
    pr.push(new THREE.Vector2(Math.max(.0001, r), y));
  }
  const SEG = 32, g = new THREE.LatheGeometry(pr, SEG);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {      // 先を横へ曲げる（葉の先）
    const y = p.getY(i), k = Math.max(0, y + .05);
    p.setX(i, p.getX(i) + k * k * 1.05);
  }
  g.computeVertexNormals();
  // 継ぎ目（まわりの始めと終わり）の法線をそろえて、縦の筋を出さない
  const nr = g.attributes.normal, P = pr.length, _a = new THREE.Vector3(), _b = new THREE.Vector3();
  for (let j = 0; j < P; j++) { const i0 = j, i1 = SEG * P + j; _a.fromBufferAttribute(nr, i0); _b.fromBufferAttribute(nr, i1); _a.add(_b).normalize(); nr.setXYZ(i0, _a.x, _a.y, _a.z); nr.setXYZ(i1, _a.x, _a.y, _a.z); }
  return g;
}

const VS_COMMON = /* glsl */`
  attribute vec3 iCol; attribute vec4 iP;   // iP: x＝見えかた（0〜1） y＝くっきり（近い） z＝強調 w＝遠さ（0〜1）
  varying vec3 vCol; varying vec4 vP; varying vec3 vW; varying vec3 vL; varying vec3 vN;
`;

export function makeQMarks(THREE, parent, cap, mobile = false, opt = {}) {
  const SKYK = opt.skyK ?? 2.6, SKYR = opt.skyR ?? 2.4, WALKK = opt.walkK ?? 1.05;   // 上空と地上の大きさ（アプリごとに印の root／glyph の拡大のしかたが違うので合わせる）
  cap = Math.max(1, cap);
  const mk = (geo, vs, fs, order, blend) => {
    const g = geo.clone();
    g.setAttribute("iCol", new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
    const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } }, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: blend, side: THREE.DoubleSide, toneMapped: false });
    const im = new THREE.InstancedMesh(g, m, cap); im.count = 0; im.frustumCulled = false; im.renderOrder = order; parent.add(im);
    return im;
  };
  // 結晶：切子の面の明暗＋縁の光（フレネル）＋ゆっくり上る走査の線
  const crystal = mk(crystalGeo(THREE), VS_COMMON + /* glsl */`
    void main(){ vCol=iCol; vP=iP; mat4 mw=modelMatrix*instanceMatrix; vec4 w=mw*vec4(position,1.); vW=w.xyz; vL=position; vN=normalize(mat3(mw)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec3 vW; varying vec3 vL; varying vec3 vN;
    void main(){
      // 滑らかな面の、ガラスの滴のような結晶：中は少し透けて芯がほのかに灯り、縁は層の色に光る
      vec3 n=normalize(vN); vec3 v=normalize(cameraPosition-vW); if(!gl_FrontFacing) n=-n; float nv=clamp(abs(dot(n,v)),0.,1.);
      float fr=pow(1.-nv,2.6);
      vec3 Ld=normalize(vec3(sin(uT*.7),.9,cos(uT*.7)));
      float dif=.45+.55*max(0.,dot(n,Ld));
      float spec=pow(max(0.,dot(reflect(-v,n),Ld)),36.);
      float sc=exp(-pow((fract(vL.y*1.2-uT*.25)-.5)*14.,2.));
      float core=pow(nv,3.)*(.55+.45*sin(uT*1.6+vL.y*3.));   // 芯のほのかな灯り（正面ほど）
      float crisp=vP.y, em=vP.z;
      vec3 sat=mix(vec3(dot(vCol,vec3(.333))),vCol,1.3);
      vec3 c=sat*(.22+.38*dif)+sat*core*.55+sat*fr*(1.5+crisp*.8)+vec3(1.)*pow(fr,3.5)*(.35+crisp*.4)+vec3(1.)*spec*(.55+crisp*.5)+sat*sc*.45;
      float a=(.16+.10*crisp+core*.14+fr*.75+spec*.4+sc*.12)*(.62+.38*em);   // 中は透かす（正面の面は薄く、縁は濃く）
      gl_FragColor=vec4(c*(1.+em*.35),clamp(a,0.,.92)*vP.x);
      #include <colorspace_fragment>
    }`, 7, THREE.NormalBlending);
  // 足もとの輪：細い輪・回る刻み・外の破線・HUD の細い線（地面に平らに）
  const pg = new THREE.PlaneGeometry(2, 2); pg.rotateX(-Math.PI / 2);
  const ring = mk(pg, VS_COMMON + /* glsl */`
    void main(){ vCol=iCol; vP=iP; vL=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec3 vW; varying vec3 vL;
    void main(){
      vec2 p=vL.xz; float r=length(p); float aw=fwidth(r)*1.2; float ang=atan(p.y,p.x);
      float r1=1.-smoothstep(0.,aw,abs(r-.62)-.012);
      float r2=(1.-smoothstep(0.,aw,abs(r-.86)-.008))*step(.5,fract(ang*18./6.2832+uT*.08));
      float tk=(1.-smoothstep(0.,aw,abs(r-.74)-.05))*(1.-smoothstep(0.,.02,abs(fract(ang*4./6.2832-uT*.05)-.5)-.47));
      float ln=(1.-smoothstep(0.,fwidth(p.y)*1.2,abs(p.y)-.004))*step(.86,p.x)*step(p.x,.99);
      float fill=(1.-smoothstep(.0,.62,r))*.18;
      float halo=exp(-pow((r-.62)*7.,2.))*.35;
      float a=(r1*.9+r2*.6+tk*.8+ln*.7+fill+halo)*(.55+.45*vP.z)*(.6+.4*vP.w);
      if(r>1.) discard;
      gl_FragColor=vec4(vCol*(1.15+vP.z*.4),clamp(a,0.,1.)*vP.x);
      #include <colorspace_fragment>
    }`, 4, THREE.NormalBlending);
  // 光の柱：地面から結晶まで、細い光（遠いほど強く＝遠くから見つけやすい）
  const bg = new THREE.PlaneGeometry(1, 1); bg.translate(0, .5, 0); const bg2 = bg.clone(); bg2.rotateY(Math.PI / 2);
  const bgm = new THREE.BufferGeometry(); { const a = bg.toNonIndexed(), b = bg2.toNonIndexed(); const P = new Float32Array([...a.attributes.position.array, ...b.attributes.position.array]), U = new Float32Array([...a.attributes.uv.array, ...b.attributes.uv.array]); bgm.setAttribute("position", new THREE.BufferAttribute(P, 3)); bgm.setAttribute("uv", new THREE.BufferAttribute(U, 2)); }
  const beam = mk(bgm, VS_COMMON + /* glsl */`
    varying vec2 vUv; void main(){ vCol=iCol; vP=iP; vUv=uv; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec2 vUv; varying vec3 vW;
    void main(){
      float x=abs(vUv.x-.5)*2.; float core=exp(-x*x*18.); float y=vUv.y;
      float pulse=exp(-pow((fract(y*.8-uT*.4)-.5)*9.,2.))*.6;
      float a=core*(.25+.75*(1.-y)*.6+pulse)*(.25+.75*vP.w)*(1.-smoothstep(.9,1.,y));
      gl_FragColor=vec4(vCol*1.25,clamp(a,0.,1.)*vP.x*.8);
      #include <colorspace_fragment>
    }`, 3, THREE.AdditiveBlending);

  const items = [];
  const _p = new THREE.Vector3(), _r = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _e = new THREE.Euler(), _c = new THREE.Color();
  const one = new THREE.Vector3(1, 1, 1);
  const rects = [], _sp = new THREE.Vector3();
  return {
    add(L, color) { _c.set(color); items.push({ L, c: [_c.r, _c.g, _c.b], ph: items.length * 1.7 }); },
    get count() { return items.length; },
    get rects() { return rects; },
    update(cam, o = {}) {
      const t = o.t ?? performance.now() / 1000, sky = !!o.sky, focus = o.focus || null;
      crystal.material.uniforms.uT.value = ring.material.uniforms.uT.value = beam.material.uniforms.uT.value = t;
      const CA = crystal.geometry.attributes, RA = ring.geometry.attributes, BA = beam.geometry.attributes;
      let n = 0; rects.length = 0;
      const ppk = innerHeight / (2 * Math.tan((cam.fov || 50) * Math.PI / 360));
      for (const it of items) {
        const L = it.L; if (!L.root.visible || !(L.show > .01) || n >= cap) continue;
        L.glyph.getWorldPosition(_p); L.root.getWorldPosition(_r); L.glyph.getWorldScale(_s);
        const sg = _s.x, d = _p.distanceTo(cam.position), dh = Math.hypot(_p.x - cam.position.x, _p.z - cam.position.z);
        const crisp = sky ? .2 : 1 - Math.min(1, Math.max(0, (dh - 8) / 40));        // 近いほどくっきり
        const far = sky ? 1 : Math.min(1, Math.max(0, (dh - 12) / 90));               // 遠いほど柱と輪を強める
        const em = focus ? (focus === L ? 1 : .15) : (L.open ? Math.max(.5, L.open) : .5);   // 選んだ物を濃く、ほかを薄く
        const show = L.show * (focus && focus !== L ? .45 : 1);
        // 結晶：ゆっくり回り、少し浮き沈み
        const cs = (sky ? SKYK : WALKK) * sg * (1 + (L.open || 0) * .25);
        _e.set(0, t * .5 + it.ph, 0); _q.setFromEuler(_e); _s.set(cs, cs, cs);
        _m.compose(_p.set(_p.x, _p.y + Math.sin(t * 1.3 + it.ph) * .06 * sg, _p.z), _q, _s); crystal.setMatrixAt(n, _m);
        const nearK = sky || focus === L ? 1 : Math.min(1, Math.max(.12, (d - 1.4) / 2.6));   // 目の前（3 m より近く）では結晶をうすく（視野をふさがない）
        CA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); CA.iP.setXYZW(n, show * nearK, crisp, em, far);
        if (!sky && show * nearK > .2) { _sp.copy(_p).project(cam); if (_sp.z < 1) { const k = ppk / Math.max(.5, d) * cs, x = (_sp.x + 1) / 2 * innerWidth, y = (1 - _sp.y) / 2 * innerHeight; rects.push({ x0: x - .5 * k, x1: x + .62 * k, y0: y - .58 * k, y1: y + .4 * k, L }); } }   // 札が避ける、結晶の画面の上の範囲
        // 輪：地面に。上空では大きく
        const rr = (sky ? SKYR * sg : Math.max(1.05, Math.min(3, sg)) * 1.25) * (1 + (L.open || 0) * .5);
        _e.set(0, it.ph, 0); _q.setFromEuler(_e); _s.set(rr, 1, rr); _m.compose(_r.set(_r.x, _r.y + .05, _r.z), _q, _s); ring.setMatrixAt(n, _m);
        RA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); RA.iP.setXYZW(n, show * (sky ? .9 : 1), crisp, em, far);
        // 柱：地面から結晶の下まで。すぐそばでは消す（目の前をふさがない）
        const h = Math.max(.05, _p.y - _r.y - .3 * sg), bw = (sky ? .9 : .12 + far * .25) * Math.max(1, sg * .6), near = sky ? 1 : Math.min(1, Math.max(0, (dh - 2) / 5));
        _q.identity(); _s.set(bw, h, bw); _m.compose(_r, _q, _s); beam.setMatrixAt(n, _m);
        BA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); BA.iP.setXYZW(n, show * near, crisp, em, far);
        n++;
      }
      for (const im of [crystal, ring, beam]) { im.count = n; im.instanceMatrix.needsUpdate = true; im.geometry.attributes.iCol.needsUpdate = true; im.geometry.attributes.iP.needsUpdate = true; }
    },
  };
}


/* 札どうし・札と結晶を重ねない（2026-10-23 深夜 本人「近くの札どうし、札と結晶が重なる」）
   近い札（選んだ札が先）から順に置く。重なるときは上へ一段ずつ逃がし（3 段まで）、それでも重なる遠い札はうすく消す。
   list: [{ sp, d, pri }]  sp＝makeLabel の札（center 0,0）。sp.userData.by に、ずらす前の高さ（親の中での y）を入れておく。
   avoid: 画面の上の範囲 [{x0,x1,y0,y1}]（結晶＝QM.rects、層の一覧など）。札の不透明度は呼ぶ前に決めておく（ここで掛ける）。 */
export function placeLabels(THREE, cam, list, avoid = [], dt = .016) {
  const W = innerWidth, H = innerHeight, put = [], V = THREE.Vector3;
  const a = placeLabels._a || (placeLabels._a = new V()), b = placeLabels._b || (placeLabels._b = new V()), sc = placeLabels._s || (placeLabels._s = new V()), ps = placeLabels._p || (placeLabels._p = new V());
  list.sort((p, q) => (q.pri || 0) - (p.pri || 0) || p.d - q.d);
  const hit = r => { for (const q of put) if (r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0) return true; for (const q of avoid) if (r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0) return true; return false; };
  for (const e of list) {
    const sp = e.sp, u = sp.userData; if (u.by == null) u.by = sp.position.y; u.sl ??= 0; u.f ??= 0;
    sp.position.y = u.by; sp.getWorldPosition(a); sp.getWorldScale(sc); sp.parent?.getWorldScale(ps);
    b.copy(a); b.y += sc.y; a.project(cam); b.project(cam);
    let slot = -1;
    if (a.z < 1 && sp.visible) {
      const x = (a.x + 1) / 2 * W, y = (1 - a.y) / 2 * H, h = Math.max(6, y - (1 - b.y) / 2 * H), w = h * (sc.x / sc.y) * .78, m = 3;
      const tryS = s => { const r = { x0: x - m, x1: x + w + m, y0: y - h * (s + 1) * 1.1 - m, y1: y - h * s * 1.1 + m, L: e.L }; if (r.y0 < 0 || r.x0 < 2 || r.x1 > W - 2) return false; /* 画面の端で切れる札は出さない */ if (hit(r)) return false; put.push(r); return true; };
      const pref = Math.round(u.sl);
      if (tryS(pref)) slot = pref; else for (let s = 0; s < 4; s++) if (s !== pref && tryS(s)) { slot = s; break; }
    }
    const k = Math.min(1, dt * 7);
    if (slot >= 0) u.sl += (slot - u.sl) * k;
    u.f += ((slot >= 0 ? 1 : 0) - u.f) * Math.min(1, dt * 9);
    sp.position.y = u.by + u.sl * sc.y * 1.1 / Math.max(1e-4, ps.y || 1);
    sp.material.opacity *= u.f; if (u.f < .02) sp.visible = false;
  }
}
