// Qualia/dream — 水際の場（非公開の初版）
// 場＝ 48×48 の格子に分かれた一つの連続した状態（地表の水 w・土の湿り s・踏まれた跡 c・変化 d）。
// 雨 → 地表 → 土 → 根 → 樹 → 空気 → 霧・見通し → 人の動き → 踏み跡 → 浸み込み、を毎刻つなげる（End to End）。
// すべて創作モデル（観測入力なし）。音は想定合成音。
import * as T from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {growKeyaki,sprigMesh} from './vendor/tree.js';
import {qxEntry} from './qx.js?v=20261109r2';
const t0=performance.now(),$=id=>document.getElementById(id),mobile=innerWidth<600;
let seed=1108;const R=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};

// ---------- 場の状態 ----------
const N=48,SIZE=24,H=SIZE/2,cell=SIZE/N,NN=N*N;
const w=new Float32Array(NN),s=new Float32Array(NN),c=new Float32Array(NN),d=new Float32Array(NN),sp=new Float32Array(NN),root=new Float32Array(NN),tmp=new Float32Array(NN);
const TREE={x:3.5,z:-3.5},POND={x:-5,z:2};
const field={rain:0,pond:0,sap:.2,air:.3,clock:0,here:0,dwell:0,pulse:0,reached:0,scent:1,birdSee:1,probe:.3,edge:.3};
const PROBE={x:4.6,z:4.2},FLOWER={x:-1,z:-7};const TRAIL=[];for(let q=0;q<=40;q++){const u=q/40;TRAIL.push([FLOWER.x+(TREE.x-FLOWER.x)*u+Math.sin(u*9)*.7,FLOWER.z+(TREE.z+1.5-FLOWER.z)*u]);}const scent=new Float32Array(TRAIL.length).fill(1);
for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i,x=-H+(i+.5)*cell,z=-H+(j+.5)*cell;
  const dt=Math.hypot(x-TREE.x,z-TREE.z);root[k]=Math.max(0,1-dt/5.5);s[k]=.25+.1*Math.max(0,1-Math.hypot(x-POND.x,z-POND.z)/8);sp[k]=s[k];}
const pondR=()=>3.0+.7*field.pond;
const inPond=(x,z)=>Math.hypot(x-POND.x,z-POND.z)<pondR();
const idx=(x,z)=>{const i=Math.floor((x+H)/cell),j=Math.floor((z+H)/cell);return(i<0||j<0||i>=N||j>=N)?-1:j*N+i;};
function rainAt(t){ // 創作の雨の周期（約 100 秒で強まり・やむ）
  const a=Math.sin(t*.063)*.5+.5,b=Math.sin(t*.021+1.3)*.5+.5;return Math.min(1,Math.max(0,a*b*1.6-.25));}
const log=[];const said={};
const stamp=()=>{const m=Math.floor(field.clock/60),s2=Math.floor(field.clock%60);return `${m}分${String(s2).padStart(2,'0')}秒`;};const seen={};function addLog(t){log.push(stamp()+' '+t);if(log.length>40)log.shift();if($('src').style.display==='block')drawLog();}function note(key,text){const cont=seen[key]!==undefined&&field.clock-seen[key]<.25;seen[key]=field.clock;if(cont)return;if((key==='front'||key==='beat')&&said[key])return;said[key]=1;const m=Math.floor(field.clock/60),sec=Math.floor(field.clock%60);log.push(`${m}分${String(sec).padStart(2,'0')}秒 ${text}`);if(log.length>40)log.shift();if($('src').style.display==='block')drawLog();}
function drawLog(){$('log').innerHTML=log.map(l=>`<li>${l}</li>`).join('')||'<li>まだ大きな変化はありません</li>';const sc=$('src');sc.scrollTop=sc.scrollHeight;}
let me={x:6,z:6};
function step(dt){
  field.clock+=dt;const r=rainAt(field.clock);field.rain+=(r-field.rain)*.05;
  {let es=0,n=0;const pr=pondR()+.8;for(let q=0;q<16;q++){const a=q/16*6.283,k2=idx(POND.x+Math.cos(a)*pr,POND.z+Math.sin(a)*pr);if(k2>=0){es+=s[k2];n++;}}es/=n||1;field.edge=es;
  // 雨と、飽和した周りの土からの浸み出しで増え、周りの土が乾いているほど土へ抜ける（模式）
  field.pond=Math.min(1,Math.max(0,field.pond+(field.rain*.004+Math.max(0,es-.93)*.01-(1.05-es)*.004-.0012)*dt*10));}
  let uptake=0,evap=0,front=0,rootN=0;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i,x=-H+(i+.5)*cell,z=-H+(j+.5)*cell;
    if(inPond(x,z)){w[k]=1;s[k]=1;continue;}
    w[k]+=field.rain*.03*dt*10*(1-.5*root[k]); // 樹冠の下は雨が少し遮られる
    const inf=.025*(1-.7*c[k])*w[k]*(1-s[k])*dt*10;w[k]-=inf;s[k]+=inf;  // 踏み跡は浸み込みにくい
    const e=.004*w[k]*dt*10;w[k]-=e;evap+=e;
    const u=.012*root[k]*s[k]*dt*10;s[k]-=u;uptake+=u;
    s[k]-=.0006*s[k]*dt*10;w[k]=Math.min(1,Math.max(0,w[k]));}
  // 土の湿りは隣へゆっくり広がる（水際から内へ）
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i,l=i>0?k-1:k,rr=i<N-1?k+1:k,u=j>0?k-N:k,dn=j<N-1?k+N:k;tmp[k]=s[k]+.05*dt*10*(s[l]+s[rr]+s[u]+s[dn]-4*s[k]);}
  for(let k=0;k<NN;k++){const ns=Math.min(1,Math.max(0,tmp[k]));d[k]+=(Math.abs(ns-sp[k])*120-d[k])*.08;sp[k]=s[k]=ns;if(root[k]>.4){front+=s[k];rootN++;}}
  field.sap+=(Math.min(1,uptake*.45)-field.sap)*.01*dt*10;
  field.air+=(Math.min(.85,evap*1.5+field.rain*.3+field.sap*.15)-field.air)*.02*dt*10;
  // 人：留まるほど足元が締まり（跡が残り）、場が近づく
  const k=idx(me.x,me.z);field.here=k<0?0:d[k];
  if(moving)field.dwell=Math.max(0,field.dwell-dt*.8);else field.dwell=Math.min(1,field.dwell+dt*.12);
  if(k>=0&&!moving)for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const kk=k+dj*N+di;if(kk>=0&&kk<NN)c[kk]=Math.min(1,c[kk]+dt*.002*(di||dj?.5:1));}
  front/=rootN||1;field.rootS=front;if(front>.55&&!field.reached){field.reached=1;field.pulse=1;note('front','湿りの前線が根の範囲に届く');note('beat','根の範囲の地面・葉・霧・音が同じ拍で応える');}if(front<.42){field.reached=0;said.front=said.beat=0;}field.pulse=Math.max(0,field.pulse-dt*.25);
  // ① 人以外の主体を同じ状態に重ねる（模式）
  let sc=0;for(let q=0;q<TRAIL.length;q++){const [x,z]=TRAIL[q],k2=idx(x,z);const wash=k2<0?0:w[k2];const shel=k2<0?0:root[k2];scent[q]+=((1-.85*field.rain*(1-.7*shel))*(1-.9*wash*(1-.6*shel))-scent[q])*.03*dt*10;scent[q]=Math.max(0,Math.min(1,scent[q]));sc+=scent[q]>.35?1:0;}field.scent=sc/TRAIL.length;
  field.birdSee=Math.max(.15,1-field.air*.9);
  const ks=idx(PROBE.x,PROBE.z);field.probe=Math.max(0,Math.min(1,s[ks]*.85+(R()-.5)*(.02+.12*w[ks])));
  if(field.scent<.4)note('scent','匂いの道筋が途切れる（模式）');if(field.birdSee<.4)note('bird','霧で、鳥から見通せる距離が縮む（模式・旋回の輪が狭まる）');
  if(!field.raining&&field.rain>.3){field.raining=1;addLog('雨が強まる');}
  if(field.raining&&field.rain<.08){field.raining=0;addLog('雨がやむ');}
  if(field.pond>.6)note('pond','水際が広がる');
  
  if(field.sap>.55)note('sap','樹の吸い上げが上がる');
  if(field.air>.6)note('air','空気が湿り、遠くが霞む');
  if(field.dwell>.95&&c[k]>.2)note('dwell'+k,'留まった跡が足元に残る（模式）');
}

// ---------- 3D ----------
const renderer=new T.WebGLRenderer({canvas:$('w'),antialias:!mobile,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.25));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=false;const wantShadow=!mobile; renderer.shadowMap.type=T.PCFSoftShadowMap; // 影は最初の描画のあとに入れる
const scene=new T.Scene(),sky=new T.Color(0xbccbd0);scene.background=sky.clone();scene.fog=new T.FogExp2(sky.getHex(),.03);
const cam=new T.PerspectiveCamera(mobile?68:58,innerWidth/innerHeight,.05,120);
scene.add(new T.HemisphereLight(0xe4eef0,0x7a6a4c,2.0));const sun=new T.DirectionalLight(0xfff2da,2.5);sun.position.set(-9,14,7);
if(!mobile){sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14});}scene.add(sun);
const L=new T.TextureLoader(),tex=(n,r,col)=>{const t=L.load('assets/'+n);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(r,r);if(col)t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;};
// 場の状態を地面へ：湿り→暗く・艶、踏み跡→わずかに明るく締まる
const fieldTex=new T.DataTexture(new Uint8Array(NN*4),N,N,T.RGBAFormat);fieldTex.magFilter=fieldTex.minFilter=T.LinearFilter;fieldTex.needsUpdate=true;
const gMat=new T.MeshStandardMaterial({map:tex('soil_c.webp',30,1),normalMap:tex('soil_n.webp',30),roughness:.95,color:0xd8cfb4});
gMat.onBeforeCompile=sh=>{sh.uniforms.uField={value:fieldTex};sh.uniforms.uPulse={value:0};sh.uniforms.uSky={value:scene.fog.color};sh.uniforms.uRad={value:0};gMat.userData.u=sh.uniforms;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vF;varying vec3 vWp;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 wpF=modelMatrix*vec4(transformed,1.);vWp=wpF.xyz;vF=(wpF.xz+'+H.toFixed(1)+')/'+SIZE.toFixed(1)+';');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vF;varying vec3 vWp;uniform vec3 uSky;uniform sampler2D uField;uniform float uPulse,uRad;float fWet,rg;')
   .replace('#include <map_fragment>','#include <map_fragment>\nvec4 F=texture2D(uField,vF);float inF=smoothstep(0.,.18,vF.x)*smoothstep(1.,.82,vF.x)*smoothstep(0.,.18,vF.y)*smoothstep(1.,.82,vF.y);fWet=inF*clamp(F.r*.7+F.g*.5,0.,1.);float dT=length(vF*24.-12.-vec2(3.5,-3.5));float rg=uPulse*exp(-pow((dT-uRad)*.7,2.));fWet=clamp(fWet+rg,0.,1.);diffuseColor.rgb*=mix(1.12,.42,fWet)*(1.+.14*F.b*inF)*(1.-.35*uPulse*step(dT,uRad));vec3 Vv=normalize(cameraPosition-vWp);float fr=pow(1.-max(Vv.y,0.),3.);diffuseColor.rgb=mix(diffuseColor.rgb,uSky*.55,clamp(rg*fr*1.4,0.,.75));')
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.28,fWet*fWet);roughnessFactor=mix(roughnessFactor,.12,rg);');};
const ground=new T.Mesh(new T.PlaneGeometry(260,260,1,1),gMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
// 水面
const water=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshStandardMaterial({color:0x2c3d3c,roughness:.06,metalness:.25,transparent:true,opacity:.92}));
water.rotation.x=-Math.PI/2;water.position.set(POND.x,.025,POND.z);scene.add(water);
const ringGeo=new T.RingGeometry(.9,1,40),rings=[];for(let i=0;i<40;i++){const m=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0xdfe8e6,transparent:true,opacity:0,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.03;m.userData.t=9;scene.add(m);rings.push(m);}
// 樹（近くに一本・遠くに三本）
const bark=new T.MeshStandardMaterial({map:tex('bark_c.webp',1,1),normalMap:tex('bark_n.webp',1),roughness:.9,color:0xb6aa95});
const leafM=new T.MeshStandardMaterial({map:tex('leaf.webp',1,1),alphaTest:.45,side:T.DoubleSide,roughness:.8,color:0xc6d2b2});
const crowns=[];
// 最初の描画は地面・水・近くの樹だけ。ほかは描画のあと 1 つずつ出す（シェーダの初回の組み立てを分ける）
const _add=scene.add.bind(scene),held=[];scene.add=(...o)=>{o.forEach(x=>{x.visible=false;held.push(x);});return _add(...o);};
// 手前の地面：落ち葉（leaf.webp を平らに）
{const n=mobile?500:1100,g=new T.PlaneGeometry(.32,.32);g.rotateX(-Math.PI/2);const im=new T.InstancedMesh(g,new T.MeshStandardMaterial({map:tex('leaf.webp',1,1),alphaTest:.45,roughness:.9,color:0x9a8a66,side:T.DoubleSide}),n),m4=new T.Matrix4(),q4=new T.Quaternion(),e=new T.Euler();for(let i=0;i<n;i++){let x,z;do{x=(R()-.5)*26;z=(R()-.5)*26;}while(Math.hypot(x-POND.x,z-POND.z)<4);const near=Math.hypot(x-TREE.x,z-TREE.z)<7?1:.4;if(R()>near){i--;continue;}e.set((R()-.5)*.3,R()*6.28,(R()-.5)*.3);q4.setFromEuler(e);const sc=.7+R()*.8;m4.compose(new T.Vector3(x,.012+R()*.01,z),q4,new T.Vector3(sc,sc,sc));im.setMatrixAt(i,m4);}im.receiveShadow=true;scene.add(im);}
function taperTube(points,r0,r1,segments=8,radial=6){const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,segments,r0,radial,false),p=g.attributes.position;for(let i=0;i<p.count;i++){const u=Math.floor(i/(radial+1))/segments,q=curve.getPointAt(u),k=T.MathUtils.lerp(1,r1/r0,u);p.setXYZ(i,q.x+(p.getX(i)-q.x)*k,q.y+(p.getY(i)-q.y)*k,q.z+(p.getZ(i)-q.z)*k);}g.computeVertexNormals();return g;}
scene.add=_add;
function grow(list){for(const [x,z,sc,det] of list){
  const tr=growKeyaki({taperTube},R,0,0,{r:.42,hf:2.6,limbs:det?6:5,len:[3.4,4.8],tilt:.37,levels:det?3:2,forks:2,decay:.62,sprigs:det?(mobile?1400:2600):(mobile?350:600),back:0,det:!!det});
  const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(sc);scene.add(g);
  const wood=new T.Mesh(mergeGeometries(tr.wood),bark);wood.castShadow=wood.receiveShadow=!mobile;g.add(wood);
  const cr=sprigMesh(tr.sprigs,leafM,.75,[.8,.88,.68],tr.ctr,R);cr.castShadow=!mobile;g.add(cr);crowns.push(g);}}
grow([[TREE.x,TREE.z,1,1]]);
const later=[()=>grow([[-10,-12,1.1,0]]),()=>grow([[9,-15,.95,0]]),()=>grow([[-15,6,1,0]])]; // 遠くの樹は最初の描画のあとに1本ずつ
function dotTex(){const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d'),r=g.createRadialGradient(16,16,0,16,16,16);r.addColorStop(0,'#fff');r.addColorStop(.35,'#fff8');r.addColorStop(1,'#fff0');g.fillStyle=r;g.fillRect(0,0,32,32);return new T.CanvasTexture(c);}
const _hold=scene.add;scene.add=(...o)=>{o.forEach(x=>{x.visible=false;held.push(x);});return _add(...o);};
// 場の変化を地表のすぐ上の小さな粒に（状態ではなく「変わっているところ」だけが光る）
const pGeo=new T.BufferGeometry(),pPos=new Float32Array(NN*3),pCol=new Float32Array(NN*3);
for(let k=0;k<NN;k++){const i=k%N,j=(k/N)|0;pPos[k*3]=-H+(i+.5)*cell+(R()-.5)*cell*.8;pPos[k*3+1]=.04;pPos[k*3+2]=-H+(j+.5)*cell+(R()-.5)*cell*.8;}
pGeo.setAttribute('position',new T.BufferAttribute(pPos,3));pGeo.setAttribute('color',new T.BufferAttribute(pCol,3));
const dots=new T.Points(pGeo,new T.PointsMaterial({map:dotTex(),alphaTest:.01,size:mobile?.09:.07,vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));scene.add(dots);
// 雨
const RN=mobile?900:1800,rGeo=new T.BufferGeometry(),rPos=new Float32Array(RN*6);
for(let i=0;i<RN;i++){const x=(R()-.5)*30,y=R()*10,z=(R()-.5)*30;rPos.set([x,y,z,x,y-.25,z],i*6);}
rGeo.setAttribute('position',new T.BufferAttribute(rPos,3));const rainM=new T.LineBasicMaterial({color:0xd8e2e2,transparent:true,opacity:0});const rainL=new T.LineSegments(rGeo,rainM);scene.add(rainL);


// ---------- 人以外の主体（模式）：切り替えず、同じ状態に同時に重なる ----------
const trailGeo=new T.BufferGeometry(),trailPos=new Float32Array(TRAIL.length*3),trailCol=new Float32Array(TRAIL.length*3);
TRAIL.forEach(([x,z],q)=>trailPos.set([x,.35+Math.sin(q*.7)*.08,z],q*3));trailGeo.setAttribute('position',new T.BufferAttribute(trailPos,3));trailGeo.setAttribute('color',new T.BufferAttribute(trailCol,3));
const trail=new T.Points(trailGeo,new T.PointsMaterial({map:dotTex(),size:mobile?.24:.18,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));scene.add(trail);
const flowers=new T.InstancedMesh(new T.SphereGeometry(.03,6,4),new T.MeshStandardMaterial({color:0xc9a6d8,roughness:.75}),90);{const m4=new T.Matrix4();for(let i=0;i<90;i++){m4.makeTranslation(FLOWER.x+(R()-.5)*3,.06+R()*.12,FLOWER.z+(R()-.5)*3);flowers.setMatrixAt(i,m4);}scene.add(flowers);}
const bees=[];for(let i=0;i<5;i++){const b=new T.Mesh(new T.SphereGeometry(.06,8,6),new T.MeshBasicMaterial({color:0x2a2116}));b.scale.set(1.6,1,1);b.material.color.set(0xd9a441);b.userData.u=i/5;scene.add(b);bees.push(b);}
const birds=[];for(let i=0;i<4;i++){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.25,0,.05,0,0,-.05,0,0,-.05,.25,0,.05],3));const b=new T.LineSegments(g,new T.LineBasicMaterial({color:0x1d2120,transparent:true}));b.userData.a=i*1.57;scene.add(b);birds.push(b);}
const probe=new T.Group();{const pole=new T.Mesh(new T.CylinderGeometry(.015,.015,.5,6),new T.MeshStandardMaterial({color:0x8b8f8c,metalness:.4,roughness:.5}));pole.scale.y=1.6;pole.position.y=.4;probe.add(pole);const led=new T.Mesh(new T.SphereGeometry(.045,10,8),new T.MeshBasicMaterial({color:0x9fd6c2}));led.position.y=.82;probe.add(led);probe.userData.led=led;probe.position.set(PROBE.x,0,PROBE.z);scene.add(probe);}
scene.add=_add;
let C3=null;
function loadCreatures(){import('./vendor/creatures.js').then(m=>{C3=m;
  bees.forEach((b,i)=>{const n=m.makeBee();n.scale.setScalar(.25);n.userData.u=b.userData.u;n.userData.ph=i*1.3;scene.remove(b);b.geometry.dispose();scene.add(n);bees[i]=n;});
  birds.forEach((b,i)=>{const n=m.makeTit();n.scale.setScalar(.5);n.userData.a=b.userData.a;n.userData.state='fly';n.userData.ph=i*.7;scene.remove(b);scene.add(n);birds[i]=n;});}).catch(e=>console.warn(e));}
function updateOthers(now,dt){
  // 蜂：雨と地表の水で匂いの道筋が切れる（模式）。匂いの残る区間だけを辿る
  for(let q=0;q<TRAIL.length;q++){const v=scent[q]>.35?scent[q]*.6:0;trailCol[q*3]=v;trailCol[q*3+1]=v*.72;trailCol[q*3+2]=v*.3;}trailGeo.attributes.color.needsUpdate=true;
  for(const b of bees){let u=b.userData.u;if(!reduce)u=(u+dt*.03*(field.rain<.3?1:.2))%1;b.userData.u=u;const q=Math.min(TRAIL.length-1,Math.max(0,Math.floor(u*TRAIL.length))),[x,z]=TRAIL[q];b.visible=scent[q]>.35&&Math.hypot(x-me.x,z-me.z)>1.4;b.position.set(x+Math.sin(now*.01+q)*.06,.35+Math.sin(now*.013+q)*.05,z);if(C3){const [nx,nz]=TRAIL[Math.min(TRAIL.length-1,q+1)];b.rotation.y=Math.atan2(nx-x,nz-z);b.userData.speed=1;b.userData.animate&&b.userData.animate(now/1000,!reduce);}}
  // 鳥：霧で見通しが縮むと、高く広い輪から低く狭い輪へ（模式）
  const r=2.5+7*field.birdSee,hgt=3.4+.6*field.birdSee;birds.forEach((b,i)=>{if(!reduce)b.userData.a+=dt*(.25+.1*i)*(9/r);const a=b.userData.a;if(i===0){b.scale.setScalar(mobile?.8:.6);const rr=(mobile?2.4:3)+2*field.birdSee;b.position.set(me.x+Math.cos(a)*rr,2.6+.6*field.birdSee,me.z+Math.sin(a)*rr);}else b.position.set(TREE.x+Math.cos(a)*r,hgt+i*.4,TREE.z+Math.sin(a)*r);if(C3){b.rotation.y=-a;b.userData.animate&&b.userData.animate(reduce?0:now/1000,true);}else{b.rotation.y=-a;b.scale.setScalar(2.2+.3*Math.sin(now*.02+i));}});
  // センサー：土の湿りを測るが、地表が濡れるほど読みが揺らぐ（模式）
  const led=probe.userData.led;led.material.color.setHSL(.45-.25*field.probe,.5,.45+.3*(reduce?.5:Math.max(0,Math.sin(now*.004*(1+4*field.probe)))));
}
// ---------- 身体と操作 ----------
let yaw=Math.atan2(-(TREE.x-me.x),-(TREE.z-me.z))+.5,pitch=-.06,target=null,moving=false,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const goP={x:me.x-Math.sin(yaw)*3.4,z:me.z-Math.cos(yaw)*3.4},goV=new T.Vector3();const GO=qxEntry({label:'ここへ歩く（足もとの変化が見える）',css:'#t{left:54px!important}',onPress:()=>{target={x:goP.x,z:goP.z};$('hint').style.opacity=0;}});
const ray=new T.Raycaster(),ndc=new T.Vector2();let down=null;
/* 2026-11-09 第3周：押した所に輪を一つ（どこへ行くかが分かる） */const tapRing=new T.Mesh(new T.RingGeometry(.42,.5,40).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xf6f0d6,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));tapRing.visible=false;tapRing.renderOrder=5;scene.add(tapRing);
const cv=$('w');
cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,yaw,pitch,moved:false};cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>6)down.moved=true;if(down.moved){yaw=down.yaw+dx*.005;pitch=Math.max(-.7,Math.min(.5,down.pitch+dy*.004));}});
cv.addEventListener('pointerup',e=>{if(down&&!down.moved){GO.end();ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ndc,cam);const h=ray.intersectObject(ground)[0];if(h){target={x:Math.max(-11,Math.min(11,h.point.x)),z:Math.max(-11,Math.min(11,h.point.z))};tapRing.position.set(target.x,h.point.y+.03,target.z);tapRing.userData.t=0;tapRing.visible=true;}$('hint').style.opacity=0;}down=null;});
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0;});
function walk(dt){let vx=0,vz=0;const f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),sd=(keys.d?1:0)-(keys.a?1:0);
  if(keys.arrowleft)yaw+=dt*1.2;if(keys.arrowright)yaw-=dt*1.2;
  if(f||sd){target=null;vx=(-Math.sin(yaw)*f+Math.cos(yaw)*sd)*1.4;vz=(-Math.cos(yaw)*f-Math.sin(yaw)*sd)*1.4;}
  else if(target){const dx=target.x-me.x,dz=target.z-me.z,l=Math.hypot(dx,dz);if(l<.08)target=null;else{const v=Math.min(1.4,l*2);vx=dx/l*v;vz=dz/l*v;const ty=Math.atan2(-dx,-dz);let dd=ty-yaw;dd=Math.atan2(Math.sin(dd),Math.cos(dd));yaw+=dd*Math.min(1,dt*2.5);}}
  me.x+=vx*dt;me.z+=vz*dt;const pr=Math.hypot(me.x-POND.x,me.z-POND.z),lim=pondR()+.35;if(pr<lim){me.x=POND.x+(me.x-POND.x)/pr*lim;me.z=POND.z+(me.z-POND.z)/pr*lim;target=null;}
  me.x=Math.max(-11.5,Math.min(11.5,me.x));me.z=Math.max(-11.5,Math.min(11.5,me.z));moving=Math.hypot(vx,vz)>.05;}
// ボタン
const bS=$('bSnd'),bM=$('bMot'),bR=$('bSrc');
bM.setAttribute('aria-pressed',reduce);bM.onclick=()=>{reduce=!reduce;bM.setAttribute('aria-pressed',reduce);};
bR.onclick=()=>{const o=$('src').style.display!=='block';$('src').style.display=o?'block':'none';bR.setAttribute('aria-pressed',o);if(o)drawLog();};
// 音（既定は無音。押したときだけ作る。すべて想定合成音）
let A=null;
bS.onclick=async()=>{if(!A){const ac=new (window.AudioContext||window.webkitAudioContext)();const len=ac.sampleRate*2,b=ac.createBuffer(1,len,ac.sampleRate),ch=b.getChannelData(0);for(let i=0;i<len;i++)ch[i]=Math.random()*2-1;
  const n=ac.createBufferSource();n.buffer=b;n.loop=true;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2400;bp.Q.value=.6;const gR=ac.createGain();gR.gain.value=0;n.connect(bp).connect(gR).connect(ac.destination);n.start();
  const o1=ac.createOscillator();o1.type='sine';o1.frequency.value=82;const g1=ac.createGain();g1.gain.value=0;o1.connect(g1).connect(ac.destination);o1.start();
  const o2=ac.createOscillator();o2.type='triangle';o2.frequency.value=196;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;const g2=ac.createGain();g2.gain.value=0;o2.connect(lp).connect(g2).connect(ac.destination);o2.start();
  A={ac,gR,g1,o1,g2,o2,on:true,lastP:0};}else{A.on=!A.on;A.on?await A.ac.resume():await A.ac.suspend();}
  bS.setAttribute('aria-pressed',A.on);};
function sound(){if(!A||!A.on)return;const t=A.ac.currentTime;if(field.pulse>.98&&A.lastP<.98){const o=A.ac.createOscillator(),g=A.ac.createGain();o.type='sine';o.frequency.value=330;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.05);g.gain.exponentialRampToValueAtTime(.0001,t+2.2);o.connect(g).connect(A.ac.destination);o.start();o.stop(t+2.3);}A.lastP=field.pulse;const _=0,near=Math.max(0,1-Math.hypot(me.x-TREE.x,me.z-TREE.z)/9),att=.4+.6*field.dwell;
  A.gR.gain.setTargetAtTime(field.rain*.06*(1-.4*field.air),t,.3);                    // 雨の粒
  A.g1.gain.setTargetAtTime(Math.min(1,field.here)*.05*att,t,.4);A.o1.frequency.setTargetAtTime(70+field.here*40,t,.5); // 足元の土が変わるときだけ
  A.g2.gain.setTargetAtTime(field.sap*near*.025*att,t,.6);A.o2.frequency.setTargetAtTime(165+field.sap*60,t,.8);}       // 樹の吸い上げ（近いほど）

// ---------- 毎フレーム ----------
const fog=new T.Color(),dry=new T.Color(0xc6d4d6),wet=new T.Color(0xaab8ba),dropC=new T.Color(),tmpV=new T.Vector3();
let last=performance.now(),acc=0,ready=false,ringI=0,ringAcc=0,frames=0;
function frame(now){const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;frames++;if(tapRing.visible){const u=(tapRing.userData.t+=dt)/1.1;tapRing.scale.setScalar(.4+u*1.4);tapRing.material.opacity=.85*(1-u);if(u>=1)tapRing.visible=false;}
  acc+=dt;while(acc>=.1){step(.1);acc-=.1;}
  walk(dt);
  // 身体：目の高さ 1.55 m。歩くと少し上下し、留まると静まる
  const bob=reduce?0:(moving?Math.sin(now*.009)*.025:0);cam.position.set(me.x,1.55+bob,me.z);
  cam.rotation.set(0,0,0);cam.rotateY(yaw);cam.rotateX(pitch);
  if(!GO.done){cam.updateMatrixWorld();goV.set(goP.x,.05,goP.z).project(cam);GO.place(goV.z<1&&Math.abs(goV.x)<.9&&Math.abs(goV.y)<.9?(goV.x+1)/2*innerWidth:null,(1-goV.y)/2*innerHeight);}
  // 空気 → 霧と光
  fog.copy(dry).lerp(wet,field.air);scene.fog.color.copy(fog);scene.background.copy(fog);scene.fog.density=(.012+.022*field.air)*(1-.35*field.pulse);
  sun.intensity=2.5-1.0*field.air;
  // 状態 → 地面（r=地表の水 g=土の湿り b=踏み跡）
  const px=fieldTex.image.data;for(let k=0;k<NN;k++){px[k*4]=w[k]*255;px[k*4+1]=s[k]*255;px[k*4+2]=c[k]*255;px[k*4+3]=255;}fieldTex.needsUpdate=true;
  // 変化 → 粒。留まるほど、自分の近くの変化が見えやすくなる
  const col=pGeo.attributes.color;for(let k=0;k<NN;k++){const x=pPos[k*3],z=pPos[k*3+2],near=Math.max(0,1-Math.hypot(x-me.x,z-me.z)/(3+5*field.dwell));
    const v=Math.max(0,Math.min(1,d[k])-.08)*(.15+.85*near*(.3+.7*field.dwell));col.array[k*3]=v*.95;col.array[k*3+1]=v*.93;col.array[k*3+2]=v*.82;}col.needsUpdate=true;
  // 水面
  const pr=pondR();water.scale.set(pr,pr,1);
  ringAcc+=reduce?0:dt*field.rain*22;while(ringAcc>1){ringAcc--;const m=rings[ringI++%rings.length],a=R()*6.283,rr=Math.sqrt(R())*pr*.92;m.position.x=POND.x+Math.cos(a)*rr;m.position.z=POND.z+Math.sin(a)*rr;m.userData.t=0;}
  for(const m of rings){m.userData.t+=dt;const t=m.userData.t;m.scale.setScalar(.05+t*.35);m.material.opacity=Math.max(0,.5-t*.6);}
  // 雨（動き控えめでは止めて薄く）
  rainM.opacity=field.rain*(reduce?.12:.35);if(!reduce&&field.rain>.02){const a=rGeo.attributes.position.array,v=dt*9;for(let i=0;i<RN;i++){let y=a[i*6+1]-v;if(y<0)y+=10;a[i*6+1]=y;a[i*6+4]=y-.25;}rGeo.attributes.position.needsUpdate=true;}
  rainL.position.set(me.x,0,me.z);
  // 樹：吸い上げ → 葉の色と揺れ。風は空気の重さで弱まる
  for(const g of crowns){g.rotation.z=reduce?0:Math.sin(now*.0007+g.position.x)*.006*(1-.5*field.air);}
  const P=field.pulse;leafM.color.setRGB(.7+.12*field.sap+.12*P,.8+.14*field.sap+.12*P,.64+.08*field.sap+.06*P);gMat.userData.u&&(gMat.userData.u.uPulse.value=P,gMat.userData.u.uRad.value=1.2+9*(1-P));
  updateOthers(now,dt);
  sound();
  renderer.render(scene,cam);
  if(ready&&held.length&&frames>1){const o=held.shift();if(!bees.includes(o))o.visible=true;}else if(ready&&later.length&&frames>2)later.shift()();else if(ready&&wantShadow&&!renderer.shadowMap.enabled&&frames>6){renderer.shadowMap.enabled=true;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});}
  if(ready&&frames===8)loadCreatures();
  if(!ready){ready=true;window.__ready=performance.now()-t0;window.__nav=performance.now();}
  requestAnimationFrame(frame);}
window.__field=()=>({...field,me:{...me},ready,frames,log:[...log],dWater:d[idx(POND.x+pondR()+.6,POND.z)],cTotal:c.reduce((a,b)=>a+b,0)});
window.__pose=(x,z,y,p)=>{me.x=x;me.z=z;yaw=y;pitch=p;target=null;};window.__beat=()=>{field.pulse=1;};window.__u=()=>gMat.userData.u?[gMat.userData.u.uPulse.value,gMat.userData.u.uRad.value]:null;window.__later=()=>{while(later.length)later.shift()();};
window.__fast=sec=>{for(let i=0;i<sec*10;i++)step(.1);}; // 検証用：時間を進める
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
requestAnimationFrame(frame);
