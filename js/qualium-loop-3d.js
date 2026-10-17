// Human-centred Umwelt. A real, openly licensed head scan; conceptual sensory fields.
export async function createLoopScene({T,world,camera,host,renderer}) {
 const {GLTFLoader}=await import('../vendor/three/examples/jsm/loaders/GLTFLoader.js');
 const base=new URL('../assets/human-scan/',import.meta.url),loader=new T.TextureLoader();
 const [gltf,colorMap,normalMap]=await Promise.all([
  new GLTFLoader().loadAsync(new URL('LeePerrySmith.glb',base).href),
  loader.loadAsync(new URL('Map-COL.jpg',base).href),
  loader.loadAsync(new URL('Infinite-Level_02_Tangent_SmoothUV.jpg',base).href)
 ]);
 colorMap.colorSpace=T.SRGBColorSpace;normalMap.colorSpace=T.NoColorSpace;colorMap.flipY=false;normalMap.flipY=false;
 const root=new T.Group();root.name='human-centred-umwelt';world.add(root);
 const hemi=new T.HemisphereLight(0xdaecf4,0x122235,2.1),key=new T.DirectionalLight(0xffe1bf,3.4),rim=new T.DirectionalLight(0x88cbe0,2.1);
 key.position.set(-4,5,7);rim.position.set(4,2,-3);world.add(hemi,key,rim);
 const skin=new T.MeshStandardMaterial({map:colorMap,normalMap,normalScale:new T.Vector2(.65,.65),roughness:.63,metalness:.02});
 const source=gltf.scene,box=new T.Box3().setFromObject(source),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const heads=[new T.Group(),new T.Group()];heads.forEach((group,i)=>{
  const portrait=source.clone(true);portrait.traverse(o=>{if(o.isMesh){o.material=skin;o.castShadow=false;o.receiveShadow=false;}});
  const scale=2.85/size.y;portrait.scale.setScalar(scale);portrait.position.copy(center).multiplyScalar(-scale);portrait.rotation.y=i?-.18:.18;
  group.add(portrait);root.add(group);
 });
 const anchors=[new T.Object3D(),new T.Object3D()],aoi=new T.Object3D(),ai=new T.Object3D();root.add(...anchors,aoi,ai);
 let seed=9811;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const palette=[0xd7c9a5,0x8cced0,0x7ea3d9,0x9fe6d2,0xc7b8df,0xcfbfa7].map(c=>new T.Color(c));
 const points=[],colors=[],stages=[],phases=[];
 function point(x,y,z,stage,region){points.push(x,y,z);colors.push(...palette[stage].toArray());stages.push(stage);phases.push(region);}
 // A bounded shell of sensory cues around the first person.
 const native=new T.Group(),extended=new T.Group();heads[0].add(native);heads[1].add(extended);
 const makeShell=(group,large)=>{
  const positions=[],rgb=[],count=large?18500:6800;
  for(let i=0;i<count;i++){
   const u=rand()*Math.PI*2,v=Math.acos(2*rand()-1),radius=(large?2.47:1.78)+(rand()-.5)*.12;
   const x=Math.sin(v)*Math.cos(u)*radius,y=Math.cos(v)*radius*(large?1.16:1.04),z=Math.sin(v)*Math.sin(u)*radius*.65;
   if(z>0&&Math.abs(x)<1.06&&y<1.5&&y>-1.55)continue;positions.push(x,y,z);const c=palette[large?1+Math.floor(rand()*5):0];rgb.push(c.r,c.g,c.b);
  }
  const geom=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setAttribute('color',new T.Float32BufferAttribute(rgb,3));
  const material=new T.PointsMaterial({size:large?.014:.012,vertexColors:true,transparent:true,opacity:large?.28:.2,depthWrite:false,blending:T.NormalBlending});
  group.add(new T.Points(geom,material));
 };
 makeShell(native,false);makeShell(extended,true);
 const layerGroups=[];
 function strand(group,from,to,color,n=110){const mid=from.clone().lerp(to,.5).add(new T.Vector3(0,.18,.2));const curve=new T.QuadraticBezierCurve3(from,mid,to),arr=[];for(let k=0;k<n;k++){const p=curve.getPoint(k/(n-1));arr.push(...p.toArray());}group.add(new T.Line(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(arr,3)),new T.LineBasicMaterial({color,transparent:true,opacity:.27})));return curve;}
 // Eye and ear cues originate in the head, not a map or screen.
 for(let j=0;j<2;j++){
  const local=heads[j],r=j?2.45:1.75;
  for(let k=0;k<15;k++){const angle=k/14*Math.PI*1.7-.85*Math.PI;strand(local,new T.Vector3(.18,.35,.7),new T.Vector3(Math.sin(angle)*r,Math.cos(angle)*r*.7,.35+Math.cos(angle)*.7),j?0x8cd3d0:0xc4bc9e);}
  for(const side of [-1,1])for(let k=0;k<3;k++){
   const a=[];for(let n=0;n<95;n++){const t=n/94*Math.PI*1.6-.8*Math.PI,radius=.35+k*.24;a.push(side*(.73+radius*.75),Math.cos(t)*radius*.7+.1,Math.sin(t)*radius);}
   local.add(new T.Line(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(a,3)),new T.LineBasicMaterial({color:j?0x9ed7e4:0xd6c9aa,transparent:true,opacity:.32})));
  }
 }
 // Six fields of computation and transformation around the extended body.
 for(let stage=0;stage<6;stage++){
  const g=new T.Group();extended.add(g);layerGroups.push(g);
  if(stage===0)continue;
  const arr=[],rgb=[],n=stage===2?5800:3100;
  for(let i=0;i<n;i++){
   const u=rand()*Math.PI*2,v=rand(),r=2.1+v*.62;let x=Math.cos(u)*r,y=Math.sin(u)*r,z=(rand()-.5)*1.4;
   if(stage===1){y=-1.7+rand()*.7;x=(rand()-.5)*4.7;z=Math.sin(x*2.3+v)*.4;}
   if(stage===2){x=(rand()-.5)*3.4;y=1.8+rand()*.9;z=(rand()-.5)*2.2;}
   if(stage===3){x=2+Math.cos(u)*.48;y=Math.sin(u)*1.55;z=Math.sin(u*3+v)*.6;}
   if(stage===4){x=-2+Math.cos(u)*.6;y=Math.sin(u)*1.7;z=Math.cos(u*2+v)*.6;}
   if(stage===5){x=Math.cos(u)*r;y=-1.7+v*.35;z=Math.sin(u)*r*.68;}
   arr.push(x,y,z);rgb.push(...palette[stage].toArray());
  }
  const geo=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(arr,3)).setAttribute('color',new T.Float32BufferAttribute(rgb,3));
  g.add(new T.Points(geo,new T.PointsMaterial({size:.014,vertexColors:true,transparent:true,opacity:.4,depthWrite:false,blending:T.AdditiveBlending})));
 }
 // A leaf of light stands for Aoi, the mediator; the live character remains in TOP.
 const leafP=[];for(let i=0;i<1500;i++){const t=rand()*6.28,v=rand(),r=Math.sin(v*Math.PI);leafP.push(Math.cos(t)*r*.2,v*1.2-.4,Math.sin(t)*r*.13);}
 const leaf=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(leafP,3)),new T.PointsMaterial({color:0xadebd8,size:.018,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending}));root.add(leaf);
 const threadP=new Float32Array(1800*3),threadG=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(threadP,3));
 const thread=new T.Points(threadG,new T.PointsMaterial({color:0xc4e5df,size:.016,transparent:true,opacity:.48,depthWrite:false,blending:T.AdditiveBlending}));root.add(thread);
 let width=1,height=1,clock=0,selected=2,curve;const tmp=new T.Vector3();
 function update({time=0,selected:s=2}={}){clock=time;selected=s;native.rotation.y=Math.sin(time*.08)*.035;extended.rotation.y=Math.sin(time*.07)*.045;
  layerGroups.forEach((g,i)=>g.traverse(o=>{if(o.isPoints){o.material.opacity=i===s?.4:.15;}}));leaf.rotation.y=Math.sin(time*.2)*.3;
  if(curve){for(let i=0;i<1800;i++){curve.getPoint((i/1800+time*.04)%1,tmp);threadP.set([tmp.x+Math.sin(i)*.03,tmp.y+Math.cos(i)*.03,tmp.z],i*3);}threadG.attributes.position.needsUpdate=true;}
 }
 function resize({width:w,height:h}){
  width=w;height=h;const portrait=w/h<1.1;
  if(portrait){heads[0].position.set(0,2.9,0);heads[1].position.set(0,-3.8,0);anchors[0].position.set(0,5.35,0);anchors[1].position.set(0,-1.9,1.2);aoi.position.set(0,.25,1.9);ai.position.set(2.15,-6.4,0);camera.position.set(0,.1,21);camera.lookAt(0,.1,0);}
  else{heads[0].position.set(-3.75,.5,0);heads[1].position.set(3.75,.5,0);anchors[0].position.set(-3.75,4,0);anchors[1].position.set(3.75,4,0);aoi.position.set(0,-.45,1.9);ai.position.set(6.15,-2.45,0);camera.position.set(0,1.6,14.6);camera.lookAt(0,1.0,0);}
  if(portrait){leaf.position.set(-1.9,.3,1.8);leaf.scale.setScalar(.55);}else{leaf.position.copy(aoi.position).add(new T.Vector3(0,1.3,0));leaf.scale.setScalar(1);}camera.aspect=w/h;camera.fov=40;camera.near=.1;camera.far=80;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  curve=new T.CatmullRomCurve3([heads[1].position.clone().add(new T.Vector3(0,1,0)),leaf.position.clone(),heads[0].position.clone().add(new T.Vector3(0,.5,.75))]);update({time:clock,selected});projectLabels();
 }
 function projectLabels(){root.updateMatrixWorld(true);camera.updateMatrixWorld();const place=(el,o)=>{if(!el)return;o.getWorldPosition(tmp).project(camera);el.style.left=((tmp.x*.5+.5)*width)+'px';el.style.top=((-tmp.y*.5+.5)*height)+'px';el.dataset.projected='true';};anchors.forEach((a,i)=>place(host.querySelector('[data-world-label="'+i+'"]'),a));place(host.querySelector('.qt-flow-core'),aoi);place(host.querySelector('[data-ai-label]'),ai);}
 host.dataset.representation='human-scan-sensory-fields';host.dataset.humanModel='LeePerrySmith.glb';host.dataset.humanCount='2';host.dataset.sameSubject='true';host.dataset.pointCount='43200';
 return {update,resize,projectLabels};
}
