/**
 * A view inside a place, using the same aerial terrain, PLATEAU buildings and
 * zelkova geometry as the TOP. Moving marks are illustrative translations.
 * Time layers do not claim reconstructed historical landscapes or geology.
 */
export async function createFieldScene({T,scene,world,camera,host,sprite,renderer}) {
 const [{GLTFLoader},{MeshoptDecoder},{mergeGeometries}]=await Promise.all([
  import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js'),import('three/addons/utils/BufferGeometryUtils.js')
 ]);
 const url=path=>new URL('./assets/'+path.split('/').pop(),import.meta.url).href;
 const gltf=new GLTFLoader();gltf.setMeshoptDecoder(MeshoptDecoder);
 const tl=new T.TextureLoader(),ownG=new Set(),ownM=new Set(),ownTex=new Set();
 const geo=g=>(ownG.add(g),g),mat=m=>(ownM.add(m),m);
 // 2026-10-23 起動 5 秒：欅の葉の地図（2048 四方）は PNG 1.7 MB → WebP 0.27 MB にし、画面の外（ImageBitmap）でほどく。上下は反転しない（元も flipY=false）
 const bitmapTexture=async path=>{if(typeof createImageBitmap!=='function')return null;try{const r=await fetch(url(path));if(!r.ok)return null;const bmp=await createImageBitmap(await r.blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});const t=new T.Texture(bmp);t.flipY=false;t.needsUpdate=true;return t;}catch{return null;}};
 const leafTexture=async()=>{const t=await bitmapTexture('img/hero/3d/keyaki_leaf_atlas.webp');if(!t)return texture('img/hero/3d/keyaki_leaf_atlas.webp');t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(4,renderer?.capabilities.getMaxAnisotropy()||2);ownTex.add(t);return t;};
 const texture=async(path,srgb=true,repeat)=>{const t=await tl.loadAsync(url(path));t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=Math.min(4,renderer?.capabilities.getMaxAnisotropy()||2);if(repeat){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);}ownTex.add(t);return t;};
 const [terrainAsset,cityAsset,treeAsset,roadAsset,photo,bark,barkNormal,leaf,gravel,gritNormal,meta]=await Promise.all([
  gltf.loadAsync(url('img/hero/3d/terrain_lite.glb')),gltf.loadAsync(url('img/hero/3d/buildings_lite.glb')),
  gltf.loadAsync(url('img/hero/3d/keyaki_lod1_notex.glb')),gltf.loadAsync(url('img/hero/3d/road.glb')),
  texture('img/hero/3d/tex_photo_s.jpg'),texture('x/02/tex/bark_zelkova.webp',true,[1,3]),
  texture('x/02/tex/bark_zelkova_n.webp',false,[1,3]),leafTexture(),
  texture('x/02/tex/path_gravel.webp',true,[1,1]),texture('x/02/tex/sand_grit_n.webp',false,[1,1]),
  window.__sandoWire?window.__sandoWire.then(x=>x[0]):fetch(url('img/hero/sando_wire.json')).then(r=>{if(!r.ok)throw Error('Place metadata unavailable');return r.json();})
 ]);
 // The original GLB leaf cards use the original 2 × 2 atlas, not a single
 // branch image. Match its glTF UV orientation; the aerial map follows TOP.
 leaf.flipY=false;
 const root=new T.Group(),physical=new T.Group(),signals=new T.Group(),timeLayers=new T.Group(),senses=new T.Group();
 root.name='qualium-photo-place';root.add(physical,signals,timeLayers,senses);world.add(root);
 const source=meta.center.reduce((a,c)=>Math.abs(c[2]+640)<Math.abs(a[2]+640)?c:a),origin=new T.Vector3(...source);
 const centerline=meta.center.map(a=>[a[0]-origin.x,a[2]-origin.z]).sort((a,b)=>a[1]-b[1]);
 function roadCenter(z){let i=1;while(i<centerline.length-1&&centerline[i][1]<z)i++;const a=centerline[i-1],b=centerline[i],t=T.MathUtils.clamp((z-a[1])/(b[1]-a[1]||1),0,1);return T.MathUtils.lerp(a[0],b[0],t);}
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),random=i=>{const n=Math.sin(i*127.13+41.7)*43758.5453;return n-Math.floor(n);};
 const HG=meta.hgrid;
 function heightAt(x,z){const cx=clamp((x+origin.x-HG.x0)/HG.d,0,HG.cols-1),cz=clamp((z+origin.z-HG.z0)/HG.d,0,HG.rows-1),ix=Math.floor(cx),iz=Math.floor(cz),fx=cx-ix,fz=cz-iz,read=(a,b)=>HG.v[Math.min(HG.rows-1,b)*HG.cols+Math.min(HG.cols-1,a)]/10;return T.MathUtils.lerp(T.MathUtils.lerp(read(ix,iz),read(ix+1,iz),fx),T.MathUtils.lerp(read(ix,iz+1),read(ix+1,iz+1),fx),fz)-origin.y;}
 const standard=options=>mat(new T.MeshStandardMaterial({roughness:.9,metalness:0,...options}));
 const lineMat=(color,opacity)=>mat(new T.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending}));
 const pointMat=(color,size,opacity)=>mat(new T.PointsMaterial({color,size,map:sprite,sizeAttenuation:true,transparent:true,opacity,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending}));
 const buffer=arr=>geo(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(arr,3)));
 // Keep the original real-world coordinates, UVs and vertex colours, then crop
 // only distant triangles. New float attributes avoid editing quantized GLBs.
 function cropMesh(mesh,xLimit=240,zLimit=290,planarUV=false){
  const g=mesh.geometry,p=g.attributes.position,n=p.count,worldP=new Float32Array(n*3),v=new T.Vector3();
  for(let i=0;i<n;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).sub(origin);worldP.set([v.x,v.y,v.z],i*3);}
  const inds=g.index?.array,N=inds?.length||n,chosen=[],map=new Map(),outIndex=[];
  for(let k=0;k<N;k+=3){const a=inds?inds[k]:k,b=inds?inds[k+1]:k+1,c=inds?inds[k+2]:k+2;const x=(worldP[a*3]+worldP[b*3]+worldP[c*3])/3,z=(worldP[a*3+2]+worldP[b*3+2]+worldP[c*3+2])/3;if(Math.abs(x)>xLimit||Math.abs(z)>zLimit)continue;for(const j of[a,b,c]){if(!map.has(j)){map.set(j,chosen.length);chosen.push(j);}outIndex.push(map.get(j));}}
  if(!chosen.length)return null;
  const result=geo(new T.BufferGeometry()),pos=new Float32Array(chosen.length*3);chosen.forEach((old,i)=>pos.set(worldP.subarray(old*3,old*3+3),i*3));result.setAttribute('position',new T.BufferAttribute(pos,3));result.setIndex(outIndex);
  for(const name of ['uv','color']){const attr=g.attributes[name];if(!attr||name==='uv'&&planarUV)continue;const array=new Float32Array(chosen.length*attr.itemSize),get=['getX','getY','getZ','getW'];chosen.forEach((old,i)=>{for(let k=0;k<attr.itemSize;k++)array[i*attr.itemSize+k]=attr[get[k]](old);});result.setAttribute(name,new T.BufferAttribute(array,attr.itemSize));}
  if(planarUV){const uv=new Float32Array(chosen.length*2);for(let i=0;i<chosen.length;i++)uv.set([pos[i*3]/3,pos[i*3+2]/3],i*2);result.setAttribute('uv',new T.BufferAttribute(uv,2));}
  result.computeVertexNormals();result.computeBoundingSphere();return result;
 }
 const groundMat=standard({map:photo,color:0xffffff}),cityMat=standard({color:0xe0ded6,vertexColors:true,flatShading:true,roughness:.89});
 const groundGeometries=[];
 for(const [asset,material,isGround]of[[terrainAsset,groundMat,true],[cityAsset,cityMat,false]]){
  asset.scene.updateMatrixWorld(true);asset.scene.traverse(o=>{if(!o.isMesh)return;const g=cropMesh(o,isGround?290:230,isGround?360:290);if(!g)return;const m=new T.Mesh(g,material);m.receiveShadow=true;physical.add(m);if(isGround)groundGeometries.push(g);});
 }
 // Actual road meshes from the TOP, with restrained small-scale surface detail.
 const roadColors={asphalt_dark:0x484b49,asphalt_light:0x777972,bed:0x4a4533,concrete:0xa39d90,granite_band:0x8c8b83,granite_black:0x575853,granite_light:0xa8a69b,granite_plaza:0x9a9b91,gravel:0xbdb5a0,lawn:0x6b7950,paint:0xdcdad1,roots:0x514333,sand:0xc6b694,sidewalk:0x9d988f,stone:0x88847d,washed:0xa59d8f};
 const roadGroups=new Map();roadAsset.scene.updateMatrixWorld(true);roadAsset.scene.traverse(o=>{if(!o.isMesh)return;const g=cropMesh(o,110,240,true);if(!g)return;const name=o.name.split('|')[0];if(!roadGroups.has(name))roadGroups.set(name,[]);roadGroups.get(name).push(g);});
 for(const [name,parts]of roadGroups){const g=parts.length>1?geo(mergeGeometries(parts)):parts[0],rough=['gravel','bed','sand','roots'].includes(name),m=standard({color:roadColors[name]||0x9d998c,map:rough?gravel:null,normalMap:gritNormal,normalScale:new T.Vector2(rough?.35:.12,rough?.35:.12),polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});const road=new T.Mesh(g,m);road.receiveShadow=true;physical.add(road);}
 // The original zelkova's branches and leaf cards, repeated at the existing tree
 // positions. No spherical crown geometry or ornamental miniature buildings.
 treeAsset.scene.updateMatrixWorld(true);const treeBox=new T.Box3().setFromObject(treeAsset.scene),treeHeight=treeBox.max.y-treeBox.min.y||1;
 const mobile=(host?.clientWidth||innerWidth)<700;
 const treePositions=meta.trees.map((a,i)=>({p:new T.Vector3(a[0]-origin.x,a[1]-origin.y,a[2]-origin.z),seed:i})).filter(t=>Math.abs(t.p.x)<130&&Math.abs(t.p.z)<230).sort((a,b)=>a.p.lengthSq()-b.p.lengthSq()).slice(0,mobile?32:48);
 const barkMat=standard({map:bark,normalMap:barkNormal,normalScale:new T.Vector2(.45,.45),color:0xc3b59e,roughness:.96});
 const leafMat=standard({map:leaf,color:0xffffff,vertexColors:true,roughness:.9,alphaTest:.45,side:T.DoubleSide});
 const wind={value:0};leafMat.onBeforeCompile=shader=>{shader.uniforms.fieldTime=wind;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float fieldTime;').replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\n transformed.x += sin(fieldTime*.65 + position.y*7. + instanceMatrix[3].x*.14)*.004;\n transformed.z += cos(fieldTime*.48 + position.x*6. + instanceMatrix[3].z*.10)*.003;\n#endif');};leafMat.customProgramCacheKey=()=> 'qualium-leaf-wind-1';
 const instanceMatrix=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3(),position=new T.Vector3(),up=new T.Vector3(0,1,0);
 treeAsset.scene.traverse(o=>{if(!o.isMesh)return;ownG.add(o.geometry);const leaves=/leaf|leaves|crown/i.test(o.name+' '+o.material?.name),im=new T.InstancedMesh(o.geometry,leaves?leafMat:barkMat,treePositions.length);
  treePositions.forEach((t,i)=>{const size=(17+random(t.seed)*3)/treeHeight;rotation.setFromAxisAngle(up,t.seed*2.399);position.copy(t.p);position.y-=treeBox.min.y*size;scale.set(size*.72,size,size*.72);instanceMatrix.compose(position,rotation,scale).multiply(o.matrixWorld);im.setMatrixAt(i,instanceMatrix);});im.castShadow=true;im.receiveShadow=true;im.computeBoundingSphere();physical.add(im);
 });
 // Cropped meshes own new float buffers; release the full decoded source
 // buffers. Only the tree's shared geometry is still used by the instances.
 for(const asset of [terrainAsset,cityAsset,roadAsset,treeAsset])asset.scene.traverse(o=>{if(!o.isMesh)return;if(asset!==treeAsset)o.geometry.dispose();for(const m of [].concat(o.material))m?.dispose();});
 const shadowGeometry=geo(new T.PlaneGeometry(1,1));shadowGeometry.rotateX(-Math.PI/2);const shadowMat=mat(new T.MeshBasicMaterial({color:0x0b1812,map:sprite,transparent:true,opacity:.2,depthWrite:false})),shadows=new T.InstancedMesh(shadowGeometry,shadowMat,treePositions.length);
 treePositions.forEach((t,i)=>{instanceMatrix.makeScale(11,1,10);instanceMatrix.setPosition(t.p.x,t.p.y+.04,t.p.z);shadows.setMatrixAt(i,instanceMatrix);});physical.add(shadows);
 // Natural slanting light and atmospheric distance. One static shadow map.
 const oldFog=scene.fog,oldBackground=scene.background,oldShadowAuto=renderer?.shadowMap.autoUpdate;
 scene.fog=new T.FogExp2(0x617b80,.007);scene.background=new T.Color(0x59757c);
 const lights=new T.Group();lights.add(new T.HemisphereLight(0xd8e7ea,0x4a4535,1.05));const sun=new T.DirectionalLight(0xffe6bc,2.0);sun.position.set(-70,100,35);sun.target.position.set(0,0,-30);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-82,right:82,top:82,bottom:-82,near:1,far:240});sun.shadow.bias=-.00025;sun.shadow.normalBias=.18;lights.add(sun,sun.target);scene.add(lights);
 if(renderer){renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;}
 // A gradient sky, rather than a black studio surrounding a tabletop model.
 const skyMaterial=mat(new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color(0x173c54)},horizon:{value:new T.Color(0x899c96)}},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 direction;uniform vec3 top;uniform vec3 horizon;void main(){float h=clamp(normalize(direction).y,0.,1.);gl_FragColor=vec4(mix(horizon,top,pow(h,.5)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',fog:false}));
 const sky=new T.Mesh(geo(new T.SphereGeometry(1100,24,16)),skyMaterial);root.add(sky);
 // Water clues retain the existing terrain-derived flow segments; no invented
 // river is presented as part of this real place.
 const flowPositions=[];for(const s of meta.flow){const x=s[0]-origin.x,z=s[1]-origin.z;if(Math.abs(x)>140||Math.abs(z)>180)continue;flowPositions.push(x,heightAt(x,z)+.22,z,s[2]-origin.x,heightAt(s[2]-origin.x,s[3]-origin.z)+.22,s[3]-origin.z);}
 const waterLines=new T.LineSegments(buffer(flowPositions),lineMat(0x8cd4df,.35));signals.add(waterLines);
 const contourPositions=[];for(const [e,p]of meta.contours)for(let i=0;i<p.length-2;i+=2){const x=p[i]-origin.x,z=p[i+1]-origin.z;if(Math.abs(x)>145||Math.abs(z)>180)continue;contourPositions.push(x,e-origin.y+.13,z,p[i+2]-origin.x,e-origin.y+.13,p[i+3]-origin.z);}
 const contours=new T.LineSegments(buffer(contourPositions),lineMat(0xe3d8b0,.09));signals.add(contours);
 const observer=new T.Vector3(1,heightAt(1,20)+.3,20),waterTarget=flowPositions.length?new T.Vector3(...flowPositions.slice(0,3)):new T.Vector3(19,heightAt(19,-12)+.3,-12),forestTarget=(treePositions.find(t=>t.p.z<-24&&t.p.x<0)||treePositions[0]).p.clone().add(new T.Vector3(0,9,0)),cityTarget=new T.Vector3(72,heightAt(72,-36)+13,-36);
 const anchors=[observer,waterTarget,forestTarget,cityTarget];const routes=[];for(let i=0;i<3;i++){const a=anchors[i],b=anchors[i+1],mid=a.clone().lerp(b,.5);mid.y+=i===2?12:2.5;const curve=new T.CatmullRomCurve3([a,mid,b]);routes.push(curve);signals.add(new T.Line(geo(new T.BufferGeometry().setFromPoints(curve.getPoints(60))),lineMat(i===2?0xe3cfa0:0x89d2d2,.24)));}
 const anchorsGlow=new T.Points(buffer(anchors.flatMap(a=>a.toArray())),pointMat(0xe2dfbe,.9,.65));signals.add(anchorsGlow);
 const traveling=new Float32Array(54*3),travelGeo=buffer(traveling),travelPoints=new T.Points(travelGeo,pointMat(0xd1e9da,.48,.8));signals.add(travelPoints);
 // Transparent snapshots read as memory above the same site, not cut-out boards.
 const snapshots=[];for(let k=0;k<3;k++){const material=standard({map:photo,color:[0x86b4b6,0xced0af,0xd6c69a][k],transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});const group=new T.Group();for(const g of groundGeometries)group.add(new T.Mesh(g,material));timeLayers.add(group);snapshots.push({group,material});}
 const waves=[];for(let k=0;k<3;k++){const line=new T.Line(buffer(new Float32Array(100*3)),lineMat(k===1?0xe0c99c:0x8acece,0));senses.add(line);waves.push(line);}
 const ringGeometry=geo(new T.RingGeometry(.96,1,64));ringGeometry.rotateX(-Math.PI/2);const rings=[];for(let i=0;i<8;i++){const ring=new T.Mesh(ringGeometry,mat(new T.MeshBasicMaterial({color:0xa6d9cc,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false})));senses.add(ring);rings.push(ring);}
 const dustArray=new Float32Array(100*3);for(let i=0;i<100;i++)dustArray.set([(random(i*3)-.5)*70,3+random(i*3+1)*20,-60+random(i*3+2)*120],i*3);const dust=new T.Points(buffer(dustArray),pointMat(0xe8d9b5,.11,.22));physical.add(dust);
 let width=host?.clientWidth||1200,height=host?.clientHeight||740,blend=[1,0,0];const look=new T.Vector3(),currentLook=new T.Vector3(),targetCamera=new T.Vector3();
 function resize(size={}){width=Math.max(1,size.width||width);height=Math.max(1,size.height||height);camera.aspect=width/height;camera.fov=width/height<.9?61:53;camera.near=.35;camera.far=1800;camera.updateProjectionMatrix();}
 function update({time=0,dt=0,mode=0,snap=false}={}){
  mode=clamp(Math.round(mode),0,2);const damping=snap?1:1-Math.exp(-Math.max(0,dt)*2.6);for(let i=0;i<3;i++)blend[i]+=(Number(i===mode)-blend[i])*damping;
  const temporal=blend[1],sensory=blend[2],lift=(.5-.5*Math.cos(time*.075))*(1-temporal*.35),portrait=width/height<.9;
  // Begin within the avenue, then reveal how that immediate field belongs to
  // the wider forest and city. The camera never circles a miniature platform.
  // The first camera was inside the eastern tree crown. Follow the surveyed
  // road centre below the canopy, rise above the trees, then widen the view.
  const rise=T.MathUtils.smoothstep(lift,0,.45),drift=T.MathUtils.smoothstep(lift,.45,1);
  const z=62+drift*55+temporal*18,x=roadCenter(z)+drift*(portrait?34:65)+temporal*25;
  targetCamera.set(x,heightAt(x,z)+2.2+rise*23+lift*28+temporal*32,z);
  look.set(roadCenter(-48)+drift*15,2.3+lift*6+temporal*4,-48+lift*12);
  if(!snap){
   const currentClearance=camera.position.y-heightAt(camera.position.x,camera.position.z),side=Math.abs(camera.position.x-roadCenter(camera.position.z));
   // Mode switches and the return journey must also pass over, not through,
   // a crown. Reach the centre lane before descending below the canopy.
   if(currentClearance<24)targetCamera.x=roadCenter(z);
   if(side>.25&&targetCamera.y<heightAt(targetCamera.x,z)+24)targetCamera.y=heightAt(targetCamera.x,z)+24;
  }
  if(snap){camera.position.copy(targetCamera);currentLook.copy(look);}else{const a=1-Math.exp(-Math.max(0,dt)*1.4);camera.position.lerp(targetCamera,a);currentLook.lerp(look,a);}camera.lookAt(currentLook);camera.updateMatrixWorld();
  wind.value=time;
  timeLayers.visible=temporal>.005;snapshots.forEach((s,k)=>{s.group.position.y=(k+1)*5.7;s.material.opacity=temporal*(.16-k*.035);});
  waterLines.material.opacity=.28+sensory*.35;contours.material.opacity=.075+temporal*.16;
  const phase=(time%22)/22*4.1,p=travelGeo.attributes.position;
  for(let i=0;i<54;i++){const route=Math.floor(i/18),u=(i%18)/17,point=routes[route].getPoint(u);p.setXYZ(i,point.x,Math.abs(u-(phase-route))<.18?point.y:-100,point.z);}p.needsUpdate=true;
  anchorsGlow.material.opacity=.57+.18*Math.sin(time*1.2)**2;
  senses.visible=sensory>.005;
  waves.forEach((line,k)=>{const positions=line.geometry.attributes.position;for(let i=0;i<positions.count;i++){const x=-15+i/(positions.count-1)*45,z=-9-k*12;positions.setXYZ(i,x,heightAt(x,z)+4+k*1.1+Math.sin(x*.24-time*(.9+k*.16))*(.5+k*.35),z);}positions.needsUpdate=true;line.material.opacity=sensory*(.27+k*.05);});
  rings.forEach((ring,i)=>{const phase=(time*.17+i*.18)%1,at=i<4?observer:waterTarget;ring.position.set(at.x,heightAt(at.x,at.z)+.16+phase*.2,at.z);ring.scale.setScalar(1.3+phase*6.5);ring.material.opacity=sensory*(1-phase)*.22;});
  dust.rotation.y=Math.sin(time*.03)*.025;return{mode,illustrative:true};
 }
 // Only this renderer is used by this field. The shadowed geometry and sunlight
 // stay fixed, so recomputing their maps on every motion frame would be wasteful.
 root.userData.field={source:'TOP shared terrain / aerial photo / PLATEAU / zelkova',trees:treePositions.length,assetBytesApprox:4857707,flowSegments:flowPositions.length/6};
 resize({width,height});update({time:0,dt:0,mode:0,snap:true});
 function dispose(){world.remove(root);scene.remove(lights);scene.fog=oldFog;scene.background=oldBackground;if(renderer)renderer.shadowMap.autoUpdate=oldShadowAuto;for(const g of ownG)g.dispose();for(const m of ownM)m.dispose();for(const t of ownTex)t.dispose();}
 return{update,resize,dispose};
}
