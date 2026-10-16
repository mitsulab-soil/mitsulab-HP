// ENUの近距離近似。氷川参道周辺だけに使用し、測量や経路誘導には使わない。
const R = 6371008.8, DEG = Math.PI / 180;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const wrap = d => ((d % 360) + 360) % 360;
export const angleDelta = (a,b) => ((a-b+540)%360)-180;
export function localPosition(origin, target) {
  return {x: (target.lon-origin.lon)*DEG*R*Math.cos((target.lat+origin.lat)*DEG/2), z: -(target.lat-origin.lat)*DEG*R};
}
export function distance(origin,target) { const p=localPosition(origin,target);return Math.hypot(p.x,p.z); }
export function bearing(origin,target) { const p=localPosition(origin,target);return wrap(Math.atan2(p.x,-p.z)/DEG); }
export function validPosition(p) { return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat)<=90 && Math.abs(p.lon)<=180 && Number.isFinite(p.accuracy) && p.accuracy>=0; }
export function cameraVerticalFov(horizontalFov,videoWidth,videoHeight,viewportWidth,viewportHeight) {
  if(!(videoWidth>0&&videoHeight>0&&viewportWidth>0&&viewportHeight>0))return 60;
  const scale=Math.max(viewportWidth/videoWidth,viewportHeight/videoHeight);
  return 2*Math.atan(Math.tan(horizontalFov*DEG/2)/(videoWidth/videoHeight)*viewportHeight/(videoHeight*scale))/DEG;
}
export function trackingQuality({mode,position,now,anchors,moving}) {
  if(mode==='preview')return {ready:true,reason:'3Dプレビュー · 仮の視点'};
  if(!validPosition(position))return {ready:false,reason:'GPSの位置を確認しています。'};
  if(now-position.timestamp>30000)return {ready:false,reason:'位置の更新を待っています。'};
  if(position.accuracy>80)return {ready:false,reason:'GPSの誤差が大きいため、情報の配置を休止しています。'};
  if(!anchors.length||Math.min(...anchors.map(a=>distance(position,a)))>750)return {ready:false,reason:'氷川参道の近くで、この場所の情報が現れます。'};
  if(moving)return {ready:false,reason:'移動を検知しました。安全な場所に立ち止まってご覧ください。'};
  return {ready:true,reason:'GPS・方位による概略配置'};
}
