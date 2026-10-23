/* Qualia の印（2026-10-23 夜 本人「Qualia をもっと目立つように・美しいグラフィックで・かさねっこの形に似たデザインに」）
   地点の上に、かさねっこの形（丸い体・葉のように少し傾いた先）の半透明の結晶が、層の色に光ってゆっくり回る。
   足もとには層の色の輪と細い HUD の線、地点と結晶をつなぐ細い光の柱。
   遠くは柱と輪を強めて見つけやすく、近づくと結晶の縁と面がくっきりする。層を外すと消える（印の root が見えないとき）。
   描くのは 3 回だけ（結晶・輪・柱をそれぞれ InstancedMesh で、すべての印をまとめる）。
   使い方：const QM = makeQMarks(THREE, parent, n); QM.add(L, color) … 毎こま QM.update(list, camera, { t, focus, sky })
   L は glyph（結晶の位置と大きさ）・root（地面の位置・見える／見えない）・show（0〜1）を持つもの。 */

function crystalGeo(THREE) {
  // かさねっこの輪郭：下は丸く、上は細くなって先が少し横へ傾く。8 面の切子にして結晶らしく
  const pr = [];
  const N = 9;
  for (let i = 0; i <= N; i++) {
    const a = i / N;                       // 0＝下・1＝先
    const y = -.42 + a * .98;
    const r = a < .38 ? Math.sin(Math.acos(1 - a / .38 * 1.0)) * .30 + .0001 : .30 * Math.pow(1 - (a - .38) / .62, 1.25) + .0001;
    pr.push(new THREE.Vector2(Math.max(.0001, r), y));
  }
  const g = new THREE.LatheGeometry(pr, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {      // 先を横へ曲げる（葉の先）
    const y = p.getY(i), k = Math.max(0, y + .05);
    p.setX(i, p.getX(i) + k * k * 1.05);
  }
  g.computeVertexNormals();
  return g.toNonIndexed();
}

const VS_COMMON = /* glsl */`
  attribute vec3 iCol; attribute vec4 iP;   // iP: x＝見えかた（0〜1） y＝くっきり（近い） z＝強調 w＝遠さ（0〜1）
  varying vec3 vCol; varying vec4 vP; varying vec3 vW; varying vec3 vL;
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
    void main(){ vCol=iCol; vP=iP; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vL=position; gl_Position=projectionMatrix*viewMatrix*w; }`,
  /* glsl */`uniform float uT; varying vec3 vCol; varying vec4 vP; varying vec3 vW; varying vec3 vL;
    void main(){
      vec3 n=normalize(cross(dFdx(vW),dFdy(vW))); vec3 v=normalize(cameraPosition-vW); float nv=abs(dot(n,v));
      float fr=pow(1.-nv,2.2);
      vec3 Ld=normalize(vec3(sin(uT*.7),.9,cos(uT*.7)));
      float facet=.25+.75*max(0.,dot(n,Ld));
      float spec=pow(max(0.,dot(reflect(-v,n),Ld)),18.);
      float sc=exp(-pow((fract(vL.y*1.2-uT*.25)-.5)*14.,2.));
      float crisp=vP.y, em=vP.z;
      vec3 sat=mix(vec3(dot(vCol,vec3(.333))),vCol,1.35);
      vec3 c=sat*(.30+.7*facet)+sat*fr*(1.4+crisp*.9)+vec3(1.)*pow(fr,3.)*(.45+crisp*.5)+vec3(1.)*spec*(.5+crisp*.6)+sat*sc*.6;
      float a=(.38+.22*crisp+fr*.5+spec*.35+sc*.15)*(.6+.4*em);
      gl_FragColor=vec4(c*(1.+em*.35),clamp(a,0.,.95)*vP.x);
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
  return {
    add(L, color) { _c.set(color); items.push({ L, c: [_c.r, _c.g, _c.b], ph: items.length * 1.7 }); },
    get count() { return items.length; },
    update(cam, o = {}) {
      const t = o.t ?? performance.now() / 1000, sky = !!o.sky, focus = o.focus || null;
      crystal.material.uniforms.uT.value = ring.material.uniforms.uT.value = beam.material.uniforms.uT.value = t;
      const CA = crystal.geometry.attributes, RA = ring.geometry.attributes, BA = beam.geometry.attributes;
      let n = 0;
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
        CA.iCol.setXYZ(n, it.c[0], it.c[1], it.c[2]); CA.iP.setXYZW(n, show, crisp, em, far);
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
