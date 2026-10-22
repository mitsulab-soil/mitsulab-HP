import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createFieldScene} from './field-scene.js?v=20261023-boot2';

// These scenes are artistic models. UV colours and roots are explanatory,
// not measurements of this flower or a reconstruction of an animal's mind.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const asset=name=>new URL('./assets/'+name,import.meta.url).href;
const diagnostics=window.__qualiumApp={};
const renderers=new WeakMap();
const rand=i=>{const v=Math.sin(i*127.1+27.3)*43758.5453;return v-Math.floor(v);};
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'white');g.addColorStop(.12,'white');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);}

function makeFlower(scene,textures){
 const plant=new T.Group(),flower=new T.Group(),roots=new T.Group(),concept=new T.Group();
 plant.position.y=.28;flower.position.y=.62;plant.add(flower,roots,concept);scene.add(plant);
 const uv={value:0},cut={value:0};
 const stemMaterial=new T.MeshStandardMaterial({color:0x56714c,roughness:.9});
 const stemCurve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(-.015,.2,.01),new T.Vector3(.025,.43,0),new T.Vector3(0,.62,0)]);
 plant.add(new T.Mesh(new T.TubeGeometry(stemCurve,28,.006,8,false),stemMaterial));
 // Curved thin petal sheets, with longitudinal veins and an illustrative UV
 // centre. No flat sprite substitutes for the flower's changing perspective.
 const positions=[],uvs=[],indices=[],U=18,V=10;
 for(let i=0;i<=U;i++){const u=i/U;for(let j=0;j<=V;j++){const v=j/V-.5,w=Math.sin(Math.PI*u)**.65*.115;positions.push(v*w,.018*Math.sin(u*Math.PI)-.012*u+v*v*.035,.026+u*.19);uvs.push(j/V,u);}}
 for(let i=0;i<U;i++)for(let j=0;j<V;j++){const a=i*(V+1)+j,b=a+V+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const petalGeometry=new T.BufferGeometry();petalGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));petalGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));petalGeometry.setIndex(indices);petalGeometry.computeVertexNormals();
 const petalMat=new T.MeshPhysicalMaterial({color:0xf6efd6,roughness:.62,side:T.DoubleSide,metalness:0,clearcoat:.025});
 petalMat.onBeforeCompile=shader=>{shader.uniforms.qUV=uv;shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float qUV;').replace('#include <color_fragment>','#include <color_fragment>\nfloat veins=.96+.04*cos(vUv.x*80.+vUv.y*9.);float centre=1.-smoothstep(.18,.62,vUv.y);diffuseColor.rgb*=veins;diffuseColor.rgb=mix(diffuseColor.rgb, mix(vec3(.48,.7,.97),vec3(.25,.08,.48),centre),qUV*.86);');};
 // vUv is needed even though the petal colour is procedural.
 petalMat.defines={USE_UV:''};
 for(let i=0;i<8;i++){const p=new T.Mesh(petalGeometry,petalMat);p.rotation.y=i*Math.PI/4;p.rotation.x=(rand(i)-.5)*.12;p.castShadow=p.receiveShadow=true;flower.add(p);}
 const centreMat=new T.MeshStandardMaterial({color:0xc4a657,roughness:.92});
 const centre=new T.Mesh(new T.SphereGeometry(.041,24,12),centreMat);centre.scale.y=.38;centre.position.y=.009;flower.add(centre);
 const pollen=new T.InstancedMesh(new T.IcosahedronGeometry(.0027,0),new T.MeshStandardMaterial({color:0xdec57a,roughness:.82}),96),dummy=new T.Object3D();
 for(let i=0;i<96;i++){const r=.038*Math.sqrt(rand(i)),a=i*2.399;dummy.position.set(Math.cos(a)*r,.013+Math.sqrt(Math.max(0,1-r*r/.0016))*.011,Math.sin(a)*r);dummy.updateMatrix();pollen.setMatrixAt(i,dummy.matrix);}flower.add(pollen);
 const leafMaterial=new T.MeshStandardMaterial({map:textures.leaf,side:T.DoubleSide,alphaTest:.4,color:0xc4d1a3,roughness:.88});
 const leafGeo=new T.PlaneGeometry(.12,.23,4,8);const lp=leafGeo.attributes.position;for(let i=0;i<lp.count;i++)lp.setZ(i,Math.cos(lp.getX(i)*18)*.018+Math.sin(lp.getY(i)*11)*.012);leafGeo.computeVertexNormals();
 for(let i=0;i<4;i++){const leaf=new T.Mesh(leafGeo,leafMaterial);leaf.position.set(i%2?.055:-.055,.18+i*.09,0);leaf.rotation.set(-.45,Math.PI/2*i,i%2?-.8:.8);leaf.castShadow=leaf.receiveShadow=true;plant.add(leaf);}
 const rootMat=new T.MeshStandardMaterial({color:0xc7b08a,roughness:1});
 for(let i=0;i<14;i++){const a=i*2.399,r=.2+rand(i)*.46;const end=new T.Vector3(Math.cos(a)*r,-.25-rand(i+10)*.38,Math.sin(a)*r);const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(Math.cos(a)*.08,-.12,Math.sin(a)*.08),new T.Vector3(end.x*.55,end.y*.65,end.z*.55),end]);roots.add(new T.Mesh(new T.TubeGeometry(curve,16,.005+rand(i)*.004,5,false),rootMat));}
 const soilMat=new T.MeshStandardMaterial({map:textures.soil,normalMap:textures.normal,normalScale:new T.Vector2(.45,.45),color:0x93867a,roughness:1,side:T.DoubleSide});
 const wall=new T.Mesh(new T.CylinderGeometry(.835,.835,.79,60,1,true),soilMat);wall.position.y=-.4;roots.add(wall);
 const floor=new T.Mesh(new T.CircleGeometry(.86,60),soilMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.795;floor.receiveShadow=true;roots.add(floor);
 const soilSurface=new T.Mesh(new T.CircleGeometry(1.4,64),soilMat.clone());soilSurface.rotation.x=-Math.PI/2;soilSurface.position.y=-.005;soilSurface.receiveShadow=true;plant.add(soilSurface);
 // A cutaway only when the user selects the underground model.
 const cutMaterials=[];
 function cutMaterial(m){if(!m?.isMeshStandardMaterial||cutMaterials.includes(m))return;cutMaterials.push(m);const before=m.onBeforeCompile;m.onBeforeCompile=shader=>{before?.(shader);shader.uniforms.qCut=cut;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 qPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nqPosition=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 qPosition;uniform float qCut;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(qCut>.5&&length(qPosition.xz)<.84)discard;');};m.customProgramCacheKey=()=> 'qualium-cutaway-1';m.needsUpdate=true;}
 cutMaterial(soilSurface.material);
 const environment=scene.getObjectByName('qualium-photo-place');environment?.children[0]?.children.forEach(o=>{if(o.isMesh&&!o.isInstancedMesh)for(const m of [].concat(o.material))cutMaterial(m);});
 const linesMat=new T.LineBasicMaterial({color:0xcde1ca,transparent:true,opacity:.6,depthWrite:false});
 for(let i=0;i<4;i++){const a=i*Math.PI/2,curve=new T.CatmullRomCurve3([new T.Vector3(0,.63,0),new T.Vector3(Math.cos(a)*.3,.95,Math.sin(a)*.3),new T.Vector3(Math.cos(a)*.65,.8,Math.sin(a)*.65)]);concept.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(32)),linesMat));}
 roots.visible=concept.visible=false;
 return{update(time,view){uv.value=view==='bee'?1:0;cut.value=view==='soil'?1:0;roots.visible=view==='soil';concept.visible=view==='story';flower.rotation.z=Math.sin(time*.7)*.018;concept.rotation.y=time*.055;},cut};
}

async function build(host){
 const kind=host.dataset.scene,canvas=host.querySelector('canvas'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
 renderers.set(host,renderer);
 const status=diagnostics[kind]={ready:false,frames:0,startedAt:performance.now(),firstFrameAt:null,aoi:false};
 // Fetch Aoi at the same time as the field, rather than after all field assets.
 const aoiTask=kind==='hero'?(async()=>{
  const [{VRMLoaderPlugin,VRMUtils},{AoiMotion}]=await Promise.all([import('@pixiv/three-vrm'),import('./js/aoi_motion.js')]);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);loader.register(parser=>new VRMLoaderPlugin(parser));
  const g=await loader.loadAsync(asset('aoi.vrm'));status.aoiAssetAt=performance.now();return{g,VRMUtils,AoiMotion};
 })().then(value=>({value}),error=>({error})):null;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1:1.4));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene(),world=new T.Group(),camera=new T.PerspectiveCamera();scene.add(world);
 const field=await createFieldScene({T,scene,world,camera,host,sprite:glowTexture(),renderer});
 status.fieldReadyAt=performance.now();
 const origin=world.getObjectByName('qualium-photo-place');origin.children[1].visible=false;
 let motion=null,flower=null,vrm=null;
 if(kind==='hero'){
  const loaded=await aoiTask;if(loaded.error)throw loaded.error;
  const {g,VRMUtils,AoiMotion}=loaded.value;vrm=g.userData.vrm;VRMUtils.removeUnnecessaryVertices(g.scene);VRMUtils.rotateVRM0(vrm);
  const pivot=new T.Group();pivot.add(vrm.scene);pivot.position.y=.1;scene.add(pivot);vrm.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;}});
  motion=new AoiMotion(vrm,{root:pivot,wind:.22,faceViewer:false,startCalm:1,posture:'upright'});
  // The extra back-face outline passes compete with hair/headpiece/skin
  // surfaces and sparkle at a distance. Keep every primary surface and
  // its shading; suppress only extra outlines, leaving the VRM untouched.
  vrm.scene.traverse(o=>{if(o.isMesh)for(const material of [].concat(o.material))if(material?.isOutline)material.visible=false;});
 }else{
  // The flower stands in the planting bed, beside the centre of the avenue.
  origin.position.x=6.5;
  const loader=new T.TextureLoader(),[soil,normal,leaf]=await Promise.all([loader.loadAsync(asset('soil_forest.webp')),loader.loadAsync(asset('sand_grit_n.webp')),loader.loadAsync(asset('leaf_one.webp'))]);
  soil.colorSpace=leaf.colorSpace=T.SRGBColorSpace;normal.colorSpace=T.NoColorSpace;
  // Colour and normal detail must use the same repeat and UV scale.
  for(const texture of [soil,normal]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(1.5,1.5);texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}
  flower=makeFlower(scene,{soil,normal,leaf});
 }
 renderer.shadowMap.needsUpdate=true;
 let width=1,height=1,view='human',yaw=0,zoom=1,drag=null,visible=false,paused=reduced.matches,contextAlive=true,time=0,last=0,previous=0,raf=0,frames=0;
 Object.assign(status,{ready:true,frames,view,visible,paused,aoi:!!vrm});const eye=new T.Vector3(),target=new T.Vector3();
 host.dataset.ready='true';
 host.querySelectorAll('.scene-actions button').forEach(button=>button.disabled=false);
 const pause=host.querySelector('[data-scene-pause]'),reset=host.querySelector('[data-scene-reset]');
 function draw(dt=0){
  if(!contextAlive)return;
  time+=dt;field.update({time,dt,mode:0,snap:true});origin.children[1].visible=false;
  if(kind==='hero'){
   camera.fov=32;const r=4.15*zoom;eye.set(Math.sin(yaw)*r,1.16,Math.cos(yaw)*r);target.set(0,.98,0);
  }else{
   const underground=view==='soil',far=view==='field',r=(underground?2.5:far?2.6:1.65)*zoom;
   camera.fov=width/height<.9?44:39;eye.set(Math.sin(.4+yaw)*r,underground?1.6:far?1.4:1.35,Math.cos(.4+yaw)*r);target.set(0,underground?.2:.67,0);flower.update(time,view);
  }
  camera.position.copy(eye);camera.lookAt(target);camera.updateMatrixWorld();camera.aspect=width/height;camera.near=.02;camera.far=1800;camera.updateProjectionMatrix();motion?.update(dt,camera);renderer.render(scene,camera);status.firstFrameAt ||= performance.now();status.frames=++frames;status.time=time;status.view=view;status.yaw=yaw;status.zoom=zoom;status.calls=renderer.info.render.calls;status.triangles=renderer.info.render.triangles;
 }
 function tick(now){raf=0;if(!contextAlive||!visible||paused||document.hidden)return;const interval=1000/30,elapsed=now-last;if(elapsed>=interval){const dt=previous?Math.min(.08,(now-previous)/1000):0;previous=now;last=now-elapsed%interval;draw(dt);}raf=requestAnimationFrame(tick);}
 function schedule(){cancelAnimationFrame(raf);raf=0;last=previous=0;status.visible=visible;status.paused=paused;if(visible&&contextAlive){draw(0);if(!paused&&!document.hidden)raf=requestAnimationFrame(tick);}}
 function labels(){pause.textContent=paused?'動きを再開':'動きを止める';pause.setAttribute('aria-pressed',String(paused));}
 function resize(){width=host.clientWidth;height=host.clientHeight;renderer.setSize(width,height,false);field.resize({width,height});draw(0);}
 new ResizeObserver(resize).observe(host);resize();labels();
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.06}).observe(host);
 pause.addEventListener('click',()=>{paused=!paused;labels();schedule();});reset.addEventListener('click',()=>{yaw=0;zoom=1;draw(0);});
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,start:yaw};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
 canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;yaw=T.MathUtils.clamp(drag.start+(e.clientX-drag.x)/Math.max(250,width)*1.2,-.75,.75);draw(0);});
 const release=()=>{drag=null;};for(const type of ['pointerup','pointercancel','lostpointercapture','blur'])canvas.addEventListener(type,release);
 canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','Escape','+','-'].includes(e.key)){e.preventDefault();if(e.key==='Home'||e.key==='Escape'){yaw=0;zoom=1;}else if(e.key==='+'||e.key==='-')zoom=T.MathUtils.clamp(zoom+(e.key==='+'?-.08:.08),.8,1.5);else yaw=T.MathUtils.clamp(yaw+(e.key==='ArrowLeft'?-.08:.08),-.75,.75);draw(0);}});
 document.addEventListener('visibilitychange',()=>{release();schedule();});reduced.addEventListener('change',e=>{paused=e.matches;labels();schedule();});
 if(kind==='experience'){view=host.dataset.view||'human';window.addEventListener('qualium-view',e=>{view=e.detail.view;renderer.shadowMap.needsUpdate=true;draw(0);});draw(0);}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextAlive=false;cancelAnimationFrame(raf);host.dataset.ready='fallback';status.ready=false;});
 canvas.addEventListener('webglcontextrestored',()=>{contextAlive=true;host.dataset.ready='true';status.ready=true;renderer.shadowMap.needsUpdate=true;resize();schedule();});
 status.aoi=!!vrm;return{draw};
}

for(const host of document.querySelectorAll('[data-scene]')){
 let started=false;
 new IntersectionObserver(entries=>{if(started||!entries.some(e=>e.isIntersecting))return;started=true;build(host).catch(error=>{renderers.get(host)?.dispose();host.dataset.ready='fallback';host.querySelector('.scene-error').hidden=false;diagnostics[host.dataset.scene]={ready:false,error:error.message};console.warn('Qualium 3D:',error);});},{rootMargin:'120px'}).observe(host);
}
