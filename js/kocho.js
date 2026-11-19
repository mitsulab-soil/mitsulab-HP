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
  const g=new THREE.GridHelper(80,sp?40:80,C,C); g.material.transparent=true; g.material.opacity=.16; g.position.y=-2; g.visible=false; sc.add(g);
  // 点の雲（格子の上に浮かぶ測点）
  const N=sp?380:1800, P=new Float32Array(N*3);
  for(let i=0;i<N;i++){P[i*3]=(Math.random()-.5)*40;P[i*3+1]=-2+Math.random()*7;P[i*3+2]=-Math.random()*36+6}
  // 翅の形（点が淡くほどけて翅の脈と縁をなし、また格子の点に戻る。模式）
  const P0=P.slice(), T=new Float32Array(N*3), K=sp?0:Math.floor(N*.18);
  for(let i=0;i<N;i++){ if(i>=K){T[i*3]=P0[i*3];T[i*3+1]=P0[i*3+1];T[i*3+2]=P0[i*3+2];continue}
    const side=i%2?1:-1, fore=(i%5)<3, u=Math.random(), vein=Math.random()<.55;
    const a0=fore?0.15:-1.15, a1=fore?1.25:-0.15, th=a0+(a1-a0)*u;
    const R=fore?3.4:2.4, rr=vein?R*Math.sqrt(Math.random()):R*(.94+Math.random()*.06);
    const r=rr*(fore?(.75+.25*Math.sin((th-a0)/(a1-a0)*Math.PI)):(.8+.2*Math.sin((th-a0)/(a1-a0)*Math.PI)));
    T[i*3]=side*Math.cos(th)*r*.7; T[i*3+1]=1.4+Math.sin(th)*r*.55; T[i*3+2]=-6+Math.random()*.4 }
  const T0=T.slice();
  const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(P,3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:C,size:sp?.05:.04,transparent:true,opacity:.55,depthWrite:false}));
  pts.visible=false; sc.add(pts);
  // 近い点どうしを結ぶ細い線（ネットワーク）
  const L=[]; const M=sp?70:360;
  for(let k=0;k<M;k++){const a=(Math.random()*N)|0;let best=-1,bd=9;for(let t=0;t<24;t++){const b=(Math.random()*N)|0;if(b===a)continue;const dx=P[a*3]-P[b*3],dy=P[a*3+1]-P[b*3+1],dz=P[a*3+2]-P[b*3+2];const d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;best=b}}if(best>=0)L.push(P[a*3],P[a*3+1],P[a*3+2],P[best*3],P[best*3+1],P[best*3+2])}
  const lg=new THREE.BufferGeometry(); lg.setAttribute('position',new THREE.Float32BufferAttribute(L,3));
  const lines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:C,transparent:true,opacity:.18,depthWrite:false})); lines.visible=false; sc.add(lines);
  // 複層の世界：それぞれの受けとり方の形を用意し、時間とスクロールで切りかえる（模式）
  const LN=(arr,op)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const o=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:C,transparent:true,opacity:0,depthWrite:false}));o.userData.op=op;o.visible=false;sc.add(o);return o};
  const W=[];
  { const a=[]; for(let z=0;z<24;z++){const y=-1.9+Math.sin(z*.7)*.15; for(let x=-20;x<20;x+=1.2){const zz=-z*1.5+4;a.push(x,y+Math.sin(x*.4+z)*.35,zz,x+1.2,y+Math.sin((x+1.2)*.4+z)*.35,zz)}} W.push(LN(a,.22)); } // PHYSICAL：等高線
  { const a=[]; for(let i=0;i<(sp?120:260);i++){const x=(Math.random()-.5)*30,y=-1.5+Math.random()*6,z=-Math.random()*30+4,l=.4+Math.random()*1.6,t=Math.random()*6.28;a.push(x,y,z,x+Math.cos(t)*l,y+Math.sin(t)*l*.5,z)} W.push(LN(a,.2)); } // ART：筆の線
  { const a=[]; for(let r=1;r<9;r++){for(let k=0;k<48;k++){const t0=k/48*6.283,t1=(k+1)/48*6.283;a.push(Math.cos(t0)*r*1.4,1+Math.sin(t0)*r*.5,-10,Math.cos(t1)*r*1.4,1+Math.sin(t1)*r*.5,-10)}} W.push(LN(a,.16)); } // CULTURE：同心の輪（座・館）
  { const a=[]; const Q=[]; for(let i=0;i<(sp?40:80);i++)Q.push([(Math.random()-.5)*26,-1+Math.random()*6,-Math.random()*24]); for(let i=0;i<Q.length;i++)for(let j=i+1;j<Q.length;j++){const d=Math.hypot(Q[i][0]-Q[j][0],Q[i][1]-Q[j][1],Q[i][2]-Q[j][2]);if(d<4.2)a.push(...Q[i],...Q[j])} W.push(LN(a,.2)); } // RESEARCH：関係の網
  const NAMES=['TECHNOLOGY — DIGITAL','FIELD — PHYSICAL','ART','CULTURE','RESEARCH'];
  const tag=document.createElement('p'); tag.id='labBgTag'; tag.setAttribute('aria-hidden','true'); 
  let cur=-1;
  function world(s){ const u=s/14+scrollY/(innerHeight*1.4); const idx=Math.floor(u)%5, nx=(idx+1)%5; let f=u-Math.floor(u); f=f<.6?0:(f-.6)/.4; f=f*f*(3-2*f);
    const lab=f<.5?idx:nx; if(lab!==cur){cur=lab;tag.textContent='LAYER 0'+(lab+1)+' — '+NAMES[lab]}
    const wgt=i=>(i===idx?1-f:0)+(i===nx?f:0);
    
    W.forEach(o=>{o.visible=false}) }
  // 翅の脈（アゲハ〔Papilio xuthus〕の翅の形と脈をなぞった模式。右の翅を描き、左へ写す）
  const FW=[[0,0],[.08,.22],[.18,.44],[.32,.66],[.50,.86],[.72,1.02],[.94,1.10],[1.10,1.07],[1.19,.96],[1.21,.82],[1.16,.66],[1.06,.50],[.92,.36],[.74,.22],[.52,.11],[.28,.03]];
  const HW=[[0,0],[.34,-.04],[.68,-.16],[.90,-.36],[.92,-.58],[.80,-.74],[.75,-.80],[.73,-1.46],[.67,-1.46],[.65,-.82],[.48,-.76],[.30,-.62],[.14,-.36]];
  const wa=[]; const seg=(P,close)=>{for(let k=0;k<P.length-1+(close?1:0);k++){const A=P[k],B=P[(k+1)%P.length];wa.push(A[0],A[1],0,B[0],B[1],0)}};
  seg(FW,true); seg(HW,true);
  [3,5,7,8,9,10,11,12,13].forEach(k=>{const B=FW[k];wa.push(.04,.02,0,B[0]*.96,B[1]*.96,0)});
  [2,3,4,5,7,10,11].forEach(k=>{const B=HW[k];wa.push(.04,-.02,0,B[0]*.95,B[1]*.95,0)});
  // 翅を点群で（脈と縁は密に、膜は疎らに。アゲハの翅の形と脈をなぞった模式）
  const inPoly=(P,x,y)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],yi=P[i][1],xj=P[j][0],yj=P[j][1];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c}return c};
  const wp=[]; for(let k=0;k<wa.length;k+=6){const n=sp?8:22;for(let t=0;t<n;t++){const u=Math.random();wp.push(wa[k]+(wa[k+3]-wa[k])*u+(Math.random()-.5)*.006,wa[k+1]+(wa[k+4]-wa[k+1])*u+(Math.random()-.5)*.006,(Math.random()-.5)*.02)}}
  for(let t=0;t<(sp?520:2400);t++){const x=Math.random()*1.25,y=Math.random()*2.2-1.05;if(inPoly(FW,x,y)||inPoly(HW,x,y))wp.push(x,y,(Math.random()-.5)*.02)}
  wp.push(0,.18,0, 0,.05,0, 0,-.1,0, 0,-.25,0, 0,-.4,0);
  const wg=new THREE.BufferGeometry(); wg.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));
  const wmat=new THREE.PointsMaterial({color:0xfffbe8,size:sp?.055:.032,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}); wmat.fog=false;
  const wR=new THREE.Points(wg,wmat), wL=new THREE.Points(wg,wmat); wL.scale.x=-1;
  // 蝶のまわりに立ち上がる受けとり方の場（色の偏りを点の帯で。模式）
  const UN=sp?160:360, up=new Float32Array(UN*3), uc=new Float32Array(UN*3);
  const CA=new THREE.Color(0xd9f27a), CB=new THREE.Color(0x7fe3e8), CC2=new THREE.Color(0xffe9a8);
  for(let i=0;i<UN;i++){const t=Math.random()*6.283,r=1.1+Math.random()*1.5;up[i*3]=Math.cos(t)*r*1.25;up[i*3+1]=Math.sin(t)*r*.8-.1;up[i*3+2]=(Math.random()-.5)*.6;const c=[CA,CB,CC2][i%3];uc[i*3]=c.r;uc[i*3+1]=c.g;uc[i*3+2]=c.b}
  const ug=new THREE.BufferGeometry(); ug.setAttribute('position',new THREE.BufferAttribute(up,3)); ug.setAttribute('color',new THREE.BufferAttribute(uc,3));
  const umat=new THREE.PointsMaterial({size:sp?.05:.04,vertexColors:true,transparent:true,opacity:0,depthWrite:false}); umat.fog=false;
  const halo=new THREE.Points(ug,umat);
  // 写実寄りの翅の面（アゲハ Papilio xuthus の淡い黄の地に黒い帯と脈、後翅の青と橙の斑をなぞって描いた模式の模様）
  const tc=document.createElement('canvas'); tc.width=tc.height=sp?256:512; const gx=tc.getContext('2d'), Z=tc.width;
  const toC=(x,y)=>[x/1.25*Z,(1-(y+1.5)/2.65)*Z];
  const poly=(P)=>{gx.beginPath();P.forEach((q,i)=>{const [X,Y]=toC(q[0],q[1]);i?gx.lineTo(X,Y):gx.moveTo(X,Y)});gx.closePath()};
  gx.fillStyle='#000';gx.fillRect(0,0,Z,Z);
  [FW,HW].forEach(P=>{poly(P);gx.save();gx.clip();gx.fillStyle='#efe2a0';gx.fillRect(0,0,Z,Z);
    gx.strokeStyle='#15130f';gx.lineWidth=Z*.012;for(let k=0;k<P.length;k++){const [X,Y]=toC(P[k][0]*.97,P[k][1]*.97);const [x0,y0]=toC(.03,0);gx.beginPath();gx.moveTo(x0,y0);gx.lineTo(X,Y);gx.stroke()}
    gx.lineWidth=Z*.06;poly(P);gx.stroke();gx.restore()});
  // 前翅の付け根側の黒い帯と縁の黄斑
  gx.save();poly(FW);gx.clip();gx.fillStyle='rgba(20,18,14,.85)';for(let k=0;k<4;k++){const [X,Y]=toC(.05+k*.07,.12+k*.18);gx.fillRect(X,Y-Z*.02,Z*.03,Z*.05)}gx.restore();
  // 後翅の青い斑と橙の目玉（模式）
  gx.save();poly(HW);gx.clip();gx.fillStyle='rgba(20,18,14,.8)';{const [X,Y]=toC(.45,-.62);gx.fillRect(X-Z*.25,Y-Z*.04,Z*.5,Z*.08)}
  for(let k=0;k<4;k++){const [X,Y]=toC(.3+k*.13,-.6-k*.03);gx.fillStyle='#5f9fc6';gx.beginPath();gx.arc(X,Y,Z*.012,0,6.283);gx.fill()}
  {const [X,Y]=toC(.18,-.42);gx.fillStyle='#e0782e';gx.beginPath();gx.arc(X,Y,Z*.022,0,6.283);gx.fill();gx.fillStyle='#15130f';gx.beginPath();gx.arc(X,Y,Z*.009,0,6.283);gx.fill()}gx.restore();
  const wtex=new THREE.CanvasTexture(tc); wtex.colorSpace=THREE.SRGBColorSpace;
  const shp=(P)=>{const sh=new THREE.Shape();P.forEach((q,i)=>i?sh.lineTo(q[0],q[1]):sh.moveTo(q[0],q[1]));const g=new THREE.ShapeGeometry(sh);const pa=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<pa.count;i++){uv.setXY(i,pa.getX(i)/1.25,(pa.getY(i)+1.5)/2.65)}return g};
  const realMat=new THREE.MeshBasicMaterial({map:wtex,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}); realMat.fog=false;
  const mR=new THREE.Group(), mL=new THREE.Group(); [FW,HW].forEach(P=>{mR.add(new THREE.Mesh(shp(P),realMat)); mL.add(new THREE.Mesh(shp(P),realMat))}); mL.scale.x=-1;
  wR.add(mR); wL.add(mL);
  const wing=new THREE.Group(); wing.add(halo); wing.add(wR); wing.add(wL); wing.material=wmat; cam.add(wing); sc.add(cam);
  // 受けとり方の色（模式）：人 → 蜂（黄緑・青緑へ寄せ、紫は使わない）→ 鳥（彩りを強く）
  const UMW=[new THREE.Color(1,1,1),new THREE.Color(.72,1,.86),new THREE.Color(1.15,1.05,.8)];
  const size=()=>{const w=innerWidth,h=innerHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}; size(); addEventListener('resize',size);
  let t0=performance.now(), on=true, last=0, scrolling=false, stT=0;
  addEventListener('scroll',()=>{scrolling=true;clearTimeout(stT);stT=setTimeout(()=>scrolling=false,180)},{passive:true});
  document.addEventListener('visibilitychange',()=>{on=!document.hidden; if(on) requestAnimationFrame(loop)});
  function frame(t){const s=(t-t0)/1000; const y=scrollY/innerHeight;
    cam.position.x=Math.sin(s*.03)*1.2; cam.position.z=9-((y*1.4)%12); cam.lookAt(0,0,cam.position.z-9);
    const ph=(s%34)/34, k=Math.max(0,Math.sin(ph*Math.PI*2-Math.PI/2)*.5+.5); const e=k*k*(3-2*k)*.85;
    const bx=Math.sin(s*.045)*7, by=Math.sin(s*.11)*.6, fl=.75+.25*Math.abs(Math.sin(s*1.6));
    for(let i=0;i<K;i++){const j=i*3;T[j]=T0[j]*fl+bx;T[j+1]=T0[j+1]+by;T[j+2]=T0[j+2]}
    for(let i=0;i<K*3;i++){P[i]=P0[i]+(T[i]-P0[i])*e} pg.attributes.position.needsUpdate=true;
    lines.material.opacity=.18*(1-e*.8);
    { const onTop=!!document.querySelector('#top.active'), inTop=onTop&&scrollY<innerHeight*.8, D=10, hw=Math.tan(27.5*Math.PI/180)*D*cam.aspect, hh=Math.tan(27.5*Math.PI/180)*D;
      const marg=(innerWidth-1180)/2, mw=marg>110?marg/innerWidth*2*hw:0;
      let op, x, yy, sc2;
      if(inTop&&!sp){ op=.95; x=hw*.45; yy=hh*.12+by*.4; sc2=1.5; }
      else if(inTop&&sp){ const v=document.querySelector('.sd-vis'); const r=v?v.getBoundingClientRect():null;
        if(r&&r.bottom>60&&r.top<innerHeight-40){ const cy=(r.top+r.bottom)/2; op=.9; x=hw*.05; yy=hh*(1-2*cy/innerHeight); sc2=Math.min(.7,r.height/innerHeight*3.2); } else { op=0; x=0; yy=0; sc2=1; } }
      else if(mw>0){ const side=Math.sin(s*.023)>0?1:-1; op=.9; sc2=Math.min(.75,mw*.17); x=side*(hw-mw*.45); yy=Math.sin(s*.13)*hh*.45; }
      else { op=0; x=0; yy=0; sc2=1; }
      const pr=Math.min(1,scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));
      let dg=.5+.8*Math.sin(s*.22+pr*7); dg=Math.max(0,Math.min(1,dg)); realMat.opacity=op*(1-dg); wing.material.opacity=op*dg*dg; umat.opacity*=dg; wing.visible=op>.01;
      const uu=(((s/12+pr*3)%3)+3)%3, ui=Math.floor(uu), uf=uu-ui, ue=uf<.7?0:(uf-.7)/.3; const cc=UMW[ui].clone().lerp(UMW[(ui+1)%3],ue*ue*(3-2*ue)); realMat.color.copy(cc); wing.material.color.setRGB(Math.min(1,cc.r),Math.min(1,cc.g),Math.min(1,cc.b));
      const zs=.75+.55*Math.sin(pr*Math.PI*2+s*.05); sc2*=zs; umat.opacity=op*(.6+.3*Math.sin(s*.5))*(.3+.7*dg); halo.rotation.z=s*.05; halo.scale.setScalar(.9+.15*Math.sin(s*.31));
      wing.position.set(x, yy, -D);
      wing.scale.set(sc2, sc2, sc2); const fa=(Math.sin(s*5.2)*.5+.5)*.8+.12; wR.rotation.y=-fa; wL.rotation.y=fa; wing.rotation.x=-.35; wing.rotation.z=Math.sin(s*.4)*.12; }
    world(s); pts.rotation.y=Math.sin(s*.02)*.06; lines.rotation.y=pts.rotation.y; r.render(sc,cam)}
  function loop(t){ if(!on) return; if(t-last>(sp?66:33)&&!(sp&&scrolling)){last=t;frame(t)} requestAnimationFrame(loop)}
  if(still) frame(t0); else requestAnimationFrame(loop);
  addEventListener('scroll',()=>{ if(still) frame(performance.now()) },{passive:true});
}
