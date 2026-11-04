// 環世界のコモングラウンド：四つの主体の環世界（ゆらぐ泡）が重なった所だけが光る（2026-11-05）
import * as THREE from 'three';
export function start(box){
  const mob=innerWidth<760, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv=box.querySelector('canvas'), R=new THREE.WebGLRenderer({canvas:cv,antialias:!mob,alpha:true,powerPreference:'low-power'});
  R.setPixelRatio(Math.min(devicePixelRatio,mob?1.5:1.75));
  const S=new THREE.Scene(), C=new THREE.PerspectiveCamera(36,1,.1,50); C.position.set(0,0,9);
  const subs=[{n:'鳥',e:'Bird',c:[.62,.86,1]},{n:'虫',e:'Insect',c:[.95,.83,.55]},{n:'人',e:'Human',c:[.85,.88,.96]},{n:'機械',e:'Machine',c:[.55,1,.9]}];
  const base=[[-1.15,.55,0],[1.15,.55,-.2],[-1.0,-.7,.2],[1.05,-.6,0]], rad=1.45;
  const cen=subs.map(()=>new THREE.Vector3());
  // 泡の膜：縁だけ光るフレネル
  const shell=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{t:{value:0},col:{value:new THREE.Color()}},
    vertexShader:`uniform float t;varying float f;void main(){vec3 p=position;float w=sin(p.x*3.1+t*.9)*sin(p.y*2.7-t*.7)*sin(p.z*2.3+t*.5);p+=normal*w*.05;vec4 mv=modelViewMatrix*vec4(p,1.);vec3 n=normalize(normalMatrix*normal);f=pow(1.-abs(dot(n,normalize(-mv.xyz))),2.6);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 col;varying float f;void main(){gl_FragColor=vec4(col,f*.32);}`});
  const geo=new THREE.SphereGeometry(rad,mob?40:64,mob?28:44), shells=subs.map(s=>{const m=shell.clone();m.uniforms.col.value.setRGB(...s.c);const o=new THREE.Mesh(geo,m);S.add(o);return o;});
  // 粒：いくつの泡の中にあるかで明るさが変わる（重なり＝共有の場）
  const N=mob?6000:16000, P=new Float32Array(N*3);
  for(let i=0;i<N;i++){let x,y,z;do{x=Math.random()*2-1;y=Math.random()*2-1;z=Math.random()*2-1}while(x*x+y*y+z*z>1);P.set([x*3.3,y*2.7,z*1.8],i*3);}
  const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(P,3));
  const pm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{t:{value:0},c:{value:cen},r:{value:rad},px:{value:R.getPixelRatio()}},
    vertexShader:`uniform float t,r,px;uniform vec3 c[4];varying float k;varying float sh;void main(){vec3 p=position;p.y+=sin(t*.3+p.x*1.7)*.04;float n=0.;float e=0.;for(int i=0;i<4;i++){float d=distance(p,c[i]);n+=step(d,r);e+=smoothstep(.12,0.,abs(d-r));}k=n;sh=e;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=px*(1.2+step(1.5,n)*1.6)*(6./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float k;varying float sh;void main(){vec2 q=gl_PointCoord-.5;if(dot(q,q)>.25)discard;float a=k<.5?0.:(k<1.5?.035+sh*.12:.42+.2*(k-2.));vec3 col=k<1.5?vec3(.6,.78,.9):mix(vec3(.66,.95,.97),vec3(1.),clamp(k-2.,0.,1.));gl_FragColor=vec4(col,a);}`});
  S.add(new THREE.Points(pg,pm));
  const labs=subs.map(s=>{const d=document.createElement('span');d.className='cg-lb';d.textContent=s.n;d.setAttribute('data-i18n-en',s.e);box.appendChild(d);return d;});
  const mid=document.createElement('span');mid.className='cg-lb cg-mid';mid.textContent='共有の場';mid.setAttribute('data-i18n-en','Shared place');box.appendChild(mid);
  if(document.documentElement.getAttribute('data-lang')==='en'){labs.concat(mid).forEach(d=>d.textContent=d.getAttribute('data-i18n-en'));}
  function size(){const w=box.clientWidth,h=box.clientHeight;R.setSize(w,h,false);C.aspect=w/h;C.position.z=w<500?8.6:9;C.updateProjectionMatrix();}
  size(); addEventListener('resize',size);
  let vis=true, raf=0, t0=performance.now(), v=new THREE.Vector3();
  new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis&&!raf&&!reduce)raf=requestAnimationFrame(loop);}).observe(box);
  function frame(t){
    // 泡は離れたり寄ったりを繰り返す（ゆっくり）
    const g=.62+.38*Math.sin(t*.22);
    base.forEach((b,i)=>cen[i].set(b[0]*g+Math.sin(t*.4+i)*.08,b[1]*g+Math.cos(t*.35+i*1.3)*.08,b[2]));
    shells.forEach((o,i)=>{o.position.copy(cen[i]);o.material.uniforms.t.value=t+i;});
    pm.uniforms.t.value=t; S.rotation.y=Math.sin(t*.12)*.25;
    R.render(S,C);
    const w=box.clientWidth,h=box.clientHeight;
    cen.forEach((c,i)=>{v.set(base[i][0]*1.55,base[i][1]*1.55,c.z).applyMatrix4(S.matrixWorld).project(C);labs[i].style.transform=`translate(${(v.x*.5+.5)*w}px,${(-v.y*.5+.5)*h}px) translate(-50%,-50%)`;});
    v.set(0,0,0).project(C);mid.style.transform=`translate(${(v.x*.5+.5)*w}px,${(-v.y*.5+.5)*h}px) translate(-50%,-50%)`;mid.style.opacity=(1-g)*1.6;
  }
  function loop(n){raf=0;if(!vis)return;frame((n-t0)/1000);raf=requestAnimationFrame(loop);}
  if(reduce){t0=performance.now()-((Math.PI*1.5/.22)*1000);frame(Math.PI*1.5/.22);} else raf=requestAnimationFrame(loop);
}
