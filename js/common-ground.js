/* mitsulab Common Ground / 2026-11-06. Physical place and situated translations.
   Deterministic procedural scenery; no simulated measurements are presented as observations. */
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {growKeyaki,sprigMesh} from './common-ground-tree.js';
const stage=document.getElementById('cgStage'), figure=document.getElementById('cgScene');
const en=()=>document.documentElement.dataset.lang==='en';
const mq=matchMedia('(prefers-reduced-motion: reduce)');
let selectedClue=null;
let paused=mq.matches, step=0, dirty=true, active=false, raf=0, last=0, t=0, yaw=0, dialogue=false, audio=null, cues=[], cueIndex=-1, motion=null, vrm=null;
const choose=(n)=>{selectedClue=null;figure.querySelectorAll('[data-anchor]').forEach(b=>b.setAttribute('aria-pressed','false'));const clue=figure.querySelector('.cg-clue-copy');if(clue)clue.hidden=true;step=n;figure.dataset.step=n;figure.querySelectorAll('[data-cg-step]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.cgStep===n)));figure.querySelectorAll('[data-cg-caption]').forEach(p=>p.hidden=+p.dataset.cgCaption!==n);dirty=true;wake();};
figure.querySelectorAll('[data-cg-step]').forEach(b=>b.addEventListener('click',()=>choose(+b.dataset.cgStep)));
const pause=figure.querySelector('.cg-motion');
function pauseLabel(){pause.setAttribute('aria-pressed',String(paused));pause.textContent=en()?(paused?'Resume motion':'Pause motion'):(paused?'動きを再開':'動きを止める');}
pause.addEventListener('click',()=>{paused=!paused;if(paused)stopNarration();pauseLabel();dirty=true;wake();});
mq.addEventListener('change',()=>{paused=mq.matches;pauseLabel();dirty=true;wake();});pauseLabel();
const talk=figure.querySelector('.cg-talk'), subtitle=figure.querySelector('.cg-subtitle'), talkStatus=figure.querySelector('.cg-talk-status');
function talkLabel(){talk.textContent=en()?(dialogue?'Stop Aoi’s guide':'Meet Aoi · Japanese audio'):(dialogue?'碧の案内を止める':'碧に会う・声で案内');talk.setAttribute('aria-pressed',String(dialogue));}
function stopNarration(){dialogue=false;if(audio){audio.pause();audio.currentTime=0;}motion?.stopSpeaking();subtitle.hidden=true;figure.classList.remove('is-talking');talkLabel();dirty=true;}
let liveCue=-1,cuePromise=null;
function prepareNarration(){
 if(audio)return;
 audio=new Audio('img/common-ground/narration.m4a');audio.preload='auto';audio.addEventListener('ended',stopNarration);audio.addEventListener('error',()=>{stopNarration();talkStatus.textContent=en()?'Audio could not load. Read the transcript below.':'音声を読み込めませんでした。下の「案内の全文」から読めます。';});
 cuePromise=fetch('img/common-ground/narration.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();});cuePromise.catch(()=>{});audio.load();
}
async function beginNarration(){
 if(dialogue){stopNarration();return;}
 if(!vrm){talkStatus.textContent=en()?'Aoi is loading. You can explore the scene.':'碧を読み込んでいます。先に風景を操作できます。';return;}
 talk.disabled=true;talkStatus.textContent='';
 try{
  prepareNarration();cues=await cuePromise;
  await audio.play();dialogue=true;liveCue=-1;cueIndex=-1;subtitle.hidden=false;figure.classList.add('is-talking');talkLabel();dirty=true;wake();
 }catch(e){talkStatus.textContent=en()?'Audio is unavailable. Read the transcript below.':'音声を再生できませんでした。下の「案内の全文」から読めます。';console.warn('Common Ground audio',e.message);}
 finally{talk.disabled=false;}
}
talk.addEventListener('click',beginNarration);
new MutationObserver(()=>{pauseLabel();talkLabel();if(selectedClue)showClue(selectedClue);dirty=true;wake();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
let renderer,scene,camera,world,leafGroups=[],layers,edgeMat,paths=[],samples=[],particles,particlePositions,aoigroup,bird;
let mobile=innerWidth<760, width=1,height=1,guideBlend=0;
let seed=763421;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const mat=(c,r=.9)=>new T.MeshStandardMaterial({color:c,roughness:r});
function taperTube(pts,r0,r1,rad,seg){const curve=new T.CatmullRomCurve3(pts);const g=new T.TubeGeometry(curve,seg,1,rad,false),a=g.attributes.position,n=g.attributes.normal;for(let i=0;i<=seg;i++){const c=curve.getPointAt(i/seg),r=T.MathUtils.lerp(r0,r1,i/seg);for(let j=0;j<=rad;j++){const k=i*(rad+1)+j;a.setXYZ(k,c.x+n.getX(k)*r,c.y+n.getY(k)*r,c.z+n.getZ(k)*r);}}a.needsUpdate=true;g.computeVertexNormals();return g;}
const textureLoader=new T.TextureLoader();
function tex(url,repeat,color=false){const a=textureLoader.load(url,()=>{dirty=true;wake();},undefined,()=>console.warn('Common Ground texture unavailable',url));a.wrapS=a.wrapT=T.RepeatWrapping;a.repeat.set(...repeat);a.anisotropy=4;if(color)a.colorSpace=T.SRGBColorSpace;return a;}
function sceneBoot(){
 renderer=new T.WebGLRenderer({canvas:stage.querySelector('canvas'),alpha:false,antialias:true,powerPreference:'high-performance'});renderer.debug.checkShaderErrors=true;renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 scene=new T.Scene();scene.background=new T.Color(0x162b30);scene.fog=new T.FogExp2(0x162b30,.033);camera=new T.PerspectiveCamera(53,1,.1,100);world=new T.Group();scene.add(world);
 scene.add(new T.HemisphereLight(0xb6c9d4,0x554e37,2.1));const sun=new T.DirectionalLight(0xffe0b5,2.7);sun.position.set(-8,14,-5);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:16,bottom:-12,near:1,far:50});sun.shadow.radius=3;sun.shadow.bias=-.0006;sun.shadow.normalBias=.05;scene.add(sun);const fill=new T.DirectionalLight(0xe6ddd0,1.6);fill.position.set(4,6,9);scene.add(fill);
 const groundMat=mat(0x9a9383);groundMat.map=tex('img/hero/3d/dio/soil_c.webp',[70,70],true);groundMat.normalMap=tex('img/hero/3d/dio/soil_n.webp',[70,70]);groundMat.normalScale.set(.55,.55);
 const groundGeo=new T.PlaneGeometry(120,120,100,100),gc=[];const gp=groundGeo.attributes.position;
 for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=-gp.getY(i),path=2.6+Math.sin(z*.1)*2,edge=T.MathUtils.smoothstep(Math.abs(x-path),1.2,3.8),noise=.83+.17*Math.sin(x*1.8+z*.7)*Math.cos(z*1.4);gc.push((1-edge*.33)*noise,(.93-edge*.09)*noise,(.75-edge*.29)*noise);}groundGeo.setAttribute('color',new T.Float32BufferAttribute(gc,3));groundMat.vertexColors=true;
 const ground=new T.Mesh(groundGeo,groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.03;ground.receiveShadow=true;world.add(ground);
 // The trail has no abrupt diorama edge: textured soil continues into the fog.
 const bark=mat(0xa99b80);bark.map=tex('img/hero/3d/dio/bark_c.webp',[1.4,1],true);bark.normalMap=tex('img/hero/3d/dio/bark_n.webp',[1.4,1]);bark.normalScale.set(.7,.7);
 const leafMap=tex('img/common-ground/leaf.webp',[1,1],true);const leaves=new T.MeshStandardMaterial({map:leafMap,alphaTest:.45,side:T.DoubleSide,roughness:.92,color:0xc5cb9e});
 const trees=[[-2.0,-3,1,8000],[-9,-9,1.1,2000],[8,-13,1.15,2000],[-6,-21,.9,1600],[11,-28,1.05,1600],[0,-32,.85,1400]];
 trees.forEach(([x,z,s,n],idx)=>{
  const tr=growKeyaki({taperTube},rand,0,0,{r:.43,hf:2.9,limbs:6,len:[4.0,5.2],tilt:.37,levels:3,forks:2,decay:.62,sprigs:mobile?Math.round(n*.68):n,back:0,det:idx<3});
  const group=new T.Group();group.position.set(x,0,z);group.scale.setScalar(s);world.add(group);const geo=mergeGeometries(tr.wood);tr.wood.forEach(g=>g.dispose());const trunk=new T.Mesh(geo,bark);trunk.castShadow=true;trunk.receiveShadow=true;group.add(trunk);
  const foliage=sprigMesh(tr.sprigs,leaves,.72,[.74,.80,.48],tr.ctr,rand);foliage.castShadow=false;foliage.receiveShadow=false;group.add(foliage);leafGroups.push({g:foliage,phase:idx});
  if(idx===0){const pos=geo.attributes.position,pts=[];for(let i=0;i<pos.count;i+=19)pts.push(pos.getX(i)+x,pos.getY(i),pos.getZ(i)+z);for(let i=0;i<tr.sprigs.length;i+=5){const p=tr.sprigs[i][0];pts.push(p.x+x,p.y,p.z+z);}samples=pts;}
 });
 // Instanced undergrowth: many thin blades, dark roots, lit tips; keep the path open.
 const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute([-.025,0,0,.025,0,0,.013,.24,.025, -.025,0,0,.013,.24,.025,-.015,.23,.025, -.015,.23,.025,.013,.24,.025,.04,.45,.08],3));grassGeo.computeVertexNormals();const colors=[];for(let i=0;i<9;i++)colors.push(i%3===2?.39:.15,i%3===2?.48:.23,i%3===2?.22:.11);grassGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const grass=new T.InstancedMesh(grassGeo,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1}),mobile?3500:6500),dummy=new T.Object3D();let count=0;
 for(let i=0;i<grass.count;i++){let x=(rand()-.5)*42,z=rand()*48-36;const pathX=2.6+Math.sin(z*.10)*2;if(Math.abs(x-pathX)<1.4){x+=x<pathX?-2.2:2.2;}dummy.position.set(x,0,z);dummy.rotation.set(0,rand()*Math.PI*2,(rand()-.5)*.35);const k=.25+rand()*.7;dummy.scale.setScalar(k);dummy.updateMatrix();grass.setMatrixAt(count++,dummy.matrix);}grass.receiveShadow=true;world.add(grass);
 const rockGeo=new T.IcosahedronGeometry(1,2);const rockPos=rockGeo.attributes.position;for(let i=0;i<rockPos.count;i++){const x=rockPos.getX(i),y=rockPos.getY(i),z=rockPos.getZ(i);const f=1+.13*Math.sin(x*6+y*9+z*4);rockPos.setXYZ(i,x*f,y*f,z*f);}rockGeo.computeVertexNormals();const rocks=new T.InstancedMesh(rockGeo,mat(0x777b70),18);for(let i=0;i<18;i++){dummy.position.set((rand()-.5)*27,.05,rand()*30-18);dummy.rotation.set(rand(),rand()*6,rand());dummy.scale.set(.1+rand()*.35,.06+rand()*.16,.1+rand()*.30);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;rocks.receiveShadow=true;world.add(rocks);
 // Fern understory: curved fronds and paired pinnae, clustered where the path is not.
 const fp=[],fc=[];const tri=(a,b,c,shade)=>{for(const p of [a,b,c]){fp.push(...p);fc.push(.12*shade,.25*shade,.075*shade);}};
 for(let f=0;f<7;f++){const a=f/7*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a);const pos=(u,v)=>[(u*cs-v*sn),Math.sin(u*2.3)*.42,(u*sn+v*cs)];for(let i=1;i<13;i++){const u=i/13*.78,w=Math.sin(i/13*Math.PI)*.17;for(const side of [-1,1]){const point=(t,edge)=>{const breadth=Math.sin(Math.PI*t)*.019;const p=pos(u+.10*t+edge*breadth,side*w*t);p[1]+=.035*Math.sin(t*Math.PI)-Math.abs(edge)*.012;return p;};for(let j=0;j<5;j++){const t0=j/5,t1=(j+1)/5;tri(point(t0,-1),point(t1,-1),point(t0,0),.78+i*.025);tri(point(t0,0),point(t1,-1),point(t1,0),.78+i*.025);tri(point(t0,0),point(t1,0),point(t0,1),1+i*.022);tri(point(t0,1),point(t1,0),point(t1,1),1+i*.022);}}}}
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(fp,3));fg.setAttribute('color',new T.Float32BufferAttribute(fc,3));fg.computeVertexNormals();const fern=new T.InstancedMesh(fg,new T.MeshStandardMaterial({vertexColors:true,roughness:.73,side:T.DoubleSide}),70);
 for(let i=0;i<70;i++){const a=rand()*Math.PI*2,r=1.4+rand()*4.2,cent=i<40?[-2,-3]:i<55?[-3,5]:[7,3];dummy.position.set(cent[0]+Math.cos(a)*r,.035,cent[1]+Math.sin(a)*r);dummy.rotation.set(0,rand()*6,0);dummy.scale.setScalar(.5+rand()*.8);dummy.updateMatrix();fern.setMatrixAt(i,dummy.matrix);}fern.receiveShadow=true;fern.castShadow=true;world.add(fern);
 // Ground leaves from the same licensed leaf set, never an opaque green carpet.
 const litter=new T.InstancedMesh(new T.PlaneGeometry(.24,.27),new T.MeshStandardMaterial({map:leafMap,alphaTest:.5,side:T.DoubleSide,color:0x9b773c,roughness:1}),180);
 for(let i=0;i<180;i++){dummy.position.set((rand()-.5)*14,.015,rand()*17-9);dummy.rotation.set(-Math.PI/2,0,rand()*6);dummy.scale.setScalar(.6+rand());dummy.updateMatrix();litter.setMatrixAt(i,dummy.matrix);}world.add(litter);
 // Slender instrument anchored to the ground. It is an illustration, not a live sensor.
 const instrument=new T.Group();instrument.position.set(3.5,0,-1.5);const stem=new T.Mesh(new T.CylinderGeometry(.025,.035,1.4,10),mat(0x617777,.5));stem.position.y=.7;instrument.add(stem);const housing=new T.Mesh(new T.BoxGeometry(.16,.22,.10),mat(0xc6d6ce,.4));housing.position.y=1.45;instrument.add(housing);world.add(instrument);
 layers=new T.Group();world.add(layers);
 const pointsGeo=new T.BufferGeometry();pointsGeo.setAttribute('position',new T.Float32BufferAttribute(samples,3));edgeMat=new T.PointsMaterial({size:.027,color:0xa2e4d5,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});layers.add(new T.Points(pointsGeo,edgeMat));
 const anchors=[V(-1.2,3.3,-2.8),V(1.5,.12,1),V(3.5,1.45,-1.5),V(-2,.15,-3),V(-4,1.1,-1.5)];
 // Paths form a distributed web of contacts, not a hierarchy centered on Aoi.
 [[0,2],[0,4],[1,2],[1,3],[3,4],[2,3]].forEach(([i,j],k)=>{const a=anchors[i],b=anchors[j],mid=a.clone().lerp(b,.5);mid.y+=.65+k*.12;const c=new T.CatmullRomCurve3([a,mid,b]);const m=new T.LineBasicMaterial({color:k%2?0xd7b982:0x95dacd,transparent:true,opacity:0,depthWrite:false});const line=new T.Line(new T.BufferGeometry().setFromPoints(c.getPoints(55)),m);layers.add(line);paths.push({line,c,m,ends:[i,j]});});
 // Nested topographic traces lie on the physical ground and bend around the tree.
 for(let k=0;k<8;k++){let pts=[];for(let i=0;i<=120;i++){const a=i/120*Math.PI*2,r=1.1+k*.46+.16*Math.sin(a*4+k*.5);pts.push(V(-2+Math.cos(a)*r,.025+k*.003,-3+Math.sin(a)*r*.67));}const m=new T.LineBasicMaterial({color:0x86b9b1,transparent:true,opacity:0,depthWrite:false});layers.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),m));paths.push({m});}
 particlePositions=new Float32Array(72*3);particles=new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(particlePositions,3)),new T.PointsMaterial({size:.038,color:0xb4e8dd,transparent:true,opacity:.75,depthWrite:false,blending:T.AdditiveBlending}));layers.add(particles);
 // Soft translucent sheets: local fields of contact, woven through branches and soil.
 for(let k=0;k<3;k++){
 const positions=[],uv=[],idx=[];for(let i=0;i<=140;i++){const u=i/140,a=u*Math.PI*2,r=2.7+k*.65;for(let j=0;j<2;j++){const w=(j-.5)*(.12+Math.sin(u*Math.PI)*.42);positions.push(-1+Math.cos(a)*r,1.5+Math.sin(a*2+k*.7)*.8+w,-1.8+Math.sin(a)*r*.7);uv.push(u,j);}}for(let i=0;i<140;i++){const n=i*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
 const m=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,uniforms:{alpha:{value:0},color:{value:new T.Color([0x8fe5c7,0x98bce3,0xe0c999][k])}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float alpha;uniform vec3 color;varying vec2 vUv;void main(){float edge=pow(1.-abs(vUv.y-.5)*2.,2.);gl_FragColor=vec4(color,alpha*edge*.28);}' });layers.add(new T.Mesh(g,m));paths.push({m,ribbon:true});
 }

 const cv=stage.querySelector('canvas');let pointer=null;
 cv.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,yaw};});
 cv.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x;if(Math.abs(dx)>Math.abs(e.clientY-pointer.y)){yaw=T.MathUtils.clamp(pointer.yaw+dx*.0015,-.22,.22);dirty=true;wake();}},{passive:true});
 addEventListener('pointerup',()=>pointer=null);cv.addEventListener('pointercancel',()=>pointer=null);
 cv.addEventListener('webglcontextlost',e=>{e.preventDefault();stage.dataset.ready='false';stage.querySelector('.cg-gl-fallback').hidden=false;stopNarration();active=false;});
 cv.addEventListener('webglcontextrestored',()=>location.reload());
 new ResizeObserver(resize).observe(stage);resize();
 new IntersectionObserver(entries=>{active=entries[0].isIntersecting;if(!active)stopNarration();else{dirty=true;wake();}},{threshold:.01}).observe(stage);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(audio&&!audio.paused)stopNarration();}else{last=0;dirty=true;wake();}});
 renderer.render(scene,camera);stage.dataset.ready='true';stage.dataset.readyMs=Math.round(performance.now());
 loadAoi();
}
async function loadAoi(){
 try{
 const [{GLTFLoader},{MeshoptDecoder},VRM,{AoiMotion}]=await Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js'),import('@pixiv/three-vrm'),import('./aoi_motion.js?v=20261026-v61')]);
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);loader.register(p=>new VRM.VRMLoaderPlugin(p));
 const buf=await(window.__aoiBuf||(window.__aoiBuf=fetch('img/hero/aoi.vrm').then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();})));
 const gltf=await loader.parseAsync(buf.slice(0),'');vrm=gltf.userData.vrm;VRM.VRMUtils.rotateVRM0(vrm);vrm.humanoid.resetNormalizedPose();vrm.update(0);
 aoigroup=new T.Group();aoigroup.add(vrm.scene);aoigroup.position.set(mobile?3.4:5.3,0,4.7);const bb=new T.Box3().setFromObject(vrm.scene);aoigroup.scale.setScalar(1.7/(bb.max.y-bb.min.y));world.add(aoigroup);
 vrm.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=false;}});
 motion=new AoiMotion(vrm,{root:aoigroup,reducedMotion:paused,wind:.12,faceViewer:true,startCalm:1,posture:'upright',uprightWeight:1,quality:mobile?'mid':'high'});vrm.scene.traverse(o=>{if(o.isSkinnedMesh){o.frustumCulled=false;o.geometry.computeBoundingSphere();o.boundingSphere=o.geometry.boundingSphere.clone();}});motion.faceTo(null);motion.update(.016,camera,{vrmUpdate:false});vrm.update(.016);motion.afterVrmUpdate(.016);
 renderer.render(scene,camera);stage.dataset.aoiMs=Math.round(performance.now());talkStatus.textContent='';dirty=true;wake();loadBird();prepareNarration();
 }catch(e){console.error('Common Ground Aoi',e);talkStatus.textContent=en()?'Aoi could not load. The transcript remains available.':'碧を読み込めませんでした。案内の全文は下から読めます。';}
}
function resize(){if(!renderer)return;width=stage.clientWidth;height=stage.clientHeight;if(!width||!height)return;mobile=width<760;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=mobile?54:49;camera.updateProjectionMatrix();positionCamera();dirty=true;wake();}
function positionCamera(){if(!camera)return;const p=mobile?V(5.9,2.1,10.4):V(6.3,2.9,11.2),look=V(mobile?1.0:.2,mobile?.15:1.5,mobile?-.3:-2.0);p.applyAxisAngle(V(0,1,0),yaw);p.lerp(mobile?V(4.2,1.5,8.7):V(6.7,1.65,8.5),guideBlend);look.lerp(mobile?V(3.4,.7,4.7):V(3.8,1.3,4.7),guideBlend);camera.position.copy(p);camera.lookAt(look);}
function wake(){if(!raf&&renderer&&active&&!document.hidden)raf=requestAnimationFrame(loop);}
let layerAlpha=0,frames=0,frameTimes=[];
function loop(now){raf=0;if(!active||document.hidden)return;if(!dirty&&paused&&!dialogue)return;if(last&&now-last<32){wake();return;}const dt=Math.min(.05,last?(now-last)/1000:.016);if(last)frameTimes.push(now-last);if(frameTimes.length>120)frameTimes.shift();last=now;if(!paused)t+=dt;
 const goal=step===2?.72:step===1?.27:0;layerAlpha=paused?goal:T.MathUtils.lerp(layerAlpha,goal,Math.min(1,dt*3));edgeMat.opacity=layerAlpha*.55;paths.forEach(p=>{if(p.ribbon)p.m.uniforms.alpha.value=layerAlpha;else p.m.opacity=layerAlpha*(selectedClue&&p.ends&&!p.ends.includes({branch:0,shade:1,sensor:2}[selectedClue])?.12:.46);});particles.visible=layerAlpha>.01;particles.material.opacity=layerAlpha*.8;
 paths.filter(p=>p.c).forEach((p,k)=>{for(let i=0;i<12;i++){const v=p.c.getPoint(((i/12+t*.045+k*.12)%1));particlePositions.set([v.x,v.y,v.z],(k*12+i)*3);}});particles.geometry.attributes.position.needsUpdate=true;
 if(aoigroup)aoigroup.position.x=mobile?3.4:5.3;if(bird&&!paused)bird.update(dt);if(!paused)leafGroups.forEach(o=>o.g.rotation.z=Math.sin(t*.27+o.phase)*.003);
 if(dialogue&&audio){const idx=cues.findIndex(c=>audio.currentTime>=c.s&&audio.currentTime<c.e);if(idx!==cueIndex){cueIndex=idx;subtitle.textContent=idx>=0?cues[idx].text:'';if(idx>=0&&motion&&!paused){motion.speak({text:cues[idx].text,kana:cues[idx].text,dur:cues[idx].e-cues[idx].s,clock:()=>audio.currentTime-cues[idx].s,gesture:[{t:.4,type:idx%3?'metaphoric':'deictic',shape:'present',target:V(-2,2,-3)}]});}}const n=audio.currentTime<11?0:audio.currentTime<23?1:audio.currentTime<42?2:3;if(n!==liveCue){liveCue=n;choose(n);}}
 if(motion&&!paused){motion.update(dt,camera,{vrmUpdate:false});vrm.update(dt);motion.afterVrmUpdate(dt);}
 guideBlend=paused?(dialogue?1:0):T.MathUtils.lerp(guideBlend,dialogue?1:0,Math.min(1,dt*2));positionCamera();renderer.render(scene,camera);
 const anchors={branch:V(-.8,3.0,-2.5),shade:V(-1,.3,1),sensor:V(3.5,1.6,-1.5)};
 figure.querySelectorAll('[data-anchor]').forEach(el=>{const p=anchors[el.dataset.anchor].clone().project(camera);const x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;const anchor=el.dataset.anchor,ax=mobile?(anchor==='sensor'?width-el.offsetWidth-16:16):Math.max(16,Math.min(width-el.offsetWidth-16,x)),ay=mobile?height*({branch:.34,shade:.48,sensor:.40}[anchor]):Math.max(height*.38,Math.min(height-240,y));el.style.transform=`translate(${ax}px,${ay}px)`;const show=step===1||step===2;el.style.opacity=show?'1':'0';el.style.pointerEvents=show?'auto':'none';el.tabIndex=show?0:-1;});
 frames++;dirty=false;stage.dataset.frames=frames;
 if(!paused||dialogue)wake();
}
window.__commonGround={choose,get stats(){return {step,frames,ready:stage.dataset.ready,aoi:!!vrm,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,medianFrameMs:frameTimes.slice().sort((a,b)=>a-b)[Math.floor(frameTimes.length/2)],paused,active};},capture:()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},render:()=>{dirty=true;wake();}};
let booted=false;const deepStart=!!location.hash&&location.hash!=='#top';const bootObserver=new IntersectionObserver(es=>{if(deepStart&&document.readyState==='loading')return;if(es[0].isIntersecting&&!booted){booted=true;try{sceneBoot();choose(2);}catch(e){console.error('Common Ground scene',e);stage.querySelector('.cg-gl-fallback').hidden=false;stage.dataset.ready='false';}}},{rootMargin:'100px'});bootObserver.observe(stage);if(deepStart)document.addEventListener('DOMContentLoaded',()=>{bootObserver.unobserve(stage);bootObserver.observe(stage);},{once:true});
const full=figure.querySelector('.cg-fullscreen'),hero=figure.closest('.cg-hero');
let expanded=false,priorOverflow='';
function expand(on){expanded=on;hero.classList.toggle('cg-expanded',on);if(on){hero.setAttribute('role','dialog');hero.setAttribute('aria-modal','true');hero.setAttribute('aria-label',en()?'Common Ground 3D':'コモングラウンドの3D');}else{hero.removeAttribute('role');hero.removeAttribute('aria-modal');hero.removeAttribute('aria-label');}full.setAttribute('aria-pressed',String(on));full.textContent=en()?(on?'Return to page ↙':'Expand scene ↗'):(on?'ページに戻る ↙':'風景を広げる ↗');if(on){priorOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}else document.body.style.overflow=priorOverflow;resize();}
full.addEventListener('click',()=>expand(!expanded));addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded){expand(false);full.focus();}});
new MutationObserver(()=>hero.classList.toggle('is-speaking',figure.classList.contains('is-talking'))).observe(figure,{attributes:true,attributeFilter:['class']});

async function loadBird(){try{const {loadSight}=await import('./kit/sight/sightModels.js');bird=await loadSight('hiyo',{shadow:false,autoplay:false});bird.play('perch',0);bird.object.position.set(-.8,2.7,-2.5);bird.object.rotation.y=.6;world.add(bird.object);const branch=new T.Mesh(taperTube([V(-2,1.8,-3),V(-1.4,2.4,-2.6),V(-.65,2.7,-2.5)],.07,.018,8,8),mat(0x635b43));world.add(branch);dirty=true;wake();}catch(e){console.warn('Common Ground bird',e.message);}}

const clueTexts={branch:{ja:'鳥にとって、枝は身体を支える場所。どの枝に止まれるかという関係から、同じ木を見直します。',en:'For a bird, a branch supports the body. Revisit the tree through the relationship between a perch and the body it can support.'},shade:{ja:'人にとって、木陰はひと息つける場所。光や風、過ごした時間と結びついて、木の意味が立ち上がります。',en:'For a person, shade can be a place to rest. Light, air and time spent here connect to what the tree means.'},sensor:{ja:'計測では、場所を温度などの変化として記録する。身体が感じる木陰と、数の記録を結び直します。この場の数値は実測していません。',en:'In measurement, a place is recorded through changes such as temperature. Relate that record to the shade felt by a body. This scene is not connected to live measurements.'}};
function showClue(key){choose(1);selectedClue=key;figure.querySelectorAll('[data-cg-caption]').forEach(p=>p.hidden=true);const p=figure.querySelector('.cg-clue-copy');p.hidden=false;p.textContent=clueTexts[key][en()?'en':'ja'];figure.querySelector(`[data-anchor="${key}"]`).setAttribute('aria-pressed','true');dirty=true;wake();}
figure.querySelectorAll('[data-anchor]').forEach(b=>b.addEventListener('click',()=>{stopNarration();showClue(b.dataset.anchor);}));
// CSS full-screen also works on iOS. Keep keyboard focus within the scene until Escape.
addEventListener('keydown',e=>{if(!expanded||e.key!=='Tab')return;const controls=[...hero.querySelectorAll('button,a[href],summary')].filter(el=>el.getClientRects().length&&el.tabIndex>=0&&getComputedStyle(el).opacity!=='0');const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
