// Qualium Loop: illustrative point fields, not measured scans or brain data.
// One GPU point cloud holds the six forms; the host owns visibility and motion.
export async function createLoopScene({T,scene,world,camera,host,renderer}) {
 const root=new T.Group();root.name='qualium-information-field';world.add(root);
 renderer.shadowMap.enabled=false;
 const colors=[0x8dc8b7,0xb6cec0,0x71b5cb,0xd5c59a,0xc6ddd6,0x8dc3bf].map(c=>new T.Color(c));
 let seed=134613;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const points=[],rgb=[],stage=[],sizes=[],phase=[],groups=[];
 const anchors=Array.from({length:6},()=>{const o=new T.Object3D();root.add(o);return o;});
 function point(i,x,y,z,brightness=.65,size=1){points.push(x,y,z);const c=colors[i];rgb.push(c.r*brightness,c.g*brightness,c.b*brightness);stage.push(i);sizes.push(size);phase.push(rand()*6.283);}
 function path(i,fn,n=240,width=.015){for(let j=0;j<n;j++){const p=fn(j/(n-1));point(i,p[0]+(rand()-.5)*width,p[1]+(rand()-.5)*width,p[2]+(rand()-.5)*width,.45+rand()*.5,.8+rand()*.6);}}
 function surface(i,count,fn){for(let j=0;j<count;j++){const p=fn(rand(),rand(),rand());point(i,...p,.40+rand()*.58,.75+rand()*.65);}}
 function terrain(x,z){return .08+.15*Math.sin(x*2.7+z)+.23*Math.exp(-((x+.55)**2+(z+.3)**2)*2.8);}
 // Reality: a sampled patch of land, trees, buildings and water.
 let start=0;
 surface(0,3200,(u,v)=>{const x=(u-.5)*2.75,z=(v-.5)*2.4;return[x,terrain(x,z)-.35,z];});
 for(let k=0;k<7;k++){
  const x=-1.0+(k%2)*.55,z=-.85+Math.floor(k/2)*.52,h=.65+rand()*.55,y=terrain(x,z)-.35;
  surface(0,80,(u,v)=>[x+Math.cos(u*6.28)*.025,y+v*h,z+Math.sin(u*6.28)*.025]);
  surface(0,280,(u,v,w)=>{const a=u*6.28,r=Math.sqrt(v)*.33;return[x+Math.cos(a)*r,y+h+.17+(w-.5)*.55*(1-v*.6),z+Math.sin(a)*r];});
 }
 for(let k=0;k<3;k++){
  const x=.58+k*.26,z=-.7+k*.5,h=.35+k*.23,y=terrain(x,z)-.35;
  surface(0,240,(u,v,w)=>{const side=Math.floor(w*4),a=(u-.5)*.32;return side<2?[x+(side?1:-1)*.16,y+v*h,z+a]:[x+a,y+v*h,z+(side===2?1:-1)*.16];});
  surface(0,110,(u,v)=>[x+(u-.5)*.32,y+h,z+(v-.5)*.32]);
 }
 path(0,t=>{const z=t*2.4-1.2,x=.1+Math.sin(z*2.2)*.17;return[x,terrain(x,z)-.31,z];},500,.065);groups.push([start,stage.length]);start=stage.length;
 // Perception: overlapping receptive fields share one source, with different openings.
 for(let k=0;k<3;k++)surface(1,1200,(u,v)=>{const a=u*6.283,r=.22+Math.sqrt(v)*.7;return[Math.cos(a)*r+(k-1)*.4,.42+Math.sin(a)*r*.78,(k-1)*.48+Math.cos(a*2+k)*.09];});
 for(let k=0;k<3;k++)path(1,t=>[-1.25+t*2.5,.16+Math.sin(t*3.14)*(k+1)*.17,(k-1)*.48+Math.sin(t*6.28)*.08],160,.025);
 groups.push([start,stage.length]);start=stage.length;
 // Computation: a volumetric lattice with relationships linking its layers.
 for(let level=0;level<4;level++)for(let k=0;k<8;k++){
  const a=-1.1+k*.31,y=-.25+level*.36;
  path(2,t=>[-1.1+t*2.2,y,a],65,.01);path(2,t=>[a,y,-1.1+t*2.2],65,.01);
 }
 for(let k=0;k<22;k++){
  const a=new T.Vector3((rand()-.5)*2,-.2+rand()*1.1,(rand()-.5)*1.9),b=a.clone().add(new T.Vector3((rand()-.5)*.8,.4,(rand()-.5)*.9));
  path(2,t=>a.clone().lerp(b,t).toArray(),44,.018);
  surface(2,26,(u,v)=>{const theta=u*6.28,z=v*2-1,r=Math.sqrt(1-z*z)*.055;return[a.x+Math.cos(theta)*r,a.y+z*.055,a.z+Math.sin(theta)*r];});
 }
 groups.push([start,stage.length]);start=stage.length;
 // Transformation: the same signal opens into three sampled wave surfaces.
 for(let k=0;k<3;k++)surface(3,1500,(u,v)=>{const x=(u-.5)*2.9,amp=.14+u*.2;return[x,.35+k*.32+Math.sin(x*4.5+k)*amp,(k-1)*.55+(v-.5)*.42+Math.cos(x*4.5+k)*.08];});
 groups.push([start,stage.length]);start=stage.length;
 // Cognition: overlapping open fields, rather than an anatomical brain.
 for(let k=0;k<3;k++)surface(4,1800,(u,v)=>{const a=u*6.28,b=(v-.5)*.54,r=.8+b;return[Math.cos(a)*r, .45+Math.sin(a*2+k*1.7)*.36+b*.8,Math.sin(a)*r*.7+(k-1)*.35];});
 groups.push([start,stage.length]);start=stage.length;
 // Action: branches become a terrain contour on the return to the place.
 for(let k=0;k<8;k++)path(5,t=>{const x=(t-.5)*2.5;return[x,-.22+Math.sin(t*3.14)*.17,(k-3.5)*.22+Math.sin(x*2)*.12];},250,.026);
 for(let k=0;k<5;k++)path(5,t=>{const a=t*2.5-1.25;return[a,.12+t*.6,Math.sin(t*2.6+k*.5)*(.12+t*.65)];},300,.07);
 surface(5,650,(u,v)=>{const a=u*6.28,r=v*.9;return[Math.cos(a)*r,.05+Math.sin(a*2)*.08,Math.sin(a)*r];});
 groups.push([start,stage.length]);
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('color',new T.Float32BufferAttribute(rgb,3));
 geo.setAttribute('aStage',new T.Float32BufferAttribute(stage,1));geo.setAttribute('aSize',new T.Float32BufferAttribute(sizes,1));geo.setAttribute('aPhase',new T.Float32BufferAttribute(phase,1));
 const centers=Array.from({length:6},()=>new T.Vector3());
 const uniforms={uTime:{value:0},uSelected:{value:1},uScale:{value:1},uPixel:{value:renderer.getPixelRatio()},uCenters:{value:centers}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexColors:true,
 vertexShader:`attribute float aStage;attribute float aSize;attribute float aPhase;uniform float uTime;uniform float uSelected;uniform float uScale;uniform float uPixel;uniform vec3 uCenters[6];varying vec3 vColor;varying float vAlpha;
 void main(){int s=int(aStage+.5);vec3 p=position;float selected=1.-step(.25,abs(aStage-uSelected));
 p.y+=sin(uTime*.38+aPhase)*.015;
 if(s==3)p.y+=sin(p.x*4.5-uTime*1.5+aPhase*.06)*.065;
 if(s==4){float a=sin(uTime*.13)*.06;p.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz;}
 vec4 mv=modelViewMatrix*vec4(p*uScale+uCenters[s],1.);gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(aSize*uPixel*43./max(4.,-mv.z),.85,4.1);
 float sweep=.5+.5*sin(p.x*2.7+p.z*1.9-uTime*.8);vAlpha=.49+selected*.27+sweep*.13;vColor=color*(.84+selected*.35);}`,
 fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;float a=1.-smoothstep(.10,.5,r);gl_FragColor=vec4(vColor,a*vAlpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
 const cloud=new T.Points(geo,material);cloud.frustumCulled=false;root.add(cloud);
 const routesGeo=new T.BufferGeometry(),routePositions=new Float32Array(6*620*3),routeColors=new Float32Array(6*620*3);
 routesGeo.setAttribute('position',new T.BufferAttribute(routePositions,3));routesGeo.setAttribute('color',new T.BufferAttribute(routeColors,3));
 const routes=new T.Points(routesGeo,new T.PointsMaterial({size:.021,vertexColors:true,transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending}));routes.frustumCulled=false;root.add(routes);
 const travelerGeo=new T.BufferGeometry(),travelPos=new Float32Array(6*36*3);travelerGeo.setAttribute('position',new T.BufferAttribute(travelPos,3));
 const travelers=new T.Points(travelerGeo,new T.PointsMaterial({color:0xd7e8d7,size:.044,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending}));travelers.frustumCulled=false;root.add(travelers);
 // A faint, open volume gives the point forms a common spatial field.
 const ambientPositions=[],ambientColors=[];
 for(let i=0;i<1600;i++){const a=rand()*6.283,r=3+rand()*6;ambientPositions.push(Math.cos(a)*r,(rand()-.5)*3-1.4,Math.sin(a)*r*.7);const b=.13+rand()*.13;ambientColors.push(b*.5,b,b);}
 const ambientGeo=new T.BufferGeometry();ambientGeo.setAttribute('position',new T.Float32BufferAttribute(ambientPositions,3));ambientGeo.setAttribute('color',new T.Float32BufferAttribute(ambientColors,3));
 root.add(new T.Points(ambientGeo,new T.PointsMaterial({size:.022,vertexColors:true,transparent:true,opacity:.45,depthWrite:false})));
 const core=new T.Object3D();root.add(core);
 const wide=[[-5.1,0,-2.5],[0,.18,-3.8],[5.1,0,-2.5],[5.1,-.2,3.0],[0,-.2,4.35],[-5.1,-.2,3.0]];
 const narrow=[[-2.15,0,-5.0],[2.15,.1,-5.0],[2.45,0,.15],[2.15,-.2,5.25],[-2.15,-.2,5.25],[-2.45,0,.15]];
 let width=1,height=1,curves=[],clock=0,selected=1,portrait=false;
 const tmp=new T.Vector3();
 function rebuild(){
  curves=[];
  for(let i=0;i<6;i++){
   const a=centers[i].clone(),b=centers[(i+1)%6].clone(),m=a.clone().lerp(b,.5);m.y-=.45;
   const away=m.clone().sub(core.position);away.y=0;away.normalize().multiplyScalar(.52);m.add(away);
   const c=new T.CatmullRomCurve3([a,a.clone().lerp(m,.8),b.clone().lerp(m,.8),b]);curves.push(c);
   for(let k=0;k<620;k++){c.getPoint(k/619,tmp);const j=(i*620+k)*3;routePositions.set([tmp.x+(rand()-.5)*.08,tmp.y+(rand()-.5)*.08,tmp.z+(rand()-.5)*.08],j);routeColors.set(colors[i].toArray(),j);}
  }
  routesGeo.attributes.position.needsUpdate=true;routesGeo.attributes.color.needsUpdate=true;
 }
 function update({time=0,selected:s=1}={}){
  clock=time;selected=s;uniforms.uTime.value=time;uniforms.uSelected.value=s;
  root.rotation.y=Math.sin(time*.09)*.025;
  for(let i=0;i<6;i++)for(let k=0;k<36;k++){curves[i]?.getPoint((time*.055+k/36)%1,tmp);travelPos.set(tmp.toArray(),(i*36+k)*3);}
  travelerGeo.attributes.position.needsUpdate=true;
 }
 function resize({width:w,height:h}={}){
  width=w||host.clientWidth;height=h||host.clientHeight;portrait=width/height<1.1;
  (portrait?narrow:wide).forEach((p,i)=>{centers[i].fromArray(p);anchors[i].position.copy(centers[i]).add(new T.Vector3(0,-.7,portrait?.9:1.25));});
  uniforms.uScale.value=portrait?.74:1;core.position.set(0,portrait?.4:.55,portrait?.55:1.9);rebuild();
  camera.aspect=width/height;camera.fov=38;camera.zoom=1;camera.near=.1;camera.far=100;
  const target=new T.Vector3(0,.1,portrait?.5:.1),dir=new T.Vector3(0,.8,1).normalize();
  // Explicit common framing keeps all six labels visible, including English.
  const distance=portrait?24.2:Math.max(19,15/(width/height));camera.position.copy(target).addScaledVector(dir,distance);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  update({time:clock,selected});projectLabels();
 }
 function projectLabels(){
  root.updateMatrixWorld(true);camera.updateMatrixWorld();
  const place=(el,a)=>{if(!el)return;a.getWorldPosition(tmp).project(camera);el.style.left=((tmp.x*.5+.5)*width)+'px';el.style.top=((-tmp.y*.5+.5)*height)+'px';el.style.transform='translate(-50%,-50%)';el.dataset.projected='true';};
  const labels=[...host.querySelectorAll('[data-node]')];anchors.forEach((a,i)=>place(labels.find(n=>Number(n.dataset.node)===i),a));place(host.querySelector('.qt-flow-core'),core);
 }
 host.dataset.representation='illustrative-point-cloud';host.dataset.pointCount=String(stage.length+3720+216+1600);
 resize({width:host.clientWidth,height:host.clientHeight});return {update,resize,projectLabels};
}
