/* 氷川幽玄：場所に結びつける四層。点・波・関係線は創作した模式で、実測値ではない。 */
(() => {
  const states = {information:false, cognition:false, language:false, senses:false};
  const names = {information:'情報', cognition:'認知', language:'言語', senses:'感覚'};
  const codes = {information:'01', cognition:'02', language:'03', senses:'04'};
  const explain = {
    information:'情報：木や石の位置から立ち上がる点群と目盛り。記録を重ねる模式です。',
    cognition:'認知：場所へ注意を向け、離れた手がかりを結ぶ線。心の測定ではありません。',
    language:'言語：既存の案内名と場所を結びます。距離は3D模型内の直線距離です。',
    senses:'感覚：手がかりを光と波へ変える模式。音や振動の実測ではありません。'
  };
  const baseText = '地理資料を基にした3D再構成。現地の実写そのものではありません。';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const panel = document.createElement('section');
  panel.id = 'qualiumPanel'; panel.setAttribute('aria-label', 'Qualiumの層');
  panel.innerHTML = `<h3>場所に、世界を重ねる</h3><p>木や石から、情報・認知・言語・感覚の手がかりが立ち上がります。</p><div class="qualiumChoices">${Object.keys(states).map(id => `<label><input type="checkbox" data-qualium="${id}">${names[id]}</label>`).join('')}</div><p id="qualiumMeaning" role="status">${baseText}</p><label class="qStill"><input type="checkbox" id="qualiumStill">層の動きを止める</label><button type="button" id="qualiumReset" class="ib">層を外す</button><p><a class="qAR" href="field-ar.html">実景ARへ <span aria-hidden="true">↗</span></a></p><details><summary>出どころと限界</summary><p>点群・目盛り・関係線・波は創作した模式です。物の実測形状や、心・感覚の再現ではありません。言語の札には既存の案内名を使います。「3D距離」は模型内の直線距離で、現地の測量値ではありません。観測や歴史の根拠は各地点の解説と出典で確かめてください。現地モードでは、この3D演出を表示しません。</p></details>`;
  const rail = document.createElement('nav');
  rail.id = 'qualiumRail'; rail.hidden = true; rail.setAttribute('aria-label','重ねる層');
  rail.innerHTML = `<span class="qCaption" aria-hidden="true">LAYERS</span>${Object.keys(states).map(id => `<button type="button" data-qualium="${id}" aria-pressed="false" aria-label="${names[id]}の層を重ねる"><small aria-hidden="true">${codes[id]}</small><span>${names[id]}</span></button>`).join('')}<span class="qCaption qModel">模式</span>`;
  const style = document.createElement('style');
  style.textContent = `
#qualiumPanel{padding:10px 0 16px;border-bottom:1px solid #365651;margin-bottom:14px;font-size:13px;line-height:1.8;color:#d8e9e3}#qualiumPanel h3{font-weight:400;margin:4px 0;font-size:17px;letter-spacing:.12em}#qualiumPanel p{margin:8px 0}.qualiumChoices{display:flex;flex-wrap:wrap;gap:0 16px}.qualiumChoices label,#qualiumPanel summary,#qualiumPanel .qStill{min-height:44px;display:inline-flex;align-items:center;gap:8px}#qualiumPanel input{width:20px;height:20px;accent-color:#91d7ca}#qualiumPanel button,#qualiumPanel .qAR{min-height:44px;display:inline-flex;align-items:center}#qualiumPanel .qAR{color:#b3e2d8;letter-spacing:.1em;text-decoration:none;border-bottom:1px solid #53786d;gap:20px}#qualiumPanel details{font-size:12px;color:#a3bdb4}#qualiumPanel :focus-visible,#qualiumRail :focus-visible{outline:2px solid #ead9ac;outline-offset:3px}
#qualiumRail{position:fixed;right:max(8px,env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);z-index:7;display:flex;flex-direction:column;align-items:stretch;width:48px;color:#b5d8cc;pointer-events:auto;border-left:1px solid #47665a66;background:linear-gradient(90deg,#07151200,#071512bf)}#qualiumRail[hidden]{display:none!important}#qualiumRail button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;width:48px;min-height:44px;padding:4px 0;border:0;border-radius:0;color:#b5d8cc;background:transparent;cursor:pointer;font:400 12px/1.2 "Hiragino Sans",sans-serif;letter-spacing:.1em;touch-action:manipulation}#qualiumRail button small{font:9px/1.4 ui-monospace,monospace;color:#7a9d92;letter-spacing:.1em}#qualiumRail button[aria-pressed=true]{color:#e9f7ed;background:linear-gradient(90deg,#4eaf8d36,transparent)}#qualiumRail button[aria-pressed=true]::before{content:"";position:absolute;left:-1px;top:10px;bottom:10px;width:2px;background:#c4d9a2}#qualiumRail .qCaption{text-align:center;font:8px/16px ui-monospace,monospace;letter-spacing:.12em;color:#a5c0b4}#qualiumRail .qModel{font-size:9px;letter-spacing:.25em}body.ovOn #qualiumRail,body.mkOn #qualiumRail,body:has(#menu:not([hidden])) #qualiumRail,body:has(#minimap.big) #qualiumRail,body:has(#journeyPanel>details[open]) #qualiumRail{display:none}
@media(max-width:820px){#qualiumRail{right:4px;width:44px}#qualiumRail button{width:44px;min-height:44px}}@media(max-height:520px){#qualiumRail{top:auto;bottom:8px;transform:none;flex-direction:row;width:auto}#qualiumRail .qCaption{display:none}#qualiumRail button{width:44px}}
`;
  document.head.append(style); document.body.append(rail);
  // The menu replaces its children when it opens; observe that node only, without a timer.
  function mount() {
    const menu = document.getElementById('menu');
    if (!menu) return;
    const attach = () => { if (panel.parentNode !== menu) menu.prepend(panel); };
    attach(); new MutationObserver(attach).observe(menu, {childList:true});
  }
  mount();
  const still = panel.querySelector('#qualiumStill'); still.checked = reduced.matches;
  function sync() {
    for (const [id, on] of Object.entries(states)) {
      panel.querySelector(`[data-qualium="${id}"]`).checked = on;
      rail.querySelector(`[data-qualium="${id}"]`).setAttribute('aria-pressed', String(on));
    }
    panel.querySelector('#qualiumMeaning').textContent = Object.keys(states).filter(id => states[id]).map(id => explain[id]).join(' ') || baseText;
  }
  panel.addEventListener('change', event => {
    const id = event.target.dataset.qualium;
    if (id in states) { states[id] = event.target.checked; sync(); }
  });
  rail.addEventListener('click', event => {
    const id = event.target.closest('button')?.dataset.qualium;
    if (id in states) { states[id] = !states[id]; sync(); }
  });
  panel.querySelector('#qualiumReset').onclick = () => { Object.keys(states).forEach(id => {states[id] = false;}); sync(); };

  const colors = {information:0x8edbc9,cognition:0xdab77b,language:0xe1e5cd,senses:0x80cbd3};
  let root, links, future, pools = [], clock = 0, last = 0, lastPick = -Infinity;
  let forward, offset, activeCount = 0;
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
      for (const id of Object.keys(states)) { slot.groups[id] = new T.Group(); slot.groups[id].scale.y=.65; slot.anchor.add(slot.groups[id]); }
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
      const label=mark.s?.tag||mark.el?.getAttribute('aria-label')?.replace(/（.*$/,'')||'この場所';
      const distance=`3D距離 ${Math.round(chosen.distance)} m`;
      const key=label+'|'+distance;
      if(key!==slot.label && now-slot.labelAt>900){
        slot.label=key;slot.labelAt=now;
        const ctx=slot.canvas.getContext('2d');ctx.clearRect(0,0,768,192);ctx.shadowColor='#041310';ctx.shadowBlur=5;
        ctx.fillStyle='#dce8d9';ctx.font='400 42px "Hiragino Mincho ProN",serif';ctx.textAlign='left';
        const text=String(label).slice(0,20);ctx.fillText(text,18,78,720);
        ctx.fillStyle='#a2cfc1';ctx.font='24px "Hiragino Sans",sans-serif';ctx.fillText(distance+'  /  言語の層',20,132);
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
    const isFuture=window.__r21?.era?.()==='future';
    const shown=available&&(isFuture||Object.values(states).some(Boolean))&&!document.hidden;
    if(!shown){if(root)root.visible=false;last=0;return;}
    if(!root)makeScene(T,scene);
    const now=performance.now();
    const frozen=still.checked||reduced.matches;
    if(last && now-last<50)return;
    const delta=last?Math.min((now-last)/1000,.1):0;last=now;
    if(!frozen)clock+=delta;
    if(now-lastPick>=400){refreshAnchors(T,talk,camera,now);lastPick=now;}
    root.visible=activeCount>0;
    for(const slot of pools)for(const id of Object.keys(states))slot.groups[id].visible=states[id];
    links.visible=states.cognition&&activeCount>1;future.visible=isFuture;
    if(states.senses)animateWaves(clock);
    future.position.y=Math.sin(clock*.45)*.1;
  };
  window.__qualium={states,panel,rail,get visible(){return !!root?.visible;},get count(){return root?.children.length||0;},get anchors(){return pools.filter(slot=>slot.mark).map(slot=>slot.mark.s?.tag||'この場所');},get time(){return clock;},get diagnostics(){return {anchors:activeCount,particles:activeCount*72+(future?.visible?96:0),extraLoop:false};}};
})();
