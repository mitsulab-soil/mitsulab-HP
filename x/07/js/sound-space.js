import * as T from 'three';
import { seedOf } from './synth.js';
// 音源と全エフェクトを通った共通出力だけを解析。混合相手を二重計上しない。
// 表示は六つ：3D波形・粒の流れ・倍音の層・3D音の彫刻・3D周波数・ヒートマップ。どれも同じ解析の値から描く（でたらめな飾りは足さない）。
// カメラは斜め上から、ゆっくり一周（約90秒）。手で動かすと止まり、6秒ほど触らなければ、なめらかに戻る。
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MOBILE = matchMedia('(max-width: 680px), (pointer: coarse)').matches;
const mulberry = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// 周波数（または明るさ）の色：低い＝琥珀 → 淡い黄緑 → 青緑 → 青 → 青白。粒・倍音・彫刻で同じ並び。
const STOPS = [[.9, .6, .3], [.86, .8, .52], [.52, .86, .74], [.4, .74, .92], [.88, .95, 1]];
const freqColor = (u, o = [0, 0, 0]) => { u = clamp(u, 0, 1) * 4; const k = Math.min(3, Math.floor(u)), f = u - k, a = STOPS[k], b = STOPS[k + 1]; for (let i = 0; i < 3; i++) o[i] = a[i] + (b[i] - a[i]) * f; return o; };
const LOGF = hz => Math.log(hz / 40) / Math.log(400);   // 40 Hz → 0、16 kHz → 1
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); })();
const VIEWS = {
 waveform: { at: [0, .35, -.5], elev: .5, dist: a => Math.max(7.6, 10.5 / a) },
 flow: { at: [0, .35, 0], elev: .62, dist: a => Math.max(8.2, 9.6 / a) },
 harmonics: { at: [0, .55, 0], elev: .46, dist: a => Math.max(8, 9.2 / a) },
 sculpture: { at: [0, 0, 0], elev: .32, dist: a => Math.max(5, 5.4 / a) },
 spectrum: { at: [0, .5, 0], elev: .62, dist: a => Math.max(8.4, 9.4 / a) },
};
export class SoundSpace{
 constructor(canvas,a){
  this.a=a;this.last=0;this.lastDraw=0;this.rows=80;this.bins=96;this.view='waveform';this.frozen=false;this.yaw=0;this.pitch=0;this.az=.5;this.phase=0;this.touched=-1e9;this.tPrev=0;this.clock=0;
  this.history=new Float32Array(this.rows*this.bins);this.times=new Float64Array(this.rows);this.db=new Float32Array(1024);this.db.fill(-100);this.levels=[0,0,0];
  this.waveRows=28;this.waveBins=320;this.waveHistory=new Float32Array(this.waveRows*this.waveBins);this.samples=new Float32Array(2048);
  this.feat={L:0,c:.4,flux:0,f0:null,conf:0};
  this.r=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});this.r.setPixelRatio(Math.min(MOBILE?1.5:1.75,devicePixelRatio));
  this.r.toneMapping=T.ACESFilmicToneMapping;this.r.toneMappingExposure=1.1;
  this.scene=new T.Scene();this.cam=new T.PerspectiveCamera(38,2,.1,100);this.fog=new T.FogExp2(0x05131c,.085);
  this.scene.add(new T.HemisphereLight(0xe2edf5,0x28323a,1.4));
  const key=new T.DirectionalLight(0xfff3e6,3);key.position.set(3,4,5);this.scene.add(key);
  this.groups={};for(const k of ['waveform','flow','harmonics','sculpture','spectrum']){this.groups[k]=new T.Group();this.scene.add(this.groups[k]);}
  // ---- 3D波形（手前が今、奥が過去）
  const wn=this.waveRows*this.waveBins,widx=[];this.wavePos=new Float32Array(wn*3);const wc=new Float32Array(wn*3);
  for(let z=0;z<this.waveRows;z++)for(let x=0;x<this.waveBins;x++){
   const i=z*this.waveBins+x,fade=1-z/this.waveRows,c=new T.Color().setRGB(.18+.42*fade,.38+.5*fade,.42+.38*fade);
   wc.set([c.r,c.g,c.b],i*3);if(x<this.waveBins-1)widx.push(i,i+1);
  }
  this.waveGeo=new T.BufferGeometry();this.waveGeo.setAttribute('position',new T.BufferAttribute(this.wavePos,3));this.waveGeo.setAttribute('color',new T.BufferAttribute(wc,3));this.waveGeo.setIndex(widx);
  this.groups.waveform.add(new T.LineSegments(this.waveGeo,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.83})));
  this.frontGeo=new T.BufferGeometry();this.frontGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(this.waveBins*3),3));
  this.groups.waveform.add(new T.Line(this.frontGeo,new T.LineBasicMaterial({color:0xd9fff1})));
  this.groups.waveform.children.forEach(o=>o.frustumCulled=false);
  // ---- 3D周波数（滝の図）
  const n=this.rows*this.bins;this.pos=new Float32Array(n*3);this.colors=new Float32Array(n*3);const indices=[];
  for(let z=0;z<this.rows;z++)for(let x=0;x<this.bins;x++){const i=z*this.bins+x;this.pos[3*i]=(x/(this.bins-1)-.5)*6;this.pos[3*i+2]=(.5-z/(this.rows-1))*4;if(x<this.bins-1)indices.push(i,i+1);}
  this.g=new T.BufferGeometry();this.g.setAttribute('position',new T.BufferAttribute(this.pos,3));this.g.setAttribute('color',new T.BufferAttribute(this.colors,3));this.g.setIndex(indices);
  const wf=new T.LineSegments(this.g,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.78}));wf.frustumCulled=false;this.groups.spectrum.add(wf);
  this.palette=Array.from({length:256},(_,i)=>{const stops=[[8,22,35],[34,108,128],[99,188,174],[224,191,129],[255,244,208]],x=i/255*4,k=Math.min(3,Math.floor(x)),u=x-k;return stops[k].map((v,c)=>Math.round(v*(1-u)+stops[k+1][c]*u));});
  this.makeFlow();this.makeHarmonics();this.makeSculpture();
  // ---- ヒートマップ（2D）
  this.heat=document.getElementById('heatmap');this.buffer=document.createElement('canvas');this.buffer.width=this.bins;this.buffer.height=this.rows;this.img=this.buffer.getContext('2d').createImageData(this.bins,this.rows);
  // ---- 操作
  document.querySelectorAll('[data-sound-view]').forEach(btn=>btn.onclick=()=>this.setView(btn.dataset.soundView));
  document.getElementById('freezeSound').onclick=e=>{this.frozen=!this.frozen;e.currentTarget.setAttribute('aria-pressed',String(this.frozen));e.currentTarget.textContent=this.frozen?'表示を再開':'表示を止める';};
  const touch=()=>{this.touched=performance.now();};
  let drag=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};touch();canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;this.yaw-=(e.clientX-drag.x)*.006;this.pitch=clamp(this.pitch+(e.clientY-drag.y)*.004,-.5,.8);drag={x:e.clientX,y:e.clientY};touch();this.draw(performance.now());});
  canvas.addEventListener('pointerup',()=>{drag=null;touch();});canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();touch();if(e.key==='Home'){this.yaw=0;this.pitch=0;this.az=.5;}else{this.yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;this.pitch=clamp(this.pitch+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0),-.5,.8);}this.draw(performance.now());});
  this.rm=matchMedia('(prefers-reduced-motion: reduce)');window.__soundSpace=this;
  this.resize=new ResizeObserver(()=>this.draw(performance.now()));this.resize.observe(document.querySelector('.soundStage'));
 }
 setView(v){
  this.view=v;this.yaw=0;this.pitch=0;const canvas=this.r.domElement;
  document.querySelectorAll('[data-sound-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.soundView===v)));
  canvas.hidden=v==='heat';this.heat.hidden=v!=='heat';const sw=document.querySelector('.stageWord');if(sw)sw.hidden=v==='heat';document.querySelector('.heatLegend').hidden=v!=='heat';this.draw(performance.now());
 }
 // ---- 粒の流れ：円周＝周波数（対数）、中心から外＝時間、粒の多さ・高さ・明るさ＝その周波数の強さ
 makeFlow(){
  const P=this.flowCap=MOBILE?12000:40000;this.flowW=0;   // 約6秒ぶんを上書きせずに持てる数
  const g=this.flowGeo=new T.BufferGeometry();
  g.setAttribute('position',new T.BufferAttribute(new Float32Array(P*3),3));
  for(const [k,s] of [['aBirth',1],['aAng',1],['aLev',1],['aSeed',1],['color',3]]){const arr=new Float32Array(P*s);if(k==='aBirth')arr.fill(-1e6);g.setAttribute(k,new T.BufferAttribute(arr,s));}
  this.flowMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexColors:true,
   uniforms:{uTime:{value:0},uLife:{value:6},uPx:{value:Math.min(2,devicePixelRatio)},map:{value:dotTex}},
   vertexShader:`attribute float aBirth,aAng,aLev,aSeed;uniform float uTime,uLife,uPx;varying vec3 vC;varying float vA;
    void main(){float age=uTime-aBirth,k=age/uLife;if(age<0.||k>1.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
     float r=1.+age*.36,ang=aAng+.02*sin(aSeed*6.283+age*1.6);float y=aLev*1.1*(1.-.4*k)+.03*sin(aSeed*37.+age*2.2);
     vec3 p=vec3(r*sin(ang),y,r*cos(ang));
     // 外へ（過去へ）行くほど、ゆるい流れ場で煙のようにほどける。放たれた位置（周波数）は保つ
     p+=age*age*.022*vec3(sin(p.z*1.3+aSeed*3.),.6*sin(p.x*1.1+aSeed*5.),cos(p.y*2.+p.x*1.2));
     vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
     gl_PointSize=uPx*(.8+aLev*2.4)*(1.-.45*k)*(7./-mv.z);vC=color;vA=(.25+.75*aLev)*(1.-k)*(1.-k);}`,
   fragmentShader:`uniform sampler2D map;varying vec3 vC;varying float vA;void main(){float a=texture2D(map,gl_PointCoord).a;gl_FragColor=vec4(vC*1.5,a*vA);}`});
  const pts=new T.Points(g,this.flowMat);pts.frustumCulled=false;this.groups.flow.add(pts);
  // 目盛り：内側の輪と、100 Hz・1 kHz・10 kHz の長い目盛り
  const lp=[];for(let k=0;k<128;k++){const a=k/128*TAU,b=(k+1)/128*TAU;lp.push(Math.sin(a),0,Math.cos(a),Math.sin(b),0,Math.cos(b));}
  for(const hz of [100,200,500,1000,2000,5000,10000]){const a=LOGF(hz)*TAU,l=[100,1000,10000].includes(hz)?.28:.1;lp.push(Math.sin(a),0,Math.cos(a),(1-l)*Math.sin(a),0,(1-l)*Math.cos(a));}
  const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(lp,3));
  this.groups.flow.add(new T.LineSegments(tg,new T.LineBasicMaterial({color:0x8fb9b9,transparent:true,opacity:.45})));
 }
 spawnFlow(R){
  const g=this.flowGeo,B=g.attributes.aBirth.array,A=g.attributes.aAng.array,Lv=g.attributes.aLev.array,S=g.attributes.aSeed.array,C=g.attributes.color.array,K=MOBILE?8:22,col=[0,0,0];let spawned=0;
  for(let x=0;x<this.bins;x++){const v=this.history[x];if(v<.18)continue;let m=Math.floor(v*v*v*K+R());
   while(m-->0&&spawned<(MOBILE?135:460)){const i=this.flowW;this.flowW=(this.flowW+1)%this.flowCap;spawned++;
    const u=(x+R())/this.bins;B[i]=this.clock-R()*.06;A[i]=u*TAU;Lv[i]=v;S[i]=R();freqColor(u,col);C.set(col,i*3);}}
  if(spawned)for(const k of ['aBirth','aAng','aLev','aSeed','color'])g.attributes[k].needsUpdate=true;
 }
 // ---- 倍音の層：推定した基音の整数倍（第1〜第8倍音）の強さを、奥へ重ねた帯にする
 makeHarmonics(){
  const K=this.hK=8,H=this.hH=MOBILE?72:110;this.harm=new Float32Array(K*H);this.hMesh=[];this.hLine=[];
  for(let k=0;k<K;k++){const col=new T.Color().setRGB(...freqColor(k/(K-1)));
   const mg=new T.BufferGeometry();mg.setAttribute('position',new T.BufferAttribute(new Float32Array(H*2*3),3));const idx=[];for(let c=0;c<H-1;c++){const a=c*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}mg.setIndex(idx);
   const m=new T.Mesh(mg,new T.MeshBasicMaterial({color:col,transparent:true,opacity:.26,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));
   const lg=new T.BufferGeometry();lg.setAttribute('position',new T.BufferAttribute(new Float32Array(H*3),3));
   const l=new T.Line(lg,new T.LineBasicMaterial({color:col,transparent:true,opacity:.95}));
   m.frustumCulled=l.frustumCulled=false;this.groups.harmonics.add(m,l);this.hMesh.push(mg);this.hLine.push(lg);}
  const base=[];for(let k=0;k<K;k++){const z=1.4-k*.4;base.push(-2.8,0,z,2.8,0,z);}
  const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(base,3));
  this.groups.harmonics.add(new T.LineSegments(bg,new T.LineBasicMaterial({color:0x5f8a8f,transparent:true,opacity:.35})));
 }
 estimateF0(sr){
  const s=this.samples,n=1024,x=this.dec||=new Float32Array(n),r=this.ac||=new Float32Array(n);for(let i=0;i<n;i++)x[i]=(s[2*i]+s[2*i+1])*.5;const fs=sr/2;
  let e=0;for(let i=0;i<n;i++)e+=x[i]*x[i];if(e<1e-5)return {f0:null,conf:0};
  const minL=Math.max(2,Math.floor(fs/1200)),maxL=Math.min(n-256,Math.ceil(fs/45));let best=0;r.fill(0);
  for(let L=minL;L<=maxL;L++){let s1=0,a=0,b=0;for(let i=0;i<n-L;i++){const p=x[i],q=x[i+L];s1+=p*q;a+=p*p;b+=q*q;}const v=s1/Math.sqrt(a*b+1e-12);r[L]=v;if(v>best)best=v;}
  if(best<.5)return {f0:null,conf:best};
  let L=minL+1;for(;L<maxL;L++)if(r[L]>=.9*best&&r[L]>=r[L-1]&&r[L]>=r[L+1])break;   // 最初の高い山＝下のオクターブへの取り違えを避ける
  // 1150〜4000 Hz の基音は、間引かない元の標本で読む（間引いた側では 1200 Hz を超える基音がその数分の一に見える）
  const hi=this.f0Hi(sr,best);if(hi)return hi;
  const d=(r[L-1]-r[L+1])/(2*(r[L-1]-2*r[L]+r[L+1])||1);return {f0:fs/(L+clamp(d,-.5,.5)),conf:r[L]};
 }
 f0Hi(sr,bestLo){
  const s=this.samples,n=2048,a0=Math.max(2,Math.floor(sr/4000)),a1=Math.ceil(sr/1150)+1,r=this.acH||=new Float32Array(a1+2);let best=0;
  for(let L=a0-1;L<=a1+1;L++){let s1=0,a=0,b=0;for(let i=0;i<n-L;i++){const p=s[i],q=s[i+L];s1+=p*q;a+=p*p;b+=q*q;}const v=s1/Math.sqrt(a*b+1e-12);r[L]=v;if(v>best)best=v;}
  const th=.9*Math.max(best,bestLo);
  for(let L=a0;L<=a1;L++)if(r[L]>=th&&r[L]>=r[L-1]&&r[L]>=r[L+1]&&r[L]>.5){const d=(r[L-1]-r[L+1])/(2*(r[L-1]-2*r[L]+r[L+1])||1);return {f0:sr/(L+clamp(d,-.5,.5)),conf:r[L]};}
  return null;
 }
 // 基音とは扱わない場合：①推定した基音の位置の FFT レベルが最も強い成分より 30 dB 以上低い
 // ②第1〜第8倍音の位置に入る力が、全体の 2 割に満たない（いくつもの音が重なり、強い成分が高い倍音の外にあるとき）
 f0Weak(f0,sr){const bin=sr/2048,db=this.db,P=d=>Number.isFinite(d)?Math.pow(10,d/10):0;let mx=-200,mk=0,tot=0;for(let k=2;k*bin<16000;k++){if(db[k]>mx){mx=db[k];mk=k;}tot+=P(db[k]);}
  const used=new Uint8Array(1024);let p1=-200,har=0;
  for(let h=1;h<=8;h++){const f=f0*h;if(f>=16000)break;const lo=Math.max(2,Math.floor(f*.97/bin)),hi=Math.min(1023,Math.ceil(f*1.03/bin));for(let j=lo;j<=hi;j++){if(h===1&&Number.isFinite(db[j]))p1=Math.max(p1,db[j]);if(!used[j]){used[j]=1;har+=P(db[j]);}}}
  // ③最も強い成分が第1〜第8倍音の窓の外にあり、基音より 10 dB 以上強い（下で鳴る弱い持続音を基音と読んだとき）
  return p1<mx-30||har<.2*tot||(!used[mk]&&mx>p1+10);}
 pushHarmonics(sr){
  const K=this.hK,H=this.hH,h=this.harm,f0=this.feat.f0,bin=sr/2048;
  for(let k=0;k<K;k++){h.copyWithin(k*H,k*H+1,(k+1)*H);let v=0;
   if(f0){const f=f0*(k+1);if(f<sr/2-200){const lo=Math.max(1,Math.floor(f*.98/bin)),hi=Math.min(1023,Math.ceil(f*1.02/bin));let p=-100;for(let j=lo;j<=hi;j++)if(Number.isFinite(this.db[j]))p=Math.max(p,this.db[j]);v=clamp((p+100)/80,0,1);}}
   h[(k+1)*H-1]=v;}
 }
 // ---- 3D音の彫刻：分岐の成長 × ABC流れ場（カオス的な流れ）。
 // 流れの三つの強さ A・B・C＝低・中・高域、伸びる長さ＝音の大きさ、枝分かれ＝スペクトルの変化量、色＝重心周波数（音の明るさ）。
 makeSculpture(){
  const cap=this.segCap=MOBILE?12000:42000;this.maxTips=MOBILE?80:180;this.sc=new T.Vector3();this.scAt=new T.Vector3();
  const g=this.sGeo=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(cap*6),3));g.setAttribute('color',new T.BufferAttribute(new Float32Array(cap*6),3));g.setDrawRange(0,0);
  g.attributes.position.setUsage(T.DynamicDrawUsage);g.attributes.color.setUsage(T.DynamicDrawUsage);
  const ls=new T.LineSegments(g,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.78,blending:T.AdditiveBlending,depthWrite:false}));ls.frustumCulled=false;
  const tg=this.tipGeo=new T.BufferGeometry();tg.setAttribute('position',new T.BufferAttribute(new Float32Array(this.maxTips*3*2),3));tg.setDrawRange(0,0);
  const tp=new T.Points(tg,new T.PointsMaterial({size:.07,map:dotTex,color:0xdff7f0,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false}));tp.frustumCulled=false;
  this.groups.sculpture.add(ls,tp);this.v=new T.Vector3();this.q=new T.Vector3();this.ax=new T.Vector3();this.resetSculpture(1);
 }
 resetSculpture(seed){
  this.R=mulberry(seed);this.nSeg=0;this.sym=0;this.symN=0;this.sGeo.setDrawRange(0,0);this.tips=[];this.sc.set(0,0,0);const n=MOBILE?14:20;
  for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),a=i*2.39996+this.R();const d=new T.Vector3(r*Math.cos(a),y,r*Math.sin(a));this.tips.push({p:d.clone().multiplyScalar(.05),d,o:new T.Vector3(this.R(),this.R(),this.R()).multiplyScalar(Math.PI),gen:0,age:0,life:110+this.R()*110});}
 }
 grow(){
  const f=this.feat,[lo,mid,hi]=this.levels;if(f.L<.05||this.nSeg>=this.segCap)return;
  // 回転の対称の数＝鳴りはじめの、はっきりした周波数の山の数（1〜7）
  // 鳴りはじめの約0.5秒（8回分）のスペクトルを平均してから数える（毎回同じ数になるように）
  if(!this.sym){const acc=this.symAcc||=new Float32Array(this.bins);if(!this.symN)acc.fill(0);for(let x=0;x<this.bins;x++)acc[x]+=this.history[x];if(++this.symN<8)return;
   let k=0;for(let x=1;x<this.bins-1;x++){const v=acc[x]/8;if(v>.45&&v>=acc[x-1]/8&&v>acc[x+1]/8)k++;}this.sym=clamp(k,1,7);}
  const n=this.sym,R=this.R,A=.35+1.8*lo,B=.35+1.8*mid,C=.35+1.8*hi,s=2.6+2.4*f.c,step0=.006+.03*f.L,col=freqColor(f.c),bright=.3+.7*f.L,fl=clamp(f.flux*14,0,1),sum=lo+mid+hi+1e-6,ex=.75+1.1*lo/sum,ey=.75+1.1*hi/sum,minT=MOBILE?14:24;   // 外形：横の広がり＝低域の割合、縦＝高域の割合
  const P=this.sGeo.attributes.position.array,Cl=this.sGeo.attributes.color.array,start=this.nSeg,v=this.v,q=this.q,born=[];
  for(const t of this.tips){
   const fade=Math.pow(.8,t.gen)*Math.min(1,1.4/Math.sqrt(n));   // 対称で重なる分、一本を細く淡く
   for(let sub=0;sub<3&&this.nSeg+n<=this.segCap&&t.age<t.life;sub++){
    const p=t.p,x=p.x*s+t.o.x,y=p.y*s+t.o.y,z=p.z*s+t.o.z;   // 枝ごとに流れ場の別の場所を読む（同じ流線へ束ならない）
    v.set(A*Math.sin(z)+C*Math.cos(y),B*Math.sin(x)+A*Math.cos(z),C*Math.sin(y)+B*Math.cos(x)).normalize();
    t.d.multiplyScalar(.8).addScaledVector(v,.25+.25*mid);const rr=Math.hypot(p.x/ex,p.y/ey,p.z/ex);if(rr>.8)t.d.addScaledVector(p,-.5*(rr-.8)/rr);if(rr>1.12)t.age=t.life;t.d.normalize();   // 外形に届いた枝は止まる
    q.copy(p).addScaledVector(t.d,step0*Math.pow(.88,t.gen));
    for(let r=0;r<n;r++){const a=r*TAU/n,ca=Math.cos(a),sa=Math.sin(a),i=this.nSeg*6;
     P[i]=p.x*ca-p.z*sa;P[i+1]=p.y;P[i+2]=p.x*sa+p.z*ca;P[i+3]=q.x*ca-q.z*sa;P[i+4]=q.y;P[i+5]=q.x*sa+q.z*ca;
     for(let c=0;c<3;c++){Cl[i+c]=col[c]*bright*fade*.3;Cl[i+3+c]=col[c]*bright*fade*.55;}this.nSeg++;}
    p.copy(q);if(n>1)this.sc.y+=q.y*n;else this.sc.add(q);   // 重心（対称なら軸の上）
   }
   t.age++;
   if(R()<.02+.25*fl&&t.gen<8&&this.tips.length+born.length<this.maxTips){
    this.ax.set(R()-.5,R()-.5,R()-.5).cross(t.d).normalize();
    born.push({p:t.p.clone(),o:t.o.clone().addScalar((R()-.5)*.6),d:t.d.clone().applyAxisAngle(this.ax,(.3+.9*f.c)*(R()<.5?-1:1)),gen:t.gen+1,age:0,life:(80+R()*110)*Math.pow(.9,t.gen+1)});
   }
  }
  this.tips=this.tips.filter(t=>t.age<t.life).concat(born);
  // 育った枝の途中から新しい芽
  while(this.tips.length<minT&&this.nSeg>0){const k=Math.floor(R()*this.nSeg/n)*n*6+3,p=new T.Vector3(P[k],P[k+1],P[k+2]);const d=p.clone().normalize().multiplyScalar(.7).add(new T.Vector3(R()-.5,R()-.5,R()-.5)).normalize();this.tips.push({p,d,o:new T.Vector3(R(),R(),R()).multiplyScalar(Math.PI),gen:1+Math.floor(R()*2),age:0,life:80+R()*90});}
  const pa=this.sGeo.attributes.position,ca=this.sGeo.attributes.color,cnt=this.nSeg-start;
  if(cnt>0){pa.addUpdateRange(start*6,cnt*6);ca.addUpdateRange(start*6,cnt*6);pa.needsUpdate=ca.needsUpdate=true;this.sGeo.setDrawRange(0,this.nSeg*2);}
  const tpa=this.tipGeo.attributes.position;this.tips.forEach((t,i)=>tpa.setXYZ(i,t.p.x,t.p.y,t.p.z));tpa.needsUpdate=true;this.tipGeo.setDrawRange(0,this.tips.length);
 }
 update(now){
  if(this.frozen||now-this.lastDraw<(MOBILE?30:14))return;this.lastDraw=now;
  if(now-this.last>=70)this.analyze(now);
  this.draw(now);
 }
 analyze(now){
  this.last=now;this.db.fill(-100);if(this.a.analyser)this.a.analyser.getFloatFrequencyData(this.db);
  // 新しい音が始まったら、彫刻を初めから育てる（同じ言葉・同じつまみなら、同じ育ち方の種）
  const cur=this.a.cur;if(cur&&cur!==this.curId){this.curId=cur;this.resetSculpture(seedOf(cur.item?.t||'')^Math.round(cur.d?.dist*100+cur.d?.hard*1e4+cur.d?.light*1e6||0));}
  const sr=this.a.ctx?.sampleRate||48000,bin=sr/2048;this.history.copyWithin(this.bins,0,this.history.length-this.bins);this.times.copyWithin(1,0,this.rows-1);this.times[0]=now;
  const bands=[0,0,0],counts=[0,0,0];let flux=0;
  for(let x=0;x<this.bins;x++){
   const lo=40*Math.pow(400,x/this.bins),hi=40*Math.pow(400,(x+1)/this.bins),start=Math.max(1,Math.floor(lo/bin)),end=Math.min(1023,Math.ceil(hi/bin));let peak=-100;
   for(let k=start;k<=end;k++)if(Number.isFinite(this.db[k]))peak=Math.max(peak,this.db[k]);
   const v=Math.max(0,Math.min(1,(peak+100)/80));this.history[x]=v;flux+=Math.max(0,v-this.history[this.bins+x]);const band=lo<250?0:lo<2000?1:2;bands[band]+=v;counts[band]++;
  }
  this.levels=bands.map((v,i)=>this.levels[i]*.65+v/Math.max(1,counts[i])*.35);
  // 重心周波数（音の明るさ）
  let ps=0,pf=0;for(let k=2;k*bin<16000;k++){const d=this.db[k];if(!Number.isFinite(d)||d<-95)continue;const p=Math.pow(10,d/10);ps+=p;pf+=p*k*bin;}
  const cen=ps>0?pf/ps:0;this.cen=cen;
  this.samples.fill(0);this.a.wave(this.samples);let e=0;for(let i=0;i<2048;i++)e+=this.samples[i]*this.samples[i];const rms=Math.sqrt(e/2048);
  const f=this.feat;f.L=clamp((20*Math.log10(rms+1e-9)+60)/50,0,1);f.c=cen?clamp(Math.log(cen/150)/Math.log(40),0,1):f.c;f.flux=flux/this.bins;   // 明るさ：150 Hz〜6 kHz を 0〜1 に
  let est=f.L>.05?this.estimateF0(sr):{f0:null,conf:0};if(est.f0&&this.f0Weak(est.f0,sr))est={f0:null,conf:est.conf};
  // 直近 5 回の中央値をとり、0.3 秒ごとのオクターブの行き来で倍音の列がちらつかないようにする
  if(est.f0){const h=f.hist||=[];h.push(est.f0);if(h.length>5)h.shift();const m=[...h].sort((a,b)=>a-b)[h.length>>1];est={f0:m,conf:est.conf};}else if(f.hist&&f.L<=.05)f.hist.length=0;
  // 基準：自己相関で推定した基音。読めない時は 0.6 秒だけ前の値を保ち、それも無ければ最も強い成分を基準にする
  if(est.f0){f.f0=est.f0;f.src='f0';f.hold=now;}else if(f.src==='f0'&&now-f.hold<600){}else if(f.L>.05){let bk=2,bv=-200;for(let k=2;k*bin<8000;k++)if(this.db[k]>bv){bv=this.db[k];bk=k;}f.f0=bk*bin;f.src='peak';}else{f.f0=null;f.src=null;}
  f.conf=est.conf;
  // ゼロ交差をそろえ、音程の変化が波の密度として見えるようにする。
  let offset=0;for(let i=1;i<1024;i++)if(this.samples[i-1]<=0&&this.samples[i]>0){offset=i;break;}
  this.waveHistory.copyWithin(this.waveBins,0,this.waveHistory.length-this.waveBins);
  for(let i=0;i<this.waveBins;i++)this.waveHistory[i]=this.samples[offset+Math.floor(i/(this.waveBins-1)*1023)];
  this.pushHarmonics(sr);this.spawnFlow(Math.random);this.grow();
 }
 orbit(now){
  const dt=this.tPrev?Math.min(.1,(now-this.tPrev)/1000):0;this.tPrev=now;
  if(!this.frozen){this.clock+=dt;if(!this.rm.matches){const k=clamp((now-this.touched-6000)/2500,0,1);this.az+=dt*TAU/90*k*k;}}
  this.phase=this.rm.matches?0:this.az;
  const v=VIEWS[this.view],el=clamp(v.elev+this.pitch,.1,1.3),az=this.az+this.yaw,d=v.dist(this.cam.aspect);let at=v.at;
  if(this.view==='sculpture'){if(this.nSeg)this.scAt.lerp(this.v.copy(this.sc).divideScalar(this.nSeg),.08);at=[this.scAt.x,this.scAt.y,this.scAt.z];}   // 育った形の重心を見る
  this.cam.position.set(at[0]+d*Math.cos(el)*Math.sin(az),at[1]+d*Math.sin(el),at[2]+d*Math.cos(el)*Math.cos(az));this.cam.lookAt(at[0],at[1],at[2]);
 }
 draw(now){
  const stage=document.querySelector('.soundStage'),w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  if(this.view==='heat'){this.drawHeat(w,h);return;}
  if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.r.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();}
  for(const k in this.groups)this.groups[k].visible=k===this.view;
  this.scene.fog=this.view==='sculpture'?this.fog:null;this.orbit(now);
  if(this.view==='waveform'){
   for(let z=0;z<this.waveRows;z++)for(let x=0;x<this.waveBins;x++){const i=z*this.waveBins+x;this.wavePos[i*3]=(x/(this.waveBins-1)-.5)*5.8;this.wavePos[i*3+1]=Math.tanh(this.waveHistory[i]*1.6)*2;/* 大きな音でも枠に収める（小さな振幅ではほぼ比例） */this.wavePos[i*3+2]=1.25-z/(this.waveRows-1)*3.5;}
   this.waveGeo.attributes.position.needsUpdate=true;this.frontGeo.attributes.position.array.set(this.wavePos.subarray(0,this.waveBins*3));this.frontGeo.attributes.position.needsUpdate=true;
   const span=(1024/(this.a.ctx?.sampleRate||48000)*1000).toFixed(1);
   this.caption('横：'+span+' msの波形 ／ 高さ：振幅 ／ いちばん明るい先頭の線が今、うしろへ流れるほど過去。斜め上からゆっくり一周します（ドラッグで止まり、触らなければ戻ります）。');
  }else if(this.view==='flow'){
   this.flowMat.uniforms.uTime.value=this.clock;
   this.caption('粒の流れ：円周＝周波数（40 Hz から一周で 16 kHz・対数。長い目盛り＝100 Hz・1 kHz・10 kHz）／中心から外へ＝時間（外ほど過去・約6秒）／粒の多さ・高さ・明るさ＝その周波数の強さ／色＝周波数（低い琥珀 → 高い青白）。');
  }else if(this.view==='harmonics'){
   const K=this.hK,H=this.hH;
   for(let k=0;k<K;k++){const m=this.hMesh[k].attributes.position.array,l=this.hLine[k].attributes.position.array,z=1.4-k*.4;
    for(let c=0;c<H;c++){const x=-2.8+5.6*c/(H-1),y=this.harm[k*H+c]*1.6;m.set([x,0,z,x,y,z],c*6);l.set([x,y,z],c*3);}
    this.hMesh[k].attributes.position.needsUpdate=true;this.hLine[k].attributes.position.needsUpdate=true;}
   const f=this.feat;this.caption('倍音の層：手前から奥へ第1〜第8倍音（推定した基音の整数倍）／横＝時間（右が今）／高さ＝各倍音のFFTレベル。'+(f.src==='f0'?'いまの基音の推定：約 '+Math.round(f.f0)+' Hz。':f.src==='peak'?'基音が読みとれないので、最も強い成分（約 '+Math.round(f.f0)+' Hz）を基準にしています。':'いまは音がありません。'));
  }else if(this.view==='sculpture'){
   this.caption('鳴っているあいだ、音の帯ごとの強さが流れになって、枝が育ちます。くわしく：分岐の成長 × ABC流れ場（カオス的な流れ）。流れの三つの強さ＝低・中・高域／外形の横・縦＝低域・高域の割合／回転の対称の数＝鳴りはじめの周波数の山の数／伸びる長さ＝音の大きさ／枝分かれ＝音の変化／色＝音の明るさ（重心周波数）。止めると形が残ります。'+(this.nSeg>=this.segCap?'形は育ちきりました（もう一度育てるには、ほかの音を選ぶか同じ音を鳴らしなおします）。':this.nSeg?'':'音を鳴らすと育ちはじめます。'));
  }else{
   for(let i=0;i<this.history.length;i++){const v=this.history[i],c=this.palette[Math.round(v*255)];this.pos[i*3+1]=v*2.1;for(let k=0;k<3;k++)this.colors[i*3+k]=c[k]/255;}
   this.g.attributes.position.needsUpdate=true;this.g.attributes.color.needsUpdate=true;
   this.caption('横：40 Hz → 16 kHz（対数）／高さ・色：FFTレベル／いちばん明るい先頭の列が今、うしろほど過去。斜め上からゆっくり一周します。');
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
