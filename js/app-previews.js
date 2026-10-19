// Decorative clips: no initial video requests, one visible clip, still-image fallback.
const clips={qsound:'sound',rakugo:'rakugo',x08:'song'};  /* 2026-10-19：walk・museum・butterfly の動画には旧い名前の題が写るので外した（静止画だけ） */
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),items=[],ratios=new Map();let active=null,preferred=null;
const enabled=()=>!reduced.matches&&!navigator.connection?.saveData&&!['slow-2g','2g'].includes(navigator.connection?.effectiveType)&&!document.hidden;
for(const img of document.querySelectorAll('#appguide .strip img,#appguide .qt-layer img,#apps .app-fig img')){
 const key=Object.keys(clips).find(k=>img.getAttribute('src')?.split('/').pop().startsWith(k+'_'));if(!key)continue;
 const holder=document.createElement('span');holder.className='app-preview-media';img.before(holder);holder.append(img);
 const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';video.setAttribute('aria-hidden','true');video.tabIndex=-1;video.dataset.preview=clips[key];holder.append(video);
 const item={holder,video,url:new URL('../img/apps/vid/'+clips[key]+'-preview.mp4',import.meta.url).href};items.push(item);
 holder.addEventListener('pointerenter',()=>{preferred=item;select();});holder.closest('a')?.addEventListener('focusin',()=>{preferred=item;select();});
 video.addEventListener('playing',()=>holder.classList.add('preview-playing'));video.addEventListener('error',()=>holder.classList.remove('preview-playing'));
}
function stop(item){if(!item)return;item.video.pause();item.holder.classList.remove('preview-playing');item.video.removeAttribute('src');item.video.load();}
function select(){const candidates=enabled()?items.filter(i=>(ratios.get(i)||0)>.35).sort((a,b)=>(ratios.get(b)-ratios.get(a))):[];const next=candidates.includes(preferred)?preferred:(candidates[0]||null);if(next===active)return;stop(active);active=next;if(active){const item=active;item.video.src=item.url;item.video.play().catch(()=>item.holder.classList.remove('preview-playing'));}}
const observer=new IntersectionObserver(entries=>{for(const e of entries){const item=items.find(i=>i.holder===e.target);ratios.set(item,e.isIntersecting?e.intersectionRatio:0);}select();},{threshold:[0,.35,.6,.9,1]});items.forEach(i=>observer.observe(i.holder));
reduced.addEventListener('change',select);document.addEventListener('visibilitychange',select);navigator.connection?.addEventListener('change',select);
window.__appPreviews={get active(){return active?.video.dataset.preview||null;},get playing(){return items.filter(i=>!i.video.paused).length;},get loaded(){return items.filter(i=>i.video.getAttribute('src')).length;},get enabled(){return enabled();}};
