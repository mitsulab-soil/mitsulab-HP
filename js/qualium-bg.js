/* © mitsulab. 背景：氷川参道（3D から撮った一枚）の上に、Qualium の主題を一度に一つだけ、細い線と点で静かに重ねる。
   場 → オブジェクト → エージェント → 関係（グラフ）→ 環世界と五感の拡張 → センサーと AI → 時間・歴史 → 輪（Qualium-Physium ループへ）。道具の章では 文化・文学／エンジニアリング。
   すべて模式。描くのは主題が移るあいだだけ（止まっているときは描かない）。光の玉・紫は使わない。prefers-reduced-motion では移りかわりを省く。
   位置のデータ（木・鳥居・道）は _dev/20261120_bg/ の道具が 3D から書き出したもの。このファイルは qualium-bg.src.js からの生成物。 */
export function start(opt){
  opt=opt||{};const BASE=opt.base||'',FIX=opt.theme||null;
  if(document.getElementById('qbg'))return;
  const ANC={"pc":{"w":1920,"h":1200,"trees":[{"b":[0.1579,0.6016],"c":[0.1572,0.0456],"t":[0.1567,-0.3263],"d":18.8},{"b":[0.7153,0.5495],"c":[0.7155,0.2857],"t":[0.7157,0.1095],"d":36.9},{"b":[0.2994,0.5476],"c":[0.2992,0.293],"t":[0.2991,0.123],"d":38},{"b":[0.6287,0.5418],"c":[0.6288,0.3189],"t":[0.6289,0.1701],"d":42.2},{"b":[0.3774,0.5363],"c":[0.3774,0.3419],"t":[0.3773,0.2121],"d":48.3},{"b":[0.0358,0.5425],"c":[0.0354,0.3161],"t":[0.0352,0.1649],"d":50.3},{"b":[0.3768,0.5253],"c":[0.3767,0.3837],"t":[0.3767,0.2892],"d":66.4},{"b":[0.7284,0.5249],"c":[0.7285,0.3855],"t":[0.7286,0.2925],"d":70.3},{"b":[0.3681,0.523],"c":[0.3681,0.3927],"t":[0.368,0.3057],"d":72.3},{"b":[1.0912,0.5316],"c":[1.0916,0.3599],"t":[1.0919,0.2453],"d":73.2},{"b":[0.4256,0.5206],"c":[0.4256,0.4019],"t":[0.4256,0.3227],"d":78.3},{"b":[0.6443,0.5207],"c":[0.6443,0.4017],"t":[0.6444,0.3223],"d":79.5},{"b":[0.835,0.5227],"c":[0.8352,0.3941],"t":[0.8353,0.3083],"d":81},{"b":[0.5785,0.5188],"c":[0.5785,0.4082],"t":[0.5786,0.3343],"d":84},{"b":[0.4216,0.5187],"c":[0.4216,0.4085],"t":[0.4216,0.335],"d":84.4},{"b":[0.3633,0.517],"c":[0.3632,0.4145],"t":[0.3632,0.3462],"d":92.1}],"tor":{"bl":[0.4349,0.5332],"br":[0.5692,0.5336],"tl":[0.4149,0.3504],"tr":[0.5896,0.3488],"nl":[0.4283,0.4009],"nr":[0.576,0.4]},"path":[{"m":3,"c":[0.4545,1.1171],"l":[-0.9392,1.0971],"r":[1.944,1.1384],"l2":[-3.4736,1.0607],"r2":[5.2532,1.1859],"up":[0.4544,0.502],"hi":[0.454,-1.5953]},{"m":4,"c":[0.4695,0.9494],"l":[-0.5535,0.9387],"r":[1.543,0.9606],"l2":[-2.4615,0.9188],"r2":[3.8574,0.9847],"up":[0.4694,0.502],"hi":[0.4692,-1.019]},{"m":5,"c":[0.478,0.8536],"l":[-0.33,0.847],"r":[1.3173,0.8605],"l2":[-1.859,0.8344],"r2":[3.097,0.8752],"up":[0.478,0.5021],"hi":[0.4779,-0.6911]},{"m":6,"c":[0.4836,0.7917],"l":[-0.184,0.7871],"r":[1.1725,0.7964],"l2":[-1.4591,0.7783],"r2":[2.6186,0.8063],"up":[0.4836,0.5022],"hi":[0.4835,-0.4795]},{"m":8,"c":[0.4904,0.7163],"l":[-0.005,0.7137],"r":[0.9977,0.7189],"l2":[-0.9615,0.7086],"r2":[2.0501,0.7244],"up":[0.4904,0.5023],"hi":[0.4903,-0.2224]},{"m":10,"c":[0.4944,0.6721],"l":[0.1007,0.6704],"r":[0.896,0.6738],"l2":[-0.664,0.667],"r2":[1.7238,0.6775],"up":[0.4944,0.5024],"hi":[0.4944,-0.0719]},{"m":13,"c":[0.4983,0.632],"l":[0.1973,0.6309],"r":[0.8043,0.6331],"l2":[-0.3899,0.6287],"r2":[1.432,0.6355],"up":[0.4983,0.5025],"hi":[0.4983,0.0645]},{"m":16,"c":[0.5009,0.6073],"l":[0.2576,0.6064],"r":[0.7483,0.6082],"l2":[-0.2175,0.6046],"r2":[1.2555,0.6101],"up":[0.5009,0.5026],"hi":[0.5009,0.1486]},{"m":20,"c":[0.5039,0.5861],"l":[0.31,0.5854],"r":[0.7009,0.5869],"l2":[-0.0688,0.584],"r2":[1.1046,0.5883],"up":[0.5039,0.5027],"hi":[0.5039,0.2208]},{"m":25,"c":[0.5065,0.5694],"l":[0.3515,0.569],"r":[0.6632,0.5698],"l2":[0.0468,0.5681],"r2":[0.9823,0.5707],"up":[0.5065,0.5029],"hi":[0.5065,0.2782]},{"m":32,"c":[0.5073,0.5546],"l":[0.3861,0.5545],"r":[0.6289,0.5547],"l2":[0.1445,0.5543],"r2":[0.8731,0.5548],"up":[0.5073,0.5028],"hi":[0.5073,0.3278]},{"m":40,"c":[0.5058,0.5437],"l":[0.4088,0.5437],"r":[0.6027,0.5436],"l2":[0.2143,0.5438],"r2":[0.7958,0.5436],"up":[0.5058,0.5023],"hi":[0.5058,0.3626]},{"m":50,"c":[0.5034,0.5346],"l":[0.4259,0.5346],"r":[0.5807,0.5345],"l2":[0.27,0.5348],"r2":[0.7344,0.5344],"up":[0.5034,0.5015],"hi":[0.5034,0.39]},{"m":65,"c":[0.5003,0.5256],"l":[0.4408,0.5256],"r":[0.5597,0.5255],"l2":[0.3214,0.5257],"r2":[0.6781,0.5255],"up":[0.5003,0.5002],"hi":[0.5003,0.4145]},{"m":80,"c":[0.4992,0.52],"l":[0.4509,0.52],"r":[0.5474,0.52],"l2":[0.3541,0.52],"r2":[0.6436,0.5199],"up":[0.4992,0.4994],"hi":[0.4992,0.4299]},{"m":100,"c":[0.4981,0.5146],"l":[0.4596,0.5146],"r":[0.5367,0.5146],"l2":[0.3822,0.5146],"r2":[0.6137,0.5145],"up":[0.4981,0.4981],"hi":[0.4981,0.4426]},{"m":130,"c":[0.4972,0.5092],"l":[0.4675,0.5092],"r":[0.5268,0.5092],"l2":[0.4081,0.5092],"r2":[0.586,0.5091],"up":[0.4972,0.4965],"hi":[0.4972,0.4538]},{"m":170,"c":[0.4965,0.5054],"l":[0.4738,0.5054],"r":[0.5191,0.5054],"l2":[0.4284,0.5055],"r2":[0.5644,0.5054],"up":[0.4965,0.4958],"hi":[0.4965,0.4631]},{"m":220,"c":[0.4959,0.5031],"l":[0.4784,0.5031],"r":[0.5134,0.5031],"l2":[0.4434,0.5031],"r2":[0.5484,0.5031],"up":[0.4959,0.4956],"hi":[0.4959,0.4704]}]},"sp":{"w":900,"h":1800,"trees":[{"b":[0.9457,0.5222],"c":[0.9478,0.351],"t":[0.9493,0.2359],"d":36.9},{"b":[0.0848,0.521],"c":[0.0829,0.3557],"t":[0.0816,0.2447],"d":38},{"b":[0.7665,0.5172],"c":[0.7676,0.3726],"t":[0.7683,0.2755],"d":42.2},{"b":[0.2463,0.5136],"c":[0.2454,0.3875],"t":[0.2448,0.303],"d":48.3},{"b":[0.2448,0.5065],"c":[0.2442,0.4147],"t":[0.2437,0.3532],"d":66.4},{"b":[0.973,0.5062],"c":[0.9742,0.4159],"t":[0.975,0.3554],"d":70.3},{"b":[0.2269,0.505],"c":[0.2263,0.4205],"t":[0.2258,0.364],"d":72.3},{"b":[0.346,0.5035],"c":[0.3456,0.4265],"t":[0.3454,0.3751],"d":78.3},{"b":[0.7988,0.5035],"c":[0.7994,0.4264],"t":[0.7998,0.3748],"d":79.5},{"b":[0.6626,0.5023],"c":[0.6629,0.4306],"t":[0.6631,0.3826],"d":84},{"b":[0.3377,0.5023],"c":[0.3373,0.4308],"t":[0.3371,0.383],"d":84.4},{"b":[0.2169,0.5011],"c":[0.2163,0.4347],"t":[0.216,0.3904],"d":92.1},{"b":[0.9871,0.5013],"c":[0.988,0.4341],"t":[0.9886,0.3892],"d":94.9},{"b":[0.0309,0.5003],"c":[0.0301,0.4373],"t":[0.0296,0.3953],"d":100.8},{"b":[0.3214,0.4993],"c":[0.3211,0.4406],"t":[0.3209,0.4014],"d":102.9},{"b":[1.0938,0.5001],"c":[1.0948,0.438],"t":[1.0955,0.3965],"d":105.6}],"tor":{"bl":[0.3653,0.5117],"br":[0.6433,0.5119],"tl":[0.3234,0.3931],"tr":[0.686,0.392],"nl":[0.3512,0.4259],"nr":[0.6577,0.4253]},"path":[{"m":3,"c":[0.4065,0.8861],"l":[-2.4555,0.8734],"r":[3.4637,0.8997],"l2":[-7.6646,0.8502],"r2":[10.2488,0.9298],"up":[0.4055,0.4914],"hi":[0.4018,-0.9088]},{"m":4,"c":[0.4372,0.7792],"l":[-1.6685,0.7724],"r":[2.6461,0.7863],"l2":[-5.5975,0.7596],"r2":[7.4059,0.8018],"up":[0.4367,0.4915],"hi":[0.4349,-0.5154]},{"m":5,"c":[0.4547,0.7179],"l":[-1.2106,0.7136],"r":[2.1841,0.7223],"l2":[-4.3628,0.7056],"r2":[5.8503,0.7317],"up":[0.4544,0.4915],"hi":[0.4534,-0.2945]},{"m":6,"c":[0.4661,0.6782],"l":[-0.911,0.6752],"r":[1.8871,0.6812],"l2":[-3.5419,0.6696],"r2":[4.8691,0.6875],"up":[0.466,0.4915],"hi":[0.4653,-0.1531]},{"m":8,"c":[0.4801,0.6297],"l":[-0.5428,0.628],"r":[1.5277,0.6314],"l2":[-2.5182,0.6248],"r2":[3.7005,0.635],"up":[0.4801,0.4916],"hi":[0.4798,0.0175]},{"m":10,"c":[0.4885,0.6013],"l":[-0.325,0.6002],"r":[1.3183,0.6024],"l2":[-1.9052,0.598],"r2":[3.0285,0.6047],"up":[0.4885,0.4917],"hi":[0.4883,0.1168]},{"m":13,"c":[0.4965,0.5754],"l":[-0.1258,0.5747],"r":[1.1291,0.5762],"l2":[-1.34,0.5733],"r2":[2.4267,0.5777],"up":[0.4965,0.4917],"hi":[0.4964,0.2064]},{"m":16,"c":[0.5019,0.5595],"l":[-0.0014,0.5589],"r":[1.0135,0.5601],"l2":[-0.9841,0.5578],"r2":[2.0624,0.5613],"up":[0.5019,0.4918],"hi":[0.502,0.2615]},{"m":20,"c":[0.5081,0.5458],"l":[0.1069,0.5454],"r":[0.9157,0.5463],"l2":[-0.6768,0.5445],"r2":[1.7508,0.5473],"up":[0.5081,0.4919],"hi":[0.5081,0.3087]},{"m":25,"c":[0.5133,0.535],"l":[0.1927,0.5347],"r":[0.8378,0.5353],"l2":[-0.4378,0.5342],"r2":[1.4981,0.5359],"up":[0.5134,0.492],"hi":[0.5134,0.3461]},{"m":32,"c":[0.5152,0.5254],"l":[0.2642,0.5254],"r":[0.7668,0.5255],"l2":[-0.2359,0.5253],"r2":[1.2722,0.5256],"up":[0.5152,0.4919],"hi":[0.5152,0.3784]},{"m":40,"c":[0.5121,0.5184],"l":[0.3113,0.5184],"r":[0.7125,0.5184],"l2":[-0.0914,0.5185],"r2":[1.1124,0.5183],"up":[0.5121,0.4916],"hi":[0.5121,0.401]},{"m":50,"c":[0.5071,0.5125],"l":[0.3466,0.5125],"r":[0.6671,0.5125],"l2":[0.0239,0.5126],"r2":[0.9853,0.5124],"up":[0.5071,0.4911],"hi":[0.5072,0.4188]},{"m":65,"c":[0.5006,0.5067],"l":[0.3773,0.5067],"r":[0.6236,0.5067],"l2":[0.1301,0.5067],"r2":[0.8688,0.5066],"up":[0.5006,0.4903],"hi":[0.5006,0.4347]},{"m":80,"c":[0.4983,0.5031],"l":[0.3983,0.5031],"r":[0.5981,0.5031],"l2":[0.1978,0.5031],"r2":[0.7974,0.503],"up":[0.4983,0.4897],"hi":[0.4983,0.4447]},{"m":100,"c":[0.4962,0.4996],"l":[0.4162,0.4996],"r":[0.576,0.4996],"l2":[0.2561,0.4996],"r2":[0.7354,0.4996],"up":[0.4962,0.4889],"hi":[0.4962,0.4529]},{"m":130,"c":[0.4942,0.4961],"l":[0.4327,0.4961],"r":[0.5556,0.4961],"l2":[0.3097,0.4961],"r2":[0.6782,0.4961],"up":[0.4942,0.4879],"hi":[0.4942,0.4602]},{"m":170,"c":[0.4927,0.4937],"l":[0.4457,0.4937],"r":[0.5396,0.4937],"l2":[0.3517,0.4937],"r2":[0.6333,0.4937],"up":[0.4927,0.4874],"hi":[0.4927,0.4663]},{"m":220,"c":[0.4916,0.4921],"l":[0.4553,0.4921],"r":[0.5278,0.4921],"l2":[0.3827,0.4921],"r2":[0.6002,0.4921],"up":[0.4916,0.4873],"hi":[0.4916,0.471]}]}};
  const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stick=document.querySelector('.sd-stick');
  const cv=document.createElement('canvas');cv.id='qbg';cv.setAttribute('aria-hidden','true');
  const lens=document.createElement('img');lens.id='qbgLens';lens.alt='';lens.setAttribute('aria-hidden','true');lens.decoding='async';
  (stick||document.body).appendChild(lens);(stick||document.body).appendChild(cv);
  const cx=cv.getContext('2d');
  const sp=()=>innerWidth<761,en=()=>document.documentElement.lang==='en';
  const CY='160,236,242',BR='232,184,146',GR='186,224,170',WH='238,245,248',B=1.7,LW=1.5;
  let W=0,H=0,DPR=1,A=ANC.pc,sc=1,ox=0,oy=0,FF='sans-serif',FS='serif';
  let W0=-1,H0=-1;
  function size(force){
    const r=stick?stick.getBoundingClientRect():null,nw=(r&&r.width)||innerWidth,nh=(r&&r.height)||innerHeight;
    if(!force&&nw===W0&&Math.abs(nh-H0)<160&&sp())return;   // スマホのアドレスバーの出入り（高さだけの小さな変化）では組み直さない
    W0=nw;H0=nh;W=nw;H=nh;
    DPR=Math.min(devicePixelRatio||1,sp()?1.5:2);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';
    A=sp()?ANC.sp:ANC.pc;sc=Math.max(W/A.w,H/A.h);ox=(W-A.w*sc)/2;oy=(H-A.h*sc)/2;
    lens.style.width=W+'px';lens.style.height=H+'px';
    const want=BASE+(sp()?'img/hero/sando_real_sp_bee_450.webp':'img/hero/sando_real_bee_800.webp');if(lens.dataset.s!==want){lens.dataset.s=want;if(lens.dataset.on)lens.src=want}
    FF=getComputedStyle(document.body).fontFamily||'sans-serif';const h=document.querySelector('.sd-dream');FS=h?getComputedStyle(h).fontFamily:'serif';
  }
  const M=p=>[ox+p[0]*A.w*sc,oy+p[1]*A.h*sc];
  const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const cl=v=>Math.min(1,Math.max(0,v));
  const st=(pr,k,n)=>cl(pr*n-k);                       // 順に一つずつ現れる
  // ── 描く道具
  function ln(pts,col,al,w,dash){if(al<=0.004)return;al=Math.min(1,al*B);w=(w||1)*LW;cx.beginPath();pts.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.strokeStyle=`rgba(${col},${al})`;cx.lineWidth=w||1;cx.setLineDash(dash||[]);cx.stroke();cx.setLineDash([])}
  function sq(p,s,col,al){if(al<=0.004)return;al=Math.min(1,al*B);cx.strokeStyle=`rgba(${col},${al})`;cx.lineWidth=LW;cx.fillStyle=`rgba(${col},${al*0.3})`;cx.fillRect(p[0]-s,p[1]-s,s*2,s*2);cx.strokeRect(p[0]-s,p[1]-s,s*2,s*2)}
  function tri(p,s,col,al,fill){if(al<=0.004)return;cx.beginPath();cx.moveTo(p[0],p[1]-s);cx.lineTo(p[0]+s*0.9,p[1]+s*0.7);cx.lineTo(p[0]-s*0.9,p[1]+s*0.7);cx.closePath();al=Math.min(1,al*B);cx.strokeStyle=`rgba(${col},${al})`;cx.lineWidth=LW;cx.stroke();if(fill){cx.fillStyle=`rgba(${col},${al*0.35})`;cx.fill()}}
  function ell(p,rx,ry,col,al,w,a0,a1,dash){if(al<=0.004||rx<=0||ry<=0)return;al=Math.min(1,al*B);w=(w||1)*LW;cx.beginPath();cx.ellipse(p[0],p[1],rx,ry,0,a0||0,a1==null?Math.PI*2:a1);cx.strokeStyle=`rgba(${col},${al})`;cx.lineWidth=w||1;cx.setLineDash(dash||[]);cx.stroke();cx.setLineDash([])}
  // ── 本文から離す：本文の行の矩形（余白つき）を「空ける区域」にする
  let KO=[];const KP=()=>sp()?10:16;
  function koRead(){KO=[];const p=KP();document.querySelectorAll(opt.ko||'#qStory .sy-h,#qStory .sy-p').forEach(e=>{const r0=e.getBoundingClientRect();if(r0.bottom<-40||r0.top>H+40)return;const r=document.createRange();r.selectNodeContents(e);for(const q of r.getClientRects()){if(q.width<2||q.bottom<-p||q.top>H+p)continue;KO.push([q.left-p,q.top-p,q.right+p,q.bottom+p])}})}
  const hitKO=(x0,y0,x1,y1)=>KO.some(k=>x0<k[2]&&x1>k[0]&&y0<k[3]&&y1>k[1]);
  function spot(t,p,o){cx.save();cx.font=`${o.w||500} ${o.s||12}px ${o.serif?FS:FF}`;try{cx.letterSpacing=(o.ls||1)+'px'}catch(e){}const w=cx.measureText(t).width,h=(o.s||12)*1.3;cx.restore();
    const al=o.al||'left',x0=al==='center'?p[0]-w/2:al==='right'?p[0]-w:p[0],m=8,yMax=H*(sp()?0.9:0.87);
    const C=[[x0,p[1]],[p[0]-20-w,p[1]],[x0,p[1]-h-6],[x0,p[1]+h+6],[p[0]-w/2,p[1]-h*2],[p[0]-w/2,p[1]+h*2]];
    for(const c of C){const x=Math.min(W-m-w,Math.max(m,c[0])),y=c[1];if(y-h/2<m||y+h/2>yMax)continue;if(!hitKO(x,y-h/2,x+w,y+h/2))return[x,y]}return null}
  const LS={};let lblBusy=false;
  function tx(t,p,col,al,o){if(al<=0.004||!t)return;o=o||{};if(!o.fixed){const q=spot(t,p,o),k=t+'|'+(o.s||12);let z=LS[k];
      if(!z){if(!q)return;z=LS[k]={x:q[0],y:q[1],a:0}}
      if(q){z.x+=(q[0]-z.x)*0.18;z.y+=(q[1]-z.y)*0.18}z.a+=((q?1:0)-z.a)*0.09;
      if(Math.abs((q?1:0)-z.a)>0.01||(q&&Math.hypot(q[0]-z.x,q[1]-z.y)>0.5))lblBusy=true;
      if(z.a<0.01)return;al*=z.a;p=[z.x,z.y];o=Object.assign({},o,{al:'left'})}al=Math.min(1,al*B*1.3);cx.save();cx.shadowColor='rgba(2,7,13,.95)';cx.shadowBlur=7;cx.font=`${o.w||500} ${o.s||12}px ${o.serif?FS:FF}`;cx.textAlign=o.al||'left';cx.textBaseline='middle';try{cx.letterSpacing=(o.ls||1)+'px'}catch(e){}cx.fillStyle=`rgba(${col},${al})`;cx.fillText(t,p[0],p[1]);cx.fillText(t,p[0],p[1]);cx.restore()}
  // ── 場面の要素（位置は 3D から）
  const T=()=>A.trees.filter(t=>t.d>30&&t.c[0]>0.04&&t.c[0]<0.96).slice(0,4);
  const row=m=>A.path.find(r=>r.m===m)||A.path[A.path.length-1];
  const K=()=>sp()?0.62:0.7;
  function objects(){const o=A.tor,t=T();return{tor:[M(o.bl),M(o.br),M(o.tl),M(o.tr),M(o.nl),M(o.nr)],trees:t.map(x=>({b:M(x.b),c:M(x.c),t:M(x.t)}))}}
  function agents(){
    const t=T(),o=A.tor,r16=row(16),r25=row(25),r40=row(40);
    const bird=t[0]?mix(M(t[0].c),M(t[0].t),0.4):[W*0.7,H*0.3];
    return[{k:'人',e:'person',p:M(r16.up),g:M(r16.c),R:0.085},{k:'鳥',e:'bird',p:bird,g:null,R:0.12},{k:'蝶',e:'butterfly',p:mix(M(mix(r25.up,r25.hi,0.35)),M(r25.r),0.5),g:null,R:0.05},{k:'碧',e:'Aoi',p:mix(M(r40.up),M(r40.l),0.45),g:mix(M(r40.c),M(r40.l),0.45),R:0.07,m:1},{k:'センサー',e:'sensor',p:mix(M(o.br),[M(o.br)[0],M(o.tr)[1]],0.55),g:null,R:0.1,s:1}];
  }
  // ── 主題
  let LF=null;const LC={x:0,y:0,r:0,a:0,on:0};
  function lensFit(c0,r0){const ok=(c,r)=>{const e=r+10;return c[0]-e>=6&&c[0]+e<=W-6&&c[1]-e>=50&&c[1]+e+26<=H*(sp()?0.9:0.87)&&!hitKO(c[0]-e,c[1]-e,c[0]+e,c[1]+e+26)};
    if(LF&&LF[2]===W&&ok(LF[0],LF[1]))return LF;
    for(let r=r0;r>=(sp()?26:60);r*=0.86){let best=null,bd=1e9;const st=Math.max(16,r*0.3);for(let y=r+50;y<H;y+=st)for(let x=r+16;x<W-r-6;x+=st){if(!ok([x,y],r))continue;const d=Math.hypot(x-c0[0],y-c0[1]);if(d<bd){bd=d;best=[x,y]}}if(best)return LF=[best,r,W]}
    return LF=null}
  const D={
    object(a,pr){const o=objects(),k=K()*a;
      const [bl,br,tl,tr,nl,nr]=o.tor,s0=st(pr,0,5);
      ln([bl,[bl[0],tl[1]]],BR,k*s0,1.2);ln([br,[br[0],tr[1]]],BR,k*s0,1.2);ln([tl,tr],BR,k*s0,1.2);ln([nl,nr],BR,k*s0,1.2);sq(bl,3,BR,k*s0);sq(br,3,BR,k*s0);
      tx(en()?'torii':'鳥居',[tr[0]+10,tr[1]],WH,k*s0*1.2);
      o.trees.forEach((t,i)=>{const s=st(pr,1+i*0.7,5),r=Math.abs(t.b[1]-t.c[1])*0.36,c=t.c;ln([t.b,t.c],CY,k*s,1);ell(c,r,r*0.9,CY,k*s*0.9,1);sq(t.b,3,CY,k*s);if(i===0)tx(en()?'tree':'木',[c[0]+r+8,c[1]],WH,k*s*1.2)});
      const s4=st(pr,4,5),L=[],R=[];A.path.filter(r=>r.m>=8).forEach(r=>{L.push(M(r.l));R.push(M(r.r))});ln(L,CY,k*s4*0.8,1,[2,5]);ln(R,CY,k*s4*0.8,1,[2,5]);
      const pp=M(row(10).c);tx(en()?'paving stones':'石畳',[pp[0]+12,pp[1]],WH,k*s4*1.2)},
    agent(a,pr){const k=K()*a,u=Math.min(W,H);agents().forEach((g,i)=>{const s=st(pr,i*0.8,5),col=g.s?BR:g.m?WH:CY;
      tri(g.p,5,col,k*s*1.3,g.m);
      const R=g.R*u;                                   // 受けとれる範囲（模式）：大きさも向きも受けとり手ごとに違う
      if(g.g)ell(g.g,R,R*0.28,col,k*s*0.7,1);else ell(g.p,R,R,col,k*s*0.55,1,-Math.PI*(0.9-i*0.07),-Math.PI*(0.1-i*0.05));
      if(g.g)ln([g.p,g.g],col,k*s*0.5,1,[1,4]);
      tx(en()?g.e:g.k,[g.p[0]+10,g.p[1]-2],WH,k*s*0.8)})},
    relation(a,pr){const k=K()*a,o=objects(),ag=agents(),ob=[o.tor[0],o.tor[1]].concat(o.trees.map(t=>t.b));
      const aoi=ag.find(g=>g.m);let n=0;const E=[];
      ag.forEach(g=>{const near=ob.map(p=>[Math.hypot(p[0]-g.p[0],p[1]-g.p[1]),p]).sort((x,y)=>x[0]-y[0]).slice(0,2);near.forEach(q=>E.push([g.p,q[1],0]));if(g!==aoi)E.push([g.p,aoi.p,1])});
      E.forEach((e,i)=>{const s=st(pr,i*0.9,E.length*0.9+1),q=mix(e[0],e[1],s);ln([e[0],q],e[2]?WH:CY,k*(e[2]?0.75:0.55)*(s>0?1:0),1)});
      ob.forEach(p=>sq(p,3,BR,k));ag.forEach(g=>tri(g.p,g.m?6:4.5,g.m?WH:CY,k*1.3,g.m));
      ell(aoi.p,13,13,WH,k*st(pr,2,3)*0.9,1);tx(en()?'Aoi — mediates':'碧 ── あいだをつなぐ',[aoi.p[0]+20,aoi.p[1]-2],WH,k*st(pr,2,3)*1.25)},
    umwelt(a,pr){let k=K()*a;const gr=pr*pr*(3-2*pr);
      agents().slice(0,1).forEach(g=>{const u=Math.min(W,H);for(let i=0;i<3;i++){const s=st(pr,i*0.6,2.4),R=u*(0.05+i*0.055)*(0.5+0.5*gr);ell(g.p,R,R*0.42,i?GR:CY,k*s*(0.75-i*0.18),1,0,Math.PI*2,i?[2,5]:null)}tx(en()?'a person’s umwelt, widening':'人の環世界が、広がる',[g.p[0]+12,g.p[1]+16],WH,k*st(pr,0.4,2)*1.1)});const f=lensFit(M(sp()?[0.80,0.50]:[0.715,0.34]),Math.min(W,H)*(sp()?0.2:0.19));
      if(f){if(!LC.on){LC.x=f[0][0];LC.y=f[0][1];LC.r=f[1];LC.on=1}LC.x+=(f[0][0]-LC.x)*0.12;LC.y+=(f[0][1]-LC.y)*0.12;LC.r+=(f[1]-LC.r)*0.12}
      LC.a+=((f?1:0)-LC.a)*0.08;if(Math.abs((f?1:0)-LC.a)>0.01||(f&&Math.hypot(f[0][0]-LC.x,f[0][1]-LC.y)>0.5))lblBusy=true;
      if(!LC.on||LC.a<0.01){lens.style.clipPath=lens.style.webkitClipPath='circle(0px at 0px 0px)';return}k*=LC.a;const c=[LC.x,LC.y],r=LC.r*(0.5+0.5*gr);
      if(!lens.dataset.on){lens.dataset.on='1';lens.src=lens.dataset.s}
      lens.style.clipPath=lens.style.webkitClipPath=`circle(${r.toFixed(1)}px at ${c[0].toFixed(1)}px ${c[1].toFixed(1)}px)`;
      ell(c,r,r,GR,k*1.4,1.2);ell(c,r+7,r+7,GR,k*0.5,1,0,Math.PI*2,[1,6]);
      tx(en()?'as a honeybee might receive it (model)':'ミツバチの受けとり方（模式）',[c[0],c[1]+r+18],WH,k*st(pr,1,2)*1.3,{al:'center'});
      const g=M(row(40).c),w=Math.abs(M(row(40).r)[0]-M(row(40).l)[0])/12;                 // こだまの輪（コウモリ・模式）
      for(let i=0;i<3;i++){const s=st(pr,1+i*0.5,3),R=w*(5+i*5);ell(g,R,R*0.2,CY,k*s*(0.7-i*0.15),1,Math.PI,Math.PI*2)}},
    network(a,pr){D.agent(a*0.85,cl(pr*1.6));D.relation(a,cl(pr*1.4-0.35))},
    layers(a,pr){const k=K()*a,rows=A.path.filter(r=>r.m>=8&&r.m<=110),n=4,C=[CY,GR,BR,WH],
      NM=en()?['sensing','living things','history','meaning']:['センサーの層','生き物の層','時間の層','意味の層'];
      D.sensor(a*0.45,cl(pr*1.5));
      for(let j=0;j<n;j++){const s=st(pr,j*0.7,n*0.7+0.6);if(s<=0)continue;const dy=-Math.min(W,H)*0.045*(j+1)*s,L=[],R=[];
        rows.forEach(r=>{const l=M(r.l),q=M(r.r);L.push([l[0],l[1]+dy*(l[1]/H)]);R.push([q[0],q[1]+dy*(q[1]/H)])});
        ln(L,C[j],k*s*0.75,1,[3,5]);ln(R,C[j],k*s*0.75,1,[3,5]);
        [0,Math.floor(rows.length/2)].forEach(i=>{if(L[i])ln([L[i],R[i]],C[j],k*s*0.45,1,[1,4])});
        const p=R[Math.min(R.length-1,Math.floor(R.length*(0.08+0.22*j)))];if(p)tx(NM[j],[p[0]-10,p[1]-8],WH,k*s*1.1,{s:11.5,al:'right'})}},
    sensor(a,pr){const k=K()*a;cx.fillStyle=`rgba(${CY},1)`;const d=2.2;
      const rows=A.path.filter(r=>r.m>=6&&r.m<=130),n=sp()?9:15;
      rows.forEach((r,j)=>{const s=st(pr,j*0.5,rows.length*0.5+1);if(s<=0)return;const l=M(r.l2),q=M(r.r2);cx.globalAlpha=s*a;for(let i=0;i<=n;i++){const p=mix(l,q,i/n);if(p[0]<-4||p[0]>W+4)continue;cx.fillRect(p[0]-d/2,p[1]-d/2,d,d)}});
      cx.globalAlpha=cl(pr*1.5)*a;T().forEach(t=>{const b=M(t.b),c=M(t.c);for(let i=0;i<=7;i++){const p=mix(b,c,i/7);cx.fillRect(p[0]-d/2,p[1]-d/2,d,d)}});
      const o=A.tor;[[o.bl,o.tl],[o.br,o.tr]].forEach(e=>{const b=M(e[0]),t=[b[0],M(e[1])[1]];for(let i=0;i<=6;i++){const p=mix(b,t,i/6);cx.fillRect(p[0]-d/2,p[1]-d/2,d,d)}});cx.globalAlpha=1;
      const y=M(row(20).c)[1];ln([[0,y],[W,y]],CY,k*0.5*cl(pr*2),1,[1,3])},
    time(a,pr){const k=K()*a,P=A.path.filter(r=>r.m>=5).map(r=>M(r.c)),n=Math.max(2,Math.round(P.length*cl(pr*1.4)));
      ln(P.slice(0,n),BR,k*1.3,1.4,[7,6]);
      const s=st(pr,1,2),o=M(A.tor.br),y=M(row(40).c)[1];
      if(sp()){tx(en()?'Said to have been the Nakasendo':'寛永 5 年（1628）まで、',[W/2,y+26],WH,k*s*1.4,{al:'center',serif:1,s:12});tx(en()?'highway until 1628':'この道が中山道だったと伝わる',[W/2,y+46],WH,k*s*1.4,{al:'center',serif:1,s:12})}
      else{tx(en()?'Said to have been the Nakasendo':'寛永 5 年（1628）まで、',[W-30,y+34],WH,k*s*1.4,{al:'right',serif:1,s:13,ls:2});tx(en()?'highway until 1628':'この道が中山道だったと伝わる',[W-30,y+58],WH,k*s*1.4,{al:'right',serif:1,s:13,ls:2})}},
    lit(a,pr){if(sp())return;const k=K()*a,t='不知周之夢為胡蝶與　胡蝶之夢為周與',x=Math.max(22,Math.min(46,W*0.028));
      cx.font=`400 14px ${FS}`;cx.textAlign='center';cx.textBaseline='middle';
      for(let i=0;i<t.length;i++){const s=st(pr,i*0.25,t.length*0.25+1);cx.fillStyle=`rgba(${WH},${Math.min(1,k*s*1.6)})`;cx.fillText(t[i],x,H*0.2+i*22)}
      tx(en()?'Zhuangzi':'『荘子』',[x,H*0.2+t.length*22+16],BR,k*st(pr,1,2)*1.3,{al:'center',s:11})},
    eng(a,pr){const k=K()*a,y0=H*(sp()?0.86:0.8);
      for(let j=0;j<3;j++){const s=st(pr,j*0.6,3),P=[];for(let i=0;i<=40;i++){const x=W*i/40;P.push([x,y0+j*H*0.045+Math.sin(i*0.35+j*1.7)*H*0.008])}ln(P.slice(0,Math.max(2,Math.round(41*s))),BR,k*(1-j*0.2),1)}
      const s2=st(pr,1.2,3);for(let i=0;i<(sp()?3:6);i++){const x=W*(0.12+i*(sp()?0.3:0.15)),y=y0+H*0.02;ln([[x,y],[x+22,y+10]],CY,k*s2,1,[3,3]);ln([[x+22,y+10],[x+16,y+9]],CY,k*s2,1);ln([[x+22,y+10],[x+19,y+5]],CY,k*s2,1)}  // 水のしみ込み（模式）
      const s3=st(pr,2,3);T().slice(0,3).forEach(t=>{const b=M(t.b);ell(b,7,7,GR,k*s3*1.2,1);ln([[b[0]-4,b[1]],[b[0]+4,b[1]]],GR,k*s3*1.2,1);ln([[b[0],b[1]-4],[b[0],b[1]+4]],GR,k*s3*1.2,1)})}                                       // 手を入れる所
  };
  const NAME={network:['アクターと関係','NETWORK'],layers:['情報の層','LAYERS'],object:['オブジェクト','OBJECT'],agent:['エージェント','AGENT'],relation:['関係・グラフ','RELATION'],umwelt:['環世界と五感の拡張','UMWELT'],sensor:['センサーと AI','SENSOR'],time:['時間・歴史','TIME'],lit:['文化・文学','CULTURE'],eng:['エンジニアリング','ENGINEERING']};
  // ── どの主題か（スクロールの位置で決まる）
  let MK=[];
  function marks(){MK=[];const add=(el,t)=>{if(el)MK.push([el,t])};
    add(document.getElementById('sdHero'),'field');
    const LY={0:'umwelt',1:'umwelt',2:'umwelt',3:'umwelt',4:'network',5:'network',6:'layers',7:'ring'},seen={};
    document.querySelectorAll('#qStory [data-ly]').forEach(p=>{const v=p.dataset.ly;if(seen[v])return;seen[v]=1;add(p,LY[v]||'field')});
    add(document.getElementById('qloop'),'none');
    document.querySelectorAll('.tp-lab .tp-chh').forEach(h=>add(h.parentNode,{M:'lit',F:'eng'}[h.dataset.k]||'none'));
    add(document.querySelector('section.nx'),'none')}
  function active(){if(FIX)return FIX;let t='field';for(const m of MK){if(m[0].getBoundingClientRect().top<H*0.62)t=m[1];else break}const top=document.getElementById('top');if(top&&!top.classList.contains('active'))t='none';return t}
  // ── 輪：物語の終わりで線が輪になり、Qualium-Physium ループの円へつながる
  const R0=document.querySelector('#qStory [data-ly="7"]'),R1=document.querySelector('#qloop .ql-c');
  function ring(){
    if(!R0||!R1)return null;const a=R0.getBoundingClientRect(),b=R1.getBoundingClientRect();if(!b.width)return null;
    const rest=H*0.6,rc=b.top+b.height*(R1.dataset.cy?+R1.dataset.cy:0.5),d0=H*0.9-a.top;if(d0<=0||rc<-H)return null;
    const t=rc<=rest?1:cl(d0/(d0+(rc-rest))),e=t*t*(3-2*t),cr=R1.dataset.r?+R1.dataset.r:0.4394;
    return{t,e,x:b.left+b.width*(R1.dataset.cx?+R1.dataset.cx:0.5),y:Math.min(rc,rest),R:b.width*cr,out:cl((rest-rc)/(H*0.85))}}
  const al={},pr={};Object.keys(D).forEach(k=>{al[k]=0;pr[k]=0});
  let cur='field',raf=0,tagA=0,tagK='',ringA=0,lastRg=null;
  function draw(){
    raf=0;lblBusy=false;cx.setTransform(DPR,0,0,DPR,0,0);cx.clearRect(0,0,W,H);koRead();
    let busy=false,mx=0;for(const k in D)if(k!==cur)mx=Math.max(mx,al[k]);
    for(const k in D){const tg=k===cur?1:0;   // 移りは溶け合う：前の主題が薄れるあいだに次が重なって現れる
      if(rm){al[k]=k===cur?1:0;pr[k]=al[k]}else{al[k]+=(tg-al[k])*(tg?0.024:0.03);if(Math.abs(tg-al[k])<0.01)al[k]=tg;if(k===cur)pr[k]=Math.min(1,pr[k]+(k==='umwelt'?0.006:0.012));else if(al[k]===0)pr[k]=0}
      if(al[k]>0)D[k](al[k],pr[k]);
      if(al[k]!==tg||(k===cur&&pr[k]<1))busy=true}
    lens.style.opacity=(al.umwelt*0.92*LC.a).toFixed(3);
    let rg=cur==='ring'||cur==='none'?ring():null;const rt=rg&&rg.out<1?1:0;ringA+=(rt-ringA)*0.06;if(Math.abs(rt-ringA)<0.01)ringA=rt;else lblBusy=true;
    if(rg)lastRg=rg;else if(ringA>0)rg=lastRg;
    if(rg&&ringA>0){const N=5,Aa=Math.min(1,rg.t*4)*(1-rg.out)*ringA;
      for(let k=0;k<N;k++){const g=1-rg.e,rx=rg.R*(1+0.16*(N-1-k)*g),ry=rx*(0.2+0.8*rg.e),y=rg.y-(k-(N-1)/2)*H*0.035*g,sw=Math.PI*2*Math.min(1,0.25+rg.t*1.1),s0=-Math.PI/2+k*1.26*g;
        ell([rg.x,y],rx,ry,k%2?BR:CY,Aa*(0.5-k*0.05),k===N-1?1.4:1,s0,s0+sw)}}
    if(KO.length){cx.save();cx.globalCompositeOperation='destination-out';[[18,.25],[12,.35],[6,.5],[0,1]].forEach(e=>{cx.fillStyle='rgba(0,0,0,'+e[1]+')';KO.forEach(q=>cx.fillRect(q[0]-e[0],q[1]-e[0],q[2]-q[0]+e[0]*2,q[3]-q[1]+e[0]*2))});cx.restore()}
    // 隅の一語（主題の名）
    const nm=NAME[cur];if(nm){tagK=cur}tagA+=((nm?1:0)-tagA)*(rm?1:0.1);if(Math.abs((nm?1:0)-tagA)<0.02)tagA=nm?1:0;else busy=true;
    if(tagA>0&&NAME[tagK]){const n=NAME[tagK],x=sp()?16:24,y=H*(sp()?0.93:0.9);ln([[x,y],[x+18,y]],CY,tagA*0.85,1);tx(en()?n[1]:n[1]+'　'+n[0],[x+26,y],WH,tagA*0.9,{s:11.5,ls:2,fixed:1})}
    if((busy||lblBusy)&&!rm)raf=requestAnimationFrame(draw);
  }
  const kick=()=>{const t=active();if(t!==cur)cur=t;if(!raf)raf=requestAnimationFrame(draw)};
  size(1);marks();cur=active();draw();
  addEventListener('scroll',kick,{passive:true});
  let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{size();marks();kick()},120)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)kick()});
  document.addEventListener('click',()=>setTimeout(()=>{marks();kick()},80));
  new MutationObserver(kick).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{size(1);kick()});
}
