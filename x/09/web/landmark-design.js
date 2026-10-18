/* mitsulab — 解説対象に結ぶ創作の目印。
   対象・座標・遮蔽・クリック・drag・時代遷移は既存MARKS/ACTを継承。
   地面の輪、観測した根や信号、新しい操作ボタンはつくらない。 */
(() => {
  const decorated=new WeakSet(),auraMaterials=new WeakSet(),revealMaterials=new WeakSet();
  const diagnostics={ready:false,active:0,drawCalls:0,vertices:0,revealMaterials:0,anchors:[],maxDistance:42,model:'既存の解説位置に結ぶ創作の目印・観測値なし'};
  let group,lines,dots,last=0,pickAt=0,selected=[],origin;
  const style=document.createElement('style');style.dataset.source='landmark-design';
  style.textContent=`
#marks .mk3 .sz svg{overflow:visible}
#marks .mk3 .sz{opacity:.85;transition:opacity .2s ease,transform .2s ease}
#marks .mk3.near .sz{transform:scale(1.025);opacity:1}
#marks .mk3.done .sz{transform:scale(.82);opacity:.6}
#marks .mk3:hover .sz,#marks .mk3:focus-visible .sz{opacity:1;transform:scale(1.08)}
#marks .mk3 .landmark-axis{stroke:#91dce8;stroke-width:1;fill:none;vector-effect:non-scaling-stroke}
#marks .mk3 .landmark-aura{stroke:#80d4e5;stroke-width:5;opacity:.1;fill:none;vector-effect:non-scaling-stroke}
#marks .mk3 .landmark-tick{stroke:#b1c9d8;stroke-width:.7;opacity:.65;fill:none;vector-effect:non-scaling-stroke}
#marks .mk3 .landmark-core{fill:#d5faff;stroke:#97dce6;stroke-width:.7;vector-effect:non-scaling-stroke}
#marks .mk3.talk .landmark-axis{stroke:#d8f8fc}
@media(prefers-reduced-motion:reduce){#marks .mk3 .sz{transition:none}}
`;document.head.append(style);
  const icon='<svg viewBox="0 0 64 64" aria-hidden="true"><path class="landmark-aura" d="M32 8V49"/><path class="landmark-axis" d="M32 8V43M29 11h6M26 49h-5v-5m17 5h5v-5"/><path class="landmark-tick" d="M32 22h4m-4 9h3m-3 7h4M21 52v3h6m16-3v3h-6"/><path class="landmark-core" d="m32 45 3 4-3 4-3-4z"/></svg>';
  function decorate(talk){
    for(const mark of talk.MARKS||[]){
      if(decorated.has(mark.el))continue;
      const inner=mark.el?.querySelector('.sz');if(!inner)continue;
      // Keep the existing button, dimensions, event listeners, aria-label and model bindings.
      inner.innerHTML=icon;decorated.add(mark.el);
    }
    for(const action of talk.ACT?.list||[]){
      const mat=action.mat;if(!mat||auraMaterials.has(mat))continue;
      auraMaterials.add(mat);
      // Preserve the source's timed fade and era eligibility while reducing the overlay's brightness.
      mat.fragmentShader=mat.fragmentShader.replace('uC * f * uI','uC * f * uI * .36');
      if(mat.uniforms?.uO)mat.uniforms.uO.value=Math.min(mat.uniforms.uO.value,.025);
      mat.needsUpdate=true;
    }
  }
  function softenReveals(scene){
    // The original wake-up animation keeps its timing, model and interaction.
    // Reduce its large luminous particles and whole-surface flash, so the fine anchor remains legible.
    for(const object of scene.children){
      if(object.name==='himoPts'){
        const mat=object.material;if(!mat||revealMaterials.has(mat))continue;
        mat.vertexShader=mat.vertexShader.replace(', 22.)',', 4.5)');
        mat.fragmentShader=mat.fragmentShader.replace('vec4(.86,1.,.95,a)','vec4(.65,.9,1.,a*.24)');
        mat.needsUpdate=true;revealMaterials.add(mat);diagnostics.revealMaterials++;
      }else if(object.name?.startsWith('himo_')){
        object.traverse(node=>{const mat=node.material;if(!mat?.fragmentShader||revealMaterials.has(mat))return;
          mat.fragmentShader=mat.fragmentShader.replace('band*.9+fr*lit*.35+line*.22+lit*.03','band*.12+fr*lit*.12+line*.05+lit*.004');
          mat.needsUpdate=true;revealMaterials.add(mat);diagnostics.revealMaterials++;
        });
      }
    }
  }
  function make(T,scene){
    group=new T.Group();group.name='解説位置の創作目印（現地の測定値ではない）';group.userData.slSkip=true;
    const pos=new T.BufferGeometry();pos.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(3*18*3),3));
    const color=new T.Float32BufferAttribute(new Float32Array(3*18*3),3);pos.setAttribute('color',color);
    lines=new T.LineSegments(pos,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.62,depthTest:true,depthWrite:false,toneMapped:false}));
    lines.name='物体位置に沿う細い縦光・環世界の創作アンカー';lines.frustumCulled=false;group.add(lines);
    const dp=new T.BufferGeometry();dp.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(3*3),3));dp.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(3*3),3));
    dots=new T.Points(dp,new T.PointsMaterial({vertexColors:true,size:.035,sizeAttenuation:true,transparent:true,opacity:.7,depthTest:true,depthWrite:false,toneMapped:false}));
    dots.name='解説位置の小さな節点';dots.frustumCulled=false;group.add(dots);scene.add(group);
    origin=new T.Vector3();diagnostics.ready=true;
  }
  function choose(T,talk,core,camera){
    const list=[];
    for(const mark of talk.MARKS||[]){
      if(!mark.vis||mark.el.hidden||mark.occ)continue;
      // Without an actual model attachment, retain only the source's DOM annotation.
      // Do not invent a floating 3D position for a tree or general explanation.
      const p=mark.wp;
      if(!p||![p.x,p.y,p.z].every(Number.isFinite))continue;
      const y=p.y;
      const distance=Math.hypot(p.x-camera.position.x,y-camera.position.y,p.z-camera.position.z);
      if(distance<1.2||distance>42)continue;
      list.push({mark,x:p.x,y,z:p.z,distance,source:'既存3D物体の付着位置'});
    }
    list.sort((a,b)=>Number(b.mark.el.matches(':hover,:focus-visible'))-Number(a.mark.el.matches(':hover,:focus-visible'))||a.distance-b.distance);
    selected=list.slice(0,3);
    // Existing button opacity and visibility still follow its source's distance/occlusion rules.
  }
  function hide(){if(group)group.visible=false;diagnostics.active=0;diagnostics.drawCalls=0;diagnostics.vertices=0;diagnostics.anchors=[];}
  window.__landmarkFrame=(scene,camera)=>{
    const core=window.__core,T=core?.THREE,talk=window.__talk;
    if(!T||!talk||!window.__entryFirstFrameAt)return;
    const now=performance.now();if(now-last<100)return;last=now;
    const available=!!document.getElementById('start')?.hidden&&talk.mode==='sim'&&!document.hidden&&!document.body.classList.contains('ovOn')&&!document.querySelector('#menu:not([hidden])')&&!document.getElementById('minimap')?.classList.contains('big');
    if(!available){hide();return;}
    if(now-pickAt>=300){pickAt=now;decorate(talk);softenReveals(scene);choose(T,talk,core,camera);}
    const shown=window.__qualium?.states?.information!==false;
    if(!selected.length||!shown){hide();return;}
    if(!group)make(T,scene);group.visible=true;
    origin.set(selected[0].x,selected[0].y,selected[0].z);group.position.copy(origin);
    const a=lines.geometry.attributes.position,c=lines.geometry.attributes.color,p=dots.geometry.attributes.position,pc=dots.geometry.attributes.color;
    let n=0,count=0;const anchors=[];
    for(const anchor of selected){
      if(!anchor.mark.vis||anchor.mark.el.hidden||anchor.mark.occ)continue;
      const d=anchor.distance,fade=Math.max(0,Math.min(1,(42-d)/16))*(anchor.mark.el.matches(':hover,:focus-visible')?1:.72);
      const x=anchor.x-origin.x,y=anchor.y-origin.y,z=anchor.z-origin.z;
      // A short asymmetric measuring edge, not a ring or an invented reconstruction.
      const H=.48,W=.07;const verts=[[x,y-.12,z],[x,y+H,z],[x,y+H,z],[x+W,y+H,z],[x,y+.26,z],[x+W*.6,y+.26,z],[x-W,y-.12,z],[x+W,y-.12,z]];
      for(const v of verts){a.setXYZ(n,...v);c.setXYZ(n++,.5*fade,.82*fade,.9*fade);}
      p.setXYZ(count,x,y-.12,z);pc.setXYZ(count++,.7*fade,.95*fade,fade);
      anchors.push({id:anchor.mark.s.id,x:anchor.x,y:anchor.y,z:anchor.z,distance:d,source:anchor.source});
    }
    a.needsUpdate=c.needsUpdate=p.needsUpdate=pc.needsUpdate=true;lines.geometry.setDrawRange(0,n);dots.geometry.setDrawRange(0,count);
    diagnostics.active=count;diagnostics.vertices=n+count;diagnostics.drawCalls=count?2:0;diagnostics.anchors=anchors;
  };
  window.__landmarks={diagnostics,get objects(){return group?{group,lines,dots}:null;},refresh:()=>{pickAt=-Infinity;}};
})();
