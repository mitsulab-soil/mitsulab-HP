/* 2026-11-18 Qualia/scale：大きさ（縦）と時間（横）の二つの軸を一画面に。
   横の帯をなぞると時間の速さが変わる（真ん中＝いまの速さ・左＝遅く・右＝速く）。真ん中に戻すと大きさの画面へ。
   © mitsulab. All rights reserved. */
(function(){
  if(window.top!==window&&!(function(){try{return parent.__hubModes}catch(e){}})())return;
  var MIN=-10,MAX=13; /* time の範囲（10 のべき乗・1 秒あたり） */
  var css='#ax2{position:fixed;left:calc(240px + env(safe-area-inset-left));right:calc(240px + env(safe-area-inset-right));top:calc(62px + env(safe-area-inset-top));height:44px;z-index:2147483601;touch-action:none;cursor:ew-resize;user-select:none;-webkit-user-select:none;font-family:"Hiragino Mincho ProN","Yu Mincho",serif}'+
  '#ax2 .ln{position:absolute;left:0;right:0;top:20px;height:4px;border-radius:2px;background:linear-gradient(90deg,rgba(195,204,224,.15),rgba(195,204,224,.55) 50%,rgba(195,204,224,.15))}'+
  '#ax2 .z{position:absolute;left:50%;top:14px;width:1px;height:16px;background:rgba(195,204,224,.6)}'+
  '#ax2 b{position:absolute;top:10px;width:24px;height:24px;margin-left:-12px;border-radius:50%;background:#5cc8e0;box-shadow:0 0 0 4px rgba(92,200,224,.22)}'+
  '#ax2 small{position:absolute;top:-6px;white-space:nowrap;font-size:14px;font-weight:600;color:#c9d3e2;letter-spacing:.08em;text-shadow:0 0 4px #000}#ax2 .l{left:0}#ax2 .r{right:0}#ax2 .c{left:50%;transform:translateX(-50%)}'+
  '#ax2.low{top:auto;bottom:calc(14px + env(safe-area-inset-bottom));left:calc(84px + env(safe-area-inset-left));right:calc(16px + env(safe-area-inset-right))}'+
  '#ax2.low small{color:#f3f6f8;font-weight:600;text-shadow:0 0 1px #000,0 0 1px #000}'+
  '@media (max-width:420px){#ax2 .l,#ax2 .r{top:24px;font-size:13px!important;font-weight:700}#ax2 small{font-size:14px}#ax2{left:76px;right:96px;top:calc(98px + env(safe-area-inset-top))}#ax2.low{right:16px}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var el=document.createElement('div');el.id='ax2';el.setAttribute('role','slider');el.setAttribute('aria-label','時間の速さ（横の軸）');
  el.setAttribute('aria-valuemin',MIN);el.setAttribute('aria-valuemax',MAX);el.tabIndex=0;
  el.innerHTML='<div class="ln"></div><div class="z"></div><small class="l">遅く</small><small class="c" id="ax2t">時間 ── いま</small><small class="r">速く</small><b></b>';
  var knob=el.querySelector('b'),lab=el.querySelector('#ax2t'),n=0,drag=0;
  function pos(v){return v<=0?50*(1-v/MIN):50+50*v/MAX}
  function val(p){return p<=50?MIN*(1-p/50):MAX*(p-50)/50}
  function word(v){return Math.abs(v)<.4?'横になぞると、時間が流れる':''}
  function timeWin(){var f=[].filter.call(document.querySelectorAll('iframe.qmf'),function(x){return /\/time\/$/.test(x.src)})[0];return f&&f.contentWindow}
  function apply(v,fromUser){
    n=Math.max(MIN,Math.min(MAX,v));knob.style.left=pos(n)+'%';lab.textContent=word(n);el.setAttribute('aria-valuenow',n.toFixed(1));
    if(!fromUser)return;
    var btn=function(m){return document.querySelector('#qm button[data-m="'+m+'"]')};
    if(Math.abs(n)<.4){if(btn('scale')&&btn('scale').getAttribute('aria-pressed')!=='true')btn('scale').click();return}
    if(btn('time')&&btn('time').getAttribute('aria-pressed')!=='true')btn('time').click();
    var w=timeWin();try{w&&w.__setN&&w.__setN(n)}catch(e){}
  }
  /* time の画面が読みこまれたら、いまの値を渡す */
  setInterval(function(){var w=timeWin();try{if(w&&w.__time&&!drag){var m=w.__time.n;if(document.querySelector('#qm button[data-m="time"][aria-pressed="true"]')&&Math.abs(m-n)>.05)apply(m,false);else if(Math.abs(n)>=.4&&Math.abs(m-n)>.05)w.__setN(n)}}catch(e){}},200);
  function at(x){var r=el.getBoundingClientRect();return val(Math.max(0,Math.min(100,(x-r.left)/r.width*100)))}
  el.addEventListener('pointerdown',function(e){drag=1;el.setPointerCapture(e.pointerId);apply(at(e.clientX),true);e.stopPropagation()});
  el.addEventListener('pointermove',function(e){if(drag){apply(at(e.clientX),true);e.stopPropagation()}});
  el.addEventListener('pointerup',function(e){drag=0;if(Math.abs(n)<.6)apply(0,true)});
  el.addEventListener('keydown',function(e){if(e.key==='ArrowRight')apply(n+.5,true);if(e.key==='ArrowLeft')apply(n-.5,true)});
  addEventListener('qualia-mode',function(e){if(e.detail!=='time')el.style.display='none';else{el.style.display='';el.classList.add('low')}});   /* 11-19 大きさの画面では時間のつまみを出さない（なぞる操作を一つに）。時間の画面だけ下に出す */
  function boot(){document.body.appendChild(el);apply(0,false);var q=new URLSearchParams(location.search).get('m');el.style.display=q==='time'?'':'none';el.classList.toggle('low',q==='time')}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',boot):boot();
})();
