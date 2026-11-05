// © mitsulab. 環世界のコモングラウンド＝Qualium（2026-11-05 第 4 版・写実の土の地）
// 場（フィジカル情報の層＝下・デジタル情報の層＝上）の中に、六つの主体（鳥・虫・人間・AI・センサー・GIS）がばらばらに立つ。
// 環世界（ゆらぐ膜）は主体ごとに主体のまわりにあり、となりどうしで重なる。重なり U_i ∩ U_j が網のように広がる所がコモングラウンド。中心は一つに置かない。
// 依代（碧）と町の依代は、中心ではなく、重なりと重なりのあいだに立つ一つ。U_i = g_i(P_i(E, B_i), K_i) の札は HTML（index.html）を 3D の位置へ写す。
// 大きさは見やすく描いた模式。見えていないときは描かない（IntersectionObserver）。
import * as THREE from 'three';
export function start(box){
  const mob=innerWidth<760, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv=box.querySelector('canvas'), R=new THREE.WebGLRenderer({canvas:cv,antialias:!mob,alpha:true,powerPreference:'low-power'});
  R.setPixelRatio(Math.min(devicePixelRatio,mob?1.4:1.75)); R.outputColorSpace=THREE.SRGBColorSpace; R.toneMapping=THREE.ACESFilmicToneMapping; R.toneMappingExposure=1.05;
  const S=new THREE.Scene(); S.fog=new THREE.Fog(0x05080f,11,22);
  const C=new THREE.PerspectiveCamera(32,1,.1,60);
  const W=new THREE.Group(); S.add(W);   // 回す世界
  const WQ=[];   // 裏で一つずつ GPU へ送る（毎こま一つだけ、本番の描画の前に）
  const Q=[];   // 3D の読み込みは一つずつ、間をあけて（読み込み中のこま落ちを抑える）
  const anim=[];
  let vis=true, raf=0, dirty=1, last=performance.now(), T0=last, auto=0;
  // 光：上の斜めから主の光、奥から水色の縁の光、地からの返し
  S.add(new THREE.HemisphereLight(0xcfe4ff,0x1a1408,.9));
  const key=new THREE.DirectionalLight(0xfff1dc,2.1); key.position.set(4,8,6); S.add(key);
  const rim=new THREE.DirectionalLight(0x8fd3ff,1.6); rim.position.set(-5,4,-7); S.add(rim);
  const RR=3.1, SUB=[   // 位置は xz（z＋が手前）。輪にせず、ばらばらに置く。layers＝受けとる層（p＝フィジカル・d＝デジタル）
    {k:'bird',x:-3.7,z:-.5,c:0x9fd8ff,h:.95,ly:'ppp'},{k:'bee',x:-2.0,z:1.75,c:0xf0d58c,h:1.0,ly:'ppp'},{k:'human',x:.95,z:1.35,c:0xe6ebf6,h:1.85,ly:'ppd'},
    {k:'ai',x:2.15,z:-1.45,c:0x8ff7e0,h:1.35,ly:'ddp'},{k:'sensor',x:3.7,z:.85,c:0xb8f0a8,h:1.3,ly:'ppd'},{k:'gis',x:-.75,z:-1.95,c:0xc9b8ff,h:1.25,ly:'ddd'}];
  SUB.forEach(s=>{s.p=new THREE.Vector3(s.x,0,s.z);s.a=Math.atan2(s.z,s.x)*180/Math.PI;s.ry=Math.atan2(-s.p.x,-s.p.z)+.5;});
  const blobT=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
  const blob=(p,r)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),new THREE.MeshBasicMaterial({map:blobT,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(p.x,.012,p.z);W.add(m);};
  // ---- 地：暗い地に、デジタルの格子（水色）とフィジカルの等高線（砂色）。縁は闇に溶ける
  { const tl=new THREE.TextureLoader(), sc=tl.load('img/hero/3d/dio/soil_c.webp',()=>{dirty=1;}), sn=tl.load('img/hero/3d/dio/soil_n.webp',()=>{dirty=1;});
    [sc,sn].forEach(x=>{x.wrapS=x.wrapT=THREE.RepeatWrapping;x.anisotropy=mob?2:8;}); sc.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{t:{value:0},sc:{value:sc},sn:{value:sn}},
      vertexShader:`varying vec2 v;void main(){v=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 v;uniform float t;uniform sampler2D sc,sn;void main(){float r=length(v);float fade=smoothstep(5.6,1.5,r);
        vec3 so=texture2D(sc,v*.42).rgb*.55+texture2D(sc,v*.11+.3).rgb*.45;vec3 nn=texture2D(sn,v*.42).rgb*2.-1.;
        float lit=clamp(.55+.45*dot(normalize(vec3(nn.xy,1.)),normalize(vec3(.45,.6,.65))),0.,1.3);
        float sun=.55+.45*smoothstep(4.8,.4,length(v-vec2(.6,.9)));
        vec2 g=abs(fract(v*1.25)-.5);float grid=smoothstep(.47,.5,max(g.x,g.y));
        float h=sin(v.x*.9+1.3)*cos(v.y*.7-.4)+.5*sin(r*1.1-t*.15);float con=smoothstep(.06,0.,abs(fract(h*2.2)-.5)-.44);
        vec3 earth=pow(so,vec3(1.15))*lit*sun*1.05;vec3 col=mix(vec3(.035,.05,.075),earth,smoothstep(5.4,2.2,r))+vec3(.56,.83,1.)*grid*.11+vec3(.91,.77,.54)*con*.13;
        gl_FragColor=vec4(col,fade*.97);}`});
    const g=new THREE.Mesh(new THREE.CircleGeometry(7.4,mob?64:96),m); g.rotation.x=-Math.PI/2; W.add(g); W.userData.ground=m; }
  // ---- 情報の層：下にフィジカル情報（砂色）3 枚、上にデジタル情報（水色）3 枚。布のようにゆらぐ
  const sheetM=(col,ph)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{t:{value:0},col:{value:new THREE.Color(col)},ph:{value:ph}},
    vertexShader:`uniform float t,ph;varying vec2 v;void main(){vec3 p=position;p.z+=sin(p.x*.7+t*.5+ph)*.09+cos(p.y*.6-t*.4+ph*1.7)*.08;v=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform vec3 col;uniform float t,ph;varying vec2 v;void main(){float r=length(v);float a=smoothstep(5.4,2.4,r);
      float s=smoothstep(.0,.02,abs(fract(v.x*.55+v.y*.2+ph+t*.03)-.5)-.47);float d=step(.82,fract(sin(dot(floor(v*3.),vec2(12.9,78.2)))*43758.5));
      gl_FragColor=vec4(col,a*(.035+s*.075+d*.04));}`});
  const sheets=[], SY={p:[.3,.5,.7],d:[2.55,2.75,2.95]};
  ['p','d'].forEach(k=>SY[k].forEach((y,i)=>{const m=sheetM(k==='p'?0xe8c48a:0x8fd3ff,i*1.9+(k==='d'?3:0));const o=new THREE.Mesh(new THREE.PlaneGeometry(13,13,mob?24:40,mob?24:40),m);o.rotation.x=-Math.PI/2;o.position.y=y;W.add(o);sheets.push(m);}));
  // ---- 層から主体へ、受けとる線（3 本ずつ）。線の上を光の粒が下りてくる
  const lineM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{t:{value:0}},
    vertexShader:`attribute float u;attribute vec3 col;varying float vu;varying vec3 vc;void main(){vu=u;vc=col;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float t;varying float vu;varying vec3 vc;void main(){float f=.22+.78*smoothstep(.1,0.,abs(fract(vu*2.-t*.45)-.5)-.38);gl_FragColor=vec4(vc,f*.75);}`});
  { const P=[],U=[],Cc=[], cp=new THREE.Color(0xe8c48a), cd=new THREE.Color(0x8fd3ff);
    SUB.forEach(s=>{ [...s.ly].forEach((k,j)=>{ const y=SY[k][j], ang=s.a*Math.PI/180+(j-1)*.55, rr=s.p.length()+.95+(j%2)*.3;
      const a=new THREE.Vector3(Math.cos(ang)*rr,y,Math.sin(ang)*rr), b=s.p.clone().setY(s.h*.62), col=k==='p'?cp:cd, n=14;
      for(let q=0;q<n;q++){ for(const e of [q,q+1]){ const u=e/n; P.push(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u+Math.sin(u*Math.PI)*.18,a.z+(b.z-a.z)*u); U.push(u); Cc.push(col.r,col.g,col.b); } }
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:col,toneMapped:false})); dot.position.copy(a); W.add(dot); }); });
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('u',new THREE.Float32BufferAttribute(U,1)); g.setAttribute('col',new THREE.Float32BufferAttribute(Cc,3));
    W.add(new THREE.LineSegments(g,lineM)); }
  // ---- それぞれの環世界：主体を包み、中心へ寄せた膜（縁だけ光る）。六つが中央で重なる
  const BR=1.78, BY=.5, BC=SUB.map(s=>s.p.clone().setY(.95));
  const shellM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{t:{value:0},col:{value:new THREE.Color()}},
    vertexShader:`uniform float t;varying float f;void main(){vec3 p=position;float w=sin(p.x*3.1+t*.9)*sin(p.y*2.7-t*.7)*sin(p.z*2.3+t*.5);p+=normal*w*.06;vec4 mv=modelViewMatrix*vec4(p,1.);vec3 n=normalize(normalMatrix*normal);f=pow(1.-abs(dot(n,normalize(-mv.xyz))),2.4);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 col;varying float f;void main(){gl_FragColor=vec4(col,f*.09);}`});
  const shellG=new THREE.SphereGeometry(BR,mob?36:56,mob?24:36), shells=SUB.map((s,i)=>{const m=shellM.clone();m.uniforms.col.value.setHex(s.c);const o=new THREE.Mesh(shellG,m);o.position.copy(BC[i]);o.scale.y=BY;W.add(o);return o;});
  // 粒：いくつの環世界の中にあるかで明るさが変わる（重なるほど明るい＝共有の場）
  { const N=mob?5000:14000, P=new Float32Array(N*3);
    for(let i=0;i<N;i++){let x,y,z;do{x=Math.random()*2-1;y=Math.random();z=Math.random()*2-1}while(x*x+z*z>1);P.set([x*5.8,.05+y*2.1,z*4.4],i*3);}
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3));
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{t:{value:0},c:{value:BC},r:{value:BR},px:{value:R.getPixelRatio()}},
      vertexShader:`uniform float t,r,px;uniform vec3 c[6];varying float k;void main(){vec3 p=position;p.y+=sin(t*.3+p.x*1.7+p.z)*.05;float n=0.;for(int i=0;i<6;i++){vec3 d=p-c[i];d.y/=${BY.toFixed(2)};n+=step(length(d),r);}k=n;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=px*(1.1+smoothstep(2.,6.,n)*1.9)*(9./-mv.z);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying float k;void main(){vec2 q=gl_PointCoord-.5;if(dot(q,q)>.25)discard;float a=k<.5?.0:k<1.5?.03:.13+.05*(k-2.);vec3 col=mix(vec3(.6,.78,.9),vec3(.8,1.,.97),clamp(k-1.,0.,1.));gl_FragColor=vec4(col,min(a,.6));}`});
    W.add(new THREE.Points(g,m)); W.userData.pts=m; }
  // ---- 重なりの網：となりどうしの環世界が重なる所（U_i ∩ U_j）に節を置き、主体と節を細い線で結ぶ。中心は一つではない
  const LENS=[]; for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){const d=SUB[i].p.distanceTo(SUB[j].p);if(d<BR*2*.99)LENS.push({i,j,m:SUB[i].p.clone().add(SUB[j].p).multiplyScalar(.5).setY(.95)});}
  { const P=[],U=[],Cc=[], ca=new THREE.Color(), cb=new THREE.Color(), cw=new THREE.Color(0xa8f2f6);
    LENS.forEach(L=>{[L.i,L.j].forEach(q=>{const a=SUB[q].p.clone().setY(SUB[q].h*.55), b=L.m, n=12; ca.setHex(SUB[q].c);
      for(let e=0;e<n;e++)for(const f of [e,e+1]){const u=f/n; P.push(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u+Math.sin(u*Math.PI)*.22,a.z+(b.z-a.z)*u); U.push(u); cb.copy(ca).lerp(cw,u); Cc.push(cb.r,cb.g,cb.b);} }); });
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('u',new THREE.Float32BufferAttribute(U,1)); g.setAttribute('col',new THREE.Float32BufferAttribute(Cc,3));
    W.add(new THREE.LineSegments(g,lineM));
    const nodeT=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(220,255,252,1)');gr.addColorStop(.25,'rgba(168,242,246,.55)');gr.addColorStop(1,'rgba(168,242,246,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
    const nodes=LENS.map((L,k)=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:nodeT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));sp.position.copy(L.m);sp.scale.setScalar(.34);W.add(sp);return sp;});
    {const RP=[];LENS.forEach(L=>{for(let q=0;q<48;q++)for(const e of [q,q+1]){const a=e/48*Math.PI*2;RP.push(L.m.x+Math.cos(a)*.31,.02,L.m.z+Math.sin(a)*.31);}});W.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(RP,3)),new THREE.LineBasicMaterial({color:0xa8f2f6,transparent:true,opacity:.3,toneMapped:false,depthWrite:false,blending:THREE.AdditiveBlending})));}
    anim.push(t=>nodes.forEach((n,k)=>n.scale.setScalar(.3+.06*Math.sin(t*1.3+k*1.7)))); }
  // ---- 主体の 3D
  const look=o=>o;
  const std=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:o.r??.45,metalness:o.m??.6,emissive:o.e??0,emissiveIntensity:o.ei??1});
  const at=(s,o,y=0)=>{o.position.set(s.p.x,y,s.p.z);o.rotation.y=s.ry;W.add(o);blob(s.p,s.k==='human'?.55:.45);return o;};
  // AI：台の上に、学習したモデル（節と結び目の多面体）と、分けた先の小さな箱（三つ）
  { const s=SUB[3], g=new THREE.Group();
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.32,.38,.5,32),std(0x1b2433,{r:.35,m:.8})); base.position.y=.25; g.add(base);
    const ico=new THREE.Mesh(new THREE.IcosahedronGeometry(.36,1),new THREE.MeshBasicMaterial({color:0x8ff7e0,wireframe:true,transparent:true,opacity:.75,toneMapped:false})); ico.position.y=.95; g.add(ico);
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,2),std(0x0d3a36,{e:0x5fe6cc,ei:1.4,r:.3,m:.2})); core.position.y=.95; g.add(core);
    const nodes=new THREE.InstancedMesh(new THREE.SphereGeometry(.03,6,4),new THREE.MeshBasicMaterial({color:0xd8fff6,toneMapped:false}),12); const v=ico.geometry.attributes.position, M=new THREE.Matrix4();
    for(let i=0;i<12;i++){M.makeTranslation(v.getX(i*5%v.count),v.getY(i*5%v.count)+.95,v.getZ(i*5%v.count));nodes.setMatrixAt(i,M);} g.add(nodes);
    for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.13),std([0x8ff7e0,0x8fd3ff,0xe8c48a][i],{r:.4,m:.3,e:[0x1e5c50,0x1e4060,0x5a4020][i],ei:.8}));b.position.set((i-1)*.3,1.42,0);g.add(b);}
    at(s,g); anim.push(t=>{ico.rotation.y=t*.35;ico.rotation.x=Math.sin(t*.3)*.3;nodes.rotation.copy(ico.rotation);nodes.position.y=0;core.rotation.y=-t*.5;}); }
  // センサー：細い柱の上に箱と受けの皿。足もとに、振動を受ける輪が広がる
  { const s=SUB[4], g=new THREE.Group();
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,1.05,12),std(0x9aa3ae,{r:.3,m:.9})); pole.position.y=.52; g.add(pole);
    const head=new THREE.Mesh(new THREE.BoxGeometry(.26,.2,.18),std(0xd9dee6,{r:.5,m:.2})); head.position.y=1.12; g.add(head);
    const led=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),new THREE.MeshBasicMaterial({color:0xb8f0a8,toneMapped:false})); led.position.set(0,1.14,.095); g.add(led);
    const dish=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.015,24),std(0xc8ced8,{r:.4,m:.7})); dish.position.y=1.28; g.add(dish);
    const probe=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.32,8),std(0x7c8692,{r:.3,m:.9})); probe.position.y=-.1; g.add(probe);   // 地中へ差す棒（温度・振動）
    const ringM=new THREE.MeshBasicMaterial({color:0xb8f0a8,transparent:true,opacity:.6,toneMapped:false,depthWrite:false}), rings=[0,1,2].map(()=>{const o=new THREE.Mesh(new THREE.RingGeometry(.97,1,64),ringM.clone());o.rotation.x=-Math.PI/2;o.position.y=.02;g.add(o);return o;});
    at(s,g); anim.push(t=>{rings.forEach((o,i)=>{const u=(t*.4+i/3)%1;o.scale.setScalar(.15+u*.9);o.material.opacity=.55*(1-u);});led.material.color.setScalar(.6+.4*Math.sin(t*3)**2).multiply(new THREE.Color(0xb8f0a8));}); }
  // GIS：位置の印と、地形の層を三枚重ねた小さな板
  { const s=SUB[5], g=new THREE.Group(), cols=[0xe8c48a,0x8fd3ff,0xc9b8ff];
    cols.forEach((c,i)=>{const pg=new THREE.PlaneGeometry(.95,.95,18,18);const a=pg.attributes.position;for(let j=0;j<a.count;j++){const x=a.getX(j),y=a.getY(j);a.setZ(j,i===0?Math.max(0,.16-Math.hypot(x-.1,y+.05)*.35)+Math.sin(x*7)*.015:0);}pg.computeVertexNormals();
      const m=i===0?std(0x6d5a42,{r:.85,m:0}):new THREE.MeshBasicMaterial({color:c,wireframe:true,transparent:true,opacity:.55,toneMapped:false});const o=new THREE.Mesh(pg,m);o.rotation.x=-Math.PI/2;o.position.y=.28+i*.3;g.add(o);});
    const pin=new THREE.Mesh(new THREE.ConeGeometry(.07,.22,16),std(0xc9b8ff,{e:0x3a2c70,ei:1,r:.4,m:.2})); pin.rotation.x=Math.PI; pin.position.set(.1,1.1,.05); g.add(pin);
    const pinB=new THREE.Mesh(new THREE.SphereGeometry(.07,16,12),pin.material); pinB.position.set(.1,1.22,.05); g.add(pinB);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.9,6),new THREE.MeshBasicMaterial({color:0xc9b8ff,transparent:true,opacity:.5,toneMapped:false})); st.position.set(.1,.55,.05); g.add(st);
    at(s,g); anim.push(t=>{pin.position.y=1.1+Math.sin(t*1.4)*.04;pinB.position.y=pin.position.y+.12;}); }
  // ミツバチ（形態は creatures.js の写実の造形＝頭・胸・腹、4 枚の翅、6 本の脚）。花の上でホバリング
  Q.push(async()=>{try{const {makeBee}=await import('./kit/creatures.js');const s=SUB[1],b=makeBee();b.scale.setScalar(.5);const g=new THREE.Group();g.add(b);
    const fl=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.018,.6,6),std(0x5f7a3a,{r:.8,m:0}));stem.position.y=.3;fl.add(stem);
    for(let i=0;i<6;i++){const pt=new THREE.Mesh(new THREE.SphereGeometry(.07,10,6),std(0xf2efe6,{r:.7,m:0}));pt.scale.set(1,.25,.55);const a=i/6*Math.PI*2;pt.position.set(Math.cos(a)*.08,.6,Math.sin(a)*.08);pt.rotation.y=-a;fl.add(pt);}
    const ce=new THREE.Mesh(new THREE.SphereGeometry(.04,10,8),std(0xe0b030,{r:.8,m:0}));ce.position.y=.62;fl.add(ce);fl.position.set(.15,0,.12);g.add(fl);
    at(s,g);b.position.y=.95;anim.push(t=>{b.position.set(Math.sin(t*.9)*.05,.95+Math.sin(t*2.1)*.03,Math.cos(t*.7)*.04);b.userData.animate&&b.userData.animate(t,true);});dirty=1;}catch(e){console.warn('cg bee',e);}});
  // ヒヨドリ（Qualia/sight の写実のモデル）。石の上にとまる
  Q.push(async()=>{try{const M=await import('./kit/sight/sightModels.js');const m=await M.loadSight('hiyo',{shadow:false,autoplay:false});const s=SUB[0],g=new THREE.Group();
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.28,1),std(0x6e6a62,{r:.95,m:0}));st.scale.set(1.3,.55,1);st.position.y=.12;g.add(st);
    m.object.scale.setScalar(4.2);m.object.position.y=.24;g.add(m.object);const pl=new THREE.PointLight(0xdcecff,3.2,2.6,1.6);pl.position.set(.35,1.1,.7);g.add(pl);m.play(m.clips.includes('perch')?'perch':m.info.main,0);m.update&&m.update(.01);at(s,g);anim.push((t,dt)=>m.update?m.update(dt):m.mixer.update(dt));dirty=1;}catch(e){console.warn('cg bird',e);}});
  // 人（MakeHuman の CC0 から作った human.glb）
  Q.push(async()=>{try{const [{GLTFLoader},{MeshoptDecoder}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js')]);
    const L=new GLTFLoader();L.setMeshoptDecoder(MeshoptDecoder);const g=await L.loadAsync('img/hero/3d/human.glb'),o=g.scene;o.traverse(m=>{if(m.isMesh){m.frustumCulled=false;const mt=m.material;if(mt&&mt.metalness!=null){mt.metalness=0;mt.roughness=Math.max(.55,mt.roughness||0);}if(/hair|brow|short/i.test(m.name)&&mt){mt.alphaTest=.5;mt.side=THREE.DoubleSide;}}});
    const bb=new THREE.Box3().setFromObject(o),sz=bb.getSize(new THREE.Vector3()),k=1.72/sz.y;o.scale.setScalar(k);o.position.set(-(bb.min.x+sz.x/2)*k,-bb.min.y*k,-(bb.min.z+sz.z/2)*k);
    const p=new THREE.Group();p.add(o);const s=SUB[2];at(s,p);p.rotation.y=s.ry+Math.PI*.82;dirty=1;}catch(e){console.warn('cg human',e);}});
  // 依代（碧）：重なりの真ん中に立つ（ほかの図と同じ VRM のバイト列を使い回す）
  let mot=null,vrm=null,aoiP=null,aoiN=0;
  const lensOf=(a,b)=>LENS.find(L=>SUB[L.i].k===a&&SUB[L.j].k===b||SUB[L.i].k===b&&SUB[L.j].k===a);
  const AOI=(lensOf('bird','gis')||LENS[0]).m.clone().setY(0), YORI=(lensOf('ai','sensor')||LENS[LENS.length-1]).m.clone().setY(0);
  // 町の依代（Qualium 大宮と同じ姿・その場で組む形）：AI とセンサーの重なりのあいだに
  Q.push(async()=>{try{const {MachiYori}=await import('./kit/machiyori.js');const g=new THREE.Group();const my=new MachiYori({scene:g,camera:C,dom:document.createElement('i')});
    my.add('shizuku',{x:YORI.x,z:YORI.z,yaw:.4,scale:1.45});W.add(g);blob(YORI,.3);anim.push((t,dt)=>my.update(dt));dirty=1;}catch(e){console.warn('cg yori',e);}});
  Q.push(async()=>{try{const [{GLTFLoader},{MeshoptDecoder},V]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js'),import('@pixiv/three-vrm')]);
    const L=new GLTFLoader();L.setMeshoptDecoder(MeshoptDecoder);L.register(p=>new V.VRMLoaderPlugin(p));
    const buf=await(window.__aoiBuf||(window.__aoiBuf=fetch('img/hero/aoi.vrm').then(r=>r.arrayBuffer())));const g=await L.parseAsync(buf.slice(0),'');
    vrm=g.userData.vrm;await new Promise(r=>setTimeout(r,0)); V.VRMUtils.removeUnnecessaryVertices(g.scene); await new Promise(r=>setTimeout(r,0)); V.VRMUtils.rotateVRM0(vrm);vrm.scene.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
    const p=new THREE.Group();p.add(vrm.scene);p.visible=false;aoiP=p;W.add(p);vrm.humanoid.resetNormalizedPose();vrm.update(0);
    const bb=new THREE.Box3().setFromObject(vrm.scene);p.scale.setScalar(1.62/(bb.max.y-bb.min.y));p.position.set(AOI.x,0,AOI.z);blob(AOI,.5);
    const {AoiMotion}=await import('./aoi_motion.js?v=20261026-v61');mot=new AoiMotion(vrm,{root:p,reducedMotion:reduce,wind:.2,faceViewer:false,startCalm:1,posture:'upright',uprightWeight:.9});mot.faceTo(.2);dirty=1;
  }catch(e){console.warn('cg aoi',e);}});
  // ---- 札（index.html の .cg-lb）を 3D の位置へ写す
  const st=box.querySelector('.cg-st'); const LB={};st.querySelectorAll('.cg-lb').forEach(d=>LB[d.dataset.k]=d);
  const anchors=SUB.map(s=>({k:s.k,p:s.p.clone().setY(s.h+.2)})).concat([{k:'aoi',p:AOI.clone().setY(1.85)},{k:'yori',p:YORI.clone().setY(.95)},{k:'phys',p:new THREE.Vector3(-5.6,.45,2.4)},{k:'digi',p:new THREE.Vector3(5.2,2.85,-2.2)}]);
  const v=new THREE.Vector3(), vc=new THREE.Vector3();
  // 視点：ゆっくり左右にめぐる。横になぞると回せる（縦のスクロールは止めない）
  let yaw=0, drag=null, user=0;
  cv.style.touchAction='pan-y';
  cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y0:yaw};user=performance.now();});
  addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.y0+(e.clientX-drag.x)*.006;user=performance.now();dirty=1;if(!raf&&vis)raf=requestAnimationFrame(loop);},{passive:true});
  addEventListener('pointerup',()=>{drag=null;});addEventListener('pointercancel',()=>{drag=null;});
  let wpx=0,hpx=0;
  function size(){wpx=box.querySelector('.cg-st').clientWidth;hpx=box.querySelector('.cg-st').clientHeight;R.setSize(wpx,hpx,false);C.aspect=wpx/hpx;const tall=C.aspect<1;C.fov=tall?50:30;C.position.set(0,tall?10.4:6.2,tall?8.2:12.8);C.lookAt(0,tall?.9:1.0,0);C.updateProjectionMatrix();dirty=1;}
  size(); addEventListener('resize',size);
  new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis&&!raf)raf=requestAnimationFrame(loop);}).observe(box);
  function frame(t,dt){
    if(!reduce){ if(!drag&&performance.now()-user>2500){auto+=dt*.07;} }
    W.rotation.y=yaw+Math.sin(auto)*.35;
    sheets.forEach(m=>m.uniforms.t.value=t); lineM.uniforms.t.value=t; shells.forEach((o,i)=>o.material.uniforms.t.value=t+i); W.userData.pts.uniforms.t.value=t; W.userData.ground.uniforms.t.value=t;
    anim.forEach(f=>f(t,dt));
    if(mot){mot.update(dt,C,{vrmUpdate:false});vrm.update(dt);mot.afterVrmUpdate(dt);if(!aoiP.visible&&++aoiN>3)aoiP.visible=true;}
    if(WQ.length)WQ.shift()();
    R.render(S,C);
    vc.set(0,1,0).applyMatrix4(W.matrixWorld).project(C); const cx=(vc.x*.5+.5)*wpx, cy=(-vc.y*.5+.5)*hpx;
    const box_=[];
    for(const a of anchors){const d=LB[a.k];if(!d)continue;v.copy(a.p).applyMatrix4(W.matrixWorld);const dz=v.clone().applyMatrix4(C.matrixWorldInverse).z;v.project(C);
      let x=(v.x*.5+.5)*wpx,y=(-v.y*.5+.5)*hpx;
      if(a.k==='aoi'||a.k==='yori'){const dw=d.offsetWidth,dh=d.offsetHeight;box_.push({d,lx:Math.max(2,Math.min(wpx-dw-2,x-dw/2)),ly:a.k==='aoi'?y-dh:y-dh-4,dw,dh,fix:1});continue;}
      if(a.k==='phys'||a.k==='digi'){const dw=d.offsetWidth,dh=d.offsetHeight;let lx=a.k==='phys'?x:x-dw;lx=Math.max(2,Math.min(wpx-dw-2,lx));box_.push({d,lx,ly:y-dh/2,dw,dh});continue;}
      const left=x<cx, up=y<cy, dw=d.offsetWidth, dh=d.offsetHeight; let lx=left?x-6-dw:x+6, ly=up?y-4-dh:y+4; lx=Math.max(2,Math.min(wpx-dw-2,lx)); ly=Math.max(2,Math.min(hpx-dh-2,ly)); box_.push({d,lx,ly,dw,dh,up});d.classList.toggle('l',left);
}
    // 札どうしが重なったら、上下へ押し分ける（数回）
    for(let it=0;it<6;it++)for(let i=0;i<box_.length;i++)for(let j=i+1;j<box_.length;j++){const A=box_[i],B=box_[j];
      if(A.lx<B.lx+B.dw&&B.lx<A.lx+A.dw&&A.ly<B.ly+B.dh&&B.ly<A.ly+A.dh){const o=(Math.min(A.ly+A.dh,B.ly+B.dh)-Math.max(A.ly,B.ly))/2+2;const fa=A.fix?0:B.fix?2:1,fb=2-fa;if(A.ly<B.ly){A.ly-=o*fa;B.ly+=o*fb;}else{A.ly+=o*fa;B.ly-=o*fb;}}}
    for(const q of box_){q.ly=Math.max(2,Math.min(hpx-q.dh-2,q.ly));q.d.style.transform=`translate(${q.lx}px,${q.ly}px)`;}
    if(!st.classList.contains('on'))st.classList.add('on');
  }
  function loop(n){raf=0;if(!vis)return;const dt=Math.min(.05,(n-last)/1000);last=n;
    if(reduce&&!dirty&&!drag)return; dirty=0; frame((n-T0)/1000,dt); raf=requestAnimationFrame(loop);}
  const S2=new THREE.Scene(); S2.fog=S.fog; S.children.filter(o=>o.isLight).forEach(l=>S2.add(l.clone()));
  const idle=()=>new Promise(r=>window.requestIdleCallback?requestIdleCallback(r,{timeout:600}):setTimeout(r,60));
  const comp=async o=>{try{if(R.compileAsync)await R.compileAsync(o,C,S);
    // 絵（テクスチャ）も一枚ずつ、空いた時間に GPU へ送っておく（最初に描くときのつかえを無くす）
    const tx=new Set();o.traverse(m=>{[].concat(m.material||[]).forEach(mt=>{for(const k in mt){const v=mt[k];if(v&&v.isTexture)tx.add(v);}if(mt.uniforms)for(const k in mt.uniforms){const v=mt.uniforms[k].value;if(v&&v.isTexture)tx.add(v);}});});
    for(const t of tx){await idle();R.initTexture(t);}
    // 形（頂点の束）も一つずつ、1×1 の裏の画面へ一度描いて GPU に送っておく
    const ms=[];o.traverse(m=>{if(m.isMesh||m.isPoints||m.isLine)ms.push(m);});
    for(const m of ms){await idle();let p;if(m.isSkinnedMesh){p=new THREE.SkinnedMesh(m.geometry,m.material);p.bind(m.skeleton,m.bindMatrix);}else p=new (m.isInstancedMesh?THREE.InstancedMesh:m.isPoints?THREE.Points:m.isLineSegments?THREE.LineSegments:m.isLine?THREE.Line:THREE.Mesh)(m.geometry,m.material,m.count);
      if(m.isInstancedMesh){p.instanceMatrix=m.instanceMatrix;}if(m.morphTargetInfluences){p.morphTargetInfluences=m.morphTargetInfluences;p.morphTargetDictionary=m.morphTargetDictionary;}
      p.frustumCulled=false;p.onBeforeRender=m.onBeforeRender;dirty=1;await new Promise(r=>WQ.push(()=>{S2.add(p);R.setScissorTest(true);R.setScissor(0,0,1,1);R.render(S2,C);R.setScissorTest(false);S2.remove(p);r();}));} }catch(e){console.warn('cg warm',e);}};
  
  (async()=>{ await comp(S); raf=requestAnimationFrame(loop);
    for(const f of Q){ await idle(); const n0=W.children.length; const hold=[];
      // 足した物は、絵の具（シェーダー）を裏で作り終えてから場に出す
      const add0=W.add.bind(W); W.add=(...o)=>{hold.push(...o);return W;}; try{await f();}finally{W.add=add0;}
      for(const o of hold){const v=o.visible;o.visible=true;await comp(o);o.visible=v;W.add(o);} dirty=1; } })();
  if(reduce){const tick=()=>{if(dirty&&vis&&!raf)raf=requestAnimationFrame(loop);};setInterval(tick,400);}
}
