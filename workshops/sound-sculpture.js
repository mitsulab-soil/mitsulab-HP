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
    lay(0,512,'#6e4e2e','#b08a54');
    // Horizon boundaries are wavy and diffuse (no ruler-straight bands): litter, dark A, transition, brown B.
    const band=(y0,y1,amp,a,b2)=>{g.save();g.beginPath();g.moveTo(0,y0);for(let x=0;x<=512;x+=8)g.lineTo(x,y0+Math.sin(x*.031+y0)*amp+(rand()-.5)*amp*.8);for(let x=512;x>=0;x-=8)g.lineTo(x,y1+Math.sin(x*.023+y1)*amp*1.4+(rand()-.5)*amp);g.closePath();g.filter='blur(3px)';const gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,a);gr.addColorStop(1,b2);g.fillStyle=gr;g.fill();g.restore();};
    band(78,130,10,'rgba(58,40,22,.9)','rgba(106,74,44,0)');band(10,86,7,'#1c140c','#2c1f13');band(-4,14,4,'#7a5732','#4e361e');
    for(let k=0;k<9000;k++){const y=rand()*512,x=rand()*512,dk=y<80;g.fillStyle=`rgba(${dk?40:150+rand()*40},${dk?28:110+rand()*30},${dk?18:70},${.2+rand()*.35})`;g.fillRect(x,y,1+rand()*3,1+rand()*2.5);}
    for(let k=0;k<160;k++){const y=100+rand()*410;{const v=90+rand()*50;g.fillStyle=`rgba(${v+10},${v},${v-12},.75)`;}g.beginPath();g.ellipse(rand()*512,y,2+rand()*6,1.5+rand()*4,rand()*3,0,6.3);g.fill();}
    g.strokeStyle='rgba(120,88,58,.75)';for(let k=0;k<26;k++){g.lineWidth=1+rand()*2.2*(1-k/30);g.beginPath();let x=rand()*512,y=10+rand()*70;g.moveTo(x,y);for(let t=0;t<14;t++){x+=(rand()-.5)*18;y+=6+rand()*10;g.lineTo(x,y);}g.stroke();}
    const ft=new T.CanvasTexture(c);ft.colorSpace=T.SRGBColorSpace;ft.anisotropy=8;
    // Lay the CC0 forest-soil photograph over the horizons so the face reads as real soil, not a diagram.
    const ph=new Image();ph.onload=()=>{g.save();g.globalCompositeOperation='overlay';g.globalAlpha=.85;g.drawImage(ph,0,0,512,512);g.globalAlpha=.4;g.translate(512,0);g.scale(-1,1);g.drawImage(ph,-90,40,700,700);g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='multiply';g.globalAlpha=.35;g.drawImage(ph,0,0,512,512);g.restore();ft.needsUpdate=true;group.userData.onTexture?.();};ph.src=new URL('../x/02/tex/soil_forest.webp',import.meta.url).href;
    const faceMat=new T.MeshStandardMaterial({map:ft,roughness:.98,normalMap:tex('rock_surface_n',2,false),normalScale:new T.Vector2(.7,.7)});
    const fg=new T.PlaneGeometry(2.6,1.6,60,40),fp=fg.attributes.position;for(let k=0;k<fp.count;k++){const x=fp.getX(k),y=fp.getY(k);fp.setZ(k,(Math.sin(x*23+y*9)*Math.sin(y*31-x*7)*.022)+(Math.sin(x*61+y*47)*Math.sin(y*53-x*29)*.008)+(y>.75?-(y-.75)*.6*Math.abs(Math.sin(x*6)):0));}fg.computeVertexNormals();
    const face=new T.Mesh(fg,faceMat);face.position.set(0,-.73,.2);body.add(face);
    const top=new T.Mesh(new T.PlaneGeometry(2.4,1.8),soil);top.rotation.x=-Math.PI/2;top.position.set(0,.07,-.7);body.add(top);
  }
  // Reuse the established keyaki branching/leaf system, not a new stylized tree.
  const taperTube=(pts,r0,r1,rad,seg)=>{const curve=new T.CatmullRomCurve3(pts),g=new T.TubeGeometry(curve,seg,1,rad,false),a=g.attributes.position,n=g.attributes.normal;for(let i=0;i<=seg;i++){const c=curve.getPointAt(i/seg),r=T.MathUtils.lerp(r0,r1,i/seg);for(let j=0;j<=rad;j++){const k=i*(rad+1)+j;a.setXYZ(k,c.x+n.getX(k)*r,c.y+n.getY(k)*r,c.z+n.getZ(k)*r);}}g.computeVertexNormals();return g;};
  const leafMap=loader.load(new URL('../x/02/tex/leaf_spray.webp',import.meta.url).href,()=>group.userData.onTexture?.());leafMap.colorSpace=T.SRGBColorSpace;
  leafMap.wrapS=leafMap.wrapT=T.ClampToEdgeWrapping;const leafMat=new T.MeshStandardMaterial({map:leafMap,alphaTest:.45,side:T.DoubleSide,roughness:.72,color:0xdde6cf});leafMat.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vec3(.4,.52,.15)*(gl_FrontFacing?.05:.3);');};
  const tree=growKeyaki({taperTube},rand,0,0,{r:.43,hf:2.9,limbs:6,len:[4,5.2],tilt:.37,levels:3,forks:2,decay:.62,sprigs:kind==='tree'?6000:1800,back:0,det:true});
  const tg=new T.Group(),wood=mergeGeometries(tree.wood);tree.wood.forEach(g=>g.dispose());const sm=sprigMesh(tree.sprigs,leafMat,.72,[.84,.92,.67],tree.ctr,rand);
  { // Each leaf spray gets its own bend, turn, proportion and colour so the canopy does not read as identical boards.
    const og=sm.geometry,bg=new T.PlaneGeometry(.72,.72,4,4);bg.translate(0,.72*.45,0);const bp=bg.attributes.position;for(let k=0;k<bp.count;k++){const x=bp.getX(k),y=bp.getY(k);bp.setZ(k,x*x*.55+y*y*.18);}bg.computeVertexNormals();bg.setAttribute('aCtr',og.getAttribute('aCtr'));sm.geometry=bg;og.dispose();
    const m=new T.Matrix4(),r=new T.Matrix4(),sc=new T.Matrix4(),e=new T.Euler(),cc=new T.Color(),hsl={};
    for(let i=0;i<sm.count;i++){sm.getMatrixAt(i,m);e.set((rand()-.5)*.7,(rand()-.5)*.9,(rand()-.5)*1.6);r.makeRotationFromEuler(e);const k=.7+rand()*.55;sc.makeScale(k*(.75+rand()*.45),k*(.8+rand()*.45),1);m.multiply(r).multiply(sc);sm.setMatrixAt(i,m);
      if(sm.instanceColor){sm.getColorAt(i,cc);cc.getHSL(hsl);const y=rand();cc.setHSL(hsl.h+(y<.12?-.05:(rand()-.5)*.04),Math.min(1,hsl.s*(.75+rand()*.5)),hsl.l*(.72+rand()*.45));sm.setColorAt(i,cc);}}
    sm.instanceMatrix.needsUpdate=true;if(sm.instanceColor)sm.instanceColor.needsUpdate=true;sm.computeBoundingSphere();}
  tg.add(new T.Mesh(wood,bark),sm);tg.scale.setScalar(kind==='tree'?.29:.16);tg.position.set(kind==='tree'?0:-.72,kind==='tree'?-1:.07,kind==='tree'?0:-.75);body.add(tg);
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
