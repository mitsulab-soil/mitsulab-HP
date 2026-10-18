/* 参道写真を参照した推定植栽と少数の生きもの。現地観測・植生調査ではない。
   Existing assets only; no new tree positions. Near LOD, fixed caps, idle jobs. */
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const OFF=new URLSearchParams(location.search).get('ecology')==='off'||new URLSearchParams(location.search).get('photoreal')==='off';
const ownedTextures=new Set(),reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');let note;
const faunaVec=new T.Vector3(),faunaForward=new T.Vector3();
const depthLinks=new Map();
const U={t:{value:0},viewer:{value:new T.Vector3()},shape:{value:OFF?0:1}},seen=new WeakSet(),held=new Set();
let core,group,grass,herbs,litter,busy=false,ready=false,last=0,anchor=new T.Vector2(1e8,1e8),generation=0,creatures=[],stopped=false,faunaEnabled=true;
const stats={enabled:!OFF,ready:false,busy:false,grass:0,herbs:0,litter:0,birds:0,insects:0,treeMaterials:0,triangles:0,faunaEnabled:true,animalBuilds:0,animalUpdates:0,animalSkipped:0,maxAnimalBuildMs:0,maxAnimalUpdateMs:0,maxPopulationSliceMs:0,errors:[],measured:false,range:19,caps:{grass:220,herbs:84,litter:120,birds:1,insects:2},label:'写真を参照した推定植栽・生きものの創作配置（現地観測ではありません）'};
const idle=()=>new Promise(r=>(window.requestIdleCallback||((f)=>setTimeout(f,30)))(r,{timeout:200}));
export const seeded=n=>()=>((n=n*16807%2147483647)-1)/2147483646;
export function blade(length,width,bend=.16,segments=6){const g=new T.PlaneGeometry(1,1,2,segments),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),t=p.getY(i)+.5,w=width*Math.pow(Math.sin(Math.PI*Math.pow(t,.8)),.65);p.setXYZ(i,x*w,t*length,bend*t*t+Math.abs(x)*width*.14);}g.computeVertexNormals();return g;}
export function grassPrototype(seed=739){const r=seeded(seed),parts=[];for(let k=0;k<5;k++){const g=blade(.16+r()*.24,.006+r()*.006,.07+r()*.16,5);g.rotateY(r()*6.283);g.rotateZ((r()-.5)*.5);g.translate((r()-.5)*.045,0,(r()-.5)*.045);parts.push(g);}const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());return g;}
function herbPrototype(){const r=seeded(541),parts=[];for(let k=0;k<4;k++){const g=blade(.09+r()*.16,.028+r()*.035,.035+r()*.08,5);g.rotateZ((r()-.5)*1.9);g.rotateY(k*2.4);parts.push(g);}const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());return g;}
function wind(m){m.onBeforeCompile=sh=>{sh.uniforms.ecologyTime=U.t;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float ecologyTime;varying vec2 vEcologyUV;').replace('#include <begin_vertex>',`#include <begin_vertex>
#ifdef USE_INSTANCING
vEcologyUV=uv;float ep=instanceMatrix[3].x*.7+instanceMatrix[3].z*.4;transformed.x+=sin(ecologyTime*1.2+ep)*min(.012,position.y*position.y*.09);transformed.z+=cos(ecologyTime*.8+ep)*min(.008,position.y*position.y*.05);
#endif`);sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vEcologyUV;').replace('#include <color_fragment>',`#include <color_fragment>
float ev=sin(vEcologyUV.x*19.)*.018;diffuseColor.rgb*=1.+ev;`);};m.customProgramCacheKey=()=> 'sando-grass-wind-1';return m;}
// Smooth, instance-seeded bends: base stays planted and leaf/trunk share one mapping.
function shapeHook(m){const old=m.onBeforeCompile,key=m.customProgramCacheKey();m.onBeforeCompile=(sh,r)=>{old.call(m,sh,r);sh.uniforms.ecologyShape=U.shape;sh.uniforms.ecologyViewer=U.viewer;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float ecologyShape;uniform vec3 ecologyViewer;').replace('#include <project_vertex>',`{
#ifdef USE_INSTANCING
vec3 eo=(modelMatrix*instanceMatrix[3]).xyz;
float ef=(1.-smoothstep(16.,24.,distance(eo,ecologyViewer)))*ecologyShape;
if(ef>.001){
float en=fract(sin(dot(eo.xz,vec2(12.9898,78.233)))*43758.5453);
float en2=fract(sin(dot(eo.xz,vec2(39.346,11.135)))*24634.6345);
float eh=max(0.,transformed.y);
float eb=smoothstep(.8,3.5,eh);vec2 eq=transformed.xz;
vec2 branchAxis=vec2(cos(en*6.283),sin(en*6.283));
float branchSide=dot(eq,branchAxis);branchSide/=sqrt(branchSide*branchSide+.49);
float branchGate=smoothstep(.45,1.5,length(eq))*smoothstep(1.,3.2,eh);
float ea=ef*(eb*(en-.5)*.65+branchGate*branchSide*(.15+en2*.22));
vec2 branchQ=eq*(1.+ef*branchGate*branchSide*(.10+en2*.10));
transformed.x=branchQ.x*cos(ea)-branchQ.y*sin(ea);
transformed.z=branchQ.x*sin(ea)+branchQ.y*cos(ea);
transformed.x+=ef*eb*sin(eh*.3+en*6.)*min(.65,eh*.055);
transformed.z+=ef*eb*cos(eh*.23+en*5.)*min(.5,eh*.04);
transformed.y+=ef*branchGate*branchSide*(.55+en2*.65)*smoothstep(1.,6.,eh);
}
#endif
}\n#include <project_vertex>`);};m.customProgramCacheKey=()=>key+'|sando-asymmetric-4-near-guard';}
function makeDepth(source,previous){
 let d;
 if(previous){d=previous.clone();d.onBeforeCompile=previous.onBeforeCompile;d.customProgramCacheKey=previous.customProgramCacheKey;shapeHook(d);return d;}
 d=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:source.map,alphaMap:source.alphaMap,alphaTest:source.alphaTest,side:source.side,displacementMap:source.displacementMap,displacementScale:source.displacementScale,displacementBias:source.displacementBias});
 // Stock depth had no tree wind/season callbacks. Reuse the complete source
 // callback, while providing the stock-standard inputs its leaf alpha needs.
 // Colour/light chunks absent from depth remain absent; leaf colour/season
 // insertion is present because the latter also changes opacity.
 const sourceHook=source.onBeforeCompile,key=source.customProgramCacheKey();
 d.onBeforeCompile=(sh,r)=>{
  sh.vertexShader=sh.vertexShader.replace('#include <common>','varying vec3 vViewPosition;\n#include <common>').replace(/void main\(\)\s*\{/,`$&
#ifndef USE_DISPLACEMENTMAP
vec3 objectNormal=vec3(normal);
#endif`).replace('#include <project_vertex>','#include <project_vertex>\nvViewPosition=-mvPosition.xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','varying vec3 vViewPosition;\n#include <common>').replace(/void main\(\)\s*\{/, '$&\nvec3 totalEmissiveRadiance=vec3(0.);');
  if(source.userData.leaf)sh.fragmentShader=sh.fragmentShader.replace('#include <alphatest_fragment>','#include <color_fragment>\n#include <alphatest_fragment>');
  sourceHook.call(source,sh,r);
 };
 d.customProgramCacheKey=()=>key+'|sando-depth-source-alpha-1';return d;
}
async function warmTree(mesh){
 const m=mesh.material,c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;shapeHook(c);c.userData.leaf=!!m.userData.leaf;
 const linked=[];core.trees.traverse(o=>{if(o.isInstancedMesh&&o.material===m&&o.geometry.attributes.aRlSp)linked.push(o);});const staged=[];
 const proxy=new T.InstancedMesh(mesh.geometry,c,1);if(mesh.instanceColor)proxy.setColorAt(0,new T.Color(1,1,1));await core.renderer.compileAsync(proxy,core.camera,core.scene);
 for(const o of linked){await idle();if(stopped)break;const d=makeDepth(c,o.customDepthMaterial),dp=new T.InstancedMesh(o.geometry,d,1);await core.renderer.compileAsync(dp,core.camera,core.scene);dp.dispose?.();staged.push({mesh:o,previous:o.customDepthMaterial,depth:d});}
 if(stopped){c.dispose();for(const x of staged)x.depth.dispose();proxy.dispose?.();return;}
 // Commit source and all shadow materials together after warming.
 m.onBeforeCompile=c.onBeforeCompile;m.customProgramCacheKey=c.customProgramCacheKey;m.needsUpdate=true;
 for(const x of staged){x.mesh.customDepthMaterial=x.depth;depthLinks.set(x.mesh,x);}stats.depthMaterials=(stats.depthMaterials||0)+staged.length;
 seen.add(m);held.add(c);m.addEventListener('dispose',()=>{c.dispose();held.delete(c);for(const x of staged){if(x.mesh.customDepthMaterial===x.depth)x.mesh.customDepthMaterial=x.previous;x.depth.dispose();depthLinks.delete(x.mesh);}});stats.treeMaterials++;proxy.dispose?.();
}
async function init(){group=new T.Group();group.name='参道の推定下草と小さな生態';group.userData.ecology=stats.label;core.world.add(group);const gm=wind(new T.MeshStandardMaterial({color:0xb5c598,side:T.DoubleSide,roughness:.91}));grass=new T.InstancedMesh(grassPrototype(),gm,stats.caps.grass);grass.name='曲がる細葉の疎密群落';await idle();const textures=await Promise.allSettled(['ecology-leaf-c.webp','ecology-leaf-n.webp'].map(n=>new T.TextureLoader().loadAsync(new URL(n,import.meta.url))));const leafMap=textures[0].status==='fulfilled'?textures[0].value:null,leafNormal=textures[1].status==='fulfilled'?textures[1].value:null;if(leafMap)leafMap.colorSpace=T.SRGBColorSpace;for(const t of [leafMap,leafNormal])if(t){t.anisotropy=4;ownedTextures.add(t);core.renderer.initTexture(t);}stats.leafTextureReady=!!leafMap&&!!leafNormal;const hm=wind(new T.MeshStandardMaterial({color:0xffffff,map:leafMap,alphaTest:leafMap?.image?.width ? .34 : 0,side:T.DoubleSide,roughness:.87,normalMap:leafNormal,normalScale:new T.Vector2(.28,.28)}));herbs=new T.InstancedMesh(herbPrototype(),hm,stats.caps.herbs);herbs.name='低い広葉の推定下草';await idle();let litterPhoto;core.scene.getObjectByName('近接12根元・創作の表面補完')?.traverse(o=>{if(o.material?.name==='根と土の境をつなぐ既存CC0落葉写真')litterPhoto=o.material.map;});const lm=new T.MeshStandardMaterial({color:0xd7c7a4,map:litterPhoto||null,side:T.DoubleSide,roughness:.98});litter=new T.InstancedMesh(blade(.08,.035,.009,4),lm,stats.caps.litter);litter.name='土の帯の丸まる落葉';for(const o of [grass,herbs,litter]){o.count=0;o.setColorAt(0,new T.Color(1,1,1));o.frustumCulled=false;o.receiveShadow=true;group.add(o);stats.triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*o.instanceMatrix.count;}await core.renderer.compileAsync(group,core.camera,core.scene);ready=stats.ready=true;const src=document.querySelector('#journeySrc');if(src){note=document.createElement('p');note.id='sandoEcologyNote';note.textContent='下草・生きものは写真を参照した推定配置。現地観測ではありません。';src.after(note);}}
export function soilAllowed(C,x,z,pad=.36){const a=C.botanicalSurfaceAt?.(x,z);if(!a||!['bed','lawn','roots'].includes(a.kind)||a.clearance<pad)return false;for(let k=0;k<8;k++){const b=C.botanicalSurfaceAt(x+Math.cos(k*Math.PI/4)*pad,z+Math.sin(k*Math.PI/4)*pad);if(!b||!['bed','lawn','roots'].includes(b.kind))return false;}return true;}
async function populate(){const cam=core.camera.position,id=++generation,r=seeded(Math.abs(Math.round(cam.x*71+cam.z*37))+927),D=new T.Object3D(),color=new T.Color(),counts=[0,0,0],points=[];for(let chunk=0;chunk<15;chunk++){await idle();if(stopped)return;const sliceStart=performance.now();for(let j=0;j<60;j++){const a=r()*6.283,rad=Math.sqrt(r())*19,x=cam.x+Math.cos(a)*rad,z=cam.z+Math.sin(a)*rad,density=.5+.5*Math.sin(x*.8+Math.sin(z*.3)*2)*Math.cos(z*.57);if(r()>density*.82||!soilAllowed(core,x,z))continue;const y=core.groundY(x,z);if(!Number.isFinite(y))continue;const k=r()<.62?0:r()<.64?1:2,im=[grass,herbs,litter][k];if(counts[k]>=im.instanceMatrix.count)continue;D.position.set(x,y+.006,z);D.rotation.set(k===2?-1.48:(r()-.5)*.1,r()*6.283,0);const sc=k===2?.6+r()*.8:.5+r()*.8;D.scale.set(sc,sc,sc);D.updateMatrix();im.setMatrixAt(counts[k],D.matrix);color.setHSL(k===2?.08+r()*.035:.20+r()*.06,k===2?.23:.25+r()*.18,k===2?.20+r()*.12:.13+r()*.10);im.setColorAt(counts[k]++,color);if(points.length<16)points.push({x,y,z});}stats.maxPopulationSliceMs=Math.max(stats.maxPopulationSliceMs,performance.now()-sliceStart);}if(id!==generation)return;[grass,herbs,litter].forEach((o,k)=>{o.count=counts[k];o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;});[stats.grass,stats.herbs,stats.litter]=counts;stats.points=points;anchor.set(cam.x,cam.z);}
async function warmAnimal(a){
 // Compile and upload before attaching: no first-visible shader/texture work.
 await idle();await core.renderer.compileAsync(a,core.camera,core.scene);
 const textures=new Set();a.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;for(const m of [].concat(o.material))for(const t of Object.values(m))if(t?.isTexture)textures.add(t);});
 for(const t of textures){await idle();if(stopped)return;core.renderer.initTexture(t);}
 if(!stopped){group.add(a);creatures.push(a);}
}
function placeAnimals(){if(!stats.points?.length)return;const cp=core.camera.position,oldBird=creatures.find(a=>a.userData.ecologyKind==='bird');if(oldBird?.userData.ecologyPlaced&&Math.hypot(oldBird.position.x-cp.x,oldBird.position.z-cp.z)<19)return;const p=stats.points.reduce((best,p)=>Math.hypot(p.x-cp.x,p.z-cp.z)<Math.hypot(best.x-cp.x,best.z-cp.z)?p:best);let flyN=0;for(const a of creatures){a.userData.ecologyLastTick=-1e9;a.userData.ecologyPlaced=true;if(a.userData.ecologyKind==='bird')a.position.set(p.x,p.y+.047,p.z);else{const i=flyN++;a.userData.ecologyHome={x:p.x+(i?-.4:.3),y:p.y+.42,z:p.z+(i?.3:-.2)};a.position.set(a.userData.ecologyHome.x,a.userData.ecologyHome.y,a.userData.ecologyHome.z);}}}
async function animals(){
 if(!stats.points?.length)return;
 if(creatures.length){placeAnimals();return;} // Reuse the same 3 models after movement.
 const {makeTit,makeButterfly}=await import('./body/creatures.js?v=20261018-anatomy');if(stopped)return;
 await idle();let start=performance.now();const bird=makeTit();stats.maxAnimalBuildMs=Math.max(stats.maxAnimalBuildMs,performance.now()-start);stats.animalBuilds++;
 bird.scale.setScalar(.28);bird.userData.state='perch';bird.userData.animate?.(0,false);bird.userData.ecologyKind='bird';bird.name='小鳥・創作配置（生息観測ではない）';await warmAnimal(bird);stats.birds=1;
 for(let i=0;i<2;i++){await idle();if(stopped)return;start=performance.now();const fly=makeButterfly('monshiro');stats.maxAnimalBuildMs=Math.max(stats.maxAnimalBuildMs,performance.now()-start);stats.animalBuilds++;fly.scale.setScalar(.025);fly.userData.ecologyKind='insect';fly.name='小さな蝶・創作配置（生息観測ではない）';await warmAnimal(fly);stats.insects++;}
 placeAnimals();
}
function updateAnimals(t){
 if(!faunaEnabled){for(const a of creatures)a.visible=false;return;}
 core.camera.getWorldDirection(faunaForward);const cp=core.camera.position,start=performance.now(),rm=!!reducedMotion?.matches;
 for(const a of creatures){faunaVec.copy(a.position).sub(cp);const d=faunaVec.length(),front=d<2||faunaVec.dot(faunaForward)>-.3*d,near=d<7;
  a.visible=d<19&&front;if(!a.visible||rm){stats.animalSkipped++;continue;}
  const bird=a.userData.ecologyKind==='bird',interval=bird?(near?70:250):(near?42:125);
  if(t-(a.userData.ecologyLastTick||0)<interval){stats.animalSkipped++;continue;}
  a.userData.ecologyLastTick=t;const h=a.userData.ecologyHome,at=U.t.value*1000;
  if(h){a.position.set(h.x+Math.sin(at*.0007)*.28,h.y+Math.cos(at*.0011)*.12,h.z+Math.cos(at*.0009)*.25);a.rotation.y=at*.0005;}
  a.userData.animate?.(U.t.value,true);stats.animalUpdates++;
 }
 stats.maxAnimalUpdateMs=Math.max(stats.maxAnimalUpdateMs,performance.now()-start);
}
export function install(c){if(core||!c?.world||OFF)return;core=c;window.__sandoEcology={stats,frame,dispose,soilAllowed:(x,z,p)=>soilAllowed(core,x,z,p),setFaunaEnabled(on){faunaEnabled=stats.faunaEnabled=!!on;if(!on)for(const a of creatures)a.visible=false;},get fauna(){return creatures.map(a=>({kind:a.userData.ecologyKind,visible:a.visible,position:a.position.toArray()}));}};}
export async function frame(t=performance.now()){if(OFF||!core||stopped||document.hidden||window.__entryMap?.state.open||!window.__entryFirstFrameAt||t-window.__entryFirstFrameAt<2600)return;core.camera.getWorldPosition(U.viewer.value);U.t.value=reducedMotion?.matches?0:t/1000;const era=document.body.dataset.journeyEra;const active=!era||['auto','now','heisei'].includes(era);if(group)group.visible=active&&core.trees.visible;if(note)note.hidden=!active;if(!active||core.trees.visible===false)return;updateAnimals(t);if(busy)return;busy=stats.busy=true;try{if(!ready){if(!core.ready?.()||!window.__botanicalRealism?.stats.surfacesReady)return;await init();return;}if(t-last<900)return;last=t;let mesh;core.trees.traverse(o=>{if(!mesh&&o.isInstancedMesh&&o.geometry.attributes.aRlSp&&!seen.has(o.material)&&o.material.userData.botanical)mesh=o;});if(mesh){await idle();await warmTree(mesh);return;}if(Math.hypot(anchor.x-core.camera.position.x,anchor.y-core.camera.position.z)>7){await populate();if(stats.points.length)await animals();else for(const a of creatures)a.visible=false;}}catch(e){stats.errors.push(String(e));}finally{busy=stats.busy=false;}}
export function dispose(){stopped=true;U.shape.value=0;for(const x of depthLinks.values()){if(x.mesh.customDepthMaterial===x.depth)x.mesh.customDepthMaterial=x.previous;x.depth.dispose();}depthLinks.clear();note?.remove();for(const t of ownedTextures)t.dispose();ownedTextures.clear();if(group){group.parent?.remove(group);group.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material||[]))m.dispose();});}stats.ready=false;}
window.__sandoEcologyFrame=c=>{if(!core)install(c);frame().catch(e=>stats.errors.push(String(e)));};
