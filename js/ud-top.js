/* 2026-11-13 TOP の三つの体験（本人「子供から大人までわかるようにユニバーサル設計で」）
   （2026-11-13 本人：「いまの大宮の空」は外した）
   ② あなたの耳の外側：聴こえる音の帯と、その外の音。触れてから鳴る（聴こえる高さに移した模式）
   記録は取らない（保存も送信もしない）。 */
(function(){
  'use strict';
  var en=function(){return document.documentElement.dataset.lang==='en';};
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;


  // ---- あなたの耳の外側
  var ctx=null;
  function ac(){if(!ctx){var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();}if(ctx.state==='suspended')ctx.resume();return ctx;}
  function env(c,g,t0,a,d,peak){g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(peak,t0+a);g.gain.exponentialRampToValueAtTime(0.0001,t0+a+d);}
  var PLAY={
    // アジアゾウの低い声 14〜24 Hz → 10 倍の高さ（140〜240 Hz）に移した模式
    elephant:function(c){var t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(180,t);o.frequency.linearRampToValueAtTime(150,t+1.6);var f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=600;o.connect(f).connect(g).connect(c.destination);env(c,g,t,.25,1.6,.35);o.start(t);o.stop(t+2);},
    // 土の中の小さな音：高さは聴こえる範囲。小さすぎるので大きくした模式（パチパチ・カリカリ）
    soil:function(c){var t=c.currentTime;for(var i=0;i<26;i++){var b=c.createBuffer(1,220,c.sampleRate),d=b.getChannelData(0);for(var j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.exp(-j/30);var s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=900+Math.random()*2600;s.buffer=b;g.gain.value=.25+Math.random()*.35;s.connect(f).connect(g).connect(c.destination);s.start(t+Math.random()*1.8);}},
    // アブラコウモリの声：約 87→43 kHz（Luo et al. 2007） → 10 倍ゆっくり（高さ 1/10）
    bat:function(c){var t=c.currentTime;for(var i=0;i<6;i++){var o=c.createOscillator(),g=c.createGain(),s=t+i*.28;o.type='sine';o.frequency.setValueAtTime(8000,s);o.frequency.exponentialRampToValueAtTime(4100,s+.05);o.frequency.setValueAtTime(4000,s+.05);o.frequency.linearRampToValueAtTime(3950,s+.09);o.connect(g).connect(c.destination);env(c,g,s,.004,.085,.22);o.start(s);o.stop(s+.12);}},
    // ハツカネズミの歌 30〜110 kHz → 10 倍ゆっくり（3〜11 kHz）
    mouse:function(c){var t=c.currentTime,P=[[7000,9000],[6000,4500],[8500,6500],[5500,7500],[9000,6000],[6500,8000]];P.forEach(function(p,i){var o=c.createOscillator(),g=c.createGain(),s=t+i*.24;o.type='sine';o.frequency.setValueAtTime(p[0],s);o.frequency.linearRampToValueAtTime(p[1],s+.15);o.connect(g).connect(c.destination);env(c,g,s,.01,.15,.15);o.start(s);o.stop(s+.2);});},
    // 木の中の気泡の音 0.1〜1 MHz → 100 分の 1 の高さに移した模式（短いコツッという音）
    tree:function(c){var t=c.currentTime;for(var i=0;i<9;i++){var o=c.createOscillator(),g=c.createGain(),s=t+i*.18+Math.random()*.12;o.type='triangle';o.frequency.value=1200+Math.random()*3000;o.connect(g).connect(c.destination);env(c,g,s,.002,.05,.3);o.start(s);o.stop(s+.08);}}
  };
  function ears(){
    var root=document.getElementById('udEars');if(!root)return;
    root.querySelectorAll('[data-snd]').forEach(function(b){
      b.addEventListener('click',function(){
        var c=ac();if(!c)return;PLAY[b.dataset.snd](c);
        root.querySelectorAll('[data-snd]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});
        var out=root.querySelector('.ud-ears-now');if(out)out.textContent=(en()?b.dataset.en:b.dataset.ja)||'';
      });
    });
  }

  function init(){
    ears();
    if(reduce)document.documentElement.classList.add('ud-calm');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* 2026-11-13 小さな字の下限：図（SVG・cqw で縮む図）の外の 13px 未満の字を 13px に上げる */
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
