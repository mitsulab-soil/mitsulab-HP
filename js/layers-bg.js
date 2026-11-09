// 2026-11-10 本人「背景は黒でなく、3d グラフィックを」「積層する層として」「環世界の補集合」。
// ページ全体の背景＝地面から上へ重なる七つの感覚の層（Qualium・sound・touch・sight・art・Qualia・research）。
// 布のように揺れる厚みのある層を、目の高さ（層のあいだ）から見上げる。下へ読み進むと層が一枚ずつ現れる。
// 層には何も描かない余白（穴）と、層と層のあいだの空きを意図して残す＝環世界の補集合（無いことで見えるもの）。
// 軽さ：遅れて読み込む・スマホは解像度 1・格子を粗く・タブが隠れたら止める・reduced-motion は止めた画。
const LAYERS=[
 ['Qualium',0xb7c4ad],['sound',0x9fb2c2],['touch',0xc6b79f],['sight',0xb2abc4],['art',0xc2a8a4],['Qualia',0xa8c1bb],['research',0xc0c0ae]];
const cv=document.getElementById('layersBg');
const start=async()=>{
 if(!cv)return;
 let T;try{T=await import('three');}catch(e){return;}
 const mobile=innerWidth<760, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let renderer;try{renderer=new T.WebGLRenderer({canvas:cv,antialias:!mobile,alpha:false,powerPreference:'low-power'});}catch(e){return;}
 renderer.setPixelRatio(mobile?1:Math.min(devicePixelRatio||1,1.5));
 const scene=new T.Scene(),BG=new T.Color(0x405754);scene.background=BG;scene.fog=new T.Fog(0x536b67,6,mobile?26:34);
 const camera=new T.PerspectiveCamera(mobile?62:52,1,.1,80);
 const seg=mobile?40:84, gap=.62, thick=.07, meshes=[];
 const geo=new T.PlaneGeometry(56,56,seg,seg);geo.rotateX(-Math.PI/2);
 const vs=`uniform float uT,uI;varying vec2 vP;varying float vH;
  void main(){vec3 p=position;vP=p.xz;
   float w=sin(p.x*.23+uT*.35+uI)*.16+sin(p.z*.31-uT*.27+uI*1.7)*.12+sin((p.x+p.z)*.11+uT*.18)*.2;
   p.y+=w;vH=w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
 const fs=`uniform vec3 uC,uBg;uniform float uA,uI,uT;varying vec2 vP;varying float vH;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
  float fb(vec2 p){float s=0.,a=.5;for(int k=0;k<4;k++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
  void main(){float d=length(vP)/26.;float edge=1.-smoothstep(.55,1.,d);
   float m=fb(vP*.09+vec2(uI*3.1,uT*.015));
   float hole=smoothstep(.36,.52,m);           // 何も描かない余白（補集合）
   float a=uA*edge*hole*(.16+.16*m);
   vec3 c=mix(uC,vec3(1.),.12+.25*vH);
   gl_FragColor=vec4(mix(uBg,c,.85),a);}`;
 LAYERS.forEach(([name,col],i)=>{for(let k=0;k<2;k++){   // 二枚で一層＝厚みが見える
  const mat=new T.ShaderMaterial({vertexShader:vs,fragmentShader:fs,transparent:true,depthWrite:false,side:T.DoubleSide,
   uniforms:{uT:{value:0},uI:{value:i*1.31+k*.2},uC:{value:new T.Color(col)},uBg:{value:BG},uA:{value:0}}});
  const m=new T.Mesh(geo,mat);m.position.y=.15+i*gap+k*thick;m.userData={i,k};scene.add(m);meshes.push(m);
 }});
 let W=0,H=0;const size=()=>{W=innerWidth;H=innerHeight;renderer.setSize(W,H,false);camera.aspect=W/H;
  camera.fov=W<H?66:52;camera.updateProjectionMatrix();};size();addEventListener('resize',size,{passive:true});
 const prog=()=>{const max=document.documentElement.scrollHeight-innerHeight;return max>0?Math.min(1,scrollY/max):0;};
 let t=0,last=performance.now(),raf=0,running=false;
 const frame=(now)=>{const dt=Math.min(.05,(now-last)/1000);last=now;if(!reduce)t+=dt;
  const p=prog(), n=1+p*(LAYERS.length-1);           // TOP では一枚、読み進むと七枚まで
  meshes.forEach(m=>{const {i}=m.userData;const on=Math.max(0,Math.min(1,n-i));
   m.material.uniforms.uA.value=on*(mobile?.85:1);m.material.uniforms.uT.value=t;});
  const eye=.5+p*(LAYERS.length-1)*gap*.82;            // 目の高さ＝いちばん上の層のすぐ下（層のあいだに立つ）
  camera.position.set(Math.sin(t*.05)*.6,eye,6);camera.lookAt(0,eye+1.1,-6);
  renderer.render(scene,camera);
  if(running&&!reduce)raf=requestAnimationFrame(frame);};
 const run=on=>{if(on===running)return;running=on;if(on){last=performance.now();raf=requestAnimationFrame(frame);}else cancelAnimationFrame(raf);};
 document.addEventListener('visibilitychange',()=>run(!document.hidden&&!reduce));
 if(reduce){frame(performance.now());addEventListener('scroll',()=>requestAnimationFrame(frame),{passive:true});}
 else run(true);
 cv.classList.add('on');
};
const later=()=>('requestIdleCallback' in window)?requestIdleCallback(start,{timeout:2500}):setTimeout(start,1200);
if(document.readyState==='complete')later();else addEventListener('load',later,{once:true});
