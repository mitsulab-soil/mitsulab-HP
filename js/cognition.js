const stage=document.querySelector('#cogStage');
const details=[
'現実｜目の前の場所を観察する。すべての手がかりを捉えられるわけではありません。',
'知覚情報｜光・音・触れた感覚を受けとる。センサーは身体だけでは届かない手がかりを補います。',
'言語｜違いに名前をつけ、人に伝える。ことばによって気づく違いもあります。',
'概念｜手がかりを結び、関係を考える。AIは比較を助け、人が典拠と限界を確かめます。',
'物語｜時間や立場を渡り、別の見方を試す。創作と観測された事実を区別します。',
'体験｜場所で試し、感じた違いを確かめる。問いを持って現実に戻り、見方を更新します。'];
let selected=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,visible=false,raf=0,renderer,scene,camera,orbs=[],paths=[],particles=[],elapsed=0,last=0;
const buttons=[...document.querySelectorAll('[data-cog]')],pause=document.querySelector('#cogPause');
function pauseLabel(){pause.textContent=paused?'動きを再開する':'動きを止める';pause.setAttribute('aria-pressed',String(paused));}pauseLabel();
buttons.forEach((b,i)=>b.addEventListener('click',()=>{selected=i;buttons.forEach((n,j)=>n.setAttribute('aria-pressed',String(i===j)));document.querySelector('#cogDetail').textContent=details[i];draw();}));
pause.addEventListener('click',()=>{paused=!paused;pauseLabel();schedule();});
function draw(){if(!renderer)return;orbs.forEach((o,i)=>{o.scale.setScalar(i===selected?1.35:1);o.material.emissiveIntensity=i===selected?1.3:.4;});renderer.render(scene,camera);}
function frame(t){raf=0;if(!visible||document.hidden||paused)return;elapsed+=Math.min((t-(last||t))/1000,.05);last=t;particles.forEach((p,i)=>p.position.copy(paths[i%paths.length].getPoint((elapsed*.075+(i%13)/13)%1)));orbs.forEach((o,i)=>o.rotation.y=elapsed*.2+i);draw();raf=requestAnimationFrame(frame);}
function schedule(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;if(visible&&!document.hidden&&!paused&&renderer)raf=requestAnimationFrame(frame);else draw();}
let loading=false;
async function init(){if(loading)return;loading=true;try{const T=await import('three');scene=new T.Scene();camera=new T.PerspectiveCamera(34,1.9,.1,100);camera.position.set(0,0,15);renderer=new T.WebGLRenderer({canvas:document.querySelector('#cogCanvas'),alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);scene.add(new T.HemisphereLight(0xc0ffec,0x142738,2));const light=new T.DirectionalLight(0xd8fff4,4);light.position.set(2,4,6);scene.add(light);
const positions=[[-5.4,0,0],[-2.7,2.5,-.5],[2.7,2.5,0],[5.4,0,-.5],[2.7,-2.5,0],[-2.7,-2.5,-.5]].map(p=>new T.Vector3(...p));
positions.forEach((v,i)=>{const o=new T.Mesh(new T.IcosahedronGeometry(.29,2),new T.MeshStandardMaterial({color:i<3?0x71cfc3:0xd8b982,emissive:0x185d55,metalness:.5,roughness:.28}));o.position.copy(v);scene.add(o);orbs.push(o);const ring=new T.Mesh(new T.TorusGeometry(.47,.008,5,64),new T.MeshBasicMaterial({color:0x75bfb2,transparent:true,opacity:.4}));ring.position.copy(v);ring.rotation.x=.7;scene.add(ring);});
for(let i=0;i<6;i++){const a=positions[i],b=positions[(i+1)%6],mid=a.clone().add(b).multiplyScalar(.5);mid.z=-1.3;const curve=new T.QuadraticBezierCurve3(a,mid,b);paths.push(curve);scene.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(60)),new T.LineBasicMaterial({color:0x729f9d,transparent:true,opacity:.38})));}
for(let i=0;i<78;i++){const p=new T.Mesh(new T.SphereGeometry(.022+(i%3)*.007,5,4),new T.MeshBasicMaterial({color:i%2?0x9be8d9:0xe1c498}));p.position.copy(paths[i%6].getPoint((i%13)/13));scene.add(p);particles.push(p);}
const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();positions.forEach((v,i)=>{const p=v.clone().project(camera);buttons[i].style.left=(p.x*.5+.5)*100+'%';buttons[i].style.top=(-p.y*.5+.5)*100+8+'%';});draw();};new ResizeObserver(resize).observe(stage);resize();stage.dataset.ready='true';schedule();}catch(e){stage.dataset.ready='fallback';document.querySelector('#cogDetail').textContent=details[selected]+'（3D表示を読み込めないため、ことばでご案内します。）';pause.hidden=true;}}
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)init();schedule();},{rootMargin:'100px'}).observe(stage);
document.addEventListener('visibilitychange',schedule);
