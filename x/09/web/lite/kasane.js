/* © mitsulab. Qualium の中で出会う作品の層（2026-11-10 本人「Qualia/literature・sound・keyaki・leaf・trace を Qualium の体験に重ねる」）。
   参道を歩く一人の目の高さで、その場所に一つずつ、作品の芯が 3D の形で浮かび上がる（札・カードは出さない。碧が短く話すだけ）。
   ・literature＝一枚の葉：受けとるものごとに別の出来事になる。
   ・sound＝言葉から組み立てた音：「木の雫の音」。触れると鳴る（最初は鳴らない）。録音ではない合成。
   ・keyaki＝年輪の輪：同じ一本を、生き物の目と機械の記録で見比べる。
   ・leaf＝入力の連なり：一つの動きが次の手がかりになる順を、光の粒の列で。
   ・trace＝雨の痕：雨のあと、葉に残った水が遅れて落ちる（記録計の光る線）。
   見え方：遠く（約 40 m 先）から淡く浮かび、近いほどはっきり。触れられるのは 16 m 以内だけ。描くのは 5 つの小さな形だけ（軽さ優先）。
   場所ごとの置き場は opt.spots（大宮・川越・渋谷で変える）。残すもの：なし。 */
import * as THREE from "three";

const LINES = {
  literature: [
    { t: "落ちた一枚の葉。受けとるものごとに、別の出来事になる。" },
    { t: "葉の上には、落ちる前から菌がすむ。人には、十一月の色。" },
    { t: "（出典：Vorholt 2012・Osono 2006。葉の上の菌の話）" },
  ],
  sound: [
    { t: "「木の雫の音」という言葉から、組み立てた音。" },
    { t: "録音ではなく、言葉をもとにした合成だよ。" },
  ],
  keyaki: [
    { t: "同じ一本の欅。ミツバチは、紫外・青・緑で受けとる。" },
    { t: "近赤外のカメラは、葉を明るく記録する。どちらも同じ木。" },
    { t: "（出典：Peitsch ほか 1992・Gates ほか 1965。色は模式）" },
  ],
  leaf: [
    { t: "欅が葉を手放す。人がそれを踏む。" },
    { t: "その動きが、次のだれかの手がかりになる。光の粒の順は模式。" },
  ],
  jikan: [
    { t: "参道でいちばん太いケヤキは、幹の回りが 5.80 メートルと記録された。" },
    { t: "3 メートルを超える巨木は 15 本。輪の広がりは、太る時間の模式。" },
    { t: "（出典：氷川の杜まちづくり協議会『氷川参道の樹木調査』）" },
  ],
  chikei: [
    { t: "この平らな道の下は台地。12〜13 万年ほど前は、浅い海の底だったと考えられている。" },
    { t: "その上に、箱根や富士の火山灰が積もった。線は地形の模式。" },
    { t: "（出典：国土交通省『土地分類基本調査 説明書「大宮」』2012）" },
  ],
  trace: [
    { t: "雨のあと、葉に残った水が、遅れて土に落ちる。" },
    { t: "記録計は、その量を一つの数として記録する。光の線は模式。" },
    { t: "（出典：Crockford & Richardson 2000・樹冠の雨の分かれ方）" },
  ],
};

// 形（どれも半径 0.3 m ほど・頂点は少なく）
function mergeGeos(list) {
  const P = [], N = [];
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; if (!g.attributes.normal) g.computeVertexNormals(); P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); return g;
}
function leafGeo() {   // 葉：先の尖った楕円を、中の筋で少し折る
  const g = new THREE.PlaneGeometry(1, 1, 14, 6), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) + .5, v = p.getY(i) * 2; const w = .17 * Math.pow(Math.sin(Math.PI * Math.min(1, u)), .9) * (1 - .35 * u);
    p.setXYZ(i, (u - .5) * .62, v * w, Math.abs(v) * w * .55 - .05 * Math.sin(u * Math.PI)); }
  g.computeVertexNormals(); return g;
}
function waveGeo() {   // 音の振動：ふるえる輪を二重に
  const ring = (r, a, k, tube) => { const c = new THREE.Curve(); c.getPoint = t => { const th = t * Math.PI * 2; const rr = r + a * Math.sin(th * k); return new THREE.Vector3(Math.cos(th) * rr, a * .6 * Math.cos(th * k), Math.sin(th) * rr); }; return new THREE.TubeGeometry(c, 96, tube, 5, true); };
  return mergeGeos([ring(.3, .035, 6, .009), ring(.19, .025, 4, .008), new THREE.SphereGeometry(.035, 10, 8)]);
}
function ringsGeo() {   // 年輪：薄い円盤（輪の模様は描き方で）
  const g = new THREE.CylinderGeometry(.3, .3, .045, 48, 1); return g;
}
function chainGeo() {   // 入力の連なり：四つの粒と、それをつなぐ細い線
  const pts = [new THREE.Vector3(-.32, -.12, 0), new THREE.Vector3(-.1, .06, .04), new THREE.Vector3(.12, -.02, -.03), new THREE.Vector3(.33, .14, 0)];
  const list = pts.map((p, i) => new THREE.SphereGeometry(.03 + i * .007, 10, 8).translate(p.x, p.y, p.z));
  list.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .006, 4, false)); return mergeGeos(list);
}
function traceGeo() {   // 雨の痕：落ちる雫と、記録計の光る線
  const c = new THREE.CatmullRomCurve3([0, .1, .2, .3, .4, .5, .6, .7, .8].map((t, i) => new THREE.Vector3((t - .4) * .7, (i % 2 ? .05 : -.04) * (1 - t) + (t > .6 ? (t - .6) * .5 : 0), 0)));
  const drop = new THREE.SphereGeometry(.05, 12, 10); { const p = drop.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y > 0 ? y * 1.9 : y); p.setX(i, p.getX(i) * (y > 0 ? 1 - y * 8 : 1)); p.setZ(i, p.getZ(i) * (y > 0 ? 1 - y * 8 : 1)); } drop.computeVertexNormals(); drop.translate(0, .3, 0); }
  return mergeGeos([new THREE.TubeGeometry(c, 64, .008, 4, false), drop]);
}
function contourGeo() {   // 地形：ゆがんだ等高線を三段、足もとの高さに
  const ring = (r, y, ph) => { const c = new THREE.Curve(); c.getPoint = t => { const th = t * Math.PI * 2, rr = r * (1 + .12 * Math.sin(th * 3 + ph) + .06 * Math.sin(th * 5)); return new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr * .7); }; return new THREE.TubeGeometry(c, 90, .012, 4, true); };
  return mergeGeos([ring(.9, 0, 0), ring(.62, .12, 1), ring(.34, .24, 2)]);
}
const FORMS = { jikan: [ringsGeo, 0xb48a62, 5], chikei: [contourGeo, 0xc8d0a8, 6], literature: [leafGeo, 0xd9b26a, 0], sound: [waveGeo, 0x9fc6d8, 1], keyaki: [ringsGeo, 0xc89a72, 2], leaf: [chainGeo, 0xb8d6a8, 3], trace: [traceGeo, 0xa9c9e6, 4] };

const VS = `varying vec3 vW; varying vec3 vN; varying vec3 vL;
void main(){ vL=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const FS = `uniform vec3 uC; uniform float uA; uniform float uT; uniform float uK; uniform float uOn; varying vec3 vW; varying vec3 vN; varying vec3 vL;
void main(){ vec3 n=normalize(vN), v=normalize(cameraPosition-vW); if(!gl_FrontFacing) n=-n; float nv=abs(dot(n,v)); float fr=pow(1.-nv,2.);
  float dif=.5+.5*max(0.,dot(n,normalize(vec3(.3,1.,.4))));
  float pat=0.;
  if(uK<.5){ pat=smoothstep(.012,.0,abs(vL.y))*.8 + smoothstep(.01,.0,abs(fract(vL.x*9.+abs(vL.y)*14.)-.5)-.47)*.25; }   // 葉の中の筋と側脈
  else if(uK>5.5){ pat=exp(-pow(fract(vL.y*4.-uT*.2)-.5,2.)*40.)*.9; }   // 地形の線を、上から下へ光が渡る
  else if(uK>4.5){ float r=length(vL.xz); pat=smoothstep(.05,.0,abs(fract(r*18.-uT*.12)-.5)-.42)*.8; }   // 年輪が外へ広がる（太る時間の模式）
  else if(uK<2.5 && uK>1.5){ float r=length(vL.xz); pat=smoothstep(.06,.0,abs(fract(r*26.+.15*sin(atan(vL.z,vL.x)*3.))-.5)-.40)*.7*step(.02,abs(vL.y)+.0) ; }   // 年輪
  else if(uK>3.5){ pat=exp(-pow(fract(vL.x*1.4-uT*.35)-.5,2.)*60.)*1.2; }   // 記録計の線を光が渡る
  else if(uK>2.5){ pat=exp(-pow(fract((vL.x+.35)*1.3-uT*.3)-.5,2.)*40.)*1.1; }   // 連なりを光が順に渡る
  else { pat=.25+.25*sin(uT*3.+length(vL.xz)*30.); }
  vec3 c=uC*(.28+.5*dif)+uC*pat*(.6+.6*uOn)+mix(uC,vec3(1.),.5)*fr*(.9+.8*uOn);
  float a=(.42+fr*.5+pat*.35)*uA;
  gl_FragColor=vec4(c,clamp(a,0.,.95));
  #include <colorspace_fragment>
}`;

let ac = null;
function playDrip() {   // 「木の雫の音」：高い音が下がる短いしずくを、間をおいて七つ（合成・録音ではない）
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.(); const t0 = ac.currentTime + .05; const out = ac.createGain(); out.gain.value = .22; out.connect(ac.destination);
    const del = ac.createDelay(1); del.delayTime.value = .21; const fb = ac.createGain(); fb.gain.value = .25; del.connect(fb).connect(del); del.connect(out);
    let t = t0; for (let i = 0; i < 7; i++) { const o = ac.createOscillator(), g = ac.createGain(), f = 1400 + Math.random() * 900; o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .45, t + .09);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5 + Math.random() * .3, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + .16); o.connect(g); g.connect(out); g.connect(del); o.start(t); o.stop(t + .2); t += .35 + Math.random() * .7; }
  } catch { }
}

export function attachKasane(q, opt = {}) {
  const spots = opt.spots || [];
  const root = new THREE.Group(); root.name = "kasane"; (q.world || q.scene).add(root);
  const items = spots.map(s => { const [gf, col, k] = FORMS[s.k]; const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(col) }, uA: { value: 0 }, uT: { value: 0 }, uK: { value: k }, uOn: { value: 0 } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const me = new THREE.Mesh(gf(), m); me.renderOrder = 6; me.frustumCulled = false; const y = (q.groundAt?.(s.x, s.z) ?? 0) + (s.h ?? 1.35); me.position.set(s.x, y, s.z); me.visible = false; root.add(me);
    return { ...s, me, y, on: 0, tOn: -99 }; });
  const _v = new THREE.Vector3(); let last = performance.now();
  function frame() {
    requestAnimationFrame(frame); const now = performance.now(), t = now / 1000, dt = Math.min(.1, (now - last) / 1000); last = now;
    const cam = q.camera; if (!cam) return; const walk = q.mode === "walk";
    for (const it of items) { const d = Math.hypot(it.x - cam.position.x, it.z - cam.position.z);
      const want = walk ? Math.min(1, Math.max(0, (42 - d) / 22)) * (.55 + .45 * Math.min(1, Math.max(0, (18 - d) / 10))) : 0;   // 遠くは淡く・近いほどはっきり（風景から浮かび上がる）
      const u = it.me.material.uniforms; u.uA.value += (want - u.uA.value) * Math.min(1, dt * 2.5); u.uT.value = t; it.me.visible = u.uA.value > .01;
      const on = now - it.tOn < 9000 ? 1 : 0; it.on += (on - it.on) * Math.min(1, dt * 3); u.uOn.value = it.on;
      if (!it.me.visible) continue;
      it.me.position.y = it.y + Math.sin(t * .9 + it.x) * .05;
      if (it.k === "literature") { it.me.rotation.set(.5 + Math.sin(t * .7) * .25, t * .25, Math.sin(t * .5) * .3); }
      else if (it.k === "chikei") { it.me.rotation.set(0, t * .05, 0); }
      else if (it.k === "keyaki" || it.k === "jikan") { it.me.lookAt(_v.set(cam.position.x, it.me.position.y, cam.position.z)); it.me.rotateX(Math.PI / 2 - .45); }
      else if (it.k === "sound") { it.me.rotation.set(.35, t * (.3 + it.on * .9), 0); const s = 1 + it.on * .08 * Math.sin(t * 18); it.me.scale.set(s, 1, s); }
      else { it.me.lookAt(_v.set(cam.position.x, it.me.position.y, cam.position.z)); it.me.rotateY(Math.PI / 2 * 0); }
    }
  }
  requestAnimationFrame(frame);
  return {
    items,
    pick(x, y) {   // 画面で 46px 以内・16 m 以内の形だけ（遠くの形には触れない）
      const cam = q.camera; let best = null, bd = 46 * 46;
      for (const it of items) { if (!it.me.visible) continue; const d = it.me.position.distanceTo(cam.position); if (d > 16) continue; _v.copy(it.me.position).project(cam); if (_v.z > 1) continue;
        const sx = (_v.x + 1) / 2 * innerWidth, sy = (1 - _v.y) / 2 * innerHeight, r = Math.max(46, 360 / d), dd = (sx - x) ** 2 + (sy - y) ** 2; if (dd < Math.max(bd, r * r) && dd < r * r) { bd = dd; best = it; } }
      if (!best) return false;
      best.tOn = performance.now(); navigator.vibrate?.(8); if (best.k === "sound") playDrip();
      if (best.k === "keyaki" && q.S6?.pickIk && !q.S6.state?.id) setTimeout(() => q.S6.pickIk("hachi"), 2600);   // 触れると、ミツバチの目に受けとり方が変わる（説明で終わらせない）
      q.speak?.(LINES[best.k]); return true;
    },
  };
}
