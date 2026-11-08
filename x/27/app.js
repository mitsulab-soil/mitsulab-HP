// © mitsulab. Qualia/leaf ── 一枚の葉の連なり（2026-11-08 集約：Qualia/literature〔文学の思想〕＋ Qualia/compute〔計算機の思想〕）
// 欅が手放した一枚の葉が、受けとるものの数だけ別の出来事になり（literature）、環境を介して互いの入力になって、菌と細菌から養分として欅へ戻る（compute）。
//   U_i = g_i( P_i(E, B_i), K_i )   E(t+1) = F(E(t)) + Σ a_j(U_j)   U_人′ = g_人( P_人(E, B_人), K_人 ⊕ L )
// 抽象の極（式と流れ）から始まり、下へなぞると朝の参道へ降りる。主体のふるまい a が環境 E に波を残し、波が届いた主体の P に入り、
// その主体の g を経て、また a になる。渡るたびに弱まり（F の減衰）、ひとりでに静まる。人がほかの全員から受けとると、文脈に層 L が加わる。
// 波の広がりは模式（実際の伝わり方や速さではない）。典拠と音の根拠＝../資料/出典と音の根拠.md
const P = window.AW_PATHS; const T0 = performance.now(); const AMK = window.__appMK = {};
const [{ createAwai, injectCSS, lineMat, pointMat, fadeBy, AW, MOBILE, RM, TAU, clamp, lerp, ss }, PR, S, CR] = await Promise.all([
  import(P.kit + "awai.js"), import(P.kit + "awai_props.js"), import(P.kit + "awai_sound.js"), import(P.kit + "creatures_sight.js")]);
import * as THREE from "three";
AMK.mods = Math.round(performance.now() - T0); injectCSS();
const V3 = THREE.Vector3;

const W = await createAwai({
  title: "Qualia/leaf", sub: "一枚の葉の連なり", en: "One Leaf, Many Events", tex: P.tex, aoi: P.aoi, keyaki: P.keyaki, sprig: P.sprig, aoiAt: innerWidth < innerHeight * .8 ? [-.9, -1.5, -.2] : [1.4, -5.6, .1], seed: 2222, abs0: 0,
  rig: (a, y) => { const k = ss(0, 1, a), piv = new V3(0, 0, .4), back = lerp(6.4, 5.0, k), h = lerp(1.55, 1.7, k);   // 11-06 本人「俯瞰でなく主観の体験に」：抽象でも、その場に立つ人の目の高さ（約 1.6 m）のまま。一歩前へ出て、場の波を自分の足もとから受けとる   // 11-06 二版の後：抽象を一歩寄せる（主体が小さく、画面の下が空いていた）
    const pos = new V3(piv.x + Math.sin(y) * back, h, piv.z + Math.cos(y) * back), look = new V3(0, lerp(1.0, 0, k), lerp(-1.6, .2, k));
    if (innerWidth < innerHeight * .8) { const q = ss(.3, 1, a); pos.lerp(new V3(.1 + Math.sin(y) * 1.2, 1.75, 7.6), q); look.lerp(new V3(.1, .1, .4), q);   /* 縦長も目の高さのまま（真上から見下ろさない） */   /* 11-06 二版の後：主体を画面の中ほどへ下ろし、一歩寄せる（下半分が空いていた） */ }   // 縦長の画面の抽象は、真上に近い高い俯瞰（五つの主体が画面の内側に入る）
    return { pos, look }; },
  credits: [
    "式は関係の形を示す模式（測れる量の式ではない）。E 環境・B 身体・P 知覚・K 経験と文脈・g 意味づけ・a ふるまいが環境に残す変化・F 環境自身の変化・L ほかの受けとり方の層",
    "考え方の系譜：ユクスキュル（1934）・ウィーナー『サイバネティクス』（1948）・グラッセのスティグマジー（1959）・ハッチンス『Cognition in the Wild』（1995）",
    "葉の表には落ちる前から菌や細菌がすみ、落ち葉は数か月から年の単位で分解されて土へ還る。ここでは時間を縮めた模式で、菌の音は実測音ではない合成音",
    "ミツバチの羽ばたき 約 230 回／秒：Altshuler ほか（PNAS 102, 2005）。歩く拍 毎分約 100 歩（中くらいの速さで歩くときの目安：Tudor-Locke ほか IJBNPA 16, 2019）",
    "波の広がりと速さ、木の間（ま）は作品の設定の値（模式）。記録計の一音は 10 分ごとの記録を縮めた模式。鳥の鳴きは声域を参考にした合成音（実測音ではありません）",
    "質感：Poly Haven・ambientCG（CC0）。生き物の形：mitsulab の造形。碧の 3D・声・文：mitsulab",
  ],
});
const { scene, R, camera } = W; AMK.stage = Math.round(performance.now() - T0);
// Enlarged captions scroll without changing the scene behind them.
const scrollCaption = W.ui.querySelector(".aw-cap");
scrollCaption.tabIndex = 0;
scrollCaption.addEventListener("wheel", e => e.stopPropagation(), { passive: true });
scrollCaption.addEventListener("keydown", e => { if (e.key.startsWith("Arrow") || ["PageUp", "PageDown", "Home", "End", " "].includes(e.key)) e.stopPropagation(); });
// The visible abstraction axis also supports keyboard and assistive technology.
const accessAxis=W.ui.querySelector('.aw-axis');
if(accessAxis){accessAxis.tabIndex=0;accessAxis.setAttribute('role','slider');accessAxis.setAttribute('aria-label','具体と抽象の視点');accessAxis.setAttribute('aria-valuemin','0');accessAxis.setAttribute('aria-valuemax','100');accessAxis.setAttribute('aria-orientation','vertical');
 accessAxis.addEventListener('keydown',e=>{let v=W.absTarget;if(['ArrowUp','ArrowRight'].includes(e.key))v+=.1;else if(['ArrowDown','ArrowLeft'].includes(e.key))v-=.1;else if(e.key==='Home')v=0;else if(e.key==='End')v=1;else return;e.preventDefault();e.stopPropagation();W.setAbs(v);});
 const syncAxis=()=>{const n=Math.round(W.absTarget*100);accessAxis.setAttribute('aria-valuenow',String(n));accessAxis.setAttribute('aria-valuetext',n===0?'具体の風景':n===100?'抽象の関係':'抽象度 '+n+'%');};syncAxis();setInterval(syncAxis,200);
 const style=document.createElement('style');style.textContent='.aw-axis:focus-visible{outline:2px solid #b9f5ff;outline-offset:4px;border-radius:8px}.aw-fold>summary{width:auto;height:auto;min-height:44px;max-width:70vw;padding:2px 10px;box-sizing:border-box;white-space:normal;font-size:12px;background:#09111bd9;border-radius:6px}';document.head.appendChild(style);
}
const snd = S.createSound(W.sndBtn);
W.onFirstInput(() => snd.start());
// 2026-11-07: existing credits fold also offers an optional next question.
{
 const fold=W.ui.querySelector('.aw-fold'), body=fold?.querySelector('div');
 if(body){
  fold.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
  fold.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))e.stopPropagation();if(e.key==='Escape'){e.stopPropagation();fold.open=false;fold.querySelector('summary').focus({preventScroll:true});}});
  body.insertAdjacentHTML('afterbegin',"<section class=\"q-route\"><h3>身近な木へ、問いを返す。</h3><p>ひとつの変化が、ほかの生き物や人にどう届くでしょうか。画面から顔を上げ、身近な木のまわりで手がかりを探してみてください。</p><button type=\"button\" data-question-return>風景に戻る</button><a href=\"../21/\">一枚の葉を、言葉で読む（Qualia/literature）→</a><a href=\"../22/\">関係を、流れで見る（Qualia/compute）→</a><a href=\"../19/\" data-question-local=\"../../12_ひとつの木/★実行データ/\">一本の木を、もう一度 →</a><a href=\"../24/\" data-question-local=\"../../13_Qualia_translate/★実行データ/\">人と機械を見比べる →</a></section>");
  fold.querySelector('summary').setAttribute('aria-label','主体の選択・典拠と次の問い');fold.querySelector('summary').textContent='主体・典拠 ＋';
  if(!/\/x\/\d+(\/|$)/.test(location.pathname))body.querySelectorAll('[data-question-local]').forEach(a=>a.href=a.dataset.questionLocal);
  body.querySelector('[data-question-return]').addEventListener('click',e=>{
   e.stopPropagation();W.setAbs(0);if(snd.on)W.sndBtn.click();
   W.sayNow('身近な木のまわりで、一つの変化がどこへ届くか、確かめてみてください。',8);
   fold.open=false;fold.querySelector('summary').focus({preventScroll:true});
  });
 }
}

if (innerWidth < innerHeight * .8) W.aoi.then(a => a && a.place(-1.4, -3.4, -.1));   /* 縦長：波の届く輪から外す */   // 縦長の画面では、碧を横から見た画の内側へ

// ───────── 式（左上・抽象の側でだけ見える）
const fx = document.createElement("details"); fx.className = "fx";
for (const ev of ["pointerdown","pointerup","click","wheel","keydown"]) fx.addEventListener(ev,e=>e.stopPropagation());
fx.innerHTML = `<summary>＋ 関係を式で見る</summary><p><span data-k="U">U<sub>i</sub></span> = <span data-k="g">g<sub>i</sub></span>( <span data-k="P">P<sub>i</sub></span>(<span data-k="E">E</span>, B<sub>i</sub>), <span data-k="K">K<sub>i</sub></span> )</p>
<p><span data-k="E">E</span>(t+1) = <span data-k="F">F</span>(E(t)) + Σ <span data-k="a">a<sub>j</sub></span>(U<sub>j</sub>)</p>
<p class="fxL"><span data-k="U">U<sub>人</sub>′</span> = g<sub>人</sub>( P<sub>人</sub>, <span data-k="L">K<sub>人</sub> ⊕ L</span> )</p>`;
W.ui.appendChild(fx);
{ const st = document.createElement("style"); st.textContent = `.fx{position:absolute;left:max(16px,env(safe-area-inset-left));top:calc(86px + env(safe-area-inset-top));font-family:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace;font-size:12.5px;line-height:2;letter-spacing:.04em;color:#e0eaf2;transition:opacity .6s;pointer-events:auto;max-width:calc(100vw - 32px);box-sizing:border-box;background:#09111bd9;border-radius:6px;padding:0 10px}.fx summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font:12px/1.6 sans-serif;list-style:none}.fx summary:focus-visible{outline:2px solid #b9f5ff}.fx[open]{padding-bottom:10px}
.fx p{margin:0}.fx sub{font-size:.72em}.fx span{transition:color .25s,text-shadow .25s}.fx span.hi{color:#eef5fb;text-shadow:0 0 12px rgba(155,220,240,.9)}.fx .fxL{opacity:0;transition:opacity 1.2s}.fx.L .fxL{opacity:1}
@media (max-width:520px){.fx{font-size:11px;line-height:1.85}}`; document.head.appendChild(st); }
const hi = k => { for (const e of fx.querySelectorAll(`[data-k="${k}"]`)) { e.classList.add("hi"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("hi"), 520); } };

// ───────── 場 E：波（a が残した変化）を地の上に。点の格子は抽象の側で波に合わせて揺れる
const NR = 14, RIP = Array.from({ length: NR }, () => new THREE.Vector4(0, 0, -99, 0)), RCOL = Array.from({ length: NR }, () => new THREE.Color());
const SPEED = 2.1;   // 波の見える速さ（m/s・模式）
const ripU = { uT: { value: 0 }, uRip: { value: RIP }, uRC: { value: RCOL }, uAbs: AW.uAbs, uV: { value: SPEED } };
const ripFn = `uniform float uT, uV, uAbs; uniform vec4 uRip[${NR}]; uniform vec3 uRC[${NR}];
vec4 field(vec2 p){ vec3 c = vec3(0.); float h = 0.;
  for (int i = 0; i < ${NR}; i++){ vec4 r = uRip[i]; float age = uT - r.z; if (age < 0. || age > 7.) continue;
    float d = length(p - r.xy), f = d - age * uV, w = .035 + age * .012;
    float ring = exp(-f * f / (w * w)) * r.w * exp(-age / 3.2) * exp(-d / 9.); float wide = exp(-f * f / .5) * r.w * .05 * exp(-age / 3.2);
    float echo = exp(-pow(f + .42, 2.) / (w * w * 1.4)) * r.w * .4 * exp(-age / 2.4) * exp(-d / 9.);
    c += uRC[i] * (ring + echo + wide); h += (ring * 3. + wide * 8.) * sin(f * 6.); }
  return vec4(c, h); }`;
const ripMat = new THREE.ShaderMaterial({ uniforms: ripU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: ripFn + `varying vec2 vP; void main(){ vec4 f = field(vP); float k = mix(.22, 1., smoothstep(.1, .7, uAbs)); gl_FragColor = vec4(f.rgb * k * .75, 1.); }` });
const ripPlane = new THREE.Mesh(new THREE.PlaneGeometry(36, 36).rotateX(-Math.PI / 2), ripMat); ripPlane.position.y = .04; ripPlane.renderOrder = 4; W.add(ripPlane);
{ const N = MOBILE ? 46 : 70, sz = 22, pts = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pts.push((i / (N - 1) - .5) * sz, 0, (j / (N - 1) - .5) * sz - .5);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const m = new THREE.ShaderMaterial({ uniforms: { ...ripU, uDot: { value: (await import(P.kit + "awai.js")).dotTex() }, uSz: { value: MOBILE ? 7 : 6 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: ripFn + `uniform float uSz; varying float vA; varying vec3 vC; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vec4 f = field(w.xz); w.y += .05 + f.w * .22; vC = vec3(.55, .78, .86) + f.rgb * 1.4;
      vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv; gl_PointSize = uSz * (1. + length(f.rgb)) * (8. / -mv.z); vA = smoothstep(.3, .85, uAbs) * (.32 + length(f.rgb)) * (1. - smoothstep(9., 12., length(w.xz))); }`,
    fragmentShader: `uniform sampler2D uDot; varying float vA; varying vec3 vC; void main(){ float a = texture2D(uDot, gl_PointCoord).a; gl_FragColor = vec4(vC * a * vA, 1.); }` });
  W.add(new THREE.Points(g, m)); }
let rI = 0;
const ripple = (x, z, amp, col) => { RIP[rI].set(x, z, ripU.uT.value, amp); RCOL[rI].set(col); rI = (rI + 1) % NR; };

// ───────── 主体（ノード）
const tree = W.near.map(t => { const p = t.wood[0].attributes.position; return new V3(p.getX(0), 0, p.getZ(0)); }).filter(v => v.x < 0).sort((a, b) => Math.abs(a.z + 2.5) - Math.abs(b.z + 2.5))[0] || new V3(-5.4, 0, -2.5);
tree.x += .6;   /* 輪は幹の根もとのそば（縦長でも動かさない） */
const fungiP = new V3(tree.x + 1.1, 0, tree.z - .9);   // 落ち葉のたまる、欅の根もと
const tit = CR.makeTit(); PR.awaiCreature(tit, .5); tit.scale.setScalar(.3); tit.position.set(-2.0, 0, 2.0); tit.rotation.y = .7; tit.userData.state = "perch"; PR.bakeRigid(tit); if (MOBILE) PR.flattenSmall(tit, { wings: true }); W.add(tit);
const tw = PR.tsuwabuki(R, { n: 11, spread: .42 }); tw.position.set(1.7, 0, 1.55); tw.scale.setScalar(1.5); W.add(tw);   /* 11-06：花が見える大きさに（十一月に咲く黄の頭花） */
const bee = CR.makeBee(); PR.awaiCreature(bee, .5); bee.scale.setScalar(.034); PR.bakeRigid(bee, { dropFur: MOBILE }); if (MOBILE) { const bp = bee.userData.parts; bp.wings.forEach(w => w.hw.visible = false); PR.flattenSmall(bee, { collapse: bp.body, keep: bp.wings.flatMap(w => [w.fw, w.hw]) }); }   /* スマホ：後翅は前翅に重なるので省き、体の部品を一つに */ W.add(bee); const beeHome = tw.userData.heads[0].clone().add(tw.position);
const person = PR.contourPerson(0xe9d2c2); person.position.set(-1.0, 0, 2.8); person.rotation.y = .25; W.add(person);
const sens = PR.sensorPost(); sens.position.set(innerWidth < innerHeight * .8 ? 1.3 : 2.3, 0, -.9); sens.rotation.y = -.4; PR.bakeRigid(sens); W.add(sens);

const PORT = innerWidth < innerHeight * .8;
if (PORT) { tit.position.copy(tree).add(new V3(.85, 0, 1.9)); person.position.set(-.2, 0, 2.4); tw.position.set(1.15, 0, 1.4); sens.position.set(.9, 0, -.9); }
if (PORT) tit.position.x = Math.max(tit.position.x, -.5);   // 縦長：シジュウカラを目の高さの画面の内側へ
beeHome.copy(tw.userData.heads[0]).multiplyScalar(tw.scale.x).add(tw.position);
// 蜂の居場所の手がかり：体は実物の大きさのまま、羽ばたきの光の小さな点が明滅する（触れると強く）
const beeGlowM = pointMat(0xfff1c8, MOBILE ? .2 : .16, 1); const beeGlow = new THREE.Points(new THREE.BufferGeometry().setFromPoints([new V3()]), beeGlowM); W.add(beeGlow);   // 蜂は花の上に（縦長で花を動かしたあとも・大きさも含めて）
{ const P = [tree, tit.position, tw.position, person.position, sens.position, fungiP];   /* どの主体の輪も 1.3 m 以上離す（近ければ奥行きの向きへ押す）。欅は動かさない */
  for (let it = 0; it < 6; it++) for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const d = P[j].clone().sub(P[i]).setY(0); if (d.length() < 1.3) { const push = d.lengthSq() < 1e-4 ? new V3(0, 0, 1) : d.clone().normalize(); P[j].addScaledVector(push, 1.3 - d.length()); } } }   /* 縦長の俯瞰：五つの輪を五角に近く、1.2 m 以上離す */
const C = { tit: 0xb9a7e6, bee: 0xf2cf8c, hum: 0xf4aa96, tree: 0x8fd6a8, sens: 0xa9c8d8, fungi: 0xd8b98a };
const N = [
  { id: "tit", sub: "シジュウカラ", col: C.tit, at: () => tit.position, h: .9, lag: .25, f: snd.note(7),
    c: "シジュウカラが落ち葉をめくり、ひとつ跳ぶ。その声と影が、まわりの入力になる。", a: "鳥は、鳥の身体で拾えるものだけを手がかりにする。紫外も見える目で。", out: ["声", "動き"], in: ["足音", "動き", "声", "落葉"],
    voice: o => { for (let k = 0; k < 3; k++) { snd.chirp(5200, 4900, .06, { ...o, at: (o.at || 0) + k * .42 }); snd.chirp(3700, 3450, .19, { ...o, at: (o.at || 0) + k * .42 + .1 }); }   /* ツツピー（シジュウカラのさえずりの句。声域 3〜6 kHz の模式） */ }, act: () => { hop = 1; } },
  { id: "bee", sub: "ミツバチ", col: C.bee, at: () => tw.position, h: .75, lag: .15, f: snd.note(3),
    c: "ミツバチがツワブキのまわりを飛ぶ。羽音は、一秒に約 230 回のはばたき。", a: "蜂は、身体の拾えるものだけを手がかりにする。紫外・青・緑の三つで色を分けるとされる。", out: ["羽音", "動き"], in: ["動き", "光"],
    voice: o => snd.hum(230, .7, { ...o, gain: (o.gain ?? .3) * .7 }), act: () => { beeKick = 1; } },
  { id: "hum", sub: "人", col: C.hum, at: () => person.position, h: 1.95, lag: .6, f: snd.note(0), seen: new Set(),
    c: "人が歩く。一歩ごとの足音が、鳥を振り向かせる。", a: "人は、経験と言葉で、同じ手がかりに別の意味をつける。", out: ["足音", "動き"], in: ["声", "羽音", "落葉", "記録"],
    voice: o => { for (let i = 0; i < 2; i++) { snd.step({ ...o, at: (o.at || 0) + i * .6, gain: (o.gain ?? .3) * 1.3, f: 480 + i * 120 }); snd.wood(snd.note(-5 + i), { ...o, at: (o.at || 0) + i * .6, decay: .4, gain: (o.gain ?? .3) * .2 }); } }, act: () => { steps = 1.2; } },   // 歩行 毎分約 100 歩＝0.6 秒
  { id: "tree", sub: "欅", col: C.tree, at: () => tree, h: 3.2, lag: 2.0, f: snd.note(-5),
    c: "欅は、冷えていく朝を受けとり、黄に染まった葉を一枚ずつ手放す。", a: "木のふるまいは遅く、大きい。季節に応じて葉を落とし、その葉が鳥と人の入力になる。", out: ["落葉"], in: ["気温", "光", "風", "養分"],
    voice: o => { snd.wood(snd.note(-10), { ...o, decay: 1.8 }); snd.breath(2.2, { ...o, f0: 1400, f1: 700, gain: (o.gain ?? .3) * .5 }); }, act: () => dropLeaf() },
  { id: "sens", sub: "記録計", col: C.sens, at: () => sens.position, h: 1.85, lag: 1.0, f: snd.note(5),
    c: "気温の記録計は、朝の冷えを、ただ一つの数として書きとめる。", a: "機械の受けとり方も、同じ形で書ける。その記録は、読む人の入力になる。", out: ["記録"], in: ["気温"],
    voice: o => { snd.click({ ...o, f: 1760 }); snd.bell(snd.note(12), { ...o, gain: (o.gain ?? .3) * .4, decay: .4 }); }, act: () => {} },   // 記録が残るときだけ一音
  { id: "fungi", sub: "菌と細菌", col: C.fungi, at: () => fungiP, h: .35, lag: 3.0, f: snd.note(-8),
    c: "落ち葉の下で、菌と細菌が葉を分けはじめる。", a: "菌と細菌には、葉は食べもの。何か月もかけて分け、養分として土へ還す（ここでは時間を縮めた模式）。", out: ["養分"], in: ["落葉"],
    voice: o => snd.breath(1.4, { ...o, f0: 320, f1: 220, gain: (o.gain ?? .3) * .4 }), act: () => { fungiK = 1; } },
];
// 菌と細菌の居場所：根もとの落ち葉の重なりと、葉の表の細かな点
let fungiK = 0;
{ const lt = PR.keyakiLeaf(.07), n = 18, im = new THREE.InstancedMesh(lt.geometry, lt.material, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) { const a = R() * TAU, r = Math.pow(R(), .6) * .38; q.setFromEuler(new THREE.Euler(-Math.PI / 2 + (R() - .5) * .3, 0, R() * TAU)); m4.compose(new V3(fungiP.x + Math.cos(a) * r, .012 + R() * .01, fungiP.z + Math.sin(a) * r), q, new V3(1, 1, 1)); im.setMatrixAt(i, m4); }
  W.add(im); }
const fgM = pointMat(0xf1e2c0, MOBILE ? .05 : .04, .0), fgPts = []; for (let i = 0; i < 60; i++) { const a = R() * TAU, r = Math.pow(R(), .5) * .36; fgPts.push(new V3(fungiP.x + Math.cos(a) * r, .03 + R() * .02, fungiP.z + Math.sin(a) * r)); }
W.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(fgPts), fgM));
// 同じ一枚の葉が、受けとるものごとに別の出来事になる（文学の思想から）
const LEAF = { tit: "シジュウカラには、落ちる葉は動く影。目が向く。", hum: "人には、葉は十一月の色。黄から赤茶へ移る、季節のことば。", fungi: "菌と細菌には、葉は食べもの。落ちる前から、葉の表にすんでいた。" };
const leafSaid = new Set(); let saidSens = false;
// ノードの印：足もとの輪・立ちのぼる線・名札
function label(t, col) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d"); x.font = '500 46px ui-monospace,"SF Mono",Menlo,monospace'; x.fillStyle = "#" + new THREE.Color(col).getHexString(); x.textBaseline = "middle"; x.shadowColor = "rgba(2,4,10,.95)"; x.shadowBlur = 10;   /* 地の上でも読める縁取り */
  if (MOBILE) { x.font = '600 44px "Hiragino Mincho ProN",serif'; x.textAlign = "center"; x.fillText(t, 256, 52); }   /* スマホ：名は札の中央に（札の中心＝持ち主の輪） */ else { x.fillText("U", 6, 44); x.font = '600 30px "Hiragino Mincho ProN",serif'; x.fillText(t, 40, 60); }   // スマホは名だけ
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); s.renderOrder = 5; s.center.set(0, 0); s.scale.set(1.5, .28, 1);   /* PC の名札を控えめに */ if (MOBILE) { s.center.set(.5, 0); s.scale.set(3.0, .56, 1); }   /* スマホの札を読める大きさに */ return s;
}
for (const n of N) {
  const g = new THREE.Group(); W.add(g); n.g = g;
  n.ring = PR.subjectRing(n.col, .42); g.add(n.ring);
  n.ring2 = PR.subjectRing(n.col, .42); n.ring2.userData.mat.opacity = 0; g.add(n.ring2);
  n.stemM = lineMat(n.col, .5); g.add(n.stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(0, .02, 0), new V3(0, n.h, 0)]), n.stemM));
  n.lab = label(n.sub, n.col); n.lab.position.set(.06, n.h + .04, 0); g.add(n.lab);
  n.glow = 0; n.cool = 0; n.inK = 0; n.queue = [];
  W.addTouch({ getWorldPosition: v => v.copy(n.at()).add(new V3(0, Math.min(n.h, 1.2) * .5, 0)) }, () => tapNode(n), .7);
}
const nodeOf = id => N.find(n => n.id === id);
// Same interaction as the 3D rings, reachable by keyboard through the existing fold.
{
 const fold=W.ui.querySelector('.aw-fold'), body=fold?.querySelector('div');
 if(body){const group=document.createElement('fieldset');group.className='q-route';group.style.border='0';group.innerHTML='<legend>輪を選んで、変化を起こす</legend>';
 for(const n of N){const b=document.createElement('button');b.type='button';b.textContent=n.sub+'の輪に触れる';b.addEventListener('click',e=>{e.stopPropagation();tapNode(n);fold.open=false;fold.querySelector('summary').focus({preventScroll:true});});group.appendChild(b);}body.prepend(group);}
}

// 立ちのぼる粒（P：環境から手がかりが入る）
const NP = 120, pg = new THREE.BufferGeometry(), pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 3), pl = [];
pg.setAttribute("position", new THREE.BufferAttribute(pp, 3)); pg.setAttribute("color", new THREE.BufferAttribute(pc, 3));
const pmt = pointMat(0xffffff, MOBILE ? .07 : .06, .9); pmt.vertexColors = true; W.add(new THREE.Points(pg, pmt));
// 人の文脈に重なる層 L（ほかの全員の色の薄い輪が、人の身体を包む）
const Lg = new THREE.Group(); W.add(Lg); const Lrings = [];
[C.tit, C.bee, C.tree, C.sens].forEach((c, i) => { const r = PR.subjectRing(c, .34 + i * .045); r.position.y = .55 + i * .32; r.userData.mat.opacity = 0; Lg.add(r); Lrings.push(r); });
let Lon = 0, Lt = 0;

// ───────── ふるまい → 波 → 入力 → 意味づけ → ふるまい
let beatI = -1, saidL2 = false, hop = 0, beeKick = 0, steps = 0, falling = null, firstCascade = false, sawGust = false, lastAct = -9, actCount = 0;
function act(n, gain, from) {
  if (n.cool > 0) return; n.cool = 1.4; n.glow = 1; actCount++;
  const p = n.at(); ripple(p.x, p.z, clamp(gain, .15, 1.2), n.col); hi("a"); hi("U");
  const pan = clamp(p.clone().project(camera).x, -1, 1) * .8;
  n.voice({ gain: .34 * gain, pan, wet: .5 }); snd.bell(n.f, { gain: .16 * gain, pan, decay: .7 });
  if (n.id === "hum" && Lon) [nodeOf("tit"), nodeOf("bee"), nodeOf("tree")].forEach((o, i) => snd.bell(o.f, { gain: .07 * gain, pan, at: .03 * (i + 1), decay: .6 }));   // 層 L：人の応えに、ほかの受けとり方の色が混じる
  n.act(); lastAct = ripU.uT.value;
  if (n.id === "tree" && !saidSens) { saidSens = true; setTimeout(() => W.say("記録計の数には、落ちた葉は書かれない。書かれるのは、朝の冷えだけ。"), 5200); }
  if (n.id === "hum" && Lon && W.abs < .4) { if (!answered) { answered = true; setTimeout(() => W.say("鳥が振り向く。蜂は、人の影をよけて花を移る。記録計には、朝の冷えだけが記録される。"), 2600); } const p2 = n.at(); ripple(p2.x, p2.z, 3.2, 0xffffff); [0, 4, 7, 9, 12].forEach((k, i) => snd.bell(snd.note(k), { gain: .06, at: i * .08, decay: 2, wet: .85 }));   /* 抽象で鳴った和音が、参道で一度だけ返ってくる */ }   // 参道でも、同じ山場が短く起きる（人の一歩から白い波が地を渡る）
  if (n.id === "hum" && Lon && !saidL2) { saidL2 = true; W.say("同じ足音でも、もう前と同じ響きではない。"); }
  // 波が届く時刻に、ほかの主体の入力へ
  for (const o of N) { const ch = o !== n && n.out.find(k => o.in.includes(k)); if (!ch) continue; const d = o.at().distanceTo(p), g = gain * Math.exp(-d / 9) * .9; o.queue.push({ t: ripU.uT.value + d / SPEED, g, from: n, ch }); }   // 受けとれる経路があるものだけが入力にする
}
const CHS = new Set();
function receive(n, g, from, ch) {
  if (ch === "落葉" && LEAF[n.id] && !leafSaid.has(n.id)) { leafSaid.add(n.id); W.say(LEAF[n.id]); if (leafSaid.size === 3) W.say("同じ一枚の葉が、受けとるものの数だけ別の出来事になる。どれも欠けた見え方で、どれも本当の葉だ。"); }
  if (ch === "養分") W.say("葉は分けられ、養分になって、欅の根の入力へ戻る。");
  const key = (from ? from.id : 'F') + '>' + n.id; if (!CHS.has(key) && CHS.size < 2) { CHS.add(key); W.say((from ? (from.sub === '人' ? '人' : from.sub) + 'の' : '') + ch + 'が、' + (n.sub === '人' ? '人' : n.sub) + 'の入力になる。'); }
  n.inK = 1; hi("P"); hi("E"); spawnP(n, g);
  if (n.id === "hum" && from) { n.seen.add(from.id); if (!Lon && n.seen.size >= 4) turnL(); }
  const thr = n.id === "hum" && Lon ? .05 : .11;   // 層 L で注意が変わり、拾う手がかりが少し変わる（模式）
  const out = g * .62;   // F：渡るたびに弱まる
  if (out < thr) return;
  setTimeout(() => { hi("g"); hi("K"); act(n, out, from); }, n.lag * 1000);
}
function spawnP(n, g) { const p = n.at(); for (let i = 0; i < 8; i++) pl.push({ x: p.x + (R() - .5) * .7, z: p.z + (R() - .5) * .7, y: .05, tx: p.x, tz: p.z, ty: Math.min(n.h, 1.4), u: -i * .06, col: new THREE.Color(n.col), g }); }
function turnL() {
  Lon = 1; N.forEach(n => { n.glow = 1; }); { const c = new V3(); N.forEach(n => c.add(n.at())); c.multiplyScalar(1 / N.length); ripple(c.x, c.z, 2.4, 0xffffff); aoiRef?.motion?.lookAt?.(c.clone().setY(1)); aoiRef?.motion?.express?.("warm", .8, 3);   /* 山場で碧が場の中心へ顔を向ける */ [0, 4, 7, 9, 12].forEach((k, i) => snd.bell(snd.note(k), { gain: .1, at: i * .08, decay: 2.4, wet: .85 })); }   /* 11-06：全員の受けとり方が人に届いた一瞬、すべての輪が同時に灯り、場の中心から一つの大きな波が広がる */ fx.classList.add("L"); hi("L");
  W.sayNow("身体は同じまま、人は鳥の声と、羽音と、落ち葉と、朝の冷えの数を受けとった。"); W.say("ほかのものの受けとり方を思い描くことが、薄い層になって、人の記憶と文脈に重なる。"); W.say("同じ参道で、耳と目が少しだけ違う所へ向く。"); W.say("いまの足音は、だれの入力になっただろう。");
}
let humAgain = false, answered = false, aoiRef = null; W.aoi.then(a => aoiRef = a);
function tapNode(n) {
  if (n.id === "hum" && Lon) humAgain = true;
  snd.start(); W.sayNow(W.abs > .5 ? n.a : n.c); n.cool = 0; act(n, 1, null);
  if (!firstCascade) { firstCascade = true; setTimeout(() => { W.say("それぞれが拾える手がかりだけを拾い、自分のしかたで応える。波は渡るたびに細り、やがて静まる。"); W.say("中心に指示する者はいない。環境を介して、互いの入力になっている。"); W.say("地を押すと、日差しや風が場を変える。欅と記録計は、それにだけ応える。"); }, 3800); }
}
const groundHit = new THREE.Raycaster(), gPlane = new THREE.Plane(new V3(0, 1, 0), 0), nd = new THREE.Vector2();
W.onTapEmpty(e => {
  snd.start(); nd.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); groundHit.setFromCamera(nd, camera); const q = new V3();
  if (!groundHit.ray.intersectPlane(gPlane, q) || q.length() > 14) return; gust(q);
});
function gust(q) {
  ripple(q.x, q.z, .6, 0xdde6ee); hi("F"); hi("E"); snd.breath(1.6, { f0: 600, f1: 1100, gain: .14, pan: clamp(nd.x, -1, 1) * .6 });
  for (const o of N) { const ch = ['気温', '光', '風'].find(k => o.in.includes(k)); if (!ch) continue; const d = o.at().distanceTo(q); o.queue.push({ t: ripU.uT.value + d / SPEED, g: .8 * Math.exp(-d / 12), from: null, ch }); }
  if (!sawGust) { sawGust = true; W.sayNow("風や日の傾き、気温の移ろいが、欅と記録計とミツバチの入力になる。"); }
}
function dropLeaf() { const l = PR.keyakiLeaf(.07); scene.add(l); falling = { l, t: 0, x: tree.x + .4, z: tree.z + .3 };   /* 葉は幹の真上の樹冠の下から */ }

// はじめと、降りるとき
setTimeout(() => { if (!firstCascade) { act(nodeOf("tree"), .8, null); } }, 2600);   // はじめに一度、ミツバチがふるまい、波が渡るのを見せる（音は触れるまで鳴らない）
setTimeout(() => { W.say("朝の氷川参道。欅が、黄の葉を一枚はなす。"); setTimeout(() => { W.say("輪に触れると、そこから変化が広がる。上へなぞると、関係が式と流れになる。"); }, 7000); }, 900);
let saidDown = false, saidGround = false, wentUp = false;
W.onAbs(a => {
  fx.style.opacity = ss(.35, .7, a).toFixed(3);
  if (a > .6) wentUp = true; if (!wentUp) return;
  if (!saidDown && a < .55) { saidDown = true; W.say("式の外へ降りる。同じ流れが、この朝の参道にある。"); }
  if (!saidGround && a < .08) { saidGround = true; W.say("だれも全体を見ていない。けれど、全体はたしかに回っている。"); setTimeout(() => { if (W.abs < .2) act(nodeOf("tree"), .8, null); }, 9500); }   /* 結び：言葉のあと少し間をおいて、欅がひとりでに葉を落とす（出来事で循環を見せる） */
});

// ───────── 毎こま
const tmpC = new THREE.Color();
W.onFrame((dt, t, a) => {
  ripU.uT.value = t;
  { const bi = Math.floor(t / .6); if (bi !== beatI) { beatI = bi; const fade = 1 - ss(.6, 1.3, t - lastAct); if (fade > .01 && snd.on) snd.wood(snd.note(-5 + (bi % 2)), { gain: .04 * fade, decay: .35, wet: .3 }); } }   // 静まったら 2 拍で消える   // 連なりの間、足音の拍（0.6 秒）を下で弱く
  const labA = ss(.25, .7, a);
  if (t > 2.4 && !actCount) nodeOf("tree").glow = Math.max(nodeOf("tree").glow, .28 + .28 * Math.sin((t - 2.4) * 2.2));   // はじめの誘い：まだ何も触れていないあいだ、ひとつの輪がゆっくり息をする
  for (const n of N) {
    const p = n.at(); n.g.position.set(p.x, 0, p.z);
    for (let i = n.queue.length - 1; i >= 0; i--) if (n.queue[i].t <= t) { const q = n.queue.splice(i, 1)[0]; receive(n, q.g, q.from, q.ch); }
    n.cool = Math.max(0, n.cool - dt); n.glow *= Math.exp(-dt * 2.2); n.inK *= Math.exp(-dt * 3);
    n.ring.userData.mat.opacity = Math.max(.75 * labA, .3 + .1 * Math.sin(t * 1.6 + N.indexOf(n))) + n.glow * .5 * ss(.05, .3, a) + (n.id === "hum" && Lon && !humAgain ? .35 * (.5 + .5 * Math.sin(t * 2.4)) : 0);   /* 山場のあと、人の輪だけが息をする（もう一度触れる誘い） */   // 具体の参道でも、足もとの輪が薄く息をする（触れる所が分かる）
    n.ring.scale.setScalar(1 + n.glow * .25);
    n.ring2.userData.mat.opacity = n.inK * .7 * ss(.08, .4, a); n.ring2.scale.setScalar(1 + (1 - n.inK) * 1.2);
    n.stemM.opacity = labA * (.35 + n.glow * .5); const low = PORT || a < .3; n.lab.position.y = low ? .06 : n.h + .04; n.lab.position.x = low ? (PORT ? 0 : .5) : .06; n.lab.position.z = low ? .62 : 0; if (PORT) n.lab.position.x = clamp(-n.at().x * .5, -.7, .7); if (low && n.id === "tit") { if (PORT) { const w = n.g.position.clone().add(new V3(a > .3 ? .35 : 1.05, .06, a > .3 ? .55 : .75)); n.lab.position.copy(n.g.worldToLocal(w)); } else { n.lab.position.x = -.55; n.lab.position.z = 1.15; } }   /* 目の高さの抽象では、シジュウカラの名を輪の奥へ（字幕にかからない） */   if (low && PORT && n.id === "sens") { n.lab.position.z = -.55; n.lab.position.y = .5; } if (low && PORT && n.id === "bee") { n.lab.position.z = .2; n.lab.position.x = .42; }   // 縦長：記録計の名は柱の上、ミツバチの名は株の手前（重ならない）
    // シジュウカラの名は人の線から離す（PC は左、縦長は画面の内側）   // 地の名札は輪の手前の右（柱・株の上にかからない）。縦長は画面の内側へ寄せる   // 具体の側では名札を足もとへ（宙に浮かない）   // 縦長の俯瞰では名札を足もとへ（上から見て持ち主の輪からずれない）
    n.lab.material.opacity = Math.max(PORT ? .9 : .62, labA) * (.75 + n.glow * .25); if (PORT) n.lab.scale.set(lerp(3.0, 1.7, ss(.3, .8, a)), lerp(.56, .32, ss(.3, .8, a)), 1); else n.lab.scale.set(lerp(1.5, .85, ss(.3, .8, a)), lerp(.28, .16, ss(.3, .8, a)), 1); if (n.id === "hum") n.lab.material.opacity *= 1 - ss(.35, .6, a);   // 主観の近い画角では名札を小さく。見ている自分＝人の名は消す   // 目の高さの抽象では、名札を近さに合わせて小さく   // 具体の側でも名札を薄く残す（触れる所が分かる）
    n.ring.visible = n.ring.userData.mat.opacity > .003; n.ring2.visible = n.ring2.userData.mat.opacity > .003; n.stem.visible = n.stemM.opacity > .003 && !(PORT && a > .6);   /* 縦長の俯瞰では名札が足もとなので、立つ線は描かない */ n.lab.visible = n.lab.material.opacity > .003;   // 見えないものは描かない（スマホの描画の回数）
  }
  // 生き物
  hop = Math.max(0, hop - dt * 1.6); tit.position.y = Math.sin(Math.min(1, 1 - hop) * Math.PI) * (hop > 0 ? .06 : 0); tit.userData.animate?.(t, false);
  beeKick = Math.max(0, beeKick - dt * .8); const hv = RM ? 0 : 1;
  beeGlow.position.copy(bee.position); beeGlowM.opacity = (.6 + .35 * Math.sin(t * 9)) * (1 - ss(.3, .7, a)) + beeKick * .6;
  { const me = ss(.35, .6, a); person.visible = me < .98; person.userData.mat && (person.userData.mat.opacity = .85 * (1 - me)); person.userData.mat && (person.userData.mat.transparent = true); }   // 抽象では、見ている自分＝人の目から受けとる（自分の体の線は消える）
  bee.position.copy(beeHome).add(new V3(Math.sin(t * .9) * (.05 + beeKick * .25) * hv, .045 + Math.sin(t * 1.7) * .015 * hv + beeKick * .12, Math.cos(t * .7) * (.04 + beeKick * .2) * hv)); bee.rotation.y = Math.sin(t * .5) * .8; bee.userData.state = "fly"; bee.userData.animate?.(t, "hover");
  if (steps > 0) { steps = Math.max(0, steps - dt); person.userData.walk((1.2 - steps) / .6, 1); } else person.userData.walk(0, 0);
  person.userData.mat.opacity = lerp(.75, .6, ss(.08, .5, a));   // 具体では墨の線、抽象では光の線
  person.userData.mat.color.copy(tmpC.set(0xd9c3a5).lerp(new THREE.Color(0xe9d2c2), ss(.15, .6, a)));   // 具体では墨の線の人、抽象では光の線
  // 落ちる葉
  if (falling) { const f = falling; f.t += dt; const u = Math.min(1, f.t / 5); f.l.position.set(f.x + Math.sin(f.t * 3) * .25 * (1 - u), lerp(4.5, .02, Math.pow(u, 1.1)), f.z + Math.cos(f.t * 1.7) * .15); f.l.rotation.set(-1.3 + Math.cos(f.t * 3) * .9 * (1 - u), f.t, 0); if (u >= 1) { f.l.rotation.set(-Math.PI / 2, f.t, 0); falling = null; } }
  fungiK = Math.max(0, fungiK - dt * .4); fgM.opacity = .25 + fungiK * .6 + (1 - ss(.05, .4, a)) * .1;
  // 層 L
  Lt += (Lon - Lt) * (1 - Math.exp(-dt * .8)); const hp = person.position; Lg.position.set(hp.x, 0, hp.z);
  Lrings.forEach((r, i) => { r.userData.mat.opacity = Lt * ss(.08, .4, a) * (.45 + .25 * Math.sin(t * .8 + i)); r.rotation.y = t * .1 * (i % 2 ? 1 : -1); r.visible = r.userData.mat.opacity > .003; });
  // 粒
  let k = 0;
  for (let i = pl.length - 1; i >= 0; i--) { const q = pl[i]; q.u += dt * 1.3; if (q.u > 1) { pl.splice(i, 1); continue; } }
  for (const q of pl) { if (k >= NP) break; const u = Math.max(0, q.u), e = u * u * (3 - 2 * u); pp.set([lerp(q.x, q.tx, e), lerp(q.y, q.ty, e), lerp(q.z, q.tz, e)], k * 3); tmpC.copy(q.col).multiplyScalar((u > 0 ? 1 : 0) * (.5 + q.g)); pc.set([tmpC.r, tmpC.g, tmpC.b], k * 3); k++; }
  for (let i = k; i < NP; i++) pp.set([0, -50, 0], i * 3);
  pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
});
AMK.done = Math.round(performance.now() - T0);
window.__app = { W, N, tapNode, act, gust: (x, z) => gust(new V3(x, 0, z)), get Lon() { return Lon; } };
