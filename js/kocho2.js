// © mitsulab. 2026-11-19 背景：氷川参道の 3D の中を、アゲハの群れが舞う（胡蝶の夢・Qualium 式の重なり）。
// 蝶の 3D は mitsulab が図鑑の形態にそって組み立てた造形（Qualia/omiya の creatures_kochou.js。外から取りこんだ 3D はない）。
// 受けとり手ごとの群れ（人・ミツバチ・鳥の受けとり方の模式の色）が、それぞれのまとまりを保ちながら重なり・交わり・合わさる（U₁ … Uₙ の重なり）。
// 群れの動きは boid（離れる・そろう・寄る）。群れの居場所は本文に重ならない空き（冒頭の右・左右の余白・スマホの窓）で、位置と向きはなめらかにつながる。
import * as THREE from 'three';
import { makeButterfly } from './creatures_kochou.js';
export function start(){
  const sp=matchMedia('(max-width:560px)').matches, still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv=document.createElement('canvas'); cv.id='labBg'; cv.setAttribute('aria-hidden','true'); document.body.prepend(cv);
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:!sp,alpha:true,powerPreference:'low-power'}); r.setPixelRatio(sp?1:Math.min(1.5,devicePixelRatio)); r.setClearColor(0,0);
  const sc=new THREE.Scene(), cam=new THREE.PerspectiveCamera(40,1,.1,100); cam.position.set(0,0,10); sc.add(cam);
  sc.add(new THREE.HemisphereLight(0xfff6e0,0x1a2a20,1.2)); const dl=new THREE.DirectionalLight(0xfff2d8,2.2); dl.position.set(3,6,5); sc.add(dl); const rim=new THREE.DirectionalLight(0xbfe8f0,.9); rim.position.set(-4,2,-3); sc.add(rim);
  // 受けとり方の色（模式）：人＝そのまま、ミツバチ＝黄緑・青緑へ寄せる（紫は使わない）、鳥＝彩りを強く
  const TINT=[new THREE.Color(1,1,1),new THREE.Color(.55,1,.8),new THREE.Color(1.25,.95,.6)];
  const base=makeButterfly('ageha');
  const FM=[], proto=[0].map(k=>{const m=base.clone(true); const mats=[]; m.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.color)o.material.userData.c0=o.material.color.clone();o.material.transparent=true;mats.push(o.material)}}); FM.push(mats); return m;});
  const mkModel=(k)=>{const m=proto[k].clone(true); const piv=[]; m.traverse(o=>{if(o.isGroup&&o.rotation.order==='ZXY')piv.push(o)}); return {m,piv};};
  const NF=1, NB=1, flocks=[];
  for(let k=0;k<NF;k++){ const fl={k,c:new THREE.Vector3((k-1)*1.2,0,0),t:new THREE.Vector3(),b:[]};
    for(let i=0;i<NB;i++){ const {m,piv}=mkModel(k); m.scale.setScalar(sp?.5:.62); sc.add(m);
      fl.b.push({m,piv,p:new THREE.Vector3((Math.random()-.5)*1.2,(Math.random()-.5)*1.2,(Math.random()-.5)*1.2).add(fl.c),v:new THREE.Vector3((Math.random()-.5)*.4,(Math.random()-.5)*.4,(Math.random()-.5)*.2),ph:Math.random()*6.28}); }
    flocks.push(fl); }
  const size=()=>{const w=innerWidth,h=innerHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}; size(); addEventListener('resize',size);
  const tag=document.createElement('p'); tag.id='labBgTag'; tag.setAttribute('aria-hidden','true'); document.body.appendChild(tag);
  const NAMES_EN=['Wing colour: how people receive (colour-coded model)','Wing colour: how honeybees receive (colour-coded model)','Wing colour: how birds receive (colour-coded model)'];
  const NAMES=['翅の色：人の受けとり方（色分けの模式）','翅の色：ミツバチの受けとり方（色分けの模式）','翅の色：鳥の受けとり方（色分けの模式）'];
  // 画面の点（px）→ カメラの前の面（z=0）の座標
  const toW=(px,py)=>{const hh=Math.tan(20*Math.PI/180)*10, hw=hh*cam.aspect; return new THREE.Vector3((px/innerWidth*2-1)*hw,(1-py/innerHeight*2)*hh,0)};
  let hub=new THREE.Vector3(2.5,0,0), hubR=1.6, alpha=0, last=0, t0=performance.now();
  // 群れは冒頭の位置のまま飛び続ける（逃げない・瞬間移動しない）。スクロールして文字に重なるあいだは少し薄くする
  const HOME={x:.74,y:.46};
  function target(){ const fx=document.querySelector('.wv-more[open]'); if(fx){const r=fx.getBoundingClientRect(); if(r.bottom>0&&r.top<innerHeight) return {p:hub,R:hubR,a:0};}
    const first=scrollY<innerHeight*.6&&!!document.querySelector('#top.active');
    if(sp){ const v=document.querySelector('.sd-vis'); const rr=v&&v.getBoundingClientRect(); const cy=rr&&first?(rr.top+rr.bottom)/2:innerHeight*.62; return {p:toW(innerWidth*.5,cy),R:.28,a:first?1:.18}; }
    return {p:toW(innerWidth*HOME.x,innerHeight*HOME.y),R:.9,a:first?1:.12}; }
  const tmp=new THREE.Vector3(), q=new THREE.Quaternion(), fwd=new THREE.Vector3(0,0,1), m4=new THREE.Matrix4();
  function frame(now){ const s=(now-t0)/1000, dt=Math.min(.05,Math.max(.001,(now-(last||now))/1000)); last=now;
    const T=target(); hub.lerp(T.p,Math.min(1,dt*1.2)); hubR+= (T.R-hubR)*Math.min(1,dt*1.2); alpha+=(T.a-alpha)*Math.min(1,dt*(T.a<alpha?4:1.5));
    // 群れの中心：重なり（∩）・合わさり（∪）・離れる、をくり返す（なめらかに）
    const ph=(s*.07)%1, mode=ph<.33?0:ph<.66?1:2, gap=[1,.35,.05][mode], sm=.5-.5*Math.cos(ph*6.283*3);
    flocks.forEach((fl,k)=>{ const a=k/NF*6.283+s*.15; fl.t.set(hub.x+Math.cos(a)*hubR*(.25+.75*gap),hub.y+Math.sin(a)*hubR*.6*(.25+.75*gap),Math.sin(a*1.3)*.6); fl.c.lerp(fl.t,Math.min(1,dt*.8)); });
    const op=alpha;
    flocks.forEach(fl=>{ fl.b.forEach((b,i)=>{
        const goal=tmp.set(hub.x+Math.sin(s*.31)*hubR,hub.y+Math.sin(s*.62)*hubR*.45,Math.sin(s*.23)*.8);
        b.v.lerp(goal.sub(b.p).multiplyScalar(.9),Math.min(1,dt*1.2));
        b.p.addScaledVector(b.v,dt);
        b.m.position.copy(b.p);
        const dir=tmp.copy(b.v).normalize(); q.setFromUnitVectors(fwd,dir); b.m.quaternion.slerp(q,Math.min(1,dt*4));
        const P=s*5*6.283+b.ph, a=Math.sin(P)*.5+.5, ang=-.42+(1.48+.42)*a, ang2=-.38+(1.4+.38)*(Math.sin(P-.45)*.5+.5);
        if(b.piv.length>=4){ b.piv[0].rotation.set(0,0,-ang); b.piv[1].rotation.set(0,0,-ang2); b.piv[2].rotation.set(0,0,ang); b.piv[3].rotation.set(0,0,ang2); }
        b.m.visible=op>.02;
      }); });
    { const u=(((s/8)%3)+3)%3, i0=Math.floor(u), f=u-i0, e2=f<.6?0:(f-.6)/.4, e3=e2*e2*(3-2*e2); const cc=TINT[i0].clone().lerp(TINT[(i0+1)%3],e3); FM[0].forEach((mt,j)=>{ mt.opacity=op; if(mt.color&&mt.userData.c0) mt.color.copy(mt.userData.c0).multiply(cc); }); }
    const ui=Math.floor((((s/8)%3)+3)%3); tag.textContent=op>.6?(document.documentElement.lang==='en'?NAMES_EN[ui]:NAMES[ui]):'';
    r.render(sc,cam); }
  let on=true; document.addEventListener('visibilitychange',()=>{on=!document.hidden; if(on) requestAnimationFrame(loop)});
  function loop(t){ if(!on) return; if(t-(last||0)>(sp?40:20)||!last) frame(t); requestAnimationFrame(loop); }
  if(still) frame(performance.now()); else requestAnimationFrame(loop);
}
