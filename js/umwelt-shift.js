/* © mitsulab. 2026-11-12 TOP の背景の 3D で、見る人の環世界をずらす四つの体験（模式）。
   1 ひらいた瞬間はミツバチの目（紫外・青・緑の三つの受容器＝ピーク約 344・436・544 nm〔Peitsch et al. 1992〕を、
     人の目の青・緑・赤へずらして写す慣例の偽色。赤は暗く、紫外は画面の青から推した模式で、再現ではない）。押すと切りかわる。
   2 読み進めると時刻がずれる：朝 → いまの太陽（端末の時計と NOAA の近似式・大宮 北緯 35.9165 東経 139.6305 固定。位置情報は使わない）
     → 季節（同じ時刻で一年をめぐる）→ 明治の低湿地（国土地理院「明治期の低湿地データ」タイル z15・氷川神社のまわり約 3.6 km 四方）。
   3 ポートフォリオの層の見出しを過ぎるたび、同じ風景に層が一枚ずつ重なる（色は層の見出しと同じ）。
   4 ページの一番下で地面の下へ：落葉層・菌根菌の菌糸・ミミズ・根・地下水。深さの目安は出典つき（下の DEPTH）。大きさは模式。
   記録は取らない（スクロールの位置は、その場の描画にだけ使う）。描くのはスクロールが止まっている間だけ（共通の loop に従う）。 */
const LAT=35.9165, LON=139.6305;
const LAYERS=[['Qualium','#b7c4ad'],['sound','#9fb2c2'],['touch','#c6b79f'],['sight','#b2abc4'],['time','#a8c1bb'],['scale','#c2a9c0'],['relation','#c4c19e'],['culture','#c2a8a4'],['research','#b9bdbc']];
// 深さ（m）。出典：落葉層＝数 cm（森林の O 層の一般的な厚さ）／菌根菌の菌糸＝落葉の下の腐植・表層 0〜20 cm に多い（Lindahl et al. 2007, New Phytologist）
// ミミズ＝多くは表層 0〜30 cm、深く掘る種（Lumbricus terrestris）の坑道は 1〜2 m（Edwards & Bohlen 1996, Biology and Ecology of Earthworms）
// 根＝温帯の森では根の約 6 割が上 30 cm（Jackson et al. 1996, Oecologia）、温帯落葉樹の最大の根の深さは平均 約 2.9 m（Canadell et al. 1996, Oecologia）
// 地下水＝深さは地点と季節で違う（ここでは根の下に置いた模式）
const DEPTH=[{d:.05,ja:'落葉層　数 cm（目安）',en:'Leaf litter · a few cm (rough guide)'},{d:.2,ja:'菌根菌の菌糸　0〜20 cm に多い',en:'Mycorrhizal hyphae · mostly 0–20 cm'},{d:.3,ja:'ミミズ・根の多く　〜30 cm',en:'Earthworms, most roots · ~30 cm'},{d:2,ja:'深く掘るミミズの坑道　1〜2 m',en:'Deep earthworm burrows · 1–2 m'},{d:2.9,ja:'根の最も深い所　温帯の落葉樹林の平均 約 2.9 m',en:'Deepest roots · ~2.9 m (temperate deciduous forest average)'},{d:3.6,ja:'地下水　深さは場所で違う',en:'Groundwater · depth varies by site'}];
const SRC_JA='出典：Peitsch 1992／NOAA／国土地理院／Lindahl 2007／Edwards & Bohlen 1996／Jackson 1996／Canadell 1996。色・形・大きさは模式。';
const SRC_EN='Sources: Peitsch 1992 / NOAA / GSI Japan / Lindahl 2007 / Edwards & Bohlen 1996 / Jackson 1996 / Canadell 1996. Colours, shapes and sizes are models.';
const DS=1.4;   // 1 m を 3D の何単位で描くか（模式）

// NOAA の近似式（General Solar Position）。戻り値は高度・方位（度、方位は北から東回り）
function sunPos(date){
  const doy=Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-Date.UTC(date.getUTCFullYear(),0,0))/864e5);
  const hr=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
  const g=2*Math.PI/365*(doy-1+(hr-12)/24);
  const eqt=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const tst=hr*60+eqt+4*LON, ha=(tst/4-180)*Math.PI/180, la=LAT*Math.PI/180;
  const cz=Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(ha), z=Math.acos(Math.max(-1,Math.min(1,cz)));
  let az=Math.acos(Math.max(-1,Math.min(1,(Math.sin(la)*Math.cos(z)-Math.sin(dec))/(Math.cos(la)*Math.sin(z)||1e-6))))*180/Math.PI;
  az=ha>0?(az+180)%360:(540-az)%360;
  return {alt:90-z*180/Math.PI, az};
}

export function install({T,scene,renderer,camera,sunlight,ambientLight,fillLight,world,kick,host}){
  const en=()=>document.documentElement.dataset.lang==='en';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
  const st={bee:1,beeT:1,meiji:0,meijiT:0,dive:0,diveT:0,layers:0,layersT:0,p:0,shown:0};

  // ---- 画面の小さな札（押すと目が切りかわる・いまの時刻の模式・地面の下の深さ）
  const bar=document.createElement('div');bar.className='us-bar';bar.innerHTML='<button type="button" class="us-eye" aria-pressed="true"></button><span class="us-time" aria-live="off"></span><ol class="us-depth" hidden></ol><small class="us-src"></small>';
  document.body.append(bar);
  const css=document.createElement('style');css.textContent=`.us-bar{position:fixed;left:12px;bottom:12px;z-index:30;display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:min(360px,calc(100vw - 24px));pointer-events:none;font:400 12px/1.6 var(--serif,serif);color:#dfe8ec;transition:opacity .4s}
.us-bar>*{pointer-events:auto}.us-eye{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid rgba(242,244,239,.4);background:rgba(3,6,15,.62);color:#f2f4ef;font:inherit;font-size:13px;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.us-eye[aria-pressed=true]{border-color:#a8f2f6;color:#a8f2f6}.us-time:empty{display:none}.us-time,.us-depth,.us-src{background:rgba(3,6,15,.55);border-radius:6px;padding:3px 10px}.us-depth{margin:0;padding:6px 10px 6px 26px}.us-depth li{line-height:1.7}.us-src{font-size:10.5px;color:#b9c6cc;display:none}.us-bar.is-deep .us-src{display:block}
#cgWorldCanvas canvas{transition:opacity .6s}
.us-eye.is-hint{animation:usHint 1.1s ease-out 3}@keyframes usHint{0%{box-shadow:0 0 0 0 rgba(168,242,246,.7)}100%{box-shadow:0 0 0 16px rgba(168,242,246,0)}}
.us-rip{position:fixed;z-index:29;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:1.5px solid #a8f2f6;pointer-events:none;animation:usRip .7s ease-out forwards}@keyframes usRip{to{transform:scale(5);opacity:0}}
@media(prefers-reduced-motion:reduce){.us-eye.is-hint,.us-rip{animation:none}}
@media(max-width:759px){.us-bar{left:4px;bottom:4px}.us-eye{width:44px;padding:0;font-size:14px;background:rgba(3,6,15,.45);opacity:.85}.us-time{transition:opacity .5s}.us-bar:not(.is-new) .us-time{opacity:0}.us-depth{font-size:11px}}`;
  document.head.append(css);
  const eye=bar.querySelector('.us-eye'),tl=bar.querySelector('.us-time'),dl=bar.querySelector('.us-depth'),src=bar.querySelector('.us-src');
  const eyeLabel=()=>{const b=st.beeT>.5,sm=innerWidth<760,full=en()?(b?'Honeybee eyes (model)':'Human eyes'):(b?'ミツバチの目（模式）':'人の目');eye.setAttribute('aria-pressed',String(b));eye.setAttribute('aria-label',full);eye.textContent=sm?(en()?(b?'Bee':'Hu'):(b?'蜂':'人')):full+' ⇄';};
  const toggle=()=>{st.touched=1;st.beeT=st.beeT>.5?0:1;eyeLabel();kick();};
  eye.addEventListener('click',toggle);
  // 背景の 3D そのもの（文字・ボタン・図のない所）を押しても切りかわる
  document.addEventListener('click',e=>{if(e.defaultPrevented||!document.getElementById('top')?.classList.contains('active'))return;if(e.target.closest('a,button,input,select,textarea,summary,details,label,[role=button],[role=dialog],[role=tablist],[role=tab],[role=img],[tabindex]:not([tabindex="-1"]),p,h1,h2,h3,h4,li,figure,svg,img,video,canvas:not(#cgWorldCanvas canvas),nav,dialog,.us-bar'))return;if(getSelection&&String(getSelection()).length)return;const r=document.createElement('span');r.className='us-rip';r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';document.body.append(r);setTimeout(()=>r.remove(),800);toggle();});
  eyeLabel();

  // ---- 1 ミツバチの目：一度だけ別の板へ描き、色を写しかえる
  let rt=null;const q=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:{tex:{value:null},k:{value:0}},depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D tex;uniform float k;varying vec2 vU;
      void main(){vec3 c=texture2D(tex,vU).rgb;float uv=max(0.,c.b*1.25-c.r*.45-c.g*.15);vec3 b=vec3(c.g*1.05,c.b*1.1,uv*1.6+c.b*.15);gl_FragColor=vec4(mix(c,b,k),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`}));q.frustumCulled=false;const qs=new T.Scene();qs.add(q);const qc=new T.OrthographicCamera(-1,1,1,-1,0,1);

  // ---- 2 明治の低湿地（地面に写す）
  const mTex=new T.TextureLoader().load('img/common-ground/omiya_meiji_lowland.webp',()=>kick());mTex.colorSpace=T.SRGBColorSpace;
  const mMat=new T.ShaderMaterial({uniforms:{tex:{value:mTex},k:{value:0}},transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tex;uniform float k;varying vec2 vU;void main(){vec4 m=texture2D(tex,vU);if(m.a<.05||k<.01)discard;
      float river=smoothstep(.15,.4,m.b-m.r);vec3 col=mix(vec3(.30,.40,.24),vec3(.10,.22,.30),river);gl_FragColor=vec4(col,m.a*k*mix(.55,.85,river));
      #include <colorspace_fragment>
      }`});
  const meiji=new T.Mesh(new T.PlaneGeometry(48,48),mMat);meiji.rotation.x=-Math.PI/2;meiji.position.set(-2,.09,-3);meiji.renderOrder=2;meiji.visible=false;world.add(meiji);

  // ---- 3 層の板（同じ風景に重なる）
  const blob=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,6,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.6,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);return t;})();
  const sheets=LAYERS.map(([,c],i)=>{const m=new T.Mesh(new T.PlaneGeometry(22,16),new T.MeshBasicMaterial({color:new T.Color(c),map:blob,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,fog:false}));m.rotation.x=-Math.PI/2;m.rotation.z=i*.21;m.position.set(-1+Math.sin(i*1.3)*.6,.35+i*.34,-2+Math.cos(i*1.1)*.5);m.visible=false;m.renderOrder=3;world.add(m);return m;});

  // ---- 4 地面の下
  const under=new T.Group();under.visible=false;world.add(under);
  const soil=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshBasicMaterial({color:0x2a1f15,side:T.BackSide}));soil.rotation.x=-Math.PI/2;soil.position.y=-.01;under.add(soil);
  const litter=new T.Mesh(new T.BoxGeometry(30,DEPTH[0].d*DS,20),new T.MeshBasicMaterial({color:0x6b4f2e,transparent:true,opacity:.55,depthWrite:false}));litter.position.set(-2,-DEPTH[0].d*DS/2,-3);under.add(litter);
  const R=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647;})();
  const rootM=new T.MeshBasicMaterial({color:0x8a6a48}),hyM=new T.LineBasicMaterial({color:0xe8e2cf,transparent:true,opacity:.55}),wormM=new T.MeshBasicMaterial({color:0xb07a6a});
  const tubes=[];
  for(let i=0;i<14;i++){const deep=i<3,pts=[],a=R()*Math.PI*2,reach=deep?.6:1.5+R()*2.5,dep=deep?2.9:.08+R()*.25;for(let k=0;k<=6;k++){const f=k/6;pts.push(new T.Vector3(-2+Math.cos(a)*reach*f+(R()-.5)*.3,-(deep?dep*f:dep*Math.sqrt(f))*DS,-3+Math.sin(a)*reach*f+(R()-.5)*.3));}tubes.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,deep?.07:.045,5,false));}
  tubes.forEach(g=>under.add(new T.Mesh(g,rootM)));
  {const p=[];for(let i=0;i<260;i++){const x=-2+(R()-.5)*8,z=-3+(R()-.5)*6,y=-R()*DEPTH[1].d*DS;p.push(x,y,z,x+(R()-.5)*.5,y-(R()-.5)*.12,z+(R()-.5)*.5);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));under.add(new T.LineSegments(g,hyM));}
  for(let i=0;i<7;i++){const deep=i<2,x=-2+(R()-.5)*6,z=-3+(R()-.5)*4,y=-(deep?1.2+R()*.8:.08+R()*.2)*DS,pts=[];for(let k=0;k<5;k++)pts.push(new T.Vector3(x+k*.05,y+Math.sin(k)*.03,z+Math.cos(k*1.3)*.04));under.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),10,.018,5,false),wormM));
    if(deep){const b=new T.Mesh(new T.CylinderGeometry(.03,.03,y*-1,5,1,true),new T.MeshBasicMaterial({color:0x4a3626}));b.position.set(x,y/2,z);under.add(b);}}
  const gw=new T.Mesh(new T.PlaneGeometry(40,30),new T.MeshBasicMaterial({color:0x3f7f9a,transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false,fog:false}));gw.rotation.x=-Math.PI/2;gw.position.set(-2,-DEPTH[5].d*DS,-3);under.add(gw);
  dl.innerHTML=DEPTH.map(d=>'<li></li>').join('');
  const depthText=()=>{[...dl.children].forEach((li,i)=>li.textContent=en()?DEPTH[i].en:DEPTH[i].ja);src.textContent=en()?SRC_EN:SRC_JA;};depthText();

  // ---- スクロールで進む先を決める（描くのは止まってから）
  const order=()=>{const top=document.getElementById('top');return top&&top.classList.contains('active');};
  function measure(){
    const onTop=order();const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);const p=onTop?Math.min(1,scrollY/max):0;st.p=p;
    st.meijiT=onTop?ss(.66,.74,p)*(1-ss(.84,.88,p)):0;
    const uu=document.getElementById('usUnder');if(uu){if(uu.hidden===onTop)uu.hidden=!onTop;}const ur=uu&&onTop?uu.getBoundingClientRect():null;st.diveT=ur?ss(.15,.75,(innerHeight-ur.top)/ur.height):0;
    const panel=document.querySelector('.tab-panel.active');let n=0;if(panel)panel.querySelectorAll('.pr-sense-h').forEach(h=>{if(h.getBoundingClientRect().top<innerHeight*.6)n++;});st.layersT=Math.min(9,n);
    kick();
  }
  addEventListener('scroll',measure,{passive:true});addEventListener('resize',measure);new MutationObserver(measure).observe(document.getElementById('main'),{attributes:true,attributeFilter:['class'],subtree:true});
  new MutationObserver(()=>{eyeLabel();depthText();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});

  const tmpC=new T.Color(),warm=new T.Color(0xffb27a),day=new T.Color(0xfff1dc),night=new T.Color(0x6f86b8),soilBg=new T.Color(0x3b2c1f);
  const sunDir=(alt,az)=>{const a=alt*Math.PI/180,b=az*Math.PI/180;return new T.Vector3(Math.sin(b)*Math.cos(a),Math.sin(a),-Math.cos(b)*Math.cos(a)).multiplyScalar(20);};
  let label='';
  function timeState(){
    const p=st.p,now=new Date();
    if(st.dive>.02)return null;
    if(p<.04)return null;   // 冒頭はいつもの光
    if(p<.2)return {alt:8,az:100,lab:en()?'Morning light (model)':'朝の光（模式）'};
    if(p<.44){const s=sunPos(now),hm=now.toLocaleTimeString(en()?'en-GB':'ja-JP',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'});return {alt:s.alt,az:s.az,lab:en()?`The sun now over Omiya · ${hm} · ${Math.round(s.alt)}° up`:`いまの大宮の太陽　${hm}　高さ ${Math.round(s.alt)}°`};}
    if(p<.66){const f=(p-.44)/.22,d=new Date(now.getTime()+Math.round(f*365)*864e5),s=sunPos(d),m=d.toLocaleDateString(en()?'en-GB':'ja-JP',{month:'long',timeZone:'Asia/Tokyo'});return {alt:s.alt,az:s.az,season:d,lab:en()?`Same hour in ${m} · ${Math.round(s.alt)}° up`:`同じ時刻の ${m}　高さ ${Math.round(s.alt)}°`};}
    return {lab:en()?'Meiji-era lowlands around Hikawa (GSI data, ~1880s)':'明治の低湿地　氷川のまわり（国土地理院・原典は明治 13〜19 年の迅速測図）',keep:true};
  }

  // ---- 描くたびに、その場だけ値を差しかえ、描いたら元へ戻す（共通の loop の値を壊さない）
  const orig=renderer.render.bind(renderer);let anim=false;
  renderer.render=function(s,c){
    if(s!==scene)return orig(s,c);
    const nw=performance.now(),dtt=anim?(Math.min(.5,(nw-(st.lt||nw))/1000)||.033):.033;st.lt=nw;const k=reduce?1:1-Math.exp(-dtt/.45);
    st.bee+=(st.beeT-st.bee)*(reduce?1:1-Math.exp(-dtt/.22));st.meiji+=(st.meijiT-st.meiji)*k;st.dive+=(st.diveT-st.dive)*k;st.layers+=(st.layersT-st.layers)*k;
    anim=Math.abs(st.beeT-st.bee)>.01||Math.abs(st.meijiT-st.meiji)>.01||Math.abs(st.diveT-st.dive)>.005||Math.abs(st.layersT-st.layers)>.02;
    const save={sp:sunlight.position.clone(),sc:sunlight.color.clone(),si:sunlight.intensity,ai:ambientLight.intensity,ac:ambientLight.color.clone(),fi:fillLight.intensity,bg:scene.background.clone(),fc:scene.fog.color.clone(),fn:scene.fog.near,ff:scene.fog.far,cp:c.position.clone(),cq:c.quaternion.clone()};
    const ts=timeState();
    if(ts&&!ts.keep){const up=Math.max(0,Math.sin(ts.alt*Math.PI/180));sunlight.position.copy(sunDir(Math.max(ts.alt,2),ts.az));tmpC.copy(warm).lerp(day,ss(5,35,ts.alt));if(ts.alt<0)tmpC.copy(night);sunlight.color.copy(tmpC);sunlight.intensity=save.si*(ts.alt<0?.15:.35+.9*up);ambientLight.intensity=save.ai*(ts.alt<0?.35:.6+.5*up);
      if(ts.season){const mo=ts.season.getMonth();const w=mo<=1||mo===11?1:0,au=mo>=9&&mo<=10?1:0;ambientLight.color.copy(save.ac).lerp(new T.Color(w?0xdfe6ee:au?0xe7c79a:0xc4d9e2),.6);}}
    if(ts?.lab!==label){label=ts?.lab||'';tl.textContent=label;bar.classList.add('is-new');clearTimeout(st.nt);st.nt=setTimeout(()=>bar.classList.remove('is-new'),2600);}
    meiji.visible=st.meiji>.01;mMat.uniforms.k.value=st.meiji;
    const L=st.layers;sheets.forEach((m,i)=>{const a=Math.max(0,Math.min(1,L-i));m.visible=a>.01&&st.dive<.5;m.material.opacity=a*.16;});
    under.visible=st.dive>.01;
    if(st.dive>.01){const off=st.dive*(DEPTH[5].d*DS+.6);const look=(c.userData.look||new T.Vector3(0,1,-2)).clone();c.position.y-=off+.5*st.dive;c.position.lerp(new T.Vector3(3.2,c.position.y,4.2),st.dive*.6);look.y-=off;look.lerp(new T.Vector3(-2,look.y,-3),st.dive);c.lookAt(look);
      scene.background.lerp(soilBg,st.dive);scene.fog.color.lerp(soilBg,st.dive);scene.fog.near=T.MathUtils.lerp(save.fn,2,st.dive);scene.fog.far=T.MathUtils.lerp(save.ff,26,st.dive);sunlight.intensity*=1-st.dive*.8;}
    const deep=st.dive>.5;if(dl.hidden===deep)dl.hidden=!deep;bar.classList.toggle('is-deep',deep);if(deep&&tl.textContent){tl.textContent='';label='';}
    const cv=renderer.domElement;if(host.contains(cv)){const o=Math.max(.26,st.bee*.6,st.meiji*.55,st.dive*.75,ts&&!ts.keep?.34:0);const v=o.toFixed(2);if(cv.style.opacity!==v)cv.style.opacity=v;}
    if(st.bee>.01&&!renderer.getRenderTarget()){
      const sz=renderer.getDrawingBufferSize(new T.Vector2());if(!rt||rt.width!==sz.x||rt.height!==sz.y){rt?.dispose();rt=new T.WebGLRenderTarget(sz.x,sz.y,{type:T.HalfFloatType,depthBuffer:true});}
      renderer.setRenderTarget(rt);orig(s,c);renderer.setRenderTarget(null);q.material.uniforms.tex.value=rt.texture;q.material.uniforms.k.value=st.bee;orig(qs,qc);
    }else orig(s,c);
    sunlight.position.copy(save.sp);sunlight.color.copy(save.sc);sunlight.intensity=save.si;ambientLight.intensity=save.ai;ambientLight.color.copy(save.ac);fillLight.intensity=save.fi;scene.background.copy(save.bg);scene.fog.color.copy(save.fc);scene.fog.near=save.fn;scene.fog.far=save.ff;c.position.copy(save.cp);c.quaternion.copy(save.cq);
    if(!st.shown&&renderer.getViewport(new T.Vector4()).z>4){st.shown=performance.now();setTimeout(()=>{if(st.beeT===1&&!st.touched){st.beeT=0;eyeLabel();kick();eye.classList.add('is-hint');setTimeout(()=>eye.classList.remove('is-hint'),3600);}},reduce?1500:1000);}
  };
  eye.addEventListener('click',()=>{st.touched=1;});
  measure();
  return {get animating(){return anim;},state:st,sunPos};
}
