// © mitsulab. 哲学の思想（x/20）── 哲学の思想：閉じた世界 → 関係の回路 → 外へ分かれる系 → 個に閉じない系としての認知
// 具体＝朝の氷川参道の一場面（シジュウカラ・ミツバチとツワブキ・落ち葉の菌・気温の記録計）。抽象＝同じ場所が線と点と球になる。
// 主体を包む球は「閉じた世界」の模式。一度触れると内で鳴るだけ（外へ届かない）。二度目で窓がひらき、音が他の主体の入力になる。
// 典拠と音の根拠＝../資料/出典と音の根拠.md
const P = window.AW_PATHS; const T0 = performance.now(); const AMK = window.__appMK = {};
const [{ createAwai, injectCSS, lineMat, pointMat, fadeBy, AW, MOBILE, RM, TAU, clamp, lerp, ss }, PR, S, CR] = await Promise.all([
  import(P.kit + "awai.js"), import(P.kit + "awai_props.js"), import(P.kit + "awai_sound.js"), import(P.kit + "creatures_sight.js")]);
import * as THREE from "three";
AMK.mods = Math.round(performance.now() - T0); injectCSS();
const V3 = THREE.Vector3;

let RIG = null;
const W = await createAwai({
  title: "Qualia/philosophy", sub: "哲学の思想", en: "Thought in Philosophy", tex: P.tex, aoi: P.aoi, keyaki: P.keyaki, sprig: P.sprig, aoiAt: [innerWidth < innerHeight * .8 ? -1.75 : -.35, innerWidth < innerHeight * .8 ? -3.9 : -1.2, .05]   /* 碧は主体の群れの奥（どの球とも 1 m 以上離れる） */, seed: 2020, portrait: 1.15,
  rig: RIG = (a, y) => {
    const port = innerWidth < innerHeight * .8, k = ss(0, 1, a), piv = new V3(lerp(port ? .3 : 1.0, port ? .25 : 1.3, k), 0, lerp(port ? 1.9 : 1.4, 1.4, k)), back = lerp(port ? 3.15 : 3.7, port ? 4.9 : 3.7, k), h = lerp(port ? .62 : 1.3, 3.1, k);   // 11-06 二版の後：縦長は群れへ一歩寄り、低く（下の空いた地を減らす）   // 具体は参道の右寄りから、左の木立へ斜めに見る（左右対称の消失点を外す）
    return { pos: new V3(piv.x + Math.sin(y + lerp(.12, .3, k)) * back, h, piv.z + Math.cos(y + lerp(.12, .3, k)) * back), look: new V3(lerp(port ? -.08 : -.4, port ? .05 : -.2, k), lerp(port ? 1.0 : .3, .35, k), lerp(port ? 1.75 : 1.2, port ? 2.2 : 2.25, k)) };   // PC の抽象：群れを画面の中ほどへ（下に寄って上が空いていた）
  },
  credits: [
    "ライプニッツ『モナドロジー』（1714）／ユクスキュル、クリサート『生物から見た世界』（1934）／マトゥラーナ、ヴァレラ（1972）",
    "ベイトソン『精神の生態学』（1972）／グラッセ（Insectes Sociaux, 1959）",
    "ミツバチの羽ばたき 約 230 回／秒：Altshuler ほか（PNAS 102, 2005）。歩く拍 毎分約 100 歩（中くらいの速さで歩くときの目安：Tudor-Locke ほか IJBNPA 16, 2019）。鳥の紫外の見え方：Cuthill ほか（2000）",
    "渡る線は、事実のある経路だけ（声・羽音・足音・動き・踏まれた落ち葉・気温・記録）。光の点の速さ、記録の打鍵の間は作品の設定の値（模式）",
    "菌の営みの音は、聴こえる高さに移した模式。鳥の声は、シジュウカラの声域（3〜6 kHz）に合わせた模式。音が渡る光の速さは見やすく遅くした模式",
    "質感：Poly Haven・ambientCG（CC0）。生き物の形：図鑑の形態にそって mitsulab が造形。碧の 3D・声・文：mitsulab",
  ],
});
const { scene, R } = W; AMK.stage = Math.round(performance.now() - T0);
const snd = S.createSound(W.sndBtn);
W.onFirstInput(() => snd.start());

// ───────── 主体
const sub = [];
const addSub = (o) => { o.open = 0; o.openT = 0; o.knock = 0; o.lit = 0; sub.push(o); return o; };
// シジュウカラ：道の端で落ち葉をつつく
const tit = CR.makeTit(); PR.awaiCreature(tit, .55); tit.scale.setScalar(.2); tit.position.set(-.4, 0, 3.3); tit.rotation.y = 1.1; tit.userData.state = "perch"; PR.bakeRigid(tit); if (MOBILE) PR.flattenSmall(tit, { wings: true }); W.add(tit);
// ツワブキとミツバチ
const tw = PR.tsuwabuki(R, { n: 11, spread: .42 }); tw.position.set(.95, 0, 2.95); W.add(tw);
const bee = CR.makeBee(); PR.awaiCreature(bee, .55); bee.scale.setScalar(.022); PR.bakeRigid(bee, { dropFur: MOBILE }); if (MOBILE) { const bp = bee.userData.parts; bp.wings.forEach(w => w.hw.visible = false); PR.flattenSmall(bee, { collapse: bp.body, keep: bp.wings.flatMap(w => [w.fw, w.hw]) }); }   /* スマホ：後翅は前翅に重なるので省き、体の部品を一つに */ W.add(bee);
const beeHome = tw.userData.heads[0].clone().add(tw.position);
// 落ち葉と菌の糸
let hy = null;
const leaf = PR.keyakiLeaf(.12);   /* 11-06：菌の居場所の葉を見える大きさに */ leaf.rotation.set(-Math.PI / 2 + .06, 0, .7); leaf.position.set(.3, .016, 2.75); W.add(leaf);
{ const pts = []; for (let k = 0; k < 26; k++) { let x = (R() - .5) * .05, z = (R() - .5) * .07; for (let s = 0; s < 4; s++) { const nx = x + (R() - .5) * .025, nz = z + (R() - .5) * .025; pts.push(x, 0, z, nx, 0, nz); x = nx; z = nz; } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  hy = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xf6f2e6, transparent: true, opacity: .9 })); hy.scale.setScalar(1.7); hy.position.set(.3, .022, 2.75);   /* 菌の糸を主体として見える濃さと広がりに */ W.add(hy); }
// 気温の記録計
const sens = PR.sensorPost(); sens.position.set(-1.55, 0, 1.55); sens.rotation.y = .5; PR.bakeRigid(sens); W.add(sens);
if (innerWidth < innerHeight * .8) { for (const o of [tit, tw, leaf, hy, sens]) o.position.x = .05 + (o.position.x - .05) * .55; tw.position.x = .25; beeHome.copy(tw.userData.heads[0]).add(tw.position); leaf.position.x = .34; leaf.position.z = 3.5; hy.position.copy(leaf.position).setY(.022); }   /* 縦長：菌はツワブキの葉の陰から出し、シジュウカラの球とも離す（右手前へ） */   // 縦長の画面：主体を左右の中央へ寄せる（11-06 二版の後：蜂の居場所も花へついてくる＝前は花から離れて浮いていた）

const YOU_ABS = innerWidth < innerHeight * .8 ? new V3(1.02, .05, 3.45) : new V3(1.55, .05, 2.15);   // 抽象の図での「あなた」の場所（群れの手前・画面の下の中ほど）
const C = { tit: 0xb9a7e6, bee: 0xf2cf8c, fungi: 0xe8e0c6, sens: 0xa9c8d8, you: 0xf4aa96 };
// 何を出し（out）、何にだけ窓がひらくか（in）。事実のある経路だけを結ぶ
addSub({ id: "tit", name: "シジュウカラ", col: C.tit, at: () => tit.position.clone().add(new V3(0, .09, 0)), r: .3, f: snd.note(7), out: ["声", "動き"], in: ["足音", "動き", "声"],
  c: "シジュウカラ。多くの小鳥は、人に見えない紫外の光も見分けるとされる（羽の淡い線は、その模式）。",
  a: "どの主体も、自分の内側から世界を映し、そこに窓はない。ライプニッツ『モナドロジー』（1714）の考え。",
  voice: (o) => { for (let k = 0; k < 3; k++) { snd.chirp(5200, 4900, .06, { ...o, gain: (o.gain ?? .3) * .32, at: (o.at || 0) + k * .42 }); snd.chirp(3700, 3450, .19, { ...o, gain: (o.gain ?? .3) * .32, at: (o.at || 0) + k * .42 + .1 }); }   /* ツツピー（シジュウカラのさえずりの句。声域 3〜6 kHz の模式） */ } });
addSub({ id: "bee", name: "ミツバチ", col: C.bee, at: () => bee.position.clone(), r: .24, f: snd.note(3), out: ["羽音", "動き"], in: ["動き"],
  c: "ミツバチがツワブキの花に来る。羽音は、一秒に約 230 回のはばたき。",
  a: "主体ごとに、知覚と作用の環が閉じている。ユクスキュル『生物から見た世界』（1934）の考え。",
  voice: (o) => snd.hum(230, 1.5, { ...o, gain: (o.gain ?? .3) * .7 }) });
addSub({ id: "fungi", name: "落ち葉の菌", col: C.fungi, at: () => leaf.position.clone().add(new V3(0, .03, 0)), r: .2, f: snd.note(-3), out: ["養分"], in: ["踏む"],
  c: "落ち葉の上で、白い菌の糸が葉を少しずつほどいていく。音は聴こえない。ここでは聴こえる高さに移した模式。",
  a: "生きる系は、自分をつくり続け、その作動は内で閉じている。マトゥラーナとヴァレラ（1972）の考え。",
  voice: (o) => { snd.drone(snd.note(-13), 3.2, { ...o, gain: (o.gain ?? .3) * .5 }); snd.wood(snd.note(-8), { ...o, gain: (o.gain ?? .3) * .45, decay: 1.6 }); } });
addSub({ id: "sens", name: "気温の記録計", col: C.sens, at: () => sens.position.clone().add(new V3(0, 1.4, 0)), r: .4, f: snd.note(5), out: ["記録"], in: ["気温"],
  c: "気温の記録計。温度だけを、数として受けとる。",
  a: "機械も、手がかりに応じて出力を変える。ここではそれを「受けとり方」と呼ぶ。",
  voice: (o) => { for (let i = 0; i < 3; i++) snd.click({ ...o, gain: (o.gain ?? .3) * .25, at: (o.at || 0) + i * .5, f: 1760 }); } });
const you = { id: "you", name: "あなた", col: C.you, at: () => { const p = W.camera.position; return new V3(p.x, .05, p.z - 1.2).lerp(YOU_ABS, ss(.4, .8, W.abs)); }, r: .5, f: snd.note(0), open: 0, openT: 0, lit: 0, out: ["足音", "動き", "踏む"], in: ["声", "羽音", "記録"],
  voice: (o) => { for (let i = 0; i < 4; i++) { snd.step({ ...o, at: (o.at || 0) + i * .6, gain: (o.gain ?? .3) * 1.3, f: 480 + (i % 2) * 120 }); snd.wood(snd.note(-5 + (i % 2)), { ...o, at: (o.at || 0) + i * .6, decay: .4, gain: (o.gain ?? .3) * .18 }); } } };   // 歩行 毎分約 100 歩＝0.6 秒
const SKY = { id: "sky", name: "日差し", r: .08, col: 0xfff1d8, at: () => new V3(-2.0, 1.9, .9), out: ["気温"], in: [] };   // 日差しと風（環境そのものの変化）
const CH = {   // 経路をはじめて渡ったときの一行
  "tit>you": "シジュウカラの声が、あなたの入力になる。", "bee>you": "ミツバチの羽音が、あなたの入力になる。", "you>tit": "あなたの足音と動きが、シジュウカラの入力になる。",
  "bee>tit": "ミツバチの動きが、シジュウカラの入力になる。小鳥は虫を食べる。", "tit>bee": "シジュウカラの動きが、ミツバチの入力になる。",
  "you>fungi": "踏まれた落ち葉はくだけ、菌の入力になる。", "sky>sens": "日差しで変わる気温だけが、記録計の入力になる。", "sens>you": "記録は、読む人の入力になる。",
  "you>bee": "あなたの動きが、ミツバチの入力になる。",
};
const canPass = (a, b) => a.out.some(k => b.in.includes(k));
const chanOf = (a, b) => a.out.find(k => b.in.includes(k));

// 閉じた世界の球と、当たり
for (const s of sub) {
  s.m = PR.monad(s.col, s.r); W.add(s.m); s.m.position.copy(s.at());
  W.addTouch({ getWorldPosition: v => v.copy(s.at()) }, () => tapSub(s), Math.max(.42, s.r * 1.3));
}
// シジュウカラの紫外の模式：触れると羽のまわりに淡い紫の線（人の目には見えない反射の、目に見える模式）
const uv = new THREE.Group(); { for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 24; i++) { const a = -1.1 + i / 24 * 2.2; pts.push(new V3(Math.cos(a) * (.06 + k * .025), .07 + Math.sin(a) * .02 * (k + 1), Math.sin(a) * (.08 + k * .03))); } uv.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(0xc7b4ff, 0))); } } W.add(uv); let uvK = 0;
const youRing = PR.subjectRing(C.you, .3); youRing.userData.mat.opacity = 0; W.add(youRing);

// ───────── 渡る光（事実のある経路だけ）と、地に残る跡
const pulses = [], NP = 48;
const pg = new THREE.BufferGeometry(), pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3);
pg.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pg.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
const pm = pointMat(0xffffff, MOBILE ? .09 : .075, .95); pm.vertexColors = true; W.add(new THREE.Points(pg, pm));
const traces = [], said = new Set(), links = {};
const keyOf = (a, b) => a.id + ">" + b.id;
const sendPulse = (from, to, gain) => {
  const A = from.at(), B = to.at(), tr = traces.find(t => t.key === keyOf(from, to));
  const mid = A.clone().lerp(B, .5); mid.y += tr ? .12 : .45 + A.distanceTo(B) * .1;
  const curve = new THREE.QuadraticBezierCurve3(A, mid, B), len = curve.getLength();
  pulses.push({ curve, u: 0, du: (tr ? 3.4 : 2.0) / len, from, to, gain, col: new THREE.Color(from.col) });
  const lk = keyOf(from, to); if (!links[lk]) { const m = lineMat(new THREE.Color(from.col).lerp(new THREE.Color(to.col), .5), 0); scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)), m)); links[lk] = m; }   // 渡った経路は線として残る（抽象の側で濃い）   // 跡のある経路は速く渡る＝跡が次のふるまいを誘う（模式）
};
const openSubs = () => [...sub, you].filter(s => s.openT > 0);
const fanOut = (s, gain) => { for (const o of openSubs()) if (o !== s && canPass(s, o)) sendPulse(s, o, gain); };
const arrive = (p) => {
  const s = p.to; s.lit = 1; const k = keyOf(p.from, s);
  if (CH[k] && !said.has(k)) { said.add(k); W.say(CH[k]); }
  if (stage >= 2) layTrace(p.from, s);
  const g = p.gain * .45;   // 渡るたびに弱まり、ひとりでに静まる
  if (g < .08 || s === you && !you.openT) return;
  s.voice({ gain: g, pan: panOf(s), wet: .6 }); snd.bell(s.f, { gain: g * .5, pan: panOf(s), decay: .8 });
  for (const o of openSubs()) if (o !== s && o !== p.from && canPass(s, o)) sendPulse(s, o, g);
  if (s.id === "fungi") soilTrace();
};
const layTrace = (a, b) => {
  const key = keyOf(a, b); let t = traces.find(x => x.key === key);
  if (!t) {
    const A = a.at(), B = b.at(), pts = []; if (A.distanceTo(B) < .3) return;   /* 短すぎる跡は丸まって傷に見えるので描かない */
    for (let i = 0; i <= 40; i++) { const u = i / 40, p = A.clone().lerp(B, u); p.y = .025; p.x += Math.sin(u * Math.PI) * .12; pts.push(p); }
    const m = lineMat(new THREE.Color(a.col).lerp(new THREE.Color(b.col), .5).multiplyScalar(1.3), 0); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m); scene.add(l);
    t = { key, l, m, life: 0 }; traces.push(t);
    if (traces.length === 3 && stage === 2) { stage = 3; setTimeout(finale, 2400); }
  }
  t.life = 1;
};
// 菌の出力：分解で、養分が土へ還る（地の中へ沈む線）
let soilLine = null;
const soilTrace = () => { if (soilLine) { soilLine.m.opacity = .7; return; } const A = leaf.position.clone(), pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push(new V3(A.x - u * 1.6 + Math.sin(u * 9) * .05, .02 - u * .0, A.z - u * 1.2)); }
  const m = lineMat(C.fungi, .7); soilLine = { l: new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m), m }; scene.add(soilLine.l); if (!said.has("soil")) { said.add("soil"); W.say("菌の分解で、養分が土へ還る。その土が、また欅の根の入力になる。"); } };
const panOf = s => { const v = s.at().project(W.camera); return clamp(v.x, -1, 1) * .8; };

// ───────── 段（閉じた世界 → 関係の回路 → 外へ分かれる系 → 個に閉じない系としての認知）
let stage = 0, sawAbs = false, sawBack = false, aoiA = null, aoiSpots = null, aoiSide = 0;
W.aoi.then(a => { aoiA = a; if (a) setTimeout(() => placeAoi(a), 600); });
/* 碧の置き場を、具体・あわい・抽象のどの段でも、どの球にも・軸にも・題にも重ならない所から選ぶ（画面に写して確かめる） */
function placeAoi(a) {
  const cam = W.camera.clone(), port = innerWidth < innerHeight * .8, H = 1.62, v = new V3();
  const scr = p => { v.copy(p).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, v.z]; };
  const camAt = ab => { const r = RIG(ab, 0); if (cam.aspect < .8) r.pos.sub(r.look).multiplyScalar(lerp(1, 1.15, clamp((.8 - cam.aspect) / .34, 0, 1) * (1 - ss(.2, .8, ab)))).add(r.look); cam.position.copy(r.pos); cam.lookAt(r.look); cam.updateMatrixWorld(); };
  const bad = (x, z, tr, abl = [0, .3, .5, .75, 1]) => { let n = 0; for (const ab of abl) { camAt(ab);
      const f = scr(new V3(x, 0, z)), h = scr(new V3(x, H, z)), side = scr(new V3(x + .3, H * .5, z)); if (f[2] > 1 || h[2] > 1) { n += 9; tr?.push(ab + ':behind'); continue; }
      const hw = Math.abs(side[0] - f[0]) + 8, L = Math.min(f[0], h[0]) - hw, Rr = Math.max(f[0], h[0]) + hw, T = h[1] - 10, B = f[1] + 20;
      if (L < 12 || Rr > innerWidth - 80 || (T < 22) || (T < 70 && L < Math.min(240, innerWidth * .45))) { n += port || T < 22 || Rr > innerWidth - 80 ? 6 : 1; tr?.push(ab + ':edge ' + [L, Rr, T, B].map(Math.round)); continue; }
      for (const s of [...sub, ...(ab > .45 ? [{ at: () => YOU_ABS, r: .3 }] : [])]) { const c = scr(s.at()), e = scr(s.at().clone().add(new V3(s.r * 1.6, 0, 0))), rr = Math.hypot(e[0] - c[0], e[1] - c[1]) + 14; const qx = clamp(c[0], L, Rr), qy = clamp(c[1], T, B); if (Math.hypot(qx - c[0], qy - c[1]) < rr) { n += ab < .2 ? (port ? 14 : 6) : 3; tr?.push(ab + ':' + (s.id || 'you')); break; } } }
    return n; };
  const [x0, z0] = port ? [-1.75, -3.9] : [-.35, -1.2], cand = [[x0, z0]];
  for (const dz of [0, -.5, -1, -1.5, -2, -2.5, -3, -3.5, -4, -4.5, -5, -5.5, -6, -7, -8, -9, ...(port ? [1, 2, 3, 4, 5, 6, 7] : [])]) for (const dx of [0, -.5, .5, -1, 1, -1.5, 1.5, -2, 2, -2.5, 2.5, -3, 3, 3.5, 4, 4.5]) cand.push([x0 + dx, z0 + dz]);
  if (port) for (let x = -2.5; x <= 2.5; x += .25) for (let z = -3; z <= 3.2; z += .25) cand.push([x, z]);   // 11-06 二版の後：縦長は群れの近くも探す
  const camP = (() => { const r = RIG(0, 0); return r.pos; })();
  const pickBest = abl => { let best = null, bn = 1e9; for (const [x, z] of cand) { const d = Math.hypot(x - camP.x, z - camP.z), n = bad(x, z, null, abl) + (port ? Math.max(0, d - 3.4) * .2 : Math.max(0, -4.5 - z) * .4);   /* 遠すぎる所は損（案内役が小さくなりすぎない） */ if (n < bn) { bn = n; best = [x, z]; } if (!n && !port) break; } return [best, bn]; };
  // 11-06 二版の後：縦長は、具体の側と抽象の側で立つ所を分け、軸を動かすと碧が歩いて移る（一つの所ですべての段を満たそうとすると、遠く小さくなるか重なる）
  let [best, bn] = port ? [[.06, -3.4], 0] : pickBest([0, .3, .5, .75, 1]);   // 縦長の具体：群れの奥のまん中（球・記録計・軸のどれにも重ならず、案内役として見える大きさ。画面で確かめた値）
  if (port) { const [bA] = pickBest([.75, 1]); aoiSpots = [new V3(best[0], 0, best[1]), new V3(bA[0], 0, bA[1])]; }
  a.motion.teleport(best[0], best[1], .05); window.__aoiAt = [...best, bn]; window.__aoiTr = (x, z) => { const t = []; bad(x, z, t); return t; }; window.__aoiDbg = () => cand.map(([x, z]) => [x, z, bad(x, z)]).sort((p, q) => p[2] - q[2]).slice(0, 12);   /* 重なりが 0 の所、なければいちばん少ない所 */
}
function tapSub(s) {
  snd.start(); { const c = new V3(); sub.forEach(o => c.add(o.at())); c.multiplyScalar(1 / sub.length); const f = c.lerp(s.at(), s.id === "sens" ? 0 : innerWidth < innerHeight * .8 ? .3 : .6); f.y = Math.min(f.y, .6); /* 触れても寄らない（群れを画面に残す・光と音で応える） */ }   // 記録計に触れても群れが画面に残る   // 寄る先は、触れた主体と群れの中ほど（ほかの主体を画面に残す）
  s.lit = 1;
  if (!s.openT) {   // 一度目：まず内でこもって鳴り（閉じた世界）、そのまま窓がひらく
    s.voice({ gain: .2, pan: panOf(s), lp: 620, wet: .08 });
    W.sayNow(W.abs > .4 ? s.a : s.c);   // 具体の側では具体の一行だけ（概念の一行は、抽象の側で）
    setTimeout(() => openWin(s), 1500);
    return;
  }
  s.voice({ gain: .22, pan: panOf(s), wet: .55 }); snd.bell(s.f, { gain: .13, pan: panOf(s) });   // 11-06：強弱の差を 12 dB 以内へ
  W.sayNow(W.abs > .5 ? s.a : s.c); fanOut(s, .55);
}
function openWin(s) {
  if (s.openT) return; s.openT = 1;
  const dir = s.id === "sens" ? new V3(-.3, 1, -.2) : s.id === "fungi" ? new V3(0, -1, .2) : (() => { const c = new V3(); sub.filter(o => o !== s).forEach(o => c.add(o.at())); return c.multiplyScalar(1 / 3).sub(s.at()).normalize().add(new V3(0, .5, 0)).normalize(); })();
  s.m.material.uniforms.uDir.value.copy(dir);
  s.voice({ gain: .21, pan: panOf(s), wet: .55 }); snd.bell(s.f, { gain: .14, pan: panOf(s) });
  const first = sub.filter(o => o.openT).length === 1;
  if (first) sub.filter(o => o !== s).forEach((o, i) => setTimeout(() => { if (!o.openT) o.lit = .7; }, 2200 + i * 450));   // 次に触れる所を、球を順に明るくして示す
  W.say(s.id === "sens" ? "記録計がひらくのは、気温にだけ。" : s.id === "fungi" ? "菌の窓は、土と落ち葉の側にある。" : (s.id === "tit" ? "シジュウカラの窓は、声と足音と動きに向いている。" : "ミツバチが受けとるのは、ここでは動きだけ。")); if (first) W.say("この音は、聴きとれるものの入力になる。");
  fanOut(s, .5);
  const n = sub.filter(o => o.openT).length;
  if (n === 2 && stage === 0) { stage = 1; if (!sawAbs) W.sayNow("上へなぞると、同じ場所を概念の側から見る。"); W.say("心は、生き物と環境をふくむ回路の中にある。ベイトソン『精神の生態学』（1972）の考え。"); }
  if (n === 4 && stage < 2) { stage = 2; W.say("シロアリは互いに命じあわず、巣に残した跡を手がかりに働く。グラッセ（1959）が見た仕組み。"); W.say("ここでも、渡ったあとが地に跡を残す。跡が、次のふるまいを誘う。"); }
}
function finale() {
  you.openT = 1; youTarget = 1;
  W.say("ライプニッツは、主体に窓はないとした。マトゥラーナとヴァレラは、閉じた作動と、環境と結びついて変わることを両立させた。");
  W.say("ここでは主体どうしが、跡と場を介して互いを変えていく。個に閉じない系としての認知。");
  [0, 2, 4, 7].forEach((i, k) => snd.bell(snd.note(i), { gain: .12, at: k * .09, decay: 1.6, wet: .8 })); quietUntil = performance.now() / 1000 + 4.8;   // 和音のあと 4.8 秒の無音、そこから足音だけが戻る
  setTimeout(() => you.voice({ gain: .22, pan: 0, wet: .4 }), 4800 + 1600);   // 終幕：開いた声部が一つの和音に閉じる
  W.say("足もとを押すと、あなたの足音も渡る。");
}
let youTarget = 0, skyT = 0, padT = 0, quietUntil = 0, ghostT = 0;
W.onTapEmpty(() => {
  snd.start();
  const open = you.openT > 0;
  you.voice({ gain: open ? .4 : .3, pan: 0, lp: open ? undefined : 900, wet: open ? .5 : .15 });   // あなたの足音
  you.lit = 1; for (const o of sub.filter(o => o.openT && canPass(you, o))) sendPulse(you, o, .5);
});

setTimeout(() => { W.say("朝の氷川参道。ここにいるものは、それぞれ自分の世界の内にいる。"); W.say("球に触れてみる。"); }, 900);
W.onAbs(a => {
  if (!sawAbs && a > .62) { sawAbs = true; W.say("同じ場所を、概念の側から見る。球は、主体ごとに閉じた世界の模式。"); }
  if (sawAbs && !sawBack && a < .15) { sawBack = true; W.say("具体へ戻る。概念は、この朝の一場面の中にある。"); }
});

// 抽象の側の地図：渡りうる経路（事実のある経路）を淡い破線で。線の中ほどに渡るものの名（PC だけ）
let pathMap = null;
function buildPathMap() {
  const pos = [], col = [], labs = new THREE.Group(), seen = new Set();
  for (const A of [...sub, SKY, you]) for (const B of [...sub, you]) { if (A === B || !canPass(A, B)) continue; const key = [A.id, B.id].sort().join("|"); if (seen.has(key)) continue; seen.add(key);
    const P = A === you ? YOU_ABS.clone() : A.at(), Q = B === you ? YOU_ABS.clone() : B.at(), mid = P.clone().lerp(Q, .5); mid.y += .45 + P.distanceTo(Q) * .1; const cv = new THREE.QuadraticBezierCurve3(P, mid, Q), pts = cv.getPoints(36);
    const c = new THREE.Color(A.col).lerp(new THREE.Color(B.col), .5);
    for (let i = 0; i < pts.length - 1; i += 2) { pos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    if (A !== you && B !== you && A !== SKY && innerWidth >= innerHeight * .8) { const both = [chanOf(A, B), chanOf(B, A)].filter(Boolean), t = [...new Set(both)].join("・");
      const cn = document.createElement("canvas"); cn.width = 256; cn.height = 64; const x = cn.getContext("2d"); x.font = '500 30px "Hiragino Mincho ProN","Yu Mincho",serif'; x.shadowColor = "rgba(0,0,0,.75)"; x.shadowBlur = 8; x.fillStyle = "#" + c.getHexString(); x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, 128, 34);
      const tx = new THREE.CanvasTexture(cn); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, opacity: 0 })); sp.scale.set(.5, .125, 1); sp.position.copy(cv.getPoint(.5)).add(new V3(0, .06, 0)); labs.add(sp); } }
  for (const S0 of [...sub, you, SKY]) { const P = S0 === you ? YOU_ABS.clone() : S0.at(), cn = document.createElement("canvas"); cn.width = 320; cn.height = 64; const x = cn.getContext("2d"); x.font = '600 32px "Hiragino Mincho ProN","Yu Mincho",serif'; x.shadowColor = "rgba(0,0,0,.75)"; x.shadowBlur = 8; x.fillStyle = "#" + new THREE.Color(S0.col).getHexString(); x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(S0.name, 160, 34);
    const tx = new THREE.CanvasTexture(cn); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, opacity: 0 })); sp.scale.set(.62, .124, 1); { const c0 = new V3(); sub.forEach(o => c0.add(o.at())); c0.multiplyScalar(1 / sub.length); const out = P.clone().sub(c0).setY(0); if (out.lengthSq() < 1e-4) out.set(0, 0, 1); out.normalize(); if (S0.id === "sens") sp.position.copy(P).add(new V3(0, -(S0.r * 1.2 + .1), .1)); else if (S0 === SKY) sp.position.copy(P).add(new V3(innerWidth < innerHeight * .8 ? .55 : 0, .14, 0)); else if (S0 === you) sp.position.copy(P).add(innerWidth < innerHeight * .8 ? new V3(0, .02, .48) : new V3(0, .42, 0)); else if (innerWidth < innerHeight * .8 && S0.id === "bee") sp.position.copy(P).add(new V3((S0.r || .3) + .42, .02, 0));   /* 縦長の蜂：名は球の右（下にはシジュウカラの球がある） */ else if (innerWidth < innerHeight * .8 || S0.id === "fungi") sp.position.copy(P).add(new V3(S0.id === "fungi" ? .3 : 0, -((S0.r || .3) + .16), (S0.r || .3) + .25));   /* 縦長と菌：名は球の真下の手前（画面の外へ出ず、球の線にかからない） */ else sp.position.copy(P).addScaledVector(out, (S0.r || .3) + .3)   /* 縦長は球の外まで十分に押し出す */.add(new V3(0, -.02, 0)); } labs.add(sp); }   /* 名は群れの中心から外向きに（重ならない）。あなたの名は輪の上に */   /* 主体の名（球の手前の地に） */
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const m = lineMat(0xffffff, 0); m.vertexColors = true; const ls = new THREE.LineSegments(g, m); scene.add(ls, labs); pathMap = { ls, m, labs };
}
// ───────── 毎こま
const tmpC = new THREE.Color();
W.onFrame((dt, t, a) => {
  tit.userData.animate?.(t, false); uv.position.copy(tit.position); uvK = Math.max(uvK * Math.exp(-dt * .5), sub[0].lit); uv.children.forEach((l, k) => l.material.opacity = Math.min(1, uvK * (1.1 - k * .2))); uv.scale.setScalar(1.6);
  const hv = RM ? 0 : 1;
  bee.position.copy(beeHome).add(new V3(Math.sin(t * .9) * .05 * hv, .045 + Math.sin(t * 1.7) * .015 * hv, Math.cos(t * .7) * .04 * hv)); bee.rotation.y = Math.sin(t * .5) * .8; bee.userData.state = "fly"; bee.userData.animate?.(t, "hover");
  if (t > 2.6 && !sub.some(o => o.openT)) { const s = sub[1]; s.lit = Math.max(s.lit, .22 + .22 * Math.sin((t - 2.6) * 2.2)); }   // はじめの誘い：まだ何も触れていないあいだ、真ん中の球がゆっくり息をする
  for (const s of sub) {
    s.m.position.copy(s.at());
    s.open += ((s.openT ? .34 : 0) - s.open) * (1 - Math.exp(-dt * 1.8)); s.m.material.uniforms.uOpen.value = s.open;
    s.lit *= Math.exp(-dt * 2.4); s.m.material.uniforms.uLit.value = s.lit; s.m.scale.setScalar(1 + s.lit * .05);
  }
  // 日差し（気温）は 9 秒ごとに記録計へ（記録計の窓がひらいていれば）
  // 全体の形：ひらいた窓の数だけ、低い持続音が一段ずつ厚くなる（窓ごとの声部の高さ）
  padT -= dt; const nOpen = sub.filter(o => o.openT).length; if (nOpen && padT < 0 && performance.now() / 1000 > quietUntil) { padT = 6.4; sub.filter(o => o.openT).forEach((o, i) => { snd.drone(o.f / 4, 6.6, { gain: .05 + .012 * nOpen, wet: .85, at: i * .4 }); snd.drone(o.f / 2, 6.6, { gain: .025 + .008 * nOpen, wet: .9, at: i * .4 + .2 }); }); }   // ひらいた主体の高さを積んだ和音
  const sn = sub[3]; skyT -= dt; if (sn.openT && skyT < 0) { skyT = 9; sendPulse(SKY, sn, .6); }
  const yp = you.at(); youRing.position.set(yp.x, .03, yp.z); you.lit *= Math.exp(-dt * 2.4);
  youRing.userData.mat.opacity = lerp(youRing.userData.mat.opacity, Math.max(youTarget, .8 * ss(.5, .85, a)) * (.55 + you.lit * .4), 1 - Math.exp(-dt * 1.5));
  let k = 0;
  // 11-06 二版の後：はじめの誘い（触れる前）。シジュウカラの声の光がミツバチの球へ向かい、球の面で止まって消える＝窓のない世界を、触れなくても一度見せる
  ghostT -= dt; if (!sub.some(o => o.openT) && ghostT < 0 && t > 2.2) { ghostT = 8.5; const A = sub[0].at(), B = sub[1].at(), mid = A.clone().lerp(B, .5); mid.y += .35; const curve = new THREE.QuadraticBezierCurve3(A, mid, B); pulses.push({ curve, u: 0, du: 1.1 / curve.getLength(), from: sub[0], to: sub[1], gain: .25, col: new THREE.Color(sub[0].col), ghost: true }); sub[0].lit = Math.max(sub[0].lit, .6); }
  for (let i = pulses.length - 1; i >= 0; i--) { const p = pulses[i]; p.u += p.du * dt;
    if (p.ghost) { if (p.curve.getPointAt(Math.min(1, p.u)).distanceTo(p.to.at()) < p.to.r * .98 || p.u >= 1) { pulses.splice(i, 1); p.to.lit = Math.max(p.to.lit, .75); } continue; }
    if (p.u >= 1) { pulses.splice(i, 1); arrive(p); } }
  for (const p of pulses) { const tail = p.ghost ? 7 : 1; for (let j = 0; j < tail && k < NP; j++) { const u = p.u - j * .022; if (u < 0) break; const q = p.curve.getPointAt(Math.min(1, u)); pPos.set([q.x, q.y, q.z], k * 3); tmpC.copy(p.col).multiplyScalar((.6 + p.gain) * (1 - j / tail)); pCol.set([tmpC.r, tmpC.g, tmpC.b], k * 3); k++; } }   // 誘いの光は尾を引く
  for (let i = k; i < NP; i++) pPos.set([0, -50, 0], i * 3);
  pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
  for (const tr of traces) { tr.life = Math.max(.18, tr.life - dt / 50); tr.m.opacity = tr.life * .75; }
  for (const k in links) links[k].opacity = .12 + .5 * ss(.2, .8, a);
  if (!pathMap && a > .3) buildPathMap();
  if (pathMap) { const k = ss(.45, .85, a); pathMap.m.opacity = .32 * k; pathMap.ls.visible = k > .003; pathMap.labs.visible = k > .003; for (const sp of pathMap.labs.children) sp.material.opacity = .92 * k; }
  if (soilLine) soilLine.m.opacity = Math.max(.25, soilLine.m.opacity - dt / 40);
  if (aoiSpots && aoiA) { const side = a > .55 ? 1 : a < .35 ? 0 : aoiSide; if (side !== aoiSide) { aoiSide = side; aoiA.walkTo(aoiSpots[side]); } }   // 縦長：軸に合わせて碧が立つ所へ歩く
});
AMK.done = Math.round(performance.now() - T0);
window.__app = { sub, you, get stage() { return stage; }, tapSub, W };
