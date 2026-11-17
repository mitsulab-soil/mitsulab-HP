/* 2026-11-18 Qualia の切りかえ（共通部品）：一つのアプリの中で、まとめた体験を一手で切りかえる。
   使い方：<script src="kit/modes.js" data-modes='[["sight","生き物",""],["machine","機械","machine/"]]' defer></script>
   一つめは このページそのもの。ほかは押したときに初めて読みこむ（起動を重くしない）。?m=machine で直接ひらく。
   © mitsulab. All rights reserved. */
(function(){
  var me=document.currentScript, modes=JSON.parse(me.getAttribute('data-modes')||'[]');
  var hide=me.getAttribute('data-hide')||'';
  if(window.top!==window||modes.length<2)return;
  var css='#qm{position:fixed;left:calc(8px + env(safe-area-inset-left));top:42%;transform:translateY(-50%);z-index:2147483600;display:flex;flex-direction:column;gap:2px;padding:3px;border-radius:999px;background:rgba(7,13,26,.72);border:1px solid rgba(195,204,224,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:"Hiragino Mincho ProN","Yu Mincho",serif}'+
  '#qm button{white-space:nowrap;width:112px;min-height:44px;padding:0 14px;border:0;border-radius:999px;background:transparent;color:#c9d3e2;font:inherit;font-size:14px;letter-spacing:.08em;cursor:pointer;transition:background .2s,color .2s;-webkit-tap-highlight-color:transparent}'+
  '#qm button[aria-pressed=true]{background:#5cc8e0;color:#04121a}#qm button:focus-visible{outline:2px solid #9bdcf0;outline-offset:2px}'+
  '.qmf{position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483500;background:#03060f;visibility:hidden;pointer-events:none}.qmf.on{visibility:visible;pointer-events:auto}'+
  '#qml{position:fixed;inset:0;z-index:2147483550;display:none;place-items:center;background:#03060f;color:#c9d3e2;font-family:"Hiragino Mincho ProN",serif;font-size:14px;letter-spacing:.2em;pointer-events:none}#qml.on{display:grid}#qml i{display:block;width:40px;height:40px;margin:0 auto 12px;border:2px solid rgba(92,200,224,.25);border-top-color:#5cc8e0;border-radius:50%;animation:qmr .8s linear infinite}@keyframes qmr{to{transform:rotate(1turn)}}'+
  '@media (max-width:420px){#qm{left:4px;background:rgba(7,13,26,.5)}#qm button{width:66px;padding:0 2px;font-size:11px;letter-spacing:0}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var bar=document.createElement('nav');bar.id='qm';bar.setAttribute('aria-label','切りかえ');
  var frames={},cur=modes[0][0];
  var ld=document.createElement('div');ld.id='qml';ld.innerHTML='<div><i></i>ひらいています</div>';
  function frame(m){
    if(frames[m[0]])return frames[m[0]];
    var f=document.createElement('iframe');f.className='qmf';f.title=m[1];f.allow='autoplay; microphone; accelerometer; gyroscope';
    ld.classList.add('on');f.src=m[2];f.addEventListener('load',function(){setTimeout(function(){ld.classList.remove('on')},150);try{var d=f.contentDocument,s=d.createElement('style');
      s.textContent=(hide?hide+'{display:none!important}':'')+'.qx-home,.back{display:none!important}';d.head.appendChild(s);run(f.contentWindow,f.classList.contains('on')||cur===m[0]);}catch(e){}});
    document.body.appendChild(f);return frames[m[0]]=f;
  }
  /* 見えていない画面の描画を止める（二つの 3D を同時に回さない＝重くしない） */
  function gate(w){if(!w||w.__qmGate)return;var raf=w.requestAnimationFrame.bind(w),q=[];w.__qmGate={off:false,resume:function(){var a=q;q=[];a.forEach(function(c){raf(c)})}};
    w.requestAnimationFrame=function(c){if(w.__qmGate.off){q.push(c);return 0}return raf(c)}}
  function run(w,on){try{gate(w);w.__qmGate.off=!on;if(on)w.__qmGate.resume()}catch(e){}}
  gate(window);
  function pause(f,on){run(f.contentWindow,on);try{var w=f.contentWindow;w.document.querySelectorAll('audio,video').forEach(function(a){on?0:a.pause()});
    if(w.Howler)w.Howler.mute(!on);}catch(e){}}
  function go(id,push){
    var m=modes.filter(function(x){return x[0]===id})[0]||modes[0];cur=m[0];
    [].forEach.call(bar.children,function(b){b.setAttribute('aria-pressed',b.dataset.m===cur)});
    run(window,!m[2]);Object.keys(frames).forEach(function(k){var on=k===cur;frames[k].classList.toggle('on',on);pause(frames[k],on)});
    if(m[2]){var f=frame(m);f.classList.add('on')}else ld.classList.remove('on');
    if(push!==false){var u=new URL(location.href);if(m[2])u.searchParams.set('m',cur);else u.searchParams.delete('m');history.replaceState(null,'',u)}
    try{dispatchEvent(new CustomEvent('qualia-mode',{detail:cur}))}catch(e){}
  }
  modes.forEach(function(m){var b=document.createElement('button');b.type='button';b.dataset.m=m[0];b.textContent=m[1];
    b.onclick=function(){go(m[0])};
    /* 指を近づけた時点で先に読みはじめ、押したときの待ちを減らす */
    if(m[2])b.addEventListener('pointerenter',function(){var l=document.createElement('link');l.rel='prefetch';l.href=m[2];document.head.appendChild(l)},{once:true});
    bar.appendChild(b)});
  function boot(){document.body.appendChild(ld);document.body.appendChild(bar);var q=new URLSearchParams(location.search).get('m');go(q||cur,false)}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',boot):boot();
})();
