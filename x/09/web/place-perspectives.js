/* 場の手がかり。資料の記載、mitsulabの見方、創作を区別し、既存地点へ結ぶ。 */
export const CATEGORIES=Object.freeze({folk:'民俗',social:'社会',history:'歴史',ecology:'生態',environment:'環境',art:'芸術',events:'催事',body:'身体',fiction:'創作'});
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const safeUrl=s=>{try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
export function publicPerspectives(raw){
 const allSources=new Map((raw.sources||[]).map(s=>[s.id,s]));const items=[],used=new Set(),ids=new Set();
 for(const input of raw.items||[]){const categories=[...new Set((input.categories|| (Array.isArray(input.category)?input.category:[input.category])).filter(c=>typeof c==='string'&&Object.hasOwn(CATEGORIES,c)))];if(input.publicEligible!==true||!categories.length)continue;const status=input.status,fiction=categories.includes('fiction');if(!['verified','interpretation'].includes(status)&&!(fiction&&status==='proposal'))continue;
  const place=input.place||{},segmentIds=[...new Set((place.segmentIds||[]).filter(s=>typeof s==='string'&&s.length<120))],structureIds=[...new Set((place.structureIds||[]).filter(s=>typeof s==='string'&&s.length<120))],dRange=Array.isArray(place.dRange)&&place.dRange.length===2&&place.dRange.every(Number.isFinite)&&place.dRange[0]<=place.dRange[1]?place.dRange:null;
  if(!segmentIds.length&&!structureIds.length&&!dRange)continue;
  const declaredSourceIds=[...new Set(input.sourceIds||[])],sourceIds=declaredSourceIds.filter(id=>{const s=allSources.get(id);return s&&safeUrl(s.url)&&s.verified===true;});if(!fiction&&(!sourceIds.length||sourceIds.length!==declaredSourceIds.length))continue;
  const id=clean(input.id),title=clean(input.title),text=clean(input.text);if(!id||ids.has(id)||!title||!text)continue;ids.add(id);sourceIds.forEach(id=>used.add(id));
  items.push({id,category:fiction?'fiction':categories[0],categories,place:{segmentIds,structureIds,dRange,anchorPrecision:clean(place.anchorPrecision)},title,text,status,publicEligible:true,sourceIds,sourceUrls:sourceIds.map(id=>safeUrl(allSources.get(id).url)),evidenceLimit:clean(input.evidenceLimit),question:clean(input.question),bodyMode:['tori','koumori','chou','hachi','inu'].includes(input.bodyMode)?input.bodyMode:null,time:input.time?{kind:clean(input.time.kind),dateLabel:clean(input.time.dateLabel),start:input.time.start||null,end:input.time.end||null,calendar:clean(input.time.calendar)}:null});
 }
 const sources=[...used].map(id=>{const s=allSources.get(id);return{id,title:clean(s.title||s.name),url:safeUrl(s.url),publisher:clean(s.publisher),verified:true,checkedAt:clean(s.checkedAt||raw.checkedAt)};});
 return{schemaVersion:1,checkedAt:clean(raw.checkedAt),sources,items};
}
function segmentDistance(item,talk,d){const p=item.place;if(p.dRange){const [a,b]=p.dRange;return d<a?a-d:d>b?d-b:0;}let distance=Infinity;for(const id of p.segmentIds){const s=talk.SEGX?.(id)||talk.MARKS?.find(m=>m.s?.id===id)?.s;const at=s?.at?.d??s?.tag_at?.d??(Number.isFinite(s?.d0)&&Number.isFinite(s?.d1)?(s.d0+s.d1)/2:null);if(Number.isFinite(at))distance=Math.min(distance,Math.abs(d-at));}if(!p.segmentIds.length)for(const mark of talk.MARKS||[])if(p.structureIds.includes(mark.sid))distance=Math.min(distance,Math.abs(d-mark.at.d));return distance;}
export function matchesPlace(item,mark){const p=item.place;if(p.segmentIds.length)return p.segmentIds.includes(mark.s?.id);if(p.structureIds.length)return !!mark.sid&&p.structureIds.includes(mark.sid);return p.dRange&&Number.isFinite(mark.at?.d)&&mark.at.d>=p.dRange[0]&&mark.at.d<=p.dRange[1];}
let data={sources:[],items:[]},sourceIndex=new Map(),loading;
const state={ready:false,inFlight:false,errors:[],failureHistory:[],requests:0,checkedAt:null,categories:{}};
const decorate=(item,states)=>{const category=item.category==='fiction'?'fiction':item.categories.find(c=>!states||states[c])||item.category;return({...item,category,sourceInfo:item.sourceIds.map(id=>sourceIndex.get(id)).filter(Boolean),meaning:item.category==='fiction'?'創作':item.status==='interpretation'?'mitsulabの見方':'資料の記載',categoryName:CATEGORIES[category]});};
export async function loadPerspectives(){
 if(state.ready)return api;if(loading)return loading;if(state.requests>=3||(typeof document!=='undefined'&&document.hidden))return api;
 state.requests++;state.inFlight=true;
 loading=fetch(new URL('./place-perspectives-data.json',import.meta.url),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('資料 '+r.status);return r.json();}).then(raw=>{
  data=publicPerspectives(raw);sourceIndex=new Map(data.sources.map(s=>[s.id,s]));state.ready=true;state.errors=[];state.checkedAt=data.checkedAt;
  for(const c of Object.keys(CATEGORIES))state.categories[c]=data.items.filter(r=>r.categories.includes(c)).length;
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('place-perspectives-ready'));return api;
 }).catch(e=>{state.errors=[e.message];state.failureHistory.push({attempt:state.requests,error:e.message,at:new Date().toISOString()});return api;}).finally(()=>{loading=null;state.inFlight=false;});return loading;
}
const api={categories:CATEGORIES,load:loadPerspectives,forMark(mark,states){return data.items.filter(r=>matchesPlace(r,mark)&&(!states||r.categories.some(c=>states[c]))).map(r=>decorate(r,states));},near(d,talk,states,limit=6){return data.items.filter(r=>r.categories.some(c=>states[c])).map(r=>({r,distance:segmentDistance(r,talk,d)})).filter(x=>x.distance<=65).sort((a,b)=>a.distance-b.distance).slice(0,limit).map(({r,distance})=>({...decorate(r,states),distance}));},status:()=>({...state,categories:{...state.categories},items:data.items.length,sources:data.sources.length,errors:[...state.errors],failureHistory:state.failureHistory.map(x=>({...x}))})};
if(typeof window!=='undefined')window.__placePerspectives=api;
