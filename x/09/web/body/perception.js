/* © mitsulab. Signal-inspired display tools, not reconstructions of subjective vision.
   Depth/distance and motion come only from this synthetic scene. No ultraviolet, scent, or ultrasound was measured. */
export function createPerceptionPass(T) {
  const KIND={inu:1,hachi:2,chou:3,tori:4,koumori:5};
  const quadScene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  quadScene.name='感覚信号の翻訳';
  const uniforms={uImage:{value:null},uPrevious:{value:null},uDepth:{value:null},uMatrix:{value:new T.Matrix3()},uKind:{value:0},uTime:{value:0},uNear:{value:.1},uFar:{value:3000},uSize:{value:new T.Vector2(1,1)},uMotion:{value:0}};
  const material=new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
#include <common>
#include <packing>
uniform sampler2D uImage,uPrevious,uDepth;uniform mat3 uMatrix;uniform int uKind;uniform float uTime,uNear,uFar,uMotion;uniform vec2 uSize;varying vec2 vUv;
float distAt(vec2 p){return -perspectiveDepthToViewZ(texture2D(uDepth,p).x,uNear,uFar);}
void main(){
 vec2 uv=vUv,px=1./uSize;float aspect=uSize.x/uSize.y;
 // A deliberately coarse display of spatial sampling, not a count or image of ommatidia.
 if(uKind==2||uKind==3){float cell=uKind==2?8.:4.5;vec2 p=uv*uSize/cell;p.x+=mod(floor(p.y),2.)*.5;p=floor(p)+.5;p.x-=mod(floor(p.y),2.)*.5;uv=p*cell/uSize;}
 vec3 raw=texture2D(uImage,uv).rgb,c=max(uMatrix*raw,0.);float d=distAt(uv);float edge=abs(d-distAt(uv+vec2(px.x*2.,0.)))+abs(d-distAt(uv+vec2(0.,px.y*2.)));edge=clamp(edge/max(.2,d*.06),0.,1.);
 // Display palette keeps model edges legible; its blue-green mapping is authored, not measured UV.
 if(uKind==2){float signal=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(signal*.60,signal*.67,signal*.72),vec3(c.g*.35,c.r*.62,c.g*.75+c.b*.15),.65);}
 if(uKind==4){
  // Temporal image difference exposes changes; it is a designed attention cue, not a neural measurement.
  vec3 prev=texture2D(uPrevious,uv).rgb;float change=clamp(length(raw-prev)*2.5,0.,1.);float peripheral=smoothstep(.12,.65,length((uv-.5)*vec2(aspect,1.)));
  c=mix(c,c*.85+vec3(.06,.19,.22)*(change+edge*.12)*peripheral,.75);c+=change*peripheral*vec3(.13,.26,.23);
 }
 if(uKind==5){
  // Round-trip distance/343 provides the delay of the model's light echoes. Sound propagation/material response is not solved.
  bool valid=texture2D(uDepth,uv).x<.999995;float delay=2.*d/343.;float age=mod(max(0.,uTime-delay),.65);float pulse=exp(-age*7.5);float lattice=step(.78,fract(gl_FragCoord.x/5.))*step(.78,fract(gl_FragCoord.y/5.));
  float energy=(edge*.66+lattice*.58)*pulse*exp(-d*.014);c=valid?vec3(.005,.012,.017)+vec3(.17,.79,.72)*energy:vec3(.001,.004,.007);
 }
 gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  material.toneMapped=true;quadScene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
  let targets=[],w=0,h=0,index=0,history=false,body='',frames=0;
  const size=new T.Vector2(),previousPosition=new T.Vector3();let previousQuaternion=new T.Quaternion();
  function target(){const rt=new T.WebGLRenderTarget(w,h,{type:T.HalfFloatType,depthBuffer:true,samples:0});rt.depthTexture=new T.DepthTexture(w,h,T.UnsignedIntType);return rt;}
  function render(renderer,scene,cam,id,matrix){
    if(!KIND[id])return false;
    renderer.getDrawingBufferSize(size);const nw=size.x|0,nh=size.y|0;
    if(nw!==w||nh!==h){targets.forEach(t=>t.dispose());w=nw;h=nh;targets=[target()];history=false;index=0;}
    if(id==='tori'&&targets.length<2)targets.push(target());
    if(body!==id){history=false;body=id;previousPosition.copy(cam.position);previousQuaternion.copy(cam.quaternion);}
    const next=id==='tori'?1-index:0,rt=targets[next],previous=history&&id==='tori'?targets[index]:rt;
    renderer.setRenderTarget(rt);renderer.render(scene,cam);renderer.setRenderTarget(null);
    uniforms.uImage.value=rt.texture;uniforms.uPrevious.value=previous.texture;uniforms.uDepth.value=rt.depthTexture;uniforms.uKind.value=KIND[id];uniforms.uTime.value=performance.now()/1000;
    uniforms.uMatrix.value.set(...(matrix||[1,0,0,0,1,0,0,0,1]));uniforms.uNear.value=cam.near;uniforms.uFar.value=cam.far;uniforms.uSize.value.copy(size);
    uniforms.uMotion.value=previousPosition.distanceTo(cam.position)+previousQuaternion.angleTo(cam.quaternion);previousPosition.copy(cam.position);previousQuaternion.copy(cam.quaternion);
    renderer.render(quadScene,camera);index=next;history=true;frames++;return true;
  }
  return {render,get diagnostics(){return {body,frames,width:w,height:h,targets:targets.length,depth:!!targets[0]?.depthTexture,mode:KIND[body],spatialCell:body==='hachi'?8:body==='chou'?4.5:0,temporalDifference:body==='tori',motion:uniforms.uMotion.value,measuredUV:false,measuredEcho:false};}};
}

// A shared, authored 3D comparison specimen. It occupies the same model location for every body.
export function createSharedReferences(T) {
  let root,mode={value:0},label;const band={hito:0,inu:1,hachi:2,chou:3,tori:4,koumori:5};
  function build(scene,camera,core){
    const forward=new T.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();const right=new T.Vector3().crossVectors(forward,new T.Vector3(0,1,0)).normalize();
    const center=camera.position.clone().addScaledVector(forward,8).addScaledVector(right,3.5);
    const talk=window.__talk;
    if(talk?.project&&talk?.userBand){const pr=talk.project(camera.position.x,camera.position.z),distance=pr.d+8,edge=talk.userBand(distance)[1]+.65,p=talk.toWorld(distance,edge);center.set(p.x,center.y,p.z);}
    const gy=core.groundY(center.x,center.z);if(!Number.isFinite(gy))return;
    root=new T.Group();root.name='感覚を比べる仮想の花（現地実物ではない・UV未測定）';root.position.set(center.x,gy+.04,center.z);root.scale.setScalar(.68);
    const pot=new T.Mesh(new T.CylinderGeometry(.30,.23,.16,20),new T.MeshStandardMaterial({color:0x354c46,roughness:.95}));pot.position.y=.08;root.add(pot);
    const soil=new T.Mesh(new T.CylinderGeometry(.28,.28,.02,20),new T.MeshStandardMaterial({color:0x4c392c,roughness:1}));soil.position.y=.17;root.add(soil);
    const petals=new T.MeshStandardMaterial({color:0xf6d078,roughness:.78,side:T.DoubleSide});
    petals.onBeforeCompile=sh=>{sh.uniforms.uFlowerBody=mode;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFlowerLocal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFlowerLocal=position;');sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uFlowerBody;varying vec3 vFlowerLocal;').replace('#include <color_fragment>',`#include <color_fragment>
      float guide=1.-smoothstep(-.45,.15,vFlowerLocal.z);
      if(uFlowerBody>1.5&&uFlowerBody<2.5)diffuseColor.rgb=mix(vec3(.75,.93,.65),vec3(.025,.10,.65),guide);
      if(uFlowerBody>2.5&&uFlowerBody<3.5)diffuseColor.rgb=mix(vec3(.95,.34,.16),vec3(.42,.055,.65),guide*.8+.2*step(.15,sin(vFlowerLocal.z*14.)));
    `);};petals.customProgramCacheKey=()=> 'shared-flower-body-pattern-v1';
    for(let flower=0;flower<3;flower++){
      const plant=new T.Group();plant.position.set((flower-1)*.18,.17,Math.sin(flower*2)*.12);root.add(plant);const height=.43+flower*.12;
      const stem=new T.Mesh(new T.CylinderGeometry(.009,.013,height,6),new T.MeshStandardMaterial({color:0x4d763f,roughness:.9}));stem.position.y=height/2;plant.add(stem);
      const blossom=new T.Group();blossom.position.y=height;blossom.rotation.x=.35;plant.add(blossom);
      for(let i=0;i<8;i++){const angle=i*Math.PI/4,p=new T.Mesh(new T.SphereGeometry(1,16,10),petals);p.scale.set(.055,.018,.115);p.position.set(Math.sin(angle)*.10,0,Math.cos(angle)*.10);p.rotation.y=angle;blossom.add(p);}
      const center=new T.Mesh(new T.SphereGeometry(.047,16,10),new T.MeshStandardMaterial({color:0x73513a,roughness:.8}));center.scale.y=.35;blossom.add(center);
      const leaf=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshStandardMaterial({color:0x5c853b,roughness:.9}));leaf.scale.set(.1,.012,.04);leaf.position.set(.07,height*.45,0);leaf.rotation.z=.25;plant.add(leaf);
    }
    const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#071a20e6';ctx.fillRect(0,0,768,128);ctx.fillStyle='#e0eee5';ctx.textAlign='center';ctx.font='32px sans-serif';ctx.fillText('感覚を比べる仮想の花',384,48);ctx.font='24px sans-serif';ctx.fillText('創作した比較標本 · UV反射は未測定',384,95);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;label=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true,depthWrite:false,toneMapped:false}));label.scale.set(1.3,.217,1);label.position.set(0,1.08,0);root.add(label);scene.add(root);
  }
  function frame(scene,camera,body,core,active){if(!active||!(body==='hachi'||body==='chou')){if(root)root.visible=false;return;}   /* 2026-10-20 本人「黄色い花がわざとらしく咲いている」：感覚を比べる仮想の花は、ハチ・チョウの身体のときだけ出す */if(!root)build(scene,camera,core);if(root){root.visible=true;mode.value=band[body]??0;if(label)label.visible=(body==='hachi'||body==='chou')&&camera.position.distanceTo(root.position)<3;}}
  return {frame,get diagnostics(){return {exists:!!root,position:root?.position.toArray(),bodyBand:mode.value,authored:true,observedUV:false};}};
}
