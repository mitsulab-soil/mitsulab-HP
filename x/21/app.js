// © mitsulab. 文学の思想（x/21）── 文学の思想：欅の一枚の葉から、受けとり方の層が重なり、また葉へ戻ってくる
// 具体（宙を舞う一枚・地に落ちた一枚）→ 上へなぞると、同じ葉を受けとる四つの層が積み重なる（抽象）→ 降りると、時の過ぎた同じ場所へ戻る。
// 言葉は碧の字幕の一行ずつ。典拠と音の根拠＝../資料/出典と音の根拠.md
// 2026-11-09 一時の 503 などで読めなかった部品は、間をおいて読み直す
const imp = async (u, n = 0) => { try { return await import(n ? u + "?r=" + n : u); } catch (e) { if (n >= 2) throw e; await new Promise(r => setTimeout(r, 400 * (n + 1))); return imp(u, n + 1); } };
const P = window.AW_PATHS; const T0 = performance.now(); const AMK = window.__appMK = {};
const [{ createAwai, injectCSS, lineMat, pointMat, awaiPatch, AW, MOBILE, RM, TAU, clamp, lerp, ss }, PR, S, CR] = await Promise.all([
  imp(P.kit + "awai.js"), imp(P.kit + "awai_props.js"), imp(P.kit + "awai_sound.js"), imp(P.kit + "creatures_sight.js")]);
import * as THREE from "three";
AMK.mods = Math.round(performance.now() - T0); injectCSS();
const V3 = THREE.Vector3;
const { qxEntry } = await import("./qx.js"); const GO = qxEntry({ label: "葉に触れる（葉が落ちはじめる）", css: ".aw-mark{left:calc(54px + env(safe-area-inset-left))!important}", onPress: () => tapLeaf() }); const _pv = new THREE.Vector3();

// ───────── 物語の状態
const ST = { phase: 0, t: 0, top: false, later: 0 };   // 0 宙・1 落ちる・2 地・3 時が過ぎた
const AIR = new V3(.35, 2.45, 2.2), LAND = new V3(.55, .022, 2.95);   // 幹の位置が決まってから置きなおす
const leafP = new V3(), path = [];
const camRig = (a, y, t) => {
  const k = ss(0, 1, a);
  if (ST.phase <= 1) {   // 葉を追う（宙では近く、落ちるにつれて目の高さより低く）
    const f = ST.phase === 0 ? 0 : clamp(ST.t / 6, 0, 1);
    const pr = innerWidth < innerHeight * .8, d = lerp(pr ? .62 : .78, 1.1, f), off = new V3(Math.sin(y - .8) * d, lerp(-.3, .5, f), Math.cos(y - .8) * d);   // 11-06 二版の後：宙では葉の少し下から見上げる（葉の背が幹でなく、明るい樹冠と空になる）   /* 葉の背が参道の奥の明るい霞になる向き */
    const pos = leafP.clone().add(off); pos.y = Math.max(pos.y, .3);
    return { pos, look: leafP.clone().add(new V3(lerp(pr ? .44 : -.02, 0, f), lerp(.16, -.05, f), lerp(-.12, 0, f))) };   // 宙：主役の葉と枝先の房を一つの画に   // 宙では葉を右三分の一に置き、奥へ参道が抜ける
  }
  const c = LAND.clone(), back = lerp(.72, 2.3, k), h = lerp(.3, 1.5, k);   // 11-06 本人「俯瞰でなく主観の体験に」：上へなぞると、しゃがんだ目から立ち上がる人の目の高さへ。層は自分の前に立ちのぼり、見上げて受けとる
  return { pos: new V3(c.x + Math.sin(y) * back, h, c.z + Math.cos(y) * back), look: c.clone().add(new V3(0, lerp(.1, 1.25, k), lerp(-.25, -.2, k))) };
};

const W = await createAwai({
  title: "Qualia/literature", sub: "文学の思想", en: "Thought in Literature", tex: P.tex, aoi: P.aoi, keyaki: P.keyaki, sprig: P.sprig, aoiAt: [-1.1, -3.8, .35], seed: 2121, deferBack: true, rig: camRig, portrait: 1.3,
  credits: [
    "欅の葉の形（卵形で先がとがる・縁に曲がった鋸歯・羽状の脈）と十一月の黄葉は、図鑑の形態にそって mitsulab が描いた画",
    "葉の表には落ちる前から菌や細菌がすむ。歩く拍 毎分約 100 歩（中くらいの速さで歩くときの目安：Tudor-Locke ほか IJBNPA 16, 2019）",
    "気温計の層：10 分ごとの記録を 2.4 秒に縮めた模式（気象庁のアメダスは 10 分ごとに観測する）。数値は描かない",
    "菌の営みを、ゆっくり重なる合成音で表した創作です。実測した菌の音ではありません。鳥の声も合成音です（実際の鳴き声の録音ではありません）",
    "書誌：葉の形＝『日本の野生植物 木本 I』（平凡社, 1989）／葉にすむ菌と細菌＝Vorholt, J. A.（2012）Nature Reviews Microbiology 10: 828–840、Osono, T.（2006）Canadian Journal of Microbiology 52: 701–716／小鳥の目の速さ＝Boström, J. E. ほか（2016）PLoS ONE 11(3): e0151099（アオガラなどで測った値をシジュウカラに当てはめた模式）／気温の記録＝気象庁「アメダス」（10 分ごとの観測）",
    "質感：Poly Haven・ambientCG（CC0）。生き物の形：mitsulab の造形。碧の 3D・声・文：mitsulab",
  ],
});
const { scene, R, camera } = W; AMK.stage = Math.round(performance.now() - T0); try { sessionStorage.removeItem("qx-retry:" + location.pathname); } catch (_) { } window.MLLoader?.done?.(); setTimeout(() => document.getElementById("qx-intro")?.classList.add("out"), 2600);
const snd = S.createSound(W.sndBtn);
W.onFirstInput(() => snd.start());
let aoiL = null, aoiAside = false; W.aoi.then(a => aoiL = a);
W.aoi.then(a => a && (innerWidth < innerHeight * .8 ? a.place(LAND.x - 1.25, LAND.z - 6.2, .3) : a.place(LAND.x + 3.4, LAND.z - 5.6, -.5)   /* 主観の視点：層の縁より外、目の高さで横に立つ */));   // 碧は葉の左奥（三分の一の位置）
W.setAbs(0, true);

// ───────── 一枚の葉
const leaf = PR.keyakiLeaf(.09); W.add(leaf);
// 低い枝：参道の右の欅の幹から張り出し、垂れた枝の先に色づいた葉が房になる。その一枚
const tw0 = W.near.map(t => { const p = t.wood[0].attributes.position; return new V3(p.getX(0), 0, p.getZ(0)); }).filter(v => v.x > 0).sort((a, b) => Math.abs(a.z - 1) - Math.abs(b.z - 1))[0] || new V3(5.6, 0, 1);
AIR.set(W.pathX(3) + .8, 2.7, 3); LAND.set(W.pathX(AIR.z + .7) + .7, .022, AIR.z + .7); leafP.copy(AIR);   // 右の欅の張り出した枝の先。葉は風に流されて参道の上に落ちる
const twig = new THREE.Group(); W.add(twig);
const halo = new THREE.Points(new THREE.BufferGeometry().setFromPoints([new V3()]), pointMat(0xffe2a0, MOBILE ? .4 : .34, .6)); W.add(halo);   // 宙の葉の後ろの、光の暈（目を引く一点）
let twigPal = null; const twigMat = base => { twigPal ||= [[1.02, .84, .5], [.98, .7, .45], [.86, 1.0, .62]].map(([r, g, b2]) => { const m = base.clone(); m.onBeforeCompile = base.onBeforeCompile; m.customProgramCacheKey = base.customProgramCacheKey; m.color.setRGB(r, g, b2); return m; }); return twigPal[Math.floor(R() * 3)]; };   /* 房の葉の色は三つ（黄・橙・まだ緑）。材質を分けすぎない＝描画の回数 */
{ const VG = await import(P.kit + "vegetation.js");
  const pts = [tw0.clone().setY(AIR.y + .75).lerp(AIR.clone().add(new V3(2.8, .75, -1.3)), .15),   // 根もとは右の欅の幹の中から（枝が宙に浮かない）
     AIR.clone().add(new V3(1.7, .42, -.8)), AIR.clone().add(new V3(.85, .18, -.38)), AIR.clone().add(new V3(.32, .05, -.12)), AIR.clone().add(new V3(.06, .04, -.01))];   // 幹から横へ伸び、先がわずかに下がるだけ
  const bm = awaiPatch(new THREE.MeshStandardMaterial({ map: W.tex("bark_zelkova", 1), color: 0xb4a694, roughness: .95 }));
  twig.add(new THREE.Mesh(VG.taperTube(pts, .03, .004, 9, 26), bm));
  const cur = new THREE.CatmullRomCurve3(pts);
  // 枝先の小枝と葉の房（十数枚。黄・橙・まだ緑の残るもの）
  for (let j = 0; j < 6; j++) { const u = .7 + j * .045, b0 = cur.getPointAt(u), dir = new V3(.25 + R() * .3, -.04 - R() * .08, -.35 - R() * .3), q = [b0, b0.clone().addScaledVector(dir, .18), b0.clone().addScaledVector(dir, .36).add(new V3(0, -.04, 0))];
    twig.add(new THREE.Mesh(VG.taperTube(q, .0045, .0015, 5, 6), bm)); const c2 = new THREE.CatmullRomCurve3(q);
    for (let i = 0; i < 5; i++) { const sd = i % 2 ? 1 : -1, p = c2.getPointAt(.25 + i * .17).add(new V3(0, sd * .018, sd * .03)), l = PR.keyakiLeaf(.06 + R() * .025); l.material = twigMat(l.material);   // 小枝に互い違いに
      l.position.copy(p); l.rotation.set(-.6 + sd * .5 + (R() - .5) * .3, -.8 + (R() - .5) * .5, sd * .9 + (R() - .5) * .3); twig.add(l); } } }
PR.bakeRigid(twig);   // 枝と房の葉を材質ごとに一つに
const petiole = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(AIR.clone().add(new V3(.06, .04, -.01)), AIR.clone().add(new V3(.03, .045, 0)), AIR.clone().add(new V3(0, .035, 0))), 8, .0022, 5, false), awaiPatch(new THREE.MeshStandardMaterial({ color: 0x7a5a32, roughness: .9 }))); twig.add(petiole);   // 11-06：宙の葉を枝先につなぐ葉柄（見える細い茎）
// 地の上の落ち葉の重なり（欅の葉の画を、着地点のまわりに）
{ const lt = PR.keyakiLeaf(.07), n = MOBILE ? 60 : 120, im = new THREE.InstancedMesh(lt.geometry, lt.material, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const a = R() * TAU, r = .25 + Math.pow(R(), .7) * 2.2; q.setFromEuler(new THREE.Euler(-Math.PI / 2 + (R() - .5) * .3, 0, R() * TAU)); const sc = .8 + R() * .5;
    m4.compose(new V3(LAND.x + Math.cos(a) * r, .012 + R() * .012, LAND.z + Math.sin(a) * r), q, new V3(sc, sc, sc)); im.setMatrixAt(i, m4); const k = R(); im.setColorAt(i, c.setRGB(lerp(.95, .5, k), lerp(.85, .4, k), lerp(.6, .3, k))); }
  W.add(im); }
// 地に落ちた葉を示す細い輪（事実の線：葉のある所）
const mark = PR.subjectRing(0x9bdcf0, .09); mark.userData.mat.opacity = 0; W.add(mark);
const heroRing = PR.subjectRing(0xf2cf8c, .045); heroRing.geometry.rotateX(Math.PI / 2); W.add(heroRing);   // 主役の葉を示す細い輪（触れるまで）
// 上へなぞる誘い：落ちた葉から立ちのぼる細い一本の線（画で誘う）
const upM = lineMat(0x9bdcf0, 0), upL = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(0, .03, 0), new V3(0, .42, 0)]), upM); W.add(upL);
const tapLeafHit = W.addTouch({ getWorldPosition: v => v.copy(leafP) }, () => tapLeaf(), .35);

// シジュウカラ（地の層のあとで来る）
const tit = CR.makeTit(); PR.awaiCreature(tit, .55); tit.scale.setScalar(.18); tit.position.set(-.35, .02, 2.55); tit.rotation.y = -.3; tit.userData.state = "perch"; tit.visible = false; PR.bakeRigid(tit); if (MOBILE) PR.flattenSmall(tit, { wings: true }); W.add(tit);

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
  const lab = textSprite(label, MOBILE ? "" : sub, col, MOBILE ? !(i % 2) : !!(i % 2)); lab.position.set(i % 2 ? -.62 - i * .05 : .62 + i * .05, .02 + i * .03, .1); if (i % 2 && !MOBILE) lab.center.set(1, 0);   /* 層の名は左右に互い違い（重ならない） */ if (MOBILE) { lab.scale.multiplyScalar(.8); lab.center.set(i % 2 ? 0 : 1, 0); lab.position.set(i % 2 ? .38 : -.38, .03, .25); }   /* スマホ：層の手前の先に、中央そろえで（左右の端で切れない） */ g.add(lab);   // スマホは名だけを小さく、層の右に上下へずらして
  const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(0, -y + .03, 0), new V3(0, 0, 0)]), lineMat(col, 0)); g.add(stem);   // 葉から層へ：この葉が入力になる
  const o = { g, i, col, frame, cm, pl, lab, stem, k: 0, mats: [frame.material, cm, stem.material], inner: new THREE.Group() }; g.add(o.inner); W.add(g); L.push(o); return o;
};
// 頂きの一瞬：同じ一枚の葉の輪郭が、四つの層を下から上へ貫いて重なる（四つの受けとり方が、一枚の葉で一つにつながる）
const spine = new THREE.Group(); { for (let k = 0; k < 9; k++) { const pts = LEAFO.map(p => p.clone().multiplyScalar(1.0 + k * .07)); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(0xf2c25a, 0)); ln.position.y = .1 + k * .16; for (const dy of [.004, -.004]) { const l2 = new THREE.Line(ln.geometry, ln.material); l2.position.y = dy; ln.add(l2); } spine.add(ln); } } W.add(spine);
function textSprite(t, sub, col, right = false) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d"); if (right === "mid") { x.textAlign = "center"; x.translate(256, 0); } else if (right) { x.textAlign = "right"; x.translate(504, 0); }
  x.font = '600 38px "Shippori Mincho","Hiragino Mincho ProN",serif'; x.fillStyle = "#" + new THREE.Color(col).getHexString(); x.textBaseline = "middle"; x.fillText(t, right ? 0 : 4, 32);   /* mid も 0 */
  x.font = '500 30px "Hiragino Sans",sans-serif'; x.fillStyle = "rgba(225,232,242,.92)"; x.fillText(sub, 4, 74);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); s.center.set(0, 0); s.scale.set(.86, .16, 1); return s;
}
const labCSS = document.createElement("style"); labCSS.textContent = `.lit-lab{position:fixed;left:0;top:0;pointer-events:none;font-family:"Shippori Mincho","Hiragino Mincho ProN",serif;font-size:13px;letter-spacing:.12em;color:rgba(238,245,251,.92);padding:3px 8px 4px;background:rgba(3,6,15,.72);z-index:3;border-bottom:1px solid var(--c);white-space:nowrap;opacity:0;text-shadow:0 0 6px rgba(0,0,0,.6)}`; document.head.appendChild(labCSS);
const C = { fungi: 0xe8e0c6, tit: 0xb9a7e6, hum: 0xf4aa96, sens: 0xa9c8d8 };
const L0 = sheet(0, C.fungi, "菌と細菌", "葉の表面"), L1 = sheet(1, C.tit, "シジュウカラ", "落ちる動き"), L2 = sheet(2, C.hum, "歩く人", "色づき・季節"), L3 = sheet(3, C.sens, "気温計", "10 分ごとの記録");
if (MOBILE) for (const o of L) { o.lab.visible = false; o.lab.material.visible = false; const d = document.createElement("div"); d.className = "lit-lab"; d.style.setProperty("--c", "#" + new THREE.Color(o.col).getHexString()); d.textContent = ["菌と細菌", "シジュウカラ", "歩く人", "気温計"][o.i]; W.ui.appendChild(d); o.dom = d; }
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
{ const seg = []; for (let i = 0; i < 144; i++) { const a = i / 144 * TAU - Math.PI / 2, night = (i < 36 || i >= 102)   /* 0〜6 時と 17 時以降（十一月の大宮の日の入りは 16 時半ごろ） */, r0 = .36, r1 = r0 + (night ? .1 : .05); seg.push(new V3(Math.cos(a) * r0, 0, Math.sin(a) * r0), new V3(Math.cos(a) * r1, 0, Math.sin(a) * r1)); }
  const m = lineMat(C.sens, 0); L3.inner.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), m)); L3.mats.push(m);
  const ring = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU; ring.push(new V3(Math.cos(a) * .16, 0, Math.sin(a) * .16)); } const m2 = lineMat(C.sens, 0); L3.inner.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), m2)); L3.mats.push(m2); }

const LINES = [
  ["分解を担う菌は、落ちる前から葉にいる。この葉は、もう誰かの食べものだ。"],
  ["小鳥には、この葉はまず、落ちる動きとして届く。"],
  ["歩く人には、この葉は十一月の色になる。"],
  ["気温計は落葉を知らない。残るのは、ゆうべの冷え込みの数だけ。"],
];

// ───────── 進み方
function tapLeaf() { document.body.classList.add("qx-started");   /* 2026-11-10 第4周：はじめに押せるのは葉だけ。右の線は葉に触れてから出す */
  snd.start(); GO.end();
  if (ST.phase === 0) { ST.phase = 1; ST.t = 0; path.length = 0; petiole.visible = false; leaf.material.emissive?.setRGB(0, 0, 0); W.sayNow("葉が、枝をはなれる。"); snd.wood(snd.note(10), { gain: .14, decay: .5 }); return; }
  if (ST.phase === 3 && ST.later > 2) restart();
}
W.onTapEmpty(() => { snd.start(); if (ST.phase === 0) tapLeaf(); else if (ST.phase === 3 && ST.later > 2) restart(); else if (ST.phase === 2 && W.abs < .1) W.sayNow("上へなぞると、この葉を受けとる層が重なる。"); });
// キーボードも既存の葉へのタップ・層の操作につなぐ。物語の進行は共通。
const litCanvas = document.getElementById("cv");
litCanvas.tabIndex = 0;
litCanvas.setAttribute("aria-label", "落ち葉の風景");
litCanvas.setAttribute("aria-describedby", "lit-key-help");
litCanvas.setAttribute("aria-keyshortcuts", "Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight");
const litHelp = document.createElement("p");
litHelp.id = "lit-key-help";
litHelp.textContent = "Enter / Space：葉に触れる　↑ / ↓：層を重ねる・戻る　← / →：見回す";
W.ui.appendChild(litHelp);
const litGuide = document.createElement("p");
litGuide.textContent = "キーボードは Tab で風景へ。" + litHelp.textContent;
const KB = matchMedia("(hover:hover) and (pointer:fine)").matches;   // 2026-11-09 スマホではキーボードの説明を出さない
if (KB) W.ui.querySelector(".aw-fold > div").appendChild(litGuide); else litHelp.hidden = true;
// 2026-11-09「抽象／具体」の目盛りの字は、触れているあいだ（と動いているあいだ）だけ出す
{ const ax = W.ui.querySelector(".aw-axis"); if (ax) { ax.querySelector(".aw-top").textContent = "つながりの図"; ax.querySelector(".aw-bot").textContent = "いまの風景"; ax.title = "上へなぞると、同じ葉を受けとる層が重なる"; const st = document.createElement("style"); st.textContent = "body:not(.qx-started) .aw-axis{opacity:0!important;pointer-events:none!important}.aw-axis{transition:opacity .8s}.aw-axis .aw-top,.aw-axis .aw-bot{opacity:.9;transition:opacity .5s}.aw-axis.qx-on .aw-top,.aw-axis.qx-on .aw-bot,.aw-axis:focus-visible .aw-top,.aw-axis:focus-visible .aw-bot{opacity:1}"; document.head.appendChild(st);
  let last = W.abs, tOff = 0; const on = () => { ax.classList.add("qx-on"); clearTimeout(tOff); tOff = setTimeout(() => ax.classList.remove("qx-on"), 1800); };
  ax.addEventListener("pointerdown", on); ax.addEventListener("pointerenter", on); setInterval(() => { if (Math.abs(W.abs - last) > .004) on(); last = W.abs; }, 150); } }
const litStyle = document.createElement("style");
litStyle.textContent = `#cv:focus-visible{outline:2px solid #d5e4fa;outline-offset:-5px}
#lit-key-help{position:absolute;top:90px;left:16px;max-width:calc(100vw - 92px);margin:0;padding:8px 10px;background:rgba(6,10,18,.88);color:#e7edf7;font:12px/1.7 sans-serif;opacity:0}
#cv:focus-visible ~ #aw-ui #lit-key-help{opacity:1}`;
document.head.appendChild(litStyle);
litCanvas.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (!e.repeat) tapLeaf();
  } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    // あわい共通の window ハンドラが層・視線を更新する（重複更新しない）。
    e.preventDefault(); snd.start();
  }
});

function land() {
  ST.phase = 2; ST.t = 0; leafP.copy(LAND);
  snd.wood(snd.note(-5), { gain: .32, decay: 1.6 }); snd.breath(1.2, { f0: 500, f1: 300, gain: .12 });
  // 道すじを層に写す
  const raw = path.map(p => new V3(p.x - LAND.x, 0, p.z - LAND.z).add(new V3(0, 0, (p.y - LAND.y) * -.3))); let mx = .01; raw.forEach(p => mx = Math.max(mx, Math.abs(p.x) / .5, Math.abs(p.z) / .65)); const pts = raw.map(p => p.multiplyScalar(1 / mx));   // 層の葉の形の中に収める
  trailG.setFromPoints(pts); const tk = []; for (let i = 0; i < pts.length - 1; i += 6) { const d = pts[i + 1].clone().sub(pts[i]).normalize(), n = new V3(-d.z, 0, d.x).multiplyScalar(.035); tk.push(pts[i].clone().add(n), pts[i].clone().sub(n)); } tickG.setFromPoints(tk);
  W.say("参道に、落ちた。"); W.say("上へなぞる。同じ一枚が、ほかのものにはどう届いているか。");
}
function restart() {
  ST.phase = 0; ST.t = 0; ST.top = false; ST.later = 0; said.fill(false); leafP.copy(AIR); petiole.visible = true; leaf.material.color.setRGB(1, 1, 1);
  fg.setDrawRange(0, 0); tit.visible = false; W.setAbs(0); W.sayNow("もう一枚。");
}
const said = [false, false, false, false];
let farT = 6, topFlash = 0, airT2 = 0, stepT = 0, chirpT = 0, tickT = 0, fungiT = 0, airT = 0, lastBeat = -1;   // 声部はすべて 0.6 秒の拍の上。8 拍（4.8 秒）ごとに頭がそろう
W.onFrame((dt, t, a) => {
  if (!GO.done) { _pv.copy(leafP).project(camera); GO.place(_pv.z < 1 && Math.abs(_pv.x) < 1 && Math.abs(_pv.y) < 1 ? (_pv.x + 1) / 2 * innerWidth : null, (1 - _pv.y) / 2 * innerHeight); }
  ST.t += dt; topFlash = Math.max(0, topFlash - dt / 5.5);
  if (aoiL) { const side = a > .3; if (side !== aoiAside) { aoiAside = side; const pr = innerWidth < innerHeight * .8; aoiL.walkTo(side ? new V3(LAND.x + (pr ? -2.4 : 4.6), 0, LAND.z - (pr ? 3.2 : 3.0)) : new V3(LAND.x + (pr ? -1.25 : 3.4), 0, LAND.z - (pr ? 6.2 : 5.6))); } }   // 層が立ちのぼるあいだ、碧は層の縁の外へ一歩よける（主観の視界をふさがない）
  spine.position.set(LAND.x, 0, LAND.z); spine.children.forEach((ln, k) => { const u = clamp(topFlash * 1.25 - (1 - k / 8) * .25, 0, 1); ln.material.opacity = Math.min(1, 1.1 * u * u); }); spine.visible = topFlash > .002;
  if (ST.phase >= 2 && a < .3) { farT -= dt; if (farT < 0) { farT = 8 + Math.random() * 4; const o = { gain: .055, pan: (Math.random() - .5) * 1.4, wet: .9 }; for (let k = 0; k < 2; k++) { snd.chirp(5200, 4900, .06, { ...o, at: k * .42 }); snd.chirp(3700, 3450, .19, { ...o, at: k * .42 + .1 }); } } }   // 静かな区間：遠いシジュウカラの一声（ツツピーの句・まばらに）
  if (ST.phase >= 1) { airT2 -= dt; if (airT2 < 0) { airT2 = 3.4; snd.breath(3.6, { f0: 480 + Math.random() * 120, f1: 720, gain: .085, wet: .8, pan: (Math.random() - .5) * 1.4 }); } }   // 11-06：着地のあとも木立の風が途切れない（無音の穴を埋める）
  // 葉の動き
  if (ST.phase === 0) {
    const s = RM ? 0 : 1; leafP.copy(AIR); halo.visible = true; twig.rotation.z = Math.sin(t * .8) * .012 * s;   // 枝ごと風にゆれる（葉柄で枝につく）
    leaf.lookAt(camera.position); leaf.rotateX(Math.sin(t * .9) * .25 * s); leaf.rotateZ(Math.sin(t * .6) * .25 * s);   /* 宙の葉は面をこちらへ向け、少しだけ揺れる（真横の細い線に見えない） */
    leaf.material.emissive?.setRGB(.85 + .2 * Math.sin(t * 2), .52 + .1 * Math.sin(t * 2), .1);   /* 朝の斜めの光が葉を透かす（逆光の明るみ） */ halo.position.copy(leafP); halo.material.opacity = .85 + .15 * Math.sin(t * 2);   // 主役の葉だけ少し明るく、ゆっくり揺れる
    airT -= dt; if (airT < 0) { airT = 4.2; snd.breath(2.6, { f0: 650, f1: 900, gain: .08, wet: .7, pan: (Math.random() < .5 ? -1 : 1) * (.5 + Math.random() * .4) }); }
  } else if (ST.phase === 1) { halo.visible = false;
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
  heroRing.position.copy(leafP); heroRing.lookAt(camera.position); heroRing.userData.mat.opacity = ST.phase === 0 ? .62 + .15 * Math.sin(t * 1.6) : Math.max(0, heroRing.userData.mat.opacity - dt * 2);
  mark.position.set(LAND.x, .03, LAND.z); mark.userData.mat.opacity += (((ST.phase >= 2) ? .55 * (1 - ss(.3, .9, a)) : 0) - mark.userData.mat.opacity) * (1 - Math.exp(-dt * 2));
  // 層：上へなぞるほど、下から順に現れる
  L.forEach((o, i) => {
    const on = ST.phase >= 2 ? ss(.12 + i * .17, .26 + i * .17, a) : 0;   // 時が過ぎた段でも、上へなぞれば同じ葉の層が重なる
    o.k += (on - o.k) * (1 - Math.exp(-dt * 3));
    if (o.dom) { const P = o.g.getWorldPosition(new V3()).add(new V3((o.i % 2 ? 1 : -1) * (.36 * .9 * (1.55 + o.i * .12) + .08), 0, 0)).project(camera), sx = (P.x + 1) / 2 * innerWidth, sy = (1 - P.y) / 2 * innerHeight, w = o.dom.offsetWidth;
      o.dom.style.transform = `translate(${clamp(o.i % 2 ? sx + 8 : sx - 8 - w, 20, innerWidth - 84 - w)}px, ${clamp(sy - 12, 70, innerHeight - 170)}px)`;   /* 画面の内側・軸と題と字幕を避ける */ o.dom.style.opacity = o.k < .15 ? "0" : (o.k * (o === L.filter(q => q.k > .5).at(-1) ? .95 : .55)).toFixed(3); }   /* スマホ：画面に置く札（読める大きさ・端で切れない・今の層だけ濃く） */
    for (const m of o.mats) m.opacity = Math.min(1, (m.userData.max ?? .7) * o.k * (1 + topFlash * 1.6)); o.pl.material.opacity = .045 * o.k; o.lab.material.opacity = .95 * o.k; if (!MOBILE) { o.lab.scale.set(.86, .16, 1).multiplyScalar(lerp(.55, 1, ss(.5, .9, a))); o.lab.position.x = (o.i % 2 ? -1 : 1) * lerp(.42, .62 + o.i * .05, ss(.5, .9, a)); }   // 主観の近い画角では札を小さく内側へ（画面の端で切れない）
    o.g.visible = o.k > .004;
    o.g.position.y = lerp(.02, .32 + i * .36, ss(0, 1, o.k));   // 葉から立ちのぼる
    if (on > .5 && !said[i]) { said[i] = true; W.sayNow(LINES[i][0]); }   // 一つの層に一行・すぐ出す（字幕が絵より遅れない）
  });
  if (ST.phase === 2) fg.setDrawRange(0, Math.floor(fN * clamp(L0.k * (.25 + ST.t * .04), 0, 1)));
  // 頂き：すべての層が重なる
  if (ST.phase === 2 && said[3] && !ST.top) { ST.top = true; topFlash = 1; [0, 4, 7, 9].forEach((k, i) => snd.bell(snd.note(k), { gain: .1, at: i * .1, decay: 2.6, wet: .85, pan: [-.7, .7, -.35, .35][i] }));   /* 頂き：四つの層が一度に灯り、和音が鳴る（記憶に残る一瞬） */ W.sayNow("同じ一枚の葉が、主体の数だけ別の出来事になる。どれも欠けた見え方で、どれも本当の葉だ。"); W.say("下へなぞる。葉のところへ戻る。"); }
  // 降りる：時が過ぎた同じ場所
  if (ST.phase === 2 && ST.top && a < .08) { ST.phase = 3; ST.later = 0; tit.visible = true; tit.position.set(LAND.x + (innerWidth < innerHeight * .8 ? .16 : .36), .02, LAND.z - (innerWidth < innerHeight * .8 ? .42 : .22));   /* 縦長は画面の内側へ */ tit.rotation.y = 2.3; tit.scale.setScalar(.14);   /* 時が過ぎた参道：シジュウカラが葉のそばの地をついばむ */ snd.bell(snd.note(0), { gain: .2, decay: 2.2, wet: .85 }); snd.bell(snd.note(4), { gain: .14, at: .05, decay: 2.2, wet: .85 }); snd.bell(snd.note(7), { gain: .1, decay: 2.2, wet: .85, at: .1 });
    W.sayNow("葉は数日を参道ですごし、何か月もかけて菌に分けられ、土へ還る。"); W.say("だれも全体を見ていない。それでも、全体は回っている。"); W.say("自分の見ている欅が、欅のすべてではない。", 6); W.say("葉に触れると、もう一枚。"); }
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
    if (nb && k1 > .2 && bi % 4 === 0) { const o = { gain: .16 * k1, pan: bi % 8 < 4 ? -.75 : .7 };   /* 鳥の声を左右に散らす */ for (let k = 0; k < 3; k++) { snd.chirp(5200, 4900, .06, { ...o, at: (o.at || 0) + k * .42 }); snd.chirp(3700, 3450, .19, { ...o, at: (o.at || 0) + k * .42 + .1 }); }   /* ツツピー（シジュウカラのさえずりの句。声域 3〜6 kHz の模式） */ }
    if (nb && k2 > .2) { snd.step({ gain: .16 * k2, pan: .3, f: 460 + (bi % 2) * 120 }); snd.wood(snd.note(-5 + (Math.floor(t / .6) % 2)), { gain: .03 * k2, decay: .4, pan: .3 }); }   // 歩行 毎分約 100 歩
    if (nb && k3 > .2 && bi % 4 === 0) { snd.bell(snd.note(12), { gain: .05 * k3, pan: .6, decay: .35, wet: .7 }); }   // 10 分ごとの記録 → 2.4 秒（模式）
  }
});
setTimeout(() => { W.say("光っている葉に触れてみよう。落ちる一枚が、だれにどう届くかを見る。"); }, 300);
AMK.done = Math.round(performance.now() - T0);
window.__app = { W, ST, L, tapLeaf, land };
