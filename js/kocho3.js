// © mitsulab. 背景：氷川参道の画の上を、意匠の違う蝶が 1 羽ずつ舞う。
// 意匠＝写実（ナミアゲハ）・線と点（ナミアゲハ）・セル調（モンシロチョウ）・切り紙（ナミアゲハ）。群れにしない（boid なし）・瞬間移動しない。
// 体（胸・腹・脚 6 本・触角 2 本・口吻・複眼）は mitsulab が形態にそって組み立てた造形（creatures_kochou.js。外から取りこんだ 3D はない）。
// 写実のナミアゲハの翅は、実物の標本の写真（ETH Zürich ETHZ-ENT AZ12-1260・CC BY 4.0。kocho_ageha.js に出どころ）。線と点・切り紙は同じ標本の翅の輪郭を形に使う。
import * as THREE from 'three';
import { makeButterfly } from './creatures_kochou.js';
import { upgradeAgeha } from './kocho_ageha.js';
export function start(){
  const sp=matchMedia('(max-width:560px)').matches, still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv=document.createElement('canvas'); cv.id='labBg'; cv.setAttribute('aria-hidden','true'); document.body.prepend(cv);
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:!sp,alpha:true,powerPreference:'low-power'}); r.setPixelRatio(Math.min(sp?2:1.5,devicePixelRatio));   // スマホも画素を細かく（蝶は 3 羽だけなので軽い） r.setClearColor(0,0);
  const sc=new THREE.Scene(), cam=new THREE.PerspectiveCamera(40,1,.1,100); cam.position.set(0,0,10); sc.add(cam);
  sc.add(new THREE.HemisphereLight(0xfff6e0,0x1a2a20,1.2)); const dl=new THREE.DirectionalLight(0xfff2d8,2.2); dl.position.set(3,6,5); sc.add(dl); const rim=new THREE.DirectionalLight(0xbfe8f0,.9); rim.position.set(-4,2,-3); sc.add(rim);
  const isFur=o=>!!(o.geometry&&o.geometry.attributes&&o.geometry.attributes.aShell);
  const isWing=o=>!!(o.parent&&o.parent.rotation.order==='ZXY');
  // 意匠ごとの材質の置きかえ
  function posterize(tex,lv){ try{ const im=tex.image; const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); const d=x.getImageData(0,0,c.width,c.height), a=d.data, st=255/(lv-1); for(let i=0;i<a.length;i+=4){a[i]=Math.round(a[i]/st)*st;a[i+1]=Math.round(a[i+1]/st)*st;a[i+2]=Math.round(a[i+2]/st)*st} x.putImageData(d,0,0); const t=new THREE.CanvasTexture(c); t.colorSpace=tex.colorSpace; t.wrapS=tex.wrapS; t.wrapT=tex.wrapT; t.repeat.copy(tex.repeat); t.offset.copy(tex.offset); t.flipY=tex.flipY; return t; }catch(e){ return tex; } }
  const STYLE={
    photo(m){ m.traverse(o=>{ if(o.isMesh){ if(!isWing(o)) o.material=o.material.clone(); o.material.transparent=true; } }); },
    digital(m){ const add=[]; m.traverse(o=>{ if(!o.isMesh) return; if(isFur(o)){ o.visible=false; return; }
        o.material=new THREE.MeshBasicMaterial({color:0x9fecf4,wireframe:true,transparent:true,opacity:sp?.45:.6,side:THREE.DoubleSide,depthWrite:false});
        const p=new THREE.Points(o.geometry,new THREE.PointsMaterial({color:0xeaffff,size:sp?.035:.03,transparent:true,depthWrite:false})); add.push([o,p]); });
      add.forEach(([o,p])=>o.add(p)); },
    cel(m){ const add=[]; m.traverse(o=>{ if(!o.isMesh) return; if(isFur(o)){ o.visible=false; return; }
        const s=o.material, wing=isWing(o);
        o.material=new THREE.MeshBasicMaterial({color:s.vertexColors?0xffffff:s.color.clone().multiplyScalar(1.5),map:s.map?posterize(s.map,4):null,vertexColors:s.vertexColors,alphaMap:s.alphaMap||null,alphaTest:s.alphaTest,transparent:true,side:s.side});
        if(o.geometry.attributes.position.count<4000){ const e=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,wing?1:38),new THREE.LineBasicMaterial({color:0x10202c,transparent:true})); add.push([o,e]); } });
      add.forEach(([o,e])=>o.add(e)); },
    paper(m){ m.traverse(o=>{ if(!o.isMesh) return; if(isFur(o)){ o.visible=false; return; }
        const s=o.material, wing=isWing(o);
        o.material=new THREE.MeshLambertMaterial({color:wing?0xf1ebdc:0xd9d0bb,alphaMap:s.alphaMap||null,alphaTest:s.alphaTest,transparent:true,side:s.side}); }); }
  };
  // 意匠・種・居場所（画面の割合）・大きさ・ゆらぎの速さ。1 意匠 1 羽
  const DEF=[
    {st:'photo',kind:'ageha',sv:[932,358],hs:[.36,10],s:.5,ss:.44,r:[.22,.08],w:.31,jp:'写実',en:'photoreal'},
    {st:'digital',kind:'ageha',sv:[1158,676],hs:[.14,-62],s:.38,ss:.2,r:[.25,.12],w:.23,jp:'線と点',en:'line and points'},
    {st:'cel',kind:'monshiro-f',sv:[735,578],hs:[.72,-64],s:.5,ss:.34,r:[.3,.14],w:.27,jp:'セル調',en:'cel-shaded'},
    {st:'paper',kind:'ageha',sv:[1135,272],hs:null,s:.33,r:[.2,.1],w:.19,jp:'切り紙',en:'cut paper'}
  ].filter(d=>!sp||d.hs);
  // 1 羽ずつ、こまを分けて組み立てる（組み立てで画面を止めない）
  const B=[], build=(d,i)=>{ const m=makeButterfly(d.kind); if(d.kind==='ageha') upgradeAgeha(m,{photo:d.st==='photo',lite:sp}); STYLE[d.st](m); const piv=[], mats=[]; m.traverse(o=>{ if(o.isGroup&&o.rotation.order==='ZXY')piv.push(o); if(o.material){ o.material.userData.o0=o.material.opacity; mats.push(o.material);} });
    m.scale.setScalar(sp?d.ss:d.s); sc.add(m); const b={d,m,piv,mats,body:m.children[0],p:new THREE.Vector3(),v:new THREE.Vector3(.2,0,0),ph:i*1.7,P:i*2.1,init:false,ok:d.st!=='photo'}; B.push(b);
    if(!b.ok&&m.userData.ready) m.userData.ready.then(()=>{ b.ok=true; },()=>{}); };   // 写実の蝶は、翅の写真が届いてから出す
  const sst=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
  const size=()=>{const w=innerWidth,h=innerHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}; size(); addEventListener('resize',size);
  const tag=document.createElement('p'); tag.id='labBgTag'; tag.setAttribute('aria-hidden','true'); document.body.appendChild(tag);
  const TJ='蝶の意匠（各 1 羽・3D の模式）：'+DEF.map(d=>d.jp).join('・'), TE='Butterfly designs (one each, 3D models): '+DEF.map(d=>d.en).join(' · ');
  const toW=(px,py)=>{const hh=Math.tan(20*Math.PI/180)*10, hw=hh*cam.aspect; return new THREE.Vector3((px/innerWidth*2-1)*hw,(1-py/innerHeight*2)*hh,0)};
  // PC の居場所は、道具の印の層（#arLay の SVG 1280×800・画面いっぱいに切り出し）と同じ座標で決める＝印や札のあいだの空きに置く
  const svW=(x,y)=>{const k=Math.max(innerWidth/1280,innerHeight/800); return toW((x-640)*k+innerWidth/2,(y-400)*k+innerHeight/2)};
  const upH=new THREE.Vector3(0,.5,.87), vr=new THREE.Vector3(), vu=new THREE.Vector3(), vf=new THREE.Vector3(), mx=new THREE.Matrix4();
  // スマホ：道具の印と札（画面に固定）の枠。蝶の居場所がこれに重なるときは、上下を入れかえるか左へ寄せ、それでも重なるなら出さない
  let tgR=null, tgT=-1e9; const tagRect=now=>{ if(now-tgT>400){ tgT=now; const e=document.querySelector('#arLay .ar-sp .ar.on')||document.querySelector('#arLay .ar-sp .ar'); const q0=e&&e.getBoundingClientRect(); tgR=q0&&q0.width>4?q0:null; } return tgR; };
  const hit=(x,y,rx,ry,q0)=>!!q0&&x+rx>q0.left&&x-rx<q0.right&&y+ry>q0.top&&y-ry<q0.bottom;
  let alpha=0, last=0, t0=performance.now();
  // 蝶は居場所のまわりを飛び続ける（逃げない・瞬間移動しない）。文字に重なるあいだは薄くし、数式を開いているあいだは出さない
  function aim(){ const fx=document.querySelector('.wv-more[open]'); if(fx){const q=fx.getBoundingClientRect(); if(q.bottom>0&&q.top<innerHeight) return 0;}
    const first=scrollY<innerHeight*.6&&!!document.querySelector('#top.active'); return first?1:.12; }
  const tmp=new THREE.Vector3(), q=new THREE.Quaternion(), fwd=new THREE.Vector3(0,0,1);
  function frame(now){ const s=(now-t0)/1000, dt=Math.min(.05,Math.max(.001,(now-(last||now))/1000)); last=now;
    const A=aim(); alpha+=(A-alpha)*Math.min(1,dt*(A<alpha?4:1.5));
    let vy=innerHeight*.56; if(sp){ const v=document.querySelector('.sd-vis'), rr=v&&v.getBoundingClientRect(); if(rr&&rr.height>40&&A>.5) vy=(rr.top+rr.bottom)/2; }
    const TR=sp?tagRect(now):null;
    B.forEach((b,i)=>{ let hx=0,hy=0; b.hid=false; if(sp){ const ph=b.d.st==='photo', rx=ph?112:46, ry=ph?78:40; hx=innerWidth*b.d.hs[0]; hy=vy+b.d.hs[1];
        if(hit(hx,hy,rx,ry,TR)){ if(ph){ hx=Math.max(rx*.8,TR.left-rx); } else { hy=vy-b.d.hs[1]; } if(hit(hx,hy,rx,ry,TR)) b.hid=true; } }
      const c=sp?toW(hx,hy):svW(b.d.sv[0],b.d.sv[1]), w=b.d.w, R=sp?.16:b.d.r[0], Ry=sp?.07:b.d.r[1];
      const goal=tmp.set(c.x+Math.sin(s*w+b.ph)*R,c.y+Math.sin(s*w*2.03+b.ph*1.3)*Ry,Math.sin(s*w*.74+b.ph)*.35);
      if(!b.init){ b.p.copy(goal); b.init=true; }
      b.v.lerp(goal.sub(b.p).multiplyScalar(.9),Math.min(1,dt*1.2)); b.p.addScaledVector(b.v,dt); b.m.position.copy(b.p);
      // 体は進む向きへ。背は少し手前（見る側）へ傾ける＝翅の面が見える
      if(b.v.lengthSq()>1e-6){ vf.copy(b.v).normalize(); vr.crossVectors(upH,vf); if(vr.lengthSq()<1e-4) vr.set(1,0,0); vr.normalize(); vu.crossVectors(vf,vr); mx.makeBasis(vr,vu,vf); q.setFromRotationMatrix(mx); b.m.quaternion.slerp(q,Math.min(1,dt*3)); }
      // 羽ばたき：ナミアゲハは毎秒 約 10 回、モンシロチョウは 約 12 回（スマホはこま数に合わせて少し遅く）。打ち下ろしで前縁が下がり、後翅は前翅に少し遅れる。
      // アゲハは数回はばたいては、翅を浅い V 字に上げたまま短く滑る。体は頭を少し上げ、打ち下ろしのあとに持ち上がる
      const ag=b.d.kind==='ageha', f=ag?(sp?7:10):(sp?8:12), gl=ag?sst(.62,.86,Math.sin(s*.83+b.ph*2.3)):0;
      b.P+=dt*f*6.283*(1-gl*.9); const P=b.P, a=Math.sin(P)*.5+.5, a2=Math.sin(P-.5)*.5+.5, tw=(1-gl)*.24*Math.cos(P);
      const ang=(-.44+1.9*a)*(1-gl)+gl*.34, ang2=(-.4+1.8*a2)*(1-gl)+gl*.3, lift=(1-gl)*Math.sin(P-1.2);
      if(b.piv.length>=4){ b.piv[0].rotation.set(-tw,0,-ang); b.piv[1].rotation.set(-tw*.7,0,-ang2); b.piv[2].rotation.set(-tw,0,ang); b.piv[3].rotation.set(-tw*.7,0,ang2); }
      if(b.body){ b.body.position.y=lift*.09; b.body.rotation.x=-.26-lift*.16+gl*.12; }
      const tg=!b.ok||b.hid?0:A>.5?1:(A>0&&b.d.st==='photo'&&!sp?.12:0); b.a=(b.a||0)+(tg-(b.a||0))*Math.min(1,dt*(tg<(b.a||0)?4:1.5)); b.m.visible=b.a>.02; b.mats.forEach(mt=>{ mt.opacity=(mt.userData.o0??1)*b.a; }); });
    tag.textContent=alpha>.6?(document.documentElement.lang==='en'?TE:TJ):'';
    r.render(sc,cam); }
  let on=true; document.addEventListener('visibilitychange',()=>{on=!document.hidden; if(on) requestAnimationFrame(loop)});
  function loop(t){ if(!on) return; if(t-(last||0)>(sp?30:12)||!last) frame(t); requestAnimationFrame(loop); }
  // 材質の組み立てを先に済ませてから描きはじめる（最初のこまで画面を止めない）
  const go=()=>{ if(still) frame(performance.now()); else requestAnimationFrame(loop); };
  let began=false; const once=()=>{ if(!began){ began=true; go(); } };
  (async()=>{ for(let i=0;i<DEF.length;i++){ try{ build(DEF[i],i); }catch(e){} await new Promise(f=>setTimeout(f,30)); }
    if(r.compileAsync){ r.compileAsync(sc,cam).then(once,once); setTimeout(once,1500); } else once(); })();
}
