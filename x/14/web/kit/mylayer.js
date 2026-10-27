/* 自分の層（mylayer.js）── 環世界 2.0：訪れる人が、自分の意思で層を置く（設計の A＝端末の中だけ／B の最初の形＝手渡し）
   2026-10-26 本人「環世界 2.0 を拡張する機能を構築してください」。設計＝01_経営/01_経営/03_資料/設計_層を置く仕組み_2026-10-26.md
   - 置けるもの：写真（canvas に描き直して EXIF〈位置・機種〉を消す・人の写らないものだけ）／30 秒の音／触れた面（写真の明るさを凹凸に）／一言（40 字）
   - 残すのは、その端末の IndexedDB の中だけ。日時は「日付＋時間帯」に丸める。外へは何も送らない。取り消しはいつでも。
   - 手渡す：選んだ層をファイル（.json）に書き出し、相手が読みこむと、その人の Qualium にも重なる（サーバなし）。
   - 依代（かさねっこ）から：offer(agent) で誘い、置いた層を agent の位置から運んで重ねる。姿は agent.center(v) と agent.layer だけを使う（差し替えやすく）。
   使い方：
     const M = new MyLayers({ THREE, scene: world, camera, place: "kawagoe", groundAt: (x,z)=>y, here: ()=>({x,z}), colors: {sight:"#…",…}, toast });
     await M.load();  毎フレーム M.update(dt)；タップ：if (M.pick(x,y)) return;  置く：M.openPlace({ from: agent? })；一覧：M.openList()
*/
const DB = "qualium-mylayer", ST = "layers", VER = 1;
const KINDS = { photo: { n: "写真", g: "写", lay: "sight" }, sound: { n: "音", g: "音", lay: "sound" }, touch: { n: "触れた面", g: "触", lay: "touch" }, word: { n: "一言", g: "言", lay: "culture" } };
const BAND = h => h < 5 ? "夜" : h < 10 ? "朝" : h < 15 ? "昼" : h < 18 ? "夕" : "夜";
const PRIV = "置いた層は、この端末の中にだけ残ります。外へは送りません。写真は位置と機種の記録を消して描き直し、日時は日付と時間帯だけ。いつでも消せます。しばらく開かないと端末が消すこともあるので、残したい層は「手渡す」でファイルに控えを。";
const MAXW = 40, REC_S = 30, STACK_R = 4;

function idb() { return new Promise((ok, ng) => { let r; try { r = indexedDB.open(DB, VER); } catch (e) { return ng(e); } r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: "id" }); r.onsuccess = () => ok(r.result); r.onerror = () => ng(r.error); }); }
async function tx(mode, fn) { const d = await idb(); return new Promise((ok, ng) => { const t = d.transaction(ST, mode), s = t.objectStore(ST); const r = fn(s); t.oncomplete = () => ok(r?.result); t.onerror = () => ng(t.error); }); }
const b2u = b => new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });
async function u2b(u) { return (await fetch(u)).blob(); }
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function btn(label, run, primary) { const b = el("button", "myl-b" + (primary ? " p" : ""), label); b.type = "button"; b.addEventListener("click", run); return b; }

/* 画像を描き直す（EXIF ほかの記録は canvas を通すと残らない）。長辺 max px の JPEG */
async function redraw(blob, max = 1280) {
  const url = URL.createObjectURL(blob);
  try {
    const im = await new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ng(new Error("画像を読めません")); i.src = url; });
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    return await new Promise(ok => c.toBlob(ok, "image/jpeg", .84));
  } finally { URL.revokeObjectURL(url); }
}
/* 触れた面：写真の明るさを凹凸（グレーの高さの図 128px）に */
async function toRelief(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const im = await new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = url; });
    const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"), s = Math.min(im.naturalWidth, im.naturalHeight);
    x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, 128, 128);
    const d = x.getImageData(0, 0, 128, 128), p = d.data; for (let i = 0; i < p.length; i += 4) { const v = p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11; p[i] = p[i + 1] = p[i + 2] = v; } x.putImageData(d, 0, 0);
    return await new Promise(ok => c.toBlob(ok, "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

const CSS = `
.myl-bg{position:fixed;inset:0;z-index:30;background:rgba(3,6,15,.55);display:flex;align-items:flex-end;justify-content:center}
.myl{width:min(440px,100%);max-height:88vh;overflow:auto;box-sizing:border-box;padding:18px 16px max(16px,env(safe-area-inset-bottom));background:rgba(6,10,18,.92);border-top:1px solid rgba(92,200,224,.45);color:#eef5fb;font:13.5px/1.75 var(--ml-sans,sans-serif);letter-spacing:.04em;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
@media (min-width:820px){.myl-bg{align-items:center}.myl{border:1px solid rgba(92,200,224,.4);border-radius:2px}}
.myl h3{margin:0 0 4px;font:600 17px/1.5 var(--ml-serif,serif);letter-spacing:.12em}
.myl .lead{margin:0 0 10px;color:#c3cce0;font-size:12.5px}
.myl .priv{margin:12px 0 0;padding-left:10px;border-left:1px solid #9bdcf0;color:#c3cce0;font-size:11.5px;line-height:1.7}
.myl .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.myl-b{appearance:none;min-height:44px;padding:0 14px;background:rgba(6,10,18,.6);border:1px solid rgba(150,170,240,.3);border-radius:2px;color:#eef5fb;font:inherit;cursor:pointer}
.myl-b.p{border-color:#9bdcf0;box-shadow:inset 0 0 0 1px rgba(155,220,240,.25)}
.myl-b:disabled{opacity:.4;cursor:default}
.myl .kinds{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.myl .kinds .myl-b{min-height:56px;text-align:left;display:flex;gap:10px;align-items:center}
.myl .kinds i{font-style:normal;font:600 15px var(--ml-serif,serif);width:28px;height:28px;display:grid;place-items:center;border:1px solid var(--c)}
.myl img,.myl canvas.rel{display:block;max-width:100%;max-height:44vh;margin:10px auto 0}
.myl textarea{width:100%;box-sizing:border-box;min-height:72px;margin-top:8px;padding:8px;background:#03060f;color:#eef5fb;border:1px solid rgba(150,170,240,.3);border-radius:2px;font:15px/1.6 var(--ml-serif,serif)}
.myl label.ck{display:flex;gap:10px;align-items:flex-start;margin-top:10px;font-size:12.5px;color:#c3cce0}
.myl label.ck input{width:22px;height:22px;flex:none;margin:1px 0 0}
.myl .meta{color:#8f9bb4;font-size:11.5px}
.myl .word{font:17px/1.8 var(--ml-serif,serif);margin:10px 0 0;white-space:pre-wrap;word-break:break-word}
.myl ul{list-style:none;margin:8px 0 0;padding:0}.myl li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(195,204,224,.12)}
.myl li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.myl li input{width:22px;height:22px}
.myl .rec{font:600 22px var(--ml-mono,monospace);text-align:center;margin:12px 0 0;color:#9bdcf0}`;

export class MyLayers {
  constructor({ THREE, scene, camera, place, groundAt = () => 0, here, colors = {}, toast = () => { } }) {
    Object.assign(this, { THREE, scene, camera, place, groundAt, here, colors, toast });
    this.items = []; this.sprites = []; this.flights = []; this.ok = typeof indexedDB !== "undefined";
    if (!document.getElementById("myl-css")) { const s = el("style"); s.id = "myl-css"; s.textContent = CSS; document.head.appendChild(s); }
  }
  color(k) { return this.colors[KINDS[k]?.lay] || "#9bdcf0"; }
  async load() {
    if (!this.ok) return;
    try { const all = await tx("readonly", s => s.getAll()); this.items = (all || []).filter(r => r.place === this.place).sort((a, b) => a.t - b.t); }
    catch (e) { this.ok = false; console.warn("自分の層：", e?.message ?? e); }
    this.rebuild();
  }
  /* ---------- 3D：同じ所（4 m 以内）の層は上へ積む。新しいものほど上 ---------- */
  tex(k, mine) {
    const c = document.createElement("canvas"); c.width = c.height = 96; const x = c.getContext("2d"), col = this.color(k);
    x.strokeStyle = col; x.lineWidth = 3; x.shadowColor = col; x.shadowBlur = 10; x.beginPath(); x.arc(48, 48, 34, 0, Math.PI * 2); x.stroke();
    if (!mine) { x.setLineDash([5, 5]); x.beginPath(); x.arc(48, 48, 42, 0, Math.PI * 2); x.stroke(); }
    x.shadowBlur = 0; x.fillStyle = "rgba(3,6,15,.55)"; x.beginPath(); x.arc(48, 48, 32, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#eef5fb"; x.font = "600 30px 'Shippori Mincho','Hiragino Mincho ProN',serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(KINDS[k].g, 48, 50);
    const t = new this.THREE.CanvasTexture(c); t.colorSpace = this.THREE.SRGBColorSpace; return t;
  }
  rebuild() {
    for (const s of this.sprites) { s.material.map.dispose(); s.material.dispose(); s.removeFromParent(); } this.sprites = [];
    const piles = [];
    for (const r of this.items) { let p = piles.find(p => Math.hypot(p.x - r.x, p.z - r.z) < STACK_R); if (!p) piles.push(p = { x: r.x, z: r.z, n: 0 }); r._h = p.n++; r._px = p.x; r._pz = p.z; }
    for (const r of this.items) this.sprites.push(this.addSprite(r));
  }
  addSprite(r) {
    const T = this.THREE, s = new T.Sprite(new T.SpriteMaterial({ map: this.tex(r.kind, !r.from), transparent: true, depthWrite: false, depthTest: true }));
    s.scale.setScalar(.34); s.position.set(r._px, this.groundAt(r._px, r._pz) + 1.25 + r._h * .4, r._pz); s.userData.r = r; s.renderOrder = 5; this.scene.add(s); return s;
  }
  update(dt) {
    const t = performance.now() / 1000;
    for (const s of this.sprites) { const r = s.userData.r; if (s.userData.fly) continue; s.position.y = this.groundAt(r._px, r._pz) + 1.25 + r._h * .4 + Math.sin(t * 1.3 + r._h) * .03; }
    for (const f of this.flights) { f.k = Math.min(1, f.k + dt / 1.8); const e = 1 - Math.pow(1 - f.k, 3); f.s.position.lerpVectors(f.a, f.b, e); f.s.position.y += Math.sin(e * Math.PI) * .8; if (f.k >= 1) { f.s.userData.fly = false; } }
    this.flights = this.flights.filter(f => f.k < 1);
  }
  pick(x, y) {
    const v = new this.THREE.Vector3(); let best = null, bd = 38;
    for (const s of this.sprites) { v.copy(s.position); const dist = v.distanceTo(this.camera.position); if (dist > 60) continue; v.project(this.camera); if (v.z > 1) continue; const d = Math.hypot((v.x + 1) / 2 * innerWidth - x, (1 - v.y) / 2 * innerHeight - y); if (d < bd) { bd = d; best = s; } }
    if (!best) return false; this.view(best.userData.r); return true;
  }
  /* ---------- 画面 ---------- */
  sheet(title, lead) {
    this.close(); const bg = el("div", "myl-bg"), d = el("div", "myl"); d.setAttribute("role", "dialog"); d.setAttribute("aria-label", title);
    bg.addEventListener("click", e => { if (e.target === bg) this.close(); }); d.append(el("h3", null, title)); if (lead) d.append(el("p", "lead", lead));
    bg.append(d); document.body.append(bg); this.bg = bg; this.stopRec?.(); return d;
  }
  close() { this.stopRec?.(); this.bg?.remove(); this.bg = null; if (this._url) { URL.revokeObjectURL(this._url); this._url = null; } }
  priv(d) { d.append(el("p", "priv", PRIV)); }
  /* 依代からの誘い（触れたかさねっこの札に添えるボタンの中身） */
  offer(agent) { this.openPlace({ from: agent }); }
  openPlace({ from = null } = {}) {
    if (!this.ok) { this.toast("この端末では、層をしまっておく場所が使えません（プライベートの窓など）。"); return; }
    const d = this.sheet("この場所に、層を置く", from ? "かさねっこが、あなたの層をここへ運んで重ねます。" : "いま立っている所に、あなたの受けとり方を一枚重ねます。");
    const g = el("div", "kinds"); d.append(g);
    const add = (k, sub, run) => { const b = btn("", run); b.style.setProperty("--c", this.color(k)); b.append(el("i", null, KINDS[k].g)); const s = el("span"); s.append(el("b", null, KINDS[k].n)); s.append(el("br")); s.append(el("span", "meta", sub)); b.append(s); g.append(b); };
    add("photo", "人の写らないもの", () => this.pickImage("photo", from));
    if (window.MediaRecorder && navigator.mediaDevices?.getUserMedia) add("sound", `${REC_S} 秒まで`, () => this.record(from));
    add("touch", "面を写すと凹凸に", () => this.pickImage("touch", from));
    add("word", `${MAXW} 字まで`, () => this.word(from));
    const r = el("div", "row"); r.append(btn("置いた層の一覧・手渡す", () => this.openList()), btn("閉じる", () => this.close())); d.append(r); this.priv(d);
  }
  pickImage(kind, from) {
    const inp = el("input"); inp.type = "file"; inp.accept = "image/*"; if (kind === "touch") inp.setAttribute("capture", "environment");   // 写真は撮っておいたものも選べるように
    inp.addEventListener("change", async () => {
      const f = inp.files?.[0]; if (!f) return;
      let img; try { img = await redraw(f); } catch { this.toast("この画像は読めませんでした。"); return; }
      const d = this.sheet(kind === "photo" ? "写真を置く" : "触れた面を置く", kind === "photo" ? "位置と機種の記録を消して、描き直しました。" : "明るいところが高く、暗いところが低い面になります。指でなぞると震えます。");
      this._url = URL.createObjectURL(img); const im = el("img"); im.src = this._url; im.alt = "置く写真"; d.append(im);
      const ck = el("label", "ck"), c = el("input"); c.type = "checkbox"; ck.append(c, el("span", null, "人の顔や姿・車のナンバー・表札が写っていないことを確かめました。")); d.append(ck);
      const r = el("div", "row"), go = btn("置く", async () => { const data = kind === "touch" ? await toRelief(img) : img; this.save({ kind, blob: data }, from); }, true); go.disabled = true;
      c.addEventListener("change", () => { go.disabled = !c.checked; }); r.append(go, btn("やめる", () => this.close())); d.append(r); this.priv(d);
    }, { once: true });
    inp.click();
  }
  async record(from) {
    const d = this.sheet("音を置く", `この場所の音を ${REC_S} 秒まで録ります。人の声が入らないところで。`); const n = el("p", "rec", "0 秒"); d.append(n);
    const r = el("div", "row"); d.append(r); this.priv(d);
    let st; try { st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } }); } catch { n.textContent = "マイクが使えません"; r.append(btn("閉じる", () => this.close())); return; }
    const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(m => MediaRecorder.isTypeSupported?.(m)) || "";
    const rec = new MediaRecorder(st, mime ? { mimeType: mime } : undefined), parts = []; let keep = false, t0 = performance.now();
    const tick = setInterval(() => { const s = Math.floor((performance.now() - t0) / 1000); n.textContent = `${Math.min(s, REC_S)} 秒`; if (s >= REC_S) stop(true); }, 250);
    const stop = k => { keep = k; clearInterval(tick); this.stopRec = null; if (rec.state !== "inactive") rec.stop(); st.getTracks().forEach(t => t.stop()); };
    this.stopRec = () => stop(false);
    rec.ondataavailable = e => e.data.size && parts.push(e.data);
    rec.onstop = () => { if (!keep || !parts.length) return; const blob = new Blob(parts, { type: rec.mimeType || mime || "audio/mp4" });   // 聴き直して、人の声が入っていないと確かめてから置く
      const d2 = this.sheet("音を置く", "一度聴き直してください。"); this._url = URL.createObjectURL(blob); const a = el("audio"); a.controls = true; a.src = this._url; a.setAttribute("playsinline", ""); a.style.width = "100%"; a.style.marginTop = "10px"; d2.append(a);
      const ck = el("label", "ck"), c = el("input"); c.type = "checkbox"; ck.append(c, el("span", null, "人の話し声（会話・名前）が入っていないことを確かめました。")); d2.append(ck);
      const r2 = el("div", "row"), go = btn("置く", () => this.save({ kind: "sound", blob }, from), true); go.disabled = true; c.addEventListener("change", () => { go.disabled = !c.checked; }); r2.append(go, btn("やめる", () => this.close())); d2.append(r2); this.priv(d2); };
    rec.start(); r.append(btn("ここまでで置く", () => stop(true), true), btn("やめる", () => this.close()));
  }
  word(from) {
    const d = this.sheet("一言を置く", "この場所で感じたことを、一言。名前や連絡先は書かないでください。"); const ta = el("textarea"); ta.maxLength = MAXW; ta.setAttribute("aria-label", "一言"); d.append(ta);
    const r = el("div", "row"), go = btn("置く", () => { const s = ta.value.trim().slice(0, MAXW); if (s) this.save({ kind: "word", text: s }, from); }, true); r.append(go, btn("やめる", () => this.close())); d.append(r); this.priv(d); setTimeout(() => ta.focus(), 50);
  }
  async save({ kind, blob, text }, from) {
    const p = this.here(), now = new Date(), day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const r = { id: (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)), place: this.place, x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10, kind, day, band: BAND(now.getHours()), t: Date.now() };
    if (blob) r.data = await b2u(blob); if (text) r.text = text;
    try { await tx("readwrite", s => s.put(r)); } catch { this.toast("この端末にしまえませんでした（空きが足りない など）。"); return; }
    this.close(); this.items.push(r); this.rebuild();
    const s = this.sprites[this.sprites.length - 1];
    if (from?.center) { const a = from.center(new this.THREE.Vector3()), b = s.position.clone(); s.position.copy(a); s.userData.fly = true; this.flights.push({ s, a, b, k: 0 }); }
    try { navigator.vibrate?.([12, 30, 12]); } catch { }
    this.toast((from ? "かさねっこが、あなたの層をいちばん上に重ねました。" : "あなたの層を、いちばん上に重ねました。") + "浮かぶ丸に触れると開きます。");
  }
  view(r) {
    const K = KINDS[r.kind], d = this.sheet(r.from ? `手渡された層 ── ${K.n}` : `あなたの層 ── ${K.n}`); d.append(el("p", "meta", `${r.day}・${r.band}${r.from ? "・" + r.from : ""}`));
    if (r.kind === "photo") { const i = el("img"); i.src = r.data; i.alt = "置いた写真"; d.append(i); }
    if (r.kind === "word") d.append(el("p", "word", r.text));
    if (r.kind === "sound") { const a = el("audio"); a.controls = true; a.src = r.data; a.setAttribute("playsinline", ""); a.style.width = "100%"; a.style.marginTop = "10px"; d.append(a); }
    if (r.kind === "touch") this.relief(d, r.data);
    const row = el("div", "row"); d.append(el("p", "meta", "手渡すと、おおよその位置（5 m 単位）と日付・時間帯も一緒に渡ります。")); row.append(btn("手渡す", () => this.exportFile([r])), btn("取り消す", () => this.remove([r.id])), btn("閉じる", () => this.close())); d.append(row); this.priv(d);
  }
  relief(d, src) {   // なぞると、その点の高さの変わりに合わせて震える（震えない端末では線の明るさで見せる）
    const c = el("canvas", "rel"); c.width = c.height = 256; c.style.width = "min(256px,70vw)"; c.style.touchAction = "none"; d.append(c);
    const x = c.getContext("2d"), im = new Image(); let H = null;
    im.onload = () => { x.drawImage(im, 0, 0, 256, 256); const g = x.getImageData(0, 0, 256, 256).data; H = (u, v) => g[(Math.max(0, Math.min(255, v | 0)) * 256 + Math.max(0, Math.min(255, u | 0))) * 4]; }; im.src = src;
    let last = null, lt = 0;
    c.addEventListener("pointermove", e => { if (!H || (e.pointerType === "mouse" && !e.buttons)) return; const b = c.getBoundingClientRect(), u = (e.clientX - b.left) / b.width * 256, v = (e.clientY - b.top) / b.height * 256, h = H(u, v);
      if (last != null && Math.abs(h - last) > 18 && performance.now() - lt > 45) { lt = performance.now(); try { navigator.vibrate?.(Math.min(30, 6 + Math.abs(h - last) / 6)); } catch { } x.strokeStyle = "rgba(155,220,240,.8)"; x.beginPath(); x.arc(u, v, 3, 0, 7); x.stroke(); } last = h; });
  }
  async remove(ids) {
    try { await tx("readwrite", s => { for (const id of ids) s.delete(id); }); } catch { }
    this.items = this.items.filter(r => !ids.includes(r.id)); this.rebuild(); this.close(); this.toast("層を取り消しました。この端末からも消えています。");
  }
  openList() {
    const d = this.sheet("置いた層", this.items.length ? "選んで、ファイルにして手渡せます。受けとった人の Qualium にも重なります。" : "まだ置いた層はありません。");
    if (this.items.length) d.append(el("p", "meta", "手渡すと、層の中身と一緒に、町の中のおおよその位置（5 m 単位）と日付・時間帯が相手に渡ります。")); const ul = el("ul"), cks = []; d.append(ul);
    for (const r of [...this.items].reverse()) { const li = el("li"), c = el("input"); c.type = "checkbox"; c.checked = true; c.setAttribute("aria-label", "手渡す層に入れる"); cks.push([c, r]); const s = el("span", null, `${KINDS[r.kind].g}　${r.kind === "word" ? r.text : KINDS[r.kind].n}`); li.append(c, s, el("span", "meta", `${r.day} ${r.band}`)); ul.append(li); }
    const row = el("div", "row"), sel = () => cks.filter(([c]) => c.checked).map(([, r]) => r);
    if (this.items.length) row.append(btn("選んだ層を手渡す", () => { const s = sel(); if (s.length) this.exportFile(s); }, true));
    row.append(btn("受けとった層を読みこむ", () => this.importFile()));
    if (this.items.length) row.append(btn("選んだ層を取り消す", () => { const s = sel(); if (s.length && confirm(`${s.length} 枚の層を、この端末から消します。`)) this.remove(s.map(r => r.id)); }));
    row.append(btn("閉じる", () => this.close())); d.append(row); this.priv(d);
  }
  /* ---------- 手渡す：ファイル（.json）。中身＝場所・相対の座標・種類・日付と時間帯・本体だけ ---------- */
  async exportFile(list) {
    const out = { format: "qualium-layer", v: 1, place: this.place, layers: list.map(({ kind, x, z, day, band, text, data }) => ({ kind, x: Math.round(x / 5) * 5, z: Math.round(z / 5) * 5, day, band, text, data }))   /* 位置は 5 m に丸める */ };
    const name = `qualium-${this.place}-layers-${list[0].day}.json`, file = new File([JSON.stringify(out)], name, { type: "application/json" });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Qualium の層" }); return; } } catch (e) { if (e?.name === "AbortError") return; }
    const a = el("a"); a.href = URL.createObjectURL(file); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    this.toast("層をファイルにしました。相手の Qualium の「受けとった層を読みこむ」で重なります。");
  }
  importFile() {
    const inp = el("input"); inp.type = "file"; inp.accept = "application/json,.json";
    inp.addEventListener("change", async () => {
      const f = inp.files?.[0]; if (!f || f.size > 30e6) { this.toast("読めないファイルです。"); return; }
      let J; try { J = JSON.parse(await f.text()); } catch { this.toast("読めないファイルです。"); return; }
      if (J?.format !== "qualium-layer" || !Array.isArray(J.layers)) { this.toast("Qualium の層のファイルではありません。"); return; }
      if (J.place !== this.place) { this.toast("ほかの場所の層です。その場所の Qualium で読みこんでください。"); return; }
      let n = 0;
      for (const L of J.layers.slice(0, 50)) {
        if (!KINDS[L?.kind] || !isFinite(L.x) || !isFinite(L.z) || Math.abs(L.x) > 5000 || Math.abs(L.z) > 5000) continue;
        const r = { id: crypto.randomUUID?.() || String(Date.now()) + n, place: this.place, x: +L.x, z: +L.z, kind: L.kind, day: String(L.day || "").slice(0, 10).replace(/[^0-9-]/g, ""), band: ["朝", "昼", "夕", "夜"].includes(L.band) ? L.band : "", from: "手渡し", t: Date.now() + n };
        try {
          if (L.kind === "word") { r.text = String(L.text || "").slice(0, MAXW); if (!r.text) continue; }
          else if (L.kind === "sound") { if (!/^data:audio\/[a-z0-9.+-]+(;[^,]*)?;base64,/i.test(L.data || "") || L.data.length > 8e6) continue; r.data = L.data; }
          else { if (!/^data:image\/(jpeg|png|webp);base64,/i.test(L.data || "")) continue; const b = await redraw(await u2b(L.data), L.kind === "touch" ? 128 : 1280); r.data = await b2u(L.kind === "touch" ? await toRelief(b) : b); }   // 画像は描き直してから入れる
          await tx("readwrite", s => s.put(r)); this.items.push(r); n++;
        } catch { }
      }
      this.items.sort((a, b) => a.t - b.t); this.rebuild(); this.close(); this.toast(n ? `手渡された層を ${n} 枚、重ねました。点線の輪が、手渡された層です。` : "重ねられる層がありませんでした。");
    }, { once: true });
    inp.click();
  }
}
