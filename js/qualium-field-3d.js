/**
 * A designed place: ground, water, forest and city, connected by perceptual clues.
 * Geometry and motion are illustrative. No measured geography or subjective state.
 * Rendering, visibility, timing, reduced motion and interface belong to the caller.
 */
export function createFieldScene({T,scene,world,camera,host,sprite}){
 const root=new T.Group(),land=new T.Group(),timeLayers=new T.Group(),senses=new T.Group();
 root.name='qualium-place';world.add(root);root.add(timeLayers,land,senses);
 const disposed=new Set(),materials=[],geometries=[],textures=[];
 const ownG=g=>(geometries.push(g),g),ownM=m=>(materials.push(m),m);
 const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
 const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
 const random=i=>{const f=Math.sin(i*127.13+41.7)*43758.5453;return f-Math.floor(f);};
 const color=(hex)=>new T.Color(hex);
 const palette={ground:0x243c38,forest:0x537a60,water:0x397b87,stone:0x8b947e,city:0x5a747a,navy:0x091322,teal:0x89c8bf,gold:0xe6ca92};
 const standard=opts=>ownM(new T.MeshStandardMaterial({roughness:.86,...opts}));
 const lineMaterial=(hex,opacity=.3)=>ownM(new T.LineBasicMaterial({color:hex,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
 const pointMaterial=(hex,size,opacity)=>ownM(new T.PointsMaterial({color:hex,size,map:sprite,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,sizeAttenuation:true}));
 const dummy=new T.Object3D();
 let width=host?.clientWidth||1200,height=host?.clientHeight||740,modeBlend=[1,0,0],lastMode=0;
 const lights=new T.Group();lights.name='qualium-field-lighting';scene.add(lights);
 lights.add(new T.HemisphereLight(0xc0dce5,0x142222,1.6));
 const sun=new T.DirectionalLight(0xf2dcb8,3.1);sun.position.set(-16,23,13);lights.add(sun);
 const rim=new T.DirectionalLight(0x74bdbf,1.8);rim.position.set(12,10,-15);lights.add(rim);
 // Muted, granular material generated locally, rather than an external image.
 const paper=document.createElement('canvas');paper.width=paper.height=128;const ctx=paper.getContext('2d');
 let grain;
 if(ctx){const pixels=ctx.createImageData(128,128);for(let i=0;i<128*128;i++){const n=Math.round(174+random(i)*66);pixels.data.set([n,n-3,n-9,255],i*4);}ctx.putImageData(pixels,0,0);grain=new T.CanvasTexture(paper);grain.colorSpace=T.SRGBColorSpace;grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(14,11);textures.push(grain);}
 const riverX=z=>-2.5+Math.sin(z*.20)*1.85+Math.sin(z*.43)*.36;
 function terrainHeight(x,z){
  const distance=Math.abs(x-riverX(z));
  const hill=1.7*Math.exp(-((x+11)**2/45+(z+7)**2/65))+.7*Math.exp(-((x+13)**2/25+(z-3)**2/40));
  const small=.15*Math.sin(x*.48+z*.23)+.09*Math.cos(z*.7-x*.2);
  const rural=.45+hill+small;
  const urban=.52+.04*Math.sin(z*.3);
  const dry=rural*(1-smooth(1,5,x))+urban*smooth(1,5,x);
  return .12+smooth(.78,2.1,distance)*dry;
 }
 function surfaceGeometry(w=34,d=28,sx=100,sz=82,layer=false){
  const g=ownG(new T.PlaneGeometry(w,d,sx,sz));g.rotateX(-Math.PI/2);const p=g.attributes.position,cols=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i),y=terrainHeight(x,z);p.setY(i,layer?y*.10:y);
   const c=color(palette.ground),riverBank=1-smooth(.9,2.3,Math.abs(x-riverX(z)));
   c.lerp(color(0x697c67),riverBank*.48).lerp(color(0x385245),clamp(y/3)*.6);c.multiplyScalar(.93+random(i)*.13);cols.push(c.r,c.g,c.b);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();return g;
 }
 const groundGeo=surfaceGeometry(),ground=new T.Mesh(groundGeo,standard({...(grain?{map:grain}:{}),vertexColors:true,color:0xd4e1d6,roughness:.98}));land.add(ground);
 // Shaped cut edge gives the terrain weight; a dark base makes the scene read as land.
 function skirt(w,d,bottom,topFn,hex){
  const positions=[],indices=[],colors=[];const edge=[];const n=44;
  for(let i=0;i<n;i++)edge.push([-w/2+i/n*w,-d/2]);for(let i=0;i<n;i++)edge.push([w/2,-d/2+i/n*d]);for(let i=0;i<n;i++)edge.push([w/2-i/n*w,d/2]);for(let i=0;i<n;i++)edge.push([-w/2,d/2-i/n*d]);
  edge.forEach(([x,z],i)=>{positions.push(x,topFn(x,z),z,x,bottom,z);const top=color(hex),base=color(hex).multiplyScalar(.35);colors.push(top.r,top.g,top.b,base.r,base.g,base.b);const a=i*2,b=((i+1)%edge.length)*2;indices.push(a,b,a+1,b,b+1,a+1);});
  const g=ownG(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return new T.Mesh(g,standard({vertexColors:true,side:T.DoubleSide}));
 }
 land.add(skirt(34,28,-1.0,terrainHeight,0x4d5b4d));
 const basal=new T.Mesh(ownG(new T.BoxGeometry(34,1.5,28)),standard({color:0x122126,roughness:1}));basal.position.y=-1.72;land.add(basal);
 // Water has a surface, banks, small waves and a continuous downstream motion.
 const waterCount=110,waterPos=[],waterIndex=[];
 for(let i=0;i<=waterCount;i++){const z=-14+i/waterCount*28,x=riverX(z),half=.67+.09*Math.sin(z*.3);waterPos.push(x-half,.19,z,x+half,.19,z);if(i<waterCount){const a=i*2;waterIndex.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const waterGeo=ownG(new T.BufferGeometry());waterGeo.setAttribute('position',new T.Float32BufferAttribute(waterPos,3));waterGeo.setIndex(waterIndex);waterGeo.computeVertexNormals();
 const waterMat=ownM(new T.MeshPhysicalMaterial({color:palette.water,metalness:.38,roughness:.19,clearcoat:1,clearcoatRoughness:.16,side:T.DoubleSide,emissive:0x0d343b,emissiveIntensity:.18}));
 const water=new T.Mesh(waterGeo,waterMat);land.add(water);
 const flowLines=[];for(let k=0;k<6;k++){const g=ownG(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(new Float32Array(81*3),3));const l=new T.Line(g,lineMaterial(k%2?0x8ad9db:0xc1d9bc,.18));land.add(l);flowLines.push(l);}
 // Forest: individual trunks, several crowns, and soft contact shadows, in four draws.
 const treeData=[];
 for(let i=0;i<144;i++){
  const x=-15.4+random(i*3+8)*16.7,z=-12.6+random(i*5+24)*23.8;
  if(Math.abs(x-riverX(z))<2.15||x>-2.1&&z>2.6||Math.hypot(x+7,z-8)<1.8)continue;
  treeData.push({x,z,y:terrainHeight(x,z),h:1.55+random(i*9)*1.85,r:.57+random(i*13)*.38,seed:i});
 }
 const trunkG=ownG(new T.CylinderGeometry(.075,.14,1,7)),trunkMat=standard({color:0x655e49,roughness:1}),trunks=new T.InstancedMesh(trunkG,trunkMat,treeData.length);land.add(trunks);
 const crownG=ownG(new T.IcosahedronGeometry(1,1)),crownMat=standard({color:0xdce6d4,roughness:.92}),crowns=new T.InstancedMesh(crownG,crownMat,treeData.length*5);land.add(crowns);
 const shadowMat=ownM(new T.MeshBasicMaterial({color:0x000000,map:sprite,transparent:true,opacity:.33,depthWrite:false})),shadowG=ownG(new T.PlaneGeometry(1,1));shadowG.rotateX(-Math.PI/2);
 const shadows=new T.InstancedMesh(shadowG,shadowMat,treeData.length);land.add(shadows);
 treeData.forEach((t,i)=>{
  dummy.position.set(t.x,t.y+t.h*.46,t.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,t.h*.92,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  dummy.position.set(t.x,t.y+.025,t.z);dummy.scale.set(t.r*3,1,t.r*2.5);dummy.updateMatrix();shadows.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<5;j++){
   const a=j/5*Math.PI*2+t.seed*.3;dummy.position.set(t.x+Math.cos(a)*t.r*.36,t.y+t.h*(.65+random(t.seed*12+j)*.3),t.z+Math.sin(a)*t.r*.3);dummy.rotation.set(random(t.seed+j)*.3,a,random(t.seed*3+j)*.2);dummy.scale.set(t.r*(j? .8:1.1),t.r*(1.1+random(j+t.seed)*.35),t.r*.8);dummy.updateMatrix();crowns.setMatrixAt(i*5+j,dummy.matrix);
   const c=color(palette.forest).lerp(color(0x8b9d6e),random(t.seed*27+j)*.38).multiplyScalar(.74+random(t.seed+j)*.35);crowns.setColorAt(i*5+j,c);
  }
 });
 // Low-rise streets, varied roofs and warm windows. All geometry is original.
 const buildings=[],cityZ=-9.3;
 for(let r=0;r<5;r++)for(let c=0;c<6;c++){
  if((r===2&&c<2)||(r===4&&c===5))continue;
  const x=4.3+c*1.6,z=cityZ+r*1.85,h=.8+random(r*6+c+110)*2.3;
  buildings.push({x,z,y:terrainHeight(x,z),h,w:.85+random(c*7+r)*.28,d:1.08,seed:r*6+c});
 }
 const cityMat=standard({color:0xcad6d2,roughness:.7,metalness:.13});const boxG=ownG(new T.BoxGeometry(1,1,1));
 const city=new T.InstancedMesh(boxG,cityMat,buildings.length);land.add(city);
 const roofG=ownG(new T.ConeGeometry(.72,.52,4));roofG.rotateY(Math.PI/4);const roofs=new T.InstancedMesh(roofG,standard({color:0x283e48,roughness:.73,metalness:.22}),buildings.length);land.add(roofs);
 const windowG=ownG(new T.PlaneGeometry(1,1)),windowMat=ownM(new T.MeshBasicMaterial({color:0xdbd6ad,transparent:true,opacity:.52,toneMapped:false}));const windows=new T.InstancedMesh(windowG,windowMat,buildings.length*6);land.add(windows);
 buildings.forEach((b,i)=>{
  dummy.position.set(b.x,b.y+b.h/2,b.z);dummy.rotation.set(0,0,0);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();city.setMatrixAt(i,dummy.matrix);city.setColorAt(i,color(palette.city).lerp(color(0xa3987d),random(b.seed+44)*.4));
  dummy.position.y=b.y+b.h+.17;dummy.scale.set(b.w*1.12,.7,b.d*1.12);dummy.updateMatrix();roofs.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<6;j++){dummy.position.set(b.x+((j%3)-1)*b.w*.25,b.y+b.h*(j<3?.34:.72),b.z+b.d*.5+.012);dummy.rotation.set(0,0,0);dummy.scale.set(.12,.19,1);dummy.updateMatrix();windows.setMatrixAt(i*6+j,dummy.matrix);}
 });
 const roadMat=standard({color:0x39494b,roughness:.98});
 for(let r=0;r<5;r++){const z=cityZ+r*1.85+.79;const road=new T.Mesh(ownG(new T.PlaneGeometry(10.8,.35)),roadMat);road.rotation.x=-Math.PI/2;road.position.set(8.3,terrainHeight(8.3,z)+.03,z);land.add(road);}
 // A small bridge links lived space to the river bank.
 const bz=2.6,bx=riverX(bz),bridge=new T.Group();bridge.position.set(bx,.71,bz);land.add(bridge);
 const deck=new T.Mesh(ownG(new T.BoxGeometry(4.1,.18,.74)),standard({color:0x929079,roughness:.9}));bridge.add(deck);
 const postG=ownG(new T.CylinderGeometry(.035,.045,.47,6)),posts=new T.InstancedMesh(postG,standard({color:0x897e64,roughness:.8}),18);bridge.add(posts);
 for(let i=0;i<18;i++){dummy.position.set(-1.92+(i%9)*.48,.31,i<9?-.30:.30);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix);}
 for(const side of [-1,1]){const beam=new T.Mesh(ownG(new T.BoxGeometry(4,.055,.055)),standard({color:0xb3a58a,roughness:.7}));beam.position.set(0,.54,side*.3);bridge.add(beam);}
 // Stones and an unobtrusive observation point in the foreground.
 const rockG=ownG(new T.DodecahedronGeometry(1,0)),rocks=new T.InstancedMesh(rockG,standard({color:palette.stone,roughness:.96}),26);land.add(rocks);
 for(let i=0;i<26;i++){const z=-12+random(i*31)*25,x=riverX(z)+(i%2?1:-1)*(1.2+random(i+62)*.45),r=.12+random(i+74)*.23;dummy.position.set(x,terrainHeight(x,z)+r*.3,z);dummy.scale.set(r*1.4,r*.55,r);dummy.rotation.set(.3,i*.7,.2);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}
 const observer=new T.Vector3(-7,terrainHeight(-7,8)+.18,8),waterPoint=new T.Vector3(riverX(4),.4,4),forestPoint=new T.Vector3(-9,terrainHeight(-9,-4)+2.6,-4),cityPoint=new T.Vector3(8,terrainHeight(8,-5)+2,-5);
 const anchors=[observer,waterPoint,forestPoint,cityPoint],anchorPoints=new Float32Array(anchors.flatMap(v=>v.toArray())),anchorG=ownG(new T.BufferGeometry());anchorG.setAttribute('position',new T.BufferAttribute(anchorPoints,3));const anchorGlow=new T.Points(anchorG,pointMaterial(palette.gold,.6,.85));land.add(anchorGlow);
 const pin=new T.Mesh(ownG(new T.CylinderGeometry(.025,.025,.85,8)),ownM(new T.MeshBasicMaterial({color:palette.gold,transparent:true,opacity:.75})));pin.position.copy(observer).add(new T.Vector3(0,.42,0));land.add(pin);
 const footstones=new T.InstancedMesh(rockG,standard({color:0x9b9b83,roughness:.92}),5);land.add(footstones);
 for(let i=0;i<5;i++){const x=-7+(i-2)*.45,z=8.7+Math.sin(i)*.18;dummy.position.set(x,terrainHeight(x,z)+.05,z);dummy.scale.set(.20,.06,.24);dummy.rotation.set(0,i*.6,0);dummy.updateMatrix();footstones.setMatrixAt(i,dummy.matrix);}
 // Connections follow water and terrain before becoming a fine data arc above the town.
 const routes=[
  new T.CatmullRomCurve3([observer,observer.clone().add(new T.Vector3(1.4,.5,-.8)),waterPoint]),
  new T.CatmullRomCurve3([waterPoint,new T.Vector3(riverX(0),1.0,0),new T.Vector3(-6,2.5,-3),forestPoint]),
  new T.CatmullRomCurve3([forestPoint,new T.Vector3(-3,6,-6),new T.Vector3(3,5.5,-6),cityPoint])
 ];
 const routeLines=[];routes.forEach((route,i)=>{const l=new T.Line(ownG(new T.BufferGeometry().setFromPoints(route.getPoints(72))),lineMaterial(i===2?palette.gold:palette.teal,.23));land.add(l);routeLines.push(l);});
 const signalCount=90,signalArray=new Float32Array(signalCount*3),signalGeo=ownG(new T.BufferGeometry());signalGeo.setAttribute('position',new T.BufferAttribute(signalArray,3));const signal=new T.Points(signalGeo,pointMaterial(0xc8e7d3,.17,.82));land.add(signal);
 // Sparse ground contours provide scale without turning the entire landscape into wireframe.
 const contours=new T.Group();land.add(contours);
 for(let j=0;j<6;j++){const pts=[];for(let i=0;i<=70;i++){const x=-16+i/70*31,z=-11+j*4.1;pts.push(new T.Vector3(x,terrainHeight(x,z)+.035,z));}const l=new T.Line(ownG(new T.BufferGeometry().setFromPoints(pts)),lineMaterial(0x76aaad,.10));contours.add(l);}
 // Solid, separated strata are revealed only in the temporal reading of the place.
 const strata=[];
 for(let k=0;k<4;k++){
  const layer=new T.Group(),g=surfaceGeometry(33-k*.15,27-k*.15,34,28,true),mat=standard({color:[0x475655,0x5a6660,0x777667,0x8b856d][k],vertexColors:false,transparent:true,opacity:0,roughness:.91,side:T.DoubleSide});
  const top=new T.Mesh(g,mat);layer.add(top);
  const wall=skirt(33-k*.15,27-k*.15,-.24,(x,z)=>terrainHeight(x,z)*.10,[0x384b50,0x54615b,0x6a6957,0x7b735c][k]);wall.material.transparent=true;wall.material.opacity=0;layer.add(wall);
  const edgePts=[];for(let i=0;i<=80;i++){const x=-16.4+i/80*32.8,z=13.35-k*.075;edgePts.push(new T.Vector3(x,terrainHeight(x,z)*.1+.025,z));}const edge=new T.Line(ownG(new T.BufferGeometry().setFromPoints(edgePts)),lineMaterial(k===3?palette.gold:palette.teal,0));layer.add(edge);
  timeLayers.add(layer);strata.push({group:layer,mat,wall:wall.material,edge:edge.material});
 }
 // In the sensory mode, one synthetic signal is mapped into light, waves and pulses.
 const senseWaves=[];
 for(let k=0;k<3;k++){
  const g=ownG(new T.BufferGeometry());g.setAttribute('position',new T.BufferAttribute(new Float32Array(96*3),3));const l=new T.Line(g,lineMaterial(k===1?palette.gold:palette.teal,0));senses.add(l);senseWaves.push(l);
 }
 const pulseRings=[];const ringG=ownG(new T.RingGeometry(.96,1,72));ringG.rotateX(-Math.PI/2);
 for(let i=0;i<12;i++){const m=ownM(new T.MeshBasicMaterial({color:i%3===1?palette.gold:palette.teal,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false})),ring=new T.Mesh(ringG,m);senses.add(ring);pulseRings.push(ring);}
 const sparksArray=new Float32Array(180*3);for(let i=0;i<180;i++)sparksArray.set([(random(i*3)-.5)*36,2+random(i*3+1)*7,(random(i*3+2)-.5)*29],i*3);
 const sparksGeo=ownG(new T.BufferGeometry());sparksGeo.setAttribute('position',new T.BufferAttribute(sparksArray,3));const sparks=new T.Points(sparksGeo,pointMaterial(0xa5c6be,.055,.26));root.add(sparks);
 const targetCamera=new T.Vector3(),look=new T.Vector3(),lookCurrent=new T.Vector3(0,1,0);
 function resize(size={}){
  width=Math.max(1,size.width||host?.clientWidth||width);height=Math.max(1,size.height||host?.clientHeight||height);
  camera.aspect=width/height;camera.fov=width/height<.9?49:43;camera.near=.1;camera.far=180;camera.updateProjectionMatrix();
 }
 function update({time=0,dt=0,mode=0,snap=false}={}){
  mode=clamp(Math.round(mode),0,2);const damping=snap?1:1-Math.exp(-Math.max(0,dt)*3);
  for(let i=0;i<3;i++)modeBlend[i]+=(Number(i===mode)-modeBlend[i])*damping;
  if(snap||lastMode!==mode){lastMode=mode;if(snap)modeBlend=[Number(mode===0),Number(mode===1),Number(mode===2)];}
  const temporal=modeBlend[1],sensory=modeBlend[2],cycle=(time%20)/20,expansion=.5-.5*Math.cos(time*.135);
  land.position.y=temporal*4.4;
  // The plateau opens into physical layers; it never claims an actual local geology.
  strata.forEach((s,k)=>{s.group.visible=temporal>.005;s.group.position.y=-2.2+k*.43+temporal*k*.82;s.mat.opacity=temporal*.86;s.wall.opacity=temporal*.9;s.edge.opacity=temporal*.3;});
  const fit=Math.max(1,Math.pow(1.25/(width/height),.85));
  const distance=(1.38+expansion*.10)*fit;
  targetCamera.set((23-temporal*4+Math.sin(time*.045)*1.5)*distance,(20-temporal*2+sensory*2)*distance,(28+temporal*3)*distance);
  if(snap)camera.position.copy(targetCamera);else camera.position.lerp(targetCamera,1-Math.exp(-Math.max(0,dt)*1.3));
  look.set(-1.5+expansion*1.1,(width/height<.9?0:-2)+temporal*1.2,-.5+(.5-expansion)*1.8);if(snap)lookCurrent.copy(look);else lookCurrent.lerp(look,1-Math.exp(-Math.max(0,dt)*1.2));camera.lookAt(lookCurrent);camera.updateMatrixWorld();
  root.rotation.y=.025+Math.sin(time*.045)*.018;
  const wp=waterGeo.attributes.position;for(let i=0;i<wp.count;i++){const z=wp.getZ(i),x=wp.getX(i);wp.setY(i,.19+Math.sin(z*1.3+x*2+time*1.4)*.012);}wp.needsUpdate=true;
  flowLines.forEach((l,k)=>{const p=l.geometry.attributes.position;for(let i=0;i<p.count;i++){const z=-14+i/(p.count-1)*28,x=riverX(z)+(k-2.5)*.19+Math.sin(z*.9-time*.4+k)*.03;p.setXYZ(i,x,.225+Math.sin(z*1.3+time*1.4)*.008,z);}p.needsUpdate=true;l.material.opacity=.1+((Math.sin(time*.6+k)+1)/2)*.12;});
  // A bright wave reaches each connection in order: foot -> water -> forest -> city.
  const travel=cycle*4.1;
  for(let i=0;i<signalCount;i++){
   const pathIndex=Math.floor(i/30),local=(i%30)/29,head=travel-pathIndex,weight=Math.max(0,1-Math.abs(local-head)*5.5),p=routes[pathIndex].getPoint(local);
   signalArray[i*3]=p.x;signalArray[i*3+1]=p.y;signalArray[i*3+2]=p.z;
   // Move inactive motes just below the terrain instead of allocating per-point materials.
   if(weight<.03)signalArray[i*3+1]=-4;
  }
  signalGeo.attributes.position.needsUpdate=true;signal.material.opacity=.65+sensory*.3;
  routeLines.forEach((l,i)=>{const active=Math.max(0,1-Math.abs(travel-(i+.55)));l.material.opacity=.12+active*.32+sensory*.12;});
  anchorGlow.material.opacity=.62+.20*Math.sin(time*1.5)**2;anchorGlow.material.size=.46+sensory*.25;
  senses.visible=sensory>.005;senses.position.y=land.position.y;
  const amplitude=.55+.45*Math.sin(time*.62)**2;
  senseWaves.forEach((l,k)=>{const p=l.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=-10+i/(p.count-1)*22;p.setXYZ(i,x,3.3+k*.62+Math.sin(x*.72-time*(1.1+k*.2)+k)*amplitude*(.33+k*.12),4.3-k*2.3);}p.needsUpdate=true;l.material.opacity=sensory*(.27+k*.06);});
  pulseRings.forEach((ring,i)=>{const t=(time*.17+(i%4)*.25)%1,a=anchors[Math.floor(i/4)+1];ring.position.set(a.x,Math.max(.28,terrainHeight(a.x,a.z)+.07)+t*.10,a.z);ring.scale.setScalar(.45+t*2.1);ring.material.opacity=sensory*(1-t)*.20;});
  sparks.material.opacity=.2+sensory*.16;sparks.rotation.y=Math.sin(time*.04)*.025;
  return {mode,illustrative:true};
 }
 resize({width,height});update({time:0,dt:0,mode:0,snap:true});
 function dispose(){world.remove(root);scene.remove(lights);for(const item of [...geometries,...materials,...textures])if(!disposed.has(item)){item.dispose();disposed.add(item);}}
 return {update,resize,dispose};
}
