/* Qualia の印（2026-10-23 夜 本人「Qualia をもっと目立つように・美しいグラフィックで・かさねっこの形に似たデザインに」）
   2026-10-26 本人「Qualia がメインで、風景はそのオーバーレイ。目印の 3D をより洗練されたデザインに」→ v4：
   ・結晶＝かさねっこの形の滑らかな滴。中は透け、縁に薄膜のような虹の色ずれ（屈折風）、細かな切子のきらめき、芯がほのかに灯る。
   ・紋の円盤＝結晶の後ろに、層の色の細い輪と層ごとの小さな紋（sight＝複眼の六角・touch＝凹凸の筋・sound＝波の輪・nature＝等高線と葉脈・culture＝札と古い道）。見る人へ向く。
   ・まわる輪＝結晶を斜めに巡る層の色の細い輪。
   ・足もとの輪にも同じ紋。近づくと（約 10 m→4 m）輪と紋がひらき、触れると層の中身へ広がる。
   ・遠くは柱と輪だけを強め、紋は描かない（見つけやすさ）。描くのは 5 回だけ（すべて InstancedMesh）。
   使い方：const QM = makeQMarks(THREE, parent, n); QM.add(L, color, kind) … 毎こま QM.update(camera, { t, focus, sky })
   kind＝0 sight・1 touch・2 sound・3 nature・4 culture。 */

const KIND = { sight: 0, touch: 1, sound: 2, nature: 3, culture: 4 };

function crystalGeo(THREE) {
  const pr = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const a = i / N;
    const y = -.42 + a * .98;
    const r = a < .38 ? Math.sin(Math.acos(1 - a / .38 * 1.0)) * .30 + .0001 : .30 * Math.pow(1 - (a - .38) / .62, 1.25) + .0001;
    pr.push(new THREE.Vector2(Math.max(.0001, r), y));
  }
  const SEG = 32, g = new THREE.LatheGeometry(pr, SEG);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = Math.max(0, y + .05); p.setX(i, p.getX(i) + k * k * 1.05); }
  g.computeVertexNormals();
  const nr = g.attributes.normal, P = pr.length, _a = new THREE.Vector3(), _b = new THREE.Vector3();
  for (let j = 0; j < P; j++) { const i0 = j, i1 = SEG * P + j; _a.fromBufferAttribute(nr, i0); _b.fromBufferAttribute(nr, i1); _a.add(_b).normalize(); nr.setXYZ(i0, _a.x, _a.y, _a.z); nr.setXYZ(i1, _a.x, _a.y, _a.z); }
  return g;
}

const VS_COMMON = /* glsl */`
  attribute vec3 iCol; attribute vec4 iP; attribute vec2 iQ;   // iP: x＝見えかた y＝くっきり z＝強調 w＝遠さ／iQ: x＝層の種類 y＝ひらき（0〜1）
  varying vec3 vCol; varying vec4 vP; varying vec2 vQ; varying vec3 vW; varying vec3 vL; varying vec3 vN;
`;
// 層ごとの紋（p は −1〜1）。線の強さを返す
const EMB = /* glsl */`
  float ln(float d, float w){ float f=fwidth(d)*1.2+1e-4; return 1.-smoothstep(w*.5, w*.5+f, abs(d)); }
  float emb(vec2 p, float k, float t){
    float r=length(p), m=1.-smoothstep(.66,.74,r);
    if(k<.5){ vec2 q=p*4.2; vec2 h=vec2(1.,1.732); vec2 a=mod(q,h)-h*.5, b=mod(q-h*.5,h)-h*.5; vec2 g=dot(a,a)<dot(b,b)?a:b; g=abs(g);
      float d=max(dot(g,vec2(.866,.5)),g.x); return ln(d-.46,.07)*m; }                                            // sight：複眼の六角
    if(k<1.5){ float d=fract(p.y*5.5+.18*sin(p.x*6.+1.3))-.5; float bump=fract(p.x*5.5+.5*step(.5,fract(p.y*2.75)))-.5;
      return max(ln(d,.11), ln(bump,.08)*ln(d-.5,.35)*.0)*m; }                                                     // touch：凹凸の筋
    if(k<2.5){ float d=fract(r*4.2-t*.35)-.5; return ln(d,.09)*m*(1.15-r); }                                     // sound：広がる波の輪
    if(k<3.5){ float a=atan(p.y,p.x); float f=r*4.+.28*sin(a*3.+r*5.)+.16*sin(p.x*4.-p.y*3.); float c=ln(fract(f)-.5,.08);
      float vein=ln(p.x+.12*p.y*p.y,.035)*step(abs(p.y),.62); float br=ln(abs(p.x)-(.5-p.y)*.32-.0,.03)*step(-.1,p.y)*step(p.y,.5)*0.;
      return max(c*.75,vein)*m; }                                                                                  // nature：等高線と葉脈
    vec2 a1=abs(p-vec2(-.2,.06)); float tag=ln(max(a1.x/.15,a1.y/.42)-1.,.09)+ln(a1.x,.02)*step(a1.y,.3)*.6;   // culture：札
    float road=ln(p.y+.42-.12*sin(p.x*4.2)-.0,.05)*step(abs(p.x),.62); float road2=ln(p.y+.28-.08*sin(p.x*4.2+.6),.03)*step(abs(p.x),.5)*step(.5,fract(p.x*6.));
    return clamp(tag+road+road2,0.,1.)*m;
  }
`;

export function makeQMarks(THREE, parent, cap, mobile = false, opt = {}) {
  const SKYK = opt.skyK ?? 2.6, SKYR = opt.skyR ?? 2.4, WALKK = opt.walkK ?? 1.05;
  cap = Math.max(1, cap);
  const mk = (geo, vs, fs, order, blend, side = THREE.DoubleSide) => {
    const g = geo.clone();
    g.setAttribute("iCol", new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
    g.setAttribute("iQ", new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2));
    const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } }, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: blend, side, toneMapped: false });
    const im = new THREE.InstancedMesh(g, m, cap); im.count = 0; im.frustumCulled = false; im.renderOrder = order; parent.add(im);
    return im;
  };
  // 結晶：屈折風の虹の縁・切子のきらめき・芯の灯り
  const crystal = mk(crystalGeo(THREE), VS_COMMON + /* glsl */`
    void main(){ vCol=iCol; vP=iP; vQ=iQ; mat4 mw=modelMatrix*instanceMatrix; vec4 w=mw*vec4(position,1.); vW=w.xyz; vL=position; vN=normalize(mat3(mw)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec2 vQ; varying vec3 vW; varying vec3 vL; varying vec3 vN;
    vec3 film(float x){ return .5+.5*cos(6.2832*(x+vec3(0.,.33,.67))); }
    void main(){
      vec3 n=normalize(vN); vec3 v=normalize(cameraPosition-vW); if(!gl_FrontFacing) n=-n; float nv=clamp(abs(dot(n,v)),0.,1.);
      float fr=pow(1.-nv,2.4);
      vec3 Ld=normalize(vec3(sin(uT*.5),.95,cos(uT*.5)));
      float dif=.45+.55*max(0.,dot(n,Ld));
      float spec=pow(max(0.,dot(reflect(-v,n),Ld)),48.);
      // 切子のきらめき：法線を細かな面に量子化して、ときどき光る
      vec3 fq=floor(n*7.+.5); float h=fract(sin(dot(fq,vec3(12.9,78.2,37.7)))*43758.5);
      float glint=pow(max(0.,sin(uT*.9+h*40.)),90.)*step(.86,h)*smoothstep(.25,.75,nv)*.7;
      float core=pow(nv,3.)*(.6+.4*sin(uT*1.4+vL.y*3.));
      float crisp=vP.y, em=vP.z, op=vQ.y;
      vec3 sat=mix(vec3(dot(vCol,vec3(.333))),vCol,1.35);
      vec3 rim=mix(sat, sat*film(fr*1.4+vL.y*.6+uT*.05)*1.6, .42*crisp);       // 縁の薄膜の色ずれ（層の色を芯に）
      vec3 c=sat*(.2+.32*dif)+sat*core*(.6+op*.5)+rim*fr*(1.6+crisp*.9)+vec3(1.)*pow(fr,4.)*(.3+crisp*.4)+vec3(1.)*(spec*(.6+crisp*.5)+glint*crisp);
      float a=(.14+.08*crisp+core*.16+fr*.8+spec*.45+glint*.5)*(.66+.34*em);
      gl_FragColor=vec4(c*(1.+em*.4+op*.25),clamp(a,0.,.94)*vP.x);
      #include <colorspace_fragment>
    }`, 7, THREE.NormalBlending);
  // 紋の円盤：結晶の後ろで見る人へ向く。細い輪と層の紋（近いときだけ）
  const hg = new THREE.PlaneGeometry(2, 2);
  const halo = mk(hg, VS_COMMON + /* glsl */`
    void main(){ vCol=iCol; vP=iP; vQ=iQ; vL=position; vec3 c=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz; float s=length((modelMatrix*instanceMatrix)[0].xyz);
      vec3 R=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), U=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
      vec3 w=c+(R*position.x+U*position.y)*s - normalize(cameraPosition-c)*s*.25; vW=w; gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec2 vQ; varying vec3 vW; varying vec3 vL;` + EMB + /* glsl */`
    void main(){
      vec2 p=vL.xy; float r=length(p); if(r>1.) discard; float ang=atan(p.y,p.x), op=vQ.y, crisp=vP.y;
      float R1=.78+.12*op;
      float ring=ln(r-R1,.012)*(.75+.25*sin(ang*3.+uT*.6));
      float tick=ln(r-R1-.07,.03)*step(.82,fract(ang*12./6.2832-uT*.04));
      float arc=ln(r-.94,.008)*step(fract(ang/6.2832+uT*.05),.28+.2*op);
      float e=emb(p/(.62+.18*op)*.74, vQ.x, uT);
      float glow=exp(-pow((r-R1)*9.,2.))*.25;
      float a=(ring*.85+tick*.6+arc*.55+glow)*(.35+.65*crisp) + e*(.16+.6*op)*crisp*(.55+.45*smoothstep(.3,.75,r));   // 紋は結晶の外側の帯で読めるように
      gl_FragColor=vec4(vCol*(1.2+.5*vP.z),clamp(a,0.,1.)*vP.x*(.5+.5*vP.z));
      #include <colorspace_fragment>
    }`, 6, THREE.NormalBlending);
  // まわる輪：結晶を斜めに巡る細い輪
  const tg = new THREE.TorusGeometry(1, .011, 4, 72);
  const orbit = mk(tg, VS_COMMON + /* glsl */`
    void main(){ vCol=iCol; vP=iP; vQ=iQ; vL=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec2 vQ; varying vec3 vW; varying vec3 vL;
    void main(){ float ang=atan(vL.y,vL.x); float dash=.55+.45*smoothstep(.2,.8,fract(ang*2./6.2832-uT*.15));
      gl_FragColor=vec4(vCol*1.4,dash*.8*vP.x*vP.y*(.55+.45*vP.z));
      #include <colorspace_fragment>
    }`, 6, THREE.AdditiveBlending);
  // 足もとの輪：細い輪・回る刻み・外の破線・HUD の線・中に層の紋（近づくとひらく）
  const pg = new THREE.PlaneGeometry(2, 2); pg.rotateX(-Math.PI / 2);
  const ring = mk(pg, VS_COMMON + /* glsl */`
    void main(){ vCol=iCol; vP=iP; vQ=iQ; vL=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec2 vQ; varying vec3 vW; varying vec3 vL;` + EMB + /* glsl */`
    void main(){
      vec2 p=vL.xz; float r=length(p); if(r>1.) discard; float aw=fwidth(r)*1.2; float ang=atan(p.y,p.x); float op=vQ.y;
      float r1=1.-smoothstep(0.,aw,abs(r-.62)-.012);
      float r2=(1.-smoothstep(0.,aw,abs(r-.86)-.008))*step(.5,fract(ang*18./6.2832+uT*.08));
      float tk=(1.-smoothstep(0.,aw,abs(r-.74)-.05))*(1.-smoothstep(0.,.02,abs(fract(ang*4./6.2832-uT*.05)-.5)-.47));
      float lnn=(1.-smoothstep(0.,fwidth(p.y)*1.2,abs(p.y)-.004))*step(.86,p.x)*step(p.x,.99);
      float fill=(1.-smoothstep(.0,.62,r))*.14;
      float halo=exp(-pow((r-.62)*7.,2.))*.35;
      float e=emb(p/.6*.72, vQ.x, uT)*vP.y*(.22+.55*op);
      float a=(r1*.9+r2*.6+tk*.8+lnn*.7+fill+halo)*(.55+.45*vP.z)*(.6+.4*vP.w)+e;
      gl_FragColor=vec4(vCol*(1.15+vP.z*.4),clamp(a,0.,1.)*vP.x);
      #include <colorspace_fragment>
    }`, 4, THREE.NormalBlending);
  // 光の柱
  const bg = new THREE.PlaneGeometry(1, 1); bg.translate(0, .5, 0); const bg2 = bg.clone(); bg2.rotateY(Math.PI / 2);
  const bgm = new THREE.BufferGeometry(); { const a = bg.toNonIndexed(), b = bg2.toNonIndexed(); const P = new Float32Array([...a.attributes.position.array, ...b.attributes.position.array]), U = new Float32Array([...a.attributes.uv.array, ...b.attributes.uv.array]); bgm.setAttribute("position", new THREE.BufferAttribute(P, 3)); bgm.setAttribute("uv", new THREE.BufferAttribute(U, 2)); }
  const beam = mk(bgm, VS_COMMON + /* glsl */`
    varying vec2 vUv; void main(){ vCol=iCol; vP=iP; vQ=iQ; vUv=uv; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
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
  const rects = [], _sp = new THREE.Vector3();
  const ALLM = [crystal, halo, orbit, ring, beam];
  return {
    add(L, color, kind) { _c.set(color); items.push({ L, c: [_c.r, _c.g, _c.b], ph: items.length * 1.7, k: typeof kind === "number" ? kind : (KIND[kind] ?? 0), no: 0 }); },
    get count() { return items.length; },
    get rects() { return rects; },
    get items() { return items; },
    update(cam, o = {}) {
      const t = o.t ?? performance.now() / 1000, sky = !!o.sky, focus = o.focus || null, dt = Math.min(.1, Math.max(0, t - (this._t ?? t))); this._t = t;
      for (const im of ALLM) im.material.uniforms.uT.value = t;
      const CA = crystal.geometry.attributes, HA = halo.geometry.attributes, OA = orbit.geometry.attributes, RA = ring.geometry.attributes, BA = beam.geometry.attributes;
      let n = 0; rects.length = 0;
      const ppk = innerHeight / (2 * Math.tan((cam.fov || 50) * Math.PI / 360));
      for (const it of items) {
        const L = it.L; if (!L.root.visible || !(L.show > .01) || n >= cap) continue;
        L.glyph.getWorldPosition(_p); L.root.getWorldPosition(_r); L.glyph.getWorldScale(_s);
        const sg = _s.x, d = _p.distanceTo(cam.position), dh = Math.hypot(_p.x - cam.position.x, _p.z - cam.position.z);
        const crisp = sky ? .2 : 1 - Math.min(1, Math.max(0, (dh - 8) / 40));
        const far = sky ? 1 : Math.min(1, Math.max(0, (dh - 12) / 90));
        const em = focus ? (focus === L ? 1 : .15) : (L.open ? Math.max(.5, L.open) : .5);
        const show = L.show * (focus && focus !== L ? .45 : 1);
        // 近づくとひらく（10 m→4 m）。触れると（L.open）いっぱいに
        const nt = sky ? 0 : Math.max(Math.min(1, Math.max(0, (10 - dh) / 6)), L.open || 0);
        it.no += (nt - it.no) * Math.min(1, dt * 3.5); const op = it.no; L.qOpen = op;
        const cs = (sky ? SKYK : WALKK) * sg * (1 + (L.open || 0) * .25);
        _e.set(0, t * (.5 - op * .3) + it.ph, 0); _q.setFromEuler(_e); _s.set(cs, cs, cs);
        const cy = _p.y + Math.sin(t * 1.3 + it.ph) * .06 * sg + op * .12 * sg;
        _m.compose(_p.set(_p.x, cy, _p.z), _q, _s); crystal.setMatrixAt(n, _m);
        const nearK = sky || focus === L ? 1 : Math.min(1, Math.max(.12, (d - 1.4) / 2.6));
        const cv = sky ? 0 : show * nearK;
        const scr = ppk / Math.max(.5, d) * cs / innerHeight, big = Math.min(1, Math.max(0, 1 - (scr - .28) / .14));   // 画面の高さの 3 割を超える近さでは、輪と紋をうすく（左の一覧や字を覆わない）
        CA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); CA.iP.setXYZW(n, cv * Math.max(.18, big), crisp, em, far); CA.iQ.setXY(n, it.k, op);
        // 紋の円盤（結晶の芯の高さ・見る人へ向く）。遠くでは描かない
        const hs = cs * (.62 + op * .38);
        _q.identity(); _s.set(hs, hs, hs); _m.compose(_r.set(_p.x, cy + .02 * cs, _p.z), _q, _s); halo.setMatrixAt(n, _m);
        HA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); HA.iP.setXYZW(n, cv * big * (sky ? 0 : Math.min(1, crisp * 1.6)), crisp, em, far); HA.iQ.setXY(n, it.k, op);
        // まわる輪
        const os = cs * (.5 + op * .12); _e.set(1.1 + Math.sin(t * .4 + it.ph) * .15, t * .7 + it.ph, .35); _q.setFromEuler(_e); _s.set(os, os, os);
        _m.compose(_r.set(_p.x, cy + .02 * cs, _p.z), _q, _s); orbit.setMatrixAt(n, _m);
        OA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); OA.iP.setXYZW(n, cv * big, crisp, em, far); OA.iQ.setXY(n, it.k, op);
        if (!sky && cv > .2) { _sp.set(_p.x, cy, _p.z).project(cam); if (_sp.z < 1) { const k = ppk / Math.max(.5, d) * cs, x = (_sp.x + 1) / 2 * innerWidth, y = (1 - _sp.y) / 2 * innerHeight; rects.push({ x0: x - .5 * k, x1: x + .62 * k, y0: y - .58 * k, y1: y + .4 * k, L }); } }
        // 足もとの輪
        L.root.getWorldPosition(_r);
        const rr = (sky ? SKYR * sg : Math.max(1.05, Math.min(3, sg)) * 1.25) * (1 + (L.open || 0) * .5 + op * .25);
        _e.set(0, it.ph, 0); _q.setFromEuler(_e); _s.set(rr, 1, rr); _m.compose(_r.set(_r.x, _r.y + .05, _r.z), _q, _s); ring.setMatrixAt(n, _m);
        RA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); RA.iP.setXYZW(n, show * (sky ? .9 : 1), crisp, em, far); RA.iQ.setXY(n, it.k, op);
        // 柱
        L.root.getWorldPosition(_r);
        const h = Math.max(.05, cy - _r.y - .3 * sg), bw = (sky ? .9 : .12 + far * .25) * Math.max(1, sg * .6), near = sky ? 1 : Math.min(1, Math.max(0, (dh - 2) / 5));
        _q.identity(); _s.set(bw, h, bw); _m.compose(_r, _q, _s); beam.setMatrixAt(n, _m);
        BA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); BA.iP.setXYZW(n, show * near, crisp, em, far); BA.iQ.setXY(n, it.k, op);
        n++;
      }
      for (const im of ALLM) { im.count = n; im.instanceMatrix.needsUpdate = true; const A = im.geometry.attributes; A.iCol.needsUpdate = A.iP.needsUpdate = A.iQ.needsUpdate = true; }
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
