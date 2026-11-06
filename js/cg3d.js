// © mitsulab. 環世界のコモングラウンド＝Qualium（2026-11-06 第 5 版・受けとる層）
// 六つの主体（鳥・虫・人間・AI・気象計・GIS）がばらばらに立つ。主体ごとに受けとれる範囲を、地面と平行な薄い層（色・高さ・広さが違う）で描く。
// 層が重なる所＝共有の場は、光が重なるように明るく浮かぶ。重なりは中心なく網のように広がる。
// 受けとり（知覚）→ 意味づけ（認知）→ 選んでふるまう（知性）→ 環境へ返る → ほかの主体の受けとりへ、の輪を光の粒で回す。
// 層に触れると、その主体の受けとる範囲が広がり、重なりが変わる。依代（碧）と町の依代は中心でなく、重なりのあいだに立つ一つ。大きさは模式。
import * as THREE from 'three';
export function start(box){
  const mob=innerWidth<760, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv=box.querySelector('canvas'), R=new THREE.WebGLRenderer({canvas:cv,antialias:!mob,alpha:true,powerPreference:'low-power'});
  R.setPixelRatio(Math.min(devicePixelRatio,mob?1.2:1.75)); R.outputColorSpace=THREE.SRGBColorSpace; R.toneMapping=THREE.ACESFilmicToneMapping; R.toneMappingExposure=1.0;
  const S=new THREE.Scene(); S.fog=new THREE.Fog(0x05080f,11,22);
  const C=new THREE.PerspectiveCamera(32,1,.1,60);
  const W=new THREE.Group(); S.add(W);   // 回す世界
  const WQ=[];   // 裏で一つずつ GPU へ送る（毎こま一つだけ、本番の描画の前に）
  const Q=[];   // 3D の読み込みは一つずつ、間をあけて（読み込み中のこま落ちを抑える）
  const anim=[];
  window.__aoiBuf=window.__aoiBuf||fetch('img/hero/aoi.vrm').then(r=>r.arrayBuffer());   // 碧は先に読みはじめる
  let vis=true, raf=0, dirty=1, last=performance.now(), T0=last, auto=0;
  // 光：上の斜めから主の光、奥から水色の縁の光、地からの返し
  S.add(new THREE.HemisphereLight(0xcfe4ff,0x1a1408,.9));
  const key=new THREE.DirectionalLight(0xfff1dc,2.1); key.position.set(4,8,6); S.add(key);
  const rim=new THREE.DirectionalLight(0x8fd3ff,1.6); rim.position.set(-5,4,-7); S.add(rim);
  // 位置は xz（z＋が手前）。輪にせず、ばらばらに置く。h＝札の高さ、hd＝受けとる頭の高さ、ly＝受けとる層の高さ、r＝受けとれる範囲（模式）
  const SUB=[
    {k:'bird',x:-3.7,z:-.5,c:0x8fc9ff,h:1.3,hd:.62,ly:1.95,r:1.55},{k:'bee',x:-2.0,z:1.75,c:0xf3c86e,h:1.35,hd:.98,ly:.62,r:1.5},{k:'human',x:.95,z:1.35,c:0xfff1dc,h:1.62,hd:1.6,ly:1.3,r:1.95},
    {k:'ai',x:2.15,z:-1.45,c:0x7ff0d6,h:1.75,hd:1.0,ly:1.62,r:1.75},{k:'sensor',x:3.7,z:.85,c:0xa9ec9a,h:1.3,hd:1.18,ly:.95,r:1.5},{k:'gis',x:-.75,z:-1.95,c:0xc4b2ff,h:1.25,hd:.95,ly:.24,r:2.3}];
  SUB.forEach(s=>{s.p=new THREE.Vector3(s.x,0,s.z);s.a=Math.atan2(s.z,s.x)*180/Math.PI;s.ry=Math.atan2(-s.p.x,-s.p.z)+.5;});
  const blobT=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
  const blob=(p,r)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),new THREE.MeshBasicMaterial({map:blobT,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(p.x,.012,p.z);W.add(m);};
  // ---- 受けとる範囲の今の値（触れると広がる）。中心 xz と半径を、層・地・網が共有する
  const NS=SUB.length, CEN=SUB.map(s=>new THREE.Vector3(s.x,s.z,0)), COL=SUB.map(s=>new THREE.Color(s.c));
  const rad=SUB.map(()=>0), radT=SUB.map(s=>s.r), lit=SUB.map(()=>1);   // 今の半径・目標・明るさ
  CEN.forEach((c,i)=>c.z=0);
  const RU=SUB.map(()=>new THREE.Vector3());   // xyz＝中心 x・中心 z・半径（シェーダーへ）
  const syncRU=()=>SUB.forEach((s,i)=>RU[i].set(s.x,s.z,rad[i]));
  syncRU();
  const GLSL_COMMON=`uniform vec3 ru[6];uniform vec3 rc[6];uniform float t;
    float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+1.),f.x),f.y);}
    float edgeR(int i,vec2 q){vec2 d=q-ru[i].xy;float a=atan(d.y,d.x);return ru[i].z*(1.+.045*sin(a*3.+t*.21+float(i)*1.7)+.03*sin(a*5.-t*.17+float(i)));}
    float ed(int i,vec2 q){return edgeR(i,q)-length(q-ru[i].xy);}
    float cov(int i,float e){return ru[i].z<.01?0.:smoothstep(-.12,.75,e);}   // 境界は溶け合う
    float cover(int i,vec2 q){return cov(i,ed(i,q));}`;
  // ---- 地：写実の土。上に、それぞれの範囲が淡く落ち、重なりの下には光が透けて揺らぐ（光の透過）。縁は闇に溶ける
  { const tl=new THREE.TextureLoader(), sc=tl.load('img/hero/3d/dio/soil_c.webp',()=>{dirty=1;}), sn=tl.load('img/hero/3d/dio/soil_n.webp',()=>{dirty=1;}), lc=tl.load('img/hero/3d/dio/leaves_c.webp',()=>{dirty=1;});
    lc.colorSpace=THREE.SRGBColorSpace;[sc,sn,lc].forEach(x=>{x.wrapS=x.wrapT=THREE.RepeatWrapping;x.anisotropy=mob?2:8;}); sc.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{t:{value:0},sc:{value:sc},sn:{value:sn},lft:{value:lc},ru:{value:RU},rc:{value:COL}},
      vertexShader:`varying vec2 v;void main(){v=vec2(position.x,-position.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:GLSL_COMMON+`varying vec2 v;uniform sampler2D sc,sn,lft;void main(){float r=length(v);float fade=smoothstep(6.2,2.,r);
        vec3 so=texture2D(sc,v*.42).rgb*.55+texture2D(sc,v*.11+.3).rgb*.45;vec3 nn=texture2D(sn,v*.42).rgb*2.-1.;
        float lt=clamp(.55+.45*dot(normalize(vec3(nn.xy,1.)),normalize(vec3(.45,.6,.65))),0.,1.3);
        float sun=.5+.5*smoothstep(5.,.4,length(v-vec2(.6,-.9)));
        float lmk=smoothstep(.48,.7,vn(v*.55+3.1)*.7+vn(v*2.3)*.3);vec3 lf=texture2D(lft,v*.38).rgb;so=mix(so,lf*vec3(.78,.7,.55),lmk*.75);   // 落ち葉のまだら（CC0 の葉の写真）
        float wet=smoothstep(.55,.8,vn(v*.9-1.7));so*=1.-wet*.22;   // 湿り
        vec3 earth=pow(so,vec3(1.1))*lt*sun*1.3;vec3 col=mix(vec3(.03,.045,.07),earth,smoothstep(5.8,2.4,r));
        float n=0.;vec3 lc=vec3(0.);float rim=0.;
        for(int i=0;i<6;i++){float e=ed(i,v);float c=cov(i,e);n+=c;lc+=rc[i]*c;rim+=smoothstep(.05,0.,abs(e))*step(.01,ru[i].z);}
        float cs=vn(v*3.1+vec2(t*.11,-t*.07))*vn(v*5.3-vec2(t*.05,t*.09));float caus=smoothstep(.18,.5,cs);
        float ov=smoothstep(1.2,2.,n);vec3 lm=n>.01?lc/n:vec3(0.);
        col+=lm*(n*.035+ov*(.10+.16*caus))+vec3(.75,.9,1.)*rim*.035;
        gl_FragColor=vec4(col,fade*.97);}`});
    const g=new THREE.Mesh(new THREE.CircleGeometry(7.6,mob?64:96),m); g.rotation.x=-Math.PI/2; W.add(g); W.userData.ground=m; }
  // ---- 受けとる層：主体ごとに一枚（地面と平行・色と高さと広さが違う）。縁はやわらかく、内に細い等距線、重なりでは光が混ざる
  const layerM=(i,slice)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{t:{value:0},ru:{value:RU},rc:{value:COL},me:{value:i},lit:{value:1},sl:{value:slice},mech:{value:['ai','sensor','gis'].includes(SUB[i].k)?1:0},hot:{value:0},selI:{value:-1}},
    vertexShader:`uniform float t,sl;uniform int me;varying vec2 v;varying float fr;void main(){vec3 p=position;v=vec2(p.x,-p.y);
      float w=sin(p.x*.8+t*.35+float(me)*2.1)*.045+cos(p.y*.7-t*.28+float(me))*.04;p.z+=w;
      vec4 wp=modelMatrix*vec4(p,1.);vec3 nv=normalize(cameraPosition-wp.xyz);fr=1.-abs(nv.y);gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:GLSL_COMMON+`uniform int me;uniform float lit,sl,mech,hot,selI;varying vec2 v;varying float fr;
      void main(){vec2 q=v+ru[me].xy;float d=length(q-ru[me].xy),er=edgeR(me,q),e=er-d;float own=cov(me,e);if(own<.002)discard;
        float rimL=smoothstep(.035,.0,abs(e-.02));float iso=smoothstep(.012,.0,abs(fract(d*3.2-t*.04)-.5)-.47)*smoothstep(.2,.9,e);
        float n=0.;vec3 lc=rc[me];float m2=0.;
        float lens=0.,ovs=0.;for(int i=0;i<6;i++){if(i==me)continue;vec2 dd=q-ru[i].xy;if(dot(dd,dd)>ru[i].z*ru[i].z*1.3)continue;float ej=ed(i,q);float c=cov(i,ej);n+=c;if(float(i)==selI||float(me)==selI)ovs+=c;lc+=rc[i]*c;m2+=c*ej;lens+=smoothstep(.03,0.,abs(ej-.01))*step(.01,ru[i].z);}
        vec3 base=rc[me];vec3 mixc=lc/(1.+n);
        float film=.5+.5*cos(6.2831*(m2*.8-e*.6)+t*.3);   // 重なりの縁に、薄い膜の干渉のような色のゆらぎ
        vec3 irid=.5+.5*cos(6.2831*(vec3(.0,.33,.67)+film*.35+e*.2));
        float ov=clamp(n,0.,1.);float rr=clamp(d/max(er,.01),0.,1.);
        float glow=smoothstep(.45,1.,rr);   // 縁ほど光をためる（ガラスの縁のように）
        vec3 col=mix(base*(.75+.45*glow),mix(mixc*1.3,vec3(1.),.18)+irid*.06,ov);
        col=mix(col,vec3(1.),rimL*.25+lens*.3+ovs*.1);col=mix(col,min(base*1.7,vec3(1.)),rimL*hot*.6);   // 選んだ層と相手の縁は、白でなくその層の色で灯す
        float a=own*(.018+.085*glow+.03*fr)+rimL*.1+iso*.07+ov*own*(.24+.08*film)*min(lit,1.)+lens*own*.3;
        float scan=mech*(smoothstep(.05,0.,abs(fract(q.y*9.-t*.15)-.5)-.44)*.6+smoothstep(.03,0.,min(abs(fract(q.x*3.)-.5),abs(fract(q.y*3.)-.5))-.47)*.35);   // 機械の層は走査線と格子で
        a+=own*scan*(.1+.22*smoothstep(.0,.6,e))+rimL*hot*.7+ovs*own*(float(me)==selI?.12:.05);a*=lit*(1.-sl*.55);
        float lu=dot(col,vec3(.299,.587,.114));col=mix(vec3(lu),col,.55);col=mix(col,vec3(.78,.84,.9),.12);   // 霞の低い彩度（世界観の決まり）
        gl_FragColor=vec4(min(col,vec3(1.)),a);}`});
  const layers=[];
  SUB.forEach((s,i)=>{const RM=s.r*1.55, seg=mob?28:44;
    const NSL=mob?2:3, th=.08+s.r*.045;   // 多層：主体ごとに厚みの違う層を重ねる
    for(let k=0;k<NSL;k++){const m=layerM(i,NSL===3?Math.abs(k-1)*.55:k*.5);const o=new THREE.Mesh(new THREE.PlaneGeometry(RM*2,RM*2,seg,seg),m);o.rotation.x=-Math.PI/2;o.position.set(s.x,s.ly+(k-(NSL-1)/2)*th,s.z);o.renderOrder=2+i;W.add(o);layers.push({o,m,i});}});
  // ---- 共有の場：二つの層が重なる所に、層と層をつなぐ光の柱（上下がやわらかく消える）。網の節
  const PAIRS=[]; for(let i=0;i<NS;i++)for(let j=i+1;j<NS;j++)PAIRS.push({i,j,m:new THREE.Vector3(),w:0,amt:0});
  const colM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{t:{value:0},a:{value:0},c:{value:new THREE.Color()}},vertexShader:`uniform float a;uniform vec3 c;varying float va;varying vec3 vc;varying float vy;varying float fr;void main(){va=a;vc=c;vy=uv.y;
      vec4 wp=modelMatrix*vec4(position,1.);vec3 nn=normalize(mat3(modelMatrix)*normal);fr=abs(dot(nn,normalize(cameraPosition-wp.xyz)));gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`uniform float t;varying float va;varying vec3 vc;varying float vy;varying float fr;void main(){float s=smoothstep(0.,.25,vy)*smoothstep(1.,.7,vy);
      float k=pow(fr,1.3);gl_FragColor=vec4(vc*(.9+.2*sin(vy*9.-t*1.2)),s*k*va*.55);}`});
  const cols=[]; { const base=new THREE.CylinderGeometry(1,1,1,mob?18:28,1,true);
    PAIRS.forEach(P=>{const m=colM.clone();m.uniforms.t=colM.uniforms.t;m.uniforms.c.value.copy(COL[P.i]).lerp(COL[P.j],.5).multiplyScalar(1.1);
      const o=new THREE.Mesh(base,m);o.visible=false;W.add(o);cols.push(o);}); }
  // 網：重なりの節どうしを、同じ主体を介してつなぐ細い光の糸（中心のない網）
  const WEB=[]; { const lm=P=>{const A=SUB[P.i],B=SUB[P.j];return [(A.x+B.x)/2,(A.z+B.z)/2];}; const ok=P=>Math.hypot(SUB[P.j].x-SUB[P.i].x,SUB[P.j].z-SUB[P.i].z)<SUB[P.i].r+SUB[P.j].r+.4;
    const ix=PAIRS.map((P,k)=>k).filter(k=>ok(PAIRS[k])), seen=new Set();
    ix.forEach(a=>{const [ax,az]=lm(PAIRS[a]);ix.filter(b=>b!==a).map(b=>{const [bx,bz]=lm(PAIRS[b]);return [Math.hypot(ax-bx,az-bz),b];}).sort((p,q)=>p[0]-q[0]).slice(0,2).forEach(([d,b])=>{const k=Math.min(a,b)+'-'+Math.max(a,b);if(seen.has(k))return;seen.add(k);const A=PAIRS[a],B=PAIRS[b];WEB.push({a:Math.min(a,b),b:Math.max(a,b),s:[A.i,A.j].find(x=>x===B.i||x===B.j)??A.i});});}); }
  const WN=10, webP=new Float32Array(WEB.length*WN*2*3), webA=new Float32Array(WEB.length*WN*2), webC=new Float32Array(WEB.length*WN*2*3), webU=new Float32Array(WEB.length*WN*2);
  WEB.forEach((E,e)=>{const c=COL[E.s];for(let q=0;q<WN*2;q++){webC.set([c.r,c.g,c.b],(e*WN*2+q)*3);webU[e*WN*2+q]=(Math.floor(q/2)+(q%2))/WN;}});
  const webG=new THREE.BufferGeometry(); webG.setAttribute('position',new THREE.BufferAttribute(webP,3)); webG.setAttribute('a',new THREE.BufferAttribute(webA,1)); webG.setAttribute('c',new THREE.BufferAttribute(webC,3)); webG.setAttribute('u',new THREE.BufferAttribute(webU,1));
  const webM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{t:{value:0}},
    vertexShader:`attribute float a,u;attribute vec3 c;varying float va,vu;varying vec3 vc;void main(){va=a;vu=u;vc=c;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float t;varying float va,vu;varying vec3 vc;void main(){float f=.35+.65*smoothstep(.12,0.,abs(fract(vu-t*.18)-.5)-.36);gl_FragColor=vec4(vc*1.2,va*f*.75);}`});
  const webL=new THREE.LineSegments(webG,webM); webL.frustumCulled=false; W.add(webL);
  const nodeT=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.22,'rgba(220,245,255,.5)');gr.addColorStop(1,'rgba(200,240,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
  const nodes=PAIRS.map(P=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:nodeT,color:COL[P.i].clone().lerp(COL[P.j],.5),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));sp.scale.setScalar(.3);W.add(sp);return sp;});
  // ---- めぐり：受けとる（層から頭へ）→ 意味づけ・選ぶ（頭のまわりを一周）→ ふるまいが環境へ返る（足もとから地をつたう）→ 重なりを昇って、となりの主体の層へ
  const NP=mob?90:190, TR=3, flowP=new Float32Array(NP*TR*3), flowC=new Float32Array(NP*TR*3), flowS=new Float32Array(NP*TR);
  const flowG=new THREE.BufferGeometry(); flowG.setAttribute('position',new THREE.BufferAttribute(flowP,3)); flowG.setAttribute('c',new THREE.BufferAttribute(flowC,3)); flowG.setAttribute('s',new THREE.BufferAttribute(flowS,1));
  const flowM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{px:{value:R.getPixelRatio()}},
    vertexShader:`attribute vec3 c;attribute float s;uniform float px;varying vec3 vc;varying float vs;void main(){vc=c;vs=s;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=px*(1.4+s*2.8)*(24./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec3 vc;varying float vs;void main(){vec2 q=gl_PointCoord-.5;float d=dot(q,q);if(d>.25)discard;gl_FragColor=vec4(mix(vc,vec3(1.),.35),vs*(1.-d*4.));}`});
  const flowPts=new THREE.Points(flowG,flowM); flowPts.frustumCulled=false; W.add(flowPts);
  const tmp=new THREE.Vector3(), tmp2=new THREE.Vector3();
  const nbr=i=>PAIRS.filter(P=>(P.i===i||P.j===i)&&P.amt>.3);
  function hop(i){   // 主体 i から、重なりのあるとなりへの道（点の列）
    const ns=nbr(i); if(!ns.length) return null; const P=ns[Math.floor(Math.random()*ns.length)], k=P.i===i?P.j:P.i, s=SUB[i], o=SUB[k];
    const pts=[], ph=Math.random()*6.28;
    for(let q=0;q<=8;q++){const u=q/8;pts.push(new THREE.Vector3(s.x+(o.x-s.x)*0,0,0).set(s.x+Math.cos(ph)*.02,s.ly+(s.hd-s.ly)*u,s.z));}   // 層から頭へ（受けとる）
    if(!['ai','sensor','gis'].includes(s.k))for(let q=1;q<=16;q++){const a=ph+q/16*6.2832;pts.push(new THREE.Vector3(s.x+Math.cos(a)*.26,s.hd+.06*Math.sin(a*2.),s.z+Math.sin(a)*.26));}   // 頭のまわりを一周（意味づけ・選ぶ）
    const f=new THREE.Vector3(s.x+Math.cos(ph)*.3,.04,s.z+Math.sin(ph)*.3);
    for(let q=1;q<=6;q++){const u=q/6;pts.push(new THREE.Vector3(s.x+Math.cos(ph)*.26,s.hd*(1-u)+.04*u,s.z+Math.sin(ph)*.26));}   // ふるまいが足もとへ
    for(let q=1;q<=10;q++){const u=q/10;pts.push(f.clone().lerp(tmp.set(P.m.x,.04,P.m.z),u).setY(.04+Math.sin(u*Math.PI)*.03));}   // 地をつたう（環境へ返る）
    for(let q=1;q<=8;q++){const u=q/8;pts.push(new THREE.Vector3(P.m.x,.04+(o.ly-.04)*u,P.m.z));}   // 重なりを昇る
    for(let q=1;q<=10;q++){const u=q/10;pts.push(new THREE.Vector3(P.m.x+(o.x-P.m.x)*u,o.ly+Math.sin(u*Math.PI)*.05,P.m.z+(o.z-P.m.z)*u));}   // となりの層をわたって、その主体の受けとりへ
    const L=[0];for(let q=1;q<pts.length;q++)L.push(L[q-1]+pts[q].distanceTo(pts[q-1]));
    return {pts,L,len:L[L.length-1],from:i,to:k};
  }
  const parts=[...Array(NP)].map((_,n)=>({at:n%NS,path:null,d:0,sp:.55+Math.random()*.35,wait:Math.random()*4}));
  function posOn(pa,d,out){const L=pa.L;let q=1;while(q<L.length-1&&L[q]<d)q++;const u=(d-L[q-1])/Math.max(1e-4,L[q]-L[q-1]);return out.copy(pa.pts[q-1]).lerp(pa.pts[q],Math.min(1,Math.max(0,u)));}
  let flowOn=0;
  function updFlow(dt){
    for(let n=0;n<NP;n++){const P=parts[n];
      if(!P.path){P.wait-=dt;if(P.wait<=0){P.path=hop(P.at);P.d=0;if(!P.path)P.wait=1+Math.random()*2;}}
      for(let r=0;r<TR;r++){const ix=(n*TR+r);if(!P.path){flowS[ix]=0;continue;}const d=P.d-r*.07;if(d<0){flowS[ix]=0;continue;}
        posOn(P.path,d,tmp);flowP.set([tmp.x,tmp.y,tmp.z],ix*3);const u=d/P.path.len;tmp2.copy(COL[P.path.from]).lerp(COL[P.path.to],smoothstep(.45,.95,u));flowC.set([tmp2.r,tmp2.g,tmp2.b],ix*3);
        flowS[ix]=flowOn*(1-r*.32)*(u<.02?u/.02:u>.97?(1-u)/.03:1);}
      if(P.path){P.d+=dt*P.sp;if(P.d>=P.path.len+.2){P.at=P.path.to;P.path=null;P.wait=.15+Math.random()*1.2;}}}
    flowG.attributes.position.needsUpdate=flowG.attributes.c.needsUpdate=flowG.attributes.s.needsUpdate=true;
  }
  function smoothstep(a,b,x){x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);}
  // 重なりの量・節・柱・網を、今の半径から求めなおす
  function updOverlap(intro){
    PAIRS.forEach((P,k)=>{const A=SUB[P.i],B=SUB[P.j],dx=B.x-A.x,dz=B.z-A.z,d=Math.hypot(dx,dz),ra=rad[P.i],rb=rad[P.j],o=ra+rb-d;
      P.amt=Math.min(1,Math.max(0,o/.55));const w=Math.max(0,Math.min(o,2*Math.min(ra,rb)))/2;const u=(ra-w)/Math.max(1e-3,d);
      P.m.set(A.x+dx*u,(A.ly+B.ly)/2,A.z+dz*u);P.w=w;
      const c=cols[k],a=P.amt*Math.min(lit[P.i],lit[P.j]);c.visible=a>.01;if(c.visible){const y0=Math.min(A.ly,B.ly)-.05,y1=Math.max(A.ly,B.ly)+.05;c.position.set(P.m.x,(y0+y1)/2,P.m.z);c.scale.set(Math.max(.06,w*.62),y1-y0,Math.max(.06,w*.62));
        c.material.uniforms.a.value=a;}
      nodes[k].position.set(P.m.x,P.m.y,P.m.z);nodes[k].material.opacity=a*.85;});
    WEB.forEach((E,e)=>{const A=PAIRS[E.a],B=PAIRS[E.b],hit=sel>=0&&([A.i,A.j,B.i,B.j].includes(sel)),a=A.amt*B.amt*intro*(sel<0?1:hit?2.6:.3),sy=SUB[E.s].ly;
      for(let q=0;q<WN;q++)for(let r=0;r<2;r++){const u=(q+r)/WN,ix=e*WN*2+q*2+r;tmp.copy(A.m).lerp(B.m,u);tmp.y+=Math.sin(u*Math.PI)*((sy-tmp.y)*.6);webP.set([tmp.x,tmp.y,tmp.z],ix*3);webA[ix]=a;}});
    webG.attributes.position.needsUpdate=webG.attributes.a.needsUpdate=true;
  }
  const LENS=PAIRS.filter(P=>{const A=SUB[P.i],B=SUB[P.j];return Math.hypot(B.x-A.x,B.z-A.z)<A.r+B.r;}).map(P=>{const A=SUB[P.i],B=SUB[P.j],d=Math.hypot(B.x-A.x,B.z-A.z),w=(A.r+B.r-d)/2,u=(A.r-w)/d;return {i:P.i,j:P.j,m:new THREE.Vector3(A.x+(B.x-A.x)*u,.95,A.z+(B.z-A.z)*u)};});
  // 触れる：層（主体の範囲）を押すと、その主体の受けとる範囲が広がり、ほかは少し退く。もう一度押すと戻る
  let sel=-1;
  const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(), pl=new THREE.Plane(new THREE.Vector3(0,1,0),0), hit=new THREE.Vector3(), inv=new THREE.Matrix4();
  function pick(e){const r=cv.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,C);
    let best=-1,bd=1e9;SUB.forEach((s,i)=>{pl.constant=-s.ly;inv.copy(W.matrixWorld);const p=pl.clone().applyMatrix4(inv);if(!ray.ray.intersectPlane(p,hit))return;const lp=W.worldToLocal(hit.clone());const d=Math.hypot(lp.x-s.x,lp.z-s.z)/rad[i];if(d<1&&d<bd){bd=d;best=i;}});
    return best;}
  function choose(i){sel=(i===sel)?-1:i;SUB.forEach((s,k)=>{radT[k]=sel<0?s.r:k===sel?s.r*1.22:s.r*.95;});
    st.querySelectorAll('.cg-lb').forEach(d=>d.classList.toggle('sel',sel>=0&&d.dataset.k===SUB[sel].k));
    const cap=st.querySelector('.cg-cap');if(cap){const nm=k=>{const d=st.querySelector('.cg-lb[data-k="'+k+'"] .cg-n > span');const t=(d?d.textContent:k).replace('計IoT','計・IoT').replace('gaugeIoT','gauge · IoT');return mob?t.replace(/[（(].*?[）)]/g,''):t;};
      if(sel<0)cap.textContent='';else{const S0=SUB[sel],ns=SUB.filter((o,k)=>k!==sel&&Math.hypot(o.x-S0.x,o.z-S0.z)<S0.r*1.6+o.r*.9).map(o=>nm(o.k));const en=document.documentElement.dataset.lang==='en';const mc=k=>['ai','sensor','gis'].includes(k);const rj=k=>mc(k)?'記録する範囲':'感じとる範囲';const re=k=>mc(k)?'the range it records':'the range it senses';
        const nk=SUB.filter((o,k)=>k!==sel&&Math.hypot(o.x-S0.x,o.z-S0.z)<S0.r*1.6+o.r*.9);const nb=nk.filter(o=>!mc(o.k)),nm2=nk.filter(o=>mc(o.k));const ja=nm(S0.k)+'の'+rj(S0.k)+'が、'+(nb.length?nb.map(o=>nm(o.k)+(mob?'の範囲':'の'+rj(o.k))).join('・')+'と重なり'+(nm2.length?'、':''):'')+(nm2.length?nm2.map(o=>nm(o.k)).join('・')+'の記録する範囲とも重なる':'');
        const enx=nm(S0.k)+': '+re(S0.k)+(nb.length?' overlaps with what '+nb.map(o=>nm(o.k)).join(', ')+' senses':'')+(nm2.length?(nb.length?', and also with what ':' overlaps with what ')+nm2.map(o=>nm(o.k)).join(', ')+' records':'');
        cap.textContent=nk.length?(en?enx:(ja.endsWith('重なり')?ja.slice(0,-1)+'る':ja)):'';}}dirty=1;}
  // ---- 主体の 3D
  const look=o=>o;
  const std=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:o.r??.45,metalness:o.m??.6,emissive:o.e??0,emissiveIntensity:o.ei??1});
  const at=(s,o,y=0)=>{o.position.set(s.p.x,y,s.p.z);o.rotation.y=s.ry;W.add(o);blob(s.p,s.k==='human'?.55:.45);return o;};
  // AI：台の上に、学習したモデル（節と結び目の多面体）と、分けた先の小さな箱（三つ）
  { const s=SUB[3], g=new THREE.Group();
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.32,.38,.5,32),std(0x1b2433,{r:.35,m:.8})); base.position.y=.25; g.add(base);
    const ico=new THREE.Mesh(new THREE.IcosahedronGeometry(.36,1),new THREE.MeshBasicMaterial({color:0x8ff7e0,wireframe:true,transparent:true,opacity:.22,toneMapped:false})); ico.position.y=.95; ico.visible=false;
    { const rack=new THREE.Mesh(new THREE.BoxGeometry(.42,1.0,.44),new THREE.MeshPhysicalMaterial({color:0x1c2128,roughness:.45,metalness:.6,clearcoat:.4}));rack.position.y=1.0;g.add(rack);const fr=new THREE.LineSegments(new THREE.EdgesGeometry(rack.geometry),new THREE.LineBasicMaterial({color:0x7ff0d6,transparent:true,opacity:.35}));fr.position.copy(rack.position);g.add(fr);   /* AI は計算機の棚（光る球にしない） */
      for(let k=0;k<8;k++){const sl=new THREE.Mesh(new THREE.BoxGeometry(.34,.014,.005),new THREE.MeshBasicMaterial({color:k%2?0x5fe6cc:0x8fd3ff,toneMapped:false,transparent:true,opacity:.7}));sl.position.set(0,.6+k*.11,.224);g.add(sl);} }
    { const body=new THREE.Mesh(new THREE.BoxGeometry(.3,.2,.22),new THREE.MeshPhysicalMaterial({color:0x2a2f36,roughness:.42,metalness:.55,clearcoat:.6,clearcoatRoughness:.3}));body.position.set(0,.62,0);g.add(body);
      const lens=new THREE.Mesh(new THREE.CylinderGeometry(.065,.07,.08,32),new THREE.MeshPhysicalMaterial({color:0x0b0f14,roughness:.08,metalness:.2,clearcoat:1}));lens.rotation.x=Math.PI/2;lens.position.set(0,.62,.14);g.add(lens);
      const glass=new THREE.Mesh(new THREE.CircleGeometry(.05,32),new THREE.MeshBasicMaterial({color:0x5fe6cc,transparent:true,opacity:.55,toneMapped:false}));glass.position.set(0,.62,.181);g.add(glass); }
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,2),std(0x0d3a36,{e:0x5fe6cc,ei:1.4,r:.3,m:.2})); core.position.y=.95; core.visible=false;
    const nodes=new THREE.InstancedMesh(new THREE.SphereGeometry(.03,6,4),new THREE.MeshBasicMaterial({color:0xd8fff6,toneMapped:false}),12); const v=ico.geometry.attributes.position, M=new THREE.Matrix4();
    for(let i=0;i<12;i++){M.makeTranslation(v.getX(i*5%v.count),v.getY(i*5%v.count)+.95,v.getZ(i*5%v.count));nodes.setMatrixAt(i,M);} nodes.visible=false;
    for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.13),std([0x8ff7e0,0x8fd3ff,0xe8c48a][i],{r:.4,m:.3,e:[0x1e5c50,0x1e4060,0x5a4020][i],ei:.8}));b.position.set((i-1)*.3,1.42,0);g.add(b);}
    at(s,g); anim.push(t=>{ico.rotation.y=t*.35;ico.rotation.x=Math.sin(t*.3)*.3;nodes.rotation.copy(ico.rotation);nodes.position.y=0;core.rotation.y=-t*.5;}); }
  // センサー：細い柱の上に箱と受けの皿。足もとに、振動を受ける輪が広がる
  { const s=SUB[4], g=new THREE.Group();
    // IoT センサー：土の湿り（二本の差し棒）・明るさ（白い受光窓）・音（小さなマイク）。ネットにつながる小さな計測器を、気象計のまわりに
    { const box=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshPhysicalMaterial({color:c,roughness:.5,metalness:.15,clearcoat:.3}));
      const soil=new THREE.Group();const sb=box(.12,.07,.05,0x2c3138);sb.position.y=.12;soil.add(sb);for(const dx of [-.025,.025]){const pr=new THREE.Mesh(new THREE.CylinderGeometry(.006,.004,.18,6),new THREE.MeshStandardMaterial({color:0xc9ced6,metalness:.9,roughness:.3}));pr.position.set(dx,.0,0);soil.add(pr);}soil.position.set(.42,0,.18);g.add(soil);
      const lux=box(.08,.05,.08,0xe6e9ee);lux.position.set(-.38,.06,.22);g.add(lux);const win=new THREE.Mesh(new THREE.CircleGeometry(.022,24),new THREE.MeshBasicMaterial({color:0xfdf6d8}));win.rotation.x=-Math.PI/2;win.position.set(-.38,.086,.22);g.add(win);
      const mic=box(.06,.1,.06,0x3a3f47);mic.position.set(.1,.05,-.4);g.add(mic);const grill=new THREE.Mesh(new THREE.SphereGeometry(.025,12,8),new THREE.MeshStandardMaterial({color:0x8a919c,metalness:.6,roughness:.5}));grill.position.set(.1,.12,-.4);g.add(grill);
      [soil,lux,mic].forEach(o=>{const led=new THREE.Mesh(new THREE.SphereGeometry(.008,6,4),new THREE.MeshBasicMaterial({color:0xb8f0a8,toneMapped:false}));led.position.copy(o.position).add(new THREE.Vector3(0,.16,0));if(o!==soil)led.position.y=.12;g.add(led);}); }
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,1.05,12),std(0x9aa3ae,{r:.3,m:.9})); pole.position.y=.52; g.add(pole);
    const head=new THREE.Mesh(new THREE.BoxGeometry(.26,.2,.18),std(0xd9dee6,{r:.5,m:.2})); head.position.y=1.12; g.add(head);
    const led=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),new THREE.MeshBasicMaterial({color:0xb8f0a8,toneMapped:false})); led.position.set(0,1.14,.095); g.add(led);
    const dish=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.015,24),std(0xc8ced8,{r:.4,m:.7})); dish.position.y=1.28; g.add(dish);
    const probe=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.32,8),std(0x7c8692,{r:.3,m:.9})); probe.position.y=-.1; g.add(probe);   // 地中へ差す棒（温度・振動）
    const ringM=new THREE.MeshBasicMaterial({color:0xb8f0a8,transparent:true,opacity:.6,toneMapped:false,depthWrite:false}), rings=[0,1,2].map(()=>{const o=new THREE.Mesh(new THREE.RingGeometry(.97,1,64),ringM.clone());o.rotation.x=-Math.PI/2;o.position.y=.02;g.add(o);return o;});
    at(s,g); anim.push(t=>{rings.forEach((o,i)=>{const u=(t*.4+i/3)%1;o.scale.setScalar(.15+u*.9);o.material.opacity=.55*(1-u);});led.material.color.setScalar(.6+.4*Math.sin(t*3)**2).multiply(new THREE.Color(0xb8f0a8));}); }
  // GIS：位置の印と、地形の層を三枚重ねた小さな板
  { const s=SUB[5], g=new THREE.Group(), cols=[0xe8c48a,0x8fd3ff,0xc9b8ff];
    { const metal=new THREE.MeshPhysicalMaterial({color:0xb9c0c9,roughness:.32,metalness:.85}), dark=new THREE.MeshPhysicalMaterial({color:0x22262c,roughness:.5,metalness:.3,clearcoat:.4});
      for(let k=0;k<3;k++){const a=k/3*Math.PI*2,leg=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,1.0,8),metal);leg.position.set(Math.cos(a)*.17,.47,Math.sin(a)*.17);leg.rotation.set(Math.sin(a)*.34,0,-Math.cos(a)*.34);g.add(leg);}
      const head=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.12,12),metal);head.position.y=.98;g.add(head);
      const ant=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,.07,40),dark);ant.position.y=1.07;g.add(ant);
      const dome=new THREE.Mesh(new THREE.SphereGeometry(.13,32,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xe8ecf0,roughness:.35,clearcoat:.6}));dome.scale.y=.35;dome.position.y=1.105;g.add(dome); }
    const pin=new THREE.Mesh(new THREE.ConeGeometry(.04,.12,16),std(0xc9b8ff,{e:0x3a2c70,ei:1,r:.4,m:.2})); pin.rotation.x=Math.PI; pin.position.set(0,1.45,0); g.add(pin);
    const pinB=new THREE.Mesh(new THREE.SphereGeometry(.04,16,12),pin.material); pinB.position.set(0,1.52,0); g.add(pinB);
    at(s,g); anim.push(t=>{pin.position.y=1.45+Math.sin(t*1.4)*.03;pinB.position.y=pin.position.y+.07;}); }
  // ミツバチ（形態は creatures.js の写実の造形＝頭・胸・腹、4 枚の翅、6 本の脚）。花の上でホバリング
  // 鳥・蜂・人は、最初から同時に読みはじめる（場に出す準備だけ一つずつ）
  const PRE={bee:import('./kit/creatures.js'),
    bird:import('./kit/sight/sightModels.js').then(M=>M.loadSight('hiyo',{shadow:false,autoplay:false})),
    human:Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js')]).then(([{GLTFLoader},{MeshoptDecoder}])=>{const L=new GLTFLoader();L.setMeshoptDecoder(MeshoptDecoder);return L.loadAsync('img/hero/3d/human.glb');})};
  Object.values(PRE).forEach(p=>p.catch(()=>{}));
  // 人の仮の姿（細い線の人形）を、本物が出るまで置く
  const ghost=(()=>{const s=SUB[2],L=[],h=1.72,P=(a,b)=>L.push(...a,...b);const hd=h-.12;
    P([0,0,0],[0,.92,0]);P([0,.92,0],[0,1.45,0]);P([0,1.45,0],[-.24,1.05,0]);P([0,1.45,0],[.24,1.05,0]);P([0,.92,0],[-.14,0,0]);P([0,.92,0],[.14,0,0]);
    for(let k=0;k<16;k++){const a=k/16*6.283,b=(k+1)/16*6.283;P([Math.cos(a)*.11,hd+Math.sin(a)*.11,0],[Math.cos(b)*.11,hd+Math.sin(b)*.11,0]);}
    const o=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(L,3)),new THREE.LineBasicMaterial({color:0xfff1dc,transparent:true,opacity:.55}));o.position.set(s.x,0,s.z);o.rotation.y=s.ry;W.add(o);return o;})();
  Q.push(async()=>{try{const {makeBee}=await PRE.bee;const s=SUB[1],b=makeBee();b.scale.setScalar(.34);const g=new THREE.Group();g.add(b);
    const fl=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.018,.6,6),std(0x5f7a3a,{r:.8,m:0}));stem.position.y=.3;fl.add(stem);
    for(let i=0;i<6;i++){const pt=new THREE.Mesh(new THREE.SphereGeometry(.07,10,6),std(0xf2efe6,{r:.7,m:0}));pt.scale.set(1,.25,.55);const a=i/6*Math.PI*2;pt.position.set(Math.cos(a)*.08,.6,Math.sin(a)*.08);pt.rotation.y=-a;fl.add(pt);}
    const ce=new THREE.Mesh(new THREE.SphereGeometry(.04,10,8),std(0xe0b030,{r:.8,m:0}));ce.position.y=.62;fl.add(ce);fl.position.set(.15,0,.12);g.add(fl);
    at(s,g);b.position.y=.95;anim.push(t=>{b.position.set(Math.sin(t*.9)*.05,.95+Math.sin(t*2.1)*.03,Math.cos(t*.7)*.04);b.userData.animate&&b.userData.animate(t,true);});dirty=1;}catch(e){console.warn('cg bee',e);}});
  // ヒヨドリ（Qualia/sight の写実のモデル）。石の上にとまる
  Q.push(async()=>{try{const m=await PRE.bird;const s=SUB[0],g=new THREE.Group();
    const st=new THREE.Mesh(new THREE.DodecahedronGeometry(.28,1),std(0x4f4b45,{r:.98,m:0}));st.scale.set(1.25,.28,.9);st.position.y=.12;g.add(st);
    m.object.scale.setScalar(mob?4.2:3.4);/* 大小の順：虫 < 鳥 < 人（模式） */m.object.position.y=.24;g.add(m.object);const pl=new THREE.PointLight(0xffe2c0,mob?9:5,3,1.6);if(mob)g.add(new THREE.PointLight(0xffffff,5,2.2,1.6).translateX(.6).translateY(1.2).translateZ(.8));g.add(new THREE.PointLight(0xcfe8ff,2.6,2.4,1.6).translateX(-.3).translateY(.9).translateZ(-.7));pl.position.set(.5,1.0,1.0);g.add(new THREE.PointLight(0x9fd8ff,1,2.2,1.6).translateX(-.6).translateY(.7).translateZ(-.4));g.add(pl);m.play(m.clips.includes('perch')?'perch':m.info.main,0);m.update&&m.update(.4);at(s,g);g.rotation.y=0;m.object.rotation.y=Math.PI/2;anim.push((t,dt)=>m.update?m.update(dt):m.mixer.update(dt));dirty=1;}catch(e){console.warn('cg bird',e);}});
  // 人（MakeHuman の CC0 から作った human.glb）
  Q.push(async()=>{try{
    const g=await PRE.human,o=g.scene;o.traverse(m=>{if(m.isMesh){m.frustumCulled=false;const mt=m.material;if(mt&&mt.metalness!=null){mt.metalness=0;mt.roughness=Math.max(.55,mt.roughness||0);}if(/hair|brow|short/i.test(m.name)&&mt){mt.alphaTest=.5;mt.side=THREE.DoubleSide;}}});
    const bb=new THREE.Box3().setFromObject(o),sz=bb.getSize(new THREE.Vector3()),k=1.72/sz.y;o.scale.setScalar(k);o.position.set(-(bb.min.x+sz.x/2)*k,-bb.min.y*k,-(bb.min.z+sz.z/2)*k);
    const p=new THREE.Group();p.add(o);const s=SUB[2];at(s,p);ghost.visible=false;box.dataset.humanMs=Math.round(performance.now()-T0);p.rotation.y=s.ry+Math.PI*.82;dirty=1;}catch(e){console.warn('cg human',e);}});
  // 依代（碧）：中心ではなく、鳥と GIS の重なりのあいだに立つ（ほかの図と同じ VRM のバイト列を使い回す）
  let mot=null,vrm=null,aoiP=null,aoiN=0;
  const lensOf=(a,b)=>LENS.find(L=>SUB[L.i].k===a&&SUB[L.j].k===b||SUB[L.i].k===b&&SUB[L.j].k===a);
  const AOI=new THREE.Vector3(-2.31,0,-1.18),   /* 碧は層の中に立たず、鳥・虫・GIS の層の境に */ YORI=(lensOf('ai','sensor')||LENS[LENS.length-1]).m.clone().setY(0);
  // 依代は主体と別の印：膜を持たず、重なりのあいだの地に細い光の輪（主体の数に数えない）
  [YORI].forEach((p,k)=>{k=1;const r=new THREE.Mesh(new THREE.RingGeometry(k?.34:.5,k?.37:.54,64),new THREE.MeshBasicMaterial({color:0xa8f2f6,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));r.material.opacity=.35;r.rotation.x=-Math.PI/2;r.position.set(p.x,.02,p.z);W.add(r);});
  // 町の依代（Qualium 大宮と同じ姿・その場で組む形）：AI とセンサーの重なりのあいだに
  Q.push(async()=>{try{const {MachiYori}=await import('./kit/machiyori.js');const g=new THREE.Group();const my=new MachiYori({scene:g,camera:C,dom:document.createElement('i')});
    my.add('shizuku',{x:YORI.x,z:YORI.z,yaw:.4,scale:1.45});
    { const tuft=new THREE.Group();for(let k=0;k<3;k++){const lf=new THREE.Mesh(new THREE.ConeGeometry(.03,.14,8),new THREE.MeshStandardMaterial({color:0x5cc8e0,roughness:.6,emissive:0x1d4f5c,emissiveIntensity:.6}));lf.position.set((k-1)*.03,0,0);lf.rotation.z=(k-1)*.45;tuft.add(lf);}tuft.position.set(YORI.x,.78,YORI.z);g.add(tuft); }   /* 依代の目印＝碧の色の葉の房 */
    W.add(g);blob(YORI,.3);anim.push((t,dt)=>my.update(dt));dirty=1;}catch(e){console.warn('cg yori',e);}});

  Q.unshift(async()=>{try{const [{GLTFLoader},{MeshoptDecoder},V]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js'),import('@pixiv/three-vrm')]);
    const L=new GLTFLoader();L.setMeshoptDecoder(MeshoptDecoder);L.register(p=>new V.VRMLoaderPlugin(p));
    const buf=await(window.__aoiBuf||(window.__aoiBuf=fetch('img/hero/aoi.vrm').then(r=>r.arrayBuffer())));const g=await L.parseAsync(buf.slice(0),'');
    vrm=g.userData.vrm;await new Promise(r=>setTimeout(r,0)); V.VRMUtils.removeUnnecessaryVertices(g.scene); await new Promise(r=>setTimeout(r,0)); V.VRMUtils.rotateVRM0(vrm);vrm.scene.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
    const p=new THREE.Group();p.add(vrm.scene);p.visible=false;aoiP=p;W.add(p);vrm.humanoid.resetNormalizedPose();vrm.update(0);
    const bb=new THREE.Box3().setFromObject(vrm.scene);p.scale.setScalar(1.05/(bb.max.y-bb.min.y));p.position.set(AOI.x,0,AOI.z);blob(AOI,.5);
    const {AoiMotion}=await import('./aoi_motion.js?v=20261026-v61');mot=new AoiMotion(vrm,{root:p,reducedMotion:reduce,wind:.2,faceViewer:false,startCalm:1,posture:'upright',uprightWeight:.9});mot.faceTo(.2);dirty=1;
  }catch(e){console.warn('cg aoi',e);}});
  // ---- 札（index.html の .cg-lb）を 3D の位置へ写す
  const st=box.querySelector('.cg-st'); const LB={};st.querySelectorAll('.cg-lb').forEach(d=>LB[d.dataset.k]=d);
  const anchors=SUB.map(s=>({k:s.k,p:s.p.clone().setY(s.h+.2)})).concat([{k:'aoi',p:AOI.clone().setY(1.85)},{k:'yori',p:YORI.clone().setY(.95)}]);
  const v=new THREE.Vector3(), vc=new THREE.Vector3();
  const SZC=new Map(); const SZ=d=>{let z=SZC.get(d);if(!z){z=[d.offsetWidth,d.offsetHeight];if(z[0])SZC.set(d,z);}return z;}; addEventListener('resize',()=>SZC.clear()); new MutationObserver(()=>SZC.clear()).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
  // 視点：ゆっくり左右にめぐる。横になぞると回せる（縦のスクロールは止めない）
  let yaw=.42, drag=null, user=0, tI0=-1; const base=SUB.map(s=>s.r);
  cv.style.touchAction='pan-y';
  cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,y0:yaw,mv:0};user=performance.now();});
  cv.addEventListener('pointerup',e=>{if(drag&&drag.mv<8){const i=pick(e);if(i>=0||sel>=0)choose(i<0?sel:i);}});
  addEventListener('pointermove',e=>{if(!drag)return;drag.mv=Math.max(drag.mv,Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y));yaw=drag.y0+(e.clientX-drag.x)*.006;user=performance.now();dirty=1;if(!raf&&vis)raf=requestAnimationFrame(loop);},{passive:true});
  addEventListener('pointerup',()=>{drag=null;});addEventListener('pointercancel',()=>{drag=null;});
  box.__cgPos=k=>{const i=SUB.findIndex(s=>s.k===k);const s=SUB[i];const q=new THREE.Vector3(s.x+rad[i]*.35,s.ly,s.z+rad[i]*.35).applyMatrix4(W.matrixWorld).project(C);const r=cv.getBoundingClientRect();return [r.left+(q.x*.5+.5)*r.width,r.top+(-q.y*.5+.5)*r.height,sel];};
  let wpx=0,hpx=0;
  function size(){wpx=box.querySelector('.cg-st').clientWidth;hpx=box.querySelector('.cg-st').clientHeight;R.setSize(wpx,hpx,false);C.aspect=wpx/hpx;const tall=C.aspect<1;C.fov=tall?44:30;C.position.set(tall?-.5:0,tall?8.6:7.4,tall?6.6:12.2);C.lookAt(tall?-.5:0,tall?.6:.9,tall?-.3:.1);C.updateProjectionMatrix();dirty=1;}
  size(); addEventListener('resize',size);
  new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis&&!raf)raf=requestAnimationFrame(loop);}).observe(box);
  function frame(t,dt){
    if(!reduce){ if(!drag&&performance.now()-user>2500){auto+=dt*.07;} }
    W.rotation.y=yaw+Math.sin(auto)*.35;
    if(tI0<0)tI0=t; const tI=reduce?99:t-tI0;
    for(let i=0;i<NS;i++){const g=.32+.68*smoothstep(0,1,(tI-.1-.3*i)/1.4);base[i]+=(radT[i]-base[i])*Math.min(1,dt*2.4);rad[i]=base[i]*(g*(2-g));
      const nb=sel>=0&&i!==sel&&PAIRS.some(P=>((P.i===sel&&P.j===i)||(P.j===sel&&P.i===i))&&P.amt>.2), lt=sel<0?1:i===sel?1.15:nb?.75:.38;
      layers.filter(L=>L.i===i).forEach(L=>{L.m.uniforms.hot.value+=(((nb||i===sel)?1:0)-L.m.uniforms.hot.value)*Math.min(1,dt*4);L.m.uniforms.selI.value=sel;});lit[i]+=(lt-lit[i])*Math.min(1,dt*3);}
    syncRU(); layers.forEach(L=>{L.m.uniforms.t.value=t;L.m.uniforms.lit.value=lit[L.i];}); colM.uniforms.t.value=t; webM.uniforms.t.value=t; W.userData.ground.uniforms.t.value=t;
    {const sig=rad.reduce((p,r)=>p+r,0)+lit.reduce((p,r)=>p+r,0)*3+smoothstep(2.6,4.2,tI)*7;if(Math.abs(sig-(frame.sig||0))>1e-4){frame.sig=sig;updOverlap(smoothstep(2.6,4.2,tI));}} flowOn=smoothstep(3.4,5.2,tI); updFlow(reduce?0:dt);
    if(!(mob&&(((frame.n||0)+1)&1)))anim.forEach(f=>f(t,mob?dt*2:dt));
    frame.n=(frame.n||0)+1; const half=mob&&(frame.n&1); frame.acc=(frame.acc||0)+dt;
    if(mot&&!half){const d2=frame.acc;mot.update(d2,C,{vrmUpdate:false});vrm.update(d2);mot.afterVrmUpdate(d2);if(!aoiP.visible&&++aoiN>3){aoiP.visible=true;box.dataset.aoiMs=Math.round(performance.now()-T0);}}
    if(!half)frame.acc=0;
    if(WQ.length)WQ.shift()();
    R.render(S,C);
    vc.set(0,1,0).applyMatrix4(W.matrixWorld).project(C); const cx=(vc.x*.5+.5)*wpx, cy=(-vc.y*.5+.5)*hpx;
    const box_=[];
    for(const a of anchors){const d=LB[a.k];if(!d)continue;v.copy(a.p).applyMatrix4(W.matrixWorld);const dz=v.clone().applyMatrix4(C.matrixWorldInverse).z;v.project(C);
      let x=(v.x*.5+.5)*wpx,y=(-v.y*.5+.5)*hpx;
      if(a.k==='aoi'||a.k==='yori'||a.k==='human'||a.k==='bee'){const dw=SZ(d)[0],dh=SZ(d)[1];box_.push({d,lx:Math.max(2,Math.min(wpx-dw-2,x-dw/2)),ly:a.k==='aoi'?y-dh:y-dh-4,dw,dh,fix:1});continue;}
      const left=x<cx, up=y<cy, dw=SZ(d)[0], dh=SZ(d)[1]; let lx=left?x-6-dw:x+6, ly=up?y-4-dh:y+4; lx=Math.max(12,Math.min(wpx-dw-12,lx)); ly=Math.max(2,Math.min(hpx-dh-2,ly)); box_.push({d,lx,ly,dw,dh,up});d.classList.toggle('l',left);
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
    for(const t of tx){if(tx.size<12)await idle();R.initTexture(t);}
    // 形（頂点の束）も一つずつ、1×1 の裏の画面へ一度描いて GPU に送っておく
    const ms=[];o.traverse(m=>{if(m.isMesh||m.isPoints||m.isLine)ms.push(m);});
    if(ms.length>12)return;   // 部品の多いもの（碧）は一つずつ温めず、すぐ場に出す（待ちを 1 秒以内に）
    for(const m of ms){await idle();let p;if(m.isSkinnedMesh){p=new THREE.SkinnedMesh(m.geometry,m.material);p.bind(m.skeleton,m.bindMatrix);}else p=new (m.isInstancedMesh?THREE.InstancedMesh:m.isPoints?THREE.Points:m.isLineSegments?THREE.LineSegments:m.isLine?THREE.Line:THREE.Mesh)(m.geometry,m.material,m.count);
      if(m.isInstancedMesh){p.instanceMatrix=m.instanceMatrix;}if(m.morphTargetInfluences){p.morphTargetInfluences=m.morphTargetInfluences;p.morphTargetDictionary=m.morphTargetDictionary;}
      p.frustumCulled=false;p.onBeforeRender=m.onBeforeRender;dirty=1;await new Promise(r=>WQ.push(()=>{S2.add(p);R.setScissorTest(true);R.setScissor(0,0,1,1);R.render(S2,C);R.setScissorTest(false);S2.remove(p);r();}));} }catch(e){console.warn('cg warm',e);}};
  
  (async()=>{ raf=requestAnimationFrame(loop); /* 最初の絵は待たずに出す */ await comp(S);
    for(const f of Q){ await idle(); const n0=W.children.length; const hold=[];
      // 足した物は、絵の具（シェーダー）を裏で作り終えてから場に出す
      const add0=W.add.bind(W); W.add=(...o)=>{hold.push(...o);return W;}; try{await f();}finally{W.add=add0;}
      for(const o of hold){const v=o.visible;o.visible=true;await comp(o);o.visible=v;W.add(o);} dirty=1; } })();
  if(reduce){const tick=()=>{if(dirty&&vis&&!raf)raf=requestAnimationFrame(loop);};setInterval(tick,400);}
}
