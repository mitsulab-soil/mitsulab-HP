import * as T from './vendor/hikawa-runtime-170-355.js';
import {clamp,wrap,angleDelta,localPosition,distance,bearing,validPosition,cameraVerticalFov,trackingQuality} from './field-math.js?v=20261016-ar1';

const $=id=>document.getElementById(id), DEG=Math.PI/180;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const layers={information:true,cognition:false,language:true,senses:false};
const meanings={information:'情報｜地図上の地点へ、記録と距離を重ねる。',cognition:'認知｜ひとつの場所へ、注目の奥行きを重ねる。心の計測ではありません。',language:'言語｜名前と記録を通して、目の前の場所を見直す。',senses:'感覚｜届かない手がかりを、波と光の動きとして想像する。実測音や地下水ではありません。'};
const state={mode:'',cameraReady:false,generation:0,position:null,selected:null,manualTarget:false,headingSource:'未取得',headingReference:'',calibrated:false,orientation:null,rawHeading:0,yaw:0,pitch:0,paused:reduced.matches,moving:false,frames:0,quality:{ready:false,reason:''}};
let anchors=[],renderer,scene,camera,preview,stream=null,watchId=null,raf=0,lastFrame=0,lastUI=0,elapsed=0,permissionMessage='',loaded=false;
const groups=new Map(),projector=new T.Vector3(),forward=new T.Vector3(),up=new T.Vector3(0,1,0);
const rawQuaternion=new T.Quaternion(),yawQuaternion=new T.Quaternion(),euler=new T.Euler(),screenQuaternion=new T.Quaternion();
const portraitQuaternion=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);
const setText=(id,text)=>{if($(id).textContent!==text)$(id).textContent=text;};
const target=()=>anchors.find(a=>a.id===state.selected)||anchors[0];

function line(pts,color,opacity=.45){return new T.Line(new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));}
function points(vertices,color,size=.045,opacity=.75){
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 return new T.Points(geo,new T.PointsMaterial({color,size,transparent:true,opacity,depthWrite:false,map:dotTexture(),alphaTest:.02}));
}
let dot;
function dotTexture(){if(dot)return dot;const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d'),g=x.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'#fff');g.addColorStop(.35,'#ffffffdb');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.fillRect(0,0,32,32);dot=new T.CanvasTexture(c);return dot;}
function makeLayerObject(a,index){
 const root=new T.Group(),info=new T.Group(),focus=new T.Group(),sense=new T.Group();root.add(info,focus,sense);scene.add(root);
 // 座標の由来はデータに記録。点の柱や奥行きの面は、対象の実測形状ではない。
 const vertices=[];for(let j=0;j<220;j++){const t=j/219,y=t*4.2,ang=j*2.399;vertices.push(Math.cos(ang)*(.35+.26*Math.sin(y*1.2)),y,Math.sin(ang)*.38);}
 info.add(points(vertices,0x8ce6d4,.065,.8));
 info.add(line([[-.7,0,0],[-.7,4.5,0],[-.35,4.5,0]],0x9de4d3,.5));
 const ticks=[];for(let y=.5;y<=4.5;y+=.5){ticks.push(-.7,y,0,-.58,y,0);}const tickGeo=new T.BufferGeometry();tickGeo.setAttribute('position',new T.Float32BufferAttribute(ticks,3));info.add(new T.LineSegments(tickGeo,new T.LineBasicMaterial({color:0x9de4d3,transparent:true,opacity:.38})));
 const focusPts=[];for(let n=0;n<3;n++){const w=1.2+n*.45,h=2.3+n*.5,z=-n*.65;focus.add(line([[-w,0,z],[-w,h,z],[-w+.5,h,z]],0xe8c89a,.28));focus.add(line([[w,h,z],[w,0,z],[w-.5,0,z]],0xe8c89a,.28));for(let j=0;j<32;j++){const x=(j%8)/7*w*2-w,y=Math.floor(j/8)/3*h;focusPts.push(x,y,z);}}
 focus.add(points(focusPts,0xe8c89a,.045,.35));
 for(let n=0;n<4;n++){const path=[];for(let j=0;j<70;j++){const x=j/69*5-2.5;path.push([x,.8+n*.4+Math.sin(x*1.6+n)*.27,Math.sin(x*.8+n)*.5]);}sense.add(line(path,0xa5c4ec,.4));}
 const cloud=[];for(let j=0;j<110;j++){const a=j*2.399,r=(j%17)/17*2.3;cloud.push(Math.cos(a)*r,.3+(j%23)/23*2.9,Math.sin(a)*r*.5);}sense.add(points(cloud,0x98bded,.05,.6));
 const label=document.createElement('div');label.className='arAnchor';label.hidden=true;const name=document.createElement('span');name.textContent=a.name;const value=document.createElement('small');label.append(name,value);$('arLabels').append(label);
 const item={a,root,info,focus,sense,label,value,index};groups.set(a.id,item);return item;
}
function setup(){
 if(renderer)return;
 renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);$('arCanvas').append(renderer.domElement);
 scene=new T.Scene();camera=new T.PerspectiveCamera(60,1,.1,900);camera.position.y=1.6;
 anchors.forEach(makeLayerObject);
 preview=new T.Group();scene.add(preview);
 // デモ専用の点群景観。カメラ中には出さず、実景と取り違えない。
 const ground=[];for(let x=-28;x<=28;x+=2)for(let z=-80;z<=15;z+=2)ground.push(x,-1.6,z);
 preview.add(points(ground,0x5a8e86,.035,.5));
 const trees=[];for(let n=0;n<24;n++){const x=(n%2?1:-1)*(5+(n%3)),z=-5-Math.floor(n/2)*6;for(let j=0;j<160;j++){const a=j*2.399,r=1.5*Math.sqrt((j%31)/31);trees.push(x+Math.cos(a)*r,2.3+(j%23)/23*4.5,z+Math.sin(a)*r);}}
 preview.add(points(trees,0x76a89a,.06,.5));
 preview.add(line([[-3,-1.6,15],[-3,-1.6,-80]],0x9cc6ba,.35),line([[3,-1.6,15],[3,-1.6,-80]],0x9cc6ba,.35));
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop('描画が休止しました。ページを読み込み直してください。');});
 resize();
}
function resize(){
 if(!renderer)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;
 const v=$('arVideo');camera.fov=state.mode==='camera'&&v.videoWidth?cameraVerticalFov(+$('arFov').value,v.videoWidth,v.videoHeight,innerWidth,innerHeight):+$('arFov').value;
 camera.updateProjectionMatrix();
}
addEventListener('resize',resize);$('arVideo').addEventListener('loadedmetadata',resize);

function updateOrientation(e){
 if(state.mode!=='camera'||!Number.isFinite(e.beta)||!Number.isFinite(e.gamma)||!Number.isFinite(e.alpha))return;
 // iOSはwebkitCompassHeading、Android等はabsolute。相対alphaを真北扱いしない。
 const compass=Number.isFinite(e.webkitCompassHeading)&&(!Number.isFinite(e.webkitCompassAccuracy)||e.webkitCompassAccuracy>=0);
 const absolute=e.absolute===true||e.type==='deviceorientationabsolute';
 if(!compass&&!absolute&&state.headingSource==='方位センサー')return;
 const reference=compass||absolute?'absolute':'relative';
 if((state.headingReference||state.calibrated)&&state.headingReference!==reference){state.yaw=0;state.calibrated=false;$('arYaw').value=0;$('arYawValue').value='0°';setText('arAlignStatus','方位センサーの基準が変わったため、前の補正を解除しました。');}
 state.headingReference=reference;
 const alpha=compass?360-e.webkitCompassHeading:e.alpha;
 euler.set(e.beta*DEG,alpha*DEG,-e.gamma*DEG,'YXZ');rawQuaternion.setFromEuler(euler).multiply(portraitQuaternion);
 const screenAngle=(screen.orientation?.angle??window.orientation??0)*DEG;screenQuaternion.setFromAxisAngle(new T.Vector3(0,0,1),-screenAngle);rawQuaternion.multiply(screenQuaternion);
 state.orientation=rawQuaternion.clone();forward.set(0,0,-1).applyQuaternion(rawQuaternion);state.rawHeading=wrap(Math.atan2(forward.x,-forward.z)/DEG);
 state.headingSource=compass||absolute?'方位センサー':'相対方位・要補正';
}
function applyView(){
 if(state.mode==='camera'&&state.orientation){camera.quaternion.copy(state.orientation);yawQuaternion.setFromAxisAngle(up,-state.yaw*DEG);camera.quaternion.premultiply(yawQuaternion);}
 else camera.quaternion.setFromEuler(euler.set(state.pitch*DEG,-(state.rawHeading+state.yaw)*DEG,0,'YXZ'));
 camera.updateMatrixWorld();
}
function onPosition(p){
 if(state.mode!=='camera')return;
 const next={lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp||Date.now()};
 if(!validPosition(next))return;
 state.position=next;permissionMessage='';state.moving=Number.isFinite(p.coords.speed)&&p.coords.speed>1.2&&next.accuracy<40;
 if(!state.manualTarget){const closest=anchors.slice().sort((a,b)=>distance(next,a)-distance(next,b))[0];if(closest&&closest.id!==state.selected){state.selected=closest.id;$('arTarget').value=closest.id;updateTarget();}}
}
function onPositionError(e){if(state.mode!=='camera')return;state.position=null;state.moving=false;permissionMessage=e.code===1?'位置情報が許可されていません。端末の設定から許可するか、3Dで試せます。':'位置情報を取得できません。空が開けた場所で立ち止まり、お待ちください。';}
function activate(mode){
 state.mode=mode;state.cameraReady=false;state.headingReference='';state.manualTarget=false;state.calibrated=false;state.position=null;state.orientation=null;state.rawHeading=0;state.yaw=0;state.pitch=0;state.headingSource=mode==='preview'?'デモの方位':'未取得';state.moving=false;state.frames=0;permissionMessage='';elapsed=0;lastFrame=0;lastUI=0;
 $('arYaw').value=0;$('arYawValue').value='0°';$('arPitch').value=0;$('arAlignStatus').textContent='';$('arPreviewPitchLabel').hidden=mode!=='preview';
 document.body.dataset.mode=mode;document.body.classList.add('arActive');$('arIntro').hidden=true;$('arInterface').hidden=false;$('arReading').hidden=true;$('arSettingsPanel').hidden=true;$('arSettings').setAttribute('aria-expanded','false');
 preview.visible=mode==='preview';setText('arMode',mode==='preview'?'3D PREVIEW / 仮の視点':'CAMERA / 接続待ち');
 resize();updateTarget();raf=requestAnimationFrame(frame);$('arEnd').focus();
}
function cleanup(){
 state.generation++;state.mode='';state.cameraReady=false;cancelAnimationFrame(raf);raf=0;
 if(watchId!==null){navigator.geolocation?.clearWatch(watchId);watchId=null;}
 removeEventListener('deviceorientation',updateOrientation);removeEventListener('deviceorientationabsolute',updateOrientation);
 const old=stream;stream=null;old?.getTracks().forEach(t=>t.stop());$('arVideo').srcObject=null;
 for(const g of groups.values()){g.root.visible=false;g.label.hidden=true;}
 renderer?.clear();document.body.classList.remove('arActive');delete document.body.dataset.mode;
 setSheet(null);$('arIntro').hidden=false;$('arInterface').hidden=true;
 state.position=null;state.orientation=null;state.quality={ready:false,reason:''};
}
function stop(message='カメラと位置・向きの取得を終了しました。') {cleanup();setText('arIntroStatus',message);if(loaded)$('arStart').focus();}
async function startCamera(){
 cleanup();try{setup();}catch{stop('この環境では3D描画を開始できません。別のブラウザでお試しください。');return;}
 if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){stop('カメラはHTTPSの公開ページと対応ブラウザから開いてください。3Dでは試せます。');return;}
 const ticket=state.generation;activate('camera');
 // requestPermissionはクリックの中で、awaitより前に呼ぶ。
 let orientationPermission;
 try{orientationPermission=typeof globalThis.DeviceOrientationEvent?.requestPermission==='function'?DeviceOrientationEvent.requestPermission(true):Promise.resolve('granted');}catch{orientationPermission=Promise.resolve('denied');}
 Promise.resolve(orientationPermission).then(result=>{if(ticket!==state.generation||state.mode!=='camera')return;if(result==='granted'){addEventListener('deviceorientation',updateOrientation);addEventListener('deviceorientationabsolute',updateOrientation);}else state.headingSource='向き未許可・手動';}).catch(()=>{if(ticket===state.generation)state.headingSource='向き未許可・手動';});
 try{
  const incoming=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  if(ticket!==state.generation){incoming.getTracks().forEach(t=>t.stop());return;}
  stream=incoming;$('arVideo').srcObject=incoming;await $('arVideo').play();
  if(ticket!==state.generation)return;
  const ready=()=>{if(ticket!==state.generation||stream!==incoming)return;state.cameraReady=true;setText('arMode','LIVE CAMERA / 実景');};
  if($('arVideo').requestVideoFrameCallback)$('arVideo').requestVideoFrameCallback(ready);else if($('arVideo').readyState>=2)ready();
  incoming.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>{if(stream===incoming)stop('カメラが終了しました。再度開くことができます。');},{once:true}));
  if(navigator.geolocation)watchId=navigator.geolocation.watchPosition(onPosition,onPositionError,{enableHighAccuracy:true,maximumAge:3000,timeout:15000});else permissionMessage='このブラウザは位置情報を利用できません。3Dでお試しください。';
  resize();
 }catch(e){if(ticket!==state.generation)return;stop(e.name==='NotAllowedError'?'カメラが許可されませんでした。端末の設定から許可するか、3Dで試せます。':'カメラを開けませんでした。ほかのアプリの使用と端末の設定を確認してください。');}
}
function startPreview(){cleanup();try{setup();activate('preview');setPreviewTarget();}catch{stop('3Dを開始できませんでした。ブラウザの描画設定を確認してください。');}}
function setPreviewTarget(){const a=target();if(!a)return;state.position={lat:a.lat-.00022,lon:a.lon,accuracy:0,timestamp:Date.now()};state.rawHeading=0;state.yaw=0;state.pitch=0;$('arYaw').value=0;$('arYawValue').value='0°';$('arPitch').value=0;updateTarget();}
function updateTarget(){
 const a=target();if(!a)return;setText('arTargetNote',a.positionNote||'地図上の代表位置。実物の位置とずれることがあります。');
 setText('arReadTitle',a.name);setText('arReadText',a.description);setText('arReadPosition',a.positionNote||'');
 $('arSources').replaceChildren();for(const source of a.sourceUrls||[]){try{const u=new URL(source.url);if(!['http:','https:'].includes(u.protocol))continue;const link=document.createElement('a');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.title||'出典を見る';$('arSources').append(link);}catch{}}
}
function align(){
 if(!state.position||!state.quality.ready){setText('arAlignStatus','位置が確認できてから、目印に向けてください。');return;}
 const a=target();if(distance(state.position,a)<4){setText('arAlignStatus','目印に近すぎて方位が安定しません。別の目印を選んでください。');return;}
 state.yaw=angleDelta(bearing(state.position,a),state.rawHeading);state.calibrated=true;$('arYaw').value=Math.round(state.yaw);$('arYawValue').value=Math.round(state.yaw)+'°';setText('arAlignStatus','この向きを目印の方位に合わせました。GPSのずれは残ります。');
}
function updateUI(now){
 const p=state.position,a=target();state.quality=trackingQuality({mode:state.mode,position:p,now:Date.now(),anchors,moving:state.moving});
 const heading=wrap(state.rawHeading+state.yaw);setText('arHeading',`${Math.round(heading).toString().padStart(3,'0')}°`);
 setText('arPlace',state.quality.ready&&a?a.name:state.mode==='camera'?'実景に、手がかりを。':'参道の3Dプレビュー');
 setText('arAccuracy',state.mode==='preview'?'仮の位置・方位 / 点群景観は模式':`GPS ${p?'±'+Math.round(p.accuracy)+'m':'確認中'} / ${state.headingSource}${state.calibrated?'・手動補正済み':''}`);
 let status=permissionMessage||state.quality.reason;
 if(state.mode==='camera'&&state.quality.ready){
  if(state.headingSource!=='方位センサー'&&!state.calibrated)status='向きは自動で合っていません。「位置を合わせる」で目印へ補正してください。';
  else if(state.headingSource!=='方位センサー')status='手動の方位です。端末の向きを変えたら、目印に合わせ直してください。';
  else if(a&&distance(p,a)>160)status='近くの目印へ、立ち止まってかざしてください。';
  else status='安全な場所で立ち止まって見る · 線と粒子は創作の層';
 }
 if(state.mode==='camera'&&!state.cameraReady)status='カメラの映像を待っています。位置の表示は映像が始まってから重ねます。';
 setText('arStatus',status);$('arRead').disabled=!a;
}
function frame(now){
 if(!state.mode)return;raf=requestAnimationFrame(frame);if(document.hidden||now-lastFrame<1000/30)return;
 const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;if(!state.paused&&!reduced.matches)elapsed+=dt;
 if(now-lastUI>200){lastUI=now;updateUI(now);}applyView();
 const visible=[];
 for(const item of groups.values()){
  const {a,root,info,focus,sense,label,value}=item;
  const d=state.position?distance(state.position,a):Infinity;root.visible=state.quality.ready&&(state.mode==='preview'||state.cameraReady)&&(state.mode==='preview'||state.headingSource==='方位センサー'||state.calibrated)&&d>=3&&d<=160;
  if(!root.visible){label.hidden=true;continue;}
  const p=localPosition(state.position,a);root.position.set(p.x,0,p.z);info.visible=layers.information;focus.visible=layers.cognition;sense.visible=layers.senses;
  sense.position.y=Math.sin(elapsed*.7+item.index)*.12;focus.rotation.y=Math.sin(elapsed*.13)*.025;
  projector.set(p.x,2.8,p.z).project(camera);label.hidden=true;
  if(layers.language&&projector.z>-1&&projector.z<1&&Math.abs(projector.x)<.82&&Math.abs(projector.y)<.75)visible.push({item,x:(projector.x+1)*innerWidth/2,y:(1-projector.y)*innerHeight/2,d});
 }
 // 中央を空け、文字同士の重なりを避ける。最も近い2地点まで。
 const shown=[];visible.sort((a,b)=>(b.item.a.id===state.selected)-(a.item.a.id===state.selected)||a.d-b.d);
 for(const v of visible){if(shown.length===2)break;const {label,value}=v.item,w=Math.min(210,innerWidth*.5);const x=clamp(v.x,90+w/2,innerWidth-w/2-18),y=clamp(v.y,210,innerHeight-220);
  if(shown.some(q=>Math.abs(x-q.x)<w&&Math.abs(y-q.y)<65))continue;
  value.textContent=`${Math.round(v.d)} m · ${state.mode==='preview'?'DEMO':'GPS 概略'}`;label.style.left=x+'px';label.style.top=y+'px';label.classList.toggle('selected',v.item.a.id===state.selected);label.hidden=false;shown.push({x,y});
 }
 renderer.render(scene,camera);state.frames++;
}

$('arStart').onclick=startCamera;$('arPreview').onclick=startPreview;$('arEnd').onclick=()=>stop();
$('arPause').setAttribute('aria-pressed',String(state.paused));$('arPause').textContent=state.paused?'動きを再開':'動きを止める';
$('arPause').onclick=()=>{state.paused=!state.paused;$('arPause').setAttribute('aria-pressed',String(state.paused));$('arPause').textContent=state.paused?'動きを再開':'動きを止める';};
// パネルを閉じた後やカメラ終了時にも、背後の操作を必ず戻す。
function setSheet(id){
 for(const name of ['arSettingsPanel','arReading'])$(name).hidden=name!==id;
 $('arSettings').setAttribute('aria-expanded',String(id==='arSettingsPanel'));
 $('arInterface').inert=!!id;document.querySelector('.arMast').inert=!!id;
 if(id)$(id).scrollTop=0;
}
function closeSettings(){setSheet(null);$('arSettings').focus();}
$('arSettings').onclick=()=>{setSheet('arSettingsPanel');$('arTarget').focus({preventScroll:true});};$('arSettingsClose').onclick=closeSettings;
$('arRead').onclick=()=>{setSheet('arReading');updateTarget();$('arReadingClose').focus({preventScroll:true});};$('arReadingClose').onclick=()=>{setSheet(null);$('arRead').focus();};
$('arTarget').onchange=()=>{state.selected=$('arTarget').value;state.manualTarget=true;updateTarget();if(state.mode==='preview')setPreviewTarget();};
$('arAlign').onclick=align;$('arYaw').oninput=()=>{state.yaw=+$('arYaw').value;$('arYawValue').value=state.yaw+'°';};
$('arFov').oninput=()=>{$('arFovValue').value=$('arFov').value+'°';resize();};$('arPitch').oninput=()=>state.pitch=+$('arPitch').value;
document.querySelectorAll('[data-layer]').forEach(button=>button.onclick=()=>{const id=button.dataset.layer;layers[id]=!layers[id];button.setAttribute('aria-pressed',String(layers[id]));setText('arMeaning',layers[id]?meanings[id]:Object.keys(layers).filter(k=>layers[k]).map(k=>meanings[k]).join(' ')||'層を外して、目の前の景色へ。');});
addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();if(!$('arSettingsPanel').hidden)closeSettings();else if(!$('arReading').hidden)$('arReadingClose').click();else if(state.mode)stop();return;}
 if(e.key!=='Tab')return;
 const sheet=['arSettingsPanel','arReading'].map($).find(el=>!el.hidden);if(!sheet)return;
 const stops=[...sheet.querySelectorAll('button:not(:disabled),a[href],select:not(:disabled),input:not(:disabled)')].filter(el=>el.getClientRects().length);
 const first=stops[0],last=stops.at(-1);if(!first)return;
 if(e.shiftKey&&(document.activeElement===first||!sheet.contains(document.activeElement))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&(document.activeElement===last||!sheet.contains(document.activeElement))){e.preventDefault();first.focus();}
});
addEventListener('pagehide',()=>cleanup());document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='camera')stop('画面を離れたため、カメラと位置・向きの取得を停止しました。');});
reduced.addEventListener('change',()=>{if(reduced.matches){state.paused=true;$('arPause').setAttribute('aria-pressed','true');$('arPause').textContent='動きを再開';}});
try{
 const response=await fetch('web/field-anchors.json?v=20261016-ar1',{cache:'no-cache'});if(!response.ok)throw new Error('anchors');const data=await response.json();
 anchors=data.anchors.filter(a=>a.id&&a.name&&Number.isFinite(a.lat)&&Number.isFinite(a.lon));if(!anchors.length)throw new Error('empty');
 state.selected=anchors.find(a=>a.id.includes('torii_2'))?.id||anchors[0].id;
 for(const a of anchors){const o=document.createElement('option');o.value=a.id;o.textContent=a.name;$('arTarget').append(o);}$('arTarget').value=state.selected;
 loaded=true;$('arStart').disabled=false;$('arPreview').disabled=false;setText('arIntroStatus','参道では立ち止まって、カメラをかざしてください。');
}catch{window.__arBootFail();}
// 実行状態の確認用。位置を書き出す機能や、センサーを無断で有効化する機能は設けない。
window.__fieldAR={state,layers,get anchors(){return anchors},get renderer(){return renderer},get camera(){return camera},get stream(){return stream},get watching(){return watchId!==null},stop,get groups(){return groups}};
