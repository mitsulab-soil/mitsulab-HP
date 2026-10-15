// Qualium Loop — five sculptural stages for cognitive tools.
// This is a design metaphor, not measured data or a model of a brain.
// No network requests, textures or animation loop are owned by this module.
export function createLoopScene({T, scene, world, camera, host, sprite}) {
  const palette = {ink:0x102b3b, stone:0x28535e, teal:0x4b9896, ice:0xb0eadb, gold:0xe7cd9b};
  const root = new T.Group(); root.name = 'qualium-loop-sculptures'; world.add(root);
  const hemi = new T.HemisphereLight(0xc8e6f3, 0x172b35, 2.0); scene.add(hemi);
  const key = new T.DirectionalLight(0xe5f8ef, 3.4); key.position.set(-7,12,9); scene.add(key);
  const rim = new T.DirectionalLight(0x85c5ed, 2.5); rim.position.set(8,5,-8); scene.add(rim);
  const warm = new T.DirectionalLight(0xe8cc9b, 1.0); warm.position.set(-3,2,-4); scene.add(warm);
  const solid = (color, extra={}) => new T.MeshStandardMaterial({color,metalness:.28,roughness:.4,...extra});
  const stone = solid(palette.stone), dark = solid(palette.ink), pale = solid(palette.ice), gold = solid(palette.gold,{metalness:.5});
  const glass = solid(0x6dbbb8,{transparent:true,opacity:.20,depthWrite:false,side:T.DoubleSide,metalness:.12,roughness:.24});
  const lineMaterial = (color,opacity=.6) => new T.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});
  const vector = a => new T.Vector3(...a);
  const mesh = (g,m,parent,x=0,y=0,z=0) => {const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
  function line(points, parent, color=palette.ice, opacity=.6) {
    const o=new T.Line(new T.BufferGeometry().setFromPoints(points),lineMaterial(color,opacity));parent.add(o);return o;
  }
  function tube(points,parent,color,r=.022,opacity=1) {
    const c=new T.CatmullRomCurve3(points), m=solid(color,{emissive:color,emissiveIntensity:.25,transparent:opacity<1,opacity});
    return mesh(new T.TubeGeometry(c,Math.max(24,points.length*3),r,5,false),m,parent);
  }
  function rod(a,b,r,parent,material=stone) {
    const d=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,d.length(),6),material,parent);
    o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;
  }
  function slab(parent,r,y,h,material=stone,sides=6) {
    const o=mesh(new T.CylinderGeometry(r,r*.95,h,sides),material,parent,0,y,0);o.rotation.y=Math.PI/6;return o;
  }
  const stations = Array.from({length:5},(_,i)=>{
    const group=new T.Group(),art=new T.Group(),anchor=new T.Object3D();group.name='loop-stage-'+i;group.add(art,anchor);root.add(group);
    const accent=solid(i===3?palette.ice:palette.teal,{emissive:i===3?0x518e86:0x275b60,emissiveIntensity:.28});
    slab(art,1.13,-.38,.18,dark);slab(art,1.06,-.26,.12,stone);
    const glow=new T.MeshBasicMaterial({color:i===3?palette.gold:palette.ice,transparent:true,opacity:.32,depthWrite:false,toneMapped:false});
    const trace=mesh(new T.TorusGeometry(1.03,.014,5,60),glow,art,0,-.18,0);trace.rotation.x=Math.PI/2;
    anchor.position.set(0,-.46,1.17);
    return {group,art,anchor,accent,glow,trace};
  });

  // 01 Reality: a cut section of a place — terrain, water, trees and a few buildings.
  {
    const {art,accent}=stations[0];
    for(let k=0;k<3;k++) {const s=slab(art,.96-k*.035,-.13+k*.075,.09,k===0?dark:stone,8);s.rotation.y=.12*k;}
    const g=new T.PlaneGeometry(1.72,1.52,16,14);g.rotateX(-Math.PI/2);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,.16+Math.sin(x*3.5+z)*.075+Math.exp(-((x+.5)**2+(z+.1)**2)*7)*.22);}
    g.computeVertexNormals();mesh(g,accent,art);
    const river=[];for(let i=0;i<32;i++){const z=i/31*1.4-.7;river.push(new T.Vector3(Math.sin(z*3)*.12+.12,.19,z));}tube(river,art,0xb4f3ed,.028);
    const trunkGeo=new T.CylinderGeometry(.025,.035,.30,5),leafGeo=new T.IcosahedronGeometry(.15,1);
    const trunks=new T.InstancedMesh(trunkGeo,dark,8),leaves=new T.InstancedMesh(leafGeo,pale,8),dummy=new T.Object3D();
    for(let i=0;i<8;i++){const x=-.62+(i%2)*.28,z=-.58+Math.floor(i/2)*.35,h=.25+(i%3)*.04;dummy.position.set(x,h+.12,z);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=h+.34;dummy.scale.set(1,1.55,1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);}art.add(trunks,leaves);
    [[.54,.28,-.45],[.65,.17,.02],[.45,.37,.47]].forEach(([x,h,z])=>{const b=mesh(new T.BoxGeometry(.25,h,.23),pale,art,x,.2+h/2,z);b.rotation.y=.1;mesh(new T.BoxGeometry(.16,.015,.15),gold,b,0,h/2+.012,0);});
  }

  // 02 Computation: relationships have spatial depth, rather than a single AI emblem.
  {
    const {art,accent}=stations[1];
    const grid=[];for(let k=0;k<3;k++){const y=.18+k*.39;const p=mesh(new T.BoxGeometry(1.35,.035,1.25),glass,art,0,y,0);p.rotation.y=k*.09;for(let j=-2;j<=2;j++){grid.push(new T.Vector3(-.64,y+.025,j*.24),new T.Vector3(.64,y+.025,j*.24));grid.push(new T.Vector3(j*.24,y+.025,-.61),new T.Vector3(j*.24,y+.025,.61));}}
    art.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(grid),lineMaterial(palette.teal,.45)));
    const nodes=[];for(let i=0;i<12;i++)nodes.push(new T.Vector3((i%3-1)*.46,.25+Math.floor(i/3)*.25,Math.sin(i*1.9)*.43));
    for(let i=0;i<nodes.length;i++){const n=mesh(new T.OctahedronGeometry(i===5?.11:.065,0),i===5?gold:accent,art);n.position.copy(nodes[i]);for(const j of [i+1,i+3])if(j<nodes.length)rod(nodes[i],nodes[j],.012,art,pale);}
    const blockGeo=new T.BoxGeometry(.15,1,.15),blocks=new T.InstancedMesh(blockGeo,accent,12),o=new T.Object3D();
    for(let i=0;i<12;i++){const h=.08+(i%4)*.06;o.position.set(-.6+(i%4)*.4,-.08+h/2,-.48+Math.floor(i/4)*.46);o.scale.set(1,h,1);o.updateMatrix();blocks.setMatrixAt(i,o.matrix);}art.add(blocks);
  }

  // 03 Transformation: three continuous folded ribbons translate one flow into modalities.
  const ribbons=[];
  {
    const {art,accent}=stations[2];
    const gate=mesh(new T.TorusGeometry(.55,.043,8,52),pale,art,.10,.61,0);gate.rotation.y=Math.PI/2;
    for(let k=0;k<3;k++){
      const n=54,a=new Float32Array((n+1)*2*3),ix=[];
      for(let i=0;i<n;i++){const j=i*2;ix.push(j,j+1,j+2,j+1,j+3,j+2);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(a,3));g.setIndex(ix);
      const mat=solid(k===1?palette.gold:k===2?palette.ice:palette.teal,{emissive:k===1?0x6a5733:0x28675e,emissiveIntensity:.28,side:T.DoubleSide,metalness:.42,roughness:.3});
      const o=mesh(g,mat,art);ribbons.push({g,a,n,k});
    }
    const sensor=mesh(new T.BoxGeometry(.16,.35,.95),accent,art,-.91,.28,0);sensor.rotation.z=-.18;
    for(let i=0;i<3;i++){const end=mesh(new T.CylinderGeometry(.07,.07,.12,12),i===1?gold:pale,art,.91,.32+i*.18,(i-1)*.21);end.rotation.z=Math.PI/2;}
  }

  // 04 Cognition: layered, open frames are alternative interpretations, not anatomy.
  const frames=[];
  {
    const {art,accent}=stations[3];
    const shape=new T.Shape();shape.moveTo(-.35,-.4);shape.lineTo(.35,-.4);shape.lineTo(.35,.4);shape.lineTo(-.35,.4);shape.closePath();
    const hole=new T.Path();hole.moveTo(-.27,-.31);hole.lineTo(-.27,.31);hole.lineTo(.27,.31);hole.lineTo(.27,-.31);hole.closePath();shape.holes.push(hole);
    const frameGeometry=new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.015,bevelThickness:.015});
    for(let i=0;i<5;i++){
      const f=mesh(frameGeometry,i===2?gold:accent,art,(i-2)*.31,.46+Math.sin(i/4*Math.PI)*.19,-Math.abs(i-2)*.22);
      f.rotation.y=(i-2)*.26;f.rotation.z=(i-2)*-.05;frames.push({object:f,base:f.rotation.y});
      mesh(new T.PlaneGeometry(.50,.58),glass,f,0,0,.02);
    }
    const connections=[];for(let i=0;i<5;i++)connections.push(new T.Vector3((i-2)*.31,.53+Math.sin(i)*.12,-Math.abs(i-2)*.22+.12));tube(connections,art,palette.ice,.017);
    const focus=mesh(new T.OctahedronGeometry(.18,0),pale,art,0,.60,.24);focus.rotation.z=.35;
  }

  // 05 Action: a rising path branches and carries a new question back to the place.
  {
    const {art,accent}=stations[4];
    for(let i=0;i<6;i++){const x=-.62+i*.23,z=.38-i*.15,h=.09+i*.075;mesh(new T.BoxGeometry(.38,h,.34),i%2?accent:stone,art,x,-.1+h/2,z);}
    const points=[[-.83,.04,.5],[-.35,.22,.18],[.17,.40,-.10],[.63,.58,-.42]].map(vector);tube(points,art,palette.gold,.025);
    for(const sign of [-1,1])tube([[.15,.38,-.10],[.46*sign,.65,-.40],[.83*sign,.77,-.63]].map(vector),art,palette.ice,.017,.75);
    const arrow=new T.Shape();arrow.moveTo(-.17,-.21);arrow.lineTo(.17,-.21);arrow.lineTo(.17,.02);arrow.lineTo(.32,.02);arrow.lineTo(0,.35);arrow.lineTo(-.32,.02);arrow.lineTo(-.17,.02);arrow.closePath();
    const a=mesh(new T.ExtrudeGeometry(arrow,{depth:.055,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:1,steps:1}),gold,art,.52,.72,-.44);a.rotation.x=-.55;a.rotation.z=-.5;
  }

  // The central opening stays quiet for the existing HTML title.
  const core=new T.Group(),coreAnchor=new T.Object3D();root.add(core,coreAnchor);
  const haloMat=lineMaterial(palette.teal,.32);
  for(let k=0;k<3;k++){const pts=[];for(let i=0;i<=90;i++){const a=i/90*Math.PI*2;pts.push(new T.Vector3(Math.cos(a)*(1.05+k*.12),Math.sin(a*.0)+k*.13-.45,Math.sin(a)*(.63+k*.07)));}core.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),haloMat));}
  const links=new T.Group();root.add(links);let curves=[];
  const particleCount=150,particles=new Float32Array(particleCount*3),colors=new Float32Array(particleCount*3),pg=new T.BufferGeometry();
  pg.setAttribute('position',new T.BufferAttribute(particles,3));
  for(let i=0;i<particleCount;i++){const c=new T.Color(i>=120?palette.gold:palette.ice);colors.set(c.toArray(),i*3);}pg.setAttribute('color',new T.BufferAttribute(colors,3));
  const stream=new T.Points(pg,new T.PointsMaterial({size:.075,map:sprite,vertexColors:true,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));stream.frustumCulled=false;root.add(stream);
  const tmp=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(),dir=new T.Vector3(0,.74,1).normalize();
  let width=1,height=1,portrait=false,clock=0,current=3;
  const wide=[[-4.7,0,.1],[-.8,.75,-3.2],[4.65,.12,-.1],[2.9,-.22,4.0],[-3.5,-.35,3.8]];
  const narrow=[[-2.25,0,-2.9],[2.20,.25,-2.9],[2.45,-.1,1.35],[0,-.20,5.15],[-2.50,-.1,1.35]];
  function rebuildLinks() {
    for(const o of [...links.children]){o.geometry?.dispose();if(o.material!==pale)o.material?.dispose();links.remove(o);}curves=[];
    for(let i=0;i<5;i++){
      const a=stations[i].group.position.clone().add(new T.Vector3(0,-.2,0)),b=stations[(i+1)%5].group.position.clone().add(new T.Vector3(0,-.2,0));
      const center=core.position,mid=a.clone().add(b).multiplyScalar(.5),outward=mid.clone().sub(center);outward.y=0;outward.normalize().multiplyScalar(.65);mid.add(outward);mid.y+=.28;
      const c=new T.CatmullRomCurve3([a,a.clone().lerp(mid,.8),b.clone().lerp(mid,.8),b]);curves.push(c);
      const color=i===4?palette.gold:palette.teal;
      const route=mesh(new T.TubeGeometry(c,48,.018,5,false),solid(color,{emissive:color,emissiveIntensity:.4,roughness:.3}),links);route.name='loop-connection-'+i;
      line(c.getPoints(60),links,i===4?palette.gold:palette.ice,.50);
      const pointer=mesh(new T.ConeGeometry(.06,.21,5),pale,links);pointer.position.copy(c.getPoint(.67));pointer.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),c.getTangent(.67).normalize());
    }
  }
  function animateRibbons(time) {
    for(const {g,a,n,k} of ribbons){for(let i=0;i<=n;i++){const x=i/n*1.85-.925,phase=x*5.8-time*.55+k*.75,amp=.08+i/n*.13;for(let edge=0;edge<2;edge++){const j=(i*2+edge)*3;a[j]=x;a[j+1]=.44+Math.sin(phase)*amp+k*.13+(edge-.5)*.065;a[j+2]=(k-1)*.28+Math.cos(phase)*.055;}}g.attributes.position.needsUpdate=true;g.computeVertexNormals();}
  }
  function update({time=0,dt=0,selected=3}={}) {
    clock=Number.isFinite(time)?time:clock;current=Math.max(0,Math.min(4,Number(selected)||0));
    root.rotation.y=Math.sin(clock*.055)*.022;
    stations.forEach((s,i)=>{s.art.position.y=Math.sin(clock*.34+i*.7)*.025;s.art.rotation.y=.10+Math.sin(clock*.12+i)*.035;s.accent.emissiveIntensity=i===current?.55:.18;s.glow.opacity=i===current?.85:.28;s.trace.scale.setScalar(i===current?1.04:1);});
    frames.forEach(({object,base},i)=>{object.rotation.y=base+Math.sin(clock*.16+i)*.04;});animateRibbons(clock);
    for(let i=0;i<particleCount;i++){const c=curves[Math.floor(i/30)];if(c){c.getPoint((clock*.055+(i%30)/30)%1,tmp);particles.set(tmp.toArray(),i*3);}}pg.attributes.position.needsUpdate=true;
  }
  function resize({width:w,height:h}={}) {
    width=Math.max(1,w||host.clientWidth);height=Math.max(1,h||host.clientHeight);portrait=width/height<1.12;
    const layout=portrait?narrow:wide;stations.forEach((s,i)=>{s.group.position.fromArray(layout[i]);s.group.scale.setScalar(portrait?.90:1);s.anchor.position.set(0,-.50,portrait?1.22:1.27);});
    core.position.set(portrait?0:-.15,-.12,portrait?1.2:.75);coreAnchor.position.copy(core.position).add(new T.Vector3(0,portrait?1.1:.14,.10));
    root.rotation.y=0;rebuildLinks();update({time:clock,selected:current});root.updateMatrixWorld(true);
    // Fit actual sculptural bounds, with room for labels and the pause control.
    const box=new T.Box3();stations.forEach(s=>box.expandByObject(s.group));box.expandByObject(core);box.expandByScalar(.38);const target=box.getCenter(new T.Vector3());target.y+=.12;
    camera.fov=38;camera.zoom=portrait?1.4:1.18;camera.aspect=width/height;camera.up.set(0,1,0);right.crossVectors(camera.up,dir).normalize();up.crossVectors(dir,right).normalize();
    const tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));let distance=8;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){tmp.set(x,y,z).sub(target);const depth=tmp.dot(dir);distance=Math.max(distance,depth+Math.abs(tmp.dot(right))/(tan*camera.aspect*.86),depth+Math.abs(tmp.dot(up))/(tan*.77));}
    camera.position.copy(target).addScaledVector(dir,distance);camera.near=.1;camera.far=Math.max(100,distance*5);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);projectLabels();
  }
  function projectLabels() {
    root.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const buttons=[...host.querySelectorAll('[data-node]')];
    function place(element,anchor) {
      if(!element)return;anchor.getWorldPosition(tmp).project(camera);
      // Coordinates remain tied to their actual world-space anchors, including external camera changes.
      const x=(tmp.x*.5+.5)*width,y=(-tmp.y*.5+.5)*height;
      element.style.left=x+'px';element.style.top=y+'px';element.style.transform='translate(-50%,-50%)';
      element.dataset.projected='true';
    }
    stations.forEach((s,i)=>place(buttons.find(b=>Number(b.dataset.node)===i)||buttons[i],s.anchor));place(host.querySelector('.qt-flow-core'),coreAnchor);
  }
  animateRibbons(0);resize({width:host.clientWidth,height:host.clientHeight});
  return {update,resize,projectLabels};
}
