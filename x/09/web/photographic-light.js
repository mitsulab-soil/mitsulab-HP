/* 朝の直射と空の補助光、および小型固定物の足元の薄い接触陰。
   接触陰は既存模型の底面・地形からの描画上の推定で、実測の陰影ではない。
   初回操作後のみ。既存影map/露出/太陽方向/時間/知覚shaderを変更しない。 */
import * as T from 'three';
const MAX=24, DIST=23, bypass=new URLSearchParams(location.search).get('photoreal')==='off';
let core, sun, sky, source, contact, positions, alphas, next=0, sourceCount=-1, started=false, enabled=new URLSearchParams(location.search).get('photoLight')!=='off';
const entries=[],cache=new WeakMap();
const stats={ready:false,candidates:0,contacts:0,maxSupportGap:0,scanMs:0,updateMs:0,extraDrawCalls:0,addedTriangles:0,errors:[],anchors:[]};
const v=new T.Vector3(),m=new T.Matrix4(),combined=new T.Matrix4();
function light(on){if(!source)return;sun.intensity=source.sun*(on?.92:1);sky.intensity=source.sky*(on?1.18:1);}
function footprint(g){if(cache.has(g))return cache.get(g);g.computeBoundingBox();const box=g.boundingBox,p=g.attributes.position;if(!box||!p){cache.set(g,null);return null;}const h=box.max.y-box.min.y;if(h<.18||h>5){cache.set(g,null);return null;}
 const b=new T.Box3();for(let i=0;i<p.count;i++)if(p.getY(i)<box.min.y+Math.min(.12,h*.08))b.expandByPoint(v.fromBufferAttribute(p,i));
 const size=b.getSize(new T.Vector3());const out=Number.isFinite(b.min.x)&&size.x>.035&&size.z>.035&&size.x<3&&size.z<3?b:null;cache.set(g,out);return out;
}
function candidates(){const at=performance.now();entries.length=0;sourceCount=(core.structures?.children.length||0)+(core.props?.children.length||0);for(const group of [core.structures,core.props])group?.traverse(o=>{if(!o.isMesh||!o.visible||/hedge|leaf|grass|step|fence|root/i.test(o.name)||[].concat(o.material).some(x=>x?.transparent))return;const b=footprint(o.geometry);if(!b)return;o.updateWorldMatrix(true,false);const n=o.isInstancedMesh?o.count:1;for(let i=0;i<n&&entries.length<4000;i++){
  if(o.isInstancedMesh){o.getMatrixAt(i,m);combined.multiplyMatrices(o.matrixWorld,m);}else combined.copy(o.matrixWorld);
  const wb=b.clone().applyMatrix4(combined),center=wb.getCenter(new T.Vector3()),size=wb.getSize(new T.Vector3());if(size.x>3||size.z>3||size.y>.25)continue;
  entries.push({x:center.x,z:center.z,y:wb.min.y,rx:Math.max(.08,size.x/2+.06),rz:Math.max(.08,size.z/2+.06),mesh:o});
 }});stats.candidates=entries.length;stats.scanMs=performance.now()-at;}
function init(){try{
 sun=core.scene.children.find(o=>o.isDirectionalLight);sky=core.scene.children.find(o=>o.isHemisphereLight);if(!sun||!sky)return;source={sun:sun.intensity,sky:sky.intensity};light(enabled);
 const data=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const r=Math.hypot((x+.5-16)/16,(y+.5-16)/16),a=Math.pow(Math.max(0,1-r*r),3)*.19,i=(y*32+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(a*255);}
 const tex=new T.DataTexture(data,32,32);tex.needsUpdate=true;tex.magFilter=tex.minFilter=T.LinearFilter;
 const g=new T.BufferGeometry();positions=new Float32Array(MAX*18);alphas=new Float32Array(MAX*24);const uv=new Float32Array(MAX*12),u=[0,0,1,0,1,1,0,0,1,1,0,1];for(let i=0;i<MAX;i++)uv.set(u,i*12);
 g.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('color',new T.BufferAttribute(alphas,4).setUsage(T.DynamicDrawUsage));g.setDrawRange(0,0);
 const mat=new T.MeshBasicMaterial({map:tex,color:0x29323b,vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false});
 contact=new T.Mesh(g,mat);contact.name='小型固定物の底面から推定した近景接触陰';contact.frustumCulled=false;contact.renderOrder=1;contact.raycast=()=>{};contact.userData.photographicContact=true;core.world.add(contact);
 candidates();stats.ready=true;
 }catch(e){stats.errors.push(e.message);}}
function visible(o){for(;o;o=o.parent)if(!o.visible)return false;return true;}
function update(){const at=performance.now();if(!contact)return;if(sourceCount!==(core.structures?.children.length||0)+(core.props?.children.length||0))candidates();const era=window.__era?.info?.()?.era,modern=!era||era==='now'||era==='modern'||era==='present';contact.visible=enabled&&modern&&!core.scene.children.some(o=>o.visible&&o.name?.startsWith('era_'))&&core.world.scale.y===1;stats.contacts=0;stats.anchors=[];stats.extraDrawCalls=stats.addedTriangles=0;if(!contact.visible)return;
 const cam=core.camera.position;let count=0,rayBudget=12;stats.maxSupportGap=0;
 const near=entries.filter(e=>visible(e.mesh)&&Math.hypot(e.x-cam.x,e.z-cam.z)<DIST).sort((a,b)=>Math.hypot(a.x-cam.x,a.z-cam.z)-Math.hypot(b.x-cam.x,b.z-cam.z));
 for(const e of near){if(count===MAX)break;const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
 if(e.support===undefined){if(rayBudget--<=0)continue;const y=core.groundY(e.x,e.z),ys=corners.map(([x,z])=>core.groundY(e.x+x*e.rx,e.z+z*e.rz));e.support=Number.isFinite(y)&&Math.abs(e.y-y)<=.08&&ys.every(Number.isFinite)&&Math.max(...ys)-Math.min(...ys)<=.13?{y,ys}:null;}
 if(!e.support)continue;const {y,ys}=e.support;
 if(near.slice(0,near.indexOf(e)).some(a=>Math.hypot(a.x-e.x,a.z-e.z)<.15))continue;
 const order=[0,1,2,0,2,3],distance=Math.hypot(e.x-cam.x,e.z-cam.z),fade=1-T.MathUtils.smoothstep(distance,14,DIST);
 for(let j=0;j<6;j++){const k=order[j],o=(count*6+j)*3;positions[o]=e.x+corners[k][0]*e.rx;positions[o+1]=ys[k]+.012;positions[o+2]=e.z+corners[k][1]*e.rz;const a=(count*6+j)*4;alphas[a]=alphas[a+1]=alphas[a+2]=1;alphas[a+3]=fade;}
 count++;stats.anchors.push({x:e.x,z:e.z,bottom:e.y,support:y,rx:e.rx,rz:e.rz,name:e.mesh.name});stats.maxSupportGap=Math.max(stats.maxSupportGap,Math.abs(e.y-y));
 }
 contact.geometry.setDrawRange(0,count*6);contact.geometry.attributes.position.needsUpdate=true;contact.geometry.attributes.color.needsUpdate=true;stats.contacts=count;stats.extraDrawCalls=count?1:0;stats.addedTriangles=count*2;stats.updateMs=performance.now()-at;
}
window.__photographicLight={setEnabled(on){enabled=!bypass&&!!on;light(enabled);next=0;},status:()=>({...stats,enabled:enabled&&!bypass,bypass,errors:[...stats.errors],sunIntensity:sun?.intensity,skyIntensity:sky?.intensity,original:source&&{...source},exposure:core?.renderer.toneMappingExposure})};
window.__photographicLightFrame=c=>{core=c;if(bypass||!core||!window.__entryFirstFrameAt||performance.now()-__entryFirstFrameAt<2200||document.hidden)return;if(!started){started=true;(window.requestIdleCallback||((f)=>setTimeout(f,100)))(init,{timeout:1200});return;}if(performance.now()<next)return;next=performance.now()+650;update();};
