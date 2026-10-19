/* Presentation only: keep native details, checkboxes and existing event handlers. */
(() => {
  function mount() {
    const dock=document.getElementById('perceptionDock');
    if(!dock)return false;
    const controls=[...dock.querySelectorAll('.dockControl')];
    if(controls.length!==4||controls.some(c=>!c.querySelector(':scope>.dockPanel')))return false;
    if(dock.dataset.refined==='true')return true;
    dock.dataset.refined='true';
    const headings=['時間をたどる','身体を替える','手がかりを重ねる','視点を動かす'];
    controls.forEach((control,i)=>{
      const summary=control.querySelector(':scope>summary'),panel=control.querySelector(':scope>.dockPanel');
      summary.dataset.dockIndex=String(i+1).padStart(2,'0');
      panel.dataset.dockHeading=headings[i];
      if(!panel.id)panel.id='perception-panel-'+i;
      summary.setAttribute('aria-controls',panel.id);
    });
    // Reserve the subtitle's actual height, including long speech and large-text mode.
    // ResizeObserver runs only when these boxes change; there is no per-frame loop.
    const subtitle=document.getElementById('sub');
    const reserveSubtitle=()=>{
      const d=dock.getBoundingClientRect(),sub=subtitle?.getBoundingClientRect();
      const visible=sub&&sub.height>0&&getComputedStyle(subtitle).visibility!=='hidden';
      const bottom=visible?sub.top:innerHeight-12;
      const room=Math.max(100,Math.floor(bottom-d.bottom-20));
      const value=room+'px';
      if(dock.style.getPropertyValue('--dock-panel-room')!==value)dock.style.setProperty('--dock-panel-room',value);
    };
    if(typeof ResizeObserver==='function'){
      const resize=new ResizeObserver(reserveSubtitle);resize.observe(dock);if(subtitle)resize.observe(subtitle);
    }
    addEventListener('resize',reserveSubtitle,{passive:true});reserveSubtitle();
    const choices=dock.querySelector('.qualiumChoices');
    if(choices){
      const groups=[['受けとり方',['information','cognition','language','senses']],['場所の手がかり',['trees','water','terrain','time','life','culture']]];
      for(const [title,ids] of groups){
        const labels=ids.map(id=>choices.querySelector(`input[data-qualium="${id}"]`)?.closest('label')).filter(Boolean);if(!labels.length)continue;   /* 2026-10-19：層を 3 つにまとめた版では、この組は作らない */
        const fieldset=document.createElement('fieldset');fieldset.className='qLayerGroup';
        const legend=document.createElement('legend');legend.textContent=title;fieldset.append(legend);
        for(const label of labels)fieldset.append(label);
        choices.append(fieldset);
      }
    }
    // Native summary Enter/Space remains. Arrow keys move across the four controls.
    dock.addEventListener('keydown',e=>{
      const summary=e.target.closest('summary');
      const current=controls.findIndex(c=>c.querySelector(':scope>summary')===summary);
      if(current<0)return;
      let index;
      if(e.key==='ArrowRight')index=(current+1)%controls.length;
      if(e.key==='ArrowLeft')index=(current+controls.length-1)%controls.length;
      if(e.key==='Home')index=0;
      if(e.key==='End')index=controls.length-1;
      if(index===undefined)return;
      e.preventDefault();
      const wasOpen=controls.some(c=>c.open);
      if(wasOpen){controls.forEach(c=>c.open=false);controls[index].open=true;}
      controls[index].querySelector(':scope>summary').focus();
    });
    dock.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;
      const open=controls.find(c=>c.open);
      if(open){open.open=false;open.querySelector(':scope>summary').focus();e.stopPropagation();}
    });
    return true;
  }
  if(!mount()){
    const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});
    observer.observe(document.body,{childList:true,subtree:true});
    // No timers, animation loops, third-party resources or 3D work.
  }
})();
