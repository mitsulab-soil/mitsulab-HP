import {growKeyaki,sprigMesh} from "../js/common-ground-tree.js";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
/* A material study of synthetic sound. Geometry is illustrative, not a measured soil/tree field. */
export function createSoundSculpture(T, kind) {
  const group = new T.Group(), waves=[], loader=new T.TextureLoader();
  const tex=name=>{const t=loader.load(new URL('../img/hero/3d/dio/'+name+'.webp',import.meta.url).href,()=>group.userData.onTexture?.());t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);if(name.endsWith('_c'))t.colorSpace=T.SRGBColorSpace;return t;};
  const soil=new T.MeshStandardMaterial({map:tex('soil_c'),normalMap:tex('soil_n'),normalScale:new T.Vector2(.5,.5),color:0xc5b79e,roughness:.97});
  const bark=new T.MeshStandardMaterial({map:tex('bark_c'),normalMap:tex('bark_n'),normalScale:new T.Vector2(.65,.65),color:0xb4a18a,roughness:.88});
  const body=new T.Group();group.add(body);
  const tube=(points,r,mat)=>{const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,8,false),mat);body.add(m);return m;};
  let seed=412;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  if(kind==='soil'){
    const strata=[[-.58,.32,1.04],[-.29,.27,1.01],[-.04,.23,.98]];
    strata.forEach(([y,h,r],j)=>{const mat=soil.clone();mat.color.setHex([0xada08b,0xbeb19a,0xd2c4aa][j]);const g=new T.CylinderGeometry(r,r*.99,h,80,5);const a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i);if(Math.hypot(x,z)>.5){const angle=Math.atan2(z,x),shape=1+.065*Math.sin(angle*5)+.035*Math.sin(angle*11);a.setX(i,x*shape);a.setZ(i,z*shape);a.setY(i,a.getY(i)+.025*Math.sin(x*17+z*11));}}g.computeVertexNormals();const m=new T.Mesh(g,mat);m.position.y=y;body.add(m);});
    const stones=new T.InstancedMesh(new T.IcosahedronGeometry(.055,1),soil,120),o=new T.Object3D();
    for(let i=0;i<120;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*.94;o.position.set(Math.cos(a)*r,.098+rand()*.03,Math.sin(a)*r);o.scale.set(.6+rand(),.25+rand()*.3,.6+rand());o.rotation.set(rand(),rand(),rand());o.updateMatrix();stones.setMatrixAt(i,o.matrix);}body.add(stones);
    const rootMat=new T.MeshStandardMaterial({color:0xbdb49a,roughness:.9});for(let i=0;i<9;i++){const a=i*2.4; tube([[Math.cos(a)*.3,.16,Math.sin(a)*.3],[Math.cos(a)*.65,-.16,Math.sin(a)*.65],[Math.cos(a)*1.01,-.43,Math.sin(a)*1.01],[Math.cos(a)*1.02,-.72,Math.sin(a)*1.02]],.008+i%3*.004,rootMat);}
  }
  // Reuse the established keyaki branching/leaf system, not a new stylized tree.
  const taperTube=(pts,r0,r1,rad,seg)=>{const curve=new T.CatmullRomCurve3(pts),g=new T.TubeGeometry(curve,seg,1,rad,false),a=g.attributes.position,n=g.attributes.normal;for(let i=0;i<=seg;i++){const c=curve.getPointAt(i/seg),r=T.MathUtils.lerp(r0,r1,i/seg);for(let j=0;j<=rad;j++){const k=i*(rad+1)+j;a.setXYZ(k,c.x+n.getX(k)*r,c.y+n.getY(k)*r,c.z+n.getZ(k)*r);}}g.computeVertexNormals();return g;};
  const leafMap=loader.load(new URL('../img/common-ground/leaf.webp',import.meta.url).href,()=>group.userData.onTexture?.());leafMap.colorSpace=T.SRGBColorSpace;
  const leafMat=new T.MeshStandardMaterial({map:leafMap,alphaTest:.45,side:T.DoubleSide,roughness:.94,color:0xccd4b8});
  const tree=growKeyaki({taperTube},rand,0,0,{r:.43,hf:2.9,limbs:6,len:[4,5.2],tilt:.37,levels:3,forks:2,decay:.62,sprigs:kind==='tree'?6000:1800,back:0,det:true});
  const tg=new T.Group(),wood=mergeGeometries(tree.wood);tree.wood.forEach(g=>g.dispose());tg.add(new T.Mesh(wood,bark),sprigMesh(tree.sprigs,leafMat,.72,[.84,.92,.67],tree.ctr,rand));tg.scale.setScalar(kind==='tree'?.29:.16);tg.position.set(kind==='tree'?0:-.72,kind==='tree'?-1:.07,kind==='tree'?0:-.75);body.add(tg);
  const groundY=kind==='tree'?-1:.07;
  const floor=new T.Mesh(new T.CircleGeometry(2.1,70,0,kind==='soil'?Math.PI:Math.PI*2),soil);floor.rotation.x=-Math.PI/2;floor.position.y=groundY;body.add(floor);
  const bladeGeo=new T.BufferGeometry();bladeGeo.setAttribute('position',new T.Float32BufferAttribute([-.012,0,0,.012,0,0,.006,.24,.025],3));bladeGeo.computeVertexNormals();const blades=new T.InstancedMesh(bladeGeo,new T.MeshStandardMaterial({color:0x526846,roughness:1,side:T.DoubleSide}),270),o=new T.Object3D();
  const litter=new T.InstancedMesh(new T.PlaneGeometry(.16,.20),new T.MeshStandardMaterial({map:leafMap,alphaTest:.45,side:T.DoubleSide,color:0x9b773c,roughness:1}),110);
  for(let i=0;i<270;i++){const a=rand()*(kind==='soil'?Math.PI:Math.PI*2),r=.9+rand()*1.15;o.position.set(Math.cos(a)*r,groundY+.07,-Math.sin(a)*r);o.rotation.set((rand()-.5)*.5,rand()*6.28,(rand()-.5)*.4);o.scale.setScalar(.65+rand());o.updateMatrix();blades.setMatrixAt(i,o.matrix);}body.add(blades);
  for(let i=0;i<110;i++){const a=rand()*(kind==='soil'?Math.PI:Math.PI*2),r=.5+rand()*1.55;o.position.set(Math.cos(a)*r,groundY+.009,-Math.sin(a)*r);o.rotation.set(-Math.PI/2,0,a);o.scale.setScalar(.4+rand()*.8);o.updateMatrix();litter.setMatrixAt(i,o.matrix);}body.add(litter);
  // Each contour is a distinct frequency band; depth and radial displacement reveal intensity.
  for(let j=0;j<30;j++){const pos=new Float32Array(129*3),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const material=new T.LineBasicMaterial({color:new T.Color().setHSL(kind==='soil'?.10:.42,.19,.45+j/30*.32),transparent:true,opacity:.22+j/30*.35,depthWrite:false});const line=new T.Line(g,material);group.add(line);waves.push({line,pos,j});}
  const points=new T.Points(new T.BufferGeometry(),new T.PointsMaterial({color:0xdce3d8,size:.013,transparent:true,opacity:.65,depthWrite:false}));group.add(points);
  function update(t,fft,samples,active,rms){
    const highlights=[];
    for(const w of waves){const u=w.j/29,f=active?(fft[Math.floor(3+u*u*180)]||0)/255:0;for(let i=0;i<=128;i++){const q=i/128,x=(q-.5)*3.9,phase=q*(8+u*13)-t*(active?2:0),field=Math.exp(-x*x*.9),amp=active?f*.26+rms*.9:0;
      w.pos[i*3]=x;
      w.pos[i*3+2]=Math.sin(q*3.7+u*8)*.34+(u-.5)*1.05;
      w.pos[i*3+1]=(kind==='soil'?-.64+u*.82:-.86+u*3.4)+Math.sin(q*7+u*6)*.045+Math.sin(phase)*amp*field+(active?samples[(i*3+w.j*7)%512]*.16:0);
      if(i%32===0&&w.j%3===0)highlights.push(w.pos[i*3],w.pos[i*3+1],w.pos[i*3+2]);}w.line.geometry.attributes.position.needsUpdate=true;w.line.geometry.computeBoundingSphere();w.line.material.opacity=.18+u*.31+f*.38;}
    points.geometry.setAttribute('position',new T.Float32BufferAttribute(highlights,3));points.geometry.computeBoundingSphere();
  }
  update(0,[],[],false,0);return {group,update};
}
