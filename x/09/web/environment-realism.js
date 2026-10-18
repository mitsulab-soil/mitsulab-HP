/* 現代の近景材質。位置・樹種・建物用途を創作しない。既存PBR/写真/接地形状を保持。
   外部取得なし。微細凹凸は材の表現であり、現地表面を計測した形ではない。 */
import * as THREE from 'three';
const enabled={value:new URLSearchParams(location.search).get('environment')==='off'?0:1};
const gravelEnabled={value:new URLSearchParams(location.search).get('gravel')==='off'?0:1};
// OSM way 1258998074 (existing local osm_ground.json), not a surveyed gravel outline.
// 128² local mask is generated only after entry; water polygons are buffered by 2m.
const courtyardPolygon=[[-93.096,-1103.772],[-165.039,-1070.743],[-166.86,-1065.215],[-127.801,-986.187],[-126.232,-985.236],[-122.842,-985.115],[-121.696,-984.628],[-117.522,-980.847],[-115.709,-980.183],[-104.096,-980.67],[-56.606,-1005.847],[-58.148,-1006.732],[-59.717,-1009.187],[-61.538,-1014.417],[-63.594,-1027.266],[-63.107,-1029.842],[-55.849,-1037.837],[-55.308,-1040.291],[-88.498,-1102.445],[-93.096,-1103.772]], courtyardWaters=[[[-46.724,-1023.805],[-46.183,-1024.324],[-41.882,-1029.19],[-38.257,-1032.805],[-37.698,-1033.082],[-36.869,-1033.38],[-34.615,-1033.347],[-34.236,-1032.993],[-34.038,-1032.463],[-34.191,-1031.755],[-38.14,-1026.304],[-41.855,-1021.859],[-42.486,-1020.963],[-45.939,-1015.921],[-46.417,-1015.257],[-49.762,-1011.984],[-53.053,-1008.999],[-53.495,-1008.833],[-55.145,-1008.932],[-55.551,-1009.253],[-55.794,-1010.337],[-55.885,-1012.482],[-55.695,-1013.156],[-54.433,-1016.031],[-51.439,-1020.653],[-50.529,-1021.615],[-46.724,-1023.805]],[[-73.99,-964.99],[-73.683,-966.616],[-76.343,-972.797],[-77.371,-975.981],[-77.948,-978.923],[-77.921,-983.434],[-77.497,-986.431],[-77.046,-988.2],[-76.289,-989.438],[-74.504,-990.699],[-72.655,-991.628],[-71.087,-992.114],[-66.614,-992.136],[-64.315,-991.296],[-62.196,-990.312],[-59.663,-987.216],[-55.56,-979.243],[-49.321,-967.036],[-49.14,-965.024],[-49.257,-963.21],[-49.744,-961.817],[-50.556,-960.368],[-52.404,-958.654],[-54.28,-957.471],[-56.786,-956.863],[-61.745,-956.808],[-63.197,-957.184],[-65.343,-957.847],[-68.49,-959.65],[-70.302,-961.419],[-73.449,-961.474],[-76.136,-958.179],[-74.053,-952.628],[-73.296,-948.272],[-72.845,-943.915],[-73.232,-939.171],[-73.773,-936.65],[-74.612,-934.395],[-76.073,-932.084],[-77.497,-930.436],[-79.012,-928.788],[-80.942,-927.163],[-84.052,-925.151],[-89.877,-922.077],[-91.04,-921.667],[-97.505,-921.701],[-98.74,-921.878],[-107.126,-924.675],[-108.577,-925.007],[-115.322,-925.615],[-127.35,-925.936],[-127.864,-926.079],[-129.496,-928.39],[-130.938,-930.558],[-132.516,-934.096],[-133.661,-937.192],[-133.968,-938.541],[-134.266,-943.793],[-134.058,-947.464],[-133.535,-951.301],[-129.315,-960.91],[-128.098,-962.115],[-122.057,-965.532],[-117.405,-967.578],[-115.89,-967.998],[-85.802,-968.086],[-83.71,-967.489],[-80.644,-965.897],[-78.823,-964.272],[-73.99,-964.99]]];
const courtyardRect=new THREE.Vector4(-170,-1110,120,140);
const courtyardUniforms={envCourtMask:{value:null},envCourtMap:{value:null},envCourtReady:{value:0},envCourtRect:{value:courtyardRect}};
function insideRing(x,z,p){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function ringDistance(x,z,p){let d=1e9;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));d=Math.min(d,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));}return d;}
async function prepareCourtyard(map){
 if(courtyardUniforms.envCourtReady.value)return;
 const started=performance.now(),n=128,data=new Uint8Array(n*n*4);let slice=started,maxSlice=0;
 for(let j=0;j<n;j++){
  for(let i=0;i<n;i++){
   const x=-170+(i+.5)*120/n,z=-1110+(j+.5)*140/n;
   const safe=insideRing(x,z,courtyardPolygon)&&ringDistance(x,z,courtyardPolygon)>1&&!courtyardWaters.some(p=>insideRing(x,z,p)||ringDistance(x,z,p)<2);
   data[(j*n+i)*4]=safe?255:0;data[(j*n+i)*4+3]=255;
  }
  if((j+1)%16===0){maxSlice=Math.max(maxSlice,performance.now()-slice);if(j<n-1)await new Promise(resolve=>setTimeout(resolve,0));slice=performance.now();}
 }
 const mask=new THREE.DataTexture(data,n,n);mask.name='courtyard-mask';stats.courtyardBuildMs=performance.now()-started;stats.courtyardMaxSliceMs=maxSlice;
 mask.minFilter=mask.magFilter=THREE.LinearFilter;mask.needsUpdate=true;upload(mask);
 courtyardUniforms.envCourtMask.value=mask;courtyardUniforms.envCourtMap.value=map;courtyardUniforms.envCourtReady.value=1;stats.courtyardReady=true;stats.courtyardMaskBytes=data.byteLength;
}
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
uniform float envDetailEnabled;uniform float envGravelEnabled;
varying vec3 vEnvDetailP;
float envDetailHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float envDetailNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(envDetailHash(i),envDetailHash(i+vec2(1.,0.)),f.x),mix(envDetailHash(i+vec2(0.,1.)),envDetailHash(i+vec2(1.,1.)),f.x),f.y);}
vec3 envDetailBump(vec3 n,float height){vec3 qx=dFdx(-vViewPosition),qy=dFdy(-vViewPosition);vec3 rx=cross(qy,n),ry=cross(n,qx);float d=dot(qx,rx);return normalize(max(abs(d),1e-7)*n-sign(d)*(dFdx(height)*rx+dFdy(height)*ry));}
`;
// A local material inference from retained map pixels, not a gravel survey.
// Canopy is a model from tree positions; it must not overwrite a clearly neutral, bright courtyard.
const COURT_GLSL=`
uniform sampler2D envCourtMask,envCourtMap; uniform float envCourtReady,envCourtPast; uniform vec4 envCourtRect;
float envCourtSurface(vec3 photo,vec3 p,float detail){
 if(envCourtReady<.5||envDetailEnabled<.5||envGravelEnabled<.5||detail<.5||envCourtPast>.001)return 0.;
 float nearCourt=1.-smoothstep(15.,55.,distance(p,cameraPosition));
 if(nearCourt<.001)return 0.;
 vec2 cu=(p.xz-envCourtRect.xy)/envCourtRect.zw;
 if(cu.x<=0.||cu.x>=1.||cu.y<=0.||cu.y>=1.)return 0.;
 float cm=texture2D(envCourtMask,cu).r;
 if(cm<.001)return 0.;
 float mx=max(photo.r,max(photo.g,photo.b)),mn=min(photo.r,min(photo.g,photo.b));
 float sat=(mx-mn)/max(mx,.001),lum=dot(photo,vec3(.2126,.7152,.0722));
 // Low-chroma gray with a small green bias is not automatically vegetation.
 float greenExcess=photo.g/max(max(photo.r,photo.b),.001)-1.;
 float vegetation=smoothstep(.18,.38,sat)*smoothstep(.08,.30,greenExcess);
 float neutral=1.-smoothstep(.16,.34,sat),bright=smoothstep(.16,.34,lum);
 return cm*neutral*bright*(1.-vegetation)*nearCourt;
}
`;
function decorate(mat,kind){const old=mat.onBeforeCompile,key=mat.customProgramCacheKey();const candidate=mat.clone();candidate.onBeforeCompile=(sh,r)=>{
 old?.call(mat,sh,r);sh.uniforms.envDetailEnabled=enabled;sh.uniforms.envGravelEnabled=gravelEnabled;
 if(kind==='ground'){Object.assign(sh.uniforms,courtyardUniforms);
  // A later wrapper may add uSlK after this hook returns; read its live shared value.
  sh.uniforms.envCourtPast={get value(){return sh.uniforms.uSlK?.value||0;}};
 }
 const reuseWorld=/varying\s+vec3\s+vW\s*;/.test(sh.vertexShader)&&/varying\s+vec3\s+vW\s*;/.test(sh.fragmentShader);
 if(!reuseWorld)sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vEnvDetailP;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 {vec4 envP=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 envP=instanceMatrix*envP;
 #endif
 vEnvDetailP=(modelMatrix*envP).xyz;}`);
 const header=reuseWorld?GLSL.replace('varying vec3 vEnvDetailP;','#define vEnvDetailP vW'):GLSL;
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+header+(kind==='ground'?COURT_GLSL:''));
 if(kind==='ground'){
  const floorMix='diffuseColor.rgb = mix(diffuseColor.rgb, fl, fg * .8);';
  if(!sh.fragmentShader.includes('#include <map_fragment>')||!sh.fragmentShader.includes(floorMix))throw new Error('courtyard: original ground/floor composition unavailable');
  // One weight, before both the existing forest-floor mix and the pebble mix.
  sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float envCourtWeight=envCourtSurface(texture2D(map,vMapUv).rgb,vEnvDetailP,useDetail);`)
   .replace(floorMix,'fg *= 1.-envCourtWeight;\n'+floorMix);
 }
 const building=kind==='building',wood=kind==='wood',soil=kind==='ground',gravel=mat.userData.roadTexture==='Gravel023',sand=mat.userData.roadTexture==='gravelly_sand';
 const detail=`
 float envNear=(1.-smoothstep(${wood?'8.,24.':'15.,55.'},distance(vEnvDetailP,cameraPosition)))*envDetailEnabled;
 float envHeight=0.,envGrain=.5,envFine=0.;
 if(envNear>0.){
   vec3 envN=normalize(cross(dFdx(vEnvDetailP),dFdy(vEnvDetailP)));
   vec2 envUV=abs(envN.y)>.6?vEnvDetailP.xz:(abs(envN.x)>abs(envN.z)?vEnvDetailP.zy:vEnvDetailP.xy);
   float envFoot=max(length(dFdx(envUV)),length(dFdy(envUV)));
   envFine=(1.-smoothstep(.012,.055,envFoot))*envNear;
   float envMacro=envDetailNoise(envUV*.43)+envDetailNoise(envUV*.11+17.)-1.;
   envGrain=envDetailNoise(envUV*${wood?'42.':soil?'57.':'68.'});
   float envBody=${building?'(1.-win)*(1.-step(.5,uMach))':'1.'};
   diffuseColor.rgb*=1.+envMacro*${building?'.105':wood?'.045':'.07'}*envNear*envBody;
   roughnessFactor=clamp(roughnessFactor+(envGrain-.5)*.07*envFine*envBody,.08,1.);
   envHeight=(envGrain-.5)*${wood?'.0012':soil?'.0014':'.0006'}*envFine*envBody;
   ${building?'envHeight-=.018*win*envNear*(1.-step(.5,uMach));':''}
 }
 ${soil?`
 // Shared court weight already reduced only the inferred forest-floor overlay.
 if(envCourtWeight>.001){
  vec3 pebbles=texture2D(envCourtMap,vEnvDetailP.xz/1.5).rgb;
  float pl=dot(pebbles,vec3(.2126,.7152,.0722));
  diffuseColor.rgb=mix(diffuseColor.rgb,pebbles*vec3(.86,.86,.83),envCourtWeight*.94);
  roughnessFactor=mix(roughnessFactor,.96,envCourtWeight);
  envHeight+=(pl-.40)*.011*envCourtWeight;
 }
 `:''}
 ${gravel||sand?`
 // Existing CC0 white pebbles / compacted sand, not an emissive white plane.
 float envGravelNear=(1.-smoothstep(35.,100.,distance(vEnvDetailP,cameraPosition)))*envGravelEnabled*envDetailEnabled;
 if(envGravelNear>.001){
  float envPebbleL=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
  float envStone=envPebbleL;
  #ifdef USE_MAP
  envStone=dot(texture2D(map,vMapUv).rgb,vec3(.2126,.7152,.0722));
  #endif
  float envPebbleContrast=clamp(.91+(envStone-.42)*1.15,.58,1.15);
  vec3 envPebbleTint=${gravel?'vec3(.84,.84,.81)*envPebbleContrast':'vec3(.91,.89,.84)'};
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*envPebbleTint,envGravelNear);
  roughnessFactor=mix(roughnessFactor,${gravel?'.94':'.96'},envGravelNear);
  envHeight+=(envGrain-.5)*${gravel?'.0022':'.0007'}*envFine*envGravelEnabled;
 }
 `:''}
 `;
 sh.fragmentShader=sh.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n'+detail).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nif(envNear>0.)normal=envDetailBump(normal,envHeight);');
 };candidate.customProgramCacheKey=()=>key+'|environment-realism-'+kind+(mat.userData.roadTexture==='Gravel023'||mat.userData.roadTexture==='gravelly_sand'?'-gravel-2':kind==='ground'?'-courtyard-2':'-1');return candidate;}
async function refine(mat,mesh,kind){if(done.has(mat))return;const candidate=decorate(mat,kind);let proxy;
 if(mesh?.isInstancedMesh){proxy=new THREE.InstancedMesh(mesh.geometry,candidate,1);if(mesh.instanceColor)proxy.setColorAt(0,new THREE.Color(1,1,1));}else proxy=new THREE.Mesh(mesh.geometry,candidate);
 // Compile off the live scene first. Publishing reuses the same program key;
 // the original material identity/uniforms/time and sensory hooks stay intact.
 await core.renderer.compileAsync(proxy,core.camera,core.scene);stats.compiles++;
 mat.onBeforeCompile=candidate.onBeforeCompile;mat.customProgramCacheKey=candidate.customProgramCacheKey;mat.needsUpdate=true;done.add(mat);keepPrograms.add(candidate);mat.addEventListener('dispose',()=>{candidate.dispose();keepPrograms.delete(candidate);});proxy.dispose?.();
 if(mat.userData.roadTexture==='Gravel023'||mat.userData.roadTexture==='gravelly_sand')stats.gravelMaterials=(stats.gravelMaterials||0)+1;
 stats.materials++;stats.families[kind]=(stats.families[kind]||0)+1;
}
function queueMaterial(mat,mesh,kind){if(!mat?.isMeshStandardMaterial||done.has(mat)||queued.has(mat)||mat.transparent||mat.opacity<1||mat.alphaTest>0)return;queued.add(mat);addJob('refine-'+kind,()=>refine(mat,mesh,kind)).catch(()=>queued.delete(mat));}
function scan(){if(!core)return;
 if(core.buildings&&core.bMat){let sample;core.buildings.traverse(o=>{if(!sample&&o.isMesh)sample=o;});if(sample)queueMaterial(core.bMat,sample,'building');}
 core.road?.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material)){if(m?.userData.roadTexture)queueMaterial(m,o,'road');if(m?.userData.roadTexture==='Gravel023'&&(m.map?.image?.width||m.map?.image?.naturalWidth||0)>2&&!courtyardUniforms.envCourtReady.value&&!stats.courtyardQueued){stats.courtyardQueued=true;addJob('courtyard-mask',()=>prepareCourtyard(m.map)).catch(()=>{stats.courtyardQueued=false;});}}});
 core.trees?.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m?.map&&!m.userData.leaf&&m.normalMap)queueMaterial(m,o,'wood');});
 const terrain=core.terrain;if(terrain)queueMaterial(terrain.material,terrain,'ground');
}
export function environmentFrame(c){core=c;if(!core||!window.__entryFirstFrameAt)return;const now=performance.now();lastFrame=now;if(now-__entryFirstFrameAt<1600)return;if(now>nextScan){nextScan=now+1800;scan();}schedule();}
window.__environmentRealism={replaceTextureSources,warmTextures,warmGroup,setEnabled(on){enabled.value=on?1:0;},setGravelEnabled(on){gravelEnabled.value=on?1:0;},status:()=>({...stats,families:{...stats.families},errors:[...stats.errors],uploadLog:[...stats.uploadLog],pendingLabels:jobs.slice(0,8).map(j=>j.label),enabled:!!enabled.value,gravelEnabled:!!gravelEnabled.value,pending:jobs.length,busy,firstFrameAt:window.__entryFirstFrameAt||0,lastFrame})};
