/* © mitsulab. 冒頭「めぐる環」（2026-11-21）。参道の上空に Qualium-Physium ループの環がゆっくりめぐる。
   上半分＝Qualium（青み）：風景から光が昇って受けとられる。下半分＝Physium（茶）：環から光が風景へ戻る（はたらきかけ）。
   添えの 1 行目の前半で上半分、後半で下半分が描かれ、2 行目で環が閉じる。スクロールで環は起き上がり、正面の円になって次の章へ薄れる。
   すべて模式。prefers-reduced-motion では動かさず、閉じた環を一枚だけ描く。元の試作＝scratchpad hero/C（r6）。 */
import * as THREE from 'three';
export function start(hero){
  if(!hero||document.getElementById('heroRing'))return;
  const RM=matchMedia('(prefers-reduced-motion: reduce)').matches, MOB=innerWidth<761;
  const T0=performance.now();
  const cv=document.createElement('canvas');cv.id='heroRing';cv.setAttribute('aria-hidden','true');
  const tone=document.createElement('div');tone.className='hr-tone';tone.setAttribute('aria-hidden','true');
  const mk=(c,ja,en)=>{const d=document.createElement('div');d.className='hr-lbl '+c;d.setAttribute('aria-hidden','true');d.dataset.ja=ja;d.dataset.en=en;return d};
  const lq=mk('hr-q','Qualium ── 認知空間','Qualium — cognitive space'), lp=mk('hr-p','Physium ── 物理空間','Physium — physical space');
  const stick=hero.querySelector('.sd-stick');(stick?stick.after.bind(stick):hero.prepend.bind(hero))(tone,cv,lq,lp);
  const setLang=()=>{const en=document.documentElement.lang==='en';[lq,lp].forEach(d=>d.textContent=en?d.dataset.en:d.dataset.ja)};
  setLang();new MutationObserver(setLang).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  const head=hero.querySelector('.m2-head'), sub=hero.querySelector('.sd-sub');
  // 添えの 1 行目を前半（受けとり）・後半（はたらきかけ）に分け、環の描きに合わせて色をのせる
  if(sub&&!sub.querySelector('.hr-u')){const ns=[...sub.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim());
    if(ns.length===2){ns.forEach((n,i)=>{const s=document.createElement('span');s.className=i?'hr-d':'hr-u';n.replaceWith(s);s.appendChild(n)})}}
  const lit=(c,on)=>{const e=sub&&sub.querySelector(c);if(e)e.classList.toggle('lit',on)};
  const seq=RM?[0,0,0,0,0,0]:[0,0,450,1650,2850,3850];
  if(!RM){setTimeout(()=>lit('.hr-u',true),seq[2]+200);setTimeout(()=>{lit('.hr-u',false);lit('.hr-d',true)},seq[3]+200);setTimeout(()=>lit('.hr-d',false),seq[4]+400)}
  function phase(ms){if(RM)return 1;const a=(ms-seq[2])/1100,b=(ms-seq[3])/1100,c=(ms-seq[4])/900;
    return Math.min(1,Math.max(0,Math.min(a,1))*.47+Math.max(0,Math.min(b,1))*.47+Math.max(0,Math.min(c,1))*.06)}

  const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:!MOB,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,MOB?1.5:1.75));renderer.setClearColor(0,0);
  const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(MOB?52:40,1,.1,200);
  const ring=new THREE.Group();scene.add(ring);
  const N=MOB?1280:3200;
  function pts(n,fn){const g=new THREE.BufferGeometry(),a=new Float32Array(n*3),s=new Float32Array(n);for(let i=0;i<n;i++){a.set(fn(i),i*3);s[i]=Math.random()}
    g.setAttribute('position',new THREE.BufferAttribute(a,3));g.setAttribute('seed',new THREE.BufferAttribute(s,1));return g}
  const common={uT:{value:0},uDraw:{value:0},uPx:{value:1},uFade:{value:1},uBox:{value:new THREE.Vector4()}};
  const ringGeo=pts(N,i=>[i/N,Math.random()-.5,Math.random()-.5]);
  const mkRing=(g,a)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{...common,uG:{value:g},uA:{value:a}},
   vertexShader:`attribute float seed;uniform float uT,uDraw,uPx,uG,uA;varying float vA;varying vec3 vC;
   void main(){float th=fract(position.x+uT*.012*(.6+seed*.8));float ang=1.5708-th*6.28318;float br=.5+.5*sin(uT*.55);
    float rr=1.+position.y*(.035+.02*br)+.012*sin(th*40.+uT);vec3 p=vec3(cos(ang)*rr,sin(ang)*rr,position.z*.05);
    vC=mix(vec3(.82,.60,.38),vec3(.58,.80,.96),smoothstep(-.15,.15,sin(ang)));
    float prog=th<.5?th/.5*.47:.47+(th-.5)/.5*.47;float shown=smoothstep(prog-.01,prog+.01,uDraw*1.0001+(uDraw>.99?1.:0.));
    vA=uA*shown*(.35+.65*seed)*(.75+.25*br);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
    gl_PointSize=uG*uPx*(1.6+seed*2.6)*(3.2/-mv.z);}`,
   fragmentShader:`varying float vA;varying vec3 vC;uniform float uFade;uniform vec4 uBox;void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d);if(r>.25)discard;
    vec2 f=gl_FragCoord.xy;float inb=step(uBox.x,f.x)*step(f.x,uBox.z)*step(uBox.y,f.y)*step(f.y,uBox.w);gl_FragColor=vec4(vC,vA*uFade*exp(-r*14.)*mix(1.,.35,inb));}`});
  ring.add(new THREE.Points(ringGeo,mkRing(1,1)));
  ring.add(new THREE.Points(ringGeo,mkRing(5.5,MOB?.10:.08)));            // 発光（同じ粒を大きく淡く）
  const HN=MOB?240:600;ring.add(new THREE.Points(pts(HN,i=>[i/HN,(Math.random()-.5)*5,(Math.random()-.5)*6]),mkRing(.8,.32))); // 環の周りの薄い粒
  const lineGeo=new THREE.BufferGeometry().setFromPoints(Array.from({length:257},(_,i)=>{const a=i/256*Math.PI*2;return new THREE.Vector3(Math.cos(a),Math.sin(a),0)}));
  const coreMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uDraw:common.uDraw,uO:{value:.18},uFade:common.uFade},
   vertexShader:`varying float a;void main(){a=atan(position.y,position.x);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`varying float a;uniform float uDraw,uO,uFade;void main(){float th=fract((1.5708-a)/6.28318);float prog=th<.5?th/.5*.47:.47+(th-.5)/.5*.47;if(prog>uDraw+.001&&uDraw<.999)discard;
    gl_FragColor=vec4(mix(vec3(.82,.60,.38),vec3(.58,.80,.96),smoothstep(-.15,.15,sin(a))),uO*uFade);}`});
  ring.add(new THREE.LineLoop(lineGeo,coreMat));
  // 受けとり（地 → 環の上半分）／はたらきかけ（環の下半分 → 地）
  const ringM=new THREE.Matrix4(), SN=MOB?6:10, SP=MOB?72:180;
  const gp=(i,n)=>{const u=(i+.5)/n;return new THREE.Vector3((u-.5)*(MOB?3:6)+(Math.random()-.5)*.3,(MOB?-1.6:-1.2)-Math.random()*.6,.6+Math.random())};
  const ins=[],outs=[];for(let i=0;i<SN;i++){ins.push(gp(i,SN));outs.push(gp(i,SN))}
  function streamGeo(arr,up){const n=arr.length*SP,g=new THREE.BufferGeometry(),a=new Float32Array(n*3),b=new Float32Array(n*3),s=new Float32Array(n),k=new Float32Array(n);
    arr.forEach((G,j)=>{for(let m=0;m<SP;m++){const i=j*SP+m,ang=(up?1:-1)*Math.PI*(.15+.7*Math.random());a.set([G.x,G.y,G.z],i*3);b.set([Math.cos(ang),Math.sin(ang),0],i*3);s[i]=Math.random();k[i]=j}});
    g.setAttribute('position',new THREE.BufferAttribute(a,3));g.setAttribute('endp',new THREE.BufferAttribute(b,3));g.setAttribute('seed',new THREE.BufferAttribute(s,1));g.setAttribute('k',new THREE.BufferAttribute(k,1));return g}
  const streamMat=up=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{...common,uOn:{value:0},uM:{value:ringM}},
   vertexShader:`attribute vec3 endp;attribute float seed,k;uniform float uT,uPx,uOn;uniform mat4 uM;varying float vA;
   void main(){float t=fract(uT*(.10+seed*.06)+seed*7.+k*.37);${up?'':'t=1.-t;'}
    vec3 A=position,B=(uM*vec4(endp,1.)).xyz,C=mix(A,B,.5)+vec3((seed-.5)*.9,${up?'.9':'-.3'},.6);vec3 p=mix(mix(A,C,t),mix(C,B,t),t);
    vA=sin(t*3.14159)*uOn*(.45+.55*seed);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uPx*(1.5+seed*2.)*(3./-mv.z);}`,
   fragmentShader:`varying float vA;uniform float uFade;void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d);if(r>.25)discard;gl_FragColor=vec4(${up?'.62,.82,.97':'.86,.64,.42'},vA*uFade*exp(-r*12.));}`});
  const sIn=new THREE.Points(streamGeo(ins,true),streamMat(true)), sOut=new THREE.Points(streamGeo(outs,false),streamMat(false));
  scene.add(sIn,sOut);sIn.frustumCulled=sOut.frustumCulled=false;

  const tilt0=MOB?1.02:1.12;
  function layout(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();common.uPx.value=renderer.getPixelRatio()*(MOB?2:2.6)*(h/900)}
  addEventListener('resize',()=>{layout();if(RM)draw(performance.now())});layout();cam.position.set(0,0,MOB?7.2:6.2);

  let sy=scrollY,sT=scrollY,run=true;addEventListener('scroll',()=>{sT=scrollY;if(RM)draw(performance.now());else if(!run&&scrollY<innerHeight*1.2){run=true;requestAnimationFrame(tick)}},{passive:true});
  const v=new THREE.Vector3();
  function draw(now){
    const t=(now-T0)/1000;sy+=(sT-sy)*(RM?1:.075);
    const H=innerHeight,k=Math.min(1,Math.max(0,sy/(H*(MOB?.45:.6)))),e=k*k*(3-2*k);
    const out=Math.min(1,Math.max(0,(sy-H*(MOB?.47:.62))/(H*(MOB?.33:.45))));            // 次の章に入ると薄れて背景の 3D へ渡す
    const ph=phase(now-T0);common.uT.value=RM?12:t;common.uDraw.value=ph;common.uFade.value=1-out;
    sIn.material.uniforms.uOn.value=(RM?1:Math.min(1,Math.max(0,(now-T0-seq[2])/1200)))*(1-e*.85);
    sOut.material.uniforms.uOn.value=(RM?1:Math.min(1,Math.max(0,(now-T0-seq[3])/1200)))*(1-e*.85);
    const br=RM?0:Math.sin(t*.55)*.03,s0=MOB?1:1.55,s1=MOB?.78:1;
    ring.scale.setScalar((s0+(s1-s0)*e)*(1+br));ring.rotation.x=-tilt0*(1-e);ring.rotation.z=(RM?0:Math.sin(t*.07)*.04)*(1-e);
    ring.position.set(0,(MOB?1.75:1.45)*(1-e),0);coreMat.uniforms.uO.value=.14+.36*e;
    tone.style.opacity=String((1-e)*(1-out));
    if(head){const b=head.getBoundingClientRect(),pr=renderer.getPixelRatio(),on=b.bottom>0&&b.top<H;
      common.uBox.value.set(on?b.left*pr:0,on?(H-b.bottom)*pr:0,on?b.right*pr:0,on?(H-b.top)*pr:0)}
    ring.updateMatrixWorld();ringM.copy(ring.matrixWorld);
    const lo=Math.max(0,(e-.75)/.25)*(1-out),gap=MOB?30:36;
    v.set(0,1,0).applyMatrix4(ring.matrixWorld).project(cam);lq.style.transform=`translate(-50%,${(1-(v.y*.5+.5))*H-gap}px) translateY(-50%)`;lq.style.opacity=lo;
    v.set(0,-1,0).applyMatrix4(ring.matrixWorld).project(cam);lp.style.transform=`translate(-50%,${(1-(v.y*.5+.5))*H+gap}px) translateY(-50%)`;lp.style.opacity=lo;
    cv.style.visibility=out>=1?'hidden':'visible';
    renderer.render(scene,cam);
    return out>=1&&Math.abs(sT-sy)<1;
  }
  function tick(now){const idle=draw(now);if(idle){run=false;return}requestAnimationFrame(tick)}
  if(RM)draw(performance.now());else requestAnimationFrame(tick);
  window.__heroRingReady=performance.now();
}
