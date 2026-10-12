// AudioContext seconds; playback rate changes are committed at the current offset.
export function positionAt(offset, startedAt, now, rate, duration){
 if(![offset,startedAt,now,rate,duration].every(Number.isFinite)||rate<=0||duration<0)throw Error('再生位置を計算できません');
 return Math.min(duration,Math.max(0,offset+Math.max(0,now-startedAt)*rate));
}
export function clockLabel(seconds){
 const n=Math.max(0,Math.floor(seconds));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
}
