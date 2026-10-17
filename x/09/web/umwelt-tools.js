/* © mitsulab. Qualium: simulated observer height and model-derived echoes.
   No sensor readings: all echoes are ray intersections with this reconstructed 3D world. */
(() => {
  const panel=document.createElement('aside'); panel.id='umweltTools'; panel.hidden=true;
  panel.setAttribute('aria-label','環世界を拡張する道具');
  panel.innerHTML='<details><summary>視点</summary><p>同じ場所を、身体・時代・情報で深く歩く。</p><div class="heightRow"><button type="button" data-height="-1" aria-label="視点を下げる（Q）">↓</button><output id="eyeHeight">地面から 1.6 m</output><button type="button" data-height="1" aria-label="視点を上げる（E）">↑</button></div><button type="button" id="eyeReset">身体の高さへ戻す</button><button type="button" id="stoneTool" aria-pressed="false">石の依代を手元へ</button><p class="toolLimit">石の依代：仮想の道具。観測値なし・模式。</p><p class="toolLimit">画面内の仮想移動 · 0.12〜25 m<br>Q / E または PageDown / PageUp。現地の飛行・移動を示しません。</p><p id="echoStatus" role="status"></p></details>';
  const css=document.createElement('style');css.textContent=`
#umweltTools{position:fixed;z-index:7;left:12px;bottom:calc(82px + env(safe-area-inset-bottom));width:min(310px,calc(100vw - 88px));color:#e4f2eb;font:12px/1.7 var(--ui,sans-serif);border:1px solid #77a99c70;background:#071c25e8;box-shadow:0 8px 28px #00121b55}#umweltTools[hidden]{display:none!important}#umweltTools details{padding:0 12px}#umweltTools summary{min-height:44px;display:flex;align-items:center;gap:14px;cursor:pointer;letter-spacing:.08em}#umweltTools summary span{font-size:11px;color:#a9c8bd}#umweltTools p{margin:4px 0 10px}#umweltTools .heightRow{display:flex;align-items:center;justify-content:space-between;gap:6px}#umweltTools button{min-height:44px;min-width:44px;background:#24413e66;border:1px solid #8bbdbb66;color:#e4f2eb;font:inherit;cursor:pointer;touch-action:none}#eyeReset,#stoneTool{margin:8px 0;width:100%}#eyeHeight{font:12px ui-monospace,monospace}#umweltTools .toolLimit{font-size:10px;color:#b5c8c1}#echoStatus:empty{display:none}body:has(#menu:not([hidden])) #umweltTools,body.ovOn #umweltTools,body:has(#minimap.big) #umweltTools{display:none}@media(max-width:820px){#umweltTools{bottom:calc(76px + env(safe-area-inset-bottom));left:8px}#umweltTools details[open]{max-height:40vh;overflow:auto}}`;
  document.head.append(css);document.body.append(panel);
  const dockStyle=document.createElement('style');dockStyle.textContent=`
body #perceptionDock{position:fixed;z-index:13;left:12px;top:70px;width:min(400px,calc(100vw - 104px));display:flex;align-items:stretch;border:1px solid #83b9a653;background:#071713ed;color:#e1eee6;font:12px/1.6 var(--ui,sans-serif);box-sizing:border-box}body #perceptionDock[hidden]{display:none!important}
body #perceptionDock #journeyPanel,body #perceptionDock #bodyQuick,body #perceptionDock #umweltTools,body #perceptionDock #qualiumControl{position:static!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;width:auto!important;max-width:none!important;min-width:0!important;flex:1!important;display:block!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
body #perceptionDock [hidden]{display:none!important}body #perceptionDock #bodyQuick[hidden],body #perceptionDock #journeyPanel[hidden],body #perceptionDock #umweltTools[hidden],body #perceptionDock #qualiumControl[hidden]{display:none!important}
body:has(#perceptionDock) #perceptionDock #bodyQuick{display:block!important;visibility:visible!important}body:has(#perceptionDock) #perceptionDock #bodyQuick[hidden]{display:none!important}
body #perceptionDock .dockControl{position:static!important;width:auto!important;max-height:none!important;overflow:visible!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
body #perceptionDock .dockControl>summary{display:flex!important;justify-content:center!important;align-items:center!important;min-height:44px!important;padding:0 6px!important;box-sizing:border-box;width:100%!important;white-space:nowrap;font:400 12px/1.3 var(--ui,sans-serif)!important;letter-spacing:.04em!important;list-style:none;border:0;border-right:1px solid #83b9a633;cursor:pointer;color:#d9ebe1}
body #perceptionDock .dockControl>summary::-webkit-details-marker{display:none}body #perceptionDock .dockControl>summary::after{display:none!important}body #perceptionDock .dockControl[open]>summary{background:#36604d66;color:#e5d4b1}
body #perceptionDock .dockPanel{position:absolute!important;left:-1px;top:calc(100% + 6px);box-sizing:border-box;width:min(352px,calc(100vw - 24px));max-height:calc(100svh - 156px);overflow:auto;overscroll-behavior:contain;margin:0!important;padding:12px!important;background:#071713f5!important;color:#e1eee6;border:1px solid #83b9a66b!important;box-shadow:0 12px 28px #00161144;scrollbar-width:thin}
body #perceptionDock .dockControl:not([open])>.dockPanel{display:none!important}body #perceptionDock #bodyQuick:not([open])>.dockPanel{display:none!important}body #perceptionDock #bodyQuick[open]>.dockPanel{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
body #perceptionDock #slipCap{position:static!important;inset:auto!important;transform:none!important;width:auto!important;max-width:none!important;margin:8px 0!important;padding:8px!important;font-size:11px;background:#17352a66!important}body #perceptionDock #slipCap::before,body #perceptionDock #slipCap::after{display:none}
body #perceptionDock #bodyNote{position:static!important;inset:auto!important;grid-column:1/-1;width:auto!important;max-width:none!important;background:transparent!important;border:0!important;padding:8px 0 0!important;font-size:11px!important}
body #perceptionDock #qualiumPanel{font-size:12px;line-height:1.65}body #perceptionDock #qualiumPanel p{margin:4px 0 8px}body #perceptionDock #qualiumPanel summary{min-height:44px;display:flex}body #perceptionDock .qualiumChoices label{min-height:44px}body #perceptionDock .dockPanel button{min-height:44px}body #perceptionDock .jScale{font-size:9px}body #perceptionDock .jNow{display:none!important}
body.ovOn #perceptionDock,body:has(#menu:not([hidden])) #perceptionDock,body:has(#minimap.big) #perceptionDock{display:none!important}body:has(#perceptionDock) .cuL{display:none!important}body:has(#perceptionDock .dockControl[open]) #howto,body:has(#perceptionDock .dockControl[open]) #actBtn{visibility:hidden!important}
@media(max-width:600px){body #perceptionDock{left:8px;top:66px;width:calc(100vw - 96px)}body #perceptionDock .dockControl>summary{font-size:11px!important;padding:0 3px!important}body #perceptionDock .dockPanel{width:calc(100vw - 16px);max-height:calc(100svh - 142px)}}
`;document.head.append(dockStyle);
  let dock;
  function mountDock(){
    const jp=document.getElementById('journeyPanel'),quick=document.getElementById('bodyQuick'),layers=document.getElementById('qualiumControl');
    if(dock||!jp||!quick||!layers)return;
    dock=document.createElement('nav');dock.id='perceptionDock';dock.setAttribute('aria-label','環世界の操作');dock.hidden=true;
    document.body.append(dock);dock.append(jp,quick,layers,panel);
    const controls=[jp.querySelector(':scope>details'),quick,layers,panel.querySelector(':scope>details')];
    for(const control of controls){
      control.classList.add('dockControl');let content=control.querySelector(':scope>.dockPanel');
      if(!content){if(control===quick)content=control.querySelector(':scope>div');else if(control===layers)content=control.querySelector(':scope>section');else{content=document.createElement('div');for(const child of [...control.childNodes])if(child.nodeName!=='SUMMARY')content.append(child);control.append(content);}content.classList.add('dockPanel');}
      control.querySelector(':scope>summary').addEventListener('click',()=>{if(!control.open)for(const other of controls)if(other!==control)other.open=false;});
      control.addEventListener('toggle',()=>{if(control.open)for(const other of controls)if(other!==control)other.open=false;});
    }
    const timeCaption=document.getElementById('slipCap');if(timeCaption)jp.querySelector('.dockPanel').append(timeCaption);
    const bodyNote=document.getElementById('bodyNote');if(bodyNote)quick.querySelector('.dockPanel').append(bodyNote);
    const close=()=>controls.forEach(d=>d.open=false);
    addEventListener('pointerdown',e=>{if(!dock.contains(e.target))close();});
    addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    window.__perceptionDock={close,get controls(){return controls;}};
  }
  let held=0,last=0,started=false;
  function usable(){return !!window.__core&&window.__talk?.mode==='sim'&&document.getElementById('start')?.hidden&&!document.body.classList.contains('ovOn');}
  function setHeight(h){window.__core?.setEyeH(h);panel.querySelector('output').textContent=`地面から ${(window.__eyeH??1.6).toFixed(2)} m`;}
  function move(sign,seconds=.15){setHeight((window.__eyeH??1.6)+sign*seconds*3);}
  for(const b of panel.querySelectorAll('[data-height]')){
    b.addEventListener('pointerdown',e=>{e.preventDefault();held=Number(b.dataset.height);move(held);b.setPointerCapture(e.pointerId);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>held=0);
    b.addEventListener('click',e=>{if(e.detail===0)move(Number(b.dataset.height));});
  }
  panel.querySelector('#eyeReset').onclick=()=>setHeight(window.__body?.B[window.__body.cur]?.eye??1.6);
  panel.querySelector('#stoneTool').onclick=()=>{const b=panel.querySelector('#stoneTool'),on=b.getAttribute('aria-pressed')!=='true';window.__physicalTool?.showStone(on);b.setAttribute('aria-pressed',String(on));b.textContent=on?'石の依代をしまう':'石の依代を手元へ';};
  const keySign=e=>e.code==='KeyE'||e.code==='PageUp'?1:e.code==='KeyQ'||e.code==='PageDown'?-1:0;
  addEventListener('keydown',e=>{const sign=keySign(e);if(!sign||!usable()||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;e.preventDefault();held=sign;if(!e.repeat)move(sign);});
  addEventListener('keyup',e=>{if(keySign(e))held=0;});addEventListener('blur',()=>held=0);
  addEventListener('hikawa-body',e=>setHeight(e.detail.height));
  // One low-frequency control loop; visibility pauses both movement and work.
  setInterval(()=>{const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;mountDock();const on=usable();panel.hidden=!on;if(dock)dock.hidden=!on;if(!on||document.hidden){held=0;return;}if(held)move(held,dt);if(!started){started=true;setHeight(window.__eyeH??1.6);}},50);
  let echo,ray,dir,lastEcho=-Infinity,points=0;
  const hits=[];
  window.__umweltEchoFrame=(renderer,scene,camera,body)=>{
    const on=body==='koumori'&&usable()&&!document.hidden;
    if(echo)echo.visible=on;
    if(!on){points=0;return;}
    const C=window.__core,T=C.THREE;
    if(!echo){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(48*3),3));echo=new T.Points(g,new T.PointsMaterial({color:0xa4f5e6,size:.15,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));echo.name='Qualium: model-distance echoes (not measured ultrasound)';echo.frustumCulled=false;scene.add(echo);ray=new T.Raycaster();ray.layers.enableAll();ray.firstHitOnly=true;ray.near=.25;ray.far=42;dir=new T.Vector3();}
    const now=performance.now();if(now-lastEcho<140)return;lastEcho=now;
    const attr=echo.geometry.attributes.position;points=0;
    // Forty-eight rays, BVH where present; no extra WebGL pass or render target.
    const targets=[C.terrain].filter(Boolean);
    // Full forest instancing would multiply ray work by every tree. Reuse nearby structure models and existing BVHs only.
    for(const q of C.STRUCTS||[]){const obj=q.obj;if(obj&&obj.visible&&Math.hypot(obj.position.x-camera.position.x,obj.position.z-camera.position.z)<50)targets.push(obj);}
    C.buildings?.traverse(obj=>{if(obj.isMesh&&obj.visible&&obj.geometry?.boundsTree)targets.push(obj);});
    for(let i=0;i<48;i++){
      dir.set(((i%12)/11-.5)*1.8,(Math.floor(i/12)/3-.5)*.9,-1).normalize().applyQuaternion(camera.quaternion);
      ray.set(camera.position,dir);hits.length=0;ray.intersectObjects(targets,true,hits);
      const hit=hits.find(h=>h.object.visible&&h.object.parent?.visible!==false);if(!hit)continue;
      attr.setXYZ(points++,hit.point.x,hit.point.y,hit.point.z);
    }
    echo.geometry.setDrawRange(0,points);attr.needsUpdate=true;
    panel.querySelector('#echoStatus').textContent=`反響の模式：地面・近くの構造物から ${points} 点。熱・超音波は未測定。`;
  };
  window.__umweltTools={setHeight,get height(){return window.__eyeH??1.6;},get echoPoints(){return points;},get panel(){return panel;}};
})();
