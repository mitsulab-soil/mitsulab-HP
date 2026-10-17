// One conceptual field: expanding an Umwelt, not measuring subjective experience.
const isEnglish=()=>document.documentElement.dataset.lang==='en';
const nodeText={ja:[
 '受けとる｜身体の感覚で届く世界から始める。見えているものも、気づくことや意味は身体・経験・文化によって変わります。',
 '観測する｜センサーや記録で、人の感覚だけでは届かない水・音・時間の変化を手がかりにします。',
 '計算する｜AIなどの計算が、多くの記録から関係や変化を捉える。観測されたことと推定されたことを分けます。',
 '変換する｜碧が媒介となり、計算で捉えた関係を光・音・振動・空間へ。情報の違いを身体が感じられる違いへ訳します。',
 '認知する｜感じた手がかりを、ことば・概念・経験と結ぶ。同じ場所に、これまでと違う意味や関係を見つけます。',
 '関わる｜新たな問いや行動を持って現実へ。道具を閉じたあとも場所の見方が変わり、次の観測へ戻ります。'
],en:[
 'Perceive | Begin with what bodily senses receive. Bodies, experience and culture shape the clues and meanings we notice.',
 'Observe | Sensors and records make changes in water, sound and time accessible beyond immediate sensation.',
 'Compute | AI and other computation identify relationships and change across records. Keep observation distinct from inference.',
 'Transform | Aoi mediates computational relationships as light, sound, vibration and space: information becomes perceptible difference.',
 'Make sense | Connect clues with language, concepts and experience. Find new meanings and relationships in the same place.',
 'Engage | Return to reality with questions and actions. New ways of seeing continue after closing the tool and lead to further observation.'
]};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let threePromise;
const loadThree=()=>threePromise||(threePromise=import('three'));
window.__qualiumDiagnostics={};
// The former standalone field is intentionally not initialized.
for(const host of document.querySelectorAll('[data-qualium-scene="loop"]')){
 const kind='loop',canvas=host.querySelector('canvas'),pause=host.querySelector('[data-pause]');
 const nodes=[...host.closest('.qt-loop').querySelectorAll('[data-node]')],detail=host.closest('.qt-loop').querySelector('.qt-node-detail');
 let visible=false,paused=reduced.matches,loading=false,ready=false,raf=0,last=0,lastUpdate=0,time=0,selected=2,frames=0;
 let renderer,model,camera,draw=()=>{},touring=false,nextStageAt=0;const tour=host.querySelector("[data-tour]");tour?.addEventListener("click",()=>{touring=!touring;tour.setAttribute("aria-pressed",String(touring));selected=0;nextStageAt=time+5;info.selected=selected;labels();if(ready)draw(0);});
 const info=window.__qualiumDiagnostics[kind]={ready:false,frames:0,selected,paused};
 function labels(){
  pause.textContent=paused?(isEnglish()?'Resume motion':'動きを再開する'):(isEnglish()?'Pause motion':'動きを止める');
  pause.setAttribute('aria-pressed',String(paused));info.paused=paused;if(tour)tour.textContent=touring?(isEnglish()?'Stop guided cycle':'自動進行を止める'):(isEnglish()?'Trace the cycle':'循環をたどる');
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
   if(touring&&time>=nextStageAt){selected=(selected+1)%6;info.selected=selected;nextStageAt=time+5;labels();}draw(dt);canvas.dataset.frames=String(++frames);info.frames=frames;info.time=time;
  }
  raf=requestAnimationFrame(frame);
 }
 function schedule(){
  cancelAnimationFrame(raf);raf=0;last=0;lastUpdate=0;
  if(ready&&visible&&!document.hidden){draw(0);if(!paused)raf=requestAnimationFrame(frame);}
 }
 pause.addEventListener('click',()=>{paused=!paused;labels();schedule();});
 nodes.forEach((b,i)=>b.addEventListener('click',()=>{touring=false;tour?.setAttribute('aria-pressed','false');selected=i;info.selected=i;labels();if(ready)draw(0);}));
 document.addEventListener('hp-lang-change',()=>{labels();if(ready)draw(0);});
 reduced.addEventListener('change',e=>{paused=e.matches;labels();schedule();});
 labels();
 async function init(){
  if(loading)return;loading=true;
  try{
   const T=await loadThree();
   const module=await import('./qualium-loop-3d.js?v=20261017-relations4');
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
