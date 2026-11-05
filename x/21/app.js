// © mitsulab. 文学の思想（x/21）── 文学の思想：欅の一枚の葉から、受けとり方の層が重なり、また葉へ戻ってくる
// 具体（宙を舞う一枚・地に落ちた一枚）→ 上へなぞると、同じ葉を受けとる四つの層が積み重なる（抽象）→ 降りると、時の過ぎた同じ場所へ戻る。
// 言葉は碧の字幕の一行ずつ。典拠と音の根拠＝../資料/出典と音の根拠.md
const P = window.AW_PATHS; const T0 = performance.now(); const AMK = window.__appMK = {};
const [{ createAwai, injectCSS, lineMat, pointMat, awaiPatch, AW, MOBILE, RM, TAU, clamp, lerp, ss }, PR, S, CR] = await Promise.all([
  import(P.kit + "awai.js"), import(P.kit + "awai_props.js"), import(P.kit + "awai_sound.js"), import(P.kit + "creatures_sight.js")]);
import * as THREE from "three";
AMK.mods = Math.round(performance.now() - T0); injectCSS();
const V3 = THREE.Vector3;

// ───────── 物語の状態
const ST = { phase: 0, t: 0, top: false, later: 0 };   // 0 宙・1 落ちる・2 地・3 時が過ぎた
const AIR = new V3(.35, 2.45, 2.2), LAND = new V3(.55, .022, 2.95);   // 幹の位置が決まってから置きなおす
const leafP = new V3(), path = [];
const camRig = (a, y, t) => {
  const k = ss(0, 1, a);
  if (ST.phase <= 1) {   // 葉を追う（宙では近く、落ちるにつれて目の高さより低く）
    const f = ST.phase === 0 ? 0 : clamp(ST.t / 6, 0, 1);
    const pr = innerWidth < innerHeight * .8, d = lerp(pr ? .62 : .78, 1.1, f), off = new V3(Math.sin(y - .55) * d, lerp(-.12, .5, f), Math.cos(y - .55) * d);
    const pos = leafP.clone().add(off); pos.y = Math.max(pos.y, .3);
    return { pos, look: leafP.clone().add(new V3(lerp(pr ? .1 : -.02, 0, f), lerp(.16, -.05, f), lerp(-.12, 0, f))) };   // 宙：主役の葉と枝先の房を一つの画に   // 宙では葉を右三分の一に置き、奥へ参道が抜ける
  }
  const c = LAND.clone(), back = lerp(.72, 4.6, k), h = lerp(.3, 3.4, k);
  return { pos: new V3(c.x + Math.sin(y) * back, h, c.z + Math.cos(y) * back), look: c.clone().add(new V3(0, lerp(.1, 1.05, k), lerp(-.25, -.2, k))) };
};

const W = await createAwai({
  title: "文学の思想", en: "Thought in Literature", tex: P.tex, aoi: P.aoi, keyaki: P.keyaki, sprig: P.sprig, aoiAt: [-1.1, -3.8, .35], seed: 2121, rig: camRig, portrait: 1.3,
  credits: [
    "欅の葉の形（卵形で先がとがる・縁に曲がった鋸歯・羽状の脈）と十一月の黄葉は、図鑑の形態にそって mitsulab が描いた画",
    "鳥の目は動きをよくとらえる。葉の表には落ちる前から菌や細菌がすむ。歩行 毎分約 100 歩：Tudor-Locke ほか（IJBNPA 16, 2019）",
    "気温計の層：10 分ごとの記録を 2.4 秒に縮めた模式（気象庁のアメダスは 10 分ごとに観測する）。数値は描かない",
    "菌の営みの音は、聴こえる高さに移した模式。鳥の声は、シジュウカラの声域（3〜6 kHz）に合わせた模式",
    "質感：Poly Haven・ambientCG（CC0）。生き物の形：mitsulab の造形。碧の 3D・声・文：mitsulab",
  ],
});
const { scene, R, camera } = W; AMK.stage = Math.round(performance.now() - T0);
const snd = S.createSound(W.sndBtn);
W.onFirstInput(() => snd.start());
W.aoi.then(a => a && (innerWidth < innerHeight * .8 ? a.place(LAND.x - 1.6, LAND.z - 2.6, .5) : a.place(LAND.x - 1.5, LAND.z - 3.4, .45)));   // 碧は葉の左奥（三分の一の位置）
W.setAbs(0, true);

// ───────── 一枚の葉
const leaf = PR.keyakiLeaf(.09); W.add(leaf);
// 低い枝：参道の右の欅の幹から張り出し、垂れた枝の先に色づいた葉が房になる。その一枚
const tw0 = W.near.map(t => { const p = t.wood[0].attributes.position; return new V3(p.getX(0), 0, p.getZ(0)); }).filter(v => v.x > 0).sort((a, b) => Math.abs(a.z - 1) - Math.abs(b.z - 1))[0] || new V3(5.6, 0, 1);
AIR.set(W.pathX(3) + .8, 2.7, 3); LAND.set(W.pathX(AIR.z + .7) + .7, .022, AIR.z + .7); leafP.copy(AIR);   // 右の欅の張り出した枝の先。葉は風に流されて参道の上に落ちる
const twig = new THREE.Group(); W.add(twig);
{ const VG = await import(P.kit + "vegetation.js");
  const pts = [tw0.clone().setY(AIR.y + .75).lerp(AIR.clone().add(new V3(2.8, .75, -1.3)), .15),   // 根もとは右の欅の幹の中から（枝が宙に浮かない）
     AIR.clone().add(new V3(1.7, .42, -.8)), AIR.clone().add(new V3(.85, .18, -.38)), AIR.clone().add(new V3(.32, .05, -.12)), AIR.clone().add(new V3(.06, .04, -.01))];   // 幹から横へ伸び、先がわずかに下がるだけ
  const bm = awaiPatch(new THREE.MeshStandardMaterial({ map: W.tex("bark_zelkova", 1), color: 0xb4a694, roughness: .95 }));
  twig.add(new THREE.Mesh(VG.taperTube(pts, .03, .004, 9, 26), bm));
  const cur = new THREE.CatmullRomCurve3(pts);
  // 枝先の小枝と葉の房（十数枚。黄・橙・まだ緑の残るもの）
  for (let j = 0; j < 6; j++) { const u = .7 + j * .045, b0 = cur.getPointAt(u), dir = new V3(.25 + R() * .3, -.04 - R() * .08, -.35 - R() * .3), q = [b0, b0.clone().addScaledVector(dir, .18), b0.clone().addScaledVector(dir, .36).add(new V3(0, -.04, 0))];
    twig.add(new THREE.Mesh(VG.taperTube(q, .0045, .0015, 5, 6), bm)); const c2 = new THREE.CatmullRomCurve3(q);
    for (let i = 0; i < 5; i++) { const sd = i % 2 ? 1 : -1, p = c2.getPointAt(.25 + i * .17).add(new V3(0, sd * .018, sd * .03)), l = PR.keyakiLeaf(.06 + R() * .025); const m = l.material.clone(); m.onBeforeCompile = l.material.onBeforeCompile; m.customProgramCacheKey = l.material.customProgramCacheKey; m.color.setRGB(.8 + R() * .25, .78 + R() * .3, .45 + R() * .4); l.material = m;   // 小枝に互い違いに
      l.position.copy(p); l.rotation.set(-.6 + sd * .5 + (R() - .5) * .3, -.8 + (R() - .5) * .5, sd * .9 + (R() - .5) * .3); twig.add(l); } } }
const petiole = new THREE.Line(new THREE.BufferGeometry().setFromPoints([AIR.clone().add(new V3(0, .05, 0)), AIR.clone().add(new V3(0, .0, 0))]), new THREE.LineBasicMaterial({ color: 0x6b4520, transparent: true, opacity: 0 })); twig.add(petiole);
// 地の上の落ち葉の重なり（欅の葉の画を、着地点のまわりに）
{ const lt = PR.keyakiLeaf(.07), n = MOBILE ? 60 : 120, im = new THREE.InstancedMesh(lt.geometry, lt.material, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const a = R() * TAU, r = .25 + Math.pow(R(), .7) * 2.2; q.setFromEuler(new THREE.Euler(-Math.PI / 2 + (R() - .5) * .3, 0, R() * TAU)); const sc = .8 + R() * .5;
    m4.compose(new V3(LAND.x + Math.cos(a) * r, .012 + R() * .012, LAND.z + Math.sin(a) * r), q, new V3(sc, sc, sc)); im.setMatrixAt(i, m4); const k = R(); im.setColorAt(i, c.setRGB(lerp(.95, .5, k), lerp(.85, .4, k), lerp(.6, .3, k))); }
  W.add(im); }
// 地に落ちた葉を示す細い輪（事実の線：葉のある所）
const mark = PR.subjectRing(0x9bdcf0, .09); mark.userData.mat.opacity = 0; W.add(mark);
const heroRing = PR.subjectRing(0xf2cf8c, .045); heroRing.geometry.rotateX(Math.PI / 2); W.add(heroRing);   // 主役の葉を示す細い輪（触れるまで）
// 上へなぞる誘い：落ちた葉から立ちのぼる細い一本の線（画で誘う）
const upM = lineMat(0x9bdcf0, 0), upL = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(0, .03, 0), new V3(0, .9, 0)]), upM); W.add(upL);
const tapLeafHit = W.addTouch({ getWorldPosition: v => v.copy(leafP) }, () => tapLeaf(), .35);

// シジュウカラ（地の層のあとで来る）
const tit = CR.makeTit(); PR.awaiCreature(tit, .55); tit.scale.setScalar(.18); tit.position.set(-.35, .02, 2.55); tit.rotation.y = -.3; tit.userData.state = "perch"; tit.visible = false; PR.bakeRigid(tit); W.add(tit);

// ───────── 四つの層（下から：菌と細菌・シジュウカラ・人・気温計）。同じ葉を受けとる、それぞれの出来事
const L = [];
const LEAFO = []; for (let k = 0; k < 60; k++) { const u = k / 60, side = u < .5 ? 1 : -1, s0 = u < .5 ? u * 2 : (1 - u) * 2; LEAFO.push(new V3(side * Math.sin(Math.pow(s0, .78) * Math.PI) * (1 - .55 * ss(.62, 1, s0)) * .36 * .9, 0, (.5 - s0) * .9)); } LEAFO.push(LEAFO[0].clone());
const sheet = (i, col, label, sub) => {
  const g = new THREE.Group(), y = .32 + i * .36; g.position.set(LAND.x, y, LAND.z);
  const w = 1.5, h = 1.0, pts = LEAFO.map(p => p.clone().multiplyScalar(1.55 + i * .12));   // 層の縁＝この葉の形を大きく写したもの
  const frame = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(col, 0)); g.add(frame);
  const corner = []; for (const k of [0, 15, 30, 45]) { const a = pts[k * pts.length / 60 | 0]; corner.push(new V3(a.x, 0, a.z), new V3(a.x, .06, a.z)); }
  const cm = lineMat(col, 0); g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(corner), cm));
  const pl = new THREE.Mesh((() => { const sh = new THREE.Shape(); pts.forEach((p, k) => k ? sh.lineTo(p.x, -p.z) : sh.moveTo(p.x, -p.z)); return new THREE.ShapeGeometry(sh, 4).rotateX(-Math.PI / 2); })(), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); g.add(pl);
  const lab = textSprite(label, MOBILE ? "" : sub, col); lab.position.set(.62 + i * .05, .02, .1); if (MOBILE) { lab.scale.multiplyScalar(1.15); lab.position.set(.5, .02, .3 - i * .22); } g.add(lab);   // スマホは名だけを小さく、層の右に上下へずらして
  const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(0, -y + .03, 0), new V3(0, 0, 0)]), lineMat(col, 0)); g.add(stem);   // 葉から層へ：この葉が入力になる
  const o = { g, i, col, frame, cm, pl, lab, stem, k: 0, mats: [frame.material, cm, stem.material], inner: new THREE.Group() }; g.add(o.inner); W.add(g); L.push(o); return o;
};
function textSprite(t, sub, col, right = false) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d"); if (right) { x.textAlign = "right"; x.translate(504, 0); }
  x.font = '600 38px "Shippori Mincho","Hiragino Mincho ProN",serif'; x.fillStyle = "#" + new THREE.Color(col).getHexString(); x.textBaseline = "middle"; x.fillText(t, right ? 0 : 4, 32);
  x.font = '500 30px "Hiragino Sans",sans-serif'; x.fillStyle = "rgba(225,232,242,.92)"; x.fillText(sub, 4, 74);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); s.center.set(0, 0); s.scale.set(.86, .16, 1); return s;
}
const C = { fungi: 0xe8e0c6, tit: 0xb9a7e6, hum: 0xf4aa96, sens: 0xa9c8d8 };
const L0 = sheet(0, C.fungi, "菌と細菌", "葉の表面"), L1 = sheet(1, C.tit, "シジュウカラ", "落ちる動き"), L2 = sheet(2, C.hum, "歩く人", "色づき・季節"), L3 = sheet(3, C.sens, "気温計", "10 分ごとの記録");
// 菌と細菌：葉の表に点がふえる（落ちる前から、分解は始まっている）
const fN = 600, fg = new THREE.BufferGeometry(), fpos = new Float32Array(fN * 3);
for (let i = 0; i < fN; i++) { const u = R(), v = R() * 2 - 1, s = Math.sin(Math.pow(u, .78) * Math.PI) * (1 - .55 * ss(.62, 1, u)) * .36; fpos.set([v * s * .9, 0, (.5 - u) * .9], i * 3); }
fg.setAttribute("position", new THREE.BufferAttribute(fpos, 3)); fg.setDrawRange(0, 0);
const fm = pointMat(C.fungi, .018, .9); L0.inner.add(new THREE.Points(fg, fm)); L0.mats.push(fm);
{ const out = []; for (let k = 0; k <= 60; k++) { const u = k / 60, side = u < .5 ? 1 : -1, s0 = u < .5 ? u * 2 : (1 - u) * 2; out.push(new V3(side * Math.sin(Math.pow(s0, .78) * Math.PI) * (1 - .55 * ss(.62, 1, s0)) * .36 * .9, 0, (.5 - s0) * .9)); }
  const m = lineMat(C.fungi, 0); L0.inner.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(out), m)); L0.mats.push(m); L0.outline = out; }
// シジュウカラ：落ちる道すじ（実際にこの葉が描いた道を、上から押しつぶして写す）
const trailG = new THREE.BufferGeometry(), trailM = lineMat(C.tit, 0); L1.inner.add(new THREE.Line(trailG, trailM)); L1.mats.push(trailM);
const tickG = new THREE.BufferGeometry(), tickM = lineMat(C.tit, 0); L1.inner.add(new THREE.LineSegments(tickG, tickM)); L1.mats.push(tickM);
// 歩く人：色づきの移ろい（黄 → 赤茶）を、葉の形の中の色の点で（面には塗らない）
{ const n = 420, P3 = [], CS = [], a = new THREE.Color(0xe0a838), b = new THREE.Color(0xa24c28), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const u = R(), v = R() * 2 - 1, w0 = Math.sin(Math.pow(u, .78) * Math.PI) * (1 - .55 * ss(.62, 1, u)) * .36 * 1.25; const z = (.5 - u) * 1.25; P3.push(v * w0, 0, z); c.copy(a).lerp(b, clamp(u * 1.1 + (R() - .5) * .2, 0, 1)); CS.push(c.r, c.g, c.b); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P3, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(CS, 3));
  const m = pointMat(0xffffff, .03, 0); m.vertexColors = true; m.userData.max = .85; L2.inner.add(new THREE.Points(g, m)); L2.mats.push(m); }
// 気温計：一日の 144 の記録（10 分ごと）を円に。夜の目盛りは長い。葉のある所は空いたまま＝落葉は記録されない
{ const seg = []; for (let i = 0; i < 144; i++) { const a = i / 144 * TAU - Math.PI / 2, night = (i < 36 || i > 114), r0 = .36, r1 = r0 + (night ? .1 : .05); seg.push(new V3(Math.cos(a) * r0, 0, Math.sin(a) * r0), new V3(Math.cos(a) * r1, 0, Math.sin(a) * r1)); }
  const m = lineMat(C.sens, 0); L3.inner.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), m)); L3.mats.push(m);
  const ring = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; ring.push(new V3(Math.cos(a) * .16, 0, Math.sin(a) * .16)); } const m2 = lineMat(C.sens, 0); L3.inner.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), m2)); L3.mats.push(m2); }

const LINES = [
  ["分解を担う菌は、落ちる前から葉にいる。この葉は、菌の食べものになる。"],
  ["小鳥の目は、速い動きをよく見分けるとされる。この葉は、まず落ちる動きとして届く。"],
  ["歩く人にとって、この葉は色と季節になる。"],
  ["気温計に、落葉は記録されない。残るのは、前の夜の冷え込みの数だ。"],
];

// ───────── 進み方
function tapLeaf() {
  snd.start();
  if (ST.phase === 0) { ST.phase = 1; ST.t = 0; path.length = 0; petiole.visible = false; leaf.material.emissive?.setRGB(0, 0, 0); W.sayNow("葉が、枝をはなれる。"); snd.wood(snd.note(10), { gain: .14, decay: .5 }); return; }
  if (ST.phase === 3 && ST.later > 2) restart();
}
W.onTapEmpty(() => { snd.start(); if (ST.phase === 0) tapLeaf(); else if (ST.phase === 3 && ST.later > 2) restart(); else if (ST.phase === 2 && W.abs < .1) W.sayNow("上へなぞると、この葉を受けとる層が重なる。"); });
function land() {
  ST.phase = 2; ST.t = 0; leafP.copy(LAND);
  snd.wood(snd.note(-5), { gain: .32, decay: 1.6 }); snd.breath(1.2, { f0: 500, f1: 300, gain: .12 });
  // 道すじを層に写す
  const raw = path.map(p => new V3(p.x - LAND.x, 0, p.z - LAND.z).add(new V3(0, 0, (p.y - LAND.y) * -.3))); let mx = .01; raw.forEach(p => mx = Math.max(mx, Math.abs(p.x) / .5, Math.abs(p.z) / .65)); const pts = raw.map(p => p.multiplyScalar(1 / mx));   // 層の葉の形の中に収める
  trailG.setFromPoints(pts); const tk = []; for (let i = 0; i < pts.length - 1; i += 6) { const d = pts[i + 1].clone().sub(pts[i]).normalize(), n = new V3(-d.z, 0, d.x).multiplyScalar(.035); tk.push(pts[i].clone().add(n), pts[i].clone().sub(n)); } tickG.setFromPoints(tk);
  W.say("参道に、落ちた。"); W.say("上へなぞる。同じ一枚を、ほかのものはどう受けとっているか。");
}
function restart() {
  ST.phase = 0; ST.t = 0; ST.top = false; ST.later = 0; said.fill(false); leafP.copy(AIR); petiole.visible = true; leaf.material.color.setRGB(1, 1, 1);
  fg.setDrawRange(0, 0); tit.visible = false; W.setAbs(0); W.sayNow("もう一枚。");
}
const said = [false, false, false, false];
let stepT = 0, chirpT = 0, tickT = 0, fungiT = 0, airT = 0, lastBeat = -1;   // 声部はすべて 0.6 秒の拍の上。8 拍（4.8 秒）ごとに頭がそろう
W.onFrame((dt, t, a) => {
  ST.t += dt;
  // 葉の動き
  if (ST.phase === 0) {
    const s = RM ? 0 : 1; leafP.copy(AIR); twig.rotation.z = Math.sin(t * .8) * .012 * s;   // 枝ごと風にゆれる（葉柄で枝につく）
    leaf.rotation.set(-1.0 + Math.sin(t * .9) * .3 * s, .3 + Math.sin(t * .5) * .2 * s, Math.sin(t * .6) * .35 * s); leaf.material.emissive?.setRGB(.3 + .12 * Math.sin(t * 2), .17 + .06 * Math.sin(t * 2), .03);   // 主役の葉だけ少し明るく、ゆっくり揺れる
    airT -= dt; if (airT < 0) { airT = 4.2; snd.breath(2.6, { f0: 650, f1: 900, gain: .08, wet: .7 }); }
  } else if (ST.phase === 1) {
    const u = clamp(ST.t / 6, 0, 1), e = u * u * (3 - 2 * u);
    const sway = Math.sin(ST.t * 3.2) * (1 - u * .6) * .28;   // 落ち葉の振り子のゆれ（模式）
    leafP.set(lerp(AIR.x, LAND.x, e) + sway, lerp(AIR.y, LAND.y + .02, Math.pow(u, 1.15)), lerp(AIR.z, LAND.z, e) + Math.cos(ST.t * 1.6) * .12 * (1 - u));
    leaf.rotation.set(-1.2 + Math.cos(ST.t * 3.2) * .9 * (1 - u), ST.t * .8, Math.sin(ST.t * 3.2) * .7 * (1 - u));
    if (path.length < 400) path.push(leafP.clone());
    if (Math.floor(ST.t * 3.2 / Math.PI) !== Math.floor((ST.t - dt) * 3.2 / Math.PI)) snd.wood(snd.note(9 - Math.floor(u * 9)), { gain: .12, decay: .7, pan: clamp(sway * 3, -1, 1) });   // 振れの返しごとに一音、下へ
    if (u >= 1) land();
  } else {
    leafP.copy(LAND); leaf.rotation.set(-Math.PI / 2 + .05, .4, 0);
  }
  leaf.position.copy(leafP);
  upL.position.set(LAND.x, 0, LAND.z); upM.opacity = ST.phase === 2 && ST.t > 2 && a < .1 ? .25 + .25 * Math.sin(t * 2.4) : Math.max(0, upM.opacity - dt);
  heroRing.position.copy(leafP); heroRing.lookAt(camera.position); heroRing.userData.mat.opacity = ST.phase === 0 ? .55 + .2 * Math.sin(t * 1.6) : Math.max(0, heroRing.userData.mat.opacity - dt * 2);
  mark.position.set(LAND.x, .03, LAND.z); mark.userData.mat.opacity += (((ST.phase >= 2) ? .55 * (1 - ss(.3, .9, a)) : 0) - mark.userData.mat.opacity) * (1 - Math.exp(-dt * 2));
  // 層：上へなぞるほど、下から順に現れる
  L.forEach((o, i) => {
    const on = ST.phase >= 2 ? ss(.12 + i * .17, .26 + i * .17, a) : 0;   // 時が過ぎた段でも、上へなぞれば同じ葉の層が重なる
    o.k += (on - o.k) * (1 - Math.exp(-dt * 3));
    for (const m of o.mats) m.opacity = (m.userData.max ?? .7) * o.k; o.pl.material.opacity = .045 * o.k; o.lab.material.opacity = .95 * o.k;
    o.g.visible = o.k > .004;
    o.g.position.y = lerp(.02, .32 + i * .36, ss(0, 1, o.k));   // 葉から立ちのぼる
    if (on > .5 && !said[i]) { said[i] = true; W.sayNow(LINES[i][0]); }   // 一つの層に一行・すぐ出す（字幕が絵より遅れない）
  });
  if (ST.phase === 2) fg.setDrawRange(0, Math.floor(fN * clamp(L0.k * (.25 + ST.t * .04), 0, 1)));
  // 頂き：すべての層が重なる
  if (ST.phase === 2 && a > .93 && said[3] && !ST.top) { ST.top = true; W.sayNow("同じ一枚の葉が、主体の数だけ別の出来事になる。どれも欠けた見え方で、どれも本当の葉だ。"); W.say("下へなぞる。もう一度、葉のところへ。"); }
  // 降りる：時が過ぎた同じ場所
  if (ST.phase === 2 && ST.top && a < .08) { ST.phase = 3; ST.later = 0; tit.visible = true; snd.bell(snd.note(0), { gain: .2 }); snd.bell(snd.note(4), { gain: .14, at: .05 }); snd.bell(snd.note(7), { gain: .1, at: .1 });
    W.sayNow("葉は参道の上で数日をすごし、やがて土の上へ移り、何か月もかけて菌に分けられ、土へ還っていく。"); W.say("だれも全体を見ていない。けれど、全体はたしかに回っている。"); W.say("自分の見ている欅が、欅のすべてではない。"); W.say("葉に触れると、もう一枚。"); }
  if (ST.phase === 3) {
    ST.later += dt; const u = clamp(ST.later / 5, 0, 1);
    leaf.material.color.setRGB(lerp(1, .55, u), lerp(1, .42, u), lerp(1, .32, u));   // 茶へ
    fg.setDrawRange(0, fN);
    tit.userData.animate?.(t, false);
  }
  // 音：見えている層が、それぞれの声部で重なる（重ねる）
  if (snd.on && ST.phase >= 2) {   // 時が過ぎた段でも、重なった層は鳴る

    const k0 = L0.k, k1 = L1.k, k2 = L2.k, k3 = L3.k;
    const bi = Math.floor(t / .6), nb = bi !== lastBeat; if (nb) lastBeat = bi;
    if (nb && k0 > .2 && bi % 8 === 0) { snd.drone(snd.note(-13), 3.8, { gain: .16 * k0, wet: .8 }); }
    if (nb && k1 > .2 && bi % 4 === 0) { const o = { gain: .16 * k1, pan: -.5 }; for (let k = 0; k < 3; k++) { snd.chirp(5200, 4900, .06, { ...o, at: (o.at || 0) + k * .42 }); snd.chirp(3700, 3450, .19, { ...o, at: (o.at || 0) + k * .42 + .1 }); }   /* ツツピー（シジュウカラのさえずりの句。声域 3〜6 kHz の模式） */ }
    if (nb && k2 > .2) { snd.wood(snd.note(-5 + (Math.floor(t / .6) % 2)), { gain: .1 * k2, decay: .4, pan: .3 }); }   // 歩行 毎分約 100 歩
    if (nb && k3 > .2 && bi % 4 === 0) { snd.bell(snd.note(12), { gain: .05 * k3, pan: .6, decay: .35, wet: .7 }); }   // 10 分ごとの記録 → 2.4 秒（模式）
  }
});
setTimeout(() => { W.say("朝の氷川参道。欅の低い枝に、色づいた葉が一枚。"); W.say("葉に触れる。"); }, 800);
AMK.done = Math.round(performance.now() - T0);
window.__app = { W, ST, L, tapLeaf, land };
