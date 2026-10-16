// Conceptual cognitive tools: the scene does not measure subjective experience.
const isEnglish=()=>document.documentElement.dataset.lang==='en';
const modeText={ja:[
 '空間｜足元の手がかりを、森・水・街の広がりへ結ぶ。',
 '時間｜同じ場に、記録と変化の層を重ねる。いま見えるものを、長い時間の中で捉え直す。',
 '感覚｜観測の値を光・音・振動へ訳し、異なる受けとり方を試す。光る粒子は変換の模式表現。'
],en:[
 'Space | Connect local clues with the wider forest, water and city.',
 'Time | Layer records and change within a place. Reconsider the present through longer spans of time.',
 'Senses | Translate observed values into light, sound and vibration. The particles illustrate transformation.'
]};
const nodeText={ja:[
 '現実｜観測と記録から手がかりを受けとる。まだ届いていないことも残る。',
 '計算｜観測をデータにし、モデルやAIで区別・関係を組み立てる。根拠と推定を分ける。',
 '変換｜計算結果を、人が受けとれる光・音・振動へ。情報の違いと感覚の対応を設計する。',
 '認知｜知覚情報を、ことば・概念・経験と結ぶ。個の内側で解釈や視点の選択肢を増やす。',
 '行動｜感じ、考えたことを、新しい問い・観察・行動へ返す。現実との往復から、道具も見直す。'
],en:[
 'Reality | Receive clues from observations and records, acknowledging what remains out of reach.',
 'Computation | Model distinctions and relationships. Separate evidence from inference.',
 'Transformation | Map computational results into light, sound and vibration people can receive.',
 'Cognition | Connect perceived information with language, concepts and experience. Open choices of interpretation within a person.',
 'Action | Return new questions, observations and actions to reality. Revise tools through that feedback.'
]};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let threePromise;
const loadThree=()=>threePromise||(threePromise=import('three'));
window.__qualiumDiagnostics={};
for(const host of document.querySelectorAll('[data-qualium-scene]')){
 const kind=host.dataset.qualiumScene,canvas=host.querySelector('canvas'),pause=host.querySelector('[data-pause]');
 const modes=[...host.querySelectorAll('[data-mode]')],nodes=[...host.querySelectorAll('[data-node]')];
 let visible=false,paused=reduced.matches,loading=false,ready=false,raf=0,last=0,lastUpdate=0,time=0,mode=0,selected=3,frames=0;
 let renderer,model,camera,draw=()=>{};
 const info=window.__qualiumDiagnostics[kind]={ready:false,frames:0,mode,selected,paused};
 function labels(){
  pause.textContent=paused?(isEnglish()?'Resume motion':'動きを再開する'):(isEnglish()?'Pause motion':'動きを止める');
  pause.setAttribute('aria-pressed',String(paused));info.paused=paused;
  if(kind==='layers')host.querySelector('.qt-mode-detail').textContent=modeText[isEnglish()?'en':'ja'][mode];
  if(kind==='loop')document.querySelector('.qt-node-detail').textContent=nodeText[isEnglish()?'en':'ja'][selected];
  nodes.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
  model?.projectLabels?.();
 }
 function frame(now){
  raf=0;if(!visible||document.hidden||paused||!ready)return;
  const interval=1000/30,elapsed=now-last;
  if(elapsed>=interval){
   const dt=lastUpdate?Math.min((now-lastUpdate)/1000,.08):0;
   last=now-(elapsed%interval);lastUpdate=now;time+=dt;
   draw(dt);canvas.dataset.frames=String(++frames);info.frames=frames;info.time=time;
  }
  raf=requestAnimationFrame(frame);
 }
 function schedule(){
  cancelAnimationFrame(raf);raf=0;last=0;lastUpdate=0;
  if(ready){draw(0);if(visible&&!document.hidden&&!paused)raf=requestAnimationFrame(frame);}
 }
 pause.addEventListener('click',()=>{paused=!paused;labels();schedule();});
 modes.forEach((b,i)=>b.addEventListener('click',()=>{
  mode=i;info.mode=i;modes.forEach((el,j)=>el.setAttribute('aria-pressed',String(i===j)));
  canvas.dataset.mode=String(mode);labels();if(ready)draw(0,paused);
 }));
 nodes.forEach((b,i)=>b.addEventListener('click',()=>{selected=i;info.selected=i;labels();if(ready)draw(0);}));
 document.addEventListener('hp-lang-change',()=>{labels();if(ready)draw(0);});
 reduced.addEventListener('change',e=>{paused=e.matches;labels();schedule();});
 labels();
 async function init(){
  if(loading)return;loading=true;
  try{
   const T=await loadThree();
   const module=await import(kind==='loop'?'./qualium-loop-3d.js?v=20261016-points1':'./qualium-field-3d.js?v=20261016b');
   renderer=new T.WebGLRenderer({canvas,alpha:kind==='loop',antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<=700?1:1.5));
   renderer.setClearColor(0x030812,kind==='loop'?0:1);renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
   const scene=new T.Scene(),world=new T.Group();scene.add(world);camera=new T.PerspectiveCamera(42,1,.1,180);
   const glow=document.createElement('canvas');glow.width=glow.height=64;
   const ctx=glow.getContext('2d'),grad=ctx.createRadialGradient(32,32,0,32,32,32);
   grad.addColorStop(0,'#fff');grad.addColorStop(.14,'#fff');grad.addColorStop(1,'rgba(255,255,255,0)');
   ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);const sprite=new T.CanvasTexture(glow);
   model=await (kind==='loop'?module.createLoopScene:module.createFieldScene)({T,scene,world,camera,host,sprite,renderer});
   draw=(dt=0,snap=false)=>{
    model.update({time,dt,mode,selected,snap});scene.updateMatrixWorld(true);camera.updateMatrixWorld();
    renderer.render(scene,camera);model.projectLabels?.();
    info.calls=renderer.info.render.calls;info.triangles=renderer.info.render.triangles;info.points=renderer.info.render.points;
   };
   const resize=()=>{
    const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;model.resize({width,height});
    camera.updateProjectionMatrix();draw(0,true);
   };
   new ResizeObserver(resize).observe(host);ready=true;info.ready=true;host.dataset.ready='true';canvas.dataset.mode='0';resize();labels();schedule();
   canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();ready=false;info.ready=false;cancelAnimationFrame(raf);host.dataset.ready='fallback';pause.hidden=true;
   });
   canvas.addEventListener('webglcontextrestored',()=>{
    ready=true;info.ready=true;host.dataset.ready='true';pause.hidden=false;resize();schedule();
   });
  }catch(error){
   host.dataset.ready='fallback';info.error=error.message;pause.hidden=true;renderer?.dispose();
   console.warn('Qualium visual unavailable:',error.message);
  }
 }
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;info.visible=visible;if(visible)init();schedule();},{rootMargin:'60px'}).observe(host);
 document.addEventListener('visibilitychange',schedule);
}
