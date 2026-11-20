/* © mitsulab. 13px 未満の字を 13px に上げる */
(function(){
  var SKIP='svg,canvas,[class*="atlas"],[class*="fig"],[class*="map"],[class*="mural"],.cg-stage,.us-bar,.th3d,[aria-hidden="true"]';
  function bump(){
    var root=document.getElementById('main')||document.body,els=root.querySelectorAll('p,li,dd,dt,small,span,a,figcaption,summary,label,button,em,cite,time');
    for(var i=0;i<els.length;i++){var e=els[i];if(e.closest(SKIP))continue;var f=parseFloat(getComputedStyle(e).fontSize);if(f>=7&&f<13)e.style.fontSize='13px';}
  }
  var go=function(){(window.requestIdleCallback||setTimeout)(bump,{timeout:1500});};
  if(document.readyState==='complete')go();else addEventListener('load',go);
  var t;addEventListener('resize',function(){clearTimeout(t);t=setTimeout(bump,300);});
})();
