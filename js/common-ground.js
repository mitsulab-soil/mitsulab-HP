/* mitsulab Common Ground / 2026-11-06. Physical place and situated translations.
   Deterministic procedural scenery; no simulated measurements are presented as observations. */
import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {growKeyaki,sprigMesh} from './common-ground-tree.js';
import {sightLeaf,sightBark,setSightSun} from './kit/sight_trees.js';
import {installDapple} from './kit/sight_look.js';
installDapple(T);
import {MODES,createRelations} from './common-ground-relations.js?v=20261111p5';
let relations=null,relationMode='forest',relationClock=0;
function tourState(value){autoImmersion=!!value;window.dispatchEvent(new CustomEvent('cg:tour',{detail:{active:autoImmersion}}));}
function selectMode(id,{automatic=false}={}){const mode=MODES.find(m=>m.id===id);if(!mode)return false;if(!automatic)tourState(false);relationMode=id;relations?.select(id);viewClue=null;selectedClue=null;dirty=true;wake();window.dispatchEvent(new CustomEvent('cg:mode',{detail:{...mode,kind:'illustrative',automatic}}));return true;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cg-mode]');if(b){stopNarration();selectMode(b.dataset.cgMode);}});

const stage=document.getElementById('cgStage'), figure=document.getElementById('cgScene');
const ui=document.getElementById('cgExperience');
const en=()=>document.documentElement.dataset.lang==='en';
const mq=matchMedia('(prefers-reduced-motion: reduce)');
const layerKeys=new Set();
let selectedClue=null,viewClue=null,clueBlend=0,immersionTime=0,autoImmersion=false;
const bodyPresence={value:0};
let journey=1,journeyPlaying=false,birth=null,landscape,ambientLight,fillLight,seedField,detachedCanvas=false,warming=false;
const journeyRange=document.getElementById('cgJourney'),journeyPlay=document.getElementById('cgJourneyPlay'),journeyEnter=document.getElementById('cgJourneyEnter'),journeyPhase=document.getElementById('cgJourneyPhase');
const worldHost=document.createElement('div');worldHost.id='cgWorldCanvas';worldHost.setAttribute('aria-hidden','true');document.body.prepend(worldHost);
function journeyLabels(){const names=en()?['Trace','Facets','Body','Common ground']:['気配','鏡の構成','身体','共有地'];journeyPhase.textContent=names[journey<.2?0:journey<.6?1:journey<.88?2:3];journeyRange.value=Math.round(journey*1000);journeyRange.setAttribute('aria-valuetext',journeyPhase.textContent);journeyPlay.textContent=journeyPlaying?'Ⅱ':'▷';journeyPlay.setAttribute('aria-label',en()?(journeyPlaying?'Pause the journey':'Play the journey'):(journeyPlaying?'旅路の動きを止める':'旅路を再生する'));}
function enterPlace(){journey=1;journeyPlaying=false;journeyLabels();dirty=true;wake();}
journeyPlay.hidden=true;journeyRange.hidden=true;journeyPhase.textContent='共有地';
journeyEnter.addEventListener('click',()=>{enterPlace();choose(2);});
journeyLabels();
let paused=mq.matches, step=0, dirty=true, active=false, raf=0, last=0, t=0, yaw=0, dialogue=false, audio=null, cues=[], cueIndex=-1, motion=null, vrm=null;
const choose=(n)=>{if(n===0||n===3)layerKeys.clear();selectedClue=null;figure.closest('.cg-hero').classList.remove('is-observing');ui.querySelectorAll('[data-anchor]').forEach(b=>b.setAttribute('aria-pressed','false'));const clue=ui.querySelector('.cg-clue-copy');if(clue)clue.hidden=true;step=n;figure.dataset.step=n;ui.querySelectorAll('[data-cg-step]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.cgStep===n)));ui.querySelectorAll('[data-cg-caption]').forEach(p=>p.hidden=+p.dataset.cgCaption!==n);dirty=true;wake();};
ui.querySelectorAll('[data-cg-step]').forEach(b=>b.addEventListener('click',()=>{autoImmersion=false;enterPlace();choose(+b.dataset.cgStep);}));
const pause=ui.querySelector('.cg-motion');
function pauseLabel(){pause.setAttribute('aria-pressed',String(paused));pause.textContent=en()?(paused?'Resume motion':'Pause motion'):(paused?'動きを再開':'動きを止める');}
pause.addEventListener('click',()=>{paused=!paused;if(paused){tourState(false);journeyPlaying=false;stopNarration();journeyLabels();}pauseLabel();dirty=true;wake();});
mq.addEventListener('change',()=>{paused=mq.matches;if(paused){tourState(false);journeyPlaying=false;}journeyLabels();pauseLabel();dirty=true;wake();});pauseLabel();
const talk=ui.querySelector('.cg-talk'), subtitle=ui.querySelector('.cg-subtitle'), talkStatus=ui.querySelector('.cg-talk-status');
function talkLabel(){talk.textContent=en()?(dialogue?'Stop Aoi’s guide':'Meet Aoi · Japanese audio'):(dialogue?'碧の案内を止める':'碧に会う・声で案内');talk.setAttribute('aria-pressed',String(dialogue));}
function stopNarration(){narrationRequest++;dialogue=false;if(audio){audio.pause();audio.currentTime=0;}motion?.stopSpeaking();subtitle.hidden=true;figure.classList.remove('is-talking');talkLabel();dirty=true;}
let liveCue=-1,cuePromise=null,narrationRequest=0;
function prepareNarration(){
 if(audio)return;
 audio=new Audio('img/common-ground/narration.m4a');audio.preload='auto';audio.addEventListener('ended',stopNarration);audio.addEventListener('error',()=>{stopNarration();talkStatus.textContent=en()?'Audio could not load. Read the transcript below.':'音声を読み込めませんでした。下の「案内の全文」から読めます。';});
 cuePromise=fetch('img/common-ground/narration.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();});cuePromise.catch(()=>{});audio.load();
}
async function beginNarration(){
 if(dialogue){stopNarration();return;}
 tourState(false);enterPlace();window.scrollTo({top:Math.max(0,figure.closest('.cg-hero').getBoundingClientRect().top+scrollY-64),behavior:'instant'});queueWorldMode();
 if(!vrm){talkStatus.textContent=en()?'Aoi is loading. You can explore the scene.':'碧を読み込んでいます。先に風景を操作できます。';return;}
 const request=++narrationRequest;talk.disabled=true;talkStatus.textContent='';
 try{
  prepareNarration();cues=await cuePromise;if(request!==narrationRequest)return;
  await audio.play();if(request!==narrationRequest)return;dialogue=true;liveCue=-1;cueIndex=-1;subtitle.hidden=false;figure.classList.add('is-talking');talkLabel();dirty=true;wake();
 }catch(e){if(request!==narrationRequest)return;talkStatus.textContent=en()?'Audio is unavailable. Read the transcript below.':'音声を再生できませんでした。下の「案内の全文」から読めます。';console.warn('Common Ground audio',e.message);}
 finally{talk.disabled=false;}
}
talk.addEventListener('click',beginNarration);
new MutationObserver(()=>{pauseLabel();talkLabel();journeyLabels();if(selectedClue)showClue(selectedClue);dirty=true;wake();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
let sunlight,lightAngle=0;
let renderer,scene,camera,world,leafGroups=[],layers,edgeMat,paths=[],samples=[],particles,particlePositions,aoigroup,bird,instrument;
let mobile=innerWidth<760, width=1,height=1,guideBlend=0;
let seed=763421;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const mat=(c,r=.9)=>new T.MeshStandardMaterial({color:c,roughness:r});
function taperTube(pts,r0,r1,rad,seg){const curve=new T.CatmullRomCurve3(pts);const g=new T.TubeGeometry(curve,seg,1,rad,false),a=g.attributes.position,n=g.attributes.normal;for(let i=0;i<=seg;i++){const c=curve.getPointAt(i/seg),r=T.MathUtils.lerp(r0,r1,i/seg);for(let j=0;j<=rad;j++){const k=i*(rad+1)+j;a.setXYZ(k,c.x+n.getX(k)*r,c.y+n.getY(k)*r,c.z+n.getZ(k)*r);}}a.needsUpdate=true;g.computeVertexNormals();return g;}
const textureLoader=new T.TextureLoader();
function tex(url,repeat,color=false){const a=textureLoader.load(url,()=>{dirty=true;wake();},undefined,()=>console.warn('Common Ground texture unavailable',url));a.wrapS=a.wrapT=T.RepeatWrapping;a.repeat.set(...repeat);a.anisotropy=4;if(color)a.colorSpace=T.SRGBColorSpace;return a;}
// Subtle unevenness belongs to the ground and every object resting on it.
function groundHeight(x,z){const trail=2.6+Math.sin(z*.1)*2,edge=T.MathUtils.smoothstep(Math.abs(x-trail),1.2,3.8);return -.03+edge*(.018*Math.sin(x*.83+Math.sin(z*.31))+.012*Math.cos(z*1.27+x*.37));}
function sceneBoot(){
 renderer=new T.WebGLRenderer({canvas:stage.querySelector('canvas'),alpha:false,antialias:(devicePixelRatio||1)<1.5,powerPreference:'high-performance'});renderer.debug.checkShaderErrors=false;/* 2026-11-11 軽く：シェーダーの記録を同期で読まない */renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.25));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;/* 2026-11-11 軽く：影は 1 秒に 1 回だけ描き直す */
 scene=new T.Scene();scene.background=new T.Color(0x354b49);scene.fog=new T.Fog(0x354b49,1,100);setFog(.026);camera=new T.PerspectiveCamera(53,1,.1,100);world=new T.Group();scene.add(world);landscape=new T.Group();world.add(landscape);
 ambientLight=new T.HemisphereLight(0xc4d9e2,0x625a43,1.8);scene.add(ambientLight);const sun=new T.DirectionalLight(0xffe7c7,2.4);sunlight=sun;sun.position.set(-8,14,-5);setSightSun(sun.position);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:16,bottom:-12,near:1,far:50});sun.shadow.radius=5;sun.shadow.intensity=.58;sun.shadow.bias=-.0006;sun.shadow.normalBias=.05;scene.add(sun);const fill=new T.DirectionalLight(0xcbd9d5,1.0);fillLight=fill;fill.position.set(4,6,9);scene.add(fill);
 const groundMat=mat(0xb7b2a1);groundMat.map=tex('img/hero/3d/dio/leaves_c.webp',[48,48],true);groundMat.normalMap=tex('img/hero/3d/dio/leaves_n.webp',[48,48]);groundMat.normalScale.set(1.1,1.1);groundMat.roughness=.96;
 const groundGeo=new T.PlaneGeometry(120,120,100,100),gc=[];const gp=groundGeo.attributes.position;
 for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=-gp.getY(i),path=2.6+Math.sin(z*.1)*2,edge=T.MathUtils.smoothstep(Math.abs(x-path),1.2,3.8),noise=.90+.07*Math.sin(x*.51+Math.sin(z*.26))+.03*Math.cos(z*1.17+x*.41);gp.setZ(i,groundHeight(x,z)+.03);const moss=T.MathUtils.smoothstep(Math.sin(x*.23+Math.cos(z*.19)*1.7)*.5+Math.sin(z*.31-x*.07)*.5,-.1,.7)*(.35+.65*edge),litter=T.MathUtils.smoothstep(Math.cos(x*.61-z*.43)+Math.sin(z*.17),.6,1.6);gc.push(((.98-edge*.26)*(1-moss*.50)+litter*.08)*noise,((1.04-edge*.08)*(1+moss*.22)+litter*.03)*noise,((.88-edge*.26)*(1-moss*.28))*noise);}groundGeo.computeVertexNormals();groundGeo.setAttribute('color',new T.Float32BufferAttribute(gc,3));groundMat.vertexColors=true;
 // Insect and sensor: the same ground, received differently in a few separate places (illustrative models).
 groundMat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGW;').replace('#include <project_vertex>','#include <project_vertex>\nvGW=(modelMatrix*vec4(transformed,1.)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vGW;').replace('#include <color_fragment>',`#include <color_fragment>
{ vec2 p_=vGW.xz; float iz_=0.; iz_=max(iz_,1.-smoothstep(.9,2.,length(p_-vec2(-3.4,-.6)))); iz_=max(iz_,1.-smoothstep(.9,2.,length(p_-vec2(1.8,-6.2)))); iz_=max(iz_,1.-smoothstep(1.,2.2,length(p_-vec2(-6.8,-6.6)))); iz_=max(iz_,1.-smoothstep(1.,2.2,length(p_-vec2(5.6,-10.2))));
  float fl_=smoothstep(.35,.75,sin(p_.x*9.1+sin(p_.y*7.3))*sin(p_.y*8.7-p_.x*3.1)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.92,.70,.24),iz_*fl_*.95);
  float sz_=max(1.-smoothstep(1.6,2.8,length(p_-vec2(3.5,-1.5))),max(1.-smoothstep(1.2,2.4,length(p_-vec2(-6.8,-6.6))),1.-smoothstep(1.2,2.4,length(p_-vec2(5.6,-10.2))))); float ln_=smoothstep(.0,.03,abs(fract(p_.x*2.5+p_.y*.8)-.5)-.41); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.33,.86,.74),sz_*ln_*.9); }`);};
 groundMat.customProgramCacheKey=()=>'cg-ground-zones-v4';
 const ground=new T.Mesh(groundGeo,groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.03;ground.receiveShadow=true;landscape.add(ground);
 // The trail has no abrupt diorama edge: textured soil continues into the fog.
 const bark=mat(0xb9ad97);bark.map=tex('img/hero/3d/dio/bark_c.webp',[1.4,1],true);bark.normalMap=tex('img/hero/3d/dio/bark_n.webp',[1.4,1]);bark.normalScale.set(1.15,1.15);sightBark(bark);
 // Keyaki sprig drawn the same way as Qualia/sight (alternate ovate leaves with arched serration), so each card carries many small leaves instead of one.
 const leafMap=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),w=256,h=256,cx=128;
  for(const [ox,rot] of [[-38,-.3],[38,.3],[0,0]]){g.save();g.translate(ox,0);g.translate(cx,h);g.rotate(rot);g.translate(-cx,-h);
   g.strokeStyle='#5b4a36';g.lineWidth=3;g.beginPath();g.moveTo(cx,h);g.lineTo(cx+8,10);g.stroke();
   for(let k=0;k<9;k++){const y=h-(k+.7)*h/9.6,sd=k%2?1:-1,L=(52-k*2.5)*1.45;g.save();g.translate(cx+3,y);g.rotate(sd*(.9-k*.03));const lp=new Path2D();lp.moveTo(0,0);
    for(let i=0;i<=14;i++){const t=i/14;lp.lineTo(-L*t,13*Math.sin(Math.PI*Math.pow(t,.7))+(i%2)*2);}for(let i=14;i>=0;i--){const t=i/14;lp.lineTo(-L*t,-13*Math.sin(Math.PI*Math.pow(t,.7))-(i%2)*2);}
    g.fillStyle=`hsl(${95+k*3},45%,${38+(k%3)*5}%)`;g.fill(lp);g.strokeStyle='rgba(220,240,180,.35)';g.lineWidth=1;g.beginPath();g.moveTo(0,0);g.lineTo(-L,0);g.stroke();g.restore();}
   g.restore();}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;})();const leaves=new T.MeshStandardMaterial({map:leafMap,alphaTest:.45,side:T.DoubleSide,roughness:.78,color:0xd4e0c2,emissive:0x000000});
 // Adapt sight's outward canopy normals locally; shared tree/other applications remain unchanged.
 leaves.onBeforeCompile=sh=>{
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 aCtr; varying vec3 cgCrownNormal;').replace('#include <project_vertex>',`#include <project_vertex>
vec3 cgLeafPosition=(instanceMatrix*vec4(transformed,1.)).xyz;
cgCrownNormal=mat3(viewMatrix)*mat3(modelMatrix)*normalize(cgLeafPosition-aCtr+vec3(0.,.25,0.));`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 cgCrownNormal;').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(mix(normal,normalize(cgCrownNormal),.65));');
 };
 leaves.customProgramCacheKey=()=> 'cg-canopy-normal-v1';sightLeaf(leaves,{crownY:4.2,crownR:3.4,k:.85});
 // Bird: in two crowns the same leaves read with stronger light-and-shade contrast (a model of a different way of receiving, not measured data).
 {const pb=leaves.onBeforeCompile;leaves.onBeforeCompile=function(sh,r){pb.call(this,sh,r);sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
{ float bz_=max(1.-smoothstep(2.2,3.6,length(vStW-vec3(-9.,4.9,-9.))),1.-smoothstep(2.2,3.6,length(vStW-vec3(8.,5.2,-13.))));
  if(bz_>0.){ float l_=dot(diffuseColor.rgb,vec3(.3,.55,.15)); vec3 c_=mix(vec3(.62,.78,.95)*l_*1.6,diffuseColor.rgb,.45); float ck_=step(.5,fract((vStW.x+vStW.y*.7)*2.3)); totalEmissiveRadiance+=bz_*(c_*(.32+.3*ck_)); } }`);};const k1=leaves.customProgramCacheKey;leaves.customProgramCacheKey=()=>k1()+'|cgBird2';}
 const trees=[[-2.0,-3,1,8000],[-9,-9,1.1,2000],[8,-13,1.15,2000],[-6,-21,.9,1600],[11,-28,1.05,1600],[0,-32,.85,1400],[-12,-26,.92,750],[5,-36,.95,650],[-4,-40,1.2,650],[13,-17,.9,700],[-13,-3,.95,900]];
 trees.forEach(([x,z,s,n],idx)=>{
  const tr=growKeyaki({taperTube},rand,0,0,{...(idx?{r:.36+.05*(idx%3),hf:2.4+.35*((idx*7)%4),limbs:4+(idx*5)%4,len:[3.4+.3*(idx%4),4.6+.35*((idx*3)%5)],tilt:.26+.06*((idx*11)%5)}:{r:.43,hf:2.9,limbs:6,len:[4.0,5.2],tilt:.37}),levels:3,forks:2,decay:.62,sprigs:Math.round((mobile?n*.68:n)*(idx?1.35:1)),back:0,det:idx<3});
  const group=new T.Group();group.position.set(x,0,z);group.rotation.y=idx?idx*1.7:0;group.scale.setScalar(s);landscape.add(group);const geo=mergeGeometries(tr.wood);tr.wood.forEach(g=>g.dispose());const trunk=new T.Mesh(geo,bark);trunk.castShadow=true;trunk.receiveShadow=true;group.add(trunk);
  const foliage=sprigMesh(tr.sprigs,leaves,.72,[.84,.92,.67],tr.ctr,rand);foliage.castShadow=idx<2;foliage.receiveShadow=true;group.add(foliage);leafGroups.push({g:foliage,phase:idx});
  if(idx===0){const pos=geo.attributes.position,pts=[];for(let i=0;i<pos.count;i+=19)pts.push(pos.getX(i)+x,pos.getY(i),pos.getZ(i)+z);for(let i=0;i<tr.sprigs.length;i+=5){const p=tr.sprigs[i][0];pts.push(p.x+x,p.y,p.z+z);}samples=pts;}
 });
 // Buttress roots physically join the trunk to the forest floor. Merged mesh keeps one draw call.
 const rootWood=[];
 for(const [tx,tz,scale] of trees.slice(0,5)){for(let k=0;k<7;k++){const a=k/7*Math.PI*2+tx,reach=(1.1+rand()*.9)*scale;const pts=[V(tx,.42*scale,tz),V(tx+Math.cos(a)*.45,.16,tz+Math.sin(a)*.45),V(tx+Math.cos(a)*reach,.025,tz+Math.sin(a)*reach)];const curve=new T.CatmullRomCurve3(pts);const geo=new T.TubeGeometry(curve,9,.12*scale,5,false);const pa=geo.attributes.position;for(let i=0;i<pa.count;i++){const t=Math.floor(i/6)/9,center=curve.getPointAt(Math.min(1,t));pa.setXYZ(i,center.x+(pa.getX(i)-center.x)*(1-t*.88),Math.max(.015,center.y+(pa.getY(i)-center.y)*(1-t*.88)),center.z+(pa.getZ(i)-center.z)*(1-t*.88));}geo.computeVertexNormals();rootWood.push(geo);}}
 const rootMesh=new T.Mesh(mergeGeometries(rootWood),bark);rootWood.forEach(g=>g.dispose());rootMesh.castShadow=true;rootMesh.receiveShadow=true;landscape.add(rootMesh);
 // A sparse middle storey gives the path a near/middle/far depth without importing the whole sight forest.
 const shrubSprigs=[],shrubCenters=[];const shrubStems=new T.InstancedMesh(new T.CylinderGeometry(.018,.045,.65,6),bark,60),shrubDummy=new T.Object3D();
 for(let k=0;k<60;k++){let x=(rand()-.5)*49,z=-7-rand()*36;const pathX=2.6+Math.sin(z*.1)*2;if(Math.abs(x-pathX)<3)x+=x<pathX?-3:3;const h=.85+rand()*1.35,base=groundHeight(x,z),ctr=V(x,base+h*.65,z);shrubDummy.position.set(x,base+.31,z);shrubDummy.rotation.set((rand()-.5)*.15,rand()*6,(rand()-.5)*.15);shrubDummy.scale.setScalar(.7+h*.3);shrubDummy.updateMatrix();shrubStems.setMatrixAt(k,shrubDummy.matrix);
  for(let j=0;j<(mobile?58:82);j++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*(.55+h*.4),y=base+.24+rand()*h*(1-r/(1.7+h));const pos=V(x+Math.cos(a)*r,y,z+Math.sin(a)*r*.78);shrubSprigs.push([pos,V((rand()-.5)*.6,1,(rand()-.5)*.6).normalize(),V(Math.cos(a),.25,Math.sin(a)).normalize(),.65+rand()*.45,.75+rand()*.2]);shrubCenters.push(ctr.x,ctr.y,ctr.z);}
 }
 const shrubLeaves=leaves.clone();shrubLeaves.map=tex('img/common-ground/leaf.webp',[1,1],true);shrubLeaves.onBeforeCompile=leaves.onBeforeCompile;shrubLeaves.customProgramCacheKey=()=>leaves.customProgramCacheKey()+'|shrub';const shrub=sprigMesh(shrubSprigs,shrubLeaves,.82,[.64,.73,.57],V(),rand);shrub.geometry.getAttribute('aCtr').array.set(shrubCenters);shrub.geometry.getAttribute('aCtr').needsUpdate=true;shrub.receiveShadow=true;shrubStems.receiveShadow=true;landscape.add(shrub,shrubStems);
 // Instanced undergrowth: many thin blades, dark roots, lit tips; keep the path open.
 // Curved blades have a continuous taper and a shaded midrib; clusters replace isolated spikes.
 const grassPos=[],grassColors=[];
 for(let blade=0;blade<5;blade++){
  const a=blade*2.4,cs=Math.cos(a),sn=Math.sin(a),h=.20+blade*.038,bend=.05+blade*.017;
  const vertex=(t,side)=>{const w=.014*Math.pow(1-t,.65)*side,x=Math.pow(t,1.7)*bend;
   grassPos.push(x*cs-w*sn,t*h,x*sn+w*cs);grassColors.push(.10+t*.15,.18+t*.16,.055+t*.055);};
  for(let j=0;j<5;j++){let u=j/5,v=(j+1)/5;vertex(u,-1);vertex(v,-1);vertex(u,1);vertex(u,1);vertex(v,-1);vertex(v,1);}
 }
 const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute(grassPos,3));grassGeo.setAttribute('color',new T.Float32BufferAttribute(grassColors,3));grassGeo.computeVertexNormals();
 const grass=new T.InstancedMesh(grassGeo,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1}),mobile?2500:4200),dummy=new T.Object3D();let count=0;const colonies=Array.from({length:34},()=>[(rand()-.5)*37,rand()*45-33,.35+rand()*2.1]);
 for(let i=0;i<grass.count;i++){const cl=colonies[i%colonies.length],a=rand()*Math.PI*2,r=Math.sqrt(-2*Math.log(Math.max(.001,rand())))*cl[2];let x=cl[0]+Math.cos(a)*r,z=cl[1]+Math.sin(a)*r;const pathX=2.6+Math.sin(z*.10)*2;if(Math.abs(x-pathX)<1.4){x+=x<pathX?-2.2:2.2;}dummy.position.set(x,groundHeight(x,z)+.005,z);dummy.rotation.set(0,rand()*Math.PI*2,(rand()-.5)*.35);const k=.16+Math.pow(rand(),1.7)*1.4;dummy.scale.set(k*(.5+rand()*.85),k*(.65+rand()*.65),k*(.5+rand()*.85));dummy.updateMatrix();grass.setMatrixAt(count++,dummy.matrix);}grass.receiveShadow=true;landscape.add(grass);
 const rockGeo=mergeVertices(new T.IcosahedronGeometry(1,2));const rockPos=rockGeo.attributes.position;for(let i=0;i<rockPos.count;i++){const x=rockPos.getX(i),y=rockPos.getY(i),z=rockPos.getZ(i);const f=1+.13*Math.sin(x*6+y*9+z*4);rockPos.setXYZ(i,x*f,y*f,z*f);}rockGeo.computeVertexNormals();const stoneMat=mat(0x858780);stoneMat.normalMap=groundMat.normalMap.clone();stoneMat.normalMap.repeat.set(2.5,2.5);stoneMat.normalScale.set(.25,.25);const rocks=new T.InstancedMesh(rockGeo,stoneMat,18);for(let i=0;i<18;i++){dummy.position.set((rand()-.5)*27,.05,rand()*25-22);dummy.rotation.set(rand(),rand()*6,rand());dummy.scale.set(.08+rand()*.26,.045+rand()*.105,.08+rand()*.23);dummy.updateMatrix();dummy.position.y=groundHeight(dummy.position.x,dummy.position.z)+.045;dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;rocks.receiveShadow=true;landscape.add(rocks);
 // Fern understory: curved fronds and paired pinnae, clustered where the path is not.
 const fp=[],fc=[];const tri=(a,b,c,shade)=>{for(const p of [a,b,c]){fp.push(...p);fc.push(.12*shade,.25*shade,.075*shade);}};
 for(let f=0;f<7;f++){const a=f/7*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a);const pos=(u,v)=>[(u*cs-v*sn),Math.sin(u*2.3)*.42,(u*sn+v*cs)];for(let i=1;i<13;i++){const u=i/13*.78,w=Math.sin(i/13*Math.PI)*.17;for(const side of [-1,1]){const point=(t,edge)=>{const breadth=Math.sin(Math.PI*t)*.019;const p=pos(u+.10*t+edge*breadth,side*w*t);p[1]+=.035*Math.sin(t*Math.PI)-Math.abs(edge)*.012;return p;};for(let j=0;j<5;j++){const t0=j/5,t1=(j+1)/5;tri(point(t0,-1),point(t1,-1),point(t0,0),.78+i*.025);tri(point(t0,0),point(t1,-1),point(t1,0),.78+i*.025);tri(point(t0,0),point(t1,0),point(t0,1),1+i*.022);tri(point(t0,1),point(t1,0),point(t1,1),1+i*.022);}}}}
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(fp,3));fg.setAttribute('color',new T.Float32BufferAttribute(fc,3));fg.computeVertexNormals();const fern=new T.InstancedMesh(fg,new T.MeshStandardMaterial({vertexColors:true,roughness:.73,side:T.DoubleSide}),70);
 for(let i=0;i<70;i++){const a=rand()*Math.PI*2,r=.25+Math.pow(rand(),1.8)*3.5,cent=i<26?[-4.6,-2]:i<39?[-3.6,2.8]:i<48?[6.9,-4.2]:i<63?[-6.7,-7.5]:[7.1,4.3];dummy.position.set(cent[0]+Math.cos(a)*r,.035,cent[1]+Math.sin(a)*r);dummy.rotation.set((rand()-.5)*.48,rand()*6,(rand()-.5)*.55);const fs=.16+Math.pow(rand(),1.7)*.95;dummy.scale.set(fs*(.8+rand()*.4),fs*(.65+rand()*.55),fs*(.75+rand()*.5));dummy.updateMatrix();dummy.position.y=groundHeight(dummy.position.x,dummy.position.z)+.01;dummy.updateMatrix();fern.setMatrixAt(i,dummy.matrix);fern.setColorAt(i,new T.Color().setRGB(.65+rand()*.28,.70+rand()*.25,.54+rand()*.3));}fern.receiveShadow=true;fern.castShadow=true;landscape.add(fern);
 // Ground leaves from the same licensed leaf set, never an opaque green carpet.
 const litter=new T.InstancedMesh(new T.PlaneGeometry(.24,.27),new T.MeshStandardMaterial({map:leafMap,alphaTest:.5,side:T.DoubleSide,color:0x9b773c,roughness:1}),900);
 for(let i=0;i<900;i++){const la=rand()*6.28,lr=Math.pow(rand(),.7)*7.4;dummy.position.set(-2+Math.cos(la)*lr,.015,-3+Math.sin(la)*lr*.8);dummy.rotation.set(-Math.PI/2,0,rand()*6);dummy.scale.setScalar(.35+rand()*.9);dummy.updateMatrix();dummy.position.y=groundHeight(dummy.position.x,dummy.position.z)+.012;dummy.updateMatrix();litter.setMatrixAt(i,dummy.matrix);}landscape.add(litter);litter.receiveShadow=true;
 // Slender instrument anchored to the ground. It is an illustration, not a live sensor.
 instrument=new T.Group();instrument.position.set(3.5,0,-1.5);
 const steel=new T.MeshStandardMaterial({color:0x81928d,roughness:.42,metalness:.68});
 const stem=new T.Mesh(new T.CylinderGeometry(.023,.031,1.4,12),steel);stem.position.y=.7;instrument.add(stem);
 // A ventilated radiation-shield silhouette: a recognisable model, not a source of measured data.
 const shieldParts=[];for(let i=0;i<6;i++){const g=new T.CylinderGeometry(i===5?.135:.12,.14,.025,24);g.translate(0,1.31+i*.045,0);shieldParts.push(g);}
 const shieldGeo=mergeGeometries(shieldParts);shieldParts.forEach(g=>g.dispose());
 const housing=new T.Mesh(shieldGeo,new T.MeshStandardMaterial({color:0xe6e6d8,roughness:.58}));instrument.add(housing);
 const sensorCore=new T.Mesh(new T.CylinderGeometry(.045,.045,.25,12),mat(0x4a5d57,.45));sensorCore.position.y=1.43;instrument.add(sensorCore);
 const base=new T.Mesh(new T.CylinderGeometry(.09,.13,.045,16),steel);base.position.y=.022;instrument.add(base);
 instrument.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});landscape.add(instrument);

 layers=new T.Group();landscape.add(layers);
 const pointsGeo=new T.BufferGeometry();pointsGeo.setAttribute('position',new T.Float32BufferAttribute(samples,3));edgeMat=new T.PointsMaterial({size:.027,color:0xa2e4d5,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});layers.add(new T.Points(pointsGeo,edgeMat));
 const anchors=[V(-1.2,3.3,-2.8),V(1.5,.12,1),V(3.5,1.45,-1.5),V(-2,.15,-3),V(-4,1.1,-1.5)];
 // Paths form a distributed web of contacts, not a hierarchy centered on Aoi.
 [[0,2],[0,4],[1,2],[1,3],[3,4],[2,3]].forEach(([i,j],k)=>{const a=anchors[i],b=anchors[j],mid=a.clone().lerp(b,.5);mid.y+=.65+k*.12;const c=new T.CatmullRomCurve3([a,mid,b]);const m=new T.LineBasicMaterial({color:k%2?0xd7b982:0x95dacd,transparent:true,opacity:0,depthWrite:false});const line=new T.Line(new T.BufferGeometry().setFromPoints(c.getPoints(55)),m);layers.add(line);paths.push({line,c,m,ends:[i,j]});});
 // Nested topographic traces lie on the physical ground and bend around the tree.
 for(let k=0;k<8;k++){let pts=[];for(let i=0;i<=120;i++){const a=i/120*Math.PI*2,r=1.1+k*.46+.16*Math.sin(a*4+k*.5);pts.push(V(-2+Math.cos(a)*r,.025+k*.003,-3+Math.sin(a)*r*.67));}const m=new T.LineBasicMaterial({color:0x86b9b1,transparent:true,opacity:0,depthWrite:false});layers.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),m));paths.push({m});}
 particlePositions=new Float32Array(72*3);particles=new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(particlePositions,3)),new T.PointsMaterial({size:.038,color:0xb4e8dd,transparent:true,opacity:.75,depthWrite:false,blending:T.AdditiveBlending}));layers.add(particles);

 relations=createRelations(landscape,{mobile,groundHeight,samples,groundMaterial:groundMat,renderer,sceneRoot:scene});relations.select(relationMode);
 const seeds=[];for(let i=0;i<140;i++)seeds.push((mobile?4.1:6.2)+(rand()-.5)*2.8,.2+rand()*2.1,3.7+(rand()-.5)*2.0);
 seedField=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(seeds,3)),new T.PointsMaterial({color:0xa7d4cb,size:.025,transparent:true,opacity:.38,depthWrite:false,blending:T.AdditiveBlending}));world.add(seedField);
 const cv=stage.querySelector('canvas');
 cv.addEventListener('webglcontextlost',e=>{e.preventDefault();stage.dataset.ready='false';stage.querySelector('.cg-gl-fallback').hidden=false;stopNarration();active=false;});
 cv.addEventListener('webglcontextrestored',()=>location.reload());
 new ResizeObserver(resize).observe(stage);resize();
 new IntersectionObserver(()=>queueWorldMode(),{threshold:[0,.05,.3]}).observe(figure.closest('.cg-hero'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(audio&&!audio.paused)stopNarration();}else{last=0;dirty=true;wake();}});
 updateEmergence();renderer.render(scene,camera);stage.dataset.ready='true';stage.dataset.readyMs=Math.round(performance.now());
 active=true;loadAoi();queueWorldMode();
 import('./umwelt-shift.js?v=20261113f').then(m=>{window.__us=m.install({T,scene,renderer,camera,sunlight,ambientLight,fillLight,world,host:worldHost,kick:()=>{dirty=true;wake();}});}).catch(e=>console.warn('umwelt shift',e.message));
 // Sky light from a CC0 Poly Haven forest panorama (forest_slope, reduced to 512px), loaded after the first frame.
 new T.TextureLoader().load('img/common-ground/env_forest_slope.jpg',tx=>{tx.mapping=T.EquirectangularReflectionMapping;tx.colorSpace=T.SRGBColorSpace;const pm=new T.PMREMGenerator(renderer);if(!scene.environment){scene.environment=pm.fromEquirectangular(tx).texture;scene.environmentIntensity=.5;ambientLight.intensity*=.8;}pm.dispose();tx.dispose();dirty=true;wake();});queueWorldMode();wake();
}
// Capture the actual shared ground once. Reflections use this fixed probe, not six extra renders per frame.
function makeBirthReflection(){
 const saved={landscape:landscape.visible,aoi:aoigroup.visible,seeds:seedField.visible,layers:layers.visible,background:scene.background.clone(),density:fogD,fog:scene.fog.color.clone(),ambient:ambientLight.intensity,fill:fillLight.intensity,sun:sunlight.intensity};
 const target=new T.WebGLCubeRenderTarget(mobile?64:128,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
 const probe=new T.CubeCamera(.05,65,target);probe.position.copy(aoigroup.position).add(V(0,1.1,0));scene.add(probe);
 // Broad studio reflections make the mirror facets readable before the forest appears.
 // These light cards exist only during the one-time reflection capture.
 const cards=new T.Group(),cardGeometry=new T.PlaneGeometry(1,1),cardMaterial=new T.MeshBasicMaterial({color:new T.Color(3.2,3.4,3.3),side:T.DoubleSide,toneMapped:false});
 for(const [x,y,z,w,h] of [[-3,3,2,2,5],[3,2,-1,1.2,4],[0,5,-2,4,2]]){const card=new T.Mesh(cardGeometry,cardMaterial);card.position.copy(probe.position).add(V(x,y,z));card.scale.set(w,h,1);card.lookAt(probe.position);cards.add(card);}scene.add(cards);
 try{landscape.visible=true;aoigroup.visible=false;seedField.visible=false;layers.visible=false;scene.background.set(0x354b49);scene.fog.color.set(0x75847a);setFog(.026);ambientLight.intensity=2.1;fillLight.intensity=1.15;sunlight.intensity=1.6;
  probe.update(renderer,scene);const pmrem=new T.PMREMGenerator(renderer),filtered=pmrem.fromCubemap(target.texture);pmrem.dispose();world.userData.birthEnvironment=filtered;stage.dataset.reflection='shared-ground-once';return filtered.texture;
 }finally{cards.removeFromParent();cardGeometry.dispose();cardMaterial.dispose();probe.removeFromParent();target.dispose();landscape.visible=saved.landscape;aoigroup.visible=saved.aoi;seedField.visible=saved.seeds;layers.visible=saved.layers;scene.background.copy(saved.background);scene.fog.color.copy(saved.fog);setFog(saved.density);ambientLight.intensity=saved.ambient;fillLight.intensity=saved.fill;sunlight.intensity=saved.sun;}
}
async function loadAoi(){
 try{
 const [{GLTFLoader},{MeshoptDecoder},VRM,{AoiMotion}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js'),import('@pixiv/three-vrm'),import('./aoi_motion.js?v=20261026-v61')]);
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);loader.register(p=>new VRM.VRMLoaderPlugin(p));
 const buf=await(window.__aoiBuf||(window.__aoiBuf=fetch('img/hero/aoi.vrm').then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();})));
 const gltf=await loader.parseAsync(buf.slice(0),'');vrm=gltf.userData.vrm;VRM.VRMUtils.rotateVRM0(vrm);vrm.humanoid.resetNormalizedPose();vrm.update(0);
 aoigroup=new T.Group();aoigroup.add(vrm.scene);aoigroup.position.set(mobile?2.4:6.2,0,mobile?3.0:3.7);const bb=new T.Box3().setFromObject(vrm.scene);aoigroup.scale.setScalar(1.6/(bb.max.y-bb.min.y));world.add(aoigroup);
 vrm.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=false;}});
 // The robe adds bones and rewrites skin attributes. GLTF primitives may share those
 // arrays while retaining different skeleton palettes; isolate each mesh beforehand.
 const isolatedGeometry=new Map();vrm.scene.traverse(o=>{if(!o.isSkinnedMesh)return;const source=o.geometry;if(!isolatedGeometry.has(source))isolatedGeometry.set(source,source.clone());o.geometry=isolatedGeometry.get(source);});
 motion=new AoiMotion(vrm,{root:aoigroup,reducedMotion:paused,wind:.12,faceViewer:true,startCalm:1,posture:'upright',uprightWeight:1,quality:mobile?'mid':'high'});vrm.scene.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;o.geometry.computeBoundingSphere();o.boundingSphere=o.geometry.boundingSphere.clone();}});// Keep the authored VRoid identity while letting local light shape cloth and hair.
 const treated=new Set();vrm.scene.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material)){
  if(!m||treated.has(m))continue;treated.add(m);
  if(m.matcapFactor)m.matcapFactor.multiplyScalar(/SKIN/.test(m.name)?.10:.025);
  if(m.parametricRimColorFactor)m.parametricRimColorFactor.multiplyScalar(.15);
  if(m.emissive)m.emissive.multiplyScalar(.2);
  if(m.shadingToonyFactor!=null)m.shadingToonyFactor=Math.min(m.shadingToonyFactor,.25);
  if(m.giEqualizationFactor!=null)m.giEqualizationFactor=Math.min(m.giEqualizationFactor,.3);
  m.needsUpdate=true;
 }});
 // Cloth keeps the authored colour map, but uses the same physical lighting as the place.
 const clothMaterials=new Map();vrm.scene.traverse(o=>{if(!o.isMesh)return;
  const convert=m=>{if(!m||!/CLOTH/.test(m.name)||m.isOutline)return m;
   if(clothMaterials.has(m))return clothMaterials.get(m);
   const n=new T.MeshPhysicalMaterial({name:m.name+' / common-ground cloth',map:m.map,color:m.color?.clone()||0xffffff,normalMap:m.normalMap||null,roughness:.94,metalness:0,sheen:.3,sheenRoughness:.85,sheenColor:new T.Color(0xb8c8c0),side:m.side,alphaTest:m.alphaTest,transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite});
   clothMaterials.set(m,n);return n;};
  o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
 });
 motion.faceTo(null);motion.update(.016,camera,{vrmUpdate:false});vrm.update(.016);motion.afterVrmUpdate(.016);
 
 // Ordered emergence keeps the original opaque/alpha-cut materials and their depth order.
 // One uniform changes coverage; the automatic transition does not recompile shaders.
 const fading=new Set();vrm.scene.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material)){
  if(!m||fading.has(m))continue;fading.add(m);const previous=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);
  m.onBeforeCompile=function(shader,r){previous.call(this,shader,r);shader.uniforms.cgBodyPresence=bodyPresence;
   shader.vertexShader='varying float cgBodyY;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ncgBodyY=(modelMatrix*vec4(transformed,1.0)).y;');
   shader.fragmentShader='uniform float cgBodyPresence; varying float cgBodyY;\n'+shader.fragmentShader.replace(/void main\s*\(\s*\)\s*\{/,`void main() {
if(cgBodyPresence<1.0 && cgBodyY>mix(-.05,1.85,cgBodyPresence)) discard;`);
  };
  m.customProgramCacheKey=()=>cache()+'|cg-body-emergence-v2';m.needsUpdate=true;
 }});
 // Prepare the body and forest before starting the arrival. A tiny viewport warms
 // the same on-screen programs, including shadows, without exposing a flash-forward.
 warming=true;vrm.scene.visible=true;landscape.visible=true;bodyPresence.value=1;
 await renderer.compileAsync(scene,camera);
 vrm.scene.visible=true;landscape.visible=true;
 await new Promise(r=>{const c=()=>performance.now()-scrollT>400?(window.requestIdleCallback?requestIdleCallback(()=>r(),{timeout:300}):r()):setTimeout(c,150);c();});/* 2026-11-11 重い組み立てはスクロールが止まっている間に */
 {const hid=[];scene.traverse(o=>{if(!o.visible){hid.push(o);o.visible=true;}});try{renderer.compile(scene,camera);renderer.shadowMap.needsUpdate=true;renderer.setViewport(0,0,1,1);renderer.render(scene,camera);renderer.shadowMap.needsUpdate=true;}catch(e){}hid.forEach(o=>o.visible=false);}/* 2026-11-11 隠れた物も先に組み立てる（スクロール中に組み立てない） */
 renderer.setViewport(0,0,1,1);renderer.render(scene,camera);renderer.setViewport(0,0,width,height);
 warming=false;
 updateEmergence();renderer.render(scene,camera);stage.dataset.aoiMs=Math.round(performance.now());talkStatus.textContent='';dirty=true;wake();loadBird();prepareNarration();
 }catch(e){warming=false;if(renderer)renderer.setViewport(0,0,width,height);console.error('Common Ground Aoi',e);talkStatus.textContent=en()?'Aoi could not load. The transcript remains available.':'碧を読み込めませんでした。案内の全文は下から読めます。';}
}
function resize(){if(!renderer)return;width=detachedCanvas?worldHost.clientWidth:stage.clientWidth;height=detachedCanvas?worldHost.clientHeight:stage.clientHeight;if(!width||!height)return;mobile=width<760;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=mobile?54:49;camera.updateProjectionMatrix();positionCamera();dirty=true;wake();}
function positionCamera(){if(!camera)return;const p=mobile?V(5.9,2.1,10.4):V(6.3,2.9,11.2),look=V(mobile?1.0:.2,mobile?.15:1.5,mobile?-.3:-2.0);p.applyAxisAngle(V(0,1,0),yaw);p.lerp(mobile?V(4.2,1.5,8.7):V(6.7,1.65,8.5),guideBlend);look.lerp(mobile?V(3.4,.7,4.7):V(3.8,1.3,4.7),guideBlend);if(journey<.96){const born=1-T.MathUtils.smoothstep(journey,.64,.96);p.lerp(mobile?V(3.7,1.25,8.3):V(5.8,1.25,8.6),born);look.lerp(mobile?V(3.4,.87,4.7):V(5.3,.87,4.7),born);}if(viewClue&&clueBlend>0){const views={branch:[V(-.65,2.85,-2.35),V(2,3.1,-8)],shade:[V(.8,1.18,1.4),V(-2,2,-3)],sensor:[V(3.5,1.43,-1.35),V(-1,.5,-3)]};const v=views[viewClue];p.lerp(v[0],clueBlend);look.lerp(v[1],clueBlend);}if(!dialogue&&!viewClue){const mode=MODES.find(m=>m.id===relationMode);if(mode){const eye=V(...mode.eye),target=V(...mode.look);if(mobile){if(mode.id==='forest'){eye.set(5.7,2.4,10.5);target.set(.3,.9,-1.3);}else{eye.sub(target).multiplyScalar(1.18).add(target);eye.y+=.3;}}p.copy(eye);look.copy(target);}}if(!camera.userData.look){camera.userData.look=look.clone();camera.position.copy(p);}const damping=paused?1:.035;camera.position.lerp(p,damping);camera.userData.look.lerp(look,damping);camera.lookAt(camera.userData.look);}
function wake(){if(!raf&&renderer&&active&&!document.hidden)raf=requestAnimationFrame(loop);}
let layerAlpha=0,frames=0,frameTimes=[];
/* 2026-11-11 軽く：スクロール中は背景の 3D を描かない（止めた絵のまま）。止まって 180ms で再開 */let scrollT=0;addEventListener('scroll',()=>{scrollT=performance.now();},{passive:true});let shadowT=0;
function loop(now){raf=0;if(!active||document.hidden||warming)return;if(performance.now()-scrollT<400&&!dialogue){raf=requestAnimationFrame(loop);return;}if(now-shadowT>4000){shadowT=now;renderer.shadowMap.needsUpdate=true;}if(!dirty&&(paused||detachedCanvas)&&!dialogue&&!journeyPlaying)return;if(last&&now-last<(dialogue?32:60)){wake();return;}const dt=Math.min(.05,last?(now-last)/1000:.016);if(last)frameTimes.push(now-last);if(frameTimes.length>120)frameTimes.shift();last=now;if(!paused)t+=dt;
 if(birth&&journeyPlaying&&!detachedCanvas){journey=Math.min(1,journey+dt/24);if(journey>=1)journeyPlaying=false;journeyLabels();}
 if(autoImmersion&&vrm&&!paused&&!detachedCanvas&&!dialogue){immersionTime+=dt;const key=MODES[Math.min(MODES.length-1,Math.floor(immersionTime/12))].id;if(key!==relationMode)selectMode(key,{automatic:true});if(immersionTime>MODES.length*12)tourState(false);}
 relations?.update(dt,t,paused);
 if(!paused)driftLight();
 updateEmergence();
 const goal=layerKeys.size?.65:0;layerAlpha=(paused||detachedCanvas)?goal:T.MathUtils.lerp(layerAlpha,goal,Math.min(1,dt*3));edgeMat.opacity=layerKeys.has('sensor')?layerAlpha*.3:0;paths.forEach(p=>{if(p.ribbon)p.m.uniforms.alpha.value=0;else if(p.ends){const active=[...layerKeys].some(k=>p.ends.includes({branch:0,shade:1,sensor:2}[k]));const focused=selectedClue&&p.ends.includes({branch:0,shade:1,sensor:2}[selectedClue]);p.m.opacity=active?layerAlpha*(focused?.62:.27):0;}else p.m.opacity=0;});particles.visible=false;particles.material.opacity=layerAlpha*.8;
 if(particles.visible)paths.filter(p=>p.c).forEach((p,k)=>{for(let i=0;i<12;i++){const v=p.c.getPoint(((i/12+t*.045+k*.12)%1));particlePositions.set([v.x,v.y,v.z],(k*12+i)*3);}});particles.geometry.attributes.position.needsUpdate=true;
 if(aoigroup)aoigroup.position.x=mobile?2.4:6.2;if(bird){bird.object.visible=selectedClue!=='branch';if(!paused)bird.update(dt);}if(!paused)leafGroups.forEach(o=>o.g.rotation.z=Math.sin(t*.27+o.phase)*.003);
 if(dialogue&&audio){const idx=cues.findIndex(c=>audio.currentTime>=c.s&&audio.currentTime<c.e);if(idx!==cueIndex){cueIndex=idx;subtitle.textContent=idx>=0?cues[idx].text:'';if(idx>=0&&motion&&!paused){motion.speak({text:cues[idx].text,kana:cues[idx].text,dur:cues[idx].e-cues[idx].s,clock:()=>audio.currentTime-cues[idx].s,gesture:[{t:.4,type:idx%3?'metaphoric':'deictic',shape:'present',target:V(-2,2,-3)}]});}}const n=audio.currentTime<11?0:audio.currentTime<23?1:audio.currentTime<42?2:3;if(n!==liveCue){liveCue=n;choose(n);}}
 if(motion&&!paused&&journey>.83){motion.update(dt,camera,{vrmUpdate:false});vrm.update(dt);motion.afterVrmUpdate(dt);}
 clueBlend=0;viewClue=null;
 guideBlend=(paused||detachedCanvas)?(dialogue?1:0):T.MathUtils.lerp(guideBlend,dialogue?1:0,Math.min(1,dt*2));positionCamera();renderer.render(scene,camera);
 const anchors={branch:V(-.8,3.0,-2.5),shade:V(-1,.3,1),sensor:V(3.5,1.6,-1.5)};
 const stageTop=stage.getBoundingClientRect().top;const controlTop=Math.min(height-110,ui.querySelector('.cg-scene-controls').getBoundingClientRect().top-stageTop,ui.querySelector('.cg-journey').getBoundingClientRect().top-stageTop-12);
 const labelBoxes=[];
 ui.querySelectorAll('[data-anchor]').forEach(el=>{
  const p=anchors[el.dataset.anchor].clone().project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height,anchor=el.dataset.anchor;
  let ax=mobile?(anchor==='sensor'?width-el.offsetWidth-16:16):Math.max(16,Math.min(width-el.offsetWidth-16,x));
  const maxY=Math.max(80,controlTop-el.offsetHeight-16);
  let ay=mobile?Math.min(maxY,height*({branch:.34,shade:.48,sensor:.40}[anchor])):Math.min(maxY,Math.max(height*.30,y));
  for(const r of labelBoxes){if(ax<r.right+8&&ax+el.offsetWidth>r.left-8&&ay<r.bottom+8&&ay+el.offsetHeight>r.top-8)ay=Math.max(70,r.top-el.offsetHeight-10);}
  labelBoxes.push({left:ax,right:ax+el.offsetWidth,top:ay,bottom:ay+el.offsetHeight});
  el.style.transform=`translate(${ax}px,${ay}px)`;const show=!detachedCanvas&&journey>.92&&(step===1||step===2);el.style.opacity=show?'1':'0';el.style.pointerEvents=show?'auto':'none';el.tabIndex=show?0:-1;
 });
 frames++;dirty=false;stage.dataset.frames=frames;if(window.__us?.animating){dirty=true;wake();}
 if((!paused&&!detachedCanvas)||dialogue||journeyPlaying&&!detachedCanvas)wake();
}
window.__commonGround={choose,selectMode,modes:MODES,setAuto(value){if(value&&paused&&!mq.matches){paused=false;pauseLabel();}tourState(!!value&&!paused);immersionTime=0;dirty=true;wake();},get stats(){return {relations:relations?.stats,relationMode,layers:[...layerKeys],immersionTime,autoImmersion,step,selectedClue,clueBlend,lightAngle,journey,journeyPlaying,detachedCanvas,birth:birth?.stats,instrument:camera?(()=>{const p=V(3.5,1.43,-1.5).project(camera);return {x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height,inFrustum:Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1};})():null,frames,ready:stage.dataset.ready,aoi:!!vrm,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,medianFrameMs:frameTimes.slice().sort((a,b)=>a-b)[Math.floor(frameTimes.length/2)],paused,active};},capture:()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},render:()=>{dirty=true;wake();}};
requestAnimationFrame(()=>tourState(autoImmersion));
let booted=false;const deepStart=!!location.hash&&location.hash!=='#top';const bootObserver=new IntersectionObserver(es=>{if(deepStart&&document.readyState==='loading')return;if(es[0].isIntersecting&&!booted){booted=true;try{sceneBoot();choose(2);}catch(e){console.error('Common Ground scene',e);stage.querySelector('.cg-gl-fallback').hidden=false;stage.dataset.ready='false';}}},{rootMargin:'100px'});bootObserver.observe(stage);if(deepStart)document.addEventListener('DOMContentLoaded',()=>{bootObserver.unobserve(stage);bootObserver.observe(stage);},{once:true});
const full=ui.querySelector('.cg-fullscreen'),hero=figure.closest('.cg-hero');
let expanded=false,priorOverflow='';
function expand(on){expanded=on;hero.classList.toggle('cg-expanded',on);if(on){hero.setAttribute('role','dialog');hero.setAttribute('aria-modal','true');hero.setAttribute('aria-label',en()?'Common Ground 3D':'コモングラウンドの3D');}else{hero.removeAttribute('role');hero.removeAttribute('aria-modal');hero.removeAttribute('aria-label');}full.setAttribute('aria-pressed',String(on));full.textContent=en()?(on?'Return to page ↙':'Expand scene ↗'):(on?'ページに戻る ↙':'風景を広げる ↗');if(on){priorOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}else document.body.style.overflow=priorOverflow;resize();}
ui.querySelector('.cg-scroll-cue')?.addEventListener('click',()=>{if(expanded)expand(false);setTimeout(()=>document.getElementById('cgTools').focus({preventScroll:true}),50);});
document.getElementById('cgJourneyExit').addEventListener('click',()=>{expand(false);full.focus();});full.addEventListener('click',()=>{expand(!expanded);if(expanded)requestAnimationFrame(()=>journeyEnter.focus());});addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded){expand(false);full.focus();}});
new MutationObserver(()=>hero.classList.toggle('is-speaking',figure.classList.contains('is-talking'))).observe(figure,{attributes:true,attributeFilter:['class']});

async function loadBird(){try{const {loadSight}=await import('./kit/sight/sightModels.js');bird=await loadSight('hiyo',{shadow:false,autoplay:false});bird.play('perch',0);bird.object.position.set(-.8,2.7,-2.5);bird.object.rotation.y=.6;landscape.add(bird.object);const branch=new T.Mesh(taperTube([V(-2,1.8,-3),V(-1.4,2.4,-2.6),V(-.65,2.7,-2.5)],.12,.04,8,8),mat(0x635b43));landscape.add(branch);dirty=true;wake();}catch(e){console.warn('Common Ground bird',e.message);}}

const clueTexts={
 shade:{ja:'光と木陰。枝葉の位置と光の向きが、地面の明暗につながります。光を動かして関係を確かめる模型です。温度の実測ではありません。',en:'Light and shade: the canopy and light direction shape ground illumination. Move the light to explore the model, not measured temperatures.'},
 branch:{ja:'枝と生きもの。木の形の上に、鳥が枝にとまる場面を重ねます。木陰の情報も残し、同じ枝葉が結ぶ異なる関係をたどります。鳥の行動記録ではなく模式です。',en:'Structure and life: a bird-perching illustration joins the same canopy while the shade relation remains. This is a model, not a recorded observation.'},
 sensor:{ja:'観測と解釈。計測器の位置、木の形、木陰をつなぎます。取得する場所が、記録をどう読むかに関わります。点群は模型の形状から計算したもので、現地の測量や温度データではありません。',en:'Sensing and interpretation: connect instrument placement, tree geometry and shade. Points are computed from model geometry, not site scans or measured temperatures.'}
};
function showClue(key){enterPlace();choose(1);selectedClue=key;layerKeys.add(key);figure.closest('.cg-hero').classList.add('is-observing');ui.querySelectorAll('[data-cg-caption]').forEach(p=>p.hidden=true);const p=ui.querySelector('.cg-clue-copy');p.hidden=false;p.textContent=clueTexts[key][en()?'en':'ja'];journeyPhase.textContent=({shade:en()?'Light and shade':'光と木陰の関係',branch:en()?'Structure and living things':'枝と生きものの関係',sensor:en()?'Sensing and interpretation':'観測と解釈の関係'})[key];ui.querySelectorAll('[data-anchor]').forEach(b=>b.setAttribute('aria-pressed',String(layerKeys.has(b.dataset.anchor))));dirty=true;wake();}
ui.querySelectorAll('[data-anchor]').forEach(b=>b.addEventListener('click',()=>{autoImmersion=false;stopNarration();showClue(b.dataset.anchor);}));
// CSS full-screen also works on iOS. Keep keyboard focus within the scene until Escape.
addEventListener('keydown',e=>{if(!expanded||e.key!=='Tab')return;const controls=[...hero.querySelectorAll('button,a[href],summary,input,select,textarea')].filter(el=>el.getClientRects().length&&el.tabIndex>=0&&getComputedStyle(el).opacity!=='0');const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});

// Light drifts slowly on its own (no slider): a gentle sweep of the sun around the clearing.
let fogD=.026;function setFog(d){fogD=d;scene.fog.near=.1/d;scene.fog.far=1.05/d;}
const SUN_BASE=V(-8,14,-5),SUN_AXIS=V(0,1,0),sunWarm=new T.Color(0xffdcb0),sunCool=new T.Color(0xfff0d8);
function driftLight(){if(!sunlight)return;lightAngle=Math.round(Math.sin(t*.035)*28*10)/10;sunlight.position.copy(SUN_BASE).applyAxisAngle(SUN_AXIS,T.MathUtils.degToRad(lightAngle));setSightSun(sunlight.position);sunlight.color.copy(sunCool).lerp(sunWarm,(Math.sin(t*.035)+1)*.5*.6);}

function updateEmergence(){
 if(!scene)return;const k=T.MathUtils.smoothstep(journey,.56,.90);
 landscape.visible=journey>.55;scene.background.copy(new T.Color(0x03060f)).lerp(new T.Color(0x354b49),k);
 scene.fog.color.set(0x87988b);setFog(T.MathUtils.lerp(.18,.017,k));
 ambientLight.intensity=.4+.85*k;fillLight.intensity=.25+.40*k;sunlight.intensity=.5+2.15*k;
 bodyPresence.value=T.MathUtils.smoothstep(journey,.61,.83);
 if(vrm)vrm.scene.visible=bodyPresence.value>.001;
 if(birth)birth.update(journey,paused?0:t);
 if(seedField){seedField.visible=journey<.25;seedField.material.opacity=(.38+(paused?0:Math.sin(t*.7)*.06))*(1-T.MathUtils.smoothstep(journey,.05,.25));}
 figure.dataset.phase=journey<.2?'trace':journey<.6?'form':journey<.88?'body':'ground';
}
let worldModeQueued=false;
function queueWorldMode(){if(worldModeQueued)return;worldModeQueued=true;requestAnimationFrame(()=>{worldModeQueued=false;updateWorldMode();});}
function updateWorldMode(){
 if(!renderer)return;const hero=figure.closest('.cg-hero'),top=document.getElementById('top');
 const rect=hero.getBoundingClientRect(),beyond=!top.classList.contains('active')||rect.bottom<160||ui.getBoundingClientRect().height<8;/* 2026-11-12 場面を隠している間は、TOP のはじめから背景に出す */
 if(beyond!==detachedCanvas){detachedCanvas=beyond;document.body.classList.toggle('cg-beyond',beyond);
  if(beyond){stopNarration();enterPlace();worldHost.append(renderer.domElement);}
  else stage.insertBefore(renderer.domElement,stage.querySelector('[data-anchor]'));
  resize();
 }
 active=true;dirty=true;wake();
}
addEventListener('scroll',queueWorldMode,{passive:true});addEventListener('resize',queueWorldMode);
new MutationObserver(queueWorldMode).observe(document.getElementById('main'),{attributes:true,attributeFilter:['class'],subtree:true});
