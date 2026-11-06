// スクロールで移る場面（2026-11-05・11-06 改）：①参道が点と線で立ち上がる ②場所が測り、値が光の流れになる
// ③多くの主体が同じ場にいる＝主体ごとに受けとる層（色・高さ・広さが違う）が重なり、重なりが中心のない網になる。だれかの出したものが場所（地）を通ってほかの主体の層へ届く。碧と依代は置かない
// 地図：PLATEAU さいたま市 2022（CC BY 4.0）・OpenStreetMap（ODbL）を《Qualium 大宮》が加工した線（img/hero/sando_wire）
import * as T from 'three';
export async function start(sec){
  const mob=innerWidth<760, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [meta,buf]=await Promise.all([fetch('img/hero/sando_wire.json').then(r=>r.json()),fetch('img/hero/sando_wire.bin').then(r=>r.arrayBuffer())]);
  const cv=sec.querySelector('canvas'), R=new T.WebGLRenderer({canvas:cv,antialias:false,alpha:true,powerPreference:'low-power'});
  R.setPixelRatio(Math.min(devicePixelRatio,mob?1.25:1.5));
  const S=new T.Scene(), C=new T.PerspectiveCamera(42,1,.1,100);
  const ints=new Int16Array(buf), o=meta.center[Math.floor(meta.center.length/2)], sc=.02, q=meta.q, P=[];
  const sub=mob?2:4, skip=mob?8:4;   // 二の鳥居まで見える範囲を広げた分、点は間引いて数を増やさない
  for(const k of ['road','buildings','structures']){const [off,cnt]=meta.groups[k];for(let i=0;i+1<cnt;i+=2*skip){const n=(off+i)*3,m=n+3,x=ints[n]*q-o[0],z=ints[n+2]*q-o[2];if(Math.abs(x)>240||z>190||z<-520)continue;const y=ints[n+1]*q-o[1],x2=ints[m]*q-o[0],y2=ints[m+1]*q-o[1],z2=ints[m+2]*q-o[2];for(let j=0;j<sub;j++){const u=j/sub;P.push((x+(x2-x)*u)*sc,(y+(y2-y)*u)*sc,(z+(z2-z)*u)*sc);}}}
  for(const [x,y,z] of meta.trees){const X=x-o[0],Z=z-o[2];if(Math.abs(X)>240||Z>190||Z<-520||(Z<-190&&Math.random()<.5))continue;for(let j=0;j<(mob?6:12);j++){const a=Math.random()*6.28,r=Math.random()*.09;P.push(X*sc+Math.cos(a)*r,(y-o[1])*sc+.12+Math.random()*.12,Z*sc+Math.sin(a)*r);}}
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3));
  const SU=[...Array(12)].map(()=>new T.Vector4(0,0,-9,0)); const U={t:{value:0},scan:{value:-6},px:{value:R.getPixelRatio()},ac:{value:0},su:{value:SU},sc:{value:[...Array(12)].map(()=>new T.Color(0))}};
  const pm=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:U,
    vertexShader:`uniform float t,scan,px,ac;uniform vec4 su[12];uniform vec3 sc[12];varying float a;varying float hot;varying float hz;varying vec3 tint;varying vec3 wtint;void main(){vec3 p=position;float d=scan-p.z;a=step(0.,d);hot=smoothstep(.35,0.,abs(d))*(1.-ac*.85);p.y+=hot*.06;
      float n=0.;vec3 wc=vec3(0.);for(int i=0;i<12;i++){float c=smoothstep(.0,.12,su[i].w-length(p.xz-su[i].xy));n+=c;wc+=sc[i]*c;}tint=vec3(smoothstep(1.2,2.2,n)*ac,n*ac,0.);
      float ov=smoothstep(1.2,2.2,n)*ac;p.xz+=vec2(sin(t*2.1+p.z*37.),cos(t*1.7+p.x*41.))*.012*ov;p.y+=sin(t*2.6+p.x*23.)*.008*ov;wtint=n>.01?wc/n:vec3(0.);   // 受けとるものごとに同じ参道が別の色の世界に、重なる所で揺らぐ
      vec4 mv=modelViewMatrix*vec4(p,1.);hz=smoothstep(15.,5.,-mv.z);gl_PointSize=px*(1.6+hot*2.5+tint.x*1.4)*(8./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float ac;varying float a;varying float hot;varying float hz;varying vec3 tint;varying vec3 wtint;void main(){vec2 c=gl_PointCoord-.5;if(dot(c,c)>.25)discard;vec3 col=mix(vec3(.55,.82,.9),vec3(.9,1.,1.),hot);col=mix(col,wtint*1.1,min(1.,tint.y)*.55);col=mix(col,vec3(1.,.97,.9),tint.x*.6);
      float al=(a*.5+hot*.6)*(.35+.65*hz)*(1.-ac*.86*(1.-min(1.,tint.y)))+tint.x*.35;gl_FragColor=vec4(col,al);}`});
  S.add(new T.Points(g,pm));
  // 走査の面
  const plane=new T.Mesh(new T.PlaneGeometry(10.5,.5),new T.MeshBasicMaterial({color:0xa8f2f6,transparent:true,opacity:.035,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
  plane.rotation.x=0; S.add(plane);
  // 測る点（センサー）と、中心へ集まる光の流れ
  const NS=mob?10:18, sens=[], hub=new T.Vector3(0,.5,0);
  for(let i=0;i<NS;i++){const k=Math.floor(Math.random()*(P.length/3));sens.push(new T.Vector3(P[k*3],P[k*3+1]+.05,P[k*3+2]));}
  const NF=mob?240:600, FP=new Float32Array(NF*3), fseed=new Float32Array(NF*2);
  for(let i=0;i<NF;i++){fseed[i*2]=Math.floor(Math.random()*NS);fseed[i*2+1]=Math.random();}
  const fg=new T.BufferGeometry(); fg.setAttribute('position',new T.BufferAttribute(FP,3));
  const fm=new T.PointsMaterial({color:0xf2cf8c,size:.05,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}); S.add(new T.Points(fg,fm));
  // 多くの主体：主体ごとに受けとる層（地面と平行・色と高さと広さが違う）。重なりに光の柱、柱どうしを糸がつなぐ（中心のない網）
  // だれかのふるまいは地（場所）をつたって重なりへ行き、となりの主体の層に入る。大きさは模式
  const KINDS=[{c:0x8fc9ff,y:.62,r:.82},{c:0xf3c86e,y:.16,r:.42},{c:0xf1ece4,y:.36,r:.6},{c:0x8fe3a8,y:.5,r:.66},{c:0x7ff0d6,y:.44,r:.52},{c:0xa9ec9a,y:.24,r:.44},{c:0xc4b2ff,y:.07,r:.68}];   // 鳥・虫・人・木・AI・気象計・GIS
  let seed=7; const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);
  const NA=7, ACT=[];
  for(let tries=0;ACT.length<NA&&tries<4000;tries++){const k=Math.floor(rnd()*(P.length/3)),x=P[k*3],z=P[k*3+2];if(Math.abs(x)>1.9||Math.abs(z)>1.7)continue;if(ACT.some(a=>Math.hypot(a.x-x,a.z-z)<.72))continue;const K=KINDS[ACT.length%KINDS.length];ACT.push({x,z,g:P[k*3+1],ly:P[k*3+1]+K.y,r:K.r*(.72+rnd()*.62),c:new T.Color(K.c),rad:0});}
  const SC=ACT.map(a=>a.c); while(SC.length<12)SC.push(new T.Color(0)); SC.forEach((c,i)=>U.sc.value[i].copy(c));
  const syncSU=()=>{ACT.forEach((a,i)=>SU[i].set(a.x,a.z,a.ly,a.rad));};
  const LG=`uniform vec4 su[12];uniform vec3 sc[12];uniform float t;
    float er(int i,vec2 q){vec2 d=q-su[i].xy;float a=atan(d.y,d.x);return su[i].w*(1.+.05*sin(a*3.+t*.2+float(i)*1.3)+.03*sin(a*5.-t*.15+float(i)));}
    float cv(int i,vec2 q){float r=er(i,q);return r<.005?0.:smoothstep(0.,.14,r-length(q-su[i].xy));}`;
  const lyM=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{t:U.t,su:{value:SU},sc:{value:SC},ac:U.ac},
    vertexShader:`attribute float me;varying float vme;varying vec2 q;void main(){vme=me;vec4 wp=modelMatrix*vec4(position,1.);q=wp.xz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:LG+`uniform float ac;varying float vme;varying vec2 q;void main(){int me=int(vme+.5);float own=cv(me,q);if(own<.003)discard;
      float d=length(q-su[me].xy),e=er(me,q)-d;float rim=smoothstep(.016,0.,abs(e-.008));float iso=smoothstep(.01,0.,abs(fract(d*9.-t*.05)-.5)-.47)*smoothstep(.06,.3,e);
      float n=0.;vec3 lc=sc[me];for(int i=0;i<12;i++){if(i==me)continue;float c=cv(i,q);n+=c;lc+=sc[i]*c;}
      float ov=clamp(n,0.,1.);float film=.5+.5*cos(e*40.+t*.3);vec3 col=mix(sc[me],lc/(1.+n)*1.15+(.5+.5*cos(6.2831*(vec3(0.,.33,.67)+film*.3)))*.05,ov);float lu=dot(col,vec3(.299,.587,.114));col=mix(vec3(lu),col,.55);
      gl_FragColor=vec4(min(col,vec3(1.)),ac*(own*.05+rim*.3+iso*.06+ov*own*(.18+.08*film))*mix(1.,.72,smoothstep(.6,.95,su[me].w)));}`});
  { const pos=[],me=[];ACT.forEach((a,i)=>{const RM=a.r*1.5,n=mob?20:30;for(let u=0;u<n;u++)for(let v=0;v<n;v++){const q=[[u,v],[u+1,v],[u+1,v+1],[u,v],[u+1,v+1],[u,v+1]];for(const [x,z] of q){pos.push(a.x+(x/n*2-1)*RM,a.ly,a.z+(z/n*2-1)*RM);me.push(i);}}});
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('me',new T.Float32BufferAttribute(me,1));const o=new T.Mesh(g,lyM);o.frustumCulled=false;S.add(o); }
  // 主体のいる所：地から層まで細い一本と、層の上の小さな点
  const DC=[]; { const L=[],D=[];ACT.forEach(a=>{L.push(a.x,a.g,a.z,a.x,a.ly,a.z);D.push(a.x,a.ly,a.z);DC.push(a.c.r,a.c.g,a.c.b);});
    S.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(L,3)),new T.LineBasicMaterial({color:0xdff6ff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})));
    S.add(new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(D,3)).setAttribute('color',new T.Float32BufferAttribute(DC,3)),new T.PointsMaterial({vertexColors:true,size:.07,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}))); }
  const markL=S.children[S.children.length-2], markD=S.children[S.children.length-1];
  // 主体の名（三つだけ・小さく）：文の「多くの主体」と絵を結ぶ
  const NAMES=['鳥','虫','人','木','AI','気象計','GIS'], tags=[]; ACT.slice(0,7).forEach((a,i)=>{const c=document.createElement('canvas');c.width=128;c.height=48;const x=c.getContext('2d');x.font='28px "Shippori Mincho",serif';x.fillStyle='#f4f8fc';x.textAlign='center';x.fillText(document.documentElement.dataset.lang==='en'?['bird','insect','person','tree','AI','gauge','GIS'][i]:NAMES[i],64,34);
    const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,opacity:0,depthWrite:false,sizeAttenuation:false}));sp.scale.set(mob?.052:.075,mob?.0195:.028,1);   /* 名札は遠近で大きさを変えずにそろえる */const OF=[[-.16,0],[.16,.1],[0,.22],[-.22,.14],[.22,.04],[0,.08],[-.1,.26]][i];sp.position.set(a.x+OF[0],a.ly+.12+OF[1],a.z);S.add(sp);tags.push(sp);});
  const dotT=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d'),g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.4,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,32,32);return new T.CanvasTexture(c);})();
  markD.material.map=dotT;markD.material.size=.038;
  // 重なり（となりどうし）と網
  const PR=[];for(let i=0;i<ACT.length;i++)for(let j=i+1;j<ACT.length;j++){const A=ACT[i],B=ACT[j],d=Math.hypot(A.x-B.x,A.z-B.z);if(d<(A.r+B.r)*1.0)PR.push({i,j,d,m:new T.Vector3(),amt:0});}
  const colG=new T.CylinderGeometry(1,1,1,mob?14:22,1,true);
  const colM=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{t:U.t},
    vertexShader:`varying float vy;varying float fr;void main(){vy=uv.y;vec4 wp=modelMatrix*vec4(position,1.);fr=abs(dot(normalize(mat3(modelMatrix)*normal),normalize(cameraPosition-wp.xyz)));gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`uniform float t;uniform vec3 col;uniform float a;varying float vy;varying float fr;void main(){float s=smoothstep(0.,.3,vy)*smoothstep(1.,.65,vy);gl_FragColor=vec4(col*(.9+.2*sin(vy*8.-t*1.1)),s*pow(fr,1.5)*a*${mob?".15":".2"});}`});
  const COLS=PR.map(p=>{const m=colM.clone();m.uniforms={t:U.t,col:{value:ACT[p.i].c.clone().lerp(ACT[p.j].c,.5)},a:{value:0}};const o=new T.Mesh(colG,m);o.visible=false;S.add(o);return o;});
  const WB=[];PR.forEach((A,a)=>PR.forEach((B,b)=>{if(b<=a)return;if([A.i,A.j].some(x=>x===B.i||x===B.j))WB.push([a,b]);}));
  const WN=8, wP=new Float32Array(Math.max(1,WB.length)*WN*6), wG=new T.BufferGeometry(); wG.setAttribute('position',new T.BufferAttribute(wP,3));
  const wM=new T.LineBasicMaterial({color:0x9fb8c8,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}); const wL=new T.LineSegments(wG,wM); wL.frustumCulled=false; S.add(wL);
  // めぐり：主体の層 → 地へ降りる（ふるまい）→ 地をつたう（場所）→ 重なりを昇る → となりの層 → その主体
  const NPf=mob?36:80, fP=new Float32Array(NPf*3), fC=new Float32Array(NPf*3), fG=new T.BufferGeometry(); fG.setAttribute('position',new T.BufferAttribute(fP,3)); fG.setAttribute('color',new T.BufferAttribute(fC,3));
  const fM=new T.PointsMaterial({size:.04,map:dotT,vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}); const fPts=new T.Points(fG,fM); fPts.frustumCulled=false; S.add(fPts);
  const tv=new T.Vector3(), tc=new T.Color();
  function hopS(i){const ns=PR.filter(p=>(p.i===i||p.j===i)&&p.amt>.3);if(!ns.length)return null;const p=ns[Math.floor(Math.random()*ns.length)],k=p.i===i?p.j:p.i,a=ACT[i],b=ACT[k],ph=Math.random()*6.28;
    const W=[new T.Vector3(a.x,a.ly,a.z),new T.Vector3(a.x+Math.cos(ph)*.05,a.g+.02,a.z+Math.sin(ph)*.05),new T.Vector3(p.m.x,p.m.y*0+((a.g+b.g)/2)+.02,p.m.z),new T.Vector3(p.m.x,b.ly,p.m.z),new T.Vector3(b.x,b.ly,b.z)];
    const L=[0];for(let q=1;q<W.length;q++)L.push(L[q-1]+W[q].distanceTo(W[q-1]));return {W,L,len:L[L.length-1],from:i,to:k};}
  const FQ=[...Array(NPf)].map((_,n)=>({at:n%Math.max(1,ACT.length),pa:null,d:0,w:Math.random()*3,sp:.35+Math.random()*.25}));
  function stage3(t,ac){
    const dt=Math.min(.05,t-(stage3.t||t)); stage3.t=t;
    ACT.forEach((a,i)=>{const g=sm(.64+i*.012,.8+i*.012,prog);a.rad=a.r*g;}); syncSU();
    markL.material.opacity=ac*.35; markD.material.opacity=ac*.9; tags.forEach(s=>s.material.opacity=ac*.85);
    PR.forEach((p,k)=>{const A=ACT[p.i],B=ACT[p.j],o=A.rad+B.rad-p.d;p.amt=Math.min(1,Math.max(0,o/.25));const w=Math.max(0,Math.min(o,2*Math.min(A.rad,B.rad)))/2,u=(A.rad-w)/Math.max(1e-3,p.d);
      p.m.set(A.x+(B.x-A.x)*u,(A.ly+B.ly)/2,A.z+(B.z-A.z)*u);const c=COLS[k];c.visible=p.amt*ac>.01;if(c.visible){const y0=Math.min(A.ly,B.ly,(A.g+B.g)/2),y1=Math.max(A.ly,B.ly)+.03;c.position.set(p.m.x,(y0+y1)/2,p.m.z);c.scale.set(Math.max(.03,w*.6),y1-y0,Math.max(.03,w*.6));c.material.uniforms.a.value=p.amt*ac;}});
    WB.forEach(([a,b],e)=>{const A=PR[a],B=PR[b];for(let q=0;q<WN;q++)for(let r=0;r<2;r++){const u=(q+r)/WN;tv.copy(A.m).lerp(B.m,u);tv.y+=Math.sin(u*Math.PI)*.08;wP.set([tv.x,tv.y,tv.z],(e*WN*2+q*2+r)*3);}});
    wG.attributes.position.needsUpdate=true; wM.opacity=ac*(.26+.08*Math.sin(t*.8))*sm(.72,.86,prog);
    const fo=sm(.74,.88,prog); fM.opacity=fo*.95;
    if(fo>0&&!reduce){for(let n=0;n<NPf;n++){const F=FQ[n];if(!F.pa){F.w-=dt;if(F.w<=0){F.pa=hopS(F.at);F.d=0;if(!F.pa)F.w=1;}}
      if(F.pa){F.d+=dt*F.sp;const L=F.pa.L;let q=1;while(q<L.length-1&&L[q]<F.d)q++;tv.copy(F.pa.W[q-1]).lerp(F.pa.W[q],Math.min(1,(F.d-L[q-1])/Math.max(1e-4,L[q]-L[q-1])));fP.set([tv.x,tv.y,tv.z],n*3);
        tc.copy(ACT[F.pa.from].c).lerp(ACT[F.pa.to].c,sm(.5,1,F.d/F.pa.len));fC.set([tc.r,tc.g,tc.b],n*3);if(F.d>=F.pa.len){F.at=F.pa.to;F.pa=null;F.w=.2+Math.random();}}else fP.set([0,-50,0],n*3);}
      fG.attributes.position.needsUpdate=fG.attributes.color.needsUpdate=true;}
  }
  // 鳥居（位置は《Qualium 大宮》の地図の印＝PLATEAU・OSM から。高さはおよそ 12 m の模式）：朱の線だけで
  { const L=[];for(const mk of (meta.marks||[])){if(!/鳥居/.test(mk.name))continue;const X=(mk.p[0]-o[0])*sc,Y=(mk.p[1]-o[1])*sc,Z=(mk.p[2]-o[2])*sc;if(Math.abs(X)>4.8||Z>3.8||Z<-10.6)continue;
      const h=.24,w=.13;L.push(X-w*.8,Y,Z,X-w*.7,Y+h,Z, X+w*.8,Y,Z,X+w*.7,Y+h,Z, X-w*1.25,Y+h+.02,Z,X+w*1.25,Y+h+.02,Z, X-w,Y+h*.8,Z,X+w,Y+h*.8,Z);}
    if(L.length){const tm=new T.LineBasicMaterial({color:0xd6553a,transparent:true,opacity:.9,depthWrite:false});const to=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(L,3)),tm);S.add(to);} }
  const caps=[...sec.querySelectorAll('.sc-cap')];
  function size(){const w=cv.clientWidth,h=cv.clientHeight;R.setSize(w,h,false);C.aspect=w/h;C.updateProjectionMatrix();}
  size(); addEventListener('resize',size);
  let vis=false, raf=0, prog=0, t0=performance.now();
  new IntersectionObserver(e=>{vis=e[0].isIntersecting;if(vis&&!raf)raf=requestAnimationFrame(loop);}).observe(sec);
  function progress(){const r=sec.getBoundingClientRect();return Math.min(1,Math.max(0,-r.top/Math.max(1,r.height-innerHeight)));}
  const sm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
  function frame(t){
    prog+= (progress()-prog)*(reduce?1:.12); const p=prog;
    U.t.value=t; U.scan.value=-4+sm(0,.33,p)*8.5; plane.position.set(0,.4,U.scan.value); plane.material.opacity=.035*(1-sm(.3,.38,p));
    // カメラ：俯瞰から寄って、最後は低く
    const a=-.6+p*(mob?.84:1.1), rr=mob?8.4-p*1.4:7.4-p*1.6, hh=(mob?3.9:4.4)-p*(mob?2.5:2.2);
    C.position.set(Math.sin(a)*rr,hh,Math.cos(a)*rr); C.lookAt(0,mob?.05:.2,mob?.2:0);
    const fl=sm(.33,.45,p)*(1-sm(.72,.85,p)); fm.opacity=fl*.9;
    for(let i=0;i<NF;i++){const s=sens[fseed[i*2]],u=(fseed[i*2+1]+t*.25)%1;FP[i*3]=s.x+(hub.x-s.x)*u;FP[i*3+1]=s.y+(hub.y-s.y)*u+Math.sin(u*3.14)*.6;FP[i*3+2]=s.z+(hub.z-s.z)*u;}
    fg.attributes.position.needsUpdate=true;
    const ac=sm(.64,.8,p); U.ac.value=ac; stage3(t,ac);
    caps.forEach((c,i)=>{const on=i==0?p<.36:i==1?(p>=.36&&p<.7):p>=.7;c.classList.toggle('on',on);});
    R.render(S,C);
  }
  function loop(n){raf=0;if(!vis)return;frame((n-t0)/1000);if(!reduce)raf=requestAnimationFrame(loop);}
  if(reduce) addEventListener('scroll',()=>{if(vis)requestAnimationFrame(n=>frame(0));},{passive:true});
}
