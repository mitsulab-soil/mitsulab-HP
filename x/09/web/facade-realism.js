/* PLATEAUの位置/輪郭を保つ外壁の推定仕上げ。新しい写真/実測ではない。
   元の材種・高さ・窓配置・時代/知覚shaderを連結し、初回実3D後だけ準備する。 */
import * as THREE from 'three';
const query=new URLSearchParams(location.search),bypass=query.get('photoreal')==='off';
const enabled={value:bypass||query.get('facade')==='off'?0:1};
const state={ready:false,phase:'waiting',errors:[],vertices:0,attributeBytes:0,meshesAdded:0,downloads:0,maxChunkMs:0,compileWaitMs:0,indexSets:0,wallBaseSamples:0,prematureCornice:0};
window.__facadeRealism={setEnabled(on){enabled.value=on?1:0;},status:()=>({...state,enabled:!!enabled.value})};
const idle=()=>new Promise(resolve=>{const next=()=>document.hidden?setTimeout(next,250):(window.requestIdleCallback||((fn)=>setTimeout(fn,30)))(resolve,{timeout:1000});next();});
async function roofAttributes(group){
 // Tiled geometry shares its vertex arrays. Accumulate every distinct
 // index array, then share one small attribute across those tiles.
 const sets=new Map();group.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g?.attributes.position;if(!p||!g.index)return;let set=sets.get(p);if(!set){set={p,geos:new Set(),indices:new Map(),scale:new THREE.Vector3().setFromMatrixScale(o.matrixWorld).y};sets.set(p,set);}set.geos.add(g);set.indices.set(g.index.array,g.index);});
 for(const {p,geos,indices,scale} of sets.values()){
  const top=new Float32Array(p.count);for(let first=0;first<p.count;first+=16384){await idle();const at=performance.now();for(let i=first;i<Math.min(first+16384,p.count);i++)top[i]=p.getY(i);state.maxChunkMs=Math.max(state.maxChunkMs,performance.now()-at);}
  for(const index of indices.values()){state.indexSets++;for(let first=0;first<index.count;first+=49152){await idle();const at=performance.now();for(let i=first;i<Math.min(first+49152,index.count);i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2),y=Math.max(p.getY(a),p.getY(b),p.getY(c));top[a]=Math.max(top[a],y);top[b]=Math.max(top[b],y);top[c]=Math.max(top[c],y);}state.maxChunkMs=Math.max(state.maxChunkMs,performance.now()-at);}
  }
  // Every rendered wall bottom must be separated from its roof line.
  for(const index of indices.values())for(let first=0;first<index.count;first+=49152){await idle();const at=performance.now();for(let i=first;i<Math.min(first+49152,index.count);i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2),low=Math.min(p.getY(a),p.getY(b),p.getY(c)),high=Math.max(p.getY(a),p.getY(b),p.getY(c));if((high-low)*scale<1)continue;for(let k=0;k<3;k++){const j=k===0?a:k===1?b:c;if((p.getY(j)-low)*scale<.05){state.wallBaseSamples++;if((top[j]-p.getY(j))*scale<.2)state.prematureCornice++;}}}state.maxChunkMs=Math.max(state.maxChunkMs,performance.now()-at);}
  const attr=new THREE.BufferAttribute(top,1);for(const g of geos)g.setAttribute('facadeRoofY',attr);state.vertices+=p.count;state.attributeBytes+=top.byteLength;
 }
}
const header=`
uniform float facadeEnabled;
varying float vFacadeRoofY;
float facHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float facNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(facHash(i),facHash(i+vec2(1.,0.)),f.x),mix(facHash(i+vec2(0.,1.)),facHash(i+vec2(1.)),f.x),f.y);}
float facGrid(vec2 q,vec2 metric,float mm){vec2 edge=min(fract(q),1.-fract(q))*metric;float d=min(edge.x,edge.y);return 1.-smoothstep(mm,mm+max(fwidth(d),.001),d);}
vec3 facBump(vec3 n,float h){vec3 x=dFdx(-vViewPosition),y=dFdy(-vViewPosition),rx=cross(y,n),ry=cross(n,x);float d=dot(x,rx);return normalize(max(abs(d),1e-7)*n-sign(d)*(dFdx(h)*rx+dFdy(h)*ry));}
`;
const detail=`
float facHeight=0.;
float facNear=(1.-smoothstep(20.,55.,distance(vW,cameraPosition)))*facadeEnabled*(1.-step(.5,uMach));
if(facNear>0.&&roof<.5&&cls<8.5){
 float fa=abs(nrm.x)>abs(nrm.z)?vW.z:vW.x;
 vec2 uvF=vec2(fa,hgt);float footprint=max(length(dFdx(uvF)),length(dFdy(uvF)));
 float fine=1.-smoothstep(.012,.075,footprint),joints=0.;
 if(cls<.5){joints=facGrid(uvF/vec2(1.8,.9),vec2(1.8,.9),.007);facHeight-=.004*joints*fine;}
 else if(cls<1.5){joints=facGrid(vec2(fa/.235+.5*floor(hgt/.068),hgt/.068),vec2(.235,.068),.003);facHeight-=.005*joints*fine;}
 else if(cls<2.5){float edge=min(fract(hgt/.455),1.-fract(hgt/.455))*.455;joints=1.-smoothstep(.005,.012+fwidth(hgt),edge);facHeight-=.009*joints*fine;}
 else if(cls<3.5){facHeight+=(facNoise(uvF*95.)-.5)*.002*fine;}
 else if(cls<4.5){facHeight+=sin(fa*41.9)*.007*fine;}
 float wallOnly=1.-win;
 diffuseColor.rgb*=1.-joints*.24*fine*wallOnly*facNear;
 // Broad nonperiodic rain marks and splash near the true base elevation.
 float streak=pow(facNoise(vec2(fa*3.1+seed*31.,hgt*.12)),3.);
 float splash=(1.-smoothstep(.05,1.25,hgt))*(.35+.65*facNoise(vec2(fa*2.2,hgt*5.)));
 diffuseColor.rgb*=1.-(.22*streak+.20*splash)*wallOnly*facNear;
 facHeight*=wallOnly;
 float roofGap=max(0.,vFacadeRoofY/uExag-base-hgt);
 float cornice=(1.-smoothstep(.07,.20+fwidth(hgt),roofGap));
 diffuseColor.rgb*=1.-cornice*.32*wallOnly*facNear;
 facHeight+=cornice*.012*wallOnly;
 // Match the existing layout and its occupancy seed exactly.
 float houseF=step(1.5,cls)*step(cls,3.5),fhF=mix(3.2,2.9,houseF),cwF=mix(mix(2.6,3.8,seed),mix(1.6,2.6,seed),houseF);
 vec2 cellF=vec2(floor(fa/cwF),floor(hgt/fhF)),localF=vec2(fract(fa/cwF),fract(hgt/fhF));
 vec2 loF=vec2(mix(.18,.26,houseF),mix(.30,.34,houseF)),hiF=vec2(mix(.82,.74,houseF),mix(.78,.72,houseF));
 if(cls>4.5&&cls<5.5){loF=vec2(.03,.06);hiF=vec2(.97,.96);}
 vec2 sizeF=vec2(cwF,fhF),nearEdge=min((localF-loF)*sizeF,(hiF-localF)*sizeF);float edgeF=min(nearEdge.x,nearEdge.y);
 float occupied=step(.6,hgt)*step(mix(.18,.5,houseF),hsh(cellF+seed*13.))*(1.-nowin)*step(cls,5.5);
 occupied*=1.-shop*step(hgt,3.3);
 float frame=(1.-smoothstep(.035,.06+max(fwidth(edgeF),.001),abs(edgeF)))*occupied*fine;
 float inner=mix(smoothstep(.01,.13,edgeF),1.,shop*step(hgt,3.3)),recess=(1.-inner)*win*fine;
 if(win>.001||frame>.001){
 vec3 faceN=normalize(nrm),V=normalize(cameraPosition-vW);if(dot(faceN,V)<0.)faceN=-faceN;
 vec3 reflected=reflect(-V,faceN);float fresnel=.12+.70*pow(1.-clamp(dot(V,faceN),0.,1.),5.);
 vec3 sky=mix(vec3(.028,.045,.047),vec3(.20,.29,.38),smoothstep(-.15,.5,reflected.y));
 float cloud=smoothstep(.49,.72,facNoise(reflected.xz*5.+reflected.y*3.));sky=mix(sky,vec3(.36,.39,.40),cloud*.4*smoothstep(.05,.55,reflected.y));
 float room=facNoise(cellF*3.+localF*vec2(1.5,2.5)+vec2(dot(V,vec3(faceN.z,0.,-faceN.x)),V.y)*.16);
 vec3 glassF=mix(vec3(.014,.019,.023),vec3(.057,.049,.037),room)*mix(.24,1.,inner);
 glassF=mix(glassF,sky,clamp(.27+fresnel,0.,.9));glassF*=1.-recess*.7;
 float glassMix=win*facNear;
 diffuseColor.rgb=mix(diffuseColor.rgb,glassF,glassMix);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.13,.145,.15)*(.62+.38*step(0.,nearEdge.y-nearEdge.x)),frame*facNear*.9);
 roughnessFactor=mix(roughnessFactor,.16,glassMix);roughnessFactor=mix(roughnessFactor,.38,frame*facNear);
 }
 facHeight+=(frame*.025-win*.055)*fine;
 facHeight*=facNear;
}
`;
async function install(core){
 state.phase='attributes';await roofAttributes(core.buildings);await idle();
 const mat=core.bMat,old=mat.onBeforeCompile,key=mat.customProgramCacheKey(),candidate=mat.clone();
 candidate.onBeforeCompile=(sh,r)=>{old.call(mat,sh,r);if(!sh.fragmentShader.includes('float cls =')||!sh.fragmentShader.includes('float roof ='))throw Error('Existing facade shader contract changed');sh.uniforms.facadeEnabled=enabled;
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float facadeRoofY;varying float vFacadeRoofY;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvFacadeRoofY=(modelMatrix*vec4(position.x,facadeRoofY,position.z,1.)).y;');
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+header).replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n'+detail);
 const existingBump='if(envNear>0.)normal=envDetailBump(normal,envHeight);';if(sh.fragmentShader.includes(existingBump)){sh.fragmentShader=sh.fragmentShader.replace(existingBump,'if(envNear>0.||facNear>0.)normal=envDetailBump(normal,envHeight+facHeight);');state.normalMode='combined-environment-height';}else{sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nif(facNear>0.)normal=facBump(normal,facHeight);');state.normalMode='standalone';}};
 candidate.customProgramCacheKey=()=>key+'|facade-realism-1';let sample;core.buildings.traverse(o=>{if(!sample&&o.isMesh&&o.material===mat)sample=o;});if(!sample)throw Error('No original building mesh');
 state.phase='compile';const at=performance.now();await core.renderer.compileAsync(new THREE.Mesh(sample.geometry,candidate),core.camera,core.scene);state.compileWaitMs=performance.now()-at;
 mat.onBeforeCompile=candidate.onBeforeCompile;mat.customProgramCacheKey=candidate.customProgramCacheKey;mat.needsUpdate=true;mat.addEventListener('dispose',()=>candidate.dispose());state.phase='ready';state.ready=true;
}
if(bypass){state.ready=true;state.phase='bypass';}
else {const timer=setInterval(()=>{const core=window.__core,env=window.__environmentRealism?.status();if(document.hidden||!core?.buildings||!window.__entryFirstFrameAt||performance.now()-__entryFirstFrameAt<3000||!env?.families?.building)return;clearInterval(timer);install(core).catch(e=>{state.phase='failed';state.errors.push(e.message);console.warn('Facade detail unavailable',e);});},400);}
