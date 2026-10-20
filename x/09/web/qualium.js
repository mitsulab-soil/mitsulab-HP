/* 氷川幽玄：場所に結びつける手がかり。点・波・関係線は創作した模式で、実測値ではない。 */
(() => {
  const states = {information:true, cognition:true, language:true, senses:true, trees:true, water:true, terrain:true, time:true, life:true, culture:true};
  const names = {information:'情報', cognition:'認知', language:'言語', senses:'感覚',trees:'木',water:'水',terrain:'地形',time:'時間',life:'生物',culture:'文化'};
  const visualIds=Object.keys(states);
  const extraIds=['folk','social','history','ecology','environment','art','events','body','fiction'];
  Object.assign(states,Object.fromEntries(extraIds.map(id=>[id,true])));
  Object.assign(names,{folk:'民俗',social:'社会',history:'歴史',ecology:'生態',environment:'環境',art:'芸術',events:'催事',body:'身体',fiction:'創作'});
  /* 2026-10-19 本人「層が多すぎるので整理してください。多くても３〜５個くらいがいいです。」：見せる層は 3 つ。中の手がかり（模式の線・資料）は消さず、層ごとにまとめて ON/OFF する。
     時代・身体は別のつまみがあるので層に立てない（生きものの感じ方の資料は「自然」に入り、各記録から身体のつまみへ切り替えられる）。
     資料の記載／mitsulabの見方／創作は、層ではなく記録ごとの印。 */
  const LAYERS=[
    {id:'nature',name:'自然',ids:['trees','water','terrain','life','senses','ecology','environment','body'],desc:'自然：地形・水・植生・生き物。木の根もと・水の流れ・地形の断面・生き物の線は模式で、根・水質・生息の測定ではありません。生きものの感じ方の研究の要約もここに入ります（この参道で測った値や主観の再現ではありません）。'},
    {id:'history',name:'歴史',ids:['time','history'],desc:'歴史：中山道・地誌・由緒・時代の景観の資料。記録を読む目盛りの高さは年数ではありません。'},
    {id:'culture',name:'暮らしと文化',ids:['culture','folk','social','art','events','fiction'],desc:'暮らしと文化：民俗・社会・芸術・催事と、mitsulabの創作の一場面。鳥居・石・道などの関係の線は、意味や信仰の測定ではありません。'}
  ];
  const BASE_IDS=['information','cognition','language'];   /* 目印の点群・離れた手がかりを結ぶ線・地点名の札：どれかの層が ON なら出す */
  const layerOn=Object.fromEntries(LAYERS.map(l=>[l.id,true]));
  function applyLayers(){for(const l of LAYERS)for(const id of l.ids)states[id]=layerOn[l.id];const any=LAYERS.some(l=>layerOn[l.id]);for(const id of BASE_IDS)states[id]=any;}
  const enabledIds=LAYERS.map(l=>l.id);
  let perspectiveChoices='',nearbyKey='',nearbyAt=0;
  const explain = {
    information:'情報：木や石の位置から立ち上がる点群と目盛り。記録を重ねる模式です。',
    cognition:'認知：場所へ注意を向け、離れた手がかりを結ぶ線。心の測定ではありません。',
    language:'言語：既存の案内名と場所を結びます。距離は3D模型内の直線距離です。',
    senses:'感覚：手がかりを光と波へ変える模式。音や振動の実測ではありません。'
  };
  Object.assign(explain,{trees:'木：樹木の案内地点で、幹から土へつながる関係を模式表示。根の実測ではありません。',water:'水：水に関する案内地点で、流れを考える線。現在の流量・水質の測定ではありません。',terrain:'地形：3D模型の地面から断面を抽出。現地測量そのものではありません。',time:'時間：歴史に関する案内地点に、記録を読む目盛り。高さは年数ではありません。',life:'生物：生き物に関する既存解説の位置を示す線。いまの生息・個体検出ではありません。',culture:'文化：鳥居・石・道など、既存の解説を持つ物どうしの関係。意味や信仰の測定ではありません。'});
  const baseText = '地理資料を基にした3D再構成。現地の実写そのものではありません。';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const panel = document.createElement('section');
  panel.id = 'qualiumPanel'; panel.setAttribute('aria-label', '場の手がかり');
  panel.innerHTML = `<p>Qualia Layer を重ねる</p><p>同じ場所に、自然・歴史・暮らしと文化の手がかりを重ねます。時代と身体は、となりのつまみで替えられます。</p><div class="qBulk"><button type="button" id="qualiumAll">すべてON</button><button type="button" id="qualiumReset">すべてOFF</button></div><div class="qualiumChoices">${LAYERS.map(l => `<label><input type="checkbox" data-layer="${l.id}" aria-label="${l.name}の層">${l.name}<small data-count="${l.id}"></small></label>`).join('')}</div><p class="qMarks">記録ごとの印：資料の記載／mitsulabの見方／創作</p><p id="qualiumMeaning" role="status"></p><label class="qStill"><input type="checkbox" id="qualiumStill">動きを止める</label><details><summary>この場所の文化記録</summary><p id="qualiumCultureRecord">近くの記録は、歩いた場所に合わせて表示します。</p></details><details><summary>表示の意味と出どころ</summary><div id="qualiumExplanations"></div><p>${baseText} 点・波・関係線は模式です。木の根や水質・生息・心を測定した表示ではありません。地形線は3D模型から抽出。典拠は各地点の解説で確かめてください。</p><a class="qAR" href="field-ar.html">実景ARへ ↗</a></details>`;
  panel.querySelector('#qualiumExplanations').innerHTML=[...LAYERS.map(l=>l.desc),'どの層でも：木や石の位置から立ち上がる点群と目盛り、離れた手がかりを結ぶ線、既存の案内名の札を出します（すべてOFFにすると、これも消えます）。記録を重ねる模式で、心の測定ではありません。距離は3D模型内の直線距離です。'].map(t=>`<p>${t}</p>`).join('');
  const rail = document.createElement('details');
  rail.id = 'qualiumControl'; rail.hidden = true;
  rail.innerHTML='<summary>レイヤー</summary>';rail.append(panel);document.body.append(rail);
  const style = document.createElement('style');
  style.textContent = `
#qualiumPanel{padding:10px;border-bottom:1px solid #365651;margin-bottom:14px;font-size:13px;line-height:1.8;color:#d8e9e3}#qualiumPanel h3{font-weight:400;margin:4px 0;font-size:17px;letter-spacing:.12em}#qualiumPanel p{margin:8px 0}.qualiumChoices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 6px}.qualiumChoices label small{font:11px ui-monospace,monospace;color:#9fbfb4;margin-left:2px}#qualiumPanel .qMarks{font-size:12px;color:#b7cac1;margin:4px 0 0}.qBulk{display:flex;gap:8px}.qBulk button{flex:1;justify-content:center;border:1px solid #6e9b8b;background:#254a3d55;color:#e4f2eb;font:inherit}.qualiumChoices label,#qualiumPanel summary,#qualiumPanel .qStill{min-height:44px;display:inline-flex;align-items:center;gap:8px}#qualiumPanel input{width:20px;height:20px;accent-color:#91d7ca}#qualiumPanel button,#qualiumPanel .qAR{min-height:44px;display:inline-flex;align-items:center}#qualiumPanel .qAR{color:#b3e2d8;letter-spacing:.1em;text-decoration:none;border-bottom:1px solid #53786d;gap:20px}#qualiumPanel details{font-size:12px;color:#a3bdb4}#qualiumPanel :focus-visible,#qualiumRail :focus-visible{outline:2px solid #ead9ac;outline-offset:3px}
#qualiumRail{max-height:58vh;overflow-y:auto;scrollbar-width:thin;position:fixed;right:max(8px,env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);z-index:7;display:flex;flex-direction:column;align-items:stretch;width:48px;color:#b5d8cc;pointer-events:auto;border-left:1px solid #47665a66;background:linear-gradient(90deg,#07151200,#071512bf)}#qualiumRail[hidden]{display:none!important}#qualiumRail button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;width:48px;min-height:44px;padding:4px 0;border:0;border-radius:0;color:#b5d8cc;background:transparent;cursor:pointer;font:400 12px/1.2 "Hiragino Sans",sans-serif;letter-spacing:.1em;touch-action:manipulation}#qualiumRail button small{font:9px/1.4 ui-monospace,monospace;color:#7a9d92;letter-spacing:.1em}#qualiumRail button[aria-pressed=true]{color:#e9f7ed;background:linear-gradient(90deg,#4eaf8d36,transparent)}#qualiumRail button[aria-pressed=true]::before{content:"";position:absolute;left:-1px;top:10px;bottom:10px;width:2px;background:#c4d9a2}#qualiumRail .qCaption{text-align:center;font:8px/16px ui-monospace,monospace;letter-spacing:.12em;color:#a5c0b4}#qualiumRail .qModel{font-size:9px;letter-spacing:.25em}body.ovOn #qualiumRail,body.mkOn #qualiumRail,body:has(#menu:not([hidden])) #qualiumRail,body:has(#minimap.big) #qualiumRail,body:has(#journeyPanel>details[open]) #qualiumRail{display:none}
@media(max-width:820px){#qualiumRail{right:4px;width:44px}#qualiumRail button{width:44px;min-height:44px}}@media(max-height:520px){#qualiumRail{top:auto;bottom:8px;transform:none;flex-direction:row;width:auto}#qualiumRail .qCaption{display:none}#qualiumRail button{width:44px}}
`;
  document.head.append(style);
  const still = panel.querySelector('#qualiumStill'); still.checked = reduced.matches;
  function sync() {
    applyLayers();
    for (const l of LAYERS) { const input=panel.querySelector(`[data-layer="${l.id}"]`); if(input) input.checked=layerOn[l.id]; }
    panel.querySelector('#qualiumMeaning').textContent = `${LAYERS.filter(l=>layerOn[l.id]).length} / ${LAYERS.length} 層を表示`;
  }
  panel.addEventListener('change', event => {
    const id = event.target.dataset.layer;
    if (id in layerOn) { layerOn[id] = event.target.checked; nearbyAt=0; nearbyKey=''; sync(); const l=LAYERS.find(x=>x.id===id); panel.querySelector('#qualiumMeaning').textContent += `　${l.name}の手がかりを${layerOn[id]?'出しました':'隠しました'}`; }
  });
  panel.querySelector('#qualiumAll').onclick=()=>{Object.keys(layerOn).forEach(id=>layerOn[id]=true);nearbyAt=0;nearbyKey='';sync();};
  panel.querySelector('#qualiumReset').onclick = () => { Object.keys(layerOn).forEach(id => {layerOn[id] = false;}); nearbyAt=0;nearbyKey='';sync(); };

  const records=document.createElement('section');records.id='placePerspectiveRecords';records.hidden=true;records.setAttribute('aria-label','この周辺の資料と見方');panel.append(records);
  const extraStyle=document.createElement('style');extraStyle.textContent=`#placePerspectiveRecords{border-top:1px solid #638c9766;margin-top:12px;padding-top:8px}#placePerspectiveRecords h3{font-size:13px;letter-spacing:.06em;color:#baded7;font-weight:400}#placePerspectiveRecords article{padding:9px 0;border-top:1px solid #5e808433}#placePerspectiveRecords h4{font-size:14px;line-height:1.6;font-weight:400;color:#e3ebe5;margin:2px 0}#placePerspectiveRecords p{font-size:13px;line-height:1.8;margin:4px 0;color:#d0dedb}#placePerspectiveRecords small{display:block;font-size:11.5px;line-height:1.7;color:#b3c3ba}#placePerspectiveRecords a{display:block;min-height:44px;color:#a7d7d0;text-decoration:underline;text-underline-offset:3px;font-size:12px;line-height:1.7;padding:5px 0}.qPerspectiveGroup label small{font:10px ui-monospace,monospace;color:#9fbfb4;margin-left:auto}.qBodyTry{display:flex;align-items:center;min-height:44px;margin:6px 0;padding:0 12px;border:1px solid #6e9b8b;background:#254a3d55;color:#e4f2eb;font:inherit;font-size:13px;letter-spacing:.06em;cursor:pointer}.qPerspectiveHint{font-size:12px;color:#b7cac1}#placePerspectiveRecords .qRecordsFoot{font-size:12px;color:#b3c3ba;border-top:1px solid #5e808433;padding-top:8px}`;document.head.append(extraStyle);
  function mountPerspectiveChoices(){const api=window.__placePerspectives,st=api?.status();if(!st?.ready)return;const key=String(st.items);if(key===perspectiveChoices)return;perspectiveChoices=key;
   for(const l of LAYERS){const c=api.countFor?api.countFor(l.ids):0,el=panel.querySelector(`[data-count="${l.id}"]`);if(el){el.textContent=c?c+'件':'';el.setAttribute('aria-label','資料と見方 '+c+' 件');}}
   panel.querySelectorAll('.qPerspectiveHint').forEach(e=>e.remove());const hint=document.createElement('p');hint.className='qPerspectiveHint';hint.textContent='数は、その層の資料と見方の件数。いくつかの層にまたがる記録は、どれかの層がONなら一度だけ出ます。生きものの感じ方は研究の要約で、この参道で測った値や主観の再現ではありません。';records.before(hint);sync();nearbyKey='';
  }
  // Retry only from the existing visible/start frame; no timer or additional loop.
  function createPerspectiveRetry({now,isAllowed,importModule,onReady}){
    let module=null,job=null,pending=false,ready=false,attempts=0,nextAt=0,error=null;
    const history=[];
    async function run(attempt){let stage=module?'fetch':'import';try{
      if(!module)module=await importModule(attempt);
      if(!isAllowed()){attempts--;return;}
      stage='fetch';const api=await module.loadPerspectives(),state=api.status();
      if(!state.ready)throw Error(state.errors.join(' / ')||'資料を取得できませんでした');
      ready=true;error=null;nextAt=0;onReady();
    }catch(e){error=e.message||String(e);history.push({attempt,stage,error,at:now()});nextAt=attempts<3?now()+(attempts===1?3000:8000):0;
    }finally{pending=false;job=null;}}
    return{tick(){if(pending)return job;if(ready||attempts>=3||now()<nextAt||!isAllowed())return;pending=true;const attempt=++attempts;job=run(attempt);return job;},status:()=>({ready,pending,attempts,nextAt,error,exhausted:!ready&&!pending&&attempts>=3,history:history.map(x=>({...x}))})};
  }
  const perspectiveRetry=createPerspectiveRetry({now:()=>performance.now(),isAllowed:()=>!document.hidden&&!!document.getElementById('start')?.hidden&&window.__talk?.mode==='sim'&&!document.body.classList.contains('ovOn')&&!!window.__entryFirstFrameAt&&performance.now()-__entryFirstFrameAt>=1800,importModule:attempt=>import('./place-perspectives.js?v=20261019layers3'+(attempt>1?'&retry='+attempt:'')),onReady:mountPerspectiveChoices});
  function loadPerspectiveData(){perspectiveRetry.tick();}
  function nearbyPerspectives(talk){const now=performance.now();if(now<nearbyAt)return;nearbyAt=now+400;const api=window.__placePerspectives;if(!api?.status().ready)return;mountPerspectiveChoices();const list=api.near(talk.d,talk,states,6),key=list.map(r=>r.id+':'+r.category).join('|');if(key===nearbyKey)return;nearbyKey=key;records.replaceChildren();records.hidden=!list.length;if(!list.length)return;const title=document.createElement('h3');title.textContent='この周辺の資料と見方';records.append(title);for(const r of list){const article=document.createElement('article'),h=document.createElement('h4'),text=document.createElement('p'),note=document.createElement('small');h.textContent=(r.categoryName===r.meaning?r.categoryName:r.categoryName+' · '+r.meaning)+' ｜ '+r.title.replace(/^(mitsulabの見方|創作)[：:]/,'');text.textContent=r.text;note.textContent=[r.time?.dateLabel,r.evidenceLimit].filter(Boolean).join('。');article.append(h,text);if(r.question){const question=document.createElement('p');question.textContent='mitsulabの問い：'+r.question;article.append(question);}article.append(note);for(const src of r.sourceInfo){const link=document.createElement('a');link.href=src.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=(src.publisher?src.publisher+' · ':'')+src.title+' ↗';article.append(link);}if(r.bodyMode&&window.__body?.B?.[r.bodyMode]){const nm=window.__body.B[r.bodyMode].name,bt=document.createElement('button');bt.type='button';bt.className='qBodyTry';bt.textContent=nm+'の身体で歩いてみる（模式）';bt.setAttribute('aria-label',nm+'の身体の表示に切り替える。受けとれる信号の置きかえの模式で、主観の再現ではありません');bt.onclick=()=>{window.__body.set(r.bodyMode);};article.append(bt);}if(r.category==='fiction'){const author=document.createElement('small');author.textContent='mitsulabの創作。現地の実物・観測値・実際の催しではありません。';article.append(author);}records.append(article);}const foot=document.createElement('p');foot.className='qRecordsFoot';foot.textContent='場所は、作品の語りの地点に結んだもの。出来事の起きた位置や現物の正確な座標とは限りません。';records.append(foot);}
  addEventListener('place-perspectives-ready',mountPerspectiveChoices);
  sync();
  const colors = {information:0x8edbc9,cognition:0xdab77b,language:0xe1e5cd,senses:0x80cbd3,trees:0xa0cf8d,water:0x82cce2,terrain:0xc5ae87,time:0xe5be83,life:0xc1d9ab,culture:0xdccfa6};
  let root, links, future, pools = [], clock = 0, last = 0, lastPick = -Infinity;
  let forward, offset, activeCount = 0,cultureApplied;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function segments(T, positions, color, opacity) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    return new T.LineSegments(geometry,new T.LineBasicMaterial({color,transparent:true,opacity,depthTest:true,depthWrite:false,toneMapped:false}));
  }
  function makeScene(T, scene) {
    root = new T.Group(); root.name = 'Qualium: object-anchored symbolic layers'; root.visible = false; scene.add(root);
    forward = new T.Vector3(); offset = new T.Vector3();
    const pointMaterial = new T.PointsMaterial({color:colors.information,size:.065,sizeAttenuation:true,transparent:true,opacity:.85,depthTest:true,depthWrite:false,toneMapped:false});
    const waveMaterial = new T.LineBasicMaterial({color:colors.senses,transparent:true,opacity:.68,depthTest:true,depthWrite:false,toneMapped:false});
    for (let index = 0; index < 3; index++) {
      const slot = {anchor:new T.Group(), groups:{}, mark:null, label:'', labelAt:0, waves:[]};
      root.add(slot.anchor); pools.push(slot);
      for (const id of visualIds) { slot.groups[id] = new T.Group(); slot.groups[id].scale.y=.65; slot.anchor.add(slot.groups[id]); }
      // A local vertical scale rises from the object's existing anchor. These ticks are graphical, not height measurements.
      const ruler = [0,0,0, 0,3.35,0, 0,3.35,0, 1.3,3.35,0, 0,0,0, .3,.12,.18];
      for(let y=0;y<=12;y++){const h=y*.25;ruler.push(0,h,0,y%4===0?.28:.12,h,0);}
      ruler.push(.85,.2,-.55,.85,2.3,-.55, .85,2.3,-.55,1.12,2.3,-.55);
      slot.groups.information.add(segments(T,ruler,colors.information,.68));
      const points=[];
      for(let i=0;i<72;i++){
        const column=i%6, row=Math.floor(i/6), jitter=Math.sin(i*17.3+index)*.04;
        points.push(.18+column*.15+jitter,.18+row*.22,Math.sin(i*7.1)*.3-.2);
      }
      const pointGeometry=new T.BufferGeometry();pointGeometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
      slot.groups.information.add(new T.Points(pointGeometry,pointMaterial));
      // Open corners and a short displaced trace suggest attention without enclosing the scenery in circles.
      const brackets=[];
      for(const sign of [-1,1]){
        const x=sign*.85,z=sign*.35;
        brackets.push(x,.05,z,x,.6,z, x,.05,z,x-sign*.3,.05,z,
          x,1.75,z,x,2.25,z, x,2.25,z,x-sign*.3,2.25,z);
      }
      brackets.push(-.2,.9,.2, .3,1.3,.1, .3,1.3,.1,.65,1.95,-.15);
      slot.groups.cognition.add(segments(T,brackets,colors.cognition,.74));
      // Six contextual layers. Shapes express a relation, never an observed root, animal or water flow.
      const roots=[];for(let j=0;j<5;j++){const a=j/5*Math.PI*2;roots.push(0,.15,0,Math.cos(a)*.7,-.12,Math.sin(a)*.7,Math.cos(a)*.7,-.12,Math.sin(a)*.7,Math.cos(a)*1.6,-.18,Math.sin(a)*1.6);}
      slot.groups.trees.add(segments(T,roots,colors.trees,.7));
      const flow=[];for(let j=0;j<3;j++)for(let i=0;i<8;i++){let x=-1+i*.26;flow.push(x,.12+j*.14,Math.sin(i*.8+j)*.2,x+.2,.12+j*.14,Math.sin((i+1)*.8+j)*.2);}
      slot.groups.water.add(segments(T,flow,colors.water,.8));
      const years=[];for(let j=0;j<6;j++){const y=j*.4;years.push(.75,y,0,1.25,y,0);}years.push(.85,0,0,.85,2,0);slot.groups.time.add(segments(T,years,colors.time,.75));
      slot.groups.life.add(segments(T,[-.8,.1,0,-.4,.7,.1,-.4,.7,.1,.2,1,.2,.2,1,.2,.6,1.7,.1,.2,1,.2,-.3,1.5,-.15],colors.life,.7));
      slot.groups.culture.add(segments(T,[-1,.1,-.4,-1,1.5,-.4,-1,1.5,-.4,.8,1.5,-.4,.8,1.5,-.4,.8,.1,-.4],colors.culture,.55));
      slot.terrainLine=segments(T,new Float32Array(12*6),colors.terrain,.85);slot.groups.terrain.scale.y=1;slot.groups.terrain.add(slot.terrainLine);

      const leader = segments(T,[0,.08,0, .45,1.6,.12, .45,1.6,.12,1.1,1.6,.12],colors.language,.5);
      slot.groups.language.add(leader);
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
      const texture=new T.CanvasTexture(canvas); texture.colorSpace=T.SRGBColorSpace;
      slot.canvas=canvas;slot.texture=texture;
      const label=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,toneMapped:false}));
      label.position.set(1.85,1.96,.12);label.scale.set(3.5,1.346,1);slot.groups.language.add(label);slot.sprite=label;
      for(let k=0;k<3;k++){
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(33*3),3));
        const wave=new T.Line(geometry,waveMaterial);wave.frustumCulled=false;slot.groups.senses.add(wave);slot.waves.push(wave);
      }
    }
    links=segments(T,new Float32Array(24),colors.cognition,.3);links.frustumCulled=false;root.add(links);
    // Future remains an explicitly imagined layer; its particles rise at the same object anchors.
    const futurePositions=[];
    for(let i=0;i<96;i++)futurePositions.push(Math.sin(i*2.41)*(1.4+(i%7)*.2),(i%32)*.14,Math.cos(i*3.1)*1.5);
    const futureGeometry=new T.BufferGeometry();futureGeometry.setAttribute('position',new T.Float32BufferAttribute(futurePositions,3));
    future=new T.Points(futureGeometry,new T.PointsMaterial({color:0xa1cfc4,size:.035,transparent:true,opacity:.32,depthWrite:false}));root.add(future);
  }
  function refreshAnchors(T,talk,camera,now) {
    camera.getWorldDirection(forward);
    const candidates=[];
    for(const mark of talk.MARKS||[]) {
      const horizontal=mark.wp||(mark.at&&talk.toWorld(mark.at.d,mark.at.s));
      if(!horizontal||![horizontal.x,horizontal.z].every(Number.isFinite))continue;
      if(Math.hypot(horizontal.x-camera.position.x,horizontal.z-camera.position.z)>52)continue;
      const ground=mark.y??window.__core.groundY(horizontal.x,horizontal.z);
      const y=(Number.isFinite(ground)?ground:camera.position.y-1.6)+.15;
      const point={x:horizontal.x,y,z:horizontal.z};
      offset.set(point.x-camera.position.x,point.y-camera.position.y,point.z-camera.position.z);
      const distance=offset.length();
      if(distance<2||distance>52||offset.dot(forward)<distance*.2)continue;
      candidates.push({mark,distance,point});
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    activeCount=Math.min(3,candidates.length);
    if(!activeCount){pools.forEach(slot=>{slot.anchor.visible=false;slot.mark=null;});return;}
    const origin=candidates[0].point;root.position.set(origin.x,origin.y,origin.z);
    for(let i=0;i<pools.length;i++){
      const slot=pools[i], chosen=candidates[i];slot.anchor.visible=!!chosen;
      if(!chosen){slot.mark=null;continue;}
      const mark=chosen.mark,p=chosen.point;
      slot.anchor.position.set(p.x-origin.x,p.y-origin.y,p.z-origin.z);
      // Face only the local annotation, never change the real object's orientation or position.
      slot.anchor.rotation.y=Math.atan2(camera.position.x-p.x,camera.position.z-p.z);
      slot.mark=mark;
      const text=String(mark.s?.tag||mark.s?.title||mark.el?.getAttribute('aria-label')||'');
      slot.context={trees:/木|杉|松|葉|根|樹|並木|森|杜/.test(text),water:/水|池|川|溝|橋|湿/.test(text),terrain:true,time:/鳥居|石|碑|灯|燈|平成|江戸|縄文|昭和/.test(text),life:/生物|鳥|虫|蝶|チョウ|ケヤキ|クスノキ|エノキ|地衣|葉|樹/.test(text),culture:/鳥居|石|碑|灯|燈|道|参道|社/.test(text)};
      // Sample the reconstructed terrain in world space, then express it in this annotation's local coordinates.
      const terrainPositions=slot.terrainLine.geometry.attributes.position, local=new T.Vector3();
      slot.anchor.updateWorldMatrix(true,false);
      let v=0;for(let k=0;k<12;k++)for(const x of [-3+k*.5,-2.5+k*.5]){const gy=window.__core.groundY(p.x+x,p.z);local.set(p.x+x,Number.isFinite(gy)?gy+.08:p.y,p.z);slot.anchor.worldToLocal(local);terrainPositions.setXYZ(v++,local.x,local.y,local.z);}terrainPositions.needsUpdate=true;
      const label=mark.s?.tag||mark.el?.getAttribute('aria-label')?.replace(/（.*$/,'')||'この場所';
      const distance=`3D距離 ${Math.round(chosen.distance)} m`;
      const key=label+'|'+distance;
      if(key!==slot.label && now-slot.labelAt>900){
        slot.label=key;slot.labelAt=now;
        const ctx=slot.canvas.getContext('2d');ctx.clearRect(0,0,768,192);ctx.shadowColor='#041310';ctx.shadowBlur=5;
        ctx.fillStyle='#dce8d9';ctx.font='400 42px "Hiragino Mincho ProN",serif';ctx.textAlign='left';
        const text=String(label).slice(0,20);ctx.fillText(text,18,78,720);
        ctx.fillStyle='#a2cfc1';ctx.font='24px "Hiragino Sans",sans-serif';ctx.fillText(distance+'  /  地点の札',20,132);
        ctx.fillStyle='#b5d0bb';ctx.fillRect(20,157,440,1);ctx.fillStyle='#d9b67b';ctx.fillRect(20,155,32,3);
        slot.texture.needsUpdate=true;
      }
      slot.sprite.material.opacity=clamp((chosen.distance-2)/3,.1,1);
    }
    const positions=links.geometry.attributes.position;
    let count=0;
    for(let i=1;i<activeCount;i++){
      const a=pools[i-1].anchor.position,b=pools[i].anchor.position;
      // Rise from the two object anchors; the intermediate point stays in world space.
      positions.setXYZ(count++,a.x,a.y+1.3,a.z);
      positions.setXYZ(count++,(a.x+b.x)*.5,Math.max(a.y,b.y)+2.4,(a.z+b.z)*.5);
      positions.setXYZ(count++,(a.x+b.x)*.5,Math.max(a.y,b.y)+2.4,(a.z+b.z)*.5);
      positions.setXYZ(count++,b.x,b.y+1.3,b.z);
    }
    links.geometry.setDrawRange(0,count);positions.needsUpdate=true;
  }
  function animateWaves(time) {
    for(const slot of pools){
      if(!slot.anchor.visible)continue;
      for(let k=0;k<slot.waves.length;k++){
        const positions=slot.waves[k].geometry.attributes.position;
        for(let i=0;i<33;i++){
          const y=i/32*2.8, envelope=Math.sin(i/32*Math.PI)*.22;
          positions.setXYZ(i,-.6+k*.24+Math.sin(y*3.8-time*1.4+k*1.7)*envelope,y,Math.cos(y*2.6-time+k)*.18);
        }
        positions.needsUpdate=true;
      }
    }
  }
  window.__qualiumFrame = (scene,camera) => {
    const core=window.__core,T=core?.THREE,talk=window.__talk;
    if(!T||!talk)return;
    const started=!!document.getElementById('start')?.hidden;
    const available=started&&talk.mode==='sim'&&!document.body.classList.contains('ovOn');
    if(rail.hidden===available)rail.hidden=!available;
    if(available&&window.__cult&&cultureApplied!==states.culture){cultureApplied=states.culture;const desired=cultureApplied;setTimeout(()=>window.__cult?.set(desired),250);}
    const isFuture=window.__r21?.era?.()==='future';
    if(available&&!document.hidden){loadPerspectiveData();nearbyPerspectives(talk);}
    const shown=available&&LAYERS.some(l=>layerOn[l.id])&&!document.hidden;
    if(!shown){if(root)root.visible=false;last=0;return;}
    if(!root)makeScene(T,scene);
    const now=performance.now();
    const frozen=still.checked||reduced.matches;
    if(last && now-last<50)return;
    const delta=last?Math.min((now-last)/1000,.1):0;last=now;
    if(!frozen)clock+=delta;
    if(now-lastPick>=400){refreshAnchors(T,talk,camera,now);lastPick=now;const nearest=[...(window.__cult?.labels||[])].sort((a,b)=>a.p.distanceToSquared(camera.position)-b.p.distanceToSquared(camera.position))[0];if(nearest)panel.querySelector('#qualiumCultureRecord').textContent=nearest.el.textContent;}
    root.visible=activeCount>0;
    const monitorIds=new Set((window.__fieldVisions?.status().anchors||[]).map(a=>a.id));
    for(const slot of pools){for(const id of visualIds)slot.groups[id].visible=states[id]&&(slot.context?.[id]??true);slot.sprite.visible=!monitorIds.has(slot.mark?.s?.id);}
    links.visible=states.cognition&&activeCount>1;future.visible=isFuture&&states.information;
    if(states.senses)animateWaves(clock);
    future.position.y=Math.sin(clock*.45)*.1;
  };
  window.__qualium={states,layers:LAYERS,layerOn,setLayer(id,on){if(id in layerOn){layerOn[id]=!!on;nearbyAt=0;nearbyKey='';sync();}},panel,rail,get availableIds(){return [...enabledIds];},get visible(){return !!root?.visible;},get count(){return root?.children.length||0;},get anchors(){return pools.filter(slot=>slot.mark).map(slot=>slot.mark.s?.tag||'この場所');},get time(){return clock;},get diagnostics(){return {anchors:activeCount,particles:activeCount*72+(future?.visible?96:0),extraLoop:false,perspectiveError:perspectiveRetry.status().error,perspectiveRetry:perspectiveRetry.status()};}};
})();
