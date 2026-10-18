// One conceptual field: expanding an Umwelt, not measuring subjective experience.
const isEnglish=()=>document.documentElement.dataset.lang==='en';
const story={ja:[
 ['同じ木を、身体で感じる。','木漏れ日、葉の揺れ、樹皮の手触り。まず、身体で受けとれる手がかりから始めます。'],
 ['根・水・時間を、観測でたどる。','目には見えにくい根と水の関係、時間による変化。センサーと記録で手がかりを増やします。'],
 ['記録をつなぎ、関係を見つける。','水と木の変化の記録を、AIなどで比較する。観測したことと、計算から推定することを分けます。'],
 ['碧が、関係を感じられる光へ訳す。','数値だけでは届きにくい関係を、碧が光・音・空間へ。この図では光の広がりとして表します。'],
 ['同じ木に、新しい意味が重なる。','木を見る感覚に、水や時間の手がかりが加わる。以前は気づかなかった関係を、自分の経験と結びます。'],
 ['問いを持って、同じ木に関わりなおす。','「雨のあと、この木はどう変わる？」道具で得た問いを現実へ返し、次の観察につなげます。']
],en:[
 ['Feel the same tree through the body.','Dappled light, moving leaves, the texture of bark. Begin with the clues the body can receive.'],
 ['Trace roots, water and time through observation.','Sensors and records add clues about roots, water and change that are hard to perceive directly.'],
 ['Connect records to find relationships.','Compare records of water and the tree with AI and other computation. Separate observations from inferred relationships.'],
 ['Aoi translates relationships into perceptible light.','Aoi turns elusive numerical relationships into light, sound and space. Here, a field of light represents this translation.'],
 ['Discover new meaning in the same tree.','Water and time become part of how we see the tree. Connect these new clues with personal experience.'],
 ['Return to the same tree with a new question.','How does this tree change after rain? Take the question back to the place, and begin another observation.']
]};
const stageSeconds=[6,7,7,7,7,8];
// Active time advances only while the scene is visible and motion is enabled.
export function createStoryPlayback(){return {selected:0,elapsed:0,playing:false,completed:false,
 start(){this.selected=0;this.elapsed=0;this.playing=true;this.completed=false;},
 select(i){this.selected=i;this.elapsed=0;this.playing=false;this.completed=false;},
 tick(dt){if(!this.playing)return;this.elapsed+=dt;if(this.elapsed>=stageSeconds[this.selected]){this.elapsed=0;if(this.selected===5){this.playing=false;this.completed=true;}else this.selected++;}}
 };}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let threePromise;
const loadThree=()=>threePromise||(threePromise=import('three'));
window.__qualiumDiagnostics={};
// The former standalone field is intentionally not initialized.
for(const host of document.querySelectorAll('[data-qualium-scene="loop"]')){
 const kind='loop',canvas=host.querySelector('canvas'),pause=host.querySelector('[data-pause]');
 const nodes=[...host.closest('.qt-loop').querySelectorAll('[data-node]')],detail=host.closest('.qt-loop').querySelector('.qt-node-detail');
 const playback=createStoryPlayback(),subtitle=host.querySelector('[data-story-subtitle]'),counter=host.querySelector('[data-story-counter]');
 let visible=false,paused=reduced.matches,loading=false,ready=false,raf=0,last=0,lastUpdate=0,time=0,selected=0,frames=0;
 let renderer,model,camera,draw=()=>{};const tour=host.querySelector('[data-tour]');
 tour?.addEventListener('click',()=>{
  if(reduced.matches){playback.select((selected+1)%6);selected=playback.selected;}
  else if(playback.playing){playback.playing=false;}
  else{playback.start();selected=0;paused=false;}
  info.selected=selected;labels();schedule();
 });
 const info=window.__qualiumDiagnostics[kind]={ready:false,frames:0,selected,paused};
 function labels(){
  pause.textContent=paused?(isEnglish()?'Resume motion':'動きを再開する'):(isEnglish()?'Pause motion':'動きを止める');
  pause.setAttribute('aria-pressed',String(paused));info.paused=paused;if(tour){tour.setAttribute('aria-pressed',String(playback.playing));tour.textContent=reduced.matches?(isEnglish()?'Next scene':'次の場面へ'):playback.playing?(isEnglish()?'Stop the story':'説明を止める'):playback.completed?(isEnglish()?'Replay the story':'もう一度たどる'):(isEnglish()?'Follow one tree':'一本の木をたどる');}
  const text=story[isEnglish()?'en':'ja'][selected];detail.textContent=text[1];if(subtitle)subtitle.textContent=text[0];if(counter)counter.textContent=String(selected+1).padStart(2,'0')+' / 06';host.dataset.storyStage=String(selected);info.touring=playback.playing;info.completed=playback.completed;
  nodes.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
  model?.projectLabels?.();
 }
 function frame(now){
  raf=0;if(!visible||document.hidden||paused||!ready)return;
  const interval=1000/30,elapsed=now-last;
  if(elapsed>=interval){
   const dt=lastUpdate?Math.min((now-lastUpdate)/1000,.08):0;
   last=now-(elapsed%interval);lastUpdate=now;time+=dt;
   const was=selected,playing=playback.playing;playback.tick(dt);selected=playback.selected;if(selected!==was||playing!==playback.playing){info.selected=selected;if(playback.completed)paused=true;labels();}host.style.setProperty('--story-progress',playback.elapsed/stageSeconds[selected]);draw(dt);canvas.dataset.frames=String(++frames);info.frames=frames;info.time=time;
  }
  raf=requestAnimationFrame(frame);
 }
 function schedule(){
  cancelAnimationFrame(raf);raf=0;last=0;lastUpdate=0;
  if(ready&&visible&&!document.hidden){draw(0);if(!paused)raf=requestAnimationFrame(frame);}
 }
 pause.addEventListener('click',()=>{paused=!paused;labels();schedule();});
 nodes.forEach((b,i)=>b.addEventListener('click',()=>{playback.select(i);selected=i;info.selected=i;labels();if(ready)draw(0);}));
 document.addEventListener('hp-lang-change',()=>{labels();if(ready)draw(0);});
 reduced.addEventListener('change',e=>{paused=e.matches;if(e.matches)playback.playing=false;labels();schedule();});
 labels();
 async function init(){
  if(loading)return;loading=true;
  try{
   const T=await loadThree();
   const module=await import('./qualium-loop-3d.js?v=20261018-story1');
   renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<=700?1:1.5));
   renderer.setClearColor(0x030812,0);renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
   const scene=new T.Scene(),world=new T.Group();scene.add(world);camera=new T.PerspectiveCamera(42,1,.1,180);
   model=await module.createLoopScene({T,scene,world,camera,host,renderer});
   draw=(dt=0)=>{
    if(!visible||document.hidden)return;
    model.update({time,dt,selected});info.visual=model.diagnostics?.();scene.updateMatrixWorld(true);camera.updateMatrixWorld();
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
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.12;info.visible=visible;if(visible)init();schedule();},{threshold:.12}).observe(host);
 document.addEventListener('visibilitychange',schedule);
}
