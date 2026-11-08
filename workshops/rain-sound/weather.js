/* JMA public website data adapter. No GPS, microphone, persistent storage or auto-polling.
 * User intent/permissions belong to the caller. Coordinates never enter request URLs.
 * Internal website JSON endpoints may change; official links remain the fallback. */
const BASE = 'https://www.jma.go.jp/bosai/amedas/';
export const WEATHER_ATTRIBUTION = Object.freeze({
  name: '気象庁アメダス', url: 'https://www.jma.go.jp/bosai/amedas/',
  license: '公共データ利用規約 第1.0版',
  licenseUrl: 'https://www.jma.go.jp/jma/kishou/info/coment.html',
  changes: '気象庁の観測値から近傍の観測点を選び、表示形式をmitsulabが加工。空間補間なし。'
});
export const WEATHER_PRIVACY = '位置は端末内で約0.1度に丸め、近い観測点を選ぶためだけに使います。位置座標は送信・保存しません。気象庁には通信元IPと、時系列を取得する最寄りの公開観測点番号が届きます。';
export const WEATHER_LINKS = Object.freeze({
  rain: 'https://www.jma.go.jp/bosai/rain/',
  observations: 'https://www.jma.go.jp/bosai/amedas/',
  explanation: 'https://www.data.jma.go.jp/stats/data/mdrr/pre_rct/legend.html'
});
export class WeatherError extends Error {
  constructor(code, message) { super(message); this.name = 'WeatherError'; this.code = code; this.links = WEATHER_LINKS; }
}
const cache = new Map();
let busy = false;
const finite = v => typeof v === 'number' && Number.isFinite(v);
export function coarseCoordinates(lat, lon) {
  if (!finite(lat) || !finite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    throw new WeatherError('COORDINATES', '緯度・経度を確認してください。');
  return {lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10, precisionDegrees: 0.1};
}
export function qualityValue(record, key) {
  const a = record?.[key];
  // Only accepted normal-quality numeric values; missing/suspect is never dry zero.
  return Array.isArray(a) && a[1] === 0 && finite(a[0]) ? a[0] : null;
}
const deg = a => Array.isArray(a) && finite(a[0]) && finite(a[1]) ? a[0] + a[1] / 60 : null;
const rad = x => x * Math.PI / 180;
function distanceKm(a, b) {
  const h = Math.sin(rad(b.lat-a.lat)/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1,h)));
}
function jstStamp(ms) { return new Date(ms + 9*3600000).toISOString().slice(0,19).replace(/[-:T]/g,''); }
function stampTime(s) {
  if (!/^\d{14}$/.test(s)) return null;
  const t = `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}+09:00`;
  return Number.isFinite(Date.parse(t)) ? t : null;
}
function row(record, time) {
  return {time, precipitationMm: qualityValue(record,'precipitation1h'), precipitationPeriodHours: 1,
    interval: 'preceding', cloudPercent: null, windSpeedMs: qualityValue(record,'wind'),
    temperatureC: qualityValue(record,'temp'), missing: qualityValue(record,'precipitation1h') === null};
}
async function fetchData(url, {text=false, ttl=300000, signal}={}) {
  signal?.throwIfAborted();
  const old=cache.get(url);
  if (old && old.expires>Date.now()) return old.data;
  const response=await fetch(url,{mode:'cors',credentials:'omit',signal});
  if (!response.ok) throw new WeatherError('HTTP', `気象庁データを取得できませんでした（${response.status}）。`);
  const data=text ? (await response.text()).trim() : await response.json();
  signal?.throwIfAborted();
  cache.set(url,{data,fetchedAt:new Date().toISOString(),expires:Date.now()+ttl});
  if (cache.size>16) cache.delete(cache.keys().next().value);
  return data;
}
export function selectStations(table, coordinates) {
  if (!table || typeof table!=='object' || Array.isArray(table)) throw new WeatherError('FORMAT','観測点表の形式が変わっています。');
  return Object.entries(table).flatMap(([id,s])=>{
    const lat=deg(s.lat),lon=deg(s.lon);
    if (!/^\d{5}$/.test(id) || !finite(lat) || !finite(lon) || !s.elems || s.elems[1]==='0') return [];
    const point={id,name:s.kjName||id,lat,lon};point.distanceKm=distanceKm(coordinates,point);
    return point.distanceKm<=150 ? [point] : [];
  }).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,9);
}
export async function startWeather({lat,lon,signal,timeoutMs=15000}={}) {
  const coordinates=coarseCoordinates(lat,lon);
  signal?.throwIfAborted();
  if (busy) throw new WeatherError('BUSY','気象データを取得中です。');
  if (!finite(timeoutMs) || timeoutMs<1 || timeoutMs>30000) throw new WeatherError('TIMEOUT_CONFIG','待機時間の指定が範囲外です。');
  const controller=new AbortController();let timedOut=false;
  const onAbort=()=>controller.abort(signal.reason);
  signal?.addEventListener('abort',onAbort,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  busy=true;
  try {
    const [table,latest]=await Promise.all([
      fetchData(BASE+'const/amedastable.json',{ttl:86400000,signal:controller.signal}),
      fetchData(BASE+'data/latest_time.txt',{text:true,signal:controller.signal})
    ]);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(latest) || !Number.isFinite(Date.parse(latest)))
      throw new WeatherError('FORMAT','最新観測時刻を確認できませんでした。');
    const observedMs=Date.parse(latest),stamp=jstStamp(observedMs);
    const points=selectStations(table,coordinates);
    if (!points.length) throw new WeatherError('OUTSIDE_COVERAGE','この地点の近くに対象の観測点がありません。日本の地点を選ぶか、気象庁の表示をご覧ください。');
    const map=await fetchData(BASE+'data/map/'+stamp+'.json',{ttl:600000,signal:controller.signal});
    if (!map || typeof map!=='object' || Array.isArray(map)) throw new WeatherError('FORMAT','観測値の形式が変わっています。');
    const station=points[0],nearby=points.map(s=>({...s,...row(map[s.id],latest)}));
    // Two 3-hour files from one station only. No spatial multi-point fetch or interpolation.
    const blockMs=Math.floor((observedMs+9*3600000)/(3*3600000))*3*3600000-9*3600000;
    const blockUrls=[blockMs-3*3600000,blockMs].map(ms=>{const s=jstStamp(ms);return BASE+'data/point/'+station.id+'/'+s.slice(0,8)+'_'+s.slice(8,10)+'.json';});
    const warnings=[];
    const pieces=await Promise.all(blockUrls.map(url=>fetchData(url,{signal:controller.signal}).catch(e=>{
      if (controller.signal.aborted) throw e;
      warnings.push('過去の一部を取得できませんでした。取得できた時刻だけを表示します。');return {};
    })));
    const records=Object.assign({},...pieces);
    const hourly=Object.entries(records).flatMap(([key,record])=>{
      const time=stampTime(key);
      return time && key.slice(10,14)==='0000' && Date.parse(time)<=observedMs ? [row(record,time)] : [];
    }).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
    controller.signal.throwIfAborted();
    const stale=Date.now()-observedMs>3600000;
    if (stale) warnings.push('最新として配信された観測時刻が1時間以上前です。');
    if (!hourly.length) warnings.push('時系列は未取得です。最新の観測点表示をご覧ください。');
    return {kind:'observation',provider:'JMA',label:'気象庁アメダス｜観測点の前1時間降水量',
      coordinates,coordinatesSent:false,station,nearby,hourly,current:row(map[station.id],latest),
      fetchedAt:cache.get(BASE+'data/map/'+stamp+'.json')?.fetchedAt || null,checkedAt:new Date().toISOString(),observedAt:latest,modelUpdatedAt:null,stale,
      cloudPercent:null,attribution:WEATHER_ATTRIBUTION,links:WEATHER_LINKS,warnings:[...new Set(warnings)],
      scope:'近くの観測点の実測。利用者の地点そのものの雨量や、雨域の面分布ではありません。',
      units:{precipitation:'mm / 前1時間',wind:'m/s',cloud:null},
      mapping:'雨量に応じた粒や高さはmitsulabの模式表現。欠測は0にしません。',
      fetchedRoutes:[BASE+'const/amedastable.json',BASE+'data/latest_time.txt',BASE+'data/map/'+stamp+'.json',...blockUrls]};
  } catch(e) {
    if (timedOut) throw new WeatherError('TIMEOUT','気象データの取得が時間内に終わりませんでした。');
    if (signal?.aborted) throw signal.reason || new DOMException('Aborted','AbortError');
    if (e instanceof WeatherError) throw e;
    throw new WeatherError('NETWORK','気象データを読み取れませんでした。手動の体験は続けられます。');
  } finally { controller.abort();clearTimeout(timer);signal?.removeEventListener('abort',onAbort);busy=false; }
}
// Explicit opt-in demo; never a silent substitute for failed live data.
export function sampleWeather() {
  const time='2000-01-01T03:00:00+09:00';
  const values=[0,1,4,2];
  return {kind:'sample',provider:null,label:'説明用の架空サンプル（実際の観測ではありません）',
    coordinates:null,coordinatesSent:false,station:null,nearby:[],
    hourly:values.map((v,i)=>({time:`2000-01-01T0${i}:00:00+09:00`,precipitationMm:v,precipitationPeriodHours:1,interval:'preceding',cloudPercent:null,windSpeedMs:null,missing:false})),
    current:{time,precipitationMm:2,precipitationPeriodHours:1,interval:'preceding',cloudPercent:null,windSpeedMs:null,missing:false},
    fetchedAt:null,observedAt:null,modelUpdatedAt:null,stale:false,cloudPercent:null,
    attribution:{name:'mitsulab 説明用サンプル',url:null,license:null,changes:'架空の数値'},links:WEATHER_LINKS,warnings:[],
    scope:'架空の時系列。実際の場所や時刻の天気を示しません。',mapping:'説明用',units:{precipitation:'mm / 前1時間',wind:null,cloud:null},fetchedRoutes:[]};
}
