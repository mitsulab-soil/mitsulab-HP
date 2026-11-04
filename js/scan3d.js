// スクロールで移る場面（2026-11-05）：①参道が点と線で立ち上がる ②場所が測り、値が光の流れになる ③多くの主体が同じ場にいる
// 地図：PLATEAU さいたま市 2022（CC BY 4.0）・OpenStreetMap（ODbL）を《Qualium 大宮》が加工した線（img/hero/sando_wire）
import * as T from 'three';
export async function start(sec){
  const mob=innerWidth<760, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [meta,buf]=await Promise.all([fetch('img/hero/sando_wire.json').then(r=>r.json()),fetch('img/hero/sando_wire.bin').then(r=>r.arrayBuffer())]);
  const cv=sec.querySelector('canvas'), R=new T.WebGLRenderer({canvas:cv,antialias:false,alpha:true,powerPreference:'low-power'});
  R.setPixelRatio(Math.min(devicePixelRatio,mob?1.25:1.5));
  const S=new T.Scene(), C=new T.PerspectiveCamera(42,1,.1,100);
  const ints=new Int16Array(buf), o=meta.center[Math.floor(meta.center.length/2)], sc=.02, q=meta.q, P=[];
  const sub=mob?2:4, skip=mob?4:2;
  for(const k of ['road','buildings','structures']){const [off,cnt]=meta.groups[k];for(let i=0;i+1<cnt;i+=2*skip){const n=(off+i)*3,m=n+3,x=ints[n]*q-o[0],z=ints[n+2]*q-o[2];if(Math.abs(x)>240||Math.abs(z)>190)continue;const y=ints[n+1]*q-o[1],x2=ints[m]*q-o[0],y2=ints[m+1]*q-o[1],z2=ints[m+2]*q-o[2];for(let j=0;j<sub;j++){const u=j/sub;P.push((x+(x2-x)*u)*sc,(y+(y2-y)*u)*sc,(z+(z2-z)*u)*sc);}}}
  for(const [x,y,z] of meta.trees){const X=x-o[0],Z=z-o[2];if(Math.abs(X)>240||Math.abs(Z)>190)continue;for(let j=0;j<(mob?6:12);j++){const a=Math.random()*6.28,r=Math.random()*.09;P.push(X*sc+Math.cos(a)*r,(y-o[1])*sc+.12+Math.random()*.12,Z*sc+Math.sin(a)*r);}}
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3));
  const U={t:{value:0},scan:{value:-6},px:{value:R.getPixelRatio()}};
  const pm=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:U,
    vertexShader:`uniform float t,scan,px;varying float a;varying float hot;void main(){vec3 p=position;float d=scan-p.z;a=step(0.,d);hot=smoothstep(.35,0.,abs(d));p.y+=hot*.06;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=px*(1.6+hot*2.5)*(8./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float a;varying float hot;void main(){vec2 c=gl_PointCoord-.5;if(dot(c,c)>.25)discard;gl_FragColor=vec4(mix(vec3(.55,.82,.9),vec3(.9,1.,1.),hot),a*.5+hot*.6);}`});
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
  // 多くの主体：歩きまわる小さな膜
  const NA=mob?28:60, ring=new T.RingGeometry(.09,.1,40), act=[];
  const cols=[0xa8f2f6,0xe8c48a,0xcfd6e6,0x8fe3c0];
  for(let i=0;i<NA;i++){const m=new T.Mesh(ring,new T.MeshBasicMaterial({color:cols[i%4],transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;const k=Math.floor(Math.random()*(P.length/3));m.position.set(P[k*3],P[k*3+1]+.03,P[k*3+2]);m.userData={ph:Math.random()*6.28,s:.6+Math.random()*.9};S.add(m);act.push(m);}
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
    const a=-.6+p*1.1, rr=mob?8.6-p*1.6:7.4-p*1.6, hh=4.4-p*2.2;
    C.position.set(Math.sin(a)*rr,hh,Math.cos(a)*rr); C.lookAt(0,.2,0);
    const fl=sm(.33,.45,p)*(1-sm(.72,.85,p)); fm.opacity=fl*.9;
    for(let i=0;i<NF;i++){const s=sens[fseed[i*2]],u=(fseed[i*2+1]+t*.25)%1;FP[i*3]=s.x+(hub.x-s.x)*u;FP[i*3+1]=s.y+(hub.y-s.y)*u+Math.sin(u*3.14)*.6;FP[i*3+2]=s.z+(hub.z-s.z)*u;}
    fg.attributes.position.needsUpdate=true;
    const ac=sm(.66,.8,p);
    act.forEach((m,i)=>{const d=m.userData;m.position.x+=Math.sin(t*.3*d.s+d.ph)*.002;m.position.z+=Math.cos(t*.27*d.s+d.ph)*.002;const k=1+.15*Math.sin(t*1.3+d.ph);m.scale.setScalar(k*(.7+ac*.6));m.material.opacity=ac*.45;});
    caps.forEach((c,i)=>{const on=i==0?p<.36:i==1?(p>=.36&&p<.7):p>=.7;c.classList.toggle('on',on);});
    R.render(S,C);
  }
  function loop(n){raf=0;if(!vis)return;frame((n-t0)/1000);if(!reduce)raf=requestAnimationFrame(loop);}
  if(reduce) addEventListener('scroll',()=>{if(vis)requestAnimationFrame(n=>frame(0));},{passive:true});
}
