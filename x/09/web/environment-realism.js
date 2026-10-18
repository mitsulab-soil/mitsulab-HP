/* 現代の近景材質。位置・樹種・建物用途を創作しない。既存PBR/写真/接地形状を保持。
   外部取得なし。微細凹凸は材の表現であり、現地表面を計測した形ではない。 */
import * as THREE from 'three';
const enabled={value:new URLSearchParams(location.search).get('environment')==='off'?0:1};
const done=new WeakSet(),queued=new WeakSet(),warmVersions=new WeakMap(),keepPrograms=new Set(),jobs=[];
let core,busy=false,scheduled=false,nextJob=0,nextScan=0,lastFrame=0,sourceStreak=0;
const stats={materials:0,families:{},queued:0,completed:0,uploads:0,compiles:0,maxJobMs:0,maxUploadMs:0,slowUploads:0,errors:[],meshesAdded:0,texturesDownloaded:0,bitmapPreparations:0,maxBitmapWaitMs:0,uploadLog:[]};
function addJob(label,run){stats.queued++;const promise=new Promise((resolve,reject)=>{const job={label,run,resolve,reject};const at=label==='texture-source'?jobs.findIndex(j=>j.label!=='texture-source'):-1;if(at>=0)jobs.splice(at,0,job);else jobs.push(job);});schedule();return promise;}
function schedule(){if(scheduled||busy||!core||!jobs.length||document.hidden)return;scheduled=true;const wait=Math.max(0,nextJob-performance.now());setTimeout(()=>{const idle=window.requestIdleCallback||((f)=>setTimeout(f,20));idle(runNext,{timeout:600});},wait);}
async function runNext(){scheduled=false;if(busy||!core||document.hidden)return;if(!window.__entryFirstFrameAt||performance.now()-__entryFirstFrameAt<1600){nextJob=performance.now()+200;schedule();return;}const refinement=jobs.findIndex(j=>j.label.startsWith('refine-'));const pick=sourceStreak>=3&&refinement>=0?refinement:0;const job=jobs.splice(pick,1)[0];if(!job)return;sourceStreak=job.label==='texture-source'?sourceStreak+1:0;busy=true;const at=performance.now();try{job.resolve(await job.run());stats.completed++;}catch(e){stats.errors.push(job.label+': '+e.message);job.reject(e);}finally{stats.maxJobMs=Math.max(stats.maxJobMs,performance.now()-at);busy=false;nextJob=performance.now()+120;schedule();}}
// One source change / GPU texture transfer per job, rather than all new maps
// becoming visible together in the next render. Initial entry never waits here.
const preparedSources=new WeakMap();
async function preparedSource(image,flip){
 if(typeof createImageBitmap!=='function'||(typeof ImageBitmap==='function'&&image instanceof ImageBitmap))return new THREE.Source(image);
 let byFlip=preparedSources.get(image);if(!byFlip){byFlip=new Map();preparedSources.set(image,byFlip);}const key=!!flip;
 if(!byFlip.has(key)){const at=performance.now();byFlip.set(key,createImageBitmap(image,{imageOrientation:flip?'flipY':'none',premultiplyAlpha:'none',colorSpaceConversion:'none'}).then(bitmap=>{stats.bitmapPreparations++;stats.maxBitmapWaitMs=Math.max(stats.maxBitmapWaitMs,performance.now()-at);return new THREE.Source(bitmap);}).catch(()=>new THREE.Source(image)));}
 return byFlip.get(key);
}
export async function replaceTextureSources(textures,image,{flipY}={}){
 const sources=new Map();for(const texture of [...new Set(textures)]){const flip=flipY===undefined?texture.flipY:flipY;if(!sources.has(flip))sources.set(flip,await preparedSource(image,flip));const source=sources.get(flip);await addJob('texture-source',()=>{texture.dispose();texture.source=source;if(flipY!==undefined)texture.flipY=flipY;texture.needsUpdate=true;upload(texture);}).catch(()=>{});}
}

function upload(texture){if(!texture?.image)return;const version=texture.version;if(warmVersions.get(texture)===version)return;const at=performance.now();core.renderer.initTexture(texture);const ms=performance.now()-at;warmVersions.set(texture,version);stats.uploads++;stats.maxUploadMs=Math.max(stats.maxUploadMs,ms);if(ms>16.7)stats.slowUploads++;const image=texture.image;stats.uploadLog.push({name:texture.name||String(image.src||'').split('/').pop(),width:image.naturalWidth||image.width,height:image.naturalHeight||image.height,ms,at:performance.now()});if(stats.uploadLog.length>80)stats.uploadLog.shift();}
export async function warmTextures(textures){for(const t of [...new Set(textures)])await addJob('texture-warm',()=>upload(t)).catch(()=>{});}
export async function warmGroup(group){
 if(!core)return;const textures=new Set(),representatives=new Map();group.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material||[])){if(!m)continue;for(const slot of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap'])if(m[slot]?.image)textures.add(m[slot]);const key=m.uuid+':'+!!o.isInstancedMesh+':'+!!o.isSkinnedMesh;if(!representatives.has(key))representatives.set(key,o);}});
 for(const t of textures)await addJob('texture-warm',()=>upload(t)).catch(()=>{});
 for(const mesh of representatives.values())await addJob('material-warm',async()=>{await core.renderer.compileAsync(mesh,core.camera,core.scene);stats.compiles++;}).catch(()=>{});
}
const GLSL=`
uniform float envDetailEnabled;
varying vec3 vEnvDetailP;
float envDetailHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float envDetailNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(envDetailHash(i),envDetailHash(i+vec2(1.,0.)),f.x),mix(envDetailHash(i+vec2(0.,1.)),envDetailHash(i+vec2(1.,1.)),f.x),f.y);}
vec3 envDetailBump(vec3 n,float height){vec3 qx=dFdx(-vViewPosition),qy=dFdy(-vViewPosition);vec3 rx=cross(qy,n),ry=cross(n,qx);float d=dot(qx,rx);return normalize(max(abs(d),1e-7)*n-sign(d)*(dFdx(height)*rx+dFdy(height)*ry));}
`;
function decorate(mat,kind){const old=mat.onBeforeCompile,key=mat.customProgramCacheKey();const candidate=mat.clone();candidate.onBeforeCompile=(sh,r)=>{
 old?.call(mat,sh,r);sh.uniforms.envDetailEnabled=enabled;
 const reuseWorld=/varying\s+vec3\s+vW\s*;/.test(sh.vertexShader)&&/varying\s+vec3\s+vW\s*;/.test(sh.fragmentShader);
 if(!reuseWorld)sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vEnvDetailP;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 {vec4 envP=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 envP=instanceMatrix*envP;
 #endif
 vEnvDetailP=(modelMatrix*envP).xyz;}`);
 const header=reuseWorld?GLSL.replace('varying vec3 vEnvDetailP;','#define vEnvDetailP vW'):GLSL;
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+header);
 const building=kind==='building',wood=kind==='wood',soil=kind==='ground';
 const detail=`
 float envNear=(1.-smoothstep(${wood?'8.,24.':'15.,55.'},distance(vEnvDetailP,cameraPosition)))*envDetailEnabled;
 float envHeight=0.;
 if(envNear>0.){
   vec3 envN=normalize(cross(dFdx(vEnvDetailP),dFdy(vEnvDetailP)));
   vec2 envUV=abs(envN.y)>.6?vEnvDetailP.xz:(abs(envN.x)>abs(envN.z)?vEnvDetailP.zy:vEnvDetailP.xy);
   float envFoot=max(length(dFdx(envUV)),length(dFdy(envUV)));
   float envFine=(1.-smoothstep(.012,.055,envFoot))*envNear;
   float envMacro=envDetailNoise(envUV*.43)+envDetailNoise(envUV*.11+17.)-1.;
   float envGrain=envDetailNoise(envUV*${wood?'42.':soil?'57.':'68.'});
   float envBody=${building?'(1.-win)*(1.-step(.5,uMach))':'1.'};
   diffuseColor.rgb*=1.+envMacro*${building?'.105':wood?'.045':'.07'}*envNear*envBody;
   roughnessFactor=clamp(roughnessFactor+(envGrain-.5)*.07*envFine*envBody,.08,1.);
   envHeight=(envGrain-.5)*${wood?'.0012':soil?'.0014':'.0006'}*envFine*envBody;
   ${building?'envHeight-=.018*win*envNear*(1.-step(.5,uMach));':''}
 }
 `;
 sh.fragmentShader=sh.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n'+detail).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nif(envNear>0.)normal=envDetailBump(normal,envHeight);');
 };candidate.customProgramCacheKey=()=>key+'|environment-realism-'+kind+'-1';return candidate;}
async function refine(mat,mesh,kind){if(done.has(mat))return;const candidate=decorate(mat,kind);let proxy;
 if(mesh?.isInstancedMesh){proxy=new THREE.InstancedMesh(mesh.geometry,candidate,1);if(mesh.instanceColor)proxy.setColorAt(0,new THREE.Color(1,1,1));}else proxy=new THREE.Mesh(mesh.geometry,candidate);
 // Compile off the live scene first. Publishing reuses the same program key;
 // the original material identity/uniforms/time and sensory hooks stay intact.
 await core.renderer.compileAsync(proxy,core.camera,core.scene);stats.compiles++;
 mat.onBeforeCompile=candidate.onBeforeCompile;mat.customProgramCacheKey=candidate.customProgramCacheKey;mat.needsUpdate=true;done.add(mat);keepPrograms.add(candidate);mat.addEventListener('dispose',()=>{candidate.dispose();keepPrograms.delete(candidate);});proxy.dispose?.();
 stats.materials++;stats.families[kind]=(stats.families[kind]||0)+1;
}
function queueMaterial(mat,mesh,kind){if(!mat?.isMeshStandardMaterial||done.has(mat)||queued.has(mat)||mat.transparent||mat.opacity<1||mat.alphaTest>0)return;queued.add(mat);addJob('refine-'+kind,()=>refine(mat,mesh,kind)).catch(()=>queued.delete(mat));}
function scan(){if(!core)return;
 if(core.buildings&&core.bMat){let sample;core.buildings.traverse(o=>{if(!sample&&o.isMesh)sample=o;});if(sample)queueMaterial(core.bMat,sample,'building');}
 core.road?.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m?.userData.roadTexture)queueMaterial(m,o,'road');});
 core.trees?.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m?.map&&!m.userData.leaf&&m.normalMap)queueMaterial(m,o,'wood');});
 const terrain=core.terrain;if(terrain)queueMaterial(terrain.material,terrain,'ground');
}
export function environmentFrame(c){core=c;if(!core||!window.__entryFirstFrameAt)return;const now=performance.now();lastFrame=now;if(now-__entryFirstFrameAt<1600)return;if(now>nextScan){nextScan=now+1800;scan();}schedule();}
window.__environmentRealism={replaceTextureSources,warmTextures,warmGroup,setEnabled(on){enabled.value=on?1:0;},status:()=>({...stats,families:{...stats.families},errors:[...stats.errors],uploadLog:[...stats.uploadLog],pendingLabels:jobs.slice(0,8).map(j=>j.label),enabled:!!enabled.value,pending:jobs.length,busy,firstFrameAt:window.__entryFirstFrameAt||0,lastFrame})};
