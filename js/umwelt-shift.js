/* © mitsulab. 2026-11-12 TOP の背景の 3D で、見る人の環世界をずらす四つの体験（模式）。
   1 ひらいた瞬間はミツバチの目（紫外・青・緑の三つの受容器＝ピーク約 344・436・544 nm〔Peitsch et al. 1992〕を、
     人の目の青・緑・赤へずらして写す慣例の偽色。赤は暗く、紫外は画面の青から推した模式で、再現ではない）。押すと切りかわる。
   3 ポートフォリオの層の見出しを過ぎるたび、同じ風景に層が一枚ずつ重なる（色は層の見出しと同じ）。
   （2026-11-13 本人：時刻がずれる・明治の低湿地・地面の下は外した）
   記録は取らない（スクロールの位置は、その場の描画にだけ使う）。描くのはスクロールが止まっている間だけ（共通の loop に従う）。 */
export function install({T,scene,renderer,camera,sunlight,ambientLight,fillLight,world,kick,host}){
  const en=()=>document.documentElement.dataset.lang==='en';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ss=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
  const st={bee:0,beeT:0,layers:0,layersT:0,p:0,shown:0};

  // ---- 画面の小さな札（押すと目が切りかわる・いまの時刻の模式・地面の下の深さ）
  const bar=document.createElement('div');bar.className='us-bar';bar.innerHTML='';
  document.body.append(bar);
  const css=document.createElement('style');css.textContent=`.us-bar{position:fixed;left:12px;bottom:12px;z-index:30;display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:min(360px,calc(100vw - 24px));pointer-events:none;font:400 12px/1.6 var(--serif,serif);color:#dfe8ec;transition:opacity .4s}
.us-bar>*{pointer-events:auto}.us-eye{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid rgba(242,244,239,.4);background:rgba(3,6,15,.62);color:#f2f4ef;font:inherit;font-size:13px;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.us-eye small{font-size:11px;margin-left:1px;vertical-align:1px}.us-eye span{opacity:.5;transition:opacity .3s}.us-eye span.on{opacity:1;color:#a8f2f6}.us-eye.us-in-nav{margin:0 10px 0 auto;flex:0 0 auto;min-height:44px;height:44px}.us-eye[aria-pressed=true]{border-color:#a8f2f6;color:#a8f2f6}.us-time:empty{display:none}.us-time,.us-depth,.us-src{padding:2px 4px;text-shadow:0 1px 2px rgba(0,0,0,.95),0 0 4px rgba(0,0,0,.8)}.us-depth{margin:0;padding:6px 10px 6px 26px}.us-depth li{line-height:1.7}.us-src{font-size:10.5px;color:#b9c6cc;display:none}.us-bar.is-deep .us-src{display:block}
#cgWorldCanvas canvas{transition:opacity .6s}
@media(max-width:349px){.us-eye.us-in-nav{min-width:44px;height:44px;min-height:44px;padding:0 6px;font-size:13px;letter-spacing:-.02em;white-space:nowrap}.us-eye.us-in-nav span:not(.on){opacity:.6}.us-eye small{display:none}}
.us-eye.is-hint{animation:usHint 1.1s ease-out 3}@keyframes usHint{0%{box-shadow:0 0 0 0 rgba(168,242,246,.7)}100%{box-shadow:0 0 0 16px rgba(168,242,246,0)}}
.us-rip{position:fixed;z-index:29;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:1.5px solid #a8f2f6;pointer-events:none;animation:usRip .7s ease-out forwards}@keyframes usRip{to{transform:scale(5);opacity:0}}
@media(prefers-reduced-motion:reduce){.us-eye.is-hint,.us-rip{animation:none}}
body.cg-beyond .tab-panel.active{background:linear-gradient(90deg,rgba(3,6,15,.86),rgba(3,6,15,.8) 70%,rgba(3,6,15,.74))!important}body.cg-beyond #top :is(p,li,dd,h2,h3){text-shadow:0 1px 3px rgba(3,6,15,.9)}
@media(max-width:759px){.us-eye{min-width:44px;padding:0 7px;font-size:12px}.us-eye.us-in-nav{margin:0 0 0 auto}.tab-nav-inner{gap:6px!important}.us-time{transition:opacity .5s}.us-bar:not(.is-new) .us-time{opacity:0}.us-depth{font-size:11px}}`;
  document.head.append(css);

    const eyeLabel=()=>{};






  // ---- 1 ミツバチの目：一度だけ別の板へ描き、色を写しかえる
  let rt=null;const q=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:{tex:{value:null},k:{value:0}},depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D tex;uniform float k;varying vec2 vU;
      void main(){vec3 c=texture2D(tex,vU).rgb;float uv=max(0.,c.b*1.25-c.r*.45-c.g*.15);vec3 b=vec3(c.g*1.05,c.b*1.1,uv*1.6+c.b*.15);gl_FragColor=vec4(mix(c,b,k),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`}));q.frustumCulled=false;const qs=new T.Scene();qs.add(q);const qc=new T.OrthographicCamera(-1,1,1,-1,0,1);

  // ---- 3 層の板（同じ風景に重なる）
  const blob=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,6,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.6,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new T.CanvasTexture(c);return t;})();
  const sheets=LAYERS.map(([,c],i)=>{const m=new T.Mesh(new T.PlaneGeometry(22,16),new T.MeshBasicMaterial({color:new T.Color(c),map:blob,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,fog:false}));m.rotation.x=-Math.PI/2;m.rotation.z=i*.21;m.position.set(-1+Math.sin(i*1.3)*.6,.35+i*.34,-2+Math.cos(i*1.1)*.5);m.visible=false;m.renderOrder=3;world.add(m);return m;});

  // ---- スクロールで進む先を決める（描くのは止まってから）
  const order=()=>{const top=document.getElementById('top');return top&&top.classList.contains('active');};
  function measure(){
    const onTop=order();const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);const p=onTop?Math.min(1,scrollY/max):0;st.p=p;
    const panel=document.querySelector('.tab-panel.active');let n=0;if(panel)panel.querySelectorAll('.pr-sense-h').forEach(h=>{if(h.getBoundingClientRect().top<innerHeight*.6)n++;});st.layersT=Math.min(9,n);
    kick();
  }
  addEventListener('scroll',measure,{passive:true});addEventListener('resize',measure);new MutationObserver(measure).observe(document.getElementById('main'),{attributes:true,attributeFilter:['class'],subtree:true});
  new MutationObserver(()=>{eyeLabel();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});

  // ---- 描くたびに、その場だけ値を差しかえ、描いたら元へ戻す（共通の loop の値を壊さない）
  const orig=renderer.render.bind(renderer);let anim=false;
  renderer.render=function(s,c){
    if(s!==scene)return orig(s,c);
    const nw=performance.now(),dtt=anim?(Math.min(.5,(nw-(st.lt||nw))/1000)||.033):.033;st.lt=nw;const k=reduce?1:1-Math.exp(-dtt/.45);
    st.bee+=(st.beeT-st.bee)*(reduce?1:1-Math.exp(-dtt/(st.soft?.7:st.beeT?.15:.6)));if(Math.abs(st.beeT-st.bee)<.01)st.soft=0;st.layers+=(st.layersT-st.layers)*k;
    anim=Math.abs(st.beeT-st.bee)>.01||Math.abs(st.layersT-st.layers)>.02;
    const L=st.layers;sheets.forEach((m,i)=>{const a=Math.max(0,Math.min(1,L-i));m.visible=a>.01;m.material.opacity=a*.16;});
    const cv=renderer.domElement;if(host.contains(cv)){const o=Math.max(.26,st.bee*.5);const v=o.toFixed(2);if(cv.style.opacity!==v)cv.style.opacity=v;}
    if(st.bee>.01&&!renderer.getRenderTarget()){
      const sz=renderer.getDrawingBufferSize(new T.Vector2());if(!rt||rt.width!==sz.x||rt.height!==sz.y){rt?.dispose();rt=new T.WebGLRenderTarget(sz.x,sz.y,{type:T.HalfFloatType,depthBuffer:true});}
      renderer.setRenderTarget(rt);orig(s,c);renderer.setRenderTarget(null);q.material.uniforms.tex.value=rt.texture;q.material.uniforms.k.value=st.bee;orig(qs,qc);
    }else orig(s,c);
    if(!st.shown&&renderer.getViewport(new T.Vector4()).z>4){st.shown=performance.now();}
  };
  // 2026-11-13 本人：人の目・ミツバチの目を外した（切りかえ・開いたときの蜂の目・背景を押す・波紋）
  measure();
  return {get animating(){return anim;},state:st};
}
