/* Qualium 共通の Qualia の目印（kit/qmarks.js・2026-10-27 夜 本人「Qualium は全ての版で同じ基準、GUI など統一して」）。
   大宮・川越・渋谷はこのファイルを写して使う（場所ごとに直さない）。基準＝_共通3D/資料/Qualium_共通の基準.md
   opt：mk（球の倍率・既定 .36）・walkK・skyK・skyR・minPx（画面での最小の半径・既定 12＝直径 24px）・capK（最小に広げる上限の倍率・既定 5）・overWalls（壁の向こうの印も見せる）。 */
/* Qualia の印（2026-10-23 夜 本人「Qualia をもっと目立つように・美しいグラフィックで・かさねっこの形に似たデザインに」）
   2026-10-26 本人「Qualia がメインで、風景はそのオーバーレイ。目印の 3D をより洗練されたデザインに」→ v4：
   ・結晶＝かさねっこの形の滑らかな滴。中は透け、縁に薄膜のような虹の色ずれ（屈折風）、細かな切子のきらめき、芯がほのかに灯る。
   ・紋の円盤＝結晶の後ろに、層の色の細い輪と層ごとの小さな紋（sight＝複眼の六角・touch＝凹凸の筋・sound＝波の輪・nature＝等高線と葉脈・culture＝札と古い道）。見る人へ向く。
   ・まわる輪＝結晶を斜めに巡る層の色の細い輪。
   ・足もとの輪にも同じ紋。近づくと（約 10 m→4 m）輪と紋がひらき、触れると層の中身へ広がる。
   ・遠くは柱と輪だけを強め、紋は描かない（見つけやすさ）。描くのは 5 回だけ（すべて InstancedMesh）。
   使い方：const QM = makeQMarks(THREE, parent, n); QM.add(L, color, kind) … 毎こま QM.update(camera, { t, focus, sky })
   2026-10-26 夜 v5：結晶を球に（本人「目印を球体に」）。屈折風の縁・流れる層の膜・球の中に光る紋。
   kind＝0 sight・1 touch・2 sound・3 nature・4 culture。 */

/* 2026-10-27 夜 本人「目印の球が大きすぎる。コンパクトで強い印に」→ v6：球を約 0.35 倍に。小さな芯が強く光り、細い輪・層の色の欠片・脈打つ光の輪で遠くから目を引く（当たりは画面で 44px 以上のまま）。 */
/* 2026-10-27 v7：屈折した視線で中の細い格子と二重の殻・波長ごとの縁の色ずれ（宝石／精密機器の質感） */
let MK = .36;
const KIND = { sight: 0, touch: 1, sound: 2, nature: 3, culture: 4 };

function crystalGeo(THREE) {
  // 2026-10-26 本人「Qualium は目印を球体にしてください」→ v5：滑らかな球（半径 .34・中心 0.07）
  const g = new THREE.SphereGeometry(.34, 40, 24); g.translate(0, .07, 0); return g;
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
  const SKYK = opt.skyK ?? 2.6, SKYR = opt.skyR ?? 2.4, WALKK = opt.walkK ?? 1.05, MINPX = opt.minPx ?? 12, CAPK = opt.capK ?? 5, MAXN = opt.maxShow ?? 7, _f = new THREE.Vector3(); MK = opt.mk ?? .36;
  cap = Math.max(1, cap);
  const mk = (geo, vs, fs, order, blend, side = THREE.DoubleSide) => {
    const g = geo.clone();
    g.setAttribute("iCol", new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3));
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
    g.setAttribute("iQ", new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2));
    const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } }, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: !opt.overWalls, blending: blend, side, toneMapped: false });
    const im = new THREE.InstancedMesh(g, m, cap); im.count = 0; im.frustumCulled = false; im.renderOrder = order; parent.add(im);
    return im;
  };
  // 結晶：屈折風の虹の縁・切子のきらめき・芯の灯り
  const crystal = mk(crystalGeo(THREE), VS_COMMON + /* glsl */`
    varying vec3 vC; varying float vR;
    void main(){ vCol=iCol; vP=iP; vQ=iQ; mat4 mw=modelMatrix*instanceMatrix; vec4 w=mw*vec4(position,1.); vW=w.xyz; vL=position; vN=normalize(mat3(mw)*normal);
      vC=(mw*vec4(0.,.07,0.,1.)).xyz; vR=length(mw[0].xyz)*.34; gl_Position=projectionMatrix*viewMatrix*w; }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec2 vQ; varying vec3 vW; varying vec3 vL; varying vec3 vN; varying vec3 vC; varying float vR;
    vec3 film(float x){ return .5+.5*cos(6.2832*(x+vec3(0.,.33,.67))); }` + EMB + /* glsl */`
    void main(){
      vec3 n=normalize(vN); vec3 v=normalize(cameraPosition-vW); if(!gl_FrontFacing) n=-n; float nv=clamp(abs(dot(n,v)),0.,1.);
      float fr=pow(1.-nv,2.4);
      vec3 Ld=normalize(vec3(sin(uT*.5),.95,cos(uT*.5)));
      float dif=.45+.55*max(0.,dot(n,Ld));
      float spec=pow(max(0.,dot(reflect(-v,n),Ld)),140.)*2.2+pow(max(0.,dot(reflect(-v,n),normalize(vec3(-.6,.4,.7)))),60.)*.5;   // v7：鋭い映り込み二つ
      // 切子のきらめき：法線を細かな面に量子化して、ときどき光る
      vec3 fq=floor(n*7.+.5); float h=fract(sin(dot(fq,vec3(12.9,78.2,37.7)))*43758.5);
      float glint=pow(max(0.,sin(uT*.9+h*40.)),90.)*step(.86,h)*smoothstep(.25,.75,nv)*.7;
      float core=pow(nv,7.)*(.85+.35*sin(uT*2.2+vL.y*3.))*.9;   // v7：芯は小さく
      float crisp=vP.y, em=vP.z, op=vQ.y;
      vec3 sat=mix(vec3(dot(vCol,vec3(.333))),vCol,1.35);
      vec3 rim=mix(sat, sat*film(fr*1.4+vL.y*.6+uT*.05)*1.6, .42*crisp);       // 縁の薄膜の色ずれ（層の色を芯に）
      vec3 deep=sat*sat*.07;   // v7：明るい空でも沈まない、深い色の硝子の地
      vec3 c=deep*(.6+.4*dif)+sat*core*(.35+op*.3)+rim*fr*(.8+crisp*.5)+vec3(1.)*pow(fr,5.)*(.25+crisp*.35)+vec3(1.)*(spec*(.7+crisp*.5)+glint*crisp);
      float a=(.78+.1*crisp+core*.2+fr*.6+spec*.45+glint*.5)*(.7+.3*em);
      // 球の中に光る層の紋（見る向きの平面に写す）と、ゆっくり流れる層の膜
      vec3 R=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), U=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
      vec2 q=vec2(dot(vW-vC,R),dot(vW-vC,U))/max(1e-4,vR);
      float inner=emb(q*.95, vQ.x, uT)*smoothstep(.2,.7,nv)*crisp*(.35+.65*op);
      float memb=ln(fract(vL.y*5.-uT*.12+.3*sin(atan(vL.z,vL.x)*2.+uT*.2))-.5,.05)*fr*.5*crisp;
      c+=sat*.8*inner+rim*memb*.6; a+=inner*.3+memb*.2;
      // 2026-10-27 v7（宝石・精密な機器の質感）：屈折した視線で球の中を辿り、細い格子（ジャイロイド）と二重の殻を描く。縁は波長ごとに色がずれる
      if(gl_FrontFacing && crisp>.05){
        vec3 rd=refract(-v,n,.69), ro=(vW-vC)/max(1e-4,vR); float bb=dot(ro,rd), hh=bb*bb-(dot(ro,ro)-1.); float tx=max(0.,-bb+sqrt(max(hh,0.)));
        float st=tx/10., ki=6.2+vQ.x*.7, inT=0., shT=0.;
        for(int i=0;i<10;i++){ vec3 p=ro+rd*(st*(float(i)+.5)); float rr=length(p);
          vec3 pr=p*ki+vec3(0.,uT*.22,uT*.1);
          float g=sin(pr.x)*cos(pr.y)+sin(pr.y)*cos(pr.z)+sin(pr.z)*cos(pr.x);
          inT+=exp(-abs(g)*26.)*(1.-smoothstep(.5,.9,rr))*st;
          shT+=(exp(-pow((rr-.48)*30.,2.))+exp(-pow((rr-.2)*40.,2.))*.7)*st; }
        vec3 fc=pow(vec3(1.-nv),vec3(2.,2.5,3.1));
        c+=mix(sat,vec3(1.),.55)*(inT*3.2+shT*1.1)*crisp*(.7+.5*op)+fc*vec3(.9,1.,1.15)*.55*crisp;
        a+=(inT*.7+shT*.45)*crisp;
      }
      c+=mix(rim,vec3(1.),.35)*pow(fr,2.6)*(1.25+.5*em);   // v8：暗い緑の地でも輪郭が切れない明るい縁
      a+=pow(fr,2.6)*.35;
      gl_FragColor=vec4(c*(1.+em*.2+op*.1),clamp(a,0.,.96)*vP.x);
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
      float ring=ln(r-R1,.006)*(.75+.25*sin(ang*3.+uT*.6));
      float tick=ln(r-R1-.07,.03)*step(.82,fract(ang*12./6.2832-uT*.04));
      float arc=ln(r-.94,.008)*step(fract(ang/6.2832+uT*.05),.28+.2*op);
      float e=emb(p/(.62+.18*op)*.74, vQ.x, uT);
      float glow=exp(-pow((r-R1)*9.,2.))*.12+exp(-r*r*7.)*.08;   // v7：中の霞を消して、硝子の深い色を見せる
      float pp=fract(uT*.55+vQ.x*.13); float pulse=ln(r-(.3+.68*pp),.03)*(1.-pp)*.9;
      float frag=step(.93,fract(ang*9./6.2832+uT*.08))*ln(r-.62,.07)*.9;
      float a=(ring*.85+tick*.6+arc*.55+glow+pulse+frag)*(.5+.5*crisp) + e*(.16+.6*op)*crisp*(.55+.45*smoothstep(.3,.75,r));   // 紋は結晶の外側の帯で読めるように
      gl_FragColor=vec4(vCol*(1.2+.5*vP.z),clamp(a,0.,1.)*vP.x*(.5+.5*vP.z));
      #include <colorspace_fragment>
    }`, 6, THREE.NormalBlending);
  // まわる輪：結晶を斜めに巡る細い輪
  const tg = new THREE.TorusGeometry(1, .006, 4, 96);
  const orbit = mk(tg, VS_COMMON + /* glsl */`
    void main(){ vCol=iCol; vP=iP; vQ=iQ; vL=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec2 vQ; varying vec3 vW; varying vec3 vL;
    void main(){ float ang=atan(vL.y,vL.x); float dash=.55+.45*smoothstep(.2,.8,fract(ang*2./6.2832-uT*.15));
      gl_FragColor=vec4(vCol*.9,dash*.38*vP.x*vP.y*(.55+.45*vP.z));   // v7：輪は細く控えめに
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
    remove(pred) { for (let i = items.length - 1; i >= 0; i--) if (pred(items[i].L)) items.splice(i, 1); },
    update(cam, o = {}) {
      const t = o.t ?? performance.now() / 1000, sky = !!o.sky, focus = o.focus || null, dt = Math.min(.1, Math.max(0, t - (this._t ?? t))); this._t = t;
      for (const im of ALLM) im.material.uniforms.uT.value = t;
      const CA = crystal.geometry.attributes, HA = halo.geometry.attributes, OA = orbit.geometry.attributes, RA = ring.geometry.attributes, BA = beam.geometry.attributes;
      let n = 0; rects.length = 0;
      const ppk = innerHeight / (2 * Math.tan((cam.fov || 50) * Math.PI / 360));
      if (!sky) {   // 2026-10-28 Qualium 共通の基準：歩くときに見せる印は、視野の中の近い順に MAXN 個まで（印の壁にしない）
        const fw = _f.set(0, 0, -1).applyQuaternion(cam.quaternion), cand = [];
        for (const it of items) { const L = it.L; L.qHide = false; if (!L.root.visible || !(L.show > .01)) continue; L.root.getWorldPosition(_r); const dx = _r.x - cam.position.x, dz = _r.z - cam.position.z, dd = Math.hypot(dx, dz); if ((dx * fw.x + dz * fw.z) / Math.max(1e-3, dd) > .35 || dd < 12) cand.push([dd, L]); else L.qHide = true; }
        cand.sort((p, q) => p[0] - q[0]); const near5 = cand.filter(c => c[0] < 40).length, lim = near5 < 5 ? MAXN + 3 : MAXN;   // 近くの印が 5 個を下回る所では、少し先の印まで出す（視野に 5〜10 個）
        const scr = []; let shown = 0;   // 画面の上で重なる印（奥の印が手前の印の視線上にある）は、奥のほうを出さない
        for (const [, L] of cand) { if (L.open > 0) { shown++; continue; } if (shown >= lim) { L.qHide = true; continue; }
          L.root.getWorldPosition(_r); _r.project(cam); const sx = (_r.x + 1) * innerWidth / 2, sy = (1 - _r.y) * innerHeight / 2;
          if (_r.z < 1 && scr.some(([x, y]) => Math.abs(x - sx) < 40 && Math.abs(y - sy) < 52)) { L.qHide = true; continue; }
          scr.push([sx, sy]); shown++; }
      } else for (const it of items) it.L.qHide = false;
      for (const it of items) {
        const L = it.L; if (!L.root.visible || !(L.show > .01) || n >= cap || L.qHide) continue;
        L.glyph.getWorldPosition(_p); L.root.getWorldPosition(_r); L.glyph.getWorldScale(_s);
        const sg = _s.x, d = _p.distanceTo(cam.position), dh = Math.hypot(_p.x - cam.position.x, _p.z - cam.position.z);
        const crisp = sky ? .2 : 1 - Math.min(1, Math.max(0, (dh - 8) / 40));
        const far = sky ? 1 : Math.min(1, Math.max(0, (dh - 12) / 90));
        const em = focus ? (focus === L ? 1 : .15) : (L.open ? Math.max(.5, L.open) : .5);
        const show = L.show * (focus && focus !== L ? .45 : 1);
        // 近づくとひらく（10 m→4 m）。触れると（L.open）いっぱいに
        const nt = sky ? 0 : Math.max(Math.min(1, Math.max(0, (10 - dh) / 6)), L.open || 0);
        it.no += (nt - it.no) * Math.min(1, dt * 3.5); const op = it.no; L.qOpen = op;
        let cs = (sky ? SKYK : WALKK) * sg * (1 + (L.open || 0) * .25) * MK;
        if (!sky) { const nearMin = 1 - Math.min(1, Math.max(0, (d - 45) / 40)); cs = Math.max(cs, Math.min(cs * CAPK, MINPX * d / (ppk * .34)) * nearMin); }   // 最小の大きさは近い範囲（〜45 m、85 m で消える）だけ。遠い印は小さく、通りの奥で団子にしない   // 2026-10-27 v8：画面で直径 22px より小さくしない（遠くでも見つかる・近くは本来の大きさ）
        _e.set(0, t * (.5 - op * .3) + it.ph, 0); _q.setFromEuler(_e); _s.set(cs, cs, cs);
        const cy = _p.y + Math.sin(t * 1.3 + it.ph) * .06 * sg + op * .12 * sg;
        _m.compose(_p.set(_p.x, cy, _p.z), _q, _s); crystal.setMatrixAt(n, _m);
        const nearK = sky || focus === L ? 1 : Math.min(1, Math.max(.12, (d - 1.4) / 2.6));
        const cv = sky ? 0 : show * nearK * (1 - .55 * Math.min(1, Math.max(0, (d - 35) / 70)));   // 遠い印（並木や壁の向こうを含む）は薄く、手前の印を主役に
        const scr = ppk / Math.max(.5, d) * cs / innerHeight, big = Math.min(1, Math.max(0, 1 - (scr - .28) / .14));   // 画面の高さの 3 割を超える近さでは、輪と紋をうすく（左の一覧や字を覆わない）
        CA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); CA.iP.setXYZW(n, cv * Math.max(.18, big), crisp, em, far); CA.iQ.setXY(n, it.k, op);
        // 紋の円盤（結晶の芯の高さ・見る人へ向く）。遠くでは描かない
        const hs = cs * (.95 + op * .3);
        _q.identity(); _s.set(hs, hs, hs); _m.compose(_r.set(_p.x, cy + .02 * cs, _p.z), _q, _s); halo.setMatrixAt(n, _m);
        HA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); HA.iP.setXYZW(n, cv * Math.max(.35, big) * (sky ? 0 : 1), Math.max(.45, crisp), em, far); HA.iQ.setXY(n, it.k, op);
        // まわる輪
        const os = cs * (.72 + op * .12); _e.set(1.1 + Math.sin(t * .4 + it.ph) * .15, t * .7 + it.ph, .35); _q.setFromEuler(_e); _s.set(os, os, os);
        _m.compose(_r.set(_p.x, cy + .02 * cs, _p.z), _q, _s); orbit.setMatrixAt(n, _m);
        OA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); OA.iP.setXYZW(n, cv * big, crisp, em, far); OA.iQ.setXY(n, it.k, op);
        if (!sky && cv > .2) { _sp.set(_p.x, cy, _p.z).project(cam); if (_sp.z < 1) { const k = Math.max(46, ppk / Math.max(.5, d) * cs * 1.4), x = (_sp.x + 1) / 2 * innerWidth, y = (1 - _sp.y) / 2 * innerHeight; rects.push({ x0: x - .5 * k, x1: x + .62 * k, y0: y - .58 * k, y1: y + .4 * k, L }); } }
        // 足もとの輪
        L.root.getWorldPosition(_r);
        const rr = (sky ? SKYR * sg : Math.max(1.05, Math.min(3, sg)) * 1.25) * (1 + (L.open || 0) * .5 + op * .25) * .34;
        _e.set(0, it.ph, 0); _q.setFromEuler(_e); _s.set(rr, 1, rr); _m.compose(_r.set(_r.x, _r.y + .05, _r.z), _q, _s); ring.setMatrixAt(n, _m);
        RA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); RA.iP.setXYZW(n, show * (sky ? .9 : 1), crisp, em, far); RA.iQ.setXY(n, it.k, op);
        // 柱
        L.root.getWorldPosition(_r);
        const h = Math.max(.05, cy - _r.y - .3 * sg), bw = (sky ? .9 : .12 + far * .25) * Math.max(1, sg * .6), near = sky ? 1 : Math.min(1, Math.max(0, (dh - 2) / 5));
        _q.identity(); _s.set(bw, h, bw); _m.compose(_r, _q, _s); beam.setMatrixAt(n, _m);
        BA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); BA.iP.setXYZW(n, show * near * (1 - .75 * far), crisp, em, far);   // 遠い印の光の柱は薄く（空に刺さって見えないように） BA.iQ.setXY(n, it.k, op);
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
export function placeLabels(THREE, cam, list, avoid = [], dt = .016, minPx = 0) {   // minPx＝遠くの札も読める字の高さまで大きくする（川越から）
  const W = innerWidth, H = innerHeight, put = [], V = THREE.Vector3;
  const a = placeLabels._a || (placeLabels._a = new V()), b = placeLabels._b || (placeLabels._b = new V()), sc = placeLabels._s || (placeLabels._s = new V()), ps = placeLabels._p || (placeLabels._p = new V());
  placeLabels._fr = (placeLabels._fr || 0) + 1;
  list.sort((p, q) => (q.pri || 0) - (p.pri || 0) || p.d - q.d); const LP = [], LA = [];   // 近い順に置く（近い印ほど札が付きやすい）
  const hit = r => { for (const q of put) if (r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0) return true; for (const q of avoid) if (r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0) return true; return false; };
  let idx = -1;
  for (const e of list) {
    idx++; const sp = e.sp, u = sp.userData; if (u.by == null) u.by = sp.position.y; u.sl ??= 0; u.f ??= 0;
    if (minPx) { if (!u.bs || u.bsF !== placeLabels._fr) u.bs = (u.bs || new THREE.Vector3()).copy(sp.scale); }   // 札の大きさはアプリが毎こま決める。その大きさを元にする（古い大きさを使い続けて、札が大きくなりすぎていた）
    sp.position.y = u.by; sp.getWorldPosition(a); sp.getWorldScale(sc); sp.parent?.getWorldScale(ps);
    if (minPx) { const t = a.clone(), t2 = a.clone(); t2.y += sc.y; t.project(cam); t2.project(cam); const hp = Math.abs(t2.y - t.y) / 2 * H; if (t.z < 1 && hp > .5 && hp < minPx) { const f = Math.min(3.2, minPx / hp); sp.scale.copy(u.bs).multiplyScalar(f); sp.getWorldScale(sc); } }
    b.copy(a); b.y += sc.y; a.project(cam); b.project(cam);
    let slot = -1;
    if (a.z < 1 && sp.visible && Math.abs(a.x) < 1.02 && Math.abs(a.y) < 1.05) {   // 10-28：画面の外の印の札は、画面の内へ寄せて出さない（印の見えない札・近い印の札が置けない原因だった）
      const x0 = (a.x + 1) / 2 * W, y = (1 - a.y) / 2 * H, h = Math.max(6, y - (1 - b.y) / 2 * H), w = h * (sc.x / sc.y) * .78, m = 3;
      const x = Math.max(2 + m, Math.min(x0, W - 2 - m - h * sc.x / sc.y * .92));   /* 板の右端も画面に収める */ sp.center.x = (x0 - x) / Math.max(1, h * sc.x / sc.y);   // 2026-10-26 16：右の端で切れる札は、画面の中へ左に寄せる（スマホで町の名札が出なかった）
      const tryS = s => { const r = { x0: x - m, x1: x + w + m, y0: y - h * (s + 1) * 1.1 - m, y1: y - h * s * 1.1 + m, L: e.L }; if (r.y0 < 0 || r.x0 < 2 || r.x1 > W - 2) return false; /* 画面の端で切れる札は出さない */ if (hit(r)) return false; put.push(r); return true; };
      const pref = Math.round(u.sl);
      if (tryS(pref)) slot = pref; else for (let s = 0; s < 4; s++) if (s !== pref && tryS(s)) { slot = s; break; }
      if (slot < 0) for (const s of [-1, -2, -3]) if (s !== pref && tryS(s)) { slot = s; break; }
      if (slot < 0) { const xl = x0 - w - 8, r = { x0: xl - 3, x1: xl + w + 3, y0: y - h * 1.1 - 3, y1: y + 3, L: e.L };   // 右に置けなければ、印の左に置く
        if (xl > 2 && r.y0 > 0 && !hit(r)) { put.push(r); slot = 0; sp.center.x = (w + 8) / Math.max(1, h * sc.x / sc.y); } }
      if (slot < 0 && idx < 3 && x + w < W - 2 && y - h * 1.1 > 0 && ![...put, ...avoid.filter(q => !q.L)].some(q => x - 3 < q.x1 && x + w + 3 > q.x0 && y - h * 1.1 - 3 < q.y1 && y + 3 > q.y0)) { put.push({ x0: x - 3, x1: x + w + 3, y0: y - h * 1.1 - 3, y1: y + 3, L: e.L }); slot = 0; }   // 10-28：いちばん近い 2 つは、操作の部品に少しかかっても札を出す（スマホで札が出なかった）   // 2026-10-26 16：上がふさがっていたら下へ（操作説明が出ているあいだも札を出す）
    }
    const k = Math.min(1, dt * 7);
    if (slot >= 0) u.sl += (slot - u.sl) * k;
    u.f += ((slot >= 0 ? 1 : 0) - u.f) * Math.min(1, dt * 9);
    sp.position.y = u.by + u.sl * sc.y * 1.1 / Math.max(1e-4, ps.y || 1);
    sp.material.opacity *= u.f; if (u.f < .02) sp.visible = false;
    if (slot >= 0 && sp.visible && u.f > .05 && e.L?.glyph) {   /* 札が画面に置けた印だけ線を引く */ e.L.glyph.getWorldPosition(a); sp.getWorldPosition(b); LP.push(a.x, a.y, a.z, b.x, b.y, b.z); const la = Math.min(1, sp.material.opacity * 1.2) * .8; if (la > .05) LA.push(la, la); else LP.length -= 6;   /* 札が見えないほど薄いときは線も出さない */ }
  }
  // 2026-10-28 Qualium 共通：札と印を細い線で結ぶ（どの札がどの印のものかを分かるように）。札と同じく壁の向こうでは隠れる（札が壁に隠れて線だけが空に刺さって見えていた）
  if (!placeLabels._ln && list[0]) { let root = list[0].sp; while (root.parent) root = root.parent;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(64 * 6), 3)); g.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(64 * 2), 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, toneMapped: false, vertexShader: "attribute float alpha; varying float vA; void main(){ vA=alpha; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: "varying float vA; void main(){ gl_FragColor=vec4(.86,.95,1.,vA); }" });
    const ln = new THREE.LineSegments(g, m); ln.frustumCulled = false; ln.renderOrder = 5; root.add(ln); placeLabels._ln = ln; }
  const ln = placeLabels._ln; if (ln) { const P = ln.geometry.attributes.position, A = ln.geometry.attributes.alpha, n = Math.min(64, LP.length / 6);
    for (let i = 0; i < n * 6; i++) P.array[i] = LP[i]; for (let i = 0; i < n * 2; i++) A.array[i] = LA[i]; P.needsUpdate = A.needsUpdate = true; ln.geometry.setDrawRange(0, n * 2); }
}
