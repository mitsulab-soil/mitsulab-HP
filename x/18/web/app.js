/* © mitsulab. All rights reserved.  Qualium まなざし── 江守さんとのワークショップ用（2026-11-03）
   流れ：碧が問いを置く → 自分のスマホで撮る・録る（感覚と「だれの受けとり方で」を選ぶ）→ 3D に層として重ねる → 渡す／受けとる → みんなの層を重ねて・並べて見比べる。
   集めない：サーバーなし。データはこの端末（IndexedDB）にだけ。渡すのは本人が「渡す」を押したファイルだけ。
   写真は canvas で描き直す（EXIF＝位置・機種は残らない）。位置情報・端末情報は取らない。 */
let THREE, GLTFLoader, VRMLoaderPlugin, VRMUtils, MeshoptDecoder; // 3D は操作できるようになってから読む

const $ = id => document.getElementById(id);
const MAX = 9, REC_MAX = 15, MOB = matchMedia("(max-width: 899px)").matches;
const QS = ["いつもは気づかない音は、どこにある？", "手ざわりが、まわりと違う所は？", "ミツバチなら、どこへ向かう？", "スズメなら、どこに降りる？", "タヌキなら、どこを通る？", "あなたの足を止めたものは？"];
/* 2026-11-05：選ぶのは感覚の一段だけ。だれの目かは問いが決める（問いを押すと次の問いへ） */
const QFIT = { 0: ["sound", "hito"], 1: ["touch", "hito"], 2: ["sight", "hachi"], 3: ["sight", "suzume"], 4: ["smell", "tanuki"], 5: ["sight", "hito"] };
const SENSES = [
  { k: "sight", n: "見る", c: "#9bdcf0", d: '<path d="M3 12c2.4-3.9 5.5-5.9 9-5.9s6.6 2 9 5.9c-2.4 3.9-5.5 5.9-9 5.9S5.4 15.9 3 12z"/><circle cx="12" cy="12" r="2.7"/>' },
  { k: "sound", n: "聴く", c: "#b4a2ff", d: '<circle cx="6.6" cy="12" r="1.2"/><path d="M10.4 8.7a4.7 4.7 0 0 1 0 6.6M13.6 6.2a8.2 8.2 0 0 1 0 11.6"/>' },
  { k: "touch", n: "触れる", c: "#f2cf8c", d: '<path d="M8.3 19.6V11a3.7 3.7 0 0 1 7.4 0v8.6"/><path d="M11 18.4v-7.2a1 1 0 0 1 2 0v7.2"/>' },
  { k: "smell", n: "嗅ぐ", c: "#7fe0b4", d: '<path d="M7.6 20c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4M12 19.4c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4M16.4 20c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4"/>' },
  { k: "taste", n: "味わう", c: "#f4aa96", d: '<path d="M4.2 11.6h15.6a7.8 7 0 0 1-15.6 0z"/><path d="M9.6 19.6h4.8"/>' },
  { k: "x", n: "人にない", c: "#a8f2f6", d: '<path d="M11.4 3.8c.6 4.3 3.6 7.4 8 8-4.4.6-7.4 3.7-8 8-.6-4.3-3.6-7.4-8-8 4.4-.6 7.4-3.7 8-8z"/>' },
];
/* だれの受けとり方で。写真の色は「模式」（実際の見え方そのものではない）。
   ミツバチ＝紫外・青・緑の三色で赤は暗い／スズメ＝紫外を含む四色で色の差が大きい／タヌキ＝二色の目。 */
const WHO = [
  { k: "hito", n: "わたし", say: "" },
  { k: "hachi", n: "ミツバチ", say: "ミツバチは、赤が暗く、紫外が見える。カメラに紫外は写らないので、色は模式です。" },
  { k: "suzume", n: "スズメ", say: "鳥は四つの色で見る。色の差を強めた模式です。" },
  { k: "tanuki", n: "タヌキ", say: "タヌキはイヌ科。イヌ科の多くは二つの色で見て、においをよく使うとされる。においは写らないので、においのもとを撮ってください。写真の色は、赤と緑が近づく模式です。" },
];
function lens(k, d) { // d: ImageData.data
  if (k === "hito") return;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (k === "hachi") { const m = .72; d[i] = r * (1 - m) + g * .9 * m; d[i + 1] = g * (1 - m) + b * .95 * m; d[i + 2] = b * (1 - m) + Math.min(255, b * .5 + (r + g + b) / 6) * m; continue; } // 2026-11-04：写真が見えつつ、ミツバチの色と分かる強さ（7 割寄せる模式）
    if (k === "suzume") { const m = (r + g + b) / 3; d[i] = Math.max(0, Math.min(255, m + (r - m) * 1.5)); d[i + 1] = Math.max(0, Math.min(255, m + (g - m) * 1.5)); d[i + 2] = Math.max(0, Math.min(255, m + (b - m) * 1.5 + 6)); }
    else if (k === "tanuki") { const y = (r + g) / 2; d[i] = y * .85; d[i + 1] = y * .85; d[i + 2] = b * .9; }
  }
}
const PALETTE = ["#9bdcf0", "#f2cf8c", "#7fe0b4", "#f4aa96", "#b4a2ff", "#a8f2f6", "#e8d9c0", "#c7e59a", "#f0b8d0", "#9fc3f5"];

/* ---------- 保存（この端末の中だけ） ---------- */
const db = new Promise((ok, ng) => { try { const r = indexedDB.open("manazashi", 1); r.onupgradeneeded = () => r.result.createObjectStore("s"); r.onsuccess = () => ok(r.result); r.onerror = () => ng(r.error); } catch (e) { ng(e); } });
async function put(k, v) { try { const d = await db; return new Promise(ok => { const t = d.transaction("s", "readwrite"); t.objectStore("s").put(v, k); t.oncomplete = ok; t.onerror = ok; }); } catch { } }
async function get(k) { try { const d = await db; return new Promise(ok => { const r = d.transaction("s").objectStore("s").get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }); } catch { return null; } }
const uid = () => Math.random().toString(36).slice(2, 10);
const minute = () => { const d = new Date(); d.setSeconds(0, 0); return d.toISOString(); };

let mine = { v: 1, id: uid(), color: PALETTE[0], q: "", items: [] };
let others = [];
let sense = "sight", who = "hito", view = "stack", qi = 0;

/* ---------- 字幕と問い ---------- */
let subT = 0;
/* 碧の声（VOICEVOX:冥鳴ひまり）。字幕と同時に流す。画面を押すと止まる。鳴らなくても字幕で進む。 */
let VOICE = {}, voice = null;
fetch("web/voice.json").then(r => r.json()).then(j => VOICE = j).catch(() => { });
function hush() { if (voice) { voice.pause(); voice = null; } }
function speak(t) { hush(); const f = VOICE[t]; if (!f) return; try { const a = new Audio(f); voice = a; a.onended = () => { if (voice === a) voice = null; }; a.play().catch(() => { }); } catch { } }
function say(s, ms = 5200, v) { const el = $("sub"); el.innerHTML = s; el.style.opacity = 1; clearTimeout(subT); if (ms) subT = setTimeout(() => el.style.opacity = 0, ms); speak(v || s.replace(/<br>/g, "").replace(/<[^>]+>/g, "")); }
const params = new URLSearchParams(location.search);
/* 2026-11-04 本人：公開の版は共有しない（端末の中だけ）。ワークショップの会場では ?ws=1 の入口で「渡す・受けとる」を出す。 */
const SHARE = params.get("ws") === "1";
document.body.classList.toggle("solo", !SHARE);
function setQ(t, v) { $("qt").textContent = t; mine.q = t; const f = QFIT[QS.indexOf(t)]; if (f) { sense = f[0]; who = f[1]; if ($("sense").firstChild) buildRows(); } if (v) speak(t); const w = WHO.find(x => x.k === who); if (v && !w?.say) { clearTimeout(subT); hush(); $("sub").style.opacity = 0; $("sub").innerHTML = ""; }   // 問いを変えたら前の字幕を残さない
  if (w?.say) { if (v) say(w.say, 9000); else setTimeout(() => { if (mine.q === t) say(w.say, 9000); }, 400); } }   // 2026-11-05：生き物の問いでは「模式」の一言を必ず出す

/* ---------- 下の並び ---------- */
function buildRows() {
  $("sense").innerHTML = SENSES.map(s => `<button data-k="${s.k}" style="--c:${s.c}" aria-pressed="${s.k === sense}"><svg viewBox="0 0 24 24">${s.d}</svg>${s.n}</button>`).join("");
  $("who").innerHTML = WHO.map(w => `<button class="mu-chip" data-k="${w.k}" aria-pressed="${w.k === who}">${w.n}</button>`).join("");
}
const HINT = {"touch": "触れて感じた所を撮ってください。触れるの印が付きます。", "smell": "においのもとを撮るか、そこの音を録ってください。嗅ぐの印が付きます。", "taste": "味わったものを撮ってください。味わうの印が付きます。", "x": "人にない感覚で感じそうな所を撮ってください。その印が付きます。"};
$("sense").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.k !== sense && HINT[b.dataset.k]) say(HINT[b.dataset.k], 0); /* 次の一言まで残す（聞き逃しても読める） */ sense = sense === b.dataset.k && view === "stack" ? sense : b.dataset.k; buildRows(); focusSense = focusSense === sense ? null : sense; layout(); };
$("who").onclick = e => { const b = e.target.closest("button"); if (!b) return; who = b.dataset.k; buildRows(); const w = WHO.find(x => x.k === who); if (w.say) say(w.say); };
function count() { $("cnt").textContent = `あつめた ${mine.items.length}／${MAX}`; document.body.classList.toggle("empty", !mine.items.length && !(others && others.length)); }   // 2026-11-05：まだ何も無いうちは上の並びを控えめに

/* ---------- 3D ---------- */
const cv = $("c");
let R, S, C, sun, items, texL, ray, clk, look; const meshes = new Map(); let aoi = null;
function init3D() {
R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.outputColorSpace = THREE.SRGBColorSpace; R.debug.checkShaderErrors = false;   // 2026-11-03：確かめで止まらない
S = new THREE.Scene(); S.background = new THREE.Color("#0b1622"); S.fog = new THREE.Fog("#0b1622", 5, 17);
C = new THREE.PerspectiveCamera(45, 1, .05, 60);
S.add(new THREE.HemisphereLight("#cfe8ff", "#0a0f18", 1.2)); sun = new THREE.DirectionalLight("#fff4e6", 1.6); sun.position.set(2, 4, 3); S.add(sun);
{ // 地：光の等高線（線と点だけ）
  const g = new THREE.Group();
  for (let i = 1; i <= 9; i++) { const pts = []; for (let a = 0; a <= 96; a++) { const t = a / 96 * Math.PI * 2, r = i * .55 + Math.sin(t * 3 + i) * .04; pts.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: "#5cc8e0", transparent: true, opacity: .22 - i * .018 }))); }
  const P = []; for (let i = 0; i < 900; i++) { const r = Math.sqrt(Math.random()) * 6, t = Math.random() * 6.283; P.push(Math.cos(t) * r, 0, Math.sin(t) * r); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: "#9bdcf0", size: .015, transparent: true, opacity: .5 })));
  S.add(g);
  // 2026-11-09 第2周：足もとに参道の砂利を淡く（写真 CC0・Qualia/sight と同じ。一枚の円だけで軽く）
  new THREE.TextureLoader().load("web/path_gravel.webp", t => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .3, color: "#9aa7ad", depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = -.004; m.renderOrder = -1; S.add(m);
    // 2026-11-10 第4周：奥へ続く参道の砂利の道（場所として感じられるように）
    const t2 = t.clone(); t2.needsUpdate = true; t2.repeat.set(2, 14);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 30), new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: .36, color: "#b9b2a2", depthWrite: false }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, -.002, -11); road.renderOrder = -1; S.add(road); });
  // 両側の並木（幹の影だけ。霧に溶ける）
  { const n = 24, geo = new THREE.CylinderGeometry(.16, .24, 7, 7), mat = new THREE.MeshLambertMaterial({ color: "#2a2620" }), im = new THREE.InstancedMesh(geo, mat, n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, k = Math.floor(i / 2); o.position.set(side * (2.3 + (k % 3) * .35), 3.5, 2 - k * 2.4); o.rotation.set(0, 0, side * .03); o.scale.setScalar(.85 + (k % 4) * .08); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
    S.add(im); }
}
// 2026-11-05：はじめて描く時の止まり（材質の中身の読み出し）を、網一つずつ別のこまに分ける。見えないほど小さくして描き、終わったら元の大きさで出す
const yieldF = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
async function firstUse(root) { const ms = []; root.traverse(o => { if (o.isMesh) { ms.push([o, o.visible]); o.visible = false; } }); const sc = root.scale.x; root.scale.setScalar(1e-3); S.add(root);
  for (const [o, v] of ms) { o.visible = v; await yieldF(); await yieldF(); } root.scale.setScalar(sc); }
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(p => new VRMLoaderPlugin(p)).loadAsync("web/aoi.vrm").then(g => {
  const v = g.userData.vrm; VRMUtils.rotateVRM0?.(v); aoi = v;
  trimMorphs(v);   // 2026-11-04：使う「まばたき」の形だけ残す（はじめの一枚で形の表を全部組むと、スマホで 0.3 秒ほど止まるため）
  const N = n => v.humanoid.getNormalizedBoneNode(n);
  for (const sd of ["left", "right"]) { const sg = sd === "left" ? 1 : -1; N(sd + "UpperArm")?.rotation.set(-.06, sg * .06, sg * -1.3); N(sd + "LowerArm")?.rotation.set(0, sg * -.3, 0); }
  v.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  v.scene.position.set(0, 0, -1.4); return R.compileAsync(v.scene, C, S).catch(() => { }).then(() => firstUse(v.scene));   // 2026-11-03：材質を並列で組んでから出す（止まらない）
}).catch(() => { });
items = new THREE.Group(); S.add(items); texL = new THREE.TextureLoader(); ray = new THREE.Raycaster(); look = new THREE.Vector3(0, 1.05, 0); clk = new THREE.Clock();
resize(); R.compileAsync(S, C).catch(() => { }).then(() => R.setAnimationLoop(frame));   // はじめの一枚で止まらない
}
/* 碧の顔の形（morph）は「まばたき」に使うものだけ残す。ほかの表情の結びは外す（このアプリは表情を使わない） */
function trimMorphs(v) {
  const em = v.expressionManager; if (!em) return;
  const keep = new Map(); // geometry -> Set(index)
  const binds = []; for (const ex of em.expressions) for (const b of ex._binds || []) if (b.primitives && b.index != null) binds.push([ex, b]);
  for (const [ex, b] of binds) if (/^blink/i.test(ex.expressionName)) for (const m of b.primitives) { if (!keep.has(m.geometry)) keep.set(m.geometry, new Set()); keep.get(m.geometry).add(b.index); }
  const remap = new Map();
  v.scene.traverse(o => { const g = o.geometry; if (!o.isMesh || !g || !g.morphAttributes.position) return;
    if (!remap.has(g)) { const ks = [...(keep.get(g) || [])].sort((a, b) => a - b), mp = new Map(ks.map((k, i) => [k, i]));
      for (const a of ["position", "normal", "color"]) if (g.morphAttributes[a]) g.morphAttributes[a] = ks.map(k => g.morphAttributes[a][k]);
      if (!ks.length) g.morphAttributes = {};
      remap.set(g, mp); }
    const mp = remap.get(g); o.morphTargetInfluences = mp.size ? new Array(mp.size).fill(0) : undefined; o.morphTargetDictionary = undefined; o.updateMorphTargets?.(); });
  for (const [ex, b] of binds) { const mps = b.primitives.map(m => remap.get(m.geometry)); const ni = mps[0]?.get(b.index);
    b.index = ni != null && mps.every(mp => mp?.get(b.index) === ni) && /^blink/i.test(ex.expressionName) ? ni : -1; }
}
function frameMat(c) { return new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .9 }); }
function makeObj(it, layer) {
  const g = new THREE.Group(); g.userData = { id: layer.id + ":" + it.id };
  const col = layer.color, sc = SENSES.find(s => s.k === it.sense)?.c || col;
  if (it.kind === "photo") {
    const tex = texL.load(it.data); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, fog: false, toneMapped: false }));
    g.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(.52, .52)), frameMat(col)); g.add(e);
  } else {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.17, .008, 8, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(.05, 20, 14), new THREE.MeshBasicMaterial({ color: sc, transparent: true }));
    g.add(ring, core); g.userData.ring = ring;
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(.42, .42), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
  }
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), new THREE.MeshBasicMaterial({ color: sc })); dot.position.set(0, -.3, 0); g.add(dot); // 感覚の色の点
  { const k = it.kind === "sound" ? "oto" : it.tex ? "te" : "sha", b = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(k), transparent: true, fog: false, depthWrite: false, depthTest: false, sizeAttenuation: false }));   // 2026-11-05 本人：写真・手ざわり・音のどれかを示す小さな印（左上の角）
    b.scale.setScalar(MOB ? .046 : .044); b.renderOrder = 10; g.userData.badge = b; if (it.kind === "photo") b.position.set(-.285, .285, .012); else b.position.set(-.21, .21, .012); g.add(b); }   // 印は角の外側へ少し出す（写真を隠さない）
  g.scale.setScalar(.001); g.userData.s = 1;
  items.add(g); meshes.set(layer.id + ":" + it.id, { obj: g, it, layer, target: new THREE.Vector3(), op: 1 });
}
const BADGE = {};
function badgeTex(k) { if (BADGE[k]) return BADGE[k]; const cv = document.createElement("canvas"); cv.width = cv.height = 96; const x = cv.getContext("2d");
  x.fillStyle = "rgba(6,12,22,.82)"; x.beginPath(); x.arc(48, 48, 44, 0, 7); x.fill(); x.strokeStyle = "rgba(232,239,244,.55)"; x.lineWidth = 2; x.stroke();
  x.save(); x.translate(12, 12); x.scale(3, 3); x.strokeStyle = k === "te" ? "#f2cf8c" : k === "oto" ? "#b4a2ff" : "#e8eff4"; x.lineWidth = 1.5; x.lineCap = x.lineJoin = "round";
  const P = d => x.stroke(new Path2D(d));
  if (k === "sha") { P("M4 8h3l2-3h6l2 3h3v11H4z"); x.beginPath(); x.arc(12, 13, 3.6, 0, 7); x.stroke(); }          // 写真＝カメラ
  else if (k === "te") { P("M10.4 3v10.6a1.6 1.6 0 0 0 3.2 0V3"); P("M4 19h16"); P("M7.4 16.6c-.8.8-1.8 1.2-2.8 1.3M16.6 16.6c.8.8 1.8 1.2 2.8 1.3"); }   // 手ざわり＝面に触れる指先
  else { P("M3 12h2M7 8v8M11 5v14M15 8v8M19 10.5v3M21 12h0"); }                                                      // 音＝波
  x.restore(); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return BADGE[k] = t; }
let tagG = null;
function tagTex(t, c, sub) { const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128; const x = cv.getContext("2d"), F = '"Shippori Mincho","Hiragino Mincho ProN",serif', y = sub ? 88 : 60;   // 2026-11-05：受けとった人の層は「受けとった」＋番号（数字だけだと誰のことか分からないため）
  x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round"; x.strokeStyle = "rgba(6,14,22,.85)";
  if (sub) { x.font = `700 44px ${F}`; x.lineWidth = 8; x.strokeText(sub, 128, 28); x.fillStyle = c; x.fillText(sub, 128, 28); }
  x.font = `700 ${sub ? 58 : 76}px ${F}`; x.lineWidth = 10; x.strokeText(t, 128, y); x.fillStyle = c; x.fillText(t, 128, y); if (c === "#ffffff") { x.fillStyle = "#5cc8e0"; x.fillRect(48, 106, 160, 5); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx; }
function tags(Ls) { if (!THREE) return; if (!tagG) { tagG = new THREE.Group(); S.add(tagG); }
  tagG.clear(); tagG.visible = view === "side"; if (view !== "side") return;
  const n = Ls.length; Ls.forEach((L, li) => { const me = L === mine, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(me ? "あなた" : String(li), me ? "#ffffff" : L.color, me ? "" : "受けとった"), transparent: true, fog: false, depthTest: false }));
    sp.scale.set(.48, .24, 1); sp.position.set((li - (n - 1) / 2) * .62, -.14, .2); tagG.add(sp); }); }
function allLayers() { return [mine, ...others]; }
let focusSense = null;
function layout() { document.body.classList.toggle("empty", !mine.items.length && !others.length);
   if (!THREE) return;
  const Ls = allLayers();
  for (const [id, m] of meshes) if (!Ls.some(L => L.items.some(i => L.id + ":" + i.id === id))) { items.remove(m.obj); meshes.delete(id); }
  Ls.forEach((L, li) => L.items.forEach(it => { if (!meshes.has(L.id + ":" + it.id)) makeObj(it, L); }));
  Ls.forEach((L, li) => L.items.forEach((it, ii) => {
    const m = meshes.get(L.id + ":" + it.id);
    if (view === "stack") { // 重ねる：感覚ごとに方角、人ごとに高さ。同じ感覚がみんなで一つの帯になる
      const si = SENSES.findIndex(s => s.k === it.sense), a = Math.PI * (si % 2 === 0 ? .97 - .12 * (si >> 1) : .03 + .12 * (si >> 1)) + (ii % 3 - 1) * .08 + (li % 4 - 1.5) * .04; // 写真の感覚（見る・触れる…）と音を碧の左右に分け、輪と写真を重ねない（まん中は碧のために空ける）
      const r = 1.25 + (li % 3) * .3; m.target.set(Math.cos(a) * r, .55 + (li % 6) * .2 + (ii % 2) * .1, Math.sin(a) * r * .55 - .2);
    } else { // 並べる：一人一列（下から上へ。並びは置いた順）。列の下に名札（あなた／2・3…）
      const n = Ls.length, x = (li - (n - 1) / 2) * .62, y = .35 + ii * .56;
      m.target.set(x, y, .2);
    }
    m.op = view === "side" || !focusSense || it.sense === focusSense ? 1 : .5; // 選んだ感覚を少し前に。ほかも見える明るさに残す
  }));
  
  tags(Ls); aimC();
}
/* カメラ（ドラッグで回す・ピンチ／ホイールで寄る） */
let yaw = 0, pitch = .12, dist = 4.6, ending = false;
function aimC() { // 画面の縦横に合わせて、全部が入る距離へ
  const Ls = allLayers(), tf = Math.tan(C.fov * Math.PI / 360);
  if (view === "side") { const W = Ls.length * .62 + .4, H = Math.max(...Ls.map(L => L.items.length), 1) * .56 + .4; look.set(0, .35 + H / 2 - .3 - H * .18, 0); dist = Math.max(W / 2 / (tf * C.aspect), H / 2 / tf * 1.6) + 1; /* 下の操作の並びにかからない高さへ */ }
  else { look.set(0, 1.05, 0); dist = Math.max(4.6, 2.2 / (tf * C.aspect) + 1.6); }
  S.fog.near = dist + 1; S.fog.far = dist + 11; } // 縦長で遠く引いても、碧と層がかすまない
function place() { C.position.set(look.x + Math.sin(yaw) * Math.cos(pitch) * dist, look.y + Math.sin(pitch) * dist, look.z + Math.cos(yaw) * Math.cos(pitch) * dist); C.lookAt(look); }
const ptr = new Map(); let downAt = null, pinch0 = 0;
cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); downAt = [e.clientX, e.clientY, performance.now()]; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
cv.addEventListener("pointermove", e => { const p = ptr.get(e.pointerId); if (!p) return;
  if (ptr.size === 2) { ptr.set(e.pointerId, [e.clientX, e.clientY]); const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); dist = Math.min(14, Math.max(2.2, dist * pinch0 / d)); pinch0 = d; return; }
  yaw -= (e.clientX - p[0]) * .006; pitch = Math.min(1.1, Math.max(-.1, pitch + (e.clientY - p[1]) * .004)); ptr.set(e.pointerId, [e.clientX, e.clientY]); });
cv.addEventListener("pointerup", e => { ptr.delete(e.pointerId); if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 8 && performance.now() - downAt[2] < 400) tap(e); downAt = null; });
cv.addEventListener("pointercancel", e => ptr.delete(e.pointerId));
cv.addEventListener("wheel", e => { e.preventDefault(); dist = Math.min(14, Math.max(2.2, dist * (1 + e.deltaY * .001))); }, { passive: false });
let near = null, playing = null;
function tap(e) {
  if (!R) return;
  ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), C);
  const h = ray.intersectObjects(items.children, true)[0]; if (!h) { near = null; pick(null); return; }
  let o = h.object; while (o.parent !== items) o = o.parent; const m = meshes.get(o.userData.id);
  const sn = SENSES.find(s => s.k === m.it.sense)?.n, wn = WHO.find(w => w.k === m.it.who)?.n;
  if (m.it.kind === "sound") { playing?.a.pause(); const a = new Audio(m.it.data); a.play().catch(() => { }); playing = { a, id: o.userData.id }; a.onended = () => playing = null; }
  else near = near === o.userData.id ? null : o.userData.id;
  pick(m.layer === mine ? m.it.id : null);
  say(`${sn}${wn && m.it.who !== "hito" ? "・" + wn + "の受けとり方" : ""}${m.layer === mine ? "（あなた）" : ""}`, 2600);
}
/* 自分の一つを選んで外せる（渡すのは残したものだけ） */
function pick(id) { let b = $("bDel"); if (!id) { b?.remove(); return; }
  if (!b) { b = document.createElement("button"); b.className = "mu-btn"; b.id = "bDel"; b.textContent = "外す"; $("act").appendChild(b); }
  b.onclick = async () => { mine.items = mine.items.filter(i => i.id !== id); near = null; await put("mine", mine); count(); layout(); pick(null); say(SHARE ? "外しました。渡すときにも入りません。" : "外しました。", 2400); }; }
function resize() { if (!R) return; R.setSize(innerWidth, innerHeight, false); C.aspect = innerWidth / innerHeight; C.updateProjectionMatrix(); aimC(); }
addEventListener("resize", resize);
$("c").addEventListener("pointerdown", hush);
let blink = 2;
function frame() {
  const dt = Math.min(clk.getDelta(), .05), t = clk.elapsedTime; if (ending && !ptr.size) yaw += dt * .12; place();
  if (aoi) aoi.scene.visible = view === "stack";
  if (aoi) { const sp = aoi.humanoid.getNormalizedBoneNode("spine"); if (sp) sp.rotation.x = Math.sin(t * 1.6) * .012; const hd = aoi.humanoid.getNormalizedBoneNode("head"); if (hd) hd.rotation.y = Math.sin(t * .3) * .08;
    blink -= dt; const em = aoi.expressionManager; if (em) { em.setValue("blink", blink < .12 ? 1 : 0); if (blink < 0) blink = 2 + Math.random() * 3; } aoi.update(dt); }
  for (const m of meshes.values()) { const o = m.obj, big = near === o.userData.id;
    const tg = big ? C.position.clone().lerp(look, .55).setY(look.y + .1) : m.target; o.position.lerp(tg, 1 - Math.exp(-dt * 5));
    const s = (big ? 2.2 : 1) * (playing?.id === o.userData.id ? 1 + Math.sin(t * 8) * .08 : 1); o.scale.lerp(new THREE.Vector3(s, s, s), 1 - Math.exp(-dt * 6));
    o.quaternion.slerp(C.quaternion, 1 - Math.exp(-dt * 6));
    o.traverse(c => { if (c.material && c.material.visible !== false) { c.material.transparent = true; c.material.opacity += ((m.op) - c.material.opacity) * (1 - Math.exp(-dt * 6)); } });
    if (o.userData.badge) o.userData.badge.visible = view === "side";   // 印は並べたカードに（重ねると重なって読めないため）
    if (o.userData.ring) o.userData.ring.rotation.z = t * .6; }
  R.render(S, C);
}

/* ---------- 撮る（窓の中だけ。許さなくても写真を選んで参加できる） ---------- */
let stream = null, vid = null, vraf = 0;
const vc = $("vc"), vx = vc.getContext("2d", { willReadFrequently: true });
function drawLens(src, w, h, size) { const s = Math.min(w, h); vc.width = vc.height = size; vx.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, size, size); const im = vx.getImageData(0, 0, size, size); lens(who, im.data); vx.putImageData(im, 0, 0); }
function full() { if (mine.items.length >= MAX) { say(`ひとり ${MAX} つまで。よいものを選んで残しましょう。`); return true; } return false; }
let texMode = false;   // 2026-11-05 本人：三つ目の「手ざわり」＝触れた面を寄って撮る接写（触れるの印）
async function openCam(tex) {
  if (full()) return; texMode = tex === true;
  say(texMode ? "触れた面に、寄って撮ってください。手ざわりの印が付きます。" : "写真は、この端末の中だけに残ります。人の顔は写さないでください。", 0);
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false }); }
  catch { say("カメラを使わずに、写真を選んで参加できます。"); $("pic").click(); return; }
  vid = document.createElement("video"); vid.playsInline = true; vid.muted = true; vid.srcObject = stream; await vid.play().catch(() => { });
  $("win").classList.add("on"); document.body.classList.add("cam"); const w = WHO.find(x => x.k === who); $("vlab").textContent = texMode ? "手ざわり（寄って撮る）" : who === "hito" ? "" : w.n + "（模式）";
  const loop = () => { if (vid.videoWidth) drawLens(vid, vid.videoWidth, vid.videoHeight, 360); vraf = requestAnimationFrame(loop); }; loop();
}
function closeCam() { cancelAnimationFrame(vraf); stream?.getTracks().forEach(t => t.stop()); stream = null; $("win").classList.remove("on"); document.body.classList.remove("cam"); $("sub").style.opacity = 0; }
function addPhoto(src, w, h) { drawLens(src, w, h, 640); const o = { kind: "photo", data: vc.toDataURL("image/jpeg", .82) }; if (texMode) { o.sense = "touch"; o.tex = 1; } texMode = false; add(o); }
$("bShot").onclick = () => openCam(false);
$("bTex").onclick = () => openCam(true);
$("bSnap").onclick = () => { if (vid) addPhoto(vid, vid.videoWidth, vid.videoHeight); closeCam(); };
$("bCancel").onclick = () => { texMode = false; closeCam(); };
$("win").onclick = e => { if (e.target.id === "win") closeCam(); };
$("pic").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; try { const b = await createImageBitmap(f); addPhoto(b, b.width, b.height); } catch { say("この写真は読めませんでした。"); } };

/* ---------- 録る（最長 15 秒・押すと止まる） ---------- */
let rec = null, recT = 0, recTimer = 0;
$("bRec").onclick = async () => {
  if (rec) { rec.stop(); return; }
  if (full()) return;
  let s; try { s = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { say("マイクなしでも、写真で参加できます。"); return; }
  const mt = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || "";
  rec = new MediaRecorder(s, mt ? { mimeType: mt, audioBitsPerSecond: 48000 } : {}); const ch = [];
  rec.ondataavailable = e => e.data.size && ch.push(e.data);
  rec.onstop = () => { s.getTracks().forEach(t => t.stop()); clearInterval(recTimer); $("bRec").classList.remove("rec"); $("cnt2").textContent = ""; const dur = Math.round((performance.now() - recT) / 100) / 10;
    const fr = new FileReader(); fr.onload = () => add({ kind: "sound", data: fr.result, dur }); fr.readAsDataURL(new Blob(ch, { type: rec.mimeType || mt })); rec = null; };
  rec.start(); recT = performance.now(); $("bRec").classList.add("rec");
  say("人の話し声は入れないでください。入ったら、押して「外す」で消せます。", 0);
  recTimer = setInterval(() => { const left = REC_MAX - Math.floor((performance.now() - recT) / 1000); $("cnt2").textContent = left + "秒"; if (left <= 0) rec?.stop(); }, 200);
};

async function add(o) {
  const it = { id: uid(), t: minute(), sense: o.kind === "sound" && sense === "sight" ? "sound" : sense, who, ...o }; if (o.tex) it.who = "hito";
  mine.items.push(it); await put("mine", mine); count(); layout();
  say(mine.items.length === 1 ? "あなたの層が、ひとつ重なりました。" : `層に重ねました（${mine.items.length}）。`, 2800, "層に重ねました。");
}

/* ---------- 渡す（ファイル一つ。共有の画面か保存） ---------- */
$("bGive").onclick = async () => {
  if (!SHARE) return; flash("bGive");
  if (!mine.items.length) { say("まだ層が空です。撮るか録ってから渡せます。"); return; }
  const name = `まなざし_${mine.id}.json`, blob = new Blob([JSON.stringify(mine)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: "まなざしの層" }); say("渡しました。このファイルは手元の保存にもなります。"); return; } catch (e) { if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  say("層をファイルに保存しました。AirDrop・ニアバイシェア・LINE・メールなどで、運営へ送ってください。");
};

/* ---------- 受けとる（運営の端末・大画面）。押すかファイルを置く ---------- */
function valid(L) { return L && L.v === 1 && typeof L.id === "string" && Array.isArray(L.items) && L.items.length <= MAX && L.items.every(i => typeof i.data === "string" && i.data.length < 3e6 && ((i.kind === "photo" && /^data:image\/(jpeg|png|webp);base64,/.test(i.data)) || (i.kind === "sound" && /^data:audio\/[\w.+-]+(;[\w=.+-]+)*;base64,/.test(i.data)))); }   // 大きさの上限は写真にも音にも
async function takeFiles(fs) {
  if (!SHARE) return;
  let n = 0;
  for (const f of fs) { try { const L = JSON.parse(await f.text()); if (!valid(L) || L.id === mine.id) continue;
    const i = others.findIndex(x => x.id === L.id); L.items.forEach(it => { it.sense = SENSES.some(s => s.k === it.sense) ? it.sense : "sight"; it.who = WHO.some(w => w.k === it.who) ? it.who : "hito"; });
    const keep = { v: 1, id: L.id, color: PALETTE[(others.length + 1) % PALETTE.length], q: String(L.q || "").slice(0, 80), items: L.items };
    if (i >= 0) { keep.color = others[i].color; others[i] = keep; } else others.push(keep); n++; } catch { } }
  await put("others", others); layout(); reset();
  say(n ? `${n} 人の層が重なりました（ぜんぶで ${allLayers().length} 人）。` : "読める層のファイルがありませんでした。", 5200, n ? "みんなの層が、重なりました。" : "");
}
$("bTake").onclick = () => { flash("bTake"); $("file").click(); };
function flash(id) { const b = $(id); b.classList.remove("ok"); void b.offsetWidth; b.classList.add("ok"); }
$("file").onchange = e => { takeFiles([...e.target.files]); e.target.value = ""; };
addEventListener("dragover", e => { if (!SHARE) return; e.preventDefault(); $("drop").classList.add("on"); });
addEventListener("dragleave", e => { if (!e.relatedTarget) $("drop").classList.remove("on"); });
addEventListener("drop", e => { if (!SHARE) return; e.preventDefault(); $("drop").classList.remove("on"); takeFiles([...e.dataTransfer.files]); });
function reset() { } // 2026-11-03：「空にする」は「おわる」の「消す」にまとめた（上の並びが狭い画面で問いに重なったため）

/* ---------- おわる：みんなの層を一つの場に重ね、ゆっくり回して閉じる。持ち帰る（ファイル）か、この端末から消す ---------- */
function endOn(on) { if (typeof wipeMode === "function" && wipeAsk) wipeMode(false); ending = on; document.body.classList.toggle("ending", on); $("end").classList.toggle("on", on);
  if (on) { closeCam(); if (rec) rec.stop(); near = null; pick(null); view = "stack"; focusSense = null; viewLab(); layout(); say("今日の層は、ここまで。<br>帰り道で、あなたの足を止めるものは？", 0, "今日の層は、ここまで。帰り道で、あなたの足を止めるものは？"); }
  else $("sub").style.opacity = 0; }
$("bEnd").onclick = () => endOn(true);
$("bKeep").onclick = () => { if (SHARE) return $("bGive").click(); /* 共有しない版：この端末にファイルで保存するだけ（どこへも送らない） */
  if (!mine.items.length) { say("まだ層が空です。"); return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(mine)], { type: "application/json" })); a.download = `まなざし_${mine.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  say("この端末に、層をファイルで保存しました。", 0); };
let wipeAsk = false;
function wipeMode(on) { wipeAsk = on; $("bKeep").hidden = on; $("bBack").textContent = on ? "やめる" : "もどる"; $("bWipe").classList.toggle("rec", on); }
$("bBack").onclick = () => { if (wipeAsk) { wipeMode(false); say("今日の層は、ここまで。<br>帰り道で、あなたの足を止めるものは？", 0, "今日の層は、ここまで。帰り道で、あなたの足を止めるものは？"); return; } endOn(false); };
$("bWipe").onclick = async () => { if (!wipeAsk) { wipeMode(true); say("自分の層と受けとった層を、この端末から消します。<br>よければ、もう一度「消す」。", 0, "自分の層と受けとった層を、この端末から消します。"); return; }
  wipeMode(false);
  mine = { v: 1, id: uid(), color: PALETTE[0], q: mine.q, items: [] }; others = []; await put("mine", mine); await put("others", others); count(); layout(); reset();
  say("この端末から、層を消しました。", 0); };

/* ---------- 重ねる ⇄ 並べる ---------- */
function viewLab() { document.body.classList.toggle("side", view === "side"); const b = $("bView"); b.dataset.v = view; b.setAttribute("aria-label", view === "stack" ? "いまは重ねる。押すと並べる" : "いまは並べる。押すと重ねる"); }   // 2026-11-05：いまの見え方の側を灯す二つ並びの切り替え（押すたびに入れかわる・ひと手間）
$("bView").onclick = () => { view = view === "stack" ? "side" : "stack"; viewLab(); layout();
  say(view === "side" ? "一人ひとりの層を、並べました。" : "みんなの層を、一つの場に重ねました。", 2600); };
$("q").onclick = () => { if (params.get("q")) return; qi = (qi + 1) % QS.length; setQ(QS[qi], 1); };

/* ---------- はじめ ---------- */
buildRows(); count(); setQ(params.get("q")?.slice(0, 60) || QS[0]); window.MLLoader?.done(); // 押せる画面を先に出す（3D と保存の読み出しはあと）
(async () => {
  const m = await get("mine"); if (m && valid(m)) mine = m; const o = await get("others"); if (Array.isArray(o)) others = o.filter(valid);
  setQ(params.get("q")?.slice(0, 60) || mine.q || QS[0]); qi = Math.max(0, QS.indexOf($("qt").textContent));
  buildRows(); count(); layout(); reset();
  requestAnimationFrame(() => setTimeout(() => import("three").then(m => { ({ GLTFLoader, VRMLoaderPlugin, VRMUtils, MeshoptDecoder } = m); THREE = m; init3D(); layout(); }).catch(() => { }), 420)); // 読み込みの幕が消えきってから 3D を組む（幕の消えるのを重い処理で遅らせない）
  setTimeout(() => say(mine.items.length ? "続きから。" : "わたしは碧。問いを一つ、置きました。<br>感じたものを、<b>撮る</b>・<b>手ざわり</b>・<b>音をとる</b>で集めてください。", 6500), 600);
})();
window.__mz = { get mine() { return mine; }, get others() { return others; }, takeFiles, layout };
