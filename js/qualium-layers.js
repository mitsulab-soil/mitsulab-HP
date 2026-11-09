// 2026-11-10 本人「Qualium を層的、レイヤー的なイメージで 3D グラフィックで。情報空間が重なっているように」
// 実際のプレイ画像（Qualium 大宮）を地面に置き、その上に情報空間の層（記録・音・生き物の受けとり方・時間）を重ねる。
// 言葉づかいは layers-bg.js と同じ：布のようにゆれる厚みのある層・低い彩度・何も描かない余白（補集合）。模式図。
// 軽さ：画面に入ってから読み込む・画面の外で止める・スマホは解像度 1・reduced-motion は止めた画。
const INFO=[0xb7c4ad,0x9fb2c2,0xb2abc4,0xc0c0ae];   // 記録・音・生き物の受けとり方・時間
const init=async(box)=>{
 const cv=box.querySelector('canvas');let T;try{T=await import('three');}catch(e){return;}
 const mobile=innerWidth<760,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let r;try{r=new T.WebGLRenderer({canvas:cv,antialias:!mobile,alpha:true,powerPreference:'low-power'});}catch(e){return;}
 r.setPixelRatio(mobile?1:Math.min(devicePixelRatio||1,1.5));
 const sc=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.1,60);
 const tex=await new T.TextureLoader().loadAsync(box.dataset.img);tex.colorSpace=T.SRGBColorSpace;
 const g0=new T.PlaneGeometry(8,5);g0.rotateX(-Math.PI/2);
 sc.add(new T.Mesh(g0,new T.MeshBasicMaterial({map:tex})));
 const seg=mobile?32:64,geo=new T.PlaneGeometry(8.4,5.4,seg,seg);geo.rotateX(-Math.PI/2);
 const vs=`uniform float uT,uI;varying vec2 vP;void main(){vec3 p=position;vP=p.xz;p.y+=sin(p.x*.9+uT*.5+uI)*.05+sin(p.z*1.3-uT*.4+uI)*.04;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
 const fs=`uniform vec3 uC;uniform float uI,uT;varying vec2 vP;
 float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
 void main(){float m=.6*n(vP*.8+uI*4.+uT*.03)+.4*n(vP*1.9-uI);float hole=smoothstep(.35,.5,m);
  float e=1.-smoothstep(.75,1.,max(abs(vP.x)/4.2,abs(vP.y)/2.7));
  float grid=step(.94,fract(vP.x*2.5))+step(.94,fract(vP.y*2.5));
  gl_FragColor=vec4(mix(uC,vec3(1.),.15+.25*grid),(.22+.12*grid)*hole*e);}`;
 const ms=[];INFO.forEach((c,i)=>{for(let k=0;k<2;k++){const m=new T.Mesh(geo,new T.ShaderMaterial({vertexShader:vs,fragmentShader:fs,transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uT:{value:0},uI:{value:i*1.7+k*.15},uC:{value:new T.Color(c)}}}));m.position.y=.55+i*.55+k*.05;sc.add(m);ms.push(m);}});
 const size=()=>{const w=box.clientWidth,h=box.clientHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();};size();addEventListener('resize',size,{passive:true});
 let t=0,last=performance.now(),raf=0,run=false;
 const f=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;if(!reduce)t+=dt;ms.forEach(m=>m.material.uniforms.uT.value=t);
  const a=.5+Math.sin(t*.08)*.12;cam.position.set(Math.sin(a)*7.2,3.2,Math.cos(a)*7.2);cam.lookAt(0,1.1,0);r.render(sc,cam);if(run&&!reduce)raf=requestAnimationFrame(f);};
 const go=on=>{if(on===run)return;run=on;if(on){last=performance.now();raf=requestAnimationFrame(f);}else cancelAnimationFrame(raf);};
 new IntersectionObserver(es=>es.forEach(e=>reduce?f(performance.now()):go(e.isIntersecting&&!document.hidden)),{rootMargin:'80px'}).observe(box);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)go(false);});
 f(performance.now());box.classList.add('on');
};
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);init(e.target);}}),{rootMargin:'300px'});
document.querySelectorAll('.qm-layers').forEach(b=>io.observe(b));
