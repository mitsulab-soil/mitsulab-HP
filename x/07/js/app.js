/* Qualia/sound（2026-10-14・未公開）
   夕暮れの雑木林の空き地（写実の地）の上に、本人の言葉「音の言然」が点として浮かぶ（事実の点＝一つの点が一つの言葉）。
   分類ごとにゆるく集まるのは作品の上の地図。選ぶと言葉が明朝で出て、その言葉から音を合成して鳴らす（js/synth.js）。
   聴く人のつまみで、同じ一行をその人の側へ鳴らしなおす。入力はどこにも保存・送信しない。 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { applyAtmosphere, fitRenderer } from "../kit/atmosphere.js";
import { WIND, rng, growTree, plantTrees, leafMaterial, barkMaterial, poisson, grassField, groundPlane } from "../kit/vegetation.js";
import { LAYER, lineMaterial } from "../kit/layers.js";
import { QSynth, readingOf, seedOf } from "./synth.js";

import { SoundSpace } from "./sound-space.js";
const D = window.QS_SOUNDS, ITEMS = D.items, TAGS = D.tags;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = id => document.getElementById(id);
// 分類の色（線と点だけに使う。HP の層の色と同じ値）
const TAGC = { uchu: 0xeef5fb, seimei: LAYER.nature, toshi: LAYER.info, kokoro: LAYER.people, kotoba: LAYER.culture, toki: 0x8f9bb4, mizu: 0x3f9fc0, iro: 0xff8fc8, oto: LAYER.aoi };   // 色と光の桃だけは層の色の表の外（九つを見分けるため）
const css = h => "#" + new THREE.Color(h).getHexString();
const tagOf = id => TAGS.find(t => t.id === id);

// ---- 描画の土台
const cv = $("cv");
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, .1, 900);
const fit = fitRenderer(renderer, camera, document.body);
const mobile = fit.mobile, R = rng(1014);
const portrait = () => innerWidth < innerHeight;
const PORT0 = portrait();   // 縦長の画面では、分類の輪を小さく・高さの差を大きくして、画面の幅に収める
const camDist = () => PORT0 ? 17 : 13;
camera.position.set(0, 4.2, camDist());
const controls = new OrbitControls(camera, cv);
controls.target.set(0, 3.1, 0); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 4; controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * .53; controls.minPolarAngle = Math.PI * .22; controls.autoRotate = !RM; controls.autoRotateSpeed = .18; controls.rotateSpeed = .6;
const atm = applyAtmosphere(renderer, scene, "aoi_hour");

// ---- 写実の地：雑木林の空き地（CC0 の写真の質感）
const manager = new THREE.LoadingManager();
manager.onProgress = (_, a, b) => window.MLLoader?.progress(.15 + .7 * a / b);
const TL = new THREE.TextureLoader(manager), tx = (f, srgb = true) => { const t = TL.load("tex/" + f); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
const H = (x, z) => .3 * Math.sin(x * .16 + .6) * Math.cos(z * .14) + .2 * Math.sin((x + z) * .08) + .008 * (x * x + z * z) / 6;
const nature = new THREE.Group(); scene.add(nature);
groundPlane(nature, { size: 300, seg: mobile ? 100 : 150, map: tx("soil_forest.webp"), height: H,
  tint: (x, z) => { const n = Math.sin(x * .7) * Math.sin(z * .6), r = Math.hypot(x, z), m = Math.max(0, Math.min(1, (9 - r) / 5)); const k = .84 + .12 * n;
    return [(.72 * (1 - m) + .58 * m) * k, (.68 * (1 - m) + .74 * m) * k, (.6 * (1 - m) + .46 * m) * k]; } });
const pts = poisson(R, { x0: -75, x1: 75, z0: -75, z1: 75, d: mobile ? 6.6 : 5, tries: mobile ? 2400 : 5200, ok: (x, z) => { const r = Math.hypot(x, z); return r > 18.5 && r < 75; } });
const trees = pts.map(([x, z], i) => growTree(i % 5 === 0 ? "keyaki" : i % 7 === 3 ? "momiji" : "konara", x, z, R, { det: Math.hypot(x, z) < 26, q: mobile ? .65 : 1.1, scale: .95 + R() * .3 }));
for (const t of trees) { const y = H(t.trunk[0], t.trunk[1]) - .05; t.wood.forEach(g => g.translate(0, y, 0)); t.cards.forEach(c => { c[0].y += y; c[2].y += y; }); }
const bark = barkMaterial(tx("bark_zelkova.webp"), { normalMap: tx("bark_zelkova_n.webp", false) });
const barkK = barkMaterial(tx("bark_camphor.webp"), { normalMap: tx("bark_camphor_n.webp", false), color: 0xb4aea4 });
const leaf = leafMaterial(tx("leaf_spray.webp")), leaf2 = leafMaterial(tx("leaf_spray2.webp"));
[leaf.map, leaf2.map].forEach(t => t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping);
[leaf, leaf2].forEach(m => { m.alphaToCoverage = true; });   // 葉の縁をなめらかに（アンチエイリアスと組みで）
plantTrees(nature, trees, { barkMat: { keyaki: bark, konara: barkK, default: bark }, leafMats: { konara: leaf2, keyaki: leaf, default: leaf }, R });
const grass = grassField(nature, R, { count: mobile ? 2600 : 7000, area: 34, ok: (x, z) => { const r = Math.hypot(x, z); return r > 2 && r < 17; } });
{ const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < grass.count; i++) { grass.getMatrixAt(i, m4); m4.decompose(p, q, s); p.y = H(p.x, p.z) - .02; m4.compose(p, q, s); grass.setMatrixAt(i, m4); } grass.instanceMatrix.needsUpdate = true; }

// ---- 言葉の点（一つの点＝一つの言葉）。分類ごとにゆるく集まる（作品の上の地図）
const N = ITEMS.length, BASE = new Float32Array(N * 3), POS = new Float32Array(N * 3), COL = new Float32Array(N * 3), PH = new Float32Array(N * 3);
const centers = {};
TAGS.forEach((t, i) => { const a = i / TAGS.length * Math.PI * 2 + .35, r = (5.4 + (i % 2) * .9) * (PORT0 ? .52 : 1); centers[t.id] = new THREE.Vector3(Math.cos(a) * r, 3.1 + (i % 3 - 1) * (PORT0 ? 1.5 : .7), Math.sin(a) * r); });
const count = {}; ITEMS.forEach(it => count[it.tag] = (count[it.tag] || 0) + 1);
{ const gauss = r => { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  ITEMS.forEach((it, i) => { const r = rng(it.n * 7919), c = centers[it.tag], s = (.55 + Math.sqrt(count[it.tag]) * .07) * (PORT0 ? .7 : 1);
    let x = c.x + gauss(r) * s, y = c.y + gauss(r) * s * .62, z = c.z + gauss(r) * s;
    if (it.tag2) { const c2 = centers[it.tag2]; x += (c2.x - c.x) * .14; y += (c2.y - c.y) * .14; z += (c2.z - c.z) * .14; }   // 二つめの分類のほうへ少し寄る
    y = Math.max(1.3, y);
    BASE.set([x, y, z], i * 3); POS.set([x, y, z], i * 3); const col = new THREE.Color(TAGC[it.tag]); COL.set([col.r, col.g, col.b], i * 3);
    PH.set([r() * 6.3, r() * 6.3, .18 + r() * .22], i * 3); it.i = i; }); }
const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.28, "rgba(255,255,255,.85)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const wGeo = new THREE.BufferGeometry(); wGeo.setAttribute("position", new THREE.BufferAttribute(POS, 3)); wGeo.setAttribute("color", new THREE.BufferAttribute(COL, 3));
// 点の大きさは遠近で変えるが、近くの点が大きなにじみの玉にならないよう、画面の上の大きさに上限をつける
const wMat = new THREE.ShaderMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { map: { value: dotTex }, size: { value: mobile ? .26 : .22 }, scale: { value: 400 }, maxPx: { value: 18 }, opacity: { value: .82 } },
  vertexShader: `uniform float size, scale, maxPx; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = min(size * scale / -mv.z, maxPx); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform sampler2D map; uniform float opacity; varying vec3 vC; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vC * opacity * a, 1.); }` });
const words = new THREE.Points(wGeo, wMat); words.frustumCulled = false; scene.add(words);
// 選んだ点：少し大きな点と、地面までの細い線（その言葉の置き場所）。点の大きさは、いま鳴っている音の大きさに合わせる
const selGeo = new THREE.BufferGeometry(); selGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
const selMat = new THREE.PointsMaterial({ size: .42, map: dotTex, color: 0xffffff, sizeAttenuation: true, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
const sel = new THREE.Points(selGeo, selMat); sel.visible = false; sel.frustumCulled = false; scene.add(sel);
const stemGeo = new THREE.BufferGeometry(); stemGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
const stem = new THREE.LineSegments(stemGeo, lineMaterial(LAYER.aoi, .45)); stem.visible = false; stem.frustumCulled = false; scene.add(stem);
// 地面の輪：選んだ言葉の真下に細い円（音の響きの広がり＝つまみの「遠い」に合わせて大きくなる）
const ringGeo = new THREE.BufferGeometry(); { const a = []; for (let k = 0; k < 96; k++) { const p = k / 96 * Math.PI * 2, q = (k + 1) / 96 * Math.PI * 2; a.push(Math.cos(p), 0, Math.sin(p), Math.cos(q), 0, Math.sin(q)); } ringGeo.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); }
const ring = new THREE.LineSegments(ringGeo, lineMaterial(LAYER.aoi, .3)); ring.visible = false; scene.add(ring);

// ---- 分類の札（HTML。語は間引かない）
const labs = $("labs"), labEls = {};
TAGS.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.className = "lab"; b.style.setProperty("--c", css(TAGC[t.id]));
  b.innerHTML = `${t.ja}<span class="c">${count[t.id] || 0}</span><small>${t.en}</small>`; b.setAttribute("aria-label", `${t.ja}（${count[t.id] || 0}）の一覧をひらく`);
  b.addEventListener("click", () => openList(t.id)); labs.appendChild(b); labEls[t.id] = b; });

const measure = () => { for (const id in labEls) { const el = labEls[id]; el._w = el.offsetWidth; el._h = el.offsetHeight; } };
document.fonts?.ready.then(measure); addEventListener("resize", measure);

// ---- 音
const synth = new QSynth();
let cur = null;
const dials = () => ({ dist: +$("dDist").value / 100, hard: +$("dHard").value / 100, light: +$("dLight").value / 100 });
const setDials = d => { $("dDist").value = Math.round(d.dist * 100); $("dHard").value = Math.round(d.hard * 100); $("dLight").value = Math.round(d.light * 100); };
const FIRST = {dist:.5,hard:.5,light:.5};
const second=new QSynth();let material=null,mixing=false;
const space=new SoundSpace($('spectrum'),synth,second);
function halt(){synth.stop(.06);second.stop(.06);mixing=false;}
function playAs(){if(!cur||cur.quiet)return;halt();synth.play(cur,dials());}
synth.onstate=on=>{$('bPlay').setAttribute('aria-pressed',String(on));};
function mix(){if(!material||!cur||cur.quiet)return;halt();const ctx=synth.ensure();if(!second.ctx){second.attach(ctx);second.lim.disconnect();second.lim.connect(synth.lim);}synth.play(material,dials());second.play(cur,dials());mixing=true;balance();$('mixStatus').textContent=material.t+' ＋ '+cur.t;}
function balance(){const r=+$('mixRatio').value/100;if(synth.out)synth.out.gain.setTargetAtTime(mixing?.9*Math.sqrt(1-r):1.45,synth.ctx.currentTime,.04);if(second.out)second.out.gain.setTargetAtTime(.9*Math.sqrt(r),second.ctx.currentTime,.04);}
$('bPlay').onclick=()=>{playAs();balance();};$('bStop').onclick=()=>{stopTour();halt();};
$('bKeep').onclick=()=>{if(!cur||cur.quiet)return;material={...cur};$('mixStatus').textContent='素材：'+material.t+'。次の音を選んで「二つを合成」。';};
$('bMix').onclick=mix;$('bClearMix').onclick=()=>{material=null;halt();$('mixStatus').textContent='素材を外しました。';};$('mixRatio').oninput=balance;
$('bLong').onclick=()=>{halt();if(cur&&!cur.quiet)synth.play(cur,dials(),{long:true});balance();};
for(const id of ['dDist','dHard','dLight'])$(id).addEventListener('change',()=>{mixing?mix():playAs();balance();});
$('generateForm').onsubmit=e=>{e.preventDefault();const t=$('newSound').value.trim().normalize('NFKC');if(!/^.{1,76}の音$/.test(t)){$('generateNote').textContent='「雨の音」のように、末尾を「の音」にしてください。';return;}
 const old=ITEMS.find(x=>x.t===t);if(old){select(old);return;}
 const rules=[['mizu',/雨|水|川|海|滴|波/],['toshi',/機械|金属|都市|電車|歯車/],['seimei',/木|森|土|鳥|虫|葉|息/],['uchu',/星|宇宙|月|銀河/],['iro',/光|色|虹|青|赤/],['toki',/時間|記憶|過去|未来/],['kotoba',/言葉|文字|声/]];
 const tag=rules.find(([,r])=>r.test(t))?.[0]||'kokoro';const item={n:-(seedOf(t)+1),t,tag,i:0,generated:true};$('newSound').blur();select(item,{fly:false});$('generateNote').textContent='生成しました。入力は保存・送信されません。';};

// ---- 選ぶ
const order = [...ITEMS].sort((a, b) => a.n - b.n);
let target = null;   // カメラの見る先（なめらかに寄る）
function select(it, { fly = true, fromTour = false, audible = true } = {}) {
  if (!fromTour) stopTour();   // 自分で選んだら、順に聴くのは止める
  cur = it; halt(); setDials(FIRST); $('mixStatus').textContent=material?'素材：'+material.t:'音を素材にして、もう一つを選ぶと合成できます。';
  $("sound").hidden = !!it.quiet; $("quiet").hidden = !it.quiet;
  { const rd = it.quiet ? null : readingOf(it); $("readF").hidden = !(rd && rd.hand); $("readF").open = false; if (rd && rd.hand) $("readT").textContent = rd.reading; }   // 手で譜を書いた行だけ、読みの一文を畳んで置く
  const t = tagOf(it.tag);
  $("pNo").textContent = it.generated ? "生成した音" : "No. " + String(it.n).padStart(3, "0");
  $("pTag").textContent = t.ja; $("pTag").style.setProperty("--ml-label-c", css(TAGC[it.tag]));
  $("pLine").textContent = it.t;
  $("pLaw").textContent = "この群れの音の決まり：" + (LAW[it.tag] || "");
  $("panel").hidden = false; $("hint").hidden = true;
  sel.visible = stem.visible = ring.visible = !it.generated;
  $("panel").scrollTop=0;
  if(audible){playAs();balance();}
  if (fly) { const p = new THREE.Vector3().fromArray(POS, it.i * 3); target = portrait() ? p.clone() : p.clone().lerp(new THREE.Vector3(0, 3.1, 0), .25);  controls.autoRotate = false; }
}
function clearSel() { stopTour(); cur = null; halt(); $("panel").hidden = true; $("hint").hidden = false; sel.visible = stem.visible = ring.visible = false; target = new THREE.Vector3(0, 3.1, 0); }
$("bClose").addEventListener("click", clearSel);
addEventListener("keydown", e => { if (e.key === "Escape" && !document.querySelector("dialog[open]") && cur) clearSel(); });
const step = k => { const i = cur ? order.indexOf(cur) : -1; select(order[(i + k + order.length) % order.length]); };
$("bPrev").addEventListener("click", () => step(-1)); $("bNext").addEventListener("click", () => step(1));
// 偶然の一行：はじめの三回は、重い語（死・髑髏・悪魔・恐怖など）を含まない行から選ぶ
const HEAVY = /死|髑髏|悪魔|恐怖|恐ろし|滅|墓|痛|傷|邪|破壊|崩壊|戦/; let randN = 0;
const rand = () => { const pool = randN++ < 3 ? ITEMS.filter(x => !HEAVY.test(x.t) && !x.quiet) : ITEMS; select(pool[Math.floor(Math.random() * pool.length)]); };
$("bRand").addEventListener("click", rand); $("bRand2").addEventListener("click", rand);

// ---- 九つの音の世界を、一行ずつ手渡す（群れの違いを耳で聴きくらべる入口）
const LAW = {   // 群れの音の決まり（やさしい言い方。正は js/world.js の WORLDS）
  uchu: "高い音だけ。ほとんど響かず、ほとんど動かない",
  seimei: "低い音が、息のように 4 秒ごとにふくらむ",
  toshi: "きっちりした高さの音が、拍の格子にそろう",
  kokoro: "あいまいな音程が揺れ、内側にこもる",
  kotoba: "一行の文字の長い短いが、そのまま拍になる",
  toki: "音がだんだん遅くなり、長く消えていく",
  mizu: "音が倍音のあいだをすべり、偶然に降る",
  iro: "どの倍音を明るくするかが、色になる",
  oto: "音が、自分の響きを聴く（遅れの中に遅れ）",
};
const REPS = TAGS.map(t=>[t.id,ITEMS.find(x=>x.tag===t.id&&!x.quiet)?.n]).filter(x=>x[1]!=null);
{ const g = $("worldsG");
  REPS.forEach(([tag, n]) => { const t = tagOf(tag), it = ITEMS.find(x => x.n === n); if (!t || !it) return;
    const b = document.createElement("button"); b.type = "button"; b.style.setProperty("--c", css(TAGC[tag])); b.textContent = t.ja; b.title = LAW[tag]; b.setAttribute("aria-label", `${t.ja}の世界：${it.t}を鳴らす`);
    b.addEventListener("click", () => { stopTour(); select(it); }); g.appendChild(b); }); }
let tour = null;
function stopTour() { if (!tour) return; clearTimeout(tour.timer); tour = null; $("tourCap").hidden = true; $("bTour").textContent = "九つを順に聴く（約 1 分半）"; }
function tourStep(k) {
  if (!tour) return; if (k >= REPS.length) { stopTour(); return; }
  const [tag, n] = REPS[k], it = ITEMS.find(x => x.n === n), t = tagOf(tag);
  select(it, { fromTour: true }); tour.k = k;
  $("tourCap").innerHTML = ""; $("tourCap").append(`${k + 1}／9　${t.ja}の世界`); const sm = document.createElement("small"); sm.textContent = LAW[tag]; $("tourCap").append(sm); $("tourCap").hidden = false;
  const d = synth.cur?.dur ?? 9; tour.timer = setTimeout(() => tourStep(k + 1), (d + .8) * 1000);
}
$("bTour").addEventListener("click", () => { if (tour) { stopTour(); synth.stop(); return; } tour = { k: 0 }; $("bTour").textContent = "■ 止める"; tourStep(0); });
// ---- 点にふれる・押す（画面の上で一番近い点）
const v3 = new THREE.Vector3();
function nearest(cx, cy, maxPx) { let best = -1, bd = maxPx * maxPx; const w = innerWidth, h = innerHeight;
  for (let i = 0; i < N; i++) { v3.fromArray(POS, i * 3).project(camera); if (v3.z > 1) continue; const dx = (v3.x * .5 + .5) * w - cx, dy = (-v3.y * .5 + .5) * h - cy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  return best; }
const tip = $("tip"); let down = null;
cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; controls.autoRotate = false; });
cv.addEventListener("pointerup", e => { if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (moved > 7) return;
  const i = nearest(e.clientX, e.clientY, e.pointerType === "touch" ? 30 : 20); if (i >= 0) select(ITEMS[i]); });
cv.addEventListener("pointermove", e => { if (e.pointerType !== "mouse" || e.buttons) { tip.classList.remove("on"); return; }
  const i = nearest(e.clientX, e.clientY, 18); if (i < 0) { tip.classList.remove("on"); cv.style.cursor = ""; return; }
  const it = ITEMS[i]; tip.innerHTML = `<span class="n">No. ${String(it.n).padStart(3, "0")} · ${tagOf(it.tag).ja}</span>`; tip.append(it.t);
  const x = Math.min(e.clientX + 16, innerWidth - tip.offsetWidth - 12), y = Math.max(70, e.clientY - tip.offsetHeight - 14); tip.style.transform = `translate(${x}px,${y}px)`; tip.classList.add("on"); cv.style.cursor = "pointer"; });
cv.addEventListener("pointerleave", () => tip.classList.remove("on"));

// ---- 一覧
const dList = $("dList"), list = $("list"), chips = $("chips"), q = $("q"); let fTag = null;
{ const all = document.createElement("button"); all.type = "button"; all.dataset.t = ""; all.innerHTML = `すべて <small>${N}</small>`; chips.appendChild(all);
  TAGS.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.dataset.t = t.id; b.style.setProperty("--c", css(TAGC[t.id])); b.innerHTML = `${t.ja} <em>${t.en}</em> <small>${count[t.id] || 0}</small>`; chips.appendChild(b); });
  chips.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; fTag = b.dataset.t || null; renderList(); }); }
function renderList() {
  chips.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.t || null) === fTag)));
  const s = q.value.trim(), rows = order.filter(it => (!fTag || it.tag === fTag) && (!s || it.t.includes(s)));
  $("count").textContent = `${rows.length} の言葉`;
  const frag = document.createDocumentFragment();
  for (const it of rows) { const li = document.createElement("li"), b = document.createElement("button"); b.type = "button"; b.innerHTML = `<span>${String(it.n).padStart(3, "0")}</span>`; b.append(it.t);
    b.addEventListener("click", () => { dList.close(); select(it); }); li.appendChild(b); frag.appendChild(li); }
  list.replaceChildren(frag);
}
q.addEventListener("input", renderList);
function openList(tag = null) { fTag = tag; q.value = ""; renderList(); dList.showModal(); list.scrollTop = 0; }
$("bList").addEventListener("click", () => openList()); $("bList2").addEventListener("click", () => openList());
$("bAbout").addEventListener("click", () => $("dAbout").showModal());
document.querySelectorAll("dialog").forEach(d => { d.querySelector("[data-close]").addEventListener("click", () => d.close()); d.addEventListener("click", e => { if (e.target === d) d.close(); }); });
$("aShown").textContent = N;

// ---- 入口
labs.style.visibility = "hidden";
const start = (fade = true) => { labs.style.visibility = ""; $("intro").classList.add("out"); setTimeout(() => $("intro").hidden = true, fade ? 1100 : 0); $("hint").hidden = false; };
$("bStart").addEventListener("click", () => { synth.ensure(); start(); });
// 見本づくり用：?skip で入口を飛ばす、#8 でその番号の言葉をひらく（音は押すまで鳴らない）
{ const sp = new URLSearchParams(location.search), h = parseInt(location.hash.slice(1), 10);
  if (sp.has("skip")) start(false);
  if (h) { const it = ITEMS.find(x => x.n === h); if (it) { if (!sp.has("skip")) start(false); select(it,{audible:false}); } }
  if (sp.has("still")) controls.autoRotate = false; }

// ---- 波形（いま鳴っている音の形をそのまま線に）
const wave = $("wave"), wctx = wave.getContext("2d"), wbuf = new Float32Array(2048);
function drawWave() {
  const dpr = Math.min(2, devicePixelRatio || 1), w = wave.clientWidth, h = wave.clientHeight; if (!w) return;
  if (wave.width !== Math.round(w * dpr)) { wave.width = Math.round(w * dpr); wave.height = Math.round(h * dpr); }
  wctx.setTransform(dpr, 0, 0, dpr, 0, 0); wctx.clearRect(0, 0, w, h);
  wctx.strokeStyle = synth.playing ? "rgba(155,220,240,.9)" : "rgba(150,170,240,.25)"; wctx.lineWidth = 1; wctx.beginPath();
  if (synth.playing) { synth.wave(wbuf); if(mixing){second.wave(space.wave);for(let i=0;i<wbuf.length;i++)wbuf[i]+=space.wave[i];} for (let x = 0; x <= w; x++) { const v = wbuf[Math.floor(x / w * 1023)] || 0, y = h / 2 - v * h * 1.6; x ? wctx.lineTo(x, y) : wctx.moveTo(x, y); } }
  else { wctx.moveTo(0, h / 2); wctx.lineTo(w, h / 2); }
  wctx.stroke();
}

// ---- 毎こま
let last = performance.now(), run = true, lv = 0, lensY = 0;
document.addEventListener("visibilitychange", () => { run = !document.hidden; if (run) { last = performance.now(); requestAnimationFrame(loop); } });
if (RM) WIND.uGust.value = 0;
const posAttr = wGeo.attributes.position, cen = new THREE.Vector3(0, 3.1, 0);
function loop(now) {
  if (!run) return;
  const dt = Math.min(.05, (now - last) / 1000); fit.frame(now - last); last = now; const t = now / 1000;
  WIND.uTime.value = t; wMat.uniforms.scale.value = renderer.domElement.height / 2; wMat.uniforms.maxPx.value = 16 * fit.pixelRatio;
  if (!RM) { for (let i = 0; i < N; i++) { const a = PH[i * 3], b = PH[i * 3 + 1], w = PH[i * 3 + 2]; POS[i * 3] = BASE[i * 3] + Math.sin(t * w + a) * .13; POS[i * 3 + 1] = BASE[i * 3 + 1] + Math.sin(t * w * .8 + b) * .09; POS[i * 3 + 2] = BASE[i * 3 + 2] + Math.cos(t * w + b) * .13; } posAttr.needsUpdate = true; }
  if (cur && !cur.generated) { const i = cur.i * 3, x = POS[i], y = POS[i + 1], z = POS[i + 2], gy = H(x, z) + .02;
    selGeo.attributes.position.setXYZ(0, x, y, z); selGeo.attributes.position.needsUpdate = true;
    stemGeo.attributes.position.setXYZ(0, x, gy, z); stemGeo.attributes.position.setXYZ(1, x, y, z); stemGeo.attributes.position.needsUpdate = true;
    lv += ((synth.playing ? synth.level() : 0) - lv) * .25; selMat.size = .42 + Math.min(1, lv * 5) * .5;
    const d = dials(); ring.position.set(x, gy, z); ring.scale.setScalar(.5 + d.dist * 2.6 + Math.min(1, lv * 5) * .3); ring.material.opacity = .18 + Math.min(1, lv * 5) * .3; }
  if (target) { controls.target.lerp(target, Math.min(1, dt * 2.2)); if (controls.target.distanceTo(target) < .01) target = null; }
  // 縦長の画面：パネルが下を覆うあいだは、レンズをずらして、見る先（選んだ点）をパネルの上の空きの真ん中に出す
  { const want = cur && portrait() ? Math.max(0, innerHeight - $("panel").getBoundingClientRect().top) * .5 : 0;
    lensY += (want - lensY) * Math.min(1, dt * 3);
    if (lensY > .5) camera.setViewOffset(innerWidth, innerHeight, 0, lensY, innerWidth, innerHeight); else if (camera.view && camera.view.enabled) camera.clearViewOffset(); }
  controls.update();
  // 札の置き場所
  // 札の置き場所（重なったら下の札を下へずらす。語は間引かない）
  const L = [], hintTop = $("hint").hidden ? 1e9 : $("hint").getBoundingClientRect().top, capBottom = $("tourCap").hidden ? -1 : $("tourCap").getBoundingClientRect().bottom;
  for (const id in labEls) { const c = centers[id]; v3.set(c.x, c.y + 1.75, c.z).project(camera); const el = labEls[id];
    const vis = v3.z < 1 && Math.abs(v3.x) < 1.05 && v3.y < .92; const show = vis && !(cur && cur.tag !== id); el.style.opacity = show ? 1 : 0; el.style.pointerEvents = show ? "auto" : "none";   // スマホでは案内や帯に重なる札を出さない
    if (!el._w) { el._w = el.offsetWidth || 120; el._h = el.offsetHeight || 44; }
    L.push({ el, x: (v3.x * .5 + .5) * innerWidth, y: Math.max(70, (-v3.y * .5 + .5) * innerHeight), vis: show }); }
  L.forEach(o => o.x = Math.max(o.el._w / 2 + 6, Math.min(innerWidth - o.el._w / 2 - 6, o.x)));
  L.sort((a, b) => a.y - b.y);
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < L.length; i++) for (let j = 0; j < i; j++) { const a = L[j], b = L[i]; if (!a.vis || !b.vis) continue;
    if (Math.abs(a.x - b.x) < (a.el._w + b.el._w) / 2 + 2 && Math.abs(b.y - a.y) < (a.el._h + b.el._h) / 2) b.y = a.y + (a.el._h + b.el._h) / 2; }
  for (const o of L) { o.el.style.transform = `translate(${o.x}px,${o.y}px) translate(-50%,-50%)`;
    // 押し分けたあとの位置で、案内（スマホ）と「順に聴く」の帯に重なる札を隠す
    if (o.vis && ((portrait() && !cur && o.y + o.el._h / 2 > hintTop - 4) || (tour && o.y - o.el._h / 2 < capBottom + 4))) { o.el.style.opacity = 0; o.el.style.pointerEvents = "none"; } }
  if (cur) {drawWave();space.update(now);}
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
addEventListener("resize", () => { camera.position.setLength(Math.min(controls.maxDistance, camera.position.distanceTo(controls.target))); });
manager.onLoad = () => { window.MLLoader?.done(); };
setTimeout(() => window.MLLoader?.done(), 9000);
requestAnimationFrame(loop);
window.__qs = { renderer, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, pr: fit.pixelRatio, n: N }), select: n => select(ITEMS.find(x => x.n === n)), synth, second, space, get current(){return cur;}, get material(){return material;} };
