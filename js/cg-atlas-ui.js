/* Contextual entrances, not claims that the embedded scene implements every app. */
const links={
forest:[['森を歩く','Walk the forest','x/02/'],['一本の木を見比べる','Compare one tree','x/19/']],
soil:[['土の音を聴く','Listen to soil','workshops/soil-sound/'],['触覚を探す','Explore touch','x/10/']],
water:[['まちの手がかりへ','Explore a place','x/09/'],['観察を持ち帰る','Collect observations','x/18/']],
body:[['碧と層をひらく','Explore with Aoi','x/17/'],['人と機械を比べる','People and machines','x/24/']],
sound:[['音を彫刻にする','Sculpt sound','x/07/'],['樹の音を聴く','Listen to trees','workshops/tree-sound/'],['碧の唄','Aoi’s song','x/08/']],
time:[['同じ場所の続き','The same place, continued','x/26/'],['川越を歩く','Walk Kawagoe','x/12/'],['渋谷を歩く','Walk Shibuya','x/14/']],
language:[['言葉を重ねる','Layer words','x/21/'],['書を空間へ','Calligraphy in space','x/11/'],['噺を聴く','Hear a story','https://mitsulab-soil.github.io/aoi-shizen-rakugo/'],['博物館へ','Visit the museum','https://mitsulab-soil.github.io/museum/']],
computation:[['計算と応答','Computation and response','x/22/'],['人と機械の翻訳','Translate between people and machines','x/24/'],['研究を読む','Read the research','#research']]
};
let current='forest';
function show(detail){current=detail.id||current;const title=document.getElementById('cgModeTitle'),description=document.getElementById('cgModeDescription'),nav=document.getElementById('cgModeLinks');if(!nav)return;const english=document.documentElement.lang==='en';if(title)title.textContent=english?(detail.en||detail.title):detail.title;if(description)description.textContent=detail.description||'';nav.replaceChildren();for(const [ja,en,href]of links[current]||[]){const a=document.createElement('a');a.href=href;a.textContent=(english?en:ja)+' ↗';nav.append(a);}document.querySelectorAll('[data-cg-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.cgMode===current));if(b.dataset.cgMode===current)b.dataset.visited='true';});}
window.addEventListener('cg:mode',e=>show(e.detail));
const tour=document.getElementById('cgAtlasTour');tour?.addEventListener('click',()=>{const on=tour.getAttribute('aria-pressed')!=='true';window.__commonGround?.setAuto(on);});
document.addEventListener('click',e=>{if(e.target.closest('[data-cg-mode],.cg-motion,.cg-talk')){tour?.setAttribute('aria-pressed','false');if(tour)tour.textContent='自動で巡る';}});
window.addEventListener('cg:tour',e=>{const on=!!e.detail?.active;tour?.setAttribute('aria-pressed',String(on));if(tour)tour.textContent=on?'巡回を止める':'自動で巡る';});

function syncTour(){const a=window.__commonGround?.stats;if(!a)return false;tour?.setAttribute('aria-pressed',String(a.autoImmersion));if(tour)tour.textContent=a.autoImmersion?'巡回を止める':'自動で巡る';return true;}if(!syncTour()){let tries=0;const timer=setInterval(()=>{if(syncTour()||++tries>200)clearInterval(timer);},100);}
