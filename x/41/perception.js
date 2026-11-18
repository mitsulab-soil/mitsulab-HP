/* Qualia/perception（P ── 知覚）2026-11-19
   φ = f( P, E, M ) の P。参道を歩いたまま、受けとり方を切りかえる。
   中身：sight（生き物の目）・sound（言葉を聴く）・oto（書の音）・touch（触れる）・gaze（問う）・scale（時と大きさ）。
   色・音・大きさはどれも、出典で確かめた事実にもとづく模式（くわしくは各モードの＋）。 © mitsulab. All rights reserved. */
import { createWorld } from "../hub/engine/engine.js?v=29";

/* 札の言葉（ここ一か所で差し替える。sound の札は本人の確認待ち） */
const LABEL = { sight: "見る", sound: "言葉を聴く", oto: "書の音", touch: "触れる", gaze: "問う", scale: "時と大きさ" };

const W = await createWorld({ title: "Qualia/perception", def: { sym: "P", text: "知覚" }, haze: "#8e98a8" });
const { THREE, scene, say } = W;
let shown = null; const groups = {}; const grp = id => groups[id] || (groups[id] = (() => { const g = new THREE.Group(); g.visible = id === shown; scene.add(g); return g; })());
const show = id => { shown = id; Object.keys(groups).forEach(k => groups[k].visible = k === id); };   /* あとから作った組も、いまの受けとり方なら見せる */

/* ── sight：生き物の目（色の受けとり方の模式） ── */
const LENS = [
  { label: "ひと", m: null, cap: "ひと：色を受けとる細胞は三種類（三色型）。", info: { title: "ひとの目", body: "網膜の錐体は三種類で、およそ 420・534・564 nm に感度の山があります。", src: "Dartnall, Bowmaker & Mollon (1983) Proc. R. Soc. Lond. B 220: 115–130" } },
  { label: "ミツバチ", eye: .95, blur: .5, vig: .1, m: [.22, .9, .12, .02, .38, .85, .04, .12, .42],   /* Qualia/sight と同じ（感度の山からの近似） */ cap: "ミツバチ：紫外・青・緑の三種類。赤は暗く、細かいものはぼやける。花の中心の輪は、紫外で見える蜜のしるし（模式）。", info: { title: "ミツバチの目", body: "受けとる色の山は紫外（約 344 nm）・青（約 436 nm）・緑（約 544 nm）。赤への感度は低く、画面では赤みを抑えて示しています。紫外そのものは画面では出せません（模式）。", src: "Peitsch et al. (1992) J. Comp. Physiol. A 170: 23–40" } },
  { label: "イヌ", eye: .5, vig: .08, m: [.74, .44, 0, .82, .35, 0, 0, .33, .86], blur: .3,   /* 二色型（赤と緑を一つの黄の軸に寄せ、青はのこす。Viénot ほか 1999 の近似） */   /* Qualia/sight と同じ */ cap: "イヌ：色を受けとる細胞は二種類（二色型）。赤と緑を分けにくい（模式）。", info: { title: "イヌの目", body: "錐体は二種類（約 429 nm と 555 nm）。赤と緑の見分けが難しく、細かいものの見え方も人より粗いとされます。", src: "Neitz, Geist & Jacobs (1989) Visual Neuroscience 3: 1–8" } },
  { label: "距離の目（機械）", m: null, mono: 1, vig: 0, depth: true, cap: "距離センサー（機械）：近いものほど明るく、遠いものほど暗く受けとる（模式）。色は受けとらない。", info: { title: "機械の受けとり方：距離", body: "距離を測る機械（LiDAR など）は、色ではなく、光が返ってくるまでの時間から一点ずつの距離を受けとります。画面では、近いほど明るく遠いほど暗い模式にしています。機械が「感じている」わけではなく、受けとり方の違いです。" } },
  { label: "マムシ", eye: .25, m: [.8, 0, 0, 0, .8, 0, 0, 0, .8], mono: .55, vig: .3, cap: "マムシ：熱（赤外線）を受けとるのは目ではなく、目と鼻の穴のあいだのピット器官。", info: { title: "マムシのピット器官", body: "ピットの薄い膜が、温かいものから出る赤外線を受けとります。ピットの像は目の像に重なって受けとられるとされます。画面では、目の像（少し淡く）の上に、温かいもの（ここでは碧の体）を橙の光として重ねる模式にしています。実際の温度は測っていません。", src: "Goris, R. C. (2011) Journal of Herpetology 45(1): 2–14／Gracheva et al. (2010) Nature 464: 1006–1011" } }];
/* なぜ、そう見えるの？（Qualia/sight の典拠つきの説明をそのまま使う） */
const WHYK = ["hito", "hachi", "inu", "", "hebi"]; let WHY = null;
const loadWhy = () => WHY ? Promise.resolve(WHY) : new Promise(ok => { const sc = document.createElement("script"); sc.src = "../02/data/why.js"; sc.onload = () => ok(WHY = window.WHY); sc.onerror = () => ok(null); document.head.appendChild(sc); });
function whyHTML(k) { const w = WHY && WHY[k]; if (!w) return ""; const li = a => (a || []).map(x => "<li>" + String(x).replace(/[<>]/g, "") + "</li>").join("");
  return "<h3 style='font-size:14px;font-weight:400;margin-top:10px'>受けとれる信号</h3><ul style='padding-left:1.1em'>" + li(w.body) + "</ul><h3 style='font-size:14px;font-weight:400'>どうして分かるのか</h3><ul style='padding-left:1.1em'>" + li(w.how) + "</ul>" + (w.unknown ? "<h3 style='font-size:14px;font-weight:400'>まだ分からないこと</h3><ul style='padding-left:1.1em'>" + li(w.unknown) + "</ul>" : "") + "<p class='src'>" + (w.refs || []).join("<br>") + "</p><p class='src'>" + (WHY.note || "") + "</p>"; }
let cmp = false; const cmpBtn = W.btn("tr", "くらべる", () => { cmp = !cmp; W.setSplit(cmp); cmpBtn.setAttribute("aria-pressed", cmp); say(cmp ? "左がひとの目、右がいまの生き物の目です。" : "くらべるを止めました。", 3000); }, "ひとの目と並べてくらべる"); cmpBtn.hidden = true;
W.on("mode", d => { cmpBtn.hidden = !(d.id === "sight" && d.sub > 0); if (cmpBtn.hidden && cmp) { cmp = false; W.setSplit(false); } if (d.id === "sight") loadWhy().then(() => { const h = whyHTML(WHYK[d.sub]); if (h) W.info.insertAdjacentHTML("beforeend", "<div class='qp-why'>" + h + "</div>"); }); });
W.addMode({ id: "sight", label: LABEL.sight, name: "sight", icon: "eye", subs: LENS.map(l => ({ label: l.label, info: l.info })),
  enter(w, s) { const l = LENS[s]; show("sight"); w.keepAoi = s === 1 || s === 2; w.setEye(l.eye || 1.55); w.setColor(l.m, { blur: l.blur, mono: l.mono, vig: l.vig }); w.fogLock = !!l.depth; W.depthLens = !!l.depth;   /* 距離の目では碧をそっと外す（機械は人の姿でなく距離だけを受けとる） */ if (l.depth) { w.scene.fog.color.set("#000"); w.scene.background = new THREE.Color("#000"); w.setFog(1, 60); w.scene.fog.color.set("#0a0a0a"); } say(l.cap, 7000);
    flowers().visible = s !== 4; flowers().children.forEach(f => f.userData.ring.visible = s === 1);   /* ミツバチ：花の中心の紫外の模様（蜜標）が浮かぶ（模式） */
    warm(s === 4); } });
/* 参道わきの花（白い花びら）。ミツバチの目では、中心に紫外の輪の模様が見える（模式） */
let flw = null; function flowers() { if (flw) return flw; flw = new THREE.Group(); grp("sight").add(flw); const pet = new THREE.MeshLambertMaterial({ color: "#f1efe6" }), ringM = new THREE.MeshBasicMaterial({ color: "#2060ff", toneMapped: false })   /* 紫外の模様は、ミツバチの目の写しでは青の通り道に出る（Qualia/sight と同じ写し方） */, cen = new THREE.MeshLambertMaterial({ color: "#e8c64a" });
  for (let i = 0; i < 70; i++) { const g = new THREE.Group(); const sd = Math.random() < .5 ? -1 : 1; g.position.set(sd * (2.1 + Math.random() * 1.2), .08 + Math.random() * .12, 6 - Math.random() * 40);
    for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.CircleGeometry(.05, 10), pet); m.rotation.x = -Math.PI / 2; m.position.set(Math.cos(k * 1.256) * .05, 0, Math.sin(k * 1.256) * .05); g.add(m); }
    const c = new THREE.Mesh(new THREE.CircleGeometry(.028, 12), cen); c.rotation.x = -Math.PI / 2; c.position.y = .002; g.add(c);
    const r = new THREE.Mesh(new THREE.RingGeometry(.03, .075, 16), ringM); r.rotation.x = -Math.PI / 2; r.position.y = .003; r.visible = false; g.add(r); g.userData.ring = r; g.scale.setScalar(1.8); flw.add(g); } return flw; }
flowers();
/* マムシ：体温のあるもの（碧）が明るく浮かぶ（ピット器官の受けとりの模式） */
function warm(on) { const v = W.aoi.vrm; if (!v) return; const hot = warm.m || (warm.m = new THREE.MeshBasicMaterial({ color: "#ff9a3c", fog: false, transparent: true, opacity: .82 })); v.scene.traverse(o => { if (!o.isMesh) return; if (on) { if (!o.userData.m0) o.userData.m0 = o.material; o.material = hot; } else if (o.userData.m0) { o.material = o.userData.m0; } }); }

/* ── sound：言葉を聴く（言葉の題の音を、参道に浮かぶ光の点で） ── */
let words = []; const pts = [];
const loadWords = async () => { if (words.length) return; try { const [d, h] = await Promise.all([fetch("../07/data/sounds.json").then(r => r.json()), fetch("../07/data/hidden.js").then(r => r.text())]);
  const hid = new Set((h.match(/\[([\d,\s]+)\]/) || [, ""])[1].split(",").map(Number)); words = d.items.filter(it => !hid.has(it.n)).map(it => ({ ...it, t: it.t.replace(/(?:の音){2,}$/, "の音") })); } catch (e) { console.warn("words", e); }
  const g = grp("sound"), geo = new THREE.SphereGeometry(.045, 10, 8), cv = document.createElement("canvas"); cv.width = cv.height = 64; { const x = cv.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(.35, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); } const haloT = new THREE.CanvasTexture(cv);   /* 霞に溶けないよう、霞をかけずに小さな芯と淡い光の輪で */
  words.slice(0, 160).forEach((it, i) => { const col = new THREE.Color().setHSL((i * .137) % 1, .7, .72), m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, fog: false, toneMapped: false })); const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloT, color: col, fog: false, toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(.32); halo.raycast = () => {}; m.add(halo);
    m.position.set((Math.random() - .5) * 9, .4 + Math.random() * 2.2, 8 - Math.random() * 60); m.userData.it = it; g.add(m); pts.push(m); }); };
function tone(seed, kind = "word") { const ac = W.audio(); if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain(), f = ac.createBiquadFilter();
  const base = 220 * Math.pow(2, (seed % 24) / 12); o.type = kind === "ink" ? "triangle" : "sine"; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * (kind === "ink" ? .5 : 1.5), t + 1.6);
  f.type = "lowpass"; f.frequency.value = 2400; gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.18, t + .04); gn.gain.exponentialRampToValueAtTime(.001, t + 2.2); o.connect(f).connect(gn).connect(ac.destination); o.start(t); o.stop(t + 2.3); }
function noise(kind) { const ac = W.audio(); if (!ac) return; const t = ac.currentTime, len = ac.sampleRate * 3, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(), g = ac.createGain(); f.type = kind === "wind" ? "bandpass" : kind === "water" ? "lowpass" : "highpass"; f.frequency.value = kind === "wind" ? 500 : kind === "water" ? 900 : 3500; f.Q.value = kind === "wind" ? .6 : 1;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(kind === "rain" ? .12 : .2, t + .6); g.gain.linearRampToValueAtTime(0, t + 3); s.connect(f).connect(g).connect(ac.destination); s.start(t); }
const NATURE = [["光の点", null], ["雨", "rain"], ["水", "water"], ["風", "wind"]];
W.addMode({ id: "sound", label: LABEL.sound, name: "sound", icon: "ear", subs: NATURE.map(n => ({ label: n[0], info: { title: "言葉を聴く", body: "光の点の一つひとつが、言葉の題の音です。触れると、その言葉から組み立てた音（合成）が鳴ります。雨・水・風は、その音の手ざわりを合成で模した音です（録音ではありません）。" } })),
  async enter(w, s) { show("sound"); w.setColor(null); w.setEye(1.55); await loadWords(); if (s) { w.unlockAudio(); noise(NATURE[s][1]); say(NATURE[s][0] + "の音（合成の模式）", 4000); } else say("光の点に触れると、その言葉の音が鳴ります。", 6000); } });

/* ── oto：書の音（書が参道に立ち、触れると鳴る） ── */
let works = null; const plaques = [];
const loadWorks = async () => { if (works) return; try { works = (await fetch("../28/data/works.json").then(r => r.json())).works.slice(0, 10); } catch (e) { works = []; }
  const g = grp("oto"), tl = new THREE.TextureLoader(); works.forEach((wk, i) => { tl.load("../28/" + (wk.orig || wk.src), t => { t.colorSpace = THREE.SRGBColorSpace; if (wk.orig) { t.repeat.set(.9, .74); }   /* 紙の写真の上の小さな印字は切りとる（題は字幕と目録に文字で出す） */ const a0 = wk.orig ? (wk.ow || 300) / (wk.oh || 300) : (wk.w || 300) / (wk.h || 300), a = wk.orig ? a0 * .9 / .74 : a0, h = W.mobile ? .9 : 1.3;   /* 紙の原本の写真（スマホは小さく） */
      /* 紙の地（生成り）に墨の書。参道の両脇に、目の高さで立てる */
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(h * a + .16, h + .16), new THREE.MeshLambertMaterial({ color: "#efe8d8", side: THREE.DoubleSide }));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(h * a, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, color: "#ffffff", toneMapped: false })); m.position.z = .01;
      const sd = i % 2 ? 1 : -1, holder = new THREE.Group(); holder.add(paper, m); holder.position.set(sd * 2.3, 1.45, 1 - i * 5); holder.lookAt(-sd * 10, 1.45, 1 - i * 5 + 3);   /* 道の手前を向く（字が鏡に映らない） */ g.add(holder);
      paper.userData.wk = m.userData.wk = wk; plaques.push(paper, m); }); }); };
const OTO = { id: "oto", label: LABEL.oto, name: "oto", icon: "brush", subs: [], info: { title: "書の音", body: "「〇〇の音」と書いた書が、参道の両脇に立っています。書に触れると、その字から組み立てた音（合成）が鳴ります。", src: "書の作品：mitsulab" },
  async enter(w, s) { show("oto"); w.setColor(null); w.setEye(1.55); await loadWorks(); const i = Math.min(s || 0, works.length - 1); if (i < 0) return; const sd = i % 2 ? 1 : -1, z = 1 - i * 5;
    /* 選んだ書の前に立つ。碧は道の反対側へ（スマホで額を隠さない） */
    w.setView({ position: [sd * .3, w.eye(), z + (w.mobile ? 4.2 : 2.6)], lookAt: [sd * 2.3, 1.45, z] }); w.setAoi && w.setAoi({ pos: [-sd * (w.mobile ? 1.1 : 1.5), 0, z + (w.mobile ? 1.6 : .8)], lookAt: [sd * .3, 1.5, z + 3] });
    say("「" + (works[i].title || "") + "」── 書に触れると、その字の音が鳴ります。", 8000); },
  exit() { W.follow && W.follow(); } };
W.addMode(OTO); loadWorks().then(() => { OTO.subs = works.slice(0, 8).map(wk => { const t = (wk.title || "書").replace(/の音$/, ""); return { label: t.length > 7 ? t.slice(0, 6) + "…" : t }; });   /* 札は短く（題の全文は字幕に） */ });   /* 選ぶ札＝書の題（読みこめたら並ぶ） */

/* ── touch：触れる（足もとの面の手ざわりを、振動と音で） ── */
const SURF = { road: { name: "砂利（参道）", vib: [12, 30, 12, 30, 12], f: 3800 }, soil: { name: "土（並木の根もと）", vib: [40], f: 600 } };
/* 手ざわりの見本（Qualia/touch と同じ CC0 の写真・実寸 10 cm を切り出したもの）。目の前の一枚の面に貼り、押すとその凹凸を振動と音で返す */
const MATS = [["足もと", null], ["樹皮（ケヤキ）", "bark", [8, 20, 8, 20, 8, 40]], ["土（畑の土）", "soil", [40]], ["石（岩の肌）", "stone", [25, 15, 25]], ["苔", "moss", [70]], ["木の板（杉）", "wood", [15, 35, 15]], ["布（麻）", "cloth", [10, 10, 10, 10, 10]], ["金属（錆の鉄板）", "metal", [6, 50, 6]], ["落ち葉", "leaves", [12, 18, 30, 18, 12]]];
let panel = null;
W.addMode({ id: "touch", label: LABEL.touch, name: "touch", icon: "hand", subs: MATS.map(m => ({ label: m[0], info: { title: "触れる", body: "押すと、その面の手ざわりを、振動（対応する端末のみ）と音で返します。手ざわりそのものではなく、凹凸を移した模式です。見本の面は実寸 10 cm の写真（CC0）です。", src: "見本の表面：Poly Haven（CC0）ほか、Qualia/touch と同じ" } })),
  enter(w, s) { show("touch"); w.setColor(null); w.setEye(1.55); const m = MATS[s]; const g = grp("touch");
    if (!m[1]) { if (panel) panel.visible = false; say("地面を押すと、その面の手ざわりが返ってきます。", 6000); return; }
    if (!panel) { panel = new THREE.Mesh(new THREE.BoxGeometry(.42, .42, .03), new THREE.MeshStandardMaterial({ roughness: .9 })); const rim = new THREE.Mesh(new THREE.BoxGeometry(.46, .46, .02), new THREE.MeshStandardMaterial({ color: "#3a3128", roughness: .8 })); rim.position.z = -.02; panel.add(rim); g.add(panel);   /* 板に厚みと縁 */ }
    new THREE.TextureLoader().load("../10/tex/" + m[1] + "_c.webp", t => { t.colorSpace = THREE.SRGBColorSpace; panel.material.map = t; panel.material.needsUpdate = true; });
    new THREE.TextureLoader().load("../10/tex/" + m[1] + "_n.webp", t => { panel.material.normalMap = t; panel.material.needsUpdate = true; });
    const c = w.camera, f = new THREE.Vector3(); c.getWorldDirection(f); f.y = 0; f.normalize(); const rgt = new THREE.Vector3(-f.z, 0, f.x); panel.position.copy(c.position).addScaledVector(f, W.mobile ? 2 : 1.1).addScaledVector(rgt, W.mobile ? -.25 : -.38); panel.position.y = c.position.y - (W.mobile ? .05 : .12);   /* 小さめの見本を、手もとの左下に（道と碧を隠さない） */ panel.lookAt(c.position.x, panel.position.y, c.position.z); panel.visible = true; panel.userData.m = m;
    say(m[0] + "：面を押すと、手ざわりが返ってきます。", 6000); } });

/* touch：見本の凹凸を、立体（STL）で手もとに保存する（Qualia/touch の高さの画像から。どこにも送らない） */
const stlBtn = W.btn("tr", "立体で保存", () => { const m = panel && panel.userData.m; if (!m || !m[1]) return; const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => {
    const N = 96, c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d"); x.drawImage(im, 0, 0, N, N); const d = x.getImageData(0, 0, N, N).data, H = (i, j) => d[(j * N + i) * 4] / 255 * 4 + 2, sz = 100 / (N - 1);
    const out = ["solid qualia_touch"]; const tri = (a, b, c2) => out.push("facet normal 0 0 0\nouter loop\nvertex " + a.join(" ") + "\nvertex " + b.join(" ") + "\nvertex " + c2.join(" ") + "\nendloop\nendfacet");
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) { const p = (a, b2) => [a * sz, b2 * sz, H(a, b2)]; tri(p(i, j), p(i + 1, j), p(i + 1, j + 1)); tri(p(i, j), p(i + 1, j + 1), p(i, j + 1)); }
    const q = (a, b2) => [a * sz, b2 * sz, 0]; tri(q(0, 0), q(N - 1, N - 1), q(N - 1, 0)); tri(q(0, 0), q(0, N - 1), q(N - 1, N - 1));
    for (let k = 0; k < N - 1; k++) { const sides = [[[k, 0], [k + 1, 0]], [[N - 1, k], [N - 1, k + 1]], [[k + 1, N - 1], [k, N - 1]], [[0, k + 1], [0, k]]]; sides.forEach(([[a1, b1], [a2, b3]]) => { tri([a1 * sz, b1 * sz, 0], [a2 * sz, b3 * sz, 0], [a2 * sz, b3 * sz, H(a2, b3)]); tri([a1 * sz, b1 * sz, 0], [a2 * sz, b3 * sz, H(a2, b3)], [a1 * sz, b1 * sz, H(a1, b1)]); }); }
    out.push("endsolid qualia_touch"); const a2 = document.createElement("a"); a2.href = URL.createObjectURL(new Blob([out.join("\n")], { type: "model/stl" })); a2.download = "qualia_touch_" + m[1] + "_100mm.stl"; a2.click(); setTimeout(() => URL.revokeObjectURL(a2.href), 3000); say("凹凸を 100 mm 角の立体（STL）で保存しました（端末の中だけ）。", 4000); };
  im.src = "../10/tex/" + m[1] + "_h.webp"; }, "この手ざわりの凹凸を立体（STL）で保存"); stlBtn.hidden = true;
W.on("mode", d => { stlBtn.hidden = !(d.id === "touch" && d.sub > 0); });
/* sound：一覧から選んで聴く */
const listBtn = W.btn("tr", "一覧", async () => { await loadWords(); W.info.innerHTML = "<h2>言葉の一覧</h2><p class='src'>押すと、その言葉から組み立てた音（合成）が鳴ります。</p>" + words.slice(0, 160).map(it => "<button class='qe-btn qp-w' data-n='" + it.n + "' style='margin:3px;min-height:36px;font-size:13px'>" + String(it.t).replace(/[<>]/g, "") + "</button>").join(""); W.info.hidden = false;
  W.info.querySelectorAll(".qp-w").forEach(b => b.onclick = () => { W.unlockAudio(); const it = words.find(x => x.n == b.dataset.n); tone(it.n); say(it.t, 5000, "言葉から組み立てた音（合成）"); }); }, "言葉の一覧"); listBtn.hidden = true;
W.on("mode", d => { listBtn.hidden = d.id !== "sound"; });
/* gaze：音をとる（その場の音を 5 秒、端末の中だけに録る。どこにも送らない） */
const recBtn = W.btn("tr", "音をとる", async () => { try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); const r = new MediaRecorder(st), ch = []; r.ondataavailable = e => ch.push(e.data);
  r.onstop = () => { st.getTracks().forEach(t => t.stop()); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(ch, { type: r.mimeType })); a.download = "qualia_gaze_oto.webm"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); say("5 秒の音を保存しました（端末の中だけ）。", 4000); };
  r.start(); say("5 秒、まわりの音をとっています。", 5000); setTimeout(() => r.stop(), 5000); } catch (e) { say("マイクが使えませんでした。", 3000); } }, "まわりの音を 5 秒とって保存（端末の中だけ）"); recBtn.hidden = true;
W.on("mode", d => { recBtn.hidden = d.id !== "gaze"; });
/* oto：目録（書の一覧から選ぶと、その書の前へ歩く） */
const mokBtn = W.btn("tr", "目録", async () => { await loadWorks(); W.info.innerHTML = "<h2>書の目録</h2><p class='src'>押すと、その書の前へ歩きます。</p>" + works.map((wk, i) => "<button class='qe-btn qp-k' data-i='" + i + "' style='margin:3px;min-height:36px;font-size:13px'>「" + String(wk.title || "").replace(/[<>]/g, "") + "」</button>").join(""); W.info.hidden = false;
  W.info.querySelectorAll(".qp-k").forEach(b => b.onclick = () => { const i = +b.dataset.i, sd = i % 2 ? 1 : -1; W.setView({ position: [sd * .3, W.eye(), 1 - i * 5 + (W.mobile ? 4.2 : 2.6)], lookAt: [sd * 2.3, 1.45, 1 - i * 5] });   /* スマホは額から少し離れて、額を画面の上半分に収める */ W.info.hidden = true; say("「" + (works[i].title || "") + "」の前へ。", 3000); }); }, "書の目録"); mokBtn.hidden = true;
W.on("mode", d => { mokBtn.hidden = d.id !== "oto"; });
/* touch：渡す（選んだ手ざわりを、短い文字の札にして写す。受けとる人は札を貼ると同じ見本になる。どこにも送らない） */
const giveBtn = W.btn("tr", "渡す", async () => { const m = panel && panel.visible && panel.userData.m; if (!m) { say("先に、見本を一つ選んでください。", 3000); return; } const code = "QT-" + m[1]; try { await navigator.clipboard.writeText(location.origin + location.pathname + "?m=touch&s=" + MATS.findIndex(x => x === m)); say("この手ざわりの札（" + code + "）を写しました。相手に貼ってもらうと、同じ見本がひらきます。", 5000); } catch (e) { say("札：" + code + "（写せませんでした）", 5000); } }, "選んだ手ざわりを人に渡す（リンクを写す）"); giveBtn.hidden = true;
W.on("mode", d => { giveBtn.hidden = !(d.id === "touch" && d.sub > 0); });
/* ── gaze：問う（場所に一つの問いを置き、歩いて確かめる） ── */
const Q = ["土の道と、わきの土。踏む音はどこで変わる？", "いちばん暗い木陰は、どこ？", "風は、どちらから来る？", "足もとで、いちばん小さな生き物は？"]; let qi = 0;
W.addMode({ id: "gaze", label: LABEL.gaze, name: "gaze", icon: "ask", info: { title: "問う", body: "問いを一つ持って歩きます。答えは画面の外、あなたの足もとと耳にあります。右下のカメラで、見つけた所を一枚残せます（画像は端末の中だけ）。" },
  enter(w) { show("gaze"); w.setColor(null); w.setEye(1.55); say(Q[qi], 0, "問いを押すと、次の問いへ"); } });

/* ── scale：時と大きさ（目の高さを、指数で移る） ── */
const EYES = [["虫の目 2 cm", .02, "地面すれすれ。砂利の一粒が岩に見える高さ"], ["人の目 1.6 m", 1.55, "ふだんの目の高さ"], ["梢の上 40 m", 40, "並木の梢より上。道が一本の線になる"], ["空 800 m", 800, "参道は町の中の細い緑の帯"]];
/* 時の速さ：下の横の帯をなぞると、1 倍（いま）から 10 万倍まで。日が動き、昼と夜が移る（模式） */
const tbar = document.createElement("div"); tbar.id = "qpTime"; tbar.hidden = true; tbar.setAttribute("role", "slider"); tbar.setAttribute("aria-label", "時の速さ"); tbar.innerHTML = '<i></i><b></b><span>時の速さ　1 倍（いま）</span><span id="qpTv"></span><span>10 万倍</span>';
document.body.appendChild(tbar); const st2 = document.createElement("style"); st2.textContent = '#qpTime{position:fixed;left:50%;transform:translateX(-50%);top:170px;width:min(420px,calc(100% - 140px));height:44px;z-index:22;touch-action:none;cursor:ew-resize}#qpTime i{position:absolute;left:0;right:0;top:21px;height:2px;background:rgba(238,245,251,.55)}#qpTime b{position:absolute;top:12px;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:#f2cf8c}#qpTime span{position:absolute;top:-4px;font:500 12px/1 "Hiragino Mincho ProN",serif;color:#fff;text-shadow:0 0 2px #03060f,0 0 6px #03060f,0 0 14px rgba(3,6,15,.85)}#qpTime span:nth-of-type(1){left:0}#qpTime span:nth-of-type(2){left:50%;transform:translateX(-50%)}#qpTime span:nth-of-type(3){right:0}@media (max-width:520px){#qpTime{top:166px;left:16px;transform:none;width:calc(100% - 150px)}}'   /* スマホは字幕の上に（重ならない） */; document.head.appendChild(st2);
const tk = tbar.querySelector("b"), tv = tbar.querySelector("#qpTv"); const setT = f => { f = Math.max(0, Math.min(1, f)); const k = 10 ** (f * 5); W.setTimeScale(k); tk.style.left = f * 100 + "%"; tv.textContent = k < 1.5 ? "" : Math.round(k).toLocaleString() + " 倍の速さ"; };
let tdrag = false; const tat = x => { const r = tbar.getBoundingClientRect(); return (x - r.left) / r.width; };
tbar.addEventListener("pointerdown", e => { tdrag = true; tbar.setPointerCapture(e.pointerId); setT(tat(e.clientX)); e.stopPropagation(); }); tbar.addEventListener("pointermove", e => { if (tdrag) setT(tat(e.clientX)); }); tbar.addEventListener("pointerup", () => tdrag = false);
setT(0);
/* 右端の目盛りを上下になぞると、目の高さが 5 mm から 3 km まで指数で連続に変わる */
const rail = document.createElement("div"); rail.id = "qpRail"; rail.hidden = true; rail.setAttribute("role", "slider"); rail.setAttribute("aria-label", "目の高さ"); rail.innerHTML = '<i></i><b></b><span>1 km</span><span>10 m</span><span>10 cm</span><span>1 mm</span><span></span>';
document.body.appendChild(rail); const st = document.createElement("style"); st.textContent = '#qpRail{position:fixed;right:calc(14px + env(safe-area-inset-right));top:28%;height:44%;width:44px;z-index:22;touch-action:none;cursor:ns-resize}#qpRail i{position:absolute;left:21px;top:0;bottom:0;width:2px;background:rgba(238,245,251,.55)}#qpRail b{position:absolute;left:12px;width:20px;height:20px;border-radius:50%;background:#5cc8e0;margin-top:-10px}#qpRail span{position:absolute;right:46px;font:500 13px/1 "Hiragino Mincho ProN","Yu Mincho",serif;color:#fff;white-space:nowrap;text-shadow:0 0 2px #03060f,0 0 6px #03060f,0 0 14px rgba(3,6,15,.85)}#qpRail span:nth-of-type(1){top:-6px}#qpRail span:nth-of-type(2){top:calc(33.33% - 6px)}#qpRail span:nth-of-type(3){top:calc(66.67% - 6px)}#qpRail span:nth-of-type(4){top:calc(100% - 6px)}#qpRail span:nth-of-type(5){display:none}@media (max-width:520px){#qpRail{top:31%;height:28%}}'   /* スマホは碧（右手前）と重ならないよう左に */; document.head.appendChild(st);
const LMIN = -3, LMAX = 3;   /* 1 mm〜1 km。目盛りは 100 倍ずつ等しい間隔 */ const knob = rail.querySelector("b");
const fmt = h => h < .01 ? (h * 1000).toFixed(0) + " mm" : h < 1 ? (h * 100).toFixed(h < .1 ? 1 : 0) + " cm" : h < 1000 ? (h < 10 ? h.toFixed(1) : h.toFixed(0)) + " m" : (h / 1000).toFixed(1) + " km";
const setH = (h, talk) => { h = Math.max(.001, Math.min(1000, h)); W.setEye(h); if (h > 5) W.setView({ position: [0, h, 6], lookAt: [0, 0, -Math.max(12, h * .9)] });   /* PC は横に広いので、もっと下を向く */   /* 高い目は道の真上から、道の先を見下ろす */ knob.style.top = ((LMAX - Math.log10(h)) / (LMAX - LMIN) * 100) + "%"; if (talk) say("目の高さ " + fmt(h), 1500); };
let drag = false; const at = y => { const r = rail.getBoundingClientRect(); return 10 ** (LMAX - Math.max(0, Math.min(1, (y - r.top) / r.height)) * (LMAX - LMIN)); };
rail.addEventListener("pointerdown", e => { drag = true; rail.setPointerCapture(e.pointerId); setH(at(e.clientY), true); e.stopPropagation(); });
rail.addEventListener("pointermove", e => { if (drag) setH(at(e.clientY), true); }); rail.addEventListener("pointerup", () => drag = false);
W.addMode({ id: "scale", label: LABEL.scale, name: "scale", icon: "scale", subs: EYES.map(e => ({ label: e[0], info: { title: "大きさ", body: "目の高さを、指数で移ります。右の目盛りを上下になぞると、5 mm から 3 km まで連続に変わります。下の横の帯は時の速さで、いま（1 倍）から 10 万倍まで。速くすると日が動き、昼と夜が移ります。いまの高さ：" + e[0] + "。" + e[2] + "。高さと見え方は模式です。" } })),
  enter(w, s) { show("scale"); w.setColor(null); rail.hidden = false; tbar.hidden = false; setH(EYES[s][1]); say(EYES[s][0] + " ── " + EYES[s][2], 6000); }, exit() { rail.hidden = true; tbar.hidden = true; setT(0); W.setEye(1.55); W.aoi.root.visible = true; } });
/* 目の高さが低い（30 cm 未満）ときは碧を見せない（巨人に見えて画面が壊れて見えるため） */
let peb = null; W.on("frame", () => { const mm = new URL(location.href).searchParams.get("m"), sc = mm === "scale"; const low = sc && W.eye() < .3; W.aoi.root.visible = !low && !(W.depthLens && (mm === "sight" || !mm)); W.road.position.y = low ? .004 : .02;
  if (low && !peb) { /* 虫の目：足もとに砂利の粒（数 mm〜2 cm） */ const g = new THREE.SphereGeometry(1, 16, 12), pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const k = 1 + .18 * Math.sin(pp.getX(i) * 5.1 + pp.getZ(i) * 3.7) + .1 * Math.sin(pp.getY(i) * 9.3); pp.setXYZ(i, pp.getX(i) * k, pp.getY(i) * k, pp.getZ(i) * k); } g.computeVertexNormals(); const mt = new THREE.MeshStandardMaterial({ color: "#e2d6bf", roughness: .85, emissive: "#2a241b" }); new THREE.TextureLoader().load("../02/tex/rock_surface.webp", t => { t.colorSpace = THREE.SRGBColorSpace; mt.map = t; mt.needsUpdate = true; }); peb = new THREE.InstancedMesh(g, mt, 900); const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc2 = new THREE.Vector3(), p0 = new THREE.Vector3();
    for (let i = 0; i < 900; i++) { const r = .002 + Math.random() * .009; e.set(Math.random() * 3, Math.random() * 3, 0); q.setFromEuler(e); sc2.set(r * (1 + Math.random() * .6), r * .6, r); const zz = .02 + Math.random() ** 2 * 1.4; p0.set((Math.random() - .5) * (.1 + zz * 1.3), r * .3, -zz);   /* 手前ほど密に（目の前の地面がぼやけた面だけに見えないように） */ M.compose(p0, q, sc2); peb.setMatrixAt(i, M); } peb.frustumCulled = false; scene.add(peb); }
  if (peb) { peb.visible = low; if (low) peb.position.set(W.camera.position.x, 0, W.camera.position.z); } });

/* 触れたもの（光の点・書・地面・問い） */
const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
W.on("tap", e => { const m = new URL(location.href).searchParams.get("m") || "sight"; v2.set(e.x / innerWidth * 2 - 1, -(e.y / innerHeight) * 2 + 1); ray.setFromCamera(v2, W.camera);
  if (m === "sound") { const h = ray.intersectObjects(pts)[0]; if (h) { const it = h.object.userData.it; tone(it.n); say(it.t, 5000, "言葉から組み立てた音（合成）"); h.object.scale.setScalar(2); setTimeout(() => h.object.scale.setScalar(1), 600); } }
  else if (m === "oto") { const h = ray.intersectObjects(plaques)[0]; if (h) { const wk = h.object.userData.wk; tone((wk.title || "").charCodeAt(0) || 7, "ink"); say("「" + (wk.title || "") + "」の音", 5000, "字の形から組み立てた音（合成）"); } }
  else if (m === "touch" && panel && panel.visible && ray.intersectObject(panel)[0]) { const mm = panel.userData.m; try { navigator.vibrate && navigator.vibrate(mm[2]); } catch (x) { } tone(mm[1].length * 5); say(mm[0], 3000, "凹凸を振動と音に移した模式"); }
  else if (m === "touch" && e.point) { const k = Math.abs(e.point.x) < 2 ? "road" : "soil", s = SURF[k]; try { navigator.vibrate && navigator.vibrate(s.vib); } catch (x) { } tone(k === "road" ? 30 : 2); say(s.name, 3000, k === "road" ? "細かく速い粒の手ざわり（模式）" : "やわらかく低い手ざわり（模式）"); }
  else if (m === "gaze" && e.y > innerHeight * .7) { qi = (qi + 1) % Q.length; say(Q[qi], 0, "問いを押すと、次の問いへ"); } });
W.on("mode", d => { if (!(d.id === "sight" && d.sub === 4)) warm(false); if (!(d.id === "sight" && d.sub === 3)) { W.fogLock = false; W.scene.background = new THREE.Color(W.haze); W.scene.fog.color.set(W.haze); } });   /* マムシの熱の像は、マムシのときだけ */
W.on("aoi", () => { if (new URL(location.href).searchParams.get("m") === "sight" && W.sub() === 4) warm(true); });
W.on("frame", ({ t }) => { pts.forEach((p, i) => { p.position.y += Math.sin(t * .8 + i) * .0015; }); });

/* はじまり */
const q = new URL(location.href).searchParams; W.setMode(q.get("m") || "sight", +q.get("s") || 0);
window.__qp = W;
