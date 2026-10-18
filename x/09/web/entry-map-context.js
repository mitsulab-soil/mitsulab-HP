/* Existing GIS / aerial photo / PLATEAU and structures, with geographic context.
 * Station boxes and dashed access links are symbols, not surveyed buildings/routes.
 */
export function createEntryMapContext(C,map,host,{places=[]}={}){
 const T=C.THREE,scene=map.scene,camera=map.camera,baseProject=map.project.bind(map),baseRender=map.render.bind(map),group=new T.Group();group.name='entry-geographic-context';scene.traverse(o=>{if(o.isPoints)o.visible=false;});scene.add(group);
 scene.add(new T.HemisphereLight(0xe0efff,0x6c7156,2.4));const sun=new T.DirectionalLight(0xffecd4,2.8);sun.position.set(-900,1600,700);scene.add(sun);
 let selectedD=0,level='wide',size='',revision=0,meshRevision=0,lastSync=0,lastStructureCount=0;const state={level:'wide',terrain:false,structures:[],buildings:0,stations:[],downloads:0};
 const geo=places.filter(p=>['大宮駅','さいたま新都心駅'].includes(p[0])).map(p=>{const q=C.toXZ(p[1],p[2]);const world=[q[0]??q.x,14,q[1]??q.z];return {name:p[0],ll:[p[1],p[2]],world};});state.stations=geo;
 const line=C.D.centerline,ends=[line[0].p,line.at(-1).p],rail=0xa8bac2;
 const contextPoints=[...ends,...geo.map(g=>g.world)],contextX=contextPoints.map(p=>p[0]),contextZ=contextPoints.map(p=>p[2]);const contextBoard=new T.Mesh(new T.PlaneGeometry(12000,12000),new T.MeshBasicMaterial({color:0x0b2329}));contextBoard.rotation.x=-Math.PI/2;contextBoard.position.set((Math.max(...contextX)+Math.min(...contextX))/2,-12,(Math.max(...contextZ)+Math.min(...contextZ))/2);group.add(contextBoard);
 const basic=(color)=>new T.MeshBasicMaterial({color});
 for(const g of geo){const station=new T.Mesh(new T.BoxGeometry(60,22,95),basic(0xd5c6a2));station.position.set(...g.world);station.position.y+=11;group.add(station);const nearest=line.reduce((a,b)=>Math.hypot(b.p[0]-g.world[0],b.p[2]-g.world[2])<Math.hypot(a.p[0]-g.world[0],a.p[2]-g.world[2])?b:a);const points=[new T.Vector3(...g.world),new T.Vector3(nearest.p[0],17,nearest.p[2])];const access=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:rail,dashSize:18,gapSize:12,transparent:true,opacity:.8}));access.computeLineDistances();group.add(access);}
 const crowns=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshLambertMaterial({color:0x537651}),C.D.trees.length),dummy=new T.Object3D();C.D.trees.forEach((q,i)=>{dummy.position.set(q.p[0],q.p[1]+11,q.p[2]);dummy.scale.set(5.5,8,5.5);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);});group.add(crowns);
 const ui=document.createElement('div');ui.className='entryGeoLabels';host.append(ui);
 const labels=geo.map(g=>{const el=document.createElement('span');el.className='entryStation';el.textContent=g.name;el.dataset.station=g.name;ui.append(el);return {el,p:[g.world[0],65,g.world[2]],wide:true};});
 const actors=[];const north=document.createElement('span');north.className='entryNorth';north.textContent='N ↑ 北';host.append(north);
 const levels=document.createElement('div');levels.className='entryMapLevels';levels.setAttribute('role','group');levels.setAttribute('aria-label','地図の範囲');levels.innerHTML='<button type="button" data-map-level="wide" aria-pressed="true">駅と参道</button><button type="button" data-map-level="sando" aria-pressed="false">選んだ場所</button>';host.parentElement.querySelector('.ovH').append(levels);
 const note=document.createElement('p');note.className='entryGeoNote';note.textContent='点線は位置関係（徒歩経路ではありません）。鳥居・神社は見やすく拡大。';host.append(note);
 function setView(v){level=v==='sando'?'sando':'wide';state.level=level;size='';revision++;levels.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapLevel===level)));ui.dataset.level=level;for(const a of actors)a.copy.scale.copy(a.scale).multiplyScalar(level==='wide'?3:6);}
 levels.querySelectorAll('button').forEach(b=>b.onclick=()=>setView(b.dataset.mapLevel));
 function fit(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;const key=[r.width,r.height,level,revision].join(':');baseProject(ends[0]);if(size===key)return;size=key;
 const points=level==='wide'?[...ends,...geo.map(g=>g.world)]:[C.pointAt(Math.max(line[0].d,selectedD-150)),C.pointAt(Math.min(line.at(-1).d,selectedD+150))];
 const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]),cx=(Math.max(...xs)+Math.min(...xs))/2,cz=(Math.max(...zs)+Math.min(...zs))/2,span=Math.max(...zs)-Math.min(...zs)+350;
 camera.position.set(cx,span*(level==='wide'?1.8:.65),cz+span*(level==='wide'?.9:.75));camera.lookAt(cx,10,cz);camera.updateMatrixWorld();const coords=points.map(p=>new T.Vector3(p[0],p[1]+100,p[2]).applyMatrix4(camera.matrixWorldInverse)),aspect=r.width/r.height;
 const hx=Math.max(...coords.map(p=>Math.abs(p.x)))+190,hy=Math.max(...coords.map(p=>Math.abs(p.y)))+(level==='wide'?300:130),halfW=Math.max(hx,hy*aspect),halfH=halfW/aspect;
 camera.left=-halfW;camera.right=halfW;camera.top=halfH;camera.bottom=-halfH;camera.near=1;camera.far=span*6;camera.updateProjectionMatrix();}
 const v=new T.Vector3();function project(p){fit();const r=host.getBoundingClientRect();v.set(...p).project(camera);return{x:(v.x+1)*r.width/2,y:(1-v.y)*r.height/2,z:v.z};}
 function sync(){const now=performance.now(),structureCount=C.STRUCTS?.length??0;
 // Reuse this render's existing sync when structure placement changes its source count.
 // Unchanged sources keep the 500ms cadence; a clock reset restarts the wait without an extra sync.
 if(structureCount===lastStructureCount){if(now<lastSync){lastSync=now;return;}if(now-lastSync<500)return;}
 lastSync=now;lastStructureCount=structureCount;
 if(!state.terrain&&C.terrain){C.terrain.updateWorldMatrix(true,false);const terrain=new T.Mesh(C.terrain.geometry,C.terrain.material);terrain.matrix.copy(C.terrain.matrixWorld);terrain.matrixAutoUpdate=false;group.add(terrain);state.terrain=true;}
 const mats=new Map();C.buildings?.traverse(o=>{if(o.isMesh)mats.set(o.geometry,{material:o.material,render:!!(o.layers.mask&1)});});scene.traverse(o=>{if(o.isMesh&&mats.has(o.geometry)){const source=mats.get(o.geometry);o.visible=source.render;if(o.material!==source.material){o.material=source.material;if(source.render)state.buildings++;}}});
 for(const s of C.STRUCTS||[]){if(!/^(torii_[123]|romon|kairo_[we]|shinkyo)$/.test(s.it.id)||state.structures.includes(s.it.id))continue;s.obj.updateWorldMatrix(true,true);const copy=s.obj.clone(true);s.obj.matrixWorld.decompose(copy.position,copy.quaternion,copy.scale);const originalScale=copy.scale.clone();actors.push({copy,scale:originalScale});copy.scale.multiplyScalar(level==='wide'?3:6);copy.visible=true;group.add(copy);state.structures.push(s.it.id);const el=document.createElement('span');el.className='entryStructure';el.textContent=s.it.name||s.it.id;if(s.it.id==='romon'){ui.append(el);labels.push({el,p:[copy.position.x,copy.position.y+100,copy.position.z],wide:false});}meshRevision++;}
 }
 const baseSelect=map.select.bind(map);map.select=q=>{selectedD=q.dd;revision++;baseSelect(q);};
 map.project=project;map.render=renderer=>{sync();fit();baseRender(renderer);for(const l of labels){l.el.hidden=l.wide&&level!=='wide';const q=project(l.p);l.el.style.left=q.x+'px';l.el.style.top=q.y+'px';}host.dataset.mapLevel=level;};
 return {setView,get level(){return level;},status:()=>({...state,cameraPosition:camera.position.toArray(),stationCoordinates:geo.map(g=>({name:g.name,ll:g.ll,world:g.world})),meshRevision})};
}
