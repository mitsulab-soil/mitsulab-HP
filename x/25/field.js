// © mitsulab. 多主体の場 ── 環世界のコモングラウンド（2026-11-06）
// 写実の参道の地に、実在の主体・エージェント 11 が立つ。主体ごとの環世界（受けとる層）を膜として見せ、
// 膜どうしを地に沿う線（コモングラウンド）でつなぐ。ある主体のふるまい a_j が環境 E を変え、ほかの主体の受けとり P_i が変わる様子を、
// 波と光で順に見せる（E(t+1) = E(t) + Σ a_j(U_j)）。主体に触れる・名を押すと、その受けとり方に寄る（もう一度で戻る）。
// 大きさは見やすく描いた模式。生き物の 3D は Qualia/sight の写実の 3D（遠く用の軽い版）。見えていないときは描かない。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { loadSight } from './cgf/sightModels.js';

const A = [   // 位置 xz（z＋が手前）・膜の半径・膜の色・寄ったときの見え方（mode）
  {k:'keyaki', x:-3.4,z:-2.6,r:3.0,c:0x9fd89a,m:1},
  {k:'human',  x: .9, z: 1.2,r:1.7,c:0x8fa6c4,m:0},
  {k:'inu',    x: 2.7,z: 2.5,r:1.3,c:0xf0b98c,m:2},
  {k:'hiyo',   x:-1.4,z: 2.4,r:1.5,c:0x9fd8ff,m:3,y:2.3},
  {k:'aosuji', x:-3.0,z: 1.1,r:1.0,c:0x8fe8d8,m:3,y:1.0},
  {k:'bee',    x:-1.7,z: .2, r:1.0,c:0xf0d58c,m:3,y:.75},
  {k:'koumori',x: 3.4,z:-.9, r:1.4,c:0xb9a8ff,m:4,y:3.1},
  {k:'mimizu', x:-.5, z:-1.0,r:1.1,c:0xd9a07a,m:5},
  {k:'ai',     x: 4.6,z:-2.9,r:1.4,c:0x8ff7e0,m:6},
  {k:'sensor', x:-5.2,z: .6, r:1.3,c:0xb8f0a8,m:7},
  {k:'gis',    x: 1.6,z:-3.4,r:1.3,c:0xc9b8ff,m:8},
];
const K = Object.fromEntries(A.map((a,i)=>[a.k,i]));
// ある主体のふるまい → 環境の変化 → 受けとる主体（w＝伝わり方：g 地・a 空気・l 光・d 数値）
const EV = [
  {s:'human', t:['mimizu'], w:'g', ja:'人の足音 → 地面の振動 → ミミズが体で受けとる', en:'Footsteps → the ground trembles → the earthworm takes it in through its body'},
  {s:'human', t:['inu'], w:'a', ja:'人の足音 → 空気の音 → イヌが耳を向ける', en:'Footsteps → sound in the air → the dog turns its ears'},
  {s:'hiyo',  t:['human','ai'],   w:'a', ja:'ヒヨドリが鳴く → 空気の震え → 人が見上げ、AI のマイクが声の形を拾う', en:'A bulbul calls → the air trembles → a person looks up; the AI’s microphone picks up the shape of the call'},
  {s:'ai',    t:['human'],        w:'d', ja:'AI が声から種の名を推定し、画面に出す → 人の目に入り、文脈に一つ加わる', en:'The AI estimates the species from the call → one more thing enters the person’s context'},
  {s:'keyaki',t:['sensor','mimizu'],w:'l', ja:'ケヤキが日陰をつくり、葉を落とす → 地面の温度と落ち葉が変わる → 気象計と土の生き物が受けとる', en:'The zelkova casts shade and drops leaves → ground temperature and litter change → the gauge and the soil animals take it in'},
  {s:'mimizu',t:['keyaki'],       w:'g', ja:'ミミズが落ち葉を土へ引き込む → 根のまわりの土が変わる', en:'Earthworms pull leaves into the soil → the soil around the roots changes'},
  {s:'koumori',t:['koumori'],     w:'a', ja:'コウモリが超音波を出す → 反響が返る → 自分で虫の位置を知る（人には聴こえない高さ）', en:'A bat calls in ultrasound → echoes return → it locates insects (too high for human ears)'},
  {s:'bee',   t:['aosuji'],       w:'l', ja:'日の入り前、ミツバチが花を訪れる → 花に残る蜜が変わる → 次に来るチョウの受けとりが変わる', en:'A honeybee visits a flower → the nectar left changes → what the next butterfly finds changes'},
  {s:'aosuji',t:['hiyo'],         w:'l', ja:'チョウが舞う → 光の中の動き → ヒヨドリの目に入る', en:'A butterfly flutters → movement in the light → it enters the bulbul’s eye'},
  {s:'inu',   t:['inu','human'],  w:'g', ja:'イヌが匂いをたどり、新しい匂いを残す → 地面の匂いの道が変わる', en:'The dog follows scents and leaves new ones → the scent trails on the ground change'},
  {s:'sensor',t:['human'],        w:'d', ja:'気象計が気温と風を記録し、表示に出す → 人がその数値を見て、木陰を選ぶ', en:'The weather gauge records temperature and wind → a person reads it and chooses the shade'},
  {s:'gis',   t:['human','keyaki'],w:'d', ja:'GIS が標高の層から、雨水の集まる低い所を地図に出す → 人が根を守る手を入れる → ケヤキの受けとる水が変わる', en:'GIS shows the low ground where rain gathers → people act to protect the roots → the water the zelkova receives changes'},
];

// ---- 音（主体ごとの声部。最初は鳴らさず、「音を出す」に触れてから。リズムと間は出典で確かめた周期、音色だけを作る。聴こえない音は聴こえる高さに移した模式）
//  人の歩み 約 1.8 歩/秒／イヌの嗅ぎ 約 5 回/秒（Craven ほか 2010）／ミツバチの羽ばたき 約 230 回/秒（Altshuler ほか 2005）／
//  アブラコウモリの超音波（4 万 Hz 以上）は 1/64 に下げ、探す時の間隔 約 10 回/秒で／GNSS の更新 1 回/秒／ほかは一度だけ鳴る
let AC = null, OUT = null, NZ = null;
function audioOn(){ if (AC) { AC.resume(); return; } AC = new (window.AudioContext||window.webkitAudioContext)(); OUT = AC.createGain(); OUT.gain.value = .32;
  const cp = AC.createDynamicsCompressor(); OUT.connect(cp); cp.connect(AC.destination);
  NZ = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = NZ.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1; }
function env(t0, a, d, g){ const e = AC.createGain(); e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(g, t0+a); e.gain.exponentialRampToValueAtTime(.0001, t0+a+d); e.connect(OUT); return e; }
function tone(t0, f, d, g, type='sine', f2){ const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0+d*.8); o.connect(env(t0, .01, d, g)); o.start(t0); o.stop(t0+d+.05); }
function noise(t0, d, g, fq, q=1, type='bandpass'){ const s = AC.createBufferSource(); s.buffer = NZ; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = fq; f.Q.value = q; s.connect(f); f.connect(env(t0, .02, d, g)); s.start(t0, Math.random()*.5); s.stop(t0+d+.05); }
const VOICE = {
  human:  t => { for (let i=0;i<4;i++) { noise(t+i/1.8, .12, .5, 180, 1.5, 'lowpass'); } },
  inu:    t => { for (let i=0;i<5;i++) noise(t+i/5, .07, .35, 2200, 2.5); },
  bee:    t => { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 230; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; o.connect(f); f.connect(env(t, .25, 1.4, .12)); o.start(t); o.stop(t+1.8); },
  hiyo:   t => { tone(t, 3400, .22, .16, 'sine', 2300); tone(t+.3, 3000, .3, .13, 'sine', 2000); },
  aosuji: t => { for (let i=0;i<3;i++) tone(t+i*.42, 1320+i*110, .5, .04, 'triangle'); },
  koumori:t => { for (let i=0;i<10;i++) tone(t+i*.1, 70000/64, .03, .1, 'sine', 45000/64); },
  keyaki: t => { noise(t, 1.6, .18, 5000, .6, 'highpass'); tone(t+.1, 196, 1.8, .05, 'sine'); },
  mimizu: t => { tone(t, 55, 1.2, .3, 'sine', 48); noise(t, .9, .2, 120, 3); },
  ai:     t => { [0,.12,.24].forEach((d,i) => tone(t+d, 1760*(1+i*.5), .06, .06, 'square')); },
  sensor: t => { tone(t, 988, .5, .06, 'sine'); tone(t+.02, 1976, .3, .025, 'sine'); },
  gis:    t => { for (let i=0;i<3;i++) tone(t+i, 1318, .14, .07, 'sine'); },
};
const play = k => { if (!AC || AC.state !== 'running') return; try { VOICE[k](AC.currentTime + .02); } catch(e){} };
const isEn = () => document.documentElement.getAttribute('data-lang') === 'en';

export function start(box){ let AB = 0, abW = 0;
  if (innerHeight > innerWidth*1.1 && !A.packed){ A.packed = 1; A.forEach(a => { a.x *= .58; a.z *= 1.05; a.r *= .85; }); }
  const mob = innerWidth < 760, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const st = box.querySelector('.cgf-st'), cv = st.querySelector('canvas'), cap = box.querySelector('.cgf-cap'); const stSel = box;
  const R = new THREE.WebGLRenderer({canvas:cv, antialias:!mob, alpha:false, powerPreference:'high-performance'});
  R.setPixelRatio(Math.min(devicePixelRatio, mob?1.3:1.75)); R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.setClearColor(0x111a22);
  const S = new THREE.Scene(); S.fog = new THREE.Fog(0x1a232b, 12, 28);
  const C = new THREE.PerspectiveCamera(34, 1, .1, 80);
  const hemi = new THREE.HemisphereLight(0xdfe9f2, 0x2a2014, 1.15); S.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a0, 2.3); sun.position.set(-9, 5, 4); S.add(sun);
  const rim = new THREE.DirectionalLight(0x9fd8ff, .9); rim.position.set(6, 4, -8); S.add(rim);
  const U = {ab:{value:0}, t:{value:0}, mode:{value:0}, mk:{value:0}, sel:{value:new THREE.Vector2(0,0)}, rp:{value:new THREE.Vector4(0,0,-9,0)}};
  const tl = new THREE.TextureLoader(); let dirty = 1;
  const tex = (u,c) => { const t = tl.load(u, ()=>{dirty=1;}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = mob?2:8; if(c) t.colorSpace = THREE.SRGBColorSpace; return t; };
  // ---- 地：中央に参道の石畳（写実の質感）、両側は土。縁は霞に溶ける。寄ったときは主体ごとの模式の重ね（mode）
  { const pc = tex('../../img/hero/3d/ql_paving_c.webp',1), pn = tex('../../img/hero/3d/ql_paving_n.webp'), sc = tex('../../img/hero/3d/dio/soil_c.webp',1), sn = tex('../../img/hero/3d/dio/soil_n.webp');
    const m = new THREE.ShaderMaterial({uniforms:Object.assign({pc:{value:pc},pn:{value:pn},sc:{value:sc},sn:{value:sn}},U), fog:false,
      vertexShader:`varying vec2 v;void main(){v=position.xy;v.y=-v.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 v;uniform float t,mode,mk,ab;uniform vec2 sel;uniform vec4 rp;uniform sampler2D pc,pn,sc,sn;
      float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
      float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+1.),f.x),f.y);}
      void main(){float r=length(v);
        float road=smoothstep(1.9,1.6,abs(v.x-.3+.25*sin(v.y*.18)));
        vec3 pa=texture2D(pc,v*.85).rgb*vec3(.78,.76,.72); vec3 so=texture2D(sc,v*.38).rgb*.6+texture2D(sc,v*.09+.4).rgb*.4;
        vec3 nn=normalize(mix(texture2D(sn,v*.38).rgb,texture2D(pn,v*.85).rgb,road)*2.-1.);
        float lit=clamp(.5+.55*dot(vec3(nn.xy,nn.z),normalize(vec3(-.5,.4,.75))),.15,1.3);
        float shade=1.-.38*smoothstep(3.6,0.,length(v-vec2(-3.4,-2.6)));
        vec3 col=mix(so*vec3(.95,.9,.82)*1.15,pa*.92,road)*lit*shade;col*=.85+.3*n2(v*.35);
        // 波：rp.xy から rp.z の半径で広がる（主体のふるまいが地を変える）
        float wv=exp(-abs(length(v-rp.xy)-rp.z)*5.)*rp.w; col+=vec3(.66,.95,1.)*wv*.45;
        // 寄ったときの模式の重ね（強さ mk）
        float a=0.;vec3 tc=vec3(0.);
        if(mode>.5&&mode<1.5){a=.5*smoothstep(4.,0.,length(v-vec2(-3.4,-2.6)));tc=vec3(.45,.85,.4);}                       // 欅：光と日陰
        else if(mode<2.5&&mode>1.5){float s=smoothstep(.05,0.,abs(sin(v.x*1.3+n2(v*.6)*4.)-.0)-.02);a=s*.7;tc=vec3(1.,.66,.36);} // イヌ：匂いの道
        else if(mode<3.5&&mode>2.5){float q=smoothstep(.55,.8,n2(v*1.6+3.));a=.5*q;tc=vec3(.78,.66,1.);}                                     // 紫外を含む色
        else if(mode<4.5&&mode>3.5){a=.55*exp(-abs(fract(length(v-sel)*.5-t*.6)-.5)*14.);tc=vec3(.7,.6,1.);col*=.45;}      // 反響
        else if(mode<5.5&&mode>4.5){a=.6*exp(-abs(fract(length(v-sel)*.8-t*.4)-.5)*10.);tc=vec3(1.,.72,.5);col*=.6;}       // 振動
        else if(mode<6.5&&mode>5.5){vec2 g=abs(fract(v*.8)-.5);a=.5*smoothstep(.46,.5,max(g.x,g.y));tc=vec3(.56,.97,.88);}  // 画素の格子
        else if(mode<7.5&&mode>6.5){vec2 g=abs(fract(v*.5)-.5);a=.35*smoothstep(.48,.5,max(g.x,g.y))+.18*sin(t+v.x);tc=vec3(.7,.95,.66);} // 数値の網
        else if(mode>7.5){float hh=sin(v.x*.5+1.)*cos(v.y*.4)+.3*sin(r*.8);a=.7*smoothstep(.08,0.,abs(fract(hh*3.)-.5)-.44);tc=vec3(.78,.72,1.);} // 等高線
        col=mix(col,col*.62+tc*.6,a*mk*.75);
        {vec2 g=abs(fract(v*.9)-.5);float ln=smoothstep(.47,.5,max(g.x,g.y));col=mix(col,vec3(.03,.05,.08)+vec3(.56,.9,1.)*ln*.35+vec3(.66,.95,1.)*wv*.5,ab);}
        float fade=smoothstep(15.,5.,r); col=mix(vec3(.11,.14,.16),col,fade);
        gl_FragColor=vec4(col,1.);}`});
    const g = new THREE.Mesh(new THREE.CircleGeometry(16, mob?72:120), m); g.rotation.x = -Math.PI/2; S.add(g); }
  // ---- 霞（遠景の木立の影）：やわらかい縦の帯を奥に
  { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    for (let i=0;i<46;i++){ const px=Math.random()*256, w=4+Math.random()*10, h=60+Math.random()*60; const gr=x.createLinearGradient(0,128-h,0,128); gr.addColorStop(0,'rgba(30,46,40,0)'); gr.addColorStop(1,'rgba(30,46,40,.55)'); x.fillStyle=gr; x.fillRect(px,128-h,w,h); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false, fog:false});
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(15,15,9,48,1,true), m); cyl.position.y = 4.2; m.side = THREE.BackSide; S.add(cyl); }
  // ---- 主体の 3D
  const fit = (o, h) => { const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); const k = h/Math.max(s.y,.0001); o.scale.multiplyScalar(k); const b2 = new THREE.Box3().setFromObject(o); o.position.y -= b2.min.y; return o; };
  const fitL = (o, l) => { const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()); o.scale.multiplyScalar(l/Math.max(s.x,s.z,.0001)); return o; };
  const std = (c, r=.7, m=0) => new THREE.MeshStandardMaterial({color:c, roughness:r, metalness:m});
  const G = A.map(a => { const g = new THREE.Group(); g.position.set(a.x, a.y||0, a.z); S.add(g); a.g = g; a.base = (a.y||0); return g; });
  const mixers = [];
  const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
  const glb = u => new Promise((res,rej)=>gl.load(u,res,undefined,rej));
  const Q = [];   // 読み込みは一つずつ（こま落ちを抑える）
  const q = f => Q.push(f);
  q(async()=>{ const g = await glb('../../img/hero/3d/sando_keyaki.glb'); g.scene.traverse(m=>{ if(m.isMesh){ m.frustumCulled=false; const mt=m.material; if(mt&&mt.map) mt.map.anisotropy=4; if(mt&&/bark|trunk|wood|kan|miki/i.test(m.name+mt.name)&&mt.color) mt.color.setHex(0x7d7266);} }); G[K.keyaki].add(fit(g.scene, 6.2)); });
  q(async()=>{ const g = await glb('../../img/hero/3d/human.glb'); const o = fit(g.scene, 1.72); o.rotation.y = -2.3; G[K.human].add(o); });
  const sp = (id, key, len, clip, ry=0) => q(async()=>{ const m = await loadSight(id, {lod:'far', shadow:false}); fitL(m.object, len); m.object.rotation.y = ry; G[K[key]].add(m.object); if (clip) m.play(clip, 0); mixers.push(m); });
  sp('inu','inu',1.0,'sniff',-1.0); sp('hiyo','hiyo',.85,'fly'); sp('aosuji','aosuji',.7,'fly'); sp('koumori','koumori',.8,'fly'); sp('mimizu','mimizu',.55,'crawl',.6);
  // ミツバチ（形をつくる：頭・胸・腹の三つ、脚 6、翅 4、触角 2。毛の生えた胸、縞の腹）
  { const b = new THREE.Group(), s = .04;
    const st2 = (()=>{ const c=document.createElement('canvas'); c.width=64; c.height=8; const x=c.getContext('2d'); for(let i=0;i<64;i++){ x.fillStyle = (Math.floor(i/9)%2)?'#2a1d12':'#c48a2c'; x.fillRect(i,0,1,8);} const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; })();
    const head = new THREE.Mesh(new THREE.SphereGeometry(s*.9,16,12), std(0x241a12,.6)); head.position.z = s*2.1; head.scale.set(1,.95,.8);
    const tho = new THREE.Mesh(new THREE.SphereGeometry(s*1.15,18,14), std(0x7a5530,.95)); tho.position.z = s*.7;
    const abd = new THREE.Mesh(new THREE.SphereGeometry(s*1.2,20,16), new THREE.MeshStandardMaterial({map:st2, roughness:.55})); abd.scale.set(.95,.9,1.6); abd.position.z = -s*1.6; abd.rotation.x = .12;
    b.add(head, tho, abd);
    const legM = std(0x1d150f,.6);
    for (let i=0;i<3;i++) for (const sd of [-1,1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(s*.07,s*.05,s*2.2,5), legM); l.position.set(sd*s*.9, -s*.9, s*(1.2-i*.6)); l.rotation.z = sd*.7; l.rotation.x = (i-1)*.35; b.add(l); }
    const wM = new THREE.MeshStandardMaterial({color:0xe8f2ff, transparent:true, opacity:.32, roughness:.15, metalness:.1, side:THREE.DoubleSide, depthWrite:false});
    const wG = new THREE.CircleGeometry(s*1.6, 20); wG.scale(.55,1,1);
    const W = []; for (const sd of [-1,1]) for (const k of [0,1]) { const w = new THREE.Mesh(k?new THREE.CircleGeometry(s*1.05,16).scale(.5,1,1):wG, wM); const p = new THREE.Group(); p.position.set(sd*s*.5, s*.9, s*(.9-k*.5)); w.position.set(sd*s*1.2, 0, -s*.6); w.rotation.x = -Math.PI/2; w.rotation.z = sd*.5; p.add(w); b.add(p); W.push([p,sd]); }
    for (const sd of [-1,1]) { const an = new THREE.Mesh(new THREE.CylinderGeometry(s*.05,s*.05,s*1.6,4), legM); an.position.set(sd*s*.35, s*.7, s*3.0); an.rotation.x = 1.0; an.rotation.z = -sd*.3; b.add(an); }
    b.userData.W = W; G[K.bee].add(b); A[K.bee].bee = b; }
  // AI（実在の形：支柱の上の監視用カメラ。レンズとマイク）
  { const g = G[K.ai], gm = std(0x9aa3ad,.45,.6), dk = std(0x1a1f24,.35,.3);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,2.6,10), gm); pole.position.y = 1.3;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.4), gm); arm.position.set(0,2.5,.18);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.2,.18,.48), std(0xe9ecef,.4,.1)); body.position.set(0,2.4,.42); body.rotation.x = .25;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.06,16), dk); lens.rotation.x = Math.PI/2+.25; lens.position.set(0,2.34,.67);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(.24,.02,.56), std(0xd5d9de,.4,.2)); hood.position.set(0,2.5,.44); hood.rotation.x = .25;
    const mic = new THREE.Mesh(new THREE.SphereGeometry(.035,10,8), dk); mic.position.set(.12,2.32,.55);
    g.add(pole,arm,body,lens,hood,mic); g.rotation.y = -2.2; }
  // センサー（実在の形：放射よけの重ね皿〔温度・湿度〕と、三杯の風速計・風向計）
  { const g = G[K.sensor], gm = std(0xa9b0b6,.45,.6), wh = std(0xf2f3f0,.5,0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.035,.04,1.9,10), gm); mast.position.y = .95; g.add(mast);
    for (let i=0;i<7;i++){ const d = new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,.025,20), wh); d.position.set(.18,1.05+i*.045,0); g.add(d); }
    const ar = new THREE.Mesh(new THREE.BoxGeometry(.2,.02,.02), gm); ar.position.set(.09,1.2,0); g.add(ar);
    const cups = new THREE.Group(); cups.position.y = 1.95;
    for (let i=0;i<3;i++){ const a = i*Math.PI*2/3, rd = new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.22,4), gm); rd.rotation.z = Math.PI/2; rd.position.set(Math.cos(a)*.11,0,Math.sin(a)*.11); rd.rotation.y = -a; const cp = new THREE.Mesh(new THREE.SphereGeometry(.045,10,8,0,Math.PI*2,0,Math.PI/2), wh); cp.rotation.z = Math.PI/2; cp.position.set(Math.cos(a)*.22,0,Math.sin(a)*.22); cp.rotation.y = -a; cups.add(rd,cp); }
    g.add(cups); A[K.sensor].spin = cups;
    const vane = new THREE.Group(); vane.position.set(0,1.75,0); const vb = new THREE.Mesh(new THREE.BoxGeometry(.36,.012,.012), gm); const vf = new THREE.Mesh(new THREE.BoxGeometry(.1,.08,.006), wh); vf.position.x = -.17; vane.add(vb,vf); g.add(vane); A[K.sensor].vane = vane; }
  // GIS（実在の形：三脚に立つ GNSS の測位器。円い受信の皿と手もとの記録器）
  { const g = G[K.gis], gm = std(0xd8b04a,.55,.2), al = std(0xb9bfc4,.4,.7);
    for (let i=0;i<3;i++){ const a = i*Math.PI*2/3, l = new THREE.Mesh(new THREE.CylinderGeometry(.025,.02,1.5,6), gm); l.position.set(Math.cos(a)*.28,.7,Math.sin(a)*.28); l.lookAt(0,1.45,0); l.rotateX(Math.PI/2); g.add(l); }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.5,8), al); rod.position.y = 1.65; g.add(rod);
    const ant = new THREE.Mesh(new THREE.SphereGeometry(.15,20,10,0,Math.PI*2,0,Math.PI/2), std(0xf4f5f2,.35,0)); ant.scale.y = .5; ant.position.y = 1.92; const base = new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.05,20), std(0x2a2f34,.5,.2)); base.position.y = 1.9; g.add(ant, base);
    const ctl = new THREE.Mesh(new THREE.BoxGeometry(.1,.16,.03), std(0x24292e,.4,.3)); ctl.position.set(0,1.35,.06); g.add(ctl); }
  // ---- 環世界の膜（主体ごと。ゆらぐ半透明の殻、縁が光る）
  const memV = `uniform float t,amp;varying vec3 vn,vp;float h(vec3 p){return sin(p.x*3.1+t*.8)*sin(p.y*2.7-t*.6)*sin(p.z*2.9+t*.7);}
    void main(){vec3 p=position*(1.+amp*h(position*1.3));vec4 w=modelViewMatrix*vec4(p,1.);vn=normalize(normalMatrix*normal);vp=w.xyz;gl_Position=projectionMatrix*w;}`;
  const memF = `uniform vec3 c;uniform float o,pu;varying vec3 vn,vp;void main(){float f=pow(1.-abs(dot(normalize(-vp),vn)),3.2);gl_FragColor=vec4(c*(1.+pu*.6),min(.42,(f*.22+.004)*o*(1.+pu*1.4)));}`;
  A.forEach((a,i) => { const u = {t:U.t, amp:{value:.06}, c:{value:new THREE.Color(a.c)}, o:{value:1}, pu:{value:0}};
    const m = new THREE.Mesh(new THREE.SphereGeometry(a.r, mob?40:64, mob?24:40), new THREE.ShaderMaterial({uniforms:u, vertexShader:memV, fragmentShader:memF, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide}));
    m.position.set(a.x, Math.max(a.r*.62, (a.y||0)), a.z); m.scale.y = .78; m.renderOrder = 2; S.add(m); a.mem = m; a.u = u; a.pu = 0; a.o = 1; });
  A.forEach(a => { const d = new THREE.Mesh(new THREE.SphereGeometry(.09,16,10), new THREE.MeshBasicMaterial({color:a.c, transparent:true, opacity:0, depthWrite:false})); S.add(d); a.dot = d; });
  const abI = box.querySelector('.ab input'); if (abI) abI.addEventListener('input', () => { abW = abI.value/100; dirty = 1; });
  // ---- コモングラウンド：膜と膜を、地に沿う光の線でつなぐ（近い組だけ。中心は置かない）
  const links = [];
  { for (let i=0;i<A.length;i++) for (let j=i+1;j<A.length;j++){ const a=A[i], b=A[j], d=Math.hypot(a.x-b.x,a.z-b.z); if (d < 5.0) links.push([i,j]); }
    const N = 28, pos = new Float32Array(links.length*N*2*3), al = new Float32Array(links.length*N*2);
    const geo = new THREE.BufferGeometry(); let o = 0;
    links.forEach(([i,j],li) => { const a=A[i], b=A[j]; for (let k=0;k<N;k++) for (const e of [0,1]) { const s=(k+e)/N, x=a.x+(b.x-a.x)*s, z=a.z+(b.z-a.z)*s, y=.05+Math.sin(s*Math.PI)*.35; pos.set([x,y,z], o*3); al[o]=s; o++; } });
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3)); geo.setAttribute('s', new THREE.BufferAttribute(al,1));
    const lid = new Float32Array(links.length*N*2); links.forEach((_,li)=>lid.fill(li, li*N*2, (li+1)*N*2)); geo.setAttribute('li', new THREE.BufferAttribute(lid,1));
    const hot = new Float32Array(64); const hu = {value:hot};
    const m = new THREE.ShaderMaterial({uniforms:{t:U.t, hot:hu, ab:U.ab}, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      vertexShader:`attribute float s,li;varying float vs,vh;uniform float hot[64];uniform float ab;void main(){vs=s;vh=hot[int(li)];gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform float t,ab;varying float vs,vh;void main(){float p=.5+.5*sin(vs*18.-t*2.);gl_FragColor=vec4(vec3(.66,.95,1.)*(1.+vh*2.),(.16+.12*p)*(1.+vh*3.)*(1.+ab*1.6));}`});
    S.add(new THREE.LineSegments(geo, m)); links.hot = hot; }
  const linkOf = (i,j) => links.findIndex(([a,b]) => (a===i&&b===j)||(a===j&&b===i));
  // ---- 伝わる粒（ある主体から環境を通って、ほかの主体へ）
  const PN = 48, pp = new Float32Array(PN*3), pc = new Float32Array(PN*3), pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp,3)); pg.setAttribute('color', new THREE.BufferAttribute(pc,3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({size:mob?.14:.12, vertexColors:true, transparent:true, opacity:.95, depthWrite:false, blending:THREE.AdditiveBlending}));
  pts.frustumCulled = false; S.add(pts); const flows = [];
  // ---- 名の札（押すと寄れる）
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'cgf-ln'); svg.setAttribute('aria-hidden', 'true'); st.insertBefore(svg, cv.nextSibling);
  const LN = A.map(() => { const l = document.createElementNS(NS, 'line'); svg.appendChild(l); return l; });
  const lbs = A.map((a,i) => { const b = st.querySelector('.cgf-lb[data-k="'+a.k+'"]'); if (b) b.addEventListener('click', e => { e.stopPropagation(); pick(i); }); return b; });
  // ---- カメラ
  let yawW = null, yaw = .35, pitch = .42, dist = mob?17:14.5, tgt = new THREE.Vector3(0,.9,0), wantT = tgt.clone(), wantD = dist, sel = -1, idle = 0;
  const wantP = {v:pitch};
  function pick(i){ if (i>=0) play(A[i].k);
    if (sel === i || i < 0){ sel = -1; wantT.set(0,.9,0); wantD = mob?17:14.5; wantP.v = .42; U.mode.value = 0; box.classList.remove('sel'); }
    else { sel = i; const a = A[i]; wantT.set(a.x, Math.max(.7, (a.y||0)*.8), a.z); wantD = ['hiyo','aosuji','bee','koumori','mimizu'].includes(a.k) ? 2.8 : Math.max(4.6, a.r*3.0); wantP.v = .3; U.mode.value = a.m; U.sel.value.set(a.x, -a.z); box.classList.add('sel');
      const ref = a.k==='hiyo' ? A[K.ai] : a; const yy = Math.atan2(ref.x, ref.z); let d = yy - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yawW = yaw + d; }
    lbs.forEach((b,j) => b && b.classList.toggle('on', j===sel)); const bk = box.querySelector('.back'); if (bk) bk.hidden = sel < 0;
    showCap(); dirty = 1;
  }
  const info = box.querySelectorAll('.cgf-info [data-k]');
  function showCap(){ info.forEach(d => d.hidden = d.getAttribute('data-k') !== (sel<0?'':A[sel].k)); if (sel>=0) cap.classList.remove('on'); }
  // なぞって回す・押して選ぶ（触れた点にいちばん近い主体）
  let down = null, moved = 0;
  cv.addEventListener('pointerdown', e => { yawW = null; down = {x:e.clientX, y:e.clientY, yaw, pitch}; moved = 0; idle = 0; });
  addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX-down.x, dy = e.clientY-down.y; moved = Math.max(moved, Math.abs(dx)+Math.abs(dy)); if (moved > 6){ yaw = down.yaw - dx*.006; wantP.v = pitch = Math.min(1.1, Math.max(.12, down.pitch + dy*.004)); dirty = 1; } }, {passive:true});
  addEventListener('pointerup', e => { if (!down) return; const wasTap = moved < 7; down = null; if (!wasTap) return;
    const rc = cv.getBoundingClientRect(), mx = e.clientX-rc.left, my = e.clientY-rc.top; let bi = -1, bd = 1e9;
    A.forEach((a,i) => { const v = a.mem.position.clone().project(C); const sx = (v.x+1)/2*rc.width, sy = (1-v.y)/2*rc.height; const d = Math.hypot(sx-mx, sy-my); const rr = Math.max(34, a.r*rc.width/dist*.9); if (d < rr && d < bd){ bd = d; bi = i; } });
    pick(bi === sel ? -1 : bi); });
  // ---- 出来事の順番
  let evI = 0, evT = 0;
  function fire(){ const e = EV[evI++ % EV.length], si = K[e.s], s = A[si];
    U.rp.value.set(s.x, -s.z, 0, 1); s.pu = 1; play(e.s);
    e.t.forEach((k,n) => { const ti = K[k], t = A[ti]; const li = linkOf(si,ti); if (li>=0) links.hot[li] = 1;
      for (let m=0;m<6;m++) flows.push({first:m===0, src:e.s, a:s.mem.position.clone(), b:t.mem.position.clone(), t0:-(m*.09+n*.25), d:1.6+Math.hypot(s.x-t.x,s.z-t.z)*.12, c:new THREE.Color(s.c), ti, w:e.w}); });
    if (sel < 0){ cap.textContent = isEn()?e.en:e.ja; cap.classList.remove('on'); void cap.offsetWidth; cap.classList.add('on'); }
  }
  // ---- 大きさ・見えているときだけ描く
  let far = 1, portrait = false; const rs = () => { const w = st.clientWidth, h = st.clientHeight; R.setSize(w, h, false); C.aspect = w/h; far = Math.pow(Math.max(1, 1.5/C.aspect), .35); portrait = C.aspect < 1; C.updateProjectionMatrix(); dirty = 1; };
  new ResizeObserver(rs).observe(st); rs();
  let vis = true, raf = 0, last = performance.now();
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf){ last = performance.now(); raf = requestAnimationFrame(loop); } }, {threshold:.02}).observe(st);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !raf){ last = performance.now(); raf = requestAnimationFrame(loop); } });
  const tmp = new THREE.Vector3(), PL = [];
  function loop(now){ raf = 0; if (!vis || document.hidden) return;
    const dt = Math.min(.05, (now-last)/1000); last = now; const T = now/1000; U.t.value = T;
    if (Q.length && !loop.busy){ loop.busy = 1; const f = Q.shift(); f().catch(e=>console.warn('cgfield',e)).finally(()=>{ loop.busy = 0; dirty = 1; }); }
    // 生き物の動き
    mixers.forEach(m => m.update(dt));
    const hy = A[K.hiyo], ao = A[K.aosuji], be = A[K.bee], ko = A[K.koumori], dg = A[K.inu];
    const perch = sel === K.hiyo; loop.hp = (loop.hp||0) + dt*.45; const hp = loop.hp;
    if (perch){ if (!loop.pp){ loop.pp = new THREE.Vector3(0, 2.47, .34); A[K.ai].g.localToWorld(loop.pp); } hy.g.position.lerp(loop.pp, Math.min(1, dt*1.6)); hy.g.rotation.y += (A[K.ai].g.rotation.y + Math.PI - hy.g.rotation.y)*Math.min(1, dt*2);
      const hm = mixers.find(m => m.id === 'hiyo'); if (hm && hy.g.position.distanceTo(loop.pp) < .25 && hm.st !== 'perch'){ hm.play('perch', .4); hm.st = 'perch'; } }
    else { const to = new THREE.Vector3(hy.x + Math.cos(hp)*1.1, hy.base + Math.sin(T*.9)*.25, hy.z + Math.sin(hp)*.8); hy.g.position.lerp(to, Math.min(1, dt*(loop.pp?1.2:60))); hy.g.rotation.y = -hp;
      const hm = mixers.find(m => m.id === 'hiyo'); if (hm && hm.st === 'perch'){ hm.play('fly', .4); hm.st = 'fly'; } }
    ao.g.position.set(ao.x + Math.sin(T*.7)*.6, ao.base + Math.sin(T*2.3)*.18 + Math.sin(T*.5)*.15, ao.z + Math.cos(T*.6)*.5); ao.g.rotation.y = Math.atan2(Math.cos(T*.7)*.42, -Math.sin(T*.6)*.3);
    be.g.position.set(be.x + Math.sin(T*1.3)*.35, be.base + Math.sin(T*3.1)*.05, be.z + Math.cos(T*.9)*.3); be.g.rotation.y = Math.sin(T*.8)*1.2;
    if (be.bee) be.bee.userData.W.forEach(([p,sd]) => p.rotation.z = sd*Math.sin(T*90)*.6);
    ko.g.position.set(ko.x + Math.cos(T*.8)*1.4, ko.base + Math.sin(T*1.7)*.3, ko.z + Math.sin(T*1.1)*1.0); ko.g.rotation.y = -T*.8+Math.PI/2;
    dg.g.rotation.y = Math.sin(T*.25)*.4;
    const sn = A[K.sensor]; if (sn.spin){ sn.spin.rotation.y += dt*4.5; sn.vane.rotation.y = Math.sin(T*.3)*.6; }
    // 膜は主体についていく
    A.forEach((a,i) => { if (a.y) a.mem.position.set(a.g.position.x, a.g.position.y, a.g.position.z);
      a.pu = Math.max(0, a.pu - dt*.7); const cd = C.position.distanceTo(a.mem.position), inside = cd < a.r*1.25; const wo = (sel<0 ? 1 : (i===sel ? .35 : .18)) * (inside ? .08 : 1) * (1 - AB*.5); a.o += (wo-a.o)*Math.min(1,dt*4); a.u.o.value = a.o; a.u.pu.value = a.pu; a.u.amp.value = .05 + a.pu*.05; });
    for (let i=0;i<links.length;i++) links.hot[i] = Math.max(0, links.hot[i]-dt*.5);
    const rp = U.rp.value; rp.z += dt*2.6; rp.w = Math.max(0, rp.w - dt*.35);
    U.mk.value += ((sel<0?0:1) - U.mk.value)*Math.min(1,dt*3);
    // 粒
    let n = 0; for (let i=flows.length-1;i>=0;i--){ const f = flows[i]; f.t0 += dt/f.d; if (f.t0 >= 1){ A[f.ti].pu = Math.min(1.2, A[f.ti].pu + .35); if (f.first && f.ti !== K[f.src]) play(A[f.ti].k); flows.splice(i,1); continue; }
      if (f.t0 < 0 || n >= PN) continue; const s = f.t0; tmp.lerpVectors(f.a, f.b, s);
      tmp.y = (f.w==='g') ? .06 + Math.sin(s*Math.PI)*.12 : tmp.y + Math.sin(s*Math.PI)*(f.w==='d'?1.6:.8);
      pp.set([tmp.x,tmp.y,tmp.z], n*3); pc.set([f.c.r,f.c.g,f.c.b], n*3); n++; }
    for (let i=n;i<PN;i++) pp.set([0,-50,0], i*3); pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    if (!reduce){ evT += dt; if (evT > (sel<0?4.2:6)){ evT = 0; fire(); } }
    // カメラ
    idle += dt; if (sel < 0 && !down && idle > 2 && !reduce) yaw += dt*.035;
    if (sel >= 0 && yawW !== null && !down){ yaw += (yawW - yaw)*Math.min(1, dt*1.8); }
    if (sel >= 0){ const a = A[sel]; wantT.set(a.g.position.x, a.y ? a.g.position.y : Math.max(.5, a.r*.5), a.g.position.z); }
    tgt.lerp(wantT, Math.min(1, dt*2.2)); dist += (wantD*(sel<0?far:(portrait?1.45:1))-dist)*Math.min(1, dt*2.2); if (!down) pitch += (wantP.v + (portrait&&sel<0?.16:0) - pitch)*Math.min(1, dt*2);
    C.position.set(tgt.x + Math.sin(yaw)*Math.cos(pitch)*dist, tgt.y + Math.sin(pitch)*dist, tgt.z + Math.cos(yaw)*Math.cos(pitch)*dist); C.lookAt(tgt); S.fog.near = dist*.75; S.fog.far = dist*2.0;
    // 札を 3D の位置へ
    const rc = st.getBoundingClientRect();
    A.forEach((a,i) => { const b = lbs[i]; if (!b) return; if (i===sel){ tmp.copy(a.g.position); tmp.y += a.y ? .45 : Math.min(2.2, a.r*.9); } else { tmp.copy(a.mem.position); tmp.y += a.r*.78 + .15; } tmp.project(C);
      const off = tmp.z > 1 || Math.abs(tmp.y) > 1.1 || Math.abs(tmp.x) > 1.6; const hideO = sel>=0 && i!==sel; b.style.visibility = (off||hideO) ? 'hidden' : 'visible';   // 横に少し外れた札は端にとどめて見せる
      const ax = (tmp.x+1)/2*rc.width, ay = (1-tmp.y)/2*rc.height;
      const w = b.offsetWidth, h = b.offsetHeight; let x = ax - w/2, y = ay - h - 10; x = Math.max(16, Math.min(rc.width-w-16, x)); y = Math.max(portrait?118:70, Math.min(rc.height-150, y));
      PL[i] = {b, x, y, w, h, off, ax, ay, y0:y}; b.style.opacity = sel<0 ? 1 : (i===sel ? 1 : .35); });
    for (let it=0; it<5; it++) for (let i=0;i<PL.length;i++) for (let j=i+1;j<PL.length;j++){ const p = PL[i], q = PL[j]; if (!p||!q||p.off||q.off||(sel>=0)) continue;
      if (p.x < q.x+q.w+8 && q.x < p.x+p.w+8 && p.y < q.y+q.h+8 && q.y < p.y+p.h+8){ const o = (Math.min(p.y+p.h, q.y+q.h) - Math.max(p.y, q.y) + 9)/2; if (p.y < q.y){ p.y -= o; q.y += o; } else { p.y += o; q.y -= o; } } }
    PL.forEach((p,i) => { if (!p) return; p.y = p.y0 + Math.max(-70, Math.min(70, p.y - p.y0));
      p.b.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
      const ln = LN[i]; if (ln){ const show = !p.off && (sel<0 || i===sel); ln.setAttribute('x1', (p.x+p.w/2).toFixed(1)); ln.setAttribute('y1', (p.y+p.h).toFixed(1)); ln.setAttribute('x2', Math.max(2, Math.min(rc.width-2, p.ax)).toFixed(1)); ln.setAttribute('y2', p.ay.toFixed(1)); ln.style.opacity = show ? .5 : 0; } });
    AB += (abW-AB)*Math.min(1,dt*3); U.ab.value = AB;
    if (Math.abs(AB-(loop.lastAB??-1))>.002){ loop.lastAB = AB; G.forEach(g => g.traverse(o => { if (o.isMesh && o.material){ const ms = Array.isArray(o.material)?o.material:[o.material]; ms.forEach(mt => { if (mt.userData.o0 === undefined){ mt.userData.o0 = mt.opacity; mt.userData.t0 = mt.transparent; } mt.transparent = AB>.01 || mt.userData.t0; mt.opacity = mt.userData.o0*(1-AB*.94); mt.depthWrite = AB<.5; }); } })); G.forEach(g => g.visible = AB < .92); }
    A.forEach(a => { a.dot.position.copy(a.mem.position); a.dot.material.opacity = AB; });
    lbs.forEach((b,i) => b && b.classList.toggle('ab', AB>.5));
    R.render(S, C); dirty = 0;
    raf = requestAnimationFrame(loop);
  }
  const bk0 = box.querySelector('.back'); if (bk0) bk0.addEventListener('click', e => { e.stopPropagation(); pick(-1); });
  const sb = box.querySelector('.cgf-snd'); if (sb) sb.addEventListener('click', e => { e.stopPropagation(); const on = sb.getAttribute('aria-pressed') !== 'true'; sb.setAttribute('aria-pressed', on); if (on){ audioOn(); } else if (AC) AC.suspend(); const en = isEn(); sb.textContent = on ? (en?'Sound off':'音を止める') : (en?'Sound on':'音を出す'); });
  st.classList.add('on'); setTimeout(fire, 900);
  raf = requestAnimationFrame(loop);
}
