import * as T from 'three';
// 同じ再生出力のFFTを時間順に保存。線の軌道は低中高域を使った視覚表現。
export class SoundSpace{
 constructor(canvas,a,b){this.a=a;this.b=b;this.wave=new Float32Array(2048);this.fft=new Uint8Array(1024);this.fft2=new Uint8Array(1024);this.last=0;this.rows=60;this.bins=48;this.history=new Float32Array(this.rows*this.bins);
 this.r=new T.WebGLRenderer({canvas,alpha:true,antialias:true});this.r.setPixelRatio(Math.min(1.5,devicePixelRatio));this.scene=new T.Scene();this.cam=new T.PerspectiveCamera(40,2,.1,100);this.cam.position.set(0,4.8,9);this.cam.lookAt(0,.3,0);
 this.g=new T.BufferGeometry();this.pos=new Float32Array(this.rows*this.bins*3);const col=new Float32Array(this.pos.length),idx=[];
 for(let z=0;z<this.rows;z++)for(let x=0;x<this.bins;x++){const i=z*this.bins+x;this.pos[i*3]=-3.8+x/47*4;this.pos[i*3+2]=-2+z/59*4;const c=new T.Color().setHSL(.48+x/47*.17,.7,.55);col.set([c.r,c.g,c.b],i*3);if(x<47)idx.push(i,i+1);}
 this.g.setAttribute('position',new T.BufferAttribute(this.pos,3));this.g.setAttribute('color',new T.BufferAttribute(col,3));this.g.setIndex(idx);this.scene.add(new T.LineSegments(this.g,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.7})));
 this.cp=new Float32Array(540*3);this.cg=new T.BufferGeometry();this.cg.setAttribute('position',new T.BufferAttribute(this.cp,3));this.scene.add(new T.Line(this.cg,new T.LineBasicMaterial({color:0xb3e6f0,transparent:true,opacity:.9})));this.levels=[0,0,0];}
 update(now){if(now-this.last<80)return;this.last=now;const w=this.r.domElement.clientWidth,h=this.r.domElement.clientHeight;if(!w||!h)return;if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.r.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();}
 this.fft.fill(0);this.fft2.fill(0);if(this.a.playing)this.a.analyser?.getByteFrequencyData(this.fft);if(this.b.playing)this.b.analyser?.getByteFrequencyData(this.fft2);const sr=this.a.ctx?.sampleRate||48000;
 this.history.copyWithin(this.bins,0,this.history.length-this.bins);const bands=[0,0,0],counts=[0,0,0];
 for(let x=0;x<this.bins;x++){const hz=40*Math.pow(400,x/47),k=Math.min(1023,Math.round(hz/(sr/2048)));const v=Math.min(1,(this.fft[k]+this.fft2[k])/255);this.history[x]=v;const band=hz<250?0:hz<2000?1:2;bands[band]+=v;counts[band]++;}
 for(let i=0;i<this.history.length;i++)this.pos[i*3+1]=this.history[i]*1.8;this.g.attributes.position.needsUpdate=true;
 this.levels=bands.map((v,i)=>this.levels[i]*.6+(v/counts[i])*.4);const [lo,mid,hi]=this.levels,t=now/1000,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(let i=0;i<540;i++){const u=i/539*Math.PI*8,phase=rm?0:t*.23;this.cp[i*3]=2+Math.sin(u*(2+lo)+phase)*(.4+lo);this.cp[i*3+1]=.5+Math.sin(u*(3+mid))*(.35+mid);this.cp[i*3+2]=Math.cos(u*(4+hi)+phase)*(.4+hi);}
 this.cg.attributes.position.needsUpdate=true;this.r.render(this.scene,this.cam);
 }
}
