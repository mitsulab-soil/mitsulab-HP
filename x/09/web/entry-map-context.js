/* Existing GIS / aerial photo / PLATEAU and structures, with geographic context.
 * Station boxes and dashed access links are symbols, not surveyed buildings/routes.
 */
export function createEntryMapContext(C,map,host,{places=[]}={}){
 const T=C.THREE,scene=map.scene,camera=map.camera,baseProject=map.project.bind(map),baseRender=map.render.bind(map),group=new T.Group();group.name='entry-geographic-context';scene.traverse(o=>{if(o.isPoints)o.visible=false;});scene.add(group);
 scene.add(new T.HemisphereLight(0xe0efff,0x6c7156,2.4));const sun=new T.DirectionalLight(0xffecd4,2.8);sun.position.set(-900,1600,700);scene.add(sun);
 let K=2.4,selectedD=0,level='wide',size='',revision=0,meshRevision=0,lastSync=0,lastStructureCount=0;const state={level:'wide',terrain:false,structures:[],buildings:0,stations:[],downloads:0};
 const geo=places.filter(p=>['大宮駅','さいたま新都心駅'].includes(p[0])).map(p=>{const q=C.toXZ(p[1],p[2]);const world=[q[0]??q.x,14,q[1]??q.z];return {name:p[0],ll:[p[1],p[2]],world};});state.stations=geo;
 const line=C.D.centerline,ends=[line[0].p,line.at(-1).p],rail=0xa8bac2;
 const contextPoints=[...ends,...geo.map(g=>g.world)],contextX=contextPoints.map(p=>p[0]),contextZ=contextPoints.map(p=>p[2]);const contextBoard=new T.Mesh(new T.PlaneGeometry(12000,12000),new T.MeshBasicMaterial({color:0x0a1f24}));scene.fog=new T.Fog(0x071a1f,2600,6200);contextBoard.rotation.x=-Math.PI/2;contextBoard.position.set((Math.max(...contextX)+Math.min(...contextX))/2,-12,(Math.max(...contextZ)+Math.min(...contextZ))/2);group.add(contextBoard);
 const basic=(color)=>new T.MeshBasicMaterial({color});
 const concrete=new T.MeshLambertMaterial({color:0xb9b4aa}),roofM=new T.MeshLambertMaterial({color:0x6f7a7c});
 if(geo.length===2){const [ga,gb]=geo,dx=gb.world[0]-ga.world[0],dz=gb.world[2]-ga.world[2],L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L,ang=Math.atan2(dx,dz);
  /* 2026-10-19：両駅を通る線路（同じ線の上にある二つの駅）。幅と本数は位置の目安で、線路の実測形状ではない */
  const bed=new T.Mesh(new T.PlaneGeometry(26,L+700),new T.MeshLambertMaterial({color:0x4a4943}));bed.rotation.set(-Math.PI/2,0,ang,'YXZ');bed.position.set((ga.world[0]+gb.world[0])/2,12.6,(ga.world[2]+gb.world[2])/2);group.add(bed);
  for(const off of [-7,-2.5,2.5,7]){const rl=new T.Mesh(new T.PlaneGeometry(1.4,L+700),new T.MeshBasicMaterial({color:0xb7c3c6}));rl.rotation.copy(bed.rotation);rl.position.copy(bed.position).add(new T.Vector3(uz*off,.25,-ux*off));group.add(rl);}
  for(const g of geo){const body=new T.Mesh(new T.BoxGeometry(46,16,150),concrete);body.rotation.y=ang;body.position.set(g.world[0]-uz*30,12.6+8,g.world[2]+ux*30);group.add(body);const roof=new T.Mesh(new T.BoxGeometry(50,2,156),roofM);roof.rotation.y=ang;roof.position.copy(body.position);roof.position.y+=9;group.add(roof);const plat=new T.Mesh(new T.BoxGeometry(10,2,210),concrete);plat.rotation.y=ang;plat.position.set(g.world[0],13.6,g.world[2]);group.add(plat);}}
 for(const g of geo){const nearest=line.reduce((a,b)=>Math.hypot(b.p[0]-g.world[0],b.p[2]-g.world[2])<Math.hypot(a.p[0]-g.world[0],a.p[2]-g.world[2])?b:a);const points=[new T.Vector3(...g.world),new T.Vector3(nearest.p[0],17,nearest.p[2])];const access=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:rail,dashSize:18,gapSize:12,transparent:true,opacity:.8}));access.computeLineDistances();group.add(access);}
 /* 2026-10-19：並木と社叢・公園の樹林（位置と樹種は模式。元の出典説明を引き継ぐ）を、樹種の高さと幅・色の違いで */
 const FT=(C.forest?.trees||[]),SP=C.forest?.species||{},allT=[...C.D.trees.map(q=>({p:q.p,sp:'keyaki',s:1})),...FT],tint={keyaki:[.33,.47,.26],shii:[.22,.33,.2],kashi:[.24,.36,.22],kusu:[.3,.44,.24],sugi:[.18,.28,.18],matsu:[.22,.32,.2],hinoki:[.19,.29,.19],sakura:[.36,.44,.28],enoki:[.32,.45,.25]};
 const crowns=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshLambertMaterial({color:0xffffff,flatShading:true}),allT.length),dummy=new T.Object3D(),col=new T.Color();
 allT.forEach((q,i)=>{const sp=SP[q.sp]||{H:16,R:6.5},s=q.s||1,H=sp.H*s,R=sp.R*s*(.85+.3*Math.abs(Math.sin(i*7.13))),conic=/sugi|hinoki/.test(q.sp);dummy.position.set(q.p[0],q.p[1]+H*.62,q.p[2]);dummy.scale.set(R*(conic?.55:1),H*(conic?.48:.36),R*(conic?.55:1));dummy.rotation.y=i*1.7;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);const c=tint[q.sp]||tint.keyaki,v=.82+.36*Math.abs(Math.sin(i*3.31));col.setRGB(c[0]*v,c[1]*v,c[2]*v);crowns.setColorAt(i,col);});
 crowns.instanceColor.needsUpdate=true;group.add(crowns);
 const ui=document.createElement('div');ui.className='entryGeoLabels';host.append(ui);
 const labels=geo.map(g=>{const el=document.createElement('span');el.className='entryStation';el.textContent=g.name;el.dataset.station=g.name;ui.append(el);return {el,p:[g.world[0],65,g.world[2]],wide:true};});
 const actors=[];const north=document.createElement('span');north.className='entryNorth';north.textContent='N ↑ 北';host.append(north);
 const levels=document.createElement('div');levels.className='entryMapLevels';levels.setAttribute('role','group');levels.setAttribute('aria-label','地図の範囲');levels.innerHTML='<button type="button" data-map-level="wide" aria-pressed="true">駅と参道</button><button type="button" data-map-level="sando" aria-pressed="false">選んだ場所</button>';host.parentElement.querySelector('.ovH').append(levels);
 const note=document.createElement('p');note.className='entryGeoNote';note.textContent='点線は位置関係（徒歩経路ではありません）。鳥居・神社は見やすく拡大、高さは強調。光の柱は記録の場所（緑＝自然・橙＝歴史・青＝暮らしと文化）。';host.append(note);
 function applyK(){K=level==='wide'?2.4:1.6;for(const o of scene.children)if(o.isGroup)o.scale.y=K;}
 function setView(v){level=v==='sando'?'sando':'wide';applyK();state.level=level;size='';revision++;levels.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapLevel===level)));ui.dataset.level=level;for(const a of actors)a.copy.scale.copy(a.scale).multiplyScalar(level==='wide'?3:6);}
 levels.querySelectorAll('button').forEach(b=>b.onclick=()=>setView(b.dataset.mapLevel));
 function fit(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;const key=[r.width,r.height,level,revision].join(':');baseProject(ends[0]);if(size===key)return;size=key;
 const points=level==='wide'?[...ends,...geo.map(g=>g.world)]:[C.pointAt(Math.max(line[0].d,selectedD-150)),C.pointAt(Math.min(line.at(-1).d,selectedD+150))];
 const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]),cx=(Math.max(...xs)+Math.min(...xs))/2,cz=(Math.max(...zs)+Math.min(...zs))/2,span=Math.max(...zs)-Math.min(...zs)+350;
 /* 2026-10-19：斜めから見る写実の地図（高さは強調して見せる。地図の注記に書く） */
 camera.position.set(cx+span*(level==='wide'?.1:.3),span*(level==='wide'?.62:.5),cz+span*(level==='wide'?.95:.75));camera.lookAt(cx,10*K,cz);camera.updateMatrixWorld();const coords=points.map(p=>new T.Vector3(p[0],(p[1]+100)*K,p[2]).applyMatrix4(camera.matrixWorldInverse)),aspect=r.width/r.height;
 const hx=Math.max(...coords.map(p=>Math.abs(p.x)))+(level==='wide'?70:150),hy=Math.max(...coords.map(p=>Math.abs(p.y)))+(level==='wide'?110:110),halfW=Math.max(hx,hy*aspect),halfH=halfW/aspect;
 camera.left=-halfW;camera.right=halfW;camera.top=halfH;camera.bottom=-halfH;camera.near=1;camera.far=span*6;camera.updateProjectionMatrix();}
 const v=new T.Vector3();function project(p){fit();const r=host.getBoundingClientRect();v.set(p[0],p[1]*K,p[2]).project(camera);return{x:(v.x+1)*r.width/2,y:(1-v.y)*r.height/2,z:v.z};}
 function sync(){const now=performance.now(),structureCount=C.STRUCTS?.length??0;
 // Reuse this render's existing sync when structure placement changes its source count.
 // Unchanged sources keep the 500ms cadence; a clock reset restarts the wait without an extra sync.
 if(structureCount===lastStructureCount){if(now<lastSync){lastSync=now;return;}if(now-lastSync<500)return;}
 lastSync=now;lastStructureCount=structureCount;
 if(!state.terrain&&C.terrain){C.terrain.updateWorldMatrix(true,false);const terrain=new T.Mesh(C.terrain.geometry,C.terrain.material);terrain.matrix.copy(C.terrain.matrixWorld);terrain.matrixAutoUpdate=false;group.add(terrain);state.terrain=true;}
 const mats=new Map();C.buildings?.traverse(o=>{if(o.isMesh)mats.set(o.geometry,{material:o.material,render:!!(o.layers.mask&1)});});scene.traverse(o=>{if(o.isMesh&&mats.has(o.geometry)){const source=mats.get(o.geometry);o.visible=source.render;if(o.material!==source.material){o.material=source.material;if(source.render)state.buildings++;}}});
 for(const s of C.STRUCTS||[]){if(!/^(torii_[123]|romon|kairo_[we]|shinkyo)$/.test(s.it.id)||state.structures.includes(s.it.id))continue;s.obj.updateWorldMatrix(true,true);const copy=s.obj.clone(true);s.obj.matrixWorld.decompose(copy.position,copy.quaternion,copy.scale);const originalScale=copy.scale.clone();actors.push({copy,scale:originalScale});copy.scale.multiplyScalar(level==='wide'?3:6);copy.visible=true;group.add(copy);state.structures.push(s.it.id);const el=document.createElement('span');el.className='entryStructure';el.textContent=s.it.name||s.it.id;if(s.it.id==='romon'){ui.append(el);labels.push({el,p:[copy.position.x,copy.position.y+100,copy.position.z],wide:false});}meshRevision++;}
 }
 /* 2026-10-19：記録 48 件を、その地点に立つ光の柱で（層ごとの高さと色）。初回描画の 2 秒後に読む */
 const LC={nature:[.56,.92,.74],history:[.98,.8,.52],culture:[.72,.84,1]},LH={nature:34,history:56,culture:78},LOF={ecology:'nature',environment:'nature',body:'nature',history:'history',folk:'culture',social:'culture',art:'culture',events:'culture',fiction:'culture'};
 let pillars=null,caps=null;state.pillars=0;
 setTimeout(()=>fetch(new URL('./entry-map-records.json',import.meta.url)).then(r=>r.ok?r.json():null).then(d=>{if(!d)return;const items=(d.items||[]).map(([id,layer,dd])=>({id,layer,dd}));const n=items.length;if(!n)return;
  const geo=new T.CylinderGeometry(2.2,2.2,1,6,1,true);geo.translate(0,.5,0);
  pillars=new T.InstancedMesh(geo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.78,depthWrite:false,toneMapped:false}),n);
  const cp=new Float32Array(n*3),cc=new Float32Array(n*3),m=new T.Object3D(),c=new T.Color();
  items.forEach((it,i)=>{const L=LC[it.layer]?it.layer:'culture',dd=it.dd,q=C.pointAt(Math.max(line[0].d,Math.min(line.at(-1).d,dd))),side=((i*37)%7-3)*7,h=LH[L];
   m.position.set(q[0]+side,q[1],q[2]+((i*53)%5-2)*5);m.scale.set(1,h,1);m.updateMatrix();pillars.setMatrixAt(i,m.matrix);c.setRGB(...LC[L]);pillars.setColorAt(i,c);cp.set([m.position.x,q[1]+h,m.position.z],i*3);cc.set(LC[L],i*3);});
  pillars.instanceColor.needsUpdate=true;pillars.renderOrder=3;group.add(pillars);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(cp,3));g.setAttribute('color',new T.Float32BufferAttribute(cc,3));
  const gc=document.createElement('canvas');gc.width=gc.height=32;const gx=gc.getContext('2d'),gr=gx.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'#fff');gr.addColorStop(.35,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');gx.fillStyle=gr;gx.fillRect(0,0,32,32);
  caps=new T.Points(g,new T.PointsMaterial({map:new T.CanvasTexture(gc),size:12,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.95,depthWrite:false,toneMapped:false}));caps.renderOrder=4;group.add(caps);state.pillars=n;
 }).catch(()=>{}),2000);
 const baseSelect=map.select.bind(map);map.select=q=>{selectedD=q.dd;revision++;baseSelect(q);};
 map.project=project;map.render=renderer=>{sync();fit();baseRender(renderer);for(const l of labels){l.el.hidden=l.wide&&level!=='wide';const q=project(l.p);l.el.style.left=q.x+'px';l.el.style.top=q.y+'px';}host.dataset.mapLevel=level;};
 applyK();
 return {setView,get level(){return level;},status:()=>({...state,cameraPosition:camera.position.toArray(),stationCoordinates:geo.map(g=>({name:g.name,ll:g.ll,world:g.world})),meshRevision})};
}
