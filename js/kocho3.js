// © mitsulab. 2026-11-20 背景：氷川参道の画の上を、意匠の違う蝶が 1 羽ずつ舞う（胡蝶の夢）。
// 本人「フォトリアルな蝶と、デジタルな蝶、アニメ風の蝶など色々な種類な蝶を表示してください。１デザインで１羽にします。」
// 意匠＝写実（ナミアゲハ）・線と点（ナミアゲハ）・セル調（モンシロチョウ）・切り紙（ナミアゲハ）。群れにしない（boid なし）・瞬間移動しない。
// 蝶の形は mitsulab が図鑑の形態にそって組み立てた造形（creatures_kochou.js。翅 4 枚・脚 6 本・触角 2 本。外から取りこんだ 3D はない）。
import * as THREE from 'three';
import { makeButterfly } from './creatures_kochou.js';
export function start(){
  const sp=matchMedia('(max-width:560px)').matches, still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv=document.createElement('canvas'); cv.id='labBg'; cv.setAttribute('aria-hidden','true'); document.body.prepend(cv);
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:!sp,alpha:true,powerPreference:'low-power'}); r.setPixelRatio(sp?1:Math.min(1.5,devicePixelRatio)); r.setClearColor(0,0);
  const sc=new THREE.Scene(), cam=new THREE.PerspectiveCamera(40,1,.1,100); cam.position.set(0,0,10); sc.add(cam);
  sc.add(new THREE.HemisphereLight(0xfff6e0,0x1a2a20,1.2)); const dl=new THREE.DirectionalLight(0xfff2d8,2.2); dl.position.set(3,6,5); sc.add(dl); const rim=new THREE.DirectionalLight(0xbfe8f0,.9); rim.position.set(-4,2,-3); sc.add(rim);
  const isFur=o=>!!(o.geometry&&o.geometry.attributes&&o.geometry.attributes.aShell);
  const isWing=o=>!!(o.parent&&o.parent.rotation.order==='ZXY');
  // 意匠ごとの材質の置きかえ
  function posterize(tex,lv){ try{ const im=tex.image; const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); const d=x.getImageData(0,0,c.width,c.height), a=d.data, st=255/(lv-1); for(let i=0;i<a.length;i+=4){a[i]=Math.round(a[i]/st)*st;a[i+1]=Math.round(a[i+1]/st)*st;a[i+2]=Math.round(a[i+2]/st)*st} x.putImageData(d,0,0); const t=new THREE.CanvasTexture(c); t.colorSpace=tex.colorSpace; t.wrapS=tex.wrapS; t.wrapT=tex.wrapT; t.repeat.copy(tex.repeat); t.offset.copy(tex.offset); t.flipY=tex.flipY; return t; }catch(e){ return tex; } }
  const STYLE={
    photo(m){ m.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); o.material.transparent=true; } }); },
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
    {st:'photo',kind:'ageha',home:[.74,.44],hs:[.50,0],s:.62,w:.31,jp:'写実',en:'photoreal'},
    {st:'digital',kind:'ageha',home:[.88,.24],hs:[.24,-14],s:.44,w:.23,jp:'線と点',en:'line and points'},
    {st:'cel',kind:'monshiro-f',home:[.62,.70],hs:[.77,16],s:.5,w:.27,jp:'セル調',en:'cel-shaded'},
    {st:'paper',kind:'ageha',home:[.90,.66],hs:null,s:.46,w:.19,jp:'切り紙',en:'cut paper'}
  ].filter(d=>!sp||d.hs);
  const B=DEF.map((d,i)=>{ const m=makeButterfly(d.kind); STYLE[d.st](m); const piv=[], mats=[]; m.traverse(o=>{ if(o.isGroup&&o.rotation.order==='ZXY')piv.push(o); if(o.material){ o.material.userData.o0=o.material.opacity; mats.push(o.material);} });
    m.scale.setScalar(sp?d.s*.72:d.s); sc.add(m); return {d,m,piv,mats,p:new THREE.Vector3(),v:new THREE.Vector3(.2,0,0),ph:i*1.7,init:false}; });
  const size=()=>{const w=innerWidth,h=innerHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}; size(); addEventListener('resize',size);
  const tag=document.createElement('p'); tag.id='labBgTag'; tag.setAttribute('aria-hidden','true'); document.body.appendChild(tag);
  const TJ='蝶の意匠（各 1 羽・3D の模式）：'+DEF.map(d=>d.jp).join('・'), TE='Butterfly designs (one each, 3D models): '+DEF.map(d=>d.en).join(' · ');
  const toW=(px,py)=>{const hh=Math.tan(20*Math.PI/180)*10, hw=hh*cam.aspect; return new THREE.Vector3((px/innerWidth*2-1)*hw,(1-py/innerHeight*2)*hh,0)};
  let alpha=0, last=0, t0=performance.now();
  // 蝶は居場所のまわりを飛び続ける（逃げない・瞬間移動しない）。文字に重なるあいだは薄くし、数式を開いているあいだは出さない
  function aim(){ const fx=document.querySelector('.wv-more[open]'); if(fx){const q=fx.getBoundingClientRect(); if(q.bottom>0&&q.top<innerHeight) return 0;}
    const first=scrollY<innerHeight*.6&&!!document.querySelector('#top.active'); return first?1:.12; }
  const tmp=new THREE.Vector3(), q=new THREE.Quaternion(), fwd=new THREE.Vector3(0,0,1);
  function frame(now){ const s=(now-t0)/1000, dt=Math.min(.05,Math.max(.001,(now-(last||now))/1000)); last=now;
    const A=aim(); alpha+=(A-alpha)*Math.min(1,dt*(A<alpha?4:1.5));
    const R=sp?.3:.95;
    let vy=innerHeight*.56; if(sp){ const v=document.querySelector('.sd-vis'), rr=v&&v.getBoundingClientRect(); if(rr&&rr.height>40&&A>.5) vy=(rr.top+rr.bottom)/2; }
    B.forEach((b,i)=>{ const h=sp?b.d.hs:b.d.home, c=sp?toW(innerWidth*h[0],vy+h[1]):toW(innerWidth*h[0],innerHeight*h[1]), w=b.d.w;
      const goal=tmp.set(c.x+Math.sin(s*w+b.ph)*R,c.y+Math.sin(s*w*2.03+b.ph*1.3)*R*.42,Math.sin(s*w*.74+b.ph)*.8);
      if(!b.init){ b.p.copy(goal); b.init=true; }
      b.v.lerp(goal.sub(b.p).multiplyScalar(.9),Math.min(1,dt*1.2)); b.p.addScaledVector(b.v,dt); b.m.position.copy(b.p);
      if(b.v.lengthSq()>1e-6){ q.setFromUnitVectors(fwd,tmp.copy(b.v).normalize()); b.m.quaternion.slerp(q,Math.min(1,dt*4)); }
      const P=s*(4.4+i*.5)*6.283+b.ph, a=Math.sin(P)*.5+.5, ang=-.42+(1.48+.42)*a, ang2=-.38+(1.4+.38)*(Math.sin(P-.45)*.5+.5);
      if(b.piv.length>=4){ b.piv[0].rotation.set(0,0,-ang); b.piv[1].rotation.set(0,0,-ang2); b.piv[2].rotation.set(0,0,ang); b.piv[3].rotation.set(0,0,ang2); }
      const tg=A>.5?1:(A>0&&b.d.st==='photo'&&!sp?.12:0); b.a=(b.a||0)+(tg-(b.a||0))*Math.min(1,dt*(tg<(b.a||0)?4:1.5)); b.m.visible=b.a>.02; b.mats.forEach(mt=>{ mt.opacity=(mt.userData.o0??1)*b.a; }); });
    tag.textContent=alpha>.6?(document.documentElement.lang==='en'?TE:TJ):'';
    r.render(sc,cam); }
  let on=true; document.addEventListener('visibilitychange',()=>{on=!document.hidden; if(on) requestAnimationFrame(loop)});
  function loop(t){ if(!on) return; if(t-(last||0)>(sp?40:20)||!last) frame(t); requestAnimationFrame(loop); }
  if(still) frame(performance.now()); else requestAnimationFrame(loop);
}
