/* © mitsulab. All rights reserved.  Qualium まなざし── 江守さんとのワークショップ用（2026-11-03）
   流れ：碧が問いを置く → 自分のスマホで撮る・録る（感覚と「だれの受けとり方で」を選ぶ）→ 3D に層として重ねる → 渡す／受けとる → みんなの層を重ねて・並べて見比べる。
   集めない：サーバーなし。データはこの端末（IndexedDB）にだけ。渡すのは本人が「渡す」を押したファイルだけ。
   写真は canvas で描き直す（EXIF＝位置・機種は残らない）。位置情報・端末情報は取らない。 */
let THREE, GLTFLoader, VRMLoaderPlugin, VRMUtils, MeshoptDecoder; // 3D は操作できるようになってから読む

const $ = id => document.getElementById(id);
const MAX = 9, REC_MAX = 15;
const QS = ["いつもは気づかない音は、どこにある？", "手ざわりが、まわりと違う所は？", "ミツバチなら、どこへ向かう？", "あなたの足を止めたものは？"];
const SENSES = [
  { k: "sight", n: "見る", c: "#9bdcf0", d: '<path d="M3 12c2.4-3.9 5.5-5.9 9-5.9s6.6 2 9 5.9c-2.4 3.9-5.5 5.9-9 5.9S5.4 15.9 3 12z"/><circle cx="12" cy="12" r="2.7"/>' },
  { k: "sound", n: "聴く", c: "#b4a2ff", d: '<circle cx="6.6" cy="12" r="1.2"/><path d="M10.4 8.7a4.7 4.7 0 0 1 0 6.6M13.6 6.2a8.2 8.2 0 0 1 0 11.6"/>' },
  { k: "touch", n: "触れる", c: "#f2cf8c", d: '<path d="M8.3 19.6V11a3.7 3.7 0 0 1 7.4 0v8.6"/><path d="M11 18.4v-7.2a1 1 0 0 1 2 0v7.2"/>' },
  { k: "smell", n: "嗅ぐ", c: "#7fe0b4", d: '<path d="M7.6 20c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4M12 19.4c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4M16.4 20c-1.6-1.9-1.6-3.6 0-5.4s1.6-3.5 0-5.4"/>' },
  { k: "taste", n: "味わう", c: "#f4aa96", d: '<path d="M4.2 11.6h15.6a7.8 7 0 0 1-15.6 0z"/><path d="M9.6 19.6h4.8"/>' },
  { k: "x", n: "X 感", c: "#a8f2f6", d: '<path d="M11.4 3.8c.6 4.3 3.6 7.4 8 8-4.4.6-7.4 3.7-8 8-.6-4.3-3.6-7.4-8-8 4.4-.6 7.4-3.7 8-8z"/>' },
];
/* だれの受けとり方で。写真の色は「模式」（実際の見え方そのものではない）。
   ミツバチ＝紫外・青・緑の三色で赤は暗い／スズメ＝紫外を含む四色で色の差が大きい／タヌキ＝二色の目。 */
const WHO = [
  { k: "hito", n: "わたし", say: "" },
  { k: "hachi", n: "ミツバチ", say: "ミツバチは、赤が暗く、人に見えない紫外が見える。色は模式です。" },
  { k: "suzume", n: "スズメ", say: "鳥は四つの色で見る。色の差を強めた模式です。" },
  { k: "tanuki", n: "タヌキ", say: "タヌキは二つの色で見る。赤と緑が近づく模式です。" },
];
function lens(k, d) { // d: ImageData.data
  if (k === "hito") return;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (k === "hachi") { d[i] = g * .9; d[i + 1] = b * .95; d[i + 2] = Math.min(255, b * .5 + (r + g + b) / 6); }
    else if (k === "suzume") { const m = (r + g + b) / 3; d[i] = Math.max(0, Math.min(255, m + (r - m) * 1.5)); d[i + 1] = Math.max(0, Math.min(255, m + (g - m) * 1.5)); d[i + 2] = Math.max(0, Math.min(255, m + (b - m) * 1.5 + 6)); }
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
function setQ(t, v) { $("qt").textContent = t; mine.q = t; if (v) speak(t); }

/* ---------- 下の並び ---------- */
function buildRows() {
  $("sense").innerHTML = SENSES.map(s => `<button data-k="${s.k}" style="--c:${s.c}" aria-pressed="${s.k === sense}"><svg viewBox="0 0 24 24">${s.d}</svg>${s.n}</button>`).join("");
  $("who").innerHTML = WHO.map(w => `<button class="mu-chip" data-k="${w.k}" aria-pressed="${w.k === who}">${w.n}</button>`).join("");
}
$("sense").onclick = e => { const b = e.target.closest("button"); if (!b) return; sense = sense === b.dataset.k && view === "stack" ? sense : b.dataset.k; buildRows(); focusSense = focusSense === sense ? null : sense; layout(); };
$("who").onclick = e => { const b = e.target.closest("button"); if (!b) return; who = b.dataset.k; buildRows(); const w = WHO.find(x => x.k === who); if (w.say) say(w.say); };
function count() { $("cnt").textContent = `${mine.items.length}/${MAX}`; }

/* ---------- 3D ---------- */
const cv = $("c");
let R, S, C, sun, items, texL, ray, clk, look; const meshes = new Map(); let aoi = null;
function init3D() {
R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.outputColorSpace = THREE.SRGBColorSpace; R.debug.checkShaderErrors = false;   // 2026-11-03：確かめで止まらない
S = new THREE.Scene(); S.background = new THREE.Color("#03060f"); S.fog = new THREE.Fog("#03060f", 6, 16);
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
}
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(p => new VRMLoaderPlugin(p)).loadAsync("web/aoi.vrm").then(g => {
  const v = g.userData.vrm; VRMUtils.rotateVRM0?.(v); aoi = v;
  const N = n => v.humanoid.getNormalizedBoneNode(n);
  for (const sd of ["left", "right"]) { const sg = sd === "left" ? 1 : -1; N(sd + "UpperArm")?.rotation.set(-.06, sg * .06, sg * -1.3); N(sd + "LowerArm")?.rotation.set(0, sg * -.3, 0); }
  v.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  v.scene.position.set(0, 0, -1.4); return R.compileAsync(v.scene, C, S).catch(() => { }).then(() => S.add(v.scene));   // 2026-11-03：材質を並列で組んでから出す（止まらない）
}).catch(() => { });
items = new THREE.Group(); S.add(items); texL = new THREE.TextureLoader(); ray = new THREE.Raycaster(); look = new THREE.Vector3(0, 1.05, 0); clk = new THREE.Clock();
resize(); R.compileAsync(S, C).catch(() => { }).then(() => R.setAnimationLoop(frame));   // はじめの一枚で止まらない
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
  g.scale.setScalar(.001); g.userData.s = 1;
  items.add(g); meshes.set(layer.id + ":" + it.id, { obj: g, it, layer, target: new THREE.Vector3(), op: 1 });
}
function allLayers() { return [mine, ...others]; }
let focusSense = null;
function layout() {
  $("bView").setAttribute("aria-pressed", view === "side"); if (!THREE) return;
  const Ls = allLayers();
  for (const [id, m] of meshes) if (!Ls.some(L => L.items.some(i => L.id + ":" + i.id === id))) { items.remove(m.obj); meshes.delete(id); }
  Ls.forEach((L, li) => L.items.forEach(it => { if (!meshes.has(L.id + ":" + it.id)) makeObj(it, L); }));
  Ls.forEach((L, li) => L.items.forEach((it, ii) => {
    const m = meshes.get(L.id + ":" + it.id);
    if (view === "stack") { // 重ねる：感覚ごとに方角、人ごとに高さ。同じ感覚がみんなで一つの帯になる
      const si = SENSES.findIndex(s => s.k === it.sense), a = Math.PI * (si % 2 === 0 ? .97 - .12 * (si >> 1) : .03 + .12 * (si >> 1)) + (ii % 3 - 1) * .08 + (li % 4 - 1.5) * .04; // 写真の感覚（見る・触れる…）と音を碧の左右に分け、輪と写真を重ねない（まん中は碧のために空ける）
      const r = 1.25 + (li % 3) * .3; m.target.set(Math.cos(a) * r, .55 + (li % 6) * .2 + (ii % 2) * .1, Math.sin(a) * r * .55 - .2);
    } else { // 並べる：一人一列（下から上へ。並びは置いた順）
      const n = Ls.length, x = (li - (n - 1) / 2) * .62, y = .35 + ii * .56;
      m.target.set(x, y, .2);
    }
    m.op = view === "side" || !focusSense || it.sense === focusSense ? 1 : .5; // 選んだ感覚を少し前に。ほかも見える明るさに残す
  }));
  $("bView").setAttribute("aria-pressed", view === "side");
  aimC();
}
/* カメラ（ドラッグで回す・ピンチ／ホイールで寄る） */
let yaw = 0, pitch = .12, dist = 4.6;
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
  if (!b) { b = document.createElement("button"); b.className = "mu-btn"; b.id = "bDel"; b.textContent = "外す"; $("topr").appendChild(b); }
  b.onclick = async () => { mine.items = mine.items.filter(i => i.id !== id); near = null; await put("mine", mine); count(); layout(); pick(null); say("外しました。渡すときにも入りません。", 2400); }; }
function resize() { if (!R) return; R.setSize(innerWidth, innerHeight, false); C.aspect = innerWidth / innerHeight; C.updateProjectionMatrix(); aimC(); }
addEventListener("resize", resize);
$("c").addEventListener("pointerdown", hush);
let blink = 2;
function frame() {
  const dt = Math.min(clk.getDelta(), .05), t = clk.elapsedTime; place();
  if (aoi) aoi.scene.visible = view === "stack";
  if (aoi) { const sp = aoi.humanoid.getNormalizedBoneNode("spine"); if (sp) sp.rotation.x = Math.sin(t * 1.6) * .012; const hd = aoi.humanoid.getNormalizedBoneNode("head"); if (hd) hd.rotation.y = Math.sin(t * .3) * .08;
    blink -= dt; const em = aoi.expressionManager; if (em) { em.setValue("blink", blink < .12 ? 1 : 0); if (blink < 0) blink = 2 + Math.random() * 3; } aoi.update(dt); }
  for (const m of meshes.values()) { const o = m.obj, big = near === o.userData.id;
    const tg = big ? C.position.clone().lerp(look, .55).setY(look.y + .1) : m.target; o.position.lerp(tg, 1 - Math.exp(-dt * 5));
    const s = (big ? 2.2 : 1) * (playing?.id === o.userData.id ? 1 + Math.sin(t * 8) * .08 : 1); o.scale.lerp(new THREE.Vector3(s, s, s), 1 - Math.exp(-dt * 6));
    o.quaternion.slerp(C.quaternion, 1 - Math.exp(-dt * 6));
    o.traverse(c => { if (c.material && c.material.visible !== false) { c.material.transparent = true; c.material.opacity += ((m.op) - c.material.opacity) * (1 - Math.exp(-dt * 6)); } });
    if (o.userData.ring) o.userData.ring.rotation.z = t * .6; }
  R.render(S, C);
}

/* ---------- 撮る（窓の中だけ。許さなくても写真を選んで参加できる） ---------- */
let stream = null, vid = null, vraf = 0;
const vc = $("vc"), vx = vc.getContext("2d", { willReadFrequently: true });
function drawLens(src, w, h, size) { const s = Math.min(w, h); vc.width = vc.height = size; vx.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, size, size); const im = vx.getImageData(0, 0, size, size); lens(who, im.data); vx.putImageData(im, 0, 0); }
function full() { if (mine.items.length >= MAX) { say(`ひとり ${MAX} つまで。よいものを選んで残しましょう。`); return true; } return false; }
async function openCam() {
  if (full()) return;
  say("写真は、この端末の中だけに残ります。人の顔は写さないでください。", 0);
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false }); }
  catch { say("カメラを使わずに、写真を選んで参加できます。"); $("pic").click(); return; }
  vid = document.createElement("video"); vid.playsInline = true; vid.muted = true; vid.srcObject = stream; await vid.play().catch(() => { });
  $("win").classList.add("on"); const w = WHO.find(x => x.k === who); $("vlab").textContent = who === "hito" ? "" : w.n + "（模式）";
  const loop = () => { if (vid.videoWidth) drawLens(vid, vid.videoWidth, vid.videoHeight, 360); vraf = requestAnimationFrame(loop); }; loop();
}
function closeCam() { cancelAnimationFrame(vraf); stream?.getTracks().forEach(t => t.stop()); stream = null; $("win").classList.remove("on"); $("sub").style.opacity = 0; }
function addPhoto(src, w, h) { drawLens(src, w, h, 640); add({ kind: "photo", data: vc.toDataURL("image/jpeg", .82) }); }
$("bShot").onclick = openCam;
$("bSnap").onclick = () => { if (vid) addPhoto(vid, vid.videoWidth, vid.videoHeight); closeCam(); };
$("bCancel").onclick = closeCam;
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
  say("人の話し声は入れないでください。もう一度押すと止まります。", 0);
  recTimer = setInterval(() => { const left = REC_MAX - Math.floor((performance.now() - recT) / 1000); $("cnt2").textContent = left + "秒"; if (left <= 0) rec?.stop(); }, 200);
};

async function add(o) {
  const it = { id: uid(), t: minute(), sense: o.kind === "sound" && sense === "sight" ? "sound" : sense, who, ...o };
  mine.items.push(it); await put("mine", mine); count(); layout();
  say(mine.items.length === 1 ? "あなたの層が、ひとつ重なりました。" : `層に重ねました（${mine.items.length}）。`, 2800, "層に重ねました。");
}

/* ---------- 渡す（ファイル一つ。共有の画面か保存） ---------- */
$("bGive").onclick = async () => {
  if (!mine.items.length) { say("まだ層が空です。撮るか録ってから渡せます。"); return; }
  const name = `まなざし_${mine.id}.json`, blob = new Blob([JSON.stringify(mine)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: "まなざしの層" }); say("渡しました。このファイルは手元の保存にもなります。"); return; } catch (e) { if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  say("層をファイルに保存しました。運営の端末で「受けとる」と、みんなの層に重なります。");
};

/* ---------- 受けとる（運営の端末・大画面）。押すかファイルを置く ---------- */
function valid(L) { return L && L.v === 1 && typeof L.id === "string" && Array.isArray(L.items) && L.items.length <= MAX && L.items.every(i => (i.kind === "photo" && /^data:image\/(jpeg|png|webp);base64,/.test(i.data)) || (i.kind === "sound" && /^data:audio\/[\w.+-]+(;[\w=]+)*;base64,/.test(i.data))); }
async function takeFiles(fs) {
  let n = 0;
  for (const f of fs) { try { const L = JSON.parse(await f.text()); if (!valid(L) || L.id === mine.id) continue;
    const i = others.findIndex(x => x.id === L.id); L.items.forEach(it => { it.sense = SENSES.some(s => s.k === it.sense) ? it.sense : "sight"; it.who = WHO.some(w => w.k === it.who) ? it.who : "hito"; });
    const keep = { v: 1, id: L.id, color: PALETTE[(others.length + 1) % PALETTE.length], q: String(L.q || "").slice(0, 80), items: L.items };
    if (i >= 0) { keep.color = others[i].color; others[i] = keep; } else others.push(keep); n++; } catch { } }
  await put("others", others); layout(); reset();
  say(n ? `${n} 人の層が重なりました（ぜんぶで ${allLayers().length} 人）。` : "読める層のファイルがありませんでした。", 5200, n ? "みんなの層が、重なりました。" : "");
}
$("bTake").onclick = () => $("file").click();
$("file").onchange = e => { takeFiles([...e.target.files]); e.target.value = ""; };
addEventListener("dragover", e => { e.preventDefault(); $("drop").classList.add("on"); });
addEventListener("dragleave", e => { if (!e.relatedTarget) $("drop").classList.remove("on"); });
addEventListener("drop", e => { e.preventDefault(); $("drop").classList.remove("on"); takeFiles([...e.dataTransfer.files]); });
function reset() { // ほかの人の層があるときだけ「空にする」を出す（運営が次の回の前に使う）
  let b = $("bClear"); if (!others.length) { b?.remove(); return; }
  if (!b) { b = document.createElement("button"); b.className = "mu-btn"; b.id = "bClear"; b.textContent = "空にする"; $("topr").appendChild(b);
    b.onclick = async () => { if (!confirm("受けとった層を、この端末から消します。")) return; others = []; await put("others", others); layout(); reset(); }; }
}

/* ---------- 重ねる ⇄ 並べる ---------- */
$("bView").onclick = () => { view = view === "stack" ? "side" : "stack"; $("bView").textContent = view === "stack" ? "並べる" : "重ねる"; layout();
  say(view === "side" ? "一人ひとりの層を、並べました。" : "みんなの層を、一つの場に重ねました。", 2600); };
$("q").onclick = () => { if (params.get("q")) return; qi = (qi + 1) % QS.length; setQ(QS[qi], 1); };

/* ---------- はじめ ---------- */
buildRows(); count(); setQ(params.get("q")?.slice(0, 60) || QS[0]); window.MLLoader?.done(); // 押せる画面を先に出す（3D と保存の読み出しはあと）
(async () => {
  const m = await get("mine"); if (m && valid(m)) mine = m; const o = await get("others"); if (Array.isArray(o)) others = o.filter(valid);
  setQ(params.get("q")?.slice(0, 60) || mine.q || QS[0]); qi = Math.max(0, QS.indexOf($("qt").textContent));
  buildRows(); count(); layout(); reset();
  requestAnimationFrame(() => setTimeout(() => import("three").then(m => { ({ GLTFLoader, VRMLoaderPlugin, VRMUtils, MeshoptDecoder } = m); THREE = m; init3D(); layout(); }).catch(() => { }), 420)); // 読み込みの幕が消えきってから 3D を組む（幕の消えるのを重い処理で遅らせない）
  setTimeout(() => say(mine.items.length ? "続きから。" : "わたしは碧。問いを一つ、置きました。<br>感じたものを、<b>撮る</b>か<b>録る</b>で集めてください。", 6500), 600);
})();
window.__mz = { get mine() { return mine; }, get others() { return others; }, takeFiles, layout };
