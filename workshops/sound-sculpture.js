import {growKeyaki,sprigMesh} from "../js/common-ground-tree.js";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
/* A material study of synthetic sound. Geometry is illustrative, not a measured soil/tree field. */
export function createSoundSculpture(T, kind) {
  const group = new T.Group(), waves=[], loader=new T.TextureLoader();
  // Photographic CC0 surfaces shared with Qualia/sight (x/02/tex: ambientCG / Poly Haven, ledger in x/02).
  const tex=(name,r=2,srgb=true)=>{const t=loader.load(new URL('../x/02/tex/'+name+'.webp',import.meta.url).href,()=>group.userData.onTexture?.());t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(r,r);t.anisotropy=8;if(srgb)t.colorSpace=T.SRGBColorSpace;return t;};
  const soil=new T.MeshStandardMaterial({map:tex('soil_forest',3),normalMap:tex('rock_surface_n',3,false),normalScale:new T.Vector2(.45,.45),color:0xd8cdb8,roughness:.97});
  const bark=new T.MeshStandardMaterial({map:tex('bark_zelkova',1.4),normalMap:tex('bark_zelkova_n',1.4,false),normalScale:new T.Vector2(1.3,1.3),color:0xc9bba5,roughness:.9});
  const body=new T.Group();group.add(body);
  const tube=(points,r,mat)=>{const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,8,false),mat);body.add(m);return m;};
  let seed=412;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  if(kind==='soil'){
    // A dug face seen from the side (schematic brown forest soil: litter, dark A, brown B), photographic soil on top.
    const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');const lay=(y0,y1,a,b)=>{const gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,y0,512,y1-y0);};
    lay(0,12,'#8a6236','#5a3e22');lay(12,80,'#1a120b','#2a1d12');lay(80,100,'#3a2816','#6a4a2c');lay(100,512,'#6e4e2e','#b08a54');
    for(let k=0;k<9000;k++){const y=rand()*512,x=rand()*512,dk=y<80;g.fillStyle=`rgba(${dk?40:150+rand()*40},${dk?28:110+rand()*30},${dk?18:70},${.2+rand()*.35})`;g.fillRect(x,y,1+rand()*3,1+rand()*2.5);}
    for(let k=0;k<160;k++){const y=100+rand()*410;{const v=90+rand()*50;g.fillStyle=`rgba(${v+10},${v},${v-12},.75)`;}g.beginPath();g.ellipse(rand()*512,y,2+rand()*6,1.5+rand()*4,rand()*3,0,6.3);g.fill();}
    g.strokeStyle='rgba(120,88,58,.75)';for(let k=0;k<26;k++){g.lineWidth=1+rand()*2.2*(1-k/30);g.beginPath();let x=rand()*512,y=10+rand()*70;g.moveTo(x,y);for(let t=0;t<14;t++){x+=(rand()-.5)*18;y+=6+rand()*10;g.lineTo(x,y);}g.stroke();}
    const ft=new T.CanvasTexture(c);ft.colorSpace=T.SRGBColorSpace;ft.anisotropy=8;
    const faceMat=new T.MeshStandardMaterial({map:ft,roughness:.98,normalMap:tex('rock_surface_n',2,false),normalScale:new T.Vector2(.7,.7)});
    const fg=new T.PlaneGeometry(2.6,1.6,60,40),fp=fg.attributes.position;for(let k=0;k<fp.count;k++){const x=fp.getX(k),y=fp.getY(k);fp.setZ(k,(Math.sin(x*23+y*9)*Math.sin(y*31-x*7)*.012)+(y>.75?-(y-.75)*.6*Math.abs(Math.sin(x*6)):0));}fg.computeVertexNormals();
    const face=new T.Mesh(fg,faceMat);face.position.set(0,-.73,.2);body.add(face);
    const top=new T.Mesh(new T.PlaneGeometry(2.4,1.8),soil);top.rotation.x=-Math.PI/2;top.position.set(0,.07,-.7);body.add(top);
  }
  // Reuse the established keyaki branching/leaf system, not a new stylized tree.
  const taperTube=(pts,r0,r1,rad,seg)=>{const curve=new T.CatmullRomCurve3(pts),g=new T.TubeGeometry(curve,seg,1,rad,false),a=g.attributes.position,n=g.attributes.normal;for(let i=0;i<=seg;i++){const c=curve.getPointAt(i/seg),r=T.MathUtils.lerp(r0,r1,i/seg);for(let j=0;j<=rad;j++){const k=i*(rad+1)+j;a.setXYZ(k,c.x+n.getX(k)*r,c.y+n.getY(k)*r,c.z+n.getZ(k)*r);}}g.computeVertexNormals();return g;};
  const leafMap=loader.load(new URL('../x/02/tex/leaf_spray.webp',import.meta.url).href,()=>group.userData.onTexture?.());leafMap.colorSpace=T.SRGBColorSpace;
  leafMap.wrapS=leafMap.wrapT=T.ClampToEdgeWrapping;const leafMat=new T.MeshStandardMaterial({map:leafMap,alphaTest:.45,side:T.DoubleSide,roughness:.72,color:0xdde6cf});leafMat.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vec3(.4,.52,.15)*(gl_FrontFacing?.05:.3);');};
  const tree=growKeyaki({taperTube},rand,0,0,{r:.43,hf:2.9,limbs:6,len:[4,5.2],tilt:.37,levels:3,forks:2,decay:.62,sprigs:kind==='tree'?6000:1800,back:0,det:true});
  const tg=new T.Group(),wood=mergeGeometries(tree.wood);tree.wood.forEach(g=>g.dispose());tg.add(new T.Mesh(wood,bark),sprigMesh(tree.sprigs,leafMat,.72,[.84,.92,.67],tree.ctr,rand));tg.scale.setScalar(kind==='tree'?.29:.16);tg.position.set(kind==='tree'?0:-.72,kind==='tree'?-1:.07,kind==='tree'?0:-.75);body.add(tg);
  const groundY=kind==='tree'?-1:.07;
  const floor=new T.Mesh(new T.CircleGeometry(2.1,70,0,kind==='soil'?Math.PI:Math.PI*2),soil);if(kind==='soil')floor.visible=false;floor.rotation.x=-Math.PI/2;floor.position.y=groundY;body.add(floor);
  const bladeGeo=new T.BufferGeometry();bladeGeo.setAttribute('position',new T.Float32BufferAttribute([-.012,0,0,.012,0,0,.006,.24,.025],3));bladeGeo.computeVertexNormals();const blades=new T.InstancedMesh(bladeGeo,new T.MeshStandardMaterial({color:0x526846,roughness:1,side:T.DoubleSide}),270),o=new T.Object3D();
  const litter=new T.InstancedMesh(new T.PlaneGeometry(.16,.20),new T.MeshStandardMaterial({map:leafMap,alphaTest:.45,side:T.DoubleSide,color:0x9b773c,roughness:1}),110);
  for(let i=0;i<270;i++){const a=rand()*(kind==='soil'?Math.PI:Math.PI*2),r=.9+rand()*1.15;o.position.set(Math.cos(a)*r,groundY+.07,-Math.sin(a)*r);o.rotation.set((rand()-.5)*.5,rand()*6.28,(rand()-.5)*.4);o.scale.setScalar(.65+rand());o.updateMatrix();blades.setMatrixAt(i,o.matrix);}body.add(blades);
  for(let i=0;i<110;i++){const a=rand()*(kind==='soil'?Math.PI:Math.PI*2),r=.5+rand()*1.55;o.position.set(Math.cos(a)*r,groundY+.009,-Math.sin(a)*r);o.rotation.set(-Math.PI/2,0,a);o.scale.setScalar(.4+rand()*.8);o.updateMatrix();litter.setMatrixAt(i,o.matrix);}body.add(litter);
  // No waveform or wave display (owner 2026-11-09). The scene only breathes slightly while the synthetic sound plays.
  const leaves=body.children.find(c=>c.isGroup);
  function update(t,fft,samples,active,rms){if(leaves)leaves.rotation.z=active?Math.sin(t*1.3)*.004*(1+rms*6):0;}
  update(0,[],[],false,0);return {group,update};
}
