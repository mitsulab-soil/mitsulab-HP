import * as T from 'three';
// 共通出力の解析だけを使う。合成相手のFFTを足して二重計上しない。
export class SoundSpace{
 constructor(canvas,a){
  this.a=a;this.last=0;this.rows=80;this.bins=96;this.view='sculpture';this.frozen=false;this.yaw=0;this.pitch=.25;this.phase=0;
  this.history=new Float32Array(this.rows*this.bins);this.times=new Float64Array(this.rows);this.db=new Float32Array(1024);this.db.fill(-100);this.levels=[0,0,0];
  this.r=new T.WebGLRenderer({canvas,alpha:true,antialias:true});this.r.setPixelRatio(Math.min(1.7,devicePixelRatio));this.scene=new T.Scene();this.cam=new T.PerspectiveCamera(38,2,.1,100);
  this.sculpture=new T.Group();this.waterfall=new T.Group();this.scene.add(this.sculpture,this.waterfall);
  this.lines=[];
  for(let j=0;j<3;j++){
   const positions=new Float32Array(720*3),colors=new Float32Array(720*3);
   for(let i=0;i<720;i++){const c=new T.Color().setHSL(.48-j*.10+i/720*.055,.45,.62);colors.set([c.r,c.g,c.b],i*3);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('color',new T.BufferAttribute(colors,3));
   this.sculpture.add(new T.Line(g,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.88})));this.lines.push(g);
  }
  const n=this.rows*this.bins;this.pos=new Float32Array(n*3);this.colors=new Float32Array(n*3);const indices=[];
  for(let z=0;z<this.rows;z++)for(let x=0;x<this.bins;x++){const i=z*this.bins+x;this.pos[3*i]=(x/(this.bins-1)-.5)*6;this.pos[3*i+2]=(.5-z/(this.rows-1))*4;if(x<this.bins-1)indices.push(i,i+1);}
  this.g=new T.BufferGeometry();this.g.setAttribute('position',new T.BufferAttribute(this.pos,3));this.g.setAttribute('color',new T.BufferAttribute(this.colors,3));this.g.setIndex(indices);
  this.waterfall.add(new T.LineSegments(this.g,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.78})));
  this.heat=document.getElementById('heatmap');this.buffer=document.createElement('canvas');this.buffer.width=this.bins;this.buffer.height=this.rows;this.img=this.buffer.getContext('2d').createImageData(this.bins,this.rows);
  this.palette=Array.from({length:256},(_,i)=>{const stops=[[8,22,35],[34,108,128],[99,188,174],[224,191,129],[255,244,208]],x=i/255*4,k=Math.min(3,Math.floor(x)),u=x-k;return stops[k].map((v,c)=>Math.round(v*(1-u)+stops[k+1][c]*u));});
  document.querySelectorAll('[data-sound-view]').forEach(btn=>btn.onclick=()=>{this.view=btn.dataset.soundView;document.querySelectorAll('[data-sound-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));canvas.hidden=this.view==='heat';this.heat.hidden=this.view!=='heat';document.querySelector('.heatLegend').hidden=this.view!=='heat';this.draw(performance.now());});
  document.getElementById('freezeSound').onclick=e=>{this.frozen=!this.frozen;e.currentTarget.setAttribute('aria-pressed',String(this.frozen));e.currentTarget.textContent=this.frozen?'動きを再開':'動きを止める';};
  let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;this.yaw+=(e.clientX-drag.x)*.006;this.pitch=Math.max(-.6,Math.min(.9,this.pitch+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};this.draw(performance.now());});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  this.rm=matchMedia('(prefers-reduced-motion: reduce)');window.__soundSpace=this;
  this.resize=new ResizeObserver(()=>this.draw(performance.now()));this.resize.observe(document.querySelector('.soundStage'));
 }
 update(now){
  if(this.frozen||now-this.last<70)return;this.last=now;
  this.db.fill(-100);if(this.a.analyser)this.a.analyser.getFloatFrequencyData(this.db);
  const sr=this.a.ctx?.sampleRate||48000;this.history.copyWithin(this.bins,0,this.history.length-this.bins);this.times.copyWithin(1,0,this.rows-1);this.times[0]=now;
  const bands=[0,0,0],counts=[0,0,0];
  for(let x=0;x<this.bins;x++){
   const lo=40*Math.pow(400,x/this.bins),hi=40*Math.pow(400,(x+1)/this.bins),start=Math.max(1,Math.floor(lo/(sr/2048))),end=Math.min(1023,Math.ceil(hi/(sr/2048)));let peak=-100;
   for(let k=start;k<=end;k++)if(Number.isFinite(this.db[k]))peak=Math.max(peak,this.db[k]);
   const v=Math.max(0,Math.min(1,(peak+100)/80));this.history[x]=v;const band=lo<250?0:lo<2000?1:2;bands[band]+=v;counts[band]++;
  }
  this.levels=bands.map((v,i)=>this.levels[i]*.65+v/Math.max(1,counts[i])*.35);
  this.draw(now);
 }
 draw(now){
  const stage=document.querySelector('.soundStage'),w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  if(!this.frozen)this.phase=this.rm.matches?0:now*.00018;
  const [lo,mid,hi]=this.levels,t=this.phase;
  if(this.view==='heat'){this.drawHeat(w,h);return;}
  if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.r.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();}
  this.sculpture.visible=this.view==='sculpture';this.waterfall.visible=!this.sculpture.visible;
  if(this.sculpture.visible){
   const radius=2.0;this.cam.position.set(0,0,Math.max(6.2,3.2/this.cam.aspect));this.cam.lookAt(0,0,0);
   this.sculpture.rotation.set(this.pitch,this.yaw,0);
   this.lines.forEach((g,j)=>{const p=g.attributes.position.array;for(let i=0;i<720;i++){const u=i/719*Math.PI*2,r=radius*(.55+.12*j)+.20*Math.sin(u*(3+j)+mid*4);p[i*3]=r*Math.cos(u)+.35*lo*Math.sin(u*3+t+j);p[i*3+1]=r*Math.sin(u)+.32*mid*Math.cos(u*4-t+j);p[i*3+2]=(.25+hi*.8)*Math.sin(u*(3+j)+t+j*.7);}g.attributes.position.needsUpdate=true;});
   this.caption('低域 × 中域 × 高域で変わる立体の線。ドラッグで回転。視覚的なたとえです。');
  }else{
   this.cam.position.set(0,5.6,Math.max(8.4,5.2/this.cam.aspect));this.cam.lookAt(0,.3,0);this.waterfall.rotation.y=this.yaw;
   for(let i=0;i<this.history.length;i++){const v=this.history[i],c=this.palette[Math.round(v*255)];this.pos[i*3+1]=v*2.1;for(let k=0;k<3;k++)this.colors[i*3+k]=c[k]/255;}
   this.g.attributes.position.needsUpdate=true;this.g.attributes.color.needsUpdate=true;
   this.caption('横：40 Hz → 16 kHz（対数）／高さ・色：FFTレベル／手前：現在、奥：過去。ドラッグで回転。');
  }
  this.r.render(this.scene,this.cam);
 }
 drawHeat(w,h){
  const dpr=Math.min(1.7,devicePixelRatio);if(this.heat.width!==Math.round(w*dpr)||this.heat.height!==Math.round(h*dpr)){this.heat.width=Math.round(w*dpr);this.heat.height=Math.round(h*dpr);}
  const c=this.heat.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#081623';c.fillRect(0,0,w,h);
  for(let i=0;i<this.history.length;i++){const col=this.palette[Math.round(this.history[i]*255)];this.img.data.set([...col,255],i*4);}
  this.buffer.getContext('2d').putImageData(this.img,0,0);
  const l=43,top=14,bottom=33,pw=w-l-13,ph=h-top-bottom;
  c.imageSmoothingEnabled=false;c.drawImage(this.buffer,l,top,pw,ph);c.fillStyle='#c8dfdf';c.font='11px system-ui';c.textAlign='center';
  for(const hz of [40,100,1000,16000]){const x=l+Math.log(hz/40)/Math.log(400)*pw;c.fillText(hz>=1000?hz/1000+'k':String(hz),Math.max(l+7,Math.min(w-24,x)),h-14);}
  c.textAlign='left';c.fillText('Hz',w-22,h-2);c.fillText('現在',4,top+12);const oldest=[...this.times].filter(Boolean).at(-1)||this.last;const age=(this.times[0]-oldest)/1000;c.fillText(age.toFixed(1)+'秒前',2,h-bottom);
  this.caption('横：周波数（対数）／縦：取得順（上が現在）。明るい色ほど強い成分。表示範囲 −100〜−20 dB。');
 }
 caption(text){const el=document.getElementById('spaceCaption');if(el.textContent!==text)el.textContent=text;}
}
