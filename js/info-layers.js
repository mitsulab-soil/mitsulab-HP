/* 背景：参道の地面から、情報の層が一枚ずつ重なる（スクロールで層が増え・ずれ・重なる）
   等高線・点群・走査線・格子・線の網。色は Qualium 式の 5 色。光の玉・紫は使わない。 */
export function start(){
  if(document.getElementById('infoLayers'))return;
  const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv=document.createElement('canvas');cv.id='infoLayers';cv.setAttribute('aria-hidden','true');
  document.body.insertBefore(cv,document.body.firstChild);
  const cx=cv.getContext('2d');
  const sp=()=>innerWidth<761;
  const COL=['143,227,234','163,212,174','236,200,121','141,184,242','236,162,126','143,227,234','163,212,174'];
  const KIND=['contour','points','scan','grid','net','contour','points'];
  let W=0,H=0,DPR=1,N=7;
  // 線の網の点（固定の乱数）
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const NET=[];for(let i=0;i<46;i++)NET.push([rnd()*2-1,rnd()]);
  const PTS=[];for(let i=0;i<220;i++)PTS.push([rnd()*2-1,rnd(),rnd()]);
  function size(){DPR=Math.min(devicePixelRatio||1,sp()?1.5:2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;N=sp()?4:7}
  // 透視：x∈[-1,1]（横）、z∈[0,1]（奥）、y＝地面からの高さ
  function P(x,z,y,cam){const d=0.35+z*3.2;const f=W*(sp()?0.9:0.62);return[W*0.5+x*f*1.05/d*(sp()?0.9:1.25),H*cam.hz+(cam.h-y)*f*0.55/d]}
  let target=0,cur=0,tl=0,cl=0,raf=0;
  function prog(){const m=Math.max(1,document.documentElement.scrollHeight-innerHeight);return Math.min(1,Math.max(0,scrollY/m))}
  function lay(){const ps=document.querySelectorAll('[data-ly]');if(!ps.length)return prog()*N;let v=0,seen=false;ps.forEach(p=>{if(p.getBoundingClientRect().top<innerHeight*0.62){v=+p.dataset.ly;seen=true}});const st=document.getElementById('qStory');if(st&&st.getBoundingClientRect().bottom<innerHeight*0.3)v=7;return Math.min(N,v*N/7)}
  function draw(){
    raf=0;cur+=(target-cur)*(rm?1:0.12);cl+=(tl-cl)*(rm?1:0.06);
    cx.setTransform(DPR,0,0,DPR,0,0);cx.clearRect(0,0,W,H);
    const p=cur,cam={hz:0.40,h:0.62-p*0.22};
    const shown=cl;
    for(let k=0;k<N;k++){
      const a=Math.min(1,Math.max(0,shown-k));if(a<=0)continue;
      const lift=0.05+k*0.075*(0.6+0.4*a)+p*0.02*k;           // 地面から上へ
      const shift=(p*1.6-k*0.22)*0.18*(k%2?1:-1);             // 層ごとにずれる
      const al=a*(sp()?0.28:0.34)*(1-k*0.05);
      const c=COL[k%COL.length];
      cx.lineWidth=1;cx.strokeStyle=`rgba(${c},${al})`;cx.fillStyle=`rgba(${c},${al*1.4})`;
      // 層の縁
      const e=[P(-1+shift,0,lift,cam),P(1+shift,0,lift,cam),P(1+shift,1,lift,cam),P(-1+shift,1,lift,cam)];
      cx.beginPath();cx.moveTo(...e[0]);for(let i=1;i<4;i++)cx.lineTo(...e[i]);cx.closePath();
      cx.save();cx.fillStyle=`rgba(${c},${al*0.10})`;cx.fill();cx.restore();cx.stroke();
      const kind=KIND[k];cx.beginPath();
      if(kind==='contour'){for(let j=1;j<7;j++){for(let i=0;i<=40;i++){const x=-1+i/20,z=j/7+0.05*Math.sin(x*3+j+p*4);const q=P(x+shift,Math.min(1,Math.max(0,z)),lift,cam);i?cx.lineTo(...q):cx.moveTo(...q)}}cx.stroke()}
      else if(kind==='scan'){const off=(p*3)%0.1;for(let j=0;j<14;j++){const z=j/14+off;if(z>1)continue;const q0=P(-1+shift,z,lift,cam),q1=P(1+shift,z,lift,cam);cx.moveTo(...q0);cx.lineTo(...q1)}cx.stroke()}
      else if(kind==='grid'){for(let j=0;j<=8;j++){const x=-1+j/4;cx.moveTo(...P(x+shift,0,lift,cam));cx.lineTo(...P(x+shift,1,lift,cam))}for(let j=0;j<=8;j++){const z=j/8;cx.moveTo(...P(-1+shift,z,lift,cam));cx.lineTo(...P(1+shift,z,lift,cam))}cx.stroke()}
      else if(kind==='points'){const n=sp()?90:PTS.length;for(let i=0;i<n;i++){const t=PTS[i];const q=P(t[0]+shift,t[1],lift+t[2]*0.015,cam);const r=1.1/(0.6+t[1]);cx.fillRect(q[0],q[1],r,r)}}
      else if(kind==='net'){const pts=NET.map(t=>P(t[0]+shift,t[1],lift,cam));for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const dx=NET[i][0]-NET[j][0],dz=NET[i][1]-NET[j][1];if(dx*dx+dz*dz<0.07){cx.moveTo(...pts[i]);cx.lineTo(...pts[j])}}cx.stroke();pts.forEach(q=>cx.fillRect(q[0]-1,q[1]-1,2,2))}
    }
    if((Math.abs(target-cur)>0.0005||Math.abs(tl-cl)>0.005)&&!rm)raf=requestAnimationFrame(draw);
  }
  const kick=()=>{target=prog();tl=lay();if(!raf)raf=requestAnimationFrame(draw)};
  size();target=cur=prog();tl=cl=lay();draw();
  addEventListener('scroll',kick,{passive:true});
  addEventListener('resize',()=>{size();cur=target=prog();cl=tl=lay();draw()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)kick()});
}
