import * as T from 'three';
// 音源と全エフェクトを通った共通出力だけを解析。混合相手を二重計上しない。
export class SoundSpace{
 constructor(canvas,a){
  this.a=a;this.last=0;this.lastDraw=0;this.rows=80;this.bins=96;this.view='waveform';this.frozen=false;this.yaw=0;this.pitch=.25;this.phase=0;
  this.history=new Float32Array(this.rows*this.bins);this.times=new Float64Array(this.rows);this.db=new Float32Array(1024);this.db.fill(-100);this.levels=[0,0,0];
  this.waveRows=28;this.waveBins=320;this.waveHistory=new Float32Array(this.waveRows*this.waveBins);this.samples=new Float32Array(2048);
  this.r=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});this.r.setPixelRatio(Math.min(1.5,devicePixelRatio));
  this.r.toneMapping=T.ACESFilmicToneMapping;this.r.toneMappingExposure=1.1;
  this.scene=new T.Scene();this.cam=new T.PerspectiveCamera(38,2,.1,100);
  this.scene.add(new T.HemisphereLight(0xe2edf5,0x28323a,1.4));
  const key=new T.DirectionalLight(0xfff3e6,3);key.position.set(3,4,5);this.scene.add(key);
  const rim=new T.PointLight(0x62bde1,10,20);rim.position.set(-4,-1,3);this.scene.add(rim);
  this.sculpture=new T.Group();this.waterfall=new T.Group();this.waveform=new T.Group();this.scene.add(this.sculpture,this.waterfall,this.waveform);
  this.lines=[];this.ribbons=[];
  for(let j=0;j<3;j++){
   const count=480,color=new T.Color([0x7edcc9,0xd6eee5,0xbabf8d][j]),g=new T.BufferGeometry();
   g.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3));
   this.sculpture.add(new T.Line(g,new T.LineBasicMaterial({color,transparent:true,opacity:.95})));this.lines.push(g);
   const ribbon=new T.BufferGeometry(),idx=[];ribbon.setAttribute('position',new T.BufferAttribute(new Float32Array(count*6),3));
   for(let i=0;i<count-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}ribbon.setIndex(idx);
   this.sculpture.add(new T.Mesh(ribbon,new T.MeshStandardMaterial({color,metalness:0,roughness:.42,transparent:true,opacity:.86,side:T.DoubleSide,depthWrite:false})));
   this.ribbons.push(ribbon);
  }
  const wn=this.waveRows*this.waveBins,widx=[];this.wavePos=new Float32Array(wn*3);const wc=new Float32Array(wn*3);
  for(let z=0;z<this.waveRows;z++)for(let x=0;x<this.waveBins;x++){
   const i=z*this.waveBins+x,fade=1-z/this.waveRows,c=new T.Color().setRGB(.18+.42*fade,.38+.5*fade,.42+.38*fade);
   wc.set([c.r,c.g,c.b],i*3);if(x<this.waveBins-1)widx.push(i,i+1);
  }
  this.waveGeo=new T.BufferGeometry();this.waveGeo.setAttribute('position',new T.BufferAttribute(this.wavePos,3));this.waveGeo.setAttribute('color',new T.BufferAttribute(wc,3));this.waveGeo.setIndex(widx);
  this.waveform.add(new T.LineSegments(this.waveGeo,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.83})));
  this.frontGeo=new T.BufferGeometry();this.frontGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(this.waveBins*3),3));
  this.waveform.add(new T.Line(this.frontGeo,new T.LineBasicMaterial({color:0xd9fff1})));
  const n=this.rows*this.bins;this.pos=new Float32Array(n*3);this.colors=new Float32Array(n*3);const indices=[];
  for(let z=0;z<this.rows;z++)for(let x=0;x<this.bins;x++){const i=z*this.bins+x;this.pos[3*i]=(x/(this.bins-1)-.5)*6;this.pos[3*i+2]=(.5-z/(this.rows-1))*4;if(x<this.bins-1)indices.push(i,i+1);}
  this.g=new T.BufferGeometry();this.g.setAttribute('position',new T.BufferAttribute(this.pos,3));this.g.setAttribute('color',new T.BufferAttribute(this.colors,3));this.g.setIndex(indices);
  this.waterfall.add(new T.LineSegments(this.g,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.78})));
  this.heat=document.getElementById('heatmap');this.buffer=document.createElement('canvas');this.buffer.width=this.bins;this.buffer.height=this.rows;this.img=this.buffer.getContext('2d').createImageData(this.bins,this.rows);
  this.palette=Array.from({length:256},(_,i)=>{const stops=[[8,22,35],[34,108,128],[99,188,174],[224,191,129],[255,244,208]],x=i/255*4,k=Math.min(3,Math.floor(x)),u=x-k;return stops[k].map((v,c)=>Math.round(v*(1-u)+stops[k+1][c]*u));});
  document.querySelectorAll('[data-sound-view]').forEach(btn=>btn.onclick=()=>{this.view=btn.dataset.soundView;this.yaw=0;this.pitch=.25;document.querySelectorAll('[data-sound-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));canvas.hidden=this.view==='heat';this.heat.hidden=this.view!=='heat';document.querySelector('.heatLegend').hidden=this.view!=='heat';this.draw(performance.now());});
  document.getElementById('freezeSound').onclick=e=>{this.frozen=!this.frozen;e.currentTarget.setAttribute('aria-pressed',String(this.frozen));e.currentTarget.textContent=this.frozen?'表示を再開':'表示を止める';};
  let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;this.yaw+=(e.clientX-drag.x)*.006;this.pitch=Math.max(-.6,Math.min(.9,this.pitch+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};this.draw(performance.now());});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){this.yaw=0;this.pitch=.25;}else{this.yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;this.pitch=Math.max(-.6,Math.min(.9,this.pitch+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0)));}this.draw(performance.now());});
  this.rm=matchMedia('(prefers-reduced-motion: reduce)');window.__soundSpace=this;
  this.resize=new ResizeObserver(()=>this.draw(performance.now()));this.resize.observe(document.querySelector('.soundStage'));
 }
 update(now){
  if(this.frozen||now-this.lastDraw<32)return;this.lastDraw=now;
  if(now-this.last>=70){
   this.last=now;this.db.fill(-100);if(this.a.analyser)this.a.analyser.getFloatFrequencyData(this.db);
   const sr=this.a.ctx?.sampleRate||48000;this.history.copyWithin(this.bins,0,this.history.length-this.bins);this.times.copyWithin(1,0,this.rows-1);this.times[0]=now;
   const bands=[0,0,0],counts=[0,0,0];
   for(let x=0;x<this.bins;x++){
    const lo=40*Math.pow(400,x/this.bins),hi=40*Math.pow(400,(x+1)/this.bins),start=Math.max(1,Math.floor(lo/(sr/2048))),end=Math.min(1023,Math.ceil(hi/(sr/2048)));let peak=-100;
    for(let k=start;k<=end;k++)if(Number.isFinite(this.db[k]))peak=Math.max(peak,this.db[k]);
    const v=Math.max(0,Math.min(1,(peak+100)/80));this.history[x]=v;const band=lo<250?0:lo<2000?1:2;bands[band]+=v;counts[band]++;
   }
   this.levels=bands.map((v,i)=>this.levels[i]*.65+v/Math.max(1,counts[i])*.35);
   this.samples.fill(0);this.a.wave(this.samples);
   // ゼロ交差をそろえ、音程の変化が波の密度として見えるようにする。
   let offset=0;for(let i=1;i<1024;i++)if(this.samples[i-1]<=0&&this.samples[i]>0){offset=i;break;}
   this.waveHistory.copyWithin(this.waveBins,0,this.waveHistory.length-this.waveBins);
   for(let i=0;i<this.waveBins;i++)this.waveHistory[i]=this.samples[offset+Math.floor(i/(this.waveBins-1)*1023)];
  }
  this.draw(now);
 }
 draw(now){
  const stage=document.querySelector('.soundStage'),w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  if(!this.frozen)this.phase=this.rm.matches?0:now*.00018;
  const [lo,mid,hi]=this.levels,t=this.phase;
  if(this.view==='heat'){this.drawHeat(w,h);return;}
  if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.r.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();}
  this.sculpture.visible=this.view==='sculpture';this.waterfall.visible=this.view==='spectrum';this.waveform.visible=this.view==='waveform';
  if(this.sculpture.visible){
   this.cam.position.set(0,.1,Math.max(6.8,5/this.cam.aspect));this.cam.lookAt(0,0,0);this.sculpture.rotation.set(this.pitch,this.yaw+t*.25,0);
   this.lines.forEach((g,j)=>{
    const p=g.attributes.position.array,rp=this.ribbons[j].attributes.position.array,count=p.length/3,level=this.levels[j];
    for(let i=0;i<count;i++){
     const u=i/(count-1)*Math.PI*2,phase=j*Math.PI*2/3,r=1.18+j*.15+.24*Math.sin(u*3+phase+mid*2),bend=.16+lo*.35;
     const x=r*Math.cos(u)+bend*Math.cos(u*2+phase),y=r*Math.sin(u)+.18*mid*Math.sin(u*4+phase),z=(.55+hi*.65)*Math.sin(u*2+phase)+level*.35*Math.sin(u*7+t);
     p[i*3]=x;p[i*3+1]=y;p[i*3+2]=z;
     const width=.025+level*.075,twist=u*3+phase;
     for(let side=0;side<2;side++){const k=i*6+side*3,sign=side?1:-1;rp[k]=x+sign*width*Math.cos(u)*Math.cos(twist);rp[k+1]=y+sign*width*Math.sin(u)*Math.cos(twist);rp[k+2]=z+sign*width*Math.sin(twist);}
    }
    g.attributes.position.needsUpdate=true;g.computeBoundingSphere();this.ribbons[j].attributes.position.needsUpdate=true;this.ribbons[j].computeVertexNormals();this.ribbons[j].computeBoundingSphere();
   });
   this.caption('低域 × 中域 × 高域。三つの帯が、音とともにほどけ、重なります。ドラッグで回転。');
  }else if(this.waveform.visible){
   this.cam.position.set(0,2.7,Math.max(7.3,10/this.cam.aspect));this.cam.lookAt(0,0,-.8);this.waveform.rotation.set(this.pitch*.4,this.yaw,0);
   for(let z=0;z<this.waveRows;z++)for(let x=0;x<this.waveBins;x++){const i=z*this.waveBins+x;this.wavePos[i*3]=(x/(this.waveBins-1)-.5)*5.8;this.wavePos[i*3+1]=this.waveHistory[i]*5;this.wavePos[i*3+2]=1.25-z/(this.waveRows-1)*3.5;}
   this.waveGeo.attributes.position.needsUpdate=true;this.waveGeo.computeBoundingSphere();this.frontGeo.attributes.position.array.set(this.wavePos.subarray(0,this.waveBins*3));this.frontGeo.attributes.position.needsUpdate=true;this.frontGeo.computeBoundingSphere();
   const span=(1024/(this.a.ctx?.sampleRate||48000)*1000).toFixed(1);
   this.caption('横：'+span+' msの波形 ／ 高さ：振幅。手前が今、奥は過去の波形。操作で音と形が変わります。');
  }else{
   this.cam.position.set(0,5.6,Math.max(8.4,5.2/this.cam.aspect));this.cam.lookAt(0,.3,0);this.waterfall.rotation.set(this.pitch*.4,this.yaw,0);
   for(let i=0;i<this.history.length;i++){const v=this.history[i],c=this.palette[Math.round(v*255)];this.pos[i*3+1]=v*2.1;for(let k=0;k<3;k++)this.colors[i*3+k]=c[k]/255;}
   this.g.attributes.position.needsUpdate=true;this.g.attributes.color.needsUpdate=true;this.g.computeBoundingSphere();
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
