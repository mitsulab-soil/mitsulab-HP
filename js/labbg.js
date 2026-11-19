// 2026-11-19 背景の 3D（点・線・格子が奥行きをもって静かに動く。光の玉・紫なし。読みやすさ優先で薄く）
import * as THREE from 'three';
export function start(){
  const sp=matchMedia('(max-width:560px)').matches, still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv=document.createElement('canvas'); cv.id='labBg'; cv.setAttribute('aria-hidden','true');
  document.body.prepend(cv);
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:false,alpha:true,powerPreference:'low-power'});
  r.setPixelRatio(1); r.setClearColor(0x000000,0);
  const sc=new THREE.Scene(); sc.fog=new THREE.Fog(0x1d2a33,8,40);
  const cam=new THREE.PerspectiveCamera(55,1,.1,80); cam.position.set(0,2.2,9);
  const C=new THREE.Color(0x9fd6de);
  // 床の格子（奥へ続く）
  const g=new THREE.GridHelper(80,sp?40:80,C,C); g.material.transparent=true; g.material.opacity=.16; g.position.y=-2; sc.add(g);
  // 点の雲（格子の上に浮かぶ測点）
  const N=sp?700:1800, P=new Float32Array(N*3);
  for(let i=0;i<N;i++){P[i*3]=(Math.random()-.5)*40;P[i*3+1]=-2+Math.random()*7;P[i*3+2]=-Math.random()*36+6}
  // 翅の形（点が淡くほどけて翅の脈と縁をなし、また格子の点に戻る。模式）
  const P0=P.slice(), T=new Float32Array(N*3), K=Math.floor(N*.42);
  for(let i=0;i<N;i++){ if(i>=K){T[i*3]=P0[i*3];T[i*3+1]=P0[i*3+1];T[i*3+2]=P0[i*3+2];continue}
    const side=i%2?1:-1, fore=(i%5)<3, u=Math.random(), vein=Math.random()<.55;
    const a0=fore?0.15:-1.15, a1=fore?1.25:-0.15, th=a0+(a1-a0)*u;
    const R=fore?3.4:2.4, rr=vein?R*Math.sqrt(Math.random()):R*(.94+Math.random()*.06);
    const r=rr*(fore?(.75+.25*Math.sin((th-a0)/(a1-a0)*Math.PI)):(.8+.2*Math.sin((th-a0)/(a1-a0)*Math.PI)));
    T[i*3]=side*Math.cos(th)*r*.7; T[i*3+1]=1.4+Math.sin(th)*r*.55; T[i*3+2]=-6+Math.random()*.4 }
  const T0=T.slice();
  const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(P,3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:C,size:sp?.05:.04,transparent:true,opacity:.55,depthWrite:false}));
  sc.add(pts);
  // 近い点どうしを結ぶ細い線（ネットワーク）
  const L=[]; const M=sp?140:360;
  for(let k=0;k<M;k++){const a=(Math.random()*N)|0;let best=-1,bd=9;for(let t=0;t<24;t++){const b=(Math.random()*N)|0;if(b===a)continue;const dx=P[a*3]-P[b*3],dy=P[a*3+1]-P[b*3+1],dz=P[a*3+2]-P[b*3+2];const d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;best=b}}if(best>=0)L.push(P[a*3],P[a*3+1],P[a*3+2],P[best*3],P[best*3+1],P[best*3+2])}
  const lg=new THREE.BufferGeometry(); lg.setAttribute('position',new THREE.Float32BufferAttribute(L,3));
  const lines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:C,transparent:true,opacity:.18,depthWrite:false})); sc.add(lines);
  // 複層の世界：それぞれの受けとり方の形を用意し、時間とスクロールで切りかえる（模式）
  const LN=(arr,op)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const o=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:C,transparent:true,opacity:0,depthWrite:false}));o.userData.op=op;sc.add(o);return o};
  const W=[];
  { const a=[]; for(let z=0;z<24;z++){const y=-1.9+Math.sin(z*.7)*.15; for(let x=-20;x<20;x+=1.2){const zz=-z*1.5+4;a.push(x,y+Math.sin(x*.4+z)*.35,zz,x+1.2,y+Math.sin((x+1.2)*.4+z)*.35,zz)}} W.push(LN(a,.22)); } // PHYSICAL：等高線
  { const a=[]; for(let i=0;i<(sp?120:260);i++){const x=(Math.random()-.5)*30,y=-1.5+Math.random()*6,z=-Math.random()*30+4,l=.4+Math.random()*1.6,t=Math.random()*6.28;a.push(x,y,z,x+Math.cos(t)*l,y+Math.sin(t)*l*.5,z)} W.push(LN(a,.2)); } // ART：筆の線
  { const a=[]; for(let r=1;r<9;r++){for(let k=0;k<48;k++){const t0=k/48*6.283,t1=(k+1)/48*6.283;a.push(Math.cos(t0)*r*1.4,1+Math.sin(t0)*r*.5,-10,Math.cos(t1)*r*1.4,1+Math.sin(t1)*r*.5,-10)}} W.push(LN(a,.16)); } // CULTURE：同心の輪（座・館）
  { const a=[]; const Q=[]; for(let i=0;i<(sp?40:80);i++)Q.push([(Math.random()-.5)*26,-1+Math.random()*6,-Math.random()*24]); for(let i=0;i<Q.length;i++)for(let j=i+1;j<Q.length;j++){const d=Math.hypot(Q[i][0]-Q[j][0],Q[i][1]-Q[j][1],Q[i][2]-Q[j][2]);if(d<4.2)a.push(...Q[i],...Q[j])} W.push(LN(a,.2)); } // RESEARCH：関係の網
  const NAMES=['TECHNOLOGY — DIGITAL','FIELD — PHYSICAL','ART','CULTURE','RESEARCH'];
  const tag=document.createElement('p'); tag.id='labBgTag'; tag.setAttribute('aria-hidden','true'); document.body.appendChild(tag);
  let cur=-1;
  function world(s){ const u=s/14+scrollY/(innerHeight*1.4); const idx=Math.floor(u)%5, nx=(idx+1)%5; let f=u-Math.floor(u); f=f<.6?0:(f-.6)/.4; f=f*f*(3-2*f);
    const lab=f<.5?idx:nx; if(lab!==cur){cur=lab;tag.textContent='LAYER 0'+(lab+1)+' — '+NAMES[lab]}
    const wgt=i=>(i===idx?1-f:0)+(i===nx?f:0);
    g.material.opacity=.05+.11*wgt(0); pts.material.opacity=.32+.23*wgt(0);
    W.forEach((o,i)=>{o.material.opacity=o.userData.op*wgt(i+1);o.visible=o.material.opacity>.002}) }
  const size=()=>{const w=innerWidth,h=innerHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}; size(); addEventListener('resize',size);
  let t0=performance.now(), on=true, last=0;
  document.addEventListener('visibilitychange',()=>{on=!document.hidden; if(on) requestAnimationFrame(loop)});
  function frame(t){const s=(t-t0)/1000; const y=scrollY/innerHeight;
    cam.position.x=Math.sin(s*.03)*1.2; cam.position.z=9-((y*1.4)%12); cam.lookAt(0,0,cam.position.z-9);
    const ph=(s%34)/34, k=Math.max(0,Math.sin(ph*Math.PI*2-Math.PI/2)*.5+.5); const e=k*k*(3-2*k)*.85;
    const bx=Math.sin(s*.045)*7, by=Math.sin(s*.11)*.6, fl=.75+.25*Math.abs(Math.sin(s*1.6));
    for(let i=0;i<K;i++){const j=i*3;T[j]=T0[j]*fl+bx;T[j+1]=T0[j+1]+by;T[j+2]=T0[j+2]}
    for(let i=0;i<K*3;i++){P[i]=P0[i]+(T[i]-P0[i])*e} pg.attributes.position.needsUpdate=true;
    lines.material.opacity=.18*(1-e*.8);
    world(s); pts.rotation.y=Math.sin(s*.02)*.06; lines.rotation.y=pts.rotation.y; r.render(sc,cam)}
  function loop(t){ if(!on) return; if(t-last>(sp?50:33)){last=t;frame(t)} requestAnimationFrame(loop)}
  if(still) frame(t0); else requestAnimationFrame(loop);
  addEventListener('scroll',()=>{ if(still) frame(performance.now()) },{passive:true});
}
