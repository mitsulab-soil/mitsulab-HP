/* 2026-11-13 TOP の三つの体験（本人「子供から大人までわかるようにユニバーサル設計で」）
   ① いまの大宮の空：端末の時計だけで、太陽の位置と月の満ち欠けを計算する（位置情報は使わない・大宮に固定）
   ② あなたの耳の外側：聴こえる音の帯と、その外の音。触れてから鳴る（聴こえる高さに移した模式）
   ③ 帰り道の問い：毎回ちがう問いを一つ
   記録は取らない（保存も送信もしない）。 */
(function(){
  'use strict';
  var LAT=35.9165, LON=139.6305;          // 氷川参道のあたり（umwelt-shift.js と同じ値）
  var SYN=29.530589;                       // 朔望月の平均の長さ（日）理科年表
  var NEW0=Date.UTC(2000,0,6,18,14)/864e5; // 基準の新月 2000-01-06 18:14 UTC（Meeus『Astronomical Algorithms』）
  var en=function(){return document.documentElement.dataset.lang==='en';};
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  // NOAA の近似式（umwelt-shift.js の「時間がずれる」の太陽と同じ式）
  function sunPos(date){
    var doy=Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-Date.UTC(date.getUTCFullYear(),0,0))/864e5);
    var hr=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
    var g=2*Math.PI/365*(doy-1+(hr-12)/24);
    var eqt=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
    var dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
    var tst=hr*60+eqt+4*LON, ha=(tst/4-180)*Math.PI/180, la=LAT*Math.PI/180;
    var cz=Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(ha), z=Math.acos(Math.max(-1,Math.min(1,cz)));
    var az=Math.acos(Math.max(-1,Math.min(1,(Math.sin(la)*Math.cos(z)-Math.sin(dec))/(Math.cos(la)*Math.sin(z)||1e-6))))*180/Math.PI;
    az=ha>0?(az+180)%360:(540-az)%360;
    return {alt:90-z*180/Math.PI, az:az};
  }
  var DIR_JA=['北','北東','東','南東','南','南西','西','北西'], DIR_EN=['north','north-east','east','south-east','south','south-west','west','north-west'];
  function dir(az){var i=Math.round(az/45)%8;return en()?DIR_EN[i]:DIR_JA[i];}
  function moonAge(d){var a=(d.getTime()/864e5-NEW0)%SYN;return a<0?a+SYN:a;}
  function moonName(a){
    var J=[[1.5,'新月のころ','around new moon'],[6,'細い月（三日月のころ）','a thin crescent'],[9,'半月（上弦のころ）','half moon (first quarter)'],[13.3,'ふくらむ月','a growing moon'],[16.3,'満月のころ','around full moon'],[20.8,'欠けていく月','a shrinking moon'],[23.8,'半月（下弦のころ）','half moon (last quarter)'],[28.1,'細い月（明け方の月）','a thin morning crescent'],[99,'新月のころ','around new moon']];
    for(var i=0;i<J.length;i++)if(a<J[i][0])return en()?J[i][2]:J[i][1];
  }
  // 月の形（北半球で見た向き：満ちていく月は右が明るい）
  function moonPath(a,r){
    var f=a/SYN, k=Math.cos(2*Math.PI*f), rx=Math.abs(k)*r, waxing=f<.5;
    var outer=waxing?1:0, inner=(waxing?(k>0):(k<0))?0:1;
    if(f<.02||f>.98)return '';
    return 'M0,'+(-r)+' A'+r+','+r+' 0 0 '+outer+' 0,'+r+' A'+rx.toFixed(2)+','+r+' 0 0 '+inner+' 0,'+(-r)+'Z';
  }

  function sky(){
    var box=document.getElementById('udSky');if(!box)return;
    var now=new Date(), s=sunPos(now), a=moonAge(now);
    var hm=now.toLocaleTimeString(en()?'en-GB':'ja-JP',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'});
    var up=s.alt>0;
    // 空の半円：左＝東、まん中＝南、右＝西（北の空は描かない）
    var t=(s.az-90)/180, x=20+Math.max(0,Math.min(1,t))*160, y=96-Math.max(0,s.alt)/90*80, onArc=up&&s.az>=80&&s.az<=280;
    var sunSvg=onArc?'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="7" class="ud-sun"/><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="12" class="ud-sun-ring"/>':'';
    var mp=moonPath(a,13);
    box.querySelector('.ud-sky-fig').innerHTML='<svg viewBox="0 0 200 110" role="img" aria-hidden="true" focusable="false"><path d="M20,96 A80,80 0 0 1 180,96" class="ud-arc"/><line x1="10" y1="96" x2="190" y2="96" class="ud-hz"/><text x="20" y="108" class="ud-k">'+(en()?'E':'東')+'</text><text x="100" y="108" class="ud-k">'+(en()?'S':'南')+'</text><text x="180" y="108" class="ud-k">'+(en()?'W':'西')+'</text>'+sunSvg+'</svg><svg viewBox="-16 -16 32 32" class="ud-moon" aria-hidden="true" focusable="false"><circle r="13" class="ud-moon-dark"/>'+(mp?'<path d="'+mp+'" class="ud-moon-lit"/>':'')+'</svg>';
    var sunTxt=up?(en()?'Sun: '+Math.round(s.alt)+'° up, to the '+dir(s.az):'太陽：'+dir(s.az)+'の空、高さ '+Math.round(s.alt)+'°')
                 :(en()?'Sun: below the horizon':'太陽：いまは地平線の下');
    var moonTxt=(en()?'Moon: day '+Math.round(a)+' of about 29.5 — ':'月：月齢 約 '+Math.round(a)+' 日 ── ')+moonName(a);
    box.querySelector('.ud-sky-t').textContent=(en()?'The sky over Omiya now · ':'いまの大宮の空　')+hm;
    box.querySelector('.ud-sky-sun').textContent=sunTxt;
    box.querySelector('.ud-sky-moon').textContent=moonTxt;
  }

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

  // ---- 帰り道の問い（毎回ちがう問い。保存しない）
  var Q=[
    ['帰り道、足もとの土の下で何が動いているか、耳をすませてみて。土の中の生き物も、小さな音を立てています。','On the way home, listen for what moves in the soil under your feet. Creatures in the soil make small sounds too.'],
    ['夕方の空に、コウモリが飛んでいないか見上げてみて。その声は、人の耳には届かない高さです。','Look up at the evening sky for bats. Their calls are too high for human ears.'],
    ['道ばたの花を見つけたら、ミツバチにはどんな模様に見えるか考えてみて。ミツバチは、人には見えない紫外の光も見ています。','When you find a flower by the road, imagine its pattern to a honeybee. Bees also see ultraviolet light that we cannot.'],
    ['しゃがんで、ありの目の高さで道を見てみて。何がいちばん大きく見えますか。','Crouch down and look at the path from an ant’s height. What looks biggest?'],
    ['鳥の声が聞こえたら、同じ節を何回くり返しているか数えてみて。','If you hear a bird, count how many times it repeats the same phrase.'],
    ['雨のあとの土のにおいに気づいたら。そのにおいの一部は、土の中の細菌（放線菌）がつくる「ゲオスミン」という物質です。','If you notice the smell of soil after rain: part of it is geosmin, made by soil bacteria (actinomycetes).'],
    ['大きな木のそばを通ったら、その木が何年そこに立っているか想像してみて。','As you pass a large tree, imagine how many years it has stood there.'],
    ['今夜の月は、どんな形ですか。月は約 29.5 日で、また同じ形にもどります。','What shape is the moon tonight? It returns to the same shape about every 29.5 days.'],
    ['自分の影の長さを見てみて。朝と夕方では、どう変わるでしょう。','Look at the length of your shadow. How does it change between morning and evening?'],
    ['道の下には、昔の土地の形がかくれています。ここは昔、どんな場所だったでしょう。','Under the road lies the old shape of the land. What was this place like long ago?'],
    ['風が吹いたら、木によって音がちがうか聴きくらべてみて。','When the wind blows, listen: do different trees sound different?'],
    ['今日すれちがった生き物は、あなたをどう受けとっていたでしょう。','How did the creatures you passed today perceive you?']
  ];
  var qi=-1;
  function ask(){
    var box=document.getElementById('udAsk');if(!box)return;
    var n;do{n=Math.floor(Math.random()*Q.length);}while(n===qi&&Q.length>1);qi=n;
    box.querySelector('.ud-ask-q').textContent=en()?Q[n][1]:Q[n][0];
  }

  // 「足もとの下へ」と同じく TOP のときだけ出す
  function syncTop(){var top=document.getElementById('top'),on=!!(top&&top.classList.contains('active'));var a=document.getElementById('udAskWrap');if(a&&a.hidden===on)a.hidden=!on;}

  function init(){
    sky();ears();ask();syncTop();
    var nb=document.querySelector('#udAsk .ud-ask-next');if(nb)nb.addEventListener('click',ask);
    setInterval(sky,60000);
    var top=document.getElementById('top');if(top)new MutationObserver(syncTop).observe(top,{attributes:true,attributeFilter:['class']});
    new MutationObserver(function(){sky();if(qi>=0){var b=document.querySelector('#udAsk .ud-ask-q');if(b)b.textContent=en()?Q[qi][1]:Q[qi][0];}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-lang']});
    if(reduce)document.documentElement.classList.add('ud-calm');
    // 帰り道の問いが見えている間は、左下の深さの札を隠す（文字が重ならないように）
    var aw=document.getElementById('udAskWrap');if(aw&&'IntersectionObserver' in window)new IntersectionObserver(function(es){es.forEach(function(e){document.body.classList.toggle('ud-ask-in',e.isIntersecting);});},{rootMargin:'0px 0px -10% 0px'}).observe(aw);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
