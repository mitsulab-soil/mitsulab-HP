/* © mitsulab. Qualium 大宮 ── アクターの相互関係（2026-11-13 本人承認）
   環境を、静かに置かれた情報ではなく「受けとって働きかけるアクターどうしの連なり」として動かす。
   ユクスキュルの機能環（知覚世界と作用世界）にならい、どのアクターも 4 つを持つ：
     受けとるもの（senses）・働きかけるもの（acts）・時間の速さ（tau）・いまの状態（state）。
   あるアクターの働きかけが、別のアクターの受けとるものになる。台本は書かず、単純な決まりの重なりだけで動く。
   向きは出典で確かめたものだけ。強さ・数・場所は模式（実測ではない）。出典は「出典・クレジット」に畳む。
   データの役割：端末の時計・太陽の高さ（NOAA の近似＝kit/sunpos.js）・季節の暦・地形と木の配置が最初の状態を決め、
   ずれたら直す（データ同化の考え方）。外の API は使っていない。歩く人の位置・行動は外へ送らず、保存もしない。
   軽さ：見えている範囲（カメラのまわり 72 m 四方・4 m の升）だけを 2 Hz で計算。粒は合わせて 200 前後。 */
import * as THREE from "three";

const AUT = new THREE.Color(0xd8a050), CELL = 4, N = 18, HALF = CELL * N / 2;          // 72 m 四方
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// さいたまの月平均気温（気象庁 平年値 1991–2020・さいたま。丸めた値）
const TA_MONTH = [4.0, 5.0, 8.6, 13.9, 18.9, 22.2, 26.0, 27.2, 23.4, 17.6, 11.6, 6.4];

export const SOURCES = [
  "機能環（知覚世界と作用世界）：J. v. ユクスキュル／G. クリサート『生物から見た世界』日高敏隆・羽田節子 訳（岩波文庫, 2005）",
  "太陽の位置：NOAA Global Monitoring Laboratory「Solar Calculation Details」の近似式",
  "気温の季節：気象庁「平年値（1991–2020）さいたま」",
  "日なたの舗装は高温になり、樹冠の陰で表面温度が下がる：環境省「ヒートアイランド対策ガイドライン 平成24年度版」",
  "ミツバチは気温が低いと採餌を控え、高温では採餌のしかたを変える（向きのみ。陰の花へ寄る強さと、寄りやすい温度 26℃ は模式の値）：B. Heinrich『The Hot-Blooded Insects』(Harvard Univ. Press, 1993)／P. D. Cooper et al. 1985, J. Exp. Biol. 114:1–15",
  "ケヤキの芽吹き・黄葉・落葉の時期、サクラ・ヤツデの花期：『山溪ハンディ図鑑 樹に咲く花』（山と溪谷社, 2000。離弁花 1・2）",
  "ミミズなど土の生き物は土の湿りと温度で活動が変わる（土の生き物から湿りへの働きかけは入れていない。湿りを保つのは落ち葉の働き）：C. A. Edwards & P. J. Bohlen『Biology and Ecology of Earthworms』3rd ed. (Chapman & Hall, 1996)",
  "根が水を吸い、葉から蒸散して空気が湿る：L. Taiz & E. Zeiger『Plant Physiology』3rd ed. (Sinauer, 2002)",
  "夜の灯りに虫が集まる：A. C. S. Owens & S. M. Lewis 2018, Ecol. Evol. 8:11337",
  "街灯のまわりでコウモリが虫を捕り、こだまの間が詰まる：J. Rydell 1992, Funct. Ecol. 6:744–750（別の種の研究。向きのみ）／D. R. Griffin et al. 1960, Anim. Behav. 8:141",
  "アブラコウモリは冬に冬眠する：『日本の哺乳類 改訂2版』（東海大学出版会, 2008）",
  "落ち葉は土の表面からの蒸発を減らして湿りを保ち、土の温度の変化をやわらげ、土の生き物の餌になる：E. J. Sayer 2006, Biol. Rev. 81:1–31／Edwards & Bohlen 1996（落ち葉の量・分解の速さ・強さ、餌の効きがすぐ出ることは模式）",
  "模式（出典で確かめていない決まり）：表示は見る人に近い灯り 4 つだけに虫とこだまを描く（決まりはすべての灯りで同じ）。夜明けの露で土が湿ること、花の温度に地表の温度の升を当てること、灯りに虫が集まる時期（4〜10 月）、コウモリが飛ぶ月の境（4〜10 月）、草の花の時期、梅雨・秋雨のころの湿り。いずれも強さ・時期とも模式",
  "音のセンサーは今は置いていない（テスト開発中）。ここでの記録は模式。灯り（点線の光の柱）・花の場所も模式で、実際の位置ではない",
];

export function attachActors(q, opt = {}) {
  const D = q.D?.(); if (!D || !q.world || !q.camera) return null;
  const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 820;
  const P = new URLSearchParams(location.search);
  const world = q.world, cam = q.camera, gy = (x, z) => { const y = q.groundAt?.(x, z); return Number.isFinite(y) ? y : 8; };
  const OV = {}; const DEV = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);   // 確かめ用の上書き（?act=月-時 例 7-13 ／ ?wet=1）。歩く人の体験の中だけ
  if (DEV) { const a = P.get("act"); if (a) { const [m, h] = a.split("-").map(Number); if (m) OV.month = m; if (Number.isFinite(h)) OV.hour = h; } if (P.get("wet")) OV.wet = +P.get("wet"); }

  /* ── 場の升（受けとるもの・働きかけるものが書きこまれる共有の地） ── */
  const F = { x0: 1e9, z0: 1e9, Ts: new Float32Array(N * N), shade: new Float32Array(N * N), paved: new Uint8Array(N * N), wet: new Float32Array(N * N), lit: new Float32Array(N * N), hum: new Float32Array(N * N), light: new Float32Array(N * N), init: false };
  const cl = D.cl.filter((_, i) => i % 3 === 0);
  const distLine = (x, z) => { let b = 1e9; for (const p of cl) { const e = (p[0] - x) ** 2 + (p[2] - z) ** 2; if (e < b) b = e; } return Math.sqrt(b); };
  let keyaki = [], sakura = [];

  /* ── 街灯（模式の位置：参道の中心線に沿って 40 m ごと・左右交互）。欅の陰の奥には置かない ── */
  const lamps = [];
  { const L = D.cl; let next = L[0][3] + 20, side = 1;
    for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; if (b[3] < next) continue; const tx = b[0] - a[0], tz = b[2] - a[2], l = Math.hypot(tx, tz) || 1; const x = b[0] - tz / l * 4.2 * side, z = b[2] + tx / l * 4.2 * side; lamps.push({ x, z, y: gy(x, z), ins: 0, echo: 0, bat: Math.random() * 6.28 }); side = -side; next += 40; } }
  // 灯りの位置は確かめられる資料が見つからないため模式。柱の 3D は立てず、夜だけ点線の光の柱（デジタルの印）で示す
  const poleM = new THREE.LineDashedMaterial({ color: 0xffd9a0, dashSize: .18, gapSize: .14, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const pv = []; for (const l of lamps) pv.push(l.x, l.y, l.z, l.x, l.y + 3.4, l.z);
  const poleGeo = new THREE.BufferGeometry(); poleGeo.setAttribute("position", new THREE.Float32BufferAttribute(pv, 3));
  const poles = new THREE.LineSegments(poleGeo, poleM); poles.computeLineDistances(); poles.frustumCulled = false; poles.name = "actors_lamps";
  const headM = { emissiveIntensity: 0 }, heads = new THREE.Object3D(); world.add(poles, heads);

  /* ── 花の場所（模式）：春はサクラの樹冠、晩秋〜冬はヤツデ（陰に強い低木）を欅の根元の外側に ── */
  let sd = 4177; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const flowers = [];
  function plant() {   // 木の配置が読みこまれてから一度だけ
    const trees = q.TREE?.list || window.__TREE?.list || []; if (!trees.length) return false;
    keyaki = trees.filter(t => t.sp === "keyaki"); sakura = trees.filter(t => t.sp === "sakura");
  for (const t of sakura) flowers.push({ x: t.x, z: t.z, h: 5 + 3 * rnd(), kind: "sakura" });
    { const L = D.cl; let next = L[0][3];   // 参道の両側 5〜10 m に、6 m ごとの低い花（模式）。陰か日なたかは場の升が決める（種は場所で選ばない）
      for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; if (b[3] < next) continue; next += 6; const tx = b[0] - a[0], tz = b[2] - a[2], l = Math.hypot(tx, tz) || 1;
        for (const sd2 of [-1, 1]) { const o = (5 + 5 * rnd()) * sd2; flowers.push({ x: b[0] - tz / l * o, z: b[2] + tx / l * o, h: .5 + .6 * rnd(), kind: rnd() < .5 ? "yatsude" : "kusa" }); } } }
    return true;
  }

  /* ── 時間と季節（端末の時計＋太陽の高さ） ── */
  function clock() {
    const d = new Date(); const month = OV.month || d.getMonth() + 1, day = d.getDate(), hour = OV.hour ?? (d.getHours() + d.getMinutes() / 60);
    let el = q.sunAE?.[1] ?? 30;
    if (OV.hour != null) el = 62 * Math.sin(Math.PI * (hour - 6) / 12) * (0.55 + 0.45 * Math.cos((month - 6.5) / 6 * Math.PI)) - (hour < 6 || hour > 18 ? 20 : 0);
    const az = OV.hour != null ? 90 + (hour - 6) * 15 : (q.sunAE?.[0] ?? 180);
    const mf = month - 1 + day / 31; const ta0 = TA_MONTH[Math.floor(mf) % 12] * (1 - mf % 1) + TA_MONTH[(Math.floor(mf) + 1) % 12] * (mf % 1);
    const Ta = ta0 + 4.2 * Math.cos((hour - 14) / 24 * 2 * Math.PI);   // 日較差（模式）
    const doy = (month - 1) * 30.4 + day;
    const leaf = smooth(100, 125, doy) * (1 - smooth(310, 340, doy));   // ケヤキの葉：4 月中旬に開き、11 月後半〜12 月に落ちる
    const autumn = smooth(298, 325, doy) * (1 - smooth(345, 360, doy));   // ケヤキの黄葉（11 月）
    const litter = doy >= 300 ? smooth(303, 340, doy) : doy < 160 ? 1 - smooth(60, 160, doy) : 0, falling = smooth(305, 320, doy) * (1 - smooth(338, 352, doy));   // 落ち葉の量（冬に残り夏までに減る＝模式）と、いま落ちている量
    const bloom = { sakura: Math.max(0, 1 - Math.abs(doy - 95) / 14), yatsude: smooth(300, 318, doy) * (1 - smooth(350, 365, doy)) + (doy < 15 ? .5 : 0), kusa: smooth(90, 120, doy) * (1 - smooth(290, 320, doy)) };
    return { month, hour, el, az, Ta, leaf, autumn, litter, falling, bloom, night: el < -6, I: clamp(Math.sin(Math.max(0, el) * Math.PI / 180) * 1.15) };
  }

  /* ── アクター：受けとるもの・働きかけるもの・時間の速さ・いまの状態 ── */
  const A = {
    keyaki: { name: "欅", senses: ["日射", "土の水"], acts: ["陰", "蒸散（空気の湿り）"], tau: "百年（季節で葉）", state: { age: 100, leaf: 0, uptake: 0 } },
    soil: { name: "土（土の生き物）", senses: ["土の湿り", "土の温度"], acts: ["動く音"], tau: "時間〜日", state: { act: 0 } },
    bee: { name: "ミツバチ", senses: ["花", "温度"], acts: ["花へ寄る"], tau: "秒", state: { n: 0, shadeShare: 0 } },
    bat: { name: "コウモリ", senses: ["虫（こだまの返り）"], acts: ["こだま"], tau: "ミリ秒〜秒", state: { rate: 0 } },
    pave: { name: "舗装", senses: ["日射"], acts: ["熱"], tau: "分", state: { hot: 0 } },
    sensor: { name: "音のセンサー", senses: ["音（ミリ秒ごと）"], acts: ["記録を聴こえる高さへ移す"], tau: "ミリ秒", state: { samples: 0, hits: 0 } },
    walker: { name: "歩く人", senses: ["選んだ受けとり方"], acts: ["足音（センサーへ）"], tau: "秒", state: { eye: null } },
    aoi: { name: "碧", senses: ["いま強い連なり"], acts: ["問い一つ"], tau: "分", state: { last: 0, said: {} } },
  };

  /* ── 見せ方：風景から浮かびあがる粒（札・図は出さない） ── */
  const NB = MOBILE ? 28 : 40, NM = MOBILE ? 48 : 72, NS = MOBILE ? 28 : 40, NH = MOBILE ? 20 : 30;
  const dot = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.35, "rgba(255,255,255,.7)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  function pts(n, color, size, blend = THREE.NormalBlending, op = .9) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3).fill(-1e4), 3));
    const m = new THREE.PointsMaterial({ map: dot, color, size, sizeAttenuation: true, transparent: true, opacity: op, depthWrite: false, blending: blend, fog: true });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 3; world.add(p); return p;
  }
  const beeP = pts(NB, 0x6b4a12, MOBILE ? .28 : .2, THREE.NormalBlending, 1), mothP = pts(NM, 0xfff1d6, .28, THREE.AdditiveBlending, .9), soilP = pts(NS, 0xc8f0d8, .18, THREE.AdditiveBlending, .0), mistP = pts(NH, 0xdfeaf0, 1.6, THREE.NormalBlending, 0);
  // 地面の温度（陰の下が冷え、日なたの舗装が熱い）：地表すれすれの粒の色で（熱い＝橙、冷たい＝青緑）。模式
  const tgG = new THREE.BufferGeometry(); tgG.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * N * 3).fill(-1e4), 3)); tgG.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
  const tgM = new THREE.PointsMaterial({ map: dot, size: MOBILE ? 1.8 : 1.6, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const tgP = new THREE.Points(tgG, tgM); tgP.frustumCulled = false; tgP.renderOrder = 2; world.add(tgP);
  const glowM = new THREE.SpriteMaterial({ map: dot, color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const glows = lamps.map(l => { const s = new THREE.Sprite(glowM); s.position.set(l.x, l.y + 3.35, l.z); s.scale.setScalar(3.6); s.visible = false; world.add(s); return s; });
  // 灯りの下の地面の明るみ（夜だけ）：灯りがどこにあるかを、地面から読めるように
  const poolM = new THREE.MeshBasicMaterial({ map: dot, color: 0xffcf8a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, polygonOffset: true, polygonOffsetFactor: -2 });
  const poolG = new THREE.PlaneGeometry(1, 1); poolG.rotateX(-Math.PI / 2);
  const pools = lamps.map((l, i) => { const m = new THREE.Mesh(poolG, poolM); m.position.set(l.x, l.y + .06, l.z); m.scale.setScalar(10); m.visible = false; world.add(m); glows[i].userData.pool = m; return m; });
  // こだまの輪（聴こえないこだまを、目に見える輪に移した模式）
  const ringG = new THREE.RingGeometry(.95, 1, 48);   // 見る人の方を向く輪＝球に広がるこだまの断面
  const rings = Array.from({ length: MOBILE ? 6 : 10 }, () => { const m = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: true })); m.visible = false; m.userData.t = 9; world.add(m); return m; });
  // センサーの小さな灯（記録した瞬間に点る）
  const sensorAt = lamps.length ? lamps[Math.min(2, lamps.length - 1)] : { x: 0, z: 0, y: 8 };
  const led = new THREE.Mesh(new THREE.BoxGeometry(.09, .14, .06), new THREE.MeshStandardMaterial({ color: 0x24292c, emissive: 0x7fe0c0, emissiveIntensity: 0 })); led.position.set(sensorAt.x + .6, sensorAt.y + .5, sensorAt.z); world.add(led);

  const NL = MOBILE ? 300 : 450, NF = MOBILE ? 30 : 46;
  const leafTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"); g.translate(16, 16); g.rotate(.6); g.fillStyle = "#fff"; g.beginPath(); g.ellipse(0, 0, 13, 6, 0, 0, 6.283); g.fill(); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-12, 0); g.lineTo(12, 0); g.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();   // 葉の形（光の玉に見えないように）
  const lgP = pts(NL, 0xa86e34, MOBILE ? .42 : .36, THREE.NormalBlending, 1), lgA = lgP.geometry.attributes.position;   // 積もった落ち葉（模式の粒）
  const lfP = pts(NF, 0xc98a3a, MOBILE ? .42 : .36, THREE.NormalBlending, 0), lfA = lfP.geometry.attributes.position;   // いま落ちている欅の葉
  { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.beginPath(); g.ellipse(16, 16, 9, 6, 0, 0, 6.283); g.fill(); g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(10, 9, 7, 4, -.5, 0, 6.283); g.ellipse(22, 9, 7, 4, .5, 0, 6.283); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; beeP.material.map = t; beeP.material.alphaTest = .3; }   // ミツバチは体と翅の小さな形（光の玉にしない）
  for (const P of [lgP, lfP]) { P.material.map = leafTex; P.material.alphaTest = .4; P.material.transparent = P === lfP; }
  const falls = Array.from({ length: NF }, () => ({ x: 0, y: -1e4, z: 0, g: 0 }));
  const bees = Array.from({ length: NB }, () => ({ x: 0, y: -1e4, z: 0, f: null, ph: rnd() * 6.28, on: false }));
  const moths = Array.from({ length: NM }, (_, i) => ({ l: null, a: rnd() * 6.28, r: .4 + rnd() * 1.4, h: rnd() * 1.4, w: (1.5 + rnd() * 2) * (i % 2 ? 1 : -1) }));
  const soilDots = Array.from({ length: NS }, () => ({ x: 0, z: 0, y: -1e4, t: rnd() * 3 }));

  /* ── 決まり（2 Hz）。向きは出典どおり、強さは模式 ── */
  const LIT = []; let C = clock(), tAcc = 1; F.warm = true; let nearK = [], nearF = [], nearL = [];
  const cellOf = (x, z) => { const i = Math.floor((x - F.x0) / CELL), j = Math.floor((z - F.z0) / CELL); return i >= 0 && j >= 0 && i < N && j < N ? j * N + i : -1; };
  function stepField(dtF) {
    if (!keyaki.length && !plant()) return;
    C = clock(); const cx = cam.position.x, cz = cam.position.z;
    const x0 = Math.round((cx - HALF) / CELL) * CELL, z0 = Math.round((cz - HALF) / CELL) * CELL, moved = x0 !== F.x0 || z0 !== F.z0;
    if (moved) { F.x0 = x0; F.z0 = z0; F.init = false; F.lMove = true; F.hum.fill(0);   /* 升がずれても、範囲の中の落ち葉と霞はそのまま（外れた葉だけ置き直す） */ for (let k = 0; k < N * N; k++) { const x = x0 + (k % N + .5) * CELL, z = z0 + (Math.floor(k / N) + .5) * CELL; F.paved[k] = distLine(x, z) < 4.6 ? 1 : 0; } }
    const R = HALF + 30; nearK = keyaki.filter(t => Math.abs(t.x - cx) < R && Math.abs(t.z - cz) < R); nearF = flowers.filter(f => Math.abs(f.x - cx) < 46 && Math.abs(f.z - cz) < 46); nearL = lamps.filter(l => Math.abs(l.x - cx) < 60 && Math.abs(l.z - cz) < 60);
    // 欅：陰（太陽の向きと高さで、樹冠の影を地面にずらす）。葉の量は季節の暦
    const el = Math.max(8, C.el) * Math.PI / 180, az = C.az * Math.PI / 180, off = 11 / Math.tan(el), ox = -Math.sin(az) * off, oz = Math.cos(az) * off;
    A.keyaki.state.leaf = C.leaf;
    { const P = (q.TREE || window.__TREE)?.protos?.keyaki, au = C.autumn; if (P && Math.abs(au - (F.au ?? -1)) > .02) { F.au = au;   // 欅の黄葉（季節の暦）：近く・中くらいの距離の葉の色を黄褐色へ寄せる
        for (const m of [P.parts?.[1]?.material, P.mid?.[1]?.material]) { if (!m?.color) continue; const o = m.userData.c0 ||= m.color.clone(); m.color.copy(o).lerp(AUT, au * .85); } } }
    const dawn = C.hour > 3 && C.hour < 8 ? 1 - Math.abs(C.hour - 5.5) / 2.5 : 0;
    const wetBase = OV.wet ?? clamp(.32 + .25 * (C.month === 6 || C.month === 7 || C.month === 9 ? 1 : 0) + .25 * dawn);   // 梅雨・秋雨のころと夜明けの露（季節の暦の模式）
    let soilAct = 0, upt = 0, hot = 0, shN = 0, pN = 0, uN = 0;
    for (let k = 0; k < N * N; k++) {
      const x = F.x0 + (k % N + .5) * CELL, z = F.z0 + (Math.floor(k / N) + .5) * CELL;
      let sh = 0; for (const t of nearK) { const r = (t.r || 4.5) * (t.s || 1) * .9 + 2, dx = x - (t.x + ox), dz = z - (t.z + oz); const d2 = dx * dx + dz * dz; if (d2 < r * r) { sh = Math.max(sh, 1 - Math.sqrt(d2) / r * .35); if (sh > .95) break; } }
      sh *= C.leaf * .85 + .1; F.shade[k] = sh;
      // 舗装：日射を受けて熱をもつ（陰の下では弱い）。土の升は湿りで冷える
      const tgt = C.Ta + C.I * (F.paved[k] ? 26 : 14) * (1 - sh * .88) - F.wet[k] * 4 * (F.paved[k] ? 0 : 1);
      F.Ts[k] = F.init ? F.Ts[k] + (tgt - F.Ts[k]) * Math.min(1, dtF / 120) : tgt;   // データで決めた値へ寄せつづける（ずれたら直す）
      if (F.paved[k]) { hot += clamp((F.Ts[k] - 32) / 20); pN++; continue; }
      // 土の生き物：湿りと土の温度で動く
      const lt = F.lit[k] = C.litter * (sh > .2 ? 1 : .3);   // 欅の樹冠の下ほど落ち葉が厚い
      const st = C.Ta - 2 - sh * 4 + 1.5 * lt * (C.Ta < 12 ? 1 : -.5), a = Math.min(1, (1 + .6 * lt) * smooth(.22, .6, F.wet[k]) * smooth(3, 10, st) * (1 - smooth(24, 30, st)));
      F.wet[k] = F.init ? F.wet[k] + (wetBase + .15 * lt - F.wet[k]) * Math.min(1, dtF / 90) : wetBase + .15 * lt;
      // 欅の根：土の水を吸い、葉から蒸散する（日射と葉があるとき） → 空気が湿る。吸った分だけ土は乾く
      const u = sh > .2 ? F.wet[k] * C.leaf * C.I * .6 : 0; F.wet[k] = Math.max(0, F.wet[k] - u * .02 * dtF);
      F.hum[k] += (u * 1.4 + dawn * .35 - F.hum[k]) * Math.min(1, dtF / 40);
      soilAct += a; shN++; if (sh > .2) { upt += u; uN++; }
    }
    { const pa = tgG.attributes.position, ca = tgG.attributes.color; let span = 0;
      for (let k = 0; k < N * N; k++) { const x = F.x0 + (k % N + .5) * CELL, z = F.z0 + (Math.floor(k / N) + .5) * CELL; const near = (x - cx) ** 2 + (z - cz) ** 2 < 49; pa.setXYZ(k, x, near ? -1e4 : gy(x, z) + .12, z);   /* 足もと 7 m は描かない（目の前を覆わない） */ const d = clamp((F.Ts[k] - C.Ta) / 22); span = Math.max(span, d);
        ca.setXYZ(k, .42 + .58 * d, .78 - .2 * d, .82 - .55 * d); }
      pa.needsUpdate = ca.needsUpdate = true; F.tgK = C.I > .25 && span > .25 ? 1 : 0; }
    F.init = true; { let m = 0; for (let k = 0; k < N * N; k++) if (F.hum[k] > m) m = F.hum[k]; F.hm = m; }
    A.soil.state.act = shN ? soilAct / shN : 0; { const c0 = cellOf(cx, cz); let lsum = 0, ln = 0; if (c0 >= 0) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const k = c0 + dj * N + di; if (k >= 0 && k < N * N && !F.paved[k]) { lsum += F.lit[k]; ln++; } } A.keyaki.state.litterHere = ln ? lsum / ln : 0; A.keyaki.state.litter = C.litter; } A.keyaki.state.uptake = uN ? upt / uN : 0; A.pave.state.hot = pN ? hot / pN : 0;
    // 街灯と夜の虫：灯りは夜だけ。虫は暖かい季節に灯りへ集まる（欅の陰の暗がりには集まらない）
    const insectSeason = smooth(10, 16, C.Ta) * (C.month >= 4 && C.month <= 10 ? 1 : .25);
    for (const l of lamps) { const on = C.night ? 1 : 0; l.ins = F.warm ? on * insectSeason : l.ins + (on * insectSeason - l.ins) * Math.min(1, dtF / 30); } F.warm = false;
    // コウモリ：虫の返りが多いほど、こだまの間が詰まる。冬は冬眠（アブラコウモリ）
    const batSeason = C.month >= 4 && C.month <= 10 ? smooth(8, 14, C.Ta) : 0;
    for (const l of lamps) l.echo = C.night ? batSeason * l.ins : 0;
    { const pc = cam.position, c = nearL.filter(l => l.ins > .05).sort((a, b) => ((a.x - pc.x) ** 2 + (a.z - pc.z) ** 2) - ((b.x - pc.x) ** 2 + (b.z - pc.z) ** 2)); LIT.length = 0; for (const l of c.slice(0, 4)) LIT.push(l); }   // 近い灯りから順に（表示の都合で近くの 4 つだけ描く。決まりはすべての灯りで同じ）
    A.bat.state.rate = nearL.reduce((a, l) => Math.max(a, l.echo), 0); sensorAt.echo = sensorAt.echo || 0;
    // ミツバチ：花と温度を受けとる。寒いと飛ばず、表面が熱すぎる日なたの花より、ちょうどよい温度の花へ寄る
    const flyOK = C.el > 2 ? smooth(9, 13, C.Ta) : 0; A.bee.state.n = Math.round(NB * flyOK * Math.min(1, nearF.reduce((a, f) => a + (C.bloom[f.kind] || 0), 0) / 12));
    for (const f of nearF) { const k = cellOf(f.x, f.z), Ts = k >= 0 ? F.Ts[k] : C.Ta; f.ts = Ts; f.sh = k >= 0 ? F.shade[k] : 0; f.w = (C.bloom[f.kind] || 0) * Math.exp(-(((Ts - 26) / 7) ** 2)); }
    let shOn = 0, nOn = 0;
    bees.forEach((b, i) => { b.on = i < A.bee.state.n; if (!b.on) { b.f = null; b.y = -1e4; return; }
      if (!b.f || rnd() < .08 || !nearF.includes(b.f)) { let tot = 0; for (const f of nearF) tot += f.w; let r = rnd() * tot; b.f = null; for (const f of nearF) { r -= f.w; if (r <= 0) { b.f = f; break; } } if (b.f && b.y < -1e3) { b.x = b.f.x + (rnd() - .5) * 8; b.z = b.f.z + (rnd() - .5) * 8; b.y = gy(b.x, b.z) + b.f.h + 1.5; } }
      if (b.f) { nOn++; shOn += b.f.sh > .35 ? 1 : 0; } });
    A.bee.state.shadeShare = nOn ? shOn / nOn : 0;
    // 音のセンサー：ミリ秒ごとに音を受けとる（2 Hz の一回に 500 回分を数える）。こだま・土の音・近くの足音を記録する
    const pc = cam.position, stepMoved = F.lp ? Math.hypot(pc.x - F.lp.x, pc.z - F.lp.z) : 0; F.lp = { x: pc.x, z: pc.z };   // 歩く人の足音（動いた距離だけ。位置は残さない）
    const s = A.sensor.state, dS = Math.hypot(cam.position.x - sensorAt.x, cam.position.z - sensorAt.z);
    s.samples += 500; const hit = (sensorAt.echo || 0) * .8 + A.soil.state.act * .3 + (dS < 9 && stepMoved > .3 ? .6 : 0);
    if (rnd() < hit) s.hits++, s.flash = 1;
    A.walker.state.eye = q.ikimono?.state?.id || (q.mode === "sight" ? "sight" : null);
  }

  /* ── 土の中の音（聴こえる高さに移した模式）：音が出ているとき、近くの土の生き物の動きの密度でかすかに鳴る ── */
  const SND = { ctx: null, g: null, nb: null, next: 0 };
  function soilTick(now) {
    if (!q.soundOn?.() || q.mode !== "walk") return; const ctx = q.sndCtx?.(); if (!ctx || ctx.state !== "running") return;
    if (!SND.g) { SND.g = ctx.createGain(); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2400; bp.Q.value = 3; SND.g.connect(bp); bp.connect(q.sndOut?.() || ctx.destination); SND.nb = ctx.createBuffer(1, ctx.sampleRate * .03, ctx.sampleRate); const d = SND.nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * .18)); SND.g.gain.value = 1; }
    const eyeK = A.walker.state.eye === "tanuki" ? 1.8 : 1, rate = A.soil.state.act * 7 * eyeK;   // 1 秒あたりの小さな音の数
    if (now < SND.next || rate < .05) return; SND.next = now + (-Math.log(1 - Math.random()) / rate) * 1000;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = SND.nb; s.playbackRate.value = .6 + Math.random() * .9; g.gain.value = .018 * eyeK * (.4 + Math.random() * .6); s.connect(g); g.connect(SND.g); s.start();
  }

  /* ── 碧：いま何と何がつながっているかを、問い一つで（答えは言わない） ── */
  const ASK = [
    { id: "kage", s: () => A.bee.state.n > 3 && A.pave.state.hot > .25 && A.bee.state.shadeShare > .55 ? 1 : 0, t: "陰と日なたの花で、ミツバチの寄り方は違うだろうか。", src: SOURCES[4] },
    { id: "hinata", s: () => A.bee.state.n > 2 && A.pave.state.hot < .05 && A.bee.state.shadeShare < .4 ? .7 : 0, t: "いまのミツバチは、どの光の中の花に寄るだろう。", src: SOURCES[4] },
    { id: "tsuchi", s: () => A.soil.state.act > .35 ? A.soil.state.act : 0, t: "土の中の音が変わったのは、何が土に届いたからだろう。", src: SOURCES[6] + "（土の音は聴こえる高さに移した模式）" },
    { id: "ochiba", s: () => A.keyaki.state.litterHere * Math.min(1, A.soil.state.act * 2), t: "落ち葉の下の土は、何が変わっているだろう。", src: SOURCES[11] },
    { id: "kiri", s: () => A.keyaki.state.uptake > .1 ? .8 : 0, t: "この湿った空気は、どこから来たのだろう。", src: SOURCES[7] },
    { id: "kodama", s: () => A.bat.state.rate > .3 ? 1 : 0, t: "こだまが詰まるのは、どの灯りのまわりだろう。", src: SOURCES[9] },
  ];
  // 碧：連なりの強さを 10 秒ごとに覚え、いまその場で「変わった」連なりにだけ問いを一つ（答えは言わない）
  const HIST = {};
  function stepAoi(now) {
    if (q.mode !== "walk" || !keyaki.length) return; const t0 = A.aoi.state.t0 ||= now;
    if (now - (A.aoi.state.snapT || 0) > 10000) { A.aoi.state.snapT = now; for (const a of ASK) { const v = a.s(), h = HIST[a.id] ||= []; if (!h.length) h.push(0); h.push(v); if (h.length > 4) h.shift(); } }
    if (q.voiceBusy?.() || now - A.aoi.state.last < 40000 || now - t0 < 8000) return;
    let best = null, bs = .35; for (const a of ASK) { const h = HIST[a.id]; if (!h || h.length < 2) continue; const d = a.s() - Math.min(...h); if (d > bs && now - (A.aoi.state.said[a.id] || -1e9) > 180000) { bs = d; best = a; } }
    if (!best) return; A.aoi.state.last = now; A.aoi.state.said[best.id] = now; q.caption?.(best.t, best.src, 7000);
  }


  /* ── 毎こま：粒を動かすだけ（計算は 2 Hz の決まりの側） ── */
  const bp = beeP.geometry.attributes.position, mp = mothP.geometry.attributes.position, spA = soilP.geometry.attributes.position, hp = mistP.geometry.attributes.position;
  let T = 0, vis = false;
  function update(dt) {
    const on = q.mode === "walk" || q.mode === "sight"; if (on !== vis) { vis = on; for (const o of [beeP, mothP, soilP, mistP, poles, heads, led, tgP, lgP, lfP]) o.visible = on; if (!on) for (const o of [...glows, ...rings, ...pools]) o.visible = false; }
    if (!on) return; T += dt; const now = performance.now();
    if ((tAcc += dt) >= .5) { stepField(Math.min(tAcc, 2)); tAcc = 0; stepAoi(now); }
    const eye = A.walker.state.eye;
    // ミツバチ（秒の速さ）：選んだ花のまわりを小さく行き来する
    beeP.material.size = (eye === "hachi" ? .45 : .32) * (MOBILE ? 1.4 : 1); beeP.material.opacity = eye && eye !== "hachi" ? .45 : .92;
    bees.forEach((b, i) => { if (!b.on || !b.f) { bp.setXYZ(i, 0, -1e4, 0); return; } const f = b.f, ty = gy(f.x, f.z) + f.h + .35 * Math.sin(T * 2 + b.ph), tx = f.x + Math.cos(T * 1.7 + b.ph) * .9, tz = f.z + Math.sin(T * 2.3 + b.ph) * .9, k = Math.min(1, dt * 1.6);
      b.x += (tx - b.x) * k; b.z += (tz - b.z) * k; b.y += (ty - b.y) * k; if ((b.x - cam.position.x) ** 2 + (b.z - cam.position.z) ** 2 < 12) { bp.setXYZ(i, 0, -1e4, 0); return; } bp.setXYZ(i, b.x + Math.sin(T * 19 + b.ph) * .05, b.y, b.z + Math.cos(T * 23 + b.ph) * .05); }); bp.needsUpdate = true;
    // 夜の虫：灯りのまわりを回る（灯りの虫の量だけ）
    const lit = LIT;
    for (let i = 0; i < NM; i++) { const m = moths[i]; const l = lit.length ? lit[i % lit.length] : null; if (!l || (i / NM) > l.ins) { mp.setXYZ(i, 0, -1e4, 0); continue; } m.a += m.w * dt; mp.setXYZ(i, l.x + Math.cos(m.a) * m.r, l.y + 2.7 + m.h + .2 * Math.sin(m.a * 3), l.z + Math.sin(m.a) * m.r); } mp.needsUpdate = true;
    tgM.opacity += (F.tgK * (A.walker.state.eye ? .5 : .34) - tgM.opacity) * Math.min(1, dt * .8);
    // 灯り
    const nk = C.night ? 1 : 0; headM.emissiveIntensity += (nk * 2.2 - headM.emissiveIntensity) * Math.min(1, dt); glowM.opacity = headM.emissiveIntensity / 2.2 * .55; poleM.opacity = headM.emissiveIntensity / 2.2 * .5;
    poolM.opacity = glowM.opacity * 1.8; glows.forEach((s, i) => { s.userData.pool.visible = s.visible = nk > 0 && Math.abs(lamps[i].x - cam.position.x) < 120 && Math.abs(lamps[i].z - cam.position.z) < 120; });
    // こだまの輪（コウモリのこだま＝聴こえない音を輪に移した模式）：虫の多い灯りのまわりほど密に
    const ek = eye === "sight" ? 1.6 : 1;
    for (const r of rings) { r.userData.t += dt; const u = r.userData.t / 1.1; if (u < 1) { r.visible = true; r.quaternion.copy(cam.quaternion); r.scale.setScalar(.2 + u * 1.1); r.material.opacity = (1 - u) * .6 * ek; } else r.visible = false; }
    for (const l of lit) { if (l.echo < .05 || (l.x - cam.position.x) ** 2 + (l.z - cam.position.z) ** 2 < 144) continue; l.bat += dt * 1.3; if (rnd() < l.echo * dt * 6 * ek) { const r = rings.find(r => r.userData.t > 1.1); if (r) { r.userData.t = 0; r.position.set(l.x + Math.cos(l.bat) * .8, l.y + 3.3 + Math.sin(l.bat * 1.7) * .4, l.z + Math.sin(l.bat) * .8); /* 灯りのすぐまわり（虫のいる所）から */ if (l === sensorAt) A.sensor.state.flash = 1; } } }
    // 土の生き物の動き：陰の湿った土の上に、かすかに点る（土の中の動きを地表へ移した模式）
    const sa = A.soil.state.act; soilP.material.opacity = Math.min(.8, sa * 1.1) * (eye === "tanuki" ? 1.5 : 1);
    if (sa > .05) for (let i = 0; i < NS; i++) { const s = soilDots[i]; s.t -= dt; if (s.t < 0) { s.t = 1 + rnd() * 2.5; const k = Math.floor(rnd() * N * N); if (F.paved[k] || F.wet[k] < .3 || Math.abs((k % N) - N / 2) > 4 || Math.abs(Math.floor(k / N) - N / 2) > 4) { s.y = -1e4; } else { s.x = F.x0 + (k % N + rnd()) * CELL; s.z = F.z0 + (Math.floor(k / N) + rnd()) * CELL; s.y = gy(s.x, s.z) + .03; } } spA.setXYZ(i, s.x, s.y, s.z); }
    spA.needsUpdate = true;
    // 蒸散で湿った空気：欅の樹冠の下に、うすい霞
    let hi = 0; const hm = F.hm || 0; mistP.material.opacity = Math.min(.28, hm * 1.0);
    if ((F.mT = (F.mT || 0) - dt) < 0) { F.mT = .5; for (let i = 0; i < NH; i++) { const k = Math.floor(rnd() * N * N); if (F.hum[k] > .2 && F.shade[k] > .4) { const x = F.x0 + (k % N + rnd()) * CELL, z = F.z0 + (Math.floor(k / N) + rnd()) * CELL; hp.setXYZ(i, x, gy(x, z) + 1.5 + rnd() * 3, z); hi++; } else hp.setXYZ(i, 0, -1e4, 0); } hp.needsUpdate = true; }
    // センサーの灯
    const s = A.sensor.state; s.flash = Math.max(0, (s.flash || 0) - dt * 3); led.material.emissiveIntensity = s.flash * 2;
    // 落ち葉（地面に積もる粒と、いま落ちている葉）
    // 一度置いた葉は動かさない：升がずれたときに全部を置き直し、そのあとは 4 秒ごとに 3% だけ足し替える
    if (F.init && (F.lMove || (F.lT = (F.lT || 0) - dt) < 0)) { const full = !F.lFull, mv = F.lMove; F.lFull = true; F.lMove = false; if (!mv) F.lT = 4; const lt0 = C.litter, hx = F.x0 + HALF, hz = F.z0 + HALF;
      for (let i = 0; i < NL; i++) { const out = Math.abs(lgA.getX(i) - hx) > 24 || Math.abs(lgA.getZ(i) - hz) > 24; if (!full && !(mv && out) && (mv || rnd() > .03)) continue;
        if (lt0 <= .05 || i / NL > Math.min(1, lt0 * 2.2)) { lgA.setXYZ(i, 0, -1e4, 0); continue; }   // 葉の数は落ち葉の量に比べる
        let put = false; for (let tr = 0; tr < 8 && !put; tr++) { const ci = N / 2 - 6 + Math.floor(rnd() * 12), cj = N / 2 - 6 + Math.floor(rnd() * 12), k = cj * N + ci, lv = F.lit[k] || lt0 * .3;
          if (rnd() < (F.paved[k] ? .35 : 1) * lv / Math.max(lt0, .05)) {   /* 樹冠の下ほど厚い（どこに置くかの割合） */ const x = F.x0 + (ci + rnd()) * CELL, z = F.z0 + (cj + rnd()) * CELL; lgA.setXYZ(i, x, gy(x, z) + .04, z); put = true; } }
        if (!put) lgA.setXYZ(i, 0, -1e4, 0); }
      lgA.needsUpdate = true; }
    const fk = C.falling * (C.el > -6 ? 1 : .5); lfP.material.opacity = Math.min(.95, fk * 1.4);
    for (let i = 0; i < NF; i++) { const f = falls[i]; f.y -= dt * (.55 + .25 * Math.sin(T * 2 + i)); if (f.y < f.g || i / NF > fk) { const t = nearK.length ? nearK[Math.floor(rnd() * nearK.length)] : null; if (!t || i / NF > fk) { lfA.setXYZ(i, 0, -1e4, 0); f.y = -1e4; f.g = 0; continue; } f.x = t.x + (rnd() - .5) * 9; f.z = t.z + (rnd() - .5) * 9; f.g = gy(f.x, f.z); f.y = f.g + 6 + rnd() * 6; } lfA.setXYZ(i, f.x + Math.sin(T * 1.3 + i) * .6, f.y, f.z + Math.cos(T * 1.1 + i) * .6); } lfA.needsUpdate = true;
    soilTick(now);
  }

  { const cr = document.getElementById("credit"); if (cr && !cr.dataset.act) { cr.dataset.act = "1"; cr.textContent += "／アクターの相互関係（受けとるもの・働きかけるものの連なり。向きは出典、強さ・数・場所は模式）：" + SOURCES.join("／"); } }
  const api = { A, F, update, clock: () => C, lamps, flowers, set: o => { Object.assign(OV, o); tAcc = 1; F.init = false; F.warm = true; F.lFull = false; F.lT = .6; }, ask: ASK };
  return api;
}
