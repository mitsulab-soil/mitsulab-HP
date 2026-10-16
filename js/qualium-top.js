// One conceptual field: expanding an Umwelt, not measuring subjective experience.
const isEnglish=()=>document.documentElement.dataset.lang==='en';
const nodeText={ja:[
 '場｜同じ場所に、光や音、生きものの営み、積み重なる時間があります。受けとれる手がかりは、その一部です。',
 '受けとる｜同じ場でも、身体・感覚・経験・概念によって、気づく手がかりや意味が異なります。それぞれの環世界がひらかれます。',
 '捉える｜観測で手がかりを記録し、AIなどの計算で関係や変化を捉える。観測されたことと、推定されたことを分けます。',
 '変換する｜見つかった関係を、光・音・振動・空間へ。情報の違いを、身体が受けとれる違いへ変換します。',
 'ひらく｜新しい手がかりを、ことば・概念・経験と結ぶ。自分の中で、視点・尺度・感覚・解釈を行き来できるように。',
 '関わる｜感じ、理解したことから、問い・観察・行動が生まれる。その手がかりを持って現実へ戻り、道具も見直します。'
],en:[
 'Place | Light, sound, living activity and layers of time share a place. The clues we receive are only part of it.',
 'Perceive | Bodies, senses, experience and concepts shape the clues and meanings we notice. A particular Umwelt opens to each subject.',
 'Compute | Record clues through observation. Use AI and other computation to find relationships and change, separating observation from inference.',
 'Transform | Turn relationships into light, sound, vibration and space. Map differences in information to differences the body can receive.',
 'Expand | Connect new clues with language, concepts and experience. Move between perspectives, scales, senses and interpretations within yourself.',
 'Engage | Let sensing and understanding lead to questions, observations and actions. Return to reality with those clues, and revise the tools.'
]};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let threePromise;
const loadThree=()=>threePromise||(threePromise=import('three'));
window.__qualiumDiagnostics={};
// The former standalone field is intentionally not initialized.
for(const host of document.querySelectorAll('[data-qualium-scene="loop"]')){
 const kind='loop',canvas=host.querySelector('canvas'),pause=host.querySelector('[data-pause]');
 const nodes=[...host.querySelectorAll('[data-node]')],detail=host.closest('.qt-loop').querySelector('.qt-node-detail');
 let visible=false,paused=reduced.matches,loading=false,ready=false,raf=0,last=0,lastUpdate=0,time=0,selected=1,frames=0;
 let renderer,model,camera,draw=()=>{};
 const info=window.__qualiumDiagnostics[kind]={ready:false,frames:0,selected,paused};
 function labels(){
  pause.textContent=paused?(isEnglish()?'Resume motion':'動きを再開する'):(isEnglish()?'Pause motion':'動きを止める');
  pause.setAttribute('aria-pressed',String(paused));info.paused=paused;
  detail.textContent=nodeText[isEnglish()?'en':'ja'][selected];
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
  if(ready&&visible&&!document.hidden){draw(0);if(!paused)raf=requestAnimationFrame(frame);}
 }
 pause.addEventListener('click',()=>{paused=!paused;labels();schedule();});
 nodes.forEach((b,i)=>b.addEventListener('click',()=>{selected=i;info.selected=i;labels();if(ready)draw(0);}));
 document.addEventListener('hp-lang-change',()=>{labels();if(ready)draw(0);});
 reduced.addEventListener('change',e=>{paused=e.matches;labels();schedule();});
 labels();
 async function init(){
  if(loading)return;loading=true;
  try{
   const T=await loadThree();
   const module=await import('./qualium-loop-3d.js?v=20261016-umwelt1');
   renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<=700?1:1.5));
   renderer.setClearColor(0x030812,0);renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
   const scene=new T.Scene(),world=new T.Group();scene.add(world);camera=new T.PerspectiveCamera(42,1,.1,180);
   model=await module.createLoopScene({T,scene,world,camera,host,renderer});
   draw=(dt=0)=>{
    if(!visible||document.hidden)return;
    model.update({time,dt,selected});scene.updateMatrixWorld(true);camera.updateMatrixWorld();
    renderer.render(scene,camera);model.projectLabels?.();
    info.calls=renderer.info.render.calls;info.triangles=renderer.info.render.triangles;info.points=renderer.info.render.points;
   };
   const resize=()=>{
    const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;model.resize({width,height});
    camera.updateProjectionMatrix();draw(0);
   };
   new ResizeObserver(resize).observe(host);ready=true;info.ready=true;host.dataset.ready='true';resize();labels();schedule();
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
